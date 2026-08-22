import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const quotationsPage = readFileSync(new URL("../client/src/pages/Quotations.tsx", import.meta.url), "utf8");
const invoicesPage = readFileSync(new URL("../client/src/pages/Invoices.tsx", import.meta.url), "utf8");

describe("Integração das telas com histórico de versões", () => {
  it("Quotation.tsx abre o histórico pela ação da linha e renderiza o snapshot read-only", () => {
    expect(quotationsPage).toContain("setSelectedVersionQuotationId(quotation.id)");
    expect(quotationsPage).toContain("trpc.quotations.versions.useQuery");
    expect(quotationsPage).toContain("<ReadOnlyVersionSnapshot data={version.data} />");
  });

  it("Invoices.tsx abre o histórico pela ação da linha e renderiza o snapshot read-only", () => {
    expect(invoicesPage).toContain("setSelectedVersionInvoiceId(invoice.id)");
    expect(invoicesPage).toContain("trpc.invoices.versions.useQuery");
    expect(invoicesPage).toContain("<ReadOnlyVersionSnapshot data={version.data} />");
  });
});
