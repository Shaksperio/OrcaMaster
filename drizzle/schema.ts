import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  datetime,
  unique,
  index,
  foreignKey,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role-based access control.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Companies/Businesses table
 * Stores company information with fiscal data, logo, and settings
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  document: varchar("document", { length: 20 }).notNull(), // CPF or CNPJ
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  logoUrl: varchar("logoUrl", { length: 500 }),
  logoStorageKey: varchar("logoStorageKey", { length: 255 }),
  currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
  language: varchar("language", { length: 5 }).default("pt-BR").notNull(),
  taxRegime: varchar("taxRegime", { length: 50 }), // Simples Nacional, Lucro Real, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("companies_userId_idx").on(table.userId),
  documentIdx: index("companies_document_idx").on(table.document),
}));

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Company members with role-based access control
 */
export const companyMembers = mysqlTable("companyMembers", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["admin", "gerente", "colaborador"]).default("colaborador").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  companyUserUnique: unique("company_user_unique").on(table.companyId, table.userId),
  companyIdIdx: index("companyMembers_companyId_idx").on(table.companyId),
  userIdIdx: index("companyMembers_userId_idx").on(table.userId),
}));

export type CompanyMember = typeof companyMembers.$inferSelect;
export type InsertCompanyMember = typeof companyMembers.$inferInsert;

/**
 * Clients table
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  document: varchar("document", { length: 20 }), // CPF or CNPJ
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  companyIdIdx: index("clients_companyId_idx").on(table.companyId),
  documentIdx: index("clients_document_idx").on(table.document),
}));

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Products/Services table
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 50 }),
  category: varchar("category", { length: 100 }),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }), // un, m, m2, h, etc.
  stock: int("stock").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  companyIdIdx: index("products_companyId_idx").on(table.companyId),
  skuIdx: index("products_sku_idx").on(table.sku),
}));

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Professionals/Labor table
 */
export const professionals = mysqlTable("professionals", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),
  dailyRate: decimal("dailyRate", { precision: 10, scale: 2 }),
  commissionPercentage: decimal("commissionPercentage", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  companyIdIdx: index("professionals_companyId_idx").on(table.companyId),
}));

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = typeof professionals.$inferInsert;

/**
 * Suppliers table
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  document: varchar("document", { length: 20 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  companyIdIdx: index("suppliers_companyId_idx").on(table.companyId),
}));

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Document themes/templates
 */
export const themes = mysqlTable("themes", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  layout: mysqlEnum("layout", ["minimalista", "clássico", "técnico"]).notNull(),
  primaryColor: varchar("primaryColor", { length: 7 }), // Hex color
  secondaryColor: varchar("secondaryColor", { length: 7 }),
  accentColor: varchar("accentColor", { length: 7 }),
  fontFamily: varchar("fontFamily", { length: 100 }),
  customFields: json("customFields"), // JSON array of custom field definitions
  watermarkUrl: varchar("watermarkUrl", { length: 500 }),
  watermarkStorageKey: varchar("watermarkStorageKey", { length: 255 }),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  companyIdIdx: index("themes_companyId_idx").on(table.companyId),
}));

export type Theme = typeof themes.$inferSelect;
export type InsertTheme = typeof themes.$inferInsert;

/**
 * Quotations (Orçamentos)
 */
export const quotations = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  clientId: int("clientId").notNull(),
  number: varchar("number", { length: 20 }).notNull(), // ORC-001, ORC-002, etc.
  status: mysqlEnum("status", ["rascunho", "enviado", "aprovado", "rejeitado", "vencido", "convertido"]).default("rascunho").notNull(),
  description: text("description"),
  notes: text("notes"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0"),
  discountPercentage: decimal("discountPercentage", { precision: 5, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 12, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).default("0").notNull(),
  validUntil: datetime("validUntil"),
  paymentTerms: varchar("paymentTerms", { length: 255 }),
  // Campos do modelo profissional
  workLocation: text("workLocation"),
  issPercentage: decimal("issPercentage", { precision: 5, scale: 2 }).default("0"),
  icmsPercentage: decimal("icmsPercentage", { precision: 5, scale: 2 }).default("0"),
  pixHolder: varchar("pixHolder", { length: 255 }),
  pixBank: varchar("pixBank", { length: 255 }),
  pixKey: varchar("pixKey", { length: 255 }),
  paymentConditions: text("paymentConditions"),
  paymentMethodDescription: text("paymentMethodDescription"),
  serviceDescription: text("serviceDescription"),
  deliveryEstimate: text("deliveryEstimate"),
  legalNotice: text("legalNotice"),
  themeId: int("themeId"),
  qrCodeUrl: varchar("qrCodeUrl", { length: 500 }),
  qrCodeStorageKey: varchar("qrCodeStorageKey", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  companyIdIdx: index("quotations_companyId_idx").on(table.companyId),
  clientIdIdx: index("quotations_clientId_idx").on(table.clientId),
  numberIdx: index("quotations_number_idx").on(table.number),
  statusIdx: index("quotations_status_idx").on(table.status),
}));

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

/**
 * Quotation items
 */
export const quotationItems = mysqlTable("quotationItems", {
  id: int("id").autoincrement().primaryKey(),
  quotationId: int("quotationId").notNull(),
  productId: int("productId"),
  description: varchar("description", { length: 255 }).notNull(),
  itemType: varchar("itemType", { length: 100 }), // Tipo do item (ex: "Mão de obra + material")
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  quotationIdIdx: index("quotationItems_quotationId_idx").on(table.quotationId),
}));

