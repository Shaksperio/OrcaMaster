import { createContext, useContext, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import type { Message } from "@/components/AIChatBox";

type ActionProposal = { action: string; payload: Record<string, unknown> };
type AssistantContextValue = {
  messages: Message[];
  proposal?: ActionProposal;
  confirmationToken?: string;
  isLoading: boolean;
  isPreparing: boolean;
  isConfirming: boolean;
  sendMessage: (content: string) => void;
  prepareAction: () => void;
  confirmAction: () => void;
  cancelProposal: () => void;
  clearConversation: () => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const { activeCompany } = useCompany();
  const [messages, setMessages] = useState<Message[]>([]);
  const [proposal, setProposal] = useState<ActionProposal>();
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

  const value = useMemo<AssistantContextValue>(() => ({
    messages,
    proposal,
    confirmationToken,
    isLoading: assistantMutation.isPending,
    isPreparing: prepareMutation.isPending,
    isConfirming: confirmMutation.isPending,
    sendMessage: (content) => {
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
        messages: nextMessages.filter((message): message is Extract<Message, { role: "user" | "assistant" }> => message.role !== "system").map(({ role, content: messageContent }) => ({ role, content: messageContent })),
      });
    },
    prepareAction: () => {
      if (!activeCompany || !proposal) return;
      prepareMutation.mutate({ companyId: activeCompany.id, action: proposal.action as any, payload: proposal.payload });
    },
    confirmAction: () => {
      if (!activeCompany || !confirmationToken) return;
      confirmMutation.mutate({ companyId: activeCompany.id, confirmationToken });
    },
    cancelProposal: () => {
      setProposal(undefined);
      setConfirmationToken(undefined);
    },
    clearConversation: () => {
      setMessages([]);
      setProposal(undefined);
      setConfirmationToken(undefined);
    },
  }), [activeCompany, assistantMutation, confirmationToken, confirmMutation, messages, prepareMutation, proposal]);

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) throw new Error("useAssistant deve ser usado dentro de AssistantProvider");
  return context;
}
