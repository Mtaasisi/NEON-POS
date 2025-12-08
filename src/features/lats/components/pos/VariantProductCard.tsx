import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronDown, ChevronUp, ChevronRight, Tag, Hash, Plus, Minus, Search, AlertCircle, Image, Eye, Edit, Trash2, CheckCircle, Calculator, Printer, ArrowRightLeft, Copy, QrCode, ShoppingCart, Calendar, DollarSign, MessageCircle, FileText, CreditCard, RotateCcw, X } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';
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
import VariantSelectionModal from './VariantSelectionModal';

interface VariantProductCardProps {
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
  allowOutOfStockSelection?: boolean; // For purchase orders where we want to allow selecting out-of-stock products
  realTimeStockData?: Map<string, number>; // Pre-fetched stock data to avoid N+1 queries
  currencyCode?: string; // Currency code to display (e.g., 'CNY', 'USD', 'TZS')
  currencySymbol?: string; // Currency symbol to display (e.g., '¥', '$', 'TSh')
  disableVariantModal?: boolean; // If true, always use onViewDetails instead of showing variant modal
}

const VariantProductCard: React.FC<VariantProductCardProps> = ({
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
  currencyCode = 'TZS',
  currencySymbol = 'TSh',
  disableVariantModal = false
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null);
  const [variantChildren, setVariantChildren] = useState<Map<string, any[]>>(new Map());
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set());
  const [variantImages, setVariantImages] = useState<Map<string, string[]>>(new Map());
  const loadedVariantImagesRef = useRef<Set<string>>(new Set());
  
  // Load variant images when product is expanded
  useEffect(() => {
    if (isExpanded && product.variants) {
      // Pre-load images for all visible variants
      product.variants.slice(0, 4).forEach((variant: any) => {
        const variantId = variant.id;
        if (variantId && !loadedVariantImagesRef.current.has(variantId)) {
          loadVariantImages(variantId);
        }
      });
    }
  }, [isExpanded, product.variants?.length]);
  
  // Load variant images (variant-specific or fallback to product images)
  const loadVariantImages = async (variantId: string) => {
    // If already loaded, return
    if (variantImages.has(variantId) || loadedVariantImagesRef.current.has(variantId)) {
      return;
    }
    
    loadedVariantImagesRef.current.add(variantId);

    try {
      const { supabase } = await import('../../../../lib/supabaseClient');
      
      // First, try to get variant-specific images
      const { data: variantImageData, error: variantImageError } = await supabase
        .from('variant_images')
        .select('image_url, thumbnail_url, is_primary')
        .eq('variant_id', variantId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(5);

      if (!variantImageError && variantImageData && variantImageData.length > 0) {
        // Use variant-specific images
        const images = variantImageData.map(img => img.thumbnail_url || img.image_url);
        setVariantImages(prev => new Map(prev).set(variantId, images));
        return;
      }

      // Fallback to product images from database
      const variant = product.variants?.find((v: any) => v.id === variantId);
      const productId = variant?.product_id || product.id;

      const { data: productImageData, error: productImageError } = await supabase
        .from('product_images')
        .select('image_url, thumbnail_url, is_primary')
        .eq('product_id', productId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(5);

      if (!productImageError && productImageData && productImageData.length > 0) {
        const images = productImageData.map(img => img.thumbnail_url || img.image_url);
        setVariantImages(prev => new Map(prev).set(variantId, images));
      } else if (productImages && productImages.length > 0) {
        // Use already loaded product images from props
        const images = productImages.map(img => img.url || img.thumbnailUrl);
        setVariantImages(prev => new Map(prev).set(variantId, images));
      } else {
        // No images found
        setVariantImages(prev => new Map(prev).set(variantId, []));
      }
    } catch (error) {
      console.error('Error loading variant images:', error);
      // Fallback to product images from props
      if (productImages && productImages.length > 0) {
        const images = productImages.map(img => img.url || img.thumbnailUrl);
        setVariantImages(prev => new Map(prev).set(variantId, images));
      } else {
        setVariantImages(prev => new Map(prev).set(variantId, []));
      }
    }
  };

  // Load children variants for a parent variant
  const loadChildrenVariants = async (variantId: string) => {
    console.log('🔍 Checking for children variants for variant:', variantId);
    
    // If already loaded and expanded, collapse it
    if (variantChildren.has(variantId) && expandedVariantId === variantId) {
      console.log('📦 Collapsing already expanded variant');
      setExpandedVariantId(null);
      return;
    }
    
    // If already loaded but not expanded, just expand it
    if (variantChildren.has(variantId)) {
      console.log('📦 Expanding already loaded children');
      setExpandedVariantId(variantId);
      return;
    }
    
    console.log('⏳ Loading children from database...');
    setLoadingChildren(prev => new Set(prev).add(variantId));
    try {
      const { supabase } = await import('../../../../lib/supabaseClient');
      
      // Get IMEI child variants
      const { data: imeiChildren, error: imeiError } = await supabase
        .from('lats_product_variants')
        .select('*')
        .eq('parent_variant_id', variantId)
        .eq('variant_type', 'imei_child')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (imeiError) {
        console.error('❌ Error loading IMEI children:', imeiError);
      } else {
        console.log(`✅ Found ${imeiChildren?.length || 0} IMEI children:`, imeiChildren);
      }
      
      // Get legacy inventory items - also check by product_id
      const variant = product.variants?.find((v: any) => v.id === variantId);
      const productId = variant?.product_id || product.id;
      
      const { data: legacyItems, error: legacyError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('variant_id', variantId)
        .eq('status', 'available')
        .not('serial_number', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (legacyError) {
        console.error('❌ Error loading legacy items:', legacyError);
      } else {
        console.log(`✅ Found ${legacyItems?.length || 0} legacy items:`, legacyItems);
      }
      
      const children: any[] = [];
      
      // Add IMEI children
      if (imeiChildren && !imeiError && imeiChildren.length > 0) {
        children.push(...imeiChildren.map((child: any) => {
          const imei = child.variant_attributes?.imei || 
                      child.variant_attributes?.serial_number ||
                      child.sku || 
                      'N/A';
          return {
            ...child,
            type: 'imei',
            identifier: imei,
            name: `IMEI: ${imei}`
          };
        }));
      }
      
      // Add legacy items as children
      if (legacyItems && !legacyError && legacyItems.length > 0) {
        children.push(...legacyItems.map((item: any) => {
          const identifier = item.serial_number || item.imei || 'N/A';
          return {
            id: item.id,
            sku: identifier,
            name: `IMEI: ${identifier}`,
            quantity: 1,
            type: 'legacy',
            identifier: identifier,
            costPrice: item.cost_price,
            sellingPrice: item.selling_price,
            variant_attributes: {
              imei: identifier,
              serial_number: identifier
            }
          };
        }));
      }
      
      console.log(`📦 Total children loaded: ${children.length}`, children);
      
      setVariantChildren(prev => new Map(prev).set(variantId, children));
      setExpandedVariantId(variantId);
    } catch (error) {
      console.error('❌ Error loading children variants:', error);
      // Set empty array so we don't try to load again
      setVariantChildren(prev => new Map(prev).set(variantId, []));
      setExpandedVariantId(variantId); // Still expand to show "no children" message
    } finally {
      setLoadingChildren(prev => {
        const next = new Set(prev);
        next.delete(variantId);
        return next;
      });
    }
  };

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
    console.error('VariantProductCard: Product is null or undefined');
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
    
    // Check if all variants are out of stock
    const allVariantsOutOfStock = product.variants.every(v => (v.quantity ?? 0) <= 0);
    const someVariantsOutOfStock = product.variants.some(v => (v.quantity ?? 0) <= 0);
    const totalStock = product.variants.reduce((sum, v) => sum + (v.quantity ?? 0), 0);
    
    if (allVariantsOutOfStock) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Out of Stock</span>;
    } else if (someVariantsOutOfStock && product.variants.length > 1) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">Limited Stock</span>;
    } else if (totalStock <= 10) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">Low Stock</span>;
    } else {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">In Stock</span>;
    }
  };

  // Get price display - show only the cheapest price with comma separators
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

    // Return only the cheapest price with comma formatting
    return prices[0].toLocaleString();
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

  // Get total stock using adjusted variants (includes cart adjustments)
  const getTotalStock = () => {
    // Always use product variants directly since they already have stock adjustments applied
    // from POSPageOptimized.tsx transformation
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
    
    // For purchase orders, allow out-of-stock products; for POS, block only if ALL variants are out of stock
    const allVariantsOutOfStock = product.variants?.every(v => (v.quantity ?? 0) <= 0) ?? true;
    if (!allowOutOfStockSelection && allVariantsOutOfStock) {
      return; // Don't do anything if all variants are out of stock in POS mode
    }
    
    // Check if product has variants (including parent-child structure)
    const hasMultipleVariants = product.variants && product.variants.length > 1;
    const hasSingleVariant = product.variants && product.variants.length === 1;
    
    // ✅ If disableVariantModal is true, always use onViewDetails instead
    if (disableVariantModal && onViewDetails) {
      onViewDetails(product);
      return;
    }
    
    // ✅ ENHANCED: Always check for multiple variants first, even for purchase orders
    if (hasMultipleVariants) {
      setIsVariantModalOpen(true);
      return;
    }
    
    if (hasSingleVariant) {
      const variant = product.variants[0];
      const isParentByFlag = variant.is_parent || variant.variant_type === 'parent';
      
      // ✅ FIX: Always check if variant has IMEI children in database, regardless of parent flag
      // Some products may be marked as parent but have no actual children
      let hasChildren = false;
        try {
          const { supabase } = await import('../../../../lib/supabaseClient');
        
        // Check for IMEI child variants
        const { count: imeiCount } = await supabase
            .from('lats_product_variants')
            .select('id', { count: 'exact', head: true })
            .eq('parent_variant_id', variant.id)
            .eq('variant_type', 'imei_child')
            .eq('is_active', true)
            .gt('quantity', 0);
          
        // Also check for legacy inventory_items (serial numbers)
        const { count: legacyCount } = await supabase
          .from('inventory_items')
          .select('id', { count: 'exact', head: true })
          .eq('product_id', product.id)
          .eq('variant_id', variant.id)
          .not('serial_number', 'is', null)
          .eq('status', 'available');
        
        hasChildren = ((imeiCount || 0) + (legacyCount || 0)) > 0;
        console.log(`🔍 Checking variant ${variant.id} for children: ${hasChildren ? `HAS ${(imeiCount || 0) + (legacyCount || 0)} CHILDREN` : 'NO CHILDREN'} (IMEI: ${imeiCount || 0}, Legacy: ${legacyCount || 0})`);
        } catch (error) {
          console.error('Error checking for children:', error);
        // On error, if variant is marked as parent, assume it might have children and show modal
        // Otherwise, treat as regular variant
        if (isParentByFlag) {
          console.log('⚠️ Error checking children, but variant is marked as parent - opening modal');
          setIsVariantModalOpen(true);
          return;
        }
      }
      
      // Only open modal if variant actually has children OR is marked as parent (with error fallback above)
      if (hasChildren) {
        console.log('✅ Opening variant modal - variant has children');
        setIsVariantModalOpen(true);
        return;
      } else if (isParentByFlag) {
        // Variant is marked as parent but has no children - treat as regular variant
        console.log('ℹ️ Variant marked as parent but has no children - treating as regular variant');
        // Fall through to add directly to cart below
      }
    }
    
    // Single non-parent variant: Check if onViewDetails is provided (purchase orders)
    if (onViewDetails) {
      onViewDetails(product);
      return;
    }
    
    // Single non-parent variant: Add directly to cart
    if (primaryVariant && (primaryVariant.quantity ?? 0) > 0) {
      if (onAddToCart) {
        onAddToCart(product, primaryVariant, 1);
      }
    } else if (!allowOutOfStockSelection) {
      // Variant is out of stock
      return;
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

  // Compact variant with subtle colors
  if (variant === 'compact') {
    const hasNoVariants = !product.variants || product.variants.length === 0;
    
    // Check if ALL variants are out of stock (not just the primary one)
    const allVariantsOutOfStock = product.variants?.every(v => (v.quantity ?? 0) <= 0) ?? true;
    
    // For purchase orders (allowOutOfStockSelection = true), allow clicking even without variants
    // Only disable if: has no variants AND not in purchase order mode, OR all out of stock AND not allowing out of stock
    const isDisabled = (hasNoVariants && !allowOutOfStockSelection) || (!allowOutOfStockSelection && allVariantsOutOfStock);
    
    return (
      <>
        <div 
          className={`bg-white border border-gray-200 rounded-lg p-4 transition-all duration-200 flex flex-col h-full ${className} ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${theme.hoverBorder} hover:shadow-lg active:scale-98`
          } ${hasNoVariants && !allowOutOfStockSelection ? 'border-gray-300 bg-gray-50' : ''}`}
          onClick={handleCardClick}
          title={hasNoVariants && !allowOutOfStockSelection ? 'This product has no variants and cannot be added to cart. Please add variants in the inventory management.' : ''}
        >
          
          {/* Product Image - Top */}
          <div 
            className="w-full mb-3 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              // Info modal removed
            }}
          >
            <SimpleImageDisplay
              images={productImages.map(img => img.url)}
              productName={product.name}
              size="md"
              className="w-full h-32 sm:h-36 md:h-40 object-cover rounded-lg"
            />
          </div>

          {/* Product Info - Flex grow to fill space */}
          <div className="flex-1 flex flex-col">
            {/* Product Title - Single line with ellipsis */}
            <h3 
              className={`font-semibold text-sm sm:text-base mb-2 truncate ${hasNoVariants && !allowOutOfStockSelection ? 'text-gray-500' : 'text-gray-900'}`} 
              title={product.name}
            >
              {product.name}
            </h3>
            
            {/* SKU */}
            <p className="text-xs text-gray-500 font-mono mb-2 truncate">{primaryVariant?.sku || 'N/A'}</p>
            
            {/* Category Display */}
            {showCategory && (product.categoryName || product.category?.name) && (
              <div className="mb-2">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-50 text-purple-700 border border-purple-200 font-medium truncate max-w-full">
                  📦 {product.categoryName || product.category?.name}
                </span>
              </div>
            )}
            
            {/* Spacer to push price to bottom */}
            <div className="flex-1"></div>
            
            {/* Price - Single line, at bottom */}
            <div className="mt-auto pt-2 border-t border-gray-100">
              {showPrices && (
                <div className={`font-bold text-lg truncate ${hasNoVariants && !allowOutOfStockSelection ? 'text-gray-500' : theme.priceColor}`} title={`${currencySymbol} ${getPriceDisplay()}`}>
                  {currencySymbol} {getPriceDisplay()}
                </div>
              )}
            </div>
          </div>
        </div>

      </>
    );
  }

  // Default detailed variant with cart-style UI
  const hasNoVariants = !product.variants || product.variants.length === 0;
  
  // Check if ALL variants are out of stock (not just the primary one)
  const allVariantsOutOfStock = product.variants?.every(v => (v.quantity ?? 0) <= 0) ?? true;
  
  // For purchase orders (allowOutOfStockSelection = true), allow clicking even without variants
  // Only disable if: has no variants AND not in purchase order mode, OR all out of stock AND not allowing out of stock
  const isDisabled = (hasNoVariants && !allowOutOfStockSelection) || (!allowOutOfStockSelection && allVariantsOutOfStock);
  
  // Calculate profit margin
  const costPrice = primaryVariant?.costPrice || 0;
  const sellingPrice = primaryVariant?.sellingPrice || 0;
  const profitMargin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(1) : '0';
  
  // Handle card click - toggle expand/collapse for inventory mode, or normal behavior for POS
  const handleCardClickWrapper = (e: React.MouseEvent) => {
          // Don't trigger onClick if clicking on action buttons or checkboxes
          if ((e.target as HTMLElement).closest('.action-button')) return;
          
          // In selection mode, clicking selects the card
          if (showCheckbox && onSelect) {
            onSelect(product.id);
      return;
    }
    
    // In inventory management mode (showActions), toggle expand/collapse
    if (showActions) {
      setIsExpanded(!isExpanded);
      return;
    }
    
    // Otherwise, handle normal click (opens modal in inventory mode or adds to cart in POS)
            handleCardClick();
  };
  
  // For inventory management mode, use purchase order style card
  if (showActions) {
    const stockStatus = getTotalStock() <= 0 ? 'out-of-stock' : getTotalStock() <= 10 ? 'low-stock' : 'in-stock';
    const stockStatusText = stockStatus === 'out-of-stock' ? 'Out of Stock' : stockStatus === 'low-stock' ? 'Low Stock' : 'In Stock';
    
    // Get status colors
    const getStatusColors = () => {
      if (stockStatus === 'out-of-stock') {
        return {
          bg: 'bg-red-500',
          text: 'text-red-600',
          bgLight: 'bg-red-100',
          textLight: 'text-red-700'
        };
      } else if (stockStatus === 'low-stock') {
        return {
          bg: 'bg-orange-500',
          text: 'text-orange-600',
          bgLight: 'bg-orange-100',
          textLight: 'text-orange-700'
        };
      } else {
        return {
          bg: 'bg-green-500',
          text: 'text-green-600',
          bgLight: 'bg-green-100',
          textLight: 'text-green-700'
        };
      }
    };
    
    const statusColors = getStatusColors();
    
    return (
      <>
        <div 
          className={`relative border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${className} ${
            isExpanded ? 'border-blue-500 shadow-xl' : 'border-gray-200'
          } ${isSelected ? 'ring-4 ring-blue-400 border-blue-500' : ''}`}
          onClick={handleCardClickWrapper}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 cursor-pointer">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Product Image/Icon */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 relative">
                {showProductImages && productImages.length > 0 ? (
                  <img 
                    src={productImages[0].url} 
                    alt={product.name}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                        svg.setAttribute('width', '24');
                        svg.setAttribute('height', '24');
                        svg.setAttribute('viewBox', '0 0 24 24');
                        svg.setAttribute('fill', 'none');
                        svg.setAttribute('stroke', 'currentColor');
                        svg.setAttribute('stroke-width', '2');
                        svg.setAttribute('stroke-linecap', 'round');
                        svg.setAttribute('stroke-linejoin', 'round');
                        svg.setAttribute('class', 'w-12 h-12 text-gray-400');
                        const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        path1.setAttribute('d', 'M16.5 9.4 7.55 4.24');
                        const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        path2.setAttribute('d', 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z');
                        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                        polyline.setAttribute('points', '3.29 7 12 12 20.71 7');
                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        line.setAttribute('x1', '12');
                        line.setAttribute('x2', '12');
                        line.setAttribute('y1', '22');
                        line.setAttribute('y2', '12');
                        svg.appendChild(path1);
                        svg.appendChild(path2);
                        svg.appendChild(polyline);
                        svg.appendChild(line);
                        parent.appendChild(svg);
                      }
                    }}
                  />
                ) : (
                  <Package className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Product Name and Status */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <h3 className="text-2xl font-bold text-gray-900 truncate">{product.name}</h3>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold ${statusColors.text} ${statusColors.bgLight} flex items-center gap-2 flex-shrink-0`}>
                    <ShoppingCart className="w-4 h-4" />
                    <span>{getTotalStock()} {stockStatusText}</span>
                  </span>
                </div>
                
                {/* Info Badges */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Category */}
                  {showCategory && (product.categoryName || product.category?.name) && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                      <Tag className="w-5 h-5" />
                      <span className="text-base font-semibold truncate max-w-[140px]">{product.categoryName || product.category?.name}</span>
                    </div>
                  )}
                  
                  {/* Shelf Location - Always visible */}
                  {(product.shelfCode || product.shelfName || product.storeLocationName || product.storageRoomName) && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex-shrink-0">
                      <Tag className="w-5 h-5" />
                      <span className="text-base font-semibold truncate max-w-[140px]">
                        {product.shelfCode || product.shelfName || product.storeLocationName || product.storageRoomName || 'N/A'}
                      </span>
                    </div>
                  )}
                  
                  {/* Stock Info */}
                  {showStockLevels && showStockInfo && (
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
                      {(() => {
                        // Filter out IMEI child variants from count
                        const parentVariants = product.variants?.filter((v: any) => 
                          !v.parent_variant_id && 
                          !v.parentVariantId &&
                          v.variant_type !== 'imei_child' &&
                          v.variantType !== 'imei_child'
                        ) || [];
                        const childrenVariants = product.variants?.filter((v: any) => 
                          v.parent_variant_id || 
                          v.parentVariantId ||
                          v.variant_type === 'imei_child' ||
                          v.variantType === 'imei_child'
                        ) || [];
                        const totalVariants = parentVariants.length;
                        const totalChildren = childrenVariants.length;
                        
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <Package className="w-5 h-5 text-purple-600" />
                              <span className="text-base font-semibold text-purple-700">{totalVariants}</span>
                              <span className="text-sm text-pink-600 font-medium">variant{totalVariants !== 1 ? 's' : ''}</span>
                            </div>
                            {totalChildren > 0 && (
                              <>
                                <div className="w-px h-5 bg-gray-300"></div>
                                <div className="flex items-center gap-2">
                                  <Hash className="w-5 h-5 text-purple-600" />
                                  <span className="text-base font-semibold text-purple-700">{totalChildren}</span>
                                  <span className="text-sm text-purple-600 font-medium">IMEI{totalChildren !== 1 ? 's' : ''}</span>
                                </div>
                              </>
                            )}
                          </>
                        );
                      })()}
                      {costPrice > 0 && sellingPrice > 0 && (
                        <>
                          <div className="w-px h-5 bg-gray-300"></div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="text-base font-semibold text-green-700">
                              {profitMargin}%
                            </span>
                            <span className="text-sm text-green-600 font-medium">margin</span>
                          </div>
                        </>
                      )}
                      {product.supplierName && (
                        <>
                          <div className="w-px h-5 bg-gray-300"></div>
                          <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-purple-600" />
                            <span className="text-base font-medium text-purple-600 truncate max-w-[120px]">
                              {product.supplierName}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Total Amount */}
            <div className="ml-4 flex-shrink-0">
              <div className="flex flex-col">
                <span className="text-4xl font-bold text-gray-900 leading-tight">
                  {currencySymbol} {getPriceDisplay()}
                </span>
                {costPrice > 0 && (
                  <span className="text-sm text-gray-500 mt-0.5 font-medium">
                    (Cost: {format.currency(costPrice)})
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Expand/Collapse Icon - Bottom Right Corner */}
          <div className={`absolute bottom-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 z-10 bg-transparent`}>
            <ChevronDown 
              size={20} 
              className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
          
          {/* Divider with Label */}
          {isExpanded && (
            <div className="mt-5 pt-5 border-t-2 border-gray-200 relative">
              <div className="absolute top-0 left-0 right-0 flex items-center justify-center -mt-3">
                <span className="bg-white px-5 py-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wider rounded-full border border-gray-200 shadow-sm">
                  Product Details
                </span>
              </div>
            </div>
          )}
          
          {/* Expanded Content */}
          {isExpanded && (
            <div className="px-6 pb-6 pt-2">
              {/* Variants/Items Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Variants ({product.variants?.length || 0})
                  </h4>
                </div>
                
                {/* Variants List */}
                {product.variants && product.variants.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {product.variants.slice(0, 4).map((variant: any, index: number) => {
                      // Check if variant has children - check both in-memory and assume it might have children if marked as parent
                      const hasChildrenInMemory = product.variants?.some((v: any) => 
                                        (v.parent_variant_id === variant.id || v.parentVariantId === variant.id) &&
                                        (v.variant_type === 'imei_child' || v.variantType === 'imei_child')
                                      );
                      const isMarkedAsParent = variant.is_parent || 
                                        variant.variant_type === 'parent' || 
                                        variant.variantType === 'parent';
                      // Assume it might have children if marked as parent OR if we already have children loaded
                      const variantId = variant.id;
                      const isVariantExpanded = expandedVariantId === variantId;
                      const children = variantChildren.get(variantId) || [];
                      const hasLoadedChildren = children.length > 0;
                      const hasChildren = hasChildrenInMemory || isMarkedAsParent || hasLoadedChildren;
                      const isLoadingChildren = loadingChildren.has(variantId);
                      
                      // Calculate total children stock from loaded children
                      const childrenStock = children.reduce((total, child) => {
                        // IMEI children have quantity field, legacy items have quantity: 1
                        return total + (child.quantity || 1);
                      }, 0);
                      
                      // Get variant quantity
                      const variantQty = variant.quantity || 0;
                      
                      // Show children stock if children are loaded and have stock
                      const showChildrenStock = hasLoadedChildren && childrenStock > 0;
                      
                      return (
                      <div key={variant.id || index} className="flex flex-col">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            // Always try to load children when clicked - the function will check if already loaded
                            loadChildrenVariants(variantId);
                          }}
                          className={`p-3 sm:p-4 md:p-6 flex flex-col h-full rounded-xl border transition-all duration-200 shadow-sm relative action-button cursor-pointer ${
                            isVariantExpanded 
                              ? 'border-blue-500 shadow-md bg-blue-50' 
                              : hasChildren 
                              ? 'border-blue-300 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md'
                              : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md'
                          }`}
                          title={isVariantExpanded ? "Click to collapse children" : "Click to check for IMEI children"}
                        >
                        {/* Quantity Badge - Top Right */}
                        <div className={`absolute -top-2 -right-2 sm:-top-3 sm:-right-3 p-1.5 sm:p-2 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-30 min-w-[2rem] min-h-[2rem] sm:min-w-[2.5rem] sm:min-h-[2.5rem] transition-all duration-300 ${
                          variantQty <= 0 
                            ? 'bg-gradient-to-r from-red-500 to-red-600' 
                            : variantQty <= 10 
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600' 
                            : 'bg-gradient-to-r from-green-500 to-emerald-500'
                        }`}>
                          <span className="text-xs sm:text-sm font-bold text-white whitespace-nowrap px-1">
                            {showChildrenStock ? `${variantQty} / ${childrenStock}` : variantQty}
                          </span>
                        </div>
                        
                        {/* Expand/Collapse Icon for Children - Bottom Right - Always show to indicate clickability */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            loadChildrenVariants(variantId);
                          }}
                          className="absolute bottom-2 right-2 w-7 h-7 bg-purple-100 hover:bg-purple-200 rounded-full flex items-center justify-center z-30 transition-colors shadow-sm cursor-pointer"
                          title={isVariantExpanded ? "Collapse children" : "Check for IMEI children"}
                        >
                          {isLoadingChildren ? (
                            <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <ChevronDown 
                              size={18} 
                              className={`text-purple-600 transition-transform duration-200 ${isVariantExpanded ? 'rotate-180' : ''}`}
                            />
                          )}
                        </div>
                        
                        <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {(() => {
                              const variantId = variant.id;
                              const images = variantImages.get(variantId) || [];
                              
                              if (images.length > 0) {
                                return (
                                  <SimpleImageDisplay
                                    images={images}
                                    productName={variant.name || variant.variant_name || product.name}
                                    size="sm"
                                    className="w-full h-full object-cover rounded-xl"
                                  />
                                );
                              }
                              
                              // Fallback to Package icon
                              return (
                                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center w-full h-full rounded-xl">
                                  <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col h-16 sm:h-20 md:h-24 justify-between">
                            <div>
                              <div className="font-medium text-gray-800 truncate text-sm sm:text-base md:text-lg lg:text-xl leading-tight" title={variant.name || variant.variant_name || 'Variant'}>
                                {variant.name || variant.variant_name || 'Variant'}
                              </div>
                              {variant.sku && (
                                <div className="text-xs text-gray-500 mt-1">SKU: {variant.sku}</div>
                              )}
                            </div>
                            <div>
                              <div className="text-lg sm:text-xl md:text-2xl text-gray-700 mt-0.5 sm:mt-1 font-bold">
                                {currencySymbol} {format.currency(variant.sellingPrice || variant.price || 0)}
                              </div>
                              {variant.costPrice > 0 && (
                                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                                  Cost: {format.currency(variant.costPrice)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        </div>
                        
                        {/* Children Variants Dropdown */}
                        {isVariantExpanded && (
                          <div className="mt-3 ml-4 border-l-2 border-purple-300 pl-4 space-y-2">
                            {isLoadingChildren ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="ml-2 text-sm text-gray-500">Loading children...</span>
                              </div>
                            ) : children.length > 0 ? (
                              <>
                                <div className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                                  IMEI Children ({children.length})
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {children.map((child: any, childIndex: number) => (
                                    <div
                                      key={child.id || `child-${childIndex}`}
                                      className="p-2 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <Hash className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                              {child.identifier || child.sku || child.name || `IMEI ${childIndex + 1}`}
                                            </span>
                                          </div>
                                          {child.sku && child.sku !== child.identifier && (
                                            <div className="text-xs text-gray-500 mt-1 ml-6">SKU: {child.sku}</div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 ml-2">
                                          {child.sellingPrice > 0 && (
                                            <span className="text-sm font-semibold text-green-700">
                                              {currencySymbol} {format.currency(child.sellingPrice)}
                                            </span>
                                          )}
                                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                            {child.quantity || 1} qty
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-500 py-2 italic">
                                No IMEI children found for this variant
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No variants available</p>
                  </div>
                )}
              </div>
              
              {/* Main Actions */}
              <div className="mt-5 pt-5 border-t-2 border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(product);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-purple-600 hover:bg-purple-700 action-button"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Product
                    </button>
                  )}
                  {onView && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(product);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-blue-600 hover:bg-blue-700 action-button"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Adjust stock action
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-orange-600 hover:bg-orange-700 action-button"
                  >
                    <Calculator className="w-4 h-4" />
                    Adjust Stock
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Print action
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-gray-600 hover:bg-gray-700 action-button"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Duplicate action
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-indigo-600 hover:bg-indigo-700 action-button"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Transfer action
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-red-600 hover:bg-red-700 action-button"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Transfer
                  </button>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDelete) onDelete(product);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-red-600 hover:bg-red-700 action-button"
                    >
                      <X className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Variant Selection Modal - Only render when open */}
        {isVariantModalOpen && (
          <VariantSelectionModal
            isOpen={isVariantModalOpen}
            onClose={() => setIsVariantModalOpen(false)}
            product={product}
            onSelectVariant={handleVariantSelect}
            isPurchaseOrderMode={allowOutOfStockSelection}
          />
        )}
      </>
    );
  }
  
  // Original POS card design (non-inventory mode)
  return (
    <>
      <div 
        className={`pos-product-card relative bg-white border-2 rounded-xl transition-all duration-300 overflow-hidden ${className} ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${theme.hoverBorder} hover:shadow-lg active:scale-98`
        } ${hasNoVariants && !allowOutOfStockSelection ? 'border-gray-300 bg-gray-50' : 'border-gray-200'} ${isSelected ? 'ring-4 ring-blue-400 border-blue-500' : ''}`}
        onClick={handleCardClickWrapper}
        title={hasNoVariants && !allowOutOfStockSelection ? 'This product has no variants and cannot be added to cart. Please add variants in the inventory management.' : ''}
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
        
        {/* Stock Count Badge - Card Corner - Always show for live updates */}
        {showStockLevels && showStockInfo && (
          <div className={`absolute top-1 right-1 sm:top-2 sm:right-2 p-1.5 sm:p-2 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20 w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 ${
            getTotalStock() <= 0 ? 'bg-gradient-to-r from-red-500 to-red-600' :
            getTotalStock() <= 5 ? 'bg-gradient-to-r from-red-500 to-red-600' :
            getTotalStock() <= 10 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
            'bg-gradient-to-r from-green-500 to-emerald-500'
          }`}>
            <span className="text-xs sm:text-sm font-bold text-white">
              {isLoadingStock ? '...' : (getTotalStock() >= 1000 ? `${(getTotalStock() / 1000).toFixed(1)}K` : getTotalStock())}
            </span>
            {isLoadingStock && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )}
        {/* Product Card Header */}
        <div className="p-3 sm:p-4 md:p-6 cursor-pointer flex flex-col h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
              {/* Product Icon */}
              {showProductImages && (
                <div 
                  className={`relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center text-lg font-bold ${theme.iconColor} cursor-pointer hover:opacity-90 transition-opacity`}
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
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                    <span className="text-[10px] sm:text-xs font-bold text-white">
                      {product.variants.length}
                    </span>
                  </div>
                )}
                </div>
              )}

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate text-sm sm:text-base md:text-lg lg:text-xl leading-tight" title={product.name}>
                  {product.name}
                </div>
                <div className="text-lg sm:text-xl md:text-2xl text-gray-700 mt-0.5 sm:mt-1 font-bold">
                  {currencySymbol} {getPriceDisplay()}
                </div>
              </div>
            </div>


          </div>

          {/* Primary Variant Specifications - Hidden */}


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
          isPurchaseOrderMode={allowOutOfStockSelection}
        />
      )}
    </>
  );
};

export default VariantProductCard;
