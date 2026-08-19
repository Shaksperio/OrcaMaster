import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncExternalProducts } from "./product-sync";
import * as db from "./db";
import * as externalSearch from "./external-search";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof db>();
  return {
    ...actual,
    getSyncEnabledExternalProducts: vi.fn(),
    updateProduct: vi.fn(),
    addProductPriceHistory: vi.fn(),
  };
});

vi.mock("./external-search", () => ({
  searchLeroyMerlin: vi.fn(),
  searchAcalHomeCenter: vi.fn(),
}));

vi.mock("./firebase-sync", () => ({
  syncToFirebase: vi.fn(),
}));

describe("Rotina de Sincronização de Produtos Externos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("atualiza o preço do produto e registra histórico quando o preço externo muda", async () => {
    const mockProduct = {
      id: 1,
      companyId: 1,
      name: "Tinta Acrílica 18L",
      externalSource: "Leroy Merlin",
      externalSku: "LEROY-123",
      externalUrl: "https://www.leroymerlin.com.br/produto",
      externalPrice: "180.00",
      priceSource: "external",
      syncEnabled: true,
      sourceType: "external",
    };

    vi.mocked(db.getSyncEnabledExternalProducts).mockResolvedValueOnce([mockProduct as any]);
    vi.mocked(externalSearch.searchLeroyMerlin).mockResolvedValueOnce({
      results: [
        {
          name: "Tinta Acrílica 18L",
          price: 195.50,
          sku: "LEROY-123",
          productUrl: "https://www.leroymerlin.com.br/produto",
          supplier: "Leroy Merlin",
          lastUpdated: new Date().toISOString(),
        },
      ],
      source: "Leroy Merlin (Busca pública direta)",
      lastSyncedAt: new Date().toISOString(),
    });

    vi.mocked(db.updateProduct).mockResolvedValueOnce({ ...mockProduct, externalPrice: "195.50" } as any);

    const summary = await syncExternalProducts();

    expect(summary.processed).toBe(1);
    expect(summary.updated).toBe(1);
    expect(db.addProductPriceHistory).toHaveBeenCalledWith({
      productId: 1,
      supplier: "Leroy Merlin",
      oldPrice: "180",
      newPrice: "195.5",
    });
  });

  it("marca missingPrice quando a fonte não retorna preço válido", async () => {
    const mockProduct = {
      id: 2,
      companyId: 1,
      name: "Cimento CP-II",
      externalSource: "Acal Home Center",
      externalSku: "ACAL-999",
      externalUrl: "https://www.acalhomecenter.com.br/produto",
      externalPrice: "35.00",
      priceSource: "external",
      syncEnabled: true,
      sourceType: "external",
    };

    vi.mocked(db.getSyncEnabledExternalProducts).mockResolvedValueOnce([mockProduct as any]);
    vi.mocked(externalSearch.searchAcalHomeCenter).mockResolvedValueOnce({
      results: [
        {
          name: "Cimento CP-II",
          supplier: "Acal Home Center",
          lastUpdated: new Date().toISOString(),
        },
      ],
      source: "Acal API",
      lastSyncedAt: new Date().toISOString(),
    });

    vi.mocked(db.updateProduct).mockResolvedValueOnce({ ...mockProduct, externalStatus: "missing_price" } as any);

    const summary = await syncExternalProducts();

    expect(summary.processed).toBe(1);
    expect(summary.missingPrice).toBe(1);
    expect(db.addProductPriceHistory).not.toHaveBeenCalled();
  });
});
