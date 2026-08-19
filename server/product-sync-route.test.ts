import { describe, it, expect, vi, beforeEach } from "vitest";
import { productSyncHandler } from "./product-sync-route";
import * as productSync from "./product-sync";
import { sdk } from "./_core/sdk";

vi.mock("./product-sync", () => ({
  syncExternalProducts: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

describe("Callback Heartbeat de Sincronização de Produtos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 403 quando a requisição não possui credencial cron válida", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({
      isCron: false,
    } as any);

    const req = { originalUrl: "/api/scheduled/product-sync", headers: {} } as any;
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status, json } as any;

    await productSyncHandler(req, res);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "cron-only" });
  });

  it("executa a sincronização com sucesso e retorna resumo para requisições cron autorizadas", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({
      isCron: true,
      taskUid: "task_123",
    } as any);

    const mockSummary = { processed: 2, updated: 1, unchanged: 1, missingPrice: 0, failed: 0, errors: [] };
    vi.mocked(productSync.syncExternalProducts).mockResolvedValueOnce(mockSummary);

    const req = { originalUrl: "/api/scheduled/product-sync", headers: {} } as any;
    const json = vi.fn();
    const res = { json } as any;

    await productSyncHandler(req, res);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        taskUid: "task_123",
        summary: mockSummary,
      })
    );
  });
});
