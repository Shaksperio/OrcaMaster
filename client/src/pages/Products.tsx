import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Package } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { LeroyProductSearch, type LeroyProductSelection } from "@/components/LeroyProductSearch";
import { SinapiSearch, type SinapiServiceSelection } from "@/components/SinapiSearch";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    category: "",
    price: "",
    unit: "",
    stock: "",
  });
  const [pendingImport, setPendingImport] = useState<{
    name: string;
    description?: string;
    sku?: string;
    category?: string;
    price?: number;
    unit?: string;
    externalSource: string;
    externalSku?: string;
    externalUrl?: string;
    availability?: string;
    currency?: string;
    sourceType: "manual" | "external";
    priceSource: "manual" | "external";
    syncEnabled: boolean;
  } | null>(null);
  const [reviewPrice, setReviewPrice] = useState("");
  const [reviewPriceSource, setReviewPriceSource] = useState<"manual" | "external">("external");
  const [reviewSyncEnabled, setReviewSyncEnabled] = useState(true);

  const { activeCompany } = useCompany();

  const { data: products, isLoading } = trpc.products.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const utils = trpc.useUtils();

  const createProductMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate({ companyId: activeCompany?.id });
      toast.success("Produto criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar produto: " + (error.message || "Tente novamente"));
    },
  });

  const handleCreateProduct = async () => {
    try {
      if (!activeCompany) {
        toast.error("Selecione uma empresa primeiro");
        return;
      }
      if (!formData.name.trim()) {
        toast.error("Nome do produto é obrigatório");
        return;
      }
      await createProductMutation.mutateAsync({
        companyId: activeCompany.id,
        name: formData.name,
        description: formData.description || undefined,
        sku: formData.sku || undefined,
        category: formData.category || undefined,
        price: formData.price ? parseFloat(formData.price) : 0,
        unit: formData.unit || undefined,
        stock: formData.stock ? parseInt(formData.stock) : undefined,
      });
      setIsDialogOpen(false);
      setFormData({
        name: "",
        description: "",
        sku: "",
        category: "",
        price: "",
        unit: "",
        stock: "",
      });
    } catch (error) {
      console.error("Erro ao criar produto:", error);
    }
  };

  const handleExternalProductSelect = async (item: LeroyProductSelection | SinapiServiceSelection) => {
    const itemWithMeta = item as LeroyProductSelection & Partial<SinapiServiceSelection>;
    const isReferenceService = itemWithMeta.externalSource === "SINAPI";
    const externalPrice = typeof itemWithMeta.price === "number" ? itemWithMeta.price : undefined;
    setPendingImport({
      name: itemWithMeta.name,
      description: itemWithMeta.description,
      sku: itemWithMeta.sku,
      category: itemWithMeta.category,
      price: externalPrice,
      unit: itemWithMeta.unit,
      externalSource: itemWithMeta.externalSource,
      externalSku: itemWithMeta.externalSku ?? itemWithMeta.sku,
      externalUrl: itemWithMeta.externalUrl,
      availability: itemWithMeta.availability,
      currency: itemWithMeta.currency,
      sourceType: isReferenceService ? "manual" : "external",
      priceSource: isReferenceService ? "manual" : "external",
      syncEnabled: !isReferenceService,
    });
    setReviewPrice(externalPrice === undefined ? "" : String(externalPrice));
    setReviewPriceSource(isReferenceService ? "manual" : "external");
    setReviewSyncEnabled(!isReferenceService);
  };

  const handleConfirmExternalImport = async () => {
    if (!activeCompany || !pendingImport) return;
    const price = Number.parseFloat(reviewPrice.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Informe um preço válido antes de confirmar a importação.");
      return;
    }

    await createProductMutation.mutateAsync({
      companyId: activeCompany.id,
      name: pendingImport.name,
      description: pendingImport.description,
      sku: pendingImport.sku,
      category: pendingImport.category,
      price,
      unit: pendingImport.unit,
      stock: 0,
      sourceType: pendingImport.sourceType,
      externalSource: pendingImport.externalSource,
      externalSku: pendingImport.externalSku,
      externalUrl: pendingImport.externalUrl,
      externalStatus: "active",
      syncEnabled: pendingImport.sourceType === "external" && reviewSyncEnabled,
      priceSource: reviewPriceSource,
      externalPrice: pendingImport.price,
    });
    setPendingImport(null);
  };

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.includes(searchTerm)
  ) || [];

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Catálogo</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Produtos e serviços</h1>
            <p className="mt-2 text-sm text-muted-foreground">Mantenha preços, estoque e referências externas organizados.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                <Plus className="w-4 h-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Produto</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo produto ou serviço
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome do produto"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descrição do produto"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      placeholder="SKU-001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                      id="category"
                      placeholder="Categoria"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="price">Preço *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unidade</Label>
                    <Input
                      id="unit"
                      placeholder="un"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Estoque</Label>
                    <Input
                      id="stock"
                      type="number"
                      placeholder="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreateProduct}
                  disabled={createProductMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {createProductMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Produto"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {activeCompany && (
          <>
            <LeroyProductSearch companyId={activeCompany.id} onSelect={handleExternalProductSelect} />
            <SinapiSearch companyId={activeCompany.id} onSelect={handleExternalProductSelect} />
          </>
        )}

        <Dialog open={Boolean(pendingImport)} onOpenChange={(open) => !open && setPendingImport(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Revisar importação externa</DialogTitle>
              <DialogDescription>
                Confirme ou edite os dados antes de salvar no catálogo. Campos que não vieram da fonte permanecem vazios.
              </DialogDescription>
            </DialogHeader>
            {pendingImport && (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Fonte consultada: <strong>{pendingImport.externalSource}</strong>
                  {pendingImport.externalUrl && (
                    <a href={pendingImport.externalUrl} target="_blank" rel="noreferrer" className="ml-2 underline">
                      Abrir página original
                    </a>
                  )}
                </div>
                <div>
                  <Label htmlFor="review-name">Nome *</Label>
                  <Input id="review-name" value={pendingImport.name} onChange={(event) => setPendingImport({ ...pendingImport, name: event.target.value })} />
                </div>
                <div>
                  <Label htmlFor="review-description">Descrição</Label>
                  <Textarea id="review-description" value={pendingImport.description ?? ""} onChange={(event) => setPendingImport({ ...pendingImport, description: event.target.value })} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="review-sku">SKU informado pela fonte</Label>
                    <Input id="review-sku" value={pendingImport.sku ?? ""} onChange={(event) => setPendingImport({ ...pendingImport, sku: event.target.value || undefined })} />
                  </div>
                  <div>
                    <Label htmlFor="review-category">Categoria</Label>
                    <Input id="review-category" value={pendingImport.category ?? ""} onChange={(event) => setPendingImport({ ...pendingImport, category: event.target.value || undefined })} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="review-price">Preço usado no catálogo *</Label>
                    <Input id="review-price" type="number" min="0" step="0.01" value={reviewPrice} onChange={(event) => setReviewPrice(event.target.value)} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Preço externo encontrado: {pendingImport.price === undefined ? "não informado" : `R$ ${pendingImport.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="review-unit">Unidade</Label>
                    <Input id="review-unit" value={pendingImport.unit ?? ""} onChange={(event) => setPendingImport({ ...pendingImport, unit: event.target.value || undefined })} />
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border p-3">
                  <Label>Origem do preço</Label>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="review-price-source" checked={reviewPriceSource === "external"} onChange={() => setReviewPriceSource("external")} />
                      Usar preço externo informado
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="review-price-source" checked={reviewPriceSource === "manual"} onChange={() => setReviewPriceSource("manual")} />
                      Usar preço manual
                    </label>
                  </div>
                  {pendingImport.sourceType === "external" && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={reviewSyncEnabled} onChange={(event) => setReviewSyncEnabled(event.target.checked)} />
                      Atualizar este produto automaticamente quando a fonte externa estiver disponível
                    </label>
                  )}
                </div>
                {pendingImport.availability && <p className="text-xs text-muted-foreground">Disponibilidade informada pela fonte: {pendingImport.availability}</p>}
                <Button onClick={handleConfirmExternalImport} disabled={createProductMutation.isPending || !pendingImport.name.trim()} className="w-full bg-primary text-primary-foreground">
                  {createProductMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirmar importação
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Search */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto ou SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 border-border/70 bg-background pl-10 shadow-none focus-visible:ring-primary/30"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Lista de Produtos</CardTitle>
            <CardDescription>Total: {filteredProducts.length} produtos</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">SKU</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Categoria</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Preço</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estoque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product: any) => (
                      <tr key={product.id} className="border-b border-border hover:bg-muted transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">{product.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{product.sku || "-"}</td>
                        <td className="py-3 px-4 text-muted-foreground">{product.category || "-"}</td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{product.stock || 0} {product.unit || "un"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
