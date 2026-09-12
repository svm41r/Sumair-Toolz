/**
 * Sumair Tools — Master Admin Command Center Controller
 * Dedicated Telemetry, Revocation & Key Generation Hub
 * Copyright (c) 2026 Sumair Ali Siddiqui. All Rights Reserved.
 */

(function () {
    'use strict';

    var adminLicenses = [];

    window.initAdminPanel = async function () {
        // Wait for Supabase client
        if (!window.sbClient && window.initSupabaseClient) {
            window.initSupabaseClient();
        }

        var user = null;
        if (window.sbClient && window.sbClient.auth) {
            var sessionRes = await window.sbClient.auth.getSession();
            user = (sessionRes && sessionRes.data && sessionRes.data.session) ? sessionRes.data.session.user : null;
        }

        if (!user && window.getCurrentUser) {
            user = window.getCurrentUser();
        }

        if (!user) {
            try {
                user = JSON.parse(localStorage.getItem('ST_CURRENT_USER'));
            } catch (e) {}
        }

        if (!user) {
            // Check all auth tokens in localStorage
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && (k.startsWith('sb-') || k.includes('auth-token'))) {
                    try {
                        var parsed = JSON.parse(localStorage.getItem(k));
                        if (parsed && (parsed.user || parsed.currentSession)) {
                            user = parsed.user || parsed.currentSession.user;
                            break;
                        }
                    } catch (e) {}
                }
            }
        }

        if (!user) {
            showAccessGate('Please sign in with your Master Admin account (sumairalisiddiqui@gmail.com).', true);
            return;
        }

        var isMaster = (user.email && user.email.toLowerCase() === window.ST_CONFIG.MASTER_ADMIN_EMAIL.toLowerCase());

        if (!isMaster) {
            // Check admin_users table
            try {
                var checkRes = await window.sbClient
                    .from('admin_users')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!checkRes.data || !checkRes.data.role) {
                    showAccessGate('Access Denied: Your account (' + user.email + ') does not have Super Admin clearance.', false);
                    return;
                }
            } catch (e) {
                showAccessGate('Access Denied: Super Admin authentication check failed.', false);
                return;
            }
        }

        // Access Granted!
        document.getElementById('admin-access-gate').classList.add('hidden');
        document.getElementById('admin-main-content').classList.remove('hidden');
        var adminEmailBadge = document.getElementById('admin-profile-email');
        if (adminEmailBadge) adminEmailBadge.innerText = user.email;

        loadAdminData();
    };

    window.handleDirectAdminLogin = async function (e) {
        if (e) e.preventDefault();
        var emailInput = document.getElementById('gate-admin-email');
        var passInput = document.getElementById('gate-admin-password');
        var submitBtn = document.getElementById('gate-submit-btn');
        var errDiv = document.getElementById('gate-login-error');

        var email = emailInput ? emailInput.value.trim() : '';
        var password = passInput ? passInput.value : '';

        if (!email || !password) {
            if (errDiv) { errDiv.innerText = 'Please enter both email and password.'; errDiv.classList.remove('hidden'); }
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'AUTHENTICATING...';
        }

        if (errDiv) errDiv.classList.add('hidden');

        try {
            if (!window.sbClient && window.initSupabaseClient) {
                window.initSupabaseClient();
            }

            if (window.sbClient && window.sbClient.auth) {
                var res = await window.sbClient.auth.signInWithPassword({ email: email, password: password });
                if (res.error) throw res.error;
                if (res.data && res.data.user) {
                    localStorage.setItem('ST_CURRENT_USER', JSON.stringify(res.data.user));
                    await window.initAdminPanel();
                    return;
                }
            }
            throw new Error('Supabase client uninitialized.');
        } catch (err) {
            if (errDiv) {
                errDiv.innerText = err.message || 'Authentication failed.';
                errDiv.classList.remove('hidden');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = '🔓 UNLOCK MASTER ADMIN';
            }
        }
    };

    function showAccessGate(msg, showLoginBtn) {
        var gate = document.getElementById('admin-access-gate');
        var gateMsg = document.getElementById('gate-message');
        var loginBtn = document.getElementById('gate-login-btn');
        if (gate) gate.classList.remove('hidden');
        if (gateMsg) gateMsg.innerText = msg;
        if (loginBtn) {
            if (showLoginBtn) loginBtn.classList.remove('hidden');
            else loginBtn.classList.add('hidden');
        }
        var main = document.getElementById('admin-main-content');
        if (main) main.classList.add('hidden');
    }

    window.loadAdminData = async function () {
        var tableBody = document.getElementById('admin-tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-neutral-500 font-mono text-xs">Fetching live database telemetry and user records...</td></tr>';
        }

        console.log('[Admin Command Center] Initializing license telemetry fetch for Master Admin...');

        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                var res = null;
                var lastErr = null;

                // 1. Primary Strategy: get_all_licenses_admin() RPC
                try {
                    var rpcRes = await window.sbClient.rpc('get_all_licenses_admin');
                    console.log('[Admin Command Center] rpc get_all_licenses_admin response:', rpcRes);
                    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
                        res = rpcRes;
                    } else if (rpcRes.error) {
                        lastErr = rpcRes.error;
                        console.warn('[Admin Command Center] get_all_licenses_admin error:', rpcRes.error);
                    }
                } catch (e) {
                    lastErr = e;
                    console.warn('[Admin Command Center] rpc call threw:', e);
                }

                // 2. Fallback 1: get_admin_licenses_telemetry RPC
                if (!res) {
                    try {
                        console.log('[Admin Command Center] Trying fallback 1: get_admin_licenses_telemetry...');
                        var fbRes = await window.sbClient.rpc('get_admin_licenses_telemetry');
                        console.log('[Admin Command Center] rpc get_admin_licenses_telemetry response:', fbRes);
                        if (!fbRes.error && Array.isArray(fbRes.data)) {
                            res = fbRes;
                        } else if (fbRes.error) {
                            lastErr = fbRes.error;
                        }
                    } catch (e) {
                        lastErr = e;
                    }
                }

                // 3. Fallback 2: Direct SELECT * FROM licenses
                if (!res) {
                    try {
                        console.log('[Admin Command Center] Trying fallback 2: direct licenses table select...');
                        var directRes = await window.sbClient
                            .from('licenses')
                            .select('*')
                            .order('created_at', { ascending: false });
                        console.log('[Admin Command Center] direct table select response:', directRes);
                        if (!directRes.error && Array.isArray(directRes.data)) {
                            res = directRes;
                        } else if (directRes.error) {
                            lastErr = directRes.error;
                        }
                    } catch (e) {
                        lastErr = e;
                    }
                }

                if (!res || res.error) {
                    throw (res && res.error) || lastErr || new Error('Unknown error loading licenses.');
                }

                adminLicenses = res.data || [];
                console.log('[Admin Command Center] Successfully loaded total licenses:', adminLicenses.length);

                updateStats(adminLicenses);
                renderTable(adminLicenses);
            } catch (err) {
                console.error('[Admin Command Center] Fatal fetch error:', err);
                if (tableBody) {
                    tableBody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-crimson font-mono text-xs">
                        Failed to fetch licenses: ${err.message || JSON.stringify(err)}<br>
                        <span class="text-neutral-400 text-[10px] block mt-1">Please run <b>FIX_ADMIN_AMBIGUOUS_USER_ID.sql</b> in Supabase SQL Editor.</span>
                    </td></tr>`;
                }
            }
        }
    };

    function updateStats(data) {
        var total = data.length;
        var active = 0;
        var bound = 0;
        var revoked = 0;

        data.forEach(function (lic) {
            var isRev = lic.status === 'revoked' || lic.is_active === false || lic.status === 'suspended';
            if (isRev) {
                revoked++;
            } else if (lic.status === 'active') {
                active++;
            }

            if (lic.machine_id && lic.machine_id.trim().length > 0) {
                bound++;
            }
        });

        var elTotal = document.getElementById('stat-total');
        var elActive = document.getElementById('stat-active');
        var elBound = document.getElementById('stat-bound');
        var elRevoked = document.getElementById('stat-revoked');

        if (elTotal) elTotal.innerText = total;
        if (elActive) elActive.innerText = active;
        if (elBound) elBound.innerText = bound;
        if (elRevoked) elRevoked.innerText = revoked;
    }

    function renderTable(data) {
        var tableBody = document.getElementById('admin-tbody');
        if (!tableBody) return;

        if (!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-neutral-500 font-mono text-xs">No licenses match the current filter.</td></tr>';
            return;
        }

        var rows = '';
        data.forEach(function (lic) {
            var isRevoked = lic.status === 'revoked' || lic.is_active === false;
            var statusBadge = '';
            var actionBtns = '';

            // Copy Key button always present
            actionBtns += `<button onclick="copyLicenseKey('${lic.license_key}')" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono font-bold transition-all mr-1.5 cursor-pointer" title="Copy license key">📋 Copy</button>`;

            if (isRevoked) {
                statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold border text-crimson bg-crimson/15 border-crimson/40 uppercase inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-crimson"></span> REVOKED</span>';
                actionBtns += `<button onclick="reactivateLicense('${lic.license_key}')" class="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/40 text-emerald-300 hover:text-black text-[11px] font-mono font-bold transition-all cursor-pointer" title="Reactivate license">✓ Reactivate</button>`;
            } else if (lic.status === 'active') {
                statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold border text-emerald-400 bg-emerald-500/15 border-emerald-500/40 uppercase inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ACTIVE (BOUND)</span>';
                actionBtns += `<button onclick="revokeLicense('${lic.license_key}')" class="px-2.5 py-1 rounded-lg bg-crimson/20 hover:bg-crimson border border-crimson/50 text-crimson hover:text-white text-[11px] font-mono font-bold transition-all cursor-pointer" title="Immediately revoke remote access">⛔ Revoke</button>`;
            } else if (lic.status === 'unactivated') {
                statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold border text-emerald-300 bg-emerald-500/10 border-emerald-500/30 uppercase inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> APPROVED (READY)</span>';
                actionBtns += `<button onclick="revokeLicense('${lic.license_key}')" class="px-2.5 py-1 rounded-lg bg-crimson/20 hover:bg-crimson border border-crimson/50 text-crimson hover:text-white text-[11px] font-mono font-bold transition-all cursor-pointer" title="Immediately revoke key">⛔ Revoke</button>`;
            } else {
                statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold border text-amber-400 bg-amber-500/15 border-amber-500/40 uppercase inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> PENDING (OFF)</span>';
                actionBtns += `<button onclick="reactivateLicense('${lic.license_key}')" class="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-mono font-black transition-all inline-flex items-center gap-1 shadow-sm cursor-pointer" title="Approve and activate access">✓ Reactivate</button>`;
            }

            // Unlink Machine / Reset HWID action if machine is bound
            if (lic.machine_id && lic.machine_id.trim().length > 0) {
                actionBtns += `<button onclick="resetMachineHWID('${lic.license_key}')" class="px-2.5 py-1 rounded-lg bg-cyanAccent/15 hover:bg-cyanAccent/30 border border-cyanAccent/40 text-cyanAccent text-[11px] font-mono font-bold transition-all ml-1.5 cursor-pointer" title="Reset HWID binding so user can activate on a new PC">🔄 Reset HWID</button>`;
            }

            var isClaimed = !!(lic.user_id || lic.user_email || lic.user_name);
            if (isClaimed) {
                actionBtns += `<button onclick="unlinkLicense('${lic.license_key}')" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-amber-500/25 border border-white/20 text-neutral-300 hover:text-amber-300 text-[11px] font-mono font-bold transition-all ml-1.5 cursor-pointer" title="Unlink user from this key">🔓 Unlink</button>`;
            }

            var claimedHtml = '';
            if (lic.user_name || lic.user_email) {
                var dispName = lic.user_name || (lic.user_email ? lic.user_email.split('@')[0] : 'Creator');
                var dispEmail = lic.user_email || '';
                claimedHtml = `<div><div class="font-bold text-white text-xs">${dispName}</div><div class="text-[10px] text-neutral-400 font-mono">${dispEmail}</div></div>`;
            } else if (lic.user_id) {
                claimedHtml = `<span class="text-neutral-400 font-mono text-[10px]" title="${lic.user_id}">UID: ${lic.user_id.substring(0,8)}...</span>`;
            } else {
                claimedHtml = '<span class="text-neutral-500 italic text-[11px]">Unclaimed</span>';
            }

            var machinePreview = lic.machine_id ? 
                `<span class="font-mono text-[11px] text-cyanAccent cursor-pointer" title="${lic.machine_id}">${lic.machine_id.substring(0, 8)}...${lic.machine_id.substring(lic.machine_id.length - 8)}</span>` : 
                '<span class="text-neutral-500 italic text-[11px]">Not Bound</span>';

            var createdDate = lic.created_at ? new Date(lic.created_at).toLocaleDateString() : 'N/A';

            rows += `
                <tr class="border-b border-white/5 hover:bg-white/5 font-mono text-xs transition-colors">
                    <td class="py-3 px-4 font-bold text-white tracking-wider select-all">${lic.license_key}</td>
                    <td class="py-3 px-4">${claimedHtml}</td>
                    <td class="py-3 px-4">${machinePreview}</td>
                    <td class="py-3 px-4">${statusBadge}</td>
                    <td class="py-3 px-4 text-neutral-400 text-[11px] whitespace-nowrap">${createdDate}</td>
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                        ${actionBtns}
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = rows;
    }

    window.copyLicenseKey = function (key) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(key);
        } else {
            var ta = document.createElement('textarea');
            ta.value = key;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        alert('✓ Copied License Key to clipboard: ' + key);
    };

    window.resetMachineHWID = async function (key) {
        if (!confirm('UNLINK MACHINE & RESET HWID for ' + key + '?\n\nThis clears the hardware binding so the user can activate the key on a new PC.')) return;
        try {
            var res = await window.sbClient.rpc('admin_reset_machine_hwid', { p_license_key: key });
            if (res.error) {
                res = await window.sbClient.from('licenses').update({
                    machine_id: null,
                    activated_at: null,
                    last_verified_at: null,
                    status: 'unactivated'
                }).eq('license_key', key);
            }
            if (res.error) throw res.error;
            alert('✓ Machine HWID successfully reset for ' + key + '!\nThe user can now bind and activate this key on their new computer.');
            loadAdminData();
        } catch (err) {
            alert('Error resetting HWID: ' + err.message);
        }
    };

    window.reactivateLicense = async function (key) {
        if (!confirm('Reactivate license ' + key + ' to Active / Approved status?')) return;
        try {
            var res = await window.sbClient.from('licenses').update({ status: 'unactivated', is_active: true }).eq('license_key', key);
            if (res.error) throw res.error;
            alert('✓ License ' + key + ' is now reactivated.');
            loadAdminData();
        } catch (err) {
            alert('Error reactivating license: ' + err.message);
        }
    };

    window.revokeLicense = async function (key) {
        if (!confirm('REVOKE license ' + key + ' immediately?\n\nThis will remotely disconnect and block After Effects on the user\'s machine.')) return;
        try {
            var res = await window.sbClient.rpc('admin_revoke_license', { p_license_key: key });
            if (res.error) {
                res = await window.sbClient.from('licenses').update({ status: 'revoked', is_active: false }).eq('license_key', key);
            }
            if (res.error) throw res.error;
            alert('License ' + key + ' successfully REVOKED.');
            loadAdminData();
        } catch (err) {
            alert('Error revoking license: ' + err.message);
        }
    };

    let currentSort = 'created-desc';

    window.setAdminSort = function (col) {
        var sortSelect = document.getElementById('admin-sort-by');
        if (col === 'key') {
            currentSort = (currentSort === 'key-asc') ? 'key-desc' : 'key-asc';
        } else if (col === 'user') {
            currentSort = (currentSort === 'user-asc') ? 'user-desc' : 'user-asc';
        } else if (col === 'hwid') {
            currentSort = (currentSort === 'hwid-bound') ? 'hwid-unbound' : 'hwid-bound';
        } else if (col === 'status') {
            currentSort = (currentSort === 'status-asc') ? 'status-desc' : 'status-asc';
        } else if (col === 'created') {
            currentSort = (currentSort === 'created-desc') ? 'created-asc' : 'created-desc';
        }
        if (sortSelect) sortSelect.value = currentSort;
        filterAdmin();
    };

    function updateSortIcons() {
        var cols = ['key', 'user', 'hwid', 'status', 'created'];
        cols.forEach(function (c) {
            var icon = document.getElementById('sort-icon-' + c);
            if (icon) {
                icon.innerText = '↕';
                icon.className = 'text-neutral-500 font-bold';
            }
        });

        var activeCol = null;
        var isAsc = false;
        if (currentSort.startsWith('key')) { activeCol = 'key'; isAsc = (currentSort === 'key-asc'); }
        else if (currentSort.startsWith('user')) { activeCol = 'user'; isAsc = (currentSort === 'user-asc'); }
        else if (currentSort.startsWith('hwid')) { activeCol = 'hwid'; isAsc = (currentSort === 'hwid-bound'); }
        else if (currentSort.startsWith('status')) { activeCol = 'status'; isAsc = (currentSort === 'status-asc'); }
        else if (currentSort.startsWith('created')) { activeCol = 'created'; isAsc = (currentSort === 'created-asc'); }

        if (activeCol) {
            var icon = document.getElementById('sort-icon-' + activeCol);
            if (icon) {
                icon.innerText = isAsc ? '↑' : '↓';
                icon.className = 'text-crimson font-bold';
            }
        }
    }

    window.filterAdmin = function () {
        var q = (document.getElementById('admin-search-input').value || '').trim().toLowerCase();
        var sf = document.getElementById('admin-status-filter').value;
        var sortSelect = document.getElementById('admin-sort-by');
        if (sortSelect) currentSort = sortSelect.value;

        updateSortIcons();

        var filtered = adminLicenses.filter(function (lic) {
            var key = (lic.license_key || '').toLowerCase();
            var mid = (lic.machine_id || '').toLowerCase();
            var email = (lic.user_email || '').toLowerCase();
            var name = (lic.user_name || '').toLowerCase();

            var matchQ = !q || 
                key.includes(q) || 
                mid.includes(q) || 
                email.includes(q) || 
                name.includes(q);

            var status = (lic.status || '').toLowerCase();
            var isRev = status === 'revoked' || lic.is_active === false;

            var matchS = (sf === 'all') || 
                         (sf === 'active' && status === 'active' && !isRev) ||
                         (sf === 'unactivated' && status === 'unactivated' && !isRev) ||
                         (sf === 'revoked' && isRev) ||
                         (sf === 'suspended' && status === 'suspended' && !isRev);

            return matchQ && matchS;
        });

        // Dynamic multi-criteria sorting
        filtered.sort(function (a, b) {
            if (currentSort === 'created-desc') {
                var da = a.created_at ? new Date(a.created_at).getTime() : 0;
                var db = b.created_at ? new Date(b.created_at).getTime() : 0;
                return db - da;
            } else if (currentSort === 'created-asc') {
                var da = a.created_at ? new Date(a.created_at).getTime() : 0;
                var db = b.created_at ? new Date(b.created_at).getTime() : 0;
                return da - db;
            } else if (currentSort === 'key-asc') {
                return (a.license_key || '').localeCompare(b.license_key || '');
            } else if (currentSort === 'key-desc') {
                return (b.license_key || '').localeCompare(a.license_key || '');
            } else if (currentSort === 'user-asc') {
                var ua = (a.user_email || a.user_name || 'zzzzzz').toLowerCase();
                var ub = (b.user_email || b.user_name || 'zzzzzz').toLowerCase();
                return ua.localeCompare(ub);
            } else if (currentSort === 'user-desc') {
                var ua = (a.user_email || a.user_name || '').toLowerCase();
                var ub = (b.user_email || b.user_name || '').toLowerCase();
                return ub.localeCompare(ua);
            } else if (currentSort === 'status-asc') {
                var rank = { 'active': 1, 'unactivated': 2, 'suspended': 3, 'revoked': 4 };
                var sa = (a.status === 'revoked' || a.is_active === false) ? 4 : (rank[a.status] || 3);
                var sb = (b.status === 'revoked' || b.is_active === false) ? 4 : (rank[b.status] || 3);
                return sa - sb;
            } else if (currentSort === 'status-desc') {
                var rank = { 'active': 1, 'unactivated': 2, 'suspended': 3, 'revoked': 4 };
                var sa = (a.status === 'revoked' || a.is_active === false) ? 4 : (rank[a.status] || 3);
                var sb = (b.status === 'revoked' || b.is_active === false) ? 4 : (rank[b.status] || 3);
                return sb - sa;
            } else if (currentSort === 'hwid-bound') {
                var ha = (a.machine_id && a.machine_id.trim().length > 0) ? 0 : 1;
                var hb = (b.machine_id && b.machine_id.trim().length > 0) ? 0 : 1;
                return ha - hb;
            } else if (currentSort === 'hwid-unbound') {
                var ha = (a.machine_id && a.machine_id.trim().length > 0) ? 1 : 0;
                var hb = (b.machine_id && b.machine_id.trim().length > 0) ? 1 : 0;
                return ha - hb;
            }
            return 0;
        });

        console.log('[Admin Filter] Matched records:', filtered.length, 'of total:', adminLicenses.length);
        renderTable(filtered);
    };

    window.generateBatchKeys = async function (count) {
        count = count || 50;
        if (!confirm('Generate ' + count + ' new enterprise ST-XXXX-XXXX-XXXX-XXXX license keys in Supabase?')) return;
        try {
            console.log('[Admin Command Center] Minting ' + count + ' licenses...');
            var res = await window.sbClient.rpc('generate_batch_licenses', { p_count: count });
            if (res.error) throw res.error;
            alert('✓ Successfully generated ' + count + ' new enterprise licenses in Supabase!');
            loadAdminData();
        } catch (err) {
            console.error('[Admin Command Center] Batch key generation error:', err);
            alert('Failed to generate keys: ' + (err.message || JSON.stringify(err)));
        }
    };

    window.unlinkLicense = async function (key) {
        if (!confirm('UNLINK license ' + key + ' from user account?\n\nThe key will become unclaimed.')) return;
        try {
            var res = await window.sbClient.rpc('admin_unlink_license', { p_license_key: key });
            if (res.error) {
                res = await window.sbClient.from('licenses').update({ user_id: null, user_name: null, user_email: null, linked_at: null }).eq('license_key', key);
            }
            if (res.error) throw res.error;
            alert('License ' + key + ' unlinked.');
            loadAdminData();
        } catch (err) {
            alert('Error unlinking license: ' + err.message);
        }
    };

    window.approveLicense = async function (key) {
        try {
            var res = await window.sbClient.from('licenses').update({ status: 'unactivated', is_active: true }).eq('license_key', key);
            if (res.error) throw res.error;
            loadAdminData();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    window.batchApprove = async function () {
        if (!confirm('APPROVE all ' + adminLicenses.length + ' license keys?')) return;
        try {
            var res = await window.sbClient.from('licenses').update({ status: 'unactivated', is_active: true }).neq('status', 'active');
            if (res.error) throw res.error;
            alert('Success! All unassigned keys are now APPROVED (READY).');
            loadAdminData();
        } catch (err) {
            alert('Batch update error: ' + err.message);
        }
    };

    window.batchSuspend = async function () {
        if (!confirm('SUSPEND all unassigned license keys?')) return;
        try {
            var res = await window.sbClient.from('licenses').update({ status: 'suspended', is_active: false }).eq('status', 'unactivated');
            if (res.error) throw res.error;
            alert('All unassigned keys are now SUSPENDED.');
            loadAdminData();
        } catch (err) {
            alert('Batch update error: ' + err.message);
        }
    };

    window.exportCSV = function () {
        if (!adminLicenses || adminLicenses.length === 0) {
            alert('No licenses to export.');
            return;
        }
        var csv = 'License Key,Status,Active,Claimed User Name,Claimed User Email,Machine ID,Created At\n';
        adminLicenses.forEach(function (lic) {
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
        a.href = url;
        a.download = 'Sumair_Tools_Master_Telemetry_' + new Date().toISOString().split('T')[0] + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    window.addEventListener('DOMContentLoaded', window.initAdminPanel);

})();
