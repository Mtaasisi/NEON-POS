import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import SearchBar from '../../../features/shared/components/ui/SearchBar';
import GlassSelect from '../../../features/shared/components/ui/GlassSelect';
import { BackButton } from '../../../features/shared/components/ui/BackButton';
import CreateUserModal from '../components/CreateUserModal';
import EditUserModal from '../components/EditUserModal';
import RoleManagementModal from '../components/RoleManagementModal';
import UserEmployeeLinkModal from '../components/UserEmployeeLinkModal';
import { 
  Users, Search, Plus, Edit, Trash2, Shield, UserCheck, UserX, 
  Mail, Phone, Calendar, Eye, EyeOff, Lock, Unlock, Settings,
  Filter, Download, Upload, RefreshCw, AlertTriangle, CheckCircle, Link as LinkIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  fetchAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  toggleUserStatus, 
  bulkUpdateUserStatus, 
  bulkDeleteUsers,
  transformUserForUI,
  type CreateUserData as ApiCreateUserData,
  type UpdateUserData as ApiUpdateUserData
} from '../../../lib/userApi';
import { bulkAssignUserToBranches, getUserBranchAssignments } from '../../../lib/userBranchApi';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { TableSkeleton } from '../../../components/ui/SkeletonLoaders';

interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'technician' | 'customer-care' | 'user';
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: string;
  createdAt: string;
  phone?: string;
  department?: string;
  permissions: string[];
  accessAllBranches?: boolean;
  assignedBranches?: string[];
  employeeLinked?: boolean;
  employeeName?: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

const UserManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [showUserEmployeeLink, setShowUserEmployeeLink] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Load real users from database
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const jobId = startLoading('Loading users...');
    setIsLoading(true);
    try {
      const dbUsers = await fetchAllUsers();
      
      // Load branch assignments for each user
      const usersWithBranches = await Promise.all(
        dbUsers.map(async (user) => {
          try {
            const branchAssignments = await getUserBranchAssignments(user.id);
            const branchIds = branchAssignments.map(a => a.branch_id);
            const transformed = transformUserForUI(user);
            return {
              ...transformed,
              assignedBranches: branchIds,
              accessAllBranches: branchIds.length === 0 // If no branches assigned, assume all access
            };
          } catch (error) {
            console.error(`Error loading branches for user ${user.id}:`, error);
            return {
              ...transformUserForUI(user),
              assignedBranches: [],
              accessAllBranches: true
            };
          }
        })
      );
      
      setUsers(usersWithBranches);

      // Calculate roles data
      const rolesMap = new Map<string, number>();
      dbUsers.forEach(user => {
        const count = rolesMap.get(user.role) || 0;
        rolesMap.set(user.role, count + 1);
      });

      const rolesData: Role[] = [
        {
          id: 'admin',
          name: 'Administrator',
          description: 'Full system access and control',
          permissions: ['all'],
          userCount: rolesMap.get('admin') || 0
        },
        {
          id: 'manager',
          name: 'Manager',
          description: 'Department management and reporting',
          permissions: ['inventory', 'customers', 'reports', 'employees'],
          userCount: rolesMap.get('manager') || 0
        },
        {
          id: 'technician',
          name: 'Technician',
          description: 'Device repair',
          permissions: ['devices', 'spare-parts'],
          userCount: rolesMap.get('technician') || 0
        },
        {
          id: 'customer-care',
          name: 'Customer Care',
          description: 'Customer support and service',
          permissions: ['customers', 'appointments'],
          userCount: rolesMap.get('customer-care') || 0
        },
        {
          id: 'user',
          name: 'User',
          description: 'Basic system access',
          permissions: ['basic'],
          userCount: rolesMap.get('user') || 0
        }
      ];

      setRoles(rolesData);
      completeLoading(jobId);
    } catch (error) {
      console.error('Error loading users:', error);
      failLoading(jobId, 'Failed to load users');
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate metrics
  const metrics = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    pendingUsers: users.filter(u => u.status === 'pending').length,
    inactiveUsers: users.filter(u => u.status === 'inactive').length
  };

  // Handle user actions
  const handleCreateUser = () => {
    setShowCreateUser(true);
  };

  const handleCreateUserSubmit = async (data: any) => {
    setIsCreating(true);
    try {
      // Create the user first
      const newUser = await createUser(data);
      
      // Handle branch assignments
      if (!data.accessAllBranches && data.assignedBranches && data.assignedBranches.length > 0) {
        const branchAssignments = data.assignedBranches.map((branchId: string, index: number) => ({
          branch_id: branchId,
          is_primary: index === 0, // First branch is primary
          can_manage: false,
          can_view_reports: true,
          can_manage_inventory: false,
          can_manage_staff: false
        }));
        
        await bulkAssignUserToBranches(newUser.id, branchAssignments, currentUser?.id);
      }
      // If accessAllBranches is true, no assignments needed (user has access to all)
      
      toast.success('User created successfully with branch assignments');
      await loadUsers(); // Reload users list
      setShowCreateUser(false);
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
      throw error; // Re-throw to let modal handle it
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditUser(true);
  };

  const handleEditUserSubmit = async (data: any) => {
    if (!editingUser) return;

    setIsEditing(true);
    try {
      const updateData: ApiUpdateUserData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        username: data.username, // ✅ Include username from the form
        role: data.role,
        phone: data.phone,
        department: data.department,
        is_active: data.isActive,
        permissions: data.permissions // Include permissions from the form
      };

      await updateUser(editingUser.id, updateData);
      
      // Handle branch assignments
      if (!data.accessAllBranches && data.assignedBranches && data.assignedBranches.length > 0) {
        const branchAssignments = data.assignedBranches.map((branchId: string, index: number) => ({
          branch_id: branchId,
          is_primary: index === 0, // First branch is primary
          can_manage: false,
          can_view_reports: true,
          can_manage_inventory: false,
          can_manage_staff: false
        }));
        
        await bulkAssignUserToBranches(editingUser.id, branchAssignments, currentUser?.id);
      } else if (data.accessAllBranches) {
        // Clear all branch assignments (user has access to all)
        await bulkAssignUserToBranches(editingUser.id, [], currentUser?.id);
      }
      
      toast.success('User updated successfully with branch assignments');
      await loadUsers(); // Reload users list
      setShowEditUser(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
      throw error; // Re-throw to let modal handle it
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteUser(userId);
        toast.success('User deleted successfully');
        await loadUsers(); // Reload users list
      } catch (error: any) {
        console.error('Error deleting user:', error);
        toast.error(error.message || 'Failed to delete user');
      }
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (user) {
        const newStatus = user.status === 'active' ? false : true;
        await toggleUserStatus(userId, newStatus);
        toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
        await loadUsers(); // Reload users list
      }
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast.error(error.message || 'Failed to update user status');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first');
      return;
    }

    try {
      switch (action) {
        case 'activate':
          await bulkUpdateUserStatus(selectedUsers, true);
          toast.success(`${selectedUsers.length} users activated`);
          break;
        case 'deactivate':
          await bulkUpdateUserStatus(selectedUsers, false);
          toast.success(`${selectedUsers.length} users deactivated`);
          break;
        case 'delete':
          if (confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) {
            await bulkDeleteUsers(selectedUsers);
            toast.success(`${selectedUsers.length} users deleted`);
          } else {
            return; // Don't reload if cancelled
          }
          break;
        default:
          toast.error('Unknown action');
          return;
      }
      
      setSelectedUsers([]);
      await loadUsers(); // Reload users list
    } catch (error: any) {
      console.error('Error performing bulk action:', error);
      toast.error(error.message || 'Failed to perform action');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'technician': return 'bg-green-100 text-green-800';
      case 'customer-care': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Export users to CSV
  const handleExportCSV = () => {
    try {
      const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Username', 'Phone', 'Role', 'Department', 'Status', 'Created At', 'Last Login'];
      const csvData = filteredUsers.map(user => [
        user.id,
        user.firstName,
        user.lastName,
        user.email,
        user.username || '',
        user.phone || '',
        user.role,
        user.department || '',
        user.status,
        user.createdAt,
        user.lastLogin || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${filteredUsers.length} users to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export users');
    }
  };

  // Export users to JSON
  const handleExportJSON = () => {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        totalUsers: filteredUsers.length,
        users: filteredUsers
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${filteredUsers.length} users to JSON`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export users');
    }
  };

  // Import users from JSON
  const handleImportUsers = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        const usersToImport = data.users || data;
        if (!Array.isArray(usersToImport)) {
          throw new Error('Invalid file format');
        }

        toast.success(`Ready to import ${usersToImport.length} users. Feature coming soon!`);
        // TODO: Implement bulk user import
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import users. Please check file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  // Manual refresh
  const handleRefresh = () => {
    toast.promise(
      loadUsers(),
      {
        loading: 'Refreshing users...',
        success: 'Users refreshed successfully',
        error: 'Failed to refresh users'
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton to="/dashboard" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage users, roles, and permissions</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <GlassButton
            onClick={handleRefresh}
            variant="secondary"
            icon={<RefreshCw size={18} />}
            title="Refresh users list"
          >
            Refresh
          </GlassButton>
          
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportUsers}
              className="hidden"
              id="import-users"
            />
            <label htmlFor="import-users">
              <GlassButton
                variant="secondary"
                icon={<Upload size={18} />}
                as="span"
              >
                Import
              </GlassButton>
            </label>
          </div>

          <div className="relative group">
            <GlassButton
              variant="secondary"
              icon={<Download size={18} />}
            >
              Export
            </GlassButton>
            <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              <button
                onClick={handleExportCSV}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
              >
                <Download size={16} />
                <span>Export as CSV</span>
              </button>
              <button
                onClick={handleExportJSON}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
              >
                <Download size={16} />
                <span>Export as JSON</span>
              </button>
            </div>
          </div>

          <GlassButton
            onClick={() => setShowUserEmployeeLink(true)}
            variant="secondary"
            icon={<LinkIcon size={18} />}
            title="Link users to employee records"
          >
            User-Employee Links
          </GlassButton>
          <GlassButton
            onClick={() => setShowRoleManagement(true)}
            variant="secondary"
            icon={<Shield size={18} />}
          >
            Manage Roles
          </GlassButton>
          <GlassButton
            onClick={handleCreateUser}
            icon={<Plus size={18} />}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white"
          >
            Add User
          </GlassButton>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Users</p>
              <p className="text-2xl font-bold text-blue-900">{metrics.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </GlassCard>
        
        <GlassCard className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Active Users</p>
              <p className="text-2xl font-bold text-green-900">{metrics.activeUsers}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </GlassCard>
        
        <GlassCard className="bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Admins</p>
              <p className="text-2xl font-bold text-purple-900">{users.filter(u => u.role === 'admin').length}</p>
              <p className="text-xs text-purple-500">Full Access</p>
            </div>
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
        </GlassCard>
        
        <GlassCard className="bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Inactive Users</p>
              <p className="text-2xl font-bold text-red-900">{metrics.inactiveUsers}</p>
            </div>
            <UserX className="w-8 h-8 text-red-600" />
          </div>
        </GlassCard>
      </div>

      {/* Filters and Search */}
      <GlassCard className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              onSearch={setSearchQuery}
              placeholder="Search users by name, email, username, or department..."
              className="w-full"
              suggestions={users.map(u => `${u.firstName} ${u.lastName}`)}
              searchKey="user_management_search"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <GlassSelect
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'admin', label: 'Administrator' },
                { value: 'manager', label: 'Manager' },
                { value: 'technician', label: 'Technician' },
                { value: 'customer-care', label: 'Customer Care' },
                { value: 'user', label: 'User' }
              ]}
              value={roleFilter}
              onChange={setRoleFilter}
              placeholder="Filter by Role"
              className="min-w-[150px]"
            />

            <GlassSelect
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' }
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Filter by Status"
              className="min-w-[150px]"
            />
          </div>
        </div>
      </GlassCard>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <GlassCard className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="flex gap-2">
              <GlassButton
                onClick={() => handleBulkAction('activate')}
                variant="secondary"
                size="sm"
                icon={<UserCheck size={16} />}
              >
                Activate
              </GlassButton>
              <GlassButton
                onClick={() => handleBulkAction('deactivate')}
                variant="secondary"
                size="sm"
                icon={<UserX size={16} />}
              >
                Deactivate
              </GlassButton>
              <GlassButton
                onClick={() => handleBulkAction('delete')}
                variant="danger"
                size="sm"
                icon={<Trash2 size={16} />}
              >
                Delete
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Users Table */}
      <GlassCard className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(filteredUsers.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">User</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Role & Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Branch Access</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Permissions</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Last Activity</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar with initials */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {user.username && (
                            <span className="text-xs text-gray-400 font-mono">
                              @{user.username}
                            </span>
                          )}
                          {user.phone && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone size={10} />
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {user.role.replace('-', ' ')}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </div>
                      {user.department && (
                        <div className="text-xs text-gray-500 mt-1">
                          {user.department}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {user.accessAllBranches === true ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={14} />
                        <span className="text-xs font-medium">All Branches</span>
                      </div>
                    ) : user.assignedBranches && user.assignedBranches.length > 0 ? (
                      <div className="text-xs">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                          {user.assignedBranches.length} {user.assignedBranches.length === 1 ? 'Branch' : 'Branches'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-yellow-600 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        No access
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {user.permissions && user.permissions.length > 0 ? (
                      user.permissions.includes('all') ? (
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            Full Access ✓
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span 
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium cursor-help"
                            title={user.permissions.join(', ')}
                          >
                            {user.permissions.length} permission{user.permissions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )
                    ) : (
                      <span className="text-gray-400 italic text-xs">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      {user.lastLogin ? (
                        <div>
                          <div className="text-gray-900 font-medium">{formatDate(user.lastLogin)}</div>
                          <div className="text-xs text-gray-500">Last login</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-gray-400 italic">Not logged in</div>
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Created: {formatDate(user.createdAt)}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <GlassButton
                        onClick={() => handleEditUser(user)}
                        variant="ghost"
                        size="sm"
                        icon={<Edit size={14} />}
                        title="Edit user"
                      />
                      <GlassButton
                        onClick={() => handleToggleUserStatus(user.id)}
                        variant="ghost"
                        size="sm"
                        icon={user.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                        title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                        className={user.status === 'active' ? 'text-orange-600' : 'text-green-600'}
                      />
                      <GlassButton
                        onClick={() => handleDeleteUser(user.id)}
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        className="text-red-600 hover:text-red-700"
                        title="Delete user"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || roleFilter !== 'all' || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first user'
              }
            </p>
            {!searchQuery && roleFilter === 'all' && statusFilter === 'all' && (
              <GlassButton
                onClick={handleCreateUser}
                icon={<Plus size={18} />}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white"
              >
                Add Your First User
              </GlassButton>
            )}
          </div>
        )}
      </GlassCard>

      {/* Modals */}
      <CreateUserModal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onSubmit={handleCreateUserSubmit}
        loading={isCreating}
      />

      <EditUserModal
        isOpen={showEditUser}
        onClose={() => {
          setShowEditUser(false);
          setEditingUser(null);
        }}
        onSubmit={handleEditUserSubmit}
        user={editingUser}
        loading={isEditing}
      />

      {/* Role Management Modal */}
      <RoleManagementModal
        isOpen={showRoleManagement}
        onClose={() => setShowRoleManagement(false)}
        roles={roles}
        onRoleCreate={async (data) => {
          // TODO: Implement role creation API
          toast.success('Role creation API coming soon!');
        }}
        onRoleUpdate={async (id, data) => {
          // TODO: Implement role update API
          toast.success('Role update API coming soon!');
        }}
        onRoleDelete={async (id) => {
          // TODO: Implement role deletion API
          toast.success('Role deletion API coming soon!');
        }}
      />

      {/* User-Employee Link Modal */}
      <UserEmployeeLinkModal
        isOpen={showUserEmployeeLink}
        onClose={() => setShowUserEmployeeLink(false)}
        onLinksUpdated={() => loadUsers()}
      />
    </div>
  );
};

export default UserManagementPage;
