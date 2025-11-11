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

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
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
    try {
      setLoading(true);
      
      // Use the customer portal service
      const productData = await customerPortalService.getProductById(id!);
      
      if (!productData) {
        toast.error('Product not found');
        setLoading(false);
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

    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product details');
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
      {/* Image Gallery */}
      <div className="bg-white">
        <div className="relative aspect-square bg-gray-100">
          {images[selectedImageIndex] ? (
            <img
              src={images[selectedImageIndex]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart size={64} className="text-gray-300" />
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={handleShare}
              className="bg-white rounded-full p-3 shadow-lg active:scale-90 transition-transform"
            >
              <Share2 size={20} className="text-gray-700" />
            </button>
            <button
              onClick={toggleFavorite}
              className="bg-white rounded-full p-3 shadow-lg active:scale-90 transition-transform"
            >
              <Heart
                size={20}
                className={isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}
              />
            </button>
          </div>
        </div>

        {/* Image Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                  selectedImageIndex === idx ? 'border-blue-600' : 'border-gray-200'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="bg-white mt-2 p-4">
        {/* Brand & Category */}
        <div className="flex items-center gap-2 mb-2">
          {product.brand && (
            <span className="text-sm text-blue-600 font-medium">{product.brand}</span>
          )}
          {product.category && (
            <span className="text-sm text-gray-500">• {product.category}</span>
          )}
        </div>

        {/* Product Name */}
        <h1 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h1>

        {/* Rating */}
        {product.rating !== undefined && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              <Star size={16} className="fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-gray-900">{product.rating.toFixed(1)}</span>
            </div>
            {product.reviewCount && (
              <span className="text-sm text-gray-500">({product.reviewCount} reviews)</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              Tsh {currentPrice.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-lg text-gray-500 line-through">
                Tsh {comparePrice?.toLocaleString()}
              </span>
            )}
          </div>
          {hasDiscount && (
            <span className="inline-block mt-1 px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded">
              Save {Math.round(((comparePrice! - currentPrice) / comparePrice!) * 100)}%
            </span>
          )}
        </div>

        {/* Stock Status */}
        <div className="mb-4">
          {product.inStock ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={18} />
              <span className="font-medium">In Stock</span>
              {product.stockQuantity && product.stockQuantity < 10 && (
                <span className="text-orange-600 ml-2">
                  (Only {product.stockQuantity} left!)
                </span>
              )}
            </div>
          ) : (
            <div className="text-red-600 font-medium">Out of Stock</div>
          )}
        </div>

        {/* Variants Selection */}
        {product.variants && product.variants.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Select Variant
            </label>
            <div className="grid grid-cols-2 gap-2">
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
                  <div className="font-medium text-sm text-gray-900">{variant.name}</div>
                  <div className="text-sm font-bold text-gray-900 mt-1">
                    Tsh {variant.price.toLocaleString()}
                  </div>
                  {!variant.inStock && (
                    <div className="text-xs text-red-600 mt-1">Out of stock</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selector */}
        {product.inStock && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Minus size={18} />
              </button>
              <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {product.description && (
        <div className="bg-white mt-2 p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Description</h2>
          <p className={`text-gray-700 ${showFullDescription ? '' : 'line-clamp-3'}`}>
            {product.description}
          </p>
          {product.description.length > 150 && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-blue-600 font-medium mt-2 text-sm"
            >
              {showFullDescription ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>
      )}

      {/* Specifications */}
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <div className="bg-white mt-2 p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Specifications</h2>
          <div className="space-y-2">
            {Object.entries(product.specifications).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">{key}</span>
                <span className="text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="bg-white mt-2 p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-2">
              <Truck size={24} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">Free Delivery</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-2">
              <Shield size={24} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">Warranty</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-2">
              <CheckCircle size={24} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">Quality</span>
          </div>
        </div>
      </div>

      {/* Add to Cart Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <button
          onClick={handleAddToCart}
          disabled={!product.inStock}
          className={`w-full py-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all ${
            product.inStock
              ? 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          <ShoppingCart size={20} />
          {product.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>

      {/* Spacer for fixed button */}
      <div className="h-24"></div>
    </MobileLayout>
  );
};

export default ProductDetailPage;

