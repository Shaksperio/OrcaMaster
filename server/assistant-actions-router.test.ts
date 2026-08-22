import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

const { dbMocks, prepareAction, confirmAction } = vi.hoisted(() => ({
  dbMocks: { getCompanyById: vi.fn(), getUserCompanyRole: vi.fn() },
  prepareAction: vi.fn(),
  confirmAction: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./assistant-actions", () => ({
  getAssistantActionPolicy: (action: string) => ({ category: action.startsWith("invoice") || action.startsWith("expense") ? "financeira" : action === "company.update" ? "administrativa" : "operacional", roles: ["owner"] }),
  prepareAssistantAction: prepareAction,
  confirmAssistantAction: confirmAction,
}));

import { appRouter } from "./routers";

const baseUser = { id: 1, openId: "router-test", email: "owner@test.local", name: "Owner", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

function context(user = baseUser): TrpcContext {
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("Procedures ai.prepareAction e ai.confirmAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getCompanyById.mockResolvedValue({ id: 42, userId: 1, name: "Empresa teste" });
    dbMocks.getUserCompanyRole.mockResolvedValue(undefined);
    prepareAction.mockResolvedValue({ confirmationToken: "a".repeat(64), preview: { action: "product.update", payload: { id: 9, price: "100" } } });
    confirmAction.mockResolvedValue({ action: "product.update", result: { id: 9 } });
  });

  it("permite ao proprietário preparar uma ação e retornar a prévia", async () => {
    const result = await appRouter.createCaller(context()).ai.prepareAction({ companyId: 42, action: "product.update", payload: { id: 9, price: "100" } });
    expect(result.confirmationToken).toHaveLength(64);
    expect(prepareAction).toHaveBeenCalledWith(42, 1, "product.update", { id: 9, price: "100" });
  });

  it("bloqueia membro que não é proprietário nas duas etapas", async () => {
    dbMocks.getCompanyById.mockResolvedValue({ id: 42, userId: 99, name: "Empresa de outro usuário" });
    dbMocks.getUserCompanyRole.mockResolvedValue({ role: "admin" });
    const caller = appRouter.createCaller(context());
    await expect(caller.ai.prepareAction({ companyId: 42, action: "invoice.delete", payload: { id: 3 } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.ai.confirmAction({ companyId: 42, confirmationToken: "b".repeat(64) })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(prepareAction).not.toHaveBeenCalled();
    expect(confirmAction).not.toHaveBeenCalled();
  });

  it("expõe a categoria administrativa/financeira/operacional através da policy", async () => {
    await appRouter.createCaller(context()).ai.prepareAction({ companyId: 42, action: "company.update", payload: { name: "Nova empresa" } });
    await appRouter.createCaller(context()).ai.prepareAction({ companyId: 42, action: "expense.delete", payload: { id: 3 } });
    expect(prepareAction).toHaveBeenNthCalledWith(1, 42, 1, "company.update", { name: "Nova empresa" });
    expect(prepareAction).toHaveBeenNthCalledWith(2, 42, 1, "expense.delete", { id: 3 });
  });
});
