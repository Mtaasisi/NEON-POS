import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Smartphone, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import MobileFullScreenSheet from './MobileFullScreenSheet';
import { formatCurrency } from '../../../lib/currencyUtils';

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
  // Default payment methods (simplified for mobile)
  const paymentMethods: PaymentMethod[] = [
    { id: 'cash', name: 'Cash', type: 'cash', icon: '💵' },
    { id: 'mpesa', name: 'M-Pesa', type: 'mobile_money', icon: '📱' },
    { id: 'card', name: 'Card', type: 'card', icon: '💳' },
  ];

  const [selectedMethod, setSelectedMethod] = useState(paymentMethods[0]?.id || 'cash');
  const [amountPaid, setAmountPaid] = useState(amount.toString());
  const [reference, setReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMethod(paymentMethods[0]?.id || 'cash');
      setAmountPaid(amount.toString());
      setReference('');
      setIsProcessing(false);
    }
  }, [isOpen, amount]);

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

      const payments = [{
        paymentMethod: selectedMethodData?.name || 'Cash',
        amount: paid,
        // For simplicity, using method ID directly for now. Real accounts would need more logic.
        paymentAccountId: selectedMethod,
        reference: reference || '',
        notes: '',
        timestamp: new Date().toISOString()
      }];

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

  return (
    <MobileFullScreenSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Payment"
      rightButtonText={isProcessing ? 'Processing...' : 'Done'}
      rightButtonDisabled={isProcessing || !selectedMethod || parseFloat(amountPaid) < amount}
      onRightButtonClick={handleSubmit}
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-safe-bottom bg-neutral-100">
        {/* Amount Display */}
        <div className="px-4 py-6 bg-white border-b border-neutral-200 text-center">
          <div className="text-[13px] text-neutral-500 uppercase tracking-wide mb-2">
            Total Amount
          </div>
          <div className="text-[40px] font-bold text-neutral-900">
            {formatCurrency(amount)}
          </div>
          {customerName && (
            <div className="text-[15px] text-neutral-600 mt-2">
              for {customerName}
            </div>
          )}
        </div>

        {/* Payment Method Selection */}
        <div className="mx-4 mt-4">
          <div className="text-[13px] text-neutral-500 uppercase tracking-wide font-semibold mb-3">
            Payment Method
          </div>
          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map((method) => {
              const isSelected = selectedMethod === method.id;
              
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{method.icon}</div>
                  <div className={`text-[14px] font-medium ${
                    isSelected ? 'text-primary-600' : 'text-neutral-900'
                  }`}>
                    {method.name}
                  </div>
                  {isSelected && (
                    <div className="mt-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={14} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount Input */}
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100">
            <div className="text-[15px] font-medium text-neutral-500 mb-1 block">
              Amount Received
            </div>
            <div className="relative">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 text-neutral-500 text-[17px] font-medium">
                TSh
              </div>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-[17px] font-medium text-neutral-900 bg-transparent border-0 focus:outline-none focus:ring-0"
                style={{ WebkitAppearance: 'none' }}
              />
            </div>
          </div>
          
          {/* Change Due */}
          {changeDue > 0 && (
            <div className="px-4 py-3 bg-success-50 border-t border-success-200">
              <div className="flex items-center justify-between">
                <span className="text-[15px] text-success-700 font-medium">Change Due:</span>
                <span className="text-[18px] text-success-700 font-bold">
                  {formatCurrency(changeDue)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Reference (Optional) */}
        {selectedMethod !== 'cash' && (
          <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3">
              <div className="text-[15px] font-medium text-neutral-500 mb-1 block">
                Reference / Transaction ID (Optional)
              </div>
              <input
                type="text"
                placeholder="Enter reference number"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-[16px] text-neutral-900"
                style={{ WebkitAppearance: 'none' }}
              />
            </div>
          </div>
        )}

        {/* Quick Amount Buttons */}
        <div className="mx-4 mt-4">
          <div className="text-[13px] text-neutral-500 uppercase tracking-wide font-semibold mb-3">
            Quick Amount
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[amount, 5000, 10000, 20000, 50000, 100000].map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => setAmountPaid(quickAmount.toString())}
                className="px-3 py-2 bg-neutral-100 text-neutral-900 rounded-lg text-[13px] font-medium hover:bg-neutral-200 active:bg-neutral-300 transition-colors"
              >
                {quickAmount >= 1000 ? `${(quickAmount / 1000)}K` : quickAmount}
              </button>
            ))}
          </div>
        </div>
      </div>
    </MobileFullScreenSheet>
  );
};

export default MobilePaymentModal;
