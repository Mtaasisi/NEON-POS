import React, { useState, useEffect, useMemo } from 'react';
import { X, CreditCard, DollarSign, Smartphone, Building2, Wallet, Gift, Split, Calculator, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usePaymentMethods } from '../../../../hooks/usePaymentMethods';
import { useCustomers } from '../../../../context/CustomersContext';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassSelect from '../../../shared/components/ui/GlassSelect';
import GlassInput from '../../../shared/components/ui/GlassInput';
import { format } from '../../../../lib/currencyUtils';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'loyalty_points' | 'gift_card';
  icon: React.ReactNode;
  color: string;
  requiresAmount: boolean;
  requiresReference?: boolean;
}

interface SplitPayment {
  methodId: string;
  amount: number;
  reference?: string;
}

interface ComprehensivePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  discountAmount: number;
  onProcessPayment: (paymentData: any) => Promise<void>;
  selectedCustomer?: any;
  isProcessing?: boolean;
}

const ComprehensivePaymentModal: React.FC<ComprehensivePaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  discountAmount,
  onProcessPayment,
  selectedCustomer,
  isProcessing = false
}) => {
  const { paymentMethods } = usePaymentMethods();
  const { customers } = useCustomers();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(totalAmount - discountAmount);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [giftCardCode, setGiftCardCode] = useState<string>('');
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [useSplitPayment, setUseSplitPayment] = useState<boolean>(false);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [tipAmount, setTipAmount] = useState<number>(0);

  const finalAmount = useMemo(() => {
    return (totalAmount - discountAmount) + taxAmount + tipAmount;
  }, [totalAmount, discountAmount, taxAmount, tipAmount]);

  // Available payment methods
  const availablePaymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'Cash',
      type: 'cash',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'bg-green-500',
      requiresAmount: true
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      type: 'card',
      icon: <CreditCard className="w-5 h-5" />,
      color: 'bg-blue-500',
      requiresAmount: true,
      requiresReference: true
    },
    {
      id: 'mobile_money',
      name: 'Mobile Money',
      type: 'mobile_money',
      icon: <Smartphone className="w-5 h-5" />,
      color: 'bg-purple-500',
      requiresAmount: true,
      requiresReference: true
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      type: 'bank_transfer',
      icon: <Building2 className="w-5 h-5" />,
      color: 'bg-orange-500',
      requiresAmount: true,
      requiresReference: true
    }
  ];

  // Add loyalty points if customer has them
  if (selectedCustomer && selectedCustomer.points > 0) {
    availablePaymentMethods.push({
      id: 'loyalty_points',
      name: 'Loyalty Points',
      type: 'loyalty_points',
      icon: <Wallet className="w-5 h-5" />,
      color: 'bg-yellow-500',
      requiresAmount: true
    });
  }

  // Add gift card option
  availablePaymentMethods.push({
    id: 'gift_card',
    name: 'Gift Card',
    type: 'gift_card',
    icon: <Gift className="w-5 h-5" />,
    color: 'bg-pink-500',
    requiresAmount: true
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form when opened
      setSelectedPaymentMethod('');
      setPaymentAmount(finalAmount);
      setReferenceNumber('');
      setLoyaltyPoints(0);
      setGiftCardCode('');
      setSplitPayments([]);
      setUseSplitPayment(false);
      setTaxAmount(0);
      setTipAmount(0);
    }
  }, [isOpen, finalAmount]);

  const handleSinglePayment = async () => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    const selectedMethod = availablePaymentMethods.find(m => m.id === selectedPaymentMethod);
    if (!selectedMethod) {
      toast.error('Invalid payment method selected');
      return;
    }

    let paymentData: any = {
      method: selectedMethod.type,
      amount: paymentAmount,
      totalAmount: finalAmount,
      discountAmount,
      taxAmount,
      tipAmount
    };

    // Add method-specific data
    switch (selectedMethod.type) {
      case 'cash':
        // Cash payment - no additional data needed
        break;
      case 'card':
      case 'mobile_money':
      case 'bank_transfer':
        if (selectedMethod.requiresReference && !referenceNumber.trim()) {
          toast.error(`Please enter reference number for ${selectedMethod.name}`);
          return;
        }
        paymentData.reference = referenceNumber;
        break;
      case 'loyalty_points':
        if (loyaltyPoints <= 0) {
          toast.error('Please enter loyalty points to use');
          return;
        }
        if (selectedCustomer && loyaltyPoints > selectedCustomer.points) {
          toast.error('Not enough loyalty points available');
          return;
        }
        paymentData.loyaltyPoints = loyaltyPoints;
        break;
      case 'gift_card':
        if (!giftCardCode.trim()) {
          toast.error('Please enter gift card code');
          return;
        }
        paymentData.giftCardCode = giftCardCode;
        break;
    }

    try {
      await onProcessPayment(paymentData);
      onClose();
    } catch (error) {
      console.error('Payment processing failed:', error);
      // Error handling is done in the parent component
    }
  };

  const handleSplitPayment = async () => {
    const totalSplitAmount = splitPayments.reduce((sum, payment) => sum + payment.amount, 0);

    if (Math.abs(totalSplitAmount - finalAmount) > 0.01) {
      toast.error('Split payment amounts must equal the total amount');
      return;
    }

    const paymentData = {
      method: 'split',
      splitPayments,
      totalAmount: finalAmount,
      discountAmount,
      taxAmount,
      tipAmount
    };

    try {
      await onProcessPayment(paymentData);
      onClose();
    } catch (error) {
      console.error('Split payment processing failed:', error);
    }
  };

  const addSplitPayment = () => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    const selectedMethod = availablePaymentMethods.find(m => m.id === selectedPaymentMethod);
    if (!selectedMethod) return;

    const remainingAmount = finalAmount - splitPayments.reduce((sum, p) => sum + p.amount, 0);

    if (paymentAmount <= 0 || paymentAmount > remainingAmount) {
      toast.error(`Payment amount must be between 0 and ${format.money(remainingAmount)}`);
      return;
    }

    const newPayment: SplitPayment = {
      methodId: selectedPaymentMethod,
      amount: paymentAmount,
      reference: referenceNumber || undefined
    };

    setSplitPayments([...splitPayments, newPayment]);
    setPaymentAmount(finalAmount - splitPayments.reduce((sum, p) => sum + p.amount, 0) - paymentAmount);
    setReferenceNumber('');
  };

  const removeSplitPayment = (index: number) => {
    const newPayments = [...splitPayments];
    newPayments.splice(index, 1);
    setSplitPayments(newPayments);
  };

  const selectedMethod = availablePaymentMethods.find(m => m.id === selectedPaymentMethod);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Complete Payment</h2>
              <p className="text-blue-100 mt-1">Choose your payment method</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Amount Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Subtotal:</span>
                <span className="float-right font-medium">{format.money(totalAmount)}</span>
              </div>
              {discountAmount > 0 && (
                <div>
                  <span className="text-green-600">Discount:</span>
                  <span className="float-right font-medium text-green-600">-{format.money(discountAmount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div>
                  <span className="text-gray-600">Tax:</span>
                  <span className="float-right font-medium">{format.money(taxAmount)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div>
                  <span className="text-gray-600">Tip:</span>
                  <span className="float-right font-medium">{format.money(tipAmount)}</span>
                </div>
              )}
              <div className="border-t pt-2 col-span-2">
                <span className="text-lg font-bold">Total:</span>
                <span className="float-right text-lg font-bold text-blue-600">{format.money(finalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Split Payment Toggle */}
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useSplitPayment}
                onChange={(e) => setUseSplitPayment(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium">Split Payment</span>
              <Split className="w-4 h-4 text-gray-400" />
            </label>
          </div>

          {/* Payment Methods */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availablePaymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedPaymentMethod === method.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-10 h-10 ${method.color} rounded-lg flex items-center justify-center text-white mb-2 mx-auto`}>
                    {method.icon}
                  </div>
                  <div className="text-sm font-medium text-center">{method.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Details */}
          {selectedMethod && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
              <div className="space-y-4">
                {/* Amount Input */}
                {!useSplitPayment && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount</label>
                    <GlassInput
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      placeholder="Enter amount"
                      className="w-full"
                    />
                  </div>
                )}

                {/* Reference Number */}
                {selectedMethod.requiresReference && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {selectedMethod.type === 'card' ? 'Transaction ID' :
                       selectedMethod.type === 'mobile_money' ? 'Transaction Reference' :
                       'Reference Number'}
                    </label>
                    <GlassInput
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Enter reference number"
                      className="w-full"
                    />
                  </div>
                )}

                {/* Loyalty Points */}
                {selectedMethod.type === 'loyalty_points' && selectedCustomer && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Loyalty Points (Available: {selectedCustomer.points || 0})
                    </label>
                    <GlassInput
                      type="number"
                      value={loyaltyPoints}
                      onChange={(e) => setLoyaltyPoints(Number(e.target.value))}
                      placeholder="Enter points to use"
                      max={selectedCustomer.points || 0}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Gift Card */}
                {selectedMethod.type === 'gift_card' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Gift Card Code</label>
                    <GlassInput
                      type="text"
                      value={giftCardCode}
                      onChange={(e) => setGiftCardCode(e.target.value)}
                      placeholder="Enter gift card code"
                      className="w-full"
                    />
                  </div>
                )}

                {/* Tax and Tip */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tax Amount</label>
                    <GlassInput
                      type="number"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tip Amount</label>
                    <GlassInput
                      type="number"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Split Payments Display */}
          {useSplitPayment && splitPayments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Split Payments</h3>
              <div className="space-y-2">
                {splitPayments.map((payment, index) => {
                  const method = availablePaymentMethods.find(m => m.id === payment.methodId);
                  return (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 ${method?.color} rounded-lg flex items-center justify-center text-white`}>
                          {method?.icon}
                        </div>
                        <div>
                          <div className="font-medium">{method?.name}</div>
                          {payment.reference && (
                            <div className="text-sm text-gray-500">Ref: {payment.reference}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{format.money(payment.amount)}</span>
                        <button
                          onClick={() => removeSplitPayment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="text-sm text-gray-600 pt-2 border-t">
                  Remaining: {format.money(finalAmount - splitPayments.reduce((sum, p) => sum + p.amount, 0))}
                </div>
              </div>
            </div>
          )}

          {/* Add Split Payment Button */}
          {useSplitPayment && selectedMethod && (
            <div className="mb-6">
              <button
                onClick={addSplitPayment}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Payment Method
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 border-t">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={useSplitPayment ? handleSplitPayment : handleSinglePayment}
              disabled={isProcessing || (!useSplitPayment && !selectedPaymentMethod) || (useSplitPayment && splitPayments.length === 0)}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
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
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensivePaymentModal;
