import * as db from "./db";
import { searchAcalHomeCenter, searchLeroyMerlin, type ExternalProductResult } from "./external-search";
import { syncToFirebase } from "./firebase-sync";

type SyncableProduct = Awaited<ReturnType<typeof db.getSyncEnabledExternalProducts>>[number];

type SyncSummary = {
  processed: number;
  updated: number;
  unchanged: number;
  missingPrice: number;
  failed: number;
  errors: Array<{ productId: number; message: string }>;
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function supplierFor(product: SyncableProduct) {
  return normalize(product.externalSource).includes("acal") || normalize(product.externalSource).includes("home center")
    ? "acal"
    : "leroy";
}

function findMatchingResult(product: SyncableProduct, results: ExternalProductResult[]) {
  const externalSku = normalize(product.externalSku);
  const externalUrl = normalize(product.externalUrl);
  const productName = normalize(product.name);

  return results.find((result) => externalSku && [result.sku, result.code, result.externalProductId].some((value) => normalize(value) === externalSku))
    ?? results.find((result) => externalUrl && normalize(result.productUrl) === externalUrl)
    ?? results.find((result) => productName && normalize(result.name) === productName);
}

function decimalValue(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function markSyncFailure(product: SyncableProduct, message: string) {
  const updated = await db.updateProduct(product.id, {
    externalStatus: "error",
    lastSyncedAt: new Date(),
  });
  if (updated) await syncToFirebase("product", product.id, updated, { companyId: product.companyId });
  return message;
}

async function syncOneProduct(product: SyncableProduct): Promise<"updated" | "unchanged" | "missingPrice" | "failed"> {
  try {
    const response = supplierFor(product) === "acal"
      ? await searchAcalHomeCenter(product.name)
      : await searchLeroyMerlin(product.name);
    const match = findMatchingResult(product, response.results);

    if (!match || match.price === undefined) {
      const updated = await db.updateProduct(product.id, {
        externalStatus: "missing_price",
        lastSyncedAt: new Date(),
      });
      if (updated) await syncToFirebase("product", product.id, updated, { companyId: product.companyId });
      return "missingPrice";
    }

    const previousExternalPrice = decimalValue(product.externalPrice);
    const nextExternalPrice = match.price;
    const priceChanged = previousExternalPrice === undefined || previousExternalPrice !== nextExternalPrice;
    const nextData: Parameters<typeof db.updateProduct>[1] = {
      externalPrice: String(nextExternalPrice),
      externalStatus: "active",
      lastSyncedAt: new Date(),
      ...(match.sku || match.code || match.externalProductId ? { externalSku: match.sku ?? match.code ?? match.externalProductId } : {}),
      ...(match.productUrl ? { externalUrl: match.productUrl } : {}),
      ...(product.priceSource === "external" ? { price: String(nextExternalPrice) } : {}),
    };

    const updated = await db.updateProduct(product.id, nextData);
    if (priceChanged) {
      await db.addProductPriceHistory({
        productId: product.id,
        supplier: match.supplier,
        oldPrice: previousExternalPrice === undefined ? null : String(previousExternalPrice),
        newPrice: String(nextExternalPrice),
      });
    }
    if (updated) await syncToFirebase("product", product.id, updated, { companyId: product.companyId });
    return priceChanged ? "updated" : "unchanged";
  } catch (error) {
    await markSyncFailure(product, String(error instanceof Error ? error.message : error));
    return "failed";
  }
}

export async function syncExternalProducts(): Promise<SyncSummary> {
  const products = await db.getSyncEnabledExternalProducts();
  const summary: SyncSummary = {
    processed: products.length,
    updated: 0,
    unchanged: 0,
    missingPrice: 0,
    failed: 0,
    errors: [],
  };

  for (const product of products) {
    const result = await syncOneProduct(product);
    summary[result] += 1;
    if (result === "failed") {
      summary.errors.push({ productId: product.id, message: "Falha ao consultar a fonte externa" });
    }
  }

  return summary;
}
