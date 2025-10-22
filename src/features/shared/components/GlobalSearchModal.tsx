import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useDevices } from '../../../context/DevicesContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useTheme } from '../../../context/ThemeContext';
import SearchHome from './SearchHome';
import SearchResults from './SearchResults';
import SearchFiltersPanel from './SearchFiltersPanel';
import { Search, X, Command, Filter } from 'lucide-react';
import { createPortal } from 'react-dom';
import { SearchFilters } from '../../../lib/searchService';

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
  const { isDark } = useTheme();
  
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
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>({});

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

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

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

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div
        className="fixed"
        onClick={handleBackdropClick}
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 35,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
        }}
      />
      
      {/* Modal Container */}
      <div
        className="fixed flex items-start justify-center pt-12"
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        <div
          className={`
            relative w-full max-w-4xl mx-auto mb-8
            ${isDark ? 'bg-slate-900/95' : 'bg-white/95'}
            backdrop-blur-2xl rounded-2xl shadow-2xl
            ${isDark ? 'border border-slate-700/50' : 'border border-white/50'}
            overflow-hidden
            transition-all duration-300
          `}
          style={{
            maxHeight: 'calc(90vh - 200px)',
            animation: 'slideDown 0.3s ease-out',
            pointerEvents: 'auto',
            margin: '0 1rem',
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Search Header */}
        <div className={`
          sticky top-0 z-20
          ${isDark ? 'bg-slate-800/90' : 'bg-white/90'}
          backdrop-blur-xl border-b
          ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}
          shadow-sm
        `}>
          <div className="px-6 py-4">
            <form onSubmit={handleSearch} className="relative group">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <Search 
                  className={`
                    transition-colors duration-200
                    ${searchQuery ? (isDark ? 'text-blue-400' : 'text-blue-500') : (isDark ? 'text-gray-500' : 'text-gray-400')}
                    group-focus-within:${isDark ? 'text-blue-400' : 'text-blue-500'}
                  `} 
                  size={20} 
                />
              </div>
              
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`
                  w-full pl-12 pr-24 py-3.5 rounded-xl
                  ${isDark 
                    ? 'bg-slate-700/50 border-slate-600/50 text-white placeholder-gray-400' 
                    : 'bg-gray-50/50 border-gray-300/50 text-gray-900 placeholder-gray-500'
                  }
                  border focus:outline-none
                  focus:${isDark ? 'border-blue-500 bg-slate-700' : 'border-blue-400 bg-white'}
                  focus:ring-2 focus:ring-blue-500/20
                  transition-all duration-200
                  text-base
                `}
                autoFocus
              />
              
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`
                    p-1.5 rounded-lg flex items-center gap-1 transition-all duration-200
                    ${showFilters
                      ? 'bg-blue-500 text-white shadow-lg'
                      : isDark 
                        ? 'bg-slate-600/50 hover:bg-slate-600 text-gray-300' 
                        : 'bg-gray-200/50 hover:bg-gray-300 text-gray-600'
                    }
                  `}
                  title="Advanced Filters"
                >
                  <Filter size={14} />
                  {Object.keys(advancedFilters).filter(k => advancedFilters[k as keyof SearchFilters]).length > 0 && (
                    <span className="text-xs font-bold">
                      {Object.keys(advancedFilters).filter(k => advancedFilters[k as keyof SearchFilters]).length}
                    </span>
                  )}
                </button>

                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className={`
                      p-1.5 rounded-lg
                      ${isDark 
                        ? 'bg-slate-600/50 hover:bg-slate-600 text-gray-300' 
                        : 'bg-gray-200/50 hover:bg-gray-300 text-gray-600'
                      }
                      transition-all duration-200
                    `}
                  >
                    <X size={14} />
                  </button>
                )}
                
                <button
                  onClick={handleClose}
                  className={`
                    p-1.5 rounded-lg
                    ${isDark 
                      ? 'bg-slate-600/50 hover:bg-slate-600 text-gray-300' 
                      : 'bg-gray-200/50 hover:bg-gray-300 text-gray-600'
                    }
                    transition-all duration-200
                  `}
                  type="button"
                >
                  <kbd className="text-xs font-mono">ESC</kbd>
                </button>
              </div>
            </form>

            {/* Quick Tips - Minimal */}
            <div className={`
              flex items-center gap-3 mt-3 text-xs
              ${isDark ? 'text-gray-500' : 'text-gray-400'}
            `}>
              <kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-200/50 text-gray-700'}`}>↑↓</kbd>
              <kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-200/50 text-gray-700'}`}>Enter</kbd>
              <kbd className={`px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-200/50 text-gray-700'}`}>ESC</kbd>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div 
          className={`
            overflow-y-auto px-6 py-6
            ${isDark ? 'bg-slate-900/50' : 'bg-gray-50/30'}
          `}
          style={{ 
            maxHeight: 'calc(100vh - 300px)',
            minHeight: '400px',
          }}
        >
          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-6">
              <SearchFiltersPanel
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                onApply={(filters) => {
                  setAdvancedFilters(filters);
                  // Convert filters to query string format
                  const filterQuery = Object.entries(filters)
                    .filter(([_, value]) => value)
                    .map(([key, value]) => `${key}:${value}`)
                    .join(' ');
                  if (filterQuery) {
                    setSearchQuery(prev => `${prev} ${filterQuery}`.trim());
                  }
                }}
                currentFilters={advancedFilters}
              />
            </div>
          )}

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
        
        {/* Add CSS animations */}
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </div>
      </div>
    </>,
    document.body
  );
};

export default GlobalSearchModal;

