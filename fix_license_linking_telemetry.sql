-- ==============================================================================
-- SUMAIR TOOLS — BACKEND LICENSE LINKING & USER NAME TELEMETRY MIGRATION
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hszkuwjncitbgdvafjdc/sql
-- Copyright (c) 2026 Sumair Ali Siddiqui. All Rights Reserved.
-- ==============================================================================

-- ==============================================================================
-- 1. ADD USER NAME & EMAIL COLUMNS TO licenses TABLE
-- This ensures user names appear directly in front of license keys in the Supabase Table Editor!
-- ==============================================================================
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS machine_id TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS client_platform TEXT DEFAULT 'windows';
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS fingerprint_meta JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- Backfill is_active
UPDATE public.licenses
SET is_active = (status != 'revoked' AND status != 'suspended')
WHERE is_active IS NULL;

-- Backfill user_name & user_email from auth.users for any previously linked licenses
UPDATE public.licenses l
SET user_email = COALESCE(l.user_email, u.email),
    user_name = COALESCE(
        l.user_name,
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        split_part(u.email, '@', 1)
    )
FROM auth.users u
WHERE l.user_id = u.id AND (l.user_email IS NULL OR l.user_name IS NULL);

-- Optimize search indexes
CREATE INDEX IF NOT EXISTS idx_licenses_user_email ON public.licenses(user_email);
CREATE INDEX IF NOT EXISTS idx_licenses_user_name ON public.licenses(user_name);

