import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, User, AlertTriangle, CalendarDays } from 'lucide-react';
import { Customer } from '../../../../types';
import { Appointment, CreateAppointmentData, UpdateAppointmentData } from '../../../../lib/customerApi';
import { toast } from 'react-hot-toast';
import SuccessModal from '../../../../components/ui/SuccessModal';
import { useSuccessModal } from '../../../../hooks/useSuccessModal';
import { SuccessIcons } from '../../../../components/ui/SuccessModalIcons';
import { fetchAllAppointments } from '../../../../lib/customerApi/appointments';
import { supabase } from '../../../../lib/supabaseClient';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
  appointment?: Appointment;
  onSave: (data: CreateAppointmentData | UpdateAppointmentData) => Promise<void>;
  mode: 'create' | 'edit';
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  customer,
  appointment,
  onSave,
  mode
}) => {
  const [formData, setFormData] = useState<CreateAppointmentData & { location?: string }>({
    customer_id: customer?.id || '',
    service_type: '',
    appointment_date: '',
    appointment_time: '',
    notes: '',
    duration_minutes: 60,
    priority: 'medium',
    location: '',
    technician_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string }>>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [searchingCustomer, setSearchingCustomer] = useState('');
  const successModal = useSuccessModal();

  const serviceTypes = [
    // Consultations & Meetings
    'Consultation',
    'Product Demonstration',
    'Business Meeting',
    'Follow-up Appointment',
    
    // Sales & Service
    'Product Delivery',
    'Product Installation',
    'Product Pickup',
    'Service Maintenance',
    
    // Technical Services
    'Device Repair',
    'Device Diagnosis',
    'Software Installation',
    'Hardware Upgrade',
    'Data Recovery',
    'Virus Removal',
    'Network Setup',
    'System Configuration',
    
    // Training & Support
    'Training Session',
    'Customer Support',
    'Technical Support',
    
    // Other
    'General Service',
    'Custom Service'
  ];

  // Load technicians and customers on mount
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        // Load technicians
        const { data: techData } = await supabase
          .from('users')
          .select('id, full_name')
          .in('role', ['tech', 'technician', 'admin', 'manager'])
          .order('full_name');
        
        setTechnicians(techData?.map(t => ({
          id: t.id,
          name: t.full_name || 'Unknown'
        })) || []);

        // Load customers (limited initial load)
        const { data: custData } = await supabase
          .from('customers')
          .select('id, name, phone')
          .limit(50)
          .order('name');
        
        setCustomers(custData || []);
      } catch (error) {
        console.error('Error loading dropdown data:', error);
      }
    };

    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen]);

  // Search customers when typing
  useEffect(() => {
    const searchCustomers = async () => {
      if (!searchingCustomer || searchingCustomer.length < 2) return;

      try {
        const { data } = await supabase
          .from('customers')
          .select('id, name, phone')
          .or(`name.ilike.%${searchingCustomer}%,phone.ilike.%${searchingCustomer}%`)
          .limit(20)
          .order('name');
        
        if (data) {
          setCustomers(data);
        }
      } catch (error) {
        console.error('Error searching customers:', error);
      }
    };

    const timeoutId = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchingCustomer]);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && appointment) {
        setFormData({
          customer_id: appointment.customer_id,
          service_type: appointment.service_type,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          notes: appointment.notes || '',
          duration_minutes: appointment.duration_minutes,
          priority: appointment.priority,
          location: (appointment as any).location || '',
          technician_id: appointment.technician_id || ''
        });
      } else if (mode === 'create' && customer) {
        setFormData({
          customer_id: customer.id,
          service_type: '',
          appointment_date: '',
          appointment_time: '',
          notes: '',
          duration_minutes: 60,
          priority: 'medium',
          location: '',
          technician_id: ''
        });
      }
      setError(null);
    }
  }, [isOpen, mode, appointment, customer]);

  // Check for appointment conflicts
  const checkConflicts = async () => {
    if (!formData.appointment_date || !formData.appointment_time) {
      return;
    }

    try {
      const allAppointments = await fetchAllAppointments();
      const appointmentStart = new Date(`${formData.appointment_date}T${formData.appointment_time}`);
      const appointmentEnd = new Date(appointmentStart.getTime() + (formData.duration_minutes || 60) * 60000);

      const conflicts = allAppointments.filter(apt => {
        // Skip checking against self when editing
        if (mode === 'edit' && appointment && apt.id === appointment.id) {
          return false;
        }

        const aptStart = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
        const aptEnd = new Date(aptStart.getTime() + (apt.duration_minutes || 60) * 60000);

        // Check for overlap
        return (appointmentStart < aptEnd && appointmentEnd > aptStart);
      });

      if (conflicts.length > 0) {
        setConflictWarning(`⚠️ Warning: ${conflicts.length} overlapping appointment(s) found at this time.`);
      } else {
        setConflictWarning(null);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  // Check conflicts when date/time changes
  useEffect(() => {
    if (formData.appointment_date && formData.appointment_time) {
      checkConflicts();
    }
  }, [formData.appointment_date, formData.appointment_time, formData.duration_minutes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.customer_id || !formData.service_type || !formData.appointment_date || !formData.appointment_time) {
        throw new Error('Please fill in all required fields');
      }

      await onSave(formData);
      
      // Show success modal
      if (mode === 'create') {
        const appointmentDate = new Date(formData.appointment_date).toLocaleDateString();
        successModal.show(
          `Appointment for ${customer?.name || 'customer'} has been scheduled on ${appointmentDate} at ${formData.appointment_time}!`,
          {
            title: 'Appointment Booked! 📅',
            icon: SuccessIcons.appointmentBooked,
            autoCloseDelay: 3000,
          }
        );
      } else {
        successModal.show(
          'Appointment has been updated successfully!',
          {
            title: 'Appointment Updated! ✅',
            icon: SuccessIcons.appointmentBooked,
            autoCloseDelay: 3000,
          }
        );
      }
      
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save appointment';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Additional scroll prevention for html element
  useEffect(() => {
    if (isOpen) {
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div 
        className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
        style={{
          top: 0, 
          left: 0, 
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          overscrollBehavior: 'none'
        }}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="appointment-form-title"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header - Fixed */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                <CalendarDays className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2" id="appointment-form-title">
                  {mode === 'create' ? 'New Appointment' : 'Edit Appointment'}
                </h3>
                <p className="text-sm text-gray-600">
                  {mode === 'create' ? 'Schedule a new customer appointment' : 'Update appointment details'}
                </p>
              </div>
            </div>
          </div>

          {/* Form - Scrollable */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Alerts */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-red-700">{error}</span>
                </div>
              </div>
            )}

            {conflictWarning && (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium text-yellow-700">{conflictWarning}</span>
              </div>
            )}
            {/* Customer Section */}
            {!customer ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Customer <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <input
                    type="text"
                    value={searchingCustomer}
                    onChange={(e) => setSearchingCustomer(e.target.value)}
                    placeholder="Type name or phone to search..."
                    className="w-full pl-10 pr-3 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
                    autoComplete="off"
                  />
                </div>
                {searchingCustomer && customers.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto border-2 border-gray-200 rounded-xl bg-white shadow-lg">
                    {customers.map(cust => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, customer_id: cust.id }));
                          setSearchingCustomer(`${cust.name} - ${cust.phone}`);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="font-semibold text-sm text-gray-900">{cust.name}</div>
                        <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3" />
                          {cust.phone}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchingCustomer && customers.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">No customers found. Try a different search.</p>
                )}
                {!formData.customer_id && searchingCustomer && (
                  <p className="mt-1 text-xs text-red-600 font-medium">Please select a customer from the list</p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Customer Information</span>
                </div>
                <div className="text-sm text-gray-900 ml-13">
                  <p className="font-bold text-base">{customer.name}</p>
                  <p className="text-gray-600 mt-1">{customer.phone}</p>
                  {customer.email && <p className="text-gray-600">{customer.email}</p>}
                </div>
              </div>
            )}

            {/* Service Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Service Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white font-medium"
                required
              >
              <option value="">-- Select Service Type --</option>
              
              <optgroup label="📋 Consultations & Meetings">
                <option value="Consultation">Consultation</option>
                <option value="Product Demonstration">Product Demonstration</option>
                <option value="Business Meeting">Business Meeting</option>
                <option value="Follow-up Appointment">Follow-up Appointment</option>
              </optgroup>
              
              <optgroup label="🚚 Sales & Service">
                <option value="Product Delivery">Product Delivery</option>
                <option value="Product Installation">Product Installation</option>
                <option value="Product Pickup">Product Pickup</option>
                <option value="Service Maintenance">Service Maintenance</option>
              </optgroup>
              
              <optgroup label="🔧 Technical Services">
                <option value="Device Repair">Device Repair</option>
                <option value="Device Diagnosis">Device Diagnosis</option>
                <option value="Software Installation">Software Installation</option>
                <option value="Hardware Upgrade">Hardware Upgrade</option>
                <option value="Data Recovery">Data Recovery</option>
                <option value="Virus Removal">Virus Removal</option>
                <option value="Network Setup">Network Setup</option>
                <option value="System Configuration">System Configuration</option>
              </optgroup>
              
              <optgroup label="📚 Training & Support">
                <option value="Training Session">Training Session</option>
                <option value="Customer Support">Customer Support</option>
                <option value="Technical Support">Technical Support</option>
              </optgroup>
              
              <optgroup label="📦 Other Services">
                <option value="General Service">General Service</option>
                <option value="Custom Service">Custom Service (Specify in notes)</option>
              </optgroup>
            </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose the type of service for this appointment
              </p>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Appointment Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-3 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Appointment Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, appointment_time: e.target.value }))}
                    className="w-full pl-10 pr-3 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Duration & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                  min="15"
                  step="15"
                  placeholder="60"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
                />
                <p className="mt-1 text-xs text-gray-500">Duration in 15-minute increments</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white font-medium"
                >
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="high">🟠 High Priority</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>
            </div>

            {/* Technician & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assign Technician
                </label>
                <select
                  value={formData.technician_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, technician_id: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white font-medium"
                >
                  <option value="">-- No Assignment --</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Optional - can assign later</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Service Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Shop, Customer's Home, Office..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Add any special instructions or notes for this appointment..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none font-medium"
              />
            </div>
          </form>

          {/* Action Buttons - Fixed Footer */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={(e: any) => {
                e.preventDefault();
                handleSubmit(e);
              }}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  <CalendarDays className="w-5 h-5" />
                  {mode === 'create' ? 'Create Appointment' : 'Update Appointment'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Success Modal - Always rendered so it persists after form closes */}
      <SuccessModal {...successModal.props} />
    </>,
    document.body
  );
};

export default AppointmentModal;
