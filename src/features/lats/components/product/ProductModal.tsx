import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  X, Package, Hash, DollarSign, Edit, Star, MapPin, Calendar, 
  TrendingUp, TrendingDown, BarChart3, CheckCircle,
  FileText, Layers, Truck, QrCode, ShoppingCart,
  Target, Banknote, Receipt, 
  Copy, Download, Building,
  Info, CheckCircle2, ArrowUp, Plus, Trash2, Save, ChevronDown, ChevronUp,
  Percent, BarChart, LineChart,
  Box, Warehouse, AlertTriangle, AlertCircle, History, Smartphone, Users, CreditCard
} from 'lucide-react';
import GlassButton from '../../../shared/components/ui/GlassButton';
import { Product } from '../../types/inventory';
import { RobustImageService, ProductImage } from '../../../../lib/robustImageService';
import { format } from '../../lib/format';
import CircularProgress from '../../../../components/ui/CircularProgress';
import { formatSpecificationValue, parseSpecification } from '../../lib/specificationUtils';
import { exportProductData } from '../../lib/productUtils';
import {
  getVariantDisplayName,
  isTradeInVariant,
  getVariantIdentifier,
  getVariantSourceBadge,
  formatVariantAttributesForDisplay,
  isTradeInProduct
} from '../../lib/variantUtils';
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
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import VariantHierarchyDisplay from './VariantHierarchyDisplay';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onEdit?: (product: Product) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onEdit
}) => {
  const navigate = useNavigate();
  const { adjustStock, getProduct } = useInventoryStore();
  
  // Initialize with product directly - minimal processing
  const [currentProduct, setCurrentProduct] = useState(product);
  
  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);
  
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

  // Debug mode state
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Variant expansion state
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null);

  // Tab state - MUST be declared before useEffect that uses it
  const [activeTab, setActiveTab] = useState('overview');
  
  // Track which tabs have been loaded (for lazy loading)
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']));
  
  // Purchase order history lazy loading state - MUST be declared before useEffect that uses it
  const [shouldLoadHistory, setShouldLoadHistory] = useState(false);

  // Update current product when prop changes - runs immediately
  useEffect(() => {
    if (!isOpen || !product) {
      // Reset loaded tabs when modal closes
      if (!isOpen) {
        setLoadedTabs(new Set(['overview']));
        setActiveTab('overview');
        setIsCalculating(true);
        setAnalytics(null);
        setPrimaryVariant(null);
        setSpecifications({});
      }
      return;
    }
    
    // Calculate totalQuantity: Use database value (which includes all variants including IMEI children)
    // Only calculate from variants if we have variants AND the calculated value is greater than 0
    // This ensures we show the correct total even when IMEI children are filtered out
    const variantCalculatedTotal = product?.variants && product.variants.length > 0
      ? product.variants.reduce((sum: number, variant: any) => {
          return sum + (variant.quantity || 0);
        }, 0)
      : 0;
    
    // Use database totalQuantity (includes all variants) if it's available and different from calculated
    // This handles cases where IMEI children are filtered out but their stock should be included
    const calculatedTotalQuantity = (product?.totalQuantity || product?.total_quantity || product?.stockQuantity || product?.stock_quantity || 0) > variantCalculatedTotal
      ? (product?.totalQuantity || product?.total_quantity || product?.stockQuantity || product?.stock_quantity || 0)
      : variantCalculatedTotal;
    
    // Set product with correct total - synchronous update
    const updatedProduct = {
      ...product,
      totalQuantity: calculatedTotalQuantity
    };
    
    setCurrentProduct(updatedProduct);
    
    // Initialize interactive selected variant
    if (product.variants && product.variants.length > 0) {
      setInteractiveSelectedVariant(product.variants[0]);
    }
  }, [product?.id, isOpen]); // Use product.id to avoid unnecessary recalcs
  
  // Lazy load history when purchase-orders tab is active
  useEffect(() => {
    if (activeTab === 'purchase-orders' && !shouldLoadHistory) {
      setShouldLoadHistory(true);
    }
  }, [activeTab, shouldLoadHistory]);
  
  // Handle tab change with lazy loading
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setLoadedTabs(prev => new Set([...prev, tab]));
  };

  // Listen for product data updates
  useEffect(() => {
    const handleProductUpdate = (event: CustomEvent) => {
      const { updatedProducts } = event.detail;
      if (product && updatedProducts.includes(product.id)) {
        setCurrentProduct({ ...product });
      }
    };

    window.addEventListener('productDataUpdated', handleProductUpdate as EventListener);
    
    return () => {
      window.removeEventListener('productDataUpdated', handleProductUpdate as EventListener);
    };
  }, [product]);

  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Purchase order history tracking - LAZY LOADED
  const { history: purchaseOrderHistory, stats: poStats, isLoading: isLoadingPOHistory } = usePurchaseOrderHistory(shouldLoadHistory ? product?.id : undefined);
  const [showPOHistory, setShowPOHistory] = useState(false);
  
  // Scroll shadow state
  const [isScrolled, setIsScrolled] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Debug mode state
  const [showDebug, setShowDebug] = useState(false);
  
  // Image gallery state
  const [showImageGallery, setShowImageGallery] = useState(false);
  
  // Selected variant for interactive selection - Initialize immediately
  const [interactiveSelectedVariant, setInteractiveSelectedVariant] = useState<any>(() => 
    product?.variants && product.variants.length > 0 ? product.variants[0] : null
  );

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

  // Load product images - Load immediately when modal opens
  useEffect(() => {
    const loadImages = async () => {
      if (!product?.id) return;
      
      try {
        setIsLoadingImages(true);
        const productImages = await RobustImageService.getProductImages(product.id);
        setImages(productImages);
      } catch (error) {
        console.error('Error loading images:', error);
      } finally {
        setIsLoadingImages(false);
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
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        setIsUploadingImage(false);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        setIsUploadingImage(false);
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

      const result = await RobustImageService.uploadImage(
        file,
        product.id,
        userId,
        images.length === 0
      );

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      const updatedImages = await RobustImageService.getProductImages(product.id);
      setImages(updatedImages);
      
      toast.success('Image uploaded successfully!', { id: 'image-upload' });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      toast.error(errorMessage, { id: 'image-upload' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageAreaClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle image deletion
  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      toast.loading('Deleting image...', { id: 'delete-image' });

      // Delete from database
      const { error: dbError } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      // Delete from storage
      const imageToDelete = images.find(img => img.id === imageId);
      if (imageToDelete?.url) {
        const imagePath = imageToDelete.url.split('/').pop();
        if (imagePath) {
          const { error: storageError } = await supabase.storage
            .from('product-images')
            .remove([imagePath]);
          
          if (storageError) {
            console.warn('Storage deletion error:', storageError);
          }
        }
      }

      // Update local state
      const updatedImages = images.filter(img => img.id !== imageId);
      setImages(updatedImages);
      
      // If deleted image was selected, select first image
      if (selectedImageIndex >= updatedImages.length) {
        setSelectedImageIndex(Math.max(0, updatedImages.length - 1));
      }

      toast.success('Image deleted successfully!', { id: 'delete-image' });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image', { id: 'delete-image' });
    }
  };

  // Deferred data loading states
  const [analytics, setAnalytics] = useState<any>(null);
  const [primaryVariant, setPrimaryVariant] = useState<any>(null);
  const [specifications, setSpecifications] = useState<any>({});
  const [isCalculating, setIsCalculating] = useState(true);

  // Calculate analytics asynchronously after modal opens
  useEffect(() => {
    if (!isOpen || !product?.variants) return;
    
    setIsCalculating(true);
    
    // Use requestIdleCallback or setTimeout to defer calculations
    const timeoutId = setTimeout(() => {
      // Calculate primary variant
      let selectedVariant = null;
      if (product.variants.length > 0) {
        const variantWithStock = product.variants.find(v => (v.quantity || 0) > 0);
        if (variantWithStock) {
          selectedVariant = variantWithStock;
        } else {
          const variantWithPrice = [...product.variants]
            .sort((a, b) => (b.sellingPrice || 0) - (a.sellingPrice || 0))[0];
          selectedVariant = variantWithPrice?.sellingPrice > 0 ? variantWithPrice : product.variants[0];
        }
      }
      setPrimaryVariant(selectedVariant);

      // Calculate analytics
      if (product.variants.length > 0) {
        setAnalytics({
          totalStock: calculateTotalStock(product.variants),
          totalCostValue: calculateTotalCostValue(product.variants),
          totalRetailValue: calculateTotalRetailValue(product.variants),
          potentialProfit: calculatePotentialProfit(product.variants),
          profitMargin: calculateProfitMargin(product.variants),
          stockStatus: getStockStatus(product.variants)
        });
      }

      setIsCalculating(false);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [product?.variants, isOpen]);

  // Parse specifications when needed - check both product.specification and variant attributes
  useEffect(() => {
    if (!isOpen || activeTab !== 'overview') {
      setSpecifications({});
      return;
    }
    
    // Get specification from product specification column or variant attributes
    const specificationText = (product as any).specification || 
                              primaryVariant?.attributes?.specification || 
                              (product as any).attributes?.specification || 
                              null;
    
    if (!specificationText) {
      setSpecifications({});
      return;
    }
    
    const timeoutId = setTimeout(() => {
      // Try to parse as JSON first (structured specs), otherwise treat as plain text
      try {
        const parsed = JSON.parse(specificationText);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          setSpecifications(parsed);
        } else {
          // If it's a valid JSON but not an object (e.g., string), treat as plain text
          setSpecifications({ _raw: specificationText });
        }
      } catch {
        // Not JSON - treat as plain text string
        setSpecifications({ _raw: specificationText });
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [product, primaryVariant, activeTab, isOpen]);

  if (!isOpen || !product) {
    return null;
  }
  const hasNoVariants = !product.variants || product.variants.length === 0;
  
  // Show a helpful message if no variants exist
  if (hasNoVariants) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Product Has No Variants</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  Product <strong>"{product.name}"</strong> has no variants configured.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Please add at least one variant to this product before viewing details.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <GlassButton
                onClick={onClose}
                variant="secondary"
                className="flex-1"
              >
                Close
              </GlassButton>
              {onEdit && (
                <GlassButton
                  onClick={() => {
                    onClose();
                    onEdit(product);
                  }}
                  className="flex-1"
                >
                  Edit Product
                </GlassButton>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Generate QR Code
  const handleGenerateQRCode = () => {
    try {
      const productUrl = `${window.location.origin}/lats/products/${product.id}/edit`;
      const qrData = `Product: ${product.name}\nSKU: ${primaryVariant?.sku || 'N/A'}\nPrice: ${format.money(primaryVariant?.sellingPrice || 0)}\nDetails: ${productUrl}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
      setQrCodeUrl(qrUrl);
      setShowQRModal(true);
      toast.success('QR Code generated!');
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
      
      const blob = new Blob([exportedData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Product exported!');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  // Add to cart
  const handleAddToCart = () => {
    try {
      localStorage.setItem('pos_quick_add', JSON.stringify({
        productId: product.id,
        variantId: primaryVariant?.id,
        timestamp: Date.now()
      }));
      
      toast.success('Redirecting to POS...');
      setTimeout(() => {
        window.open('/lats/pos', '_blank');
      }, 1000);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  // Copy product info
  const handleCopyProductInfo = () => {
    const info = `
Product: ${currentProduct.name}
SKU: ${primaryVariant?.sku || 'N/A'}
Price: ${format.money(primaryVariant?.sellingPrice || 0)}
Stock: ${analytics?.totalStock || 0} units
Category: ${currentProduct.category?.name || 'N/A'}
Status: ${currentProduct.isActive ? 'Active' : 'Inactive'}
    `.trim();
    
    navigator.clipboard.writeText(info);
    toast.success('Product info copied to clipboard!');
  };

  // Add to Purchase Order
  const handleAddToPurchaseOrder = () => {
    try {
      // Store product info for PO creation
      localStorage.setItem('po_quick_add', JSON.stringify({
        productId: product.id,
        productName: product.name,
        variantId: primaryVariant?.id,
        sku: primaryVariant?.sku,
        timestamp: Date.now()
      }));
      
      toast.success('Opening Purchase Orders...');
      setTimeout(() => {
        navigate('/lats/purchase-orders');
      }, 500);
    } catch (error) {
      toast.error('Failed to add to purchase order');
    }
  };

  // Transfer Stock
  const handleTransferStock = () => {
    try {
      // Store product info for stock transfer
      localStorage.setItem('stock_transfer_quick_add', JSON.stringify({
        productId: product.id,
        productName: product.name,
        variants: product.variants || [],
        timestamp: Date.now()
      }));
      
      toast.success('Opening stock transfer...');
      setTimeout(() => {
        navigate('/lats/stock-transfers?autoOpen=true');
      }, 500);
    } catch (error) {
      toast.error('Failed to initiate transfer');
    }
  };

  // Get stock status badge
  const getStockStatusBadge = (quantity: number, minQuantity: number) => {
    if (quantity === 0) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Out of Stock</span>;
    } else if (quantity <= minQuantity) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">Low Stock</span>;
    } else {
      return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">In Stock</span>;
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
      const { error } = await supabase
        .from('lats_products')
        .update({
          storage_room_id: storageLocationData.storageRoomId,
          shelf_id: storageLocationData.shelfId,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) throw error;

      setCurrentProduct({
        ...currentProduct,
        storageRoomId: storageLocationData.storageRoomId,
        shelfId: storageLocationData.shelfId
      } as any);

      toast.success('Storage location updated!');
      setShowStorageLocationModal(false);
      
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

  // Variant Management
  const handleEditVariant = (variant: any) => {
    setEditingVariantId(variant.id);
    setEditingVariantData({
      name: getVariantDisplayName(variant),
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
      const { error } = await supabase
        .from('lats_product_variants')
        .update({
          variant_name: editingVariantData.name,
          sku: editingVariantData.sku,
          cost_price: editingVariantData.costPrice,
          selling_price: editingVariantData.sellingPrice,
          quantity: editingVariantData.quantity,
          min_quantity: editingVariantData.minQuantity,
        })
        .eq('id', editingVariantId);

      if (error) throw error;

      toast.success('Variant updated!');
      setEditingVariantId(null);
      setEditingVariantData(null);
      
      const refreshedProduct = await getProduct(product.id);
      if (refreshedProduct.ok && refreshedProduct.data) {
        setCurrentProduct(refreshedProduct.data);
      }
    } catch (error: any) {
      console.error('Error updating variant:', error);
      toast.error(`Failed: ${error.message}`);
    }
  };

  const handleDeleteVariant = async (variantId: string, variantName: string) => {
    if (!confirm(`Delete variant "${variantName}"?`)) return;

    try {
      // Check if variant has stock movements before attempting deletion
      const { data: stockMovements, error: checkError } = await supabase
        .from('lats_stock_movements')
        .select('id')
        .eq('variant_id', variantId)
        .limit(1);

      if (checkError) {
        console.error('Failed to check stock movements:', checkError);
        toast.error('Failed to verify variant status');
        return;
      }

      // Prevent deletion if variant has stock movements (preserve historical data)
      if (stockMovements && stockMovements.length > 0) {
        toast.error('Cannot delete variant: has stock movement history');
        return;
      }

      const { error } = await supabase
        .from('lats_product_variants')
        .delete()
        .eq('id', variantId);

      if (error) {
        if (error.code === '23503') {
          toast.error('Cannot delete: variant is referenced by other records');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Variant deleted!');
      
      const refreshedProduct = await getProduct(product.id);
      if (refreshedProduct.ok && refreshedProduct.data) {
        setCurrentProduct(refreshedProduct.data);
      }
    } catch (error: any) {
      console.error('Error deleting variant:', error);
      toast.error(`Failed: ${error.message}`);
    }
  };

  const handleAddNewVariant = async () => {
    if (!newVariantData.name || !newVariantData.sku) {
      toast.error('Please fill in name and SKU');
      return;
    }

    try {
      // Get branch_id from product or localStorage
      const branchId = (product as any).branch_id || (product as any).branchId || localStorage.getItem('current_branch_id');
      
      if (!branchId) {
        toast.error('Branch ID is missing. Please refresh and try again.');
        return;
      }

      const { error } = await supabase
        .from('lats_product_variants')
        .insert({
          product_id: product.id,
          branch_id: branchId,
          variant_name: newVariantData.name,
          sku: newVariantData.sku,
          cost_price: newVariantData.costPrice,
          selling_price: newVariantData.sellingPrice,
          quantity: newVariantData.quantity,
          min_quantity: newVariantData.minQuantity,
          is_active: true
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('SKU already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Variant added!');
      setShowAddVariantForm(false);
      setNewVariantData({
        name: '',
        sku: '',
        costPrice: 0,
        sellingPrice: 0,
        quantity: 0,
        minQuantity: 2
      });
      
      const refreshedProduct = await getProduct(product.id);
      if (refreshedProduct.ok && refreshedProduct.data) {
        setCurrentProduct(refreshedProduct.data);
      }
    } catch (error: any) {
      console.error('Error adding variant:', error);
      toast.error(`Failed: ${error.message}`);
    }
  };

  // Stock adjustment
  const handleStockAdjustment = async () => {
    if (!selectedVariant || adjustmentQuantity === 0 || !adjustmentReason.trim()) {
      toast.error('Please fill all fields');
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
        toast.success('Stock adjusted!');
        setShowStockAdjustment(false);
        setSelectedVariant(null);
        setAdjustmentQuantity(0);
        setAdjustmentReason('');
        
        const updatedProduct = await getProduct(product.id);
        if (updatedProduct.ok && updatedProduct.data) {
          setCurrentProduct(updatedProduct.data);
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

  // Navigate to Create PO with pre-selected product
  const handleCreatePO = () => {
    // Check if product has low stock
    const totalStock = calculateTotalStock(currentProduct.variants || []);
    const isLowStock = totalStock <= (primaryVariant?.minQuantity || 0);
    
    if (isLowStock) {
      toast.success(`Creating PO for low stock item: ${product.name}`);
    }
    
    // Navigate to PO create page (can be enhanced to pre-select this product)
    navigate('/lats/purchase-order/create', { 
      state: { 
        productId: product.id,
        productName: product.name,
        supplierId: product.supplierId
      } 
    });
    onClose();
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        style={{
          zIndex: 35,
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0
        }}
      />
      
      {/* Modal Container */}
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
          className="relative bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col my-2 sm:my-4 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100 animate-slide-up">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">{product.name}</h2>
              </div>
              <p className="text-xs text-gray-500">{primaryVariant?.sku || 'No SKU'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Create PO Button - Show if product has low stock or supplier */}
            {(calculateTotalStock(currentProduct.variants || []) <= (primaryVariant?.minQuantity || 0) || product.supplierId) && (
              <>
                {/* Desktop button */}
                <button 
                  onClick={handleCreatePO}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 bg-orange-500/90 hover:bg-orange-600 text-white rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105 text-sm font-medium"
                  title="Create purchase order for this product"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Create PO</span>
                </button>
                {/* Mobile button - Icon only */}
                <button 
                  onClick={handleCreatePO}
                  className="flex sm:hidden p-2.5 bg-orange-500/90 hover:bg-orange-600 text-white rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105"
                  title="Create purchase order"
                >
                  <ShoppingCart className="w-5 h-5" />
                </button>
              </>
            )}
            {/* Edit Button */}
            {onEdit && (
              <>
                {/* Desktop button */}
                <button 
                  onClick={() => {
                    onClose();
                    onEdit(product);
                  }}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-500/90 hover:bg-blue-600 text-white rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105 text-sm font-medium"
                  title="Edit product"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                {/* Mobile button - Icon only */}
                <button 
                  onClick={() => {
                    onClose();
                    onEdit(product);
                  }}
                  className="flex sm:hidden p-2.5 bg-blue-500/90 hover:bg-blue-600 text-white rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-105"
                  title="Edit product"
                >
                  <Edit className="w-5 h-5" />
                </button>
              </>
            )}
            {/* Redesigned Close Button - Red, Round, Larger */}
            <button 
              onClick={onClose}
              className="p-2.5 bg-red-500/90 hover:bg-red-600 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 transform hover:scale-110 flex-shrink-0"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
            <button
              onClick={() => handleTabChange('overview')}
              className={`flex-1 min-w-fit py-2 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
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
              onClick={() => handleTabChange('financials')}
              className={`flex-1 min-w-fit py-2 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'financials'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Financials</span>
                <span className="sm:hidden">Money</span>
              </div>
            </button>
            <button
              onClick={() => handleTabChange('inventory')}
              className={`flex-1 min-w-fit py-2 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Inventory</span>
                <span className="sm:hidden">Stock</span>
              </div>
            </button>
            <button
              onClick={() => handleTabChange('variants')}
              className={`flex-1 min-w-fit py-2 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
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
              onClick={() => handleTabChange('purchase-orders')}
              className={`flex-1 min-w-fit py-2 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'purchase-orders'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Orders</span>
                <span className="sm:hidden">PO</span>
              </div>
            </button>
            {isTradeInProduct(currentProduct.variants) && (
              <button
                onClick={() => handleTabChange('tradein')}
                className={`flex-1 min-w-fit py-2 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'tradein'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden sm:inline">Trade-In</span>
                  <span className="sm:hidden">TI</span>
                </div>
              </button>
            )}
            <button
              onClick={() => handleTabChange('details')}
              className={`flex-1 min-w-fit py-2 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Details</span>
                <span className="sm:hidden">More</span>
              </div>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scroll-smooth p-3 sm:p-4 pb-6"
          style={{ minHeight: 0 }}
        >
          {/* Scroll to Top Button */}
          {isScrolled && (
            <button
              onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-24 right-6 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50 group"
            >
              <ArrowUp className="w-5 h-5 group-hover:animate-bounce" />
            </button>
          )}
          
          <div>
            {/* Debug Panel */}
            {showDebug && (
              <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-yellow-300">
                  <Target className="w-5 h-5 text-yellow-700" />
                  <h3 className="text-sm font-bold text-yellow-900">Debug Panel</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white rounded-lg p-3 border border-yellow-200">
                    <div className="font-semibold text-yellow-800 mb-2">Product Info</div>
                    <div className="space-y-1 text-gray-700 font-mono">
                      <div><span className="text-gray-500">ID:</span> {product.id}</div>
                      <div><span className="text-gray-500">Name:</span> {product.name}</div>
                      <div><span className="text-gray-500">Active:</span> {product.isActive ? '✅' : '❌'}</div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-yellow-200">
                    <div className="font-semibold text-yellow-800 mb-2">Variants</div>
                    <div className="space-y-1 text-gray-700 font-mono">
                      <div><span className="text-gray-500">Count:</span> {currentProduct.variants?.length || 0}</div>
                      <div><span className="text-gray-500">Stock:</span> {currentProduct.totalQuantity || 0}</div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-yellow-200">
                    <div className="font-semibold text-yellow-800 mb-2">UI State</div>
                    <div className="space-y-1 text-gray-700 font-mono">
                      <div><span className="text-gray-500">Tab:</span> {activeTab}</div>
                      <div><span className="text-gray-500">Images:</span> {images.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && loadedTabs.has('overview') && (
              <>
          {isCalculating ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <CircularProgress size={64} strokeWidth={5} color="blue" className="mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Loading product details...</p>
              </div>
            </div>
          ) : (
          <>
          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column */}
            <div className="space-y-4 sm:space-y-6">
              {/* Product Image */}
              <div className="space-y-3">
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
                      : isUploadingImage || isLoadingImages
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer'
                  }`}
                  onClick={images.length === 0 && !isLoadingImages ? handleImageAreaClick : undefined}
                >
                  {isLoadingImages && images.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <CircularProgress size={80} strokeWidth={6} color="blue" />
                      <p className="text-sm font-medium text-blue-600 mt-4">Loading images...</p>
                    </div>
                  ) : images.length > 0 ? (
                    <>
                      {(() => {
                        const currentImage = images[selectedImageIndex] || images[0];
                        // Use full quality image (url) instead of thumbnail for main display
                        const imageUrl = currentImage?.url || currentImage?.thumbnailUrl;
                        const isPngImage = imageUrl && (imageUrl.includes('.png') || imageUrl.includes('image/png'));
                        return isPngImage ? <div className="absolute inset-0 bg-white" /> : null;
                      })()}
                      <img
                        src={images[selectedImageIndex]?.url || images[selectedImageIndex]?.thumbnailUrl || images[0]?.url || images[0]?.thumbnailUrl}
                        alt={product.name}
                        className="w-full h-full object-contain relative z-10 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setShowImageGallery(true)}
                        loading="eager"
                      />
                      <button
                        onClick={() => setShowImageGallery(true)}
                        className="absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition-colors z-20"
                        title="View Gallery"
                      >
                        <Package className="w-5 h-5 text-gray-700" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group hover:text-blue-500 transition-colors">
                      {isUploadingImage ? (
                        <>
                          <CircularProgress size={80} strokeWidth={6} color="blue" />
                          <p className="text-sm font-medium text-blue-600 mt-4">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Package className="w-20 h-20 mb-3 group-hover:scale-110 transition-transform" />
                          <p className="text-sm font-medium group-hover:text-blue-600">Click to upload</p>
                          <p className="text-xs mt-1 text-gray-400">PNG, JPG, WEBP (Max 10MB)</p>
                        </>
                      )}
                    </div>
                  )}
                  
                  {images.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageAreaClick();
                      }}
                      disabled={isUploadingImage}
                      className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm hover:bg-blue-500 hover:text-white text-gray-700 p-2 rounded-full shadow-lg transition-all duration-200"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
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

              {/* Basic Info */}
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
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total Variants</span>
                    <p className="text-sm font-medium text-gray-900">{product.variants?.length || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total Stock</span>
                    <p className="text-sm font-medium text-gray-900">{currentProduct.totalQuantity || 0}</p>
                  </div>
                </div>
              </div>

              {/* Specifications - Redesigned */}
              {Object.keys(specifications).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Specifications</h3>
                      <p className="text-xs text-gray-500">Product technical details</p>
                    </div>
                  </div>
                  
                  {specifications._raw ? (
                    // Display as plain text if it's a raw string (from CSV) - Minimal design
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {specifications._raw.split(',').map((item, idx) => {
                          const trimmedItem = item.trim();
                          if (!trimmedItem) return null;
                          
                          return (
                            <span 
                              key={idx} 
                              className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-sm border border-gray-200"
                            >
                              {trimmedItem}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    // Display as key-value pairs if it's structured data - Enhanced design
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(specifications).map(([key, value]) => {
                        const formattedValue = formatSpecificationValue(key, value);
                        const keyLower = key.toLowerCase();
                        
                        // Color coding based on specification type
                        const getSpecColor = () => {
                          if (keyLower.includes('ram') || keyLower.includes('memory')) 
                            return 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900';
                          if (keyLower.includes('storage') || keyLower.includes('capacity')) 
                            return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-blue-900';
                          if (keyLower.includes('processor') || keyLower.includes('cpu') || keyLower.includes('snapdragon') || keyLower.includes('chip')) 
                            return 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 text-purple-900';
                          if (keyLower.includes('screen') || keyLower.includes('display') || keyLower.includes('amoled')) 
                            return 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 text-orange-900';
                          if (keyLower.includes('battery') || keyLower.includes('mah')) 
                            return 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 text-teal-900';
                          if (keyLower.includes('camera') || keyLower.includes('mp')) 
                            return 'bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 text-pink-900';
                          if (keyLower.includes('android') || keyLower.includes('os')) 
                            return 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 text-green-900';
                          if (keyLower.includes('5g') || keyLower.includes('wifi') || keyLower.includes('bluetooth')) 
                            return 'bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 text-cyan-900';
                          if (keyLower.includes('weight') || keyLower.includes('dimension')) 
                            return 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 text-slate-900';
                          return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 text-gray-900';
                        };
                        
                        const getSpecIcon = () => {
                          if (keyLower.includes('ram') || keyLower.includes('memory')) return '💾';
                          if (keyLower.includes('storage') || keyLower.includes('capacity')) return '💿';
                          if (keyLower.includes('processor') || keyLower.includes('cpu') || keyLower.includes('snapdragon')) return '⚙️';
                          if (keyLower.includes('screen') || keyLower.includes('display')) return '📱';
                          if (keyLower.includes('battery')) return '🔋';
                          if (keyLower.includes('camera')) return '📷';
                          if (keyLower.includes('android') || keyLower.includes('os')) return '🤖';
                          if (keyLower.includes('5g')) return '📶';
                          return '✨';
                        };
                        
                        return (
                          <div 
                            key={key} 
                            className={`${getSpecColor()} rounded-xl p-4 border-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-xl flex-shrink-0">{getSpecIcon()}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
                                  {key.replace(/_/g, ' ')}
                                </div>
                                <div className="text-base font-bold break-words">
                                  {formattedValue}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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

            {/* Right Column */}
            <div className="space-y-6">
              {/* Pricing Summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <div className="flex items-center justify-center w-7 h-7 bg-green-50 rounded-lg">
                    <DollarSign className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Pricing</h3>
                </div>
                
                {/* Main Pricing */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                    <div className="flex items-center gap-1 mb-0.5">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-[9px] font-bold text-green-700 uppercase tracking-wide">Price</span>
                    </div>
                    {(() => {
                      const prices = currentProduct.variants?.map(v => v.sellingPrice || v.price || 0).filter(p => p > 0) || [];
                      const minPrice = Math.min(...prices);
                      const maxPrice = Math.max(...prices);
                      const hasPriceRange = prices.length > 1 && minPrice !== maxPrice;
                      
                      if (hasPriceRange) {
                        return (
                          <div>
                            <p className="text-lg font-bold text-green-700">{format.money(minPrice)} - {format.money(maxPrice)}</p>
                            <p className="text-[8px] text-green-600 mt-0.5">Varies by variant</p>
                          </div>
                        );
                      }
                      return <p className="text-lg font-bold text-green-700">{format.money(primaryVariant?.sellingPrice || primaryVariant?.price || 0)}</p>;
                    })()}
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                    <div className="flex items-center gap-1 mb-0.5">
                      <TrendingDown className="w-3 h-3 text-red-600" />
                      <span className="text-[9px] font-bold text-red-700 uppercase tracking-wide">Cost</span>
                    </div>
                    {(() => {
                      const costs = currentProduct.variants?.map(v => v.costPrice || 0).filter(c => c > 0) || [];
                      const minCost = costs.length > 0 ? Math.min(...costs) : 0;
                      const maxCost = costs.length > 0 ? Math.max(...costs) : 0;
                      const hasCostRange = costs.length > 1 && minCost !== maxCost;
                      
                      if (hasCostRange) {
                        return (
                          <div>
                            <p className="text-lg font-bold text-red-700">{format.money(minCost)} - {format.money(maxCost)}</p>
                            <p className="text-[8px] text-red-600 mt-0.5">Varies by variant</p>
                          </div>
                        );
                      }
                      return <p className="text-lg font-bold text-red-700">{format.money(primaryVariant?.costPrice || 0)}</p>;
                    })()}
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                    <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wide block mb-0.5">Profit</span>
                    {(() => {
                      const profits = currentProduct.variants?.map(v => {
                        const sellingPrice = v.sellingPrice || v.price || 0;
                        const costPrice = v.costPrice || 0;
                        return sellingPrice - costPrice;
                      }).filter(p => !isNaN(p)) || [];
                      
                      if (profits.length === 0) {
                        return <p className="text-sm font-bold text-blue-700">TSh 0</p>;
                      }
                      
                      const minProfit = Math.min(...profits);
                      const maxProfit = Math.max(...profits);
                      const hasProfitRange = profits.length > 1 && minProfit !== maxProfit;
                      
                      if (hasProfitRange) {
                        return (
                          <div>
                            <p className="text-sm font-bold text-blue-700">{format.money(minProfit)} - {format.money(maxProfit)}</p>
                            <p className="text-[8px] text-blue-600 mt-0.5">Varies</p>
                          </div>
                        );
                      }
                      return <p className="text-sm font-bold text-blue-700">{format.money(profits[0] || 0)}</p>;
                    })()}
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                    <span className="text-[9px] font-bold text-purple-700 uppercase tracking-wide block mb-0.5">Markup</span>
                    {(() => {
                      const markups = currentProduct.variants?.map(v => {
                        const sellingPrice = v.sellingPrice || v.price || 0;
                        const costPrice = v.costPrice || 0;
                        if (costPrice > 0) {
                          return ((sellingPrice - costPrice) / costPrice) * 100;
                        }
                        return 0;
                      }).filter(m => !isNaN(m) && m > 0) || [];
                      
                      if (markups.length === 0) {
                        return <p className="text-sm font-bold text-purple-700">0.0%</p>;
                      }
                      
                      const minMarkup = Math.min(...markups);
                      const maxMarkup = Math.max(...markups);
                      const hasMarkupRange = markups.length > 1 && minMarkup !== maxMarkup;
                      
                      if (hasMarkupRange) {
                        return (
                          <div>
                            <p className="text-sm font-bold text-purple-700">{minMarkup.toFixed(1)}% - {maxMarkup.toFixed(1)}%</p>
                            <p className="text-[8px] text-purple-600 mt-0.5">Varies</p>
                          </div>
                        );
                      }
                      return <p className="text-sm font-bold text-purple-700">{markups[0]?.toFixed(1) || '0.0'}%</p>;
                    })()}
                  </div>
                </div>

                {/* Total Value */}
                <div className="bg-orange-50 rounded-lg p-2.5 border border-orange-200">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] font-bold text-orange-700 uppercase tracking-wide">Total Value</span>
                    <Banknote className="w-3.5 h-3.5 text-orange-600" />
                  </div>
                  <p className="text-lg font-bold text-orange-700">
                    {format.money(analytics?.totalRetailValue || 0)}
                  </p>
                </div>
              </div>

              {/* Product Variants Preview */}
              {product.variants && product.variants.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Layers className="w-5 h-5 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Variants</h3>
                  </div>
                  <div className="space-y-2">
                    {product.variants.slice(0, 3).map((variant, index) => {
                      const sourceBadge = getVariantSourceBadge(variant);
                      
                      // Get variant name and truncate IMEI only if name is too long
                      let displayName = getVariantDisplayName(variant, `Variant ${index + 1}`);
                      
                      // Only truncate if the full name is longer than 45 characters (not enough space)
                      if (displayName.length > 45 && displayName.includes('IMEI:')) {
                        const parts = displayName.split('IMEI:');
                        if (parts[1]) {
                          const imeiNumber = parts[1].trim();
                          if (imeiNumber.length > 10) {
                            // Show only last 6 digits to save space
                            displayName = parts[0] + 'IMEI:...' + imeiNumber.slice(-6);
                          }
                        }
                      }
                      
                      return (
                      <div key={variant.id || index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-900">{displayName}</span>
                        {sourceBadge && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${sourceBadge.className}`}>
                            {sourceBadge.text}
                          </span>
                        )}
                </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            (variant.quantity || 0) === 0 ? 'bg-red-100 text-red-700' :
                            (variant.quantity || 0) <= (variant.minQuantity || 0) ? 'bg-orange-100 text-orange-700' : 
                            'bg-green-100 text-green-700'
                          }`}>
                            Stock: {variant.quantity || 0}
                          </span>
                          <span className="font-semibold text-gray-900">{format.money(variant.sellingPrice || variant.price || 0)}</span>
                        </div>
                        </div>
                      );
                    })}
                    {product.variants.length > 3 && (
                      <button 
                        onClick={() => handleTabChange('variants')}
                        className="text-xs text-gray-500 text-center py-2 bg-gray-50 rounded-lg w-full hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                      >
                        +{product.variants.length - 3} more variants
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Product Status</h3>
                </div>
                
                {/* Condition Badge */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-600 font-medium">Condition</span>
                  </div>
                  <span className="px-3 py-1 bg-purple-500 text-white text-sm font-semibold rounded capitalize">
                    {(product as any).condition || 'New'}
                  </span>
                </div>

                {/* Stock Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {/* In Stock Variants */}
                  <div className="bg-white border border-green-200 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-xs text-gray-500 font-medium uppercase">In Stock</span>
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {product.variants ? product.variants.filter(v => (v.quantity || 0) >= (v.minQuantity || 5)).length : 0}
                    </div>
                    <div className="text-xs text-gray-500">variants</div>
                  </div>

                  {/* Low Stock Alert (< minQuantity) */}
                  <div className={`bg-white rounded-lg p-4 text-center ${
                    (product.variants ? product.variants.filter(v => {
                      const qty = v.quantity || 0;
                      const min = v.minQuantity || 5;
                      return qty > 0 && qty < min;
                    }).length : 0) > 0
                      ? 'border-2 border-orange-500'
                      : 'border border-gray-200'
                  }`}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-xs text-gray-500 font-medium uppercase">Low Stock</span>
                      {(product.variants ? product.variants.filter(v => {
                        const qty = v.quantity || 0;
                        const min = v.minQuantity || 5;
                        return qty > 0 && qty < min;
                      }).length : 0) > 0 && (
                        <AlertTriangle className="w-3 h-3 text-orange-500" />
                      )}
                    </div>
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                      {product.variants ? product.variants.filter(v => {
                        const qty = v.quantity || 0;
                        const min = v.minQuantity || 5;
                        return qty > 0 && qty < min;
                      }).length : 0}
                    </div>
                    <div className="text-xs text-gray-500">variants &lt; 5</div>
                  </div>

                  {/* Out of Stock Critical */}
                  <div className={`bg-white rounded-lg p-4 text-center ${
                    (product.variants ? product.variants.filter(v => (v.quantity || 0) === 0).length : 0) > 0
                      ? 'border-2 border-red-300'
                      : 'border border-gray-200'
                  }`}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-xs text-gray-500 font-medium uppercase">No Stock</span>
                      {(product.variants ? product.variants.filter(v => (v.quantity || 0) === 0).length : 0) > 0 && (
                        <X className="w-3 h-3 text-red-400" />
                      )}
                    </div>
                    <div className="text-3xl font-bold text-gray-600 mb-1">
                      {product.variants ? product.variants.filter(v => (v.quantity || 0) === 0).length : 0}
                    </div>
                    <div className="text-xs text-gray-500">variants</div>
                  </div>
                </div>

                {/* Quick Stock Health Indicator */}
                {product.variants && product.variants.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-700 font-semibold">Stock Health</span>
                      <span className="text-xs text-gray-600 font-medium">
                        {product.variants.filter(v => (v.quantity || 0) >= (v.minQuantity || 5)).length} of {product.variants.length} healthy
                      </span>
                    </div>
                    <div className="relative w-full h-2 bg-gray-200 rounded overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-green-500 rounded transition-all duration-500"
                        style={{ 
                          width: `${(product.variants.filter(v => (v.quantity || 0) >= (v.minQuantity || 5)).length / product.variants.length * 100).toFixed(0)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </>
          )}
              </>
            )}

            {/* Financials Tab */}
            {activeTab === 'financials' && !loadedTabs.has('financials') && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <CircularProgress size={64} strokeWidth={5} color="blue" className="mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Loading financials...</p>
                </div>
              </div>
            )}
            {activeTab === 'financials' && loadedTabs.has('financials') && analytics && (
              <div className="space-y-6">
                {/* Financial Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700 uppercase">Total Cost Value</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{format.money(analytics.totalCostValue)}</div>
                    <div className="text-xs text-blue-700 mt-1">Investment</div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-xs font-medium text-green-700 uppercase">Total Retail Value</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">{format.money(analytics.totalRetailValue)}</div>
                    <div className="text-xs text-green-700 mt-1">Revenue Potential</div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      <span className="text-xs font-medium text-purple-700 uppercase">Potential Profit</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">{format.money(analytics.potentialProfit)}</div>
                    <div className="text-xs text-purple-700 mt-1">If all sold</div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Percent className="w-5 h-5 text-orange-600" />
                      <span className="text-xs font-medium text-orange-700 uppercase">Profit Margin</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-900">{analytics.profitMargin.toFixed(1)}%</div>
                    <div className="text-xs text-orange-700 mt-1">Average margin</div>
                  </div>
                </div>

                {/* Average Pricing */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                    <BarChart className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-semibold text-gray-800">Average Pricing</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <span className="text-sm text-gray-700">Avg Cost Price</span>
                      <span className="text-lg font-bold text-red-600">
                        {format.money(analytics.totalStock > 0 ? analytics.totalCostValue / analytics.totalStock : 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-sm text-gray-700">Avg Selling Price</span>
                      <span className="text-lg font-bold text-green-600">
                        {format.money(analytics.totalStock > 0 ? analytics.totalRetailValue / analytics.totalStock : 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-sm text-gray-700">Avg Profit/Unit</span>
                      <span className="text-lg font-bold text-blue-600">
                        {format.money(analytics.totalStock > 0 ? analytics.potentialProfit / analytics.totalStock : 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Variant Profitability Table */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                    <LineChart className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-semibold text-gray-800">Variant Profitability Analysis</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left p-3 font-medium text-gray-700">Variant</th>
                          <th className="text-right p-3 font-medium text-gray-700">Stock</th>
                          <th className="text-right p-3 font-medium text-gray-700">Cost</th>
                          <th className="text-right p-3 font-medium text-gray-700">Price</th>
                          <th className="text-right p-3 font-medium text-gray-700">Profit/Unit</th>
                          <th className="text-right p-3 font-medium text-gray-700">Total Profit</th>
                          <th className="text-right p-3 font-medium text-gray-700">Markup %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(currentProduct.variants) ? currentProduct.variants : []).map((variant, index) => {
                          const profitPerUnit = (variant.sellingPrice || 0) - (variant.costPrice || 0);
                          const totalProfit = profitPerUnit * (variant.quantity || 0);
                          const markup = variant.costPrice > 0 ? ((profitPerUnit / variant.costPrice) * 100) : 0;
                          
                          return (
                            <tr key={variant.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-3">
                                <div className="font-medium text-gray-900">{getVariantDisplayName(variant, `Variant ${index + 1}`)}</div>
                                <div className="text-xs text-gray-500 font-mono">{variant.sku}</div>
                              </td>
                              <td className="p-3 text-right">
                                <span className={`font-medium ${
                                  (variant.quantity || 0) === 0 ? 'text-red-600' :
                                  (variant.quantity || 0) <= (variant.minQuantity || 0) ? 'text-orange-600' : 
                                  'text-green-600'
                                }`}>
                                  {variant.quantity || 0}
                                </span>
                              </td>
                              <td className="p-3 text-right font-medium text-red-600">
                                {format.money(variant.costPrice || 0)}
                              </td>
                              <td className="p-3 text-right font-medium text-green-600">
                                {format.money(variant.sellingPrice || 0)}
                              </td>
                              <td className="p-3 text-right font-bold text-blue-600">
                                {format.money(profitPerUnit)}
                              </td>
                              <td className="p-3 text-right font-bold text-purple-600">
                                {format.money(totalProfit)}
                              </td>
                              <td className="p-3 text-right">
                                <span className={`font-bold ${
                                  markup > 50 ? 'text-green-600' : 
                                  markup > 20 ? 'text-orange-600' : 
                                  'text-red-600'
                                }`}>
                                  {markup.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && !loadedTabs.has('inventory') && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <CircularProgress size={64} strokeWidth={5} color="blue" className="mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Loading inventory...</p>
                </div>
              </div>
            )}
            {activeTab === 'inventory' && loadedTabs.has('inventory') && (
              <div className="space-y-6">
                {!analytics ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No inventory data available</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Stock Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Box className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700 uppercase">Total Stock</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-900">{analytics.totalStock}</div>
                    <div className="text-xs text-blue-700 mt-1">units across all variants</div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-xs font-medium text-green-700 uppercase">In Stock</span>
                    </div>
                    <div className="text-3xl font-bold text-green-900">
                      {currentProduct.variants?.filter(v => (v.quantity || 0) > 0).length || 0}
                    </div>
                    <div className="text-xs text-green-700 mt-1">variants available</div>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="text-xs font-medium text-red-700 uppercase">Needs Attention</span>
                    </div>
                    <div className="text-3xl font-bold text-red-900">
                      {currentProduct.variants?.filter(v => (v.quantity || 0) <= (v.minQuantity || 0)).length || 0}
                    </div>
                    <div className="text-xs text-red-700 mt-1">low or out of stock</div>
                  </div>
                </div>

                {/* Variants Stock Detail */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                    <Warehouse className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-semibold text-gray-800">Stock by Variant</h3>
                  </div>
                  <div className="space-y-3">
                    {(Array.isArray(currentProduct.variants) ? currentProduct.variants : []).map((variant, index) => {
                      const stockPercentage = variant.minQuantity > 0 
                        ? Math.min(((variant.quantity || 0) / variant.minQuantity) * 100, 100)
                        : 100;
                      const stockStatus = 
                        (variant.quantity || 0) === 0 ? 'empty' :
                        (variant.quantity || 0) <= variant.minQuantity ? 'low' : 'good';
                      
                      return (
                        <div key={variant.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{getVariantDisplayName(variant, `Variant ${index + 1}`)}</span>
                                {getStockStatusBadge(variant.quantity || 0, variant.minQuantity || 0)}
                              </div>
                              <p className="text-xs text-gray-500 font-mono">{variant.sku}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">{variant.quantity || 0}</div>
                              <div className="text-xs text-gray-600">/ {variant.minQuantity || 0} min</div>
                            </div>
                          </div>
                          
                          {/* Stock Level Bar */}
                          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`absolute top-0 left-0 h-full transition-all ${
                                stockStatus === 'empty' ? 'bg-red-500' :
                                stockStatus === 'low' ? 'bg-orange-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                            />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
                            <div>
                              <span className="text-gray-600 block">Current</span>
                              <span className="font-medium text-gray-900">{variant.quantity || 0} units</span>
                            </div>
                            <div>
                              <span className="text-gray-600 block">Min Level</span>
                              <span className="font-medium text-gray-900">{variant.minQuantity || 0} units</span>
                            </div>
                            <div>
                              <span className="text-gray-600 block">Value</span>
                              <span className="font-medium text-gray-900">
                                {format.money((variant.quantity || 0) * (variant.sellingPrice || 0))}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Storage Location */}
                {((currentProduct as any).storageRoomName || (currentProduct as any).shelfName) && (
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <h3 className="text-base font-semibold text-gray-800">Storage Location</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(currentProduct as any).storageRoomName && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-xs text-green-700 block mb-1">Storage Room</span>
                          <span className="text-sm font-medium text-gray-900">{(currentProduct as any).storageRoomName}</span>
                        </div>
                      )}
                      {(currentProduct as any).shelfName && (
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <span className="text-xs text-purple-700 block mb-1">Shelf</span>
                          <span className="text-sm font-medium text-gray-900">{(currentProduct as any).shelfName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            )}

            {/* Variants Tab */}
            {activeTab === 'variants' && !loadedTabs.has('variants') && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <CircularProgress size={64} strokeWidth={5} color="blue" className="mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Loading variants...</p>
                </div>
              </div>
            )}
            {activeTab === 'variants' && loadedTabs.has('variants') && (
              <div className="space-y-6">
                {/* Variant Hierarchy Display - NEW! */}
                {currentProduct.variants && currentProduct.variants.length > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
                    <VariantHierarchyDisplay
                      productId={currentProduct.id}
                      variants={currentProduct.variants}
                      showFinancials={true}
                      showSearch={true}
                      onChildClick={(child) => {
                        // Handle child click - could open details modal or show toast
                        toast.success(`Selected: ${child.variant_attributes?.imei || 'Device'}`);
                      }}
                    />
                  </div>
                )}

                {/* Divider */}
                {currentProduct.variants && currentProduct.variants.length > 0 && (
                  <div className="border-t-2 border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Edit className="w-5 h-5 text-gray-600" />
                      Variant Management
                    </h3>
                  </div>
                )}

                {/* Add Variant Button */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Manage Variants ({currentProduct.variants?.length || 0})</h3>
                  <button
                    onClick={() => setShowAddVariantForm(!showAddVariantForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Variant
                  </button>
                </div>

                {/* Add Form */}
                {showAddVariantForm && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-blue-600" />
                      New Variant
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
                        <input
                          type="text"
                          value={newVariantData.name}
                          onChange={(e) => setNewVariantData({ ...newVariantData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 256GB Blue"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SKU*</label>
                        <input
                          type="text"
                          value={newVariantData.sku}
                          onChange={(e) => setNewVariantData({ ...newVariantData, sku: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., PROD-001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                        <input
                          type="number"
                          value={newVariantData.costPrice}
                          onChange={(e) => setNewVariantData({ ...newVariantData, costPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                        <input
                          type="number"
                          value={newVariantData.sellingPrice}
                          onChange={(e) => setNewVariantData({ ...newVariantData, sellingPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          value={newVariantData.quantity}
                          onChange={(e) => setNewVariantData({ ...newVariantData, quantity: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Min Level</label>
                        <input
                          type="number"
                          value={newVariantData.minQuantity}
                          onChange={(e) => setNewVariantData({ ...newVariantData, minQuantity: parseInt(e.target.value) || 2 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddNewVariant}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        <Save className="w-4 h-4" />
                        Save
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

                {/* Variant Table */}
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
                            <th className="text-left p-3 font-medium text-gray-700">Name</th>
                            <th className="text-left p-3 font-medium text-gray-700">Stock</th>
                            <th className="text-left p-3 font-medium text-gray-700 hidden md:table-cell">Min</th>
                            <th className="text-left p-3 font-medium text-gray-700 hidden lg:table-cell">Cost</th>
                            <th className="text-left p-3 font-medium text-gray-700">Price</th>
                            <th className="text-left p-3 font-medium text-gray-700 hidden lg:table-cell">Markup</th>
                            <th className="text-left p-3 font-medium text-gray-700">Status</th>
                            <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentProduct.variants.map((variant) => {
                            const markup = variant.costPrice > 0 ? ((variant.sellingPrice - variant.costPrice) / variant.costPrice * 100) : 0;
                            const isEditing = editingVariantId === variant.id;
                            const isExpanded = expandedVariantId === variant.id;
                            const sourceBadge = getVariantSourceBadge(variant);
                            const variantAttrs = formatVariantAttributesForDisplay(variant);
                            
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
                                      >
                                        <Save className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={handleCancelEditVariant}
                                        className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                          
                          return (
                            <React.Fragment key={variant.id}>
                            <tr 
                              className={`border-b border-gray-100 transition-colors ${
                                variant.quantity <= 0 
                                  ? 'bg-gray-100/50 opacity-75' 
                                  : isExpanded 
                                    ? 'bg-blue-50 hover:bg-blue-100' 
                                    : 'hover:bg-gray-50'
                              } ${variantAttrs.length > 0 ? 'cursor-pointer' : ''}`}
                              onClick={() => {
                                if (variantAttrs.length > 0) {
                                  setExpandedVariantId(isExpanded ? null : variant.id);
                                }
                              }}
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {variant.isPrimary && <Star className="w-4 h-4 text-yellow-500" />}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`font-medium text-sm ${variant.quantity <= 0 ? 'text-gray-500 line-through' : ''}`}>
                                        {getVariantDisplayName(variant)}
                                      </span>
                                      {variant.quantity <= 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-500 text-white">
                                          <X className="w-3 h-3" />
                                          Out of Stock
                                        </span>
                                      )}
                                      {sourceBadge && (
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${sourceBadge.className}`}>
                                          {sourceBadge.text}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
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
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  variant.quantity > variant.minQuantity ? 'bg-green-100 text-green-700' : 
                                  variant.quantity > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700 font-bold'
                                }`}>
                                  {variant.quantity > variant.minQuantity ? (
                                    <>
                                      <CheckCircle className="w-3 h-3" />
                                      Available
                                    </>
                                  ) : variant.quantity > 0 ? (
                                    <>
                                      <AlertTriangle className="w-3 h-3" />
                                      Low Stock
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-3 h-3" />
                                      Out of Stock
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1">
                                  {variantAttrs.length > 0 && (
                                    <button
                                      onClick={() => setExpandedVariantId(isExpanded ? null : variant.id)}
                                      className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                                    >
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleEditVariant(variant)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit variant"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVariant(variant.id, getVariantDisplayName(variant))}
                                    disabled={currentProduct.variants && currentProduct.variants.length === 1}
                                    className={`p-1 rounded ${
                                      currentProduct.variants && currentProduct.variants.length === 1
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-red-600 hover:bg-red-50'
                                    }`}
                                    title={currentProduct.variants && currentProduct.variants.length === 1 ? 'Cannot delete the last variant. At least one variant is required.' : 'Delete variant'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {/* Expanded Details */}
                            {isExpanded && variantAttrs.length > 0 && (
                              <tr>
                                <td colSpan={8} className="p-4 bg-gray-50">
                                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
                                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                      <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-lg">
                                        <Info className="w-4 h-4 text-blue-600" />
                                      </div>
                                      <h3 className="text-sm font-semibold text-gray-800">Variant Details</h3>
                                      <span className="ml-auto text-xs text-gray-500 font-medium">
                                        {variantAttrs.length} {variantAttrs.length === 1 ? 'attribute' : 'attributes'}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                      {variantAttrs.map((attr, idx) => {
                                        // Format date values
                                        const formatValue = (value: string, label: string) => {
                                          const labelLower = label.toLowerCase();
                                          if ((labelLower.includes('date') || labelLower.includes('warranty') || labelLower.includes('created')) && 
                                              value.match(/^\d{4}-\d{2}-\d{2}/)) {
                                            try {
                                              const date = new Date(value);
                                              return date.toLocaleDateString('en-US', { 
                                                year: 'numeric', 
                                                month: 'short', 
                                                day: 'numeric' 
                                              });
                                            } catch {
                                              return value;
                                            }
                                          }
                                          return value;
                                        };

                                        // Get icon for attribute type
                                        const getIcon = (label: string) => {
                                          const labelLower = label.toLowerCase();
                                          if (labelLower.includes('imei')) return <Smartphone className="w-3.5 h-3.5 text-indigo-600" />;
                                          if (labelLower.includes('serial')) return <QrCode className="w-3.5 h-3.5 text-blue-600" />;
                                          if (labelLower.includes('condition')) return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
                                          if (labelLower.includes('warranty')) return <Calendar className="w-3.5 h-3.5 text-purple-600" />;
                                          if (labelLower.includes('created')) return <Calendar className="w-3.5 h-3.5 text-orange-600" />;
                                          if (labelLower.includes('location')) return <MapPin className="w-3.5 h-3.5 text-red-600" />;
                                          return null;
                                        };

                                        const isCondition = attr.label.toLowerCase() === 'condition';
                                        const icon = getIcon(attr.label);

                                        return (
                                          <div key={idx} className="space-y-1.5 group">
                                            <div className="flex items-center gap-1.5">
                                              {icon && <span className="opacity-70 group-hover:opacity-100 transition-opacity">{icon}</span>}
                                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                {attr.label}
                                              </span>
                                            </div>
                                            {isCondition ? (
                                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                attr.value.toLowerCase() === 'new' ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' :
                                                attr.value.toLowerCase() === 'excellent' ? 'bg-green-100 text-green-700 ring-1 ring-green-200' :
                                                attr.value.toLowerCase() === 'good' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' :
                                                'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
                                              }`}>
                                                {attr.value}
                                              </span>
                                            ) : (
                                              <p className="text-sm font-semibold text-gray-900 break-words leading-snug">
                                                {formatValue(attr.value, attr.label)}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
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
                    <p className="text-gray-600 mb-4">No variants found</p>
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

            {/* Purchase Orders Tab - Already has its own loading */}
            {activeTab === 'purchase-orders' && (
              <div className="space-y-6">
                {isLoadingPOHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <CircularProgress size={64} strokeWidth={5} color="blue" className="mx-auto mb-4" />
                      <p className="text-gray-600">Loading purchase history...</p>
                    </div>
                  </div>
                ) : !poStats || purchaseOrderHistory.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                    <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Purchase History</h3>
                    <p className="text-sm text-gray-500">This product has no purchase order history yet</p>
                  </div>
                ) : (
                  <>
                    {/* PO Statistics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Receipt className="w-5 h-5 text-blue-600" />
                          <span className="text-xs font-medium text-blue-700 uppercase">Total Orders</span>
                        </div>
                        <div className="text-3xl font-bold text-blue-900">{poStats.totalOrders}</div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <ShoppingCart className="w-5 h-5 text-purple-600" />
                          <span className="text-xs font-medium text-purple-700 uppercase">Total Ordered</span>
                        </div>
                        <div className="text-3xl font-bold text-purple-900">{poStats.totalQuantityOrdered}</div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-xs font-medium text-green-700 uppercase">Avg Cost</span>
                        </div>
                        <div className="text-2xl font-bold text-green-900">{format.money(poStats.averageCostPrice, { currency: poStats.currency })}</div>
                        {poStats.hasMultipleCurrencies && (
                          <div className="text-xs text-green-600 mt-1">Mixed currencies</div>
                        )}
                      </div>

                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-5 h-5 text-amber-600" />
                          <span className="text-xs font-medium text-amber-700 uppercase">Last Order</span>
                        </div>
                        <div className="text-sm font-bold text-amber-900">
                          {poStats.lastOrderDate ? new Date(poStats.lastOrderDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Price Trend */}
                    {poStats.lowestCostPrice && poStats.highestCostPrice && (
                      <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-base font-semibold text-gray-800">Price Trend</h3>
                          </div>
                          {poStats.lastCostPrice && (
                            <div className="flex items-center gap-2">
                              {poStats.lastCostPrice < poStats.averageCostPrice ? (
                                <>
                                  <TrendingDown className="w-5 h-5 text-green-600" />
                                  <span className="text-sm text-green-600 font-medium">Below Average</span>
                                </>
                              ) : (
                                <>
                                  <TrendingUp className="w-5 h-5 text-red-600" />
                                  <span className="text-sm text-red-600 font-medium">Above Average</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-xs text-green-700 mb-2">Lowest</div>
                            <div className="text-xl font-bold text-green-900">{format.money(poStats.lowestCostPrice, { currency: poStats.currency })}</div>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-xs text-blue-700 mb-2">Average</div>
                            <div className="text-xl font-bold text-blue-900">{format.money(poStats.averageCostPrice, { currency: poStats.currency })}</div>
                          </div>
                          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="text-xs text-red-700 mb-2">Highest</div>
                            <div className="text-xl font-bold text-red-900">{format.money(poStats.highestCostPrice, { currency: poStats.currency })}</div>
                          </div>
                        </div>
                        {poStats.hasMultipleCurrencies && (
                          <div className="mt-3 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                            ⚠️ Note: Statistics shown in {poStats.currency}. Multiple currencies detected in order history.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Order History List */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                        <History className="w-5 h-5 text-gray-600" />
                        <h3 className="text-base font-semibold text-gray-800">Order History</h3>
                        <span className="text-xs font-medium text-gray-500">({purchaseOrderHistory.length} orders)</span>
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {purchaseOrderHistory.map((order) => (
                          <div
                            key={order.id}
                            className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-mono text-sm font-medium text-blue-600">
                                #{order.orderNumber}
                              </span>
                              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
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
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-gray-600 block text-xs">Supplier</span>
                                <div className="font-medium text-gray-900 truncate">{order.supplierName}</div>
                              </div>
                              <div>
                                <span className="text-gray-600 block text-xs">Date</span>
                                <div className="font-medium text-gray-900">
                                  {new Date(order.orderDate).toLocaleDateString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600 block text-xs">Quantity</span>
                                <div className="font-medium text-gray-900">
                                  {order.receivedQuantity}/{order.quantity} units
                                  {order.receivedQuantity === order.quantity && (
                                    <CheckCircle2 className="w-4 h-4 text-green-600 inline ml-1" />
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600 block text-xs">Cost/Unit</span>
                                <div className="font-bold text-gray-900">{format.money(order.costPrice, { currency: order.currency || 'TZS' })}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Trade-In Tab */}
            {activeTab === 'tradein' && !loadedTabs.has('tradein') && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <CircularProgress size={64} strokeWidth={5} color="blue" className="mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Loading trade-in details...</p>
                </div>
              </div>
            )}
            {activeTab === 'tradein' && loadedTabs.has('tradein') && (
              <div className="space-y-6">
                {(() => {
                  const tradeInVariants = currentProduct.variants?.filter(v => isTradeInVariant(v)) || [];
                  
                  if (tradeInVariants.length === 0) {
                    return (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                        <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No trade-in information available</p>
                      </div>
                    );
                  }

                  const tradeInVariant = tradeInVariants[0];
                  const attrs = tradeInVariant.attributes || {};
                  
                  return (
                    <>
                      {/* Header Banner */}
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                            <Smartphone className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold">Trade-In Device</h2>
                            <p className="text-blue-100 text-sm">Original device information and details</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <div className="text-blue-100 text-xs mb-1">Device</div>
                            <div className="font-semibold">{attrs.device_model || currentProduct.name}</div>
                          </div>
                          <div>
                            <div className="text-blue-100 text-xs mb-1">Condition</div>
                            <div className="font-semibold capitalize">{attrs.condition_rating || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-blue-100 text-xs mb-1">Storage</div>
                            <div className="font-semibold">{attrs.storage_capacity || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-blue-100 text-xs mb-1">Value</div>
                            <div className="font-semibold text-xl">
                              {format.money(attrs.trade_in_value || attrs.agreed_value || 0)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Device Information Card */}
                      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                          <Smartphone className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-800">Device Information</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {attrs.device_model && (
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                              <span className="text-xs text-blue-700 uppercase tracking-wide block mb-2 font-semibold">Device Model</span>
                              <p className="text-base font-bold text-gray-900">{attrs.device_model}</p>
                            </div>
                          )}
                          {attrs.imei && (
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                              <span className="text-xs text-purple-700 uppercase tracking-wide block mb-2 font-semibold">IMEI</span>
                              <p className="text-base font-mono font-bold text-gray-900">{attrs.imei}</p>
                            </div>
                          )}
                          {attrs.serial_number && (
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                              <span className="text-xs text-indigo-700 uppercase tracking-wide block mb-2 font-semibold">Serial Number</span>
                              <p className="text-base font-mono font-bold text-gray-900">{attrs.serial_number}</p>
                            </div>
                          )}
                          {attrs.condition_rating && (
                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                              <span className="text-xs text-green-700 uppercase tracking-wide block mb-2 font-semibold">Condition</span>
                              <p className="text-base font-bold text-gray-900 capitalize">{attrs.condition_rating}</p>
                            </div>
                          )}
                          {attrs.storage_capacity && (
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                              <span className="text-xs text-orange-700 uppercase tracking-wide block mb-2 font-semibold">Storage</span>
                              <p className="text-base font-bold text-gray-900">{attrs.storage_capacity}</p>
                            </div>
                          )}
                          {attrs.color && (
                            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 border border-pink-200">
                              <span className="text-xs text-pink-700 uppercase tracking-wide block mb-2 font-semibold">Color</span>
                              <p className="text-base font-bold text-gray-900 capitalize">{attrs.color}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Financial Information */}
                      {(attrs.trade_in_value || attrs.agreed_value) && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                          <div className="flex items-center gap-2 pb-3 border-b border-green-200 mb-4">
                            <CreditCard className="w-5 h-5 text-green-600" />
                            <h3 className="text-lg font-semibold text-gray-800">Financial Details</h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg p-6 border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Agreed Trade-In Value</span>
                                <DollarSign className="w-5 h-5 text-green-500" />
                              </div>
                              <p className="text-3xl font-bold text-green-600">
                                {format.money(attrs.trade_in_value || attrs.agreed_value || 0)}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-6 border border-blue-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Current Selling Price</span>
                                <Banknote className="w-5 h-5 text-blue-500" />
                              </div>
                              <p className="text-3xl font-bold text-blue-600">
                                {format.money(tradeInVariant.sellingPrice || 0)}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-6 border border-purple-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Potential Profit</span>
                                <TrendingUp className="w-5 h-5 text-purple-500" />
                              </div>
                              <p className="text-3xl font-bold text-purple-600">
                                {format.money((tradeInVariant.sellingPrice || 0) - (attrs.trade_in_value || attrs.agreed_value || 0))}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-6 border border-orange-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Markup Percentage</span>
                                <Percent className="w-5 h-5 text-orange-500" />
                              </div>
                              <p className="text-3xl font-bold text-orange-600">
                                {((attrs.trade_in_value || attrs.agreed_value || 0) > 0 
                                  ? (((tradeInVariant.sellingPrice || 0) - (attrs.trade_in_value || attrs.agreed_value || 0)) / (attrs.trade_in_value || attrs.agreed_value || 0) * 100)
                                  : 0
                                ).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Customer Information */}
                      {(attrs.customer_name || attrs.customer_phone || attrs.customer_email) && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <div className="flex items-center gap-2 pb-3 border-b border-gray-200 mb-4">
                            <Users className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-semibold text-gray-800">Original Customer</h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {attrs.customer_name && (
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <span className="text-xs text-gray-500 uppercase tracking-wide block mb-2">Full Name</span>
                                <p className="text-base font-semibold text-gray-900">{attrs.customer_name}</p>
                              </div>
                            )}
                            {attrs.customer_phone && (
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <span className="text-xs text-gray-500 uppercase tracking-wide block mb-2">Phone Number</span>
                                <p className="text-base font-semibold text-gray-900">{attrs.customer_phone}</p>
                              </div>
                            )}
                            {attrs.customer_email && (
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <span className="text-xs text-gray-500 uppercase tracking-wide block mb-2">Email Address</span>
                                <p className="text-base font-semibold text-gray-900">{attrs.customer_email}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Condition Assessment */}
                      {attrs.condition_description && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <div className="flex items-center gap-2 pb-3 border-b border-gray-200 mb-4">
                            <FileText className="w-5 h-5 text-gray-600" />
                            <h3 className="text-lg font-semibold text-gray-800">Condition Assessment</h3>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {attrs.condition_description}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Additional Details */}
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center gap-2 pb-3 border-b border-gray-200 mb-4">
                          <Info className="w-5 h-5 text-gray-600" />
                          <h3 className="text-lg font-semibold text-gray-800">Additional Details</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {attrs.trade_in_date && (
                            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                              <div>
                                <span className="text-xs text-gray-500 uppercase tracking-wide block">Trade-In Date</span>
                                <p className="text-sm font-semibold text-gray-900">
                                  {new Date(attrs.trade_in_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <Package className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <div>
                              <span className="text-xs text-gray-500 uppercase tracking-wide block">Current Stock</span>
                              <p className="text-sm font-semibold text-gray-900">{tradeInVariant.quantity || 0} units</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Trade-In Notes */}
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-semibold text-blue-900 mb-1">Trade-In Product</h4>
                            <p className="text-sm text-blue-800">
                              This product was acquired through a trade-in transaction. The information above reflects the original device details and customer information at the time of trade-in.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && !loadedTabs.has('details') && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <CircularProgress size={64} strokeWidth={5} color="blue" className="mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Loading details...</p>
                </div>
              </div>
            )}
            {activeTab === 'details' && loadedTabs.has('details') && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                 <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                   <Hash className="w-5 h-5 text-purple-600" />
                   <h3 className="text-sm font-semibold text-gray-800">Identification</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                     <span className="text-xs text-gray-500 uppercase tracking-wide">SKU</span>
                     <p className="text-sm font-medium text-gray-900 font-mono">{primaryVariant?.sku || 'N/A'}</p>
                   </div>
                   <div className="space-y-1">
                     <span className="text-xs text-gray-500 uppercase tracking-wide">Product ID</span>
                     <p className="text-sm font-medium text-gray-900 font-mono">{product.id}</p>
                   </div>
                 </div>
                 <div className="flex gap-3 pt-3">
                   <button
                     onClick={handleGenerateQRCode}
                     className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                   >
                     <QrCode className="w-4 h-4" />
                     QR Code
                   </button>
                 </div>
               </div>

               {/* Storage Location */}
               <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                 <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                   <div className="flex items-center gap-2">
                     <MapPin className="w-5 h-5 text-blue-600" />
                     <h3 className="text-sm font-semibold text-gray-800">Storage</h3>
                   </div>
                   <button
                     onClick={() => setShowStorageLocationModal(true)}
                     className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                   >
                     <Edit className="w-3.5 h-3.5" />
                     Edit
                   </button>
                 </div>
                 {((product as any).storageRoomName || (product as any).shelfName) ? (
                   <div className="grid grid-cols-2 gap-3">
                     {(product as any).storageRoomName && (
                       <div className="space-y-1">
                         <span className="text-xs text-gray-500 uppercase tracking-wide">Room</span>
                         <p className="text-sm font-medium text-gray-900">{(product as any).storageRoomName}</p>
                       </div>
                     )}
                     {(product as any).shelfName && (
                       <div className="space-y-1">
                         <span className="text-xs text-gray-500 uppercase tracking-wide">Shelf</span>
                         <p className="text-sm font-medium text-gray-900">{(product as any).shelfName}</p>
                       </div>
                     )}
                   </div>
                 ) : (
                   <div className="text-center py-6">
                     <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                     <p className="text-sm text-gray-500">No location assigned</p>
                   </div>
                 )}
               </div>

               {/* Supplier Info */}
               {(() => {
                 const isTradeIn = isTradeInProduct(currentProduct.variants);
                 
                 if (currentProduct.supplier && !isTradeIn) {
                   return (
                     <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                       <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                         <Building className="w-5 h-5 text-orange-600" />
                         <h3 className="text-sm font-semibold text-gray-800">Supplier Information</h3>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                   );
                 }
                 return null;
               })()}

               {/* Timestamps */}
               <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                 <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                   <Calendar className="w-5 h-5 text-indigo-600" />
                   <h3 className="text-sm font-semibold text-gray-800">Timestamps</h3>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <div className="space-y-1">
                     <span className="text-xs text-gray-500 uppercase tracking-wide">Created</span>
                     <p className="text-sm font-medium text-gray-900">
                       {currentProduct.createdAt ? new Date(currentProduct.createdAt).toLocaleString() : 'N/A'}
                     </p>
                   </div>
                   <div className="space-y-1">
                     <span className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</span>
                     <p className="text-sm font-medium text-gray-900">
                       {currentProduct.updatedAt ? new Date(currentProduct.updatedAt).toLocaleString() : 'N/A'}
                     </p>
                   </div>
                 </div>
               </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex-shrink-0 border-t border-gray-200 bg-white p-3 sm:p-4 transition-shadow ${
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
              onClick={handleTransferStock}
              disabled={!primaryVariant || (primaryVariant?.quantity || 0) === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Transfer to another branch"
            >
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Transfer</span>
              <span className="sm:hidden">Transfer</span>
            </button>
            
            <button
              onClick={handleAddToPurchaseOrder}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
              title="Add to Purchase Order"
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Add to PO</span>
              <span className="sm:hidden">PO</span>
            </button>

            <button
              onClick={handleGenerateQRCode}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">QR Code</span>
              <span className="sm:hidden">QR</span>
            </button>

            <button
              onClick={handleCopyProductInfo}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Copy Info</span>
              <span className="sm:hidden">Copy</span>
            </button>

            <button
              onClick={handleExportProduct}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">Save</span>
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

        {/* QR Modal */}
        {showQRModal && createPortal(
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 100000 }}>
            <div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowQRModal(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">QR Code</h3>
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
                    alt="QR Code"
                    className="w-64 h-64 object-contain"
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{product.name}</p>
                  <p>SKU: {primaryVariant?.sku}</p>
                </div>

                <div className="flex gap-2">
                  <GlassButton
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = qrCodeUrl;
                      link.download = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_QR.png`;
                      link.click();
                      toast.success('Downloaded!');
                    }}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </GlassButton>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Image Gallery Modal */}
        {showImageGallery && images.length > 0 && createPortal(
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 100000 }}>
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowImageGallery(false)}
            />
            <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Image Gallery</h3>
                <button 
                  onClick={() => setShowImageGallery(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
                        {(() => {
                          const imageUrl = image.url;
                          const isPngImage = imageUrl && (imageUrl.includes('.png') || imageUrl.includes('image/png'));
                          return isPngImage ? <div className="absolute inset-0 bg-white" /> : null;
                        })()}
                        <img
                          src={image.url}
                          alt={`${currentProduct.name} ${index + 1}`}
                          className="w-full h-full object-contain relative z-10 cursor-pointer"
                          onClick={() => {
                            setSelectedImageIndex(index);
                            setShowImageGallery(false);
                          }}
                        />
                        {image.isPrimary && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            Primary
                          </div>
                        )}
                        
                        {/* Delete Button - Always visible for better UX */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(image.id);
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full shadow-xl backdrop-blur-sm transition-all duration-200 transform hover:scale-110 z-20"
                          title="Delete image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add More Images Card */}
                  <div className="relative group">
                    <button
                      onClick={handleImageAreaClick}
                      disabled={isUploadingImage}
                      className="aspect-square relative rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 hover:border-blue-500 transition-all duration-200 w-full flex flex-col items-center justify-center gap-3 group-hover:from-blue-100 group-hover:to-indigo-100"
                    >
                      <div className="w-16 h-16 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                        <Plus className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">Add More</p>
                        <p className="text-xs text-blue-500 mt-1">Upload image</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Stock Adjust Modal */}
        {showStockAdjustment && (
          <EnhancedStockAdjustModal
            product={currentProduct}
            isOpen={showStockAdjustment}
            onClose={closeStockAdjustment}
            onSubmit={async (data) => {
              await handleStockAdjustment();
            }}
            loading={isAdjustingStock}
          />
        )}

        {/* Storage Location Modal */}
        {showStorageLocationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[85vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <MapPin size={20} className="text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">Assign Storage</h2>
                </div>
                <button
                  onClick={() => setShowStorageLocationModal(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[calc(85vh-140px)]">
                <StorageLocationForm
                  formData={storageLocationData}
                  setFormData={setStorageLocationData}
                  currentErrors={{}}
                />
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowStorageLocationModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStorageLocation}
                  disabled={isSavingStorageLocation}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingStorageLocation ? (
                    <>
                      <CircularProgress size={16} strokeWidth={2} color="white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save
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

export default ProductModal;


