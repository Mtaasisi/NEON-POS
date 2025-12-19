import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Smartphone, Building2, CheckCircle, Calculator } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassButton from '../../../shared/components/ui/GlassButton';
import GlassInput from '../../../shared/components/ui/GlassInput';
import { format } from '../../lib/format';

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  icon: React.ReactNode;
  color: string;
  requiresReference?: boolean;
}

interface QuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onProcessPayment: (paymentData: any) => Promise<void>;
  isProcessing?: boolean;
}

const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  onProcessPayment,
  isProcessing = false
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(totalAmount);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [showDiscount, setShowDiscount] = useState<boolean>(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [paymentHistory, setPaymentHistory] = useState<Array<{method: string, amount: number, reference?: string}>>([]);

  // Available payment methods - simplified
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'Cash',
      type: 'cash',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-500'
    },
    {
      id: 'card',
      name: 'Card',
      type: 'card',
      icon: <CreditCard className="w-6 h-6" />,
      color: 'bg-blue-500',
      requiresReference: true
    },
    {
      id: 'mpesa',
      name: 'M-Pesa',
      type: 'mobile_money',
      icon: <Smartphone className="w-6 h-6" />,
      color: 'bg-purple-500',
      requiresReference: true
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      type: 'bank_transfer',
      icon: <Building2 className="w-6 h-6" />,
      color: 'bg-orange-500',
      requiresReference: true
    }
  ];

  // Calculate final amount after discount
  const finalAmount = totalAmount - discountAmount;
  const remainingAmount = finalAmount - totalPaid;

  useEffect(() => {
    if (isOpen) {
      // Reset form when opened
      setSelectedPaymentMethod('cash');
      setPaymentAmount(finalAmount);
      setReferenceNumber('');
      setDiscountAmount(0);
      setShowDiscount(false);
      setTotalPaid(0);
      setPaymentHistory([]);
    }
  }, [isOpen, finalAmount]);

  // Update payment amount when remaining amount changes (for partial payments)
  useEffect(() => {
    if (remainingAmount > 0 && paymentAmount > remainingAmount) {
      setPaymentAmount(remainingAmount);
    }
  }, [remainingAmount, paymentAmount]);

  const handleAddPayment = () => {
    const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);

    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (paymentAmount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    if (paymentAmount > remainingAmount) {
      toast.error(`Payment amount cannot exceed remaining amount of ${format.money(remainingAmount)}`);
      return;
    }

    if (selectedMethod.requiresReference && !referenceNumber.trim()) {
      toast.error(`Reference number required for ${selectedMethod.name}`);
      return;
    }

    // Add payment to history
    const newPayment = {
      method: selectedMethod.name,
      amount: paymentAmount,
      reference: referenceNumber || undefined
    };

    setPaymentHistory(prev => [...prev, newPayment]);
    setTotalPaid(prev => prev + paymentAmount);
    setPaymentAmount(remainingAmount - paymentAmount); // Update for next payment
    setReferenceNumber(''); // Clear reference for next payment

    toast.success(`Added ${format.money(paymentAmount)} payment`);
  };

  const handleQuickPay = async () => {
    const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);

    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    // Validate payment amount
    if (paymentAmount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    if (paymentAmount > finalAmount) {
      toast.error('Payment amount cannot exceed total amount');
      return;
    }

    // Validate reference if required
    if (selectedMethod.requiresReference && !referenceNumber.trim()) {
      toast.error(`Reference number required for ${selectedMethod.name}`);
      return;
    }

    const paymentData = {
      method: selectedMethod.type,
      amount: paymentAmount,
      totalAmount: finalAmount,
      discountAmount,
      remainingAmount: Math.max(0, remainingAmount),
      reference: referenceNumber || undefined
    };

    try {
      await onProcessPayment(paymentData);
      onClose();
      toast.success('Payment processed successfully!');
    } catch (error) {
      console.error('Payment processing failed:', error);
      toast.error('Payment failed. Please try again.');
    }
  };

  const handleCompletePayment = async () => {
    const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);

    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    // For complete payment, add the final payment to complete the transaction
    const amountToPay = remainingAmount;

    if (selectedMethod.requiresReference && !referenceNumber.trim()) {
      toast.error(`Reference number required for ${selectedMethod.name}`);
      return;
    }

    // Add final payment to history before completing
    if (amountToPay > 0) {
      const finalPayment = {
        method: selectedMethod.name,
        amount: amountToPay,
        reference: referenceNumber || undefined
      };
      setPaymentHistory(prev => [...prev, finalPayment]);
      setTotalPaid(prev => prev + amountToPay);
    }

    const paymentData = {
      method: selectedMethod.type,
      amount: amountToPay,
      totalAmount: finalAmount,
      discountAmount,
      remainingAmount: 0, // Complete payment
      reference: referenceNumber || undefined,
      allPayments: [...paymentHistory, {
        method: selectedMethod.name,
        amount: amountToPay,
        reference: referenceNumber || undefined
      }].filter(p => p.amount > 0) // Filter out any zero-amount payments
    };

    try {
      await onProcessPayment(paymentData);
      onClose();
      toast.success('Payment completed successfully!');
    } catch (error) {
      console.error('Payment processing failed:', error);
      toast.error('Payment failed. Please try again.');
    }
  };

  if (!isOpen) return null;

  const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Quick Payment</h2>
              <p className="text-blue-100 mt-1">Fast and simple checkout</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Amount Summary - Clean and Clear */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total Amount</span>
              <span className="font-semibold">{format.money(totalAmount)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-600">Discount</span>
                <span className="font-semibold text-green-600">-{format.money(discountAmount)}</span>
              </div>
            )}

            <div className="border-t pt-2 flex justify-between items-center text-lg font-bold">
              <span>Amount Due</span>
              <span className="text-blue-600">{format.money(finalAmount)}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Paid</span>
              <span className="font-semibold text-green-600">{format.money(totalPaid)}</span>
            </div>

            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-semibold">Remaining</span>
              <span className={`font-bold ${remainingAmount <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {format.money(Math.max(0, remainingAmount))}
              </span>
            </div>
          </div>

          {/* Discount Toggle - Simplified */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Add Discount</span>
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showDiscount ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showDiscount ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Discount Input - Only shown when toggled */}
          {showDiscount && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Amount (TSh)
              </label>
              <GlassInput
                type="number"
                value={discountAmount}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setDiscountAmount(value);
                  // Auto-adjust payment amount when discount changes
                  setPaymentAmount(Math.max(0, totalAmount - value));
                }}
                placeholder="0"
                className="w-full"
                min="0"
                max={totalAmount}
              />
            </div>
          )}

          {/* Payment Method Selection - Large, Touch-Friendly */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedPaymentMethod === method.id
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className={`w-12 h-12 ${method.color} rounded-lg flex items-center justify-center text-white mb-2 mx-auto`}>
                    {method.icon}
                  </div>
                  <div className="text-sm font-semibold text-center">{method.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Amount Input - Only for partial payments */}
          {remainingAmount > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Pay (required)
              </label>
              <GlassInput
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full text-lg"
                min="0"
                max={finalAmount}
              />
            </div>
          )}

          {/* Reference Number - Only when required */}
          {selectedMethod?.requiresReference && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedMethod.type === 'card' ? 'Transaction ID' :
                 selectedMethod.type === 'mpesa' ? 'M-Pesa Reference' :
                 'Reference Number'}
              </label>
              <GlassInput
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder={`Enter ${selectedMethod.type === 'card' ? 'transaction ID' : 'reference number'}`}
                className="w-full"
              />
            </div>
          )}

          {/* Payment Details - Shows payment history */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-800 mb-2">Payment Details</h4>
            {paymentHistory.length > 0 ? (
              <div className="space-y-2">
                {paymentHistory.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between bg-white rounded p-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white text-xs">
                        ✓
                      </div>
                      <div>
                        <div className="font-medium text-green-800 text-sm">{payment.method}</div>
                        {payment.reference && (
                          <div className="text-xs text-green-600">Ref: {payment.reference}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-800 text-sm">{format.money(payment.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-sm text-green-600">No payments added yet</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Two Action Buttons */}
        <div className="bg-gray-50 p-6 border-t">
          <div className="space-y-3">
            {/* Add Payment Button - For partial payments */}
            {remainingAmount > 0 && (
              <GlassButton
                onClick={handleAddPayment}
                disabled={paymentAmount <= 0 || paymentAmount > remainingAmount}
                className="w-full py-3 flex items-center justify-center space-x-2"
                variant="outline"
              >
                <Calculator className="w-5 h-5" />
                <span>Add Payment ({format.money(paymentAmount)})</span>
              </GlassButton>
            )}

            {/* Complete Payment Button - Always available */}
            <GlassButton
              onClick={handleCompletePayment}
              disabled={isProcessing}
              className="w-full py-3 flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Complete Payment</span>
                </>
              )}
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickPaymentModal;