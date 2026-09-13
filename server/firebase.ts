import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: any = null;
let firestoreDb: any = null;
let fbAuth: any = null;

/**
 * Initialize Firebase Admin SDK
 * Called once on server startup
 */
export function initializeFirebase() {
  // Prevent multiple initialization
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    firestoreDb = getFirestore(adminApp);
    fbAuth = getAuth(adminApp);
    return;
  }

  try {
    const credentialJson = process.env.FIREBASE_ADMIN_SDK_KEY;
    if (!credentialJson) {
      console.warn('[Firebase] FIREBASE_ADMIN_SDK_KEY not set, skipping Firebase initialization');
      return;
    }

    adminApp = initializeApp({
      credential: cert(JSON.parse(credentialJson)),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    firestoreDb = getFirestore(adminApp);
    fbAuth = getAuth(adminApp);

    console.log('[Firebase] ✓ Initialized successfully');
  } catch (error) {
    console.error('[Firebase] Failed to initialize:', error);
  }
}

export function getFirestoreDb() {
  if (!firestoreDb) {
    initializeFirebase();
  }
  return firestoreDb;
}

export function getFirebaseAuth() {
  if (!fbAuth) {
    initializeFirebase();
  }
  return fbAuth;
}

/**
 * Check if Firebase is available
 */
export function isFirebaseAvailable(): boolean {
  return !!getFirestoreDb();
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function syncUserToFirebase(user: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const userRef = db.collection('users').doc(user.openId);
    const now = Timestamp.now();

    await userRef.set({
      openId: user.openId,
      name: user.name || null,
      email: user.email || null,
      loginMethod: user.loginMethod || null,
      role: user.role || 'user',
      createdAt: Timestamp.fromDate(user.createdAt || new Date()),
      updatedAt: now,
      lastSignedIn: Timestamp.fromDate(user.lastSignedIn || new Date()),
    }, { merge: true });

    console.log(`[Firebase] User synced: ${user.openId}`);
  } catch (error) {
    console.error('[Firebase] Failed to sync user:', error);
  }
}

// ============================================================================
// COMPANY OPERATIONS
// ============================================================================

export async function syncCompanyToFirebase(company: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const companyRef = db.collection('companies').doc(company.id.toString());
    const now = Timestamp.now();

    await companyRef.set({
      id: company.id,
      ownerId: company.userId,
      name: company.name,
      cnpj: company.cnpj || null,
      phone: company.phone || null,
      email: company.email || null,
      address: company.address || null,
      city: company.city || null,
      state: company.state || null,
      zipCode: company.zipCode || null,
      website: company.website || null,
      logoUrl: company.logoUrl || null,
      createdAt: Timestamp.fromDate(company.createdAt || new Date()),
      updatedAt: now,
    }, { merge: true });

    console.log(`[Firebase] Company synced: ${company.id}`);
  } catch (error) {
    console.error('[Firebase] Failed to sync company:', error);
  }
}

export async function getCompanyFromFirebase(companyId: string) {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const doc = await db.collection('companies').doc(companyId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('[Firebase] Failed to get company:', error);
    return null;
  }
}

// ============================================================================
// PRODUCT OPERATIONS
// ============================================================================

export async function syncProductToFirebase(companyId: string, product: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const productRef = db
      .collection('companies')
      .doc(companyId)
      .collection('products')
      .doc(product.id.toString());

    const now = Timestamp.now();

    await productRef.set({
      id: product.id,
      companyId: companyId,
      name: product.name,
      description: product.description || null,
      sku: product.sku || null,
      unit: product.unit || null,
      stock: product.stock || 0,
      sourceType: product.sourceType || 'manual',
      externalSource: product.externalSource || null,
      externalSku: product.externalSku || null,
      externalUrl: product.externalUrl || null,
      externalStatus: product.externalStatus || 'active',
      syncEnabled: product.syncEnabled ?? true,
      priceSource: product.priceSource || 'manual',
      externalPrice: product.externalPrice || null,
      lastSyncedAt: product.lastSyncedAt ? Timestamp.fromDate(product.lastSyncedAt) : null,
      createdAt: Timestamp.fromDate(product.createdAt || new Date()),
      updatedAt: now,
    }, { merge: true });

    console.log(`[Firebase] Product synced: ${companyId}/${product.id}`);
  } catch (error) {
    console.error('[Firebase] Failed to sync product:', error);
  }
}

export async function getCompanyProductsFromFirebase(companyId: string) {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const snapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('products')
      .get();

    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('[Firebase] Failed to get products:', error);
    return [];
  }
}

// ============================================================================
// QUOTATION OPERATIONS
// ============================================================================

export async function syncQuotationToFirebase(companyId: string, quotation: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const quotationRef = db
      .collection('companies')
      .doc(companyId)
      .collection('quotations')
      .doc(quotation.id.toString());

    const now = Timestamp.now();

    await quotationRef.set({
      id: quotation.id,
      companyId: companyId,
      clientId: quotation.clientId,
      number: quotation.number,
      status: quotation.status || 'draft',
      totalValue: quotation.total || 0,
      discount: quotation.discount || null,
      notes: quotation.notes || null,
      validUntil: quotation.validUntil ? Timestamp.fromDate(quotation.validUntil) : null,
      createdAt: Timestamp.fromDate(quotation.createdAt || new Date()),
      updatedAt: now,
    }, { merge: true });

    console.log(`[Firebase] Quotation synced: ${companyId}/${quotation.id}`);
  } catch (error) {
    console.error('[Firebase] Failed to sync quotation:', error);
  }
}

