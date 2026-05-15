const app = {
    async init() {
        try {
            console.log("ChainCacao starting...");
            await database.init();
            offline.init();
            if (window.firebaseReadyPromise) {
                try { await window.firebaseReadyPromise; } catch (e) { /* ignore */ }
            }

            if (window.auth && typeof window.auth.init === 'function') {
                window.auth.init();
            }

            // Do not auto-login from localStorage; require explicit login at startup
            if (window.urgence?.init) window.urgence.init();
            
            this.setupNavigation();
            this.setupPWAInstall();
            this.refreshIcons();
            // auth button in header
            const authBtn = document.getElementById('btn-auth');
            if (authBtn) authBtn.onclick = (e) => {
                e.stopPropagation();
                if (window.auth && typeof window.auth.showAuthScreen === 'function') window.auth.showAuthScreen('login');
                else this.showFallbackAuth();
            };
            // header logout icon: open registration form instead of immediate logout
            const headerLogout = document.getElementById('header-logout');
            if (headerLogout) headerLogout.onclick = (e) => {
                e.stopPropagation();
                if (window.auth && typeof window.auth.showAuthScreen === 'function') window.auth.showAuthScreen('register');
                else this.showFallbackAuth();
            };
            // Ensure auth screen appears if no user is logged in (deterministic after firebase ready)
            try {
                let wauth = window.auth;
                // wait shortly for auth module to appear (race with deferred scripts)
                if (!wauth && !document.getElementById('auth-screen')) {
                    const start = Date.now();
                    while (!window.auth && (Date.now() - start) < 3000) {
                        // eslint-disable-next-line no-await-in-loop
                        await new Promise(r => setTimeout(r, 100));
                    }
                    wauth = window.auth;
                    // If fallback auth screen was created, remove it so real auth can render
                    try {
                        const screen = document.getElementById('auth-screen');
                        if (wauth && typeof wauth.showAuthScreen === 'function' && screen) {
                            const text = (screen.innerText || '').toLowerCase();
                            if (text.includes('connexion (fallback)') || !text.includes('chaincacao')) {
                                screen.remove();
                                if (document.getElementById('app')) document.getElementById('app').classList.remove('blurred');
                            }
                        }
                    } catch (e) { /* ignore */ }
                }

                // If auth still missing, try to dynamically load the auth script
                if (!wauth && !document.getElementById('auth-screen')) {
                    try {
                        await new Promise((resolve, reject) => {
                            const s = document.createElement('script');
                            s.src = '/js/auth.js';
                            s.defer = true;
                            s.onload = () => resolve(true);
                            s.onerror = (e) => reject(e);
                            document.body.appendChild(s);
                            // timeout
                            setTimeout(() => resolve(false), 2500);
                        });
                        wauth = window.auth;
                    } catch (e) {
                        console.warn('Dynamic load of auth failed', e);
                    }
                }

                if ((typeof wauth === 'undefined' || !wauth || !wauth.currentUser) && !document.getElementById('auth-screen')) {
                    if (wauth && typeof wauth.showAuthScreen === 'function') {
                        wauth.showAuthScreen('login');
                    } else {
                        this.showFallbackAuth();
                    }
                }
            } catch (e) {
                console.error('Fallback auth display error', e);
            }
        } catch (error) {
            console.error("App init error:", error);
        }
    },

    initUserSession(user) {
        const display = document.getElementById('user-id-display');
        if (display) {
            const name = user.firstname && user.lastname ? `${user.firstname} ${user.lastname}` : (user.name || user.id);
            display.innerHTML = `<div style="display:flex; flex-direction:column; align-items:flex-end">
                <span style="font-weight:900; font-size:11px; white-space:nowrap">${name}</span>
                <span style="font-size:9px; opacity:0.7; font-weight:600">${user.id}</span>
            </div>`;
        }
        
        const navItems = document.querySelectorAll('.nav-item');
        let allowedScreen = '';

        if (user.role === 'AGR') allowedScreen = 'agriculteur';
        else if (user.role === 'COOP') allowedScreen = 'cooperative';
        else if (user.role === 'EXP') allowedScreen = 'exportateur';
        else if (user.role === 'VER') allowedScreen = 'verificateur';

        navItems.forEach(item => {
            const screenId = item.getAttribute('data-screen');
            if (screenId === allowedScreen) {
                item.style.display = 'flex';
                item.classList.add('active');
            } else {
                item.style.display = 'none'; // Use display none strictly
                item.classList.remove('active');
            }
        });
        
        if (allowedScreen) {
            this.switchScreen(allowedScreen);
        }
    },

    switchScreen(id) {
        const screens = document.querySelectorAll('.screen');
        const navItems = document.querySelectorAll('.nav-item');
        const targetItem = document.querySelector(`.nav-item[data-screen="${id}"]`);

        // Check if allowed
        const user = window.auth?.currentUser;
        if (user) {
            let isAllowed = false;
            if (user.role === 'AGR' && id === 'agriculteur') isAllowed = true;
            else if (user.role === 'COOP' && id === 'cooperative') isAllowed = true;
            else if (user.role === 'EXP' && id === 'exportateur') isAllowed = true;
            else if (user.role === 'VER' && id === 'verificateur') isAllowed = true;
            
            if (!isAllowed) return;
        }

        // Update Nav
        navItems.forEach(i => i.classList.remove('active'));
        if (targetItem) targetItem.classList.add('active');

        // Update Screen
        screens.forEach(s => s.classList.add('hidden'));
        const screen = document.getElementById(`screen-${id}`);
        if (screen) screen.classList.remove('hidden');

        // Render content
        this.renderScreen(id);
    },

    refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const screens = document.querySelectorAll('.screen');

        navItems.forEach(item => {
            item.onclick = () => {
                const screenId = item.getAttribute('data-screen');
                const user = window.auth?.currentUser;
                
                // Vérification de sécurité supplémentaire
                let isAllowed = false;
                if (!user) return;
                if (user.role === 'AGR' && screenId === 'agriculteur') isAllowed = true;
                else if (user.role === 'COOP' && screenId === 'cooperative') isAllowed = true;
                else if (user.role === 'EXP' && screenId === 'exportateur') isAllowed = true;
                else if (user.role === 'VER' && screenId === 'verificateur') isAllowed = true;

                if (!isAllowed) {
                    console.warn("Accès refusé à cet écran pour votre rôle.");
                    return;
                }
                
                // Update Nav
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Update Screen
                screens.forEach(s => s.classList.add('hidden'));
                document.getElementById(`screen-${screenId}`).classList.remove('hidden');

                // Render content
                this.renderScreen(screenId);
            };
        });
    },

    setupPWAInstall() {
        let deferredPrompt;
        const installBtn = document.getElementById('install-btn');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.style.display = 'block';
        });

        installBtn.onclick = async (e) => {
            e.stopPropagation();
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installBtn.style.display = 'none';
            }
            deferredPrompt = null;
        };
    },

    renderScreen(id) {
        if (id === 'agriculteur') agriculteur.renderDashboard();
        if (id === 'cooperative') cooperative.renderDashboard();
        if (id === 'exportateur') exportateur.renderDashboard();
        if (id === 'verificateur') verificateur.init();
    },

    showModal(content) {
        const modal = document.getElementById('modal-container');
        document.getElementById('modal-body').innerHTML = content;
        modal.classList.remove('hidden');
        
        document.querySelector('.close-modal').onclick = () => {
            modal.classList.add('hidden');
        };
    },

        async showFallbackAuth() {
                    if (document.getElementById('auth-screen')) return;
                    const appEl = document.getElementById('app');
                    const authContainer = document.createElement('div');
                    authContainer.id = 'auth-screen';
                    authContainer.innerHTML = `
                        <div class="auth-card">
                            <div class="auth-header">
                              <div class="logo-box">C</div>
                              <h1>ChainCacao</h1>
                              <p>Système de Traçabilité Togolais</p>
                            </div>

                            <div class="auth-tabs">
                              <button id="fb-tab-login" class="active">Connexion</button>
                              <button id="fb-tab-register">Inscription</button>
                            </div>

                            <div id="fb-auth-hint" class="auth-hint" style="margin-bottom:12px; font-weight:700; color:var(--secondary)"></div>

                            <div id="fb-login-form" class="auth-form">
                              <div class="input-group"><label>Identifiant (ex: AGR-90123456)</label><input type="text" id="fb-login-id" placeholder="VOTRE-ID"></div>
                              <div class="input-group"><label>Mot de passe</label><input type="password" id="fb-login-pass" placeholder="••••••"></div>
                              <button class="btn btn-primary" id="fb-login-btn">SE CONNECTER</button>
                            </div>

                            <div id="fb-register-form" class="auth-form hidden">
                              <div class="input-group"><label>Rôle</label>
                                <select id="fb-reg-role"><option value="AGR">Agriculteur</option><option value="COOP">Coopérative</option><option value="EXP">Exportateur</option><option value="VER">Vérificateur</option></select>
                              </div>
                              <div class="input-group"><label>Nom</label><input id="fb-reg-last"/></div>
                              <div class="input-group"><label>Prénom</label><input id="fb-reg-first"/></div>
                              <div class="input-group" id="fb-locality-group"><label>Localité</label><select id="fb-reg-locality">${utils.REGIONS.map(r => `<option value="${r}">${r}</option>`).join('')}</select></div>
                              <div class="input-group hidden" id="fb-cooperative-group"><label>Coopérative de réception</label><select id="fb-reg-cooperative"></select></div>
                              <div class="input-group"><label>Téléphone</label><input id="fb-reg-phone"/></div>
                              <div class="input-group"><label>Mot de passe</label><input type="password" id="fb-reg-pass"/></div>
                              <div class="input-group"><label>Confirmer</label><input type="password" id="fb-reg-pass-confirm"/></div>
                              <button class="btn btn-primary" id="fb-reg-btn">S'INSCRIRE</button>
                            </div>

                            <div style="display:flex; gap:8px; margin-top:10px">
                                <button id="fb-cancel-btn" class="btn">ANNULER</button>
                            </div>
                        </div>`;
                    document.body.appendChild(authContainer);
                    if (appEl) appEl.classList.add('blurred');

                    const updateRoleFields = async () => {
                        const role = document.getElementById('fb-reg-role')?.value;
                        const localityGroup = document.getElementById('fb-locality-group');
                        const coopGroup = document.getElementById('fb-cooperative-group');
                        const hint = document.getElementById('fb-auth-hint');
                        if (role === 'AGR') {
                            localityGroup.style.display = 'block';
                            coopGroup.classList.add('hidden');
                            hint.innerText = 'Agriculteur: choisissez votre localité pour être rattaché à la coopérative de votre zone.';
                        } else if (role === 'COOP') {
                            localityGroup.style.display = 'block';
                            coopGroup.classList.add('hidden');
                            hint.innerText = 'Coopérative: choisissez votre localité.';
                        } else if (role === 'EXP') {
                            localityGroup.style.display = 'none';
                            coopGroup.classList.remove('hidden');
                            hint.innerText = 'Exportateur: choisissez la coopérative de réception.';
                            const selectHost = document.getElementById('fb-cooperative-group');
                            const renderManualInput = (message) => {
                                selectHost.innerHTML = `
                                  <label>Coopérative de réception (ID)</label>
                                  <input id="fb-reg-cooperative" type="text" placeholder="COOP-001" value="" />
                                  <small style="display:block; margin-top:6px; color:var(--secondary)">${message}</small>
                                `;
                            };
                            renderManualInput('Chargement des coopératives...');
                            const select = document.getElementById('fb-reg-cooperative');
                            try {
                                const db = window.database || (typeof database !== 'undefined' ? database : null);
                                const coops = db?.getCooperatives ? await db.getCooperatives() : [];
                                if (!coops?.length) {
                                    renderManualInput('Aucune coopérative disponible pour le moment. Saisissez l’ID de la coopérative de réception.');
                                } else {
                                    selectHost.innerHTML = `
                                      <label>Coopérative de réception</label>
                                      <select id="fb-reg-cooperative">${coops.map(coop => {
                                        const label = `${coop.firstname || coop.name || coop.id}${coop.locality ? ` • ${coop.locality}` : ''}`;
                                        return `<option value="${coop.id}" data-locality="${coop.locality || ''}" data-name="${(coop.firstname || coop.name || coop.id).replace(/"/g, '&quot;')}">${label}</option>`;
                                    }).join('')}</select>
                                    `;
                                }
                            } catch (e) {
                                console.warn('Unable to load cooperatives for fallback auth', e);
                                renderManualInput('Impossible de charger les coopératives. Saisissez l’ID de la coopérative de réception.');
                            }
                        } else if (role === 'VER') {
                            localityGroup.style.display = 'none';
                            coopGroup.classList.add('hidden');
                            hint.innerText = 'Vérificateur: pas de localité requise.';
                        }
                    };

                    document.getElementById('fb-cancel-btn').onclick = () => { const el = document.getElementById('auth-screen'); if (el) el.remove(); if (appEl) appEl.classList.remove('blurred'); };

                    document.getElementById('fb-tab-login').onclick = () => { document.getElementById('fb-login-form').classList.remove('hidden'); document.getElementById('fb-register-form').classList.add('hidden'); };
                    document.getElementById('fb-tab-register').onclick = () => { document.getElementById('fb-register-form').classList.remove('hidden'); document.getElementById('fb-login-form').classList.add('hidden'); updateRoleFields(); };
                    document.getElementById('fb-reg-role').onchange = updateRoleFields;
                    updateRoleFields();

                    document.getElementById('fb-login-btn').onclick = async () => {
                        const id = (document.getElementById('fb-login-id').value || '').toUpperCase().trim();
                        const pass = document.getElementById('fb-login-pass').value || '';
                        if (!id || !pass) return alert('Remplissez les champs');
                        const email = `${id.toLowerCase()}@chaincacao.tg`;
                        try {
                            const { signInWithEmailAndPassword } = window.FirebaseSDK.auth;
                            await signInWithEmailAndPassword(window.firebaseAuth, email, pass);
                            const db = window.database || (typeof database !== 'undefined' ? database : null);
                            const user = db ? await db.getUser(id) : null;
                            if (!user) return alert('Profil introuvable');
                            localStorage.setItem('chaincacao_user', JSON.stringify(user));
                            document.getElementById('auth-screen')?.remove(); if (appEl) appEl.classList.remove('blurred');
                            app.initUserSession(user);
                        } catch (e) {
                            console.error('Login error', e);
                            alert('Identifiant ou mot de passe incorrect');
                        }
                    };

                    document.getElementById('fb-reg-btn').onclick = async () => {
                        const role = document.getElementById('fb-reg-role').value;
                        const last = document.getElementById('fb-reg-last').value.trim();
                        const first = document.getElementById('fb-reg-first').value.trim();
                        const phone = document.getElementById('fb-reg-phone').value.trim();
                        const pass = document.getElementById('fb-reg-pass').value;
                        const passConfirm = document.getElementById('fb-reg-pass-confirm').value;
                        const locality = document.getElementById('fb-reg-locality')?.value || null;
                        const coopSelect = document.getElementById('fb-reg-cooperative');
                        const selectedCoop = coopSelect?.selectedOptions?.[0];
                        if (!last || !first || !phone) return alert('Remplissez les champs');
                        if ((role === 'AGR' || role === 'COOP') && !locality) return alert('Choisissez votre localité');
                        if (role === 'EXP' && !coopSelect?.value) return alert('Choisissez la coopérative de réception');
                        if (pass.length < 6) return alert('Mot de passe trop court');
                        if (pass !== passConfirm) return alert('Les mots de passe ne correspondent pas');
                        const userId = `${role}-${phone}`;
                        const email = `${userId.toLowerCase()}@chaincacao.tg`;
                        try {
                            const { createUserWithEmailAndPassword } = window.FirebaseSDK.auth;
                            await createUserWithEmailAndPassword(window.firebaseAuth, email, pass);
                            const newUser = {
                                id: userId,
                                role,
                                lastname: last,
                                firstname: first,
                                locality: role === 'VER' ? 'Global' : (role === 'EXP' ? (selectedCoop?.dataset?.locality || null) : locality),
                                phone,
                                password: pass,
                                receivingCooperativeId: role === 'EXP' ? coopSelect.value : null,
                                   receivingCooperativeName: role === 'EXP' ? (selectedCoop?.dataset?.name || selectedCoop?.textContent || cooperativeSelect.value || null) : null,
                                createdAt: new Date().toISOString()
                            };
                            const db = window.database || (typeof database !== 'undefined' ? database : null);
                            if (!db) throw new Error('database not available');
                            await db.saveUser(newUser);
                            alert(`Inscription réussie ! Votre identifiant est : ${userId}`);
                            localStorage.setItem('chaincacao_user', JSON.stringify(newUser));
                            document.getElementById('auth-screen')?.remove(); if (appEl) appEl.classList.remove('blurred');
                            app.initUserSession(newUser);
                        } catch (e) {
                            console.error('Register error', e);
                            alert('Erreur lors de l\'inscription');
                        }
                    };
        },

    setLoaded() {
        document.body.classList.add('loaded');
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash) splash.style.display = 'none';
        }, 500);
    }
};

window.onload = () => {
    app.init().then(() => {
        app.setLoaded();
    });
};

try { window.app = app; } catch (e) { /* ignore in non-browser env */ }
