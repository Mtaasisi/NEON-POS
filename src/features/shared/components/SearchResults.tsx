import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchService, { SearchResult as ServiceSearchResult } from '../../../lib/searchService';
import CustomerActivityPanel from './CustomerActivityPanel';
import {
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
  Search,
  AlertCircle,
  Layout,
  Zap,
} from 'lucide-react';

interface SearchResult extends ServiceSearchResult {
  icon: React.ReactNode;
}

interface SearchResultsProps {
  query: string;
  filter: string;
  onFilterChange: (filter: string) => void;
  userRole: string;
  devices: any[];
  customers: any[];
}

const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  filter,
  onFilterChange,
  isLoading: _isLoading,
  userRole,
  devices: _devices,
  customers: _customers,
}) => {
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);

  // Initialize search service
  const searchService = useMemo(() => new SearchService(userRole), [userRole]);

  // Perform search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      setError(null);
      
      try {
        const results = await searchService.search(query);
        
        // Add icons to results
        const resultsWithIcons: SearchResult[] = results.map(result => ({
          ...result,
          icon: getIconForType(result.type),
        }));
        
        setSearchResults(resultsWithIcons);
      } catch (err) {
        console.error('Search error:', err);
        setError('An error occurred while searching. Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query, searchService]);

  // Get icon for result type
  const getIconForType = (type: string): React.ReactNode => {
    switch (type) {
      case 'device':
        return <Smartphone size={20} className="text-blue-600" />;
      case 'customer':
        return <Users size={20} className="text-green-600" />;
      case 'product':
        return <Package size={20} className="text-purple-600" />;
      case 'sale':
        return <TrendingUp size={20} className="text-amber-600" />;
      case 'payment':
        return <CreditCard size={20} className="text-emerald-600" />;
      case 'loyalty':
        return <Crown size={20} className="text-yellow-600" />;
      case 'inventory':
        return <Warehouse size={20} className="text-orange-600" />;
      case 'report':
        return <BarChart3 size={20} className="text-indigo-600" />;
      case 'page':
        return <Layout size={20} className="text-cyan-600" />;
      case 'action':
        return <Zap size={20} className="text-pink-600" />;
      default:
        return <FileText size={20} className="text-gray-600" />;
    }
  };

  // Highlight matching text
  const highlightText = useCallback((text: string, searchTerms: string): React.ReactNode => {
    if (!searchTerms) return text;

    const terms = searchTerms.split(' ').filter(t => t.length > 1);
    if (terms.length === 0) return text;

    let highlightedText = text;
    const parts: { text: string; isHighlighted: boolean }[] = [];
    let lastIndex = 0;

    // Create regex pattern for all search terms
    const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Add non-highlighted text before match
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isHighlighted: false });
      }
      // Add highlighted match
      parts.push({ text: match[0], isHighlighted: true });
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining non-highlighted text
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isHighlighted: false });
    }

    if (parts.length === 0) return text;

    return (
      <>
        {parts.map((part, index) => 
          part.isHighlighted ? (
            <mark key={index} className="bg-yellow-200 text-gray-900 px-0.5 rounded">
              {part.text}
            </mark>
          ) : (
            <span key={index}>{part.text}</span>
          )
        )}
      </>
    );
  }, []);



  // Filter results by type
  const filteredResults = useMemo(() => {
    if (filter === 'all') return searchResults;
    return searchResults.filter(result => result.type === filter);
  }, [searchResults, filter]);

  // Get available filters
  const availableFilters = useMemo(() => {
    const filters = [
      { key: 'all', label: 'All Results', count: searchResults.length }
    ];

    const typeCounts = searchResults.reduce((acc, result) => {
      acc[result.type] = (acc[result.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(typeCounts).forEach(([type, count]) => {
      const labels: Record<string, string> = {
        device: 'Devices',
        customer: 'Customers',
        product: 'Products',
        sale: 'Sales',
        payment: 'Payments',
        loyalty: 'Loyalty',
        inventory: 'Inventory',
        report: 'Reports',
        page: 'Pages',
        action: 'Actions'
      };
      
      filters.push({
        key: type,
        label: labels[type] || type,
        count
      });
    });

    return filters;
  }, [searchResults]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
    resultRefs.current = [];
  }, [filteredResults]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredResults.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredResults[selectedIndex]) {
            const result = filteredResults[selectedIndex];
            // Show activity panel for customers
            if (result.type === 'customer') {
              setSelectedCustomer({
                id: result.id,
                name: result.title,
              });
            } else {
              navigate(result.url);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredResults, selectedIndex, navigate]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultRefs.current[selectedIndex]) {
      resultRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Handle result click
  const handleResultClick = (result: SearchResult, index: number) => {
    setSelectedIndex(index);
    
    // Show activity panel for customers
    if (result.type === 'customer') {
      setSelectedCustomer({
        id: result.id,
        name: result.title,
      });
    } else {
      navigate(result.url);
    }
  };

  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center bg-white/50 backdrop-blur-xl rounded-2xl p-8 border border-white/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
          <Loader2 size={36} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Searching...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center bg-white/50 backdrop-blur-xl rounded-2xl p-8 border border-red-200/40 shadow-[0_8px_32px_0_rgba(239,68,68,0.1)]">
          <AlertCircle size={36} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-2 font-semibold">Search Error</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Customer Activity Panel */}
      {selectedCustomer && (
        <CustomerActivityPanel
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between bg-white/40 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-[0_4px_16px_0_rgba(31,38,135,0.05)]">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Search Results for <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">"{query}"</span>
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Filters */}
      {availableFilters.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {availableFilters.map((filterOption) => (
            <button
              key={filterOption.key}
              onClick={() => onFilterChange(filterOption.key)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap backdrop-blur-xl transition-all duration-300 ${
                filter === filterOption.key
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-[0_4px_20px_0_rgba(59,130,246,0.3)] scale-105'
                  : 'bg-white/60 text-gray-700 hover:bg-white/80 border border-white/40 shadow-[0_2px_8px_0_rgba(31,38,135,0.05)] hover:scale-105'
              }`}
            >
              {filterOption.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                filter === filterOption.key ? 'bg-white/30' : 'bg-gray-100'
              }`}>
                {filterOption.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {filteredResults.length > 0 ? (
        <div className="space-y-3">
          {filteredResults.map((result, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={`${result.type}-${result.id}`}
                ref={(el) => (resultRefs.current[index] = el)}
                onClick={() => handleResultClick(result, index)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`
                  rounded-2xl p-5 border backdrop-blur-xl transition-all duration-300 cursor-pointer group
                  ${isSelected 
                    ? 'bg-gradient-to-r from-blue-50/80 to-purple-50/80 border-blue-300 shadow-[0_8px_32px_0_rgba(59,130,246,0.2)] scale-[1.02]' 
                    : 'bg-white/50 border-white/30 hover:bg-white/70 hover:shadow-[0_8px_32px_0_rgba(59,130,246,0.15)] hover:scale-[1.01] hover:border-blue-300/50'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    p-3 rounded-xl shadow-sm transition-all duration-300 flex-shrink-0
                    ${isSelected 
                      ? 'bg-gradient-to-br from-blue-100 to-purple-100' 
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-blue-50 group-hover:to-purple-50'
                    }
                  `}>
                    {result.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className={`
                          font-semibold text-lg transition-colors mb-1
                          ${isSelected ? 'text-gray-900' : 'text-gray-800 group-hover:text-gray-900'}
                        `}>
                          {highlightText(result.title, query)}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`
                            px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm
                            ${isSelected 
                              ? 'bg-gradient-to-r from-blue-200 to-purple-200 text-blue-800' 
                              : 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700'
                            }
                          `}>
                            {result.type}
                          </span>
                          {result.score !== undefined && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {Math.round((1 - result.score) * 100)}% match
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      {highlightText(result.subtitle, query)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {highlightText(result.description, query)}
                    </p>
                    
                    {result.metadata && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200/50 flex-wrap">
                        {result.metadata.status && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-xs text-gray-600 bg-gray-100/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                              {result.metadata.status}
                            </span>
                          </div>
                        )}
                        {result.metadata.price && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500">💰</span>
                            <span className="text-xs text-gray-600 bg-gray-100/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                              TZS {result.metadata.price.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {result.metadata.stock && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500">📦</span>
                            <span className="text-xs text-gray-600 bg-gray-100/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                              {result.metadata.stock} in stock
                            </span>
                          </div>
                        )}
                        {result.metadata.date && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500">📅</span>
                            <span className="text-xs text-gray-600 bg-gray-100/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                              {result.metadata.date instanceof Date 
                                ? result.metadata.date.toLocaleDateString() 
                                : result.metadata.date}
                            </span>
                          </div>
                        )}
                        {result.metadata.icon && (
                          <span className="text-lg">{result.metadata.icon}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Quick Actions for Sales */}
                    {result.type === 'sale' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Add quick action for viewing sale details
                            navigate(result.url);
                          }}
                          className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                          title="View Sale Details"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Add quick action for printing receipt
                            window.open(`/sales/${result.id}/receipt`, '_blank');
                          }}
                          className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
                          title="Print Receipt"
                        >
                          Print
                        </button>
                      </div>
                    )}
                    
                    <ArrowRight size={18} className={`
                      transition-all duration-300
                      ${isSelected 
                        ? 'opacity-100 text-blue-500' 
                        : 'text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-blue-500'
                      }
                    `} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-10 border border-white/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] inline-block">
            <Search size={56} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No results found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Try adjusting your search terms or filters. You can also try searching for different keywords.
            </p>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default SearchResults;
