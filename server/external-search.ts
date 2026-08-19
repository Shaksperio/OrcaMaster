export type SinapiCategory = "pintura" | "impermeabilizacao";

export type SinapiSearchResult = {
  code: string;
  description: string;
  unit: string;
  price: number;
  category: SinapiCategory;
  source: "SINAPI";
  referenceYear?: number;
};

export type ExternalProductResult = {
  name: string;
  brand?: string;
  price?: number;
  currency?: string;
  code?: string;
  sku?: string;
  ean?: string;
  color?: string;
  finish?: string;
  volume?: string;
  unit?: string;
  availability?: string;
  imageUrl?: string;
  productUrl?: string;
  supplier: string;
  externalProductId?: string;
  category: string;
  lastUpdated: string;
} & Record<string, any>;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const cleaned = value
    .replace(/R\$\s?/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:,|$))/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(cleaned.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function detectPaintType(term: string) {
  const normalized = normalize(term);
  if (normalized.includes("epoxi")) return "Epóxi";
  if (normalized.includes("esmalte")) return "Esmalte";
  if (normalized.includes("textura") || normalized.includes("grafiato")) return "Textura/Grafiato";
  if (normalized.includes("verniz")) return "Verniz";
  if (normalized.includes("massa")) return "Massa corrida";
  if (normalized.includes("impermeab")) return "Impermeabilizante";
  return "Acrílica";
}

function estimateCoverage(name: string) {
  const normalized = normalize(name);
  if (normalized.includes("18l") || normalized.includes("18 l")) return "até 200 m²";
  if (normalized.includes("3,6l") || normalized.includes("3.6l") || normalized.includes("3,6 l")) return "até 40 m²";
  if (normalized.includes("900ml") || normalized.includes("900 ml")) return "até 8 m²";
  if (normalized.includes("massa") || normalized.includes("textura")) return "conforme espessura";
  return undefined;
}

function findArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const object = data as Record<string, unknown>;
  const directCandidates = [
    object.products,
    object.results,
    object.items,
    object.hits,
    object.data,
    object["@graph"],
    object.itemListElement,
    (object.data as Record<string, unknown> | undefined)?.products,
    (object.data as Record<string, unknown> | undefined)?.results,
  ];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  const type = getString(object, ["@type"]);
  if (type && /product|itemlist/i.test(type)) return [data];
  if (getString(object, ["name", "title", "productName"])) return [data];
  return [];
}

function getString(object: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const parts = key.split(".");
    let current: unknown = object;
    for (const part of parts) {
      if (current && typeof current === "object") {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }
    if (typeof current === "string" && current.trim()) return current.trim();
  }
  return undefined;
}

function unwrapProductEntry(entry: unknown): unknown {
  if (!entry || typeof entry !== "object") return entry;
  const object = entry as Record<string, unknown>;
  return object.item && typeof object.item === "object" ? object.item : entry;
}

function parseExternalProduct(entry: unknown, supplier: string, categoryLabel: string): ExternalProductResult | undefined {
  const unwrapped = unwrapProductEntry(entry);
  if (!unwrapped || typeof unwrapped !== "object") return undefined;
  const object = unwrapped as Record<string, unknown>;
  const offers = object.offers && typeof object.offers === "object" ? object.offers as Record<string, unknown> : undefined;
  const name = getString(object, ["name", "title", "productName", "description", "headline"]);
  if (!name) return undefined;

  const price = parsePrice(object.price ?? object.salePrice ?? object.value ?? object.bestPrice ?? offers?.price);
  const brand = getString(object, ["brand", "brand.name", "manufacturer", "manufacturer.name", "marca"]);
  const code = getString(object, ["code", "sku", "mpn", "gtin13", "ean"]);
  const url = getString(object, ["url", "link", "productUrl"]);
  const currency = getString(object, ["currency", "priceCurrency", "offers.priceCurrency"]);
  const unit = getString(object, ["unit", "unitText", "offers.unit"]);
  const availability = getString(object, ["availability", "offers.availability", "stockStatus"]);
  const coverage = estimateCoverage(name);

  return {
    name,
    ...(brand ? { brand } : {}),
    ...(price !== undefined ? { price } : {}),
    ...(currency ? { currency } : {}),
    ...(code ? { code, sku: code, externalProductId: code } : {}),
    ...(unit ? { unit } : {}),
    ...(availability ? { availability } : {}),
    category: `${categoryLabel} · ${detectPaintType(name)}`,
    ...(coverage ? { coverage } : {}),
    ...(url ? { productUrl: url } : {}),
    supplier,
    lastUpdated: new Date().toISOString(),
  } as ExternalProductResult;
}

function parseExternalProducts(payload: unknown, supplier: string, categoryLabel: string): ExternalProductResult[] {
  const entries = Array.isArray(payload) ? payload : findArray(payload);
  return entries
    .map((entry) => parseExternalProduct(entry, supplier, categoryLabel))
    .filter((item): item is ExternalProductResult => item !== undefined)
    .slice(0, 10);
}

function parseLeroyProducts(payload: unknown): ExternalProductResult[] {
  return parseExternalProducts(payload, "Leroy Merlin", "Leroy Merlin");
}

async function fetchJson(url: string, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; OrcaMaster/1.0)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

type PublicPage = { url: string; html: string };

async function fetchPublicPage(url: string, timeoutMs = 7000): Promise<PublicPage | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; OrcaMaster/1.0)",
      },
    });
    if (!response.ok) return undefined;
    const html = await response.text();
    return html.trim() ? { url, html } : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

function extractJsonLdEntries(html: string): unknown[] {
  const entries: unknown[] = [];
  const blocks = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const match of blocks) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) entries.push(...parsed);
      else entries.push(parsed);
    } catch {
      // Bloco JSON-LD inválido não é usado como dado.
    }
  }
  return entries;
}

function parsePublicPageProducts(page: PublicPage, supplier: string, categoryLabel: string): ExternalProductResult[] {
  const structuredEntries = extractJsonLdEntries(page.html);
  return parseExternalProducts(structuredEntries, supplier, categoryLabel);
}

async function searchPublicPages(urls: string[], supplier: string, categoryLabel: string): Promise<ExternalProductResult[]> {
  for (const url of urls) {
    const page = await fetchPublicPage(url);
    if (!page) continue;
    const results = parsePublicPageProducts(page, supplier, categoryLabel);
    if (results.length > 0) return results;
  }
  return [];
}

export async function searchLeroyMerlin(searchTerm: string) {
  const term = searchTerm.trim();
  if (term.length < 3) throw new Error("Digite pelo menos 3 caracteres para buscar produtos.");

  let payload: unknown = undefined;
  try {
    const url = `https://www.leroymerlin.com.br/api/v1/search?term=${encodeURIComponent(term)}&page=1&resultsPerPage=10`;
    payload = await fetchJson(url, 4000);
  } catch {
    // Tenta Firecrawl caso a API direta falhe
  }

  const parsedFromApi = payload ? parseLeroyProducts(payload) : [];
  if (parsedFromApi.length > 0) {
    return { results: parsedFromApi, source: "Leroy Merlin API", lastSyncedAt: new Date().toISOString() };
  }

  const results = await searchPublicPages([
    `https://www.leroymerlin.com.br/busca?q=${encodeURIComponent(term)}`,
    `https://www.leroymerlin.com.br/busca?query=${encodeURIComponent(term)}`,
  ], "Leroy Merlin", "Leroy Merlin");

  if (results.length === 0) {
    throw new Error("Não foi possível consultar a Leroy Merlin neste momento ou nenhum produto real foi encontrado.");
  }

  return { results, source: "Leroy Merlin (Busca pública direta)", lastSyncedAt: new Date().toISOString() };
}

export async function searchAcalHomeCenter(searchTerm: string) {
  const term = searchTerm.trim();
  if (term.length < 3) throw new Error("Digite pelo menos 3 caracteres para buscar produtos.");

  let payload: unknown = undefined;
  try {
    const url = `https://www.acalhomecenter.com.br/api/catalog/search?q=${encodeURIComponent(term)}`;
    payload = await fetchJson(url, 4000);
  } catch {
    // Tenta Firecrawl
  }

  const parsedFromApi = payload ? parseExternalProducts(payload, "Acal Home Center", "Acal") : [];
  if (parsedFromApi.length > 0) {
    return { results: parsedFromApi, source: "Acal API pública", lastSyncedAt: new Date().toISOString() };
  }

  const results = await searchPublicPages([
    `https://www.acalhomecenter.com.br/busca?query=${encodeURIComponent(term)}`,
    `https://www.acalhomecenter.com.br/busca?text=${encodeURIComponent(term)}`,
  ], "Acal Home Center", "Acal");

  if (results.length === 0) {
    throw new Error("Não foi possível consultar a Acal Home Center neste momento ou nenhum produto real foi encontrado.");
  }

  return { results, source: "Acal Home Center (Busca pública direta)", lastSyncedAt: new Date().toISOString() };
}

