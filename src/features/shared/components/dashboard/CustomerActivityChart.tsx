import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, UserPlus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardService } from '../../../../services/dashboardService';
import { useAuth } from '../../../../context/AuthContext';

interface CustomerActivityChartProps {
  className?: string;
}

export const CustomerActivityChart: React.FC<CustomerActivityChartProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const [activityData, setActivityData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [newThisWeek, setNewThisWeek] = useState(0);

  useEffect(() => {
    loadCustomerActivity();
  }, [currentUser?.id]);

  const loadCustomerActivity = async () => {
    try {
      setIsLoading(true);
      
      if (currentUser?.id) {
        // Import supabase and branch helper
        const { supabase } = await import('../../../../lib/supabaseClient');
        const { getCurrentBranchId } = await import('../../../../lib/branchAwareApi');
        
        const currentBranchId = getCurrentBranchId();
        const stats = await dashboardService.getDashboardStats(currentUser.id);
        
        // Generate customer activity data for last 30 days from real data
        const data = [];
        const now = new Date();
        let weekCount = 0;
        
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          
          // Get start and end of day
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);
          
          // Fetch real customer registrations for this day
          let customersQuery = supabase
            .from('customers')
            .select('id, created_at')
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString());
          
          if (currentBranchId) {
            customersQuery = customersQuery.eq('branch_id', currentBranchId);
          }
          
          const { data: newCustomersData } = await customersQuery;
          const newCustomers = newCustomersData?.length || 0;
          
          // Fetch real device activity (devices created/updated) for this day
          let devicesQuery = supabase
            .from('devices')
            .select('id, created_at, updated_at')
            .or(`created_at.gte.${startOfDay.toISOString()},updated_at.gte.${startOfDay.toISOString()}`)
            .lte('created_at', endOfDay.toISOString());
          
          if (currentBranchId) {
            devicesQuery = devicesQuery.eq('branch_id', currentBranchId);
          }
          
          const { data: devicesData } = await devicesQuery;
          const activity = devicesData?.length || 0;
          
          // Count new customers for this week
          if (i < 7) {
            weekCount += newCustomers;
          }
          
          data.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            activity: activity,
            newCustomers: newCustomers
          });
        }
        
        setActivityData(data);
        setTotalCustomers(stats.activeCustomers);
        setNewThisWeek(weekCount);
      }
      
    } catch (error) {
      console.error('Error loading customer activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg">
          <p className="text-xs font-medium mb-2">{payload[0].payload.date}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-300">Activity:</span>
              <span className="text-sm font-bold text-blue-400">{payload[0].value}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-300">New:</span>
              <span className="text-sm font-bold text-green-400">{payload[1].value}</span>
            </div>
          </div>
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-gray-700" />
            <h3 className="text-sm font-medium text-gray-900">Customer Activity</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalCustomers}</p>
          <p className="text-xs text-gray-500 mt-1">Total active customers</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 mb-1">
            <UserPlus className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-600">+{newThisWeek}</span>
          </div>
          <p className="text-xs text-gray-500">New this week</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activityData}>
            <defs>
              <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#9ca3af" 
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              interval={4}
            />
            <YAxis 
              stroke="#9ca3af" 
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="activity"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorActivity)"
            />
            <Area
              type="monotone"
              dataKey="newCustomers"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorNew)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-600">Activity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">New Customers</span>
        </div>
      </div>
    </div>
  );
};

