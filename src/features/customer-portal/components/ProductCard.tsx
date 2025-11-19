import React from 'react';
import { Heart, ShoppingCart, Star, Check, Plus } from 'lucide-react';
import { CustomerProduct } from '../types';

interface ProductCardProps {
  product: CustomerProduct;
  onProductClick: (product: CustomerProduct) => void;
  onAddToCart?: (product: CustomerProduct) => void;
  onToggleFavorite?: (productId: string) => void;
  isFavorite?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onProductClick,
  onAddToCart,
  onToggleFavorite,
  isFavorite = false
}) => {
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart && product.inStock) {
      onAddToCart(product);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(product.id);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden max-w-sm mx-auto">
      {/* Product Image - Matches Sophie's photo section EXACTLY */}
      <div className="relative w-full aspect-square bg-gray-100 rounded-t-2xl overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingCart size={64} strokeWidth={1.5} />
          </div>
        )}
        
        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow">
            -{discountPercentage}%
          </div>
        )}
        
        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            onClick={handleToggleFavorite}
            className="absolute top-3 right-3 bg-white rounded-full p-2 shadow hover:shadow-md transition-shadow"
          >
            <Heart
              size={18}
              className={isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}
            />
          </button>
        )}
        
        {/* Out of Stock Overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info - Matches Sophie's text section */}
      <div 
        onClick={() => onProductClick(product)}
        className="p-5 cursor-pointer"
      >
        {/* Product Name with Verified Badge (like "Sophie Bennett" with checkmark) */}
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-lg font-bold text-gray-900">
            {product.name}
          </h3>
          {product.brand && (
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Check size={14} className="text-white" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Category & Brand (like "Product Designer who focuses on...") */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {product.brand && <span className="font-medium">{product.brand}</span>}
          {product.brand && product.category && <span> • </span>}
          {product.category}
        </p>

        {/* Metrics Section (like followers/posts) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Price Metric */}
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-gray-900">
                Tsh {product.price.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-xs text-gray-400 line-through">
                  {product.compareAtPrice?.toLocaleString()}
                </span>
              )}
            </div>
            
            {/* Rating Metric (like follower count) */}
            {product.rating !== undefined && (
              <div className="flex items-center gap-1">
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                <span className="text-sm text-gray-700 font-medium">{product.rating.toFixed(1)}</span>
                {product.reviewCount && (
                  <span className="text-sm text-gray-500">({product.reviewCount})</span>
                )}
              </div>
            )}
          </div>

          {/* Add to Cart Button (like "Follow" button) */}
          {onAddToCart && product.inStock && (
            <button
              onClick={handleAddToCart}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Stock Warning */}
        {product.inStock && product.stockQuantity !== undefined && product.stockQuantity < 10 && (
          <div className="mt-3 text-xs text-orange-600 font-medium">
            Only {product.stockQuantity} left in stock
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;


