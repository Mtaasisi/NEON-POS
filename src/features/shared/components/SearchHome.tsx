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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-3">
          Global Search
        </h1>
        <p className="text-gray-600/90 max-w-2xl mx-auto text-lg">
          Search devices, customers, products, and more
        </p>
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-800">Recent Searches</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/60 backdrop-blur-lg rounded-full border border-white/40 hover:bg-white/80 hover:shadow-[0_4px_16px_0_rgba(59,130,246,0.1)] transition-all duration-300 cursor-pointer group"
                onClick={() => onSearch(search)}
              >
                <span className="text-sm text-gray-700 font-medium">{search}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSearch(search);
                  }}
                  className="p-1 rounded-full bg-gray-100/60 hover:bg-gray-200/80 backdrop-blur-sm transition-all duration-200 opacity-0 group-hover:opacity-100"
                >
                  <X size={12} className="text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Access */}
      <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
        <h2 className="text-lg font-semibold text-gray-800 mb-5">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickAccessItems.map((item, index) => (
            <button
              key={index}
              onClick={() => onSearch(item.query)}
              className="flex items-center gap-3 p-4 rounded-xl bg-white/60 backdrop-blur-lg border border-white/40 hover:bg-white/80 hover:shadow-[0_4px_20px_0_rgba(59,130,246,0.12)] hover:scale-[1.02] transition-all duration-300 text-left group"
            >
              <div className={`p-2.5 rounded-xl bg-gradient-to-br from-${item.color}-50 to-${item.color}-100 text-${item.color}-600 group-hover:from-${item.color}-100 group-hover:to-${item.color}-200 shadow-sm transition-all duration-300`}>
                {item.icon}
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Categories */}
      <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
        <h2 className="text-lg font-semibold text-gray-800 mb-5">Search Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchCategories.map((category, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br from-${category.color}-50 to-${category.color}-100 text-${category.color}-600 shadow-sm`}>
                  {category.icon}
                </div>
                <h3 className="font-semibold text-gray-800">{category.title}</h3>
              </div>
              <div className="space-y-2">
                {category.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={() => onSearch(item.query)}
                    className="flex items-center gap-2 w-full p-2.5 rounded-xl hover:bg-white/70 backdrop-blur-sm transition-all duration-200 text-left group"
                  >
                    <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">{item.label}</span>
                    <ArrowRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Tips */}
      <div className="bg-gradient-to-br from-blue-50/60 via-purple-50/40 to-pink-50/60 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
        <h2 className="text-lg font-semibold text-gray-800 mb-5">Search Tips</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-sm text-gray-700 bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30">
              <strong className="text-gray-900">Use filters:</strong> Type "status:active" to find active devices
            </p>
            <p className="text-sm text-gray-700 bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30">
              <strong className="text-gray-900">Search by date:</strong> Type "date:2024-01" to find items from January 2024
            </p>
            <p className="text-sm text-gray-700 bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30">
              <strong className="text-gray-900">Combine terms:</strong> Type "iphone status:active" to find active iPhones
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-700 bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30">
              <strong className="text-gray-900">Exact match:</strong> Use quotes for exact phrases: "John Doe"
            </p>
            <p className="text-sm text-gray-700 bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30">
              <strong className="text-gray-900">Price range:</strong> Type "price:1000-5000" to find items in price range
            </p>
            <p className="text-sm text-gray-700 bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30">
              <strong className="text-gray-900">Location search:</strong> Type "location:Nairobi" to find items by location
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchHome;
