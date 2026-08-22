import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateFinanceReportPDF } from "./report-pdf";

describe("exports do relatório financeiro", () => {
  it("gera um PDF real a partir de linhas fornecidas", async () => {
    const pdf = await generateFinanceReportPDF({ companyName: "Empresa real", companyId: 7, generatedAt: new Date("2026-01-01T12:00:00Z"), rows: [{ type: "Fatura", identifier: "FAT-001", status: "pago", value: 1200 }] });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(500);
  });

  it("mantém os contratos de download Excel, PDF e impressão na tela", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Reports.tsx"), "utf8");
    expect(source).toContain("exportExcel");
    expect(source).toContain("exportPdf");
    expect(source).toContain("window.print()");
    expect(source).toContain("/api/reports/${activeCompany.id}/pdf");
    expect(source).toContain("application/vnd.ms-excel");
  });
});
