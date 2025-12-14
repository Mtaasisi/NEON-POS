import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Plus, ExternalLink } from 'lucide-react';
import { dashboardService, AppointmentSummary } from '../../../../services/dashboardService';
import { useAuth } from '../../../../context/AuthContext';

interface AppointmentWidgetProps {
  className?: string;
}

export const AppointmentWidget: React.FC<AppointmentWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [stats, setStats] = useState({
    today: 0,
    upcoming: 0,
    completionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      const [todayAppointments, dashboardStats] = await Promise.all([
        dashboardService.getTodayAppointments(4),
        dashboardService.getDashboardStats(currentUser?.id || '')
      ]);
      
      setAppointments(todayAppointments);
      setStats({
        today: dashboardStats.todayAppointments,
        upcoming: dashboardStats.upcomingAppointments,
        completionRate: dashboardStats.appointmentCompletionRate
      });
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-emerald-600 bg-emerald-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'scheduled': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-300';
      case 'high': return 'border-orange-300';
      case 'medium': return 'border-blue-300';
      default: return 'border-gray-300';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const time = new Date(`2000-01-01T${timeString}`);
      return time.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return timeString;
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
            <Calendar className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Today's Schedule</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {stats.today} appointments • {stats.completionRate}% done
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/appointments')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Appointments"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Today</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.today}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Upcoming</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.upcoming}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Done</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.completionRate}%</p>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-3 max-h-64 overflow-y-auto mb-6 flex-grow">
        {appointments.length > 0 ? (
          appointments.map((appointment) => (
            <div key={appointment.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Clock size={14} className="text-gray-500" />
                    <span className="text-sm font-semibold text-gray-900">
                      {formatTime(appointment.time)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      appointment.status === 'confirmed' || appointment.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                      appointment.status === 'in-progress' ? 'bg-blue-50 text-blue-600' :
                      appointment.status === 'cancelled' ? 'bg-rose-50 text-rose-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {appointment.customerName}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {appointment.serviceName}
                  </p>
                  {appointment.technicianName && (
                    <div className="flex items-center gap-1 mt-1">
                      <User size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-400">{appointment.technicianName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No appointments today</p>
          </div>
        )}
      </div>

      {/* Actions - Always at bottom */}
      <div className="flex gap-2 mt-auto pt-6">
        <button
          onClick={() => navigate('/appointments/new')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          <span>Add Appointment</span>
        </button>
      </div>

    </div>
  );
};
