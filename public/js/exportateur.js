const exportateur = {
    async renderDashboard() {
        const lots = await database.getAllLots();
        const validatedLots = lots.filter(l => l.status === 'COLLECTED');
        const totalWeight = validatedLots.reduce((acc, l) => acc + l.weight, 0);

        const container = document.getElementById('exportateur-dashboard');
        container.innerHTML = `
            <div class="pipeline">
                <div class="pipeline-step active">Entrepôt</div>
                <div class="pipeline-step">Tri & Séchage</div>
                <div class="pipeline-step">Ensachage</div>
                <div class="pipeline-step">Chargement</div>
                <div class="pipeline-step">Douanes</div>
            </div>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="l">Lots en attente</span>
                    <span class="v">${validatedLots.length}</span>
                </div>
                <div class="stat-item">
                    <span class="l">Poids total</span>
                    <span class="v">${totalWeight.toFixed(1)}kg</span>
                </div>
            </div>

            <div class="search-box" style="margin-bottom: 2rem">
                <input type="text" id="export-search" placeholder="Vérifier ID lot (ex: AGOU-CC-XXXX)" style="flex:1">
                <button onclick="exportateur.verifyLotSearch()" class="btn-search-icon">
                    <i data-lucide="search" style="width:18px; height:18px"></i>
                </button>
                <button onclick="exportateur.startScan()">
                    <i data-lucide="camera" style="width:18px; height:18px"></i>
                </button>
            </div>

            <h3 class="section-title">Lots prêts pour l'export</h3>
            <div id="export-lot-list" style="margin-bottom: 8rem">
                ${validatedLots.map(lot => `
                    <div class="card arrival-card">
                        <input type="checkbox" class="arrival-check" data-id="${lot.id}" data-weight="${lot.weight}" onchange="exportateur.updateSummary()">
                        <div style="flex:1">
                            <div class="card-header" style="margin-bottom:0">
                                <strong class="lot-id">${lot.id}</strong>
                                <span class="badge badge-success">${lot.weight}kg</span>
                            </div>
                            <div class="card-footer" style="margin-top:4px">
                                <span>${lot.species}</span>
                                <span class="dot">•</span>
                                <span style="color:var(--success); font-weight:800; font-size:9px">EUDR CONFORME</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
                ${validatedLots.length === 0 ? '<div class="empty-state">Aucun lot en attente</div>' : ''}
            </div>
            <div id="selection-summary" class="selection-summary hidden">
                <div class="summary-info">
                    <span id="sel-count">0 LOTS</span>
                    <span class="dot">•</span>
                    <span id="sel-weight">0.0 KG</span>
                </div>
                <button class="btn btn-white" onclick="exportateur.createManifest()">TRAITEMENT EXPORT</button>
            </div>
        `;
        app.refreshIcons();
    },

    updateSummary() {
        const checks = document.querySelectorAll('.arrival-check:checked');
        const count = checks.length;
        const summary = document.getElementById('selection-summary');
        
        if (count > 0) {
            summary.classList.remove('hidden');
            document.getElementById('sel-count').innerText = `${count} LOTS SÉLECTIONNÉS`;
            
            let total = 0;
            checks.forEach(c => total += parseFloat(c.dataset.weight));
            document.getElementById('sel-weight').innerText = `${total.toFixed(1)} KG`;
        } else {
            summary.classList.add('hidden');
        }
    },

    async verifyLotSearch() {
        const id = document.getElementById('export-search').value.trim().toUpperCase();
        if (!id) return;
        
        const lot = await database.getLot(id);
        if (lot) {
            this.showLotVerification(lot);
        } else {
            alert("Lot introuvable dans le système.");
        }
    },

    async showLotVerification(lot) {
        let statusText = "INCONNU";
        let statusClass = "";
        
        switch(lot.status) {
            case 'CREATED': statusText = "Producteur (En attente coop)"; break;
            case 'COLLECTED': statusText = "Collecté (Prêt pour export)"; statusClass = "badge-success"; break;
            case 'EXPORTED': statusText = "Déjà exporté"; statusClass = "badge-info"; break;
        }

        app.showModal(`
            <div style="padding:1rem">
                <h3 style="color:var(--primary); margin-bottom:1.5rem">Vérification de Lot</h3>
                <div class="card" style="background:var(--card-bg)">
                    <div style="margin-bottom:1rem">
                        <label style="font-size:0.7rem; text-transform:uppercase; color:var(--secondary)">ID LOT</label>
                        <div style="font-weight:800; font-size:1.2rem">${lot.id}</div>
                    </div>
                    <div style="margin-bottom:1rem">
                        <label style="font-size:0.7rem; text-transform:uppercase; color:var(--secondary)">Status Actuel</label>
                        <div><span class="badge ${statusClass}">${statusText}</span></div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:1rem">
                        <div>
                            <label style="font-size:0.7rem; text-transform:uppercase; color:var(--secondary)">Poids</label>
                            <div style="font-weight:700">${lot.weight} kg</div>
                        </div>
                        <div>
                            <label style="font-size:0.7rem; text-transform:uppercase; color:var(--secondary)">Humidité</label>
                            <div style="font-weight:700">${lot.quality?.moisture || 'N/A'}%</div>
                        </div>
                    </div>
                    <div>
                        <label style="font-size:0.7rem; text-transform:uppercase; color:var(--secondary)">Origine GPS</label>
                        <div style="font-size:0.9rem">${lot.gps.lat.toFixed(4)}, ${lot.gps.lng.toFixed(4)}</div>
                    </div>
                </div>
                ${lot.status === 'COLLECTED' ? `
                    <button class="btn btn-primary" style="width:100%; margin-top:1.5rem" onclick="exportateur.selectLotForExport('${lot.id}')">SÉLECTIONNER POUR EXPORT</button>
                ` : ''}
            </div>
        `);
        app.refreshIcons();
    },

    selectLotForExport(lotId) {
        document.querySelector('.close-modal').click();
        // Coche la case correspondante si elle est visible
        const check = document.querySelector(`.arrival-check[data-id="${lotId}"]`);
        if (check) {
            check.checked = true;
            this.updateSummary();
        } else {
            alert("Lot sélectionné, mais non visible dans la liste d'attente (vérifiez le status).");
        }
    },

    filterLots(query) {
        const q = query.toLowerCase();
        const cards = document.querySelectorAll('.arrival-card');
        cards.forEach(card => {
            const id = card.querySelector('strong').innerText.toLowerCase();
            if (id.includes(q)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    },

    async startScan() {
        const code = await camera.scanQR();
        if (code) {
            document.getElementById('export-search').value = code;
            this.filterLots(code);
        }
    },

    async createManifest() {
        const checks = document.querySelectorAll('.arrival-check:checked');
        const ids = Array.from(checks).map(c => c.getAttribute('data-id'));
        
        if (confirm(`Traiter l'export pour ${ids.length} sacs ?`)) {
            const containerId = prompt("Numéro de Container (ex: MSCU-123456) :") || "CONT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            
            app.showModal(`
                <div style="text-align:center; padding:1rem">
                    <h3 style="color:var(--primary); margin-bottom:1.5rem">PROCÉDURE D'EXPORTATION</h3>
                    <div id="export-steps-list" style="text-align:left; max-width:300px; margin:0 auto">
                        <div class="proc-step" id="proc-1"><i data-lucide="check-circle" class="pending"></i> Contrôle Phytosanitaire (Lomé)</div>
                        <div class="proc-step" id="proc-2"><i data-lucide="circle" class="pending"></i> Scellage Container ${containerId}</div>
                        <div class="proc-step" id="proc-3"><i data-lucide="circle" class="pending"></i> Validation Douanes Togolaises</div>
                        <div class="proc-step" id="proc-4"><i data-lucide="circle" class="pending"></i> Chargement Port Autonome de Lomé</div>
                    </div>
                    <div id="proc-status" style="margin-top:2rem; font-weight:700; color:var(--secondary)">Initialisation...</div>
                </div>
            `);
            app.refreshIcons();

            await new Promise(r => setTimeout(r, 1000));
            document.getElementById('proc-1').querySelector('i').className = 'done';
            document.getElementById('proc-status').innerText = "Validation Qualité...";
            
            await new Promise(r => setTimeout(r, 1000));
            document.getElementById('proc-2').querySelector('i').setAttribute('data-lucide', 'check-circle');
            document.getElementById('proc-2').querySelector('i').className = 'done';
            document.getElementById('proc-status').innerText = "Scellage en cours...";
            app.refreshIcons();
 
            await new Promise(r => setTimeout(r, 1000));
            document.getElementById('proc-3').querySelector('i').setAttribute('data-lucide', 'check-circle');
            document.getElementById('proc-3').querySelector('i').className = 'done';
            document.getElementById('proc-status').innerText = "Vérification Douanes...";
            app.refreshIcons();
 
            for (const id of ids) {
                const user = auth.currentUser || { id: 'EXP-001' };
                const lot = await database.getLot(id);
                lot.status = 'EXPORTED';
                lot.containerId = containerId;
                await database.updateLot(lot);
                
                const tx = await blockchain.submitTransaction({ action: 'EXPORT_COMPLETE', containerId }, user.id);
                await database.addTransfer({
                    lotId: id,
                    actorId: user.id,
                    type: 'EXPORT_COMPLETED',
                    timestamp: new Date(),
                    hash: tx.hash,
                    data: { 
                        containerId: containerId,
                        port: 'Lomé, Togo',
                        compliance: 'EUDR_CERTIFIED_TOGO_CACAO',
                        customsRef: 'TG-LFW-2026-' + Math.floor(Math.random()*100000)
                    }
                });
            }
 
            await new Promise(r => setTimeout(r, 1000));
            document.getElementById('proc-4').querySelector('i').setAttribute('data-lucide', 'check-circle');
            document.getElementById('proc-4').querySelector('i').className = 'done';
            document.getElementById('proc-status').innerText = "Finalisation...";
            app.refreshIcons();

            setTimeout(() => {
                alert(`Exportation validée !\nLes lots ont été scellés dans le container ${containerId} et enregistrés sur la blockchain Polygon.`);
                document.querySelector('.close-modal').click();
                this.renderDashboard();
            }, 1000);
        }
    }
};
