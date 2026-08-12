import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { storageGetSignedUrl } from "./storage";

interface QuotationPDFData {
  number: string;
  status?: string;
  createdAt: string | Date;
  validUntil?: string | Date | null;

  companyName: string;
  companyDocument: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  companyCity?: string;
  companyState?: string;
  companyZipCode?: string;
  companyLogoUrl?: string;
  companyLogoStorageKey?: string;

  clientName: string;
  clientDocument?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZipCode?: string;

  workLocation?: string;
  items: Array<{
    description: string;
    itemType?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;

  subtotal: number;
  discount?: number;
  discountPercentage?: number;
  issPercentage?: number;
  icmsPercentage?: number;
  total: number;

  paymentConditions?: string;
  paymentMethodDescription?: string;
  paymentTerms?: string;
  pixHolder?: string;
  pixBank?: string;
  pixKey?: string;
  serviceDescription?: string;
  deliveryEstimate?: string;
  legalNotice?: string;
  notes?: string;
  itemTypeLabel?: string;
}

const ORANGE = "#D8921B";
const LIGHT_ORANGE = "#FBF1DD";
const DARK = "#333333";
const MUTED = "#6B6B6B";
const LINE = "#B9B9B9";
const WHITE = "#FFFFFF";

function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const parsed = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("pt-BR");
}

function fmtCurrency(value: number): string {
  return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNumber(value: number): string {
  return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    rascunho: "RASCUNHO",
    enviado: "ENVIADO",
    aprovado: "APROVADO",
    rejeitado: "REJEITADO",
    vencido: "VENCIDO",
    convertido: "CONVERTIDO",
  };
  return labels[status || "rascunho"] || String(status || "RASCUNHO").toUpperCase();
}

async function loadImageBuffer(url?: string, storageKey?: string): Promise<Buffer | undefined> {
  try {
    let source = url;
    if (storageKey) {
      source = await storageGetSignedUrl(storageKey);
    }
    if (!source) return undefined;
    const response = await fetch(source.startsWith("http") ? source : `${process.env.PUBLIC_URL || "http://127.0.0.1:3000"}${source}`);
    if (!response.ok) return undefined;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return undefined;
  }
}

function drawFooter(doc: PDFKit.PDFDocument, pageNumber: number, pageCount: number) {
  const y = doc.page.height - 34;
  doc.fillColor(MUTED).font("Helvetica").fontSize(7).text("DA PLATAFORMA", 48, y);
  doc.fillColor("#E5484D").rect(112, y + 1, 8, 6).fill();
  doc.fillColor("#3B82F6").rect(121, y + 1, 8, 6).fill();
  doc.fillColor("#F2C94C").rect(130, y + 1, 8, 6).fill();
  doc.fillColor(MUTED).font("Helvetica").fontSize(7).text(String(pageNumber), doc.page.width - 62, y, { width: 14, align: "right" });
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, x: number, y: number, width: number) {
  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8).text(title.toUpperCase(), x, y, { width });
  doc.strokeColor(ORANGE).lineWidth(0.7).moveTo(x, y + 12).lineTo(x + width, y + 12).stroke();
}

function drawTableHeader(doc: PDFKit.PDFDocument, x: number, y: number, width: number) {
  const columns = [
    { label: "Nº", width: width * 0.07, align: "left" as const },
    { label: "TIPO DE SERVIÇO & PRODUTO", width: width * 0.57, align: "left" as const },
    { label: "QTD /m²", width: width * 0.12, align: "right" as const },
    { label: "PREÇO/UN", width: width * 0.12, align: "right" as const },
    { label: "VALOR", width: width * 0.12, align: "right" as const },
  ];
  doc.fillColor(ORANGE).rect(x, y, width, 18).fill();
  let cursor = x;
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(7);
  for (const column of columns) {
    doc.text(column.label, cursor + 4, y + 5, { width: column.width - 8, align: column.align });
    cursor += column.width;
  }
  return columns;
}

