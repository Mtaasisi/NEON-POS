import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Package, Hash, DollarSign, Edit, Star, MapPin, Calendar, 
  TrendingUp, TrendingDown, BarChart3, CheckCircle,
  FileText, Layers, Truck, QrCode, ShoppingCart,
  Target, Banknote, Receipt, 
  Copy, Download, Building,
  Info, CheckCircle2, ArrowUp, Plus, Trash2, Save
} from 'lucide-react';
import GlassButton from '../../../shared/components/ui/GlassButton';
import { Product } from '../../types/inventory';
import { RobustImageService, ProductImage } from '../../../../lib/robustImageService';
import { format } from '../../lib/format';
import { formatSpecificationValue, parseSpecification } from '../../lib/specificationUtils';
import { exportProductData } from '../../lib/productUtils';
import { toast } from 'react-hot-toast';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { usePurchaseOrderHistory } from '../../hooks/usePurchaseOrderHistory';
import { 
  calculateTotalStock, 
  calculateTotalCostValue, 
  calculateTotalRetailValue, 
  calculatePotentialProfit,
  calculateProfitMargin, 
  getStockStatus 
} from '../../lib/productCalculations';
import EnhancedStockAdjustModal from '../inventory/EnhancedStockAdjustModal';
import StorageLocationForm from './StorageLocationForm';
import { supabase } from '../../../../lib/supabaseClient';

interface GeneralProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onEdit?: (product: Product) => void;
}

