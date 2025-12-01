/**
 * Share Receipt Modal
 * Beautiful modal for sharing receipts via WhatsApp, SMS, Email, etc.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, Mail, Send, Copy, Download, Share2, Loader2, Printer } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { smsService } from '../../services/smsService';
import SuccessModal from './SuccessModal';
import { useSuccessModal } from '../../hooks/useSuccessModal';
import { SuccessIcons } from './SuccessModalIcons';
import { useBusinessInfo } from '../../hooks/useBusinessInfo';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
    customerCity?: string;
    customerTag?: string;
    sellerName?: string;
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

  // Debug: Log receipt data to help troubleshoot QR code
  useEffect(() => {
    if (isOpen && receiptData) {
      console.log('📋 Receipt Data:', {
        id: receiptData.id,
        receiptNumber: receiptData.receiptNumber,
        hasId: !!receiptData.id,
        idType: typeof receiptData.id,
        idValue: receiptData.id,
      });
    }
  }, [isOpen, receiptData]);

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

  const handlePrint = () => {
    // Add print styles to hide everything except receipt preview
    const printStyle = document.createElement('style');
    printStyle.id = 'receipt-print-styles';
    printStyle.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        [data-receipt-preview],
        [data-receipt-preview] * {
          visibility: visible;
        }
        [data-receipt-preview] {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: white;
          padding: 0;
          margin: 0;
          border: none;
          box-shadow: none;
        }
        @page {
          size: ${pageSize} ${orientation};
          margin: 0;
        }
      }
    `;
    document.head.appendChild(printStyle);

    // Trigger print
    window.print();

    // Remove print styles after printing
    setTimeout(() => {
      const style = document.getElementById('receipt-print-styles');
      if (style) {
        style.remove();
      }
    }, 1000);
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
          const excludedFields = [
            'id', 'created_at', 'updated_at', 'added_at', 
            'variant_id', 'product_id', 'imei', 'serial_number',
            'is_legacy', 'is_imei_child', 'notes', 
            'parent_variant_name', 'data_source', 'created_without_po'
          ];
          Object.entries(item.attributes).forEach(([key, value]) => {
            if (!excludedFields.includes(key) && value) {
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
        const excludedFields = [
          'id', 'created_at', 'updated_at', 'added_at', 
          'variant_id', 'product_id', 'imei', 'serial_number',
          'is_legacy', 'is_imei_child', 'notes', 
          'parent_variant_name', 'data_source', 'created_without_po'
        ];
        Object.entries(item.attributes).forEach(([key, value]) => {
          if (!excludedFields.includes(key) && value) {
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
        handlePrint();
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
          
          // Get the receipt preview element
          const receiptPreview = document.querySelector('[data-receipt-preview]') as HTMLElement;
          if (!receiptPreview) {
            toast.error('Receipt preview not found');
            setIsSending(false);
            setSendingMethod('');
            return;
          }

          // Wait for all images to load before capturing
          const images = receiptPreview.querySelectorAll('img');
          console.log(`📸 Found ${images.length} images to load for PDF`);
          
          const imagePromises = Array.from(images).map((img, index) => {
            if (img.complete && img.naturalWidth > 0) {
              console.log(`✅ Image ${index + 1} already loaded:`, img.src.substring(0, 50));
              return Promise.resolve();
            }
            return new Promise<void>((resolve) => {
              const timeout = setTimeout(() => {
                console.warn(`⏱️ Image ${index + 1} load timeout:`, img.src.substring(0, 50));
                resolve(); // Continue even if timeout
              }, 5000);
              
              img.onload = () => {
                clearTimeout(timeout);
                console.log(`✅ Image ${index + 1} loaded:`, img.src.substring(0, 50));
                resolve();
              };
              img.onerror = () => {
                clearTimeout(timeout);
                console.warn(`❌ Image ${index + 1} failed to load:`, img.src.substring(0, 50));
                resolve(); // Continue even if image fails
              };
            });
          });

          // Wait for all images to load
          await Promise.all(imagePromises);
          console.log('✅ All images loaded, capturing preview...');
          
          // Small delay to ensure rendering is complete
          await new Promise(resolve => setTimeout(resolve, 200));

          // Get layout configuration for selected page size and orientation
          const layout = getLayoutConfig(pageSize, orientation);
          
          // Capture the preview as canvas with exact dimensions
          console.log('📷 Capturing preview with html2canvas...');
          console.log('Preview dimensions:', {
            width: receiptPreview.scrollWidth,
            height: receiptPreview.scrollHeight,
            offsetWidth: receiptPreview.offsetWidth,
            offsetHeight: receiptPreview.offsetHeight
          });
          
          const canvas = await html2canvas(receiptPreview, {
            scale: 2, // Higher quality
            useCORS: true,
            allowTaint: true, // Allow cross-origin images
            logging: false,
            backgroundColor: '#ffffff',
            width: receiptPreview.scrollWidth,
            height: receiptPreview.scrollHeight,
            windowWidth: receiptPreview.scrollWidth,
            windowHeight: receiptPreview.scrollHeight,
          });

          console.log('✅ Canvas captured:', {
            width: canvas.width,
            height: canvas.height,
            scale: 2
          });

          // Convert canvas to image
          const imgData = canvas.toDataURL('image/png', 1.0);
          console.log('✅ Image data generated, size:', (imgData.length / 1024).toFixed(2), 'KB');
          
          // Create PDF with exact dimensions
          const doc = new jsPDF(layout.orientation, 'mm', layout.pageSize);
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          
          // Calculate image dimensions to fit page while maintaining aspect ratio
          // html2canvas creates canvas at scale 2, so actual preview size is canvas/2
          // Convert canvas pixels to mm (96 DPI: 1px = 25.4/96 mm)
          const scaleFactor = 2; // html2canvas scale
          const pxToMm = 25.4 / 96;
          
          // Actual preview dimensions in mm (accounting for scale factor)
          const previewWidthMm = (canvas.width / scaleFactor) * pxToMm;
          const previewHeightMm = (canvas.height / scaleFactor) * pxToMm;
          
          console.log('📐 Dimension calculations:', {
            pageWidth,
            pageHeight,
            previewWidthMm: previewWidthMm.toFixed(2),
            previewHeightMm: previewHeightMm.toFixed(2)
          });
          
          // Scale to fit page width while maintaining aspect ratio
          const widthScale = pageWidth / previewWidthMm;
          const heightScale = pageHeight / previewHeightMm;
          const scale = Math.min(widthScale, heightScale, 1); // Don't scale up, only down if needed
          
          let finalWidth = previewWidthMm * scale;
          let finalHeight = previewHeightMm * scale;
          
          // Center on page if smaller than page
          const xOffset = (pageWidth - finalWidth) / 2;
          const yOffset = 0; // Start at top
          
          console.log('📏 Final PDF dimensions:', {
            finalWidth: finalWidth.toFixed(2),
            finalHeight: finalHeight.toFixed(2),
            scale: scale.toFixed(3),
            xOffset: xOffset.toFixed(2),
            pages: Math.ceil(finalHeight / pageHeight)
          });
          
          // Add image to PDF - handle multi-page if needed
          if (finalHeight <= pageHeight) {
            // Single page - add image with calculated offset
            doc.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');
          } else {
            // Multi-page - split image across pages
            let currentY = 0;
            let sourceY = 0;
            
            while (currentY < finalHeight) {
              const remainingHeight = finalHeight - currentY;
              const pageImgHeight = Math.min(pageHeight, remainingHeight);
              const sourceHeight = (pageImgHeight / finalHeight) * canvas.height;
              
              // Create a canvas for this page section
              const pageCanvas = document.createElement('canvas');
              pageCanvas.width = canvas.width;
              pageCanvas.height = sourceHeight;
              const ctx = pageCanvas.getContext('2d');
              
              if (ctx) {
                // Draw the section of the original canvas
                ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
                const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
                
                // Add to PDF with x offset for centering
                doc.addImage(pageImgData, 'PNG', xOffset, 0, finalWidth, pageImgHeight, undefined, 'FAST');
              }
              
              sourceY += sourceHeight;
              currentY += pageImgHeight;
              
              // Add new page if there's more content
              if (currentY < finalHeight) {
                doc.addPage();
              }
            }
          }
          
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
            data-receipt-preview
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
                <div className={`font-bold text-gray-900 uppercase tracking-wide flex-shrink-0 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-5xl' : 'text-6xl'}`}>
                  {businessInfo.name}
                </div>
              )}

              {/* Business Information Section - No Container */}
              <div className="flex-1">
                {(() => {
                  // Use sale ID if available, otherwise use receipt number as fallback for QR code
                  const qrData = (receiptData.id && receiptData.id.trim() !== '') 
                    ? receiptData.id 
                    : receiptData.receiptNumber;
                  const hasQrData = qrData && qrData.trim() !== '';
                  const hasCustomerInfo = receiptData.customerName || receiptData.customerPhone || receiptData.customerEmail || receiptData.customerCity || receiptData.customerTag || receiptData.id;
                  
                  // Determine grid columns: QR code + business info (customer info will be below)
                  // In both landscape and portrait, use grid layout to keep QR code on right
                  let gridCols = 'grid-cols-1';
                  if (hasQrData) {
                    gridCols = 'grid-cols-2';
                  }
                  
                  return (
                    <>
                      <div className={`grid gap-4 ${gridCols}`}>
                      {/* Business Information */}
                      <div>
                    {/* Business Name - Bold */}
                    <h2 className={`font-bold text-gray-900 uppercase mb-0 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-2xl' : 'text-3xl'}`}>
                      {businessInfo.name}
                    </h2>
                    
                    <div className="space-y-2 mt-2">
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
                      <div className="space-y-2 mt-2">
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

                  {/* QR Code - Right Side of Business Info (Generated from Sale ID or Receipt Number) */}
                  {hasQrData && (
                    <div className="flex flex-col items-center justify-center">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`}
                        alt="Sale Tracking QR Code"
                        className={`border-2 border-gray-300 rounded-lg bg-white p-2 ${
                          pageSize === 'a4' && orientation === 'landscape' ? 'w-24 h-24' : 'w-28 h-28'
                        }`}
                        onError={(e) => {
                          console.error('❌ QR code failed to load for:', qrData);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('✅ QR code loaded successfully for:', qrData);
                          }
                        }}
                      />
                    </div>
                  )}
                    </div>

                  {/* Customer Info - Below Business Information */}
                  {(receiptData.customerName || receiptData.customerPhone || receiptData.customerEmail || receiptData.customerCity || receiptData.customerTag || receiptData.id) && (
                    <div className={`border-t border-gray-200 ${pageSize === 'a4' && orientation === 'landscape' ? 'mt-4 pt-4' : 'mt-2 pt-2'}`}>
                      {/* Customer Name - Minimal in Portrait */}
                      {receiptData.customerName && (
                        <h3 className={`font-semibold text-gray-700 uppercase mb-0 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-2xl mb-2' : 'text-sm mb-1'}`}>
                          {receiptData.customerName}
                        </h3>
                      )}
                      
                      <div className={`grid ${pageSize === 'a4' && orientation === 'landscape' ? 'grid-cols-2 gap-2 mt-2' : 'grid-cols-2 gap-x-3 gap-y-1 mt-1'}`}>
                        {receiptData.customerPhone && (
                          <div className={`flex items-center ${pageSize === 'a4' && orientation === 'landscape' ? 'gap-2 justify-end' : 'gap-1.5 justify-start'}`}>
                            {pageSize === 'a4' && orientation === 'landscape' ? (
                              <>
                                <span className={`text-gray-700 font-medium text-xs`}>{receiptData.customerPhone}</span>
                                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className={`text-gray-600 text-xs`}>{receiptData.customerPhone}</span>
                              </>
                            )}
                          </div>
                        )}
                        {receiptData.customerEmail && (
                          <div className={`flex items-center ${pageSize === 'a4' && orientation === 'landscape' ? 'gap-2 justify-end' : 'gap-1.5 justify-start'}`}>
                            {pageSize === 'a4' && orientation === 'landscape' ? (
                              <>
                                <span className={`text-gray-700 text-xs`}>{receiptData.customerEmail}</span>
                                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className={`text-gray-600 text-xs`}>{receiptData.customerEmail}</span>
                              </>
                            )}
                          </div>
                        )}
                        {receiptData.customerCity && (
                          <div className={`flex items-center ${pageSize === 'a4' && orientation === 'landscape' ? 'gap-2 justify-end' : 'gap-1.5 justify-start'}`}>
                            {pageSize === 'a4' && orientation === 'landscape' ? (
                              <>
                                <span className={`text-gray-700 text-xs`}>{receiptData.customerCity}</span>
                                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className={`text-gray-600 text-xs`}>{receiptData.customerCity}</span>
                              </>
                            )}
                          </div>
                        )}
                        {receiptData.customerTag && (
                          <div className={`flex items-center ${pageSize === 'a4' && orientation === 'landscape' ? 'gap-2 justify-end' : 'gap-1.5 justify-start'}`}>
                            <span className={`inline-flex items-center rounded text-xs font-medium ${
                              receiptData.customerTag.toLowerCase() === 'vip' 
                                ? 'bg-purple-100 text-purple-700' 
                                : receiptData.customerTag.toLowerCase() === 'new'
                                ? 'bg-blue-100 text-blue-700'
                                : receiptData.customerTag.toLowerCase() === 'complainer'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            } ${pageSize === 'a4' && orientation === 'landscape' ? 'text-[10px] px-1.5 py-0.5' : 'text-[10px] px-1.5 py-0.5'}`}>
                              {receiptData.customerTag.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                    </>
                  );
                })()}
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
                                // Exclude internal/system fields
                                const excludedFields = [
                                  'id', 'created_at', 'updated_at', 'added_at', 
                                  'variant_id', 'product_id', 'imei', 'serial_number',
                                  'is_legacy', 'is_imei_child', 'notes', 
                                  'parent_variant_name', 'data_source', 'created_without_po'
                                ];
                                if (excludedFields.includes(key)) return;
                                if (!value || value === '' || value === null || value === undefined) return;
                                
                                if (key === 'specification') {
                                  try {
                                    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                                    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                                      Object.entries(parsed).forEach(([specKey, specValue]) => {
                                        // Also exclude these fields from nested specification object
                                        if (excludedFields.includes(specKey)) return;
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

            {/* Summary Section - Below Items, Left Side */}
            <div className="w-full">
              <div className="w-full">
                <h3 className={`font-bold text-gray-900 mb-3 ${
                  pageSize === 'a4' && orientation === 'landscape' ? 'text-sm' : 'text-base'
                }`}>SUMMARY</h3>
                <div className={`space-y-2 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-sm' : 'text-base'}`}>
                        {/* Receipt Information */}
                        <div className="space-y-1">
                          <div className="grid grid-cols-2 gap-2 text-gray-600 text-xs">
                            <p>{new Date().toLocaleDateString()}</p>
                            <p>{new Date().toLocaleTimeString()}</p>
                          </div>
                          {receiptData.sellerName && (
                            <div className="text-gray-600 text-xs">
                              <p><span className="font-semibold">Seller:</span> {receiptData.sellerName}</p>
                            </div>
                          )}
                        </div>

                        {/* Separator */}
                        <div className="border-t border-gray-300 my-2"></div>

                        {/* Pricing Details */}
                        {receiptData.items && receiptData.items.length > 0 && (
                          <div className="flex justify-between items-center text-gray-700">
                            <span>Price</span>
                            <span className="font-semibold">{formatMoney(receiptData.items.reduce((sum, item) => sum + item.totalPrice, 0))}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center text-gray-700">
                          <span>Delivery</span>
                          <span className="font-semibold">TSh 0</span>
                        </div>
                        
                        {/* Separator Line */}
                        <div className="border-t border-gray-300 my-2"></div>
                        
                        {/* Total Amount - Bold and Large */}
                        <div className="flex justify-between items-center">
                          <span className={`font-extrabold text-gray-900 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xl' : 'text-2xl'}`}>Total Amount</span>
                          <span className={`font-extrabold text-gray-900 ${pageSize === 'a4' && orientation === 'landscape' ? 'text-xl' : 'text-2xl'}`}>{formatMoney(receiptData.amount)}</span>
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

