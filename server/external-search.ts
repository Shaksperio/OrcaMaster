export type ProductSource = "Leroy Merlin" | "Acal Home Center";

export type ExternalProductResult = {
  name: string;
  brand?: string;
  price: number;
  code?: string;
  type: string;
  coverage?: string;
  unit: string;
  source: ProductSource;
  simulated: boolean;
  category?: string;
  description?: string;
  availability?: string;
  url?: string;
  lastUpdated: string;
};

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

type SearchPayload = Record<string, unknown>;

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

function numberHash(value: string) {
  let hash = 7;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function detectPaintType(term: string) {
  const normalized = normalize(term);
  if (normalized.includes("epoxi")) return "Epóxi";
  if (normalized.includes("esmalte")) return "Esmalte";
  if (normalized.includes("textura") || normalized.includes("grafiato")) return "Textura/Grafiato";
  if (normalized.includes("verniz")) return "Verniz";
  if (normalized.includes("massa")) return "Massa corrida";
  if (normalized.includes("impermeab") || normalized.includes("manta")) return "Impermeabilizante";
  if (normalized.includes("piso") || normalized.includes("revestimento") || normalized.includes("porcelanato")) return "Piso e Revestimento";
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
  if (!data || typeof data !== "object") return [];
  const object = data as SearchPayload;
  const directCandidates = [
    object.products,
    object.results,
    object.items,
    object.hits,
    object.data,
    (object.data as SearchPayload | undefined)?.products,
    (object.data as SearchPayload | undefined)?.results,
    (object.data as SearchPayload | undefined)?.items,
    (object.data as SearchPayload | undefined)?.hits,
  ];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function getString(object: SearchPayload, keys: string[]) {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export async function searchLeroyMerlin(searchTerm: string): Promise<{ results: ExternalProductResult[]; simulated: boolean; error?: string }> {
  const now = new Date().toISOString();
  if (!searchTerm || searchTerm.trim().length < 3) {
    throw new Error("O termo de busca deve ter pelo menos 3 caracteres.");
  }

  try {
    const url = `https://www.leroymerlin.com.br/api/v1/search?term=${encodeURIComponent(searchTerm)}&page=1&resultsPerPage=10`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const payload = await response.json();
    const items = findArray(payload);
    const results: ExternalProductResult[] = [];

    for (const entry of items) {
      if (!entry || typeof entry !== "object") continue;
      const object = entry as SearchPayload;
      const name = getString(object, ["name", "title", "productName", "description"]);
      const price = parsePrice(object.price ?? object.salePrice ?? object.value ?? object.bestPrice);
      if (!name || price === undefined || price <= 0) continue;
      const brand = getString(object, ["brand", "manufacturer", "marca"]);
      const code = getString(object, ["code", "sku", "id", "productId"]);

      results.push({
        name,
        ...(brand ? { brand } : {}),
        price,
        ...(code ? { code } : {}),
        type: detectPaintType(`${name} ${object.category ?? ""}`),
        coverage: estimateCoverage(name),
        unit: "un",
        source: "Leroy Merlin",
        simulated: false,
        category: getString(object, ["category"]) ?? "Tintas e Impermeabilizantes",
        description: getString(object, ["description", "shortDescription"]) ?? name,
        availability: "Em estoque",
        url: getString(object, ["url", "link"]) ?? `https://www.leroymerlin.com.br/busca?term=${encodeURIComponent(searchTerm)}`,
        lastUpdated: now,
      });
    }

    if (results.length > 0) {
      return { results, simulated: false };
    }
    throw new Error("Nenhum produto válido retornado pela API da Leroy");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    const baseHash = numberHash(searchTerm);
    const brands = ["Suvinil", "Coral", "Sherwin-Williams", "Lukscolor", "Eucatex"];
    const types = ["Acrílica", "Látex", "Esmalte", "Verniz", "Massa corrida"];
    
    const simulatedResults: ExternalProductResult[] = Array.from({ length: 5 }).map((_, index) => {
      const brand = brands[(baseHash + index) % brands.length];
      const paintType = types[(baseHash + index) % types.length];
      return {
        name: `${searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1)} ${paintType} ${index === 0 ? "18L" : index === 1 ? "3,6L" : "900ml"}`,
        brand,
        price: Number((80 + ((baseHash + index * 37) % 200)).toFixed(2)),
        code: `LM-${10000 + ((baseHash + index * 17) % 90000)}`,
        type: paintType,
        coverage: index === 0 ? "até 200 m²" : index === 1 ? "até 40 m²" : "até 8 m²",
        unit: "un",
        source: "Leroy Merlin",
        simulated: true,
        category: "Tintas e Acabamento",
        description: `Produto simulado de contingência para ${searchTerm} da marca ${brand}.`,
        availability: "Em estoque",
        url: `https://www.leroymerlin.com.br/busca?term=${encodeURIComponent(searchTerm)}`,
        lastUpdated: now,
      };
    });

    return { results: simulatedResults, simulated: true, error: errorMsg };
  }
}

export async function searchAcalHomeCenter(searchTerm: string): Promise<{ results: ExternalProductResult[]; simulated: boolean; error?: string }> {
  const now = new Date().toISOString();
  if (!searchTerm || searchTerm.trim().length < 3) {
    throw new Error("O termo de busca deve ter pelo menos 3 caracteres.");
  }

  try {
    const url = `https://www.acalhomecenter.com.br/api/catalog_system/pub/products/search?ft=${encodeURIComponent(searchTerm)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const payload = await response.json();
    const items = findArray(payload);
    const results: ExternalProductResult[] = [];

    for (const entry of items) {
      if (!entry || typeof entry !== "object") continue;
      const object = entry as SearchPayload;
      const name = getString(object, ["productName", "name", "title"]);
      const itemsList = findArray(object.items);
      const firstItem = (itemsList[0] as SearchPayload | undefined) ?? {};
      const sellers = findArray(firstItem.sellers);
      const firstSeller = (sellers[0] as SearchPayload | undefined) ?? {};
      const commPrice = firstSeller.commertialOffer as SearchPayload | undefined;
      const price = parsePrice(commPrice?.Price ?? object.price ?? firstItem.price);

      if (!name || price === undefined || price <= 0) continue;
      const brand = getString(object, ["brand", "marca"]);
      const code = getString(object, ["productId", "productReference", "itemId"]);

      results.push({
        name,
        ...(brand ? { brand } : {}),
        price,
        ...(code ? { code } : {}),
        type: detectPaintType(`${name} ${object.category ?? ""}`),
        coverage: estimateCoverage(name),
        unit: "un",
        source: "Acal Home Center",
        simulated: false,
        category: getString(object, ["categories0", "category"]) ?? "Pisos e Revestimentos",
        description: getString(object, ["description"]) ?? name,
        availability: "Em estoque",
        url: getString(object, ["link"]) ?? `https://www.acalhomecenter.com.br/${encodeURIComponent(searchTerm)}`,
        lastUpdated: now,
      });
    }

    if (results.length > 0) {
      return { results, simulated: false };
    }
    throw new Error("Nenhum produto retornado pela VTEX da Acal");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    const baseHash = numberHash(searchTerm + "acal");
    const brands = ["Acal Exclusive", "Portobello", "Eliane", "Suvinil", "Quartzolit"];
    const simulatedResults: ExternalProductResult[] = Array.from({ length: 4 }).map((_, index) => {
      const brand = brands[(baseHash + index) % brands.length];
      return {
        name: `Material Acal ${searchTerm} Ref ${index + 1}`,
        brand,
        price: Number((95 + ((baseHash + index * 41) % 180)).toFixed(2)),
        code: `ACAL-${50000 + ((baseHash + index * 19) % 40000)}`,
        type: detectPaintType(searchTerm),
        coverage: "conforme especificação",
        unit: "un",
        source: "Acal Home Center",
        simulated: true,
        category: "Pisos, Louças e Tintas",
        description: `Produto simulado Acal para ${searchTerm} da marca ${brand}.`,
        availability: "Retirada em loja em 1h",
        url: `https://www.acalhomecenter.com.br/?s=${encodeURIComponent(searchTerm)}`,
        lastUpdated: now,
      };
    });

    return { results: simulatedResults, simulated: true, error: errorMsg };
  }
}

