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
  Settings,
  ShoppingCart,
  Box,
  Warehouse,
  Factory,
  FolderTree,
  UserCircle
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
  
  // What data is shared vs isolated
  share_products: boolean;
  share_customers: boolean;
  share_inventory: boolean;
  share_suppliers: boolean;
  share_categories: boolean;
  share_employees: boolean;
  
  // Transfer & Sync Options
  allow_stock_transfer: boolean;
  auto_sync_products: boolean;
  auto_sync_prices: boolean;
  require_approval_for_transfers: boolean;
  
  // Pricing & Tax
  pricing_model: 'centralized' | 'location-specific';
  tax_rate_override?: number;
  
  // Permissions
  can_transfer_to_branches: string[]; // Array of branch IDs
}

interface IsolationSettings {
  allow_products_isolation: boolean;
  allow_customers_isolation: boolean;
  allow_inventory_isolation: boolean;
  allow_suppliers_isolation: boolean;
  allow_categories_isolation: boolean;
  allow_employees_isolation: boolean;
}

const StoreManagementSettings: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showIsolationSettings, setShowIsolationSettings] = useState(false);
  const [isolationSettings, setIsolationSettings] = useState<IsolationSettings>({
    allow_products_isolation: true,
    allow_customers_isolation: true,
    allow_inventory_isolation: true,
    allow_suppliers_isolation: true,
    allow_categories_isolation: true,
    allow_employees_isolation: true,
  });

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
    
    // Data Sharing Defaults - Users must manually configure
    share_products: false,
    share_customers: false,
    share_inventory: false,
    share_suppliers: false,
    share_categories: false,
    share_employees: false,
    
    // Transfer Options
    allow_stock_transfer: true,
    auto_sync_products: true,
    auto_sync_prices: true,
    require_approval_for_transfers: false,
    
    // Pricing
    pricing_model: 'centralized',
    
    // Permissions
    can_transfer_to_branches: []
  }), []);

  useEffect(() => {
    loadStores();
    loadIsolationSettings();
  }, []);

  const loadIsolationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('setting_key', 'isolation_settings')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
      
      if (data?.setting_value) {
        setIsolationSettings(data.setting_value as IsolationSettings);
      }
    } catch (error) {
      console.error('Error loading isolation settings:', error);
    }
  };

  const saveIsolationSettings = async () => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'isolation_settings',
          setting_value: isolationSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Isolation settings saved successfully');
    } catch (error: any) {
      console.error('Error saving isolation settings:', error);
      toast.error(error.message || 'Failed to save isolation settings');
    }
  };

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
    if (!confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('store_locations')
        .delete()
        .eq('id', storeId);

      if (error) throw error;
      toast.success('Store deleted successfully');
      loadStores();
    } catch (error: any) {
      console.error('Error deleting store:', error);
      toast.error(error.message || 'Failed to delete store');
    }
  };

  const StoreForm: React.FC<{ 
    store: Store; 
    onSave: (store: Store) => void; 
    onCancel: () => void;
    isolationSettings: IsolationSettings;
  }> = ({ 
    store, 
    onSave, 
    onCancel,
    isolationSettings
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'share_products', label: 'Products & Catalog', Icon: Box, description: 'Share product catalog', setting: 'allow_products_isolation' },
                { key: 'share_customers', label: 'Customers', Icon: Users, description: 'Share customer database', setting: 'allow_customers_isolation' },
                { key: 'share_inventory', label: 'Inventory', Icon: Warehouse, description: 'Share inventory tracking', setting: 'allow_inventory_isolation' },
                { key: 'share_suppliers', label: 'Suppliers', Icon: Factory, description: 'Share supplier contacts', setting: 'allow_suppliers_isolation' },
                { key: 'share_categories', label: 'Categories', Icon: FolderTree, description: 'Share product categories', setting: 'allow_categories_isolation' },
                { key: 'share_employees', label: 'Employees', Icon: UserCircle, description: 'Share employee lists', setting: 'allow_employees_isolation' }
              ].filter(({ setting }) => isolationSettings[setting as keyof IsolationSettings]).map(({ key, label, Icon, description }) => (
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
      {!showAddForm && !editingStore && !showIsolationSettings && (
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
                onClick={() => setShowIsolationSettings(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Isolation Settings
              </button>
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
          isolationSettings={isolationSettings}
          onCancel={() => {
            setShowAddForm(false);
            setEditingStore(null);
          }}
        />
      )}

      {/* Isolation Settings Panel */}
      {showIsolationSettings && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Data Isolation Settings</h3>
                <p className="text-xs text-gray-500">Configure which features can be isolated per store</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-900 font-semibold mb-2 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Global Isolation Controls
              </p>
              <p className="text-xs text-blue-800">
                These settings control which features <span className="font-semibold">can be isolated per branch</span>. When enabled, each branch can choose to share or isolate that feature. When disabled, the feature is <span className="font-semibold">always shared</span> across all branches.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'allow_products_isolation', label: 'Products & Catalog', Icon: Box, description: 'Allow stores to have separate product catalogs' },
                { key: 'allow_customers_isolation', label: 'Customers', Icon: Users, description: 'Allow stores to have separate customer databases' },
                { key: 'allow_inventory_isolation', label: 'Inventory', Icon: Warehouse, description: 'Allow stores to have separate inventory tracking' },
                { key: 'allow_suppliers_isolation', label: 'Suppliers', Icon: Factory, description: 'Allow stores to have separate supplier lists' },
                { key: 'allow_categories_isolation', label: 'Categories', Icon: FolderTree, description: 'Allow stores to have separate product categories' },
                { key: 'allow_employees_isolation', label: 'Employees', Icon: UserCircle, description: 'Allow stores to have separate employee lists' }
              ].map(({ key, label, Icon, description }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-900">{label}</span>
                    </div>
                    <p className="text-xs text-gray-600">{description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={isolationSettings[key as keyof IsolationSettings]}
                      onChange={(e) => setIsolationSettings({ 
                        ...isolationSettings, 
                        [key]: e.target.checked 
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t">
              <button
                onClick={saveIsolationSettings}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Settings
              </button>
              <button
                onClick={() => {
                  setShowIsolationSettings(false);
                  loadIsolationSettings(); // Reload to reset any unsaved changes
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stores List */}
      {!showAddForm && !editingStore && !showIsolationSettings && (
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
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {store.pricing_model === 'centralized' ? 'Centralized Pricing' : 'Location-Specific Pricing'}
                      </span>
                      {store.allow_stock_transfer && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          Stock Transfers
                        </span>
                      )}
                      {store.share_products && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          Shared Products
                        </span>
                      )}
                      {store.share_customers && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                          Shared Customers
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
                    <button
                      onClick={() => setEditingStore(store)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    {!store.is_main && (
                      <button
                        onClick={() => handleDeleteStore(store.id!)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

