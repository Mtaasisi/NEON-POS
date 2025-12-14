import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  is_main: boolean;
  is_active: boolean;
  data_isolation_mode: 'shared' | 'isolated' | 'hybrid';
  share_products: boolean;
  share_customers: boolean;
  share_inventory: boolean;
}

interface UseMobileBranchReturn {
  currentBranch: Branch | null;
  availableBranches: Branch[];
  loading: boolean;
  switchBranch: (branchId: string) => Promise<void>;
  refreshBranches: () => Promise<void>;
  isDataShared: (entityType: 'products' | 'customers' | 'inventory') => boolean;
  getBranchFilter: () => { branchId: string; mode: string } | null;
}

/**
 * Mobile-specific branch management hook
 * Provides branch context and filtering for mobile app
 */
export const useMobileBranch = (): UseMobileBranchReturn => {
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Load branches from database
  const loadBranches = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all active branches
      const { data: branches, error } = await supabase
        .from('store_locations')
        .select('id, name, code, city, is_main, is_active, data_isolation_mode, share_products, share_customers, share_inventory')
        .eq('is_active', true)
        .order('is_main', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading branches:', error);
        throw error;
      }

      setAvailableBranches(branches || []);

      // Get current branch from localStorage or use main branch
      const storedBranchId = localStorage.getItem('current_branch_id');
      let selectedBranch: Branch | null = null;

      if (storedBranchId) {
        selectedBranch = branches?.find(b => b.id === storedBranchId) || null;
      }

      // Fallback to main branch if no stored branch or stored branch not found
      if (!selectedBranch) {
        const mainBranch = branches?.find(b => b.is_main);
        selectedBranch = mainBranch || branches?.[0] || null;
        
        // Save to localStorage
        if (selectedBranch) {
          localStorage.setItem('current_branch_id', selectedBranch.id);
        }
      }

      setCurrentBranch(selectedBranch);
      console.log('📍 [Mobile] Current branch:', selectedBranch?.name);
    } catch (error) {
      console.error('Failed to load branches:', error);
      toast.error('Failed to load branch information');
    } finally {
      setLoading(false);
    }
  }, []);

  // Switch to a different branch
  const switchBranch = useCallback(async (branchId: string) => {
    const branch = availableBranches.find(b => b.id === branchId);
    
    if (!branch) {
      toast.error('Branch not found');
      return;
    }

    setCurrentBranch(branch);
    localStorage.setItem('current_branch_id', branchId);
    console.log('🔄 [Mobile] Switched to branch:', branch.name);
    
    // 🔥 Clear cache for branch-specific data before reloading
    try {
      console.log('🗑️ [Mobile] Clearing cache for branch switch...');
      const { smartCache } = await import('../../../lib/enhancedCacheManager');
      await Promise.all([
        smartCache.invalidateCache('products'),
        smartCache.invalidateCache('customers'),
        smartCache.invalidateCache('sales'),
      ]);
      console.log('✅ [Mobile] Cache cleared for new branch');
    } catch (error) {
      console.error('❌ [Mobile] Failed to clear cache:', error);
    }
    
    toast.success(`Switching to ${branch.name}...`, { duration: 1500 });

    // Trigger page refresh by dispatching custom event
    window.dispatchEvent(new CustomEvent('branchChanged', { detail: { branchId } }));
    
    // Reload page after a short delay to fetch fresh data for new branch
    setTimeout(() => {
      console.log('🔄 [Mobile] Reloading app for branch change...');
      window.location.reload();
    }, 500);
  }, [availableBranches]);

  // Check if data is shared for a specific entity type
  const isDataShared = useCallback((entityType: 'products' | 'customers' | 'inventory'): boolean => {
    if (!currentBranch) return true;

    // Shared mode - everything is shared
    if (currentBranch.data_isolation_mode === 'shared') {
      return true;
    }

    // Isolated mode - nothing is shared
    if (currentBranch.data_isolation_mode === 'isolated') {
      return false;
    }

    // Hybrid mode - check specific flag
    const shareMapping = {
      products: currentBranch.share_products,
      customers: currentBranch.share_customers,
      inventory: currentBranch.share_inventory,
    };

    return shareMapping[entityType] ?? false;
  }, [currentBranch]);

  // Get branch filter for queries
  const getBranchFilter = useCallback(() => {
    if (!currentBranch) return null;

    return {
      branchId: currentBranch.id,
      mode: currentBranch.data_isolation_mode
    };
  }, [currentBranch]);

  // Refresh branches
  const refreshBranches = useCallback(async () => {
    await loadBranches();
  }, [loadBranches]);

  // Load branches on mount
  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  return {
    currentBranch,
    availableBranches,
    loading,
    switchBranch,
    refreshBranches,
    isDataShared,
    getBranchFilter
  };
};

/**
 * Helper function to apply branch filter to Supabase query
 * Use this in mobile pages to filter data by branch
 */
export const applyBranchFilter = (
  query: any,
  branchId: string,
  mode: 'shared' | 'isolated' | 'hybrid',
  isShared: boolean
) => {
  // Shared mode or data is shared - no filter
  if (mode === 'shared' || isShared) {
    return query;
  }

  // Isolated mode - only show this branch's data
  if (mode === 'isolated') {
    return query.eq('branch_id', branchId);
  }

  // Hybrid mode - show this branch's data + shared data + unassigned data
  if (mode === 'hybrid') {
    return query.or(`branch_id.eq.${branchId},is_shared.eq.true,branch_id.is.null`);
  }

  // Default - show this branch's data + unassigned data
  return query.or(`branch_id.eq.${branchId},branch_id.is.null`);
};

/**
 * Get current branch ID from localStorage
 */
export const getCurrentBranchId = (): string | null => {
  return localStorage.getItem('current_branch_id');
};

