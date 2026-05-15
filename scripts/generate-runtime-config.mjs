import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const publicDir = resolve('public');
const outputPath = resolve(publicDir, 'js/runtime-config.js');

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const entries = {};
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    entries[key] = value;
  }

  return entries;
}

const envFileValues = parseEnvFile(resolve('.env'));
const env = {
  ...envFileValues,
  ...process.env,
};

mkdirSync(dirname(outputPath), { recursive: true });

const runtimeConfig = {
  contractAddress: env.NEXT_PUBLIC_CONTRACT_ADDRESS || '',
  chainId: env.NEXT_PUBLIC_CHAIN_ID || '137',
  networkName: env.NEXT_PUBLIC_NETWORK_NAME || 'Polygon Mainnet',
  relayerUrl: env.NEXT_PUBLIC_RELAYER_URL || env.RELAYER_URL || '',
  firebaseApiKey: env.FIREBASE_API_KEY || '',
  firebaseProjectId: env.FIREBASE_PROJECT_ID || 'gen-lang-client-0846821407',
  firebaseAuthDomain: env.FIREBASE_AUTH_DOMAIN || 'gen-lang-client-0846821407.firebaseapp.com',
  firebaseFirestoreDatabaseId: env.FIREBASE_FIRESTORE_DATABASE_ID || 'ai-studio-9f533733-bd79-49db-97ba-3503bcaf4462',
  firebaseStorageBucket: env.FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0846821407.firebasestorage.app',
  firebaseMessagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '692923259240',
  firebaseAppId: env.FIREBASE_APP_ID || '1:692923259240:web:ab1f1cb49bbb19b8d81edd',
};

const fileContent = `window.__CHAINCACAO_CONFIG__ = ${JSON.stringify(runtimeConfig, null, 2)};\n`;

writeFileSync(outputPath, fileContent, 'utf8');
console.log(`Wrote ${outputPath}`);