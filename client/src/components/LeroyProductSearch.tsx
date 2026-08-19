import { useState } from "react";
import { Search, Loader2, Plus, ShoppingCart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export type LeroyProductSelection = {
  name: string;
  description: string;
  sku?: string;
  category?: string;
  price?: number;
  unit?: string;
  externalSource: string;
  externalSku?: string;
  externalUrl?: string;
  availability?: string;
  currency?: string;
};

type Props = {
  companyId: number;
  onSelect: (product: LeroyProductSelection) => Promise<void>;
};

export type LeroySearchState = "idle" | "loading" | "error" | "empty" | "results";

export function getLeroySearchState(input: { hasSearched: boolean; isFetching: boolean; hasError: boolean; resultCount: number }): LeroySearchState {
  if (!input.hasSearched) return "idle";
  if (input.isFetching) return "loading";
  if (input.hasError) return "error";
  return input.resultCount > 0 ? "results" : "empty";
}

export function mapLeroyResultToProduct(item: { name: string; brand?: string; type?: string; coverage?: string; code?: string; price?: number; unit?: string; productUrl?: string; availability?: string; currency?: string; category?: string }): LeroyProductSelection {
  const paintType = item.type || "Acrílica";
  return {
    name: item.name,
    description: `${item.brand ? `${item.brand} · ` : ""}${paintType}${item.coverage ? ` · Rendimento estimado: ${item.coverage}` : ""}`,
    sku: item.code,
    category: item.category || `Leroy Merlin · ${paintType}`,
    price: item.price,
    unit: item.unit,
    externalSource: "Leroy Merlin",
    externalSku: item.code,
    externalUrl: item.productUrl,
    availability: item.availability,
    currency: item.currency,
  };
}

export function LeroyProductSearch({ companyId, onSelect }: Props) {
  const [term, setTerm] = useState("");
  const [activeTerm, setActiveTerm] = useState("");
  const [addingCode, setAddingCode] = useState<string | undefined>();
  const searchQuery = trpc.products.searchLeroy.useQuery(
    { companyId, searchTerm: activeTerm },
    { enabled: Boolean(companyId && activeTerm), retry: false }
  );
  const searchState = getLeroySearchState({
    hasSearched: Boolean(activeTerm),
    isFetching: searchQuery.isFetching,
    hasError: Boolean(searchQuery.error),
    resultCount: searchQuery.data?.results.length ?? 0,
  });

  const handleSearch = () => {
    if (term.trim().length < 3) {
      toast.error("Digite pelo menos 3 caracteres para buscar.");
      return;
    }
    setActiveTerm(term.trim());
  };

  const handleAdd = async (item: NonNullable<typeof searchQuery.data>["results"][number]) => {
    setAddingCode(item.code);
    try {
      await onSelect(mapLeroyResultToProduct(item));
      toast.success("Resultado enviado para revisão de importação.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar o produto.");
    } finally {
      setAddingCode(undefined);
    }
  };

  return (
    <Card className="mb-6 border border-emerald-200 bg-emerald-50/40 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-emerald-900">
          <ShoppingCart className="h-5 w-5" />
          Buscar na Leroy Merlin
        </CardTitle>
        <CardDescription>
          Consulte materiais de pintura e construção. Resultados de referência devem ser conferidos antes de usar em um orçamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSearch()}
            placeholder="Ex.: tinta acrílica, massa corrida"
            className="bg-white"
          />
          <Button onClick={handleSearch} disabled={searchQuery.isFetching} className="bg-emerald-700 text-white hover:bg-emerald-800">
            {searchQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Buscar
          </Button>
        </div>

        {searchQuery.error && <p className="mt-3 text-sm text-red-700">{searchQuery.error.message}</p>}
        {searchQuery.data?.source && (
          <p className="mt-3 text-xs text-slate-600">Fonte: {searchQuery.data.source}</p>
        )}

        {searchState === "empty" && (
          <p className="mt-4 rounded-md border border-dashed bg-white p-4 text-sm text-slate-500">Nenhum produto encontrado para esta busca.</p>
        )}

        {searchQuery.data?.results && searchQuery.data.results.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchQuery.data.results.map((item) => (
              <div key={`${item.code ?? item.name}-${item.price}`} className="flex flex-col gap-3 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Leroy Merlin</Badge>

                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {[item.brand, item.code ? `SKU ${item.code}` : undefined, item.coverage].filter(Boolean).join(" · ") || "Produto consultado"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <strong className="text-emerald-800">{item.price !== undefined ? `R$ ${item.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Preço não informado"}</strong>
                  <Button size="sm" onClick={() => handleAdd(item)} disabled={addingCode === item.code} className="bg-emerald-700 text-white hover:bg-emerald-800">
                    {addingCode === item.code ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                    Revisar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
