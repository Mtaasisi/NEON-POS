import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Minus,
  Package,
  X,
  QrCode,
  Copy,
  ShoppingCart,
  Layers
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { RobustImageService, ProductImage } from '../../../lib/robustImageService';
import { format } from '../../lats/lib/format';
import { 
  getVariantDisplayName, 
  formatVariantAttributesForDisplay,
  getVariantSourceBadge
} from '../../lats/lib/variantUtils';
import { parseSpecification, formatSpecificationValue } from '../../lats/lib/specificationUtils';
import { useDialog } from '../../shared/hooks/useDialog';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description?: string;
  price: number;
  cost_price?: number;
  stock_quantity: number;
  low_stock_threshold?: number;
  barcode?: string;
  brand?: string;
  image_url?: string;
  status: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  updated_at: string;
  variants?: any[];
  totalQuantity?: number;
}

const MobileProductDetail: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { confirm } = useDialog();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'variants' | 'details'>('overview');

  // Image state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR Code state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Variant management state
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null);

  // Load product data
  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;

      setIsLoading(true);
      try {
        const { data: productData, error: productError } = await supabase
          .from('lats_products')
          .select(`
            *,
            category:lats_categories(id, name),
            variants:lats_product_variants(id, variant_name, sku, cost_price, selling_price, quantity, min_quantity, is_active, variant_attributes)
          `)
          .eq('id', productId)
          .single();

        if (productError) throw productError;
        if (!productData) throw new Error('Product not found');
        
        const transformedProduct = {
          ...productData,
          price: productData.selling_price || 0,
          cost_price: productData.cost_price,
          stock_quantity: productData.quantity || 0,
          low_stock_threshold: productData.min_stock_level,
          status: productData.is_active ? 'active' : 'inactive',
          category: productData.category?.name || 'Uncategorized',
          variants: Array.isArray(productData.variants) ? productData.variants.map((v: any) => ({
            id: v.id,
            name: v.variant_name,
            sku: v.sku,
            costPrice: v.cost_price || 0,
            sellingPrice: v.selling_price || 0,
            quantity: v.quantity || 0,
            minQuantity: v.min_quantity || 0,
            isActive: v.is_active,
            attributes: v.variant_attributes || {}
          })) : [],
          totalQuantity: Array.isArray(productData.variants) 
            ? productData.variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0) 
            : 0
        };
        
        setProduct(transformedProduct);
      } catch (error) {
        console.error('Error loading product:', error);
        toast.error('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  // Load images
  useEffect(() => {
    const loadImages = async () => {
      if (!productId) return;
      
      try {
        setIsLoadingImages(true);
        const productImages = await RobustImageService.getProductImages(productId);
        setImages(productImages);
      } catch (error) {
        console.error('Error loading images:', error);
      } finally {
        setIsLoadingImages(false);
      }
    };

    if (productId) loadImages();
  }, [productId]);

  // Parse specifications
  const specifications = React.useMemo(() => {
    const primaryVariant = product?.variants?.[0];
    if (!primaryVariant?.attributes?.specification) return {};
    return parseSpecification(primaryVariant.attributes.specification);
  }, [product?.variants]);

  // Get primary variant
  const primaryVariant = (() => {
    if (!product?.variants || product.variants.length === 0) return null;
    const variantWithStock = product.variants.find(v => (v.quantity || 0) > 0);
    if (variantWithStock) return variantWithStock;
    const variantWithPrice = [...product.variants].sort((a, b) => (b.sellingPrice || 0) - (a.sellingPrice || 0))[0];
    if (variantWithPrice && variantWithPrice.sellingPrice > 0) return variantWithPrice;
    return product.variants[0];
  })();

  // Calculate profit margin
  const profitMargin = primaryVariant?.costPrice 
    ? ((primaryVariant.sellingPrice - primaryVariant.costPrice) / primaryVariant.sellingPrice * 100).toFixed(1)
    : 'N/A';

  // Handlers
  const handleDelete = async () => {
    if (!product) return;
    if (!await confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    try {
      const { error } = await supabase.from('lats_products').delete().eq('id', product.id);
      if (error) throw error;
      toast.success('Product deleted successfully');
      navigate('/mobile/inventory');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleStockAdjustment = async (variantId: string, adjustment: number) => {
    if (!product) return;
    const variant = product.variants?.find(v => v.id === variantId);
    if (!variant) return;

    const newStock = Math.max(0, variant.quantity + adjustment);

    try {
      const { error } = await supabase.from('lats_product_variants').update({ quantity: newStock }).eq('id', variantId);
      if (error) throw error;

      setProduct({
        ...product,
        variants: product.variants?.map(v => v.id === variantId ? { ...v, quantity: newStock } : v),
        totalQuantity: (product.totalQuantity || 0) + adjustment
      });

      toast.success(`Stock ${adjustment > 0 ? 'increased' : 'decreased'}`);
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !productId) return;

    setIsUploadingImage(true);
    
    try {
      const file = files[0];
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }

      toast.loading('Uploading image...', { id: 'image-upload' });

      let userId: string | null = null;
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          userId = parsedUser.id && parsedUser.id !== 'system' ? parsedUser.id : null;
        }
      } catch (err) {
        console.warn('Could not get user ID:', err);
      }

      const result = await RobustImageService.uploadImage(file, productId, userId, images.length === 0);

      if (!result.success) throw new Error(result.error || 'Upload failed');

      const updatedImages = await RobustImageService.getProductImages(productId);
      setImages(updatedImages);
      
      toast.success('Image uploaded successfully!', { id: 'image-upload' });
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      toast.error(errorMessage, { id: 'image-upload' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      toast.loading('Deleting image...', { id: 'delete-image' });

      const { error: dbError } = await supabase.from('product_images').delete().eq('id', imageId);
      if (dbError) throw dbError;

      const imageToDelete = images.find(img => img.id === imageId);
      if (imageToDelete?.url) {
        const imagePath = imageToDelete.url.split('/').pop();
        if (imagePath) {
          await supabase.storage.from('product-images').remove([imagePath]);
        }
      }

      const updatedImages = images.filter(img => img.id !== imageId);
      setImages(updatedImages);
      
      if (selectedImageIndex >= updatedImages.length) {
        setSelectedImageIndex(Math.max(0, updatedImages.length - 1));
      }

      toast.success('Image deleted successfully!', { id: 'delete-image' });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image', { id: 'delete-image' });
    }
  };

  const handleGenerateQRCode = () => {
    if (!product || !primaryVariant) return;
    
    try {
      const productUrl = `${window.location.origin}/mobile/inventory/${product.id}`;
      const qrData = `Product: ${product.name}\nSKU: ${primaryVariant.sku || 'N/A'}\nPrice: ${format.money(primaryVariant.sellingPrice || 0)}\nDetails: ${productUrl}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
      setQrCodeUrl(qrUrl);
      setShowQRModal(true);
      toast.success('QR Code generated!');
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  const handleCopyProductInfo = () => {
    if (!product || !primaryVariant) return;
    
    const info = `Product: ${product.name}\nSKU: ${primaryVariant.sku || 'N/A'}\nPrice: ${format.money(primaryVariant.sellingPrice || 0)}\nStock: ${product.totalQuantity || 0} units\nCategory: ${product.category}\nStatus: ${product.status}`.trim();
    
    navigator.clipboard.writeText(info);
    toast.success('Product info copied to clipboard!');
  };

  const handleAddToCart = () => {
    if (!product || !primaryVariant) return;
    
    try {
      localStorage.setItem('pos_quick_add', JSON.stringify({
        productId: product.id,
        variantId: primaryVariant.id,
        timestamp: Date.now()
      }));
      
      toast.success('Redirecting to POS...');
      setTimeout(() => navigate('/mobile/pos'), 500);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleDeleteVariant = async (variantId: string, variantName: string) => {
    if (!confirm(`Delete variant "${variantName}"?`)) return;

    try {
      const { error } = await supabase.from('lats_product_variants').delete().eq('id', variantId);
      if (error) throw error;
      toast.success('Variant deleted!');
      window.location.reload();
    } catch (error: any) {
      console.error('Error deleting variant:', error);
      toast.error(`Failed: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-gray-500">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Package size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">Product not found</p>
            <button
              onClick={() => navigate('/mobile/inventory')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              Back to Inventory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - iOS Style */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/mobile/inventory')} className="flex items-center gap-1 text-blue-500">
            <ArrowLeft size={20} strokeWidth={2} />
            <span className="text-[17px]">Back</span>
          </button>
          <h1 className="text-[17px] font-semibold text-gray-900 absolute left-1/2 transform -translate-x-1/2">
            {product.name.slice(0, 20)}{product.name.length > 20 ? '...' : ''}
          </h1>
          <button onClick={() => navigate(`/mobile/inventory/${productId}/edit`)} className="text-blue-500 text-[17px]">
            Edit
          </button>
        </div>
      </div>

      {/* Action Buttons Row - iOS Style */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-3">
          <button onClick={handleAddToCart} className="flex flex-col items-center gap-2">
            <ShoppingCart size={26} className="text-blue-500" strokeWidth={1.5} />
            <span className="text-[10px] text-gray-600">Add to POS</span>
          </button>
          <button onClick={handleGenerateQRCode} className="flex flex-col items-center gap-2">
            <QrCode size={26} className="text-blue-500" strokeWidth={1.5} />
            <span className="text-[10px] text-gray-600">QR Code</span>
          </button>
          <button onClick={handleCopyProductInfo} className="flex flex-col items-center gap-2">
            <Copy size={26} className="text-blue-500" strokeWidth={1.5} />
            <span className="text-[10px] text-gray-600">Copy</span>
          </button>
          <button onClick={handleDelete} className="flex flex-col items-center gap-2">
            <Trash2 size={26} className="text-red-500" strokeWidth={1.5} />
            <span className="text-[10px] text-gray-600">Delete</span>
          </button>
        </div>
      </div>

      {/* Segmented Control Tabs - iOS Style */}
      <div className="bg-white px-4 py-3">
        <div className="bg-gray-100 rounded-lg p-0.5 flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 text-center text-[12px] font-medium rounded-md transition-all ${
              activeTab === 'overview' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('variants')}
            className={`flex-1 py-2 text-center text-[12px] font-medium rounded-md transition-all ${
              activeTab === 'variants' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
            }`}
          >
            Variants
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2 text-center text-[12px] font-medium rounded-md transition-all ${
              activeTab === 'details' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
            }`}
          >
            Details
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Product Image */}
        <div className="w-full aspect-square bg-gray-100 flex items-center justify-center relative overflow-hidden border-b border-gray-200">
          {isLoadingImages && images.length === 0 ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          ) : images.length > 0 ? (
            <img
              src={images[selectedImageIndex]?.url || images[selectedImageIndex]?.thumbnailUrl}
              alt={product.name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setShowImageGallery(true)}
            />
          ) : (
            <Package size={64} className="text-gray-300" strokeWidth={1.5} />
          )}
          
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            className="absolute bottom-4 right-4 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {isUploadingImage ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Plus size={20} strokeWidth={3} />
            )}
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="bg-white">
            {/* Summary Stats */}
            <div className="px-4 py-4 grid grid-cols-4 gap-2 border-b border-gray-200">
              <div className="text-center">
                <div className="text-xl font-semibold text-green-600">{format.money(primaryVariant?.sellingPrice || 0).replace('TSh ', '')}</div>
                <div className="text-[10px] text-gray-500 mt-1">Price</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900">{product.totalQuantity || 0}</div>
                <div className="text-[10px] text-gray-500 mt-1">Stock</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900">{product.variants?.length || 0}</div>
                <div className="text-[10px] text-gray-500 mt-1">Variants</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-purple-600">{profitMargin}%</div>
                <div className="text-[10px] text-gray-500 mt-1">Margin</div>
              </div>
            </div>

            {/* Info List */}
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Name</span>
              <span className="text-gray-900 text-[15px] text-right font-medium max-w-[60%]">{product.name}</span>
            </div>
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">SKU</span>
              <span className="text-gray-900 text-[15px] font-mono">{primaryVariant?.sku || 'N/A'}</span>
            </div>
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Category</span>
              <span className="text-gray-900 text-[15px]">{product.category}</span>
            </div>
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Selling Price</span>
              <span className="text-green-600 text-[15px] font-semibold">{format.money(primaryVariant?.sellingPrice || 0)}</span>
            </div>
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Cost Price</span>
              <span className="text-red-600 text-[15px] font-semibold">{format.money(primaryVariant?.costPrice || 0)}</span>
            </div>
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Profit per Unit</span>
              <span className="text-blue-600 text-[15px] font-semibold">{format.money((primaryVariant?.sellingPrice || 0) - (primaryVariant?.costPrice || 0))}</span>
            </div>
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Profit Margin</span>
              <span className="text-purple-600 text-[15px] font-semibold">{profitMargin}%</span>
            </div>
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Total Stock</span>
              <span className={`text-[15px] font-semibold ${
                (product.totalQuantity || 0) === 0 ? 'text-red-600' :
                (product.totalQuantity || 0) <= (product.low_stock_threshold || 5) ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {product.totalQuantity || 0} units
              </span>
            </div>
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Status</span>
              <span className={`text-[15px] font-medium capitalize ${product.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                {product.status}
              </span>
            </div>

            {/* Specifications */}
            {Object.keys(specifications).length > 0 && Object.entries(specifications).slice(0, 6).map(([key, value]) => {
              const formattedValue = formatSpecificationValue(key, value);
              return (
                <div key={key} className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                  <span className="text-gray-900 text-[15px] capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-gray-900 text-[15px] font-medium">{formattedValue}</span>
                </div>
              );
            })}

            {/* Description */}
            {product.description && (
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="text-gray-900 text-[15px] mb-2">Description</div>
                <div className="text-gray-600 text-[15px] leading-relaxed">{product.description}</div>
              </div>
            )}
          </div>
        )}

        {/* Variants Tab */}
        {activeTab === 'variants' && (
          <div className="bg-white">
            {product.variants && product.variants.length > 0 ? (
              product.variants.map((variant, index) => {
                const sourceBadge = getVariantSourceBadge(variant);
                const variantAttrs = formatVariantAttributesForDisplay(variant);
                const isExpanded = expandedVariantId === variant.id;
                
                return (
                  <div key={variant.id} className="px-5 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[17px] font-semibold text-gray-900">
                            {getVariantDisplayName(variant, `Variant ${index + 1}`)}
                          </span>
                          {sourceBadge && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${sourceBadge.className}`}>
                              {sourceBadge.text}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-gray-500 font-mono">{variant.sku}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteVariant(variant.id, getVariantDisplayName(variant))} 
                        disabled={product.variants && product.variants.length === 1}
                        className={`text-[15px] ${
                          product.variants && product.variants.length === 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-500'
                        }`}
                        title={product.variants && product.variants.length === 1 ? 'Cannot delete the last variant' : 'Delete variant'}
                      >
                        Delete
                      </button>
                    </div>

                    {/* Variant Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <div className="text-[16px] font-semibold text-green-600">{format.money(variant.sellingPrice || 0).replace('TSh ', '')}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">Price</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-[16px] font-semibold ${
                          (variant.quantity || 0) === 0 ? 'text-red-600' :
                          (variant.quantity || 0) <= (variant.minQuantity || 0) ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {variant.quantity || 0}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">Stock</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[16px] font-semibold text-blue-600">{format.money((variant.sellingPrice || 0) - (variant.costPrice || 0)).replace('TSh ', '')}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">Profit</div>
                      </div>
                    </div>

                    {/* Stock Adjustment */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <span className="text-[14px] text-gray-600">Adjust Stock</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleStockAdjustment(variant.id, -1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center active:scale-95 transition-all"
                        >
                          <Minus size={16} strokeWidth={3} />
                        </button>
                        <span className="text-[17px] font-bold text-gray-900 w-10 text-center">{variant.quantity || 0}</span>
                        <button
                          onClick={() => handleStockAdjustment(variant.id, 1)}
                          className="w-8 h-8 rounded-full bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center active:scale-95 transition-all"
                        >
                          <Plus size={16} strokeWidth={3} />
                        </button>
                      </div>
                    </div>

                    {/* Details Toggle */}
                    {variantAttrs.length > 0 && (
                      <>
                        <button
                          onClick={() => setExpandedVariantId(isExpanded ? null : variant.id)}
                          className="w-full mt-3 text-blue-500 text-[14px] font-medium"
                        >
                          {isExpanded ? 'Hide Details' : 'Show Details'}
                        </button>
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                            {variantAttrs.map((attr, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="text-[14px] text-gray-600 capitalize">{attr.label}</span>
                                <span className="text-[14px] font-medium text-gray-900">{attr.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-12 text-center">
                <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[15px] text-gray-600">No variants found</p>
              </div>
            )}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-white">
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Product ID</span>
              <span className="text-gray-900 text-[15px] font-mono text-right max-w-[60%] truncate">{product.id}</span>
            </div>
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">SKU</span>
              <span className="text-gray-900 text-[15px] font-mono">{primaryVariant?.sku || 'N/A'}</span>
            </div>
            {product.barcode && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Barcode</span>
                <span className="text-gray-900 text-[15px] font-mono">{product.barcode}</span>
              </div>
            )}
            {product.brand && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Brand</span>
                <span className="text-gray-900 text-[15px]">{product.brand}</span>
              </div>
            )}
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Created</span>
              <span className="text-gray-900 text-[15px]">{new Date(product.created_at).toLocaleDateString()}</span>
            </div>
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Last Updated</span>
              <span className="text-gray-900 text-[15px]">{new Date(product.updated_at).toLocaleDateString()}</span>
            </div>
            {product.low_stock_threshold && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Low Stock Alert</span>
                <span className="text-gray-900 text-[15px]">{product.low_stock_threshold} units</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {showQRModal && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-5 z-50" onClick={() => setShowQRModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-bold text-gray-900">QR Code</h3>
              <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-500" strokeWidth={2.5} />
              </button>
            </div>
            <div className="text-center space-y-4">
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 inline-block">
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64 object-contain" />
              </div>
              <div className="text-[15px] text-gray-600">
                <p className="font-semibold text-gray-900 mb-1">{product.name}</p>
                <p className="font-mono text-[13px]">SKU: {primaryVariant?.sku}</p>
              </div>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = qrCodeUrl;
                  link.download = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_QR.png`;
                  link.click();
                  toast.success('Downloaded!');
                }}
                className="w-full py-3 px-4 bg-blue-500 text-white rounded-xl font-semibold text-[15px] hover:bg-blue-600 active:bg-blue-700 transition-all shadow-sm active:scale-95"
              >
                Download QR Code
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Image Gallery Modal */}
      {showImageGallery && images.length > 0 && createPortal(
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-5 z-50" onClick={() => setShowImageGallery(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-bold text-gray-900">Image Gallery</h3>
              <button onClick={() => setShowImageGallery(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-500" strokeWidth={2.5} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="grid grid-cols-2 gap-3">
                {images.map((image, index) => (
                  <div key={image.id} className="relative group">
                    <div className="aspect-square relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      <img
                        src={image.url}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setSelectedImageIndex(index);
                          setShowImageGallery(false);
                        }}
                      />
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2 bg-blue-500 text-white text-[11px] px-2 py-1 rounded-full font-semibold shadow-sm">
                          Primary
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.id);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 active:bg-red-700 transition-all"
                      >
                        <X size={14} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MobileProductDetail;

