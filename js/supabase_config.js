/**
 * Sumair Tools — Supabase Client Configuration
 * Live Domain: https://sumairtools.online/
 * Project Reference: hszkuwjncitbgdvafjdc
 */

(function () {
    'use strict';

    // Live Supabase Project URL for Sumair Tools
    var DEFAULT_URL = 'https://hszkuwjncitbgdvafjdc.supabase.co';
    var DEFAULT_ANON_KEY = 'sb_publishable_SFR53RosPuOrz6z9OMfu5Q_JVf90QvE';

    // Allow browser-side configuration without rebuilding
    var savedUrl = localStorage.getItem('ST_SUPABASE_URL') || DEFAULT_URL;
    var savedKey = localStorage.getItem('ST_SUPABASE_ANON_KEY') || DEFAULT_ANON_KEY;

    window.ST_CONFIG = {
        SUPABASE_URL: savedUrl,
        SUPABASE_ANON_KEY: savedKey,
        MASTER_ADMIN_EMAIL: 'sumairalisiddiqui@gmail.com',
        isConfigured: function () {
            return this.SUPABASE_URL && 
                   !this.SUPABASE_URL.includes('YOUR-PROJECT-REF') && 
                   this.SUPABASE_ANON_KEY && 
                   !this.SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY_HERE');
        },
        updateConfig: function (url, key) {
            if (url) localStorage.setItem('ST_SUPABASE_URL', url.trim());
            if (key) localStorage.setItem('ST_SUPABASE_ANON_KEY', key.trim());
            window.location.reload();
        }
    };

    // Modal Helpers
    window.openConfigModal = function () {
        var modal = document.getElementById('st-config-modal');
        if (!modal) return;

        // Check if already authorized in current session
        var isAuth = sessionStorage.getItem('ST_ADMIN_UNLOCKED') === 'true';
        if (!isAuth) {
            var pass = prompt('🔒 Master Admin Security Credential Required:\nEnter Master Admin password to view or configure sensitive API keys:');
            if (!pass) return;
            if (pass.trim() !== 'Fahad@123') {
                alert('⛔ ACCESS DENIED: Invalid Admin Credential. Access to API keys and database configuration is restricted.');
                return;
            }
            sessionStorage.setItem('ST_ADMIN_UNLOCKED', 'true');
        }

        var urlInput = document.getElementById('cfg-supabase-url');
        var keyInput = document.getElementById('cfg-supabase-key');
        if (urlInput) urlInput.value = window.ST_CONFIG.SUPABASE_URL || DEFAULT_URL;
        if (keyInput) {
            keyInput.value = window.ST_CONFIG.SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY_HERE') ? '' : window.ST_CONFIG.SUPABASE_ANON_KEY;
        }
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    window.closeConfigModal = function () {
        var modal = document.getElementById('st-config-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.saveSupabaseConfig = function () {
        var urlInput = document.getElementById('cfg-supabase-url');
        var keyInput = document.getElementById('cfg-supabase-key');
        var url = urlInput ? urlInput.value.trim() : '';
        var key = keyInput ? keyInput.value.trim() : '';
        if (!url || !key) {
            alert('Please enter both Supabase Project URL and Anon Public Key.');
            return;
        }
        window.ST_CONFIG.updateConfig(url, key);
    };

    // Initialize Supabase Client ONLY if properly configured
    window.sbClient = null;
    if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
        if (window.ST_CONFIG.isConfigured()) {
            try {
                window.sbClient = supabase.createClient(window.ST_CONFIG.SUPABASE_URL, window.ST_CONFIG.SUPABASE_ANON_KEY, {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                });
            } catch (e) {
                console.warn('[ST Auth] Supabase client initialization warning:', e);
            }
        } else {
            console.log('[ST Auth] Running in Standalone / Configuration mode. Awaiting anon public key.');
        }
    }
})();
