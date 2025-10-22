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
    <div
      className="fixed z-[99999] flex items-start justify-center"
      style={{
        left: `${sidebarWidth}px`,
        top: `${topBarHeight}px`,
        width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
        height: `calc(100vh - ${topBarHeight}px)`,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden mt-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products, customers, pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 outline-none text-lg"
            autoFocus
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No results found</p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={result.action}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-shrink-0 text-gray-600">
                    {result.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-sm text-gray-500">{result.subtitle}</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <span>Navigate with ↑↓ arrows</span>
          <span>Enter to select • ESC to close</span>
        </div>
      </div>
    </div>
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

