// Professional Invoice Template with Business Logo
import React from 'react';
import { useBusinessInfo } from '../../hooks/useBusinessInfo';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceTemplateProps {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  customer: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    taxId?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  notes?: string;
  terms?: string;
  onPrint?: () => void;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
  invoiceNumber,
  invoiceDate,
  dueDate,
  customer,
  items,
  subtotal,
  tax = 0,
  discount = 0,
  total,
  notes,
  terms,
  onPrint
}) => {
  const { businessInfo, loading } = useBusinessInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            {businessInfo.logo && (
              <img 
                src={businessInfo.logo} 
                alt={businessInfo.name}
                className="h-16 w-auto mb-4 bg-white rounded p-2"
              />
            )}
            <h1 className="text-3xl font-bold">{businessInfo.name}</h1>
            <div className="text-blue-100 mt-2 space-y-1">
              {businessInfo.address && <p>{businessInfo.address}</p>}
              {businessInfo.phone && <p>Tel: {businessInfo.phone}</p>}
              {businessInfo.email && <p>Email: {businessInfo.email}</p>}
              {businessInfo.website && <p>Web: {businessInfo.website}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold">INVOICE</h2>
            <p className="mt-2 text-blue-100">#{invoiceNumber}</p>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="p-8">
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Bill To */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold text-lg text-gray-900">{customer.name}</p>
              {customer.address && <p className="text-gray-600 mt-1">{customer.address}</p>}
              {customer.phone && <p className="text-gray-600 mt-1">{customer.phone}</p>}
              {customer.email && <p className="text-gray-600 mt-1">{customer.email}</p>}
              {customer.taxId && <p className="text-gray-600 mt-1">Tax ID: {customer.taxId}</p>}
            </div>
          </div>

          {/* Invoice Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Invoice Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Date:</span>
                <span className="font-semibold">{invoiceDate}</span>
              </div>
              {dueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-semibold">{dueDate}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Amount Due:</span>
                <span className="font-bold text-blue-600 text-lg">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="text-left p-3 font-semibold text-gray-700">Description</th>
                <th className="text-center p-3 font-semibold text-gray-700 w-24">Qty</th>
                <th className="text-right p-3 font-semibold text-gray-700 w-32">Unit Price</th>
                <th className="text-right p-3 font-semibold text-gray-700 w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-3 text-gray-900">{item.description}</td>
                  <td className="p-3 text-center text-gray-600">{item.quantity}</td>
                  <td className="p-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="p-3 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount:</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax:</span>
                  <span className="font-semibold">{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t-2 pt-3 border-gray-300">
                <span className="text-gray-900">Total:</span>
                <span className="text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes and Terms */}
        {(notes || terms) && (
          <div className="grid grid-cols-2 gap-8 mb-8">
            {notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h3>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{notes}</p>
                </div>
              </div>
            )}
            {terms && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Terms & Conditions</h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{terms}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-6 text-center text-gray-600 text-sm">
          <p>Thank you for your business!</p>
          <p className="mt-2">
            For any questions concerning this invoice, please contact {businessInfo.email || businessInfo.phone}
          </p>
        </div>

        {/* Print Button */}
        {onPrint && (
          <div className="flex justify-center mt-6 no-print">
            <button
              onClick={onPrint}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
            >
              Print Invoice
            </button>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceTemplate;

// Export function to generate printable invoice
export const generatePrintableInvoice = (props: InvoiceTemplateProps, businessInfo: any) => {
  return window.open('', '_blank');
};

