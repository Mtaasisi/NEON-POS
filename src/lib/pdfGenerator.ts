/**
 * Shared PDF Generation Utility
 * Creates perfect vector-based PDFs for receipts
 */

import jsPDF from 'jspdf';
import { format } from '../features/lats/lib/format';

export interface ReceiptData {
  id?: string;
  receiptNumber: string;
  date: string;
  time: string;
  items: Array<{
    productName: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sku?: string;
    category?: string;
  }>;
  customer?: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  seller?: {
    name: string;
    phone?: string;
  };
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    grandTotal: number;
  };
  payment: {
    method: string;
    amount: number;
    change?: number;
    reference?: string;
  };
  businessInfo?: {
    name: string;
    logo?: string;
    address: string;
    phone: string;
    email?: string;
    website?: string;
  };
}

export interface ReceiptSettings {
  show_business_name: boolean;
  show_business_address: boolean;
  show_business_phone: boolean;
  show_business_email: boolean;
  show_business_website: boolean;
  enable_receipt_numbering: boolean;
  receipt_number_format: string;
  show_date_time: boolean;
  show_customer_name: boolean;
  show_customer_phone: boolean;
  show_subtotal: boolean;
  show_discounts: boolean;
  show_discount_total: boolean;
  show_tax: boolean;
  show_footer_message: boolean;
  footer_message: string;
  show_return_policy: boolean;
  return_policy_text: string;
}

export const defaultReceiptSettings: ReceiptSettings = {
  show_business_name: true,
  show_business_address: true,
  show_business_phone: true,
  show_business_email: true,
  show_business_website: false,
  enable_receipt_numbering: true,
  receipt_number_format: '{YEAR}-{NUMBER}',
  show_date_time: true,
  show_customer_name: true,
  show_customer_phone: true,
  show_subtotal: true,
  show_discounts: true,
  show_discount_total: true,
  show_tax: true,
  show_footer_message: true,
  footer_message: 'Thank you for your business!',
  show_return_policy: false,
  return_policy_text: ''
};

/**
 * Generate a perfect vector-based PDF receipt
 */
