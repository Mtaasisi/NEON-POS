import React, { useState, useEffect, memo } from 'react';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassButton from '../../../shared/components/ui/GlassButton';
import SearchBar from '../../../shared/components/ui/SearchBar';
import GlassSelect from '../../../shared/components/ui/GlassSelect';
import CircularProgress from '../../../../components/ui/CircularProgress';
import ModernLoadingOverlay from '../../../../components/ui/ModernLoadingOverlay';
import VariantProductCard from '../pos/VariantProductCard';
import { SafeImage } from '../../../../components/SafeImage';
import { ProductImage } from '../../../../lib/robustImageService';
import { LabelPrintingModal } from '../../../../components/LabelPrintingModal';
import ProductModal from '../product/ProductModal';
import { 
  Package, Grid, List, Star, CheckCircle, XCircle, 
  Download, Edit, Eye, Trash2, DollarSign, TrendingUp,
  AlertTriangle, Calculator, Printer, QrCode, X, MoreVertical, ArrowRightLeft, Copy, Columns,
  CheckSquare, XSquare, Files
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { validateProductsBatch } from '../../lib/productUtils';
import { toast } from 'react-hot-toast';
import { useInventoryStore } from '../../stores/useInventoryStore';

interface EnhancedInventoryTabProps {
  products: any[];
  metrics: any;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedBrand: string;
  setSelectedBrand: (brand: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  showLowStockOnly: boolean;
  setShowLowStockOnly: (show: boolean) => void;
  showFeaturedOnly: boolean;
  setShowFeaturedOnly: (show: boolean) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  selectedProducts: string[];
  setSelectedProducts: (products: string[]) => void;
  categories: any[];
  suppliers: any[];
  brands: any[];
  formatMoney: (amount: number) => string;
  getStatusColor: (status: string) => string;
  handleStockAdjustment: (productId: string, variantId: string, quantity: number, reason: string) => Promise<void>;
  handleBulkAction: (action: string) => Promise<void>;
  setShowStockAdjustModal: (show: boolean) => void;
  setSelectedProductForHistory: (productId: string | null) => void;
  setShowDeleteConfirmation: (show: boolean) => void;
  toggleProductSelection: (productId: string) => void;
  toggleSelectAll: () => void;
  navigate: (path: string) => void;
  productModals: any;
  deleteProduct: (productId: string) => Promise<void>;
  liveMetrics?: any;
  isLoadingLiveMetrics?: boolean;
  onRefreshLiveMetrics?: () => void;
}

// Helper function to convert old image format to new format
const convertToProductImages = (imageUrls: string[]): ProductImage[] => {
  if (!imageUrls || imageUrls.length === 0) return [];
  
  return imageUrls.map((imageUrl, index) => ({
    id: `temp-${index}`,
    url: imageUrl,
    thumbnailUrl: imageUrl,
    fileName: `product-image-${index + 1}`,
    fileSize: 0,
    isPrimary: index === 0,
    uploadedAt: new Date().toISOString()
  }));
};

const EnhancedInventoryTab: React.FC<EnhancedInventoryTabProps> = ({
  products,
  metrics,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedStatus,
  setSelectedStatus,
  showLowStockOnly,
  setShowLowStockOnly,
  showFeaturedOnly,
  setShowFeaturedOnly,
  viewMode,
  setViewMode,
  sortBy,
  setSortBy,
  selectedProducts,
  setSelectedProducts,
  categories,
  suppliers,
  formatMoney,
  getStatusColor,
  handleBulkAction,
  setShowStockAdjustModal,
  setSelectedProductForHistory,
  setShowDeleteConfirmation,
  toggleProductSelection,
  toggleSelectAll,
  productModals,
  navigate,
  deleteProduct
}) => {
  // Format money in short form (e.g., 1.2M, 500K, 1.5B)
  const formatShortMoney = (amount: number): string => {
    if (amount >= 1000000000) {
      return `TSh ${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `TSh ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `TSh ${(amount / 1000).toFixed(1)}K`;
    } else {
      return `TSh ${amount.toFixed(0)}`;
    }
  };

  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<any>(null);
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<any>(null);
  const [bulkActionProgress, setBulkActionProgress] = useState({ current: 0, total: 0, action: '' });
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSKU, setSelectedSKU] = useState<string>('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showStockTransferModal, setShowStockTransferModal] = useState(false);
  const [selectedProductForTransfer, setSelectedProductForTransfer] = useState<any>(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [isPreLoading, setIsPreLoading] = useState(false);
  
  // Column visibility configuration
  const availableColumns = [
    { id: 'product', label: 'Product', required: true },
    { id: 'sku', label: 'SKU', required: false },
    { id: 'category', label: 'Category', required: false },
    { id: 'supplier', label: 'Supplier', required: false },
    { id: 'shelf', label: 'Shelf', required: false },
    { id: 'price', label: 'Price', required: false },
    { id: 'stock', label: 'Stock', required: false },
    { id: 'actions', label: 'Actions', required: true }
  ];
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('inventory-visible-columns');
      return saved ? JSON.parse(saved) : availableColumns.map(col => col.id);
    } catch {
      return availableColumns.map(col => col.id);
    }
  });

  // Improved debug logging for development only - only log once per session
  const [hasLoggedNoProducts, setHasLoggedNoProducts] = useState(false);
  useEffect(() => {
    if (import.meta.env.MODE === 'development' && products?.length === 0 && !hasLoggedNoProducts) {
      console.log('ℹ️ [EnhancedInventoryTab] No products available - this may be normal during initial load or if user is not authenticated');
      console.log('🔍 [EnhancedInventoryTab] Products prop:', products);
      console.log('🔍 [EnhancedInventoryTab] Products type:', typeof products);
      console.log('🔍 [EnhancedInventoryTab] Products length:', products?.length);
      setHasLoggedNoProducts(true);
    } else if (products?.length > 0 && hasLoggedNoProducts) {
      console.log('✅ [EnhancedInventoryTab] Products loaded successfully:', products.length);
      setHasLoggedNoProducts(false); // Reset for future loads
    }
  }, [products, hasLoggedNoProducts]);

  // Log missing product information only when there are significant issues - with session tracking
  const [hasLoggedMissingInfo, setHasLoggedMissingInfo] = useState(false);
  useEffect(() => {
    if (products && products.length > 0 && import.meta.env.MODE === 'development') {
      const validationResult = validateProductsBatch(products);
      
      // Only log if there are significant issues (average completeness < 70%)
      if (validationResult.averageCompleteness < 70 && !hasLoggedMissingInfo) {
        console.log('⚠️ [EnhancedInventoryTab] Product data quality issues detected:', {
          totalProducts: validationResult.totalProducts,
          validProducts: validationResult.validProducts,
          invalidProducts: validationResult.invalidProducts,
          averageCompleteness: validationResult.averageCompleteness,
          commonMissingFields: validationResult.commonMissingFields,
          recommendations: validationResult.recommendations
        });
        
        setHasLoggedMissingInfo(true);
      }
    }
  }, [products, hasLoggedMissingInfo]);
  

  // Card variant state for grid view
  const [cardVariant, setCardVariant] = React.useState<'default' | 'detailed'>('detailed');
  
  // Selection mode state for grid view
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  
  // Grid columns state for compact view - Load from localStorage
  const [gridColumns, setGridColumns] = React.useState(() => {
    try {
      const saved = localStorage.getItem('inventory-grid-columns');
      return saved ? parseInt(saved) : 4;
    } catch {
      return 4;
    }
  });

  // Save grid columns to localStorage whenever it changes
  React.useEffect(() => {
    try {
      localStorage.setItem('inventory-grid-columns', gridColumns.toString());
    } catch (error) {
      console.error('Failed to save grid columns preference:', error);
    }
  }, [gridColumns]);

  // Save visible columns to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('inventory-visible-columns', JSON.stringify(visibleColumns));
    } catch (error) {
      console.error('Failed to save visible columns preference:', error);
    }
  }, [visibleColumns]);

  // Toggle column visibility
  const toggleColumnVisibility = (columnId: string) => {
    const column = availableColumns.find(col => col.id === columnId);
    if (column?.required) return; // Don't toggle required columns
    
    setVisibleColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  // Handler for duplicating a product
  const handleDuplicateProduct = async (product: any) => {
    try {
      // Navigate to add product page with duplicate data
      const duplicateData = {
        ...product,
        name: `${product.name} (Copy)`,
        id: undefined,
        variants: product.variants?.map((v: any, index: number) => ({
          ...v,
          id: undefined,
          sku: `${v.sku}-COPY-${Date.now()}-${index}`,
          name: `${v.name || v.attributes?.color || 'Variant'} (Copy)`
        }))
      };
      
      // Store in sessionStorage and navigate
      sessionStorage.setItem('duplicateProductData', JSON.stringify(duplicateData));
      navigate('/lats/add-product?duplicate=true');
      toast.success('Opening duplicate product form...');
    } catch (error) {
      console.error('Failed to duplicate product:', error);
      toast.error('Failed to duplicate product');
    }
  };

  // Handler for stock transfer
  const handleStockTransfer = (product: any) => {
    try {
      // Prepare product data for pre-selection in stock transfer modal
      const transferProductData = {
        productId: product.id,
        productName: product.name,
        variants: product.variants?.map((v: any) => ({
          id: v.id,
          variant_name: v.name || v.attributes?.color || 'Default',
          sku: v.sku,
          quantity: v.quantity || 0,
          selling_price: v.sellingPrice || v.price || 0,
          cost_price: v.costPrice || 0,
          product_id: product.id,
          product: {
            name: product.name
          }
        })) || []
      };
      
      // Store in sessionStorage for the stock transfer page to pick up
      sessionStorage.setItem('preselectedTransferProduct', JSON.stringify(transferProductData));
      
      // Navigate to stock transfer page - it will auto-open modal with product
      navigate('/lats/stock-transfers?autoOpen=true');
      toast.success(`Product "${product.name}" ready for transfer`);
    } catch (error) {
      console.error('Failed to prepare stock transfer:', error);
      toast.error('Failed to prepare stock transfer');
    }
  };

  // Unified filter component function
  const renderFilterSelect = (
    options: any[],
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    count: number
  ) => (
    <div className="min-w-[120px]">
      <GlassSelect
        options={[
          { value: 'all', label: `All ${placeholder}s` },
          ...(options || []).map(item => ({
            value: item.name,
            label: item.name
          }))
        ]}
        value={value}
        onChange={onChange}
        placeholder={`${placeholder} (${count})`}
      />
    </div>
  );
  return (
    <div className="space-y-6">
      {/* Comprehensive Statistics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <GlassCard className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Products</p>
              <p className="text-2xl font-bold text-blue-900">{metrics.totalItems} <span className="text-sm font-normal text-gray-600">({metrics.activeProducts} active)</span></p>
            </div>
            <div className="p-2 bg-blue-50/20 rounded-full">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">In Stock</p>
              <p className="text-2xl font-bold text-orange-900">{metrics.totalItems - metrics.lowStockItems - metrics.outOfStockItems} <span className="text-sm font-normal text-gray-600">({metrics.lowStockItems} low, {metrics.outOfStockItems} out)</span></p>
            </div>
            <div className="p-2 bg-orange-50/20 rounded-full">
              <CheckCircle className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Reorder Alerts</p>
              <p className="text-2xl font-bold text-red-900">{metrics.reorderAlerts} <span className="text-sm font-normal text-gray-600">(Need attention)</span></p>
            </div>
            <div className="p-2 bg-red-50/20 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Value</p>
              <p className="text-2xl font-bold text-green-900">{formatShortMoney(metrics.totalValue)} <span className="text-sm font-normal text-gray-600">(Cost)</span></p>
            </div>
            <div className="p-2 bg-green-50/20 rounded-full">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Retail Value</p>
              <p className="text-2xl font-bold text-purple-900">{formatShortMoney(metrics.retailValue || 0)} <span className="text-sm font-normal text-gray-600">(Selling)</span></p>
            </div>
            <div className="p-2 bg-purple-50/20 rounded-full">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Minimal Search & Filters */}
      <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-white/20 p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <SearchBar
              onSearch={setSearchQuery}
              placeholder="Search products, SKU, brand..."
              className="w-full"
              suggestions={[
                ...products.map(p => p.name),
                ...products.map(p => p.variants?.[0]?.sku || '').filter(Boolean),

                ...products.map(p => categories.find(c => c.id === p.categoryId)?.name || '').filter(Boolean)
              ]}
              searchKey="enhanced_inventory_search"
            />
          </div>
          
          {/* Category */}
          {renderFilterSelect(
            categories,
            selectedCategory,
            setSelectedCategory,
            'Category',
            categories?.length || 0
          )}



          {/* Status */}
          <div className="min-w-[100px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-white/80 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Sort */}
          <div className="min-w-[100px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-white/80 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="price">Price (High to Low)</option>
              <option value="stock">Stock Level</option>
              <option value="created">Recently Added</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>

          {/* View Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-2 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          >
            {viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}
          </button>

          {/* Card Variant Toggle (only show in grid view) */}
          {viewMode === 'grid' && (
            <button
              onClick={() => setCardVariant(cardVariant === 'detailed' ? 'default' : 'detailed')}
              className="px-2 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              title={`Switch to ${cardVariant === 'detailed' ? 'compact' : 'detailed'} cards`}
            >
              {cardVariant === 'detailed' ? <Package size={16} /> : <Grid size={16} />}
            </button>
          )}

          {/* Column Selector (only show in list view) */}
          {viewMode === 'list' && (
            <button
              onClick={() => setShowColumnSelector(true)}
              className="px-2 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1"
              title="Customize columns"
            >
              <Columns size={16} />
            </button>
          )}

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-600">Low Stock</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={showFeaturedOnly}
                onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-600">Featured</span>
            </label>
          </div>
        </div>
      </div>

      {/* Bulk Actions - Flat Design */}
      {selectedProducts.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Selection Info */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white rounded-full p-2">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-blue-900">
                  {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                </div>
                <div className="text-xs text-blue-700">
                  Choose an action below
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {/* Export */}
              <button
                onClick={() => handleBulkAction('export')}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-md hover:shadow-lg"
                title="Export selected products to CSV"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>

              {/* Feature */}
              <button
                onClick={() => handleBulkAction('feature')}
                className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 active:scale-95 transition-all shadow-md hover:shadow-lg"
                title="Toggle featured status"
              >
                <Star size={16} />
                <span className="hidden sm:inline">Feature</span>
              </button>

              {/* Activate */}
              <button
                onClick={() => handleBulkAction('activate')}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 active:scale-95 transition-all shadow-md hover:shadow-lg"
                title="Activate selected products"
              >
                <CheckSquare size={16} />
                <span className="hidden sm:inline">Activate</span>
              </button>

              {/* Deactivate */}
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 active:scale-95 transition-all shadow-md hover:shadow-lg"
                title="Deactivate selected products"
              >
                <XSquare size={16} />
                <span className="hidden sm:inline">Deactivate</span>
              </button>

              {/* Print Labels */}
              <button
                onClick={() => {
                  // Open label printing modal for first selected product
                  const firstProduct = products.find(p => selectedProducts.includes(p.id));
                  if (firstProduct) {
                    setSelectedProductForLabel({
                      id: firstProduct.id,
                      name: firstProduct.name,
                      sku: firstProduct.variants?.[0]?.sku || firstProduct.id,
                      barcode: firstProduct.variants?.[0]?.sku || firstProduct.id,
                      price: firstProduct.variants?.[0]?.sellingPrice || 0,
                      size: firstProduct.variants?.[0]?.attributes?.size || '',
                      color: firstProduct.variants?.[0]?.attributes?.color || '',
                      brand: firstProduct.brand?.name || '',
                      category: categories.find(c => c.id === firstProduct.categoryId)?.name || ''
                    });
                    setShowLabelModal(true);
                  } else {
                    toast.error('Please select at least one product');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 active:scale-95 transition-all shadow-md hover:shadow-lg"
                title="Print product labels"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Labels</span>
              </button>

              {/* Duplicate */}
              <button
                onClick={() => handleBulkAction('duplicate')}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 active:scale-95 transition-all shadow-md hover:shadow-lg"
                title="Duplicate selected products"
              >
                <Files size={16} />
                <span className="hidden sm:inline">Duplicate</span>
              </button>

              {/* Delete All */}
              <button
                onClick={() => setShowDeleteConfirmation(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 active:scale-95 transition-all shadow-md hover:shadow-lg"
                title="Delete all selected products"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Delete</span>
              </button>

              {/* Clear Selection */}
              <button
                onClick={() => setSelectedProducts([])}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 active:scale-95 transition-all shadow-md hover:shadow-lg"
                title="Clear selection"
              >
                <XCircle size={16} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Display */}
      {viewMode === 'list' ? (
        <GlassCard className="overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200/50">
                  <th className="text-left py-4 px-4 font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                    />
                  </th>
                  {visibleColumns.includes('product') && (
                    <th className="text-left py-4 px-4 font-medium text-gray-700">Product</th>
                  )}
                  {visibleColumns.includes('sku') && (
                    <th className="text-left py-4 px-4 font-medium text-gray-700">SKU</th>
                  )}
                  {visibleColumns.includes('category') && (
                    <th className="text-left py-4 px-4 font-medium text-gray-700">Category</th>
                  )}
                  {visibleColumns.includes('supplier') && (
                    <th className="text-left py-4 px-4 font-medium text-gray-700">Supplier</th>
                  )}
                  {visibleColumns.includes('shelf') && (
                    <th className="text-left py-4 px-4 font-medium text-gray-700">Shelf</th>
                  )}
                  {visibleColumns.includes('price') && (
                    <th className="text-right py-4 px-4 font-medium text-gray-700">Price</th>
                  )}
                  {visibleColumns.includes('stock') && (
                    <th className="text-right py-4 px-4 font-medium text-gray-700">Stock</th>
                  )}
                  {visibleColumns.includes('actions') && (
                    <th className="text-center py-4 px-4 font-medium text-gray-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const category = categories.find(c => c.id === product.categoryId);
                  
                  // Smart variant selection: prefer variant with stock, then highest price
                  const mainVariant = (() => {
                    if (!product.variants || product.variants.length === 0) return null;
                    
                    // Try to find variant with stock
                    const variantWithStock = product.variants.find((v: any) => (v.quantity || 0) > 0);
                    if (variantWithStock) return variantWithStock;
                    
                    // If no stock, use variant with highest price
                    const variantWithPrice = [...product.variants]
                      .sort((a: any, b: any) => (b.sellingPrice || 0) - (a.sellingPrice || 0))[0];
                    if (variantWithPrice && variantWithPrice.sellingPrice > 0) return variantWithPrice;
                    
                    // Fallback to first variant
                    return product.variants[0];
                  })();
                  
                  // Calculate stock: Use variant stock if product HAS variants, otherwise use product-level stock
                  // 🐛 FIX: Don't fallback to product stock when variants exist but have 0 stock
                  const hasVariants = product.variants && product.variants.length > 0;
                  const variantStock = hasVariants ? product.variants.reduce((sum: any, variant: any) => sum + (variant.quantity || 0), 0) : 0;
                  const totalStock = hasVariants ? variantStock : (product.stockQuantity || product.stock_quantity || 0);
                  const reservedStock = product.variants?.reduce((sum: any, variant: any) => sum + (variant.reservedQuantity || variant.reserved_quantity || 0), 0) || 0;
                  const availableStock = totalStock - reservedStock;
                  const stockStatus = availableStock <= 0 ? 'out-of-stock' : availableStock <= 10 ? 'low-stock' : 'in-stock';
                  
                  return (
                    <tr 
                      key={product.id} 
                      className="border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer group"
                      onClick={async () => {
                        console.log('🟢 [Table View] Clicking product row:', product.name, product.id);
                        
                        // Show immediate loading overlay
                        setIsPreLoading(true);
                        
                        try {
                          // 🔧 FETCH FRESH PRODUCT DATA with variant_attributes
                          const freshProduct = await useInventoryStore.getState().getProduct(product.id);
                          console.log('🟢 [Table View] Fresh product result:', {
                            ok: freshProduct?.ok,
                            hasData: !!freshProduct?.data,
                            variantCount: freshProduct?.data?.variants?.length || 0
                          });
                          
                          if (!freshProduct?.ok || !freshProduct?.data) {
                            console.error('❌ [Table View] Failed to fetch product:', freshProduct?.message);
                            setIsPreLoading(false);
                            alert('Failed to load product details. Please try again.');
                            return;
                          }
                          
                          // Allow products without variants - they can be added to POs and variants will be created automatically
                          if (!freshProduct.data.variants || freshProduct.data.variants.length === 0) {
                            console.warn('⚠️ [Table View] Product has no variants - variants will be created automatically when added to PO', freshProduct.data);
                            // Don't block - continue to show product details
                          }
                          
                          setSelectedProductForDetail(freshProduct.data);
                          setShowProductDetailModal(true);
                        } finally {
                          // Hide loading after a short delay to allow modal to appear
                          setTimeout(() => setIsPreLoading(false), 100);
                        }
                      }}
                      title="Click to view product details"
                    >
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={e => { e.stopPropagation(); toggleProductSelection(product.id); }}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                        />
                      </td>
                      {visibleColumns.includes('product') && (
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            {/* Colored Flat Thumbnail */}
                            <div className="relative flex-shrink-0">
                              {product.images && product.images.length > 0 ? (
                                <>
                                  <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-blue-200 bg-white">
                                    <img
                                      src={product.images[0]}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const variantCount = product.variants?.length || 0;
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.innerHTML = `
                                          <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center border-2 border-blue-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500">
                                              <path d="M16.5 9.4 7.55 4.24"></path>
                                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                              <polyline points="3.29 7 12 12 20.71 7"></polyline>
                                              <line x1="12" x2="12" y1="22" y2="12"></line>
                                            </svg>
                                          </div>
                                        `;
                                        // Add badge after error fallback
                                        const badge = document.createElement('div');
                                        badge.className = 'absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center';
                                        badge.innerHTML = '<span class="text-xs font-bold text-white">' + variantCount + '</span>';
                                        e.currentTarget.parentElement!.parentElement!.appendChild(badge);
                                      }}
                                    />
                                  </div>
                                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-10">
                                    <span className="text-xs font-bold text-white">
                                      {product.variants?.length || 0}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center border-2 border-blue-200 relative">
                                  <Package className="w-6 h-6 text-blue-500" strokeWidth={2} />
                                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                                    <span className="text-xs font-bold text-white">
                                      {product.variants?.length || 0}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {product.isFeatured && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                                  <Star className="w-3 h-3 text-white fill-current" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate max-w-[250px]" title={product.name}>{product.name}</p>
                              {product.description && (
                                <p className="text-sm text-gray-500 truncate max-w-[300px]">{product.description}</p>
                              )}
                              {mainVariant?.sku && (
                                <p className="text-xs text-gray-400 mt-0.5">SKU: {mainVariant.sku}</p>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('sku') && (
                        <td className="py-3 px-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSKU(mainVariant?.sku || product.sku || 'N/A');
                              setShowQRModal(true);
                            }}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                            title="View QR Code"
                          >
                            <QrCode size={18} />
                          </button>
                        </td>
                      )}
                      {visibleColumns.includes('category') && (
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white shadow-sm inline-block max-w-[150px] truncate" title={category?.name || 'Uncategorized'}>
                            {category?.name || 'Uncategorized'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('supplier') && (
                        <td className="py-3 px-4">
                          {(() => {
                            // Look up supplier from suppliers list using supplierId
                            const supplier = product.supplierId 
                              ? suppliers.find(s => s.id === product.supplierId)
                              : product.supplier; // Fallback to embedded supplier object
                            
                            if (supplier?.name?.startsWith('Trade-In:')) {
                              return (
                                <div>
                                  <span className="text-sm font-medium text-blue-600">
                                    {supplier.name.replace('Trade-In: ', '')}
                                  </span>
                                  <div className="text-xs text-gray-500">Trade-In Customer</div>
                                </div>
                              );
                            }
                            
                            return (
                              <span className="text-sm text-gray-600">{supplier?.name || 'N/A'}</span>
                            );
                          })()}
                        </td>
                      )}
                      {visibleColumns.includes('shelf') && (
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            {product.shelfName || product.shelfCode || 'N/A'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('price') && (
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{formatMoney(mainVariant?.sellingPrice || 0)}</p>
                            {mainVariant?.costPrice && (
                              <p className="text-xs text-gray-500">Cost: {formatMoney(mainVariant.costPrice)}</p>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('stock') && (
                        <td className="py-3 px-4">
                          <div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm inline-block max-w-[120px] truncate ${
                              stockStatus === 'out-of-stock' 
                                ? 'bg-red-500 text-white' 
                                : stockStatus === 'low-stock'
                                ? 'bg-orange-500 text-white'
                                : 'bg-green-500 text-white'
                            }`} title={`${availableStock} in stock${reservedStock > 0 ? ` (${reservedStock} reserved)` : ''}`}>
                              {availableStock} in stock
                            </span>
                            {reservedStock > 0 && (
                              <p className="text-xs text-gray-500 mt-1 truncate max-w-[120px]" title={`${reservedStock} reserved`}>{reservedStock} reserved</p>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('actions') && (
                        <td className="py-3 px-4 text-center">
                        <div className="relative">
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setOpenDropdownId(openDropdownId === product.id ? null : product.id);
                            }}
                            className="p-2 text-gray-600 hover:text-white hover:bg-blue-500 rounded-lg transition-all duration-200 hover:shadow-md"
                            title="Actions"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {openDropdownId === product.id && (
                            <>
                              {/* Backdrop to close dropdown */}
                              <div 
                                className="fixed inset-0 z-[998]" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                }}
                              />
                              
                              {/* Dropdown Content */}
                              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-[999] overflow-hidden">
                                <div className="py-2">
                                  <button
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      navigate(`/lats/products/${product.id}/edit`);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-3 transition-all duration-200 group"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center transition-colors">
                                      <Edit className="w-4 h-4 text-blue-600 group-hover:text-white" />
                                    </div>
                                    <span className="font-medium group-hover:text-blue-600">Edit Product</span>
                                  </button>
                                  <button
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      // 🔧 FETCH FRESH PRODUCT DATA with variant_attributes
                                      const freshProduct = await useInventoryStore.getState().getProduct(product.id);
                                      setSelectedProductForDetail(freshProduct || product);
                                      setShowProductDetailModal(true);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-green-50 flex items-center gap-3 transition-all duration-200 group"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-green-100 group-hover:bg-green-500 flex items-center justify-center transition-colors">
                                      <Eye className="w-4 h-4 text-green-600 group-hover:text-white" />
                                    </div>
                                    <span className="font-medium group-hover:text-green-600">View Details</span>
                                  </button>
                                  
                                  <div className="my-1 border-t border-gray-100"></div>
                                  
                                  <button
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setSelectedProductForHistory(product.id);
                                      setShowStockAdjustModal(true);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-3 transition-all duration-200 group"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-orange-100 group-hover:bg-orange-500 flex items-center justify-center transition-colors">
                                      <Calculator className="w-4 h-4 text-orange-600 group-hover:text-white" />
                                    </div>
                                    <span className="font-medium group-hover:text-orange-600">Adjust Stock</span>
                                  </button>
                                  <button
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setSelectedProductForLabel({
                                        id: product.id,
                                        name: product.name,
                                        sku: product.variants?.[0]?.sku || product.id,
                                        barcode: product.variants?.[0]?.sku || product.id,
                                        price: product.variants?.[0]?.sellingPrice || 0,
                                        size: product.variants?.[0]?.attributes?.size || '',
                                        color: product.variants?.[0]?.attributes?.color || '',
                                        brand: product.brand?.name || '',
                                        category: categories.find(c => c.id === product.categoryId)?.name || ''
                                      });
                                      setShowLabelModal(true);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-3 transition-all duration-200 group"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 group-hover:bg-purple-500 flex items-center justify-center transition-colors">
                                      <Printer className="w-4 h-4 text-purple-600 group-hover:text-white" />
                                    </div>
                                    <span className="font-medium group-hover:text-purple-600">Print Label</span>
                                  </button>
                                  
                                  <div className="my-1 border-t border-gray-100"></div>
                                  
                                  <button
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleStockTransfer(product);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-indigo-50 flex items-center gap-3 transition-all duration-200 group"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 group-hover:bg-indigo-500 flex items-center justify-center transition-colors">
                                      <ArrowRightLeft className="w-4 h-4 text-indigo-600 group-hover:text-white" />
                                    </div>
                                    <span className="font-medium group-hover:text-indigo-600">Stock Transfer</span>
                                  </button>
                                  <button
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleDuplicateProduct(product);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-teal-50 flex items-center gap-3 transition-all duration-200 group"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-teal-100 group-hover:bg-teal-500 flex items-center justify-center transition-colors">
                                      <Copy className="w-4 h-4 text-teal-600 group-hover:text-white" />
                                    </div>
                                    <span className="font-medium group-hover:text-teal-600">Duplicate</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      ) : (
        /* Grid View */
        <>
          {/* Grid View Action Bar */}
          <GlassCard className="mb-4 bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200">
            <div className="flex items-center justify-between">
              {/* Left: Product Count */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-900">
                    {products.length} Products
                  </span>
                </div>
                
                {selectedProducts.length > 0 && (
                  <>
                    <div className="w-px h-6 bg-gray-300"></div>
                    <span className="text-sm font-medium text-blue-600">
                      {selectedProducts.length} Selected
                    </span>
                  </>
                )}
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Enable/Disable Selection Mode */}
                {!isSelectionMode ? (
                  <button
                    onClick={() => setIsSelectionMode(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 border border-blue-600 rounded-lg transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Select
                  </button>
                ) : (
                  <>
                    {/* Select All Button - Only show in selection mode */}
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                    >
                      {selectedProducts.length === products.length && products.length > 0 ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Select All
                        </>
                      )}
                    </button>

                    {/* Cancel Selection Mode */}
                    <button
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedProducts([]);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white text-red-600 hover:bg-red-50 border border-red-300 rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                  </>
                )}

                {/* Grid Columns Input - Only show in compact mode */}
                {cardVariant === 'default' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Per Row:</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={gridColumns}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1 && value <= 12) {
                          setGridColumns(value);
                        }
                      }}
                      className="w-16 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Card Variant Toggle */}
                <button
                  onClick={() => setCardVariant(cardVariant === 'detailed' ? 'default' : 'detailed')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                  title={`Switch to ${cardVariant === 'detailed' ? 'compact' : 'detailed'} view`}
                >
                  {cardVariant === 'detailed' ? (
                    <>
                      <Grid className="w-4 h-4" />
                      Compact
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      Detailed
                    </>
                  )}
                </button>
              </div>
            </div>
          </GlassCard>

          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: cardVariant === 'detailed'
                ? 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))'
                : `repeat(${gridColumns}, minmax(0, 1fr))`,
              gap: 'clamp(0.75rem, 2vw, 1rem)',
              gridAutoRows: '1fr'
            }}
          >
          {products.map((product) => {
            const category = categories.find(c => c.id === product.categoryId);
            const brand = product.brand;
            
            return (
              <VariantProductCard
                key={product.id}
                product={{
                  ...product,
                  categoryName: category?.name,
                  brandName: brand?.name
                }}
                className="w-full h-full"
                onView={async (product) => {
                  console.log('🔵 [Grid View] Clicking product:', product.name, product.id);
                  
                  // Show immediate loading overlay
                  setIsPreLoading(true);
                  
                  try {
                    // 🔧 FETCH FRESH PRODUCT DATA with variant_attributes
                    const freshProduct = await useInventoryStore.getState().getProduct(product.id);
                    console.log('🔵 [Grid View] Fresh product result:', {
                      ok: freshProduct?.ok,
                      hasData: !!freshProduct?.data,
                      variantCount: freshProduct?.data?.variants?.length || 0
                    });
                    
                    if (!freshProduct?.ok || !freshProduct?.data) {
                      console.error('❌ [Grid View] Failed to fetch product:', freshProduct?.message);
                      setIsPreLoading(false);
                      alert('Failed to load product details. Please try again.');
                      return;
                    }
                    
                    // Allow products without variants - they can be added to POs and variants will be created automatically
                    if (!freshProduct.data.variants || freshProduct.data.variants.length === 0) {
                      console.warn('⚠️ [Grid View] Product has no variants - variants will be created automatically when added to PO', freshProduct.data);
                      // Don't block - continue to show product details
                    }
                    
                    setSelectedProductForDetail(freshProduct.data);
                    setShowProductDetailModal(true);
                  } finally {
                    // Hide loading after a short delay to allow modal to appear
                    setTimeout(() => setIsPreLoading(false), 100);
                  }
                }}
                onEdit={(product) => {
                  navigate(`/lats/products/${product.id}/edit`);
                }}
                onDelete={(product) => {
                  if (confirm('Are you sure you want to delete this product?')) {
                    deleteProduct(product.id);
                  }
                }}
                showActions={true}
                variant={cardVariant}
                // Selection props
                isSelected={selectedProducts.includes(product.id)}
                onSelect={toggleProductSelection}
                showCheckbox={isSelectionMode}
              />
            );
          })}
          </div>
        </>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <GlassCard className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your search or filter criteria</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <GlassButton
              onClick={() => navigate('/lats/add-product')}
              icon={<Package size={18} />}
            >
              Add Your First Product
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Label Printing Modal */}
      {selectedProductForLabel && (
        <LabelPrintingModal
          isOpen={showLabelModal}
          onClose={() => {
            setShowLabelModal(false);
            setSelectedProductForLabel(null);
          }}
          product={selectedProductForLabel}
          formatMoney={formatMoney}
        />
      )}

      {/* Product Detail Modal - Using ProductModal */}
      {selectedProductForDetail && (
        <ProductModal
          isOpen={showProductDetailModal}
          onClose={() => {
            setShowProductDetailModal(false);
            setSelectedProductForDetail(null);
          }}
          product={selectedProductForDetail}
          onEdit={(product) => {
            setShowProductDetailModal(false);
            setSelectedProductForDetail(null);
            navigate(`/lats/products/${product.id}/edit`);
          }}
        />
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            {/* Modal Content */}
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Product QR Code</h3>
              
              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block mb-4">
                <QRCodeSVG value={selectedSKU} size={200} level="H" />
              </div>
              
              {/* SKU Text */}
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">SKU</p>
                <p className="font-mono text-lg font-semibold text-gray-900">{selectedSKU}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Column Selector Popup Modal */}
      {showColumnSelector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowColumnSelector(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Columns className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Customize Columns</h3>
                <p className="text-sm text-gray-500">Choose which columns to display in the table</p>
              </div>
            </div>

            {/* Column Options */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableColumns.map((column) => (
                <label
                  key={column.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                    column.required 
                      ? 'cursor-not-allowed bg-gray-50 border-gray-200' 
                      : 'cursor-pointer hover:bg-blue-50 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.id)}
                    onChange={() => toggleColumnVisibility(column.id)}
                    disabled={column.required}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">
                      {column.label}
                    </span>
                    {column.required && (
                      <span className="text-xs text-gray-500 ml-2">(always visible)</span>
                    )}
                  </div>
                  {column.required && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </label>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setVisibleColumns(availableColumns.map(col => col.id));
                  toast.success('All columns enabled');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Show All Columns
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowColumnSelector(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowColumnSelector(false)}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Loading Overlay - Shows immediately when clicking a product */}
      {isPreLoading && <ModernLoadingOverlay />}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedEnhancedInventoryTab = memo(EnhancedInventoryTab, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders when data hasn't actually changed
  const propsToCompare = [
    'products', 'metrics', 'categories', 'suppliers', 'selectedProducts',
    'selectedCategory', 'selectedStatus', 'showLowStockOnly',
    'showFeaturedOnly', 'viewMode', 'sortBy'
  ];
  
  for (const prop of propsToCompare) {
    if ((prevProps as any)[prop] !== (nextProps as any)[prop]) {
      return false; // Allow re-render
    }
  }
  
  return true; // Prevent re-render
});

export default MemoizedEnhancedInventoryTab;
