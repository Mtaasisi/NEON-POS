import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Package, ChevronDown, ChevronUp, Tag, Hash, Plus, Minus, Search, AlertCircle, Image, Eye, Edit, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import SimpleImageDisplay from '../../../../components/SimpleImageDisplay';
import { format } from '../../lib/format';
import { ProductSearchResult, ProductSearchVariant } from '../../types/pos';
import { 
  isSingleVariantProduct, 
  isMultiVariantProduct, 
  getPrimaryVariant, 
  getProductDisplayPrice, 
  getProductTotalStock,
  getProductStockStatus,
  getBestVariant 
} from '../../lib/productUtils';
import { RealTimeStockService } from '../../lib/realTimeStock';
import { SafeImage } from '../../../../components/SafeImage';
import { ProductImage } from '../../../../lib/robustImageService';
import { ImagePopupModal } from '../../../../components/ImagePopupModal';
import { useGeneralSettingsUI } from '../../../../hooks/useGeneralSettingsUI';
import { getSpecificationIcon, getSpecificationTooltip, getShelfDisplay, getShelfIcon, formatSpecificationValue } from '../../lib/specificationUtils';
import { toast } from 'react-hot-toast';
import { RESPONSIVE_OPTIMIZATIONS } from '../../../shared/constants/theme';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';
import VariantSelectionModal from './VariantSelectionModal';

interface DynamicMobileProductCardProps {
  product: ProductSearchResult;
  onAddToCart?: (product: ProductSearchResult, variant: ProductSearchVariant, quantity: number) => void;
  onViewDetails?: (product: ProductSearchResult, variant?: ProductSearchVariant) => void;
  onView?: (product: ProductSearchResult) => void;
  onEdit?: (product: ProductSearchResult) => void;
  onDelete?: (product: ProductSearchResult) => void;
  variant?: 'default' | 'compact' | 'detailed';
  showStockInfo?: boolean;
  showCategory?: boolean;
  showActions?: boolean;
  isSelected?: boolean;
  onSelect?: (productId: string) => void;
  showCheckbox?: boolean;
  className?: string;
  primaryColor?: 'blue' | 'orange' | 'green' | 'purple';
  actionText?: string;
  allowOutOfStockSelection?: boolean;
  realTimeStockData?: Map<string, number>;
  isVisible?: boolean;
  priority?: boolean;
}

