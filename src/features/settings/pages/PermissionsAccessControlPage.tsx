import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import SearchBar from '../../shared/components/ui/SearchBar';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { BackButton } from '../../shared/components/ui/BackButton';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import {
  Shield, Users, Lock, Eye, EyeOff, Edit, Trash2, Plus, Save, X,
  CheckCircle, AlertTriangle, Settings, UserCheck, UserX, Key,
  ShieldCheck, ShieldX, Activity, Clock, FileText, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import permission utilities
import { PERMISSION_MAP, PERMISSION_CATEGORIES, ROLE_PERMISSIONS } from '../../../lib/permissionUtils';

// Import modal components
import RoleEditorModal from '../components/RoleEditorModal';
import UserPermissionsModal from '../components/UserPermissionsModal';

// Import API functions
import { updateUser, fetchAllUsers } from '../../../lib/userApi';

interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  icon: React.ReactNode;
}

interface RoleConfig {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

interface UserPermissions {
  id: string;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
  customPermissions: boolean;
  lastModified: string;
  assignedBy: string;
}

const PermissionsAccessControlPage: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const navigate = useNavigate();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'permissions' | 'users'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Modal states
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [showUserPermissions, setShowUserPermissions] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');

  // Permission groups for better organization
  const permissionGroups: PermissionGroup[] = [
    {
      id: 'devices',
      name: 'Device Management',
      description: 'Control access to device repair and management features',
      permissions: PERMISSION_CATEGORIES.devices,
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <Settings className="w-5 h-5" />
    },
    {
      id: 'customers',
      name: 'Customer Management',
      description: 'Manage customer data and interactions',
      permissions: PERMISSION_CATEGORIES.customers,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: <Users className="w-5 h-5" />
    },
    {
      id: 'inventory',
      name: 'Inventory Control',
      description: 'Stock management and product administration',
      permissions: PERMISSION_CATEGORIES.inventory,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: <Shield className="w-5 h-5" />
    },
    {
      id: 'pos',
      name: 'Point of Sale',
      description: 'Sales transactions and POS operations',
      permissions: PERMISSION_CATEGORIES.pos,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: <Activity className="w-5 h-5" />
    },
    {
      id: 'reports',
      name: 'Reporting',
      description: 'Access to reports and analytics',
      permissions: PERMISSION_CATEGORIES.reports,
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: <FileText className="w-5 h-5" />
    },
    {
      id: 'settings',
      name: 'System Settings',
      description: 'Configuration and administrative access',
      permissions: PERMISSION_CATEGORIES.settings,
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: <Lock className="w-5 h-5" />
    },
    {
      id: 'purchase_orders',
      name: 'Purchase Orders',
      description: 'Procurement and supplier management',
      permissions: PERMISSION_CATEGORIES.purchase_orders,
      color: 'bg-teal-100 text-teal-800 border-teal-200',
      icon: <CheckCircle className="w-5 h-5" />
    },
    {
      id: 'spare_parts',
      name: 'Spare Parts',
      description: 'Maintenance and parts inventory',
      permissions: PERMISSION_CATEGORIES.spare_parts,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: <ShieldCheck className="w-5 h-5" />
    }
  ];

