import React, { useRef, useEffect } from 'react';
import { Package, Plus } from 'lucide-react';
import { format } from '../../lats/lib/format';
import { useSwipeToAction } from '../../../hooks/useSwipeGesture';

interface TabletProductGridProps {
  products: any[];
  onAddToCart: (product: any) => void;
  productImages: Record<string, string>;
  cartItems: any[];
  sizes: any;
}

const TabletProductGrid: React.FC<TabletProductGridProps> = ({
  products,
  onAddToCart,
  productImages,
  cartItems,
  sizes,
}) => {
  if (products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Package size={64} className="text-gray-300 mx-auto mb-4" />
          <p style={{ fontSize: `${sizes.textLg}px` }} className="text-gray-500">
            No products found
          </p>
        </div>
      </div>
    );
  }

  // Render each product through a child component so hooks stay at the top level.
  return (
    <div
      className="p-6"
      style={{
        paddingLeft: `${sizes.spacing8}px`,
        paddingRight: `${sizes.spacing8}px`,
        paddingTop: `${sizes.spacing6}px`,
        paddingBottom: `${sizes.spacing6}px`,
      }}
    >
      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: `${sizes.gapLg}px`,
        }}
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            productImages={productImages}
            sizes={sizes}
            cartItems={cartItems}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </div>
  );
};

// Extracted to keep hooks at component scope (avoids React static flag error).
const ProductCard: React.FC<{
  product: any;
  productImages: Record<string, string>;
  sizes: any;
  cartItems: any[];
  onAddToCart: (product: any) => void;
}> = ({ product, productImages, sizes, cartItems, onAddToCart }) => {
  const variant = product.variants?.[0];
  const inCart = cartItems.find(item => item.variantId === variant?.id);

  // Get price from variant or fallback to product
  const displayPrice = variant?.selling_price || variant?.price || product.price || product.selling_price || 0;
  const stockQty = variant?.quantity || variant?.stock_quantity || product.stockQuantity || 0;

  // Swipe gesture handling
  const cardRef = useRef<HTMLDivElement>(null);

  const { attachListeners, detachListeners } = useSwipeToAction(
    () => {
      // Swipe left - could be used for quick actions (like view details)
      console.log('Swiped left on product:', product.name);
    },
    () => {
      // Swipe right - add to cart
      console.log('Swiped right on product:', product.name);
      if (!inCart) {
        onAddToCart(product);
      }
    }
  );

  useEffect(() => {
    if (cardRef.current) {
      attachListeners(cardRef.current);
    }
    return () => detachListeners();
  }, [attachListeners, detachListeners]);

  return (
    <div
      ref={cardRef}
      onClick={() => onAddToCart(product)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer active:scale-[0.98] select-none"
      style={{
        WebkitTapHighlightColor: 'transparent',
        padding: `${sizes.productCardPadding * 1.5}px`,
        touchAction: 'pan-y', // Allow vertical scrolling but capture horizontal swipes
      }}
    >
      {/* Product Image */}
      <div className="relative mb-4">
        {(productImages[product.id] || product.image_url) ? (
          <div
            className="w-full aspect-square bg-gray-50 rounded-xl overflow-hidden"
            style={{ borderRadius: `${sizes.radiusXl}px` }}
          >
            <img
              src={productImages[product.id] || product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg width="${sizes.iconSizeXl * 2}" height="${sizes.iconSizeXl * 2}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>`;
                }
              }}
            />
          </div>
        ) : (
          <div
            className="w-full aspect-square bg-gray-50 rounded-xl flex items-center justify-center"
            style={{ borderRadius: `${sizes.radiusXl}px` }}
          >
            <Package size={sizes.iconSizeXl * 2} className="text-gray-300" />
          </div>
        )}

        {/* Stock indicator */}
        {stockQty > 0 && stockQty <= 5 && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            Low Stock
          </div>
        )}

        {stockQty === 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            Out of Stock
          </div>
        )}

        {/* Quantity in cart badge */}
        {inCart && (
          <div
            className="absolute -bottom-2 -right-2 bg-blue-500 text-white font-bold rounded-full flex items-center justify-center shadow-lg"
            style={{
              width: `${sizes.spacing10}px`,
              height: `${sizes.spacing10}px`,
              fontSize: `${sizes.textBase}px`,
            }}
          >
            {inCart.quantity}
          </div>
        )}
      </div>

      {/* Product Name */}
      <h3
        style={{ fontSize: `${sizes.textLg}px` }}
        className="font-semibold text-gray-900 mb-3 line-clamp-2 leading-tight"
      >
        {product.name}
      </h3>

      {/* Price and Stock Info */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span style={{ fontSize: `${sizes.text2xl}px` }} className="font-bold text-gray-900">
            {format.currency(displayPrice)}
          </span>
          {stockQty > 0 && (
            <span style={{ fontSize: `${sizes.textSm}px` }} className="text-green-600 font-medium">
              {stockQty} in stock
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <div
          className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-full flex items-center justify-center shadow-md transition-all duration-200"
          style={{
            width: `${sizes.spacing12}px`,
            height: `${sizes.spacing12}px`,
          }}
        >
          <Plus size={Math.round(sizes.iconSizeLg)} className="text-white" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
};

export default TabletProductGrid;