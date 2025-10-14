import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/GlassInput';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import Modal from '../../shared/components/ui/Modal';
import {
  Plus, RefreshCw, Edit3, Trash2, Play, Pause, Clock, Calendar,
  DollarSign, RepeatIcon, CheckCircle, XCircle, AlertTriangle,
  Building, Lightbulb, Package, Truck, User, Home, FileText,
  Shield, Receipt, Zap, Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { financeAccountService, FinanceAccount } from '../../../lib/financeAccountService';

interface RecurringExpense {
  id: string;
  name: string;
  description: string;
  account_id: string;
  category: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  last_processed_date: string | null;
  vendor_name: string;
  reference_prefix: string;
  auto_process: boolean;
  is_active: boolean;
  notification_days_before: number;
  created_at: string;
}

const RecurringExpenseManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<FinanceAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    account_id: '',
    category: '',
    amount: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    start_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    reference_prefix: '',
    auto_process: false,
    notification_days_before: 3
  });

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    };
    return labels[frequency] || frequency;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      'Rent': Building,
      'Utilities': Lightbulb,
      'Supplies': Package,
      'Transportation': Truck,
      'Salaries': User,
      'Maintenance': Home,
      'Marketing': FileText,
      'Insurance': Shield,
      'Taxes': Receipt,
      'Other': FileText
    };
    return icons[category] || FileText;
  };

  const fetchRecurringExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .order('next_due_date', { ascending: true });

      if (error) throw error;

      setRecurringExpenses(data || []);
    } catch (error) {
      console.error('Error fetching recurring expenses:', error);
      toast.error('Failed to load recurring expenses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPaymentAccounts = useCallback(async () => {
    try {
      const accounts = await financeAccountService.getPaymentMethods();
      setPaymentAccounts(accounts);
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchRecurringExpenses();
    fetchPaymentAccounts();
  }, [fetchRecurringExpenses, fetchPaymentAccounts]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.account_id || !formData.amount || !formData.category) {
        toast.error('Please fill in all required fields');
        return;
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      const expenseData = {
        name: formData.name,
        description: formData.description,
        account_id: formData.account_id,
        category: formData.category,
        amount: amount,
        frequency: formData.frequency,
        start_date: formData.start_date,
        next_due_date: formData.start_date,
        vendor_name: formData.vendor_name || null,
        reference_prefix: formData.reference_prefix || formData.category.substring(0, 4).toUpperCase(),
        auto_process: formData.auto_process,
        notification_days_before: formData.notification_days_before,
        created_by: currentUser?.id
      };

      if (editingExpense) {
        // Update
        const { error } = await supabase
          .from('recurring_expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) throw error;
        toast.success('Recurring expense updated!');
      } else {
        // Insert
        const { error } = await supabase
          .from('recurring_expenses')
          .insert(expenseData);

        if (error) throw error;
        toast.success('Recurring expense created!');
      }

      // Reset and refresh
      resetForm();
      setShowAddModal(false);
      setEditingExpense(null);
      fetchRecurringExpenses();
    } catch (error: any) {
      console.error('Error saving recurring expense:', error);
      toast.error(error.message || 'Failed to save recurring expense');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      account_id: '',
      category: '',
      amount: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      vendor_name: '',
      reference_prefix: '',
      auto_process: false,
      notification_days_before: 3
    });
  };

  const handleEdit = (expense: RecurringExpense) => {
    setEditingExpense(expense);
    setFormData({
      name: expense.name,
      description: expense.description || '',
      account_id: expense.account_id,
      category: expense.category,
      amount: expense.amount.toString(),
      frequency: expense.frequency,
      start_date: expense.start_date,
      vendor_name: expense.vendor_name || '',
      reference_prefix: expense.reference_prefix || '',
      auto_process: expense.auto_process,
      notification_days_before: expense.notification_days_before || 3
    });
    setShowAddModal(true);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .update({ is_active: !currentActive })
        .eq('id', id);

      if (error) throw error;

      toast.success(currentActive ? 'Paused' : 'Resumed');
      fetchRecurringExpenses();
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete recurring expense "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Recurring expense deleted');
      fetchRecurringExpenses();
    } catch (error: any) {
      toast.error('Failed to delete recurring expense');
    }
  };

  const handleProcessNow = async (expense: RecurringExpense) => {
    try {
      // Call the process function for this specific expense
      const { data, error } = await supabase.rpc('process_due_recurring_expenses');

      if (error) throw error;

      toast.success(`Processed! Check Expense Management for transaction.`);
      fetchRecurringExpenses();
    } catch (error: any) {
      console.error('Error processing expense:', error);
      toast.error('Failed to process expense');
    }
  };

  const getDueStatus = (nextDueDate: string) => {
    const due = new Date(nextDueDate);
    const today = new Date();
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Overdue', color: 'red', icon: AlertTriangle };
    } else if (diffDays === 0) {
      return { label: 'Due Today', color: 'orange', icon: Clock };
    } else if (diffDays <= 7) {
      return { label: 'Due Soon', color: 'yellow', icon: Calendar };
    } else {
      return { label: 'Scheduled', color: 'green', icon: CheckCircle };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading recurring expenses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recurring Expenses</h2>
          <p className="text-gray-600">Automate fixed expenses like salaries, rent, and subscriptions</p>
        </div>
        <div className="flex gap-2">
          <GlassButton onClick={fetchRecurringExpenses} variant="secondary">
            <RefreshCw size={16} />
            Refresh
          </GlassButton>
          <GlassButton onClick={() => { resetForm(); setShowAddModal(true); }}>
            <Plus size={16} />
            Add Recurring Expense
          </GlassButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Recurring</p>
              <p className="text-2xl font-bold text-blue-900">{recurringExpenses.length}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <RepeatIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Active</p>
              <p className="text-2xl font-bold text-green-900">
                {recurringExpenses.filter(e => e.is_active).length}
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Due Soon</p>
              <p className="text-2xl font-bold text-orange-900">
                {recurringExpenses.filter(e => {
                  const due = new Date(e.next_due_date);
                  const today = new Date();
                  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return diffDays >= 0 && diffDays <= 7;
                }).length}
              </p>
            </div>
            <div className="p-3 bg-orange-500 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Monthly Total</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatMoney(recurringExpenses
                  .filter(e => e.frequency === 'monthly' && e.is_active)
                  .reduce((sum, e) => sum + e.amount, 0)
                )}
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Recurring Expenses List */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Scheduled Expenses ({recurringExpenses.length})
        </h3>

        {recurringExpenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4 inline-block p-6 bg-gray-100 rounded-full">
              <RepeatIcon className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recurring Expenses</h3>
            <p className="text-gray-600 mb-4">
              Set up automatic expenses for salaries, rent, utilities, and more
            </p>
            <GlassButton onClick={() => { resetForm(); setShowAddModal(true); }}>
              <Plus size={16} />
              Create First Recurring Expense
            </GlassButton>
          </div>
        ) : (
          <div className="space-y-3">
            {recurringExpenses.map((expense) => {
              const IconComponent = getCategoryIcon(expense.category);
              const dueStatus = getDueStatus(expense.next_due_date);
              const DueIcon = dueStatus.icon;
              
              return (
                <div key={expense.id} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <IconComponent className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{expense.name}</h4>
                          <p className="text-sm text-gray-600">{expense.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {expense.auto_process ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Auto
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                              Manual
                            </span>
                          )}
                          {expense.is_active ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
                              <Pause className="w-3 h-3" />
                              Paused
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-4 mt-3 text-sm">
                        <div>
                          <div className="text-gray-600 text-xs">Amount</div>
                          <div className="font-semibold text-gray-900">{formatMoney(expense.amount)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600 text-xs">Frequency</div>
                          <div className="font-medium text-gray-900">{getFrequencyLabel(expense.frequency)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600 text-xs">Next Due</div>
                          <div className="flex items-center gap-1">
                            <DueIcon className={`w-3 h-3 text-${dueStatus.color}-600`} />
                            <span className="font-medium text-gray-900">
                              {new Date(expense.next_due_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 text-xs">Account</div>
                          <div className="font-medium text-gray-900">
                            {paymentAccounts.find(a => a.id === expense.account_id)?.name || 'Unknown'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 text-xs">Vendor</div>
                          <div className="font-medium text-gray-900">{expense.vendor_name || 'N/A'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {expense.is_active && (
                        <button
                          onClick={() => handleProcessNow(expense)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Process Now"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(expense)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(expense.id, expense.is_active)}
                        className={`p-2 ${expense.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'} rounded-lg transition-colors`}
                        title={expense.is_active ? 'Pause' : 'Resume'}
                      >
                        {expense.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id, expense.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingExpense(null);
          resetForm();
        }}
        title={editingExpense ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
      >
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4" />
              Expense Name *
            </label>
            <GlassInput
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Monthly Office Rent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Building className="w-4 h-4" />
                Account *
              </label>
              <GlassSelect
                value={formData.account_id}
                onChange={(e) => handleInputChange('account_id', e.target.value)}
              >
                <option value="">Select Account</option>
                {paymentAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </GlassSelect>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4" />
                Category *
              </label>
              <GlassSelect
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="">Select Category</option>
                <option value="Salaries">Salaries</option>
                <option value="Rent">Rent</option>
                <option value="Utilities">Utilities</option>
                <option value="Supplies">Supplies</option>
                <option value="Insurance">Insurance</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Marketing">Marketing</option>
                <option value="Transportation">Transportation</option>
                <option value="Taxes">Taxes</option>
                <option value="Other">Other</option>
              </GlassSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="w-4 h-4" />
                Amount (TSh) *
              </label>
              <GlassInput
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <RepeatIcon className="w-4 h-4" />
                Frequency *
              </label>
              <GlassSelect
                value={formData.frequency}
                onChange={(e) => handleInputChange('frequency', e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </GlassSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4" />
                Start Date *
              </label>
              <GlassInput
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Building className="w-4 h-4" />
                Vendor
              </label>
              <GlassInput
                type="text"
                value={formData.vendor_name}
                onChange={(e) => handleInputChange('vendor_name', e.target.value)}
                placeholder="Supplier or vendor"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional details about this recurring expense"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Receipt className="w-4 h-4" />
              Reference Prefix
            </label>
            <GlassInput
              type="text"
              value={formData.reference_prefix}
              onChange={(e) => handleInputChange('reference_prefix', e.target.value)}
              placeholder="e.g., SAL, RENT, ELEC"
              maxLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              Will generate references like: {formData.reference_prefix || 'REF'}-20251013
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.auto_process}
                onChange={(e) => handleInputChange('auto_process', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Zap className="w-4 h-4 text-yellow-600" />
                Auto-Process (Automatic Deduction)
              </div>
            </label>
            <p className="text-xs text-gray-600 mt-2 ml-6">
              {formData.auto_process 
                ? '⚡ Expense will be automatically deducted on due date' 
                : '📝 You will be notified but must process manually'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <GlassButton 
              variant="secondary" 
              onClick={() => {
                setShowAddModal(false);
                setEditingExpense(null);
                resetForm();
              }}
            >
              Cancel
            </GlassButton>
            <GlassButton onClick={handleSave}>
              {editingExpense ? 'Update' : 'Create'} Recurring Expense
            </GlassButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RecurringExpenseManagement;

