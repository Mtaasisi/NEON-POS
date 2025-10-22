import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getCurrentBranchId } from '../lib/branchAwareApi';
import { useTheme } from '../context/ThemeContext';

interface Branch {
  id: string;
  name: string;
  code: string;
  city?: string;
  is_main: boolean;
}

interface DashboardBranchFilterProps {
  onBranchChange: (branchId: string | null) => void;
  defaultToCurrent?: boolean;
  className?: string;
}

export const DashboardBranchFilter: React.FC<DashboardBranchFilterProps> = ({
  onBranchChange,
  defaultToCurrent = true,
  className = ''
}) => {
  const { isDark } = useTheme();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('store_locations')
        .select('id, name, code, city, is_main')
        .eq('is_active', true)
        .order('is_main', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;

      setBranches(data || []);

      // Set default selection
      if (defaultToCurrent) {
        const currentBranchId = getCurrentBranchId();
        setSelectedBranchId(currentBranchId);
        onBranchChange(currentBranchId);
      } else {
        setSelectedBranchId(null);
        onBranchChange(null);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchSelect = (branchId: string | null) => {
    setSelectedBranchId(branchId);
    onBranchChange(branchId);
    setIsOpen(false);
  };

  const getSelectedBranchName = () => {
    if (!selectedBranchId) {
      return 'All Branches';
    }
    const branch = branches.find(b => b.id === selectedBranchId);
    return branch ? `${branch.name} ${branch.code ? `(${branch.code})` : ''}` : 'Select Branch';
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
        isDark 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white border-slate-200'
      } ${className}`}>
        <Building2 className="w-5 h-5 text-slate-400" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
          isDark
            ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
      >
        <Building2 className="w-5 h-5" />
        <span className="text-sm font-medium">{getSelectedBranchName()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`absolute right-0 top-full mt-2 w-64 rounded-lg border shadow-lg z-50 max-h-96 overflow-y-auto ${
              isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-white border-slate-200'
            }`}
          >
            {/* All Branches Option */}
            <button
              onClick={() => handleBranchSelect(null)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                selectedBranchId === null
                  ? isDark
                    ? 'bg-indigo-900/30 text-indigo-300'
                    : 'bg-indigo-50 text-indigo-700'
                  : isDark
                  ? 'hover:bg-slate-700 text-slate-200'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5" />
                <div>
                  <div className="font-medium text-sm">All Branches</div>
                  <div className={`text-xs ${
                    selectedBranchId === null
                      ? 'text-indigo-400'
                      : 'text-slate-500'
                  }`}>
                    View combined data from all locations
                  </div>
                </div>
              </div>
              {selectedBranchId === null && (
                <Check className="w-5 h-5 text-indigo-500" />
              )}
            </button>

            <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`} />

            {/* Individual Branches */}
            {branches.map(branch => (
              <button
                key={branch.id}
                onClick={() => handleBranchSelect(branch.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  selectedBranchId === branch.id
                    ? isDark
                      ? 'bg-indigo-900/30 text-indigo-300'
                      : 'bg-indigo-50 text-indigo-700'
                    : isDark
                    ? 'hover:bg-slate-700 text-slate-200'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5" />
                  <div>
                    <div className="font-medium text-sm">
                      {branch.name}
                      {branch.is_main && (
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                          isDark
                            ? 'bg-yellow-900/30 text-yellow-400'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          Main
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${
                      selectedBranchId === branch.id
                        ? 'text-indigo-400'
                        : 'text-slate-500'
                    }`}>
                      {branch.code && `${branch.code} • `}{branch.city || 'Location'}
                    </div>
                  </div>
                </div>
                {selectedBranchId === branch.id && (
                  <Check className="w-5 h-5 text-indigo-500" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

