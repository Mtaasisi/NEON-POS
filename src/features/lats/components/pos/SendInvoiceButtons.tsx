// Send Invoice Buttons Component - Use in Payment Success Modal
import React, { useState } from 'react';
import { MessageCircle, Send, Mail, Loader } from 'lucide-react';
import { useNotificationSettings } from '../../../../hooks/useNotificationSettings';
import { InvoiceData } from '../../../../services/notificationSettingsService';
import GlassButton from '../../../shared/components/ui/GlassButton';

interface SendInvoiceButtonsProps {
  invoiceData: InvoiceData;
  onSent?: () => void;
}

/**
 * SendInvoiceButtons Component
 * 
 * Display buttons to manually send invoices via WhatsApp, SMS, or Email
 * Only shows buttons for channels that are enabled but not auto-sending
 * 
 * Usage:
 * ```tsx
 * <SendInvoiceButtons 
 *   invoiceData={invoiceData} 
 *   onSent={() => console.log('Invoice sent!')}
 * />
 * ```
 */
export const SendInvoiceButtons: React.FC<SendInvoiceButtonsProps> = ({
  invoiceData,
  onSent
}) => {
  const { settings, sending, sendWhatsApp, sendSMS, sendEmail } = useNotificationSettings();
  const [sendingChannel, setSendingChannel] = useState<string | null>(null);

  const handleSendWhatsApp = async () => {
    setSendingChannel('whatsapp');
    const result = await sendWhatsApp(invoiceData);
    setSendingChannel(null);
    if (result.success && onSent) {
      onSent();
    }
  };

  const handleSendSMS = async () => {
    setSendingChannel('sms');
    const result = await sendSMS(invoiceData);
    setSendingChannel(null);
    if (result.success && onSent) {
      onSent();
    }
  };

  const handleSendEmail = async () => {
    setSendingChannel('email');
    const result = await sendEmail(invoiceData);
    setSendingChannel(null);
    if (result.success && onSent) {
      onSent();
    }
  };

  // Don't show anything if all channels are auto-send or disabled
  const showWhatsApp = settings.whatsappEnabled && !settings.whatsappAutoSend;
  const showSMS = settings.smsEnabled && !settings.smsAutoSend;
  const showEmail = settings.emailEnabled && !settings.emailAutoSend;

  if (!showWhatsApp && !showSMS && !showEmail) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Send Invoice</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* WhatsApp Button */}
        {showWhatsApp && invoiceData.customer_phone && (
          <GlassButton
            onClick={handleSendWhatsApp}
            disabled={sending}
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white"
          >
            {sendingChannel === 'whatsapp' ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </>
            )}
          </GlassButton>
        )}

        {/* SMS Button */}
        {showSMS && invoiceData.customer_phone && (
          <GlassButton
            onClick={handleSendSMS}
            disabled={sending}
            className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            {sendingChannel === 'sms' ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                SMS
              </>
            )}
          </GlassButton>
        )}

        {/* Email Button */}
        {showEmail && invoiceData.customer_email && (
          <GlassButton
            onClick={handleSendEmail}
            disabled={sending}
            className="flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white"
          >
            {sendingChannel === 'email' ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Email
              </>
            )}
          </GlassButton>
        )}
      </div>

      {/* Helper text */}
      {!invoiceData.customer_phone && (showWhatsApp || showSMS) && (
        <p className="text-xs text-amber-600">
          ⚠️ Customer phone number required for WhatsApp/SMS
        </p>
      )}
      {!invoiceData.customer_email && showEmail && (
        <p className="text-xs text-amber-600">
          ⚠️ Customer email required for Email invoice
        </p>
      )}
    </div>
  );
};

export default SendInvoiceButtons;

