require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const crypto = require('crypto');

const PRIVATE_KEY = process.env.PRIVATE_KEY_RELAYER;
const RPC_URL = process.env.RPC_URL || process.env.NEXT_PUBLIC_POLYGON_RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const CHAIN_ID = Number(process.env.CHAIN_ID || process.env.NEXT_PUBLIC_CHAIN_ID || 137);
const PORT = Number(process.env.PORT || 3000);

// Afficher la configuration au demarrage
console.log('============================================');
console.log('CHAINCACAO RELAYER - CONFIGURATION');
console.log('CHAIN_ID:', CHAIN_ID);
console.log('CONTRACT_ADDRESS:', CONTRACT_ADDRESS || 'NON CONFIGURE');
console.log('RPC_URL:', RPC_URL || 'NON CONFIGURE');
console.log('PRIVATE_KEY:', PRIVATE_KEY ? 'Configuree' : 'NON CONFIGURE');
console.log('============================================');

if (!PRIVATE_KEY) {
  console.error('ERREUR: PRIVATE_KEY_RELAYER manquant dans .env');
}
if (!RPC_URL) {
  console.error('ERREUR: RPC_URL manquant dans .env');
}
if (!CONTRACT_ADDRESS) {
  console.error('ERREUR: CONTRACT_ADDRESS manquant dans .env');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Initialisation du provider et du wallet
let provider;
let wallet;
let contract;

try {
  provider = new ethers.JsonRpcProvider(RPC_URL);
  console.log('Provider initialise avec', RPC_URL);
} catch (err) {
  console.error('ERREUR provider:', err.message);
}

if (PRIVATE_KEY && provider) {
  try {
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log('Wallet initialise:', wallet.address);
  } catch (err) {
    console.error('ERREUR wallet:', err.message);
  }
}

const ABI = [
  'function anchorData(string batchId, string dataHash, string actorId) public'
];

if (CONTRACT_ADDRESS && provider) {
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet || provider);
  console.log('Contrat initialise a', CONTRACT_ADDRESS);
}

// Fonction de hashage compatible
function computeHash(data) {
  const str = JSON.stringify(data);
  return '0x' + crypto.createHash('sha256').update(str).digest('hex');
}

// Route de sante
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    chainId: CHAIN_ID,
    contractConfigure: !!contract,
    walletConfigure: !!wallet,
    rpcConfigure: !!RPC_URL
  });
});

// Route d'ancrage (POST /api/anchor)
app.post('/api/anchor', async (req, res) => {
  const { data, actorId } = req.body || {};
  
  if (!data) {
    return res.status(400).json({ error: 'Donnees manquantes' });
  }

  const batchId = (data && typeof data === 'object') 
    ? (data.batchId || data.containerId || data.lotId || data.id || 'CHAINCACAO') 
    : 'CHAINCACAO';
  
  const resolvedBatch = batchId || actorId || 'CHAINCACAO';
  const dataHash = computeHash(data);

  // Si pas de wallet, simuler la reponse (mode demo)
  if (!wallet || !contract) {
    console.log('MODE DEMO: Transaction simulee pour', resolvedBatch);
    const simulatedHash = '0x' + crypto.randomBytes(32).toString('hex');
    return res.json({
      hash: simulatedHash,
      dataHash,
      batchId: resolvedBatch,
      explorerUrl: `https://polygonscan.com/tx/${simulatedHash}`,
      blockNumber: Math.floor(Math.random() * 1000000) + 40000000,
      mode: 'demo'
    });
  }

  // Mode reel : envoyer la transaction sur Polygon
  try {
    console.log('Envoi transaction pour', resolvedBatch);
    const tx = await contract.anchorData(resolvedBatch, dataHash, actorId || 'UNKNOWN');
    console.log('Transaction envoyee:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('Transaction confirmee, bloc:', receipt.blockNumber);

    res.json({
      hash: tx.hash,
      dataHash,
      batchId: resolvedBatch,
      explorerUrl: `https://polygonscan.com/tx/${tx.hash}`,
      blockNumber: receipt?.blockNumber || null,
      mode: 'reel'
    });
  } catch (err) {
    console.error('Erreur transaction:', err?.message || err);
    
    // Fallback demo en cas d'echec
    const simulatedHash = '0x' + crypto.randomBytes(32).toString('hex');
    res.json({
      hash: simulatedHash,
      dataHash,
      batchId: resolvedBatch,
      explorerUrl: `https://polygonscan.com/tx/${simulatedHash}`,
      blockNumber: null,
      mode: 'demo-fallback',
      error: err?.message || String(err)
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Relayer ChainCacao demarre sur http://localhost:${PORT}`);
  console.log(`Test: http://localhost:${PORT}/health`);
});
