// Updated UI - Version 2.0 - Matches SetPricingModal design
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Smartphone, MessageSquare, X, Bluetooth, CheckCircle, XCircle, Settings, Receipt, Package } from 'lucide-react';
import { useBluetoothPrinter } from '../../../../hooks/useBluetoothPrinter';
import { useBusinessInfo } from '../../../../hooks/useBusinessInfo';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import { format } from '../../lib/format';
import { parsePhoneEntries } from '../../../../lib/formatBusinessInfo';

interface Receipt {
  id: string;
  date: string;
  time: string;
  items: any[];
  customer?: any;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: any;
  cashier: string;
  receiptNumber: string;
}

interface POSReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt?: Receipt;
  receiptData?: Receipt; // Alias for receipt
  formatMoney?: (amount: number) => string;
  onPrint?: () => void;
  onSendWhatsApp?: () => void;
  onSendSMS?: () => void;
  isTaxEnabled?: boolean;
}

const POSReceiptModal: React.FC<POSReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  receiptData,
  formatMoney,
  onPrint,
  onSendWhatsApp,
  onSendSMS,
  isTaxEnabled = true
}) => {
  // Use receiptData if receipt is not provided
  const actualReceipt = receipt || receiptData;
  
  // Use format.money as default if formatMoney is not provided
  const formatMoneyFn = formatMoney || format.money;
  
  // Default no-op functions for callbacks
  const handlePrint = onPrint || (() => console.log('Print not implemented'));
  const handleSendWhatsApp = onSendWhatsApp || (() => console.log('WhatsApp not implemented'));
  const handleSendSMS = onSendSMS || (() => console.log('SMS not implemented'));
  const {
    isConnected: isBluetoothConnected,
    isPrinting: isBluetoothPrinting,
    printReceipt: printBluetoothReceipt,
    connectedDevice
  } = useBluetoothPrinter();
  
  const { businessInfo } = useBusinessInfo();
  
  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);
  const [showBluetoothOptions, setShowBluetoothOptions] = useState(false);

  if (!isOpen || !actualReceipt) return null;

  return createPortal(
    <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="receipt-modal-title"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
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
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
              <Receipt className="w-8 h-8 text-white" />
            </div>
            
            {/* Text and Status */}
            <div>
              <h3 id="receipt-modal-title" className="text-2xl font-bold text-gray-900 mb-3">Sale Receipt</h3>
              
              {/* Status Indicator */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-bold text-green-700">Transaction Completed</span>
                </div>
                {actualReceipt.items && actualReceipt.items.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-blue-700">{actualReceipt.items.length} Item{actualReceipt.items.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Receipt Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Receipt Card */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-4 shadow-sm">
            {/* Business Header */}
            <div className="text-center mb-6 pb-6 border-b border-gray-200">
              {businessInfo.logo && (
                <div className="mb-4">
                  <img 
                    src={businessInfo.logo} 
                    alt={`${businessInfo.name} Logo`}
                    className="h-20 w-auto mx-auto object-contain"
                  />
                </div>
              )}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{businessInfo.name}</h3>
              {businessInfo.address && (
                <p className="text-sm text-gray-600">{businessInfo.address}</p>
              )}
              <div className="flex flex-col items-center justify-center gap-1 mt-2">
                {businessInfo.phone && (() => {
                  const entries = parsePhoneEntries(businessInfo.phone);
                  return (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {entries.map((entry, idx) => (
                        <p key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                          {entry.whatsapp && (
                            <span className="text-green-600" title="WhatsApp">📱</span>
                          )}
                          <span>{entry.phone}</span>
                        </p>
                      ))}
                    </div>
                  );
                })()}
                {businessInfo.email && (
                  <p className="text-xs text-gray-500">{businessInfo.email}</p>
                )}
              </div>
            </div>

            {/* Receipt Info */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-600">Receipt #</span>
                <span className="text-base font-bold text-gray-900">{actualReceipt?.receiptNumber || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Date & Time</span>
                <span className="text-sm font-medium text-gray-900">{actualReceipt.date} at {actualReceipt.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cashier</span>
                <span className="text-sm font-medium text-gray-900">{actualReceipt.cashier}</span>
              </div>
            </div>

            {/* Customer Info */}
            {actualReceipt.customer && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Customer Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Name</span>
                    <span className="text-sm font-medium text-gray-900">{actualReceipt.customer.name}</span>
                  </div>
                  {actualReceipt.customer.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Phone</span>
                      <span className="text-sm font-medium text-gray-900">{actualReceipt.customer.phone}</span>
                    </div>
                  )}
                  {actualReceipt.customer.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Email</span>
                      <span className="text-sm font-medium text-gray-900">{actualReceipt.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Items</h4>
              <div className="space-y-3">
                {actualReceipt.items?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start py-3 px-3 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">{item.productName}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity} × {formatMoneyFn(item.unitPrice)}</p>
                    </div>
                    <p className="font-bold text-gray-900 text-base ml-4">{formatMoneyFn(item.quantity * item.unitPrice)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Summary */}
            <div className="mb-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Subtotal</span>
                  <span className="text-base font-semibold text-gray-900">{formatMoneyFn(actualReceipt.subtotal)}</span>
                </div>
                {isTaxEnabled && actualReceipt.tax > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Tax</span>
                    <span className="text-base font-semibold text-gray-900">{formatMoneyFn(actualReceipt.tax)}</span>
                  </div>
                )}
                {actualReceipt.discount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Discount</span>
                    <span className="text-base font-semibold text-red-600">-{formatMoneyFn(actualReceipt.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-green-600">{formatMoneyFn(actualReceipt.total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{actualReceipt.paymentMethod?.icon || '💳'}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{actualReceipt.paymentMethod?.name || 'Payment'}</p>
                  {actualReceipt.paymentMethod?.description && (
                    <p className="text-xs text-gray-600">{actualReceipt.paymentMethod.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Message */}
            <div className="text-center pt-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Thank you for your purchase!</p>
              <p className="text-xs text-gray-500">Please keep this receipt for your records</p>
            </div>
          </div>
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          {/* Bluetooth Printer Status */}
          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isBluetoothConnected ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {isBluetoothConnected ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    {isBluetoothConnected ? 'Bluetooth Printer Connected' : 'Bluetooth Printer Not Connected'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {isBluetoothConnected ? connectedDevice?.name : 'Connect a Bluetooth printer to print receipts'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBluetoothOptions(!showBluetoothOptions)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {showBluetoothOptions ? 'Hide' : 'Options'}
              </button>
            </div>

            {/* Bluetooth Options */}
            {showBluetoothOptions && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      try {
                        await printBluetoothReceipt({
                          header: businessInfo.name,
                          items: actualReceipt.items?.map((item: any) => ({
                            name: item.productName,
                            quantity: item.quantity,
                            price: item.unitPrice,
                            total: item.quantity * item.unitPrice
                          })) || [],
                          subtotal: actualReceipt.subtotal,
                          tax: actualReceipt.tax,
                          discount: actualReceipt.discount,
                          total: actualReceipt.total,
                          paymentMethod: actualReceipt.paymentMethod?.name || 'Payment',
                          cashier: actualReceipt.cashier,
                          footer: 'Thank you for your purchase!'
                        });
                      } catch (error) {
                        console.error('Failed to print via Bluetooth:', error);
                        alert('Failed to print via Bluetooth printer');
                      }
                    }}
                    disabled={!isBluetoothConnected || isBluetoothPrinting}
                    className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 font-semibold shadow-sm"
                  >
                    <Bluetooth className="w-4 h-4" />
                    {isBluetoothPrinting ? 'Printing...' : 'Bluetooth Print'}
                  </button>
                  <button
                    onClick={() => {
                      window.open('/bluetooth-printer', '_blank');
                    }}
                    className="p-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 font-semibold shadow-sm"
                  >
                    <Settings className="w-4 h-4" />
                    Manage Printer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              onClick={handlePrint}
              className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
            <button
              onClick={handleSendWhatsApp}
              className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl"
            >
              <Smartphone className="w-5 h-5" />
              WhatsApp
            </button>
            <button
              onClick={handleSendSMS}
              className="p-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl"
            >
              <MessageSquare className="w-5 h-5" />
              SMS
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default POSReceiptModal;
