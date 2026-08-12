export type LeroySearchResult = {
  name: string;
  brand?: string;
  price: number;
  code?: string;
  type: string;
  coverage?: string;
  unit: string;
  source: "Leroy Merlin";
  simulated: boolean;
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

function parseLeroyProducts(payload: unknown): LeroySearchResult[] {
  const parsed: Array<LeroySearchResult | undefined> = findArray(payload).map((entry) => {
    if (!entry || typeof entry !== "object") return undefined;
    const object = entry as SearchPayload;
    const name = getString(object, ["name", "title", "productName", "description"]);
    const price = parsePrice(object.price ?? object.salePrice ?? object.value ?? object.bestPrice);
    if (!name || price === undefined || price <= 0) return undefined;
    const brand = getString(object, ["brand", "manufacturer", "marca"]);
    const code = getString(object, ["code", "sku", "id", "productId"]);
    return {
      name,
      ...(brand ? { brand } : {}),
      price,
      ...(code ? { code } : {}),
      type: detectPaintType(`${name} ${object.category ?? ""}`),
      coverage: estimateCoverage(name),
      unit: "un",
      source: "Leroy Merlin",
      simulated: false,
    } satisfies LeroySearchResult;
  });
  return parsed.filter((item): item is LeroySearchResult => item !== undefined).slice(0, 10);
}

function fallbackLeroyProducts(searchTerm: string): LeroySearchResult[] {
  const type = detectPaintType(searchTerm);
  const normalizedTerm = searchTerm.trim();
  const brands = ["Suvinil", "Coral", "Sherwin-Williams", "Lukscolor", "Eucatex"];
  const sizes = ["900ml", "3,6L", "18L"];
  const base = numberHash(normalizedTerm);
  return brands.map((brand, index) => {
    const size = sizes[index % sizes.length];
    const price = 80 + ((base + index * 37) % 201);
    const name = `${normalizedTerm} ${type} ${size}`.replace(/\s+/g, " ");
    return {
      name,
      brand,
      price,
      code: `REF-${String((base + index) % 100000).padStart(5, "0")}`,
      type,
      coverage: estimateCoverage(name),
      unit: "un",
      source: "Leroy Merlin",
      simulated: true,
    };
  });
}

async function fetchJson(url: string, timeoutMs = 7000) {
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

export async function searchLeroyMerlin(searchTerm: string) {
  const term = searchTerm.trim();
  if (term.length < 3) throw new Error("Digite pelo menos 3 caracteres para buscar produtos.");

  try {
    const url = `https://www.leroymerlin.com.br/api/v1/search?term=${encodeURIComponent(term)}&page=1&resultsPerPage=10`;
    const payload = await fetchJson(url);
    const results = parseLeroyProducts(payload);
    if (results.length > 0) return { results, simulated: false, message: "Resultados encontrados na Leroy Merlin." };
  } catch (error) {
    console.warn("[Leroy] Busca externa indisponível, usando fallback:", error instanceof Error ? error.message : error);
  }

  return {
    results: fallbackLeroyProducts(term),
    simulated: true,
    message: "A fonte externa não respondeu. Estes resultados são referências simuladas e devem ser conferidos antes do uso.",
  };
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

function parseSinapiText(text: string, searchTerm: string, category?: SinapiCategory) {
  const normalizedSearch = normalize(searchTerm);
  const normalizedCategory = category ? normalize(category) : undefined;
  const results: SinapiSearchResult[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);

  for (const line of lines) {
    const codeMatch = line.match(/\b(\d{5,6})\b/);
    const priceMatch = line.match(/R\$?\s?([\d.]+,\d{2})/i) ?? line.match(/\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/);
    if (!codeMatch || !priceMatch) continue;
    const price = parsePrice(priceMatch[1]);
    if (!price || price <= 0 || price > 500) continue;
    const description = line.replace(codeMatch[0], "").replace(priceMatch[0], "").trim();
    const normalizedDescription = normalize(description);
    if (normalizedSearch && !normalizedDescription.includes(normalizedSearch)) continue;
    const detectedCategory: SinapiCategory = /impermeab|manta|membrana|poliuretano|piscina/.test(normalizedDescription) ? "impermeabilizacao" : "pintura";
    if (normalizedCategory && detectedCategory !== normalizedCategory) continue;
    results.push({
      code: codeMatch[1],
      description,
      unit: line.includes("m²") || line.includes("m2") ? "m²" : line.includes("kg") ? "kg" : "un",
      price,
      category: detectedCategory,
      source: "SINAPI",
    });
  }
  return results;
}

async function fetchText(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain,*/*",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; OrcaMaster/1.0)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithFirecrawl(url: string) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return undefined;
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown", "html"] }),
  });
  if (!response.ok) throw new Error(`Firecrawl HTTP ${response.status}`);
  const payload = await response.json() as SearchPayload;
  const data = payload.data as SearchPayload | undefined;
  return String(data?.markdown ?? data?.html ?? payload.markdown ?? payload.html ?? "");
}

async function searchWithFirecrawl(query: string) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];
  const response = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 5, scrapeOptions: { formats: ["markdown"] } }),
  });
  if (!response.ok) throw new Error(`Firecrawl search HTTP ${response.status}`);
  const payload = await response.json() as SearchPayload;
  const data = Array.isArray(payload.data) ? payload.data : [];
  return data.map((entry) => {
    if (!entry || typeof entry !== "object") return "";
    const item = entry as SearchPayload;
    return String(item.markdown ?? item.description ?? item.content ?? item.title ?? "");
  }).filter(Boolean);
}

export async function searchSinapi(searchTerm: string, category?: SinapiCategory) {
  const term = searchTerm.trim();
  if (term.length < 3) throw new Error("Digite pelo menos 3 caracteres para buscar serviços.");

  let externalResults: SinapiSearchResult[] = [];
  try {
    const url = `https://sinapi.app/pesquisa?q=${encodeURIComponent(term)}`;
    const html = await fetchText(url);
    externalResults = parseSinapiText(html, term, category);
  } catch (error) {
    console.warn("[SINAPI] Scraping direto indisponível:", error instanceof Error ? error.message : error);
  }

  if (externalResults.length === 0 && process.env.FIRECRAWL_API_KEY) {
    try {
      const markdown = await fetchWithFirecrawl(`https://sinapi.app/pesquisa?q=${encodeURIComponent(term)}`);
      externalResults = parseSinapiText(markdown ?? "", term, category);
    } catch (error) {
      console.warn("[SINAPI] Scraping via Firecrawl indisponível:", error instanceof Error ? error.message : error);
    }
  }

  if (externalResults.length === 0 && process.env.FIRECRAWL_API_KEY) {
    try {
      const queries = [
        `site:sinapi.app ${term}`,
        `SINAPI ${term} preço m2 2024`,
        `tabela SINAPI ${term} custo unitário`,
      ];
      const documents: string[] = [];
      for (const query of queries) {
        documents.push(...await searchWithFirecrawl(query));
        if (documents.length >= 5) break;
      }
      externalResults = parseSinapiText(documents.join("\\n"), term, category);
    } catch (error) {
      console.warn("[SINAPI] Busca web via Firecrawl indisponível, usando base de referência:", error instanceof Error ? error.message : error);
    }
  }

  const normalizedTerm = normalize(term);
  const fallback = SINAPI_REFERENCE.filter((item) => {
    const matchesTerm = normalize(item.description).includes(normalizedTerm) || normalize(term).split(/\s+/).some((word) => word.length > 3 && normalize(item.description).includes(word));
    return matchesTerm && (!category || item.category === category);
  });
  const results = [...externalResults, ...fallback].filter((item, index, list) => list.findIndex((candidate) => candidate.code === item.code || normalize(candidate.description) === normalize(item.description)) === index).slice(0, 25);

  return {
    results,
    source: externalResults.length > 0 ? "sinapi.app" : "base de referência SINAPI 2024",
    fallback: externalResults.length === 0,
    message: externalResults.length > 0 ? "Resultados consultados no SINAPI." : "Fonte externa indisponível. Exibindo valores de referência para conferência.",
  };
}

export function getSinapiReferenceCount() {
  return SINAPI_REFERENCE.length;
}
