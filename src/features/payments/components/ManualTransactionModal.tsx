import React, { useState } from 'react';
import { X, Plus, Minus, DollarSign, Save, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { FinanceAccount } from '../../../lib/financeAccountService';
import GlassInput from '../../shared/components/ui/GlassInput';

interface ManualTransactionModalProps {
  account: FinanceAccount;
  onClose: () => void;
  onSuccess: () => void;
}

const ManualTransactionModal: React.FC<ManualTransactionModalProps> = ({
  account,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    type: 'deposit', // deposit, withdrawal, adjustment
    amount: '',
    description: '',
    reference: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!formData.description || formData.description.trim() === '') {
      toast.error('Please enter a description');
      return;
    }

    // Check sufficient balance for withdrawals
    if (formData.type === 'withdrawal' && amount > (account.balance || 0)) {
      toast.error('Insufficient balance for withdrawal');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current balance
      const { data: currentAccount, error: fetchError } = await supabase
        .from('finance_accounts')
        .select('balance')
        .eq('id', account.id)
        .single();

      if (fetchError) throw fetchError;

      const currentBalance = Number(currentAccount.balance) || 0;
      const transactionAmount = amount;
      
      // Calculate new balance based on transaction type
      let newBalance: number;
      let transactionType: string;
      
      if (formData.type === 'deposit') {
        newBalance = currentBalance + transactionAmount;
        transactionType = 'payment_received';
      } else if (formData.type === 'withdrawal') {
        newBalance = currentBalance - transactionAmount;
        transactionType = 'expense';
      } else { // adjustment
        newBalance = currentBalance + transactionAmount;
        transactionType = 'adjustment';
      }

      // Update account balance
      const { error: updateError } = await supabase
        .from('finance_accounts')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('account_transactions')
        .insert({
          account_id: account.id,
          transaction_type: transactionType,
          amount: transactionAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: formData.description,
          reference_number: formData.reference || `MAN-${Date.now().toString(36).toUpperCase()}`,
          branch_id: account.branch_id, // Assign branch_id from account for isolation
          metadata: {
            manual_entry: true,
            entry_type: formData.type,
            account_name: account.name,
          },
          created_at: new Date().toISOString(),
        });

      if (transactionError) throw transactionError;

      toast.success(
        formData.type === 'deposit'
          ? 'Deposit recorded successfully'
          : formData.type === 'withdrawal'
          ? 'Withdrawal recorded successfully'
          : 'Adjustment recorded successfully'
      );

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error recording transaction:', error);
      toast.error(error.message || 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = () => {
    switch (formData.type) {
      case 'deposit':
        return <Plus className="text-green-600" size={20} />;
      case 'withdrawal':
        return <Minus className="text-red-600" size={20} />;
      default:
        return <DollarSign className="text-blue-600" size={20} />;
    }
  };

  const getTypeColor = () => {
    switch (formData.type) {
      case 'deposit':
        return 'from-green-500 to-green-600';
      case 'withdrawal':
        return 'from-red-500 to-red-600';
      default:
        return 'from-blue-500 to-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getTypeIcon()}
              <div>
                <h2 className="text-xl font-bold">Manual Transaction</h2>
                <p className="text-blue-100 text-sm">{account.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
              disabled={isSubmitting}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current Balance Info */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Current Balance</div>
            <div className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-TZ', {
                style: 'currency',
                currency: account.currency || 'TZS',
              }).format(account.balance || 0)}
            </div>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'deposit' })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.type === 'deposit'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Plus size={20} className="mx-auto mb-1" />
                <div className="text-xs font-medium">Deposit</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'withdrawal' })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.type === 'withdrawal'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Minus size={20} className="mx-auto mb-1" />
                <div className="text-xs font-medium">Withdrawal</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'adjustment' })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.type === 'adjustment'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DollarSign size={20} className="mx-auto mb-1" />
                <div className="text-xs font-medium">Adjust</div>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <GlassInput
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
            {formData.type === 'withdrawal' && formData.amount && parseFloat(formData.amount) > (account.balance || 0) && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>Insufficient balance</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter transaction description..."
              required
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white/80 backdrop-blur-sm resize-none"
            />
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number (Optional)
            </label>
            <GlassInput
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Auto-generated if blank"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                {formData.type === 'deposit' && (
                  <>This will <strong>add</strong> money to the account balance.</>
                )}
                {formData.type === 'withdrawal' && (
                  <>This will <strong>subtract</strong> money from the account balance.</>
                )}
                {formData.type === 'adjustment' && (
                  <>Use this to correct balance discrepancies or make adjustments.</>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-4 py-3 bg-gradient-to-r ${getTypeColor()} text-white rounded-lg hover:opacity-90 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              <Save size={16} />
              {isSubmitting ? 'Recording...' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualTransactionModal;

