/**
 * Trade-In Price Modal
 * Add/Edit trade-in price for devices
 * Matches SetPricingModal UI style
 */

import React, { useState, useEffect } from 'react';
import { X, DollarSign, Smartphone, Save, Calculator, Search, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabaseClient';
import type { TradeInPrice, TradeInPriceFormData } from '../../types/tradeIn';
import { createTradeInPrice, updateTradeInPrice } from '../../lib/tradeInApi';
import { getProducts } from '../../../../lib/latsProductApi';

interface TradeInPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  price?: TradeInPrice | null;
  onSave: () => void;
}

export const TradeInPriceModal: React.FC<TradeInPriceModalProps> = ({
  isOpen,
  onClose,
  price,
  onSave,
}) => {
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  
  const [formData, setFormData] = useState<TradeInPriceFormData>({
    device_name: '',
    device_model: '',
    base_trade_in_price: 0,
    product_id: undefined,
    variant_id: undefined,
    branch_id: undefined,
    excellent_multiplier: 1.0,
    good_multiplier: 0.85,
    fair_multiplier: 0.70,
    poor_multiplier: 0.50,
    notes: '',
    is_active: true,
  });


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
        .is('parent_variant_id', null) // Only parent variants
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

  useEffect(() => {
    if (isOpen) {
      if (price) {
        setFormData({
          device_name: price.device_name || '',
          device_model: price.device_model || '',
          base_trade_in_price: price.base_trade_in_price || 0,
          product_id: price.product_id,
          variant_id: price.variant_id,
          excellent_multiplier: price.excellent_multiplier || 1.0,
          good_multiplier: price.good_multiplier || 0.85,
          fair_multiplier: price.fair_multiplier || 0.70,
          poor_multiplier: price.poor_multiplier || 0.50,
          notes: price.notes || '',
          is_active: price.is_active ?? true,
        });
        
        // Load selected product/variant if linked
        if (price.product_id) {
          loadProductAndVariant(price.product_id, price.variant_id);
        }
      } else {
        // Reset form for new price
        setFormData({
          device_name: '',
          device_model: '',
          base_trade_in_price: 0,
          product_id: undefined,
          variant_id: undefined,
          excellent_multiplier: 1.0,
          good_multiplier: 0.85,
          fair_multiplier: 0.70,
          poor_multiplier: 0.50,
          notes: '',
          is_active: true,
        });
        setSelectedProduct(null);
        setSelectedVariant(null);
      }
    }
  }, [isOpen, price]);

  const loadProductAndVariant = async (productId: string, variantId?: string) => {
    try {
      const productsData = await getProducts();
      if (productsData && Array.isArray(productsData)) {
        const product = productsData.find((p: any) => p.id === productId);
        if (product) {
          setSelectedProduct(product);
          if (variantId) {
            await loadVariants(productId);
            // Wait a bit for variants to load, then find the variant
            setTimeout(async () => {
              const { data: variantsData } = await supabase
                .from('lats_product_variants')
                .select('id, variant_name, sku')
                .eq('product_id', productId)
                .eq('id', variantId)
                .single();
              
              if (variantsData) {
                setSelectedVariant(variantsData);
              }
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error('Error loading product:', error);
    }
  };

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setFormData(prev => ({ 
      ...prev, 
      product_id: product.id,
      // Auto-fill device name/model if not already set
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

  const calculateConditionPrice = (multiplier: number) => {
    return formData.base_trade_in_price * multiplier;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.device_name.trim()) {
      toast.error('Device name is required');
      return;
    }

    if (!formData.device_model.trim()) {
      toast.error('Device model is required');
      return;
    }

    if (formData.base_trade_in_price <= 0) {
      toast.error('Base trade-in price must be greater than 0');
      return;
    }

    setSaving(true);

    try {
      const result = price
        ? await updateTradeInPrice(price.id, formData)
        : await createTradeInPrice(formData);

      if (result.success) {
        toast.success(price ? 'Price updated successfully' : 'Price created successfully');
        onSave();
        onClose();
      } else {
        toast.error(result.error || 'Failed to save price');
      }
    } catch (error) {
      toast.error('Failed to save price');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
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
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {price ? 'Edit Trade-In Price' : 'Add Trade-In Price'}
              </h2>
              <p className="text-sm text-gray-600">Set base pricing and condition multipliers for device trade-ins</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6" onClick={() => setShowProductSearch(false)}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Link to Product (Optional) */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 border-2 border-indigo-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900">Link to Product (Optional)</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Optionally link this trade-in price to an existing product/variant in your inventory
              </p>
              
              {selectedProduct ? (
                <div className="bg-white rounded-xl p-4 border-2 border-indigo-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold text-gray-900">{selectedProduct.name}</div>
                      {selectedProduct.sku && (
                        <div className="text-sm text-gray-600">SKU: {selectedProduct.sku}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleUnlinkProduct}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Unlink
                    </button>
                  </div>
                  
                  {variants.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Variant (Optional)
                      </label>
                      <select
                        value={selectedVariant?.id || ''}
                        onChange={(e) => {
                          const variant = variants.find(v => v.id === e.target.value);
                          if (variant) {
                            handleVariantSelect(variant);
                          } else {
                            setSelectedVariant(null);
                            setFormData(prev => ({ ...prev, variant_id: undefined }));
                          }
                        }}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      >
                        <option value="">No specific variant (all variants)</option>
                        {variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.variant_name} {variant.sku ? `(${variant.sku})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={productSearchTerm}
                      onChange={(e) => {
                        setProductSearchTerm(e.target.value);
                        searchProducts(e.target.value);
                        setShowProductSearch(true);
                      }}
                      onFocus={() => setShowProductSearch(true)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      placeholder="Search products to link..."
                    />
                  </div>
                  
                  {showProductSearch && products.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {products.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{product.name}</div>
                          {product.sku && (
                            <div className="text-sm text-gray-600">SKU: {product.sku}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Device Information */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Device Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Device Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.device_name}
                    onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                    placeholder="e.g., iPhone 14 Pro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Device Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.device_model}
                    onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                    placeholder="e.g., A2890 256GB"
                  />
                </div>
              </div>
            </div>

            {/* Base Price */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">Base Trade-In Price</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price (TZS) *
                </label>
                <input
                  type="text"
                  required
                  value={formatPrice(formData.base_trade_in_price)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '');
                    const numValue = parseFloat(value) || 0;
                    setFormData({ ...formData, base_trade_in_price: numValue });
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-xl font-bold"
                  placeholder="0"
                />
                <p className="text-sm text-gray-500 mt-2">
                  This is the maximum trade-in value for an excellent condition device
                </p>
              </div>
            </div>

            {/* Condition Multipliers */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Condition Multipliers</h3>
              <div className="space-y-4">
                {/* Excellent */}
                <div className="bg-white rounded-xl p-4 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-semibold text-gray-900">Excellent Condition</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatPrice(calculateConditionPrice(formData.excellent_multiplier))} TZS
                      </div>
                      <div className="text-xs text-gray-500">
                        {(formData.excellent_multiplier * 100).toFixed(0)}% of base
                      </div>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.excellent_multiplier}
                    onChange={(e) =>
                      setFormData({ ...formData, excellent_multiplier: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center font-bold"
                  />
                </div>

                {/* Good */}
                <div className="bg-white rounded-xl p-4 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-semibold text-gray-900">Good Condition</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {formatPrice(calculateConditionPrice(formData.good_multiplier))} TZS
                      </div>
                      <div className="text-xs text-gray-500">
                        {(formData.good_multiplier * 100).toFixed(0)}% of base
                      </div>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.good_multiplier}
                    onChange={(e) =>
                      setFormData({ ...formData, good_multiplier: parseFloat(e.target.value) || 0.85 })
                    }
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-bold"
                  />
                </div>

                {/* Fair */}
                <div className="bg-white rounded-xl p-4 border-2 border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="font-semibold text-gray-900">Fair Condition</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-600">
                        {formatPrice(calculateConditionPrice(formData.fair_multiplier))} TZS
                      </div>
                      <div className="text-xs text-gray-500">
                        {(formData.fair_multiplier * 100).toFixed(0)}% of base
                      </div>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.fair_multiplier}
                    onChange={(e) =>
                      setFormData({ ...formData, fair_multiplier: parseFloat(e.target.value) || 0.70 })
                    }
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-center font-bold"
                  />
                </div>

                {/* Poor */}
                <div className="bg-white rounded-xl p-4 border-2 border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="font-semibold text-gray-900">Poor Condition</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {formatPrice(calculateConditionPrice(formData.poor_multiplier))} TZS
                      </div>
                      <div className="text-xs text-gray-500">
                        {(formData.poor_multiplier * 100).toFixed(0)}% of base
                      </div>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.poor_multiplier}
                    onChange={(e) =>
                      setFormData({ ...formData, poor_multiplier: parseFloat(e.target.value) || 0.50 })
                    }
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
                placeholder="Additional notes about this pricing..."
              />
            </div>

            {/* Active Status */}
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <div>
                  <span className="font-semibold text-gray-900">Active</span>
                  <p className="text-sm text-gray-600">Inactive prices won't appear in the trade-in calculator</p>
                </div>
              </label>
            </div>
          </form>
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={saving || !formData.device_name.trim() || !formData.device_model.trim() || formData.base_trade_in_price <= 0}
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {price ? 'Update Price' : 'Create Price'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

