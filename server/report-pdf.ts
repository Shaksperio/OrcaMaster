import PDFDocument from "pdfkit";

export type FinanceReportRow = { type: string; identifier: string; status: string; value: number };

export function generateFinanceReportPDF(input: { companyName: string; companyId: number; rows: FinanceReportRow[]; generatedAt: Date }) {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Relatório financeiro ${input.companyName}`, Author: "OrçaMaster" } });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.fontSize(20).fillColor("#14213d").text("OrçaMaster");
    document.moveDown(0.3).fontSize(15).fillColor("#111827").text("Relatório financeiro");
    document.fontSize(10).fillColor("#64748b").text(input.companyName);
    document.text(`Gerado em ${input.generatedAt.toLocaleString("pt-BR")}`);
    document.moveDown(1);
    document.roundedRect(48, document.y, 499, 52, 6).fillAndStroke("#eff6ff", "#bfdbfe");
    document.fillColor("#1d4ed8").fontSize(10).text("Registros incluídos", 64, document.y + 14);
    document.fillColor("#111827").fontSize(18).text(String(input.rows.length), 64, document.y + 28);
    document.y += 70;
    const columns = [48, 130, 300, 392];
    document.fillColor("#475569").fontSize(9).text("TIPO", columns[0], document.y).text("IDENTIFICADOR", columns[1], document.y).text("STATUS", columns[2], document.y).text("VALOR", columns[3], document.y, { width: 155, align: "right" });
    document.moveDown(0.5).moveTo(48, document.y).lineTo(547, document.y).strokeColor("#cbd5e1").stroke();
    document.moveDown(0.6);
    input.rows.forEach((row) => {
      if (document.y > 740) document.addPage();
      const y = document.y;
      document.fillColor("#334155").fontSize(9).text(row.type, columns[0], y).text(row.identifier, columns[1], y, { width: 160, ellipsis: true }).text(row.status, columns[2], y, { width: 85, ellipsis: true }).text(money(row.value), columns[3], y, { width: 155, align: "right" });
      document.moveDown(0.7).moveTo(48, document.y).lineTo(547, document.y).strokeColor("#e2e8f0").stroke().moveDown(0.6);
    });
    if (input.rows.length === 0) document.fillColor("#64748b").fontSize(10).text("Nenhum registro financeiro foi encontrado para esta empresa.");
    document.fontSize(8).fillColor("#94a3b8").text(`Empresa ${input.companyId} · Dados consultados no banco oficial`, 48, 780, { align: "center", width: 499 });
    document.end();
  });
}
