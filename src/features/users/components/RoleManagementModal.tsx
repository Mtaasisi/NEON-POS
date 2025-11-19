import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/GlassInput';
import { 
  Shield, X, Save, Plus, Edit, Trash2, Users, CheckSquare, 
  AlertTriangle, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

// Validation schema
const roleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  permissions: z.array(z.string()).min(1, 'Select at least one permission')
});

type RoleData = z.infer<typeof roleSchema>;

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onRoleCreate?: (data: RoleData) => Promise<void>;
  onRoleUpdate?: (id: string, data: RoleData) => Promise<void>;
  onRoleDelete?: (id: string) => Promise<void>;
}

const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  isOpen,
  onClose,
  roles,
  onRoleCreate,
  onRoleUpdate,
  onRoleDelete
}) => {
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<RoleData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: []
    }
  });

  const watchedPermissions = watch('permissions');

  // Available permissions
  const availablePermissions = [
    { value: 'all', label: 'All Permissions', description: 'Complete system access', icon: '🔓' },
    { value: 'inventory', label: 'Inventory Management', description: 'Manage stock and products', icon: '📦' },
    { value: 'customers', label: 'Customer Management', description: 'Manage customer data', icon: '👥' },
    { value: 'reports', label: 'Reports & Analytics', description: 'View and generate reports', icon: '📊' },
    { value: 'employees', label: 'Employee Management', description: 'Manage team members', icon: '👔' },
    { value: 'devices', label: 'Device Management', description: 'Manage devices and equipment', icon: '📱' },
    { value: 'spare-parts', label: 'Spare Parts', description: 'Manage spare parts inventory', icon: '⚙️' },
    { value: 'appointments', label: 'Appointments', description: 'Schedule and manage appointments', icon: '📅' },
    { value: 'pos', label: 'Point of Sale', description: 'Access POS system', icon: '💰' },
    { value: 'sms', label: 'SMS Messaging', description: 'Send SMS messages', icon: '💬' },
    { value: 'settings', label: 'System Settings', description: 'Configure system settings', icon: '⚙️' },
    { value: 'users', label: 'User Management', description: 'Manage users and permissions', icon: '🔐' },
    { value: 'basic', label: 'Basic Access', description: 'Limited system access', icon: '👤' }
  ];

  // Handle creating new role
  const handleCreateRole = () => {
    setIsCreatingRole(true);
    setEditingRole(null);
    reset({
      name: '',
      description: '',
      permissions: []
    });
  };

  // Handle editing role
  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setIsCreatingRole(false);
    reset({
      name: role.name,
      description: role.description,
      permissions: role.permissions
    });
  };

  // Handle form submission
  const handleFormSubmit = async (data: RoleData) => {
    try {
      if (editingRole) {
        // Update existing role
        await onRoleUpdate?.(editingRole.id, data);
        toast.success('Role updated successfully');
      } else {
        // Create new role
        await onRoleCreate?.(data);
        toast.success('Role created successfully');
      }
      setIsCreatingRole(false);
      setEditingRole(null);
      reset();
    } catch (error: any) {
      console.error('Role save error:', error);
      toast.error(error.message || 'Failed to save role');
    }
  };

  // Handle role deletion
  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    if (role.userCount > 0) {
      toast.error(`Cannot delete role with ${role.userCount} assigned user(s)`);
      return;
    }

    if (confirm(`Are you sure you want to delete the "${role.name}" role?`)) {
      try {
        await onRoleDelete?.(roleId);
        toast.success('Role deleted successfully');
        if (selectedRole?.id === roleId) {
          setSelectedRole(null);
        }
      } catch (error: any) {
        console.error('Role deletion error:', error);
        toast.error(error.message || 'Failed to delete role');
      }
    }
  };

  // Toggle permission
  const togglePermission = (permission: string) => {
    const current = watchedPermissions || [];
    if (current.includes(permission)) {
      setValue('permissions', current.filter(p => p !== permission), { shouldDirty: true });
    } else {
      setValue('permissions', [...current, permission], { shouldDirty: true });
    }
  };

  // Check if permission is selected
  const hasPermission = (permission: string) => {
    return (watchedPermissions || []).includes(permission);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassCard 
        className="max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Role Management
              </h2>
              <p className="text-sm text-gray-500">
                Create and manage user roles and permissions
              </p>
            </div>
          </div>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<X size={20} />}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Panel: Role List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Existing Roles</h3>
                <GlassButton
                  onClick={handleCreateRole}
                  size="sm"
                  icon={<Plus size={16} />}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                >
                  New Role
                </GlassButton>
              </div>

              <div className="space-y-3">
                {roles.map((role) => (
                  <GlassCard 
                    key={role.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedRole?.id === role.id ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield size={18} className="text-purple-600" />
                          <h4 className="font-semibold text-gray-900">{role.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600">{role.description}</p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRole(role);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit role"
                        >
                          <Edit size={16} />
                        </button>
                        {role.userCount === 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role.id);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete role"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users size={14} />
                        <span>{role.userCount} user{role.userCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <CheckSquare size={14} />
                        <span>{role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Show permissions if selected */}
                    {selectedRole?.id === role.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">Permissions:</p>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.map((perm) => {
                            const permInfo = availablePermissions.find(p => p.value === perm);
                            return (
                              <span
                                key={perm}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                              >
                                <span>{permInfo?.icon || '•'}</span>
                                <span>{permInfo?.label || perm}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </GlassCard>
                ))}

                {roles.length === 0 && (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No custom roles yet</p>
                    <p className="text-sm text-gray-500">Create your first role to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Create/Edit Role Form */}
            <div>
              {(isCreatingRole || editingRole) ? (
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="text-purple-600" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingRole ? 'Edit Role' : 'Create New Role'}
                    </h3>
                  </div>

                  {/* Role Name */}
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <GlassInput
                        label="Role Name"
                        placeholder="e.g., Store Manager, Sales Rep"
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.name?.message}
                        required
                        icon={<Shield size={16} />}
                      />
                    )}
                  />

                  {/* Role Description */}
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Describe what this role does..."
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          rows={3}
                        />
                        {errors.description && (
                          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                        )}
                      </div>
                    )}
                  />

                  {/* Permissions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Permissions <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {availablePermissions.map((permission) => (
                        <div
                          key={permission.value}
                          onClick={() => togglePermission(permission.value)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            hasPermission(permission.value)
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 transition-colors ${
                              hasPermission(permission.value) ? 'text-purple-600' : 'text-gray-400'
                            }`}>
                              {hasPermission(permission.value) ? (
                                <CheckCircle2 size={20} />
                              ) : (
                                <div className="w-5 h-5 rounded border-2 border-current" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{permission.icon}</span>
                                <h4 className="text-sm font-medium text-gray-900">{permission.label}</h4>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.permissions && (
                      <p className="mt-2 text-sm text-red-600">{errors.permissions.message}</p>
                    )}

                    {/* Selected count */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>{(watchedPermissions || []).length}</strong> permission(s) selected
                      </p>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <GlassButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setIsCreatingRole(false);
                        setEditingRole(null);
                        reset();
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </GlassButton>
                    <GlassButton
                      type="submit"
                      variant="primary"
                      className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                      icon={<Save size={18} />}
                    >
                      {editingRole ? 'Update Role' : 'Create Role'}
                    </GlassButton>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a role or create a new one
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Choose a role from the list to view details, or create a new role
                    </p>
                    <GlassButton
                      onClick={handleCreateRole}
                      icon={<Plus size={18} />}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                    >
                      Create New Role
                    </GlassButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertTriangle size={16} className="text-yellow-600" />
            <p>
              <strong>Note:</strong> Roles with assigned users cannot be deleted. 
              Reassign users before deleting a role.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default RoleManagementModal;

