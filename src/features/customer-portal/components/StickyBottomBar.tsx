import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface StickyBottomBarProps {
  price?: number;
  itemCount?: number;
  onAddToCart: () => void;
  tipAmount?: number;
  disabled?: boolean;
}

const StickyBottomBar: React.FC<StickyBottomBarProps> = ({ price, itemCount = 0, onAddToCart, tipAmount = 0, disabled = false }) => {
  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 bg-transparent pointer-events-none p-3 safe-area-inset-bottom">
      <div className="max-w-6xl mx-auto flex items-center justify-center">
        <div className="w-full sm:w-80 -translate-y-4 transform pointer-events-auto">
          <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 px-3 py-3">
            <button
              onClick={onAddToCart}
              disabled={disabled}
              aria-label="Add to cart"
              className={`flex items-center justify-center gap-3 w-full h-14 rounded-xl text-white font-semibold transition-transform active:scale-95 ${
                disabled ? 'bg-gray-300' : 'bg-gradient-to-br from-blue-500 to-blue-600'
              }`}
            >
              <ShoppingCart className="w-5 h-5 text-white" />
              <span className="text-lg leading-none">Add to cart</span>
              {itemCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-white/20 rounded-full">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickyBottomBar;


