const agriculteur = {
    async renderDashboard() {
        const user = auth.currentUser || { firstname: 'Agriculteur' };
        const lots = user.id ? await database.getLotsByFarmer(user.id) : [];
        const totalWeight = lots.reduce((acc, lot) => acc + lot.weight, 0);
        
        const container = document.getElementById('agriculteur-dashboard');
        container.innerHTML = `
            <div class="welcome-header">
                <div>
                    <small>Bienvenue au dépôt,</small>
                    <h2>Bonjour ${user.firstname}! 👋</h2>
                </div>
                <div class="location-badge">
                    <i data-lucide="map-pin"></i>
                </div>
            </div>
            
            <div class="status-horizontal-band">
                <div class="status-mini yellow">
                    <span class="val">${lots.filter(l => l.status === 'CREATED').length}</span>
                    <span class="lbl">EN ATTENTE</span>
                </div>
                <div class="status-mini green">
                    <span class="val">${lots.filter(l => l.status === 'COLLECTED' || l.status === 'EXPORTED').length}</span>
                    <span class="lbl">ACCEPTÉS</span>
                </div>
                <div class="status-mini red">
                    <span class="val">0</span>
                    <span class="lbl">REFUSÉS</span>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <span class="l">TOTAL SEMAINE</span>
                    <span class="v">${totalWeight.toFixed(1)}kg</span>
                </div>
                <div class="stat-item">
                    <span class="l">DERNIÈRE PESÉE</span>
                    <span class="v">${lots.length > 0 ? lots[lots.length - 1].weight : 0}kg</span>
                </div>
            </div>
            <button class="btn btn-primary" id="btn-new-lot">
                <i data-lucide="plus-circle" style="width:18px; height:18px"></i>
                NOUVEAU LOT
            </button>
            <h3 class="section-title">Historique des récoltes</h3>
            <div id="agri-lot-list">
                ${(lots.slice().reverse()).map(lot => `
                    <div class="card" onclick="agriculteur.showDetails('${lot.id}')">
                        <div class="card-header">
                            <strong class="lot-id">${lot.id}</strong>
                            <span class="badge ${lot.status === 'CREATED' ? 'badge-warning' : 'badge-success'}">
                                ${lot.status === 'CREATED' ? 'Nouveau' : 'Validé'}
                            </span>
                        </div>
                        <div class="card-footer">
                            <i data-lucide="calendar" style="width:12px; height:12px"></i>
                            <span>${utils.formatDate(lot.timestamp)}</span>
                            <span class="dot">•</span>
                            <i data-lucide="weight" style="width:12px; height:12px"></i>
                            <span>${lot.weight}kg</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        app.refreshIcons();
        document.getElementById('btn-new-lot').onclick = () => this.showForm();
    },

    showForm() {
        document.getElementById('agriculteur-dashboard').classList.add('hidden');
        document.getElementById('agriculteur-form-container').classList.remove('hidden');
        this.renderFormStep(1);
    },

    formState: { step: 1, data: {} },

    renderFormStep(step) {
        const container = document.getElementById('agriculteur-form-container');
        this.formState.step = step;

        let content = '';
        if (step === 1) {
            content = `
                <h3>Étape 1: Détails du lot</h3>
                <div class="input-group">
                    <label>Poids estimé (kg)</label>
                    <input type="number" id="f-weight" value="${this.formState.data.weight || ''}">
                </div>
                <div class="input-group">
                    <label>Espèce</label>
                    <select id="f-species">
                        ${utils.SPECIES.map(s => `<option ${this.formState.data.species === s ?'selected':''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="input-group">
                    <label>Région de récolte</label>
                    <select id="f-region">
                        ${utils.REGIONS.map(r => `<option ${this.formState.data.region === r ?'selected':''}>${r}</option>`).join('')}
                    </select>
                </div>
                <div class="action-bar">
                    <button class="btn btn-outline" onclick="agriculteur.cancelForm()">Annuler</button>
                    <button class="btn btn-primary" onclick="agriculteur.nextStep(2)">Suivant</button>
                </div>
            `;
        } else if (step === 2) {
            content = `
                <h3 class="step-title">Étape 2: Preuves terrain</h3>
                <div class="photo-preview" id="f-photo-preview">
                    ${this.formState.data.photo ? `<img src="${this.formState.data.photo}">` : '<span><i data-lucide="image"></i> Pas de photo</span>'}
                </div>
                <button class="btn btn-outline" style="background:rgba(212,163,115,0.1); border:1px solid var(--primary); color:var(--primary)" onclick="agriculteur.takePhoto()">
                    <i data-lucide="camera"></i> PHOTO DU SAC
                </button>
                
                <div id="mini-map" class="mini-map-container" style="display:block; min-height:280px; border-radius:20px; overflow:hidden; margin: 0.75rem 0 1rem"></div>
                <div id="f-gps-display" style="margin-top:0.5rem"></div>

                <button class="btn btn-primary" id="btn-gps-capture" onclick="agriculteur.getGps()">
                    <i data-lucide="map-pin"></i> CAPTURER GPS
                </button>
                
                <div class="action-bar">
                    <button class="btn btn-outline" onclick="agriculteur.renderFormStep(1)">Retour</button>
                    <button class="btn btn-primary" id="btn-lot-validate" onclick="agriculteur.nextStep(3)" ${this.formState.data.gps ? '' : 'disabled'}>Valider</button>
                </div>
            `;
        }
 else if (step === 3) {
            content = `
                <div class="qr-result">
                    <div class="badge badge-success">Succès ! Lot enregistré</div>
                    <h2>Lot: ${this.formState.data.id}</h2>
                    <div id="qrcode-display"></div>
                    <button class="btn btn-primary" style="margin-top:2rem" onclick="agriculteur.cancelForm()">Retour au dashboard</button>
                </div>
            `;
        }

        container.innerHTML = `<div class="form-step">${content}</div>`;
        if (step === 3) {
            qrcodeControl.generate('qrcode-display', this.formState.data.id);
        }
    },

    async nextStep(next) {
        if (this.formState.step === 1) {
            const weight = parseFloat(document.getElementById('f-weight').value);
            if (!utils.isValidWeight(weight)) return alert("Poids invalide");
            this.formState.data.weight = weight;
            this.formState.data.species = document.getElementById('f-species').value;
            this.formState.data.region = document.getElementById('f-region').value;
        }
        if (this.formState.step === 2 && next === 3) {
            if (!utils.validateGPS(this.formState.data.gps)) return alert("GPS requis");
            try {
                await this.saveLot();
            } catch (error) {
                alert(`Enregistrement impossible: ${error.message}`);
                return;
            }
        }
        this.renderFormStep(next);
    },

    async takePhoto() {
        const photo = await camera.capturePhoto();
        this.formState.data.photo = photo;
        this.renderFormStep(2);
    },

    async getGps() {
        const btn = document.getElementById('btn-gps-capture');
        const display = document.getElementById('f-gps-display');
        
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> CAPTURE EN COURS...`;
        
        try {
            const pos = await window.ChainCacaoGPS.getCurrentPosition();
            this.formState.data.gps = pos;

            const validateBtn = document.getElementById('btn-lot-validate');
            if (validateBtn) validateBtn.disabled = false;
            
            display.innerHTML = `
                <div class="gps-success">
                    POSITION CAPTURÉE<br>
                    <small>${pos.lat.toFixed(5)}°, ${pos.lng.toFixed(5)}°</small>
                </div>
            `;
            
            window.ChainCacaoGPS.displayMiniMap('mini-map', pos.lat, pos.lng);
            
        } catch (e) { 
            display.innerHTML = `<div class="gps-error">ERREUR GPS : ${e.message}</div>`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="map-pin"></i> RE-CAPTURER POSITION`;
        }
    },

    async saveLot() {
        const user = auth.currentUser || { id: 'UNK', firstname: 'Inconnu' };
        const id = utils.generateId(this.formState.data.region);
        const now = new Date();
        const lot = {
            id: id,
            farmerId: user.id,
            farmerName: `${user.firstname} ${user.lastname || ''}`.trim(),
            timestamp: now,
            weight: this.formState.data.weight,
            species: this.formState.data.species,
            region: this.formState.data.region,
            gps: this.formState.data.gps,
            photo: this.formState.data.photo || null,
            status: 'CREATED'
        };
        await database.addLot(lot);
        
        const tx = await blockchain.submitTransaction(lot, user.id);
        await database.addTransfer({
            lotId: id,
            actorId: user.id,
            type: 'CREATION',
            timestamp: now,
            hash: tx.hash,
            data: { weight: lot.weight, network: tx.network, block: tx.blockNumber }
        });

        this.formState.data.id = id;
        return id;
    },

    cancelForm() {
        this.formState = { step: 1, data: {} };
        document.getElementById('agriculteur-dashboard').classList.remove('hidden');
        document.getElementById('agriculteur-form-container').classList.add('hidden');
        this.renderDashboard();
    },

    async showDetails(id) {
        const user = auth.currentUser || {};
        const lot = await database.getLot(id);
        if (!lot) return alert('Lot introuvable');
        if (user.role === 'AGR' && lot.farmerId !== user.id) {
            return alert("Accès refusé: ce lot ne vous appartient pas.");
        }
        app.showModal(`
            <h3>Détails Lot ${lot.id}</h3>
            <p><strong>Poids:</strong> ${lot.weight}kg</p>
            <p><strong>Statut:</strong> ${lot.status}</p>
            <div id="qr-detail-box" style="text-align:center; margin:1rem"></div>
        `);
        qrcodeControl.generate('qr-detail-box', lot.id);
    }
};
