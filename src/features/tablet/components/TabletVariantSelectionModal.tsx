import React, { useMemo, useState } from 'react';
import { X, Check, Package } from 'lucide-react';

interface TabletVariantSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSelectVariant: (variant: any) => void;
}

const TabletVariantSelectionModal: React.FC<TabletVariantSelectionModalProps> = ({
  isOpen,
  onClose,
  product,
  onSelectVariant,
}) => {
  if (!isOpen) return null;

  const [query, setQuery] = useState('');

  const variants = product?.variants ?? [];

  const filteredVariants = useMemo(() => {
    if (!query) return variants;
    const q = query.toLowerCase();
    return variants.filter(
      (v: any) =>
        v.variant_name?.toLowerCase().includes(q) ||
        v.name?.toLowerCase().includes(q) ||
        v.sku?.toLowerCase().includes(q)
    );
  }, [variants, query]);

  const handleSelect = (variant: any) => {
    onSelectVariant(variant);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Select Variant</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Product summary */}
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package size={24} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Product</p>
              <h3 className="text-lg font-semibold text-gray-900">{product?.name}</h3>
              {product?.sku && (
                <p className="text-xs text-gray-500">SKU: {product.sku}</p>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search variants by name or SKU..."
              className="w-full border border-gray-200 rounded-lg py-3 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Variants list */}
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-200 max-h-[50vh] overflow-y-auto">
            {filteredVariants.length === 0 && (
              <div className="p-4 text-sm text-gray-500 text-center">
                No variants found
              </div>
            )}
            {filteredVariants.map((variant: any) => {
              const price =
                variant.selling_price ??
                variant.price ??
                variant.unit_price ??
                product?.price ??
                0;
              const stock =
                variant.stock_quantity ??
                variant.quantity ??
                variant.available_quantity ??
                0;

              return (
                <div
                  key={variant.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-gray-900">
                      {variant.variant_name || variant.name || 'Variant'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {variant.sku || product?.sku || 'No SKU'}
                    </p>
                    <div className="flex items-center space-x-3 mt-2 text-sm">
                      <span className="font-semibold text-gray-900">
                        {price.toLocaleString(undefined, {
                          style: 'currency',
                          currency: 'USD',
                        })}
                      </span>
                      <span
                        className={
                          stock > 5
                            ? 'text-green-600'
                            : stock > 0
                            ? 'text-orange-500'
                            : 'text-red-500'
                        }
                      >
                        {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSelect(variant)}
                      disabled={stock <= 0}
                      className="px-4 py-2 bg-blue-500 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
                    >
                      Select
                    </button>
                    {stock <= 0 && (
                      <span className="text-xs text-red-500 font-medium">
                        Out
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabletVariantSelectionModal;