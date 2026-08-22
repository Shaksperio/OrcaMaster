import { eq, and, desc, asc, sql, count, isNotNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, companies, clients, products, productPriceHistory, professionals, suppliers, quotations, quotationItems, invoices, invoiceItems, companyMembers, themes, expenses, documentVersions, assistantActionConfirmations, qrCodeValidations, priceSuggestions } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Company queries
export async function getUserCompanies(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companies).where(eq(companies.userId, userId));
}

export async function getCompanyById(companyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCompany(data: typeof companies.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(companies).values(data);
  return result[0];
}

export async function updateCompany(id: number, data: Partial<typeof companies.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companies).set(data).where(eq(companies.id, id));
}

// Client queries
export async function getCompanyClients(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).where(eq(clients.companyId, companyId)).orderBy(desc(clients.createdAt));
}

export async function getClientById(clientId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createClient(data: typeof clients.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data);
  return result[0];
}

export async function updateClient(clientId: number, data: Partial<typeof clients.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, clientId));
  return getClientById(clientId);
}

export async function deleteClient(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clients).where(eq(clients.id, clientId));
  return { id: clientId };
}

// Product queries
export async function getCompanyProducts(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.companyId, companyId)).orderBy(desc(products.createdAt));
}

export async function getProductById(productId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProduct(data: typeof products.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(data);
  return result[0];
}

export async function getSyncEnabledExternalProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(and(
    eq(products.syncEnabled, true),
    isNotNull(products.externalUrl),
    or(eq(products.sourceType, "external"), eq(products.priceSource, "external")),
  )).orderBy(asc(products.id));
}

export async function updateProduct(productId: number, data: Partial<typeof products.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(data).where(eq(products.id, productId));
  const updated = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  return updated[0];
}

export async function addProductPriceHistory(data: typeof productPriceHistory.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(productPriceHistory).values(data);
  return result[0];
}

// Professional queries
export async function getCompanyProfessionals(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(professionals).where(eq(professionals.companyId, companyId)).orderBy(desc(professionals.createdAt));
}

export async function getProfessionalById(professionalId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(professionals).where(eq(professionals.id, professionalId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProfessional(data: typeof professionals.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(professionals).values(data);
  return result[0];
}

// Supplier queries
export async function getCompanySuppliers(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).where(eq(suppliers.companyId, companyId)).orderBy(desc(suppliers.createdAt));
}

export async function getSupplierById(supplierId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);
  return result[0];
}

export async function createSupplier(data: typeof suppliers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(suppliers).values(data);
  return result[0];
}

export async function updateSupplier(supplierId: number, data: Partial<typeof suppliers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(suppliers).set(data).where(eq(suppliers.id, supplierId));
  return getSupplierById(supplierId);
}

export async function deleteSupplier(supplierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(suppliers).where(eq(suppliers.id, supplierId));
}

// Quotation queries
export async function getCompanyQuotations(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotations).where(eq(quotations.companyId, companyId)).orderBy(desc(quotations.createdAt));
}

export async function getQuotationById(quotationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Invoice queries
export async function getCompanyInvoices(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.companyId, companyId)).orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(invoiceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Theme queries
export async function getCompanyThemes(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(themes).where(eq(themes.companyId, companyId)).orderBy(desc(themes.createdAt));
}

export async function getThemeById(themeId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(themes).where(eq(themes.id, themeId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDefaultTheme(companyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(themes).where(and(eq(themes.companyId, companyId), eq(themes.isDefault, true))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrCreateDefaultTheme(companyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  // Try to find existing default theme
  const existing = await db.select().from(themes).where(and(eq(themes.companyId, companyId), eq(themes.isDefault, true))).limit(1);
  if (existing.length > 0) return existing[0];
  // Try to find any theme
  const anyTheme = await db.select().from(themes).where(eq(themes.companyId, companyId)).limit(1);
  if (anyTheme.length > 0) return anyTheme[0];
  // Create default theme
  const [result] = await db.insert(themes).values({
    companyId,
    name: "Padrão",
    layout: "minimalista",
    primaryColor: "#FF8C00",
    secondaryColor: "#1B5E20",
    isDefault: true,
  });
  const newTheme = await db.select().from(themes).where(eq(themes.id, result.insertId)).limit(1);
  return newTheme.length > 0 ? newTheme[0] : undefined;
}

export async function updateThemeWatermark(themeId: number, watermarkUrl: string | null, watermarkStorageKey: string | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(themes).set({ watermarkUrl, watermarkStorageKey }).where(eq(themes.id, themeId));
}

// Company member queries
export async function getCompanyMembers(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companyMembers).where(eq(companyMembers.companyId, companyId));
}

export async function getUserCompanyRole(userId: number, companyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companyMembers).where(and(eq(companyMembers.userId, userId), eq(companyMembers.companyId, companyId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// =====================================================
// Quotation creation helpers
// =====================================================

export async function getNextQuotationNumber(companyId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ total: count() }).from(quotations).where(eq(quotations.companyId, companyId));
  const nextNum = (result[0]?.total ?? 0) + 1;
  return `ORC-${String(nextNum).padStart(3, "0")}`;
}

export async function createQuotation(data: typeof quotations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quotations).values(data);
  const insertId = result[0].insertId;
  return { id: insertId };
}

export async function createQuotationItems(items: (typeof quotationItems.$inferInsert)[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return;
  await db.insert(quotationItems).values(items);
}

export async function getQuotationItems(quotationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId));
}

export async function updateQuotationStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quotations).set({ status: status as any }).where(eq(quotations.id, id));
}

export async function updateQuotation(id: number, data: Partial<typeof quotations.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quotations).set(data).where(eq(quotations.id, id));
}

export async function deleteQuotationItems(quotationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(quotationItems).where(eq(quotationItems.quotationId, quotationId));
}

// =====================================================
// Invoice creation helpers
// =====================================================

export async function getNextInvoiceNumber(companyId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ total: count() }).from(invoices).where(eq(invoices.companyId, companyId));
  const nextNum = (result[0]?.total ?? 0) + 1;
  return `FAT-${String(nextNum).padStart(3, "0")}`;
}

export async function createInvoice(data: typeof invoices.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invoices).values(data);
  const insertId = result[0].insertId;
  return { id: insertId };
}

export async function createInvoiceItems(items: (typeof invoiceItems.$inferInsert)[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return;
  await db.insert(invoiceItems).values(items);
}

export async function getInvoiceItems(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
}

export async function updateInvoiceStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invoices).set({ status: status as any }).where(eq(invoices.id, id));
}

export async function updateInvoice(id: number, data: Partial<typeof invoices.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invoices).set(data).where(eq(invoices.id, id));
}

export async function deleteInvoiceItems(invoiceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
}

// =====================================================
// Conversion: Quotation → Invoice
// =====================================================

export async function convertQuotationToInvoice(quotationId: number): Promise<{ invoiceId: number; invoiceNumber: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the quotation
  const quotation = await getQuotationById(quotationId);
  if (!quotation) throw new Error("Orçamento não encontrado");
  if (quotation.status !== "aprovado") throw new Error("Apenas orçamentos aprovados podem ser convertidos em fatura");

  // Get quotation items
  const qItems = await getQuotationItems(quotationId);

  // Generate invoice number
  const invoiceNumber = await getNextInvoiceNumber(quotation.companyId);

  // Create invoice
  const { id: invoiceId } = await createInvoice({
    companyId: quotation.companyId,
    clientId: quotation.clientId,
    quotationId: quotation.id,
    number: invoiceNumber,
    status: "rascunho",
    description: quotation.description,
    notes: quotation.notes,
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    discountPercentage: quotation.discountPercentage,
    tax: quotation.tax,
    total: quotation.total,
    paymentTerms: quotation.paymentTerms,
    themeId: quotation.themeId,
  });

  // Copy items
  if (qItems.length > 0) {
    const invoiceItemsData = qItems.map((item) => ({
      invoiceId,
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      discount: item.discount,
      total: item.total,
    }));
    await createInvoiceItems(invoiceItemsData);
  }

  // Update quotation status to "convertido"
  await updateQuotationStatus(quotationId, "convertido");

  return { invoiceId, invoiceNumber };
}

