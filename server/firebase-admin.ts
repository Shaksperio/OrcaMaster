import * as admin from "firebase-admin";
import { ENV } from "./_core/env";

let _firebaseApp: admin.app.App | null = null;

/**
 * Inicializa o Firebase Admin SDK
 * Usa as credenciais armazenadas nas variáveis de ambiente
 */
export function initializeFirebaseAdmin(): admin.app.App {
  if (_firebaseApp) {
    return _firebaseApp;
  }

  try {
    // Construir o objeto de credenciais a partir das variáveis de ambiente
    const serviceAccount = {
      type: "service_account",
      project_id: ENV.firebaseProjectId,
      private_key_id: ENV.firebasePrivateKeyId,
      private_key: ENV.firebasePrivateKey?.replace(/\\n/g, "\n"),
      client_email: ENV.firebaseClientEmail,
      client_id: ENV.firebaseClientId,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      universe_domain: "googleapis.com",
    };

    _firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL: ENV.firebaseDatabaseUrl,
    });

    console.log("[Firebase] Admin SDK initialized successfully");
    return _firebaseApp;
  } catch (error) {
    console.error("[Firebase] Failed to initialize Admin SDK:", error);
    throw error;
  }
}

/**
 * Obtém a instância do Firebase Admin
 */
export function getFirebaseAdmin(): admin.app.App {
  if (!_firebaseApp) {
    return initializeFirebaseAdmin();
  }
  return _firebaseApp;
}

/**
 * Obtém a referência do Realtime Database
 */
export function getDatabase(): admin.database.Database {
  return getFirebaseAdmin().database();
}

/**
 * Sincroniza dados do MySQL para o Firebase
 */
export async function syncToFirebase(
  path: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const db = getDatabase();
    await db.ref(path).set(data);
    console.log(`[Firebase] Synced data to ${path}`);
  } catch (error) {
    console.error(`[Firebase] Failed to sync data to ${path}:`, error);
    throw error;
  }
}

/**
 * Lê dados do Firebase
 */
export async function readFromFirebase(path: string): Promise<unknown> {
  try {
    const db = getDatabase();
    const snapshot = await db.ref(path).get();
    return snapshot.val();
  } catch (error) {
    console.error(`[Firebase] Failed to read data from ${path}:`, error);
    throw error;
  }
}

/**
 * Atualiza dados no Firebase (merge)
 */
export async function updateFirebase(
  path: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const db = getDatabase();
    await db.ref(path).update(data);
    console.log(`[Firebase] Updated data at ${path}`);
  } catch (error) {
    console.error(`[Firebase] Failed to update data at ${path}:`, error);
    throw error;
  }
}

/**
 * Deleta dados do Firebase
 */
export async function deleteFromFirebase(path: string): Promise<void> {
  try {
    const db = getDatabase();
    await db.ref(path).remove();
    console.log(`[Firebase] Deleted data at ${path}`);
  } catch (error) {
    console.error(`[Firebase] Failed to delete data at ${path}:`, error);
    throw error;
  }
}