export async function generateReceiptPDF(
  receiptData: ReceiptData,
  businessInfo?: any,
  settings: ReceiptSettings = defaultReceiptSettings
): Promise<Blob> {
  console.log('🎯 Starting PDF generation...');
  console.log('📄 Receipt data:', receiptData);
  console.log('🏢 Business info:', businessInfo);
  console.log('⚙️ Settings:', settings);
  // Create PDF with high quality settings
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
    floatPrecision: 16
  });

  // Set up PDF dimensions and margins
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = margin;

  // Add a subtle border around the entire receipt
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, fontStyle: string = 'normal') => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);

    const lines = pdf.splitTextToSize(text, maxWidth);
    lines.forEach((line: string, index: number) => {
      if (y + (index * fontSize * 0.4) > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, x, y + (index * fontSize * 0.4));
    });
    return y + (lines.length * fontSize * 0.4);
  };

  // Helper function to add centered text
  const addCenteredText = (text: string, y: number, fontSize: number = 12, fontStyle: string = 'bold') => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    const textWidth = pdf.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    pdf.text(text, x, y);
    return y + fontSize * 0.6;
  };

  // Header Section with professional styling
  // Add a header background
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, margin, contentWidth, 25, 'F');

  // Add a subtle border for the header
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(150, 150, 150);
  pdf.rect(margin, margin, contentWidth, 25);

  currentY += 8;

  // Business Name in header
  if (settings.show_business_name) {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(50, 50, 50);
    const businessName = businessInfo?.name || 'Business Name';
    const nameWidth = pdf.getTextWidth(businessName);
    const nameX = (pageWidth - nameWidth) / 2;
    pdf.text(businessName, nameX, currentY);
    currentY += 6;
  }

  // Business Address in header
  if (settings.show_business_address) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    const address = businessInfo?.address || '123 Business Street, City';
    const addrWidth = pdf.getTextWidth(address);
    const addrX = (pageWidth - addrWidth) / 2;
    pdf.text(address, addrX, currentY);
    currentY += 4;
  }

  currentY += 8; // Space after header

  // Business Contact Info
  let contactInfo = [];
  if (settings.show_business_phone && businessInfo?.phone) {
    // Handle phone as string or array
    let phoneDisplay = '';
    if (typeof businessInfo.phone === 'string') {
      phoneDisplay = businessInfo.phone;
    } else if (Array.isArray(businessInfo.phone) && businessInfo.phone.length > 0) {
      // Handle array format like [{"phone":"234324234234","whatsapp":false}]
      const primaryPhone = businessInfo.phone.find(p => p && (p.phone || p.number));
      if (primaryPhone) {
        phoneDisplay = primaryPhone.phone || primaryPhone.number || '';
      }
    }
    if (phoneDisplay) {
      contactInfo.push(`Phone: ${phoneDisplay}`);
    }
  }
  if (settings.show_business_email && businessInfo?.email) {
    contactInfo.push(`Email: ${businessInfo.email}`);
  }
  if (settings.show_business_website && businessInfo?.website) {
    contactInfo.push(`Web: ${businessInfo.website}`);
  }

  if (contactInfo.length > 0) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    contactInfo.forEach(info => {
      const textWidth = pdf.getTextWidth(info);
      const x = (pageWidth - textWidth) / 2;
      pdf.text(info, x, currentY);
      currentY += 4;
    });
  }

  currentY += 3;

    // Receipt Title and Number (matching modern template layout)
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('RECEIPT', margin, currentY);

    // Receipt number on the right
    if (settings.enable_receipt_numbering) {
      const receiptNum = settings.receipt_number_format
        .replace('{YEAR}', new Date().getFullYear().toString())
        .replace('{NUMBER}', receiptData.receiptNumber || '0001');
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const receiptText = `#${receiptNum}`;
      const receiptWidth = pdf.getTextWidth(receiptText);
      pdf.text(receiptText, pageWidth - margin - receiptWidth, currentY);
    }

    currentY += 8;

    // Date and Time on the right
    if (settings.show_date_time) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const dateTimeText = `${receiptData.date}\n${receiptData.time}`;
      const lines = pdf.splitTextToSize(dateTimeText, 40);
      const textWidth = pdf.getTextWidth(lines[0]);
      const dateTimeX = pageWidth - margin - textWidth;

      lines.forEach((line: string, index: number) => {
        pdf.text(line, dateTimeX, currentY + (index * 4));
      });
    }

    currentY += 10;

    // Customer Info (in a box like the modern template)
    if (receiptData.customer && (settings.show_customer_name || settings.show_customer_phone)) {
      pdf.setFillColor(248, 248, 248); // Light gray background
      pdf.rect(margin, currentY - 3, contentWidth, 15, 'F');

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Customer Information', margin, currentY);

      currentY += 5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);

      let customerY = currentY;
      if (settings.show_customer_name && receiptData.customer.name) {
        pdf.text(`Name: ${receiptData.customer.name}`, margin, customerY);
        customerY += 4;
      }
      if (settings.show_customer_phone && receiptData.customer.phone) {
        pdf.text(`Phone: ${receiptData.customer.phone}`, margin, customerY);
      }

      currentY += 12;
    }

    currentY += 5;

  // Items Section (matching modern template)
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Items Purchased', margin, currentY);
  currentY += 8;

  // Items Table
  const colWidths = [75, 25, 35, 40]; // Item, Qty, Price, Total
  const colPositions = [margin];

  for (let i = 1; i < colWidths.length; i++) {
    colPositions.push(colPositions[i-1] + colWidths[i-1]);
  }

  // Table header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);

  pdf.text('Item', colPositions[0], currentY);
  pdf.text('Qty', colPositions[1], currentY);
  pdf.text('Price', colPositions[2], currentY);
  pdf.text('Total', colPositions[3], currentY);

  // Header underline
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

  currentY += 8;

  // Items
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  receiptData.items.forEach((item, index) => {
    if (currentY > pageHeight - 40) {
      pdf.addPage();
      currentY = margin;
    }

    const rowHeight = 12;

    // Item name (with variant and SKU if available)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text(item.productName, colPositions[0], currentY);

    let itemY = currentY + 4;
    if (item.variantName) {
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Variant: ${item.variantName}`, colPositions[0], itemY);
      itemY += 3;
    }
    if (item.sku) {
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`SKU: ${item.sku}`, colPositions[0], itemY);
      itemY += 3;
    }

    // Quantity (centered)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    const qtyText = item.quantity.toString();
    const qtyWidth = pdf.getTextWidth(qtyText);
    const qtyX = colPositions[1] + (colWidths[1] - qtyWidth) / 2;
    pdf.text(qtyText, qtyX, currentY);

    // Unit Price (right aligned)
    const unitPrice = format.money(item.unitPrice);
    const priceWidth = pdf.getTextWidth(unitPrice);
    const priceX = colPositions[2] + colWidths[2] - priceWidth;
    pdf.text(unitPrice, priceX, currentY);

    // Total Price (right aligned, bold)
    pdf.setFont('helvetica', 'bold');
    const totalPrice = format.money(item.totalPrice);
    const totalWidth = pdf.getTextWidth(totalPrice);
    const totalX = colPositions[3] + colWidths[3] - totalWidth;
    pdf.text(totalPrice, totalX, currentY);

    // Row separator
    pdf.setLineWidth(0.2);
    pdf.setDrawColor(240, 240, 240);
    pdf.line(margin, currentY + 6, pageWidth - margin, currentY + 6);

    currentY += rowHeight;
  });

  currentY += 5;

  currentY += 3;

  // Totals Section (matching modern template)
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Totals items
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);

  const totalsRightX = pageWidth - margin;

  if (settings.show_subtotal) {
    pdf.text('Subtotal:', margin, currentY);
    const subtotalText = format.money(receiptData.totals.subtotal);
    const subtotalWidth = pdf.getTextWidth(subtotalText);
    pdf.text(subtotalText, totalsRightX - subtotalWidth, currentY);
    currentY += 5;
  }

  if (settings.show_discounts && settings.show_discount_total && receiptData.totals.discount > 0) {
    pdf.setTextColor(34, 197, 94); // Green for discount
    pdf.text('Discount:', margin, currentY);
    const discountText = `-${format.money(receiptData.totals.discount)}`;
    const discountWidth = pdf.getTextWidth(discountText);
    pdf.text(discountText, totalsRightX - discountWidth, currentY);
    currentY += 5;
    pdf.setTextColor(0, 0, 0); // Reset to black
  }

  if (settings.show_tax && receiptData.totals.tax > 0) {
    pdf.text('Tax:', margin, currentY);
    const taxText = format.money(receiptData.totals.tax);
    const taxWidth = pdf.getTextWidth(taxText);
    pdf.text(taxText, totalsRightX - taxWidth, currentY);
    currentY += 5;
  }

  // Total separator
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(0, 0, 0);
  pdf.line(totalsRightX - 50, currentY - 2, totalsRightX, currentY - 2);

  // Grand Total
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('TOTAL:', margin, currentY + 3);
  const totalText = format.money(receiptData.totals.grandTotal);
  const totalWidth = pdf.getTextWidth(totalText);
  pdf.text(totalText, totalsRightX - totalWidth, currentY + 3);

  currentY += 15;

  // Payment info
  if (receiptData.payment) {
    currentY += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Payment Information:', margin, currentY);
    currentY += 5;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Method: ${receiptData.payment.method}`, margin, currentY);
    currentY += 4;

    if (receiptData.payment.amount) {
      pdf.text(`Amount Paid: ${format.money(receiptData.payment.amount)}`, margin, currentY);
      currentY += 4;
    }

    if (receiptData.payment.change && receiptData.payment.change > 0) {
      pdf.text(`Change: ${format.money(receiptData.payment.change)}`, margin, currentY);
      currentY += 4;
    }
  }

  // Professional Footer
  const footerY = pageHeight - 25;
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, footerY - 5, contentWidth, 20, 'F');

  pdf.setLineWidth(0.3);
  pdf.setDrawColor(150, 150, 150);
  pdf.rect(margin, footerY - 5, contentWidth, 20);

  let footerTextY = footerY;

  if (settings.show_footer_message && settings.footer_message) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    const messageWidth = pdf.getTextWidth(settings.footer_message);
    const messageX = (pageWidth - messageWidth) / 2;
    pdf.text(settings.footer_message, messageX, footerTextY);
    footerTextY += 4;
  }

  if (settings.show_return_policy && settings.return_policy_text) {
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(120, 120, 120);
    const policyLines = pdf.splitTextToSize(settings.return_policy_text, contentWidth - 20);
    policyLines.forEach((line: string, index: number) => {
      const textWidth = pdf.getTextWidth(line);
      const x = (pageWidth - textWidth) / 2;
      pdf.text(line, x, footerTextY + (index * 3));
    });
  }

  // Thank you message with better styling
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(50, 50, 150);
  const thankYouText = 'Thank you for your business!';
  const tyWidth = pdf.getTextWidth(thankYouText);
  const tyX = (pageWidth - tyWidth) / 2;
  pdf.text(thankYouText, tyX, footerY + 15);

  console.log('📄 PDF generation completed, creating blob...');
  const blob = pdf.output('blob');
  console.log('📦 PDF blob created, size:', blob.size, 'bytes');
  return blob;
}
