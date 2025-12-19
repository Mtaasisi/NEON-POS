import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SuggestedProductsProps {
  items?: any[];
}

const SuggestedProducts: React.FC<SuggestedProductsProps> = ({ items = [] }) => {
  const navigate = useNavigate();
  if (!items || items.length === 0) return null;

  const normalized = items.map((p: any, i: number) => ({
    id: p?.id || p?.productId || p?.sku || `suggested-${i}`,
    name: p?.name || p?.title || 'Product',
    imageUrl: p?.imageUrl || p?.image || (p?.images && p.images[0]) || '/assets/placeholder.png',
    price: p?.price || p?.sellingPrice || p?.unit_price || 0
  }));

  return (
    <div className="px-4 py-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Suggested for you</h3>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {normalized.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(`/customer-portal/products/${item.id}`)}
            className="flex-shrink-0 w-36 bg-white rounded-xl border border-gray-100 p-3 text-left hover:shadow-md active:scale-98 transition-transform"
          >
            <div className="h-24 flex items-center justify-center mb-2">
              <img src={item.imageUrl} alt={item.name} className="max-h-full object-contain" />
            </div>
            <div className="text-sm font-medium text-slate-900 truncate">{item.name}</div>
            <div className="text-sm text-gray-500 mt-1">Tsh {Math.round(item.price).toLocaleString('en-US')}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedProducts;


