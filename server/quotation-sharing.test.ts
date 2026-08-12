import { describe, expect, it } from "vitest";
import {
  buildEmailShareUrl,
  buildQuotationShareMessage,
  buildQuotationValidationUrl,
  buildWhatsAppShareUrl,
} from "../client/src/lib/quotation-sharing";

describe("Compartilhamento de orçamento", () => {
  const message = buildQuotationShareMessage("https://orcaflow.example/", "ORC-000011", "1166.49");

  it("gera link público de validação sem barra duplicada", () => {
    expect(buildQuotationValidationUrl("https://orcaflow.example/", "ORC-000011")).toBe("https://orcaflow.example/validate/ORC-000011");
  });

  it("inclui número, total e validação na mensagem", () => {
    expect(message).toContain("ORC-000011");
    expect(message).toContain("R$ 1.166,49");
    expect(message).toContain("/validate/ORC-000011");
  });

  it("codifica a mensagem no link do WhatsApp", () => {
    expect(buildWhatsAppShareUrl(message)).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(buildWhatsAppShareUrl(message)).toContain(encodeURIComponent("ORC-000011"));
  });

  it("gera mailto com destinatário, assunto e corpo codificados", () => {
    const url = buildEmailShareUrl("cliente@example.com", "Orçamento ORC-000011", message);
    expect(url).toContain("mailto:cliente@example.com");
    expect(url).toContain("subject=");
    expect(url).toContain("body=");
  });
});
