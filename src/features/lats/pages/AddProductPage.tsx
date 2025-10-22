import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import { BackButton } from '../../shared/components/ui/BackButton';
import { toast } from 'react-hot-toast';
import { Save, ArrowLeft, MapPin, Store, X, Plus, Check, Layers, Palette, HardDrive, Zap, Cpu, Monitor, Battery, Camera, Ruler, FileText, Clock, Hand, Unplug, RotateCcw, Lightbulb, Fingerprint, ScanFace, Droplets, Wind, BatteryCharging, FastForward, PhoneCall, Expand, Radio, Navigation, Headphones, PenTool, Shield, Lock, Vibrate, Usb, Cable, Speaker, Mic } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { useBranch } from '../../../context/BranchContext';
import { retryWithBackoff } from '../../../lib/supabaseClient';

import { getActiveCategories, Category } from '../../../lib/categoryApi';
import { specificationCategories, getSpecificationsByCategory, getSpecificationsByType, getTypeDisplayName, SpecificationItem } from '../../../data/specificationCategories';

import { StoreLocation } from '../../settings/types/storeLocation';
import { storeLocationApi } from '../../settings/utils/storeLocationApi';
import { generateSKU } from '../lib/skuUtils';
import { duplicateProduct, generateProductReport, exportProductData } from '../lib/productUtils';
// ⚠️ DISABLED: Automatic default variant creation
// import { validateAndCreateDefaultVariant } from '../lib/variantUtils';
import { useInventoryStore } from '../stores/useInventoryStore';
import { productCacheService } from '../../../lib/productCacheService';

// Extracted components
import ProductInformationForm from '../components/product/ProductInformationForm';
import ProductVariantsSection from '../components/product/ProductVariantsSection';
import StorageLocationForm from '../components/product/StorageLocationForm';
import { useSuccessModal } from '../../../hooks/useSuccessModal';
import SuccessModal from '../../../components/ui/SuccessModal';

// Import ProductVariant type
interface ProductVariant {
  name: string;
  sku: string;
  costPrice: number;
  price: number;
  stockQuantity: number;
  minStockLevel: number;
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
  
  price: z.number().min(0, 'Price must be 0 or greater'),
  costPrice: z.number().min(0, 'Cost price must be 0 or greater'),
  stockQuantity: z.number().min(0, 'Stock quantity must be 0 or greater'),
  minStockLevel: z.number().min(0, 'Minimum stock level must be 0 or greater'),

  // Storage location fields
  storageRoomId: z.string().optional(),
  shelfId: z.string().optional(),

  metadata: z.record(z.string(), z.any()).optional().default({}),
  variants: z.array(z.any()).optional().default([])
});

