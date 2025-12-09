import React, { useState, useEffect, memo } from 'react';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassButton from '../../../shared/components/ui/GlassButton';
import SearchBar from '../../../shared/components/ui/SearchBar';
import GlassSelect from '../../../shared/components/ui/GlassSelect';
import CircularProgress from '../../../../components/ui/CircularProgress';
import { useLoadingJob } from '../../../../hooks/useLoadingJob';
import { ProductGridSkeleton } from '../../../../components/ui/SkeletonLoaders';
import ModernLoadingOverlay from '../../../../components/ui/ModernLoadingOverlay';
import VariantProductCard from '../pos/VariantProductCard';
import { SafeImage } from '../../../../components/SafeImage';
import { ProductImage } from '../../../../lib/robustImageService';
import { LabelPrintingModal } from '../../../../components/LabelPrintingModal';
import ProductModal from '../product/ProductModal';
import {
  Package, Grid, List, Star, CheckCircle, XCircle,
  Download, Edit, Eye, Trash2, DollarSign, TrendingUp,
  AlertTriangle, Calculator, Printer, QrCode, X, MoreVertical, ArrowRightLeft, Copy,
  CheckSquare, XSquare, Files, ShoppingCart, Plus, Search, ChevronDown, ChevronUp, ChevronRight
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
  onAddProduct?: () => void; // Optional callback to open add product modal
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
  searchQuery,
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
  deleteProduct,
  onAddProduct
}) => {
  // 🔍 DEBUG: Log products received
  useEffect(() => {
    if (import.meta.env.MODE === 'development') {
      console.log(`🔍 [EnhancedInventoryTab] Received ${products.length} products to display`);
      if (products.length > 0) {
        const productsWithVariants = products.filter(p => p.variants && p.variants.length > 0).length;
        const productsWithoutVariants = products.length - productsWithVariants;
        console.log(`🔍 [EnhancedInventoryTab] Products breakdown: ${productsWithVariants} with variants, ${productsWithoutVariants} without variants`);
        console.log(`🔍 [EnhancedInventoryTab] First 5 products:`, products.slice(0, 5).map(p => ({
          name: p.name,
          variantCount: p.variants?.length || 0,
          stock: p.variants?.reduce((sum, v) => sum + (v.quantity || 0), 0) || 0
        })));
      }
    }
  }, [products]);

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
  const [isPreLoading, setIsPreLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Single expandable filters panel state
  const [showFilters, setShowFilters] = useState(false);
  
  // Toggle row expansion
  const toggleRowExpansion = (productId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };
  

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
  

  // Selection mode state for grid view
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);


  // Handler for duplicating a product
  const handleDuplicateProduct = async (product: any) => {
    try {
      // Prepare duplicate data - SKUs will be generated on the AddProductPage
      const duplicateData = {
        ...product,
        name: `${product.name} (Copy)`,
        id: undefined, // Remove ID so it creates a new product
        sku: undefined, // Will be auto-generated
        // Preserve variant data structure (SKUs will be regenerated)
        variants: product.variants?.map((v: any) => ({
          ...v,
          id: undefined, // Remove variant ID
          sku: undefined, // Will be auto-generated
          name: v.name || v.variant_name || v.attributes?.color || 'Variant',
          // Preserve all other variant properties
          costPrice: v.costPrice || v.cost_price || 0,
          sellingPrice: v.sellingPrice || v.selling_price || 0,
          quantity: 0, // Reset quantity for duplicate
          attributes: v.attributes || {},
          specification: v.specification || ''
        }))
      };
      
      // Store in sessionStorage and open modal
      sessionStorage.setItem('duplicateProductData', JSON.stringify(duplicateData));
      if (onAddProduct) {
        onAddProduct();
      } else {
        navigate('/lats/add-product?duplicate=true');
      }
      toast.success('Opening duplicate product form with new SKUs...', { duration: 2000 });
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
    <div className="space-y-0">
      {/* Fixed Statistics Section - Matching PurchaseOrdersPage */}
      <div className="p-6 pb-0 flex-shrink-0">
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
            gap: '1rem'
          }}
        >
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md relative">
            <div className="absolute top-3 right-3 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalItems}</p>
              <p className="text-xs text-gray-500 mt-1">{metrics.activeProducts} active</p>
            </div>
          </div>
          
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md relative">
            <div className="absolute top-3 right-3 w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-lg">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">In Stock</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalItems - metrics.lowStockItems - metrics.outOfStockItems}</p>
              <p className="text-xs text-gray-500 mt-1">{metrics.lowStockItems} low, {metrics.outOfStockItems} out</p>
            </div>
          </div>
          
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 hover:bg-red-100 hover:border-red-300 transition-all shadow-sm hover:shadow-md relative">
            <div className="absolute top-3 right-3 w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Reorder Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.reorderAlerts}</p>
              <p className="text-xs text-gray-500 mt-1">Need attention</p>
            </div>
          </div>
          
          <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 hover:bg-purple-100 hover:border-purple-300 transition-all shadow-sm hover:shadow-md relative">
            <div className="absolute top-3 right-3 w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatShortMoney(metrics.totalValue)}</p>
              <p className="text-xs text-gray-500 mt-1">Cost</p>
            </div>
          </div>
          
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 hover:bg-orange-100 hover:border-orange-300 transition-all shadow-sm hover:shadow-md relative">
            <div className="absolute top-3 right-3 w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Retail Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatShortMoney(metrics.retailValue || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Selling</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Search and Filters Section - Matching PurchaseOrdersPage */}
      <div className="p-6 pb-0 flex-shrink-0 border-t border-gray-100 bg-white">
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            {/* Search Bar and Buttons Row */}
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
              {/* Bigger Search Bar - Takes most space */}
              <div className="flex-1 w-full lg:w-auto">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products, SKU, brand, category..."
                    className="w-full py-4 pl-14 pr-12 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 bg-white font-medium"
                  />
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                    <Search size={24} />
                  </span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-2"
                      aria-label="Clear search"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>

              {/* Right Side: Filters Button and View Controls */}
              <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                {/* Filters Toggle Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-medium whitespace-nowrap ${
                    showFilters
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <span>Filters</span>
                  {showFilters ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                  {/* Active filters count badge */}
                  {(selectedCategory !== 'all' || selectedStatus !== 'all' || showLowStockOnly || showFeaturedOnly) && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      showFilters ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                    }`}>
                      {[
                        selectedCategory !== 'all' && '1',
                        selectedStatus !== 'all' && '1',
                        showLowStockOnly && '1',
                        showFeaturedOnly && '1'
                      ].filter(Boolean).length}
                    </span>
                  )}
                </button>

                {/* View Toggle */}
                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className={`px-4 py-3 rounded-xl border-2 transition-all font-medium whitespace-nowrap ${
                    viewMode === 'list'
                      ? 'bg-gray-600 text-white border-gray-600 shadow-md'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                  title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
                >
                  {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
                </button>


              </div>
            </div>

            {/* Active filters summary (when collapsed) - Below search bar */}
            {!showFilters && (selectedCategory !== 'all' || selectedStatus !== 'all' || showLowStockOnly || showFeaturedOnly) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedCategory !== 'all' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                    {selectedCategory.length > 15 ? selectedCategory.substring(0, 15) + '...' : selectedCategory}
                  </span>
                )}
                {selectedStatus !== 'all' && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium capitalize">
                    {selectedStatus.replace('-', ' ')}
                  </span>
                )}
                {showLowStockOnly && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-medium">
                    Low
                  </span>
                )}
                {showFeaturedOnly && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs font-medium">
                    ⭐
                  </span>
                )}
              </div>
            )}

            {/* Filters Panel */}
            <div className="w-full">

              {/* Expanded Filters Panel - Compact Inline Layout */}
              {showFilters && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl border-2 border-gray-200">
                  {/* Compact Inline Layout - All filters in one row when possible */}
                  <div className="space-y-3">
                    {/* Row 1: Status, Sort, Quick Filters - Inline */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Status Filter */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Status:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {['all', 'in-stock', 'low-stock', 'out-of-stock'].map((status) => (
                            <button
                              key={status}
                              onClick={() => setSelectedStatus(status)}
                              className={`px-3 py-1.5 rounded-lg border-2 transition-all font-medium text-xs capitalize whitespace-nowrap ${
                                selectedStatus === status
                                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-300 hover:bg-green-50'
                              }`}
                            >
                              {status.replace('-', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-6 w-px bg-gray-300"></div>

                      {/* Sort Filter */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Sort:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { value: 'name', label: 'Name' },
                            { value: 'price', label: 'Price' },
                            { value: 'stock', label: 'Stock' },
                            { value: 'created', label: 'Newest' },
                            { value: 'updated', label: 'Updated' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setSortBy(option.value)}
                              className={`px-3 py-1.5 rounded-lg border-2 transition-all font-medium text-xs whitespace-nowrap ${
                                sortBy === option.value
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300 hover:bg-purple-50'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-6 w-px bg-gray-300"></div>

                      {/* Quick Filters */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Quick:</span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                            className={`px-3 py-1.5 rounded-lg border-2 transition-all font-medium text-xs whitespace-nowrap ${
                              showLowStockOnly
                                ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300 hover:bg-orange-50'
                            }`}
                          >
                            Low Stock
                          </button>
                          <button
                            onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
                            className={`px-3 py-1.5 rounded-lg border-2 transition-all font-medium text-xs whitespace-nowrap ${
                              showFeaturedOnly
                                ? 'bg-yellow-600 text-white border-yellow-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-300 hover:bg-yellow-50'
                            }`}
                          >
                            Featured
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Category Filter - Compact Inline */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                        Category <span className="text-gray-400 font-normal">({categories.length}):</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-2 flex-1">
                        <button
                          onClick={() => setSelectedCategory('all')}
                          className={`px-3 py-1.5 rounded-lg border-2 transition-all font-medium text-xs flex-shrink-0 whitespace-nowrap ${
                            selectedCategory === 'all'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          All
                        </button>
                        {categories.slice(0, 40).map((category) => (
                          <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.name)}
                            className={`px-3 py-1.5 rounded-lg border-2 transition-all font-medium text-xs flex-shrink-0 whitespace-nowrap ${
                              selectedCategory === category.name
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Scrollable Products Display - Matching PurchaseOrdersPage */}
      <div className="flex-1 overflow-y-auto px-6 py-6 border-t border-gray-100">
        {/* Bulk Actions - Inside scrollable area */}
        {selectedProducts.length > 0 && (
          <div className="mb-4">
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

                  {/* Print Labels */}
                  <button
                    onClick={() => {
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
          </div>
        )}
        {/* Products Display */}
        {viewMode === 'list' ? (
          <div className="space-y-3">
            {products.map((product) => {
              // Debug: Log first product's data structure
              if (products.indexOf(product) === 0 && import.meta.env.MODE === 'development') {
                console.log('🔍 [EnhancedInventoryTab] First product data:', {
                  id: product.id,
                  name: product.name,
                  sku: product.sku,
                  categoryId: product.categoryId,
                  supplierId: product.supplierId,
                  shelfId: product.shelfId,
                  shelfName: product.shelfName,
                  shelfCode: product.shelfCode,
                  productPrice: product.price,
                  productSellingPrice: product.sellingPrice,
                  variants: product.variants?.length || 0,
                  variantPrices: product.variants?.map((v: any) => ({
                    sku: v.sku,
                    sellingPrice: v.sellingPrice,
                    price: v.price,
                    costPrice: v.costPrice
                  })) || [],
                  category: product.category,
                  supplier: product.supplier,
                  categoriesAvailable: categories.length,
                  suppliersAvailable: suppliers.length
                });
              }

              const category = product.category || categories.find(c => c.id === product.categoryId);

              // Smart variant selection: prefer variant with stock, then highest price
              const mainVariant = (() => {
                if (!product.variants || product.variants.length === 0) return null;

                // Try to find variant with stock
                const variantWithStock = product.variants.find((v: any) => (v.quantity || 0) > 0);
                if (variantWithStock) return variantWithStock;

                // Fallback to first variant
                return product.variants[0];
              })();

              // Get best available price from all variants or product level
              const getBestPrice = () => {
                // First, try mainVariant price (check all price fields)
                if (mainVariant) {
                  if (mainVariant.sellingPrice > 0) return mainVariant.sellingPrice;
                  if (mainVariant.price > 0) return mainVariant.price;
                  if (mainVariant.unit_price > 0) return mainVariant.unit_price;
                  if ((mainVariant as any).selling_price > 0) return (mainVariant as any).selling_price;
                }

                // Try all variants to find any with a price
                if (product.variants && product.variants.length > 0) {
                  for (const variant of product.variants) {
                    if (variant.sellingPrice > 0) return variant.sellingPrice;
                    if (variant.price > 0) return variant.price;
                    if (variant.unit_price > 0) return variant.unit_price;
                    if ((variant as any).selling_price > 0) return (variant as any).selling_price;
                  }
                }

                // Fallback to product-level price (check all price fields)
                if (product.price > 0) return product.price;
                if (product.sellingPrice > 0) return product.sellingPrice;
                if ((product as any).unit_price > 0) return (product as any).unit_price;
                if ((product as any).selling_price > 0) return (product as any).selling_price;

                return 0;
              };

              const displayPrice = getBestPrice();

              // Calculate stock: Use variant stock if product HAS variants, otherwise use product-level stock
              // 🐛 FIX: Don't fallback to product stock when variants exist but have 0 stock
              // ✅ FIX: Exclude IMEI child variants from stock calculation (they are counted as part of parent)
              const hasVariants = product.variants && product.variants.length > 0;
              const variantStock = hasVariants ? product.variants
                .filter((variant: any) => {
                  // Exclude IMEI child variants - they should not be counted separately
                  const isImeiChild = variant.parent_variant_id ||
                                variant.parentVariantId ||
                                variant.variant_type === 'imei_child' ||
                                variant.variantType === 'imei_child' ||
                                (variant.name && variant.name.toLowerCase().includes('imei:'));
                  return !isImeiChild;
                })
                .reduce((sum: any, variant: any) => sum + (variant.quantity || 0), 0) : 0;
              const totalStock = hasVariants ? variantStock : (product.stockQuantity || product.stock_quantity || 0);
              const reservedStock = product.variants?.reduce((sum: any, variant: any) => sum + (variant.reservedQuantity || variant.reserved_quantity || 0), 0) || 0;
              const availableStock = totalStock - reservedStock;
              const stockStatus = availableStock <= 0 ? 'out-of-stock' : availableStock <= 10 ? 'low-stock' : 'in-stock';

              // ✅ IMPORTANT: Show products even if they have no variants in current branch
              // This allows shared products to be visible even when inventory is isolated
              // Products will show with 0 stock if they have no variants in the current branch

              const isExpanded = expandedRows.has(product.id);

              return (
                <div
                  key={product.id}
                  className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg cursor-pointer relative ${
                    isExpanded
                      ? 'border-blue-500 shadow-xl'
                      : 'border-gray-200 hover:border-blue-400'
                  }`}
                >
                  {/* Mobile Card View - shown on small screens */}
                  <div className="md:hidden p-4">
                    <div className="space-y-3">
                      {/* Product Name and Status */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                            <Package className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm">{product.name}</h3>
                            <p className="text-xs text-gray-500">{mainVariant?.sku || product.sku || 'No SKU'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleProductSelection(product.id);
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${stockStatus === 'out-of-stock' ? 'bg-red-500 text-white' : stockStatus === 'low-stock' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
                            {availableStock} in stock
                          </span>
                        </div>
                      </div>

                      {/* Category and Price */}
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white shadow-sm inline-block max-w-[120px] truncate" title={category?.name || 'Uncategorized'}>
                          {category?.name || 'Uncategorized'}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {displayPrice > 0 ? formatMoney(displayPrice) : 'No price'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpansion(product.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                        >
                          <span>Actions</span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>

                      {/* Expanded Actions */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 pt-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsPreLoading(true);
                                try {
                                  const freshProduct = await useInventoryStore.getState().getProduct(product.id);
                                  if (freshProduct?.ok && freshProduct?.data) {
                                    setSelectedProductForDetail(freshProduct.data);
                                    setShowProductDetailModal(true);
                                  }
                                } finally {
                                  setTimeout(() => setIsPreLoading(false), 100);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs"
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                productModals.openEditModal(product.id);
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-xs"
                            >
                              <Edit size={14} />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProductForHistory(product.id);
                                setShowStockAdjustModal(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-xs"
                            >
                              <Calculator size={14} />
                              <span>Stock</span>
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
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-xs"
                            >
                              <Printer size={14} />
                              <span>Label</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop List View - Expandable - shown on md+ screens */}
                  <div className="hidden md:block w-full">
                    {/* Header - Clickable */}
                    <div
                      className="flex items-start justify-between p-6 cursor-pointer"
                      onClick={() => toggleRowExpansion(product.id)}
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Checkbox and Expand/Collapse */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleProductSelection(product.id);
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />

                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            isExpanded ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                          }`}>
                            <ChevronDown
                              className={`w-5 h-5 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </div>

                        {/* Product Image/Icon */}
                        <div className="relative flex-shrink-0">
                          {product.images && product.images.length > 0 ? (
                            <>
                              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-blue-200 bg-white">
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const variantCount = product.variants?.length || 0;
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `
                                        <div class="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center border-2 border-blue-200">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500">
                                            <path d="M16.5 9.4 7.55 4.24"></path>
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                            <polyline points="3.29 7 12 12 20.71 7"></polyline>
                                            <line x1="12" x2="12" y1="22" y2="12"></line>
                                          </svg>
                                        </div>
                                      `;
                                      // Add badge after error fallback
                                      const grandParent = parent.parentElement;
                                      if (grandParent) {
                                        const badge = document.createElement('div');
                                        badge.className = 'absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center';
                                        badge.innerHTML = '<span class="text-xs font-bold text-white">' + variantCount + '</span>';
                                        grandParent.appendChild(badge);
                                      }
                                    }
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
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white relative">
                              <Package className="w-7 h-7" strokeWidth={2} />
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

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Product Name and Status Row */}
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <h3 className="text-xl font-bold text-gray-900 truncate">{product.name}</h3>

                            {/* Status Badge */}
                            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${
                              stockStatus === 'out-of-stock'
                                ? 'bg-red-500 text-white'
                                : stockStatus === 'low-stock'
                                ? 'bg-orange-500 text-white'
                                : 'bg-green-500 text-white'
                            } flex items-center gap-2 flex-shrink-0`}>
                              {availableStock} in stock
                            </span>
                          </div>

                          {/* Info Badges Row */}
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* SKU Badge */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                                {mainVariant?.sku || product.sku || 'No SKU'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSKU(mainVariant?.sku || product.sku || 'N/A');
                                  setShowQRModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                title="View QR Code"
                              >
                                <QrCode size={16} />
                              </button>
                            </div>

                            {/* Category Badge */}
                            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-500 text-white shadow-sm inline-block max-w-[150px] truncate" title={category?.name || 'Uncategorized'}>
                              {category?.name || (product.categoryId ? 'Loading...' : 'Uncategorized')}
                            </span>

                            {/* Price */}
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-gray-900">
                                {displayPrice > 0 ? formatMoney(displayPrice) : (
                                  <span className="text-gray-400 italic">No price set</span>
                                )}
                              </span>
                              {(mainVariant?.costPrice || product.costPrice) > 0 && (
                                <span className="text-sm text-gray-600">
                                  (Cost: {formatMoney(mainVariant?.costPrice || product.costPrice || 0)})
                                </span>
                              )}
                            </div>

                            {/* Supplier */}
                            {(() => {
                              const supplier = product.supplier
                                || (product.supplierId ? suppliers.find(s => s.id === product.supplierId) : null);

                              if (supplier?.name?.startsWith('Trade-In:')) {
                                return (
                                  <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-lg text-sm">
                                    <span className="font-medium">{supplier.name.replace('Trade-In: ', '')}</span>
                                    <span className="text-xs ml-1">(Trade-In)</span>
                                  </div>
                                );
                              }

                              return supplier?.name ? (
                                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                                  {supplier.name}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Actions */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-blue-50/50 px-6 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Primary Actions */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setIsPreLoading(true);
                              try {
                                const freshProduct = await useInventoryStore.getState().getProduct(product.id);
                                if (freshProduct?.ok && freshProduct?.data) {
                                  setSelectedProductForDetail(freshProduct.data);
                                  setShowProductDetailModal(true);
                                }
                              } finally {
                                setTimeout(() => setIsPreLoading(false), 100);
                              }
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                            title="View Details"
                          >
                            <Eye size={16} />
                            <span>View Details</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              productModals.openEditModal(product.id);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm shadow-sm"
                            title="Edit Product"
                          >
                            <Edit size={16} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductForHistory(product.id);
                              setShowStockAdjustModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm shadow-sm"
                            title="Adjust Stock"
                          >
                            <Calculator size={16} />
                            <span>Adjust Stock</span>
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
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm shadow-sm"
                            title="Print Label"
                          >
                            <Printer size={16} />
                            <span>Print Label</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStockTransfer(product);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
                            title="Stock Transfer"
                          >
                            <ArrowRightLeft size={16} />
                            <span>Stock Transfer</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateProduct(product);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm shadow-sm"
                            title="Duplicate Product"
                          >
                            <Copy size={16} />
                            <span>Duplicate</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSKU(mainVariant?.sku || product.sku || 'N/A');
                              setShowQRModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm shadow-sm"
                            title="View QR Code"
                          >
                            <QrCode size={16} />
                            <span>QR Code</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      ) : (
        /* Grid View */
        <>
          {/* Grid View Action Bar - Redesigned */}
          <div className="mb-4 bg-white rounded-lg border border-gray-200 shadow-sm p-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Left: Product Count & Selection Info */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    {products.length} {products.length === 1 ? 'Product' : 'Products'}
                  </span>
                </div>
                
                {selectedProducts.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-md border border-blue-200">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">
                      {selectedProducts.length} Selected
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Selection Mode Toggle */}
                {!isSelectionMode ? (
                  <button
                    onClick={() => setIsSelectionMode(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Select</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                    >
                      {selectedProducts.length === products.length && products.length > 0 ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Deselect All</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Select All</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedProducts([]);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white text-red-600 hover:bg-red-50 border border-red-300 rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Cancel</span>
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>

          <div 
            className="flex flex-col gap-4"
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
                className="w-full"
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
                    // No warning needed - this is expected behavior
                    
                    setSelectedProductForDetail(freshProduct.data);
                    setShowProductDetailModal(true);
                  } finally {
                    // Hide loading after a short delay to allow modal to appear
                    setTimeout(() => setIsPreLoading(false), 100);
                  }
                }}
                onEdit={(product) => {
                  productModals.openEditModal(product.id);
                }}
                onDelete={(product) => {
                  if (confirm('Are you sure you want to delete this product?')) {
                    deleteProduct(product.id);
                  }
                }}
                onAdjustStock={(product) => {
                  setSelectedProductForHistory(product.id);
                  setShowStockAdjustModal(true);
                }}
                onDuplicate={(product) => {
                  handleDuplicateProduct(product);
                }}
                onTransfer={(product) => {
                  handleStockTransfer(product);
                }}
                onPrintLabel={(product) => {
                  const firstVariant = product.variants?.[0];
                  setSelectedProductForLabel({
                    id: product.id,
                    name: product.name,
                    sku: firstVariant?.sku || product.id,
                    barcode: firstVariant?.sku || product.id,
                    price: firstVariant?.sellingPrice || 0,
                    size: firstVariant?.attributes?.size || '',
                    color: firstVariant?.attributes?.color || '',
                    brand: product.brand?.name || '',
                    category: categories.find(c => c.id === product.categoryId)?.name || ''
                  });
                  setShowLabelModal(true);
                }}
                showActions={true}
                variant="detailed"
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
              onClick={() => {
                if (onAddProduct) {
                  onAddProduct();
                } else {
                  navigate('/lats/add-product');
                }
              }}
              icon={<Package size={18} />}
            >
              Add Your First Product
            </GlassButton>
          </div>
        </GlassCard>
        )}
      </div>

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
            productModals.openEditModal(product.id);
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
