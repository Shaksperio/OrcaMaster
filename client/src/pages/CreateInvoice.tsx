import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface LineItem {
  id: string;
  productId: number | null;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discount: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const emptyItem = (): LineItem => ({
  id: generateId(),
  productId: null,
  description: "",
  quantity: "1",
  unit: "un",
  unitPrice: "0",
  discount: "0",
});

export default function CreateInvoice() {
  const [, navigate] = useLocation();
  const { activeCompany } = useCompany();
  const utils = trpc.useUtils();

  // Form state
  const [clientId, setClientId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("0");
  const [tax, setTax] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  // Queries
  const { data: customers = [] } = trpc.customers.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const { data: products = [] } = trpc.products.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  // Mutation
  const createMutation = trpc.invoices.create.useMutation({
    onSuccess: (data) => {
      utils.invoices.list.invalidate({ companyId: activeCompany?.id });
      toast.success(`Fatura ${data.number} criada com sucesso!`);
      navigate("/invoices");
    },
    onError: (error) => {
      toast.error("Erro ao criar fatura: " + (error.message || "Tente novamente"));
    },
  });

  // Calculations
  const itemTotals = useMemo(() => {
    return items.map((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const disc = parseFloat(item.discount) || 0;
      return qty * price - disc;
    });
  }, [items]);

  const subtotal = useMemo(() => itemTotals.reduce((sum, t) => sum + t, 0), [itemTotals]);
  const discountPct = parseFloat(discountPercentage) || 0;
  const effectiveDiscount = discountPct > 0 ? subtotal * (discountPct / 100) : 0;
  const taxVal = parseFloat(tax) || 0;
  const total = subtotal - effectiveDiscount + taxVal;

  // Handlers
  const addItem = () => setItems([...items, emptyItem()]);

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number | null) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const selectProduct = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === Number(productId));
    if (!product) return;
    setItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId: product.id,
              description: product.name,
              unitPrice: String(product.price || "0"),
              unit: product.unit || "un",
            }
          : item
      )
    );
  };

  const handleSubmit = async () => {
    if (!activeCompany) {
      toast.error("Selecione uma empresa primeiro");
      return;
    }
    if (!clientId) {
      toast.error("Selecione um cliente");
      return;
    }
    const validItems = items.filter((i) => i.description.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um item à fatura");
      return;
    }

    await createMutation.mutateAsync({
      companyId: activeCompany.id,
      clientId: Number(clientId),
      description: description || undefined,
      notes: notes || undefined,
      discountPercentage: discountPercentage || undefined,
      tax: tax || undefined,
      dueDate: dueDate || undefined,
      paymentTerms: paymentTerms || undefined,
      items: validItems.map((item) => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || undefined,
        unitPrice: item.unitPrice,
        discount: item.discount || undefined,
      })),
    });
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nova Fatura</h1>
            <p className="text-muted-foreground mt-1">Preencha os dados para criar uma nova fatura</p>
          </div>
        </div>

        {/* Client Selection */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client">Cliente *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDate">Data de Vencimento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição geral da fatura"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="paymentTerms">Condições de Pagamento</Label>
              <Input
                id="paymentTerms"
                placeholder="Ex: 30/60/90 dias, à vista, PIX, etc."
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Itens da Fatura</CardTitle>
            <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    {/* Product selector */}
                    <div className="md:col-span-2">
                      <Label className="text-xs">Produto (opcional)</Label>
                      <Select
                        value={item.productId ? String(item.productId) : "manual"}
                        onValueChange={(val) => {
                          if (val === "manual") {
                            updateItem(item.id, "productId", null);
                          } else {
                            selectProduct(item.id, val);
                          }
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Manual" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Entrada manual</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {product.name} — R$ {Number(product.price || 0).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-4">
                      <Label className="text-xs">Descrição *</Label>
                      <Input
                        className="h-9"
                        placeholder="Descrição do item"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        className="h-9"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Unidade</Label>
                      <Input
                        className="h-9"
                        placeholder="un"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Preço Unitário (R$)</Label>
                      <Input
                        className="h-9"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Desconto (R$)</Label>
                      <Input
                        className="h-9"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => updateItem(item.id, "discount", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Total</Label>
                      <div className="h-9 flex items-center px-3 bg-background border rounded-md text-sm font-medium">
                        {formatCurrency(itemTotals[index] || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Totals & Notes */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Notes */}
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações adicionais para a fatura"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Totals */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">Desconto (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="h-8 w-24 text-right"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                  />
                  <span className="text-sm text-red-600">-{formatCurrency(effectiveDiscount)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">Impostos (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-8 w-24 text-right"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">+{formatCurrency(taxVal)}</span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-[#1B5E20]">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate("/invoices")}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Criar Fatura
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
