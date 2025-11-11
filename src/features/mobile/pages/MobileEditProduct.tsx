import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Save, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { getActiveCategories } from '../../../lib/categoryApi';

interface Category {
  id: string;
  name: string;
  is_active: boolean;
}

const MobileEditProduct: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  // Form state
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // UI state
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load product data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load categories
        const cats = await getActiveCategories();
        setCategories(cats);

        // Load product
        const { data: product, error } = await supabase
          .from('lats_products')
          .select('*')
          .eq('id', productId)
          .single();

        if (error) throw error;
        if (!product) throw new Error('Product not found');

        setProductName(product.name);
        setCategoryId(product.category_id || (cats.length > 0 ? cats[0].id : ''));
        setDescription(product.description || '');
        setIsActive(product.is_active !== false);

      } catch (error) {
        console.error('Error loading product:', error);
        toast.error('Failed to load product');
        navigate('/mobile/inventory');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [productId, navigate]);

  const handleSave = async () => {
    if (!productName.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!categoryId) {
      toast.error('Category is required');
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('lats_products')
        .update({
          name: productName.trim(),
          category_id: categoryId,
          description: description.trim() || null,
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product updated successfully!');
      navigate(`/mobile/inventory/${productId}`);
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(error.message || 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from('lats_products')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product deleted successfully');
      navigate('/mobile/inventory');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
          <p className="text-gray-500 text-[15px]">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 safe-area-inset-top">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 active:bg-gray-100 rounded-full transition-all"
          >
            <ArrowLeft size={24} className="text-blue-500" strokeWidth={2.5} />
          </button>
          <h1 className="text-[20px] font-bold text-gray-900">Edit Product</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-20">
        {/* Product Name */}
        <div>
          <label className="text-[15px] font-semibold text-gray-900 mb-2 block">
            Product Name *
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Enter product name"
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[16px]"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-[15px] font-semibold text-gray-900 mb-2 block">
            Category *
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[16px]"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="text-[15px] font-semibold text-gray-900 mb-2 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter product description"
            rows={4}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[16px] resize-none"
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
          <div>
            <div className="text-[15px] font-semibold text-gray-900">Active Status</div>
            <div className="text-[13px] text-gray-500 mt-0.5">
              {isActive ? 'Product is visible' : 'Product is hidden'}
            </div>
          </div>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`w-14 h-8 rounded-full transition-colors ${
              isActive ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
              isActive ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full py-3.5 bg-red-50 text-red-600 rounded-xl font-semibold text-[16px] active:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Trash2 size={20} strokeWidth={2.5} />
          {isDeleting ? 'Deleting...' : 'Delete Product'}
        </button>
      </div>

      {/* Save Button */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 safe-area-inset-bottom">
        <button
          onClick={handleSave}
          disabled={isSaving || !productName.trim() || !categoryId}
          className="w-full py-4 bg-blue-500 text-white rounded-2xl font-semibold text-[17px] active:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save size={20} strokeWidth={2.5} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default MobileEditProduct;

