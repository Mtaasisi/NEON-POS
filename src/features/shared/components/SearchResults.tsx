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
  MessageSquare,
  Award,
  Calendar,
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
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);

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

  // Get color scheme for result type
  const getColorScheme = (type: string) => {
    switch (type) {
      case 'device':
        return {
          border: 'border-blue-200/40',
          borderHover: 'hover:border-blue-300/60',
          iconBg: 'bg-blue-50',
          selectedIconBg: 'bg-blue-100',
          badgeBg: 'bg-blue-100',
          badgeText: 'text-blue-700',
          selectedBorder: 'border-blue-400',
          selectedBg: 'bg-blue-50',
          selectedBadgeBg: 'bg-blue-100',
          selectedBadgeText: 'text-blue-700',
          hoverBorder: 'hover:border-blue-400',
        };
      case 'customer':
        return {
          border: 'border-green-200/40',
          borderHover: 'hover:border-green-300/60',
          iconBg: 'bg-green-50',
          selectedIconBg: 'bg-green-100',
          badgeBg: 'bg-green-100',
          badgeText: 'text-green-700',
          selectedBorder: 'border-green-400',
          selectedBg: 'bg-green-50',
          selectedBadgeBg: 'bg-green-100',
          selectedBadgeText: 'text-green-700',
          hoverBorder: 'hover:border-green-400',
        };
      case 'product':
        return {
          border: 'border-purple-200/40',
          borderHover: 'hover:border-purple-300/60',
          iconBg: 'bg-purple-50',
          selectedIconBg: 'bg-purple-100',
          badgeBg: 'bg-purple-100',
          badgeText: 'text-purple-700',
          selectedBorder: 'border-purple-400',
          selectedBg: 'bg-purple-50',
          selectedBadgeBg: 'bg-purple-100',
          selectedBadgeText: 'text-purple-700',
          hoverBorder: 'hover:border-purple-400',
        };
      case 'sale':
        return {
          border: 'border-amber-200/40',
          borderHover: 'hover:border-amber-300/60',
          iconBg: 'bg-amber-50',
          selectedIconBg: 'bg-amber-100',
          badgeBg: 'bg-amber-100',
          badgeText: 'text-amber-700',
          selectedBorder: 'border-amber-400',
          selectedBg: 'bg-amber-50',
          selectedBadgeBg: 'bg-amber-100',
          selectedBadgeText: 'text-amber-700',
          hoverBorder: 'hover:border-amber-400',
        };
      case 'payment':
        return {
          border: 'border-emerald-200/40',
          borderHover: 'hover:border-emerald-300/60',
          iconBg: 'bg-emerald-50',
          selectedIconBg: 'bg-emerald-100',
          badgeBg: 'bg-emerald-100',
          badgeText: 'text-emerald-700',
          selectedBorder: 'border-emerald-400',
          selectedBg: 'bg-emerald-50',
          selectedBadgeBg: 'bg-emerald-100',
          selectedBadgeText: 'text-emerald-700',
          hoverBorder: 'hover:border-emerald-400',
        };
      case 'loyalty':
        return {
          border: 'border-yellow-200/40',
          borderHover: 'hover:border-yellow-300/60',
          iconBg: 'bg-yellow-50',
          selectedIconBg: 'bg-yellow-100',
          badgeBg: 'bg-yellow-100',
          badgeText: 'text-yellow-700',
          selectedBorder: 'border-yellow-400',
          selectedBg: 'bg-yellow-50',
          selectedBadgeBg: 'bg-yellow-100',
          selectedBadgeText: 'text-yellow-700',
          hoverBorder: 'hover:border-yellow-400',
        };
      case 'inventory':
        return {
          border: 'border-orange-200/40',
          borderHover: 'hover:border-orange-300/60',
          iconBg: 'bg-orange-50',
          selectedIconBg: 'bg-orange-100',
          badgeBg: 'bg-orange-100',
          badgeText: 'text-orange-700',
          selectedBorder: 'border-orange-400',
          selectedBg: 'bg-orange-50',
          selectedBadgeBg: 'bg-orange-100',
          selectedBadgeText: 'text-orange-700',
          hoverBorder: 'hover:border-orange-400',
        };
      case 'report':
        return {
          border: 'border-indigo-200/40',
          borderHover: 'hover:border-indigo-300/60',
          iconBg: 'bg-indigo-50',
          selectedIconBg: 'bg-indigo-100',
          badgeBg: 'bg-indigo-100',
          badgeText: 'text-indigo-700',
          selectedBorder: 'border-indigo-400',
          selectedBg: 'bg-indigo-50',
          selectedBadgeBg: 'bg-indigo-100',
          selectedBadgeText: 'text-indigo-700',
          hoverBorder: 'hover:border-indigo-400',
        };
      case 'page':
        return {
          border: 'border-cyan-200/40',
          borderHover: 'hover:border-cyan-300/60',
          iconBg: 'bg-cyan-50',
          selectedIconBg: 'bg-cyan-100',
          badgeBg: 'bg-cyan-100',
          badgeText: 'text-cyan-700',
          selectedBorder: 'border-cyan-400',
          selectedBg: 'bg-cyan-50',
          selectedBadgeBg: 'bg-cyan-100',
          selectedBadgeText: 'text-cyan-700',
          hoverBorder: 'hover:border-cyan-400',
        };
      case 'action':
        return {
          border: 'border-pink-200/40',
          borderHover: 'hover:border-pink-300/60',
          iconBg: 'bg-pink-50',
          selectedIconBg: 'bg-pink-100',
          badgeBg: 'bg-pink-100',
          badgeText: 'text-pink-700',
          selectedBorder: 'border-pink-400',
          selectedBg: 'bg-pink-50',
          selectedBadgeBg: 'bg-pink-100',
          selectedBadgeText: 'text-pink-700',
          hoverBorder: 'hover:border-pink-400',
        };
      default:
        return {
          border: 'border-gray-200/40',
          borderHover: 'hover:border-gray-300/60',
          iconBg: 'bg-gray-50',
          selectedIconBg: 'bg-gray-100',
          badgeBg: 'bg-gray-100',
          badgeText: 'text-gray-700',
          selectedBorder: 'border-gray-400',
          selectedBg: 'bg-gray-50',
          selectedBadgeBg: 'bg-gray-200',
          selectedBadgeText: 'text-gray-700',
          hoverBorder: 'hover:border-gray-400',
        };
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
            <mark key={index} className="bg-yellow-300/40 text-inherit font-semibold px-0.5 rounded-sm">
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
            // Toggle expansion
            if (expandedResultId === result.id) {
              setExpandedResultId(null);
            } else {
              setExpandedResultId(result.id);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          // Close expanded result
          if (expandedResultId) {
            setExpandedResultId(null);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredResults, selectedIndex, expandedResultId]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultRefs.current[selectedIndex]) {
      resultRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Handle result click - toggle expansion
  const handleResultClick = (result: SearchResult, index: number) => {
    setSelectedIndex(index);
    
    // Toggle expansion
    if (expandedResultId === result.id) {
      setExpandedResultId(null);
    } else {
      setExpandedResultId(result.id);
    }
  };

  // Navigate to result
  const handleNavigate = (result: SearchResult) => {
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
        <div className="text-center bg-white rounded-xl p-8 border border-gray-100">
          <Loader2 size={28} className="animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">Searching...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center bg-white rounded-xl p-8 border border-gray-100">
          <AlertCircle size={28} className="text-red-500 mx-auto mb-3" />
          <p className="text-red-600 mb-1 font-medium text-sm">Search Error</p>
          <p className="text-gray-500 text-xs">{error}</p>
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

      <div className="space-y-3">
      {/* Results Header - macOS style */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">
            Results for <span className="text-gray-900">"{query}"</span>
          </h2>
          <p className="text-gray-500 mt-0.5 text-xs">
            {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters - macOS segmented control style */}
      {availableFilters.length > 1 && (
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 overflow-x-auto scrollbar-hide">
          {availableFilters.map((filterOption) => (
            <button
              key={filterOption.key}
              onClick={() => onFilterChange(filterOption.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                filter === filterOption.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {filterOption.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-xs ${
                filter === filterOption.key ? 'bg-gray-100 text-gray-600' : 'bg-gray-200/60 text-gray-500'
              }`}>
                {filterOption.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Results - Simplified minimal design */}
      {filteredResults.length > 0 ? (
        <div className="space-y-2">
          {filteredResults.map((result, index) => {
            const isSelected = index === selectedIndex;
            const colors = getColorScheme(result.type);
            return (
              <div
                key={`${result.type}-${result.id}`}
                ref={(el) => (resultRefs.current[index] = el)}
                onClick={() => handleResultClick(result, index)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`
                  rounded-lg p-3 transition-all duration-200 cursor-pointer group border
                  ${isSelected 
                    ? `${colors.selectedBg} border-2 ${colors.selectedBorder} shadow-sm`
                    : `bg-white border ${colors.border} hover:border-2 ${colors.hoverBorder} hover:shadow-sm`
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${
                      isSelected ? colors.selectedIconBg : colors.iconBg
                    }`}
                  >
                    {result.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-medium text-sm truncate text-gray-900">
                        {highlightText(result.title, query)}
                      </h3>
                      
                      {/* Type Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0 ${
                          isSelected
                            ? `${colors.selectedBadgeBg} ${colors.selectedBadgeText}`
                            : `${colors.badgeBg} ${colors.badgeText}`
                        }`}
                      >
                        {result.type}
                      </span>
                    </div>
                    
                    {/* Subtitle */}
                    {result.subtitle && (
                      <p className="text-xs truncate text-gray-500">
                        {highlightText(result.subtitle, query)}
                      </p>
                    )}
                    
                    {/* Description */}
                    {result.description && (
                      <p className="text-xs line-clamp-1 mt-1 text-gray-500">
                        {highlightText(result.description, query)}
                      </p>
                    )}
                    
                    {/* Metadata */}
                    {result.metadata && Object.keys(result.metadata).length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {result.metadata.status && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-gray-50 text-gray-600">
                            {result.metadata.status}
                          </span>
                        )}
                        {result.metadata.price && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-gray-50 text-gray-600">
                            TZS {result.metadata.price.toLocaleString()}
                          </span>
                        )}
                        {result.metadata.stock && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-gray-50 text-gray-600">
                            {result.metadata.stock} in stock
                          </span>
                        )}
                        {result.metadata.date && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-gray-50 text-gray-600">
                            {result.metadata.date instanceof Date 
                              ? result.metadata.date.toLocaleDateString() 
                              : result.metadata.date}
                          </span>
                        )}
                        {result.score !== undefined && (
                          <span className="text-xs px-2 py-0.5 rounded-md text-gray-500 bg-gray-50">
                            {Math.round((1 - result.score) * 100)}% match
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Arrow Icon */}
                  <div className="flex-shrink-0">
                    <ArrowRight
                      size={16}
                      className={`transition-all duration-200 ${
                        isSelected ? colors.selectedBadgeText : 'text-gray-300 group-hover:text-gray-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Detail Section */}
                {expandedResultId === result.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="space-y-3 text-gray-700">
                      {/* Full Description */}
                      {result.description && (
                        <div>
                          <h4 className="text-xs font-medium mb-1 text-gray-700">
                            Description
                          </h4>
                          <p className="text-xs leading-relaxed">
                            {result.description}
                          </p>
                        </div>
                      )}

                      {/* Metadata Details */}
                      {result.metadata && Object.keys(result.metadata).length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium mb-2 text-gray-700">
                            Details
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {result.metadata.status && (
                              <div className="p-2 rounded-lg bg-gray-50">
                                <div className="text-xs opacity-60 mb-0.5">Status</div>
                                <div className="text-sm font-medium">
                                  {result.metadata.status}
                                </div>
                              </div>
                            )}
                            {result.metadata.price && (
                              <div className="p-2 rounded-lg bg-gray-50">
                                <div className="text-xs opacity-60 mb-0.5">Price</div>
                                <div className="text-sm font-medium">
                                  TZS {result.metadata.price.toLocaleString()}
                                </div>
                              </div>
                            )}
                            {result.metadata.stock && (
                              <div className="p-2 rounded-lg bg-gray-50">
                                <div className="text-xs opacity-60 mb-0.5">Stock</div>
                                <div className="text-sm font-medium">
                                  {result.metadata.stock} units
                                </div>
                              </div>
                            )}
                            {result.metadata.date && (
                              <div className="p-2 rounded-lg bg-gray-50">
                                <div className="text-xs opacity-60 mb-0.5">Date</div>
                                <div className="text-sm font-medium">
                                  {result.metadata.date instanceof Date 
                                    ? result.metadata.date.toLocaleDateString() 
                                    : result.metadata.date}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Customer Information - Redesigned */}
                      {result.type === 'customer' && result.metadata && (
                        <div className="space-y-4">
                          {/* Customer Header */}
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                              Customer Profile
                            </h4>
                            {result.metadata.isActive !== undefined && (
                              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                                result.metadata.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  result.metadata.isActive ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                {result.metadata.isActive ? 'Active' : 'Inactive'}
                              </div>
                            )}
                          </div>

                          {/* Main Customer Card */}
                          <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
                            {/* Contact Section */}
                            <div className="p-5 border-b border-gray-100/60">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-200/50 flex items-center justify-center">
                                  <MessageSquare size={16} className="text-blue-600" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900">Contact Details</h5>
                                  <p className="text-xs text-gray-500">Primary contact information</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-3">
                                {/* Primary Contact Row */}
                                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                                      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Phone</p>
                                      <p className="text-sm font-semibold text-gray-900">{result.metadata.phone || 'Not provided'}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Contact Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                  {result.metadata.email && (
                                    <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                      <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Email</span>
                                      </div>
                                      <p className="text-sm font-semibold text-gray-900 truncate">{result.metadata.email}</p>
                                    </div>
                                  )}

                                  {result.metadata.whatsapp && (
                                    <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                      <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                                        </svg>
                                        <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">WhatsApp</span>
                                      </div>
                                      <p className="text-sm font-semibold text-gray-900">{result.metadata.whatsapp}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Location & Personal Info */}
                                {(result.metadata.city || result.metadata.location || result.metadata.gender || result.metadata.birthday) && (
                                  <div className="grid grid-cols-2 gap-3">
                                    {result.metadata.city && (
                                      <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                        <div className="flex items-center gap-2 mb-2">
                                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                          </svg>
                                          <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">City</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">{result.metadata.city}</p>
                                      </div>
                                    )}

                                    {result.metadata.gender && (
                                      <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                        <div className="flex items-center gap-2 mb-2">
                                          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                          </svg>
                                          <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Gender</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 capitalize">{result.metadata.gender}</p>
                                      </div>
                                    )}

                                    {result.metadata.birthday && (
                                      <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                        <div className="flex items-center gap-2 mb-2">
                                          <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                          </svg>
                                          <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Birthday</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">
                                          {new Date(result.metadata.birthday).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                          })}
                                        </p>
                                      </div>
                                    )}

                                    {result.metadata.location && (
                                      <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                        <div className="flex items-center gap-2 mb-2">
                                          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                                          </svg>
                                          <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Address</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 truncate">{result.metadata.location}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Value Metrics Section */}
                            {(result.metadata.points || result.metadata.totalSpent || result.metadata.totalPurchases || result.metadata.loyaltyLevel) && (
                              <div className="p-5 border-b border-gray-100/60">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-200/50 flex items-center justify-center">
                                    <Award size={16} className="text-green-600" />
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-900">Value Metrics</h5>
                                    <p className="text-xs text-gray-500">Customer lifetime value</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  {result.metadata.totalSpent !== undefined && (
                                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200/50">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-green-700 uppercase tracking-wide">Total Spent</span>
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                        </svg>
                                      </div>
                                      <p className="text-xl font-bold text-green-900">
                                        TZS {result.metadata.totalSpent.toLocaleString()}
                                      </p>
                                    </div>
                                  )}

                                  {result.metadata.points !== undefined && (
                                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Loyalty Points</span>
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                                        </svg>
                                      </div>
                                      <p className="text-xl font-bold text-blue-900">
                                        {result.metadata.points.toLocaleString()}
                                      </p>
                                    </div>
                                  )}

                                  {result.metadata.totalPurchases !== undefined && (
                                    <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200/50">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">Total Orders</span>
                                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                                        </svg>
                                      </div>
                                      <p className="text-xl font-bold text-purple-900">
                                        {result.metadata.totalPurchases}
                                      </p>
                                    </div>
                                  )}

                                  {result.metadata.loyaltyLevel && (
                                    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200/50">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Loyalty Level</span>
                                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                                        </svg>
                                      </div>
                                      <p className="text-lg font-bold text-amber-900 capitalize">
                                        {result.metadata.loyaltyLevel}
                                      </p>
                                      {result.metadata.loyaltyTier && (
                                        <p className="text-xs text-amber-700 mt-1 capitalize">
                                          {result.metadata.loyaltyTier} Tier
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Activity Timeline Section */}
                            <div className="p-5">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-200/50 flex items-center justify-center">
                                  <Clock size={16} className="text-orange-600" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900">Activity Timeline</h5>
                                  <p className="text-xs text-gray-500">Recent engagement & status</p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {/* Activity Items */}
                                <div className="flex items-center gap-4 p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">Last Visit</p>
                                    <p className="text-xs text-gray-500">
                                      {result.metadata.lastVisit
                                        ? new Date(result.metadata.lastVisit).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                          })
                                        : 'No recent activity'
                                      }
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">Member Since</p>
                                    <p className="text-xs text-gray-500">
                                      {result.metadata.joinedDate
                                        ? new Date(result.metadata.joinedDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long'
                                          })
                                        : 'Join date not available'
                                      }
                                    </p>
                                  </div>
                                </div>

                                {/* Tags and Status */}
                                {(result.metadata.colorTag || result.metadata.callLoyaltyLevel || result.metadata.totalCalls) && (
                                  <div className="flex flex-wrap gap-2 pt-2">
                                    {result.metadata.colorTag && (
                                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                                        result.metadata.colorTag === 'vip' ? 'bg-purple-100 text-purple-800' :
                                        result.metadata.colorTag === 'complainer' ? 'bg-red-100 text-red-800' :
                                        result.metadata.colorTag === 'purchased' ? 'bg-green-100 text-green-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                          result.metadata.colorTag === 'vip' ? 'bg-purple-500' :
                                          result.metadata.colorTag === 'complainer' ? 'bg-red-500' :
                                          result.metadata.colorTag === 'purchased' ? 'bg-green-500' :
                                          'bg-gray-500'
                                        }`}></div>
                                        {result.metadata.colorTag}
                                      </span>
                                    )}

                                    {result.metadata.callLoyaltyLevel && (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                                        </svg>
                                        {result.metadata.callLoyaltyLevel}
                                      </span>
                                    )}

                                    {result.metadata.totalCalls !== undefined && (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                        </svg>
                                        {result.metadata.totalCalls} calls
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Customer Quick Actions */}
                      {result.type === 'customer' && (
                        <div>
                          <h4 className="text-xs font-medium mb-3 text-gray-700">
                            Quick Actions
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Open SMS modal for this customer
                                const smsUrl = `/sms?customer=${result.id}&phone=${result.metadata?.phone || ''}&name=${encodeURIComponent(result.title)}`;
                                navigate(smsUrl);
                              }}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-xs font-medium"
                            >
                              <MessageSquare size={14} />
                              Send SMS
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Navigate to points management for this customer
                                const pointsUrl = `/lats/loyalty?customer=${result.id}`;
                                navigate(pointsUrl);
                              }}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-xs font-medium"
                            >
                              <Award size={14} />
                              Add Points
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Navigate to appointments for this customer
                                const appointmentUrl = `/appointments?customer=${result.id}`;
                                navigate(appointmentUrl);
                              }}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-xs font-medium"
                            >
                              <Calendar size={14} />
                              Book Appointment
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Navigate to customer profile
                                navigate(`/customers/${result.id}`);
                              }}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-xs font-medium"
                            >
                              <Users size={14} />
                              View Profile
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(result);
                          }}
                          className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-gray-100 hover:bg-gray-150 text-gray-700"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <ExternalLink size={13} />
                            View Details
                          </div>
                        </button>
                        {result.type === 'sale' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/sales/${result.id}/receipt`, '_blank');
                            }}
                            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-gray-100 hover:bg-gray-150 text-gray-700"
                          >
                            <FileText size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-white rounded-xl p-8 border border-gray-100 inline-block">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3">
              <Search size={24} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">No results found</h3>
            <p className="text-gray-500 text-xs">
              Try adjusting your search terms or filters
            </p>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default SearchResults;
