// ProductDetailModal component - Shows full product details for purchase orders with editing capabilities
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Package, Tag, Hash, ShoppingCart, 
  CheckCircle, Camera, QrCode, ArrowUpDown, 
  TrendingUp, TrendingDown, Calendar, Truck, 
  DollarSign, BarChart3, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SimpleImageDisplay from '../../../../components/SimpleImageDisplay';
import { formatMoney, Currency, SUPPORTED_CURRENCIES } from '../../lib/purchaseOrderUtils';
import { ProductSearchResult, ProductSearchVariant } from '../../types/pos';
import { 
  getPrimaryVariant, 
  getProductTotalStock,
  isMultiVariantProduct 
} from '../../lib/productUtils';
import { RealTimeStockService } from '../../lib/realTimeStock';
import { getLatsProvider } from '../../lib/data/provider';
import { usePurchaseOrderHistory } from '../../hooks/usePurchaseOrderHistory';

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
  
  // Real-time stock state
  const [realTimeStock, setRealTimeStock] = useState<Map<string, number>>(new Map());
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [lastStockUpdate, setLastStockUpdate] = useState<Date | null>(null);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const dataProvider = getLatsProvider();
  
  // Tab state - MUST be declared before the hook that depends on it
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  
  // Purchase order history tracking - LAZY LOADED only when History tab is active
  const [shouldLoadHistory, setShouldLoadHistory] = useState(false);
  const { history: purchaseOrderHistory, stats: poStats, isLoading: isLoadingPOHistory } = usePurchaseOrderHistory(shouldLoadHistory ? product?.id : undefined);

  // Update selectedCurrency when currency prop changes
  useEffect(() => {
    if (currency) {
      setSelectedCurrency(currency);
    }
  }, [currency]);

  // Trigger lazy loading of purchase history when user switches to History tab
  useEffect(() => {
    if (activeTab === 'history' && !shouldLoadHistory && product?.id) {
      console.log('📊 User switched to History tab - loading purchase order history...');
      setShouldLoadHistory(true);
    }
  }, [activeTab, shouldLoadHistory, product?.id]);

  // Reset state when modal closes to ensure fresh data on next open
  useEffect(() => {
    if (!isOpen) {
      setShouldLoadHistory(false);
      setActiveTab('details');
    }
  }, [isOpen]);

  // Safety check to ensure selectedCurrency is always defined
  const safeSelectedCurrency = selectedCurrency || safeCurrency;

  // Initialize with primary variant
  useEffect(() => {
    if (product && !selectedVariant) {
      const primary = getPrimaryVariant(product);
      if (primary) {
        setSelectedVariant(primary);
        // Initialize minimum stock from product data (ProductSearchResult doesn't have minimumStock)
        setMinimumStock(2); // Default to 2 units for low stock alerts
      }
    }
  }, [product, selectedVariant]);

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

  const getExchangeRate = (fromCurrency: string, toCurrency: string): number => {
    const rates: { [key: string]: { [key: string]: number } } = {
      'USD': { 'KES': 150, 'EUR': 0.85, 'CNY': 7.2 },
      'KES': { 'USD': 0.0067, 'EUR': 0.0057, 'CNY': 0.048 },
      'EUR': { 'USD': 1.18, 'KES': 175, 'CNY': 8.5 },
      'CNY': { 'USD': 0.14, 'KES': 21, 'EUR': 0.12 }
    };
    return rates[fromCurrency]?.[toCurrency] || 1;
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
      return product.stockQuantity ?? product.totalQuantity ?? 0;
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

  const totalPrice = costPrice * quantity;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="rounded-lg border border-gray-300 bg-white p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Product Details</h2>
                <p className="text-sm text-gray-600">Review and customize before adding to purchase order</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-300 px-6">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === 'details'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Product Details
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === 'history'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Purchase History
                {purchaseOrderHistory.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                    {purchaseOrderHistory.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Details Tab Content */}
            {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Product Information */}
              <div className="space-y-6">
                
                {/* Product Images */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Product Images</h3>
                  {productImages.length > 0 ? (
                    <SimpleImageDisplay
                      images={productImages}
                      productName={product.name}
                      size="xl"
                      className="w-[392px] h-[392px] rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-64 bg-orange-100 rounded-lg flex items-center justify-center border-2 border-dashed border-orange-400">
                      <div className="text-center">
                        <Camera className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                        <p className="text-orange-600 font-medium">No images available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Tag className="w-5 h-5 text-gray-600" />
                      <div>
                        <span className="text-sm text-gray-600">Product Name:</span>
                        <div className="font-medium text-gray-900">{product.name}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Hash className="w-5 h-5 text-gray-600" />
                      <div>
                        <span className="text-sm text-gray-600">SKU:</span>
                        <div className="font-medium text-gray-900 font-mono">{product.sku}</div>
                      </div>
                    </div>

                    {product.barcode && (
                      <div className="flex items-center gap-3">
                        <QrCode className="w-5 h-5 text-gray-600" />
                        <div>
                          <span className="text-sm text-gray-600">QrCode:</span>
                          <div className="font-medium text-gray-900 font-mono">{product.barcode}</div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-gray-600" />
                      <div>
                        <span className="text-sm text-gray-600">Category:</span>
                        <div className="font-medium text-gray-900">{product.categoryName || 'Uncategorized'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock Availability - Compact */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Stock Availability</h3>
                  <div className={`${stockStatus.bg} rounded-lg border ${stockStatus.border} p-3`}>
                    {/* Compact Header with Status and Live Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          stockStatus.status === 'In Stock' ? 'bg-green-500' :
                          stockStatus.status === 'Low Stock' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}></div>
                        <span className={`text-xs font-semibold ${stockStatus.color}`}>
                          {stockStatus.status}
                        </span>
                      </div>
                      {!isLoadingStock && realTimeStock.has(product.id) && (
                        <div className="flex items-center gap-1 bg-green-100 px-1.5 py-0.5 rounded-full">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-green-700">Live</span>
                        </div>
                      )}
                    </div>

                    {/* Compact Stock Display */}
                    {isLoadingStock ? (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <div className="w-5 h-5 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs text-gray-600">Loading...</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className={`text-2xl font-bold ${stockStatus.color}`}>
                            {currentTotalStock}
                          </span>
                          <span className="text-xs text-gray-600">units</span>
                        </div>
                        {minimumStock > 0 && (
                          <div className="flex items-center gap-1.5">
                            {currentTotalStock <= minimumStock && (
                              <div className="flex items-center gap-1 bg-red-100 px-1.5 py-0.5 rounded-full">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                <span className="text-xs font-semibold text-red-700">Alert</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Minimum Stock Info - Compact */}
                    {minimumStock > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                          <span className="text-xs text-gray-600">
                            Min: <span className="font-semibold text-gray-900">{minimumStock}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Purchase Order Setup */}
              <div className="space-y-6">
                {/* Variant Selection */}
                {hasMultipleVariants && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-800">Select Variant</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {product.variants?.map((variant) => (
                        <div
                          key={variant.id}
                          onClick={() => handleVariantSelect(variant)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedVariant?.id === variant.id
                              ? 'border-orange-300 bg-orange-50'
                              : 'border-gray-200 hover:border-orange-200 hover:bg-orange-25'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{variant.name}</div>
                              <div className="text-sm text-gray-600">SKU: {variant.sku}</div>
                              <div className="text-sm text-gray-600">
                                Stock: {isLoadingStock ? 'Loading...' : (variant.quantity || 0)}
                                {isLoadingStock && <span className="ml-1 text-orange-500">🔄</span>}
                                {!isLoadingStock && realTimeStock.has(product.id) && (
                                  <span className="ml-1 text-green-500" title="Real-time data">✓</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">
                                {formatMoney(variant.sellingPrice || variant.price || variant.costPrice || 0, currency).replace(/\.00$/, '').replace(/\.0$/, '')}
                              </div>
                              {selectedVariant?.id === variant.id && (
                                <CheckCircle className="w-5 h-5 text-orange-600 mt-1" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-900">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg border border-gray-300"
                    >
                      <span className="text-lg font-bold">-</span>
                    </button>
                    
                    <div className="flex-1">
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          setQuantity(Math.max(1, value));
                        }}
                        min="1"
                        className="w-full text-center text-xl font-bold text-gray-900 border-2 border-gray-300 rounded-lg py-2 px-4 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(1)}
                      className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg border border-gray-300"
                    >
                      <span className="text-lg font-bold">+</span>
                    </button>
                  </div>
                </div>

                {/* Minimum Stock Level */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-900">Minimum Stock Level</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleMinStockChange(-1)}
                      disabled={minimumStock <= 0}
                      className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg border border-gray-300"
                    >
                      <span className="text-lg font-bold">-</span>
                    </button>
                    
                    <div className="flex-1">
                      <input
                        type="number"
                        value={minimumStock}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setMinimumStock(Math.max(0, value));
                        }}
                        min="0"
                        className="w-full text-center text-xl font-bold text-gray-900 border-2 border-gray-300 rounded-lg py-2 px-4 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleMinStockChange(1)}
                      className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg border border-gray-300"
                    >
                      <span className="text-lg font-bold">+</span>
                    </button>
                  </div>
                  
                  {/* Min Stock Info Card */}
                  <div className="bg-amber-50 rounded-lg border border-amber-300 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <div>
                          <div className="text-sm font-medium text-amber-700">
                            {minimumStock > 0 ? 'Low stock alert set' : 'No alert set'}
                          </div>
                          <div className="text-xs text-amber-600">
                            {minimumStock > 0 
                              ? `Alert when stock falls below ${minimumStock} units` 
                              : 'Set a threshold to get low stock alerts'
                            }
                          </div>
                        </div>
                      </div>
                      {minimumStock > 0 && (
                        <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cost Price with Exchange Rate */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900">Cost Price (per unit)</label>
                    {poStats?.lastCostPrice && poStats.lastCostPrice > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomCostPrice(poStats.lastCostPrice.toString());
                          setHasManuallyEditedPrice(false); // Allow auto-fill again
                          toast.success('Last purchase price filled!');
                        }}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                      >
                        <TrendingUp className="w-3 h-3" />
                        Use Last: {formatMoney(poStats.lastCostPrice, safeSelectedCurrency)}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white border-2 border-gray-300 rounded-lg focus-within:border-orange-500">
                    {/* Currency Selector */}
                    <div className="flex-shrink-0 flex items-center gap-2 p-2 bg-gray-200 rounded">
                      <select
                        value={safeSelectedCurrency.code}
                        onChange={(e) => {
                          const newCurrency = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value);
                          if (newCurrency) {
                            setSelectedCurrency(newCurrency);
                            // Recalculate exchange rate
                            if (newCurrency.code !== currency.code) {
                              const rate = getExchangeRate(newCurrency.code, currency.code);
                              setExchangeRate(rate);
                            }
                          }
                        }}
                        className="bg-transparent border-none text-gray-900 font-medium text-sm focus:outline-none focus:ring-0 cursor-pointer pr-6"
                      >
                        {SUPPORTED_CURRENCIES.map(currencyOption => (
                          <option key={currencyOption.code} value={currencyOption.code}>
                            {currencyOption.flag} {currencyOption.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-300"></div>
                    
                    {/* Price Input */}
                    <div className="flex-1">
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
                        placeholder={product.costPrice ? product.costPrice.toString() : "0"}
                        className="w-full border-0 focus:outline-none focus:ring-0 text-xl font-bold text-gray-900 placeholder-gray-400 bg-transparent"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    
                    {/* Exchange Rate Display */}
                    <div className="flex-shrink-0">
                      {safeSelectedCurrency.code !== currency.code && customCostPrice && parseFloat(customCostPrice) > 0 && (
                        <div className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium">
                          ≈ {formatMoney(calculateExchangedPrice(parseFloat(customCostPrice)), currency).replace(/\.00$/, '').replace(/\.0$/, '')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Exchange Rate Calculation */}
                  {safeSelectedCurrency.code !== currency.code && customCostPrice && parseFloat(customCostPrice) > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-300">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-700">
                          Price in {safeSelectedCurrency.code}: {formatMoney(costPrice, safeSelectedCurrency).replace(/\.00$/, '').replace(/\.0$/, '')}
                        </span>
                        <ArrowUpDown className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-700">
                          Converted to {currency.code}: {formatMoney(calculateExchangedPrice(costPrice), currency).replace(/\.00$/, '').replace(/\.0$/, '')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Display suggested cost from latest purchase or product cost price */}
                  {(() => {
                    const suggestedCost = poStats?.lastCostPrice || product.costPrice;
                    const isFromHistory = !!poStats?.lastCostPrice;
                    
                    if (suggestedCost) {
                      return (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">
                            {isFromHistory ? 'Last purchase price:' : 'Suggested cost:'}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatMoney(suggestedCost, safeSelectedCurrency).replace(/\.00$/, '').replace(/\.0$/, '')}
                          </span>
                          {isFromHistory && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              Recent
                            </span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Order Summary - Compact Design */}
                <div className="bg-white rounded-lg border-2 border-orange-300 overflow-hidden">
                  {/* Compact Header */}
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-white" />
                      <h3 className="text-sm font-bold text-white">Order Summary</h3>
                    </div>
                  </div>
                  
                  {/* Compact Content */}
                  <div className="p-3 space-y-2">
                    {/* Product Name - Compact */}
                    <div className="pb-2 border-b border-gray-200">
                      <div className="text-sm font-semibold text-gray-900 truncate">{product.name}</div>
                      {selectedVariant && selectedVariant.name !== 'Default' && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {selectedVariant.name}
                        </div>
                      )}
                    </div>
                    
                    {/* Order Details - Simple List */}
                    <div className="space-y-1.5">
                      {/* Quantity */}
                      <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded">
                        <span className="text-xs text-gray-600">Quantity</span>
                        <span className="text-sm font-bold text-gray-900">{quantity} units</span>
                      </div>
                      
                      {/* Unit Cost */}
                      {customCostPrice && parseFloat(customCostPrice) > 0 && (
                        <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded">
                          <span className="text-xs text-gray-600">Unit Cost</span>
                          <span className="text-sm font-bold text-gray-900">
                            {formatMoney(costPrice, safeSelectedCurrency).replace(/\.00$/, '').replace(/\.0$/, '')}
                          </span>
                        </div>
                      )}
                      
                      {/* Exchange Rate - Inline */}
                      {safeSelectedCurrency.code !== currency.code && customCostPrice && parseFloat(customCostPrice) > 0 && (
                        <div className="flex items-center justify-between py-1.5 px-2 bg-blue-50 rounded">
                          <div className="flex items-center gap-1">
                            <ArrowUpDown className="w-3 h-3 text-blue-600" />
                            <span className="text-xs text-blue-700">Exchange Rate</span>
                          </div>
                          <span className="text-xs font-mono text-blue-900">
                            1 {safeSelectedCurrency.code} = {Math.round(exchangeRate)} {currency.code}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Total - Compact but Prominent */}
                    {customCostPrice && costPrice > 0 && (
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-3 mt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-white/90">Total Amount</div>
                            <div className="text-xs text-white/70 mt-0.5">
                              {quantity} × {formatMoney(costPrice, safeSelectedCurrency).replace(/\.00$/, '').replace(/\.0$/, '')}
                              {safeSelectedCurrency.code !== currency.code && ` (${safeSelectedCurrency.code}→${currency.code})`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">
                              {formatMoney(safeSelectedCurrency.code !== currency.code ? calculateExchangedPrice(totalPrice) : totalPrice, currency).replace(/\.00$/, '').replace(/\.0$/, '')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* History Tab Content */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                {isLoadingPOHistory ? (
                  <div className="bg-gray-50 rounded-lg border border-gray-300 p-6">
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading purchase history...</span>
                    </div>
                  </div>
                ) : !poStats || purchaseOrderHistory.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg border border-gray-300 p-12">
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Truck className="w-10 h-10 text-blue-500" />
                      </div>
                      <p className="text-gray-600 font-medium text-lg">No purchase history</p>
                      <p className="text-sm text-gray-500 mt-2">This will be the first order for this product</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Statistics Grid */}
                    <div className="grid grid-cols-4 gap-4">
                      {/* Total Orders */}
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-300">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="w-5 h-5 text-blue-600" />
                          <span className="text-xs font-medium text-blue-700">Total Orders</span>
                        </div>
                        <div className="text-3xl font-bold text-blue-900">{poStats.totalOrders}</div>
          </div>

                      {/* Total Ordered */}
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-300">
                        <div className="flex items-center gap-2 mb-2">
                          <ShoppingCart className="w-5 h-5 text-purple-600" />
                          <span className="text-xs font-medium text-purple-700">Total Ordered</span>
                        </div>
                        <div className="text-3xl font-bold text-purple-900">{poStats.totalQuantityOrdered}</div>
                        <div className="text-xs text-purple-600 mt-1">
                          Received: {poStats.totalQuantityReceived}
                        </div>
                      </div>

                      {/* Average Cost */}
                      <div className="bg-green-50 rounded-lg p-4 border border-green-300">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-xs font-medium text-green-700">Avg Cost</span>
                        </div>
                        <div className="text-xl font-bold text-green-900">
                          {formatMoney(poStats.averageCostPrice, currency)}
                        </div>
                      </div>

                      {/* Last Order Date */}
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-300">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-5 h-5 text-amber-600" />
                          <span className="text-xs font-medium text-amber-700">Last Order</span>
                        </div>
                        <div className="text-sm font-bold text-amber-900">
                          {poStats.lastOrderDate ? new Date(poStats.lastOrderDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Price Trend */}
                    {poStats.lowestCostPrice && poStats.highestCostPrice && (
                      <div className="bg-gray-100 rounded-lg p-6 border border-gray-300">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-semibold text-gray-900">Price Range</span>
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
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
                          <span className="text-sm text-gray-600">{purchaseOrderHistory.length} orders</span>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {purchaseOrderHistory.map((order) => (
                            <div
                              key={order.id}
                              className="bg-white rounded-lg border border-gray-300 p-4 hover:border-blue-400 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-mono text-base font-medium text-blue-600">
                                  #{order.orderNumber}
                                </span>
                                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                  order.poStatus === 'completed' || order.poStatus === 'received' 
                                    ? 'bg-green-100 text-green-700'
                                    : order.poStatus === 'cancelled' 
                                    ? 'bg-red-100 text-red-700'
                                    : order.poStatus === 'shipped' || order.poStatus === 'partial_received'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {order.poStatus.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Supplier</span>
                                  <div className="font-medium text-gray-900 mt-1">{order.supplierName}</div>
                                </div>
                                <div>
                                  <span className="text-gray-600">Date</span>
                                  <div className="font-medium text-gray-900 mt-1">
                                    {new Date(order.orderDate).toLocaleDateString()}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-600">Quantity</span>
                                  <div className="font-medium text-gray-900 mt-1">
                                    {order.receivedQuantity}/{order.quantity} units
                                    {order.receivedQuantity === order.quantity && (
                                      <CheckCircle2 className="w-4 h-4 text-green-600 inline ml-1" />
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Cost per unit</span>
                                  <div className="font-bold text-gray-900 text-base">
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
            <div className="pt-6 border-t border-gray-300 mt-6 px-6 pb-6">
              <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selectedVariant || costPrice <= 0 || isSavingPrice}
                className="w-full py-4 bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-lg font-semibold rounded-lg border border-orange-600 disabled:border-gray-400 flex items-center justify-center gap-2"
              >
                {isSavingPrice ? (
                  <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Saving Price...</span>
                  </>
              ) : (
                  <>
                <ShoppingCart size={20} />
                    <span>Add to Purchase Order</span>
                  </>
              )}
              </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
