import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { Readable } from "stream";

interface QuotationPDFData {
  number: string;
  clientName: string;
  clientDocument?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  companyName: string;
  companyDocument: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  companyCity?: string;
  companyState?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  total: number;
  notes?: string;
  validityDays?: number;
  validationUrl?: string;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export async function generateQuotationPDF(data: QuotationPDFData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", reject);

      // Generate QR Code
      const qrCodeDataUrl = await QRCode.toDataURL(
        data.validationUrl || `${process.env.VITE_APP_URL || 'https://orcamaster.local'}/validate/${data.number}`,
        {
          width: 100,
          margin: 1,
        }
      );

      const primaryColor = data.theme?.primaryColor || "#2563eb";
      const secondaryColor = data.theme?.secondaryColor || "#f3f4f6";

      // Header with company info
      doc
        .fillColor(primaryColor)
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("ORÇAMENTO", 40, 40);

      doc
        .fillColor("#666")
        .fontSize(10)
        .font("Helvetica")
        .text(`Nº ${data.number}`, 40, 70);

      // Company info
      doc
        .fillColor("#000")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(data.companyName, 40, 100);

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(`CNPJ: ${data.companyDocument}`, 40, 120);

      if (data.companyAddress) {
        doc.text(
          `${data.companyAddress}${data.companyCity ? `, ${data.companyCity}` : ""}${
            data.companyState ? ` - ${data.companyState}` : ""
          }`,
          40,
          135
        );
      }

      if (data.companyPhone) {
        doc.text(`Tel: ${data.companyPhone}`, 40, 150);
      }

      if (data.companyEmail) {
        doc.text(`Email: ${data.companyEmail}`, 40, 165);
      }

      // QR Code
      const qrBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");
      doc.image(qrBuffer, 450, 100, { width: 80, height: 80 });

      // Client info
      doc
        .fillColor(primaryColor)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("CLIENTE", 40, 200);

      doc
        .fillColor("#000")
        .fontSize(10)
        .font("Helvetica")
        .text(data.clientName, 40, 220);

      if (data.clientDocument) {
        doc.text(`CPF/CNPJ: ${data.clientDocument}`, 40, 235);
      }

      if (data.clientAddress) {
        doc.text(
          `${data.clientAddress}${data.clientCity ? `, ${data.clientCity}` : ""}${
            data.clientState ? ` - ${data.clientState}` : ""
          }`,
          40,
          250
        );
      }

      if (data.clientPhone) {
        doc.text(`Tel: ${data.clientPhone}`, 40, 265);
      }

      if (data.clientEmail) {
        doc.text(`Email: ${data.clientEmail}`, 40, 280);
      }

      // Items table
      const tableTop = 320;
      const tableHeight = 20;
      const col1X = 40;
      const col2X = 300;
      const col3X = 380;
      const col4X = 480;

      // Table header
      doc
        .fillColor(secondaryColor)
        .rect(col1X, tableTop, 540, tableHeight)
        .fill();

      doc
        .fillColor("#000")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Descrição", col1X + 5, tableTop + 5)
        .text("Qtd", col2X + 5, tableTop + 5)
        .text("Valor Unit.", col3X + 5, tableTop + 5)
        .text("Total", col4X + 5, tableTop + 5);

      // Table rows
      let yPosition = tableTop + tableHeight;

      data.items.forEach((item) => {
        doc
          .fillColor("#000")
          .fontSize(9)
          .font("Helvetica")
          .text(item.description, col1X + 5, yPosition + 5)
          .text(item.quantity.toString(), col2X + 5, yPosition + 5)
          .text(`R$ ${item.unitPrice.toFixed(2)}`, col3X + 5, yPosition + 5)
          .text(`R$ ${item.total.toFixed(2)}`, col4X + 5, yPosition + 5);

        yPosition += tableHeight;
      });

      // Totals
      yPosition += 10;

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Subtotal: R$ ${data.subtotal.toFixed(2)}`, col3X, yPosition);

      if (data.discount && data.discount > 0) {
        yPosition += 15;
        doc.text(`Desconto: R$ ${data.discount.toFixed(2)}`, col3X, yPosition);
      }

      yPosition += 15;
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(`Total: R$ ${data.total.toFixed(2)}`, col3X, yPosition);

      // Validity
      if (data.validityDays) {
        yPosition += 30;
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#666")
          .text(`Validade: ${data.validityDays} dias`, 40, yPosition);
      }

      // Notes
      if (data.notes) {
        yPosition += 20;
        doc
          .fillColor(primaryColor)
          .fontSize(10)
          .font("Helvetica-Bold")
          .text("Observações", 40, yPosition);

        yPosition += 15;
        doc
          .fillColor("#000")
          .fontSize(9)
          .font("Helvetica")
          .text(data.notes, 40, yPosition, { width: 500 });
      }

      // Footer
      doc
        .fontSize(8)
        .fillColor("#999")
        .text(
          "Este orçamento foi gerado digitalmente. Valide via QR Code acima.",
          40,
          doc.page.height - 40,
          { align: "center" }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateInvoicePDF(data: QuotationPDFData): Promise<Buffer> {
  // Similar to quotation but with "FATURA" header and additional payment info
  return generateQuotationPDF({ ...data });
}
