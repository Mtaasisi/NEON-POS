import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, SortAsc, SortDesc, Download, Save, Bookmark, BarChart3,
  Calendar, DollarSign, Package, Users, Smartphone, FileText, TrendingUp,
  Clock, ArrowRight, ExternalLink, Loader2, AlertCircle, CheckCircle,
  X, ChevronDown, Settings, Share2, Copy, Star, Eye, Edit, Trash2,
  Grid, List, MapPin, Tag, Building, CreditCard, Award, MessageSquare
} from 'lucide-react';
import GlassCard from './ui/GlassCard';
import GlassSelect from './ui/GlassSelect';
import GlassInput from './ui/GlassInput';
import { format } from '../../../lib/currencyUtils';
import { useCustomers } from '../../../context/CustomersContext';
import { useEmployeesData } from '../../../stores/useDataStore';
import { useProductsData } from '../../../stores/useDataStore';
import SearchAnalytics from './SearchAnalytics';

interface SearchResult {
  id: string;
  type: 'device' | 'customer' | 'product' | 'employee' | 'sale' | 'payment' | 'order' | 'report';
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  metadata?: Record<string, any>;
  priority: number;
  category?: string;
  status?: string;
  date?: string;
  amount?: number;
  tags?: string[];
  location?: string;
  score?: number;
}

interface EnhancedSearchResultsProps {
  query: string;
  onQueryChange: (query: string) => void;
  userRole: string;
}

type ViewMode = 'list' | 'grid' | 'compact';
type SortBy = 'relevance' | 'date' | 'name' | 'amount' | 'status';
type SortOrder = 'asc' | 'desc';

