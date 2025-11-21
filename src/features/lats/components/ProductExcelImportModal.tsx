import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle, Package, FileText, Info, Shield, FileSpreadsheet } from 'lucide-react';
import { Product, ProductFormData } from '../types/inventory';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';

interface ProductExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (products: Product[]) => void;
}

interface ImportedVariant {
  // Variant identification
  variantSku?: string;
  variantName?: string;
  variantBarcode?: string;
  
  // Variant type and relationships
  variantType?: 'standard' | 'parent' | 'imei_child';
  isParent?: boolean;
  parentVariantSku?: string; // Reference to parent variant by SKU
  
  // Pricing and stock
  variantCostPrice?: number;
  variantSellingPrice?: number;
  variantQuantity?: number;
  variantMinQuantity?: number;
  
  // Variant attributes
  variantAttributes?: string; // JSON string
  imei?: string;
  serialNumber?: string;
  weight?: number;
  dimensions?: string; // JSON string or "LxWxH"
  
  // Status
  variantIsActive?: boolean;
}

interface ImportedProduct {
  // Product basic info
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  shortDescription?: string;
  
  // Relationships
  categoryId?: string;
  categoryName?: string;
  supplierId?: string;
  supplierName?: string;
  
  // Product details
  condition?: string;
  internalNotes?: string;
  price?: number;
  costPrice?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  
  // Additional fields
  debutDate?: string;
  debutNotes?: string;
  isActive?: boolean;
  
  // Metadata and attributes
  metadata?: Record<string, any>;
  attributes?: Record<string, any>;
  
  // Variants (can have multiple)
  variants?: ImportedVariant[];
}

interface ImportResult {
  success: boolean;
  product?: Product;
  error?: string;
  rowNumber: number;
  wasUpdated?: boolean;
}

