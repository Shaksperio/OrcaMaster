import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";

const {
  authenticateRequest,
  getQuotationById,
  getClientById,
  getCompanyById,
  getQuotationItems,
  generateQuotationPDF,
} = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getQuotationById: vi.fn(),
  getClientById: vi.fn(),
  getCompanyById: vi.fn(),
  getQuotationItems: vi.fn(),
  generateQuotationPDF: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest } }));
vi.mock("./db", () => ({ getQuotationById, getClientById, getCompanyById, getQuotationItems }));
vi.mock("./pdf-generator", () => ({ generateQuotationPDF, generateInvoicePDF: vi.fn() }));

import { registerPdfRoutes } from "./pdf-routes";

describe("Rotas HTTP de PDF de orçamento", () => {
  let server: Server;
  let baseUrl = "";

  beforeEach(async () => {
    authenticateRequest.mockResolvedValue({ id: 1 });
    getQuotationById.mockResolvedValue({
      id: 7,
      companyId: 3,
      clientId: 9,
      number: "ORC-000011",
      status: "rascunho",
      createdAt: new Date("2026-07-29T00:00:00.000Z"),
      validUntil: new Date("2026-08-07T00:00:00.000Z"),
      subtotal: "100.00",
      discount: "0.00",
      discountPercentage: "0.00",
      issPercentage: "0.00",
      icmsPercentage: "0.00",
      total: "100.00",
      paymentConditions: "50% de entrada",
      paymentMethodDescription: "PIX",
      pixKey: "85991697631",
    });
    getClientById.mockResolvedValue({ id: 9, name: "Ivone Silva", email: "ivone@example.com" });
    getCompanyById.mockResolvedValue({ id: 3, name: "JR Pinturas", document: "00.000.000/0001-00" });
    getQuotationItems.mockResolvedValue([{ id: 1, description: "Pintura", quantity: "1", unitPrice: "100", total: "100" }]);
    generateQuotationPDF.mockResolvedValue(Buffer.from("%PDF-1.7 test"));

    const app = express();
    registerPdfRoutes(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Servidor de teste sem endereço");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it("retorna PDF com headers de download para orçamento existente", async () => {
    const response = await fetch(`${baseUrl}/api/quotations/7/pdf`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("orcamento-ORC-000011.pdf");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("%PDF-1.7 test");
    expect(generateQuotationPDF).toHaveBeenCalledOnce();
  });

  it("retorna 404 quando o orçamento não existe", async () => {
    getQuotationById.mockResolvedValueOnce(null);
    const response = await fetch(`${baseUrl}/api/quotations/999/pdf`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Orçamento não encontrado" });
    expect(generateQuotationPDF).not.toHaveBeenCalled();
  });
});
