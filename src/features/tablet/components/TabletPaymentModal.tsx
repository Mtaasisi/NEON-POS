import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, CheckCircle, Plus } from 'lucide-react';
import { format } from '../../lats/lib/format';
import { usePaymentAccounts } from '../../../hooks/usePaymentAccounts';
import { FinanceAccount } from '../../../lib/financeAccountService';

interface TabletPaymentModalProps {
  amount: number;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  onChangeDiscount: (value: number) => void;
  onChangeDiscountType: (type: 'percentage' | 'fixed') => void;
  onClose: () => void;
  onComplete: (payments: any[], totalPaid: number) => void;
}

interface Payment {
  paymentMethod: string;
  paymentAccountId?: string;
  amount: number;
  reference?: string;
  timestamp?: string;
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
  const { paymentAccounts, loading: accountsLoading } = usePaymentAccounts();

  // Helper functions declared before state variables
  const parseNumber = (value: string) => parseFloat(value.replace(/,/g, '')) || 0;
  const formatNumber = (value: number) => value.toLocaleString();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<string>('');
  const [amountInput, setAmountInput] = useState(amount.toLocaleString());
  const [reference, setReference] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [discountEnabled, setDiscountEnabled] = useState(discountValue > 0);
  const [discountInput, setDiscountInput] = useState(formatNumber(discountValue || 0));

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = Math.max(0, amount - totalPaid);
  const change = Math.max(0, totalPaid - amount);

  // Force discount type to TSh (fixed) for tablet flow
  useEffect(() => {
    onChangeDiscountType('fixed');
  }, [onChangeDiscountType]);

  // Sync discount toggle when parent discount value changes
  useEffect(() => {
    setDiscountEnabled((discountValue || 0) > 0);
    // keep local display in sync with incoming value
    setDiscountInput(formatNumber(discountValue || 0));
  }, [discountValue]);

  // Keep amount input in sync if parent total changes (e.g., discount edits)
  useEffect(() => {
    setAmountInput(formatNumber(amount));
  }, [amount]);

  // Filter to only show active payment methods
  const activePaymentAccounts = paymentAccounts.filter(account => account.is_payment_method && account.is_active);

  // Fallback payment methods if no accounts are loaded
  const fallbackPaymentMethods = [
    { id: 'cash', name: 'Cash', type: 'cash' },
    { id: 'card', name: 'Card', type: 'credit_card' },
    { id: 'mobile_money', name: 'Mobile Money', type: 'mobile_money' },
    { id: 'bank_transfer', name: 'Bank Transfer', type: 'bank' },
    { id: 'check', name: 'Check', type: 'other' },
  ];

  // Use fallback if no payment accounts are loaded
  const availablePaymentMethods = activePaymentAccounts.length > 0 ? activePaymentAccounts : fallbackPaymentMethods;

  // Set default payment method when accounts load
  useEffect(() => {
    if (availablePaymentMethods.length > 0 && !currentPaymentMethod) {
      setCurrentPaymentMethod(availablePaymentMethods[0].id);
    }
  }, [availablePaymentMethods, currentPaymentMethod]);