const ProductExcelImportModal: React.FC<ProductExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<ImportedProduct[]>([]);
  const [previewData, setPreviewData] = useState<ImportedProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'import'>('upload');
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableData, setEditableData] = useState<ImportedProduct[]>([]);
  const [isCompactView, setIsCompactView] = useState(false);
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(new Set());
  const [updateExisting, setUpdateExisting] = useState(false);
  const [conflictResolution, setConflictResolution] = useState<'migrate' | 'skip' | 'delete'>('migrate');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to format product name
  const formatProductName = (name: string): string => {
    if (!name) return '';
    
    // Capitalize first letter of each word
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  };

  // Function to format SKU
  const formatSKU = (sku: string): string => {
    if (!sku) return '';
    
    // Remove spaces and convert to uppercase
    return sku.replace(/\s+/g, '').toUpperCase();
  };

  // Function to format condition
  const formatCondition = (condition: string): string => {
    if (!condition) return 'new';
    
    const lowerCondition = condition.toLowerCase().trim();
    
    const conditionMap: { [key: string]: string } = {
      'new': 'new',
      'used': 'used',
      'refurbished': 'refurbished',
      'refurb': 'refurbished',
      'like-new': 'new',
      'good': 'used',
      'excellent': 'new',
      'fair': 'used',
      'poor': 'used',
      'damaged': 'used',
      'broken': 'used'
    };
    
    return conditionMap[lowerCondition] || 'new';
  };

  // Function to validate product data with variants
  const validateProductData = (product: ImportedProduct, rowNumber: number): string[] => {
    const errors: string[] = [];
    
    if (!product.name || product.name.trim().length < 2) {
      errors.push(`Product name must be at least 2 characters long`);
    }
    
    // SKU validation removed - SKUs are always auto-generated, so no need to validate
    // The SKU will be auto-generated during import if not present
    
    // Validate variants if present
    if (product.variants && product.variants.length > 0) {
      // Collect all variant SKUs and check for parent variants
      const variantSkus = new Set(product.variants.map(v => v.variantSku).filter(Boolean));
      const hasParentVariant = product.variants.some(v => 
        v.isParent || v.variantType === 'parent' || v.variantSku === product.sku
      );
      
      product.variants.forEach((variant, idx) => {
        if (variant.variantType === 'imei_child' && variant.imei) {
          // Validate IMEI format (15 digits)
          if (!/^\d{15}$/.test(variant.imei)) {
            errors.push(`Variant ${idx + 1}: IMEI must be exactly 15 digits`);
          }
        }
        
        // Validate parent variant SKU - check multiple scenarios
        if (variant.parentVariantSku) {
          const parentExists = 
            // Check if parent SKU matches a variant SKU in the same product
            variantSkus.has(variant.parentVariantSku) ||
            // Check if parent SKU matches the product SKU (parent variant will be created)
            variant.parentVariantSku === product.sku ||
            // Check if there's a parent variant in the array (by type or flag)
            hasParentVariant ||
            // Check if any variant with matching SKU is marked as parent
            product.variants?.some(v => 
              (v.variantSku === variant.parentVariantSku && (v.isParent || v.variantType === 'parent'))
            );
          
          if (!parentExists) {
            // Only warn if we can't find it - it might be created during import
            // Check if it looks like it might be a product SKU (which would become a parent)
            const looksLikeProductSku = variant.parentVariantSku.startsWith(product.sku) || 
                                        variant.parentVariantSku === product.sku;
            if (!looksLikeProductSku) {
              errors.push(`Variant ${idx + 1}: Parent variant SKU "${variant.parentVariantSku}" not found in product variants`);
            }
          }
        }
        
        if (variant.variantSellingPrice !== undefined && variant.variantSellingPrice < 0) {
          errors.push(`Variant ${idx + 1}: Selling price cannot be negative`);
        }
        
        if (variant.variantCostPrice !== undefined && variant.variantCostPrice < 0) {
          errors.push(`Variant ${idx + 1}: Cost price cannot be negative`);
        }
        
        if (variant.variantQuantity !== undefined && variant.variantQuantity < 0) {
          errors.push(`Variant ${idx + 1}: Quantity cannot be negative`);
        }
      });
    }
    
    if (product.price !== undefined && product.price < 0) {
      errors.push(`Price cannot be negative`);
    }
    
    if (product.costPrice !== undefined && product.costPrice < 0) {
      errors.push(`Cost price cannot be negative`);
    }
    
    return errors;
  };

  // Function to handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processExcelFile(selectedFile);
    }
  };

  // Function to process Excel file with variant support
  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    setValidationErrors([]);
    
    try {
      // Import xlsx and SKU generator dynamically to avoid bundle size issues
      const XLSX = await import('xlsx');
      const { generateSKU } = await import('../lib/skuUtils');
      
      // Read the Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Get the first worksheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: ''
      });
      
      if (jsonData.length < 2) {
        throw new Error('Excel file must contain at least a header row and one data row');
      }
      
      // Get headers (first row) and normalize them
      const headers = (jsonData[0] as string[]).map(h => (h || '').toLowerCase().trim());
      
      // Find column indices - improved matching for exported files
      const getColumnIndex = (possibleNames: string[]): number => {
        for (const name of possibleNames) {
          const nameLower = name.toLowerCase();
          // Try exact match first
          let index = headers.findIndex(h => h === nameLower);
          if (index >= 0) return index;
          // Try includes match
          index = headers.findIndex(h => h.includes(nameLower));
          if (index >= 0) return index;
          // Try reverse includes (header includes name)
          index = headers.findIndex(h => nameLower.includes(h));
          if (index >= 0) return index;
        }
        return -1;
      };
      
      // Product fields - updated to match export headers exactly
      const nameIdx = getColumnIndex(['product name', 'name', 'product']);
      const skuIdx = getColumnIndex(['product sku', 'sku', 'product_sku']);
      const descIdx = getColumnIndex(['description', 'desc']);
      const shortDescIdx = getColumnIndex(['short description', 'short_description', 'short desc']);
      const barcodeIdx = getColumnIndex(['barcode', 'product code', 'product_code', 'code']);
      const categoryIdx = getColumnIndex(['category name', 'category', 'category_id', 'category id']);
      const categoryIdIdx = getColumnIndex(['category id', 'category_id']);
      const supplierIdx = getColumnIndex(['supplier name', 'supplier', 'supplier_id', 'supplier id']);
      const conditionIdx = getColumnIndex(['condition']);
      const priceIdx = getColumnIndex(['price', 'selling price', 'unit price', 'sale price']);
      const costIdx = getColumnIndex(['cost', 'cost price']);
      const stockQtyIdx = getColumnIndex(['stock quantity', 'stock_quantity', 'quantity', 'total stock']);
      const minStockIdx = getColumnIndex(['min stock level', 'min_stock_level', 'min stock', 'min_stock']);
      const maxStockIdx = getColumnIndex(['max stock level', 'max_stock_level', 'max stock', 'max_stock']);
      const reorderQtyIdx = getColumnIndex(['reorder qty', 'reorder_quantity', 'reorder quantity', 'reorder qty']);
      const taxRateIdx = getColumnIndex(['tax rate', 'tax_rate', 'tax', 'vat rate', 'vat_rate']);
      const brandIdx = getColumnIndex(['brand']);
      const modelIdx = getColumnIndex(['model']);
      const specIdx = getColumnIndex(['specification', 'spec', 'specs']);
      const internalNotesIdx = getColumnIndex(['internal notes', 'internal_notes', 'notes', 'internal note']);
      const statusIdx = getColumnIndex(['status', 'is active', 'is_active', 'active']);
      const totalValueIdx = getColumnIndex(['total value', 'total_value', 'value']);
      
      // Variant fields
      const variantSkuIdx = getColumnIndex(['variant sku', 'variant_sku']);
      const variantNameIdx = getColumnIndex(['variant name', 'variant_name']);
      const variantBarcodeIdx = getColumnIndex(['variant barcode', 'variant_barcode']);
      const variantTypeIdx = getColumnIndex(['variant type', 'variant_type', 'type']);
      const isParentIdx = getColumnIndex(['is parent', 'is_parent', 'parent']);
      const parentSkuIdx = getColumnIndex(['parent sku', 'parent_sku', 'parent variant sku', 'parent variant sku']);
      const variantPriceIdx = getColumnIndex(['variant price', 'variant selling price', 'variant_selling_price']);
      const variantCostIdx = getColumnIndex(['variant cost', 'variant cost price', 'variant_cost_price']);
      const variantQtyIdx = getColumnIndex(['variant quantity', 'variant_quantity', 'variant stock', 'variant_stock']);
      const variantMinQtyIdx = getColumnIndex(['variant min quantity', 'variant_min_quantity', 'variant min stock']);
      const variantWeightIdx = getColumnIndex(['variant weight', 'variant_weight', 'weight']);
      const variantDimensionsIdx = getColumnIndex(['variant dimensions', 'variant_dimensions', 'dimensions']);
      const variantIsActiveIdx = getColumnIndex(['variant is active', 'variant_is_active', 'variant active']);
      const imeiIdx = getColumnIndex(['imei']);
      const serialIdx = getColumnIndex(['serial', 'serial number', 'serial_number']);
      
      // Process data rows - group by product SKU
      const productMap = new Map<string, ImportedProduct>();
      const errors: string[] = [];
      
      // Debug: Log found column indices
      console.log('🔍 Column indices found:', {
        name: nameIdx,
        sku: skuIdx,
        category: categoryIdx,
        categoryId: categoryIdIdx,
        supplier: supplierIdx,
        price: priceIdx,
        cost: costIdx,
        stock: stockQtyIdx,
        minStock: minStockIdx,
        variantPrice: variantPriceIdx,
        variantCost: variantCostIdx,
        variantQty: variantQtyIdx
      });
      console.log('📋 Headers:', headers);
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length === 0) continue;
        
        try {
          const productName = (row[nameIdx] || '').toString().trim();
          
          if (!productName) {
            errors.push(`Row ${i + 1}: Product name is required`);
            continue;
          }
          
          // Get or create product (group by name since SKU will be auto-generated)
          const productKey = productName;
          let product = productMap.get(productKey);
          
          if (!product) {
            // Get category - try both ID and Name columns
            const categoryName = categoryIdx >= 0 ? (row[categoryIdx] || '').toString().trim() : '';
            const categoryId = categoryIdIdx >= 0 ? (row[categoryIdIdx] || '').toString().trim() : '';
            
            // ✅ Always auto-generate unique SKU for product (ignore SKU from Excel)
            const autoProductSku = generateSKU();
            
            // Parse status/isActive
            let isActive = true;
            if (statusIdx >= 0) {
              const statusValue = (row[statusIdx] || '').toString().trim().toLowerCase();
              isActive = statusValue === 'active' || statusValue === 'true' || statusValue === '1' || statusValue === 'yes' || statusValue === '';
            }
            
            // Build metadata object for additional fields
            const metadata: Record<string, any> = {};
            if (taxRateIdx >= 0 && row[taxRateIdx]) {
              metadata.taxRate = parseFloat(row[taxRateIdx]) || 0;
            }
            if (reorderQtyIdx >= 0 && row[reorderQtyIdx]) {
              metadata.reorderQuantity = parseInt(row[reorderQtyIdx]) || 0;
            }
            if (totalValueIdx >= 0 && row[totalValueIdx]) {
              metadata.totalValue = parseFloat(row[totalValueIdx]) || 0;
            }
            
            // Build attributes object
            const attributes: Record<string, any> = {};
            if (brandIdx >= 0 && row[brandIdx]) {
              attributes.brand = (row[brandIdx] || '').toString().trim();
            }
            if (modelIdx >= 0 && row[modelIdx]) {
              attributes.model = (row[modelIdx] || '').toString().trim();
            }
            if (specIdx >= 0 && row[specIdx]) {
              attributes.specification = (row[specIdx] || '').toString().trim();
            }
            
            // Helper function to parse price (handles commas, currency symbols, etc.)
            const parsePrice = (value: any): number => {
              if (!value) return 0;
              const str = value.toString().trim();
              // Remove currency symbols, commas, and spaces
              const cleaned = str.replace(/[TSh\s,]/gi, '').replace(/[^\d.-]/g, '');
              const parsed = parseFloat(cleaned);
              return isNaN(parsed) ? 0 : parsed;
            };
            
            const productPrice = priceIdx >= 0 ? parsePrice(row[priceIdx]) : 0;
            const productCost = costIdx >= 0 ? parsePrice(row[costIdx]) : 0;
            const productStock = stockQtyIdx >= 0 ? parseInt((row[stockQtyIdx] || '').toString().replace(/[^\d]/g, '')) || 0 : 0;
            
            // Debug logging for price parsing
            if (priceIdx >= 0 && row[priceIdx]) {
              console.log(`💰 [Import] Product "${productName}" - Raw price: "${row[priceIdx]}", Parsed: ${productPrice}`);
            }
            if (costIdx >= 0 && row[costIdx]) {
              console.log(`💰 [Import] Product "${productName}" - Raw cost: "${row[costIdx]}", Parsed: ${productCost}`);
            }
            
            product = {
              name: productName,
              sku: autoProductSku, // Always auto-generated, never from Excel
              description: (row[descIdx] || '').toString().trim(),
              shortDescription: shortDescIdx >= 0 ? (row[shortDescIdx] || '').toString().trim() : undefined,
              barcode: barcodeIdx >= 0 ? (row[barcodeIdx] || '').toString().trim() : undefined,
              categoryId: categoryId || undefined,
              categoryName: categoryName || undefined,
              supplierName: (row[supplierIdx] || '').toString().trim(),
              condition: formatCondition((row[conditionIdx] || 'new').toString().trim()),
              price: productPrice,
              costPrice: productCost,
              stockQuantity: productStock,
              minStockLevel: parseInt((row[minStockIdx] || '5').toString().replace(/[^\d]/g, '')) || 5,
              internalNotes: internalNotesIdx >= 0 ? (row[internalNotesIdx] || '').toString().trim() : undefined,
              isActive: isActive,
              variants: [],
              // Additional fields stored in metadata/attributes
              maxStockLevel: maxStockIdx >= 0 ? (parseInt((row[maxStockIdx] || '').toString().replace(/[^\d]/g, '')) || undefined) : undefined,
              metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
              attributes: Object.keys(attributes).length > 0 ? attributes : undefined
            };
            productMap.set(productKey, product);
          }
          
          // Add variant if variant fields are present
          const variantSku = (row[variantSkuIdx] || '').toString().trim();
          const variantName = (row[variantNameIdx] || '').toString().trim();
          const variantBarcode = (row[variantBarcodeIdx] || '').toString().trim();
          // Always default to 'parent' variant type
          const variantType = 'parent';
          const imei = (row[imeiIdx] || '').toString().trim();
          const serialNumber = (row[serialIdx] || '').toString().trim();
          const variantWeight = row[variantWeightIdx] ? parseFloat(row[variantWeightIdx]) : undefined;
          const variantDimensions = (row[variantDimensionsIdx] || '').toString().trim();
          const variantIsActive = row[variantIsActiveIdx] !== undefined 
            ? (row[variantIsActiveIdx] === true || row[variantIsActiveIdx] === 'true' || row[variantIsActiveIdx] === 'TRUE' || row[variantIsActiveIdx] === 'Yes' || row[variantIsActiveIdx] === 'yes' || row[variantIsActiveIdx] === 1)
            : true; // Default to active
          
          if (variantSku || variantName || imei || serialNumber || variantBarcode) {
            // ✅ Always auto-generate variant SKU for uniqueness
            const autoVariantSku = generateSKU();
            
            // Helper function to parse price (handles commas, currency symbols, etc.)
            const parsePrice = (value: any, fallback: number = 0): number => {
              if (!value && fallback > 0) return fallback;
              if (!value) return 0;
              const str = value.toString().trim();
              // Remove currency symbols, commas, and spaces
              const cleaned = str.replace(/[TSh\s,]/gi, '').replace(/[^\d.-]/g, '');
              const parsed = parseFloat(cleaned);
              return isNaN(parsed) ? fallback : parsed;
            };
            
            const variantCost = variantCostIdx >= 0 ? parsePrice(row[variantCostIdx], product.costPrice) : product.costPrice;
            const variantPrice = variantPriceIdx >= 0 ? parsePrice(row[variantPriceIdx], product.price) : product.price;
            const variantQty = variantQtyIdx >= 0 ? parseInt((row[variantQtyIdx] || '').toString().replace(/[^\d]/g, '')) || 0 : 0;
            
            const variant: ImportedVariant = {
              variantSku: autoVariantSku,
              variantName: variantName || undefined,
              variantBarcode: variantBarcode || undefined,
              variantType: 'parent', // Always set to 'parent'
              isParent: true, // Always true since all variants are parent
              parentVariantSku: undefined, // No parent since all variants are parent type
              variantCostPrice: variantCost,
              variantSellingPrice: variantPrice,
              variantQuantity: variantQty,
              variantMinQuantity: parseInt((row[variantMinQtyIdx] || '5').toString().replace(/[^\d]/g, '')) || 5,
              variantIsActive: variantIsActive,
              weight: variantWeight,
              dimensions: variantDimensions || undefined
            };
            
            // Add IMEI to variant attributes if present
            if (imei || serialNumber) {
              variant.imei = imei;
              variant.serialNumber = serialNumber;
              variant.variantAttributes = JSON.stringify({
                imei: imei || null,
                serial_number: serialNumber || null
              });
            }
            
            if (!product.variants) product.variants = [];
            product.variants.push(variant);
          }
          
        } catch (error: any) {
          errors.push(`Row ${i + 1}: ${error.message || 'Unknown error'}`);
        }
      }
      
      const products = Array.from(productMap.values());
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        toast.error(`Found ${errors.length} validation errors. Please review and fix them.`);
      }
      
      if (products.length > 0) {
        setPreviewData(products);
        setCurrentStep('preview');
        toast.success(`Successfully parsed ${products.length} products with variants from Excel file`);
      } else {
        toast.error('No valid products found in the Excel file');
      }
      
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast.error(`Failed to process Excel file: ${error.message}`);
      setValidationErrors([error.message]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to handle import with variant support
  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    setCurrentStep('import');
    
    const results: ImportResult[] = [];
    const totalProducts = previewData.length;
    const { createProduct } = await import('../../../lib/latsProductApi');
    
    // Get user with better error handling and session refresh
    let user;
    try {
      // First try to get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        // Try to refresh session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          toast.error('Session expired. Please log in again to import products');
          setIsImporting(false);
          return;
        }
      }
      
      // Get user after ensuring session is valid
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User error:', userError);
        toast.error('Authentication error. Please log in again to import products');
        setIsImporting(false);
        return;
      }
      
      if (!currentUser) {
        toast.error('You must be logged in to import products. Please refresh the page and try again.');
        setIsImporting(false);
        return;
      }
      
      user = currentUser;
    } catch (error: any) {
      console.error('Auth check error:', error);
      toast.error('Authentication failed. Please log in again to import products');
      setIsImporting(false);
      return;
    }
    
    for (let i = 0; i < totalProducts; i++) {
      const product = previewData[i];
      const errors = validateProductData(product, i + 1);
      
      if (errors.length > 0) {
        results.push({
          success: false,
          error: errors.join(', '),
          rowNumber: i + 1
        });
        setImportProgress(((i + 1) / totalProducts) * 100);
        continue;
      }
      
      try {
        // Get current branch for isolation
        const currentBranchId = localStorage.getItem('current_branch_id');
        
        // ✅ Always auto-generate SKU (ignore any SKU from Excel to prevent conflicts)
        // IMPORTANT: We completely ignore product.sku and always generate a new one
        console.log(`🔄 [Import] Processing product "${product.name}" - Original SKU from Excel: "${product.sku || 'N/A'}" (will be ignored)`);
        
        const { generateSKU } = await import('../lib/skuUtils');
        let finalSku = generateSKU();
        let skuExists = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        // Ensure SKU is unique by checking database
        while (attempts < maxAttempts) {
          const { data: existingBySku, error: checkError } = await supabase
            .from('lats_products')
            .select('id')
            .eq('sku', finalSku)
            .maybeSingle();
          
          if (checkError && checkError.code !== 'PGRST116') {
            // Error other than "not found" - log it but continue
            console.warn(`⚠️ [Import] Error checking SKU uniqueness:`, checkError);
          }
          
          if (!existingBySku) {
            // SKU is unique, use it
            console.log(`✅ [Import] Generated unique SKU for "${product.name}": "${finalSku}"`);
            break;
          }
          
          // SKU exists, generate a new one
          skuExists = true;
          console.log(`⚠️ [Import] SKU "${finalSku}" exists, generating new one...`);
          finalSku = generateSKU();
          attempts++;
        }
        
        // If we couldn't find a unique SKU after max attempts, use timestamp-based fallback
        if (attempts >= maxAttempts) {
          finalSku = `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          console.warn(`⚠️ [Import] Could not generate unique SKU after ${maxAttempts} attempts, using fallback: "${finalSku}"`);
        }
        
        console.log(`✅ [Import] Final SKU for "${product.name}": "${finalSku}" (original was "${product.sku || 'N/A'}")`);
        
        // ✅ Check if product exists by name (for migration/update)
        let existingProductId: string | null = null;
        let existingProductName: string | null = null;
        
        // Try exact match first
        const { data: exactMatch } = await supabase
          .from('lats_products')
          .select('id, name, sku')
          .eq('name', product.name.trim())
          .maybeSingle();
        
        if (exactMatch) {
          existingProductId = exactMatch.id;
          existingProductName = exactMatch.name;
        } else {
          // Try case-insensitive match
          const { data: caseInsensitiveMatch } = await supabase
            .from('lats_products')
            .select('id, name, sku')
            .ilike('name', product.name.trim())
            .maybeSingle();
          
          if (caseInsensitiveMatch) {
            existingProductId = caseInsensitiveMatch.id;
            existingProductName = caseInsensitiveMatch.name;
          }
        }
        
        // Handle conflict resolution
        if (existingProductId) {
          if (conflictResolution === 'delete') {
            // Delete existing product before creating new one
            const { error: deleteError } = await supabase
              .from('lats_products')
              .delete()
              .eq('id', existingProductId);
            
            if (deleteError) {
              throw new Error(`Failed to delete existing product: ${deleteError.message}`);
            }
            
            console.log(`🗑️ Deleted existing product: ${existingProductName} (ID: ${existingProductId})`);
            existingProductId = null; // Reset to create new product
          } else if (conflictResolution === 'skip') {
            // Skip this product
            results.push({
              success: false,
              error: `Product "${product.name}" already exists. Skipped.`,
              rowNumber: i + 1
            });
            setImportProgress(((i + 1) / totalProducts) * 100);
            continue;
          }
          // If 'migrate', we'll update the existing product below
        }
        
        // Get or find/create category ID
        let categoryId = product.categoryId;
        
        // If category ID is provided, verify it exists
        if (categoryId) {
          const { data: existingCategory } = await supabase
            .from('lats_categories')
            .select('id')
            .eq('id', categoryId)
            .maybeSingle();
          
          if (!existingCategory) {
            console.warn(`⚠️ Category ID "${categoryId}" not found, will try to use category name or create new one`);
            categoryId = null; // Reset to try name-based lookup
          }
        }
        
        // If no valid category ID, try to find or create by name
        if (!categoryId && product.categoryName) {
          const categoryName = product.categoryName.trim();
          
          // Try exact match first
          const { data: exactCategory } = await supabase
            .from('lats_categories')
            .select('id')
            .eq('name', categoryName)
            .maybeSingle();
          
          if (exactCategory) {
            categoryId = exactCategory.id;
          } else {
            // Try case-insensitive match
            const { data: category } = await supabase
              .from('lats_categories')
              .select('id')
              .ilike('name', categoryName)
              .maybeSingle();
            
            if (category) {
              categoryId = category.id;
            } else {
              // Auto-create category if it doesn't exist
              console.log(`📦 Auto-creating category: "${categoryName}"`);
              const { data: newCategory, error: createError } = await supabase
                .from('lats_categories')
                .insert({
                  name: categoryName,
                  description: `Auto-created during product import`,
                  branch_id: currentBranchId,
                  is_active: true
                })
                .select('id')
                .single();
              
              if (createError) {
                console.error('Error creating category:', createError);
                throw new Error(`Failed to create category "${categoryName}": ${createError.message}`);
              }
              
              if (newCategory) {
                categoryId = newCategory.id;
                console.log(`✅ Created category "${categoryName}" with ID: ${categoryId}`);
              }
            }
          }
        }
        
        // If still no category, use or create "Uncategorized"
        if (!categoryId) {
          console.log('📦 No category provided, using or creating "Uncategorized"');
          const { data: uncategorized } = await supabase
            .from('lats_categories')
            .select('id')
            .eq('name', 'Uncategorized')
            .maybeSingle();
          
          if (uncategorized) {
            categoryId = uncategorized.id;
          } else {
            const { data: newCategory, error: createError } = await supabase
              .from('lats_categories')
              .insert({
                name: 'Uncategorized',
                description: 'Default category for products without a category',
                branch_id: currentBranchId,
                is_active: true
              })
              .select('id')
              .single();
            
            if (createError) {
              throw new Error(`Failed to create default category: ${createError.message}`);
            }
            
            if (newCategory) {
              categoryId = newCategory.id;
            }
          }
        }
        
        // Get or find/create supplier ID (optional - supplier can be null)
        let supplierId = product.supplierId;
        if (!supplierId && product.supplierName) {
          const supplierName = product.supplierName.trim();
          
          // Try to find existing supplier
          const { data: supplier } = await supabase
            .from('lats_suppliers')
            .select('id')
            .ilike('name', supplierName)
            .maybeSingle();
          
          if (supplier) {
            supplierId = supplier.id;
          } else {
            // Auto-create supplier if it doesn't exist
            console.log(`🏢 Auto-creating supplier: "${supplierName}"`);
            const { data: newSupplier, error: createError } = await supabase
              .from('lats_suppliers')
              .insert({
                name: supplierName,
                description: `Auto-created during product import`,
                branch_id: currentBranchId,
                is_active: true,
                is_shared: true
              })
              .select('id')
              .single();
            
            if (createError) {
              console.warn('⚠️ Failed to create supplier, continuing without supplier:', createError.message);
              // Don't throw error - supplier is optional
              supplierId = null;
            } else if (newSupplier) {
              supplierId = newSupplier.id;
              console.log(`✅ Created supplier "${supplierName}" with ID: ${supplierId}`);
            }
          }
        }
        
        // Prepare variants for import
        const variantsToCreate: any[] = [];
        const variantSkuMap = new Map<string, string>(); // Maps variant SKU to variant ID
        
        if (product.variants && product.variants.length > 0) {
          // Collect all parent variant SKUs that are referenced by children
          const referencedParentSkus = new Set<string>();
          product.variants.forEach(v => {
            if (v.parentVariantSku) {
              referencedParentSkus.add(v.parentVariantSku);
            }
          });
          
          // First pass: Create parent variants
          // ✅ IMPORTANT: Parent variants can have stock in their own quantity field
          // - IMEI parent variants: Stock will be calculated from IMEI children later
          // - Regular parent variants: Stock is stored directly in quantity field
          // Both are valid - the display logic handles both cases correctly
          for (const variant of product.variants) {
            if (variant.variantType === 'parent' || variant.isParent) {
              const parentSku = variant.variantSku || product.sku;
              variantsToCreate.push({
                sku: parentSku,
                name: variant.variantName || 'Parent Variant',
                sellingPrice: variant.variantSellingPrice || product.price || 0,
                costPrice: variant.variantCostPrice || product.costPrice || 0,
                quantity: variant.variantQuantity || 0, // ✅ Preserve parent variant's own stock
                minQuantity: variant.variantMinQuantity || 5,
                attributes: variant.variantAttributes ? JSON.parse(variant.variantAttributes) : {},
                isParent: true,
                variantType: 'parent'
              });
              variantSkuMap.set(parentSku, 'pending'); // Will be updated after creation
            }
          }
          
          // Create missing parent variants if children reference them
          for (const parentSku of referencedParentSkus) {
            if (!variantSkuMap.has(parentSku)) {
              // Check if parent SKU matches product SKU or needs to be created
              const isProductSku = parentSku === product.sku;
              const parentExists = product.variants.some(v => 
                v.variantSku === parentSku && (v.isParent || v.variantType === 'parent')
              );
              
              if (!parentExists && (isProductSku || parentSku.startsWith(product.sku))) {
                // Auto-create parent variant
                variantsToCreate.push({
                  sku: parentSku,
                  name: 'Parent Variant',
                  sellingPrice: product.price || 0,
                  costPrice: product.costPrice || 0,
                  quantity: 0,
                  minQuantity: 5,
                  attributes: {},
                  isParent: true,
                  variantType: 'parent'
                });
                variantSkuMap.set(parentSku, 'pending');
              }
            }
          }
          
          // Second pass: Create standard and child variants
          for (const variant of product.variants) {
            if (variant.variantType !== 'parent' && !variant.isParent) {
              let parentVariantId: string | undefined;
              
              // Find parent variant if parent SKU is specified
              if (variant.parentVariantSku) {
                parentVariantId = variantSkuMap.get(variant.parentVariantSku);
                // If parent SKU matches product SKU, use the first parent variant created
                if (!parentVariantId && variant.parentVariantSku === product.sku) {
                  const parentVariant = variantsToCreate.find(v => v.isParent && v.sku === product.sku);
                  if (parentVariant) {
                    parentVariantId = variantSkuMap.get(product.sku);
                  }
                }
              }
              
              const variantAttrs: any = variant.variantAttributes ? JSON.parse(variant.variantAttributes) : {};
              if (variant.imei) variantAttrs.imei = variant.imei;
              if (variant.serialNumber) variantAttrs.serial_number = variant.serialNumber;
              
              variantsToCreate.push({
                sku: variant.variantSku || `${product.sku}-CHILD-${variantsToCreate.length + 1}`,
                name: variant.variantName || (variant.imei ? `IMEI: ${variant.imei}` : 'Child Variant'),
                sellingPrice: variant.variantSellingPrice || product.price || 0,
                costPrice: variant.variantCostPrice || product.costPrice || 0,
                quantity: variant.variantQuantity || 0,
                minQuantity: variant.variantMinQuantity || 5,
                attributes: variantAttrs,
                variantType: variant.variantType || 'standard',
                parentVariantId: parentVariantId
              });
            }
          }
        }
        
        // Prepare product data (use final SKU - always auto-generated, never from Excel)
        console.log(`📦 [Import] Creating product "${product.name}" with SKU: "${finalSku}"`);
        let productData: any = {
          name: product.name,
          sku: finalSku, // Always auto-generated, never from Excel
          description: product.description,
          shortDescription: product.shortDescription,
          categoryId: categoryId,
          supplierId: supplierId,
          barcode: product.barcode,
          costPrice: product.costPrice || 0,
          sellingPrice: product.price || 0,
          quantity: product.stockQuantity || 0,
          minQuantity: product.minStockLevel || 5,
          isActive: product.isActive !== false,
          variants: variantsToCreate.length > 0 ? variantsToCreate : undefined
        };
        
        // Add additional fields if present
        if (product.maxStockLevel !== undefined) {
          productData.maxStockLevel = product.maxStockLevel;
        }
        if (product.internalNotes) {
          productData.internalNotes = product.internalNotes;
        }
        if (product.metadata && Object.keys(product.metadata).length > 0) {
          productData.metadata = product.metadata;
        }
        if (product.attributes && Object.keys(product.attributes).length > 0) {
          productData.attributes = product.attributes;
        }
        
        // ✅ Update existing product or create new one
        let importedProduct: any = null;
        const wasUpdated = existingProductId !== null && conflictResolution === 'migrate';
        
        try {
          if (wasUpdated) {
            // Update existing product (migrate)
            const { updateProduct } = await import('../../../lib/latsProductApi');
            importedProduct = await updateProduct(existingProductId!, productData, user.id);
            console.log(`✅ Migrated/Updated existing product: ${product.name} (ID: ${existingProductId})`);
          } else {
            // Create new product
            importedProduct = await createProduct(productData, user.id);
            if (skuExists) {
              console.log(`✅ Created new product with auto-generated SKU: ${product.name} (SKU: ${finalSku})`);
            } else {
              console.log(`✅ Created new product: ${product.name}`);
            }
          }
        } catch (createError: any) {
          // Handle duplicate SKU error during creation (shouldn't happen, but handle gracefully)
          if (createError.code === '23505' || createError.message?.includes('duplicate key') || 
              (createError.message?.includes('SKU') && createError.message?.includes('already exists'))) {
            console.warn('⚠️ SKU conflict during creation, generating new SKU and retrying:', createError);
            
            // Generate a new unique SKU and retry
            const { generateSKU } = await import('../lib/skuUtils');
            let retrySku = generateSKU();
            let retryAttempts = 0;
            let uniqueSkuFound = false;
            
            while (retryAttempts < 10 && !uniqueSkuFound) {
              const { data: checkSku } = await supabase
                .from('lats_products')
                .select('id')
                .eq('sku', retrySku)
                .maybeSingle();
              
              if (!checkSku) {
                uniqueSkuFound = true;
                // Update productData with new SKU and retry
                productData.sku = retrySku;
                importedProduct = await createProduct(productData, user.id);
                console.log(`✅ Resolved SKU conflict by using new SKU: "${retrySku}"`);
              } else {
                retryAttempts++;
                retrySku = generateSKU();
              }
            }
            
            if (!uniqueSkuFound) {
              throw new Error(`Could not generate unique SKU after multiple attempts. Please try again.`);
            }
          } else {
            // Re-throw if it's not a SKU conflict error
            throw createError;
          }
        }
        
        // If we have parent-child relationships, update them now
        if (product.variants && product.variants.length > 0) {
          // Fetch created variants to get their IDs
          const { data: createdVariants } = await supabase
            .from('lats_product_variants')
            .select('id, sku, variant_type, is_parent')
            .eq('product_id', importedProduct.id);
          
          if (createdVariants) {
            // Build SKU to ID map
            createdVariants.forEach(v => {
              variantSkuMap.set(v.sku, v.id);
            });
            
            // Update parent-child relationships
            for (const variant of product.variants) {
              if (variant.parentVariantSku && variant.variantSku) {
                // Try to find parent by SKU
                let parentId = variantSkuMap.get(variant.parentVariantSku);
                
                // If parent SKU matches product SKU, find the parent variant
                if (!parentId && variant.parentVariantSku === product.sku) {
                  const parentVariant = createdVariants.find(v => 
                    (v.is_parent || v.variant_type === 'parent') && 
                    (v.sku === product.sku || v.sku.startsWith(product.sku))
                  );
                  if (parentVariant) {
                    parentId = parentVariant.id;
                  }
                }
                
                // Find child variant by SKU
                const childId = variantSkuMap.get(variant.variantSku);
                
                if (parentId && childId) {
                  await supabase
                    .from('lats_product_variants')
                    .update({ parent_variant_id: parentId })
                    .eq('id', childId);
                } else if (variant.parentVariantSku && !parentId) {
                  console.warn(`Parent variant SKU "${variant.parentVariantSku}" not found for child "${variant.variantSku}"`);
                }
              }
            }
          }
        }
        
        results.push({
          success: true,
          product: importedProduct as any,
          rowNumber: i + 1,
          wasUpdated: wasUpdated
        });
        
      } catch (error: any) {
        // Handle any remaining errors (SKU conflicts should be handled above)
        let errorMessage = error.message || 'Failed to import product';
        
        // Format error message for better user experience
        if (error.code === '23505') {
          if (error.message?.includes('sku')) {
            errorMessage = `SKU conflict: The system attempted to auto-generate a unique SKU but encountered an issue. Please try again.`;
          } else {
            errorMessage = `Database constraint error: ${error.message}`;
          }
        }
        
        results.push({
          success: false,
          error: errorMessage,
          rowNumber: i + 1
        });
      }
      
      setImportProgress(((i + 1) / totalProducts) * 100);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setImportResults(results);
    setIsImporting(false);
    
    const successfulImports = results.filter(r => r.success);
    if (successfulImports.length > 0) {
      const importedProducts = successfulImports.map(r => r.product!).filter(Boolean);
      onImportComplete(importedProducts);
      const migratedCount = results.filter(r => r.success && r.wasUpdated).length;
      const createdCount = successfulImports.length - migratedCount;
      let message = `Successfully imported ${successfulImports.length} product${successfulImports.length !== 1 ? 's' : ''}`;
      if (migratedCount > 0 && createdCount > 0) {
        message += ` (${migratedCount} updated, ${createdCount} created)`;
      } else if (migratedCount > 0) {
        message += ` (${migratedCount} updated)`;
      }
      message += ' with variants';
      toast.success(message);
    } else {
      toast.error('No products were imported successfully');
    }
  };

  // Function to handle close
  const handleClose = () => {
    setFile(null);
    setImportedData([]);
    setPreviewData([]);
    setEditableData([]);
    setCurrentStep('upload');
    setImportProgress(0);
    setImportResults([]);
    setValidationErrors([]);
    setIsProcessing(false);
    setIsImporting(false);
    setIsEditMode(false);
    setIsCompactView(false);
    setExpandedVariants(new Set());
    setUpdateExisting(false);
    setConflictResolution('migrate');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    onClose();
  };

  // Function to download comprehensive template with variants
  const downloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Template data with essential fields only (auto-generated fields removed)
      const headers = [
        // Product fields (required)
        'Product Name', 'Category Name', 'Supplier Name',
        'Price', 'Cost Price',
        'Stock Quantity', 'Min Stock Level',
        'Specification',
        // Variant fields (if product has variants)
        'Variant Name',
        'Variant Quantity', 'Variant Min Quantity'
      ];
      
      // Example rows (all SKUs will be auto-generated)
      const exampleRows = [
        // Product with single parent variant (iPhone 14 Pro - 128GB)
        [
          'iPhone 14 Pro', 'Smartphones', 'Apple Supplier',
          '1200000', '1000000',
          '50', '10',
          '128GB Storage, 6.1" Display',
          '128GB Storage',
          '50', '10'
        ],
        // Product with TWO parent variants (iPhone 12 - 128GB)
        [
          'iPhone 12', 'Smartphones', 'Apple Supplier',
          '1000000', '800000',
          '30', '5',
          '128GB Storage',
          '128GB Storage',
          '30', '5'
        ],
        // Product with TWO parent variants (iPhone 12 - 256GB)
        [
          'iPhone 12', 'Smartphones', '',
          '1000000', '800000',
          '25', '5',
          '256GB Storage',
          '256GB Storage',
          '25', '5'
        ],
        // Standard product without variants
        [
          'USB Cable', 'Accessories', 'Cable Supplier',
          '5000', '3000',
          '100', '20',
          '1 meter length',
          '',
          '', ''
        ]
      ];
      
      const wsData = [headers, ...exampleRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths (essential fields only)
      ws['!cols'] = [
        { wch: 20 }, { wch: 18 }, { wch: 18 }, // Product Name, Category Name, Supplier Name
        { wch: 12 }, { wch: 12 }, // Price, Cost Price
        { wch: 12 }, { wch: 12 }, // Stock Qty, Min Stock
        { wch: 25 }, // Specification
        { wch: 20 }, // Variant Name
        { wch: 15 }, { wch: 15 } // Variant Quantity, Variant Min Quantity
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      
      // Write file
      XLSX.writeFile(wb, 'product_import_template_with_variants.xlsx');
      toast.success('Template downloaded successfully!');
      
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template file');
    }
  };

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

  if (!isOpen) return null;

  const successfulCount = importResults.filter(r => r.success).length;
  const failedCount = importResults.filter(r => !r.success).length;
  const totalCount = importResults.length;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <FileSpreadsheet className="w-8 h-8 text-white" />
            </div>
            
            {/* Text and Progress */}
            <div>
              <h3 id="import-modal-title" className="text-2xl font-bold text-gray-900 mb-3">Import Products from Excel</h3>
              
              {/* Progress Indicator */}
              {currentStep === 'import' && (
                <div className="flex items-center gap-4">
                  {successfulCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-bold text-green-700">{successfulCount} Success</span>
                    </div>
                  )}
                  {failedCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-bold text-red-700">{failedCount} Failed</span>
                    </div>
                  )}
                  {isImporting && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-bold text-blue-700">{Math.round(importProgress)}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Scrollable Content Section */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          {currentStep === 'upload' && (
            <div className="py-6 space-y-6">
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Excel File</h3>
                  <p className="text-gray-600 mb-6">
                    Upload an Excel file (.xlsx, .xls) or CSV file with product data including variants
                  </p>
                  
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                      <Upload className="w-5 h-5" />
                      {isProcessing ? 'Processing...' : 'Choose File'}
                    </button>
                    
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
                    >
                      <Download className="w-5 h-5" />
                      Download Template
                    </button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-3">Import Guidelines</h4>
                      <ul className="text-sm text-blue-800 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span><strong>Required fields:</strong> Product Name, Category Name, Price, Cost Price, Stock Quantity, Min Stock Level</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span><strong>Optional fields:</strong> Supplier Name (will be auto-created if provided), Description, Condition (defaults to "new")</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span><strong>Auto-generated:</strong> All SKUs (Product SKU and Variant SKU) are automatically generated. Barcode is auto-generated. No need to provide SKUs!</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span><strong>Variants:</strong> Variant Name, Variant Quantity, Variant Min Quantity. All variants are automatically set as "parent" type with no parent relationships.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span><strong>IMEI Tracking:</strong> For IMEI children, include 15-digit IMEI number</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span><strong>Prices:</strong> Should be in Tanzanian Shillings (TZS)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span><strong>Template:</strong> Download template for complete field list and examples</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {currentStep === 'preview' && (
            <div className="py-6 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Preview Data</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {previewData.length} product{previewData.length !== 1 ? 's' : ''} ready to import
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className="px-4 py-2 text-sm bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 rounded-lg transition-all font-semibold shadow-sm"
                  >
                    {isEditMode ? 'View Mode' : 'Edit Mode'}
                  </button>
                </div>
              </div>
              
              {/* Conflict Resolution Settings */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 flex-1">
                    <p className="font-semibold mb-1">Conflict Resolution Settings</p>
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium">SKU Conflicts:</p>
                        <p className="text-xs">If SKU exists, a new unique SKU will be auto-generated automatically.</p>
                      </div>
                      <div>
                        <p className="font-medium">Name Conflicts:</p>
                        <p className="text-xs">When a product with the same name exists, choose how to handle it:</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Conflict Resolution Options */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    If Product Name Exists:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conflictResolution"
                        value="migrate"
                        checked={conflictResolution === 'migrate'}
                        onChange={(e) => setConflictResolution(e.target.value as 'migrate' | 'skip' | 'delete')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        <strong>Migrate/Update</strong> - Update existing product with new data
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conflictResolution"
                        value="skip"
                        checked={conflictResolution === 'skip'}
                        onChange={(e) => setConflictResolution(e.target.value as 'migrate' | 'skip' | 'delete')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        <strong>Skip</strong> - Skip this product and keep existing one
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conflictResolution"
                        value="delete"
                        checked={conflictResolution === 'delete'}
                        onChange={(e) => setConflictResolution(e.target.value as 'migrate' | 'skip' | 'delete')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        <strong>Delete & Replace</strong> - Delete existing product and create new one
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 mb-2">
                        {validationErrors.length} Validation Error{validationErrors.length !== 1 ? 's' : ''}
                      </h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {validationErrors.map((error, idx) => (
                          <div key={idx} className="text-sm text-red-800 bg-white rounded p-2 border border-red-200">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {previewData.map((product, index) => (
                  <div key={index} className="border-2 rounded-xl bg-white shadow-sm border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-bold text-gray-900">{product.name}</h4>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              product.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {product.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span><strong>SKU:</strong> {product.sku}</span>
                            <span><strong>Category:</strong> {product.categoryName || product.categoryId || 'N/A'}</span>
                            {product.price && (
                              <span><strong>Price:</strong> {product.price.toLocaleString()} TZS</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {product.variants && product.variants.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-semibold text-gray-700">
                              {product.variants.length} Variant{product.variants.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {(() => {
                              // Group variants by parent-child relationships
                              const parentVariants = product.variants.filter(v => 
                                v.variantType === 'parent' || v.isParent || !v.parentVariantSku
                              );
                              const childVariants = product.variants.filter(v => 
                                v.variantType === 'imei_child' && v.parentVariantSku
                              );
                              
                              // Group children by parent SKU
                              const childrenByParent = new Map<string, typeof childVariants>();
                              childVariants.forEach(child => {
                                const parentSku = child.parentVariantSku || product.sku;
                                if (!childrenByParent.has(parentSku)) {
                                  childrenByParent.set(parentSku, []);
                                }
                                childrenByParent.get(parentSku)!.push(child);
                              });
                              
                              return (
                                <>
                                  {/* Parent and Standard Variants */}
                                  {parentVariants.map((variant, vIdx) => {
                                    const variantKey = `${product.sku}-${variant.variantSku || vIdx}`;
                                    const isExpanded = expandedVariants.has(variantKey);
                                    const children = childrenByParent.get(variant.variantSku || product.sku) || [];
                                    const hasChildren = children.length > 0;
                                    
                                    return (
                                      <div key={vIdx} className="border-2 rounded-xl bg-white shadow-sm transition-all">
                                        {/* Parent Variant Header - Clickable if has children */}
                                        <div 
                                          className={`flex items-center gap-2 p-3 ${hasChildren ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                          onClick={hasChildren ? () => {
                                            const newExpanded = new Set(expandedVariants);
                                            if (isExpanded) {
                                              newExpanded.delete(variantKey);
                                            } else {
                                              newExpanded.add(variantKey);
                                            }
                                            setExpandedVariants(newExpanded);
                                          } : undefined}
                                        >
                                          {hasChildren && (
                                            <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                                              isExpanded ? 'bg-blue-500' : 'bg-gray-200'
                                            }`}>
                                              <svg 
                                                className={`w-3 h-3 text-white transition-transform duration-200 ${
                                                  isExpanded ? 'rotate-180' : ''
                                                }`} 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                              >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                              </svg>
                                            </div>
                                          )}
                                          <div className="flex-1 flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-gray-900">
                                              {variant.variantName || variant.variantSku || `Variant ${vIdx + 1}`}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                              variant.variantType === 'parent' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                              'bg-gray-100 text-gray-700 border border-gray-200'
                                            }`}>
                                              {variant.variantType || 'standard'}
                                            </span>
                                            {hasChildren && (
                                              <span className="text-xs text-gray-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                {children.length} device{children.length > 1 ? 's' : ''}
                                              </span>
                                            )}
                                            {variant.variantSellingPrice && (
                                              <span className="text-xs text-gray-600">
                                                Price: {variant.variantSellingPrice.toLocaleString()} TZS
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Children Variants - Expandable */}
                                        {hasChildren && isExpanded && (
                                          <div className="pl-8 pr-3 pb-3 space-y-2 border-t border-gray-100">
                                            {children.map((child, cIdx) => (
                                              <div key={cIdx} className="bg-blue-50 rounded-lg p-2.5 border border-blue-200 mt-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="font-medium text-gray-900 text-sm">
                                                    {child.variantName || child.variantSku || `Device ${cIdx + 1}`}
                                                  </span>
                                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                                    imei_child
                                                  </span>
                                                  {child.imei && (
                                                    <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-mono">
                                                      IMEI: {child.imei}
                                                    </span>
                                                  )}
                                                  {child.serialNumber && (
                                                    <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200 font-mono">
                                                      SN: {child.serialNumber}
                                                    </span>
                                                  )}
                                                  {child.variantSellingPrice && (
                                                    <span className="text-xs text-gray-600">
                                                      Price: {child.variantSellingPrice.toLocaleString()} TZS
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  
                                  {/* Orphaned Children (children without a parent variant in the list) */}
                                  {childVariants.filter(child => {
                                    const parentSku = child.parentVariantSku || product.sku;
                                    return !parentVariants.some(p => (p.variantSku || product.sku) === parentSku);
                                  }).map((variant, vIdx) => (
                                    <div key={`orphan-${vIdx}`} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-gray-900">
                                          {variant.variantName || variant.variantSku || `Variant ${vIdx + 1}`}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                          imei_child
                                        </span>
                                        {variant.parentVariantSku && (
                                          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                            ← Parent: {variant.parentVariantSku}
                                          </span>
                                        )}
                                        {variant.imei && (
                                          <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-mono">
                                            IMEI: {variant.imei}
                                          </span>
                                        )}
                                        {variant.variantSellingPrice && (
                                          <span className="text-xs text-gray-600">
                                            Price: {variant.variantSellingPrice.toLocaleString()} TZS
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {currentStep === 'import' && (
            <div className="py-6 space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Import Results</h3>
              
              {isImporting && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-blue-900">Importing products...</span>
                      <span className="text-xl font-bold text-blue-700">{Math.round(importProgress)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {!isImporting && totalCount > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold text-green-900">{successfulCount}</p>
                          <p className="text-sm font-semibold text-green-700">Successful</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                        <div>
                          <p className="text-2xl font-bold text-red-900">{failedCount}</p>
                          <p className="text-sm font-semibold text-red-700">Failed</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
                          <p className="text-sm font-semibold text-blue-700">Total</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {failedCount > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                      <h4 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Failed Imports
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {importResults
                          .filter(r => !r.success)
                          .map((result, index) => (
                            <div key={index} className="text-sm text-red-800 bg-white rounded-lg p-3 border border-red-200">
                              <strong>Row {result.rowNumber}:</strong> {result.error}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex gap-3 justify-end">
            {currentStep === 'preview' && (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentStep('upload')}
                  className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isImporting || previewData.length === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {isImporting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    'Import Products'
                  )}
                </button>
              </>
            )}
            {currentStep === 'import' && !isImporting && (
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductExcelImportModal;
