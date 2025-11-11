import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, DollarSign, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePaymentMethodsContext } from '../../../context/PaymentMethodsContext';
import toast from 'react-hot-toast';

interface MobilePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  customerId?: string;
  customerName?: string;
  description?: string;
  onComplete: (payments: any[], totalPaid: number) => Promise<void>;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  icon?: string;
}

const MobilePaymentModal: React.FC<MobilePaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  customerId,
  customerName,
  description,
  onComplete
}) => {
  const { paymentMethods: contextMethods } = usePaymentMethodsContext();
  const [selectedMethod, setSelectedMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState(amount.toString());
  const [reference, setReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Default payment methods if context is empty
  const defaultMethods: PaymentMethod[] = [
    { id: 'cash', name: 'Cash', type: 'cash', icon: '💵' },
    { id: 'mpesa', name: 'M-Pesa', type: 'mobile_money', icon: '📱' },
    { id: 'card', name: 'Card', type: 'card', icon: '💳' },
    { id: 'bank', name: 'Bank Transfer', type: 'bank_transfer', icon: '🏦' }
  ];

  const paymentMethods = contextMethods && contextMethods.length > 0 
    ? contextMethods 
    : defaultMethods;

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMethod(paymentMethods[0]?.id || 'cash');
      setAmountPaid(amount.toString());
      setReference('');
      setIsProcessing(false);
    }
  }, [isOpen, amount, paymentMethods]);

  const handleSubmit = async () => {
    const paid = parseFloat(amountPaid);
    
    if (!paid || paid <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (paid < amount) {
      toast.error('Payment amount cannot be less than total');
      return;
    }

    try {
      setIsProcessing(true);

      const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod);
      
      // Create payment array matching desktop POS format
      const payments = [{
        paymentMethod: selectedMethodData?.name || 'Cash',
        amount: paid,
        paymentAccountId: null, // Will be fetched by service
        reference: reference || '',
        notes: '',
        timestamp: new Date().toISOString()
      }];

      // Call with payments array and totalPaid
      await onComplete(payments, paid);
      
      onClose();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const changeDue = parseFloat(amountPaid) - amount;

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      {/* Modal Sheet */}
      <div
        className="w-full bg-white rounded-t-[20px] max-h-[90vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-blue-500 text-[17px] font-normal disabled:opacity-50"
          >
            Cancel
          </button>
          <h2 className="text-[17px] font-semibold text-gray-900">
            Payment
          </h2>
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !selectedMethod}
            className="text-blue-500 text-[17px] font-semibold disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Done'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Amount Display */}
          <div className="px-4 py-6 bg-gray-50 border-b border-gray-200 text-center">
            <div className="text-[13px] text-gray-500 uppercase tracking-wide mb-2">
              Total Amount
            </div>
            <div className="text-[40px] font-bold text-gray-900">
              TSh {amount.toLocaleString()}
            </div>
            {customerName && (
              <div className="text-[15px] text-gray-600 mt-2">
                for {customerName}
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="px-4 py-4">
            <div className="text-[13px] text-gray-500 uppercase tracking-wide font-semibold mb-3">
              Payment Method
            </div>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const isSelected = selectedMethod === method.id;
                const icon = method.icon || (
                  method.type === 'cash' ? '💵' :
                  method.type === 'mobile_money' ? '📱' :
                  method.type === 'card' ? '💳' :
                  '🏦'
                );
                
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{icon}</div>
                    <div className={`text-[14px] font-medium ${
                      isSelected ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {method.name}
                    </div>
                    {isSelected && (
                      <div className="mt-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center mx-auto">
                        <CheckCircle2 size={14} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Input */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="text-[13px] text-gray-500 uppercase tracking-wide font-semibold mb-3">
              Amount Received
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-[20px] font-medium">
                TSh
              </div>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full pl-16 pr-4 py-4 text-[24px] font-bold text-gray-900 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ WebkitAppearance: 'none' }}
              />
            </div>
            
            {/* Change Due */}
            {changeDue > 0 && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] text-green-700 font-medium">Change Due:</span>
                  <span className="text-[18px] text-green-700 font-bold">
                    TSh {changeDue.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Reference (Optional) */}
          {selectedMethod !== 'cash' && (
            <div className="px-4 py-4 border-t border-gray-200">
              <div className="text-[13px] text-gray-500 uppercase tracking-wide font-semibold mb-3">
                Reference / Transaction ID (Optional)
              </div>
              <input
                type="text"
                placeholder="Enter reference number"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-4 py-3 text-[16px] text-gray-900 bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                style={{ WebkitAppearance: 'none' }}
              />
            </div>
          )}

          {/* Quick Amount Buttons */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="text-[13px] text-gray-500 uppercase tracking-wide font-semibold mb-3">
              Quick Amount
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[amount, 5000, 10000, 20000, 50000, 100000].map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmountPaid(quickAmount.toString())}
                  className="px-3 py-2 bg-gray-100 text-gray-900 rounded-lg text-[13px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors"
                >
                  {quickAmount >= 1000 ? `${(quickAmount / 1000)}K` : quickAmount}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="px-4 py-3 border-t border-gray-200 bg-white">
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !selectedMethod || parseFloat(amountPaid) < amount}
            className="w-full py-4 bg-blue-500 text-white rounded-xl text-[17px] font-semibold hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing...
              </div>
            ) : (
              `Complete Payment • TSh ${parseFloat(amountPaid).toLocaleString()}`
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default MobilePaymentModal;

