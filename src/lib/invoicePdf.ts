import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPrice } from './formatters';

const COMPANY = {
  name: 'PANDIYIN Nature In Pack',
  tagline: 'Premium Homemade & Natural Products',
  addressLine1: '802, VPM House, Mandhaikaliamman Kovil Street',
  addressLine2: 'Krishnapuram Road, M.Kallupatti',
  addressLine3: 'Madurai District – 625535, Tamil Nadu, India',
  phone: '+91 63837 09933',
  email: 'pandiyinnatureinpack@gmail.com',
  website: 'pandiyin-natureinpack.vercel.app',
  gstin: '33HADPM5916B1ZZ',
};

const STATE_GST_CODES: Record<string, string> = {
  'Jammu and Kashmir': '01', 'Himachal Pradesh': '02', 'Punjab': '03', 'Chandigarh': '04',
  'Uttarakhand': '05', 'Haryana': '06', 'Delhi': '07', 'Rajasthan': '08', 'Uttar Pradesh': '09',
  'Bihar': '10', 'Sikkim': '11', 'Arunachal Pradesh': '12', 'Nagaland': '13', 'Manipur': '14',
  'Mizoram': '15', 'Tripura': '16', 'Meghalaya': '17', 'Assam': '18', 'West Bengal': '19',
  'Jharkhand': '20', 'Odisha': '21', 'Chhattisgarh': '22', 'Madhya Pradesh': '23',
  'Gujarat': '24', 'Dadra and Nagar Haveli': '26', 'Daman and Diu': '25',
  'Maharashtra': '27', 'Andhra Pradesh': '37', 'Karnataka': '29', 'Goa': '30',
  'Lakshadweep': '31', 'Kerala': '32', 'Tamil Nadu': '33', 'Puducherry': '34', 'Pondicherry': '34',
  'Andaman and Nicobar Islands': '35', 'Telangana': '36', 'Ladakh': '38',
};

// Brand colors
const DARK_GREEN: [number, number, number] = [30, 70, 32];
const LIGHT_GREEN: [number, number, number] = [134, 197, 156];
const LIGHTER_GREEN: [number, number, number] = [230, 245, 233];
const GRAY: [number, number, number] = [100, 100, 100];
const BLACK: [number, number, number] = [0, 0, 0];
const DARK_TEXT: [number, number, number] = [30, 30, 30];

export function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `PNP-${y}${m}${d}-${rand}`;
}

export interface InvoiceItem {
  name: string;
  hsn: string;
  quantity: number;
  price: number;
  total: number;
  gstPercentage: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderDate: string;
  orderTime: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerState: string;
  items: InvoiceItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  couponCode?: string;
  grandTotal: number;
  paymentMethod: string;
  paymentGateway?: string;
  paymentStatus?: string;
  paymentId?: string;
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertGroup = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertGroup(n % 100) : '');
  };

  const rupees = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - rupees) * 100);

  let result = '';
  if (rupees >= 10000000) {
    result += convertGroup(Math.floor(rupees / 10000000)) + ' Crore ';
    const r1 = rupees % 10000000;
    if (r1 >= 100000) result += convertGroup(Math.floor(r1 / 100000)) + ' Lakh ';
    const r2 = r1 % 100000;
    if (r2 >= 1000) result += convertGroup(Math.floor(r2 / 1000)) + ' Thousand ';
    const r3 = r2 % 1000;
    if (r3 > 0) result += convertGroup(r3);
  } else if (rupees >= 100000) {
    result += convertGroup(Math.floor(rupees / 100000)) + ' Lakh ';
    const r1 = rupees % 100000;
    if (r1 >= 1000) result += convertGroup(Math.floor(r1 / 1000)) + ' Thousand ';
    const r2 = r1 % 1000;
    if (r2 > 0) result += convertGroup(r2);
  } else if (rupees >= 1000) {
    result += convertGroup(Math.floor(rupees / 1000)) + ' Thousand ';
    const r = rupees % 1000;
    if (r > 0) result += convertGroup(r);
  } else {
    result += convertGroup(rupees);
  }

  result = result.trim() + ' Rupees';
  if (paise > 0) result += ' and ' + convertGroup(paise) + ' Paise';
  return result + ' Only';
}

function drawLine(doc: jsPDF, y: number, x1: number, x2: number, color: [number, number, number] = LIGHT_GREEN, width = 0.3) {
  doc.setDrawColor(...color);
  doc.setLineWidth(width);
  doc.line(x1, y, x2, y);
}

function sectionTitle(doc: jsPDF, text: string, x: number, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK_GREEN);
  doc.text(text, x, y);
  return y + 5;
}

