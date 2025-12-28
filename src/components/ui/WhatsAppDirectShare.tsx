/**
 * WhatsApp Direct Share Component
 * Automatically shares PDF receipts to WhatsApp after sales
 */

import React, { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import whatsappService from '../../services/whatsappService';
import PDFReceiptGenerator, { ReceiptData } from './PDFReceiptGenerator';
import { useBusinessInfo } from '../../hooks/useBusinessInfo';

interface WhatsAppDirectShareProps {
  receiptData: ReceiptData;
  customerPhone?: string;
  autoShare?: boolean;
  onShareComplete?: (success: boolean) => void;
  showModal?: boolean;
  onClose?: () => void;
  settings?: any; // Receipt settings
}

interface ShareStatus {
  status: 'idle' | 'generating' | 'sharing' | 'success' | 'error';
  message?: string;
  timestamp?: Date;
}

const WhatsAppDirectShare: React.FC<WhatsAppDirectShareProps> = ({
  receiptData,
  customerPhone,
  autoShare = false,
  onShareComplete,
  showModal = false,
  onClose,
  settings
}) => {
  const [shareStatus, setShareStatus] = useState<ShareStatus>({ status: 'idle' });
  const [showGenerator, setShowGenerator] = useState(false);
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

  // Auto-share when component mounts with autoShare enabled
  useEffect(() => {
    if (autoShare && !customerPhone) {
      setShareStatus({
        status: 'error',
        message: 'No customer phone number provided for auto-share'
      });
      onShareComplete?.(false);
      return;
    }

    if (autoShare && customerPhone) {
      handleAutoShare();
    }
  }, [autoShare, customerPhone]);

  // Clean up old localStorage entries to prevent quota issues
  const cleanupOldStorageEntries = () => {
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
  };

  // Upload PDF to storage and get public URL (with WhatsApp media service fallback)
  const uploadPDFToStorage = async (pdfBlob: Blob): Promise<string> => {
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
  };

  const handleAutoShare = async () => {
    try {
      setShareStatus({ status: 'generating', message: 'Generating PDF receipt...' });

      // Create a temporary div for PDF generation
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);

      // Render receipt for PDF generation
      const receiptElement = (
        <div
          className="bg-white p-8 max-w-2xl"
          style={{ fontFamily: 'Arial, sans-serif', minHeight: '400px' }}
        >
          {/* Simple receipt template for auto-share */}
          <div className="text-center border-b pb-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-900">RECEIPT</h1>
            <p className="text-sm text-gray-600">#{receiptData.receiptNumber}</p>
          </div>

          <div className="space-y-4">
            {receiptData.items.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span>{item.productName} x{item.quantity}</span>
                <span className="font-medium">{item.totalPrice.toLocaleString()}</span>
              </div>
            ))}

            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>TOTAL</span>
              <span>{receiptData.totals.grandTotal.toLocaleString()}</span>
            </div>

            {receiptData.customer && (
              <div className="text-center text-sm text-gray-600">
                Customer: {receiptData.customer.name}
              </div>
            )}
          </div>
        </div>
      );

      // Use ReactDOM to render into temp div
      const ReactDOM = await import('react-dom/client');
      const root = ReactDOM.createRoot(tempDiv);
      root.render(receiptElement);

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate perfect vector-based PDF using shared utility (same as preview)
      console.log('🔄 Generating PDF with shared utility...');
      console.log('📋 Receipt data:', receiptData);
      console.log('🏢 Business info:', businessInfo);
      console.log('⚙️ Settings:', receiptSettings);

      const { generateReceiptPDF, defaultReceiptSettings } = await import('../../lib/pdfGenerator');
      const settingsToUse = receiptSettings || defaultReceiptSettings;
      console.log('🔧 Final settings to use:', settingsToUse);

      let pdfBlob: Blob | null = null;
      try {
        pdfBlob = await generateReceiptPDF(receiptData, businessInfo, settingsToUse);
        console.log('✅ PDF generated successfully, size:', pdfBlob.size, 'bytes');
      } catch (error) {
        console.error('❌ PDF generation failed:', error);
        throw error;
      }

      // Cleanup
      root.unmount();
      document.body.removeChild(tempDiv);

      try {
        setShareStatus({ status: 'sharing', message: 'Sharing via WhatsApp...' });

        // Upload PDF to storage and get public URL
        const pdfUrl = await uploadPDFToStorage(pdfBlob as Blob);

        // Generate WhatsApp caption
        const caption = `🧾 Receipt ${receiptData.receiptNumber}\n💰 Amount: TZS ${receiptData.totals.grandTotal.toLocaleString()}\n\nThank you for your business!`;

        // Send document via WhatsApp service
        await whatsappService.sendMessage(customerPhone!, caption, {
          message_type: 'document',
          media_url: pdfUrl,
          fileName: `receipt-${receiptData.receiptNumber}.pdf`
        });

        setShareStatus({
          status: 'success',
          message: 'Receipt shared successfully!',
          timestamp: new Date()
        });

        toast.success('Receipt shared via WhatsApp!');
        onShareComplete?.(true);
      } catch (error) {
      console.error('Auto-share failed:', error);
      setShareStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to share receipt',
        timestamp: new Date()
      });

      toast.error('Failed to share receipt via WhatsApp');
      onShareComplete?.(false);
    }
  };

  const handleManualShare = () => {
    setShowGenerator(true);
  };

  // Status indicator component
  const StatusIndicator = () => {
    const { status, message } = shareStatus;

    const statusConfig = {
      idle: { icon: MessageCircle, color: 'text-gray-400', bg: 'bg-gray-100' },
      generating: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100' },
      sharing: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100' },
      success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
      error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
        <Icon className={`w-4 h-4 ${config.color} ${status === 'generating' || status === 'sharing' ? 'animate-spin' : ''}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {message || getStatusText(status)}
        </span>
      </div>
    );
  };

  const getStatusText = (status: ShareStatus['status']) => {
    switch (status) {
      case 'idle': return 'Ready to share';
      case 'generating': return 'Generating PDF...';
      case 'sharing': return 'Sharing via WhatsApp...';
      case 'success': return 'Shared successfully!';
      case 'error': return 'Share failed';
      default: return 'Unknown status';
    }
  };

  // If showing modal, render the full generator
  if (showModal) {
    return (
      <PDFReceiptGenerator
        isOpen={showModal}
        onClose={onClose || (() => setShowGenerator(false))}
        receiptData={receiptData}
        customerPhone={customerPhone}
      />
    );
  }

  // If auto-share mode and not showing modal, show status indicator
  if (autoShare && !showModal) {
    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Zap className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">WhatsApp Auto-Share</div>
            <div className="text-xs text-gray-600">
              Receipt #{receiptData.receiptNumber} • {customerPhone}
            </div>
          </div>
        </div>
        <StatusIndicator />
      </div>
    );
  }

  // Manual share mode - show share button
  return (
    <div className="space-y-4">
      <button
        onClick={handleManualShare}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
      >
        <MessageCircle className="w-5 h-5" />
        Share Receipt via WhatsApp
      </button>

      {shareStatus.status !== 'idle' && (
        <div className="flex justify-center">
          <StatusIndicator />
        </div>
      )}

      {showGenerator && (
      <PDFReceiptGenerator
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        receiptData={receiptData}
        customerPhone={customerPhone}
        settings={receiptSettings}
      />
      )}
    </div>
  );
};

export default WhatsAppDirectShare;
