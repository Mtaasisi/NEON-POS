import React, { useState, useEffect } from 'react';
import { X, Search, Package, Users, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useBranch } from '../../../context/BranchContext';

interface SearchResult {
  id: string;
  type: 'product' | 'customer' | 'sale';
  title: string;
  subtitle: string;
  path: string;
}

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileSearchModal: React.FC<MobileSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search function
  useEffect(() => {
    const searchData = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const query = searchQuery.toLowerCase();
        const allResults: SearchResult[] = [];

        // Search products
        let productsQuery = supabase
          .from('lats_products')
          .select('id, name, sku')
          .eq('is_active', true)
          .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
          .limit(5);

        if (currentBranch) {
          productsQuery = productsQuery.eq('branch_id', currentBranch.id);
        }

        const { data: products } = await productsQuery;

        if (products) {
          products.forEach(p => {
            allResults.push({
              id: p.id,
              type: 'product',
              title: p.name,
              subtitle: `SKU: ${p.sku}`,
              path: `/mobile/inventory/${p.id}`
            });
          });
        }

        // Search customers
        let customersQuery = supabase
          .from('lats_customers')
          .select('id, name, phone')
          .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(5);

        if (currentBranch) {
          customersQuery = customersQuery.eq('branch_id', currentBranch.id);
        }

        const { data: customers } = await customersQuery;

        if (customers) {
          customers.forEach(c => {
            allResults.push({
              id: c.id,
              type: 'customer',
              title: c.name,
              subtitle: c.phone,
              path: `/mobile/clients/${c.id}`
            });
          });
        }

        setResults(allResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchData, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, currentBranch]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path);
    onClose();
    setSearchQuery('');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'product': return Package;
      case 'customer': return Users;
      case 'sale': return ShoppingCart;
      default: return Package;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div 
        className="bg-white w-full h-[90vh] rounded-t-3xl flex flex-col animate-slide-up shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-neutral-300 rounded-full" />
        </div>

        {/* Header with Search Input */}
        <div className="bg-white px-4 py-3 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Search products, customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-[16px]"
              />
            </div>
            <button
              onClick={onClose}
              className="text-primary-500 text-[17px] active:text-primary-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto pb-safe-bottom">
          {isSearching && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          )}

          {!isSearching && searchQuery.length > 0 && results.length === 0 && (
            <div className="text-center py-12 px-4">
              <Search size={48} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-500 text-[16px]">No results found</p>
              <p className="text-neutral-400 text-[14px] mt-1">Try a different search term</p>
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => {
                const Icon = getIcon(result.type);
                const isLast = index === results.length - 1;
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 active:bg-neutral-100 transition-colors ${
                      !isLast ? 'border-b border-neutral-100' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon size={20} className="text-primary-500" strokeWidth={2} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-[16px] font-medium text-neutral-900 truncate">{result.title}</div>
                      <div className="text-[14px] text-neutral-500 truncate">{result.subtitle}</div>
                    </div>
                    <div className="px-2 py-1 bg-neutral-100 rounded-md text-[11px] text-neutral-600 font-medium uppercase">
                      {result.type}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!searchQuery && (
            <div className="text-center py-12 px-4">
              <Search size={48} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-500 text-[16px]">Start typing to search</p>
              <p className="text-neutral-400 text-[14px] mt-1">Find products and customers quickly</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileSearchModal;
