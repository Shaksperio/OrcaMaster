import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, CircleAlert, Clock3, FilePlus2, FileText, Plus, Receipt, Users, WalletCards } from "lucide-react";
import { useLocation } from "wouter";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateLabel(value: unknown) {
  if (!value) return "Sem data";
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? "Sem data" : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function MetricCard({ label, value, helper, icon: Icon, tone = "blue" }: { label: string; value: string; helper: string; icon: React.ElementType; tone?: "blue" | "green" | "amber" | "red" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  };
  return (
    <Card className="border-border/70 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
            <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
          </div>
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tones[tone])}><Icon className="h-[18px] w-[18px]" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">{message}</div>;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id;
  const enabled = Boolean(companyId);
  const quotationsQuery = trpc.quotations.list.useQuery({ companyId: companyId ?? 0 }, { enabled });
  const invoicesQuery = trpc.invoices.list.useQuery({ companyId: companyId ?? 0 }, { enabled });
  const expensesQuery = trpc.expenses.list.useQuery({ companyId: companyId ?? 0 }, { enabled });
  const customersQuery = trpc.customers.list.useQuery({ companyId: companyId ?? 0 }, { enabled });

  const quotations = quotationsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const paidRevenue = invoices.filter((invoice: any) => invoice.status === "pago").reduce((sum: number, invoice: any) => sum + Number(invoice.total || 0), 0);
  const receivable = invoices.filter((invoice: any) => !["pago", "cancelado"].includes(invoice.status)).reduce((sum: number, invoice: any) => sum + Number(invoice.total || 0), 0);
  const openQuotations = quotations.filter((quotation: any) => ["rascunho", "enviado"].includes(quotation.status)).length;
  const approvedQuotations = quotations.filter((quotation: any) => quotation.status === "aprovado").length;
  const overdueInvoices = invoices.filter((invoice: any) => invoice.status === "vencido").length;
  const pendingExpenses = expenses.filter((expense: any) => ["pendente", "atrasado"].includes(expense.status)).length;
  const recentQuotations = quotations.slice(0, 5);
  const customerName = (clientId: number) => customers.find((customer: any) => customer.id === clientId)?.name ?? "Cliente não identificado";
  const isLoading = quotationsQuery.isLoading || invoicesQuery.isLoading || expensesQuery.isLoading;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-7 sm:px-6 lg:px-8">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Visão geral</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Olá, {activeCompany?.name || "seja bem-vindo"}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Acompanhe o movimento comercial, financeiro e os próximos passos da sua operação.</p>
          </div>
          <Button onClick={() => navigate("/quotations/new")} className="w-full shadow-sm sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Novo orçamento</Button>
        </section>

        {!activeCompany ? (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Cadastre ou selecione uma empresa para visualizar os indicadores.</CardContent></Card>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
              <MetricCard label="Receita recebida" value={isLoading ? "—" : money(paidRevenue)} helper="Faturas com pagamento registrado" icon={WalletCards} tone="green" />
              <MetricCard label="A receber" value={isLoading ? "—" : money(receivable)} helper="Faturas em aberto" icon={Receipt} tone="blue" />
              <MetricCard label="Orçamentos em aberto" value={isLoading ? "—" : String(openQuotations)} helper={`${approvedQuotations} aprovados no total`} icon={FileText} tone="amber" />
              <MetricCard label="Faturas vencidas" value={isLoading ? "—" : String(overdueInvoices)} helper={pendingExpenses ? `${pendingExpenses} despesas aguardando ação` : "Nenhuma despesa pendente"} icon={CircleAlert} tone={overdueInvoices > 0 ? "red" : "green"} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.8fr)]">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/60 px-5 py-4">
                  <div><CardTitle className="text-base">Atividade recente</CardTitle><p className="mt-1 text-xs text-muted-foreground">Últimos orçamentos registrados na empresa</p></div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/quotations")} className="text-primary">Ver todos <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" /></Button>
                </CardHeader>
                <CardContent className="p-5">
                  {recentQuotations.length === 0 ? <EmptyState message="Ainda não há orçamentos para exibir." /> : <div className="divide-y divide-border/60">
                    {recentQuotations.map((quotation: any) => (
                      <button key={quotation.id} type="button" onClick={() => navigate(`/quotations/${quotation.id}/preview`)} className="flex w-full items-center justify-between gap-4 py-3 text-left first:pt-0 last:pb-0 hover:bg-muted/30">
                        <div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><FileText className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{quotation.number}</p><p className="truncate text-xs text-muted-foreground">{customerName(quotation.clientId)} · {dateLabel(quotation.createdAt)}</p></div></div>
                        <div className="shrink-0 text-right"><p className="text-sm font-semibold tabular-nums text-foreground">{money(Number(quotation.total || 0))}</p><p className="text-xs capitalize text-muted-foreground">{quotation.status}</p></div>
                      </button>
                    ))}
                  </div>}
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60 px-5 py-4"><CardTitle className="text-base">Ações rápidas</CardTitle><p className="mt-1 text-xs text-muted-foreground">Atalhos para o trabalho do dia</p></CardHeader>
                <CardContent className="grid gap-2 p-5 sm:grid-cols-2 xl:grid-cols-1">
                  <Button variant="outline" onClick={() => navigate("/quotations/new")} className="justify-start"><FilePlus2 className="mr-2 h-4 w-4 text-primary" /> Novo orçamento</Button>
                  <Button variant="outline" onClick={() => navigate("/invoices/new")} className="justify-start"><Receipt className="mr-2 h-4 w-4 text-primary" /> Nova fatura</Button>
                  <Button variant="outline" onClick={() => navigate("/customers")} className="justify-start"><Users className="mr-2 h-4 w-4 text-primary" /> Clientes</Button>
                  <Button variant="outline" onClick={() => navigate("/expenses")} className="justify-start"><Clock3 className="mr-2 h-4 w-4 text-primary" /> Contas e despesas</Button>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
