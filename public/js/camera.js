// const camera = {
//     async capturePhoto() {
//         return new Promise((resolve) => {
//             const input = document.createElement('input');
//             input.type = 'file';
//             input.accept = 'image/*';
//             input.capture = 'environment';
            
//             input.onchange = (e) => {
//                 const file = e.target.files[0];
//                 const reader = new FileReader();
//                 reader.onload = (event) => resolve(event.target.result);
//                 reader.readAsDataURL(file);
//             };
            
//             input.click();
//         });
//     },

//     async scanQR() {
//         return new Promise((resolve) => {
//             const modal = document.createElement('div');
//             modal.style.position = 'fixed';
//             modal.style.top = '0';
//             modal.style.left = '0';
//             modal.style.width = '100%';
//             modal.style.height = '100%';
//             modal.style.backgroundColor = 'rgba(0,0,0,0.9)';
//             modal.style.zIndex = '10000';
//             modal.style.display = 'flex';
//             modal.style.flexDirection = 'column';
//             modal.style.alignItems = 'center';
//             modal.style.justifyContent = 'center';
//             modal.id = 'qr-scanner-modal';

//             modal.innerHTML = `
//                 <div id="qr-reader" style="width: 100%; max-width: 400px; border-radius: 20px; overflow: hidden;"></div>
//                 <button id="close-scanner" class="btn btn-outline" style="margin-top: 2rem; color: white; border-color: white;">Fermer</button>
//             `;

//             document.body.appendChild(modal);

//             const html5QrCode = new Html5Qrcode("qr-reader");
//             const config = { fps: 10, qrbox: { width: 250, height: 250 } };

//             const stopScanner = async () => {
//                 try {
//                     await html5QrCode.stop();
//                 } catch (e) {
//                     console.warn("Scanner already stopped or failed to stop", e);
//                 }
//                 modal.remove();
//             };

//             document.getElementById('close-scanner').onclick = stopScanner;

//             html5QrCode.start(
//                 { facingMode: "environment" },
//                 config,
//                 (decodedText) => {
//                     stopScanner();
//                     resolve(decodedText);
//                 },
//                 (errorMessage) => {
//                     // Ignore transient errors
//                 }
//             ).catch(err => {
//                 console.error("Scanner failed to start", err);
//                 alert("Impossible d'accéder à la caméra. Vérifiez vos permissions.");
//                 stopScanner();
//                 resolve(null);
//             });
//         });
//     }
// };


const camera = {
    // Fonction interne privée pour écraser le poids de l'image avant le renvoi
    _compressImage(base64Str, maxWidth = 800, maxHeight = 800, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Conservation du ratio d'aspect de la photo du lot
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Exportation en JPEG léger (70% de qualité = invisible à l'oeil nu mais passe de 3Mo à ~60Ko)
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = (error) => reject(error);
        });
    },

    async capturePhoto() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) {
                    resolve(null);
                    return;
                }

                const reader = new FileReader();
                reader.onload = async (event) => {
                    const bruteBase64 = event.target.result;
                    try {
                        console.log("[Camera] Image brute capturée. Compression en cours...");
                        // On intercepte la photo ici pour la compresser à la volée
                        const compressedBase64 = await this._compressImage(bruteBase64);
                        console.log("[Camera] Compression réussie. Prêt pour Firestore.");
                        resolve(compressedBase64);
                    } catch (err) {
                        console.warn("[Camera] Échec compression, renvoi de l'image brute en secours", err);
                        resolve(bruteBase64);
                    }
                };
                reader.readAsDataURL(file);
            };
            
            input.click();
        });
    },

    async scanQR() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0,0,0,0.9)';
            modal.style.zIndex = '10000';
            modal.style.display = 'flex';
            modal.style.flexDirection = 'column';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.id = 'qr-scanner-modal';

            modal.innerHTML = `
                <div id="qr-reader" style="width: 100%; max-width: 400px; border-radius: 20px; overflow: hidden;"></div>
                <button id="close-scanner" class="btn btn-outline" style="margin-top: 2rem; color: white; border-color: white;">Fermer</button>
            `;

            document.body.appendChild(modal);

            const html5QrCode = new Html5Qrcode("qr-reader");
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            const stopScanner = async () => {
                try {
                    await html5QrCode.stop();
                } catch (e) {
                    console.warn("Scanner already stopped or failed to stop", e);
                }
                modal.remove();
            };

            document.getElementById('close-scanner').onclick = stopScanner;

            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    stopScanner();
                    resolve(decodedText);
                },
                (errorMessage) => {
                    // Ignore transient errors
                }
            ).catch(err => {
                console.error("Scanner failed to start", err);
                alert("Impossible d'accéder à la caméra. Vérifiez vos permissions.");
                stopScanner();
                resolve(null);
            });
        });
    }
};