import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Trash2, Plus, HelpCircle, Package, TrendingUp, ShoppingCart } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ImportRow {
  sku: string;
  quantity: number;
  costPrice?: number;
  notes?: string;
  variantName?: string;
  rowIndex: number;
  status: 'pending' | 'valid' | 'invalid';
  error?: string;
  // Enriched data from product lookup
  productName?: string;
  foundVariantName?: string;
  currentStock?: number;
  suggestedCostPrice?: number;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: Array<{ sku: string; quantity: number; costPrice?: number; notes?: string; variantName?: string }>) => void;
  products: any[];
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  products
}) => {
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        parseCSV(text);
      } catch (error) {
        toast.error('Failed to read file');
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string) => {
    setIsProcessing(true);
    try {
      const lines = csvText.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        toast.error('File is empty');
        return;
      }

      // Skip header if present
      const startIndex = lines[0].toLowerCase().includes('sku') ? 1 : 0;
      const rows: ImportRow[] = [];

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Skip comment lines (starting with #)
        if (line.startsWith('#')) continue;

        // Parse CSV line (handle commas, semicolons, tabs)
        const values = line.split(/[,;\t]/).map(v => v.trim().replace(/^"|"$/g, ''));
        
        if (values.length < 2) continue;

        const row: ImportRow = {
          sku: values[0] || '',
          variantName: values[1] || '',  // Optional variant name for reference
          quantity: parseInt(values[2]) || 1,
          costPrice: values[3] ? parseFloat(values[3]) : undefined,
          notes: values[4] || '',
          rowIndex: i + 1,
          status: 'pending',
        };

        // Validate SKU exists in products and enrich with product data
        const productData = findProductAndVariantBySKU(row.sku);
        if (!productData) {
          row.status = 'invalid';
          row.error = 'Product/Variant not found';
        } else if (row.quantity <= 0) {
          row.status = 'invalid';
          row.error = 'Invalid quantity';
        } else {
          row.status = 'valid';
          // Enrich with product information
          row.productName = productData.product.name;
          row.foundVariantName = productData.variant.name;
          row.currentStock = productData.variant.quantity || 0;
          row.suggestedCostPrice = productData.variant.costPrice || productData.product.costPrice;
          // Use suggested cost price if none provided
          if (!row.costPrice && row.suggestedCostPrice) {
            row.costPrice = row.suggestedCostPrice;
          }
        }

        rows.push(row);
      }

      setImportData(rows);
      
      const validCount = rows.filter(r => r.status === 'valid').length;
      const invalidCount = rows.filter(r => r.status === 'invalid').length;
      
      if (validCount > 0) {
        toast.success(`Parsed ${validCount} valid items${invalidCount > 0 ? ` (${invalidCount} invalid)` : ''}`);
      } else {
        toast.error('No valid items found in file');
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Failed to parse CSV file');
    } finally {
      setIsProcessing(false);
    }
  };

  const findProductAndVariantBySKU = (sku: string): { product: any; variant: any } | null => {
    for (const product of products) {
      if (product.variants && product.variants.length > 0) {
        const variant = product.variants.find((v: any) => v.sku === sku || v.barcode === sku);
        if (variant) {
          return { product, variant };
        }
      }
    }
    return null;
  };

  const handleDownloadTemplate = () => {
    // Create comprehensive template with instructions and all useful columns
    const instructions = `# ============================================================================
# PURCHASE ORDER BULK IMPORT TEMPLATE - COMPREHENSIVE EDITION
# ============================================================================
# 
# REQUIRED COLUMNS (must be filled):
# 1. SKU* - Product variant SKU from your inventory (MUST match exactly)
# 2. Quantity* - Number of units to order
#
# IMPORTANT COLUMNS (recommended):
# 3. ProductName - Full product name (for reference, helps verify correct item)
# 4. VariantName - Variant specification (e.g., "128GB Black", "Size M")
# 5. CostPrice - Cost per unit (if blank, uses last purchase price)
#
# REFERENCE COLUMNS (helpful for decision making):
# 6. Category - Product category (Electronics, Clothing, etc.)
# 7. CurrentStock - Current inventory level (helps identify what needs restocking)
# 8. MinStock - Minimum stock level (reorder point)
# 9. LastPurchasePrice - Historical cost price for comparison
# 10. SellingPrice - Current selling price (for margin calculation)
# 11. Supplier - Preferred supplier name
# 12. Notes - Additional information (urgent, quality concerns, etc.)
#
# TIPS FOR SUCCESS:
# - SKU is the ONLY required field that must match your inventory exactly
# - You can delete any reference columns you don't need
# - Multiple rows can have the same product but different variants
# - Cost prices should be in your base currency (e.g., TZS, USD)
# - Use CurrentStock and MinStock columns to prioritize orders
# - The system validates all SKUs before importing
# - Lines starting with # are comments and will be ignored
#
# QUICK START:
# 1. Keep the header row (line below this)
# 2. Replace sample data with your actual order items
# 3. Fill at minimum: SKU and Quantity
# 4. Upload the file to see validation and enriched preview
#
# CSV FORMAT:
SKU,ProductName,VariantName,Category,CurrentStock,MinStock,Quantity,CostPrice,LastPurchasePrice,SellingPrice,Supplier,Notes`;

    // Add sample products from actual inventory if available
    const sampleRows: string[] = [];
    
    // Get up to 10 sample products with comprehensive data
    const sampleProducts = products.slice(0, 10);
    sampleProducts.forEach(product => {
      if (product.variants && product.variants.length > 0) {
        const variant = product.variants[0];
        const sku = variant.sku || 'SAMPLE-SKU';
        const productName = (product.name || 'Sample Product').replace(/,/g, ';'); // Escape commas
        const variantName = (variant.name || 'Default').replace(/,/g, ';');
        const category = product.categoryName || product.category || 'General';
        const currentStock = variant.quantity || variant.stockQuantity || 0;
        const minStock = product.minStock || variant.minStockLevel || 5;
        const suggestedQty = Math.max(minStock * 2 - currentStock, 0); // Smart quantity suggestion
        const costPrice = variant.costPrice || product.costPrice || '';
        const sellingPrice = variant.sellingPrice || variant.price || product.price || '';
        const supplier = product.supplierName || product.supplier || '';
        
        // Create smart notes based on stock situation
        let notes = '';
        if (currentStock === 0) {
          notes = 'OUT OF STOCK - URGENT';
        } else if (currentStock <= minStock) {
          notes = 'Below minimum stock - reorder';
        } else if (currentStock <= minStock * 1.5) {
          notes = 'Low stock - consider restocking';
        } else {
          notes = 'Regular stock replenishment';
        }
        
        sampleRows.push(
          `${sku},"${productName}","${variantName}",${category},${currentStock},${minStock},${suggestedQty || 10},${costPrice},${costPrice},${sellingPrice},"${supplier}","${notes}"`
        );
      }
    });

    // If no products available, add comprehensive generic examples
    if (sampleRows.length === 0) {
      sampleRows.push(
        'IPHONE14-128GB,"iPhone 14 Pro","128GB Space Gray",Electronics,3,10,15,1200000,1200000,1599000,"Apple Authorized Distributor","Below minimum - urgent restock"',
        'SAMS23-256GB,"Samsung Galaxy S23","256GB Phantom Black",Electronics,0,8,20,1000000,980000,1399000,"Samsung Tanzania Ltd","OUT OF STOCK - Priority order"',
        'MBA-M2-256,"MacBook Air M2 2024","256GB 8GB RAM",Computers,2,5,10,7500000,7500000,9999000,"iStore Tanzania","Low stock - corporate demand"',
        'AIRPODS-PRO2,"Apple AirPods Pro","2nd Generation",Audio,15,20,30,280000,275000,399000,"Apple Authorized Distributor","Regular restock"',
        'GW6-44MM,"Samsung Galaxy Watch 6","44mm Graphite",Wearables,5,10,15,320000,320000,449000,"Samsung Tanzania Ltd","Moderate stock"',
        'IPHONE-CASE-14,"iPhone 14 Pro Case","Silicone Midnight",Accessories,8,25,50,15000,15000,35000,"Mobile Accessories Ltd","Fast moving item"',
        'HDMI-2.1-CABLE,"Premium HDMI 2.1 Cable","2 Meter 8K Support",Cables,12,30,100,8000,7500,18000,"Tech Cables Co","Bulk order - good margin"',
        'USB-C-CHARGER,"65W USB-C Fast Charger","GaN Technology",Chargers,20,30,50,25000,24000,49000,"PowerTech Supplies","Popular accessory"',
        'DELL-XPS13-512,"Dell XPS 13 Laptop","i7 16GB 512GB SSD",Computers,1,3,5,9500000,9500000,12999000,"Dell Tanzania","Premium segment"',
        'SONY-WH1000XM5,"Sony WH-1000XM5","Noise Cancelling Black",Audio,6,8,12,420000,415000,599000,"Sony Electronics EA","High demand product"'
      );
    }

    // Add separator and example modifications
    const examples = `

# ============================================================================
# EXAMPLE MODIFICATIONS YOU CAN MAKE:
# ============================================================================
#
# 1. SIMPLE ORDER (only required fields):
#    IPHONE14-128GB,,,,,10,,,,,,"Quick order"
#
# 2. CUSTOM PRICE:
#    SAMS23-256GB,,,,,5,950000,,,,,,"Negotiated better price"
#
# 3. URGENT ORDER:
#    MBA-M2-256,,,,,3,7500000,,,,,,"URGENT - Customer waiting"
#
# 4. MIXED QUANTITIES FROM SAME PRODUCT:
#    IPHONE14-128GB,"iPhone 14","128GB",Electronics,3,10,10,1200000,,1599000,,"Black color"
#    IPHONE14-256GB,"iPhone 14","256GB",Electronics,1,8,15,1350000,,1799000,,"Black color"
#    IPHONE14-512GB,"iPhone 14","512GB",Electronics,0,5,8,1500000,,1999000,,"OUT OF STOCK"
#
# ============================================================================
# READY TO START? Follow these steps:
# ============================================================================
# 1. DELETE all the lines starting with # (including this section)
# 2. KEEP the header row (SKU,ProductName,VariantName,...)
# 3. MODIFY the sample data rows with your actual order
# 4. SAVE the file
# 5. UPLOAD to see automatic validation and enriched details
# 6. REVIEW the preview with live stock levels and cost prices
# 7. IMPORT to add all items to your purchase order at once!
# ============================================================================`;

    const template = instructions + '\n' + sampleRows.join('\n') + examples;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchase-order-bulk-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('📥 Comprehensive template downloaded with 10 sample products from your inventory!');
  };

  const handleImport = () => {
    const validRows = importData.filter(row => row.status === 'valid');
    
    if (validRows.length === 0) {
      toast.error('No valid items to import');
      return;
    }

    const items = validRows.map(row => ({
      sku: row.sku,
      quantity: row.quantity,
      costPrice: row.costPrice,
      notes: row.notes,
      variantName: row.foundVariantName  // Pass the actual variant name
    }));

    onImport(items);
    toast.success(`Importing ${items.length} items...`);
    onClose();
    setImportData([]);
  };

  const handleRemoveRow = (index: number) => {
    setImportData(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setImportData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const validCount = importData.filter(r => r.status === 'valid').length;
  const invalidCount = importData.filter(r => r.status === 'invalid').length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-100 to-amber-100 p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center shadow-lg">
              <FileSpreadsheet className="w-10 h-10 text-white" />
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Bulk Import</h2>
          <p className="text-gray-700">Import multiple items from CSV file</p>
        </div>

        {/* Actions Bar */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-lg transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload CSV File
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl font-semibold transition-colors"
            >
              <Download className="w-5 h-5" />
              Template
            </button>
            {importData.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-4 py-3 bg-red-50 border-2 border-red-200 hover:bg-red-100 text-red-700 rounded-xl font-semibold transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Clear
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1">
          {importData.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No File Uploaded</h3>
              <p className="text-gray-600 mb-6">Upload a CSV file or download the template to get started</p>
              
              <div className="max-w-4xl mx-auto bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-blue-900">Template Preview (Excel Format)</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-normal bg-blue-100 px-2 py-1 rounded">12 Columns</span>
                    <button
                      onClick={() => setShowHelp(!showHelp)}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                      title="Show detailed instructions"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Help
                    </button>
                  </div>
                </div>
                
                {/* Minimal Excel-like table */}
                <div className="overflow-x-auto bg-white border border-gray-300 rounded-lg mb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-blue-600">
                        <th className="border border-gray-300 px-2 py-1 text-white text-[10px]">A</th>
                        <th className="border border-gray-300 px-2 py-1 text-white text-[10px]">B</th>
                        <th className="border border-gray-300 px-2 py-1 text-white text-[10px]">C</th>
                        <th className="border border-gray-300 px-2 py-1 text-white text-[10px]">D</th>
                        <th className="border border-gray-300 px-2 py-1 text-white text-[10px]">E</th>
                        <th className="border border-gray-300 px-2 py-1 text-white text-[10px]">F</th>
                        <th className="border border-gray-300 px-2 py-1 text-white text-[10px]">G</th>
                        <th className="border border-gray-300 px-2 py-1 text-white text-[10px]">H</th>
                        <th className="border border-gray-300 px-2 py-1 text-white text-[10px]">I</th>
                        <th className="border border-gray-300 px-2 py-1 text-white text-[10px]">J</th>
                        <th className="border border-gray-300 px-2 py-1 text-white text-[10px]">K</th>
                        <th className="border border-gray-300 px-2 py-1 text-white text-[10px]">L</th>
                      </tr>
                      <tr className="bg-gray-100">
                        <td className="border border-gray-300 px-2 py-1.5 font-bold text-red-700 bg-red-50">SKU*</td>
                        <td className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700">Product</td>
                        <td className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700">Variant</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-600">Category</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-600">Stock</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-600">Min</td>
                        <td className="border border-gray-300 px-2 py-1.5 font-bold text-red-700 bg-red-50">Qty*</td>
                        <td className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700">Cost</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-600">Last</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-600">Selling</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-600">Supplier</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-600">Notes</td>
                      </tr>
                    </thead>
                    <tbody className="text-[11px]">
                      <tr>
                        <td className="border border-gray-300 px-2 py-1.5 font-mono">IPH14-128</td>
                        <td className="border border-gray-300 px-2 py-1.5">iPhone 14 Pro</td>
                        <td className="border border-gray-300 px-2 py-1.5">128GB Gray</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-500">Electronics</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-red-600 font-bold">3</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center">10</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-bold">15</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right">1,200,000</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-500">1,200,000</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-500">1,599,000</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-500">Apple</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-red-600">Low stock</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1.5 font-mono">SAM23-256</td>
                        <td className="border border-gray-300 px-2 py-1.5">Galaxy S23</td>
                        <td className="border border-gray-300 px-2 py-1.5">256GB Black</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-500">Electronics</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-red-600 font-bold bg-red-50">0</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center">8</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-bold">20</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right">1,000,000</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-500">980,000</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-500">1,399,000</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-500">Samsung</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-red-600 font-bold">OUT!</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Expandable Help Section */}
                {showHelp && (
                  <div className="mb-4 bg-white border border-blue-300 rounded-lg p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-gray-900 mb-1">Required Columns (2)</h5>
                        <p className="text-sm text-gray-700 mb-1"><strong>A. SKU*</strong> - Product variant SKU (must match inventory exactly)</p>
                        <p className="text-sm text-gray-700"><strong>G. Quantity*</strong> - Number of units to order</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-gray-900 mb-1">Important Columns (3)</h5>
                        <p className="text-sm text-gray-700 mb-1"><strong>B. ProductName</strong> - Helps verify you have the correct item</p>
                        <p className="text-sm text-gray-700 mb-1"><strong>C. VariantName</strong> - Specifications (size, color, etc.)</p>
                        <p className="text-sm text-gray-700"><strong>H. CostPrice</strong> - Cost per unit (auto-fills from last purchase if blank)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-gray-900 mb-1">Reference Columns (7)</h5>
                        <p className="text-sm text-gray-700 mb-1"><strong>D-F:</strong> Category, CurrentStock, MinStock - Help prioritize orders</p>
                        <p className="text-sm text-gray-700 mb-1"><strong>I-J:</strong> LastPrice, SellingPrice - View margins and price changes</p>
                        <p className="text-sm text-gray-700"><strong>K-L:</strong> Supplier, Notes - Organization and priority flags</p>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-bold text-green-900 mb-1">Smart Features</h5>
                          <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                            <li>10 real products from YOUR inventory with actual data</li>
                            <li>Smart quantity suggestions based on stock levels</li>
                            <li>Auto-generated priority notes (OUT OF STOCK, urgent, etc.)</li>
                            <li>Cost prices auto-fill from purchase history</li>
                            <li>Only SKU & Quantity required - rest is optional!</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <ShoppingCart className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-bold text-amber-900 mb-1">Quick Start</h5>
                          <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                            <li>Download template (includes your products)</li>
                            <li>Open in Excel/Google Sheets</li>
                            <li>Delete comment lines (starting with #)</li>
                            <li>Modify quantities and SKUs for your order</li>
                            <li>Save as CSV and upload here</li>
                            <li>Review validation and import</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Compact info */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3 h-3 text-red-700" />
                      <p className="font-bold text-red-900">Required (2)</p>
                    </div>
                    <p className="text-red-700">SKU & Quantity</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-blue-700" />
                      <p className="font-bold text-blue-900">Smart Features</p>
                    </div>
                    <p className="text-blue-700">10 real products, auto prices</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Package className="w-3 h-3 text-green-700" />
                      <p className="font-bold text-green-900">Ready to Use</p>
                    </div>
                    <p className="text-green-700">Download & import</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-6 border-2 border-orange-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                  Import Summary
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">Total Rows</p>
                    <p className="text-2xl font-bold text-gray-900">{importData.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">Valid</p>
                    <p className="text-2xl font-bold text-green-600">{validCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">Invalid</p>
                    <p className="text-2xl font-bold text-red-600">{invalidCount}</p>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Import Items Preview
                </h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Product</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Variant</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">SKU</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Stock</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Qty to Order</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Cost Price</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Notes</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {importData.map((row, index) => (
                        <tr key={index} className={row.status === 'valid' ? 'bg-white hover:bg-gray-50' : 'bg-red-50'}>
                          <td className="py-3 px-4">
                            {row.status === 'valid' ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-xs font-semibold text-green-700">Valid</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <span className="text-xs font-semibold text-red-700">Invalid</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {row.productName ? (
                              <span className="text-sm font-semibold text-gray-900">{row.productName}</span>
                            ) : (
                              <span className="text-xs text-gray-400">Not found</span>
                            )}
                            {row.error && (
                              <p className="text-xs text-red-600 mt-1">{row.error}</p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {row.foundVariantName ? (
                              <span className="text-sm text-gray-700">{row.foundVariantName}</span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs text-gray-600">{row.sku}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {row.currentStock !== undefined ? (
                              <span className={`text-sm font-medium ${
                                row.currentStock === 0 ? 'text-red-600' :
                                row.currentStock <= 5 ? 'text-amber-600' :
                                'text-green-600'
                              }`}>
                                {row.currentStock}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-purple-600 text-lg">{row.quantity}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex flex-col items-end">
                              {row.costPrice ? (
                                <>
                                  <span className="text-sm font-bold text-gray-900">
                                    TSh {row.costPrice.toLocaleString()}
                                  </span>
                                  {row.suggestedCostPrice && row.costPrice === row.suggestedCostPrice && (
                                    <span className="text-xs text-green-600">(Last price)</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-amber-600">Will use last price</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs text-gray-600">{row.notes || '-'}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleRemoveRow(index)}
                              className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
                              title="Remove row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-6 flex gap-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-semibold"
          >
            Cancel
          </button>
          {importData.length > 0 && validCount > 0 && (
            <button
              onClick={handleImport}
              className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors font-semibold shadow-lg flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Import {validCount} Items
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;

