const CACHE_NAME = 'chaincacao-v2';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './css/agriculteur.css',
    './css/cooperative.css',
    './css/exportateur.css',
    './css/verificateur.css',
    './js/app.js',
    './js/utils.js',
    './js/database.js',
    './js/agriculteur.js',
    './js/cooperative.js',
    './js/exportateur.js',
    './js/verificateur.js',
    './js/blockchain.js',
    './js/gps.js',
    './js/camera.js',
    './js/qrcode.js',
    './js/pdf.js',
    './js/offline.js',
    './js/firebase-init.js',
    './manifest.json',
    './images/icons/icon-192x192.svg',
    './images/icons/icon-512x512.svg',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/idb@8/build/umd.js',
    'https://unpkg.com/html5-qrcode',
    'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
