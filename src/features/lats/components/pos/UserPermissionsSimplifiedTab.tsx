// Simplified User Permissions Tab with Simple/Advanced Mode
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Shield, Users, Lock, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import UniversalSettingsTab from './UniversalSettingsTab';
import { SettingsSection } from './UniversalFormComponents';
import { ToggleSwitch } from './UniversalFormComponents';
import toast from 'react-hot-toast';

export interface UserPermissionsSimplifiedTabRef {
  saveSettings: () => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
}

type UserRole = 'cashier' | 'manager' | 'admin' | 'custom';

interface SimplifiedPermissions {
  mode: 'simple' | 'advanced';
  defaultRole: UserRole;
  // Advanced permissions (only shown in advanced mode)
  customPermissions?: {
    enable_pos_access: boolean;
    enable_sales_access: boolean;
    enable_refunds_access: boolean;
    enable_discount_access: boolean;
    enable_inventory_view: boolean;
    enable_inventory_edit: boolean;
    enable_product_creation: boolean;
    enable_customer_view: boolean;
    enable_customer_creation: boolean;
    enable_daily_reports: boolean;
    enable_financial_reports: boolean;
    enable_settings_access: boolean;
    enable_user_management: boolean;
  };
}

const UserPermissionsSimplifiedTab = forwardRef<UserPermissionsSimplifiedTabRef>((props, ref) => {
  const [permissions, setPermissions] = useState<SimplifiedPermissions>({
    mode: 'simple',
    defaultRole: 'cashier',
    customPermissions: {
      enable_pos_access: true,
      enable_sales_access: true,
      enable_refunds_access: false,
      enable_discount_access: false,
      enable_inventory_view: true,
      enable_inventory_edit: false,
      enable_product_creation: false,
      enable_customer_view: true,
      enable_customer_creation: true,
      enable_daily_reports: false,
      enable_financial_reports: false,
      enable_settings_access: false,
      enable_user_management: false,
    }
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load settings from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('lats-pos-permissions');
      if (saved) {
        setPermissions(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('lats-pos-permissions', JSON.stringify(permissions));
      toast.success('Permissions saved successfully!');
      return true;
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const defaultPermissions: SimplifiedPermissions = {
      mode: 'simple',
      defaultRole: 'cashier',
      customPermissions: {
        enable_pos_access: true,
        enable_sales_access: true,
        enable_refunds_access: false,
        enable_discount_access: false,
        enable_inventory_view: true,
        enable_inventory_edit: false,
        enable_product_creation: false,
        enable_customer_view: true,
        enable_customer_creation: true,
        enable_daily_reports: false,
        enable_financial_reports: false,
        enable_settings_access: false,
        enable_user_management: false,
      }
    };
    setPermissions(defaultPermissions);
    localStorage.setItem('lats-pos-permissions', JSON.stringify(defaultPermissions));
    toast.success('Permissions reset to defaults');
    return true;
  };

  const handleRoleChange = (role: UserRole) => {
    setPermissions(prev => ({
      ...prev,
      defaultRole: role
    }));
  };

  const handlePermissionToggle = (key: keyof NonNullable<SimplifiedPermissions['customPermissions']>, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      customPermissions: {
        ...prev.customPermissions!,
        [key]: value
      }
    }));
  };

  // Expose save and reset functions through ref
  useImperativeHandle(ref, () => ({
    saveSettings: handleSave,
    resetSettings: handleReset
  }));

  const roleDescriptions = {
    cashier: {
      title: 'Cashier',
      description: 'Basic sales and customer service access',
      permissions: [
        '✓ Process sales',
        '✓ View products and prices',
        '✓ View inventory levels',
        '✓ Create/edit customers',
        '✗ Cannot issue refunds',
        '✗ Cannot access reports',
        '✗ Cannot change settings'
      ]
    },
    manager: {
      title: 'Manager',
      description: 'Full operational access with reports',
      permissions: [
        '✓ Everything Cashier can do',
        '✓ Process refunds',
        '✓ Apply discounts',
        '✓ Manage inventory',
        '✓ Create/edit products',
        '✓ View daily reports',
        '✗ Cannot access system settings',
        '✗ Cannot manage users'
      ]
    },
    admin: {
      title: 'Administrator',
      description: 'Complete system access',
      permissions: [
        '✓ Everything Manager can do',
        '✓ View financial reports',
        '✓ Access system settings',
        '✓ Manage users',
        '✓ Configure POS',
        '✓ Full access to all features'
      ]
    },
    custom: {
      title: 'Custom',
      description: 'Create your own permission set',
      permissions: [
        'Configure specific permissions',
        'Mix and match access levels',
        'Fine-grained control'
      ]
    }
  };

  return (
    <UniversalSettingsTab
      title="User Permissions"
      description="Control user access levels with simple role-based permissions or advanced custom settings"
      onSave={handleSave}
      onReset={handleReset}
      onCancel={() => {}}
      isLoading={isLoading}
      isSaving={isSaving}
      isDirty={false}
    >
      {/* Mode Toggle */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Permission Mode</h3>
                <p className="text-sm text-gray-600">
                  {permissions.mode === 'simple' 
                    ? 'Using Simple Mode - Easy role-based permissions'
                    : 'Using Advanced Mode - Custom granular permissions'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPermissions(prev => ({ 
                ...prev, 
                mode: prev.mode === 'simple' ? 'advanced' : 'simple' 
              }))}
              className="px-4 py-2 bg-white border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 font-medium transition-colors"
            >
              Switch to {permissions.mode === 'simple' ? 'Advanced' : 'Simple'} Mode
            </button>
          </div>
        </div>
      </div>

      {/* Simple Mode */}
      {permissions.mode === 'simple' && (
        <SettingsSection
          title="Simple Mode - Role-Based Permissions"
          description="Choose a pre-configured role for your users"
          icon={<Users className="w-5 h-5" />}
        >
          <div className="space-y-4">
            {/* Role Cards */}
            {(['cashier', 'manager', 'admin'] as UserRole[]).map((role) => (
              <div
                key={role}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  permissions.defaultRole === role
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 bg-white'
                }`}
                onClick={() => handleRoleChange(role)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="radio"
                        checked={permissions.defaultRole === role}
                        onChange={() => handleRoleChange(role)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {roleDescriptions[role].title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {roleDescriptions[role].description}
                        </p>
                      </div>
                    </div>
                    <ul className="ml-8 mt-3 space-y-1">
                      {roleDescriptions[role].permissions.map((perm, idx) => (
                        <li
                          key={idx}
                          className={`text-sm ${
                            perm.startsWith('✓') ? 'text-green-700' : 'text-gray-500'
                          }`}
                        >
                          {perm}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {permissions.defaultRole === role && (
                    <div className="px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded">
                      Selected
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Settings className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Simple Mode Benefits</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Quick setup - just pick a role</li>
                    <li>• Easy to understand and manage</li>
                    <li>• Best practices built-in</li>
                    <li>• Recommended for most businesses</li>
                  </ul>
                  <p className="text-sm text-blue-600 mt-2">
                    💡 Need more control? Switch to <strong>Advanced Mode</strong> for custom permissions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>
      )}

      {/* Advanced Mode */}
      {permissions.mode === 'advanced' && (
        <SettingsSection
          title="Advanced Mode - Custom Permissions"
          description="Fine-grained control over user permissions"
          icon={<Lock className="w-5 h-5" />}
        >
          <div className="space-y-6">
            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-amber-900 mb-1">⚠️ Advanced Mode</h4>
                  <p className="text-sm text-amber-700">
                    You're configuring custom permissions. Make sure you understand what each permission does to avoid security issues.
                  </p>
                </div>
              </div>
            </div>

            {/* POS Access */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                POS & Sales
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-7">
                <ToggleSwitch
                  label="Enable POS Access"
                  checked={permissions.customPermissions?.enable_pos_access ?? true}
                  onChange={(checked) => handlePermissionToggle('enable_pos_access', checked)}
                />
                <ToggleSwitch
                  label="Enable Sales Access"
                  checked={permissions.customPermissions?.enable_sales_access ?? true}
                  onChange={(checked) => handlePermissionToggle('enable_sales_access', checked)}
                />
                <ToggleSwitch
                  label="Process Refunds"
                  checked={permissions.customPermissions?.enable_refunds_access ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_refunds_access', checked)}
                />
                <ToggleSwitch
                  label="Apply Discounts"
                  checked={permissions.customPermissions?.enable_discount_access ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_discount_access', checked)}
                />
              </div>
            </div>

            {/* Inventory */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-green-600" />
                Inventory & Products
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-7">
                <ToggleSwitch
                  label="View Inventory"
                  checked={permissions.customPermissions?.enable_inventory_view ?? true}
                  onChange={(checked) => handlePermissionToggle('enable_inventory_view', checked)}
                />
                <ToggleSwitch
                  label="Edit Inventory"
                  checked={permissions.customPermissions?.enable_inventory_edit ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_inventory_edit', checked)}
                />
                <ToggleSwitch
                  label="Create Products"
                  checked={permissions.customPermissions?.enable_product_creation ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_product_creation', checked)}
                />
              </div>
            </div>

            {/* Customers */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Customers
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-7">
                <ToggleSwitch
                  label="View Customers"
                  checked={permissions.customPermissions?.enable_customer_view ?? true}
                  onChange={(checked) => handlePermissionToggle('enable_customer_view', checked)}
                />
                <ToggleSwitch
                  label="Create/Edit Customers"
                  checked={permissions.customPermissions?.enable_customer_creation ?? true}
                  onChange={(checked) => handlePermissionToggle('enable_customer_creation', checked)}
                />
              </div>
            </div>

            {/* Reports & Settings */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-600" />
                Reports & Administration
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-7">
                <ToggleSwitch
                  label="View Daily Reports"
                  checked={permissions.customPermissions?.enable_daily_reports ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_daily_reports', checked)}
                />
                <ToggleSwitch
                  label="View Financial Reports"
                  checked={permissions.customPermissions?.enable_financial_reports ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_financial_reports', checked)}
                />
                <ToggleSwitch
                  label="Access Settings"
                  checked={permissions.customPermissions?.enable_settings_access ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_settings_access', checked)}
                />
                <ToggleSwitch
                  label="Manage Users"
                  checked={permissions.customPermissions?.enable_user_management ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_user_management', checked)}
                />
              </div>
            </div>
          </div>
        </SettingsSection>
      )}
    </UniversalSettingsTab>
  );
});

UserPermissionsSimplifiedTab.displayName = 'UserPermissionsSimplifiedTab';

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(UserPermissionsSimplifiedTab);

