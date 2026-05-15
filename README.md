ChainCacao PWA

Déploiement Render

1. Crée un service Web Node sur Render à partir de ce dépôt.
2. Utilise ces commandes:

```bash
npm install
npm run build
npm start
```

3. Ajoute les variables d'environnement suivantes dans Render:

```bash
NODE_ENV=production
RPC_URL=...
CONTRACT_ADDRESS=0x...
PRIVATE_KEY_RELAYER=...
NEXT_PUBLIC_CHAIN_ID=137
NEXT_PUBLIC_NETWORK_NAME=Polygon Mainnet
NEXT_PUBLIC_RELAYER_URL=https://ton-service.onrender.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
FIREBASE_API_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_FIRESTORE_DATABASE_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

4. Vérifie l'URL de santé:

```bash
/api/health
```

Points importants

- Le build génère `public/js/runtime-config.js` à partir des variables d'environnement.
- Le serveur `server.js` sert le PWA statique et expose aussi le relayer blockchain.
- Le contrat Polygon doit déjà être déployé avant de passer en production.