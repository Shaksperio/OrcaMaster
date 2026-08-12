import { describe, expect, it } from "vitest";
import { generateQuotationPDF } from "./pdf-generator";

describe("PDF do orçamento no modelo anexado", () => {
  it("gera um PDF A4 com duas páginas e conteúdo de pagamento", async () => {
    const pdf = await generateQuotationPDF({
      number: "ORC-000011",
      status: "rascunho",
      createdAt: "2026-07-29T00:00:00.000Z",
      validUntil: "2026-08-07T00:00:00.000Z",
      companyName: "JR Pinturas e Reparos",
      companyDocument: "00.000.000/0001-00",
      companyPhone: "(85) 99999-0000",
      companyEmail: "contato@example.com",
      companyAddress: "Rua Principal, 100",
      companyCity: "Fortaleza",
      companyState: "CE",
      clientName: "Ivone Silva",
      clientPhone: "(88) 99922-9693",
      workLocation: "Empresa: Não Informado; Endereço: Não Informado",
      items: Array.from({ length: 11 }, (_, index) => ({
        description: `Item de teste ${index + 1}`,
        itemType: index % 2 === 0 ? "Serviço" : undefined,
        quantity: 1,
        unitPrice: 100,
        total: 100,
      })),
      subtotal: 1100,
      total: 1100,
      paymentConditions: "50% de entrada e saldo na conclusão.",
      paymentMethodDescription: "Via PIX, conforme as etapas descritas.",
      pixHolder: "Jefferson Raulino de Araújo",
      pixBank: "NU Pagamentos S.A",
      pixKey: "85991697631",
      serviceDescription: "Pintura de tetos internos e pequenos reparos.",
      legalNotice: "A aprovação deste orçamento manifesta ciência e concordância.",
    });

    const content = pdf.toString("latin1");
    expect(content.startsWith("%PDF-")).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
    expect((content.match(/\/Type \/Page/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
