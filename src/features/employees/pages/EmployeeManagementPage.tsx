import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useBranch } from '../../../context/BranchContext';
import { BackButton } from '../../../features/shared/components/ui/BackButton';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import { EmployeeForm, AttendanceModal } from '../components';
import { 
  Users, UserPlus, Calendar, Clock, TrendingUp, Award, 
  Plus, Edit, Trash2, CheckCircle, AlertTriangle, Filter,
  Mail, Phone, MapPin, Briefcase, Star, Activity, Download,
  BarChart3, UserCheck, Search, X, Building2, DollarSign,
  Target, Trophy, BookOpen, ChevronDown, MoreVertical,
  Upload, FileText, Printer, Eye, Copy, Archive
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
  performance: number;
  attendance: number;
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
  const { currentBranch } = useBranch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State Management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'on-leave' | 'terminated'>('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  
  // Modals
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
    loadBranches();
  }, [currentBranch]);

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
    setLoading(true);
    try {
      const employeesData = await employeeService.getAllEmployees();
      setEmployees(employeesData);
      
      const attendanceData = await employeeService.getAllAttendanceRecords();
      setAttendanceRecords(attendanceData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'active').length;
    const inactive = employees.filter(e => e.status === 'inactive').length;
    const onLeave = employees.filter(e => e.status === 'on-leave').length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayPresent = attendanceRecords.filter(r => 
      r.attendanceDate === today && r.status === 'present'
    ).length;
    
    const avgAttendance = total > 0 
      ? employees.reduce((sum, e) => sum + (e.attendance || 0), 0) / total 
      : 0;
    
    const avgPerformance = total > 0
      ? employees.reduce((sum, e) => sum + (e.performance || 0), 0) / total
      : 0;
    
    const totalSalary = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
    const departments = [...new Set(employees.map(e => e.department))].length;

    return {
      total,
      active,
      inactive,
      onLeave,
      todayPresent,
      avgAttendance,
      avgPerformance,
      totalSalary,
      departments
    };
  }, [employees, attendanceRecords]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = !searchQuery || 
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      const matchesBranch = branchFilter === 'all' || employee.branchId === branchFilter;
      
      return matchesSearch && matchesDepartment && matchesStatus && matchesBranch;
    });
  }, [employees, searchQuery, departmentFilter, statusFilter, branchFilter]);

  // Get unique departments
  const departments = useMemo(() => {
    return [...new Set(employees.map(e => e.department))].sort();
  }, [employees]);

  // Handlers
  const handleSaveEmployee = async (employeeData: Partial<Employee>) => {
    try {
      if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee.id, employeeData);
        toast.success('Employee updated successfully');
      } else {
        await employeeService.createEmployee(employeeData);
        toast.success('Employee added successfully');
      }
      await loadData();
      setShowCreateEmployee(false);
      setEditingEmployee(undefined);
    } catch (error) {
      console.error('Failed to save employee:', error);
      toast.error('Failed to save employee');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await employeeService.deleteEmployee(id);
        toast.success('Employee deleted successfully');
        await loadData();
      } catch (error) {
        console.error('Failed to delete employee:', error);
        toast.error('Failed to delete employee');
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
      toast.success('Attendance marked successfully');
      await loadData();
      setShowAttendanceModal(false);
    } catch (error) {
      console.error('Failed to save attendance:', error);
      toast.error('Failed to save attendance');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select employees first');
      return;
    }

    switch (action) {
      case 'export':
        handleExportSelected();
        break;
      case 'archive':
        if (window.confirm(`Archive ${selectedEmployees.length} employees?`)) {
          // Archive logic here
          toast.success('Employees archived');
        }
        break;
      case 'delete':
        if (window.confirm(`Delete ${selectedEmployees.length} employees?`)) {
          try {
            await Promise.all(selectedEmployees.map(id => employeeService.deleteEmployee(id)));
            toast.success('Employees deleted');
            await loadData();
            setSelectedEmployees([]);
          } catch (error) {
            toast.error('Failed to delete employees');
          }
        }
        break;
    }
    setShowBulkActions(false);
  };

  const handleExportSelected = () => {
    const dataToExport = employees.filter(e => selectedEmployees.includes(e.id));
    const csv = [
      ['Name', 'Email', 'Phone', 'Position', 'Department', 'Status', 'Salary', 'Attendance', 'Performance'],
      ...dataToExport.map(e => [
        `${e.firstName} ${e.lastName}`,
        e.email,
        e.phone,
        e.position,
        e.department,
        e.status,
        e.salary,
        `${e.attendance}%`,
        e.performance
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Employees exported');
  };

  const toggleSelectEmployee = (id: string) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      case 'on-leave': return 'bg-yellow-100 text-yellow-700';
      case 'terminated': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-blue-600';
    if (rating >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 font-medium">Loading employees...</span>
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
            <p className="text-gray-600 mt-1">Manage your team, track attendance, and monitor performance</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingEmployee(undefined);
              setShowCreateEmployee(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={18} />
            New Employee
            <span className="hidden sm:inline text-xs opacity-75 ml-2">⌘N</span>
          </button>
          
          <button
            onClick={() => setShowAttendanceModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
          >
            <Clock size={18} />
            <span className="hidden sm:inline">Attendance</span>
          </button>
          
          <button
            onClick={() => handleExportSelected()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-5 hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.active} active</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-5 hover:bg-green-100 transition-colors">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Present Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayPresent}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.avgAttendance.toFixed(1)}% avg</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-5 hover:bg-purple-100 transition-colors">
          <div className="flex items-center gap-3">
            <Star className="w-7 h-7 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Avg Performance</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgPerformance.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">out of 5.0</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-5 hover:bg-orange-100 transition-colors">
          <div className="flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Departments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.departments}</p>
              <p className="text-xs text-gray-500 mt-1">{branches.length} branches</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <GlassCard className="p-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 w-full lg:w-auto lg:min-w-[350px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, position, department, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex rounded-full bg-gray-100 p-1 gap-1">
              {[
                { value: 'all', label: 'All', color: 'blue' },
                { value: 'active', label: 'Active', color: 'green' },
                { value: 'on-leave', label: 'Leave', color: 'yellow' },
                { value: 'inactive', label: 'Inactive', color: 'gray' }
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value as any)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    statusFilter === value
                      ? `bg-${color}-500 text-white`
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  style={statusFilter === value ? {
                    backgroundColor: color === 'blue' ? '#3b82f6' : 
                                     color === 'green' ? '#10b981' :
                                     color === 'yellow' ? '#f59e0b' : '#6b7280'
                  } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Department Filter */}
          {departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          )}

          {/* Branch Filter */}
          {branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Branches</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} {branch.is_main ? '(Main)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedEmployees.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">
                {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('export')}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 inline mr-1" />
                Export
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 inline mr-1" />
                Delete
              </button>
              <button
                onClick={() => setSelectedEmployees([])}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Employees List */}
      <GlassCard className="overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || departmentFilter !== 'all' || statusFilter !== 'all' || branchFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first employee'
              }
            </p>
            {!searchQuery && departmentFilter === 'all' && statusFilter === 'all' && branchFilter === 'all' && (
              <button
                onClick={() => setShowCreateEmployee(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                Add First Employee
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Position</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Performance</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Attendance</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((employee) => (
                  <tr 
                    key={employee.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id)}
                        onChange={() => toggleSelectEmployee(employee.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-white">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-500">{employee.email}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900">{employee.position}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500">{employee.phone}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        <Briefcase className="w-3 h-3" />
                        {employee.department}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {employee.branch ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          <Building2 className="w-3 h-3" />
                          {employee.branch.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No branch</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                        {employee.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {employee.status === 'on-leave' && <Clock className="w-3 h-3 mr-1" />}
                        {employee.status === 'inactive' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {employee.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Star className={`w-4 h-4 ${getPerformanceColor(employee.performance)}`} fill="currentColor" />
                        <span className={`text-sm font-semibold ${getPerformanceColor(employee.performance)}`}>
                          {employee.performance.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">/5.0</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-[60px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-900">{employee.attendance}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                employee.attendance >= 90 ? 'bg-green-500' :
                                employee.attendance >= 75 ? 'bg-blue-500' :
                                employee.attendance >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${employee.attendance}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditEmployee(employee)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(employee.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredEmployees.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-medium">{filteredEmployees.length}</span> of{' '}
                <span className="font-medium">{employees.length}</span> employees
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">View:</span>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Quick Stats by Department */}
      {filteredEmployees.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(dept => {
              const deptEmployees = filteredEmployees.filter(e => e.department === dept);
              const avgPerf = deptEmployees.reduce((sum, e) => sum + e.performance, 0) / deptEmployees.length;
              const avgAtt = deptEmployees.reduce((sum, e) => sum + e.attendance, 0) / deptEmployees.length;
              
              return (
                <div key={dept} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{dept}</h4>
                    <span className="text-sm font-medium text-gray-500">{deptEmployees.length}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Performance:</span>
                      <span className={`font-semibold ${getPerformanceColor(avgPerf)}`}>
                        {avgPerf.toFixed(1)}/5.0
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Attendance:</span>
                      <span className="font-semibold text-gray-900">{avgAtt.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
