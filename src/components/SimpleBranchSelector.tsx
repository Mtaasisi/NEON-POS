import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Building2, ChevronDown, Check, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface SimpleBranch {
  id: string;
  name: string;
  code: string;
  city: string;
  is_main: boolean;
  data_isolation_mode?: string;
}

const SimpleBranchSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const [branches, setBranches] = useState<SimpleBranch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      console.log('🏪 Loading branches...');
      const { data, error } = await supabase
        .from('store_locations')
        .select('id, name, code, city, is_main, data_isolation_mode, is_active')
        .eq('is_active', true)
        .order('is_main', { ascending: false });

      if (error) {
        console.error('Error loading branches:', error);
        setLoading(false);
        return;
      }

      console.log('✅ Branches loaded:', data);
      setBranches(data || []);
      
      // Set current branch
      const storedId = localStorage.getItem('current_branch_id');
      const mainBranch = data?.find(b => b.is_main);
      const initialBranch = data?.find(b => b.id === storedId) || mainBranch || data?.[0];
      
      if (initialBranch) {
        setCurrentBranchId(initialBranch.id);
        
        // 🔥 FIX: Save branch ID to localStorage on initialization
        localStorage.setItem('current_branch_id', initialBranch.id);
        console.log('📍 [SimpleBranchSelector] Initialized branch:', initialBranch.name, initialBranch.id);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to load branches:', err);
      setLoading(false);
    }
  };

  const handleSwitchBranch = async (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;

    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ff0000; font-weight: bold;');
    console.log('%c🔄 BRANCH SWITCH INITIATED', 'background: #ff0000; color: white; font-size: 16px; font-weight: bold; padding: 5px;');
    console.log('%c   Old Branch:', 'color: #ff0000;', localStorage.getItem('current_branch_id'));
    console.log('%c   New Branch:', 'color: #00cc00; font-weight: bold;', branchId);
    console.log('%c   New Branch Name:', 'color: #00cc00; font-weight: bold;', branch.name);

    setCurrentBranchId(branchId);
    localStorage.setItem('current_branch_id', branchId);
    setIsOpen(false);
    
    console.log('%c✅ localStorage updated!', 'color: #00cc00;');
    
    // 🔥 Clear cache for branch-specific data
    try {
      console.log('%c🗑️ Clearing cache for branch-specific data...', 'color: #ff9900; font-weight: bold;');
      const { smartCache } = await import('../lib/enhancedCacheManager');
      await Promise.all([
        smartCache.invalidateCache('products'),
        smartCache.invalidateCache('customers'),
        smartCache.invalidateCache('sales'),
      ]);
      console.log('%c✅ Cache cleared!', 'color: #00cc00; font-weight: bold;');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
    
    console.log('%c🔄 PAGE WILL RELOAD IN 500ms...', 'background: #ffcc00; color: black; font-weight: bold; padding: 5px;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ff0000; font-weight: bold;');
    
    toast.success(`Switching to ${branch.name}...`, { duration: 1500 });
    
    // 🔄 Reload page to refresh all data with new branch filter
    setTimeout(() => {
      console.log('%c🚀 RELOADING NOW!', 'background: #00ff00; color: black; font-size: 20px; padding: 10px;');
      window.location.reload();
    }, 500);
  };

  // Show for users with branch switching permissions
  const canSwitchBranches = currentUser?.role === 'admin' ||
    currentUser?.permissions?.includes('all') ||
    currentUser?.permissions?.includes('manage_branches') ||
    currentUser?.permissions?.includes('switch_branches');

  if (!canSwitchBranches) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl shadow-sm border backdrop-blur-sm transition-all ${
        isDark 
          ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600' 
          : 'bg-white/80 hover:bg-white border-gray-200'
      } ${className}`}>
        <Building2 className={`w-4 h-4 animate-pulse ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</span>
      </div>
    );
  }

  const currentBranch = branches.find(b => b.id === currentBranchId);

  if (!currentBranch) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl shadow-sm border backdrop-blur-sm ${
        isDark 
          ? 'bg-slate-800/60 border-slate-600' 
          : 'bg-white/80 border-gray-200'
      } ${className}`}>
        <Building2 className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No branches</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative group">
        <button
          onClick={() => {
            console.log('🖱️ Branch selector clicked!', { isOpen, branchesCount: branches.length });
            setIsOpen(!isOpen);
          }}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer backdrop-blur-sm border shadow-sm hover:shadow-md ${
            isDark 
              ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600' 
              : 'bg-white/80 hover:bg-white border-gray-200'
          }`}
        >
          {/* Branch Icon */}
          <Building2 className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-200' : 'text-gray-700'}`} />
          
          {/* Branch Name */}
          <span className={`text-sm font-medium truncate ${
            isDark ? 'text-gray-200' : 'text-gray-700'
          }`}>
            {currentBranch.name}
          </span>
          
          {/* Chevron with smooth rotation */}
          <ChevronDown 
            className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            } ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {/* Tooltip with tail */}
        <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 ${
          isDark ? 'bg-slate-800/95 border-slate-600/50 text-gray-200' : 'bg-white/95 border-gray-200/50 text-gray-700'
        } backdrop-blur-sm border text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 pointer-events-none`}>
          {/* Tail/Arrow pointing up */}
          <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent ${
            isDark ? 'border-b-slate-800/95' : 'border-b-white/95'
          }`}></div>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">{currentBranch.name}</span>
            <div className="flex items-center gap-1 text-[10px]">
              <MapPin className={`w-2.5 h-2.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{currentBranch.city}</span>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className={`absolute top-full mt-2 right-0 w-80 rounded-xl shadow-xl border z-50 max-h-96 overflow-auto backdrop-blur-xl ${
            isDark 
              ? 'bg-slate-800/95 border-slate-700/60' 
              : 'bg-white/95 border-gray-200/60'
          }`}>
            {/* Header */}
            <div className={`px-4 py-3 border-b ${
              isDark 
                ? 'border-slate-700' 
                : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                    Branches
                  </h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {branches.length}
                </span>
              </div>
            </div>
            
            <div className="p-3 space-y-1">
              {branches.map((branch) => {
                const isCurrent = branch.id === currentBranchId;

                return (
                  <button
                    key={branch.id}
                    onClick={() => handleSwitchBranch(branch.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isCurrent
                        ? isDark 
                          ? 'bg-blue-600/20 border border-blue-500' 
                          : 'bg-blue-50 border border-blue-200'
                        : isDark
                          ? 'hover:bg-slate-700/50 border border-transparent'
                          : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isCurrent ? (
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          isDark ? 'bg-blue-500' : 'bg-blue-600'
                        }`}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <div className={`w-4 h-4 border-2 rounded-full ${
                          isDark ? 'border-gray-600' : 'border-gray-300'
                        }`} />
                      )}
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${
                          isCurrent 
                            ? isDark ? 'text-blue-300' : 'text-blue-700'
                            : isDark ? 'text-gray-200' : 'text-gray-900'
                        }`}>
                          {branch.name}
                        </span>
                        {branch.is_main && (
                          <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md ${
                            isDark 
                              ? 'bg-emerald-900/30 text-emerald-400' 
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            MAIN
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MapPin className={`w-2.5 h-2.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {branch.city}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className={`border-t px-4 py-3 ${
              isDark 
                ? 'border-slate-700' 
                : 'border-gray-200'
            }`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  window.location.href = '/admin-settings?section=stores';
                }}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium text-sm ${
                  isDark
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Manage Stores
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SimpleBranchSelector;

