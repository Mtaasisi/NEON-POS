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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
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
      `}</style>

      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '32px',
          maxWidth: 500,
          width: '90%',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <X size={20} color="#6b7280" />
        </button>

        {/* Title */}
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#111827',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Share Receipt
        </h2>

        <p
          style={{
            fontSize: 14,
            color: '#6b7280',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          Receipt #{receiptData.receiptNumber}
        </p>

        {/* Loading Overlay */}
        {isSending && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Loader2
              size={48}
              color="#0088cc"
              style={{
                animation: 'spin 1s linear infinite',
              }}
            />
            <p
              style={{
                marginTop: 16,
                fontSize: 16,
                fontWeight: 600,
                color: '#374151',
              }}
            >
              Sending {sendingMethod}...
            </p>
            <p
              style={{
                marginTop: 8,
                fontSize: 14,
                color: '#6b7280',
              }}
            >
              Please wait
            </p>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Sharing options grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 20,
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
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 12,
                  background: '#fff',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isSending ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSending) {
                    e.currentTarget.style.borderColor = option.color;
                    e.currentTarget.style.background = `${option.color}08`;
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 8px 16px ${option.color}20`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSending) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: `${option.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Icon size={24} color={option.color} strokeWidth={2} />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#374151',
                  }}
                >
                  {option.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Customer info if available */}
        {(receiptData.customerPhone || receiptData.customerEmail) && (
          <div
            style={{
              padding: 12,
              background: '#f9fafb',
              borderRadius: 8,
              fontSize: 13,
              color: '#6b7280',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4, color: '#374151' }}>
              Customer:
            </div>
            {receiptData.customerName && <div>{receiptData.customerName}</div>}
            {receiptData.customerPhone && <div>{receiptData.customerPhone}</div>}
            {receiptData.customerEmail && <div>{receiptData.customerEmail}</div>}
          </div>
        )}
      </div>
      
      {/* Success Modal for SMS Sent */}
      <SuccessModal {...successModal.props} />
    </div>,
    document.body
  );
};

export default ShareReceiptModal;