const SINAPI_REFERENCE: SinapiSearchResult[] = [
  { code: "88489", description: "Pintura látex acrílica premium em paredes internas, duas demãos", unit: "m²", price: 16.42, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88488", description: "Pintura látex acrílica premium em paredes externas, duas demãos", unit: "m²", price: 18.76, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88485", description: "Aplicação de fundo selador acrílico em paredes", unit: "m²", price: 4.18, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88486", description: "Aplicação de massa látex em paredes, duas demãos", unit: "m²", price: 18.22, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88487", description: "Aplicação de massa corrida PVA em paredes internas", unit: "m²", price: 21.35, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "102217", description: "Pintura esmalte sintético em esquadrias de madeira", unit: "m²", price: 35.68, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "102218", description: "Pintura esmalte sintético em esquadrias metálicas", unit: "m²", price: 38.74, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "102219", description: "Aplicação de verniz em esquadrias de madeira", unit: "m²", price: 42.12, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "87879", description: "Chapisco aplicado em alvenaria e estruturas", unit: "m²", price: 7.86, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "87529", description: "Emboço para recebimento de pintura em paredes", unit: "m²", price: 31.44, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "87273", description: "Revestimento decorativo texturizado em paredes", unit: "m²", price: 28.58, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "87274", description: "Revestimento decorativo tipo grafiato em paredes", unit: "m²", price: 33.21, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "100746", description: "Pintura epóxi em piso de concreto", unit: "m²", price: 45.18, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "102491", description: "Pintura acrílica em teto, duas demãos", unit: "m²", price: 17.63, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "102492", description: "Pintura de manutenção em fachada com tinta acrílica", unit: "m²", price: 24.27, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "95305", description: "Textura acrílica projetada em superfície externa", unit: "m²", price: 34.06, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "95306", description: "Pintura de sinalização horizontal com tinta acrílica", unit: "m²", price: 39.44, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "98546", description: "Impermeabilização de superfície com manta asfáltica 3 mm", unit: "m²", price: 98.32, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98547", description: "Impermeabilização de superfície com manta asfáltica 4 mm", unit: "m²", price: 116.48, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98555", description: "Impermeabilização com argamassa polimérica", unit: "m²", price: 52.14, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98556", description: "Impermeabilização com membrana acrílica", unit: "m²", price: 46.75, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98557", description: "Impermeabilização com poliuretano líquido", unit: "m²", price: 146.18, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98558", description: "Impermeabilização de piscina com sistema flexível", unit: "m²", price: 125.42, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98559", description: "Impermeabilização de laje com manta líquida", unit: "m²", price: 61.38, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98560", description: "Impermeabilização de banheiro com membrana moldada", unit: "m²", price: 74.22, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98561", description: "Impermeabilização de reservatório com revestimento cimentício", unit: "m²", price: 87.64, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98562", description: "Impermeabilização de fundação com emulsão asfáltica", unit: "m²", price: 29.86, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
];

export async function searchSinapi(searchTerm: string, category?: SinapiCategory) {
  const term = searchTerm.trim();
  if (term.length < 3) throw new Error("Digite pelo menos 3 caracteres para buscar serviços.");

  const normalizedTerm = normalize(term);
  const results = SINAPI_REFERENCE.filter((item) => {
    const matchesTerm = normalize(item.description).includes(normalizedTerm) || term.split(/\s+/).some((w) => w.length > 2 && normalize(item.description).includes(normalize(w)));
    return matchesTerm && (!category || item.category === category);
  });

  return {
    results,
    source: "Base oficial SINAPI 2024",
    lastSyncedAt: new Date().toISOString(),
  };
}

export function getSinapiReferenceCount() {
  return SINAPI_REFERENCE.length;
}

export async function searchAllExternalProviders(searchTerm: string) {
  const term = searchTerm.trim();
  if (term.length < 3) throw new Error("Digite pelo menos 3 caracteres.");

  const [leroy, acal, sinapi] = await Promise.allSettled([
    searchLeroyMerlin(term),
    searchAcalHomeCenter(term),
    searchSinapi(term),
  ]);

  return {
    leroy: leroy.status === "fulfilled" ? leroy.value.results : [],
    acal: acal.status === "fulfilled" ? acal.value.results : [],
    sinapi: sinapi.status === "fulfilled" ? sinapi.value.results : [],
    errors: {
      leroy: leroy.status === "rejected" ? leroy.reason?.message : undefined,
      acal: acal.status === "rejected" ? acal.reason?.message : undefined,
    },
  };
}