const DynamicMobileProductCard: React.FC<DynamicMobileProductCardProps> = ({
  product,
  onAddToCart,
  onViewDetails,
  onView,
  onEdit,
  onDelete,
  variant = 'default',
  showStockInfo = true,
  showCategory = true,
  showActions = false,
  isSelected = false,
  onSelect,
  showCheckbox = false,
  className = '',
  primaryColor = 'blue',
  actionText = 'Add to Cart',
  allowOutOfStockSelection = false,
  realTimeStockData,
  isVisible = true,
  priority = false
}) => {
  // Add error state for React refresh issues
  const [hasError, setHasError] = useState(false);

  // Real-time stock state - use prop if provided, otherwise create local state
  const [localRealTimeStock, setLocalRealTimeStock] = useState<Map<string, number>>(new Map());
  const realTimeStock = realTimeStockData || localRealTimeStock;
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [lastStockUpdate, setLastStockUpdate] = useState<Date | null>(null);

  // Get general settings
  const generalSettings = useGeneralSettingsUI();
  const {
    showProductImages,
    showStockLevels,
    showPrices,
    showBarcodes
  } = generalSettings;

  const navigate = useNavigate();
  const [selectedVariant, setSelectedVariant] = useState<ProductSearchVariant | null>(null);
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [showAllSpecifications, setShowAllSpecifications] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isLoaded, setIsLoaded] = useState(priority);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isTextLoaded, setIsTextLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Initialize click sounds
  const { playCartAddSound, playClickSound } = usePOSClickSounds();

  // Reset error state on mount/remount (helps with React refresh)
  useEffect(() => {
    setHasError(false);
  }, []);

  // Only fetch real-time stock if no pre-fetched data is provided
  useEffect(() => {
    // Skip if stock data is provided from parent (to prevent N+1 queries)
    if (realTimeStockData) {
      return;
    }
    
    if (product?.id) {
      // Add a small delay to prevent multiple rapid requests
      const timer = setTimeout(() => {
        fetchRealTimeStock();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [product?.id, realTimeStockData]);

  // Theme configuration based on primaryColor
  const getThemeConfig = () => {
    switch (primaryColor) {
      case 'orange':
        return {
          hoverBorder: 'hover:border-orange-300',
          textColor: 'text-orange-600',
          iconColor: 'text-orange-600',
          priceColor: 'text-orange-900',
          errorColor: 'text-orange-600'
        };
      case 'green':
        return {
          hoverBorder: 'hover:border-green-300',
          textColor: 'text-green-600',
          iconColor: 'text-green-600',
          priceColor: 'text-green-900',
          errorColor: 'text-green-600'
        };
      case 'purple':
        return {
          hoverBorder: 'hover:border-purple-300',
          textColor: 'text-purple-600',
          iconColor: 'text-purple-600',
          priceColor: 'text-purple-900',
          errorColor: 'text-purple-600'
        };
      default: // blue
        return {
          hoverBorder: 'hover:border-blue-300',
          textColor: 'text-blue-600',
          iconColor: 'text-blue-600',
          priceColor: 'text-blue-900',
          errorColor: 'text-blue-600'
        };
    }
  };

  const theme = getThemeConfig();

  // Defensive check for product
  if (!product) {
    console.error('DynamicMobileProductCard: Product is null or undefined');
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
        <p className="text-red-600 text-sm">Product data is missing</p>
      </div>
    );
  }

  // Get primary variant using utility function with error handling
  let primaryVariant;
  let stockStatus;
  try {
    primaryVariant = getPrimaryVariant(product);
    stockStatus = getProductStockStatus(product);
  } catch (error) {
    console.error('Error getting product data:', error);
    setHasError(true);
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
        <p className="text-red-600 text-sm">Error loading product data</p>
        <button 
          onClick={() => setHasError(false)}
          className="mt-2 text-blue-600 text-xs hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }
  
  // Get stock status using utility function
  const getStockStatusBadge = () => {
    // Handle products with no variants
    if (!product.variants || product.variants.length === 0) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">No Variants</span>;
    }
    
    if (!primaryVariant) return null;
    
    switch (stockStatus) {
      case 'out-of-stock':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Out of Stock</span>;
      case 'low-stock':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">Low Stock</span>;
      default:
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">In Stock</span>;
    }
  };

  // Get price display - show only the cheapest price
  const getPriceDisplay = () => {
    if (!product.variants || product.variants.length === 0) {
      return 'No variants';
    }

    // Get all valid prices - convert to numbers first
    const prices = product.variants
      .map(v => Number(v.sellingPrice) || 0)
      .filter(p => p > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) {
      return 'No price set';
    }

    // Return only the cheapest price
    return `$${prices[0].toFixed(2)}`;
  };

  // Fetch real-time stock data (only used if no pre-fetched data provided)
  const fetchRealTimeStock = async () => {
    if (!product?.id || realTimeStockData) return;
    
    try {
      setIsLoadingStock(true);
      const stockService = RealTimeStockService.getInstance();
      const stockLevels = await stockService.getStockLevels([product.id]);
      
      // Convert ProductStockLevels object to Map<string, number>
      const stockMap = new Map<string, number>();
      Object.entries(stockLevels).forEach(([productId, levels]) => {
        // Sum up all variant quantities for this product
        const totalStock = levels.reduce((sum, level) => sum + level.quantity, 0);
        stockMap.set(productId, totalStock);
      });
      
      setLocalRealTimeStock(stockMap);
      setLastStockUpdate(new Date());
    } catch (error) {
      console.error('❌ Error fetching real-time stock:', error);
    } finally {
      setIsLoadingStock(false);
    }
  };

  // Get real-time stock for current product
  const getRealTimeStockForProduct = (): number => {
    if (!product?.id) return 0;
    return realTimeStock.get(product.id) || 0;
  };

  // Get total stock using real-time data if available, otherwise fall back to cached data
  const getTotalStock = () => {
    const realTimeStockValue = getRealTimeStockForProduct();
    if (realTimeStockValue > 0 || realTimeStock.has(product.id)) {
      return realTimeStockValue;
    }
    return getProductTotalStock(product);
  };

  // Handle card click
  const handleCardClick = async () => {
    // In inventory management mode, clicking opens details modal
    if (showActions && onView) {
      onView(product);
      return;
    }
    
    // Don't allow interaction for products with no variants
    if (!product.variants || product.variants.length === 0) {
      console.warn('⚠️ Cannot add product to cart: No variants available', product);
      return;
    }
    
    // For purchase orders, allow out-of-stock products; for POS, block them
    if (!primaryVariant || (!allowOutOfStockSelection && primaryVariant.quantity <= 0)) {
      if (!allowOutOfStockSelection) {
        return; // Don't do anything if out of stock in POS mode
      }
    }
    
    // Check if product has variants (including parent-child structure)
    const hasMultipleVariants = product.variants && product.variants.length > 1;
    const hasSingleVariant = product.variants && product.variants.length === 1;
    
    // ✅ ENHANCED: Always check for multiple variants first, even for purchase orders
    if (hasMultipleVariants) {
      setIsVariantModalOpen(true);
      return;
    }
    
    if (hasSingleVariant) {
      const variant = product.variants[0];
      const isParentByFlag = variant.is_parent || variant.variant_type === 'parent';
      
      // Also check if variant has IMEI children in database
      let hasChildren = false;
      if (!isParentByFlag) {
        try {
          const { supabase } = await import('../../../../lib/supabaseClient');
          const { count } = await supabase
            .from('lats_product_variants')
            .select('id', { count: 'exact', head: true })
            .eq('parent_variant_id', variant.id)
            .eq('variant_type', 'imei_child')
            .eq('is_active', true)
            .gt('quantity', 0);
          
          hasChildren = (count || 0) > 0;
          console.log(`🔍 Mobile: Checking variant ${variant.id} for children: ${hasChildren ? 'HAS CHILDREN' : 'NO CHILDREN'}`);
        } catch (error) {
          console.error('Error checking for children:', error);
        }
      }
      
      if (isParentByFlag || hasChildren) {
        console.log('✅ Mobile: Opening variant modal - parent variant detected');
        setIsVariantModalOpen(true);
        return;
      }
    }
    
    // Single non-parent variant: Check if onViewDetails is provided (purchase orders)
    if (onViewDetails) {
      onViewDetails(product);
      return;
    }
    
    // Single non-parent variant: Add directly to cart
    if (onAddToCart) {
      onAddToCart(product, primaryVariant, 1);
    }
  };

  // Handle variant selection from modal
  const handleVariantSelect = (selectedProduct: any, selectedVariant: any, quantity: number) => {
    // If onViewDetails is provided (like in purchase orders), call it with the selected variant
    if (onViewDetails) {
      // Store the selected variant for the product detail modal
      setSelectedVariant(selectedVariant);
      // Pass the variant to onViewDetails
      onViewDetails(selectedProduct, selectedVariant);
      return;
    }
    
    // Otherwise, add to cart directly (POS mode)
    if (onAddToCart) {
      onAddToCart(selectedProduct, selectedVariant, quantity);
    }
  };

  // Check if product has multiple variants using utility function
  const hasMultipleVariants = isMultiVariantProduct(product);

  // Convert product images to new format
  const convertToProductImages = (): ProductImage[] => {
    if (!product.images || product.images.length === 0) {
      return [];
    }
    
    const convertedImages = product.images.map((imageUrl, index) => ({
      id: `temp-${product.id}-${index}`,
      url: imageUrl,
      thumbnailUrl: imageUrl,
      fileName: `product-image-${index + 1}`,
      fileSize: 0,
      isPrimary: index === 0,
      uploadedAt: new Date().toISOString()
    }));
    
    return convertedImages;
  };

  const productImages = convertToProductImages();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsLoaded(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the card comes into view
        threshold: 0.1
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isLoaded]);

  // Progressive loading of content
  useEffect(() => {
    if (!isLoaded) return;

    // Load image first
    const imageTimer = setTimeout(() => {
      setIsImageLoaded(true);
    }, 100);

    // Load text content after image
    const textTimer = setTimeout(() => {
      setIsTextLoaded(true);
    }, 200);

    return () => {
      clearTimeout(imageTimer);
      clearTimeout(textTimer);
    };
  }, [isLoaded]);

  // Compact variant with subtle colors
  if (variant === 'compact') {
    const hasNoVariants = !product.variants || product.variants.length === 0;
    const isDisabled = hasNoVariants || !primaryVariant || (!allowOutOfStockSelection && primaryVariant.quantity <= 0);
    
    return (
      <>
        <div 
          className={`bg-white border border-gray-200 rounded-lg p-4 transition-all duration-200 ${className} ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${theme.hoverBorder} hover:shadow-md active:scale-95`
          } ${hasNoVariants ? 'border-gray-300 bg-gray-50' : ''}`}
          onClick={handleCardClick}
          style={{ minHeight: '60px' }}
          title={hasNoVariants ? 'This product has no variants and cannot be added to cart. Please add variants in the inventory management.' : `Click to ${actionText.toLowerCase()}`}
        >
          <div className="flex items-center gap-2">
            {/* Product Image */}
            <div 
              className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                // Info modal removed
              }}
            >
              <SimpleImageDisplay
                images={productImages.map(img => img.url)}
                productName={product.name}
                size="sm"
                className="w-10 h-10"
              />
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className={`font-medium truncate text-base ${hasNoVariants ? 'text-gray-500' : 'text-gray-900'}`} title={product.name}>{product.name}</h3>
                {getStockStatusBadge()}
              </div>
              <p className="text-xs text-gray-500 font-mono">{primaryVariant?.sku || 'N/A'}</p>
              
              {/* Category Display */}
              {showCategory && (product.categoryName || product.category?.name) && (
                <div className="mt-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                    📦 {product.categoryName || product.category?.name}
                  </span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="text-right">
              {showPrices && (
                <div className={`font-semibold text-base ${hasNoVariants ? 'text-gray-500' : theme.priceColor}`} title={getPriceDisplay()}>{getPriceDisplay()}</div>
              )}
              {showStockLevels && (
                <div className="text-xs text-gray-500">Stock: {getTotalStock()}</div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Default detailed variant with cart-style UI
  const hasNoVariants = !product.variants || product.variants.length === 0;
  const isDisabled = hasNoVariants || !primaryVariant || (!allowOutOfStockSelection && primaryVariant.quantity <= 0);
  
  // Calculate profit margin
  const costPrice = primaryVariant?.costPrice || 0;
  const sellingPrice = primaryVariant?.sellingPrice || 0;
  const profitMargin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(1) : '0';
  
  return (
    <>
      <div 
        className={`pos-product-card relative bg-white border-2 rounded-xl transition-all duration-300 overflow-hidden ${className} ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${theme.hoverBorder} hover:shadow-lg active:scale-98`
        } ${hasNoVariants ? 'border-gray-300 bg-gray-50' : 'border-gray-200'} ${isSelected ? 'ring-4 ring-blue-400 border-blue-500' : ''}`}
        onClick={(e) => {
          // Don't trigger onClick if clicking on action buttons or checkboxes
          if ((e.target as HTMLElement).closest('.action-button')) return;
          
          // In selection mode, clicking selects the card
          if (showCheckbox && onSelect) {
            onSelect(product.id);
          } else {
            // Otherwise, handle normal click (opens modal in inventory mode)
            handleCardClick();
          }
        }}
        title={hasNoVariants ? 'This product has no variants and cannot be added to cart. Please add variants in the inventory management.' : showActions ? 'Click to view details' : `Click to ${actionText.toLowerCase()}`}
      >
        
        {/* Checkbox for Selection - Only show when parent enables selection mode */}
        {showCheckbox && (
          <div className="absolute top-3 left-3 z-30 action-button" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                if (onSelect) onSelect(product.id);
              }}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
            />
          </div>
        )}
        
        {/* Stock Count Badge - Card Corner */}
        {showStockLevels && showStockInfo && getTotalStock() > 0 && (
          <div className={`absolute top-2 right-2 p-2 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20 w-10 h-10 ${
            getTotalStock() <= 5 ? 'bg-gradient-to-r from-red-500 to-red-600' :
            getTotalStock() <= 10 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
            'bg-gradient-to-r from-green-500 to-emerald-500'
          }`}>
            <span className="text-sm font-bold text-white">
              {isLoadingStock ? '...' : (getTotalStock() >= 1000 ? `${(getTotalStock() / 1000).toFixed(1)}K` : getTotalStock())}
            </span>
            {isLoadingStock && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )}
        {/* Product Card Header */}
        <div className="p-6 cursor-pointer flex flex-col h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Product Icon */}
              {showProductImages && (
                <div 
                  className={`relative w-20 h-20 rounded-xl flex items-center justify-center text-lg font-bold ${theme.iconColor} cursor-pointer hover:opacity-90 transition-opacity`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsImagePopupOpen(true);
                  }}
                >
                  <SimpleImageDisplay
                    images={productImages.map(img => img.url)}
                    productName={product.name}
                    size="lg"
                    className="w-full h-full rounded-xl"
                  />
                
                {/* Variant Count Badge */}
                {product.variants && product.variants.length > 1 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {product.variants.length}
                    </span>
                  </div>
                )}
                </div>
              )}

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate text-xl leading-tight" title={product.name}>
                  {product.name}
                </div>
                <div className="text-2xl text-gray-700 mt-1 font-bold">
                  TSh {getPriceDisplay().replace('$', '').replace('.00', '').replace('.0', '')}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Product Info Grid - Only show in Inventory Management mode */}
          {showActions ? (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              {/* Pricing & Margin Row */}
              {showPrices && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-gray-500 font-medium">Cost</span>
                    <span className="text-gray-900 font-semibold">{format.currency(costPrice)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 font-medium">Selling</span>
                    <span className="text-green-700 font-semibold">{format.currency(sellingPrice)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 font-medium">Margin</span>
                    <span className={`font-semibold ${parseFloat(profitMargin) < 10 ? 'text-red-600' : parseFloat(profitMargin) < 30 ? 'text-orange-600' : 'text-green-600'}`}>
                      {profitMargin}%
                    </span>
                  </div>
                </div>
              )}

              {/* Location & Category Row */}
              <div className="flex flex-wrap gap-2">
                {/* Shelf Information */}
                {(product.shelfCode || product.shelfName || product.storeLocationName || product.storageRoomName) && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                    📍 {product.shelfCode || product.shelfName || product.storeLocationName || product.storageRoomName}
                  </span>
                )}
                
                {/* Category */}
                {showCategory && (product.categoryName || product.category?.name) && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
                    📦 {product.categoryName || product.category?.name}
                  </span>
                )}

                {/* Supplier */}
                {product.supplierName && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 text-xs">
                    🏢 {product.supplierName}
                  </span>
                )}

                {/* Featured Badge */}
                {product.isFeatured && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs font-medium">
                    ⭐ Featured
                  </span>
                )}
              </div>

              {/* Variants Info */}
              {product.variants && product.variants.length > 1 && (
                <div className="flex items-center justify-between text-xs bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 rounded-lg">
                  <span className="text-gray-600">
                    <span className="font-semibold text-indigo-700">{product.variants.length}</span> variants available
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Simple info for POS mode */
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  {/* Shelf Information */}
                  {(product.shelfCode || product.shelfName || product.storeLocationName || product.storageRoomName) && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                        📦 {product.shelfCode || product.shelfName || product.storeLocationName || product.storageRoomName || 'Shelf Info'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {showCategory && (product.categoryName || product.category?.name) && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
                      📦 {product.categoryName || product.category?.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Spacer to push action buttons to bottom */}
          <div className="flex-1"></div>

          {/* Action Buttons for Inventory Management */}
          {showActions ? (
            <div className="mt-auto pt-4 border-t border-gray-200 space-y-2 action-button">
              {/* Quick Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {onView && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(product);
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(product);
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(product);
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-between text-xs px-2">
                <span className="text-gray-500">Status:</span>
                <span className={`font-medium ${product.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                  {product.isActive ? '● Active' : '○ Inactive'}
                </span>
              </div>
            </div>
          ) : !isDisabled ? (
            <div className="mt-auto pt-3 border-t border-gray-100">
              <div className={`text-center text-sm font-medium ${theme.textColor} opacity-70 hover:opacity-100 transition-opacity`}>
                Click to {actionText}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Variant Selection Modal - Only render when open */}
      {isVariantModalOpen && (
        <VariantSelectionModal
          isOpen={isVariantModalOpen}
          onClose={() => setIsVariantModalOpen(false)}
          product={product}
          onSelectVariant={handleVariantSelect}
        />
      )}
    </>
  );
};

export default DynamicMobileProductCard;
