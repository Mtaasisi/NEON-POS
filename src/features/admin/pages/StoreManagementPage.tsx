import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Phone, 
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  Star,
  Settings,
  LayoutDashboard,
  Bug,
  Package,
  Truck,
  CreditCard,
  Globe,
  Code,
  FileText,
  Palette,
  Bell,
  Database,
  GitBranch,
  RotateCcw
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
  data_isolation_mode: 'shared' | 'isolated' | 'hybrid';
  share_products: boolean;
  share_customers: boolean;
  share_inventory: boolean;
  share_suppliers: boolean;
  share_categories: boolean;
  share_employees: boolean;
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
  share_gift_cards: boolean;
  share_quality_checks: boolean;
  share_recurring_expenses: boolean;
  share_communications: boolean;
  share_reports: boolean;
  share_finance_transfers: boolean;
  allow_stock_transfer: boolean;
  auto_sync_products: boolean;
  auto_sync_prices: boolean;
  require_approval_for_transfers: boolean;
  pricing_model: 'centralized' | 'location-specific';
  tax_rate_override?: number;
  can_view_other_branches: boolean;
  can_transfer_to_branches: string[];
}

const StoreManagementPage: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeSection, setActiveSection] = useState('stores');

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
    data_isolation_mode: 'hybrid',
    share_products: false,
    share_customers: false,
    share_inventory: false,
    share_suppliers: false,
    share_categories: false,
    share_employees: false,
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
    share_gift_cards: true,
    share_quality_checks: false,
    share_recurring_expenses: false,
    share_communications: false,
    share_reports: false,
    share_finance_transfers: false,
    allow_stock_transfer: true,
    auto_sync_products: true,
    auto_sync_prices: true,
    require_approval_for_transfers: false,
    pricing_model: 'centralized',
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
    if (!store.name || !store.code) {
      toast.error('Store name and code are required');
      return;
    }

    setSaving(true);
    try {
      const storeData = { ...store };
      
      if (Array.isArray(storeData.can_transfer_to_branches) && storeData.can_transfer_to_branches.length === 0) {
        delete storeData.can_transfer_to_branches;
      }
      
      if (store.id) {
        const { error } = await supabase
          .from('store_locations')
          .update(storeData)
          .eq('id', store.id);

        if (error) throw error;
        toast.success('Store updated successfully');
      } else {
        const { data, error } = await supabase
          .from('store_locations')
          .insert([storeData]);

        if (error) throw error;
        toast.success('Store created successfully');
      }

      setEditingStore(null);
      setShowAddForm(false);
      await loadStores();
    } catch (error: any) {
      console.error('Error saving store:', error);
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

  const handleSetAsMain = async (storeId: string, storeName: string) => {
    if (!confirm(`Are you sure you want to set "${storeName}" as the main branch?`)) {
      return;
    }

    try {
      const { error: unsetError } = await supabase
        .from('store_locations')
        .update({ is_main: false })
        .eq('is_main', true);

      if (unsetError) throw unsetError;

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

  const storeForForm = useMemo(() => {
    return editingStore || emptyStore;
  }, [editingStore?.id, showAddForm, emptyStore]);

  const handleFormCancel = useCallback(() => {
    setShowAddForm(false);
    setEditingStore(null);
  }, []);

  const sections = [
    { id: 'branding', label: 'Business Information', icon: Building2, color: 'indigo' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'blue' },
    { id: 'stores', label: 'Store Management', icon: MapPin, color: 'orange' },
    { id: 'branch-debug', label: 'Branch Isolation Debug', icon: Bug, color: 'red' },
    { id: 'inventory', label: 'Inventory', icon: Package, color: 'purple' },
    { id: 'shipping', label: 'Shipping Management', icon: Truck, color: 'cyan' },
    { id: 'payments', label: 'Payments', icon: CreditCard, color: 'green' },
    { id: 'attendance', label: 'Attendance', icon: Users, color: 'teal' },
    { id: 'loyalty', label: 'Loyalty Program', icon: Star, color: 'yellow' },
    { id: 'integrations', label: 'Integrations', icon: Globe, color: 'emerald' },
    { id: 'api-webhooks', label: 'API & Webhooks', icon: Code, color: 'pink' },
    { id: 'documents', label: 'Document Templates', icon: FileText, color: 'violet' },
    { id: 'appearance', label: 'Appearance', icon: Palette, color: 'rose' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'amber' },
    { id: 'database', label: 'Database', icon: Database, color: 'slate' },
    { id: 'branch-migration', label: 'Branch Migration', icon: GitBranch, color: 'sky' },
    { id: 'automation', label: 'Automation', icon: RotateCcw, color: 'lime' }
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    const colorMap: Record<string, { active: string; inactive: string }> = {
      indigo: { active: 'bg-indigo-50 border-indigo-300 text-indigo-700', inactive: 'hover:bg-indigo-50 hover:border-indigo-200' },
      blue: { active: 'bg-blue-50 border-blue-300 text-blue-700', inactive: 'hover:bg-blue-50 hover:border-blue-200' },
      orange: { active: 'bg-orange-50 border-orange-300 text-orange-700', inactive: 'hover:bg-orange-50 hover:border-orange-200' },
      red: { active: 'bg-red-50 border-red-300 text-red-700', inactive: 'hover:bg-red-50 hover:border-red-200' },
      purple: { active: 'bg-purple-50 border-purple-300 text-purple-700', inactive: 'hover:bg-purple-50 hover:border-purple-200' },
      cyan: { active: 'bg-cyan-50 border-cyan-300 text-cyan-700', inactive: 'hover:bg-cyan-50 hover:border-cyan-200' },
      green: { active: 'bg-green-50 border-green-300 text-green-700', inactive: 'hover:bg-green-50 hover:border-green-200' },
      teal: { active: 'bg-teal-50 border-teal-300 text-teal-700', inactive: 'hover:bg-teal-50 hover:border-teal-200' },
      yellow: { active: 'bg-yellow-50 border-yellow-300 text-yellow-700', inactive: 'hover:bg-yellow-50 hover:border-yellow-200' },
      emerald: { active: 'bg-emerald-50 border-emerald-300 text-emerald-700', inactive: 'hover:bg-emerald-50 hover:border-emerald-200' },
      pink: { active: 'bg-pink-50 border-pink-300 text-pink-700', inactive: 'hover:bg-pink-50 hover:border-pink-200' },
      violet: { active: 'bg-violet-50 border-violet-300 text-violet-700', inactive: 'hover:bg-violet-50 hover:border-violet-200' },
      rose: { active: 'bg-rose-50 border-rose-300 text-rose-700', inactive: 'hover:bg-rose-50 hover:border-rose-200' },
      amber: { active: 'bg-amber-50 border-amber-300 text-amber-700', inactive: 'hover:bg-amber-50 hover:border-amber-200' },
      slate: { active: 'bg-slate-50 border-slate-300 text-slate-700', inactive: 'hover:bg-slate-50 hover:border-slate-200' },
      sky: { active: 'bg-sky-50 border-sky-300 text-sky-700', inactive: 'hover:bg-sky-50 hover:border-sky-200' },
      lime: { active: 'bg-lime-50 border-lime-300 text-lime-700', inactive: 'hover:bg-lime-50 hover:border-lime-200' }
    };
    const classes = colorMap[color] || colorMap.indigo;
    return isActive ? classes.active : `border-gray-200 text-gray-700 ${classes.inactive}`;
  };

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: 'transparent' }}>
      <div className="max-w-7xl mx-auto">
        {/* Admin Settings Header - Matching SetPricingModal style */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 border-b border-gray-200">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Admin Settings</h1>
              <p className="text-sm text-gray-600">Manage system configuration, backend settings, and database connections</p>
            </div>
          </div>
        </div>

        {/* Unified Layout with Sidebar and Main Content - Matching SetPricingModal style */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar - Matching SetPricingModal style */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-4 sticky top-4 max-h-[calc(100vh-120px)]">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                Settings Categories
              </h3>
              <nav className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 sidebar-scrollbar">
                {sections.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all font-medium ${getColorClasses(section.color, isActive)}`}
                    >
                      <section.icon className={`w-5 h-5 ${isActive ? '' : 'text-gray-500'}`} />
                      <span className="text-sm">{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content Area - Matching SetPricingModal style */}
          <div className="lg:col-span-3">
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
                      onClick={() => setShowAddForm(true)}
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
                          {/* Store Header */}
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
                                onClick={() => {
                                  setEditingStore({ ...store });
                                }}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreManagementPage;

