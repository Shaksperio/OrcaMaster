import React from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Eye, Download, Copy, History, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReadOnlyVersionSnapshot } from "@/components/ReadOnlyVersionSnapshot";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  enviado: "bg-blue-50 text-blue-700 border-blue-200",
  aprovado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  parcialmente_pago: "bg-amber-50 text-amber-700 border-amber-200",
  pago: "bg-emerald-50 text-emerald-700 border-emerald-200",
  vencido: "bg-amber-50 text-amber-700 border-amber-200",
  cancelado: "bg-red-50 text-red-700 border-red-200",
};

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVersionInvoiceId, setSelectedVersionInvoiceId] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const { activeCompany } = useCompany();

  const utils = trpc.useUtils();

  const duplicateMutation = trpc.invoices.duplicate.useMutation({
    onSuccess: (data) => {
      utils.invoices.list.invalidate({ companyId: activeCompany?.id });
      toast.success(`Fatura duplicada como ${data.number}.`);
    },
    onError: (error) => toast.error("Erro ao duplicar fatura: " + error.message),
  });

  const { data: selectedVersions = [], isLoading: isLoadingVersions } = trpc.invoices.versions.useQuery(
    { id: selectedVersionInvoiceId ?? 0 },
    { enabled: selectedVersionInvoiceId !== null }
  );

  const { data: invoices, isLoading } = trpc.invoices.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const filteredInvoices = invoices?.filter(i =>
    i.number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Financeiro</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Faturas</h1>
            <p className="mt-2 text-sm text-muted-foreground">Acompanhe cobranças, vencimentos e pagamentos em um só lugar.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={() => navigate("/invoices/new")}>
            <Plus className="w-4 h-4" />
            Nova Fatura
          </Button>
        </div>

        {/* Search */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 border-border/70 bg-background pl-10 shadow-none focus-visible:ring-primary/30"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/60 px-5 py-4">
            <CardTitle className="text-base">Lista de Faturas</CardTitle>
            <CardDescription>Total: {filteredInvoices.length} faturas</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhuma fatura encontrada</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Número</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vencimento</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredInvoices.map((invoice: any) => (
                        <tr key={invoice.id} className="transition-colors hover:bg-muted/40">
                          <td className="px-4 py-3 font-semibold text-foreground">{invoice.number}</td>
                          <td className="px-4 py-3 text-muted-foreground">Cliente #{invoice.clientId}</td>
                          <td className="px-4 py-3 font-semibold tabular-nums text-primary">R$ {Number(invoice.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3"><Badge className={statusColors[invoice.status] || "bg-slate-100 text-slate-700"}>{invoice.status}</Badge></td>
                          <td className="px-4 py-3 text-muted-foreground">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("pt-BR") : "-"}</td>
                          <td className="flex justify-center gap-2 px-4 py-3 text-center">
                            <Button variant="ghost" size="sm" disabled aria-label="Visualização indisponível"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" disabled aria-label="PDF indisponível"><Download className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate({ id: invoice.id })} title="Duplicar fatura"><Copy className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedVersionInvoiceId(invoice.id)} title="Ver histórico" aria-label={`Ver histórico da fatura ${invoice.number}`}><History className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 md:hidden">
                  {filteredInvoices.map((invoice: any) => (
                    <div key={invoice.id} className="rounded-lg border border-border/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="font-semibold text-foreground">{invoice.number}</p><p className="mt-1 text-xs text-muted-foreground">Cliente #{invoice.clientId}</p></div>
                        <Badge className={statusColors[invoice.status] || "bg-slate-100 text-slate-700"}>{invoice.status}</Badge>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-xs text-muted-foreground">Valor</p><p className="font-semibold tabular-nums text-primary">R$ {Number(invoice.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Vencimento</p><p className="text-sm text-foreground">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("pt-BR") : "-"}</p></div></div>
                      <div className="mt-3 flex justify-end gap-1 border-t border-border/60 pt-3"><Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate({ id: invoice.id })}><Copy className="mr-1.5 h-4 w-4" /> Duplicar</Button><Button variant="ghost" size="sm" onClick={() => setSelectedVersionInvoiceId(invoice.id)}><History className="mr-1.5 h-4 w-4" /> Histórico</Button></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={selectedVersionInvoiceId !== null} onOpenChange={(open) => !open && setSelectedVersionInvoiceId(null)}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico de versões da fatura</DialogTitle>
              <DialogDescription>Snapshots registrados para esta fatura. Os dados são somente leitura.</DialogDescription>
            </DialogHeader>
            {isLoadingVersions ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : selectedVersions.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Nenhuma versão registrada.</p> : <div className="space-y-3">{selectedVersions.map((version: any) => <div key={version.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><span className="font-medium">Versão {version.versionNumber}</span><span className="text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleString("pt-BR")}</span></div><p className="mt-1 text-sm text-muted-foreground">{version.changeReason || "Alteração registrada"}</p><ReadOnlyVersionSnapshot data={version.data} /></div>)}</div>}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
