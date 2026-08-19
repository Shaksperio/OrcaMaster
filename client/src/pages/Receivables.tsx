import React, { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, DollarSign, TrendingUp, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  recebido: "bg-green-100 text-green-800",
  atrasado: "bg-red-100 text-red-800",
  cancelado: "bg-slate-100 text-slate-600",
};

export default function Receivables() {
  const { activeCompany } = useCompany();
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: receivables = [], isLoading } = trpc.receivables.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const { data: customers = [] } = trpc.customers.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const { data: report } = trpc.reports.summary.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const createMutation = trpc.receivables.create.useMutation({
    onSuccess: () => {
      utils.receivables.list.invalidate({ companyId: activeCompany?.id });
      utils.reports.summary.invalidate({ companyId: activeCompany?.id });
      toast.success("Conta a receber cadastrada com sucesso!");
      setIsCreateOpen(false);
      setDescription("");
      setAmount("");
      setDueDate("");
      setClientId("");
      setNotes("");
    },
    onError: (err) => toast.error("Erro ao cadastrar: " + err.message),
  });

  const updateStatusMutation = trpc.receivables.updateStatus.useMutation({
    onSuccess: () => {
      utils.receivables.list.invalidate({ companyId: activeCompany?.id });
      utils.reports.summary.invalidate({ companyId: activeCompany?.id });
      toast.success("Status atualizado para Recebido!");
    },
  });

  const deleteMutation = trpc.receivables.delete.useMutation({
    onSuccess: () => {
      utils.receivables.list.invalidate({ companyId: activeCompany?.id });
      utils.reports.summary.invalidate({ companyId: activeCompany?.id });
      toast.success("Registro excluído!");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    createMutation.mutate({
      companyId: activeCompany.id,
      clientId: clientId ? parseInt(clientId) : undefined,
      description,
      amount: parseFloat(amount) || 0,
      dueDate: dueDate || new Date().toISOString(),
      notes: notes || undefined,
    });
  };

  const filteredReceivables = receivables.filter((r: any) =>
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val: any) => Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contas a Receber</h1>
            <p className="text-muted-foreground mt-1">Gerenciamento de recebimentos e faturas pendentes de clientes</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white gap-2">
                <Plus className="w-4 h-4" /> Novo Recebimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Cadastrar Conta a Receber</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Cliente</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Descrição *</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Parcela 1/2 - Projeto Residencial" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Valor (R$) *</Label>
                    <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Data de Vencimento *</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Observações</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes adicionais..." />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-[#1B5E20] text-white" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Recebido</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(report?.totalReceived)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total a Receber (Pendente)</CardTitle>
              <DollarSign className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">
                {formatCurrency(receivables.filter((r: any) => r.status === 'pendente').reduce((s: number, r: any) => s + Number(r.amount), 0))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Geral Registrado</CardTitle>
              <DollarSign className="w-4 h-4 text-[#D8921B]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(report?.totalReceivables)}</div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Histórico de Contas a Receber</CardTitle>
            <CardDescription>Acompanhe títulos em aberto e recebimentos efetuados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input placeholder="Buscar por descrição..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1B5E20]" /></div>
            ) : filteredReceivables.length === 0 ? (
              <div className="text-center py-12 text-slate-500">Nenhum registro de conta a receber</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-muted-foreground">
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4">Vencimento</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceivables.map((rec: any) => (
                      <tr key={rec.id} className="border-b border-slate-100 hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium text-foreground">{rec.description}</td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">{new Date(rec.dueDate).toLocaleDateString("pt-BR")}</td>
                        <td className="py-3 px-4 font-semibold text-right text-green-700">{formatCurrency(rec.amount)}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={statusColors[rec.status]}>{rec.status.toUpperCase()}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {rec.status !== 'recebido' && (
                              <Button variant="ghost" size="sm" onClick={() => updateStatusMutation.mutate({ id: rec.id, status: 'recebido' })} title="Marcar como Recebido">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ id: rec.id })} title="Excluir">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
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
