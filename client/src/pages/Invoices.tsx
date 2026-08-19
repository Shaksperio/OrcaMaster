import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/AppLayout";

const statusColors: Record<string, string> = {
  rascunho: "bg-slate-100 text-slate-700",
  enviado: "bg-blue-100 text-blue-700",
  aprovado: "bg-green-100 text-green-700",
  parcialmente_pago: "bg-yellow-100 text-yellow-700",
  pago: "bg-green-100 text-green-700",
  vencido: "bg-red-100 text-red-700",
  cancelado: "bg-slate-100 text-slate-500",
};

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, navigate] = useLocation();
  const { activeCompany } = useCompany();

  const { data: invoices, isLoading } = trpc.invoices.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const filteredInvoices = invoices?.filter(i =>
    i.number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatCurrency = (val: any) => Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Faturas</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie suas faturas e acompanhe vencimentos</p>
          </div>
          <Button className="hidden md:flex bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white gap-2" onClick={() => navigate("/invoices/new")}>
            <Plus className="w-4 h-4" />
            Nova Fatura
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número da fatura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-card shadow-sm border-border"
          />
        </div>

        {/* Invoices List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B5E20]" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Card className="border-0 shadow-sm text-center py-16 bg-card">
            <CardContent>
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Nenhuma fatura encontrada</h3>
              <p className="text-sm text-muted-foreground mt-1">Converta um orçamento ou crie sua primeira fatura.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((invoice: any) => (
              <div key={invoice.id} className="bg-card border border-border/60 rounded-xl p-4 shadow-sm hover:shadow transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 font-bold flex items-center justify-center text-sm flex-shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground text-base">Fatura #{invoice.number}</h3>
                      <Badge className={statusColors[invoice.status] || "bg-slate-100 text-slate-700"}>
                        {invoice.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Criada em: {new Date(invoice.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-border/40">
                  <div className="text-left md:text-right">
                    <p className="text-[11px] text-muted-foreground">Valor Total</p>
                    <p className="text-base font-bold text-foreground">{formatCurrency(invoice.total)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/invoices`)} className="gap-1.5">
                    Detalhes <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) Zoho Books mobile style */}
      <button
        onClick={() => navigate("/invoices/new")}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#1B5E20] text-white shadow-2xl flex items-center justify-center hover:bg-[#1B5E20]/90 transition-transform hover:scale-105 z-50 md:hidden"
        title="Nova Fatura"
      >
        <Plus className="w-6 h-6" />
      </button>
    </AppLayout>
  );
}
