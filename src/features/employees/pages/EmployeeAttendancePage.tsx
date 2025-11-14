import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { BackButton } from '../../../features/shared/components/ui/BackButton';
import EmployeeAttendanceCard from '../components/EmployeeAttendanceCard';
import { 
  Clock, Calendar, TrendingUp, Activity, 
  CheckCircle, AlertTriangle, CalendarDays, BarChart3, AlertCircle, Settings
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { mainOffice } from '../config/officeConfig';
import { employeeService } from '../../../services/employeeService';
import { useAttendanceSettings } from '../../../hooks/useAttendanceSettings';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  hours: number;
  notes?: string;
}

const EmployeeAttendancePage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { settings: attendanceSettings, loading: settingsLoading } = useAttendanceSettings();
  
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [currentEmployeeName, setCurrentEmployeeName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'stats'>('today');

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) {
        console.log('[Attendance] No current user, skipping data load');
        return;
      }
      
      console.log('[Attendance] Loading data for user:', currentUser.id, currentUser.email);
      setIsLoading(true);
      setError(null);
      try {
        // Find employee record for current user using direct user ID lookup
        const currentEmployee = await employeeService.getEmployeeByUserId(currentUser.id);
        
        if (currentEmployee) {
          console.log('[Attendance] Found employee record:', currentEmployee.id, `${currentEmployee.firstName} ${currentEmployee.lastName}`);
          
          // Set the current employee ID and name
          setCurrentEmployeeId(currentEmployee.id);
          // ✅ Use full_name from users table instead of employee firstName/lastName
          setCurrentEmployeeName(currentUser.fullName || currentUser.full_name || `${currentEmployee.firstName} ${currentEmployee.lastName}`);
          
          // Load attendance history for the current employee
          const attendance = await employeeService.getAttendanceByEmployeeId(currentEmployee.id, 30);
          console.log('[Attendance] Loaded attendance records:', attendance.length);
          
          const formattedHistory: AttendanceRecord[] = attendance.map(att => ({
            id: att.id,
            date: att.attendanceDate,
            checkIn: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('en-US', { hour12: false }) : undefined,
            checkOut: att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString('en-US', { hour12: false }) : undefined,
            status: att.status,
            hours: Number(att.totalHours) || 0,
            notes: att.notes
          }));

          setAttendanceHistory(formattedHistory);
        } else {
          console.warn('[Attendance] No employee record found for user:', currentUser.id, currentUser.email);
          setError('Employee record not found. Please contact your administrator to link your account to an employee profile.');
        }
      } catch (error) {
        console.error('[Attendance] Failed to load attendance history:', error);
        setError('Failed to load attendance data. Please try again.');
        toast.error('Failed to load attendance history');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [currentUser]);

  const reloadAttendance = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      // Use direct user ID lookup for better performance
      const currentEmployee = await employeeService.getEmployeeByUserId(currentUser.id);
      
      if (currentEmployee) {
        const attendance = await employeeService.getAttendanceByEmployeeId(currentEmployee.id, 30);
        
        const formattedHistory: AttendanceRecord[] = attendance.map(att => ({
          id: att.id,
          date: att.attendanceDate,
          checkIn: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('en-US', { hour12: false }) : undefined,
          checkOut: att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString('en-US', { hour12: false }) : undefined,
          status: att.status,
          hours: Number(att.totalHours) || 0,
          notes: att.notes
        }));

        setAttendanceHistory(formattedHistory);
      }
    } catch (error) {
      console.error('Failed to reload attendance:', error);
    }
  }, [currentUser]);

  const handleCheckIn = async (employeeId: string, time: string) => {
    try {
      await employeeService.checkIn(employeeId);
      await reloadAttendance();
    } catch (error) {
      console.error('Check-in failed:', error);
    }
  };

  const handleCheckOut = async (employeeId: string, time: string) => {
    try {
      await employeeService.checkOut(employeeId);
      await reloadAttendance();
    } catch (error) {
      console.error('Check-out failed:', error);
    }
  };

  const getTodayRecord = () => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceHistory.find(record => record.date === today);
  };

  const getStats = () => {
    const totalDays = attendanceHistory.length;
    const presentDays = attendanceHistory.filter(r => r.status === 'present' || r.status === 'late').length;
    const lateDays = attendanceHistory.filter(r => r.status === 'late').length;
    const totalHours = attendanceHistory.reduce((sum, r) => sum + r.hours, 0);
    const avgHours = totalDays > 0 ? totalHours / totalDays : 0;

    return {
      totalDays,
      presentDays,
      lateDays,
      totalHours,
      avgHours,
      attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0
    };
  };

  const getMonthlyCalendarData = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendarData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = attendanceHistory.find(r => r.date === dateStr);
      calendarData.push({
        day,
        dateStr,
        hasAttendance: !!record,
        status: record?.status
      });
    }
    return calendarData;
  };

  const calculateTodayHours = (todayRecord: AttendanceRecord | undefined) => {
    if (!todayRecord || !todayRecord.checkIn) return 0;
    
    if (todayRecord.checkOut) {
      return todayRecord.hours;
    }
    
    // Calculate hours worked so far today
    const checkInTime = new Date(`2000-01-01T${todayRecord.checkIn}`);
    const now = new Date();
    const currentTime = new Date(`2000-01-01T${now.toTimeString().split(' ')[0]}`);
    const diffMs = currentTime.getTime() - checkInTime.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return Math.max(0, hours);
  };

  if (isLoading || settingsLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading attendance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <BackButton to="/dashboard" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>
            <p className="text-gray-600 mt-1">Manage your daily check-ins and view history</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Attendance</h3>
            <p className="text-gray-600 mb-6 max-w-md">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = getStats();
  const todayRecord = getTodayRecord();
  const monthlyCalendar = getMonthlyCalendarData();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header - Minimal Flat */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton to="/dashboard" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>
            <p className="text-gray-600 mt-1">Manage your daily check-ins and view history</p>
          </div>
        </div>
        
        {/* Admin/Manager Actions - Minimal */}
        {currentUser?.role === 'admin' || currentUser?.role === 'manager' ? (
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/employees/attendance-management')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <Settings size={18} />
              Attendance Setup
            </button>
          </div>
        ) : null}
      </div>

      {/* Tab Navigation - Minimal Flat */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${
            activeTab === 'today'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} />
            Today
          </div>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            History
          </div>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${
            activeTab === 'stats'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={16} />
            Statistics
          </div>
        </button>
      </div>

      {/* Attendance Settings Info */}
      {activeTab === 'today' && !attendanceSettings.enabled && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-900">Attendance System Disabled</p>
              <p className="text-sm text-yellow-700">Contact administrator to enable attendance tracking.</p>
            </div>
          </div>
        </div>
      )}

      {/* Verification Methods Info */}
      {activeTab === 'today' && attendanceSettings.enabled && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <p className="font-medium text-blue-900">Active Verification Methods</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {attendanceSettings.requireLocation && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                📍 Location
              </span>
            )}
            {attendanceSettings.requireWifi && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                📶 WiFi
              </span>
            )}
            {attendanceSettings.requirePhoto && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                📷 Photo
              </span>
            )}
            {!attendanceSettings.requireLocation && !attendanceSettings.requireWifi && !attendanceSettings.requirePhoto && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                No verification required
              </span>
            )}
          </div>
        </div>
      )}

      {/* Today's Attendance - Minimal */}
      {activeTab === 'today' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EmployeeAttendanceCard
            employeeId={currentEmployeeId || ''}
            employeeName={currentEmployeeName || 'Loading...'}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            officeLocation={mainOffice.location}
            officeNetworks={mainOffice.networks}
          />
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Today's Summary</h3>
            {todayRecord ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`text-sm font-medium capitalize ${
                    todayRecord.status === 'present' ? 'text-green-600' :
                    todayRecord.status === 'late' ? 'text-yellow-600' :
                    todayRecord.status === 'absent' ? 'text-red-600' :
                    'text-orange-600'
                  }`}>
                    {todayRecord.status}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Check In:</span>
                  <span className="text-sm font-mono font-medium">
                    {todayRecord.checkIn || 'Not checked in'}
                  </span>
                </div>
                {todayRecord.checkOut && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Check Out:</span>
                    <span className="text-sm font-mono font-medium">
                      {todayRecord.checkOut}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Hours Worked:</span>
                  <span className="text-sm font-medium">
                    {calculateTodayHours(todayRecord).toFixed(1)} hours
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No attendance recorded for today</p>
                <p className="text-xs mt-1">Please check in to start tracking</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendance History - Minimal */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Attendance History</h3>
          {attendanceHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Check In</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Check Out</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">
                          {new Date(record.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
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
                          <span className="text-sm font-medium text-gray-900">
                            {typeof record.hours === 'number' ? record.hours.toFixed(1) : '0.0'}h
                          </span>
                          {record.hours >= 8 && (
                            <CheckCircle size={14} className="text-green-500" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <CalendarDays className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Attendance History</h4>
              <p className="text-sm">You haven't recorded any attendance yet.</p>
              <p className="text-xs mt-1">Check in today to start tracking your attendance!</p>
            </div>
          )}
        </div>
      )}

      {/* Statistics - Minimal Flat */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-lg p-5 hover:bg-blue-100 transition-colors">
              <div className="flex items-center gap-3">
                <CalendarDays className="w-7 h-7 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Days</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDays}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-5 hover:bg-green-100 transition-colors">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 mb-1">Present Days</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.presentDays}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-5 hover:bg-purple-100 transition-colors">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-7 h-7 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 mb-1">Attendance Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(() => {
                  const formatted = stats.attendanceRate.toFixed(1);
                  return formatted.replace(/\.0$/, '');
                })()}%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-5 hover:bg-orange-100 transition-colors">
              <div className="flex items-center gap-3">
                <Activity className="w-7 h-7 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 mb-1">Avg. Hours</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(() => {
                  const formatted = stats.avgHours.toFixed(1);
                  return formatted.replace(/\.0$/, '');
                })()}h
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Monthly Overview - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {monthlyCalendar.map((dayData) => {
                const isToday = dayData.dateStr === new Date().toISOString().split('T')[0];
                return (
                  <div
                    key={dayData.day}
                    className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                      isToday 
                        ? 'ring-2 ring-blue-500 ring-offset-1' 
                        : ''
                    } ${
                      dayData.hasAttendance 
                        ? dayData.status === 'present' 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : dayData.status === 'late'
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : dayData.status === 'absent'
                          ? 'bg-red-100 text-red-800 hover:bg-red-200'
                          : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                    title={dayData.hasAttendance ? `${dayData.status} on ${dayData.dateStr}` : 'No attendance record'}
                  >
                    {dayData.day}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 rounded border border-green-300"></div>
                <span>Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-100 rounded border border-yellow-300"></div>
                <span>Late</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 rounded border border-red-300"></div>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-100 rounded border border-gray-300"></div>
                <span>No Record</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded border-2 border-blue-500"></div>
                <span>Today</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAttendancePage;
