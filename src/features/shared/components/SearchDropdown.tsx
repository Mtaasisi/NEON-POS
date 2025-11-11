import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGlobalSearchModal } from '../../../context/GlobalSearchContext';
import SearchService, { SearchResult as ServiceSearchResult } from '../../../lib/searchService';
import {
  Search,
  Smartphone,
  Users,
  Package,
  FileText,
  Crown,
  CreditCard,
  TrendingUp,
  Warehouse,
  BarChart3,
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';

interface SearchResult extends ServiceSearchResult {
  icon: React.ReactNode;
}

interface SearchDropdownProps {
  placeholder?: string;
  className?: string;
  onClose?: () => void;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({
  placeholder = "Search...",
  className = "",
  onClose
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { openSearch } = useGlobalSearchModal();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize search service
  const searchService = useMemo(() => new SearchService(currentUser.role), [currentUser.role]);

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Save search to recent searches
  const saveSearch = (query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Get icon for result type
  const getIconForType = (type: string): React.ReactNode => {
    switch (type) {
      case 'device':
        return <Smartphone size={16} className="text-blue-600" />;
      case 'customer':
        return <Users size={16} className="text-green-600" />;
      case 'product':
        return <Package size={16} className="text-purple-600" />;
      case 'sale':
        return <TrendingUp size={16} className="text-amber-600" />;
      case 'payment':
        return <CreditCard size={16} className="text-emerald-600" />;
      case 'loyalty':
        return <Crown size={16} className="text-yellow-600" />;
      case 'inventory':
        return <Warehouse size={16} className="text-orange-600" />;
      case 'report':
        return <BarChart3 size={16} className="text-indigo-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  // Get quick suggestions based on user role
  const getQuickSuggestions = () => {
    const suggestions = [
      { label: 'Active Devices', query: 'status:active', icon: <Smartphone size={16} />, color: 'blue' },
      { label: 'New Customers', query: 'isRead:false', icon: <Users size={16} />, color: 'green' },
      { label: 'Overdue Devices', query: 'overdue:true', icon: <Clock size={16} />, color: 'red' }
    ];

    const userPermissions = currentUser.permissions || [];
    const hasAll = userPermissions.includes('all');

    if (hasAll || userPermissions.includes('view_inventory') || userPermissions.includes('access_pos') || currentUser.role === 'admin' || currentUser.role === 'customer-care') {
      suggestions.push(
        { label: 'All Products', query: 'type:product', icon: <Package size={16} />, color: 'purple' },
        { label: 'Recent Sales', query: 'type:sale', icon: <TrendingUp size={16} />, color: 'amber' }
      );
    }

    if (hasAll || userPermissions.includes('view_financial_reports') || currentUser.role === 'admin') {
      suggestions.push(
        { label: 'Payment Reports', query: 'type:payment', icon: <CreditCard size={16} />, color: 'emerald' },
        { label: 'Loyalty Members', query: 'type:loyalty', icon: <Crown size={16} />, color: 'yellow' },
        { label: 'Inventory Alerts', query: 'low:stock', icon: <Warehouse size={16} />, color: 'orange' }
      );
    }

    return suggestions;
  };

  // Perform search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSuggestions(true);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      setError(null);
      setShowSuggestions(false);
      
      try {
        const results = await searchService.search(searchQuery);
        
        // Add icons to results
        const resultsWithIcons: SearchResult[] = results.map(result => ({
          ...result,
          icon: getIconForType(result.type),
        }));
        
        setSearchResults(resultsWithIcons);
      } catch (err) {
        console.error('Search error:', err);
        // Don't show error for now, just return empty results
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchService]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        handleResultClick(searchResults[selectedIndex]);
      } else if (searchQuery.trim()) {
        saveSearch(searchQuery);
        // Open full search modal
        openSearch(searchQuery.trim());
        setIsOpen(false);
        onClose?.();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      onClose?.();
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    saveSearch(searchQuery);
    navigate(result.url);
    setIsOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);
    onClose?.();
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: { query: string; label: string }) => {
    setSearchQuery(suggestion.query);
    saveSearch(suggestion.query);
  };

  // Handle recent search click
  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    saveSearch(query);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const quickSuggestions = getQuickSuggestions();

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-14 pr-14 py-4 rounded-2xl bg-white/60 border border-white/30 focus:outline-none focus:bg-white/80 focus:border-blue-400/50 focus:shadow-[0_8px_32px_0_rgba(59,130,246,0.15)] backdrop-blur-xl text-gray-800 placeholder-gray-400 transition-all duration-300"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSearchResults([]);
              setShowSuggestions(true);
            }}
            className="absolute right-5 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full bg-gray-100/80 hover:bg-gray-200/80 backdrop-blur-sm transition-all duration-200"
          >
            <X size={16} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white/60 backdrop-blur-2xl rounded-2xl shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)] border border-white/30 z-50 max-h-96 overflow-hidden">
          {/* Loading State */}
          {isSearching && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-blue-500 mr-3" />
              <span className="text-gray-700 font-medium">Searching...</span>
            </div>
          )}



          {/* Search Results */}
          {!isSearching && searchQuery.trim() && searchResults.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              {searchResults.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-all duration-200 ${
                    index === selectedIndex 
                      ? 'bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-xl border-l-4 border-l-blue-500' 
                      : 'hover:bg-white/40'
                  }`}
                >
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm">
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-800 truncate">{result.title}</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700">
                        {result.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                    <p className="text-xs text-gray-500 truncate">{result.description}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </div>
              ))}
              
              {/* View All Results */}
              <div className="p-4 border-t border-white/30 bg-white/20 backdrop-blur-sm">
                <button
                  onClick={() => {
                    saveSearch(searchQuery);
                    openSearch(searchQuery.trim());
                    setIsOpen(false);
                    onClose?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl"
                >
                  <ExternalLink size={16} />
                  View all results
                </button>
              </div>
            </div>
          )}

          {/* No Results */}
          {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
            <div className="p-6 text-center">
              <Search size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 text-sm font-medium">No results found</p>
              <p className="text-gray-500 text-xs mt-1">Try different keywords or check spelling</p>
            </div>
          )}

          {/* Suggestions */}
          {!isSearching && (!searchQuery.trim() || showSuggestions) && (
            <div className="max-h-64 overflow-y-auto">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="p-4 border-b border-white/20">
                  <h3 className="text-xs font-semibold text-gray-600 mb-3">Recent Searches</h3>
                  <div className="space-y-1">
                    {recentSearches.slice(0, 3).map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentSearchClick(search)}
                        className="w-full flex items-center gap-2 p-2.5 rounded-xl hover:bg-white/50 backdrop-blur-sm transition-all duration-200 text-left group"
                      >
                        <Clock size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium transition-colors">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Suggestions */}
              <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-600 mb-3">Quick Search</h3>
                <div className="grid grid-cols-1 gap-1.5">
                  {quickSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/50 backdrop-blur-sm transition-all duration-200 text-left group"
                    >
                      <div className={`p-1.5 rounded-lg bg-gradient-to-br from-${suggestion.color}-50 to-${suggestion.color}-100 shadow-sm`}>
                        {React.cloneElement(suggestion.icon, { className: `text-${suggestion.color}-600` })}
                      </div>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium transition-colors">{suggestion.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Tips */}
              <div className="p-4 border-t border-white/20 bg-white/20 backdrop-blur-sm">
                <h3 className="text-xs font-semibold text-gray-600 mb-3">Search Tips</h3>
                <div className="space-y-2 text-xs text-gray-600">
                  <p className="bg-white/40 backdrop-blur-sm rounded-lg p-2">• Use <kbd className="px-1.5 py-0.5 bg-white/60 rounded text-xs font-mono text-gray-700 shadow-sm">status:active</kbd> to find active devices</p>
                  <p className="bg-white/40 backdrop-blur-sm rounded-lg p-2">• Use <kbd className="px-1.5 py-0.5 bg-white/60 rounded text-xs font-mono text-gray-700 shadow-sm">brand:apple</kbd> to find Apple products</p>
                  <p className="bg-white/40 backdrop-blur-sm rounded-lg p-2">• Use <kbd className="px-1.5 py-0.5 bg-white/60 rounded text-xs font-mono text-gray-700 shadow-sm">price:1000-5000</kbd> for price ranges</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchDropdown;
