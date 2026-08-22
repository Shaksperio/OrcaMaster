import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFirebaseDb, isFirebaseEnabled, ref, set, remove } = vi.hoisted(() => {
  const set = vi.fn().mockResolvedValue(undefined);
  const remove = vi.fn().mockResolvedValue(undefined);
  const ref = vi.fn(() => ({ set, remove }));
  return { getFirebaseDb: vi.fn(), isFirebaseEnabled: vi.fn(), ref, set, remove };
});

vi.mock("./firebase", () => ({ getFirebaseDb, isFirebaseEnabled }));

import { syncToFirebase } from "./firebase-sync";

describe("Espelho Firebase de fornecedores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isFirebaseEnabled.mockReturnValue(true);
    getFirebaseDb.mockReturnValue({ ref });
  });

  it("persiste fornecedor no caminho da empresa", async () => {
    await syncToFirebase("supplier", 9, { id: 9, companyId: 42, name: "Fornecedor real" }, { companyId: 42 });
    expect(ref).toHaveBeenCalledWith("companies/42/suppliers/9");
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ id: 9, companyId: 42, name: "Fornecedor real" }));
  });

  it("atualiza fornecedor persistindo os dados alterados no mesmo caminho", async () => {
    await syncToFirebase("supplier", 9, { id: 9, companyId: 42, name: "Fornecedor atualizado", city: "Recife" }, { companyId: 42 });
    expect(ref).toHaveBeenCalledWith("companies/42/suppliers/9");
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ id: 9, name: "Fornecedor atualizado", city: "Recife" }));
  });

  it("remove fornecedor no mesmo caminho quando recebe null", async () => {
    await syncToFirebase("supplier", 9, null, { companyId: 42 });
    expect(ref).toHaveBeenCalledWith("companies/42/suppliers/9");
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
