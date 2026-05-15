import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0846821407",
  appId: "1:692923259240:web:ab1f1cb49bbb19b8d81edd",
  apiKey: "AIzaSyCIuyy15SbpaSLmy1s8ntz-WlOqaQ4PwvA",
  authDomain: "gen-lang-client-0846821407.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-9f533733-bd79-49db-97ba-3503bcaf4462",
  storageBucket: "gen-lang-client-0846821407.firebasestorage.app",
  messagingSenderId: "692923259240"
};

import * as firestore from 'firebase/firestore';
import * as authSDK from 'firebase/auth';

const runtimeConfig = window.__CHAINCACAO_CONFIG__ || {};
const resolvedFirebaseConfig = {
  ...firebaseConfig,
  apiKey: runtimeConfig.firebaseApiKey || firebaseConfig.apiKey,
  projectId: runtimeConfig.firebaseProjectId || firebaseConfig.projectId,
  authDomain: runtimeConfig.firebaseAuthDomain || firebaseConfig.authDomain,
  firestoreDatabaseId: runtimeConfig.firebaseFirestoreDatabaseId || firebaseConfig.firestoreDatabaseId,
  storageBucket: runtimeConfig.firebaseStorageBucket || firebaseConfig.storageBucket,
  messagingSenderId: runtimeConfig.firebaseMessagingSenderId || firebaseConfig.messagingSenderId,
  appId: runtimeConfig.firebaseAppId || firebaseConfig.appId,
};

const app = initializeApp(resolvedFirebaseConfig);
export const auth = authSDK.getAuth(app);
export const db = firestore.getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);

window.firebaseAuth = auth;
window.firebaseDB = db;
window.FirebaseSDK = {
  firestore: firestore,
  auth: authSDK
};

// Validate connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'connection'));
    console.log("Firebase Connection Verified");
  } catch (error) {
    if (error.message && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