const AddProductPageOptimized: React.FC = () => {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const { loadProducts } = useInventoryStore();
  const [categories, setCategories] = useState<Category[]>([]);

  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
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
    price: 0,
    costPrice: 0,
    stockQuantity: 0,
    minStockLevel: 2, // Set default min stock level to 2 pcs
    storageRoomId: '',
    shelfId: '',
    metadata: {},
    variants: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Variants state - Always enabled by default with one initial variant
  const [variants, setVariants] = useState<ProductVariant[]>([
    {
      name: 'Variant 1',
      sku: '',
      costPrice: 0,
      price: 0,
      stockQuantity: 0,
      minStockLevel: 2,
      attributes: {}
    }
  ]);
  const [showVariants, setShowVariants] = useState(true);
  const [useVariants, setUseVariants] = useState(true);
  const [isReorderingVariants, setIsReorderingVariants] = useState(false);
  const [draggedVariantIndex, setDraggedVariantIndex] = useState<number | null>(null);

  // Variant specifications modal state
  const [showVariantSpecificationsModal, setShowVariantSpecificationsModal] = useState(false);
  const [currentVariantIndex, setCurrentVariantIndex] = useState<number | null>(null);
  const [showCustomInput, setShowCustomInput] = useState<number | null>(null);
  const [customAttributeInput, setCustomAttributeInput] = useState('');
  const [selectedSpecCategory, setSelectedSpecCategory] = useState<string>('laptop');

  // Product specifications modal state
  const [showProductSpecificationsModal, setShowProductSpecificationsModal] = useState(false);
  const [showProductCustomInput, setShowProductCustomInput] = useState(false);
  const [productCustomAttributeInput, setProductCustomAttributeInput] = useState('');
  const [selectedProductSpecCategory, setSelectedProductSpecCategory] = useState<string>('laptop');

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showProductSpecificationsModal || showVariantSpecificationsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showProductSpecificationsModal, showVariantSpecificationsModal]);

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
  const [createdProductId, setCreatedProductId] = useState<string>('');
  const [createdProductName, setCreatedProductName] = useState<string>('');

  const { currentUser } = useAuth();

  // Handle variants toggle - kept for compatibility but variants are always enabled
  const handleUseVariantsToggle = (enabled: boolean) => {
    // Variants are always enabled in the new design
    // This function is kept for compatibility with child components
    return;
  };

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
        setFormData(parsed.formData);
        setVariants(parsed.variants || [{
          name: 'Variant 1',
          sku: `${parsed.formData?.sku || ''}-V01`,
          costPrice: 0,
          price: 0,
          stockQuantity: 0,
          minStockLevel: 2,
          attributes: {}
        }]);
        // Always keep variants enabled in the new design
        setUseVariants(true);
        setShowVariants(true);
        setLastDraftSave(new Date(parsed.savedAt));
        // toast.success('Draft restored successfully!'); // Disabled popup notification
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
        const [categoriesData, locationsData] = await Promise.all([
          getActiveCategories(),
          storeLocationApi.getAll()
        ]);

        setCategories(categoriesData || []);
        setStoreLocations(locationsData || []);

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
        .ilike('name', `%${name.trim()}%`)
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
      // Create a dynamic schema based on whether variants are used
      const dynamicSchema = useVariants 
        ? productFormSchema.omit({ 
            price: true, 
            costPrice: true, 
            stockQuantity: true, 
            minStockLevel: true,
            specification: true
          })
        : productFormSchema;

      dynamicSchema.parse({
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
            if (variant.price < 0) {
              errors[`variant_${index}_price`] = 'Variant price must be 0 or greater';
            }
            if (variant.costPrice < 0) {
              errors[`variant_${index}_costPrice`] = 'Variant cost price must be 0 or greater';
            }
            if (variant.stockQuantity < 0) {
              errors[`variant_${index}_stockQuantity`] = 'Variant stock quantity must be 0 or greater';
            }
            if (variant.minStockLevel < 0) {
              errors[`variant_${index}_minStockLevel`] = 'Variant min stock level must be 0 or greater';
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
    setHasSubmitted(true);
    
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
      // Calculate total quantity and value
      const totalQuantity = useVariants && variants.length > 0 
        ? variants.reduce((sum, variant) => sum + (variant.stockQuantity || 0), 0)
        : (formData.stockQuantity || 0);
      
      const totalValue = useVariants && variants.length > 0
        ? variants.reduce((sum, variant) => sum + ((variant.stockQuantity || 0) * (variant.price || 0)), 0)
        : ((formData.stockQuantity || 0) * (formData.price || 0));

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

      const productData = {
        name: formData.name,
        description: formData.description || null,
        // Don't set SKU, prices, stock in main product when using variants
        sku: finalSku,
        category_id: formData.categoryId || null,
        branch_id: currentBranch?.id || null,

        // Only set these fields if NOT using variants
        cost_price: useVariants ? 0 : (formData.costPrice || 0),
        selling_price: useVariants ? 0 : (formData.price || 0),
        stock_quantity: useVariants ? 0 : (formData.stockQuantity || 0),
        min_stock_level: useVariants ? 0 : (formData.minStockLevel || 0),
        total_quantity: totalQuantity,
        total_value: totalValue,
        storage_room_id: formData.storageRoomId || null,
        shelf_id: formData.shelfId || null,
        // Don't send empty array - it causes "cannot determine type" error in PostgreSQL
        // tags: [],
        attributes: productAttributes,
        metadata: {
          useVariants: useVariants,
          variantCount: useVariants ? variants.length : 0,
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
        hasError: !!error,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint,
        errorCode: error?.code
      });

      // Check if we have an error (even if not thrown)
      if (error) {
        console.error('❌ Product creation failed with error:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));
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
        
        toast.error('Product creation failed - database returned no data. Check console for details.');
        return;
      }

      console.log('✅ Product created successfully:', createdProduct);

      // Create variants - either the user-defined variants or a default variant
      if (createdProduct) {
        let variantsToCreate = [];
        
        if (useVariants && variants.length > 0) {
          // Create user-defined variants
          console.log('Creating user-defined variants for product:', createdProduct.id);
          
          variantsToCreate = variants.map((variant, index) => ({
            product_id: createdProduct.id,
            sku: variant.sku || `${formData.sku}-V${index + 1}`,
            name: variant.name,
            cost_price: variant.costPrice,
            selling_price: variant.price,
            quantity: variant.stockQuantity,
            min_quantity: variant.minStockLevel,
            attributes: {
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
      
      setCreatedProductId(createdProduct.id);
      setCreatedProductName(formData.name);
      
      // Clear draft after successful submission
      clearDraft();
      
      // 🔄 Clear cache and reload products to show the newly created product
      console.log('🔄 Clearing product cache and reloading...');
      productCacheService.clearProducts();
      await loadProducts(null, true); // Force reload, bypass cache
      console.log('✅ Products reloaded successfully');
      
      // Show success modal with action buttons
      successModal.show(`Product "${formData.name}" has been created successfully!`, {
        title: 'Product Created',
        actionButtons: [
          {
            label: 'View Product',
            onClick: () => {
              productCacheService.clearProducts();
              loadProducts(null, true);
              navigate(`/lats/products/${createdProductId}`);
            },
            variant: 'primary'
          },
          {
            label: 'Edit Product',
            onClick: () => navigate(`/lats/products/${createdProductId}/edit`),
            variant: 'secondary'
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
                price: 0,
                costPrice: 0,
                stockQuantity: 0,
                minStockLevel: 2,
                storageRoomId: '',
                shelfId: '',
                metadata: {},
                variants: [],
              });
              setVariants([]);
              setShowPreview(false);
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
      addAttributeToVariant(variantIndex, cleanName);
      setShowCustomInput(null);
      setCustomAttributeInput('');
    }
  };

  // Cancel custom attribute input
  const cancelCustomAttribute = () => {
    setShowCustomInput(null);
    setCustomAttributeInput('');
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

  // Toggle feature specification (Yes/No)
  const toggleFeatureSpecification = (featureKey: string) => {
    const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
    const currentValue = currentSpecs[featureKey];
    const isEnabled = currentValue === 'Yes' || currentValue === 'true' || currentValue === true;
    
    const newValue = isEnabled ? 'No' : 'Yes';
    const newSpecs = { ...currentSpecs, [featureKey]: newValue };
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
    <div className="p-2 sm:p-4 h-full overflow-y-auto pt-4">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Header */}
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

        <GlassCard className="mb-3">
          <div className="space-y-4">
            {/* Product Information Form */}
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

            {/* Product Variants Section - Always visible */}
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

            {/* Storage Location Form */}
            <StorageLocationForm
              formData={formData}
              setFormData={setFormData}
              currentErrors={currentErrors}
            />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <GlassButton
                onClick={() => navigate('/lats/unified-inventory')}
                variant="secondary"
                icon={<ArrowLeft size={16} />}
                className="flex-1 sm:flex-none text-sm py-2"
              >
                Cancel
              </GlassButton>
              
              <div className="flex-1" />
              
              <GlassButton
                onClick={handleSubmit}
                loading={isSubmitting}
                icon={<Save size={16} />}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white flex-1 sm:flex-none text-sm py-2"
                disabled={isSubmitting || isCheckingName}
              >
                {isSubmitting ? 'Creating...' : 'Create Product'}
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>

            {/* Variant Specifications Modal */}
      {showVariantSpecificationsModal && currentVariantIndex !== null && (
        <div 
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-2"
          role="dialog"
          aria-modal="true"
          aria-labelledby="variant-specifications-modal-title"
        >
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[85vh] overflow-hidden mx-auto">
            {/* Header */}
            <div className="bg-blue-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  <div>
                    <h2 id="variant-specifications-modal-title" className="text-lg font-semibold">
                      Variant Specs
                    </h2>
                    <p className="text-blue-100 text-xs">
                      {variants[currentVariantIndex]?.name || `Variant ${currentVariantIndex + 1}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVariantSpecificationsModal(false)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <div className="flex gap-1 overflow-x-auto">
                {specificationCategories.map((category) => {
                  const IconComponent = category.icon;
                  const isSelected = selectedSpecCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedSpecCategory(category.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        isSelected
                          ? `bg-${category.color}-500 text-white`
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <IconComponent size={14} />
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-140px)]">
              <div className="space-y-4">
                {/* Specifications Grid - Grouped by Type */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Plus size={16} className="text-blue-600" />
                    {specificationCategories.find(cat => cat.id === selectedSpecCategory)?.name}
                  </h3>
                  
                  {Object.entries(getSpecificationsByType(selectedSpecCategory)).map(([type, specs]) => {
                    if (specs.length === 0) return null;
                    
                    return (
                      <div key={type} className="mb-4">
                        <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {getTypeDisplayName(type)}
                          </span>
                          <span className="text-xs text-gray-500">({specs.length})</span>
                        </h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {specs.map((spec) => {
                            const IconComponent = spec.icon;
                            const currentValue = variants[currentVariantIndex]?.attributes?.[spec.key] || '';
                            const isBoolean = spec.type === 'boolean';
                            
                            return (
                              <div key={spec.key} className="bg-white border border-gray-200 rounded-lg p-3">
                                <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                                  <IconComponent size={12} className="text-gray-500" />
                                  {spec.name}
                                  {spec.unit && <span className="text-xs text-gray-500">({spec.unit})</span>}
                                </label>
                                
                                {isBoolean ? (
                                  <button
                                    type="button"
                                    onClick={() => updateVariantSpecification(currentVariantIndex, spec.key, !currentValue)}
                                    className={`w-full p-2 border rounded-lg transition-colors ${
                                      currentValue
                                        ? 'bg-green-50 border-green-300 text-green-800'
                                        : 'bg-white border-gray-300 text-gray-600 hover:border-blue-500 hover:bg-blue-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-center">
                                      <Check size={14} className={currentValue ? 'text-green-600' : 'text-gray-400'} />
                                    </div>
                                  </button>
                                ) : spec.type === 'select' && spec.options ? (
                                  <select
                                    value={currentValue as string}
                                    onChange={(e) => updateVariantSpecification(currentVariantIndex, spec.key, e.target.value)}
                                    className="w-full py-1.5 px-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-xs"
                                  >
                                    <option value="">Select</option>
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
                                      className="w-full py-1.5 px-2 pr-6 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-xs"
                                      autoComplete="off"
                                      autoCorrect="off"
                                      spellCheck={false}
                                    />
                                    {currentValue && (
                                      <button
                                        type="button"
                                        onClick={() => updateVariantSpecification(currentVariantIndex, spec.key, '')}
                                        className="absolute right-1 top-1.5 text-red-500 hover:text-red-700"
                                        title="Clear value"
                                      >
                                        <X size={12} />
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
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Plus size={16} className="text-gray-600" />
                    Custom
                  </h3>
                  
                  {showCustomInput === currentVariantIndex ? (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customAttributeInput}
                          onChange={(e) => setCustomAttributeInput(e.target.value)}
                          placeholder="Enter custom spec name..."
                          className="flex-1 py-1.5 px-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-xs"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && customAttributeInput.trim()) {
                              handleCustomAttributeSubmit(currentVariantIndex);
                            }
                          }}
                          autoFocus
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                        <button 
                          type="button" 
                          onClick={() => handleCustomAttributeSubmit(currentVariantIndex)} 
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          Add
                        </button>
                        <button 
                          type="button" 
                          onClick={cancelCustomAttribute} 
                          className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => { setShowCustomInput(currentVariantIndex); setCustomAttributeInput(''); }} 
                      className="flex items-center gap-2 p-2 bg-white border border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors w-full"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Add Custom</span>
                    </button>
                  )}
                </div>

                {/* Current Specifications Summary */}
                {variants[currentVariantIndex]?.attributes && Object.keys(variants[currentVariantIndex].attributes).length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Check size={16} className="text-green-600" />
                      Current
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        {Object.keys(variants[currentVariantIndex].attributes).length}
                      </span>
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {Object.entries(variants[currentVariantIndex].attributes).map(([key, value]) => (
                        <div key={key} className="bg-green-50 border border-green-200 rounded-lg p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-green-800 capitalize truncate">
                                {key.replace(/_/g, ' ')}
                              </div>
                              <div className="text-xs text-green-600 truncate">
                                {String(value) || 'Not set'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttributeFromVariant(currentVariantIndex, key)}
                              className="ml-1 text-red-500 hover:text-red-700 flex-shrink-0"
                              title="Remove specification"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-600">
                  {variants[currentVariantIndex]?.attributes && Object.keys(variants[currentVariantIndex].attributes).length > 0 
                    ? `${Object.keys(variants[currentVariantIndex].attributes).length} spec${Object.keys(variants[currentVariantIndex].attributes).length !== 1 ? 's' : ''} added`
                    : 'No specs added yet'
                  }
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVariantSpecificationsModal(false)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowVariantSpecificationsModal(false);
                      toast.success('Variant specifications saved successfully!');
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Specifications Modal - Flat Design */}
      {showProductSpecificationsModal && (
        <div 
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-specifications-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowProductSpecificationsModal(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden mx-auto flex flex-col">
            {/* Flat Header */}
            <div className="bg-blue-600 p-5 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-700 rounded-xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 id="product-specifications-modal-title" className="text-xl font-bold">
                      Product Specifications
                    </h2>
                    <p className="text-blue-100 text-sm mt-0.5">
                      Define technical details and features
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProductSpecificationsModal(false)}
                  className="p-2 hover:bg-blue-700 rounded-xl transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Flat Category Tabs */}
            <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex-shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Categories</span>
                <div className="h-px flex-1 bg-gray-200"></div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {specificationCategories.map((category) => {
                  const IconComponent = category.icon;
                  const isSelected = selectedProductSpecCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedProductSpecCategory(category.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <IconComponent size={16} />
                      <span>{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content - Flat Design */}
            <div className="p-5 overflow-y-auto bg-white flex-1 min-h-0">
              <div className="space-y-6">
                {/* Active Specifications Badge */}
                {(() => {
                  const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
                  const activeCount = Object.keys(currentSpecs).length;
                  
                  if (activeCount > 0) {
                    return (
                      <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-500 rounded-lg">
                            <Check size={20} className="text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-green-900">
                              {activeCount} Specification{activeCount !== 1 ? 's' : ''} Active
                            </h3>
                            <p className="text-xs text-green-700 mt-0.5">
                              Specifications have been configured for this product
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('Clear all specifications?')) {
                              setFormData(prev => ({ ...prev, specification: '' }));
                              toast.success('All specifications cleared');
                            }
                          }}
                          className="px-3 py-1.5 bg-white border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                    );
                  }
                })()}

                {/* Specifications Grid - Flat Design */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Layers size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        {specificationCategories.find(cat => cat.id === selectedProductSpecCategory)?.name}
                      </h3>
                      <p className="text-xs text-gray-600">Select and configure specifications</p>
                    </div>
                  </div>
                  
                  {Object.entries(getSpecificationsByType(selectedProductSpecCategory)).map(([type, specs]) => {
                    if (specs.length === 0) return null;
                    
                    return (
                      <div key={type} className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg">
                            <span className="text-xs font-bold text-gray-700">
                              {getTypeDisplayName(type)}
                            </span>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {specs.length}
                          </span>
                          <div className="h-px flex-1 bg-gray-200"></div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {specs.map((spec) => {
                            const IconComponent = spec.icon;
                            const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
                            const currentValue = currentSpecs[spec.key] || '';
                            const isBoolean = spec.type === 'boolean';
                            const hasValue = currentValue !== '' && currentValue !== null && currentValue !== undefined;
                            
                            return (
                              <div 
                                key={spec.key} 
                                className={`group bg-white border-2 rounded-xl p-4 transition-all ${
                                  hasValue 
                                    ? 'border-green-300 bg-green-50' 
                                    : 'border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                  <IconComponent size={16} className={hasValue ? 'text-green-600' : 'text-gray-500'} />
                                  <span className="flex-1">{spec.name}</span>
                                  {spec.unit && <span className="text-xs text-gray-500 font-normal">({spec.unit})</span>}
                                </label>
                                
                                {isBoolean ? (
                                  <button
                                    type="button"
                                    onClick={() => updateProductSpecification(spec.key, !currentValue)}
                                    className={`w-full p-3 border-2 rounded-xl transition-colors font-medium text-sm ${
                                      currentValue
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:bg-blue-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <Check size={16} className={currentValue ? 'text-white' : 'text-gray-400'} />
                                      <span>{currentValue ? 'Enabled' : 'Disabled'}</span>
                                    </div>
                                  </button>
                                ) : spec.type === 'select' && spec.options ? (
                                  <select
                                    value={currentValue as string}
                                    onChange={(e) => updateProductSpecification(spec.key, e.target.value)}
                                    className="w-full py-2.5 px-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-sm font-medium transition-colors"
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
                                      className="w-full py-2.5 px-3 pr-9 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-sm transition-colors"
                                      autoComplete="off"
                                      autoCorrect="off"
                                      spellCheck={false}
                                    />
                                    {currentValue && (
                                      <button
                                        type="button"
                                        onClick={() => updateProductSpecification(spec.key, '')}
                                        className="absolute right-2 top-2.5 text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Clear value"
                                      >
                                        <X size={14} />
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

                {/* Custom Specification - Flat Design */}
                <div className="border-t-2 border-gray-200 pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Plus size={18} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Custom Specifications</h3>
                      <p className="text-xs text-gray-600">Add your own custom fields</p>
                    </div>
                  </div>
                  
                  {showProductCustomInput ? (
                    <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-300">
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="text"
                          value={productCustomAttributeInput}
                          onChange={(e) => setProductCustomAttributeInput(e.target.value)}
                          placeholder="Enter custom specification name..."
                          className="flex-1 py-2.5 px-4 border-2 border-purple-400 rounded-xl focus:border-purple-600 focus:outline-none text-sm font-medium w-full"
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
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button 
                            type="button" 
                            onClick={handleProductCustomAttributeSubmit} 
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-bold"
                          >
                            Add
                          </button>
                          <button 
                            type="button" 
                            onClick={cancelProductCustomAttribute} 
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => { setShowProductCustomInput(true); setProductCustomAttributeInput(''); }} 
                      className="group flex items-center justify-center gap-3 p-4 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors w-full"
                    >
                      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <Plus className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-sm font-bold text-gray-700 group-hover:text-purple-600">Add Custom Specification</span>
                    </button>
                  )}
                </div>

                {/* Current Specifications Summary - Flat Cards */}
                {(() => {
                  const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
                  const hasSpecs = Object.keys(currentSpecs).length > 0;
                  
                  return hasSpecs ? (
                    <div className="border-t-2 border-gray-200 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Check size={18} className="text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900">Active Specifications</h3>
                            <p className="text-xs text-gray-600">
                              {Object.keys(currentSpecs).length} specification{Object.keys(currentSpecs).length !== 1 ? 's' : ''} configured
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(currentSpecs).map(([key, value]) => (
                          <div 
                            key={key} 
                            className="group bg-green-50 border-2 border-green-300 rounded-xl p-3 hover:bg-green-100 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-green-900 capitalize truncate mb-1">
                                  {key.replace(/_/g, ' ')}
                                </div>
                                <div className="text-sm text-green-700 font-medium truncate">
                                  {String(value) || 'Not set'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttributeFromProduct(key)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg flex-shrink-0 transition-colors"
                                title="Remove specification"
                              >
                                <X size={14} />
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

            {/* Flat Footer - Fixed */}
            <div className="bg-gray-50 px-5 py-4 border-t-2 border-gray-200 flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    {(() => {
                      const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
                      return Object.keys(currentSpecs).length > 0 
                        ? `${Object.keys(currentSpecs).length} specification${Object.keys(currentSpecs).length !== 1 ? 's' : ''} added`
                        : 'No specifications yet';
                    })()}
                  </span>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowProductSpecificationsModal(false)}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductSpecificationsModal(false);
                      toast.success('Product specifications saved successfully! 🎉');
                    }}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold"
                  >
                    Save Specifications
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal {...successModal.props} />
    </div>
  );
};

export default AddProductPageOptimized;
