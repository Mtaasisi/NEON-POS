import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';

interface SalesChartProps {
  className?: string;
}

export const SalesChart: React.FC<SalesChartProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const [salesData, setSalesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  const [growth, setGrowth] = useState(0);

  useEffect(() => {
    loadSalesData();
  }, [currentUser?.id]);

  const loadSalesData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      const data = [];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      let total = 0;
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        let query = supabase
          .from('lats_sales')
          .select('total_amount')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
        
        if (currentBranchId) {
          query = query.eq('branch_id', currentBranchId);
        }
        
        const { data: salesData, error } = await query;
        
        if (error) {
          console.error('Error fetching sales data:', error);
        }
        
        const daySales = salesData?.reduce((sum, sale) => {
          const amount = sale.total_amount;
          const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
          const validAmount = isNaN(numAmount) || numAmount === null || numAmount === undefined ? 0 : numAmount;
          return sum + validAmount;
        }, 0) || 0;
        
        total += daySales;
        
        data.push({
          day: dayName,
          sales: daySales,
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
      
      const validatedData = data.map(item => ({
        ...item,
        sales: isNaN(item.sales) || item.sales === null || item.sales === undefined ? 0 : item.sales
      }));
      
      setSalesData(validatedData);
      setTotalSales(isNaN(total) || total === null || total === undefined ? 0 : total);
      
      // Calculate growth
      const recent = data.slice(-3).reduce((sum, d) => sum + (d.sales || 0), 0) / 3;
      const previous = data.slice(0, 4).reduce((sum, d) => sum + (d.sales || 0), 0) / 4;
      const growthPercent = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
      const validGrowth = isNaN(growthPercent) ? 0 : growthPercent;
      setGrowth(Math.round(validGrowth * 10) / 10);
      
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | string) => {
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
    <div className={`bg-white rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-medium text-gray-900">Sales This Week</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            TSh {formatCurrency(totalSales)}
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
      <div className="h-48 -mx-2 -mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={salesData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
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
              dataKey="sales"
              stroke="#10b981"
              strokeWidth={3}
              fill="url(#colorSales)"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

