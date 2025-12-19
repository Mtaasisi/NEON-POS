import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, User, Phone, Mail, X, Plus, Star, RefreshCw, CheckCircle, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassButton from '../../../shared/components/ui/GlassButton';
import { Customer } from '../../../customers/types';
import { searchCustomersFast } from '../../../../lib/customerApi';
import { fetchAllCustomersSimple } from '../../../../lib/customerApi/core';
import AddCustomerModal from '../../../customers/components/forms/AddCustomerModal';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';
import { customerCacheService } from '../../../../lib/customerCacheService';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';
import { useDataStore } from '../../../../stores/useDataStore';

interface CustomerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerSelect: (customer: Customer) => void;
  selectedCustomer?: Customer | null;
}

const CustomerSelectionModal: React.FC<CustomerSelectionModalProps> = ({
  isOpen,
  onClose,
  onCustomerSelect,
  selectedCustomer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  
  // Sound effects hook
  const { playClickSound } = usePOSClickSounds();

  // Load all customers on mount
  useEffect(() => {
    if (isOpen) {
      setHasAttemptedLoad(false); // Reset on open
      loadAllCustomers();
    }
  }, [isOpen]);

  // Also check dataStore for preloaded customers
  const preloadedCustomers = useDataStore((state) => state.customers);
  const isDataStoreCacheValid = useDataStore((state) => state.isCacheValid('customers'));

  // Search customers when query changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchCustomers(searchQuery);
      } else {
        // When search is cleared, show first 24 customers
        setCustomers(recentCustomers.slice(0, 24));
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, recentCustomers]);

  const loadAllCustomers = async (forceRefresh = false) => {
    try {
      setLoading(true);

      // If force refresh, skip cache checks
      if (!forceRefresh) {
        // 🚀 PRIORITY: Check dataStore first (preloaded data)
        if (preloadedCustomers && preloadedCustomers.length > 0 && isDataStoreCacheValid) {
          console.log(`⚡ [CustomerModal] Using preloaded customers from dataStore (${preloadedCustomers.length} customers)`);
          setRecentCustomers(preloadedCustomers);
          setCustomers(preloadedCustomers.slice(0, 24));
          setLoading(false);
          setHasAttemptedLoad(true);
          return;
        }

        // 🚀 SECONDARY: Try localStorage cache (instant load!)
        const cachedCustomers = customerCacheService.getCustomers();
        if (cachedCustomers && cachedCustomers.length > 0) {
          console.log(`⚡ [CustomerModal] Using cached customers (${cachedCustomers.length} customers)`);
          setRecentCustomers(cachedCustomers);
          setCustomers(cachedCustomers.slice(0, 24));
          setLoading(false);
          setHasAttemptedLoad(true);

          // ⚡ OPTIMIZED: Only refresh cache if data is stale (older than 5 minutes)
          const cacheAge = customerCacheService.getCacheAge();
          if (cacheAge > 5 * 60 * 1000) { // 5 minutes in milliseconds
            // Refresh in background without blocking UI or showing errors
            fetchAllCustomersSimple().then(result => {
              if (result && Array.isArray(result)) {
                customerCacheService.saveCustomers(result);
              }
            }).catch(() => {
              // Silently fail - cache is still valid
            });
          }

          return;
        }
      } else {
        // Force refresh: Clear cache first
        console.log('🔄 [CustomerModal] Force refresh: Clearing cache...');
        customerCacheService.clearCustomers();
      }

      console.log('📡 [CustomerModal] Fetching from database...');
      const result = await fetchAllCustomersSimple();
      console.log('📊 fetchAllCustomersSimple result:', {
        type: typeof result,
        isArray: Array.isArray(result),
        hasCustomers: result && result.customers,
        length: Array.isArray(result) ? result.length : (result?.customers?.length || 0)
      });

      if (result && Array.isArray(result)) {
        setRecentCustomers(result);
        setCustomers(result.slice(0, 24)); // Show only first 24 customers
        console.log(`✅ Loaded ${result.length} customers, showing first 24`);

        // 🚀 Save to cache for next time
        customerCacheService.saveCustomers(result);

        // Debug: Check for customers with missing data
        const customersWithNames = result.filter(c => c.name && c.name.trim());
        const customersWithPhones = result.filter(c => c.phone && c.phone.trim());
        console.log(`📊 Data quality: ${customersWithNames.length}/${result.length} have names, ${customersWithPhones.length}/${result.length} have phones`);
        
      } else if (result && result.customers && Array.isArray(result.customers)) {
        setRecentCustomers(result.customers);
        customerCacheService.saveCustomers(result.customers);
        setCustomers(result.customers.slice(0, 24)); // Show only first 24 customers
        console.log(`✅ Loaded ${result.customers.length} customers, showing first 24`);
        
        // Debug: Check for customers with missing data
        const customersWithNames = result.customers.filter(c => c.name && c.name.trim());
        const customersWithPhones = result.customers.filter(c => c.phone && c.phone.trim());
        console.log(`📊 Data quality: ${customersWithNames.length}/${result.customers.length} have names, ${customersWithPhones.length}/${result.customers.length} have phones`);
        
      } else {
        console.warn('⚠️ Unexpected result format from fetchAllCustomersSimple:', result);
        setRecentCustomers([]);
        setCustomers([]);
      }
    } catch (error) {
      console.error('❌ Error loading all customers:', error);
      setError('Failed to load customers. Please try again.');
      
      // Fallback to recent customers if fetch fails
      try {
        console.log('🔄 Trying fallback search...');
        const fallbackResult = await searchCustomersFast('', 1, 100);
        console.log('📊 Fallback result:', {
          type: typeof fallbackResult,
          hasCustomers: fallbackResult && fallbackResult.customers,
          length: fallbackResult?.customers?.length || 0
        });
        
        if (fallbackResult && fallbackResult.customers && Array.isArray(fallbackResult.customers)) {
          setRecentCustomers(fallbackResult.customers);
          setCustomers(fallbackResult.customers.slice(0, 24)); // Show only first 24 customers
          console.log(`✅ Fallback loaded ${fallbackResult.customers.length} customers, showing first 24`);
        } else {
          console.warn('⚠️ Fallback also failed or returned unexpected format');
          setRecentCustomers([]);
          setCustomers([]);
        }
      } catch (fallbackError) {
        console.error('❌ Error loading fallback customers:', fallbackError);
        setRecentCustomers([]);
        setCustomers([]);
      }
    } finally {
      setLoading(false);
      setHasAttemptedLoad(true); // Mark that we've attempted to load
    }
  };

  const handleRefreshCustomers = async () => {
    try {
      await loadAllCustomers(true); // Force refresh from database
      toast.success('Customers refreshed successfully', {
        icon: '✅',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error refreshing customers:', error);
      toast.error('Failed to refresh customers', {
        duration: 3000,
      });
    }
  };

  const searchCustomers = async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Search through more customers for better results
      const result = await searchCustomersFast(query, 1, 200);
      
      if (result && result.customers) {
        setCustomers(result.customers.slice(0, 24)); // Show only first 24 search results
      } else if (result && Array.isArray(result)) {
        setCustomers(result.slice(0, 24)); // Show only first 24 search results
      } else {
        setError('Failed to search customers');
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      setError('Failed to search customers');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    playClickSound(); // Play sound when customer is selected
    onCustomerSelect(customer);
    onClose();
    toast.success(`✓ Customer selected: ${customer.name}`, {
      icon: '👤',
      duration: 2000,
      style: {
        background: '#10b981',
        color: '#fff',
        fontWeight: 'bold',
      },
    });
  };

  const handleCreateNewCustomer = () => {
    setShowCreateCustomer(true);
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    // Add the new customer to the recent customers list
    setRecentCustomers(prev => [newCustomer, ...prev.slice(0, 4)]);
    // Play sound and select the newly created customer
    playClickSound();
    onCustomerSelect(newCustomer);
    // Close the create customer modal
    setShowCreateCustomer(false);
  };

  const getLoyaltyIcon = (loyaltyLevel: string) => {
    switch (loyaltyLevel?.toLowerCase()) {
      case 'vip':
        return <Star className="w-4 h-4 text-purple-500 fill-current" />;
      case 'premium':
        return <Star className="w-4 h-4 text-yellow-500 fill-current" />;
      case 'regular':
        return <Star className="w-4 h-4 text-blue-500 fill-current" />;
      case 'active':
        return <Star className="w-4 h-4 text-green-500 fill-current" />;
      case 'payment_customer':
        return <Star className="w-4 h-4 text-teal-500 fill-current" />;
      case 'engaged':
        return <Star className="w-4 h-4 text-indigo-500 fill-current" />;
      case 'interested':
        return <Star className="w-4 h-4 text-gray-400 fill-current" />;
      default:
        return null;
    }
  };

  const formatMoney = (amount: number) => {
    const realAmount = amount || 0;
    
    // Safety check: Detect unrealistic amounts
    const MAX_REALISTIC_AMOUNT = 1_000_000_000_000; // 1 trillion
    const isCorrupt = Math.abs(realAmount) > MAX_REALISTIC_AMOUNT;
    
    if (isCorrupt) {
      console.warn(`⚠️ CORRUPT DATA in modal - Amount: ${realAmount}`);
    }
    
    // Safety check: Handle NaN and Infinity
    if (!isFinite(realAmount)) {
      console.warn(`⚠️ Invalid amount in modal: ${amount}.`);
      return 'TZS 0 ⚠️ INVALID';
    }
    
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(realAmount);
    
    // Add corruption indicator if amount is unrealistic
    return isCorrupt ? `${formatted} ⚠️` : formatted;
  };

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Additional scroll prevention for html element
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on html element as well
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="customer-modal-title"
      onClick={onClose}
    >
        <div 
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <User className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h3 id="customer-modal-title" className="text-2xl font-bold text-gray-900 mb-2">Select Customer</h3>
              <p className="text-sm text-gray-600">Choose a customer for this sale</p>
            </div>
          </div>
        </div>

        {/* Fixed Search Section */}
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="mb-4">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
                placeholder="Search customers by name, phone, email, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-500">
              {customers.length} of {recentCustomers.length} customers
            </div>
            <button
              onClick={handleRefreshCustomers}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Refresh customers"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
          
        {/* Scrollable Customers List Section */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          {loading && !hasAttemptedLoad && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="sm" color="blue" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4 mt-4">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          {customers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                {customers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onSelect={handleCustomerSelect}
                    isSelected={selectedCustomer?.id === customer.id}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg font-medium">No customers found</p>
              <p className="text-sm text-gray-500 mt-2">
                {searchQuery 
                  ? "Try adjusting your search criteria" 
                  : "No customers available"
                }
              </p>
              {!searchQuery && (
              <button
                onClick={handleCreateNewCustomer}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                  <Plus className="w-4 h-4" />
                  Create Customer
              </button>
          )}
            </div>
          )}
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
              <button
            type="button"
                onClick={handleCreateNewCustomer}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
              >
            <Plus className="w-5 h-5" />
            Add New Customer
              </button>
        </div>
      </div>

      {/* Create Customer Modal */}
      <AddCustomerModal
        isOpen={showCreateCustomer}
        onClose={() => setShowCreateCustomer(false)}
        onCustomerCreated={handleCustomerCreated}
        onAddAnother={() => {
          // Reopen the modal for adding another customer
          setShowCreateCustomer(true);
        }}
      />
    </div>,
    document.body
  );
};

