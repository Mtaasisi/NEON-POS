// Receipt Preview Component - Shows live preview of receipt with current settings
import React, { useState } from 'react';
import { ReceiptSettings } from '../../../../lib/posSettingsApi';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { format } from '../../lib/format';

interface ReceiptPreviewProps {
  settings: ReceiptSettings;
  businessInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo?: string;
  };
}

const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ settings, businessInfo }) => {
  // Zoom state for A4 preview
  const [zoomLevel, setZoomLevel] = useState(0.5); // Start at 50% for A4

  // Sample receipt data for preview
  const sampleData = {
    transactionId: 'TXN-2025-001234',
    receiptNumber: settings.enable_receipt_numbering 
      ? settings.receipt_number_format.replace('{YEAR}', '2025').replace('{NUMBER}', '001234')
      : 'RCP-001234',
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    cashier: 'John Doe',
    customer: {
      name: 'Jane Smith',
      phone: '+255 712 345 678'
    },
    items: [
      { name: 'Product A', sku: 'SKU-001', barcode: '1234567890123', qty: 2, price: 15000, total: 30000 },
      { name: 'Product B', sku: 'SKU-002', barcode: '9876543210987', qty: 1, price: 25000, total: 25000 },
      { name: 'Product C', sku: 'SKU-003', barcode: '5555555555555', qty: 3, price: 8000, total: 24000 }
    ],
    subtotal: 79000,
    discount: 5000,
    tax: 13320,
    grandTotal: 87320,
    payment: {
      method: 'Cash',
      amount: 90000,
      change: 2680
    }
  };

  // Determine which template to use
  const template = settings.receipt_template || 'standard';

  // Template flags
  const isCompact = template === 'compact';
  const isDetailed = template === 'detailed';
  const isA4 = template === 'a4';

  // A4 uses fixed width and larger font, others use settings
  const receiptWidth = isA4 ? '210mm' : `${settings.receipt_width}mm`;
  const fontSize = isA4 ? '14px' : `${settings.receipt_font_size}px`;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
      <div className="text-sm font-medium text-gray-500 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <div>Live Preview - {template.charAt(0).toUpperCase() + template.slice(1)} Template</div>
            {isA4 && <div className="text-xs text-gray-400 mt-1">A4 Size: 210mm × 297mm</div>}
          </div>
          {isA4 && (
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => setZoomLevel(Math.max(0.3, zoomLevel - 0.1))}
                className="p-1 hover:bg-gray-100 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(1, zoomLevel + 0.1))}
                className="p-1 hover:bg-gray-100 rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Scrollable container for A4 */}
      <div className={isA4 ? 'overflow-auto max-h-[calc(100vh-220px)] bg-gray-100 p-4' : ''}>
        {/* Receipt Paper */}
        <div 
          className={`bg-white border mx-auto overflow-hidden ${isA4 ? 'border-2 border-gray-400 shadow-2xl origin-top' : 'border border-gray-300'}`}
          style={{ 
            width: receiptWidth,
            maxWidth: '100%',
            fontSize: fontSize,
            fontFamily: isA4 ? 'Arial, sans-serif' : 'monospace',
            height: isA4 ? '297mm' : 'auto',
            minHeight: isA4 ? '297mm' : 'auto',
            // A4 aspect ratio: 1:1.414 (297/210)
            aspectRatio: isA4 ? '210/297' : undefined,
            // Apply zoom transform for A4
            transform: isA4 ? `scale(${zoomLevel})` : undefined,
            transformOrigin: isA4 ? 'top center' : undefined
          }}
        >
        <div className={`${isA4 ? 'p-8 space-y-4' : `p-4 ${isCompact ? 'space-y-1' : 'space-y-2'}`}`}>
          {/* A4 HEADER */}
          {isA4 ? (
            <>
              {/* A4 Header with logo and business info side by side */}
              <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-4">
                <div className="flex-1">
                  {settings.show_business_logo && businessInfo?.logo && (
                    <img 
                      src={businessInfo.logo} 
                      alt="Logo" 
                      className="h-16 object-contain mb-2"
                    />
                  )}
                  {settings.show_business_name && (
                    <div className="text-2xl font-bold text-gray-900">
                      {businessInfo?.name || 'inauzwa'}
                    </div>
                  )}
                  {settings.show_business_address && (
                    <div className="text-sm text-gray-700 mt-1">{businessInfo?.address || '123 Business Street, City'}</div>
                  )}
                  <div className="text-sm text-gray-700 mt-1 space-y-0.5">
                    {settings.show_business_phone && (
                      <div>Phone: {businessInfo?.phone || '+255 123 456 789'}</div>
                    )}
                    {settings.show_business_email && (
                      <div>Email: {businessInfo?.email || 'info@business.com'}</div>
                    )}
                    {settings.show_business_website && (
                      <div>Web: {businessInfo?.website || 'www.business.com'}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">INVOICE</div>
                  {settings.enable_receipt_numbering && (
                    <div className="text-sm text-gray-600 mt-1">
                      Receipt #: <span className="font-semibold">{sampleData.receiptNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* THERMAL RECEIPT HEADER */
            <>
              {/* Business Logo */}
              {settings.show_business_logo && businessInfo?.logo && !isCompact && (
                <div className="text-center mb-2">
                  <img 
                    src={businessInfo.logo} 
                    alt="Logo" 
                    className="h-12 mx-auto object-contain"
                  />
                </div>
              )}

              {/* Business Information */}
              <div className="text-center border-b border-dashed border-gray-400 pb-2">
                {settings.show_business_name && (
                  <div className={`font-bold ${isCompact ? 'text-base' : 'text-lg'}`}>
                    {businessInfo?.name || 'inauzwa'}
                  </div>
                )}
                {settings.show_business_address && !isCompact && (
                  <div className="text-xs">{businessInfo?.address || '123 Business Street, City'}</div>
                )}
                {settings.show_business_phone && (
                  <div className="text-xs">{businessInfo?.phone || '+255 123 456 789'}</div>
                )}
                {settings.show_business_email && !isCompact && (isDetailed || settings.show_business_email) && (
                  <div className="text-xs">{businessInfo?.email || 'info@business.com'}</div>
                )}
                {settings.show_business_website && !isCompact && (isDetailed || settings.show_business_website) && (
                  <div className="text-xs">{businessInfo?.website || 'www.business.com'}</div>
                )}
              </div>
            </>
          )}

          {/* Transaction Details */}
          {isA4 ? (
            /* A4 Transaction Details - Two columns */
            <div className="grid grid-cols-2 gap-8 text-sm bg-gray-50 p-4 rounded">
              <div>
                <div className="font-semibold text-gray-900 mb-2">Invoice Details</div>
                {settings.show_transaction_id && (
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-medium">{sampleData.transactionId}</span>
                  </div>
                )}
                {settings.show_date_time && (
                  <>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{sampleData.date}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{sampleData.time}</span>
                    </div>
                  </>
                )}
                {settings.show_cashier_name && (
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Cashier:</span>
                    <span className="font-medium">{sampleData.cashier}</span>
                  </div>
                )}
              </div>
              <div>
                <div className="font-semibold text-gray-900 mb-2">Customer Details</div>
                {settings.show_customer_name && (
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{sampleData.customer.name}</span>
                  </div>
                )}
                {settings.show_customer_phone && (
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{sampleData.customer.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* THERMAL Transaction Details */
            <div className={`text-xs ${isCompact ? 'space-y-0.5' : 'space-y-1'} border-b border-dashed border-gray-400 pb-2`}>
              {settings.show_transaction_id && !isCompact && (isDetailed || settings.show_transaction_id) && (
                <div className="flex justify-between">
                  <span>Transaction ID:</span>
                  <span className="font-semibold">{sampleData.transactionId}</span>
                </div>
              )}
              {settings.enable_receipt_numbering && (
                <div className="flex justify-between">
                  <span>Receipt #:</span>
                  <span className="font-semibold">{sampleData.receiptNumber}</span>
                </div>
              )}
              {settings.show_date_time && (
                <>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{sampleData.date}</span>
                  </div>
                  {!isCompact && (
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span>{sampleData.time}</span>
                    </div>
                  )}
                </>
              )}
              {settings.show_cashier_name && !isCompact && (
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{sampleData.cashier}</span>
                </div>
              )}
              {settings.show_customer_name && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{sampleData.customer.name}</span>
                </div>
              )}
              {settings.show_customer_phone && !isCompact && (isDetailed || settings.show_customer_phone) && (
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{sampleData.customer.phone}</span>
                </div>
              )}
            </div>
          )}

          {/* Items */}
          {isA4 ? (
            /* A4 Items Table */
            <div className="mt-4">
              <div className="font-semibold text-lg text-gray-900 mb-3">Items</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-800 text-left">
                    <th className="pb-2 font-semibold">#</th>
                    {settings.show_product_names && <th className="pb-2 font-semibold">Item</th>}
                    {settings.show_product_skus && <th className="pb-2 font-semibold">SKU</th>}
                    {settings.show_quantities && <th className="pb-2 font-semibold text-center">Qty</th>}
                    {settings.show_unit_prices && <th className="pb-2 font-semibold text-right">Price</th>}
                    <th className="pb-2 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleData.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2">{idx + 1}</td>
                      {settings.show_product_names && (
                        <td className="py-2">
                          <div className="font-medium">{item.name}</div>
                          {settings.show_product_barcodes && (
                            <div className="text-xs text-gray-500">{item.barcode}</div>
                          )}
                        </td>
                      )}
                      {settings.show_product_skus && <td className="py-2 text-gray-600">{item.sku}</td>}
                      {settings.show_quantities && <td className="py-2 text-center">{item.qty}</td>}
                      {settings.show_unit_prices && <td className="py-2 text-right">{format.money(item.price)}</td>}
                      <td className="py-2 text-right font-medium">{format.money(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* THERMAL Items */
            <div className="text-xs border-b border-dashed border-gray-400 pb-2">
              <div className="font-bold mb-1">ITEMS</div>
              {sampleData.items.map((item, idx) => (
                <div key={idx} className={isCompact ? 'mb-0.5' : 'mb-1'}>
                  {/* COMPACT: Single line per item */}
                  {isCompact ? (
                    <div className="flex justify-between">
                      <span>{item.name} x{item.qty}</span>
                      <span className="font-semibold">{item.total.toLocaleString()}</span>
                    </div>
                  ) : (
                    /* STANDARD/DETAILED: Multi-line with details */
                    <>
                      {settings.show_product_names && (
                        <div className="font-semibold">{item.name}</div>
                      )}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {settings.show_product_skus && !isCompact && (
                            <div className="text-gray-600">SKU: {item.sku}</div>
                          )}
                          {settings.show_product_barcodes && (isDetailed || settings.show_product_barcodes) && !isCompact && (
                            <div className="text-gray-600">{item.barcode}</div>
                          )}
                          {settings.show_quantities && settings.show_unit_prices && (
                            <div>{item.qty} x {format.money(item.price)}</div>
                          )}
                        </div>
                        <div className="font-semibold">{format.money(item.total)}</div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          {isA4 ? (
            /* A4 Totals - Right aligned summary box */
            <div className="flex justify-end mt-6">
              <div className="w-80 bg-gray-50 p-4 rounded border border-gray-300">
                <div className="space-y-2 text-sm">
                  {settings.show_subtotal && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="font-medium">{format.money(sampleData.subtotal)}</span>
                    </div>
                  )}
                  {settings.show_discounts && settings.show_discount_total && sampleData.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span className="font-medium">-{format.money(sampleData.discount)}</span>
                    </div>
                  )}
                  {settings.show_tax && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Tax (18%):</span>
                      <span className="font-medium">{format.money(sampleData.tax)}</span>
                    </div>
                  )}
                  {settings.show_grand_total && (
                    <div className="flex justify-between font-bold text-lg border-t-2 border-gray-800 pt-2 mt-2">
                      <span>TOTAL:</span>
                      <span>{format.money(sampleData.grandTotal)}</span>
                    </div>
                  )}
                </div>
                {/* Payment info for A4 */}
                {(settings.show_payment_method || settings.show_change_amount) && (
                  <div className="mt-3 pt-3 border-t border-gray-300 text-sm space-y-1">
                    {settings.show_payment_method && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Payment Method:</span>
                        <span className="font-medium">{sampleData.payment.method}</span>
                      </div>
                    )}
                    {settings.show_change_amount && sampleData.payment.change > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Cash Received:</span>
                          <span className="font-medium">{format.money(sampleData.payment.amount)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-green-600">
                          <span>Change:</span>
                          <span>{format.money(sampleData.payment.change)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* THERMAL Totals */
            <div className={`text-xs ${isCompact ? 'space-y-0.5' : 'space-y-1'}`}>
              {settings.show_subtotal && !isCompact && (
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{format.money(sampleData.subtotal)}</span>
                </div>
              )}
              {settings.show_discounts && settings.show_discount_total && sampleData.discount > 0 && !isCompact && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{format.money(sampleData.discount)}</span>
                </div>
              )}
              {settings.show_tax && !isCompact && (
                <div className="flex justify-between">
                  <span>Tax (18%):</span>
                  <span>{format.money(sampleData.tax)}</span>
                </div>
              )}
              {settings.show_grand_total && (
                <div className={`flex justify-between font-bold ${isCompact ? 'text-sm' : 'text-base'} border-t border-gray-400 pt-1 mt-1`}>
                  <span>TOTAL:</span>
                  <span>{format.money(sampleData.grandTotal)}</span>
                </div>
              )}
            </div>
          )}

          {/* Payment - Only for thermal receipts (A4 has it in totals box) */}
          {!isA4 && (settings.show_payment_method || settings.show_change_amount) && (
            <div className="text-xs space-y-1 border-t border-dashed border-gray-400 pt-2">
              {settings.show_payment_method && (
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span>{sampleData.payment.method}</span>
                </div>
              )}
              {settings.show_change_amount && sampleData.payment.change > 0 && (
                <>
                  <div className="flex justify-between">
                    <span>Cash:</span>
                    <span>{format.money(sampleData.payment.amount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Change:</span>
                    <span>{format.money(sampleData.payment.change)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Footer */}
          {(settings.show_footer_message || settings.show_return_policy) && (
            <div className={`${isA4 ? 'text-sm mt-8 pt-6 border-t-2 border-gray-800' : 'text-xs text-center border-t border-dashed border-gray-400 pt-2 mt-2'} space-y-2`}>
              {settings.show_footer_message && settings.footer_message && (
                <div className={`${isA4 ? 'text-center text-base font-medium text-gray-700' : 'font-medium'}`}>
                  {settings.footer_message}
                </div>
              )}
              {settings.show_return_policy && settings.return_policy_text && (
                <div className={`${isA4 ? 'text-xs text-gray-600 bg-gray-50 p-3 rounded' : 'text-gray-600 text-[10px]'}`}>
                  <span className={isA4 ? 'font-semibold' : ''}>Return Policy: </span>
                  {settings.return_policy_text}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPreview;

