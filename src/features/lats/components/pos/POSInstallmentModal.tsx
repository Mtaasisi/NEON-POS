import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, DollarSign, Calendar, User, Building, AlertTriangle, FileText, TrendingUp, Plus, Minus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { installmentService } from '../../../../lib/installmentService';
import { saleProcessingService } from '../../../../lib/saleProcessingService';
import { financeAccountService } from '../../../../lib/financeAccountService';
import { PaymentFrequency } from '../../../../types/specialOrders';
import { useBranch } from '../../../../context/BranchContext';

interface POSInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cartItems: any[];
  cartTotal: number;
  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  currentUser: any;
}

const POSInstallmentModal: React.FC<POSInstallmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  cartItems,
  cartTotal,
  customer,
  currentUser
}) => {
  const { currentBranch } = useBranch();
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Helper function to format numbers with comma separators
  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price.replace(/,/g, '')) : price;
    // Remove .00 for whole numbers
    if (num % 1 === 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  const [formData, setFormData] = useState({
    down_payment: 0,
    number_of_installments: 3,
    payment_frequency: 'monthly' as PaymentFrequency,
    start_date: new Date().toISOString().split('T')[0],
    late_fee_amount: 0,
    notes: 'Created from POS',
    account_id: ''
  });

  // Debug props on mount and reset error state when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasAttemptedSubmit(false);
      console.log('🔍 [POS Installment] Modal opened with props:');
      console.log('   - customer:', customer);
      console.log('   - currentUser:', currentUser);
      console.log('   - cartItems:', cartItems);
      console.log('   - cartTotal:', cartTotal);
      
      if (!customer) {
        console.error('❌ [POS Installment] Customer is null/undefined!');
      }
      if (!currentUser) {
        console.error('❌ [POS Installment] CurrentUser is null/undefined!');
      }
    }
  }, [isOpen, customer, currentUser, cartItems, cartTotal]);

  // Fetch payment accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!isOpen) return;
      
      setLoadingAccounts(true);
      try {
        const accounts = await financeAccountService.getPaymentMethods();
        setPaymentAccounts(accounts || []);
        if (accounts.length === 0) {
          toast.error('No payment accounts found. Please create a payment account first.');
        }
      } catch (error) {
        console.error('Error fetching payment accounts:', error);
        toast.error('Failed to load payment accounts');
        setPaymentAccounts([]);
      } finally {
        setLoadingAccounts(false);
      }
    };

      fetchAccounts();
  }, [isOpen]);

  const amountFinanced = cartTotal - formData.down_payment;
  const installmentAmount = amountFinanced / formData.number_of_installments;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark that form submission has been attempted
    setHasAttemptedSubmit(true);
    
    console.log('🚀 [POS Installment] Form submitted');
    console.log('📋 [POS Installment] Form Data:', formData);
    console.log('👤 [POS Installment] Customer:', customer);
    console.log('🛒 [POS Installment] Cart Total:', cartTotal);
    console.log('📦 [POS Installment] Cart Items Count:', cartItems?.length);
    
    // Validate customer
    if (!customer) {
      console.error('❌ [POS Installment] Customer is null/undefined');
      toast.error('Customer information is missing. Please select a customer.');
      return;
    }
    
    if (!customer.id) {
      console.error('❌ [POS Installment] Customer ID is missing:', customer);
      toast.error('Customer ID is missing. Please reselect the customer.');
      return;
    }
    
    // Validate cart
    if (!cartItems || cartItems.length === 0) {
      console.error('❌ [POS Installment] No items in cart');
      toast.error('Please add items to cart first');
      return;
    }
    
    if (!formData.account_id) {
      console.error('❌ [POS Installment] No payment account selected');
      toast.error('Please select a payment account');
      return;
    }

    if (formData.down_payment < 0 || formData.down_payment > cartTotal) {
      console.error('❌ [POS Installment] Invalid down payment:', formData.down_payment);
      toast.error('Invalid down payment amount');
      return;
    }

    if (!currentUser) {
      console.error('❌ [POS Installment] CurrentUser is null/undefined');
      toast.error('User not authenticated. Please log in again.');
      return;
    }
    
    if (!currentUser.id) {
      console.error('❌ [POS Installment] User ID is missing:', currentUser);
      toast.error('User ID is missing. Please log in again.');
      return;
    }

    console.log('✅ [POS Installment] All validations passed');
    setIsSubmitting(true);
    
    try {
      // Step 1: Create the sale first
      console.log('📝 [POS Installment] Step 1: Creating sale...');
      
      const saleData = {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        items: cartItems.map(item => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName || '',
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          costPrice: item.costPrice || 0,
          profit: item.profit || 0
        })),
        subtotal: cartTotal,
        tax: 0,
        discount: 0,
        total: cartTotal,
        paymentMethod: {
          type: 'installment',
          amount: 0, // Set to 0 to skip payment transaction creation
          details: {
            accountId: formData.account_id,
            reference: 'Installment Plan - Payments tracked via installment_payments table',
            notes: `Installment Plan: ${formData.number_of_installments} payments`
          }
        },
        // Set payment_status to 'completed' to avoid trigger issues
        // Actual payment tracking is handled by the installment_payments table
        paymentStatus: 'completed',
        soldBy: currentUser?.name || currentUser?.email || 'POS User',
        notes: `Installment Plan: ${formData.number_of_installments} payments`
      };

      console.log('📤 [POS Installment] Sale Data:', JSON.stringify(saleData, null, 2));
      
      const saleResult = await saleProcessingService.processSale(saleData as any);

      console.log('📥 [POS Installment] Sale Result:', saleResult);

      if (!saleResult.success || !saleResult.sale) {
        console.error('❌ [POS Installment] Sale creation failed:', saleResult.error);
        throw new Error(saleResult.error || 'Failed to create sale');
      }

      console.log('✅ [POS Installment] Sale created successfully');
      console.log('🔢 [POS Installment] Sale ID:', saleResult.sale.id);
      console.log('🔢 [POS Installment] Sale Number:', saleResult.sale.saleNumber);

      // Step 2: Create the installment plan linked to the sale
      console.log('📝 [POS Installment] Step 2: Creating installment plan...');
      
      // Automatically determine payment method from selected account
      const selectedAccount = paymentAccounts.find(acc => acc.id === formData.account_id);
      const paymentMethod = selectedAccount?.type === 'cash' ? 'cash' :
                           selectedAccount?.type === 'mobile_money' ? 'mobile_money' :
                           selectedAccount?.type === 'bank' || selectedAccount?.type === 'savings' ? 'bank_transfer' :
                           selectedAccount?.type === 'card' ? 'card' : 'cash';
      
      console.log('💳 [POS Installment] Payment Method from account:', {
        accountId: formData.account_id,
        accountName: selectedAccount?.name,
        accountType: selectedAccount?.type,
        derivedPaymentMethod: paymentMethod
      });
      
      const installmentData = {
        customer_id: customer.id,
        sale_id: saleResult.sale.id, // Link to the sale we just created
        total_amount: cartTotal,
        down_payment: formData.down_payment,
        number_of_installments: formData.number_of_installments,
        payment_frequency: formData.payment_frequency,
        start_date: formData.start_date,
        late_fee_amount: formData.late_fee_amount,
        notes: `${formData.notes} - Sale: ${saleResult.sale.saleNumber}`,
        payment_method: paymentMethod,
        account_id: formData.account_id
      };

      console.log('📤 [POS Installment] Installment Data:', JSON.stringify(installmentData, null, 2));
      console.log('👤 [POS Installment] Created By User ID:', currentUser.id);
      console.log('💰 [POS Installment] Payment Calculations:', {
        cartTotal,
        downPayment: formData.down_payment,
        amountToFinance: amountFinanced,
        calculatedInstallmentAmount: installmentAmount,
        numberOfInstallments: formData.number_of_installments
      });

      const installmentResult = await installmentService.createInstallmentPlan(
        installmentData,
        currentUser.id,
        currentBranch?.id
      );

      console.log('📥 [POS Installment] Installment Result:', installmentResult);

      if (installmentResult.success) {
        console.log('✅ [POS Installment] Installment plan created successfully!');
        console.log('🔢 [POS Installment] Plan Number:', installmentResult.plan?.plan_number);
        console.log('🔢 [POS Installment] Plan ID:', installmentResult.plan?.id);
        toast.success(`✅ Sale completed with installment plan!\nSale: ${saleResult.sale.saleNumber}\nPlan: ${installmentResult.plan?.plan_number}`);
        setHasAttemptedSubmit(false);
        onSuccess();
      } else {
        console.error('❌ [POS Installment] Installment plan creation failed:', installmentResult.error);
        toast.error(installmentResult.error || 'Failed to create installment plan');
      }
    } catch (error: any) {
      console.error('❌ [POS Installment] Error creating installment sale:', error);
      console.error('❌ [POS Installment] Error Stack:', error.stack);
      toast.error(error.message || 'An error occurred');
    } finally {
      console.log('🏁 [POS Installment] Process complete, resetting submit state');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
      <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[100000]" 
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="installment-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
        onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h3 id="installment-modal-title" className="text-2xl font-bold text-gray-900 mb-2">Create Installment Plan</h3>
              <p className="text-sm text-gray-600">Set up payment terms for this sale</p>
            </div>
          </div>
        </div>

        {/* Customer Summary Section - Fixed */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 mb-1">Customer</p>
                <p className="text-lg font-bold text-gray-900 truncate">{customer?.name || 'N/A'}</p>
                {customer?.phone && (
                  <p className="text-sm text-gray-600 mt-0.5">{customer.phone}</p>
                )}
                {customer?.email && (
                  <p className="text-xs text-gray-500 mt-0.5">{customer.email}</p>
                )}
            </div>
            </div>
          </div>
        </div>

        {/* Financial Summary Section - Fixed */}
        <div className="px-6 pb-4 flex-shrink-0">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-3 gap-4">
              {/* Total Amount */}
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-emerald-50/50 border border-emerald-100">
                <div className="w-12 h-12 rounded-lg bg-emerald-500 flex items-center justify-center mb-3">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Total Amount</p>
                <p className="text-base font-bold text-emerald-900">{formatPrice(cartTotal)} TZS</p>
                <p className="text-xs text-gray-500 mt-1">{cartItems?.length || 0} item{cartItems?.length !== 1 ? 's' : ''}</p>
              </div>

              {/* Amount to Finance */}
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-indigo-50/50 border border-indigo-100">
                <div className="w-12 h-12 rounded-lg bg-indigo-500 flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">To Finance</p>
                <p className="text-base font-bold text-indigo-900">{formatPrice(amountFinanced)} TZS</p>
                <p className="text-xs text-gray-500 mt-1">After down payment</p>
              </div>

              {/* Per Installment */}
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-purple-50/50 border border-purple-100">
                <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Per Installment</p>
                <p className="text-base font-bold text-purple-900">{formatPrice(installmentAmount)} TZS</p>
                <p className="text-xs text-gray-500 mt-1">{formData.number_of_installments} payment{formData.number_of_installments !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {formData.down_payment > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-700 text-center">
                  <span className="font-semibold text-blue-700">Down payment: {formatPrice(formData.down_payment)} TZS</span>
                  {' • '}
                  <span className="font-semibold text-purple-700">Each payment: {formatPrice(installmentAmount)} TZS</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Form Wrapper */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Form Section */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Number of Installments & Down Payment */}
            <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                Number of Installments <span className="text-red-500">*</span>
              </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.number_of_installments > 1) {
                        setFormData(prev => ({ ...prev, number_of_installments: prev.number_of_installments - 1 }));
                      }
                    }}
                    disabled={formData.number_of_installments <= 1}
                    className="w-10 h-12 flex items-center justify-center border-2 border-gray-300 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-5 h-5 text-gray-600" />
                  </button>
              <input
                type="number"
                value={formData.number_of_installments}
                onChange={(e) => setFormData(prev => ({ ...prev, number_of_installments: parseInt(e.target.value) || 1 }))}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-lg font-bold bg-white text-center"
                min="1"
                required
              />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, number_of_installments: prev.number_of_installments + 1 }));
                    }}
                    className="w-10 h-12 flex items-center justify-center border-2 border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-gray-600" />
                  </button>
                  </div>
                </div>
                <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Down Payment <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formatPrice(formData.down_payment || 0)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      const numValue = parseFloat(value) || 0;
                      setFormData(prev => ({ ...prev, down_payment: Math.min(numValue, cartTotal) }));
                    }}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-lg font-bold bg-white text-center"
                    required
                  />
                </div>
            </div>
          </div>

          {/* Payment Frequency & Start Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                Payment Frequency <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.payment_frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_frequency: e.target.value as PaymentFrequency }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white"
                required
              >
                <option value="weekly">Weekly</option>
                <option value="bi_weekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white"
                required
              />
                </div>
            </div>
          </div>

            {/* Late Fee */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Late Fee Amount</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newValue = Math.max(0, formData.late_fee_amount - 10000);
                    setFormData(prev => ({ ...prev, late_fee_amount: newValue }));
                  }}
                  disabled={formData.late_fee_amount <= 0}
                  className="w-10 h-12 flex items-center justify-center border-2 border-gray-300 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-5 h-5 text-gray-600" />
                </button>
                <div className="relative flex-1">
                  <AlertTriangle className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-orange-400" />
                  <input
                    type="text"
                    value={formatPrice(formData.late_fee_amount || 0)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      const numValue = parseFloat(value) || 0;
                      setFormData(prev => ({ ...prev, late_fee_amount: numValue }));
                    }}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 font-medium bg-white text-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, late_fee_amount: prev.late_fee_amount + 10000 }));
                  }}
                  className="w-10 h-12 flex items-center justify-center border-2 border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Payment Account */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-3">
                Payment Account <span className="text-red-500">*</span>
              </label>
              {loadingAccounts ? (
                <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600">Loading accounts...</span>
                </div>
              ) : paymentAccounts.length === 0 ? (
                <div className="p-4 border-2 border-orange-300 bg-orange-50 rounded-xl">
                  <p className="text-xs text-orange-600 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    No payment accounts found. Please create one in Settings.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {paymentAccounts.map(account => {
                      const isSelected = formData.account_id === account.id;
                      const paymentMethod = account.type === 'cash' ? 'cash' :
                                          account.type === 'mobile_money' ? 'mobile_money' :
                                          account.type === 'bank' || account.type === 'savings' ? 'bank_transfer' :
                                          account.type === 'card' ? 'card' : 'cash';
                      const displayMethod = paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      const showError = hasAttemptedSubmit && !formData.account_id;
                      
                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, account_id: account.id }));
                            // Clear error state when account is selected
                            if (hasAttemptedSubmit && account.id) {
                              setHasAttemptedSubmit(false);
                            }
                          }}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-lg'
                              : showError
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-blue-500' : 'bg-gray-200'
                            }`}>
                              <Building className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-sm mb-1 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {account.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                {account.type ? `${account.type.charAt(0).toUpperCase() + account.type.slice(1)}` : 'Account'}
                              </p>
                              {isSelected && (
                                <p className="text-xs text-blue-600 mt-1 font-medium">
                                  ✓ {displayMethod}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {hasAttemptedSubmit && !formData.account_id && (
                    <p className="text-xs text-red-600 mt-3 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Please select a payment account to continue
                    </p>
                  )}
                </>
              )}
          </div>

          {/* Notes */}
          <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Notes</label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white resize-none"
                  placeholder="Plan details..."
                  rows={3}
            />
              </div>
            </div>
          </div>

          {/* Fixed Action Buttons Footer */}
          <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
                className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
                disabled={isSubmitting || !formData.account_id || loadingAccounts}
                className="flex-1 px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
            >
              {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                  </span>
                ) : !formData.account_id ? (
                  <span className="flex items-center justify-center gap-2">
                    <X className="w-5 h-5" />
                    Select Account First
                  </span>
                ) : (
                  'Create Installment Plan'
              )}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default POSInstallmentModal;

