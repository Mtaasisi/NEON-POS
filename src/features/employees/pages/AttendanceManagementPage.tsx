import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay } from 'date-fns';
import { supabase } from '../../../lib/supabaseClient';
import toast from 'react-hot-toast';

interface Employee {
  id: string;
  full_name: string; // employees table uses 'full_name' (migrated from 'name')
  position: string;
  status: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave';
  notes: string | null;
}

const AttendanceManagementPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  useEffect(() => {
    fetchEmployees();
    fetchAttendanceRecords();
  }, [selectedMonth]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date');

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (employeeId: string, date: Date, status: string) => {
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      
      // Check if attendance already exists for this employee and date
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('attendance_date', dateString)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('attendance_records')
          .update({
            status,
            check_in_time: status === 'present' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('attendance_records')
          .insert({
            employee_id: employeeId,
            attendance_date: dateString,
            status,
            check_in_time: status === 'present' ? new Date().toISOString() : null,
          });

        if (error) throw error;
      }
      
      toast.success('Attendance marked successfully');
      fetchAttendanceRecords();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return eachDayOfInterval({ start, end });
  };

  const getAttendanceForEmployeeAndDate = (employeeId: string, date: Date) => {
    return attendanceRecords.find(
      (record) => 
        record.employee_id === employeeId && 
        isSameDay(new Date(record.attendance_date), date)
    );
  };

  const getAttendanceStats = (employeeId: string) => {
    const records = attendanceRecords.filter(r => r.employee_id === employeeId);
    return {
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      leave: records.filter(r => r.status === 'leave').length,
    };
  };

  const filteredEmployees = selectedEmployee === 'all' 
    ? employees 
    : employees.filter(e => e.id === selectedEmployee);

  const days = getDaysInMonth();

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 font-medium">Loading attendance...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance Management</h1>
        <p className="text-gray-600">Track and manage employee attendance records</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Month
            </label>
            <input
              type="month"
              value={format(selectedMonth, 'yyyy-MM')}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.position}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              {days.map((day) => (
                <th
                  key={day.toISOString()}
                  className={`px-3 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                    isWeekend(day) ? 'bg-gray-100 text-gray-400' : 'text-gray-500'
                  }`}
                >
                  <div>{format(day, 'EEE')}</div>
                  <div>{format(day, 'd')}</div>
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stats
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmployees.map((employee) => {
              const stats = getAttendanceStats(employee.id);
              return (
                <tr key={employee.id}>
                  <td className="sticky left-0 bg-white px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                    <div className="text-sm text-gray-500">{employee.position}</div>
                  </td>
                  {days.map((day) => {
                    const attendance = getAttendanceForEmployeeAndDate(employee.id, day);
                    const isWeekendDay = isWeekend(day);
                    
                    return (
                      <td
                        key={day.toISOString()}
                        className={`px-1 py-2 text-center ${isWeekendDay ? 'bg-gray-50' : ''}`}
                      >
                        {!isWeekendDay && (
                          <button
                            onClick={() => {
                              const newStatus = attendance?.status === 'present' ? 'absent' : 'present';
                              handleMarkAttendance(employee.id, day, newStatus);
                            }}
                            className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                              attendance?.status === 'present'
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : attendance?.status === 'absent'
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : attendance?.status === 'late'
                                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                : attendance?.status === 'leave'
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                            title={attendance?.status || 'No record'}
                          >
                            {attendance?.status === 'present'
                              ? 'P'
                              : attendance?.status === 'absent'
                              ? 'A'
                              : attendance?.status === 'late'
                              ? 'L'
                              : attendance?.status === 'leave'
                              ? 'LV'
                              : '-'}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs">
                      <div className="text-green-600">P: {stats.present}</div>
                      <div className="text-red-600">A: {stats.absent}</div>
                      <div className="text-yellow-600">L: {stats.late}</div>
                      <div className="text-blue-600">LV: {stats.leave}</div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No employees found. Add employees to start tracking attendance.
        </div>
      )}
    </div>
  );
};

export default AttendanceManagementPage;

