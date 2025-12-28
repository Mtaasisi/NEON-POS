/**
 * POS Receipt Hook - Integrates receipt generation and sharing with POS system
 */

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { ReceiptData } from '../components/ui/PDFReceiptGenerator';

interface POSReceiptOptions {
  autoShareWhatsApp?: boolean;
  customerPhone?: string;
  showReceiptModal?: boolean;
  template?: 'modern' | 'compact' | 'detailed';
}

interface POSReceiptHookReturn {
  generateReceipt: (saleData: any, options?: POSReceiptOptions) => Promise<void>;
  shareReceipt: (receiptData: ReceiptData, phoneNumber: string) => Promise<void>;
  isGenerating: boolean;
  isSharing: boolean;
  lastReceipt: ReceiptData | null;
}

export const usePOSReceipt = (): POSReceiptHookReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);

  // Convert sale data to receipt data format
  const convertSaleToReceipt = useCallback((saleData: any): ReceiptData => {
    return {
      id: saleData.id,
      receiptNumber: saleData.receiptNumber || `RCP-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      items: saleData.items?.map((item: any) => ({
        productName: item.productName || item.name,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice || item.price,
        totalPrice: item.totalPrice || (item.quantity * (item.unitPrice || item.price)),
        sku: item.sku,
        category: item.category,
        image: item.image
      })) || [],
      customer: saleData.customer ? {
        name: saleData.customer.name,
        phone: saleData.customer.phone,
        email: saleData.customer.email
      } : undefined,
      seller: saleData.seller || saleData.cashier ? {
        name: saleData.seller?.name || saleData.cashier?.name,
        phone: saleData.seller?.phone || saleData.cashier?.phone
      } : undefined,
      totals: {
        subtotal: saleData.subtotal || 0,
        discount: saleData.discount || 0,
        tax: saleData.tax || 0,
        grandTotal: saleData.total || saleData.grandTotal || 0
      },
      payment: {
        method: saleData.paymentMethod || 'Cash',
        amount: saleData.amountPaid || saleData.total || 0,
        change: saleData.change || 0,
        reference: saleData.paymentReference
      }
    };
  }, []);

  // Generate receipt from sale data
  const generateReceipt = useCallback(async (
    saleData: any,
    options: POSReceiptOptions = {}
  ): Promise<void> => {
    setIsGenerating(true);

    try {
      const receiptData = convertSaleToReceipt(saleData);
      setLastReceipt(receiptData);

      // Auto-share via WhatsApp if enabled and phone number available
      if (options.autoShareWhatsApp && (options.customerPhone || receiptData.customer?.phone)) {
        await shareReceipt(receiptData, options.customerPhone || receiptData.customer!.phone);
      }

      // Show success message
      toast.success('Receipt generated successfully!');

    } catch (error) {
      console.error('Receipt generation failed:', error);
      toast.error('Failed to generate receipt');
    } finally {
      setIsGenerating(false);
    }
  }, [convertSaleToReceipt]);

  // Share receipt via WhatsApp
  const shareReceipt = useCallback(async (
    receiptData: ReceiptData,
    phoneNumber: string
  ): Promise<void> => {
    setIsSharing(true);

    try {
      // Import WhatsApp service dynamically to avoid circular dependencies
      const whatsappService = (await import('../services/whatsappService')).default;

      // Create PDF blob (simplified version for direct sharing)
      const pdfBlob = await createSimplePDF(receiptData);

      // Prepare form data for WhatsApp
      const formData = new FormData();
      formData.append('file', pdfBlob, `receipt-${receiptData.receiptNumber}.pdf`);
      formData.append('caption', generateWhatsAppCaption(receiptData));

      // Send via WhatsApp
      await whatsappService.sendDocument(phoneNumber, formData);

      toast.success('Receipt shared via WhatsApp!');

    } catch (error) {
      console.error('WhatsApp sharing failed:', error);
      toast.error('Failed to share receipt via WhatsApp');
      throw error;
    } finally {
      setIsSharing(false);
    }
  }, []);

  return {
    generateReceipt,
    shareReceipt,
    isGenerating,
    isSharing,
    lastReceipt
  };
};

// Helper function to create a simple PDF for WhatsApp sharing
const createSimplePDF = async (receiptData: ReceiptData): Promise<Blob> => {
  const html2canvas = (await import('html2canvas')).default;
  const jsPDF = (await import('jspdf')).default;

  // Create a temporary element with the receipt content
  const tempElement = document.createElement('div');
  tempElement.style.position = 'absolute';
  tempElement.style.left = '-9999px';
  tempElement.style.top = '-9999px';
  tempElement.style.width = '400px';
  tempElement.style.backgroundColor = 'white';
  tempElement.style.padding = '20px';
  tempElement.style.fontFamily = 'Arial, sans-serif';

  tempElement.innerHTML = `
    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
      <h1 style="font-size: 24px; font-weight: bold; margin: 0;">RECEIPT</h1>
      <p style="margin: 5px 0; color: #666;">#${receiptData.receiptNumber}</p>
      <p style="margin: 5px 0; font-size: 12px; color: #666;">${receiptData.date} ${receiptData.time}</p>
    </div>

    <div style="margin-bottom: 20px;">
      ${receiptData.customer ? `
        <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
          <strong>Customer:</strong> ${receiptData.customer.name}<br>
          ${receiptData.customer.phone ? `<strong>Phone:</strong> ${receiptData.customer.phone}` : ''}
        </div>
      ` : ''}
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="border-bottom: 1px solid #ddd;">
          <th style="text-align: left; padding: 8px; font-weight: bold;">Item</th>
          <th style="text-align: center; padding: 8px; font-weight: bold;">Qty</th>
          <th style="text-align: right; padding: 8px; font-weight: bold;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${receiptData.items.map(item => `
          <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 8px;">
              <div style="font-weight: bold;">${item.productName}</div>
              ${item.variantName ? `<div style="font-size: 12px; color: #666;">Variant: ${item.variantName}</div>` : ''}
            </td>
            <td style="text-align: center; padding: 8px;">${item.quantity}</td>
            <td style="text-align: right; padding: 8px; font-weight: bold;">${item.totalPrice.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="border-top: 2px solid #000; padding-top: 10px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span>Subtotal:</span>
        <span>${receiptData.totals.subtotal.toLocaleString()}</span>
      </div>
      ${receiptData.totals.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #22c55e;">
          <span>Discount:</span>
          <span>-${receiptData.totals.discount.toLocaleString()}</span>
        </div>
      ` : ''}
      ${receiptData.totals.tax > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Tax:</span>
          <span>${receiptData.totals.tax.toLocaleString()}</span>
        </div>
      ` : ''}
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 1px solid #ddd; padding-top: 10px;">
        <span>TOTAL:</span>
        <span>${receiptData.totals.grandTotal.toLocaleString()}</span>
      </div>
    </div>

    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
      <div>Thank you for your business!</div>
      ${receiptData.seller ? `<div>Served by: ${receiptData.seller.name}</div>` : ''}
    </div>
  `;

  document.body.appendChild(tempElement);

  try {
    const canvas = await html2canvas(tempElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 400,
      height: tempElement.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    return pdf.output('blob');

  } finally {
    document.body.removeChild(tempElement);
  }
};

// Generate WhatsApp caption
const generateWhatsAppCaption = (receiptData: ReceiptData): string => {
  const lines = [
    `🧾 *Receipt ${receiptData.receiptNumber}*`,
    `💰 *Amount:* TZS ${receiptData.totals.grandTotal.toLocaleString()}`,
    ''
  ];

  if (receiptData.customer) {
    lines.push(`👤 *Customer:* ${receiptData.customer.name}`);
  }

  if (receiptData.items.length > 0) {
    lines.push('');
    lines.push('📦 *Items:*');
    receiptData.items.slice(0, 3).forEach(item => {
      lines.push(`• ${item.productName} x${item.quantity} - ${item.totalPrice.toLocaleString()}`);
    });
    if (receiptData.items.length > 3) {
      lines.push(`• ... and ${receiptData.items.length - 3} more items`);
    }
  }

  lines.push('');
  lines.push('✅ *Payment:* ' + receiptData.payment.method);

  if (receiptData.payment.change && receiptData.payment.change > 0) {
    lines.push(`💵 *Change:* TZS ${receiptData.payment.change.toLocaleString()}`);
  }

  lines.push('');
  lines.push('Thank you for your business! 🙏');

  return lines.join('\n');
};

export default usePOSReceipt;