export async function getCompanyQuotationsFromFirebase(companyId: string) {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const snapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('quotations')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('[Firebase] Failed to get quotations:', error);
    return [];
  }
}

// ============================================================================
// INVOICE OPERATIONS
// ============================================================================

export async function syncInvoiceToFirebase(companyId: string, invoice: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const invoiceRef = db
      .collection('companies')
      .doc(companyId)
      .collection('invoices')
      .doc(invoice.id.toString());

    const now = Timestamp.now();

    await invoiceRef.set({
      id: invoice.id,
      companyId: companyId,
      clientId: invoice.clientId,
      number: invoice.number,
      quotationId: invoice.quotationId || null,
      status: invoice.status || 'draft',
      totalValue: invoice.total || 0,
      discount: invoice.discount || null,
      dueDate: invoice.dueDate ? Timestamp.fromDate(invoice.dueDate) : null,
      paidAt: invoice.paidAt ? Timestamp.fromDate(invoice.paidAt) : null,
      notes: invoice.notes || null,
      createdAt: Timestamp.fromDate(invoice.createdAt || new Date()),
      updatedAt: now,
    }, { merge: true });

    console.log(`[Firebase] Invoice synced: ${companyId}/${invoice.id}`);
  } catch (error) {
    console.error('[Firebase] Failed to sync invoice:', error);
  }
}

export async function getCompanyInvoicesFromFirebase(companyId: string) {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const snapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('invoices')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('[Firebase] Failed to get invoices:', error);
    return [];
  }
}

// ============================================================================
// CLIENT OPERATIONS
// ============================================================================

export async function syncClientToFirebase(companyId: string, client: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const clientRef = db
      .collection('companies')
      .doc(companyId)
      .collection('clients')
      .doc(client.id.toString());

    const now = Timestamp.now();

    await clientRef.set({
      id: client.id,
      companyId: companyId,
      name: client.name,
      email: client.email || null,
      phone: client.phone || null,
      cpfCnpj: client.cpfCnpj || null,
      address: client.address || null,
      city: client.city || null,
      state: client.state || null,
      zipCode: client.zipCode || null,
      createdAt: Timestamp.fromDate(client.createdAt || new Date()),
      updatedAt: now,
    }, { merge: true });

    console.log(`[Firebase] Client synced: ${companyId}/${client.id}`);
  } catch (error) {
    console.error('[Firebase] Failed to sync client:', error);
  }
}

// ============================================================================
// PROFESSIONAL OPERATIONS
// ============================================================================

export async function syncProfessionalToFirebase(companyId: string, professional: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const profRef = db
      .collection('companies')
      .doc(companyId)
      .collection('professionals')
      .doc(professional.id.toString());

    const now = Timestamp.now();

    await profRef.set({
      id: professional.id,
      companyId: companyId,
      name: professional.name,
      email: professional.email || null,
      phone: professional.phone || null,
      cpf: professional.cpf || null,
      hourlyRate: professional.hourlyRate || 0,
      commission: professional.commission || 0,
      createdAt: Timestamp.fromDate(professional.createdAt || new Date()),
      updatedAt: now,
    }, { merge: true });

    console.log(`[Firebase] Professional synced: ${companyId}/${professional.id}`);
  } catch (error) {
    console.error('[Firebase] Failed to sync professional:', error);
  }
}

// ============================================================================
// SUPPLIER OPERATIONS
// ============================================================================

export async function syncSupplierToFirebase(companyId: string, supplier: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const supplierRef = db
      .collection('companies')
      .doc(companyId)
      .collection('suppliers')
      .doc(supplier.id.toString());

    const now = Timestamp.now();

    await supplierRef.set({
      id: supplier.id,
      companyId: companyId,
      name: supplier.name,
      email: supplier.email || null,
      phone: supplier.phone || null,
      cnpj: supplier.cnpj || null,
      address: supplier.address || null,
      city: supplier.city || null,
      state: supplier.state || null,
      zipCode: supplier.zipCode || null,
      createdAt: Timestamp.fromDate(supplier.createdAt || new Date()),
      updatedAt: now,
    }, { merge: true });

    console.log(`[Firebase] Supplier synced: ${companyId}/${supplier.id}`);
  } catch (error) {
    console.error('[Firebase] Failed to sync supplier:', error);
  }
}

// ============================================================================
// EXPENSE OPERATIONS
// ============================================================================

export async function syncExpenseToFirebase(companyId: string, expense: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const expenseRef = db
      .collection('companies')
      .doc(companyId)
      .collection('expenses')
      .doc(expense.id.toString());

    const now = Timestamp.now();

    await expenseRef.set({
      id: expense.id,
      companyId: companyId,
      description: expense.description,
      amount: expense.amount || 0,
      category: expense.category || null,
      date: expense.date ? Timestamp.fromDate(expense.date) : null,
      createdAt: Timestamp.fromDate(expense.createdAt || new Date()),
      updatedAt: now,
    }, { merge: true });

    console.log(`[Firebase] Expense synced: ${companyId}/${expense.id}`);
  } catch (error) {
    console.error('[Firebase] Failed to sync expense:', error);
  }
}
