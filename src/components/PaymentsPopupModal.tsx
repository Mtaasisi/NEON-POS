import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, CreditCard, DollarSign, AlertCircle, CheckCircle2, Plus, Edit3, RefreshCw, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePaymentMethodsContext } from '../context/PaymentMethodsContext';
import { usePaymentAccounts } from '../hooks/usePaymentAccounts';
import PaymentMethodIcon from './PaymentMethodIcon';
import { devicePriceService } from '../lib/devicePriceService';
import { toast } from 'react-hot-toast';
import { Currency, DEFAULT_CURRENCY, formatCurrencyWithFlag, SUPPORTED_CURRENCIES } from '../lib/currencyUtils';
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

  // Reset form and REFRESH BALANCES when modal opens
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
      
      // 🔄 AUTOMATIC BALANCE REFRESH when modal opens
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
  const totalPaid = paymentEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const customerPaymentAmount = customAmount ? Number(customAmount) : totalPaid;
  // For remaining amount calculation, use TZS amount if available
  const baseAmount = amountInTZS || amount;
  const remainingAmount = baseAmount - totalPaid;

  // Get the currency for display
  const displayCurrency = currency || 'TZS';
  const currencySymbol = displayCurrency === 'USD' ? '$' : 
                        displayCurrency === 'EUR' ? '€' : 
                        displayCurrency === 'GBP' ? '£' : 
                        displayCurrency === 'TZS' ? 'TSh' : displayCurrency;

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
      amount = remainingAmount;
    }
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    if (amount > remainingAmount) {
      toast.error(`Amount (${amount.toLocaleString()}) exceeds remaining balance (${remainingAmount.toLocaleString()})`);
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

  const handlePayment = async () => {
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
          if (account && account.balance < entry.amount) {
            toast.error(`Insufficient balance in ${account.name}. Available: ${account.balance.toLocaleString()}, Required: ${entry.amount.toLocaleString()}`);
            return;
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
        const checkAmount = amountInTZS || amount;  // Use TZS amount if available
        if (account && account.balance < checkAmount) {
          toast.error(`Insufficient balance in ${account.name}. Available: ${account.balance.toLocaleString()} ${account.currency || 'TZS'}, Required: ${checkAmount.toLocaleString()}`);
          return;
        }
      }
    }

    setIsProcessing(true);
    
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

        console.log('💰 Multiple payments data:', paymentEntries.map(entry => ({
          method: entry.method,
          methodId: entry.methodId,
          accountId: entry.accountId,
          amount: entry.amount
        })));

        // Process multiple payments - validate amounts before sending
        const paymentData = paymentEntries.map(entry => {
          const entryAmount = typeof entry.amount === 'number' ? entry.amount : parseFloat(String(entry.amount));
          
          if (isNaN(entryAmount) || entryAmount <= 0) {
            throw new Error(`Invalid amount for payment method ${entry.method}: ${entry.amount}`);
          }
          
          return {
            amount: entryAmount,
            currency: entry.currency || currency || 'TZS',
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
        await onPaymentComplete(paymentData, totalPaid);
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
        // Use TZS converted amount if available (for foreign currency), otherwise use original amount
        const paymentAmount = amountInTZS || (typeof amount === 'number' ? amount : parseFloat(String(amount)));
        
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
          toast.error(`Invalid payment amount: ${amount}. Please refresh and try again.`);
          setIsProcessing(false);
          return;
        }

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

        const paymentData = [{
          amount: paymentAmount,  // Always in TZS
          currency: 'TZS',  // Always process payments in TZS
          originalCurrency: currency,  // Track original currency for reference
          originalAmount: amount,  // Track original amount for reference
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
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              paymentType === 'cash_out'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}>
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {paymentType === 'cash_out' ? 'Make Payment' : 'Complete Your Payment'}
              </h2>
              <p className="text-sm text-gray-600">
                {paymentType === 'cash_out' 
                  ? (customerName ? `Payment to ${customerName}` : 'Process outgoing payment')
                  : (customerName ? `Thank you, ${customerName}!` : 'Secure payment processing')
                }
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Payment Summary */}
          <div className="mb-6 p-6 rounded-xl border bg-white border-gray-200">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                paymentType === 'cash_out'
                  ? 'bg-red-500'
                  : 'bg-green-500'
              }`}>
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <h3 className="text-lg font-bold text-gray-900">
                  {paymentType === 'cash_out' ? 'Amount to Pay' : 'Total Amount Due'}
                </h3>
                <button
                  onClick={() => {
                    setIsEditingAmount(true);
                  }}
                  className="p-1 hover:bg-green-100 rounded-full transition-colors"
                  title="Edit amount"
                >
                  <Edit3 className="w-4 h-4 text-green-600" />
                </button>
              </div>
              {isEditingAmount ? (
                <div className="space-y-4">
                  <div className="max-w-sm mx-auto">
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg focus-within:border-orange-500 transition-colors h-16">
                      {/* Currency Selector */}
                      <div className="flex items-center gap-2 px-4 py-4 border-r border-gray-200 h-full">
                        <span className="text-lg">{selectedCurrency.flag}</span>
                        <select
                          value={selectedCurrency.code}
                          onChange={(e) => {
                            const newCurrency = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value);
                            if (newCurrency) {
                              setSelectedCurrency(newCurrency);
                            }
                          }}
                          className="bg-transparent border-none text-gray-700 text-base focus:outline-none focus:ring-0 cursor-pointer"
                        >
                          {SUPPORTED_CURRENCIES.map(currencyOption => (
                            <option key={currencyOption.code} value={currencyOption.code}>
                              {currencyOption.flag} {currencyOption.code}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Amount Input */}
                      <div className="flex-1 px-4 py-4 h-full">
                        <input
                          type="text"
                          value={customAmount ? Number(customAmount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, '');
                            if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                              setCustomAmount(value);
                            }
                          }}
                          className="w-full border-0 focus:outline-none focus:ring-0 text-3xl font-bold text-gray-900 placeholder-gray-400 bg-transparent h-full"
                          placeholder="0"
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setIsEditingAmount(false)}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setCustomAmount('');
                        setIsEditingAmount(false);
                      }}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-bold text-green-600 mb-2">
                    {currencySymbol} {(customAmount ? Number(customAmount) : amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    {displayCurrency} • Amount to Pay
                  </p>
                  
                  {/* Show TZS Conversion for foreign currencies */}
                  {showConversion && amountInTZS && (
                    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-center gap-2 text-blue-700 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Currency Conversion</span>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs text-blue-600">
                          Exchange Rate: 1 {currency} = {exchangeRate?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} TZS
                        </p>
                        <p className="text-lg font-bold text-blue-900">
                          ≈ TZS {amountInTZS.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-blue-600 italic">
                          Payment will be processed in TZS
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {paymentType === 'cash_out' && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-700">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Account Balance Will Be Deducted</span>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">
                        The payment amount will be deducted from your selected payment account
                      </p>
                    </div>
                  )}

                  {/* Supplier Payment QR Codes for Chinese Suppliers */}
                  {supplierPaymentInfo && paymentType === 'cash_out' && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowPaymentQR(!showPaymentQR)}
                        className="w-full p-3 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-lg hover:from-red-100 hover:to-red-200 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-semibold text-red-900">
                              🇨🇳 Supplier Payment QR Codes
                            </span>
                          </div>
                          <span className="text-xs text-red-600">
                            {showPaymentQR ? 'Hide' : 'Show'}
                          </span>
                        </div>
                      </button>

                      {showPaymentQR && (
                        <div className="mt-2 p-4 bg-white border-2 border-red-200 rounded-lg space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* WeChat Pay QR */}
                            {supplierPaymentInfo.wechat_qr_code && (
                              <div className="text-center">
                                <div className="mb-2 flex items-center justify-center gap-2">
                                  <div className="w-4 h-4 bg-[#09B83E] rounded flex items-center justify-center">
                                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="white">
                                      <path d="M8.5 6c-2.8 0-5 1.9-5 4.3 0 1.4.7 2.6 1.8 3.4l-.5 1.5 1.7-.9c.6.2 1.3.3 2 .3 2.8 0 5-1.9 5-4.3S11.3 6 8.5 6zm-1 5.8c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8zm2.5 0c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8z"/>
                                      <path d="M15.5 11c-.3 0-.5 0-.8.1 0 .1 0 .3 0 .4 0 2.9-2.6 5.2-5.7 5.2-.4 0-.7 0-1.1-.1 1 1.3 2.8 2.2 4.9 2.2.5 0 1-.1 1.5-.2l1.3.7-.4-1.2c.9-.6 1.5-1.6 1.5-2.7 0-1.8-1.5-3.4-3.2-4.4z"/>
                                    </svg>
                                  </div>
                                  <span className="text-xs font-semibold text-gray-700">WeChat Pay</span>
                                </div>
                                <img 
                                  src={supplierPaymentInfo.wechat_qr_code} 
                                  alt="WeChat QR" 
                                  className="w-32 h-32 mx-auto border-2 border-green-300 rounded-lg"
                                />
                                {supplierPaymentInfo.wechat && (
                                  <p className="text-xs text-gray-600 mt-1">{supplierPaymentInfo.wechat}</p>
                                )}
                              </div>
                            )}

                            {/* Alipay QR */}
                            {supplierPaymentInfo.alipay_qr_code && (
                              <div className="text-center">
                                <div className="mb-2 flex items-center justify-center gap-2">
                                  <div className="w-4 h-4 bg-[#1677FF] rounded flex items-center justify-center">
                                    <span className="text-white text-[8px] font-bold">支</span>
                                  </div>
                                  <span className="text-xs font-semibold text-gray-700">Alipay</span>
                                </div>
                                <img 
                                  src={supplierPaymentInfo.alipay_qr_code} 
                                  alt="Alipay QR" 
                                  className="w-32 h-32 mx-auto border-2 border-blue-300 rounded-lg"
                                />
                              </div>
                            )}
                          </div>

                          {/* Bank Account */}
                          {supplierPaymentInfo.bank_account_details && (
                            <div className="pt-3 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-700 mb-1">Bank Account:</p>
                              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                                {supplierPaymentInfo.bank_account_details}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {isMultipleMode && (
                <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200">
                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Breakdown
                  </h4>
                  <div className="space-y-4">
                    {paymentEntries.length > 0 && (
                      <div className="space-y-3">
                        {paymentEntries.map((entry, index) => {
                          const currency = SUPPORTED_CURRENCIES.find(c => c.code === entry.currency) || DEFAULT_CURRENCY;
                          return (
                            <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <CreditCard className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <p className="font-semibold text-gray-900 text-lg">
                                      {entry.method ? 
                                        entry.method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                                        'Unknown Method'
                                      }
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    {entry.reference && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">Reference:</span> {entry.reference}
                                      </p>
                                    )}
                                    {entry.notes && (
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">Note:</span> {entry.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold text-green-600 mb-2">
                                    {formatCurrencyWithFlag(entry.amount, currency)}
                                  </p>
                                  <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    READY
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Payment Summary */}
                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        Payment Summary
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Total Payments</div>
                          <div className="text-lg font-semibold text-blue-900">
                            {paymentEntries.length}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Paid Amount</div>
                          <div className="text-lg font-semibold text-green-600">
                            {formatCurrencyWithFlag(totalPaid, selectedCurrency)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Remaining</div>
                          <div className="text-lg font-semibold text-orange-600">
                            {formatCurrencyWithFlag(remainingAmount, selectedCurrency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Payment Mode Toggle */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setIsMultipleMode(false)}
                className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 border-2 ${
                  !isMultipleMode 
                    ? (paymentType === 'cash_out' ? 'bg-white border-red-500 ring-4 ring-red-200 shadow-xl' : 'bg-white border-blue-500 ring-4 ring-blue-200 shadow-xl')
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                💳 Single {paymentType === 'cash_out' ? 'Payment' : 'Payment'}
              </button>
              <button
                onClick={() => setIsMultipleMode(true)}
                className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 border-2 ${
                  isMultipleMode 
                    ? (paymentType === 'cash_out' ? 'bg-white border-red-500 ring-4 ring-red-200 shadow-xl' : 'bg-white border-blue-500 ring-4 ring-blue-200 shadow-xl')
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                💰 Split {paymentType === 'cash_out' ? 'Payment' : 'Payment'}
              </button>
            </div>
          </div>


          {/* Balance Refresh Indicator */}
          {isRefreshingBalances && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Refreshing account balances...</span>
            </div>
          )}

          {/* Payment Methods */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Loading payment methods...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {!isMultipleMode ? (
                /* Single Payment Mode */
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h5 className="text-md font-semibold text-gray-900 mb-2">How would you like to pay?</h5>
                    {directPaymentMethods.length > 0 && paymentMethods.length === 0 && (
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block">
                        ✅ Loaded payment methods
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {displayPaymentMethods && displayPaymentMethods.length > 0 ? displayPaymentMethods.map((method) => {
                      const account = paymentAccounts.find(acc => acc.payment_method_id === method.id);
                      // Use TZS amount if available (for foreign currency), otherwise use the amount passed
                      const paymentAmount = amountInTZS || amount;
                      const hasInsufficientBalance = paymentType === 'cash_out' && account && account.balance < paymentAmount;
                      const hasSufficientBalance = paymentType === 'cash_out' && account && account.balance >= paymentAmount;
                      
                      return (
                        <button
                          key={method.id}
                          onClick={() => {
                            if (!hasInsufficientBalance) {
                              setSelectedMethod(method.id);
                            } else {
                              toast.error(`Insufficient balance in ${account.name}. Please select another account or add funds.`);
                            }
                          }}
                          disabled={hasInsufficientBalance}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                            hasInsufficientBalance
                              ? 'border-red-300 bg-red-50 opacity-60 cursor-not-allowed'
                              : selectedMethod === method.id
                                ? 'border-blue-500 bg-white ring-4 ring-blue-200 shadow-xl'
                                : hasSufficientBalance
                                  ? 'border-green-300 bg-green-50 hover:border-green-400 hover:shadow-md'
                                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <PaymentMethodIcon 
                              type={method.type} 
                              name={method.name} 
                              className="w-16 h-16" 
                            />
                            <div className="flex-1 text-left">
                              <p className="font-semibold text-gray-900">{method.name}</p>
                              {account && (
                                <div className="mt-1">
                                  <div className={`text-xs ${hasInsufficientBalance ? 'text-red-700' : 'text-gray-600'}`}>
                                    <span className="font-medium">Balance:</span> {account.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {account.currency || 'TZS'}
                                  </div>
                                  {paymentType === 'cash_out' && hasInsufficientBalance && (
                                    <div className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                                      <AlertCircle className="w-3 h-3" />
                                      Insufficient (Need: {paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                                    </div>
                                  )}
                                  {paymentType === 'cash_out' && hasSufficientBalance && (
                                    <div className="mt-1 flex items-center gap-1 text-xs text-green-600 font-medium">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Sufficient Funds
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {selectedMethod === method.id && !hasInsufficientBalance && (
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    }) : (
                      <div className="col-span-2 text-center py-8">
                        <div className="text-gray-500 mb-2">⚠️ No payment methods available</div>
                        <div className="text-sm text-gray-400">Please contact administrator to set up payment methods</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Account Balance Display */}
                  {selectedMethod && (() => {
                    const method = displayPaymentMethods.find(m => m.id === selectedMethod);
                    const account = paymentAccounts.find(acc => acc.payment_method_id === selectedMethod);
                    if (!method || !account) return null;
                    
                    // Use TZS amount if available, otherwise use the amount passed
                    const paymentAmount = amountInTZS || amount;
                    const newBalance = account.balance - paymentAmount;
                    
                    return (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-md">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Selected Account:</span>
                            <span className="text-base font-bold text-blue-900">{method.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Current Balance:</span>
                            <span className="text-lg font-bold text-green-600">
                              {account.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {account.currency || 'TZS'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Amount to {paymentType === 'cash_out' ? 'Pay' : 'Receive'}:</span>
                            <span className="text-lg font-bold text-orange-600">
                              {paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {account.currency || 'TZS'}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-blue-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-700">Balance After Payment:</span>
                              <span className={`text-xl font-bold ${newBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                {newBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {account.currency || 'TZS'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Multiple Payment Mode */
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h5 className="text-md font-semibold text-gray-900 mb-2">Split Your Payment</h5>
                    <p className="text-sm text-gray-600">Use multiple payment methods if needed</p>
                  </div>
                  
                  {/* Add Payment Section */}
                  <div className="p-5 bg-white rounded-xl border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Another Payment Method
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                        <input
                          type="number"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          placeholder="Enter amount"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              addPayment(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                           <option value="">Choose method</option>
                           {paymentMethods.map((method) => {
                             const account = paymentAccounts.find(acc => acc.payment_method_id === method.id);
                             return (
                               <option key={method.id} value={method.id}>
                                 {method.name} - Accept {method.currency} payments
                                 {account ? ` (Balance: ${account.balance.toLocaleString()} ${account.currency || 'TZS'})` : ''}
                               </option>
                             );
                           })}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            if (selectedMethod) {
                              addPayment(selectedMethod);
                            }
                          }}
                          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Method
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Payment Entries - Hidden */}
                  {false && paymentEntries.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Your Payment Methods</h4>
                      {paymentEntries.map((entry, index) => (
                        <div key={entry.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <PaymentMethodIcon 
                                  type={paymentMethods.find(m => m.id === entry.methodId)?.type || 'other'} 
                                  name={entry.method} 
                                  className="w-10 h-10"
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-900">{entry.method}</p>
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {entry.currency}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">{entry.account}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removePayment(index)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={entry.amount}
                                  onChange={(e) => updatePaymentEntry(index, 'amount', parseFloat(e.target.value) || 0)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <select
                                  value={entry.currency}
                                  onChange={(e) => updatePaymentEntry(index, 'currency', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                  {SUPPORTED_CURRENCIES.map(currency => (
                                    <option key={currency.code} value={currency.code}>
                                      {currency.flag} {currency.code}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Reference</label>
                              <input
                                type="text"
                                value={entry.reference || ''}
                                onChange={(e) => updatePaymentEntry(index, 'reference', e.target.value)}
                                placeholder="Optional"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                              <input
                                type="text"
                                value={entry.notes || ''}
                                onChange={(e) => updatePaymentEntry(index, 'notes', e.target.value)}
                                placeholder="Optional"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {/* Price Edit Section - Show when customer pays more than original amount */}
          {allowPriceEdit && deviceId && customerPaymentAmount > amount && (
            <div className="mt-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-amber-800">Customer Paid More</h4>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-white/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Original Price:</span>
                      <p className="font-semibold text-gray-700">{formatCurrencyWithFlag(amount, selectedCurrency)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Amount Paid:</span>
                      <p className="font-semibold text-green-600">{formatCurrencyWithFlag(customerPaymentAmount, selectedCurrency)}</p>
                    </div>
                  </div>
                </div>

                {!showPriceEdit ? (
                  <div className="space-y-3">
                    <p className="text-sm text-amber-700">
                      Customer paid <span className="font-semibold">{formatCurrencyWithFlag(customerPaymentAmount - amount, selectedCurrency)}</span> more than the original price.
                    </p>
                    <button
                      onClick={() => {
                        setNewPrice(customerPaymentAmount.toString());
                        setShowPriceEdit(true);
                      }}
                      className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Update Price to Match Payment
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-2">
                        New Repair Price
                      </label>
                      <input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Enter new price"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-2">
                        Reason for Price Change
                      </label>
                      <textarea
                        value={priceEditReason}
                        onChange={(e) => setPriceEditReason(e.target.value)}
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                        className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Update Price
                      </button>
                      <button
                        onClick={() => setShowPriceEdit(false)}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 flex-shrink-0 bg-white">
          <div className="text-sm text-gray-600">
            {remainingAmount > 0 ? (
              <span className="text-orange-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {paymentType === 'cash_out' ? 'Amount to pay' : 'Amount remaining'}: {remainingAmount.toLocaleString()} TZS
              </span>
            ) : (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {paymentType === 'cash_out' ? 'Payment complete' : 'Payment complete'}
              </span>
            )}
            {paymentType === 'cash_out' && selectedMethod && (
              <div className="mt-1 text-xs text-gray-500">
                {(() => {
                  const account = paymentAccounts.find(acc => acc.payment_method_id === selectedMethod);
                  if (account) {
                    const paymentAmount = isMultipleMode ? totalPaid : (amountInTZS || amount);
                    const newBalance = account.balance - paymentAmount;
                    return (
                      <span>
                        Account balance: {account.balance.toLocaleString()} → {newBalance.toLocaleString()} {account.currency || 'TZS'}
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={
                isProcessing || 
                (isMultipleMode ? paymentEntries.length === 0 : !selectedMethod) ||
                // Disable if insufficient balance for cash_out
                (paymentType === 'cash_out' && !isMultipleMode && selectedMethod && (() => {
                  const account = paymentAccounts.find(acc => acc.payment_method_id === selectedMethod);
                  const checkAmount = amountInTZS || amount;  // Use TZS amount if available
                  return account && account.balance < checkAmount;
                })()) ||
                (paymentType === 'cash_out' && isMultipleMode && paymentEntries.some(entry => {
                  const account = paymentAccounts.find(acc => acc.id === entry.accountId);
                  return account && account.balance < entry.amount;
                }))
              }
              className={`px-8 py-3 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 text-sm font-semibold flex items-center gap-2 ${
                paymentType === 'cash_out'
                  ? 'bg-red-600 hover:bg-red-700 shadow-lg disabled:hover:bg-gray-400'
                  : 'bg-green-600 hover:bg-green-700 shadow-lg disabled:hover:bg-gray-400'
              }`}
              title={
                paymentType === 'cash_out' && !isMultipleMode && selectedMethod ? (() => {
                  const account = paymentAccounts.find(acc => acc.payment_method_id === selectedMethod);
                  const checkAmount = amountInTZS || amount;  // Use TZS amount if available
                  if (account && account.balance < checkAmount) {
                    return `Insufficient balance: ${account.balance.toLocaleString()} available, ${checkAmount.toLocaleString()} required`;
                  }
                  return '';
                })() : ''
              }
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  {paymentType === 'cash_out' ? 'Make Payment' : 'Complete Payment'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PaymentsPopupModal;