export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = typeof quotationItems.$inferInsert;

/**
 * Invoices (Faturas)
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  clientId: int("clientId").notNull(),
  quotationId: int("quotationId"),
  number: varchar("number", { length: 20 }).notNull(), // FAT-001, FAT-002, etc.
  status: mysqlEnum("status", ["rascunho", "enviado", "aprovado", "parcialmente_pago", "pago", "vencido", "cancelado"]).default("rascunho").notNull(),
  description: text("description"),
  notes: text("notes"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0"),
  discountPercentage: decimal("discountPercentage", { precision: 5, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 12, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).default("0").notNull(),
  dueDate: datetime("dueDate"),
  paymentTerms: varchar("paymentTerms", { length: 255 }),
  themeId: int("themeId"),
  qrCodeUrl: varchar("qrCodeUrl", { length: 500 }),
  qrCodeStorageKey: varchar("qrCodeStorageKey", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  companyIdIdx: index("invoices_companyId_idx").on(table.companyId),
  clientIdIdx: index("invoices_clientId_idx").on(table.clientId),
  numberIdx: index("invoices_number_idx").on(table.number),
  statusIdx: index("invoices_status_idx").on(table.status),
}));

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Invoice items
 */
export const invoiceItems = mysqlTable("invoiceItems", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  productId: int("productId"),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  invoiceIdIdx: index("invoiceItems_invoiceId_idx").on(table.invoiceId),
}));

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = typeof invoiceItems.$inferInsert;

/**
 * Payments
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }), // Dinheiro, Cartão, Transferência, etc.
  paymentDate: datetime("paymentDate").notNull(),
  reference: varchar("reference", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  invoiceIdIdx: index("payments_invoiceId_idx").on(table.invoiceId),
}));

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Document versions (history)
 */
export const documentVersions = mysqlTable("documentVersions", {
  id: int("id").autoincrement().primaryKey(),
  documentType: mysqlEnum("documentType", ["quotation", "invoice"]).notNull(),
  documentId: int("documentId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  data: json("data").notNull(), // Complete document snapshot
  changedBy: int("changedBy"),
  changeReason: text("changeReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  documentTypeIdIdx: index("documentVersions_documentTypeId_idx").on(table.documentType, table.documentId),
}));

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;

/**
 * QR Code validations (tracking)
 */
export const qrCodeValidations = mysqlTable("qrCodeValidations", {
  id: int("id").autoincrement().primaryKey(),
  documentType: mysqlEnum("documentType", ["quotation", "invoice"]).notNull(),
  documentId: int("documentId").notNull(),
  scannedAt: timestamp("scannedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
}, (table) => ({
  documentTypeIdIdx: index("qrCodeValidations_documentTypeId_idx").on(table.documentType, table.documentId),
}));

export type QRCodeValidation = typeof qrCodeValidations.$inferSelect;
export type InsertQRCodeValidation = typeof qrCodeValidations.$inferInsert;

/**
 * Notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // quotation_approved, invoice_due, payment_received, etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  relatedDocumentType: mysqlEnum("relatedDocumentType", ["quotation", "invoice"]),
  relatedDocumentId: int("relatedDocumentId"),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("notifications_userId_idx").on(table.userId),
  isReadIdx: index("notifications_isRead_idx").on(table.isRead),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Price suggestions (AI-powered)
 */
export const priceSuggestions = mysqlTable("priceSuggestions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  productId: int("productId").notNull(),
  suggestedPrice: decimal("suggestedPrice", { precision: 12, scale: 2 }).notNull(),
  basedOnQuotations: int("basedOnQuotations").default(0),
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0.0 to 1.0
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: datetime("expiresAt"),
}, (table) => ({
  companyIdIdx: index("priceSuggestions_companyId_idx").on(table.companyId),
  productIdIdx: index("priceSuggestions_productId_idx").on(table.productId),
}));

export type PriceSuggestion = typeof priceSuggestions.$inferSelect;
export type InsertPriceSuggestion = typeof priceSuggestions.$inferInsert;

/**
 * Document PDFs (storage metadata)
 */
export const documentPdfs = mysqlTable("documentPdfs", {
  id: int("id").autoincrement().primaryKey(),
  documentType: mysqlEnum("documentType", ["quotation", "invoice"]).notNull(),
  documentId: int("documentId").notNull(),
  pdfUrl: varchar("pdfUrl", { length: 500 }).notNull(),
  pdfStorageKey: varchar("pdfStorageKey", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  documentTypeIdIdx: index("documentPdfs_documentTypeId_idx").on(table.documentType, table.documentId),
}));

export type DocumentPdf = typeof documentPdfs.$inferSelect;
export type InsertDocumentPdf = typeof documentPdfs.$inferInsert;

/**
 * Expenses table for financial control
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paidDate: timestamp("paidDate"),
  status: mysqlEnum("status", ["pendente", "pago", "atrasado", "cancelado"]).default("pendente").notNull(),
  supplierName: varchar("supplierName", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  companyIdIdx: index("expenses_companyId_idx").on(table.companyId),
  statusIdx: index("expenses_status_idx").on(table.status),
}));

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;
