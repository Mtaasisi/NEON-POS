// Simplified User Permissions Tab with Simple/Advanced Mode
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Shield, Users, Lock, Settings, Check, X as XIcon } from 'lucide-react';
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
        { text: 'Process sales', allowed: true },
        { text: 'View products and prices', allowed: true },
        { text: 'View inventory levels', allowed: true },
        { text: 'Create/edit customers', allowed: true },
        { text: 'Cannot issue refunds', allowed: false },
        { text: 'Cannot access reports', allowed: false },
        { text: 'Cannot change settings', allowed: false }
      ]
    },
    manager: {
      title: 'Manager',
      description: 'Full operational access with reports',
      permissions: [
        { text: 'Everything Cashier can do', allowed: true },
        { text: 'Process refunds', allowed: true },
        { text: 'Apply discounts', allowed: true },
        { text: 'Manage inventory', allowed: true },
        { text: 'Create/edit products', allowed: true },
        { text: 'View daily reports', allowed: true },
        { text: 'Cannot access system settings', allowed: false },
        { text: 'Cannot manage users', allowed: false }
      ]
    },
    admin: {
      title: 'Administrator',
      description: 'Complete system access',
      permissions: [
        { text: 'Everything Manager can do', allowed: true },
        { text: 'View financial reports', allowed: true },
        { text: 'Access system settings', allowed: true },
        { text: 'Manage users', allowed: true },
        { text: 'Configure POS', allowed: true },
        { text: 'Full access to all features', allowed: true }
      ]
    },
    custom: {
      title: 'Custom',
      description: 'Create your own permission set',
      permissions: [
        { text: 'Configure specific permissions', allowed: true },
        { text: 'Mix and match access levels', allowed: true },
        { text: 'Fine-grained control', allowed: true }
      ]
    }
  };

  return (
    <UniversalSettingsTab
      isLoading={isLoading}
    >
      {/* Mode Toggle */}
      <SettingsSection
        title="Permission Mode"
        icon={<Shield className="w-5 h-5" />}
        helpText="Choose between simple role-based permissions or advanced custom permissions."
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Use Simple Mode</h4>
            <p className="text-sm text-gray-500">Quick role-based permissions vs. custom granular control</p>
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
      </SettingsSection>

      {/* Simple Mode */}
      {permissions.mode === 'simple' && (
        <SettingsSection
          title="Role-Based Permissions"
          icon={<Users className="w-5 h-5" />}
          helpText="Choose a pre-configured role with built-in permission sets. Best for most businesses."
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
                          className="text-sm flex items-start gap-2"
                        >
                          {perm.allowed ? (
                            <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          )}
                          <span className={perm.allowed ? 'text-green-700' : 'text-gray-500'}>
                            {perm.text}
                          </span>
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

          </div>
        </SettingsSection>
      )}

      {/* Advanced Mode */}
      {permissions.mode === 'advanced' && (
        <SettingsSection
          title="Custom Permissions"
          icon={<Lock className="w-5 h-5" />}
          helpText="Fine-grained control over user permissions. Make sure you understand what each permission does to avoid security issues."
        >

            {/* POS Access */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                POS & Sales
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToggleSwitch
                  id="perm_pos_access"
                  label="Enable POS Access"
                  checked={permissions.customPermissions?.enable_pos_access ?? true}
                  onChange={(checked) => handlePermissionToggle('enable_pos_access', checked)}
                  helpText="Allow user to access the POS system."
                />
                <ToggleSwitch
                  id="perm_sales_access"
                  label="Enable Sales Access"
                  checked={permissions.customPermissions?.enable_sales_access ?? true}
                  onChange={(checked) => handlePermissionToggle('enable_sales_access', checked)}
                  helpText="Allow user to make sales transactions."
                />
                <ToggleSwitch
                  id="perm_refunds_access"
                  label="Process Refunds"
                  checked={permissions.customPermissions?.enable_refunds_access ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_refunds_access', checked)}
                  helpText="Allow user to process customer refunds."
                />
                <ToggleSwitch
                  id="perm_discount_access"
                  label="Apply Discounts"
                  checked={permissions.customPermissions?.enable_discount_access ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_discount_access', checked)}
                  helpText="Allow user to apply discounts to sales."
                />
              </div>
            </div>

            {/* Inventory */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-green-600" />
                Inventory & Products
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToggleSwitch
                  id="perm_inventory_view"
                  label="View Inventory"
                  checked={permissions.customPermissions?.enable_inventory_view ?? true}
                  onChange={(checked) => handlePermissionToggle('enable_inventory_view', checked)}
                  helpText="View inventory levels and product information."
                />
                <ToggleSwitch
                  id="perm_inventory_edit"
                  label="Edit Inventory"
                  checked={permissions.customPermissions?.enable_inventory_edit ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_inventory_edit', checked)}
                  helpText="Update stock quantities and inventory data."
                />
                <ToggleSwitch
                  id="perm_product_creation"
                  label="Create Products"
                  checked={permissions.customPermissions?.enable_product_creation ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_product_creation', checked)}
                  helpText="Add new products to the system."
                />
              </div>
            </div>

            {/* Customers */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Customers
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToggleSwitch
                  id="perm_customer_view"
                  label="View Customers"
                  checked={permissions.customPermissions?.enable_customer_view ?? true}
                  onChange={(checked) => handlePermissionToggle('enable_customer_view', checked)}
                  helpText="View customer information and history."
                />
                <ToggleSwitch
                  id="perm_customer_creation"
                  label="Create/Edit Customers"
                  checked={permissions.customPermissions?.enable_customer_creation ?? true}
                  onChange={(checked) => handlePermissionToggle('enable_customer_creation', checked)}
                  helpText="Add and update customer records."
                />
              </div>
            </div>

            {/* Reports & Settings */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-600" />
                Reports & Administration
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToggleSwitch
                  id="perm_daily_reports"
                  label="View Daily Reports"
                  checked={permissions.customPermissions?.enable_daily_reports ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_daily_reports', checked)}
                  helpText="Access daily sales and activity reports."
                />
                <ToggleSwitch
                  id="perm_financial_reports"
                  label="View Financial Reports"
                  checked={permissions.customPermissions?.enable_financial_reports ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_financial_reports', checked)}
                  helpText="View financial reports and analytics."
                />
                <ToggleSwitch
                  id="perm_settings_access"
                  label="Access Settings"
                  checked={permissions.customPermissions?.enable_settings_access ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_settings_access', checked)}
                  helpText="Access and modify system settings."
                />
                <ToggleSwitch
                  id="perm_user_management"
                  label="Manage Users"
                  checked={permissions.customPermissions?.enable_user_management ?? false}
                  onChange={(checked) => handlePermissionToggle('enable_user_management', checked)}
                  helpText="Add, edit, and remove user accounts."
                />
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

