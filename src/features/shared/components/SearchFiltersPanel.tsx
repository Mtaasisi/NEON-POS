import React, { useState, useMemo } from 'react';
import { Filter, X, Calendar, DollarSign, Tag, MapPin, User, Smartphone, Clock, Package, ShoppingCart, CreditCard, TrendingUp, Layers } from 'lucide-react';
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

  // Type filter options
  const typeOptions = [
    { value: 'all', label: 'All Types', icon: <Layers size={14} /> },
    { value: 'device', label: 'Devices', icon: <Smartphone size={14} /> },
    { value: 'customer', label: 'Customers', icon: <User size={14} /> },
    { value: 'product', label: 'Products', icon: <Package size={14} /> },
    { value: 'sale', label: 'Sales', icon: <ShoppingCart size={14} /> },
    { value: 'payment', label: 'Payments', icon: <CreditCard size={14} /> },
  ];

  // Status filter options
  const statusOptions = [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'done', label: 'Done', color: 'blue' },
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'overdue', label: 'Overdue', color: 'red' },
  ];

  // Stock level options (for products)
  const stockOptions = [
    { value: 'in-stock', label: 'In Stock', color: 'green' },
    { value: 'low-stock', label: 'Low Stock', color: 'yellow' },
    { value: 'out-of-stock', label: 'Out of Stock', color: 'red' },
  ];

  // Payment method options (for sales)
  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'mobile', label: 'Mobile Money' },
    { value: 'bank', label: 'Bank Transfer' },
  ];

  // Quick date ranges
  const quickDateRanges = [
    { label: 'Today', days: 0 },
    { label: 'This Week', days: 7 },
    { label: 'This Month', days: 30 },
    { label: 'Last 3 Months', days: 90 },
  ];

  // Price presets (TZS)
  const pricePresets = [
    { label: 'Under 100K', min: 0, max: 100000 },
    { label: '100K - 500K', min: 100000, max: 500000 },
    { label: '500K - 1M', min: 500000, max: 1000000 },
    { label: '1M - 5M', min: 1000000, max: 5000000 },
    { label: 'Over 5M', min: 5000000, max: undefined },
  ];

  const getQuickDateRange = (days: number) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    return `${formatDate(startDate)}-${formatDate(today)}`;
  };

  // Get active filters for display
  const activeFilters = useMemo(() => {
    const active: Array<{ key: string; label: string; value: string }> = [];
    
    if (filters.type) {
      const type = typeOptions.find(t => t.value === filters.type);
      if (type) active.push({ key: 'type', label: type.label, value: filters.type });
    }
    if (filters.status) {
      const status = statusOptions.find(s => s.value === filters.status);
      if (status) active.push({ key: 'status', label: status.label, value: filters.status });
    }
    if (filters.stock) {
      const stock = stockOptions.find(s => s.value === filters.stock);
      if (stock) active.push({ key: 'stock', label: stock.label, value: filters.stock });
    }
    if (filters.payment) {
      const payment = paymentMethods.find(p => p.value === filters.payment);
      if (payment) active.push({ key: 'payment', label: payment.label, value: filters.payment });
    }
    if (filters.location) {
      active.push({ key: 'location', label: 'Location', value: filters.location });
    }
    if (filters.category) {
      active.push({ key: 'category', label: 'Category', value: filters.category });
    }
    if (filters.price) {
      active.push({ key: 'price', label: 'Price Range', value: filters.price });
    }
    if (filters.date) {
      active.push({ key: 'date', label: 'Date Range', value: filters.date });
    }
    if (filters.customer) {
      active.push({ key: 'customer', label: 'Customer', value: filters.customer });
    }
    if (filters.model) {
      active.push({ key: 'model', label: 'Model', value: filters.model });
    }
    
    return active;
  }, [filters]);

  const handleTypeClick = (type: string) => {
    if (filters.type === type) {
      setFilters({ ...filters, type: undefined });
    } else {
      setFilters({ ...filters, type });
    }
  };

  const handleStatusClick = (status: string) => {
    if (filters.status === status) {
      setFilters({ ...filters, status: undefined });
    } else {
      setFilters({ ...filters, status });
    }
  };

  const handleStockClick = (stock: string) => {
    if (filters.stock === stock) {
      setFilters({ ...filters, stock: undefined });
    } else {
      setFilters({ ...filters, stock });
    }
  };

  const handlePaymentClick = (payment: string) => {
    if (filters.payment === payment) {
      setFilters({ ...filters, payment: undefined });
    } else {
      setFilters({ ...filters, payment });
    }
  };

  const handlePricePresetClick = (min: number, max: number | undefined) => {
    const priceRange = max ? `${min}-${max}` : `${min}-`;
    if (filters.price === priceRange) {
      setFilters({ ...filters, price: undefined });
    } else {
      setFilters({ ...filters, price: priceRange });
    }
  };

  const handleQuickDateClick = (days: number) => {
    const dateRange = getQuickDateRange(days);
    if (filters.date === dateRange) {
      setFilters({ ...filters, date: undefined });
    } else {
      setFilters({ ...filters, date: dateRange });
    }
  };

  const removeFilter = (key: string) => {
    setFilters({ ...filters, [key]: undefined });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({});
    onApply({});
    onClose();
  };

  const activeFiltersCount = Object.keys(filters).filter(k => filters[k as keyof SearchFilters]).length;

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-200/50 flex items-center justify-center">
            <Filter className="text-blue-600" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Advanced Filters</h3>
            {activeFiltersCount > 0 && (
              <p className="text-xs text-gray-500">{activeFiltersCount} active</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Active Filters Chips */}
      {activeFilters.length > 0 && (
        <div className="mb-4 pb-4 border-b border-gray-200/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500">Active:</span>
            {activeFilters.map((filter) => (
              <button
                key={`${filter.key}-${filter.value}`}
                onClick={() => removeFilter(filter.key)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-200"
              >
                <span>{filter.label}: {filter.value}</span>
                <X size={12} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Options */}
      <div className="space-y-5">
        {/* Type Filter - Buttons */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Result Type
          </label>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((option) => {
              const isActive = (filters.type || 'all') === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleTypeClick(option.value === 'all' ? undefined : option.value)}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${isActive
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }
                  `}
                >
                  {option.icon}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filter - Buttons */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => {
              const isActive = filters.status === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusClick(option.value)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${isActive
                      ? option.value === 'active' ? 'bg-green-100 text-green-700 border-2 border-green-300' :
                        option.value === 'done' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' :
                        option.value === 'pending' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300' :
                        'bg-red-100 text-red-700 border-2 border-red-300'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }
                  `}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stock Level Filter - Buttons (for products) */}
        {(filters.type === 'product' || !filters.type) && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Stock Level
            </label>
            <div className="flex flex-wrap gap-2">
              {stockOptions.map((option) => {
                const isActive = filters.stock === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleStockClick(option.value)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${isActive
                        ? option.value === 'in-stock' ? 'bg-green-100 text-green-700 border-2 border-green-300' :
                          option.value === 'low-stock' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300' :
                          'bg-red-100 text-red-700 border-2 border-red-300'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Method Filter - Buttons (for sales) */}
        {(filters.type === 'sale' || filters.type === 'payment' || !filters.type) && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <CreditCard size={12} />
              Payment Method
            </label>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((method) => {
                const isActive = filters.payment === method.value;
                return (
                  <button
                    key={method.value}
                    onClick={() => handlePaymentClick(method.value)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${isActive
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }
                    `}
                  >
                    {method.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Date Ranges - Buttons */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Clock size={12} />
            Quick Date Range
          </label>
          <div className="flex flex-wrap gap-2">
            {quickDateRanges.map((range) => {
              const dateRange = getQuickDateRange(range.days);
              const isActive = filters.date === dateRange;
              return (
                <button
                  key={range.label}
                  onClick={() => handleQuickDateClick(range.days)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${isActive
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }
                  `}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location and Category - Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <MapPin size={12} />
            Location
          </label>
          <input
            type="text"
            value={filters.location || ''}
            onChange={(e) => setFilters({ ...filters, location: e.target.value || undefined })}
            placeholder="e.g., Dar es Salaam"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
          />
        </div>

        <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Tag size={12} />
            Category
          </label>
          <input
            type="text"
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
            placeholder="e.g., smartphones"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
          />
          </div>
        </div>

        {/* Price Range - Presets and Custom */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <DollarSign size={12} />
            Price Range (TZS)
          </label>
          
          {/* Price Presets */}
          <div className="flex flex-wrap gap-2 mb-3">
            {pricePresets.map((preset) => {
              const priceRange = preset.max ? `${preset.min}-${preset.max}` : `${preset.min}-`;
              const isActive = filters.price === priceRange;
              return (
                <button
                  key={preset.label}
                  onClick={() => handlePricePresetClick(preset.min, preset.max)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${isActive
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }
                  `}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Price Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
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
                placeholder="Min price"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
              />
            </div>
            <div>
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
                placeholder="Max price"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
              />
            </div>
          </div>
        </div>

        {/* Date Range - Grid */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Calendar size={12} />
            Custom Date Range
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
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
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
            />
            </div>
            <div>
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
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
            />
            </div>
          </div>
        </div>

        {/* Search Fields - Conditional based on type */}
        {(!filters.type || filters.type === 'customer' || filters.type === 'device') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(!filters.type || filters.type === 'customer') && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <User size={12} />
                  Customer Name
                </label>
                <input
                  type="text"
                  value={filters.customer || ''}
                  onChange={(e) => setFilters({ ...filters, customer: e.target.value || undefined })}
                  placeholder="Search by customer name"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            )}
            {(!filters.type || filters.type === 'device') && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Smartphone size={12} />
                  Device Model
                </label>
                <input
                  type="text"
                  value={filters.model || ''}
                  onChange={(e) => setFilters({ ...filters, model: e.target.value || undefined })}
                  placeholder="e.g., iPhone 13"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200/50">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Reset All
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 shadow-sm hover:shadow-md transition-all"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default SearchFiltersPanel;

