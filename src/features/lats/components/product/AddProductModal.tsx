import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { X, Layers, Package } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import { useBranch } from '../../../../context/BranchContext';
import { retryWithBackoff } from '../../../../lib/supabaseClient';

import { getActiveCategories, Category } from '../../../../lib/categoryApi';

import { generateSKU } from '../../lib/skuUtils';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { productCacheService } from '../../../../lib/productCacheService';

// Extracted components
import ProductInformationForm from './ProductInformationForm';
import ProductVariantsSection from './ProductVariantsSection';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated?: () => void;
  onProductAdded?: (product: any) => void;
  currency?: any; // Optional currency prop for purchase orders
}

// Import ProductVariant type
interface ProductVariant {
  name: string;
  sku: string;
  specification?: string;
  attributes?: Record<string, any>;
}

// Validation schema for product form
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

const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  onProductAdded,
  currency
}) => {
  const { currentBranch } = useBranch();
  const { loadProducts } = useInventoryStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentErrors, setCurrentErrors] = useState<Record<string, string>>({});

  // Generate auto SKU using utility function
  const generateAutoSKU = () => {
    return generateSKU();
  };

  // Initial form data
  const [formData, setFormData] = useState({
    name: '',
    sku: generateAutoSKU(),
    categoryId: '',
    condition: 'new' as 'new' | 'used' | 'refurbished',
    description: '',
    specification: '',
    metadata: {},
    variants: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Variants state - Start with empty array, user can add variants manually
  // If no variants are added, the database trigger will auto-create a "Default" variant
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

  // Name checking
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameExists, setNameExists] = useState(false);

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

      // Generate new SKU when modal opens
      setFormData(prev => ({
        ...prev,
        sku: generateAutoSKU()
      }));
    }
  }, [isOpen]);

  // Check if product name exists
  const checkProductName = async (name: string) => {
    if (!name.trim()) {
      setNameExists(false);
      return;
    }

    setIsCheckingName(true);
    try {
      const { data, error } = await supabase
        .from('lats_products')
        .select('id')
        .ilike('name', name.trim())
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
      // Set total quantity and value to 0 - will be managed by variants
      const totalQuantity = 0;
      const totalValue = 0;

      // Always generate/use SKU - it's the base for variant SKUs
      const finalSku = formData.sku || generateAutoSKU();
      
      // Prepare attributes with specification and condition if available
      const productAttributes = {
        ...(formData.metadata || {}),
        ...(formData.specification ? { specification: formData.specification } : {}),
        ...(formData.condition ? { condition: formData.condition } : {})
      };

      // Validate branch_id exists in store_locations
      let validatedBranchId = currentBranch?.id || null;
      if (validatedBranchId) {
        console.log('🔍 [AddProductModal] Validating branch_id:', validatedBranchId);
        const { data: branchCheck } = await supabase
          .from('store_locations')
          .select('id')
          .eq('id', validatedBranchId)
          .single();
        
        if (!branchCheck) {
          console.warn('⚠️ [AddProductModal] Current branch ID not found in store_locations, setting to null');
          validatedBranchId = null;
        }
      }

      const productData = {
        name: formData.name,
        description: formData.description || null,
        sku: finalSku,
        category_id: formData.categoryId || null,
        branch_id: validatedBranchId,

        // Set prices and stock to 0 - variants will handle these
        cost_price: 0,
        selling_price: 0,
        stock_quantity: 0,
        min_stock_level: 0,
        total_quantity: totalQuantity,
        total_value: totalValue,
        attributes: productAttributes,
        metadata: {
          useVariants: useVariants,
          variantCount: useVariants ? variants.length : 0,
          skip_default_variant: useVariants && variants.length > 0, // ✅ Skip auto-creation if custom variants provided
          createdBy: currentUser?.id,
          createdAt: new Date().toISOString()
        },
        is_active: true
      };

      console.log('🔄 [AddProductModal] Creating product with data:', productData);

      // Create product
      const { data: product, error: productError } = await retryWithBackoff(async () => {
        return await supabase
          .from('lats_products')
          .insert([productData])
          .select()
          .single();
      });

      console.log('🔍 [AddProductModal] INSERT result:', { 
        data: product, 
        error: productError, 
        hasData: !!product, 
        hasError: !!productError
      });

      // Check if we have an error (even if not thrown)
      if (productError) {
        console.error('❌ [AddProductModal] Product creation failed with error:', productError);
        console.error('Error details:', {
          message: productError.message,
          code: productError.code,
          details: productError.details,
          hint: productError.hint
        });
        
        // Provide more helpful error messages
        if (productError.code === '23503') {
          toast.error('Invalid branch assignment. Please refresh the page and try again.');
        } else if (productError.code === '23505') {
          toast.error('A product with this SKU already exists.');
        } else {
          toast.error(`Product creation failed: ${productError.message}`);
        }
        throw productError;
      }

      // Check if we got null data without an error
      if (!product) {
        console.error('❌ [AddProductModal] Product creation returned null WITHOUT an error!');
        console.error('❌ This usually means RLS policy allows INSERT but blocks SELECT');
        
        // Check current user
        const { data: { user } } = await supabase.auth.getUser();
        console.error('❌ Current user:', user);
        console.error('❌ User ID:', user?.id);
        
        toast.error('Product creation failed - database returned no data. Please check your permissions.');
        return;
      }

      console.log('✅ [AddProductModal] Product created successfully:', product);

      // Create variants if any
      if (product && variants.length > 0) {
        console.log('🔄 [AddProductModal] Creating user-defined variants for product:', product.id);
        console.log('Variants from form:', variants.map(v => ({ name: v.name, sku: v.sku })));
        
        const variantsToInsert = variants.map((variant, index) => ({
          product_id: product.id,
          branch_id: currentBranch?.id || null,  // ✅ Include branch_id to satisfy NOT NULL constraint
          name: variant.name || `Variant ${index + 1}`,  // ✅ 'name' column
          variant_name: variant.name || `Variant ${index + 1}`,  // ✅ 'variant_name' column (both needed)
          sku: variant.sku || `${formData.sku}-V${(index + 1).toString().padStart(2, '0')}`,
          cost_price: 0,
          unit_price: 0,  // ✅ Added missing column
          selling_price: 0,
          quantity: 0,  // ✅ Correct column name (not stock_quantity)
          min_quantity: 0,  // ✅ Correct column name
          variant_attributes: {  // ✅ Save to 'variant_attributes' (correct column)
            ...variant.attributes,
            specification: variant.specification || null
          },
          attributes: variant.attributes || {},  // ✅ Added separate 'attributes' column
          is_active: true
        }));

        console.log('🔄 [AddProductModal] Variant data to insert:', variantsToInsert);

        const { data: createdVariants, error: variantsError } = await retryWithBackoff(async () => {
          return await supabase
            .from('lats_product_variants')
            .insert(variantsToInsert)
            .select();
        });

        if (variantsError) {
          console.error('❌ [AddProductModal] Error creating variants:', variantsError);
          toast.error('Product created but failed to create variants');
        } else {
          console.log('✅ [AddProductModal] Variants created successfully:', createdVariants);
        }
      }

      // Clear all caches
      console.log('🔄 [AddProductModal] Clearing all product caches and reloading...');
      productCacheService.clearProducts();
      
      // Clear query cache and deduplication cache
      const { invalidateCachePattern } = await import('../../../../lib/queryCache');
      invalidateCachePattern('products:*');
      
      // Clear enhanced cache manager
      const { smartCache } = await import('../../../../lib/enhancedCacheManager');
      smartCache.invalidateCache('products');
      
      // Force refresh products (bypass all caches)
      await loadProducts(null, true);
      console.log('✅ [AddProductModal] Products reloaded successfully');

      toast.success('Product created successfully!');
      
      // Call both callbacks for compatibility
      if (onProductCreated) onProductCreated();
      if (onProductAdded) onProductAdded(product);
      
      onClose();

      // Reset form
      setFormData({
        name: '',
        sku: generateAutoSKU(),
        categoryId: '',
        condition: 'new',
        description: '',
        specification: '',
        metadata: {},
        variants: []
      });
      setVariants([]);
      setCurrentErrors({});
    } catch (error: any) {
      console.error('❌ [AddProductModal] Error creating product:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error(error.message || 'Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div 
        className="fixed bg-black/50"
        onClick={onClose}
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 35
        }}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed flex items-center justify-center p-2 sm:p-4"
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
        <div 
          className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Header - Fixed */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Add New Product</h3>
                  <p className="text-xs text-gray-500 hidden sm:block">Create new inventory item</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Product Information */}
              <div className="mb-4 sm:mb-5">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Product Information</h4>
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
              </div>

              {/* Product Variants */}
              <div className="mb-4 sm:mb-5">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Product Variants</h4>
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
          </div>

          {/* Action Buttons - Fixed Footer */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 bg-white rounded-lg text-sm sm:text-base text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isCheckingName}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span className="hidden sm:inline">Creating...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Create Product</span>
                      <span className="sm:hidden">Create</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">
                * Required fields must be filled
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Variant Specifications Modal */}
      {showVariantSpecificationsModal && currentVariantIndex !== null && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[60]"
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
            className="fixed inset-0 flex items-center justify-center z-[70] p-2 sm:p-4 pointer-events-none"
          >
            <div 
              className="bg-white rounded-2xl w-full max-w-[95vw] sm:max-w-md md:max-w-2xl shadow-2xl overflow-hidden relative pointer-events-auto max-h-[95vh] flex flex-col"
              role="dialog"
              aria-modal="true"
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
                className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-10"
                aria-label="Close modal"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Header */}
              <div className="p-4 sm:p-6 text-center bg-gradient-to-br from-purple-50 to-purple-100 flex-shrink-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg bg-purple-600">
                  <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Variant Specifications
                </h3>
                <p className="text-purple-700 text-xs sm:text-sm mt-2">
                  {variants[currentVariantIndex]?.name || `Variant ${currentVariantIndex + 1}`}
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-600 text-center mb-4">
                  Add specifications for this variant
                </p>
                {/* Add variant spec content here */}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowVariantSpecificationsModal(false);
                    toast.success('Specifications saved!');
                  }}
                  className="w-full px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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

export default AddProductModal;

