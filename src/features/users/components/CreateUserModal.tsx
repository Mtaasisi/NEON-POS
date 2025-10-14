import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/GlassInput';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { 
  User, Mail, Phone, Shield, Eye, EyeOff, X, Save, UserPlus, Building2, MapPin
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAllBranches } from '../../../lib/userBranchApi';

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
  assignedBranches: z.array(z.string()).optional()
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
      assignedBranches: []
    }
  });

  const watchedValues = watch();

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
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlus className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Create New User
                </h2>
                <p className="text-sm text-gray-500">
                  Add a new user to the system
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
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-gray-200">
            <GlassButton
              type="submit"
              variant="primary"
              loading={loading}
              disabled={!isDirty}
              className="w-full py-4 text-lg font-semibold"
              icon={<Save size={20} />}
            >
              {loading ? 'Creating User...' : 'Create User'}
            </GlassButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};

export default CreateUserModal;