  const addPayment = () => {
    const paymentAmount = parseNumber(amountInput);
    if (paymentAmount <= 0) return;

    const selectedMethod = availablePaymentMethods.find(method => method.id === currentPaymentMethod);
    if (!selectedMethod) return;

    const newPayment: Payment = {
      paymentMethod: selectedMethod.name,
      paymentAccountId: activePaymentAccounts.length > 0 ? selectedMethod.id : undefined, // Only set accountId if we have real accounts
      amount: paymentAmount,
      reference: reference || undefined,
      timestamp: new Date().toISOString(),
    };

    setPayments([...payments, newPayment]);
    setAmountInput('0');
    setReference('');
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const completePayment = async () => {
    if (totalPaid < amount) {
      alert('Total payment must be at least the sale amount');
      return;
    }

    setShowSuccess(true);

    // Simulate processing delay
    setTimeout(() => {
      onComplete(payments, totalPaid);
    }, 1500);
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-4">
            Payment of {format.currency(totalPaid)} has been processed successfully.
          </p>
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Payment</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="flex max-h-[calc(90vh-80px)]">
          {/* Left Panel - Payment Input */}
          <div className="flex-1 p-6 border-r border-gray-200">
            <div className="space-y-6">
              {/* Amount Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Total Amount</span>
                  <span className="text-lg font-bold text-gray-900">
                    {format.currency(amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Paid</span>
                  <span className="text-lg font-semibold text-green-600">
                    {format.currency(totalPaid)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Remaining</span>
                  <span className="text-lg font-semibold text-orange-600">
                    {format.currency(remainingAmount)}
                  </span>
                </div>
                {change > 0 && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-900">Change</span>
                    <span className="text-lg font-bold text-blue-600">
                      {format.currency(change)}
                    </span>
                  </div>
                )}
              </div>

              {/* Discount (fixed currency only) */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Discount (TSh)</p>
                    <p className="text-xs text-gray-500">Toggle to add a discount</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !discountEnabled;
                      setDiscountEnabled(next);
                      if (!next) {
                        setDiscountInput('0');
                        onChangeDiscount(0);
                      }
                    }}
                    className={`w-12 h-6 rounded-full transition-all ${
                      discountEnabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition-all ${
                        discountEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {discountEnabled && (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={discountInput}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, '');
                        const num = parseFloat(raw) || 0;
                        setDiscountInput(num.toLocaleString());
                        onChangeDiscount(num);
                      }}
                      onFocus={(e) => {
                        e.target.select();
                        setDiscountInput('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      inputMode="decimal"
                    />
                    <p className="text-xs text-gray-500">
                      Applied: {format.currency(discountValue || 0)}
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Payment Method
                </label>
                {accountsLoading ? (
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg animate-pulse">
                    <div className="h-5 bg-gray-300 rounded"></div>
                  </div>
                ) : (
                  <select
                    value={currentPaymentMethod}
                    onChange={(e) => setCurrentPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={accountsLoading}
                  >
                    {availablePaymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name} ({method.type.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                )}
              </div>


              {/* Amount Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Amount
                </label>
                <input
                  type="text"
                  value={amountInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '');
                    const num = parseFloat(raw) || 0;
                    setAmountInput(num.toLocaleString());
                  }}
                  onFocus={(e) => {
                    e.target.select();
                    setAmountInput('');
                  }}
                  className="w-full px-3 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>

              {/* Reference - Only show for bank transfer or mobile money */}
              {(() => {
                const selectedMethod = availablePaymentMethods.find(method => method.id === currentPaymentMethod);
                const shouldShowReference = selectedMethod?.type === 'bank' || selectedMethod?.type === 'mobile_money';

                if (!shouldShowReference) return null;

                return (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Reference (Required)
                    </label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Transaction ID, receipt number, etc."
                      required
                    />
                  </div>
                );
              })()}

              {/* Add Payment Button */}
              <button
                onClick={addPayment}
                disabled={!amountInput || parseFloat(amountInput.replace(/,/g, '')) <= 0}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Payment</span>
              </button>
            </div>
          </div>

          {/* Right Panel - Payment List */}
          <div className="w-80 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Details</h3>

            {payments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No payments added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">
                        {payment.paymentMethod}
                      </span>
                      <button
                        onClick={() => removePayment(index)}
                        className="w-6 h-6 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center transition-colors"
                      >
                        <X size={14} className="text-red-600" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Amount</span>
                      <span className="font-semibold text-gray-900">
                        {format.currency(payment.amount)}
                      </span>
                    </div>
                    {payment.reference && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">Ref</span>
                        <span className="text-xs text-gray-700 font-mono">
                          {payment.reference}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Complete Payment Button */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={completePayment}
                disabled={totalPaid < amount}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle size={20} />
                <span>Complete Payment</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabletPaymentModal;