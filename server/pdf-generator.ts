import PDFDocument from "pdfkit";
import QRCode from "qrcode";

interface QuotationPDFData {
  number: string;
  createdAt: string | Date;
  validUntil?: string | Date | null;

  // Company
  companyName: string;
  companyDocument: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  companyCity?: string;
  companyState?: string;
  companyZipCode?: string;
  companyLogoUrl?: string;

  // Client
  clientName: string;
  clientDocument?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZipCode?: string;

  // Work location
  workLocation?: string;

  // Items
  items: Array<{
    description: string;
    itemType?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;

  // Totals
  subtotal: number;
  discount?: number;
  discountPercentage?: number;
  issPercentage?: number;
  icmsPercentage?: number;
  total: number;

  // Payment
  paymentConditions?: string;
  paymentMethodDescription?: string;
  paymentTerms?: string;
  pixHolder?: string;
  pixBank?: string;
  pixKey?: string;

  // Details
  serviceDescription?: string;
  deliveryEstimate?: string;
  legalNotice?: string;
  notes?: string;
}

function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

function fmtCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNumber(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const GREEN = "#1B5E20";
const LIGHT_GREEN = "#E8F5E9";
const GRAY = "#666666";
const BLACK = "#000000";
const WHITE = "#FFFFFF";

export async function generateQuotationPDF(data: QuotationPDFData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 80; // 40 margin each side
      const leftMargin = 40;
      let y = 40;

      // ===== PAGE 1 =====

      // Company Header
      doc.fillColor(GREEN).fontSize(16).font("Helvetica-Bold")
        .text(data.companyName, leftMargin, y);
      y += 22;

      doc.fillColor(GRAY).fontSize(8).font("Helvetica");
      if (data.companyAddress) {
        const addr = `End.: ${data.companyAddress}${data.companyCity ? `, ${data.companyCity}` : ""}${data.companyState ? `, ${data.companyState}` : ""}${data.companyZipCode ? ` - ${data.companyZipCode}` : ""}`;
        doc.text(addr, leftMargin, y);
        y += 11;
      }
      if (data.companyPhone) { doc.text(`Mobile: ${data.companyPhone}`, leftMargin, y); y += 11; }
      if (data.companyEmail) { doc.text(`Email: ${data.companyEmail}`, leftMargin, y); y += 11; }
      if (data.companyDocument) { doc.text(`CNPJ: ${data.companyDocument}`, leftMargin, y); y += 11; }
      y += 5;

      // Green divider line
      doc.fillColor(GREEN).rect(leftMargin, y, pageWidth, 3).fill();
      y += 10;

      // === Three columns: CONTRATANTE | LOCAL DA OBRA | EST./N.° ===
      const colWidth = pageWidth / 3;
      const col1X = leftMargin;
      const col2X = leftMargin + colWidth;
      const col3X = leftMargin + colWidth * 2;

      // Column headers
      const headerY = y;
      doc.fillColor(GREEN).rect(col1X, headerY, colWidth - 5, 14).fill();
      doc.fillColor(WHITE).fontSize(7).font("Helvetica-Bold").text("CONTRATANTE", col1X + 3, headerY + 3);

      doc.fillColor(GREEN).rect(col2X, headerY, colWidth - 5, 14).fill();
      doc.fillColor(WHITE).fontSize(7).font("Helvetica-Bold").text("LOCAL DA OBRA", col2X + 3, headerY + 3);

      // EST./N.° box
      doc.lineWidth(0.5).strokeColor("#999").rect(col3X, headerY, colWidth, 55).stroke();
      doc.fillColor(GREEN).fontSize(7).font("Helvetica-Bold").text("EST./N.°:", col3X + 3, headerY + 3);
      doc.fillColor(BLACK).fontSize(14).font("Helvetica-Bold").text(data.number, col3X + colWidth - 60, headerY + 1, { width: 55, align: "right" });

      doc.fillColor(BLACK).fontSize(7).font("Helvetica-Bold").text("DATA PDO.:", col3X + 3, headerY + 20);
      doc.font("Helvetica").text(fmtDate(data.createdAt), col3X + colWidth - 60, headerY + 20, { width: 55, align: "right" });

      doc.font("Helvetica-Bold").text("DATA VAL.:", col3X + 3, headerY + 33);
      doc.font("Helvetica").text(fmtDate(data.validUntil), col3X + colWidth - 60, headerY + 33, { width: 55, align: "right" });

      // Client info
      let clientY = headerY + 18;
      doc.fillColor(BLACK).fontSize(8).font("Helvetica-Bold").text(data.clientName, col1X + 3, clientY, { width: colWidth - 10 });
      clientY += 11;
      doc.font("Helvetica").fontSize(7);
      if (data.clientDocument) { doc.text(`CPF/CNPJ: ${data.clientDocument}`, col1X + 3, clientY, { width: colWidth - 10 }); clientY += 10; }
      if (data.clientPhone) { doc.text(`Telefone: ${data.clientPhone}`, col1X + 3, clientY, { width: colWidth - 10 }); clientY += 10; }
      if (data.clientEmail) { doc.text(`E-mail: ${data.clientEmail}`, col1X + 3, clientY, { width: colWidth - 10 }); clientY += 10; }
      if (data.clientAddress) {
        const addr = `Endereço: ${data.clientAddress}${data.clientCity ? `, ${data.clientCity}` : ""}${data.clientState ? ` - ${data.clientState}` : ""}${data.clientZipCode ? `, ${data.clientZipCode}` : ""}`;
        doc.text(addr, col1X + 3, clientY, { width: colWidth - 10 });
        clientY += 10;
      }

      // Work location
      let locY = headerY + 18;
      doc.fillColor(BLACK).fontSize(7).font("Helvetica");
      doc.text(data.workLocation || "—", col2X + 3, locY, { width: colWidth - 10 });

      y = Math.max(clientY, headerY + 70) + 10;

      // === Items Table ===
      const tableColWidths = [pageWidth * 0.30, pageWidth * 0.20, pageWidth * 0.15, pageWidth * 0.15, pageWidth * 0.20];
      const tableHeaders = ["DESCRIÇÃO", "ITEM", "M²/QTD.", "PREÇO/UN.", "VALOR"];

      // Table header
      doc.fillColor(GREEN).rect(leftMargin, y, pageWidth, 16).fill();
      let tx = leftMargin;
      doc.fillColor(WHITE).fontSize(7).font("Helvetica-Bold");
      tableHeaders.forEach((header, i) => {
        const align = i >= 2 ? "right" : "left";
        doc.text(header, tx + 3, y + 4, { width: tableColWidths[i] - 6, align });
        tx += tableColWidths[i];
      });
      y += 16;

      // Table rows
      doc.font("Helvetica").fontSize(7);
      data.items.forEach((item, idx) => {
        const rowH = 18;
        if (idx % 2 === 0) {
          doc.fillColor("#F9F9F9").rect(leftMargin, y, pageWidth, rowH).fill();
        }
        doc.fillColor(BLACK);
        let rx = leftMargin;
        doc.text(item.description, rx + 3, y + 5, { width: tableColWidths[0] - 6 });
        rx += tableColWidths[0];
        doc.text(item.itemType || "—", rx + 3, y + 5, { width: tableColWidths[1] - 6 });
        rx += tableColWidths[1];
        doc.text(fmtNumber(item.quantity), rx + 3, y + 5, { width: tableColWidths[2] - 6, align: "right" });
        rx += tableColWidths[2];
        doc.text(fmtCurrency(item.unitPrice), rx + 3, y + 5, { width: tableColWidths[3] - 6, align: "right" });
        rx += tableColWidths[3];
        doc.font("Helvetica-Bold").text(fmtCurrency(item.total), rx + 3, y + 5, { width: tableColWidths[4] - 6, align: "right" });
        doc.font("Helvetica");
        // Bottom border
        doc.strokeColor("#E5E7EB").lineWidth(0.3).moveTo(leftMargin, y + rowH).lineTo(leftMargin + pageWidth, y + rowH).stroke();
        y += rowH;
      });
      y += 8;

      // === Condições de Pagamento ===
      if (data.paymentConditions) {
        doc.fillColor(GREEN).fontSize(8).font("Helvetica-Bold")
          .text("CONDIÇÕES DE PAGAMENTO (Art. 40, CDC e Arts. 417-420, CC):", leftMargin, y, { underline: true });
        y += 14;
        doc.strokeColor("#E5E7EB").lineWidth(0.5).rect(leftMargin, y, pageWidth, 0).stroke();
        doc.fillColor(BLACK).fontSize(7).font("Helvetica")
          .text(data.paymentConditions, leftMargin + 3, y + 3, { width: pageWidth - 6 });
        y += doc.heightOfString(data.paymentConditions, { width: pageWidth - 6 }) + 12;
      }

      // Page 1 footer
      doc.fillColor("#999").fontSize(7).font("Helvetica")
        .text("Page 1 of 2", leftMargin, doc.page.height - 30, { width: pageWidth, align: "right" });

      // ===== PAGE 2 =====
      doc.addPage();
      y = 40;

      // Meios de pagamento + Totals side by side
      const halfWidth = pageWidth / 2;

      // Left: Meios de pagamento
      if (data.paymentMethodDescription) {
        doc.fillColor(BLACK).fontSize(8).font("Helvetica-Bold")
          .text("3. Meios de pagamento:", leftMargin, y);
        y += 12;
        doc.fontSize(7).font("Helvetica")
          .text(data.paymentMethodDescription, leftMargin, y, { width: halfWidth - 10 });
        const pmHeight = doc.heightOfString(data.paymentMethodDescription, { width: halfWidth - 10 });
        const pmEndY = y + pmHeight + 5;

        // QR Code section
        if (data.pixKey) {
          let qrY = pmEndY + 5;
          doc.fillColor(GREEN).fontSize(8).font("Helvetica-Bold").text("QR Code", leftMargin, qrY);
          qrY += 14;

          // Generate QR Code
          try {
            const qrText = data.pixKey;
            const qrDataUrl = await QRCode.toDataURL(qrText, { width: 80, margin: 1 });
            const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
            doc.image(qrBuffer, leftMargin, qrY, { width: 60, height: 60 });
          } catch (e) {
            doc.fillColor(GRAY).fontSize(7).text("[QR Code]", leftMargin, qrY);
          }

          // PIX info
          const pixInfoX = leftMargin + 70;
          doc.fillColor(BLACK).fontSize(7).font("Helvetica");
          let pixY = qrY + 5;
          if (data.pixHolder) { doc.font("Helvetica-Bold").text("Titular: ", pixInfoX, pixY, { continued: true }).font("Helvetica").text(data.pixHolder); pixY += 10; }
          if (data.pixBank) { doc.font("Helvetica-Bold").text("Banco: ", pixInfoX, pixY, { continued: true }).font("Helvetica").text(data.pixBank); pixY += 10; }
          if (data.pixKey) { doc.font("Helvetica-Bold").text("Chave PIX: ", pixInfoX, pixY, { continued: true }).font("Helvetica").text(data.pixKey); pixY += 10; }
        }
      }

      // Right: Totals table
      const totalsX = leftMargin + halfWidth + 10;
      let totY = y - 12;

      const issVal = data.issPercentage ? data.subtotal * (data.issPercentage / 100) : 0;
      const icmsVal = data.icmsPercentage ? data.subtotal * (data.icmsPercentage / 100) : 0;

      // Subtotal row
      doc.fillColor(BLACK).fontSize(9).font("Helvetica-Bold")
        .text("SUBTOTAL", totalsX, totY, { width: halfWidth * 0.5, align: "right" });
      doc.font("Helvetica")
        .text(`R$ ${fmtCurrency(data.subtotal)}`, totalsX + halfWidth * 0.5, totY, { width: halfWidth * 0.5 - 10, align: "right" });
      totY += 16;
      doc.strokeColor("#E5E7EB").lineWidth(0.3).moveTo(totalsX, totY - 3).lineTo(totalsX + halfWidth - 10, totY - 3).stroke();

      // ISS
      if (data.issPercentage && data.issPercentage > 0) {
        doc.fillColor(BLACK).fontSize(8).font("Helvetica")
          .text(`ISS (${data.issPercentage}%)`, totalsX, totY, { width: halfWidth * 0.5, align: "right" });
        doc.text(`R$ ${fmtCurrency(issVal)}`, totalsX + halfWidth * 0.5, totY, { width: halfWidth * 0.5 - 10, align: "right" });
        totY += 14;
        doc.strokeColor("#E5E7EB").lineWidth(0.3).moveTo(totalsX, totY - 3).lineTo(totalsX + halfWidth - 10, totY - 3).stroke();
      }

      // ICMS
      if (data.icmsPercentage && data.icmsPercentage > 0) {
        doc.fillColor(BLACK).fontSize(8).font("Helvetica")
          .text(`ICMS (${data.icmsPercentage}%)`, totalsX, totY, { width: halfWidth * 0.5, align: "right" });
        doc.text(`R$ ${fmtCurrency(icmsVal)}`, totalsX + halfWidth * 0.5, totY, { width: halfWidth * 0.5 - 10, align: "right" });
        totY += 14;
      }

      // VALOR TOTAL
      doc.fillColor(GREEN).rect(totalsX, totY, halfWidth - 10, 20).fill();
      doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold")
        .text("VALOR TOTAL", totalsX + 3, totY + 5, { width: halfWidth * 0.5 - 6, align: "right" });
      doc.fontSize(11).text(`R$ ${fmtCurrency(data.total)}`, totalsX + halfWidth * 0.5, totY + 4, { width: halfWidth * 0.5 - 13, align: "right" });
      totY += 30;

      y = Math.max(totY, y + 120) + 10;

      // === Descrição dos Serviços Contratados ===
      if (data.serviceDescription) {
        doc.fillColor(GREEN).fontSize(8).font("Helvetica-Bold")
          .text("DESCRIÇÃO DOS SERVIÇOS CONTRATADOS:", leftMargin, y, { underline: true });
        y += 14;
        doc.fillColor(BLACK).fontSize(7).font("Helvetica")
          .text(data.serviceDescription, leftMargin, y, { width: pageWidth });
        y += doc.heightOfString(data.serviceDescription, { width: pageWidth }) + 10;
      }

      // === Prazo de Entrega ===
      if (data.deliveryEstimate) {
        doc.fillColor(GREEN).fontSize(8).font("Helvetica-Bold")
          .text("PRAZO DE ENTREGA ESTIMADO:", leftMargin, y, { underline: true });
        y += 14;
        doc.fillColor(BLACK).fontSize(7).font("Helvetica")
          .text(data.deliveryEstimate, leftMargin, y, { width: pageWidth });
        y += doc.heightOfString(data.deliveryEstimate, { width: pageWidth }) + 10;
      }

      // === Aviso Legal ===
      if (data.legalNotice) {
        doc.strokeColor("#999").lineWidth(0.5).rect(leftMargin, y, pageWidth, 0);
        doc.rect(leftMargin, y, pageWidth, doc.heightOfString(data.legalNotice, { width: pageWidth - 10 }) + 10).stroke();
        doc.fillColor(BLACK).fontSize(7).font("Helvetica")
          .text(data.legalNotice, leftMargin + 5, y + 5, { width: pageWidth - 10 });
        y += doc.heightOfString(data.legalNotice, { width: pageWidth - 10 }) + 20;
      }

      // === Assinaturas ===
      y = Math.max(y + 30, doc.page.height - 130);
      const sigWidth = (pageWidth - 40) / 2;

      // Left signature
      doc.strokeColor("#999").lineWidth(0.5)
        .moveTo(leftMargin, y).lineTo(leftMargin + sigWidth, y).stroke();
      doc.fillColor(BLACK).fontSize(8).font("Helvetica-Bold")
        .text(data.companyName, leftMargin, y + 5, { width: sigWidth, align: "center" });

      // Right signature
      doc.strokeColor("#999").lineWidth(0.5)
        .moveTo(leftMargin + sigWidth + 40, y).lineTo(leftMargin + pageWidth, y).stroke();
      doc.fillColor(BLACK).fontSize(8).font("Helvetica-Bold")
        .text(data.clientName, leftMargin + sigWidth + 40, y + 5, { width: sigWidth, align: "center" });

      // Page 2 footer
      doc.fillColor("#999").fontSize(7).font("Helvetica")
        .text("Page 2 of 2", leftMargin, doc.page.height - 30, { width: pageWidth, align: "right" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateInvoicePDF(data: QuotationPDFData): Promise<Buffer> {
  // For now, reuse quotation PDF with minor adjustments
  return generateQuotationPDF(data);
}
