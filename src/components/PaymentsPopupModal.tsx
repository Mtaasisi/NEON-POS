import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, CreditCard, DollarSign, AlertCircle, CheckCircle2, Plus, Edit3, RefreshCw, QrCode, Lock, CheckCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePaymentMethodsContext } from '../context/PaymentMethodsContext';
import { usePaymentAccounts } from '../hooks/usePaymentAccounts';
import PaymentMethodIcon from './PaymentMethodIcon';
import { devicePriceService } from '../lib/devicePriceService';
import { toast } from 'react-hot-toast';
import { Currency, DEFAULT_CURRENCY, formatCurrency, SUPPORTED_CURRENCIES } from '../lib/currencyUtils';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { supabase } from '../lib/supabaseClient';

interface PaymentsPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  customerId?: string;
  customerName?: string;
  description?: string;
  onPaymentComplete: (paymentData: any, totalPaid?: number) => Promise<void>;
  title?: string;
  deviceId?: string; // For price updates
  allowPriceEdit?: boolean; // Enable price editing feature
  paymentType?: 'cash_in' | 'cash_out'; // Dynamic payment type
  currency?: string; // Purchase order currency
  exchangeRate?: number; // Exchange rate to TZS
}

interface PaymentEntry {
  id: string;
  method: string;
  methodId: string;
  amount: number;
  currency: string; // Added currency field
  account: string;
  accountId: string;
  reference?: string;
  notes?: string;
}

