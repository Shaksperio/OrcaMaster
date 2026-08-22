import { randomBytes } from "node:crypto";
import * as db from "./db";
import { syncToFirebase } from "./firebase-sync";

export const ASSISTANT_ACTIONS = [
  "product.create", "product.update", "product.delete",
  "supplier.create", "supplier.update", "supplier.delete",
  "quotation.updateStatus", "quotation.delete",
  "invoice.updateStatus", "invoice.delete",
  "expense.updateStatus", "expense.delete", "company.update",
] as const;

export type AssistantAction = (typeof ASSISTANT_ACTIONS)[number];
export type AssistantActionPayload = Record<string, unknown>;
export type AssistantActionCategory = "operacional" | "financeira" | "administrativa";
export type AssistantActionPolicy = { category: AssistantActionCategory; roles: readonly ["owner"] };

export const ASSISTANT_ACTION_POLICY: Record<AssistantAction, AssistantActionPolicy> = {
  "product.create": { category: "operacional", roles: ["owner"] },
  "product.update": { category: "operacional", roles: ["owner"] },
  "product.delete": { category: "operacional", roles: ["owner"] },
  "supplier.create": { category: "operacional", roles: ["owner"] },
  "supplier.update": { category: "operacional", roles: ["owner"] },
  "supplier.delete": { category: "operacional", roles: ["owner"] },
  "quotation.updateStatus": { category: "operacional", roles: ["owner"] },
  "quotation.delete": { category: "operacional", roles: ["owner"] },
  "invoice.updateStatus": { category: "financeira", roles: ["owner"] },
  "invoice.delete": { category: "financeira", roles: ["owner"] },
  "expense.updateStatus": { category: "financeira", roles: ["owner"] },
  "expense.delete": { category: "financeira", roles: ["owner"] },
  "company.update": { category: "administrativa", roles: ["owner"] },
};

export function getAssistantActionPolicy(action: AssistantAction) {
  return ASSISTANT_ACTION_POLICY[action];
}

const PRODUCT_FIELDS = ["name", "description", "price", "unit", "sku", "category", "stock", "minStock"] as const;
const SUPPLIER_FIELDS = ["name", "document", "email", "phone", "address", "notes"] as const;
const COMPANY_FIELDS = ["name", "document", "email", "phone", "address", "city", "state", "zipCode"] as const;
const QUOTATION_STATUSES = ["rascunho", "enviado", "aprovado", "rejeitado", "vencido", "convertido"];
const INVOICE_STATUSES = ["rascunho", "enviado", "aprovado", "parcialmente_pago", "pago", "vencido", "cancelado"];
const EXPENSE_STATUSES = ["pendente", "pago", "atrasado", "cancelado"];

function pickFields(payload: AssistantActionPayload, fields: readonly string[]) {
  return Object.fromEntries(fields.filter((field) => payload[field] !== undefined).map((field) => [field, payload[field]]));
}

function validStatus(value: unknown, allowed: string[]) {
  if (typeof value !== "string" || !allowed.includes(value)) throw new Error("Status inválido para esta ação.");
  return value;
}

function token() {
  return randomBytes(32).toString("hex");
}

function preview(action: AssistantAction, payload: AssistantActionPayload) {
  return {
    action,
    payload,
    warning: action.endsWith(".delete") ? "Esta ação excluirá dados e não deve ser executada sem sua confirmação." : "Nenhuma alteração será executada antes da confirmação explícita.",
  };
}

async function ensureTargetCompany(action: AssistantAction, companyId: number, payload: AssistantActionPayload) {
  const id = typeof payload.id === "number" ? payload.id : undefined;
  if (action === "company.update") {
    const company = await db.getCompanyById(companyId);
    if (!company) throw new Error("Empresa não encontrada.");
    return;
  }
  if (!id && !action.endsWith(".create")) throw new Error("A ação exige um identificador válido.");
  if (!id) return;
  const entity = action.startsWith("product.") ? await db.getProductById(id)
    : action.startsWith("supplier.") ? await db.getSupplierById(id)
    : action.startsWith("quotation.") ? await db.getQuotationById(id)
    : action.startsWith("invoice.") ? await db.getInvoiceById(id)
    : action.startsWith("expense.") ? (await db.getCompanyExpenses(companyId)).find((item: any) => item.id === id)
    : undefined;
  if (!entity || ("companyId" in entity && entity.companyId !== companyId)) throw new Error("Registro não encontrado nesta empresa.");
}

export async function prepareAssistantAction(companyId: number, userId: number, action: AssistantAction, payload: AssistantActionPayload) {
  if (!ASSISTANT_ACTIONS.includes(action)) throw new Error("Ação não permitida pelo Assistente.");
  await ensureTargetCompany(action, companyId, payload);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const confirmationToken = token();
  await db.createAssistantActionConfirmation({ companyId, userId, action, payload, confirmationToken, expiresAt, status: "pending" });
  return { confirmationToken, expiresAt, preview: preview(action, payload) };
}

