// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { dbMocks, syncToFirebase } = vi.hoisted(() => ({
  dbMocks: {
    getCompanyById: vi.fn(),
    getUserCompanyRole: vi.fn(),
    getCompanyClients: vi.fn(),
    getClientById: vi.fn(),
    createClient: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
  },
  syncToFirebase: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./firebase-sync", () => ({ syncToFirebase }));

import { appRouter } from "./routers";

const user = {
  id: 1,
  openId: "customer-test-user",
  email: "customer@example.com",
  name: "Customer Test",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createContext(): TrpcContext {
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("Procedures customers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getCompanyById.mockResolvedValue({ id: 42, userId: 1, name: "Empresa teste" });
    dbMocks.getUserCompanyRole.mockResolvedValue(undefined);
  });

  it("edita cliente da empresa e replica o registro atualizado", async () => {
    dbMocks.getClientById.mockResolvedValue({ id: 9, companyId: 42, name: "Anterior" });
    dbMocks.updateClient.mockResolvedValue({ id: 9, companyId: 42, name: "Atualizado" });
    const result = await appRouter.createCaller(createContext()).customers.update({ id: 9, companyId: 42, name: "Atualizado" });
    expect(result).toEqual({ id: 9, companyId: 42, name: "Atualizado" });
    expect(dbMocks.updateClient).toHaveBeenCalledWith(9, { name: "Atualizado" });
    expect(syncToFirebase).toHaveBeenCalledWith("client", 9, expect.objectContaining({ name: "Atualizado" }), { companyId: 42 });
  });

  it("exclui cliente da empresa e remove o espelho Firebase", async () => {
    dbMocks.getClientById.mockResolvedValue({ id: 9, companyId: 42, name: "Cliente real" });
    const result = await appRouter.createCaller(createContext()).customers.delete({ id: 9, companyId: 42 });
    expect(result).toEqual({ id: 9 });
    expect(dbMocks.deleteClient).toHaveBeenCalledWith(9);
    expect(syncToFirebase).toHaveBeenCalledWith("client", 9, null, { companyId: 42 });
  });

  it("bloqueia cliente pertencente a outra empresa", async () => {
    dbMocks.getClientById.mockResolvedValue({ id: 9, companyId: 99, name: "Outro cliente" });
    await expect(appRouter.createCaller(createContext()).customers.update({ id: 9, companyId: 42, name: "Não permitido" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.updateClient).not.toHaveBeenCalled();
    expect(dbMocks.deleteClient).not.toHaveBeenCalled();
  });
});

