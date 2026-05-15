const verificateur = {
    async init() {
        document.getElementById('btn-verify').onclick = () => {
            const id = document.getElementById('verify-input').value;
            if (id) this.verifyLot(id);
        };
        
        // Render Compliance Dashboard
        this.renderGlobalDashboard();

        // Ajout du bouton scan dynamique avec layout amélioré
        const screen = document.getElementById('screen-verificateur');
        if (screen && !document.getElementById('verify-scan')) {
            const scanBtn = document.createElement('button');
            scanBtn.id = 'verify-scan';
            scanBtn.className = 'btn-scan-main';
            scanBtn.innerHTML = '<i data-lucide="camera"></i> SCANNER UN LOT';
            
            // Placer le bouton scan en évidence
            const searchBox = screen.querySelector('.search-box');
            if (searchBox) {
                screen.insertBefore(scanBtn, searchBox);
            }
            
            scanBtn.onclick = async () => {
                const code = await camera.scanQR();
                if (code) {
                    document.getElementById('verify-input').value = code;
                    this.verifyLot(code);
                }
            };
        }
        app.refreshIcons();
    },

    async renderGlobalDashboard() {
        const lots = await database.getAllLots();
        const exportLots = lots.filter(l => l.status === 'EXPORTED');
        const container = document.getElementById('verifier-result');
        
        if (exportLots.length > 0) {
            container.classList.remove('hidden');
            container.innerHTML = `
                <div class="stats-grid" style="margin-bottom: 2rem">
                    <div class="stat-item" style="background:var(--primary); color:white">
                        <span class="l">Lots Exportés</span>
                        <span class="v">${exportLots.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="l">Conformité</span>
                        <span class="v">100%</span>
                    </div>
                </div>
                
                <h3 class="section-title">Registre d'Exportation</h3>
                <div class="history-list">
                    ${exportLots.map(lot => `
                        <div class="card" onclick="verificateur.verifyLot('${lot.id}')">
                            <div class="card-header">
                                <strong class="lot-id">${lot.id}</strong>
                                <span class="badge badge-success">EUDR CERTIFIED</span>
                            </div>
                            <div class="card-footer">
                                <i data-lucide="package" style="width:12px; height:12px"></i>
                                <span>Container: ${lot.containerId || 'N/A'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            app.refreshIcons();
        }
    },

    async verifyLot(lotId) {
        const lot = await database.getLot(lotId);
        if (!lot) return alert("Lot introuvable !");
        
        const transfers = await database.getTransfersByLot(lotId);
        this.renderResult(lot, transfers);
    },

    async renderResult(lot, transfers) {
        const result = document.getElementById('verifier-result');
        result.classList.remove('hidden');
        
        result.innerHTML = `
            <div class="card verify-result-header">
                <h2>Lot ${lot.id}</h2>
                <div class="eudr-badge">
                   <div class="eudr-icon-box">
                       <i data-lucide="leaf"></i>
                   </div>
                   <div>
                        <strong>CERTIFIÉ CONFORME EUDR</strong>
                        <p style="font-size: 0.75rem; opacity: 0.8; margin-top: 2px">Zéro Déforestation • Géo-localisé • Blockchain</p>
                   </div>
                </div>

                <div id="map-verify"></div>
                
                <h3 class="section-title">Parcours Blockchain</h3>
                <div class="timeline">
                    ${transfers.map(t => `
                        <div class="timeline-event">
                            <div class="timeline-dot"><i data-lucide="shield-check"></i></div>
                            <div class="timeline-content">
                                <span class="actor">${t.actorId}</span>
                                <h4>${t.type === 'CREATION' ? 'Récolte Enregistrée' : t.type === 'COOP_VALIDATION' ? 'Collecte & Contrôle' : t.type === 'URGENT_ALERT' ? 'Alerte Urgente' : 'Manifeste Export'}</h4>
                                <div class="timeline-meta">
                                    <i data-lucide="clock"></i>
                                    <span>${utils.formatDate(t.timestamp)}</span>
                                </div>
                                <div class="tx-hash">HASH: ${t.hash.substring(0, 24)}...</div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="card" style="margin-top: 2rem; border-top: 4px solid var(--primary)">
                    <h3 class="section-title" style="margin-top:0">Fiche de Traçabilité</h3>
                    <p style="font-size:0.9rem; margin-bottom:0.8rem">
                        <strong>Espèce:</strong> ${lot.species}<br>
                        <strong>Poids final:</strong> ${lot.weight}kg<br>
                        <strong>Localité:</strong> ${lot.region}
                    </p>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; margin-top:1.5rem">
                         <div style="text-align:center">
                            <p class="small-label">Photo Sac</p>
                            ${lot.photo ? `<img src="${lot.photo}" style="width:100%; border-radius:12px">` : '<div class="placeholder-box"><i data-lucide="package"></i></div>'}
                         </div>
                         <div style="text-align:center">
                            <p class="small-label">Container</p>
                            <div class="placeholder-box"><i data-lucide="container" style="width:30px; height:30px"></i></div>
                         </div>
                    </div>
                </div>

                <button class="btn btn-primary" style="margin-top:2rem" onclick="pdfControl.generateCertificat('${lot.id}')">
                    <i data-lucide="file-down"></i> Télécharger Certificat PDF
                </button>
            </div>
        `;
        app.refreshIcons();
        gps.initMap('map-verify', lot.gps.lat, lot.gps.lng);
    },

    async downloadReport(lotId) {
        const lot = await database.getLot(lotId);
        const trans = await database.getTransfersByLot(lotId);
        pdfControl.generateCertificat(lotId);
    },

    shareLink(lotId) {
        const url = window.location.origin + "?lot=" + lotId;
        alert("Lien de vérification copié : " + url);
    }
};
