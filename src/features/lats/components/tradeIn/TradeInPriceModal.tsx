/**
 * Trade-In Price Modal
 * Add/Edit trade-in price for devices
 * Redesigned with EnhancedAddSupplierModal UI structure
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, Save, ChevronDown, Smartphone, TrendingUp, Settings, Search, Link2, Calculator, Cpu, HardDrive, Battery, ClipboardCheck, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabaseClient';
import { getProducts } from '../../../../lib/latsProductApi';
import type { TradeInPrice, TradeInPriceFormData } from '../../types/tradeIn';
import { createTradeInPrice, updateTradeInPrice } from '../../lib/tradeInApi';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import ConditionAssessmentModal from './ConditionAssessmentModal';

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
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [conditionAssessment, setConditionAssessment] = useState<{
    issues: any[];
    calculatedCondition: 'excellent' | 'good' | 'fair' | 'poor';
    images: string[];
  } | null>(null);

  // Form state for direct form handling
  const [formData, setFormData] = useState({
    device_name: '',
    device_model: '',
    base_trade_in_price: 0,
    product_id: '',
    variant_id: '',
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

  // Initialize form with price data when editing
  useEffect(() => {
    if (price) {
      setFormData({
        device_name: price.device_name || '',
        device_model: price.device_model || '',
        base_trade_in_price: price.base_trade_in_price || 0,
        product_id: price.product_id || '',
        variant_id: price.variant_id || '',
        excellent_multiplier: price.excellent_multiplier || 1.0,
        good_multiplier: price.good_multiplier || 0.85,
        fair_multiplier: price.fair_multiplier || 0.70,
        poor_multiplier: price.poor_multiplier || 0.50,
        storage_capacity: price.storage_capacity || '',
        battery_health: price.battery_health || 100,
        has_charger: price.has_charger || false,
        has_original_box: price.has_original_box || false,
        specifications: price.specifications || {
          storage: 1.0,
          battery: 1.0,
          condition: 1.0,
          screen: 1.0,
        },
        notes: price.notes || '',
        is_active: price.is_active ?? true,
      });
    } else {
      // Reset form for new price
      setFormData({
        device_name: '',
        device_model: '',
        base_trade_in_price: 0,
        product_id: '',
        variant_id: '',
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
    }
  }, [price]);

  // Load variants when product is selected
  useEffect(() => {
    if (selectedProduct?.id) {
      loadVariants(selectedProduct.id);
    } else {
      setVariants([]);
      setSelectedVariant(null);
    }
  }, [selectedProduct]);

  // Load variants when product is selected
  const loadVariants = async (productId: string) => {
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
  };

  // Search products
  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setProducts([]);
      return;
    }

    try {
      const productsData = await getProducts();
      if (productsData && Array.isArray(productsData)) {
        const filtered = productsData.filter((p: any) =>
          p.name?.toLowerCase().includes(query.toLowerCase()) ||
          p.sku?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);
        setProducts(filtered);
      }
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

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
    setFormData(prev => ({ ...prev, product_id: '', variant_id: '' }));
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
  const adjustMultiplier = (field: string, delta: number) => {
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
      if (field.includes('_multiplier')) {
        const newValue = Math.max(0, Math.min(2, (prev[field as keyof typeof prev] as number || 1) + delta));
        return {
          ...prev,
          [field]: Math.round(newValue * 100) / 100
        };
      }

      // Fallback for other numeric fields
      const newValue = Math.max(0, Math.min(2, (prev[field as keyof typeof prev] as number || 1) + delta));
      return {
        ...prev,
        [field]: Math.round(newValue * 100) / 100
      };
    });
  };

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
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSpecificationChange = (key: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value,
      },
    }));
  };

  const handleTradeInPriceCreated = async () => {
    try {
      console.log('🎯 TradeInPriceModal: Starting price creation process');
      console.log('📝 Form data received:', formData);

      setIsLoading(true);

      const result = price
        ? await updateTradeInPrice(price.id, formData)
        : await createTradeInPrice(formData);

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
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
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

            {/* Text and Progress */}
            <div>
              <h3 id="trade-in-price-modal-title" className="text-2xl font-bold text-gray-900 mb-3">
                {price ? 'Edit Trade-In Price' : 'Add Trade-In Price'}
              </h3>

              {/* Progress Indicator */}
              <div className="flex items-center gap-4">
                {completedFields > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-bold text-green-700">{completedFields} Complete</span>
                  </div>
                )}
                {pendingFields > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg animate-pulse">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-bold text-orange-700">{pendingFields} Pending</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={(e) => { e.preventDefault(); handleTradeInPriceCreated(); }} className="flex-1 overflow-y-auto p-6">

          {/* Device Information */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Device Information
            </h4>
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
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  disabled={isLoading}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Model
                </label>
                <input
                  type="text"
                  name="device_model"
                  value={formData.device_model}
                  onChange={handleChange}
                  placeholder="e.g., A2639"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-gray-900"
                  disabled={isLoading}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Trade-In Price <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => adjustValue('base_trade_in_price', -1000)}
                    className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-orange-500 hover:text-white hover:border-orange-500 rounded-xl transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Minus className="w-5 h-5" />
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
                    className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white text-2xl font-bold text-center"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => adjustValue('base_trade_in_price', 1000)}
                    className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-orange-500 hover:text-white hover:border-orange-500 rounded-xl transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Maximum value for excellent condition device
                </p>
              </div>
            </div>

            {/* Product Search Section */}
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200 shadow-sm">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Link to Product
                  </label>
                  <p className="text-xs text-gray-600">Search and link to an existing product in your inventory</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductSearch(!showProductSearch)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                  disabled={isLoading}
                >
                  {showProductSearch ? 'Cancel' : 'Search Products'}
                </button>
              </div>

              {showProductSearch && (
                <div className="border-t border-gray-200 pt-4">
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => {
                      setProductSearchTerm(e.target.value);
                      searchProducts(e.target.value);
                    }}
                    placeholder="Search by product name or SKU..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                    disabled={isLoading}
                  />

                  {products.length > 0 && (
                    <div className="mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      {products.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
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
              <div className="flex items-center gap-2 mt-3">
                <Link2 className="w-4 h-4 text-gray-400" />
                {selectedProduct ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Linked to:</span>
                    <span className="text-sm font-semibold text-blue-600">{selectedProduct.name}</span>
                    <button
                      type="button"
                      onClick={handleUnlinkProduct}
                      className="text-xs text-red-600 hover:text-red-800 hover:underline"
                      disabled={isLoading}
                    >
                      Unlink
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">No product linked</span>
                )}
              </div>

              {/* Variant Selection */}
              {selectedProduct && variants.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Variant
                  </label>
                  <select
                    value={selectedVariant?.id || ''}
                    onChange={(e) => {
                      const variant = variants.find(v => v.id === e.target.value);
                      if (variant) handleVariantSelect(variant);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                    disabled={isLoading}
                  >
                    <option value="">Select variant...</option>
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.variant_name} ({variant.sku})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Configuration */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Pricing Configuration
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Base Price Input */}
              <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm">
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                  Base Trade-In Price (TZS) *
                </label>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => adjustValue('base_trade_in_price', -1000)}
                    className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-green-500 hover:text-white hover:border-green-500 rounded-xl transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Minus className="w-5 h-5" />
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
                    className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white text-2xl font-bold text-center"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => adjustValue('base_trade_in_price', 1000)}
                    className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-green-500 hover:text-white hover:border-green-500 rounded-xl transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Maximum value for excellent condition device
                </p>
              </div>

              {/* Calculated Price Display */}
              <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm">
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                  Calculated Final Price
                </label>
                <div className="text-center">
                  <div className="text-4xl font-black text-green-600 mb-2">
                    {formatPrice(calculateFinalPrice())} TZS
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    Base × Storage × Battery
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                      Storage: {(formData.specifications?.storage || 1).toFixed(2)}×
                    </span>
                    <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
                      Battery: {(formData.specifications?.battery || 1).toFixed(2)}×
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Condition Multipliers */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Condition Multipliers</h3>
                  <p className="text-sm text-blue-600 font-medium">Set percentage multipliers for different device conditions</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Excellent Condition Multiplier */}
              <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A+</span>
                    </div>
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                      Excellent Condition
                    </label>
                  </div>
                  <span className="text-lg font-black text-green-600">{(formData.excellent_multiplier || 1.0).toFixed(2)}×</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustMultiplier('excellent_multiplier', -0.05)}
                    className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-green-500 hover:text-white hover:border-green-500 rounded-xl transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.01"
                    value={Number((formData.excellent_multiplier || 1.0).toFixed(2))}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      excellent_multiplier: parseFloat(e.target.value) || 1.0
                    }))}
                    className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white text-2xl font-bold text-center"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => adjustMultiplier('excellent_multiplier', 0.05)}
                    className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-green-500 hover:text-white hover:border-green-500 rounded-xl transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Perfect condition, like new
                </p>
              </div>

              {/* Good Condition Multiplier */}
              <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                      Good Condition
                    </label>
                  </div>
                  <span className="text-lg font-black text-blue-600">{(formData.good_multiplier || 0.85).toFixed(2)}×</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustMultiplier('good_multiplier', -0.05)}
                    className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-xl transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.01"
                    value={Number((formData.good_multiplier || 0.85).toFixed(2))}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      good_multiplier: parseFloat(e.target.value) || 0.85
                    }))}
                    className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-2xl font-bold text-center"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => adjustMultiplier('good_multiplier', 0.05)}
                    className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-xl transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Minor wear, fully functional
                </p>
              </div>

              {/* Fair Condition Multiplier */}
              <div className="bg-white rounded-xl p-6 border-2 border-yellow-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">B</span>
                    </div>
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                      Fair Condition
                    </label>
                  </div>
                  <span className="text-lg font-black text-yellow-600">{(formData.fair_multiplier || 0.70).toFixed(2)}×</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustMultiplier('fair_multiplier', -0.05)}
                    className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-yellow-500 hover:text-white hover:border-yellow-500 rounded-xl transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.01"
                    value={Number((formData.fair_multiplier || 0.70).toFixed(2))}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      fair_multiplier: parseFloat(e.target.value) || 0.70
                    }))}
                    className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 bg-white text-2xl font-bold text-center"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => adjustMultiplier('fair_multiplier', 0.05)}
                    className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-yellow-500 hover:text-white hover:border-yellow-500 rounded-xl transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Noticeable wear, still usable
                </p>
              </div>

              {/* Poor Condition Multiplier */}
              <div className="bg-white rounded-xl p-6 border-2 border-red-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">C</span>
                    </div>
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                      Poor Condition
                    </label>
                  </div>
                  <span className="text-lg font-black text-red-600">{(formData.poor_multiplier || 0.50).toFixed(2)}×</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustMultiplier('poor_multiplier', -0.05)}
                    className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-xl transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.01"
                    value={Number((formData.poor_multiplier || 0.50).toFixed(2))}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      poor_multiplier: parseFloat(e.target.value) || 0.50
                    }))}
                    className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-white text-2xl font-bold text-center"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => adjustMultiplier('poor_multiplier', 0.05)}
                    className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-xl transition-all font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Heavy wear, may need repairs
                </p>
              </div>
            </div>
          </div>

          {/* Device Specifications */}
          <div className="mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Device Specifications</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Storage Capacity */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Storage Capacity
                  </label>
                  <input
                    type="text"
                    value={formData.storage_capacity}
                    onChange={(e) => setFormData({ ...formData, storage_capacity: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    placeholder="e.g., 256GB"
                    disabled={isLoading}
                  />
                </div>

                {/* Battery Health */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Battery Health (%)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustValue('battery_health', -5, 0, 100)}
                      className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-purple-500 hover:text-white rounded transition-colors"
                      disabled={isLoading}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.battery_health}
                      onChange={(e) => setFormData({ ...formData, battery_health: parseInt(e.target.value) || 100 })}
                      className="flex-1 px-2 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-center text-sm font-medium"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => adjustValue('battery_health', 5, 0, 100)}
                      className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-purple-500 hover:text-white rounded transition-colors"
                      disabled={isLoading}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Accessories */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Accessories
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.has_charger}
                        onChange={(e) => setFormData({ ...formData, has_charger: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        disabled={isLoading}
                      />
                      <span className="text-sm text-gray-700">Charger</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.has_original_box}
                        onChange={(e) => setFormData({ ...formData, has_original_box: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        disabled={isLoading}
                      />
                      <span className="text-sm text-gray-700">Original Box</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Specification Multipliers */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 rounded-2xl p-8 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center shadow-lg">
                  <HardDrive className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Specification Multipliers</h3>
                  <p className="text-sm text-amber-600 font-medium">Fine-tune pricing based on device specifications</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Storage Multiplier */}
                <div className="bg-white rounded-xl p-6 border-2 border-amber-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-amber-600" />
                      <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                        Storage Multiplier
                      </label>
                    </div>
                    <span className="text-lg font-black text-amber-600">{formData.specifications?.storage?.toFixed(2) || '1.00'}×</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => adjustMultiplier('specifications.storage', -0.05)}
                      className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 rounded-xl transition-all font-semibold shadow-sm"
                      disabled={isLoading}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.01"
                      value={Number((formData.specifications?.storage || 1.0).toFixed(2))}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        specifications: {
                          ...prev.specifications,
                          storage: parseFloat(e.target.value) || 1.0
                        }
                      }))}
                      className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white text-2xl font-bold text-center"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => adjustMultiplier('specifications.storage', 0.05)}
                      className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 rounded-xl transition-all font-semibold shadow-sm"
                      disabled={isLoading}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Battery Multiplier */}
                <div className="bg-white rounded-xl p-6 border-2 border-amber-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Battery className="w-5 h-5 text-amber-600" />
                      <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                        Battery Multiplier
                      </label>
                    </div>
                    <span className="text-lg font-black text-amber-600">{formData.specifications?.battery?.toFixed(2) || '1.00'}×</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => adjustMultiplier('specifications.battery', -0.05)}
                      className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 rounded-xl transition-all font-semibold shadow-sm"
                      disabled={isLoading}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.01"
                      value={Number((formData.specifications?.battery || 1.0).toFixed(2))}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        specifications: {
                          ...prev.specifications,
                          battery: parseFloat(e.target.value) || 1.0
                        }
                      }))}
                      className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white text-2xl font-bold text-center"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => adjustMultiplier('specifications.battery', 0.05)}
                      className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 rounded-xl transition-all font-semibold shadow-sm"
                      disabled={isLoading}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Condition Multiplier */}
                <div className="bg-white rounded-xl p-6 border-2 border-amber-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-amber-600" />
                      <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                        Condition Multiplier
                      </label>
                    </div>
                    <span className="text-lg font-black text-amber-600">{formData.specifications?.condition?.toFixed(2) || '1.00'}×</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => adjustMultiplier('specifications.condition', -0.05)}
                      className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 rounded-xl transition-all font-semibold shadow-sm"
                      disabled={isLoading}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.01"
                      value={Number((formData.specifications?.condition || 1.0).toFixed(2))}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        specifications: {
                          ...prev.specifications,
                          condition: parseFloat(e.target.value) || 1.0
                        }
                      }))}
                      className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white text-2xl font-bold text-center"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => adjustMultiplier('specifications.condition', 0.05)}
                      className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 rounded-xl transition-all font-semibold shadow-sm"
                      disabled={isLoading}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Screen Multiplier */}
                <div className="bg-white rounded-xl p-6 border-2 border-amber-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-amber-600" />
                      <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                        Screen Multiplier
                      </label>
                    </div>
                    <span className="text-lg font-black text-amber-600">{formData.specifications?.screen?.toFixed(2) || '1.00'}×</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => adjustMultiplier('specifications.screen', -0.05)}
                      className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 rounded-xl transition-all font-semibold shadow-sm"
                      disabled={isLoading}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.01"
                      value={Number((formData.specifications?.screen || 1.0).toFixed(2))}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        specifications: {
                          ...prev.specifications,
                          screen: parseFloat(e.target.value) || 1.0
                        }
                      }))}
                      className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white text-2xl font-bold text-center"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => adjustMultiplier('specifications.screen', 0.05)}
                      className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 rounded-xl transition-all font-semibold shadow-sm"
                      disabled={isLoading}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Condition Assessment */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-orange-50 via-red-50 to-orange-50 rounded-2xl p-8 border border-orange-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                    <ClipboardCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Condition Assessment</h3>
                    <p className="text-sm text-orange-600 font-medium">Evaluate device condition for accurate pricing</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConditionModal(true)}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold flex items-center gap-3 transition-all shadow-lg hover:shadow-xl"
                  disabled={isLoading}
                >
                  <ClipboardCheck className="w-5 h-5" />
                  {conditionAssessment ? 'Edit Assessment' : 'Assess Condition'}
                </button>
              </div>

              {conditionAssessment ? (
                <div className="bg-white rounded-xl p-6 border-2 border-orange-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full ${
                        conditionAssessment.calculatedCondition === 'excellent'
                          ? 'bg-green-500'
                          : conditionAssessment.calculatedCondition === 'good'
                          ? 'bg-blue-500'
                          : conditionAssessment.calculatedCondition === 'fair'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Current Assessment:</span>
                      <span
                        className={`text-2xl font-black ${
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
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <div className="text-sm font-semibold text-gray-700 mb-2">Issues Found</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {conditionAssessment.issues.filter((i: any) => i.checked).length}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="text-sm font-semibold text-gray-700 mb-2">Images Uploaded</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {conditionAssessment.images.length}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 border-2 border-orange-200 shadow-sm text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardCheck className="w-8 h-8 text-orange-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">No Assessment Yet</h4>
                  <p className="text-gray-600 mb-4">Click "Assess Condition" to evaluate the device condition and determine appropriate pricing multipliers.</p>
                  <button
                    type="button"
                    onClick={() => setShowConditionModal(true)}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                    disabled={isLoading}
                  >
                    Start Assessment
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="mb-6">
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
                    value={formData.product_id}
                    onChange={handleChange}
                    placeholder="Product ID"
                    className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
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
                    value={formData.variant_id}
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
          <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
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
              disabled={isLoading}
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
          initialAssessment={conditionAssessment}
        />
      )}
    </div>,
    document.body
  );
};

export default TradeInPriceModal;

