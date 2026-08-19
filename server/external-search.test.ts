import { afterEach, describe, expect, it, vi } from "vitest";
import { getSinapiReferenceCount, searchLeroyMerlin, searchSinapi } from "./external-search";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Busca externa de produtos e serviços sem dados fictícios", () => {
  it("retorna erro transparente quando a Leroy falha sem gerar produtos falsos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("API indisponível")));
    await expect(searchLeroyMerlin("tinta acrílica")).rejects.toThrow("API indisponível");
  });

  it("interpreta resultados JSON da Leroy Merlin", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [{ name: "Tinta Premium 18L", brand: "Coral", price: "R$ 199,90", sku: "COR-18" }] }),
    }));
    const response = await searchLeroyMerlin("tinta");

    expect(response.results[0]).toMatchObject({ name: "Tinta Premium 18L", brand: "Coral", price: 199.9, code: "COR-18", coverage: "até 200 m²" });
  });

  it("busca na base oficial SINAPI", async () => {
    const response = await searchSinapi("manta asfáltica", "impermeabilizacao");
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results.every((item) => item.category === "impermeabilizacao")).toBe(true);
    expect(response.results.every((item) => item.source === "SINAPI")).toBe(true);
  });

  it("mantém exatamente 27 itens na referência SINAPI", () => {
    expect(getSinapiReferenceCount()).toBe(27);
  });

  it("rejeita termos curtos", async () => {
    await expect(searchLeroyMerlin("ab")).rejects.toThrow("pelo menos 3 caracteres");
    await expect(searchSinapi("ab")).rejects.toThrow("pelo menos 3 caracteres");
  });
});
