import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useDevices } from '../../../context/DevicesContext';
import { useCustomers } from '../../../context/CustomersContext';
import SearchHome from '../components/SearchHome';
import SearchResults from '../components/SearchResults';
import {
  Search,
  X,
  ArrowRight,
} from 'lucide-react';

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

  // Get search query from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [location.search]);

  // Load recent searches from localStorage
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white/50 to-purple-50/30">
      {/* Header */}
      <div className="bg-white/40 backdrop-blur-2xl border-b border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-3 rounded-xl bg-white/50 hover:bg-white/70 transition-all duration-300 backdrop-blur-xl border border-white/30 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] hover:shadow-[0_8px_24px_0_rgba(31,38,135,0.15)]"
            >
              <ArrowRight size={20} className="text-gray-700 rotate-180" />
            </button>
            
            <div className="flex-1 max-w-2xl">
              <form onSubmit={handleSearch} className="relative group">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-14 py-4 rounded-2xl bg-white/60 border border-white/30 focus:outline-none focus:bg-white/80 focus:border-blue-400/50 focus:shadow-[0_8px_32px_0_rgba(59,130,246,0.15)] backdrop-blur-xl text-gray-800 placeholder-gray-400 transition-all duration-300"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-5 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full bg-gray-100/80 hover:bg-gray-200/80 backdrop-blur-sm transition-all duration-200"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!searchQuery ? (
          <SearchHome 
            recentSearches={recentSearches}
            onSearch={setSearchQuery}
            onRemoveSearch={removeRecentSearch}
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
