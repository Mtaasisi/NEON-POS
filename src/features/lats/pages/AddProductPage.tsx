import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import { BackButton } from '../../shared/components/ui/BackButton';
import { toast } from 'react-hot-toast';
import { Save, ArrowLeft, X, Plus, Check, Layers, FileText, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { useBranch } from '../../../context/BranchContext';
import { retryWithBackoff } from '../../../lib/supabaseClient';

import { getActiveCategories, Category } from '../../../lib/categoryApi';
import { specificationCategories, getSpecificationsByType, getTypeDisplayName } from '../../../data/specificationCategories';

import { generateSKU } from '../lib/skuUtils';
// ⚠️ DISABLED: Automatic default variant creation
// import { validateAndCreateDefaultVariant } from '../lib/variantUtils';
import { useInventoryStore } from '../stores/useInventoryStore';
import { productCacheService } from '../../../lib/productCacheService';

// Extracted components
import ProductInformationForm from '../components/product/ProductInformationForm';
import ProductVariantsSection from '../components/product/ProductVariantsSection';
import { useSuccessModal } from '../../../hooks/useSuccessModal';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import SuccessModal from '../../../components/ui/SuccessModal';
import ProductModal from '../components/product/ProductModal';
import { Product } from '../types/inventory';

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
    if (!val) return true; // Allow empty strings
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

const AddProductPageOptimized: React.FC = () => {
  const navigate = useNavigate();
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

  // Product Modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Variants state - Start with empty array, user can add variants manually
  // If no variants are added, the database trigger will auto-create a "Default" variant
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [showVariants, setShowVariants] = useState(true); // ✅ FIX: Always show variants section by default
  const [useVariants, setUseVariants] = useState(false);
  const [isReorderingVariants, setIsReorderingVariants] = useState(false);
  const [draggedVariantIndex, setDraggedVariantIndex] = useState<number | null>(null);

  // Variant specifications modal state
  const [showVariantSpecificationsModal, setShowVariantSpecificationsModal] = useState(false);
  const [currentVariantIndex, setCurrentVariantIndex] = useState<number | null>(null);
  const [customAttributeInput, setCustomAttributeInput] = useState('');
  const [customAttributeValue, setCustomAttributeValue] = useState('');
  const [selectedSpecCategory, setSelectedSpecCategory] = useState<string>('laptop');
  const [variantSpecStep, setVariantSpecStep] = useState(0); // Step tracker for variant specs
  const [showAllVariantSpecs, setShowAllVariantSpecs] = useState(false); // Toggle for showing all specs

  // Product specifications modal state
  const [showProductSpecificationsModal, setShowProductSpecificationsModal] = useState(false);
  const [showProductCustomInput, setShowProductCustomInput] = useState(false);
  const [productCustomAttributeInput, setProductCustomAttributeInput] = useState('');
  const [selectedProductSpecCategory, setSelectedProductSpecCategory] = useState<string>('laptop');

  // Prevent body scroll when modals are open
  useBodyScrollLock(showProductSpecificationsModal || showVariantSpecificationsModal);

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

  // Draft management
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [lastDraftSave, setLastDraftSave] = useState<Date | null>(null);
  const [draftSaveTimer, setDraftSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Success modal state
  const successModal = useSuccessModal();

  const { currentUser } = useAuth();

  // Handle variants toggle - kept for compatibility but variants are always enabled
  const handleUseVariantsToggle = (enabled: boolean) => {
    // ✅ FIX: Actually toggle the variants visibility
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

  // Draft storage key
  const DRAFT_KEY = `product_draft_${currentUser?.id || 'anonymous'}`;

  // Success modal action handlers removed - now handled inline in successModal.show()

  // Auto-save draft
  const saveDraft = useCallback(() => {
    try {
      const draftData = {
        formData,
        variants,
        useVariants,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      setIsDraftSaved(true);
      setLastDraftSave(new Date());
      
      // Clear success indicator after 2 seconds
      setTimeout(() => setIsDraftSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [formData, variants, useVariants, DRAFT_KEY]);

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const draftData = localStorage.getItem(DRAFT_KEY);
      if (draftData) {
        const parsed = JSON.parse(draftData);
        
        // ✅ ALWAYS generate a new SKU when loading draft to avoid duplicate key errors
        const newSku = generateAutoSKU();
        
        setFormData({
          ...parsed.formData,
          sku: newSku  // Use fresh SKU instead of saved one
        });
        
        // Update variant SKUs with the new base SKU
        const updatedVariants = (parsed.variants || [{
          name: 'Variant 1',
          sku: `${newSku}-V01`,
          attributes: {}
        }]).map((variant: ProductVariant, index: number) => ({
          ...variant,
          sku: `${newSku}-V${(index + 1).toString().padStart(2, '0')}`
        }));
        
        setVariants(updatedVariants);
        // Always keep variants enabled in the new design
        setUseVariants(true);
        setShowVariants(true);
        setLastDraftSave(new Date(parsed.savedAt));
        
        // Notify user that a fresh SKU was generated
        toast.success('Draft restored with a new SKU to avoid duplicates', { duration: 3000 });
        return true;
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return false;
  }, [DRAFT_KEY]);

  // Clear draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setLastDraftSave(null);
      setIsDraftSaved(false);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [DRAFT_KEY]);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const categoriesData = await getActiveCategories();

        setCategories(categoriesData || []);

        // Try to load draft after data is loaded
        loadDraft();
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load form data');
      }
    };

    loadData();
  }, [loadDraft]);

  // Auto-save draft when form data changes
  useEffect(() => {
    // Clear previous timer
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
    }

    // Set new timer to save draft after 2 seconds of inactivity
    const timer = setTimeout(() => {
      if (formData.name.trim() || formData.description.trim() || variants.length > 0) {
        saveDraft();
      }
    }, 2000);

    setDraftSaveTimer(timer);

    // Cleanup timer on unmount
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [formData, variants, useVariants, saveDraft]);

  // Load draft on page load if available
  useEffect(() => {
    const checkForDraft = async () => {
      try {
        const draftData = localStorage.getItem(DRAFT_KEY);
        if (draftData) {
          const parsed = JSON.parse(draftData);
          const draftAge = new Date().getTime() - new Date(parsed.savedAt).getTime();
          const hoursSinceDraft = draftAge / (1000 * 60 * 60);
          
          // Only restore if draft is less than 24 hours old
          if (hoursSinceDraft < 24) {
            // Auto-restore draft silently without showing popup
            loadDraft();
            // toast((t) => (
            //   <div className="flex flex-col gap-2">
            //     <span>Found a saved draft from {new Date(parsed.savedAt).toLocaleDateString()}</span>
            //     <div className="flex gap-2">
            //       <button
            //         onClick={() => {
            //           loadDraft();
            //           toast.dismiss(t.id);
            //         }}
            //         className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            //       >
            //         Restore Draft
            //       </button>
            //       <button
            //         onClick={() => {
            //           clearDraft();
            //           toast.dismiss(t.id);
            //         }}
            //         className="px-3 py-1 bg-gray-400 text-white rounded text-sm"
            //       >
            //         Discard
            //       </button>
            //     </div>
            //   </div>
            // ), { duration: 10000 });
          } else {
            // Clear old draft
            clearDraft();
          }
        }
      } catch (error) {
        console.error('Error checking for draft:', error);
      }
    };

    checkForDraft();
  }, [DRAFT_KEY, loadDraft, clearDraft]);

  // Check if product name exists
  const checkProductName = async (name: string) => {
    if (!name.trim()) {
      setNameExists(false);
      return;
    }

    setIsCheckingName(true);
    try {
      const { data, error } = await supabase!
        .from('lats_products')
        .select('id')
        .ilike('name', name.trim()) // Exact match (case-insensitive)
        .limit(1);

      if (error) throw error;
      
      setNameExists(data && data.length > 0);
    } catch (error) {
      console.error('Error checking product name:', error);
    } finally {
      setIsCheckingName(false);
    }
  };



  // Handle name check with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.name) {
        checkProductName(formData.name);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.name]);

  // Validate form
  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    try {
      // Validate using the product form schema
      productFormSchema.parse({
        ...formData,
        variants: useVariants ? variants : []
      });

      // Additional validation for variants when using variants
      if (useVariants) {
        if (variants.length === 0) {
          errors.variants = 'At least one variant is required when using variants';
        } else {
          variants.forEach((variant, index) => {
            if (!variant.name || variant.name.trim() === '') {
              errors[`variant_${index}_name`] = 'Variant name is required';
            }
          });
        }
      }
      
      setCurrentErrors(errors);
      return { isValid: Object.keys(errors).length === 0, errors };
    } catch (error) {
      console.error('Validation exception:', error);
      if (error instanceof z.ZodError) {
        error.issues.forEach((err) => {
          if (err.path.length > 0) {
            const fieldName = err.path[0] as string;
            errors[fieldName] = err.message;
          } else {
            // If no path, it's a general error
            errors['_general'] = err.message;
          }
        });
      } else {
        // Unexpected error
        errors['_general'] = 'Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error');
      }
      
      console.error('Validation errors found:', errors);
      setCurrentErrors(errors);
      return { isValid: false, errors };
    }
  };

  // Submit form
  const handleSubmit = async () => {
    const validation = validateForm();
    
    if (!validation.isValid) {
      console.error('Validation failed with errors:', validation.errors);
      
      // Show specific errors in toast
      const errorEntries = Object.entries(validation.errors).filter(([key]) => key !== '_general');
      const generalError = validation.errors['_general'];
      
      if (errorEntries.length > 0 || generalError) {
        toast.error(
          <div className="text-left">
            <div className="font-bold mb-1">Please fix these errors:</div>
            <div className="text-sm space-y-1">
              {generalError && <div className="text-red-600">• {generalError}</div>}
              {errorEntries.map(([field, message]) => (
                <div key={field}>• {message}</div>
              ))}
            </div>
          </div>,
          { duration: 6000 }
        );
      } else {
        toast.error('Please fix the errors before submitting');
      }
      return;
    }

    if (nameExists) {
      toast.error('A product with this name already exists');
      return;
    }

    setIsSubmitting(true);

    try {
      // Set total quantity and value to 0 - will be managed elsewhere
      const totalQuantity = 0;
      const totalValue = 0;

      // Prepare product data WITHOUT images (images will be saved separately)
      // When using variants, the product still needs a base SKU (for variant SKU generation)
      
      // Always generate/use SKU - it's the base for variant SKUs
      const finalSku = formData.sku || generateAutoSKU();
      
      // Prepare attributes with specification and condition if available
      const productAttributes = {
        ...(formData.metadata || {}),
        ...(formData.specification ? { specification: formData.specification } : {}),
        ...(formData.condition ? { condition: formData.condition } : {})
      };

      // Validate branch_id exists in store_locations (if provided)
      let validatedBranchId = currentBranch?.id || null;
      if (validatedBranchId) {
        console.log('🔍 Validating branch_id:', validatedBranchId);
        const { data: branchCheck } = await supabase!
          .from('store_locations')
          .select('id')
          .eq('id', validatedBranchId)
          .single();
        
        if (!branchCheck) {
          console.warn('⚠️ Current branch ID not found in store_locations, setting to null');
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
        // Don't send empty array - it causes "cannot determine type" error in PostgreSQL
        // tags: [],
        attributes: productAttributes,
        metadata: {
          useVariants: useVariants,
          variantCount: useVariants ? variants.length : 0,
          skip_default_variant: useVariants && variants.length > 0, // ✅ Skip auto-creation if custom variants provided
          createdBy: currentUser?.id,
          createdAt: new Date().toISOString()
        }
      };

      console.log('Creating product with data:', productData);

      // Create the product first
      const { data: createdProduct, error } = await retryWithBackoff(async () => {
        return await supabase!
          .from('lats_products')
          .insert([productData])
          .select()
          .single();
      });

      console.log('🔍 INSERT result:', { 
        data: createdProduct, 
        error: error, 
        hasData: !!createdProduct, 
        hasError: !!error
      });

      // Check if we have an error (even if not thrown)
      if (error) {
        console.error('❌ Product creation failed with error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Provide more helpful error messages
        if (error.code === '23503') {
          toast.error('Invalid branch assignment. Please refresh the page and try again.');
        } else if (error.code === '23505') {
          toast.error('A product with this SKU already exists.');
        } else {
          toast.error(`Product creation failed: ${error.message}`);
        }
        throw error;
      }

      // Check if we got null data without an error
      if (!createdProduct) {
        console.error('❌ Product creation returned null WITHOUT an error!');
        console.error('❌ This usually means:');
        console.error('   1. RLS policy allows INSERT but blocks SELECT');
        console.error('   2. Trigger is failing silently');
        console.error('   3. User is not authenticated properly');
        
        // Check current user
        const { data: { user } } = await supabase!.auth.getUser();
        console.error('❌ Current user:', user);
        console.error('❌ User ID:', user?.id);
        console.error('❌ User authenticated:', !!user);
        
        toast.error('Product creation failed - database returned no data. Please check your permissions or refresh the page.');
        return;
      }

      console.log('✅ Product created successfully:', createdProduct);

      // Create variants - either the user-defined variants or a default variant
      if (createdProduct) {
        let variantsToCreate: any[] = [];
        
        if (useVariants && variants.length > 0) {
          // Create user-defined variants
          console.log('Creating user-defined variants for product:', createdProduct.id);
          console.log('Variants from form:', variants.map(v => ({ name: v.name, sku: v.sku })));
          
          variantsToCreate = variants.map((variant, index) => ({
            product_id: createdProduct.id,
            branch_id: currentBranch?.id || null,  // ✅ FIXED: Include branch_id to satisfy NOT NULL constraint
            sku: variant.sku || `${formData.sku}-V${index + 1}`,
            variant_name: variant.name || `Variant ${index + 1}`,  // ✅ Provide fallback if name is empty
            cost_price: 0,
            selling_price: 0,
            quantity: 0,
            min_quantity: 0,
            variant_attributes: {  // ✅ FIXED: Save to 'variant_attributes' (correct column)
              ...variant.attributes,
              specification: variant.specification || null
            }
          }));
        } 
        // ⚠️ DISABLED: Automatic default variant creation
        // Only variants explicitly created by the user will be added
        // else {
        //   // No variants provided - create a default variant automatically using utility
        //   console.log('Creating default variant for product:', createdProduct.id);
        //   
        //   const defaultVariantResult = await validateAndCreateDefaultVariant(
        //     createdProduct.id,
        //     createdProduct.name,
        //     {
        //       costPrice: formData.costPrice,
        //       sellingPrice: formData.price,
        //       quantity: formData.stockQuantity,
        //       minQuantity: formData.minStockLevel,
        //       // Don't pass sku to avoid duplicate SKU constraint violation
        //       // The variant will generate its own unique SKU
        //       attributes: {
        //         specification: formData.specification || null
        //       }
        //     }
        //   );
        //
        //   if (!defaultVariantResult.success) {
        //     console.error('❌ Failed to create default variant:', defaultVariantResult.error);
        //     toast.error(`Failed to create default variant: ${defaultVariantResult.error}`);
        //     return;
        //   }
        //   
        //   console.log('✅ Default variant created successfully');
        //   // Skip the manual variant creation since it's already done
        //   variantsToCreate = [];
        // }

        console.log('Variant data to insert:', variantsToCreate);

        // Only insert variants if there are any to insert (skip if default variant was already created)
        let createdVariants = null;
        let variantError = null;
        
        if (variantsToCreate.length > 0) {
          const result = await retryWithBackoff(async () => {
            return await supabase!
              .from('lats_product_variants')
              .insert(variantsToCreate)
              .select();
          });
          createdVariants = result.data;
          variantError = result.error;
        }

        if (variantError) {
          console.error('Error creating variants:', variantError);
          toast.error('Product created but failed to create variants');
        } else {
          console.log('Variants created successfully:', createdVariants);
        }
      } else {
        console.error('No product created, cannot create variants');
      }

      // Store created product info for success modal
      if (!createdProduct) {
        console.error('❌ Product creation returned null - likely RLS policy issue');
        toast.error('Product creation failed - please check database permissions');
        return;
      }
      
      // Clear draft after successful submission
      clearDraft();
      
      // 🔄 Clear cache and reload products to show the newly created product
      console.log('🔄 Clearing product cache and reloading...');
      productCacheService.clearProducts();
      await loadProducts(); // Force reload
      console.log('✅ Products reloaded successfully');
      
      // Show success modal with action buttons
      successModal.show(`Product "${formData.name}" has been created successfully!`, {
        title: 'Product Created',
        actionButtons: [
          {
            label: 'Go to PO',
            onClick: () => {
              navigate('/lats/purchase-order/create');
            },
            variant: 'primary'
          },
          {
            label: 'View Product',
            onClick: async () => {
              try {
                // Fetch the created product with all its data
                const { data: productData, error } = await supabase
                  .from('lats_products')
                  .select(`
                    *,
                    category:lats_categories(id, name),
                    variants:lats_product_variants(*)
                  `)
                  .eq('id', createdProduct.id)
                  .single();

                if (error) {
                  console.error('Error fetching product:', error);
                  toast.error('Failed to load product details');
                  return;
                }

                if (productData) {
                  // Ensure variants is an array
                  const variantsArray = Array.isArray(productData.variants) ? productData.variants : [];
                  
                  console.log('📦 [View Product] Raw variant data from DB:', variantsArray.map((v: any) => ({
                    variant_name: v.variant_name,
                    name: v.name,
                    sku: v.sku,
                    quantity: v.quantity
                  })));

                  // Transform the data to match Product type
                  const firstVariant = variantsArray[0];
                  const product: Product = {
                    id: productData.id,
                    name: productData.name,
                    sku: firstVariant?.sku || productData.sku || '',
                    description: productData.description || '',
                    categoryId: productData.category_id,
                    category: productData.category,
                    condition: firstVariant?.condition || productData.condition || 'new',
                    price: firstVariant?.selling_price || 0,
                    costPrice: firstVariant?.cost_price || 0,
                    stockQuantity: firstVariant?.quantity || 0,
                    minStockLevel: firstVariant?.min_quantity || 0,
                    status: productData.is_active ? 'active' : 'inactive',
                    isActive: productData.is_active,
                    isFeatured: productData.is_featured || false,
                    totalQuantity: variantsArray.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0) || 0,
                    images: [],
                    variants: variantsArray.map((v: any, idx: number) => ({
                      id: v.id,
                      sku: v.sku,
                      name: v.variant_name || v.name || `Variant ${idx + 1}`,  // ✅ Add fallback
                      variant_name: v.variant_name,  // ✅ Keep original for debugging
                      price: v.selling_price,
                      costPrice: v.cost_price,
                      stockQuantity: v.quantity,
                      minStockLevel: v.min_quantity,
                      quantity: v.quantity,
                      minQuantity: v.min_quantity,
                      sellingPrice: v.selling_price,
                      condition: v.condition,
                      isPrimary: v.is_primary,
                      attributes: v.attributes || {},
                      variant_attributes: v.variant_attributes || {}  // ✅ Add this too
                    })),
                    attributes: productData.attributes || {},
                    metadata: productData.metadata || {},
                    createdAt: productData.created_at,
                    updatedAt: productData.updated_at
                  };

                  console.log('📦 [View Product] Transformed variants:', product.variants.map(v => ({
                    name: v.name,
                    variant_name: (v as any).variant_name,
                    sku: v.sku
                  })));

                  setSelectedProduct(product);
                  setShowProductModal(true);
                }
              } catch (error) {
                console.error('Error loading product:', error);
                toast.error('Failed to load product details');
              }
            },
            variant: 'primary'
          },
          {
            label: 'Create Another',
            onClick: () => {
              const newSku = generateAutoSKU();
              setFormData({
                name: '',
                sku: newSku,
                categoryId: '',
                condition: 'new' as 'new' | 'used' | 'refurbished',
                description: '',
                specification: '',
                metadata: {},
                variants: [],
              });
              setVariants([{
                name: 'Variant 1',
                sku: '',
                attributes: {}
              }]);
            },
            variant: 'secondary'
          },
          {
            label: 'Duplicate',
            onClick: () => {
              // Keep all the current form data but generate new SKU
              const newSku = generateAutoSKU();
              setFormData(prev => ({
                ...prev,
                sku: newSku,
                name: `${prev.name} (Copy)`,
              }));
              // Keep variants but clear their SKUs
              setVariants(prev => prev.map(v => ({
                ...v,
                sku: ''
              })));
              toast.success('Product duplicated! Adjust details and save.');
            },
            variant: 'secondary'
          },
          {
            label: 'Go to Inventory',
            onClick: () => {
              navigate('/lats/inventory');
            },
            variant: 'secondary'
          }
        ]
      });
      
    } catch (error) {
      console.error('Error creating product:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error('Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add attribute to a variant
  const addAttributeToVariant = (variantIndex: number, attributeName: string, defaultValue: string = '') => {
    const variant = variants[variantIndex];
    const newAttributes = { ...variant.attributes, [attributeName]: defaultValue };
    updateVariant(variantIndex, 'attributes', newAttributes);
  };

  // Update specification value for a variant
  const updateVariantSpecification = (variantIndex: number, specKey: string, value: string | boolean) => {
    const variant = variants[variantIndex];
    const newAttributes = { ...variant.attributes, [specKey]: value };
    updateVariant(variantIndex, 'attributes', newAttributes);
  };

  // Handle custom attribute submission
  const handleCustomAttributeSubmit = (variantIndex: number) => {
    if (customAttributeInput.trim()) {
      const cleanName = customAttributeInput.trim().toLowerCase().replace(/\s+/g, '_');
      addAttributeToVariant(variantIndex, cleanName, customAttributeValue.trim() || '');
      setCustomAttributeInput(''); // Clear inputs after adding
      setCustomAttributeValue('');
      toast.success('Custom specification added!');
    }
  };

  // Update variant function
  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    ));
  };

  // Remove attribute from a variant
  const removeAttributeFromVariant = (variantIndex: number, attributeName: string) => {
    const variant = variants[variantIndex];
    const newAttributes = { ...variant.attributes };
    delete newAttributes[attributeName];
    updateVariant(variantIndex, 'attributes', newAttributes);
  };

  const handleVariantSpecificationsClick = (index: number) => {
    setCurrentVariantIndex(index);
    setVariantSpecStep(0); // Reset to first step
    setCustomAttributeInput(''); // Clear custom inputs
    setCustomAttributeValue('');
    setShowAllVariantSpecs(false); // Reset show all toggle
    setShowVariantSpecificationsModal(true);
  };

  const handleProductSpecificationsClick = () => {
    setShowProductSpecificationsModal(true);
  };

  // Add attribute to product
  const addAttributeToProduct = (attributeName: string, defaultValue: string = '') => {
    const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
    const newSpecs = { ...currentSpecs, [attributeName]: defaultValue };
    setFormData(prev => ({ ...prev, specification: JSON.stringify(newSpecs) }));
  };

  // Update product specification value
  const updateProductSpecification = (specKey: string, value: string | boolean) => {
    const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
    const newSpecs = { ...currentSpecs, [specKey]: value };
    setFormData(prev => ({ ...prev, specification: JSON.stringify(newSpecs) }));
  };

  // Handle custom attribute submission for product
  const handleProductCustomAttributeSubmit = () => {
    if (productCustomAttributeInput.trim()) {
      const cleanName = productCustomAttributeInput.trim().toLowerCase().replace(/\s+/g, '_');
      addAttributeToProduct(cleanName);
      setShowProductCustomInput(false);
      setProductCustomAttributeInput('');
    }
  };

  // Cancel custom attribute input for product
  const cancelProductCustomAttribute = () => {
    setShowProductCustomInput(false);
    setProductCustomAttributeInput('');
  };

  // Remove attribute from product
  const removeAttributeFromProduct = (attributeName: string) => {
    const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
    const newSpecs = { ...currentSpecs };
    delete newSpecs[attributeName];
    setFormData(prev => ({ ...prev, specification: JSON.stringify(newSpecs) }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BackButton to="/lats/unified-inventory" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Add Product</h1>
                <p className="text-sm text-gray-600">Create new inventory item</p>
              </div>
            </div>
            
            {/* Draft Status Indicator */}
            <div className="flex items-center gap-2">
              {isDraftSaved && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs">
                  <Check className="w-3 h-3 text-green-600" />
                  <span className="text-green-700 font-medium">Saved</span>
                </div>
              )}
              
              {lastDraftSave && !isDraftSaved && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span className="text-blue-700">{lastDraftSave.toLocaleTimeString()}</span>
                </div>
              )}
              
              {lastDraftSave && (
                <button
                  onClick={clearDraft}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Clear draft"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Product Information Form Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <ProductInformationForm
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            currentErrors={currentErrors}
            isCheckingName={isCheckingName}
            nameExists={nameExists}
            onNameCheck={checkProductName}
            onSpecificationsClick={handleProductSpecificationsClick}
            useVariants={useVariants}
            onGenerateSKU={generateAutoSKU}
          />
        </div>

        {/* Product Variants Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/lats/unified-inventory')}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-6 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </button>
          
          <div className="flex-1"></div>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isCheckingName}
            className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create Product
              </>
            )}
          </button>
        </div>
      </div>

            {/* Variant Specifications Modal */}
      {showVariantSpecificationsModal && currentVariantIndex !== null && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
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
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div 
              className="bg-white rounded-2xl w-full max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl shadow-2xl overflow-hidden relative pointer-events-auto max-h-[90vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="variant-specifications-modal-title"
            >
            {/* Close Button - Absolute */}
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

            {/* Header */}
            <div className="p-6 sm:p-7 md:p-8 text-center transition-all duration-500 bg-gradient-to-br from-purple-50 to-purple-100 flex-shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg transition-all duration-500 bg-purple-600">
                <Layers className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 id="variant-specifications-modal-title" className="text-xl sm:text-2xl font-bold text-gray-900">
                Variant Specifications
              </h3>
              <p className="text-purple-700 text-xs sm:text-sm mt-1.5 sm:mt-2">
                {variants[currentVariantIndex]?.name || `Variant ${currentVariantIndex + 1}`}
              </p>
            </div>

            {/* Category Tabs - Responsive Grid */}
            <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
                {specificationCategories.map((category) => {
                  const IconComponent = category.icon;
                  const isSelected = selectedSpecCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedSpecCategory(category.id);
                        setVariantSpecStep(0); // Reset to first step when changing category
                      }}
                      className={`flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-lg scale-105'
                          : 'bg-white text-gray-700 hover:bg-purple-50 hover:shadow-md border border-gray-200'
                      }`}
                    >
                      <IconComponent size={20} className={`sm:w-6 sm:h-6 ${isSelected ? 'text-white' : 'text-purple-600'}`} />
                      <span className="text-[10px] sm:text-xs font-bold text-center leading-tight">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 md:p-6 overflow-y-auto bg-white flex-1 min-h-0">
              {/* Progress Indicator */}
              <div className="mb-4 sm:mb-5 md:mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Step {variantSpecStep + 1} of {Object.keys(getSpecificationsByType(selectedSpecCategory)).length + 1}
                  </span>
                  <span className="text-xs text-gray-600">
                    {variants[currentVariantIndex]?.attributes && Object.keys(variants[currentVariantIndex].attributes).length > 0 
                      ? `${Object.keys(variants[currentVariantIndex].attributes).length} spec${Object.keys(variants[currentVariantIndex].attributes).length !== 1 ? 's' : ''} added`
                      : 'No specs yet'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((variantSpecStep + 1) / (Object.keys(getSpecificationsByType(selectedSpecCategory)).length + 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-5">
                {(() => {
                  const specTypes = Object.entries(getSpecificationsByType(selectedSpecCategory));
                  
                  // Last step is custom specifications
                  if (variantSpecStep >= specTypes.length) {
                    return (
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2 text-center">
                          Custom Specifications
                        </h4>
                        <p className="text-sm text-gray-600 mb-6 text-center">
                          Add your own custom specification fields
                        </p>
                        
                        {/* Custom Specification Input - Name and Value */}
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 sm:p-5 md:p-6 border-2 border-purple-300">
                          <div className="flex flex-col gap-3 sm:gap-4">
                            <label className="text-sm sm:text-base font-semibold text-purple-900 text-center">
                              Create Your Own Specification
                            </label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2">
                                  Specification Name *
                                </label>
                                <input
                                  type="text"
                                  value={customAttributeInput}
                                  onChange={(e) => setCustomAttributeInput(e.target.value)}
                                  placeholder="e.g., Brand, Warranty, Color"
                                  className="w-full py-3 px-4 border-2 border-purple-400 rounded-lg focus:border-purple-600 focus:outline-none text-sm focus:ring-2 focus:ring-purple-200"
                                  autoFocus
                                  autoComplete="off"
                                  autoCorrect="off"
                                  spellCheck={false}
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2">
                                  Value
                                </label>
                                <input
                                  type="text"
                                  value={customAttributeValue}
                                  onChange={(e) => setCustomAttributeValue(e.target.value)}
                                  placeholder="e.g., Apple, 2 years, Black"
                                  className="w-full py-3 px-4 border-2 border-purple-400 rounded-lg focus:border-purple-600 focus:outline-none text-sm focus:ring-2 focus:ring-purple-200"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && customAttributeInput.trim()) {
                                      handleCustomAttributeSubmit(currentVariantIndex);
                                    }
                                  }}
                                  autoComplete="off"
                                  autoCorrect="off"
                                  spellCheck={false}
                                />
                              </div>
                            </div>
                            
                            <button 
                              type="button" 
                              onClick={() => {
                                if (currentVariantIndex !== null && customAttributeInput.trim()) {
                                  handleCustomAttributeSubmit(currentVariantIndex);
                                }
                              }} 
                              disabled={!customAttributeInput.trim()}
                              className="w-full py-3.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            >
                              ➕ Add Custom Specification
                            </button>
                            
                            <p className="text-xs text-purple-700 text-center">
                              Add as many custom specifications as you need
                            </p>
                          </div>
                        </div>
                        
                        {/* Show added custom specs - Read-only display */}
                        {(() => {
                          const customAttrs = variants[currentVariantIndex]?.attributes || {};
                          const allSpecKeys = new Set<string>();
                          
                          // Collect all predefined spec keys
                          Object.entries(getSpecificationsByType(selectedSpecCategory)).forEach(([_, specs]) => {
                            specs.forEach(spec => allSpecKeys.add(spec.key));
                          });
                          
                          // Filter to show only custom attributes (not predefined ones)
                          const customSpecs = Object.entries(customAttrs).filter(([key]) => !allSpecKeys.has(key));
                          
                          if (customSpecs.length > 0) {
                            return (
                              <div className="mt-4 sm:mt-5 md:mt-6">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 text-center">
                                  Your Custom Specs <span className="text-purple-600">({customSpecs.length})</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                                  {customSpecs.map(([key, value]) => (
                                    <div key={key} className="bg-white border-2 border-purple-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1">
                                          <div className="text-xs font-bold text-purple-900 uppercase tracking-wide mb-1">
                                            {key.replace(/_/g, ' ')}
                                          </div>
                                          <div className="text-sm text-gray-800 font-medium">
                                            {String(value) || <span className="text-gray-400 italic">Not set</span>}
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeAttributeFromVariant(currentVariantIndex, key)}
                                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0 transition-colors"
                                          title="Remove specification"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    );
                  }
                  
                  // Show current step's specifications
                  const [currentType, currentSpecs] = specTypes[variantSpecStep];
                  if (!currentSpecs || currentSpecs.length === 0) return null;
                  
                  return (
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2 text-center">
                        {getTypeDisplayName(currentType)}
                      </h4>
                      <p className="text-sm text-gray-600 mb-6 text-center">
                        {currentSpecs.length} specification{currentSpecs.length !== 1 ? 's' : ''} available
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {currentSpecs.map((spec) => {
                          const IconComponent = spec.icon;
                          const currentValue = variants[currentVariantIndex]?.attributes?.[spec.key] || '';
                          const isBoolean = spec.type === 'boolean';
                          const hasValue = currentValue !== '' && currentValue !== null && currentValue !== undefined;
                            
                            return (
                              <div 
                                key={spec.key} 
                                className={`bg-white border-2 rounded-xl p-3 sm:p-4 transition-all ${
                                  hasValue 
                                    ? 'border-green-300 bg-green-50 shadow-md' 
                                    : 'border-gray-200 hover:border-purple-400 hover:shadow-lg'
                                }`}
                              >
                                <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2">
                                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center ${
                                    hasValue ? 'bg-green-500' : 'bg-gray-200'
                                  }`}>
                                    <IconComponent size={13} className={`sm:w-3.5 sm:h-3.5 ${hasValue ? 'text-white' : 'text-gray-500'}`} />
                                  </div>
                                  <div className="flex-1">
                                    <div>{spec.name}</div>
                                    {spec.unit && <span className="text-[9px] sm:text-[10px] text-gray-500 font-normal">({spec.unit})</span>}
                                  </div>
                                </label>
                                
                                {isBoolean ? (
                                  <button
                                    type="button"
                                    onClick={() => updateVariantSpecification(currentVariantIndex, spec.key, !currentValue)}
                                    className={`w-full py-2.5 sm:py-3 px-3 sm:px-4 border-2 rounded-lg transition-all font-bold text-xs sm:text-sm ${
                                      currentValue
                                        ? 'bg-green-500 border-green-500 text-white shadow-lg'
                                        : 'bg-white border-gray-300 text-gray-600 hover:border-purple-500 hover:bg-purple-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                      <Check size={14} className={`sm:w-4 sm:h-4 ${currentValue ? 'text-white' : 'text-gray-400'}`} />
                                      <span>{currentValue ? 'Yes' : 'No'}</span>
                                    </div>
                                  </button>
                                ) : spec.type === 'select' && spec.options ? (
                                  <select
                                    value={currentValue as string}
                                    onChange={(e) => updateVariantSpecification(currentVariantIndex, spec.key, e.target.value)}
                                    className="w-full py-2.5 sm:py-3 px-2.5 sm:px-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-xs sm:text-sm transition-colors bg-white"
                                  >
                                    <option value="">Select...</option>
                                    {spec.options.map((option) => (
                                      <option key={option} value={option}>{option}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="relative">
                                    <input
                                      type={spec.type === 'number' ? 'number' : 'text'}
                                      value={currentValue as string}
                                      onChange={(e) => updateVariantSpecification(currentVariantIndex, spec.key, e.target.value)}
                                      placeholder={spec.placeholder || `Enter ${spec.name.toLowerCase()}`}
                                      className="w-full py-2.5 sm:py-3 px-2.5 sm:px-3 pr-9 sm:pr-10 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-xs sm:text-sm transition-colors"
                                      autoComplete="off"
                                      autoCorrect="off"
                                      spellCheck={false}
                                    />
                                    {currentValue && (
                                      <button
                                        type="button"
                                        onClick={() => updateVariantSpecification(currentVariantIndex, spec.key, '')}
                                        className="absolute right-1.5 sm:right-2 top-2.5 sm:top-3 text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                                        title="Clear"
                                      >
                                        <X size={14} className="sm:w-4 sm:h-4" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                {/* All Added Specifications Summary - Show top 3, rest on toggle */}
                {(() => {
                  const allAttrs = variants[currentVariantIndex]?.attributes || {};
                  const allEntries = Object.entries(allAttrs).reverse(); // Latest first
                  const totalCount = allEntries.length;
                  
                  if (totalCount > 0) {
                    const displayedSpecs = showAllVariantSpecs ? allEntries : allEntries.slice(0, 3);
                    const hasMore = totalCount > 3;
                    
                    return (
                      <div className="border-t border-gray-100 pt-5 mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            Added Specs <span className="text-green-600">({totalCount})</span>
                          </div>
                          {hasMore && (
                            <button
                              type="button"
                              onClick={() => setShowAllVariantSpecs(!showAllVariantSpecs)}
                              className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                            >
                              {showAllVariantSpecs ? '↑ Show Less' : `↓ Show All (${totalCount - 3} more)`}
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                          {displayedSpecs.map(([key, value]) => (
                            <div 
                              key={key} 
                              className="bg-white border-2 border-green-200 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="text-xs font-bold text-green-900 uppercase tracking-wide mb-1">
                                    {key.replace(/_/g, ' ')}
                                  </div>
                                  <div className="text-sm text-gray-800 font-medium">
                                    {String(value) || <span className="text-gray-400 italic">Not set</span>}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAttributeFromVariant(currentVariantIndex, key)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0 transition-colors"
                                  title="Remove specification"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Footer - Navigation Buttons */}
            <div className="p-4 sm:p-5 md:p-6 pt-3 sm:pt-4">
              {(() => {
                const specTypes = Object.entries(getSpecificationsByType(selectedSpecCategory));
                const totalSteps = specTypes.length + 1; // +1 for custom step
                const isLastStep = variantSpecStep >= totalSteps - 1;
                const isFirstStep = variantSpecStep === 0;
                
                return (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!isFirstStep && (
                      <button
                        type="button"
                        onClick={() => setVariantSpecStep(variantSpecStep - 1)}
                        className="flex-1 px-4 sm:px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold text-sm sm:text-base"
                      >
                        ← Previous
                      </button>
                    )}
                    
                    {isLastStep ? (
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
                        className={`px-4 sm:px-6 py-3 sm:py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl text-base sm:text-lg ${isFirstStep ? 'w-full' : 'flex-1'}`}
                      >
                        Done ✓
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setVariantSpecStep(variantSpecStep + 1)}
                        className={`px-4 sm:px-6 py-3 sm:py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl text-base sm:text-lg ${isFirstStep ? 'w-full' : 'flex-1'}`}
                      >
                        Next →
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        </>
      )}

      {/* Product Specifications Modal - Clean Design */}
      {showProductSpecificationsModal && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowProductSpecificationsModal(false)}
          />
          
          {/* Modal Container */}
          <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-specifications-modal-title"
            >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 id="product-specifications-modal-title" className="text-2xl font-bold">
                      Product Specifications
                    </h2>
                    <p className="text-blue-100 text-sm">
                      Add technical details and features
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProductSpecificationsModal(false)}
                  className="w-10 h-10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Category Tabs - Responsive Grid */}
            <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
                {specificationCategories.map((category) => {
                  const IconComponent = category.icon;
                  const isSelected = selectedProductSpecCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedProductSpecCategory(category.id)}
                      className={`flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-lg scale-105'
                          : 'bg-white text-gray-700 hover:bg-blue-50 hover:shadow-md border border-gray-200'
                      }`}
                    >
                      <IconComponent size={20} className={`sm:w-6 sm:h-6 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                      <span className="text-[10px] sm:text-xs font-bold text-center leading-tight">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto bg-white flex-1 min-h-0">
              <div className="space-y-6">
                {/* Active Count Badge */}
                {(() => {
                  const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
                  const activeCount = Object.keys(currentSpecs).length;
                  
                  if (activeCount > 0) {
                    return (
                      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                            <Check size={20} className="text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-green-900">
                              {activeCount} Specification{activeCount !== 1 ? 's' : ''} Added
                            </h3>
                            <p className="text-xs text-green-600">
                              Click any spec below to modify
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Clear all specifications?')) {
                              setFormData(prev => ({ ...prev, specification: '' }));
                              toast.success('All specifications cleared');
                            }
                          }}
                          className="px-3 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                    );
                  }
                })()}

                {/* Specifications Grid */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Layers size={18} className="text-blue-600" />
                      {specificationCategories.find(cat => cat.id === selectedProductSpecCategory)?.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Click on any specification to add or modify</p>
                  </div>
                  
                  {Object.entries(getSpecificationsByType(selectedProductSpecCategory)).map(([type, specs]) => {
                    if (specs.length === 0) return null;
                    
                    return (
                      <div key={type} className="mb-6">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                          <span className="text-sm font-semibold text-gray-700">
                            {getTypeDisplayName(type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({specs.length})
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {specs.map((spec) => {
                            const IconComponent = spec.icon;
                            const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
                            const currentValue = currentSpecs[spec.key] || '';
                            const isBoolean = spec.type === 'boolean';
                            const hasValue = currentValue !== '' && currentValue !== null && currentValue !== undefined;
                            
                            return (
                              <div 
                                key={spec.key} 
                                className={`bg-white border rounded-lg p-4 transition-all ${
                                  hasValue 
                                    ? 'border-green-400 bg-green-50' 
                                    : 'border-gray-200 hover:border-blue-400'
                                }`}
                              >
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                  <IconComponent size={14} className={hasValue ? 'text-green-600' : 'text-gray-400'} />
                                  <span>{spec.name}</span>
                                  {spec.unit && <span className="text-xs text-gray-500">({spec.unit})</span>}
                                </label>
                                
                                {isBoolean ? (
                                  <button
                                    type="button"
                                    onClick={() => updateProductSpecification(spec.key, !currentValue)}
                                    className={`w-full py-2.5 px-4 border-2 rounded-lg transition-all font-medium text-sm ${
                                      currentValue
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : 'bg-white border-gray-300 text-gray-600 hover:border-blue-500 hover:bg-blue-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <Check size={16} className={currentValue ? 'text-white' : 'text-gray-400'} />
                                      <span>{currentValue ? 'Yes' : 'No'}</span>
                                    </div>
                                  </button>
                                ) : spec.type === 'select' && spec.options ? (
                                  <select
                                    value={currentValue as string}
                                    onChange={(e) => updateProductSpecification(spec.key, e.target.value)}
                                    className="w-full py-2.5 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm transition-colors"
                                  >
                                    <option value="">Select...</option>
                                    {spec.options.map((option) => (
                                      <option key={option} value={option}>{option}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="relative">
                                    <input
                                      type={spec.type === 'number' ? 'number' : 'text'}
                                      value={currentValue as string}
                                      onChange={(e) => updateProductSpecification(spec.key, e.target.value)}
                                      placeholder={spec.placeholder || `Enter ${spec.name.toLowerCase()}`}
                                      className="w-full py-2.5 px-3 pr-10 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm transition-colors"
                                      autoComplete="off"
                                      autoCorrect="off"
                                      spellCheck={false}
                                    />
                                    {currentValue && (
                                      <button
                                        type="button"
                                        onClick={() => updateProductSpecification(spec.key, '')}
                                        className="absolute right-2 top-2.5 text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                                        title="Clear"
                                      >
                                        <X size={16} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Specification */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Plus size={18} className="text-gray-600" />
                    Custom Specification
                  </h3>
                  
                  {showProductCustomInput ? (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={productCustomAttributeInput}
                          onChange={(e) => setProductCustomAttributeInput(e.target.value)}
                          placeholder="Enter custom specification name..."
                          className="flex-1 py-2.5 px-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && productCustomAttributeInput.trim()) {
                              handleProductCustomAttributeSubmit();
                            }
                          }}
                          autoFocus
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                        <button 
                          type="button" 
                          onClick={handleProductCustomAttributeSubmit} 
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Add
                        </button>
                        <button 
                          type="button" 
                          onClick={cancelProductCustomAttribute} 
                          className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => { setShowProductCustomInput(true); setProductCustomAttributeInput(''); }} 
                      className="flex items-center justify-center gap-2 p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all w-full"
                    >
                      <Plus className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">Add Custom Specification</span>
                    </button>
                  )}
                </div>

                {/* Current Specifications Summary */}
                {(() => {
                  const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
                  const hasSpecs = Object.keys(currentSpecs).length > 0;
                  
                  return hasSpecs ? (
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Check size={18} className="text-green-600" />
                        Added Specifications ({Object.keys(currentSpecs).length})
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(currentSpecs).map(([key, value]) => (
                          <div 
                            key={key} 
                            className="bg-green-50 border border-green-200 rounded-lg p-3 hover:bg-green-100 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-green-900 capitalize truncate">
                                  {key.replace(/_/g, ' ')}
                                </div>
                                <div className="text-sm text-green-700 truncate mt-0.5">
                                  {String(value) || 'Not set'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttributeFromProduct(key)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded flex-shrink-0 transition-colors"
                                title="Remove"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-600">
                  {(() => {
                    const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
                    const count = Object.keys(currentSpecs).length;
                    return count > 0 
                      ? `${count} specification${count !== 1 ? 's' : ''} added`
                      : 'No specifications added yet';
                  })()}
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowProductSpecificationsModal(false)}
                    className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductSpecificationsModal(false);
                      toast.success('Specifications saved!');
                    }}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Save & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Success Modal */}
      <SuccessModal {...successModal.props} />
      
      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          isOpen={showProductModal}
          onClose={() => {
            setShowProductModal(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          onEdit={(product) => {
            setShowProductModal(false);
            navigate(`/lats/products/${product.id}/edit`);
          }}
        />
      )}
    </div>
  );
};

export default AddProductPageOptimized;
