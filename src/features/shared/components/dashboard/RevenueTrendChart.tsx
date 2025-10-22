import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { dashboardService } from '../../../../services/dashboardService';

interface RevenueTrendChartProps {
  className?: string;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ className }) => {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [growth, setGrowth] = useState(0);

  useEffect(() => {
    loadRevenueData();
  }, []);

  const loadRevenueData = async () => {
    try {
      setIsLoading(true);
      
      // Import supabase and branch helper
      const { supabase } = await import('../../../../lib/supabaseClient');
      const { getCurrentBranchId } = await import('../../../../lib/branchAwareApi');
      
      const currentBranchId = getCurrentBranchId();
      
      // Fetch real revenue data from database
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
        
        // Query real sales data for this day
        let query = supabase
          .from('lats_sales')
          .select('total_amount')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
        
        // Apply branch filter if branch is selected
        if (currentBranchId) {
          query = query.eq('branch_id', currentBranchId);
        }
        
        const { data: salesData, error } = await query;
        
        if (error) {
          console.error('Error fetching sales data:', error);
        }
        
        // Calculate total revenue for this day with proper validation
        const dayRevenue = salesData?.reduce((sum, sale) => {
          const amount = sale.total_amount;
          // Safely convert to number and handle invalid values
          const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
          const validAmount = isNaN(numAmount) || numAmount === null || numAmount === undefined ? 0 : numAmount;
          return sum + validAmount;
        }, 0) || 0;
        total += dayRevenue;
        
        data.push({
          day: dayName,
          revenue: dayRevenue,
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
      
      // Validate all revenue values before setting state
      const validatedData = data.map(item => ({
        ...item,
        revenue: isNaN(item.revenue) || item.revenue === null || item.revenue === undefined ? 0 : item.revenue
      }));
      
      setRevenueData(validatedData);
      setTotalRevenue(isNaN(total) || total === null || total === undefined ? 0 : total);
      
      // Calculate growth (compare last 3 days vs previous 4 days) with validation
      const recent = data.slice(-3).reduce((sum, d) => sum + (d.revenue || 0), 0) / 3;
      const previous = data.slice(0, 4).reduce((sum, d) => sum + (d.revenue || 0), 0) / 4;
      const growthPercent = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
      const validGrowth = isNaN(growthPercent) ? 0 : growthPercent;
      setGrowth(Math.round(validGrowth * 10) / 10);
      
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | string) => {
    // Safely convert to number and handle invalid values
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue) || numValue === null || numValue === undefined) {
      return '0';
    }
    
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`;
    }
    if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(0)}K`;
    }
    return numValue.toFixed(0);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="text-xs font-medium mb-1">{payload[0].payload.date}</p>
          <p className="text-sm font-bold">
            TSh {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-48">
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
            <DollarSign className="w-5 h-5 text-gray-700" />
            <h3 className="text-sm font-medium text-gray-900">Revenue This Week</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            TSh {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg ${
          growth >= 0 ? 'bg-emerald-50' : 'bg-red-50'
        }`}>
          <TrendingUp className={`w-4 h-4 ${growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
          <span className={`text-sm font-semibold ${growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {growth >= 0 ? '+' : ''}{growth}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-grow -mx-2 -mb-2 min-h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/>
                <stop offset="30%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="70%" stopColor="#10b981" stopOpacity={0.1}/>
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
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
              tickFormatter={formatCurrency}
              tickLine={false}
              axisLine={false}
              width={50}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={3}
              fill="url(#colorRevenue)"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

