import React, { useState, useEffect } from 'react';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import { X, Save, Shield, Users, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PERMISSION_CATEGORIES } from '../../../lib/permissionUtils';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

interface RoleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onSave: (role: Role) => Promise<void>;
  mode: 'create' | 'edit';
}

const RoleEditorModal: React.FC<RoleEditorModalProps> = ({
  isOpen,
  onClose,
  role,
  onSave,
  mode
}) => {
  const [formData, setFormData] = useState<Partial<Role>>({
    name: '',
    description: '',
    permissions: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (role && mode === 'edit') {
      setFormData({
        name: role.name,
        description: role.description,
        permissions: [...role.permissions]
      });
      setSelectedPermissions(new Set(role.permissions));
    } else {
      setFormData({
        name: '',
        description: '',
        permissions: []
      });
      setSelectedPermissions(new Set());
    }
  }, [role, mode, isOpen]);

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Role name is required');
      return;
    }

    if (selectedPermissions.size === 0) {
      toast.error('At least one permission must be selected');
      return;
    }

    setIsSaving(true);
    try {
      const roleData: Role = {
        id: role?.id || `role_${Date.now()}`,
        name: formData.name,
        description: formData.description || '',
        permissions: Array.from(selectedPermissions),
        isSystem: role?.isSystem || false
      };

      await onSave(roleData);
      toast.success(`Role ${mode === 'create' ? 'created' : 'updated'} successfully`);
      onClose();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Failed to save role');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePermission = (permission: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permission)) {
      newSelected.delete(permission);
    } else {
      newSelected.add(permission);
    }
    setSelectedPermissions(newSelected);
  };

  const toggleCategory = (categoryPermissions: string[], checked: boolean) => {
    const newSelected = new Set(selectedPermissions);
    if (checked) {
      categoryPermissions.forEach(perm => newSelected.add(perm));
    } else {
      categoryPermissions.forEach(perm => newSelected.delete(perm));
    }
    setSelectedPermissions(newSelected);
  };

  const permissionCategories = [
    {
      id: 'devices',
      name: 'Device Management',
      permissions: PERMISSION_CATEGORIES.devices,
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'customers',
      name: 'Customer Management',
      permissions: PERMISSION_CATEGORIES.customers,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: <Users className="w-4 h-4" />
    },
    {
      id: 'inventory',
      name: 'Inventory Control',
      permissions: PERMISSION_CATEGORIES.inventory,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'pos',
      name: 'Point of Sale',
      permissions: PERMISSION_CATEGORIES.pos,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: <Check className="w-4 h-4" />
    },
    {
      id: 'reports',
      name: 'Reporting',
      permissions: PERMISSION_CATEGORIES.reports,
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: <AlertTriangle className="w-4 h-4" />
    },
    {
      id: 'settings',
      name: 'System Settings',
      permissions: PERMISSION_CATEGORIES.settings,
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'purchase_orders',
      name: 'Purchase Orders',
      permissions: PERMISSION_CATEGORIES.purchase_orders,
      color: 'bg-teal-100 text-teal-800 border-teal-200',
      icon: <Check className="w-4 h-4" />
    },
    {
      id: 'spare_parts',
      name: 'Spare Parts',
      permissions: PERMISSION_CATEGORIES.spare_parts,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: <Shield className="w-4 h-4" />
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <GlassCard className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {mode === 'create' ? 'Create New Role' : 'Edit Role'}
                </h2>
                <p className="text-sm text-gray-600">
                  {mode === 'create'
                    ? 'Define a new role with specific permissions'
                    : 'Modify role permissions and settings'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Basic Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter role name"
                  disabled={role?.isSystem}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of the role"
                />
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
            <div className="space-y-4">
              {permissionCategories.map(category => {
                const categoryPermissions = category.permissions;
                const selectedCount = categoryPermissions.filter(p => selectedPermissions.has(p)).length;
                const isAllSelected = selectedCount === categoryPermissions.length;
                const isPartialSelected = selectedCount > 0 && selectedCount < categoryPermissions.length;

                return (
                  <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${category.color}`}>
                          {category.icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          <p className="text-sm text-gray-600">{categoryPermissions.length} permissions</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {selectedCount}/{categoryPermissions.length} selected
                        </span>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isPartialSelected;
                          }}
                          onChange={(e) => toggleCategory(categoryPermissions, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-11">
                      {categoryPermissions.map(permission => (
                        <div key={permission} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.has(permission)}
                            onChange={() => togglePermission(permission)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {permission.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedPermissions.size} permission{selectedPermissions.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <GlassButton
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                loading={isSaving}
                icon={<Save className="w-4 h-4" />}
              >
                {mode === 'create' ? 'Create Role' : 'Save Changes'}
              </GlassButton>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default RoleEditorModal;
