import { useState } from "react";
import { useLocation } from "wouter";
import { Check, ChevronDown, Maximize2, MessageCircle, Minimize2, ShieldCheck, Sparkles, X } from "lucide-react";
import { AIChatBox } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { useAssistant } from "@/contexts/AssistantContext";
import { useCompany } from "@/contexts/CompanyContext";

export function AssistantFloatingChat() {
  const { activeCompany } = useCompany();
  const { messages, proposal, confirmationToken, isLoading, isPreparing, isConfirming, sendMessage, prepareAction, confirmAction, cancelProposal } = useAssistant();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return <>
    {!open && <Button type="button" aria-label="Abrir Assistente OrçaMaster" onClick={() => setOpen(true)} className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-primary p-0 text-primary-foreground shadow-xl shadow-primary/25 transition-transform hover:scale-105 hover:bg-primary/90 sm:bottom-5 sm:right-5"><MessageCircle className="h-6 w-6" /></Button>}
    {open && <section aria-label="Chat flutuante do Assistente OrçaMaster" className={`fixed z-50 flex flex-col overflow-hidden border border-border/80 bg-card shadow-2xl shadow-slate-900/15 ${expanded ? "inset-3 sm:inset-6" : "bottom-20 right-3 h-[min(680px,calc(100vh-6rem))] w-[min(420px,calc(100vw-1.5rem))] sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100vh-2rem))] sm:w-[min(420px,calc(100vw-2rem))]"}`}>
      <header className="flex shrink-0 items-center justify-between border-b border-border/70 bg-primary px-4 py-3 text-primary-foreground"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><Sparkles className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">Assistente OrçaMaster</p><p className="truncate text-[11px] text-primary-foreground/75">{activeCompany ? activeCompany.name : "Selecione uma empresa"}</p></div></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Reduzir chat" : "Expandir chat"} className="h-8 w-8 text-primary-foreground hover:bg-white/15 hover:text-white">{expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button><Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar chat" className="h-8 w-8 text-primary-foreground hover:bg-white/15 hover:text-white"><X className="h-4 w-4" /></Button></div></header>
      <div className="min-h-0 flex-1 p-2"><AIChatBox messages={messages} onSendMessage={sendMessage} isLoading={isLoading} height="100%" className="h-full border-0 shadow-none" placeholder="Pergunte sobre sua operação..." emptyStateMessage={activeCompany ? "Pronto para analisar sua empresa." : "Selecione uma empresa para começar."} suggestedPrompts={activeCompany ? ["Resuma meus orçamentos pendentes.", "Quais faturas estão vencidas?", "Compare receitas e despesas."] : undefined} /></div>
      {proposal && <div className="max-h-64 shrink-0 overflow-y-auto border-t border-amber-200 bg-amber-50 p-3 text-amber-950"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/><div className="min-w-0 flex-1"><p className="text-xs font-semibold">Ação proposta: {proposal.action}</p><p className="mt-1 text-[11px]">Nada é alterado sem sua confirmação.</p><pre className="mt-2 max-h-24 overflow-auto rounded bg-black/5 p-2 text-[10px]">{JSON.stringify(proposal.payload, null, 2)}</pre>{!confirmationToken ? <Button size="sm" variant="outline" onClick={prepareAction} disabled={isPreparing} className="mt-2 gap-2 border-amber-700/40 bg-transparent"><ShieldCheck className="h-3.5 w-3.5"/>{isPreparing ? "Preparando..." : "Preparar confirmação"}</Button> : <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" onClick={confirmAction} disabled={isConfirming} className="gap-2"><Check className="h-3.5 w-3.5"/>{isConfirming ? "Executando..." : "Confirmar e executar"}</Button><Button size="sm" variant="ghost" onClick={cancelProposal} disabled={isConfirming}>Cancelar</Button></div>}</div></div></div>}
      <footer className="flex shrink-0 items-center justify-between border-t border-border/70 bg-muted/30 px-3 py-2"><Button variant="ghost" size="sm" onClick={() => navigate("/assistant")} className="gap-2 text-xs"><Maximize2 className="h-3.5 w-3.5"/>Abrir tela completa</Button><Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="gap-2 text-xs"><ChevronDown className="h-3.5 w-3.5"/>Minimizar</Button></footer>
    </section>}
  </>;
}
