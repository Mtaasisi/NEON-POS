import React, { useState, useEffect } from 'react';
import SecureAttendanceVerification from './SecureAttendanceVerification';
import LeaveRequestModal from './LeaveRequestModal';
import { Clock, CheckCircle, AlertTriangle, Calendar, LogIn, LogOut, Shield, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAttendanceSettings } from '../../../hooks/useAttendanceSettings';
import { employeeService } from '../../../services/employeeService';
import { supabase } from '../../../lib/supabaseClient';

interface EmployeeAttendanceCardProps {
  employeeId: string;
  employeeName: string;
  onCheckIn: (employeeId: string, time: string) => void;
  onCheckOut: (employeeId: string, time: string) => void;
  officeLocation?: {
    lat: number;
    lng: number;
    radius: number;
    address: string;
  };
  officeNetworks?: {
    ssid: string;
    bssid?: string;
    description: string;
  }[];
}

const EmployeeAttendanceCard: React.FC<EmployeeAttendanceCardProps> = ({
  employeeId,
  employeeName,
  onCheckIn,
  onCheckOut,
  officeLocation,
  officeNetworks
}) => {
  const { settings: attendanceSettings, loading: settingsLoading } = useAttendanceSettings();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<{
    checkIn?: string;
    checkOut?: string;
    status: 'not-started' | 'checked-in' | 'checked-out';
  }>({ status: 'not-started' });
  const [isLoading, setIsLoading] = useState(true);
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);

  const [showSecurityVerification, setShowSecurityVerification] = useState(false);

  // Use attendance settings if no office location is provided
  const effectiveOfficeLocation = officeLocation || attendanceSettings.offices[0];
  const effectiveOfficeNetworks = officeNetworks || attendanceSettings.offices[0]?.networks || [];

  // Load today's attendance on mount
  useEffect(() => {
    loadTodayAttendance();
  }, [employeeId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadTodayAttendance = async () => {
    try {
      setIsLoading(true);
      const attendance = await employeeService.getTodayAttendance(employeeId);
      
      if (attendance) {
        const checkInTime = attendance.checkInTime 
          ? new Date(attendance.checkInTime).toTimeString().split(' ')[0]
          : undefined;
        const checkOutTime = attendance.checkOutTime 
          ? new Date(attendance.checkOutTime).toTimeString().split(' ')[0]
          : undefined;

        let status: 'not-started' | 'checked-in' | 'checked-out' = 'not-started';
        if (checkInTime && checkOutTime) {
          status = 'checked-out';
        } else if (checkInTime) {
          status = 'checked-in';
        }

        setTodayAttendance({
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status
        });
      } else {
        setTodayAttendance({ status: 'not-started' });
      }
    } catch (error) {
      console.error('Failed to load today\'s attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = () => {
    // Check if attendance is enabled
    if (!attendanceSettings.enabled) {
      toast.error('Attendance system is disabled');
      return;
    }

    // If security verification is required (location, wifi, or photo), show verification first
    if (effectiveOfficeLocation && effectiveOfficeNetworks && 
        (attendanceSettings.requireLocation || attendanceSettings.requireWifi || attendanceSettings.requirePhoto)) {
      setShowSecurityVerification(true);
      return;
    }
    
    // Otherwise, proceed with normal check-in
    performCheckIn();
  };

  const performCheckIn = async () => {
    try {
      const now = new Date();
      const timeString = now.toTimeString().split(' ')[0];
      
      // Optimistically update UI
      setTodayAttendance({
        checkIn: timeString,
        status: 'checked-in'
      });
      
      // Call parent handler which persists to database
      await onCheckIn(employeeId, timeString);
      
      // Reload from database to ensure sync
      await loadTodayAttendance();
    } catch (error) {
      console.error('Check-in failed:', error);
      // Revert optimistic update on error
      await loadTodayAttendance();
    }
  };

  const handleSecurityVerificationComplete = () => {
    setShowSecurityVerification(false);
    performCheckIn();
  };

  const handleSecurityVerificationFailed = () => {
    setShowSecurityVerification(false);
    toast.error('Security verification failed. Please try again.');
  };

  const handleCheckOut = async () => {
    try {
      const now = new Date();
      const timeString = now.toTimeString().split(' ')[0];
      
      // Optimistically update UI
      setTodayAttendance(prev => ({
        ...prev,
        checkOut: timeString,
        status: 'checked-out'
      }));
      
      // Call parent handler which persists to database
      await onCheckOut(employeeId, timeString);
      
      // Reload from database to ensure sync
      await loadTodayAttendance();
    } catch (error) {
      console.error('Check-out failed:', error);
      // Revert optimistic update on error
      await loadTodayAttendance();
    }
  };

  const handleResetToday = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Delete today's attendance record
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('employee_id', employeeId)
        .eq('attendance_date', today);

      if (error) throw error;

      // Reset UI state
      setTodayAttendance({ status: 'not-started' });
      toast.success('Today\'s attendance cleared! You can now test check-in.');
      
      // Reload to ensure sync
      await loadTodayAttendance();
    } catch (error) {
      console.error('Failed to reset attendance:', error);
      toast.error('Failed to clear today\'s attendance');
    }
  };

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = () => {
    switch (todayAttendance.status) {
      case 'checked-in':
        return 'text-green-600';
      case 'checked-out':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (todayAttendance.status) {
      case 'checked-in':
        return 'Currently Working';
      case 'checked-out':
        return 'Checked Out';
      default:
        return 'Not Checked In';
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading attendance...</span>
          </div>
        ) : (
          <div className="text-center space-y-4">
            {/* Header */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900">{employeeName}</h3>
            </div>

            {/* Current Time */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock size={20} className="text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Current Time</span>
              </div>
              <div className="text-2xl font-mono font-bold text-gray-900">
                {formatTime(currentTime)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {currentTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            {/* Status */}
            <div className={`flex items-center justify-center gap-2 ${getStatusColor()}`}>
              {todayAttendance.status === 'checked-in' && <CheckCircle size={20} />}
              {todayAttendance.status === 'checked-out' && <AlertTriangle size={20} />}
              <span className="font-medium">{getStatusText()}</span>
            </div>

          {/* Attendance Times */}
          {(todayAttendance.checkIn || todayAttendance.checkOut) && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              {todayAttendance.checkIn && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Check In:</span>
                  <span className="font-mono font-medium text-green-700">
                    {todayAttendance.checkIn}
                  </span>
                </div>
              )}
              {todayAttendance.checkOut && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Check Out:</span>
                  <span className="font-mono font-medium text-blue-700">
                    {todayAttendance.checkOut}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons - CBM Calculator Style */}
          <div className="flex gap-3">
            {todayAttendance.status === 'not-started' && (
              <button
                onClick={handleCheckIn}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <LogIn size={18} />
                Check In
              </button>
            )}
            
            {todayAttendance.status === 'checked-in' && (
              <button
                onClick={handleCheckOut}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                Check Out
              </button>
            )}
            
            {todayAttendance.status === 'checked-out' && (
              <div className="flex-1 text-center text-sm text-gray-500 py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                Day completed
              </div>
            )}
          </div>

          {/* Quick Actions - CBM Calculator Style */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Calendar size={16} />
                View History
              </button>
              <button
                onClick={() => setShowLeaveRequestModal(true)}
                className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Clock size={16} />
                Request Leave
              </button>
            </div>
            
            {/* Reset Button for Testing */}
            {(todayAttendance.status === 'checked-in' || todayAttendance.status === 'checked-out') && (
              <button
                onClick={handleResetToday}
                className="w-full mt-2 px-3 py-2 border-2 border-orange-200 rounded-lg text-sm font-medium text-orange-700 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Reset Today (Testing)
              </button>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Security Verification Modal */}
      {showSecurityVerification && officeLocation && officeNetworks && (
        <SecureAttendanceVerification
          onAllVerificationsComplete={handleSecurityVerificationComplete}
          onVerificationFailed={handleSecurityVerificationFailed}
          employeeName={employeeName}
          officeLocation={officeLocation}
          officeNetworks={officeNetworks}
        />
      )}

      {/* Leave Request Modal */}
      {showLeaveRequestModal && (
        <LeaveRequestModal
          employeeId={employeeId}
          employeeName={employeeName}
          onClose={() => setShowLeaveRequestModal(false)}
          onSuccess={() => {
            setShowLeaveRequestModal(false);
            toast.success('Leave request submitted successfully');
          }}
        />
      )}
    </>
  );
};

export default EmployeeAttendanceCard;
