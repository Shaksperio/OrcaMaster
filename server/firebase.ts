import * as admin from "firebase-admin";

/**
 * Firebase Admin SDK initialization for Realtime Database sync.
 * Uses environment variables injected by the platform.
 */

let firebaseApp: admin.app.App | null = null;
let firebaseDb: admin.database.Database | null = null;

function getFirebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // The env var may contain literal \n sequences that need to be converted to real newlines
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, "\n") : undefined;
  const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!projectId || !clientEmail || !privateKey || !databaseURL) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
    privateKeyId,
    databaseURL,
  };
}

/**
 * Initialize Firebase Admin SDK.
 * Returns null if credentials are not configured.
 */
export function initFirebase(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  const config = getFirebaseConfig();
  if (!config) {
    console.warn("[Firebase] Credentials not configured. Sync disabled.");
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      }),
      databaseURL: config.databaseURL,
    });
    console.log("[Firebase] Initialized successfully. Database URL:", config.databaseURL);
    return firebaseApp;
  } catch (error: any) {
    console.error("[Firebase] Initialization failed:", error.message);
    return null;
  }
}

/**
 * Get Firebase Realtime Database instance.
 * Returns null if Firebase is not initialized.
 */
export function getFirebaseDb(): admin.database.Database | null {
  if (firebaseDb) return firebaseDb;

  const app = initFirebase();
  if (!app) return null;

  firebaseDb = admin.database();
  return firebaseDb;
}

/**
 * Check if Firebase is available and connected.
 */
export function isFirebaseEnabled(): boolean {
  return getFirebaseDb() !== null;
}
