import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useLocation, useParams } from "wouter";
import { useRef } from "react";

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value || 0);
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value || 0);
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function QuotationPreview() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = trpc.quotations.get.useQuery(
    { id: Number(params.id) },
    { enabled: !!params.id }
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.open(`/api/quotations/${params.id}/pdf`, "_blank");
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B5E20]" />
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <p className="text-red-600">Erro ao carregar orçamento</p>
          <Button variant="outline" onClick={() => navigate("/quotations")} className="mt-4">
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const company = data.company;
  const client = data.client;
  const items = data.items || [];
  const subtotal = parseFloat(String(data.subtotal)) || 0;
  const issPct = parseFloat(String(data.issPercentage)) || 0;
  const icmsPct = parseFloat(String(data.icmsPercentage)) || 0;
  const issVal = subtotal * (issPct / 100);
  const icmsVal = subtotal * (icmsPct / 100);
  const total = parseFloat(String(data.total)) || 0;

  const GREEN = "#1B5E20";
  const LIGHT_GREEN = "#E8F5E9";

  return (
    <AppLayout>
      {/* Action bar - hidden on print */}
      <div className="p-4 md:p-6 flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate("/quotations")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
          <Button size="sm" onClick={handleDownloadPdf} className="gap-2 bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white">
            <Download className="w-4 h-4" />
            Baixar PDF
          </Button>
        </div>
      </div>

      {/* Preview container */}
      <div className="flex justify-center pb-8 print:pb-0">
        <div
          ref={printRef}
          className="bg-white text-black w-full max-w-[210mm] shadow-lg print:shadow-none print:max-w-none"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {/* ===== PAGE 1 ===== */}
          <div className="p-8 print:p-[15mm]" style={{ minHeight: "297mm" }}>
            {/* Company Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-xl font-bold" style={{ color: GREEN }}>{company?.name || "Empresa"}</h1>
                <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                  {company?.address && <p>End.: {company.address}{company.city ? `, ${company.city}` : ""}{company.state ? `, ${company.state}` : ""}{company.zipCode ? ` - ${company.zipCode}` : ""}</p>}
                  {company?.phone && <p>Mobile: {company.phone}</p>}
                  {company?.email && <p>Email: {company.email}</p>}
                  {company?.document && <p>CNPJ: {company.document}</p>}
                </div>
              </div>
              {company?.logoUrl && (
                <img src={company.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
              )}
            </div>

            {/* Divider */}
            <div className="h-1 w-full mb-4" style={{ backgroundColor: GREEN }} />

            {/* Contratante + Local da Obra + Número */}
            <div className="grid grid-cols-12 gap-4 mb-6">
              {/* Contratante */}
              <div className="col-span-4">
                <h3 className="text-xs font-bold mb-1 px-2 py-1 text-white" style={{ backgroundColor: GREEN }}>CONTRATANTE</h3>
                <div className="text-xs space-y-0.5 mt-1">
                  <p className="font-semibold">{client?.name || "—"}</p>
                  {client?.document && <p>CPF/CNPJ: {client.document}</p>}
                  {client?.phone && <p>Telefone: {client.phone}</p>}
                  {client?.email && <p>E-mail: {client.email}</p>}
                  {client?.address && (
                    <p>Endereço: {client.address}{client.city ? `, ${client.city}` : ""}{client.state ? ` - ${client.state}` : ""}{client.zipCode ? `, ${client.zipCode}` : ""}</p>
                  )}
                </div>
              </div>

              {/* Local da Obra */}
              <div className="col-span-4">
                <h3 className="text-xs font-bold mb-1 px-2 py-1 text-white" style={{ backgroundColor: GREEN }}>LOCAL DA OBRA</h3>
                <div className="text-xs mt-1">
                  <p>{data.workLocation || "—"}</p>
                </div>
              </div>

              {/* Número e Datas */}
              <div className="col-span-4">
                <div className="border border-gray-300">
                  <div className="flex justify-between items-center px-2 py-1 border-b border-gray-300">
                    <span className="text-xs font-bold" style={{ color: GREEN }}>EST./N.°:</span>
                    <span className="text-lg font-bold">{data.number}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5 border-b border-gray-200 text-xs">
                    <span className="font-semibold">DATA PDO.:</span>
                    <span>{formatDate(data.createdAt)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5 text-xs">
                    <span className="font-semibold">DATA VAL.:</span>
                    <span>{formatDate(data.validUntil)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-xs border-collapse mb-6">
              <thead>
                <tr style={{ backgroundColor: GREEN, color: "white" }}>
                  <th className="text-left px-2 py-1.5 font-bold">DESCRIÇÃO</th>
                  <th className="text-left px-2 py-1.5 font-bold">ITEM</th>
                  <th className="text-right px-2 py-1.5 font-bold">M²/QTD.</th>
                  <th className="text-right px-2 py-1.5 font-bold">PREÇO/UN.</th>
                  <th className="text-right px-2 py-1.5 font-bold">VALOR</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td className="px-2 py-2">{item.description}</td>
                    <td className="px-2 py-2">{item.itemType || "—"}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(item.quantity)}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-2 py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Condições de Pagamento */}
            {data.paymentConditions && (
              <div className="mb-6">
                <h3 className="text-xs font-bold mb-2 underline" style={{ color: GREEN }}>
                  CONDIÇÕES DE PAGAMENTO (Art. 40, CDC e Arts. 417-420, CC):
                </h3>
                <div className="text-xs whitespace-pre-wrap leading-relaxed border border-gray-200 p-3 rounded">
                  {data.paymentConditions}
                </div>
              </div>
            )}

            {/* Page footer */}
            <div className="text-right text-xs text-gray-400 mt-auto pt-4">
              Page 1 of 2
            </div>
          </div>

          {/* ===== PAGE 2 ===== */}
          <div className="p-8 print:p-[15mm] border-t-2 border-dashed border-gray-300 print:border-none" style={{ minHeight: "297mm", pageBreakBefore: "always" }}>
            {/* Meios de Pagamento + Totais */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Left: Meios de pagamento + QR Code */}
              <div>
                {data.paymentMethodDescription && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold mb-1">3. Meios de pagamento:</h3>
                    <p className="text-xs leading-relaxed">{data.paymentMethodDescription}</p>
                  </div>
                )}

                {/* QR Code */}
                {data.pixKey && (
                  <div className="mt-3">
                    <p className="text-xs font-bold mb-2" style={{ color: GREEN }}>QR Code</p>
                    <div className="flex gap-3 items-start">
                      <div className="w-20 h-20 border border-gray-300 flex items-center justify-center bg-white">
                        {data.qrCodeUrl ? (
                          <img src={data.qrCodeUrl} alt="QR Code PIX" className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-[8px] text-gray-400 text-center">QR Code<br />PIX</div>
                        )}
                      </div>
                      <div className="text-xs space-y-0.5">
                        {data.pixHolder && <p><strong>Titular:</strong> {data.pixHolder}</p>}
                        {data.pixBank && <p><strong>Banco:</strong> {data.pixBank}</p>}
                        {data.pixKey && <p><strong>Chave PIX:</strong> {data.pixKey}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Totals table */}
              <div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-1.5 font-bold text-right pr-4">SUBTOTAL</td>
                      <td className="py-1.5 text-right font-semibold">R$ {formatCurrency(subtotal)}</td>
                    </tr>
                    {issPct > 0 && (
                      <tr className="border-b border-gray-200">
                        <td className="py-1.5 text-right pr-4">ISS ({issPct}%)</td>
                        <td className="py-1.5 text-right">R$ {formatCurrency(issVal)}</td>
                      </tr>
                    )}
                    {icmsPct > 0 && (
                      <tr className="border-b border-gray-200">
                        <td className="py-1.5 text-right pr-4">ICMS ({icmsPct}%)</td>
                        <td className="py-1.5 text-right">R$ {formatCurrency(icmsVal)}</td>
                      </tr>
                    )}
                    <tr style={{ backgroundColor: GREEN, color: "white" }}>
                      <td className="py-2 font-bold text-right pr-4">VALOR TOTAL</td>
                      <td className="py-2 text-right font-bold text-base">R$ {formatCurrency(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Descrição dos Serviços Contratados */}
            {data.serviceDescription && (
              <div className="mb-6">
                <h3 className="text-xs font-bold mb-1 underline" style={{ color: GREEN }}>
                  DESCRIÇÃO DOS SERVIÇOS CONTRATADOS:
                </h3>
                <div className="text-xs whitespace-pre-wrap leading-relaxed">
                  {data.serviceDescription}
                </div>
              </div>
            )}

            {/* Prazo de Entrega Estimado */}
            {data.deliveryEstimate && (
              <div className="mb-6">
                <h3 className="text-xs font-bold mb-1 underline" style={{ color: GREEN }}>
                  PRAZO DE ENTREGA ESTIMADO:
                </h3>
                <div className="text-xs whitespace-pre-wrap leading-relaxed">
                  {data.deliveryEstimate}
                </div>
              </div>
            )}

            {/* Aviso Legal */}
            {data.legalNotice && (
              <div className="mb-8 border border-gray-400 p-3 rounded">
                <p className="text-xs leading-relaxed">{data.legalNotice}</p>
              </div>
            )}

            {/* Assinaturas */}
            <div className="grid grid-cols-2 gap-12 mt-12">
              <div className="text-center">
                <div className="border-b border-gray-400 mb-2 h-16" />
                <p className="text-xs font-bold">{company?.name || "Empresa"}</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 mb-2 h-16" />
                <p className="text-xs font-bold">{client?.name || "Contratante"}</p>
              </div>
            </div>

            {/* Page footer */}
            <div className="text-right text-xs text-gray-400 mt-auto pt-8">
              Page 2 of 2
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          [class*="AppLayout"] > *:not(:last-child) { display: none !important; }
          ${printRef.current ? `#${printRef.current.id},` : ""}
          [data-print-target],
          [data-print-target] * {
            visibility: visible;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </AppLayout>
  );
}