const PaymentsPopupModal: React.FC<PaymentsPopupModalProps> = ({
  isOpen,
  onClose,
  amount,
  customerId,
  customerName,
  description,
  onPaymentComplete,
  deviceId,
  allowPriceEdit = false,
  paymentType = 'cash_in',
  currency,
  exchangeRate
}) => {
  const { currentUser } = useAuth();
  const { paymentMethods, loading: methodsLoading } = usePaymentMethodsContext();
  const { paymentAccounts, refreshPaymentAccounts } = usePaymentAccounts(); // Add refresh function
  
  // Load payment methods directly if context is not available
  const [directPaymentMethods, setDirectPaymentMethods] = useState<any[]>([]);
  const [directLoading, setDirectLoading] = useState(false);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  
  // Supplier payment information for Chinese suppliers
  const [supplierPaymentInfo, setSupplierPaymentInfo] = useState<{
    wechat_qr_code?: string;
    alipay_qr_code?: string;
    bank_account_details?: string;
    wechat?: string;
    country?: string;
  } | null>(null);
  const [showPaymentQR, setShowPaymentQR] = useState(false);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Load supplier payment information for Chinese suppliers
  useEffect(() => {
    const loadSupplierPaymentInfo = async () => {
      if (!isOpen || !customerId || paymentType !== 'cash_out') {
        setSupplierPaymentInfo(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('lats_suppliers')
          .select('wechat_qr_code, alipay_qr_code, bank_account_details, wechat, country')
          .eq('id', customerId)
          .single();

        if (error) {
          console.error('Error fetching supplier payment info:', error);
          return;
        }

        // Only set payment info if supplier is from China and has payment data
        if (data && data.country === 'China' && 
            (data.wechat_qr_code || data.alipay_qr_code || data.bank_account_details)) {
          setSupplierPaymentInfo(data);
        } else {
          setSupplierPaymentInfo(null);
        }
      } catch (error) {
        console.error('Error loading supplier payment info:', error);
        setSupplierPaymentInfo(null);
      }
    };

    loadSupplierPaymentInfo();
  }, [isOpen, customerId, paymentType]);

  useEffect(() => {
    // If context is empty (outside provider), load payment methods directly
    if ((!paymentMethods || paymentMethods.length === 0) && !methodsLoading) {
      setDirectLoading(true);
      
      import('../lib/financeAccountService').then(({ financeAccountService }) => {
        financeAccountService.getPaymentMethods().then(methods => {
          setDirectPaymentMethods(methods);
          setDirectLoading(false);
        }).catch(err => {
          console.error('❌ Failed to load payment methods:', err);
          toast.error('Failed to load payment methods. Please refresh the page.');
          setDirectPaymentMethods([]);
          setDirectLoading(false);
        });
      });
    }
  }, [paymentMethods, methodsLoading, isOpen]);

  // Use context methods if available, otherwise use directly loaded methods
  const displayPaymentMethods = (paymentMethods && paymentMethods.length > 0) ? paymentMethods : directPaymentMethods;
  const isLoading = methodsLoading || directLoading;
  
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [customAmount, setCustomAmount] = useState('');
  const [showPriceEdit, setShowPriceEdit] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [priceEditReason, setPriceEditReason] = useState('');
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); // Debounce flag
  const [processingStep, setProcessingStep] = useState<string>(''); // Current processing step
  const [expandedMethodId, setExpandedMethodId] = useState<string | null>(null);
  const [methodAmounts, setMethodAmounts] = useState<Record<string, number>>({}); // Track amounts for each method in single mode
  const [quickPaySelectedMethodId, setQuickPaySelectedMethodId] = useState<string | null>(null); // Track which Quick Pay method was selected

  // Reset form when modal opens (balances refresh only when stale)
    useEffect(() => {
      if (isOpen) {
        setSelectedMethod('');
        setSelectedCurrency(DEFAULT_CURRENCY);
        setIsProcessing(false);
        setIsMultipleMode(false);
        setPaymentEntries([]);
        setCustomAmount('');
        setIsEditingAmount(false);
        setShowPriceEdit(false);
        setNewPrice('');
        setPriceEditReason('');
        setProcessingStep('');
        setMethodAmounts({});
        setQuickPaySelectedMethodId(null);

      // Only refresh balances if we don't have them or they're stale (older than 5 minutes)
      const shouldRefreshBalances = () => {
        if (!paymentAccounts || paymentAccounts.length === 0) return true;
        // Check if balances are stale (no timestamp available, assume refresh needed)
        return true; // For now, always refresh to ensure accuracy
      };

      if (shouldRefreshBalances()) {
        console.log('💳 Payment modal opened - Refreshing account balances...');
        const refreshBalances = async () => {
          setIsRefreshingBalances(true);
          try {
            if (refreshPaymentAccounts) {
              await refreshPaymentAccounts();
              console.log('✅ Account balances refreshed successfully');
            } else {
              // Fallback: reload payment accounts directly
              console.log('⚠️ Using fallback balance refresh');
              import('../lib/financeAccountService').then(({ financeAccountService }) => {
                financeAccountService.getPaymentMethods().then(methods => {
                  console.log('✅ Balances loaded via fallback:', methods.map(m => ({
                    name: m.name,
                    balance: m.balance,
                    currency: m.currency
                  })));
                });
              });
            }
          } catch (error) {
            console.error('❌ Failed to refresh balances:', error);
          } finally {
            setIsRefreshingBalances(false);
          }
        };

        refreshBalances();
      } else {
        console.log('💳 Payment modal opened - Using cached balances');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Calculate TZS conversion helper
  const calculateTZSAmount = (amount: number, currency?: string, exchangeRate?: number) => {
    if (!currency || currency === 'TZS' || !exchangeRate || exchangeRate === 1.0) {
      return null; // No conversion needed
    }
    return Math.round(amount * exchangeRate);
  };

  // Calculate TZS amount first (before using it)
  const amountInTZS = calculateTZSAmount(customAmount ? Number(customAmount) : amount, currency, exchangeRate);
  const showConversion = currency && currency !== 'TZS' && exchangeRate && exchangeRate > 1;

  // Calculate totals (now that amountInTZS is defined)
  // For multiple mode: convert all payment entries to TZS for accurate calculation
  const totalPaidInTZS = isMultipleMode
    ? paymentEntries.reduce((sum, entry) => {
        // Convert each entry to TZS if needed
        if (entry.currency === 'TZS' || !currency || !exchangeRate) {
          return sum + entry.amount;
        }
        // If entry currency matches the purchase order currency, use the exchange rate
        if (entry.currency === currency && exchangeRate) {
          return sum + Math.round(entry.amount * exchangeRate);
        }
        // Otherwise, assume entry is already in TZS or use 1:1 conversion
        return sum + entry.amount;
      }, 0)
    : paymentEntries.reduce((sum, entry) => sum + entry.amount, 0);
  
  const customerPaymentAmount = customAmount ? Number(customAmount) : totalPaidInTZS;
  // For remaining amount calculation, use TZS amount if available
  const baseAmount = amountInTZS || amount;
  
  // Calculate total paid for both modes
  // methodAmounts now stores TZS amounts (user enters TZS)
  const totalPaidForRemaining = isMultipleMode 
    ? totalPaidInTZS
    : (selectedMethod && methodAmounts[selectedMethod] && methodAmounts[selectedMethod] > 0
        ? methodAmounts[selectedMethod]  // Already in TZS
        : 0);
  
  const remainingAmount = baseAmount - totalPaidForRemaining;

  // Get the currency for display
  // If amountInTZS exists, we're displaying in TZS (converted amount)
  // Otherwise, use the original currency
  const displayCurrency = amountInTZS ? 'TZS' : (currency || 'TZS');
  const currencySymbol = displayCurrency === 'USD' ? '$' : 
                        displayCurrency === 'EUR' ? '€' : 
                        displayCurrency === 'GBP' ? '£' : 
                        displayCurrency === 'TZS' ? 'TSh' : displayCurrency;

  // Manual balance refresh function
  const handleManualBalanceRefresh = async () => {
    console.log('🔄 Manual balance refresh requested...');
    setIsRefreshingBalances(true);
    try {
      if (refreshPaymentAccounts) {
        await refreshPaymentAccounts();
        console.log('✅ Account balances refreshed manually');
        toast.success('Balances refreshed successfully');
      } else {
        // Fallback: reload payment accounts directly
        console.log('⚠️ Using fallback balance refresh');
        import('../lib/financeAccountService').then(({ financeAccountService }) => {
          financeAccountService.getPaymentMethods().then(methods => {
            console.log('✅ Balances loaded via fallback:', methods.map(m => ({
              name: m.name,
              balance: m.balance,
              currency: m.currency
            })));
            toast.success('Balances refreshed successfully');
          });
        });
      }
    } catch (error) {
      console.error('❌ Failed to refresh balances:', error);
      toast.error('Failed to refresh balances');
    } finally {
      setIsRefreshingBalances(false);
    }
  };

  // Auto-select the first available account for the selected payment method
  const getAutoSelectedAccount = (methodId: string) => {
    // First try to find a finance account linked to this payment method
    const linkedAccount = paymentAccounts.find(acc => acc.payment_method_id === methodId);
    if (linkedAccount) {
      return {
        id: linkedAccount.id,
        name: linkedAccount.name || linkedAccount.account_name,
        payment_method_id: methodId
      };
    }
    
    // Fallback: use the payment method itself as the account
    const method = paymentMethods.find(m => m.id === methodId);
    if (!method) return null;
    return {
      id: method.id,
      name: method.name,
      payment_method_id: methodId
    };
  };

  // Add payment entry in multiple mode
  const addPayment = (methodId: string, paymentAmount?: number) => {
    const method = paymentMethods.find(m => m.id === methodId);
    const account = getAutoSelectedAccount(methodId);
    
    if (!method) {
      toast.error('Payment method not found');
      return;
    }

    if (!account || !account.id) {
      toast.error('No payment account found for this method. Please set up a finance account first.');
      return;
    }

    // Calculate amount with better NaN handling
    let amount: number;
    if (paymentAmount !== undefined && paymentAmount > 0) {
      amount = paymentAmount;
    } else if (customAmount && customAmount.trim() !== '') {
      const parsed = parseFloat(customAmount);
      if (isNaN(parsed)) {
        toast.error('Please enter a valid number for amount');
        return;
      }
      amount = parsed;
    } else {
      // Use remaining amount, but convert to selected currency if needed
      if (selectedCurrency.code === 'TZS' || !currency || !exchangeRate) {
        amount = remainingAmount;
      } else if (selectedCurrency.code === currency) {
        // Convert remaining amount from TZS to selected currency
        amount = remainingAmount / exchangeRate;
      } else {
        amount = remainingAmount;
      }
    }
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    // Convert amount to TZS for comparison with remaining amount
    const amountInTZSForValidation = selectedCurrency.code === 'TZS' || !currency || !exchangeRate
      ? amount
      : (selectedCurrency.code === currency ? Math.round(amount * exchangeRate) : amount);

    if (amountInTZSForValidation > remainingAmount) {
      toast.error(`Amount (${amount.toLocaleString()} ${selectedCurrency.code}) exceeds remaining balance (${remainingAmount.toLocaleString()} ${displayCurrency})`);
      return;
    }

    console.log('➕ Adding payment entry:', {
      method: method.name,
      amount: amount,
      currency: selectedCurrency.code,
      accountId: account.id
    });

    const newEntry: PaymentEntry = {
      id: crypto.randomUUID(),
      method: method.name,
      methodId: method.id,
      amount: amount,
      currency: selectedCurrency.code,
      account: account.name,
      accountId: account.id,
      reference: '',
      notes: ''
    };

    setPaymentEntries(prev => [...prev, newEntry]);
    setCustomAmount('');
  };

  const removePayment = (index: number) => {
    setPaymentEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updatePaymentEntry = (index: number, field: keyof PaymentEntry, value: string | number) => {
    setPaymentEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  // Update amount for a specific payment method in single mode
  const updateMethodAmount = (methodId: string, value: string) => {
    const numericValue = parseFloat(value.replace(/,/g, '')) || 0;
    setMethodAmounts(prev => ({
      ...prev,
      [methodId]: numericValue
    }));
  };

  const handlePayment = async () => {
    // Prevent double-clicks with debouncing
    if (isProcessingPayment || isProcessing) {
      console.log('⚠️ Payment already processing, ignoring duplicate request');
      return;
    }

    if (isMultipleMode) {
      if (paymentEntries.length === 0) {
        toast.error('Please add at least one payment');
        return;
      }

      if (remainingAmount < 0) {
        toast.error('Payment amount exceeds required amount');
        return;
      }

      // Check balance for each payment entry (cash_out only)
      if (paymentType === 'cash_out') {
        for (const entry of paymentEntries) {
          const account = paymentAccounts.find(acc => acc.id === entry.accountId);
          if (account) {
            // Convert entry amount to account currency for comparison
            let checkAmount = entry.amount;
            const entryCurrency = entry.currency || currency || 'TZS';
            const accountCurrency = account.currency || 'TZS';
            
            // If currencies don't match, convert entry amount to account currency
            if (entryCurrency !== accountCurrency) {
              if (entryCurrency === currency && accountCurrency === 'TZS' && exchangeRate) {
                checkAmount = Math.round(entry.amount * exchangeRate);
              } else if (entryCurrency === 'TZS' && accountCurrency === currency && exchangeRate) {
                checkAmount = entry.amount / exchangeRate;
              }
              // If currencies don't match and we can't convert, assume 1:1 (shouldn't happen in practice)
            }
            
            if (account.balance < checkAmount) {
              toast.error(`Insufficient balance in ${account.name}. Available: ${account.balance.toLocaleString()} ${accountCurrency}, Required: ${checkAmount.toLocaleString()} ${accountCurrency}`);
              return;
            }
          }
        }
      }
    } else {
      if (!selectedMethod) {
        toast.error('Please select a payment method');
        return;
      }

      // Check balance for single payment (cash_out only)
      if (paymentType === 'cash_out') {
        const account = paymentAccounts.find(acc => acc.payment_method_id === selectedMethod);
        const methodSpecificAmount = methodAmounts[selectedMethod];
        const checkAmount = methodSpecificAmount && methodSpecificAmount > 0
          ? (currency && currency !== 'TZS' && exchangeRate ? Math.round(methodSpecificAmount * exchangeRate) : methodSpecificAmount)
          : (amountInTZS || amount);  // Use TZS amount if available
        if (account && account.balance < checkAmount) {
          toast.error(`Insufficient balance in ${account.name}. Available: ${account.balance.toLocaleString()} ${account.currency || 'TZS'}, Required: ${checkAmount.toLocaleString()}`);
          return;
        }
      }
    }

    // Set processing flags to prevent double-clicks
    setIsProcessing(true);
    setIsProcessingPayment(true);
    setProcessingStep('Validating payment details...');

    try {
      // UUID validation helper
      const isValidUUID = (uuid: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      if (isMultipleMode) {
        // Validate all payment method IDs and account IDs are valid UUIDs
        for (const entry of paymentEntries) {
          if (!entry.accountId) {
            toast.error(`Missing account ID for payment method: ${entry.method}. Please remove and re-add this payment.`);
            setIsProcessing(false);
            return;
          }
          if (!isValidUUID(entry.methodId)) {
            toast.error(`Invalid payment method ID: ${entry.method}. Please refresh and try again.`);
            setIsProcessing(false);
            return;
          }
          if (!isValidUUID(entry.accountId)) {
            toast.error(`Invalid account ID for: ${entry.method}. Please refresh and try again.`);
            setIsProcessing(false);
            return;
          }
        }

        setProcessingStep('Processing multiple payments...');

        console.log('💰 Multiple payments data:', paymentEntries.map(entry => ({
          method: entry.method,
          methodId: entry.methodId,
          accountId: entry.accountId,
          amount: entry.amount
        })));

        // Process multiple payments - validate amounts before sending and convert ALL to TZS
        // All payment amounts are converted to TZS regardless of entry currency
        const paymentData = paymentEntries.map(entry => {
          const entryAmount = typeof entry.amount === 'number' ? entry.amount : parseFloat(String(entry.amount));
          
          if (isNaN(entryAmount) || entryAmount <= 0) {
            throw new Error(`Invalid amount for payment method ${entry.method}: ${entry.amount}`);
          }
          
          // Convert to TZS if needed - ensure ALL payments are in TZS
          const entryCurrency = entry.currency || currency || 'TZS';
          let amountInTZS = entryAmount;
          if (entryCurrency !== 'TZS' && currency && exchangeRate && entryCurrency === currency) {
            // Convert from original currency to TZS using exchange rate
            amountInTZS = Math.round(entryAmount * exchangeRate);
          } else if (entryCurrency === 'TZS') {
            // Already in TZS, no conversion needed
            amountInTZS = entryAmount;
          }
          // If entryCurrency doesn't match purchase order currency, assume it's already in TZS
          
          return {
            amount: amountInTZS,  // Always in TZS - converted from entry currency if needed
            currency: 'TZS',  // Always process payments in TZS
            originalCurrency: entryCurrency,  // Track original currency for reference
            originalAmount: entryAmount,  // Track original amount in original currency for reference
            paymentMethod: entry.method,
            paymentMethodId: entry.methodId,
            paymentAccountId: entry.accountId,
            customerId: customerId,
            customerName: customerName,
            description: description,
            timestamp: new Date().toISOString()
          };
        });
        
        console.log('📤 Sending payment data:', paymentData);
        await onPaymentComplete(paymentData, totalPaidInTZS);
      } else {
        // Process single payment
        const method = paymentMethods.find(m => m.id === selectedMethod);
        const account = getAutoSelectedAccount(selectedMethod);
        
        if (!method) {
          toast.error('Payment method not found');
          setIsProcessing(false);
          return;
        }

        if (!account || !account.id) {
          toast.error('No payment account found for this method. Please set up a finance account first.');
          setIsProcessing(false);
          return;
        }

        // Validate UUIDs
        if (!isValidUUID(method.id)) {
          toast.error(`Invalid payment method ID. Please refresh and try again.`);
          setIsProcessing(false);
          return;
        }
        if (!isValidUUID(account.id)) {
          toast.error(`Invalid account ID. Please refresh and try again.`);
          setIsProcessing(false);
          return;
        }

        // Validate amount before sending
        // Always ensure we work with TZS amounts
        const methodSpecificAmount = methodAmounts[selectedMethod];
        
        // Calculate payment amount in TZS
        // methodSpecificAmount is now always in TZS (user enters TZS amounts)
        // Otherwise, use amountInTZS (already converted) or amount (if no conversion needed)
        let paymentAmount: number;
        
        if (methodSpecificAmount && methodSpecificAmount > 0) {
          // User entered a specific amount - it's already in TZS
          paymentAmount = methodSpecificAmount;
        } else {
          // Use the full amount - ensure it's in TZS
          paymentAmount = amountInTZS || (typeof amount === 'number' ? amount : parseFloat(String(amount)));
        }
        
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
          toast.error(`Invalid payment amount: ${paymentAmount}. Please refresh and try again.`);
          setIsProcessing(false);
          return;
        }

        setProcessingStep('Processing payment...');

        console.log('💳 Single payment data:', {
          method: method.name,
          methodId: method.id,
          account: account.name,
          accountId: account.id,
          amount: paymentAmount,
          originalAmount: amount,
          originalCurrency: currency,
          convertedToTZS: amountInTZS ? true : false
        });

        // Ensure payment amount is always in TZS
        // paymentAmount is already in TZS (user enters TZS amounts)
        // Calculate original amount in original currency for reference
        const originalAmount = currency && currency !== 'TZS' && exchangeRate
          ? (methodSpecificAmount && methodSpecificAmount > 0 
              ? Math.round(methodSpecificAmount / exchangeRate)  // Convert TZS back to original currency
              : amount)  // Use original amount prop
          : paymentAmount;  // No conversion needed
        
        const paymentData = [{
          amount: paymentAmount,  // Always in TZS
          currency: 'TZS',  // Always process payments in TZS
          originalCurrency: currency || 'TZS',  // Track original currency for reference
          originalAmount: originalAmount,  // Track original amount in original currency for reference
          paymentMethod: method.name,
          paymentMethodId: method.id,
          paymentAccountId: account.id,
          customerId: customerId,
          customerName: customerName,
          description: description,
          timestamp: new Date().toISOString()
        }];

        console.log('📤 Sending single payment:', paymentData[0]);
        
        // For single payment, totalPaid should equal the amount
        const singlePaymentTotalPaid = paymentAmount;
        await onPaymentComplete(paymentData, singlePaymentTotalPaid);
      }
      
      onClose();
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed. Please try again.');
      setProcessingStep('');
    } finally {
      setIsProcessing(false);
      setIsProcessingPayment(false); // Reset debounce flag
    }
  };

  if (!isOpen) return null;

  // Calculate completed payments count for progress indicator
  const completedCount = isMultipleMode 
    ? paymentEntries.length 
    : (selectedMethod && (methodAmounts[selectedMethod] && methodAmounts[selectedMethod] > 0) ? 1 : 0);

  // Calculate total paid
  // Calculate total paid - methodAmounts now stores TZS amounts
  const totalPaidCalculated = isMultipleMode 
    ? totalPaidInTZS
    : (selectedMethod 
        ? (methodAmounts[selectedMethod] && methodAmounts[selectedMethod] > 0
            ? methodAmounts[selectedMethod]  // Already in TZS
            : (amountInTZS || amount))
        : 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
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
            <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
              paymentType === 'cash_out' ? 'bg-red-600' : 'bg-green-600'
            }`}>
              <Lock className="w-8 h-8 text-white" />
            </div>

            {/* Text and Progress */}
            <div>
              <h3 id="payment-modal-title" className="text-2xl font-bold text-gray-900 mb-3">
                {paymentType === 'cash_out' ? 'Make Payment' : 'Complete Your Payment'}
              </h3>

              {/* Progress Indicator */}
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
                  completedCount > 0 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <CheckCircle className={`w-4 h-4 ${
                    completedCount > 0 ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm font-bold ${
                    completedCount > 0 ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {completedCount} Done
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Summary Section */}
        <div className="p-6 pb-0 flex-shrink-0">
          {/* Payment Summary for Entire Order */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 mb-2">Total Amount</p>
                <p className="text-6xl font-bold text-gray-900">
                  {(amountInTZS || amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {displayCurrency}
                </p>
                {showConversion && amountInTZS && (
                  <p className="text-xs text-gray-500 mt-2">
                    Original: {currency} {amount.toLocaleString()} • Exchange Rate: {exchangeRate?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsEditingAmount(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit amount"
              >
                <Edit3 className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            {isEditingAmount ? (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <div className="mb-3">
                      <select
                        value={selectedCurrency.code}
                        onChange={(e) => {
                          const newCurrency = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value);
                          if (newCurrency) {
                            setSelectedCurrency(newCurrency);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer mb-2"
                      >
                        {SUPPORTED_CURRENCIES.map(currencyOption => (
                          <option key={currencyOption.code} value={currencyOption.code}>
                            {currencyOption.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 focus-within:border-orange-500 transition-colors">
                      <input
                        type="text"
                        value={customAmount ? Number(customAmount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, '');
                          if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                            setCustomAmount(value);
                          }
                        }}
                        onClick={(e) => {
                          if (customAmount && Number(customAmount) > 0) {
                            setCustomAmount('');
                            e.currentTarget.value = '';
                          }
                        }}
                        className="w-full text-center text-3xl font-bold text-gray-900 bg-transparent border-none outline-none"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingAmount(false)}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setCustomAmount('');
                        setIsEditingAmount(false);
                      }}
                      className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

          </div>
        </div>

        {/* Scrollable Payment Methods List Section */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          {/* Quick Pay Buttons - Single Payment Method */}
          {!isMultipleMode && totalPaidCalculated === 0 && !isLoading && displayPaymentMethods.length > 0 && (
            <div className="py-4 border-b border-gray-200 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">
                  Quick Pay - Full Amount: <span className="font-bold text-green-600">
                    {(amountInTZS || amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {displayCurrency}
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {displayPaymentMethods.slice(0, 3).map((method, idx) => {
                  const colors = ['bg-green-600 hover:bg-green-700', 'bg-purple-600 hover:bg-purple-700', 'bg-blue-600 hover:bg-blue-700'];
                  const icons = [DollarSign, CreditCard, CreditCard];
                  const Icon = icons[idx] || CreditCard;
                  const labels = ['Cash', 'Mobile', 'Card'];
                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setExpandedMethodId(method.id);
                        setQuickPaySelectedMethodId(method.id); // Track which Quick Pay method was clicked
                        // Set the method amount to the full amount when using quick pay
                        // Store in TZS (user enters TZS amounts)
                        // amountInTZS is the converted TZS amount, or amount if already in TZS
                        const quickPayAmount = amountInTZS || amount;
                        setMethodAmounts(prev => ({
                          ...prev,
                          [method.id]: quickPayAmount
                        }));
                      }}
                      disabled={paymentType === 'cash_out' && (() => {
                        const account = paymentAccounts.find(acc => acc.payment_method_id === method.id);
                        const checkAmount = amountInTZS || amount;
                        return account && account.balance < checkAmount;
                      })()}
                      className={`px-4 py-3 ${colors[idx]} disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2`}
                    >
                      <Icon className="w-5 h-5" />
                      Pay {labels[idx] || method.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clear Payments Button - Show when payments are set */}
          {totalPaidCalculated > 0 && (
            <div className="py-3 mb-4 border-b border-gray-200">
              <button
                onClick={() => {
                  if (isMultipleMode) {
                    setPaymentEntries([]);
                  } else {
                    setSelectedMethod('');
                    setMethodAmounts({});
                    setQuickPaySelectedMethodId(null); // Reset Quick Pay selection
                  }
                  setExpandedMethodId(null);
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border-2 border-orange-200 hover:border-orange-300 text-orange-700 rounded-xl font-semibold transition-all duration-200 text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md group"
              >
                <div className="w-8 h-8 rounded-full bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-orange-600" />
                </div>
                <span className="font-bold">Clear Payment & Switch to {isMultipleMode ? 'Single' : 'Split'} Mode</span>
                <ChevronDown className="w-4 h-4 text-orange-600 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* Payment Methods List */}
          <div className="py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading payment methods...</span>
              </div>
            ) : displayPaymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No payment methods available</p>
                <p className="text-sm text-gray-500 mt-2">Please contact administrator to set up payment methods</p>
              </div>
            ) : isMultipleMode ? (
              /* Multiple Payment Mode - Card Style */
              <div className="space-y-4">
                {paymentEntries.map((entry, index) => {
                  const method = displayPaymentMethods.find(m => m.id === entry.methodId);
                  const currency = SUPPORTED_CURRENCIES.find(c => c.code === entry.currency) || DEFAULT_CURRENCY;
                  const isExpanded = expandedMethodId === entry.id;
                  const account = paymentAccounts.find(acc => acc.id === entry.accountId);
                  
                  return (
                    <div
                      key={entry.id}
                      className="border-2 rounded-2xl bg-white shadow-sm border-green-200 hover:border-green-300 transition-all duration-300 hover:shadow-md"
                    >
                      <div 
                        className="flex items-start justify-between p-6 cursor-pointer"
                        onClick={() => setExpandedMethodId(isExpanded ? null : entry.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-200">
                              <ChevronDown
                                className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-lg font-bold text-gray-900">{entry.method}</h4>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm bg-green-500 text-white">
                                  <CheckCircle className="w-3 h-3" />
                                  Done
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {entry.account} • {entry.currency}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-xl text-base font-bold shadow-sm border bg-green-100 text-green-700 border-green-200">
                          {formatCurrency(entry.amount, currency)}
                        </div>
                      </div>
                      
                      {/* Expanded Content - Edit Amount */}
                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-gray-100">
                          <div className="mt-4 space-y-4">
                            {/* Amount Input Field */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Edit {entry.method} Amount
                              </label>
                              <div className="mb-3">
                                <select
                                  value={entry.currency}
                                  onChange={(e) => {
                                    const newCurrency = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value);
                                    if (newCurrency) {
                                      updatePaymentEntry(index, 'currency', newCurrency.code);
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer mb-2"
                                >
                                  {SUPPORTED_CURRENCIES.map(currencyOption => (
                                    <option key={currencyOption.code} value={currencyOption.code}>
                                      {currencyOption.code}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 focus-within:border-orange-500 transition-colors">
                                <input
                                  type="text"
                                  value={entry.amount > 0 ? entry.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ''}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/,/g, '');
                                    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                                      updatePaymentEntry(index, 'amount', value === '' ? 0 : parseFloat(value));
                                    }
                                  }}
                                  onClick={(e) => {
                                    if (entry.amount > 0) {
                                      updatePaymentEntry(index, 'amount', 0);
                                      e.currentTarget.value = '';
                                    }
                                  }}
                                  placeholder="0"
                                  className="w-full text-center text-3xl font-bold text-gray-900 bg-transparent border-none outline-none"
                                />
                              </div>
                            </div>
                            
                            {/* Account Details */}
                            {account && (
                              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Current Balance:</span>
                                    <p className="font-bold text-gray-900">{account.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {account.currency || 'TZS'}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Amount to {paymentType === 'cash_out' ? 'Pay' : 'Receive'}:</span>
                                    <p className="font-bold text-gray-900">
                                      {entry.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {entry.currency}
                                    </p>
                                  </div>
                                  <div className="col-span-2 pt-2 border-t border-gray-200">
                                    <span className="text-gray-600">Balance After Payment:</span>
                                    <p className={`font-bold ${Math.max(0, account.balance - entry.amount) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                      {Math.max(0, account.balance - entry.amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {account.currency || 'TZS'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Remove Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removePayment(index);
                                setExpandedMethodId(null);
                              }}
                              className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg font-medium transition-colors"
                            >
                              Remove This Payment
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Payment Method Card */}
                {remainingAmount > 0 && (
                  <div
                    className="border-2 rounded-2xl bg-white shadow-sm border-orange-300 hover:border-orange-400 transition-all duration-300 hover:shadow-md cursor-pointer"
                    onClick={() => setExpandedMethodId(expandedMethodId === 'add' ? null : 'add')}
                  >
                    <div className="flex items-start justify-between p-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-200">
                            <ChevronDown
                              className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                                expandedMethodId === 'add' ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900">Add Payment Method</h4>
                            <p className="text-sm text-gray-600 mt-1">Select another payment method</p>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-2 rounded-xl text-base font-bold shadow-sm border bg-red-100 text-red-700 border-red-200">
                        Amount Required
                      </div>
                    </div>

                    {expandedMethodId === 'add' && (
                      <div className="px-6 pb-6 border-t border-gray-100">
                        <div className="mt-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                              <div className="mb-3">
                                <select
                                  value={selectedCurrency.code}
                                  onChange={(e) => {
                                    const newCurrency = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value);
                                    if (newCurrency) {
                                      setSelectedCurrency(newCurrency);
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer mb-2"
                                >
                                  {SUPPORTED_CURRENCIES.map(currencyOption => (
                                    <option key={currencyOption.code} value={currencyOption.code}>
                                      {currencyOption.code}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 focus-within:border-orange-500 transition-colors">
                                <input
                                  type="text"
                                  value={customAmount ? Number(customAmount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ''}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/,/g, '');
                                    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                                      setCustomAmount(value);
                                    }
                                  }}
                                  onClick={(e) => {
                                    if (customAmount && Number(customAmount) > 0) {
                                      setCustomAmount('');
                                      e.currentTarget.value = '';
                                    }
                                  }}
                                  placeholder="0"
                                  className="w-full text-center text-3xl font-bold text-gray-900 bg-transparent border-none outline-none"
                                />
                              </div>
                              {showConversion && customAmount && Number(customAmount) > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  ≈ {calculateTZSAmount(Number(customAmount), selectedCurrency.code, exchangeRate)?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} TZS
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const paymentAmount = customAmount ? Number(customAmount) : undefined;
                                    addPayment(e.target.value, paymentAmount);
                                    e.target.value = '';
                                    setCustomAmount('');
                                    setExpandedMethodId(null);
                                  }
                                }}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-white"
                              >
                                <option value="">Choose method</option>
                                {displayPaymentMethods.map((method) => {
                                  const account = paymentAccounts.find(acc => acc.payment_method_id === method.id);
                                  return (
                                    <option key={method.id} value={method.id}>
                                      {method.name} {account ? `(Balance: ${account.balance.toLocaleString()} ${account.currency || 'TZS'})` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </div>
                          {remainingAmount > 0 && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-700">
                                <span className="font-semibold">Remaining:</span> {remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {displayCurrency}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Single Payment Mode - Card Style - Grid Layout */
              <div className={quickPaySelectedMethodId ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                {(quickPaySelectedMethodId 
                  ? displayPaymentMethods.filter(method => method.id === quickPaySelectedMethodId)
                  : displayPaymentMethods
                ).map((method) => {
              const isExpanded = expandedMethodId === method.id;
              const account = paymentAccounts.find(acc => acc.payment_method_id === method.id);
              const methodSpecificAmount = methodAmounts[method.id];
              const basePaymentAmount = amountInTZS || amount;
              // methodSpecificAmount is now always in TZS (user enters TZS amounts)
              const paymentAmount = methodSpecificAmount && methodSpecificAmount > 0
                ? methodSpecificAmount
                : basePaymentAmount;
              const hasInsufficientBalance = paymentType === 'cash_out' && account && account.balance < paymentAmount;
              const isSelected = selectedMethod === method.id;
              const borderColor = isSelected
                ? 'border-green-200 hover:border-green-300'
                : isExpanded
                  ? 'border-blue-500'
                  : 'border-orange-300 hover:border-orange-400';

              return (
                <div
                  key={method.id}
                  className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${borderColor} hover:shadow-md`}
                >
                  {/* Item Header - Clickable */}
                  <div
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedMethodId(null);
                      } else {
                        setExpandedMethodId(method.id);
                        if (!hasInsufficientBalance) {
                          setSelectedMethod(method.id);
                        }
                      }
                    }}
                    className="flex items-start justify-between p-6 cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors bg-gray-200">
                          <ChevronDown
                            className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-bold text-gray-900">{method.name}</h4>
                            {(isSelected || (methodAmounts[method.id] && methodAmounts[method.id] > 0)) && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm bg-green-500 text-white">
                                <CheckCircle className="w-3 h-3" />
                                Done
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {account ? (
                              <>
                                Balance: {account.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {account.currency || 'TZS'}
                                {hasInsufficientBalance && (
                                  <span className="text-red-600 ml-2">• Insufficient</span>
                                )}
                              </>
                            ) : (
                              'Select this payment method'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {/* Amount Badge */}
                      <div
                        className={`px-4 py-2 rounded-xl text-base font-bold shadow-sm border ${
                          isSelected || (methodAmounts[method.id] && methodAmounts[method.id] > 0)
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-red-100 text-red-700 border-red-200'
                        }`}
                      >
                        {isSelected || (methodAmounts[method.id] && methodAmounts[method.id] > 0) ? (
                          `${paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${displayCurrency}`
                        ) : (
                          'Amount Required'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content - Account Details and Amount Input */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-gray-100">
                      <div className="mt-4 space-y-4">
                        {/* Amount Input Field */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Enter {method.name} Amount (in TZS)
                          </label>
                          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 focus-within:border-orange-500 transition-colors">
                            <input
                              type="text"
                              value={methodAmounts[method.id] > 0 ? methodAmounts[method.id].toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ''}
                              onChange={(e) => updateMethodAmount(method.id, e.target.value)}
                              onClick={(e) => {
                                if (methodAmounts[method.id] > 0) {
                                  setMethodAmounts(prev => ({ ...prev, [method.id]: 0 }));
                                  e.currentTarget.value = '';
                                }
                              }}
                              placeholder="0"
                              className="w-full text-center text-3xl font-bold text-gray-900 bg-transparent border-none outline-none"
                            />
                          </div>
                          {methodAmounts[method.id] > 0 && currency && currency !== 'TZS' && exchangeRate && (
                            <p className="text-xs text-gray-500 mt-2">
                              ≈ {(methodAmounts[method.id] / exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {currency}
                            </p>
                          )}
                        </div>
                        {account && (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Current Balance:</span>
                                <p className="font-bold text-gray-900">{account.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {account.currency || 'TZS'}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Amount to {paymentType === 'cash_out' ? 'Pay' : 'Receive'}:</span>
                                <p className="font-bold text-gray-900">
                                  {paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {displayCurrency}
                                </p>
                              </div>
                              <div className="col-span-2 pt-2 border-t border-gray-200">
                                <span className="text-gray-600">Balance After Payment:</span>
                                <p className={`font-bold ${Math.max(0, account.balance - paymentAmount) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                  {Math.max(0, account.balance - paymentAmount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {account.currency || 'TZS'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
              </div>
            )}
          </div>
        </div>

        {/* Price Edit Section - Show when customer pays more than original amount */}
        {allowPriceEdit && deviceId && customerPaymentAmount > amount && (
          <div className="px-6 mt-6 p-5 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Edit3 className="w-5 h-5 text-gray-700" />
              <h4 className="text-lg font-semibold text-gray-900">Customer Paid More</h4>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Original Price:</span>
                    <p className="font-semibold text-gray-900">{formatCurrency(amount, selectedCurrency)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount Paid:</span>
                    <p className="font-semibold text-gray-900">{formatCurrency(customerPaymentAmount, selectedCurrency)}</p>
                  </div>
                </div>
              </div>

              {!showPriceEdit ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    Customer paid <span className="font-semibold">{formatCurrency(customerPaymentAmount - amount, selectedCurrency)}</span> more than the original price.
                  </p>
                  <button
                    onClick={() => {
                      setNewPrice(customerPaymentAmount.toString());
                      setShowPriceEdit(true);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Update Price to Match Payment
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Repair Price
                    </label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new price"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Price Change
                    </label>
                    <textarea
                      value={priceEditReason}
                      onChange={(e) => setPriceEditReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                      placeholder="e.g., Customer paid more, additional services provided..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!deviceId || !currentUser?.id) return;
                        
                        try {
                          await devicePriceService.updateDeviceRepairPrice({
                            deviceId,
                            repairPrice: parseFloat(newPrice),
                            updatedBy: currentUser?.id,
                            reason: priceEditReason || 'Price adjusted to match customer payment'
                          });
                          
                          toast.success('Device price updated successfully');
                          setShowPriceEdit(false);
                        } catch (error) {
                          console.error('Error updating device price:', error);
                          toast.error('Failed to update device price');
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Update Price
                    </button>
                    <button
                      onClick={() => setShowPriceEdit(false)}
                      className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          {/* Status Messages */}
          {remainingAmount > 0 && (
            <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-orange-700">
                {paymentType === 'cash_out' ? 'Amount to pay' : 'Amount remaining'}: {remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {displayCurrency}
              </span>
            </div>
          )}


          {/* Main Action Button */}
          <button
            onClick={handlePayment}
            disabled={
              isProcessing ||
              (remainingAmount > 0 &&
                !isMultipleMode &&
                !selectedMethod) ||
              (remainingAmount > 0 &&
                isMultipleMode &&
                paymentEntries.length === 0)
            }
            className={`w-full px-6 py-3.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2 ${
              !isProcessing &&
              (isMultipleMode ? paymentEntries.length > 0 : selectedMethod) &&
              remainingAmount <= 0
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : !(isMultipleMode ? paymentEntries.length > 0 : selectedMethod) || remainingAmount > 0 ? (
              <>
                <Lock className="w-5 h-5" />
                {!selectedMethod && !isMultipleMode ? 'Select Payment Method First' : remainingAmount > 0 ? 'Complete All Payments First' : 'Set Payment Amount'}
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {paymentType === 'cash_out' ? 'Make Payment' : 'Complete Payment'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PaymentsPopupModal;