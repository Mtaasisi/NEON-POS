import React, { useState, useEffect } from 'react';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { X, Save, User, Shield, Check, AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PERMISSION_CATEGORIES, ROLE_PERMISSIONS } from '../../../lib/permissionUtils';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
  customPermissions: boolean;
}

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (userId: string, permissions: string[], customPermissions: boolean) => Promise<void>;
  availableRoles: { id: string; name: string; permissions: string[] }[];
}

// Permission display names mapping
const PERMISSION_DISPLAY_NAMES: Record<string, string> = {
  // General
  all: 'Full Access',
  view_dashboard: 'Dashboard Access',
  access_pos: 'POS Access',
  view_reports: 'View Reports',
  manage_settings: 'Manage Settings',

  // Inventory
  view_inventory: 'View Inventory',
  add_products: 'Add Products',
  edit_products: 'Edit Products',
  delete_products: 'Delete Products',
  adjust_stock: 'Adjust Stock',
  view_stock_history: 'View Stock History',

  // Customers
  view_customers: 'View Customers',
  add_customers: 'Add Customers',
  edit_customers: 'Edit Customers',
  delete_customers: 'Delete Customers',
  view_customer_history: 'View Customer History',

  // Devices
  view_devices: 'View Devices',
  add_devices: 'Add Devices',
  edit_devices: 'Edit Devices',
  spare_parts: 'Spare Parts',

  // Financial
  process_sales: 'Process Sales',
  process_refunds: 'Process Refunds',
  apply_discounts: 'Apply Discounts',
  financial_reports: 'Financial Reports',
  manage_pricing: 'Manage Pricing',
  view_payments: 'View Payments',

  // User Management
  view_users: 'View Users',
  create_users: 'Create Users',
  edit_users: 'Edit Users',
  delete_users: 'Delete Users',
  manage_roles: 'Manage Roles',

  // System Admin
  view_audit_logs: 'View Audit Logs',
  backup_data: 'Backup Data',
  restore_data: 'Restore Data',
  manage_integrations: 'Manage Integrations',
  database_setup: 'Database Setup',

  // Additional
  appointments: 'Appointments',
  whatsapp_integration: 'WhatsApp Integration',
  sms_features: 'SMS Features',
  loyalty_program: 'Loyalty Program',
  employee_management: 'Employee Management'
};

