import React, { useState, useEffect } from 'react';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { 
  Calendar, Clock, User, Phone, Plus, Edit, Trash2, 
  CheckCircle, XCircle, AlertTriangle, MessageSquare, Send
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AppointmentModal from '../../customers/components/forms/AppointmentModal';
import { createAppointment, fetchAllAppointments, updateAppointment, deleteAppointment, getAppointmentStats } from '../../../lib/customerApi/appointments';

interface AppointmentManagementTabProps {
  isActive: boolean;
  searchQuery: string;
  statusFilter: string;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
}

interface Appointment {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  service_type: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show' | 'scheduled' | 'in-progress';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  technician_name?: string;
  technician_id?: string;
  location?: string;
}

const AppointmentManagementTab: React.FC<AppointmentManagementTabProps> = ({ 
  isActive, 
  searchQuery, 
  statusFilter,
  showCreateModal,
  setShowCreateModal
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    pending: 0,
    completed: 0,
    cancelled: 0
  });

  // Load appointments and stats
  useEffect(() => {
    if (isActive) {
      loadAppointments();
      loadStats();
    }
  }, [isActive, statusFilter]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      console.log('📅 Loading appointments from database...');
      const appointmentsData = await fetchAllAppointments();
      
      // Transform the data to match our interface
      const transformedAppointments = appointmentsData.map(appointment => ({
        id: appointment.id,
        customer_id: appointment.customer_id,
        customer_name: appointment.customer_name || 'Unknown Customer',
        customer_phone: appointment.customer_phone || 'No Phone',
        customer_email: appointment.customer_email,
        service_type: appointment.service_type,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        duration_minutes: appointment.duration_minutes || 60,
        status: appointment.status,
        notes: appointment.notes,
        priority: appointment.priority || 'medium',
        technician_name: appointment.technician_name || 'Unassigned',
        technician_id: appointment.technician_id,
        location: appointment.location
      }));
      
      setAppointments(transformedAppointments);
      console.log(`✅ Loaded ${transformedAppointments.length} appointments`);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      console.log('📊 Loading appointment stats from database...');
      const statsData = await getAppointmentStats();
      
      setStats({
        total: statsData.total || 0,
        today: statsData.today || 0,
        pending: statsData.pending || 0,
        completed: statsData.completed || 0,
        cancelled: statsData.cancelled || 0
      });
      console.log('✅ Loaded appointment stats:', statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Set default stats on error
      setStats({
        total: 0,
        today: 0,
        pending: 0,
        completed: 0,
        cancelled: 0
      });
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = !searchQuery || 
      appointment.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.service_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'scheduled':
        return 'text-blue-600 bg-blue-100';
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'in-progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'completed':
        return 'text-purple-600 bg-purple-100';
      case 'cancelled':
      case 'no-show':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      console.log(`📅 Updating appointment ${appointmentId} status to ${newStatus}`);
      await updateAppointment(appointmentId, { status: newStatus });
      
      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: newStatus as any } : apt
        )
      );
      
      // Refresh stats
      await loadStats();
      toast.success('Appointment status updated successfully');
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Failed to update appointment status');
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        console.log(`🗑️ Deleting appointment ${appointmentId}`);
        await deleteAppointment(appointmentId);
        
        // Update local state
        setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
        
        // Refresh stats
        await loadStats();
        toast.success('Appointment deleted successfully');
      } catch (error) {
        console.error('Error deleting appointment:', error);
        toast.error('Failed to delete appointment');
      }
    }
  };

  if (!isActive) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading appointments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
            </div>
            <Clock className="h-8 w-8 text-green-600" />
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-purple-600" />
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </GlassCard>
      </div>

      {/* Appointments List */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments</h3>
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No appointments found</p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => (
              <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{appointment.customer_name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(appointment.priority)}`}>
                        {appointment.priority}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Service:</span>
                        <p className="font-medium">{appointment.service_type}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Date & Time:</span>
                        <p className="font-medium">{new Date(appointment.appointment_date).toLocaleDateString()} at {appointment.appointment_time}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <p className="font-medium">{appointment.duration_minutes} minutes</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Technician:</span>
                        <p className="font-medium">{appointment.technician_name || 'Unassigned'}</p>
                      </div>
                    </div>
                    
                    {appointment.notes && (
                      <div className="mt-2">
                        <span className="text-gray-600 text-sm">Notes:</span>
                        <p className="text-sm">{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      icon={<Edit size={14} />}
                      onClick={() => setEditingAppointment(appointment)}
                    >
                      Edit
                    </GlassButton>
                    <select
                      value={appointment.status}
                      onChange={(e) => handleStatusUpdate(appointment.id, e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no-show">No Show</option>
                    </select>
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      icon={<Trash2 size={14} />}
                      onClick={() => handleDeleteAppointment(appointment.id)}
                    >
                      Delete
                    </GlassButton>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Create Appointment Modal */}
      <AppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        mode="create"
        onSave={async (appointmentData) => {
          try {
            await createAppointment(appointmentData);
            toast.success('Appointment created successfully');
            setShowCreateModal(false);
            // Refresh appointments
            await loadAppointments();
            await loadStats();
          } catch (error) {
            console.error('Error creating appointment:', error);
            toast.error('Failed to create appointment');
            throw error;
          }
        }}
      />

      {/* Edit Appointment Modal */}
      {editingAppointment && (
        <AppointmentModal
          isOpen={true}
          onClose={() => setEditingAppointment(null)}
          mode="edit"
          appointment={{
            id: editingAppointment.id,
            customer_id: editingAppointment.customer_id || '',
            service_type: editingAppointment.service_type,
            appointment_date: editingAppointment.appointment_date,
            appointment_time: editingAppointment.appointment_time,
            status: editingAppointment.status as any,
            notes: editingAppointment.notes,
            duration_minutes: editingAppointment.duration_minutes,
            priority: editingAppointment.priority,
            technician_id: editingAppointment.technician_id,
            created_at: '',
            updated_at: ''
          }}
          onSave={async (appointmentData) => {
            try {
              await updateAppointment(editingAppointment.id, appointmentData);
              toast.success('Appointment updated successfully');
              setEditingAppointment(null);
              // Refresh appointments
              await loadAppointments();
              await loadStats();
            } catch (error) {
              console.error('Error updating appointment:', error);
              toast.error('Failed to update appointment');
              throw error;
            }
          }}
        />
      )}
    </div>
  );
};

export default AppointmentManagementTab;
