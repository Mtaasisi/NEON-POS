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

  const handleSwitchBranch = (branchId: string) => {
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
    console.log('%c🔄 PAGE WILL RELOAD IN 500ms...', 'background: #ffcc00; color: black; font-weight: bold; padding: 5px;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ff0000; font-weight: bold;');
    
    toast.success(`Switching to ${branch.name}...`, { duration: 1500 });
    
    // 🔄 Reload page to refresh all data with new branch filter
    setTimeout(() => {
      console.log('%c🚀 RELOADING NOW!', 'background: #00ff00; color: black; font-size: 20px; padding: 10px;');
      window.location.reload();
    }, 500);
  };

  // Show for admin only
  if (currentUser?.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm ${
        isDark 
          ? 'bg-blue-600' 
          : 'bg-blue-600'
      } text-white ${className}`}>
        <div className="p-1 rounded bg-white/15">
          <Building2 className="w-3.5 h-3.5 text-white animate-pulse" />
        </div>
        <span className="text-xs font-medium text-white">Loading...</span>
      </div>
    );
  }

  const currentBranch = branches.find(b => b.id === currentBranchId);

  if (!currentBranch) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm ${
        isDark 
          ? 'bg-gray-600' 
          : 'bg-gray-500'
      } text-white ${className}`}>
        <div className="p-1 rounded bg-white/15">
          <Building2 className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs font-medium text-white">No branches</span>
      </div>
    );
  }

  // Always make it clickable - even with one branch, show option to add more
  // REMOVED: Static display for single branch
  // Now always shows as dropdown

  const getIsolationIcon = (mode?: string) => {
    if (mode === 'shared') return '🌐';
    if (mode === 'isolated') return '🔒';
    if (mode === 'hybrid') return '⚖️';
    return '🏪';
  };

  const getIsolationColor = (mode?: string) => {
    if (mode === 'shared') return 'text-blue-600';
    if (mode === 'isolated') return 'text-red-600';
    if (mode === 'hybrid') return 'text-purple-600';
    return 'text-gray-600';
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => {
          console.log('🖱️ Branch selector clicked!', { isOpen, branchesCount: branches.length });
          setIsOpen(!isOpen);
        }}
        className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 cursor-pointer ${
          isOpen ? 'shadow-md scale-105' : 'shadow-sm'
        } ${
          isDark 
            ? 'bg-blue-600 hover:bg-blue-500' 
            : 'bg-blue-600 hover:bg-blue-700'
        } text-white`}
        title="Click to switch branches"
      >
        {/* Icon with subtle animation on hover */}
        <div className="p-1 rounded transition-all bg-white/15 group-hover:bg-white/25">
          <Building2 className="w-3.5 h-3.5 text-white" />
        </div>
        
        {/* Branch Info */}
        <div className="flex flex-col items-start flex-1 min-w-0">
          <span className="text-xs font-semibold text-white truncate w-full leading-tight">
            {currentBranch.name}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-white/80">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{currentBranch.city}</span>
          </div>
        </div>
        
        {/* Chevron with smooth rotation */}
        <ChevronDown 
          className={`w-3.5 h-3.5 text-white/70 flex-shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className={`absolute top-full mt-2 right-0 w-80 rounded-lg shadow-xl border-2 z-50 max-h-96 overflow-auto ${
            isDark 
              ? 'bg-slate-800 border-blue-500' 
              : 'bg-white border-blue-300'
          }`}>
            {/* Header with flat blue */}
            <div className={`px-4 py-3 border-b ${
              isDark 
                ? 'bg-blue-600 border-blue-500' 
                : 'bg-blue-600 border-blue-500'
            }`}>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white" />
                <h3 className="text-xs font-bold uppercase text-white">
                  Switch Branch ({branches.length})
                </h3>
              </div>
            </div>
            
            <div className="p-2">
              
              {branches.map((branch) => {
                const isCurrent = branch.id === currentBranchId;
                const icon = getIsolationIcon(branch.data_isolation_mode);
                const color = getIsolationColor(branch.data_isolation_mode);

                return (
                  <button
                    key={branch.id}
                    onClick={() => handleSwitchBranch(branch.id)}
                    className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isCurrent
                        ? isDark 
                          ? 'bg-blue-900/30 border-2 border-blue-600' 
                          : 'bg-blue-50 border-2 border-blue-200'
                        : isDark
                          ? 'hover:bg-slate-700/50 border-2 border-transparent'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {isCurrent ? (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${
                          isCurrent 
                            ? isDark ? 'text-blue-300' : 'text-blue-900'
                            : isDark ? 'text-gray-200' : 'text-gray-900'
                        }`}>
                          {branch.name}
                        </span>
                        {branch.is_main && (
                          <span className={`px-1.5 py-0.5 text-xs font-semibold rounded ${
                            isDark 
                              ? 'bg-green-900/30 text-green-400' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            Main
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{branch.code}</span>
                        <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>•</span>
                        <div className="flex items-center gap-1">
                          <MapPin className={`w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{branch.city}</span>
                        </div>
                      </div>

                      {branch.data_isolation_mode && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-sm">{icon}</span>
                          <span className={`text-xs font-medium ${color}`}>
                            {branch.data_isolation_mode === 'shared' ? 'Shared' :
                             branch.data_isolation_mode === 'isolated' ? 'Isolated' :
                             'Hybrid'}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className={`border-t p-3 ${
              isDark 
                ? 'border-blue-500 bg-slate-900' 
                : 'border-blue-300 bg-gray-50'
            }`}>
              <div className="text-center space-y-2">
                <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {branches.length} branch{branches.length !== 1 ? 'es' : ''} available
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    window.location.href = '/admin-settings?section=stores';
                  }}
                  className="text-xs font-semibold flex items-center gap-1 mx-auto px-3 py-1.5 rounded-md transition-all bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Building2 className="w-3 h-3" />
                  Manage Stores
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SimpleBranchSelector;

