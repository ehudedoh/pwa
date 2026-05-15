// Authentication UI and flows (Firebase Email/Password)

// helper: wait for window.database to appear
async function waitForDatabase(timeoutMs = 2000) {
  if (window.database) return window.database;
  if (typeof database !== 'undefined') return database;
  const start = Date.now();
  return new Promise((resolve) => {
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

const auth = {
  currentUser: null,
  cooperativeCache: [],

  async init() {
    const db = await waitForDatabase(3000);
    const savedUser = JSON.parse(localStorage.getItem('chaincacao_user'));
    if (savedUser) {
      const profile = db ? await db.getUser(savedUser.id) : null;
      if (profile) {
        this.handleSuccess(profile);
      } else {
        this.showAuthScreen('login');
      }
    } else {
      this.showAuthScreen('login');
    }
  },

  showAuthScreen(tab = 'login') {
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

        <div id="auth-hint" class="auth-hint" style="margin-bottom:12px; font-weight:700; color:var(--secondary)"></div>

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

          <div class="input-group hidden" id="cooperative-group">
            <label>Coopérative de réception</label>
            <select id="reg-cooperative"></select>
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
    if (appEl) appEl.classList.add('blurred');

    // Ensure requested tab is selected
    setTimeout(() => this.switchTab(tab), 50);
    setTimeout(() => this.updateRoleFields(), 60);
  },

  switchTab(tab) {
    const tlogin = document.getElementById('tab-login');
    const treg = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    if (tlogin && treg && loginForm && regForm) {
      tlogin.classList.toggle('active', tab === 'login');
      treg.classList.toggle('active', tab === 'register');
      loginForm.classList.toggle('hidden', tab !== 'login');
      regForm.classList.toggle('hidden', tab !== 'register');
    }
  },

  toggleVerifierFields() {
    this.updateRoleFields();
  },

  async updateRoleFields() {
    const role = document.getElementById('reg-role')?.value;
    const locGroup = document.getElementById('locality-group');
    const coopGroup = document.getElementById('cooperative-group');
    const phoneLabel = document.getElementById('label-phone');
    const hint = document.getElementById('auth-hint');
    if (!role) return;

    if (role === 'AGR') {
      if (locGroup) locGroup.style.display = 'block';
      if (coopGroup) coopGroup.classList.add('hidden');
      if (phoneLabel) phoneLabel.innerText = 'Mobile (+228)';
      if (hint) hint.innerText = 'Agriculteur: choisissez votre localité pour être rattaché à la coopérative de votre zone.';
    } else if (role === 'COOP') {
      if (locGroup) locGroup.style.display = 'block';
      if (coopGroup) coopGroup.classList.add('hidden');
      if (phoneLabel) phoneLabel.innerText = 'Mobile (+228)';
      if (hint) hint.innerText = 'Coopérative: choisissez votre localité, vos lots seront reçus dans cette zone.';
    } else if (role === 'EXP') {
      if (locGroup) locGroup.style.display = 'none';
      if (coopGroup) coopGroup.classList.remove('hidden');
      if (phoneLabel) phoneLabel.innerText = 'Mobile (+228)';
      if (hint) hint.innerText = 'Exportateur: choisissez la coopérative depuis laquelle vous recevez les lots.';
      await this.loadCooperativeOptions();
    } else if (role === 'VER') {
      if (locGroup) locGroup.style.display = 'none';
      if (coopGroup) coopGroup.classList.add('hidden');
      if (phoneLabel) phoneLabel.innerText = 'Téléphone Professionnel';
      if (hint) hint.innerText = 'Vérificateur: pas de localité requise.';
    }
  },

  async loadCooperativeOptions() {
    const select = document.getElementById('reg-cooperative');
    if (!select) return;
    select.innerHTML = '<option value="">Chargement...</option>';
    try {
      const db = await waitForDatabase(3000);
      const coops = db?.getCooperatives ? await db.getCooperatives() : [];
      this.cooperativeCache = Array.isArray(coops) ? coops : [];
      if (!this.cooperativeCache.length) {
        select.outerHTML = `
          <input type="text" id="reg-cooperative" placeholder="COOP-001" />
        `;
        return;
      }
      select.innerHTML = this.cooperativeCache.map(coop => {
        const label = `${coop.firstname || coop.name || coop.id}${coop.locality ? ` • ${coop.locality}` : ''}`;
        return `<option value="${coop.id}" data-locality="${coop.locality || ''}" data-name="${(coop.firstname || coop.name || coop.id).replace(/"/g, '&quot;')}">${label}</option>`;
      }).join('');
    } catch (e) {
      console.warn('Unable to load cooperatives', e);
      select.outerHTML = `<input type="text" id="reg-cooperative" placeholder="COOP-001" />`;
    }
  },

  async login() {
    const id = document.getElementById('login-id').value.toUpperCase().trim();
    const pass = document.getElementById('login-pass').value;
    if (!id || !pass) return alert('Veuillez remplir tous les champs');
    const { signInWithEmailAndPassword } = window.FirebaseSDK.auth;
    const email = `${id.toLowerCase()}@chaincacao.tg`;
    try {
      await signInWithEmailAndPassword(window.firebaseAuth, email, pass);
      const db = window.database || (typeof database !== 'undefined' ? database : null);
      const user = db ? await db.getUser(id) : null;
      if (user) {
        this.handleSuccess(user);
      } else {
        alert('Erreur: Profil introuvable mais authentification réussie.');
      }
    } catch (e) {
      console.error('Login Error', e);
      if (e.code === 'auth/operation-not-allowed') {
        alert("ERREUR CONFIGURATION : Vous devez activer la méthode 'E-mail/Mot de passe' dans votre console Firebase (Onglet Authentication > Sign-in method).");
      } else {
        alert('Identifiant ou mot de passe incorrect');
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
    const cooperativeSelect = document.getElementById('reg-cooperative');
    const selectedCoop = cooperativeSelect?.selectedOptions?.[0];
    if (!last || !first || !phone) return alert('Veuillez remplir tous les champs obligatoires');
    if (phone.length < 8) return alert('Numéro de téléphone invalide');
    if (pass.length < 6) return alert('Le mot de passe doit faire au moins 6 caractères');
    if (pass !== passConfirm) return alert('Les mots de passe ne correspondent pas');

    if ((role === 'AGR' || role === 'COOP') && !document.getElementById('reg-locality').value) {
      return alert('Veuillez choisir votre localité');
    }
    if (role === 'EXP' && !cooperativeSelect?.value) {
      return alert('Veuillez choisir la coopérative de réception');
    }

    const userId = `${role}-${phone}`;
    const email = `${userId.toLowerCase()}@chaincacao.tg`;
    const { createUserWithEmailAndPassword } = window.FirebaseSDK.auth;
    try {
      await createUserWithEmailAndPassword(window.firebaseAuth, email, pass);
      const locality = role === 'VER' ? 'Global' : (document.getElementById('reg-locality').value || null);
      const newUser = {
        id: userId,
        role,
        lastname: last,
        firstname: first,
        locality: role === 'EXP' ? (selectedCoop?.dataset?.locality || null) : locality,
        age,
        phone,
        password: pass,
        receivingCooperativeId: role === 'EXP' ? cooperativeSelect.value : null,
        receivingCooperativeName: role === 'EXP' ? (selectedCoop?.dataset?.name || selectedCoop?.textContent || cooperativeSelect.value || null) : null,
        createdAt: new Date().toISOString()
      };
      const db = window.database || (typeof database !== 'undefined' ? database : null);
      if (!db) throw new Error('database not available');
      await db.saveUser(newUser);
      alert(`Inscription réussie ! Votre identifiant est : ${userId}`);
      this.handleSuccess(newUser);
    } catch (e) {
      console.error('Register Error', e);
      if (e.code === 'auth/operation-not-allowed') {
        alert("ERREUR CONFIGURATION : Vous devez activer la méthode 'E-mail/Mot de passe' dans votre console Firebase (Onglet Authentication > Sign-in method).");
      } else {
        alert('Erreur lors de l'inscription : ' + (e.message || e));
      }
    }
  },

  handleSuccess(user) {
    this.currentUser = user;
    localStorage.setItem('chaincacao_user', JSON.stringify(user));
    const screen = document.getElementById('auth-screen');
    if (screen) screen.remove();
    const appEl = document.getElementById('app');
    if (appEl) appEl.classList.remove('blurred');
    const display = document.getElementById('user-id-display');
    if (display) display.innerText = `${user.firstname} (${user.id})`;
    app.initUserSession(user);
  },

  async logout() {
    localStorage.removeItem('chaincacao_user');
    location.reload();
  }
};

// Expose for inline handlers
try { window.auth = auth; } catch (e) {}

// Export not used in browser script tags

