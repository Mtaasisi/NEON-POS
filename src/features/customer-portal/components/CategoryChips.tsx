import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface Category {
  id: string;
  label: string;
  // icon can be a React node (SVG) or a simple string/emoji
  icon?: React.ReactNode | string;
}

interface CategoryChipsProps {
  categories: Category[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

const CategoryChips: React.FC<CategoryChipsProps> = ({ categories, selectedId, onSelect }) => {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="px-2 pb-1">
      <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 items-center">
        {/* All chip (slim, label-only) */}
        <button
          onClick={() => onSelect('all')}
          className={`flex-shrink-0 flex items-center px-2 h-6 rounded-full transition-all text-[9px] ${
            !selectedId ? 'bg-white border border-gray-100 hover:border-blue-300' : 'bg-white border border-gray-100'
          }`}
        >
          <span className={`mx-1 text-[9px] font-medium ${!selectedId ? 'text-slate-900' : 'text-gray-700'}`}>All</span>
        </button>

        {categories.map(cat => {
          const active = selectedId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`flex-shrink-0 flex items-center px-2 h-6 rounded-full transition-all text-[9px] ${
                active ? 'bg-white border border-blue-300' : 'bg-white border border-gray-100 hover:border-blue-300'
              }`}
            >
              <span className={`mx-1 text-[9px] font-medium ${active ? 'text-slate-900' : 'text-gray-700'}`}>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryChips;


