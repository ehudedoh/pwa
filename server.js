import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { ethers } from 'ethers';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const PORT = Number(process.env.PORT || 3000);
const RPC_URL = process.env.RPC_URL || process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xF7d808899F7D529c5f2A2F4637726Bb25B4a26a7';
const PRIVATE_KEY = process.env.PRIVATE_KEY_RELAYER || process.env.RELAYER_PRIVATE_KEY || '';
const CHAIN_ID = Number(process.env.CHAIN_ID || process.env.NEXT_PUBLIC_CHAIN_ID || 137);

const ABI = [
  'function anchorData(string batchId, string dataHash, string actorId) public',
  'function getBatchHistory(string batchId) view returns (tuple(string dataHash,string actorId,uint256 timestamp,uint256 blockNumber,address reporter)[])',
  'function isHashCertified(string dataHash) view returns (bool)'
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, provider) : null;
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet || provider);

function computeHash(data) {
  return '0x' + crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function resolveBatchId(data, actorId) {
  if (data && typeof data === 'object') {
    return data.batchId || data.containerId || data.lotId || data.id || actorId || 'CHAINCACAO';
  }
  return actorId || 'CHAINCACAO';
}

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDir, { extensions: ['html'] }));

app.get('/api/health', async (req, res) => {
  try {
    const network = await provider.getNetwork();
    res.json({
      ok: true,
      chainId: Number(network.chainId || CHAIN_ID),
      contractAddress: CONTRACT_ADDRESS,
      relayerConfigured: Boolean(wallet)
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
});

app.post('/api/blockchain/notarize', async (req, res) => {
  const { data, actorId } = req.body || {};
  if (!data) {
    return res.status(400).json({ error: 'missing data' });
  }
  if (!wallet) {
    return res.status(500).json({ error: 'Relayer wallet not configured' });
  }

  const batchId = resolveBatchId(data, actorId);
  const dataHash = computeHash(data);

  try {
    const tx = await contract.anchorData(batchId, dataHash, actorId || 'UNKNOWN');
    const receipt = await tx.wait();

    res.json({
      hash: tx.hash,
      batchId,
      dataHash,
      blockNumber: receipt?.blockNumber || null,
      explorerUrl: `https://polygonscan.com/tx/${tx.hash}`
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || String(error) });
  }
});

app.get('/api/blockchain/status/:hash', async (req, res) => {
  try {
    const receipt = await provider.getTransactionReceipt(req.params.hash);
    res.json({
      hash: req.params.hash,
      confirmed: Boolean(receipt),
      blockNumber: receipt?.blockNumber || null,
      status: receipt?.status ?? null
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || String(error) });
  }
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ChainCacao server listening on http://localhost:${PORT}`);
});
