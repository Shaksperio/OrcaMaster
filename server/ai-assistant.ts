import { invokeLLM } from "./_core/llm";
import * as db from "./db";

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantActionProposal = {
  action: string;
  payload: Record<string, unknown>;
};

function extractActionProposal(content: string) {
  const match = content.match(/<assistant_action>([\s\S]*?)<\/assistant_action>/i);
  if (!match) return { content: content.trim(), actionProposal: undefined };
  try {
    const parsed = JSON.parse(match[1]);
    if (typeof parsed?.action !== "string" || !parsed?.payload || typeof parsed.payload !== "object") {
      return { content: content.replace(match[0], "").trim(), actionProposal: undefined };
    }
    return { content: content.replace(match[0], "").trim(), actionProposal: parsed as AssistantActionProposal };
  } catch {
    return { content: content.replace(match[0], "").trim(), actionProposal: undefined };
  }
}

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONTEXT_ROWS = 40;
const LLM_TIMEOUT_MS = 30_000;
const activeRequests = new Set<number>();

function sanitizeMessages(messages: AssistantMessage[]) {
  return messages
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter((message) => message.content.length > 0);
}

function compactRows(rows: unknown[], fields: string[]) {
  return rows.slice(0, MAX_CONTEXT_ROWS).map((row: any) => {
    const result: Record<string, unknown> = {};
    for (const field of fields) {
      if (row?.[field] !== undefined && row?.[field] !== null) result[field] = row[field];
    }
    return result;
  });
}

export async function buildCompanyContext(companyId: number) {
  const [company, products, clients, quotations, invoices, expenses] = await Promise.all([
    db.getCompanyById(companyId),
    db.getCompanyProducts(companyId),
    db.getCompanyClients(companyId),
    db.getCompanyQuotations(companyId),
    db.getCompanyInvoices(companyId),
    db.getCompanyExpenses(companyId),
  ]);

  const sumField = (rows: unknown[], field: string) => rows.reduce<number>((sum, row: any) => {
    const value = Number(row?.[field]);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  const financialSummary = {
    quotationsTotal: sumField(quotations, "total"),
    invoicesTotal: sumField(invoices, "total"),
    expensesTotal: sumField(expenses, "amount"),
    paidExpensesTotal: expenses.filter((expense: any) => expense.status === "pago").reduce((sum: number, expense: any) => sum + (Number(expense.amount) || 0), 0),
  };

  return {
    company: company ? { id: company.id, name: company.name, city: company.city, state: company.state } : null,
    products: compactRows(products, ["id", "name", "category", "price", "unit", "stock", "sourceType", "priceSource", "externalStatus"]),
    clients: compactRows(clients, ["id", "name", "city"]),
    quotations: compactRows(quotations, ["id", "number", "status", "total", "validUntil", "createdAt"]),
    invoices: compactRows(invoices, ["id", "number", "status", "total", "dueDate", "paidAt", "createdAt"]),
    expenses: compactRows(expenses, ["id", "description", "category", "amount", "status", "dueDate", "paidDate", "createdAt"]),
    financialSummary,
  };
}

export async function answerCompanyAssistant(companyId: number, messages: AssistantMessage[]) {
  const safeMessages = sanitizeMessages(messages);
  if (safeMessages.length === 0) throw new Error("Envie uma pergunta para o assistente.");

  if (activeRequests.has(companyId)) {
    throw new Error("Já existe uma solicitação do assistente em andamento para esta empresa.");
  }

  activeRequests.add(companyId);
  let context;
  try {
    context = await buildCompanyContext(companyId);
  } catch (error) {
    activeRequests.delete(companyId);
    throw error;
  }
  const responsePromise = invokeLLM({
    messages: [
      {
        role: "system",
        content: [
          "Você é o assistente financeiro e operacional do OrçaMaster.",
          "Responda em português brasileiro, com objetividade e transparência.",
          "Use apenas os dados do contexto da empresa fornecido nesta solicitação.",
          "Se um dado não estiver no contexto, diga que não foi encontrado; nunca invente valores, clientes, preços, datas ou indicadores.",
          "Você pode explicar, comparar, resumir e sugerir próximos passos, mas não pode alterar banco, enviar mensagens, emitir documentos ou sincronizar produtos.",
          "Quando o usuário pedir uma alteração, exclusão ou criação, não execute nada: explique a ação e inclua, ao final, uma única tag <assistant_action> contendo JSON com action e payload.",
          "Ações permitidas: product.create, product.update, product.delete, supplier.create, supplier.update, supplier.delete, quotation.updateStatus, quotation.delete, invoice.updateStatus, invoice.delete, expense.updateStatus, expense.delete, company.update.",
          "O payload deve conter somente dados explicitamente pedidos pelo usuário e, para edição/exclusão, o id do registro. Nunca invente ids; se não houver id inequívoco, peça esclarecimento e não inclua a tag.",
          `CONTEXTO DA EMPRESA (dados internos, companyId=${companyId}): ${JSON.stringify(context)}`,
        ].join("\n"),
      },
      ...safeMessages,
    ],
  });

  try {
    const response = await Promise.race([
      responsePromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Tempo limite excedido ao consultar o assistente.")), LLM_TIMEOUT_MS)),
    ]);
    const content = response.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("O assistente não retornou uma resposta válida.");
    }
    const parsed = extractActionProposal(content);
    return { content: parsed.content || "A proposta foi preparada para sua revisão.", actionProposal: parsed.actionProposal };
  } catch (error) {
    const message = error instanceof Error ? error.message : "indisponibilidade temporária";
    console.warn(`[AI Assistant] Fallback seguro ativado: ${message}`);
    return {
      content: "Não consegui consultar o modelo de IA neste momento. Nenhum dado foi alterado. Tente novamente em alguns instantes.",
    };
  } finally {
    activeRequests.delete(companyId);
  }
}
