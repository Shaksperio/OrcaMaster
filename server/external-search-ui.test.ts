import { describe, expect, it } from "vitest";
import { getLeroySearchState, mapLeroyResultToProduct } from "../client/src/components/LeroyProductSearch";
import { getSinapiSearchState, mapSinapiResultToProduct } from "../client/src/components/SinapiSearch";

describe("Fluxo visual e integração do catálogo externo", () => {
  it("representa corretamente os estados da busca Leroy", () => {
    expect(getLeroySearchState({ hasSearched: false, isFetching: false, hasError: false, resultCount: 0 })).toBe("idle");
    expect(getLeroySearchState({ hasSearched: true, isFetching: true, hasError: false, resultCount: 0 })).toBe("loading");
    expect(getLeroySearchState({ hasSearched: true, isFetching: false, hasError: true, resultCount: 0 })).toBe("error");
    expect(getLeroySearchState({ hasSearched: true, isFetching: false, hasError: false, resultCount: 0 })).toBe("empty");
    expect(getLeroySearchState({ hasSearched: true, isFetching: false, hasError: false, resultCount: 1 })).toBe("results");
  });

  it("mapeia o botão Adicionar Leroy para o cadastro local", () => {
    expect(mapLeroyResultToProduct({
      name: "Tinta acrílica 18L",
      brand: "Coral",
      type: "Acrílica",
      coverage: "até 200 m²",
      code: "COR-18",
      price: 199.9,
      unit: "un",
    })).toEqual({
      name: "Tinta acrílica 18L",
      description: "Coral · Acrílica · Rendimento estimado: até 200 m²",
      sku: "COR-18",
      category: "Leroy Merlin · Acrílica",
      price: 199.9,
      unit: "un",
    });
  });

  it("representa estados vazio e com resultados da busca SINAPI", () => {
    expect(getSinapiSearchState({ hasSearched: true, isFetching: false, hasError: false, resultCount: 0 })).toBe("empty");
    expect(getSinapiSearchState({ hasSearched: true, isFetching: false, hasError: false, resultCount: 2 })).toBe("results");
  });

  it("mapeia o botão Usar SINAPI para um produto/serviço local", () => {
    expect(mapSinapiResultToProduct({
      description: "Pintura látex acrílica em paredes",
      code: "88489",
      category: "pintura",
      price: 16.42,
      unit: "m²",
      referenceYear: 2024,
    })).toEqual({
      name: "Pintura látex acrílica em paredes",
      description: "Serviço SINAPI 88489 · Referência 2024",
      sku: "SINAPI-88489",
      category: "SINAPI · Pintura",
      price: 16.42,
      unit: "m²",
    });
  });
});
