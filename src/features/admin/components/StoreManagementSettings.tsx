import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Phone, 
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  X,
  Package,
  ShoppingCart,
  Box,
  Warehouse,
  Factory,
  FolderTree,
  UserCircle,
  Receipt,
  FileText,
  Smartphone,
  CreditCard,
  Calendar,
  Bell,
  DollarSign,
  Repeat,
  ClipboardList,
  UserCheck,
  Award,
  Star,
  Gift,
  RefreshCw,
  MessageSquare,
  BarChart3,
  ArrowLeftRight,
  Bug,
  ChevronDown,
  ChevronUp,
  Database
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Store {
  id?: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
  email: string;
  manager_name: string;
  is_main: boolean;
  is_active: boolean;
  opening_time: string;
  closing_time: string;
  
  // Data Isolation & Sharing
  data_isolation_mode: 'shared' | 'isolated' | 'hybrid';
  
  // What data is shared vs isolated - Core Data
  share_products: boolean;
  share_customers: boolean;
  share_inventory: boolean;
  share_suppliers: boolean;
  share_categories: boolean;
  share_employees: boolean;
  
  // Additional Isolation Options - Business Operations
  share_sales: boolean;
  share_purchase_orders: boolean;
  share_devices: boolean;
  share_payments: boolean;
  share_appointments: boolean;
  share_reminders: boolean;
  share_expenses: boolean;
  share_trade_ins: boolean;
  share_special_orders: boolean;
  share_attendance: boolean;
  share_loyalty_points: boolean;
  share_accounts: boolean;

  // Additional Business Features
  share_gift_cards: boolean;
  share_quality_checks: boolean;
  share_recurring_expenses: boolean;
  share_communications: boolean;
  share_reports: boolean;
  share_finance_transfers: boolean;

  // Transfer & Sync Options
  allow_stock_transfer: boolean;
  auto_sync_products: boolean;
  auto_sync_prices: boolean;
  require_approval_for_transfers: boolean;
  
  // Pricing & Tax
  pricing_model: 'centralized' | 'location-specific';
  tax_rate_override?: number;
  
  // Permissions
  can_view_other_branches: boolean;
  can_transfer_to_branches: string[]; // Array of branch IDs
}

