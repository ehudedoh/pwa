Hardhat deployment for ChainCacao

Steps:

1. Copy env vars into `deploy/.env`:

```
PRIVATE_KEY=0x...
RPC_URL_MUMBAI=https://rpc-mumbai.example
RPC_URL_MAINNET=https://polygon-rpc.com
```

2. Install deps:

```bash
cd deploy
npm install
```

3. Compile & deploy to Mumbai (testnet):

```bash
npm run compile
npm run deploy:rinkeby
```

After deploy, ABI and address will be written to `public/js/deployed-abi.json` and `public/js/deployed-contract.json`.
