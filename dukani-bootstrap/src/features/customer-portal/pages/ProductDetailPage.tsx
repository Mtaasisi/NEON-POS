import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MobileLayout from '../components/MobileLayout';
import { CustomerProduct } from '../types';
import toast from 'react-hot-toast';
import customerPortalService from '../services/customerPortalService';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import CustomTipModal from '../components/CustomTipModal';
import TipsModal from '../components/TipsModal';
import VariantSelectionModal from '../components/VariantSelectionModal';
import ImageCarousel from '../components/ImageCarousel';
import StickyBottomBar from '../components/StickyBottomBar';
import {
  Smartphone,
  Monitor,
  HardDrive,
  Database,
  Camera,
  Battery,
  Wifi,
  Settings,
  Ruler,
  Headphones,
  Palette,
  Laptop,
  FileText,
  Wrench,
  Cpu,
  Gauge
} from 'lucide-react';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  
  const [product, setProduct] = useState<CustomerProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImageIndex] = useState(0); // For ImageCarousel compatibility
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedTipId, setSelectedTipId] = useState<string | null>(null);
  const [customTipOpen, setCustomTipOpen] = useState(false);
  const [customTipAmount, setCustomTipAmount] = useState<number>(0);
  const [tipsModalOpen, setTipsModalOpen] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadProductDetail();
      checkFavorite();
    }
  }, [id]);

  const loadProductDetail = async () => {
    const jobId = startLoading('Loading product...');
    
    try {
      setLoading(true);
      
      // Use the customer portal service
      const productData = await customerPortalService.getProductById(id!);
      
      if (!productData) {
        toast.error('Product not found');
        setLoading(false);
        failLoading(jobId, 'Product not found');
        return;
      }

      setProduct(productData);
      
      // Auto-select first available variant
      if (productData.variants && productData.variants.length > 0) {
        const firstAvailable = productData.variants.find(v => v.inStock);
        if (firstAvailable) {
          setSelectedVariantId(firstAvailable.id);
        }
      }

      completeLoading(jobId);
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product details');
      failLoading(jobId, 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = () => {
    const saved = localStorage.getItem('customer_favorites');
    if (saved) {
      const favorites = JSON.parse(saved);
      setIsFavorite(favorites.includes(id));
    }
  };

  const toggleFavorite = () => {
    const saved = localStorage.getItem('customer_favorites');
    const favorites = saved ? JSON.parse(saved) : [];
    
    const newFavorites = isFavorite
      ? favorites.filter((fId: string) => fId !== id)
      : [...favorites, id];
    
    localStorage.setItem('customer_favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} at our store!`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };


  if (loading) {
    return (
      <MobileLayout title="Loading..." showBackButton>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MobileLayout>
    );
  }

  if (!product) {
    return (
      <MobileLayout title="Product Not Found" showBackButton>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="text-gray-600 mb-4">Product not found</p>
          <button
            onClick={() => navigate('/customer-portal/products')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Products
          </button>
        </div>
      </MobileLayout>
    );
  }

  const selectedVariant = product.variants?.find(v => v.id === selectedVariantId);
  const currentPrice = selectedVariant?.price || product.price;
  const comparePrice = selectedVariant?.compareAtPrice;
  const hasDiscount = comparePrice && comparePrice > currentPrice;
  const images = (product.images && product.images.length > 0) ? product.images : [product.imageUrl].filter((url): url is string => Boolean(url));

  return (
    <MobileLayout title={product.name} showBackButton showBottomNav={false}>
      {/* Image carousel with thumbnails and overlay actions */}
      <ImageCarousel
        images={images}
        initialIndex={selectedImageIndex}
        isFavorite={isFavorite}
        onShare={handleShare}
        onToggleFavorite={toggleFavorite}
      />

      {/* Beautifully Redesigned Product Info */}
      <div className="px-4 pb-6">
        <div className="max-w-4xl mx-auto">
          {/* Main Product Card with Flat Design */}
          <div className="bg-white rounded-[28px] shadow-xl border overflow-hidden mb-6">
            <div className="p-6 md:p-8">
              {/* Product Header with Badge */}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-0">
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </span>

              {/* Price Section with Simple Typography */}
              <div className="mb-0">
                <div className="flex items-baseline gap-2 mb-0">
                  <span className="text-4xl md:text-5xl font-black text-gray-900">
                    Tsh {Math.round(currentPrice).toLocaleString('en-US')}
                  </span>
                  {hasDiscount && comparePrice && (
                    <span className="text-lg text-slate-500 line-through">
                      Tsh {Math.round(comparePrice).toLocaleString('en-US')}
                    </span>
                  )}
                </div>
                {hasDiscount && comparePrice && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-semibold">
                    Save {Math.round(((comparePrice - currentPrice) / comparePrice) * 100)}%
                  </div>
                )}
              </div>

              {/* Variant Selection Options Info */}
              <div className="mb-1">
                <p className="text-slate-700 leading-relaxed text-sm">
                  📦 Dropdown Style - Like e-commerce sites (Nike, Amazon)<br/>
                  🔘 Better Radio Buttons - Larger, more prominent selection
                </p>
              </div>


              {/* Customer Portal Specifications */}
              {product.portalSpecification && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Technical Specifications</h3>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {product.portalSpecification.split('\n').filter(line => line.trim()).map((line, index) => {
                        const [key, ...valueParts] = line.split(':');
                        const value = valueParts.join(':').trim();

                        // Simple flat icons for specifications - unique icons for each type
                        const getSpecIcon = (key: string) => {
                          const lowerKey = key.toLowerCase().trim();
                          if (lowerKey.includes('model')) return <Smartphone className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('display') || lowerKey.includes('screen')) return <Monitor className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('processor')) return <Cpu className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('graphics')) return <Gauge className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('memory') || lowerKey.includes('ram')) return <Database className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('storage')) return <HardDrive className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('camera')) return <Camera className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('battery')) return <Battery className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('connectivity') || lowerKey.includes('wifi') || lowerKey.includes('bluetooth')) return <Wifi className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('sensors')) return <Settings className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('dimensions') || lowerKey.includes('weight') || lowerKey.includes('size')) return <Ruler className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('ports') || lowerKey.includes('audio')) return <Headphones className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('color') || lowerKey.includes('options')) return <Palette className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('os') || lowerKey.includes('system')) return <Laptop className="w-4 h-4 text-gray-600" />;
                          if (lowerKey.includes('notes')) return <FileText className="w-4 h-4 text-gray-600" />;
                          return <Wrench className="w-4 h-4 text-gray-600" />;
                        };

                        return (
                          <div key={index} className="p-4 hover:bg-gray-50 transition-colors duration-200">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                {getSpecIcon(key)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm mb-1">
                                  {key.trim()}
                                </div>
                                <div className="text-gray-700 text-sm leading-relaxed">
                                  {value}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      
      <CustomTipModal
        isOpen={customTipOpen}
        initialAmount={customTipAmount}
        onClose={() => setCustomTipOpen(false)}
        onSave={(amount) => {
          setCustomTipAmount(amount);
          setSelectedTipId('custom');
        }}
      />

      <TipsModal
        isOpen={tipsModalOpen}
        onClose={() => setTipsModalOpen(false)}
        productPrice={currentPrice}
        selectedTipId={selectedTipId}
        onTipSelect={(tipId, amount) => {
          setSelectedTipId(tipId);
          setCustomTipAmount(amount);
          setTipsModalOpen(false);
        }}
        onCustomTip={() => {
          setTipsModalOpen(false);
          setCustomTipOpen(true);
        }}
      />

      <VariantSelectionModal
        isOpen={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        product={product}
        selectedVariantId={selectedVariantId}
        onVariantSelect={(variantId) => {
          setSelectedVariantId(variantId);
        }}
        onAddToCart={() => {
          // Handle add to cart logic here
          toast.success('Added to cart successfully!');
          setVariantModalOpen(false);
          setTipsModalOpen(true); // Open tips modal after adding to cart
        }}
      />

      <StickyBottomBar
        price={currentPrice}
        tipAmount={customTipAmount}
        onAddToCart={() => setVariantModalOpen(true)}
        disabled={!product.inStock}
      />
    </MobileLayout>
  );
};

export default ProductDetailPage;

