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

if (!PRIVATE_KEY) {
  console.error('Missing PRIVATE_KEY_RELAYER in env');
}
if (!RPC_URL) {
  console.error('Missing RPC_URL / NEXT_PUBLIC_POLYGON_RPC_URL in env');
}
if (!CONTRACT_ADDRESS) {
  console.error('Missing CONTRACT_ADDRESS in env');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, provider) : null;
const ABI = [
  'function anchorData(string batchId, string dataHash, string actorId) public'
];
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet || provider);

function computeHash(data) {
  const str = JSON.stringify(data);
  return '0x' + crypto.createHash('sha256').update(str).digest('hex');
}

app.get('/health', (req, res) => {
  res.json({ ok: true, chainId: CHAIN_ID });
});

app.post('/api/anchor', async (req, res) => {
  const { data, actorId } = req.body || {};
  if (!data) return res.status(400).json({ error: 'missing data' });

  const batchId = (data && typeof data === 'object') ? (data.batchId || data.containerId || data.lotId || data.id) : null;
  const resolvedBatch = batchId || actorId || 'CHAINCACAO';
  const dataHash = computeHash(data);

  try {
    if (!wallet) return res.status(500).json({ error: 'Relayer wallet not configured' });

    const tx = await contract.anchorData(resolvedBatch, dataHash, actorId || 'UNKNOWN');
    const receipt = await tx.wait();

    res.json({
      hash: tx.hash,
      dataHash,
      batchId: resolvedBatch,
      explorerUrl: `https://polygonscan.com/tx/${tx.hash}`,
      blockNumber: receipt?.blockNumber || null
    });
  } catch (err) {
    console.error('Relayer error', err?.message || err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`ChainCacao relayer listening on http://localhost:${PORT}`);
});
