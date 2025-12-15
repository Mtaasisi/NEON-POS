import React, { useState } from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import { CustomerProduct } from '../types';

interface ProductCardProps {
  product: CustomerProduct;
  onProductClick: (product: CustomerProduct) => void;
  onAddToCart?: (product: CustomerProduct) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onProductClick,
  onAddToCart
}) => {
  const [imageError, setImageError] = useState(false);

  // Get price from variant or fallback to product
  const displayPrice = product.variants?.[0]?.price || product.price || 0;


  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart && product.inStock) {
      onAddToCart(product);
    }
  };

  // Image bleed calculations (following tablet POS design)
  const imageBleed = 8;
  const cartButtonSize = 44;
  const cartButtonOffset = Math.round(imageBleed / 2);

  return (
    <div
      onClick={() => onProductClick(product)}
      className="bg-white rounded-[28px] border border-gray-100 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-[0.98] select-none relative"
      style={{
        WebkitTapHighlightColor: 'transparent',
        padding: `${Math.max(16, Math.round(20 * 0.9))}px`,
        touchAction: 'pan-y',
      }}
    >
      {/* Product Image - Following tablet POS design with bleed effect */}
      <div
        className="relative"
        style={{
          marginTop: `-${imageBleed}px`,
          marginBottom: `${imageBleed}px`,
        }}
      >

        {/* Product Image with bleed effect */}
        {(product.imageUrl || product.images?.[0]) && !imageError ? (
          <div
            className="w-full aspect-square bg-gray-50 overflow-hidden border border-gray-200"
            style={{
              borderRadius: '28px',
              marginLeft: `-${imageBleed}px`,
              marginRight: `-${imageBleed}px`,
              width: `calc(100% + ${imageBleed * 2}px)`
            }}
          >
            <img
              src={product.imageUrl || product.images?.[0]}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div
            className="w-full aspect-square bg-gray-50 flex items-center justify-center border border-gray-200"
            style={{
              borderRadius: '28px',
              marginLeft: `-${imageBleed}px`,
              marginRight: `-${imageBleed}px`,
              width: `calc(100% + ${imageBleed * 2}px)`
            }}
          >
            <Package size={48} className="text-gray-300" />
          </div>
        )}

        {/* Floating cart button - Following tablet POS design */}
        {onAddToCart && product.inStock && (
          <button
            onClick={handleAddToCart}
            className="absolute -bottom-5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-full flex items-center justify-center border border-white transition-all duration-200 shadow-md"
            style={{
              width: cartButtonSize,
              height: cartButtonSize,
              right: -cartButtonOffset,
              WebkitTapHighlightColor: 'transparent',
            }}
            title="Add to cart"
          >
            <ShoppingCart size={Math.max(16, Math.round(cartButtonSize * 0.45))} className="text-white" />
          </button>
        )}
      </div>

      {/* Product Price - Prominently displayed first (following tablet POS hierarchy) */}
      <h3
        className="font-bold text-gray-900 mb-1 leading-tight text-lg"
      >
        Tsh {Math.round(displayPrice).toLocaleString('en-US')}
      </h3>

      {/* Product Name - Secondary information with proper truncation */}
      <h4
        className="text-blue-600 font-medium text-base truncate"
        title={product.name}
      >
        {product.name}
      </h4>

      {/* Spacer for consistent card height */}
      <div className="flex-1"></div>
    </div>
  );
};

export default ProductCard;


