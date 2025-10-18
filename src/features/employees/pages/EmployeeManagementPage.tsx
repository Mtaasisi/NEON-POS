import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import SearchBar from '../../../features/shared/components/ui/SearchBar';
import GlassSelect from '../../../features/shared/components/ui/GlassSelect';
import { BackButton } from '../../../features/shared/components/ui/BackButton';
import { EmployeeForm, AttendanceModal } from '../components';
import EmployeeAttendanceCard from '../components/EmployeeAttendanceCard';
import { useAttendanceSettings } from '../../../hooks/useAttendanceSettings';
import { mainOffice } from '../config/officeConfig';
import { 
  Users, UserPlus, Calendar, Clock, TrendingUp, Award, 
  Plus, Edit, Trash2, CheckCircle, AlertTriangle, Filter,
  Mail, Phone, MapPin, Briefcase, Star, Activity, Download,
  BarChart3, UserCheck, CalendarDays, Target
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
  branchId?: string;
  branch?: {
    id: string;
    name: string;
    code: string;
    isMain: boolean;
  };
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
  notes?: string;
}

const EmployeeManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings: attendanceSettings } = useAttendanceSettings();
  
  // State Management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'attendance' | 'reports'>('overview');
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [branches, setBranches] = useState<any[]>([]);
  
  // Modals
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
  
  // Current employee for attendance
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  // Load data from database
  useEffect(() => {
    loadData();
    loadBranches();
  }, []);

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'employees', 'attendance', 'reports'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

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
      // Load employees
      const employeesData = await employeeService.getAllEmployees();
      setEmployees(employeesData);
      
      // Load attendance records
      const attendanceData = await employeeService.getAllAttendanceRecords();
      setAttendanceRecords(attendanceData);
      
      // Set current employee if user is an employee
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
        const employee = await employeeService.getEmployeeByUserId(currentUser?.id || '');
        setCurrentEmployee(employee);
      }
      
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load employee data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEmployee = async (employeeData: Partial<Employee>) => {
    try {
      if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee.id, employeeData);
      } else {
        await employeeService.createEmployee(employeeData);
      }
      await loadData();
      setShowCreateEmployee(false);
      setEditingEmployee(undefined);
    } catch (error) {
      console.error('Failed to save employee:', error);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await employeeService.deleteEmployee(id);
        await loadData();
      } catch (error) {
        console.error('Failed to delete employee:', error);
      }
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowCreateEmployee(true);
  };

  const handleSaveAttendance = async (attendanceData: any) => {
    try {
      await employeeService.markAttendance(attendanceData);
      await loadData();
      setShowAttendanceModal(false);
    } catch (error) {
      console.error('Failed to save attendance:', error);
    }
  };

  const handleCheckIn = async (employeeId: string, time: string) => {
    try {
      await employeeService.checkIn(employeeId);
      await loadData();
      toast.success('Checked in successfully');
    } catch (error) {
      console.error('Check-in failed:', error);
    }
  };

  const handleCheckOut = async (employeeId: string, time: string) => {
    try {
      await employeeService.checkOut(employeeId);
      await loadData();
      toast.success('Checked out successfully');
    } catch (error) {
      console.error('Check-out failed:', error);
    }
  };

  // Statistics calculations
  const stats = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.status === 'active').length,
    onLeaveEmployees: employees.filter(e => e.status === 'on-leave').length,
    todayAttendance: attendanceRecords.filter(r => {
      const today = new Date().toISOString().split('T')[0];
      return r.attendanceDate === today && r.status === 'present';
    }).length,
    averageAttendance: employees.length > 0 
      ? employees.reduce((sum, e) => sum + (e.attendance || 0), 0) / employees.length 
      : 0,
    departments: [...new Set(employees.map(e => e.department))].length,
    branches: branches.length
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading employee data...</span>
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
            <p className="text-gray-600 mt-1">Manage employees, attendance, and HR operations</p>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          <GlassButton
            onClick={() => setShowCreateEmployee(true)}
            icon={<UserPlus size={18} />}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
          >
            Add Employee
          </GlassButton>
          <GlassButton
            onClick={() => setShowAttendanceModal(true)}
            icon={<Calendar size={18} />}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white"
          >
            Mark Attendance
          </GlassButton>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={16} />
            Overview
          </div>
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
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
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} />
            Attendance
          </div>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} />
            Reports
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalEmployees}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </GlassCard>

            <GlassCard className="bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active Today</p>
                  <p className="text-2xl font-bold text-green-900">{stats.todayAttendance}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </GlassCard>

            <GlassCard className="bg-gradient-to-br from-orange-50 to-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Departments</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.departments}</p>
                </div>
                <Briefcase className="w-8 h-8 text-orange-600" />
              </div>
            </GlassCard>

            <GlassCard className="bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Avg. Attendance</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.averageAttendance.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </GlassCard>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <GlassCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {attendanceRecords.slice(0, 5).map((record) => {
                    const employee = employees.find(e => e.id === record.employeeId);
                    return (
                      <div key={record.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {record.status === 'present' ? 'Checked in' : record.status} - {new Date(record.attendanceDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </GlassCard>

            {/* Quick Check-in */}
            {currentEmployee && (
              <GlassCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Check-in</h3>
                  <EmployeeAttendanceCard
                    employeeId={currentEmployee.id}
                    employeeName={`${currentEmployee.firstName} ${currentEmployee.lastName}`}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    officeLocation={mainOffice}
                    officeNetworks={attendanceSettings.offices[0]?.networks || []}
                  />
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      )}

      {activeTab === 'employees' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search employees..."
              />
            </div>
            <GlassSelect
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={[
                { value: 'all', label: 'All Departments' },
                ...employees.map(e => e.department).filter((d, i, arr) => arr.indexOf(d) === i).map(dept => ({
                  value: dept,
                  label: dept
                }))
              ]}
              className="w-full sm:w-48"
            />
            <GlassSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'on-leave', label: 'On Leave' },
                { value: 'terminated', label: 'Terminated' }
              ]}
              className="w-full sm:w-48"
            />
          </div>

          {/* Employees Table */}
          <GlassCard>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Position</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Department</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Attendance</th>
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
                      return matchesSearch && matchesDepartment && matchesStatus;
                    })
                    .map((employee) => (
                    <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-600">
                              {employee.firstName[0]}{employee.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{employee.firstName} {employee.lastName}</p>
                            <p className="text-sm text-gray-500">{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{employee.position}</p>
                        <p className="text-sm text-gray-500">ID: {employee.id.slice(0, 8)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                          {employee.department}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          employee.status === 'active' ? 'bg-green-100 text-green-800' :
                          employee.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          employee.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{employee.attendance}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${employee.attendance}%` }}
                            ></div>
                          </div>
                        </div>
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
              return matchesSearch && matchesDepartment && matchesStatus;
            }).length === 0 && (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || departmentFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first employee'
                  }
                </p>
                {!searchQuery && departmentFilter === 'all' && statusFilter === 'all' && (
                  <GlassButton
                    onClick={() => setShowCreateEmployee(true)}
                    icon={<UserPlus size={18} />}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                  >
                    Add Employee
                  </GlassButton>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard className="bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Present Today</p>
                  <p className="text-2xl font-bold text-green-900">{stats.todayAttendance}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </GlassCard>

            <GlassCard className="bg-gradient-to-br from-red-50 to-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Absent Today</p>
                  <p className="text-2xl font-bold text-red-900">{stats.totalEmployees - stats.todayAttendance}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </GlassCard>

            <GlassCard className="bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.averageAttendance.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </GlassCard>
          </div>

          {/* Employee Check-in */}
          {currentEmployee && (
            <GlassCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">My Attendance</h3>
                <EmployeeAttendanceCard
                  employeeId={currentEmployee.id}
                  employeeName={`${currentEmployee.firstName} ${currentEmployee.lastName}`}
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                  officeLocation={mainOffice}
                  officeNetworks={attendanceSettings.offices[0]?.networks || []}
                />
              </div>
            </GlassCard>
          )}

          {/* Recent Attendance Records */}
          <GlassCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Attendance</h3>
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
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.slice(0, 10).map((record) => {
                      const employee = employees.find(e => e.id === record.employeeId);
                      return (
                        <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-semibold text-blue-600">
                                  {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : '??'}
                                </span>
                              </div>
                              <span className="font-medium text-gray-900">
                                {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900">
                              {new Date(record.attendanceDate).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <Clock size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Not checked in'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <Clock size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Not checked out'}
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
                              <span className="text-sm font-medium text-gray-900">{record.totalHours}h</span>
                              {record.totalHours >= 8 && (
                                <CheckCircle size={14} className="text-green-500" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <GlassCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Department Performance</h4>
                  {Object.entries(
                    employees.reduce((acc, emp) => {
                      if (!acc[emp.department]) {
                        acc[emp.department] = { total: 0, sum: 0 };
                      }
                      acc[emp.department].total += 1;
                      acc[emp.department].sum += emp.attendance;
                      return acc;
                    }, {} as Record<string, { total: number; sum: number }>)
                  ).map(([dept, data]) => (
                    <div key={dept} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{dept}</span>
                      <span className="text-sm text-gray-600">
                        {(data.sum / data.total).toFixed(1)}% avg ({data.total} employees)
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Top Performers</h4>
                  {employees
                    .sort((a, b) => b.attendance - a.attendance)
                    .slice(0, 5)
                    .map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</span>
                        <span className="text-sm text-gray-600">{emp.attendance}%</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
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