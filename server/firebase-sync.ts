import { getFirebaseDb, isFirebaseEnabled } from "./firebase";

/**
 * Firebase Realtime Database Sync Layer
 * 
 * This module provides automatic synchronization from MySQL to Firebase RTDB.
 * It acts as a write-through cache: every write to MySQL is replicated to Firebase.
 * 
 * Firebase structure:
 * /companies/{companyId}/...
 * /companies/{companyId}/clients/{clientId}
 * /companies/{companyId}/products/{productId}
 * /companies/{companyId}/professionals/{professionalId}
 * /companies/{companyId}/quotations/{quotationId}
 * /companies/{companyId}/quotations/{quotationId}/items/{itemId}
 * /companies/{companyId}/invoices/{invoiceId}
 * /companies/{companyId}/invoices/{invoiceId}/items/{itemId}
 * /users/{userId}
 */

type SyncEntity = 
  | "company"
  | "client"
  | "product"
  | "professional"
  | "quotation"
  | "quotationItem"
  | "invoice"
  | "invoiceItem"
  | "user"
  | "companyMember";

interface SyncOptions {
  companyId?: number;
  parentId?: number; // For items (quotationId or invoiceId)
}

/**
 * Sync a single entity to Firebase.
 * Non-blocking: errors are logged but do not throw.
 */
export async function syncToFirebase(
  entity: SyncEntity,
  id: number,
  data: Record<string, any> | null, // null = delete
  options: SyncOptions = {}
): Promise<void> {
  if (!isFirebaseEnabled()) return;

  const db = getFirebaseDb();
  if (!db) return;

  try {
    const path = getFirebasePath(entity, id, options);
    if (!path) return;

    if (data === null) {
      // Delete
      await db.ref(path).remove();
    } else {
      // Upsert - serialize dates and clean undefined values
      const cleanData = serializeForFirebase(data);
      await db.ref(path).set(cleanData);
    }
  } catch (error: any) {
    // Non-blocking: log and continue
    console.error(`[Firebase Sync] Error syncing ${entity}#${id}:`, error.message);
  }
}

/**
 * Sync multiple items at once (batch).
 */
export async function syncBatchToFirebase(
  entity: SyncEntity,
  items: Array<{ id: number; data: Record<string, any> }>,
  options: SyncOptions = {}
): Promise<void> {
  if (!isFirebaseEnabled()) return;

  const db = getFirebaseDb();
  if (!db) return;

  try {
    const updates: Record<string, any> = {};
    for (const item of items) {
      const path = getFirebasePath(entity, item.id, options);
      if (path) {
        updates[path] = serializeForFirebase(item.data);
      }
    }
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }
  } catch (error: any) {
    console.error(`[Firebase Sync] Batch error for ${entity}:`, error.message);
  }
}

/**
 * Sync full company data (for initial load or full refresh).
 */
export async function syncFullCompany(
  companyId: number,
  companyData: Record<string, any>,
  clients: Array<Record<string, any>>,
  products: Array<Record<string, any>>,
  professionals: Array<Record<string, any>>,
  quotations: Array<Record<string, any>>,
  invoices: Array<Record<string, any>>
): Promise<void> {
  if (!isFirebaseEnabled()) return;

  const db = getFirebaseDb();
  if (!db) return;

  try {
    const companyRef = db.ref(`companies/${companyId}`);
    
    const fullData: Record<string, any> = {
      ...serializeForFirebase(companyData),
      clients: {},
      products: {},
      professionals: {},
      quotations: {},
      invoices: {},
    };

    for (const client of clients) {
      fullData.clients[client.id] = serializeForFirebase(client);
    }
    for (const product of products) {
      fullData.products[product.id] = serializeForFirebase(product);
    }
    for (const prof of professionals) {
      fullData.professionals[prof.id] = serializeForFirebase(prof);
    }
    for (const quotation of quotations) {
      fullData.quotations[quotation.id] = serializeForFirebase(quotation);
    }
    for (const invoice of invoices) {
      fullData.invoices[invoice.id] = serializeForFirebase(invoice);
    }

    await companyRef.set(fullData);
    console.log(`[Firebase Sync] Full company #${companyId} synced successfully.`);
  } catch (error: any) {
    console.error(`[Firebase Sync] Full company sync error:`, error.message);
  }
}

/**
 * Get the Firebase path for a given entity.
 */
function getFirebasePath(entity: SyncEntity, id: number, options: SyncOptions): string | null {
  const { companyId, parentId } = options;

  switch (entity) {
    case "company":
      return `companies/${id}`;
    case "client":
      return companyId ? `companies/${companyId}/clients/${id}` : null;
    case "product":
      return companyId ? `companies/${companyId}/products/${id}` : null;
    case "professional":
      return companyId ? `companies/${companyId}/professionals/${id}` : null;
    case "quotation":
      return companyId ? `companies/${companyId}/quotations/${id}` : null;
    case "quotationItem":
      return companyId && parentId
        ? `companies/${companyId}/quotations/${parentId}/items/${id}`
        : null;
    case "invoice":
      return companyId ? `companies/${companyId}/invoices/${id}` : null;
    case "invoiceItem":
      return companyId && parentId
        ? `companies/${companyId}/invoices/${parentId}/items/${id}`
        : null;
    case "user":
      return `users/${id}`;
    case "companyMember":
      return companyId ? `companies/${companyId}/members/${id}` : null;
    default:
      return null;
  }
}

/**
 * Serialize data for Firebase (convert Dates, remove undefined, handle decimals).
 */
function serializeForFirebase(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    
    if (value === null) {
      result[key] = null;
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (typeof value === "bigint") {
      result[key] = Number(value);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      result[key] = serializeForFirebase(value);
    } else {
      result[key] = value;
    }
  }

  // Add sync metadata
  result._syncedAt = new Date().toISOString();
  
  return result;
}
