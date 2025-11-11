import { Supplier } from './supplierApi';
import { createSupplier, updateSupplier } from './supplierApi';

// CSV Export
export const exportSuppliersToCSV = (suppliers: Supplier[]): string => {
  const headers = [
    'Name',
    'Company Name',
    'Contact Person',
    'Email',
    'Phone',
    'WhatsApp',
    'Address',
    'City',
    'Country',
    'Tax ID',
    'Payment Terms',
    'Currency',
    'Exchange Rate',
    'Credit Limit',
    'Website',
    'Business Type',
    'Priority Level',
    'Notes',
    'Active'
  ];

  const rows = suppliers.map(supplier => [
    supplier.name || '',
    supplier.company_name || '',
    supplier.contact_person || '',
    supplier.email || '',
    supplier.phone || '',
    supplier.whatsapp || '',
    supplier.address || '',
    supplier.city || '',
    supplier.country || '',
    supplier.tax_id || '',
    supplier.payment_terms || '',
    supplier.preferred_currency || '',
    supplier.exchange_rate?.toString() || '',
    (supplier as any).credit_limit?.toString() || '',
    (supplier as any).website_url || '',
    (supplier as any).business_type || '',
    (supplier as any).priority_level || '',
    supplier.notes || '',
    supplier.is_active ? 'Yes' : 'No'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
};

// Download CSV file
export const downloadCSV = (content: string, filename: string = 'suppliers.csv') => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export suppliers to CSV and download
export const exportAndDownloadSuppliers = (suppliers: Supplier[]) => {
  const csvContent = exportSuppliersToCSV(suppliers);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csvContent, `suppliers_export_${timestamp}.csv`);
};

// Parse CSV content
export const parseCSV = (content: string): any[] => {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const rows = lines.slice(1);

  return rows.map(row => {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
};

// Import suppliers from CSV
export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

export const importSuppliersFromCSV = async (
  file: File,
  updateExisting: boolean = false
): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = parseCSV(content);
        
        const result: ImportResult = {
          success: 0,
          failed: 0,
          errors: []
        };

        for (let i = 0; i < parsedData.length; i++) {
          const row = parsedData[i];
          
          try {
            // Validate required fields
            if (!row.Name || !row.Name.trim()) {
              throw new Error('Name is required');
            }

            // Map CSV fields to supplier data
            const supplierData: any = {
              name: row.Name,
              company_name: row['Company Name'] || undefined,
              contact_person: row['Contact Person'] || undefined,
              email: row.Email || undefined,
              phone: row.Phone || undefined,
              whatsapp: row.WhatsApp || undefined,
              address: row.Address || undefined,
              city: row.City || undefined,
              country: row.Country || undefined,
              tax_id: row['Tax ID'] || undefined,
              payment_terms: row['Payment Terms'] || undefined,
              preferred_currency: row.Currency || undefined,
              exchange_rate: row['Exchange Rate'] ? parseFloat(row['Exchange Rate']) : undefined,
              notes: row.Notes || undefined,
              is_active: row.Active !== 'No'
            };

            // Add new fields
            if (row['Credit Limit']) {
              supplierData.credit_limit = parseFloat(row['Credit Limit']);
            }
            if (row.Website) {
              supplierData.website_url = row.Website;
            }
            if (row['Business Type']) {
              supplierData.business_type = row['Business Type'];
            }
            if (row['Priority Level']) {
              supplierData.priority_level = row['Priority Level'];
            }

            // Create supplier
            await createSupplier(supplierData);
            result.success++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              row: i + 2, // +2 because of header row and 0-index
              error: error instanceof Error ? error.message : 'Unknown error',
              data: row
            });
          }
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};

// Export template CSV
export const downloadSupplierTemplate = () => {
  const headers = [
    'Name',
    'Company Name',
    'Contact Person',
    'Email',
    'Phone',
    'WhatsApp',
    'Address',
    'City',
    'Country',
    'Tax ID',
    'Payment Terms',
    'Currency',
    'Exchange Rate',
    'Credit Limit',
    'Website',
    'Business Type',
    'Priority Level',
    'Notes',
    'Active'
  ];

  const sampleRow = [
    'Example Supplier Ltd',
    'Example Company Ltd',
    'John Doe',
    'john@example.com',
    '+255123456789',
    '+255123456789',
    '123 Main Street',
    'Dar es Salaam',
    'Tanzania',
    'TIN123456',
    'Net 30',
    'TZS',
    '1',
    '5000000',
    'https://example.com',
    'distributor',
    'standard',
    'Sample notes here',
    'Yes'
  ];

  const csvContent = [
    headers.join(','),
    sampleRow.map(cell => `"${cell}"`).join(',')
  ].join('\n');

  downloadCSV(csvContent, 'supplier_import_template.csv');
};

// Export to Excel format (using CSV with Excel-friendly formatting)
export const exportSuppliersToExcel = (suppliers: Supplier[]) => {
  const csvContent = exportSuppliersToCSV(suppliers);
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Add BOM for Excel UTF-8 support
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `suppliers_export_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Bulk export with filters
export interface ExportOptions {
  includeInactive?: boolean;
  countries?: string[];
  categories?: string[];
  tags?: string[];
  minRating?: number;
}

export const exportFilteredSuppliers = (
  suppliers: Supplier[],
  options: ExportOptions = {}
) => {
  let filtered = suppliers;

  // Apply filters
  if (!options.includeInactive) {
    filtered = filtered.filter(s => s.is_active);
  }

  if (options.countries && options.countries.length > 0) {
    filtered = filtered.filter(s => s.country && options.countries!.includes(s.country));
  }

  if (options.minRating) {
    filtered = filtered.filter(s => (s as any).average_rating >= options.minRating!);
  }

  exportAndDownloadSuppliers(filtered);
};

// Export statistics report
export const exportSupplierStatistics = (suppliers: Supplier[]) => {
  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.is_active).length,
    inactive: suppliers.filter(s => !s.is_active).length,
    byCountry: {} as Record<string, number>,
    byPaymentTerms: {} as Record<string, number>,
    byCurrency: {} as Record<string, number>
  };

  suppliers.forEach(supplier => {
    // Count by country
    if (supplier.country) {
      stats.byCountry[supplier.country] = (stats.byCountry[supplier.country] || 0) + 1;
    }

    // Count by payment terms
    if (supplier.payment_terms) {
      stats.byPaymentTerms[supplier.payment_terms] = 
        (stats.byPaymentTerms[supplier.payment_terms] || 0) + 1;
    }

    // Count by currency
    if (supplier.preferred_currency) {
      stats.byCurrency[supplier.preferred_currency] = 
        (stats.byCurrency[supplier.preferred_currency] || 0) + 1;
    }
  });

  const lines = [
    'SUPPLIER STATISTICS REPORT',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    'OVERVIEW',
    `Total Suppliers: ${stats.total}`,
    `Active: ${stats.active}`,
    `Inactive: ${stats.inactive}`,
    '',
    'BY COUNTRY',
    ...Object.entries(stats.byCountry).map(([country, count]) => `${country}: ${count}`),
    '',
    'BY PAYMENT TERMS',
    ...Object.entries(stats.byPaymentTerms).map(([terms, count]) => `${terms}: ${count}`),
    '',
    'BY CURRENCY',
    ...Object.entries(stats.byCurrency).map(([currency, count]) => `${currency}: ${count}`)
  ];

  const content = lines.join('\n');
  const timestamp = new Date().toISOString().split('T')[0];
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `supplier_statistics_${timestamp}.txt`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