export async function deleteQuotation(quotationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(quotationItems).where(eq(quotationItems.quotationId, quotationId));
  await db.delete(quotations).where(eq(quotations.id, quotationId));
}

// Expense queries
export async function getCompanyExpenses(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenses).where(eq(expenses.companyId, companyId)).orderBy(desc(expenses.createdAt));
}

export async function createExpense(data: typeof expenses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenses).values(data);
  return result[0];
}

export async function updateExpenseStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(expenses).set({ status: status as any, paidDate: status === 'pago' ? new Date() : null }).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(expenses).where(eq(expenses.id, id));
}

// Document version history
export async function getDocumentVersions(documentType: "quotation" | "invoice", documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentVersions)
    .where(and(eq(documentVersions.documentType, documentType), eq(documentVersions.documentId, documentId)))
    .orderBy(desc(documentVersions.versionNumber));
}

export async function getNextDocumentVersionNumber(documentType: "quotation" | "invoice", documentId: number) {
  const versions = await getDocumentVersions(documentType, documentId);
  return (versions[0]?.versionNumber ?? 0) + 1;
}

export async function createDocumentVersion(data: typeof documentVersions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documentVersions).values(data);
  return result[0];
}

// Assistant action confirmations and audit records
export async function createAssistantActionConfirmation(data: typeof assistantActionConfirmations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(assistantActionConfirmations).values(data);
  return result[0];
}

export async function getAssistantActionConfirmationByToken(confirmationToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(assistantActionConfirmations)
    .where(eq(assistantActionConfirmations.confirmationToken, confirmationToken)).limit(1);
  return result[0];
}

export async function updateAssistantActionConfirmation(id: number, data: Partial<typeof assistantActionConfirmations.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(assistantActionConfirmations).set(data).where(eq(assistantActionConfirmations.id, id));
}

export async function deleteProduct(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(products).where(eq(products.id, productId));
}

export async function deleteInvoice(invoiceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(invoices).where(eq(invoices.id, invoiceId));
}


export async function getPublicDocumentByNumber(number: string) {
  const db = await getDb();
  if (!db) return undefined;
  const quotation = await db.select({ id: quotations.id, number: quotations.number, status: quotations.status, total: quotations.total, createdAt: quotations.createdAt, companyId: quotations.companyId }).from(quotations).where(eq(quotations.number, number)).limit(1);
  if (quotation[0]) {
    const company = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, quotation[0].companyId)).limit(1);
    return { ...quotation[0], documentType: "quotation" as const, companyName: company[0]?.name ?? null };
  }
  const invoice = await db.select({ id: invoices.id, number: invoices.number, status: invoices.status, total: invoices.total, createdAt: invoices.createdAt, companyId: invoices.companyId }).from(invoices).where(eq(invoices.number, number)).limit(1);
  if (!invoice[0]) return undefined;
  const company = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, invoice[0].companyId)).limit(1);
  return { ...invoice[0], documentType: "invoice" as const, companyName: company[0]?.name ?? null };
}

export async function createQRCodeValidation(data: typeof qrCodeValidations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(qrCodeValidations).values(data);
  return { id: result[0].insertId };
}

export async function countQRCodeValidations(documentType: "quotation" | "invoice", documentId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: count() }).from(qrCodeValidations).where(and(eq(qrCodeValidations.documentType, documentType), eq(qrCodeValidations.documentId, documentId)));
  return Number(result[0]?.total ?? 0);
}


export async function getCompanyQuotationItems(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ item: quotationItems, quotation: quotations }).from(quotationItems).innerJoin(quotations, eq(quotationItems.quotationId, quotations.id)).where(eq(quotations.companyId, companyId)).orderBy(desc(quotations.createdAt));
}

export async function createPriceSuggestion(data: typeof priceSuggestions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(priceSuggestions).values(data);
  return { id: result[0].insertId };
}

export async function getCompanyPriceSuggestions(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ suggestion: priceSuggestions, product: products }).from(priceSuggestions).innerJoin(products, eq(priceSuggestions.productId, products.id)).where(eq(priceSuggestions.companyId, companyId)).orderBy(desc(priceSuggestions.createdAt));
}
