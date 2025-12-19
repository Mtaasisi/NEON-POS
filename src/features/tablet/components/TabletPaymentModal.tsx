import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Calculator } from 'lucide-react';
import { format } from '../../lats/lib/format';
import { usePaymentAccounts } from '../../../hooks/usePaymentAccounts';
import toast from 'react-hot-toast';


interface TabletPaymentModalProps {
  amount: number;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  onChangeDiscount: (value: number) => void;
  onChangeDiscountType: (type: 'percentage' | 'fixed') => void;
  onClose: () => void;
  onComplete: (payments: any[], totalPaid: number) => void;
}

const TabletPaymentModal: React.FC<TabletPaymentModalProps> = ({
  amount,
  discountValue,
  discountType,
  onChangeDiscount,
  onChangeDiscountType,
  onClose,
  onComplete,
}) => {
  // Debug logging for payment modal issues
  console.log('TabletPaymentModal rendered with props:', {
    amount,
    discountValue,
    discountType,
    hasOnChangeDiscount: !!onChangeDiscount,
    hasOnChangeDiscountType: !!onChangeDiscountType
  });

  const { paymentAccounts, loading: accountsLoading } = usePaymentAccounts();

  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [showDiscount, setShowDiscount] = useState<boolean>(false);
  const [localDiscountValue, setLocalDiscountValue] = useState<number>(discountValue);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [paymentHistory, setPaymentHistory] = useState<Array<{method: string, amount: number, reference?: string}>>([]);

  // Filter to only show active payment accounts
  const activePaymentAccounts = paymentAccounts.filter(account => account.is_payment_method && account.is_active);

  // Calculate the actual discount amount based on type (only when discount is enabled)
  const calculatedDiscountAmount = showDiscount ? (discountType === 'percentage'
    ? (amount * localDiscountValue) / 100
    : Math.min(localDiscountValue, amount)) : 0;

  // Calculate final amount after discount
  const finalAmount = amount - calculatedDiscountAmount;
  const remainingAmount = finalAmount - totalPaid;

  // Removed forced discount type conversion to avoid conflicts

  // Reset discount when toggle is turned off
  useEffect(() => {
    if (!showDiscount) {
      setLocalDiscountValue(0);
      onChangeDiscount(0);
    }
  }, [showDiscount, onChangeDiscount]);

  useEffect(() => {
    console.log('TabletPaymentModal: Initializing form');

    // Reset form when component mounts
    const firstAccountId = activePaymentAccounts.length > 0 ? activePaymentAccounts[0].id : null;
    setSelectedPaymentAccount(firstAccountId || '');
    setPaymentAmount(0); // Will be auto-filled when remaining amount is calculated
    setReferenceNumber('');
    setLocalDiscountValue(discountValue);
    // Show discount toggle if there's already a discount applied
    setShowDiscount(discountValue > 0);
    setTotalPaid(0);
    setPaymentHistory([]);

    console.log('TabletPaymentModal: Form initialized with first account:', firstAccountId);
  }, []); // Only run on mount to avoid resetting during prop changes

  // Auto-fill payment amount when remaining amount changes
  useEffect(() => {
    if (remainingAmount > 0 && paymentAmount === 0) {
      setPaymentAmount(remainingAmount);
    }
  }, [remainingAmount, paymentAmount]);

  const handleAddPayment = () => {
    console.log('Add Payment clicked', { paymentAmount, remainingAmount, selectedPaymentAccount, activePaymentAccounts });

    const selectedAccount = activePaymentAccounts.find(account => account.id === selectedPaymentAccount);

    if (!selectedAccount || !selectedPaymentAccount) {
      console.log('No selected account found', { selectedPaymentAccount, activePaymentAccounts });
      toast.error('Please select a payment account');
      return;
    }

    if (paymentAmount <= 0) {
      console.log('Payment amount <= 0:', paymentAmount);
      toast.error('Payment amount must be greater than 0');
      return;
    }

    if (paymentAmount > remainingAmount) {
      console.log('Payment amount > remaining amount:', { paymentAmount, remainingAmount });
      toast.error(`Payment amount cannot exceed remaining amount of ${format.currency(remainingAmount)}`);
      return;
    }

    // Check if reference is required based on account type
    const requiresReference = selectedAccount.account_type && ['credit_card', 'mobile_money', 'bank_transfer'].includes(selectedAccount.account_type);
    if (requiresReference && !referenceNumber.trim()) {
      toast.error(`Reference number required for ${selectedAccount.name}`);
      return;
    }

    // Add payment to history
    const newPayment = {
      method: selectedAccount.name,
      amount: paymentAmount,
      reference: referenceNumber || undefined
    };

    console.log('Adding payment:', newPayment);
    setPaymentHistory(prev => [...prev, newPayment]);
    setTotalPaid(prev => prev + paymentAmount);
    setPaymentAmount(0); // Reset input to 0 after adding payment
    setReferenceNumber('');

    console.log('Payment added successfully');
    toast.success(`Added ${format.currency(paymentAmount)} payment`);
  };

  const handlePayFullAmount = async () => {
    const selectedAccount = activePaymentAccounts.find(account => account.id === selectedPaymentAccount);

    if (!selectedAccount) {
      toast.error('Please select a payment account');
      return;
    }

    // Use remaining amount for full payment
    const amountToPay = remainingAmount;

    // Auto-generate reference if required but not provided
    let finalReference = referenceNumber;
    const requiresReference = selectedAccount.account_type && ['credit_card', 'mobile_money', 'bank_transfer'].includes(selectedAccount.account_type);
    if (requiresReference && !finalReference.trim()) {
      // Auto-generate a simple reference
      finalReference = `PAY-${Date.now().toString().slice(-6)}`;
    }

    const payment = {
      method: selectedAccount.name,
      amount: amountToPay,
      reference: finalReference || undefined
    };

    // Convert to the format expected by onComplete
    const paymentObjects = [{
      paymentMethod: payment.method,
      amount: payment.amount,
      reference: payment.reference
    }];

    try {
      await onComplete(paymentObjects, amountToPay);
      onClose();
      toast.success('Payment completed successfully!');
    } catch (error) {
      console.error('Payment completion failed:', error);
      toast.error('Payment failed. Please try again.');
    }
  };

  const handleCompletePayment = async () => {
    const selectedAccount = activePaymentAccounts.find(account => account.id === selectedPaymentAccount);

    if (!selectedAccount) {
      toast.error('Please select a payment account');
      return;
    }

    // For complete payment, add the final payment to complete the transaction
    const amountToPay = remainingAmount;

    // Check if reference is required based on account type
    const requiresReference = selectedAccount.account_type && ['credit_card', 'mobile_money', 'bank_transfer'].includes(selectedAccount.account_type);
    if (requiresReference && !referenceNumber.trim()) {
      toast.error(`Reference number required for ${selectedAccount.name}`);
      return;
    }

    // Add final payment to history before completing
    if (amountToPay > 0) {
      const finalPayment = {
        method: selectedAccount.name,
        amount: amountToPay,
        reference: referenceNumber || undefined
      };
      setPaymentHistory(prev => [...prev, finalPayment]);
      setTotalPaid(prev => prev + amountToPay);
    }

    const allPayments = [...paymentHistory, {
      method: selectedAccount.name,
      amount: amountToPay,
      reference: referenceNumber || undefined
    }].filter(p => p.amount > 0);

    // Convert to the format expected by onComplete
    const paymentObjects = allPayments.map(payment => ({
      paymentMethod: payment.method,
      amount: payment.amount,
      reference: payment.reference
    }));

    const totalPaidAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);

    try {
      await onComplete(paymentObjects, totalPaidAmount);
      onClose();
      toast.success('Payment completed successfully!');
    } catch (error) {
      console.error('Payment completion failed:', error);
      toast.error('Payment failed. Please try again.');
    }
  };


  const selectedAccount = activePaymentAccounts.find(account => account.id === selectedPaymentAccount);
  const requiresReference = selectedAccount?.account_type &&
    ['credit_card', 'mobile_money', 'bank_transfer'].includes(selectedAccount.account_type);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Payment</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Amount Summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            {/* Amount Due - Primary Focus */}
            <div className="text-center mb-6 pb-4 border-b border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Amount Due</div>
              <div className="text-3xl font-bold text-gray-900">{format.currency(finalAmount)}</div>
            </div>

            {/* Essential Payment Info */}
            <div className="space-y-3">
              {calculatedDiscountAmount > 0 && (
                <div className="flex justify-between items-center py-2 bg-green-50 -mx-2 px-2 rounded-lg">
                  <span className="text-green-700 font-medium">Discount Applied</span>
                  <span className="font-bold text-green-700">-{format.currency(calculatedDiscountAmount)}</span>
                </div>
              )}

              {remainingAmount > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 font-medium">Remaining to Pay</span>
                  <span className="font-bold text-gray-900">{format.currency(remainingAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Primary Actions */}
          <div className="space-y-3">
            {/* Pay Full Amount + Cancel Row */}
            <div className="grid grid-cols-2 gap-3">
              {remainingAmount > 0 && (
                <button
                  onClick={handlePayFullAmount}
                  disabled={!selectedPaymentAccount}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg text-base transition-colors flex items-center justify-center"
                >
                  Pay Full Amount
                </button>
              )}

              <button
                onClick={onClose}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg text-base transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Amount Display in Button */}
            {remainingAmount > 0 && (
              <div className="text-center py-2">
                <div className="text-lg font-bold text-gray-900">{format.currency(remainingAmount)}</div>
                <div className="text-xs text-gray-500">Full payment amount</div>
              </div>
            )}
          </div>

          {/* Secondary Options */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            {/* Discount Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Add Discount</span>
              <button
                onClick={() => setShowDiscount(!showDiscount)}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  showDiscount ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    showDiscount ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

          {/* Discount Input */}
          {showDiscount && (
            <div className="mt-3">
              <input
                type="number"
                value={localDiscountValue || ''}
                onChange={(e) => {
                  const value = Number(e.target.value) || 0;
                  const maxValue = discountType === 'percentage' ? 100 : amount;
                  const clampedValue = Math.max(0, Math.min(value, maxValue));
                  setLocalDiscountValue(clampedValue);
                  onChangeDiscount(clampedValue);
                }}
                placeholder={discountType === 'percentage' ? 'Discount % (0-100)' : 'Discount amount'}
                className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max={discountType === 'percentage' ? 100 : amount}
                step={discountType === 'percentage' ? '1' : '0.01'}
              />
              {discountType === 'percentage' && (
                <p className="text-xs text-gray-500 mt-1">
                  Discount: {format.currency(calculatedDiscountAmount)} ({localDiscountValue}%)
                </p>
              )}
            </div>
          )}

          {/* Payment Account - Auto-selected, minimal UI */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Payment Method
              </label>
              {selectedPaymentAccount && (
                <span className="text-xs text-green-600 font-medium">Auto-selected ✓</span>
              )}
            </div>
            {accountsLoading ? (
              <div className="flex gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex-1 p-2 border border-gray-200 rounded-lg animate-pulse">
                    <div className="h-3 bg-gray-300 rounded"></div>
                  </div>
                ))}
              </div>
            ) : activePaymentAccounts.length > 0 ? (
              <div className="flex gap-2">
                {activePaymentAccounts.slice(0, 3).map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedPaymentAccount(account.id)}
                    className={`flex-1 p-2 border rounded-lg text-center transition-colors text-xs ${
                      selectedPaymentAccount === account.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{account.name}</div>
                  </button>
                ))}
                {activePaymentAccounts.length > 3 && (
                  <div className="flex-1 p-2 border border-gray-200 rounded-lg text-center text-xs text-gray-500">
                    +{activePaymentAccounts.length - 3} more
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-2 text-sm text-gray-500">
                No payment accounts available
              </div>
            )}
          </div>

          {/* Manual Payment Controls - For partial payments */}
          {remainingAmount > 0 && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="text-xs text-gray-500 mb-3 text-center">
                For partial payments only
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Partial Amount
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    placeholder="Enter partial amount"
                    className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max={remainingAmount}
                  />
                </div>

                {remainingAmount > 0 ? (
                  <button
                    onClick={() => {
                      console.log('Add Payment button clicked, disabled:', paymentAmount <= 0 || paymentAmount > remainingAmount || !selectedPaymentAccount, 'values:', { paymentAmount, remainingAmount, selectedPaymentAccount });
                      handleAddPayment();
                    }}
                    disabled={paymentAmount <= 0 || paymentAmount > remainingAmount || !selectedPaymentAccount}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Partial Payment
                  </button>
                ) : (
                  <button
                    onClick={handleCompletePayment}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Complete Payment
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reference Input - Optional */}
          {requiresReference && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for auto-generated reference</p>
            </div>
          )}

          {/* Payment History - Only show if there are partial payments */}
          {paymentHistory.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <div className="p-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Partial Payments</h4>
                <div className="space-y-1">
                  {paymentHistory.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <div className="text-sm text-gray-700">{payment.method}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {format.currency(payment.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TabletPaymentModal;