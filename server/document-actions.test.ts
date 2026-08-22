import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { dbMocks, syncToFirebase } = vi.hoisted(() => ({
  dbMocks: {
    getCompanyById: vi.fn(),
    getUserCompanyRole: vi.fn(),
    getQuotationById: vi.fn(),
    getQuotationItems: vi.fn(),
    getInvoiceById: vi.fn(),
    getInvoiceItems: vi.fn(),
    getNextQuotationNumber: vi.fn(),
    getNextInvoiceNumber: vi.fn(),
    createQuotation: vi.fn(),
    createQuotationItems: vi.fn(),
    createInvoice: vi.fn(),
    createInvoiceItems: vi.fn(),
    getDocumentVersions: vi.fn(),
    getNextDocumentVersionNumber: vi.fn(),
    createDocumentVersion: vi.fn(),
  },
  syncToFirebase: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./firebase-sync", () => ({ syncToFirebase }));

import { appRouter } from "./routers";

const user = {
  id: 5,
  openId: "doc-test-user",
  email: "doc@example.com",
  name: "Document Test",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const context: TrpcContext = {
  user,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

const quotation = {
  id: 10, companyId: 42, clientId: 3, number: "ORC-010", status: "aprovado",
  description: "Obra real", notes: "Condições reais", subtotal: "100.00", discount: "0",
  discountPercentage: "0", tax: "0", total: "100.00", validUntil: null, paymentTerms: "PIX",
  workLocation: null, issPercentage: "0", icmsPercentage: "0", pixHolder: null, pixBank: null,
  pixKey: null, paymentConditions: null, paymentMethodDescription: null, serviceDescription: null,
  deliveryEstimate: null, legalNotice: null, themeId: null,
};
const invoice = {
  id: 20, companyId: 42, clientId: 3, quotationId: 10, number: "FAT-020", status: "pago",
  description: "Fatura real", notes: "Notas reais", subtotal: "100.00", discount: "0",
  discountPercentage: "0", tax: "0", total: "100.00", dueDate: null, paymentTerms: "PIX", themeId: null,
};
const quotationItems = [{ id: 1, quotationId: 10, productId: 7, description: "Item real", itemType: null, quantity: "1", unit: "un", unitPrice: "100", discount: "0", total: "100", createdAt: new Date() }];
const invoiceItems = [{ id: 2, invoiceId: 20, productId: 7, description: "Item real", quantity: "1", unit: "un", unitPrice: "100", discount: "0", total: "100", createdAt: new Date() }];

beforeEach(() => {
  vi.resetAllMocks();
  dbMocks.getCompanyById.mockResolvedValue({ id: 42, userId: 5, name: "Empresa teste" });
  dbMocks.getUserCompanyRole.mockResolvedValue(undefined);
  dbMocks.getQuotationItems.mockResolvedValue(quotationItems);
  dbMocks.getInvoiceItems.mockResolvedValue(invoiceItems);
  dbMocks.getDocumentVersions.mockResolvedValue([{ id: 1, documentType: "quotation", documentId: 10, versionNumber: 1 }]);
  dbMocks.getNextDocumentVersionNumber.mockResolvedValue(2);
  dbMocks.createDocumentVersion.mockResolvedValue({ insertId: 2 });
});

describe("Ações de documentos", () => {
  it("lista versões de um orçamento após validar a empresa", async () => {
    dbMocks.getQuotationById.mockResolvedValue(quotation);
    dbMocks.getDocumentVersions.mockResolvedValue([{ id: 1, documentType: "quotation", documentId: 10, versionNumber: 1, data: { number: "ORC-010", total: "100.00" } }]);
    const result = await appRouter.createCaller(context).quotations.versions({ id: 10 });
    expect(result).toHaveLength(1);
    expect(result[0]?.data).toEqual({ number: "ORC-010", total: "100.00" });
    expect(dbMocks.getDocumentVersions).toHaveBeenCalledWith("quotation", 10);
  });

  it("duplica orçamento como rascunho e cria snapshot inicial", async () => {
    dbMocks.getQuotationById.mockResolvedValueOnce(quotation).mockResolvedValue({ ...quotation, id: 11, number: "ORC-011", status: "rascunho" });
    dbMocks.getNextQuotationNumber.mockResolvedValue("ORC-011");
    dbMocks.createQuotation.mockResolvedValue({ id: 11 });
    const result = await appRouter.createCaller(context).quotations.duplicate({ id: 10 });
    expect(result).toEqual({ id: 11, number: "ORC-011" });
    expect(dbMocks.createQuotation).toHaveBeenCalledWith(expect.objectContaining({ number: "ORC-011", status: "rascunho", clientId: 3 }));
    expect(dbMocks.createQuotationItems).toHaveBeenCalled();
    expect(syncToFirebase).toHaveBeenCalledWith("quotation", 11, expect.objectContaining({ id: 11, number: "ORC-011", items: [expect.objectContaining({ quotationId: 11, description: "Item real" })] }), { companyId: 42 });
    expect(syncToFirebase.mock.calls[0]?.[2]?.items?.[0]).not.toHaveProperty("id");
    expect(dbMocks.createDocumentVersion).toHaveBeenCalledWith(expect.objectContaining({ documentType: "quotation", documentId: 11, versionNumber: 2, changedBy: 5, data: expect.objectContaining({ number: "ORC-011" }) }));
  });

  it("duplica fatura com itens e registra versão", async () => {
    dbMocks.getInvoiceById.mockResolvedValueOnce(invoice).mockResolvedValue({ ...invoice, id: 21, number: "FAT-021", status: "rascunho" });
    dbMocks.getNextInvoiceNumber.mockResolvedValue("FAT-021");
    dbMocks.createInvoice.mockResolvedValue({ id: 21 });
    const result = await appRouter.createCaller(context).invoices.duplicate({ id: 20 });
    expect(result).toEqual({ id: 21, number: "FAT-021" });
    expect(dbMocks.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ quotationId: 10, number: "FAT-021", status: "rascunho" }));
    expect(dbMocks.createInvoiceItems).toHaveBeenCalled();
    expect(syncToFirebase).toHaveBeenCalledWith("invoice", 21, expect.objectContaining({ id: 21, number: "FAT-021", items: [expect.objectContaining({ invoiceId: 21, description: "Item real" })] }), { companyId: 42 });
    expect(syncToFirebase.mock.calls[0]?.[2]?.items?.[0]).not.toHaveProperty("id");
    expect(dbMocks.createDocumentVersion).toHaveBeenCalledWith(expect.objectContaining({ documentType: "invoice", documentId: 21, changedBy: 5, data: expect.objectContaining({ number: "FAT-021" }) }));
  });

  it("nega duplicação quando o documento pertence a outra empresa", async () => {
    dbMocks.getQuotationById.mockResolvedValue({ ...quotation, companyId: 99 });
    dbMocks.getCompanyById.mockResolvedValue({ id: 99, userId: 77, name: "Outra empresa" });
    await expect(appRouter.createCaller(context).quotations.duplicate({ id: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
