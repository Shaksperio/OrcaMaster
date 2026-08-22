import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import type { Express, Request, Response } from "express";
import { google } from "googleapis";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { companies, clients, companyMembers, expenses, googleDriveBackups, googleDriveConnections, invoiceItems, invoices, products, professionals, quotationItems, quotations, suppliers, themes } from "../drizzle/schema";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const CIPHER = "aes-256-gcm";
const STATE_TTL = 10 * 60 * 1000;
let queuedCompanies = new Set<number>();
let processingQueue = false;

function key() {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET não configurado.");
  return createHash("sha256").update(process.env.JWT_SECRET).digest();
}
function encrypt(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv(CIPHER, key(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${data.toString("base64url")}`;
}
function decrypt(value: string) {
  const [iv, tag, data] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv(CIPHER, key(), iv); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
function signature(payload: string) { return createHmac("sha256", key()).update(payload).digest("base64url"); }
function makeState(companyId: number, userId: number, origin: string) {
  const payload = Buffer.from(JSON.stringify({ companyId, userId, origin, exp: Date.now() + STATE_TTL })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
export function parseDriveState(state: string) {
  const [payload, sig] = state.split(".");
  if (!payload || !sig || signature(payload) !== sig) throw new Error("Estado OAuth inválido.");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { companyId: number; userId: number; origin: string; exp: number };
  if (!parsed.companyId || !parsed.userId || !/^https?:\/\//.test(parsed.origin) || parsed.exp < Date.now()) throw new Error("Estado OAuth expirado.");
  return parsed;
}
export function isGoogleDriveConfigured() { return Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET); }
function oauth(redirectUri: string) {
  if (!isGoogleDriveConfigured()) throw new Error("Google Drive não configurado no servidor.");
  return new google.auth.OAuth2(process.env.GOOGLE_DRIVE_CLIENT_ID, process.env.GOOGLE_DRIVE_CLIENT_SECRET, redirectUri);
}
export function createDriveAuthorizationUrl(companyId: number, userId: number, origin: string) {
  return oauth(`${origin}/api/google-drive/callback`).generateAuthUrl({ access_type: "offline", prompt: "consent", scope: [DRIVE_SCOPE, "https://www.googleapis.com/auth/userinfo.email"], state: makeState(companyId, userId, origin) });
}
export async function completeDriveAuthorization(code: string, state: string) {
  const parsed = parseDriveState(state); const client = oauth(`${parsed.origin}/api/google-drive/callback`);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new Error("O Google não forneceu token de renovação; autorize novamente.");
  client.setCredentials(tokens);
  const userInfo = await google.oauth2({ version: "v2", auth: client }).userinfo.get();
  const database = await getDb(); if (!database) throw new Error("Banco de dados indisponível.");
  const values = { companyId: parsed.companyId, userId: parsed.userId, driveEmail: userInfo.data.email ?? null, accessTokenEncrypted: encrypt(tokens.access_token ?? ""), refreshTokenEncrypted: encrypt(tokens.refresh_token), scope: tokens.scope ?? DRIVE_SCOPE, enabled: true, autoBackupEnabled: false, lastError: null };
  await database.insert(googleDriveConnections).values(values).onDuplicateKeyUpdate({ set: values });
  return parsed;
}
export async function getDriveConnection(companyId: number) {
  const database = await getDb(); if (!database) return undefined;
  return (await database.select().from(googleDriveConnections).where(eq(googleDriveConnections.companyId, companyId)).limit(1))[0];
}
export async function listDriveBackups(companyId: number) {
  const database = await getDb(); if (!database) return [];
  return database.select({ id: googleDriveBackups.id, driveFileId: googleDriveBackups.driveFileId, fileName: googleDriveBackups.fileName, checksum: googleDriveBackups.checksum, byteSize: googleDriveBackups.byteSize, status: googleDriveBackups.status, errorMessage: googleDriveBackups.errorMessage, createdAt: googleDriveBackups.createdAt, completedAt: googleDriveBackups.completedAt }).from(googleDriveBackups).where(eq(googleDriveBackups.companyId, companyId)).orderBy(desc(googleDriveBackups.createdAt)).limit(50);
}
export async function setDrivePreferences(companyId: number, enabled: boolean, autoBackupEnabled: boolean) {
  if (autoBackupEnabled && !enabled) throw new Error("O backup automático exige uma conexão Drive ativa.");
  const database = await getDb(); if (!database) throw new Error("Banco de dados indisponível.");
  await database.update(googleDriveConnections).set({ enabled, autoBackupEnabled, lastError: null }).where(eq(googleDriveConnections.companyId, companyId));
  return getDriveConnection(companyId);
}
async function buildSnapshot(companyId: number) {
  const database = await getDb(); if (!database) throw new Error("Banco de dados indisponível.");
  const [company, companyClients, companyProducts, companyProfessionals, companySuppliers, companyQuotations, companyInvoices, companyExpenses, companyThemes, members] = await Promise.all([
    database.select().from(companies).where(eq(companies.id, companyId)).limit(1), database.select().from(clients).where(eq(clients.companyId, companyId)), database.select().from(products).where(eq(products.companyId, companyId)), database.select().from(professionals).where(eq(professionals.companyId, companyId)), database.select().from(suppliers).where(eq(suppliers.companyId, companyId)), database.select().from(quotations).where(eq(quotations.companyId, companyId)), database.select().from(invoices).where(eq(invoices.companyId, companyId)), database.select().from(expenses).where(eq(expenses.companyId, companyId)), database.select().from(themes).where(eq(themes.companyId, companyId)), database.select().from(companyMembers).where(eq(companyMembers.companyId, companyId)),
  ]);
  const [quotationItemsRows, invoiceItemsRows] = await Promise.all([
    companyQuotations.length ? database.select().from(quotationItems).where(inArray(quotationItems.quotationId, companyQuotations.map((row) => row.id))) : Promise.resolve([]),
    companyInvoices.length ? database.select().from(invoiceItems).where(inArray(invoiceItems.invoiceId, companyInvoices.map((row) => row.id))) : Promise.resolve([]),
  ]);
  return { format: "orcamaster-backup", version: 1, exportedAt: new Date().toISOString(), company: company[0] ?? null, clients: companyClients, products: companyProducts, professionals: companyProfessionals, suppliers: companySuppliers, quotations: companyQuotations, quotationItems: quotationItemsRows, invoices: companyInvoices, invoiceItems: invoiceItemsRows, expenses: companyExpenses, themes: companyThemes, companyMembers: members };
}
export async function uploadCompanyBackup(companyId: number) {
  const connection = await getDriveConnection(companyId); if (!connection?.enabled) throw new Error("Google Drive não está conectado.");
  const database = await getDb(); if (!database) throw new Error("Banco de dados indisponível.");
  const content = JSON.stringify(await buildSnapshot(companyId), null, 2); const checksum = createHash("sha256").update(content).digest("hex"); const fileName = `orcamaster-${companyId}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const pending = await database.insert(googleDriveBackups).values({ companyId, connectionId: connection.id, fileName, checksum, byteSize: Buffer.byteLength(content), status: "pending" }); const backupId = Number(pending[0].insertId);
  try {
    const client = oauth("http://localhost"); client.setCredentials({ access_token: decrypt(connection.accessTokenEncrypted), refresh_token: decrypt(connection.refreshTokenEncrypted) });
    const uploaded = await google.drive({ version: "v3", auth: client }).files.create({ requestBody: { name: fileName, description: "Snapshot versionado do OrçaMaster; não alterar manualmente.", mimeType: "application/json" }, media: { mimeType: "application/json", body: Buffer.from(content) }, fields: "id" });
    await database.update(googleDriveBackups).set({ driveFileId: uploaded.data.id ?? null, status: "uploaded", completedAt: new Date(), errorMessage: null }).where(eq(googleDriveBackups.id, backupId)); await database.update(googleDriveConnections).set({ lastBackupAt: new Date(), lastError: null }).where(eq(googleDriveConnections.id, connection.id));
    return { id: backupId, fileId: uploaded.data.id, fileName, byteSize: Buffer.byteLength(content), status: "uploaded" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Falha desconhecida no upload."; await database.update(googleDriveBackups).set({ status: "failed", errorMessage: message }).where(eq(googleDriveBackups.id, backupId)); await database.update(googleDriveConnections).set({ lastError: message }).where(eq(googleDriveConnections.id, connection.id)); throw error;
  }
}
export function queueCompanyBackup(companyId: number) {
  if (queuedCompanies.has(companyId)) return;
  queuedCompanies.add(companyId);
  queueMicrotask(async () => {
    if (processingQueue) return;
    processingQueue = true;
    try {
      while (queuedCompanies.size) {
        const next = queuedCompanies.values().next().value as number | undefined; if (!next) break; queuedCompanies.delete(next);
        const connection = await getDriveConnection(next); if (connection?.enabled && connection.autoBackupEnabled) await uploadCompanyBackup(next).catch((error) => console.warn("[Google Drive] backup automático falhou:", error instanceof Error ? error.message : error));
      }
    } finally { processingQueue = false; }
  });
}
export function registerGoogleDriveRoutes(app: Express) {
  app.get("/api/google-drive/callback", async (req: Request, res: Response) => {
    const state = typeof req.query.state === "string" ? req.query.state : "";
    try { if (typeof req.query.code !== "string") throw new Error("Resposta OAuth incompleta."); const parsed = await completeDriveAuthorization(req.query.code, state); res.redirect(`${parsed.origin}/settings?drive=connected`); }
    catch (error) { const message = error instanceof Error ? error.message : "Não foi possível conectar o Google Drive."; try { const parsed = parseDriveState(state); res.redirect(`${parsed.origin}/settings?drive=error&message=${encodeURIComponent(message)}`); } catch { res.status(400).send("Não foi possível concluir a conexão com o Google Drive."); } }
  });
}

async function downloadBackupPayload(companyId: number, backupId: number) {
  const database = await getDb(); if (!database) throw new Error("Banco de dados indisponível.");
  const backup = (await database.select().from(googleDriveBackups).where(eq(googleDriveBackups.id, backupId)).limit(1))[0];
  if (!backup || backup.companyId !== companyId || backup.status !== "uploaded" || !backup.driveFileId) throw new Error("Backup não encontrado para esta empresa.");
  const connection = await getDriveConnection(companyId); if (!connection?.enabled || connection.id !== backup.connectionId) throw new Error("Conexão do backup não está ativa.");
  const client = oauth("http://localhost"); client.setCredentials({ access_token: decrypt(connection.accessTokenEncrypted), refresh_token: decrypt(connection.refreshTokenEncrypted) });
  const response = await google.drive({ version: "v3", auth: client }).files.get({ fileId: backup.driveFileId, alt: "media" }, { responseType: "arraybuffer" });
  const payload = JSON.parse(Buffer.from(response.data as ArrayBuffer).toString("utf8")) as any;
  if (payload?.format !== "orcamaster-backup" || payload?.version !== 1 || Number(payload?.company?.id) !== companyId) throw new Error("Snapshot incompatível ou pertencente a outra empresa.");
  const arrays = ["clients", "products", "professionals", "suppliers", "quotations", "quotationItems", "invoices", "invoiceItems", "expenses", "themes", "companyMembers"];
  if (arrays.some((name) => !Array.isArray(payload[name]))) throw new Error("Snapshot incompleto ou inválido.");
  return payload;
}
export async function previewCompanyBackup(companyId: number, backupId: number) {
  const payload = await downloadBackupPayload(companyId, backupId);
  return { backupId, exportedAt: payload.exportedAt, companyName: payload.company?.name ?? "", counts: Object.fromEntries(["clients", "products", "professionals", "suppliers", "quotations", "quotationItems", "invoices", "invoiceItems", "expenses", "themes", "companyMembers"].map((key) => [key, payload[key].length])) };
}
export async function restoreCompanyBackup(companyId: number, backupId: number) {
  const payload = await downloadBackupPayload(companyId, backupId); const database = await getDb(); if (!database) throw new Error("Banco de dados indisponível.");
  const companyRows = [payload.clients, payload.products, payload.professionals, payload.suppliers, payload.quotations, payload.invoices, payload.expenses, payload.themes];
  if (companyRows.some((rows: any[]) => rows.some((row) => Number(row.companyId) !== companyId))) throw new Error("Snapshot contém registros de outra empresa.");
  const quotationIds = new Set(payload.quotations.map((row: any) => Number(row.id))); const invoiceIds = new Set(payload.invoices.map((row: any) => Number(row.id)));
  if (payload.quotationItems.some((row: any) => !quotationIds.has(Number(row.quotationId))) || payload.invoiceItems.some((row: any) => !invoiceIds.has(Number(row.invoiceId)))) throw new Error("Snapshot contém itens sem documento pai válido.");
  if (payload.companyMembers.some((row: any) => Number(row.companyId) !== companyId)) throw new Error("Snapshot contém membros de outra empresa.");
  const normalizeRow = (row: any) => Object.fromEntries(Object.entries(row).map(([name, value]) => [name, typeof value === "string" && /(At|Date)$/.test(name) && !Number.isNaN(Date.parse(value)) ? new Date(value) : value]));
  const upsert = async (table: any, rows: any[]) => { for (const original of rows) { const row = normalizeRow(original); const set = Object.fromEntries(Object.keys(row).filter((key) => key !== "id" && key !== "createdAt").map((key) => [key, row[key]])); await database.insert(table).values(row).onDuplicateKeyUpdate({ set }); } };
  await database.update(companies).set({ name: payload.company.name, document: payload.company.document, email: payload.company.email, phone: payload.company.phone, address: payload.company.address, city: payload.company.city, state: payload.company.state, zipCode: payload.company.zipCode, logoUrl: payload.company.logoUrl, logoStorageKey: payload.company.logoStorageKey, currency: payload.company.currency, language: payload.company.language, taxRegime: payload.company.taxRegime }).where(eq(companies.id, companyId));
  await upsert(clients, payload.clients); await upsert(products, payload.products); await upsert(professionals, payload.professionals); await upsert(suppliers, payload.suppliers); await upsert(quotations, payload.quotations); await upsert(quotationItems, payload.quotationItems); await upsert(invoices, payload.invoices); await upsert(invoiceItems, payload.invoiceItems); await upsert(expenses, payload.expenses); await upsert(themes, payload.themes); await upsert(companyMembers, payload.companyMembers);
  const { syncFullCompany } = await import("./firebase-sync");
  await syncFullCompany(companyId, payload.company, payload.clients, payload.products, payload.professionals, payload.quotations, payload.invoices);
  return { backupId, restoredAt: new Date(), counts: await previewCompanyBackup(companyId, backupId) };
}
