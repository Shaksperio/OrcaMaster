export function buildQuotationPdfUrl(id: number | string): string {
  return `/api/quotations/${encodeURIComponent(String(id))}/pdf`;
}

export function buildQuotationPreviewUrl(id: number | string): string {
  return `/quotations/${encodeURIComponent(String(id))}/preview`;
}

export function buildQuotationPrintStyles(): string {
  return `
    @media print {
      body * { visibility: hidden !important; }
      [data-print-target], [data-print-target] * { visibility: visible !important; }
      [data-print-target] { position: absolute; left: 0; top: 0; width: 210mm !important; max-width: 210mm !important; margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; }
      .quotation-page { box-sizing: border-box; width: 210mm; min-height: 297mm; page-break-after: always; break-after: page; }
      .quotation-page:last-child { page-break-after: auto; break-after: auto; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      @page { size: A4 portrait; margin: 0; }
      html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;
}

export function printQuotation(printFn: () => void): void {
  printFn();
}