async function execute(action: AssistantAction, companyId: number, payload: AssistantActionPayload) {
  const id = typeof payload.id === "number" ? payload.id : undefined;
  switch (action) {
    case "product.create": {
      const created = await db.createProduct({ companyId, name: String(payload.name ?? ""), description: typeof payload.description === "string" ? payload.description : null, price: String(payload.price ?? "0"), unit: typeof payload.unit === "string" ? payload.unit : null, sku: typeof payload.sku === "string" ? payload.sku : null, category: typeof payload.category === "string" ? payload.category : null } as any);
      if (created?.insertId) syncToFirebase("product", Number(created.insertId), { ...created, id: Number(created.insertId) }, { companyId });
      return created;
    }
    case "product.update": {
      if (!id) throw new Error("Produto inválido.");
      const updated = await db.updateProduct(id, pickFields(payload, PRODUCT_FIELDS) as any);
      if (updated) syncToFirebase("product", id, { ...updated }, { companyId });
      return updated;
    }
    case "product.delete":
      if (!id) throw new Error("Produto inválido.");
      await db.deleteProduct(id); syncToFirebase("product", id, null, { companyId }); return { id };
    case "supplier.create": {
      const created = await db.createSupplier({ companyId, name: String(payload.name ?? ""), document: typeof payload.document === "string" ? payload.document : null, email: typeof payload.email === "string" ? payload.email : null, phone: typeof payload.phone === "string" ? payload.phone : null, address: typeof payload.address === "string" ? payload.address : null, notes: typeof payload.notes === "string" ? payload.notes : null } as any);
      if (created?.insertId) syncToFirebase("supplier", Number(created.insertId), { ...created, id: Number(created.insertId) }, { companyId });
      return created;
    }
    case "supplier.update":
      if (!id) throw new Error("Fornecedor inválido.");
      { const updated = await db.updateSupplier(id, pickFields(payload, SUPPLIER_FIELDS) as any); if (updated) syncToFirebase("supplier", id, { ...updated }, { companyId }); return updated; }
    case "supplier.delete":
      if (!id) throw new Error("Fornecedor inválido.");
      await db.deleteSupplier(id); syncToFirebase("supplier", id, null, { companyId }); return { id };
    case "quotation.updateStatus":
      if (!id || typeof payload.status !== "string") throw new Error("Orçamento ou status inválido.");
      const status = validStatus(payload.status, QUOTATION_STATUSES); await db.updateQuotationStatus(id, status); return { id, status };
    case "quotation.delete":
      if (!id) throw new Error("Orçamento inválido.");
      await db.deleteQuotation(id); syncToFirebase("quotation", id, null, { companyId }); return { id };
    case "invoice.updateStatus":
      if (!id || typeof payload.status !== "string") throw new Error("Fatura ou status inválido.");
      const invoiceStatus = validStatus(payload.status, INVOICE_STATUSES); await db.updateInvoiceStatus(id, invoiceStatus); return { id, status: invoiceStatus };
    case "invoice.delete":
      if (!id) throw new Error("Fatura inválida.");
      await db.deleteInvoice(id); syncToFirebase("invoice", id, null, { companyId }); return { id };
    case "expense.updateStatus":
      if (!id || typeof payload.status !== "string") throw new Error("Despesa ou status inválido.");
      const expenseStatus = validStatus(payload.status, EXPENSE_STATUSES); await db.updateExpenseStatus(id, expenseStatus); return { id, status: expenseStatus };
    case "expense.delete":
      if (!id) throw new Error("Despesa inválida.");
      await db.deleteExpense(id); return { id };
    case "company.update": {
      await db.updateCompany(companyId, pickFields(payload, COMPANY_FIELDS) as any); return { companyId };
    }
  }
}

export async function confirmAssistantAction(companyId: number, userId: number, confirmationToken: string) {
  const confirmation = await db.getAssistantActionConfirmationByToken(confirmationToken);
  if (!confirmation || confirmation.companyId !== companyId || confirmation.userId !== userId) throw new Error("Confirmação inválida ou sem autorização.");
  if (confirmation.status !== "pending") throw new Error("Esta ação já foi confirmada ou cancelada.");
  if (new Date(confirmation.expiresAt).getTime() <= Date.now()) {
    await db.updateAssistantActionConfirmation(confirmation.id, { status: "expired" });
    throw new Error("A confirmação expirou. Solicite uma nova prévia.");
  }
  const result = await execute(confirmation.action as AssistantAction, companyId, confirmation.payload as AssistantActionPayload);
  await db.updateAssistantActionConfirmation(confirmation.id, { status: "executed", executedAt: new Date() });
  return { result, action: confirmation.action };
}