const StoreManagementSettings: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isolationData, setIsolationData] = useState<any>(null);
  const [loadingDebug, setLoadingDebug] = useState(false);

  const emptyStore: Store = useMemo(() => ({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    phone: '',
    email: '',
    manager_name: '',
    is_main: false,
    is_active: true,
    opening_time: '09:00',
    closing_time: '18:00',
    
    // Data Isolation Defaults - Users must manually configure
    data_isolation_mode: 'hybrid',
    share_products: false,
    share_customers: false,
    share_inventory: false,
    share_suppliers: false,
    share_categories: false,
    share_employees: false,
    
    // Additional isolation defaults
    share_sales: false,
    share_purchase_orders: false,
    share_devices: false,
    share_payments: false,
    share_appointments: false,
    share_reminders: false,
    share_expenses: false,
    share_trade_ins: false,
    share_special_orders: false,
    share_attendance: false,
    share_loyalty_points: false,
    share_accounts: true,

    // Additional business feature defaults
    share_gift_cards: true,
    share_quality_checks: false,
    share_recurring_expenses: false,
    share_communications: false,
    share_reports: false,
    share_finance_transfers: false,

    // Transfer Options
    allow_stock_transfer: true,
    auto_sync_products: true,
    auto_sync_prices: true,
    require_approval_for_transfers: false,
    
    // Pricing
    pricing_model: 'centralized',
    
    // Permissions
    can_view_other_branches: false,
    can_transfer_to_branches: []
  }), []);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_locations')
        .select('*')
        .order('is_main', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStore = useCallback(async (store: Store) => {
    // Validate required fields
    if (!store.name || !store.code) {
      toast.error('Store name and code are required');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Attempting to save store:', store);
      
      // Prepare store data - remove empty arrays to avoid PostgreSQL type errors
      const storeData = { ...store };
      
      // PostgreSQL can't determine type of empty arrays, so remove or set to null
      if (Array.isArray(storeData.can_transfer_to_branches) && storeData.can_transfer_to_branches.length === 0) {
        delete storeData.can_transfer_to_branches; // Let database use default value
      }
      
      if (store.id) {
        // Update existing store
        console.log('🔄 Updating existing store with id:', store.id);
        const { error } = await supabase
          .from('store_locations')
          .update(storeData)
          .eq('id', store.id);

        if (error) throw error;
        toast.success('Store updated successfully');
      } else {
        // Create new store
        console.log('➕ Creating new store');
        const { data, error } = await supabase
          .from('store_locations')
          .insert([storeData]);

        console.log('📊 Insert result:', { data, error });
        
        if (error) throw error;
        toast.success('Store created successfully');
      }

      // Close forms and reload
      setEditingStore(null);
      setShowAddForm(false);
      await loadStores();
    } catch (error: any) {
      console.error('Error saving store:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      toast.error(error.message || 'Failed to save store');
    } finally {
      setSaving(false);
    }
  }, []);

  const handleDeleteStore = async (storeId: string) => {
    try {
      // First, check if the store can be deleted
      const { data: checkResult, error: checkError } = await supabase
        .rpc('can_delete_store_location', { store_id: storeId });

      if (checkError) {
        console.error('Error checking store deletion:', checkError);
        // If function doesn't exist, proceed with caution
      }

      // If we got results, check if deletion is allowed
      if (checkResult && checkResult.length > 0) {
        const check = checkResult[0];
        
        if (!check.can_delete) {
          toast.error(check.reason, { duration: 6000 });
          
          // Show detailed warning
          const details = [];
          if (check.product_count > 0) details.push(`${check.product_count} products`);
          if (check.variant_count > 0) details.push(`${check.variant_count} variants`);
          if (check.customer_count > 0) details.push(`${check.customer_count} customers`);
          if (check.employee_count > 0) details.push(`${check.employee_count} employees`);
          
          if (details.length > 0) {
            alert(
              `Cannot delete this store.\n\n` +
              `The store contains:\n` +
              details.map(d => `• ${d}`).join('\n') +
              `\n\nPlease transfer or delete these items first.`
            );
          }
          return;
        }
      }

      // Confirm deletion
      if (!confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
        return;
      }

      // Attempt deletion
      const { error } = await supabase
        .from('store_locations')
        .delete()
        .eq('id', storeId);

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === '23503') {
          toast.error(
            'Cannot delete store: It contains products, customers, or other data. ' +
            'Please delete or transfer all data first.',
            { duration: 6000 }
          );
        } else {
          throw error;
        }
        return;
      }

      toast.success('Store deleted successfully');
      loadStores();
    } catch (error: any) {
      console.error('Error deleting store:', error);
      toast.error(error.message || 'Failed to delete store');
    }
  };

  const handleSetAsMain = async (storeId: string, storeName: string) => {
    if (!confirm(`Are you sure you want to set "${storeName}" as the main branch?`)) {
      return;
    }

    try {
      // First, unset all other main branches
      const { error: unsetError } = await supabase
        .from('store_locations')
        .update({ is_main: false })
        .eq('is_main', true);

      if (unsetError) throw unsetError;

      // Then set this store as main
      const { error: setError } = await supabase
        .from('store_locations')
        .update({ is_main: true })
        .eq('id', storeId);

      if (setError) throw setError;

      toast.success(`${storeName} is now the main branch`);
      loadStores();
    } catch (error: any) {
      console.error('Error setting main branch:', error);
      toast.error(error.message || 'Failed to set main branch');
    }
  };

  const loadIsolationDebugData = async (branchId: string) => {
    setLoadingDebug(true);
    try {
      // Test what this branch can see using the actual API logic (addBranchFilter)
      const [
        productsResult,
        customersResult,
        inventoryResult,
        suppliersResult,
        categoriesResult,
        employeesResult,
        paymentsResult,
        accountsResult,
        giftCardsResult,
        qualityChecksResult,
        recurringExpensesResult,
        communicationsResult,
        reportsResult,
        financeTransfersResult
      ] = await Promise.allSettled([
        // Use addBranchFilter to test actual API behavior
        (async () => {
          const query = supabase.from('lats_products').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'products');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('lats_customers').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'customers');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('inventory').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'inventory');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('lats_suppliers').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'suppliers');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('lats_categories').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'categories');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('lats_employees').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'employees');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('customer_payments').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'payments');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('finance_accounts').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'accounts');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('gift_cards').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'gift_cards');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('quality_checks').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'quality_checks');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('recurring_expenses').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'recurring_expenses');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('sms_logs').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'communications');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('daily_reports').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'reports');
          return await filteredQuery;
        })(),
        (async () => {
          const query = supabase.from('finance_transfers').select('*', { count: 'exact', head: true });
          const filteredQuery = await addBranchFilter(query, 'finance_transfers');
          return await filteredQuery;
        })()
      ]);

      // Get branch settings
      const branch = stores.find(s => s.id === branchId);

      setIsolationData({
        branchId,
        branchName: branch?.name || 'Unknown',
        isolationMode: branch?.data_isolation_mode || 'unknown',
        settings: {
          share_products: branch?.share_products,
          share_customers: branch?.share_customers,
          share_inventory: branch?.share_inventory,
          share_suppliers: branch?.share_suppliers,
          share_categories: branch?.share_categories,
          share_employees: branch?.share_employees,
          share_payments: branch?.share_payments,
          share_accounts: branch?.share_accounts,
          share_gift_cards: branch?.share_gift_cards,
          share_quality_checks: branch?.share_quality_checks,
          share_recurring_expenses: branch?.share_recurring_expenses,
          share_communications: branch?.share_communications,
          share_reports: branch?.share_reports,
          share_finance_transfers: branch?.share_finance_transfers,
        },
        visibleData: {
          products: productsResult.status === 'fulfilled' ? productsResult.value.count || 0 : 0,
          customers: customersResult.status === 'fulfilled' ? customersResult.value.count || 0 : 0,
          inventory: inventoryResult.status === 'fulfilled' ? inventoryResult.value.count || 0 : 0,
          suppliers: suppliersResult.status === 'fulfilled' ? suppliersResult.value.count || 0 : 0,
          categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value.count || 0 : 0,
          employees: employeesResult.status === 'fulfilled' ? employeesResult.value.count || 0 : 0,
          payments: paymentsResult.status === 'fulfilled' ? paymentsResult.value.count || 0 : 0,
          accounts: accountsResult.status === 'fulfilled' ? accountsResult.value.count || 0 : 0,
          giftCards: giftCardsResult.status === 'fulfilled' ? giftCardsResult.value.count || 0 : 0,
          qualityChecks: qualityChecksResult.status === 'fulfilled' ? qualityChecksResult.value.count || 0 : 0,
          recurringExpenses: recurringExpensesResult.status === 'fulfilled' ? recurringExpensesResult.value.count || 0 : 0,
          communications: communicationsResult.status === 'fulfilled' ? communicationsResult.value.count || 0 : 0,
          reports: reportsResult.status === 'fulfilled' ? reportsResult.value.count || 0 : 0,
          financeTransfers: financeTransfersResult.status === 'fulfilled' ? financeTransfersResult.value.count || 0 : 0,
        }
      });
    } catch (error) {
      console.error('Error loading isolation debug data:', error);
      toast.error('Failed to load isolation debug data');
    } finally {
      setLoadingDebug(false);
    }
  };

  const StoreForm: React.FC<{ 
    store: Store; 
    onSave: (store: Store) => void; 
    onCancel: () => void;
  }> = ({ 
    store, 
    onSave, 
    onCancel
  }) => {
    const [formData, setFormData] = useState<Store>(store);
    const [isSaving, setIsSaving] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);
    const [lastSavedDraft, setLastSavedDraft] = useState<Date | null>(null);
    const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    const DRAFT_KEY = `store-draft-${store.id || 'new'}`;

    // Fetch users for manager dropdown
    useEffect(() => {
      const fetchUsers = async () => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('is_active', true)
            .order('full_name', { ascending: true });

          if (error) throw error;
          setUsers(data || []);
        } catch (error) {
          console.error('Error loading users:', error);
        } finally {
          setLoadingUsers(false);
        }
      };

      fetchUsers();
    }, []);

    // Initialize form data when store prop changes
    useEffect(() => {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          setFormData(draftData.formData);
          setHasDraft(true);
          setLastSavedDraft(new Date(draftData.savedAt));
          console.log('📝 Auto-restored draft from:', new Date(draftData.savedAt).toLocaleString());
        } catch (error) {
          console.error('Error loading draft:', error);
          localStorage.removeItem(DRAFT_KEY);
        }
      } else {
        // No draft found, use the store prop data
        setFormData(store);
        setHasDraft(false);
        setLastSavedDraft(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.id, DRAFT_KEY]); // Re-run when switching between stores

    // Auto-save draft when form data changes (faster, silent)
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (formData.name || formData.code || formData.address) {
          const draftData = {
            formData,
            savedAt: new Date().toISOString()
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
          setHasDraft(true);
          setLastSavedDraft(new Date());
        }
      }, 800); // Faster auto-save: 0.8 seconds

      return () => clearTimeout(timeoutId);
    }, [formData, DRAFT_KEY]);

    const clearDraft = () => {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      setLastSavedDraft(null);
    };

    const handleSubmit = async () => {
      setIsSaving(true);
      try {
        await onSave(formData);
        clearDraft(); // Clear draft on successful save
      } finally {
        setIsSaving(false);
      }
    };

    const handleCancel = () => {
      clearDraft();
      onCancel();
    };

    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {store.id ? 'Edit Store' : 'Add New Store'}
              </h3>
              <p className="text-xs text-gray-500">Fill in all required fields marked with *</p>
            </div>
          </div>
          {hasDraft && lastSavedDraft && (
            <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Auto-saved
            </span>
          )}
        </div>

        {/* All Form Fields in One Container */}
        <div className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Name *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter store name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Code *
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="e.g., STORE-001"
                required
              />
            </div>
          </div>

          {/* Location Details */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Street address"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP/Postal Code
                </label>
                <input
                  type="text"
                  value={formData.zip_code || ''}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="ZIP"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country *
              </label>
              <input
                type="text"
                value={formData.country || ''}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Country"
                required
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Manager
              </label>
              <select
                value={formData.manager_name || ''}
                onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                disabled={loadingUsers}
              >
                <option value="">Select a manager</option>
                {users.map((user) => (
                  <option key={user.id} value={user.full_name}>
                    {user.full_name}
                  </option>
                ))}
              </select>
              {loadingUsers && (
                <p className="text-xs text-gray-500 mt-1">Loading users...</p>
              )}
            </div>
          </div>

          {/* Operating Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opening Time
              </label>
              <input
                type="time"
                value={formData.opening_time || ''}
                onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing Time
              </label>
              <input
                type="time"
                value={formData.closing_time || ''}
                onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Data Isolation Configuration */}
          <div className="border-t pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Isolation Configuration
            </label>
            <p className="text-xs text-gray-500 mb-4">
              Configure what data this branch shares with other branches. Toggle each feature individually.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                // Core Data
                { key: 'share_products', label: 'Products & Catalog', Icon: Box, description: 'Share product catalog', category: 'Core' },
                { key: 'share_customers', label: 'Customers', Icon: Users, description: 'Share customer database', category: 'Core' },
                { key: 'share_inventory', label: 'Inventory', Icon: Warehouse, description: 'Share inventory tracking', category: 'Core' },
                { key: 'share_suppliers', label: 'Suppliers', Icon: Factory, description: 'Share supplier contacts', category: 'Core' },
                { key: 'share_categories', label: 'Categories', Icon: FolderTree, description: 'Share product categories', category: 'Core' },
                { key: 'share_employees', label: 'Employees', Icon: UserCircle, description: 'Share employee lists', category: 'Core' },
                
                // Business Operations
                { key: 'share_sales', label: 'Sales Records', Icon: Receipt, description: 'Share sales transactions', category: 'Operations' },
                { key: 'share_purchase_orders', label: 'Purchase Orders', Icon: FileText, description: 'Share purchase orders', category: 'Operations' },
                { key: 'share_devices', label: 'Devices & Repairs', Icon: Smartphone, description: 'Share device repair records', category: 'Operations' },
                { key: 'share_payments', label: 'Payments', Icon: CreditCard, description: 'Share payment records', category: 'Operations' },
                { key: 'share_accounts', label: 'Accounts', Icon: Star, description: 'Share financial accounts', category: 'Operations' },
                { key: 'share_appointments', label: 'Appointments', Icon: Calendar, description: 'Share customer appointments', category: 'Operations' },
                { key: 'share_reminders', label: 'Reminders', Icon: Bell, description: 'Share task reminders', category: 'Operations' },
                { key: 'share_expenses', label: 'Expenses', Icon: DollarSign, description: 'Share expense records', category: 'Operations' },
                { key: 'share_trade_ins', label: 'Trade-Ins', Icon: Repeat, description: 'Share device trade-ins', category: 'Operations' },
                { key: 'share_special_orders', label: 'Special Orders', Icon: ClipboardList, description: 'Share custom orders', category: 'Operations' },
                { key: 'share_attendance', label: 'Attendance', Icon: UserCheck, description: 'Share employee attendance', category: 'Operations' },
                { key: 'share_loyalty_points', label: 'Loyalty Program', Icon: Award, description: 'Share loyalty points', category: 'Operations' },

                // Additional Business Features
                { key: 'share_gift_cards', label: 'Gift Cards', Icon: Gift, description: 'Share gift card programs', category: 'Business' },
                { key: 'share_quality_checks', label: 'Quality Checks', Icon: CheckCircle, description: 'Share quality control processes', category: 'Business' },
                { key: 'share_recurring_expenses', label: 'Recurring Expenses', Icon: RefreshCw, description: 'Share automated expense schedules', category: 'Business' },
                { key: 'share_communications', label: 'Communications', Icon: MessageSquare, description: 'Share SMS/WhatsApp logs', category: 'Business' },
                { key: 'share_reports', label: 'Reports', Icon: BarChart3, description: 'Share daily reports and analytics', category: 'Business' },
                { key: 'share_finance_transfers', label: 'Finance Transfers', Icon: ArrowLeftRight, description: 'Share financial transfers', category: 'Business' }
              ].map(({ key, label, Icon, description, category }) => (
                <div key={key} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{label}</div>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={formData[key as keyof Store] as boolean}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer & Sync Options */}
          <div className="border-t pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transfer & Synchronization
            </label>
            <p className="text-xs text-gray-500 mb-4">
              Configure stock transfer and synchronization settings
            </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <div>
                <span className="text-sm font-medium text-gray-700">Allow Stock Transfers</span>
                <p className="text-xs text-gray-500">Enable transferring stock between branches</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_stock_transfer}
                  onChange={(e) => setFormData({ ...formData, allow_stock_transfer: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {formData.allow_stock_transfer && (
              <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <div>
                  <span className="text-sm font-medium text-gray-700">Require Approval for Transfers</span>
                  <p className="text-xs text-gray-500">Transfers need manager approval</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.require_approval_for_transfers}
                    onChange={(e) => setFormData({ ...formData, require_approval_for_transfers: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            )}

            <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <div>
                <span className="text-sm font-medium text-gray-700">Auto-Sync Products</span>
                <p className="text-xs text-gray-500">Automatically sync product catalog changes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_sync_products}
                  onChange={(e) => setFormData({ ...formData, auto_sync_products: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <div>
                <span className="text-sm font-medium text-gray-700">Auto-Sync Prices</span>
                <p className="text-xs text-gray-500">Keep prices synchronized across branches</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_sync_prices}
                  onChange={(e) => setFormData({ ...formData, auto_sync_prices: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
          </div>

          {/* Branch Configuration */}
          <div className="border-t pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch Configuration
            </label>
            <p className="text-xs text-gray-500 mb-4">
              Configure branch settings and permissions
            </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <div>
                <span className="text-sm font-medium text-gray-700">Main Store</span>
                <p className="text-xs text-gray-500">This is the primary/headquarters location</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_main}
                  onChange={(e) => setFormData({ ...formData, is_main: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <div>
                <span className="text-sm font-medium text-gray-700">Active</span>
                <p className="text-xs text-gray-500">Store is currently operational</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Model</label>
              <select
                value={formData.pricing_model}
                onChange={(e) => setFormData({ ...formData, pricing_model: e.target.value as 'centralized' | 'location-specific' })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-900"
              >
                <option value="centralized">Centralized Pricing (Same prices for all stores)</option>
                <option value="location-specific">Location-Specific Pricing</option>
              </select>
            </div>

            {formData.pricing_model === 'location-specific' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate Override (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tax_rate_override || ''}
                  onChange={(e) => setFormData({ ...formData, tax_rate_override: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-900"
                  placeholder="Leave empty to use default tax rate"
                />
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Isolation Debug Panel */}
        {store.id && (
          <div className="border-t pt-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Bug className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">Isolation Debug Panel</h3>
              </div>
              <button
                onClick={() => {
                  setShowDebugPanel(!showDebugPanel);
                  if (!showDebugPanel && !isolationData) {
                    loadIsolationDebugData(store.id);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
              >
                <Database className="w-4 h-4" />
                {showDebugPanel ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Hide Debug</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span className="text-sm font-medium">Show Debug</span>
                  </>
                )}
              </button>
            </div>

            {showDebugPanel && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                {loadingDebug ? (
                  <div className="flex items-center gap-3 text-orange-700">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Loading isolation debug data...</span>
                  </div>
                ) : isolationData ? (
                  <div className="space-y-4">
                    {/* Branch Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Branch Information</h4>
                        <div className="space-y-1 text-sm">
                          <div><strong>Name:</strong> {isolationData.branchName}</div>
                          <div><strong>ID:</strong> {isolationData.branchId}</div>
                          <div><strong>Isolation Mode:</strong>
                            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                              isolationData.isolationMode === 'isolated'
                                ? 'bg-red-100 text-red-700'
                                : isolationData.isolationMode === 'hybrid'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {isolationData.isolationMode}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Sharing Settings</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className={isolationData.settings.share_products ? 'text-green-700' : 'text-red-700'}>
                            Products: {isolationData.settings.share_products ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_customers ? 'text-green-700' : 'text-red-700'}>
                            Customers: {isolationData.settings.share_customers ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_inventory ? 'text-green-700' : 'text-red-700'}>
                            Inventory: {isolationData.settings.share_inventory ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_suppliers ? 'text-green-700' : 'text-red-700'}>
                            Suppliers: {isolationData.settings.share_suppliers ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_categories ? 'text-green-700' : 'text-red-700'}>
                            Categories: {isolationData.settings.share_categories ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_employees ? 'text-green-700' : 'text-red-700'}>
                            Employees: {isolationData.settings.share_employees ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_payments ? 'text-green-700' : 'text-red-700'}>
                            Payments: {isolationData.settings.share_payments ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_accounts ? 'text-green-700' : 'text-red-700'}>
                            Accounts: {isolationData.settings.share_accounts ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_gift_cards ? 'text-green-700' : 'text-red-700'}>
                            Gift Cards: {isolationData.settings.share_gift_cards ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_quality_checks ? 'text-green-700' : 'text-red-700'}>
                            Quality Checks: {isolationData.settings.share_quality_checks ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_recurring_expenses ? 'text-green-700' : 'text-red-700'}>
                            Recurring Expenses: {isolationData.settings.share_recurring_expenses ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_communications ? 'text-green-700' : 'text-red-700'}>
                            Communications: {isolationData.settings.share_communications ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_reports ? 'text-green-700' : 'text-red-700'}>
                            Reports: {isolationData.settings.share_reports ? 'Shared' : 'Isolated'}
                          </div>
                          <div className={isolationData.settings.share_finance_transfers ? 'text-green-700' : 'text-red-700'}>
                            Finance Transfers: {isolationData.settings.share_finance_transfers ? 'Shared' : 'Isolated'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Data Visibility */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Data Visibility Test</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-2xl font-bold text-blue-600">{isolationData.visibleData.products}</div>
                          <div className="text-sm text-gray-600">Products</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-2xl font-bold text-green-600">{isolationData.visibleData.customers}</div>
                          <div className="text-sm text-gray-600">Customers</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-xl font-bold text-yellow-600">{isolationData.visibleData.inventory}</div>
                          <div className="text-sm text-gray-600">Inventory</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-2xl font-bold text-purple-600">{isolationData.visibleData.suppliers}</div>
                          <div className="text-sm text-gray-600">Suppliers</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-xl font-bold text-teal-600">{isolationData.visibleData.categories}</div>
                          <div className="text-sm text-gray-600">Categories</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-xl font-bold text-cyan-600">{isolationData.visibleData.employees}</div>
                          <div className="text-sm text-gray-600">Employees</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-2xl font-bold text-orange-600">{isolationData.visibleData.payments}</div>
                          <div className="text-sm text-gray-600">Payments</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-2xl font-bold text-red-600">{isolationData.visibleData.accounts}</div>
                          <div className="text-sm text-gray-600">Accounts</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-2xl font-bold text-pink-600">{isolationData.visibleData.giftCards}</div>
                          <div className="text-sm text-gray-600">Gift Cards</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-2xl font-bold text-indigo-600">{isolationData.visibleData.qualityChecks}</div>
                          <div className="text-sm text-gray-600">Quality Checks</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-xl font-bold text-violet-600">{isolationData.visibleData.recurringExpenses}</div>
                          <div className="text-sm text-gray-600">Recurring Expenses</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-xl font-bold text-sky-600">{isolationData.visibleData.communications}</div>
                          <div className="text-sm text-gray-600">Communications</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-xl font-bold text-gray-700">{isolationData.visibleData.reports}</div>
                          <div className="text-sm text-gray-600">Reports</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-xl font-bold text-amber-600">{isolationData.visibleData.financeTransfers}</div>
                          <div className="text-sm text-gray-600">Finance Transfers</div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <div className="font-medium text-blue-900">Isolation Status</div>
                            <div className="text-sm text-blue-700 mt-1">
                              {isolationData.isolationMode === 'isolated'
                                ? '✅ Isolated mode active: Branch sees only its own data'
                                : isolationData.isolationMode === 'hybrid'
                                ? '✅ Hybrid mode active: Branch sees own data + selectively shared data'
                                : '✅ Shared mode active: Branch sees all data'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    No debug data loaded. Click "Show Debug" to test isolation.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-6 mt-6 border-t">
          <button
            onClick={handleSubmit}
            disabled={isSaving || !formData.name || !formData.code}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : (store.id ? 'Update Store' : 'Create Store')}
          </button>
          
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>

        {/* Auto-Save Status Info */}
        {hasDraft && lastSavedDraft && (
          <div className="flex items-center justify-between text-xs bg-green-50 border border-green-200 p-3 rounded-lg mt-4">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-green-700 font-medium">
                All changes are automatically saved
              </span>
            </div>
            <span className="text-green-600">
              Last saved: {lastSavedDraft.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {!showAddForm && !editingStore && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Store & Branch Management</h2>
                <p className="text-sm text-gray-500">Manage your store locations and branches</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingStore) && (
        <StoreForm
          key={editingStore?.id || 'new-store'}
          store={editingStore || emptyStore}
          onSave={handleSaveStore}
          onCancel={() => {
            setShowAddForm(false);
            setEditingStore(null);
          }}
        />
      )}

      {/* Stores List */}
      {!showAddForm && !editingStore && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-2">Loading stores...</p>
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No stores configured yet</p>
              <p className="text-sm text-gray-500">Click "Add Store" to create your first location</p>
            </div>
          ) : (
            stores.map((store) => (
              <div
                key={store.id}
                className="bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
                      {store.is_main && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                          Main Store
                        </span>
                      )}
                      {store.is_active ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{store.address}, {store.city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{store.phone || 'No phone'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{store.opening_time} - {store.closing_time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{store.manager_name || 'No manager assigned'}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        Code: {store.code}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        store.data_isolation_mode === 'shared' ? 'bg-blue-100 text-blue-700' :
                        store.data_isolation_mode === 'isolated' ? 'bg-red-100 text-red-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {store.data_isolation_mode === 'shared' ? 'Shared Data' :
                         store.data_isolation_mode === 'isolated' ? 'Isolated Data' :
                         'Hybrid Model'}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {store.pricing_model === 'centralized' ? 'Centralized Pricing' : 'Location-Specific Pricing'}
                      </span>
                      {store.allow_stock_transfer && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          Stock Transfers
                        </span>
                      )}
                      {store.share_inventory && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                          Shared Inventory
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!store.is_main && (
                      <button
                        onClick={() => handleSetAsMain(store.id!, store.name)}
                        className="flex items-center gap-1 px-3 py-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors border border-yellow-200"
                        title="Set as main branch"
                      >
                        <Star className="w-4 h-4" />
                        <span className="text-xs font-medium">Set as Main</span>
                      </button>
                    )}
                    <button
                      onClick={() => setEditingStore(store)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit store"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    {!store.is_main && (
                      <button
                        onClick={() => handleDeleteStore(store.id!)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete store"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default StoreManagementSettings;

