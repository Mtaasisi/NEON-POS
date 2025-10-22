import React, { useState, useMemo, useEffect } from 'react';
import { X, RefreshCw, Download, Printer, TrendingUp, DollarSign, CreditCard, Clock, CheckCircle, XCircle, BarChart3, Package, Eye, Receipt, Hash, User, Phone, Mail, MapPin, Tag } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassButton from '../../../shared/components/ui/GlassButton';
import { supabase } from '../../../../lib/supabaseClient';
import { 
  paymentTrackingService, 
  PaymentTransaction, 
  PaymentMetrics, 
  PaymentMethodSummary, 
  DailySummary, 
  ReconciliationRecord,
  SoldItem
} from '../../../../lib/paymentTrackingService';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface PaymentTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Transaction Details Modal Component
interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PaymentTransaction | null;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({ isOpen, onClose, transaction }) => {
  if (!isOpen || !transaction) return null;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'pending':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'failed':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div 
        className="fixed bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 35
        }}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed flex items-center justify-center p-4 pt-16"
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[85vh] overflow-hidden animate-slideUp"
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
        {/* Modern Gradient Header */}
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-8 py-6 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Transaction Details</h2>
                  <p className="text-blue-100 text-sm mt-1">Complete payment information</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all flex items-center justify-center group"
            >
              <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
          
          {/* Status Badge in Header */}
          <div className="relative mt-4">
            <span className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border-2 ${getStatusColor(transaction.status)}`}>
              {getStatusIcon(transaction.status)}
              {transaction.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-180px)] px-8 py-6 bg-gray-50">
          {/* Amount Highlight Card */}
          <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-6 h-6" />
                <span className="text-sm font-medium opacity-90">Transaction Amount</span>
              </div>
              <div className="text-5xl font-bold mb-2">
                {formatMoney(transaction.amount)}
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                  {transaction.paymentMethod}
                </span>
                {transaction.soldItems && transaction.soldItems.length > 0 && (
                  <span className="text-sm opacity-75">• {transaction.soldItems.length} item{transaction.soldItems.length !== 1 ? 's' : ''} sold</span>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transaction Information */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-blue-600" />
                  Transaction Information
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Hash className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-500 mb-1">Transaction ID</div>
                      <div className="font-mono text-sm font-semibold text-gray-900 break-all">{transaction.transactionId}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-500 mb-1">Reference</div>
                      <div className="font-mono text-sm font-semibold text-gray-900 break-all">{transaction.reference}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-500 mb-1">Date & Time</div>
                      <div className="text-sm font-semibold text-gray-900">{new Date(transaction.timestamp).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Activity className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-500 mb-1">Source</div>
                      <div className="text-sm font-semibold text-gray-900 capitalize">{transaction.source}</div>
                    </div>
                  </div>

                  {transaction.deviceName && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-500 mb-1">Device</div>
                        <div className="text-sm font-semibold text-gray-900">📱 {transaction.deviceName}</div>
                      </div>
                    </div>
                  )}

                  {transaction.fees > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-500 mb-1">Transaction Fees</div>
                        <div className="text-sm font-semibold text-gray-900">{formatMoney(transaction.fees)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-500 mb-1">Customer Name</div>
                      <div className="font-semibold text-gray-900">{transaction.customerName}</div>
                    </div>
                  </div>

                  {transaction.customerPhone && (
                    <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-500 mb-1">Phone Number</div>
                        <div className="font-semibold text-gray-900">{transaction.customerPhone}</div>
                      </div>
                    </div>
                  )}

                  {transaction.customerEmail && (
                    <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-500 mb-1">Email Address</div>
                        <div className="font-semibold text-gray-900 break-all">{transaction.customerEmail}</div>
                      </div>
                    </div>
                  )}

                  {transaction.customerAddress && (
                    <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-500 mb-1">Address</div>
                        <div className="font-semibold text-gray-900">{transaction.customerAddress}</div>
                      </div>
                    </div>
                  )}

                  {transaction.customerId && (
                    <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                      <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Hash className="w-5 h-5 text-cyan-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-500 mb-1">Customer ID</div>
                        <div className="font-mono text-sm font-semibold text-gray-900">{transaction.customerId}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-5">
              {/* Transaction Timeline */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Transaction Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-500 mb-1">Payment Initiated</div>
                      <div className="text-sm font-semibold text-gray-900">{new Date(transaction.timestamp).toLocaleString()}</div>
                    </div>
                  </div>

                  {transaction.status === 'completed' && (
                    <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-500 mb-1">Payment Completed</div>
                        <div className="text-sm font-semibold text-gray-900">{new Date(transaction.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  {transaction.status === 'pending' && (
                    <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
                      <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-500 mb-1">Payment Pending</div>
                        <div className="text-sm font-semibold text-gray-900">Awaiting confirmation</div>
                      </div>
                    </div>
                  )}

                  {transaction.status === 'failed' && (
                    <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl">
                      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <XCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-500 mb-1">Payment Failed</div>
                        <div className="text-sm font-semibold text-gray-900">{transaction.failureReason || 'Transaction failed'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sold Items */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Sold Items
                  {transaction.soldItems && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{transaction.soldItems.length}</span>
                  )}
                </h3>
              
              {transaction.soldItems && transaction.soldItems.length > 0 ? (
                <div className="space-y-3">
                  {transaction.soldItems.map((item, index) => (
                    <div key={item.id || index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {item.productName}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              item.type === 'product' ? 'bg-blue-100 text-blue-700' :
                              item.type === 'service' ? 'bg-green-100 text-green-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {item.type}
                            </span>
                          </div>
                          {item.sku && (
                            <div className="text-sm text-gray-600 font-mono">SKU: {item.sku}</div>
                          )}
                                                      {item.category && (
                                                          <div className="text-sm text-gray-600">
                                {item.category && <span className="mr-2">Category: {item.category}</span>}
                              </div>
                          )}
                          {item.variant && (
                            <div className="text-sm text-gray-600">Variant: {item.variant}</div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold text-gray-900">{formatMoney(item.totalPrice)}</div>
                          <div className="text-sm text-gray-600">
                            {item.quantity} × {formatMoney(item.unitPrice)}
                          </div>
                        </div>
                      </div>
                      {item.description && (
                        <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                          {item.description}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-sm text-gray-500 mt-1 italic">
                          Note: {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Summary */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-900">Total Items</span>
                      <span className="font-semibold text-blue-900">
                        {transaction.soldItems.reduce((sum, item) => sum + item.quantity, 0)} items
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-medium text-blue-900">Total Amount</span>
                      <span className="font-semibold text-blue-900">
                        {formatMoney(transaction.soldItems.reduce((sum, item) => sum + item.totalPrice, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No sold items found for this transaction</p>
                </div>
              )}
            </div>

            {/* Additional Metadata */}
            {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
              <div className="p-6 bg-white rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  Additional Information
                </h3>
                <div className="space-y-3">
                  {Object.entries(transaction.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-sm text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Modern Footer with Action Buttons */}
        <div className="bg-white border-t border-gray-200 px-8 py-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Hash className="w-4 h-4" />
              <span>Transaction:</span>
              <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                {transaction.transactionId}
              </span>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Print transaction details
                  const printContent = `
                    Transaction Details
                    ===================
                    Transaction ID: ${transaction.transactionId}
                    Customer: ${transaction.customerName}
                    Amount: ${formatMoney(transaction.amount)}
                    Method: ${transaction.paymentMethod}
                    Status: ${transaction.status}
                    Date: ${new Date(transaction.timestamp).toLocaleString()}
                    Reference: ${transaction.reference}
                  `;
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head><title>Transaction ${transaction.transactionId}</title></head>
                        <body style="font-family: monospace; font-size: 12px; line-height: 1.4;">
                          <pre>${printContent}</pre>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md font-medium text-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-900 transition-all shadow-sm hover:shadow-md font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

const PaymentTrackingModal: React.FC<PaymentTrackingModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    totalPayments: 0,
    totalAmount: 0,
    completedAmount: 0,
    pendingAmount: 0,
    failedAmount: 0,
    totalFees: 0,
    successRate: '0.0'
  });
  const [methodSummary, setMethodSummary] = useState<PaymentMethodSummary[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationRecord[]>([]);

  // Transaction details modal state
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 PaymentTrackingModal: Modal opened, fetching data...');
      fetchPaymentData();
    }
  }, [isOpen]);

  // Separate effect for date changes
  useEffect(() => {
    if (isOpen && (startDate || endDate)) {
      console.log('🔍 PaymentTrackingModal: Date changed, refetching data...');
      fetchPaymentData();
    }
  }, [startDate, endDate]);

  // Setup real-time subscriptions for payment updates
  useEffect(() => {
    if (!isOpen) return;

    console.log('🔔 PaymentTrackingModal: Setting up real-time subscriptions...');
    
    let posSalesSubscription: any;
    let devicePaymentsSubscription: any;
    
    // Debounce function to prevent excessive API calls
    const debouncedFetch = debounce(() => {
      console.log('🔔 PaymentTrackingModal: Debounced fetch triggered');
      // Clear cache before fetching to ensure fresh data
      paymentTrackingService.clearPaymentCache();
      fetchPaymentData();
    }, 3000); // 3 second debounce to reduce frequency
    
    // Subscribe to POS sales updates
    posSalesSubscription = supabase!
      .channel('payment-tracking-pos-sales-modal')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'lats_sales'
        },
        (payload) => {
          console.log('🔔 PaymentTrackingModal: POS sale update received:', payload);
          debouncedFetch();
        }
      )
      .subscribe();

    // Subscribe to device payments updates
    devicePaymentsSubscription = supabase!
      .channel('payment-tracking-device-payments-modal')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'customer_payments'
        },
        (payload) => {
          console.log('🔔 PaymentTrackingModal: Device payment update received:', payload);
          debouncedFetch();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🔔 PaymentTrackingModal: Cleaning up real-time subscriptions...');
      if (posSalesSubscription) posSalesSubscription.unsubscribe();
      if (devicePaymentsSubscription) devicePaymentsSubscription.unsubscribe();
    };
  }, [isOpen]);

  // Debounce utility function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Quick filter handler
  const handleQuickFilter = (filter: string) => {
    setQuickFilter(filter);
    const today = new Date();
    
    switch (filter) {
      case 'today':
        const todayStr = today.toISOString().split('T')[0];
        setStartDate(todayStr);
        setEndDate(todayStr);
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setStartDate(weekAgo.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        setStartDate(monthAgo.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'last30':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'all':
      default:
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      // Create CSV headers
      const headers = ['Transaction ID', 'Customer Name', 'Amount', 'Method', 'Status', 'Date', 'Reference', 'Cashier', 'Source'];
      
      // Create CSV rows
      const rows = filteredPayments.map(payment => [
        payment.transactionId,
        payment.customerName,
        payment.amount.toFixed(2),
        payment.method,
        payment.status,
        new Date(payment.date).toLocaleDateString(),
        payment.reference,
        payment.cashier,
        payment.source
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payment-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Payment data exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export data');
    }
  };

  // Print report
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
          .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
          .summary-card p { margin: 0; font-size: 24px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: 600; }
          .completed { color: #10b981; }
          .pending { color: #f59e0b; }
          .failed { color: #ef4444; }
          @media print { 
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1>Payment Tracking Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        
        <div class="summary">
          <div class="summary-card">
            <h3>Total Payments</h3>
            <p>${metrics.totalPayments}</p>
          </div>
          <div class="summary-card">
            <h3>Total Amount</h3>
            <p>TSh ${metrics.totalAmount.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h3>Success Rate</h3>
            <p>${metrics.successRate}%</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPayments.map(payment => `
              <tr>
                <td>${payment.transactionId}</td>
                <td>${payment.customerName}</td>
                <td>TSh ${payment.amount.toLocaleString()}</td>
                <td>${payment.method}</td>
                <td class="${payment.status}">${payment.status}</td>
                <td>${new Date(payment.date).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const fetchPaymentData = async () => {
    console.log('🔄 PaymentTrackingModal: Fetching payment data...');
    setLoading(true);
    try {
      // Use date range if available
      const start = startDate || undefined;
      const end = endDate || undefined;
      
      // Fetch all payment data
      const [paymentsData, metricsData, methodSummaryData, dailySummaryData, reconciliationData] = await Promise.all([
        paymentTrackingService.debouncedFetchPaymentTransactions(start, end, selectedStatus !== 'all' ? selectedStatus : undefined, selectedMethod !== 'all' ? selectedMethod : undefined),
        paymentTrackingService.calculatePaymentMetrics(start, end),
        paymentTrackingService.getPaymentMethodSummary(start, end),
        paymentTrackingService.getDailySummary(7),
        paymentTrackingService.getReconciliationRecords()
      ]);

      console.log(`📊 PaymentTrackingModal: Received ${paymentsData.length} payments`);
      setPayments(paymentsData);
      setMetrics(metricsData);
      setMethodSummary(methodSummaryData);
      setDailySummary(dailySummaryData);
      setReconciliation(reconciliationData);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter payments based on search query
  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    
    return payments.filter(payment => {
      const searchLower = searchQuery.toLowerCase();
      return (
        payment.customerName.toLowerCase().includes(searchLower) ||
        payment.transactionId.toLowerCase().includes(searchLower) ||
        payment.reference.toLowerCase().includes(searchLower)
      );
    });
  }, [payments, searchQuery]);

  // Format currency with full numbers
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-orange-600 bg-orange-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'stopped':
      case 'cancelled':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Handle transaction selection with sold items loading
  const handleTransactionSelect = async (transaction: PaymentTransaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
    
    // If sold items are not loaded, fetch them
    if (!transaction.soldItems) {
      try {
        const soldItems = await paymentTrackingService.fetchSoldItems(transaction.id, transaction.source);
        setSelectedTransaction({
          ...transaction,
          soldItems
        });
      } catch (error) {
        console.error('Error fetching sold items:', error);
      }
    }
  };

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  // console.log('🔍 PaymentTrackingModal: Modal is open, rendering...');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <GlassCard className="max-w-7xl w-full max-h-[90vh] overflow-y-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Payment Tracking</h2>
              <p className="text-base text-gray-600">Real-time payment monitoring & analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPaymentData}
              disabled={loading}
              className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading payment data...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <>
            <div className="space-y-6">
                            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Total Payments</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{metrics.totalPayments}</div>
                <div className="text-xs text-blue-600">All transactions</div>
              </div>
              
              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Total Amount</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{formatMoney(metrics.totalAmount)}</div>
                <div className="text-xs text-green-600">Gross amount</div>
              </div>
              
              <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-100 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">Completed</span>
                </div>
                <div className="text-2xl font-bold text-emerald-900">{formatMoney(metrics.completedAmount)}</div>
                <div className="text-xs text-emerald-600">{metrics.successRate}% success rate</div>
              </div>
              
              <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700">Pending</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">{formatMoney(metrics.pendingAmount)}</div>
                <div className="text-xs text-orange-600">Awaiting confirmation</div>
              </div>
              
              <div className="p-5 bg-gradient-to-br from-red-50 to-rose-100 rounded-xl border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-xs font-medium text-red-700">Failed</span>
                </div>
                <div className="text-2xl font-bold text-red-900">{formatMoney(metrics.failedAmount)}</div>
                <div className="text-xs text-red-600">{filteredPayments.filter(p => p.status === 'failed').length} transactions</div>
              </div>
              
              <div className="p-5 bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💸</span>
                  <span className="text-xs font-medium text-purple-700">Total Fees</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{formatMoney(metrics.totalFees)}</div>
                <div className="text-xs text-purple-600">Transaction fees</div>
              </div>
            </div>

            {/* Quick Date Filters */}
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">Quick Filters:</span>
                <button
                  onClick={() => handleQuickFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    quickFilter === 'all'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => handleQuickFilter('today')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    quickFilter === 'today'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => handleQuickFilter('week')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    quickFilter === 'week'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => handleQuickFilter('month')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    quickFilter === 'month'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => handleQuickFilter('last30')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    quickFilter === 'last30'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="all">All Methods</option>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Card">Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
                <input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setQuickFilter('custom');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
                <input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setQuickFilter('custom');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Payment Transactions */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Transactions ({filteredPayments.length})
                  </h3>
                  {filteredPayments.length > 5 && (
                    <button
                      onClick={() => setShowAllTransactions(!showAllTransactions)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {showAllTransactions ? 'Show Less' : `Show All (${filteredPayments.length})`}
                    </button>
                  )}
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredPayments.length > 0 ? (
                    (showAllTransactions ? filteredPayments : filteredPayments.slice(0, 5)).map((payment) => (
                      <div 
                        key={payment.id} 
                        className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 hover:shadow-md transition-all duration-200 group"
                        onClick={() => handleTransactionSelect(payment)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 group-hover:text-blue-700">{payment.customerName}</div>
                          <div className="text-sm text-gray-600">{payment.transactionId}</div>
                          {payment.deviceName && (
                            <div className="text-xs text-blue-600">📱 {payment.deviceName}</div>
                          )}
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div className="font-semibold text-blue-600">{formatMoney(payment.amount)}</div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                          <Eye className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No payment transactions found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Methods with Visual Chart */}
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200">
                <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Methods Distribution
                </h3>
                <div className="space-y-3">
                  {methodSummary.length > 0 ? (
                    methodSummary.map((method, index) => {
                      const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                      const color = colors[index % colors.length];
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 capitalize">{method.method}</div>
                              <div className="text-xs text-gray-600">{method.count} transactions</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-green-600">{formatMoney(method.amount)}</div>
                              <div className="text-xs text-gray-500">{method.percentage}%</div>
                            </div>
                          </div>
                          {/* Visual Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div 
                              className={`h-full ${color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                              style={{ width: `${method.percentage}%` }}
                            >
                              {method.percentage > 10 && (
                                <span className="text-xs text-white font-bold">{method.percentage}%</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No payment method data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Average Transaction */}
              <div className="p-5 bg-gradient-to-br from-cyan-50 to-blue-100 rounded-xl border border-cyan-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-cyan-600" />
                  <span className="text-xs font-medium text-cyan-700">Avg Transaction</span>
                </div>
                <div className="text-2xl font-bold text-cyan-900">
                  {formatMoney(metrics.totalPayments > 0 ? metrics.totalAmount / metrics.totalPayments : 0)}
                </div>
                <div className="text-xs text-cyan-600">Per transaction</div>
              </div>

              {/* Source Breakdown */}
              <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-100 rounded-xl border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-medium text-indigo-700">POS Sales</span>
                </div>
                <div className="text-2xl font-bold text-indigo-900">
                  {filteredPayments.filter(p => p.source === 'pos_sale').length}
                </div>
                <div className="text-xs text-indigo-600">
                  {formatMoney(filteredPayments.filter(p => p.source === 'pos_sale').reduce((sum, p) => sum + p.amount, 0))}
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-pink-50 to-rose-100 rounded-xl border border-pink-200">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-pink-600" />
                  <span className="text-xs font-medium text-pink-700">Device Payments</span>
                </div>
                <div className="text-2xl font-bold text-pink-900">
                  {filteredPayments.filter(p => p.source === 'device_payment').length}
                </div>
                <div className="text-xs text-pink-600">
                  {formatMoney(filteredPayments.filter(p => p.source === 'device_payment').reduce((sum, p) => sum + p.amount, 0))}
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-amber-50 to-yellow-100 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">Purchase Orders</span>
                </div>
                <div className="text-2xl font-bold text-amber-900">
                  {filteredPayments.filter(p => p.source === 'purchase_order').length}
                </div>
                <div className="text-xs text-amber-600">
                  {formatMoney(filteredPayments.filter(p => p.source === 'purchase_order').reduce((sum, p) => sum + p.amount, 0))}
                </div>
              </div>
            </div>

            {/* Failed Payments Section */}
            {filteredPayments.filter(p => p.status === 'failed').length > 0 && (
              <div className="mb-8 p-6 bg-gradient-to-br from-red-50 to-rose-100 rounded-xl border-2 border-red-200">
                <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
                  <XCircle className="w-6 h-6" />
                  Failed Payments Investigation ({filteredPayments.filter(p => p.status === 'failed').length})
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {filteredPayments.filter(p => p.status === 'failed').slice(0, showAllTransactions ? undefined : 3).map((payment) => (
                    <div 
                      key={payment.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleTransactionSelect(payment)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{payment.customerName}</div>
                        <div className="text-sm text-gray-600">{payment.transactionId}</div>
                        {payment.failureReason && (
                          <div className="text-xs text-red-600 mt-1">⚠️ {payment.failureReason}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {payment.method} • {new Date(payment.date).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-600">{formatMoney(payment.amount)}</div>
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-600 mt-2">
                          Failed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {filteredPayments.filter(p => p.status === 'failed').length > 3 && (
                  <button
                    onClick={() => setShowAllTransactions(!showAllTransactions)}
                    className="mt-4 w-full py-2 text-sm text-red-600 hover:text-red-800 font-medium bg-white rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    {showAllTransactions ? 'Show Less' : `Show All ${filteredPayments.filter(p => p.status === 'failed').length} Failed Payments`}
                  </button>
                )}
              </div>
            )}

            {/* Additional Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Daily Summary with Trend Chart */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Payment Trends (Last 7 Days)
                </h3>
                {dailySummary.length > 0 ? (
                  <>
                    {/* Visual Bar Chart */}
                    <div className="mb-4 p-4 bg-white rounded-lg">
                      <div className="flex items-end justify-between gap-2 h-32">
                        {dailySummary.slice(0, 7).reverse().map((day, index) => {
                          const maxAmount = Math.max(...dailySummary.slice(0, 7).map(d => d.total));
                          const heightPercentage = maxAmount > 0 ? (day.total / maxAmount) * 100 : 0;
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-1">
                              <div className="text-xs text-gray-600 font-medium">
                                {formatMoney(day.total)}
                              </div>
                              <div 
                                className="w-full bg-gradient-to-t from-purple-500 to-purple-300 rounded-t-lg transition-all duration-500 hover:from-purple-600 hover:to-purple-400"
                                style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                                title={`${new Date(day.date).toLocaleDateString()}: ${formatMoney(day.total)}`}
                              />
                              <div className="text-xs text-gray-500 text-center">
                                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed List */}
                    <div className="space-y-2">
                      {dailySummary.slice(0, 3).map((day, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div className="font-medium text-gray-900 text-sm">
                            {new Date(day.date).toLocaleDateString()}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-purple-600 text-sm">{formatMoney(day.total)}</div>
                            <div className="text-xs text-gray-600">
                              ✓ {formatMoney(day.completed)} | ⏳ {formatMoney(day.pending)} | ✗ {formatMoney(day.failed)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No daily summary data available</p>
                  </div>
                )}
              </div>

              {/* Reconciliation Status */}
              <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl border border-orange-200">
                <h3 className="font-semibold text-orange-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Reconciliation
                </h3>
                <div className="space-y-3">
                  {reconciliation.length > 0 ? (
                    reconciliation.slice(0, 3).map((rec, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{new Date(rec.date).toLocaleDateString()}</div>
                          <div className="text-sm text-gray-600">
                            Expected: {formatMoney(rec.expected)} | Actual: {formatMoney(rec.actual)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            rec.status === 'reconciled' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                          }`}>
                            {rec.status}
                          </span>
                          {rec.variance !== 0 && (
                            <div className="text-xs text-red-600 mt-1">
                              Variance: {formatMoney(rec.variance)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No reconciliation data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <GlassButton
                onClick={onClose}
                variant="secondary"
                className="flex-1 py-4 text-lg font-semibold"
              >
                Close
              </GlassButton>
              <GlassButton
                onClick={handlePrint}
                className="flex-1 py-4 text-lg font-semibold bg-gradient-to-r from-blue-500 to-cyan-600 text-white flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Print Report
              </GlassButton>
              <GlassButton
                onClick={handleExportCSV}
                className="flex-1 py-4 text-lg font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 text-white flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </GlassButton>
            </div>
          </div>
          </>
        )}

        {/* Empty State */}
        {!loading && payments.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payment Data</h3>
              <p className="text-gray-600 mb-4">No payment data available for the selected period</p>
              <button 
                onClick={fetchPaymentData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Data
              </button>
            </div>
          </div>
        )}

        {/* Transaction Details Modal */}
        <TransactionDetailsModal
          isOpen={showTransactionDetails}
          onClose={() => {
            setShowTransactionDetails(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
        />
      </GlassCard>
    </div>
  );
};

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
  
  .animate-slideUp {
    animation: slideUp 0.3s ease-out;
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('transaction-modal-animations')) {
  style.id = 'transaction-modal-animations';
  document.head.appendChild(style);
}

export default PaymentTrackingModal;
