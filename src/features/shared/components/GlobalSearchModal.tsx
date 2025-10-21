import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useDevices } from '../../../context/DevicesContext';
import { useCustomers } from '../../../context/CustomersContext';
import SearchHome from './SearchHome';
import SearchResults from './SearchResults';
import { Search, X } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
}) => {
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
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

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

  // Reset search query when initial query changes
  useEffect(() => {
    if (isOpen && initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

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
  };

  // Remove recent search
  const removeRecentSearch = (query: string) => {
    const updated = recentSearches.filter(s => s !== query);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Handle modal close
  const handleClose = () => {
    setSearchQuery('');
    setActiveFilter('all');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="full"
      maxHeight="95vh"
    >
      <div className="min-h-[80vh] bg-gradient-to-br from-blue-50 via-white to-purple-50 -m-8 rounded-xl">
        {/* Search Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-sm sticky top-0 z-10 rounded-t-xl">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search devices, customers, products, sales..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 rounded-lg bg-white/70 border border-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 backdrop-blur-sm font-medium text-gray-800 placeholder-gray-500 shadow-sm"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X size={16} className="text-gray-400" />
                    </button>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8 overflow-y-auto max-h-[calc(95vh-180px)]">
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
    </Modal>
  );
};

export default GlobalSearchModal;

