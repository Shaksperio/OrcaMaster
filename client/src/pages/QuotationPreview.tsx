import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Loader2, Mail, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { buildEmailShareUrl, buildQuotationShareMessage, buildWhatsAppShareUrl } from "@/lib/quotation-sharing";
import { buildQuotationPdfUrl, buildQuotationPrintStyles, printQuotation, type QuotationLayout } from "@/lib/quotation-document-actions";

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const parsed = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("pt-BR");
}

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : Number(value || 0);
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : Number(value || 0);
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statusLabels: Record<string, string> = {
  rascunho: "RASCUNHO",
  enviado: "ENVIADO",
  aprovado: "APROVADO",
  rejeitado: "REJEITADO",
  vencido: "VENCIDO",
  convertido: "CONVERTIDO",
};

const quotationLayouts: Record<QuotationLayout, { label: string; description: string; accent: string; ink: string; soft: string; line: string; paper: string }> = {
  executivo: { label: "Executivo", description: "Marinho e âmbar, sóbrio e comercial", accent: "#D8921B", ink: "#132238", soft: "#F7F9FC", line: "#DDE5EF", paper: "#FFFFFF" },
  contemporaneo: { label: "Contemporâneo", description: "Azul petróleo e coral, moderno e marcante", accent: "#E07A5F", ink: "#173B4D", soft: "#F4F8F9", line: "#D8E6E9", paper: "#FFFFFF" },
  sereno: { label: "Sereno", description: "Verde sálvia e terracota, acolhedor e leve", accent: "#B77B57", ink: "#28443C", soft: "#F5F8F4", line: "#DDE8DF", paper: "#FFFFFF" },
};

function getStoredLayout(): QuotationLayout {
  if (typeof window === "undefined") return "executivo";
  const value = window.localStorage.getItem("orcamaster-quotation-layout");
  return value === "contemporaneo" || value === "sereno" ? value : "executivo";
}

