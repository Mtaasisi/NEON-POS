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
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

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

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

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
    <div
      className="fixed animate-fadeIn flex items-start justify-center pt-16"
      onClick={handleBackdropClick}
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div
          className={`
            relative w-full max-w-4xl mx-auto mb-8
            ${isDark ? 'bg-slate-900/95' : 'bg-white/95'}
            backdrop-blur-2xl rounded-2xl
            overflow-hidden
            transition-all duration-300
          `}
          style={{
            maxHeight: 'calc(90vh - 200px)',
            animation: 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'auto',
            margin: '0 1rem',
            boxShadow: isDark 
              ? '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255, 255, 255, 0.1)' 
              : '0 20px 70px rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(0, 0, 0, 0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Search Header - macOS style */}
        <div className={`
          sticky top-0 z-20
          ${isDark ? 'bg-slate-800/90' : 'bg-gradient-to-b from-gray-50/50 to-transparent'}
          backdrop-blur-xl border-b
          ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}
        `}>
          <div className="px-6 py-4">
            <form onSubmit={handleSearch} className="relative group">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <Search 
                  className={`
                    transition-colors duration-200 flex-shrink-0
                    ${searchQuery ? (isDark ? 'text-blue-400' : 'text-blue-500') : (isDark ? 'text-gray-500' : 'text-gray-400')}
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
                  w-full pl-12 pr-32 py-3.5 rounded-xl
                  ${isDark 
                    ? 'bg-transparent text-white placeholder-gray-400' 
                    : 'bg-transparent text-gray-900 placeholder-gray-400'
                  }
                  border-0 focus:outline-none
                  transition-all duration-200
                  text-base
                `}
                style={{
                  fontWeight: 400,
                }}
                autoFocus
              />
              
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`
                    p-1.5 rounded-lg flex items-center gap-1 transition-all duration-150
                    ${showFilters
                      ? 'bg-blue-500 text-white shadow-md'
                      : isDark 
                        ? 'bg-slate-700/50 hover:bg-slate-600 text-gray-300 border border-slate-600/50' 
                        : 'bg-gray-100/80 hover:bg-gray-200/80 text-gray-600 border border-gray-200/50'
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
                      p-1.5 rounded-lg transition-all duration-150
                      ${isDark 
                        ? 'bg-slate-700/50 hover:bg-slate-600 text-gray-300 border border-slate-600/50' 
                        : 'bg-gray-100/80 hover:bg-gray-200/80 text-gray-600 border border-gray-200/50'
                      }
                    `}
                  >
                    <X size={14} />
                  </button>
                )}
                
                <div className={`
                  flex items-center gap-1 px-2 py-1 rounded-md
                    ${isDark 
                    ? 'bg-slate-700/50 border border-slate-600/50' 
                    : 'bg-gray-100/80 border border-gray-200/50'
                    }
                `}>
                  <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>ESC</span>
                </div>
              </div>
            </form>

            {/* Quick Tips - macOS style */}
            <div className={`
              flex items-center gap-3 mt-3 text-xs
              ${isDark ? 'text-gray-500' : 'text-gray-500'}
            `}>
              <div className="flex items-center gap-1.5">
                <kbd className={`px-2 py-1 rounded font-medium shadow-sm ${isDark ? 'bg-slate-700 text-gray-300 border border-slate-600/50' : 'bg-white/80 border border-gray-200/50 text-gray-600'}`}>↑</kbd>
                <kbd className={`px-2 py-1 rounded font-medium shadow-sm ${isDark ? 'bg-slate-700 text-gray-300 border border-slate-600/50' : 'bg-white/80 border border-gray-200/50 text-gray-600'}`}>↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className={`px-2 py-1 rounded font-medium shadow-sm ${isDark ? 'bg-slate-700 text-gray-300 border border-slate-600/50' : 'bg-white/80 border border-gray-200/50 text-gray-600'}`}>↵</kbd>
                <span>Select</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area - macOS style scrollbar */}
        <div 
          className={`
            overflow-y-auto px-6 py-6 custom-scrollbar
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
        
        {/* Add CSS animations and custom scrollbar */}
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
              transform: translateY(-20px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          /* Custom scrollbar for macOS look */
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }

          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
            border-radius: 4px;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: ${isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
          }
        `}</style>
      </div>
      </div>,
    document.body
  );
};

export default GlobalSearchModal;

