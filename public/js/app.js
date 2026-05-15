const app = {
    async init() {
        try {
            console.log("ChainCacao starting...");
            await database.init();
            offline.init();
            auth.init();
            if (window.urgence?.init) window.urgence.init();
            
            this.setupNavigation();
            this.setupPWAInstall();
            this.refreshIcons();
            // auth button in header
            const authBtn = document.getElementById('btn-auth');
            if (authBtn) authBtn.onclick = (e) => { e.stopPropagation(); auth.showAuthScreen(); };
            // header logout icon: open registration form instead of immediate logout
            const headerLogout = document.getElementById('header-logout');
            if (headerLogout) headerLogout.onclick = (e) => { e.stopPropagation(); auth.showAuthScreen('register'); };
            // Ensure auth screen appears if no user is logged in (fallback for race conditions)
            const self = this;
            setTimeout(() => {
                try {
                    const wauth = window.auth;
                    if ((typeof wauth === 'undefined' || !wauth || !wauth.currentUser) && !document.getElementById('auth-screen')) {
                        if (wauth && typeof wauth.showAuthScreen === 'function') {
                            wauth.showAuthScreen('login');
                        } else {
                            self.showFallbackAuth();
                        }
                    }
                } catch (e) {
                    console.error('Fallback auth display error', e);
                }
            }, 250);
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
        const user = auth.currentUser;
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
                const user = auth.currentUser;
                
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
                        <div class="auth-header"><h2>Connexion (fallback)</h2></div>
                        <div class="auth-form">
                            <div class="input-group"><label>Identifiant</label><input id="fb-login-id" placeholder="AGR-9001"/></div>
                            <div class="input-group"><label>Mot de passe</label><input id="fb-login-pass" type="password"/></div>
                            <div style="display:flex; gap:8px; margin-top:10px">
                                <button id="fb-login-btn" class="btn btn-primary">SE CONNECTER</button>
                                <button id="fb-cancel-btn" class="btn">ANNULER</button>
                            </div>
                        </div>
                    </div>`;
                document.body.appendChild(authContainer);
                if (appEl) appEl.classList.add('blurred');

                document.getElementById('fb-cancel-btn').onclick = () => {
                        const el = document.getElementById('auth-screen'); if (el) el.remove(); if (appEl) appEl.classList.remove('blurred');
                };

                document.getElementById('fb-login-btn').onclick = async () => {
                        const id = (document.getElementById('fb-login-id').value || '').toUpperCase().trim();
                        const pass = document.getElementById('fb-login-pass').value || '';
                        if (!id || !pass) return alert('Remplissez les champs');
                        const db = window.database || (typeof database !== 'undefined' ? database : null);
                        if (!db) return alert('Base de données non disponible');
                        try {
                                const user = await db.getUser(id);
                                if (!user) return alert('Utilisateur introuvable');
                                if (user.password !== pass) return alert('Mot de passe incorrect');
                                localStorage.setItem('chaincacao_user', JSON.stringify(user));
                                const el = document.getElementById('auth-screen'); if (el) el.remove(); if (appEl) appEl.classList.remove('blurred');
                                this.initUserSession(user);
                        } catch (e) {
                                console.error('Fallback login error', e);
                                alert('Erreur lors de la connexion');
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
