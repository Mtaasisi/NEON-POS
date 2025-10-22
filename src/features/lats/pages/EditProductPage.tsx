import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useParams, useNavigate } from 'react-router-dom';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import { BackButton } from '../../shared/components/ui/BackButton';
import { toast } from 'react-hot-toast';
import { Save, ArrowLeft, X, Plus, Check, Layers, FileText, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { retryWithBackoff } from '../../../lib/supabaseClient';

import { getActiveCategories, Category } from '../../../lib/categoryApi';
import { specificationCategories, getSpecificationsByType, getTypeDisplayName } from '../../../data/specificationCategories';

// import { StoreLocation } from '../../settings/types/storeLocation';
// import { storeLocationApi } from '../../settings/utils/storeLocationApi';
import { generateSKU } from '../lib/skuUtils';
import { validateProductData } from '../lib/productUtils';

// Extracted components
import ProductInformationForm from '../components/product/ProductInformationForm';
import PricingAndStockForm from '../components/product/PricingAndStockForm';
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
  sku: z.string().min(1, 'SKU must be provided').max(50, 'SKU must be less than 50 characters'),

  categoryId: z.string().min(1, 'Category must be selected - Please choose one from the dropdown'),


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

// Context wrapper component to ensure AuthProvider is available
const EditProductPageWithAuth: React.FC = () => {
  try {
    useAuth(); // Just check if AuthProvider is available
    
    // If we can access useAuth without error, render the main component
    return <EditProductPageContent />;
  } catch (error) {
    // If AuthProvider is not available, show a loading state
    console.warn('AuthProvider not available, showing loading state:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }
};

// Main component content
const EditProductPageContent: React.FC = () => {
  console.log('🎬 [DEBUG] ========== EditProductPageContent RENDER ==========');
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const successModal = useSuccessModal();
  
  console.log('🔍 [DEBUG] EditProductPage - Product ID from URL:', productId);
  console.log('🔍 [DEBUG] Product ID type:', typeof productId);
  
  const [categories, setCategories] = useState<Category[]>([]);

  const [currentErrors, setCurrentErrors] = useState<Record<string, string>>({});

  // Initial form data
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',  // ✅ FIXED: Changed from null to empty string to match schema

    condition: 'new',  // ✅ FIXED: Changed from empty string to valid enum value 'new'
    description: '',
    specification: '', // Ensure this is always a string
    price: 0,
    costPrice: 0,
    stockQuantity: 0,
    minStockLevel: 2, // Set default min stock level to 2 pcs like AddProductPage
    storageRoomId: '',
    shelfId: '',
    metadata: {},
    variants: []
  });

  // ✅ DEBUG: Track categoryId changes
  useEffect(() => {
    console.log('🔄 [DEBUG] Category ID changed to:', formData.categoryId);
    if (formData.categoryId) {
      const matchedCategory = categories.find(c => c.id === formData.categoryId);
      if (matchedCategory) {
        console.log('✅ [DEBUG] Category matched:', matchedCategory.name);
      } else {
        console.warn('⚠️ [DEBUG] Category ID does not match any loaded category!');
      }
    }
  }, [formData.categoryId, categories]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);

  // Variants state
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [useVariants, setUseVariants] = useState(false);
  const [originallyHadVariants, setOriginallyHadVariants] = useState(false); // Remember original intent
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

  // Name checking
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [originalProductName, setOriginalProductName] = useState<string>('');

  // Generate auto SKU using utility function
  const generateAutoSKU = () => {
    return generateSKU();
  };

  // Update specification value for a variant
  const updateVariantSpecification = (variantIndex: number, specKey: string, value: string | boolean) => {
    const variant = variants[variantIndex];
    const newAttributes = { ...variant.attributes, [specKey]: value };
    updateVariant(variantIndex, 'attributes', newAttributes);
  };

  // Update product specification value
  const updateProductSpecification = (specKey: string, value: string | boolean) => {
    const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
    const newSpecs = { ...currentSpecs, [specKey]: value };
    setFormData(prev => ({ ...prev, specification: JSON.stringify(newSpecs) }));
  };

  // Toggle feature specification (Yes/No) - currently unused
  // const toggleFeatureSpecification = (featureKey: string) => {
  //   const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
  //   const currentValue = currentSpecs[featureKey];
  //   const isEnabled = currentValue === 'Yes' || currentValue === 'true' || currentValue === true;
    
  //   const newValue = isEnabled ? 'No' : 'Yes';
  //   const newSpecs = { ...currentSpecs, [featureKey]: newValue };
  //   setFormData(prev => ({ ...prev, specification: JSON.stringify(newSpecs) }));
  // };

  // Function to create a variant from current form data
  const createVariantFromFormData = (): ProductVariant => {
    return {
      name: 'Variant 1',
      sku: `${formData.sku}-V01`,
      costPrice: formData.costPrice,
      price: formData.price,
      stockQuantity: formData.stockQuantity,
      minStockLevel: formData.minStockLevel,
      specification: formData.specification,
      attributes: {
        specification: formData.specification || null
      }
    };
  };

  // Handle variants toggle - automatically create variant from form data
  const handleUseVariantsToggle = (enabled: boolean) => {
    console.log('🔄 [DEBUG] handleUseVariantsToggle called with enabled:', enabled);
    console.log('🔄 [DEBUG] Current variants count:', variants.length);
    
    setUseVariants(enabled);
    
    if (enabled && variants.length === 0) {
      console.log('📦 [DEBUG] Creating variant from form data...');
      // Create a variant from current form data
      const autoVariant = createVariantFromFormData();
      console.log('📦 [DEBUG] Auto-created variant:', autoVariant);
      setVariants([autoVariant]);
      setShowVariants(true);
    } else if (!enabled) {
      console.log('📦 [DEBUG] Clearing variants...');
      // Clear variants when disabling
      setVariants([]);
      setShowVariants(false);
    }
    
    console.log('🔄 [DEBUG] useVariants toggled. New state:', enabled);
  };

  // Update the first variant when form data changes (if variants are enabled)
  useEffect(() => {
    if (useVariants && variants.length > 0) {
      const updatedVariant = createVariantFromFormData();
      setVariants(prev => prev.map((variant, index) => 
        index === 0 ? { ...variant, ...updatedVariant } : variant
      ));
    }
  }, [formData.costPrice, formData.price, formData.stockQuantity, formData.minStockLevel, formData.specification, useVariants]);

  // Load data on component mount - Load categories FIRST
  useEffect(() => {
    console.log('🔄 [DEBUG] Component mounted, loading initial data...');
    const loadData = async () => {
      try {
        console.log('📥 [DEBUG] Fetching categories...');
        const categoriesData = await getActiveCategories();
        console.log('📥 [DEBUG] Categories loaded:', categoriesData?.length || 0);
        setCategories(categoriesData || []);
        
        // ✅ FIX: Load product AFTER categories are loaded
        if (productId) {
          console.log('🔄 [DEBUG] Categories loaded, now loading product...');
          loadProductData();
        }
      } catch (error) {
        console.error('❌ [DEBUG] Error loading data:', error);
        toast.error('Failed to load form data');
      }
    };

    loadData();
  }, [productId]); // ✅ FIX: Depend on productId to reload when it changes

  // Check if product name exists
  const checkProductName = async (name: string) => {
    if (!name.trim()) {
      setNameExists(false);
      return;
    }

    // Don't check if the name hasn't changed from the original
    if (originalProductName && name.trim() === originalProductName.trim()) {
      setNameExists(false);
      return;
    }

    setIsCheckingName(true);
    try {
      const { data, error } = await supabase!
        .from('lats_products')
        .select('id')
        .ilike('name', `%${name.trim()}%`)
        .neq('id', productId || '') // Exclude current product when editing
        .limit(1);

      if (error) throw error;
      
      setNameExists(data && data.length > 0);
    } catch (error) {
      console.error('Error checking product name:', error);
    } finally {
      setIsCheckingName(false);
    }
  };



  // Ensure variants are always shown for products with original variants
  useEffect(() => {
    if (useVariants || originallyHadVariants) {
      setShowVariants(true);
    }
  }, [useVariants, originallyHadVariants]);

  // Handle name check with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.name) {
        checkProductName(formData.name);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.name]);


  const loadProductData = async () => {
    console.log('🔍 [DEBUG] loadProductData called');
    if (!productId) {
      console.error('❌ [DEBUG] No product ID provided');
      toast.error('No product ID provided');
      return;
    }
    
    if (!supabase) {
      console.error('❌ [DEBUG] Supabase client not available');
      toast.error('Database connection not available');
      return;
    }
    
    console.log('🔄 [DEBUG] Loading product data for ID:', productId);
    console.log('🔍 [DEBUG] Current productId type:', typeof productId);
    setIsLoadingProduct(true);
    try {
      // Try loading product and variants separately to avoid relationship errors
      let product: any = null;
      
      // Load product without variants first
      console.log('📥 [DEBUG] Fetching product from database...');
      const { data: productOnly, error: productError } = await supabase!
        .from('lats_products')
        .select('*')
        .eq('id', productId!)
        .single();
      
      console.log('📊 [DEBUG] Product query result:', { productOnly, productError });
      
      if (productError) {
        console.error('❌ [DEBUG] Product query failed:', productError);
        console.error('❌ [DEBUG] Error code:', (productError as any).code);
        console.error('❌ [DEBUG] Error message:', (productError as any).message);
        throw productError;
      }
      
      if (!productOnly) {
        console.error('❌ [DEBUG] No product found with ID:', productId);
        toast.error(`Product with ID ${productId} not found`);
        return;
      }
      
      console.log('✅ [DEBUG] Product loaded successfully:', productOnly.name);
      
      // Load variants separately
      console.log('📥 [DEBUG] Fetching variants from database...');
      const { data: variants, error: variantsError } = await supabase!
        .from('lats_product_variants')
        .select('*')
        .eq('product_id', productId!);
      
      console.log('📊 [DEBUG] Variants query result:', { variants, variantsError });
      
      if (variantsError) {
        console.warn('⚠️ [DEBUG] Could not load variants:', variantsError);
        console.warn('⚠️ [DEBUG] Variants error code:', variantsError.code);
        // Continue without variants
        product = productOnly ? { ...productOnly, variants: [] } : null;
      } else {
        console.log('✅ [DEBUG] Loaded variants successfully. Count:', variants?.length || 0);
        product = productOnly ? { ...productOnly, variants: variants || [] } : null;
      }
      
      if (product) {
        console.log('📝 [DEBUG] Processing product data...');
        console.log('📝 [DEBUG] Product raw data:', product);
        
        // Store the original product name for comparison
        setOriginalProductName(product.name || '');

        const processedFormData = {
          name: product.name || '',
          description: product.description || '',
          specification: (() => {
            try {
              if (product.specification) {
                // If it's already a string, validate it's JSON
                if (typeof product.specification === 'string') {
                  JSON.parse(product.specification);
                  return product.specification;
                }
                // If it's an object, stringify it
                if (typeof product.specification === 'object') {
                  return JSON.stringify(product.specification);
                }
              }
              return '';
            } catch {
              // If JSON parsing fails, return empty string
              return '';
            }
          })(),
          sku: product.sku || product.barcode || generateSKU(),
          categoryId: product.category_id || '',  // ✅ FIXED: Use empty string instead of null
      
          condition: product.condition || 'new',  // ✅ FIXED: Default to 'new' instead of empty string
          
          price: product.selling_price || 0,
          costPrice: product.cost_price || 0,
          stockQuantity: product.stock_quantity || 0,
          minStockLevel: product.min_stock_level || 0,
          storageRoomId: product.storage_room_id || '',
          shelfId: product.shelf_id || '',
          metadata: product.attributes || {},
          variants: []
        };
        
        console.log('📝 [DEBUG] Processed form data:', processedFormData);
        console.log('📝 [DEBUG] Category ID from product:', product.category_id);
        console.log('📝 [DEBUG] Category ID in form data:', processedFormData.categoryId);
        console.log('📝 [DEBUG] Available categories:', categories.map(c => ({ id: c.id, name: c.name })));
        
        // ⚠️ WARNING: Check if category exists in categories array
        if (processedFormData.categoryId && categories.length > 0) {
          const categoryExists = categories.find(cat => cat.id === processedFormData.categoryId);
          if (!categoryExists) {
            console.warn('⚠️ [DEBUG] Category ID does not match any available category!');
            console.warn('⚠️ [DEBUG] Category ID:', processedFormData.categoryId);
            console.warn('⚠️ [DEBUG] Available category IDs:', categories.map(c => c.id));
          } else {
            console.log('✅ [DEBUG] Category matched:', categoryExists.name);
          }
        } else if (!processedFormData.categoryId) {
          console.warn('⚠️ [DEBUG] Product has NO category set in database!');
        }
        
        setFormData(processedFormData);
        
        
        // Determine if product originally had variants
        const hadVariantsOriginally = (
          // Check metadata first (most reliable)
          product.metadata?.useVariants === true ||
          // Check if product was designed for variants by looking for:
          // 1. Multiple variants, OR
          // 2. Any variant with meaningful data, OR 
          // 3. A has_variants flag if it exists in the product
          product.has_variants === true || 
          (product.variants && product.variants.length > 1) ||
          (product.variants && product.variants.some((variant: any) => 
            variant.name || 
            (variant.sku && variant.sku !== product.sku) ||
            (variant.attributes && Object.keys(variant.attributes).length > 0)
          ))
        );
        
        setOriginallyHadVariants(hadVariantsOriginally);
        console.log('🔍 [DEBUG] Product variant analysis:', {
          productId: product.id,
          variantCount: product.variants?.length || 0,
          hadVariantsOriginally,
          hasVariantsFlag: product.has_variants,
          metadataUseVariants: product.metadata?.useVariants
        });
        
        // Load variants if they exist
        if (product.variants && product.variants.length > 0) {
          console.log('📦 [DEBUG] Processing variants...');
          const processedVariants = product.variants.map((variant: any, index: number) => {
            console.log(`📦 [DEBUG] Variant ${index + 1}:`, variant);
            return {
              name: variant.name || '',
              sku: variant.sku || '',
              costPrice: variant.cost_price || 0,
              price: variant.selling_price || 0,
              stockQuantity: variant.quantity || 0,
              minStockLevel: variant.min_quantity || 0,
              specification: variant.attributes?.specification || '',
              attributes: variant.attributes || {}
            };
          });
          
          console.log('📦 [DEBUG] Processed variants:', processedVariants);
          setVariants(processedVariants);
          
          // Respect the original intention - if product originally had variants, keep them enabled
          console.log('📦 [DEBUG] Setting useVariants and showVariants to:', hadVariantsOriginally);
          setUseVariants(hadVariantsOriginally);
          setShowVariants(hadVariantsOriginally);
        } else {
          console.log('📦 [DEBUG] No variants found in database');
          // No variants in database
          setOriginallyHadVariants(false);
          setUseVariants(false);
          setShowVariants(false);
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading product:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load product data';
      
      if (error?.code === 'PGRST116') {
        errorMessage = `Product with ID "${productId}" not found in database`;
      } else if (error?.code === 'PGRST301') {
        errorMessage = 'Database connection error. Please check your internet connection.';
      } else if (error?.message) {
        errorMessage = `Database error: ${error.message}`;
      }
      
      toast.error(errorMessage);
      console.error('❌ Detailed error info:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        productId
      });
    } finally {
      setIsLoadingProduct(false);
    }
  };

  // ✅ FIXED: Validate form - Using AddProductPage pattern
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
      
      const dataToValidate = {
        ...formData,
        variants: useVariants ? variants : []
      };
      
      // Run Zod validation
      dynamicSchema.parse(dataToValidate);

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
            errors['_general'] = err.message;
          }
        });
      } else {
        errors['_general'] = 'Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error');
      }
      
      console.error('Validation errors found:', errors);
      setCurrentErrors(errors);
      return { isValid: false, errors };
    }
  };

  // ✅ FIXED: Submit form - Using AddProductPage pattern
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

    // Only check for name conflicts if the name has actually changed
    if (nameExists && formData.name.trim() !== originalProductName.trim()) {
      toast.error('Another product with a similar name already exists');
      return;
    }

    console.log('🚀 [DEBUG] Validation passed, proceeding with submission...');
    setIsSubmitting(true);

    try {
      // Calculate total quantity and value
      const totalQuantity = useVariants && variants.length > 0 
        ? variants.reduce((sum, variant) => sum + (variant.stockQuantity || 0), 0)
        : (formData.stockQuantity || 0);
      
      const totalValue = useVariants && variants.length > 0
        ? variants.reduce((sum, variant) => sum + ((variant.stockQuantity || 0) * (variant.price || 0)), 0)
        : ((formData.stockQuantity || 0) * (formData.price || 0));

      console.log('💰 [DEBUG] Calculated totals:', { totalQuantity, totalValue });

      // Prepare comprehensive product data with only fields that exist in the database
      const productData: any = {
        name: formData.name,
        description: formData.description || null,
        category_id: formData.categoryId || null,
        condition: formData.condition || 'new',
        total_quantity: totalQuantity,
        total_value: totalValue,
        storage_room_id: formData.storageRoomId || null,
        shelf_id: formData.shelfId || null,
        // Don't include tags or attributes if they're empty to avoid PostgreSQL type errors
      };
      
      console.log('📦 [DEBUG] Initial product data:', productData);

      // Only add fields that exist in the database schema
      if (formData.specification) {
        productData.specification = formData.specification;
      }
      if (formData.sku) {
        productData.sku = formData.sku;
      }
      if (formData.costPrice !== undefined) {
        productData.cost_price = formData.costPrice;
      }
      if (formData.price !== undefined) {
        productData.selling_price = formData.price;
      }
      if (formData.stockQuantity !== undefined) {
        productData.stock_quantity = formData.stockQuantity;
      }
      if (formData.minStockLevel !== undefined) {
        productData.min_stock_level = formData.minStockLevel;
      }

      // Fallback: If validation fails, try with only basic fields
      const basicProductData = {
        name: formData.name,
        description: formData.description || null,
        category_id: formData.categoryId || null,
      };

      console.log('📦 [DEBUG] Final product data being updated:', productData);
      console.log('📦 [DEBUG] Product data keys:', Object.keys(productData));
      console.log('📦 [DEBUG] Basic fallback data ready:', basicProductData);

      // Validate the product data against the database schema
      console.log('🔍 [DEBUG] Validating product data against database schema...');
      const validation = validateProductData(productData);
      console.log('🔍 [DEBUG] Validation result:', validation);
      
      if (!validation.isValid) {
        console.error('❌ [DEBUG] Product data validation failed:', validation.errors);
        toast.error(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      console.log('💾 [DEBUG] Attempting database update for product ID:', productId);
      let { data: updatedProduct, error } = await retryWithBackoff(async () => {
        console.log('💾 [DEBUG] Executing update query...');
        return await supabase!
          .from('lats_products')
          .update(productData)
          .eq('id', productId!)
          .select()
          .single();
      });
      
      console.log('💾 [DEBUG] Update result:', { updatedProduct, error });

      // If the full update fails, try with basic fields only
      if (error) {
        console.log('❌ Full update failed, trying with basic fields only:', error);
        console.log('Basic product data:', basicProductData);
        
        const basicResult = await retryWithBackoff(async () => {
          return await supabase!
            .from('lats_products')
            .update(basicProductData)
            .eq('id', productId!)
            .select()
            .single();
        });
        
        if (basicResult.error) {
          throw basicResult.error;
        }
        
        updatedProduct = basicResult.data;
        console.log('✅ Basic update succeeded');
      }

      // If using variants, update them
      if (useVariants && variants.length > 0 && updatedProduct) {
        console.log('📦 [DEBUG] ========== VARIANTS UPDATE START ==========');
        console.log('📦 [DEBUG] Updating variants for product...');
        console.log('📦 [DEBUG] Number of variants to update:', variants.length);
        console.log('📦 [DEBUG] Variants data:', variants);
        
        try {
          // ✅ IMPROVED: Use UPSERT logic instead of DELETE/INSERT to avoid foreign key violations
          // First, get existing variants to check what exists
          console.log('🔍 [DEBUG] Fetching existing variants...');
          const { data: existingVariants } = await supabase!
            .from('lats_product_variants')
            .select('id, sku')
            .eq('product_id', productId!);

          console.log(`✅ [DEBUG] Found ${existingVariants?.length || 0} existing variants`);
          
          // Prepare variant data for upsert
          const variantData = variants.map((variant, index) => {
            // Try to find existing variant by SKU to preserve its ID
            const existingVariant = existingVariants?.find((v: any) => v.sku === variant.sku);
            
            const data: any = {
              product_id: productId!,
              sku: variant.sku,
              name: variant.name,
              cost_price: variant.costPrice,
              selling_price: variant.price,
              quantity: variant.stockQuantity,
              min_quantity: variant.minStockLevel,
              attributes: {
                ...variant.attributes,
                specification: variant.specification || null
              }
            };
            
            // If variant exists, include its ID for update
            if (existingVariant) {
              data.id = existingVariant.id;
              console.log(`♻️  [DEBUG] Variant ${index + 1} will be updated (ID: ${existingVariant.id})`);
            } else {
              console.log(`➕ [DEBUG] Variant ${index + 1} will be inserted (new)`);
            }
            
            return data;
          });

          console.log('💾 [DEBUG] Upserting variants...');
          // Use upsert to update existing and insert new variants
          const { error: variantError } = await retryWithBackoff(async () => {
            return await supabase!
              .from('lats_product_variants')
              .upsert(variantData, { 
                onConflict: 'id'
              });
          });

          if (variantError) {
            console.error('❌ [DEBUG] Error upserting variants:', variantError);
            console.error('❌ [DEBUG] Variant error code:', variantError.code);
            console.error('❌ [DEBUG] Variant error message:', variantError.message);
            toast.error('Product updated but failed to update variants');
          } else {
            console.log('✅ [DEBUG] Variants updated successfully');
          }
        } catch (variantError) {
          console.error('❌ [DEBUG] Error in variant management:', variantError);
          toast.error('Product updated but failed to update variants');
        }
        console.log('📦 [DEBUG] ========== VARIANTS UPDATE END ==========');
      } else {
        console.log('📦 [DEBUG] Skipping variants update. useVariants:', useVariants, 'variants.length:', variants.length, 'updatedProduct:', !!updatedProduct);
      }

      console.log('✅ [DEBUG] Product update completed successfully!');
      console.log('🚀 [DEBUG] ========== SUBMIT END (SUCCESS) ==========');
      
      // Show success modal with action buttons
      successModal.show(`Product "${formData.name}" has been updated successfully!`, {
        title: 'Product Updated',
        actionButtons: [
          {
            label: 'View Product',
            onClick: () => navigate(`/lats/products/${productId}`),
            variant: 'primary'
          },
          {
            label: 'Back to Inventory',
            onClick: () => navigate('/lats/unified-inventory'),
            variant: 'secondary'
          }
        ]
      });
      
    } catch (error) {
      console.error('❌ [DEBUG] ========== SUBMIT ERROR ==========');
      console.error('❌ [DEBUG] Error updating product:', error);
      console.error('❌ [DEBUG] Error type:', typeof error);
      console.error('❌ [DEBUG] Error details:', JSON.stringify(error, null, 2));
      console.error('❌ [DEBUG] Error stack:', (error as Error)?.stack);
      console.error('🚀 [DEBUG] ========== SUBMIT END (ERROR) ==========');
      toast.error('Failed to update product. Please try again.');
    } finally {
      console.log('🔚 [DEBUG] Resetting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  // Add attribute to a variant
  const addAttributeToVariant = (variantIndex: number, attributeName: string) => {
    const variant = variants[variantIndex];
    const newAttributes = { ...variant.attributes, [attributeName]: '' };
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

  // Remove attribute from a variant
  const removeAttributeFromVariant = (variantIndex: number, attributeName: string) => {
    const variant = variants[variantIndex];
    const newAttributes = { ...variant.attributes };
    delete newAttributes[attributeName];
    updateVariant(variantIndex, 'attributes', newAttributes);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    console.log(`📝 [DEBUG] updateVariant called - Index: ${index}, Field: ${field}, Value:`, value);
    setVariants(prev => {
      const updated = prev.map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      );
      console.log('📝 [DEBUG] Updated variants:', updated);
      return updated;
    });
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

  // Handle custom product attribute submission
  const handleProductCustomAttributeSubmit = () => {
    if (productCustomAttributeInput.trim()) {
      const cleanName = productCustomAttributeInput.trim().toLowerCase().replace(/\s+/g, '_');
      addAttributeToProduct(cleanName);
      setShowProductCustomInput(false);
      setProductCustomAttributeInput('');
    }
  };

  // Cancel custom product attribute input
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
    <div className="p-4 sm:p-6 h-full overflow-y-auto pt-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton to="/lats/unified-inventory" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
              <p className="text-gray-600">Update product information and details</p>
            </div>
          </div>
        </div>

        <GlassCard className="mb-6">
          {isLoadingProduct ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading product data...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ✅ ADDED: Category Missing Warning (if product has no category) */}
              {!isLoadingProduct && !formData.categoryId && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg animate-pulse">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-yellow-800 mb-1">
                        ⚠️ Action Required: Category Missing
                      </h3>
                      <p className="text-sm text-yellow-700 mb-2">
                        This product doesn't have a category assigned in the database. 
                      </p>
                      <p className="text-sm text-yellow-800 font-medium">
                        👉 Please scroll down to the "Category" field and select a category before saving.
                      </p>
                      {categories.length === 0 && (
                        <p className="text-sm text-red-600 mt-2 font-medium">
                          ❌ No categories found! Please refresh the page or contact support.
                        </p>
                      )}
                      {categories.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm text-green-600">
                            ✅ {categories.length} categories available to choose from
                          </p>
                          <button
                            onClick={() => {
                              const categoryField = document.querySelector('[name="categoryId"]') || 
                                                    document.querySelector('select[id*="category"]') ||
                                                    document.querySelector('.category-input');
                              if (categoryField) {
                                categoryField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                // Highlight the field
                                (categoryField as HTMLElement).style.border = '2px solid #f59e0b';
                                setTimeout(() => {
                                  (categoryField as HTMLElement).style.border = '';
                                }, 3000);
                              }
                            }}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                          >
                            📍 Jump to Category Field
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ ADDED: Debug Panel (shows current form state) */}
              {!isLoadingProduct && import.meta.env.MODE === 'development' && (
                <details open className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                  <summary className="cursor-pointer font-medium text-blue-900 text-sm flex items-center gap-2">
                    🔍 Debug Info - Category Status: 
                    {formData.categoryId ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">✅ SET</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs animate-pulse">❌ EMPTY</span>
                    )}
                  </summary>
                  <div className="mt-3 space-y-2 text-xs font-mono">
                    <div className={`p-3 rounded border-2 ${!formData.categoryId ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                      <strong>Category ID:</strong> 
                      <div className={`mt-1 font-bold ${!formData.categoryId ? 'text-red-600' : 'text-green-600'}`}>
                        {formData.categoryId || '❌ EMPTY - PLEASE SELECT A CATEGORY!'}
                      </div>
                      {formData.categoryId && (
                        <div className="mt-2 text-green-700">
                          Length: {formData.categoryId.length} characters
                        </div>
                      )}
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-200">
                      <strong>Categories Loaded:</strong> {categories.length}
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-200">
                      <strong>Product Name:</strong> {formData.name || 'Not loaded'}
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-200">
                      <strong>Validation Errors:</strong> {Object.keys(currentErrors).length}
                    </div>
                    {categories.length > 0 && (
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <strong>Available Categories:</strong>
                        <ul className="ml-4 mt-1">
                          {categories.slice(0, 5).map(cat => (
                            <li key={cat.id} className="text-xs">
                              {cat.id === formData.categoryId ? '✅ ' : '• '}
                              {cat.name} ({cat.id})
                            </li>
                          ))}
                          {categories.length > 5 && <li>... and {categories.length - 5} more</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* ✅ ADDED: Validation Errors Display */}
              {Object.keys(currentErrors).length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800 mb-2">
                        Please fix the following errors:
                      </h3>
                      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {Object.entries(currentErrors).map(([field, message]) => (
                          <li key={field}>
                            <span className="font-medium capitalize">{field.replace(/_/g, ' ')}</span>: {message}
                            {field === 'categoryId' && (
                              <button
                                onClick={() => {
                                  const categoryField = document.querySelector('[name="categoryId"]') || 
                                                        document.querySelector('select[id*="category"]') ||
                                                        document.querySelector('.category-input');
                                  if (categoryField) {
                                    categoryField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }
                                }}
                                className="ml-2 text-xs underline hover:text-red-900"
                              >
                                Go to field
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
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



            {/* Pricing and Stock Form - Only show when not using variants */}
            {!useVariants && (
              <PricingAndStockForm
                formData={formData}
                setFormData={setFormData}
                currentErrors={currentErrors}
              />
            )}

            {/* Product Variants Section */}
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
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <GlassButton
                onClick={() => navigate('/lats/unified-inventory')}
                variant="secondary"
                icon={<ArrowLeft size={18} />}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </GlassButton>
              
              <div className="flex-1" />
              
              <GlassButton
                onClick={handleSubmit}
                loading={isSubmitting}
                icon={<Save size={18} />}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white flex-1 sm:flex-none"
                disabled={isSubmitting || isCheckingName}
              >
                {isSubmitting ? 'Updating...' : 'Update Product'}
              </GlassButton>
            </div>
            </div>
          )}
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

      {/* Product Specifications Modal */}
      {showProductSpecificationsModal && (
        <div 
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-2"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-specifications-modal-title"
        >
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[85vh] overflow-hidden mx-auto">
            {/* Header */}
            <div className="bg-blue-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <div>
                    <h2 id="product-specifications-modal-title" className="text-lg font-semibold">
                      Product Specs
                    </h2>
                    <p className="text-blue-100 text-xs">
                      Add product specifications
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProductSpecificationsModal(false)}
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
                  const isSelected = selectedProductSpecCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedProductSpecCategory(category.id)}
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
                    {specificationCategories.find(cat => cat.id === selectedProductSpecCategory)?.name}
                  </h3>
                  
                  {Object.entries(getSpecificationsByType(selectedProductSpecCategory)).map(([type, specs]) => {
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
                            const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
                            const currentValue = currentSpecs[spec.key] || '';
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
                                    onClick={() => updateProductSpecification(spec.key, !currentValue)}
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
                                    onChange={(e) => updateProductSpecification(spec.key, e.target.value)}
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
                                      onChange={(e) => updateProductSpecification(spec.key, e.target.value)}
                                      placeholder={spec.placeholder || `Enter ${spec.name.toLowerCase()}`}
                                      className="w-full py-1.5 px-2 pr-6 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-xs"
                                      autoComplete="off"
                                      autoCorrect="off"
                                      spellCheck={false}
                                    />
                                    {currentValue && (
                                      <button
                                        type="button"
                                        onClick={() => updateProductSpecification(spec.key, '')}
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
                  
                  {showProductCustomInput ? (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={productCustomAttributeInput}
                          onChange={(e) => setProductCustomAttributeInput(e.target.value)}
                          placeholder="Enter custom spec name..."
                          className="flex-1 py-1.5 px-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-xs"
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
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          Add
                        </button>
                        <button 
                          type="button" 
                          onClick={cancelProductCustomAttribute} 
                          className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => { setShowProductCustomInput(true); setProductCustomAttributeInput(''); }} 
                      className="flex items-center gap-2 p-2 bg-white border border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors w-full"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Add Custom</span>
                    </button>
                  )}
                </div>

                {/* Current Specifications Summary */}
                {(() => {
                  const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
                  const hasSpecs = Object.keys(currentSpecs).length > 0;
                  
                  return hasSpecs ? (
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        Current
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                          {Object.keys(currentSpecs).length}
                        </span>
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {Object.entries(currentSpecs).map(([key, value]) => (
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
                                onClick={() => removeAttributeFromProduct(key)}
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
                  ) : (
                    <div className="text-center py-6">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-sm font-medium text-gray-900 mb-1">No Specifications Added</h3>
                      <p className="text-gray-500 text-xs">
                        Click the buttons above to add specifications for this product.
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-600">
                  {(() => {
                    const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
                    return Object.keys(currentSpecs).length > 0 
                      ? `${Object.keys(currentSpecs).length} spec${Object.keys(currentSpecs).length !== 1 ? 's' : ''} added`
                      : 'No specs added yet';
                  })()}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProductSpecificationsModal(false)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductSpecificationsModal(false);
                      toast.success('Product specifications saved successfully!');
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

      {/* Success Modal */}
      <SuccessModal {...successModal.props} />
    </div>
  );
};

export default EditProductPageWithAuth;
