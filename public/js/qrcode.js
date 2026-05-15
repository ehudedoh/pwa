const qrcodeControl = {
    generate(elementId, data) {
        const element = document.getElementById(elementId);
        element.innerHTML = "";
        try {
            new QRCode(element, {
                text: String(data),
                width: 200,
                height: 200,
                colorDark: "#3D1B0B",
                colorLight: "#ffffff"
            });
        } catch (error) {
            element.innerHTML = `<div style="padding:1rem; border:1px dashed var(--primary); border-radius:12px; text-align:center; font-weight:700; color:var(--primary)">${String(data)}</div>`;
            console.warn("QR generation fallback used:", error);
        }
    },

    async scan(elementId, onResult) {
        const html5QrCode = new Html5Qrcode(elementId);
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                html5QrCode.stop();
                onResult(decodedText);
            }
        );
        return html5QrCode;
    }
};
