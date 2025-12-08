import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { 
  DollarSign, Zap, Building,
  CreditCard, FileText,
  Wallet, Smartphone, Banknote, AlertCircle, TrendingUp,
  CheckCircle, X, ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { financeAccountService, FinanceAccount } from '../lib/financeAccountService';
import { getCurrentBranchId } from '../lib/branchAwareApi';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState<FinanceAccount[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [dailySalesAmount, setDailySalesAmount] = useState(0);
  const [isLoadingDailySales, setIsLoadingDailySales] = useState(false);

  // Form state with smart defaults
  const [formData, setFormData] = useState({
    account_id: '',
    category: '',
    customCategory: '',
    description: '',
    amount: '',
    vendor_name: '',
    reference_number: ''
  });

  // Check user role
  const isCustomerCare = currentUser?.role === 'customer-care';
  const isAdmin = currentUser?.role === 'admin';

  // Fetch daily sales for customer care
  const fetchDailySales = async () => {
    if (!isCustomerCare) return;

    setIsLoadingDailySales(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's completed sales total
      const { data: sales, error } = await supabase
        .from('lats_sales')
        .select('total_amount')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .eq('status', 'completed');

      if (error) throw error;

      const total = sales?.reduce((sum: number, sale: any) => sum + (parseFloat(sale.total_amount) || 0), 0) || 0;
      setDailySalesAmount(total);
    } catch (error) {
      console.error('Error fetching daily sales:', error);
      setDailySalesAmount(0);
    } finally {
      setIsLoadingDailySales(false);
    }
  };

  // 🚀 OPTIMIZED: Parallel data loading for better performance
  useEffect(() => {
    if (isOpen) {
      // Load data in parallel for better performance
      const loadDataOptimized = async () => {
        if (import.meta.env.MODE === 'development') {
          console.log('🔄 [QuickExpenseModal] Starting optimized parallel data loading...');
        }

        const [accountsResult, categoriesResult, dailySalesResult] = await Promise.allSettled([
          // Load payment accounts and categories in parallel
          fetchData().catch(err => {
            console.error('❌ Failed to load accounts/categories:', err);
          }),
          // Load daily sales only for customer care
          ...(isCustomerCare ? [fetchDailySales().catch(err => {
            console.error('❌ Failed to load daily sales:', err);
          })] : [])
        ]);

        if (import.meta.env.MODE === 'development') {
          console.log('✅ [QuickExpenseModal] Optimized parallel loading completed');
        }
      };

      loadDataOptimized();
    }
  }, [isOpen, isCustomerCare]);

  const fetchData = async () => {
    try {
      // Fetch payment accounts based on role
      const allAccounts = await financeAccountService.getPaymentMethods();
      
      // Customer care: Only Cash account
      // Admin: All accounts
      let accountsToShow = allAccounts;
      if (isCustomerCare) {
        const cashAccount = allAccounts.find(acc => acc.type === 'cash');
        accountsToShow = cashAccount ? [cashAccount] : [];
      }
      
      setPaymentAccounts(accountsToShow);

      // Auto-select first account
      if (accountsToShow.length > 0 && !formData.account_id) {
        setFormData(prev => ({ ...prev, account_id: accountsToShow[0].id }));
      }

      // Fetch expense categories
      const { data: categories } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setExpenseCategories(categories || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Format number with commas
  const formatNumberWithCommas = (value: string) => {
    // Remove all non-digit and non-decimal characters
    const cleanValue = value.replace(/[^\d.]/g, '');
    
    // Split into integer and decimal parts
    const parts = cleanValue.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add commas to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Combine with decimal part if it exists
    return decimalPart !== undefined 
      ? `${formattedInteger}.${decimalPart}`
      : formattedInteger;
  };

  // Handle amount input with comma formatting
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Remove commas to get the actual number
    const numericValue = inputValue.replace(/,/g, '');
    
    // Only allow valid number format
    if (numericValue === '' || /^\d*\.?\d{0,2}$/.test(numericValue)) {
      setFormData(prev => ({ ...prev, amount: numericValue }));
    }
  };

  const handleSelectAccount = (accountId: string) => {
    setFormData(prev => ({ ...prev, account_id: accountId }));
  };

  const getAccountIcon = (accountType: string) => {
    switch (accountType.toLowerCase()) {
      case 'cash':
        return Wallet;
      case 'bank':
        return Building;
      case 'mobile_money':
        return Smartphone;
      case 'credit_card':
        return CreditCard;
      default:
        return Banknote;
    }
  };

  const getAccountColor = (accountType: string) => {
    switch (accountType.toLowerCase()) {
      case 'cash':
        return 'green';
      case 'bank':
        return 'blue';
      case 'mobile_money':
        return 'purple';
      case 'credit_card':
        return 'indigo';
      default:
        return 'gray';
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate
      if (!formData.account_id || !formData.amount || !formData.description) {
        toast.error('Please fill in amount and description');
        return;
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      // Customer care validation: Check against daily sales
      if (isCustomerCare && amount > dailySalesAmount) {
        toast.error(`Amount exceeds daily sales (TSh ${dailySalesAmount.toLocaleString()})`);
        return;
      }

      setIsSubmitting(true);

      // Auto-generate reference if not provided
      const reference = formData.reference_number || `EXP-${Date.now()}`;

      // Check if user is admin
      const isAdmin = currentUser?.role === 'admin';
      const status = isAdmin ? 'approved' : 'pending';

      // Determine the category to use (custom or selected)
      const finalCategory = formData.category === 'custom' 
        ? formData.customCategory.trim() 
        : formData.category;

      // Get branch_id from account or use current branch
      const currentBranchId = getCurrentBranchId();
      let expenseBranchId = currentBranchId;
      
      if (!expenseBranchId && formData.account_id) {
        const { data: account } = await supabase
          .from('finance_accounts')
          .select('branch_id')
          .eq('id', formData.account_id)
          .single();
        expenseBranchId = account?.branch_id || currentBranchId;
      }

      // If still no branch_id, get default branch
      if (!expenseBranchId) {
        const { data: defaultBranch } = await supabase
          .from('store_locations')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        expenseBranchId = defaultBranch?.id || null;
      }

      // Insert expense with branch_id (always isolated per branch)
      const { error } = await supabase
        .from('account_transactions')
        .insert({
          account_id: formData.account_id,
          transaction_type: 'expense',
          amount: amount,
          description: finalCategory 
            ? `${finalCategory}: ${formData.description}` 
            : formData.description,
          reference_number: reference,
          status: status,
          branch_id: expenseBranchId, // ✅ Always set branch_id for isolation
          metadata: {
            category: finalCategory || 'Other',
            vendor_name: formData.vendor_name || null,
            expense_date: new Date().toISOString().split('T')[0],
            created_via: 'quick_expense',
            user_role: currentUser?.role,
            daily_sales_at_time: isCustomerCare ? dailySalesAmount : null,
            approval_status: status,
            requires_approval: !isAdmin
          },
          created_by: currentUser?.id
        });

      if (error) throw error;

      // Get account name for notification
      const account = paymentAccounts.find(a => a.id === formData.account_id);
      
      if (isAdmin) {
        toast.success(`Expense recorded! ${account?.name || 'Account'} balance updated.`, {
          duration: 3000
        });
      } else {
        toast.success(`Expense submitted for admin approval! Pending review.`, {
          duration: 3000
        });
      }

      // Reset form
      setFormData({
        account_id: paymentAccounts.length > 0 ? paymentAccounts[0].id : '',
        category: '',
        customCategory: '',
        description: '',
        amount: '',
        vendor_name: '',
        reference_number: ''
      });

      // Call success callback
      if (onSuccess) onSuccess();

      // Close modal
      onClose();
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast.error(error.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Additional scroll prevention for html element
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on html element as well
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
      style={{
        top: 0, 
        left: 0, 
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        overscrollBehavior: 'none'
      }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="expense-form-title"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2" id="expense-form-title">
                Quick Expense
              </h3>
              <p className="text-sm text-gray-600">
                Fast expense entry (Ctrl+Enter to save)
              </p>
            </div>
          </div>
        </div>

        {/* Form - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6" onKeyDown={handleKeyDown}>
          <div className="space-y-4">
        {/* Customer Care: Daily Sales Limit Banner */}
        {isCustomerCare && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">Daily Sales Available</div>
                <div className="text-2xl font-bold text-blue-700">
                  {isLoadingDailySales ? (
                    <span className="text-sm">Loading...</span>
                  ) : (
                    `TSh ${dailySalesAmount.toLocaleString()}`
                  )}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  You can record expenses up to today's sales amount
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Account Buttons - Simple & Clean Design */}
        {!isCustomerCare && paymentAccounts.length > 1 && (
          <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Pay from Account
          </label>
          <div className="grid grid-cols-2 gap-3">
            {paymentAccounts.map((account) => {
              const IconComponent = getAccountIcon(account.type);
              const color = getAccountColor(account.type);
              const isSelected = formData.account_id === account.id;
              const balance = account.balance || 0;
              
                // Simple color configuration
                const getColorClasses = () => {
                  const colorMap: any = {
                    green: {
                      bg: isSelected ? 'bg-green-50' : 'bg-white hover:bg-green-50',
                      border: isSelected ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200 hover:border-green-300',
                      iconBg: isSelected ? 'bg-green-600' : 'bg-green-100',
                      iconText: isSelected ? 'text-white' : 'text-green-600',
                      text: isSelected ? 'text-green-900' : 'text-gray-900',
                      amount: isSelected ? 'text-green-700' : 'text-green-600'
                    },
                    blue: {
                      bg: isSelected ? 'bg-blue-50' : 'bg-white hover:bg-blue-50',
                      border: isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300',
                      iconBg: isSelected ? 'bg-blue-600' : 'bg-blue-100',
                      iconText: isSelected ? 'text-white' : 'text-blue-600',
                      text: isSelected ? 'text-blue-900' : 'text-gray-900',
                      amount: isSelected ? 'text-blue-700' : 'text-blue-600'
                    },
                    purple: {
                      bg: isSelected ? 'bg-purple-50' : 'bg-white hover:bg-purple-50',
                      border: isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200 hover:border-purple-300',
                      iconBg: isSelected ? 'bg-purple-600' : 'bg-purple-100',
                      iconText: isSelected ? 'text-white' : 'text-purple-600',
                      text: isSelected ? 'text-purple-900' : 'text-gray-900',
                      amount: isSelected ? 'text-purple-700' : 'text-purple-600'
                    },
                    indigo: {
                      bg: isSelected ? 'bg-indigo-50' : 'bg-white hover:bg-indigo-50',
                      border: isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300',
                      iconBg: isSelected ? 'bg-indigo-600' : 'bg-indigo-100',
                      iconText: isSelected ? 'text-white' : 'text-indigo-600',
                      text: isSelected ? 'text-indigo-900' : 'text-gray-900',
                      amount: isSelected ? 'text-indigo-700' : 'text-indigo-600'
                    }
                  };
                  
                  return colorMap[color] || {
                    bg: isSelected ? 'bg-gray-50' : 'bg-white hover:bg-gray-50',
                    border: isSelected ? 'border-gray-500 ring-2 ring-gray-200' : 'border-gray-200 hover:border-gray-300',
                    iconBg: isSelected ? 'bg-gray-600' : 'bg-gray-100',
                    iconText: isSelected ? 'text-white' : 'text-gray-600',
                    text: isSelected ? 'text-gray-900' : 'text-gray-900',
                    amount: isSelected ? 'text-gray-700' : 'text-gray-600'
                  };
                };
                
                const classes = getColorClasses();
              
              return (
                <button
                  key={account.id}
                  onClick={() => handleSelectAccount(account.id)}
                    type="button"
                    className={`
                      p-4 rounded-xl border-2 transition-all
                      ${classes.bg} ${classes.border}
                      ${isSelected ? 'shadow-lg' : 'shadow hover:shadow-md'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${classes.iconBg} flex items-center justify-center`}>
                        <IconComponent className={`w-5 h-5 ${classes.iconText}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0 text-left">
                        <div className={`font-semibold text-sm truncate ${classes.text}`}>
                          {account.name}
                        </div>
                        <div className={`text-xs font-semibold tabular-nums ${classes.amount}`}>
                          TSh {balance.toLocaleString()}
                        </div>
                      </div>
                      
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                      )}
                    </div>
                </button>
              );
            })}
          </div>
          </div>
        )}

        {/* Customer Care: Cash Account (Auto-selected) - Simple Design */}
        {isCustomerCare && paymentAccounts.length > 0 && (
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Pay from Cash Account
            </label>
            
            <div className="p-4 rounded-xl border-2 border-green-500 bg-green-50 shadow-lg ring-2 ring-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-semibold text-sm truncate text-green-900">
                    {paymentAccounts[0].name}
                  </div>
                  <div className="text-xs font-semibold tabular-nums text-green-700">
                      TSh {(paymentAccounts[0].balance || 0).toLocaleString()}
                  </div>
                </div>
                
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expense Category */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Category
            </label>
            <div className="relative">
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full py-3 pl-12 pr-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 appearance-none cursor-pointer"
              >
                <option value="">Select category...</option>
                {expenseCategories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
                <option value="custom">Custom...</option>
              </select>
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
            </div>
            {/* Custom Category Input */}
            {formData.category === 'custom' && (
              <div className="mt-2 relative">
                <input
                  type="text"
                  value={formData.customCategory}
                  onChange={(e) => handleInputChange('customCategory', e.target.value)}
                  placeholder="Enter custom category name"
                  className="w-full py-3 pl-12 pr-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              </div>
            )}
          </div>

          {/* Vendor - Optional but visible */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Vendor <span className="text-gray-500 text-sm font-normal">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.vendor_name}
                onChange={(e) => handleInputChange('vendor_name', e.target.value)}
                placeholder="Supplier or vendor name"
                className="w-full py-3 pl-12 pr-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
              />
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>
          </div>
        </div>

        {/* Amount - Large and prominent (Full width) */}
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Amount (TSh) <span className="text-red-500">*</span>
            {isCustomerCare && (
              <span className="text-xs text-blue-600 ml-2 font-normal">
                (Max: TSh {dailySalesAmount.toLocaleString()})
              </span>
            )}
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={formData.amount ? formatNumberWithCommas(formData.amount) : ''}
              onChange={handleAmountChange}
              placeholder="0"
              autoFocus
              className="w-full pl-12 pr-4 py-3 text-2xl font-bold border-2 rounded-xl focus:outline-none transition-colors text-gray-900 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            />
          </div>
          {/* Amount validation indicator for customer care */}
          {isCustomerCare && formData.amount && (
            <div className="mt-1 text-xs">
              {parseFloat(formData.amount) > dailySalesAmount ? (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  <span>Amount exceeds daily sales limit</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-green-600">
                  <span>✓ Within daily sales limit</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description (Full width) */}
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Description <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="What was this expense for?"
              className="w-full py-3 pl-12 pr-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            />
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          </div>
        </div>
          </div>
        </div>

        {/* Action Buttons - Fixed Footer */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (isCustomerCare && parseFloat(formData.amount) > dailySalesAmount)}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Recording...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Record Expense
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QuickExpenseModal;



