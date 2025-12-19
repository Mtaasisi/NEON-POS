import React from 'react';
import { CustomerProduct } from '../types';
import { X } from 'lucide-react';

interface VariantSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CustomerProduct;
  selectedVariantId: string | null;
  onVariantSelect: (variantId: string) => void;
  onAddToCart: () => void;
}

const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({
  isOpen,
  onClose,
  product,
  selectedVariantId,
  onVariantSelect,
  onAddToCart
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 mb-4 bg-white rounded-[28px] p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shadow-sm"
          aria-label="Close"
        >
          <X size={18} className="text-gray-500" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-8">Choose Variant</h2>

        {/* Variant Options */}
        <div className="space-y-3 mb-8 max-h-60 overflow-y-auto">
          {product.variants && product.variants.length > 0 ? (
            product.variants.map((variant) => (
              <button
                key={variant.id}
                disabled={!variant.inStock}
                onClick={() => variant.inStock && onVariantSelect(variant.id)}
                className={`w-full p-4 rounded-xl text-left transition-all duration-300 border-2 ${
                  selectedVariantId === variant.id
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : variant.inStock
                    ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className={`font-semibold text-sm mb-1 ${
                      selectedVariantId === variant.id ? 'text-blue-700' : 'text-gray-900'
                    }`}>
                      {variant.name || 'Default Variant'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Tsh {variant.price ? variant.price.toLocaleString('en-US') : 'N/A'}
                    </div>
                  </div>
                  {!variant.inStock && (
                    <span className="text-xs text-red-600 font-medium">Out of Stock</span>
                  )}
                  {selectedVariantId === variant.id && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No variants available
            </div>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={onAddToCart}
          disabled={!selectedVariantId}
          className={`w-full py-5 rounded-2xl text-lg font-semibold shadow-2xl transition-all duration-300 mb-6 ${
            selectedVariantId
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-blue-500/25'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Add to Cart
        </button>

        {/* Info */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Select a variant to continue with your purchase
          </p>
        </div>
      </div>
    </div>
  );
};

export default VariantSelectionModal;
