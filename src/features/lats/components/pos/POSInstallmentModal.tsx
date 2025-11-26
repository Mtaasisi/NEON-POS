import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, DollarSign, Calendar, User, Building, AlertTriangle, FileText, TrendingUp, Plus, Minus, Check, ChevronDown, ChevronUp, Edit } from 'lucide-react';
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
  
  const [activeTab, setActiveTab] = useState<'basic' | 'dates' | 'summary'>('basic');
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedInstallment, setExpandedInstallment] = useState<number | null>(null);
  const [customInstallmentDates, setCustomInstallmentDates] = useState<string[]>([]);
  const [customInstallmentAmounts, setCustomInstallmentAmounts] = useState<number[]>([]);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  
  const [formData, setFormData] = useState({
    down_payment: 0, // This will be treated as "First Payment"
    number_of_installments: 3,
    payment_frequency: 'monthly' as PaymentFrequency,
    start_date: new Date().toISOString().split('T')[0],
    late_fee_amount: 0,
    notes: 'Created from POS',
    account_id: ''
  });

  // Calculate next payment date based on plan start date and frequency
  const calculateNextPaymentDate = (startDate: string, frequency: PaymentFrequency): string => {
    const start = new Date(startDate);
    const nextPayment = new Date(start);

    switch (frequency) {
      case 'weekly':
        nextPayment.setDate(start.getDate() + 7);
        break;
      case 'bi_weekly':
        nextPayment.setDate(start.getDate() + 14);
        break;
      case 'monthly':
        nextPayment.setMonth(start.getMonth() + 1);
        break;
      default:
        nextPayment.setMonth(start.getMonth() + 1);
    }

    return nextPayment.toISOString().split('T')[0];
  };

  // Debug props on mount and reset error state when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasAttemptedSubmit(false);
      // Initialize dates - Plan Start Date is always today (automatic)
      const today = new Date().toISOString().split('T')[0];
      setPlanStartDate(today);
      const initialNextPaymentDate = calculateNextPaymentDate(today, formData.payment_frequency);
      setFormData(prev => ({ ...prev, start_date: initialNextPaymentDate }));
      
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
    } else {
      // Reset form when modal closes
      setActiveTab('basic');
      setPlanStartDate(new Date().toISOString().split('T')[0]);
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

  // Calculate amounts accounting for first payment (down_payment is now first payment)
  // If first payment exists, it counts as payment #1, so we need one less installment
  const amountFinanced = cartTotal - formData.down_payment;
  const numberOfRemainingPayments = formData.down_payment > 0 
    ? formData.number_of_installments - 1 
    : formData.number_of_installments;
  const installmentAmount = numberOfRemainingPayments > 0 
    ? amountFinanced / numberOfRemainingPayments 
    : 0;

  // Generate installment schedule
  const generateInstallmentSchedule = useMemo(() => {
    const schedule: Array<{ number: number; dueDate: string; amount: number; status: 'pending' | 'overdue' | 'paid' }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add first payment if it exists
    if (formData.down_payment > 0) {
      schedule.push({
        number: 1,
        dueDate: planStartDate, // First payment is due today (plan start date)
        amount: formData.down_payment,
        status: 'paid' // First payment is considered paid since it's made at plan creation
      });
    }

    // Add regular installments
    // If first payment exists, it counts as payment #1, so we need one less installment
    const numberOfRemainingPayments = formData.down_payment > 0 
      ? formData.number_of_installments - 1 
      : formData.number_of_installments;
    
    for (let i = 0; i < numberOfRemainingPayments; i++) {
      let dueDate: Date;
      
      // Use custom date if available, otherwise calculate from next payment date
      if (customInstallmentDates[i]) {
        dueDate = new Date(customInstallmentDates[i]);
      } else {
        dueDate = new Date(formData.start_date);
        if (formData.payment_frequency === 'monthly') {
          dueDate.setMonth(dueDate.getMonth() + i);
        } else if (formData.payment_frequency === 'weekly') {
          dueDate.setDate(dueDate.getDate() + (i * 7));
        } else if (formData.payment_frequency === 'bi_weekly') {
          dueDate.setDate(dueDate.getDate() + (i * 14));
        }
      }

      const isOverdue = dueDate < today;
      const status: 'pending' | 'overdue' | 'paid' = isOverdue ? 'overdue' : 'pending';

      // Use custom amount if available, otherwise use calculated installment amount
      const amount = customInstallmentAmounts[i] || installmentAmount;

      schedule.push({
        number: (formData.down_payment > 0 ? i + 2 : i + 1), // Number continues from first payment
        dueDate: dueDate.toISOString().split('T')[0],
        amount: amount,
        status
      });
    }

    return schedule;
  }, [formData.number_of_installments, formData.start_date, formData.payment_frequency, formData.down_payment, customInstallmentDates, customInstallmentAmounts, installmentAmount, planStartDate]);

  // Initialize custom dates and amounts when number of installments or next payment date changes
  // Note: If first payment exists, it counts as payment #1, so we need one less installment
  useEffect(() => {
    if (formData.number_of_installments && formData.start_date) {
      const numberOfRemainingPayments = formData.down_payment > 0 
        ? formData.number_of_installments - 1 
        : formData.number_of_installments;
      
      if (numberOfRemainingPayments > 0) {
        const dates: string[] = [];
        const startDate = new Date(formData.start_date);
        
        for (let i = 0; i < numberOfRemainingPayments; i++) {
          const dueDate = new Date(startDate);
          if (formData.payment_frequency === 'monthly') {
            dueDate.setMonth(startDate.getMonth() + i);
          } else if (formData.payment_frequency === 'weekly') {
            dueDate.setDate(startDate.getDate() + (i * 7));
          } else if (formData.payment_frequency === 'bi_weekly') {
            dueDate.setDate(startDate.getDate() + (i * 14));
          }
          dates.push(dueDate.toISOString().split('T')[0]);
        }
        
        setCustomInstallmentDates(dates);
        
        // Initialize amounts only if the array length doesn't match or is empty
        if (customInstallmentAmounts.length !== numberOfRemainingPayments) {
          const amounts: number[] = [];
          for (let i = 0; i < numberOfRemainingPayments; i++) {
            // Preserve existing custom amounts if available, otherwise use calculated amount
            amounts.push(customInstallmentAmounts[i] || installmentAmount);
          }
          setCustomInstallmentAmounts(amounts);
        }
      } else {
        // If all payments are covered by first payment, clear custom dates/amounts
        setCustomInstallmentDates([]);
        setCustomInstallmentAmounts([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.number_of_installments, formData.start_date, formData.payment_frequency, formData.down_payment, installmentAmount]);

  // Auto-fill first payment when number of installments changes
  // Divide total amount equally by number of installments
  useEffect(() => {
    if (isOpen && formData.number_of_installments > 0 && cartTotal > 0) {
      const calculatedFirstPayment = cartTotal / formData.number_of_installments;
      setFormData(prev => ({ 
        ...prev, 
        down_payment: Math.round(calculatedFirstPayment * 100) / 100 // Round to 2 decimal places
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.number_of_installments, cartTotal, isOpen]);

  // Update next payment date when plan start date or frequency changes
  useEffect(() => {
    if (planStartDate && formData.payment_frequency) {
      const nextPaymentDate = calculateNextPaymentDate(planStartDate, formData.payment_frequency);
      setFormData(prev => ({ ...prev, start_date: nextPaymentDate }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planStartDate, formData.payment_frequency]);

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Navigation functions for tabs
  const handleNextStep = () => {
    if (activeTab === 'basic') {
      setActiveTab('dates');
    } else if (activeTab === 'dates') {
      setActiveTab('summary');
    }
  };

  const handlePreviousStep = () => {
    if (activeTab === 'dates') {
      setActiveTab('basic');
    } else if (activeTab === 'summary') {
      setActiveTab('dates');
    }
  };

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
        start_date: formData.start_date, // This is the next payment date
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

        {/* Tabs Navigation */}
        <div className="px-6 pt-6 pb-0 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Basic Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dates')}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'dates'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Dates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'summary'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Summary
            </button>
          </div>
        </div>

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

        {/* Customer Summary Section - Fixed (only show in Basic tab) */}
        {activeTab === 'basic' && (
          <>
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

            {/* Financial Summary Section - Fixed (only show in Basic tab) */}
        <div className="px-6 pb-4 flex-shrink-0">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              {/* Total Amount */}
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200">
                <div className="w-12 h-12 rounded-lg bg-emerald-500 flex items-center justify-center mb-3 shadow-sm">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">Total Amount</p>
                <p className="text-lg font-bold text-emerald-700">{formatPrice(cartTotal)} TZS</p>
                <p className="text-xs text-gray-500 mt-1">{cartItems?.length || 0} item{cartItems?.length !== 1 ? 's' : ''}</p>
              </div>

              {/* Amount to Finance */}
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200">
                <div className="w-12 h-12 rounded-lg bg-indigo-500 flex items-center justify-center mb-3 shadow-sm">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">To Finance</p>
                <p className="text-lg font-bold text-indigo-700">{formatPrice(amountFinanced)} TZS</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.down_payment > 0 ? 'After first payment' : 'Total to finance'}
                </p>
              </div>
            </div>

            {/* Payment Breakdown - Only show if first payment exists */}
            {formData.down_payment > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  {/* First Payment */}
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-semibold text-blue-700">First Payment</p>
                    </div>
                    <p className="text-base font-bold text-blue-900">{formatPrice(formData.down_payment)} TZS</p>
              </div>

              {/* Per Installment */}
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <p className="text-xs font-semibold text-purple-700">Per Installment</p>
                </div>
                <p className="text-base font-bold text-purple-900">{formatPrice(installmentAmount)} TZS</p>
              </div>
            </div>
              </div>
            )}
          </div>
        </div>
          </>
        )}

        {/* Form Wrapper */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Form Section */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Step 1: Basic Information */}
            {activeTab === 'basic' && (
              <>
                {/* Payment Frequency */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Payment Frequency <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const frequency = 'weekly' as PaymentFrequency;
                        setFormData(prev => ({ ...prev, payment_frequency: frequency }));
                        // Recalculate next payment date when frequency changes
                        if (planStartDate) {
                          const nextPaymentDate = calculateNextPaymentDate(planStartDate, frequency);
                          setFormData(prev => ({ ...prev, start_date: nextPaymentDate }));
                        }
                      }}
                      className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                        formData.payment_frequency === 'weekly'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const frequency = 'bi_weekly' as PaymentFrequency;
                        setFormData(prev => ({ ...prev, payment_frequency: frequency }));
                        // Recalculate next payment date when frequency changes
                        if (planStartDate) {
                          const nextPaymentDate = calculateNextPaymentDate(planStartDate, frequency);
                          setFormData(prev => ({ ...prev, start_date: nextPaymentDate }));
                        }
                      }}
                      className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                        formData.payment_frequency === 'bi_weekly'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      Bi-Weekly
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const frequency = 'monthly' as PaymentFrequency;
                        setFormData(prev => ({ ...prev, payment_frequency: frequency }));
                        // Recalculate next payment date when frequency changes
                        if (planStartDate) {
                          const nextPaymentDate = calculateNextPaymentDate(planStartDate, frequency);
                          setFormData(prev => ({ ...prev, start_date: nextPaymentDate }));
                        }
                      }}
                      className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                        formData.payment_frequency === 'monthly'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>

                {/* Number of Installments & First Payment */}
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
                      First Payment <span className="text-gray-500">(Optional)</span>
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
                  />
                </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {formData.down_payment > 0 ? 'Initial payment amount (optional)' : 'Optional initial payment'}
                    </p>
            </div>
          </div>
              </>
            )}

            {/* Step 2: Payment Dates */}
            {activeTab === 'dates' && (
              <>
          {/* Next Payment Date */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
              Next Payment Date <span className="text-red-500">*</span>
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
            <p className="text-xs text-gray-500 mt-1">
              {formData.payment_frequency === 'weekly' && `Calculated: 1 week from today${formData.down_payment > 0 ? ' (plan starts today with first payment)' : ''}`}
              {formData.payment_frequency === 'bi_weekly' && `Calculated: 2 weeks from today${formData.down_payment > 0 ? ' (plan starts today with first payment)' : ''}`}
              {formData.payment_frequency === 'monthly' && `Calculated: 1 month from today${formData.down_payment > 0 ? ' (plan starts today with first payment)' : ''}`}
            </p>
            </div>

          {/* Installment Schedule */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Installment Schedule
              </h4>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                <span className="text-xs font-semibold text-purple-700">
                  0 / {formData.number_of_installments} Paid
                </span>
          </div>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {generateInstallmentSchedule.map((installment, index) => {
                const isExpanded = expandedInstallment === installment.number;
                const dueDate = new Date(installment.dueDate);
                const formattedDate = dueDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                });
                const isOverdue = installment.status === 'overdue';
                const isFirstPayment = installment.number === 1 && formData.down_payment > 0;

                return (
                  <div key={installment.number} className="group relative">
                    <div
                      className={`p-5 rounded-2xl border-2 transition-all duration-200 bg-white ${
                        isOverdue
                          ? 'border-red-300 shadow-md hover:shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      } cursor-pointer`}
                      onClick={() => setExpandedInstallment(isExpanded ? null : installment.number)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className={`relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${
                              isOverdue
                                ? 'bg-gradient-to-br from-red-500 to-red-600'
                                : 'bg-gradient-to-br from-gray-400 to-gray-500'
                            } text-white`}
                          >
                            {installment.number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className={`w-4 h-4 flex-shrink-0 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`} />
                              <div className="text-base font-bold text-gray-900">{formattedDate}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase border ${
                                  isFirstPayment
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : isOverdue
                                    ? 'bg-red-100 text-red-800 border-red-200'
                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                }`}
                              >
                                {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                                {isFirstPayment ? 'paid' : installment.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                          <div className="text-right">
                            <div className={`text-2xl font-bold mb-1 ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                              {formatPrice(installment.amount)} TZS
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
          </div>

                    {/* Expanded Edit Section */}
                    {isExpanded && (
                      <div className="mt-2 p-4 bg-gray-50 rounded-xl border-2 border-blue-200">
                        <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                              Due Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                                value={
                                  installment.number === 1 && formData.down_payment > 0
                                    ? planStartDate
                                    : customInstallmentDates[installment.number - (formData.down_payment > 0 ? 2 : 1)] || installment.dueDate
                                }
                  onChange={(e) => {
                                  // First payment date cannot be edited (it's always today)
                                  if (installment.number === 1 && formData.down_payment > 0) {
                                    return;
                                  }
                                  const newDates = [...customInstallmentDates];
                                  const dateIndex = installment.number - (formData.down_payment > 0 ? 2 : 1);
                                  newDates[dateIndex] = e.target.value;
                                  setCustomInstallmentDates(newDates);
                  }}
                                disabled={installment.number === 1 && formData.down_payment > 0}
                                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                              Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                                value={formatPrice(
                                  installment.number === 1 && formData.down_payment > 0
                                    ? formData.down_payment
                                    : customInstallmentAmounts[installment.number - (formData.down_payment > 0 ? 2 : 1)] || installment.amount
                                )}
                    onChange={(e) => {
                                  // First payment amount is edited via the First Payment field
                                  if (installment.number === 1 && formData.down_payment > 0) {
                                    return;
                                  }
                      const value = e.target.value.replace(/,/g, '');
                      const numValue = parseFloat(value) || 0;
                                  const newAmounts = [...customInstallmentAmounts];
                                  const amountIndex = installment.number - (formData.down_payment > 0 ? 2 : 1);
                                  newAmounts[amountIndex] = numValue;
                                  setCustomInstallmentAmounts(newAmounts);
                    }}
                                disabled={installment.number === 1 && formData.down_payment > 0}
                                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                onClick={(e) => e.stopPropagation()}
                  />
                </div>
              <p className="text-xs text-gray-500 mt-1">
                              {installment.number === 1 && formData.down_payment > 0
                                ? 'First payment amount (edit in First Payment field)'
                                : 'Edit amount for this installment'}
                            </p>
                          </div>
                          {installment.number === 1 && formData.down_payment > 0 && (
                            <p className="text-xs text-gray-500 mt-1">First payment date is fixed to today</p>
                          )}
                        </div>
                      </div>
                    )}

                    {index < generateInstallmentSchedule.length - 1 && (
                      <div className={`absolute left-7 top-full w-0.5 h-3 ${isOverdue ? 'bg-red-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
              </>
            )}

            {/* Step 3: Summary */}
            {activeTab === 'summary' && (
              <>
            {/* Installment Plan Summary - Expandable Card */}
            <div className="space-y-6">
              {/* Expandable Summary Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header - Always Visible */}
                <div 
                  className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-gray-900">Installment Plan Summary</h4>
                        {!isSummaryExpanded && (
                          <div className="flex items-center gap-4 mt-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Customer:</span>
                              <span className="text-xs font-semibold text-gray-900">{customer?.name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Total:</span>
                              <span className="text-xs font-semibold text-gray-900">{formatPrice(cartTotal)} TZS</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Installments:</span>
                              <span className="text-xs font-semibold text-gray-900">{formData.number_of_installments}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Per Payment:</span>
                              <span className="text-xs font-semibold text-purple-700">{formatPrice(installmentAmount)} TZS</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {isSummaryExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
              </div>
            </div>

                {/* Expanded Content */}
                {isSummaryExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                    {/* Products Section */}
                    {cartItems && cartItems.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Products ({cartItems.length})</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                          {cartItems.map((item, index) => {
                            const productName = item.productName || item.name || item.product_name || `Item ${index + 1}`;
                            const variantName = item.variantName || item.variant_name;
                            const quantity = item.quantity || 1;
                            const unitPrice = item.unitPrice || item.unit_price || 0;
                            const totalPrice = item.totalPrice || item.total_price || (unitPrice * quantity);
                            
                            return (
                              <div key={index} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-900 truncate">
                                    {productName}
                                    {variantName && <span className="text-gray-500"> - {variantName}</span>}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Qty: {quantity} {unitPrice > 0 && `× ${formatPrice(unitPrice)}`}
                                  </p>
                                </div>
                                <div className="text-right ml-2 flex-shrink-0">
                                  <p className="text-xs font-bold text-gray-900">
                                    {formatPrice(totalPrice)} TZS
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-0.5">Customer</p>
                          <p className="text-sm font-bold text-gray-900">{customer?.name || 'N/A'}</p>
                          {customer?.phone && (
                            <p className="text-xs text-gray-600 mt-0.5">{customer.phone}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-0.5">Payment Frequency</p>
                          <p className="text-sm font-bold text-gray-900 capitalize">
                            {formData.payment_frequency.replace('_', '-')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-0.5">Number of Installments</p>
                          <p className="text-sm font-bold text-gray-900">{formData.number_of_installments}</p>
                        </div>
                      </div>

                      {/* Right Column - Financial */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-500">Total Amount</span>
                          <span className="text-sm font-bold text-gray-900">{formatPrice(cartTotal)} TZS</span>
                        </div>
                        {formData.down_payment > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500">First Payment</span>
                            <span className="text-sm font-bold text-blue-700">{formatPrice(formData.down_payment)} TZS</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-500">Amount to Finance</span>
                          <span className="text-sm font-bold text-indigo-700">{formatPrice(amountFinanced)} TZS</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-500">Per Installment</span>
                          <span className="text-sm font-bold text-purple-700">{formatPrice(installmentAmount)} TZS</span>
                        </div>
                        {formData.late_fee_amount > 0 && (
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                              Late Fee
                            </span>
                            <span className="text-sm font-bold text-orange-700">{formatPrice(formData.late_fee_amount)} TZS</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Schedule Summary */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Payment Schedule
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {generateInstallmentSchedule.map((installment) => {
                    const dueDate = new Date(installment.dueDate);
                    const formattedDate = dueDate.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    });
                    const isOverdue = installment.status === 'overdue';

                    return (
                      <div
                        key={installment.number}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isOverdue
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              isOverdue
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-400 text-white'
                            }`}
                          >
                            {installment.number}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{formattedDate}</p>
                            <p className={`text-xs ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                              {installment.status}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                          {formatPrice(installment.amount)} TZS
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

              {/* Payment Account Selection */}
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
              </div>
              </>
            )}
          </div>

          {/* Fixed Action Buttons Footer */}
          <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex gap-3">
            <button
              type="button"
                onClick={activeTab === 'basic' ? onClose : handlePreviousStep}
                className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-sm"
            >
                {activeTab === 'basic' ? 'Cancel' : 'Previous'}
            </button>
              {activeTab !== 'summary' ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl text-lg"
                >
                  Next
                </button>
              ) : (
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
              )}
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default POSInstallmentModal;

