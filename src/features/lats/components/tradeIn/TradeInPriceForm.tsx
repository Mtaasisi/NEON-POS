/**
 * Trade-In Price Form Component
 * Handles all form fields for trade-in pricing
 * Matches CustomerForm component structure
 */

import React, { useState, useEffect } from 'react';
import { Search, Link2, Smartphone, Calculator, Cpu, HardDrive, Battery, Minus, Plus, Save, ClipboardCheck } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { getProducts } from '../../../../lib/latsProductApi';
import type { TradeInPriceFormData } from '../../types/tradeIn';
import ConditionAssessmentModal from './ConditionAssessmentModal';

interface TradeInPriceFormProps {
  onSubmit: (data: TradeInPriceFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<TradeInPriceFormData>;
  renderActionsInModal?: boolean;
}

const TradeInPriceForm: React.FC<TradeInPriceFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  renderActionsInModal = true
}) => {
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

  const [formData, setFormData] = useState<TradeInPriceFormData>({
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
    ...initialData,
  });

  // Load initial data when it changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
    }
  }, [initialData]);

  // Load variants when product is selected
  useEffect(() => {
    if (selectedProduct?.id) {
      loadVariants(selectedProduct.id);
    } else {
      setVariants([]);
      setSelectedVariant(null);
    }
  }, [selectedProduct]);

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

  const handleVariantSelect = (variant: any) => {
    setSelectedVariant(variant);
    setFormData(prev => ({ ...prev, variant_id: variant.id }));
  };

  const handleUnlinkProduct = () => {
    setSelectedProduct(null);
    setSelectedVariant(null);
    setVariants([]);
    setFormData(prev => ({ ...prev, product_id: undefined, variant_id: undefined }));
  };

  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (num % 1 === 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form id="trade-in-price-form" onSubmit={handleSubmit} className="h-full flex flex-col" onClick={() => setShowProductSearch(false)}>
      {/* Compact Device Info Header - Fixed */}
      <div className="flex-shrink-0 p-6 bg-white border-b border-gray-200">
        <div className="grid grid-cols-[auto,1fr] gap-4 items-center">
          {/* Device Icon */}
          <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <Smartphone className="w-6 h-6 text-white" />
          </div>

          {/* Device Details */}
          <div className="min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Device Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white text-sm font-medium"
                  placeholder="e.g., iPhone 14 Pro"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Device Model *
                </label>
                <input
                  type="text"
                  required
                  value={formData.device_model}
                  onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white text-sm font-medium"
                  placeholder="e.g., A2890 256GB"
                />
              </div>
            </div>

            {/* Product Link Status */}
            <div className="mt-3 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-gray-400" />
              {selectedProduct ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Linked to:</span>
                  <span className="text-sm font-semibold text-orange-600">{selectedProduct.name}</span>
                  <button
                    type="button"
                    onClick={handleUnlinkProduct}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline"
                  >
                    Unlink
                  </button>
                </div>
              ) : (
                <span className="text-sm text-gray-500">No product linked</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 💰 PRICING SECTION */}
      <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 rounded-2xl p-8 border border-green-200 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Pricing Configuration</h3>
            <p className="text-sm text-green-600 font-medium">Set base price and view calculated values</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                placeholder="0"
              />
              <button
                type="button"
                onClick={() => adjustValue('base_trade_in_price', 1000)}
                className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-green-500 hover:text-white hover:border-green-500 rounded-xl transition-all font-semibold shadow-sm"
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

      {/* 🔄 CONDITION MULTIPLIERS */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 rounded-2xl p-8 border border-blue-200 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Condition Multipliers</h3>
            <p className="text-sm text-blue-600 font-medium">Set percentage multipliers for different device conditions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Excellent Condition Multiplier */}
          <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm">
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
              />
              <button
                type="button"
                onClick={() => adjustMultiplier('excellent_multiplier', 0.05)}
                className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-green-500 hover:text-white hover:border-green-500 rounded-xl transition-all font-semibold shadow-sm"
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
              />
              <button
                type="button"
                onClick={() => adjustMultiplier('good_multiplier', 0.05)}
                className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-xl transition-all font-semibold shadow-sm"
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
              />
              <button
                type="button"
                onClick={() => adjustMultiplier('fair_multiplier', 0.05)}
                className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-yellow-500 hover:text-white hover:border-yellow-500 rounded-xl transition-all font-semibold shadow-sm"
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
              />
              <button
                type="button"
                onClick={() => adjustMultiplier('poor_multiplier', 0.05)}
                className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-xl transition-all font-semibold shadow-sm"
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

        {/* Specifications Card */}
        <div className="p-6 border-b border-gray-100">
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
                  />
                  <button
                    type="button"
                    onClick={() => adjustValue('battery_health', 5, 0, 100)}
                    className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-purple-500 hover:text-white rounded transition-colors"
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
                    />
                    <span className="text-sm text-gray-700">Charger</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.has_original_box}
                      onChange={(e) => setFormData({ ...formData, has_original_box: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Original Box</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* 🔍 CONDITION ASSESSMENT */}
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
            >
              Start Assessment
            </button>
          </div>
        )}
      </div>

      {/* ⚙️ SPECIFICATION MULTIPLIERS */}
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
              />
              <button
                type="button"
                onClick={() => adjustMultiplier('specifications.storage', 0.05)}
                className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 rounded-xl transition-all font-semibold shadow-sm"
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
              />
              <button
                type="button"
                onClick={() => adjustMultiplier('specifications.battery', 0.05)}
                className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 rounded-xl transition-all font-semibold shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Condition Assessment Modal */}
      <ConditionAssessmentModal
        isOpen={showConditionModal}
        onClose={() => setShowConditionModal(false)}
        onSave={(assessment) => {
          setConditionAssessment(assessment);
          setShowConditionModal(false);
        }}
        initialIssues={conditionAssessment?.issues}
      />

      {/* Form Actions - Only render if renderActionsInModal is false (modal handles actions) */}
      {!renderActionsInModal && (
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
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
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Price
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
};

export default TradeInPriceForm;
