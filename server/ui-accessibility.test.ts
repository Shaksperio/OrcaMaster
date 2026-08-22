import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pageFiles = ["Dashboard.tsx", "Customers.tsx", "Quotations.tsx", "Invoices.tsx", "Products.tsx", "Expenses.tsx", "Suppliers.tsx", "Professionals.tsx", "QuotationPreview.tsx"];
const readPage = (file: string) => readFileSync(resolve(process.cwd(), "client/src/pages", file), "utf8");

describe("Contrato de acessibilidade das telas renovadas", () => {
  it("mantém layout compartilhado e headings nas telas principais", () => {
    for (const file of pageFiles) {
      const source = readPage(file);
      expect(source, file).toContain("<AppLayout>");
      expect(source, file).toMatch(/<h1[ >]/);
    }
  });

  it("mantém foco visível e navegação por teclado no layout", () => {
    const layout = readFileSync(resolve(process.cwd(), "client/src/components/AppLayout.tsx"), "utf8");
    expect(layout).toContain("focus-visible:outline-none");
    expect(layout).toContain("aria-current");
    expect(layout).toContain('type="button"');
    expect(layout).toContain('aria-label="Abrir menu"');
    expect(layout).toContain('aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}');
  });

  it("mantém retorno ao Dashboard e integração global do Assistente", () => {
    const assistant = readPage("Assistant.tsx");
    const floating = readFileSync(resolve(process.cwd(), "client/src/components/AssistantFloatingChat.tsx"), "utf8");
    const layout = readFileSync(resolve(process.cwd(), "client/src/components/AppLayout.tsx"), "utf8");
    expect(assistant).toContain('navigate("/dashboard")');
    expect(floating).toContain('aria-label="Abrir Assistente OrçaMaster"');
    expect(floating).toContain('aria-label="Fechar chat"');
    expect(floating).toContain("useAssistant()");
    expect(layout).toContain("<AssistantFloatingChat />");
  });

  it("mantém ações compactas e contidas na listagem de orçamentos", () => {
    const quotations = readPage("Quotations.tsx");
    expect(quotations).toContain("md:hidden");
    expect(quotations).toContain('aria-expanded={isExpanded}');
    expect(quotations).toContain("Mais ações do orçamento");
    expect(quotations).toContain("hidden overflow-x-auto md:block");
    expect(quotations).toContain("Editar");
    expect(quotations).toContain("PDF");
  });

  it("mantém nomes acessíveis nos alvos de impressão e ações do preview", () => {
    const preview = readPage("QuotationPreview.tsx");
    expect(preview).toContain('data-testid="quotation-print-target"');
    expect(preview).toContain('aria-label="Pré-visualização imprimível do orçamento"');
    expect(preview).toContain("buildQuotationPrintStyles()");
  });
});
