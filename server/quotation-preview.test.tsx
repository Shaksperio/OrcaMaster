// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildEmailShareUrl,
  buildQuotationShareMessage,
  buildWhatsAppShareUrl,
} from "../client/src/lib/quotation-sharing";
import { buildQuotationPdfUrl } from "../client/src/lib/quotation-document-actions";

const quotation = {
  id: 1,
  number: "ORC-000011",
  status: "rascunho",
  createdAt: "2026-08-12T00:00:00.000Z",
  validUntil: "2026-08-20T00:00:00.000Z",
  deliveryEstimate: "10 dias úteis",
  workLocation: "Rua das Flores, 100 - São Paulo/SP",
  subtotal: "1500.00",
  discount: "100.00",
  total: "1400.00",
  issPercentage: "0",
  icmsPercentage: "0",
  paymentConditions: "50% na aprovação e 50% na entrega.",
  paymentTerms: null,
  paymentMethodDescription: "PIX",
  pixKey: "orcamaster@example.com",
  pixHolder: "OrçaMaster Ltda.",
  pixBank: "Banco de Teste",
  serviceDescription: "Instalação e acabamento.",
  legalNotice: "Validade sujeita à disponibilidade de materiais.",
  company: {
    name: "OrçaMaster Ltda.",
    email: "empresa@example.com",
    phone: "(11) 99999-0000",
    address: "Av. Central, 10",
    city: "São Paulo",
    state: "SP",
    document: "12.345.678/0001-90",
    logoUrl: null,
  },
  client: {
    name: "Cliente de Teste",
    email: "cliente@example.com",
    phone: "(11) 98888-0000",
    address: "Rua do Cliente, 20",
    city: "São Paulo",
    state: "SP",
    document: "123.456.789-00",
  },
  items: [
    {
      id: 1,
      description: "Serviço de instalação",
      itemType: "Serviço",
      quantity: "2",
      unitPrice: "750",
      total: "1500",
    },
  ],
};

const useQueryMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const qrCodeMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    quotations: {
      get: {
        useQuery: useQueryMock,
      },
    },
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/quotations/1", navigateMock],
  useParams: () => ({ id: "1" }),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: qrCodeMock,
  },
}));

import QuotationPreview from "../client/src/pages/QuotationPreview";

describe("QuotationPreview — ações do documento", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    useQueryMock.mockReturnValue({ data: quotation, isLoading: false, error: null });
    qrCodeMock.mockResolvedValue("data:image/png;base64,qr");
  });

  it("mantém o alvo de impressão e chama window.print pelo botão Imprimir", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<QuotationPreview />);

    expect(document.querySelector("[data-print-target]")).not.toBeNull();
    expect(document.querySelector("style")?.textContent).toContain("@media print");
    expect(document.querySelector("style")?.textContent).toContain("[data-print-target]");

    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("abre a rota correta ao gerar o PDF", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<QuotationPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Gerar PDF" }));
    expect(openSpy).toHaveBeenCalledWith(
      buildQuotationPdfUrl("1"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("gera links de e-mail e WhatsApp a partir dos dados reais do orçamento", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<QuotationPreview />);
    const message = buildQuotationShareMessage(window.location.origin, quotation.number, quotation.total);

    fireEvent.click(screen.getByRole("button", { name: "E-mail" }));
    expect(openSpy).toHaveBeenLastCalledWith(
      buildEmailShareUrl(quotation.client.email, `Orçamento ${quotation.number}`, message),
      "_self",
    );

    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(openSpy).toHaveBeenLastCalledWith(
      buildWhatsAppShareUrl(message),
      "_blank",
      "noopener,noreferrer",
    );
  });
});
