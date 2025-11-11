import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import GlassInput from '../../shared/components/ui/GlassInput';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { 
  User, Mail, Phone, Shield, Eye, EyeOff, X, UserPlus, Building2, MapPin, Lock, CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAllBranches } from '../../../lib/userBranchApi';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

// Comprehensive list of all available permissions
export const ALL_PERMISSIONS = {
  // General Permissions
  general: {
    label: 'General Access',
    permissions: [
      { id: 'all', name: 'Full Access', description: 'Complete system access (Admin only)' },
      { id: 'dashboard', name: 'Dashboard Access', description: 'View dashboard and analytics' },
      { id: 'pos', name: 'POS Access', description: 'Access point of sale system' },
      { id: 'reports', name: 'View Reports', description: 'View business reports' },
      { id: 'settings', name: 'Manage Settings', description: 'Manage system settings' },
    ]
  },
  // Inventory Permissions
  inventory: {
    label: 'Inventory Management',
    permissions: [
      { id: 'inventory_view', name: 'View Inventory', description: 'View inventory levels and products' },
      { id: 'inventory_add', name: 'Add Products', description: 'Add new products to inventory' },
      { id: 'inventory_edit', name: 'Edit Products', description: 'Modify existing products' },
      { id: 'inventory_delete', name: 'Delete Products', description: 'Remove products from inventory' },
      { id: 'inventory_adjust', name: 'Adjust Stock', description: 'Adjust stock levels' },
      { id: 'inventory_history', name: 'View Stock History', description: 'View stock movement history' },
    ]
  },
  // Customer Permissions
  customers: {
    label: 'Customer Management',
    permissions: [
      { id: 'customers_view', name: 'View Customers', description: 'View customer information' },
      { id: 'customers_add', name: 'Add Customers', description: 'Create new customers' },
      { id: 'customers_edit', name: 'Edit Customers', description: 'Modify customer details' },
      { id: 'customers_delete', name: 'Delete Customers', description: 'Remove customers' },
      { id: 'customers_history', name: 'View Customer History', description: 'View customer purchase history' },
    ]
  },
  // Device & Repair Permissions
  devices: {
    label: 'Device & Repair Management',
    permissions: [
      { id: 'devices_view', name: 'View Devices', description: 'View device repairs' },
      { id: 'devices_add', name: 'Add Devices', description: 'Register new device repairs' },
      { id: 'devices_edit', name: 'Edit Devices', description: 'Modify device repair information' },
      { id: 'spare_parts', name: 'Spare Parts', description: 'Manage spare parts inventory' },
    ]
  },
  // Financial Permissions
  financial: {
    label: 'Financial Operations',
    permissions: [
      { id: 'sales_process', name: 'Process Sales', description: 'Complete sales transactions' },
      { id: 'sales_refund', name: 'Process Refunds', description: 'Issue refunds to customers' },
      { id: 'sales_discount', name: 'Apply Discounts', description: 'Apply discounts to sales' },
      { id: 'financial_reports', name: 'Financial Reports', description: 'View financial reports' },
      { id: 'pricing_manage', name: 'Manage Pricing', description: 'Set and modify product prices' },
      { id: 'payments_view', name: 'View Payments', description: 'View payment transactions' },
    ]
  },
  // User Management Permissions
  users: {
    label: 'User Management',
    permissions: [
      { id: 'users_view', name: 'View Users', description: 'View user accounts' },
      { id: 'users_create', name: 'Create Users', description: 'Create new user accounts' },
      { id: 'users_edit', name: 'Edit Users', description: 'Modify user accounts' },
      { id: 'users_delete', name: 'Delete Users', description: 'Remove user accounts' },
      { id: 'roles_manage', name: 'Manage Roles', description: 'Manage user roles and permissions' },
    ]
  },
  // System Permissions
  system: {
    label: 'System Administration',
    permissions: [
      { id: 'audit_logs', name: 'View Audit Logs', description: 'View system audit logs' },
      { id: 'backup_data', name: 'Backup Data', description: 'Create data backups' },
      { id: 'restore_data', name: 'Restore Data', description: 'Restore from backups' },
      { id: 'integrations', name: 'Manage Integrations', description: 'Configure system integrations' },
      { id: 'database_setup', name: 'Database Setup', description: 'Manage database configuration' },
    ]
  },
  // Additional Features
  features: {
    label: 'Additional Features',
    permissions: [
      { id: 'appointments', name: 'Appointments', description: 'Manage appointments' },
      { id: 'whatsapp', name: 'WhatsApp Integration', description: 'Use WhatsApp features' },
      { id: 'sms', name: 'SMS Features', description: 'Send SMS messages' },
      { id: 'loyalty', name: 'Loyalty Program', description: 'Manage loyalty programs' },
      { id: 'employees', name: 'Employee Management', description: 'Manage employee records' },
    ]
  }
};

