Relayer backend for ChainCacao

Setup

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:

```bash
cd relayer
npm install
```

3. Run:

```bash
npm start
```

API

POST /api/anchor
Body: { "data": {...}, "actorId": "AGR-..." }
Response: { hash, explorerUrl, blockNumber }
