import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, User, CreditCard, Package, Calendar, Clock, MapPin, Phone, Mail, DollarSign, ShoppingCart, Receipt, Download, Printer, AlertTriangle, Copy, Share2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

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
  sale_id?: string;
}

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({ isOpen, onClose, transaction }) => {
  const [sale, setSale] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cashierName, setCashierName] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [accountName, setAccountName] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchPaymentMethods();
      if (transaction?.account_id) {
        fetchAccountName(transaction.account_id);
      }
      if (transaction?.sale_id) {
        fetchSaleDetails(transaction.sale_id);
      }
    } else {
      document.body.style.overflow = '';
      setSale(null);
      setError(null);
      setCashierName(null);
      setPaymentMethods([]);
      setAccountName(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, transaction]);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    }
  };

  const fetchAccountName = async (accountId: string) => {
    try {
      const { data, error } = await supabase
        .from('finance_accounts')
        .select('name')
        .eq('id', accountId)
        .single();

      if (error) throw error;
      if (data) {
        setAccountName(data.name);
      }
    } catch (err) {
      console.error('Error fetching account name:', err);
      setAccountName(null);
    }
  };

  const fetchSaleDetails = async (saleId: string) => {
    try {
      setError(null);
      
      // Fetch sale with related data
      const { data: saleData, error: saleError } = await supabase
        .from('lats_sales')
        .select(`
          *,
          lats_sale_items (
            *,
            lats_products (*),
            lats_product_variants (*)
          ),
          customers (*)
        `)
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;
      if (!saleData) {
        setError('Sale not found');
        return;
      }

      setSale(saleData);

      // Fetch cashier name if cashier_id exists
      if (saleData.cashier_id) {
        const { data: cashierData, error: cashierError } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', saleData.cashier_id)
          .single();

        if (!cashierError && cashierData) {
          setCashierName(cashierData.full_name || cashierData.email || 'Unknown');
        }
      }
    } catch (err: any) {
      console.error('Error fetching sale details:', err);
      setError(err.message || 'Failed to fetch sale details');
    }
  };

  const formatMoney = (amount: number | undefined | null): string => {
    const safeAmount = Number(amount);
    if (!isFinite(safeAmount) || isNaN(safeAmount)) {
      return new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(0);
    }
    
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount);
  };

  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (num % 1 === 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getColorTagColor = (tag: string): string => {
    const colors: { [key: string]: string } = {
      red: 'bg-red-100 text-red-800',
      orange: 'bg-orange-100 text-orange-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      pink: 'bg-pink-100 text-pink-800',
    };
    return colors[tag.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getLoyaltyLevelColor = (level: string): string => {
    const colors: { [key: string]: string } = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800',
    };
    return colors[level.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentMethodName = (code: string): string => {
    if (!code) return 'Unknown';
    const method = paymentMethods.find(pm => pm.code === code || pm.code?.toLowerCase() === code?.toLowerCase());
    if (method) {
      return method.name;
    }
    return code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, ' ');
  };

  const getPaymentMethodDisplay = (paymentMethod: any) => {
    if (!paymentMethod) return 'Unknown';
    
    if (typeof paymentMethod === 'string') {
      try {
        const parsed = JSON.parse(paymentMethod);
        return getPaymentMethodDisplay(parsed);
      } catch {
        return getPaymentMethodName(paymentMethod);
      }
    }
    
    if (typeof paymentMethod === 'object') {
      if (paymentMethod.details?.payments && Array.isArray(paymentMethod.details.payments)) {
        const methods = paymentMethod.details.payments.map((payment: any) => {
          const methodCode = payment.method || payment.paymentMethod || payment.code;
          return getPaymentMethodName(methodCode);
        });
        return methods.join(', ');
      }
      const methodCode = paymentMethod.method || paymentMethod.paymentMethod || paymentMethod.code || paymentMethod.type;
      return getPaymentMethodName(methodCode);
    }
    
    return 'Unknown';
  };

  // Extract payment method from transaction description or metadata
  const extractPaymentMethodFromTransaction = (): string => {
    if (!transaction) return 'Unknown';
    
    // Try to extract from metadata first
    if (transaction.metadata?.payment_method) {
      return getPaymentMethodName(transaction.metadata.payment_method);
    }
    
    // Try to extract from description (e.g., "POS sale payment (Cash)")
    const description = transaction.description || '';
    const match = description.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1];
    }
    
    // Try to extract payment method from description patterns
    const paymentMethodPatterns = ['Cash', 'Card', 'Mobile Money', 'Bank Transfer', 'Credit', 'Debit'];
    for (const pattern of paymentMethodPatterns) {
      if (description.toLowerCase().includes(pattern.toLowerCase())) {
        return pattern;
      }
    }
    
    return 'Unknown';
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  const handleCopy = () => {
    const transactionText = sale 
      ? `Sale: ${sale.sale_number}\nTotal: ${formatMoney(sale.total_amount)}\nDate: ${formatDate(sale.created_at)}`
      : `Transaction: ${transaction?.transaction_type}\nAmount: ${formatMoney(transaction?.amount)}\nDate: ${formatDate(transaction?.created_at || '')}`;
    
    navigator.clipboard.writeText(transactionText);
    toast.success('Transaction details copied to clipboard');
  };

  const handleDownload = () => {
    const data = sale 
      ? {
          sale_number: sale.sale_number,
          total_amount: sale.total_amount,
          payment_method: getPaymentMethodDisplay(sale.payment_method),
          date: sale.created_at,
          customer: sale.customers?.name || 'Walk-in Customer',
          items: sale.lats_sale_items?.map((item: any) => ({
            product: item.lats_products?.name || item.product_name,
            quantity: item.quantity,
            price: item.total_price
          }))
        }
      : {
          type: transaction?.transaction_type,
          amount: transaction?.amount,
          description: transaction?.description,
          date: transaction?.created_at,
          balance_before: transaction?.balance_before,
          balance_after: transaction?.balance_after
        };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sale ? `sale-${sale.sale_number}.json` : `transaction-${transaction?.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transaction details downloaded');
  };

  const handleShare = async () => {
    const shareData = sale
      ? {
          title: `Sale ${sale.sale_number}`,
          text: `Sale ${sale.sale_number} - Total: ${formatMoney(sale.total_amount)}`,
          url: window.location.href
        }
      : {
          title: 'Transaction Details',
          text: `${transaction?.transaction_type} - ${formatMoney(transaction?.amount)}`,
          url: window.location.href
        };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Transaction shared');
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy();
      toast.success('Transaction details copied (share not supported)');
    }
  };

  if (!isOpen || !transaction) return null;

  const isIncoming = transaction.transaction_type === 'payment_received' || transaction.transaction_type === 'transfer_in';
  const isOutgoing = transaction.transaction_type === 'expense' || transaction.transaction_type === 'payment_made' || transaction.transaction_type === 'transfer_out';

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <Receipt className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {sale ? `Sale ${sale.sale_number || sale.id?.slice(0, 8)}` : 'Transaction Details'}
              </h3>
              <p className="text-sm text-gray-600 font-medium capitalize">
                {transaction.transaction_type.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          <div className="py-4 space-y-4">
          {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {sale ? (
              <>
              {/* Customer Information Card */}
              {sale.customers && (
                <div className="bg-white rounded-xl p-6 mb-4 border border-gray-200 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Customer:</span>
                      <span className="text-base font-bold text-gray-900">
                        {sale.customers.name || (sale.customer_id ? `Customer: ${sale.customer_id.slice(0, 8)}...` : 'Walk-in Customer')}
                          </span>
                    </div>
                    {(sale.customers.phone || sale.customers.whatsapp) && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Phone:</span>
                        <span className="text-base font-bold text-gray-900">{sale.customers.phone || sale.customers.whatsapp}</span>
                      </div>
                    )}
                    {sale.customers.email && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Email:</span>
                        <span className="text-base font-bold text-gray-900">{sale.customers.email}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Status:</span>
                      <span className={`font-bold uppercase px-3 py-1.5 rounded-lg text-xs ${
                        sale.payment_status === 'completed' || sale.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {sale.payment_status === 'completed' || sale.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Created:</span>
                      <span className="text-base font-bold text-gray-900">{formatDate(transaction.created_at).split(',')[0]}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment & Financial Summary */}
              {sale && (
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    Financial Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Total Amount</p>
                      <p className="text-xl font-bold text-gray-900">{formatMoney(sale.total_amount)}</p>
                        </div>
                    {sale.subtotal && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">Subtotal</p>
                        <p className="text-xl font-bold text-blue-600">{formatMoney(sale.subtotal)}</p>
                          </div>
                        )}
                        {sale.discount > 0 && (
                      <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">Discount</p>
                        <p className="text-xl font-bold text-orange-600">-{formatMoney(sale.discount)}</p>
                      </div>
                    )}
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Payment Method</p>
                      <p className="text-xl font-bold text-green-600">{getPaymentMethodDisplay(sale.payment_method)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sale Items */}
              {sale && sale.lats_sale_items && sale.lats_sale_items.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-purple-600" />
                      Sale Items
                    </h4>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                      <span className="text-xs font-semibold text-purple-700">{sale.lats_sale_items.length} items</span>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {sale.lats_sale_items.map((item: any, index: number) => {
                      const unitPrice = item.unit_price || item.price || item.total_price / item.quantity;
                      return (
                        <div
                          key={item.id}
                          className="group relative p-5 rounded-2xl border-2 transition-all duration-200 bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="text-base font-bold text-gray-900">
                                    {item.lats_products?.name || item.product_name || 'Unknown Product'}
                            </div>
                                </div>
                                {item.lats_product_variants?.name && item.lats_product_variants.name !== 'Default Variant' && (
                                  <div className="text-xs text-gray-500 mb-2">Variant: {item.lats_product_variants.name}</div>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-medium text-gray-600">Qty: {item.quantity}</span>
                                  <span className="text-xs font-medium text-gray-600">•</span>
                                  <span className="text-xs font-medium text-gray-600">Unit: {formatMoney(unitPrice)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right ml-4">
                              <div className="text-2xl font-bold mb-1 text-gray-900">{formatMoney(item.total_price)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </>
          ) : (
              <>
                <div className="bg-white rounded-xl p-6 mb-4 border border-gray-200 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Transaction Type:</span>
                      <span className="text-base font-bold text-gray-900 capitalize">{transaction.transaction_type.replace(/_/g, ' ')}</span>
                </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Transaction ID:</span>
                      <span className="text-base font-bold text-gray-900 font-mono text-xs">{transaction.id}</span>
                    </div>
                    {accountName && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Account:</span>
                        <span className="text-base font-bold text-gray-900">{accountName}</span>
                  </div>
                )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Date & Time:</span>
                      <span className="text-base font-bold text-gray-900">{formatDate(transaction.created_at)}</span>
                  </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Payment Method:</span>
                      <span className="text-base font-bold text-gray-900">{extractPaymentMethodFromTransaction()}</span>
                    </div>
                    {transaction.description && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Description:</span>
                        <span className="text-base font-bold text-gray-900">{transaction.description}</span>
                      </div>
                    )}
                    {transaction.reference_number && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Reference:</span>
                        <span className="text-base font-bold text-gray-900 font-mono">{transaction.reference_number}</span>
                  </div>
                )}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Financial Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Amount</p>
                      <p className={`text-xl font-bold ${isIncoming ? 'text-green-600' : isOutgoing ? 'text-red-600' : 'text-gray-900'}`}>
                        {isIncoming && '+'}{isOutgoing && '-'}{formatMoney(transaction.amount)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Balance Before</p>
                      <p className="text-xl font-bold text-gray-900">{formatMoney(transaction.balance_before)}</p>
                  </div>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 md:col-span-2">
                      <p className="text-xs font-medium text-gray-600 mb-1">Balance After</p>
                      <p className="text-xl font-bold text-blue-600">{formatMoney(transaction.balance_after)}</p>
                </div>
                  </div>
                </div>
              </>
            )}
              </div>
            </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
              <button
            type="button"
            onClick={onClose}
            className="w-full px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl text-lg"
              >
            Close
              </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TransactionDetailsModal;