// Customer Card Component
interface CustomerCardProps {
  customer: Customer;
  onSelect: (customer: Customer) => void;
  isSelected?: boolean;
  searchQuery?: string;
}

const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onSelect, isSelected, searchQuery }) => {
  const formatMoney = (amount: number) => {
    const realAmount = amount || 0;

    // Safety check: Detect unrealistic amounts
    const MAX_REALISTIC_AMOUNT = 1_000_000_000_000; // 1 trillion
    const isCorrupt = Math.abs(realAmount) > MAX_REALISTIC_AMOUNT;

    if (isCorrupt) {
      console.warn(`⚠️ Customer ${customer.name} (${customer.id}) has CORRUPT amount: ${realAmount}`);
    }

    // Safety check: Handle NaN and Infinity
    if (!isFinite(realAmount)) {
      console.warn(`⚠️ Customer ${customer.name} has invalid amount: ${amount}.`);
      return 'TZS 0 ⚠️ INVALID';
    }

    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(realAmount);

    // Add corruption indicator
    return isCorrupt ? `${formatted} ⚠️` : formatted;
  };

  return (
    <div
      className="border-2 border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-lg hover:scale-[1.02] hover:border-blue-300 cursor-pointer transition-all duration-300 p-4"
      onClick={() => onSelect(customer)}
    >
      {/* Avatar and Name */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
          {customer.name?.[0]?.toUpperCase() || <User size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">
            {customer.name || 'Unnamed customer'}
          </h3>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-1 mb-3">
        {customer.phone && (
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-phone">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <span className="truncate">{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-mail">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <span className="truncate">{customer.email}</span>
          </div>
        )}
      </div>

      {/* Stats (if available) */}
      {(customer.points !== undefined || customer.totalSpent !== undefined) && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
          <div className="text-center">
            <div className="text-xs text-gray-500">Points</div>
            <div className="font-semibold text-gray-900 text-sm">{customer.points || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Spent</div>
            <div className="font-semibold text-gray-900 text-sm">
              TSh {customer.totalSpent ? customer.totalSpent.toLocaleString() : '0'}
            </div>
          </div>
        </div>
      )}

      {/* Select Button */}
      <button className="w-full mt-3 bg-blue-600 text-white py-2 px-3 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
        Select Customer
      </button>
    </div>
  );
};

export default CustomerSelectionModal;
