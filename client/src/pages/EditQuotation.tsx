import React, { useState, useMemo, useEffect } from "react";
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
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useLocation, useParams } from "wouter";
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

export default function EditQuotation() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const quotationId = Number(params.id);
  const { activeCompany } = useCompany();
  const utils = trpc.useUtils();

  const [clientId, setClientId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [workLocation, setWorkLocation] = useState("");

  const [discountPercentage, setDiscountPercentage] = useState("0");
  const [issPercentage, setIssPercentage] = useState("0");
  const [icmsPercentage, setIcmsPercentage] = useState("0");

  const [pixHolder, setPixHolder] = useState("");
  const [pixBank, setPixBank] = useState("");
  const [pixKey, setPixKey] = useState("");

  const [paymentConditions, setPaymentConditions] = useState("");
  const [paymentMethodDescription, setPaymentMethodDescription] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [deliveryEstimate, setDeliveryEstimate] = useState("");
  const [legalNotice, setLegalNotice] = useState("");

  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  const { data: quotation, isLoading: isLoadingQuotation } = trpc.quotations.get.useQuery(
    { id: quotationId },
    { enabled: !!quotationId }
  );

  const { data: customers = [] } = trpc.customers.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const { data: products = [] } = trpc.products.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  useEffect(() => {
    if (!quotation) return;
    setClientId(String(quotation.clientId || ""));
    setDescription(quotation.description || "");
    setNotes(quotation.notes || "");
    if (quotation.validUntil) {
      const d = new Date(quotation.validUntil);
      setValidUntil(d.toISOString().split("T")[0]);
    }
    setPaymentTerms(quotation.paymentTerms || "");
    setWorkLocation(quotation.workLocation || "");
    setDiscountPercentage(String(quotation.discountPercentage || "0"));
    setIssPercentage(String(quotation.issPercentage || "0"));
    setIcmsPercentage(String(quotation.icmsPercentage || "0"));
    setPixHolder(quotation.pixHolder || "");
    setPixBank(quotation.pixBank || "");
    setPixKey(quotation.pixKey || "");
    setPaymentConditions(quotation.paymentConditions || "");
    setPaymentMethodDescription(quotation.paymentMethodDescription || "");
    setServiceDescription(quotation.serviceDescription || "");
    setDeliveryEstimate(quotation.deliveryEstimate || "");
    setLegalNotice(quotation.legalNotice || "");

    if (quotation.items && quotation.items.length > 0) {
      setItems(quotation.items.map((i: any) => ({
        id: String(i.id || generateId()),
        productId: i.productId || null,
        description: i.description || "",
        itemType: i.itemType || "",
        quantity: String(i.quantity || "1"),
        unit: i.unit || "un",
        unitPrice: String(i.unitPrice || "0"),
        discount: String(i.discount || "0"),
      })));
    }
  }, [quotation]);

  const updateMutation = trpc.quotations.update.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate({ companyId: activeCompany?.id });
      utils.quotations.get.invalidate({ id: quotationId });
      toast.success("Orçamento atualizado com sucesso!");
      navigate("/quotations");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar orçamento: " + (error.message || "Tente novamente"));
    },
  });

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
  const taxVal = issVal + icmsVal;
  const total = subtotal - effectiveDiscount + taxVal;

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleProductSelect = (index: number, productIdStr: string) => {
    const prodId = parseInt(productIdStr);
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: prod.id,
      description: prod.name,
      unitPrice: String(prod.price || "0"),
      unit: prod.unit || "un",
    };
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (items.length === 0 || !items[0].description.trim()) {
      toast.error("Adicione ao menos um item válido");
      return;
    }

    updateMutation.mutate({
      id: quotationId,
      clientId: parseInt(clientId),
      description: description || undefined,
      notes: notes || undefined,
      discount: effectiveDiscount,
      discountPercentage: discountPct,
      tax: taxVal,
      validUntil: validUntil || undefined,
      paymentTerms: paymentTerms || undefined,
      workLocation: workLocation || undefined,
      issPercentage: issPct,
      icmsPercentage: icmsPct,
      pixHolder: pixHolder || undefined,
      pixBank: pixBank || undefined,
      pixKey: pixKey || undefined,
      paymentConditions: paymentConditions || undefined,
      paymentMethodDescription: paymentMethodDescription || undefined,
      serviceDescription: serviceDescription || undefined,
      deliveryEstimate: deliveryEstimate || undefined,
      legalNotice: legalNotice || undefined,
      items: items.map(i => ({
        productId: i.productId,
        description: i.description,
        itemType: i.itemType || undefined,
        quantity: parseFloat(i.quantity) || 1,
        unit: i.unit || "un",
        unitPrice: parseFloat(i.unitPrice) || 0,
        discount: parseFloat(i.discount) || 0,
      })),
    });
  };

  if (isLoadingQuotation) {
    return (
      <AppLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1B5E20]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/quotations")} className="gap-2 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Editar Orçamento {quotation?.number}</h1>
              <p className="text-muted-foreground text-xs md:text-sm">Atualize os campos, valores e itens do orçamento</p>
            </div>
          </div>
          <Button
            type="submit"
            form="edit-quotation-form"
            className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white gap-2 w-full md:w-auto"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </Button>
        </div>

        <form id="edit-quotation-form" onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="geral" className="w-full">
            <div className="overflow-x-auto pb-2">
              <TabsList className="inline-flex md:grid md:grid-cols-4 w-full bg-muted p-1 rounded-lg min-w-[600px] md:min-w-0">
                <TabsTrigger value="geral" className="gap-2 text-xs md:text-sm"><FileText className="w-4 h-4 flex-shrink-0" /> Geral & Cliente</TabsTrigger>
                <TabsTrigger value="itens" className="gap-2 text-xs md:text-sm"><Plus className="w-4 h-4 flex-shrink-0" /> Itens & Valores</TabsTrigger>
                <TabsTrigger value="pagamento" className="gap-2 text-xs md:text-sm"><CreditCard className="w-4 h-4 flex-shrink-0" /> Pagamento & PIX</TabsTrigger>
                <TabsTrigger value="termos" className="gap-2 text-xs md:text-sm"><ScrollText className="w-4 h-4 flex-shrink-0" /> Condições & Textos</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="geral" className="space-y-6 pt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-lg">Informações Principais</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente *</Label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name} {c.document ? `(${c.document})` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Validade do Orçamento</Label>
                    <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="workLocation">Local da Obra / Execução</Label>
                    <Input id="workLocation" placeholder="Ex: Rua das Flores, 100 - Bairro - Cidade/SP" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryEstimate">Prazo de Entrega</Label>
                    <Input id="deliveryEstimate" placeholder="Ex: 10 dias úteis" value={deliveryEstimate} onChange={(e) => setDeliveryEstimate(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Condição de Pagamento Curta</Label>
                    <Input id="paymentTerms" placeholder="Ex: 50% sinal + 50% entrega" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Descrição / Resumo do Projeto</Label>
                    <Textarea id="description" placeholder="Breve resumo do escopo do projeto..." value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Observações Internas / Anotações</Label>
                    <Textarea id="notes" placeholder="Notas internas sobre o orçamento..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="itens" className="space-y-6 pt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Itens do Orçamento (Produtos e Serviços)</CardTitle>
                  <Button type="button" size="sm" onClick={addItem} className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white gap-2">
                    <Plus className="w-4 h-4" /> Adicionar Item
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="p-4 rounded-lg border border-border bg-card space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Item #{index + 1}</span>
                        {items.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {products.length > 0 && (
                          <div className="md:col-span-3 space-y-1">
                            <Label className="text-xs">Catálogo</Label>
                            <Select onValueChange={(val) => handleProductSelect(index, val)}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar produto" /></SelectTrigger>
                              <SelectContent>
                                {products.map((p: any) => (
                                  <SelectItem key={p.id} value={String(p.id)}>{p.name} (R$ {p.price})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className={products.length > 0 ? "md:col-span-4 space-y-1" : "md:col-span-5 space-y-1"}>
                          <Label className="text-xs">Descrição do Serviço / Produto *</Label>
                          <Input value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} placeholder="Ex: Instalação de piso porcelanato" required />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs">Tipo / Categoria</Label>
                          <Input value={item.itemType} onChange={(e) => updateItem(index, "itemType", e.target.value)} placeholder="Ex: Material / Mão de obra" />
                        </div>
                        <div className="md:col-span-1 space-y-1">
                          <Label className="text-xs">Unidade</Label>
                          <Input value={item.unit} onChange={(e) => updateItem(index, "unit", e.target.value)} placeholder="un, m², h" />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs">Qtd / m²</Label>
                          <Input type="number" step="any" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs">Preço Unitário (R$)</Label>
                          <Input type="number" step="any" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs">Desconto (R$)</Label>
                          <Input type="number" step="any" value={item.discount} onChange={(e) => updateItem(index, "discount", e.target.value)} />
                        </div>
                        <div className="md:col-span-6 flex items-center justify-end pt-5">
                          <span className="text-sm font-semibold text-[#1B5E20]">Total do Item: R$ {itemTotals[index].toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 p-4 rounded-lg bg-muted/40 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-6 text-sm">
                      <div>Subtotal: <span className="font-semibold">R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
                      <div>Desconto Geral (%): <Input className="inline-block w-20 h-8 ml-2" type="number" value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)} /></div>
                    </div>
                    <div className="text-lg font-bold text-[#1B5E20]">
                      Total Geral: R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pagamento" className="space-y-6 pt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-lg">Dados Bancários & PIX</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="pixHolder">Titular da Conta / PIX</Label>
                    <Input id="pixHolder" placeholder="Ex: OrçaMaster Ltda." value={pixHolder} onChange={(e) => setPixHolder(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pixBank">Banco</Label>
                    <Input id="pixBank" placeholder="Ex: Nubank / Itaú / Banco do Brasil" value={pixBank} onChange={(e) => setPixBank(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="pixKey">Chave PIX</Label>
                    <Input id="pixKey" placeholder="Ex: CNPJ, e-mail, telefone ou chave aleatória" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iss">Alíquota ISS (%)</Label>
                    <Input id="iss" type="number" step="any" value={issPercentage} onChange={(e) => setIssPercentage(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="icms">Alíquota ICMS (%)</Label>
                    <Input id="icms" type="number" step="any" value={icmsPercentage} onChange={(e) => setIcmsPercentage(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="termos" className="space-y-6 pt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-lg">Termos, Condições e Textos Jurídicos</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentConditions">Condições Detalhadas de Pagamento</Label>
                    <Textarea id="paymentConditions" rows={4} value={paymentConditions} onChange={(e) => setPaymentConditions(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethodDescription">Descrição da Forma de Pagamento</Label>
                    <Textarea id="paymentMethodDescription" rows={2} value={paymentMethodDescription} onChange={(e) => setPaymentMethodDescription(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceDescription">Descrição Completa dos Serviços Contratados</Label>
                    <Textarea id="serviceDescription" rows={4} value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legalNotice">Aviso Legal / Rodapé</Label>
                    <Textarea id="legalNotice" rows={3} value={legalNotice} onChange={(e) => setLegalNotice(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </AppLayout>
  );
}
