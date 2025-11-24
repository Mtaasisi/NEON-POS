// Professional Invoice Template with Business Logo
import React, { useState, useEffect } from 'react';
import { useBusinessInfo } from '../../hooks/useBusinessInfo';
import { financeAccountService, FinanceAccount } from '../../lib/financeAccountService';

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
  const { businessInfo, loading, error } = useBusinessInfo();
  const [paymentAccounts, setPaymentAccounts] = useState<FinanceAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Fetch bank/payment accounts for payment method section
  useEffect(() => {
    const loadPaymentAccounts = async () => {
      try {
        const accounts = await financeAccountService.getFinancePaymentMethods();
        // Filter to show only bank accounts
        const bankAccounts = accounts.filter(acc => acc.type === 'bank' && acc.is_active);
        setPaymentAccounts(bankAccounts);
      } catch (err) {
        console.warn('Failed to load payment accounts:', err);
      } finally {
        setLoadingAccounts(false);
      }
    };
    loadPaymentAccounts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-gray-600">Loading business information...</p>
      </div>
    );
  }

  if (error) {
    console.warn('Failed to load business info:', error);
  }

  // Get primary bank account (first bank account or first payment account)
  const primaryBankAccount = paymentAccounts.find(acc => acc.type === 'bank') || paymentAccounts[0];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatCurrencySimple = (amount: number) => {
    // Format like "$ 800,00" (with comma as decimal separator) or "1,789,000/=" for TZS
    // Using TZS format based on business location
    return `${amount.toLocaleString('en-TZ')}/=`;
  };

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-lg overflow-hidden" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Two Column Layout */}
      <div className="flex" style={{ minHeight: '100%' }}>
        {/* Left Column - Gradient Orange to Purple Background */}
        <div className="w-2/5 bg-gradient-to-b from-orange-500 via-orange-600 to-purple-700 text-white flex flex-col justify-between relative overflow-hidden" style={{ padding: '40px 40px', minHeight: '100%' }}>
          {/* Decorative Circles */}
          <div className="absolute top-12 right-12 w-32 h-32 bg-gradient-to-br from-orange-300 to-purple-500 rounded-full opacity-30 blur-xl"></div>
          <div className="absolute top-48 right-24 w-24 h-24 bg-gradient-to-br from-orange-400 to-purple-600 rounded-full opacity-25 blur-lg"></div>
          <div className="absolute bottom-48 left-12 w-20 h-20 bg-gradient-to-br from-orange-300 to-purple-500 rounded-full opacity-20 blur-lg"></div>

          <div className="relative z-10 flex flex-col" style={{ height: '100%', justifyContent: 'space-between' }}>
            <div style={{ flex: '1 1 auto', minHeight: 0 }}>
              {/* Business Header */}
              <div style={{ marginBottom: '32px' }}>
                <h1 className="text-4xl font-bold" style={{ fontFamily: 'cursive, serif', fontWeight: 400, marginBottom: '16px', fontSize: '36px' }}>
                  {businessInfo.name || 'Your Business'}
                </h1>
                {businessInfo.logo && (
                  <img 
                    src={businessInfo.logo} 
                    alt={businessInfo.name}
                    className="h-20 w-20 bg-white rounded-full p-2 object-contain"
                    style={{ marginTop: '8px' }}
                  />
                )}
              </div>

              {/* Invoice To Section */}
              <div style={{ marginBottom: '28px' }}>
                <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '12px', fontSize: '10px' }}>INVOICE TO:</p>
                <h2 className="text-4xl font-bold leading-tight" style={{ marginBottom: '16px', fontSize: '36px', lineHeight: '1.2' }}>{customer.name.toUpperCase()}</h2>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <p className="opacity-90 text-xs uppercase" style={{ marginBottom: '4px', fontSize: '10px', letterSpacing: '1px' }}>Date</p>
                    <p className="font-semibold text-base" style={{ fontSize: '16px' }}>{new Date(invoiceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {dueDate && (
                    <div>
                      <p className="opacity-90 text-xs uppercase" style={{ marginBottom: '4px', fontSize: '10px', letterSpacing: '1px' }}>Issue</p>
                      <p className="font-semibold text-base" style={{ fontSize: '16px' }}>{new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Section */}
              {customer.address && (
                <div style={{ marginBottom: '20px' }}>
                  <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '8px', fontSize: '10px' }}>Address</p>
                  <p className="text-sm leading-relaxed" style={{ fontSize: '13px', lineHeight: '1.5' }}>{customer.address}</p>
                </div>
              )}

              {/* Phone Section */}
              {customer.phone && (
                <div style={{ marginBottom: '20px' }}>
                  <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '8px', fontSize: '10px' }}>Phone</p>
                  <p className="text-sm" style={{ fontSize: '13px' }}>{customer.phone}</p>
                  {customer.email && <p className="text-sm" style={{ fontSize: '13px', marginTop: '6px' }}>{customer.email}</p>}
                </div>
              )}

              {/* Business Contact Info - Compact */}
              {(businessInfo.address || businessInfo.phone || businessInfo.email || businessInfo.website) && (
                <div style={{ marginBottom: '20px' }}>
                  {businessInfo.address && (
                    <div style={{ marginBottom: '10px' }}>
                      <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '4px', fontSize: '10px' }}>Business Address</p>
                      <p className="text-sm" style={{ fontSize: '13px', lineHeight: '1.4' }}>{businessInfo.address}</p>
                    </div>
                  )}
                  {businessInfo.phone && (
                    <div style={{ marginBottom: '10px' }}>
                      <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '4px', fontSize: '10px' }}>Business Phone</p>
                      <p className="text-sm" style={{ fontSize: '13px' }}>{businessInfo.phone}</p>
                    </div>
                  )}
                  {businessInfo.email && (
                    <div style={{ marginBottom: '10px' }}>
                      <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '4px', fontSize: '10px' }}>Business Email</p>
                      <p className="text-sm" style={{ fontSize: '13px' }}>{businessInfo.email}</p>
                    </div>
                  )}
                  {businessInfo.website && (
                    <div style={{ marginBottom: '10px' }}>
                      <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '4px', fontSize: '10px' }}>Website</p>
                      <p className="text-sm" style={{ fontSize: '13px' }}>{businessInfo.website}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Method Section - Always visible at bottom */}
            <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
              <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '16px', fontSize: '10px' }}>Payment Method</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {primaryBankAccount?.bank_name ? (
                  <p className="text-sm" style={{ fontSize: '13px' }}>Your Bank: {primaryBankAccount.bank_name}</p>
                ) : (
                  <p className="text-sm" style={{ fontSize: '13px' }}>Your Bank: Sample Bank Name</p>
                )}
                {primaryBankAccount?.account_number ? (
                  <p className="text-sm" style={{ fontSize: '13px' }}>Bank Account: {primaryBankAccount.account_number}</p>
                ) : (
                  <p className="text-sm" style={{ fontSize: '13px' }}>Bank Account: 1234567890</p>
                )}
                <p className="text-sm" style={{ fontSize: '13px' }}>Swift Code: SWIFT123456</p>
                <p className="text-sm" style={{ fontSize: '13px' }}>Card Payment: Accepted</p>
                <p className="text-sm" style={{ fontSize: '13px' }}>Paypal: yourbusiness@email.com</p>
                <p className="text-sm" style={{ fontSize: '13px' }}>Master Card: Accepted</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - White Background */}
        <div className="w-3/5 bg-white flex flex-col" style={{ padding: '48px 60px' }}>
          {/* Invoice Header */}
          <div style={{ marginBottom: '40px' }}>
            <h2 className="text-6xl font-bold text-black lowercase" style={{ fontWeight: 700, letterSpacing: '-2px', marginBottom: '16px', fontSize: '64px', lineHeight: '1' }}>invoice.</h2>
            <p className="text-gray-600" style={{ fontSize: '13px', marginTop: '8px' }}>
              Account No. <span className="font-semibold text-black">{invoiceNumber.replace(/[^0-9]/g, '') || '987654321'}</span>
            </p>
          </div>

          {/* Receiver Address Section */}
          <div style={{ marginBottom: '32px', backgroundColor: '#F3F4F6', padding: '20px', borderRadius: '4px' }}>
            <p className="text-xs uppercase font-semibold text-gray-700" style={{ letterSpacing: '1px', marginBottom: '12px', fontSize: '10px' }}>RECEIVER ADDRESS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p className="text-sm font-semibold text-gray-900" style={{ fontSize: '14px' }}>{customer.name}</p>
              {customer.address && (
                <p className="text-sm text-gray-700" style={{ fontSize: '13px', lineHeight: '1.6' }}>{customer.address}</p>
              )}
              {customer.phone && (
                <p className="text-sm text-gray-700" style={{ fontSize: '13px' }}>Phone: {customer.phone}</p>
              )}
              {customer.email && (
                <p className="text-sm text-gray-700" style={{ fontSize: '13px' }}>Email: {customer.email}</p>
              )}
              {customer.taxId && (
                <p className="text-sm text-gray-700" style={{ fontSize: '13px' }}>Tax ID: {customer.taxId}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: '32px' }}>
            <table className="w-full border-collapse" style={{ borderSpacing: 0, width: '100%' }}>
              <thead>
                <tr className="bg-gray-600 text-white">
                  <th className="text-left font-semibold text-sm text-white" style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600 }}>Description</th>
                  <th className="text-center font-semibold text-sm text-white" style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600, width: '80px' }}>Qty</th>
                  <th className="text-right font-semibold text-sm text-white" style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600, width: '140px' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="text-gray-900 text-sm" style={{ padding: '20px', lineHeight: '1.6', fontSize: '13px' }}>{item.description}</td>
                    <td className="text-center text-gray-900 text-sm" style={{ padding: '20px', fontSize: '13px' }}>{item.quantity}</td>
                    <td className="text-right font-semibold text-gray-900 text-sm" style={{ padding: '20px', fontSize: '13px' }}>{formatCurrencySimple(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div style={{ marginBottom: '40px' }}>
            <div className="bg-gray-400 text-white flex justify-between items-center" style={{ padding: '16px 24px', backgroundColor: '#9CA3AF' }}>
              <span className="font-semibold" style={{ fontSize: '13px' }}>Sub Total</span>
              <span className="font-semibold" style={{ fontSize: '13px' }}>{formatCurrencySimple(subtotal)}</span>
            </div>
            <div className="bg-gray-500 text-white flex justify-between items-center" style={{ padding: '16px 24px', backgroundColor: '#6B7280' }}>
              <span className="font-semibold" style={{ fontSize: '15px' }}>Total (Include Tax)</span>
              <span className="font-semibold" style={{ fontSize: '18px' }}>{formatCurrencySimple(total)}</span>
            </div>
          </div>

          {/* Terms & Conditions and Signature */}
          <div style={{ marginBottom: '40px' }}>
            <h3 className="text-xs font-semibold text-gray-900 uppercase" style={{ letterSpacing: '1px', marginBottom: '16px', fontSize: '11px' }}>Term & Condition</h3>
            <div className="flex justify-between items-start" style={{ gap: '60px' }}>
              <div className="flex-1">
                <p className="text-sm text-gray-700" style={{ lineHeight: '1.8', fontSize: '13px', color: '#374151' }}>
                  {terms || notes || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam rutrum gravida turpis. Nunc dictum, leo non blandit pharetra, erat arcu viverra libero.'}
                </p>
              </div>
              <div className="text-right" style={{ minWidth: '150px', flexShrink: 0 }}>
                <div>
                  <div className="text-gray-900 font-semibold" style={{ fontFamily: 'cursive, serif', marginBottom: '4px', fontSize: '16px' }}>{customer.name}</div>
                  <div className="text-gray-600" style={{ fontSize: '11px' }}>Manager</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-gray-200" style={{ paddingTop: '40px', marginTop: 'auto', borderTop: '1px solid #E5E7EB' }}>
            <p className="text-center text-gray-600 uppercase" style={{ letterSpacing: '3px', fontSize: '11px', color: '#4B5563' }}>Thank You For The Business</p>
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

