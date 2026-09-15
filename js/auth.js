/**
 * Sumair Tools — Authentication & Instant Download Delivery Engine
 * Engineered by Sumair Ali Siddiqui
 * All Rights Reserved (c) 2026
 */

(function () {
    'use strict';

    var currentUser = null;

    function showToast(message, isError) {
        var toast = document.getElementById('st-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'st-toast';
            toast.className = 'fixed bottom-6 right-6 z-[9999] px-5 py-3.5 rounded-2xl font-mono text-xs font-bold transition-all transform duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.8)] border';
            document.body.appendChild(toast);
        }

        if (isError) {
            toast.className = 'fixed bottom-6 right-6 z-[9999] px-5 py-3.5 rounded-2xl font-mono text-xs font-bold transition-all transform duration-300 shadow-[0_10px_30px_rgba(255,0,60,0.4)] border border-crimson bg-[#150508] text-white translate-y-0 opacity-100 max-w-sm';
            toast.innerHTML = '<span class="text-crimson mr-2">✕</span> ' + message;
            if (window.AudioFX && typeof AudioFX.error === 'function') AudioFX.error();
        } else {
            toast.className = 'fixed bottom-6 right-6 z-[9999] px-5 py-3.5 rounded-2xl font-mono text-xs font-bold transition-all transform duration-300 shadow-[0_10px_30px_rgba(34,197,94,0.4)] border border-emerald-500/50 bg-[#05150a] text-white translate-y-0 opacity-100 max-w-sm';
            toast.innerHTML = '<span class="text-emerald-400 mr-2">✓</span> ' + message;
            if (window.AudioFX && typeof AudioFX.success === 'function') AudioFX.success();
        }

        clearTimeout(toast._timer);
        toast._timer = setTimeout(function () {
            toast.classList.add('opacity-0', 'translate-y-4');
        }, 5000);
    }

    // --- Modal Controls ---
    window.openAuthModal = function (defaultTab) {
        // If user is already logged in, show their download vault directly!
        if (currentUser) {
            showLicenseDeliveryScreen(currentUser);
            return;
        }

        var modal = document.getElementById('st-auth-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            switchAuthTab(defaultTab || 'signin');
            if (window.AudioFX) AudioFX.click();
        }
    };

    window.closeAuthModal = function () {
        var modal = document.getElementById('st-auth-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.switchAuthTab = function (tab) {
        var tabSignIn = document.getElementById('auth-tab-signin');
        var tabSignUp = document.getElementById('auth-tab-signup');
        var tabForgot = document.getElementById('auth-tab-forgot');
        var tabDelivery = document.getElementById('auth-tab-delivery');

        var btnSignIn = document.getElementById('tab-btn-signin');
        var btnSignUp = document.getElementById('tab-btn-signup');

        if (tabSignIn) tabSignIn.classList.add('hidden');
        if (tabSignUp) tabSignUp.classList.add('hidden');
        if (tabForgot) tabForgot.classList.add('hidden');
        if (tabDelivery) tabDelivery.classList.add('hidden');

        if (btnSignIn) btnSignIn.className = 'flex-1 py-2.5 text-xs font-bold font-mono transition-all text-neutral-400 hover:text-white border-b-2 border-transparent';
        if (btnSignUp) btnSignUp.className = 'flex-1 py-2.5 text-xs font-bold font-mono transition-all text-neutral-400 hover:text-white border-b-2 border-transparent';

        if (tab === 'signin') {
            if (tabSignIn) tabSignIn.classList.remove('hidden');
            if (btnSignIn) btnSignIn.className = 'flex-1 py-2.5 text-xs font-bold font-mono transition-all text-white border-b-2 border-crimson bg-white/5';
        } else if (tab === 'signup') {
            if (tabSignUp) tabSignUp.classList.remove('hidden');
            if (btnSignUp) btnSignUp.className = 'flex-1 py-2.5 text-xs font-bold font-mono transition-all text-white border-b-2 border-crimson bg-white/5';
        } else if (tab === 'forgot') {
            if (tabForgot) tabForgot.classList.remove('hidden');
        } else if (tab === 'delivery') {
            if (tabDelivery) tabDelivery.classList.remove('hidden');
        }
    };

    // --- Show Download & Discord Key Screen ---
    function showLicenseDeliveryScreen(user) {
        var modal = document.getElementById('st-auth-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Show delivery / download tab
        switchAuthTab('delivery');

        var nameDisplay = document.getElementById('delivery-user-name');
        var emailDisplay = document.getElementById('delivery-user-email');

        if (nameDisplay) nameDisplay.innerText = (user.user_metadata && user.user_metadata.full_name) || user.email.split('@')[0];
        if (emailDisplay) emailDisplay.innerText = user.email;
    }

    // --- Centralized Download Button Click Handler ---
    window.handleDownloadClick = function (fileUrl, fileName) {
        if (!currentUser) {
            showToast('Please sign in or create an account to download.', false);
            openAuthModal('signin');
            return false;
        }

        var defaultUrl = 'SumairTools_v6.5.zxp';
        var defaultName = 'SumairTools_v6.5.zxp';
        var targetUrl = fileUrl || defaultUrl;
        var targetName = fileName || defaultName;

        var a = document.createElement('a');
        a.href = targetUrl;
        a.download = targetName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (window.AudioFX && typeof AudioFX.success === 'function') AudioFX.success();
        showToast('Download started for ' + targetName + '! Check your Downloads folder.', false);
        return true;
    };

    // --- Dynamically Update All Download Buttons on Site ---
    function updateDownloadButtonsState(user) {
        var isAuth = Boolean(user);

        // 1. Top Navbar Download Button
        var navDownloadBtn = document.getElementById('nav-download-btn');
        var navDownloadText = document.getElementById('nav-download-btn-text');
        if (navDownloadText) {
            navDownloadText.innerText = isAuth ? 'DOWNLOAD v7.0' : 'SIGN IN TO DOWNLOAD';
        }
        if (navDownloadBtn) {
            navDownloadBtn.title = isAuth ? 'Download Sumair Tools v7.0 (.zxp)' : 'Sign In to Download Sumair Tools';
        }

        // 2. Mobile Nav Download Button
        var mobileDownloadText = document.getElementById('mobile-nav-download-btn-text');
        if (mobileDownloadText) {
            mobileDownloadText.innerText = isAuth ? 'DOWNLOAD v7.0' : 'SIGN IN TO DOWNLOAD';
        }

        // 3. Hero Section CTA Button
        var heroDownloadText = document.getElementById('hero-download-btn-text');
        if (heroDownloadText) {
            heroDownloadText.innerText = isAuth ? 'DOWNLOAD v7.0 (.ZXP)' : 'SIGN IN TO DOWNLOAD';
        }

        // 4. Download Hub Section Card
        var cardZxpText = document.getElementById('card-download-zxp-text');
        if (cardZxpText) {
            cardZxpText.innerText = isAuth ? 'DOWNLOAD NOW (.ZXP)' : 'SIGN IN TO DOWNLOAD (.ZXP)';
        }

        // 5. Footer Link
        var footerDownloadText = document.getElementById('footer-download-text');
        if (footerDownloadText) {
            footerDownloadText.innerText = isAuth ? 'Download v7.0 (.ZXP)' : 'Sign In to Download';
        }
    }

    // --- Sign In Action ---
    window.handleSignIn = async function (e) {
        if (e) e.preventDefault();
        var emailInput = document.getElementById('signin-email');
        var passInput = document.getElementById('signin-password');
        var submitBtn = document.getElementById('signin-submit-btn');

        if (!emailInput || !passInput) return;
        var email = emailInput.value.trim();
        var password = passInput.value;

        if (!email || !password) {
            showToast('Please enter both email and password.', true);
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Verifying...</span>';
        }

        // 1. If Supabase configured, use live Supabase
        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                var res = await window.sbClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (res.error) {
                    if (res.error.message.toLowerCase().includes('invalid login credentials')) {
                        showToast('Account not found or password incorrect. Click CREATE ACCOUNT above to register!', true);
                    } else {
                        showToast(res.error.message, true);
                    }
                    return;
                }

                currentUser = res.data.user;
                localStorage.setItem('ST_CURRENT_USER', JSON.stringify(currentUser));
                updateNavbarState(currentUser);
                showToast('Welcome back, ' + ((currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email) + '! Starting download...', false);
                closeAuthModal();
                handleDownloadClick();
                setTimeout(function () {
                    window.location.reload();
                }, 700);
                return;
            } catch (err) {
                showToast(err.message || 'Authentication error.', true);
                return;
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>SIGN IN</span>';
                }
            }
        }

        // 2. Standalone Mode (Zero-Server instant fallback)
        setTimeout(function () {
            var localUser = {
                id: 'usr_' + Math.abs(email.split('').reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)),
                email: email,
                user_metadata: { full_name: email.split('@')[0] }
            };
            localStorage.setItem('ST_CURRENT_USER', JSON.stringify(localUser));
            currentUser = localUser;
            updateNavbarState(localUser);
            showToast('Welcome back! Starting download...', false);
            closeAuthModal();
            handleDownloadClick();
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>SIGN IN</span>';
            }
            setTimeout(function () {
                window.location.reload();
            }, 700);
        }, 300);
    };

    // --- Sign Up Action ---
    window.handleSignUp = async function (e) {
        if (e) e.preventDefault();
        var nameInput = document.getElementById('signup-name');
        var emailInput = document.getElementById('signup-email');
        var passInput = document.getElementById('signup-password');
        var submitBtn = document.getElementById('signup-submit-btn');

        if (!emailInput || !passInput) return;
        var name = nameInput ? nameInput.value.trim() : '';
        var email = emailInput.value.trim();
        var password = passInput.value;

        if (!email || !password) {
            showToast('Please enter an email and password.', true);
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters.', true);
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Creating Account...</span>';
        }

        // 1. If Supabase configured, use live Supabase
        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                var res = await window.sbClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { full_name: name || email.split('@')[0] },
                        emailRedirectTo: window.location.origin
                    }
                });

                if (res.error) {
                    showToast(res.error.message, true);
                    return;
                }

                if (res.data.user) {
                    currentUser = res.data.user;
                    localStorage.setItem('ST_CURRENT_USER', JSON.stringify(currentUser));
                    updateNavbarState(currentUser);

                    showToast('Account registered! Starting download...', false);
                    closeAuthModal();
                    handleDownloadClick();
                    setTimeout(function () {
                        window.location.reload();
                    }, 700);
                }
                return;
            } catch (err) {
                showToast(err.message || 'Sign up error.', true);
                return;
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>CREATE ACCOUNT & DOWNLOAD</span>';
                }
            }
        }

        // 2. Standalone Mode (Instant fallback)
        setTimeout(function () {
            var localUser = {
                id: 'usr_' + Math.abs(email.split('').reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)),
                email: email,
                user_metadata: { full_name: name || email.split('@')[0] }
            };
            localStorage.setItem('ST_CURRENT_USER', JSON.stringify(localUser));
            currentUser = localUser;
            updateNavbarState(localUser);
            showToast('Account registered! Starting download...', false);
            closeAuthModal();
            handleDownloadClick();
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>CREATE ACCOUNT & DOWNLOAD</span>';
            }
            setTimeout(function () {
                window.location.reload();
            }, 700);
        }, 400);
    };

    // --- Google OAuth ---
    window.handleGoogleAuth = async function () {
        var activeBtn = (typeof event !== 'undefined' && event && event.currentTarget) 
            ? event.currentTarget 
            : document.querySelector('button[onclick*="handleGoogleAuth"]');
        var originalText = activeBtn ? activeBtn.innerHTML : '';
        if (activeBtn) {
            activeBtn.disabled = true;
            activeBtn.style.opacity = '0.7';
            activeBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Connecting to Google...';
        }

        function restoreBtn() {
            if (activeBtn) {
                activeBtn.disabled = false;
                activeBtn.style.opacity = '1';
                activeBtn.innerHTML = originalText;
            }
        }

        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                var res = await window.sbClient.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin,
                        skipBrowserRedirect: true
                    }
                });

                if (res.error) {
                    restoreBtn();
                    showToast(res.error.message, true);
                    return;
                }

                if (res.data && res.data.url) {
                    // Pre-flight check: Verify Supabase has Google provider enabled
                    // to prevent users getting trapped on raw Supabase 400 error page
                    try {
                        var check = await fetch(res.data.url, {
                            headers: { 'apikey': window.ST_CONFIG.ANON_KEY }
                        });
                        if (check.status === 400) {
                            var body = await check.json();
                            if (body.msg && body.msg.indexOf('not enabled') !== -1) {
                                restoreBtn();
                                showToast('Google Sign-In is not enabled in Supabase yet. Please sign in with Email & Password below!', true);
                                var emailInput = document.getElementById('signin-email') || document.getElementById('signup-email');
                                if (emailInput) {
                                    emailInput.focus();
                                    emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                                return;
                            }
                        }
                    } catch (probeErr) {
                        // Network probe error or CORS: proceed with standard redirect
                    }

                    // Provider is enabled - redirect directly to Google OAuth
                    window.location.href = res.data.url;
                    return;
                }
            } catch (err) {
                restoreBtn();
                showToast(err.message || 'Google Auth error.', true);
                return;
            }
        } else {
            restoreBtn();
            // Standalone Google Auth Simulator
            var simEmail = prompt('Enter your Google email address to simulate OAuth sign-in:', 'sumairalisiddiqui@gmail.com');
            if (simEmail) {
                var localUser = {
                    id: 'usr_g_' + Math.abs(simEmail.split('').reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)),
                    email: simEmail,
                    user_metadata: { full_name: simEmail.split('@')[0] }
                };
                localStorage.setItem('ST_CURRENT_USER', JSON.stringify(localUser));
                currentUser = localUser;
                updateNavbarState(localUser);
                showToast('Welcome, ' + localUser.user_metadata.full_name + '!', false);
                showLicenseDeliveryScreen(localUser);
            }
        }
    };

    // --- Sign Out Action ---
    window.handleSignOut = async function () {
        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try { await window.sbClient.auth.signOut(); } catch (e) {}
        }
        localStorage.removeItem('ST_CURRENT_USER');
        currentUser = null;
        updateNavbarState(null);
        showToast('Signed out successfully.', false);
        closeAuthModal();
        if (window.closeDashboardModal) window.closeDashboardModal();
        setTimeout(function () {
            window.location.reload();
        }, 400);
    };

    // --- Update Navbar & Download Buttons State ---
    // --- Update Navbar & Download Buttons State ---
    function updateNavbarState(user) {
        currentUser = user;
        updateDownloadButtonsState(user);

        var navBtn = document.getElementById('nav-auth-btn');
        var container = document.getElementById('nav-user-container');
        var targetEl = container || navBtn;
        var mobileNavBtn = document.getElementById('mobile-nav-auth-btn');

        if (!targetEl) return;

        var isMasterAdmin = Boolean(user && user.email && user.email.trim().toLowerCase() === 'sumairalisiddiqui@gmail.com');

        if (user) {
            var displayName = (user.user_metadata && user.user_metadata.full_name) || user.email.split('@')[0];
            var initials = displayName.substring(0, 2).toUpperCase();

            targetEl.outerHTML = `
                <div id="nav-user-container" class="relative flex items-center gap-2 flex-shrink-0">
                    <div class="relative">
                        <button onclick="toggleUserDropdown(event)" class="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono font-bold text-white transition-all shadow-sm whitespace-nowrap flex-shrink-0">
                            <span class="w-5 h-5 rounded-full bg-crimson flex items-center justify-center text-[10px] text-white font-black">${initials}</span>
                            <span class="max-w-[80px] sm:max-w-[100px] truncate">${displayName}</span>
                            <svg class="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        <div id="nav-user-dropdown" class="hidden absolute right-0 mt-2 w-56 rounded-2xl glass-panel border border-crimson/40 shadow-[0_15px_40px_rgba(0,0,0,0.95)] p-2 z-[999] backdrop-blur-2xl">
                            <div class="px-3 py-2 border-b border-white/10 mb-1">
                                <div class="text-[9px] text-neutral-500 font-mono">LOGGED IN AS</div>
                                <div class="text-xs text-white font-bold truncate">${user.email}</div>
                            </div>
                            <button onclick="openAuthModal(); hideUserDropdown();" class="w-full text-left px-3 py-2 rounded-xl text-xs font-mono font-bold text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center gap-2">
                                <span>📦</span> Downloads & Setup
                            </button>
                            <button onclick="openDashboardModal(); hideUserDropdown();" class="w-full text-left px-3 py-2 rounded-xl text-xs font-mono font-bold text-neutral-200 hover:bg-white/10 transition-all flex items-center gap-2">
                                <span>⚡</span> Full Dashboard
                            </button>
                            <button onclick="handleSignOut(); hideUserDropdown();" class="w-full text-left px-3 py-2 rounded-xl text-xs font-mono font-bold text-neutral-400 hover:text-crimson hover:bg-crimson/10 transition-all flex items-center gap-2 mt-1">
                                <span>➔</span> Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            `;

            if (mobileNavBtn) {
                if (isMasterAdmin) {
                    mobileNavBtn.outerHTML = `
                        <div id="mobile-nav-user-container" class="flex flex-col gap-2">
                            <a href="admin.html" class="px-4 py-3 rounded-xl bg-crimson/30 hover:bg-crimson border border-crimson text-white flex items-center justify-between transition-all font-mono font-bold shadow-[0_0_20px_rgba(255,0,60,0.5)]">
                                <span class="flex items-center gap-2"><span>🛡️</span> Admin Command Center</span>
                                <span class="text-xs text-white">➔</span>
                            </a>
                            <a href="javascript:void(0)" id="mobile-nav-auth-btn" onclick="toggleMobileMenu(); openAuthModal();" class="px-4 py-3 rounded-xl bg-white/5 hover:bg-crimson/20 border border-white/5 hover:border-crimson/40 text-neutral-200 hover:text-white flex items-center justify-between transition-all font-mono font-bold">
                                <span>📦 Downloads (${displayName})</span>
                                <span class="text-xs text-crimson">➔</span>
                            </a>
                        </div>
                    `;
                } else {
                    mobileNavBtn.innerHTML = `<span>📦 Downloads (${displayName})</span><span class="text-xs text-crimson">➔</span>`;
                    mobileNavBtn.onclick = function () {
                        toggleMobileMenu();
                        openAuthModal();
                    };
                }
            }
        } else {
            var mobileUserContainer = document.getElementById('mobile-nav-user-container');
            if (mobileUserContainer) {
                mobileUserContainer.outerHTML = `
                    <a href="javascript:void(0)" id="mobile-nav-auth-btn" onclick="toggleMobileMenu(); openAuthModal('signin');" class="px-4 py-3 rounded-xl bg-white/5 hover:bg-crimson/20 border border-white/5 hover:border-crimson/40 text-neutral-200 hover:text-white flex items-center justify-between transition-all font-mono font-bold">
                        <span>🔑 Sign In / Register</span>
                        <span class="text-xs text-crimson">➔</span>
                    </a>
                `;
            }
            targetEl.outerHTML = `
                <button id="nav-auth-btn" onclick="openAuthModal('signin')" class="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-crimson/20 border border-white/10 hover:border-crimson text-xs font-mono font-bold text-white transition-all shadow-sm whitespace-nowrap flex-shrink-0" title="Sign In to Sumair Tools">
                    <svg class="w-3.5 h-3.5 text-crimson" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    <span>SIGN IN</span>
                </button>
            `;
        }

        if (typeof window.detectAndRevealAdmin === 'function') {
            window.detectAndRevealAdmin();
        }
    }

    window.toggleUserDropdown = function (e) {
        if (e) e.stopPropagation();
        var dd = document.getElementById('nav-user-dropdown');
        if (dd) dd.classList.toggle('hidden');
    };

    window.hideUserDropdown = function () {
        var dd = document.getElementById('nav-user-dropdown');
        if (dd) dd.classList.add('hidden');
    };

    window.addEventListener('click', function () {
        hideUserDropdown();
    });

    // --- Init Session Check ---
    document.addEventListener('DOMContentLoaded', async function () {
        // 1. Synchronous local session restore (Prevents any flash of wrong state)
        var savedLocalUser = localStorage.getItem('ST_CURRENT_USER');
        if (savedLocalUser) {
            try {
                currentUser = JSON.parse(savedLocalUser);
                updateNavbarState(currentUser);
            } catch (e) {
                updateDownloadButtonsState(null);
            }
        } else {
            updateDownloadButtonsState(null);
        }

        // 2. Supabase Live Session Check & Listener
        if (window.sbClient && window.ST_CONFIG && window.ST_CONFIG.isConfigured()) {
            try {
                var sessionRes = await window.sbClient.auth.getSession();
                if (sessionRes.data && sessionRes.data.session && sessionRes.data.session.user) {
                    currentUser = sessionRes.data.session.user;
                    localStorage.setItem('ST_CURRENT_USER', JSON.stringify(currentUser));
                    updateNavbarState(currentUser);
                }

                // Attach real-time auth change listener
                window.sbClient.auth.onAuthStateChange(function (event, session) {
                    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && session.user) {
                        currentUser = session.user;
                        localStorage.setItem('ST_CURRENT_USER', JSON.stringify(currentUser));
                        updateNavbarState(currentUser);
                    } else if (event === 'SIGNED_OUT') {
                        currentUser = null;
                        localStorage.removeItem('ST_CURRENT_USER');
                        updateNavbarState(null);
                    }
                });
            } catch (err) {
                console.warn('[ST Auth] Supabase session check notice:', err);
            }
        }
    });

    window.getCurrentUser = function () {
        return currentUser;
    };

})();
