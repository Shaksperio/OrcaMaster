import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Assistant() {
  const { activeCompany } = useCompany();
  const [messages, setMessages] = useState<Message[]>([]);
  const assistantMutation = trpc.ai.assistant.useMutation({
    onSuccess: (response) => {
      setMessages((current) => [...current, { role: "assistant", content: response.content }]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível consultar o assistente."),
  });

  const handleSend = (content: string) => {
    if (!activeCompany) {
      toast.error("Selecione uma empresa antes de usar o assistente.");
      return;
    }
    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    assistantMutation.mutate({
      companyId: activeCompany.id,
      messages: nextMessages
        .filter((message): message is Extract<Message, { role: "user" | "assistant" }> => message.role !== "system")
        .map(({ role, content }) => ({ role, content })),
    });
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
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
