import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, AlertCircle, Calendar, CreditCard, 
  Wallet, Plus, Edit, Save, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import { Supplier, updateSupplier } from '../../../lib/supplierApi';

interface SupplierFinancialTabProps {
  supplier: Supplier;
  onUpdate?: () => void;
}

const SupplierFinancialTab: React.FC<SupplierFinancialTabProps> = ({
  supplier,
  onUpdate
}) => {
  const supplierExtended = supplier as any;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [creditLimit, setCreditLimit] = useState(supplierExtended.credit_limit || 0);
  const [currentBalance, setCurrentBalance] = useState(supplierExtended.current_balance || 0);
  const [paymentDays, setPaymentDays] = useState(supplierExtended.payment_days || 30);
  const [discountPercentage, setDiscountPercentage] = useState(supplierExtended.discount_percentage || 0);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSupplier(supplier.id, {
        credit_limit: creditLimit,
        current_balance: currentBalance,
        payment_days: paymentDays,
        discount_percentage: discountPercentage
      } as any);

      toast.success('Financial settings updated');
      setEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating financial settings:', error);
      toast.error('Failed to update financial settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setCreditLimit(supplierExtended.credit_limit || 0);
    setCurrentBalance(supplierExtended.current_balance || 0);
    setPaymentDays(supplierExtended.payment_days || 30);
    setDiscountPercentage(supplierExtended.discount_percentage || 0);
    setEditing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCreditUtilization = () => {
    if (!creditLimit || creditLimit === 0) return 0;
    return (currentBalance / creditLimit) * 100;
  };

  const creditUtilization = getCreditUtilization();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700">Financial Management</h4>
          <p className="text-xs text-gray-500">Manage credit limits and payment terms</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2 text-sm"
          >
            <Edit size={16} />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-2">Credit Limit</div>
          {editing ? (
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(Number(e.target.value))}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="0"
            />
          ) : (
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(creditLimit)}
            </div>
          )}
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-2">Current Balance</div>
          {editing ? (
            <input
              type="number"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(Number(e.target.value))}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
              placeholder="0"
            />
          ) : (
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(currentBalance)}
            </div>
          )}
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-2">Payment Terms</div>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={paymentDays}
                onChange={(e) => setPaymentDays(Number(e.target.value))}
                className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="30"
              />
              <span className="text-sm text-gray-600">days</span>
            </div>
          ) : (
            <div className="text-2xl font-bold text-purple-600">
              {paymentDays} days
            </div>
          )}
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-2">Discount</div>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="0"
                step="0.1"
                max="100"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
          ) : (
            <div className="text-2xl font-bold text-orange-600">
              {discountPercentage}%
            </div>
          )}
        </div>
      </div>

      {/* Credit Utilization */}
      {creditLimit > 0 && (
        <GlassCard className="p-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Credit Utilization</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Available Credit:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(creditLimit - currentBalance)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Used:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(currentBalance)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Utilization:</span>
              <span className={`font-semibold ${
                creditUtilization > 80 ? 'text-red-600' : 
                creditUtilization > 50 ? 'text-yellow-600' : 
                'text-green-600'
              }`}>
                {creditUtilization.toFixed(1)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
              <div 
                className={`h-3 rounded-full transition-all ${
                  creditUtilization > 80 ? 'bg-red-500' : 
                  creditUtilization > 50 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(creditUtilization, 100)}%` }}
              ></div>
            </div>

            {creditUtilization > 80 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg mt-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-700 font-medium">
                  High credit utilization - Consider increasing limit or reducing balance
                </span>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Payment Summary */}
      <GlassCard className="p-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Payment Summary</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Payment Terms:</span>
            <span className="font-medium text-gray-900">Net {paymentDays}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Discount Rate:</span>
            <span className="font-medium text-gray-900">{discountPercentage}%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Preferred Currency:</span>
            <span className="font-medium text-gray-900">{supplier.preferred_currency || 'TZS'}</span>
          </div>
          {supplier.payment_terms && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Terms:</span>
              <span className="font-medium text-gray-900">{supplier.payment_terms}</span>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Financial Notes */}
      <GlassCard className="p-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Financial Notes</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Credit limit can be adjusted based on supplier performance and trust level</p>
          <p>• Current balance represents outstanding payables to this supplier</p>
          <p>• Payment terms define the number of days for invoice payment</p>
          <p>• Discount percentage applies to early payments or bulk orders</p>
        </div>
      </GlassCard>
    </div>
  );
};

export default SupplierFinancialTab;

