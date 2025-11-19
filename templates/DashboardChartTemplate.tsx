/**
 * [YourFeature]Chart.tsx
 * 
 * Template for creating new dashboard chart widgets using Recharts.
 */

import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import GlassCard from '../ui/GlassCard';
import { YourIcon, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface [YourFeature]ChartProps {
  className?: string; // ✅ REQUIRED
}

// Sample data structure
interface ChartData {
  name: string;
  value: number;
  // Add more fields as needed
}

export const [YourFeature]Chart: React.FC<[YourFeature]ChartProps> = ({ 
  className 
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ChartData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [trendPercent, setTrendPercent] = useState(0);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Your API call here
      // const response = await yourApi.getChartData();
      
      // Placeholder data
      const sampleData: ChartData[] = [
        { name: 'Mon', value: 400 },
        { name: 'Tue', value: 300 },
        { name: 'Wed', value: 600 },
        { name: 'Thu', value: 800 },
        { name: 'Fri', value: 500 },
        { name: 'Sat', value: 700 },
        { name: 'Sun', value: 900 },
      ];
      
      setData(sampleData);
      
      // Calculate trend (compare first and last values)
      if (sampleData.length >= 2) {
        const first = sampleData[0].value;
        const last = sampleData[sampleData.length - 1].value;
        const change = ((last - first) / first) * 100;
        
        setTrendPercent(Math.abs(change));
        setTrend(change > 0 ? 'up' : change < 0 ? 'down' : 'neutral');
      }
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError('Failed to load chart data');
      toast.error('Failed to load [YourFeature] chart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className={className}>
      <div className="p-4 sm:p-6">
        {/* Header with Trend */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <YourIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                [Your Chart Title]
              </h3>
            </div>
            {!loading && data.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                {trend === 'up' && (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">
                      +{trendPercent.toFixed(1)}%
                    </span>
                  </>
                )}
                {trend === 'down' && (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-medium">
                      -{trendPercent.toFixed(1)}%
                    </span>
                  </>
                )}
                <span className="text-gray-500">vs. start of period</span>
              </div>
            )}
          </div>
          <button
            onClick={loadChartData}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Refresh chart"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Chart */}
        <div className="h-64 sm:h-80">
          {loading && data.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-red-600 text-sm mb-2">{error}</p>
              <button 
                onClick={loadChartData}
                className="text-blue-600 hover:underline text-sm"
              >
                Try Again
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-sm">No data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {/* Option A: Line Chart */}
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>

              {/* Option B: Bar Chart */}
              {/* <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart> */}
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer (optional) */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last updated</span>
            <span className="text-gray-900 font-medium">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

export default [YourFeature]Chart;

/**
 * REGISTRATION CHECKLIST:
 * 
 * ✅ Step 1: useDashboardSettings.ts
 * ─────────────────────────────────
 * Add to DashboardSettings interface:
 * 
 * widgets: {
 *   yourNewChart: boolean;
 * }
 * 
 * Add to defaultDashboardSettings:
 * 
 * widgets: {
 *   yourNewChart: true,
 * }
 * 
 * 
 * ✅ Step 2: roleBasedWidgets.ts
 * ─────────────────────────────────
 * Add to RoleWidgetPermissions:
 * 
 * export interface RoleWidgetPermissions {
 *   yourNewChart: boolean;
 * }
 * 
 * Add to each role:
 * 
 * const adminWidgetPermissions: RoleWidgetPermissions = {
 *   yourNewChart: true,  // Admin sees it
 * };
 * 
 * const technicianWidgetPermissions: RoleWidgetPermissions = {
 *   yourNewChart: false, // Technician doesn't
 * };
 * 
 * 
 * ✅ Step 3: DashboardPage.tsx
 * ─────────────────────────────────
 * Import:
 * import { YourNewChart } from '../components/dashboard';
 * 
 * Render:
 * {isWidgetEnabled('yourNewChart') && (
 *   <YourNewChart className="h-full" />
 * )}
 * 
 * 
 * ✅ Step 4: DashboardCustomizationSettings.tsx
 * ─────────────────────────────────────────────
 * Add to chartItems array:
 * 
 * const chartItems = [
 *   {
 *     key: 'yourNewChart',
 *     label: 'Your Chart Name',
 *     description: 'Brief description',
 *     icon: YourIcon
 *   },
 * ];
 * 
 * 
 * ✅ Step 5: Export from dashboard/index.ts
 * ──────────────────────────────────────────
 * export { YourNewChart } from './YourNewChart';
 */

