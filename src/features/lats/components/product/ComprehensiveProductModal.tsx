import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Package, Hash, DollarSign, Edit, Star, MapPin, Calendar, 
  TrendingUp, TrendingDown, BarChart3, CheckCircle, AlertCircle,
  FileText, Layers, Truck, QrCode, ShoppingCart, Activity,
  Target, Banknote, Receipt, Clock, Users,
  Copy, Download, Building, Info, CheckCircle2, ArrowUp, 
  Plus, Trash2, Save, ChevronDown, ChevronUp, History,
  Image as ImageIcon, Tag, Box, Smartphone, Shield,
  CreditCard, Percent, TrendingUp as Growth, Eye,
  BarChart, LineChart, DollarSign as Money,
  Warehouse, ShoppingBag, Archive, AlertTriangle, Scale
} from 'lucide-react';
import { Product } from '../../types/inventory';
import { RobustImageService, ProductImage } from '../../../../lib/robustImageService';
import { format } from '../../lib/format';
import { formatSpecificationValue, parseSpecification } from '../../lib/specificationUtils';
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
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassButton from '../../../shared/components/ui/GlassButton';

interface ComprehensiveProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onEdit?: (product: Product) => void;
}

const ComprehensiveProductModal: React.FC<ComprehensiveProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onEdit
}) => {
  const { getProduct } = useInventoryStore();
  const [currentProduct, setCurrentProduct] = useState(product);
  
  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'inventory' | 'history' | 'details'>('overview');
  
  // Image state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  
  // QR Code state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  // Variant state
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null);
  
  // Purchase order history - LAZY LOADED only when History tab is active
  const [shouldLoadHistory, setShouldLoadHistory] = useState(false);
  const { 
    history: purchaseOrderHistory, 
    stats: poStats, 
    isLoading: isLoadingPOHistory 
  } = usePurchaseOrderHistory(shouldLoadHistory ? product?.id : undefined);
  
  // Scroll state
  const [isScrolled, setIsScrolled] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Update current product when prop changes
  useEffect(() => {
    setCurrentProduct(product);
    if (product?.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    }
  }, [product]);

  // Detect scroll
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

  // OPTIMIZED: Load images only when Overview tab is active or modal first opens
  useEffect(() => {
    const loadImages = async () => {
      if (!product?.id || imagesLoaded) return;
      
      try {
        const productImages = await RobustImageService.getProductImages(product.id);
        setImages(productImages);
        setImagesLoaded(true);
      } catch (error) {
        console.error('Error loading images:', error);
      }
    };

    // Load images immediately on first open
    if (isOpen && product && !imagesLoaded) {
      loadImages();
    }
  }, [isOpen, product?.id, imagesLoaded]);

  // OPTIMIZED: Load purchase history only when History tab is clicked
  useEffect(() => {
    if (activeTab === 'history' && !shouldLoadHistory) {
      setShouldLoadHistory(true);
    }
  }, [activeTab, shouldLoadHistory]);

  // Calculate comprehensive analytics once
  const analytics = useMemo(() => {
    if (!currentProduct?.variants || currentProduct.variants.length === 0) {
      return null;
    }
    
    const totalStock = calculateTotalStock(currentProduct.variants);
    const totalCostValue = calculateTotalCostValue(currentProduct.variants);
    const totalRetailValue = calculateTotalRetailValue(currentProduct.variants);
    const potentialProfit = calculatePotentialProfit(currentProduct.variants);
    const profitMargin = calculateProfitMargin(currentProduct.variants);
    const stockStatus = getStockStatus(currentProduct.variants);
    
    // Calculate additional metrics
    const averageCost = totalStock > 0 ? totalCostValue / totalStock : 0;
    const averagePrice = totalStock > 0 ? totalRetailValue / totalStock : 0;
    const lowStockVariants = currentProduct.variants.filter(v => (v.quantity || 0) <= (v.minQuantity || 0)).length;
    const outOfStockVariants = currentProduct.variants.filter(v => (v.quantity || 0) === 0).length;
    const inStockVariants = currentProduct.variants.filter(v => (v.quantity || 0) > 0).length;
    
    return {
      totalStock,
      totalCostValue,
      totalRetailValue,
      potentialProfit,
      profitMargin,
      stockStatus,
      averageCost,
      averagePrice,
      lowStockVariants,
      outOfStockVariants,
      inStockVariants,
      totalVariants: currentProduct.variants.length
    };
  }, [currentProduct?.variants]);

  // Parse specifications - check both product.specification column and variant attributes
  const specifications = useMemo(() => {
    // Get specification from product specification column or variant attributes
    const specificationText = (currentProduct as any).specification || 
                              currentProduct?.variants?.[0]?.attributes?.specification || 
                              (currentProduct as any).attributes?.specification || 
                              null;
    
    if (!specificationText) return {};
    
    // Try to parse as JSON first (structured specs), otherwise treat as plain text
    try {
      const parsed = JSON.parse(specificationText);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      } else {
        // If it's a valid JSON but not an object (e.g., string), treat as plain text
        return { _raw: specificationText };
      }
    } catch {
      // Not JSON - treat as plain text string
      return { _raw: specificationText };
    }
  }, [currentProduct]);

  if (!isOpen || !product) {
    return null;
  }

  const primaryVariant = currentProduct.variants?.[0];
  const daysInStock = currentProduct.createdAt 
    ? Math.floor((Date.now() - new Date(currentProduct.createdAt).getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  // Generate QR Code
  const handleGenerateQRCode = () => {
    try {
      const productUrl = `${window.location.origin}/lats/products/${product.id}/edit`;
      const qrData = `Product: ${product.name}\nSKU: ${primaryVariant?.sku || 'N/A'}\nPrice: ${format.money(primaryVariant?.sellingPrice || 0)}\nDetails: ${productUrl}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}`;
      setQrCodeUrl(qrUrl);
      setShowQRModal(true);
      toast.success('QR Code generated!');
    } catch (error) {
      toast.error('Failed to generate QR code');
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

  // Add to POS
  const handleAddToPOS = () => {
    try {
      localStorage.setItem('pos_quick_add', JSON.stringify({
        productId: product.id,
        variantId: primaryVariant?.id,
        timestamp: Date.now()
      }));
      
      toast.success('Opening POS...');
      setTimeout(() => {
        window.open('/lats/pos', '_blank');
      }, 500);
    } catch (error) {
      toast.error('Failed to add to POS');
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

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed bg-black/40 backdrop-blur-sm"
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
        className="fixed flex items-center justify-center p-2 sm:p-4" 
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
          className="relative bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 truncate">{currentProduct.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-600 font-mono">{primaryVariant?.sku || 'No SKU'}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    currentProduct.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {currentProduct.isActive ? '● Active' : '○ Inactive'}
                  </span>
                  {currentProduct.isFeatured && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                      ⭐ Featured
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analytics?.totalStock || 0}</div>
              <div className="text-xs text-gray-600 mt-1">Total Stock</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{format.money(primaryVariant?.sellingPrice || 0)}</div>
              <div className="text-xs text-gray-600 mt-1">Selling Price</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{currentProduct.variants?.length || 0}</div>
              <div className="text-xs text-gray-600 mt-1">Variants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{format.money(analytics?.totalRetailValue || 0)}</div>
              <div className="text-xs text-gray-600 mt-1">Total Value</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-shrink-0 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>Overview</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('financials')}
                className={`flex-shrink-0 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'financials'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Financials</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex-shrink-0 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'inventory'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  <span>Inventory</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex-shrink-0 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  <span>History</span>
                  {shouldLoadHistory && purchaseOrderHistory.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                      {purchaseOrderHistory.length}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setActiveTab('details')}
                className={`flex-shrink-0 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span>Details</span>
                </div>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div 
            ref={contentRef}
            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Images */}
                  <div className="lg:col-span-1 space-y-4">
                    {/* Main Image */}
                    <div className="aspect-square relative rounded-xl overflow-hidden bg-gray-50 border-2 border-gray-200">
                      {images.length > 0 ? (
                        <>
                          {(() => {
                            const currentImage = images[selectedImageIndex] || images[0];
                            const imageUrl = currentImage?.thumbnailUrl || currentImage?.url;
                            const isPngImage = imageUrl && (imageUrl.includes('.png') || imageUrl.includes('image/png'));
                            return isPngImage ? <div className="absolute inset-0 bg-white" /> : null;
                          })()}
                          <img
                            src={images[selectedImageIndex]?.url || images[0]?.url}
                            alt={currentProduct.name}
                            className="w-full h-full object-contain relative z-10 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setShowImageGallery(true)}
                          />
                          <button
                            onClick={() => setShowImageGallery(true)}
                            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition-colors"
                          >
                            <ImageIcon className="w-5 h-5 text-gray-700" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <Package className="w-24 h-24 mb-3" />
                          <p className="text-sm font-medium">No images available</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Image Thumbnails */}
                    {images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {images.map((image, index) => (
                          <button
                            key={image.id}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all relative ${
                              index === selectedImageIndex 
                                ? 'border-blue-500 shadow-md' 
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
                              alt={`${currentProduct.name} ${index + 1}`}
                              className="w-full h-full object-cover relative z-10"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Basic Info Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-200">
                        <Info className="w-5 h-5 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-800">Basic Information</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-gray-600 block mb-1">Category</span>
                          <span className="text-sm font-medium text-gray-900">{currentProduct.category?.name || 'Uncategorized'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600 block mb-1">Condition</span>
                          <span className="text-sm font-medium text-gray-900 capitalize">{(currentProduct as any).condition || 'New'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600 block mb-1">Days in Stock</span>
                          <span className="text-sm font-medium text-gray-900">{daysInStock} days</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column - Variants & Specs */}
                  <div className="lg:col-span-1 space-y-4">
                    {/* Variants List */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <Layers className="w-5 h-5 text-purple-600" />
                          <h3 className="text-sm font-semibold text-gray-800">Variants</h3>
                        </div>
                        <span className="text-xs font-medium text-gray-500">{(Array.isArray(currentProduct.variants) ? currentProduct.variants : []).length} total</span>
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {(Array.isArray(currentProduct.variants) ? currentProduct.variants : []).map((variant, index) => {
                          const isSelected = selectedVariant?.id === variant.id;
                          const sourceBadge = getVariantSourceBadge(variant);
                          const identifier = getVariantIdentifier(variant);
                          
                          return (
                            <div
                              key={variant.id || index}
                              onClick={() => setSelectedVariant(variant)}
                              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                                isSelected 
                                  ? 'bg-blue-50 border-blue-300' 
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-sm font-medium truncate ${
                                      isSelected ? 'text-blue-900' : 'text-gray-900'
                                    }`}>
                                      {getVariantDisplayName(variant, `Variant ${index + 1}`)}
                                    </span>
                                    {variant.isPrimary && <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                                  </div>
                                  <p className="text-xs text-gray-500 font-mono">{variant.sku}</p>
                                  {sourceBadge && (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1 ${sourceBadge.className}`}>
                                      {sourceBadge.text}
                                    </span>
                                  )}
                                  {identifier && (
                                    <p className="text-xs text-gray-600 font-mono mt-1">{identifier}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getStockStatusBadge(variant.quantity || 0, variant.minQuantity || 0)}
                                  <span className="text-xs text-gray-600">{variant.quantity || 0} units</span>
                                </div>
                                <span className="text-sm font-bold text-green-600">
                                  {format.money(variant.sellingPrice || 0)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Specifications - Redesigned */}
                    {Object.keys(specifications).length > 0 && (
                      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Tag className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">Technical Specifications</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{Object.keys(specifications).length} {Object.keys(specifications).length === 1 ? 'specification' : 'specifications'}</p>
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(specifications).map(([key, value]) => {
                              const formattedValue = formatSpecificationValue(key, value);
                              const keyLower = key.toLowerCase();
                              
                              // Color coding based on specification type
                              const getSpecColor = () => {
                                if (keyLower.includes('ram') || keyLower.includes('memory')) 
                                  return 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300 text-emerald-900';
                                if (keyLower.includes('storage') || keyLower.includes('capacity')) 
                                  return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 text-blue-900';
                                if (keyLower.includes('processor') || keyLower.includes('cpu') || keyLower.includes('snapdragon') || keyLower.includes('chip')) 
                                  return 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300 text-purple-900';
                                if (keyLower.includes('screen') || keyLower.includes('display') || keyLower.includes('amoled')) 
                                  return 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300 text-orange-900';
                                if (keyLower.includes('battery') || keyLower.includes('mah')) 
                                  return 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-300 text-teal-900';
                                if (keyLower.includes('camera') || keyLower.includes('mp')) 
                                  return 'bg-gradient-to-br from-pink-50 to-pink-100 border-pink-300 text-pink-900';
                                if (keyLower.includes('android') || keyLower.includes('os')) 
                                  return 'bg-gradient-to-br from-green-50 to-green-100 border-green-300 text-green-900';
                                if (keyLower.includes('5g') || keyLower.includes('wifi') || keyLower.includes('bluetooth')) 
                                  return 'bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-300 text-cyan-900';
                                if (keyLower.includes('weight') || keyLower.includes('dimension')) 
                                  return 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300 text-slate-900';
                                return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 text-gray-900';
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
                                  className={`${getSpecColor()} rounded-xl p-4 border-2 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-default`}
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="text-2xl flex-shrink-0 filter drop-shadow-sm">{getSpecIcon()}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5">
                                        {key.replace(/_/g, ' ')}
                                      </div>
                                      <div className="text-base font-bold break-words leading-tight">
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
                  </div>

                  {/* Right Column - Selected Variant Details */}
                  <div className="lg:col-span-1 space-y-4">
                    {selectedVariant && (
                      <>
                        {/* Selected Variant Card */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-200">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <h3 className="text-sm font-semibold text-gray-800">Selected Variant</h3>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <span className="text-xs text-gray-600 block mb-1">Name</span>
                              <span className="text-base font-bold text-gray-900">{getVariantDisplayName(selectedVariant)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className="text-xs text-gray-600 block mb-1">SKU</span>
                                <span className="text-sm font-medium text-gray-900 font-mono">{selectedVariant.sku}</span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-600 block mb-1">Stock</span>
                                <span className="text-sm font-bold text-green-600">{selectedVariant.quantity || 0}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className="text-xs text-gray-600 block mb-1">Selling Price</span>
                                <span className="text-lg font-bold text-green-600">
                                  {format.money(selectedVariant.sellingPrice || 0)}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-600 block mb-1">Cost Price</span>
                                <span className="text-lg font-bold text-red-600">
                                  {format.money(selectedVariant.costPrice || 0)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-xs text-gray-600 block mb-1">Profit per Unit</span>
                              <span className="text-xl font-bold text-blue-600">
                                {format.money((selectedVariant.sellingPrice || 0) - (selectedVariant.costPrice || 0))}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-600 block mb-1">Markup %</span>
                              <span className="text-lg font-bold text-purple-600">
                                {selectedVariant.costPrice > 0 
                                  ? `${(((selectedVariant.sellingPrice - selectedVariant.costPrice) / selectedVariant.costPrice) * 100).toFixed(1)}%`
                                  : 'N/A'
                                }
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-600 block mb-1">Min Stock Level</span>
                              <span className="text-sm font-medium text-gray-900">{selectedVariant.minQuantity || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Variant Attributes */}
                        {(() => {
                          const variantAttrs = formatVariantAttributesForDisplay(selectedVariant);
                          if (variantAttrs.length > 0) {
                            return (
                              <div className="bg-white rounded-xl p-4 border border-gray-200">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                                  <FileText className="w-5 h-5 text-gray-600" />
                                  <h3 className="text-sm font-semibold text-gray-800">Additional Details</h3>
                                </div>
                                <div className="space-y-2">
                                  {variantAttrs.map((attr, idx) => (
                                    <div key={idx} className="flex justify-between items-start py-2 px-3 bg-gray-50 rounded-lg">
                                      <span className="text-sm text-gray-600">{attr.label}</span>
                                      <span className="text-sm font-medium text-gray-900 text-right break-words max-w-[60%]">
                                        {attr.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </>
                    )}

                    {/* Description */}
                    {currentProduct.description && (
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                          <FileText className="w-5 h-5 text-gray-600" />
                          <h3 className="text-sm font-semibold text-gray-800">Description</h3>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {currentProduct.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financials Tab */}
              {activeTab === 'financials' && analytics && (
                <div className="space-y-6">
                  {/* Financial Overview Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700 uppercase">Total Cost Value</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900">{format.money(analytics.totalCostValue)}</div>
                      <div className="text-xs text-blue-600 mt-1">Investment</div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Money className="w-5 h-5 text-green-600" />
                        <span className="text-xs font-medium text-green-700 uppercase">Total Retail Value</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">{format.money(analytics.totalRetailValue)}</div>
                      <div className="text-xs text-green-600 mt-1">Revenue Potential</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Growth className="w-5 h-5 text-purple-600" />
                        <span className="text-xs font-medium text-purple-700 uppercase">Potential Profit</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-900">{format.money(analytics.potentialProfit)}</div>
                      <div className="text-xs text-purple-600 mt-1">If all sold</div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Percent className="w-5 h-5 text-orange-600" />
                        <span className="text-xs font-medium text-orange-700 uppercase">Profit Margin</span>
                      </div>
                      <div className="text-2xl font-bold text-orange-900">{analytics.profitMargin.toFixed(1)}%</div>
                      <div className="text-xs text-orange-600 mt-1">Average margin</div>
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
                        <span className="text-lg font-bold text-red-600">{format.money(analytics.averageCost)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm text-gray-700">Avg Selling Price</span>
                        <span className="text-lg font-bold text-green-600">{format.money(analytics.averagePrice)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm text-gray-700">Avg Profit/Unit</span>
                        <span className="text-lg font-bold text-blue-600">
                          {format.money(analytics.averagePrice - analytics.averageCost)}
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
              {activeTab === 'inventory' && analytics && (
                <div className="space-y-6">
                  {/* Stock Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Box className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700 uppercase">Total Stock</span>
                      </div>
                      <div className="text-3xl font-bold text-blue-900">{analytics.totalStock}</div>
                      <div className="text-xs text-blue-600 mt-1">units across all variants</div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-xs font-medium text-green-700 uppercase">In Stock</span>
                      </div>
                      <div className="text-3xl font-bold text-green-900">{analytics.inStockVariants}</div>
                      <div className="text-xs text-green-600 mt-1">variants available</div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="text-xs font-medium text-red-700 uppercase">Needs Attention</span>
                      </div>
                      <div className="text-3xl font-bold text-red-900">
                        {analytics.lowStockVariants + analytics.outOfStockVariants}
                      </div>
                      <div className="text-xs text-red-600 mt-1">low or out of stock</div>
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
                  {((currentProduct as any).storageRoomName || (currentProduct as any).shelfName || (currentProduct as any).storeLocationName) && (
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <h3 className="text-base font-semibold text-gray-800">Storage Location</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(currentProduct as any).storeLocationName && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <span className="text-xs text-blue-700 block mb-1">Store Location</span>
                            <span className="text-sm font-medium text-gray-900">{(currentProduct as any).storeLocationName}</span>
                          </div>
                        )}
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
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-6">
                  {isLoadingPOHistory ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
                                  <div className="font-medium text-gray-900">{order.supplierName}</div>
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

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Identification */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                      <Hash className="w-5 h-5 text-purple-600" />
                      <h3 className="text-base font-semibold text-gray-800">Identification</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <span className="text-xs text-gray-600 block mb-2">Product ID</span>
                        <span className="text-sm font-medium text-gray-900 font-mono">{currentProduct.id}</span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <span className="text-xs text-gray-600 block mb-2">Primary SKU</span>
                        <span className="text-sm font-medium text-gray-900 font-mono">{primaryVariant?.sku || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Supplier Information */}
                  {currentProduct.supplier && !isTradeInProduct(currentProduct.variants) && (
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                        <Building className="w-5 h-5 text-orange-600" />
                        <h3 className="text-base font-semibold text-gray-800">Supplier Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <span className="text-xs text-gray-600 block mb-2">Supplier Name</span>
                          <span className="text-sm font-medium text-gray-900">{currentProduct.supplier.name}</span>
                        </div>
                        {currentProduct.supplier.contactPerson && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <span className="text-xs text-gray-600 block mb-2">Contact Person</span>
                            <span className="text-sm font-medium text-gray-900">{currentProduct.supplier.contactPerson}</span>
                          </div>
                        )}
                        {currentProduct.supplier.phone && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <span className="text-xs text-gray-600 block mb-2">Phone</span>
                            <span className="text-sm font-medium text-gray-900">{currentProduct.supplier.phone}</span>
                          </div>
                        )}
                        {currentProduct.supplier.email && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <span className="text-xs text-gray-600 block mb-2">Email</span>
                            <span className="text-sm font-medium text-gray-900">{currentProduct.supplier.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Internal Notes */}
                  {(currentProduct as any).internalNotes && (
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <h3 className="text-base font-semibold text-gray-800">Internal Notes</h3>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4">
                        {(currentProduct as any).internalNotes}
                      </p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-base font-semibold text-gray-800">Timestamps</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-xs text-blue-700 block mb-2">Created</span>
                        <span className="text-sm font-medium text-gray-900">
                          {currentProduct.createdAt ? new Date(currentProduct.createdAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-xs text-green-700 block mb-2">Last Updated</span>
                        <span className="text-sm font-medium text-gray-900">
                          {currentProduct.updatedAt ? new Date(currentProduct.updatedAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer Actions */}
          <div className={`flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4 transition-shadow ${
            isScrolled ? 'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' : ''
          }`}>
            <div className="flex flex-wrap items-center gap-3">
              <GlassButton
                onClick={handleAddToPOS}
                className="flex-1 sm:flex-none bg-gradient-to-r from-green-500 to-green-600 text-white"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to POS
              </GlassButton>
              
              <GlassButton
                onClick={handleGenerateQRCode}
                variant="secondary"
                className="flex-1 sm:flex-none"
              >
                <QrCode className="w-4 h-4" />
                QR Code
              </GlassButton>

              <GlassButton
                onClick={handleCopyProductInfo}
                variant="secondary"
                className="flex-1 sm:flex-none"
              >
                <Copy className="w-4 h-4" />
                Copy Info
              </GlassButton>
              
              {onEdit && (
                <GlassButton
                  onClick={() => onEdit(currentProduct)}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                >
                  <Edit className="w-4 h-4" />
                  Edit Product
                </GlassButton>
              )}

              <GlassButton
                onClick={onClose}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                Close
              </GlassButton>
            </div>
          </div>

          {/* QR Code Modal */}
          {showQRModal && createPortal(
            <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 100000 }}>
              <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowQRModal(false)}
              />
              <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
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
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code"
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                  
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <p className="font-medium text-gray-900">{currentProduct.name}</p>
                    <p className="text-xs mt-1">SKU: {primaryVariant?.sku}</p>
                    <p className="text-xs">Price: {format.money(primaryVariant?.sellingPrice || 0)}</p>
                  </div>

                  <div className="flex gap-2">
                    <GlassButton
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = qrCodeUrl;
                        link.download = `${currentProduct.name.replace(/[^a-zA-Z0-9]/g, '_')}_QR.png`;
                        link.click();
                        toast.success('QR Code downloaded!');
                      }}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </GlassButton>
                    
                    <GlassButton
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/lats/products/${currentProduct.id}/edit`);
                        toast.success('Link copied!');
                      }}
                      variant="secondary"
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
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
                            className="w-full h-full object-contain relative z-10"
                          />
                          {image.isPrimary && (
                            <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                              Primary
                            </div>
                          )}
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
      </div>
    </>,
    document.body
  );
};

export default ComprehensiveProductModal;


