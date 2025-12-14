import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import GlassSelect from '../features/shared/components/ui/GlassSelect';
import { MapPin } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
  is_main: boolean;
  is_active: boolean;
}

interface BranchSelectorProps {
  value?: string;
  onChange: (branchId: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  allowMultiple?: boolean;
  className?: string;
  showMainBadge?: boolean;
}

const BranchSelector: React.FC<BranchSelectorProps> = ({
  value,
  onChange,
  label = 'Branch/Store',
  placeholder = 'Select branch',
  required = false,
  error,
  allowMultiple = false,
  className = '',
  showMainBadge = true
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('store_locations')
        .select('id, name, code, is_main, is_active')
        .eq('is_active', true)
        .order('is_main', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  };

  const branchOptions = branches.map(branch => ({
    value: branch.id,
    label: `${branch.name}${branch.code ? ` (${branch.code})` : ''}${showMainBadge && branch.is_main ? ' 🏢 Main' : ''}`
  }));

  if (isLoading) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
          <span className="text-gray-500 text-sm">Loading branches...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <GlassSelect
        label={label}
        placeholder={placeholder}
        value={value || ''}
        onChange={onChange}
        options={branchOptions}
        error={error}
        required={required}
        icon={<MapPin size={16} />}
      />
      {branches.length === 0 && (
        <p className="mt-1 text-xs text-orange-600">
          ⚠️ No active branches found. Please create a branch first in Settings → Store Management.
        </p>
      )}
    </div>
  );
};

export default BranchSelector;
