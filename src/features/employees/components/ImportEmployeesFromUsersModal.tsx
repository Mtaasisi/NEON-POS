import React, { useState, useEffect } from 'react';
import { X, Users, Check, AlertCircle, Search, Filter, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { employeeService } from '../../../services/employeeService';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  department?: string;
  is_active: boolean;
}

interface UserWithEmployee extends User {
  hasEmployeeRecord: boolean;
}

interface ImportEmployeesFromUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const ImportEmployeesFromUsersModal: React.FC<ImportEmployeesFromUsersModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [users, setUsers] = useState<UserWithEmployee[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHasEmployee, setFilterHasEmployee] = useState<'all' | 'without' | 'with'>('without');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Get all active users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, phone, role, department, is_active')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (usersError) throw usersError;

      // Get all employees with user_id
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('user_id')
        .neq('user_id', null);

      if (employeesError) throw employeesError;

      // Create a set of user IDs that already have employee records
      const userIdsWithEmployees = new Set(
        employeesData?.map(e => e.user_id).filter(Boolean) || []
      );

      // Mark which users have employee records
      const usersWithStatus: UserWithEmployee[] = (usersData || []).map(user => ({
        ...user,
        hasEmployeeRecord: userIdsWithEmployees.has(user.id)
      }));

      setUsers(usersWithStatus);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    const filteredUsers = getFilteredUsers();
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleImport = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user to import');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      for (const userId of selectedUsers) {
        const user = users.find(u => u.id === userId);
        if (!user) continue;

        try {
          // Check if employee already exists
          if (user.hasEmployeeRecord) {
            errors.push(`${user.full_name}: Already has employee record`);
            errorCount++;
            continue;
          }

          // Split full name into first and last name
          const nameParts = user.full_name.split(' ');
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || 'User';

          // Create employee record
          await employeeService.createEmployee({
            userId: user.id,
            firstName,
            lastName,
            email: user.email,
            phone: user.phone || '',
            position: user.role || 'Staff',
            department: user.department || 'General',
            hireDate: new Date().toISOString().split('T')[0],
            salary: 0, // Can be updated later
            currency: 'TZS',
            status: 'active',
            employmentType: 'full-time',
            performanceRating: 3.0,
            skills: null
          });

          successCount++;
        } catch (error: any) {
          console.error(`Error importing user ${user.email}:`, error);
          errors.push(`${user.full_name}: ${error.message || 'Failed to import'}`);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(
          `Successfully imported ${successCount} employee${successCount !== 1 ? 's' : ''}`,
          { duration: 4000 }
        );
      }

      if (errorCount > 0) {
        console.error('Import errors:', errors);
        toast.error(
          `Failed to import ${errorCount} user${errorCount !== 1 ? 's' : ''}. Check console for details.`,
          { duration: 5000 }
        );
      }

      // Reload and close
      if (successCount > 0) {
        onImportComplete();
        onClose();
      } else {
        // Reload the user list to update status
        await loadUsers();
      }
    } catch (error) {
      console.error('Error during import:', error);
      toast.error('An error occurred during import');
    } finally {
      setIsImporting(false);
      setSelectedUsers(new Set());
    }
  };

  const getFilteredUsers = () => {
    return users.filter(user => {
      // Filter by search query
      const matchesSearch = searchQuery === '' || 
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by employee status
      const matchesFilter = 
        filterHasEmployee === 'all' ||
        (filterHasEmployee === 'without' && !user.hasEmployeeRecord) ||
        (filterHasEmployee === 'with' && user.hasEmployeeRecord);

      return matchesSearch && matchesFilter;
    });
  };

  const filteredUsers = getFilteredUsers();
  const usersWithoutEmployees = users.filter(u => !u.hasEmployeeRecord).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Import Employees from Users</h2>
              <p className="text-sm text-gray-600 mt-1">
                {usersWithoutEmployees} user{usersWithoutEmployees !== 1 ? 's' : ''} without employee records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isImporting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <select
              value={filterHasEmployee}
              onChange={(e) => setFilterHasEmployee(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="without">Without Employee Record</option>
              <option value="with">With Employee Record</option>
            </select>
          </div>

          {/* Selection Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">
                {selectedUsers.size > 0 ? (
                  <span className="font-medium text-blue-600">
                    {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                  </span>
                ) : (
                  'Select users to import'
                )}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} shown
            </span>
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No users found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className={`p-4 border rounded-lg transition-all cursor-pointer ${
                    selectedUsers.has(user.id)
                      ? 'border-blue-500 bg-blue-50'
                      : user.hasEmployeeRecord
                      ? 'border-gray-200 bg-gray-50 opacity-60'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                  onClick={() => !user.hasEmployeeRecord && handleSelectUser(user.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      disabled={user.hasEmployeeRecord}
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{user.full_name}</h3>
                        {user.hasEmployeeRecord && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            <Check className="w-3 h-3" />
                            Has Employee Record
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>{user.email}</span>
                        {user.phone && <span>{user.phone}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                          {user.role}
                        </span>
                        {user.department && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                            {user.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertCircle className="w-4 h-4" />
            <span>Employee records will be created with basic info. You can edit them later.</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedUsers.size === 0 || isImporting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Import {selectedUsers.size > 0 ? `(${selectedUsers.size})` : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportEmployeesFromUsersModal;

