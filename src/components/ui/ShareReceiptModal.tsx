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

interface ShareReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrintReceipt?: () => void;
  receiptData: {
    receiptNumber: string;
    amount: number;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    items?: Array<{ productName: string; quantity: number; totalPrice: number }>;
  };
}

const ShareReceiptModal: React.FC<ShareReceiptModalProps> = ({
  isOpen,
  onClose,
  onPrintReceipt,
  receiptData,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [sendingMethod, setSendingMethod] = useState<string>('');
  const successModal = useSuccessModal();

  if (!isOpen) return null;

  const generateReceiptText = () => {
    const lines = [
      '🧾 RECEIPT #' + receiptData.receiptNumber,
      '📅 ' + new Date().toLocaleDateString() + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      '',
    ];

    if (receiptData.items && receiptData.items.length > 0) {
      lines.push('📦 Items: ' + receiptData.items.length);
      receiptData.items.forEach((item, index) => {
        const itemLine = `${index + 1}. ${item.productName}${item.quantity > 1 ? ' x' + item.quantity : ''} - ${item.totalPrice.toLocaleString()} TZS`;
        lines.push(itemLine);
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
    h1 { text-align: center; color: #333; }
    .receipt-info { margin: 20px 0; }
    .items { margin: 20px 0; border-top: 2px dashed #ccc; border-bottom: 2px dashed #ccc; padding: 10px 0; }
    .item { margin: 5px 0; }
    .total { font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>RECEIPT</h1>
  <div class="receipt-info">
    <div>Receipt #: ${receiptData.receiptNumber}</div>
    <div>Date: ${new Date().toLocaleDateString()}</div>
    <div>Time: ${new Date().toLocaleTimeString()}</div>
    ${receiptData.customerName ? `<div>Customer: ${receiptData.customerName}</div>` : ''}
  </div>
  <div class="items">
    <h3>Items:</h3>
    ${receiptData.items?.map(item => `
      <div class="item">
        ${item.productName} (x${item.quantity}) - ${item.totalPrice.toLocaleString()} TZS
      </div>
    `).join('') || ''}
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
      onClick: () => {
        const html = generateReceiptHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${receiptData.receiptNumber}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/40 animate-fadeIn"
      onClick={onClose}
    >
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
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-10"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Header Section with Gradient */}
        <div className="p-8 text-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%)',
              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 24px'
            }}
          >
            <Share2 className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Share Receipt
          </h2>
          <p className="text-base text-gray-600">
            Receipt #{receiptData.receiptNumber}
          </p>
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

        {/* Sharing options grid */}
        <div className="p-6">
          <div 
            className="grid grid-cols-3 gap-3 mb-5"
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

          {/* Customer info if available */}
          {(receiptData.customerPhone || receiptData.customerEmail) && (
            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <div className="font-bold text-gray-800 mb-2 text-sm">
                Customer:
              </div>
              {receiptData.customerName && (
                <div className="text-sm text-gray-700 font-medium">{receiptData.customerName}</div>
              )}
              {receiptData.customerPhone && (
                <div className="text-sm text-gray-600">{receiptData.customerPhone}</div>
              )}
              {receiptData.customerEmail && (
                <div className="text-sm text-gray-600">{receiptData.customerEmail}</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Success Modal for SMS Sent */}
      <SuccessModal {...successModal.props} />
    </div>,
    document.body
  );
};

export default ShareReceiptModal;

