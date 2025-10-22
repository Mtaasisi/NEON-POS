import React, { useState, useEffect } from 'react';
import GlassSelect from '../../../features/shared/components/ui/GlassSelect';
import BranchSelector from '../../../components/BranchSelector';
import { X, UserPlus, Edit, User, Shield, Key } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';

interface Employee {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  hireDate: string;
  salary: number;
  status: 'active' | 'inactive' | 'on-leave' | 'terminated';
  performance: number;
  attendance: number;
  skills: string[];
  manager?: string;
  location?: string;
  branchId?: string;
  userId?: string; // 🔗 Link to user account
  userRole?: string; // User role if linked
}

interface EmployeeFormProps {
  employee?: Employee;
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  isOpen,
  onClose,
  onSave
}) => {
  const today = new Date();
  const defaultHireDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [formData, setFormData] = useState<Employee>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    hireDate: defaultHireDate,
    salary: 0,
    status: 'active',
    performance: 3,
    attendance: 100,
    skills: [],
    manager: '',
    location: '',
    branchId: '',
    userId: '',
    userRole: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newSkill, setNewSkill] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    } else {
      const today = new Date();
      const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        hireDate: formattedDate,
        salary: 0,
        status: 'active',
        performance: 3,
        attendance: 100,
        skills: [],
        manager: '',
        location: '',
        branchId: '',
        userId: '',
        userRole: ''
      });
    }
    setErrors({});
  }, [employee, isOpen]);

  // Load users when form opens
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.position.trim()) {
      newErrors.position = 'Position is required';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.hireDate) {
      newErrors.hireDate = 'Hire date is required';
    }

    if (formData.salary <= 0) {
      newErrors.salary = 'Salary must be greater than 0';
    }

    if (!formData.branchId?.trim()) {
      newErrors.branchId = 'Branch/Store is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    const employeeData = {
      ...formData,
      id: employee?.id || Date.now().toString()
    };

    onSave(employeeData);
    onClose();
    toast.success(employee ? 'Employee updated successfully' : 'Employee added successfully');
  };

  const addSkill = () => {
    const skills = formData.skills || [];
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(skill => skill !== skillToRemove)
    }));
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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                employee ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                {employee ? (
                  <Edit className="w-5 h-5 text-blue-600" />
                ) : (
                  <UserPlus className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {employee ? 'Edit Employee' : 'Add New Employee'}
                </h3>
                <p className="text-xs text-gray-500">
                  {employee ? 'Update employee information' : 'Create a new employee record'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.firstName ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-blue-500'
                  }`}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.lastName ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-blue-500'
                  }`}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.email ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-blue-500'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.phone ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-blue-500'
                  }`}
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Work Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position *
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.position ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-blue-500'
                  }`}
                  placeholder="Enter job position"
                />
                {errors.position && (
                  <p className="text-red-500 text-sm mt-1">{errors.position}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <GlassSelect
                  options={[
                    { value: 'IT', label: 'IT Department' },
                    { value: 'Service', label: 'Service Department' },
                    { value: 'Support', label: 'Support Department' },
                    { value: 'Sales', label: 'Sales Department' },
                    { value: 'Marketing', label: 'Marketing Department' },
                    { value: 'Finance', label: 'Finance Department' },
                    { value: 'HR', label: 'Human Resources' }
                  ]}
                  value={formData.department}
                  onChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                  placeholder="Select department"
                />
                {errors.department && (
                  <p className="text-red-500 text-sm mt-1">{errors.department}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hire Date *
                </label>
                <input
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hireDate: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.hireDate ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-blue-500'
                  }`}
                />
                {errors.hireDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.hireDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salary (TZS) *
                </label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData(prev => ({ ...prev, salary: Number(e.target.value) }))}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.salary ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-blue-500'
                  }`}
                  placeholder="Enter salary"
                  min="0"
                />
                {errors.salary && (
                  <p className="text-red-500 text-sm mt-1">{errors.salary}</p>
                )}
              </div>
            </div>

            {/* Status and Performance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <GlassSelect
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'on-leave', label: 'On Leave' },
                    { value: 'terminated', label: 'Terminated' }
                  ]}
                  value={formData.status}
                  onChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                  placeholder="Select status"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Performance Rating (1-5)
                </label>
                <input
                  type="number"
                  value={formData.performance}
                  onChange={(e) => setFormData(prev => ({ ...prev, performance: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  min="1"
                  max="5"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attendance % (0-100)
                </label>
                <input
                  type="number"
                  value={formData.attendance}
                  onChange={(e) => setFormData(prev => ({ ...prev, attendance: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager
                </label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Enter manager name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Location (Optional)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="City or specific location"
                />
              </div>
            </div>

            {/* Branch/Store Assignment */}
            <div>
              <BranchSelector
                label="Assigned Branch/Store"
                value={formData.branchId}
                onChange={(branchId) => setFormData(prev => ({ ...prev, branchId }))}
                placeholder="Select employee's branch"
                required
                error={errors.branchId}
              />
            </div>

            {/* User Account Linking */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">User Account Access</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Link this employee to a user account to give them system access. This allows them to log in and use the POS system.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-500" />
                      Link to User Account (Optional)
                    </div>
                  </label>
                  <GlassSelect
                    options={[
                      { value: '', label: 'No user account linked' },
                      ...users.map(user => ({
                        value: user.id,
                        label: `${user.full_name || user.email} (${user.role})`
                      }))
                    ]}
                    value={formData.userId || ''}
                    onChange={(value) => {
                      const selectedUser = users.find(u => u.id === value);
                      setFormData(prev => ({ 
                        ...prev, 
                        userId: value,
                        userRole: selectedUser?.role || ''
                      }));
                    }}
                    placeholder={loadingUsers ? "Loading users..." : "Select user account"}
                  />
                  {formData.userId && formData.userRole && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
                      <Key className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-700">
                        Role: <span className="font-semibold capitalize">{formData.userRole}</span>
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 User Account Benefits</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• System access with username/password</li>
                    <li>• Role-based permissions</li>
                    <li>• Track activities and actions</li>
                    <li>• Attendance self-service</li>
                    <li>• Personal dashboard access</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Add a skill"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.skills || []).map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                {employee ? 'Update Employee' : 'Add Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeForm;
