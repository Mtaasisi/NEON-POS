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
  ChevronDown,
  Edit,
  Trash2,
  Eye,
  ShoppingCart,
  CheckCircle2,
  DollarSign,
  Copy,
  Share2,
  Printer,
  Minimize2,
  Maximize2,
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
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(new Set());
  const [minimizedVariantsSections, setMinimizedVariantsSections] = useState<Set<string>>(new Set());

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

  // Auto-minimize all variants sections when search results change
  useEffect(() => {
    const productResults = searchResults.filter(result => 
      result.type === 'product' && result.metadata?.variants && result.metadata.variants.length > 0
    );
    if (productResults.length > 0) {
      setMinimizedVariantsSections(prev => {
        const newSet = new Set(prev);
        productResults.forEach(result => {
          newSet.add(result.id);
        });
        return newSet;
      });
    }
  }, [searchResults]);

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
      {/* Sticky Header and Filters */}
      <div className="sticky top-0 z-10 bg-white pb-3 pt-2 -mx-6 px-6 border-b border-gray-100 shadow-sm">
        {/* Results Header - macOS style */}
        <div className="flex items-center justify-between mb-3">
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
      </div>

      {/* Results - Inspired by provided design */}
      {filteredResults.length > 0 ? (
        <div className="space-y-3">
          {filteredResults.map((result, index) => {
            const isExpanded = expandedResultId === result.id;
            const isSelected = index === selectedIndex;
            const colors = getColorScheme(result.type);
            
            // Get border color based on type and status
            const getBorderColor = () => {
              if (result.metadata?.status === 'complete' || result.metadata?.status === 'completed' || result.metadata?.status === 'paid') {
                return 'border-green-200 hover:border-green-300/30';
              }
              if (result.type === 'product') {
                return 'border-purple-200 hover:border-purple-300/30';
              }
              if (result.type === 'device') {
                return 'border-blue-200 hover:border-blue-300/30';
              }
              if (result.type === 'sale') {
                return 'border-amber-200 hover:border-amber-300/30';
              }
              return 'border-gray-200 hover:border-gray-300/30';
            };

            // Get status badge
            const getStatusBadge = () => {
              const status = result.metadata?.status?.toLowerCase();
              if (status === 'complete' || status === 'completed') {
                return (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold bg-green-500 text-white shadow-sm flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                    Complete
                  </span>
                );
              }
              if (status === 'active' || status === 'in-progress' || status === 'pending') {
                return (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold text-green-600 bg-green-100 flex items-center gap-2 flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ACTIVE</span>
                  </span>
                );
              }
              if (status === 'paid') {
                return (
                  <span className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl text-base font-bold shadow-sm bg-green-500 text-white">
                    <CheckCircle2 className="w-5 h-5" />
                    Paid
                  </span>
                );
              }
              if (status === 'partial') {
                return (
                  <span className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl text-base font-bold shadow-sm bg-yellow-500 text-white">
                    <Clock className="w-5 h-5" />
                    Partial
                  </span>
                );
              }
              return null;
            };

            // Format date
            const formatDate = (date: string | Date | undefined) => {
              if (!date) return null;
              const d = date instanceof Date ? date : new Date(date);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            };

            return (
              <div
                key={`${result.type}-${result.id}-${index}`}
                ref={(el) => (resultRefs.current[index] = el)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`
                  border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 cursor-pointer
                  ${getBorderColor()}
                  ${isSelected ? 'ring-2 ring-blue-400' : ''}
                `}
              >
                <div 
                  className="flex items-start justify-between p-6 cursor-pointer"
                  onClick={() => handleResultClick(result, index)}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Chevron Icon */}
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 bg-gray-200 hover:bg-gray-300 text-gray-600">
                      <ChevronDown 
                        className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                      {/* Title and Status */}
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <h3 className="text-2xl font-bold text-gray-900 truncate">
                        {highlightText(result.title, query)}
                      </h3>
                        {/* Stock Quantity Badge - After Product Name */}
                        {result.type === 'product' && result.metadata?.stock !== undefined && (
                          <div className={`p-2 rounded-full border-2 border-white shadow-lg flex items-center justify-center w-10 h-10 flex-shrink-0 ${
                            result.metadata.stock <= 0 
                              ? 'bg-gradient-to-r from-red-500 to-red-600' 
                              : result.metadata.stock <= 5
                              ? 'bg-gradient-to-r from-red-500 to-red-600'
                              : result.metadata.stock <= 10
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                              : 'bg-gradient-to-r from-green-500 to-emerald-500'
                          }`}>
                            <span className="text-sm font-bold text-white">
                              {result.metadata.stock >= 1000 ? `${(result.metadata.stock / 1000).toFixed(1)}K` : result.metadata.stock}
                            </span>
                          </div>
                        )}
                        {getStatusBadge()}
                    </div>
                    
                      {/* Metadata Row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Customer/Subtitle Badge */}
                        {result.subtitle && (
                          <div 
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0 cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {result.type === 'customer' ? (
                              <Users className="w-5 h-5" />
                            ) : result.type === 'sale' ? (
                              <Users className="w-5 h-5" />
                            ) : (
                              <Package className="w-5 h-5" />
                            )}
                            <span className="text-base font-semibold truncate max-w-[140px]">
                              {highlightText(result.subtitle, query)}
                            </span>
                          </div>
                        )}
                        
                        {/* Date Info */}
                                {(result.createdAt || result.metadata?.date) && (
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
                                <Calendar className="w-5 h-5 text-gray-600" />
                                <span className="text-base font-medium text-gray-600">
                                  {formatDate(result.createdAt || result.metadata?.date) || 'N/A'}
                          </span>
                      </div>
                    )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Side - Total Amount (only for product and sale) */}
                  {(result.type === 'product' || result.type === 'sale') && (
                  <div className="ml-4 flex-shrink-0">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-500 font-medium uppercase tracking-wide">
                            {result.type === 'product' ? 'Price' : 'Total Amount'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-4xl font-bold text-gray-900 leading-tight">
                            {result.metadata?.hasPrice && result.metadata.price != null
                              ? `TSh ${result.metadata.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                              : result.metadata?.amount != null
                              ? `TSh ${result.metadata.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                              : <span className="text-gray-400 text-2xl font-normal">No price set</span>
                            }
                        </span>
                      </div>
                    </div>
                  </div>
                  )}
                </div>

                {/* Expanded Detail Section */}
                {expandedResultId === result.id ? (
                  <div className="px-6 pb-6 pt-0">
                    <div className="space-y-6">

                      {/* Product/Variant Information */}
                      {result.type === 'product' && result.metadata && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                            • PRODUCT DETAILS
                          </h4>

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Basic Information - Left Side */}
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className="p-5">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-200/50 flex items-center justify-center">
                                  <Package size={16} className="text-purple-600" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900">Basic Information</h5>
                                  <p className="text-xs text-gray-500">Product details and identifiers</p>
                                </div>
                              </div>

                                  <div className="space-y-4">
                                {result.metadata.barcode && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Barcode</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">{result.metadata.barcode}</p>
                                  </div>
                                )}
                                    {result.metadata.categoryName && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Category</span>
                                    </div>
                                        <p className="text-sm font-semibold text-gray-900">{result.metadata.categoryName}</p>
                                  </div>
                                )}
                                    </div>
                              </div>
                            </div>

                              {/* Pricing & Inventory - Right Side */}
                              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="p-5">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-200/50 flex items-center justify-center">
                                  <TrendingUp size={16} className="text-green-600" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900">Pricing & Inventory</h5>
                                  <p className="text-xs text-gray-500">Financial and stock information</p>
                                </div>
                              </div>

                                  <div className="space-y-4">
                                {result.metadata.hasPrice && result.metadata.price != null ? (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Selling Price</span>
                                    </div>
                                    <p className="text-lg font-bold text-green-600">
                                      TZS {result.metadata.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Selling Price</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-400 italic">
                                      No price set
                                    </p>
                                  </div>
                                )}
                                {result.metadata.variantId && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Variant ID</span>
                                    </div>
                                    <p className="text-xs font-mono text-gray-600 break-all">{result.metadata.variantId}</p>
                                  </div>
                                )}
                                    </div>
                                  </div>
                              </div>
                            </div>

                            {/* Variants Section */}
                            {result.metadata.variants && result.metadata.variants.length > 0 && (
                              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className="p-5">
                                  <div 
                                    className="flex items-center justify-between mb-4 cursor-pointer"
                                    onClick={() => {
                                      setMinimizedVariantsSections(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(result.id)) {
                                          newSet.delete(result.id);
                                        } else {
                                          newSet.add(result.id);
                                        }
                                        return newSet;
                                      });
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-200/50 flex items-center justify-center">
                                      <Package size={16} className="text-blue-600" />
                                    </div>
                                    <div>
                                      <h5 className="text-sm font-semibold text-gray-900">Product Variants</h5>
                                      <p className="text-xs text-gray-500">
                                        {result.metadata.variantCount} variant{result.metadata.variantCount !== 1 ? 's' : ''} with children
                                      </p>
                                    </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMinimizedVariantsSections(prev => {
                                          const newSet = new Set(prev);
                                          if (newSet.has(result.id)) {
                                            newSet.delete(result.id);
                                          } else {
                                            newSet.add(result.id);
                                          }
                                          return newSet;
                                        });
                                      }}
                                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900"
                                      title={minimizedVariantsSections.has(result.id) ? 'Maximize' : 'Minimize'}
                                    >
                                      {minimizedVariantsSections.has(result.id) ? (
                                        <Maximize2 size={16} />
                                      ) : (
                                        <Minimize2 size={16} />
                                      )}
                                    </button>
                                  </div>

                                  {!minimizedVariantsSections.has(result.id) && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {result.metadata.variants.map((variant: any) => {
                                      const variantKey = `${result.id}-${variant.id}`;
                                      const isVariantExpanded = expandedVariants.has(variantKey);
                                      const hasChildren = variant.children && variant.children.length > 0;

                                      return (
                                        <div
                                          key={variant.id}
                                          className={`border rounded-lg overflow-hidden relative cursor-pointer ${
                                            hasChildren 
                                              ? 'border-purple-300 bg-purple-50/30' 
                                              : 'border-gray-200'
                                          }`}
                                          onClick={() => {
                                            // Open Product Variants section if minimized
                                            if (minimizedVariantsSections.has(result.id)) {
                                              setMinimizedVariantsSections(prev => {
                                                const newSet = new Set(prev);
                                                newSet.delete(result.id);
                                                return newSet;
                                              });
                                            }
                                          }}
                                        >
                                          {/* Stock Quantity Badge - Top Right Corner */}
                                          {variant.quantity !== null && variant.quantity !== undefined && (
                                            <div className={`absolute top-1 right-1 p-1 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20 w-7 h-7 ${
                                              variant.quantity <= 0 
                                                ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                                : variant.quantity <= 5
                                                ? 'bg-gradient-to-r from-red-500 to-red-600'
                                                : variant.quantity <= 10
                                                ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                                                : 'bg-gradient-to-r from-green-500 to-emerald-500'
                                            }`}>
                                              <span className="text-[10px] font-bold text-white">
                                                {variant.quantity >= 1000 ? `${(variant.quantity / 1000).toFixed(1)}K` : variant.quantity}
                                              </span>
                                            </div>
                                          )}
                                          
                                          {/* Variant Header - Clickable to expand/collapse */}
                                          <div
                                            className={`p-3 transition-colors cursor-pointer ${
                                              hasChildren 
                                                ? 'bg-purple-50/50 hover:bg-purple-100/50' 
                                                : 'bg-gray-50 hover:bg-gray-100 cursor-default'
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation(); // Prevent opening Product Variants section
                                              if (hasChildren) {
                                                setExpandedVariants(prev => {
                                                  const newSet = new Set(prev);
                                                  if (newSet.has(variantKey)) {
                                                    newSet.delete(variantKey);
                                                  } else {
                                                    newSet.add(variantKey);
                                                  }
                                                  return newSet;
                                                });
                                              }
                                            }}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {hasChildren && (
                                                  <ChevronDown
                                                    className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${
                                                      isVariantExpanded ? 'rotate-180' : ''
                                                    }`}
                                                  />
                                                )}
                                                {!hasChildren && <div className="w-4 h-4 flex-shrink-0" />}
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-semibold text-gray-900 truncate">
                                                      {variant.variant_name || variant.name || 'Unnamed Variant'}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-4 text-xs text-gray-600">
                                                    {variant.selling_price !== null && variant.selling_price !== undefined && (
                                                      <span>
                                                        Price: TZS {Number(variant.selling_price).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Children Variants - Collapsible */}
                                          {hasChildren && isVariantExpanded && (
                                            <div className="border-t border-gray-200 bg-gray-50/50">
                                              <div className="p-3 pl-4">
                                                <ul className="space-y-2">
                                                  {variant.children.map((child: any, childIndex: number) => {
                                                    // Extract IMEI or serial number from various possible locations
                                                    const imei = child.variant_attributes?.imei || child.attributes?.imei || child.imei;
                                                    const serialNumber = child.variant_attributes?.serial_number || child.attributes?.serial_number || child.serial_number || child.serialNumber;
                                                    const displayValue = imei || serialNumber || child.name || child.variant_name;
                                                    
                                                    return (
                                                      <li
                                                        key={child.id}
                                                        className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                                      >
                                                        {child.variant_type === 'imei_child' && (
                                                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded flex-shrink-0">
                                                            IMEI
                                                          </span>
                                                        )}
                                                        {!child.variant_type || child.variant_type !== 'imei_child' ? (
                                                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded flex-shrink-0">
                                                            Serial
                                                          </span>
                                                        ) : null}
                                                        {displayValue && (
                                                          <span className="font-mono text-sm text-gray-900">
                                                            {displayValue}
                                                          </span>
                                                        )}
                                                      </li>
                                                    );
                                                  })}
                                                </ul>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Timestamps Card */}
                            {(result.createdAt || result.updatedAt) && (
                              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className="p-5">
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-200/50 flex items-center justify-center">
                                      <Clock size={16} className="text-orange-600" />
                                    </div>
                                    <div>
                                      <h5 className="text-sm font-semibold text-gray-900">Timestamps</h5>
                                      <p className="text-xs text-gray-500">Creation and update dates</p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    {result.createdAt && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                          Created
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {new Date(result.createdAt).toLocaleString()}
                                        </div>
                                      </div>
                                    )}
                                    {result.updatedAt && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                          Last Updated
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {new Date(result.updatedAt).toLocaleString()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Device Information */}
                      {result.type === 'device' && result.metadata && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                            • DEVICE DETAILS
                          </h4>

                          <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            {/* Device Information */}
                            <div className="p-5 border-b border-gray-100/60">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-200/50 flex items-center justify-center">
                                  <Smartphone size={16} className="text-blue-600" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900">Device Information</h5>
                                  <p className="text-xs text-gray-500">Device model and identifiers</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {result.metadata.serialNumber && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Serial Number</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">{result.metadata.serialNumber}</p>
                              </div>
                            )}
                                {result.id && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Device ID</span>
                                    </div>
                                    <p className="text-xs font-mono text-gray-600 break-all">{result.id}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Issue Information */}
                            {result.metadata.issue && (
                              <div className="p-5 border-b border-gray-100/60">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-200/50 flex items-center justify-center">
                                    <AlertCircle size={16} className="text-red-600" />
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-900">Problem Description</h5>
                                    <p className="text-xs text-gray-500">Reported issue details</p>
                                  </div>
                                </div>

                                <div className="p-4 bg-white/60 rounded-xl border border-gray-100/50">
                                  <p className="text-sm text-gray-900 leading-relaxed">{result.metadata.issue}</p>
                                </div>
                              </div>
                            )}

                            {/* Dates & Timeline */}
                            <div className="p-5">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-200/50 flex items-center justify-center">
                                  <Clock size={16} className="text-orange-600" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900">Timeline</h5>
                                  <p className="text-xs text-gray-500">Important dates</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {result.createdAt && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="text-xs opacity-60 mb-0.5">Created</div>
                                <div className="text-sm font-medium">
                                      {new Date(result.createdAt).toLocaleString()}
                                </div>
                              </div>
                            )}
                                {result.updatedAt && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="text-xs opacity-60 mb-0.5">Last Updated</div>
                                <div className="text-sm font-medium">
                                      {new Date(result.updatedAt).toLocaleString()}
                                </div>
                              </div>
                            )}
                                {result.metadata.expectedReturnDate && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="text-xs opacity-60 mb-0.5">Expected Return</div>
                                    <div className="text-sm font-medium">
                                      {new Date(result.metadata.expectedReturnDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sale Information */}
                      {result.type === 'sale' && result.metadata && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                            • SALE DETAILS
                          </h4>

                          <div className="space-y-4">
                            {/* Sale Information Card */}
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                              <div className="p-5 border-b border-gray-100">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-200/50 flex items-center justify-center">
                                    <TrendingUp size={16} className="text-amber-600" />
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-semibold text-gray-900">Sale Information</h5>
                                    <p className="text-xs text-gray-500">Transaction details</p>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  {result.metadata.amount !== undefined && (
                                    <div>
                                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                        TOTAL AMOUNT
                                      </div>
                                      <p className="text-3xl font-bold text-green-600">
                                        TZS {result.metadata.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                      </p>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-4">
                                    {result.metadata.customer && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                          CUSTOMER
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">{result.metadata.customer}</p>
                                      </div>
                                    )}
                                    {result.id && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                          SALE ID
                                        </div>
                                        <p className="text-xs font-mono text-gray-600 break-all">{result.id}</p>
                                      </div>
                                    )}
                                        </div>
                                </div>
                              </div>
                            </div>

                            {/* Timestamps Card */}
                            {(result.createdAt || result.updatedAt) && (
                              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className="p-5">
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-200/50 flex items-center justify-center">
                                      <Clock size={16} className="text-orange-600" />
                                    </div>
                                    <div>
                                      <h5 className="text-sm font-semibold text-gray-900">Timestamps</h5>
                                      <p className="text-xs text-gray-500">Creation and update dates</p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    {result.createdAt && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                          Created
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {new Date(result.createdAt).toLocaleString()}
                                        </div>
                                      </div>
                                    )}
                                    {result.updatedAt && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                          Last Updated
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {new Date(result.updatedAt).toLocaleString()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Generic Metadata Details for other types */}
                      {result.type !== 'customer' && result.type !== 'product' && result.type !== 'device' && result.type !== 'sale' && result.metadata && Object.keys(result.metadata).length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium mb-2 text-gray-700">
                            All Details
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(result.metadata).map(([key, value]) => {
                              if (value === null || value === undefined || value === '') return null;
                              // Filter out price/amount fields for non-product/non-sale types
                              if ((key.toLowerCase() === 'price' || key.toLowerCase() === 'amount') && 
                                  result.type !== 'product' && result.type !== 'sale') {
                                return null;
                              }
                              return (
                                <div key={key} className="p-2 rounded-lg bg-gray-50">
                                  <div className="text-xs opacity-60 mb-0.5 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                                  <div className="text-sm font-medium">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </div>
                                </div>
                              );
                            })}
                            {result.id && (
                              <div className="p-2 rounded-lg bg-gray-50">
                                <div className="text-xs opacity-60 mb-0.5">ID</div>
                                <div className="text-xs font-mono text-gray-600 break-all">{result.id}</div>
                              </div>
                            )}
                            {result.createdAt && (
                              <div className="p-2 rounded-lg bg-gray-50">
                                <div className="text-xs opacity-60 mb-0.5">Created</div>
                                <div className="text-sm font-medium">
                                  {new Date(result.createdAt).toLocaleString()}
                                </div>
                              </div>
                            )}
                            {result.updatedAt && (
                              <div className="p-2 rounded-lg bg-gray-50">
                                <div className="text-xs opacity-60 mb-0.5">Last Updated</div>
                                <div className="text-sm font-medium">
                                  {new Date(result.updatedAt).toLocaleString()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Customer Information - Redesigned with Grid Layout */}
                      {result.type === 'customer' && (
                        <div className="space-y-4">
                          {/* Customer Header */}
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                              Customer Profile
                            </h4>
                            {result.metadata?.isActive !== undefined && (
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

                          {/* Basic Info Fallback - Show if metadata is missing */}
                          {!result.metadata && (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm p-5">
                              <div className="space-y-2">
                                <div>
                                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</div>
                                  <p className="text-sm font-semibold text-gray-900">{result.title || 'Unknown Customer'}</p>
                                </div>
                                {result.subtitle && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone</div>
                                    <p className="text-sm font-semibold text-gray-900">{result.subtitle}</p>
                                  </div>
                                )}
                                {result.id && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">ID</div>
                                    <p className="text-xs font-mono text-gray-600 break-all">{result.id}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Main Customer Card - Only show if metadata exists */}
                          {result.metadata && (
                          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            {/* Contact Details */}
                            <div className="p-5 border-b border-gray-100">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-200/50 flex items-center justify-center">
                                  <MessageSquare size={16} className="text-blue-600" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900">Contact Details</h5>
                                  <p className="text-xs text-gray-500">Primary contact information</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                {(result.metadata?.phone || result.subtitle) && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Phone</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">{result.metadata?.phone || result.subtitle || 'No phone'}</p>
                                  </div>
                                )}
                                {result.metadata?.email && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Email</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 truncate">{result.metadata.email || 'No email'}</p>
                                  </div>
                                )}
                                {result.metadata?.city && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">City</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">{result.metadata.city}</p>
                                  </div>
                                )}
                                {result.metadata?.location && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Address</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 truncate">{result.metadata.location}</p>
                                  </div>
                                )}
                                {result.metadata?.whatsapp && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">WhatsApp</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">{result.metadata.whatsapp}</p>
                                  </div>
                                )}
                                {result.id && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">ID</span>
                                    </div>
                                    <p className="text-xs font-mono text-gray-600 break-all">{result.id}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Value Metrics & Activity */}
                            <div className="p-5">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-200/50 flex items-center justify-center">
                                  <TrendingUp size={16} className="text-green-600" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900">Value Metrics & Activity</h5>
                                  <p className="text-xs text-gray-500">Customer lifetime value and engagement</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                {result.metadata?.totalSpent !== undefined && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Total Spent</span>
                                    </div>
                                    <p className="text-lg font-bold text-green-600">
                                      TZS {result.metadata.totalSpent.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                )}
                                {result.metadata?.points !== undefined && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Loyalty Points</span>
                                    </div>
                                    <p className="text-lg font-bold text-blue-600">
                                      {result.metadata.points.toLocaleString()}
                                    </p>
                                  </div>
                                )}
                                {result.metadata.totalPurchases !== undefined && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Total Orders</span>
                                    </div>
                                    <p className="text-lg font-bold text-purple-600">
                                      {result.metadata.totalPurchases}
                                    </p>
                                  </div>
                                )}
                                {result.metadata.loyaltyLevel && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Loyalty Level</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 capitalize">
                                      {result.metadata.loyaltyLevel}
                                    </p>
                                  </div>
                                )}
                                {result.metadata.lastVisit && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Last Visit</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {new Date(result.metadata.lastVisit).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                )}
                                {result.metadata.joinedDate && (
                                  <div className="p-3 bg-white/60 rounded-xl border border-gray-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Member Since</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {new Date(result.metadata.joinedDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Tags */}
                              {(result.metadata.colorTag || result.metadata.callLoyaltyLevel || result.metadata.totalCalls) && (
                                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                                  {result.metadata.colorTag && (
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                                      result.metadata.colorTag === 'vip' ? 'bg-purple-100 text-purple-800' :
                                      result.metadata.colorTag === 'complainer' ? 'bg-red-100 text-red-800' :
                                      result.metadata.colorTag === 'purchased' ? 'bg-green-100 text-green-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {result.metadata.colorTag}
                                    </span>
                                  )}
                                  {result.metadata.callLoyaltyLevel && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                      {result.metadata.callLoyaltyLevel}
                                    </span>
                                  )}
                                  {result.metadata.totalCalls !== undefined && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                                      {result.metadata.totalCalls} calls
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons - Comprehensive for all types */}
                      <div className="pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Actions</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {/* View Button - All Types */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigate(result);
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>

                          {/* Edit Button - Customers, Devices (Products use dropdown menu) */}
                          {(result.type === 'customer' || result.type === 'device') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (result.type === 'customer') {
                                  navigate(`/customers/${result.id}/edit`);
                                } else if (result.type === 'device') {
                                  navigate(`/devices/${result.id}/edit`);
                                }
                              }}
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                          )}

                          {/* Delete Button - Customers, Devices (Products use dropdown menu) */}
                          {(result.type === 'customer' || result.type === 'device') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete this ${result.type}?`)) {
                                  // Handle delete - navigate to delete endpoint or show delete modal
                                  console.log('Delete', result.type, result.id);
                                }
                              }}
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}

                          {/* Product-specific actions */}
                          {result.type === 'product' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/lats/unified-inventory?edit=${result.id}`);
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/pos?product=${result.id}`);
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                              >
                                <ShoppingCart className="w-4 h-4" />
                                Add to POS
                              </button>
                            </>
                          )}

                          {/* Customer-specific actions */}
                          {result.type === 'customer' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const smsUrl = `/sms?customer=${result.id}&phone=${result.metadata?.phone || ''}&name=${encodeURIComponent(result.title)}`;
                                  navigate(smsUrl);
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                              >
                                <MessageSquare className="w-4 h-4" />
                                Send SMS
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/lats/loyalty?customer=${result.id}`);
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                              >
                                <Award className="w-4 h-4" />
                                Points
                              </button>
                            </>
                          )}

                          {/* Sale-specific actions */}
                          {result.type === 'sale' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/lats/sales-reports/${result.id}/receipt`, '_blank');
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                              >
                                <Printer className="w-4 h-4" />
                                Print Receipt
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(result.id);
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                              >
                                <Copy className="w-4 h-4" />
                                Copy ID
                              </button>
                            </>
                          )}

                          {/* Device-specific actions */}
                          {result.type === 'device' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/devices/${result.id}`);
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Update Status
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(result.id);
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                              >
                                <Copy className="w-4 h-4" />
                                Copy ID
                              </button>
                            </>
                          )}

                          {/* Share Button - All Types */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (navigator.share) {
                                  navigator.share({
                                    title: result.title,
                                    text: result.description || result.subtitle || '',
                                    url: window.location.origin + result.url,
                                  });
                                } else {
                                  navigator.clipboard.writeText(window.location.origin + result.url);
                                }
                              }}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
                            >
                              <Share2 className="w-4 h-4" />
                              Share
                            </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
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


