import React from 'react';
import { Search, Zap, TrendingUp, Package, Users, Smartphone, ArrowRight } from 'lucide-react';
import { useGlobalSearchModal } from '../../../../context/GlobalSearchContext';
import { useNavigate } from 'react-router-dom';

interface QuickSearchWidgetProps {
  className?: string;
}

export const QuickSearchWidget: React.FC<QuickSearchWidgetProps> = ({ className = '' }) => {
  const { openSearch } = useGlobalSearchModal();
  const navigate = useNavigate();

  const quickSearches = [
    { label: 'Active Devices', query: 'status:active', icon: Smartphone, color: 'blue' },
    { label: 'New Customers', query: 'isRead:false', icon: Users, color: 'green' },
    { label: 'All Products', query: 'type:product', icon: Package, color: 'purple' },
    { label: 'Recent Sales', query: 'type:sale', icon: TrendingUp, color: 'amber' },
  ];

  return (
    <div className={`bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 shadow-sm p-6 ${className}`}>
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <Search size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Quick Search</h3>
            <p className="text-xs text-gray-500">Find anything instantly</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium">
            <Zap size={12} />
            <span>⌘K</span>
          </div>
          <button
            onClick={() => openSearch()}
            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
            title="Open Advanced Search"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Search Button */}
      <button
        onClick={() => openSearch()}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all duration-300 shadow-md hover:shadow-lg mb-4 group"
      >
        <Search size={20} />
        <span className="flex-1 text-left font-medium">Search devices, customers, products...</span>
        <span className="text-white/70 group-hover:text-white text-sm">→</span>
      </button>

      {/* Quick Access Buttons */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 mb-3">Quick Access</p>
        <div className="grid grid-cols-2 gap-2">
          {quickSearches.map((search, index) => {
            const Icon = search.icon;
            return (
              <button
                key={index}
                onClick={() => openSearch(search.query)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-${search.color}-50 hover:bg-${search.color}-100 text-${search.color}-700 transition-all duration-200 text-sm group`}
              >
                <Icon size={16} />
                <span className="text-xs font-medium truncate">{search.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          💡 Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono">⌘K</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono">Ctrl+K</kbd> anywhere to search
        </p>
      </div>
    </div>
  );
};

