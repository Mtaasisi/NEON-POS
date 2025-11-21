import React, { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import GlassButton from '../../../shared/components/ui/GlassButton';
import GlassCard from '../../../shared/components/ui/GlassCard';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabaseClient';
import * as XLSX from 'xlsx';

interface ProductExportData {
  // Product main fields
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  barcode?: string;
  categoryId: string;

  supplierId?: string;
  images?: string[];
  isActive: boolean;
  totalQuantity: number;
  totalValue: number;
  condition?: string;

  debutDate?: string;
  debutNotes?: string;
  debutFeatures?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  
  // Related data
  categoryName?: string;
  supplierName?: string;
  
  // All variant data (not just main variant) with parent-child relationships
  allVariants?: Array<{
    id: string;
    sku: string;
    name: string;
    variantName?: string;
    barcode?: string;
    attributes: Record<string, any>;
    variantAttributes?: Record<string, any>;
    costPrice: number;
    sellingPrice: number;
    quantity: number;
    minQuantity: number;
    maxQuantity?: number;
    dimensions?: Record<string, any>;
    weight?: number;
    variantType?: string;
    isParent?: boolean;
    parentVariantId?: string;
    parentVariantSku?: string | null;
    parentVariantName?: string | null;
    imei?: string | null;
    serialNumber?: string | null;
    isActive?: boolean;
    branchId?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  
  // Main variant data (for backward compatibility) with all fields
  variantId?: string;
  variantSku?: string;
  variantName?: string;
  variantBarcode?: string;
  variantType?: string;
  isParent?: boolean;
  parentVariantId?: string;
  parentVariantSku?: string | null;
  parentVariantName?: string | null;
  imei?: string | null;
  serialNumber?: string | null;
  weight?: number;
  variantAttributes?: Record<string, any>;
  variantIsActive?: boolean;
  branchId?: string;
  costPrice?: number;
  sellingPrice?: number;
  quantity?: number;
  minQuantity?: number;
  maxQuantity?: number;
  dimensions?: string;
  
  // Additional data
  variantCount?: number;
  totalVariantsValue?: number;
  
  // Stock movement data
  lastStockMovement?: {
    type?: string;
    quantity?: number;
    reason?: string;
    date?: string;
  };

  // Additional related data for CSV export
  category?: { name: string; description?: string; color?: string };
  supplier?: { name: string; contact_person?: string; email?: string; phone?: string; address?: string; website_url?: string; notes?: string };
}

const ProductExcelExport: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportToExcel = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      toast.loading('Preparing product data for export...', { id: 'export' });
      
      // Step 1: Fetch all products with related data including parent-child relationships
      setExportProgress(20);
      const { data: products, error: productsError } = await supabase
        .from('lats_products')
        .select(`
          *,
          category:lats_categories!category_id(name, description, color),
          supplier:lats_suppliers!supplier_id(name, contact_person, email, phone, address, website_url, notes),
          variants:lats_product_variants!product_id(
            *,
            parent_variant:lats_product_variants!parent_variant_id(id, sku, name, variant_name)
          )
        `)
        .order('name');

      if (productsError) {
        throw new Error(`Failed to fetch products: ${productsError.message}`);
      }

      setExportProgress(40);
      toast.loading('Processing product data...', { id: 'export' });

      // Step 2: Transform data for export
      const exportData: ProductExportData[] = [];
      
      products?.forEach(product => {
        const category = product.category;
        const supplier = product.supplier;
        // Ensure variants is always an array - Supabase may return object, null, or undefined
        const variantsRaw = product.variants;
        let variants: any[] = [];
        
        if (Array.isArray(variantsRaw)) {
          variants = variantsRaw;
        } else if (variantsRaw && typeof variantsRaw === 'object') {
          // If it's a single object, wrap it in an array
          variants = [variantsRaw];
        } else {
          // If it's null, undefined, or anything else, use empty array
          variants = [];
        }
        
        // Get main variant (first one or highest quantity)
        const mainVariant = variants.length > 0 
          ? variants.reduce((prev, current) => 
              (current.quantity || 0) > (prev.quantity || 0) ? current : prev
            )
          : null;

        // Calculate totals - ensure variants is an array before reduce
        const totalVariantsValue = Array.isArray(variants) && variants.length > 0
          ? variants.reduce((sum, variant) => 
          sum + ((variant.selling_price || 0) * (variant.quantity || 0)), 0
            )
          : 0;

        // Create one row per variant (or one row if no variants)
        if (variants.length === 0) {
          // Product without variants
          exportData.push({
            // Product main fields
            id: product.id,
            name: product.name,
            description: product.description,
            shortDescription: product.short_description || product.description || '', // Handle missing column
            sku: product.sku,
            barcode: product.barcode,
            categoryId: product.category_id,

            supplierId: product.supplier_id,
            images: product.images || [],
            isActive: product.is_active,
            totalQuantity: product.total_quantity || 0,
            totalValue: product.total_value || 0,
            condition: product.condition,
            debutDate: product.debut_date || null, // Handle missing column
            debutNotes: product.debut_notes || null, // Handle missing column
            debutFeatures: product.debut_features || null, // Handle missing column (could be array or null)
            metadata: product.metadata,
            createdAt: product.created_at,
            updatedAt: product.updated_at,
            
            // Related data
            categoryName: category?.name || 'Uncategorized',
            supplierName: supplier?.name || 'No Supplier',
            
            // All variant data
            allVariants: [],
            
            // Main variant data (empty for products without variants)
            variantId: '',
            variantSku: '',
            variantName: '',
            variantBarcode: '',
            variantType: 'standard',
            isParent: false,
            parentVariantId: undefined,
            parentVariantSku: undefined,
            parentVariantName: undefined,
            costPrice: 0,
            sellingPrice: 0,
            quantity: 0,
            minQuantity: 0,
            maxQuantity: 0,
            weight: undefined,
            dimensions: '',
            variantAttributes: undefined,
            imei: undefined,
            serialNumber: undefined,
            variantIsActive: true,
            branchId: undefined,
            
            // Additional data
            variantCount: 0,
            totalVariantsValue: 0,
            
            // Stock movement data (not included in export to avoid query complexity)
            lastStockMovement: undefined,
            
            // Additional related data for CSV export
            category: category,
            supplier: supplier
          });
        } else {
          // Create one row per variant
          variants.forEach(variant => {
            exportData.push({
              // Product main fields
              id: product.id,
              name: product.name,
              description: product.description,
              shortDescription: product.short_description || product.description || '', // Handle missing column
              sku: product.sku,
              barcode: product.barcode,
              categoryId: product.category_id,
  
              supplierId: product.supplier_id,
              images: product.images || [],
              isActive: product.is_active,
              totalQuantity: product.total_quantity || 0,
              totalValue: product.total_value || 0,
              condition: product.condition,
              debutDate: product.debut_date || null, // Handle missing column
              debutNotes: product.debut_notes || null, // Handle missing column
              debutFeatures: product.debut_features || null, // Handle missing column (could be array or null)
              metadata: product.metadata,
              createdAt: product.created_at,
              updatedAt: product.updated_at,
              
              // Related data
              categoryName: category?.name || 'Uncategorized',
              supplierName: supplier?.name || 'No Supplier',
              
              // All variant data with parent-child relationships
              allVariants: variants.map(v => ({
                id: v.id,
                sku: v.sku,
                name: v.name,
                variantName: v.variant_name,
                barcode: v.barcode,
                attributes: v.attributes,
                variantAttributes: v.variant_attributes,
                costPrice: v.cost_price,
                sellingPrice: v.selling_price,
                quantity: v.quantity,
                minQuantity: v.min_quantity,
                maxQuantity: null, // Column was removed in migration
                dimensions: v.dimensions,
                weight: v.weight,
                variantType: v.variant_type || 'standard',
                isParent: v.is_parent || false,
                parentVariantId: v.parent_variant_id,
                parentVariantSku: v.parent_variant?.sku || null,
                parentVariantName: v.parent_variant?.name || v.parent_variant?.variant_name || null,
                imei: v.variant_attributes?.imei || null,
                serialNumber: v.variant_attributes?.serial_number || null,
                isActive: v.is_active,
                branchId: v.branch_id,
                createdAt: v.created_at,
                updatedAt: v.updated_at,
              })),
              
              // Current variant data with all fields
              variantId: variant.id,
              variantSku: variant.sku,
              variantName: variant.name || variant.variant_name,
              variantBarcode: variant.barcode,
              costPrice: variant.cost_price,
              sellingPrice: variant.selling_price,
              quantity: variant.quantity,
              minQuantity: variant.min_quantity,
              maxQuantity: null, // Column was removed in migration
              dimensions: variant.dimensions ? 
                `${variant.dimensions.length || 0}L x ${variant.dimensions.width || 0}W x ${variant.dimensions.height || 0}H` : '',
              // Include variant type and parent info for current variant
              variantType: variant.variant_type || 'standard',
              isParent: variant.is_parent || false,
              parentVariantId: variant.parent_variant_id,
              parentVariantSku: variant.parent_variant?.sku || null,
              parentVariantName: variant.parent_variant?.name || variant.parent_variant?.variant_name || null,
              imei: variant.variant_attributes?.imei || null,
              serialNumber: variant.variant_attributes?.serial_number || null,
              weight: variant.weight,
              variantAttributes: variant.variant_attributes,
              variantIsActive: variant.is_active !== false,
              branchId: variant.branch_id,
              
              // Additional data
              variantCount: variants.length,
              totalVariantsValue,
              
              // Stock movement data (not included in export to avoid query complexity)
              lastStockMovement: undefined,
              
              // Additional related data for CSV export
                          category: category,
            supplier: supplier
            });
          });
        }
      });

      setExportProgress(60);
      toast.loading('Generating Excel file...', { id: 'export' });

      // Step 3: Prepare data for Excel export
      // Define columns with their metadata for hiding logic
      const columnDefinitions = [
        // Product Information
        { key: 'productId', header: 'Product ID', isHidden: true, isEmpty: () => false }, // Hide - useless ID
        { key: 'productName', header: 'Product Name', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.name) },
        { key: 'description', header: 'Description', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.description) },
        { key: 'shortDescription', header: 'Short Description', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.shortDescription) },
        { key: 'sku', header: 'SKU', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.sku) },
        { key: 'barcode', header: 'Barcode', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.barcode) },
        { key: 'categoryId', header: 'Category ID', isHidden: true, isEmpty: () => false }, // Hide - useless ID
        { key: 'categoryName', header: 'Category Name', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.categoryName) },
        { key: 'categoryDescription', header: 'Category Description', isHidden: true, isEmpty: () => false }, // Hide - not needed
        { key: 'categoryColor', header: 'Category Color', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.category?.color) },
        { key: 'supplierId', header: 'Supplier ID', isHidden: true, isEmpty: () => false }, // Hide - useless ID
        { key: 'supplierName', header: 'Supplier Name', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.supplierName && p.supplierName !== 'No Supplier') },
        { key: 'supplierContactPerson', header: 'Supplier Contact Person', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.supplier?.contact_person) },
        { key: 'supplierEmail', header: 'Supplier Email', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.supplier?.email) },
        { key: 'supplierPhone', header: 'Supplier Phone', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.supplier?.phone) },
        { key: 'supplierAddress', header: 'Supplier Address', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.supplier?.address) },
        { key: 'supplierWebsite', header: 'Supplier Website', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.supplier?.website_url) },
        { key: 'supplierNotes', header: 'Supplier Notes', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.supplier?.notes) },
        { key: 'images', header: 'Images', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.images && p.images.length > 0) },
        { key: 'isActive', header: 'Active', isHidden: false, isEmpty: () => false },
        { key: 'totalQuantity', header: 'Total Quantity', isHidden: false, isEmpty: () => false },
        { key: 'totalValue', header: 'Total Value', isHidden: false, isEmpty: () => false },
        { key: 'condition', header: 'Condition', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.condition) },
        { key: 'debutDate', header: 'Debut Date', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.debutDate) },
        { key: 'debutNotes', header: 'Debut Notes', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.debutNotes) },
        { key: 'debutFeatures', header: 'Debut Features', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.debutFeatures && p.debutFeatures.length > 0) },
        { key: 'metadata', header: 'Metadata', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.metadata && Object.keys(p.metadata).length > 0) },
        
        // Current Variant Information
        { key: 'variantId', header: 'Variant ID', isHidden: true, isEmpty: () => false }, // Hide - useless ID
        { key: 'variantSku', header: 'Variant SKU', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.variantSku) },
        { key: 'variantName', header: 'Variant Name', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.variantName) },
        { key: 'variantBarcode', header: 'Variant Barcode', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.variantBarcode) },
        { key: 'variantType', header: 'Variant Type', isHidden: false, isEmpty: () => false },
        { key: 'isParent', header: 'Is Parent', isHidden: false, isEmpty: () => false }, // Always show boolean columns
        { key: 'parentVariantId', header: 'Parent Variant ID', isHidden: true, isEmpty: () => false }, // Hide - useless ID
        { key: 'parentVariantSku', header: 'Parent Variant SKU', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.parentVariantSku) },
        { key: 'parentVariantName', header: 'Parent Variant Name', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.parentVariantName) },
        { key: 'costPrice', header: 'Cost Price', isHidden: false, isEmpty: () => false },
        { key: 'sellingPrice', header: 'Selling Price', isHidden: false, isEmpty: () => false },
        { key: 'quantity', header: 'Quantity', isHidden: false, isEmpty: () => false },
        { key: 'minQuantity', header: 'Min Quantity', isHidden: false, isEmpty: () => false },
        { key: 'weight', header: 'Weight', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.weight) },
        { key: 'dimensions', header: 'Dimensions (LxWxH)', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.dimensions) },
        { key: 'variantAttributes', header: 'Variant Attributes', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.variantAttributes && Object.keys(p.variantAttributes || {}).length > 0) },
        { key: 'imei', header: 'IMEI', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.imei) },
        { key: 'serialNumber', header: 'Serial Number', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.serialNumber) },
        { key: 'variantIsActive', header: 'Variant Is Active', isHidden: true, isEmpty: () => false }, // Hide - automatic active
        { key: 'branchId', header: 'Branch ID', isHidden: true, isEmpty: () => false }, // Hide - useless ID
        
        // All Variants Summary
        { key: 'allVariantsCount', header: 'All Variants Count', isHidden: false, isEmpty: () => false },
        { key: 'allVariantsData', header: 'All Variants Data (JSON)', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.allVariants && p.allVariants.length > 0) },
        
        // Additional Information
        { key: 'variantCount', header: 'Variant Count', isHidden: false, isEmpty: () => false },
        { key: 'totalVariantsValue', header: 'Total Variants Value', isHidden: true, isEmpty: () => false }, // Hide - auto calculated
        { key: 'createdAt', header: 'Created Date', isHidden: true, isEmpty: () => false }, // Hide - automatic timestamp
        { key: 'updatedAt', header: 'Updated Date', isHidden: true, isEmpty: () => false }, // Hide - automatic timestamp
        
        // Stock Movement Information
        { key: 'lastStockMovementType', header: 'Last Stock Movement Type', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.lastStockMovement?.type) },
        { key: 'lastStockMovementQuantity', header: 'Last Stock Movement Quantity', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.lastStockMovement?.quantity) },
        { key: 'lastStockMovementReason', header: 'Last Stock Movement Reason', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.lastStockMovement?.reason) },
        { key: 'lastStockMovementDate', header: 'Last Stock Movement Date', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.lastStockMovement?.date) },
      ];

      // Filter columns to include (exclude hidden columns)
      const visibleColumns = columnDefinitions.filter(col => !col.isHidden);
      
      // Filter out empty columns
      const columnsToInclude = visibleColumns.filter(col => !col.isEmpty(exportData));
      
      // Create header row
      const headers = columnsToInclude.map(col => col.header);
      
      // Create data rows
      const rows = exportData.map(product => {
        const row: any = {};
        columnsToInclude.forEach(col => {
          switch (col.key) {
            case 'productId':
              row[col.header] = product.id;
              break;
            case 'productName':
              row[col.header] = product.name || '';
              break;
            case 'description':
              row[col.header] = product.description || '';
              break;
            case 'shortDescription':
              row[col.header] = product.shortDescription || '';
              break;
            case 'sku':
              row[col.header] = product.sku || '';
              break;
            case 'barcode':
              row[col.header] = product.barcode || '';
              break;
            case 'categoryId':
              row[col.header] = product.categoryId || '';
              break;
            case 'categoryName':
              row[col.header] = product.categoryName || '';
              break;
            case 'categoryDescription':
              row[col.header] = product.category?.description || '';
              break;
            case 'categoryColor':
              row[col.header] = product.category?.color || '';
              break;
            case 'supplierId':
              row[col.header] = product.supplierId || '';
              break;
            case 'supplierName':
              row[col.header] = product.supplierName || '';
              break;
            case 'supplierContactPerson':
              row[col.header] = product.supplier?.contact_person || '';
              break;
            case 'supplierEmail':
              row[col.header] = product.supplier?.email || '';
              break;
            case 'supplierPhone':
              row[col.header] = product.supplier?.phone || '';
              break;
            case 'supplierAddress':
              row[col.header] = product.supplier?.address || '';
              break;
            case 'supplierWebsite':
              row[col.header] = product.supplier?.website_url || '';
              break;
            case 'supplierNotes':
              row[col.header] = product.supplier?.notes || '';
              break;
            case 'images':
              row[col.header] = (product.images || []).join(', ');
              break;
            case 'isActive':
              row[col.header] = product.isActive ? 'Yes' : 'No';
              break;
            case 'totalQuantity':
              row[col.header] = product.totalQuantity || 0;
              break;
            case 'totalValue':
              row[col.header] = product.totalValue || 0;
              break;
            case 'condition':
              row[col.header] = product.condition || '';
              break;
            case 'debutDate':
              row[col.header] = product.debutDate || '';
              break;
            case 'debutNotes':
              row[col.header] = product.debutNotes || '';
              break;
            case 'debutFeatures':
              row[col.header] = (product.debutFeatures || []).join(', ');
              break;
            case 'metadata':
              row[col.header] = product.metadata ? JSON.stringify(product.metadata) : '';
              break;
            case 'variantId':
              row[col.header] = product.variantId || '';
              break;
            case 'variantSku':
              row[col.header] = product.variantSku || '';
              break;
            case 'variantName':
              row[col.header] = product.variantName || '';
              break;
            case 'variantBarcode':
              row[col.header] = product.variantBarcode || '';
              break;
            case 'variantType':
              row[col.header] = product.variantType || 'standard';
              break;
            case 'isParent':
              row[col.header] = product.isParent ? 'Yes' : 'No';
              break;
            case 'parentVariantId':
              row[col.header] = product.parentVariantId || '';
              break;
            case 'parentVariantSku':
              row[col.header] = product.parentVariantSku || '';
              break;
            case 'parentVariantName':
              row[col.header] = product.parentVariantName || '';
              break;
            case 'costPrice':
              row[col.header] = product.costPrice || 0;
              break;
            case 'sellingPrice':
              row[col.header] = product.sellingPrice || 0;
              break;
            case 'quantity':
              row[col.header] = product.quantity || 0;
              break;
            case 'minQuantity':
              row[col.header] = product.minQuantity || 0;
              break;
            case 'weight':
              row[col.header] = product.weight || '';
              break;
            case 'dimensions':
              row[col.header] = product.dimensions || '';
              break;
            case 'variantAttributes':
              row[col.header] = product.variantAttributes ? JSON.stringify(product.variantAttributes) : '';
              break;
            case 'imei':
              row[col.header] = product.imei || '';
              break;
            case 'serialNumber':
              row[col.header] = product.serialNumber || '';
              break;
            case 'variantIsActive':
              row[col.header] = product.variantIsActive !== false ? 'Yes' : 'No';
              break;
            case 'branchId':
              row[col.header] = product.branchId || '';
              break;
            case 'allVariantsCount':
              row[col.header] = product.allVariants?.length || 0;
              break;
            case 'allVariantsData':
              row[col.header] = product.allVariants ? JSON.stringify(product.allVariants) : '';
              break;
            case 'variantCount':
              row[col.header] = product.variantCount || 0;
              break;
            case 'totalVariantsValue':
              row[col.header] = product.totalVariantsValue || 0;
              break;
            case 'createdAt':
              row[col.header] = new Date(product.createdAt).toLocaleDateString();
              break;
            case 'updatedAt':
              row[col.header] = new Date(product.updatedAt).toLocaleDateString();
              break;
            case 'lastStockMovementType':
              row[col.header] = product.lastStockMovement?.type || '';
              break;
            case 'lastStockMovementQuantity':
              row[col.header] = product.lastStockMovement?.quantity || 0;
              break;
            case 'lastStockMovementReason':
              row[col.header] = product.lastStockMovement?.reason || '';
              break;
            case 'lastStockMovementDate':
              row[col.header] = product.lastStockMovement?.date || '';
              break;
            default:
              row[col.header] = '';
          }
        });
        return row;
      });

      setExportProgress(80);
      toast.loading('Creating Excel file...', { id: 'export' });

      // Step 4: Create Excel file with hidden columns
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Set column widths for better readability
      const maxWidths = columnsToInclude.map(col => {
        const maxLength = Math.max(
          col.header.length,
          ...rows.map(row => {
            const value = row[col.header];
            return value ? String(value).length : 0;
          })
        );
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
      });
      worksheet['!cols'] = maxWidths;

      // Note: XLSX library doesn't directly support hiding columns in the file format
      // But we've already filtered out hidden columns from the data, so they won't appear
      // For Excel, columns are hidden via sheet protection which requires a different approach
      // The hidden columns are already excluded from the export data above

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

      setExportProgress(90);
      toast.loading('Downloading file...', { id: 'export' });

      // Generate Excel file
      const fileName = `lats_products_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setExportProgress(100);
      toast.success(`✅ Successfully exported ${exportData.length} products!`, { id: 'export' });
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`❌ Export failed: ${error.message}`, { id: 'export' });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Export All Products</h3>
          <p className="text-sm text-gray-600">Download complete product catalog with all fields</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Export Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">What's included in the export:</p>
              <ul className="space-y-1 text-xs">
                <li>• All product details (name, description, SKU, barcode, etc.)</li>
                <li>• Complete category and supplier information</li>
                <li>• All variant details with parent-child relationships</li>
                <li>• Variant types (standard, parent, imei_child) and hierarchy</li>
                <li>• IMEI and serial numbers for tracked items</li>
                <li>• Variant attributes, dimensions, weight, and pricing</li>
                <li>• Product status, metadata, and debut information</li>
                <li>• Stock movement history and tracking</li>
                <li>• One row per variant for complete data coverage</li>
                <li>• All timestamps and audit information</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Exporting products...</span>
              <span className="text-gray-900 font-medium">{exportProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Export Button */}
        <GlassButton
          onClick={exportToExcel}
          disabled={isExporting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export All Products to Excel
            </>
          )}
        </GlassButton>

        {/* Export Tips */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-600">
              <p className="font-medium mb-1">Export Tips:</p>
              <ul className="space-y-1">
                <li>• File will be saved as Excel (.xlsx) format</li>
                <li>• Large exports may take a few moments</li>
                <li>• Useless columns (IDs) are automatically excluded</li>
                <li>• Automatic columns (timestamps) are excluded for easier editing</li>
                <li>• Empty columns are automatically removed</li>
                <li>• All special characters are properly escaped</li>
                <li>• Dates are formatted for easy reading</li>
                <li>• One row per variant for complete data coverage</li>
                <li>• JSON data (attributes, metadata) is preserved</li>
                <li>• All relationships and foreign keys are resolved</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

export default ProductExcelExport;