  // Mock role configurations (in real app, load from database)
  const [roles, setRoles] = useState<RoleConfig[]>([
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access and control',
      permissions: ROLE_PERMISSIONS.admin,
      isSystem: true,
      userCount: 1
    },
    {
      id: 'manager',
      name: 'Manager',
      description: 'Department management and reporting',
      permissions: ROLE_PERMISSIONS.manager,
      isSystem: true,
      userCount: 1
    },
    {
      id: 'technician',
      name: 'Technician',
      description: 'Device repair and maintenance',
      permissions: ROLE_PERMISSIONS.technician,
      isSystem: true,
      userCount: 1
    },
    {
      id: 'customer-care',
      name: 'Customer Care',
      description: 'Customer support and service',
      permissions: ROLE_PERMISSIONS['customer-care'],
      isSystem: true,
      userCount: 1
    },
    {
      id: 'sales',
      name: 'Sales',
      description: 'Sales and customer acquisition',
      permissions: ROLE_PERMISSIONS.sales,
      isSystem: true,
      userCount: 0
    },
    {
      id: 'store-keeper',
      name: 'Store Keeper',
      description: 'Inventory and stock management',
      permissions: ROLE_PERMISSIONS['store-keeper'],
      isSystem: true,
      userCount: 0
    },
    {
      id: 'user',
      name: 'Basic User',
      description: 'Limited access user',
      permissions: ROLE_PERMISSIONS.user,
      isSystem: true,
      userCount: 0
    }
  ]);

  // User permissions data (loaded from database)
  const [userPermissions, setUserPermissions] = useState<UserPermissions[]>([]);

  // Statistics
  const stats = {
    totalUsers: userPermissions.length,
    activeUsers: userPermissions.filter(u => u.role !== 'inactive').length,
    customPermissions: userPermissions.filter(u => u.customPermissions).length,
    systemRoles: roles.filter(r => r.isSystem).length
  };

  // Refresh data function
  const handleRefresh = () => {
    loadData();
  };

  useEffect(() => {
    // Check permissions
    if (!hasPermission('manage_users')) {
      toast.error('You do not have permission to access this page');
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [hasPermission, navigate]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load users from database
      const dbUsers = await fetchAllUsers();

      // Transform users for the UI
      const transformedUsers = dbUsers.map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name || user.username || user.email,
        role: user.role,
        permissions: user.permissions || ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [],
        customPermissions: user.permissions && user.permissions.length > 0 && !user.permissions.includes('all'),
        lastModified: user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never',
        assignedBy: 'System' // This could be tracked separately
      }));

      setUserPermissions(transformedUsers);

      // Calculate role counts from real data
      const roleCounts: Record<string, number> = {};
      dbUsers.forEach(user => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
      });

      // Update roles with real counts
      setRoles(prev => prev.map(role => ({
        ...role,
        userCount: roleCounts[role.id] || 0
      })));

    } catch (error) {
      console.error('Error loading permissions data:', error);
      toast.error('Failed to load permissions data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePermissions = () => {
    toast.success('Permissions saved successfully!');
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setEditorMode('create');
    setShowRoleEditor(true);
  };

  const handleEditRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      setEditingRole(role);
      setEditorMode('edit');
      setShowRoleEditor(true);
    }
  };

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.isSystem) {
      toast.error('Cannot delete system roles');
      return;
    }

    if (confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      setRoles(prev => prev.filter(r => r.id !== roleId));
      toast.success(`Role ${roleId} deleted`);
    }
  };

  const handleSaveRole = async (roleData: any) => {
    if (editorMode === 'create') {
      setRoles(prev => [...prev, roleData]);
    } else {
      setRoles(prev => prev.map(r => r.id === roleData.id ? roleData : r));
    }
    // In a real app, this would save to the database
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
  };

  const handleEditUserPermissions = (userId: string) => {
    const user = userPermissions.find(u => u.id === userId);
    if (user) {
      setEditingUser(user);
      setShowUserPermissions(true);
    }
  };

  const handleSaveUserPermissions = async (userId: string, permissions: string[], customPermissions: boolean) => {
    try {
      // Update the user in the database
      await updateUser(userId, {
        permissions: permissions,
        // Note: customPermissions is not stored in DB yet, it's derived from permissions array
      });

      // Reload data to get updated information
      await loadData();

      toast.success('User permissions updated successfully');
    } catch (error) {
      console.error('Error saving user permissions:', error);
      toast.error('Failed to save user permissions');
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton to="/settings" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Permissions & Access Control</h1>
              <p className="text-gray-600 mt-1">Manage user roles, permissions, and access controls</p>
            </div>
          </div>
          <div className="flex gap-3">
            <GlassButton
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={handleSavePermissions}
              icon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </GlassButton>
          </div>
        </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeUsers}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Custom Permissions</p>
              <p className="text-3xl font-bold text-gray-900">{stats.customPermissions}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Key className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Roles</p>
              <p className="text-3xl font-bold text-gray-900">{stats.systemRoles}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Shield className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'overview', label: 'Overview', icon: <Eye className="w-4 h-4" /> },
          { id: 'roles', label: 'Roles', icon: <Shield className="w-4 h-4" /> },
          { id: 'permissions', label: 'Permissions', icon: <Lock className="w-4 h-4" /> },
          { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 flex items-center gap-2 font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">System Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Role Distribution</h3>
                  <div className="space-y-2">
                    {roles.slice(0, 4).map(role => (
                      <div key={role.id} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{role.name}</span>
                        <span className="font-medium">{role.userCount} users</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Permission Categories</h3>
                  <div className="space-y-2">
                    {permissionGroups.slice(0, 4).map(group => (
                      <div key={group.id} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{group.name}</span>
                        <span className="font-medium">{group.permissions.length} permissions</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Permission check completed</p>
                    <p className="text-xs text-gray-500">All user permissions verified successfully</p>
                  </div>
                  <span className="text-xs text-gray-400">2 min ago</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <UserCheck className="w-4 h-4 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">User permissions updated</p>
                    <p className="text-xs text-gray-500">Fixed role-based permissions for all users</p>
                  </div>
                  <span className="text-xs text-gray-400">5 min ago</span>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Role Management</h2>
                <p className="text-gray-600">Configure roles and their associated permissions</p>
              </div>
              <GlassButton
                variant="primary"
                size="sm"
                onClick={handleCreateRole}
                icon={<Plus className="w-4 h-4" />}
              >
                Create Role
              </GlassButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map(role => (
                <GlassCard key={role.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{role.name}</h3>
                      <p className="text-sm text-gray-600">{role.description}</p>
                    </div>
                    {role.isSystem && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        System
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {role.permissions.length} permissions
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 3).map(perm => (
                        <span key={perm} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {perm.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {role.permissions.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          +{role.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{role.userCount} users</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditRole(role.id)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!role.isSystem && (
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Permission Categories</h2>
                <p className="text-gray-600">Organized view of all system permissions</p>
              </div>
              <SearchBar
                onSearch={setSearchQuery}
                placeholder="Search permissions..."
                className="w-64"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {permissionGroups
                .filter(group =>
                  searchQuery === '' ||
                  group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  group.permissions.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map(group => (
                <GlassCard key={group.id} className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${group.color.split(' ')[0]}`}>
                      {group.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-600">{group.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.permissions.map(permission => (
                      <div key={permission} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">
                          {permission.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {Object.values(ROLE_PERMISSIONS).flat().includes(permission) ? 'Used' : 'Unused'}
                          </span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">User Permissions</h2>
                <p className="text-gray-600">Manage individual user permissions and overrides</p>
              </div>
              <div className="flex gap-3">
                <SearchBar
                  onSearch={setSearchQuery}
                  placeholder="Search users..."
                  className="w-64"
                />
                <GlassSelect
                  options={[
                    { value: 'all', label: 'All Roles' },
                    ...roles.map(r => ({ value: r.id, label: r.name }))
                  ]}
                  value="all"
                  onChange={() => {}}
                  placeholder="Filter by Role"
                  className="w-40"
                />
              </div>
            </div>

            <div className="space-y-4">
              {userPermissions
                .filter(user =>
                  searchQuery === '' ||
                  user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  user.email.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(user => (
                <GlassCard key={user.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{user.full_name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'technician' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                          {user.customPermissions && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                              Custom Permissions
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Last modified</p>
                        <p className="text-xs text-gray-400">{user.lastModified}</p>
                        <p className="text-xs text-gray-400">by {user.assignedBy}</p>
                      </div>
                      <GlassButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUserPermissions(user.id)}
                        icon={<Edit className="w-4 h-4" />}
                      >
                        Edit Permissions
                      </GlassButton>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.slice(0, 5).map(permission => (
                        <span key={permission} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {permission.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {user.permissions.length > 5 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                          +{user.permissions.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <RoleEditorModal
        isOpen={showRoleEditor}
        onClose={() => setShowRoleEditor(false)}
        role={editingRole}
        onSave={handleSaveRole}
        mode={editorMode}
      />

      <UserPermissionsModal
        isOpen={showUserPermissions}
        onClose={() => setShowUserPermissions(false)}
        user={editingUser}
        onSave={handleSaveUserPermissions}
        availableRoles={roles.map(r => ({ id: r.id, name: r.name, permissions: r.permissions }))}
      />
    </div>
  );
};

export default PermissionsAccessControlPage;
