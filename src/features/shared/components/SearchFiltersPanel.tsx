import React, { useState } from 'react';
import { Filter, X, Calendar, DollarSign, Tag, MapPin } from 'lucide-react';
import { SearchFilters } from '../../../lib/searchService';

interface SearchFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
  currentFilters: SearchFilters;
}

const SearchFiltersPanel: React.FC<SearchFiltersPanelProps> = ({
  isOpen,
  onClose,
  onApply,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<SearchFilters>(currentFilters);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({});
    onApply({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200/50 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="text-blue-500" size={16} />
          <h3 className="text-sm font-semibold text-gray-800">Advanced Filters</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Filter Options */}
      <div className="space-y-3">
        {/* Status Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200/60 bg-gray-50 focus:outline-none focus:bg-white focus:border-blue-400/50 transition-all text-sm"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
            <MapPin size={12} />
            Location
          </label>
          <input
            type="text"
            value={filters.location || ''}
            onChange={(e) => setFilters({ ...filters, location: e.target.value || undefined })}
            placeholder="e.g., Dar es Salaam"
            className="w-full px-3 py-2 rounded-lg border border-gray-200/60 bg-gray-50 focus:outline-none focus:bg-white focus:border-blue-400/50 transition-all text-sm"
          />
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
            <Tag size={12} />
            Category
          </label>
          <input
            type="text"
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
            placeholder="e.g., smartphones"
            className="w-full px-3 py-2 rounded-lg border border-gray-200/60 bg-gray-50 focus:outline-none focus:bg-white focus:border-blue-400/50 transition-all text-sm"
          />
        </div>

        {/* Price Range Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
            <DollarSign size={12} />
            Price Range (TZS)
          </label>
          <div className="flex gap-1.5">
            <input
              type="number"
              value={filters.price?.split('-')[0] || ''}
              onChange={(e) => {
                const max = filters.price?.split('-')[1] || '';
                setFilters({ 
                  ...filters, 
                  price: e.target.value ? `${e.target.value}${max ? `-${max}` : ''}` : undefined 
                });
              }}
              placeholder="Min"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200/60 bg-gray-50 focus:outline-none focus:bg-white focus:border-blue-400/50 transition-all text-sm"
            />
            <span className="self-center text-gray-400 text-xs">to</span>
            <input
              type="number"
              value={filters.price?.split('-')[1] || ''}
              onChange={(e) => {
                const min = filters.price?.split('-')[0] || '0';
                setFilters({ 
                  ...filters, 
                  price: e.target.value ? `${min}-${e.target.value}` : min || undefined 
                });
              }}
              placeholder="Max"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200/60 bg-gray-50 focus:outline-none focus:bg-white focus:border-blue-400/50 transition-all text-sm"
            />
          </div>
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
            <Calendar size={12} />
            Date Range
          </label>
          <div className="flex gap-1.5">
            <input
              type="date"
              value={filters.date?.split('-')[0] || ''}
              onChange={(e) => {
                const end = filters.date?.split('-')[1] || '';
                setFilters({ 
                  ...filters, 
                  date: e.target.value ? `${e.target.value}${end ? `-${end}` : ''}` : undefined 
                });
              }}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200/60 bg-gray-50 focus:outline-none focus:bg-white focus:border-blue-400/50 transition-all text-sm"
            />
            <span className="self-center text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={filters.date?.split('-')[1] || ''}
              onChange={(e) => {
                const start = filters.date?.split('-')[0] || '';
                setFilters({ 
                  ...filters, 
                  date: e.target.value ? `${start}-${e.target.value}` : start || undefined 
                });
              }}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200/60 bg-gray-50 focus:outline-none focus:bg-white focus:border-blue-400/50 transition-all text-sm"
            />
          </div>
        </div>

        {/* Customer Name Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Customer Name
          </label>
          <input
            type="text"
            value={filters.customer || ''}
            onChange={(e) => setFilters({ ...filters, customer: e.target.value || undefined })}
            placeholder="Search by customer name"
            className="w-full px-3 py-2 rounded-lg border border-gray-200/60 bg-gray-50 focus:outline-none focus:bg-white focus:border-blue-400/50 transition-all text-sm"
          />
        </div>

        {/* Model Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Device Model
          </label>
          <input
            type="text"
            value={filters.model || ''}
            onChange={(e) => setFilters({ ...filters, model: e.target.value || undefined })}
            placeholder="e.g., iPhone 13"
            className="w-full px-3 py-2 rounded-lg border border-gray-200/60 bg-gray-50 focus:outline-none focus:bg-white focus:border-blue-400/50 transition-all text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200/50">
        <button
          onClick={handleReset}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200/60 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 shadow-sm hover:shadow-md transition-all"
        >
          Apply Filters
        </button>
      </div>

      {/* Active Filters Count */}
      {Object.keys(filters).filter(k => filters[k as keyof SearchFilters]).length > 0 && (
        <div className="mt-3 text-center text-xs text-gray-500">
          {Object.keys(filters).filter(k => filters[k as keyof SearchFilters]).length} active filter{Object.keys(filters).filter(k => filters[k as keyof SearchFilters]).length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default SearchFiltersPanel;

