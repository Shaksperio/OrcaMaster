import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Eye, Download } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { Input } from "@/components/ui/input";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviado: "bg-blue-100 text-blue-700",
  aprovado: "bg-green-100 text-green-700",
  parcialmente_pago: "bg-yellow-100 text-yellow-700",
  pago: "bg-green-100 text-green-700",
  vencido: "bg-primary/10 text-primary",
  cancelado: "bg-red-100 text-red-700",
};

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const { activeCompany } = useCompany();

  const { data: invoices, isLoading } = trpc.invoices.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const filteredInvoices = invoices?.filter(i =>
    i.number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Faturas</h1>
            <p className="text-muted-foreground mt-2">Gerencie todas as suas faturas</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" disabled>
            <Plus className="w-4 h-4" />
            Nova Fatura
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Lista de Faturas</CardTitle>
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Número</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vencimento</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice: any) => (
                      <tr key={invoice.id} className="border-b border-slate-100 hover:bg-muted transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">{invoice.number}</td>
                        <td className="py-3 px-4 text-muted-foreground">Cliente #{invoice.clientId}</td>
                        <td className="py-3 px-4 font-medium text-foreground">R$ {invoice.total.toLocaleString("pt-BR")}</td>
                        <td className="py-3 px-4">
                          <Badge className={statusColors[invoice.status] || "bg-slate-100 text-slate-700"}>
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td className="py-3 px-4 text-center flex gap-2 justify-center">
                          <Button variant="ghost" size="sm" disabled>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled>
                            <Download className="w-4 h-4" />
                          </Button>
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
