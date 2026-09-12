-- ==============================================================================
-- SUMAIR TOOLS — 1-CLICK FIX FOR: column reference "user_id" is ambiguous
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hszkuwjncitbgdvafjdc/sql
-- Copyright (c) 2026 Sumair Ali Siddiqui. All Rights Reserved.
-- ==============================================================================

-- 1. DROP OLD RESTRICTIVE / AMBIGUOUS POLICIES
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Full Access" ON public.licenses;
DROP POLICY IF EXISTS "Admins can manage all licenses" ON public.licenses;
DROP POLICY IF EXISTS "Users can view own licenses" ON public.licenses;

-- 2. CREATE NON-AMBIGUOUS RLS POLICIES (Explicitly alias au.user_id)
-- Master Admin Full Access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admin Full Access"
ON public.licenses
FOR ALL
TO authenticated
USING (
    (LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'sumairalisiddiqui@gmail.com')
    OR EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
)
WITH CHECK (
    (LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'sumairalisiddiqui@gmail.com')
    OR EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
);

-- Users can view their own claimed licenses
CREATE POLICY "Users can view own licenses"
ON public.licenses
FOR SELECT
TO authenticated
USING (
    auth.uid() = public.licenses.user_id
    OR (public.licenses.user_email IS NOT NULL AND LOWER(public.licenses.user_email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
);

-- 3. FIX MASTER ADMIN RPC: get_all_licenses_admin()
-- Adds #variable_conflict use_column and qualifies all table aliases to eliminate ambiguity
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
#variable_conflict use_column
DECLARE
    v_caller_email TEXT;
    v_is_master BOOLEAN;
BEGIN
    v_caller_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));

    v_is_master := (v_caller_email = 'sumairalisiddiqui@gmail.com')
                   OR EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid());

    IF NOT v_is_master THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Master Admin privilege required (sumairalisiddiqui@gmail.com).';
    END IF;

    -- Self-heal admin_users table for Master Admin
    IF v_caller_email = 'sumairalisiddiqui@gmail.com' AND auth.uid() IS NOT NULL THEN
        INSERT INTO public.admin_users AS au (user_id, email, role)
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

GRANT EXECUTE ON FUNCTION public.get_all_licenses_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_licenses_admin() TO anon;

-- 4. ALIAS: get_admin_licenses_telemetry()
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
#variable_conflict use_column
BEGIN
    RETURN QUERY
    SELECT 
        t.id, t.license_key, t.status, t.is_active, 
        t.machine_id, t.client_platform, t.activated_at, 
        t.linked_at, t.created_at, t.user_id, t.user_email, t.user_name
    FROM public.get_all_licenses_admin() t;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_licenses_telemetry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_licenses_telemetry() TO anon;

-- 5. VERIFICATION QUERY (Should return total license count with zero errors)
SELECT count(*) AS verified_total_licenses FROM public.licenses;
SELECT * FROM public.get_all_licenses_admin() LIMIT 5;
