import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DealerInfo, LineItem, OrderSummary, PaymentSelections, Product, ProgramType } from '../types';
import { formatCurrency } from './calculations';
import { effectiveShipMonth } from './shipMonth';

interface PdfOrderData {
  program: ProgramType;
  dealer: DealerInfo;
  payment: PaymentSelections;
  lineItems: LineItem[];
  catalog: Record<string, Product[]>;
  summary: OrderSummary;
}

export function exportOrderPdf(data: PdfOrderData): void {
  const { program, dealer, payment, lineItems, catalog, summary } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const programLabel = program === 'truck' ? 'Truck Program' : 'Non-Truck Program';
  const margin = 40;
  let y = margin;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Western Products — Preseason Order', margin, y);
  y += 22;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`2024 ${programLabel} · Generated ${new Date().toLocaleDateString()}`, margin, y);
  y += 28;

  doc.setFont('helvetica', 'bold');
  doc.text('Dealer Information', margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  const dealerLines = [
    `Account #: ${dealer.accountNumber}`,
    `Dealer: ${dealer.dealerName}`,
    `PO #: ${dealer.poNumber}`,
    `Contact: ${dealer.contact} · ${dealer.phone}`,
    `Ship To: ${dealer.address}, ${dealer.cityState} ${dealer.zipCode}`,
  ];
  dealerLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 14;
  });

  if (dealer.comments) {
    y += 4;
    doc.text(`Comments: ${dealer.comments}`, margin, y, { maxWidth: 520 });
    y += 20;
  }

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Terms', margin, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  Object.entries(payment).forEach(([key, val]) => {
    if (val) {
      doc.text(`${key}: ${val}`, margin, y);
      y += 13;
    }
  });

  const rows = lineItems
    .map((item) => {
      const product = catalog[item.catalogKey]?.find((p) => p.part === item.part);
      if (!product) return null;
      return [
        item.part,
        product.description.slice(0, 50),
        String(item.qty),
        effectiveShipMonth(item, payment, program) || '—',
        formatCurrency(item.qty * product.listPrice * 0.6),
      ];
    })
    .filter(Boolean) as string[][];

  autoTable(doc, {
    startY: y + 10,
    head: [['Part #', 'Description', 'Qty', 'Ship Month', 'Net']],
    body: rows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [0, 51, 102] },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

  doc.setFont('helvetica', 'bold');
  doc.text('Order Totals', margin, finalY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Net Total: ${formatCurrency(summary.grandTotal)}`, margin, finalY + 16);
  doc.text(`Volume Savings: -${formatCurrency(summary.grandVolumeSavings)}`, margin, finalY + 30);
  doc.setFont('helvetica', 'bold');
  doc.text(`Net Less Volume: ${formatCurrency(summary.grandNetLessVolume)}`, margin, finalY + 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Program Units: ${summary.totalProgramUnits.toFixed(1)} · Preseason: ${summary.qualifiesPreseason ? 'YES' : 'NO'}`,
    margin,
    finalY + 70,
  );

  const filename = `Western-Order-${dealer.accountNumber || 'draft'}-${Date.now()}.pdf`;
  doc.save(filename);
}

export async function submitOrder(data: PdfOrderData): Promise<{ id: string; message: string }> {
  const payload = {
    program: data.program,
    dealer: data.dealer,
    payment: data.payment,
    lineItems: data.lineItems,
    summary: data.summary,
  };

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Submission failed' }));
    throw new Error(err.error || 'Failed to submit order');
  }

  return res.json();
}
