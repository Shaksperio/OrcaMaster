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
      [data-print-target] { position: absolute; left: 0; top: 0; width: 100%; }
      .quotation-page { page-break-after: always; }
      .quotation-page:last-child { page-break-after: auto; }
      @page { size: A4; margin: 0; }
    }
  `;
}

export function printQuotation(printFn: () => void): void {
  printFn();
}
