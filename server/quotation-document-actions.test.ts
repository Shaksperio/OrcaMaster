import { describe, expect, it, vi } from "vitest";
import {
  buildQuotationPdfUrl,
  buildQuotationPreviewUrl,
  buildQuotationPrintStyles,
  printQuotation,
} from "../client/src/lib/quotation-document-actions";

describe("Ações do documento de orçamento", () => {
  it("gera URLs codificadas para PDF e preview", () => {
    expect(buildQuotationPdfUrl(11)).toBe("/api/quotations/11/pdf");
    expect(buildQuotationPreviewUrl("ORC 000011")).toBe("/quotations/ORC%20000011/preview");
  });

  it("mantém o alvo do documento visível e configura A4 na impressão", () => {
    const styles = buildQuotationPrintStyles();
    expect(styles).toContain("[data-print-target]");
    expect(styles).toContain("visibility: hidden");
    expect(styles).toContain("visibility: visible");
    expect(styles).toContain("size: A4");
    expect(styles).toContain("page-break-after");
  });

  it("dispara a função de impressão uma única vez", () => {
    const printFn = vi.fn();
    printQuotation(printFn);
    expect(printFn).toHaveBeenCalledOnce();
  });
});