const GeneralProductDetailModal: React.FC<GeneralProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  onEdit
}) => {
  const { adjustStock, getProduct } = useInventoryStore();
  const [currentProduct, setCurrentProduct] = useState(product);
  
  // Stock adjustment state
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);

  // Variant management state
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingVariantData, setEditingVariantData] = useState<any>(null);
  const [showAddVariantForm, setShowAddVariantForm] = useState(false);
  const [newVariantData, setNewVariantData] = useState({
    name: '',
    sku: '',
    costPrice: 0,
    sellingPrice: 0,
    quantity: 0,
    minQuantity: 2
  });

  // Storage location state
  const [showStorageLocationModal, setShowStorageLocationModal] = useState(false);
  const [storageLocationData, setStorageLocationData] = useState({
    storageRoomId: (product as any).storageRoomId || '',
    shelfId: (product as any).shelfId || ''
  });
  const [isSavingStorageLocation, setIsSavingStorageLocation] = useState(false);

  // Update current product when prop changes
  useEffect(() => {
    setCurrentProduct(product);
    
  }, [product]);

  // Listen for product data updates from other parts of the app
  useEffect(() => {
    const handleProductDataUpdate = (event: CustomEvent) => {
      const { updatedProducts } = event.detail;
      if (product && updatedProducts.includes(product.id)) {
        // Trigger a re-render by updating the current product
        setCurrentProduct({ ...product });
      }
    };

    window.addEventListener('productDataUpdated', handleProductDataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('productDataUpdated', handleProductDataUpdate as EventListener);
    };
  }, [product]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Purchase order history tracking
  const { history: purchaseOrderHistory, stats: poStats, isLoading: isLoadingPOHistory } = usePurchaseOrderHistory(product?.id);
  const [showPOHistory, setShowPOHistory] = useState(false);
  
  // Scroll shadow state
  const [isScrolled, setIsScrolled] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Detect scroll to add shadow to fixed footer
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      setIsScrolled(target.scrollTop > 20);
    };

    const contentEl = contentRef.current;
    if (contentEl) {
      contentEl.addEventListener('scroll', handleScroll);
      return () => contentEl.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Load product images
  useEffect(() => {
    const loadImages = async () => {
      if (!product?.id) return;
      
      try {
        const productImages = await RobustImageService.getProductImages(product.id);
        console.log('📸 Loaded product images:', productImages);
        setImages(productImages);
      } catch (error) {
        console.error('❌ Error loading product images:', error);
      }
    };

    if (isOpen && product) {
      loadImages();
    }
  }, [isOpen, product?.id]);

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !product?.id) return;

    setIsUploadingImage(true);
    
    try {
      const file = files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        setIsUploadingImage(false);
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        setIsUploadingImage(false);
        return;
      }

      toast.loading('Uploading image...', { id: 'image-upload' });

      // Get user ID from localStorage or auth (use null if not available)
      let userId: string | null = null;
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Only use valid UUIDs, not string "system"
          userId = parsedUser.id && parsedUser.id !== 'system' ? parsedUser.id : null;
        }
      } catch (err) {
        console.warn('Could not get user ID:', err);
      }

      // Upload image using RobustImageService
      const result = await RobustImageService.uploadImage(
        file,
        product.id,
        userId,
        images.length === 0 // Set as primary if it's the first image
      );

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Reload images to get the updated list
      const updatedImages = await RobustImageService.getProductImages(product.id);
      console.log('🔄 Reloaded images after upload:', updatedImages);
      setImages(updatedImages);
      
      toast.success('Image uploaded successfully!', { id: 'image-upload' });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image. Please try again.';
      toast.error(errorMessage, { id: 'image-upload' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Trigger file input click
  const handleImageAreaClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Calculate analytics
  const analytics = React.useMemo(() => {
    if (!product?.variants) return null;
    
    return {
      totalStock: calculateTotalStock(product.variants),
      totalCostValue: calculateTotalCostValue(product.variants),
      totalRetailValue: calculateTotalRetailValue(product.variants),
      potentialProfit: calculatePotentialProfit(product.variants),
      profitMargin: calculateProfitMargin(product.variants),
      stockStatus: getStockStatus(product.variants)
    };
  }, [product?.variants]);

  // Parse specifications
  const specifications = React.useMemo(() => {
    const primaryVariant = product?.variants?.[0];
    if (!primaryVariant?.attributes?.specification) return {};
    
    return parseSpecification(primaryVariant.attributes.specification);
  }, [product?.variants]);

  if (!isOpen || !product) return null;

  const primaryVariant = product.variants?.[0];
  const daysInStock = product.createdAt ? Math.floor((Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const completeness = Math.round(((product.name ? 20 : 0) + 
    (product.description ? 15 : 0) + 
    (images.length > 0 ? 25 : 0) + 
    (Object.keys(specifications).length > 0 ? 20 : 0) + 
    (primaryVariant?.sellingPrice > 0 ? 20 : 0)));

  // Generate QR Code for product
  const handleGenerateQRCode = () => {
    try {
      const productUrl = `${window.location.origin}/lats/products/${product.id}/edit`;
      const qrData = `Product: ${product.name}\nSKU: ${primaryVariant?.sku || 'N/A'}\nPrice: ${format.money(primaryVariant?.sellingPrice || 0)}\nDetails: ${productUrl}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
      setQrCodeUrl(qrUrl);
      setShowQRModal(true);
      toast.success('QR Code generated successfully!');
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  // Export product data
  const handleExportProduct = () => {
    try {
      const productData = {
        name: product.name,
        sku: primaryVariant?.sku || '',
        categoryId: product.categoryId,
        condition: primaryVariant?.condition || '',
        description: product.description || '',
        specification: primaryVariant?.attributes?.specification || '',
        price: primaryVariant?.sellingPrice || 0,
        costPrice: primaryVariant?.costPrice || 0,
        stockQuantity: primaryVariant?.quantity || 0,
        minStockLevel: primaryVariant?.minQuantity || 0,
        storageRoomId: '',
        shelfId: '',
        images: [],
        metadata: product.metadata || {},
        variants: []
      };

      const variants = product.variants || [];
      const exportedData = exportProductData(productData, variants);
      
      // Create and download file
      const blob = new Blob([exportedData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Product data exported successfully!');
    } catch (error) {
      toast.error('Failed to export product data');
    }
  };


  // Add to cart (navigate to POS)
  const handleAddToCart = () => {
    try {
      // Store product in localStorage for POS to pick up
      localStorage.setItem('pos_quick_add', JSON.stringify({
        productId: product.id,
        variantId: primaryVariant?.id,
        timestamp: Date.now()
      }));
      
      toast.success('Product added! Redirecting to POS...');
      setTimeout(() => {
        window.open('/lats/pos', '_blank');
      }, 1000);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  // Save storage location
  const handleSaveStorageLocation = async () => {
    if (!storageLocationData.storageRoomId || !storageLocationData.shelfId) {
      toast.error('Please select both storage room and shelf');
      return;
    }

    setIsSavingStorageLocation(true);
    try {
      // Update product in database
      const { error } = await supabase
        .from('lats_products')
        .update({
          storage_room_id: storageLocationData.storageRoomId,
          shelf_id: storageLocationData.shelfId,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) throw error;

      // Update local product state
      setCurrentProduct({
        ...currentProduct,
        storageRoomId: storageLocationData.storageRoomId,
        shelfId: storageLocationData.shelfId
      } as any);

      toast.success('Storage location updated successfully!');
      setShowStorageLocationModal(false);
      
      // Trigger product data update event
      window.dispatchEvent(new CustomEvent('productDataUpdated', {
        detail: { updatedProducts: [product.id] }
      }));
    } catch (error) {
      console.error('Error updating storage location:', error);
      toast.error('Failed to update storage location');
    } finally {
      setIsSavingStorageLocation(false);
    }
  };

  // Variant Management Functions
  const handleEditVariant = (variant: any) => {
    setEditingVariantId(variant.id);
    setEditingVariantData({
      name: variant.name,
      sku: variant.sku,
      costPrice: variant.costPrice || 0,
      sellingPrice: variant.sellingPrice || 0,
      quantity: variant.quantity || 0,
      minQuantity: variant.minQuantity || 2
    });
  };

  const handleCancelEditVariant = () => {
    setEditingVariantId(null);
    setEditingVariantData(null);
  };

  const handleSaveVariant = async () => {
    if (!editingVariantId || !editingVariantData) return;
    
    try {
      const { supabase } = await import('../../../../lib/supabaseClient');
      
      const { error } = await supabase
        .from('lats_product_variants')
        .update({
          name: editingVariantData.name,
          sku: editingVariantData.sku,
          cost_price: editingVariantData.costPrice,
          selling_price: editingVariantData.sellingPrice,
          quantity: editingVariantData.quantity,
          min_quantity: editingVariantData.minQuantity,
        })
        .eq('id', editingVariantId);

      if (error) throw error;

      toast.success('Variant updated successfully!');
      setEditingVariantId(null);
      setEditingVariantData(null);
      
      // Refresh product data
      const refreshedProduct = await getProduct(product.id);
      if (refreshedProduct) {
        setCurrentProduct(refreshedProduct);
      }
    } catch (error: any) {
      console.error('Error updating variant:', error);
      toast.error(`Failed to update variant: ${error.message}`);
    }
  };

  const handleDeleteVariant = async (variantId: string, variantName: string) => {
    if (!confirm(`Are you sure you want to delete variant "${variantName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { supabase } = await import('../../../../lib/supabaseClient');
      
      const { error } = await supabase
        .from('lats_product_variants')
        .delete()
        .eq('id', variantId);

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === '23503') {
          toast.error('Cannot delete variant: it is referenced in orders or other records');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Variant deleted successfully!');
      
      // Refresh product data
      const refreshedProduct = await getProduct(product.id);
      if (refreshedProduct) {
        setCurrentProduct(refreshedProduct);
      }
    } catch (error: any) {
      console.error('Error deleting variant:', error);
      toast.error(`Failed to delete variant: ${error.message}`);
    }
  };

  const handleAddNewVariant = async () => {
    if (!newVariantData.name || !newVariantData.sku) {
      toast.error('Please fill in variant name and SKU');
      return;
    }

    try {
      const { supabase } = await import('../../../../lib/supabaseClient');
      
      const { error } = await supabase
        .from('lats_product_variants')
        .insert({
          product_id: product.id,
          name: newVariantData.name,
          sku: newVariantData.sku,
          cost_price: newVariantData.costPrice,
          selling_price: newVariantData.sellingPrice,
          quantity: newVariantData.quantity,
          min_quantity: newVariantData.minQuantity,
          is_active: true
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('SKU already exists. Please use a unique SKU.');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Variant added successfully!');
      setShowAddVariantForm(false);
      setNewVariantData({
        name: '',
        sku: '',
        costPrice: 0,
        sellingPrice: 0,
        quantity: 0,
        minQuantity: 2
      });
      
      // Refresh product data
      const refreshedProduct = await getProduct(product.id);
      if (refreshedProduct) {
        setCurrentProduct(refreshedProduct);
      }
    } catch (error: any) {
      console.error('Error adding variant:', error);
      toast.error(`Failed to add variant: ${error.message}`);
    }
  };

  // Stock adjustment functions
  const handleStockAdjustment = async () => {
    if (!selectedVariant || adjustmentQuantity === 0 || !adjustmentReason.trim()) {
      toast.error('Please select a variant, enter quantity, and provide a reason');
      return;
    }

    setIsAdjustingStock(true);
    try {
      const response = await adjustStock(
        product.id,
        selectedVariant.id,
        adjustmentQuantity,
        adjustmentReason
      );

      if (response.ok) {
        toast.success('Stock adjusted successfully');
        setShowStockAdjustment(false);
        setSelectedVariant(null);
        setAdjustmentQuantity(0);
        setAdjustmentReason('');
        
        // Refresh product data from database
        try {
          const updatedProductResponse = await getProduct(product.id);
          if (updatedProductResponse.ok && updatedProductResponse.data) {
            setCurrentProduct(updatedProductResponse.data);
          }
        } catch (error) {
        }
      } else {
        toast.error(response.message || 'Failed to adjust stock');
      }
    } catch (error) {
      toast.error('Failed to adjust stock');
    } finally {
      setIsAdjustingStock(false);
    }
  };


  const closeStockAdjustment = () => {
    setShowStockAdjustment(false);
  };

  return createPortal(
    <>
      {/* Backdrop - only covers main content area, stays below sidebar z-index (40) */}
      <div 
        className="fixed bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        style={{
          zIndex: 35,
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0
        }}
      />
      
      {/* Modal Container - above sidebar but positioned after it */}
      <div 
        className="fixed flex items-center justify-center p-2 sm:p-4 overflow-y-auto" 
        style={{ 
          zIndex: 50,
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          pointerEvents: 'none'
        }}
      >
        {/* Modal */}
        <div 
          className="relative bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col my-2 sm:my-4"
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
        {/* Minimal Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Package className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">{product.name}</h2>
              <p className="text-xs text-gray-500">{primaryVariant?.sku || 'No SKU'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex w-full">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Info</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('variants')}
              className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'variants'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Layers className="w-4 h-4" />
                <span>Variants</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('purchase-orders')}
              className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'purchase-orders'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Purchase Orders</span>
                <span className="sm:hidden">PO</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Details & Location</span>
                <span className="sm:hidden">Details</span>
              </div>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scroll-smooth relative"
        >
          {/* Scroll to Top Button */}
          {isScrolled && (
            <button
              onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-24 right-6 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50 group"
              title="Scroll to top"
            >
              <ArrowUp className="w-5 h-5 group-hover:animate-bounce" />
            </button>
          )}
          
          <div className="p-3 sm:p-4 pb-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column - Product Image & Basic Info */}
            <div className="space-y-4 sm:space-y-6">
              {/* Product Image */}
              <div className="space-y-3">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <div 
                  className={`aspect-square relative rounded-lg overflow-hidden bg-gray-50 border-2 border-dashed transition-all ${
                    images.length > 0 
                      ? 'border-gray-200' 
                      : isUploadingImage
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer'
                  }`}
                  onClick={images.length === 0 ? handleImageAreaClick : undefined}
                >
                  {images.length > 0 ? (
                    <>
                      {/* Check if the image is a PNG and add white background */}
                      {(() => {
                        const currentImage = images[selectedImageIndex] || images[0];
                        const imageUrl = currentImage?.thumbnailUrl || currentImage?.url;
                        
                        console.log('🖼️ Displaying image:', { 
                          selectedImageIndex, 
                          imageUrl: imageUrl?.substring(0, 100),
                          totalImages: images.length 
                        });
                        
                        const isPngImage = imageUrl && (imageUrl.includes('.png') || imageUrl.includes('image/png'));
                        return isPngImage ? <div className="absolute inset-0 bg-white" /> : null;
                      })()}
                      <img
                        src={images[selectedImageIndex]?.thumbnailUrl || images[selectedImageIndex]?.url || images[0]?.thumbnailUrl || images[0]?.url}
                        alt={product.name}
                        className="w-full h-full object-contain relative z-10"
                        onLoad={(e) => console.log('✅ Image loaded successfully:', e.currentTarget.src?.substring(0, 100))}
                        onError={(e) => {
                          console.error('❌ Image failed to load:', e.currentTarget.src?.substring(0, 100));
                          // Fallback to placeholder on error
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group hover:text-blue-500 transition-colors">
                      {isUploadingImage ? (
                        <>
                          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                          <p className="text-sm font-medium text-blue-600">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Package className="w-20 h-20 mb-3 group-hover:scale-110 transition-transform" />
                          <p className="text-sm font-medium group-hover:text-blue-600">Click to upload thumbnail</p>
                          <p className="text-xs mt-1 text-gray-400">PNG, JPG, WEBP (Max 10MB)</p>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Add image button overlay for when images exist */}
                  {images.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageAreaClick();
                      }}
                      disabled={isUploadingImage}
                      className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm hover:bg-blue-500 hover:text-white text-gray-700 p-2 rounded-full shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Upload new image"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                {/* Image Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all relative ${
                          index === selectedImageIndex 
                            ? 'border-blue-500' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Check if the thumbnail is a PNG and add white background */}
                        {(() => {
                          const imageUrl = image.thumbnailUrl || image.url;
                          const isPngImage = imageUrl && (imageUrl.includes('.png') || imageUrl.includes('image/png'));
                          return isPngImage ? <div className="absolute inset-0 bg-white" /> : null;
                        })()}
                        <img
                          src={image.thumbnailUrl || image.url}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover relative z-10"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Basic Information */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Basic Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Category</span>
                    <p className="text-sm font-medium text-gray-900">{currentProduct.category?.name || 'Uncategorized'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Status</span>
                    <p className={`text-sm font-medium ${product.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Product ID</span>
                    <p className="text-sm font-medium text-gray-900 font-mono">{product.id}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total Variants</span>
                    <p className="text-sm font-medium text-gray-900">{product.variants?.length || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total Stock</span>
                    <p className="text-sm font-medium text-gray-900">{currentProduct.totalQuantity || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Images</span>
                    <p className="text-sm font-medium text-gray-900">{images.length} photo{images.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>

              {/* Product Specifications - Simplified */}
              {Object.keys(specifications).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Specifications</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(specifications).slice(0, 6).map(([key, value]) => {
                      const formattedValue = formatSpecificationValue(key, value);
                      return (
                        <div key={key} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="text-sm font-semibold text-gray-900">{formattedValue}</span>
                        </div>
                      );
                    })}
                    {Object.keys(specifications).length > 6 && (
                      <div className="text-xs text-gray-500 text-center py-2">
                        +{Object.keys(specifications).length - 6} more specifications
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {product.description && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Description</h3>
                  <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
                    {product.description}
                  </div>
                </div>
              )}


            </div>

            {/* Right Column - Essential Information & Actions */}
            <div className="space-y-6">






              {/* Pricing Summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Pricing Summary</h3>
                  </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Primary Price</span>
                    <p className="text-lg font-bold text-green-600">{format.money(primaryVariant?.sellingPrice || 0)}</p>
                </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Cost Price</span>
                    <p className="text-lg font-bold text-red-600">{format.money(primaryVariant?.costPrice || 0)}</p>
                    </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Profit/Unit</span>
                    <p className="text-lg font-bold text-blue-600">
                      {format.money((primaryVariant?.sellingPrice || 0) - (primaryVariant?.costPrice || 0))}
                    </p>
                    </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Markup</span>
                    <p className="text-lg font-bold text-purple-600">
                      {primaryVariant?.costPrice > 0 
                        ? `${(((primaryVariant.sellingPrice - primaryVariant.costPrice) / primaryVariant.costPrice) * 100).toFixed(1)}%`
                        : 'N/A'
                      }
                    </p>
                </div>
                  <div className="col-span-2 space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total Value</span>
                    <p className="text-xl font-bold text-orange-600">
                      {format.money((primaryVariant?.sellingPrice || 0) * (currentProduct.totalQuantity || 0))}
                    </p>
                    </div>
                  </div>
                  </div>

              {/* Product Variants - Simplified */}
              {product.variants && product.variants.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Layers className="w-5 h-5 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Product Variants</h3>
                    </div>
                  <div className="space-y-2">
                    {product.variants.slice(0, 3).map((variant, index) => (
                      <div key={variant.id || index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900">{variant.name || `Variant ${index + 1}`}</span>
                          <span className="text-xs text-gray-500">({variant.sku})</span>
                  </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-600">Stock: {variant.quantity || variant.stockQuantity || 0}</span>
                          <span className="font-semibold text-gray-900">{format.money(variant.sellingPrice || variant.price || 0)}</span>
                        </div>
                        </div>
                    ))}
                    {product.variants.length > 3 && (
                      <div className="text-xs text-gray-500 text-center py-2 bg-gray-50 rounded-lg">
                        +{product.variants.length - 3} more variants
                      </div>
                    )}
                  </div>
                    </div>
              )}

              {/* Supplier Information - Minimal */}
              {currentProduct.supplier && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Building className="w-5 h-5 text-orange-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Supplier Information</h3>
                      </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Name</span>
                      <p className="text-sm font-medium text-gray-900">{currentProduct.supplier.name}</p>
                    </div>
                    {currentProduct.supplier.contactPerson && (
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Contact</span>
                        <p className="text-sm font-medium text-gray-900">{currentProduct.supplier.contactPerson}</p>
                        </div>
                    )}
                    {currentProduct.supplier.phone && (
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Phone</span>
                        <p className="text-sm font-medium text-gray-900">{currentProduct.supplier.phone}</p>
                        </div>
                    )}
                    {currentProduct.supplier.email && (
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Email</span>
                        <p className="text-sm font-medium text-gray-900">{currentProduct.supplier.email}</p>
                        </div>
                    )}
                        </div>
                  </div>
              )}

              {/* Product Status - Enhanced */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Status & Details</h3>
                  </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Condition</span>
                    <p className="text-sm font-medium text-gray-900 capitalize">{(product as any).condition || 'New'}</p>
                </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Min Stock Level</span>
                    <p className="text-sm font-medium text-gray-900">
                        {currentProduct.variants && currentProduct.variants.length > 0 
                          ? Math.min(...currentProduct.variants.map(v => v.minQuantity || 0))
                          : 0
                        }
                    </p>
                    </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Low Stock Variants</span>
                    <p className="text-sm font-medium text-orange-600">
                      {product.variants ? product.variants.filter(v => (v.quantity || 0) <= (v.minQuantity || 0)).length : 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Out of Stock</span>
                    <p className="text-sm font-medium text-red-600">
                      {product.variants ? product.variants.filter(v => (v.quantity || 0) <= 0).length : 0}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Primary Variant</span>
                    <p className="text-sm font-medium text-gray-900">
                      {product.variants?.find(v => v.isPrimary)?.name || product.variants?.[0]?.name || 'None'}
                    </p>
                  </div>
                  {(product as any).tags && (product as any).tags.length > 0 && (
                    <div className="col-span-2 space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Tags</span>
                        <div className="flex flex-wrap gap-1">
                          {(product as any).tags.map((tag: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {tag}
                          </span>
                          ))}
                        </div>
                      </div>
                  )}
                      </div>
                </div>

                  </div>
                </div>
              </>
            )}

            {/* Purchase Orders Tab */}
            {activeTab === 'purchase-orders' && (
              <div className="space-y-4">
                {/* Purchase Order Statistics Overview */}
                {isLoadingPOHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading purchase order history...</p>
                    </div>
                  </div>
                ) : !poStats || purchaseOrderHistory.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                    <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Purchase Orders Found</h3>
                    <p className="text-sm text-gray-500 mb-4">This product has no purchase order history yet.</p>
                    <p className="text-xs text-gray-400">Purchase orders will appear here once the product is ordered from suppliers.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-green-600" />
                        <h3 className="text-sm font-semibold text-gray-800">Purchase Order History</h3>
                      </div>
                      <button
                        onClick={() => setShowPOHistory(!showPOHistory)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {showPOHistory ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>

                    {/* Statistics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Total Orders Card */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center gap-1 mb-1">
                          <BarChart3 className="w-3 h-3 text-blue-600" />
                          <span className="text-xs font-medium text-blue-700">Total Orders</span>
                        </div>
                        <div className="text-xl font-bold text-blue-900">{poStats.totalOrders}</div>
                      </div>

                      {/* Total Quantity Card */}
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                        <div className="flex items-center gap-1 mb-1">
                          <ShoppingCart className="w-3 h-3 text-purple-600" />
                          <span className="text-xs font-medium text-purple-700">Ordered</span>
                        </div>
                        <div className="text-xl font-bold text-purple-900">{poStats.totalQuantityOrdered}</div>
                        <div className="text-xs text-purple-600">Received: {poStats.totalQuantityReceived}</div>
                      </div>

                      {/* Average Cost Card */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center gap-1 mb-1">
                          <DollarSign className="w-3 h-3 text-green-600" />
                          <span className="text-xs font-medium text-green-700">Avg Cost</span>
                        </div>
                        <div className="text-base font-bold text-green-900">
                          {format.money(poStats.averageCostPrice)}
                        </div>
                      </div>

                      {/* Last Order Card */}
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 border border-amber-200">
                        <div className="flex items-center gap-1 mb-1">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          <span className="text-xs font-medium text-amber-700">Last Order</span>
                        </div>
                        <div className="text-xs font-bold text-amber-900">
                          {poStats.lastOrderDate ? new Date(poStats.lastOrderDate).toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric'
                          }) : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Price Range */}
                    {poStats.lowestCostPrice && poStats.highestCostPrice && (
                      <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700">Price Range</span>
                          {poStats.lastCostPrice && (
                            <div className="flex items-center gap-1">
                              {poStats.lastCostPrice < poStats.averageCostPrice ? (
                                <>
                                  <TrendingDown className="w-3 h-3 text-green-600" />
                                  <span className="text-xs text-green-600 font-medium">Below avg</span>
                                </>
                              ) : (
                                <>
                                  <TrendingUp className="w-3 h-3 text-red-600" />
                                  <span className="text-xs text-red-600 font-medium">Above avg</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <div className="text-xs text-gray-500">Lowest</div>
                            <div className="font-bold text-green-700">{format.money(poStats.lowestCostPrice)}</div>
                          </div>
                          <div className="flex-1 mx-3">
                            <div className="h-2 bg-gradient-to-r from-green-300 via-yellow-300 to-red-300 rounded-full"></div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Highest</div>
                            <div className="font-bold text-red-700">{format.money(poStats.highestCostPrice)}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recent Orders List */}
                    {showPOHistory && purchaseOrderHistory.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto border-t border-gray-100 pt-3">
                        <div className="text-xs font-medium text-gray-700 mb-2">
                          Recent Orders ({purchaseOrderHistory.length})
                        </div>
                        {purchaseOrderHistory.map((order) => (
                          <div
                            key={order.id}
                            className="bg-white rounded-lg border border-gray-200 p-3 hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-xs font-medium text-blue-600">
                                #{order.orderNumber}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                order.poStatus === 'completed' || order.poStatus === 'received' 
                                  ? 'bg-green-100 text-green-700'
                                  : order.poStatus === 'cancelled' 
                                  ? 'bg-red-100 text-red-700'
                                  : order.poStatus === 'shipped' || order.poStatus === 'partial_received'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {order.poStatus.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Supplier:</span>
                                <div className="font-medium text-gray-800 truncate">{order.supplierName}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Date:</span>
                                <div className="font-medium text-gray-800">
                                  {new Date(order.orderDate).toLocaleDateString('en-US', {
                                    month: 'numeric',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Ordered:</span>
                                <div className="font-medium text-gray-800">{order.quantity} units</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Received:</span>
                                <div className="font-medium text-gray-800">
                                  {order.receivedQuantity} units
                                  {order.receivedQuantity === order.quantity && (
                                    <CheckCircle2 className="w-3 h-3 text-green-600 inline ml-1" />
                                  )}
                                </div>
                              </div>
                              <div className="col-span-2">
                                <span className="text-gray-500">Cost:</span>
                                <div className="font-bold text-gray-900">
                                  {format.money(order.costPrice)} per unit
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Product Identification */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                 <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                   <Hash className="w-5 h-5 text-purple-600" />
                   <h3 className="text-sm font-semibold text-gray-800">Product Identification</h3>
                          </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                     <span className="text-xs text-gray-500 uppercase tracking-wide">Product SKU</span>
                     <p className="text-sm font-medium text-gray-900 font-mono">{primaryVariant?.sku || 'N/A'}</p>
                   </div>
                   {(product as any).barcode && (
                     <div className="space-y-1">
                       <span className="text-xs text-gray-500 uppercase tracking-wide">Barcode</span>
                       <p className="text-sm font-medium text-gray-900 font-mono">{(product as any).barcode}</p>
                     </div>
                   )}
                   <div className="space-y-1">
                     <span className="text-xs text-gray-500 uppercase tracking-wide">Product ID</span>
                     <p className="text-sm font-medium text-gray-900 font-mono">{product.id}</p>
                   </div>
                   {(product as any).specification && (
                     <div className="space-y-1">
                       <span className="text-xs text-gray-500 uppercase tracking-wide">Specification Code</span>
                       <p className="text-sm font-medium text-gray-900">{(product as any).specification}</p>
                    </div>
                  )}
                 </div>
                 <div className="flex gap-3 pt-3">
                   <button
                     onClick={handleGenerateQRCode}
                     className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                   >
                     <QrCode className="w-4 h-4" />
                     Generate QR Code
                   </button>
                   <button
                     onClick={() => {
                       if ((product as any).barcode) {
                         navigator.clipboard.writeText((product as any).barcode);
                         toast.success('Barcode copied to clipboard!');
                       }
                     }}
                     className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
                   >
                     <Copy className="w-4 h-4" />
                     Copy Barcode
                   </button>
                      </div>
               </div>

               {/* Storage & Location Information */}
               <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                 <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                   <div className="flex items-center gap-2">
                     <MapPin className="w-5 h-5 text-blue-600" />
                     <h3 className="text-sm font-semibold text-gray-800">Storage & Location</h3>
                   </div>
                   <button
                     onClick={() => setShowStorageLocationModal(true)}
                     className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                   >
                     <Edit className="w-3.5 h-3.5" />
                     Edit Location
                   </button>
                 </div>
                 {((product as any).storageRoomName || (product as any).shelfName || (product as any).storeLocationName) ? (
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                     {(product as any).storageRoomName && (
                       <div className="space-y-1">
                         <span className="text-xs text-gray-500 uppercase tracking-wide">Storage Room</span>
                         <p className="text-sm font-medium text-gray-900">{(product as any).storageRoomName}</p>
                       </div>
                     )}
                     {(product as any).shelfName && (
                       <div className="space-y-1">
                         <span className="text-xs text-gray-500 uppercase tracking-wide">Shelf Name</span>
                         <p className="text-sm font-medium text-gray-900">{(product as any).shelfName}</p>
                              </div>
                     )}
                     {(product as any).storeLocationName && (
                       <div className="space-y-1">
                         <span className="text-xs text-gray-500 uppercase tracking-wide">Store Location</span>
                         <p className="text-sm font-medium text-gray-900">{(product as any).storeLocationName}</p>
                              </div>
                     )}
                     {(product as any).isRefrigerated !== undefined && (
                       <div className="space-y-1">
                         <span className="text-xs text-gray-500 uppercase tracking-wide">Storage Type</span>
                         <p className="text-sm font-medium text-gray-900">
                           {(product as any).isRefrigerated ? 'Refrigerated' : 'Room Temperature'}
                         </p>
                        </div>
                     )}
                     {(product as any).requiresLadder !== undefined && (
                       <div className="space-y-1">
                         <span className="text-xs text-gray-500 uppercase tracking-wide">Access Requirements</span>
                         <p className="text-sm font-medium text-gray-900">
                           {(product as any).requiresLadder ? 'Requires Ladder' : 'Ground Level'}
                         </p>
                      </div>
                    )}
                   </div>
                 ) : (
                   <div className="text-center py-6">
                     <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                     <p className="text-sm text-gray-500">No storage location assigned</p>
                     <p className="text-xs text-gray-400 mt-1">Click "Edit Location" to assign a storage location</p>
                   </div>
                 )}
               </div>

               {/* Additional Information Sections - Minimal Design */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shipping & Physical Information */}
            {(product.weight || product.length || product.width || product.height || product.shippingClass || product.requiresSpecialHandling) && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Physical & Shipping</h3>
                    </div>
                <div className="grid grid-cols-2 gap-3">
                  {product.weight && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Weight</span>
                      <p className="text-sm font-medium text-gray-900">{product.weight} kg</p>
                  </div>
                  )}
                  {product.length && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Length</span>
                      <p className="text-sm font-medium text-gray-900">{product.length} cm</p>
                        </div>
                  )}
                  {product.width && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Width</span>
                      <p className="text-sm font-medium text-gray-900">{product.width} cm</p>
                        </div>
                  )}
                  {product.height && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Height</span>
                      <p className="text-sm font-medium text-gray-900">{product.height} cm</p>
                        </div>
                  )}
                  {product.shippingClass && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Shipping Class</span>
                      <p className="text-sm font-medium text-gray-900 capitalize">{product.shippingClass}</p>
                        </div>
                    )}
                  {product.requiresSpecialHandling && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Special Handling</span>
                      <p className="text-sm font-medium text-orange-600">Required</p>
                  </div>
                  )}
                </div>
              </div>
              )}


              {/* Shipping Status */}
              {(product.shippingStatus || product.trackingNumber || product.expectedDelivery) && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Package className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Shipping Status</h3>
                    </div>
                <div className="grid grid-cols-2 gap-3">
                    {product.shippingStatus && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Status</span>
                      <p className={`text-sm font-medium ${
                        product.shippingStatus === 'delivered' ? 'text-green-600' :
                        product.shippingStatus === 'in_transit' ? 'text-blue-600' :
                        product.shippingStatus === 'exception' ? 'text-red-600' : 'text-orange-600'
                      }`}>
                            {product.shippingStatus.replace('_', ' ').charAt(0).toUpperCase() + product.shippingStatus.replace('_', ' ').slice(1)}
                      </p>
                        </div>
                    )}
                    {product.trackingNumber && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Tracking</span>
                      <p className="text-sm font-medium text-gray-900 font-mono">{product.trackingNumber}</p>
                        </div>
                    )}
                    {product.expectedDelivery && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Expected Delivery</span>
                      <p className="text-sm font-medium text-gray-900">
                            {new Date(product.expectedDelivery).toLocaleDateString()}
                      </p>
                        </div>
                    )}
                    {product.shippingAgent && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Agent</span>
                      <p className="text-sm font-medium text-gray-900">{product.shippingAgent}</p>
                        </div>
                    )}
                        </div>
                  </div>
            )}

            {/* Multi-Currency Pricing */}
            {(product.usdPrice || product.eurPrice) && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Banknote className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Multi-Currency</h3>
                    </div>
                <div className="grid grid-cols-2 gap-3">
                  {product.usdPrice && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">USD Price</span>
                      <p className="text-sm font-medium text-gray-900">${product.usdPrice.toFixed(2)}</p>
                  </div>
                  )}
                  {product.eurPrice && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">EUR Price</span>
                      <p className="text-sm font-medium text-gray-900">€{product.eurPrice.toFixed(2)}</p>
                        </div>
                  )}
                  {product.exchangeRate && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Exchange Rate</span>
                      <p className="text-sm font-medium text-gray-900">{product.exchangeRate.toFixed(4)}</p>
                          </div>
                    )}
                  {product.baseCurrency && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Base Currency</span>
                      <p className="text-sm font-medium text-gray-900">{product.baseCurrency.toUpperCase()}</p>
                  </div>
                  )}
                    </div>
                  </div>
            )}

            {/* Product Metadata */}
            {((product as any).isDigital || (product as any).requiresShipping !== undefined || (product as any).isFeatured || (product as any).weight) && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Product Metadata</h3>
                            </div>
                <div className="grid grid-cols-2 gap-3">
                  {(product as any).isDigital && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Type</span>
                      <p className="text-sm font-medium text-blue-600">Digital Product</p>
                            </div>
                  )}
                  {(product as any).requiresShipping !== undefined && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Shipping</span>
                      <p className="text-sm font-medium text-gray-900">
                        {(product as any).requiresShipping ? 'Required' : 'Not Required'}
                      </p>
                            </div>
                          )}
                  {(product as any).isFeatured && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Featured</span>
                      <p className="text-sm font-medium text-yellow-600">Yes</p>
                        </div>
                  )}
                    </div>
                  </div>
              )}








                </div>
              </div>
            )}

            {/* Variants Tab */}
            {activeTab === 'variants' && (
              <div className="space-y-6">
                {/* Add New Variant Button */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Manage Variants ({currentProduct.variants?.length || 0})</h3>
                  <button
                    onClick={() => setShowAddVariantForm(!showAddVariantForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Variant
                  </button>
                </div>

                {/* Add New Variant Form */}
                {showAddVariantForm && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-blue-600" />
                      Add New Variant
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Variant Name*</label>
                        <input
                          type="text"
                          value={newVariantData.name}
                          onChange={(e) => setNewVariantData({ ...newVariantData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 256GB Blue"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SKU*</label>
                        <input
                          type="text"
                          value={newVariantData.sku}
                          onChange={(e) => setNewVariantData({ ...newVariantData, sku: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., PROD-001-256-BLU"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                        <input
                          type="number"
                          value={newVariantData.costPrice}
                          onChange={(e) => setNewVariantData({ ...newVariantData, costPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                        <input
                          type="number"
                          value={newVariantData.sellingPrice}
                          onChange={(e) => setNewVariantData({ ...newVariantData, sellingPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                        <input
                          type="number"
                          value={newVariantData.quantity}
                          onChange={(e) => setNewVariantData({ ...newVariantData, quantity: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                        <input
                          type="number"
                          value={newVariantData.minQuantity}
                          onChange={(e) => setNewVariantData({ ...newVariantData, minQuantity: parseInt(e.target.value) || 2 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="2"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddNewVariant}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        <Save className="w-4 h-4" />
                        Save Variant
                      </button>
                      <button
                        onClick={() => {
                          setShowAddVariantForm(false);
                          setNewVariantData({ name: '', sku: '', costPrice: 0, sellingPrice: 0, quantity: 0, minQuantity: 2 });
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Complete Variant Table */}
                {currentProduct.variants && currentProduct.variants.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Layers className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Variant List</h3>
                    </div>
                    <div className="overflow-x-auto -mx-4 px-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left p-3 font-medium text-gray-700">Variant Name</th>
                            <th className="text-left p-3 font-medium text-gray-700 hidden sm:table-cell">SKU</th>
                            <th className="text-left p-3 font-medium text-gray-700">Stock</th>
                            <th className="text-left p-3 font-medium text-gray-700 hidden md:table-cell">Min Level</th>
                            <th className="text-left p-3 font-medium text-gray-700 hidden lg:table-cell">Cost Price</th>
                            <th className="text-left p-3 font-medium text-gray-700">Selling Price</th>
                            <th className="text-left p-3 font-medium text-gray-700 hidden lg:table-cell">Markup</th>
                            <th className="text-left p-3 font-medium text-gray-700">Status</th>
                            <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentProduct.variants.map((variant) => {
                            const markup = variant.costPrice > 0 ? ((variant.sellingPrice - variant.costPrice) / variant.costPrice * 100) : 0;
                            const isEditing = editingVariantId === variant.id;
                            
                            if (isEditing && editingVariantData) {
                              return (
                                <tr key={variant.id} className="border-b border-gray-100 bg-blue-50">
                                  <td className="p-3">
                                    <input
                                      type="text"
                                      value={editingVariantData.name}
                                      onChange={(e) => setEditingVariantData({ ...editingVariantData, name: e.target.value })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                  <td className="p-3 hidden sm:table-cell">
                                    <input
                                      type="text"
                                      value={editingVariantData.sku}
                                      onChange={(e) => setEditingVariantData({ ...editingVariantData, sku: e.target.value })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <input
                                      type="number"
                                      value={editingVariantData.quantity}
                                      onChange={(e) => setEditingVariantData({ ...editingVariantData, quantity: parseInt(e.target.value) || 0 })}
                                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                  <td className="p-3 hidden md:table-cell">
                                    <input
                                      type="number"
                                      value={editingVariantData.minQuantity}
                                      onChange={(e) => setEditingVariantData({ ...editingVariantData, minQuantity: parseInt(e.target.value) || 0 })}
                                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                  <td className="p-3 hidden lg:table-cell">
                                    <input
                                      type="number"
                                      value={editingVariantData.costPrice}
                                      onChange={(e) => setEditingVariantData({ ...editingVariantData, costPrice: parseFloat(e.target.value) || 0 })}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                      step="0.01"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <input
                                      type="number"
                                      value={editingVariantData.sellingPrice}
                                      onChange={(e) => setEditingVariantData({ ...editingVariantData, sellingPrice: parseFloat(e.target.value) || 0 })}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                      step="0.01"
                                    />
                                  </td>
                                  <td className="p-3 hidden lg:table-cell">-</td>
                                  <td className="p-3">-</td>
                                  <td className="p-3">
                                    <div className="flex gap-1">
                                      <button
                                        onClick={handleSaveVariant}
                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                        title="Save"
                                      >
                                        <Save className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={handleCancelEditVariant}
                                        className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                                        title="Cancel"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                          
                          return (
                            <tr key={variant.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {variant.isPrimary && <Star className="w-4 h-4 text-yellow-500" />}
                                  <div>
                                    <span className="font-medium text-sm">{variant.name}</span>
                                    <p className="text-xs text-gray-500 sm:hidden">{variant.sku}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-xs hidden sm:table-cell">{variant.sku}</td>
                              <td className="p-3">
                                <span className={`font-medium text-sm ${
                                  variant.quantity <= 0 ? 'text-red-600' : 
                                  variant.quantity <= variant.minQuantity ? 'text-orange-600' : 'text-green-600'
                                }`}>
                                  {variant.quantity}
                                </span>
                              </td>
                              <td className="p-3 text-gray-600 text-sm hidden md:table-cell">{variant.minQuantity}</td>
                              <td className="p-3 font-medium text-sm hidden lg:table-cell">{format.money(variant.costPrice)}</td>
                              <td className="p-3 font-medium text-sm">{format.money(variant.sellingPrice)}</td>
                              <td className="p-3 hidden lg:table-cell">
                                <span className={`font-medium text-sm ${markup > 50 ? 'text-green-600' : markup > 20 ? 'text-orange-600' : 'text-red-600'}`}>
                                  {markup.toFixed(1)}%
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  variant.quantity > variant.minQuantity ? 'bg-green-100 text-green-700' : 
                                  variant.quantity > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {variant.quantity > variant.minQuantity ? 'Good' : variant.quantity > 0 ? 'Low' : 'Empty'}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditVariant(variant)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit variant"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVariant(variant.id, variant.name)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Delete variant"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {(!currentProduct.variants || currentProduct.variants.length === 0) && !showAddVariantForm && (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">No variants found for this product</p>
                    <button
                      onClick={() => setShowAddVariantForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Variant
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className={`flex-shrink-0 border-t border-gray-200 bg-white p-3 sm:p-4 transition-shadow duration-200 ${
          isScrolled ? 'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' : ''
        }`}>
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <button
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Add to POS</span>
            </button>
            
            <button
              onClick={handleGenerateQRCode}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>QR Code</span>
            </button>

            <button
              onClick={handleExportProduct}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            
            {onEdit && (
              <button
                onClick={() => onEdit(product)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* QR Code Modal */}
        {showQRModal && createPortal(
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 100000 }}>
            <div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowQRModal(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Product QR Code</h3>
                <button 
                  onClick={() => setShowQRModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="text-center space-y-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
                  <img 
                    src={qrCodeUrl} 
                    alt="Product QR Code"
                    className="w-64 h-64 object-contain"
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{product.name}</p>
                  <p>SKU: {primaryVariant?.sku}</p>
                  <p>Price: {format.money(primaryVariant?.sellingPrice || 0)}</p>
                </div>

                <div className="flex gap-2">
                  <GlassButton
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = qrCodeUrl;
                      link.download = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_QR.png`;
                      link.click();
                      toast.success('QR Code downloaded!');
                    }}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </GlassButton>
                  
                  <GlassButton
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/lats/products/${product.id}/edit`);
                      toast.success('Product link copied!');
                    }}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </GlassButton>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Enhanced Stock Adjustment Modal */}
        {showStockAdjustment && (
          <EnhancedStockAdjustModal
            product={currentProduct}
            isOpen={showStockAdjustment}
            onClose={closeStockAdjustment}
            onSubmit={async (data) => {
              const { variant, ...adjustmentData } = data;
              let quantity = adjustmentData.quantity;
              
              // Calculate the actual quantity change based on adjustment type
              if (adjustmentData.adjustmentType === 'out') {
                quantity = -quantity; // Negative for stock out
              } else if (adjustmentData.adjustmentType === 'set') {
                quantity = quantity - variant.quantity; // Difference for set
              }
              
              await handleStockAdjustment();
            }}
            loading={isAdjustingStock}
          />
        )}

        {/* Storage Location Modal */}
        {showStorageLocationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[85vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <MapPin size={20} className="text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">Assign Storage Location</h2>
                </div>
                <button
                  onClick={() => setShowStorageLocationModal(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto max-h-[calc(85vh-140px)]">
                <StorageLocationForm
                  formData={storageLocationData}
                  setFormData={setStorageLocationData}
                  currentErrors={{}}
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowStorageLocationModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded"
                  disabled={isSavingStorageLocation}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStorageLocation}
                  disabled={isSavingStorageLocation || !storageLocationData.storageRoomId || !storageLocationData.shelfId}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSavingStorageLocation ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Location
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </>,
    document.body
  );
};

export default GeneralProductDetailModal;