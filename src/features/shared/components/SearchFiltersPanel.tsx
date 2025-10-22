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
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="text-blue-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Advanced Filters</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Filter Options */}
      <div className="space-y-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <MapPin size={14} />
            Location
          </label>
          <input
            type="text"
            value={filters.location || ''}
            onChange={(e) => setFilters({ ...filters, location: e.target.value || undefined })}
            placeholder="e.g., Dar es Salaam"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Tag size={14} />
            Category
          </label>
          <input
            type="text"
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
            placeholder="e.g., smartphones"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Price Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <DollarSign size={14} />
            Price Range (TZS)
          </label>
          <div className="flex gap-2">
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
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="self-center text-gray-500">-</span>
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
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Calendar size={14} />
            Date Range
          </label>
          <div className="flex gap-2">
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
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="self-center text-gray-500">-</span>
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
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Customer Name Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Customer Name
          </label>
          <input
            type="text"
            value={filters.customer || ''}
            onChange={(e) => setFilters({ ...filters, customer: e.target.value || undefined })}
            placeholder="Search by customer name"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Model Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Device Model
          </label>
          <input
            type="text"
            value={filters.model || ''}
            onChange={(e) => setFilters({ ...filters, model: e.target.value || undefined })}
            placeholder="e.g., iPhone 13"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Reset All
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all"
        >
          Apply Filters
        </button>
      </div>

      {/* Active Filters Count */}
      {Object.keys(filters).filter(k => filters[k as keyof SearchFilters]).length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-600">
          {Object.keys(filters).filter(k => filters[k as keyof SearchFilters]).length} active filter(s)
        </div>
      )}
    </div>
  );
};

export default SearchFiltersPanel;

