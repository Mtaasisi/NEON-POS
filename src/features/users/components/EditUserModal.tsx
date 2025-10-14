import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/GlassInput';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { 
  User, Mail, Phone, Shield, X, Save, UserCog, ToggleLeft, ToggleRight,
  Eye, EyeOff, Key, Lock, CheckSquare, Building2, MapPin
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAllBranches, getUserBranchAssignments } from '../../../lib/userBranchApi';

// Validation schema for editing
const editUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'manager', 'technician', 'customer-care', 'user']),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  accessAllBranches: z.boolean().optional(),
  assignedBranches: z.array(z.string()).optional()
}).refine((data) => {
  // If password is provided, check if it matches confirmPassword
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword && data.password.length >= 8;
  }
  return true;
}, {
  message: "Passwords must match and be at least 8 characters",
  path: ["confirmPassword"],
});

type EditUserData = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditUserData) => Promise<void>;
  user: {
    id: string;
    email: string;
    username?: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'manager' | 'technician' | 'customer-care' | 'user';
    phone?: string;
    department?: string;
    status?: string;
    permissions?: string[];
  } | null;
  loading?: boolean;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  loading = false
}) => {
  const [isActiveToggle, setIsActiveToggle] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [userBranchAssignments, setUserBranchAssignments] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue
  } = useForm<EditUserData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      phone: '',
      role: 'user',
      department: '',
      isActive: true,
      password: '',
      confirmPassword: '',
      permissions: [],
      accessAllBranches: false,
      assignedBranches: []
    }
  });

  const watchedValues = watch();

  // Update form when user changes
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        username: user.username || '',
        phone: user.phone || '',
        role: user.role || 'user',
        department: user.department || '',
        isActive: user.status === 'active',
        password: '',
        confirmPassword: '',
        permissions: user.permissions || [],
        accessAllBranches: false,
        assignedBranches: []
      });
      setIsActiveToggle(user.status === 'active');
      setShowPasswordFields(false); // Reset password fields visibility
      
      // Load user's branch assignments
      loadUserBranchAssignments(user.id);
    }
  }, [user, reset]);

  // Load branches and user assignments
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

  const loadUserBranchAssignments = async (userId: string) => {
    try {
      const assignments = await getUserBranchAssignments(userId);
      const branchIds = assignments.map(a => a.branch_id);
      setUserBranchAssignments(branchIds);
      setValue('assignedBranches', branchIds);
      setValue('accessAllBranches', branchIds.length === 0);
    } catch (error) {
      console.error('Error loading user branch assignments:', error);
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

  // Role options
  const roleOptions = [
    { value: 'admin', label: 'Administrator', description: 'Full system access' },
    { value: 'manager', label: 'Manager', description: 'Department management' },
    { value: 'technician', label: 'Technician', description: 'Device diagnostics' },
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

  // Available permissions
  const availablePermissions = [
    { value: 'all', label: 'All Permissions', description: 'Full system access' },
    { value: 'inventory', label: 'Inventory Management', description: 'Manage stock and products' },
    { value: 'customers', label: 'Customer Management', description: 'Manage customer data' },
    { value: 'reports', label: 'Reports & Analytics', description: 'View reports' },
    { value: 'employees', label: 'Employee Management', description: 'Manage employees' },
    { value: 'devices', label: 'Device Management', description: 'Manage devices' },
    { value: 'diagnostics', label: 'Device Diagnostics', description: 'Run diagnostics' },
    { value: 'spare-parts', label: 'Spare Parts', description: 'Manage spare parts' },
    { value: 'appointments', label: 'Appointments', description: 'Manage appointments' },
    { value: 'basic', label: 'Basic Access', description: 'Limited access' }
  ];

  // Handle form submission
  const handleFormSubmit = async (data: EditUserData) => {
    try {
      // Only include password if it was changed
      const submitData: EditUserData = {
        ...data,
        isActive: isActiveToggle
      };
      
      // Remove password fields if they're empty
      if (!data.password || data.password.length === 0) {
        delete submitData.password;
        delete submitData.confirmPassword;
      }
      
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('User update error:', error);
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

  // Toggle permission
  const togglePermission = (permission: string) => {
    const currentPermissions = watchedValues.permissions || [];
    if (currentPermissions.includes(permission)) {
      setValue('permissions', currentPermissions.filter(p => p !== permission), { shouldDirty: true });
    } else {
      setValue('permissions', [...currentPermissions, permission], { shouldDirty: true });
    }
  };

  // Check if permission is selected
  const hasPermission = (permission: string) => {
    return (watchedValues.permissions || []).includes(permission);
  };

  if (!isOpen || !user) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassCard 
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <UserCog className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit User
                </h2>
                <p className="text-sm text-gray-500">
                  Update user information and settings
                </p>
              </div>
            </div>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              icon={<X size={20} />}
            />
          </div>

          {/* User Status Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <h4 className="text-sm font-medium text-gray-900">User Status</h4>
              <p className="text-xs text-gray-500">
                {isActiveToggle ? 'User can access the system' : 'User is blocked from accessing the system'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActiveToggle(!isActiveToggle)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActiveToggle ? 'bg-green-600' : 'bg-red-400'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActiveToggle ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
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
                  helperText="Used for login"
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

          {/* Password Reset Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Password Reset</h3>
                <p className="text-sm text-gray-500">Leave blank to keep current password</p>
              </div>
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                icon={showPasswordFields ? <EyeOff size={16} /> : <Key size={16} />}
                onClick={() => setShowPasswordFields(!showPasswordFields)}
              >
                {showPasswordFields ? 'Hide' : 'Change Password'}
              </GlassButton>
            </div>

            {showPasswordFields && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                {/* New Password */}
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <GlassInput
                      label="New Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.password?.message}
                      icon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      onIconClick={() => setShowPassword(!showPassword)}
                      helperText="Minimum 8 characters"
                    />
                  )}
                />

                {/* Confirm New Password */}
                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <GlassInput
                      label="Confirm New Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.confirmPassword?.message}
                      icon={showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      onIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  )}
                />

                {/* Password Requirements */}
                <div className="md:col-span-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800 font-medium mb-2">Password Requirements:</p>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• Minimum 8 characters</li>
                    <li>• Should include uppercase and lowercase letters</li>
                    <li>• Should include numbers</li>
                    <li>• Should include special characters</li>
                  </ul>
                </div>
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

          {/* Permissions Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Permissions</h3>
            <p className="text-sm text-gray-500">Select specific permissions for this user</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availablePermissions.map((permission) => (
                <div
                  key={permission.value}
                  onClick={() => togglePermission(permission.value)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    hasPermission(permission.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${hasPermission(permission.value) ? 'text-blue-600' : 'text-gray-400'}`}>
                      <CheckSquare size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{permission.label}</h4>
                      <p className="text-xs text-gray-500">{permission.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Permissions Count */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>{(watchedValues.permissions || []).length}</strong> permission(s) selected
              </p>
            </div>
          </div>

          {/* User Preview */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Updated User Preview</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Name:</p>
                <p className="font-medium text-gray-900">
                  {watchedValues.firstName} {watchedValues.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Status:</p>
                <p className={`font-medium ${isActiveToggle ? 'text-green-600' : 'text-red-600'}`}>
                  {isActiveToggle ? 'Active' : 'Inactive'}
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
                <p className="text-gray-600">Phone:</p>
                <p className="font-medium text-gray-900">
                  {watchedValues.phone || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Permissions:</p>
                <p className="font-medium text-gray-900">
                  {(watchedValues.permissions || []).length} selected
                </p>
              </div>
              {watchedValues.password && watchedValues.password.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-gray-600">Password:</p>
                  <p className="font-medium text-orange-600">Will be changed ✓</p>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-gray-200 flex gap-3">
            <GlassButton
              type="button"
              variant="secondary"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="primary"
              loading={loading}
              disabled={!isDirty && isActiveToggle === (user.status === 'active')}
              className="flex-1"
              icon={<Save size={20} />}
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </GlassButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};

export default EditUserModal;

