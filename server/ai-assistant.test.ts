import { describe, it, expect, vi, beforeEach } from "vitest";
import { answerCompanyAssistant, buildCompanyContext } from "./ai-assistant";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

vi.mock("./db", () => ({
  getCompanyById: vi.fn(),
  getCompanyProducts: vi.fn(),
  getCompanyClients: vi.fn(),
  getCompanyQuotations: vi.fn(),
  getCompanyInvoices: vi.fn(),
  getCompanyExpenses: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

describe("Assistente LLM contextual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getCompanyById).mockResolvedValue({ id: 7, name: "Empresa Teste", city: "Fortaleza", state: "CE" } as any);
    vi.mocked(db.getCompanyProducts).mockResolvedValue([{ id: 1, name: "Tinta real", price: "120.00", companyId: 7 }] as any);
    vi.mocked(db.getCompanyClients).mockResolvedValue([{ id: 2, name: "Cliente real", email: "cliente@example.com", companyId: 7 }] as any);
    vi.mocked(db.getCompanyQuotations).mockResolvedValue([{ id: 3, number: "ORC-003", status: "pendente", total: "500.00", companyId: 7 }] as any);
    vi.mocked(db.getCompanyInvoices).mockResolvedValue([] as any);
    vi.mocked(db.getCompanyExpenses).mockResolvedValue([{ id: 4, description: "Despesa real", amount: "50.00", status: "pago", companyId: 7 }] as any);
  });

  it("monta somente o contexto da empresa solicitada", async () => {
    const context = await buildCompanyContext(7);
    expect(context.company).toEqual({ id: 7, name: "Empresa Teste", city: "Fortaleza", state: "CE" });
    expect(context.products).toEqual([{ id: 1, name: "Tinta real", price: "120.00" }]);
    expect(context.clients).toEqual([{ id: 2, name: "Cliente real" }]);
    expect(context.financialSummary).toEqual({ quotationsTotal: 500, invoicesTotal: 0, expensesTotal: 50, paidExpensesTotal: 50 });
  });

  it("envia o contexto ao LLM e retorna a resposta textual", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({ choices: [{ message: { content: "Há um orçamento pendente de R$ 500,00." } }] } as any);
    const result = await answerCompanyAssistant(7, [{ role: "user", content: "Resuma meus orçamentos." }]);
    expect(result.content).toContain("orçamento pendente");
    const request = vi.mocked(invokeLLM).mock.calls[0][0];
    expect(JSON.stringify(request.messages)).toContain("Tinta real");
    expect(JSON.stringify(request.messages)).toContain("nunca invente");
    expect(JSON.stringify(request.messages)).not.toContain("cliente@example.com");
  });

  it("usa fallback seguro quando o LLM falha e não altera dados", async () => {
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("serviço indisponível"));
    const result = await answerCompanyAssistant(7, [{ role: "user", content: "Analise meu fluxo de caixa." }]);
    expect(result.content).toContain("Nenhum dado foi alterado");
  });

  it("ativa fallback seguro após timeout", async () => {
    vi.useFakeTimers();
    vi.mocked(invokeLLM).mockReturnValueOnce(new Promise(() => undefined) as any);
    const pending = answerCompanyAssistant(7, [{ role: "user", content: "Analise minhas despesas." }]);
    await vi.advanceTimersByTimeAsync(30_000);
    await expect(pending).resolves.toMatchObject({ content: expect.stringContaining("Nenhum dado foi alterado") });
    vi.useRealTimers();
  });

  it("bloqueia duas solicitações simultâneas da mesma empresa", async () => {
    let release: (() => void) | undefined;
    vi.mocked(invokeLLM).mockReturnValueOnce(new Promise((resolve) => { release = () => resolve({ choices: [{ message: { content: "ok" } }] } as any); }) as any);
    const first = answerCompanyAssistant(7, [{ role: "user", content: "Primeira pergunta" }]);
    await Promise.resolve();
    await expect(answerCompanyAssistant(7, [{ role: "user", content: "Segunda pergunta" }])).rejects.toThrow("solicitação");
    release?.();
    await expect(first).resolves.toMatchObject({ content: "ok" });
  });

  it("rejeita mensagens vazias antes de chamar o LLM", async () => {
    await expect(answerCompanyAssistant(7, [{ role: "user", content: "   " }])).rejects.toThrow("Envie uma pergunta");
    expect(invokeLLM).not.toHaveBeenCalled();
  });
});
