import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { X, Layers, Package } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import { useBranch } from '../../../../context/BranchContext';
import { retryWithBackoff } from '../../../../lib/supabaseClient';

import { getActiveCategories, Category } from '../../../../lib/categoryApi';
import { getProduct } from '../../../../lib/latsProductApi';

import { generateSKU } from '../../lib/skuUtils';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { productCacheService } from '../../../../lib/productCacheService';

// Extracted components
import ProductInformationForm from './ProductInformationForm';
import ProductVariantsSection from './ProductVariantsSection';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  onProductUpdated?: () => void;
  onSuccess?: () => void;
}

// ProductVariant type matching AddProductModal
interface ProductVariant {
  id?: string;
  name: string;
  sku: string;
  costPrice: number;
  price: number;
  stockQuantity: number;
  minStockLevel: number;
  specification?: string;
  attributes?: Record<string, any>;
}

// Validation schema for product form (same as AddProductModal)
const productFormSchema = z.object({
  name: z.string().min(1, 'Product name must be provided').max(100, 'Product name must be less than 100 characters'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
  specification: z.string().max(1000, 'Specification must be less than 1000 characters').optional().refine((val) => {
    if (!val) return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, {
    message: "Specification must be valid JSON"
  }),
  sku: z.string().max(50, 'SKU must be less than 50 characters').optional(),
  categoryId: z.string().min(1, 'Category must be selected'),
  condition: z.enum(['new', 'used', 'refurbished'], {
    errorMap: () => ({ message: 'Please select a condition' })
  }),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  variants: z.array(z.any()).optional().default([])
});

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  productId,
  onProductUpdated,
  onSuccess
}) => {
  const { currentBranch } = useBranch();
  const { loadProducts } = useInventoryStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentErrors, setCurrentErrors] = useState<Record<string, string>>({});
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  // Generate auto SKU using utility function
  const generateAutoSKU = () => {
    return generateSKU();
  };

  // Initial form data
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    condition: 'new' as 'new' | 'used' | 'refurbished',
    description: '',
    specification: '',
    metadata: {},
    variants: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Variants state - Start with empty array, user can add variants manually
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [showVariants, setShowVariants] = useState(true); // ✅ Always show variants section by default
  const [useVariants, setUseVariants] = useState(false);
  const [isReorderingVariants, setIsReorderingVariants] = useState(false);
  const [draggedVariantIndex, setDraggedVariantIndex] = useState<number | null>(null);

  // Variant specifications modal state
  const [showVariantSpecificationsModal, setShowVariantSpecificationsModal] = useState(false);
  const [currentVariantIndex, setCurrentVariantIndex] = useState<number | null>(null);
  const [customAttributeInput, setCustomAttributeInput] = useState('');
  const [customAttributeValue, setCustomAttributeValue] = useState('');
  const [selectedSpecCategory, setSelectedSpecCategory] = useState<string>('laptop');
  const [variantSpecStep, setVariantSpecStep] = useState(0);
  const [showAllVariantSpecs, setShowAllVariantSpecs] = useState(false);

  // Prevent body scroll when modals are open
  useBodyScrollLock(isOpen || showVariantSpecificationsModal);

  // Name checking
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [originalProductName, setOriginalProductName] = useState<string>('');

  const { currentUser } = useAuth();

  // Handle variants toggle - Actually toggle the variants visibility
  const handleUseVariantsToggle = (enabled: boolean) => {
    setUseVariants(enabled);
    setShowVariants(enabled || variants.length > 0); // Show if enabled OR if variants exist
  };
  
  // ✅ CRITICAL: Auto-enable useVariants when variants are added
  useEffect(() => {
    if (variants.length > 0) {
      setUseVariants(true);
      setShowVariants(true);
    }
  }, [variants.length]);

  // Auto-update variant SKUs when base SKU changes
  useEffect(() => {
    if (variants.length > 0 && formData.sku) {
      setVariants(prevVariants => 
        prevVariants.map((variant, index) => ({
          ...variant,
          sku: `${formData.sku}-V${(index + 1).toString().padStart(2, '0')}`
        }))
      );
    }
  }, [formData.sku]);

  // Load product data when modal opens
  const loadProductData = useCallback(async () => {
    if (!isOpen || !productId) return;

    setIsLoadingProduct(true);
    try {
      const product = await getProduct(productId, { forceRefresh: true });
      
      // Extract condition from attributes or use default
      const condition = (product as any).attributes?.condition || 
                       (product as any).condition || 
                       'new';

      // Extract specification from attributes or direct field
      const specification = (product as any).attributes?.specification || 
                           (product as any).specification || 
                           '';

      // Set form data
      setFormData({
        name: product.name || '',
        sku: product.sku || generateAutoSKU(),
        categoryId: product.categoryId || '',
        condition: condition as 'new' | 'used' | 'refurbished',
        description: product.description || '',
        specification: typeof specification === 'string' ? specification : JSON.stringify(specification),
        metadata: (product as any).metadata || {},
        variants: []
      });

      setOriginalProductName(product.name || '');

      // Load variants
      if (product.variants && product.variants.length > 0) {
        const loadedVariants: ProductVariant[] = product.variants.map((v: any) => ({
          id: v.id,
          name: v.name || v.variant_name || 'Default',
          sku: v.sku || '',
          costPrice: v.costPrice || v.cost_price || 0,
          price: v.price || v.sellingPrice || v.selling_price || 0,
          stockQuantity: v.stockQuantity || v.quantity || 0,
          minStockLevel: v.minStockLevel || v.minQuantity || 0,
          specification: v.specification || '',
          attributes: v.attributes || v.variant_attributes || {}
        }));
        setVariants(loadedVariants);
        setUseVariants(true);
        setShowVariants(true);
      } else {
        setVariants([]);
        setUseVariants(false);
      }
    } catch (error: any) {
      console.error('Error loading product:', error);
      toast.error(error.message || 'Failed to load product data');
      onClose();
    } finally {
      setIsLoadingProduct(false);
    }
  }, [isOpen, productId, onClose]);

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const data = await getActiveCategories();
          setCategories(data);
        } catch (error) {
          console.error('Error loading categories:', error);
          toast.error('Failed to load categories');
        }
      };
      fetchCategories();
      loadProductData();
    } else {
      // Reset form when modal closes
      setFormData({
        name: '',
        sku: '',
        categoryId: '',
        condition: 'new',
        description: '',
        specification: '',
        metadata: {},
        variants: []
      });
      setVariants([]);
      setCurrentErrors({});
      setUseVariants(false);
      setShowVariants(true);
      setOriginalProductName('');
    }
  }, [isOpen, loadProductData]);

  // Check if product name exists (excluding current product)
  const checkProductName = async (name: string) => {
    if (!name.trim()) {
      setNameExists(false);
      return;
    }

    // Don't show warning if name hasn't changed
    if (name.trim() === originalProductName.trim()) {
      setNameExists(false);
      return;
    }

    setIsCheckingName(true);
    try {
      const { data, error } = await supabase
        .from('lats_products')
        .select('id')
        .ilike('name', name.trim())
        .neq('id', productId)
        .limit(1);

      if (error) throw error;
      setNameExists(data && data.length > 0);
    } catch (error) {
      console.error('Error checking product name:', error);
    } finally {
      setIsCheckingName(false);
    }
  };

  // Handle variant specifications click
  const handleVariantSpecificationsClick = (index: number) => {
    setCurrentVariantIndex(index);
    setShowVariantSpecificationsModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validation
    try {
      productFormSchema.parse(formData);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            errors[err.path[0]] = err.message;
          }
        });
        setCurrentErrors(errors);
        toast.error('Please fix the validation errors');
        return;
      }
    }

    if (!currentBranch?.id) {
      toast.error('No branch selected');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare attributes with specification and condition if available
      const productAttributes = {
        ...(formData.metadata || {}),
        ...(formData.specification ? { specification: formData.specification } : {}),
        ...(formData.condition ? { condition: formData.condition } : {})
      };

      // Prepare product update data
      const productUpdateData: any = {
        name: formData.name,
        description: formData.description || null,
        sku: formData.sku,
        categoryId: formData.categoryId || null,
        condition: formData.condition,
        attributes: productAttributes,
        metadata: {
          ...(formData.metadata || {}),
          useVariants: useVariants,
          variantCount: useVariants ? variants.length : 0,
          updatedBy: currentUser?.id,
          updatedAt: new Date().toISOString()
        }
      };

      // Prepare variants if any
      if (variants.length > 0) {
        console.log('🔄 [EditProductModal] Preparing variants for product:', productId);
        
        const variantsToUpdate = variants.map((variant) => ({
          id: variant.id, // Include ID for existing variants
          sku: variant.sku || `${formData.sku}-V${variants.indexOf(variant) + 1}`,
          name: variant.name,
          costPrice: variant.costPrice || 0,
          sellingPrice: variant.price || 0,
          price: variant.price || 0, // Alias
          quantity: variant.stockQuantity || 0,
          stockQuantity: variant.stockQuantity || 0, // Alias
          minQuantity: variant.minStockLevel || 0,
          minStockLevel: variant.minStockLevel || 0, // Alias
          attributes: variant.attributes || {}
        }));

        productUpdateData.variants = variantsToUpdate;
      }

      console.log('🔄 [EditProductModal] Updating product with data:', productUpdateData);

      // Update product using latsProductApi (includes variants if any)
      const { updateProduct } = await import('../../../../lib/latsProductApi');
      await updateProduct(productId, productUpdateData, currentUser?.id || '');

      // Clear all caches
      console.log('🔄 [EditProductModal] Clearing product caches...');
      productCacheService.clearProducts();
      
      // Clear query cache and deduplication cache
      const { invalidateCachePattern } = await import('../../../../lib/queryCache');
      invalidateCachePattern('products:*');
      
      // Clear enhanced cache manager
      const { smartCache } = await import('../../../../lib/enhancedCacheManager');
      smartCache.invalidateCache('products');
      
      // Optimized: Update only the edited product in the store instead of reloading all products
      // This avoids slow database response warnings during cold starts
      try {
        const { getProduct: getProductFromStore } = useInventoryStore.getState();
        const productResponse = await getProductFromStore(productId);
        
        if (productResponse.ok && productResponse.data) {
          const { updateProductInStore } = useInventoryStore.getState();
          updateProductInStore(productResponse.data);
          console.log('✅ [EditProductModal] Product updated in store without full reload');
        } else {
          throw new Error(productResponse.message || 'Failed to fetch updated product');
        }
      } catch (error) {
        console.warn('⚠️ [EditProductModal] Failed to update product in store, falling back to full reload:', error);
        // Fallback to full reload if single product update fails
        // @ts-ignore - loadProducts accepts force parameter but type definition doesn't include it
        await loadProducts(null, true);
      }
      
      // Optionally refresh in background without blocking (non-blocking)
      // This ensures data consistency without causing slow response warnings
      setTimeout(async () => {
        try {
          // @ts-ignore
          await loadProducts(null, true);
          console.log('✅ [EditProductModal] Background product refresh completed');
        } catch (error) {
          console.warn('⚠️ [EditProductModal] Background refresh failed (non-critical):', error);
        }
      }, 1000);

      toast.success('Product updated successfully!');
      
      // Call callbacks
      if (onProductUpdated) onProductUpdated();
      if (onSuccess) onSuccess();
      
      onClose();
    } catch (error: any) {
      console.error('❌ [EditProductModal] Error updating product:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Provide more helpful error messages
      if (error.code === '23505') {
        toast.error('A product with this SKU already exists.');
      } else {
        toast.error(error.message || 'Failed to update product. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Calculate completion stats (same as AddProductModal)
  const completedScalarFields = [
    formData.name,
    formData.categoryId,
    formData.condition
  ].filter(Boolean).length;
  
  const completedVariants = variants.filter(v => v.name && v.price > 0).length;
  
  const completedFields = completedScalarFields + completedVariants;
  const totalFields = 3 + variants.length;
  const pendingFields = totalFields - completedFields;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[99999]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center z-[100000] p-4 pointer-events-none"
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-product-modal-title"
        >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          disabled={isSubmitting || isLoadingProduct}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Loading State */}
        {isLoadingProduct && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading product data...</p>
            </div>
          </div>
        )}

        {/* Icon Header - Fixed (same as AddProductModal) */}
        {!isLoadingProduct && (
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              
              {/* Text and Progress */}
              <div>
                <h3 id="edit-product-modal-title" className="text-2xl font-bold text-gray-900 mb-3">Edit Product</h3>
                
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
        )}

        {/* Scrollable Content */}
        {!isLoadingProduct && (
          <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
            <div className="py-4">
              {/* Product Information */}
              <ProductInformationForm
                formData={formData}
                setFormData={setFormData}
                categories={categories}
                currentErrors={currentErrors}
                isCheckingName={isCheckingName}
                nameExists={nameExists}
                onNameCheck={checkProductName}
                useVariants={useVariants}
                onGenerateSKU={generateAutoSKU}
              />

              {/* Product Variants */}
              <ProductVariantsSection
                variants={variants}
                setVariants={setVariants}
                useVariants={useVariants}
                setUseVariants={handleUseVariantsToggle}
                showVariants={showVariants}
                setShowVariants={setShowVariants}
                isReorderingVariants={isReorderingVariants}
                setIsReorderingVariants={setIsReorderingVariants}
                draggedVariantIndex={draggedVariantIndex}
                setDraggedVariantIndex={setDraggedVariantIndex}
                onVariantSpecificationsClick={handleVariantSpecificationsClick}
                baseSku={formData.sku}
              />
            </div>
          </div>
        )}

        {/* Fixed Action Buttons Footer */}
        {!isLoadingProduct && (
          <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
            {pendingFields > 0 && (
              <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-semibold text-orange-700">
                  Please complete all required fields before updating the product.
                </span>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <button
                type="submit"
                disabled={isSubmitting || isCheckingName || !formData.name || !formData.categoryId || !formData.condition}
                className="w-full px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Update Product'
                )}
              </button>
            </form>
          </div>
        )}
        </div>
      </div>

      {/* Variant Specifications Modal - Same as AddProductModal */}
      {showVariantSpecificationsModal && currentVariantIndex !== null && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 z-[100002]"
            onClick={() => {
              setShowVariantSpecificationsModal(false);
              setVariantSpecStep(0);
              setCustomAttributeInput('');
              setCustomAttributeValue('');
              setShowAllVariantSpecs(false);
            }}
          />
          
          {/* Modal Container */}
          <div 
            className="fixed inset-0 flex items-center justify-center z-[100003] p-4 pointer-events-none"
          >
            <div 
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative pointer-events-auto max-h-[90vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowVariantSpecificationsModal(false);
                  setVariantSpecStep(0);
                  setCustomAttributeInput('');
                  setCustomAttributeValue('');
                  setShowAllVariantSpecs(false);
                }}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-10"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon Header - Fixed */}
              <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <Layers className="w-8 h-8 text-white" />
                  </div>
                  
                  {/* Text */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Variant Specifications</h3>
                    <p className="text-sm text-purple-700 font-medium">
                      {variants[currentVariantIndex]?.name || `Variant ${currentVariantIndex !== null ? currentVariantIndex + 1 : ''}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
                {currentVariantIndex !== null && variants[currentVariantIndex] && (
                  <div className="py-4 space-y-4">
                    {/* Current Attributes Display */}
                    {variants[currentVariantIndex].attributes && Object.keys(variants[currentVariantIndex].attributes || {}).length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Specifications</h4>
                        <div className="space-y-2">
                          {Object.entries(variants[currentVariantIndex].attributes || {}).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-700">{key.replace(/_/g, ' ')}:</span>
                                <span className="text-sm text-gray-600 ml-2">{String(value)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedAttributes = { ...variants[currentVariantIndex].attributes };
                                  delete updatedAttributes[key];
                                  setVariants(prev => prev.map((v, i) => 
                                    i === currentVariantIndex 
                                      ? { ...v, attributes: updatedAttributes }
                                      : v
                                  ));
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add New Specification */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Specification</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Attribute Name</label>
                          <input
                            type="text"
                            value={customAttributeInput}
                            onChange={(e) => setCustomAttributeInput(e.target.value)}
                            placeholder="e.g., Color, Size, Storage"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Value</label>
                          <input
                            type="text"
                            value={customAttributeValue}
                            onChange={(e) => setCustomAttributeValue(e.target.value)}
                            placeholder="e.g., Black, Large, 256GB"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && customAttributeInput && customAttributeValue) {
                                const updatedAttributes = {
                                  ...variants[currentVariantIndex].attributes,
                                  [customAttributeInput]: customAttributeValue
                                };
                                setVariants(prev => prev.map((v, i) => 
                                  i === currentVariantIndex 
                                    ? { ...v, attributes: updatedAttributes }
                                    : v
                                ));
                                setCustomAttributeInput('');
                                setCustomAttributeValue('');
                              }
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (customAttributeInput && customAttributeValue) {
                              const updatedAttributes = {
                                ...variants[currentVariantIndex].attributes,
                                [customAttributeInput]: customAttributeValue
                              };
                              setVariants(prev => prev.map((v, i) => 
                                i === currentVariantIndex 
                                  ? { ...v, attributes: updatedAttributes }
                                  : v
                              ));
                              setCustomAttributeInput('');
                              setCustomAttributeValue('');
                            }
                          }}
                          disabled={!customAttributeInput || !customAttributeValue}
                          className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                          Add Specification
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowVariantSpecificationsModal(false);
                    setVariantSpecStep(0);
                    setCustomAttributeInput('');
                    setCustomAttributeValue('');
                    setShowAllVariantSpecs(false);
                    toast.success('Specifications saved!');
                  }}
                  className="w-full px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl text-lg"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default EditProductModal;

