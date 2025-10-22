import React, { useState, useEffect } from 'react';
import { Smartphone, Activity, RefreshCw } from 'lucide-react';
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
  const [totalRepairs, setTotalRepairs] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const COLORS = {
    'Active Repairs': '#3b82f6',      // Blue - in-repair, diagnosis-started, reassembled-testing
    'Awaiting Parts': '#f59e0b',      // Amber - awaiting-parts, parts-arrived
    'Completed': '#10b981',           // Green - done, repair-complete
    'New/Assigned': '#8b5cf6',        // Purple - assigned, returned-to-customer-care, pending
    'Failed': '#ef4444'               // Red - failed
  };

  useEffect(() => {
    loadDeviceData();
    
    // Auto-refresh every 30 seconds for live updates
    const refreshInterval = setInterval(() => {
      loadDeviceData();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [currentUser?.id]);

  const loadDeviceData = async () => {
    try {
      setIsLoading(true);
      
      if (currentUser?.id) {
        // Import supabase and branch helper
        const { supabase } = await import('../../../../lib/supabaseClient');
        const { getCurrentBranchId } = await import('../../../../lib/branchAwareApi');
        
        const currentBranchId = getCurrentBranchId();
        
        // Fetch real repair data from devices table (repair tracking)
        let query = supabase
          .from('devices')
          .select('id, status, created_at, updated_at, problem_description, branch_id');
        
        // Apply branch filter if branch is selected
        if (currentBranchId) {
          query = query.eq('branch_id', currentBranchId);
        }
        
        const { data: devices, error } = await query;
        
        if (error) {
          console.error('❌ Error fetching repair data:', error);
          throw error;
        }
        
        console.log('🔧 Repair Data Fetched:', {
          totalRepairs: devices?.length || 0,
          statuses: devices?.map(d => d.status).join(', '),
          branchId: currentBranchId || 'all branches'
        });
        
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
          
          // Map database repair statuses to categories
          if (['in-repair', 'diagnosis-started', 'reassembled-testing'].includes(status)) {
            statusCounts['Active Repairs']++;
          } else if (['awaiting-parts', 'parts-arrived'].includes(status)) {
            statusCounts['Awaiting Parts']++;
          } else if (['done', 'repair-complete', 'completed'].includes(status)) {
            statusCounts['Completed']++;
          } else if (['assigned', 'returned-to-customer-care', 'pending'].includes(status)) {
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
        
        console.log('📊 Repair Status Breakdown:', statusCounts);
        
        setDeviceData(statusData);
        setTotalRepairs(devices?.length || 0);
        setLastUpdated(new Date());
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
            {payload[0].value} devices ({((payload[0].value / totalRepairs) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: any) => {
    const percent = ((entry.value / totalRepairs) * 100).toFixed(0);
    return `${percent}%`;
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return 'Today';
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-5 h-5 text-gray-700" />
            <h3 className="text-sm font-medium text-gray-900">Repair Status</h3>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-400">{getTimeAgo(lastUpdated)}</span>
              <button
                onClick={loadDeviceData}
                disabled={isLoading}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalRepairs}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-xs text-gray-500">Total Repairs • Live Data</p>
            <div className="relative">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75"></div>
            </div>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center ml-4">
          <Activity className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {/* Chart */}
      {deviceData.length === 0 ? (
        <div className="flex-grow flex items-center justify-center min-h-48">
          <div className="text-center">
            <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No repairs found</p>
            <p className="text-xs text-gray-400 mt-1">Device repairs will appear here when added</p>
          </div>
        </div>
      ) : (
        <div className="flex-grow -mx-2 min-h-48">
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
      )}

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

