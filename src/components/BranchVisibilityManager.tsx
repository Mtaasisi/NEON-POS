import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Building2, Globe, Lock, Users, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface Branch {
  id: string;
  name: string;
  code: string;
  is_main: boolean;
}

interface BranchVisibilityManagerProps {
  itemId: string;
  itemType: 'product' | 'variant' | 'customer' | 'inventory';
  currentBranchId?: string;
  currentSharingMode?: 'isolated' | 'shared' | 'custom';
  currentVisibleBranches?: string[];
  onUpdate?: () => void;
}

const BranchVisibilityManager: React.FC<BranchVisibilityManagerProps> = ({
  itemId,
  itemType,
  currentBranchId,
  currentSharingMode = 'isolated',
  currentVisibleBranches = [],
  onUpdate
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sharingMode, setSharingMode] = useState<'isolated' | 'shared' | 'custom'>(currentSharingMode);
  const [selectedBranches, setSelectedBranches] = useState<string[]>(currentVisibleBranches);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    setSharingMode(currentSharingMode);
    setSelectedBranches(currentVisibleBranches);
  }, [currentSharingMode, currentVisibleBranches]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('store_locations')
        .select('id, name, code, is_main')
        .eq('is_active', true)
        .order('is_main', { ascending: false });

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const handleSharingModeChange = (mode: 'isolated' | 'shared' | 'custom') => {
    setSharingMode(mode);
    
    if (mode === 'isolated' && currentBranchId) {
      setSelectedBranches([currentBranchId]);
    } else if (mode === 'shared') {
      setSelectedBranches(branches.map(b => b.id));
    }
  };

  const toggleBranch = (branchId: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const tableName = {
        product: 'lats_products',
        variant: 'lats_product_variants',
        customer: 'customers',
        inventory: 'inventory_items'
      }[itemType];

      const updateData: any = {
        sharing_mode: sharingMode,
        visible_to_branches: sharingMode === 'shared' 
          ? branches.map(b => b.id)
          : selectedBranches,
        is_shared: sharingMode === 'shared'
      };

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Branch visibility updated successfully!');
      onUpdate?.();
    } catch (error) {
      console.error('Error updating branch visibility:', error);
      toast.error('Failed to update branch visibility');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">Loading branches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Branch Visibility Settings
        </h3>
        <p className="text-xs text-gray-600 mb-4">
          Control which branches can see this {itemType}
        </p>
      </div>

      {/* Sharing Mode Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Sharing Mode
        </label>
        
        <div className="space-y-2">
          {/* Isolated */}
          <button
            type="button"
            onClick={() => handleSharingModeChange('isolated')}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
              sharingMode === 'isolated'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {sharingMode === 'isolated' ? (
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-600" />
                <span className="font-medium text-gray-900">Isolated</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Only visible to the owner branch
              </p>
            </div>
          </button>

          {/* Shared */}
          <button
            type="button"
            onClick={() => handleSharingModeChange('shared')}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
              sharingMode === 'shared'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {sharingMode === 'shared' ? (
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-600" />
                <span className="font-medium text-gray-900">Shared to All</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Visible to all branches
              </p>
            </div>
          </button>

          {/* Custom */}
          <button
            type="button"
            onClick={() => handleSharingModeChange('custom')}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
              sharingMode === 'custom'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {sharingMode === 'custom' ? (
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-900">Custom Selection</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Choose specific branches
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Branch Selection (for custom mode) */}
      {sharingMode === 'custom' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Select Branches
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {branches.map(branch => (
              <button
                key={branch.id}
                type="button"
                onClick={() => toggleBranch(branch.id)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                  selectedBranches.includes(branch.id)
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : 'bg-white border-2 border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0">
                  {selectedBranches.includes(branch.id) ? (
                    <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{branch.name}</span>
                    {branch.is_main && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                        Main
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{branch.code}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600">
            Selected: {selectedBranches.length} of {branches.length} branches
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          {sharingMode === 'isolated' && '🔒 This item will only be visible to its owner branch'}
          {sharingMode === 'shared' && '🌐 This item will be visible to all branches'}
          {sharingMode === 'custom' && `👥 This item will be visible to ${selectedBranches.length} selected branch${selectedBranches.length !== 1 ? 'es' : ''}`}
        </p>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || (sharingMode === 'custom' && selectedBranches.length === 0)}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {saving ? 'Saving...' : 'Save Branch Visibility'}
      </button>
    </div>
  );
};

export default BranchVisibilityManager;

