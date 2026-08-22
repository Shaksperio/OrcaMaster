import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Loader2, Mail, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { buildEmailShareUrl, buildQuotationShareMessage, buildWhatsAppShareUrl } from "@/lib/quotation-sharing";
import { buildQuotationPdfUrl, buildQuotationPrintStyles, printQuotation } from "@/lib/quotation-document-actions";

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

export default function QuotationPreview() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
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
  const handleDownloadPdf = () => window.open(buildQuotationPdfUrl(params.id || ""), "_blank", "noopener,noreferrer");
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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" />Imprimir</Button>
          <Button variant="outline" size="sm" onClick={handleEmail} className="gap-2"><Mail className="h-4 w-4" />E-mail</Button>
          <Button variant="outline" size="sm" onClick={handleWhatsApp} className="gap-2 border-green-600 text-green-700 hover:bg-green-50"><MessageCircle className="h-4 w-4" />WhatsApp</Button>
          <Button size="sm" onClick={handleDownloadPdf} className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"><Download className="h-4 w-4" />Gerar PDF</Button>
        </div>
      </div>

      <div className="flex justify-center pb-8 px-2 sm:px-4 print:p-0 overflow-x-auto">
        <div ref={printRef} data-print-target data-testid="quotation-print-target" aria-label="Pré-visualização imprimível do orçamento" className="quotation-document w-[210mm] min-w-[210mm] bg-white text-[#333] shadow-lg print:max-w-none print:shadow-none" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
          <section className="quotation-page min-h-[297mm] p-[14mm] print:min-h-0">
            <header className="relative min-h-[44mm]">
              {company?.logoUrl ? <img src={company.logoUrl} alt="Logo da empresa" className="absolute left-0 top-0 h-[25mm] w-[30mm] object-contain object-left" /> : <div className="absolute left-0 top-0 flex h-[24mm] w-[28mm] items-center justify-center rounded bg-[#D8921B] text-2xl font-bold text-white">OM</div>}
              <div className="ml-[34mm] pt-[25mm] text-[10px] leading-tight">
                <p className="font-bold">{company?.name || "Empresa"}</p>
                {companyAddress && <p>End.: {companyAddress}</p>}
                {company?.phone && <p>Telefone: {company.phone}</p>}
                {company?.email && <p>E-mail: {company.email}</p>}
                {company?.document && <p>CNPJ: {company.document}</p>}
              </div>
              <div className="absolute right-0 top-0 text-right">
                <span className="inline-block border border-[#999] px-2 py-1 text-[10px] text-[#777]">{status}</span>
                <h1 className="mt-1 text-[28px] leading-none text-[#111]">Orçamento</h1>
                <p className="mt-1 text-[10px] font-bold"># {data.number}</p>
              </div>
            </header>

            <div className="grid grid-cols-2 gap-5 text-[10px] leading-tight">
              <div>
                <h2 className="border-b border-[#D8921B] pb-1 font-bold uppercase">Cliente:</h2>
                <p className="mt-2 font-bold">{client?.name || "—"}</p>
                {client?.phone && <p>Celular: {client.phone}</p>}
                {client?.email && <p>E-mail: {client.email}</p>}
                {client?.document && <p>CPF/CNPJ: {client.document}</p>}
              </div>
              <div>
                <h2 className="border-b border-[#D8921B] pb-1 font-bold uppercase">Dados do orçamento:</h2>
                <p className="mt-2 flex justify-between"><span>Data do PDO.:</span><span>{formatDate(data.createdAt)}</span></p>
                <p className="flex justify-between"><span>Validade do PDO.:</span><span>{formatDate(data.validUntil)}</span></p>
                <p className="flex justify-between"><span>Atendimento por:</span><span>{company?.name || "—"}</span></p>
                <p className="flex justify-between"><span>Prazo de entrega:</span><span>{data.deliveryEstimate || "—"}</span></p>
                <p className="flex justify-between"><span>Mão-de-obra + materiais inclusos:</span><span>SIM.</span></p>
              </div>
            </div>
            <div className="mt-4 text-[10px]"><h2 className="font-bold uppercase">Local da obra:</h2><p>{data.workLocation || "Não informado"}</p>{clientAddress && <p>Endereço: {clientAddress}</p>}</div>

            <table className="mt-5 w-full border-collapse text-[9px]">
              <thead><tr className="bg-[#D8921B] text-white"><th className="w-[7%] px-2 py-1 text-left">Nº</th><th className="w-[57%] px-2 py-1 text-left">TIPO DE SERVIÇO &amp; PRODUTO</th><th className="w-[12%] px-2 py-1 text-right">QTD /m²</th><th className="w-[12%] px-2 py-1 text-right">PREÇO/UN</th><th className="w-[12%] px-2 py-1 text-right">VALOR</th></tr></thead>
              <tbody>{firstPageItems.map((item: any, index: number) => <tr key={item.id || index} className="border-b border-[#B9B9B9] align-top"><td className="px-2 py-2">{index + 1}</td><td className="px-2 py-2"><p>{item.description}</p>{item.itemType && <p className="text-[8px] text-[#777]">{item.itemType}</p>}</td><td className="px-2 py-2 text-right">{formatNumber(item.quantity)}</td><td className="px-2 py-2 text-right">{formatCurrency(item.unitPrice)}</td><td className="px-2 py-2 text-right">{formatCurrency(item.total)}</td></tr>)}</tbody>
            </table>
            <div className="mt-auto flex justify-end pt-6 text-[9px] text-[#777]">1</div>
          </section>

          <section className="quotation-page min-h-[297mm] border-t border-dashed border-[#B9B9B9] p-[14mm] print:border-0 print:min-h-0">
            <table className="w-full border-collapse text-[9px]"><thead><tr className="bg-[#D8921B] text-white"><th className="w-[7%] px-2 py-1 text-left">Nº</th><th className="w-[57%] px-2 py-1 text-left">TIPO DE SERVIÇO &amp; PRODUTO</th><th className="w-[12%] px-2 py-1 text-right">QTD /m²</th><th className="w-[12%] px-2 py-1 text-right">PREÇO/UN</th><th className="w-[12%] px-2 py-1 text-right">VALOR</th></tr></thead><tbody>{secondPageItems.map((item: any, index: number) => <tr key={item.id || index} className="border-b border-[#B9B9B9] align-top"><td className="px-2 py-2">{index + 8}</td><td className="px-2 py-2"><p>{item.description}</p>{item.itemType && <p className="text-[8px] text-[#777]">{item.itemType}</p>}</td><td className="px-2 py-2 text-right">{formatNumber(item.quantity)}</td><td className="px-2 py-2 text-right">{formatCurrency(item.unitPrice)}</td><td className="px-2 py-2 text-right">{formatCurrency(item.total)}</td></tr>)}</tbody></table>

            <div className="mt-4 ml-auto w-[42%] text-[10px]"><div className="flex justify-between border-b border-[#B9B9B9] py-1"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>{discount > 0 && <div className="flex justify-between border-b border-[#B9B9B9] py-1"><span>Desconto</span><span>- {formatCurrency(discount)}</span></div>}<div className="flex justify-between border-b-2 border-[#D8921B] py-2 font-bold"><span>Total</span><span>R$ {formatCurrency(total)}</span></div></div>

            <div className="mt-6 text-[9px]"><h2 className="border-b border-[#D8921B] pb-1 font-bold uppercase">Condições de pagamento</h2><p className="mt-2 whitespace-pre-wrap leading-relaxed">{data.paymentConditions || data.paymentTerms || "Condições de pagamento não informadas."}</p></div>
            {data.paymentMethodDescription && <div className="mt-4 text-[9px]"><p className="font-bold">Forma de pagamento:</p><p>{data.paymentMethodDescription}</p></div>}

            <div className="mt-4 flex items-start gap-3 text-[9px]">{qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code para pagamento" className="h-[28mm] w-[28mm]" /> : <div className="h-[28mm] w-[28mm] border border-[#999]" />}<div><p className="font-bold">DADOS PARA PAGAMENTO</p>{data.pixHolder && <p>Titular: {data.pixHolder}</p>}{data.pixBank && <p>Banco: {data.pixBank}</p>}{data.pixKey && <p>Chave PIX: {data.pixKey}</p>}</div></div>

            {data.serviceDescription && <div className="mt-5 text-[9px]"><h2 className="border-b border-[#D8921B] pb-1 font-bold uppercase">Descrição dos serviços contratados</h2><p className="mt-2 whitespace-pre-wrap leading-relaxed">{data.serviceDescription}</p></div>}
            {data.legalNotice && <div className="mt-5 border border-[#D8921B] p-2 text-[8px] leading-relaxed">{data.legalNotice}</div>}
            <div className="mt-10 w-[62%] text-center text-[9px]"><div className="border-b border-[#333]" /><p className="mt-1">Ass. {company?.name || "Responsável"}</p></div>
            <div className="mt-auto flex justify-end pt-6 text-[9px] text-[#777]">2</div>
          </section>
        </div>
      </div>

      <style>{buildQuotationPrintStyles()}</style>
    </AppLayout>
  );
}
