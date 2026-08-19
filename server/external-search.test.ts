import { afterEach, describe, expect, it, vi } from "vitest";
import { getSinapiReferenceCount, searchLeroyMerlin, searchSinapi } from "./external-search";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Busca externa de produtos e serviços", () => {
  it("usa o fallback Leroy quando a API externa falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("indisponível")));
    const response = await searchLeroyMerlin("tinta acrílica");

    expect(response.simulated).toBe(true);
    expect(response.results).toHaveLength(5);
    expect(response.results.every((item) => item.source === "Leroy Merlin")).toBe(true);
    expect(response.results.every((item) => item.price > 0)).toBe(true);
  });

  it("interpreta resultados JSON da Leroy Merlin", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [{ name: "Tinta Premium 18L", brand: "Coral", price: "R$ 199,90", sku: "COR-18" }] }),
    }));
    const response = await searchLeroyMerlin("tinta");

    expect(response.simulated).toBe(false);
    expect(response.results[0]).toMatchObject({ name: "Tinta Premium 18L", brand: "Coral", price: 199.9, code: "COR-18", coverage: "até 200 m²" });
  });

  it("usa a base interna SINAPI quando as fontes externas falham", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("indisponível")));
    const response = await searchSinapi("manta asfáltica", "impermeabilizacao");

    expect(response.fallback).toBe(true);
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results.every((item) => item.category === "impermeabilizacao")).toBe(true);
    expect(response.results.every((item) => item.source === "SINAPI")).toBe(true);
  });

  it("mantém exatamente 27 itens na referência interna", () => {
    expect(getSinapiReferenceCount()).toBe(27);
  });

  it("rejeita termos curtos", () => {
    expect(() => searchSinapi("ab")).toThrow();
  });
});