function drawItems(doc: PDFKit.PDFDocument, items: QuotationPDFData["items"], startIndex: number, x: number, y: number, width: number) {
  const columns = [width * 0.07, width * 0.57, width * 0.12, width * 0.12, width * 0.12];
  let cursorY = y;
  doc.font("Helvetica").fontSize(7).fillColor(DARK);

  items.forEach((item, relativeIndex) => {
    const description = item.itemType ? `${item.description}\n${item.itemType}` : item.description;
    const descriptionHeight = doc.heightOfString(description, { width: columns[1] - 10 });
    const rowHeight = Math.max(24, descriptionHeight + 9);
    doc.strokeColor(LINE).lineWidth(0.35).moveTo(x, cursorY + rowHeight).lineTo(x + width, cursorY + rowHeight).stroke();

    let cursorX = x;
    doc.fillColor(DARK).font("Helvetica").fontSize(7).text(String(startIndex + relativeIndex + 1), cursorX + 4, cursorY + 7, { width: columns[0] - 8 });
    cursorX += columns[0];
    doc.font("Helvetica").fontSize(7).text(item.description, cursorX + 4, cursorY + 5, { width: columns[1] - 8 });
    if (item.itemType) {
      doc.fillColor(MUTED).fontSize(6.5).text(item.itemType, cursorX + 4, cursorY + 14, { width: columns[1] - 8 });
    }
    cursorX += columns[1];
    doc.fillColor(DARK).fontSize(7).text(fmtNumber(item.quantity), cursorX + 4, cursorY + 7, { width: columns[2] - 8, align: "right" });
    cursorX += columns[2];
    doc.text(fmtCurrency(item.unitPrice), cursorX + 4, cursorY + 7, { width: columns[3] - 8, align: "right" });
    cursorX += columns[3];
    doc.font("Helvetica-Bold").text(fmtCurrency(item.total), cursorX + 4, cursorY + 7, { width: columns[4] - 8, align: "right" });
    cursorY += rowHeight;
  });
  return cursorY;
}

function drawHeader(doc: PDFKit.PDFDocument, data: QuotationPDFData, logo?: Buffer) {
  const left = 48;
  const pageWidth = doc.page.width - 96;
  let y = 38;

  if (logo) {
    try { doc.image(logo, left, y, { fit: [78, 70] }); } catch { /* logo inválida: mantém o cabeçalho textual */ }
  } else {
    doc.fillColor(ORANGE).roundedRect(left, y, 64, 54, 4).fill();
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(22).text("OM", left + 12, y + 15);
  }

  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9).text(data.companyName, left, y + 76, { width: 245 });
  doc.font("Helvetica").fontSize(8);
  const companyLines = [
    data.companyAddress ? `End.: ${data.companyAddress}${data.companyCity ? ` - ${data.companyCity}` : ""}${data.companyState ? ` - ${data.companyState}` : ""}` : undefined,
    data.companyPhone ? `Telefone: ${data.companyPhone}` : undefined,
    data.companyEmail ? `E-mail: ${data.companyEmail}` : undefined,
    data.companyDocument ? `CNPJ: ${data.companyDocument}` : undefined,
  ].filter(Boolean) as string[];
  companyLines.forEach((line, index) => doc.text(line, left, y + 89 + index * 10, { width: 250 }));

  const statusX = left + 210;
  doc.lineWidth(0.8).strokeColor("#999").rect(statusX, y + 2, 76, 27).stroke();
  doc.fillColor("#777").font("Helvetica").fontSize(9).text(statusLabel(data.status), statusX + 4, y + 11, { width: 68, align: "center" });
  doc.fillColor(DARK).font("Helvetica").fontSize(24).text("Orçamento", left + 285, y + 4, { width: pageWidth - 285, align: "right" });
  doc.font("Helvetica-Bold").fontSize(8).text(`# ${data.number}`, left + 285, y + 37, { width: pageWidth - 285, align: "right" });

  return y + 145;
}

