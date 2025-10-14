import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import SearchBar from '../../../features/shared/components/ui/SearchBar';
import GlassSelect from '../../../features/shared/components/ui/GlassSelect';
import { BackButton } from '../../../features/shared/components/ui/BackButton';
import { EmployeeForm, AttendanceModal } from '../components';
import { 
  Users, UserPlus, Calendar, Clock, TrendingUp, Award, 
  Plus, Edit, Trash2, CheckCircle, AlertTriangle, Filter,
  Mail, Phone, MapPin, Briefcase, Star, Activity, Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { employeeService } from '../../../services/employeeService';
import { supabase } from '../../../lib/supabaseClient';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  hireDate: string;
  salary: number;
  status: 'active' | 'inactive' | 'on-leave' | 'terminated';
  performance: number; // 1-5 rating
  attendance: number; // percentage
  skills: string[];
  manager?: string;
  location?: string;
  branchId?: string; // ✨ NEW - Branch assignment
  branch?: {         // ✨ NEW - Branch details
    id: string;
    name: string;
    code: string;
    isMain: boolean;
  };
}

interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  hours: number;
  notes?: string;
}

const EmployeeManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all'); // ✨ NEW - Branch filter
  const [branches, setBranches] = useState<any[]>([]); // ✨ NEW - Available branches
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);

  // Load data from database
  useEffect(() => {
    loadData();
    loadBranches(); // ✨ NEW - Load branches for filter
  }, []);

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('store_locations')
        .select('id, name, code, is_main')
        .eq('is_active', true)
        .order('is_main', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load employees from database
      const employeesData = await employeeService.getAllEmployees();
      
      // Convert to component's Employee interface format
      const formattedEmployees: Employee[] = employeesData.map(emp => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone || '',
        position: emp.position,
        department: emp.department,
        hireDate: emp.hireDate,
        salary: emp.salary,
        status: emp.status,
        performance: emp.performanceRating,
        attendance: 95, // This will be calculated from attendance records
        skills: emp.skills || [],
        manager: '', // Will be resolved from managerId
        location: emp.location || '',
        branchId: emp.branchId, // ✨ NEW - Branch ID
        branch: emp.branch // ✨ NEW - Branch details
      }));

      // Load all attendance records
      const attendanceData = await employeeService.getAllAttendanceRecords();
      
      // Convert to component's Attendance interface format
      const formattedAttendance: Attendance[] = attendanceData.map(att => {
        const employee = employeesData.find(e => e.id === att.employeeId);
        return {
          id: att.id,
          employeeId: att.employeeId,
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
          date: att.attendanceDate,
          checkIn: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : undefined,
          checkOut: att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : undefined,
          status: att.status,
          hours: att.totalHours,
          notes: att.notes
        };
      });

      setEmployees(formattedEmployees);
      setAttendance(formattedAttendance);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load employees data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEmployee = async (employeeData: Employee) => {
    try {
      if (editingEmployee) {
        // Update existing employee
        await employeeService.updateEmployee(employeeData.id, {
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          email: employeeData.email,
          phone: employeeData.phone,
          position: employeeData.position,
          department: employeeData.department,
          hireDate: employeeData.hireDate,
          salary: employeeData.salary,
          status: employeeData.status,
          performanceRating: employeeData.performance,
          skills: employeeData.skills,
          location: employeeData.location,
          branchId: employeeData.branchId, // ✨ NEW - Branch ID
          employmentType: 'full-time',
          currency: 'TZS'
        });
      } else {
        // Add new employee
        await employeeService.createEmployee({
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          email: employeeData.email,
          phone: employeeData.phone,
          position: employeeData.position,
          department: employeeData.department,
          hireDate: employeeData.hireDate,
          salary: employeeData.salary,
          status: employeeData.status,
          performanceRating: employeeData.performance,
          skills: employeeData.skills,
          location: employeeData.location,
          branchId: employeeData.branchId, // ✨ NEW - Branch ID
          employmentType: 'full-time',
          currency: 'TZS'
        });
      }
      
      // Reload data
      await loadData();
      setEditingEmployee(undefined);
      setShowCreateEmployee(false);
    } catch (error) {
      console.error('Failed to save employee:', error);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowCreateEmployee(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await employeeService.deleteEmployee(employeeId);
        await loadData();
      } catch (error) {
        console.error('Failed to delete employee:', error);
      }
    }
  };

  const handleSaveAttendance = async (attendanceData: Attendance) => {
    try {
      await employeeService.markAttendance({
        employeeId: attendanceData.employeeId,
        attendanceDate: attendanceData.date,
        checkInTime: attendanceData.checkIn ? `${attendanceData.date}T${attendanceData.checkIn}` : undefined,
        checkOutTime: attendanceData.checkOut ? `${attendanceData.date}T${attendanceData.checkOut}` : undefined,
        status: attendanceData.status,
        totalHours: attendanceData.hours,
        notes: attendanceData.notes
      });
      
      await loadData();
      setShowAttendanceModal(false);
    } catch (error) {
      console.error('Failed to save attendance:', error);
    }
  };

  const handleDeleteAttendance = async (attendanceId: string) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      try {
        await employeeService.deleteAttendanceRecord(attendanceId);
        await loadData();
      } catch (error) {
        console.error('Failed to delete attendance:', error);
      }
    }
  };

  const handleExportEmployees = () => {
    const csv = employeeService.exportEmployeesToCSV(employees.map(emp => ({
      ...emp,
      performanceRating: emp.performance,
      employmentType: 'full-time' as const,
      currency: 'TZS'
    })));
    employeeService.downloadCSV(csv, `employees_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportAttendance = () => {
    const csv = employeeService.exportAttendanceToCSV(attendance.map(att => ({
      id: att.id,
      employeeId: att.employeeId,
      attendanceDate: att.date,
      checkInTime: att.checkIn,
      checkOutTime: att.checkOut,
      totalHours: att.hours,
      breakHours: 0,
      overtimeHours: att.hours > 8 ? att.hours - 8 : 0,
      status: att.status,
      notes: att.notes
    })));
    employeeService.downloadCSV(csv, `attendance_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading employees...</span>
        </div>
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
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">Manage staff, attendance, and performance</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {activeTab === 'employees' ? (
            <>
              <GlassButton
                onClick={() => setShowCreateEmployee(true)}
                icon={<Plus size={18} />}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white"
              >
                Add Employee
              </GlassButton>
              <GlassButton
                onClick={handleExportEmployees}
                icon={<Download size={18} />}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white"
              >
                Export CSV
              </GlassButton>
            </>
          ) : (
            <>
              <GlassButton
                onClick={() => setShowAttendanceModal(true)}
                icon={<Calendar size={18} />}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              >
                Mark Attendance
              </GlassButton>
              <GlassButton
                onClick={handleExportAttendance}
                icon={<Download size={18} />}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white"
              >
                Export CSV
              </GlassButton>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'employees'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={16} />
            Employees ({employees.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'attendance'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            Attendance ({attendance.length})
          </div>
        </button>
      </div>

      {/* Statistics */}
      {activeTab === 'employees' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Employees</p>
                <p className="text-2xl font-bold text-blue-900">{employees.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </GlassCard>
          
          <GlassCard className="bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Employees</p>
                <p className="text-2xl font-bold text-green-900">
                  {employees.filter(e => e.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </GlassCard>
          
          <GlassCard className="bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Avg. Performance</p>
                <p className="text-2xl font-bold text-purple-900">
                  {employees.length > 0 
                                    ? (() => {
                    const formatted = (employees.reduce((sum, e) => sum + e.performance, 0) / employees.length).toFixed(1);
                    return formatted.replace(/\.0$/, '');
                  })()
                : '0'
                  }
                </p>
              </div>
              <Star className="w-8 h-8 text-purple-600" />
            </div>
          </GlassCard>
          
          <GlassCard className="bg-gradient-to-br from-orange-50 to-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Avg. Attendance</p>
                <p className="text-2xl font-bold text-orange-900">
                  {employees.length > 0 
                    ? Math.round(employees.reduce((sum, e) => sum + e.attendance, 0) / employees.length)
                    : 0
                  }%
                </p>
              </div>
              <Activity className="w-8 h-8 text-orange-600" />
            </div>
          </GlassCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Today's Attendance</p>
                <p className="text-2xl font-bold text-blue-900">{attendance.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </GlassCard>
          
          <GlassCard className="bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Present</p>
                <p className="text-2xl font-bold text-green-900">
                  {attendance.filter(a => a.status === 'present').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </GlassCard>
          
          <GlassCard className="bg-gradient-to-br from-yellow-50 to-yellow-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Late</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {attendance.filter(a => a.status === 'late').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </GlassCard>
          
          <GlassCard className="bg-gradient-to-br from-red-50 to-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Absent</p>
                <p className="text-2xl font-bold text-red-900">
                  {attendance.filter(a => a.status === 'absent').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-red-600" />
            </div>
          </GlassCard>
        </div>
      )}

      {/* Search and Filters */}
      <GlassCard className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              onSearch={setSearchQuery}
              placeholder={activeTab === 'employees' 
                ? "Search employees by name, position, or department..."
                : "Search attendance by employee name..."
              }
              className="w-full"
              suggestions={activeTab === 'employees' 
                ? employees.map(e => `${e.firstName} ${e.lastName}`)
                : attendance.map(a => a.employeeName)
              }
              searchKey={`employee_${activeTab}_search`}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {activeTab === 'employees' ? (
              <>
                <GlassSelect
                  options={[
                    { value: 'all', label: 'All Departments' },
                    { value: 'IT', label: 'IT Department' },
                    { value: 'Service', label: 'Service Department' },
                    { value: 'Support', label: 'Support Department' },
                    { value: 'Sales', label: 'Sales Department' },
                    { value: 'Marketing', label: 'Marketing Department' },
                    { value: 'Finance', label: 'Finance Department' },
                    { value: 'HR', label: 'Human Resources' }
                  ]}
                  value={departmentFilter}
                  onChange={setDepartmentFilter}
                  placeholder="Filter by Department"
                  className="min-w-[150px]"
                />
                <GlassSelect
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'on-leave', label: 'On Leave' },
                    { value: 'terminated', label: 'Terminated' }
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Filter by Status"
                  className="min-w-[150px]"
                />
                <GlassSelect
                  options={[
                    { value: 'all', label: 'All Branches' },
                    ...branches.map(b => ({ 
                      value: b.id, 
                      label: `${b.name}${b.is_main ? ' 🏢' : ''}` 
                    }))
                  ]}
                  value={branchFilter}
                  onChange={setBranchFilter}
                  placeholder="Filter by Branch"
                  className="min-w-[150px]"
                />
              </>
            ) : (
              <GlassSelect
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'present', label: 'Present' },
                  { value: 'absent', label: 'Absent' },
                  { value: 'late', label: 'Late' },
                  { value: 'half-day', label: 'Half Day' }
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by Status"
                className="min-w-[150px]"
              />
            )}
          </div>
        </div>
      </GlassCard>

      {/* Employees List */}
      {activeTab === 'employees' && (
        <GlassCard className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Employee</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Position</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Branch/Store</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Performance</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Attendance</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Salary</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees
                  .filter(employee => {
                    const matchesSearch = !searchQuery || 
                      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      employee.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      employee.department.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
                    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
                    const matchesBranch = branchFilter === 'all' || employee.branchId === branchFilter; // ✨ NEW
                    return matchesSearch && matchesDepartment && matchesStatus && matchesBranch; // ✨ UPDATED
                  })
                  .map((employee) => (
                  <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{employee.firstName} {employee.lastName}</p>
                        <p className="text-sm text-gray-500">{employee.email}</p>
                        <p className="text-xs text-gray-400">{employee.phone}</p>
                        {employee.location && (
                          <p className="text-xs text-gray-400">{employee.location}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{employee.position}</p>
                        <p className="text-sm text-gray-500">Hired: {new Date(employee.hireDate).toLocaleDateString()}</p>
                        {employee.manager && (
                          <p className="text-xs text-gray-400">Manager: {employee.manager}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {employee.department}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {employee.branch ? (
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="text-purple-600" />
                          <span className="text-sm font-medium text-gray-900">{employee.branch.name}</span>
                          {employee.branch.isMain && <span className="text-xs text-gray-500">🏢</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        employee.status === 'active' ? 'bg-green-100 text-green-800' :
                        employee.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        employee.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {employee.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < employee.performance ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                          />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">({employee.performance})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${employee.attendance}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{employee.attendance}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">
                        {(() => {
                          const formatted = new Intl.NumberFormat('en-TZ', {
                            style: 'currency',
                            currency: 'TZS',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          }).format(employee.salary);
                          return formatted.replace(/\.00$/, '').replace(/\.0$/, '');
                        })()}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <GlassButton
                          variant="ghost"
                          size="sm"
                          icon={<Edit size={16} />}
                          onClick={() => handleEditEmployee(employee)}
                        >
                          Edit
                        </GlassButton>
                        <GlassButton
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 size={16} />}
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteEmployee(employee.id)}
                        >
                          Delete
                        </GlassButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {employees.filter(employee => {
            const matchesSearch = !searchQuery || 
              `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
              employee.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
              employee.department.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
            const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
            const matchesBranch = branchFilter === 'all' || employee.branchId === branchFilter; // ✨ NEW
            return matchesSearch && matchesDepartment && matchesStatus && matchesBranch; // ✨ UPDATED
          }).length === 0 && (
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || departmentFilter !== 'all' || statusFilter !== 'all' || branchFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first employee'
                }
              </p>
              {!searchQuery && departmentFilter === 'all' && statusFilter === 'all' && branchFilter === 'all' && (
                <GlassButton
                  onClick={() => setShowCreateEmployee(true)}
                  icon={<Plus size={18} />}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                >
                  Add Your First Employee
                </GlassButton>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* Attendance List */}
      {activeTab === 'attendance' && (
        <GlassCard className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Employee</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Check In</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Check Out</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Hours</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendance
                  .filter(record => {
                    const matchesSearch = !searchQuery || 
                      record.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
                    return matchesSearch && matchesStatus;
                  })
                  .map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{record.employeeName}</p>
                        <p className="text-sm text-gray-500">ID: {record.employeeId}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {record.checkIn || 'Not checked in'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {record.checkOut || 'Not checked out'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'present' ? 'bg-green-100 text-green-800' :
                        record.status === 'absent' ? 'bg-red-100 text-red-800' :
                        record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-gray-900">{record.hours}h</span>
                        {record.hours >= 8 && (
                          <CheckCircle size={14} className="text-green-500" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <GlassButton
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 size={16} />}
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteAttendance(record.id)}
                        >
                          Delete
                        </GlassButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {attendance.filter(record => {
            const matchesSearch = !searchQuery || 
              record.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
            return matchesSearch && matchesStatus;
          }).length === 0 && (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by marking attendance for employees'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <GlassButton
                  onClick={() => setShowAttendanceModal(true)}
                  icon={<Calendar size={18} />}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                >
                  Mark Attendance
                </GlassButton>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* Modals */}
      <EmployeeForm
        employee={editingEmployee}
        isOpen={showCreateEmployee}
        onClose={() => {
          setShowCreateEmployee(false);
          setEditingEmployee(undefined);
        }}
        onSave={handleSaveEmployee}
      />

      <AttendanceModal
        employees={employees}
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        onSave={handleSaveAttendance}
      />
    </div>
  );
};

export default EmployeeManagementPage;
