import React, { useState, useEffect } from 'react';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { 
  ChevronLeft, ChevronRight, RefreshCw, Edit, XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fetchAllAppointments, updateAppointment, createAppointment } from '../../../lib/customerApi/appointments';
import AppointmentModal from '../../customers/components/forms/AppointmentModal';

interface CalendarViewTabProps {
  isActive: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  type: 'appointment' | 'meeting' | 'service' | 'reminder' | 'holiday';
  start: string;
  end: string;
  allDay: boolean;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceType?: string;
  technicianName?: string;
  location?: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  color: string;
}

const CalendarViewTab: React.FC<CalendarViewTabProps> = ({ isActive }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (isActive) {
      console.log('📅 CalendarViewTab activated, loading events...');
      loadCalendarEvents();
    }
  }, [isActive, currentDate]);

  const loadCalendarEvents = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading calendar events from database...');
      const appointmentsData = await fetchAllAppointments();
      
      // Transform appointments to calendar events
      const calendarEvents: CalendarEvent[] = appointmentsData.map(appointment => {
        // Parse appointment date and time with validation
        let appointmentDate: Date;
        let endDate: Date;
        
        try {
          // Ensure we have valid date and time
          const dateStr = appointment.appointment_date || new Date().toISOString().split('T')[0];
          const timeStr = appointment.appointment_time || '09:00:00';
          
          appointmentDate = new Date(`${dateStr}T${timeStr}`);
          
          // Validate the date
          if (isNaN(appointmentDate.getTime())) {
            console.warn('Invalid appointment date:', appointment.appointment_date, 'using current date');
            appointmentDate = new Date();
          }
          
          endDate = new Date(appointmentDate.getTime() + (appointment.duration_minutes || 60) * 60000);
          
          // Validate the end date
          if (isNaN(endDate.getTime())) {
            endDate = new Date(appointmentDate.getTime() + 60 * 60000); // Default 1 hour
          }
        } catch (error) {
          console.warn('Error parsing appointment date/time:', error, 'using current date');
          appointmentDate = new Date();
          endDate = new Date(appointmentDate.getTime() + 60 * 60000);
        }
        
        // Get color based on status
        let color = 'blue';
        switch (appointment.status) {
          case 'scheduled':
            color = 'blue';
            break;
          case 'confirmed':
            color = 'green';
            break;
          case 'in-progress':
            color = 'yellow';
            break;
          case 'completed':
            color = 'purple';
            break;
          case 'cancelled':
            color = 'red';
            break;
          default:
            color = 'gray';
        }
        
        return {
          id: appointment.id,
          title: `${appointment.customer_name} - ${appointment.service_type}`,
          type: 'appointment' as const,
          start: appointmentDate.toISOString(),
          end: endDate.toISOString(),
          allDay: false,
          customerName: appointment.customer_name,
          customerPhone: appointment.customer_phone,
          customerEmail: appointment.customer_email,
          serviceType: appointment.service_type,
          technicianName: appointment.technician_name,
          location: appointment.location,
          status: appointment.status as 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled',
          priority: (appointment.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
          notes: appointment.notes,
          color: color
        };
      });
      
      setEvents(calendarEvents);
      console.log('✅ Calendar events loaded successfully:', calendarEvents.length, 'events');
    } catch (error) {
      console.error('❌ Error loading calendar events:', error);
      toast.error('Failed to load calendar events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= lastDay || currentDate.getDay() !== 0) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      try {
        const eventDate = new Date(event.start);
        if (isNaN(eventDate.getTime())) {
          console.warn('Invalid event start date:', event.start);
          return false;
        }
        const eventDateStr = eventDate.toISOString().split('T')[0];
        return eventDateStr === dateStr;
      } catch (error) {
        console.warn('Error parsing event date:', error, event.start);
        return false;
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500';
      case 'high':
        return 'border-orange-500';
      case 'medium':
        return 'border-yellow-500';
      case 'low':
        return 'border-green-500';
      default:
        return 'border-gray-500';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string for formatting:', dateString);
        return 'Invalid Time';
      }
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.warn('Error formatting time:', error, dateString);
      return 'Invalid Time';
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowCreateModal(true);
  };

  if (!isActive) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className="ml-3 text-gray-600">Loading calendar...</span>
      </div>
    );
  }

  const monthDays = getMonthDays(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <GlassButton
            onClick={() => navigateMonth('prev')}
            icon={<ChevronLeft size={18} />}
            variant="secondary"
          />
          <h2 className="text-2xl font-bold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <GlassButton
            onClick={() => navigateMonth('next')}
            icon={<ChevronRight size={18} />}
            variant="secondary"
          />
          <GlassButton
            onClick={goToToday}
            variant="secondary"
            size="sm"
          >
            Today
          </GlassButton>
        </div>
        
        <div className="flex gap-2">
          <GlassButton
            onClick={loadCalendarEvents}
            icon={<RefreshCw size={16} />}
            variant="secondary"
            size="sm"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </GlassButton>
        </div>
      </div>

      {/* Calendar Grid */}
      <GlassCard className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center font-semibold text-gray-700 bg-gray-50 rounded-lg">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day, index) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();
            const dayEvents = getEventsForDate(day);
            
            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border border-gray-200 rounded-lg transition-colors hover:bg-gray-50 cursor-pointer ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                onClick={(e) => {
                  // Only open create modal if clicking on empty space, not on an event
                  if ((e.target as HTMLElement).closest('.event-item')) {
                    return;
                  }
                  handleDateClick(day);
                }}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                } ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                  {day.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className={`event-item p-1 rounded text-xs cursor-pointer border-l-4 transition-all hover:shadow-sm ${getPriorityColor(event.priority)} ${getStatusColor(event.status)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      title={`${event.title} - ${formatTime(event.start)}`}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-xs opacity-75">
                        {formatTime(event.start)}
                      </div>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 text-center font-medium">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Title:</span>
                <p className="text-gray-900">{selectedEvent.title}</p>
              </div>
              
              {selectedEvent.customerName && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Customer:</span>
                  <p className="text-gray-900">{selectedEvent.customerName}</p>
                </div>
              )}
              
              <div>
                <span className="text-sm font-medium text-gray-600">Time:</span>
                <p className="text-gray-900">
                  {formatTime(selectedEvent.start)} - {formatTime(selectedEvent.end)}
                </p>
              </div>
              
              {selectedEvent.location && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Location:</span>
                  <p className="text-gray-900">{selectedEvent.location}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEvent.status)}`}>
                  {selectedEvent.status}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedEvent.priority)}`}>
                  {selectedEvent.priority}
                </span>
              </div>
              
              {selectedEvent.notes && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Notes:</span>
                  <p className="text-gray-900 text-sm">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <GlassButton
                onClick={() => {
                  setEditingEvent(selectedEvent);
                  setSelectedEvent(null);
                }}
                icon={<Edit size={14} />}
                size="sm"
              >
                Edit
              </GlassButton>
              <GlassButton
                onClick={() => setSelectedEvent(null)}
                variant="secondary"
                size="sm"
              >
                Close
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {editingEvent && (
        <AppointmentModal
          isOpen={true}
          onClose={() => setEditingEvent(null)}
          mode="edit"
          appointment={{
            id: editingEvent.id,
            customer_id: editingEvent.customerName || '',
            service_type: editingEvent.serviceType || '',
            appointment_date: editingEvent.start.split('T')[0],
            appointment_time: new Date(editingEvent.start).toTimeString().split(' ')[0],
            status: editingEvent.status as any,
            notes: editingEvent.notes,
            duration_minutes: 60,
            priority: editingEvent.priority,
            technician_id: '',
            created_at: '',
            updated_at: ''
          }}
          onSave={async (appointmentData) => {
            try {
              await updateAppointment(editingEvent.id, appointmentData);
              toast.success('Appointment updated successfully');
              setEditingEvent(null);
              // Refresh calendar
              await loadCalendarEvents();
            } catch (error) {
              console.error('Error updating appointment:', error);
              toast.error('Failed to update appointment');
              throw error;
            }
          }}
        />
      )}

      {/* Create Appointment Modal from Calendar */}
      {showCreateModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Quick Appointment</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedDate(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Creating appointment for {selectedDate.toLocaleDateString()}
            </p>
            
            <p className="text-sm text-gray-700 mb-4">
              Note: This is a quick create. For full appointment details with customer selection, 
              please use the "New Appointment" button in the management tab.
            </p>

            <div className="flex gap-2">
              <GlassButton
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedDate(null);
                }}
              >
                Cancel
              </GlassButton>
              <GlassButton
                onClick={() => {
                  toast.info('Please use "New Appointment" button in Management tab to create appointments with customer details');
                  setShowCreateModal(false);
                  setSelectedDate(null);
                }}
              >
                Go to Management
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default CalendarViewTab;
