import { useState } from "react";
import { Search, Loader2, Plus, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { ExternalProductResult } from "../../../server/external-search";

export type AcalProductSelection = {
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  unit: string;
  externalSource: string;
  externalSku: string;
};

type Props = {
  companyId: number;
  onSelect: (product: AcalProductSelection) => Promise<void>;
};

export type AcalSearchState = "idle" | "loading" | "error" | "empty" | "results";

export function getAcalSearchState(input: { hasSearched: boolean; isFetching: boolean; hasError: boolean; resultCount: number }): AcalSearchState {
  if (!input.hasSearched) return "idle";
  if (input.isFetching) return "loading";
  if (input.hasError) return "error";
  return input.resultCount > 0 ? "results" : "empty";
}

export function mapAcalResultToProduct(item: ExternalProductResult): AcalProductSelection {
  return {
    name: item.name,
    description: `${item.description ?? item.name} · Fornecedor: Acal Home Center (${item.brand ?? "Geral"}) · Atualizado em ${new Date(item.lastUpdated).toLocaleDateString("pt-BR")}`,
    sku: item.code ? `ACAL-${item.code}` : `ACAL-${Math.floor(Math.random() * 90000 + 10000)}`,
    category: item.category || "Acal · Materiais",
    price: item.price,
    unit: item.unit || "un",
    externalSource: "Acal Home Center",
    externalSku: item.code || "",
  };
}

export function AcalProductSearch({ companyId, onSelect }: Props) {
  const [term, setTerm] = useState("");
  const [activeTerm, setActiveTerm] = useState("");
  const [addingCode, setAddingCode] = useState<string | undefined>();

  const searchQuery = trpc.products.searchAcal.useQuery(
    { companyId, searchTerm: activeTerm },
    { enabled: Boolean(companyId && activeTerm.length >= 3), retry: false }
  );

  const searchState = getAcalSearchState({
    hasSearched: Boolean(activeTerm),
    isFetching: searchQuery.isFetching,
    hasError: Boolean(searchQuery.error),
    resultCount: searchQuery.data?.results?.length ?? 0,
  });

  const handleSearch = () => {
    if (term.trim().length < 3) {
      toast.error("Digite pelo menos 3 caracteres para buscar na Acal.");
      return;
    }
    setActiveTerm(term.trim());
  };

  const handleAdd = async (item: ExternalProductResult) => {
    setAddingCode(item.code || item.name);
    try {
      await onSelect(mapAcalResultToProduct(item));
      toast.success("Produto da Acal importado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar produto.");
    } finally {
      setAddingCode(undefined);
    }
  };

  return (
    <Card className="mb-6 border-0 shadow-sm bg-gradient-to-br from-amber-50/50 to-orange-50/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-amber-600" />
          <CardTitle className="text-lg">Catálogo Externo · Acal Home Center</CardTitle>
        </div>
        <CardDescription>
          Busque materiais, revestimentos e tintas diretamente no catálogo da Acal para importar ao seu orçamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ex.: porcelanato, tinta, argamassa"
            className="bg-white"
          />
          <Button onClick={handleSearch} disabled={searchQuery.isFetching} className="bg-amber-600 text-white hover:bg-amber-700">
            {searchQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Buscar
          </Button>
        </div>

        {searchQuery.error && <p className="mt-3 text-sm text-red-700">{searchQuery.error.message}</p>}
        {searchQuery.data?.error && <p className="mt-3 text-xs text-amber-700">Aviso: {searchQuery.data.error}</p>}
        {searchQuery.data?.simulated && (
          <p className="mt-1 text-[11px] text-amber-600">Exibindo dados simulados de contingência da Acal Home Center.</p>
        )}

        {searchState === "empty" && (
          <p className="mt-4 rounded-md border border-dashed bg-white p-4 text-sm text-slate-500">Nenhum produto encontrado na Acal.</p>
        )}

        {searchQuery.data?.results && searchQuery.data.results.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchQuery.data.results.map((item) => (
              <div key={item.code || item.name} className="flex flex-col gap-3 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    {item.brand && <Badge variant="outline">{item.brand}</Badge>}
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Acal</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.description} · {item.availability || "Em estoque"}</p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <strong className="text-amber-800">R$ {item.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                  <Button size="sm" onClick={() => handleAdd(item)} disabled={addingCode === (item.code || item.name)} className="bg-amber-600 text-white hover:bg-amber-700">
                    {addingCode === (item.code || item.name) ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                    Importar
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
