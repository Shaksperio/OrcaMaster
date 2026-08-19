import { afterEach, describe, expect, it, vi } from "vitest";
import { getSinapiReferenceCount, searchAcalHomeCenter, searchLeroyMerlin, searchSinapi } from "./external-search";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Busca externa de produtos e serviços sem dados fictícios", () => {
  it("retorna erro transparente quando a Leroy falha sem gerar produtos falsos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("API indisponível")));
    await expect(searchLeroyMerlin("tinta acrílica")).rejects.toThrow();
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

  it("não inventa preço nem SKU quando a fonte JSON não os fornece", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [{ name: "Tinta Apenas Nome" }] }),
    }));
    const response = await searchLeroyMerlin("tinta");
    expect(response.results[0].price).toBeUndefined();
    expect(response.results[0].sku).toBeUndefined();
    expect(response.results[0].currency).toBeUndefined();
  });

  it("não inventa preço nem SKU na busca Acal quando ausentes na fonte", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [{ name: "Produto Acal Simples" }] }),
    }));
    const response = await searchAcalHomeCenter("cimento");
    expect(response.results[0].price).toBeUndefined();
    expect(response.results[0].sku).toBeUndefined();
  });

  it("faz parsing defensivo de JSON-LD público da Leroy sem Firecrawl", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: false, text: async () => "" })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `<script type="application/ld+json">${JSON.stringify({
          "@type": "Product",
          name: "Tinta Real 18L",
          sku: "REAL-18",
          url: "https://www.leroymerlin.com.br/produto-real",
          brand: { name: "Marca Real" },
          offers: { price: "199,90", priceCurrency: "BRL", availability: "https://schema.org/InStock" },
        })}</script>`,
      }));

    const response = await searchLeroyMerlin("tinta");
    expect(response.source).toContain("Busca pública direta");
    expect(response.results[0]).toMatchObject({
      name: "Tinta Real 18L",
      brand: "Marca Real",
      price: 199.9,
      sku: "REAL-18",
      productUrl: "https://www.leroymerlin.com.br/produto-real",
      availability: "https://schema.org/InStock",
    });
  });

  it("mantém campos ausentes na página pública Acal sem placeholders", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Produto Acal Real" })}</script>`,
      }));

    const response = await searchAcalHomeCenter("cimento");
    expect(response.source).toContain("Busca pública direta");
    expect(response.results[0].name).toBe("Produto Acal Real");
    expect(response.results[0].price).toBeUndefined();
    expect(response.results[0].sku).toBeUndefined();
    expect(response.results[0].availability).toBeUndefined();
    expect(response.results[0].productUrl).toBeUndefined();
  });

  it("retorna erro transparente quando a Leroy bloqueia todas as consultas públicas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, text: async () => "captcha" }));
    await expect(searchLeroyMerlin("tinta")).rejects.toThrow("Não foi possível consultar a Leroy Merlin");
  });

  it("retorna erro transparente quando o HTML público da Acal não contém produto válido", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValue({ ok: true, text: async () => "<html><body>captcha ou conteúdo sem JSON-LD</body></html>" }));
    await expect(searchAcalHomeCenter("cimento")).rejects.toThrow("Não foi possível consultar a Acal Home Center");
  });
});
