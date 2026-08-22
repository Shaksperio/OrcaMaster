import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { generateQuotationPDF, generateInvoicePDF } from "./pdf-generator";

export function registerPdfRoutes(app: Express) {
  // Download quotation PDF
  app.get("/api/quotations/:id/pdf", async (req: Request, res: Response) => {
    try {
      // Authenticate
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Não autenticado" });
        return;
      }

      const quotationId = parseInt(req.params.id);
      if (isNaN(quotationId)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      // Get quotation with related data
      const quotation = await db.getQuotationById(quotationId);
      if (!quotation) {
        res.status(404).json({ error: "Orçamento não encontrado" });
        return;
      }

      const client = await db.getClientById(quotation.clientId);
      const company = await db.getCompanyById(quotation.companyId);
      const items = await db.getQuotationItems(quotationId);

      if (!company || !client) {
        res.status(404).json({ error: "Dados incompletos" });
        return;
      }

      // Generate PDF
      const pdfBuffer = await generateQuotationPDF({
        number: quotation.number,
        status: quotation.status,
        createdAt: quotation.createdAt,
        validUntil: quotation.validUntil,
        companyName: company.name,
        companyDocument: company.document,
        companyPhone: company.phone || undefined,
        companyEmail: company.email || undefined,
        companyAddress: company.address || undefined,
        companyCity: company.city || undefined,
        companyState: company.state || undefined,
        companyZipCode: company.zipCode || undefined,
        companyLogoUrl: company.logoUrl || undefined,
        companyLogoStorageKey: company.logoStorageKey || undefined,
        clientName: client.name,
        clientDocument: client.document || undefined,
        clientEmail: client.email || undefined,
        clientPhone: client.phone || undefined,
        clientAddress: client.address || undefined,
        clientCity: client.city || undefined,
        clientState: client.state || undefined,
        clientZipCode: client.zipCode || undefined,
        workLocation: quotation.workLocation || undefined,
        items: items.map(item => ({
          description: item.description,
          itemType: item.itemType || undefined,
          quantity: parseFloat(String(item.quantity)),
          unitPrice: parseFloat(String(item.unitPrice)),
          total: parseFloat(String(item.total)),
        })),
        subtotal: parseFloat(String(quotation.subtotal)),
        discount: parseFloat(String(quotation.discount)) || 0,
        discountPercentage: parseFloat(String(quotation.discountPercentage)) || 0,
        issPercentage: parseFloat(String(quotation.issPercentage)) || 0,
        icmsPercentage: parseFloat(String(quotation.icmsPercentage)) || 0,
        total: parseFloat(String(quotation.total)),
        paymentConditions: quotation.paymentConditions || undefined,
        paymentMethodDescription: quotation.paymentMethodDescription || undefined,
        paymentTerms: quotation.paymentTerms || undefined,
        pixHolder: quotation.pixHolder || undefined,
        pixBank: quotation.pixBank || undefined,
        pixKey: quotation.pixKey || undefined,
        serviceDescription: quotation.serviceDescription || undefined,
        deliveryEstimate: quotation.deliveryEstimate || undefined,
        legalNotice: quotation.legalNotice || undefined,
        notes: quotation.notes || undefined,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="orcamento-${quotation.number}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating quotation PDF:", error);
      if (error.message?.includes("session") || error.message?.includes("Forbidden")) {
        res.status(401).json({ error: "Não autenticado" });
      } else {
        res.status(500).json({ error: "Erro ao gerar PDF" });
      }
    }
  });

  // Download invoice PDF
  app.get("/api/invoices/:id/pdf", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Não autenticado" });
        return;
      }

      const invoiceId = parseInt(req.params.id);
      if (isNaN(invoiceId)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      const invoice = await db.getInvoiceById(invoiceId);
      if (!invoice) {
        res.status(404).json({ error: "Fatura não encontrada" });
        return;
      }

      const client = await db.getClientById(invoice.clientId);
      const company = await db.getCompanyById(invoice.companyId);
      const items = await db.getInvoiceItems(invoiceId);

      if (!company || !client) {
        res.status(404).json({ error: "Dados incompletos" });
        return;
      }

      const pdfBuffer = await generateInvoicePDF({
        number: invoice.number,
        createdAt: invoice.createdAt,
        validUntil: invoice.dueDate,
        companyName: company.name,
        companyDocument: company.document,
        companyPhone: company.phone || undefined,
        companyEmail: company.email || undefined,
        companyAddress: company.address || undefined,
        companyCity: company.city || undefined,
        companyState: company.state || undefined,
        companyZipCode: company.zipCode || undefined,
        clientName: client.name,
        clientDocument: client.document || undefined,
        clientEmail: client.email || undefined,
        clientPhone: client.phone || undefined,
        clientAddress: client.address || undefined,
        clientCity: client.city || undefined,
        clientState: client.state || undefined,
        items: items.map(item => ({
          description: item.description,
          quantity: parseFloat(String(item.quantity)),
          unitPrice: parseFloat(String(item.unitPrice)),
          total: parseFloat(String(item.total)),
        })),
        subtotal: parseFloat(String(invoice.subtotal)),
        discount: parseFloat(String(invoice.discount)) || 0,
        total: parseFloat(String(invoice.total)),
        paymentTerms: invoice.paymentTerms || undefined,
        notes: invoice.notes || undefined,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="fatura-${invoice.number}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating invoice PDF:", error);
      if (error.message?.includes("session") || error.message?.includes("Forbidden")) {
        res.status(401).json({ error: "Não autenticado" });
      } else {
        res.status(500).json({ error: "Erro ao gerar PDF" });
      }
    }
  });
}


import { generateFinanceReportPDF } from "./report-pdf";

export function registerReportPdfRoutes(app: Express) {
  app.get("/api/reports/:companyId/pdf", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) { res.status(401).json({ error: "Não autenticado" }); return; }
      const companyId = Number(req.params.companyId);
      if (!Number.isInteger(companyId) || companyId <= 0) { res.status(400).json({ error: "Empresa inválida" }); return; }
      const company = await db.getCompanyById(companyId);
      const member = await db.getUserCompanyRole(user.id, companyId);
      if (!company || (company.userId !== user.id && !member)) { res.status(403).json({ error: "Sem acesso a esta empresa" }); return; }
      const [invoices, expenses] = await Promise.all([db.getCompanyInvoices(companyId), db.getCompanyExpenses(companyId)]);
      const rows = [...invoices.map((item: any) => ({ type: "Fatura", identifier: String(item.number ?? item.id), status: String(item.status ?? ""), value: Number(item.total ?? 0) })), ...expenses.map((item: any) => ({ type: "Despesa", identifier: String(item.description ?? item.id), status: String(item.status ?? ""), value: Number(item.amount ?? item.total ?? 0) }))];
      const pdfBuffer = await generateFinanceReportPDF({ companyName: company.name, companyId, rows, generatedAt: new Date() });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="relatorio-financeiro-${companyId}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating finance report PDF:", error);
      res.status(500).json({ error: "Erro ao gerar relatório financeiro" });
    }
  });
}
