import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { getActiveCategories } from '../../../lib/categoryApi';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

interface Category {
  id: string;
  name: string;
  is_active: boolean;
}

const MobileAddProduct: React.FC = () => {
  const navigate = useNavigate();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();

  // Form state
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [variantName, setVariantName] = useState('');
  const [sku, setSku] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [minQuantity, setMinQuantity] = useState('5');
  const [description, setDescription] = useState('');
  
  // UI state
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getActiveCategories();
        setCategories(data);
        if (data.length > 0) {
          setCategoryId(data[0].id);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        toast.error('Failed to load categories');
      }
    };
    loadCategories();
  }, []);

  // Auto-generate SKU when product name changes
  useEffect(() => {
    if (productName && !sku) {
      const autoSku = productName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 8) + '-' + Date.now().toString().substring(-4);
      setSku(autoSku);
    }
  }, [productName]);

  const isValid = () => {
    if (!productName.trim()) {
      toast.error('Product name is required');
      return false;
    }
    if (!categoryId) {
      toast.error('Category is required');
      return false;
    }
    if (!sellingPrice || parseFloat(sellingPrice) <= 0) {
      toast.error('Selling price must be greater than 0');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;

    const jobId = startLoading('Adding product...');
    try {
      setIsLoading(true);

      // Create product
      const { data: product, error: productError } = await supabase
        .from('lats_products')
        .insert({
          name: productName.trim(),
          category_id: categoryId,
          description: description.trim() || null,
          is_active: true,
          // ✅ CRITICAL FIX: Set metadata flag to skip default variant auto-creation
          metadata: {
            skip_default_variant: true, // ✅ We're creating a custom variant below
            useVariants: true,
            variantCount: 1,
            createdFrom: 'mobile_app'
          }
        })
        .select()
        .single();

      if (productError) throw productError;

      // Create variant
      const { error: variantError } = await supabase
        .from('lats_product_variants')
        .insert({
          product_id: product.id,
          variant_name: variantName.trim() || productName.trim(),
          sku: sku.trim() || `SKU-${Date.now()}`,
          cost_price: costPrice ? parseFloat(costPrice) : 0,
          selling_price: parseFloat(sellingPrice),
          quantity: parseInt(quantity) || 0,
          min_quantity: parseInt(minQuantity) || 5,
          is_active: true,
        });

      if (variantError) throw variantError;

      completeLoading(jobId);
      toast.success(`${productName} added successfully!`);
      navigate(`/mobile/inventory/${product.id}`);
    } catch (error: any) {
      console.error('Error adding product:', error);
      failLoading(jobId, 'Failed to add product');
      toast.error(error.message || 'Failed to add product');
    } finally {
      setIsLoading(false);
    }
  };

  const adjustQuantity = (delta: number) => {
    const current = parseInt(quantity) || 0;
    const newValue = Math.max(0, current + delta);
    setQuantity(String(newValue));
  };

  const profitMargin = costPrice && sellingPrice 
    ? (((parseFloat(sellingPrice) - parseFloat(costPrice)) / parseFloat(sellingPrice)) * 100).toFixed(1)
    : '0';

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - iOS Style */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate('/mobile/inventory')} 
            className="flex items-center gap-1 text-blue-500"
          >
            <ArrowLeft size={20} strokeWidth={2} />
            <span className="text-[17px]">Cancel</span>
          </button>
          <h1 className="text-[17px] font-semibold text-gray-900 absolute left-1/2 transform -translate-x-1/2">
            Add Product
          </h1>
          <button 
            onClick={handleSubmit}
            disabled={isLoading || !productName.trim() || !sellingPrice}
            className="text-blue-500 text-[17px] font-semibold disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Product Name */}
        <div className="px-4 py-4 border-b border-gray-200">
          <label className="block text-[13px] text-gray-500 mb-2 uppercase tracking-wide">
            Product Information
          </label>
          <input
            type="text"
            placeholder="Product name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            autoFocus
            className="w-full bg-transparent border-0 outline-none text-[17px] text-gray-900 placeholder-gray-400 p-0"
            style={{ WebkitAppearance: 'none' }}
          />
        </div>

        {/* Category */}
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-900 text-[17px]">Category</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="bg-transparent border-0 outline-none text-[17px] text-gray-900 text-right"
              style={{ WebkitAppearance: 'none' }}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mt-6">
          <div className="px-4 pb-2">
            <label className="block text-[13px] text-gray-500 uppercase tracking-wide">
              Pricing
            </label>
          </div>
          
          <div className="border-t border-b border-gray-200">
            {/* Selling Price */}
            <div className="px-4 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-900 text-[17px]">Selling Price</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-[17px]">TSh</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-32 bg-transparent border-0 outline-none text-[17px] text-gray-900 text-right placeholder-gray-400"
                    style={{ WebkitAppearance: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Cost Price */}
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-900 text-[17px]">Cost Price</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-[17px]">TSh</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-32 bg-transparent border-0 outline-none text-[17px] text-gray-900 text-right placeholder-gray-400"
                    style={{ WebkitAppearance: 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Profit Margin Display */}
          {costPrice && sellingPrice && parseFloat(sellingPrice) > 0 && (
            <div className="px-4 py-3 bg-green-50">
              <div className="flex items-center justify-between">
                <span className="text-green-700 text-[15px] font-medium">Profit Margin</span>
                <span className="text-green-700 text-[15px] font-semibold">{profitMargin}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Stock Section */}
        <div className="mt-6">
          <div className="px-4 pb-2">
            <label className="block text-[13px] text-gray-500 uppercase tracking-wide">
              Stock
            </label>
          </div>
          
          <div className="border-t border-b border-gray-200">
            {/* Initial Quantity */}
            <div className="px-4 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-900 text-[17px]">Initial Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjustQuantity(-1)}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center active:scale-95 transition-all"
                  >
                    <Minus size={16} strokeWidth={3} />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-16 bg-transparent border-0 outline-none text-[17px] text-gray-900 text-center font-semibold"
                    style={{ WebkitAppearance: 'none' }}
                  />
                  <button
                    onClick={() => adjustQuantity(1)}
                    className="w-8 h-8 rounded-full bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center active:scale-95 transition-all"
                  >
                    <Plus size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>

            {/* Min Stock Level */}
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-900 text-[17px]">Low Stock Alert</span>
                <input
                  type="number"
                  placeholder="5"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  className="w-20 bg-transparent border-0 outline-none text-[17px] text-gray-900 text-right"
                  style={{ WebkitAppearance: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Options - Collapsible */}
        <div className="mt-6">
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="w-full px-4 py-3 border-t border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="text-left">
              <div className="text-blue-500 text-[17px] font-medium">Advanced Options</div>
              <div className="text-gray-500 text-[13px] mt-0.5">SKU, variant name, description</div>
            </div>
            <span className={`text-gray-400 text-[17px] transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {showAdvancedOptions && (
            <div className="border-b border-gray-200">
              {/* Variant Name */}
              <div className="px-4 py-4 border-b border-gray-200">
                <label className="block text-[13px] text-gray-500 mb-2">Variant Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Default, Standard"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-[17px] text-gray-900 placeholder-gray-400 p-0"
                  style={{ WebkitAppearance: 'none' }}
                />
              </div>

              {/* SKU */}
              <div className="px-4 py-4 border-b border-gray-200">
                <label className="block text-[13px] text-gray-500 mb-2">SKU</label>
                <input
                  type="text"
                  placeholder="Auto-generated"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-[17px] text-gray-900 font-mono placeholder-gray-400 p-0"
                  style={{ WebkitAppearance: 'none' }}
                />
              </div>

              {/* Description */}
              <div className="px-4 py-4">
                <label className="block text-[13px] text-gray-500 mb-2">Description (Optional)</label>
                <textarea
                  placeholder="Product description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-transparent border-0 outline-none text-[17px] text-gray-900 placeholder-gray-400 resize-none p-0"
                  style={{ WebkitAppearance: 'none' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary Card */}
        {productName && sellingPrice && (
          <div className="mx-4 my-6 p-4 bg-blue-50 rounded-xl">
            <div className="text-[15px] text-gray-900 font-semibold mb-3">Summary</div>
            <div className="space-y-2 text-[15px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Product:</span>
                <span className="text-gray-900 font-medium">{productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="text-green-600 font-semibold">TSh {parseFloat(sellingPrice).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stock:</span>
                <span className="text-gray-900 font-medium">{quantity} units</span>
              </div>
              {costPrice && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit Margin:</span>
                  <span className="text-purple-600 font-semibold">{profitMargin}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileAddProduct;

