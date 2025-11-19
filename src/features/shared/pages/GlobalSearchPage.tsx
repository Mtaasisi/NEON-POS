import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useDevices } from '../../../context/DevicesContext';
import { useCustomers } from '../../../context/CustomersContext';
import SearchHome from '../components/SearchHome';
import SearchResults from '../components/SearchResults';
import EnhancedSearchResults from '../components/EnhancedSearchResults';
import {
  Search,
  X,
  ArrowRight,
  Settings,
  Bookmark,
  History,
  Zap,
} from 'lucide-react';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

interface SearchResult {
  id: string;
  type: 'device' | 'customer' | 'product' | 'sale' | 'payment' | 'loyalty' | 'inventory' | 'report';
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  metadata?: Record<string, any>;
  priority: number;
}

const GlobalSearchPage: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Safely access devices context with error handling for HMR
  let devices: any[] = [];
  try {
    const devicesContext = useDevices();
    devices = devicesContext?.devices || [];
  } catch (error) {
    // Silently handle - context may not be available during HMR
  }
  
  const { customers } = useCustomers();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [useEnhancedSearch, setUseEnhancedSearch] = useState<boolean>(true);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);

  // Get search query from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [location.search]);

  // Load recent searches, saved searches, and search history from localStorage
  useEffect(() => {
    const savedRecent = localStorage.getItem('recentSearches');
    if (savedRecent) {
      try {
        setRecentSearches(JSON.parse(savedRecent));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }

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
  }, []);

  // Save search to recent searches
  const saveSearch = (query: string) => {
    if (!query.trim()) return;

    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Save to search history
  const saveToHistory = (query: string, resultCount: number) => {
    const historyEntry = {
      id: Date.now().toString(),
      query,
      resultCount,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id
    };

    const updated = [historyEntry, ...searchHistory.filter(h => h.query !== query)].slice(0, 50);
    setSearchHistory(updated);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
  };

  // Load saved search
  const loadSavedSearch = (savedSearch: any) => {
    setSearchQuery(savedSearch.query);
    // Could also load filters if they were saved
    navigate(`/search?q=${encodeURIComponent(savedSearch.query)}`);
  };

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    saveSearch(searchQuery);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    navigate('/search');
  };

  // Remove recent search
  const removeRecentSearch = (query: string) => {
    const updated = recentSearches.filter(s => s !== query);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - macOS style */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-150"
            >
              <ArrowRight size={18} className="text-gray-700 rotate-180" />
            </button>
            
            <div className="flex-1 max-w-2xl">
              <form onSubmit={handleSearch} className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search everything..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-32 py-2.5 rounded-lg bg-gray-100 border border-gray-200/50 focus:outline-none focus:bg-white focus:border-blue-400/50 focus:shadow-sm text-gray-800 placeholder-gray-400 transition-all duration-150 text-sm"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setUseEnhancedSearch(!useEnhancedSearch)}
                    className={`p-1 rounded transition-all duration-150 ${
                      useEnhancedSearch ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={useEnhancedSearch ? 'Enhanced Search On' : 'Basic Search Mode'}
                  >
                    <Zap size={14} />
                  </button>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="p-1 rounded hover:bg-gray-200 transition-all duration-150"
                    >
                      <X size={14} className="text-gray-500" />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              {savedSearches.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => {/* Toggle saved searches dropdown */}}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-150"
                    title="Saved Searches"
                  >
                    <Bookmark size={18} className="text-gray-700" />
                  </button>
                </div>
              )}

              <button
                onClick={() => {/* Open search settings */}}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-150"
                title="Search Settings"
              >
                <Settings size={18} className="text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {!searchQuery ? (
          <SearchHome
            recentSearches={recentSearches}
            onSearch={setSearchQuery}
            onRemoveSearch={removeRecentSearch}
            userRole={currentUser.role}
          />
        ) : useEnhancedSearch ? (
          <EnhancedSearchResults
            query={searchQuery}
            onQueryChange={setSearchQuery}
            userRole={currentUser.role}
          />
        ) : (
          <SearchResults
            query={searchQuery}
            filter={activeFilter}
            onFilterChange={setActiveFilter}
            userRole={currentUser.role}
            devices={devices}
            customers={customers}
          />
        )}
      </div>
    </div>
  );
};

export default GlobalSearchPage;
