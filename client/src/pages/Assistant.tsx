import { AlertTriangle, ArrowLeft, Check, ShieldCheck, Sparkles } from "lucide-react";
import { AIChatBox } from "@/components/AIChatBox";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAssistant } from "@/contexts/AssistantContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useLocation } from "wouter";

export default function Assistant() {
  const { activeCompany } = useCompany();
  const [, navigate] = useLocation();
  const { messages, proposal, confirmationToken, isLoading, isPreparing, isConfirming, sendMessage, prepareAction, confirmAction, cancelProposal } = useAssistant();

  return <AppLayout><div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4 -ml-3 gap-2"><ArrowLeft className="h-4 w-4"/>Voltar ao Dashboard</Button><div className="flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary"/><h1 className="text-3xl font-semibold tracking-tight">Assistente OrçaMaster</h1></div><p className="mt-2 text-sm text-muted-foreground">Pergunte sobre produtos, clientes, orçamentos, faturas e despesas da empresa ativa.</p></div></div>
    <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle className="text-base">Assistente contextual</CardTitle></CardHeader><CardContent className="space-y-4"><AIChatBox messages={messages} onSendMessage={sendMessage} isLoading={isLoading} height="min(640px, calc(100vh - 260px))" placeholder="Ex.: quais orçamentos estão pendentes?" emptyStateMessage={activeCompany ? "O assistente está pronto para analisar os dados da empresa ativa." : "Selecione uma empresa para começar."} suggestedPrompts={activeCompany ? ["Resuma meus orçamentos pendentes.", "Quais produtos têm preço externo sincronizado?", "Quais faturas estão vencidas?", "Compare o total de orçamentos, faturas e despesas."] : undefined}/>{proposal && <div className="rounded-lg border border-amber-300/60 bg-amber-50/70 p-4 text-amber-950"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0"/><div className="min-w-0 flex-1 space-y-2"><p className="font-semibold">Ação proposta: {proposal.action}</p><p className="text-sm">Nada foi alterado. Confira os dados e autorize somente se estiver correto.</p><pre className="max-h-44 overflow-auto rounded bg-black/10 p-3 text-xs">{JSON.stringify(proposal.payload, null, 2)}</pre>{!confirmationToken ? <Button onClick={prepareAction} disabled={isPreparing} variant="outline" className="border-amber-700/40 bg-transparent"><ShieldCheck className="mr-2 h-4 w-4"/>{isPreparing ? "Preparando..." : "Preparar confirmação"}</Button> : <div className="flex flex-wrap items-center gap-3"><Button onClick={confirmAction} disabled={isConfirming}><Check className="mr-2 h-4 w-4"/>{isConfirming ? "Executando..." : "Confirmar e executar"}</Button><Button variant="ghost" onClick={cancelProposal} disabled={isConfirming}>Cancelar</Button><span className="text-xs">Token válido por 5 minutos.</span></div>}</div></div></div>}</CardContent></Card>
  </div></AppLayout>;
}
