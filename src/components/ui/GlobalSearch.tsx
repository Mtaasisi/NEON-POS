/**
 * Global Search Component
 * Searchable command palette for quick navigation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, ArrowRight, TrendingUp, Package, Users, FileText, Settings, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../../utils/modalManager';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: 'product' | 'customer' | 'order' | 'page' | 'action';
  icon: React.ReactNode;
  action: () => void;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { handleBackdropClick } = useModal(isOpen, onClose);

  // Quick actions
  const quickActions: SearchResult[] = [
    {
      id: 'new-sale',
      title: 'New Sale',
      subtitle: 'Ctrl+N',
      category: 'action',
      icon: <TrendingUp className="w-5 h-5" />,
      action: () => {
        navigate('/pos');
        onClose();
      },
    },
    {
      id: 'products',
      title: 'Products',
      category: 'page',
      icon: <Package className="w-5 h-5" />,
      action: () => {
        navigate('/products');
        onClose();
      },
    },
    {
      id: 'customers',
      title: 'Customers',
      category: 'page',
      icon: <Users className="w-5 h-5" />,
      action: () => {
        navigate('/customers');
        onClose();
      },
    },
    {
      id: 'orders',
      title: 'Orders',
      category: 'page',
      icon: <FileText className="w-5 h-5" />,
      action: () => {
        navigate('/orders');
        onClose();
      },
    },
    {
      id: 'settings',
      title: 'Settings',
      category: 'page',
      icon: <Settings className="w-5 h-5" />,
      action: () => {
        navigate('/settings');
        onClose();
      },
    },
  ];

  // Search logic
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(quickActions);
      return;
    }

    const filtered = quickActions.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setResults(filtered);
    setSelectedIndex(0);
  }, []);

  // Handle search input
  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            results[selectedIndex].action();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults(quickActions);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate dynamic positioning based on sidebar
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const sidebarWidth = isMobile ? 0 : 288; // Default sidebar width
  const topBarHeight = 80;

  return (
    <>
      {/* Backdrop with macOS-style blur */}
    <div
        className="fixed z-[99999] flex items-start justify-center animate-fadeIn"
      style={{
        left: `${sidebarWidth}px`,
        top: `${topBarHeight}px`,
        width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
        height: `calc(100vh - ${topBarHeight}px)`,
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
      }}
      onClick={handleBackdropClick}
    >
        {/* Search Container with macOS styling */}
      <div
          className="w-full max-w-2xl mt-16 mx-4 animate-slideDown"
        onClick={(e) => e.stopPropagation()}
          style={{
            animation: 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            className="bg-white/95 backdrop-blur-2xl rounded-2xl overflow-hidden"
            style={{
              boxShadow: '0 20px 70px rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(0, 0, 0, 0.1)',
            }}
      >
            {/* Search Input - macOS style */}
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-b from-gray-50/50 to-transparent border-b border-gray-200/50">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search products, customers, pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
                className="flex-1 outline-none text-base bg-transparent placeholder-gray-400 text-gray-900"
            autoFocus
                style={{
                  fontWeight: 400,
                }}
          />
              {query && (
          <button
                  onClick={() => setQuery('')}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100/80"
          >
                  <X className="w-4 h-4" />
          </button>
              )}
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100/80 border border-gray-200/50">
                <span className="text-xs text-gray-500 font-medium">ESC</span>
        </div>
            </div>

            {/* Results with macOS styling */}
            <div className="max-h-[480px] overflow-y-auto">
          {results.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">No results found</p>
                  <p className="text-gray-400 text-xs mt-1">Try searching for something else</p>
            </div>
          ) : (
                <div className="py-2 px-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={result.action}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                        index === selectedIndex 
                          ? 'bg-blue-500 shadow-md' 
                          : 'hover:bg-gray-50/50'
                  }`}
                >
                      <div className={`flex-shrink-0 transition-colors ${
                        index === selectedIndex ? 'text-white' : 'text-gray-500 group-hover:text-gray-600'
                      }`}>
                    {result.icon}
                  </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={`font-medium text-sm truncate ${
                          index === selectedIndex ? 'text-white' : 'text-gray-900'
                        }`}>
                          {result.title}
                        </p>
                    {result.subtitle && (
                          <p className={`text-xs truncate mt-0.5 ${
                            index === selectedIndex ? 'text-white/90' : 'text-gray-500'
                          }`}>
                            {result.subtitle}
                          </p>
                    )}
                  </div>
                      <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-all ${
                        index === selectedIndex 
                          ? 'text-white' 
                          : 'text-gray-300 group-hover:text-gray-400'
                      }`} />
                </button>
              ))}
            </div>
          )}
        </div>

            {/* Footer - macOS style */}
            <div className="px-5 py-3 bg-gray-50/50 backdrop-blur-sm border-t border-gray-200/50 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-2 py-1 rounded bg-white/80 border border-gray-200/50 text-gray-600 font-medium shadow-sm">↑</kbd>
                  <kbd className="px-2 py-1 rounded bg-white/80 border border-gray-200/50 text-gray-600 font-medium shadow-sm">↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-2 py-1 rounded bg-white/80 border border-gray-200/50 text-gray-600 font-medium shadow-sm">↵</kbd>
                  <span>Select</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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
            transform: translateY(-20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Custom scrollbar for macOS look */
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </>
  );
};

/**
 * Hook to use global search
 */
export const useGlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
};

