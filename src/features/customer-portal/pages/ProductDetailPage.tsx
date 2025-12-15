import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MobileLayout from '../components/MobileLayout';
import { 
  Heart, 
  Share2, 
  Star,
  ShoppingCart,
  Minus,
  Plus,
  CheckCircle,
  Truck,
  Shield,
  ChevronRight
} from 'lucide-react';
import { CustomerProduct } from '../types';
import toast from 'react-hot-toast';
import customerPortalService from '../services/customerPortalService';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  
  const [product, setProduct] = useState<CustomerProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

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

  const handleAddToCart = () => {
    if (!product) return;

    if (!selectedVariantId && product.variants && product.variants.length > 0) {
      toast.error('Please select a variant');
      return;
    }

    const selectedVariant = product.variants?.find(v => v.id === selectedVariantId);
    
    if (selectedVariant && !selectedVariant.inStock) {
      toast.error('This variant is out of stock');
      return;
    }

    // Get existing cart
    const cartStr = localStorage.getItem('customer_cart');
    const cart = cartStr ? JSON.parse(cartStr) : [];

    // Add to cart
    const cartItem = {
      productId: product.id,
      productName: product.name,
      variantId: selectedVariantId,
      variantName: selectedVariant?.name,
      quantity,
      price: selectedVariant?.price || product.price,
      imageUrl: product.imageUrl
    };

    // Check if item already in cart
    const existingIndex = cart.findIndex(
      (item: any) => item.productId === product.id && item.variantId === selectedVariantId
    );

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push(cartItem);
    }

    localStorage.setItem('customer_cart', JSON.stringify(cart));
    toast.success('Added to cart');
    
    // Optional: Navigate to cart
    // navigate('/customer-portal/cart');
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
  const images = product.images?.length > 0 ? product.images : [product.imageUrl].filter(Boolean);

  return (
    <MobileLayout title={product.name} showBackButton showBottomNav={false}>
      {/* Product Image - Matching card design with bleed effect */}
      <div className="relative px-4 pt-6 pb-4">
        <div
          className="relative"
          style={{
            marginTop: '-8px',
            marginBottom: '8px',
          }}
        >
          <div className="relative aspect-square bg-gray-50 overflow-hidden border border-gray-200"
               style={{ borderRadius: '28px' }}>
            {images[selectedImageIndex] ? (
              <img
                src={images[selectedImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
                style={{
                  marginLeft: '-8px',
                  marginRight: '-8px',
                  width: 'calc(100% + 16px)'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingCart size={64} className="text-gray-300" />
              </div>
            )}

            {/* Action Buttons - Repositioned */}
            <div className="absolute top-6 right-6 flex gap-2">
              <button
                onClick={handleShare}
                className="bg-white rounded-full p-2 shadow-lg active:scale-90 transition-transform"
              >
                <Share2 size={18} className="text-gray-700" />
              </button>
              <button
                onClick={toggleFavorite}
                className="bg-white rounded-full p-2 shadow-lg active:scale-90 transition-transform"
              >
                <Heart
                  size={18}
                  className={isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}
                />
              </button>
            </div>
          </div>

          {/* Floating Add to Cart Button - Matching card design */}
          <button
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className={`absolute bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-full flex items-center justify-center border border-white transition-all duration-200 shadow-md ${
              product.inStock ? '' : 'bg-gray-400 cursor-not-allowed'
            }`}
            style={{
              width: '44px',
              height: '44px',
              right: '-8px',
              bottom: '-18px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ShoppingCart size={20} className="text-white" />
          </button>
        </div>

        {/* Image Thumbnails - Redesigned */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto py-3">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 ${
                  selectedImageIndex === idx ? 'border-blue-600' : 'border-gray-200'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info - Matching card design */}
      <div className="px-4 pb-6">
        {/* Price - Prominently displayed first (matching card hierarchy) */}
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          Tsh {Math.round(currentPrice).toLocaleString('en-US')}
        </h1>

        {/* Product Name - Secondary (matching card design) */}
        <h2 className="text-lg font-medium text-blue-600 mb-3 truncate">
          {product.name}
        </h2>

        {/* Brand & Category */}
        <div className="flex items-center gap-1.5 mb-3">
          {product.brand && (
            <>
              <span className="text-sm font-medium text-gray-700">{product.brand}</span>
              {product.category && <span className="text-gray-400">•</span>}
            </>
          )}
          {product.category && (
            <span className="text-sm text-gray-600">{product.category}</span>
          )}
        </div>

        {/* Rating */}
        {product.rating !== undefined && (
          <div className="flex items-center gap-1 mb-4">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-700 font-medium">{product.rating.toFixed(1)}</span>
            {product.reviewCount && (
              <span className="text-sm text-gray-500">({product.reviewCount})</span>
            )}
          </div>
        )}

        {/* Discount display */}
        {hasDiscount && (
          <div className="mb-4">
            <span className="text-base text-gray-500 line-through">
              Tsh {Math.round(comparePrice!).toLocaleString('en-US')}
            </span>
            <span className="inline-block ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded">
              Save {Math.round(((comparePrice! - currentPrice) / comparePrice!) * 100)}%
            </span>
          </div>
        )}

        {/* Stock Status - Simplified */}
        <div className="mb-4">
          {product.inStock ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} />
              <span className="font-medium">In Stock</span>
              {product.stockQuantity && product.stockQuantity < 10 && (
                <span className="text-orange-600 ml-2">
                  Only {product.stockQuantity} left
                </span>
              )}
            </div>
          ) : (
            <div className="text-red-600 font-medium text-sm">Out of Stock</div>
          )}
        </div>

        {/* Variants Selection - Cleaner design */}
        {product.variants && product.variants.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Select Variant
            </label>
            <div className="grid grid-cols-1 gap-2">
              {product.variants.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariantId(variant.id)}
                  disabled={!variant.inStock}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedVariantId === variant.id
                      ? 'border-blue-600 bg-blue-50'
                      : variant.inStock
                      ? 'border-gray-200 hover:border-gray-300'
                      : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm text-gray-900">{variant.name}</div>
                    <div className="text-sm font-bold text-gray-900">
                      Tsh {Math.round(variant.price).toLocaleString('en-US')}
                    </div>
                  </div>
                  {!variant.inStock && (
                    <div className="text-xs text-red-600 mt-1">Out of stock</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selector - Cleaner design */}
        {product.inStock && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-3">Quantity</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Minus size={16} />
              </button>
              <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {product.description && (
        <div className="px-4 pb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3">Description</h2>
          <p className={`text-gray-700 text-sm leading-relaxed ${showFullDescription ? '' : 'line-clamp-3'}`}>
            {product.description}
          </p>
          {product.description.length > 150 && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-blue-600 font-medium mt-3 text-sm"
            >
              {showFullDescription ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>
      )}

      {/* Specifications */}
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <div className="px-4 pb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3">Specifications</h2>
          <div className="space-y-3">
            {Object.entries(product.specifications).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium text-sm">{key}</span>
                <span className="text-gray-900 text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="px-4 pb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-2">
              <Truck size={20} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">Free Delivery</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-2">
              <Shield size={20} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">Warranty</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-2">
              <CheckCircle size={20} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">Quality</span>
          </div>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-8"></div>
    </MobileLayout>
  );
};

export default ProductDetailPage;

