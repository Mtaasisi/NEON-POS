/**
 * Trade-In Price Modal
 * Add/Edit trade-in price for devices
 * Redesigned with EnhancedAddSupplierModal UI structure
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, Save, ChevronDown, Smartphone, TrendingUp, Settings, Search, Link2, Calculator, Cpu, HardDrive, Battery, ClipboardCheck, Minus, Plus, LucideIcon, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabaseClient';
import { getProducts } from '../../../../lib/latsProductApi';
import type { TradeInPrice, TradeInPriceFormData } from '../../types/tradeIn';
import { createTradeInPrice, updateTradeInPrice } from '../../lib/tradeInApi';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import ConditionAssessmentModal from './ConditionAssessmentModal';

// Helper: Get default form data
const getDefaultFormData = (): TradeInPriceFormData => ({
  device_name: '',
  device_model: '',
  base_trade_in_price: 0,
  product_id: undefined,
  variant_id: undefined,
  excellent_multiplier: 1.0,
  good_multiplier: 0.85,
  fair_multiplier: 0.70,
  poor_multiplier: 0.50,
  storage_capacity: '',
  battery_health: 100,
  has_charger: false,
  has_original_box: false,
  specifications: {
    storage: 1.0,
    battery: 1.0,
    condition: 1.0,
    screen: 1.0,
  },
  notes: '',
  is_active: true,
});

// Reusable Multiplier Input Component
interface MultiplierInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onAdjust: (delta: number) => void;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'amber';
  badge?: string;
  description: string;
  isLoading?: boolean;
  icon?: LucideIcon;
}

const MultiplierInput: React.FC<MultiplierInputProps> = ({
  label,
  value,
  onChange,
  onAdjust,
  color,
  badge,
  description,
  isLoading = false,
  icon: Icon,
}) => {
  const colorClasses = {
    green: {
      border: 'border-green-200',
      bg: 'bg-green-500',
      text: 'text-green-600',
      hover: 'hover:bg-green-500 hover:text-white hover:border-green-500',
      focus: 'focus:border-green-500 focus:ring-green-200',
    },
    blue: {
      border: 'border-blue-200',
      bg: 'bg-blue-500',
      text: 'text-blue-600',
      hover: 'hover:bg-blue-500 hover:text-white hover:border-blue-500',
      focus: 'focus:border-blue-500 focus:ring-blue-200',
    },
    yellow: {
      border: 'border-yellow-200',
      bg: 'bg-yellow-500',
      text: 'text-yellow-600',
      hover: 'hover:bg-yellow-500 hover:text-white hover:border-yellow-500',
      focus: 'focus:border-yellow-500 focus:ring-yellow-200',
    },
    red: {
      border: 'border-red-200',
      bg: 'bg-red-500',
      text: 'text-red-600',
      hover: 'hover:bg-red-500 hover:text-white hover:border-red-500',
      focus: 'focus:border-red-500 focus:ring-red-200',
    },
    amber: {
      border: 'border-amber-200',
      bg: 'bg-amber-500',
      text: 'text-amber-600',
      hover: 'hover:bg-amber-500 hover:text-white hover:border-amber-500',
      focus: 'focus:border-amber-500 focus:ring-amber-200',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`bg-white rounded-xl p-5 border-2 ${colors.border} shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {badge ? (
            <div className={`w-8 h-8 ${colors.bg} rounded-full flex items-center justify-center shadow-sm`}>
              <span className="text-white text-xs font-bold">{badge}</span>
            </div>
          ) : Icon ? (
            <Icon className={`w-5 h-5 ${colors.text}`} />
          ) : null}
          <label className="text-sm font-semibold text-gray-700">
            {label}
          </label>
        </div>
        <span className={`text-lg font-bold ${colors.text}`}>{value.toFixed(2)}×</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onAdjust(-0.05)}
          className={`w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 ${colors.hover} rounded-lg transition-all font-semibold shadow-sm`}
          disabled={isLoading}
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          min="0"
          max="2"
          step="0.01"
          value={Number(value.toFixed(2))}
          onChange={(e) => onChange(parseFloat(e.target.value) || value)}
          className={`flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none ${colors.focus} focus:ring-2 bg-white text-xl font-bold text-center`}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => onAdjust(0.05)}
          className={`w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 ${colors.hover} rounded-lg transition-all font-semibold shadow-sm`}
          disabled={isLoading}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-500 text-center mt-2">{description}</p>
    </div>
  );
};

interface TradeInPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  price?: TradeInPrice | null;
  onSave: () => void;
}

const TradeInPriceModal: React.FC<TradeInPriceModalProps> = ({
  isOpen,
  onClose,
  price,
  onSave,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Product search and linking state
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [expandedVariantIndex, setExpandedVariantIndex] = useState<number | null>(null);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showSpecificationsModal, setShowSpecificationsModal] = useState(false);
  const [conditionAssessment, setConditionAssessment] = useState<{
    issues: any[];
    calculatedCondition: 'excellent' | 'good' | 'fair' | 'poor';
    images: string[];
  } | null>(null);

  // Form state for direct form handling
  const [formData, setFormData] = useState<TradeInPriceFormData>(getDefaultFormData());

  // Cache products data to avoid multiple API calls
  const [productsCache, setProductsCache] = useState<any[] | null>(null);

  // Helper: Load products with caching
  const loadProductsData = React.useCallback(async () => {
    if (productsCache) return productsCache;
    try {
      const productsData = await getProducts();
      if (productsData && Array.isArray(productsData)) {
        setProductsCache(productsData);
        return productsData;
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
    return [];
  }, [productsCache]);

  // Helper: Load product by ID
  const loadProductById = React.useCallback(async (productId: string) => {
    try {
      const productsData = await loadProductsData();
      const product = productsData.find((p: any) => p.id === productId);
      if (product) {
        setSelectedProduct(product);
      }
    } catch (error) {
      console.error('Error loading product by ID:', error);
    }
  }, [loadProductsData]);

  // Initialize form with price data when editing
  useEffect(() => {
    if (price) {
      setFormData({
        ...getDefaultFormData(),
        device_name: price.device_name || '',
        device_model: price.device_model || '',
        base_trade_in_price: price.base_trade_in_price || 0,
        product_id: price.product_id || undefined,
        variant_id: price.variant_id || undefined,
        excellent_multiplier: price.excellent_multiplier || 1.0,
        good_multiplier: price.good_multiplier || 0.85,
        fair_multiplier: price.fair_multiplier || 0.70,
        poor_multiplier: price.poor_multiplier || 0.50,
        storage_capacity: price.storage_capacity || '',
        battery_health: price.battery_health || 100,
        has_charger: price.has_charger || false,
        has_original_box: price.has_original_box || false,
        specifications: price.specifications || getDefaultFormData().specifications,
        notes: price.notes || '',
        is_active: price.is_active ?? true,
      });

      // Load product and variant data if they exist
      if (price.product) {
        setSelectedProduct(price.product);
      } else if (price.product_id) {
        loadProductById(price.product_id).catch(console.error);
      }

      if (price.variant) {
        setSelectedVariant(price.variant);
      }
    } else {
      // Reset form for new price
      setFormData(getDefaultFormData());
      setSelectedProduct(null);
      setSelectedVariant(null);
      setVariants([]);
    }
  }, [price, loadProductById]);

  // Load variants when product is selected
  const loadVariants = React.useCallback(async (productId: string) => {
    try {
      const { data: variantsData } = await supabase
        .from('lats_product_variants')
        .select('id, variant_name, sku, is_parent')
        .eq('product_id', productId)
        .is('parent_variant_id', null)
        .order('variant_name');

      if (variantsData) {
        setVariants(variantsData);
      }
    } catch (error) {
      console.error('Error loading variants:', error);
    }
  }, []);

  // Load variants when product is selected
  useEffect(() => {
    if (selectedProduct?.id) {
      loadVariants(selectedProduct.id);
    } else {
      setVariants([]);
      setSelectedVariant(null);
    }
  }, [selectedProduct, loadVariants]);

  // Select variant when variants are loaded and we're editing
  useEffect(() => {
    if (price?.variant_id && variants.length > 0 && !selectedVariant) {
      const variant = variants.find(v => v.id === price.variant_id);
      if (variant) {
        setSelectedVariant(variant);
      }
    }
  }, [variants, price?.variant_id, selectedVariant]);

  // Search products
  const searchProducts = React.useCallback(async (query: string) => {
    if (!query.trim()) {
      setProducts([]);
      return;
    }

    const productsData = await loadProductsData();
    const filtered = productsData.filter((p: any) =>
      p.name?.toLowerCase().includes(query.toLowerCase()) ||
      p.sku?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
    setProducts(filtered);
  }, [loadProductsData]);

  // Handle product selection
  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setFormData(prev => ({
      ...prev,
      product_id: product.id,
      device_name: prev.device_name || product.name || '',
      device_model: prev.device_model || product.sku || '',
    }));
    setShowProductSearch(false);
    setProductSearchTerm('');
    setProducts([]);
  };

  // Handle variant selection
  const handleVariantSelect = (variant: any) => {
    setSelectedVariant(variant);
    setFormData(prev => ({ ...prev, variant_id: variant.id }));
  };

  // Unlink product
  const handleUnlinkProduct = () => {
    setSelectedProduct(null);
    setSelectedVariant(null);
    setVariants([]);
    setFormData(prev => ({ ...prev, product_id: undefined, variant_id: undefined }));
  };

  // Format price with commas
  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (num % 1 === 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Adjust value with min/max constraints
  const adjustValue = (field: string, delta: number, min: number = 0, max?: number) => {
    setFormData(prev => {
      const currentValue = prev[field as keyof typeof prev] as number || 0;
      const newValue = Math.max(min, currentValue + delta);
      return {
        ...prev,
        [field]: max ? Math.min(max, newValue) : newValue
      };
    });
  };

  // Adjust multiplier values
  const adjustMultiplier = React.useCallback((field: string, delta: number) => {
    setFormData(prev => {
      // Handle specification multipliers
      if (field.startsWith('specifications.')) {
        const specField = field.split('.')[1] as keyof NonNullable<typeof prev.specifications>;
        const newValue = Math.max(0, Math.min(2, (prev.specifications?.[specField] || 1) + delta));
        return {
          ...prev,
          specifications: {
            ...prev.specifications,
            [specField]: Math.round(newValue * 100) / 100
          }
        };
      }

      // Handle condition multipliers
      const newValue = Math.max(0, Math.min(2, (prev[field as keyof typeof prev] as number || 1) + delta));
      return {
        ...prev,
        [field]: Math.round(newValue * 100) / 100
      };
    });
  }, []);

  // Helper: Update specification multiplier
  const updateSpecification = React.useCallback((field: keyof NonNullable<TradeInPriceFormData['specifications']>, value: number) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [field]: value
      }
    }));
  }, []);

  // Calculate final price based on multipliers
  const calculateFinalPrice = () => {
    let finalPrice = formData.base_trade_in_price;

    if (formData.specifications?.storage) {
      finalPrice *= formData.specifications.storage;
    }
    if (formData.specifications?.battery) {
      finalPrice *= formData.specifications.battery;
    }

    return finalPrice;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      // For optional fields like product_id and variant_id, convert empty string to undefined
      const finalValue = (name === 'product_id' || name === 'variant_id') && value === '' 
        ? undefined 
        : value;
      setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  };


  const handleTradeInPriceCreated = async () => {
    try {
      console.log('🎯 TradeInPriceModal: Starting price creation process');
      console.log('📝 Form data received:', formData);

      setIsLoading(true);

      // Clean form data: convert empty strings to undefined for optional fields
      const cleanedFormData: TradeInPriceFormData = {
        ...formData,
        product_id: formData.product_id || undefined,
        variant_id: formData.variant_id || undefined,
        storage_capacity: formData.storage_capacity || undefined,
        notes: formData.notes || undefined,
      };

      const result = price
        ? await updateTradeInPrice(price.id, cleanedFormData)
        : await createTradeInPrice(cleanedFormData);

      if (result.success) {
        console.log('✅ Price saved successfully');
        onSave();
        onClose();
      } else {
        console.error('❌ Failed to save price:', result.error);
        toast.error(result.error || 'Failed to save price');
      }
    } catch (error: any) {
      console.error('❌ TradeInPriceModal: PRICE SAVE FAILED');
      console.error('Error Message:', error?.message || 'No message');
      toast.error('Failed to save price. Please try again.');
    } finally {
      setIsLoading(false);
      console.log('🏁 TradeInPriceModal: Price save process ended');
    }
  };

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Additional scroll prevention for html element
  useEffect(() => {
    if (isOpen) {
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);


  if (!isOpen) return null;

  // Calculate completion stats
  const requiredFields = [
    'device_name',
    'device_model',
    'base_trade_in_price'
  ];

  const completedFields = requiredFields.filter(field => {
    const value = formData[field as keyof typeof formData];
    return value !== undefined && value !== null && value !== '' && value !== 0;
  }).length;

  const totalFields = requiredFields.length;
  const pendingFields = totalFields - completedFields;

  return createPortal(
    <div
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        overscrollBehavior: 'none'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trade-in-price-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h3 id="trade-in-price-modal-title" className="text-2xl font-bold text-gray-900 mb-2">
                {price ? 'Edit Trade-In Price' : 'Add Trade-In Price'}
              </h3>
              <p className="text-sm text-gray-600">
                {price ? 'Update trade-in price information' : 'Create new trade-in price for devices'}
              </p>
            </div>
          </div>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={(e) => { e.preventDefault(); handleTradeInPriceCreated(); }} className="flex-1 overflow-y-auto p-6" id="trade-in-price-form">

          {/* Device Information */}
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Device Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="device_name"
                  value={formData.device_name}
                  onChange={handleChange}
                  placeholder="e.g., iPhone 13 Pro"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900"
                  disabled={isLoading}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="device_model"
                  value={formData.device_model}
                  onChange={handleChange}
                  placeholder="e.g., A2639"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Product Search Section */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-600" />
                  <h5 className="text-sm font-semibold text-gray-700">Link to Product</h5>
                  {selectedProduct && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      Linked
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductSearch(!showProductSearch)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-colors"
                  disabled={isLoading}
                >
                  {showProductSearch ? (
                    <>
                      <X className="w-4 h-4" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Search Products
                    </>
                  )}
                </button>
              </div>

              {showProductSearch && (
                <div className="mb-3">
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => {
                      setProductSearchTerm(e.target.value);
                      searchProducts(e.target.value);
                    }}
                    placeholder="Search by product name or SKU..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900"
                    disabled={isLoading}
                  />

                  {products.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto border-2 border-gray-200 rounded-xl">
                      {products.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-600">SKU: {product.sku}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Product Link Status */}
              {selectedProduct && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Linked to:</span>
                      <span className="text-sm font-semibold text-blue-600">{selectedProduct.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnlinkProduct}
                      className="text-xs text-red-600 hover:text-red-800 hover:underline font-medium"
                      disabled={isLoading}
                    >
                      Unlink
                    </button>
                  </div>
                </div>
              )}

              {/* Variant Selection */}
              {selectedProduct && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-gray-600" />
                      <h5 className="text-sm font-semibold text-gray-700">Select Variant</h5>
                      {selectedVariant && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {variants.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No variants available for this product</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {variants.map((variant, index) => {
                        const isSelected = selectedVariant?.id === variant.id;
                        const isExpanded = expandedVariantIndex === index;

                        return (
                          <div
                            key={variant.id}
                            className={`p-3 rounded-xl border-2 transition-all ${
                              isSelected
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200 hover:border-orange-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h6 className="text-sm font-semibold text-gray-900">
                                    {variant.variant_name || `Variant ${index + 1}`}
                                  </h6>
                                  {isSelected && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Selected
                                    </span>
                                  )}
                                </div>
                                {variant.sku && (
                                  <p className="text-xs text-gray-600">SKU: {variant.sku}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedVariantIndex(isExpanded ? null : index);
                                  }}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <ChevronDown
                                    className={`w-4 h-4 text-gray-600 transition-transform ${
                                      isExpanded ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedVariant(null);
                                      setFormData(prev => ({ ...prev, variant_id: undefined }));
                                    } else {
                                      handleVariantSelect(variant);
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    isSelected
                                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                  }`}
                                >
                                  {isSelected ? 'Deselect' : 'Select'}
                                </button>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2">
                                <div className="bg-white rounded-lg p-2 border border-gray-200">
                                  <p className="text-xs font-medium text-gray-500 mb-1">Variant Name</p>
                                  <p className="text-sm font-semibold text-gray-900">{variant.variant_name || 'N/A'}</p>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-gray-200">
                                  <p className="text-xs font-medium text-gray-500 mb-1">SKU</p>
                                  <p className="text-sm font-semibold text-gray-900 font-mono">{variant.sku || 'N/A'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pricing Configuration */}
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Pricing Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Trade-In Price (TZS) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustValue('base_trade_in_price', -1000)}
                    className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-orange-500 hover:text-white hover:border-orange-500 rounded-lg transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    required
                    value={formatPrice(formData.base_trade_in_price)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      const numValue = parseFloat(value) || 0;
                      setFormData({ ...formData, base_trade_in_price: numValue });
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white text-xl font-bold text-center transition-colors"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => adjustValue('base_trade_in_price', 1000)}
                    className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-orange-500 hover:text-white hover:border-orange-500 rounded-lg transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Maximum value for excellent condition device
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calculated Final Price
                </label>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="text-center">
                    <div className="text-3xl font-black text-green-600 mb-2">
                      {formatPrice(calculateFinalPrice())} TZS
                    </div>
                    <div className="text-xs text-gray-600 font-medium mb-3">
                      Base × Storage × Battery
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        Storage: {(formData.specifications?.storage || 1).toFixed(2)}×
                      </span>
                      <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                        Battery: {(formData.specifications?.battery || 1).toFixed(2)}×
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Condition Multipliers */}
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Condition Multipliers</h4>
            <p className="text-xs text-gray-600 mb-4">Set percentage multipliers for different device conditions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MultiplierInput
                label="Excellent Condition"
                value={formData.excellent_multiplier || 1.0}
                onChange={(value) => setFormData(prev => ({ ...prev, excellent_multiplier: value }))}
                onAdjust={(delta) => adjustMultiplier('excellent_multiplier', delta)}
                color="green"
                badge="A+"
                description="Perfect condition, like new"
                isLoading={isLoading}
              />
              <MultiplierInput
                label="Good Condition"
                value={formData.good_multiplier || 0.85}
                onChange={(value) => setFormData(prev => ({ ...prev, good_multiplier: value }))}
                onAdjust={(delta) => adjustMultiplier('good_multiplier', delta)}
                color="blue"
                badge="A"
                description="Minor wear, fully functional"
                isLoading={isLoading}
              />
              <MultiplierInput
                label="Fair Condition"
                value={formData.fair_multiplier || 0.70}
                onChange={(value) => setFormData(prev => ({ ...prev, fair_multiplier: value }))}
                onAdjust={(delta) => adjustMultiplier('fair_multiplier', delta)}
                color="yellow"
                badge="B"
                description="Noticeable wear, still usable"
                isLoading={isLoading}
              />
              <MultiplierInput
                label="Poor Condition"
                value={formData.poor_multiplier || 0.50}
                onChange={(value) => setFormData(prev => ({ ...prev, poor_multiplier: value }))}
                onAdjust={(delta) => adjustMultiplier('poor_multiplier', delta)}
                color="red"
                badge="C"
                description="Heavy wear, may need repairs"
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Condition Assessment */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Condition Assessment</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSpecificationsModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
                  disabled={isLoading}
                >
                  <Settings className="w-4 h-4" />
                  Specifications
                </button>
                <button
                  type="button"
                  onClick={() => setShowConditionModal(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
                  disabled={isLoading}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {conditionAssessment ? 'Edit Assessment' : 'Assess Condition'}
                </button>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">

              {/* Quick Specs Summary */}
              <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-xs font-medium text-gray-600">Storage</span>
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {formData.storage_capacity || 'Not Set'}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Battery className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-xs font-medium text-gray-600">Battery</span>
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {formData.battery_health}%
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-xs font-medium text-gray-600">Accessories</span>
                  </div>
                  <div className="text-xs font-medium text-gray-700">
                    {formData.has_charger && formData.has_original_box ? 'Charger + Box' :
                     formData.has_charger ? 'Charger' :
                     formData.has_original_box ? 'Box' : 'None'}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-gray-600">Multipliers</span>
                  </div>
                  <div className="text-xs font-medium text-gray-700">
                    {((formData.specifications?.storage || 1) * (formData.specifications?.battery || 1)).toFixed(2)}×
                  </div>
                </div>
              </div>

              {conditionAssessment ? (
                <div className="bg-white rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-3 h-3 rounded-full ${
                      conditionAssessment.calculatedCondition === 'excellent'
                        ? 'bg-green-500'
                        : conditionAssessment.calculatedCondition === 'good'
                        ? 'bg-blue-500'
                        : conditionAssessment.calculatedCondition === 'fair'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-semibold text-gray-700">Current Assessment:</span>
                    <span
                      className={`text-lg font-bold ${
                        conditionAssessment.calculatedCondition === 'excellent'
                          ? 'text-green-600'
                          : conditionAssessment.calculatedCondition === 'good'
                          ? 'text-blue-600'
                          : conditionAssessment.calculatedCondition === 'fair'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {conditionAssessment.calculatedCondition.charAt(0).toUpperCase() +
                        conditionAssessment.calculatedCondition.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                      <div className="text-xs font-medium text-gray-700 mb-1">Issues Found</div>
                      <div className="text-xl font-bold text-orange-600">
                        {conditionAssessment.issues.filter((i: any) => i.checked).length}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="text-xs font-medium text-gray-700 mb-1">Images Uploaded</div>
                      <div className="text-xl font-bold text-blue-600">
                        {conditionAssessment.images.length}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-6 border border-orange-200 text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ClipboardCheck className="w-6 h-6 text-orange-600" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">No Assessment Yet</h4>
                  <p className="text-xs text-gray-600 mb-3">Click "Assess Condition" to evaluate the device condition and determine appropriate pricing multipliers.</p>
                  <button
                    type="button"
                    onClick={() => setShowConditionModal(true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg"
                    disabled={isLoading}
                  >
                    Start Assessment
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border-2 border-gray-300"
            >
              <span className="text-sm font-semibold text-gray-700">Advanced Options</span>
              <ChevronDown
                className={`w-5 h-5 text-gray-600 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-300 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product ID
                  </label>
                  <input
                    type="text"
                    name="product_id"
                    value={formData.product_id || ''}
                    onChange={handleChange}
                    placeholder="Product ID"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variant ID
                  </label>
                  <input
                    type="text"
                    name="variant_id"
                    value={formData.variant_id || ''}
                    onChange={handleChange}
                    placeholder="Variant ID"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Additional notes or comments"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900 resize-none"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                    disabled={isLoading}
                  />
                  <label className="text-sm font-medium text-gray-700">Active Trade-In Price</label>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
            {pendingFields > 0 && (
              <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-semibold text-orange-700">
                  Please complete all required fields before creating the trade-in price.
                </span>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="trade-in-price-form"
                disabled={isLoading || pendingFields > 0}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    {price ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {price ? 'Update Price' : 'Add Trade-In Price'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Condition Assessment Modal */}
      {showConditionModal && (
        <ConditionAssessmentModal
          isOpen={showConditionModal}
          onClose={() => setShowConditionModal(false)}
          onSave={(assessment) => {
            setConditionAssessment(assessment);
            setShowConditionModal(false);
          }}
          initialIssues={conditionAssessment?.issues}
        />
      )}

      {/* Specifications Modal */}
      {showSpecificationsModal && createPortal(
        <div
          className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            overscrollBehavior: 'none'
          }}
          role="dialog"
          aria-modal="true"
          onClick={() => setShowSpecificationsModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowSpecificationsModal(false)}
              disabled={isLoading}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 border-b border-purple-300 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                  <Settings className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Device Specifications</h3>
                  <p className="text-sm text-purple-100">Configure device details and pricing multipliers</p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Device Specifications Section */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Cpu className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">Device Details</h4>
                    <p className="text-sm text-gray-600">Enter device specifications and accessories</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Storage Capacity */}
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border-2 border-purple-200 shadow-sm">
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-purple-600" />
                      Storage Capacity
                    </label>
                    <input
                      type="text"
                      name="storage_capacity"
                      value={formData.storage_capacity}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900 bg-white font-medium"
                      placeholder="e.g., 256GB"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Battery Health */}
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border-2 border-purple-200 shadow-sm">
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <Battery className="w-4 h-4 text-purple-600" />
                      Battery Health (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustValue('battery_health', -5, 0, 100)}
                        className="w-10 h-10 flex items-center justify-center bg-white border-2 border-purple-200 hover:bg-purple-500 hover:text-white hover:border-purple-500 rounded-lg transition-all font-bold shadow-sm"
                        disabled={isLoading}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        name="battery_health"
                        min="0"
                        max="100"
                        value={formData.battery_health}
                        onChange={handleChange}
                        className="flex-1 px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-center text-lg font-bold bg-white"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => adjustValue('battery_health', 5, 0, 100)}
                        className="w-10 h-10 flex items-center justify-center bg-white border-2 border-purple-200 hover:bg-purple-500 hover:text-white hover:border-purple-500 rounded-lg transition-all font-bold shadow-sm"
                        disabled={isLoading}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Accessories */}
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border-2 border-purple-200 shadow-sm">
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-600" />
                      Accessories
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-purple-100 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          name="has_charger"
                          checked={formData.has_charger}
                          onChange={handleChange}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                          disabled={isLoading}
                        />
                        <span className="text-sm font-medium text-gray-700">Charger Included</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-purple-100 hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          name="has_original_box"
                          checked={formData.has_original_box}
                          onChange={handleChange}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                          disabled={isLoading}
                        />
                        <span className="text-sm font-medium text-gray-700">Original Box</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specification Multipliers Section */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">Pricing Multipliers</h4>
                    <p className="text-sm text-gray-600">Fine-tune pricing based on device specifications</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <MultiplierInput
                    label="Storage Multiplier"
                    value={formData.specifications?.storage || 1.0}
                    onChange={(value) => updateSpecification('storage', value)}
                    onAdjust={(delta) => adjustMultiplier('specifications.storage', delta)}
                    color="amber"
                    description="Adjust based on storage capacity"
                    isLoading={isLoading}
                    icon={HardDrive}
                  />
                  <MultiplierInput
                    label="Battery Multiplier"
                    value={formData.specifications?.battery || 1.0}
                    onChange={(value) => updateSpecification('battery', value)}
                    onAdjust={(delta) => adjustMultiplier('specifications.battery', delta)}
                    color="amber"
                    description="Adjust based on battery health"
                    isLoading={isLoading}
                    icon={Battery}
                  />
                  <MultiplierInput
                    label="Condition Multiplier"
                    value={formData.specifications?.condition || 1.0}
                    onChange={(value) => updateSpecification('condition', value)}
                    onAdjust={(delta) => adjustMultiplier('specifications.condition', delta)}
                    color="amber"
                    description="Adjust based on overall condition"
                    isLoading={isLoading}
                    icon={ClipboardCheck}
                  />
                  <MultiplierInput
                    label="Screen Multiplier"
                    value={formData.specifications?.screen || 1.0}
                    onChange={(value) => updateSpecification('screen', value)}
                    onAdjust={(delta) => adjustMultiplier('specifications.screen', delta)}
                    color="amber"
                    description="Adjust based on screen condition"
                    isLoading={isLoading}
                    icon={Settings}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSpecificationsModal(false)}
                  disabled={isLoading}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};

export default TradeInPriceModal;