const EnhancedSearchResults: React.FC<EnhancedSearchResultsProps> = ({
  query,
  onQueryChange,
  userRole
}) => {
  const navigate = useNavigate();
  const { customers } = useCustomers();
  const employees = useEmployeesData();
  const products = useProductsData();

  // State management
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

  // Advanced filters
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    status: 'all',
    dateRange: 'all',
    amountRange: 'all',
    location: '',
    tags: [] as string[],
    priority: 'all'
  });

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');

  // Analytics
  const [searchStats, setSearchStats] = useState({
    totalResults: 0,
    searchTime: 0,
    topCategories: [] as string[],
    resultDistribution: {} as Record<string, number>
  });

  // Analytics view
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Date range options
  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' }
  ];

  // Amount range options
  const amountRangeOptions = [
    { value: 'all', label: 'Any Amount' },
    { value: '0-100', label: '$0 - $100' },
    { value: '100-500', label: '$100 - $500' },
    { value: '500-1000', label: '$500 - $1,000' },
    { value: '1000-5000', label: '$1,000 - $5,000' },
    { value: '5000+', label: '$5,000+' }
  ];

  // Type options
  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'device', label: 'Devices' },
    { value: 'customer', label: 'Customers' },
    { value: 'product', label: 'Products' },
    { value: 'employee', label: 'Employees' },
    { value: 'sale', label: 'Sales' },
    { value: 'payment', label: 'Payments' },
    { value: 'order', label: 'Orders' },
    { value: 'report', label: 'Reports' }
  ];

  // Perform comprehensive search
  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setFilteredResults([]);
      return;
    }

    const startTime = Date.now();
    setIsSearching(true);

    try {
      const searchResults: SearchResult[] = [];

      // Device search temporarily disabled - data source not available

      // Search customers
      customers.forEach(customer => {
        if (
          customer.name?.toLowerCase().includes(query.toLowerCase()) ||
          customer.phone?.toLowerCase().includes(query.toLowerCase()) ||
          customer.email?.toLowerCase().includes(query.toLowerCase())
        ) {
          searchResults.push({
            id: customer.id,
            type: 'customer',
            title: customer.name || 'Unknown Customer',
            subtitle: customer.phone || 'No Phone',
            description: `Points: ${customer.points || 0} | Spent: ${format.money(customer.totalSpent || 0)}`,
            icon: <Users className="w-4 h-4" />,
            url: `/customers/${customer.id}`,
            metadata: customer,
            priority: 2,
            status: customer.isActive ? 'active' : 'inactive',
            amount: customer.totalSpent,
            tags: [customer.loyaltyLevel, customer.colorTag].filter(Boolean)
          });
        }
      });

      // Search products
      products.forEach(product => {
        if (
          product.name?.toLowerCase().includes(query.toLowerCase()) ||
          product.sku?.toLowerCase().includes(query.toLowerCase()) ||
          product.description?.toLowerCase().includes(query.toLowerCase())
        ) {
          searchResults.push({
            id: product.id,
            type: 'product',
            title: product.name || 'Unknown Product',
            subtitle: `SKU: ${product.sku || 'N/A'}`,
            description: `Stock: ${product.stock_quantity || 0} | Price: ${format.money(product.price || 0)}`,
            icon: <Package className="w-4 h-4" />,
            url: `/products/${product.id}`,
            metadata: product,
            priority: 3,
            amount: product.price,
            tags: product.category ? [product.category] : []
          });
        }
      });

      // Search employees
      employees.forEach(employee => {
        if (
          employee.full_name?.toLowerCase().includes(query.toLowerCase()) ||
          employee.email?.toLowerCase().includes(query.toLowerCase()) ||
          employee.position?.toLowerCase().includes(query.toLowerCase())
        ) {
          searchResults.push({
            id: employee.id,
            type: 'employee',
            title: employee.full_name || 'Unknown Employee',
            subtitle: employee.position || 'No Position',
            description: `Department: ${employee.department || 'N/A'} | Status: ${employee.status}`,
            icon: <Users className="w-4 h-4" />,
            url: `/employees/${employee.id}`,
            metadata: employee,
            priority: 4,
            status: employee.status,
            tags: [employee.department, employee.status].filter(Boolean)
          });
        }
      });

      // Sort by relevance (priority)
      searchResults.sort((a, b) => a.priority - b.priority);

      // Add relevance scores
      const resultsWithScores = searchResults.map(result => ({
        ...result,
        score: calculateRelevanceScore(result, query)
      }));

      setResults(resultsWithScores);
      setFilteredResults(applyFilters(resultsWithScores));

      // Update search stats
      const searchTime = Date.now() - startTime;
      const resultDistribution = resultsWithScores.reduce((acc, result) => {
        acc[result.type] = (acc[result.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topCategories = Object.entries(resultDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([type]) => type);

      setSearchStats({
        totalResults: resultsWithScores.length,
        searchTime,
        topCategories,
        resultDistribution
      });

    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setFilteredResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, devices, customers, products, employees]);

  // Calculate relevance score
  const calculateRelevanceScore = (result: SearchResult, searchQuery: string): number => {
    let score = 0;
    const query = searchQuery.toLowerCase();

    // Title match gets highest score
    if (result.title.toLowerCase().includes(query)) score += 100;

    // Subtitle match
    if (result.subtitle.toLowerCase().includes(query)) score += 50;

    // Description match
    if (result.description.toLowerCase().includes(query)) score += 25;

    // Tag matches
    result.tags?.forEach(tag => {
      if (tag.toLowerCase().includes(query)) score += 10;
    });

    // Priority bonus
    score += (10 - result.priority) * 5;

    return score;
  };

  // Apply filters to results
  const applyFilters = useCallback((results: SearchResult[]): SearchResult[] => {
    return results.filter(result => {
      // Type filter
      if (filters.type !== 'all' && result.type !== filters.type) return false;

      // Status filter
      if (filters.status !== 'all' && result.status !== filters.status) return false;

      // Category filter
      if (filters.category !== 'all' && result.category !== filters.category) return false;

      // Priority filter
      if (filters.priority !== 'all') {
        const priorityNum = parseInt(filters.priority);
        if (result.priority !== priorityNum) return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all' && result.date) {
        const resultDate = new Date(result.date);
        const now = new Date();

        switch (filters.dateRange) {
          case 'today':
            if (resultDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (resultDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            if (resultDate < monthAgo) return false;
            break;
          case 'quarter':
            const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            if (resultDate < quarterAgo) return false;
            break;
          case 'year':
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            if (resultDate < yearAgo) return false;
            break;
        }
      }

      // Amount range filter
      if (filters.amountRange !== 'all' && result.amount !== undefined) {
        const [min, max] = filters.amountRange.includes('-')
          ? filters.amountRange.split('-').map(n => parseFloat(n))
          : filters.amountRange === '5000+'
            ? [5000, Infinity]
            : [0, parseFloat(filters.amountRange.split('-')[1])];

        if (result.amount < min || result.amount > max) return false;
      }

      // Location filter
      if (filters.location && result.location &&
          !result.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag =>
          result.tags?.some(resultTag =>
            resultTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [filters]);

  // Sort results
  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];

    sorted.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'relevance':
          aValue = a.score || 0;
          bValue = b.score || 0;
          break;
        case 'date':
          aValue = a.date ? new Date(a.date).getTime() : 0;
          bValue = b.date ? new Date(b.date).getTime() : 0;
          break;
        case 'name':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return sorted;
  }, [filteredResults, sortBy, sortOrder]);

  // Effect to perform search when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  // Effect to apply filters
  useEffect(() => {
    setFilteredResults(applyFilters(results));
  }, [results, applyFilters]);

  // Load analytics data
  useEffect(() => {
    const savedSearchesData = localStorage.getItem('savedSearches');
    if (savedSearchesData) {
      try {
        setSavedSearches(JSON.parse(savedSearchesData));
      } catch (error) {
        console.error('Error loading saved searches:', error);
      }
    }

    const searchHistoryData = localStorage.getItem('searchHistory');
    if (searchHistoryData) {
      try {
        setSearchHistory(JSON.parse(searchHistoryData));
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }

    const recentSearchesData = localStorage.getItem('recentSearches');
    if (recentSearchesData) {
      try {
        setRecentSearches(JSON.parse(recentSearchesData));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Handle result selection
  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
  };

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    const selectedIds = Array.from(selectedResults);

    switch (action) {
      case 'export':
        exportResults(selectedIds);
        break;
      case 'bookmark':
        bookmarkResults(selectedIds);
        break;
      case 'share':
        shareResults(selectedIds);
        break;
      default:
        console.log('Unknown bulk action:', action);
    }
  };

  // Export results
  const exportResults = (resultIds: string[]) => {
    const dataToExport = sortedResults.filter(result => resultIds.includes(result.id));
    const csvContent = convertToCSV(dataToExport);

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search_results_${query}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Convert results to CSV
  const convertToCSV = (results: SearchResult[]): string => {
    const headers = ['Type', 'Title', 'Subtitle', 'Description', 'Status', 'Amount', 'Date', 'Tags'];
    const rows = results.map(result => [
      result.type,
      result.title,
      result.subtitle,
      result.description,
      result.status || '',
      result.amount ? format.money(result.amount) : '',
      result.date || '',
      result.tags?.join('; ') || ''
    ]);

    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  };

  // Bookmark results
  const bookmarkResults = (resultIds: string[]) => {
    const bookmarkedResults = sortedResults.filter(result => resultIds.includes(result.id));
    const bookmarks = JSON.parse(localStorage.getItem('searchBookmarks') || '[]');

    bookmarkedResults.forEach(result => {
      if (!bookmarks.find((b: any) => b.id === result.id)) {
        bookmarks.push({
          ...result,
          bookmarkedAt: new Date().toISOString(),
          searchQuery: query
        });
      }
    });

    localStorage.setItem('searchBookmarks', JSON.stringify(bookmarks));
    alert(`${bookmarkedResults.length} results bookmarked!`);
  };

  // Share results
  const shareResults = (resultIds: string[]) => {
    const shareText = `Check out these search results for "${query}": ${resultIds.length} items found`;
    navigator.share?.({
      title: 'Search Results',
      text: shareText,
      url: window.location.href
    });
  };

  // Save search
  const saveSearch = () => {
    if (!searchName.trim()) return;

    const savedSearch = {
      id: Date.now().toString(),
      name: searchName,
      query,
      filters: { ...filters },
      sortBy,
      sortOrder,
      createdAt: new Date().toISOString()
    };

    const existing = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    existing.push(savedSearch);
    localStorage.setItem('savedSearches', JSON.stringify(existing));

    setSavedSearches(existing);
    setShowSaveDialog(false);
    setSearchName('');
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'device': return 'bg-blue-100 text-blue-800';
      case 'customer': return 'bg-purple-100 text-purple-800';
      case 'product': return 'bg-green-100 text-green-800';
      case 'employee': return 'bg-orange-100 text-orange-800';
      case 'sale': return 'bg-pink-100 text-pink-800';
      case 'payment': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show analytics if enabled
  if (showAnalytics) {
    return (
      <SearchAnalytics
        searchHistory={searchHistory}
        savedSearches={savedSearches}
        recentSearches={recentSearches}
        currentQuery={query}
        resultCount={searchStats.totalResults}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{searchStats.totalResults}</div>
              <div className="text-sm text-gray-600">Total Results</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{searchStats.searchTime}ms</div>
              <div className="text-sm text-gray-600">Search Time</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <div>
              <div className="text-2xl font-bold">{searchStats.topCategories.length}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <Award className="w-8 h-8 text-orange-500" />
            <div>
              <div className="text-2xl font-bold">{Object.keys(searchStats.resultDistribution).length}</div>
              <div className="text-sm text-gray-600">Types Found</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters and Controls */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <GlassSelect
              value={filters.type}
              onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              options={typeOptions}
              className="min-w-[140px]"
            />

            <GlassSelect
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' },
                { value: 'completed', label: 'Completed' }
              ]}
              className="min-w-[140px]"
            />

            <GlassSelect
              value={filters.dateRange}
              onChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
              options={dateRangeOptions}
              className="min-w-[140px]"
            />

            <GlassInput
              type="text"
              placeholder="Filter by location..."
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="min-w-[160px]"
            />
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            <GlassSelect
              value={`${sortBy}-${sortOrder}`}
              onChange={(value) => {
                const [sort, order] = value.split('-');
                setSortBy(sort as SortBy);
                setSortOrder(order as SortOrder);
              }}
              options={[
                { value: 'relevance-desc', label: 'Most Relevant' },
                { value: 'date-desc', label: 'Newest First' },
                { value: 'date-asc', label: 'Oldest First' },
                { value: 'name-asc', label: 'Name A-Z' },
                { value: 'name-desc', label: 'Name Z-A' },
                { value: 'amount-desc', label: 'Highest Amount' },
                { value: 'amount-asc', label: 'Lowest Amount' }
              ]}
              className="min-w-[160px]"
            />

            <button
              onClick={() => setShowSaveDialog(true)}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              title="Save Search"
            >
              <Save className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`p-2 rounded-lg transition-colors ${
                showAnalytics ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="Search Analytics"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            {selectedResults.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedResults.size} selected</span>
                <button
                  onClick={() => handleBulkAction('export')}
                  className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  title="Export Selected"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleBulkAction('bookmark')}
                  className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                  title="Bookmark Selected"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Search Results */}
      {isSearching ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Searching...</p>
          </div>
        </div>
      ) : sortedResults.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
        </GlassCard>
      ) : (
        <div className={`space-y-4 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : ''}`}>
          {sortedResults.map((result) => (
            <GlassCard
              key={result.id}
              className={`p-4 cursor-pointer hover:shadow-lg transition-all ${
                selectedResults.has(result.id) ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleResultClick(result)}
            >
              <div className="flex items-start space-x-4">
                {viewMode === 'list' && (
                  <div className="flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={selectedResults.has(result.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        const newSelected = new Set(selectedResults);
                        if (e.target.checked) {
                          newSelected.add(result.id);
                        } else {
                          newSelected.delete(result.id);
                        }
                        setSelectedResults(newSelected);
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    {result.icon}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {result.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(result.type)}`}>
                      {result.type}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{result.subtitle}</p>
                  <p className="text-sm text-gray-500 mb-3">{result.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {result.status && (
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(result.status)}`}>
                          {result.status}
                        </span>
                      )}
                      {result.amount && (
                        <span className="text-sm font-medium text-green-600">
                          {format.money(result.amount)}
                        </span>
                      )}
                      {result.date && (
                        <span className="text-xs text-gray-500">
                          {new Date(result.date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      {result.score && (
                        <span className="text-xs text-gray-400">
                          {Math.round(result.score)}%
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {result.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {result.tags.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          +{result.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Save Search</h3>
            <GlassInput
              type="text"
              placeholder="Enter search name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={saveSearch}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearchResults;