export async function searchAllExternalProviders(searchTerm: string) {
  const [leroyRes, acalRes] = await Promise.all([
    searchLeroyMerlin(searchTerm),
    searchAcalHomeCenter(searchTerm),
  ]);

  return {
    leroy: leroyRes.results,
    leroySimulated: leroyRes.simulated,
    leroyError: leroyRes.error,
    acal: acalRes.results,
    acalSimulated: acalRes.simulated,
    acalError: acalRes.error,
    all: [...leroyRes.results, ...acalRes.results],
  };
}

const sinapiDatabase: SinapiSearchResult[] = [
  { code: "88489", description: "Aplicação de fundo selador acrílico em paredes, duas demãos", unit: "m²", price: 6.85, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88488", description: "Aplicação de tinta latex PVA em paredes, duas demãos", unit: "m²", price: 11.40, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88494", description: "Aplicação de tinta acrílica em paredes, duas demãos", unit: "m²", price: 14.50, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88497", description: "Pintura com tinta esmalte sintético em esquadrias de madeira, duas demãos", unit: "m²", price: 33.20, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88501", description: "Pintura com tinta esmalte sintético em superfícies metálicas, duas demãos", unit: "m²", price: 35.80, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88512", description: "Aplicação de massa corrida em paredes internas, duas demãos", unit: "m²", price: 18.90, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88515", description: "Aplicação de textura acrílica em paredes externas", unit: "m²", price: 28.40, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88520", description: "Aplicação de verniz em superfícies de madeira, três demãos", unit: "m²", price: 42.10, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88525", description: "Pintura com tinta epóxi em pisos, duas demãos", unit: "m²", price: 45.00, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88530", description: "Pintura de teto com tinta latex PVA", unit: "m²", price: 13.20, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88535", description: "Pintura com tinta acrílica em muros e fachadas", unit: "m²", price: 16.80, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88540", description: "Pintura decorativa com efeito cimento queimado", unit: "m²", price: 55.00, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88545", description: "Aplicação de selador para madeira antes do verniz", unit: "m²", price: 12.50, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88550", description: "Pintura de portas de madeira com esmalte sintético", unit: "m²", price: 31.00, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88555", description: "Pintura de grades metálicas com esmalte", unit: "m²", price: 29.50, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88560", description: "Remoção de pintura antiga com espátula e lixa", unit: "m²", price: 9.80, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "88565", description: "Lavagem de paredes com jato de água e sabão neutro", unit: "m²", price: 4.50, category: "pintura", source: "SINAPI", referenceYear: 2024 },
  { code: "98540", description: "Impermeabilização de lajes com manta asfáltica 3mm estruturada", unit: "m²", price: 98.50, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98542", description: "Impermeabilização de lajes com manta asfáltica 4mm estruturada", unit: "m²", price: 112.00, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98555", description: "Impermeabilização com argamassa polimérica bi-componente, três demãos", unit: "m²", price: 52.30, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98560", description: "Impermeabilização com membrana acrílica elástica, três demãos", unit: "m²", price: 46.70, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98575", description: "Impermeabilização de reservatórios ou piscinas com poliuretano líquido", unit: "m²", price: 146.00, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98580", description: "Impermeabilização de paredes de contenção com emulsãoasfáltica", unit: "m²", price: 24.50, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98585", description: "Aplicação de hidrofugante em fachadas de tijolo à vista ou concreto", unit: "m²", price: 18.20, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98590", description: "Impermeabilização de pisos frios em áreas molhadas com manta líquida", unit: "m²", price: 38.90, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98595", description: "Tratamento de trincas e fissuras com fita telada e selante elástico", unit: "m", price: 15.60, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
  { code: "98600", description: "Impermeabilização de calhas e rufos metálicos", unit: "m", price: 22.40, category: "impermeabilizacao", source: "SINAPI", referenceYear: 2024 },
];

export function getSinapiReferenceCount(): number {
  return sinapiDatabase.length;
}

export function searchSinapi(searchTerm: string, category?: SinapiCategory): { results: SinapiSearchResult[]; fallback: boolean } {
  if (!searchTerm || searchTerm.trim().length < 3) {
    throw new Error("O termo de busca deve ter pelo menos 3 caracteres.");
  }
  const normalizedTerm = normalize(searchTerm);

  const results = sinapiDatabase.filter((item) => {
    const matchesCategory = !category || item.category === category;
    const matchesTerm =
      normalize(item.description).includes(normalizedTerm) ||
      item.code.includes(normalizedTerm);
    return matchesCategory && matchesTerm;
  });

  return { results, fallback: true };
}
