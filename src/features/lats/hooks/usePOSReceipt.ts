import { useState, useCallback, useMemo, useEffect } from 'react';
import { businessInfoService } from '../../../lib/businessInfoService';
import jsPDF from 'jspdf';

interface ReceiptItem {
  id: string;
  name: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  selectedSerialNumbers?: Array<{ 
    id?: string; 
    serial_number?: string; 
    imei?: string; 
    mac_address?: string;
  }>;
  attributes?: Record<string, any>;
}

interface Receipt {
  id: string;
  receiptNumber: string;
  date: Date;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
  };
  paymentMethod: string;
  cashierName: string;
  transactionId?: string;
}

interface ReceiptTemplate {
  header: string;
  footer: string;
  showLogo: boolean;
  showTax: boolean;
  showCustomerInfo: boolean;
  fontSize: 'small' | 'medium' | 'large';
  paperSize: 'thermal' | 'a4' | 'email';
}

export const usePOSReceipt = () => {
  const [receiptHistory, setReceiptHistory] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptHistory, setShowReceiptHistory] = useState(false);
  const [receiptPrintMode, setReceiptPrintMode] = useState<'thermal' | 'a4' | 'email'>('thermal');
  
  const [receiptTemplate, setReceiptTemplate] = useState<ReceiptTemplate>({
    header: 'LATS CHANCE STORE',
    footer: 'Thank you for your purchase!',
    showLogo: true,
    showTax: true,
    showCustomerInfo: true,
    fontSize: 'medium',
    paperSize: 'thermal'
  });

  // Load business info and update header
  useEffect(() => {
    const loadBusinessInfo = async () => {
      try {
        const businessInfo = await businessInfoService.getBusinessInfo();
        if (businessInfo.name) {
          setReceiptTemplate(prev => ({
            ...prev,
            header: businessInfo.name.toUpperCase()
          }));
        }
      } catch (error) {
        console.warn('⚠️ Could not load business info for receipt header');
      }
    };
    loadBusinessInfo();
  }, []);

  // Generate receipt number
  const generateReceiptNumber = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `RCP-${timestamp}-${random}`;
  }, []);

  // Create receipt from cart data
  const createReceipt = useCallback((
    items: ReceiptItem[],
    totals: { subtotal: number; tax: number; discount: number; total: number },
    paymentMethod: string,
    cashierName: string,
    customer?: { name: string; phone?: string; email?: string },
    transactionId?: string
  ): Receipt => {
    const receipt: Receipt = {
      id: `receipt-${Date.now()}`,
      receiptNumber: generateReceiptNumber(),
      date: new Date(),
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
      customer,
      paymentMethod,
      cashierName,
      transactionId
    };

    // Add to history
    setReceiptHistory(prev => [receipt, ...prev.slice(0, 99)]); // Keep last 100 receipts

    return receipt;
  }, [generateReceiptNumber]);

  // Generate receipt content for printing
  const generateReceiptContent = useCallback((receipt: Receipt): string => {
    const formatMoney = (amount: number) => {
      return amount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    };

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    let content = '';

    // Header
    content += `${receiptTemplate.header}\n`;
    content += '='.repeat(receiptTemplate.header.length) + '\n\n';

    // Receipt info
    content += `Receipt: ${receipt.receiptNumber}\n`;
    content += `Date: ${formatDate(receipt.date)}\n`;
    content += `Cashier: ${receipt.cashierName}\n`;
    if (receipt.transactionId) {
      content += `TXN: ${receipt.transactionId}\n`;
    }
    content += '\n';

    // Customer info
    if (receipt.customer && receiptTemplate.showCustomerInfo) {
      content += `Customer: ${receipt.customer.name}\n`;
      if (receipt.customer.phone) {
        content += `Phone: ${receipt.customer.phone}\n`;
      }
      if (receipt.customer.email) {
        content += `Email: ${receipt.customer.email}\n`;
      }
      content += '\n';
    }

    // Items
    content += 'ITEMS:\n';
    content += '-'.repeat(40) + '\n';
    
    receipt.items.forEach(item => {
      const itemName = item.variantName ? `${item.name} (${item.variantName})` : item.name;
      content += `${item.quantity}x ${itemName}\n`;
      content += `  ${formatMoney(item.unitPrice)} each\n`;
      content += `  ${formatMoney(item.totalPrice)}\n\n`;
    });

    // Totals
    content += '-'.repeat(40) + '\n';
    content += `Subtotal: ${formatMoney(receipt.subtotal)}\n`;
    
    if (receiptTemplate.showTax && receipt.tax > 0) {
      content += `Tax (18%): ${formatMoney(receipt.tax)}\n`;
    }
    
    if (receipt.discount > 0) {
      content += `Discount: -${formatMoney(receipt.discount)}\n`;
    }
    
    content += `TOTAL: ${formatMoney(receipt.total)}\n`;
    content += '\n';

    // Payment method
    content += `Payment: ${receipt.paymentMethod}\n\n`;

    // Footer
    content += receiptTemplate.footer + '\n';

    return content;
  }, [receiptTemplate]);

  // Print receipt
  const printReceipt = useCallback(async (receipt: Receipt) => {
    const content = generateReceiptContent(receipt);
    
    switch (receiptPrintMode) {
      case 'thermal':
        // Simulate thermal printer
        console.log('Printing to thermal printer:', content);
        break;
      
      case 'a4':
        // Generate PDF for A4 printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Receipt ${receipt.receiptNumber}</title>
                <style>
                  body { font-family: monospace; font-size: 12px; line-height: 1.4; }
                  .receipt { max-width: 80mm; margin: 0 auto; }
                </style>
              </head>
              <body>
                <div class="receipt">
                  <pre>${content}</pre>
                </div>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
        break;
      
      case 'email':
        // Generate email content
        const emailSubject = `Receipt ${receipt.receiptNumber} - LATS CHANCE STORE`;
        const emailBody = `Please find your receipt attached.\n\n${content}`;
        
        const mailtoLink = `mailto:${receipt.customer?.email || ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.open(mailtoLink);
        break;
    }
  }, [generateReceiptContent, receiptPrintMode]);

  // Export receipt as PDF
  const exportReceiptPDF = useCallback(async (receipt: Receipt) => {
    try {
      // Get business info
      const businessInfo = await businessInfoService.getBusinessInfo();
      
      // Generate PDF with modern design
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredHeight: number) => {
        if (yPos + requiredHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
      };

      // Helper to draw a box/rectangle
      const drawBox = (x: number, y: number, width: number, height: number, fill: boolean = false, borderColor?: number[]) => {
        if (fill) {
          doc.setFillColor(249, 250, 251); // Light gray background
          doc.rect(x, y, width, height, 'F');
        }
        if (borderColor) {
          doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        } else {
          doc.setDrawColor(229, 231, 235); // Gray border
        }
        doc.setLineWidth(0.5);
        doc.rect(x, y, width, height);
      };

      // Header Section with Professional Design (like SetPricingModal)
      const headerHeight = 55;
      // Header background with green accent
      doc.setFillColor(16, 185, 129); // Green-500
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      // Main header box
      drawBox(margin, yPos + 8, contentWidth, headerHeight - 8, true, [255, 255, 255]);
      
      // Try to add logo if available
      if (businessInfo.logo) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise<void>((resolve) => {
            img.onload = () => {
              try {
                const logoWidth = 40;
                const logoHeight = (img.height / img.width) * logoWidth;
                const logoX = margin + 12;
                const logoY = yPos + 8 + (headerHeight - 8 - logoHeight) / 2;
                doc.addImage(businessInfo.logo!, 'PNG', logoX, logoY, logoWidth, logoHeight);
              } catch (error) {
                // Continue without logo
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = businessInfo.logo!;
          });
        } catch (error) {
          // Continue without logo
        }
      }

      // Business Name (centered or next to logo) - Larger, bolder
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39); // Gray-900
      const businessNameX = businessInfo.logo ? margin + 60 : pageWidth / 2;
      const businessNameY = yPos + 8 + 18;
      const businessNameWidth = doc.getTextWidth(businessInfo.name);
      const businessNameXPos = businessInfo.logo ? businessNameX : businessNameX - businessNameWidth / 2;
      doc.text(businessInfo.name, businessNameXPos, businessNameY);

      // Business Info (below name) - Smaller, gray
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128); // Gray-500
      let infoY = businessNameY + 8;
      if (businessInfo.address) {
        const addressWidth = doc.getTextWidth(businessInfo.address);
        const addressX = businessInfo.logo ? businessNameX : pageWidth / 2 - addressWidth / 2;
        doc.text(businessInfo.address, addressX, infoY);
        infoY += 5;
      }
      if (businessInfo.phone) {
        const phones = businessInfo.phone.split(',').map(p => p.trim()).filter(p => p.length > 0);
        phones.forEach((phone, index) => {
          const phoneWidth = doc.getTextWidth(phone);
          const phoneX = businessInfo.logo ? businessNameX : pageWidth / 2 - phoneWidth / 2;
          doc.text(phone, phoneX, infoY);
          if (index < phones.length - 1) {
            infoY += 5; // Add spacing between multiple phones
          }
        });
      }

      // Reset text color
      doc.setTextColor(0, 0, 0);
      yPos += headerHeight + 12;

      // Receipt Info Section (Two Column Layout) - Professional Card Design
      const receiptInfoHeight = receipt.customer && receiptTemplate.showCustomerInfo ? 50 : 35;
      drawBox(margin, yPos, contentWidth, receiptInfoHeight, true, [229, 231, 235]);
      
      // Section divider line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(1);
      doc.line(pageWidth / 2, yPos + 5, pageWidth / 2, yPos + receiptInfoHeight - 5);
      
      const leftColX = margin + 10;
      const rightColX = pageWidth / 2 + 10;
      let leftY = yPos + 10;
      let rightY = yPos + 10;

      // Left Column - Receipt Details with green accent
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94); // Green-500
      doc.text('RECEIPT DETAILS', leftColX, leftY);
      leftY += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(17, 24, 39); // Gray-900
      doc.text(`Receipt #: ${receipt.receiptNumber}`, leftColX, leftY);
      leftY += 6;
      
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };
      doc.text(`Date: ${formatDate(receipt.date)}`, leftColX, leftY);
      leftY += 6;
      doc.text(`Cashier: ${receipt.cashierName}`, leftColX, leftY);
      if (receipt.transactionId) {
        leftY += 6;
        doc.text(`TXN: ${receipt.transactionId}`, leftColX, leftY);
      }

      // Right Column - Customer Info
      if (receipt.customer && receiptTemplate.showCustomerInfo) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94); // Green-500
        doc.text('CUSTOMER', rightColX, rightY);
        rightY += 8;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(17, 24, 39); // Gray-900
        doc.text(receipt.customer.name, rightColX, rightY);
        rightY += 6;
        if (receipt.customer.phone) {
          doc.text(receipt.customer.phone, rightColX, rightY);
          rightY += 6;
        }
        if (receipt.customer.email) {
          doc.text(receipt.customer.email, rightColX, rightY);
        }
      }

      // Reset text color
      doc.setTextColor(0, 0, 0);
      yPos += receiptInfoHeight + 12;
      checkPageBreak(35);

      // Items Section Header - Professional Style
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39); // Gray-900
      doc.text('ITEMS PURCHASED', margin, yPos);
      yPos += 10;
      
      // Draw professional line under header
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(1);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Items with Professional Card Design (like SetPricingModal)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      receipt.items.forEach(item => {
        // Calculate dynamic height based on content
        let estimatedHeight = 25; // Base height
        if (item.sku) estimatedHeight += 5;
        if (item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0) {
          estimatedHeight += item.selectedSerialNumbers.length * 5;
        }
        if (item.attributes && Object.keys(item.attributes).length > 0) {
          const excludedFields = [
            'id', 'created_at', 'updated_at', 'added_at', 
            'variant_id', 'product_id', 'imei', 'serial_number',
            'is_legacy', 'is_imei_child', 'notes', 
            'parent_variant_name', 'data_source', 'created_without_po'
          ];
          const attrCount = Object.keys(item.attributes).filter(key => 
            !excludedFields.includes(key)
          ).length;
          estimatedHeight += attrCount * 4;
        }
        estimatedHeight = Math.max(estimatedHeight, 50); // Minimum height
        
        checkPageBreak(estimatedHeight + 5);
        
        // Item Card with green border (like SetPricingModal's completed items)
        const cardBorderColor = [34, 197, 94]; // Green-500
        drawBox(margin, yPos, contentWidth, estimatedHeight, true, cardBorderColor);
        
        const itemMargin = margin + 10;
        let itemY = yPos + 10;
        
        // Product Name with Variant (Top Left) - Bold, larger
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39); // Gray-900
        const productName = item.variantName && item.variantName !== 'Default' 
          ? `${item.name} - ${item.variantName}`
          : item.name;
        const itemText = `${item.quantity}x ${productName}`;
        const itemLines = doc.splitTextToSize(itemText, contentWidth - 120);
        doc.text(itemLines, itemMargin, itemY);
        itemY += itemLines.length * 6 + 3;
        
        // Price Badge (Top Right) - Green background like SetPricingModal
        doc.setFillColor(34, 197, 94); // Green-500
        const priceText = `${item.totalPrice.toLocaleString()}`;
        const priceWidth = doc.getTextWidth(priceText) + 8;
        const priceX = pageWidth - margin - 10 - priceWidth;
        doc.rect(priceX, yPos + 8, priceWidth, 12, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255); // White text
        doc.text(priceText, priceX + 4, yPos + 16);
        doc.setTextColor(0, 0, 0); // Reset
        
        // Specifications Section (Indented) - Smaller, gray text
        const specX = itemMargin + 5;
        let specY = itemY;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128); // Gray-500
        
        // SKU with icon-like styling
        if (item.sku) {
          doc.setFont('helvetica', 'italic');
          doc.text(`SKU: ${item.sku}`, specX, specY);
          specY += 5;
        }
        
        // Serial Numbers/IMEI - Monospace-like styling
        if (item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0) {
          item.selectedSerialNumbers.forEach((serial) => {
            const serialInfo: string[] = [];
            if (serial.serial_number) serialInfo.push(`S/N: ${serial.serial_number}`);
            if (serial.imei) serialInfo.push(`IMEI: ${serial.imei}`);
            if (serial.mac_address) serialInfo.push(`MAC: ${serial.mac_address}`);
            if (serialInfo.length > 0) {
              doc.setFont('helvetica', 'normal');
              doc.text(serialInfo.join(' | '), specX, specY);
              specY += 5;
            }
          });
        }
        
        // Attributes (specifications) - Clean formatting
        if (item.attributes && Object.keys(item.attributes).length > 0) {
          const excludedFields = [
            'id', 'created_at', 'updated_at', 'added_at', 
            'variant_id', 'product_id', 'imei', 'serial_number',
            'is_legacy', 'is_imei_child', 'notes', 
            'parent_variant_name', 'data_source', 'created_without_po'
          ];
          Object.entries(item.attributes).forEach(([key, value]) => {
            if (!excludedFields.includes(key) && value) {
              const keyLabel = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              doc.text(`${keyLabel}: ${value}`, specX, specY);
              specY += 4;
            }
          });
        }
        
        // Unit Price (Bottom) - Smaller, gray
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128); // Gray-500
        const unitPriceText = `${item.unitPrice.toLocaleString()} each`;
        doc.text(unitPriceText, itemMargin, yPos + estimatedHeight - 6);
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
        yPos += estimatedHeight + 6;
      });

      yPos += 10;
      checkPageBreak(40);

      // Totals Section with Box
      const totalsBoxHeight = 50;
      drawBox(margin, yPos, contentWidth, totalsBoxHeight, true);
      
      const totalsY = yPos + 10;
      let totalsLineY = totalsY;
      
      const formatMoney = (amount: number) => {
        return amount.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
      };

      // Subtotal
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', margin + 8, totalsLineY);
      doc.text(`${formatMoney(receipt.subtotal)}`, pageWidth - margin - 8 - doc.getTextWidth(`${formatMoney(receipt.subtotal)}`), totalsLineY);
      totalsLineY += 7;
      
      if (receiptTemplate.showTax && receipt.tax > 0) {
        doc.text('Tax (18%):', margin + 8, totalsLineY);
        doc.text(`${formatMoney(receipt.tax)}`, pageWidth - margin - 8 - doc.getTextWidth(`${formatMoney(receipt.tax)}`), totalsLineY);
        totalsLineY += 7;
      }
      
      if (receipt.discount > 0) {
        doc.text('Discount:', margin + 8, totalsLineY);
        doc.text(`-${formatMoney(receipt.discount)}`, pageWidth - margin - 8 - doc.getTextWidth(`-${formatMoney(receipt.discount)}`), totalsLineY);
        totalsLineY += 7;
      }
      
      // Total (Prominent - Large and Bold)
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const totalText = `TOTAL: ${formatMoney(receipt.total)}`;
      const totalWidth = doc.getTextWidth(totalText);
      doc.text(totalText, pageWidth - margin - 8 - totalWidth, totalsLineY);
      
      yPos += totalsBoxHeight + 10;

      // Payment method
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Payment Method: ${receipt.paymentMethod}`, margin, yPos);
      yPos += 10;

      // Footer Section
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      const footerText = receiptTemplate.footer;
      const footerWidth = doc.getTextWidth(footerText);
      doc.text(footerText, pageWidth / 2 - footerWidth / 2, yPos);
      
      yPos += 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const returnPolicy = 'Please keep this receipt for your records';
      const returnPolicyWidth = doc.getTextWidth(returnPolicy);
      doc.text(returnPolicy, pageWidth / 2 - returnPolicyWidth / 2, yPos);

      // Save PDF
      doc.save(`receipt-${receipt.receiptNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }, [receiptTemplate]);

  // Search receipts
  const searchReceipts = useCallback((query: string) => {
    if (!query.trim()) return receiptHistory;
    
    const searchTerm = query.toLowerCase();
    return receiptHistory.filter(receipt => 
      receipt.receiptNumber.toLowerCase().includes(searchTerm) ||
      receipt.customer?.name.toLowerCase().includes(searchTerm) ||
      receipt.customer?.phone?.includes(searchTerm) ||
      receipt.paymentMethod.toLowerCase().includes(searchTerm)
    );
  }, [receiptHistory]);

  // Get receipt statistics
  const getReceiptStats = useMemo(() => {
    const totalReceipts = receiptHistory.length;
    const totalSales = receiptHistory.reduce((sum, receipt) => sum + receipt.total, 0);
    const averageSale = totalReceipts > 0 ? totalSales / totalReceipts : 0;
    
    const today = new Date().toDateString();
    const todayReceipts = receiptHistory.filter(receipt => 
      receipt.date.toDateString() === today
    );
    const todaySales = todayReceipts.reduce((sum, receipt) => sum + receipt.total, 0);

    return {
      totalReceipts,
      totalSales,
      averageSale,
      todayReceipts: todayReceipts.length,
      todaySales
    };
  }, [receiptHistory]);

  return {
    // State
    receiptHistory,
    selectedReceipt,
    showReceiptHistory,
    receiptPrintMode,
    receiptTemplate,
    
    // Actions
    setSelectedReceipt,
    setShowReceiptHistory,
    setReceiptPrintMode,
    setReceiptTemplate,
    createReceipt,
    printReceipt,
    exportReceiptPDF,
    searchReceipts,
    
    // Computed
    getReceiptStats
  };
};
