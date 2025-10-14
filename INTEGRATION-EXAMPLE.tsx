/**
 * INTEGRATION EXAMPLE - How to Add Notifications to Your POS Payment Flow
 * 
 * This file shows practical examples of integrating the notification system
 * Copy and adapt these examples to your actual payment completion handlers
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { notificationSettingsService, InvoiceData } from './src/services/notificationSettingsService';
import { useNotificationSettings } from './src/hooks/useNotificationSettings';
import SendInvoiceButtons from './src/features/lats/components/pos/SendInvoiceButtons';

// ============================================
// EXAMPLE 1: Simple Auto-Send After Payment
// ============================================

export const SimplePaymentHandler = () => {
  const handlePaymentComplete = async (saleData: any) => {
    console.log('💳 Payment completed:', saleData);

    // Prepare invoice data
    const invoice: InvoiceData = {
      invoice_no: saleData.invoice_no || `INV-${Date.now()}`,
      business_name: 'My Store',
      business_phone: '+255 123 456 789',
      business_logo: '', // Optional
      customer_name: saleData.customer_name || 'Walk-in Customer',
      customer_phone: saleData.customer_phone || '',
      customer_email: saleData.customer_email || '',
      items: saleData.items || [],
      subtotal: saleData.subtotal || 0,
      tax: saleData.tax || 0,
      discount: saleData.discount || 0,
      total: saleData.total || 0,
      paid: saleData.paid || 0,
      balance: saleData.balance || 0,
      date: new Date().toLocaleDateString(),
      payment_method: saleData.payment_method || 'Cash',
    };

    // Auto-send invoices based on settings
    const results = await notificationSettingsService.autoSendInvoice(invoice);

    // Show feedback
    if (results.whatsapp?.success) {
      console.log('✅ WhatsApp invoice sent!');
    }
    if (results.sms?.success) {
      console.log('✅ SMS invoice sent!');
    }
    if (results.email?.success) {
      console.log('✅ Email invoice sent!');
    }
  };

  return null; // This is just an example
};

// ============================================
// EXAMPLE 2: Payment Success Modal with Manual Send Buttons
// ============================================

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: any;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  onClose,
  saleData,
}) => {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  useEffect(() => {
    if (isOpen && saleData) {
      // Prepare invoice data
      const invoice: InvoiceData = {
        invoice_no: saleData.invoice_no || `INV-${Date.now()}`,
        business_name: 'My Store',
        business_phone: '+255 123 456 789',
        customer_name: saleData.customer_name || 'Walk-in Customer',
        customer_phone: saleData.customer_phone || '',
        customer_email: saleData.customer_email || '',
        items: saleData.items || [],
        subtotal: saleData.subtotal || 0,
        tax: saleData.tax || 0,
        discount: saleData.discount || 0,
        total: saleData.total || 0,
        paid: saleData.paid || 0,
        balance: saleData.balance || 0,
        date: new Date().toLocaleDateString(),
        payment_method: saleData.payment_method || 'Cash',
      };

      setInvoiceData(invoice);

      // Auto-send if enabled
      notificationSettingsService.autoSendInvoice(invoice);
    }
  }, [isOpen, saleData]);

  if (!isOpen || !invoiceData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h2>
          <p className="text-gray-600">
            Invoice: {invoiceData.invoice_no}
          </p>
        </div>

        {/* Payment Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Total:</span>
            <span className="font-semibold">{invoiceData.total.toLocaleString()} TZS</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Paid:</span>
            <span className="font-semibold text-green-600">{invoiceData.paid.toLocaleString()} TZS</span>
          </div>
          {invoiceData.balance > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Balance:</span>
              <span className="font-semibold text-amber-600">{invoiceData.balance.toLocaleString()} TZS</span>
            </div>
          )}
        </div>

        {/* Send Invoice Buttons - Only shows for manual send channels */}
        <SendInvoiceButtons
          invoiceData={invoiceData}
          onSent={() => {
            console.log('Invoice sent from modal!');
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ============================================
// EXAMPLE 3: Using the Hook in a Component
// ============================================

export const PaymentFlowWithHook = () => {
  const [saleData, setSaleData] = useState<any>(null);
  const {
    settings,
    sending,
    sendWhatsApp,
    sendSMS,
    autoSendInvoice,
    hasAutoSend,
    hasManualSend,
  } = useNotificationSettings();

  const handlePayment = async (paymentData: any) => {
    // Process payment...
    console.log('Processing payment...', paymentData);

    // Prepare invoice
    const invoice: InvoiceData = {
      invoice_no: `INV-${Date.now()}`,
      business_name: 'My Store',
      business_phone: '+255 123 456 789',
      customer_name: paymentData.customer_name,
      customer_phone: paymentData.customer_phone,
      items: paymentData.items,
      total: paymentData.total,
      paid: paymentData.paid,
      balance: paymentData.balance,
      date: new Date().toLocaleDateString(),
    };

    setSaleData(invoice);

    // Check if auto-send is enabled
    if (hasAutoSend()) {
      console.log('🤖 Auto-sending invoices...');
      const results = await autoSendInvoice(invoice);

      // Show summary
      const sentChannels = [];
      if (results.whatsapp?.success) sentChannels.push('WhatsApp');
      if (results.sms?.success) sentChannels.push('SMS');
      if (results.email?.success) sentChannels.push('Email');

      if (sentChannels.length > 0) {
        toast.success(`Invoice sent via ${sentChannels.join(', ')}! ✅`);
      }
    } else if (hasManualSend()) {
      // Show manual send UI
      console.log('👉 Show manual send buttons');
    }
  };

  return (
    <div className="p-6">
      {/* Your payment UI */}
      <button
        onClick={() =>
          handlePayment({
            customer_name: 'John Doe',
            customer_phone: '+255712345678',
            items: [{ name: 'Product 1', quantity: 2, price: 10000 }],
            total: 20000,
            paid: 20000,
            balance: 0,
          })
        }
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Complete Payment
      </button>

      {/* Manual send buttons */}
      {saleData && hasManualSend() && (
        <div className="mt-4 space-y-2">
          {settings.whatsappEnabled && !settings.whatsappAutoSend && (
            <button
              onClick={() => sendWhatsApp(saleData)}
              disabled={sending}
              className="px-4 py-2 bg-green-500 text-white rounded w-full"
            >
              {sending ? 'Sending...' : '📱 Send WhatsApp Invoice'}
            </button>
          )}

          {settings.smsEnabled && !settings.smsAutoSend && (
            <button
              onClick={() => sendSMS(saleData)}
              disabled={sending}
              className="px-4 py-2 bg-blue-500 text-white rounded w-full"
            >
              {sending ? 'Sending...' : '📲 Send SMS Invoice'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// EXAMPLE 4: Real-World POS Payment Flow
// ============================================

export const CompletePOSPaymentFlow = () => {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);

  const processPayment = async (cart: any[], customer: any, paymentMethod: string) => {
    try {
      // 1. Calculate totals
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const tax = subtotal * 0.18; // 18% tax
      const total = subtotal + tax;

      // 2. Save to database
      const saleData = {
        invoice_no: `INV-${Date.now()}`,
        customer_id: customer?.id,
        customer_name: customer?.name || 'Walk-in Customer',
        customer_phone: customer?.phone || '',
        customer_email: customer?.email || '',
        items: cart,
        subtotal,
        tax,
        total,
        paid: total,
        balance: 0,
        payment_method: paymentMethod,
        date: new Date().toISOString(),
      };

      // TODO: Save to database
      console.log('💾 Saving sale to database...', saleData);

      // 3. Prepare invoice data
      const invoice: InvoiceData = {
        invoice_no: saleData.invoice_no,
        business_name: 'My Store',
        business_phone: '+255 123 456 789',
        customer_name: saleData.customer_name,
        customer_phone: saleData.customer_phone,
        customer_email: saleData.customer_email,
        items: saleData.items,
        subtotal: saleData.subtotal,
        tax: saleData.tax,
        total: saleData.total,
        paid: saleData.paid,
        balance: saleData.balance,
        date: new Date().toLocaleDateString(),
        payment_method: saleData.payment_method,
      };

      // 4. Auto-send invoices if enabled
      const results = await notificationSettingsService.autoSendInvoice(invoice);
      
      // Log results
      console.log('📨 Notification results:', results);

      // 5. Show success modal
      setCompletedSale(saleData);
      setShowSuccessModal(true);

      // 6. Show success toast
      toast.success('Payment completed successfully! ✅');

      return { success: true, sale: saleData };
    } catch (error) {
      console.error('❌ Payment failed:', error);
      toast.error('Payment failed. Please try again.');
      return { success: false, error };
    }
  };

  return (
    <div>
      {/* Your POS UI */}
      
      {/* Payment Success Modal */}
      {showSuccessModal && completedSale && (
        <PaymentSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          saleData={completedSale}
        />
      )}
    </div>
  );
};

// ============================================
// EXAMPLE 5: Check Settings Before Showing UI
// ============================================

export const ConditionalUIExample = () => {
  const settings = notificationSettingsService.getSettings();

  return (
    <div className="p-6">
      {/* Show auto-send indicator */}
      {(settings.whatsappAutoSend || settings.smsAutoSend) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-green-800">
            🤖 Invoices will be sent automatically via:
            {settings.whatsappAutoSend && ' WhatsApp'}
            {settings.smsAutoSend && ' SMS'}
          </p>
        </div>
      )}

      {/* Show manual send reminder */}
      {notificationSettingsService.hasManualSendEnabled() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-800">
            👉 Remember to send invoices manually after payment
          </p>
        </div>
      )}

      {/* Show if notifications are disabled */}
      {!settings.whatsappEnabled && !settings.smsEnabled && !settings.emailEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-amber-800">
            ⚠️ All notifications are disabled. Enable in Settings → Notifications
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================
// EXAMPLE 6: Preview Messages Before Sending
// ============================================

export const PreviewExample = () => {
  const { getWhatsAppPreview, getSMSPreview } = useNotificationSettings();

  const sampleInvoice: InvoiceData = {
    invoice_no: 'INV-2024-001',
    business_name: 'My Store',
    business_phone: '+255 123 456 789',
    customer_name: 'John Doe',
    customer_phone: '+255 712 345 678',
    items: [
      { name: 'Product 1', quantity: 2, price: 10000 },
      { name: 'Product 2', quantity: 1, price: 25000 },
    ],
    subtotal: 45000,
    tax: 4500,
    total: 49500,
    paid: 30000,
    balance: 19500,
    date: new Date().toLocaleDateString(),
  };

  const whatsappPreview = getWhatsAppPreview(sampleInvoice);
  const smsPreview = getSMSPreview(sampleInvoice);

  return (
    <div className="p-6 space-y-6">
      {/* WhatsApp Preview */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">📱 WhatsApp Preview</h3>
        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
          {whatsappPreview}
        </pre>
      </div>

      {/* SMS Preview */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">📲 SMS Preview</h3>
        <p className="text-sm bg-gray-50 p-4 rounded">{smsPreview}</p>
        <p className="text-xs text-gray-500 mt-2">
          Character count: {smsPreview.length} / 160
        </p>
      </div>
    </div>
  );
};

// ============================================
// NOTES FOR INTEGRATION
// ============================================

/**
 * WHERE TO INTEGRATE:
 * 
 * 1. Find your payment completion handler
 *    - Usually in POSPage, PaymentModal, or similar component
 *    - Look for where payment is processed and sale is saved
 * 
 * 2. Add auto-send call
 *    - After successful payment
 *    - After saving to database
 *    - Use notificationSettingsService.autoSendInvoice(invoice)
 * 
 * 3. Add manual send buttons
 *    - In payment success modal
 *    - Use <SendInvoiceButtons> component
 *    - Or create custom buttons with useNotificationSettings hook
 * 
 * 4. Test thoroughly
 *    - Test auto-send
 *    - Test manual send
 *    - Test preview feature
 *    - Test with/without customer phone
 *    - Test all notification channels
 */

/**
 * COMMON INTEGRATION POINTS:
 * 
 * ✅ POSPageOptimized.tsx - Main POS page
 * ✅ PaymentModal.tsx - Payment processing modal
 * ✅ PaymentSuccessModal.tsx - Success confirmation
 * ✅ ShareReceiptModal.tsx - Receipt sharing
 * ✅ SalesService.ts - Sales processing service
 */

export default {
  SimplePaymentHandler,
  PaymentSuccessModal,
  PaymentFlowWithHook,
  CompletePOSPaymentFlow,
  ConditionalUIExample,
  PreviewExample,
};

