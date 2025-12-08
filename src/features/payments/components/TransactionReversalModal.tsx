import React, { useState } from 'react';
import { X, AlertTriangle, RotateCcw, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import GlassInput from '../../shared/components/ui/GlassInput';

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  created_at: string;
  balance_after: number;
  balance_before: number;
  reference_number?: string;
  metadata?: any;
  account_id: string;
}

interface TransactionReversalModalProps {
  transaction: Transaction;
  accountName: string;
  accountCurrency: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TransactionReversalModal: React.FC<TransactionReversalModalProps> = ({
  transaction,
  accountName,
  accountCurrency,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: accountCurrency || 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'payment_received': 'Payment Received',
      'expense': 'Expense',
      'transfer_in': 'Transfer In',
      'transfer_out': 'Transfer Out',
      'adjustment': 'Adjustment',
    };
    return typeMap[type] || type;
  };

  const handleReverse = async () => {
    if (!reason || reason.trim() === '') {
      toast.error('Please provide a reason for reversal');
      return;
    }

    if (!confirm('Are you sure you want to reverse this transaction? This action cannot be undone.')) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current account balance
      const { data: accountData, error: accountError } = await supabase
        .from('finance_accounts')
        .select('balance')
        .eq('id', transaction.account_id)
        .single();

      if (accountError) throw accountError;

      const currentBalance = Number(accountData.balance) || 0;

      // Calculate reversal amount and new balance
      // If it was money in (payment_received, transfer_in, income), reverse by subtracting
      // If it was money out (expense, transfer_out), reverse by adding
      const isMoneyIn = transaction.transaction_type === 'payment_received' || transaction.transaction_type === 'transfer_in' || transaction.transaction_type === 'income';
      const reversalAmount = transaction.amount;
      const newBalance = isMoneyIn ? currentBalance - reversalAmount : currentBalance + reversalAmount;

      // Check if reversal would result in negative balance
      if (newBalance < 0) {
        toast.error('Reversal would result in negative balance. Cannot proceed.');
        setIsSubmitting(false);
        return;
      }

      // Update account balance
      const { error: balanceError } = await supabase
        .from('finance_accounts')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.account_id);

      if (balanceError) throw balanceError;

      // Create reversal transaction record
      const reversalType = isMoneyIn ? 'expense' : 'payment_received';
      const { error: reversalError } = await supabase
        .from('account_transactions')
        .insert({
          account_id: transaction.account_id,
          transaction_type: 'reversal', // Use reversal type for reversals (doesn't trigger balance updates)
          amount: reversalAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: `REVERSAL: ${transaction.description || getTransactionTypeDisplay(transaction.transaction_type)}`,
          reference_number: `REV-${transaction.reference_number || transaction.id.substring(0, 8)}`,
          related_entity_type: 'transaction_reversal',
          related_entity_id: transaction.id,
          metadata: {
            reversal: true,
            original_transaction_id: transaction.id,
            original_type: transaction.transaction_type,
            original_amount: transaction.amount,
            original_date: transaction.created_at,
            original_reference: transaction.reference_number,
            reversal_reason: reason,
            reversed_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        });

      if (reversalError) throw reversalError;

      // Mark original transaction as reversed (add metadata)
      const originalMetadata = transaction.metadata || {};
      const { error: updateError } = await supabase
        .from('account_transactions')
        .update({
          metadata: {
            ...originalMetadata,
            reversed: true,
            reversed_at: new Date().toISOString(),
            reversal_reason: reason,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      if (updateError) {
        console.warn('Failed to mark original transaction as reversed:', updateError);
      }

      toast.success('Transaction reversed successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error reversing transaction:', error);
      toast.error(error.message || 'Failed to reverse transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} />
              <div>
                <h2 className="text-xl font-bold">Reverse Transaction</h2>
                <p className="text-orange-100 text-sm">This action will create a reversal entry</p>
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Warning Box */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>This will create a reversal transaction</li>
                  <li>The account balance will be adjusted</li>
                  <li>Original transaction will be marked as reversed</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-700 mb-3">Transaction to Reverse:</div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-600 mb-1">Account</div>
                <div className="font-medium text-gray-900">{accountName}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Date</div>
                <div className="font-medium text-gray-900">{formatDate(transaction.created_at)}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Type</div>
                <div className="font-medium text-gray-900">{getTransactionTypeDisplay(transaction.transaction_type)}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Amount</div>
                <div className="font-medium text-gray-900">{formatAmount(transaction.amount)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-gray-600 mb-1">Description</div>
                <div className="font-medium text-gray-900">{transaction.description || 'No description'}</div>
              </div>
              {transaction.reference_number && (
                <div className="col-span-2">
                  <div className="text-gray-600 mb-1">Reference</div>
                  <div className="font-medium text-gray-900">{transaction.reference_number}</div>
                </div>
              )}
            </div>
          </div>

          {/* Impact Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-blue-900 mb-2">Impact of Reversal:</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Original Transaction:</span>
                <span className="font-bold text-blue-900">
                  {transaction.transaction_type === 'payment_received' || transaction.transaction_type === 'transfer_in' ? '+' : '-'}
                  {formatAmount(transaction.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Reversal Effect:</span>
                <span className="font-bold text-blue-900">
                  {transaction.transaction_type === 'payment_received' || transaction.transaction_type === 'transfer_in' ? '-' : '+'}
                  {formatAmount(transaction.amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Reversal <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Duplicate entry, Error in amount, Wrong account..."
              required
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">This will be recorded in the reversal transaction</p>
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
              onClick={handleReverse}
              disabled={isSubmitting || !reason.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RotateCcw size={16} />
              {isSubmitting ? 'Reversing...' : 'Reverse Transaction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionReversalModal;

