import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useBranch } from '../../../context/BranchContext';
import { BackButton } from '../../shared/components/ui/BackButton';
import GlassCard from '../../shared/components/ui/GlassCard';
import EmployeeAttendanceCard from '../components/EmployeeAttendanceCard';
import { 
  Clock, Calendar, TrendingUp, CheckCircle, XCircle,
  Award, Target, Activity, AlertCircle, CalendarDays,
  Trophy, Zap, Sun, Moon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { employeeService } from '../../../services/employeeService';
import { supabase } from '../../../lib/supabaseClient';
import { useAttendanceSettings } from '../../../hooks/useAttendanceSettings';
import { mainOffice } from '../config/officeConfig';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  attendance: number;
  performance: number;
  branchId?: string;
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

const MyAttendancePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const { settings: attendanceSettings } = useAttendanceSettings();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    loadEmployeeData();
  }, [currentUser]);

  const loadEmployeeData = async () => {
    if (!currentUser?.id) return;
    
    setLoading(true);
    try {
      // Get employee record linked to current user
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (empError) {
        console.error('Employee not found:', empError);
        toast.error('Employee record not found. Please contact HR.');
        return;
      }

      setEmployee(empData);

      // Load attendance records for this employee
      const records = await employeeService.getEmployeeAttendanceRecords(empData.id);
      setAttendanceRecords(records);

      // Get today's record
      const today = new Date().toISOString().split('T')[0];
      const todayRec = records.find(r => r.attendanceDate === today);
      setTodayRecord(todayRec || null);

    } catch (error) {
      console.error('Failed to load employee data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (employeeId: string, time: string) => {
    try {
      await employeeService.checkIn(employeeId);
      await loadEmployeeData();
      toast.success('Checked in successfully! Have a great day! 🎉');
    } catch (error) {
      console.error('Check-in failed:', error);
      toast.error('Check-in failed. Please try again.');
    }
  };

  const handleCheckOut = async (employeeId: string, time: string) => {
    try {
      await employeeService.checkOut(employeeId);
      await loadEmployeeData();
      toast.success('Checked out successfully! See you tomorrow! 👋');
    } catch (error) {
      console.error('Check-out failed:', error);
      toast.error('Check-out failed. Please try again.');
    }
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    const thisMonth = attendanceRecords.filter(r => {
      const recordDate = new Date(r.attendanceDate);
      const now = new Date();
      return recordDate.getMonth() === now.getMonth() && 
             recordDate.getFullYear() === now.getFullYear();
    });

    const presentDays = thisMonth.filter(r => r.status === 'present').length;
    const lateDays = thisMonth.filter(r => r.status === 'late').length;
    const totalHours = thisMonth.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const avgHours = thisMonth.length > 0 ? totalHours / thisMonth.length : 0;

    return {
      thisMonthDays: thisMonth.length,
      presentDays,
      lateDays,
      totalHours,
      avgHours,
      attendanceRate: employee?.attendance || 0,
      performance: employee?.performance || 0
    };
  }, [attendanceRecords, employee]);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', icon: Sun };
    if (hour < 18) return { text: 'Good Afternoon', icon: Sun };
    return { text: 'Good Evening', icon: Moon };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 font-medium">Loading your attendance...</span>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <GlassCard className="p-12 text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee Record Not Found</h2>
          <p className="text-gray-600 mb-4">
            Your user account is not linked to an employee record.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your HR department to link your account.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with Greeting */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton to="/dashboard" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GreetingIcon className="w-6 h-6 text-yellow-500" />
              <h1 className="text-3xl font-bold text-gray-900">{greeting.text}!</h1>
            </div>
            <p className="text-gray-600">
              {employee.firstName} {employee.lastName} - <span className="font-medium">{employee.position}</span>
            </p>
          </div>
        </div>

        {/* Quick Stats Badge */}
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-green-50 rounded-lg">
            <div className="text-xs text-green-600 font-medium">Attendance</div>
            <div className="text-2xl font-bold text-green-700">{stats.attendanceRate}%</div>
          </div>
          <div className="px-4 py-2 bg-purple-50 rounded-lg">
            <div className="text-xs text-purple-600 font-medium">Performance</div>
            <div className="text-2xl font-bold text-purple-700">{stats.performance.toFixed(1)}/5</div>
          </div>
        </div>
      </div>

      {/* Main Check-in/out Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Attendance Card (Takes 2 columns) */}
        <div className="lg:col-span-2">
          <EmployeeAttendanceCard
            employeeId={employee.id}
            employeeName={`${employee.firstName} ${employee.lastName}`}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            officeLocation={mainOffice}
            officeNetworks={attendanceSettings.offices[0]?.networks || []}
          />
        </div>

        {/* Right: Today's Summary */}
        <div>
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              Today's Summary
            </h3>
            
            <div className="space-y-4">
              {todayRecord ? (
                <>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Status</span>
                    </div>
                    <p className="text-lg font-bold text-green-700 capitalize">
                      {todayRecord.status}
                    </p>
                  </div>

                  {todayRecord.checkInTime && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-1">Check In</div>
                      <p className="text-lg font-mono font-bold text-blue-700">
                        {new Date(todayRecord.checkInTime).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  )}

                  {todayRecord.checkOutTime && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-purple-900 mb-1">Check Out</div>
                      <p className="text-lg font-mono font-bold text-purple-700">
                        {new Date(todayRecord.checkOutTime).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  )}

                  {todayRecord.totalHours > 0 && (
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-orange-900 mb-1">Hours Worked</div>
                      <p className="text-lg font-bold text-orange-700">
                        {todayRecord.totalHours.toFixed(1)} hours
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No attendance record for today</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Monthly Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-5 hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-3">
            <Calendar className="w-7 h-7 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisMonthDays}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.presentDays} present</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-5 hover:bg-green-100 transition-colors">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.attendanceRate}%</p>
              <p className="text-xs text-gray-500 mt-1">overall</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-5 hover:bg-purple-100 transition-colors">
          <div className="flex items-center gap-3">
            <Clock className="w-7 h-7 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalHours.toFixed(0)}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.avgHours.toFixed(1)}h avg/day</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-5 hover:bg-orange-100 transition-colors">
          <div className="flex items-center gap-3">
            <Award className="w-7 h-7 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Performance</p>
              <p className="text-2xl font-bold text-gray-900">{stats.performance.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">out of 5.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Attendance History */}
      <GlassCard>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Recent Attendance History
          </h3>
          
          {attendanceRecords.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No attendance records yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Check In</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Check Out</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Hours</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendanceRecords.slice(0, 10).map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">
                          {new Date(record.attendanceDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        {record.checkInTime ? (
                          <span className="text-sm font-mono text-gray-700">
                            {new Date(record.checkInTime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">--:--</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {record.checkOutTime ? (
                          <span className="text-sm font-mono text-gray-700">
                            {new Date(record.checkOutTime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">--:--</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-semibold text-gray-900">
                          {record.totalHours.toFixed(1)}h
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          record.status === 'present' ? 'bg-green-100 text-green-700' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                          record.status === 'half-day' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {record.status === 'present' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {record.status === 'absent' && <XCircle className="w-3 h-3 mr-1" />}
                          {record.status.replace('-', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Performance Insights */}
      {stats.attendanceRate >= 95 && stats.performance >= 4 && (
        <GlassCard className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <div className="p-6 flex items-center gap-4">
            <div className="bg-yellow-500 rounded-full p-3">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Outstanding Performance! 🎉</h3>
              <p className="text-gray-700">
                You're doing amazing! Keep up the excellent work with {stats.attendanceRate}% attendance 
                and {stats.performance.toFixed(1)}/5.0 performance rating!
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default MyAttendancePage;

