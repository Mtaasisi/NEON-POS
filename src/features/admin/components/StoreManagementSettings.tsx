import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/EnhancedInput';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Phone, 
  Mail,
  Clock,
  Users,
  Package,
  CheckCircle,
  AlertTriangle
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
  can_view_other_branches: boolean;
  can_transfer_to_branches: string[]; // Array of branch IDs
}

const StoreManagementSettings: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const emptyStore: Store = {
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
    
    // Data Isolation Defaults
    data_isolation_mode: 'shared',
    share_products: true,
    share_customers: true,
    share_inventory: false, // Each branch has own inventory by default
    share_suppliers: true,
    share_categories: true,
    share_employees: false, // Branch-specific employees
    
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
  };

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

  const StoreForm: React.FC<{ store: Store; onSave: (store: Store) => void; onCancel: () => void }> = ({ 
    store, 
    onSave, 
    onCancel 
  }) => {
    const [formData, setFormData] = useState<Store>(store);
    const [isSaving, setIsSaving] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);
    const [lastSavedDraft, setLastSavedDraft] = useState<Date | null>(null);

    const DRAFT_KEY = `store-draft-${store.id || 'new'}`;

    // Load draft on mount (silent restoration)
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
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
      <div className="space-y-6">
        {/* Form Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {store.id ? 'Edit Store' : 'Add New Store'}
                </h3>
                {hasDraft && lastSavedDraft && (
                  <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Auto-saved
                  </span>
                )}
              </div>
              <p className="text-sm opacity-90 mt-1">
                Fill in all required fields marked with * • Changes auto-save as you type
              </p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            <Building2 className="h-5 w-5 text-blue-600 mr-2" />
            Basic Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassInput
              label="Store Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <GlassInput
              label="Store Code *"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., STORE-001"
              required
            />
          </div>
        </div>

        {/* Location Details */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            <MapPin className="h-5 w-5 text-green-600 mr-2" />
            Location Details
          </h4>
          <div className="grid grid-cols-1 gap-4">
            <GlassInput
              label="Address *"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassInput
                label="City *"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
              <GlassInput
                label="State/Province"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
              <GlassInput
                label="ZIP/Postal Code"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              />
            </div>
            <GlassInput
              label="Country *"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            <Phone className="h-5 w-5 text-purple-600 mr-2" />
            Contact Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassInput
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <GlassInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <GlassInput
              label="Store Manager"
              value={formData.manager_name}
              onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
            />
          </div>
        </div>

        {/* Operating Hours */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 text-orange-600 mr-2" />
            Operating Hours
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassInput
              label="Opening Time"
              type="time"
              value={formData.opening_time}
              onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
            />
            <GlassInput
              label="Closing Time"
              type="time"
              value={formData.closing_time}
              onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
            />
          </div>
        </div>

        {/* Data Isolation Mode */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 text-purple-600 mr-2" />
            Data Isolation Model
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {[
              {
                value: 'shared',
                title: 'Shared Data',
                description: 'All branches share the same database',
                icon: '🌐',
                benefits: ['Unified inventory', 'Shared customers', 'Centralized reporting']
              },
              {
                value: 'isolated',
                title: 'Isolated Data',
                description: 'Each branch has completely separate data',
                icon: '🔒',
                benefits: ['Independent operations', 'No data mixing', 'Branch autonomy']
              },
              {
                value: 'hybrid',
                title: 'Hybrid Model',
                description: 'Choose what to share and what to isolate',
                icon: '⚖️',
                benefits: ['Flexible control', 'Best of both worlds', 'Custom per branch']
              }
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setFormData({ 
                  ...formData, 
                  data_isolation_mode: mode.value as any,
                  // Auto-configure based on mode
                  ...(mode.value === 'shared' && {
                    share_products: true,
                    share_customers: true,
                    share_inventory: true,
                    share_suppliers: true,
                    share_categories: true,
                    share_employees: true
                  }),
                  ...(mode.value === 'isolated' && {
                    share_products: false,
                    share_customers: false,
                    share_inventory: false,
                    share_suppliers: false,
                    share_categories: false,
                    share_employees: false
                  })
                })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.data_isolation_mode === mode.value
                    ? 'border-purple-500 bg-white shadow-lg'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="text-2xl mb-2">{mode.icon}</div>
                <div className="font-semibold text-gray-900 mb-1">{mode.title}</div>
                <div className="text-xs text-gray-600 mb-2">{mode.description}</div>
                <div className="space-y-1">
                  {mode.benefits.map((benefit, i) => (
                    <div key={i} className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="text-green-500">✓</span>
                      {benefit}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Hybrid Configuration */}
          {formData.data_isolation_mode === 'hybrid' && (
            <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
              <h5 className="font-medium text-gray-900 mb-3 text-sm">
                Configure What to Share
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'share_products', label: 'Products & Catalog', icon: '📦', description: 'Product catalog visible across branches' },
                  { key: 'share_customers', label: 'Customers', icon: '👥', description: 'Customer database shared' },
                  { key: 'share_inventory', label: 'Inventory', icon: '📊', description: 'Real-time inventory sync' },
                  { key: 'share_suppliers', label: 'Suppliers', icon: '🏭', description: 'Supplier contacts shared' },
                  { key: 'share_categories', label: 'Categories', icon: '📁', description: 'Product categories shared' },
                  { key: 'share_employees', label: 'Employees', icon: '👤', description: 'Staff can work at any branch' }
                ].map(({ key, label, icon, description }) => (
                  <div key={key} className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{icon}</span>
                        <span className="text-sm font-medium text-gray-900">{label}</span>
                      </div>
                      <p className="text-xs text-gray-600">{description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-2">
                      <input
                        type="checkbox"
                        checked={formData[key as keyof Store] as boolean}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transfer & Sync Options */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 text-orange-600 mr-2" />
            Transfer & Synchronization
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            {formData.allow_stock_transfer && (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Branch Configuration */}
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 text-cyan-600 mr-2" />
            Branch Configuration
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-700">Can View Other Branches</span>
                <p className="text-xs text-gray-500">Branch staff can view data from other branches</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.can_view_other_branches}
                  onChange={(e) => setFormData({ ...formData, can_view_other_branches: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Model</label>
              <select
                value={formData.pricing_model}
                onChange={(e) => setFormData({ ...formData, pricing_model: e.target.value as 'centralized' | 'location-specific' })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="centralized">Centralized Pricing (Same prices for all stores)</option>
                <option value="location-specific">Location-Specific Pricing</option>
              </select>
            </div>

            {formData.pricing_model === 'location-specific' && (
              <GlassInput
                label="Tax Rate Override (%)"
                type="number"
                step="0.01"
                value={formData.tax_rate_override || ''}
                onChange={(e) => setFormData({ ...formData, tax_rate_override: parseFloat(e.target.value) })}
                placeholder="Leave empty to use default tax rate"
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t-2 border-gray-300">
          <GlassButton
            onClick={handleSubmit}
            disabled={isSaving || !formData.name || !formData.code}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : (store.id ? 'Update Store' : 'Create Store')}
          </GlassButton>
          
          <GlassButton
            onClick={handleCancel}
            variant="outline"
            className="flex items-center gap-2 px-6 py-3"
            disabled={isSaving}
          >
            Cancel
          </GlassButton>
        </div>

        {/* Auto-Save Status Info */}
        {hasDraft && lastSavedDraft && (
          <div className="flex items-center justify-between text-xs bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-3 rounded-lg">
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
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Store & Branch Management</h2>
            <p className="text-sm text-gray-600">Manage your store locations and branches</p>
          </div>
        </div>
        {!showAddForm && !editingStore && (
          <GlassButton
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Store
          </GlassButton>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingStore) && (
        <div className="mb-6">
          <StoreForm
            store={editingStore || emptyStore}
            onSave={handleSaveStore}
            onCancel={() => {
              setShowAddForm(false);
              setEditingStore(null);
            }}
          />
        </div>
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
                        {store.data_isolation_mode === 'shared' ? '🌐 Shared Data' :
                         store.data_isolation_mode === 'isolated' ? '🔒 Isolated Data' :
                         '⚖️ Hybrid Model'}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {store.pricing_model === 'centralized' ? 'Centralized Pricing' : 'Location-Specific Pricing'}
                      </span>
                      {store.allow_stock_transfer && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          ✓ Stock Transfers
                        </span>
                      )}
                      {store.share_inventory && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                          📊 Shared Inventory
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
    </GlassCard>
  );
};

export default StoreManagementSettings;

