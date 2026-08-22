import React, { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, DollarSign, TrendingDown, TrendingUp, Wallet, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  pago: "bg-green-100 text-green-800",
  atrasado: "bg-red-100 text-red-800",
  cancelado: "bg-slate-100 text-slate-600",
};

export default function Expenses() {
  const { activeCompany } = useCompany();
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Materiais");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");

  const { data: expenses = [], isLoading } = trpc.expenses.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const { data: report } = trpc.reports.summary.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate({ companyId: activeCompany?.id });
      utils.reports.summary.invalidate({ companyId: activeCompany?.id });
      toast.success("Despesa cadastrada com sucesso!");
      setIsCreateOpen(false);
      setDescription("");
      setAmount("");
      setDueDate("");
      setSupplierName("");
      setNotes("");
    },
    onError: (err) => toast.error("Erro ao cadastrar despesa: " + err.message),
  });

  const updateStatusMutation = trpc.expenses.updateStatus.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate({ companyId: activeCompany?.id });
      utils.reports.summary.invalidate({ companyId: activeCompany?.id });
      toast.success("Status atualizado!");
    },
  });

  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate({ companyId: activeCompany?.id });
      utils.reports.summary.invalidate({ companyId: activeCompany?.id });
      toast.success("Despesa excluída!");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    createMutation.mutate({
      companyId: activeCompany.id,
      description,
      category,
      amount: parseFloat(amount) || 0,
      dueDate: dueDate || new Date().toISOString(),
      supplierName: supplierName || undefined,
      notes: notes || undefined,
    });
  };

  const filteredExpenses = expenses.filter((e: any) =>
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.supplierName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val: any) => Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-7 px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Financeiro</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Contas e despesas</h1>
            <p className="mt-2 text-sm text-muted-foreground">Controle pagamentos, vencimentos e fluxo de caixa com clareza.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                <Plus className="w-4 h-4" /> Nova Despesa / Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Despesa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Descrição *</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Compra de materiais de acabamento" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Materiais">Materiais</SelectItem>
                        <SelectItem value="Mão de Obra">Mão de Obra</SelectItem>
                        <SelectItem value="Operacional">Operacional</SelectItem>
                        <SelectItem value="Impostos">Impostos</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Valor (R$) *</Label>
                    <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Data de Vencimento *</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Fornecedor</Label>
                    <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nome do fornecedor" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Observações</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes adicionais..." />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-[#1B5E20] text-white" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar Despesa
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Recebido</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(report?.totalPaidInvoices)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total faturado: {formatCurrency(report?.totalInvoiced)}</p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Despesas Pagas</CardTitle>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(report?.totalPaidExpenses)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total lançado: {formatCurrency(report?.totalExpenses)}</p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido</CardTitle>
              <Wallet className="w-4 h-4 text-[#D8921B]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(report?.netProfit)}</div>
              <p className="text-xs text-muted-foreground mt-1">Recebido menos pago</p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contas Pendentes</CardTitle>
              <DollarSign className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">
                {formatCurrency(expenses.filter((e: any) => e.status === 'pendente').reduce((s: number, e: any) => s + Number(e.amount), 0))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{expenses.filter((e: any) => e.status === 'pendente').length} contas em aberto</p>
            </CardContent>
          </Card>
        </div>

        {/* Expenses List */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Contas a Pagar & Despesas</CardTitle>
            <CardDescription>Lista completa de despesas registradas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input placeholder="Buscar por descrição, fornecedor ou categoria..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1B5E20]" /></div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-12 text-slate-500">Nenhuma despesa registrada</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-muted-foreground">
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4">Fornecedor</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4">Vencimento</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense: any) => (
                      <tr key={expense.id} className="border-b border-slate-100 hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium text-foreground">{expense.description}</td>
                        <td className="py-3 px-4 text-muted-foreground">{expense.supplierName || "—"}</td>
                        <td className="py-3 px-4"><Badge variant="outline">{expense.category}</Badge></td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">{new Date(expense.dueDate).toLocaleDateString("pt-BR")}</td>
                        <td className="py-3 px-4 font-semibold text-right text-red-600">{formatCurrency(expense.amount)}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={statusColors[expense.status]}>{expense.status.toUpperCase()}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {expense.status !== 'pago' && (
                              <Button variant="ghost" size="sm" onClick={() => updateStatusMutation.mutate({ id: expense.id, status: 'pago' })} title="Marcar como Pago">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ id: expense.id })} title="Excluir">
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
