import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { dashboardService } from '../../../../services/dashboardService';
import { useAuth } from '../../../../context/AuthContext';

interface AppointmentsTrendChartProps {
  className?: string;
}

export const AppointmentsTrendChart: React.FC<AppointmentsTrendChartProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const [appointmentData, setAppointmentData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);

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
        
        // Fetch real appointment data from database
        const data = [];
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        let total = 0;
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayName = days[date.getDay()];
          
          // Get start and end of day
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);
          
          // Query real appointments for this day
          let query = supabase
            .from('appointments')
            .select('id')
            .gte('appointment_date', startOfDay.toISOString())
            .lte('appointment_date', endOfDay.toISOString());
          
          // Note: branch_id column doesn't exist in appointments table yet
          // Commenting out branch filter until migration is run
          // if (currentBranchId) {
          //   query = query.eq('branch_id', currentBranchId);
          // }
          
          const { data: appointmentsData, error } = await query;
          
          if (error) {
            console.error('Error fetching appointments data:', error);
          }
          
          // Count appointments for this day
          const dayCount = appointmentsData?.length || 0;
          total += dayCount;
          
          data.push({
            day: dayName,
            appointments: dayCount,
            isToday: i === 0
          });
        }
        
        setAppointmentData(data);
        setTodayCount(data[data.length - 1]?.appointments || 0);
        setWeekTotal(total);
      }
      
    } catch (error) {
      console.error('Error loading appointment data:', error);
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
    <div className={`bg-white rounded-2xl p-6 ${className}`}>
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
      <div className="h-48 -mx-2 -mb-2">
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
    </div>
  );
};

