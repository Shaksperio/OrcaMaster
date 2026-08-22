import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { BarChart3, Download, Printer, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function monthIndex(value: unknown) {
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? -1 : date.getMonth();
}

export default function Reports() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? 0;
  const enabled = Boolean(activeCompany?.id);
  const invoices = trpc.invoices.list.useQuery({ companyId }, { enabled });
  const expenses = trpc.expenses.list.useQuery({ companyId }, { enabled });
  const paidRevenue = (invoices.data ?? []).filter((item: any) => item.status === "pago");
  const paidExpenses = (expenses.data ?? []).filter((item: any) => item.status === "pago");
  const revenueByMonth = months.map((_, index) => paidRevenue.filter((item: any) => monthIndex(item.paidAt ?? item.updatedAt ?? item.createdAt) === index).reduce((sum: number, item: any) => sum + Number(item.total || 0), 0));
  const expensesByMonth = months.map((_, index) => paidExpenses.filter((item: any) => monthIndex(item.paidAt ?? item.updatedAt ?? item.createdAt) === index).reduce((sum: number, item: any) => sum + Number(item.amount || item.total || 0), 0));
  const maxValue = Math.max(...revenueByMonth, ...expensesByMonth, 1);
  const revenueTotal = revenueByMonth.reduce((sum, value) => sum + value, 0);
  const expensesTotal = expensesByMonth.reduce((sum, value) => sum + value, 0);
  const overdueInvoices = (invoices.data ?? []).filter((item: any) => item.status === "vencido");
  const exportCsv = () => {
    const rows = [["Tipo", "Identificador", "Status", "Valor"], ...(invoices.data ?? []).map((item: any) => ["Fatura", item.number ?? item.id, item.status, item.total ?? 0]), ...(expenses.data ?? []).map((item: any) => ["Despesa", item.description ?? item.id, item.status, item.amount ?? item.total ?? 0])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `relatorio-orcamaster-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <AppLayout><div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Financeiro</p><h1 className="text-3xl font-semibold tracking-tight">Relatórios</h1><p className="mt-2 text-sm text-muted-foreground">Acompanhe entradas e saídas registradas na empresa ativa.</p></div>{activeCompany && <div className="flex gap-2"><Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />CSV</Button><Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir</Button></div>}</div>
    {!activeCompany ? <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Selecione uma empresa para consultar os relatórios.</CardContent></Card> : <>
      <section className="grid gap-4 sm:grid-cols-3"><Card className="border-border/70 shadow-sm"><CardContent className="p-5"><TrendingUp className="mb-4 h-5 w-5 text-emerald-600"/><p className="text-xs uppercase tracking-wide text-muted-foreground">Receita paga</p><p className="mt-2 text-2xl font-semibold text-emerald-700">{money(revenueTotal)}</p></CardContent></Card><Card className="border-border/70 shadow-sm"><CardContent className="p-5"><TrendingDown className="mb-4 h-5 w-5 text-red-600"/><p className="text-xs uppercase tracking-wide text-muted-foreground">Despesas pagas</p><p className="mt-2 text-2xl font-semibold text-red-700">{money(expensesTotal)}</p></CardContent></Card><Card className="border-border/70 shadow-sm"><CardContent className="p-5"><BarChart3 className="mb-4 h-5 w-5 text-primary"/><p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo registrado</p><p className="mt-2 text-2xl font-semibold">{money(revenueTotal - expensesTotal)}</p></CardContent></Card></section>
      <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle className="text-base">Inadimplência</CardTitle><p className="text-sm text-muted-foreground">Faturas com status vencido registradas no banco.</p></CardHeader><CardContent>{overdueInvoices.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma fatura vencida foi encontrada.</p> : <div className="space-y-2">{overdueInvoices.map((item: any) => <div key={item.id} className="flex items-center justify-between rounded-md border border-red-100 bg-red-50/50 px-3 py-2 text-sm"><span className="font-medium">{item.number ?? `Fatura #${item.id}`}</span><span className="font-semibold text-red-700">{money(Number(item.total || 0))}</span></div>)}</div>}</CardContent></Card><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle className="text-base">Movimento mensal</CardTitle><p className="text-sm text-muted-foreground">Valores agrupados pelo ano atual a partir das datas disponíveis nos registros.</p></CardHeader><CardContent><div className="grid grid-cols-12 items-end gap-2 overflow-x-auto pb-2" aria-label="Gráfico mensal de receitas e despesas">{months.map((month, index) => <div key={month} className="min-w-[32px] space-y-2 text-center"><div className="flex h-52 items-end justify-center gap-1 rounded-md bg-muted/30 p-1"><div className="w-2 rounded-t bg-primary" style={{ height: `${Math.max((revenueByMonth[index] / maxValue) * 100, revenueByMonth[index] ? 6 : 0)}%` }} title={`Receita ${month}: ${money(revenueByMonth[index])}`} /><div className="w-2 rounded-t bg-red-300" style={{ height: `${Math.max((expensesByMonth[index] / maxValue) * 100, expensesByMonth[index] ? 6 : 0)}%` }} title={`Despesa ${month}: ${money(expensesByMonth[index])}`} /></div><span className="text-[11px] text-muted-foreground">{month}</span></div>)}</div><div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />Receita paga</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-300" />Despesa paga</span></div></CardContent></Card>
    </>}
  </div></AppLayout>;
}
