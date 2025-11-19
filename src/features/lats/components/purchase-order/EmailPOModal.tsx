import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Paperclip, User, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface EmailPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: any;
  supplier: any;
  onSend: (emailData: EmailData) => Promise<boolean>;
}

export interface EmailData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  message: string;
  attachPDF: boolean;
}

const EmailPOModal: React.FC<EmailPOModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  supplier,
  onSend
}) => {
  const [emailData, setEmailData] = useState<EmailData>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    message: '',
    attachPDF: true
  });
  const [isSending, setIsSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  // Block body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && supplier && purchaseOrder) {
      // Pre-fill email data
      setEmailData({
        to: supplier.email || '',
        cc: '',
        bcc: '',
        subject: `Purchase Order ${purchaseOrder.orderNumber} from ${purchaseOrder.companyName || 'Our Company'}`,
        message: generateDefaultMessage(),
        attachPDF: true
      });
    }
  }, [isOpen, supplier, purchaseOrder]);

  const generateDefaultMessage = () => {
    return `Dear ${supplier?.contact_person || supplier?.name || 'Supplier'},

We would like to place the following purchase order:

Order Number: ${purchaseOrder?.orderNumber}
Order Date: ${new Date(purchaseOrder?.createdAt || new Date()).toLocaleDateString()}
Expected Delivery: ${purchaseOrder?.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString() : 'TBD'}

Total Items: ${purchaseOrder?.items?.length || 0}
Total Amount: ${purchaseOrder?.totalAmount ? `${purchaseOrder.currency || 'TSh'} ${purchaseOrder.totalAmount.toLocaleString()}` : 'TBD'}

Please review the attached purchase order and confirm receipt.

${purchaseOrder?.notes ? `\nAdditional Notes:\n${purchaseOrder.notes}` : ''}

Best regards,
${purchaseOrder?.createdByName || 'Purchase Department'}`;
  };

  const handleSend = async () => {
    // Validation
    if (!emailData.to || !emailData.to.trim()) {
      toast.error('Please enter recipient email address');
      return;
    }

    if (!emailData.subject || !emailData.subject.trim()) {
      toast.error('Please enter email subject');
      return;
    }

    if (!emailData.message || !emailData.message.trim()) {
      toast.error('Please enter email message');
      return;
    }

    setIsSending(true);
    try {
      const success = await onSend(emailData);
      if (success) {
        toast.success('Purchase order sent successfully!');
        onClose();
      } else {
        toast.error('Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyToClipboard = () => {
    const emailContent = `To: ${emailData.to}\nSubject: ${emailData.subject}\n\n${emailData.message}`;
    navigator.clipboard.writeText(emailContent);
    toast.success('Email content copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Mail className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Email Purchase Order</h2>
                <p className="text-blue-100 text-sm">Send PO to {supplier?.name || 'supplier'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* To Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To: <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={emailData.to}
                onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                placeholder="supplier@example.com"
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>

            {/* CC/BCC Toggle */}
            <div className="flex gap-2">
              {!showCc && (
                <button
                  onClick={() => setShowCc(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Cc
                </button>
              )}
              {!showBcc && (
                <button
                  onClick={() => setShowBcc(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Bcc
                </button>
              )}
            </div>

            {/* CC Field */}
            {showCc && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cc:</label>
                <input
                  type="email"
                  value={emailData.cc}
                  onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                  placeholder="cc@example.com"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
            )}

            {/* BCC Field */}
            {showBcc && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bcc:</label>
                <input
                  type="email"
                  value={emailData.bcc}
                  onChange={(e) => setEmailData(prev => ({ ...prev, bcc: e.target.value }))}
                  placeholder="bcc@example.com"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Purchase Order..."
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message: <span className="text-red-500">*</span>
              </label>
              <textarea
                value={emailData.message}
                onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                rows={12}
                placeholder="Enter your message..."
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none font-mono text-sm"
              />
            </div>

            {/* Attachment */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Paperclip className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Attachment</p>
                <p className="text-sm text-gray-600">PO_{purchaseOrder?.orderNumber}.pdf</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailData.attachPDF}
                  onChange={(e) => setEmailData(prev => ({ ...prev, attachPDF: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Attach PDF</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSending}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={isSending}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPOModal;

