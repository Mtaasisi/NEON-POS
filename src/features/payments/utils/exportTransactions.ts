/**
 * Export Transactions Utility
 * Handles exporting transaction data to CSV and PDF formats
 */

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
}

interface ExportOptions {
  accountName: string;
  currency: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format time for display
 */
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format currency amount
 */
const formatAmount = (amount: number, currency: string = 'TZS'): string => {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Get transaction type display name
 */
const getTransactionTypeDisplay = (type: string): string => {
  const typeMap: Record<string, string> = {
    'payment_received': 'Payment Received',
    'expense': 'Expense',
    'transfer_in': 'Transfer In',
    'transfer_out': 'Transfer Out',
    'adjustment': 'Adjustment',
  };
  return typeMap[type] || type;
};

/**
 * Export transactions to CSV format
 */
export const exportToCSV = (
  transactions: Transaction[],
  options: ExportOptions
): void => {
  // CSV Headers
  const headers = [
    'Date',
    'Time',
    'Type',
    'Description',
    'Reference',
    'Amount',
    'Balance Before',
    'Balance After',
  ];

  // Convert transactions to CSV rows
  const rows = transactions.map(t => [
    formatDate(t.created_at),
    formatTime(t.created_at),
    getTransactionTypeDisplay(t.transaction_type),
    t.description || '',
    t.reference_number || '',
    t.amount.toFixed(2),
    t.balance_before.toFixed(2),
    t.balance_after.toFixed(2),
  ]);

  // Build CSV content
  let csvContent = 'data:text/csv;charset=utf-8,';
  
  // Add title
  csvContent += `"${options.accountName} - Transaction History"\n`;
  csvContent += `"Currency: ${options.currency}"\n`;
  
  if (options.dateRange) {
    csvContent += `"Period: ${formatDate(options.dateRange.start)} to ${formatDate(options.dateRange.end)}"\n`;
  }
  
  csvContent += `"Generated: ${formatDate(new Date().toISOString())} at ${formatTime(new Date().toISOString())}"\n`;
  csvContent += '\n';
  
  // Add headers
  csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
  
  // Add data rows
  rows.forEach(row => {
    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  // Add summary
  const totalReceived = transactions
    .filter(t => t.transaction_type === 'payment_received' || t.transaction_type === 'transfer_in')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalSpent = transactions
    .filter(t => t.transaction_type === 'expense' || t.transaction_type === 'transfer_out')
    .reduce((sum, t) => sum + t.amount, 0);

  csvContent += '\n';
  csvContent += `"Summary:"\n`;
  csvContent += `"Total Transactions:","${transactions.length}"\n`;
  csvContent += `"Total Received:","${formatAmount(totalReceived, options.currency)}"\n`;
  csvContent += `"Total Spent:","${formatAmount(totalSpent, options.currency)}"\n`;
  csvContent += `"Net Change:","${formatAmount(totalReceived - totalSpent, options.currency)}"\n`;

  // Trigger download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${options.accountName.replace(/\s+/g, '_')}_Transactions_${formatDate(new Date().toISOString()).replace(/\//g, '-')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export transactions to PDF format
 * Note: This uses browser print functionality as a simple PDF solution
 * For production, consider using jspdf library
 */
export const exportToPDF = (
  transactions: Transaction[],
  options: ExportOptions
): void => {
  // Create a printable HTML document
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  const totalReceived = transactions
    .filter(t => t.transaction_type === 'payment_received' || t.transaction_type === 'transfer_in')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalSpent = transactions
    .filter(t => t.transaction_type === 'expense' || t.transaction_type === 'transfer_out')
    .reduce((sum, t) => sum + t.amount, 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${options.accountName} - Transaction History</title>
      <style>
        @media print {
          @page {
            margin: 20mm;
          }
        }
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 15px;
        }
        .header h1 {
          margin: 0;
          color: #1e40af;
          font-size: 24px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 12px;
        }
        th {
          background-color: #2563eb;
          color: white;
          padding: 10px;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .amount-in {
          color: #059669;
          font-weight: 600;
        }
        .amount-out {
          color: #dc2626;
          font-weight: 600;
        }
        .summary {
          margin-top: 30px;
          padding: 15px;
          background-color: #f3f4f6;
          border-radius: 8px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        .summary-row.total {
          border-top: 2px solid #2563eb;
          margin-top: 10px;
          padding-top: 15px;
          font-weight: bold;
          font-size: 16px;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #6b7280;
          font-size: 11px;
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${options.accountName}</h1>
        <p><strong>Transaction History</strong></p>
        <p>Currency: ${options.currency}</p>
        ${options.dateRange ? `<p>Period: ${formatDate(options.dateRange.start)} to ${formatDate(options.dateRange.end)}</p>` : ''}
        <p>Generated: ${formatDate(new Date().toISOString())} at ${formatTime(new Date().toISOString())}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 10%">Date</th>
            <th style="width: 8%">Time</th>
            <th style="width: 15%">Type</th>
            <th style="width: 30%">Description</th>
            <th style="width: 12%">Reference</th>
            <th style="width: 12%; text-align: right">Amount</th>
            <th style="width: 13%; text-align: right">Balance After</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(t => {
            const isIncoming = t.transaction_type === 'payment_received' || t.transaction_type === 'transfer_in';
            const isOutgoing = t.transaction_type === 'expense' || t.transaction_type === 'transfer_out';
            return `
              <tr>
                <td>${formatDate(t.created_at)}</td>
                <td>${formatTime(t.created_at)}</td>
                <td>${getTransactionTypeDisplay(t.transaction_type)}</td>
                <td>${t.description || '-'}</td>
                <td>${t.reference_number || '-'}</td>
                <td class="${isIncoming ? 'amount-in' : isOutgoing ? 'amount-out' : ''}" style="text-align: right">
                  ${isIncoming ? '+' : isOutgoing ? '-' : ''}${formatAmount(t.amount, options.currency)}
                </td>
                <td style="text-align: right">${formatAmount(t.balance_after, options.currency)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="summary">
        <h3 style="margin-top: 0; color: #1e40af;">Summary</h3>
        <div class="summary-row">
          <span>Total Transactions:</span>
          <span><strong>${transactions.length}</strong></span>
        </div>
        <div class="summary-row">
          <span>Total Received:</span>
          <span style="color: #059669"><strong>${formatAmount(totalReceived, options.currency)}</strong></span>
        </div>
        <div class="summary-row">
          <span>Total Spent:</span>
          <span style="color: #dc2626"><strong>${formatAmount(totalSpent, options.currency)}</strong></span>
        </div>
        <div class="summary-row total">
          <span>Net Change:</span>
          <span style="color: ${totalReceived - totalSpent >= 0 ? '#059669' : '#dc2626'}">
            <strong>${formatAmount(totalReceived - totalSpent, options.currency)}</strong>
          </span>
        </div>
      </div>

      <div class="footer">
        <p>This is a computer-generated document. No signature is required.</p>
        <p>© ${new Date().getFullYear()} ${options.accountName}</p>
      </div>

      <script>
        window.onload = function() {
          window.print();
          // Close after printing (commented out for user convenience)
          // setTimeout(() => window.close(), 100);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Simple print function for quick printing
 */
export const printTransactions = (
  transactions: Transaction[],
  options: ExportOptions
): void => {
  exportToPDF(transactions, options);
};