async function loadLogoBase64(): Promise<string | null> {
  try {
    const response = await fetch('/invoice-logo.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateInvoicePdf(data: InvoiceData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 16; // margin left
  const mr = pw - 16; // margin right
  let y = 16;

  // ═══════════════════════════════════════════════════════
  // SECTION 1 — HEADER (Two-column: Company left, Invoice right)
  // ═══════════════════════════════════════════════════════

  // Logo
  const logoBase64 = await loadLogoBase64();
  const logoSize = 18;
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', ml, y - 4, logoSize, logoSize);
  }
  const textStartX = logoBase64 ? ml + logoSize + 3 : ml;

  // Left side: Company branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...DARK_GREEN);
  doc.text(COMPANY.name.toUpperCase(), textStartX, y);
  y += 4;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(COMPANY.tagline, textStartX, y);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK_TEXT);
  doc.text(COMPANY.addressLine1, textStartX, y); y += 3.5;
  doc.text(COMPANY.addressLine2, textStartX, y); y += 3.5;
  doc.text(COMPANY.addressLine3, textStartX, y); y += 4;
  doc.text(`Phone: ${COMPANY.phone}`, textStartX, y); y += 3.5;
  doc.text(`Email: ${COMPANY.email}`, textStartX, y); y += 3.5;
  doc.text(`Website: ${COMPANY.website}`, textStartX, y); y += 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`GSTIN: ${COMPANY.gstin}`, textStartX, y);

  // Right side: Invoice meta (right-aligned)
  const rightCol = mr;
  let ry = 16;

  const metaLabelX = pw - 80;
  const metaValueX = rightCol;

  // (meta will be drawn after TAX INVOICE row)

  y = Math.max(y, ry) + 5;

  // Header divider
  drawLine(doc, y, ml, mr, DARK_GREEN, 0.6);
  y += 7;

  // ═══════════════════════════════════════════════════════
  // SECTION 2 — INVOICE DETAILS
  // ═══════════════════════════════════════════════════════

  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK_GREEN);
  doc.text('Invoice Details', ml, y);
  y += 5;

  // Two-column grid: labels left, values right
  const labelX = ml + 4;
  const valueX = ml + 50;
  const detailSpacing = 5;

  const drawDetailRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(label, labelX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text(`:  ${value}`, valueX, y);
    y += detailSpacing;
  };

  drawDetailRow('Invoice Title', 'TAX INVOICE');
  drawDetailRow('Invoice Number', data.invoiceNumber);
  drawDetailRow('Invoice Date', data.orderDate);
  drawDetailRow('Invoice Time', data.orderTime);

  y += 2;
  drawLine(doc, y, ml, mr, LIGHT_GREEN, 0.3);
  y += 7;

  // ═══════════════════════════════════════════════════════
  // SECTION 3 — SHIPPING ADDRESS
  // ═══════════════════════════════════════════════════════

  y = sectionTitle(doc, 'SHIPPING ADDRESS', ml, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(data.customerName, ml, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...DARK_TEXT);
  const addressLines = data.customerAddress.split('\n');
  addressLines.forEach(line => {
    doc.text(line, ml, y);
    y += 4;
  });

  y += 1;
  doc.text(`Phone: ${data.customerPhone}`, ml, y);
  y += 4.5;

  const stateCode = STATE_GST_CODES[data.customerState] || '33';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...DARK_GREEN);
  doc.text(`Place of Supply: ${data.customerState} (${stateCode})`, ml, y);
  y += 6;

  drawLine(doc, y, ml, mr);
  y += 7;

  // ═══════════════════════════════════════════════════════
  // SECTION 3 — PAYMENT DETAILS (Two-column grid)
  // ═══════════════════════════════════════════════════════

  y = sectionTitle(doc, 'PAYMENT DETAILS', ml, y);

  const paymentGrid = [
    ['Payment Method', data.paymentMethod],
    ['Gateway', data.paymentGateway || '-'],
    ['Payment Status', data.paymentStatus || 'Pending'],
    ['Payment ID', data.paymentId || '-'],
  ];

  // Draw 2x2 grid
  const col1LabelX = ml;
  const col1ValueX = ml + 32;
  const col2LabelX = pw / 2 + 5;
  const col2ValueX = pw / 2 + 37;

  for (let i = 0; i < paymentGrid.length; i += 2) {
    // Left column
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(paymentGrid[i][0] + ':', col1LabelX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text(paymentGrid[i][1], col1ValueX, y);

    // Right column
    if (i + 1 < paymentGrid.length) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(paymentGrid[i + 1][0] + ':', col2LabelX, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK_TEXT);
      doc.text(paymentGrid[i + 1][1], col2ValueX, y);
    }
    y += 5;
  }

  y += 4;
  drawLine(doc, y, ml, mr);
  y += 7;

  // ═══════════════════════════════════════════════════════
  // SECTION 4 — PRODUCT TABLE
  // ═══════════════════════════════════════════════════════

  y = sectionTitle(doc, 'ORDER ITEMS', ml, y);

  const tableHead = [['Sl No', 'Product Description', 'HSN/SAC', 'Qty', 'Unit Price', 'Total']];
  const tableBody = data.items.map((item, i) => [
    String(i + 1),
    item.name,
    item.hsn || '-',
    String(item.quantity),
    formatPrice(item.price),
    formatPrice(item.total),
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: LIGHTER_GREEN,
      textColor: DARK_GREEN,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      lineColor: LIGHT_GREEN,
      lineWidth: 0.3,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: DARK_TEXT,
      lineColor: LIGHT_GREEN,
      lineWidth: 0.2,
      cellPadding: 2.5,
    },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    styles: {
      lineColor: LIGHT_GREEN,
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: ml, right: 16 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ═══════════════════════════════════════════════════════
  // SECTION 5 — ORDER SUMMARY (right-aligned)
  // ═══════════════════════════════════════════════════════

  // GST calculation
  const gstGroups: Record<number, number> = {};
  data.items.forEach(item => {
    const rate = item.gstPercentage || 0;
    const taxAmount = item.total * rate / (100 + rate);
    gstGroups[rate] = (gstGroups[rate] || 0) + taxAmount;
  });
  const totalGST = Object.values(gstGroups).reduce((a, b) => a + b, 0);

  const summaryBoxX = pw - 100;
  const summaryLabelX = summaryBoxX + 4;
  const summaryValueX = mr - 4;

  // Summary background box
  const summaryStartY = y;
  const summaryItems = [
    { label: 'Subtotal', value: formatPrice(data.subtotal), bold: false },
    { label: 'Delivery Charge', value: data.deliveryCharge === 0 ? 'FREE' : formatPrice(data.deliveryCharge), bold: false },
    { label: 'GST Included', value: formatPrice(totalGST), bold: false },
  ];
  if (data.discount > 0) {
    const discLabel = data.couponCode ? `Discount (${data.couponCode})` : 'Discount';
    summaryItems.push({ label: discLabel, value: `- ${formatPrice(data.discount)}`, bold: false });
  }

  // Draw summary rows
  summaryItems.forEach(item => {
    doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text(item.label, summaryLabelX, y);
    doc.text(item.value, summaryValueX, y, { align: 'right' });
    y += 5.5;
  });

  // Grand total separator
  y += 1;
  drawLine(doc, y, summaryBoxX, mr, DARK_GREEN, 0.5);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK_GREEN);
  doc.text('Grand Total', summaryLabelX, y);
  doc.text(formatPrice(data.grandTotal), summaryValueX, y, { align: 'right' });
  y += 4;


  y += 8;

  // ═══════════════════════════════════════════════════════
  // SECTION 6 — AMOUNT IN WORDS
  // ═══════════════════════════════════════════════════════

  y = sectionTitle(doc, 'AMOUNT IN WORDS', ml, y);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK_TEXT);
  const words = numberToWords(data.grandTotal);
  const wordLines = doc.splitTextToSize(words, pw - ml * 2);
  wordLines.forEach((line: string) => {
    doc.text(line, ml, y);
    y += 4;
  });

  y += 4;
  drawLine(doc, y, ml, mr);
  y += 6;

  // ═══════════════════════════════════════════════════════
  // GST BREAKDOWN (small print)
  // ═══════════════════════════════════════════════════════

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  Object.entries(gstGroups).forEach(([rate, amount]) => {
    if (Number(rate) > 0) {
      doc.text(`* Includes ${rate}% GST: ${formatPrice(amount)} (Tax inclusive pricing)`, ml, y);
      y += 3.5;
    }
  });

  // ═══════════════════════════════════════════════════════
  // Authorized Signatory
  // ═══════════════════════════════════════════════════════

  const sigY = Math.max(y + 12, ph - 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text('For ' + COMPANY.name, mr, sigY, { align: 'right' });
  doc.text('Authorized Signatory', mr, sigY + 12, { align: 'right' });
  drawLine(doc, sigY + 8, mr - 45, mr, GRAY, 0.2);

  // ═══════════════════════════════════════════════════════
  // SECTION 7 — FOOTER
  // ═══════════════════════════════════════════════════════

  const footerY = ph - 18;
  drawLine(doc, footerY, ml, mr, DARK_GREEN, 0.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK_GREEN);
  doc.text('Thank you for shopping with Pandiyin Nature In Pack!', pw / 2, footerY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.text(
    `Phone: ${COMPANY.phone}  •  Email: ${COMPANY.email}  •  Website: ${COMPANY.website}`,
    pw / 2,
    footerY + 9.5,
    { align: 'center' }
  );

  doc.setFontSize(6);
  doc.text(
    'This is a computer-generated invoice and does not require a physical signature.',
    pw / 2,
    footerY + 13.5,
    { align: 'center' }
  );

  return doc;
}
