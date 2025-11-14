import React from 'react';
import {
  Clock,
  X,
  Smartphone,
  Users,
  Package,
  FileText,
  Crown,
  CreditCard,
  TrendingUp,
  Warehouse,
  BarChart3,
  Calendar,
  MessageSquare,
  ArrowRight,
  DollarSign,
} from 'lucide-react';

interface SearchHomeProps {
  recentSearches: string[];
  onSearch: (query: string) => void;
  onRemoveSearch: (query: string) => void;
  userRole: string;
}

const SearchHome: React.FC<SearchHomeProps> = ({
  recentSearches,
  onSearch,
  onRemoveSearch,
  userRole,
}) => {
  const getQuickAccessItems = () => {
    const items = [];

    // Common items for all roles
    items.push(
      { label: 'Active Devices', icon: <Smartphone size={20} />, query: 'status:active', color: 'blue' },
      { label: 'New Customers', icon: <Users size={20} />, query: 'isRead:false', color: 'green' },
      { label: 'Overdue Devices', icon: <Clock size={20} />, query: 'overdue:true', color: 'red' }
    );

    // Role-specific items
    if (userRole === 'admin' || userRole === 'customer-care') {
      items.push(
        { label: 'All Products', icon: <Package size={20} />, query: 'type:product', color: 'purple' },
        { label: 'Recent Sales', icon: <TrendingUp size={20} />, query: 'type:sale', color: 'amber' }
      );
    }

    if (userRole === 'admin') {
      items.push(
        { label: 'Payment Reports', icon: <CreditCard size={20} />, query: 'type:payment', color: 'emerald' },
        { label: 'Loyalty Members', icon: <Crown size={20} />, query: 'type:loyalty', color: 'yellow' },
        { label: 'Inventory Alerts', icon: <Warehouse size={20} />, query: 'low:stock', color: 'orange' },
        { label: 'Sales Reports', icon: <BarChart3 size={20} />, query: 'type:report', color: 'indigo' }
      );
    }

    if (userRole === 'customer-care') {
      items.push(
        { label: 'Customer Issues', icon: <MessageSquare size={20} />, query: 'status:issue', color: 'pink' },
        { label: 'Appointments', icon: <Calendar size={20} />, query: 'type:appointment', color: 'cyan' }
      );
    }

    return items;
  };

  const getSearchCategories = () => {
    const categories = [
      {
        title: 'Devices',
        icon: <Smartphone size={24} />,
        color: 'blue',
        items: [
          { label: 'By Status', query: 'status:' },
          { label: 'By Model', query: 'model:' },
          { label: 'By Customer', query: 'customer:' }
        ]
      },
      {
        title: 'Customers',
        icon: <Users size={24} />,
        color: 'green',
        items: [
          { label: 'By Name', query: 'name:' },
          { label: 'By Phone', query: 'phone:' },
          { label: 'By Email', query: 'email:' },
          { label: 'By Location', query: 'location:' }
        ]
      }
    ];

    if (userRole === 'admin' || userRole === 'customer-care') {
      categories.push({
        title: 'Products',
        icon: <Package size={24} />,
        color: 'purple',
        items: [
          { label: 'By Name', query: 'product:' },
          { label: 'By Category', query: 'category:' },
          { label: 'By Price', query: 'price:' }
        ]
      });
    }

    if (userRole === 'admin') {
      categories.push({
        title: 'Sales & Finance',
        icon: <DollarSign size={24} />,
        color: 'emerald',
        items: [
          { label: 'By Date', query: 'date:' },
          { label: 'By Amount', query: 'amount:' },
          { label: 'By Payment Method', query: 'payment:' },
          { label: 'By Customer', query: 'customer:' }
        ]
      });
    }

    return categories;
  };

  const quickAccessItems = getQuickAccessItems();
  const searchCategories = getSearchCategories();

  return (
    <div className="space-y-5">
      {/* Welcome Section - macOS style */}
      <div className="text-center py-3">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1.5">
          Search Everything
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-sm">
          Find devices, customers, products, and more
        </p>
      </div>

      {/* Recent Searches - macOS style */}
      {recentSearches.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200/50 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-700">Recent</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((search, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-150 cursor-pointer group"
                onClick={() => onSearch(search)}
              >
                <span className="text-xs text-gray-700 font-medium">{search}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSearch(search);
                  }}
                  className="p-0.5 rounded hover:bg-gray-300 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={12} className="text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Access - macOS style */}
      <div className="bg-white rounded-xl p-4 border border-gray-200/50 shadow-sm">
        <h2 className="text-xs font-semibold text-gray-700 mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {quickAccessItems.map((item, index) => (
            <button
              key={index}
              onClick={() => onSearch(item.query)}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-150 text-left group"
            >
              <div className="p-1.5 rounded-md bg-white shadow-sm">
                {item.icon}
              </div>
              <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Categories - macOS style */}
      <div className="bg-white rounded-xl p-4 border border-gray-200/50 shadow-sm">
        <h2 className="text-xs font-semibold text-gray-700 mb-3">Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchCategories.map((category, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 rounded-md bg-gray-100">
                  {category.icon}
                </div>
                <h3 className="font-semibold text-gray-800 text-xs">{category.title}</h3>
              </div>
              <div className="space-y-0.5 pl-0.5">
                {category.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={() => onSearch(item.query)}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-all duration-150 text-left group"
                  >
                    <span className="text-xs text-gray-600 group-hover:text-gray-800">{item.label}</span>
                    <ArrowRight size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-all ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Tips - macOS style */}
      <div className="bg-blue-50/40 rounded-xl p-4 border border-blue-200/30 shadow-sm">
        <h2 className="text-xs font-semibold text-gray-700 mb-3">Search Tips</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <p className="text-xs text-gray-600 bg-white/60 rounded-lg p-2.5">
              <strong className="text-gray-800 font-semibold">Use filters:</strong> Type "status:active" to find active devices
            </p>
            <p className="text-xs text-gray-600 bg-white/60 rounded-lg p-2.5">
              <strong className="text-gray-800 font-semibold">Search by date:</strong> Type "date:2024-01" to find items from January 2024
            </p>
            <p className="text-xs text-gray-600 bg-white/60 rounded-lg p-2.5">
              <strong className="text-gray-800 font-semibold">Combine terms:</strong> Type "iphone status:active" to find active iPhones
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-gray-600 bg-white/60 rounded-lg p-2.5">
              <strong className="text-gray-800 font-semibold">Exact match:</strong> Use quotes for exact phrases: "John Doe"
            </p>
            <p className="text-xs text-gray-600 bg-white/60 rounded-lg p-2.5">
              <strong className="text-gray-800 font-semibold">Price range:</strong> Type "price:1000-5000" to find items in price range
            </p>
            <p className="text-xs text-gray-600 bg-white/60 rounded-lg p-2.5">
              <strong className="text-gray-800 font-semibold">Location search:</strong> Type "location:Nairobi" to find items by location
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchHome;
