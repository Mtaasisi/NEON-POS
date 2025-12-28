import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Download, AlertCircle, CheckCircle, Package, FileText, Info, Shield, FileSpreadsheet, CheckSquare, Square, Trash2, Copy, RotateCcw, Filter, Search, Edit, Loader2 } from 'lucide-react';
import { Product, ProductFormData } from '../../types/inventory';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabaseClient';
import * as XLSX from 'xlsx';
import ProductExcelImportModal from '../ProductExcelImportModal';

interface ProductImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (products: Product[]) => void;
}

// Re-export the ProductExportData interface from ProductExcelExport
interface ProductExportData {
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
  categoryName?: string;
  supplierName?: string;
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
  variantCount?: number;
  totalVariantsValue?: number;
  lastStockMovement?: {
    type?: string;
    quantity?: number;
    reason?: string;
    date?: string;
  };
  category?: { name: string; description?: string; color?: string };
  supplier?: { name: string; contact_person?: string; email?: string; phone?: string; address?: string; website_url?: string; notes?: string };
}

const ProductImportExportModal: React.FC<ProductImportExportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);

  // Export functionality
  const exportToExcel = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      toast.loading('Preparing product data for export...', { id: 'export' });
      
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

      const exportData: ProductExportData[] = [];
      
      products?.forEach(product => {
        const category = product.category;
        const supplier = product.supplier;
        const variantsRaw = product.variants;
        let variants: any[] = [];
        
        if (Array.isArray(variantsRaw)) {
          variants = variantsRaw;
        } else if (variantsRaw && typeof variantsRaw === 'object') {
          variants = [variantsRaw];
        } else {
          variants = [];
        }
        
        const mainVariant = variants.length > 0 
          ? variants.reduce((prev, current) => 
              (current.quantity || 0) > (prev.quantity || 0) ? current : prev
            )
          : null;

        const totalVariantsValue = Array.isArray(variants) && variants.length > 0
          ? variants.reduce((sum, variant) => 
          sum + ((variant.selling_price || 0) * (variant.quantity || 0)), 0
            )
          : 0;

        if (variants.length === 0) {
          exportData.push({
            id: product.id,
            name: product.name,
            description: product.description,
            shortDescription: product.short_description || product.description || '',
            sku: product.sku,
            barcode: product.barcode,
            categoryId: product.category_id,
            supplierId: product.supplier_id,
            images: product.images || [],
            isActive: product.is_active,
            totalQuantity: product.total_quantity || 0,
            totalValue: product.total_value || 0,
            condition: product.condition,
            debutDate: product.debut_date || null,
            debutNotes: product.debut_notes || null,
            debutFeatures: product.debut_features || null,
            metadata: product.metadata,
            createdAt: product.created_at,
            updatedAt: product.updated_at,
            categoryName: category?.name || 'Uncategorized',
            supplierName: supplier?.name || 'No Supplier',
            allVariants: [],
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
            variantCount: 0,
            totalVariantsValue: 0,
            lastStockMovement: undefined,
            category: category,
            supplier: supplier
          });
        } else {
          variants.forEach(variant => {
            exportData.push({
              id: product.id,
              name: product.name,
              description: product.description,
              shortDescription: product.short_description || product.description || '',
              sku: product.sku,
              barcode: product.barcode,
              categoryId: product.category_id,
              supplierId: product.supplier_id,
              images: product.images || [],
              isActive: product.is_active,
              totalQuantity: product.total_quantity || 0,
              totalValue: product.total_value || 0,
              condition: product.condition,
              debutDate: product.debut_date || null,
              debutNotes: product.debut_notes || null,
              debutFeatures: product.debut_features || null,
              metadata: product.metadata,
              createdAt: product.created_at,
              updatedAt: product.updated_at,
              categoryName: category?.name || 'Uncategorized',
              supplierName: supplier?.name || 'No Supplier',
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
                maxQuantity: null,
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
              variantId: variant.id,
              variantSku: variant.sku,
              variantName: variant.name || variant.variant_name,
              variantBarcode: variant.barcode,
              costPrice: variant.cost_price,
              sellingPrice: variant.selling_price,
              quantity: variant.quantity,
              minQuantity: variant.min_quantity,
              maxQuantity: null,
              dimensions: variant.dimensions ? 
                `${variant.dimensions.length || 0}L x ${variant.dimensions.width || 0}W x ${variant.dimensions.height || 0}H` : '',
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
              variantCount: variants.length,
              totalVariantsValue,
              lastStockMovement: undefined,
              category: category,
              supplier: supplier
            });
          });
        }
      });

      setExportProgress(60);
      toast.loading('Generating Excel file...', { id: 'export' });

      const columnDefinitions = [
        { key: 'productId', header: 'Product ID', isHidden: true, isEmpty: () => false },
        { key: 'productName', header: 'Product Name', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.name) },
        { key: 'description', header: 'Description', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.description) },
        { key: 'shortDescription', header: 'Short Description', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.shortDescription) },
        { key: 'sku', header: 'SKU', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.sku) },
        { key: 'barcode', header: 'Barcode', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.barcode) },
        { key: 'categoryId', header: 'Category ID', isHidden: true, isEmpty: () => false },
        { key: 'categoryName', header: 'Category Name', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.categoryName) },
        { key: 'categoryDescription', header: 'Category Description', isHidden: true, isEmpty: () => false },
        { key: 'categoryColor', header: 'Category Color', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.category?.color) },
        { key: 'supplierId', header: 'Supplier ID', isHidden: true, isEmpty: () => false },
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
        { key: 'variantId', header: 'Variant ID', isHidden: true, isEmpty: () => false },
        { key: 'variantSku', header: 'Variant SKU', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.variantSku) },
        { key: 'variantName', header: 'Variant Name', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.variantName) },
        { key: 'variantBarcode', header: 'Variant Barcode', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.variantBarcode) },
        { key: 'variantType', header: 'Variant Type', isHidden: false, isEmpty: () => false },
        { key: 'isParent', header: 'Is Parent', isHidden: false, isEmpty: () => false },
        { key: 'parentVariantId', header: 'Parent Variant ID', isHidden: true, isEmpty: () => false },
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
        { key: 'variantIsActive', header: 'Variant Is Active', isHidden: true, isEmpty: () => false },
        { key: 'branchId', header: 'Branch ID', isHidden: true, isEmpty: () => false },
        { key: 'allVariantsCount', header: 'All Variants Count', isHidden: false, isEmpty: () => false },
        { key: 'allVariantsData', header: 'All Variants Data (JSON)', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.allVariants && p.allVariants.length > 0) },
        { key: 'variantCount', header: 'Variant Count', isHidden: false, isEmpty: () => false },
        { key: 'totalVariantsValue', header: 'Total Variants Value', isHidden: true, isEmpty: () => false },
        { key: 'createdAt', header: 'Created Date', isHidden: true, isEmpty: () => false },
        { key: 'updatedAt', header: 'Updated Date', isHidden: true, isEmpty: () => false },
        { key: 'lastStockMovementType', header: 'Last Stock Movement Type', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.lastStockMovement?.type) },
        { key: 'lastStockMovementQuantity', header: 'Last Stock Movement Quantity', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.lastStockMovement?.quantity) },
        { key: 'lastStockMovementReason', header: 'Last Stock Movement Reason', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.lastStockMovement?.reason) },
        { key: 'lastStockMovementDate', header: 'Last Stock Movement Date', isHidden: false, isEmpty: (data: ProductExportData[]) => !data.some(p => p.lastStockMovement?.date) },
      ];

      const visibleColumns = columnDefinitions.filter(col => !col.isHidden);
      const columnsToInclude = visibleColumns.filter(col => !col.isEmpty(exportData));
      const headers = columnsToInclude.map(col => col.header);
      
      const rows = exportData.map(product => {
        const row: any = {};
        columnsToInclude.forEach(col => {
          switch (col.key) {
            case 'productName': row[col.header] = product.name || ''; break;
            case 'description': row[col.header] = product.description || ''; break;
            case 'shortDescription': row[col.header] = product.shortDescription || ''; break;
            case 'sku': row[col.header] = product.sku || ''; break;
            case 'barcode': row[col.header] = product.barcode || ''; break;
            case 'categoryName': row[col.header] = product.categoryName || ''; break;
            case 'categoryColor': row[col.header] = product.category?.color || ''; break;
            case 'supplierName': row[col.header] = product.supplierName || ''; break;
            case 'supplierContactPerson': row[col.header] = product.supplier?.contact_person || ''; break;
            case 'supplierEmail': row[col.header] = product.supplier?.email || ''; break;
            case 'supplierPhone': row[col.header] = product.supplier?.phone || ''; break;
            case 'supplierAddress': row[col.header] = product.supplier?.address || ''; break;
            case 'supplierWebsite': row[col.header] = product.supplier?.website_url || ''; break;
            case 'supplierNotes': row[col.header] = product.supplier?.notes || ''; break;
            case 'images': row[col.header] = (product.images || []).join(', '); break;
            case 'isActive': row[col.header] = product.isActive ? 'Yes' : 'No'; break;
            case 'totalQuantity': row[col.header] = product.totalQuantity || 0; break;
            case 'totalValue': row[col.header] = product.totalValue || 0; break;
            case 'condition': row[col.header] = product.condition || ''; break;
            case 'debutDate': row[col.header] = product.debutDate || ''; break;
            case 'debutNotes': row[col.header] = product.debutNotes || ''; break;
            case 'debutFeatures': row[col.header] = (product.debutFeatures || []).join(', '); break;
            case 'metadata': row[col.header] = product.metadata ? JSON.stringify(product.metadata) : ''; break;
            case 'variantSku': row[col.header] = product.variantSku || ''; break;
            case 'variantName': row[col.header] = product.variantName || ''; break;
            case 'variantBarcode': row[col.header] = product.variantBarcode || ''; break;
            case 'variantType': row[col.header] = product.variantType || 'standard'; break;
            case 'isParent': row[col.header] = product.isParent ? 'Yes' : 'No'; break;
            case 'parentVariantSku': row[col.header] = product.parentVariantSku || ''; break;
            case 'parentVariantName': row[col.header] = product.parentVariantName || ''; break;
            case 'costPrice': row[col.header] = product.costPrice || 0; break;
            case 'sellingPrice': row[col.header] = product.sellingPrice || 0; break;
            case 'quantity': row[col.header] = product.quantity || 0; break;
            case 'minQuantity': row[col.header] = product.minQuantity || 0; break;
            case 'weight': row[col.header] = product.weight || ''; break;
            case 'dimensions': row[col.header] = product.dimensions || ''; break;
            case 'variantAttributes': row[col.header] = product.variantAttributes ? JSON.stringify(product.variantAttributes) : ''; break;
            case 'imei': row[col.header] = product.imei || ''; break;
            case 'serialNumber': row[col.header] = product.serialNumber || ''; break;
            case 'allVariantsCount': row[col.header] = product.allVariants?.length || 0; break;
            case 'allVariantsData': row[col.header] = product.allVariants ? JSON.stringify(product.allVariants) : ''; break;
            case 'variantCount': row[col.header] = product.variantCount || 0; break;
            default: row[col.header] = '';
          }
        });
        return row;
      });

      setExportProgress(80);
      toast.loading('Creating Excel file...', { id: 'export' });

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);

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

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

      setExportProgress(90);
      toast.loading('Downloading file...', { id: 'export' });

      const fileName = `lats_products_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setExportProgress(100);
      toast.success(`✅ Successfully exported ${exportData.length} products!`, { id: 'export' });
      
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`❌ Export failed: ${error.message}`, { id: 'export' });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Import & Export Products</h2>
              <p className="text-sm text-gray-600">Import products from Excel or export your inventory</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
              activeTab === 'import'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              Import Products
            </div>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
              activeTab === 'export'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Export Products
            </div>
          </button>
        </div>

        {/* Content - Conditional based on active tab */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'import' ? (
            <ProductExcelImportModal
              isOpen={true}
              inline={true}
              onClose={() => {
                setActiveTab('export');
              }}
              onImportComplete={(products) => {
                onImportComplete(products);
                setActiveTab('export');
                onClose();
              }}
            />
          ) : (
            <div className="p-6">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
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
                            <li>• One row per variant for complete data coverage</li>
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
                    <button
                      onClick={exportToExcel}
                      disabled={isExporting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Export All Products to Excel
                        </>
                      )}
                    </button>

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
                            <li>• Empty columns are automatically removed</li>
                            <li>• One row per variant for complete data coverage</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    ,
    document.body
  );
};

export default ProductImportExportModal;
