import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { X, Layers, Package, Plus } from 'lucide-react';
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
    } else {
      // Reset form when modal closes
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
      setUseVariants(false);
      setShowVariants(true);
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
          cost_price: variant.costPrice || 0,  // ✅ FIX: Use variant costPrice from form
          unit_price: variant.price || 0,  // ✅ FIX: Use variant price as unit_price
          selling_price: variant.price || 0,  // ✅ FIX: Use variant price from form
          quantity: variant.stockQuantity || 0,  // ✅ FIX: Use variant stockQuantity from form
          min_quantity: variant.minStockLevel || 0,  // ✅ FIX: Use variant minStockLevel from form
          variant_attributes: {  // ✅ Save to 'variant_attributes' (correct column)
            ...variant.attributes,
            specification: variant.specification || null
          },
          attributes: variant.attributes || {},  // ✅ Added separate 'attributes' column
          is_active: true,
          // Mark as parent if it has children variants
          is_parent: variant.useChildrenVariants && variant.childrenVariants && variant.childrenVariants.filter(c => c.trim()).length > 0,
          variant_type: variant.useChildrenVariants && variant.childrenVariants && variant.childrenVariants.filter(c => c.trim()).length > 0 ? 'parent' : null
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

          // Create children variants (IMEI/Serial numbers) if any
          if (createdVariants && createdVariants.length > 0) {
            const { addIMEIToParentVariant, checkIMEIExists } = await import('../../lib/imeiVariantService');
            
            for (let i = 0; i < createdVariants.length; i++) {
              const createdVariant = createdVariants[i];
              const formVariant = variants[i];
              
              // Check if this variant has children variants to add
              if (formVariant.useChildrenVariants && formVariant.childrenVariants && formVariant.childrenVariants.length > 0) {
                const validChildren = formVariant.childrenVariants.filter(c => c.trim().length > 0);
                
                if (validChildren.length > 0) {
                  console.log(`🔄 [AddProductModal] Creating ${validChildren.length} children variants for variant ${createdVariant.id}`);
                  
                  // Ensure parent is marked as parent
                  if (!createdVariant.is_parent) {
                    await supabase
                      .from('lats_product_variants')
                      .update({
                        is_parent: true,
                        variant_type: 'parent',
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', createdVariant.id);
                  }
                  
                  // Add each child variant
                  const childrenResults = [];
                  for (const childValue of validChildren) {
                    const trimmedValue = childValue.trim();
                    
                    // Check if IMEI/Serial already exists
                    const exists = await checkIMEIExists(trimmedValue);
                    if (exists) {
                      console.warn(`⚠️ [AddProductModal] IMEI/Serial ${trimmedValue} already exists, skipping`);
                      toast.error(`IMEI/Serial ${trimmedValue} already exists`);
                      continue;
                    }
                    
                    // Add child variant
                    const result = await addIMEIToParentVariant(createdVariant.id, {
                      imei: trimmedValue,
                      serial_number: trimmedValue,
                      cost_price: formVariant.costPrice || createdVariant.cost_price || 0,
                      selling_price: formVariant.price || createdVariant.selling_price || 0,
                      condition: 'new',
                      source: 'purchase'
                    });
                    
                    if (result.success) {
                      childrenResults.push(trimmedValue);
                    } else {
                      console.error(`❌ [AddProductModal] Failed to add child variant ${trimmedValue}:`, result.error);
                      toast.error(`Failed to add IMEI/Serial ${trimmedValue}: ${result.error}`);
                    }
                  }
                  
                  if (childrenResults.length > 0) {
                    console.log(`✅ [AddProductModal] Created ${childrenResults.length} children variants for variant ${createdVariant.id}`);
                  }
                }
              }
            }
          }
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

  // Calculate completion stats
  // Count scalar fields (name, categoryId, condition) separately from variant objects
  const completedScalarFields = [
    formData.name,
    formData.categoryId,
    formData.condition
  ].filter(Boolean).length;
  
  // Count complete variants separately using .length property
  const completedVariants = variants.filter(v => v.name && v.price > 0).length;
  
  // Sum the counts
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
          aria-labelledby="add-product-modal-title"
        >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            
            {/* Text and Progress */}
            <div>
              <h3 id="add-product-modal-title" className="text-2xl font-bold text-gray-900 mb-3">Add New Product</h3>
              
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

        {/* Scrollable Content */}
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

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          {pendingFields > 0 && (
            <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-semibold text-orange-700">
                Please complete all required fields before creating the product.
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
                'Create Product'
              )}
            </button>
          </form>
        </div>
        </div>
      </div>

      {/* Variant Specifications Modal */}
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

export default AddProductModal;

