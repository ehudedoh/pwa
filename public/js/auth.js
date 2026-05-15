const auth = {
    currentUser: null,

    async init() {
        // Wait for Firebase SDK / database visibility if necessary
        const db = await waitForDatabase(3000);
        const savedUser = JSON.parse(localStorage.getItem('chaincacao_user'));
        if (savedUser) {
            const profile = db ? await db.getUser(savedUser.id) : null;
            if (profile) {
                this.handleSuccess(profile);
            } else {
                this.showAuthScreen();
            }
        } else {
            this.showAuthScreen();
        }
    },

};

// helper: wait for window.database to appear
async function waitForDatabase(timeoutMs = 2000) {
    if (window.database) return window.database;
    if (typeof database !== 'undefined') return database;
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const iv = setInterval(() => {
            if (window.database) {
                clearInterval(iv);
                return resolve(window.database);
            }
            if (typeof database !== 'undefined') {
                clearInterval(iv);
                return resolve(database);
            }
            if (Date.now() - start > timeoutMs) {
                clearInterval(iv);
                return resolve(null);
            }
        }, 100);
    });
}

// restore export of auth
try { window.auth = auth; } catch (e) {}

// keep API shape for older callers
export default auth;

    showAuthScreen() {
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
                    <button id="tab-login" class="active" onclick="auth.switchTab('login')">Connexion</button>
                    <button id="tab-register" onclick="auth.switchTab('register')">Inscription</button>
                </div>

                <div id="login-form" class="auth-form">
                    <div class="input-group">
                        <label>Identifiant (ex: AGR-90123456)</label>
                        <input type="text" id="login-id" placeholder="VOTRE-ID">
                    </div>
                    <div class="input-group">
                        <label>Mot de passe</label>
                        <input type="password" id="login-pass" placeholder="••••••••">
                    </div>
                    <button class="btn btn-primary" onclick="auth.login()">SE CONNECTER</button>
                </div>

                <div id="register-form" class="auth-form hidden">
                    <div class="input-group">
                        <label>Je suis un :</label>
                        <select id="reg-role" onchange="auth.toggleVerifierFields()">
                            <option value="AGR">Agriculteur</option>
                            <option value="COOP">Coopérative</option>
                            <option value="EXP">Exportateur</option>
                            <option value="VER">Vérificateur (Douane/EUDR)</option>
                        </select>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
                        <div class="input-group">
                            <label>Nom</label>
                            <input type="text" id="reg-lastname" placeholder="Nom">
                        </div>
                        <div class="input-group">
                            <label>Prénom</label>
                            <input type="text" id="reg-firstname" placeholder="Prénom">
                        </div>
                    </div>
                    <div class="input-group" id="locality-group">
                        <label>Localité</label>
                        <select id="reg-locality">
                            ${utils.REGIONS.map(r => `<option value="${r}">${r}</option>`).join('')}
                        </select>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
                        <div class="input-group">
                            <label>Âge</label>
                            <input type="number" id="reg-age" placeholder="Ex: 35">
                        </div>
                        <div class="input-group">
                            <label id="label-phone">Mobile (+228)</label>
                            <input type="tel" id="reg-phone" placeholder="90123456">
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Mot de passe (min 6 car.)</label>
                        <input type="password" id="reg-pass" placeholder="••••••••">
                    </div>
                    <div class="input-group">
                        <label>Confirmer</label>
                        <input type="password" id="reg-pass-confirm" placeholder="••••••••">
                    </div>
                    <button class="btn btn-primary" onclick="auth.register()" style="margin-top:10px">S'INSCRIRE</button>
                </div>
            </div>
        `;
        document.body.appendChild(authContainer);
        appEl.classList.add('blurred');
    },

    switchTab(tab) {
        document.getElementById('tab-login').classList.toggle('active', tab === 'login');
        document.getElementById('tab-register').classList.toggle('active', tab === 'register');
        document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
        document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
    },

    toggleVerifierFields() {
        const role = document.getElementById('reg-role').value;
        const locGroup = document.getElementById('locality-group');
        const phoneLabel = document.getElementById('label-phone');
        
        if (role === 'VER') {
            locGroup.style.display = 'none';
            phoneLabel.innerText = "Téléphone Professionnel";
        } else {
            locGroup.style.display = 'block';
            phoneLabel.innerText = "Mobile (+228)";
        }
    },

    async login() {
        const id = document.getElementById('login-id').value.toUpperCase().trim();
        const pass = document.getElementById('login-pass').value;

        if (!id || !pass) return alert("Veuillez remplir tous les champs");

        const { signInWithEmailAndPassword } = window.FirebaseSDK.auth;
        const email = `${id.toLowerCase()}@chaincacao.tg`;

        try {
            await signInWithEmailAndPassword(window.firebaseAuth, email, pass);
            const db = window.database || (typeof database !== 'undefined' ? database : null);
            const user = db ? await db.getUser(id) : null;
            if (user) {
                this.handleSuccess(user);
            } else {
                alert("Erreur: Profil introuvable mais authentification réussie.");
            }
        } catch (e) {
            console.error("Login Error", e);
            if (e.code === 'auth/operation-not-allowed') {
                alert("ERREUR CONFIGURATION : Vous devez activer la méthode 'E-mail/Mot de passe' dans votre console Firebase (Onglet Authentication > Sign-in method).");
            } else {
                alert("Identifiant ou mot de passe incorrect");
            }
        }
    },

    async register() {
        const role = document.getElementById('reg-role').value;
        const last = document.getElementById('reg-lastname').value.trim();
        const first = document.getElementById('reg-firstname').value.trim();
        const loc = role === 'VER' ? 'Global' : document.getElementById('reg-locality').value;
        const age = document.getElementById('reg-age').value;
        const phone = document.getElementById('reg-phone').value.trim();
        const pass = document.getElementById('reg-pass').value;
        const passConfirm = document.getElementById('reg-pass-confirm').value;

        if (!last || !first || !phone) return alert("Veuillez remplir tous les champs obligatoires");
        if (phone.length < 8) return alert("Numéro de téléphone invalide");
        if (pass.length < 6) return alert("Le mot de passe doit faire au moins 6 caractères");
        if (pass !== passConfirm) return alert("Les mots de passe ne correspondent pas");

        const userId = `${role}-${phone}`;
        const email = `${userId.toLowerCase()}@chaincacao.tg`;

        const { createUserWithEmailAndPassword } = window.FirebaseSDK.auth;

        try {
            // Créer l'utilisateur dans Firebase Auth
            await createUserWithEmailAndPassword(window.firebaseAuth, email, pass);
            
            // Créer le profil dans Firestore
            const newUser = {
                id: userId,
                role,
                lastname: last,
                firstname: first,
                locality: loc,
                age,
                phone,
                password: pass, // Gardé pour compatibilité demo
                createdAt: new Date().toISOString()
            };

            const db = window.database || (typeof database !== 'undefined' ? database : null);
            if (!db) throw new Error('database not available');
            await db.saveUser(newUser);
            alert(`Inscription réussie ! Votre identifiant est : ${userId}`);
            this.handleSuccess(newUser);
        } catch (e) {
            console.error("Register Error", e);
            if (e.code === 'auth/operation-not-allowed') {
                alert("ERREUR CONFIGURATION : Vous devez activer la méthode 'E-mail/Mot de passe' dans votre console Firebase (Onglet Authentication > Sign-in method).");
            } else {
                alert("Erreur lors de l'inscription : " + (e.message || e));
            }
        }
    },

    handleSuccess(user) {
        this.currentUser = user;
        localStorage.setItem('chaincacao_user', JSON.stringify(user));
        const screen = document.getElementById('auth-screen');
        if (screen) screen.remove();
        document.getElementById('app').classList.remove('blurred');
        
        const display = document.getElementById('user-id-display');
        if (display) display.innerText = `${user.firstname} (${user.id})`;
        
        app.initUserSession(user);
    },

    async logout() {
        localStorage.removeItem('chaincacao_user');
        location.reload();
    }
};

// Expose for inline onclick handlers and other modules
try { window.auth = auth; } catch (e) { /* ignore in non-browser env */ }
