import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, Save, Loader2, FileText, Building2, CreditCard, ScrollText } from "lucide-react";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface LineItem {
  id: string;
  productId: number | null;
  description: string;
  itemType: string;
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
  itemType: "",
  quantity: "1",
  unit: "un",
  unitPrice: "0",
  discount: "0",
});

export default function CreateQuotation() {
  const [, navigate] = useLocation();
  const { activeCompany } = useCompany();
  const utils = trpc.useUtils();

  // Form state - Informações gerais
  const [clientId, setClientId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [workLocation, setWorkLocation] = useState("");

  // Impostos
  const [discountPercentage, setDiscountPercentage] = useState("0");
  const [issPercentage, setIssPercentage] = useState("0");
  const [icmsPercentage, setIcmsPercentage] = useState("0");

  // Dados PIX
  const [pixHolder, setPixHolder] = useState("");
  const [pixBank, setPixBank] = useState("");
  const [pixKey, setPixKey] = useState("");

  // Textos detalhados
  const [paymentConditions, setPaymentConditions] = useState(
    "1. Sinal e Arras (50% do valor total):\nPago no ato da contratação para reserva da data e garantia da execução.\n\n2. Saldo de Conclusão (50% restante do valor total):\nPago imediatamente após a entrega definitiva dos serviços previstos neste orçamento."
  );
  const [paymentMethodDescription, setPaymentMethodDescription] = useState(
    "O pagamento do valor total deste orçamento será efetuado via PIX, conforme condições de pagamento."
  );
  const [serviceDescription, setServiceDescription] = useState("");
  const [deliveryEstimate, setDeliveryEstimate] = useState("");
  const [legalNotice, setLegalNotice] = useState(
    "AVISO LEGAL: Ao aprovar este orçamento, o consumidor manifesta ciência e concordância com os serviços aqui descritos. Tal aprovação configura pré-contratação válida e eficaz, nos termos dos artigos 26 (inciso I), 40 e 48 do Código de Defesa do Consumidor (Lei nº 8.078/1990)."
  );

  // Itens
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
  const createMutation = trpc.quotations.create.useMutation({
    onSuccess: (data) => {
      utils.quotations.list.invalidate({ companyId: activeCompany?.id });
      toast.success(`Orçamento ${data.number} criado com sucesso!`);
      navigate("/quotations");
    },
    onError: (error) => {
      toast.error("Erro ao criar orçamento: " + (error.message || "Tente novamente"));
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
  const issPct = parseFloat(issPercentage) || 0;
  const icmsPct = parseFloat(icmsPercentage) || 0;
  const issVal = subtotal * (issPct / 100);
  const icmsVal = subtotal * (icmsPct / 100);
  const taxTotal = issVal + icmsVal;
  const total = subtotal - effectiveDiscount + taxTotal;

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
      toast.error("Adicione pelo menos um item ao orçamento");
      return;
    }

    await createMutation.mutateAsync({
      companyId: activeCompany.id,
      clientId: Number(clientId),
      description: description || undefined,
      notes: notes || undefined,
      discountPercentage: discountPercentage || undefined,
      validUntil: validUntil || undefined,
      paymentTerms: paymentTerms || undefined,
      workLocation: workLocation || undefined,
      issPercentage: issPercentage || undefined,
      icmsPercentage: icmsPercentage || undefined,
      pixHolder: pixHolder || undefined,
      pixBank: pixBank || undefined,
      pixKey: pixKey || undefined,
      paymentConditions: paymentConditions || undefined,
      paymentMethodDescription: paymentMethodDescription || undefined,
      serviceDescription: serviceDescription || undefined,
      deliveryEstimate: deliveryEstimate || undefined,
      legalNotice: legalNotice || undefined,
      items: validItems.map((item) => ({
        productId: item.productId,
        description: item.description,
        itemType: item.itemType || undefined,
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
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/quotations")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Novo Orçamento</h1>
            <p className="text-muted-foreground mt-1">Preencha os dados para criar um orçamento profissional</p>
          </div>
        </div>

        <Tabs defaultValue="geral" className="space-y-6">
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex md:grid w-full md:grid-cols-4 h-12 bg-muted p-1 rounded-lg min-w-[550px] md:min-w-0">
              <TabsTrigger value="geral" className="gap-2 text-xs md:text-sm">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="itens" className="gap-2 text-xs md:text-sm">
                <FileText className="w-4 h-4 flex-shrink-0" />
                Itens
              </TabsTrigger>
              <TabsTrigger value="pagamento" className="gap-2 text-xs md:text-sm">
                <CreditCard className="w-4 h-4 flex-shrink-0" />
                Pagamento
              </TabsTrigger>
              <TabsTrigger value="detalhes" className="gap-2 text-xs md:text-sm">
                <ScrollText className="w-4 h-4 flex-shrink-0" />
                Detalhes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ===== ABA GERAL ===== */}
          <TabsContent value="geral" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Contratante e Local</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Cliente / Contratante *</Label>
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
                    <Label>Data de Validade</Label>
                    <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Local da Obra / Serviço</Label>
                  <Textarea
                    placeholder="Ex: Terminal do Aeroporto de Jericoacoara - CE, Rodovia Estadual CE-085..."
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Descrição Geral</Label>
                  <Textarea
                    placeholder="Descrição geral do orçamento"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== ABA ITENS ===== */}
          <TabsContent value="itens" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Itens do Orçamento</CardTitle>
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

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-3">
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
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-5">
                          <Label className="text-xs">Descrição *</Label>
                          <Input
                            className="h-9"
                            placeholder="Descrição do serviço/produto"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-4">
                          <Label className="text-xs">Tipo (Item)</Label>
                          <Input
                            className="h-9"
                            placeholder="Ex: Mão de obra + material"
                            value={item.itemType}
                            onChange={(e) => updateItem(item.id, "itemType", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                          <Label className="text-xs">M²/Qtd.</Label>
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
                            placeholder="un, m², h"
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Preço/Un. (R$)</Label>
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
                          <Label className="text-xs">Valor</Label>
                          <div className="h-9 flex items-center px-3 bg-background border rounded-md text-sm font-semibold text-[#1B5E20]">
                            {formatCurrency(itemTotals[index] || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumo de totais */}
                <div className="mt-6 p-4 bg-[#1B5E20]/5 rounded-lg border border-[#1B5E20]/20">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-28">Desconto (%)</span>
                      <Input
                        type="number" min="0" max="100" step="0.01"
                        className="h-8 w-20 text-right"
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(e.target.value)}
                      />
                      <span className="text-sm text-red-600 ml-auto">-{formatCurrency(effectiveDiscount)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-28">ISS (%)</span>
                      <Input
                        type="number" min="0" max="100" step="0.01"
                        className="h-8 w-20 text-right"
                        value={issPercentage}
                        onChange={(e) => setIssPercentage(e.target.value)}
                      />
                      <span className="text-sm text-muted-foreground ml-auto">+{formatCurrency(issVal)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-28">ICMS (%)</span>
                      <Input
                        type="number" min="0" max="100" step="0.01"
                        className="h-8 w-20 text-right"
                        value={icmsPercentage}
                        onChange={(e) => setIcmsPercentage(e.target.value)}
                      />
                      <span className="text-sm text-muted-foreground ml-auto">+{formatCurrency(icmsVal)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>VALOR TOTAL</span>
                      <span className="text-[#1B5E20]">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== ABA PAGAMENTO ===== */}
          <TabsContent value="pagamento" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Condições de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Condições de Pagamento (Art. 40, CDC e Arts. 417-420, CC)</Label>
                  <Textarea
                    placeholder="Descreva as condições de pagamento detalhadas..."
                    value={paymentConditions}
                    onChange={(e) => setPaymentConditions(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label>Meios de Pagamento</Label>
                  <Textarea
                    placeholder="Descreva os meios de pagamento aceitos..."
                    value={paymentMethodDescription}
                    onChange={(e) => setPaymentMethodDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Termos de Pagamento (resumo)</Label>
                  <Input
                    placeholder="Ex: 50% entrada + 50% na conclusão"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Dados PIX para QR Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Titular</Label>
                    <Input
                      placeholder="Nome do titular"
                      value={pixHolder}
                      onChange={(e) => setPixHolder(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Banco</Label>
                    <Input
                      placeholder="Nome do banco"
                      value={pixBank}
                      onChange={(e) => setPixBank(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Chave PIX</Label>
                    <Input
                      placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== ABA DETALHES ===== */}
          <TabsContent value="detalhes" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Descrição dos Serviços Contratados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Descrição detalhada dos serviços</Label>
                  <Textarea
                    placeholder="Descreva detalhadamente todos os serviços que serão realizados..."
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Prazo e Observações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Prazo de Entrega Estimado</Label>
                  <Textarea
                    placeholder="Descreva o prazo estimado para entrega dos serviços..."
                    value={deliveryEstimate}
                    onChange={(e) => setDeliveryEstimate(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Observações adicionais"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Aviso Legal</Label>
                  <Textarea
                    placeholder="Texto do aviso legal..."
                    value={legalNotice}
                    onChange={(e) => setLegalNotice(e.target.value)}
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions - sempre visível */}
        <div className="flex justify-end gap-4 mt-8 pb-8">
          <Button variant="outline" onClick={() => navigate("/quotations")}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white gap-2 px-8"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Criar Orçamento
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
