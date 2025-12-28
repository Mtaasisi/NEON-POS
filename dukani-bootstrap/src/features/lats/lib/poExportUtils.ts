// Purchase Order Export Utilities
import { formatMoney, Currency } from './purchaseOrderUtils';

export interface POExportData {
  orderNumber: string;
  orderDate: string;
  supplier: {
    name: string;
    contact?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    productName: string;
    variantName: string;
    sku: string;
    quantity: number;
    costPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  total: number;
  currency: Currency;
  paymentTerms?: string;
  notes?: string;
  expectedDelivery?: string;
  exchangeRate?: number;
}

// Generate printable HTML for PO
export const generatePOPrintHTML = (data: POExportData): string => {
  const currentDate = new Date().toLocaleDateString();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Order - ${data.orderNumber}</title>
  <style>
    @media print {
      @page { margin: 0.5in; }
      body { margin: 0; }
      .no-print { display: none; }
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
    }
    
    .header {
      border-bottom: 3px solid #f97316;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #f97316;
      margin-bottom: 5px;
    }
    
    .po-title {
      font-size: 28px;
      font-weight: bold;
      text-align: right;
      color: #1f2937;
    }
    
    .po-number {
      font-size: 16px;
      text-align: right;
      color: #6b7280;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #374151;
      margin-bottom: 10px;
      text-transform: uppercase;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    
    th {
      background-color: #f3f4f6;
      padding: 12px 8px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #d1d5db;
    }
    
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    
    .totals-table {
      margin-left: auto;
      width: 300px;
      margin-top: 20px;
    }
    
    .totals-table td {
      padding: 8px;
    }
    
    .grand-total {
      font-size: 16px;
      font-weight: bold;
      background-color: #fef3c7;
      border-top: 3px solid #f59e0b;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      font-size: 10px;
      color: #6b7280;
    }
    
    .signature-line {
      margin-top: 50px;
      border-top: 1px solid #000;
      width: 200px;
      padding-top: 5px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <table style="width: 100%;">
      <tr>
        <td style="width: 50%;">
          <div class="company-name">Your Company Name</div>
          <div>123 Business Street</div>
          <div>Dar es Salaam, Tanzania</div>
          <div>Phone: +255 XXX XXX XXX</div>
          <div>Email: orders@yourcompany.com</div>
        </td>
        <td style="width: 50%; vertical-align: top;">
          <div class="po-title">PURCHASE ORDER</div>
          <div class="po-number">#${data.orderNumber}</div>
          <div style="margin-top: 10px;">
            <strong>Date:</strong> ${data.orderDate}<br>
            ${data.expectedDelivery ? `<strong>Expected Delivery:</strong> ${data.expectedDelivery}<br>` : ''}
          </div>
        </td>
      </tr>
    </table>
  </div>
  
  <div class="section">
    <div class="section-title">Supplier Information</div>
    <strong>${data.supplier.name}</strong><br>
    ${data.supplier.contact ? `${data.supplier.contact}<br>` : ''}
    ${data.supplier.address ? `${data.supplier.address}<br>` : ''}
    ${data.supplier.phone ? `Phone: ${data.supplier.phone}<br>` : ''}
    ${data.supplier.email ? `Email: ${data.supplier.email}` : ''}
  </div>
  
  <div class="section">
    <div class="section-title">Order Details</div>
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 35%;">Product</th>
          <th style="width: 15%;">SKU</th>
          <th class="text-center" style="width: 10%;">Qty</th>
          <th class="text-right" style="width: 15%;">Unit Price</th>
          <th class="text-right" style="width: 20%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <strong>${item.productName}</strong><br>
              <small style="color: #6b7280;">${item.variantName}</small>
            </td>
            <td><code>${item.sku}</code></td>
            <td class="text-center font-bold">${item.quantity}</td>
            <td class="text-right">${formatMoney(item.costPrice, data.currency)}</td>
            <td class="text-right font-bold">${formatMoney(item.totalPrice, data.currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <table class="totals-table">
      <tr>
        <td>Subtotal:</td>
        <td class="text-right font-bold">${formatMoney(data.subtotal, data.currency)}</td>
      </tr>
      ${data.exchangeRate && data.exchangeRate !== 1 ? `
      <tr>
        <td>Exchange Rate:</td>
        <td class="text-right">1 ${data.currency.code} = ${data.exchangeRate} TZS</td>
      </tr>
      <tr>
        <td>Total (TZS):</td>
        <td class="text-right">TZS ${(data.total * data.exchangeRate).toLocaleString()}</td>
      </tr>
      ` : ''}
      <tr class="grand-total">
        <td>Grand Total:</td>
        <td class="text-right">${formatMoney(data.total, data.currency)}</td>
      </tr>
    </table>
  </div>
  
  ${data.paymentTerms ? `
  <div class="section">
    <div class="section-title">Payment Terms</div>
    ${data.paymentTerms}
  </div>
  ` : ''}
  
  ${data.notes ? `
  <div class="section">
    <div class="section-title">Notes</div>
    ${data.notes}
  </div>
  ` : ''}
  
  <div class="section">
    <div class="section-title">Terms & Conditions</div>
    <ol style="margin: 0; padding-left: 20px;">
      <li>Please confirm receipt of this purchase order</li>
      <li>Delivery must be made on or before the expected delivery date</li>
      <li>Quality standards must be maintained as per specifications</li>
      <li>Invoice must reference this PO number: ${data.orderNumber}</li>
      <li>Payment will be made as per agreed payment terms</li>
    </ol>
  </div>
  
  <div style="margin-top: 60px;">
    <table style="width: 100%;">
      <tr>
        <td style="width: 50%;">
          <div class="signature-line">
            Prepared By<br>
            <small>Date: ${currentDate}</small>
          </div>
        </td>
        <td style="width: 50%;">
          <div class="signature-line">
            Approved By
          </div>
        </td>
      </tr>
    </table>
  </div>
  
  <div class="footer">
    <p>This is a system-generated purchase order. For questions, please contact our procurement department.</p>
    <p>Generated on: ${currentDate} | Purchase Order #${data.orderNumber}</p>
  </div>
  
  <div class="no-print" style="margin-top: 30px; text-align: center;">
    <button onclick="window.print()" style="padding: 12px 24px; background-color: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer;">
      🖨️ Print Purchase Order
    </button>
    <button onclick="window.close()" style="margin-left: 10px; padding: 12px 24px; background-color: #6b7280; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer;">
      ✕ Close
    </button>
  </div>
</body>
</html>
  `;
};

// Print PO
export const printPO = (data: POExportData) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(generatePOPrintHTML(data));
    printWindow.document.close();
    
    // Trigger print after a short delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    throw new Error('Popup blocked - please allow popups to print');
  }
};

// Export PO to Excel (CSV format)
export const exportPOToExcel = (data: POExportData) => {
  const rows = [
    ['PURCHASE ORDER'],
    ['Order Number', data.orderNumber],
    ['Order Date', data.orderDate],
    ['Expected Delivery', data.expectedDelivery || 'N/A'],
    [''],
    ['SUPPLIER INFORMATION'],
    ['Name', data.supplier.name],
    ['Contact', data.supplier.contact || 'N/A'],
    ['Phone', data.supplier.phone || 'N/A'],
    ['Email', data.supplier.email || 'N/A'],
    [''],
    ['ORDER ITEMS'],
    ['#', 'Product Name', 'Variant', 'SKU', 'Quantity', 'Unit Price', 'Total Price'],
    ...data.items.map((item, index) => [
      (index + 1).toString(),
      item.productName,
      item.variantName,
      item.sku,
      item.quantity.toString(),
      item.costPrice.toString(),
      item.totalPrice.toString()
    ]),
    [''],
    ['SUMMARY'],
    ['Subtotal', '', '', '', '', '', data.subtotal.toString()],
    ['Currency', data.currency.code],
    ...(data.exchangeRate && data.exchangeRate !== 1 ? [
      ['Exchange Rate', `1 ${data.currency.code} = ${data.exchangeRate} TZS`],
      ['Total (TZS)', '', '', '', '', '', (data.total * data.exchangeRate).toString()]
    ] : []),
    ['Grand Total', '', '', '', '', '', data.total.toString()],
    [''],
    ['Payment Terms', data.paymentTerms || 'N/A'],
    ['Notes', data.notes || 'N/A']
  ];

  const csvContent = rows.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(cell).replace(/"/g, '""');
      return escaped.includes(',') ? `"${escaped}"` : escaped;
    }).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `PO_${data.orderNumber}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

// Generate Excel export (using dynamic XLSX import)
export const exportPOToExcelAdvanced = async (data: POExportData) => {
  try {
    // Dynamic import of xlsx library
    const XLSX = await import('xlsx');
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Header data
    const headerData = [
      ['PURCHASE ORDER'],
      ['Order Number:', data.orderNumber],
      ['Order Date:', data.orderDate],
      ['Expected Delivery:', data.expectedDelivery || 'N/A'],
      [],
      ['SUPPLIER INFORMATION'],
      ['Name:', data.supplier.name],
      ['Contact:', data.supplier.contact || 'N/A'],
      ['Phone:', data.supplier.phone || 'N/A'],
      ['Email:', data.supplier.email || 'N/A'],
      [],
      ['ORDER ITEMS'],
    ];
    
    // Items table headers
    const itemsHeaders = ['#', 'Product Name', 'Variant', 'SKU', 'Quantity', 'Unit Price', 'Total Price'];
    
    // Items data
    const itemsData = data.items.map((item, index) => [
      index + 1,
      item.productName,
      item.variantName,
      item.sku,
      item.quantity,
      item.costPrice,
      item.totalPrice
    ]));
    
    // Summary data
    const summaryData = [
      [],
      ['SUMMARY'],
      ['Subtotal:', '', '', '', '', '', data.subtotal],
      ['Currency:', data.currency.code],
      ...(data.exchangeRate && data.exchangeRate !== 1 ? [
        ['Exchange Rate:', `1 ${data.currency.code} = ${data.exchangeRate} TZS`],
        ['Total (TZS):', '', '', '', '', '', data.total * data.exchangeRate]
      ] : []),
      ['Grand Total:', '', '', '', '', '', data.total],
      [],
      ['Payment Terms:', data.paymentTerms || 'N/A'],
      ['Notes:', data.notes || 'N/A']
    ];
    
    // Combine all data
    const wsData = [
      ...headerData,
      itemsHeaders,
      ...itemsData,
      ...summaryData
    ];
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // #
      { wch: 30 },  // Product Name
      { wch: 15 },  // Variant
      { wch: 15 },  // SKU
      { wch: 10 },  // Quantity
      { wch: 15 },  // Unit Price
      { wch: 15 }   // Total Price
    ];
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Order');
    
    // Generate Excel file
    XLSX.writeFile(wb, `PO_${data.orderNumber}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    // Fallback to CSV if XLSX fails
    exportPOToExcel(data);
    return false;
  }
};

