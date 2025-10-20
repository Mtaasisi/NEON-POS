import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  is_main: boolean;
  is_active: boolean;
  data_isolation_mode: 'shared' | 'isolated' | 'hybrid';
  share_products: boolean;
  share_customers: boolean;
  share_inventory: boolean;
  share_suppliers: boolean;
  share_categories: boolean;
  share_employees: boolean;
  allow_stock_transfer: boolean;
  can_view_other_branches: boolean;
}

interface BranchContextType {
  currentBranch: Branch | null;
  availableBranches: Branch[];
  loading: boolean;
  switchBranch: (branchId: string) => Promise<void>;
  canAccessBranch: (branchId: string) => boolean;
  isDataShared: (entityType: 'products' | 'customers' | 'inventory' | 'suppliers' | 'categories' | 'employees') => boolean;
  getBranchFilterClause: () => string;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadBranches();
    }
  }, [currentUser]);

  const loadBranches = async () => {
    try {
      setLoading(true);

      // Get all active branches
      const { data: branches, error } = await supabase
        .from('store_locations')
        .select('*')
        .eq('is_active', true)
        .order('is_main', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;

      setAvailableBranches(branches || []);

      // Admin can access all branches
      if (currentUser?.role === 'admin') {
        // Get stored preference or use main branch
        const storedBranchId = localStorage.getItem('current_branch_id');
        const savedBranch = branches?.find(b => b.id === storedBranchId);
        const mainBranch = branches?.find(b => b.is_main);
        const selectedBranch = savedBranch || mainBranch || branches?.[0] || null;
        
        // 🔥 FIX: Always save branch ID to localStorage on initialization
        if (selectedBranch) {
          localStorage.setItem('current_branch_id', selectedBranch.id);

        }
        
        setCurrentBranch(selectedBranch);
        setLoading(false);
        return;
      }

      // For non-admin users, check assignments
      try {
        const { data: assignments, error: assignError } = await supabase
          .from('user_branch_assignments')
          .select('*, store_locations(*)')
          .eq('user_id', currentUser?.id);

        if (assignError) {
          console.error('Error loading branch assignments:', assignError);
          // If no assignments exist, just use main branch
          const mainBranch = branches?.find(b => b.is_main);
          setCurrentBranch(mainBranch || branches?.[0] || null);
          setLoading(false);
          return;
        }

        if (assignments && assignments.length > 0) {
          // User has branch assignments - use primary or first assigned
          const primaryAssignment = assignments.find(a => a.is_primary);
          const branchData = primaryAssignment?.store_locations || assignments[0].store_locations;
          
          // 🔥 FIX: Save branch ID to localStorage on initialization
          if (branchData) {
            localStorage.setItem('current_branch_id', branchData.id);

          }
          
          setCurrentBranch(branchData);
          
          // Filter available branches to only assigned ones
          const assignedBranchIds = assignments.map(a => a.branch_id);
          setAvailableBranches(branches?.filter(b => assignedBranchIds.includes(b.id)) || []);
        } else {
          // No assignments - use main branch
          const mainBranch = branches?.find(b => b.is_main);
          const selectedBranch = mainBranch || branches?.[0] || null;
          
          // 🔥 FIX: Save branch ID to localStorage on initialization
          if (selectedBranch) {
            localStorage.setItem('current_branch_id', selectedBranch.id);

          }
          
          setCurrentBranch(selectedBranch);
        }
      } catch (err) {
        console.error('Error in branch assignments:', err);
        // Fallback to main branch
        const mainBranch = branches?.find(b => b.is_main);
        const fallbackBranch = mainBranch || branches?.[0] || null;
        
        // 🔥 FIX: Save branch ID to localStorage even in error case
        if (fallbackBranch) {
          localStorage.setItem('current_branch_id', fallbackBranch.id);

        }
        
        setCurrentBranch(fallbackBranch);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Failed to load branch information');
    } finally {
      setLoading(false);
    }
  };

  const switchBranch = async (branchId: string) => {
    const branch = availableBranches.find(b => b.id === branchId);
    if (!branch) {
      toast.error('Branch not found or not accessible');
      return;
    }

    if (!canAccessBranch(branchId)) {
      toast.error('You do not have permission to access this branch');
      return;
    }

    setCurrentBranch(branch);
    localStorage.setItem('current_branch_id', branchId);
    toast.success(`Switched to ${branch.name}`);

    // Log branch switch (optional - don't fail if it errors)
    try {
      await supabase.from('branch_activity_log').insert({
        branch_id: branchId,
        user_id: currentUser?.id,
        action_type: 'BRANCH_SWITCH',
        description: `User switched to branch: ${branch.name}`,
        metadata: { previous_branch: currentBranch?.id }
      });
    } catch (err) {

    }
  };

  const canAccessBranch = (branchId: string): boolean => {
    // Admin can access all branches
    if (currentUser?.role === 'admin') {
      return true;
    }

    // Check if branch is in available branches (already filtered by assignments)
    return availableBranches.some(b => b.id === branchId);
  };

  const isDataShared = (entityType: 'products' | 'customers' | 'inventory' | 'suppliers' | 'categories' | 'employees'): boolean => {
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
      suppliers: currentBranch.share_suppliers,
      categories: currentBranch.share_categories,
      employees: currentBranch.share_employees
    };

    return shareMapping[entityType] ?? false;
  };

  const getBranchFilterClause = (): string => {
    if (!currentBranch) return '';

    // If admin can view all branches, no filter needed
    if (currentUser?.role === 'admin' && currentBranch.can_view_other_branches) {
      return '';
    }

    return `(branch_id.eq.${currentBranch.id},or(is_shared.eq.true))`;
  };

  const refreshBranches = async () => {
    await loadBranches();
  };

  const value: BranchContextType = {
    currentBranch,
    availableBranches,
    loading,
    switchBranch,
    canAccessBranch,
    isDataShared,
    getBranchFilterClause,
    refreshBranches
  };

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
};

export const useBranch = (): BranchContextType => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};

export default BranchContext;