// Role-based default permissions
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: ['all'],
  manager: ['dashboard', 'pos', 'reports', 'inventory_view', 'inventory_add', 'inventory_edit', 'inventory_adjust', 'inventory_history', 'customers_view', 'customers_add', 'customers_edit', 'customers_history', 'devices_view', 'devices_add', 'devices_edit', 'sales_process', 'sales_refund', 'sales_discount', 'financial_reports', 'payments_view', 'employees'],
  technician: ['dashboard', 'devices_view', 'devices_add', 'devices_edit', 'spare_parts', 'customers_view', 'inventory_view'],
  'customer-care': ['dashboard', 'pos', 'customers_view', 'customers_add', 'customers_edit', 'customers_history', 'devices_view', 'devices_add', 'appointments', 'whatsapp', 'sms'],
  user: ['dashboard', 'inventory_view', 'customers_view']
};

// Validation schema
const createUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'manager', 'technician', 'customer-care', 'user']),
  department: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  accessAllBranches: z.boolean().optional(),
  assignedBranches: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  customPermissions: z.boolean().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CreateUserData = z.infer<typeof createUserSchema>;

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserData) => Promise<void>;
  loading?: boolean;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue
  } = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      phone: '',
      role: 'user',
      department: '',
      password: '',
      confirmPassword: '',
      accessAllBranches: false,
      assignedBranches: [],
      permissions: [],
      customPermissions: false
    }
  });

  const watchedValues = watch();

  // Update permissions when role changes
  useEffect(() => {
    if (watchedValues.role && !watchedValues.customPermissions) {
      const defaultPerms = ROLE_DEFAULT_PERMISSIONS[watchedValues.role] || [];
      setValue('permissions', defaultPerms, { shouldDirty: true });
    }
  }, [watchedValues.role, watchedValues.customPermissions, setValue]);

  // Load branches on mount
  useEffect(() => {
    if (isOpen) {
      loadBranches();
    }
  }, [isOpen]);

  const loadBranches = async () => {
    setLoadingBranches(true);
    try {
      const branchesData = await getAllBranches();
      setBranches(branchesData);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Failed to load branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  // Toggle branch selection
  const toggleBranch = (branchId: string) => {
    const currentBranches = watchedValues.assignedBranches || [];
    if (currentBranches.includes(branchId)) {
      setValue('assignedBranches', currentBranches.filter(id => id !== branchId), { shouldDirty: true });
    } else {
      setValue('assignedBranches', [...currentBranches, branchId], { shouldDirty: true });
    }
  };

  // Toggle permission selection
  const togglePermission = (permissionId: string) => {
    const currentPermissions = watchedValues.permissions || [];
    if (currentPermissions.includes(permissionId)) {
      setValue('permissions', currentPermissions.filter(id => id !== permissionId), { shouldDirty: true });
    } else {
      setValue('permissions', [...currentPermissions, permissionId], { shouldDirty: true });
    }
  };

  // Select all permissions in a category
  const toggleCategoryPermissions = (categoryPermissions: string[]) => {
    const currentPermissions = watchedValues.permissions || [];
    const allSelected = categoryPermissions.every(p => currentPermissions.includes(p));
    
    if (allSelected) {
      // Deselect all in category
      setValue('permissions', currentPermissions.filter(p => !categoryPermissions.includes(p)), { shouldDirty: true });
    } else {
      // Select all in category
      const newPermissions = [...new Set([...currentPermissions, ...categoryPermissions])];
      setValue('permissions', newPermissions, { shouldDirty: true });
    }
  };

  // Check if permission is selected
  const isPermissionSelected = (permissionId: string) => {
    return (watchedValues.permissions || []).includes(permissionId);
  };

  // Check if all category permissions are selected
  const isCategoryFullySelected = (categoryPermissions: string[]) => {
    return categoryPermissions.every(p => isPermissionSelected(p));
  };

  // Role options
  const roleOptions = [
    { value: 'admin', label: 'Administrator', description: 'Full system access' },
    { value: 'manager', label: 'Manager', description: 'Department management' },
    { value: 'technician', label: 'Technician', description: 'Device repairs' },
    { value: 'customer-care', label: 'Customer Care', description: 'Customer support' },
    { value: 'user', label: 'User', description: 'Basic access' }
  ];

  // Department options
  const departmentOptions = [
    { value: 'IT', label: 'IT Department' },
    { value: 'Sales', label: 'Sales Department' },
    { value: 'Service', label: 'Service Department' },
    { value: 'Support', label: 'Support Department' },
    { value: 'Marketing', label: 'Marketing Department' },
    { value: 'Finance', label: 'Finance Department' },
    { value: 'HR', label: 'Human Resources' },
    { value: 'Operations', label: 'Operations' }
  ];

  // Handle form submission
  const handleFormSubmit = async (data: CreateUserData) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      console.error('User creation error:', error);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (isDirty) {
      if (confirm('Are you sure you want to cancel? Your changes will be lost.')) {
        reset();
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Get role description
  const getRoleDescription = (role: string) => {
    const roleOption = roleOptions.find(r => r.value === role);
    return roleOption?.description || '';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div 
        className="fixed bg-black/50"
        onClick={onClose}
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 35
        }}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed flex items-center justify-center p-4"
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
        <div 
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
          <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Create New User
                </h3>
                <p className="text-xs text-gray-500">
                  Add a new user to the system
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">User Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <GlassInput
                    label="First Name"
                    placeholder="Enter first name"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.firstName?.message}
                    required
                    icon={<User size={16} />}
                  />
                )}
              />

              {/* Last Name */}
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <GlassInput
                    label="Last Name"
                    placeholder="Enter last name"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.lastName?.message}
                    required
                    icon={<User size={16} />}
                  />
                )}
              />
            </div>

            {/* Email */}
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label="Email Address"
                  type="email"
                  placeholder="user@company.com"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.email?.message}
                  required
                  icon={<Mail size={16} />}
                />
              )}
            />

            {/* Username */}
            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label="Username"
                  type="text"
                  placeholder="username"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.username?.message}
                  icon={<User size={16} />}
                  helperText="Used for login (optional)"
                />
              )}
            />

            {/* Phone */}
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <GlassInput
                  label="Phone Number"
                  type="tel"
                  placeholder="+255 123 456 789"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.phone?.message}
                  icon={<Phone size={16} />}
                />
              )}
            />
          </div>

          {/* Role and Department */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Role & Department</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role */}
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <GlassSelect
                    label="Role"
                    placeholder="Select role"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.role?.message}
                    options={roleOptions}
                    required
                    icon={<Shield size={16} />}
                  />
                )}
              />

              {/* Department */}
              <Controller
                name="department"
                control={control}
                render={({ field }) => (
                  <GlassSelect
                    label="Department"
                    placeholder="Select department"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.department?.message}
                    options={departmentOptions}
                    clearable
                  />
                )}
              />
            </div>

            {/* Role Description */}
            {watchedValues.role && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Role Description:</strong> {getRoleDescription(watchedValues.role)}
                </p>
              </div>
            )}
          </div>

          {/* Permissions Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Lock size={20} />
                Permissions & Access Control
              </h3>
              <button
                type="button"
                onClick={() => setShowPermissions(!showPermissions)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showPermissions ? 'Hide' : 'Show'} Permissions
              </button>
            </div>

            {/* Custom Permissions Toggle */}
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={watchedValues.customPermissions}
                    onChange={(e) => {
                      setValue('customPermissions', e.target.checked, { shouldDirty: true });
                      if (!e.target.checked && watchedValues.role) {
                        // Reset to role defaults
                        const defaultPerms = ROLE_DEFAULT_PERMISSIONS[watchedValues.role] || [];
                        setValue('permissions', defaultPerms, { shouldDirty: true });
                      }
                    }}
                    className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      Custom Permissions
                    </span>
                    <p className="text-xs text-gray-600">
                      Override role defaults with custom permissions
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Permissions Summary */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Selected Permissions: {(watchedValues.permissions || []).length}
                  </p>
                  <p className="text-xs text-gray-500">
                    {watchedValues.customPermissions ? 'Custom permissions configured' : `Using ${watchedValues.role} role defaults`}
                  </p>
                </div>
                {isPermissionSelected('all') && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">Full Access</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Permissions (collapsible) */}
            {showPermissions && (
              <div className="space-y-4 border-2 border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Configure Permissions</h4>
                  {!isPermissionSelected('all') && (
                    <button
                      type="button"
                      onClick={() => setValue('permissions', ['all'], { shouldDirty: true })}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Grant Full Access
                    </button>
                  )}
                </div>

                {/* Disable all if 'all' permission is selected */}
                {isPermissionSelected('all') ? (
                  <div className="p-6 bg-green-50 rounded-lg border border-green-200 text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-900">Full Access Granted</p>
                    <p className="text-xs text-green-700 mt-1">
                      This user has complete access to all system features
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const defaultPerms = ROLE_DEFAULT_PERMISSIONS[watchedValues.role] || [];
                        setValue('permissions', defaultPerms, { shouldDirty: true });
                      }}
                      className="mt-3 text-xs text-green-700 hover:text-green-800 font-medium underline"
                    >
                      Revoke Full Access
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(ALL_PERMISSIONS).map(([categoryKey, category]) => {
                      const categoryPermIds = category.permissions.map(p => p.id);
                      const isFullySelected = isCategoryFullySelected(categoryPermIds);
                      
                      return (
                        <div key={categoryKey} className="border border-gray-200 rounded-lg p-3">
                          {/* Category Header */}
                          <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isFullySelected}
                                onChange={() => toggleCategoryPermissions(categoryPermIds)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="font-medium text-sm text-gray-900">{category.label}</span>
                            </label>
                            <span className="text-xs text-gray-500">
                              {categoryPermIds.filter(p => isPermissionSelected(p)).length}/{categoryPermIds.length}
                            </span>
                          </div>

                          {/* Individual Permissions */}
                          <div className="ml-6 space-y-2">
                            {category.permissions.map((permission) => (
                              <label
                                key={permission.id}
                                className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isPermissionSelected(permission.id)}
                                  onChange={() => togglePermission(permission.id)}
                                  disabled={permission.id === 'all' && watchedValues.role !== 'admin'}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-800">{permission.name}</div>
                                  <div className="text-xs text-gray-500">{permission.description}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Branch Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Building2 size={20} />
              Branch Access
            </h3>
            
            {/* Access All Branches Toggle */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={watchedValues.accessAllBranches}
                    onChange={(e) => {
                      setValue('accessAllBranches', e.target.checked, { shouldDirty: true });
                      if (e.target.checked) {
                        setValue('assignedBranches', [], { shouldDirty: true });
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      Access All Branches
                    </span>
                    <p className="text-xs text-gray-600">
                      User can access and manage all branches/stores
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Branch Selection (only if not access all) */}
            {!watchedValues.accessAllBranches && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Branches
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {loadingBranches ? (
                    <div className="text-center py-4 text-gray-500">
                      Loading branches...
                    </div>
                  ) : branches.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No branches available
                    </div>
                  ) : (
                    branches.map((branch) => (
                      <label
                        key={branch.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          (watchedValues.assignedBranches || []).includes(branch.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={(watchedValues.assignedBranches || []).includes(branch.id)}
                          onChange={() => toggleBranch(branch.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-gray-400" />
                            <span className="font-medium text-gray-900">{branch.name}</span>
                            {branch.is_main && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                Main
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 ml-6">
                            {branch.city} • {branch.code}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {(watchedValues.assignedBranches || []).length} branch(es)
                </p>
              </div>
            )}
          </div>

          {/* Password */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Password</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password */}
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <GlassInput
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.password?.message}
                    required
                    rightIcon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    onRightIconClick={() => setShowPassword(!showPassword)}
                    helperText="Minimum 8 characters"
                  />
                )}
              />

              {/* Confirm Password */}
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <GlassInput
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.confirmPassword?.message}
                    required
                    rightIcon={showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                )}
              />
            </div>

            {/* Password Requirements */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-2">Password Requirements:</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Minimum 8 characters</li>
                <li>• Should include uppercase and lowercase letters</li>
                <li>• Should include numbers</li>
                <li>• Should include special characters</li>
              </ul>
            </div>
          </div>

          {/* User Preview */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">User Preview</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Name:</p>
                <p className="font-medium text-gray-900">
                  {watchedValues.firstName} {watchedValues.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Email:</p>
                <p className="font-medium text-gray-900">{watchedValues.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-gray-600">Username:</p>
                <p className="font-medium text-gray-900">{watchedValues.username || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-600">Role:</p>
                <p className="font-medium text-gray-900">
                  {roleOptions.find(r => r.value === watchedValues.role)?.label || 'Not selected'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Department:</p>
                <p className="font-medium text-gray-900">
                  {watchedValues.department || 'Not assigned'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Permissions:</p>
                <p className="font-medium text-gray-900">
                  {(watchedValues.permissions || []).length} selected
                  {isPermissionSelected('all') && (
                    <span className="ml-2 text-green-600">(Full Access)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Branch Access:</p>
                <p className="font-medium text-gray-900">
                  {watchedValues.accessAllBranches 
                    ? 'All Branches' 
                    : `${(watchedValues.assignedBranches || []).length} branch(es)`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isDirty || loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </>
  );
};

export default CreateUserModal;
