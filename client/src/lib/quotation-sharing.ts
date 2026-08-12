export function buildQuotationValidationUrl(origin: string, number: string): string {
  return `${origin.replace(/\/$/, "")}/validate/${encodeURIComponent(number)}`;
}

export function buildQuotationShareMessage(origin: string, number: string, total: number | string): string {
  const amount = Number(total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Olá! Segue o orçamento ${number} no valor de R$ ${amount}. Consulte os detalhes e a validação em: ${buildQuotationValidationUrl(origin, number)}`;
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildEmailShareUrl(recipient: string, subject: string, message: string): string {
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
