import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, FileText, Eye, Download, MoreHorizontal, Send, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviado: "bg-blue-100 text-blue-700",
  aprovado: "bg-green-100 text-green-700",
  rejeitado: "bg-red-100 text-red-700",
  vencido: "bg-orange-100 text-orange-700",
  convertido: "bg-purple-100 text-purple-700",
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
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
            <p className="text-muted-foreground mt-2">Gerencie todos os seus orçamentos</p>
          </div>
          <Button className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white gap-2" onClick={() => navigate("/quotations/new")}>
            <Plus className="w-4 h-4" />
            Novo Orçamento
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por número ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotations List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Lista de Orçamentos</CardTitle>
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
              <div className="overflow-x-auto">
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
                  <tbody>
                    {filteredQuotations.map((quotation: any) => (
                      <tr key={quotation.id} className="border-b border-slate-100 hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">{quotation.number}</td>
                        <td className="py-3 px-4 text-foreground">{customerMap.get(quotation.clientId) || `#${quotation.clientId}`}</td>
                        <td className="py-3 px-4 font-semibold text-right text-[#1B5E20]">{formatCurrency(quotation.total)}</td>
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
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => window.open(`/api/quotations/${quotation.id}/pdf`, "_blank")}
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
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
                                {quotation.status === "aprovado" && (
                                  <DropdownMenuItem onClick={() => convertMutation.mutate({ id: quotation.id })}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Converter em Fatura
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
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
