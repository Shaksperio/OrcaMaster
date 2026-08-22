import { describe, it, expect, vi, beforeEach } from "vitest";
import { prepareAssistantAction, confirmAssistantAction } from "./assistant-actions";
import * as db from "./db";

vi.mock("./firebase-sync", () => ({ syncToFirebase: vi.fn() }));
vi.mock("./db", () => ({
  getProductById: vi.fn(),
  getCompanyById: vi.fn(),
  createAssistantActionConfirmation: vi.fn(),
  getAssistantActionConfirmationByToken: vi.fn(),
  updateAssistantActionConfirmation: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));

describe("Assistant action protocol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getProductById).mockResolvedValue({ id: 9, companyId: 7, name: "Produto real" } as any);
    vi.mocked(db.createAssistantActionConfirmation).mockResolvedValue({ insertId: 3 } as any);
    vi.mocked(db.updateProduct).mockResolvedValue({ id: 9, companyId: 7, name: "Produto atualizado" } as any);
  });

  it("cria uma prévia pendente sem atualizar o produto", async () => {
    const result = await prepareAssistantAction(7, 11, "product.update", { id: 9, price: "135.00" });
    expect(result.confirmationToken).toHaveLength(64);
    expect(result.preview.payload).toEqual({ id: 9, price: "135.00" });
    expect(db.createAssistantActionConfirmation).toHaveBeenCalledWith(expect.objectContaining({ companyId: 7, userId: 11, action: "product.update", status: "pending" }));
    expect(db.updateProduct).not.toHaveBeenCalled();
  });

  it("executa somente uma confirmação pendente do mesmo usuário e registra o resultado", async () => {
    const confirmation = { id: 3, companyId: 7, userId: 11, action: "product.update", payload: { id: 9, price: "135.00" }, status: "pending", expiresAt: new Date(Date.now() + 60_000) };
    vi.mocked(db.getAssistantActionConfirmationByToken).mockResolvedValue(confirmation as any);
    const result = await confirmAssistantAction(7, 11, "a".repeat(64));
    expect(result.action).toBe("product.update");
    expect(db.updateProduct).toHaveBeenCalledWith(9, { price: "135.00" });
    expect(db.updateAssistantActionConfirmation).toHaveBeenCalledWith(3, expect.objectContaining({ status: "executed", executedAt: expect.any(Date) }));
  });

  it("rejeita token de outra empresa ou usuário sem executar nada", async () => {
    vi.mocked(db.getAssistantActionConfirmationByToken).mockResolvedValue({ id: 3, companyId: 8, userId: 11, status: "pending" } as any);
    await expect(confirmAssistantAction(7, 11, "b".repeat(64))).rejects.toThrow("sem autorização");
    expect(db.updateProduct).not.toHaveBeenCalled();
  });

  it("marca confirmação expirada e não executa a ação", async () => {
    vi.mocked(db.getAssistantActionConfirmationByToken).mockResolvedValue({ id: 4, companyId: 7, userId: 11, action: "product.update", payload: { id: 9 }, status: "pending", expiresAt: new Date(Date.now() - 1) } as any);
    await expect(confirmAssistantAction(7, 11, "c".repeat(64))).rejects.toThrow("expirou");
    expect(db.updateAssistantActionConfirmation).toHaveBeenCalledWith(4, { status: "expired" });
    expect(db.updateProduct).not.toHaveBeenCalled();
  });
});

  it("executa exclusão destrutiva somente após confirmação e atualiza a auditoria", async () => {
    const confirmation = { id: 5, companyId: 7, userId: 11, action: "product.delete", payload: { id: 9 }, status: "pending", expiresAt: new Date(Date.now() + 60_000) };
    vi.mocked(db.getAssistantActionConfirmationByToken).mockResolvedValue(confirmation as any);
    const result = await confirmAssistantAction(7, 11, "d".repeat(64));
    expect(result.action).toBe("product.delete");
    expect(db.deleteProduct).toHaveBeenCalledWith(9);
    expect(db.updateAssistantActionConfirmation).toHaveBeenCalledWith(5, expect.objectContaining({ status: "executed", executedAt: expect.any(Date) }));
  });
