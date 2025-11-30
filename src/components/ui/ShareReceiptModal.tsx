/**
 * Share Receipt Modal
 * Beautiful modal for sharing receipts via WhatsApp, SMS, Email, etc.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, Mail, Send, Copy, Download, Share2, Loader2, Printer } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { smsService } from '../../services/smsService';
import SuccessModal from './SuccessModal';
import { useSuccessModal } from '../../hooks/useSuccessModal';
import { SuccessIcons } from './SuccessModalIcons';
import { useBusinessInfo } from '../../hooks/useBusinessInfo';
import jsPDF from 'jspdf';

interface ShareReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrintReceipt?: () => void;
  receiptData: {
    id?: string; // Sale ID for tracking
    receiptNumber: string;
    amount: number;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    items?: Array<{ 
      productName: string; 
      variantName?: string;
      quantity: number; 
      unitPrice: number;
      totalPrice: number;
      image?: string;
      selectedSerialNumbers?: Array<{ 
        id?: string; 
        serial_number?: string; 
        imei?: string; 
        mac_address?: string;
      }>;
      attributes?: Record<string, any>;
    }>;
  };
}

type PageSize = 'a4' | 'letter' | 'a5' | 'legal';

interface LayoutConfig {
  pageSize: PageSize;
  orientation: 'portrait' | 'landscape';
  margin: number;
  fontSize: {
    header: number;
    title: number;
    body: number;
    small: number;
  };
  spacing: {
    section: number;
    item: number;
    line: number;
  };
  logoSize: number;
  imageSize: number;
}

const ShareReceiptModal: React.FC<ShareReceiptModalProps> = ({
  isOpen,
  onClose,
  onPrintReceipt,
  receiptData,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [sendingMethod, setSendingMethod] = useState<string>('');
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const successModal = useSuccessModal();
  const { businessInfo } = useBusinessInfo();

  if (!isOpen) return null;

  // Get layout configuration based on page size and orientation
  const getLayoutConfig = (size: PageSize, orient: 'portrait' | 'landscape' = 'portrait'): LayoutConfig => {
    // For landscape, adjust margins and spacing
    const isLandscape = orient === 'landscape';
    
    const configs: Record<PageSize, LayoutConfig> = {
      a4: {
        pageSize: 'a4',
        orientation: orient,
        margin: isLandscape ? 10 : 8,
        fontSize: {
          header: isLandscape ? 12 : 10,
          title: isLandscape ? 9 : 8,
          body: isLandscape ? 7 : 6,
          small: isLandscape ? 5 : 4,
        },
        spacing: {
          section: isLandscape ? 4 : 3,
          item: isLandscape ? 3 : 2.5,
          line: isLandscape ? 3.5 : 3,
        },
        logoSize: isLandscape ? 35 : 30,
        imageSize: isLandscape ? 24 : 20,
      },
      letter: {
        pageSize: 'letter',
        orientation: 'portrait',
        margin: 8,
        fontSize: {
          header: 10,
          title: 8,
          body: 6,
          small: 4,
        },
        spacing: {
          section: 3,
          item: 2.5,
          line: 3,
        },
        logoSize: 15,
        imageSize: 20,
      },
      a5: {
        pageSize: 'a5',
        orientation: 'portrait',
        margin: 6,
        fontSize: {
          header: 8,
          title: 7,
          body: 5,
          small: 3.5,
        },
        spacing: {
          section: 2,
          item: 2,
          line: 2.5,
        },
        logoSize: 12,
        imageSize: 16,
      },
      legal: {
        pageSize: 'legal',
        orientation: 'portrait',
        margin: 10,
        fontSize: {
          header: 12,
          title: 9,
          body: 7,
          small: 5,
        },
        spacing: {
          section: 4,
          item: 3,
          line: 3.5,
        },
        logoSize: 18,
        imageSize: 24,
      },
    };
    return configs[size];
  };

  // Format money helper
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const generateReceiptText = () => {
    const lines = [
      // Business Name Header
      '═'.repeat(40),
      businessInfo.name.toUpperCase(),
      '═'.repeat(40),
      '',
    ];

    // Greeting with customer name
    if (receiptData.customerName) {
      lines.push(`Hello, ${receiptData.customerName}!`);
    } else {
      lines.push('Hello, valued customer!');
    }
    lines.push('');

    lines.push('🧾 RECEIPT #' + receiptData.receiptNumber);
    lines.push('📅 ' + new Date().toLocaleDateString() + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    lines.push('');

    if (receiptData.items && receiptData.items.length > 0) {
      lines.push('📦 Items: ' + receiptData.items.length);
      receiptData.items.forEach((item, index) => {
        const productName = item.variantName && item.variantName !== 'Default' 
          ? `${item.productName} - ${item.variantName}`
          : item.productName;
        const itemLine = `${index + 1}. ${productName}${item.quantity > 1 ? ' x' + item.quantity : ''} - ${item.totalPrice.toLocaleString()} TZS`;
        lines.push(itemLine);
        
        // Add Serial Numbers/IMEI
        if (item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0) {
          item.selectedSerialNumbers.forEach((serial: any) => {
            const serialInfo: string[] = [];
            if (serial.serial_number) serialInfo.push(`S/N: ${serial.serial_number}`);
            if (serial.imei) serialInfo.push(`IMEI: ${serial.imei}`);
            if (serial.mac_address) serialInfo.push(`MAC: ${serial.mac_address}`);
            if (serialInfo.length > 0) {
              lines.push(`   ${serialInfo.join(' | ')}`);
            }
          });
        }
        
        // Add Attributes
        if (item.attributes && Object.keys(item.attributes).length > 0) {
          Object.entries(item.attributes).forEach(([key, value]) => {
            if (!['id', 'created_at', 'updated_at', 'variant_id', 'product_id'].includes(key) && value) {
              const keyLabel = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              lines.push(`   ${keyLabel}: ${value}`);
            }
          });
        }
      });
    }

    lines.push('');
    lines.push('💰 TOTAL: ' + receiptData.amount.toLocaleString() + ' TZS');
    lines.push('');
    lines.push('✨ Thank you for shopping with us!');

    return lines.join('\n');
  };

  const generateReceiptHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt #${receiptData.receiptNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 400px; margin: 20px auto; padding: 20px; }
    .business-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
    .business-logo { max-height: 60px; margin-bottom: 10px; }
    .business-name { font-size: 1.5em; font-weight: bold; color: #333; margin: 10px 0; }
    .business-info { font-size: 0.9em; color: #666; }
    h1 { text-align: center; color: #333; }
    .receipt-info { margin: 20px 0; }
    .items { margin: 20px 0; border-top: 2px dashed #ccc; border-bottom: 2px dashed #ccc; padding: 10px 0; }
    .item { margin: 5px 0; }
    .total { font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="business-header">
    ${businessInfo.logo ? `<img src="${businessInfo.logo}" alt="${businessInfo.name}" class="business-logo" />` : ''}
    <div class="business-name">${businessInfo.name}</div>
    ${businessInfo.address ? `<div class="business-info">${businessInfo.address}</div>` : ''}
    ${businessInfo.phone ? businessInfo.phone.split(',').map((p: string) => `<div class="business-info">${p.trim()}</div>`).join('') : ''}
  </div>
  ${receiptData.customerName ? `<div style="text-align: center; margin: 15px 0; font-size: 1.1em; color: #333;">Hello, ${receiptData.customerName}!</div>` : '<div style="text-align: center; margin: 15px 0; font-size: 1.1em; color: #333;">Hello, valued customer!</div>'}
  <h1>RECEIPT</h1>
  <div class="receipt-info">
    <div>Receipt #: ${receiptData.receiptNumber}</div>
    <div>Date: ${new Date().toLocaleDateString()}</div>
    <div>Time: ${new Date().toLocaleTimeString()}</div>
    ${receiptData.customerName ? `<div>Customer: ${receiptData.customerName}</div>` : ''}
  </div>
  <div class="items">
    <h3>Items:</h3>
    ${receiptData.items?.map(item => {
      const productName = item.variantName && item.variantName !== 'Default' 
        ? `${item.productName} - ${item.variantName}`
        : item.productName;
      let itemHtml = `
      <div class="item">
        <div style="font-weight: bold;">${productName} (x${item.quantity}) - ${item.totalPrice.toLocaleString()} TZS</div>`;
      
      
      if (item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0) {
        item.selectedSerialNumbers.forEach((serial: any) => {
          const serialInfo: string[] = [];
          if (serial.serial_number) serialInfo.push(`S/N: ${serial.serial_number}`);
          if (serial.imei) serialInfo.push(`IMEI: ${serial.imei}`);
          if (serial.mac_address) serialInfo.push(`MAC: ${serial.mac_address}`);
          if (serialInfo.length > 0) {
            itemHtml += `<div style="font-size: 0.85em; color: #666; margin-top: 2px; font-family: monospace;">${serialInfo.join(' | ')}</div>`;
          }
        });
      }
      
      if (item.attributes && Object.keys(item.attributes).length > 0) {
        Object.entries(item.attributes).forEach(([key, value]) => {
          if (!['id', 'created_at', 'updated_at', 'variant_id', 'product_id'].includes(key) && value) {
            const keyLabel = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            itemHtml += `<div style="font-size: 0.9em; color: #666; margin-top: 2px;">${keyLabel}: ${value}</div>`;
          }
        });
      }
      
      itemHtml += `</div>`;
      return itemHtml;
    }).join('') || ''}
  </div>
  <div class="total">TOTAL: ${receiptData.amount.toLocaleString()} TZS</div>
  <p style="text-align: center; margin-top: 20px; color: #666;">Thank you for your business!</p>
</body>
</html>
    `;
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      onClick: () => {
        const text = generateReceiptText();
        const phone = receiptData.customerPhone || '';
        const whatsappUrl = phone
          ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`
          : `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
      },
    },
    {
      name: 'SMS',
      icon: Send,
      color: '#0088cc',
      onClick: async () => {
        const text = generateReceiptText();
        const phone = receiptData.customerPhone;
        
        if (!phone) {
          toast.error('No customer phone number available');
          return;
        }

        // Clean phone number (remove spaces, dashes, etc.)
        const cleanPhone = phone.replace(/[^0-9+]/g, '');
        
        setIsSending(true);
        setSendingMethod('SMS');
        
        try {
          console.log('📱 Sending receipt via SMS to:', cleanPhone);
          
          // Use in-app SMS service
          const result = await smsService.sendSMS(cleanPhone, text);
          
          if (result.success) {
            // Show success modal
            successModal.show(
              `Receipt sent successfully to ${phone}!`,
              {
                title: 'SMS Sent! ✅',
                icon: SuccessIcons.messageSent,
                autoCloseDelay: 3000,
              }
            );
            
            // Close share modal after short delay
            setTimeout(() => {
              onClose();
            }, 500);
          } else {
            toast.error(result.error || 'Failed to send SMS');
          }
        } catch (error) {
          console.error('Error sending SMS:', error);
          toast.error('Failed to send SMS. Please try again.');
        } finally {
          setIsSending(false);
          setSendingMethod('');
        }
      },
    },
    {
      name: 'Email',
      icon: Mail,
      color: '#EA4335',
      onClick: () => {
        const subject = `Receipt #${receiptData.receiptNumber}`;
        const body = generateReceiptText();
        const email = receiptData.customerEmail || '';
        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;
      },
    },
    {
      name: 'Print',
      icon: Printer,
      color: '#F59E0B',
      onClick: () => {
        if (onPrintReceipt) {
          onPrintReceipt();
          setTimeout(() => onClose(), 300);
        } else {
          toast.error('Print function not available');
        }
      },
    },
    {
      name: 'Download',
      icon: Download,
      color: '#8B5CF6',
      onClick: async () => {
        try {
          setIsSending(true);
          setSendingMethod('Download');
          
          // Get layout configuration for selected page size and orientation
          const layout = getLayoutConfig(pageSize, orientation);
          
          // Generate PDF with selected page size, orientation, and layout
          const doc = new jsPDF(layout.orientation, 'mm', layout.pageSize);
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = layout.margin;
          const contentWidth = pageWidth - (margin * 2);
          let yPos = margin;

          // Helper function to add new page if needed
          const checkPageBreak = (requiredHeight: number) => {
            if (yPos + requiredHeight > pageHeight - margin) {
              doc.addPage();
              yPos = margin;
            }
          };


          // Helper to draw a simple box
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

          // Logo and Business Info Section - Logo on Left
          const sectionY = yPos + 2;
          
          // Logo - Left Side (No Container)
          let logoY = sectionY;
          let logoHeight = 0;
          if (businessInfo.logo) {
            try {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              await new Promise<void>((resolve) => {
                img.onload = () => {
                  try {
                    // Determine image format from base64 or URL
                    let imageFormat = 'PNG';
                    if (businessInfo.logo!.startsWith('data:image/')) {
                      const formatMatch = businessInfo.logo!.match(/data:image\/(\w+);base64/);
                      if (formatMatch) {
                        const format = formatMatch[1].toUpperCase();
                        imageFormat = format === 'JPEG' ? 'JPEG' : format === 'JPG' ? 'JPEG' : 'PNG';
                      }
                    }
                    
                    // Larger logo size
                    const logoWidth = layout.logoSize;
                    logoHeight = (img.height / img.width) * logoWidth;
                    // Position logo on the left side
                    const logoX = margin + 2; // Left side
                    doc.addImage(businessInfo.logo!, imageFormat, logoX, logoY, logoWidth, logoHeight);
                  } catch (error) {
                    console.warn('Could not add logo to PDF:', error);
                  }
                  resolve();
                };
                img.onerror = () => {
                  console.warn('Could not load logo image for PDF');
                  resolve();
                };
                img.src = businessInfo.logo!;
              });
            } catch (error) {
              console.warn('Could not add logo to PDF:', error);
            }
          } else {
            // Business Name - Left side if no logo
            doc.setFontSize(layout.fontSize.header);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(17, 24, 39); // Gray-900
            const businessNameX = margin + 2;
            doc.text(businessInfo.name, businessNameX, logoY + layout.spacing.line);
          }

          // Business Information Section - No Container (Right Side)
          const infoBoxHeight = Math.max(25, logoHeight || 25); // Match logo height or minimum
          const infoBoxX = margin + layout.logoSize + 5; // Right of logo, with gap
          const infoBoxWidth = contentWidth - (layout.logoSize + 7); // Remaining width
          
          // Business Name - Bold
          let currentY = sectionY + 2;
          doc.setFontSize(layout.fontSize.header);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(17, 24, 39); // Gray-900
          doc.text(businessInfo.name, infoBoxX, currentY);
          currentY += layout.spacing.line + 1;
          
          doc.setFontSize(layout.fontSize.small);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(75, 85, 99); // Gray-600
          
          const infoStartX = infoBoxX;
          let infoLineY = currentY;
          
          // Address
          if (businessInfo.address) {
            doc.setFont('helvetica', 'normal');
            doc.text(businessInfo.address, infoStartX, infoLineY);
            infoLineY += layout.spacing.item;
          }
          
          // Phone - Parse JSON array or string
          if (businessInfo.phone) {
            let phoneNumbers: string[] = [];
            try {
              const parsed = typeof businessInfo.phone === 'string' ? JSON.parse(businessInfo.phone) : businessInfo.phone;
              if (Array.isArray(parsed)) {
                phoneNumbers = parsed.map((item: any) => 
                  typeof item === 'object' && item.phone ? item.phone : String(item)
                ).filter(Boolean);
              } else if (typeof parsed === 'string') {
                phoneNumbers = [parsed];
              } else {
                phoneNumbers = [String(businessInfo.phone)];
              }
            } catch {
              phoneNumbers = [String(businessInfo.phone)];
            }
            
            if (phoneNumbers.length > 0) {
              doc.text(`Phone: ${phoneNumbers.join(', ')}`, infoStartX, infoLineY);
              infoLineY += layout.spacing.item;
            }
          }
          
          // Email
          if (businessInfo.email) {
            doc.text(`Email: ${businessInfo.email}`, infoStartX, infoLineY);
            infoLineY += layout.spacing.item;
          }
          
          // Website
          if (businessInfo.website) {
            doc.text(`Website: ${businessInfo.website}`, infoStartX, infoLineY);
            infoLineY += layout.spacing.item;
          }
          
          // Social Media - if any
          const socialMedia: string[] = [];
          if (businessInfo.instagram) {
            const instaHandle = businessInfo.instagram.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '');
            socialMedia.push(`Instagram: @${instaHandle}`);
          }
          if (businessInfo.tiktok) {
            const tiktokHandle = businessInfo.tiktok.replace('@', '').replace('https://tiktok.com/@', '').replace('https://www.tiktok.com/@', '');
            socialMedia.push(`TikTok: @${tiktokHandle}`);
          }
          if (businessInfo.whatsapp) {
            const whatsappNum = businessInfo.whatsapp.replace(/[^0-9+]/g, '');
            socialMedia.push(`WhatsApp: ${whatsappNum}`);
          }
          
          if (socialMedia.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Follow Us:', infoStartX, infoLineY);
            infoLineY += layout.spacing.item;
            doc.setFont('helvetica', 'normal');
            socialMedia.forEach((social) => {
              doc.text(social, infoStartX + 2, infoLineY);
              infoLineY += layout.spacing.item;
            });
          }
          
          // Reset text color
          doc.setTextColor(0, 0, 0);
          yPos = sectionY + Math.max(infoBoxHeight, logoHeight || 0) + layout.spacing.section;

          // Receipt Info Section - Dynamic Two Column Layout
          const receiptInfoHeight = receiptData.customerName ? layout.spacing.line * 6 : layout.spacing.line * 4;
          drawBox(margin, yPos, contentWidth, receiptInfoHeight, true, [229, 231, 235]);
          
          // Section divider line
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);
          doc.line(pageWidth / 2, yPos + 2, pageWidth / 2, yPos + receiptInfoHeight - 2);
          
          const leftColX = margin + 3;
          const rightColX = pageWidth / 2 + 3;
          let leftY = yPos + layout.spacing.line;
          let rightY = yPos + layout.spacing.line;

          // Left Column - Receipt Details
          doc.setFontSize(layout.fontSize.body);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(34, 197, 94); // Green-500
          doc.text('RECEIPT DETAILS', leftColX, leftY);
          leftY += layout.spacing.line;
          
          doc.setFontSize(layout.fontSize.small);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(17, 24, 39); // Gray-900
          doc.text(`#: ${receiptData.receiptNumber}`, leftColX, leftY);
          leftY += layout.spacing.item;
          doc.text(`Date: ${new Date().toLocaleDateString()}`, leftColX, leftY);
          leftY += layout.spacing.item;
          doc.text(`Time: ${new Date().toLocaleTimeString()}`, leftColX, leftY);

          // Right Column - Customer Info
          if (receiptData.customerName) {
            doc.setFontSize(layout.fontSize.body);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(34, 197, 94); // Green-500
            doc.text('CUSTOMER', rightColX, rightY);
            rightY += layout.spacing.line;
            
            doc.setFontSize(layout.fontSize.small);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(17, 24, 39); // Gray-900
            doc.text(`Name: ${receiptData.customerName}`, rightColX, rightY);
            rightY += layout.spacing.item;
            if (receiptData.customerPhone) {
              doc.text(`Phone: ${receiptData.customerPhone}`, rightColX, rightY);
              rightY += layout.spacing.item;
            }
            if (receiptData.customerEmail) {
              doc.text(`Email: ${receiptData.customerEmail}`, rightColX, rightY);
            }
          }

          // Reset text color
          doc.setTextColor(0, 0, 0);
          yPos += receiptInfoHeight + layout.spacing.section;
          checkPageBreak(20);

          // Items Section Header - Dynamic size
          doc.setFontSize(layout.fontSize.title);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(17, 24, 39); // Gray-900
          doc.text('ITEMS PURCHASED', margin, yPos);
          yPos += layout.spacing.line;
          
          // Draw line under header
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 3;

          // Items - Dynamic Design
          if (receiptData.items && receiptData.items.length > 0) {
            receiptData.items.forEach((item, index) => {
            // Calculate dynamic height based on content and layout
            let estimatedHeight = layout.spacing.line * 4;
            if (item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0) {
                estimatedHeight += item.selectedSerialNumbers.length * layout.spacing.item;
              }
              if (item.attributes && Object.keys(item.attributes).length > 0) {
                const attrCount = Object.keys(item.attributes).filter(key => 
                  !['id', 'created_at', 'updated_at', 'variant_id', 'product_id', 'imei', 'is_legacy', 'is_imei_child'].includes(key) && item.attributes[key]
                ).length;
                // Use 2-column layout, so divide by 2 and add some height
                estimatedHeight += Math.ceil(attrCount / 2) * layout.spacing.item;
              }
              estimatedHeight = Math.max(estimatedHeight, layout.spacing.line * 5);
              
              checkPageBreak(estimatedHeight + 2);
              
              // Item Card with gray border (matching summary section)
              const cardBorderColor = [229, 231, 235]; // Gray-200
              drawBox(margin, yPos, contentWidth, estimatedHeight, true, cardBorderColor);
              
              const itemMargin = margin + 2;
              let itemY = yPos + layout.spacing.line;
              
              // Product Name with Variant - Dynamic size
              doc.setFontSize(layout.fontSize.body);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(17, 24, 39); // Gray-900
              const productName = item.variantName && item.variantName !== 'Default' 
                ? `${item.productName} - ${item.variantName}`
                : item.productName;
              const itemText = `${item.quantity}x ${productName}`;
              const itemLines = doc.splitTextToSize(itemText, contentWidth - layout.imageSize - 5);
              doc.text(itemLines, itemMargin, itemY);
              itemY += itemLines.length * layout.spacing.line + 0.5;
              
              // Unit Price
              doc.setFontSize(layout.fontSize.small);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(107, 114, 128);
              doc.text(`Unit Price: ${item.unitPrice.toLocaleString()} TZS`, itemMargin, itemY);
              itemY += layout.spacing.item;
              
              // Specifications Section - Dynamic size
              const specX = itemMargin + 0.5;
              let specY = itemY + 1;
              doc.setFontSize(layout.fontSize.small);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(107, 114, 128); // Gray-500
              
              // Serial Numbers/IMEI
              if (item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0) {
                item.selectedSerialNumbers.forEach((serial: any) => {
                  const serialInfo: string[] = [];
                  if (serial.serial_number) serialInfo.push(`S/N: ${serial.serial_number}`);
                  if (serial.imei) serialInfo.push(`IMEI: ${serial.imei}`);
                  if (serial.mac_address) serialInfo.push(`MAC: ${serial.mac_address}`);
                  if (serialInfo.length > 0) {
                    doc.setFont('helvetica', 'normal');
                    doc.text(serialInfo.join(' | '), specX, specY);
                    specY += 3;
                  }
                });
              }
              
              // Attributes (specifications) - Grid Layout in PDF
              if (item.attributes && Object.keys(item.attributes).length > 0) {
                // Collect all valid specifications first
                const specs: Array<{ label: string; value: string }> = [];
                
                Object.entries(item.attributes).forEach(([key, value]) => {
                  if (['id', 'created_at', 'updated_at', 'variant_id', 'product_id', 'imei', 'is_legacy', 'is_imei_child'].includes(key)) return;
                  if (!value || value === '' || value === null || value === undefined) return;
                  
                  if (key === 'specification') {
                    try {
                      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                        Object.entries(parsed).forEach(([specKey, specValue]) => {
                          if (specValue && specValue !== '' && specValue !== null) {
                            const keyLabel = specKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                            specs.push({ label: keyLabel, value: String(specValue) });
                          }
                        });
                        return;
                      }
                    } catch {}
                  }
                  
                  if (typeof value !== 'object' || value === null) {
                    const keyLabel = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                    specs.push({ label: keyLabel, value: String(value) });
                  }
                });
                
                // Display specs in compact inline layout (like tags)
                if (specs.length > 0) {
                  doc.setFontSize(3.5);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(75, 85, 99); // Gray-600
                  
                  let currentX = specX;
                  let currentY = specY;
                  const lineHeight = 4;
                  const maxWidth = contentWidth - 6;
                  
                  specs.forEach((spec, index) => {
                    const labelText = `${spec.label}:`;
                    const valueText = spec.value;
                    const fullText = `${labelText} ${valueText}`;
                    
                    // Calculate text width
                    doc.setFont('helvetica', 'semibold');
                    const labelWidth = doc.getTextWidth(labelText);
                    doc.setFont('helvetica', 'normal');
                    const valueWidth = doc.getTextWidth(valueText);
                    const totalWidth = labelWidth + valueWidth + 2; // +2 for spacing
                    
                    // Check if we need a new line
                    if (currentX + totalWidth > margin + maxWidth && currentX > specX) {
                      currentX = specX;
                      currentY += lineHeight;
                    }
                    
                    // Draw compact badge
                    const badgeHeight = 3.5;
                    const badgePadding = 1;
                    const badgeWidth = totalWidth + badgePadding * 2;
                    
                    // Background
                    doc.setFillColor(249, 250, 251); // Gray-50
                    doc.setDrawColor(229, 231, 235); // Gray-200
                    doc.setLineWidth(0.1);
                    doc.rect(currentX, currentY - 2.5, badgeWidth, badgeHeight, 'FD');
                    
                    // Label (bold)
                    doc.setFontSize(3.2);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(75, 85, 99); // Gray-600
                    doc.text(labelText, currentX + badgePadding, currentY);
                    
                    // Value (normal)
                    doc.setFontSize(3.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(17, 24, 39); // Gray-900
                    doc.text(valueText, currentX + badgePadding + labelWidth + 0.5, currentY);
                    
                    // Move to next position
                    currentX += badgeWidth + 1;
                    
                    // If we're at the end of the line, move to next line
                    if (currentX + 10 > margin + maxWidth) {
                      currentX = specX;
                      currentY += lineHeight;
                    }
                  });
                  
                  specY = currentY + lineHeight;
                }
              }
              
              // Reset text color
              doc.setTextColor(0, 0, 0);
              yPos += estimatedHeight + layout.spacing.section;
            });
          }

          yPos += layout.spacing.section;
          checkPageBreak(15);

          // Totals Section - Dynamic size
          const totalsBoxHeight = layout.spacing.line * 5;
          // Green accent bar at top
          doc.setFillColor(34, 197, 94); // Green-500
          doc.rect(margin, yPos, contentWidth, 0.5, 'F'); // Thin bar
          // Main totals box
          drawBox(margin, yPos + 0.5, contentWidth, totalsBoxHeight - 0.5, true, [255, 255, 255]);
          
          const totalsY = yPos + 0.5 + layout.spacing.line;
          let totalsLineY = totalsY;
          
          // Subtotal (if we have item details)
          if (receiptData.items && receiptData.items.length > 0) {
            const subtotal = receiptData.items.reduce((sum, item) => sum + item.totalPrice, 0);
            doc.setFontSize(layout.fontSize.small);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(107, 114, 128); // Gray-500
            doc.text('Subtotal:', margin + 3, totalsLineY);
            doc.setTextColor(17, 24, 39); // Gray-900
            doc.text(`${subtotal.toLocaleString()} TZS`, pageWidth - margin - 3 - doc.getTextWidth(`${subtotal.toLocaleString()} TZS`), totalsLineY);
            totalsLineY += layout.spacing.item;
          }
          
          // Divider line
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.3);
          doc.line(margin + 3, totalsLineY, pageWidth - margin - 3, totalsLineY);
          totalsLineY += layout.spacing.item;
          
          // Total - Dynamic but prominent
          doc.setFontSize(layout.fontSize.title);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(34, 197, 94); // Green-500
          const totalText = `TOTAL: ${receiptData.amount.toLocaleString()} TZS`;
          const totalWidth = doc.getTextWidth(totalText);
          doc.text(totalText, pageWidth - margin - 3 - totalWidth, totalsLineY);
          
          // Reset text color
          doc.setTextColor(0, 0, 0);
          yPos += totalsBoxHeight + layout.spacing.section;

          // QR Code Section - Using Sale ID for Tracking - Dynamic size
          if (receiptData.id) {
            checkPageBreak(25);
            
            // QR Code Box - Dynamic height
            const qrBoxHeight = layout.spacing.line * 8;
            drawBox(margin, yPos, contentWidth, qrBoxHeight, true, [229, 231, 235]);
            
            doc.setFontSize(layout.fontSize.body);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(17, 24, 39); // Gray-900
            doc.text('Track Your Purchase', margin + 3, yPos + layout.spacing.line);
            
            // Generate QR Code URL
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(receiptData.id)}`;
            
            // Add QR Code Image to PDF - Dynamic size
            try {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              await new Promise<void>((resolve) => {
                img.onload = () => {
                  try {
                    const qrSize = layout.imageSize * 0.75; // Size in mm
                    const qrX = margin + 3;
                    const qrY = yPos + layout.spacing.line * 2;
                    doc.addImage(img, 'PNG', qrX, qrY, qrSize, qrSize);
                    
                    // Sale ID text below QR code - Dynamic size
                    doc.setFontSize(layout.fontSize.small);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(107, 114, 128); // Gray-500
                    const saleIdText = `Sale ID: ${receiptData.id}`;
                    const saleIdWidth = doc.getTextWidth(saleIdText);
                    doc.text(saleIdText, qrX + (qrSize / 2) - (saleIdWidth / 2), qrY + qrSize + layout.spacing.item);
                    
                    doc.setFontSize(layout.fontSize.small * 0.9);
                    doc.text('Scan to track this sale', qrX + (qrSize / 2) - (doc.getTextWidth('Scan to track this sale') / 2), qrY + qrSize + layout.spacing.item * 2);
                  } catch (error) {
                    console.warn('Could not add QR code to PDF:', error);
                  }
                  resolve();
                };
                img.onerror = () => {
                  console.warn('Could not load QR code image');
                  resolve();
                };
                img.src = qrCodeUrl;
              });
            } catch (error) {
              console.warn('Error generating QR code for PDF:', error);
            }
            
            yPos += 22 + 3;
          }

          // Social Media Section - Before Footer
          if (businessInfo.instagram || businessInfo.tiktok || businessInfo.whatsapp) {
            checkPageBreak(12);
            
            // Social Media Box
            drawBox(margin, yPos, contentWidth, 10, true, [229, 231, 235]);
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(17, 24, 39); // Gray-900
            doc.text('Follow Us:', margin + 3, yPos + 4);
            
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(107, 114, 128); // Gray-500
            const socialHandles: string[] = [];
            
            if (businessInfo.instagram) {
              const instaHandle = businessInfo.instagram.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '');
              socialHandles.push(`Instagram: @${instaHandle}`);
            }
            if (businessInfo.tiktok) {
              const tiktokHandle = businessInfo.tiktok.replace('@', '').replace('https://tiktok.com/@', '').replace('https://www.tiktok.com/@', '');
              socialHandles.push(`TikTok: @${tiktokHandle}`);
            }
            if (businessInfo.whatsapp) {
              const whatsappNum = businessInfo.whatsapp.replace(/[^0-9+]/g, '');
              socialHandles.push(`WhatsApp: ${whatsappNum}`);
            }
            
            if (socialHandles.length > 0) {
              doc.text(socialHandles.join(' • '), margin + 3, yPos + 7);
            }
            
            yPos += 10 + 3;
          }

          // Footer Section - Compact
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += layout.spacing.item;
          
          doc.setFontSize(layout.fontSize.small);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(34, 197, 94); // Green-500
          const footerText = 'Thank you for your business!';
          const footerWidth = doc.getTextWidth(footerText);
          doc.text(footerText, pageWidth / 2 - footerWidth / 2, yPos);
          
          yPos += layout.spacing.item;
          doc.setFontSize(layout.fontSize.small * 0.85);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(107, 114, 128); // Gray-500
          const returnPolicy = 'Please keep this receipt for your records';
          const returnPolicyWidth = doc.getTextWidth(returnPolicy);
          doc.text(returnPolicy, pageWidth / 2 - returnPolicyWidth / 2, yPos);
          
          // Reset text color
          doc.setTextColor(0, 0, 0);

          // Save PDF
          doc.save(`receipt-${receiptData.receiptNumber}.pdf`);
          toast.success('Receipt downloaded as PDF');
          
          setIsSending(false);
          setSendingMethod('');
        } catch (error) {
          console.error('Error generating PDF:', error);
          toast.error('Failed to generate PDF. Please try again.');
          setIsSending(false);
          setSendingMethod('');
        }
      },
    },
    {
      name: 'Share',
      icon: Share2,
      color: '#10B981',
      onClick: async () => {
        const text = generateReceiptText();
        if (navigator.share) {
          try {
            await navigator.share({
              title: `Receipt #${receiptData.receiptNumber}`,
              text: text,
            });
          } catch (error) {
            console.log('Share cancelled or failed:', error);
          }
        } else {
          alert('Share feature not supported in this browser. Please use WhatsApp, SMS, or Email buttons instead.');
        }
      },
    },
  ];

  return createPortal(
    <div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
      <div
        className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/40 animate-fadeIn"
        onClick={onClose}
      >
      <div
        className={`bg-white rounded-2xl w-full shadow-2xl overflow-hidden relative animate-slideUp max-h-[90vh] flex flex-col ${
          pageSize === 'a4' && orientation === 'landscape' ? 'max-w-6xl' : 'max-w-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-10"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Header Section */}
        <div className="p-6 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Receipt Preview
          </h2>
          <p className="text-sm text-gray-600 mb-2">
            Receipt #{receiptData.receiptNumber}
          </p>
          
          {/* Current Settings Indicator */}
          {pageSize === 'a4' && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                {orientation === 'portrait' ? '📄 Portrait Mode' : '📄 Landscape Mode'}
                <span className="text-green-600">•</span>
                <span>A4 Format</span>
              </span>
            </div>
          )}
          
          {/* Page Size and Orientation Selectors */}
          <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Page Size:</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as PageSize)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              >
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="letter">Letter (8.5 × 11 in)</option>
                <option value="a5">A5 (148 × 210 mm)</option>
                <option value="legal">Legal (8.5 × 14 in)</option>
              </select>
            </div>
            
            {/* Orientation Selector - Only show for A4 */}
            {pageSize === 'a4' && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">Orientation:</label>
                <select
                  value={orientation}
                  onChange={(e) => {
                    const newOrientation = e.target.value as 'portrait' | 'landscape';
                    setOrientation(newOrientation);
                    console.log('Orientation changed to:', newOrientation);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                >
                  <option value="portrait">Portrait (Vertical)</option>
                  <option value="landscape">Landscape (Horizontal)</option>
                </select>
                <span className="text-xs text-gray-500">
                  {orientation === 'portrait' ? '📄 Vertical' : '📄 Horizontal'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Receipt Preview Section - Matching Existing UI Design */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div 
            className={`bg-white rounded-2xl border-2 border-gray-200 shadow-sm mx-auto p-6 transition-all duration-300 ${
              pageSize === 'a5' ? 'max-w-md' : 
              pageSize === 'legal' ? 'max-w-3xl' : 
              pageSize === 'a4' && orientation === 'landscape' ? 'w-full max-w-full' :
              'max-w-2xl'
            }`}
            style={
              pageSize === 'a4' && orientation === 'landscape' 
                ? {
                    aspectRatio: '297/210',
                    minHeight: 'auto'
                  }
                : pageSize === 'a4' && orientation === 'portrait'
                ? {
                    aspectRatio: '210/297'
                  }
                : {}
            }
          >
            {/* Logo and Business Info Section - Logo on Left */}
            <div className={`flex items-start gap-4 ${pageSize === 'a4' && orientation === 'landscape' ? 'mb-4' : 'mb-6'}`}>
              {/* Logo - Left Side, No Container */}
              {businessInfo.logo ? (
                <img 
                  src={businessInfo.logo} 
                  alt={businessInfo.name}
                  className={`object-contain flex-shrink-0 ${pageSize === 'a4' && orientation === 'landscape' ? 'h-32' : 'h-36'}`}
                  onLoad={() => {
                    if (process.env.NODE_ENV === 'development') {
                      console.log('✅ Logo loaded successfully in receipt preview');
                    }
                  }}
                  onError={(e) => {
                    console.error('❌ Logo failed to load:', businessInfo.logo?.substring(0, 50));
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className={`font-bold text-gray-900 uppercase tracking-wide flex-shrink-0 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-3xl' : 'text-4xl'}`}>
                  {businessInfo.name}
                </div>
              )}

              {/* Business Information Section - No Container */}
              <div className="flex-1">
                {/* Business Name - Bold */}
                <h2 className={`font-bold text-gray-900 mb-3 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-lg' : 'text-xl'}`}>
                  {businessInfo.name}
                </h2>
                
                <div className={`grid gap-3 ${
                  pageSize === 'a4' && orientation === 'landscape' 
                    ? 'grid-cols-2' 
                    : 'grid-cols-1'
                }`}>
                  {/* Contact Information */}
                  <div className="space-y-2">
                    {businessInfo.address && (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className={`text-gray-700 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>{businessInfo.address}</span>
                      </div>
                    )}
                    {businessInfo.phone && (() => {
                      // Parse phone number - handle JSON array or string
                      let phoneNumbers: string[] = [];
                      try {
                        const parsed = typeof businessInfo.phone === 'string' ? JSON.parse(businessInfo.phone) : businessInfo.phone;
                        if (Array.isArray(parsed)) {
                          phoneNumbers = parsed.map((item: any) => 
                            typeof item === 'object' && item.phone ? item.phone : String(item)
                          ).filter(Boolean);
                        } else if (typeof parsed === 'string') {
                          phoneNumbers = [parsed];
                        } else {
                          phoneNumbers = [String(businessInfo.phone)];
                        }
                      } catch {
                        // If not JSON, treat as plain string
                        phoneNumbers = [String(businessInfo.phone)];
                      }
                      
                      return phoneNumbers.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className={`text-gray-700 font-medium ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>
                            {phoneNumbers.join(', ')}
                          </span>
                        </div>
                      ) : null;
                    })()}
                    {businessInfo.email && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className={`text-gray-700 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>{businessInfo.email}</span>
                      </div>
                    )}
                    {businessInfo.website && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <span className={`text-gray-700 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>{businessInfo.website}</span>
                      </div>
                    )}
                  </div>

                  {/* Social Media Handles */}
                  {(businessInfo.instagram || businessInfo.tiktok || businessInfo.whatsapp) && (
                    <div className="space-y-2">
                      <div className={`font-semibold text-gray-600 mb-1 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xs' : 'text-sm'}`}>Follow Us</div>
                      <div className="flex flex-wrap gap-2">
                        {businessInfo.instagram && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-medium">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                            <span>@{businessInfo.instagram.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '')}</span>
                          </div>
                        )}
                        {businessInfo.tiktok && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-900 text-white rounded-lg text-xs font-medium">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                            </svg>
                            <span>@{businessInfo.tiktok.replace('@', '').replace('https://tiktok.com/@', '').replace('https://www.tiktok.com/@', '')}</span>
                          </div>
                        )}
                        {businessInfo.whatsapp && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-medium">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            <span>{businessInfo.whatsapp.replace(/[^0-9+]/g, '')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Receipt & Customer Info - Combined Card */}
            <div className={`${pageSize === 'a4' && orientation === 'landscape' ? 'mb-3' : 'mb-4'}`}>
              <div className="bg-white rounded-lg p-3 border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
                <div className={`grid gap-4 ${
                  pageSize === 'a4' && orientation === 'landscape' 
                    ? 'grid-cols-2' 
                    : 'grid-cols-1'
                }`}>
                  {/* Receipt Details - Left Side */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Receipt</h3>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{receiptData.receiptNumber}</p>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-xs text-gray-500">{new Date().toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                  
                  {/* Customer Info - Right Side */}
                  {(receiptData.customerName || receiptData.customerPhone || receiptData.customerEmail) && (
                    <div className={`${pageSize === 'a4' && orientation === 'landscape' ? 'border-l border-gray-200 pl-4' : 'border-t border-gray-200 pt-4 mt-4'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</h3>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        {receiptData.customerName && (
                          <p className="font-medium text-gray-900">{receiptData.customerName}</p>
                        )}
                        {receiptData.customerPhone && (
                          <p className="text-gray-600 font-mono text-xs">{receiptData.customerPhone}</p>
                        )}
                        {receiptData.customerEmail && (
                          <p className="text-gray-600 text-xs break-all">{receiptData.customerEmail}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>


            {/* Dashed Separator */}
            <div className={`border-t border-dashed border-gray-300 ${pageSize === 'a4' && orientation === 'landscape' ? 'my-3' : 'my-6'}`}></div>

            {/* Items Section - Optimized for Landscape */}
            <div 
              className={`${pageSize === 'a4' && orientation === 'landscape' ? 'mb-2' : 'mb-4'} ${
                pageSize === 'a4' && orientation === 'landscape' 
                  ? receiptData.items && receiptData.items.length === 1
                    ? 'space-y-2' // Single item: full width
                    : 'grid grid-cols-2 gap-2' // Multiple items: 2 columns
                  : 'space-y-3' // Portrait: single column
              }`}
            >
              {receiptData.items && receiptData.items.length > 0 ? (
                receiptData.items.map((item, index) => {
                  const productName = item.variantName && item.variantName !== 'Default' 
                    ? `${item.productName} - ${item.variantName}`
                    : item.productName;
                  
                  const isSingleItem = receiptData.items && receiptData.items.length === 1;
                  const isLandscape = pageSize === 'a4' && orientation === 'landscape';
                  
                  return (
                    <div 
                      key={index} 
                      className="border-2 border-gray-200 rounded-2xl bg-white shadow-sm hover:border-gray-300 hover:shadow-md transition-all duration-300"
                    >
                      {/* Item Header - Compact for Landscape */}
                      <div className={`${isLandscape && !isSingleItem ? 'p-2' : 'p-3'}`}>
                        <div className={`flex items-start ${isLandscape && !isSingleItem ? 'flex-col gap-1 mb-1' : 'gap-2 mb-2'}`}>
                          {/* Product Image - Compact for Landscape */}
                          <div className="flex-shrink-0">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={productName}
                                className={`object-cover rounded-lg border border-gray-200 ${
                                  isLandscape && !isSingleItem 
                                    ? 'w-full h-20' 
                                    : isLandscape && isSingleItem
                                    ? 'w-28 h-28'
                                    : 'w-32 h-32'
                                }`}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className={`bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center ${
                                isLandscape && !isSingleItem 
                                  ? 'w-full h-20' 
                                  : isLandscape && isSingleItem
                                  ? 'w-28 h-28'
                                  : 'w-32 h-32'
                              }`}>
                                <span className="text-xs text-gray-400">No Image</span>
                              </div>
                            )}
          </div>
          
                          {/* Product Info - Compact for Landscape */}
                          <div className="flex-1">
                            <div className={`flex items-center ${isLandscape && !isSingleItem ? 'flex-col items-start gap-0.5 mb-0.5' : 'gap-2 mb-1'}`}>
                              <h4 className={`font-bold text-gray-900 ${
                                isLandscape && !isSingleItem ? 'text-xs' : 'text-lg'
                              }`}>{productName}</h4>
                              <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-green-500 text-white shadow-sm ${
                                isLandscape && !isSingleItem ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
                              }`}>
                                Qty: {item.quantity}
                              </span>
                            </div>
                            
                            {/* Unit Price - Compact */}
                            <div className={isLandscape && !isSingleItem ? 'mb-0.5' : 'mb-1'}>
                              <span className={`text-gray-600 ${isLandscape && !isSingleItem ? 'text-xs' : 'text-sm'}`}>Unit: </span>
                              <span className={`font-semibold text-gray-900 ${isLandscape && !isSingleItem ? 'text-xs' : 'text-sm'}`}>{formatMoney(item.unitPrice)}</span>
                            </div>
                            
                            {/* Specifications - Ultra Compact for Landscape */}
                            {item.attributes && Object.keys(item.attributes).length > 0 && (() => {
                              const specs: Array<{ key: string; label: string; value: string }> = [];
                              
                              Object.entries(item.attributes).forEach(([key, value]) => {
                                if (['id', 'created_at', 'updated_at', 'variant_id', 'product_id', 'imei', 'is_legacy', 'is_imei_child'].includes(key)) return;
                                if (!value || value === '' || value === null || value === undefined) return;
                                
                                if (key === 'specification') {
                                  try {
                                    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                                    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                                      Object.entries(parsed).forEach(([specKey, specValue]) => {
                                        if (!specValue || specValue === '' || specValue === null) return;
                                        const keyLabel = specKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                                        specs.push({ key: `${key}-${specKey}`, label: keyLabel, value: String(specValue) });
                                      });
                                    }
                                  } catch {
                                    // Skip invalid specification
                                  }
                                } else {
                                  if (typeof value === 'object' && value !== null) return;
                                  const keyLabel = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                                  specs.push({ key, label: keyLabel, value: String(value) });
                                }
                              });
                              
                              if (specs.length === 0) return null;
                              
                              return (
                                <div className={`flex flex-wrap ${isLandscape && !isSingleItem ? 'gap-0.5 mt-0.5' : 'gap-1 mt-1'}`}>
                                  {specs.map((spec) => (
                                    <div 
                                      key={spec.key} 
                                      className={`inline-flex items-center bg-gray-50 rounded border border-gray-200 ${
                                        isLandscape && !isSingleItem 
                                          ? 'gap-0.5 px-1 py-0.5' 
                                          : 'gap-1.5 px-2 py-1'
                                      }`}
                                    >
                                      <span className={`font-semibold text-gray-600 ${
                                        isLandscape && !isSingleItem ? 'text-[9px]' : 'text-[10px]'
                                      }`}>{spec.label}:</span>
                                      <span className={`text-gray-900 font-medium ${
                                        isLandscape && !isSingleItem ? 'text-[9px]' : 'text-[10px]'
                                      }`}>{spec.value}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        
                        {/* Serial Numbers Section - Compact for Landscape */}
                        {item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0 && (
                          <div className={`bg-gray-50 rounded-lg border border-gray-200 ${isLandscape && !isSingleItem ? 'p-1 mt-1' : 'p-2 mt-2'}`}>
                            {item.selectedSerialNumbers.map((serial: any, sIndex: number) => {
                              const serialInfo: string[] = [];
                              if (serial.serial_number) serialInfo.push(`S/N: ${serial.serial_number}`);
                              if (serial.imei) serialInfo.push(`IMEI: ${serial.imei}`);
                              if (serial.mac_address) serialInfo.push(`MAC: ${serial.mac_address}`);
                              return serialInfo.length > 0 ? (
                                <div key={sIndex} className={`text-gray-600 ${isLandscape && !isSingleItem ? 'text-xs mb-0.5' : 'text-sm mb-1'}`}>
                                  <span className="font-semibold text-gray-700">Serial: </span>
                                  <span className="font-mono">{serialInfo.join(' | ')}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No items</p>
              )}
            </div>

            {/* Separator Above Summary */}
            <div className={`border-t border-dashed border-gray-300 ${pageSize === 'a4' && orientation === 'landscape' ? 'my-3' : 'my-6'}`}></div>

            {/* Pricing Breakdown - Below Items, Right Side in Landscape */}
            <div className={pageSize === 'a4' && orientation === 'landscape' ? 'grid grid-cols-3 gap-4' : ''}>
              {pageSize === 'a4' && orientation === 'landscape' && <div className="col-span-2"></div>}
              <div className={`bg-gray-50 rounded-xl border-2 border-gray-200 ${
                pageSize === 'a4' && orientation === 'landscape' 
                  ? 'col-span-1 p-3 mb-2' 
                  : 'p-6 mb-6 w-full'
              }`}>
                <h3 className={`font-bold text-gray-900 mb-2 ${
                  pageSize === 'a4' && orientation === 'landscape' ? 'text-sm' : 'text-base'
                }`}>SUMMARY</h3>
                <div className={pageSize === 'a4' && orientation === 'landscape' ? 'space-y-1.5' : 'space-y-3'}>
                {receiptData.items && receiptData.items.length > 0 && (
                  <div className={`flex justify-between items-center text-gray-700 ${
                    pageSize === 'a4' && orientation === 'landscape' ? 'text-sm' : 'text-base'
                  }`}>
                    <span>Price</span>
                    <span className="font-semibold">{formatMoney(receiptData.items.reduce((sum, item) => sum + item.totalPrice, 0))}</span>
                  </div>
                )}
                
                {/* Delivery - if applicable */}
                <div className={`flex justify-between items-center text-gray-700 ${
                  pageSize === 'a4' && orientation === 'landscape' ? 'text-sm' : 'text-base'
                }`}>
                  <span>Delivery</span>
                  <span className="font-semibold">TSh 0</span>
                </div>
                
                {/* Separator Line */}
                <div className={`border-t border-gray-300 ${pageSize === 'a4' && orientation === 'landscape' ? 'my-1.5' : 'my-3'}`}></div>
                
                {/* Total Amount - Bold */}
                <div className="flex justify-between items-center">
                  <span className={`font-bold text-gray-900 ${
                    pageSize === 'a4' && orientation === 'landscape' ? 'text-base' : 'text-lg'
                  }`}>Total Amount</span>
                  <span className={`font-bold text-gray-900 ${
                    pageSize === 'a4' && orientation === 'landscape' ? 'text-base' : 'text-lg'
                  }`}>{formatMoney(receiptData.amount)}</span>
                </div>
                </div>
              </div>
            </div>

            {/* Social Media Handles - Compact for Landscape */}
            {(businessInfo.instagram || businessInfo.tiktok || businessInfo.whatsapp) && (
              <div className={`bg-gray-50 rounded-xl border-2 border-gray-200 ${pageSize === 'a4' && orientation === 'landscape' ? 'p-3 mb-2' : 'p-6 mb-6'}`}>
                <h4 className={`font-bold text-gray-900 flex items-center gap-2 ${
                  pageSize === 'a4' && orientation === 'landscape' ? 'text-xs mb-2' : 'text-sm mb-4'
                }`}>
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-sm">
                    <Share2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  Follow Us
                </h4>
                <div className="flex flex-wrap gap-3">
                  {businessInfo.instagram && (
                    <a
                      href={`https://instagram.com/${businessInfo.instagram.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm hover:shadow-md"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      @{businessInfo.instagram.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '')}
                    </a>
                  )}
                  {businessInfo.tiktok && (
                    <a
                      href={`https://tiktok.com/@${businessInfo.tiktok.replace('@', '').replace('https://tiktok.com/@', '').replace('https://www.tiktok.com/@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all shadow-sm hover:shadow-md ${
                        pageSize === 'a4' && orientation === 'landscape' ? 'px-2 py-1 text-xs' : 'px-4 py-2.5 text-sm'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                      @{businessInfo.tiktok.replace('@', '').replace('https://tiktok.com/@', '').replace('https://www.tiktok.com/@', '')}
                    </a>
                  )}
                  {businessInfo.whatsapp && (
                    <a
                      href={`https://wa.me/${businessInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md ${
                        pageSize === 'a4' && orientation === 'landscape' ? 'px-2 py-1 text-xs' : 'px-4 py-2.5 text-sm'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      {businessInfo.whatsapp.replace(/[^0-9+]/g, '')}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* QR Code for Tracking - Compact for Landscape */}
            {receiptData.id && (
              <div className={`bg-gray-50 rounded-xl border-2 border-gray-200 ${pageSize === 'a4' && orientation === 'landscape' ? 'p-3 mb-2' : 'p-6 mb-6'}`}>
                <h4 className={`font-bold text-gray-900 flex items-center gap-2 ${
                  pageSize === 'a4' && orientation === 'landscape' ? 'text-xs mb-2' : 'text-sm mb-3'
                }`}>
                  <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
                    <Share2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  Track Your Purchase
                </h4>
                <div className={`flex flex-col items-center ${pageSize === 'a4' && orientation === 'landscape' ? 'gap-2' : 'gap-3'}`}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(receiptData.id)}`}
                    alt="Sale Tracking QR Code"
                    className={`border-2 border-gray-300 rounded-lg bg-white p-2 ${
                      pageSize === 'a4' && orientation === 'landscape' ? 'w-24 h-24' : 'w-32 h-32'
                    }`}
                  />
                  <p className={`text-gray-600 text-center ${
                    pageSize === 'a4' && orientation === 'landscape' ? 'text-[10px]' : 'text-xs'
                  }`}>
                    Scan to track this sale<br />
                    <span className="font-mono text-gray-900">Sale ID: {receiptData.id}</span>
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Loading Overlay */}
        {isSending && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center z-10">
            <Loader2
              size={48}
              color="#0088cc"
              className="animate-spin"
            />
            <p className="mt-4 text-base font-semibold text-gray-700">
              Sending {sendingMethod}...
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Please wait
            </p>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .animate-spin {
                animation: spin 1s linear infinite;
              }
            `}</style>
          </div>
        )}

        {/* Action Buttons Section */}
        <div className="p-6 bg-white border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
            Share Options
          </h3>
          <div 
            className="grid grid-cols-3 gap-3"
            style={{
              opacity: isSending ? 0.5 : 1,
              pointerEvents: isSending ? 'none' : 'auto',
            }}
          >
            {shareOptions.map((option, index) => {
              const Icon = option.icon;
              const isSMSOption = option.name === 'SMS';
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (isSMSOption) {
                      // SMS is async, handled in onClick
                      option.onClick();
                    } else {
                      // Other options are sync
                      option.onClick();
                      setTimeout(() => onClose(), 500);
                    }
                  }}
                  disabled={isSending}
                  className="flex flex-col items-center justify-center p-5 border-2 border-gray-200 rounded-xl bg-white cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    opacity: isSending ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSending) {
                      e.currentTarget.style.borderColor = option.color;
                      e.currentTarget.style.background = `${option.color}08`;
                      e.currentTarget.style.boxShadow = `0 8px 16px ${option.color}20`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSending) {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = '#fff';
                    }
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                    style={{
                      background: `${option.color}15`,
                    }}
                  >
                    <Icon size={24} color={option.color} strokeWidth={2} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {option.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      </div>
      <SuccessModal {...successModal.props} />
    </div>,
    document.body
  );
};

export default ShareReceiptModal;

