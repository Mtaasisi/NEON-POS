import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, Package, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassInput from '../../../shared/components/ui/GlassInput';
import GlassButton from '../../../shared/components/ui/GlassButton';
import AIDescriptionGenerator from '../product/AIDescriptionGenerator';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import SuccessModal from '../../../../components/ui/SuccessModal';
import { useSuccessModal } from '../../../../hooks/useSuccessModal';
import { SuccessIcons } from '../../../../components/ui/SuccessModalIcons';

import CategoryInput from '../../../shared/components/ui/CategoryInput';
import { t } from '../../lib/i18n/t';
import { Product } from '../../types/inventory';
import { useInventoryStore } from '../../stores/useInventoryStore';
import StorageLocationForm from '../product/StorageLocationForm';
import PricingAndStockForm from '../product/PricingAndStockForm';
import ProductVariantsSection from '../product/ProductVariantsSection';
import { supabase } from '../../../../lib/supabaseClient';

// Define a simplified variant type for the form
interface FormProductVariant {
  id?: string;
  sku: string;
  name: string;
  barcode?: string;
  price: number;
  costPrice: number;
  stockQuantity: number;
  minStockLevel: number;
  attributes?: Record<string, any>;
}

// Validation schema for product editing
const editProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100, 'Product name must be less than 100 characters'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU must be less than 50 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  condition: z.string().optional(),
  storageRoomId: z.string().optional(),
  shelfId: z.string().optional(),
  // Price and stock are optional when using variants
  price: z.number().min(0, 'Price must be 0 or greater').optional().default(0),
  costPrice: z.number().min(0, 'Cost price must be 0 or greater').optional().default(0),
  stockQuantity: z.number().min(0, 'Stock quantity must be 0 or greater').optional().default(0),
  minStockLevel: z.number().min(0, 'Minimum stock level must be 0 or greater').optional().default(0)
});