-- ==============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- Master admin sees everything; users can see their own claimed licenses
-- ==============================================================================
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own licenses" ON public.licenses;
CREATE POLICY "Users can view own licenses"
ON public.licenses
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id 
    OR (user_email IS NOT NULL AND LOWER(user_email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
);

DROP POLICY IF EXISTS "Admin Full Access" ON public.licenses;
CREATE POLICY "Admin Full Access"
ON public.licenses
FOR ALL
TO authenticated
USING (
    (LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'sumairalisiddiqui@gmail.com')
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
)
WITH CHECK (
    (LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'sumairalisiddiqui@gmail.com')
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- ==============================================================================
-- 3. SECURE CLAIM RPC: claim_license_key
-- Records user_name, user_email, and user_id directly into the license row
-- ==============================================================================
DROP FUNCTION IF EXISTS public.claim_license_key(TEXT);
DROP FUNCTION IF EXISTS public.claim_license_key(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.claim_license_to_user(TEXT);
DROP FUNCTION IF EXISTS public.claim_license_to_user(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.claim_license_key(
    input_key TEXT,
    p_user_name TEXT DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_clean_key TEXT;
    v_uid UUID;
    v_jwt JSONB;
    v_email TEXT;
    v_name TEXT;
    v_license RECORD;
    v_db_user RECORD;
BEGIN
    v_clean_key := UPPER(TRIM(input_key));
    IF v_clean_key IS NULL OR length(v_clean_key) < 10 THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_KEY', 'message', 'Invalid license key format. Keys follow ST-XXXX-XXXX-XXXX-XXXX.');
    END IF;

    -- 1. Identify User ID & JWT context
    v_uid := auth.uid();
    v_jwt := auth.jwt();

    -- 2. Determine Email
    v_email := LOWER(TRIM(COALESCE(
        v_jwt ->> 'email',
        p_user_email,
        ''
    )));

    -- 3. Fallback: If auth.uid() is null but email was passed from authenticated frontend session
    IF v_uid IS NULL AND v_email != '' THEN
        SELECT id, email, raw_user_meta_data INTO v_db_user 
        FROM auth.users 
        WHERE LOWER(email) = v_email 
        LIMIT 1;

        IF FOUND THEN
            v_uid := v_db_user.id;
        END IF;
    END IF;

    -- 4. If user is still completely unknown, prompt login
    IF v_uid IS NULL AND v_email = '' THEN
        RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED', 'message', 'You must be logged in to claim a license.');
    END IF;

    -- 5. Determine Full Name
    IF v_uid IS NOT NULL THEN
        SELECT 
            COALESCE(
                NULLIF(TRIM(p_user_name), ''),
                v_jwt -> 'user_metadata' ->> 'full_name',
                v_jwt -> 'user_metadata' ->> 'name',
                u.raw_user_meta_data ->> 'full_name',
                u.raw_user_meta_data ->> 'name',
                split_part(u.email, '@', 1)
            ),
            COALESCE(NULLIF(v_email, ''), u.email)
        INTO v_name, v_email
        FROM auth.users u
        WHERE u.id = v_uid;
    END IF;

    IF v_name IS NULL OR v_name = '' THEN
        v_name := COALESCE(NULLIF(TRIM(p_user_name), ''), split_part(v_email, '@', 1), 'Creator');
    END IF;

    -- 6. Check if license key exists in database
    SELECT * INTO v_license
    FROM public.licenses
    WHERE license_key = v_clean_key;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'KEY_NOT_FOUND', 'message', 'License key not recognized. Check for typos.');
    END IF;

    -- 7. Check if revoked or inactive
    IF v_license.status = 'revoked' OR v_license.is_active = false THEN
        RETURN jsonb_build_object('success', false, 'code', 'KEY_REVOKED', 'message', 'This license key has been revoked by administration.');
    END IF;

    -- 8. Check if already claimed by another user
    IF v_license.user_id IS NOT NULL AND v_uid IS NOT NULL AND v_license.user_id != v_uid THEN
        RETURN jsonb_build_object('success', false, 'code', 'ALREADY_CLAIMED', 'message', 'This license key is already registered to another user account.');
    END IF;

    IF v_license.user_email IS NOT NULL AND v_email != '' AND LOWER(v_license.user_email) != LOWER(v_email) THEN
        RETURN jsonb_build_object('success', false, 'code', 'ALREADY_CLAIMED', 'message', 'This license key is already registered to another user account (' || v_license.user_email || ').');
    END IF;

    -- 9. Permanently write user name, email, and owner info to public.licenses
    UPDATE public.licenses
    SET user_id = COALESCE(v_uid, user_id),
        user_name = v_name,
        user_email = v_email,
        linked_at = COALESCE(linked_at, now()),
        is_active = true
    WHERE license_key = v_clean_key;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'CLAIMED_SUCCESS',
        'message', 'License key successfully linked to ' || v_name || ' (' || v_email || ')!',
        'license_key', v_clean_key,
        'user_name', v_name,
        'user_email', v_email,
        'status', v_license.status,
        'machine_id', v_license.machine_id
    );
END;
$$;

-- Backward-compatible alias
CREATE OR REPLACE FUNCTION public.claim_license_to_user(
    p_license_key TEXT,
    p_user_name TEXT DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
    RETURN public.claim_license_key(p_license_key, p_user_name, p_user_email);
END;
$$;

-- ==============================================================================
-- 4. MASTER ADMIN RPC: get_all_licenses_admin()
-- Returns all licenses with permanent user_name and user_email columns
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_all_licenses_admin()
RETURNS TABLE (
    id UUID,
    license_key TEXT,
    status TEXT,
    is_active BOOLEAN,
    machine_id TEXT,
    client_platform TEXT,
    activated_at TIMESTAMPTZ,
    linked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    fingerprint_meta JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_email TEXT;
    v_is_master BOOLEAN;
BEGIN
    v_caller_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));

    v_is_master := (v_caller_email = 'sumairalisiddiqui@gmail.com')
                   OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid());

    IF NOT v_is_master THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Master Admin privilege required (sumairalisiddiqui@gmail.com).';
    END IF;

    -- Self-heal admin_users table for Master Admin
    IF v_caller_email = 'sumairalisiddiqui@gmail.com' AND auth.uid() IS NOT NULL THEN
        INSERT INTO public.admin_users (user_id, email, role)
        VALUES (auth.uid(), v_caller_email, 'super_admin')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN QUERY
    SELECT 
        l.id,
        l.license_key,
        l.status,
        COALESCE(l.is_active, (l.status != 'revoked' AND l.status != 'suspended')) AS is_active,
        l.machine_id,
        l.client_platform,
        l.activated_at,
        l.linked_at,
        l.created_at,
        l.user_id,
        COALESCE(l.user_email, u.email::TEXT) AS user_email,
        COALESCE(
            l.user_name,
            u.raw_user_meta_data->>'full_name',
            u.raw_user_meta_data->>'name',
            split_part(u.email, '@', 1)
        )::TEXT AS user_name,
        l.fingerprint_meta
    FROM public.licenses l
    LEFT JOIN auth.users u ON l.user_id = u.id
    ORDER BY l.created_at DESC;
END;
$$;

-- Alias
CREATE OR REPLACE FUNCTION public.get_admin_licenses_telemetry()
RETURNS TABLE (
    id UUID,
    license_key TEXT,
    status TEXT,
    is_active BOOLEAN,
    machine_id TEXT,
    client_platform TEXT,
    activated_at TIMESTAMPTZ,
    linked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    user_id UUID,
    user_email TEXT,
    user_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id, t.license_key, t.status, t.is_active, 
        t.machine_id, t.client_platform, t.activated_at, 
        t.linked_at, t.created_at, t.user_id, t.user_email, t.user_name
    FROM public.get_all_licenses_admin() t;
END;
$$;

-- ==============================================================================
-- 5. ADMIN UNLINK RPC: admin_unlink_license
-- Clears user_id, user_name, user_email, and linked_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_unlink_license(
    p_license_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_clean_key TEXT;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
    ) OR (LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'sumairalisiddiqui@gmail.com') INTO v_is_admin;

    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Master Admin only.');
    END IF;

    v_clean_key := UPPER(TRIM(p_license_key));

    UPDATE public.licenses
    SET user_id = NULL,
        user_name = NULL,
        user_email = NULL,
        linked_at = NULL
    WHERE license_key = v_clean_key;

    RETURN jsonb_build_object('success', true, 'message', 'License ' || v_clean_key || ' unlinked from user account.');
END;
$$;

-- ==============================================================================
-- 6. WORKSTATION ACTIVATION & SESSION TRANSFER RPC: activate_license
-- Strict 1 Workstation Enforcement:
-- When a 2nd computer activates the key, this function re-binds machine_id to the
-- new computer's HWID. The 1st computer's background heartbeat will detect that
-- its HWID no longer matches machine_id and will automatically log out!
-- ==============================================================================
DROP FUNCTION IF EXISTS public.activate_license(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.activate_license(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.activate_license(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.activate_license(
    key_input TEXT DEFAULT NULL,
    hwid_input TEXT DEFAULT NULL,
    platform_input TEXT DEFAULT 'windows',
    p_license_key TEXT DEFAULT NULL,
    p_machine_id TEXT DEFAULT NULL,
    p_client_platform TEXT DEFAULT 'windows',
    p_fingerprint_meta JSONB DEFAULT '{}'::jsonb,
    p_client_fingerprint TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_clean_key TEXT;
    v_clean_hwid TEXT;
    v_platform TEXT;
    v_license RECORD;
    v_hmac_secret TEXT;
    v_sig_payload TEXT;
    v_signature TEXT;
    v_current_ts BIGINT;
    v_failed_attempts INT;
BEGIN
    v_clean_key := UPPER(TRIM(COALESCE(key_input, p_license_key, '')));
    v_clean_hwid := TRIM(COALESCE(hwid_input, p_machine_id, ''));
    v_platform := COALESCE(platform_input, p_client_platform, 'windows');

    -- Format validation
    IF v_clean_key IS NULL OR length(v_clean_key) < 10 THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_KEY_FORMAT', 'message', 'Invalid license key format. Keys follow ST-XXXX-XXXX-XXXX-XXXX.');
    END IF;

    IF v_clean_hwid IS NULL OR length(v_clean_hwid) < 4 THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_HWID', 'message', 'Invalid hardware fingerprint detected. Please restart After Effects.');
    END IF;

    -- Rate limiting check
    SELECT COUNT(*) INTO v_failed_attempts
    FROM public.license_attempts
    WHERE success = false
      AND attempted_at > (now() - INTERVAL '10 minutes')
      AND (
          (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
          OR (p_client_fingerprint IS NOT NULL AND client_fingerprint = p_client_fingerprint)
          OR (machine_id = v_clean_hwid)
      );

    IF v_failed_attempts >= 10 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'RATE_LIMITED',
            'message', 'Security lockdown: Too many failed attempts. Try again in 10 minutes.'
        );
    END IF;

    -- Fetch license
    SELECT * INTO v_license
    FROM public.licenses
    WHERE license_key = v_clean_key
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.license_attempts (ip_address, client_fingerprint, license_key_attempted, machine_id, success, error_code)
        VALUES (p_ip_address, p_client_fingerprint, v_clean_key, v_clean_hwid, false, 'KEY_NOT_FOUND');

        RETURN jsonb_build_object('success', false, 'code', 'KEY_NOT_FOUND', 'message', 'License key not recognized. Check for typos or contact Sumair.');
    END IF;

    -- Status checks
    IF v_license.status = 'revoked' OR v_license.is_active = false THEN
        INSERT INTO public.license_attempts (ip_address, client_fingerprint, license_key_attempted, machine_id, success, error_code)
        VALUES (p_ip_address, p_client_fingerprint, v_clean_key, v_clean_hwid, false, 'KEY_REVOKED');

        RETURN jsonb_build_object('success', false, 'code', 'KEY_REVOKED', 'message', 'This license key has been revoked by administration.');
    END IF;

    IF v_license.status = 'suspended' THEN
        INSERT INTO public.license_attempts (ip_address, client_fingerprint, license_key_attempted, machine_id, success, error_code)
        VALUES (p_ip_address, p_client_fingerprint, v_clean_key, v_clean_hwid, false, 'KEY_SUSPENDED');

        RETURN jsonb_build_object('success', false, 'code', 'KEY_SUSPENDED', 'message', 'Notice: License is pending approval by Sumair. Message him on Discord to activate!');
    END IF;

    IF v_license.expires_at IS NOT NULL AND v_license.expires_at < now() THEN
        INSERT INTO public.license_attempts (ip_address, client_fingerprint, license_key_attempted, machine_id, success, error_code)
        VALUES (p_ip_address, p_client_fingerprint, v_clean_key, v_clean_hwid, false, 'KEY_EXPIRED');

        RETURN jsonb_build_object('success', false, 'code', 'KEY_EXPIRED', 'message', 'This license subscription has expired.');
    END IF;

    -- 1 WORKSTATION ENFORCEMENT & SESSION TRANSFER:
    -- Transfer the active seat to this workstation (v_clean_hwid).
    -- If a previous machine was using this key, its machine_id gets overwritten.
    -- Next time the 1st machine verifies (heartbeat), it will be automatically logged out!
    UPDATE public.licenses
    SET status = 'active',
        is_active = true,
        machine_id = v_clean_hwid,
        client_platform = v_platform,
        fingerprint_meta = COALESCE(p_fingerprint_meta, fingerprint_meta, '{}'::jsonb),
        activated_at = now(),
        last_verified_at = now()
    WHERE id = v_license.id;

    -- Cryptographic HMAC-SHA256 signature
    SELECT value INTO v_hmac_secret FROM public.security_config WHERE key = 'hmac_secret';
    IF v_hmac_secret IS NULL THEN
        v_hmac_secret := 'SUMAIR_TOOLS_ST_FALLBACK_DEV_SECRET_2026';
    END IF;

    v_current_ts := EXTRACT(EPOCH FROM now())::bigint;
    v_sig_payload := v_clean_key || ':' || v_clean_hwid || ':active:' || 
                     COALESCE(to_char(v_license.expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'LIFETIME') || ':' || 
                     v_current_ts::text;

    v_signature := encode(hmac(v_sig_payload, v_hmac_secret, 'sha256'), 'hex');

    -- Log activation
    INSERT INTO public.license_attempts (ip_address, client_fingerprint, license_key_attempted, machine_id, success, error_code)
    VALUES (p_ip_address, p_client_fingerprint, v_clean_key, v_clean_hwid, true, NULL);

    RETURN jsonb_build_object(
        'success', true,
        'code', 'ACTIVATION_SUCCESS',
        'message', 'Workstation bound and activated successfully!',
        'license_key', v_clean_key,
        'machine_id', v_clean_hwid,
        'status', 'active',
        'activated_at', now(),
        'expires_at', v_license.expires_at,
        'timestamp', v_current_ts,
        'signature', v_signature
    );
END;
$$;

-- Backward-compatibility overload for legacy clients
CREATE OR REPLACE FUNCTION public.activate_license(
    p_license_key TEXT,
    p_machine_id TEXT,
    p_client_platform TEXT DEFAULT 'windows'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN public.activate_license(
        key_input := p_license_key,
        hwid_input := p_machine_id,
        platform_input := p_client_platform
    );
END;
$$;

-- ==============================================================================
-- 7. WORKSTATION HEARTBEAT & AUTO-LOGOUT VERIFIER: verify_workstation_license
-- Heartbeat called by the extension every 60 seconds and on startup.
-- If the license key is now bound to a DIFFERENT machine_id,
-- this function returns LOGGED_OUT_BY_ANOTHER_DEVICE, forcing the 1st computer to log out!
-- ==============================================================================
DROP FUNCTION IF EXISTS public.verify_workstation_license(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.verify_workstation_license(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.verify_workstation_license(
    key_input TEXT DEFAULT NULL,
    hwid_input TEXT DEFAULT NULL,
    p_license_key TEXT DEFAULT NULL,
    p_machine_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_clean_key TEXT;
    v_clean_hwid TEXT;
    v_license RECORD;
BEGIN
    v_clean_key := UPPER(TRIM(COALESCE(key_input, p_license_key, '')));
    v_clean_hwid := TRIM(COALESCE(hwid_input, p_machine_id, ''));

    IF v_clean_key = '' THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_KEY', 'message', 'License key is required.');
    END IF;

    SELECT * INTO v_license
    FROM public.licenses
    WHERE license_key = v_clean_key;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'KEY_NOT_FOUND', 'message', 'License key not found.');
    END IF;

    -- Revocation / Suspension checks
    IF v_license.status = 'revoked' OR v_license.is_active = false THEN
        RETURN jsonb_build_object('success', false, 'code', 'KEY_REVOKED', 'message', 'This license has been revoked by administration.');
    END IF;

    IF v_license.status = 'suspended' THEN
        RETURN jsonb_build_object('success', false, 'code', 'KEY_SUSPENDED', 'message', 'This license is suspended pending approval.');
    END IF;

    IF v_license.expires_at IS NOT NULL AND v_license.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'code', 'KEY_EXPIRED', 'message', 'This license has expired.');
    END IF;

    -- WORKSTATION SEAT TRANSFER CHECK (1 Active Machine per License):
    -- If another computer activated this key, v_license.machine_id no longer matches v_clean_hwid!
    IF v_license.machine_id IS NOT NULL AND v_license.machine_id != '' AND v_license.machine_id != v_clean_hwid THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'LOGGED_OUT_BY_ANOTHER_DEVICE',
            'message', '⚠️ Another user activated this license key on a different computer. You have been automatically logged out.'
        );
    END IF;

    -- Heartbeat update
    UPDATE public.licenses
    SET last_verified_at = now()
    WHERE id = v_license.id;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'VALID',
        'message', 'Workstation session active and verified.'
    );
END;
$$;

-- ==============================================================================
-- 8. GRANT PERMISSIONS
-- ==============================================================================
GRANT EXECUTE ON FUNCTION public.claim_license_key(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_license_to_user(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_licenses_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_licenses_telemetry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unlink_license(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_license(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_license(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_workstation_license(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ==============================================================================
-- 9. VERIFICATION
-- Check columns and display count
-- ==============================================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'licenses' AND column_name IN ('user_name', 'user_email', 'linked_at', 'is_active');

SELECT count(*) AS total_licenses, 
       count(user_id) AS claimed_licenses, 
       count(user_name) AS licenses_with_user_name 
FROM public.licenses;
