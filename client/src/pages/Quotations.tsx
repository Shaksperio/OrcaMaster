import React from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, FileText, Eye, Download, MoreHorizontal, Send, CheckCircle, XCircle, RefreshCw, Loader2, Mail, MessageCircle, Copy, History } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReadOnlyVersionSnapshot } from "@/components/ReadOnlyVersionSnapshot";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { buildEmailShareUrl, buildQuotationShareMessage, buildWhatsAppShareUrl } from "@/lib/quotation-sharing";
import { buildQuotationPdfUrl } from "@/lib/quotation-document-actions";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  enviado: "bg-blue-50 text-blue-700 border-blue-200",
  aprovado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejeitado: "bg-red-50 text-red-700 border-red-200",
  vencido: "bg-amber-50 text-amber-700 border-amber-200",
  convertido: "bg-violet-50 text-violet-700 border-violet-200",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  vencido: "Vencido",
  convertido: "Convertido",
};

export default function Quotations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVersionQuotationId, setSelectedVersionQuotationId] = useState<number | null>(null);
  const [expandedQuotationId, setExpandedQuotationId] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const { activeCompany } = useCompany();
  const utils = trpc.useUtils();

  const { data: quotations, isLoading } = trpc.quotations.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const { data: customers = [] } = trpc.customers.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const updateStatusMutation = trpc.quotations.updateStatus.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate({ companyId: activeCompany?.id });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  const deleteMutation = trpc.quotations.delete.useMutation({
    onSuccess: () => {
      utils.quotations.list.invalidate({ companyId: activeCompany?.id });
      toast.success("Orçamento excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir orçamento: " + error.message);
    },
  });

  const duplicateMutation = trpc.quotations.duplicate.useMutation({
    onSuccess: (data) => {
      utils.quotations.list.invalidate({ companyId: activeCompany?.id });
      toast.success(`Orçamento duplicado como ${data.number}.`);
    },
    onError: (error) => toast.error("Erro ao duplicar orçamento: " + error.message),
  });

  const { data: selectedVersions = [], isLoading: isLoadingVersions } = trpc.quotations.versions.useQuery(
    { id: selectedVersionQuotationId ?? 0 },
    { enabled: selectedVersionQuotationId !== null }
  );

  const convertMutation = trpc.quotations.convertToInvoice.useMutation({
    onSuccess: (data) => {
      utils.quotations.list.invalidate({ companyId: activeCompany?.id });
      utils.invoices.list.invalidate({ companyId: activeCompany?.id });
      toast.success(`Orçamento convertido em fatura ${data.invoiceNumber}!`);
    },
    onError: (error) => {
      toast.error("Erro ao converter: " + error.message);
    },
  });

  const customerMap = new Map(customers.map(c => [c.id, c.name]));
  const customerEmailMap = new Map(customers.map(c => [c.id, c.email || ""]));

  const buildShareMessage = (quotation: any) => buildQuotationShareMessage(window.location.origin, quotation.number, quotation.total);

  const shareWhatsApp = (quotation: any) => {
    window.open(buildWhatsAppShareUrl(buildShareMessage(quotation)), "_blank", "noopener,noreferrer");
  };

  const shareEmail = (quotation: any) => {
    const subject = `Orçamento ${quotation.number}`;
    const recipient = customerEmailMap.get(quotation.clientId) || "";
    window.location.href = buildEmailShareUrl(recipient, subject, buildShareMessage(quotation));
  };

  const filteredQuotations = quotations?.filter(q =>
    q.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customerMap.get(q.clientId) || "").toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatCurrency = (value: any) => {
    const num = typeof value === "string" ? parseFloat(value) : (value || 0);
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Vendas</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Orçamentos</h1>
            <p className="mt-2 text-sm text-muted-foreground">Crie, acompanhe e converta propostas em poucos passos.</p>
          </div>
          <Button className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" onClick={() => navigate("/quotations/new")}>
            <Plus className="w-4 h-4" />
            Novo Orçamento
          </Button>
        </div>

        {/* Search */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                  placeholder="Buscar por número ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 border-border/70 bg-background pl-10 shadow-none focus-visible:ring-primary/30"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotations List */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/60 px-5 py-4">
            <CardTitle className="text-base">Lista de Orçamentos</CardTitle>
            <CardDescription>Total: {filteredQuotations.length} orçamentos</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#1B5E20]" />
              </div>
            ) : filteredQuotations.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhum orçamento encontrado</p>
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => navigate("/quotations/new")}
                >
                  <Plus className="w-4 h-4" />
                  Criar primeiro orçamento
                </Button>
              </div>
            ) : (
              <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Número</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Validade</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredQuotations.map((quotation: any) => (
                      <tr key={quotation.id} className="transition-colors hover:bg-muted/40">
                        <td className="py-3 px-4 font-semibold text-foreground">{quotation.number}</td>
                        <td className="py-3 px-4 text-foreground">{customerMap.get(quotation.clientId) || `#${quotation.clientId}`}</td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums text-primary">{formatCurrency(quotation.total)}</td>
                        <td className="py-3 px-4">
                          <Badge className={statusColors[quotation.status] || "bg-slate-100 text-slate-700"}>
                            {statusLabels[quotation.status] || quotation.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">
                          {new Date(quotation.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">
                          {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => navigate(`/quotations/${quotation.id}/preview`)}
                              title="Visualizar orçamento"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
                              title="Editar orçamento"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => window.open(buildQuotationPdfUrl(quotation.id), "_blank", "noopener,noreferrer")}
                              title="Baixar PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Ações do orçamento ${quotation.number}`}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/quotations/${quotation.id}/preview`)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Editar Orçamento
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(buildQuotationPdfUrl(quotation.id), "_blank", "noopener,noreferrer")}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Gerar PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicateMutation.mutate({ id: quotation.id })}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Duplicar orçamento
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSelectedVersionQuotationId(quotation.id)}>
                                  <History className="w-4 h-4 mr-2" />
                                  Ver histórico
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {quotation.status === "rascunho" && (
                                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: quotation.id, status: "enviado" })}>
                                    <Send className="w-4 h-4 mr-2" />
                                    Marcar como Enviado
                                  </DropdownMenuItem>
                                )}
                                {(quotation.status === "enviado" || quotation.status === "rascunho") && (
                                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: quotation.id, status: "aprovado" })}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Marcar como Aprovado
                                  </DropdownMenuItem>
                                )}
                                {quotation.status !== "rejeitado" && quotation.status !== "convertido" && (
                                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: quotation.id, status: "rejeitado" })}>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Marcar como Rejeitado
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => shareEmail(quotation)}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Compartilhar por e-mail
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => shareWhatsApp(quotation)}>
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Compartilhar por WhatsApp
                                </DropdownMenuItem>
                                {quotation.status === "aprovado" && (
                                  <DropdownMenuItem onClick={() => convertMutation.mutate({ id: quotation.id })}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Converter em Fatura
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => {
                                    if (confirm(`Tem certeza que deseja excluir o orçamento ${quotation.number}?`)) {
                                      deleteMutation.mutate({ id: quotation.id });
                                    }
                                  }}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 md:hidden">
                {filteredQuotations.map((quotation: any) => {
                  const isExpanded = expandedQuotationId === quotation.id;
                  return (
                    <article key={quotation.id} className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
                      <button type="button" aria-expanded={isExpanded} onClick={() => setExpandedQuotationId(isExpanded ? null : quotation.id)} className="flex w-full min-w-0 items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2"><span className="font-semibold text-foreground">{quotation.number}</span><Badge className={statusColors[quotation.status] || "bg-slate-100 text-slate-700"}>{statusLabels[quotation.status] || quotation.status}</Badge></span>
                          <span className="mt-1 block truncate text-sm text-muted-foreground">{customerMap.get(quotation.clientId) || `#${quotation.clientId}`}</span>
                        </span>
                        <span className="shrink-0 text-right"><span className="block font-semibold tabular-nums text-primary">{formatCurrency(quotation.total)}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(quotation.createdAt).toLocaleDateString("pt-BR")}</span></span>
                      </button>
                      {isExpanded && (
                        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/20 p-3">
                          <Button type="button" variant="outline" size="sm" className="min-w-0 flex-1 gap-1.5" onClick={() => navigate(`/quotations/${quotation.id}/preview`)}><Eye className="h-4 w-4" />Ver</Button>
                          <Button type="button" variant="outline" size="sm" className="min-w-0 flex-1 gap-1.5" onClick={() => navigate(`/quotations/${quotation.id}/edit`)}><FileText className="h-4 w-4" />Editar</Button>
                          <Button type="button" variant="outline" size="sm" className="min-w-0 flex-1 gap-1.5" onClick={() => window.open(buildQuotationPdfUrl(quotation.id), "_blank", "noopener,noreferrer")}><Download className="h-4 w-4" />PDF</Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label={`Mais ações do orçamento ${quotation.number}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onClick={() => duplicateMutation.mutate({ id: quotation.id })}><Copy className="mr-2 h-4 w-4" />Duplicar orçamento</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedVersionQuotationId(quotation.id)}><History className="mr-2 h-4 w-4" />Ver histórico</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => shareEmail(quotation)}><Mail className="mr-2 h-4 w-4" />Compartilhar por e-mail</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => shareWhatsApp(quotation)}><MessageCircle className="mr-2 h-4 w-4" />Compartilhar por WhatsApp</DropdownMenuItem>
                              {quotation.status === "rascunho" && <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: quotation.id, status: "enviado" })}><Send className="mr-2 h-4 w-4" />Marcar como enviado</DropdownMenuItem>}
                              {(quotation.status === "enviado" || quotation.status === "rascunho") && <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: quotation.id, status: "aprovado" })}><CheckCircle className="mr-2 h-4 w-4" />Marcar como aprovado</DropdownMenuItem>}
                              {quotation.status !== "rejeitado" && quotation.status !== "convertido" && <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: quotation.id, status: "rejeitado" })}><XCircle className="mr-2 h-4 w-4" />Marcar como rejeitado</DropdownMenuItem>}
                              {quotation.status === "aprovado" && <DropdownMenuItem onClick={() => convertMutation.mutate({ id: quotation.id })}><RefreshCw className="mr-2 h-4 w-4" />Converter em fatura</DropdownMenuItem>}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { if (confirm(`Tem certeza que deseja excluir o orçamento ${quotation.number}?`)) deleteMutation.mutate({ id: quotation.id }); }}><XCircle className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={selectedVersionQuotationId !== null} onOpenChange={(open) => !open && setSelectedVersionQuotationId(null)}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico de versões</DialogTitle>
              <DialogDescription>Snapshots registrados para este orçamento. Os dados são somente leitura.</DialogDescription>
            </DialogHeader>
            {isLoadingVersions ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : selectedVersions.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Nenhuma versão registrada.</p> : <div className="space-y-3">{selectedVersions.map((version: any) => <div key={version.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><span className="font-medium">Versão {version.versionNumber}</span><span className="text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleString("pt-BR")}</span></div><p className="mt-1 text-sm text-muted-foreground">{version.changeReason || "Alteração registrada"}</p><ReadOnlyVersionSnapshot data={version.data} /></div>)}</div>}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