export default function QuotationPreview() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [layout, setLayout] = useState<QuotationLayout>(getStoredLayout);
  const { data, isLoading, error } = trpc.quotations.get.useQuery(
    { id: Number(params.id) },
    { enabled: Boolean(params.id) }
  );

  const company = data?.company;
  const client = data?.client;
  const items = data?.items || [];
  const subtotal = Number(data?.subtotal || 0);
  const discount = Number(data?.discount || 0);
  const total = Number(data?.total || 0);
  const issPct = Number(data?.issPercentage || 0);
  const icmsPct = Number(data?.icmsPercentage || 0);
  const issValue = subtotal * (issPct / 100);
  const icmsValue = subtotal * (icmsPct / 100);
  const firstPageItems = items.slice(0, 7);
  const secondPageItems = items.slice(7);
  const status = statusLabels[data?.status || "rascunho"] || String(data?.status || "RASCUNHO").toUpperCase();
  const palette = quotationLayouts[layout];

  useEffect(() => {
    window.localStorage.setItem("orcamaster-quotation-layout", layout);
  }, [layout]);

  useEffect(() => {
    if (!data) return;
    const payload = data.pixKey || `${window.location.origin}/validate/${data.number}`;
    QRCode.toDataURL(payload, { width: 180, margin: 1, errorCorrectionLevel: "M" })
      .then(setQrCodeUrl)
      .catch(() => setQrCodeUrl(""));
  }, [data]);

  const shareMessage = useMemo(() => {
    if (!data) return "";
    return buildQuotationShareMessage(window.location.origin, data.number, data.total);
  }, [data]);

  const handlePrint = () => printQuotation(() => window.print());
  const handleDownloadPdf = () => window.open(buildQuotationPdfUrl(params.id || "", layout), "_blank", "noopener,noreferrer");
  const handleWhatsApp = () => window.open(buildWhatsAppShareUrl(shareMessage), "_blank", "noopener,noreferrer");
  const handleEmail = () => {
    const recipient = client?.email || "";
    const subject = `Orçamento ${data?.number || ""}`;
    window.open(buildEmailShareUrl(recipient, subject, shareMessage), "_self");
  };

  if (isLoading) {
    return <AppLayout><div className="flex min-h-96 items-center justify-center" role="status" aria-label="Carregando orçamento"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }
  if (error || !data) {
    return <AppLayout><div className="mx-auto max-w-xl px-4 py-16 text-center"><p className="font-medium text-destructive">Erro ao carregar orçamento</p><Button variant="outline" onClick={() => navigate("/quotations")} className="mt-4">Voltar</Button></div></AppLayout>;
  }

  const companyAddress = [company?.address, company?.city, company?.state].filter(Boolean).join(" - ");
  const clientAddress = [client?.address, client?.city, client?.state].filter(Boolean).join(" - ");

  return (
    <AppLayout>
      <div className="print:hidden mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/quotations")} className="gap-2"><ArrowLeft className="h-4 w-4" />Voltar</Button>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><span className="sr-only">Modelo visual do orçamento</span><select aria-label="Modelo visual do orçamento" value={layout} onChange={(event) => setLayout(event.target.value as QuotationLayout)} className="h-9 max-w-[150px] rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"><option value="executivo">Executivo</option><option value="contemporaneo">Contemporâneo</option><option value="sereno">Sereno</option></select></label>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" />Imprimir</Button>
          <Button variant="outline" size="sm" onClick={handleEmail} className="gap-2"><Mail className="h-4 w-4" />E-mail</Button>
          <Button variant="outline" size="sm" onClick={handleWhatsApp} className="gap-2 border-green-600 text-green-700 hover:bg-green-50"><MessageCircle className="h-4 w-4" />WhatsApp</Button>
          <Button size="sm" onClick={handleDownloadPdf} className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"><Download className="h-4 w-4" />Gerar PDF</Button>
        </div>
      </div>

      <div className="flex justify-center overflow-x-hidden px-2 pb-8 sm:px-4 print:p-0">
        <div ref={printRef} data-print-target data-testid="quotation-print-target" aria-label="Pré-visualização imprimível do orçamento" className="quotation-document w-full max-w-[210mm] overflow-hidden rounded-2xl text-[#243247] shadow-[0_24px_70px_rgba(15,23,42,0.12)] print:max-w-none print:rounded-none print:shadow-none" style={{ fontFamily: "Inter, Arial, Helvetica, sans-serif", backgroundColor: palette.paper }}>
          <section className="quotation-page min-h-[297mm] p-5 sm:p-8 lg:p-[14mm] print:min-h-0 print:p-[14mm]">
            <header className="relative flex min-h-0 flex-col gap-4 border-b pb-5 sm:min-h-[44mm] sm:block sm:pb-0" style={{ borderColor: palette.line, backgroundColor: palette.soft }}>
              {company?.logoUrl ? <img src={company.logoUrl} alt="Logo da empresa" className="relative left-0 top-0 h-16 w-28 object-contain object-left sm:absolute sm:h-[25mm] sm:w-[30mm]" /> : <div className="relative left-0 top-0 flex h-16 w-28 items-center justify-center rounded-xl text-2xl font-bold text-white sm:absolute sm:h-[24mm] sm:w-[28mm]" style={{ backgroundColor: palette.ink }}>OM</div>}
              <div className="ml-0 pt-0 text-[10px] leading-tight sm:ml-[34mm] sm:pt-[25mm]">
                <p className="font-bold">{company?.name || "Empresa"}</p>
                {companyAddress && <p>End.: {companyAddress}</p>}
                {company?.phone && <p>Telefone: {company.phone}</p>}
                {company?.email && <p>E-mail: {company.email}</p>}
                {company?.document && <p>CNPJ: {company.document}</p>}
              </div>
              <div className="relative right-auto top-auto text-left sm:absolute sm:right-0 sm:top-0 sm:text-right">
                <span className="inline-flex rounded-full px-3 py-1 text-[9px] font-semibold tracking-[0.14em]" style={{ backgroundColor: palette.soft, color: palette.ink }}>{status}</span>
                <h1 className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.03em]" style={{ color: palette.ink }}>Orçamento</h1>
                <p className="mt-1 text-[10px] font-bold"># {data.number}</p>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-5 text-[10px] leading-tight md:grid-cols-2">
              <div>
                <h2 className="border-b pb-2 font-semibold uppercase tracking-[0.12em]" style={{ borderColor: palette.accent, color: palette.ink }}>Cliente:</h2>
                <p className="mt-2 font-bold">{client?.name || "—"}</p>
                {client?.phone && <p>Celular: {client.phone}</p>}
                {client?.email && <p>E-mail: {client.email}</p>}
                {client?.document && <p>CPF/CNPJ: {client.document}</p>}
              </div>
              <div>
                <h2 className="border-b pb-2 font-semibold uppercase tracking-[0.12em]" style={{ borderColor: palette.accent, color: palette.ink }}>Dados do orçamento:</h2>
                <p className="mt-2 flex justify-between"><span>Data do PDO.:</span><span>{formatDate(data.createdAt)}</span></p>
                <p className="flex justify-between"><span>Validade do PDO.:</span><span>{formatDate(data.validUntil)}</span></p>
                <p className="flex justify-between"><span>Atendimento por:</span><span>{company?.name || "—"}</span></p>
                <p className="flex justify-between"><span>Prazo de entrega:</span><span>{data.deliveryEstimate || "—"}</span></p>
                <p className="flex justify-between"><span>Mão-de-obra + materiais inclusos:</span><span>SIM.</span></p>
              </div>
            </div>
            <div className="mt-4 text-[10px]"><h2 className="font-bold uppercase">Local da obra:</h2><p>{data.workLocation || "Não informado"}</p>{clientAddress && <p>Endereço: {clientAddress}</p>}</div>

            <table className="mt-5 w-full border-collapse text-[8px] sm:text-[9px]">
              <thead><tr className="text-white" style={{ backgroundColor: palette.ink }}><th className="w-[7%] px-2 py-1 text-left">Nº</th><th className="w-[57%] px-2 py-1 text-left">TIPO DE SERVIÇO &amp; PRODUTO</th><th className="w-[12%] px-2 py-1 text-right">QTD /m²</th><th className="w-[12%] px-2 py-1 text-right">PREÇO/UN</th><th className="w-[12%] px-2 py-1 text-right">VALOR</th></tr></thead>
              <tbody>{firstPageItems.map((item: any, index: number) => <tr key={item.id || index} className="border-b align-top odd:bg-[#FAFBFC]" style={{ borderColor: palette.line }}><td className="px-2 py-2">{index + 1}</td><td className="px-2 py-2"><p>{item.description}</p>{item.itemType && <p className="text-[8px] text-[#777]">{item.itemType}</p>}</td><td className="px-2 py-2 text-right">{formatNumber(item.quantity)}</td><td className="px-2 py-2 text-right">{formatCurrency(item.unitPrice)}</td><td className="px-2 py-2 text-right">{formatCurrency(item.total)}</td></tr>)}</tbody>
            </table>
            <div className="mt-auto flex justify-end pt-6 text-[9px] text-[#777]">1</div>
          </section>

          <section className="quotation-page min-h-[297mm] border-t border-dashed border-[#D7DEE8] p-5 sm:p-8 lg:p-[14mm] print:min-h-0 print:border-0 print:p-[14mm]">
            <table className="w-full border-collapse text-[8px] sm:text-[9px]"><thead><tr className="text-white" style={{ backgroundColor: palette.ink }}><th className="w-[7%] px-2 py-1 text-left">Nº</th><th className="w-[57%] px-2 py-1 text-left">TIPO DE SERVIÇO &amp; PRODUTO</th><th className="w-[12%] px-2 py-1 text-right">QTD /m²</th><th className="w-[12%] px-2 py-1 text-right">PREÇO/UN</th><th className="w-[12%] px-2 py-1 text-right">VALOR</th></tr></thead><tbody>{secondPageItems.map((item: any, index: number) => <tr key={item.id || index} className="border-b align-top odd:bg-[#FAFBFC]" style={{ borderColor: palette.line }}><td className="px-2 py-2">{index + 8}</td><td className="px-2 py-2"><p>{item.description}</p>{item.itemType && <p className="text-[8px] text-[#777]">{item.itemType}</p>}</td><td className="px-2 py-2 text-right">{formatNumber(item.quantity)}</td><td className="px-2 py-2 text-right">{formatCurrency(item.unitPrice)}</td><td className="px-2 py-2 text-right">{formatCurrency(item.total)}</td></tr>)}</tbody></table>

            <div className="mt-4 ml-auto w-full max-w-[42%] rounded-xl border p-3 text-[10px]" style={{ borderColor: palette.line, backgroundColor: palette.soft }}><div className="flex justify-between border-b border-[#B9B9B9] py-1"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>{discount > 0 && <div className="flex justify-between border-b border-[#B9B9B9] py-1"><span>Desconto</span><span>- {formatCurrency(discount)}</span></div>}<div className="flex justify-between border-b-2 py-2 font-bold"><span>Total</span><span>R$ {formatCurrency(total)}</span></div></div>

            <div className="mt-6 text-[9px]"><h2 className="border-b pb-2 font-semibold uppercase tracking-[0.12em]" style={{ borderColor: palette.accent, color: palette.ink }}>Condições de pagamento</h2><p className="mt-2 whitespace-pre-wrap leading-relaxed">{data.paymentConditions || data.paymentTerms || "Condições de pagamento não informadas."}</p></div>
            {data.paymentMethodDescription && <div className="mt-4 text-[9px]"><p className="font-bold">Forma de pagamento:</p><p>{data.paymentMethodDescription}</p></div>}

            <div className="mt-4 flex items-start gap-3 rounded-xl border p-3 text-[9px]" style={{ borderColor: palette.line, backgroundColor: palette.soft }}>{qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code para pagamento" className="h-[28mm] w-[28mm]" /> : <div className="h-[28mm] w-[28mm] border border-[#999]" />}<div><p className="font-bold">DADOS PARA PAGAMENTO</p>{data.pixHolder && <p>Titular: {data.pixHolder}</p>}{data.pixBank && <p>Banco: {data.pixBank}</p>}{data.pixKey && <p>Chave PIX: {data.pixKey}</p>}</div></div>

            {data.serviceDescription && <div className="mt-5 text-[9px]"><h2 className="border-b pb-2 font-semibold uppercase tracking-[0.12em]" style={{ borderColor: palette.accent, color: palette.ink }}>Descrição dos serviços contratados</h2><p className="mt-2 whitespace-pre-wrap leading-relaxed">{data.serviceDescription}</p></div>}
            {data.legalNotice && <div className="mt-5 rounded-lg border p-3 text-[8px] leading-relaxed" style={{ borderColor: palette.accent, backgroundColor: palette.soft }}>{data.legalNotice}</div>}
            <div className="mt-10 w-[62%] text-center text-[9px]"><div className="border-b" style={{ borderColor: palette.ink }} /><p className="mt-1">Ass. {company?.name || "Responsável"}</p></div>
            <div className="mt-auto flex justify-end pt-6 text-[9px] text-[#777]">2</div>
          </section>
        </div>
      </div>

      <style>{buildQuotationPrintStyles()}</style>
    </AppLayout>
  );
}
