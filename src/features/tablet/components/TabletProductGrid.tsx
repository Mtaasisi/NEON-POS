import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Package, ShoppingBag, Check } from 'lucide-react';
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
  // Dynamically scale down/up the card UI based on how many products are shown.
  // Keeps density consistent when the grid gets crowded or sparse.
  const densityScale = useMemo(() => {
    const productCount = Math.max(products.length, 1);
    const base = 2.2 / Math.cbrt(productCount); // Smooth falloff
    const scaled = base * sizes.scale;
    return Math.min(1.2, Math.max(0.9, scaled));
  }, [products.length, sizes.scale]);

  // Detect wide screens (iPad/tablet) to favor 4 columns
  const isWideScreen = typeof window !== 'undefined' ? window.innerWidth >= 1024 : false;

  const responsiveSizes = useMemo(
    () => ({
      ...sizes,
      textLg: Math.max(12, Math.round(sizes.textLg * densityScale)),
      text3xl: Math.max(18, Math.round(sizes.text3xl * densityScale)),
      spacing4: Math.max(8, Math.round(sizes.spacing4 * densityScale)),
      spacing6: Math.max(10, Math.round(sizes.spacing6 * densityScale)),
      gapLg: Math.max(10, Math.round(sizes.gapLg * densityScale)),
      productCardPadding: Math.max(12, Math.round(sizes.productCardPadding * densityScale)),
      radiusXl: Math.max(14, Math.round(sizes.radiusXl * densityScale)),
      iconSizeXl: Math.max(20, Math.round(sizes.iconSizeXl * densityScale)),
      spacing10: Math.max(20, Math.round(sizes.spacing10 * densityScale)),
    }),
    [sizes, densityScale]
  );

  // Target 4 columns on iPad widths; clamp to keep cards compact and consistent
  const minCardWidth = useMemo(() => {
    const base = isWideScreen ? 220 : 240;
    const scaled = Math.round(base * densityScale);
    return Math.min(240, Math.max(200, scaled));
  }, [isWideScreen, densityScale]);

  if (products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Package size={64} className="text-gray-300 mx-auto mb-4" />
          <p style={{ fontSize: `${responsiveSizes.textLg}px` }} className="text-gray-500">
            No products found
          </p>
        </div>
      </div>
    );
  }

  // Render each product through a child component so hooks stay at the top level.
  return (
    <div
      className="p-4 bg-gray-100 rounded-3xl"
      style={{
        paddingLeft: `${responsiveSizes.spacing6}px`,
        paddingRight: `${responsiveSizes.spacing6}px`,
        paddingTop: `${responsiveSizes.spacing4}px`,
        paddingBottom: `${responsiveSizes.spacing4}px`,
      }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
          gap: `${responsiveSizes.gapLg}px`,
        }}
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            productImages={productImages}
            sizes={responsiveSizes}
            cartItems={cartItems}
            onAddToCart={onAddToCart}
            densityScale={densityScale}
            minCardWidth={minCardWidth}
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
  densityScale?: number;
  minCardWidth?: number;
}> = ({ product, productImages, sizes, cartItems, onAddToCart, densityScale = 1, minCardWidth }) => {
  const variant = product.variants?.[0];
  const inCart = cartItems.find(item => item.variantId === variant?.id);
  // Calculate total quantity of this product across all variants in cart
  const totalProductQuantity = cartItems
    .filter(item => item.productId === product.id)
    .reduce((sum, item) => sum + item.quantity, 0);
  const [imageError, setImageError] = useState(false);

  // Get price from variant or fallback to product
  const displayPrice = variant?.selling_price || variant?.price || product.price || product.selling_price || 0;

  // Calculate total stock across all variants, subtract cart quantities
  const totalStockQty = product.variants && product.variants.length > 0
    ? product.variants.reduce((total, v) => total + (v.quantity || v.stock_quantity || 0), 0)
    : product.stockQuantity || 0;

  // Subtract quantities already in cart to show remaining available stock
  const remainingStockQty = totalStockQty - totalProductQuantity;

  // DEBUG: Log stock calculation for first few products
  if (import.meta.env.DEV && product.name?.includes('WII AMP')) {
    console.log('🔍 [Stock Debug] Product:', product.name, {
      hasVariants: product.variants?.length > 0,
      variantCount: product.variants?.length || 0,
      variants: product.variants?.map(v => ({ name: v.name || v.variant_name, quantity: v.quantity, stock_quantity: v.stock_quantity })),
      productStockQuantity: product.stockQuantity,
      totalStock: totalStockQty,
      remainingStock: remainingStockQty,
      cartQuantity: totalProductQuantity
    });
  }
  const categoryLabel =
    product?.category?.name ||
    product?.categoryName ||
    product?.category_name ||
    product?.categoryLabel ||
    product?.category ||
    product?.type ||
    '';
  const stockBg =
    remainingStockQty <= 0
      ? 'bg-red-100 border-red-200 text-red-700'
      : remainingStockQty <= 5
      ? 'bg-orange-100 border-orange-200 text-orange-700'
      : 'bg-green-100 border-green-200 text-green-700';

  // Stock indicator background color (solid for the badge)
  const stockIndicatorBg =
    remainingStockQty <= 0
      ? 'bg-red-500'
      : remainingStockQty <= 5
      ? 'bg-orange-500'
      : 'bg-green-500';

  // Add visual effect for selected products
  const isSelected = totalProductQuantity > 0;
  const selectedBorder = isSelected ? 'ring-2 ring-blue-400 ring-opacity-75' : '';
  const selectedShadow = isSelected ? 'shadow-lg shadow-blue-200' : 'shadow-sm';

  // Font sizes that respect density scaling so text shrinks with crowded grids
  const titleFontSize = Math.max(12, Math.round(sizes.textLg * densityScale * 0.9));
  // Apply an extra 0.8 factor so price text is smaller on dense grids
  const priceFontSize = Math.max(12, Math.round(sizes.text3xl * densityScale * 0.8));
  const categoryFontSize = Math.max(12, Math.round(sizes.textLg * densityScale));
  // Compact sell button sizing for a simpler look
  const sellButtonPadding = Math.max(3, Math.round(sizes.spacing10 * 0.35 * densityScale));
  const sellButtonFontSize = Math.max(9, Math.round(sizes.textSm * 0.88 * densityScale));
  // Slight horizontal bleed to let the image fill more of the card width.
  // Make bleed dynamic: constrained by a small fraction of the card width and the card padding.
  // This keeps visual alignment when cards shrink or grow.
  const computedBleedFromWidth = Math.round((minCardWidth || 220) * 0.06); // ~6% of card width
  const computedBleedFromPadding = Math.round((sizes.productCardPadding || 16) * 0.6);
  const imageBleed = Math.max(4, Math.round(Math.min(computedBleedFromWidth, computedBleedFromPadding)));
  // Make the top lift equal to the side bleed so top and side margins are identical
  const imageLift = imageBleed;
  // Keep bottom margin consistent with bleed for visual balance
  const imageMarginBottom = imageBleed;
  // Floating cart button sizing
  const cartButtonSize = Math.max(40, Math.round(44 * densityScale)); // prefer 44px minimum, scale down slightly if density < 1
  const cartButtonOffset = Math.round(imageBleed / 2);

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
    if (cardRef.current && attachListeners) {
      attachListeners(cardRef.current);
    }
    return () => {
      if (detachListeners) detachListeners();
    };
  }, [attachListeners, detachListeners]);

  return (
    <div
      ref={cardRef}
      onClick={() => onAddToCart(product)}
      className={`bg-white rounded-[28px] border border-gray-100 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-[0.98] select-none relative ${selectedBorder} ${selectedShadow}`}
      style={{
        WebkitTapHighlightColor: 'transparent',
        padding: `${sizes.productCardPadding * 1.1}px`,
        touchAction: 'pan-y', // Allow vertical scrolling but capture horizontal swipes
      }}
    >
      {/* Product Image */}
      <div
        className="relative"
        style={{
          marginTop: `-${imageLift}px`,
          marginBottom: `${imageMarginBottom}px`,
        }}
      >
        {/* Top-right stock indicator */}
        <div
          className={`absolute top-3 right-2 w-12 h-6 rounded-full flex items-center justify-center shadow-sm text-xs font-bold text-white ${stockIndicatorBg}`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          title={`${remainingStockQty} items available`}
        >
          {remainingStockQty}
        </div>
        {(productImages[product.id] || product.image_url) && !imageError ? (
        <div
          className="w-full aspect-square bg-gray-50 overflow-hidden border border-gray-200"
          style={{
            // Keep image radius in sync with card rounding to avoid mismatch
            borderRadius: `${sizes.radiusXl}px`,
            marginLeft: `-${imageBleed}px`,
            marginRight: `-${imageBleed}px`,
            width: `calc(100% + ${imageBleed * 2}px)`
          }}
        >
            <img
              src={productImages[product.id] || product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => {
                // Prevent console spam by only showing warning in development
                if (import.meta.env.DEV) {
                  console.debug('⚠️ Product image failed to load:', productImages[product.id] || product.image_url);
                }
                setImageError(true);
              }}
            />
          </div>
        ) : (
          <div
            className="w-full aspect-square bg-gray-50 flex items-center justify-center border border-gray-200"
            style={{
              // Keep placeholder sizing identical to image container so cards align
              borderRadius: `${sizes.radiusXl}px`,
              marginLeft: `-${imageBleed}px`,
              marginRight: `-${imageBleed}px`,
              width: `calc(100% + ${imageBleed * 2}px)`
            }}
          >
            <Package size={sizes.iconSizeXl * 2} className="text-gray-300" />
          </div>
        )}

        {/* Floating cart button (blue) with badge */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          className={`absolute -bottom-5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-full flex items-center justify-center border border-white transition-all duration-200 shadow-md ${totalProductQuantity > 0 ? 'bg-green-500 hover:bg-green-600 active:bg-green-700' : ''}`}
          style={{
            width: cartButtonSize,
            height: cartButtonSize,
            right: -cartButtonOffset, // position the button slightly outside the card, matching image bleed
            WebkitTapHighlightColor: 'transparent',
          }}
          title="Add to cart"
        >
          {totalProductQuantity > 0 ? (
            <Check size={Math.max(14, Math.round(cartButtonSize * 0.45))} className="text-white" />
          ) : (
            <ShoppingBag size={Math.max(16, Math.round(cartButtonSize * 0.45))} className="text-white" />
          )}
          {totalProductQuantity > 0 ? (
            <span
              className="absolute bg-black text-white rounded-full flex items-center justify-center text-xs font-semibold"
              style={{
                width: Math.max(18, Math.round(cartButtonSize * 0.45)),
                height: Math.max(18, Math.round(cartButtonSize * 0.45)),
                top: -6,
                right: -6,
              }}
            >
              {totalProductQuantity}
            </span>
          ) : null}
        </button>
      </div>

      {/* Product Name */}
      <h3
        style={{ fontSize: `${priceFontSize}px` }}
          className="font-bold text-gray-900 mb-1 leading-tight"
      >
        {format.currency(displayPrice)}
      </h3>

      <h4
        style={{ fontSize: `${titleFontSize}px` }}
        className="text-blue-600 font-medium mt-1 truncate"
        title={product.name}
      >
        {product.name}
      </h4>

      {/* Price and subtitle */}
      {/* keep space for visual balance */}
      <div style={{ height: 6 }} />
    </div>
  );
};

export default TabletProductGrid;