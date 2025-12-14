import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { addBranchFilter } from '../../../lib/branchAwareApi';
import type { StoreLocationSchema } from '../../../lib/database/schema';
import { STORE_LOCATION_DEFAULTS, validateStoreLocation, applyStoreLocationDefaults } from '../../../lib/database/schema';
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
  Database
} from 'lucide-react';
import toast from 'react-hot-toast';

// Use schema type with optional id for form usage (new stores don't have id yet)
type Store = Partial<StoreLocationSchema> & {
  id?: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
};

const StoreManagementSettings: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Create empty store template using schema defaults
  const emptyStore: Store = useMemo(() => ({
    ...applyStoreLocationDefaults({
      name: '',
      code: '',
      address: '',
      city: '',
      country: 'Tanzania',
      // Override defaults for new stores - use hybrid mode for flexibility
      data_isolation_mode: 'hybrid',
      share_products: false,
      share_customers: false,
      share_inventory: false,
      share_suppliers: false,
      share_categories: false,
      share_employees: false,
      share_accounts: true,
    }) as Store,
  }), []);

  useEffect(() => {
    loadStores();
  }, []);

  // Memoize the store object passed to StoreForm to prevent unnecessary resets
  // FIXED: More stable memoization to prevent form resets when parent re-renders
  const storeForForm = useMemo(() => {
    if (editingStore) {
      // For edit mode, use the editingStore
      console.log('🔄 [StoreManagementSettings] storeForForm created for EDIT store ID:', editingStore.id);
      return editingStore;
    } else if (showAddForm) {
      // For add mode, use emptyStore (which is stable via useMemo)
      console.log('🔄 [StoreManagementSettings] storeForForm created for NEW store');
      return emptyStore;
    }
    // Fallback (shouldn't happen when form is shown)
    return emptyStore;
  }, [editingStore?.id, showAddForm, emptyStore]); // Include emptyStore for completeness, but it's stable

  // Memoize the onCancel callback to avoid hook ordering issues
  const handleFormCancel = useCallback(() => {
    console.log('🔄 [StoreManagementSettings] onCancel called');
    setShowAddForm(false);
    setEditingStore(null);
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
    // Validate using schema validator
    const validation = validateStoreLocation(store);
    if (!validation.valid) {
      toast.error(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    // Validate required fields (additional check)
    if (!store.name || !store.code) {
      toast.error('Store name and code are required');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Attempting to save store:', store);
      
      // Apply defaults to ensure all required fields are present
      const storeData = applyStoreLocationDefaults(store);
      
      // Prepare store data - remove empty arrays to avoid PostgreSQL type errors
      // PostgreSQL can't determine type of empty arrays, so remove or set to null
      if (Array.isArray(storeData.can_transfer_to_branches) && storeData.can_transfer_to_branches.length === 0) {
        delete (storeData as any).can_transfer_to_branches; // Let database use default value
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

  const handleEditStore = async (storeId: string) => {
    try {
      // Fetch the latest data from the database to ensure we have the most up-to-date values
      const { data, error } = await supabase
        .from('store_locations')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;

      if (data) {
        // Ensure all boolean fields have default values if they're null
        const storeData: Store = {
          ...data,
          share_products: data.share_products ?? false,
          share_customers: data.share_customers ?? false,
          share_inventory: data.share_inventory ?? false,
          share_suppliers: data.share_suppliers ?? false,
          share_categories: data.share_categories ?? false,
          share_employees: data.share_employees ?? false,
          share_sales: data.share_sales ?? false,
          share_purchase_orders: data.share_purchase_orders ?? false,
          share_devices: data.share_devices ?? false,
          share_payments: data.share_payments ?? false,
          share_appointments: data.share_appointments ?? false,
          share_reminders: data.share_reminders ?? false,
          share_expenses: data.share_expenses ?? false,
          share_trade_ins: data.share_trade_ins ?? false,
          share_special_orders: data.share_special_orders ?? false,
          share_attendance: data.share_attendance ?? false,
          share_loyalty_points: data.share_loyalty_points ?? false,
          share_accounts: data.share_accounts ?? true,
          share_gift_cards: data.share_gift_cards ?? true,
          share_quality_checks: data.share_quality_checks ?? false,
          share_recurring_expenses: data.share_recurring_expenses ?? false,
          share_communications: data.share_communications ?? false,
          share_reports: data.share_reports ?? false,
          share_finance_transfers: data.share_finance_transfers ?? false,
          allow_stock_transfer: data.allow_stock_transfer ?? true,
          auto_sync_products: data.auto_sync_products ?? true,
          auto_sync_prices: data.auto_sync_prices ?? true,
          require_approval_for_transfers: data.require_approval_for_transfers ?? false,
          data_isolation_mode: data.data_isolation_mode || 'hybrid',
          pricing_model: data.pricing_model || 'centralized',
          can_view_other_branches: data.can_view_other_branches ?? false,
          can_transfer_to_branches: data.can_transfer_to_branches || []
        };
        
        setEditingStore(storeData);
        setShowAddForm(false);
      }
    } catch (error: any) {
      console.error('Error loading store for editing:', error);
      toast.error('Failed to load store data. Please try again.');
    }
  };


  const StoreForm: React.FC<{
    store: Store;
    onSave: (store: Store) => void;
    onCancel: () => void;
    onStoreCreated?: (storeId: string) => void;
  }> = React.memo(({
    store,
    onSave,
    onCancel,
    onStoreCreated
  }) => {
    console.log('🔄 [StoreForm] Component re-rendered with store ID:', store.id, 'store ref:', store);
    // Declare refs before useState to avoid temporal dead zone
    const stableFormDataRef = useRef<Store | null>(null); // Store stable form data reference
    const initializedStoreIdRef = useRef<string | undefined>(store.id);
    const formInitializedRef = useRef(false); // Track if form has been initialized to prevent resets
    const lastStoreIdRef = useRef<string | undefined>(store.id); // Track last store ID to detect actual changes
    const loadedStoreIdRef = useRef<string | null>(null); // Track which store data has been loaded to prevent reloading

    // Initialize formData with store prop, but never update it from store prop after mount
    // Use lazy initialization with a copy to prevent reference issues
    const [formData, setFormData] = useState<Store>(() => {
      const initialData = { ...store };
      stableFormDataRef.current = initialData;
      return initialData;
    });
    const [isSaving, setIsSaving] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);
    const [lastSavedDraft, setLastSavedDraft] = useState<Date | null>(null);
    const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedDataRef = useRef<string>(''); // Track last saved data to avoid unnecessary saves
    const isInitialMountRef = useRef(true);

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

    // CRITICAL FIX: Only update form data when store ID actually changes
    // FIXED: Prevent form reset when user is actively typing by using more robust change detection
    useEffect(() => {
      const currentStoreId = store.id;
      const previousStoreId = initializedStoreIdRef.current;
      
      // Convert undefined to null for consistent comparison
      const normalizedCurrentId = currentStoreId ?? null;
      const normalizedPreviousId = previousStoreId ?? null;
      
      console.log('🔄 [StoreForm] useEffect triggered for store:', normalizedCurrentId, 'previous:', normalizedPreviousId);

      // Only update form data if this is a different store than what we initialized with
      // Use strict comparison to handle undefined/null cases properly
      if (normalizedPreviousId !== normalizedCurrentId) {
        // Store ID actually changed - this is intentional (switching stores or new store got ID)
        console.log('🔄 [StoreForm] Store ID changed from', normalizedPreviousId, 'to', normalizedCurrentId, '- resetting form');
        const newData = { ...store };
        setFormData(newData);
        stableFormDataRef.current = newData;
        setHasDraft(false);
        setLastSavedDraft(null);
        lastSavedDataRef.current = JSON.stringify(newData); // Track initial data
        initializedStoreIdRef.current = currentStoreId;
        lastStoreIdRef.current = currentStoreId;
        loadedStoreIdRef.current = currentStoreId;
        formInitializedRef.current = true;
        isInitialMountRef.current = true; // Reset initial mount flag for new store
      } else if (!formInitializedRef.current) {
        // First mount - only initialize once
        console.log('🔄 [StoreForm] First mount - initializing form for store:', normalizedCurrentId);
        const newData = { ...store };
        setFormData(newData);
        stableFormDataRef.current = newData;
        lastSavedDataRef.current = JSON.stringify(newData); // Track initial data
        initializedStoreIdRef.current = currentStoreId;
        formInitializedRef.current = true;
        isInitialMountRef.current = true; // Set initial mount flag
      }
      // If store ID hasn't changed and form is already initialized, do NOTHING
      // This prevents form from resetting when parent re-renders with same store ID
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.id]); // Only depend on store.id to detect actual store changes
    
    // CRITICAL: Prevent form from resetting when store prop object reference changes
    // This ensures formData is NEVER updated from store prop after initialization
    // unless the store ID actually changes

    // Auto-save to database when form data changes
    const autoSaveToDatabase = useCallback(async (data: Store) => {
      // Skip if required fields are missing
      if (!data.name || !data.code) {
        return;
      }

      // Skip if data hasn't changed
      const currentDataString = JSON.stringify(data);
      if (currentDataString === lastSavedDataRef.current) {
        return;
      }

      setAutoSaveStatus('saving');

      try {
        // Prepare store data - remove empty arrays to avoid PostgreSQL type errors
        const storeData = { ...data };
        
        // PostgreSQL can't determine type of empty arrays, so remove or set to null
        if (Array.isArray(storeData.can_transfer_to_branches) && storeData.can_transfer_to_branches.length === 0) {
          delete storeData.can_transfer_to_branches;
        }

        if (data.id) {
          // Update existing store
          const { error } = await supabase
            .from('store_locations')
            .update(storeData)
            .eq('id', data.id);

          if (error) throw error;
          
          // Update the last saved data reference
          lastSavedDataRef.current = currentDataString;
          setAutoSaveStatus('saved');
          setLastSavedDraft(new Date());
          setHasDraft(true);
          
          // Reset status to idle after 2 seconds
          setTimeout(() => {
            setAutoSaveStatus('idle');
          }, 2000);
        } else {
          // For new stores, create it in the database once required fields are filled
          const { data: newStore, error } = await supabase
            .from('store_locations')
            .insert([storeData])
            .select()
            .single();

          if (error) throw error;

          // Update formData with the new ID so subsequent saves are updates
          if (newStore?.id) {
            const updatedData = { ...data, id: newStore.id };
            setFormData(updatedData);
            lastSavedDataRef.current = JSON.stringify(updatedData);
            
            // Update the stable reference as well
            stableFormDataRef.current = updatedData;
            initializedStoreIdRef.current = newStore.id;
            
            // Notify parent that a new store was created
            if (onStoreCreated) {
              onStoreCreated(newStore.id);
            }
          } else {
            lastSavedDataRef.current = currentDataString;
          }
          
          setAutoSaveStatus('saved');
          setLastSavedDraft(new Date());
          setHasDraft(true);
          
          // Show a subtle notification that the store was created
          toast.success('Store created and auto-saved', { duration: 2000 });
          
          // Reset status to idle after 2 seconds
          setTimeout(() => {
            setAutoSaveStatus('idle');
          }, 2000);
        }
      } catch (error: any) {
        console.error('Auto-save error:', error);
        setAutoSaveStatus('error');
        
        // Don't show error toast for auto-save failures to avoid annoying the user
        // Only log it
        
        // Reset error status after 3 seconds
        setTimeout(() => {
          setAutoSaveStatus('idle');
        }, 3000);
      }
    }, []);

    // Debounced auto-save effect
    useEffect(() => {
      // Skip first render to avoid saving initial empty state
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
        // Initialize last saved data reference
        lastSavedDataRef.current = JSON.stringify(formData);
        return;
      }

      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set up debounced auto-save (1.5 seconds after user stops typing)
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSaveToDatabase(formData);
      }, 1500);

      // Cleanup
      return () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
      };
    }, [formData, autoSaveToDatabase]);

    const clearDraft = () => {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      setLastSavedDraft(null);
    };

    const handleSubmit = async () => {
      setIsSaving(true);
      try {
        // Clear any pending auto-save
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        
        // Force a final save before submitting
        await autoSaveToDatabase(formData);
        
        // Then call the parent's onSave handler
        await onSave(formData);
        clearDraft(); // Clear draft on successful save
        lastSavedDataRef.current = JSON.stringify(formData);
      } finally {
        setIsSaving(false);
      }
    };

    const handleCancel = () => {
      // Clear any pending auto-save
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      clearDraft();
      lastSavedDataRef.current = '';
      loadedStoreIdRef.current = null; // Reset loaded store ID when cancelling
      onCancel();
    };

    return (
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Icon Header - Fixed - Matching SupplierSelectionModal style */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            
            {/* Text and Status */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {store.id ? 'Edit Store' : 'Add New Store'}
              </h3>
              
              {/* Status Indicators */}
              <div className="flex items-center gap-4">
                {autoSaveStatus === 'saving' && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm font-bold text-blue-700">Saving...</span>
                  </div>
                )}
                {autoSaveStatus === 'saved' && lastSavedDraft && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-bold text-green-700">Auto-saved</span>
                  </div>
                )}
                {autoSaveStatus === 'error' && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-bold text-red-700">Save failed</span>
                  </div>
                )}
                {!formData.name || !formData.code ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-bold text-orange-700">Required fields missing</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-bold text-green-700">Ready to save</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Form Content - Only this section scrolls */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          <div className="space-y-6 py-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium transition-colors"
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium transition-colors"
                    placeholder="e.g., STORE-001"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                Location Details
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 font-medium transition-colors"
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
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 font-medium transition-colors"
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
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 font-medium transition-colors"
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
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 font-medium transition-colors"
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 font-medium transition-colors"
                    placeholder="Country"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                Contact Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-gray-900 font-medium transition-colors"
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-gray-900 font-medium transition-colors"
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white text-gray-900 font-medium transition-colors"
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
            </div>

            {/* Operating Hours */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                Operating Hours
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={formData.opening_time || ''}
                    onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900 font-medium transition-colors"
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900 font-medium transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Data Isolation Configuration */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                Data Isolation Configuration
              </h4>
              <p className="text-sm text-gray-600 mb-4 ml-10">
                Configure what data this branch shares with other branches. Toggle each feature individually.
              </p>

              {/* Isolation Mode Selector */}
              <div className="mb-6 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Data Isolation Mode *
                </label>
                <select
                  value={formData.data_isolation_mode || 'hybrid'}
                  onChange={(e) => setFormData({ ...formData, data_isolation_mode: e.target.value as 'shared' | 'isolated' | 'hybrid' })}
                  className="w-full px-4 py-3 border-2 border-indigo-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-gray-900 font-medium transition-colors bg-white"
                >
                  <option value="shared">Shared - All data is shared across all branches</option>
                  <option value="isolated">Isolated - Each branch has completely separate data</option>
                  <option value="hybrid">Hybrid - Configure sharing per data type (recommended)</option>
                </select>
                <p className="text-xs text-gray-600 mt-2">
                  {formData.data_isolation_mode === 'shared' && 'All data types will be shared regardless of individual toggles below.'}
                  {formData.data_isolation_mode === 'isolated' && 'All data types will be isolated regardless of individual toggles below.'}
                  {formData.data_isolation_mode === 'hybrid' && 'Use the toggles below to configure which data types are shared.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                ].map(({ key, label, Icon, description, category }) => {
                  const isIsolated = formData.data_isolation_mode === 'isolated';
                  const isShared = formData.data_isolation_mode === 'shared';
                  const isDisabled = isIsolated || isShared;
                  
                  return (
                    <div key={key} className={`flex items-center justify-between p-3 border-2 rounded-xl transition-all ${
                      isDisabled 
                        ? 'opacity-60 cursor-not-allowed bg-gray-50'
                        : formData[key as keyof Store] 
                          ? 'border-green-300 bg-green-50 hover:border-green-400' 
                          : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <Icon className={`w-5 h-5 flex-shrink-0 ${
                          formData[key as keyof Store] ? 'text-green-600' : 'text-gray-600'
                        }`} />
                        <div className="min-w-0">
                          <div className={`text-sm font-semibold truncate ${
                            formData[key as keyof Store] ? 'text-green-900' : 'text-gray-900'
                          }`}>{label}</div>
                          <p className="text-xs text-gray-500 truncate">{description}</p>
                        </div>
                      </div>
                      <label className={`relative inline-flex items-center ml-3 flex-shrink-0 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={formData[key as keyof Store] as boolean}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                          disabled={isDisabled}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-200 peer-focus:outline-none'} rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm`}></div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Transfer & Sync Options */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4 text-white" />
                </div>
                Transfer & Synchronization
              </h4>
              <p className="text-sm text-gray-600 mb-4 ml-10">
                Configure stock transfer and synchronization settings
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                  formData.allow_stock_transfer 
                    ? 'border-cyan-300 bg-cyan-50 hover:border-cyan-400' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Allow Stock Transfers</span>
                    <p className="text-xs text-gray-500 mt-1">Enable transferring stock between branches</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3">
                    <input
                      type="checkbox"
                      checked={formData.allow_stock_transfer}
                      onChange={(e) => setFormData({ ...formData, allow_stock_transfer: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm"></div>
                  </label>
                </div>

                <div className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                  formData.require_approval_for_transfers 
                    ? 'border-cyan-300 bg-cyan-50 hover:border-cyan-400' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${!formData.allow_stock_transfer ? 'opacity-50' : ''}`}>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Require Approval for Transfers</span>
                    <p className="text-xs text-gray-500 mt-1">Transfers need manager approval</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3">
                    <input
                      type="checkbox"
                      checked={formData.require_approval_for_transfers}
                      onChange={(e) => setFormData({ ...formData, require_approval_for_transfers: e.target.checked })}
                      disabled={!formData.allow_stock_transfer}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 ${formData.allow_stock_transfer ? 'bg-gray-200 peer-focus:outline-none' : 'bg-gray-100 cursor-not-allowed'} rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm`}></div>
                  </label>
                </div>

                <div className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                  formData.auto_sync_products 
                    ? 'border-cyan-300 bg-cyan-50 hover:border-cyan-400' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Auto-Sync Products</span>
                    <p className="text-xs text-gray-500 mt-1">Automatically sync product catalog changes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3">
                    <input
                      type="checkbox"
                      checked={formData.auto_sync_products}
                      onChange={(e) => setFormData({ ...formData, auto_sync_products: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm"></div>
                  </label>
                </div>

                <div className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                  formData.auto_sync_prices 
                    ? 'border-cyan-300 bg-cyan-50 hover:border-cyan-400' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Auto-Sync Prices</span>
                    <p className="text-xs text-gray-500 mt-1">Keep prices synchronized across branches</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3">
                    <input
                      type="checkbox"
                      checked={formData.auto_sync_prices}
                      onChange={(e) => setFormData({ ...formData, auto_sync_prices: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Branch Configuration */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                Branch Configuration
              </h4>
              <p className="text-sm text-gray-600 mb-4 ml-10">
                Configure branch settings and permissions
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                  formData.is_main 
                    ? 'border-teal-300 bg-teal-50 hover:border-teal-400' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Main Store</span>
                    <p className="text-xs text-gray-500 mt-1">This is the primary/headquarters location</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3">
                    <input
                      type="checkbox"
                      checked={formData.is_main}
                      onChange={(e) => setFormData({ ...formData, is_main: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm"></div>
                  </label>
                </div>

                <div className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                  formData.is_active 
                    ? 'border-teal-300 bg-teal-50 hover:border-teal-400' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Active</span>
                    <p className="text-xs text-gray-500 mt-1">Store is currently operational</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Model</label>
                  <select
                    value={formData.pricing_model}
                    onChange={(e) => setFormData({ ...formData, pricing_model: e.target.value as 'centralized' | 'location-specific' })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-gray-900 font-medium transition-colors"
                  >
                    <option value="centralized">Centralized Pricing (Same prices for all stores)</option>
                    <option value="location-specific">Location-Specific Pricing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate Override (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax_rate_override || ''}
                    onChange={(e) => setFormData({ ...formData, tax_rate_override: parseFloat(e.target.value) })}
                    disabled={formData.pricing_model !== 'location-specific'}
                    className={`w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-gray-900 font-medium transition-colors ${
                      formData.pricing_model !== 'location-specific' ? 'bg-gray-50 cursor-not-allowed opacity-50' : ''
                    }`}
                    placeholder={formData.pricing_model === 'location-specific' ? "Leave empty to use default tax rate" : "Only available for location-specific pricing"}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          {(!formData.name || !formData.code) && (
            <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-semibold text-orange-700">
                Please fill in all required fields (Store Name and Store Code) before saving.
              </span>
            </div>
          )}
          {lastSavedDraft && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">
                  Changes are automatically saved to the database
                </span>
              </div>
              <span className="text-sm text-blue-600 font-medium">
                Last saved: {lastSavedDraft.toLocaleTimeString()}
              </span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={isSaving || !formData.name || !formData.code}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {store.id ? 'Update Store' : 'Create Store'}
                </>
              )}
            </button>
            
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-6 py-3.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }, (prevProps: { store: Store; onSave: (store: Store) => void; onCancel: () => void; onStoreCreated?: (storeId: string) => void }, nextProps: { store: Store; onSave: (store: Store) => void; onCancel: () => void; onStoreCreated?: (storeId: string) => void }) => {
    // Only re-render if store ID changed
    const shouldRerender = prevProps.store.id !== nextProps.store.id;
    if (!shouldRerender) {
      console.log('🔄 [StoreForm] Preventing re-render - store ID unchanged:', prevProps.store.id);
    }
    return !shouldRerender;
  });

  // Add display name for debugging
  StoreForm.displayName = 'StoreForm';

  return (
    <div>
      {/* Unified Page Layout - Only show when not in form mode */}
      {!showAddForm && !editingStore && (
        <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
          {/* Icon Header - Fixed - Matching SetPricingModal style */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              
              {/* Text and Actions */}
              <div className="flex items-center justify-between flex-1">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Store & Branch Management</h2>
                  <p className="text-sm text-gray-600">Manage your store locations and branches</p>
                </div>
                <button
                  onClick={() => {
                    // Ensure edit mode is closed when adding
                    setEditingStore(null);
                    setShowAddForm(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  Add Store
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Stores List Section - Matching SetPricingModal style */}
          <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading stores...</p>
              </div>
            </div>
          ) : stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg font-medium">No stores configured yet</p>
              <p className="text-sm text-gray-500 mt-2">Click "Add Store" to create your first location</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {stores.map((store) => {
                const isMainStore = store.is_main;
                const isActive = store.is_active;
                
                return (
                  <div
                    key={store.id}
                    className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
                      isMainStore
                        ? 'border-blue-500 shadow-xl' 
                        : isActive
                          ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                          : 'border-orange-300 hover:border-orange-400 hover:shadow-md'
                    }`}
                  >
                    {/* Store Header - Clickable */}
                    <div className="flex items-start justify-between p-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                            isMainStore ? 'bg-blue-500' : isActive ? 'bg-green-500' : 'bg-gray-200'
                          }`}>
                            <Building2 className={`w-4 h-4 ${isMainStore || isActive ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-gray-900">{store.name}</h3>
                              {/* Status Badges */}
                              {isMainStore && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white shadow-sm">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Main Store
                                </span>
                              )}
                              {isActive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                                  <CheckCircle className="w-3 h-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm animate-pulse">
                                  <AlertTriangle className="w-3 h-3" />
                                  Inactive
                                </span>
                              )}
                            </div>
                            
                            {/* Store Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 mt-3">
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
                            
                            {/* Tags Row */}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-xl font-semibold border border-gray-200">
                                Code: {store.code}
                              </span>
                              <span className={`px-3 py-1.5 text-xs rounded-xl font-semibold border ${
                                store.data_isolation_mode === 'shared' 
                                  ? 'bg-blue-100 text-blue-700 border-blue-200' 
                                  : store.data_isolation_mode === 'isolated' 
                                    ? 'bg-red-100 text-red-700 border-red-200'
                                    : 'bg-purple-100 text-purple-700 border-purple-200'
                              }`}>
                                {store.data_isolation_mode === 'shared' ? 'Shared Data' :
                                 store.data_isolation_mode === 'isolated' ? 'Isolated Data' :
                                 'Hybrid Model'}
                              </span>
                              <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-xl font-semibold border border-gray-200">
                                {store.pricing_model === 'centralized' ? 'Centralized Pricing' : 'Location-Specific Pricing'}
                              </span>
                              {store.allow_stock_transfer && (
                                <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs rounded-xl font-semibold border border-green-200">
                                  Stock Transfers
                                </span>
                              )}
                              {store.share_inventory && (
                                <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs rounded-xl font-semibold border border-indigo-200">
                                  Shared Inventory
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 ml-4">
                        {!store.is_main && (
                          <button
                            onClick={() => handleSetAsMain(store.id!, store.name)}
                            className="flex items-center gap-1 px-4 py-2 text-yellow-600 hover:bg-yellow-50 rounded-xl transition-colors border-2 border-yellow-200 hover:border-yellow-300 font-semibold shadow-sm"
                            title="Set as main branch"
                          >
                            <Star className="w-4 h-4" />
                            <span className="text-xs">Set as Main</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleEditStore(store.id!)}
                          className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border-2 border-blue-200 hover:border-blue-300 shadow-sm"
                          title="Edit store"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        {!store.is_main && (
                          <button
                            onClick={() => handleDeleteStore(store.id!)}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors border-2 border-red-200 hover:border-red-300 shadow-sm"
                            title="Delete store"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {/* FIXED: Use stable key based on mode and ID to prevent unnecessary remounts */}
      {(showAddForm || editingStore) && (
        <StoreForm
          key={editingStore?.id ? `edit-${editingStore.id}` : 'add-new-store'}
          store={storeForForm}
          onSave={handleSaveStore}
          onCancel={handleFormCancel}
          onStoreCreated={async (storeId) => {
            // Reload stores list when a new store is created via auto-save
            // But don't close the form - let user continue editing
            await loadStores();
          }}
        />
      )}
    </div>
  );
};

export default StoreManagementSettings;

