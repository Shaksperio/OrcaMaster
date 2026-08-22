import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { dbMocks, syncToFirebase } = vi.hoisted(() => ({
  dbMocks: {
    getCompanyById: vi.fn(),
    getUserCompanyRole: vi.fn(),
    getCompanySuppliers: vi.fn(),
    getSupplierById: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    deleteSupplier: vi.fn(),
  },
  syncToFirebase: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./firebase-sync", () => ({ syncToFirebase }));

import { appRouter } from "./routers";

const user = {
  id: 1,
  openId: "supplier-test-user",
  email: "supplier@example.com",
  name: "Supplier Test",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createContext(): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Procedures suppliers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getCompanyById.mockResolvedValue({ id: 42, userId: 1, name: "Empresa teste" });
    dbMocks.getUserCompanyRole.mockResolvedValue(undefined);
  });

  it("lista fornecedores somente após validar acesso à empresa", async () => {
    const rows = [{ id: 9, companyId: 42, name: "Fornecedor real" }];
    dbMocks.getCompanySuppliers.mockResolvedValue(rows);
    const result = await appRouter.createCaller(createContext()).suppliers.list({ companyId: 42 });
    expect(result).toEqual(rows);
    expect(dbMocks.getCompanySuppliers).toHaveBeenCalledWith(42);
  });

  it("cria fornecedor do proprietário e replica no Firebase", async () => {
    dbMocks.createSupplier.mockResolvedValue({ insertId: 9 });
    const result = await appRouter.createCaller(createContext()).suppliers.create({ companyId: 42, name: "Fornecedor real", city: "Fortaleza", state: "CE" });
    expect(result).toEqual({ insertId: 9 });
    expect(dbMocks.createSupplier).toHaveBeenCalledWith({ companyId: 42, name: "Fornecedor real", city: "Fortaleza", state: "CE" });
    expect(syncToFirebase).toHaveBeenCalledWith("supplier", 9, expect.objectContaining({ id: 9, name: "Fornecedor real" }), { companyId: 42 });
  });

  it("edita e remove somente fornecedor da mesma empresa", async () => {
    dbMocks.getSupplierById.mockResolvedValue({ id: 9, companyId: 42, name: "Anterior" });
    dbMocks.updateSupplier.mockResolvedValue({ id: 9, companyId: 42, name: "Atualizado" });
    const caller = appRouter.createCaller(createContext());
    await caller.suppliers.update({ id: 9, companyId: 42, name: "Atualizado" });
    expect(dbMocks.updateSupplier).toHaveBeenCalledWith(9, { name: "Atualizado" });
    expect(syncToFirebase).toHaveBeenCalledWith("supplier", 9, expect.objectContaining({ id: 9, name: "Atualizado" }), { companyId: 42 });

    await caller.suppliers.delete({ id: 9, companyId: 42 });
    expect(dbMocks.deleteSupplier).toHaveBeenCalledWith(9);
    expect(syncToFirebase).toHaveBeenCalledWith("supplier", 9, null, { companyId: 42 });
  });

  it("nega acesso a empresa de outro usuário e a fornecedor de outra empresa", async () => {
    dbMocks.getCompanyById.mockResolvedValue({ id: 99, userId: 2, name: "Outra empresa" });
    await expect(appRouter.createCaller(createContext()).suppliers.list({ companyId: 99 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    dbMocks.getCompanyById.mockResolvedValue({ id: 42, userId: 1, name: "Empresa teste" });
    dbMocks.getSupplierById.mockResolvedValue({ id: 9, companyId: 99, name: "Outro fornecedor" });
    await expect(appRouter.createCaller(createContext()).suppliers.update({ id: 9, companyId: 42, name: "Não permitido" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
