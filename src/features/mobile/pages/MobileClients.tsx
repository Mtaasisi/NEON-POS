import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ArrowUp, SlidersHorizontal, ChevronRight, DollarSign, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import MobileAddCustomerModal from '../components/MobileAddCustomerModal';
import { useMobileBranch, applyBranchFilter } from '../hooks/useMobileBranch';
import { useDataStore } from '../../../stores/useDataStore';
import { dataPreloadService } from '../../../services/dataPreloadService';
import { useResponsiveSizes, useScreenInfo } from '../../../hooks/useResponsiveSize';
import { ResponsiveMobileWrapper } from '../components/ResponsiveMobileWrapper';

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  lastPurchase?: string;
  avatar?: string;
}

type SortOption = 'name' | 'purchases' | 'recent';

interface ClientStats {
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  avgPurchase: number;
}

const MobileClients: React.FC = () => {
  const navigate = useNavigate();
  const { currentBranch, loading: branchLoading, isDataShared } = useMobileBranch();
  
  // Use cached data from global store
  const cachedCustomers = useDataStore((state) => state.customers);
  const isCacheValid = useDataStore((state) => state.isCacheValid('customers'));
  const isPreloading = useDataStore((state) => state.isPreloading);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [stats, setStats] = useState<ClientStats>({
    totalClients: 0,
    activeClients: 0,
    totalRevenue: 0,
    avgPurchase: 0
  });
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to transform customer data
  const transformCustomerData = (customer: any): Client => {
    // Handle total purchases with robust sanitization
    let rawValue = customer.total_spent || customer.total_purchases || 0;
    let totalPurchases = 0;
    
    // Convert to number if it's a string
    if (typeof rawValue === 'string') {
      rawValue = parseFloat(rawValue.replace(/[^0-9.-]/g, ''));
    }
    
    // Ensure it's a valid number
    if (isNaN(rawValue) || !isFinite(rawValue)) {
      totalPurchases = 0;
    } else if (rawValue > 1e15) {
      totalPurchases = 0;
    } else if (rawValue > 100000000) {
      totalPurchases = rawValue / 100;
    } else {
      totalPurchases = rawValue;
    }
    
    // Ensure positive number
    totalPurchases = Math.max(0, totalPurchases);
    
    return {
      id: customer.id,
      name: customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed Customer',
      phone: customer.phone || customer.mobile || customer.whatsapp || 'No phone',
      email: customer.email,
      address: customer.address || customer.location_description || customer.city,
      totalPurchases: totalPurchases,
      lastPurchase: customer.last_purchase_date ? 
        new Date(customer.last_purchase_date).toLocaleDateString() : undefined,
      avatar: undefined // Will use initials
    };
  };

  // Helper function to calculate statistics
  const calculateStats = (clientsList: Client[]): ClientStats => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeClients = clientsList.filter(client => {
      if (!client.lastPurchase) return false;
      try {
        const lastPurchaseDate = new Date(client.lastPurchase);
        return lastPurchaseDate >= thirtyDaysAgo;
      } catch (e) {
        return false;
      }
    }).length;

    // Calculate total revenue with validation
    let totalRevenue = 0;
    clientsList.forEach(client => {
      const purchases = client.totalPurchases || 0;
      
      // Only add if it's a valid, finite number
      if (isFinite(purchases) && !isNaN(purchases) && purchases >= 0) {
        totalRevenue += purchases;
      } else {
        console.warn(`⚠️ Skipping invalid purchase value for ${client.name}:`, purchases);
      }
    });
    
    // Final safeguard: If total revenue is unrealistically large, cap it or log error
    if (totalRevenue > 1e15) {
      console.error('❌ Total revenue calculation resulted in unrealistic value:', totalRevenue);
      console.log('📊 Client purchase values:', clientsList.map(c => ({ name: c.name, purchases: c.totalPurchases })));
      totalRevenue = 0; // Reset to 0 if data is corrupted
    }
    
    const avgPurchase = clientsList.length > 0 ? totalRevenue / clientsList.length : 0;

    return {
      totalClients: clientsList.length,
      activeClients,
      totalRevenue: isFinite(totalRevenue) ? totalRevenue : 0,
      avgPurchase: isFinite(avgPurchase) ? avgPurchase : 0
    };
  };

  // Fetch real customers from database with branch filtering
  const fetchClients = async (showToast = true, forceRefresh = false) => {
    // Wait for branch to load
    if (branchLoading) return;

    try {
      console.log('🔍 [MobileClients] Loading customers for branch:', currentBranch?.name);
      
      // Check if we can use cached data first
      if (!forceRefresh && isCacheValid && cachedCustomers.length > 0) {
        console.log(`📦 [MobileClients] Using cached data (${cachedCustomers.length} customers)`);
        
        // Apply branch filter to cached data if needed
        let filteredData = cachedCustomers;
        if (currentBranch) {
          // Filter cached data by branch
          filteredData = cachedCustomers.filter((customer: any) => {
            if (!customer.branch_id) return true; // Include if no branch specified
            return customer.branch_id === currentBranch.id;
          });
          console.log(`🏪 [MobileClients] Filtered to ${filteredData.length} customers for branch`);
        }
        
        // Transform and set data
        const transformedClients = filteredData.map(transformCustomerData);
        setClients(transformedClients);
        const calculatedStats = calculateStats(transformedClients);
        setStats(calculatedStats);
        
        if (showToast) {
          toast.success(`Loaded ${transformedClients.length} customers from cache`);
        }
        return;
      }
      
      console.log('🔄 [MobileClients] Fetching fresh data from database');
      
      // Start with base query
      let query = supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      // Apply branch filter if branch is selected
      if (currentBranch) {
        const customersShared = isDataShared('customers');
        console.log('🏪 [MobileClients] Branch filter:', {
          branchId: currentBranch.id,
          mode: currentBranch.data_isolation_mode,
          isShared: customersShared
        });

        query = applyBranchFilter(
          query,
          currentBranch.id,
          currentBranch.data_isolation_mode,
          customersShared
        );
      }

      let { data, error } = await query;

      console.log('📊 Customers query result:', { 
        recordCount: data?.length || 0, 
        hasError: !!error,
        error: error?.message 
      });
      
      // Log raw database values for debugging
      if (data && data.length > 0) {
        console.log('🔍 Raw database values (first 3 customers):', data.slice(0, 3).map((c: any) => ({
          name: c.name,
          total_spent: c.total_spent,
          total_purchases: c.total_purchases,
          type_spent: typeof c.total_spent,
          type_purchases: typeof c.total_purchases
        })));
      }

      // If no data in customers table, try lats_customers with branch filter
      if (!data || data.length === 0) {
        console.log('🔄 Trying lats_customers table...');
        let latsQuery = supabase
          .from('lats_customers')
          .select('*')
          .order('name', { ascending: true });

        // Apply branch filter to lats_customers too
        if (currentBranch) {
          const customersShared = isDataShared('customers');
          latsQuery = applyBranchFilter(
            latsQuery,
            currentBranch.id,
            currentBranch.data_isolation_mode,
            customersShared
          );
        }

        const latsResult = await latsQuery;
        
        console.log('📊 Lats_customers query result:', { 
          recordCount: latsResult.data?.length || 0, 
          hasError: !!latsResult.error,
          error: latsResult.error?.message 
        });

        if (latsResult.data && latsResult.data.length > 0) {
          data = latsResult.data;
          error = latsResult.error;
        }
      }

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No customers found in database');
        if (showToast) {
          toast('No customers found. Add your first customer to get started!');
        }
        setClients([]);
        setStats({
          totalClients: 0,
          activeClients: 0,
          totalRevenue: 0,
          avgPurchase: 0
        });
        return;
      }

      // Transform database data to match Client interface
      const transformedClients: Client[] = data.map(transformCustomerData);
      
      // Update global data store cache with fresh data
      const dataStore = useDataStore.getState();
      dataStore.setCustomers(data);
      console.log('💾 Updated global customer cache with fresh data');

      console.log('✅ Successfully loaded customers:', transformedClients.length);
      
      // Log purchase values for debugging
      console.log('💰 Customer purchase values:', transformedClients.map(c => ({
        name: c.name,
        totalPurchases: c.totalPurchases,
        type: typeof c.totalPurchases,
        isFinite: isFinite(c.totalPurchases)
      })));
      
      setClients(transformedClients);
      
      // Calculate and set statistics
      const calculatedStats = calculateStats(transformedClients);
      console.log('📊 Calculated Stats:', calculatedStats);
      setStats(calculatedStats);

      if (showToast) {
        toast.success(`Loaded ${transformedClients.length} customers`);
      }
    } catch (error: any) {
      console.error('❌ Error fetching customers:', error);
      toast.error(`Failed to load customers: ${error.message}`);
      setClients([]);
      setStats({
        totalClients: 0,
        activeClients: 0,
        totalRevenue: 0,
        avgPurchase: 0
      });
    }
  };

  // Initial fetch and reload on branch change
  useEffect(() => {
    const loadClients = async () => {
      setIsLoading(true);
      await fetchClients();
      setIsLoading(false);
    };

    loadClients();

    // Listen for branch changes
    const handleBranchChange = () => {
      console.log('🔄 [MobileClients] Branch changed, reloading customers...');
      loadClients();
    };

    window.addEventListener('branchChanged', handleBranchChange);
    return () => {
      window.removeEventListener('branchChanged', handleBranchChange);
    };
  }, [currentBranch, branchLoading]);

  // Real-time subscription for updates
  useEffect(() => {
    console.log('📡 Setting up real-time subscription for customers...');
    
    const subscription = supabase
      .channel('customers-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'customers' }, 
        (payload: any) => {
          console.log('🔔 Customer change detected:', payload);
          fetchClients(false); // Refresh without toast
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time subscription');
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY > 0 && scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY;
      if (distance > 0 && distance < 120) {
        setPullDistance(distance);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80) {
      setIsRefreshing(true);
      
      // Force refresh from database and update cache
      await fetchClients(false, true);
      
      // Also refresh the global cache
      try {
        await dataPreloadService.refreshData('customers');
      } catch (error) {
        console.error('❌ Error refreshing customer cache:', error);
      }
      
      toast.success('Refreshed!');
      setIsRefreshing(false);
    }
    setPullStartY(0);
    setPullDistance(0);
  };

  // Helper function to get initials
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    // Validate input
    if (!amount || isNaN(amount) || !isFinite(amount)) {
      return '$0';
    }
    
    // If amount is too large, return formatted compact version
    if (amount > 1e12) {
      return '$' + formatCompactNumber(amount);
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function to format large numbers with K, M, B suffixes
  const formatCompactNumber = (num: number): string => {
    if (num === 0 || num === null || num === undefined) return '0';
    if (isNaN(num) || !isFinite(num)) return '0';
    
    // If number is in scientific notation or unrealistically large, return 0
    if (num > 1e15 || num < -1e15) {
      console.error('⚠️ Number too large for display:', num);
      return '0';
    }
    
    const absNum = Math.abs(num);
    
    if (absNum >= 1000000000) {
      return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (absNum >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (absNum >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toFixed(0);
  };

  // Sort and filter clients
  const sortedAndFilteredClients = clients
    .filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortOption) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'purchases':
          comparison = (a.totalPurchases || 0) - (b.totalPurchases || 0);
          break;
        case 'recent':
          const dateA = a.lastPurchase ? new Date(a.lastPurchase).getTime() : 0;
          const dateB = b.lastPurchase ? new Date(b.lastPurchase).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const cycleSortOption = () => {
    const options: SortOption[] = ['name', 'purchases', 'recent'];
    const currentIndex = options.indexOf(sortOption);
    const nextIndex = (currentIndex + 1) % options.length;
    setSortOption(options[nextIndex]);
  };

  const getSortLabel = (): string => {
    switch (sortOption) {
      case 'name':
        return 'Sorted alphabetically';
      case 'purchases':
        return 'Sorted by purchases';
      case 'recent':
        return 'Sorted by recent activity';
      default:
        return 'Sorted';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with Title and Add Button */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[32px] font-bold text-black tracking-tight">Clients</h1>
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="flex items-center justify-center text-blue-500 hover:text-blue-600 active:text-blue-700 transition-colors flex-shrink-0 p-1"
            aria-label="Add client"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>

        {/* Statistics Cards */}
        {!isLoading && clients.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={14} className="text-blue-600" strokeWidth={2.5} />
                <span className="text-[11px] font-medium text-blue-700">Total</span>
              </div>
              <div className="text-[20px] font-bold text-blue-900">{stats.totalClients}</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 border border-green-200">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={14} className="text-green-600" strokeWidth={2.5} />
                <span className="text-[11px] font-medium text-green-700">Active</span>
              </div>
              <div className="text-[20px] font-bold text-green-900">{stats.activeClients}</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-200">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign size={14} className="text-purple-600" strokeWidth={2.5} />
                <span className="text-[11px] font-medium text-purple-700">Revenue</span>
              </div>
              <div className="text-[20px] font-bold text-purple-900">
                ${formatCompactNumber(stats.totalRevenue)}
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} strokeWidth={2} />
          <input
            type="text"
            placeholder="Search by name, phone, or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f2f2f7] border-0 rounded-lg focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-400 text-[15px] font-light"
            style={{ WebkitAppearance: 'none' }}
          />
        </div>

        {/* Sort Section */}
        <div className="flex items-center justify-between py-2.5 px-0.5">
          <button
            onClick={cycleSortOption}
            className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          >
            <SlidersHorizontal size={16} className="text-blue-500" strokeWidth={2.5} />
            <span className="text-gray-900 font-normal text-[15px]">{getSortLabel()}</span>
          </button>
          <button
            onClick={toggleSortOrder}
            className="p-0.5 hover:opacity-70 transition-opacity"
            aria-label="Toggle sort order"
          >
            <ArrowUp 
              size={16} 
              strokeWidth={2.5}
              className={`text-blue-500 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Results Count */}
        {!isLoading && searchQuery && (
          <div className="py-1 px-0.5">
            <span className="text-[13px] text-gray-500">
              {sortedAndFilteredClients.length} of {clients.length} clients
            </span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-gray-500 text-[15px]">Loading clients...</p>
          </div>
        </div>
      )}

      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && !isLoading && (
        <div 
          className="flex items-center justify-center py-2 transition-all"
          style={{ 
            transform: `translateY(${Math.min(pullDistance, 80)}px)`,
            opacity: Math.min(pullDistance / 80, 1)
          }}
        >
          <RefreshCw 
            size={20} 
            className={`text-blue-500 ${isRefreshing || pullDistance > 80 ? 'animate-spin' : ''}`}
            strokeWidth={2.5}
          />
          <span className="ml-2 text-[14px] text-blue-500 font-medium">
            {pullDistance > 80 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      )}

      {/* Clients List */}
      {!isLoading && (
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-20"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {sortedAndFilteredClients.map((client, index) => (
          <div 
            key={client.id}
            onClick={() => navigate(`/mobile/clients/${client.id}`)}
            className="flex items-center gap-3 px-4 py-3 border-b border-[#e5e5ea] hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
            style={{ 
              borderBottomWidth: index === sortedAndFilteredClients.length - 1 ? '0' : '0.5px'
            }}
          >
            {/* Avatar with Initials */}
            <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-[15px] shadow-sm">
              {getInitials(client.name)}
            </div>

            {/* Client Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-semibold text-gray-900 truncate">
                  {client.name}
                </h3>
                {client.lastPurchase && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[13px] text-gray-500 truncate">
                  {client.phone}
                </span>
                {client.totalPurchases > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-[13px] font-medium text-gray-700">
                      {formatCurrency(client.totalPurchases)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Chevron */}
            <ChevronRight size={18} className="text-gray-400 flex-shrink-0" strokeWidth={2} />
          </div>
        ))}

        {sortedAndFilteredClients.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Users size={40} className="text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="text-gray-900 text-[17px] font-semibold mb-2">No clients found</p>
            <p className="text-[15px] text-gray-500 mb-6 max-w-sm mx-auto">
              {clients.length === 0 
                ? 'Start building your customer base by adding your first client' 
                : 'Try adjusting your search or filters'}
            </p>
            {clients.length === 0 && (
              <button
                onClick={() => setShowAddCustomerModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus size={20} strokeWidth={2.5} />
                Add First Client
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {/* Add Customer Modal */}
      <MobileAddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerCreated={(customer) => {
          // Add the new customer to the list
          const newClient: Client = {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email || '',
            address: customer.city || '',
            totalPurchases: customer.totalSpent || 0,
            lastPurchase: customer.lastVisit,
            avatar: undefined
          };

          setClients(prevClients => {
            const updatedClients = [newClient, ...prevClients];
            // Recalculate stats with new client
            setStats(calculateStats(updatedClients));
            return updatedClients;
          });
          
          setShowAddCustomerModal(false);
          toast.success(`Customer "${customer.name}" added successfully!`);
        }}
        onAddAnother={() => {
          // Keep modal open for adding another customer
          setShowAddCustomerModal(true);
        }}
      />
    </div>
  );
};

export default MobileClients;

