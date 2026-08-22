import { useState } from "react";
import { AlertTriangle, Check, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Assistant() {
  const { activeCompany } = useCompany();
  const [messages, setMessages] = useState<Message[]>([]);
  const [proposal, setProposal] = useState<{ action: string; payload: Record<string, unknown> }>();
  const [confirmationToken, setConfirmationToken] = useState<string>();
  const assistantMutation = trpc.ai.assistant.useMutation({
    onSuccess: (response) => {
      setMessages((current) => [...current, { role: "assistant", content: response.content }]);
      setProposal(response.actionProposal);
      setConfirmationToken(undefined);
    },
    onError: (error) => toast.error(error.message || "Não foi possível consultar o assistente."),
  });
  const prepareMutation = trpc.ai.prepareAction.useMutation({
    onSuccess: (response) => {
      setConfirmationToken(response.confirmationToken);
      toast.success("Ação preparada. Revise os dados antes de confirmar.");
    },
    onError: (error) => toast.error(error.message),
  });
  const confirmMutation = trpc.ai.confirmAction.useMutation({
    onSuccess: () => {
      toast.success("Ação executada e registrada no histórico.");
      setProposal(undefined);
      setConfirmationToken(undefined);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSend = (content: string) => {
    if (!activeCompany) {
      toast.error("Selecione uma empresa antes de usar o assistente.");
      return;
    }
    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setProposal(undefined);
    setConfirmationToken(undefined);
    assistantMutation.mutate({
      companyId: activeCompany.id,
      messages: nextMessages
        .filter((message): message is Extract<Message, { role: "user" | "assistant" }> => message.role !== "system")
        .map(({ role, content: messageContent }) => ({ role, content: messageContent })),
    });
  };

  const prepare = () => {
    if (!activeCompany || !proposal) return;
    prepareMutation.mutate({ companyId: activeCompany.id, action: proposal.action as any, payload: proposal.payload });
  };

  return (
    <div className="container space-y-6 py-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Assistente OrçaMaster</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Pergunte sobre seus produtos, clientes, orçamentos e faturas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assistente contextual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSend}
            isLoading={assistantMutation.isPending}
            height="min(640px, calc(100vh - 260px))"
            placeholder="Ex.: quais orçamentos estão pendentes?"
            emptyStateMessage={activeCompany ? "O assistente está pronto para analisar os dados da empresa ativa." : "Selecione uma empresa para começar."}
            suggestedPrompts={activeCompany ? [
              "Resuma meus orçamentos pendentes.",
              "Quais produtos têm preço externo sincronizado?",
              "Quais faturas estão vencidas?",
              "Compare o total de orçamentos, faturas e despesas.",
              "Quais despesas pagas aparecem no período disponível?",
            ] : undefined}
          />

          {proposal && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50/70 p-4 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/20 dark:text-amber-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-semibold">Ação proposta: {proposal.action}</p>
                  <p className="text-sm">Nada foi alterado. Confira exatamente os dados abaixo e autorize somente se estiver correto.</p>
                  <pre className="max-h-44 overflow-auto rounded bg-black/10 p-3 text-xs">{JSON.stringify(proposal.payload, null, 2)}</pre>
                  {!confirmationToken ? (
                    <Button onClick={prepare} disabled={prepareMutation.isPending} variant="outline" className="border-amber-700/40 bg-transparent">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Preparar confirmação
                    </Button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={() => activeCompany && confirmMutation.mutate({ companyId: activeCompany.id, confirmationToken })} disabled={confirmMutation.isPending}>
                        <Check className="mr-2 h-4 w-4" /> Confirmar e executar
                      </Button>
                      <Button variant="ghost" onClick={() => setProposal(undefined)} disabled={confirmMutation.isPending}>Cancelar</Button>
                      <span className="text-xs">Token válido por 5 minutos.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
