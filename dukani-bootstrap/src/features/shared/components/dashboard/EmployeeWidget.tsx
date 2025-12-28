import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, CheckCircle, AlertTriangle, UserCheck, Plus, ExternalLink } from 'lucide-react';
import { dashboardService, EmployeeStatus } from '../../../../services/dashboardService';
import { useAuth } from '../../../../context/AuthContext';

interface EmployeeWidgetProps {
  className?: string;
}

export const EmployeeWidget: React.FC<EmployeeWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
  const [stats, setStats] = useState({
    present: 0,
    total: 0,
    onLeave: 0,
    attendanceRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      setIsLoading(true);
      const [employeeStatus, dashboardStats] = await Promise.all([
        dashboardService.getTodayEmployeeStatus(),
        dashboardService.getDashboardStats(currentUser?.id || '')
      ]);
      
      setEmployees(employeeStatus);
      setStats({
        present: dashboardStats.presentToday,
        total: dashboardStats.totalEmployees,
        onLeave: dashboardStats.onLeaveToday,
        attendanceRate: dashboardStats.attendanceRate
      });
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'late': return 'text-orange-600 bg-orange-100';
      case 'absent': return 'text-red-600 bg-red-100';
      case 'on-leave': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle size={12} />;
      case 'late': return <Clock size={12} />;
      case 'absent': return <AlertTriangle size={12} />;
      case 'on-leave': return <UserCheck size={12} />;
      default: return <Users size={12} />;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Staff Today</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {stats.present}/{stats.total} present • {stats.attendanceRate}%
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/employees')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Employees"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Present</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.present}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">On Leave</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.onLeave}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Rate</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.attendanceRate}%</p>
        </div>
      </div>

      {/* Employee Status List */}
      <div className="space-y-3 max-h-64 overflow-y-auto mb-6 flex-grow">
        {employees.length > 0 ? (
          employees.slice(0, 5).map((employee) => (
            <div key={employee.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-gray-700">
                  {employee.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {employee.full_name || employee.email}
                </p>
                <p className="text-xs text-gray-400">
                  {employee.checkInTime ? `Checked in at ${employee.checkInTime}` : 'No check-in'}
                </p>
              </div>
              <span className={`text-xs font-medium capitalize ${
                employee.status === 'present' ? 'text-emerald-600' :
                employee.status === 'late' ? 'text-amber-600' :
                employee.status === 'absent' ? 'text-rose-600' :
                'text-gray-600'
              }`}>
                {employee.status}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No employee data</p>
          </div>
        )}
      </div>

      {/* Actions - Always at bottom */}
      <div className="flex gap-2 mt-auto pt-6">
        <button
          onClick={() => navigate('/employees/add')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          <span>Add Employee</span>
        </button>
      </div>

    </div>
  );
};
