// Professional Invoice Template with Business Logo
import React, { useState, useEffect } from 'react';
import { useBusinessInfo } from '../../hooks/useBusinessInfo';
import { financeAccountService, FinanceAccount } from '../../lib/financeAccountService';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  specifications?: string | Record<string, any>; // Product specifications
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
  additionalCustomerInfo?: {
    companyName?: string;
    additionalNotes?: string;
    receiverName?: string;
    receiverAddress?: string;
    receiverPhone?: string;
  };
  paymentInfo?: {
    paymentMethod?: string;
    paymentReference?: string;
    transactionId?: string;
    paidAmount?: number;
    balance?: number;
    paymentDate?: string;
  };
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
  onPrint,
  additionalCustomerInfo,
  paymentInfo
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
    <div className="invoice-container mx-auto bg-white shadow-lg overflow-hidden" style={{ 
      fontFamily: 'Arial, sans-serif',
      width: '1128px',
      minHeight: '1536px',
      maxWidth: '1128px'
    }}>
      {/* Two Column Layout */}
      <div className="flex" style={{ minHeight: '1536px' }}>
        {/* Left Column - Black Background */}
        <div className="text-white flex flex-col justify-between relative overflow-hidden" style={{ 
          width: '370px',
          paddingTop: '80px',
          paddingLeft: '45px',
          paddingRight: '35px',
          paddingBottom: '0',
          minHeight: '1536px',
          backgroundColor: 'black'
        }}>
          <div className="relative z-10 flex flex-col" style={{ height: '100%', justifyContent: 'space-between' }}>
            <div style={{ flex: '1 1 auto', minHeight: 0 }}>
              {/* Business Header */}
              <div style={{ marginBottom: '32px' }}>
                {businessInfo.logo && (
                  <img 
                    src={businessInfo.logo} 
                    alt={businessInfo.name}
                    className="object-contain"
                    style={{ width: '100%', maxWidth: '180px', height: 'auto', display: 'block', marginBottom: '12px', marginLeft: 'auto', marginRight: 'auto' }}
                  />
                )}
                <h1 className="font-bold" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '16px', textAlign: 'center', width: '100%' }}>
                  {businessInfo.name || 'Your Business'}
                </h1>
              </div>

              {/* Invoice To Section */}
              <div style={{ marginBottom: '28px' }}>
                <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '12px', fontSize: '10px', textAlign: 'left' }}>INVOICE TO:</p>
                <h2 className="text-4xl font-bold leading-tight" style={{ marginBottom: '16px', fontSize: '28px', lineHeight: '1.2', textAlign: 'left' }}>{customer.name.toUpperCase()}</h2>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <p className="opacity-90 text-xs uppercase" style={{ marginBottom: '4px', fontSize: '10px', letterSpacing: '1px', textAlign: 'left' }}>Date</p>
                    <p className="font-semibold text-base" style={{ fontSize: '16px', textAlign: 'left' }}>{new Date(invoiceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {dueDate && (
                    <div>
                      <p className="opacity-90 text-xs uppercase" style={{ marginBottom: '4px', fontSize: '10px', letterSpacing: '1px', textAlign: 'left' }}>Issue</p>
                      <p className="font-semibold text-base" style={{ fontSize: '16px', textAlign: 'left' }}>{new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Section */}
              {customer.address && (
                <div style={{ marginBottom: '20px' }}>
                  <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '8px', fontSize: '10px', textAlign: 'left' }}>Address</p>
                  <p className="text-sm leading-relaxed" style={{ fontSize: '13px', lineHeight: '1.5', textAlign: 'left' }}>{customer.address}</p>
                </div>
              )}

              {/* Phone Section */}
              {customer.phone && (
                <div style={{ marginBottom: '20px' }}>
                  <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '8px', fontSize: '10px', textAlign: 'left' }}>Phone</p>
                  <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>{customer.phone}</p>
                  {customer.email && <p className="text-sm" style={{ fontSize: '13px', marginTop: '6px', textAlign: 'left' }}>{customer.email}</p>}
                </div>
              )}

              {/* Additional Customer Information */}
              {additionalCustomerInfo && (
                <div style={{ marginBottom: '20px' }}>
                  {additionalCustomerInfo.companyName && (
                    <div style={{ marginBottom: '12px' }}>
                      <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '4px', fontSize: '10px', textAlign: 'left' }}>Company</p>
                      <p className="text-sm font-semibold" style={{ fontSize: '13px', textAlign: 'left' }}>{additionalCustomerInfo.companyName}</p>
                    </div>
                  )}
                  {additionalCustomerInfo.additionalNotes && (
                    <div style={{ marginBottom: '12px' }}>
                      <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '4px', fontSize: '10px', textAlign: 'left' }}>Notes</p>
                      <p className="text-sm" style={{ fontSize: '13px', lineHeight: '1.5', textAlign: 'left' }}>{additionalCustomerInfo.additionalNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Receiver Information (if different from customer) */}
              {additionalCustomerInfo?.receiverName && (
                <div style={{ marginBottom: '20px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '12px', fontSize: '10px', textAlign: 'left' }}>RECEIVER:</p>
                  <h3 className="text-xl font-bold" style={{ marginBottom: '8px', fontSize: '20px', lineHeight: '1.2', textAlign: 'left' }}>{additionalCustomerInfo.receiverName.toUpperCase()}</h3>
                  {additionalCustomerInfo.receiverAddress && (
                    <div style={{ marginBottom: '8px' }}>
                      <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '1px', marginBottom: '4px', fontSize: '10px', textAlign: 'left' }}>Address</p>
                      <p className="text-sm" style={{ fontSize: '13px', lineHeight: '1.5', textAlign: 'left' }}>{additionalCustomerInfo.receiverAddress}</p>
                    </div>
                  )}
                  {additionalCustomerInfo.receiverPhone && (
                    <div>
                      <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '1px', marginBottom: '4px', fontSize: '10px', textAlign: 'left' }}>Phone</p>
                      <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>{additionalCustomerInfo.receiverPhone}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Business Contact Info - Compact */}
              {(businessInfo.address || businessInfo.phone || businessInfo.email || businessInfo.website) && (
                <div style={{ marginBottom: '20px' }}>
                  {businessInfo.address && (
                    <div style={{ marginBottom: '10px' }}>
                      <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '4px', fontSize: '10px', textAlign: 'left' }}>Business Address</p>
                      <p className="text-sm" style={{ fontSize: '13px', lineHeight: '1.4', textAlign: 'left' }}>{businessInfo.address}</p>
                    </div>
                  )}
                  {businessInfo.phone && (
                    <div style={{ marginBottom: '10px' }}>
                      <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '4px', fontSize: '10px', textAlign: 'left' }}>Business Phone</p>
                      <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>{businessInfo.phone}</p>
                    </div>
                  )}
                  {businessInfo.email && (
                    <div style={{ marginBottom: '10px' }}>
                      <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '4px', fontSize: '10px', textAlign: 'left' }}>Business Email</p>
                      <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>{businessInfo.email}</p>
                    </div>
                  )}
                  {businessInfo.website && (
                    <div style={{ marginBottom: '10px' }}>
                      <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '4px', fontSize: '10px', textAlign: 'left' }}>Website</p>
                      <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>{businessInfo.website}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Method Section - Always visible at bottom */}
            <div style={{ flexShrink: 0, paddingTop: '20px', marginTop: 'auto' }}>
              <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '12px', fontSize: '10px', textAlign: 'left' }}>Payment Method</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {primaryBankAccount?.bank_name ? (
                  <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>Your Bank: {primaryBankAccount.bank_name}</p>
                ) : (
                  <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>Your Bank: Sample Bank Name</p>
                )}
                {primaryBankAccount?.account_number ? (
                  <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>Bank Account: {primaryBankAccount.account_number}</p>
                ) : (
                  <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>Bank Account: 1234567890</p>
                )}
                <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>Swift Code: SWIFT123456</p>
                <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>Card Payment: Accepted</p>
                <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>Paypal: yourbusiness@email.com</p>
                <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>Master Card: Accepted</p>
              </div>

              {/* Payment Information (if provided) */}
              {paymentInfo && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p className="text-xs uppercase opacity-90" style={{ letterSpacing: '2px', marginBottom: '12px', fontSize: '10px', textAlign: 'left' }}>Payment Information</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {paymentInfo.paymentMethod && (
                      <p className="text-sm font-semibold" style={{ fontSize: '13px', textAlign: 'left' }}>Method: {paymentInfo.paymentMethod}</p>
                    )}
                    {paymentInfo.paymentReference && (
                      <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>Reference: {paymentInfo.paymentReference}</p>
                    )}
                    {paymentInfo.transactionId && (
                      <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>Transaction ID: {paymentInfo.transactionId}</p>
                    )}
                    {paymentInfo.paidAmount !== undefined && (
                      <p className="text-sm font-semibold" style={{ fontSize: '13px', textAlign: 'left' }}>Paid: {formatCurrencySimple(paymentInfo.paidAmount)}</p>
                    )}
                    {paymentInfo.balance !== undefined && (
                      <p className="text-sm font-semibold" style={{ fontSize: '13px', textAlign: 'left' }}>Balance: {formatCurrencySimple(paymentInfo.balance)}</p>
                    )}
                    {paymentInfo.paymentDate && (
                      <p className="text-sm" style={{ fontSize: '13px', textAlign: 'left' }}>Date: {new Date(paymentInfo.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - White Background */}
        <div className="bg-white flex flex-col" style={{ 
          width: '758px',
          padding: '60px',
          minHeight: '1536px'
        }}>
          {/* Invoice Header - Fixed Height 180px */}
          <div style={{ height: '180px', marginBottom: '0' }}>
            <h2 className="text-6xl font-bold text-black lowercase" style={{ fontWeight: 700, letterSpacing: '-2px', marginBottom: '16px', fontSize: '64px', lineHeight: '1' }}>invoice.</h2>
            <p className="text-gray-600" style={{ fontSize: '13px', marginTop: '8px' }}>
              Account No. <span className="font-semibold text-black">{invoiceNumber.replace(/[^0-9]/g, '') || '987654321'}</span>
            </p>
          </div>

        {/* Items Table - 40px space before, 650px width, exact column widths */}
          <div style={{ marginTop: '40px', marginBottom: '32px' }}>
            <table className="border-collapse" style={{ 
              borderSpacing: 0, 
              width: '650px',
              tableLayout: 'fixed'
            }}>
            <thead>
                <tr className="bg-gray-600 text-white" style={{ height: '55px' }}>
                  <th className="text-left font-semibold text-sm text-white" style={{ 
                    padding: '16px 20px', 
                    fontSize: '13px', 
                    fontWeight: 600,
                    width: '420px'
                  }}>Description</th>
                  <th className="text-center font-semibold text-sm text-white" style={{ 
                    padding: '16px 20px', 
                    fontSize: '13px', 
                    fontWeight: 600, 
                    width: '80px'
                  }}>Qty</th>
                  <th className="text-right font-semibold text-sm text-white" style={{ 
                    padding: '16px 20px', 
                    fontSize: '13px', 
                    fontWeight: 600, 
                    width: '150px'
                  }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                // Format specifications
                let specificationsText = '';
                if (item.specifications) {
                  if (typeof item.specifications === 'string') {
                    specificationsText = item.specifications;
                  } else if (typeof item.specifications === 'object') {
                    // Format as key-value pairs
                    specificationsText = Object.entries(item.specifications)
                      .filter(([key]) => key !== '_raw')
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ');
                    
                    // If no key-value pairs but has _raw, use that
                    if (!specificationsText && item.specifications._raw) {
                      specificationsText = item.specifications._raw;
                    }
                  }
                }

                return (
                  <tr key={index} className="border-b border-gray-200" style={{ height: '115px' }}>
                    <td className="text-gray-900 text-sm" style={{ 
                      padding: '20px', 
                      lineHeight: '1.6', 
                      fontSize: '13px',
                      width: '420px',
                      verticalAlign: 'top'
                    }}>
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: specificationsText ? '4px' : 0 }}>{item.description}</div>
                        {specificationsText && (
                          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', lineHeight: '1.4' }}>
                            {specificationsText}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-center text-gray-900 text-sm" style={{ 
                      padding: '20px', 
                      fontSize: '13px',
                      width: '80px',
                      verticalAlign: 'top'
                    }}>{item.quantity}</td>
                    <td className="text-right font-semibold text-gray-900 text-sm" style={{ 
                      padding: '20px', 
                      fontSize: '13px',
                      width: '150px',
                      verticalAlign: 'top'
                    }}>{formatCurrencySimple(item.total)}</td>
                  </tr>
                );
              })}
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

        {/* Footer - Fixed Height 250px */}
          <div className="mt-auto border-t border-gray-200" style={{ 
            height: '250px',
            paddingTop: '40px', 
            marginTop: 'auto', 
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
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
          @page {
            size: A4;
            margin: 0;
          }
          /* Scale to A4 for printing: 1128px → 794px (210mm at 96dpi) */
          .invoice-container {
            transform: scale(0.704);
            transform-origin: top left;
            width: 1128px;
            height: 1536px;
          }
        }
        @media screen {
          .invoice-container {
            width: 1128px;
            min-height: 1536px;
            margin: 0 auto;
          }
        }
        @media (max-width: 1200px) {
          /* Responsive scaling for smaller screens */
          .invoice-container {
            transform: scale(0.9);
            transform-origin: top left;
          }
        }
        @media (max-width: 1024px) {
          .invoice-container {
            transform: scale(0.8);
            transform-origin: top left;
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

