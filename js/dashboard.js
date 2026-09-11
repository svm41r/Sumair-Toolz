/**
 * Sumair Tools — Enterprise User & Admin Telemetry Dashboard Engine
 * Engineered by Sumair Ali Siddiqui
 * All Rights Reserved (c) 2026
 */

(function () {
    'use strict';

    var allAdminLicenses = [];
    var isAdminUser = false;

    // Helper: Random Key Generator
    function generateLicenseKeyChunk() {
        var pool = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        function chunk() {
            var s = '';
            var arr = new Uint8Array(4);
            if (window.crypto && window.crypto.getRandomValues) {
                window.crypto.getRandomValues(arr);
            } else {
                for (var j = 0; j < 4; j++) arr[j] = Math.floor(Math.random() * 256);
            }
            for (var i = 0; i < 4; i++) s += pool.charAt(arr[i] % pool.length);
            return s;
        }
        return 'ST-' + chunk() + '-' + chunk() + '-' + chunk() + '-' + chunk();
    }

    window.openDashboardModal = async function () {
        var modal = document.getElementById('st-dashboard-modal');
        if (!modal) return;

        var user = window.getCurrentUser ? window.getCurrentUser() : null;
        if (!user) {
            if (window.openAuthModal) window.openAuthModal('signin');
            return;
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (window.AudioFX) AudioFX.click();

        await loadUserDashboard(user);
    };

    window.closeDashboardModal = function () {
        var modal = document.getElementById('st-dashboard-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.switchDashboardTab = function (tab) {
        var userView = document.getElementById('dash-view-user');
        var adminView = document.getElementById('dash-view-admin');
        var userBtn = document.getElementById('dash-tab-user-btn');
        var adminBtn = document.getElementById('dash-tab-admin-btn');

        if (tab === 'user') {
            if (userView) userView.classList.remove('hidden');
            if (adminView) adminView.classList.add('hidden');
            if (userBtn) userBtn.className = 'px-4 py-2 text-xs font-mono font-bold rounded-xl bg-crimson text-white shadow-[0_0_15px_rgba(255,0,60,0.4)]';
            if (adminBtn) adminBtn.className = 'px-4 py-2 text-xs font-mono font-bold rounded-xl bg-white/5 text-neutral-400 hover:text-white border border-white/10';
        } else if (tab === 'admin') {
            if (userView) userView.classList.add('hidden');
            if (adminView) adminView.classList.remove('hidden');
            if (adminBtn) adminBtn.className = 'px-4 py-2 text-xs font-mono font-bold rounded-xl bg-crimson text-white shadow-[0_0_15px_rgba(255,0,60,0.4)]';
            if (userBtn) userBtn.className = 'px-4 py-2 text-xs font-mono font-bold rounded-xl bg-white/5 text-neutral-400 hover:text-white border border-white/10';
            loadAdminLicenses();
        }
    };

    // --- Render User Licenses HTML ---
    function renderUserLicenseCards(licenses) {
        var listContainer = document.getElementById('dash-user-licenses-list');
        var claimContainer = document.getElementById('dash-claim-card-container');
        if (!listContainer) return;

        var hasLicenses = licenses && licenses.length > 0;

        // Render Claim Card with Clean High-Converting Copy
        if (claimContainer) {
            claimContainer.innerHTML = `
                <div class="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-crimson/15 via-white/5 to-transparent border border-crimson/40 shadow-[0_0_30px_rgba(255,0,60,0.15)] text-left">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-base">🔑</span>
                            <h4 class="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider">CLAIM YOUR LICENSE</h4>
                        </div>
                        <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-crimson/20 text-crimson border border-crimson/40 font-bold">$1 LAUNCH DEAL</span>
                    </div>
                    <p class="text-[11px] font-mono text-neutral-300 mb-4 leading-relaxed">
                        Enter your purchased license key to link it to your account and authorize your After Effects workstation.
                    </p>
                    <form onsubmit="handleClaimKey(event)" class="flex flex-col sm:flex-row gap-2.5">
                        <input id="claim-key-input" type="text" placeholder="Enter your License Key (ST-XXXX-XXXX)..." class="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white font-mono text-xs focus:outline-none focus:border-crimson uppercase placeholder:text-neutral-500" required>
                        <button type="submit" class="btn-crimson py-2.5 px-5 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,0,60,0.4)] cursor-pointer">
                            <span>Connect License</span>
                            <span>➔</span>
                        </button>
                    </form>
                    <div class="mt-3 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                        <span>Need a license?</span>
                        <a href="https://discord.gg/dxSFk6a3n" target="_blank" rel="noopener noreferrer" class="text-[#7983f5] hover:text-white font-bold underline flex items-center gap-1">
                            Get License for $1 on Discord ↗
                        </a>
                    </div>
                </div>
            `;
        }

        if (!hasLicenses) {
            listContainer.innerHTML = `
                <div class="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <p class="text-neutral-300 text-xs font-mono mb-2">No active license keys bound to your account yet.</p>
                    <p class="text-[11px] text-neutral-500">Enter your license key in the form above to connect and activate your workstation.</p>
                </div>
            `;
            return;
        }

        var html = '';
        licenses.forEach(function (lic) {
            var isRevoked = lic.status === 'revoked' || lic.is_active === false;
            var statusBg = isRevoked ? 'bg-crimson/20 text-crimson border-crimson/50' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
            var statusLabel = isRevoked ? 'REVOKED' : 'LINKED & ACTIVE';

            var machineText = lic.machine_id ? 
                lic.machine_id.substring(0, 16) + '...' + lic.machine_id.substring(lic.machine_id.length - 8) : 
                'Available for workstation activation (Ready)';

            var activatedDate = lic.activated_at ? new Date(lic.activated_at).toLocaleDateString() : (lic.linked_at ? 'Linked ' + new Date(lic.linked_at).toLocaleDateString() : 'Ready to Bind');

            html += `
                <div class="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-mono font-black text-sm text-white tracking-wider select-all">${lic.license_key}</span>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border uppercase ${statusBg} inline-flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full ${isRevoked ? 'bg-crimson' : 'bg-emerald-400'}"></span>
                                ${statusLabel}
                            </span>
                        </div>
                        <div class="text-[11px] font-mono text-neutral-400">
                            Hardware Binding: <span class="text-neutral-300 font-mono">${machineText}</span>
                        </div>
                        <div class="text-[10px] font-mono text-neutral-500 mt-0.5">
                            Status: <span class="text-neutral-400">${activatedDate}</span> &bull; 1 Workstation Active Lock
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="copyToClipboard('${lic.license_key}')" class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer" title="Copy License Key">
                            <span>📋</span> Copy Key
                        </button>
                    </div>
                </div>
            `;
        });
        listContainer.innerHTML = html;
    }

    // --- Load User Profile & Licenses ---
    window.loadUserDashboard = async function (user) {
        if (!user) return;

        // Profile Display
        var emailEl = document.getElementById('dash-user-email');
        var nameEl = document.getElementById('dash-user-name');
        var verifiedBadge = document.getElementById('dash-user-verified');

        if (emailEl) emailEl.innerText = user.email || '';
        if (nameEl) nameEl.innerText = (user.user_metadata && user.user_metadata.full_name) || user.email.split('@')[0];
        if (verifiedBadge) {
            var isVerified = !!user.email_confirmed_at;
            verifiedBadge.innerHTML = isVerified ?
                '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">✓ VERIFIED EMAIL</span>' :
                '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/40">⚡ ACTIVE ACCOUNT</span>';
        }

        var listContainer = document.getElementById('dash-user-licenses-list');

        // Check if live Supabase is active
        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            if (listContainer) {
                listContainer.innerHTML = '<div class="text-neutral-500 font-mono text-xs py-4 text-center">Checking account licenses in database...</div>';
            }
            try {
                var query = window.sbClient.from('licenses').select('*');
                if (user.id && user.email) {
                    query = query.or('user_id.eq.' + user.id + ',user_email.eq.' + user.email.toLowerCase());
                } else if (user.id) {
                    query = query.eq('user_id', user.id);
                } else if (user.email) {
                    query = query.eq('user_email', user.email.toLowerCase());
                }

                var res = await query.order('created_at', { ascending: false });

                if (!res.error && res.data && res.data.length > 0) {
                    renderUserLicenseCards(res.data);
                } else {
                    // Do NOT auto-assign or fallback to unverified local storage keys
                    renderUserLicenseCards([]);
                }
            } catch (err) {
                console.warn('[ST Dashboard] Licenses fetch warning:', err);
                renderUserLicenseCards([]);
            }
        } else {
            // Standalone mode: Only show licenses if user explicitly claimed one
            var storageKey = 'ST_USER_CLAIMED_LICENSE_' + (user.id || user.email);
            var localKey = localStorage.getItem(storageKey);
            if (localKey) {
                renderUserLicenseCards([{
                    license_key: localKey,
                    status: 'unactivated',
                    is_active: true,
                    machine_id: null
                }]);
            } else {
                renderUserLicenseCards([]);
            }
        }

        // Check Admin Status
        checkAdminAccess(user);
    };

    // --- Claim Key to User Account (RPC) ---
    window.handleClaimKey = async function (e) {
        if (e) e.preventDefault();
        var input = document.getElementById('claim-key-input');
        if (!input) return;
        var key = input.value.trim().toUpperCase();

        if (!key || key.length < 10) {
            alert('Please enter a valid ST-XXXX license key.');
            return;
        }

        var user = window.getCurrentUser ? window.getCurrentUser() : null;

        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                // Ensure active Supabase session is refreshed
                if (window.sbClient.auth) {
                    var sessionRes = await window.sbClient.auth.getSession();
                    if (sessionRes && sessionRes.data && sessionRes.data.session) {
                        user = sessionRes.data.session.user;
                    }
                }

                if (!user) {
                    alert('Please sign in or create an account first to claim your license key.');
                    if (window.openAuthModal) window.openAuthModal('signin');
                    return;
                }

                var userEmail = (user.email || '').trim().toLowerCase();
                var userName = '';
                if (user.user_metadata) {
                    userName = user.user_metadata.full_name || user.user_metadata.name || '';
                }
                if (!userName && userEmail) {
                    userName = userEmail.split('@')[0];
                }

                // Call upgraded claim_license_key RPC passing user_name & user_email
                var res = await window.sbClient.rpc('claim_license_key', {
                    input_key: key,
                    p_user_name: userName,
                    p_user_email: userEmail
                });

                // Fallback 1: claim_license_to_user with 3 parameters
                if (res.error && (res.error.code === 'PGRST202' || (res.error.message && res.error.message.indexOf('not found') !== -1))) {
                    res = await window.sbClient.rpc('claim_license_to_user', {
                        p_license_key: key,
                        p_user_name: userName,
                        p_user_email: userEmail
                    });
                }

                // Fallback 2: legacy claim_license_key single param
                if (res.error && (res.error.code === 'PGRST202' || (res.error.message && res.error.message.indexOf('not found') !== -1))) {
                    res = await window.sbClient.rpc('claim_license_key', { input_key: key });
                }

                if (res.error) throw res.error;

                if (res.data && res.data.success) {
                    alert('✓ Success: ' + (res.data.message || 'License key successfully linked!'));
                    input.value = '';
                    if (user) await loadUserDashboard(user);
                } else {
                    alert('Notice: ' + ((res.data && res.data.message) || 'Failed to claim key. Check for typos or active status.'));
                }
            } catch (err) {
                console.error('[ST Dashboard] Claim key error:', err);
                alert('Error claiming key: ' + (err.message || err));
            }
        } else {
            if (user) {
                localStorage.setItem('ST_USER_LICENSE_' + (user.id || user.email), key);
                alert('✓ License linked to your account!');
                input.value = '';
                loadUserDashboard(user);
            } else {
                alert('Please sign in or create an account to link your license key.');
                if (window.openAuthModal) window.openAuthModal('signin');
            }
        }
    };

    // --- Admin Check ---
    async function checkAdminAccess(user) {
        var adminTabBtn = document.getElementById('dash-tab-admin-btn');
        var directAdminBtn = document.getElementById('dash-direct-admin-btn');

        var isMasterEmail = (user.email && user.email.toLowerCase() === window.ST_CONFIG.MASTER_ADMIN_EMAIL.toLowerCase());

        if (isMasterEmail) {
            isAdminUser = true;
            if (adminTabBtn) adminTabBtn.classList.remove('hidden');
            if (directAdminBtn) {
                directAdminBtn.classList.remove('hidden');
                directAdminBtn.classList.add('inline-flex');
            }
            return;
        }

        if (directAdminBtn) {
            directAdminBtn.classList.add('hidden');
            directAdminBtn.classList.remove('inline-flex');
        }

        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                var res = await window.sbClient
                    .from('admin_users')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (res.data && res.data.role) {
                    isAdminUser = true;
                    if (adminTabBtn) adminTabBtn.classList.remove('hidden');
                    if (directAdminBtn) {
                        directAdminBtn.classList.remove('hidden');
                        directAdminBtn.classList.add('inline-flex');
                    }
                } else {
                    isAdminUser = false;
                    if (adminTabBtn) adminTabBtn.classList.add('hidden');
                }
            } catch (e) {
                if (adminTabBtn) adminTabBtn.classList.add('hidden');
            }
        } else {
            if (adminTabBtn) adminTabBtn.classList.add('hidden');
        }
    }

    // --- Load All Admin Licenses & Telemetry ---
    async function loadAdminLicenses() {
        var tableBody = document.getElementById('admin-licenses-tbody');
        var countBadge = document.getElementById('admin-total-count');
        if (!tableBody) return;

        // 1. Live Supabase Query with Telemetry RPC
        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            tableBody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-neutral-500 font-mono text-xs">Loading database records and user telemetry...</td></tr>';
            try {
                // Fetch using telemetry RPC (joins auth.users for Full Name & Email)
                var res = await window.sbClient.rpc('get_admin_licenses_telemetry');
                if (res.error) {
                    // Fallback to direct table select if RPC not migrated yet
                    res = await window.sbClient
                        .from('licenses')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(500);
                }

                if (res.error) throw res.error;

                allAdminLicenses = res.data || [];
                if (countBadge) countBadge.innerText = allAdminLicenses.length + ' Total Keys (Live Database)';
                renderAdminTable(allAdminLicenses);
                return;
            } catch (err) {
                tableBody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-crimson font-mono text-xs">
                    Database Query Notice: ${err.message || err}<br>
                    <span class="text-neutral-400 text-[10px]">Ensure migration_telemetry_linking.sql is executed in your Supabase SQL editor.</span>
                </td></tr>`;
                return;
            }
        }

        // 2. Standalone Mode: Load from Local Storage Vault
        var stored = localStorage.getItem('ST_LOCAL_ADMIN_KEYS');
        if (stored) {
            try {
                allAdminLicenses = JSON.parse(stored);
            } catch (e) {
                allAdminLicenses = [];
            }
        } else {
            allAdminLicenses = [];
        }

        if (countBadge) countBadge.innerText = allAdminLicenses.length + ' Keys (Local Standalone Vault)';
        renderAdminTable(allAdminLicenses);
    }

    // --- Render Enhanced Admin Telemetry Table ---
    function renderAdminTable(data) {
        var tableBody = document.getElementById('admin-licenses-tbody');
        if (!tableBody) return;

        if (!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-neutral-500 font-mono text-xs">No licenses found. Click "Generate Keys" above to mint a batch!</td></tr>';
            return;
        }

        var rows = '';
        data.forEach(function (lic) {
            var isRevoked = lic.status === 'revoked' || lic.is_active === false;
            var statusBadge = '';
            var actionBtns = '';

            if (isRevoked) {
                statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border text-crimson bg-crimson/15 border-crimson/40 uppercase inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-crimson"></span> REVOKED</span>';
                actionBtns = `<button onclick="toggleLicenseAccess('${lic.license_key}', 'unactivated')" class="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/40 text-emerald-300 hover:text-black text-[11px] font-mono font-bold transition-all" title="Restore license">✓ Un-Revoke</button>`;
            } else if (lic.status === 'active') {
                statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border text-emerald-400 bg-emerald-500/15 border-emerald-500/40 uppercase inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ACTIVE (BOUND)</span>';
                actionBtns = `<button onclick="handleAdminRevoke('${lic.license_key}')" class="px-2.5 py-1 rounded-lg bg-crimson/20 hover:bg-crimson border border-crimson/50 text-crimson hover:text-white text-[11px] font-mono font-bold transition-all" title="Immediately revoke remote access">⛔ Revoke</button>`;
            } else if (lic.status === 'unactivated') {
                statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border text-emerald-300 bg-emerald-500/10 border-emerald-500/30 uppercase inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> APPROVED (READY)</span>';
                actionBtns = `<button onclick="handleAdminRevoke('${lic.license_key}')" class="px-2.5 py-1 rounded-lg bg-crimson/20 hover:bg-crimson border border-crimson/50 text-crimson hover:text-white text-[11px] font-mono font-bold transition-all" title="Immediately revoke key">⛔ Revoke</button>`;
            } else {
                // suspended or pending
                statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border text-amber-400 bg-amber-500/15 border-amber-500/40 uppercase inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> PENDING (OFF)</span>';
                actionBtns = `<button onclick="toggleLicenseAccess('${lic.license_key}', 'unactivated')" class="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-mono font-black transition-all inline-flex items-center gap-1 shadow-sm" title="Approve and activate access">✓ APPROVE</button>`;
            }

            // Unlink Button if Claimed
            var isClaimed = !!(lic.user_id || lic.user_email || lic.user_name);
            if (isClaimed) {
                actionBtns += `<button onclick="handleAdminUnlink('${lic.license_key}')" class="px-2 py-1 rounded-lg bg-white/10 hover:bg-amber-500/25 border border-white/20 text-neutral-300 hover:text-amber-300 text-[11px] font-mono font-bold transition-all ml-1.5" title="Unlink this key from user">🔓 Unlink</button>`;
            }

            // Claimed By User Cell
            var claimedCell = '';
            if (lic.user_name || lic.user_email) {
                var displayName = lic.user_name || (lic.user_email ? lic.user_email.split('@')[0] : 'Creator');
                var displayEmail = lic.user_email || '';
                claimedCell = `<div><div class="font-bold text-white text-xs">${displayName}</div><div class="text-[10px] text-neutral-400 font-mono">${displayEmail}</div></div>`;
            } else if (lic.user_id) {
                claimedCell = `<span class="text-neutral-400 font-mono text-[10px]" title="${lic.user_id}">UID: ${lic.user_id.substring(0,8)}...</span>`;
            } else {
                claimedCell = '<span class="text-neutral-500 italic text-[11px]">Unclaimed</span>';
            }

            var machinePreview = lic.machine_id ? 
                `<span class="font-mono text-[11px] text-neutral-300 cursor-pointer" title="${lic.machine_id}">${lic.machine_id.substring(0, 8)}...${lic.machine_id.substring(lic.machine_id.length - 8)}</span>` : 
                '<span class="text-neutral-500 italic text-[11px]">Not Bound</span>';

            rows += `
                <tr class="border-b border-white/5 hover:bg-white/5 font-mono text-xs transition-colors">
                    <td class="py-3 px-3 font-bold text-white tracking-wider select-all">${lic.license_key}</td>
                    <td class="py-3 px-3">${statusBadge}</td>
                    <td class="py-3 px-3">${claimedCell}</td>
                    <td class="py-3 px-3">${machinePreview}</td>
                    <td class="py-3 px-3 text-right whitespace-nowrap">
                        ${actionBtns}
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = rows;
    }

    // --- Search Filter in Admin Table ---
    window.filterAdminLicenses = function () {
        var queryInput = document.getElementById('admin-search-input');
        var query = queryInput ? queryInput.value.trim().toUpperCase() : '';
        var statusFilterEl = document.getElementById('admin-status-filter');
        var statusFilter = statusFilterEl ? statusFilterEl.value : 'all';

        var filtered = allAdminLicenses.filter(function (lic) {
            var matchQ = !query || 
                lic.license_key.includes(query) || 
                (lic.machine_id && lic.machine_id.toUpperCase().includes(query)) ||
                (lic.user_email && lic.user_email.toUpperCase().includes(query)) ||
                (lic.user_name && lic.user_name.toUpperCase().includes(query));

            var matchS = statusFilter === 'all' || 
                         lic.status === statusFilter || 
                         (statusFilter === 'revoked' && (lic.status === 'revoked' || lic.is_active === false));

            return matchQ && matchS;
        });

        renderAdminTable(filtered);
    };

    // --- Remote Revoke Key (Master Admin) ---
    window.handleAdminRevoke = async function (key) {
        if (!confirm('REVOKE license key ' + key + ' immediately?\n\nThis will instantly disconnect and block the user\'s After Effects extension remotely.')) {
            return;
        }

        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                var res = await window.sbClient.rpc('admin_revoke_license', { p_license_key: key });
                if (res.error) {
                    // Fallback to direct update
                    res = await window.sbClient
                        .from('licenses')
                        .update({ status: 'revoked', is_active: false })
                        .eq('license_key', key);
                }
                if (res.error) throw res.error;
                alert('License ' + key + ' has been REVOKED. Remote AE extension is now blocked.');
                await loadAdminLicenses();
            } catch (err) {
                alert('Error revoking license: ' + err.message);
            }
        } else {
            allAdminLicenses = allAdminLicenses.map(function (lic) {
                if (lic.license_key === key) {
                    lic.status = 'revoked';
                    lic.is_active = false;
                }
                return lic;
            });
            localStorage.setItem('ST_LOCAL_ADMIN_KEYS', JSON.stringify(allAdminLicenses));
            renderAdminTable(allAdminLicenses);
            alert('License ' + key + ' revoked in local vault.');
        }
    };

    // --- Unlink Key from User Account ---
    window.handleAdminUnlink = async function (key) {
        if (!confirm('UNLINK license ' + key + ' from its current user account?\n\nThe key will become unclaimed and can be re-assigned or re-claimed.')) {
            return;
        }

        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                var res = await window.sbClient.rpc('admin_unlink_license', { p_license_key: key });
                if (res.error) {
                    res = await window.sbClient
                        .from('licenses')
                        .update({ user_id: null, user_name: null, user_email: null, linked_at: null })
                        .eq('license_key', key);
                }
                if (res.error) throw res.error;
                alert('License ' + key + ' successfully unlinked from user account.');
                await loadAdminLicenses();
            } catch (err) {
                alert('Error unlinking license: ' + err.message);
            }
        } else {
            allAdminLicenses = allAdminLicenses.map(function (lic) {
                if (lic.license_key === key) {
                    lic.user_id = null;
                    lic.user_email = null;
                    lic.user_name = null;
                }
                return lic;
            });
            localStorage.setItem('ST_LOCAL_ADMIN_KEYS', JSON.stringify(allAdminLicenses));
            renderAdminTable(allAdminLicenses);
            alert('License ' + key + ' unlinked in local vault.');
        }
    };

    // --- Batch Generate Keys (Master Admin) ---
    window.handleGenerateBatch = async function () {
        var countInput = document.getElementById('admin-batch-count');
        var count = countInput ? parseInt(countInput.value, 10) : 200;
        if (!count || count <= 0) count = 200;

        if (!confirm('Batch-generate ' + count + ' enterprise license keys in format ST-XXXX-XXXX-XXXX-XXXX?')) {
            return;
        }

        var btn = document.getElementById('admin-batch-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerText = '⚡ Generating ' + count + ' Keys...';
        }

        // Live Supabase RPC Call
        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                var res = await window.sbClient.rpc('generate_batch_licenses', { p_count: count });
                if (res.error) throw res.error;

                alert('Success! Generated ' + count + ' new enterprise license keys directly into Supabase PostgreSQL.');
                await loadAdminLicenses();
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = '⚡ GENERATE KEYS';
                }
                return;
            } catch (err) {
                console.warn('[ST Dashboard] Supabase RPC Notice:', err);
            }
        }

        // Seamless Generator Fallback
        var newKeys = [];
        var nowStr = new Date().toISOString();
        for (var i = 0; i < count; i++) {
            newKeys.push({
                id: 'gen_' + i + '_' + Date.now(),
                license_key: generateLicenseKeyChunk(),
                status: 'unactivated',
                is_active: true,
                machine_id: null,
                created_at: nowStr
            });
        }

        allAdminLicenses = newKeys.concat(allAdminLicenses);
        localStorage.setItem('ST_LOCAL_ADMIN_KEYS', JSON.stringify(allAdminLicenses));

        renderAdminTable(allAdminLicenses);
        var countBadge = document.getElementById('admin-total-count');
        if (countBadge) countBadge.innerText = allAdminLicenses.length + ' Total Keys';

        if (btn) {
            btn.disabled = false;
            btn.innerText = '⚡ GENERATE KEYS';
        }

        alert('Success! Minted ' + count + ' license keys. You can now click "Export CSV" to download them.');
    };

    // --- Approve / Suspend License Access ---
    window.toggleLicenseAccess = async function (idOrKey, newStatus) {
        var isApproving = (newStatus === 'unactivated' || newStatus === 'active');
        var promptMsg = isApproving ? 
            'APPROVE and TURN ON access for license ' + idOrKey + '?\n\nThe user will be able to activate it in After Effects immediately.' :
            'SUSPEND and TURN OFF access for license ' + idOrKey + '?\n\nThe user will be blocked from using it in After Effects.';

        if (!confirm(promptMsg)) return;

        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                var query = idOrKey.includes('ST-') ? 
                    window.sbClient.from('licenses').update({ status: newStatus, is_active: (newStatus !== 'revoked' && newStatus !== 'suspended') }).eq('license_key', idOrKey) :
                    window.sbClient.from('licenses').update({ status: newStatus, is_active: (newStatus !== 'revoked' && newStatus !== 'suspended') }).eq('id', idOrKey);

                var res = await query;
                if (res.error) throw res.error;
                await loadAdminLicenses();
            } catch (err) {
                alert('Error updating license: ' + err.message);
            }
        } else {
            // Local mode
            allAdminLicenses = allAdminLicenses.map(function (lic) {
                if (lic.id === idOrKey || lic.license_key === idOrKey) {
                    lic.status = newStatus;
                    lic.is_active = (newStatus !== 'revoked' && newStatus !== 'suspended');
                }
                return lic;
            });
            localStorage.setItem('ST_LOCAL_ADMIN_KEYS', JSON.stringify(allAdminLicenses));
            renderAdminTable(allAdminLicenses);
        }
    };
    window.toggleRevokeLicense = window.toggleLicenseAccess;

    // --- Batch Approve All Keys (Turn On) ---
    window.batchApproveAllKeys = async function () {
        if (!confirm('APPROVE and TURN ON all ' + allAdminLicenses.length + ' license keys?\n\nUsers will be able to activate them immediately in After Effects.')) return;

        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                var res = await window.sbClient
                    .from('licenses')
                    .update({ status: 'unactivated', is_active: true })
                    .neq('status', 'active'); // Keep already-bound machines active

                if (res.error) throw res.error;
                alert('Success! All keys are now APPROVED (READY) in Supabase.');
                await loadAdminLicenses();
            } catch (err) {
                alert('Batch update error: ' + err.message);
            }
        } else {
            allAdminLicenses = allAdminLicenses.map(function (lic) {
                if (lic.status !== 'active') {
                    lic.status = 'unactivated';
                    lic.is_active = true;
                }
                return lic;
            });
            localStorage.setItem('ST_LOCAL_ADMIN_KEYS', JSON.stringify(allAdminLicenses));
            renderAdminTable(allAdminLicenses);
            alert('Success! All local keys are now APPROVED (READY).');
        }
    };

    // --- Batch Suspend All Keys (Turn Off) ---
    window.batchSuspendAllKeys = async function () {
        if (!confirm('TURN OFF and SUSPEND all unassigned license keys?\n\nUsers will NOT be able to activate them until you approve them individually.')) return;

        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                var res = await window.sbClient
                    .from('licenses')
                    .update({ status: 'suspended', is_active: false })
                    .eq('status', 'unactivated');

                if (res.error) throw res.error;
                alert('Success! All unassigned keys are now SUSPENDED (OFF) in Supabase.');
                await loadAdminLicenses();
            } catch (err) {
                alert('Batch update error: ' + err.message);
            }
        } else {
            allAdminLicenses = allAdminLicenses.map(function (lic) {
                if (lic.status === 'unactivated') {
                    lic.status = 'suspended';
                    lic.is_active = false;
                }
                return lic;
            });
            localStorage.setItem('ST_LOCAL_ADMIN_KEYS', JSON.stringify(allAdminLicenses));
            renderAdminTable(allAdminLicenses);
            alert('Success! All unassigned keys are now SUSPENDED (OFF).');
        }
    };

    // --- Export to CSV with Full Telemetry ---
    window.exportLicensesToCSV = function () {
        if (!allAdminLicenses || allAdminLicenses.length === 0) {
            alert('No licenses available to export. Click "Generate Keys" first!');
            return;
        }

        var csv = 'License Key,Status,Active,Claimed User Name,Claimed User Email,Machine ID,Created At\n';
        allAdminLicenses.forEach(function (lic) {
            csv += [
                lic.license_key,
                lic.status,
                lic.is_active !== false ? 'TRUE' : 'FALSE',
                (lic.user_name || '').replace(/,/g, ' '),
                lic.user_email || 'Unclaimed',
                lic.machine_id || 'Not Bound',
                lic.created_at || 'N/A'
            ].join(',') + '\n';
        });

        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var today = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = 'Sumair_Tools_Telemetry_Licenses_' + today + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    window.copyToClipboard = function (text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                alert('Copied to clipboard: ' + text);
            });
        }
    };

})();
