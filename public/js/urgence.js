const urgence = {
    async init() {
        const button = document.getElementById('urgency-btn');
        if (!button) return;

        button.onclick = (event) => {
            event.stopPropagation();
            this.openModal();
        };
    },

    async openModal() {
        const user = auth.currentUser || {};
        const lots = user.role === 'AGR' && user.id
            ? await database.getLotsByFarmer(user.id)
            : await database.getAllLots();

        if (!lots.length) {
            alert('Aucun lot disponible pour signaler une urgence.');
            return;
        }

        const lotOptions = lots.map(lot => `<option value="${lot.id}">${lot.id} • ${lot.status}</option>`).join('');

        // load cooperatives for possible transfer
        let coopOptions = '<option value="">-- Aucun --</option>';
        try {
            const coops = await database.getCooperatives();
            if (coops && coops.length) {
                coopOptions += coops.map(c => `<option value="${c.id}">${c.name || c.id}</option>`).join('');
            }
        } catch (e) {
            console.warn('Impossible de charger les coopératives', e);
        }

        app.showModal(`
            <div style="padding:1rem">
                <h3 style="margin-bottom:1rem; color:var(--primary)">Alerte urgence</h3>
                <p style="margin-bottom:1rem; color:var(--secondary)">Envoyer un signalement rattaché à un lot existant.</p>
                <div class="input-group">
                    <label>Lot concerné</label>
                    <select id="urgency-lot-id">${lotOptions}</select>
                </div>
                <div class="input-group">
                    <label>Niveau</label>
                    <select id="urgency-level">
                        <option value="HIGH">Haute</option>
                        <option value="MEDIUM">Moyenne</option>
                        <option value="LOW">Faible</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Transférer vers une coopérative (optionnel)</label>
                    <select id="urgency-target-coop">${coopOptions}</select>
                </div>
                <div class="input-group">
                    <label>Message</label>
                    <textarea id="urgency-message" rows="4" placeholder="Décrivez le problème"></textarea>
                </div>
                <div id="urgency-gps-box" style="margin-bottom:1rem"></div>
                <div class="action-bar">
                    <button class="btn btn-outline" id="urgency-gps-btn">Capturer GPS</button>
                    <button class="btn btn-primary" id="urgency-send-btn">Envoyer l'alerte</button>
                </div>
            </div>
        `);

        const gpsState = { value: null };

        const gpsButton = document.getElementById('urgency-gps-btn');
        if (gpsButton) {
            gpsButton.onclick = async () => {
                try {
                    const position = await window.ChainCacaoGPS.getCurrentPosition();
                    gpsState.value = position;
                    const gpsBox = document.getElementById('urgency-gps-box');
                    if (gpsBox) {
                        gpsBox.innerHTML = `<div class="gps-success">GPS capturé<br><small>${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}</small></div>`;
                    }
                } catch (error) {
                    alert(error.message || 'Impossible de capturer le GPS');
                }
            };
        }

        const sendButton = document.getElementById('urgency-send-btn');
        if (sendButton) {
            sendButton.onclick = async () => {
                const lotId = document.getElementById('urgency-lot-id').value;
                const level = document.getElementById('urgency-level').value;
                const message = document.getElementById('urgency-message').value.trim();

                if (!lotId) return alert('Sélectionnez un lot.');
                if (!message) return alert('Décrivez l’urgence.');

                const lot = await database.getLot(lotId);
                if (!lot) return alert('Lot introuvable.');
                if (user.role === 'AGR' && lot.farmerId !== user.id) {
                    return alert('Vous ne pouvez signaler que vos propres lots.');
                }

                try {
                        const targetCoopId = document.getElementById('urgency-target-coop')?.value;

                        // submit an on-chain record (if possible) for trace
                        const tx = await blockchain.submitTransaction({
                            type: targetCoopId ? 'URGENT_TRANSFER' : 'URGENT_ALERT',
                            lotId,
                            level,
                            message,
                            gps: gpsState.value,
                            targetCoopId: targetCoopId || null,
                            source: 'PWA'
                        }, user.id);

                        // if a transfer is requested, update lot coop and record transfer
                        if (targetCoopId) {
                            await database.urgentTransfer({ lotId, targetCoopId, actorId: user.id, note: message });
                        }

                        await database.addTransfer({
                            lotId,
                            actorId: user.id || 'UNKNOWN',
                            type: targetCoopId ? 'URGENT_TRANSFER' : 'URGENT_ALERT',
                            timestamp: new Date(),
                            hash: tx.hash,
                            data: {
                                level,
                                message,
                                gps: gpsState.value,
                                targetCoopId: targetCoopId || null,
                                source: 'PWA'
                            }
                        });

                        alert(targetCoopId ? 'Transfert d’urgence effectué et enregistré.' : 'Alerte envoyée et enregistrée.');
                        document.querySelector('.close-modal')?.click();
                } catch (error) {
                    alert(`Erreur lors de l'envoi: ${error.message}`);
                }
            };
        }
    }
};
