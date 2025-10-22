import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Package, QrCode, X, MoreHorizontal, Grid, List } from 'lucide-react';
import GlassCard from '../../../../features/shared/components/ui/GlassCard';
import VariantProductCard from './VariantProductCard';
import VariantSelectionModal from './VariantSelectionModal';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { rbacManager, type UserRole } from '../../lib/rbac';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';
import { RealTimeStockService } from '../../lib/realTimeStock';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  totalQuantity?: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    parent_id?: string;
    isActive: boolean;
    sortOrder: number;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    children?: any[];
  };
  image?: string;
  barcode?: string;
  variants?: any[];
}

interface ProductSearchSectionProps {
  products: Product[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedBrand: string;
  setSelectedBrand: (brand: string) => void;
  priceRange: { min: string; max: string };
  setPriceRange: (range: { min: string; max: string }) => void;
  stockFilter: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  setStockFilter: (filter: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock') => void;
  sortBy: 'name' | 'price' | 'stock' | 'recent' | 'sales';
  setSortBy: (sort: 'name' | 'price' | 'stock' | 'recent' | 'sales') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  categories: string[];
  brands: string[];
  onAddToCart: (product: Product, variant?: any) => void;
  onAddExternalProduct: () => void;
  onSearch: (query: string) => void;
  onScanQrCode?: () => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  productsPerPage: number;
}

const ProductSearchSection: React.FC<ProductSearchSectionProps> = ({
  products,
  searchQuery,
  setSearchQuery,
  isSearching,
  showAdvancedFilters,
  setShowAdvancedFilters,
  selectedCategory,
  setSelectedCategory,
  selectedBrand,
  setSelectedBrand,
  priceRange,
  setPriceRange,
  stockFilter,
  setStockFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  categories,
  brands,
  onAddToCart,
  onAddExternalProduct,
  onSearch,
  onScanQrCode,
  currentPage,
  setCurrentPage,
  totalPages,
  productsPerPage
}) => {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role as UserRole;
  const canAddProducts = rbacManager.can(userRole, 'products', 'create');
  const { playClickSound } = usePOSClickSounds();
  
  // Reset to page 1 when productsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [productsPerPage, setCurrentPage]);
  
  // Session-based debug logging to prevent excessive console output
  const [hasLoggedDebug, setHasLoggedDebug] = useState(false);
  
  // Search suggestions disabled - keeping state for potential future use
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Categories popup state
  const [showCategoriesPopup, setShowCategoriesPopup] = useState(false);
  
  // View mode state (grid or list)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Variant selection modal state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  
  // Body scroll lock for categories popup
  useBodyScrollLock(showCategoriesPopup);

  // Real-time stock data for all products (BATCH FETCH to avoid N+1 queries)
  const [realTimeStockData, setRealTimeStockData] = useState<Map<string, number>>(new Map());
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Batch fetch stock data for all products when products change
  useEffect(() => {
    const fetchAllStockData = async () => {
      if (!products || products.length === 0) return;
      
      try {
        setIsLoadingStock(true);
        const productIds = products.map(p => p.id);
        
        // Batch fetch stock for ALL products at once
        const stockService = RealTimeStockService.getInstance();
        const stockLevels = await stockService.getStockLevels(productIds);
        
        // Convert to Map for easy lookup
        const stockMap = new Map<string, number>();
        Object.entries(stockLevels).forEach(([productId, levels]) => {
          const totalStock = levels.reduce((sum, level) => sum + level.quantity, 0);
          stockMap.set(productId, totalStock);
        });
        
        setRealTimeStockData(stockMap);
        
        if (import.meta.env.MODE === 'development') {
          console.log(`✅ [ProductSearchSection] Batch fetched stock for ${productIds.length} products in ONE query`);
        }
      } catch (error) {
        console.error('❌ [ProductSearchSection] Error fetching batch stock:', error);
      } finally {
        setIsLoadingStock(false);
      }
    };

    fetchAllStockData();
  }, [products]);

  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Disable search suggestions - just update the search query
    setShowSuggestions(false);
  };

  // Handle search input key press
  const handleSearchInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        onSearch(searchQuery.trim());
      }
    }
  };

  // Handle unified search
  const handleUnifiedSearch = (query: string) => {
    // Check if it's a barcode
    if (/^\d{8,}$/.test(query)) {
      // It's likely a barcode
      if (onScanQrCode) {
        onScanQrCode();
      } else {
        toast('QrCode scanning not available');
      }
    } else {
      // Regular search
      onSearch(query);
    }
  };

  // Filter products based on current filters
  const filteredProducts = products.filter(product => {
    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        product.name?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        (product.category?.name && product.category.name.toLowerCase().includes(query)) ||
        // Enhanced variant search - search through variant names and SKUs
        (product.variants && product.variants.some(variant => 
          variant.name?.toLowerCase().includes(query) ||
          variant.sku?.toLowerCase().includes(query) ||
          variant.barcode?.toLowerCase().includes(query)
        ));
      
      if (!matchesSearch) return false;
    }
    
    // Category filter
    if (selectedCategory && product.category?.name !== selectedCategory) return false;
    
    // Get product price and stock from variants or fallback to product level
    const primaryVariant = product.variants?.[0];
    const productPrice = primaryVariant?.sellingPrice || product.price || 0;
    const productStock = primaryVariant?.quantity || product.stockQuantity || 0;
    
    // Price range filter
    if (priceRange.min && productPrice < parseFloat(priceRange.min)) return false;
    if (priceRange.max && productPrice > parseFloat(priceRange.max)) return false;
    
    // Stock filter
    switch (stockFilter) {
      case 'in-stock':
        if (productStock <= 0) return false;
        break;
      case 'low-stock':
        if (productStock > 10 || productStock <= 0) return false;
        break;
      case 'out-of-stock':
        if (productStock > 0) return false;
        break;
    }
    
    return true;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let comparison = 0;
    
    // Get product price and stock from variants or fallback to product level
    const aPrimaryVariant = a.variants?.[0];
    const bPrimaryVariant = b.variants?.[0];
    const aPrice = aPrimaryVariant?.sellingPrice || a.price || 0;
    const bPrice = bPrimaryVariant?.sellingPrice || b.price || 0;
    const aStock = aPrimaryVariant?.quantity || a.stockQuantity || 0;
    const bStock = bPrimaryVariant?.quantity || b.stockQuantity || 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'price':
        comparison = aPrice - bPrice;
        break;
      case 'stock':
        comparison = aStock - bStock;
        break;
      case 'recent':
        // Assuming products have a createdAt field, using id as fallback
        comparison = a.id.localeCompare(b.id);
        break;
      case 'sales':
        // Using stock as fallback for sales sorting
        comparison = bStock - aStock;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Paginate products based on productsPerPage setting
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const displayProducts = sortedProducts.slice(startIndex, endIndex);
  
  // Calculate total pages based on filtered products
  const calculatedTotalPages = Math.ceil(sortedProducts.length / productsPerPage);

  // Handle variant selection from modal
  const handleVariantSelect = (variant: any) => {
    if (selectedProductForVariants) {
      setSelectedVariant(variant);
      onAddToCart(selectedProductForVariants, variant);
      setShowVariantModal(false);
      setSelectedProductForVariants(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <GlassCard className="p-6 h-full flex flex-col overflow-hidden">
        {/* Fixed Search Section */}
        <div className="flex-shrink-0 mb-4">
          {/* Main Search and Quick Filters */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/30 shadow-lg p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onKeyPress={handleSearchInputKeyPress}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80"
                  />
                </div>
              </div>
              
            </div>

            {/* Advanced Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white/80 text-sm"
              >
                <option value="sales">Best Selling</option>
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="stock">Stock</option>
              </select>
              
              <button
                onClick={() => {
                  playClickSound();
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                }}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>

              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min Price"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white/80 text-sm w-24"
                />
                <input
                  type="number"
                  placeholder="Max Price"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white/80 text-sm w-24"
                />
              </div>

              <button
                onClick={() => {
                  playClickSound();
                  setSearchQuery('');
                  setSelectedCategory('');
                  setSelectedBrand('');
                  setPriceRange({ min: '', max: '' });
                  setStockFilter('all');
                }}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>

              {/* Filter Section */}
              <div className="flex gap-2">
                {/* Category Filter Buttons */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => {
                      playClickSound();
                      setSelectedCategory('');
                    }}
                    className={`px-3 py-2 text-sm transition-colors ${
                      selectedCategory === '' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    All
                  </button>
                  {categories.slice(0, 3).map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        playClickSound();
                        setSelectedCategory(category);
                      }}
                      className={`px-3 py-2 text-sm transition-colors ${
                        selectedCategory === category 
                          ? 'bg-green-600 text-white' 
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                  {categories.length > 3 && (
                    <button
                      onClick={() => {
                        playClickSound();
                        setShowCategoriesPopup(true);
                      }}
                      className="px-3 py-2 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors border-l border-gray-300"
                      title="Show all categories"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Stock Filter Buttons */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => {
                      playClickSound();
                      setStockFilter('all');
                    }}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      stockFilter === 'all' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      playClickSound();
                      setStockFilter('in-stock');
                    }}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      stockFilter === 'in-stock' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    In Stock
                  </button>
                  <button
                    onClick={() => {
                      playClickSound();
                      setStockFilter('low-stock');
                    }}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      stockFilter === 'low-stock' 
                        ? 'bg-orange-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Low Stock
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  {canAddProducts && (
                    <button
                      onClick={() => {
                        playClickSound();
                        onAddExternalProduct();
                      }}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 transition-colors"
                      title="Add Product"
                    >
                      <Package className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      playClickSound();
                      if (searchQuery.trim()) {
                        handleUnifiedSearch(searchQuery.trim());
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    title="Scan"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>

                {/* View Toggle Buttons */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden ml-auto">
                  <button
                    onClick={() => {
                      playClickSound();
                      setViewMode('grid');
                    }}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Grid View"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      playClickSound();
                      setViewMode('list');
                    }}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    title="List View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Products Grid/List - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pos-products-scroll" style={{ minHeight: 0 }}>
          {displayProducts.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 pb-4">
                {displayProducts.map((product) => (
                  <VariantProductCard
                    key={product.id}
                    product={product as any}
                    onAddToCart={onAddToCart as any}
                    realTimeStockData={realTimeStockData}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {displayProducts.map((product) => {
                  // Normalize variants data - handle both database formats
                  const normalizedVariants = product.variants?.map((v: any) => ({
                    ...v,
                    id: v.id,
                    name: v.name || v.variant_name,
                    sku: v.sku,
                    barcode: v.barcode,
                    price: v.selling_price || v.sellingPrice || v.price || 0,
                    sellingPrice: v.selling_price || v.sellingPrice || v.price || 0,
                    costPrice: v.costPrice || v.cost_price || 0,
                    quantity: v.quantity ?? v.stockQuantity ?? v.stock_quantity ?? 0,
                    stockQuantity: v.stockQuantity ?? v.quantity ?? v.stock_quantity ?? 0,
                    minStockLevel: v.minStockLevel || v.min_stock_level || v.minQuantity || v.min_quantity || 0,
                    attributes: v.attributes || {}
                  }));
                  
                  const primaryVariant = normalizedVariants?.[0];
                  const hasMultipleVariants = normalizedVariants && normalizedVariants.length > 1;
                  const productPrice = Number(primaryVariant?.sellingPrice || product.price || 0);
                  
                  // Get stock from multiple possible sources with proper fallbacks
                  let productStock = 0;
                  const realtimeStock = realTimeStockData.get(product.id);
                  
                  if (realtimeStock !== undefined && realtimeStock !== null) {
                    // Use real-time stock data if available
                    productStock = realtimeStock;
                  } else if (primaryVariant) {
                    // Use normalized variant stock
                    productStock = primaryVariant.stockQuantity || 0;
                  } else {
                    // Fallback to product-level stock
                    productStock = product.stockQuantity ?? product.totalQuantity ?? 0;
                  }
                  
                  const isOutOfStock = productStock <= 0;
                  const isLowStock = productStock > 0 && productStock <= 10;
                  
                  return (
                    <div 
                      key={product.id} 
                      className="group bg-gradient-to-r from-white to-gray-50/30 rounded-xl border border-gray-200/80 hover:border-blue-300 hover:shadow-lg transition-all duration-200 p-4"
                    >
                      <div className="flex items-center gap-5">
                        {/* Product Image with Badge */}
                        <div className="relative flex-shrink-0">
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-sm ring-2 ring-white group-hover:ring-blue-100 transition-all">
                            {product.image ? (
                              <img 
                                src={product.image} 
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                                <Package className="w-10 h-10 text-blue-300" />
                              </div>
                            )}
                          </div>
                          {/* Stock Status Badge */}
                          <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-sm ${
                            isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-orange-500' : 'bg-green-500'
                          }`} />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Product Name */}
                          <h4 className="font-semibold text-gray-900 text-lg truncate group-hover:text-blue-700 transition-colors">
                            {product.name}
                          </h4>
                          
                          {/* Meta Information Row */}
                          <div className="flex items-center gap-4 flex-wrap">
                            {/* SKU */}
                            {(primaryVariant?.sku || product.sku) && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                <span className="font-mono">{primaryVariant?.sku || product.sku}</span>
                              </div>
                            )}
                            
                            {/* Variants Badge */}
                            {normalizedVariants && normalizedVariants.length > 1 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/50">
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                {normalizedVariants.length} Variants
                              </span>
                            )}
                            
                            {/* Category Badge */}
                            {product.category?.name && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/50">
                                {product.category.name}
                              </span>
                            )}
                            
                            {/* Stock Status with Icon */}
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isOutOfStock 
                                ? 'bg-red-50 text-red-700 border border-red-200/50' 
                                : isLowStock 
                                ? 'bg-orange-50 text-orange-700 border border-orange-200/50' 
                                : 'bg-green-50 text-green-700 border border-green-200/50'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-orange-500' : 'bg-green-500'
                              }`} />
                              {isOutOfStock ? 'Out of Stock' : `${productStock} units`}
                            </div>
                          </div>
                        </div>

                        {/* Price and Action */}
                        <div className="flex-shrink-0 flex items-center gap-6">
                          {/* Price Display */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                              TSh {productPrice.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">per unit</div>
                          </div>

                          {/* Add to Cart Button */}
                          <button
                            onClick={() => {
                              playClickSound();
                              // Create a product object with normalized variants for proper handling
                              const productWithNormalizedVariants = {
                                ...product,
                                variants: normalizedVariants
                              };
                              
                              if (hasMultipleVariants) {
                                // Open variant selection modal
                                setSelectedProductForVariants(productWithNormalizedVariants);
                                setShowVariantModal(true);
                              } else if (primaryVariant) {
                                // Add single variant directly to cart
                                onAddToCart(productWithNormalizedVariants, primaryVariant);
                              } else {
                                // Add product without variant
                                onAddToCart(productWithNormalizedVariants);
                              }
                            }}
                            disabled={isOutOfStock}
                            className={`
                              px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap
                              ${isOutOfStock
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : hasMultipleVariants
                                ? 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
                                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                              }
                            `}
                          >
                            {isOutOfStock 
                              ? 'Unavailable' 
                              : hasMultipleVariants 
                              ? 'Select Variant' 
                              : 'Add to Cart'
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Package className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No products found</p>
              <p className="text-sm text-center">
                Try adjusting your search or filters to find what you're looking for.
              </p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {calculatedTotalPages > 1 && (
          <div className="flex-shrink-0 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, sortedProducts.length)} of {sortedProducts.length} products
                <span className="ml-2 text-blue-600 font-medium">({productsPerPage} per page)</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playClickSound();
                    setCurrentPage(Math.max(1, currentPage - 1));
                  }}
                  disabled={currentPage <= 1}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentPage <= 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, calculatedTotalPages) }, (_, i) => {
                    let page;
                    if (calculatedTotalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= calculatedTotalPages - 2) {
                      page = calculatedTotalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    
                    const isActive = page === currentPage;
                    
                    return (
                      <button
                        key={page}
                        onClick={() => {
                          playClickSound();
                          setCurrentPage(page);
                        }}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => {
                    playClickSound();
                    setCurrentPage(Math.min(calculatedTotalPages, currentPage + 1));
                  }}
                  disabled={currentPage >= calculatedTotalPages}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentPage >= calculatedTotalPages
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Product Count Display */}
        {calculatedTotalPages <= 1 && (
          <div className="flex-shrink-0 mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500 text-center">
              Showing {displayProducts.length} products ({productsPerPage} per page)
            </div>
          </div>
        )}
      </GlassCard>

      {/* Categories Popup Modal */}
      {showCategoriesPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Select Category</h2>
              <button
                onClick={() => {
                  playClickSound();
                  setShowCategoriesPopup(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Categories Grid */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {/* All Categories Button */}
                <button
                  onClick={() => {
                    playClickSound();
                    setSelectedCategory('');
                    setShowCategoriesPopup(false);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                    selectedCategory === ''
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-sm font-medium">All Categories</div>
                  </div>
                </button>

                {/* Individual Category Buttons */}
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      playClickSound();
                      setSelectedCategory(category);
                      setShowCategoriesPopup(false);
                    }}
                    className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                      selectedCategory === category
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-sm font-medium truncate" title={category}>
                        {category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                {categories.length} categories available
              </div>
              <button
                onClick={() => {
                  playClickSound();
                  setShowCategoriesPopup(false);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Selection Modal */}
      {showVariantModal && selectedProductForVariants && createPortal(
        <VariantSelectionModal
          isOpen={showVariantModal}
          onClose={() => {
            setShowVariantModal(false);
            setSelectedProductForVariants(null);
            setSelectedVariant(null);
          }}
          product={selectedProductForVariants}
          onSelectVariant={handleVariantSelect}
          selectedVariant={selectedVariant}
        />,
        document.body
      )}
    </div>
  );
};

export default ProductSearchSection;
