import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  FileText, 
  TrendingUp, 
  Users, 
  Package, 
  CreditCard,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShoppingCart,
  BarChart3,
  UserPlus,
  MapPin,
  Check,
  RefreshCw,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useBranch } from '../../../context/BranchContext';
import { supabase } from '../../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useMobileOffline } from '../../../hooks/useMobileOffline';
import { isNativeApp } from '../../../utils/platformDetection';

const MobileMore: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch, availableBranches, switchBranch, loading: branchLoading } = useBranch();
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [showCacheStats, setShowCacheStats] = useState(false);
  
  // Offline functionality
  const {
    isOnline,
    isSyncing,
    isNativeApp: runningNative,
    syncNow,
    getCacheStats,
  } = useMobileOffline();
  
  const [cacheStats, setCacheStats] = useState<any>(null);
  
  // Stats state
  const [stats, setStats] = useState({
    sales: 0,
    clients: 0,
    products: 0,
    loading: true
  });

  // Fetch stats based on current branch
  useEffect(() => {
    if (currentBranch) {
      fetchStats();
    }
  }, [currentBranch]);

  // Load cache stats if native app
  useEffect(() => {
    if (runningNative) {
      loadCacheStats();
    }
  }, [runningNative]);

  const loadCacheStats = async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Error loading cache stats:', error);
    }
  };

  const handleManualSync = async () => {
    try {
      const success = await syncNow();
      if (success) {
        await loadCacheStats();
        toast.success('Data synced successfully!');
      } else {
        toast.error('Sync failed. Please try again.');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Sync error occurred');
    }
  };

  const fetchStats = async () => {
    if (!currentBranch) return;

    try {
      setStats(prev => ({ ...prev, loading: true }));

      // Fetch sales count for current branch
      const { count: salesCount, error: salesError } = await supabase
        .from('lats_sales')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', currentBranch.id);

      if (salesError) throw salesError;

      // Fetch clients count for current branch
      const { count: clientsCount, error: clientsError } = await supabase
        .from('lats_customers')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', currentBranch.id);

      if (clientsError) throw clientsError;

      // Fetch products count for current branch
      const { count: productsCount, error: productsError } = await supabase
        .from('lats_products')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', currentBranch.id);

      if (productsError) throw productsError;

      setStats({
        sales: salesCount || 0,
        clients: clientsCount || 0,
        products: productsCount || 0,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
      setStats(prev => ({ ...prev, loading: false }));
    }
  };
  
  const menuItems = [
    {
      section: 'MAIN',
      items: [
        { icon: TrendingUp, label: 'Analytics', path: '/mobile/analytics' },
        { icon: FileText, label: 'Invoices', path: '/mobile/invoices' },
        { icon: Users, label: 'Employees', path: '/mobile/employees' },
        { icon: Package, label: 'Suppliers', path: '/mobile/suppliers' }
      ]
    },
    {
      section: 'SETTINGS',
      items: [
        { icon: Settings, label: 'General Settings', path: '/mobile/settings' },
        { icon: CreditCard, label: 'Payment Methods', path: '/mobile/payments' },
        { icon: Bell, label: 'Notifications', path: '/mobile/notifications' }
      ]
    },
    {
      section: 'SUPPORT',
      items: [
        { icon: HelpCircle, label: 'Help & Support', path: '/mobile/help' },
        { icon: LogOut, label: 'Logout', path: '/logout', isDestructive: true }
      ]
    }
  ];

  // Quick action cards - simplified to match dashboard
  const quickActions = [
    { icon: ShoppingCart, label: 'New Sale', path: '/mobile/pos' },
    { icon: BarChart3, label: 'Reports', path: '/mobile/analytics' }
  ];

  const handleBranchSwitch = async (branchId: string) => {
    try {
      await switchBranch(branchId);
      setShowBranchSelector(false);
      // Stats will be automatically refreshed by the useEffect when currentBranch changes
    } catch (error) {
      console.error('Failed to switch branch:', error);
      toast.error('Failed to switch branch');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f2f2f7]">
      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-4 border-b border-gray-200">
        <h1 className="text-[34px] font-bold text-black tracking-tight" style={{ letterSpacing: '-0.5px' }}>More</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Profile Card - iOS 18 Style */}
        <div className="mx-4 mt-4 bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                <Users size={32} className="text-white" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h2 className="text-[20px] font-semibold text-gray-900">{currentUser?.email?.split('@')[0] || 'Admin User'}</h2>
                <p className="text-[15px] text-gray-500">{currentUser?.email || 'admin@latsepos.com'}</p>
              </div>
            </div>
            
            {/* Stats Grid - iOS 18 Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#f2f2f7] rounded-xl p-3 text-center">
                <div className="text-[20px] font-bold text-gray-900">
                  {stats.loading ? '...' : stats.sales}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">Sales</div>
              </div>
              <div className="bg-[#f2f2f7] rounded-xl p-3 text-center">
                <div className="text-[20px] font-bold text-gray-900">
                  {stats.loading ? '...' : stats.clients}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">Clients</div>
              </div>
              <div className="bg-[#f2f2f7] rounded-xl p-3 text-center">
                <div className="text-[20px] font-bold text-gray-900">
                  {stats.loading ? '...' : stats.products}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">Products</div>
              </div>
            </div>
          </div>
        </div>

        {/* Branch Selector Card - iOS 18 Style */}
        {!branchLoading && availableBranches.length > 0 && (
          <div className="mx-4 mt-4">
            <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
              CURRENT BRANCH
            </h3>
            <button
              onClick={() => setShowBranchSelector(true)}
              className="w-full bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
            >
              <div className="px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                    <MapPin size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <div className="text-[16px] font-semibold text-gray-900">
                      {currentBranch?.name || 'Select Branch'}
                    </div>
                    <div className="text-[13px] text-gray-500">
                      {currentBranch?.city || 'No branch selected'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {availableBranches.length > 1 && (
                    <span className="text-[11px] font-semibold text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                      {availableBranches.length} available
                    </span>
                  )}
                  <ChevronRight size={18} className="text-gray-400" strokeWidth={2.5} />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Offline Status & Sync - Only for Native App */}
        {runningNative && (
          <div className="mx-4 mt-4">
            <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
              OFFLINE MODE
            </h3>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {/* Connection Status */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-3">
                  {isOnline ? (
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                      <Wifi size={20} className="text-green-600" strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                      <WifiOff size={20} className="text-orange-600" strokeWidth={2.5} />
                    </div>
                  )}
                  <div>
                    <div className="text-[15px] font-semibold text-gray-900">
                      {isOnline ? 'Online' : 'Offline'}
                    </div>
                    <div className="text-[12px] text-gray-500">
                      {isOnline ? 'Connected to server' : 'Working offline'}
                    </div>
                  </div>
                </div>
                {isOnline && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>

              {/* Sync Button */}
              <button
                onClick={handleManualSync}
                disabled={isSyncing || !isOnline}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <RefreshCw 
                      size={20} 
                      className={`text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} 
                      strokeWidth={2.5} 
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-[15px] font-medium text-gray-900">
                      {isSyncing ? 'Syncing...' : 'Sync Data'}
                    </div>
                    <div className="text-[12px] text-gray-500">
                      {isSyncing ? 'Please wait' : 'Update offline data'}
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" strokeWidth={2.5} />
              </button>

              {/* Cache Stats Toggle */}
              <button
                onClick={() => setShowCacheStats(!showCacheStats)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <Database size={20} className="text-purple-600" strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <div className="text-[15px] font-medium text-gray-900">
                      Cache Statistics
                    </div>
                    <div className="text-[12px] text-gray-500">
                      View offline data status
                    </div>
                  </div>
                </div>
                <ChevronRight 
                  size={18} 
                  className={`text-gray-400 transition-transform ${showCacheStats ? 'rotate-90' : ''}`} 
                  strokeWidth={2.5} 
                />
              </button>

              {/* Cache Stats Details */}
              {showCacheStats && cacheStats && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="space-y-2">
                    {Object.entries(cacheStats).map(([key, value]: [string, any]) => {
                      if (key === 'pending_sales') {
                        return (
                          <div key={key} className="flex justify-between text-[13px]">
                            <span className="text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                            <span className="font-semibold text-orange-600">{value.count}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={key} className="flex justify-between text-[13px]">
                          <span className="text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                          <span className="font-semibold text-gray-900">{value.count || 0}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions - Simplified Flat Buttons */}
        <div className="px-4 mt-4">
          <div className="flex gap-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => navigate(action.path)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors text-[13px] font-medium shadow-sm"
                >
                  <Icon size={18} strokeWidth={2.5} />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Sections - iOS 18 Grouped Cards */}
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="px-4 mt-6">
            {/* Section Header */}
            <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
              {section.section}
            </h3>
            
            {/* Menu Items Card */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                const isLast = itemIndex === section.items.length - 1;
                return (
                  <button
                    key={itemIndex}
                    onClick={() => navigate(item.path)}
                    className={`w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                      !isLast ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        item.isDestructive ? 'bg-red-50' : 'bg-blue-50'
                      }`}>
                        <Icon 
                          size={18} 
                          className={item.isDestructive ? 'text-red-500' : 'text-blue-500'} 
                          strokeWidth={2.5} 
                        />
                      </div>
                      <span className={`text-[16px] ${item.isDestructive ? 'text-red-500' : 'text-gray-900'} font-normal`}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={`text-[10px] font-bold text-white ${item.badgeColor || 'bg-blue-500'} px-2 py-0.5 rounded-full`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-gray-400" strokeWidth={2.5} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Version Info */}
        <div className="px-4 py-8 text-center">
          <p className="text-[13px] text-gray-400 font-medium">LATS POS Mobile</p>
          <p className="text-[13px] text-gray-400 mt-1">Version 1.0.0</p>
        </div>
      </div>

      {/* Branch Selector Modal - iOS 18 Bottom Sheet Style */}
      {showBranchSelector && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={() => setShowBranchSelector(false)}
        >
          <div 
            className="w-full bg-white rounded-t-3xl max-h-[70vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-[20px] font-semibold text-gray-900 text-center">
                Select Branch
              </h2>
            </div>

            {/* Branch List */}
            <div className="flex-1 overflow-y-auto">
              {availableBranches.map((branch, index) => {
                const isSelected = currentBranch?.id === branch.id;
                const isLast = index === availableBranches.length - 1;
                
                return (
                  <button
                    key={branch.id}
                    onClick={() => handleBranchSwitch(branch.id)}
                    className={`w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                      !isLast ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSelected 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                          : 'bg-gray-100'
                      }`}>
                        <MapPin 
                          size={20} 
                          className={isSelected ? 'text-white' : 'text-gray-500'} 
                          strokeWidth={2.5} 
                        />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className={`text-[16px] font-semibold ${
                            isSelected ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {branch.name}
                          </span>
                          {branch.is_main && (
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                              MAIN
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-gray-500 flex items-center gap-2">
                          <span>{branch.city}</span>
                          {branch.code && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-[12px] font-mono">{branch.code}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Cancel Button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowBranchSelector(false)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl text-[16px] font-semibold text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMore;