type EditProductFormData = z.infer<typeof editProductSchema>;

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  onProductUpdated?: (product: any) => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  productId,
  onProductUpdated
}) => {
  const { categories, updateProduct, loadCategories, getProduct } = useInventoryStore();
  const successModal = useSuccessModal();
  
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Variant states
  const [useVariants, setUseVariants] = useState(false);
  const [showVariants, setShowVariants] = useState(true);
  const [variants, setVariants] = useState<FormProductVariant[]>([]);
  const [isReorderingVariants, setIsReorderingVariants] = useState(false);
  const [draggedVariantIndex, setDraggedVariantIndex] = useState<number | null>(null);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // ✅ FIXED: Move hooks BEFORE any conditional returns to comply with Rules of Hooks
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue
  } = useForm<EditProductFormData>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      categoryId: '',
      condition: 'new',
      storageRoomId: '',
      shelfId: '',
      price: 0,
      costPrice: 0,
      stockQuantity: 0,
      minStockLevel: 0
    }
  });

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Load product data when product changes - only when modal first opens
  useEffect(() => {
    if (productId && isOpen) {
      const loadProductData = async () => {
        setIsLoading(true);
        try {
          // Fetch product data
          const result = await getProduct(productId);
          if (result && result.data) {
            const fetchedProduct = result.data;
            setProduct(fetchedProduct);
            reset({
              name: fetchedProduct.name,
              description: fetchedProduct.description || '',
              sku: fetchedProduct.sku,
              categoryId: fetchedProduct.categoryId || '',
              condition: fetchedProduct.condition || '',
              storageRoomId: '',
              shelfId: '',
              price: fetchedProduct.price || 0,
              costPrice: fetchedProduct.costPrice || 0,
              stockQuantity: fetchedProduct.stockQuantity || 0,
              minStockLevel: fetchedProduct.minStockLevel || 0
            });
            
            // Fetch variants separately from the database
            console.log('📦 Fetching variants for product:', productId);
            const { data: variantsData, error: variantsError } = await supabase
              .from('lats_product_variants')
              .select('*')
              .eq('product_id', productId);
            
            if (variantsError) {
              console.warn('⚠️ Could not load variants:', variantsError);
            } else if (variantsData && variantsData.length > 0) {
              console.log('✅ Loaded variants:', variantsData.length);
              console.log('📊 Variant data sample:', variantsData[0]);
              
              // Map the database fields to form fields with null checks
              const mappedVariants = variantsData
                .filter((v: any) => v && v.id) // Filter out null/undefined variants
                .map((v: any) => ({
                  id: v.id,
                  sku: v.sku || '',
                  name: v.variant_name || v.name || '',
                  barcode: v.barcode || undefined,
                  price: v.selling_price || 0,
                  costPrice: v.cost_price || 0,
                  stockQuantity: v.quantity || 0,
                  minStockLevel: v.min_quantity || 0,
                  attributes: v.variant_attributes || v.attributes || {}
                }));
              
              if (mappedVariants.length > 0) {
                setVariants(mappedVariants);
                setUseVariants(true);
                console.log('✅ Mapped variants successfully:', mappedVariants.length);
              } else {
                console.log('⚠️ No valid variants after filtering');
              }
            } else {
              console.log('ℹ️ No variants found for this product');
            }
          } else {
            toast.error('Failed to load product data');
            onClose();
          }
        } catch (error) {
          console.error('Error loading product data:', error);
          toast.error('Failed to load product data');
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      loadProductData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, isOpen]);

  // ✅ FIXED: Conditional returns AFTER all hooks to comply with Rules of Hooks
  // Don't render if modal is not open
  if (!isOpen) {
    return null;
  }

  // Show loading state if required data is not available
  if (isLoading || !product) {
    return (
      <>
        {/* Backdrop - respects sidebar and topbar */}
        <div 
          className="fixed bg-black/50 backdrop-blur-sm"
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
          className="fixed flex items-center justify-center"
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
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2">Loading product data...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  const handleClose = () => {
    reset();
    setVariants([]);
    setUseVariants(false);
    onClose();
  };

  const handleVariantSpecificationsClick = (index: number) => {
    // You can implement a modal or expanded view for variant specifications here
    toast.success(`Edit specifications for ${variants[index]?.name || `Variant ${index + 1}`}`);
  };

  const handleFormSubmit = async (data: EditProductFormData) => {
    try {
      console.log('📝 Submitting product update...');
      console.log('📋 Form data:', data);
      console.log('📦 Variants:', variants);
      console.log('🔢 Use Variants:', useVariants);
      
      // Validate variant SKUs for duplicates
      if (useVariants && variants.length > 0) {
        const skus = variants.map(v => v.sku).filter(Boolean);
        const duplicateSkus = skus.filter((sku, index) => skus.indexOf(sku) !== index);
        
        if (duplicateSkus.length > 0) {
          toast.error(`Duplicate SKU detected: ${duplicateSkus.join(', ')}. Each variant must have a unique SKU.`);
          return;
        }
        
        console.log('✅ SKU validation passed - no duplicates found');
      }
      
      // Prepare product data with variants if enabled
      const productData: any = {
        name: data.name,
        description: data.description,
        sku: data.sku,
        categoryId: data.categoryId,
        condition: data.condition,
        storageRoomId: data.storageRoomId,
        shelfId: data.shelfId,
        // Only include pricing/stock if NOT using variants
        ...(!useVariants && {
          price: data.price || 0,
          costPrice: data.costPrice || 0,
          stockQuantity: data.stockQuantity || 0,
          minStockLevel: data.minStockLevel || 0
        }),
        // Include variants if enabled
        ...(useVariants && variants.length > 0 && { 
          variants: variants
            .filter(v => v && v.sku) // Filter out null/invalid variants
            .map(v => ({
              id: v.id || undefined, // Include ID for existing variants
              sku: v.sku,
              name: v.name || '',
              barcode: v.barcode || undefined,
              // ✅ Ensure numbers are actually numbers, not strings
              costPrice: typeof v.costPrice === 'string' ? parseFloat(v.costPrice) || 0 : v.costPrice || 0,
              sellingPrice: typeof v.price === 'string' ? parseFloat(v.price) || 0 : v.price || 0,
              price: typeof v.price === 'string' ? parseFloat(v.price) || 0 : v.price || 0,
              quantity: typeof v.stockQuantity === 'string' ? parseInt(v.stockQuantity) || 0 : v.stockQuantity || 0,
              stockQuantity: typeof v.stockQuantity === 'string' ? parseInt(v.stockQuantity) || 0 : v.stockQuantity || 0,
              minQuantity: typeof v.minStockLevel === 'string' ? parseInt(v.minStockLevel) || 0 : v.minStockLevel || 0,
              minStockLevel: typeof v.minStockLevel === 'string' ? parseInt(v.minStockLevel) || 0 : v.minStockLevel || 0,
              attributes: v.attributes || {}
            }))
        })
      };

      console.log('📤 Final product data being sent:', JSON.stringify(productData, null, 2));

      const result = await updateProduct(productId, productData);
      
      console.log('📥 Update result:', result);
      
      if (result.ok) {
        console.log('✅ Product updated successfully!');
        // Show success modal
        successModal.show(
          `${data.name} has been updated successfully!${useVariants ? ` with ${variants.length} variant(s)` : ''}`,
          {
            title: 'Product Updated! ✅',
            icon: SuccessIcons.productUpdated,
            autoCloseDelay: 3000,
          }
        );
        onProductUpdated?.(result.data);
        handleClose();
      } else {
        console.error('❌ Update failed:', result.message);
        toast.error(result.message || 'Failed to update product');
      }
    } catch (error: any) {
      console.error('❌ Exception during form submit:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      toast.error(error?.message || 'Failed to update product');
    }
  };

  return (
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div 
        className="fixed bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
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
        className="fixed flex items-center justify-center p-4"
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
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          style={{ pointerEvents: 'auto' }}
        >
          <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Package className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                {product ? t('Edit Product') : t('Add Product')}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <GlassInput
                    {...field}
                    label={t('Product Name')}
                    placeholder={t('Enter product name')}
                    error={errors.name?.message}
                  />
                )}
              />

              <Controller
                name="sku"
                control={control}
                render={({ field }) => (
                  <GlassInput
                    {...field}
                    label={t('SKU')}
                    placeholder={t('Enter SKU')}
                    error={errors.sku?.message}
                  />
                )}
              />
            </div>

            {/* Category */}
            <div className="grid grid-cols-1 gap-6">
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className={`block mb-2 text-sm font-medium ${errors.categoryId?.message ? 'text-red-600' : 'text-gray-700'}`}>
                      {t('Category')} *
                    </label>
                    <CategoryInput
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder={t('Search categories...')}
                      categories={categories || []}
                      required
                      error={errors.categoryId?.message}
                      className="w-full"
                    />
                  </div>
                )}
              />
            </div>

            {/* Storage Location */}
            <StorageLocationForm
              formData={{
                storageRoomId: watch('storageRoomId') || '',
                shelfId: watch('shelfId') || ''
              }}
              setFormData={(updater: any) => {
                const newData = typeof updater === 'function' 
                  ? updater({ storageRoomId: watch('storageRoomId'), shelfId: watch('shelfId') })
                  : updater;
                setValue('storageRoomId', newData.storageRoomId);
                setValue('shelfId', newData.shelfId);
              }}
              currentErrors={{
                storageRoomId: errors.storageRoomId?.message || '',
                shelfId: errors.shelfId?.message || ''
              }}
            />

            {/* Pricing and Stock - Only show when NOT using variants */}
            {!useVariants && (
              <PricingAndStockForm
                formData={{
                  price: watch('price'),
                  costPrice: watch('costPrice'),
                  stockQuantity: watch('stockQuantity'),
                  minStockLevel: watch('minStockLevel')
                }}
                setFormData={(updater: any) => {
                  const currentData = {
                    price: watch('price'),
                    costPrice: watch('costPrice'),
                    stockQuantity: watch('stockQuantity'),
                    minStockLevel: watch('minStockLevel')
                  };
                  const newData = typeof updater === 'function' ? updater(currentData) : updater;
                  
                  if (newData.price !== undefined) setValue('price', newData.price);
                  if (newData.costPrice !== undefined) setValue('costPrice', newData.costPrice);
                  if (newData.stockQuantity !== undefined) setValue('stockQuantity', newData.stockQuantity);
                  if (newData.minStockLevel !== undefined) setValue('minStockLevel', newData.minStockLevel);
                }}
                currentErrors={{
                  price: errors.price?.message || '',
                  costPrice: errors.costPrice?.message || '',
                  stockQuantity: errors.stockQuantity?.message || '',
                  minStockLevel: errors.minStockLevel?.message || ''
                }}
              />
            )}

            {/* Info message when variants are enabled */}
            {useVariants && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Variants Mode Enabled
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Pricing and stock are managed individually for each variant below. Product-level pricing is not used when variants are enabled.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Description and Condition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className={`block mb-2 text-sm font-medium ${errors.description?.message ? 'text-red-600' : 'text-gray-700'}`}>
                      {t('Description')}
                    </label>
                    <div className="relative">
                      {isDescriptionExpanded ? (
                        <textarea
                          {...field}
                          onBlur={() => {
                            field.onBlur();
                            setIsDescriptionExpanded(false);
                          }}
                          className={`w-full py-3 pl-10 pr-4 bg-white/30 backdrop-blur-md border-2 rounded-lg focus:outline-none transition-all duration-200 resize-none ${
                            errors.description?.message
                              ? 'border-red-500 focus:border-red-600' 
                              : 'border-gray-300 focus:border-blue-500'
                          }`}
                          placeholder={t('Enter detailed description...')}
                          maxLength={200}
                          rows={4}
                          autoFocus
                        />
                      ) : (
                        <input
                          {...field}
                          type="text"
                          onFocus={() => {
                            setIsDescriptionExpanded(true);
                          }}
                          className={`w-full py-3 pl-10 pr-4 bg-white/30 backdrop-blur-md border-2 rounded-lg focus:outline-none transition-all duration-200 ${
                            errors.description?.message
                              ? 'border-red-500 focus:border-red-600' 
                              : 'border-gray-300 focus:border-blue-500'
                          }`}
                          placeholder={t('Enter product description')}
                          maxLength={200}
                        />
                      )}
                      <FileText className={`absolute left-3 text-gray-500 transition-all duration-200 ${
                        isDescriptionExpanded ? 'top-4' : 'top-1/2 -translate-y-1/2'
                      }`} size={16} />
                    </div>
                    {errors.description?.message && (
                      <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                    )}
                    
                    {/* AI Description Generator */}
                    <div className="mt-4">
                      <AIDescriptionGenerator
                        productName={watch('name')}
                        categoryName={categories?.find(c => c?.id === watch('categoryId'))?.name || ''}
                        currentDescription={watch('description') || ''}
                        onDescriptionGenerated={(description) => setValue('description', description)}
                        disabled={!watch('name')?.trim()}
                      />
                    </div>
                  </div>
                )}
              />

              <Controller
                name="condition"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className={`block mb-2 font-medium ${errors.condition?.message ? 'text-red-600' : 'text-gray-700'}`}>
                      {t('Condition')} *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'new', label: t('New'), color: 'bg-green-500 hover:bg-green-600' },
                        { value: 'used', label: t('Used'), color: 'bg-blue-500 hover:bg-blue-600' },
                        { value: 'refurbished', label: t('Refurbished'), color: 'bg-purple-500 hover:bg-purple-600' }
                      ].map((condition) => (
                        <button
                          key={condition.value}
                          type="button"
                          onClick={() => field.onChange(condition.value)}
                          className={`px-3 py-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                            field.value === condition.value
                              ? `${condition.color} text-white border-transparent shadow-md`
                              : 'bg-white/30 backdrop-blur-md text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          {condition.label}
                        </button>
                      ))}
                    </div>
                    {errors.condition?.message && (
                      <p className="mt-1 text-sm text-red-600">{errors.condition.message}</p>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Product Variants Section */}
            <div className="border-t border-gray-200 pt-6">
              <ProductVariantsSection
                variants={variants}
                setVariants={setVariants}
                useVariants={useVariants}
                setUseVariants={setUseVariants}
                showVariants={showVariants}
                setShowVariants={setShowVariants}
                isReorderingVariants={isReorderingVariants}
                setIsReorderingVariants={setIsReorderingVariants}
                draggedVariantIndex={draggedVariantIndex}
                setDraggedVariantIndex={setDraggedVariantIndex}
                onVariantSpecificationsClick={handleVariantSpecificationsClick}
                baseSku={watch('sku') || ''}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <GlassButton
                type="button"
                onClick={handleClose}
                variant="secondary"
                disabled={isSubmitting || isLoading}
              >
                {t('Cancel')}
              </GlassButton>
              <GlassButton
                type="submit"
                disabled={isSubmitting || isLoading}
                className="flex items-center space-x-2"
              >
                {isSubmitting || isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('Saving...')}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t('Save Changes')}</span>
                  </>
                )}
              </GlassButton>
            </div>
          </form>
        </GlassCard>
        </div>
      </div>
      
      {/* Success Modal */}
      <SuccessModal {...successModal.props} />
    </>
  );
};

export default EditProductModal;
