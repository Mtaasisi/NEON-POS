import React, { useState, useEffect, useMemo } from 'react';
import { Search, User, Phone, Mail, X, Plus, Star, RefreshCw } from 'lucide-react';
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

  const loadAllCustomers = async () => {
    try {
      setLoading(true);
      
      // 🚀 OPTIMIZED: Try localStorage cache first (instant load!)
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
      
      console.log('📡 [CustomerModal] No cache, fetching from database...');
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
      case 'platinum':
        return <Star className="w-4 h-4 text-purple-500 fill-current" />;
      case 'gold':
        return <Star className="w-4 h-4 text-yellow-500 fill-current" />;
      case 'silver':
        return <Star className="w-4 h-4 text-gray-400 fill-current" />;
      case 'bronze':
        return <Star className="w-4 h-4 text-orange-500 fill-current" />;
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[95vh] overflow-hidden bg-white rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Select Customer
                </h2>
                <p className="text-xs text-gray-500">Search and select a customer for this sale</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadAllCustomers}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                title="Refresh customers"
              >
                <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-shrink-0 p-6 bg-gray-50 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, phone, email, city, or any field..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-400"
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

        {/* Content */}
        <div className="relative flex-1 overflow-y-auto p-6" style={{ minHeight: '500px', maxHeight: 'calc(95vh - 200px)' }}>
          
          {/* Loading overlay */}
          {loading && !hasAttemptedLoad && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              </div>
              <span className="mt-4 text-gray-900 font-bold text-lg">Loading Customers...</span>
              <span className="mt-1 text-gray-600 text-sm">Please wait while we fetch your customer list</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Search Results or All Customers */}
          {customers.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                  {searchQuery ? (
                    <>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Search className="w-5 h-5 text-blue-600" />
                      </div>
                      <span>Search Results</span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                        {customers.length} found
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-green-100 rounded-lg">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                      <span>All Customers</span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                        {customers.length} total
                      </span>
                    </>
                  )}
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-4 pb-4">
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
            </div>
          )}

          {/* No Results */}
          {searchQuery && !loading && customers.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No customers found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                No customers match your search for <span className="font-semibold text-blue-600">"{searchQuery}"</span>
              </p>
              <button
                onClick={handleCreateNewCustomer}
                className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create New Customer
              </button>
            </div>
          )}

          {/* No Customers in Database */}
          {!searchQuery && !loading && customers.length === 0 && hasAttemptedLoad && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No customers yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                You haven't added any customers to your system yet. Create your first customer to get started!
              </p>
              <button
                onClick={handleCreateNewCustomer}
                className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Customer
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedCustomer ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Selected:</span>
                    <span className="ml-2 font-medium text-gray-900">{selectedCustomer.name}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-600">No customer selected</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewCustomer}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Customer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Customer Modal */}
      <AddCustomerModal
        isOpen={showCreateCustomer}
        onClose={() => setShowCreateCustomer(false)}
        onCustomerCreated={handleCustomerCreated}
      />
      </div>
    </>
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

  // Helper function to highlight search terms
  const highlightText = (text: string, query: string) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded font-semibold">
          {part}
        </mark>
      ) : part
    );
  };

  const getLoyaltyIcon = (loyaltyLevel: string) => {
    switch (loyaltyLevel?.toLowerCase()) {
      case 'platinum':
        return <Star className="w-4 h-4 text-purple-500 fill-current" />;
      case 'gold':
        return <Star className="w-4 h-4 text-yellow-500 fill-current" />;
      case 'silver':
        return <Star className="w-4 h-4 text-gray-400 fill-current" />;
      case 'bronze':
        return <Star className="w-4 h-4 text-orange-500 fill-current" />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={() => onSelect(customer)}
      className={`relative bg-white border-2 rounded-lg cursor-pointer transition-all duration-200 transform hover:-translate-y-1 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
          : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
      }`}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
      )}

      {/* Main Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          {/* Simple Avatar */}
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700 font-semibold text-sm group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors duration-200">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          
          {/* Customer Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate text-sm hover:text-blue-600 transition-colors">
              {highlightText(customer.name, searchQuery || '')}
            </h4>
            {customer.phone && (
              <p className="text-xs text-blue-600 font-medium truncate">
                {highlightText(customer.phone, searchQuery || '')}
              </p>
            )}
          </div>

          {/* Loyalty Level */}
          <div className="flex items-center gap-1 transition-transform duration-200 hover:scale-110">
            {getLoyaltyIcon(customer.loyaltyLevel)}
            <span className="text-xs text-gray-500 font-medium">
              {customer.loyaltyLevel || 'bronze'}
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-1 mb-3">
          {customer.email && (
            <div className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors">
              <Mail className="w-3 h-3 text-gray-400" />
              <span className="truncate">
                {highlightText(customer.email, searchQuery || '')}
              </span>
            </div>
          )}
          {customer.city && (
            <div className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors">
              <span className="w-3 h-3 text-gray-400">📍</span>
              <span className="truncate">
                {highlightText(customer.city, searchQuery || '')}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 hover:scale-105 transition-transform">
            <Star className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600 font-medium">
              {customer.points || 0} pts
            </span>
          </div>
          <div className="text-xs font-bold text-gray-900 hover:text-blue-600 transition-colors">
            {formatMoney(customer.totalSpent || 0)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSelectionModal;
