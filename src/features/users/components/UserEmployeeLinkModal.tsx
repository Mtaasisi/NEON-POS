import React, { useState, useEffect } from 'react';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import GlassInput from '../../shared/components/ui/GlassInput';
import { 
  X, Link as LinkIcon, Unlink, UserPlus, Users, Briefcase,
  CheckCircle, AlertCircle, ArrowRight, RefreshCw, Play,
  Search, Mail, User
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getAllUserEmployeeLinks,
  getUnlinkedUsers,
  getUnlinkedEmployees,
  linkUserToEmployee,
  unlinkUserFromEmployee,
  createEmployeeForUser,
  autoLinkAllUserEmployees,
  type UserEmployeeLink
} from '../../../lib/userEmployeeLinkApi';

interface UserEmployeeLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinksUpdated?: () => void;
}

const UserEmployeeLinkModal: React.FC<UserEmployeeLinkModalProps> = ({
  isOpen,
  onClose,
  onLinksUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'linked' | 'unlinked'>('linked');
  const [isLoading, setIsLoading] = useState(true);
  const [links, setLinks] = useState<UserEmployeeLink[]>([]);
  const [unlinkedUsers, setUnlinkedUsers] = useState<any[]>([]);
  const [unlinkedEmployees, setUnlinkedEmployees] = useState<any[]>([]);
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  
  // For manual linking
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  // For creating employee
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [newEmployeeData, setNewEmployeeData] = useState({
    userId: '',
    position: '',
    department: '',
    salary: 0
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [linksData, usersData, employeesData] = await Promise.all([
        getAllUserEmployeeLinks(),
        getUnlinkedUsers(),
        getUnlinkedEmployees()
      ]);

      setLinks(linksData);
      setUnlinkedUsers(usersData);
      setUnlinkedEmployees(employeesData);
    } catch (error) {
      // Silently fail - the API functions already handle errors
      console.warn('User-employee link feature not available');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoLink = async () => {
    setIsAutoLinking(true);
    try {
      const result = await autoLinkAllUserEmployees();
      toast.success(
        `Auto-link complete: ${result.linked} linked, ${result.skipped} skipped, ${result.errors} errors`
      );
      await loadData();
      onLinksUpdated?.();
    } catch (error) {
      toast.error('Auto-link failed');
    } finally {
      setIsAutoLinking(false);
    }
  };

  const handleManualLink = async () => {
    if (!selectedUser || !selectedEmployee) {
      toast.error('Please select both user and employee');
      return;
    }

    const success = await linkUserToEmployee(selectedUser, selectedEmployee);
    if (success) {
      setSelectedUser('');
      setSelectedEmployee('');
      await loadData();
      onLinksUpdated?.();
    }
  };

  const handleUnlink = async (employeeId: string) => {
    if (confirm('Are you sure you want to unlink this user from the employee record?')) {
      const success = await unlinkUserFromEmployee(employeeId);
      if (success) {
        await loadData();
        onLinksUpdated?.();
      }
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmployeeData.userId || !newEmployeeData.position || !newEmployeeData.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    const employeeId = await createEmployeeForUser(newEmployeeData.userId, {
      position: newEmployeeData.position,
      department: newEmployeeData.department,
      salary: newEmployeeData.salary || 0
    });

    if (employeeId) {
      setShowCreateEmployee(false);
      setNewEmployeeData({ userId: '', position: '', department: '', salary: 0 });
      await loadData();
      onLinksUpdated?.();
    }
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <LinkIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                User-Employee Links
              </h2>
              <p className="text-sm text-gray-500">
                Manage relationships between user accounts and employee records
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

        {/* Tabs */}
        <div className="flex gap-4 px-6 pt-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('linked')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'linked'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={18} />
              <span>Linked ({links.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('unlinked')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'unlinked'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span>Unlinked ({unlinkedUsers.length + unlinkedEmployees.length})</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          ) : activeTab === 'linked' ? (
            <div className="space-y-4">
              {/* Linked Users and Employees */}
              <div className="grid gap-4">
                {links.length === 0 ? (
                  <div className="text-center py-12">
                    <LinkIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Linked Accounts
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Users and employees are not yet linked
                    </p>
                    <GlassButton
                      onClick={() => setActiveTab('unlinked')}
                      icon={<ArrowRight size={18} />}
                    >
                      Link Users and Employees
                    </GlassButton>
                  </div>
                ) : (
                  links.map((link) => (
                    <GlassCard key={link.employeeId} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 flex-1">
                          {/* User Info */}
                          <div className="flex items-center gap-3 flex-1">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <User size={20} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{link.userName}</p>
                              <p className="text-sm text-gray-600">{link.userEmail}</p>
                              <p className="text-xs text-gray-500">Role: {link.userRole}</p>
                            </div>
                          </div>

                          {/* Link Icon */}
                          <div className="flex items-center">
                            <ArrowRight className="text-blue-600" size={24} />
                          </div>

                          {/* Employee Info */}
                          <div className="flex items-center gap-3 flex-1">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Briefcase size={20} className="text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{link.employeeName}</p>
                              <p className="text-sm text-gray-600">{link.employeePosition}</p>
                              <p className="text-xs text-gray-500">{link.employeeDepartment}</p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <GlassButton
                          onClick={() => handleUnlink(link.employeeId)}
                          variant="ghost"
                          size="sm"
                          icon={<Unlink size={16} />}
                          className="text-red-600 hover:text-red-700"
                        >
                          Unlink
                        </GlassButton>
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Auto-Link Section */}
              <GlassCard className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Auto-Link by Email
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Automatically link users to employees by matching email addresses. 
                      This will only link accounts with exact email matches.
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-orange-600" />
                        <span>{unlinkedUsers.length} unlinked users</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-purple-600" />
                        <span>{unlinkedEmployees.length} unlinked employees</span>
                      </div>
                    </div>
                  </div>
                  <GlassButton
                    onClick={handleAutoLink}
                    loading={isAutoLinking}
                    icon={<Play size={18} />}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                  >
                    Run Auto-Link
                  </GlassButton>
                </div>
              </GlassCard>

              {/* Manual Link Section */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Manual Link
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <GlassSelect
                    label="Select User"
                    value={selectedUser}
                    onChange={setSelectedUser}
                    options={[
                      { value: '', label: 'Choose a user...' },
                      ...unlinkedUsers.map(u => ({
                        value: u.id,
                        label: `${u.firstName} ${u.lastName} (${u.email})`
                      }))
                    ]}
                    icon={<User size={16} />}
                  />

                  <GlassSelect
                    label="Select Employee"
                    value={selectedEmployee}
                    onChange={setSelectedEmployee}
                    options={[
                      { value: '', label: 'Choose an employee...' },
                      ...unlinkedEmployees.map(e => ({
                        value: e.id,
                        label: `${e.firstName} ${e.lastName} - ${e.position}`
                      }))
                    ]}
                    icon={<Briefcase size={16} />}
                  />

                  <GlassButton
                    onClick={handleManualLink}
                    disabled={!selectedUser || !selectedEmployee}
                    icon={<LinkIcon size={18} />}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                  >
                    Link
                  </GlassButton>
                </div>
              </GlassCard>

              {/* Create Employee Section */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Create Employee for User
                  </h3>
                  {!showCreateEmployee && (
                    <GlassButton
                      onClick={() => setShowCreateEmployee(true)}
                      variant="secondary"
                      size="sm"
                      icon={<UserPlus size={16} />}
                    >
                      Create Employee
                    </GlassButton>
                  )}
                </div>

                {showCreateEmployee && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <GlassSelect
                        label="Select User"
                        value={newEmployeeData.userId}
                        onChange={(value) => setNewEmployeeData({...newEmployeeData, userId: value})}
                        options={[
                          { value: '', label: 'Choose a user...' },
                          ...unlinkedUsers.map(u => ({
                            value: u.id,
                            label: `${u.firstName} ${u.lastName} (${u.email})`
                          }))
                        ]}
                        required
                      />

                      <GlassInput
                        label="Position"
                        value={newEmployeeData.position}
                        onChange={(e) => setNewEmployeeData({...newEmployeeData, position: e.target.value})}
                        placeholder="e.g. Sales Manager"
                        required
                      />

                      <GlassInput
                        label="Department"
                        value={newEmployeeData.department}
                        onChange={(e) => setNewEmployeeData({...newEmployeeData, department: e.target.value})}
                        placeholder="e.g. Sales"
                        required
                      />

                      <GlassInput
                        label="Salary (optional)"
                        type="number"
                        value={newEmployeeData.salary}
                        onChange={(e) => setNewEmployeeData({...newEmployeeData, salary: parseFloat(e.target.value) || 0})}
                        placeholder="0"
                      />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <GlassButton
                        onClick={() => {
                          setShowCreateEmployee(false);
                          setNewEmployeeData({ userId: '', position: '', department: '', salary: 0 });
                        }}
                        variant="secondary"
                        className="flex-1"
                      >
                        Cancel
                      </GlassButton>
                      <GlassButton
                        onClick={handleCreateEmployee}
                        icon={<UserPlus size={18} />}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                      >
                        Create Employee
                      </GlassButton>
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Unlinked Users List */}
              {unlinkedUsers.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Unlinked Users ({unlinkedUsers.length})
                  </h3>
                  <div className="grid gap-3">
                    {unlinkedUsers.slice(0, 5).map((user) => (
                      <GlassCard key={user.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded">
                              <User size={18} className="text-orange-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                          </div>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                            No employee record
                          </span>
                        </div>
                      </GlassCard>
                    ))}
                    {unlinkedUsers.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        ... and {unlinkedUsers.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Unlinked Employees List */}
              {unlinkedEmployees.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Unlinked Employees ({unlinkedEmployees.length})
                  </h3>
                  <div className="grid gap-3">
                    {unlinkedEmployees.slice(0, 5).map((employee) => (
                      <GlassCard key={employee.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded">
                              <Briefcase size={18} className="text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="text-sm text-gray-600">
                                {employee.position} • {employee.department}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            No user account
                          </span>
                        </div>
                      </GlassCard>
                    ))}
                    {unlinkedEmployees.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        ... and {unlinkedEmployees.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertCircle size={16} className="text-yellow-600" />
            <p>
              Linking users to employees enables attendance tracking and employee self-service features
            </p>
          </div>
          <GlassButton
            onClick={loadData}
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={16} />}
          >
            Refresh
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
};

export default UserEmployeeLinkModal;

