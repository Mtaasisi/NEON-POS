import React from 'react';
import { ReceiptData } from '../../components/ui/PDFReceiptGenerator';

interface ModernReceiptTemplateProps {
  data: ReceiptData;
  businessInfo?: any;
  settings?: any;
  qrUrl?: string;
}

const ModernReceiptTemplate: React.FC<ModernReceiptTemplateProps> = ({ data, businessInfo, settings, qrUrl }) => {
  const formatMoney = (n: number) =>
    n?.toLocaleString('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div style={{ width: 480, margin: '0 auto', background: '#fff', borderRadius: 18, padding: 24, boxSizing: 'border-box', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {businessInfo?.logo && <img src={businessInfo.logo} alt="logo" style={{ height: 36, objectFit: 'contain' }} />}
          <div style={{ fontSize: 18, fontWeight: 700 }}>{businessInfo?.name || 'Business Name'}</div>
        </div>
        <div style={{ textAlign: 'right', color: '#666', fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>Receipt #{data.receiptNumber}</div>
          <div>{data.date} {data.time}</div>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <h2 style={{ margin: 0, fontSize: 20 }}>Thank you for your purchase!</h2>
      <p style={{ marginTop: 8, color: '#666' }}>
        {businessInfo?.tagline || 'We appreciate your business.'}
      </p>

      <div style={{ height: 12 }} />

      <div style={{ borderTop: '1px dashed #ddd', margin: '12px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Transaction Details</div>
          <div style={{ marginTop: 6, color: '#444' }}>
            <div>Date: {data.date}</div>
            <div>Time: {data.time}</div>
            {data.customer?.name && <div>Customer: {data.customer.name}</div>}
            {data.customer?.phone && <div>Phone: {data.customer.phone}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {/* empty - reserved for additional small metadata */}
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#444' }}>
              <th style={{ paddingBottom: 8 }}>Item</th>
              <th style={{ width: 60, textAlign: 'center' }}>Qty</th>
              <th style={{ width: 90, textAlign: 'right' }}>Price</th>
              <th style={{ width: 90, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, i) => (
              <tr key={i} style={{ borderTop: '1px solid #fafafa' }}>
                <td style={{ paddingTop: 12, paddingBottom: 12 }}>
                  <div style={{ fontWeight: 600 }}>{it.productName}</div>
                  {it.variantName && <div style={{ color: '#888', fontSize: 12 }}>{it.variantName}</div>}
                </td>
                <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                <td style={{ textAlign: 'right' }}>{formatMoney(it.unitPrice)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(it.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ height: 18 }} />

      <div style={{ background: '#f5f7fa', padding: 14, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700 }}>TOTAL</div>
          <div style={{ color: '#666', fontSize: 12 }}>{data.payment?.method || 'Unknown'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{formatMoney(data.totals.grandTotal)}</div>
          {data.totals.tax ? <div style={{ color: '#666', fontSize: 12 }}>Tax {data.totals.tax}</div> : null}
        </div>
      </div>

      <div style={{ height: 18 }} />

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>Win a coffee accessories set</div>
          <div style={{ color: '#666', marginTop: 6 }}>Scan the QR code for details</div>
        </div>
        <div style={{ width: 120, height: 120, background: '#fff', border: '1px solid #e6e6e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {qrUrl ? <img src={qrUrl} alt="qr" style={{ width: 100, height: 100 }} /> : <div style={{ color: '#ccc' }}>QR</div>}
        </div>
      </div>

      <div style={{ height: 18 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 12 }}>
        <div>
          <div>{businessInfo?.name}</div>
          {businessInfo?.address && <div>{businessInfo.address}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>Verify: www.example.com</div>
        </div>
      </div>
    </div>
  );
};

export default ModernReceiptTemplate;


