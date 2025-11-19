import React, { useState, useEffect, useCallback } from 'react';
import { X, Package, Save, AlertTriangle, Plus, Check, Layers, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getLatsProvider } from '../../lib/data/provider';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import { getActiveCategories, Category } from '../../../../lib/categoryApi';
import { specificationCategories, getSpecificationsByType, getTypeDisplayName } from '../../../../data/specificationCategories';
import { generateSKU } from '../../lib/skuUtils';
import { validateProductData } from '../../lib/productUtils';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

// Extracted components
import ProductVariantsSection from './ProductVariantsSection';

interface ProductData {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category_id: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  condition: string;
  specification?: string;
  barcode?: string;
  brand?: string;
  model?: string;
  warranty_period?: number;
  is_active: boolean;
  category?: {
    id: string;
    name: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
}

interface ProductVariant {
  id?: string;
  name: string;
  sku: string;
  costPrice: number;
  price: number;
  stockQuantity: number;
  minStockLevel: number;
  attributes?: Record<string, any>;
}

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  onSuccess?: () => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  productId,
  onSuccess
}) => {
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Variants state - Start with empty array, user can add variants manually
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [showVariants, setShowVariants] = useState(true);
  const [useVariants, setUseVariants] = useState(false);
  const [isReorderingVariants, setIsReorderingVariants] = useState(false);
  const [draggedVariantIndex, setDraggedVariantIndex] = useState<number | null>(null);
  const [originallyHadVariants, setOriginallyHadVariants] = useState(false);

  // Variant specifications modal state
  const [showVariantSpecificationsModal, setShowVariantSpecificationsModal] = useState(false);
  const [currentVariantIndex, setCurrentVariantIndex] = useState<number | null>(null);
  const [customAttributeInput, setCustomAttributeInput] = useState('');
  const [customAttributeValue, setCustomAttributeValue] = useState('');
  const [selectedSpecCategory, setSelectedSpecCategory] = useState<string>('laptop');
  const [variantSpecStep, setVariantSpecStep] = useState(0);
  const [showAllVariantSpecs, setShowAllVariantSpecs] = useState(false);

  // Product specifications modal state
  const [showProductSpecificationsModal, setShowProductSpecificationsModal] = useState(false);
  const [showProductCustomInput, setShowProductCustomInput] = useState(false);
  const [productCustomAttributeInput, setProductCustomAttributeInput] = useState('');
  const [selectedProductSpecCategory, setSelectedProductSpecCategory] = useState<string>('laptop');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: generateSKU(),
    description: '',
    categoryId: '',
    costPrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    minStockLevel: 0,
    condition: 'new',
    specification: '',
    isActive: true
  });

  // Helper function to format numbers with comma separators
  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    // Remove .00 for whole numbers
    if (num % 1 === 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Load categories
  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const categoriesData = await getActiveCategories();
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen, loadCategories]);

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

  // Handle name check with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.name) {
        checkProductName(formData.name);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.name]);

  // Name checking (same as EditProductPage)
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
        .ilike('name', name.trim()) // Exact match (case-insensitive)
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

  // Variant management functions
  const handleUseVariantsToggle = (enabled: boolean) => {
    setUseVariants(enabled);

    if (enabled && variants.length === 0) {
      // Create a variant from current form data
      const autoVariant: ProductVariant = {
        name: 'Variant 1',
        sku: `${generateSKU()}-V01`,
        costPrice: formData.costPrice,
        price: formData.sellingPrice,
        stockQuantity: formData.stockQuantity,
        minStockLevel: formData.minStockLevel,
        attributes: {}
      };
      setVariants([autoVariant]);
      setShowVariants(true);
    } else if (!enabled) {
      // Clear variants when disabling
      setVariants([]);
      setShowVariants(false);
    }
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants(prevVariants =>
      prevVariants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      )
    );
  };

  const addVariant = () => {
    const newVariant: ProductVariant = {
      name: `Variant ${variants.length + 1}`,
      sku: `${generateSKU()}-V${(variants.length + 1).toString().padStart(2, '0')}`,
      costPrice: formData.costPrice,
      price: formData.sellingPrice,
      stockQuantity: 0,
      minStockLevel: 0,
      specification: '',
      attributes: {}
    };
    setVariants([...variants, newVariant]);
  };

  const removeVariant = (index: number) => {
    setVariants(prevVariants => prevVariants.filter((_, i) => i !== index));
  };

  const updateVariantSpecification = (variantIndex: number, specKey: string, value: string | boolean) => {
    const variant = variants[variantIndex];
    const newAttributes = { ...variant.attributes, [specKey]: value };
    updateVariant(variantIndex, 'attributes', newAttributes);
  };

  const updateProductSpecification = (specKey: string, value: string | boolean) => {
    const currentSpecs = formData.specification ? JSON.parse(formData.specification) : {};
    const newSpecs = { ...currentSpecs, [specKey]: value };
    setFormData(prev => ({ ...prev, specification: JSON.stringify(newSpecs) }));
  };

  // Name checking state (like EditProductPage)
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [originalProductName, setOriginalProductName] = useState<string>('');
  const [productBranchId, setProductBranchId] = useState<string | null>(null);

  // Fetch product data (same approach as EditProductPage)
  const fetchProductData = useCallback(async () => {
    if (!productId) return;

    setIsLoadingProduct(true);
    try {
      console.log('🔄 [EditProductModal] Loading product data for ID:', productId);

      // Use the same approach as EditProductPage - direct Supabase queries
      let product: any = null;

      // Load product without variants first
      console.log('📥 [EditProductModal] Fetching product from database...');
      const { data: productOnly, error: productError } = await supabase!
        .from('lats_products')
        .select('*')
        .eq('id', productId!)
        .single();

      console.log('📊 [EditProductModal] Product query result:', { productOnly, productError });

      if (productError) {
        console.error('❌ [EditProductModal] Product query failed:', productError);
        console.error('❌ [EditProductModal] Error code:', (productError as any).code);
        console.error('❌ [EditProductModal] Error message:', (productError as any).message);
        throw productError;
      }

      if (!productOnly) {
        console.error('❌ [EditProductModal] No product found with ID:', productId);
        toast.error(`Product with ID ${productId} not found`);
        onClose();
        return;
      }

      console.log('✅ [EditProductModal] Product loaded successfully:', productOnly.name);

      // Load variants separately
      console.log('📥 [EditProductModal] Fetching variants from database...');
      const { data: variants, error: variantsError } = await supabase!
        .from('lats_product_variants')
        .select('*')
        .eq('product_id', productId!);

      console.log('📊 [EditProductModal] Variants query result:', { variants, variantsError });

      if (variantsError) {
        console.warn('⚠️ [EditProductModal] Could not load variants:', variantsError);
        console.warn('⚠️ [EditProductModal] Variants error code:', variantsError.code);
        // Continue without variants
        product = productOnly ? { ...productOnly, variants: [] } : null;
      } else {
        console.log('✅ [EditProductModal] Loaded variants successfully. Count:', variants?.length || 0);
        product = productOnly ? { ...productOnly, variants: variants || [] } : null;
      }

      if (product) {
        console.log('📝 [EditProductModal] Processing product data...');
        console.log('📝 [EditProductModal] Product raw data:', product);

        // Store the original product name for comparison
        setOriginalProductName(product.name || '');

        // Store the product's branch_id for variant operations
        setProductBranchId(product.branch_id || null);

        const processedFormData = {
          name: product.name || '',
          sku: product.sku || product.barcode || generateSKU(),
          description: product.description || '',
          categoryId: product.category_id || '',
          costPrice: product.cost_price || 0,
          sellingPrice: product.selling_price || 0,
          stockQuantity: product.stock_quantity || 0,
          minStockLevel: product.min_stock_level || 0,
          condition: product.condition || 'new',
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
          isActive: product.is_active !== undefined ? product.is_active : true
        };

        console.log('📝 [EditProductModal] Processed form data:', processedFormData);
        console.log('📝 [EditProductModal] Category ID from product:', product.category_id);
        console.log('📝 [EditProductModal] Category ID in form data:', processedFormData.categoryId);
        console.log('📝 [EditProductModal] Available categories:', categories.map(c => ({ id: c.id, name: c.name })));

        // Check if category exists in categories array (same as EditProductPage)
        if (processedFormData.categoryId && categories.length > 0) {
          const categoryExists = categories.find(cat => cat.id === processedFormData.categoryId);
          if (!categoryExists) {
            console.warn('⚠️ [EditProductModal] Category ID does not match any available category!');
            console.warn('⚠️ [EditProductModal] Category ID:', processedFormData.categoryId);
            console.warn('⚠️ [EditProductModal] Available category IDs:', categories.map(c => c.id));
          } else {
            console.log('✅ [EditProductModal] Category matched:', categoryExists.name);
          }
        } else if (!processedFormData.categoryId) {
          console.warn('⚠️ [EditProductModal] Product has NO category set in database!');
        }

        setFormData(processedFormData);
        setProductData(product);

        // Determine if product originally had variants (same logic as EditProductPage)
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
            variant.name || variant.variant_name ||  // Prioritize 'name' (user-defined)
            (variant.sku && variant.sku !== product.sku) ||
            (variant.attributes && Object.keys(variant.attributes).length > 0) ||  // Check attributes first
            (variant.variant_attributes && Object.keys(variant.variant_attributes).length > 0)
          ))
        );

        setOriginallyHadVariants(hadVariantsOriginally);
        console.log('🔍 [EditProductModal] Product variant analysis:', {
          productId: product.id,
          variantCount: product.variants?.length || 0,
          hadVariantsOriginally,
          hasVariantsFlag: product.has_variants,
          metadataUseVariants: product.metadata?.useVariants
        });

        // Load variants if they exist (same processing as EditProductPage)
        if (product.variants && product.variants.length > 0) {
          console.log('📦 [EditProductModal] Processing variants...');
          console.log('📦 [EditProductModal] Raw variants from database:', product.variants);
          const processedVariants = product.variants.map((variant: any, index: number) => {
            console.log(`📦 [EditProductModal] Variant ${index + 1} raw:`, {
              name: variant.name,
              variant_name: variant.variant_name,
              sku: variant.sku,
              id: variant.id
            });

            // Match ProductModal's logic - prioritize variant_name (database field) over name
            const variantName = variant.variant_name || variant.name || '';
            console.log(`📦 [EditProductModal] Variant ${index + 1} selected name: "${variantName}"`);

            return {
              id: variant.id,
              name: variantName,  // Now matches getVariantDisplayName priority
              sku: variant.sku || '',
              costPrice: variant.cost_price || 0,
              price: variant.selling_price || 0,
              stockQuantity: variant.quantity || 0,
              minStockLevel: variant.min_quantity || 0,
              attributes: variant.attributes || variant.variant_attributes || {}  // Prioritize 'attributes'
            };
          });

          console.log('📦 [EditProductModal] Processed variants:', processedVariants);
          setVariants(processedVariants);

          // Respect the original intention - if product originally had variants, keep them enabled
          console.log('📦 [EditProductModal] Setting useVariants and showVariants to:', hadVariantsOriginally);
          setUseVariants(hadVariantsOriginally);
          setShowVariants(hadVariantsOriginally);
        } else {
          console.log('📦 [EditProductModal] No variants found in database');
          // No variants in database
          setOriginallyHadVariants(false);
          setUseVariants(false);
          setShowVariants(false);
        }

        setErrors({});
      }
    } catch (error: any) {
      console.error('❌ [EditProductModal] Error loading product:', error);

      // Provide more specific error messages (same as EditProductPage)
      let errorMessage = 'Failed to load product data';

      if (error?.code === 'PGRST116') {
        errorMessage = `Product with ID "${productId}" not found in database`;
      } else if (error?.code === 'PGRST301') {
        errorMessage = 'Database connection error. Please check your internet connection.';
      } else if (error?.message) {
        errorMessage = `Database error: ${error.message}`;
      }

      toast.error(errorMessage);
      console.error('❌ [EditProductModal] Detailed error info:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        productId
      });
      onClose();
    } finally {
      setIsLoadingProduct(false);
    }
  }, [productId, onClose, categories]);

  // Load product data when modal opens
  useEffect(() => {
    if (isOpen && productId) {
      fetchProductData();
    }
  }, [isOpen, productId, fetchProductData]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    // Note: SKU validation removed - SKUs are auto-generated

    // Only validate product-level pricing/stock when NOT using variants
    if (!useVariants) {
      if (formData.sellingPrice < 0) {
        newErrors.sellingPrice = 'Selling price cannot be negative';
      }

      if (formData.costPrice < 0) {
        newErrors.costPrice = 'Cost price cannot be negative';
      }

      if (formData.stockQuantity < 0) {
        newErrors.stockQuantity = 'Stock quantity cannot be negative';
      }

      if (formData.minStockLevel < 0) {
        newErrors.minStockLevel = 'Minimum stock level cannot be negative';
      }
    } else {
      // When using variants, validate that variants exist and have basic data
      if (variants.length === 0) {
        newErrors.variants = 'At least one variant is required when using product variants';
      } else {
        // Check if any variant is missing required data (SKU is auto-generated)
        const invalidVariants = variants.filter(v =>
          !v.name.trim() || v.price <= 0 || v.costPrice < 0 || v.stockQuantity < 0
        );
        if (invalidVariants.length > 0) {
          newErrors.variants = 'Some variants are missing required information (name, SKU, or pricing)';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!productData) {
      toast.error('Product data not loaded');
      return;
    }

    setIsSubmitting(true);
    try {
      const dataProvider = getLatsProvider();

      const updateData: any = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim() || null,
        categoryId: formData.categoryId,
        condition: formData.condition,
        costPrice: formData.costPrice,
        price: formData.sellingPrice,
        sellingPrice: formData.sellingPrice,
        stockQuantity: formData.stockQuantity,
        minStockLevel: formData.minStockLevel,
        specification: formData.specification.trim() || null,
        isActive: formData.isActive
      };

      // Include variants if enabled
      if (useVariants && variants.length > 0) {
        updateData.variants = variants.map(variant => ({
          id: variant.id || undefined, // Include ID for existing variants
          sku: variant.sku,
          name: variant.name,
          costPrice: variant.costPrice,
          sellingPrice: variant.price,
          quantity: variant.stockQuantity,
          minStockLevel: variant.minStockLevel,
          attributes: variant.attributes || {}
        }));
      }

      const response = await dataProvider.updateProduct(productId, updateData);

      if (response.ok) {
        toast.success('Product updated successfully');
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" role="dialog" aria-modal="true" aria-labelledby="edit-product-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
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
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>

            {/* Text and Status */}
            <div>
              <h3 id="edit-product-modal-title" className="text-2xl font-bold text-gray-900 mb-3">
                {isLoadingProduct ? 'Loading Product...' : 'Edit Product'}
              </h3>

              {/* Status Indicator */}
              <div className="flex items-center gap-4">
                {productData && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    formData.isActive
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${
                      formData.isActive ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className={`text-sm font-bold ${
                      formData.isActive ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                )}

                {isLoadingProduct && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-bold text-blue-700">Loading...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingProduct ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading product data...</p>
              </div>
            </div>
          ) : productData ? (
            <div className="p-6 space-y-6">
              {/* Basic Information Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h4>
                <div className="space-y-4">
                  {/* Product Name - Full Width */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 text-gray-900 ${
                          errors.name
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                        placeholder="Enter product name"
                      />
                      {isCheckingName && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                    </div>
                    {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                    {nameExists && (
                      <p className="mt-1 text-sm text-amber-600">⚠️ A product with this exact name already exists</p>
                    )}
                  </div>

                  {/* Specifications - Full Width */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Specifications
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowProductSpecificationsModal(true)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Configure Specs
                      </button>
                    </div>
                    <textarea
                      value={formData.specification}
                      onChange={(e) => setFormData(prev => ({ ...prev, specification: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 resize-none"
                      placeholder="Enter product specifications (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing and Stock Section - Only show when NOT using variants */}
              {!useVariants && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Pricing & Stock</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost Price
                    </label>
                    <input
                      type="text"
                      value={formatPrice(formData.costPrice)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, '');
                        const numValue = parseFloat(value) || 0;
                        setFormData(prev => ({ ...prev, costPrice: numValue }));
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 text-gray-900 font-bold text-lg ${
                        errors.costPrice
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-green-500 focus:ring-green-200'
                      }`}
                      placeholder="0"
                    />
                    {errors.costPrice && <p className="text-red-600 text-sm mt-1">{errors.costPrice}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selling Price *
                    </label>
                    <input
                      type="text"
                      value={formatPrice(formData.sellingPrice)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, '');
                        const numValue = parseFloat(value) || 0;
                        setFormData(prev => ({ ...prev, sellingPrice: numValue }));
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 text-gray-900 font-bold text-lg ${
                        errors.sellingPrice
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-green-500 focus:ring-green-200'
                      }`}
                      placeholder="0"
                    />
                    {errors.sellingPrice && <p className="text-red-600 text-sm mt-1">{errors.sellingPrice}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.stockQuantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: parseInt(e.target.value) || 0 }))}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 text-gray-900 font-bold text-lg ${
                        errors.stockQuantity
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                      min="0"
                    />
                    {errors.stockQuantity && <p className="text-red-600 text-sm mt-1">{errors.stockQuantity}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Stock Level
                    </label>
                    <input
                      type="number"
                      value={formData.minStockLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, minStockLevel: parseInt(e.target.value) || 0 }))}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 text-gray-900 font-bold text-lg ${
                        errors.minStockLevel
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                      min="0"
                    />
                    {errors.minStockLevel && <p className="text-red-600 text-sm mt-1">{errors.minStockLevel}</p>}
                  </div>
                </div>

                {/* Profit Calculation Display - Only show when NOT using variants */}
                {!useVariants && formData.sellingPrice > 0 && formData.costPrice > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-1">Cost Price</p>
                        <p className="text-lg font-bold text-blue-700">{formatPrice(formData.costPrice)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-1">Selling Price</p>
                        <p className="text-lg font-bold text-blue-700">{formatPrice(formData.sellingPrice)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-1">Profit</p>
                        <p className={`text-lg font-bold ${formData.sellingPrice - formData.costPrice >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPrice(formData.sellingPrice - formData.costPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-1">Margin</p>
                        <p className={`text-lg font-bold ${formData.sellingPrice - formData.costPrice >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formData.costPrice > 0 ? `${((formData.sellingPrice - formData.costPrice) / formData.costPrice * 100).toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              )}

              {/* Show message when variants are enabled */}
              {useVariants && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-orange-800">Pricing & Stock Managed Per Variant</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        When using product variants, pricing and stock levels are configured individually for each variant below.
                      </p>
                    </div>
                  </div>
                </div>
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
                onVariantSpecificationsClick={(index) => {
                  setCurrentVariantIndex(index);
                  setShowVariantSpecificationsModal(true);
                }}
                baseSku={formData.sku || generateSKU()}
              />

              {/* Additional Information Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Additional Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 text-gray-900 ${
                        errors.categoryId
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                      }`}
                      disabled={isLoadingCategories}
                    >
                      <option value="">
                        {isLoadingCategories ? 'Loading categories...' : 'Select a category'}
                      </option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.categoryId && <p className="text-red-600 text-sm mt-1">{errors.categoryId}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                    >
                      <option value="new">New</option>
                      <option value="used">Used</option>
                      <option value="refurbished">Refurbished</option>
                    </select>
                  </div>




                </div>
              </div>


              {/* Status Toggle */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Product Status</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Control whether this product is active and available for sale
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${formData.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.isActive ? 'bg-green-600' : 'bg-gray-400'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">Failed to load product data</p>
                <p className="text-gray-500 text-sm mt-2">Please try again or contact support</p>
              </div>
            </div>
          )}
        </div>

        {/* Variant Specifications Modal */}
        {showVariantSpecificationsModal && currentVariantIndex !== null && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => {
                setShowVariantSpecificationsModal(false);
                setCurrentVariantIndex(null);
              }}
            />

            {/* Modal Container */}
            <div
              className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
            >
              <div
                className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative pointer-events-auto max-h-[90vh] flex flex-col"
                role="dialog"
                aria-modal="true"
              >
                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowVariantSpecificationsModal(false);
                    setCurrentVariantIndex(null);
                  }}
                  className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="p-6 text-center bg-gradient-to-br from-purple-50 to-purple-100">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg bg-purple-600">
                    <Layers className="w-8 h-8 text-white" />
                  </div>
                  <h3 id="variant-specifications-modal-title" className="text-xl font-bold text-gray-900">
                    Variant Specifications
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Configure specifications for {variants[currentVariantIndex]?.name || 'this variant'}
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                  <p className="text-gray-600 text-center">
                    Variant specifications modal content would go here.
                    This is a placeholder for the full specifications functionality.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Product Specifications Modal */}
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
                className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative pointer-events-auto max-h-[90vh] flex flex-col"
                role="dialog"
                aria-modal="true"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowProductSpecificationsModal(false)}
                  className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="p-6 text-center bg-gradient-to-br from-blue-50 to-blue-100">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg bg-blue-600">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Product Specifications
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Configure specifications for this product
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                  <p className="text-gray-600 text-center">
                    Product specifications modal content would go here.
                    This is a placeholder for the full specifications functionality.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          {/* Error Summary */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-red-700">
                  Please fix {Object.keys(errors).length} error{Object.keys(errors).length > 1 ? 's' : ''} before saving
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isLoadingProduct}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" />
                  Save Changes
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProductModal;
