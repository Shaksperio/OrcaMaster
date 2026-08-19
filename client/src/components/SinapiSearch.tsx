import { useState } from "react";
import { Search, Loader2, Plus, Ruler } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export type SinapiServiceSelection = {
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  unit: string;
};

type Props = {
  companyId: number;
  onSelect: (service: SinapiServiceSelection) => Promise<void>;
};

export type SinapiSearchState = "idle" | "loading" | "error" | "empty" | "results";

export function getSinapiSearchState(input: { hasSearched: boolean; isFetching: boolean; hasError: boolean; resultCount: number }): SinapiSearchState {
  if (!input.hasSearched) return "idle";
  if (input.isFetching) return "loading";
  if (input.hasError) return "error";
  return input.resultCount > 0 ? "results" : "empty";
}

export function mapSinapiResultToProduct(item: { description: string; code: string; category: "pintura" | "impermeabilizacao"; price: number; unit: string; referenceYear?: number }): SinapiServiceSelection {
  return {
    name: item.description,
    description: `Serviço SINAPI ${item.code} · Referência ${item.referenceYear ?? 2024}`,
    sku: `SINAPI-${item.code}`,
    category: item.category === "pintura" ? "SINAPI · Pintura" : "SINAPI · Impermeabilização",
    price: item.price,
    unit: item.unit,
  };
}

export function SinapiSearch({ companyId, onSelect }: Props) {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<"todas" | "pintura" | "impermeabilizacao">("todas");
  const [activeSearch, setActiveSearch] = useState<{ term: string; category?: "pintura" | "impermeabilizacao" }>({ term: "" });
  const [addingCode, setAddingCode] = useState<string | undefined>();
  const searchQuery = trpc.products.searchSinapi.useQuery(
    { companyId, searchTerm: activeSearch.term, category: activeSearch.category },
    { enabled: Boolean(companyId && activeSearch.term), retry: false }
  );
  const searchState = getSinapiSearchState({
    hasSearched: Boolean(activeSearch.term),
    isFetching: searchQuery.isFetching,
    hasError: Boolean(searchQuery.error),
    resultCount: searchQuery.data?.results.length ?? 0,
  });

  const handleSearch = () => {
    if (term.trim().length < 3) {
      toast.error("Digite pelo menos 3 caracteres para buscar.");
      return;
    }
    setActiveSearch({ term: term.trim(), category: category === "todas" ? undefined : category });
  };

  const handleAdd = async (item: NonNullable<typeof searchQuery.data>["results"][number]) => {
    setAddingCode(item.code);
    try {
      await onSelect(mapSinapiResultToProduct(item));
      toast.success("Serviço adicionado ao cadastro local.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar o serviço.");
    } finally {
      setAddingCode(undefined);
    }
  };

  return (
    <Card className="mb-6 border border-sky-200 bg-sky-50/40 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-sky-900">
          <Ruler className="h-5 w-5" />
          Buscar serviços SINAPI
        </CardTitle>
        <CardDescription>
          Consulte custos de referência para pintura e impermeabilização. Confirme a composição, UF e competência antes de fechar o orçamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-[1fr_210px_auto]">
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSearch()}
            placeholder="Ex.: pintura acrílica, manta asfáltica"
            className="bg-white"
          />
          <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
            <SelectTrigger className="bg-white"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              <SelectItem value="pintura">Pintura</SelectItem>
              <SelectItem value="impermeabilizacao">Impermeabilização</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} disabled={searchQuery.isFetching} className="bg-sky-700 text-white hover:bg-sky-800">
            {searchQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Buscar
          </Button>
        </div>

        {searchQuery.error && <p className="mt-3 text-sm text-red-700">{searchQuery.error.message}</p>}
        {searchQuery.data?.source && <p className="mt-3 text-xs text-slate-600">Fonte: {searchQuery.data.source}</p>}

        {searchState === "empty" && (
          <p className="mt-4 rounded-md border border-dashed bg-white p-4 text-sm text-slate-500">Nenhum serviço encontrado para esta busca.</p>
        )}

        {searchQuery.data?.results && searchQuery.data.results.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchQuery.data.results.map((item) => (
              <div key={item.code} className="flex flex-col gap-3 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{item.description}</p>
                    <Badge className={item.category === "pintura" ? "bg-sky-100 text-sky-800 hover:bg-sky-100" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"}>
                      {item.category === "pintura" ? "Pintura" : "Impermeabilização"}
                    </Badge>
                    <Badge variant="outline" className="border-sky-300 text-sky-700">SINAPI</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Código {item.code} · Unidade {item.unit} · Referência {item.referenceYear ?? 2024}</p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <strong className="text-sky-800">R$ {item.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/{item.unit}</strong>
                  <Button size="sm" onClick={() => handleAdd(item)} disabled={addingCode === item.code} className="bg-sky-700 text-white hover:bg-sky-800">
                    {addingCode === item.code ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                    Usar
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