export async function generateQuotationPDF(data: QuotationPDFData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 96;
      const left = 48;
      const logo = await loadImageBuffer(data.companyLogoUrl, data.companyLogoStorageKey);
      const firstPageItems = data.items.slice(0, 7);
      const secondPageItems = data.items.slice(7);

      let y = drawHeader(doc, data, logo);
      const half = pageWidth / 2;
      drawSectionTitle(doc, "Cliente", left, y, half - 12);
      drawSectionTitle(doc, "Dados do orçamento", left + half + 12, y, half - 12);
      y += 20;

      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8).text(data.clientName, left, y, { width: half - 12 });
      doc.font("Helvetica").fontSize(7);
      const clientLines = [
        data.clientPhone ? `Celular: ${data.clientPhone}` : undefined,
        data.clientEmail ? `E-mail: ${data.clientEmail}` : undefined,
        data.clientDocument ? `CPF/CNPJ: ${data.clientDocument}` : undefined,
      ].filter(Boolean) as string[];
      clientLines.forEach((line, index) => doc.text(line, left, y + 12 + index * 10, { width: half - 12 }));

      const infoX = left + half + 12;
      const infoLines = [
        `Data do PDO.: ${fmtDate(data.createdAt)}`,
        `Validade do PDO.: ${fmtDate(data.validUntil)}`,
        `Atendimento por: ${data.companyName}`,
        `Prazo de entrega: ${data.deliveryEstimate || "—"}`,
        `Mão-de-obra + materiais inclusos: ${data.itemTypeLabel || "SIM."}`,
      ];
      infoLines.forEach((line, index) => doc.text(line, infoX, y + index * 12, { width: half - 12, align: "right" }));

      y += Math.max(clientLines.length * 10 + 20, infoLines.length * 12 + 5);
      if (data.workLocation) {
        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8).text("LOCAL DA OBRA", left, y);
        doc.font("Helvetica").fontSize(7).text(data.workLocation, left, y + 12, { width: pageWidth });
        y += 30;
      }

      drawTableHeader(doc, left, y, pageWidth);
      y = drawItems(doc, firstPageItems, 0, left, y + 18, pageWidth);
      drawFooter(doc, 1, 2);

      doc.addPage({ size: "A4", margin: 0 });
      y = 42;
      drawTableHeader(doc, left, y, pageWidth);
      y = drawItems(doc, secondPageItems, 7, left, y + 18, pageWidth);
      y += 16;

      const totalsX = left + pageWidth * 0.58;
      const totalsWidth = pageWidth * 0.42;
      doc.font("Helvetica").fontSize(8).fillColor(DARK).text("Subtotal", totalsX, y, { width: totalsWidth * 0.55, align: "right" });
      doc.text(fmtCurrency(data.subtotal), totalsX + totalsWidth * 0.55, y, { width: totalsWidth * 0.45, align: "right" });
      y += 15;
      if (data.discount && data.discount > 0) {
        doc.text(`Desconto${data.discountPercentage ? ` (${data.discountPercentage}%)` : ""}`, totalsX, y, { width: totalsWidth * 0.55, align: "right" });
        doc.text(`- ${fmtCurrency(data.discount)}`, totalsX + totalsWidth * 0.55, y, { width: totalsWidth * 0.45, align: "right" });
        y += 15;
      }
      doc.fillColor(DARK).font("Helvetica-Bold").text("Total", totalsX, y, { width: totalsWidth * 0.55, align: "right" });
      doc.text(`R$ ${fmtCurrency(data.total)}`, totalsX + totalsWidth * 0.55, y, { width: totalsWidth * 0.45, align: "right" });
      doc.strokeColor(ORANGE).lineWidth(0.7).moveTo(totalsX, y + 14).lineTo(totalsX + totalsWidth, y + 14).stroke();
      y += 36;

      if (data.paymentConditions || data.paymentTerms) {
        drawSectionTitle(doc, "Condições de pagamento", left, y, pageWidth);
        y += 19;
        doc.font("Helvetica").fontSize(7).fillColor(DARK).text(data.paymentConditions || data.paymentTerms || "", left, y, { width: pageWidth, lineGap: 2 });
        y += doc.heightOfString(data.paymentConditions || data.paymentTerms || "", { width: pageWidth, lineGap: 2 }) + 15;
      }

      if (data.paymentMethodDescription) {
        doc.font("Helvetica-Bold").fontSize(8).text("Forma de pagamento:", left, y);
        doc.font("Helvetica").fontSize(7).text(data.paymentMethodDescription, left, y + 13, { width: pageWidth * 0.54 });
      }

      if (data.pixKey) {
        const qrY = y + 33;
        try {
          const qrDataUrl = await QRCode.toDataURL(data.pixKey, { width: 110, margin: 1, errorCorrectionLevel: "M" });
          const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
          doc.image(qrBuffer, left, qrY, { width: 78, height: 78 });
        } catch {
          doc.strokeColor(LINE).rect(left, qrY, 78, 78).stroke();
        }
        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8).text("DADOS PARA PAGAMENTO", left + 88, qrY + 4);
        doc.font("Helvetica").fontSize(7);
        if (data.pixHolder) doc.text(`Titular: ${data.pixHolder}`, left + 88, qrY + 18, { width: 220 });
        if (data.pixBank) doc.text(`Banco: ${data.pixBank}`, left + 88, qrY + 30, { width: 220 });
        doc.text(`Chave PIX: ${data.pixKey}`, left + 88, qrY + 42, { width: 220 });
        y = qrY + 92;
      }

      if (data.serviceDescription) {
        drawSectionTitle(doc, "Descrição dos serviços contratados", left, y, pageWidth);
        y += 18;
        doc.font("Helvetica").fontSize(7).text(data.serviceDescription, left, y, { width: pageWidth, lineGap: 2 });
        y += doc.heightOfString(data.serviceDescription, { width: pageWidth, lineGap: 2 }) + 14;
      }

      if (data.legalNotice) {
        doc.lineWidth(0.6).strokeColor(ORANGE).rect(left, y, pageWidth, 44).stroke();
        doc.font("Helvetica").fontSize(7).fillColor(DARK).text(data.legalNotice, left + 6, y + 6, { width: pageWidth - 12, height: 32 });
        y += 58;
      }

      const signatureY = Math.min(Math.max(y + 10, doc.page.height - 112), doc.page.height - 75);
      doc.strokeColor(DARK).lineWidth(0.5).moveTo(left + 20, signatureY).lineTo(left + pageWidth * 0.58, signatureY).stroke();
      doc.fillColor(DARK).font("Helvetica").fontSize(8).text(`Ass. ${data.companyName}`, left + 20, signatureY + 7, { width: pageWidth * 0.58 - 20, align: "center" });
      drawFooter(doc, 2, 2);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateInvoicePDF(data: QuotationPDFData): Promise<Buffer> {
  return generateQuotationPDF(data);
}
