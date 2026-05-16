/**
 * ChainCacao - Module GPS & Cartographie (VERSION MVP STABLE)
 * Compatible HTTP local + HTTPS production
 */

const gps = {
    currentMap: null,

    /**
     * Obtenir la position GPS actuelle
     */
    async getCurrentPosition() {

        console.log("📍 Tentative de capture GPS...");

        return new Promise((resolve, reject) => {

            // Vérification support navigateur
            if (!navigator.geolocation) {
                alert("La géolocalisation n'est pas supportée sur cet appareil.");
                return reject(new Error("GPS non supporté"));
            }

            // Avertissement HTTP
            const isLocal =
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.startsWith('192.168.') ||
                window.location.hostname.startsWith('10.') ||
                window.location.hostname.startsWith('172.');

            if (window.location.protocol !== 'https:' && !isLocal) {
                console.warn("⚠️ Site non sécurisé (HTTP). Le GPS peut être bloqué.");
            }

            // OPTIONS GPS
            const options = {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(

                // SUCCESS
                (pos) => {

                    console.log("✅ GPS OK :", pos);

                    const data = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy
                    };

                    resolve(data);
                },

                // ERROR
                (err) => {

                    console.error("❌ ERREUR GPS COMPLETE :", err);

                    let msg = "Erreur GPS : ";

                    switch (err.code) {

                        case 1:
                            msg += "Permission refusée par le téléphone.";
                            break;

                        case 2:
                            msg += "Position indisponible.";
                            break;

                        case 3:
                            msg += "Temps dépassé. Réessayez.";
                            break;

                        default:
                            msg += err.message || "Erreur inconnue.";
                    }

                    // ===== MODE DEV TEMPORAIRE =====
                    // Permet de continuer même si GPS bloque
                    const useFakeGps = confirm(
                        msg +
                        "\n\n⚠️ Utiliser une position GPS de démonstration pour continuer ?"
                    );

                    if (useFakeGps) {

                        console.warn("⚠️ MODE GPS DEMO ACTIVÉ");

                        resolve({
                            lat: 8.6195,
                            lng: 0.8248,
                            accuracy: 999
                        });

                    } else {

                        reject(new Error(msg));

                    }
                },

                options
            );
        });
    },

    /**
     * Initialiser une grande carte
     */
    initMap(elementId, lat, lng, zoom = 15) {

        const container = document.getElementById(elementId);

        if (!container) return;

        // Nettoyage ancienne carte
        if (this.currentMap) {
            this.currentMap.remove();
        }

        // Reset leaflet
        if (container._leaflet_id) {
            container._leaflet_id = null;
            container.innerHTML = "";
        }

        container.style.display = 'block';
        container.style.minHeight = '280px';

        this.currentMap = L.map(elementId).setView([lat, lng], zoom);

        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap'
            }
        ).addTo(this.currentMap);

        L.marker([lat, lng]).addTo(this.currentMap);

        L.circle([lat, lng], {
            radius: 40,
            color: '#3D1B0B',
            fillColor: '#3D1B0B',
            fillOpacity: 0.12,
            weight: 2
        }).addTo(this.currentMap);

        setTimeout(() => {
            this.currentMap.invalidateSize();
        }, 300);

        return this.currentMap;
    },

    /**
     * Mini carte dashboard
     */
    displayMiniMap(elementId, lat, lng) {

        const container = document.getElementById(elementId);

        if (!container) return;

        // IMPORTANT
        // éviter :
        // "Map container is already initialized"

        if (container._leaflet_id) {
            container._leaflet_id = null;
            container.innerHTML = "";
        }

        container.style.display = 'block';
        container.style.minHeight = '260px';

        const miniMap = L.map(elementId, {
            zoomControl: true,
            attributionControl: false,
            dragging: true,
            scrollWheelZoom: true,
            touchZoom: true
        }).setView([lat, lng], 16);

        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap'
            }
        ).addTo(miniMap);

        L.marker([lat, lng]).addTo(miniMap);

        L.circle([lat, lng], {
            radius: 35,
            color: '#3D1B0B',
            fillColor: '#3D1B0B',
            fillOpacity: 0.12,
            weight: 2
        }).addTo(miniMap);

        setTimeout(() => {
            miniMap.invalidateSize();
        }, 300);

        return miniMap;
    },

    /**
     * Vérification fictive EUDR
     */
    async verifyParcelZone(lat, lng) {

        console.log("🌍 Vérification zone EUDR :", lat, lng);

        const isTogo =
            lat > 6.0 &&
            lat < 11.0 &&
            lng > 0.0 &&
            lng < 2.0;

        if (isTogo) {

            return {
                valid: true,
                zone: "Zone Certifiée Togo",
                message: "Conformité EUDR Confirmée"
            };

        }

        return {
            valid: true,
            zone: "Zone Hors Référence",
            message: "Zone non répertoriée mais acceptée"
        };
    }
};

window.ChainCacaoGPS = gps;