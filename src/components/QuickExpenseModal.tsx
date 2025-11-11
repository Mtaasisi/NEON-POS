import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../features/shared/components/ui/Modal';
import GlassButton from '../features/shared/components/ui/GlassButton';
import GlassInput from '../features/shared/components/ui/GlassInput';
import GlassSelect from '../features/shared/components/ui/GlassSelect';
import { 
  DollarSign, Zap, Building,
  CreditCard, FileText,
  Wallet, Smartphone, Banknote, AlertCircle, TrendingUp,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { financeAccountService, FinanceAccount } from '../lib/financeAccountService';
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

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Form state with smart defaults
  const [formData, setFormData] = useState({
    account_id: '',
    category: '',
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

      const total = sales?.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0) || 0;
      setDailySalesAmount(total);
    } catch (error) {
      console.error('Error fetching daily sales:', error);
      setDailySalesAmount(0);
    } finally {
      setIsLoadingDailySales(false);
    }
  };

  // Fetch data
  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (isCustomerCare) {
        fetchDailySales();
      }
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

      // Insert expense
      const { error } = await supabase
        .from('account_transactions')
        .insert({
          account_id: formData.account_id,
          transaction_type: 'expense',
          amount: amount,
          description: formData.category 
            ? `${formData.category}: ${formData.description}` 
            : formData.description,
          reference_number: reference,
          status: status,
          metadata: {
            category: formData.category || 'Other',
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

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Expense</h3>
            <p className="text-xs text-gray-500">Fast expense entry (Ctrl+Enter to save)</p>
          </div>
        </div>
      }
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
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

        {/* Admin: Info Banner */}
        {isAdmin && (
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800">
                Admin: Full access to all accounts with no limits
              </span>
            </div>
          </div>
        )}

        {/* Payment Account Buttons - Simple & Clean Design */}
        {!isCustomerCare && paymentAccounts.length > 1 && (
          <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <CreditCard className="w-4 h-4" />
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
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Wallet className="w-4 h-4" />
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

        {/* Expense Category */}
        <div>
          <GlassSelect
            label="Category"
            value={formData.category}
            onChange={(value) => handleInputChange('category', value)}
            options={expenseCategories.map(category => ({
              value: category.name,
              label: category.name
            }))}
            placeholder="Select category..."
            className="text-sm"
          />
        </div>

        {/* Amount - Large and prominent */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <DollarSign className="w-4 h-4" />
            Amount (TSh) *
            {isCustomerCare && (
              <span className="text-xs text-blue-600 ml-auto">
                (Max: TSh {dailySalesAmount.toLocaleString()})
              </span>
            )}
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={formData.amount ? formatNumberWithCommas(formData.amount) : ''}
              onChange={handleAmountChange}
              placeholder="0"
              autoFocus
              className="w-full pl-10 pr-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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

        {/* Description */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <FileText className="w-4 h-4" />
            Description *
          </label>
          <GlassInput
            type="text"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="What was this expense for?"
            className="text-base"
          />
        </div>

        {/* Vendor - Optional but visible */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <Building className="w-4 h-4" />
            Vendor (optional)
          </label>
          <GlassInput
            type="text"
            value={formData.vendor_name}
            onChange={(e) => handleInputChange('vendor_name', e.target.value)}
            placeholder="Supplier or vendor name"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <GlassButton
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </GlassButton>
          <GlassButton
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
            disabled={isSubmitting || (isCustomerCare && parseFloat(formData.amount) > dailySalesAmount)}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Recording...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Record Expense
              </>
            )}
          </GlassButton>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="text-center text-xs text-gray-500 pt-2 border-t flex items-center justify-center gap-2">
          <Zap className="w-3 h-3" />
          <span>Tip: Press <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded">Enter</kbd> to save quickly</span>
        </div>
      </div>
    </Modal>
  );
};

export default QuickExpenseModal;



