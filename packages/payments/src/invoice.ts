import { PaymentsError } from './errors';
import { getPayment } from './services';

export interface InvoicePayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reference: { type: string; id: string };
  gateway: string;
  description?: string;
  customer?: { id?: string; email?: string; name?: string };
  metadata?: Record<string, string>;
  refundedAmount: number;
  paidAt?: Date | string;
  createdAt: Date | string;
}

const INVOICE_STATUSES = new Set(['paid', 'partially_refunded', 'refunded']);

function pdfEscape(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function formatMoney(amount: number, currency: string): string {
  const major = (amount / 100).toFixed(2);
  return `${major} ${currency.toUpperCase()}`;
}

function formatWhen(value: Date | string | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString();
}

export function renderSimplePdf(title: string, lines: string[]): Buffer {
  const commands = ['BT', '/F1 20 Tf', '72 740 Td', `(${pdfEscape(title)}) Tj`, '/F1 11 Tf'];
  for (const line of lines) {
    commands.push('0 -16 Td', `(${pdfEscape(line)}) Tj`);
  }
  commands.push('ET');
  const stream = `${commands.join('\n')}\n`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  const xrefAt = Buffer.byteLength(body);
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    const offset = offsets[index] ?? 0;
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, 'latin1');
}

export function invoiceLines(payment: InvoicePayment): string[] {
  const customer = [payment.customer?.name, payment.customer?.email].filter(Boolean).join(' · ');
  const product = payment.metadata?.productName;
  return [
    `Invoice ${payment.id}`,
    `Status: ${payment.status}`,
    `Paid: ${formatWhen(payment.paidAt)}`,
    `Created: ${formatWhen(payment.createdAt)}`,
    `Customer: ${customer || '—'}`,
    `Description: ${payment.description || product || '—'}`,
    `Amount: ${formatMoney(payment.amount, payment.currency)}`,
    `Refunded: ${formatMoney(payment.refundedAmount, payment.currency)}`,
    `Gateway: ${payment.gateway}`,
    `Reference: ${payment.reference.type} / ${payment.reference.id}`,
  ];
}

export function renderInvoicePdf(payment: InvoicePayment): Buffer {
  return renderSimplePdf('Invoice', invoiceLines(payment));
}

export async function getInvoicePdf(
  paymentId: string,
): Promise<{ filename: string; body: Buffer }> {
  const payment = await getPayment(paymentId);
  if (!INVOICE_STATUSES.has(payment.status)) {
    throw new PaymentsError(
      'Invoices are available after the payment is paid.',
      'INVOICE_NOT_READY',
      400,
    );
  }
  const safeId = payment.id.replace(/[^a-zA-Z0-9_-]/g, '');
  return {
    filename: `invoice-${safeId || 'payment'}.pdf`,
    body: renderInvoicePdf(payment),
  };
}