const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  availableRoles
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isCustomPermissions, setIsCustomPermissions] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setSelectedPermissions(new Set(user.permissions));
      setIsCustomPermissions(user.customPermissions);
      setSelectedRole(user.role);
    }
  }, [user, isOpen]);

  const handleRoleChange = (roleId: string) => {
    setSelectedRole(roleId);
    if (!isCustomPermissions) {
      // If not using custom permissions, update to role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[roleId as keyof typeof ROLE_PERMISSIONS] || [];
      setSelectedPermissions(new Set(rolePermissions));
    }
  };

  const handleCustomPermissionsToggle = (custom: boolean) => {
    setIsCustomPermissions(custom);
    if (!custom && selectedRole) {
      // Reset to role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[selectedRole as keyof typeof ROLE_PERMISSIONS] || [];
      setSelectedPermissions(new Set(rolePermissions));
    }
  };

  const togglePermission = (permission: string) => {
    if (!isCustomPermissions) {
      setIsCustomPermissions(true);
    }
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permission)) {
      newSelected.delete(permission);
    } else {
      newSelected.add(permission);
    }
    setSelectedPermissions(newSelected);
  };

  const toggleCategory = (categoryPermissions: string[], checked: boolean) => {
    if (!isCustomPermissions) {
      setIsCustomPermissions(true);
    }
    const newSelected = new Set(selectedPermissions);
    if (checked) {
      categoryPermissions.forEach(perm => newSelected.add(perm));
    } else {
      categoryPermissions.forEach(perm => newSelected.delete(perm));
    }
    setSelectedPermissions(newSelected);
  };

  const resetToRoleDefaults = () => {
    if (selectedRole) {
      const rolePermissions = ROLE_PERMISSIONS[selectedRole as keyof typeof ROLE_PERMISSIONS] || [];
      setSelectedPermissions(new Set(rolePermissions));
      setIsCustomPermissions(false);
      toast.success(`Reset to ${selectedRole} role permissions`);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await onSave(user.id, Array.from(selectedPermissions), isCustomPermissions);
      toast.success('User permissions updated successfully');
      onClose();
    } catch (error) {
      console.error('Error saving user permissions:', error);
      toast.error('Failed to update user permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const permissionCategories = [
    {
      id: 'general',
      name: 'General Access',
      permissions: PERMISSION_CATEGORIES.general,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'inventory',
      name: 'Inventory Management',
      permissions: PERMISSION_CATEGORIES.inventory,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'customers',
      name: 'Customer Management',
      permissions: PERMISSION_CATEGORIES.customers,
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <User className="w-4 h-4" />
    },
    {
      id: 'devices',
      name: 'Device & Repair Management',
      permissions: PERMISSION_CATEGORIES.devices,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'financial',
      name: 'Financial Operations',
      permissions: PERMISSION_CATEGORIES.financial,
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: <Check className="w-4 h-4" />
    },
    {
      id: 'user_management',
      name: 'User Management',
      permissions: PERMISSION_CATEGORIES.user_management,
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: <User className="w-4 h-4" />
    },
    {
      id: 'system_admin',
      name: 'System Administration',
      permissions: PERMISSION_CATEGORIES.system_admin,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'additional',
      name: 'Additional Features',
      permissions: PERMISSION_CATEGORIES.additional,
      color: 'bg-teal-100 text-teal-800 border-teal-200',
      icon: <Check className="w-4 h-4" />
    }
  ];

  if (!isOpen || !user) return null;

  const rolePermissions = selectedRole ? ROLE_PERMISSIONS[selectedRole as keyof typeof ROLE_PERMISSIONS] || [] : [];
  const hasChanges = isCustomPermissions || JSON.stringify(Array.from(selectedPermissions).sort()) !== JSON.stringify(rolePermissions.sort());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <GlassCard className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit User Permissions</h2>
                <p className="text-sm text-gray-600">{user.full_name} ({user.email})</p>
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
          {/* Role Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Role
                </label>
                <GlassSelect
                  options={availableRoles.map(role => ({
                    value: role.id,
                    label: role.name
                  }))}
                  value={selectedRole}
                  onChange={handleRoleChange}
                  placeholder="Select role"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permission Mode
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!isCustomPermissions}
                      onChange={() => handleCustomPermissionsToggle(false)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Role-based</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={isCustomPermissions}
                      onChange={() => handleCustomPermissionsToggle(true)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Custom permissions</span>
                  </label>
                </div>
              </div>
            </div>

            {selectedRole && !isCustomPermissions && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Role-based Permissions</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This user will inherit all permissions from the {selectedRole} role.
                      Changes to the role will automatically apply to this user.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isCustomPermissions && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <h4 className="font-medium text-orange-900">Custom Permissions</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        This user has custom permissions that may differ from their role.
                        Changes to the role will not affect this user.
                      </p>
                    </div>
                    <GlassButton
                      variant="outline"
                      size="sm"
                      onClick={resetToRoleDefaults}
                      icon={<RotateCcw className="w-4 h-4" />}
                      className="text-orange-700 border-orange-300 hover:bg-orange-100"
                    >
                      Reset to Role
                    </GlassButton>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Permissions Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Configure Permissions</h3>
              <GlassButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPermissions(new Set(['all']));
                  setIsCustomPermissions(true);
                }}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Grant Full Access
              </GlassButton>
            </div>

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
                          <p className="text-sm text-gray-600">{selectedCount}/{categoryPermissions.length}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isPartialSelected;
                        }}
                        onChange={(e) => toggleCategory(categoryPermissions, e.target.checked)}
                        disabled={!isCustomPermissions}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-11">
                      {categoryPermissions.map(permission => (
                        <div key={permission} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.has(permission)}
                            onChange={() => togglePermission(permission)}
                            disabled={!isCustomPermissions}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className={`text-sm ${!isCustomPermissions ? 'text-gray-500' : 'text-gray-700'}`}>
                            {PERMISSION_DISPLAY_NAMES[permission] || permission.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {isCustomPermissions && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Custom permissions configured</strong> - This user has {selectedPermissions.size} permission{selectedPermissions.size !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedPermissions.size} permission{selectedPermissions.size !== 1 ? 's' : ''} selected
              {hasChanges && (
                <span className="ml-2 text-orange-600 font-medium">(unsaved changes)</span>
              )}
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
                Save Permissions
              </GlassButton>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default UserPermissionsModal;
