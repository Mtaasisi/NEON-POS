import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Plus, User, Phone, ChevronRight, DollarSign } from 'lucide-react';
import { Customer } from '../../customers/types';
import { fetchAllCustomersSimple } from '../../../lib/customerApi/core';
import { customerCacheService } from '../../../lib/customerCacheService';

interface MobileCustomerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerSelect: (customer: Customer) => void;
  onAddNew?: () => void;
  selectedCustomer?: Customer | null;
}

const MobileCustomerSelectionModal: React.FC<MobileCustomerSelectionModalProps> = ({
  isOpen,
  onClose,
  onCustomerSelect,
  onAddNew,
  selectedCustomer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // Load customers
  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  // Filter customers
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers.slice(0, 50)); // Show first 50
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      
      // Try cache first
      const cachedCustomers = customerCacheService.getCustomers();
      if (cachedCustomers && cachedCustomers.length > 0) {
        setCustomers(cachedCustomers);
        setFilteredCustomers(cachedCustomers.slice(0, 50));
        setLoading(false);
        
        // Refresh cache in background if stale
        const cacheAge = customerCacheService.getCacheAge();
        if (cacheAge > 5 * 60 * 1000) {
          fetchAllCustomersSimple().then(result => {
            if (result && Array.isArray(result)) {
              customerCacheService.saveCustomers(result);
              setCustomers(result);
            }
          }).catch(() => {});
        }
        return;
      }
      
      // Fetch from database
      const result = await fetchAllCustomersSimple();
      if (result && Array.isArray(result)) {
        setCustomers(result);
        setFilteredCustomers(result.slice(0, 50));
        customerCacheService.saveCustomers(result);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    onClose();
  };

  // Helper function to get initials from name
  const getInitials = (name: string): string => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    if (!amount || isNaN(amount) || !isFinite(amount)) {
      return '$0';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function to sanitize amount
  const sanitizeAmount = (rawValue: any): number => {
    if (!rawValue) return 0;
    let amount = typeof rawValue === 'string' 
      ? parseFloat(rawValue.replace(/[^0-9.-]/g, '')) 
      : rawValue;
    if (isNaN(amount) || !isFinite(amount)) return 0;
    if (amount > 1e15) return 0;
    if (amount > 100000000) amount = amount / 100;
    return Math.max(0, amount);
  };

  // Check if customer is active (has purchases)
  const isActiveCustomer = (customer: Customer): boolean => {
    const totalSpent = sanitizeAmount(customer.totalSpent);
    return totalSpent > 0;
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      {/* Modal Sheet */}
      <div
        className="w-full bg-white rounded-t-[20px] max-h-[90vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button
            onClick={onClose}
            className="text-blue-500 text-[17px] font-normal"
          >
            Cancel
          </button>
          <h2 className="text-[17px] font-semibold text-gray-900">
            Select Customer
          </h2>
          <button
            onClick={() => {
              onClose();
              onAddNew?.();
            }}
            className="text-blue-500 text-[17px] font-semibold"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} strokeWidth={2} />
            <input
              type="text"
              placeholder="Search customers"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-[#f2f2f7] border-0 rounded-lg focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-400 text-[15px] font-light"
              style={{ WebkitAppearance: 'none' }}
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <User size={40} className="text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-gray-900 text-[17px] font-semibold mb-2">
                {searchQuery ? 'No customers found' : 'No customers yet'}
              </p>
              <p className="text-[15px] text-gray-500 mb-6 max-w-sm mx-auto text-center">
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'Start building your customer base by adding your first customer'}
              </p>
              {!searchQuery && onAddNew && (
                <button
                  onClick={() => {
                    onClose();
                    onAddNew();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus size={20} strokeWidth={2.5} />
                  Add First Customer
                </button>
              )}
            </div>
          ) : (
            <div className="border-t border-b border-gray-200">
              {filteredCustomers.map((customer, index) => {
                const isSelected = selectedCustomer?.id === customer.id;
                const isLast = index === filteredCustomers.length - 1;
                const hasSpent = isActiveCustomer(customer);
                const totalSpent = sanitizeAmount(customer.totalSpent);
                
                return (
                  <button
                    key={customer.id}
                    onClick={() => handleSelect(customer)}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-[#e5e5ea] ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                    style={{ borderBottomWidth: isLast ? '0' : '0.5px' }}
                  >
                    {/* Avatar with Initials */}
                    <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-[15px] shadow-sm ${
                      isSelected 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-700' 
                        : 'bg-gradient-to-br from-blue-400 to-blue-600'
                    }`}>
                      {getInitials(customer.name)}
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[16px] font-semibold text-gray-900 truncate">
                          {customer.name}
                        </h3>
                        {hasSpent && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[13px] text-gray-500 truncate">
                          {customer.phone || 'No phone'}
                        </span>
                        {hasSpent && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-[13px] font-medium text-gray-700">
                              {formatCurrency(totalSpent)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                          <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    ) : (
                      <ChevronRight size={18} className="text-gray-400 flex-shrink-0" strokeWidth={2} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Walk-in Customer Option */}
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={() => {
              onCustomerSelect(null as any); // Walk-in customer
              onClose();
            }}
            className="w-full py-3 bg-gray-100 text-gray-900 rounded-lg text-[16px] font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors"
          >
            Continue as Walk-in Customer
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default MobileCustomerSelectionModal;

