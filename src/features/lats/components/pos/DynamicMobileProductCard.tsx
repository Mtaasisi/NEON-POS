import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Package, Plus, Minus, Loader2 } from 'lucide-react';
import { ProductSearchResult } from '../../types/pos';
import { toast } from 'react-hot-toast';
import { RESPONSIVE_OPTIMIZATIONS } from '../../../shared/constants/theme';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';

interface DynamicMobileProductCardProps {
  product: ProductSearchResult;
  onAddToCart: (product: ProductSearchResult, variant?: any, quantity?: number) => void;
  isVisible?: boolean;
  priority?: boolean;
}

const DynamicMobileProductCard: React.FC<DynamicMobileProductCardProps> = ({
  product,
  onAddToCart,
  isVisible = true,
  priority = false
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0]);
  const [isLoaded, setIsLoaded] = useState(priority);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isTextLoaded, setIsTextLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Initialize click sounds
  const { playCartAddSound, playClickSound } = usePOSClickSounds();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsLoaded(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the card comes into view
        threshold: 0.1
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isLoaded]);

  // Progressive loading of content
  useEffect(() => {
    if (!isLoaded) return;

    // Load image first
    const imageTimer = setTimeout(() => {
      setIsImageLoaded(true);
    }, 100);

    // Load text content after image
    const textTimer = setTimeout(() => {
      setIsTextLoaded(true);
    }, 200);

    return () => {
      clearTimeout(imageTimer);
      clearTimeout(textTimer);
    };
  }, [isLoaded]);

  const handleAddToCart = useCallback(() => {
    console.log('🛒 DynamicMobileProductCard: handleAddToCart called for', product.name);
    
    // Play cart add sound
    playCartAddSound();
    
    onAddToCart(product, selectedVariant, quantity);
    toast.success(`${quantity}x ${product.name} added to cart`);
  }, [product, selectedVariant, quantity, onAddToCart, playCartAddSound]);

  const formatPrice = useCallback((price: number) => {
    return price.toLocaleString() + ' TSH';
  }, []);

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden animate-pulse">
      <div className="p-6">
        {/* Product Info Skeleton */}
        <div className="flex items-center gap-4">
          {/* Image skeleton */}
          <div className="w-20 h-20 bg-gray-200 rounded-xl"></div>
          
          {/* Name and Price skeleton */}
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-gray-200 my-4"></div>
        
        {/* Badges skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-16"></div>
          <div className="h-6 bg-gray-200 rounded w-20"></div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-gray-200 my-3"></div>
        
        {/* Click text skeleton */}
        <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
      </div>
    </div>
  );

  // Show skeleton while loading
  if (!isLoaded) {
    return (
      <div ref={cardRef}>
        <SkeletonLoader />
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      onClick={handleAddToCart}
      className="pos-product-card relative bg-white border-2 rounded-xl transition-all duration-300 overflow-hidden cursor-pointer hover:border-blue-300 hover:shadow-lg active:scale-98 border-gray-200"
      style={{
        opacity: isLoaded ? 1 : 0,
        transform: isLoaded ? 'translateY(0)' : 'translateY(10px)'
      }}
      title="Click to add to cart"
    >
      {/* Stock Badge - Top Right */}
      {isTextLoaded && product.stock_quantity !== undefined && (
        <div className="absolute top-2 right-2 p-2 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20 w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500">
          <span className="text-sm font-bold text-white">{product.stock_quantity}</span>
        </div>
      )}

      {/* Card Content */}
      <div className="p-6 cursor-pointer">
        {/* Product Info Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Product Image/Icon */}
            <div className="relative w-20 h-20 rounded-xl flex items-center justify-center text-lg font-bold text-blue-600 cursor-pointer hover:opacity-90 transition-opacity">
              {isImageLoaded && product.thumbnail_url ? (
                <img
                  src={product.thumbnail_url}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                    if (fallback) {
                      (fallback as HTMLElement).classList.remove('hidden');
                    }
                  }}
                />
              ) : null}
              {/* Fallback Icon */}
              <div className={`fallback-icon bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center w-full h-full rounded-xl ${product.thumbnail_url && isImageLoaded ? 'hidden' : ''}`}>
                {!isImageLoaded ? (
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-gray-400">
                    <path d="M16.5 9.4 7.55 4.24"></path>
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.29 7 12 12 20.71 7"></polyline>
                    <line x1="12" x2="12" y1="22" y2="12"></line>
                  </svg>
                )}
              </div>
            </div>

            {/* Product Name and Price */}
            <div className="flex-1 min-w-0">
              {isTextLoaded ? (
                <>
                  <div className="font-medium text-gray-800 truncate text-xl leading-tight" title={product.name}>
                    {product.name}
                  </div>
                  <div className="text-2xl text-gray-700 mt-1 font-bold">
                    TSh {(selectedVariant?.price || product.price).toLocaleString()}
                  </div>
                </>
              ) : (
                <>
                  <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mt-1 animate-pulse"></div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SKU and Category Section */}
        {isTextLoaded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              {/* SKU Badge */}
              <div className="flex items-center gap-4">
                {product.sku && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                      📦 {product.sku}
                    </span>
                  </div>
                )}
              </div>

              {/* Category Badge */}
              <div className="flex items-center gap-2">
                {product.category_name && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
                    📦 {product.category_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Click to Add to Cart Text */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-center text-sm font-medium text-blue-600 opacity-70 hover:opacity-100 transition-opacity">
            Click to Add to Cart
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicMobileProductCard;
