import React, { useState, useEffect } from 'react';
import { Smartphone, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { dashboardService } from '../../../../services/dashboardService';
import { useAuth } from '../../../../context/AuthContext';

interface DeviceStatusChartProps {
  className?: string;
}

export const DeviceStatusChart: React.FC<DeviceStatusChartProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalDevices, setTotalDevices] = useState(0);

  const COLORS = {
    'Active Repairs': '#3b82f6',      // Blue - in-repair, diagnosis-started, reassembled-testing
    'Awaiting Parts': '#f59e0b',      // Amber - awaiting-parts, parts-arrived
    'Completed': '#10b981',           // Green - done, repair-complete
    'New/Assigned': '#8b5cf6',        // Purple - assigned, returned-to-customer-care
    'Failed': '#ef4444'               // Red - failed
  };

  useEffect(() => {
    loadDeviceData();
  }, [currentUser?.id]);

  const loadDeviceData = async () => {
    try {
      setIsLoading(true);
      
      if (currentUser?.id) {
        // Import supabase and branch helper
        const { supabase } = await import('../../../../lib/supabaseClient');
        const { getCurrentBranchId } = await import('../../../../lib/branchAwareApi');
        
        const currentBranchId = getCurrentBranchId();
        
        // Fetch real device data from database
        let query = supabase
          .from('devices')
          .select('id, status');
        
        // Apply branch filter if branch is selected
        if (currentBranchId) {
          query = query.eq('branch_id', currentBranchId);
        }
        
        const { data: devices, error } = await query;
        
        if (error) {
          console.error('Error fetching devices:', error);
          throw error;
        }
        
        // Count devices by status category
        const statusCounts = {
          'Active Repairs': 0,
          'Awaiting Parts': 0,
          'Completed': 0,
          'New/Assigned': 0,
          'Failed': 0
        };
        
        devices?.forEach((device: any) => {
          const status = device.status?.toLowerCase() || '';
          
          // Map database statuses to categories
          if (['in-repair', 'diagnosis-started', 'reassembled-testing'].includes(status)) {
            statusCounts['Active Repairs']++;
          } else if (['awaiting-parts', 'parts-arrived'].includes(status)) {
            statusCounts['Awaiting Parts']++;
          } else if (['done', 'repair-complete'].includes(status)) {
            statusCounts['Completed']++;
          } else if (['assigned', 'returned-to-customer-care'].includes(status)) {
            statusCounts['New/Assigned']++;
          } else if (status === 'failed') {
            statusCounts['Failed']++;
          }
        });
        
        // Convert to chart data format (only show categories with devices)
        const statusData = Object.entries(statusCounts)
          .filter(([_, count]) => count > 0)
          .map(([name, value]) => ({
            name,
            value,
            color: COLORS[name as keyof typeof COLORS]
          }));
        
        setDeviceData(statusData);
        setTotalDevices(devices?.length || 0);
      }
      
    } catch (error) {
      console.error('Error loading device data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="text-sm font-semibold">{payload[0].name}</p>
          <p className="text-xs text-gray-300 mt-1">
            {payload[0].value} devices ({((payload[0].value / totalDevices) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: any) => {
    const percent = ((entry.value / totalDevices) * 100).toFixed(0);
    return `${percent}%`;
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-5 h-5 text-gray-700" />
            <h3 className="text-sm font-medium text-gray-900">Device Status</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalDevices}</p>
          <p className="text-xs text-gray-500 mt-1">Total Devices</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
          <Activity className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={deviceData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
            >
              {deviceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {deviceData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-600 truncate">{item.name}</span>
            <span className="text-xs font-semibold text-gray-900 ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

