import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Plus, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { dashboardService } from '../../../../services/dashboardService';
import { useAuth } from '../../../../context/AuthContext';
import AppointmentModal from '../../../customers/components/forms/AppointmentModal';
import { createAppointment } from '../../../../lib/customerApi/appointments';
import { toast } from 'react-hot-toast';

interface AppointmentsTrendChartProps {
  className?: string;
}

export const AppointmentsTrendChart: React.FC<AppointmentsTrendChartProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [appointmentData, setAppointmentData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadAppointmentData();
  }, [currentUser?.id]);

  const loadAppointmentData = async () => {
    try {
      setIsLoading(true);
      
      if (currentUser?.id) {
        // Import supabase and branch helper
        const { supabase } = await import('../../../../lib/supabaseClient');
        const { getCurrentBranchId } = await import('../../../../lib/branchAwareApi');
        
        const currentBranchId = getCurrentBranchId();
        
        // Fetch ALL appointments once (much more efficient)
        let allQuery = supabase
          .from('appointments')
          .select('id, appointment_date, appointment_time, status');
        
        if (currentBranchId) {
          allQuery = allQuery.eq('branch_id', currentBranchId);
        }
        
        const { data: allAppointments, error: allError } = await allQuery;
        
        if (allError) {
          console.error('❌ Error fetching appointments:', allError);
          setAppointmentData([]);
          setTodayCount(0);
          setWeekTotal(0);
          return;
        }
        
        console.log('📅 Total appointments in database:', allAppointments?.length || 0);
        console.log('📅 Sample appointments:', allAppointments?.slice(0, 3));
        
        // Build data for last 7 days
        const data = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let total = 0;
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayName = days[date.getDay()];
          
          // Format date as YYYY-MM-DD
          const dateString = date.toISOString().split('T')[0];
          
          // Filter appointments for this specific date
          const dayCount = allAppointments?.filter(apt => {
            if (!apt.appointment_date) return false;
            
            // Handle both date string formats: "2025-10-21" or "2025-10-21T14:30:00+00"
            const aptDate = apt.appointment_date.split('T')[0];
            const matches = aptDate === dateString;
            
            if (i === 0 && matches) {
              console.log(`✅ Today's appointment found:`, apt);
            }
            
            return matches;
          }).length || 0;
          
          total += dayCount;
          
          data.push({
            day: dayName,
            appointments: dayCount,
            isToday: i === 0
          });
        }
        
        console.log('📊 Appointment trend data:', data);
        console.log(`📊 Total this week: ${total}`);
        
        setAppointmentData(data);
        setTodayCount(data[data.length - 1]?.appointments || 0);
        setWeekTotal(total);
      }
      
    } catch (error) {
      console.error('❌ Error loading appointment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="text-xs font-medium mb-1">{payload[0].payload.day}</p>
          <p className="text-sm font-bold">
            {payload[0].value} appointments
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-6 h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-gray-700" />
            <h3 className="text-sm font-medium text-gray-900">Appointments</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{todayCount}</p>
          <p className="text-xs text-gray-500 mt-1">Today • {weekTotal} this week</p>
        </div>
        <div className="px-2.5 py-1.5 rounded-lg bg-pink-50">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-pink-600" />
            <span className="text-sm font-semibold text-pink-600">
              {Math.round((weekTotal / 7) * 10) / 10} avg
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-grow -mx-2 mb-4 min-h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={appointmentData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" vertical={false} />
            <XAxis 
              dataKey="day" 
              stroke="#9ca3af" 
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              height={20}
            />
            <YAxis 
              stroke="#9ca3af" 
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={50}
              domain={[0, 'dataMax']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(236, 72, 153, 0.1)' }} />
            <Bar dataKey="appointments" radius={[6, 6, 0, 0]}>
              {appointmentData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isToday ? '#ec4899' : '#f9a8d4'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Actions - Always at bottom */}
      <div className="flex gap-2 pt-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          <span>Add Appointment</span>
        </button>
        <button
          onClick={() => navigate('/appointments')}
          className="px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Appointments"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {/* Create Appointment Modal */}
      <AppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        mode="create"
        onSave={async (appointmentData) => {
          try {
            await createAppointment(appointmentData);
            toast.success('Appointment created successfully!');
            setShowCreateModal(false);
            // Refresh appointment data
            loadAppointmentData();
          } catch (error) {
            console.error('Error creating appointment:', error);
            toast.error('Failed to create appointment');
            throw error;
          }
        }}
      />
    </div>
  );
};

