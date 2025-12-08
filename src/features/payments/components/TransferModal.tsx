import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Save, AlertCircle, ArrowRightLeft, Calendar, Clock, RepeatIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { FinanceAccount } from '../../../lib/financeAccountService';
import GlassInput from '../../shared/components/ui/GlassInput';
import { useAuth } from '../../../context/AuthContext';

interface TransferModalProps {
  accounts: FinanceAccount[];
  defaultSourceAccount?: FinanceAccount;
  onClose: () => void;
  onSuccess: () => void;
}

const TransferModal: React.FC<TransferModalProps> = ({
  accounts,
  defaultSourceAccount,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    sourceAccountId: defaultSourceAccount?.id || '',
    destinationAccountId: '',
    amount: '',
    description: '',
    reference: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Scheduling fields
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    frequency: 'monthly' as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    autoExecute: true,
    notificationEnabled: true,
    notificationDaysBefore: 1,
  });

  const sourceAccount = accounts.find(a => a.id === formData.sourceAccountId);
  const destinationAccount = accounts.find(a => a.id === formData.destinationAccountId);

  // Filter out selected source from destination options
  const destinationOptions = accounts.filter(a => a.id !== formData.sourceAccountId);
  
  // Filter out selected destination from source options
  const sourceOptions = accounts.filter(a => a.id !== formData.destinationAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.sourceAccountId) {
      toast.error('Please select a source account');
      return;
    }

    if (!formData.destinationAccountId) {
      toast.error('Please select a destination account');
      return;
    }

    if (formData.sourceAccountId === formData.destinationAccountId) {
      toast.error('Source and destination accounts must be different');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // For immediate transfers, check balance
    if (!isScheduled && (!sourceAccount || amount > (sourceAccount.balance || 0))) {
      toast.error('Insufficient balance in source account');
      return;
    }

    if (!formData.description || formData.description.trim() === '') {
      toast.error('Please enter a description');
      return;
    }

    // For scheduled transfers, validate dates
    if (isScheduled) {
      if (!scheduleData.startDate) {
        toast.error('Please select a start date');
        return;
      }
      if (scheduleData.endDate && scheduleData.endDate < scheduleData.startDate) {
        toast.error('End date must be after start date');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isScheduled) {
        // Create scheduled transfer
        await createScheduledTransfer(amount);
      } else {
        // Execute immediate transfer
        await executeImmediateTransfer(amount);
      }
    } catch (error: any) {
      console.error('Error processing transfer:', error);
      toast.error(error.message || 'Failed to process transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeImmediateTransfer = async (amount: number) => {
      // Use a database transaction to ensure atomicity
      // Get current balances
      const { data: sourceData, error: sourceError } = await supabase
        .from('finance_accounts')
        .select('balance, name, currency')
        .eq('id', formData.sourceAccountId)
        .single();

      if (sourceError) throw sourceError;

      const { data: destData, error: destError } = await supabase
        .from('finance_accounts')
        .select('balance, name, currency')
        .eq('id', formData.destinationAccountId)
        .single();

      if (destError) throw destError;

      const sourceBalance = Number(sourceData.balance) || 0;
      const destBalance = Number(destData.balance) || 0;

      // Check balance again
      if (amount > sourceBalance) {
        toast.error('Insufficient balance in source account');
        return;
      }

      const newSourceBalance = sourceBalance - amount;
      const newDestBalance = destBalance + amount;
      const referenceNumber = formData.reference || `TRF-${Date.now().toString(36).toUpperCase()}`;

      // Update source account balance
      const { error: updateSourceError } = await supabase
        .from('finance_accounts')
        .update({ 
          balance: newSourceBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.sourceAccountId);

      if (updateSourceError) throw updateSourceError;

      // Update destination account balance
      const { error: updateDestError } = await supabase
        .from('finance_accounts')
        .update({ 
          balance: newDestBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.destinationAccountId);

      if (updateDestError) {
        // Rollback source account if destination update fails
        await supabase
          .from('finance_accounts')
          .update({ balance: sourceBalance })
          .eq('id', formData.sourceAccountId);
        throw updateDestError;
      }

      // Create transfer_out transaction for source account
      const { error: sourceTransactionError } = await supabase
        .from('account_transactions')
        .insert({
          account_id: formData.sourceAccountId,
          transaction_type: 'transfer_out',
          amount: amount,
          balance_before: sourceBalance,
          balance_after: newSourceBalance,
          description: `Transfer to ${destData.name}: ${formData.description}`,
          reference_number: referenceNumber,
          metadata: {
            transfer: true,
            transfer_type: 'outgoing',
            destination_account_id: formData.destinationAccountId,
            destination_account_name: destData.name,
            destination_currency: destData.currency,
          },
          created_at: new Date().toISOString(),
        });

      if (sourceTransactionError) {
        console.warn('Failed to create source transaction:', sourceTransactionError);
      }

      // Create transfer_in transaction for destination account
      const { error: destTransactionError } = await supabase
        .from('account_transactions')
        .insert({
          account_id: formData.destinationAccountId,
          transaction_type: 'transfer_in',
          amount: amount,
          balance_before: destBalance,
          balance_after: newDestBalance,
          description: `Transfer from ${sourceData.name}: ${formData.description}`,
          reference_number: referenceNumber,
          metadata: {
            transfer: true,
            transfer_type: 'incoming',
            source_account_id: formData.sourceAccountId,
            source_account_name: sourceData.name,
            source_currency: sourceData.currency,
          },
          created_at: new Date().toISOString(),
        });

      if (destTransactionError) {
        console.warn('Failed to create destination transaction:', destTransactionError);
      }

      toast.success(
        `Successfully transferred ${new Intl.NumberFormat('en-TZ', {
          style: 'currency',
          currency: sourceData.currency || 'TZS',
        }).format(amount)}`
      );

      onSuccess();
      onClose();
  };

  const createScheduledTransfer = async (amount: number) => {
    // Calculate next execution date based on start date and frequency
    const startDate = new Date(scheduleData.startDate);
    const nextExecutionDate = scheduleData.startDate;

    // Get current branch_id for branch isolation
    const currentBranchId = localStorage.getItem('current_branch_id') || null;
    
    const { data, error } = await supabase
      .from('scheduled_transfers')
      .insert({
        source_account_id: formData.sourceAccountId,
        destination_account_id: formData.destinationAccountId,
        amount: amount,
        description: formData.description,
        reference_prefix: formData.reference || 'SCHED-TRF',
        frequency: scheduleData.frequency,
        start_date: scheduleData.startDate,
        end_date: scheduleData.endDate || null,
        next_execution_date: nextExecutionDate,
        auto_execute: scheduleData.autoExecute,
        notification_enabled: scheduleData.notificationEnabled,
        notification_days_before: scheduleData.notificationDaysBefore,
        is_active: true,
        execution_count: 0,
        branch_id: currentBranchId, // ✅ Add branch_id for branch isolation
        created_by: currentUser?.id,
        metadata: {
          source_account_name: sourceAccount?.name,
          destination_account_name: destinationAccount?.name,
          currency: sourceAccount?.currency,
        }
      })
      .select()
      .single();

    if (error) throw error;

    toast.success(
      `Scheduled ${scheduleData.frequency} transfer created successfully! First execution: ${scheduleData.startDate}`
    );

    onSuccess();
    onClose();
  };

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isScheduled ? <RepeatIcon size={24} /> : <ArrowRightLeft size={24} />}
              <div>
                <h2 className="text-xl font-bold">
                  {isScheduled ? 'Schedule Recurring Transfer' : 'Transfer Between Accounts'}
                </h2>
                <p className="text-purple-100 text-sm">
                  {isScheduled ? 'Set up automatic recurring transfers' : 'Move money from one account to another'}
                </p>
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
          {/* Account Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Account <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.sourceAccountId}
                onChange={(e) => setFormData({ ...formData, sourceAccountId: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-white"
              >
                <option value="">Select source account</option>
                {sourceOptions.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({formatCurrency(account.balance || 0, account.currency)})
                  </option>
                ))}
              </select>
              {sourceAccount && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">Available Balance</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(sourceAccount.balance || 0, sourceAccount.currency)}
                  </div>
                </div>
              )}
            </div>

            {/* Destination Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Account <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.destinationAccountId}
                onChange={(e) => setFormData({ ...formData, destinationAccountId: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-white"
              >
                <option value="">Select destination account</option>
                {destinationOptions.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({formatCurrency(account.balance || 0, account.currency)})
                  </option>
                ))}
              </select>
              {destinationAccount && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">Current Balance</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(destinationAccount.balance || 0, destinationAccount.currency)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visual Transfer Indicator */}
          {sourceAccount && destinationAccount && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">{sourceAccount.name}</div>
                  <div className="text-xs text-gray-500">{sourceAccount.currency}</div>
                </div>
                <ArrowRight className="text-purple-600 mx-4" size={24} />
                <div className="flex-1 text-right">
                  <div className="text-sm font-medium text-gray-700">{destinationAccount.name}</div>
                  <div className="text-xs text-gray-500">{destinationAccount.currency}</div>
                </div>
              </div>
              {sourceAccount.currency !== destinationAccount.currency && (
                <div className="mt-3 flex items-center gap-2 text-amber-700 text-sm bg-amber-50 p-2 rounded-lg">
                  <AlertCircle size={16} />
                  <span>Currency mismatch: {sourceAccount.currency} → {destinationAccount.currency}</span>
                </div>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer Amount <span className="text-red-500">*</span>
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
            {formData.amount && sourceAccount && parseFloat(formData.amount) > (sourceAccount.balance || 0) && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>Insufficient balance in source account</span>
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
              placeholder="Reason for transfer..."
              required
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-white resize-none"
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

          {/* Schedule Toggle */}
          <div className="border-t border-gray-200 pt-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RepeatIcon className="text-purple-600" size={20} />
                <div>
                  <div className="text-sm font-medium text-gray-900">Schedule Recurring Transfer</div>
                  <div className="text-xs text-gray-500">Set up automatic recurring transfers</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduled(!isScheduled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isScheduled ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isScheduled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Scheduling Options */}
            {isScheduled && (
              <div className="space-y-4 bg-purple-50 rounded-xl p-4 border border-purple-200">
                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={scheduleData.frequency}
                    onChange={(e) => setScheduleData({ ...scheduleData, frequency: e.target.value as any })}
                    required={isScheduled}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly (Every 2 weeks)</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly (Every 3 months)</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                {/* Start and End Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="date"
                        value={scheduleData.startDate}
                        onChange={(e) => setScheduleData({ ...scheduleData, startDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        required={isScheduled}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (Optional)
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="date"
                        value={scheduleData.endDate}
                        onChange={(e) => setScheduleData({ ...scheduleData, endDate: e.target.value })}
                        min={scheduleData.startDate}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-white"
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Leave empty for indefinite</div>
                  </div>
                </div>

                {/* Auto-Execute Toggle */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Auto-Execute</div>
                    <div className="text-xs text-gray-500">Automatically process transfers on schedule</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScheduleData({ ...scheduleData, autoExecute: !scheduleData.autoExecute })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      scheduleData.autoExecute ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        scheduleData.autoExecute ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Notification Settings */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Notifications</div>
                        <div className="text-xs text-gray-500">Get notified before transfers</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScheduleData({ ...scheduleData, notificationEnabled: !scheduleData.notificationEnabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          scheduleData.notificationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            scheduleData.notificationEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {scheduleData.notificationEnabled && (
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600 mb-1">Days before transfer:</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={scheduleData.notificationDaysBefore}
                          onChange={(e) => setScheduleData({ ...scheduleData, notificationDaysBefore: parseInt(e.target.value) || 1 })}
                          className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-white"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Schedule Summary */}
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm font-medium text-purple-900 mb-2 flex items-center gap-2">
                    <Clock size={16} />
                    Schedule Summary
                  </div>
                  <div className="space-y-1 text-sm text-purple-800">
                    <div>• Transfer will occur <span className="font-bold">{scheduleData.frequency}</span></div>
                    <div>• Starting from <span className="font-bold">{new Date(scheduleData.startDate).toLocaleDateString()}</span></div>
                    {scheduleData.endDate && (
                      <div>• Ending on <span className="font-bold">{new Date(scheduleData.endDate).toLocaleDateString()}</span></div>
                    )}
                    {!scheduleData.endDate && (
                      <div>• No end date (will continue indefinitely)</div>
                    )}
                    {scheduleData.autoExecute ? (
                      <div className="text-green-700">✓ Will execute automatically</div>
                    ) : (
                      <div className="text-amber-700">⚠ Requires manual approval</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {formData.amount && sourceAccount && destinationAccount && parseFloat(formData.amount) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-blue-900 mb-2">Transfer Summary</div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Amount to transfer:</span>
                <span className="font-bold text-blue-900">
                  {formatCurrency(parseFloat(formData.amount), sourceAccount.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">{sourceAccount.name} new balance:</span>
                <span className="font-bold text-blue-900">
                  {formatCurrency(Math.max(0, (sourceAccount.balance || 0) - parseFloat(formData.amount)), sourceAccount.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">{destinationAccount.name} new balance:</span>
                <span className="font-bold text-blue-900">
                  {formatCurrency((destinationAccount.balance || 0) + parseFloat(formData.amount), destinationAccount.currency)}
                </span>
              </div>
            </div>
          )}

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
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isScheduled ? <RepeatIcon size={16} /> : <Save size={16} />}
              {isSubmitting ? 'Processing...' : isScheduled ? 'Create Schedule' : 'Transfer Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferModal;

