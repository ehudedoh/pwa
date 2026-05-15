// ABI for ChainCacao contract
const CHAINCACAO_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "string", "name": "batchId", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "dataHash", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "actorId", "type": "string"},
      {"indexed": false, "internalType": "address", "name": "reporter", "type": "address"}
    ],
    "name": "DataAnchored",
    "type": "event"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "batchId", "type": "string"},
      {"internalType": "string", "name": "dataHash", "type": "string"},
      {"internalType": "string", "name": "actorId", "type": "string"}
    ],
    "name": "anchorData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "batchId", "type": "string"}],
    "name": "getBatchHistory",
    "outputs": [{
      "components": [
        {"internalType": "string", "name": "dataHash", "type": "string"},
        {"internalType": "string", "name": "actorId", "type": "string"},
        {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
        {"internalType": "uint256", "name": "blockNumber", "type": "uint256"},
        {"internalType": "address", "name": "reporter", "type": "address"}
      ],
      "internalType": "struct ChainCacao.TraceabilityNode[]",
      "name": "",
      "type": "tuple[]"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "dataHash", "type": "string"}],
    "name": "isHashCertified",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

window.CHAINCACAO_ABI = CHAINCACAO_ABI;
