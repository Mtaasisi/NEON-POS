/**
 * PDF Receipt Generator - Modern Receipt System
 * Generates high-quality PDF receipts and shares directly to WhatsApp
 */

import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Share2,
  MessageCircle,
  Settings,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  Smartphone,
  Mail
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import whatsappService from '../../services/whatsappService';
import { smsService } from '../../services/smsService';
import { useBusinessInfo } from '../../hooks/useBusinessInfo';
import { format } from '../../features/lats/lib/format';
import ModernReceiptTemplate from '../templates/ModernReceiptTemplate';

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
    image?: string;
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

interface PDFReceiptGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
  autoShare?: boolean;
  customerPhone?: string;
  settings?: any; // Receipt settings
}

interface ReceiptTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
}

const receiptTemplates: ReceiptTemplate[] = [
  {
    id: 'modern',
    name: 'Modern Receipt',
    description: 'Clean, professional design with business branding',
    preview: '🧾'
  },
  {
    id: 'compact',
    name: 'Compact Receipt',
    description: 'Space-efficient design for quick printing',
    preview: '📄'
  },
  {
    id: 'detailed',
    name: 'Detailed Receipt',
    description: 'Full details with product images and specifications',
    preview: '📋'
  }
];

const PDFReceiptGenerator: React.FC<PDFReceiptGeneratorProps> = ({
  isOpen,
  onClose,
  receiptData,
  autoShare = false,
  customerPhone,
  settings
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [shareHistory, setShareHistory] = useState<Array<{
    method: string;
    timestamp: Date;
    status: 'success' | 'error';
  }>>([]);

  const receiptRef = useRef<HTMLDivElement>(null);
  const { businessInfo } = useBusinessInfo();

  // Default receipt settings
  const defaultSettings = {
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

  // Use provided settings or defaults
  const receiptSettings = settings || defaultSettings;

  // Generate perfect vector-based PDF using shared utility
  const generatePDF = useCallback(async (): Promise<Blob> => {
    const { generateReceiptPDF, defaultReceiptSettings } = await import('../../lib/pdfGenerator');
    const settingsToUse = receiptSettings || defaultReceiptSettings;
    return generateReceiptPDF(receiptData, businessInfo, settingsToUse);
  }, [receiptData, businessInfo, receiptSettings]);

  // Clean up old localStorage entries to prevent quota issues
  const cleanupOldStorageEntries = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      const storageKeys = keys.filter(key => key.startsWith('storage:'));

      // Keep only the last 10 entries to prevent quota issues
      if (storageKeys.length > 10) {
        const keysToRemove = storageKeys.slice(0, storageKeys.length - 10);
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        console.log(`🧹 Cleaned up ${keysToRemove.length} old localStorage entries`);
      }
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Could not cleanup localStorage:', error);
    }
  }, []);

  // Upload PDF to storage and get public URL (with WhatsApp media service fallback)
  const uploadPDFToStorage = useCallback(async (pdfBlob: Blob): Promise<string> => {
    const pdfFile = new File([pdfBlob], `receipt-${receiptData.receiptNumber}.pdf`, { type: 'application/pdf' });

    // Clean up old storage entries first
    cleanupOldStorageEntries();

    console.log('📤 Uploading PDF...');
    console.log('   File size:', pdfBlob.size, 'bytes');

    // First try WhatsApp media storage service (which handles uploads properly)
    try {
      console.log('🔄 Trying WhatsApp media storage service...');
      const { WhatsAppMediaStorageService } = await import('../../lib/whatsappMediaStorage');
      const result = await WhatsAppMediaStorageService.uploadMedia(pdfFile);

      if (result.success && result.url) {
        console.log('✅ PDF uploaded via WhatsApp media service:', result.url);
        return result.url;
      } else {
        console.warn('⚠️ WhatsApp media service failed:', result.error);
      }
    } catch (error) {
      console.warn('⚠️ WhatsApp media service exception:', error);
    }

    // Fallback: Try direct Supabase storage (if buckets exist)
    try {
      console.log('🔄 Trying direct Supabase storage...');
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';
      const supabase = createClient(supabaseUrl, supabaseKey);

      const timestamp = Date.now();
      const receiptNumber = receiptData.receiptNumber || `RECEIPT-${timestamp}`;
      const filePath = `receipts/${timestamp}-${receiptNumber}.pdf`;

      // Try receipts bucket first
      let bucketName = 'receipts';
      let { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, pdfFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.warn(`⚠️ ${bucketName} bucket failed, trying public-files...`);
        bucketName = 'public-files';
        const fallbackResult = await supabase.storage
          .from(bucketName)
          .upload(filePath, pdfFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (fallbackResult.error) {
          throw new Error(`Storage buckets not available: ${fallbackResult.error.message}`);
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        console.log('✅ PDF uploaded to Supabase storage:', urlData.publicUrl);
        return urlData.publicUrl;
      }

    } catch (error) {
      console.warn('⚠️ Direct Supabase storage failed:', error);
    }

    // Final fallback: Return data URL (may not work with WhatsApp API)
    console.log('🔄 Using data URL fallback...');
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(pdfFile);
    });

    console.log('✅ Using data URL (may have limitations)');
    return dataUrl;
  }, [receiptData.receiptNumber, cleanupOldStorageEntries]);

  // Share PDF via WhatsApp
  const shareViaWhatsApp = useCallback(async (blob: Blob) => {
    setIsSharing(true);
    try {
      const phoneNumber = customerPhone || receiptData.customer?.phone;
      if (!phoneNumber) {
        throw new Error('No customer phone number available');
      }

      // First upload PDF to storage and get public URL
      const pdfUrl = await uploadPDFToStorage(blob);

      // Generate WhatsApp caption
      const caption = `Receipt ${receiptData.receiptNumber} - ${format.money(receiptData.totals.grandTotal)}`;

      // Send document via WhatsApp service
      await whatsappService.sendMessage(phoneNumber, caption, {
        message_type: 'document',
        media_url: pdfUrl,
        fileName: `receipt-${receiptData.receiptNumber}.pdf`
      });

      setShareHistory(prev => [...prev, {
        method: 'WhatsApp',
        timestamp: new Date(),
        status: 'success'
      }]);

      toast.success('Receipt shared via WhatsApp successfully!');
    } catch (error) {
      console.error('WhatsApp sharing failed:', error);
      setShareHistory(prev => [...prev, {
        method: 'WhatsApp',
        timestamp: new Date(),
        status: 'error'
      }]);
      toast.error('Failed to share via WhatsApp. Please try again.');
    } finally {
      setIsSharing(false);
    }
  }, [customerPhone, receiptData, uploadPDFToStorage]);

  // Share via SMS
  const shareViaSMS = useCallback(async () => {
    setIsSharing(true);
    try {
      const phoneNumber = customerPhone || receiptData.customer?.phone;
      if (!phoneNumber) {
        throw new Error('No customer phone number available');
      }

      const message = `Receipt ${receiptData.receiptNumber}\nAmount: ${format.money(receiptData.totals.grandTotal)}\nThank you for your business!`;

      await smsService.sendSMS(phoneNumber, message);

      setShareHistory(prev => [...prev, {
        method: 'SMS',
        timestamp: new Date(),
        status: 'success'
      }]);

      toast.success('Receipt shared via SMS successfully!');
    } catch (error) {
      console.error('SMS sharing failed:', error);
      setShareHistory(prev => [...prev, {
        method: 'SMS',
        timestamp: new Date(),
        status: 'error'
      }]);
      toast.error('Failed to share via SMS. Please try again.');
    } finally {
      setIsSharing(false);
    }
  }, [customerPhone, receiptData]);

  // Download PDF
  const downloadPDF = useCallback(async () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptData.receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded successfully!');
    }
  }, [pdfBlob, receiptData.receiptNumber]);

  // Generate PDF on mount
  React.useEffect(() => {
    if (isOpen && !pdfBlob) {
      setIsGenerating(true);
      generatePDF()
        .then(setPdfBlob)
        .catch(error => {
          console.error('PDF generation failed:', error);
          toast.error('Failed to generate PDF receipt');
        })
        .finally(() => setIsGenerating(false));
    }
  }, [isOpen, pdfBlob, generatePDF]);

  // Auto-share if requested
  React.useEffect(() => {
    if (autoShare && pdfBlob && !isSharing) {
      shareViaWhatsApp(pdfBlob);
    }
  }, [autoShare, pdfBlob, shareViaWhatsApp, isSharing]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Receipt Generator</h2>
              <p className="text-sm text-gray-600">Generate and share professional receipts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Left Panel - Controls */}
          <div className="w-80 border-r border-gray-200 p-6 space-y-6">
            {/* Template Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Receipt Template</h3>
              <div className="space-y-2">
                {receiptTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{template.preview}</span>
                      <div>
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-gray-600">{template.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Share Options */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Share Receipt</h3>
              <div className="space-y-2">
                <button
                  onClick={() => pdfBlob && shareViaWhatsApp(pdfBlob)}
                  disabled={!pdfBlob || isSharing}
                  className="w-full flex items-center gap-3 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSharing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  <span className="font-medium">Share via WhatsApp</span>
                </button>

                <button
                  onClick={shareViaSMS}
                  disabled={isSharing}
                  className="w-full flex items-center gap-3 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="font-medium">Send via SMS</span>
                </button>

                <button
                  onClick={downloadPDF}
                  disabled={!pdfBlob}
                  className="w-full flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="font-medium">Download PDF</span>
                </button>
              </div>
            </div>

            {/* Share History */}
            {shareHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Share History</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {shareHistory.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {entry.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-gray-600">{entry.method}</span>
                      <span className="text-xs text-gray-500">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Receipt Preview */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Receipt Preview</h3>
              {isGenerating && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </div>
              )}
            </div>

            {/* Receipt Content */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div
                ref={receiptRef}
                className="bg-white rounded border shadow-sm p-8 max-w-2xl mx-auto"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  minHeight: '400px'
                }}
              >
                <ReceiptTemplateRenderer
                  template={selectedTemplate}
                  data={receiptData}
                  businessInfo={businessInfo}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Receipt Template Renderer Component
interface ReceiptTemplateRendererProps {
  template: string;
  data: ReceiptData;
  businessInfo?: any;
}

const ReceiptTemplateRenderer: React.FC<ReceiptTemplateRendererProps> = ({
  template,
  data,
  businessInfo
}) => {
  const renderModernTemplate = () => (
    <ModernReceiptTemplate data={data} businessInfo={businessInfo} />
  );

  const renderCompactTemplate = () => (
    <ModernReceiptTemplate data={data} businessInfo={businessInfo} settings={{ variant: 'compact' }} />
  );

  const renderDetailedTemplate = () => (
    <ModernReceiptTemplate data={data} businessInfo={businessInfo} settings={{ variant: 'detailed' }} />
  );

  switch (template) {
    case 'modern':
      return renderModernTemplate();
    case 'compact':
      return renderCompactTemplate();
    case 'detailed':
      return renderDetailedTemplate();
    default:
      return renderModernTemplate();
  }
};

export default PDFReceiptGenerator;
