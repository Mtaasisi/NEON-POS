// ProductDetailModal component - Shows full product details for purchase orders with editing capabilities
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Package, 
  Camera, 
  TrendingUp, TrendingDown, Calendar, Truck, 
  BarChart3, CheckCircle2, Plus, Minus
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SimpleImageDisplay from '../../../../components/SimpleImageDisplay';
import { formatMoney, Currency, SUPPORTED_CURRENCIES } from '../../lib/purchaseOrderUtils';
import { ProductSearchResult, ProductSearchVariant } from '../../types/pos';
import { 
  isMultiVariantProduct 
} from '../../lib/productUtils';
import { RealTimeStockService } from '../../lib/realTimeStock';
import { getLatsProvider } from '../../lib/data/provider';
import { usePurchaseOrderHistory } from '../../hooks/usePurchaseOrderHistory';
import { exchangeRateService } from '../../services/exchangeRateService';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductSearchResult;
  currency: Currency;
  onAddToCart: (product: ProductSearchResult, variant: ProductSearchVariant, quantity: number) => void;
  onProductUpdated?: (updatedProduct: ProductSearchResult) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  currency,
  onAddToCart,
  onProductUpdated
}) => {
  // Ensure we have a valid currency, fallback to TZS if none provided
  const defaultCurrency = SUPPORTED_CURRENCIES.find(c => c.code === 'TZS') || SUPPORTED_CURRENCIES[0];
  const safeCurrency = currency || defaultCurrency;
  
  const [selectedVariant, setSelectedVariant] = useState<ProductSearchVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customCostPrice, setCustomCostPrice] = useState<string>('');
  const [hasManuallyEditedPrice, setHasManuallyEditedPrice] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(safeCurrency);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [minimumOrderQty] = useState<number>(1);
  const [minimumStock, setMinimumStock] = useState<number>(2);
  
  // Multi-variant selection state
  const [isMultiVariantMode, setIsMultiVariantMode] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Map<string, { variant: ProductSearchVariant; quantity: number; costPrice: string; configured?: boolean }>>(new Map());
  const [isMultiVariantPopupOpen, setIsMultiVariantPopupOpen] = useState(false);
  const [expandedVariantIds, setExpandedVariantIds] = useState<Set<string>>(new Set());
  
  // Real-time stock state
  const [realTimeStock, setRealTimeStock] = useState<Map<string, number>>(new Map());
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [lastStockUpdate, setLastStockUpdate] = useState<Date | null>(null);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const dataProvider = getLatsProvider();
  
  // Tab state - MUST be declared before the hook that depends on it
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  
  // Variants section collapsible state
  const [isVariantsExpanded, setIsVariantsExpanded] = useState(false);
  
  // Purchase order history tracking - LAZY LOADED only when History tab is active
  const [shouldLoadHistory, setShouldLoadHistory] = useState(false);
  const { history: purchaseOrderHistory, stats: poStats, isLoading: isLoadingPOHistory } = usePurchaseOrderHistory(shouldLoadHistory ? product?.id : undefined);

  // Update selectedCurrency and load exchange rate when currency prop changes
  useEffect(() => {
    if (currency) {
      setSelectedCurrency(currency);
    }
  }, [currency]);

  // Load exchange rate when currencies differ
  useEffect(() => {
    if (isOpen && selectedCurrency && selectedCurrency.code !== currency.code) {
      loadExchangeRate(selectedCurrency.code, currency.code);
    }
  }, [isOpen, selectedCurrency?.code, currency.code]);

  // Trigger lazy loading of purchase history when user switches to History tab
  useEffect(() => {
    if (activeTab === 'history' && !shouldLoadHistory && product?.id) {
      console.log('📊 User switched to History tab - loading purchase order history...');
      setShouldLoadHistory(true);
    }
  }, [activeTab, shouldLoadHistory, product?.id]);

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

  // Reset state when modal closes to ensure fresh data on next open
  useEffect(() => {
    if (!isOpen) {
      setShouldLoadHistory(false);
      setActiveTab('details');
      setExpandedVariantIds(new Set());
      setSelectedVariants(new Map());
      setIsMultiVariantMode(false);
    }
  }, [isOpen]);

  // Safety check to ensure selectedCurrency is always defined
  const safeSelectedCurrency = selectedCurrency || safeCurrency;

  // Reset selected variant when modal closes or product changes
  useEffect(() => {
    if (!isOpen) {
      setSelectedVariant(null);
      setIsVariantsExpanded(false); // Reset expansion state when modal closes
    }
  }, [isOpen]);
  
  // Auto-expand variants section when modal opens with multiple variants
  useEffect(() => {
    if (isOpen && product?.variants && product.variants.length > 1) {
      // Auto-expand if no variant is selected yet
      setIsVariantsExpanded(!selectedVariant);
    }
  }, [isOpen, product?.variants?.length, selectedVariant]);

  // Reset selected variant when product changes
  useEffect(() => {
    setSelectedVariant(null);
  }, [product?.id]);

  // Initialize with pre-selected variant or auto-select if only one variant
  useEffect(() => {
    if (product && !selectedVariant) {
      // Check if a variant was pre-selected from the variant selection modal
      const preSelectedVariant = (product as any).preSelectedVariant;
      if (preSelectedVariant) {
        console.log('✅ Using pre-selected variant:', preSelectedVariant);
        setSelectedVariant(preSelectedVariant);
        return;
      }
      
      // Auto-select if there's only ONE variant (including "Default" variant)
      if (product.variants && product.variants.length === 1) {
        console.log('✅ Auto-selecting single variant:', product.variants[0].name);
        setSelectedVariant(product.variants[0]);
      }
      // For multiple variants, user must choose
    }
  }, [product?.id, product?.variants]);

  // Update cost price when poStats loads or changes (only if user hasn't manually edited)
  useEffect(() => {
    if (hasManuallyEditedPrice) return; // Don't override user's manual input

    if (product && poStats?.lastCostPrice && poStats.lastCostPrice > 0) {
      setCustomCostPrice(poStats.lastCostPrice.toString());
    } else if (product) {
      // Fallback to product cost price or calculation if no PO history
      const defaultCostPrice = product.costPrice || (product.price || 0) * 0.7;
      if (defaultCostPrice > 0) {
        setCustomCostPrice(defaultCostPrice.toString());
      }
    }
  }, [poStats, product, hasManuallyEditedPrice]);

  // Reset manual edit flag when product changes
  useEffect(() => {
    setHasManuallyEditedPrice(false);
  }, [product?.id]);

  // Fetch real-time stock when modal opens (with caching to prevent unnecessary fetches)
  useEffect(() => {
    if (isOpen && product?.id) {
      // Check if we have recent stock data (within last 30 seconds)
      const now = new Date();
      const cacheAge = lastStockUpdate ? now.getTime() - lastStockUpdate.getTime() : Infinity;
      const CACHE_DURATION = 30 * 1000; // 30 seconds
      
      if (cacheAge < CACHE_DURATION && realTimeStock.has(product.id)) {
        return;
      }
      
      // Add a small delay to prevent multiple rapid requests
      const timer = setTimeout(() => {
        fetchRealTimeStock();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, product?.id]);

  // Helper function to format numbers with commas (no trailing .0 or .00)
  const formatNumberWithCommas = (num: number): string => {
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return formatted.replace(/\.00$/, '').replace(/\.0$/, '');
  };

  // Fetch real-time stock data
  const fetchRealTimeStock = async () => {
    if (!product?.id) return;
    
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
      
      setRealTimeStock(stockMap);
      setLastStockUpdate(new Date());
    } catch (error) {
      console.error('Error fetching real-time stock:', error);
    } finally {
      setIsLoadingStock(false);
    }
  };

  // Fetch exchange rate using the centralized service
  const loadExchangeRate = async (fromCurrency: string, toCurrency: string) => {
    try {
      const rateInfo = await exchangeRateService.getExchangeRate(fromCurrency, toCurrency);
      console.log(`✅ Loaded exchange rate: ${fromCurrency} to ${toCurrency} = ${rateInfo.rate} (source: ${rateInfo.source})`);
      setExchangeRate(rateInfo.rate);
      return rateInfo.rate;
    } catch (error) {
      console.error('Error loading exchange rate:', error);
      setExchangeRate(1);
      return 1;
    }
  };

  // Convert product images to new format - memoized to prevent unnecessary recalculations
  const productImages = useMemo(() => {
    if (!product?.images || product.images.length === 0) {
      return [];
    }
    
    return product.images.map((imageUrl, index) => ({
      id: `temp-${product.id}-${index}`,
      url: imageUrl,
      thumbnailUrl: imageUrl,
      fileName: `product-image-${index + 1}`,
      fileSize: 0,
      isPrimary: index === 0,
      uploadedAt: new Date().toISOString()
    }));
  }, [product?.images, product?.id]);

  // Multi-variant selection handlers - moved inline to variant click handler for better control

  const updateVariantQuantity = (variantId: string, newQuantity: number) => {
    const newSelected = new Map(selectedVariants);
    const existing = newSelected.get(variantId);
    if (existing) {
      newSelected.set(variantId, {
        ...existing,
        quantity: Math.max(1, newQuantity)
      });
      setSelectedVariants(newSelected);
    }
  };

  const updateVariantCostPrice = (variantId: string, newCostPrice: string) => {
    const newSelected = new Map(selectedVariants);
    const existing = newSelected.get(variantId);
    if (existing) {
      newSelected.set(variantId, {
        ...existing,
        costPrice: newCostPrice
      });
      setSelectedVariants(newSelected);
      // Don't auto-collapse - let user click Done button instead
    }
  };

  const handleAddMultipleToCart = () => {
    if (selectedVariants.size === 0) {
      toast.error('Please select at least one variant');
      return;
    }

    let successCount = 0;
    selectedVariants.forEach(({ variant, quantity, costPrice }) => {
      const price = parseFloat(costPrice) || variant.costPrice || 0;
      if (price > 0) {
        // Create modified variant with the custom cost price to ensure it's passed correctly
        const modifiedVariant = {
          ...variant,
          costPrice: price
        };
        onAddToCart(product, modifiedVariant, quantity);
        successCount++;
      }
    });

    if (successCount > 0) {
      toast.success(`Added ${successCount} variant(s) to purchase order`);
      onClose();
    }
  };

  if (!isOpen || !product || !safeSelectedCurrency || !currency) return null;
  
  const hasMultipleVariants = isMultiVariantProduct(product);
  const costPrice = parseFloat(customCostPrice) || 0;
  
  // Get real-time stock for current product
  const getRealTimeStockForProduct = (): number => {
    if (!product?.id) return 0;
    return realTimeStock.get(product.id) || 0;
  };

  // Calculate correct total stock from variants (don't trust product.totalQuantity)
  const calculateCorrectTotalStock = (): number => {
    if (!product.variants || product.variants.length === 0) {
      return (product as any).stockQuantity ?? (product as any).totalQuantity ?? 0;
    }
    
    // DEBUG: Log variant data
    console.log('🔍 [PO Modal] Debug Stock Calculation:', {
      productName: product.name,
      totalVariants: product.variants.length,
      variants: product.variants.map(v => ({
        name: v.name,
        quantity: v.quantity || v.stockQuantity,
        parent_variant_id: v.parent_variant_id,
        variant_type: v.variant_type,
        variantType: v.variantType
      }))
    });
    
    // Sum up ONLY parent variants stock (exclude IMEI children)
    // IMEI children have parent_variant_id set or variant_type = 'imei_child'
    const parentVariants = product.variants.filter(variant => {
      // Exclude IMEI children (they have parent_variant_id or are imei_child type)
      const isImeiChild = variant.parent_variant_id || 
                         variant.variant_type === 'imei_child' ||
                         variant.variantType === 'imei_child' ||
                         (variant.name && variant.name.toLowerCase().includes('imei:'));
      return !isImeiChild;
    });
    
    const totalStock = parentVariants.reduce((total, variant) => {
      const stock = variant.stockQuantity ?? variant.quantity ?? 0;
      return total + stock;
    }, 0);
    
    console.log('🔍 [PO Modal] Stock Calculation Result:', {
      parentVariantsCount: parentVariants.length,
      totalStock,
      parentVariants: parentVariants.map(v => ({
        name: v.name,
        stock: v.stockQuantity ?? v.quantity ?? 0
      }))
    });
    
    return totalStock;
  };

  // Use real-time stock if available, otherwise calculate from variants
  const realTimeStockValue = getRealTimeStockForProduct();
  const calculatedStock = calculateCorrectTotalStock();
  
  console.log('🔍 [PO Modal] Final Stock Decision:', {
    realTimeStockValue,
    calculatedStock,
    willUse: realTimeStockValue || calculatedStock
  });
  
  const currentTotalStock = realTimeStockValue || calculatedStock;

  // Get stock status
  const getStockStatus = () => {
    if (currentTotalStock === 0) return { status: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (currentTotalStock <= minimumStock) return { status: 'Below Min Stock', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (currentTotalStock <= 5) return { status: 'Low Stock', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { status: 'In Stock', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  };

  const stockStatus = getStockStatus();

  const handleQuantityChange = (delta: number) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  const handleMinStockChange = (delta: number) => {
    setMinimumStock(Math.max(0, minimumStock + delta));
  };

  const handleVariantSelect = (variant: ProductSearchVariant) => {
    setSelectedVariant(variant);
    // Use last purchase price, then product-level costPrice, or fallback to 70% of selling price
    const defaultCostPrice = poStats?.lastCostPrice || product.costPrice || (product.price || 0) * 0.7;
    setCustomCostPrice(defaultCostPrice.toString());
  };

  const calculateExchangedPrice = (price: number): number => {
    if (safeSelectedCurrency.code === currency.code) return price;
    return price * exchangeRate;
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.error('Please select a variant');
      return;
    }

    if (costPrice <= 0) {
      toast.error('Please enter a cost price above 0 in the "Cost Price (per unit)" field');
      return;
    }

    if (quantity < minimumOrderQty) {
      toast.error(`Minimum order quantity is ${minimumOrderQty} units`);
      return;
    }

    try {
      setIsSavingPrice(true);
      
      // Save the updated cost price to the database before adding to cart
      const finalCostPrice = safeSelectedCurrency.code !== currency.code ? calculateExchangedPrice(costPrice) : costPrice;
      
      // Update the variant cost price in the database
      const updateResult = await dataProvider.updateProductVariantCostPrice(selectedVariant.id, finalCostPrice);

      if (updateResult.ok) {
        toast.success('Cost price updated and saved!');
        
        // Notify parent component about the updated product
        if (onProductUpdated) {
          const updatedProduct = {
            ...product,
            costPrice: finalCostPrice,
            minimumStock: minimumStock
          };
          onProductUpdated(updatedProduct);
        }
      }

      // Create modified variant with custom cost price
      const modifiedVariant = {
        ...selectedVariant,
        costPrice: finalCostPrice
      };

      onAddToCart(product, modifiedVariant, quantity);
      toast.success(`Added ${quantity}x ${product.name} to purchase order`);
      
      // Save exchange rate for future reference if currencies differ
      if (safeSelectedCurrency.code !== currency.code && exchangeRate !== 1) {
        await exchangeRateService.saveExchangeRate(
          safeSelectedCurrency.code, 
          currency.code, 
          exchangeRate
        );
      }
      
      onClose();
      
    } catch (error) {
      console.error('Error saving cost price:', error);
      toast.error('Failed to save cost price, but product will still be added to cart');
      
      // Fallback: add to cart without saving
      const modifiedVariant = {
        ...selectedVariant,
        costPrice: safeSelectedCurrency.code !== currency.code ? calculateExchangedPrice(costPrice) : costPrice
      };
      
      onAddToCart(product, modifiedVariant, quantity);
      toast.success(`Added ${quantity}x ${product.name} to purchase order`);
      onClose();
    } finally {
      setIsSavingPrice(false);
    }
  };

    return (
      <>
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header - Fixed */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
              <div>
                <h2 id="product-modal-title" className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h2>
                <p className="text-gray-600">Review and customize before adding to purchase order</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex gap-2 px-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                  activeTab === 'details'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Product Details
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                  activeTab === 'history'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Purchase History
                {purchaseOrderHistory.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">
                    {purchaseOrderHistory.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
            {/* Details Tab Content */}
            {activeTab === 'details' && (
              <div className="space-y-4 py-4">
              {/* Product Info & Image - Compact Card */}
              <div className="border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 border-gray-200 p-4">
                <div className="flex gap-4">
                  {/* Product Image - Compact */}
                  <div className="flex-shrink-0">
                  {productImages.length > 0 ? (
                    <SimpleImageDisplay
                      images={productImages.map(img => img.url)}
                      productName={product.name}
                      size="md"
                      className="w-24 h-24 rounded-lg"
                    />
                  ) : (
                      <div className="w-24 h-24 bg-orange-100 rounded-lg flex items-center justify-center border-2 border-dashed border-orange-400">
                        <Camera className="w-6 h-6 text-orange-500" />
                    </div>
                  )}
                </div>

                  {/* Basic Information */}
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Product Name</p>
                        <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500">Category</p>
                        <p className="font-semibold text-gray-900 text-sm">{product.categoryName || 'Uncategorized'}</p>
                      </div>

                      {product.barcode && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Barcode</p>
                          <p className="font-semibold text-gray-900 font-mono text-sm">{product.barcode}</p>
                        </div>
                      )}
                    </div>

                    {/* Current Stock Level - Integrated */}
                    <div className="pt-3 border-t border-gray-200">
                      {isLoadingStock ? (
                        <div className="flex items-center justify-center gap-2 py-1">
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-orange-600 border-t-transparent"></div>
                          <span className="text-xs text-gray-600">Loading stock...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-3.5 h-3.5 text-gray-600" />
                            <span className="text-xs text-gray-600">Current Stock:</span>
                            {!isLoadingStock && realTimeStock.has(product.id) && (
                              <span className="text-xs text-green-600 font-medium">(Live)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${
                              currentTotalStock === 0 ? 'bg-red-500' :
                              currentTotalStock <= 5 ? 'bg-orange-500' :
                              'bg-green-500'
                            }`}></div>
                            <span className={`text-lg font-bold ${stockStatus.color}`}>
                              {currentTotalStock}
                            </span>
                            <span className={`text-xs font-medium ${stockStatus.color}`}>
                              units
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>

              {/* Variant Selection - Compact Space-Saving Design */}
              {hasMultipleVariants && (
                <div>
                    {/* Display selected variant(s) */}
                    {selectedVariant && !isMultiVariantMode ? (
                      <div className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
                        isVariantsExpanded 
                          ? 'border-blue-500 shadow-xl' 
                          : 'border-green-200 hover:border-green-300 hover:shadow-md'
                      }`}>
                        <div className="flex items-start justify-between p-6 cursor-pointer" onClick={() => setIsVariantsExpanded(!isVariantsExpanded)}>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                                isVariantsExpanded ? 'bg-blue-500' : 'bg-green-500'
                              }`}>
                                <svg className={`w-4 h-4 text-white transition-transform duration-200 ${
                                  isVariantsExpanded ? 'rotate-180' : ''
                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-lg font-bold text-gray-900">{selectedVariant.name}</h4>
                                  {!isVariantsExpanded && (selectedVariant.quantity || 0) === 0 ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                      Out of Stock
                                    </span>
                                  ) : !isVariantsExpanded && (selectedVariant.quantity || 0) <= 5 ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200 animate-pulse">
                                      Low Stock
                                    </span>
                                  ) : !isVariantsExpanded ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Done
                                    </span>
                                  ) : null}
                                </div>
                                {isVariantsExpanded ? (
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                                        (selectedVariant.quantity || 0) === 0 
                                          ? 'bg-red-500 text-white' 
                                          : (selectedVariant.quantity || 0) <= 5 
                                            ? 'bg-orange-500 text-white' 
                                            : 'bg-green-500 text-white'
                                      }`}>
                                        {selectedVariant.quantity || 0}
                                      </span>
                                      <span className="text-gray-500">units available</span>
                                    </p>
                                    {product.variants && product.variants.length > 1 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                        {product.variants.length} devices
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 mt-1">Stock: {selectedVariant.quantity || 0}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {!isVariantsExpanded && (
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMultiVariantMode(true);
                                    setIsMultiVariantPopupOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm hover:shadow-md"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                  Multiple
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsVariantsExpanded(!isVariantsExpanded);
                                  }}
                                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                  </svg>
                                  Change
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setIsMultiVariantMode(false);
                            setIsVariantsExpanded(true);
                          }}
                          className="flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-purple-700"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          One
                        </button>
                        <button
                          onClick={() => {
                            setIsMultiVariantMode(true);
                            setIsMultiVariantPopupOpen(true);
                          }}
                          className="flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md hover:shadow-lg hover:from-purple-600 hover:to-purple-700"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          Multiple
                        </button>
                      </div>
                    )}

                    {/* Quick Variant List for single mode */}
                    {isVariantsExpanded && !isMultiVariantMode && (
                      <div className="bg-white p-6 border-t-2 border-gray-200 rounded-b-2xl">
                        <div className="space-y-3">
                          {product.variants?.map((variant) => {
                            const isSelected = selectedVariant?.id === variant.id;
                            return (
                              <div
                                key={variant.id}
                                onClick={() => {
                                  handleVariantSelect(variant);
                                  setIsVariantsExpanded(false);
                                }}
                                className={`group relative border-2 rounded-2xl bg-white transition-all duration-300 cursor-pointer overflow-hidden ${
                                  isSelected
                                    ? 'border-green-400 shadow-md'
                                    : 'border-gray-200 hover:border-blue-400 hover:-translate-y-0.5'
                                }`}
                              >
                                <div className="flex items-center justify-between p-5">
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                      isSelected
                                        ? 'bg-gradient-to-br from-green-100 to-green-200'
                                        : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-50 group-hover:to-indigo-50'
                                    }`}>
                                      <Package className={`w-6 h-6 transition-colors ${
                                        isSelected 
                                          ? 'text-green-600' 
                                          : 'text-gray-400 group-hover:text-blue-500'
                                      }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <h4 className="text-xl font-bold text-gray-900 truncate">{variant.name}</h4>
                                        {isSelected ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Done
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                            Stock: {variant.quantity ?? variant.stockQuantity ?? variant.stock_quantity ?? 0}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2 ml-4">
                                    <button
                                      className={`px-6 py-2.5 rounded-xl font-bold transition-all transform hover:scale-105 ${
                                        isSelected
                                          ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                                      }`}
                                    >
                                      {isSelected ? 'Selected' : 'Select'}
                                    </button>
                                  </div>
                                </div>
                                <div className={`absolute inset-0 bg-gradient-to-r ${
                                  isSelected
                                    ? 'from-green-500/5 via-green-500/10 to-green-500/5'
                                    : 'from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-blue-500/10 group-hover:to-blue-500/5'
                                } transition-all duration-300 pointer-events-none rounded-2xl`}></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Multi-Variant Summary - Show only in multi-select mode */}
              {isMultiVariantMode && selectedVariants.size > 0 && (
                <div className="border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 border-green-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Order Summary ({selectedVariants.size} variants)
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {Array.from(selectedVariants.values()).map(({ variant, quantity, costPrice }) => {
                      const price = parseFloat(costPrice) || 0;
                      const total = price * quantity;
                      return (
                        <div key={variant.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:border-blue-300 transition-all">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{variant.name}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {quantity} units × {formatMoney(price, safeSelectedCurrency)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-green-600 text-lg">{formatMoney(total, safeSelectedCurrency)}</p>
                            </div>
                            <button
                              onClick={() => {
                                setIsMultiVariantPopupOpen(true);
                                // Open the popup and expand this specific variant for editing
                                setExpandedVariantIds(new Set([variant.id]));
                                // Mark as pending (being edited)
                                const newSelected = new Map(selectedVariants);
                                const data = newSelected.get(variant.id);
                                if (data) {
                                  newSelected.set(variant.id, {
                                    ...data,
                                    configured: false
                                  });
                                  setSelectedVariants(newSelected);
                                }
                              }}
                              className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Total for all selected variants */}
                  <div className="mt-4 pt-4 border-t-2 border-gray-200">
                    <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 shadow-sm border-2 border-gray-200">
                      <span className="text-lg font-bold text-gray-900">Total Amount</span>
                      <span className="text-3xl font-bold text-orange-600">
                        {formatMoney(
                          Array.from(selectedVariants.values()).reduce((sum, { quantity, costPrice }) => {
                            return sum + ((parseFloat(costPrice) || 0) * quantity);
                          }, 0),
                          safeSelectedCurrency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase Order Controls & Cost Price - Combined Card - Hide in multi-variant mode or when no variant selected */}
              {!isMultiVariantMode && selectedVariant && (
                <div className="border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 border-gray-200 p-6">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Cost Price Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-semibold text-gray-900">
                          Cost Price (per unit) *
                        </label>
                        {poStats?.lastCostPrice && poStats.lastCostPrice > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomCostPrice((poStats.lastCostPrice || 0).toString());
                              setHasManuallyEditedPrice(false);
                              toast.success('Last purchase price filled!');
                            }}
                            className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-orange-50 border border-orange-200 transition-colors whitespace-nowrap"
                          >
                            <TrendingUp className="w-3 h-3" />
                            Last
                          </button>
                        )}
                      </div>
                      
                      {/* Price Input with Integrated Currency Selector */}
                      <div className="border-2 border-gray-300 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                        <div className="flex items-center">
                          {/* Currency Selector */}
                          <div className="border-r-2 border-gray-300 bg-gray-50">
                            <select
                              value={safeSelectedCurrency.code}
                              onChange={async (e) => {
                                const newCurrency = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value);
                                if (newCurrency) {
                                  setSelectedCurrency(newCurrency);
                                  if (newCurrency.code !== currency.code) {
                                    await loadExchangeRate(newCurrency.code, currency.code);
                                  } else {
                                    setExchangeRate(1);
                                  }
                                }
                              }}
                              className="h-full px-2 py-3 bg-transparent border-none text-gray-900 font-bold cursor-pointer focus:outline-none focus:ring-0 text-xs"
                            >
                              {SUPPORTED_CURRENCIES.map(currencyOption => (
                                <option key={currencyOption.code} value={currencyOption.code}>
                                  {currencyOption.flag} {currencyOption.code}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {/* Price Input */}
                          <input
                            type="text"
                            value={customCostPrice ? formatNumberWithCommas(parseFloat(customCostPrice)) : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/,/g, '');
                              if (value === '' || parseFloat(value) >= 0) {
                                setCustomCostPrice(value);
                                setHasManuallyEditedPrice(true);
                              }
                            }}
                            onFocus={(e) => {
                              if (customCostPrice && parseFloat(customCostPrice) > 0) {
                                (e.target as HTMLInputElement).select();
                              }
                            }}
                            onClick={(e) => {
                              if (customCostPrice && parseFloat(customCostPrice) > 0) {
                                (e.target as HTMLInputElement).select();
                              }
                            }}
                            placeholder="0"
                            className="flex-1 px-3 py-3 border-0 focus:outline-none focus:ring-0 text-xl font-bold text-gray-900 placeholder-gray-400 bg-white"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        
                        {/* Exchange Rate Display */}
                        {safeSelectedCurrency.code !== currency.code && customCostPrice && parseFloat(customCostPrice) > 0 && (
                          <div className="px-2 py-1.5 flex items-center justify-between text-xs border-t border-gray-200 bg-blue-50">
                            <span className="text-gray-600 font-medium">= {currency.code}:</span>
                            <span className="font-bold text-blue-600">
                              {formatMoney(calculateExchangedPrice(parseFloat(customCostPrice)), currency).replace(/\.00$/, '').replace(/\.0$/, '')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quantity Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Order Quantity
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(-1)}
                          disabled={quantity <= 1}
                          className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            setQuantity(Math.max(1, value));
                          }}
                          min="1"
                          className="w-28 px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-200/50 text-center font-bold text-xl [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(1)}
                          className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-100 transition text-lg"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Minimum Stock Alert */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Minimum Stock Alert
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleMinStockChange(-1)}
                          disabled={minimumStock <= 0}
                          className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <input
                          type="number"
                          value={minimumStock}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setMinimumStock(Math.max(0, value));
                          }}
                          min="0"
                          className="w-28 px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-200/50 text-center font-bold text-xl [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleMinStockChange(1)}
                          className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-100 transition text-lg"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* History Tab Content */}
            {activeTab === 'history' && (
              <div className="space-y-4 py-4">
                {isLoadingPOHistory ? (
                  <div className="border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 border-gray-200 p-4">
                    <div className="flex items-center justify-center py-6">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <span className="ml-3 text-gray-600 text-sm">Loading purchase history...</span>
                    </div>
                  </div>
                ) : !poStats || purchaseOrderHistory.length === 0 ? (
                  <div className="border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 border-gray-200 p-8">
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Truck className="w-8 h-8 text-blue-500" />
                      </div>
                      <p className="text-gray-600 font-medium">No purchase history</p>
                      <p className="text-xs text-gray-500 mt-1">This will be the first order for this product</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Statistics Grid */}
                    <div className="border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 border-gray-200 p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                        Purchase Statistics
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Total Orders */}
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                          <p className="text-3xl font-bold text-blue-600">{poStats.totalOrders}</p>
          </div>

                        {/* Total Quantity */}
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-500 mb-1">Total Quantity</p>
                          <p className="text-3xl font-bold text-purple-600">{poStats.totalQuantityOrdered}</p>
                          <p className="text-xs text-gray-600 mt-1">Received: {poStats.totalQuantityReceived}</p>
                      </div>

                      {/* Average Cost */}
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-500 mb-1">Average Cost</p>
                          <p className="text-xl font-bold text-green-600">
                          {formatMoney(poStats.averageCostPrice, currency)}
                          </p>
                      </div>

                        {/* Last Order */}
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-500 mb-1">Last Order</p>
                          <p className="text-sm font-bold text-gray-900">
                          {poStats.lastOrderDate ? new Date(poStats.lastOrderDate).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Price Trend */}
                    {poStats.lowestCostPrice && poStats.highestCostPrice && (
                      <div className="border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-900">Price Range</span>
                          {poStats.lastCostPrice && (
                            <div className="flex items-center gap-1">
                              {poStats.lastCostPrice < poStats.averageCostPrice ? (
                                <>
                                  <TrendingDown className="w-5 h-5 text-green-600" />
                                  <span className="text-sm text-green-600 font-medium">Below average</span>
                                </>
                              ) : (
                                <>
                                  <TrendingUp className="w-5 h-5 text-red-600" />
                                  <span className="text-sm text-red-600 font-medium">Above average</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Lowest</div>
                            <div className="font-bold text-green-700 text-lg">
                              {formatMoney(poStats.lowestCostPrice, currency)}
                            </div>
                          </div>
                          <div className="flex-1 mx-6">
                            <div className="h-3 bg-gray-300 rounded-full"></div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Highest</div>
                            <div className="font-bold text-red-700 text-lg">
                              {formatMoney(poStats.highestCostPrice, currency)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recent Orders List */}
                    {purchaseOrderHistory.length > 0 && (
                      <div className="border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-600" />
                            Order History
                          </h3>
                          <span className="text-sm font-medium text-gray-600 bg-gray-200 px-3 py-1 rounded-full">
                            {purchaseOrderHistory.length} orders
                          </span>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                          {purchaseOrderHistory.map((order) => (
                            <div
                              key={order.id}
                              className="bg-white rounded-2xl border-2 border-gray-200 p-4 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                                  #{order.orderNumber}
                                </span>
                                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                  order.poStatus === 'completed' || order.poStatus === 'received' 
                                    ? 'bg-green-100 text-green-700 border border-green-300'
                                    : order.poStatus === 'cancelled' 
                                    ? 'bg-red-100 text-red-700 border border-red-300'
                                    : order.poStatus === 'shipped' || order.poStatus === 'partial_received'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                                }`}>
                                  {order.poStatus.replace(/_/g, ' ').toUpperCase()}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                                <div>
                                  <span className="text-xs text-gray-500">Supplier</span>
                                  <div className="font-semibold text-gray-900 mt-1">{order.supplierName}</div>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">Date</span>
                                  <div className="font-semibold text-gray-900 mt-1">
                                    {new Date(order.orderDate).toLocaleDateString()}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">Quantity</span>
                                  <div className="font-semibold text-gray-900 mt-1 flex items-center gap-1">
                                    {order.receivedQuantity}/{order.quantity}
                                    {order.receivedQuantity === order.quantity && (
                                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="pt-3 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">Cost per unit</span>
                                  <div className="font-bold text-orange-600 text-lg">
                                    {formatMoney(order.costPrice, currency)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons - Only show on Details tab */}
          {activeTab === 'details' && (
            <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={isMultiVariantMode ? handleAddMultipleToCart : handleAddToCart}
                disabled={
                  isMultiVariantMode 
                    ? selectedVariants.size === 0 || isSavingPrice
                    : !selectedVariant || costPrice <= 0 || isSavingPrice
                }
                className="w-full px-6 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
              >
                {isSavingPrice ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      {isMultiVariantMode 
                        ? `Add ${selectedVariants.size} Variant${selectedVariants.size !== 1 ? 's' : ''} to Order`
                        : 'Add to Order'
                      }
                    </span>
                  </>
                )}
              </button>
          </div>
          )}
        </div>
      </div>

      {/* Multi-Variant Selection Popup */}
      {isMultiVariantPopupOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" role="dialog" aria-modal="true" aria-labelledby="variant-modal-title" onClick={() => setIsMultiVariantPopupOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setIsMultiVariantPopupOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Header - Fixed */}
            <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <Package className="w-8 h-8 text-white" />
                </div>
                
                {/* Text and Progress */}
                <div>
                  <h3 id="variant-modal-title" className="text-2xl font-bold text-gray-900 mb-3">Select Multiple Variants</h3>
                  
                  {/* Progress Indicator */}
                  <div className="flex items-center gap-4">
                    {selectedVariants.size > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-bold text-green-700">
                          {Array.from(selectedVariants.values()).filter(d => d.configured).length} Configured
                        </span>
                      </div>
                    )}
                    {selectedVariants.size > 0 && Array.from(selectedVariants.values()).some(d => !d.configured) && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg animate-pulse">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-bold text-orange-700">
                          {Array.from(selectedVariants.values()).filter(d => !d.configured).length} Pending
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Variants List Section */}
            <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
              <div className="space-y-4 py-4">
                {/* Sort variants: unconfigured first, then configured */}
                {product.variants
                  ?.slice()
                  .sort((a, b) => {
                    const aData = selectedVariants.get(a.id);
                    const bData = selectedVariants.get(b.id);
                    const aConfigured = aData?.configured === true;
                    const bConfigured = bData?.configured === true;
                    
                    // Unconfigured first
                    if (aConfigured && !bConfigured) return 1;
                    if (!aConfigured && bConfigured) return -1;
                    return 0;
                  })
                  .map((variant) => {
                  const isSelected = selectedVariants.has(variant.id);
                  const data = selectedVariants.get(variant.id);
                  const isExpanded = expandedVariantIds.has(variant.id);
                  const isConfigured = isSelected && data?.configured === true;

                  const totalCost = data ? parseFloat(data.costPrice) * data.quantity : 0;

                  return (
                    <div
                      key={variant.id}
                      className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
                        isExpanded 
                          ? 'border-blue-500 shadow-xl' 
                          : isConfigured
                            ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                            : isSelected
                              ? 'border-orange-300 hover:border-orange-400 hover:shadow-md'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      {/* Variant Header - Clickable */}
                      <div 
                        className="flex items-start justify-between p-6 cursor-pointer"
                        onClick={() => {
                          // Auto-mark currently expanded variants as configured if they have valid data
                          const newSelected = new Map(selectedVariants);
                          expandedVariantIds.forEach(expandedId => {
                            const data = newSelected.get(expandedId);
                            if (expandedId !== variant.id && data && parseFloat(data.costPrice) > 0 && data.quantity > 0) {
                              newSelected.set(expandedId, {
                                ...data,
                                configured: true
                              });
                            }
                          });
                          
                          // If not selected, select it and expand it
                          if (!isSelected) {
                            newSelected.set(variant.id, {
                              variant,
                              quantity: 1,
                              costPrice: variant.costPrice?.toString() || customCostPrice || '',
                              configured: false
                            });
                            setSelectedVariants(newSelected);
                            // Expand only this variant (close all others)
                            setExpandedVariantIds(new Set([variant.id]));
                          } else {
                            // If already selected, toggle expansion
                            if (expandedVariantIds.has(variant.id)) {
                              // Collapse this variant and mark as configured if valid
                              if (data && parseFloat(data.costPrice) > 0 && data.quantity > 0) {
                                newSelected.set(variant.id, {
                                  ...data,
                                  configured: true
                                });
                              }
                              setSelectedVariants(newSelected);
                              setExpandedVariantIds(new Set());
                            } else {
                              // Expand this variant for editing - mark as pending (being edited)
                              if (data) {
                                newSelected.set(variant.id, {
                                  ...data,
                                  configured: false // Mark as pending while editing
                                });
                              }
                              setSelectedVariants(newSelected);
                              // Expand only this variant (close all others)
                              setExpandedVariantIds(new Set([variant.id]));
                            }
                          }
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                              isExpanded ? 'bg-blue-500' : 'bg-gray-200'
                            }`}>
                              <svg 
                                className={`w-4 h-4 text-white transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-lg font-bold text-gray-900">
                                  {variant.name}
                                </h4>
                                {/* Status Badge */}
                                {isConfigured ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Done
                                  </span>
                                ) : isSelected ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm animate-pulse">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Pending
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-sm text-gray-500 mt-1">Quantity: {data?.quantity || 0}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {/* Total Cost Badge */}
                          {isConfigured && data && (
                            <>
                            <div className="px-4 py-2 rounded-xl text-base font-bold shadow-sm bg-green-100 text-green-700 border border-green-200">
                              {safeSelectedCurrency.symbol} {formatNumberWithCommas(totalCost)}
                            </div>
                              {/* Edit hint */}
                              <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Click to edit
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expanded Content - Only show when variant is expanded */}
                      {isExpanded && isSelected && data && (
                        <div className="px-6 pb-6">
                          {/* Editable Fields Row */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            {/* Cost Price */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Cost Price *
                              </label>
                              <input
                                type="text"
                                value={formatNumberWithCommas(parseFloat(data.costPrice) || 0)}
                                onFocus={(e) => {
                                  // Clear the field if it's 0 when user focuses
                                  if (parseFloat(data.costPrice) === 0 || !data.costPrice) {
                                    e.target.select();
                                  }
                                }}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/,/g, '');
                                  if (value === '' || !isNaN(parseFloat(value))) {
                                    updateVariantCostPrice(variant.id, value);
                                  }
                                }}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-xl font-bold bg-white"
                                placeholder="0"
                              />
                            </div>

                            {/* Quantity */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Quantity
                              </label>
                              <div className="flex items-center border-2 border-gray-300 rounded-xl focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200 bg-white">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateVariantQuantity(variant.id, data.quantity - 1);
                                  }}
                                  disabled={data.quantity <= 1}
                                  className="flex-shrink-0 px-4 py-3 text-gray-900 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 transition-colors border-r border-gray-300"
                                >
                                  <span className="text-2xl font-bold">−</span>
                                </button>
                                <input
                                  type="number"
                                  value={data.quantity}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updateVariantQuantity(variant.id, parseInt(e.target.value) || 1)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 px-4 py-3 border-0 focus:outline-none focus:ring-0 text-gray-900 text-xl font-bold bg-white text-center min-w-0"
                                  min="1"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateVariantQuantity(variant.id, data.quantity + 1);
                                  }}
                                  className="flex-shrink-0 px-4 py-3 text-gray-900 hover:bg-gray-100 transition-colors border-l border-gray-300"
                                >
                                  <span className="text-2xl font-bold">+</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popup Footer */}
            <div className="p-6 pt-4 border-t border-gray-200 bg-white flex gap-4 flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedVariants(new Map());
                  setExpandedVariantIds(new Set());
                  setIsMultiVariantPopupOpen(false);
                  setIsMultiVariantMode(false);
                }}
                className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 rounded-xl transition-all font-bold shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear All
              </button>
              <button
                onClick={() => {
                  // Auto-mark currently expanded variants as configured if they have valid price
                  const newSelected = new Map(selectedVariants);
                  expandedVariantIds.forEach(expandedId => {
                    const data = newSelected.get(expandedId);
                    if (data && parseFloat(data.costPrice) > 0 && data.quantity > 0) {
                      newSelected.set(expandedId, {
                        ...data,
                        configured: true
                      });
                    }
                  });
                  setSelectedVariants(newSelected);
                  setIsMultiVariantPopupOpen(false);
                }}
                disabled={selectedVariants.size === 0}
                className="flex-1 px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirm Selection ({selectedVariants.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  };

export default ProductDetailModal;
