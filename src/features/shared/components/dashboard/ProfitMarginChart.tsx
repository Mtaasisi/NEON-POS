import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';

interface ProfitMarginChartProps {
  className?: string;
}

interface ProfitData {
  day: string;
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export const ProfitMarginChart: React.FC<ProfitMarginChartProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const [profitData, setProfitData] = useState<ProfitData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalProfit, setTotalProfit] = useState(0);
  const [avgMargin, setAvgMargin] = useState(0);

  useEffect(() => {
    loadProfitData();
  }, [currentUser?.id]);

  const loadProfitData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      const data: ProfitData[] = [];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      let totalProfitSum = 0;
      let marginSum = 0;
      let daysWithData = 0;
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Query sales for revenue
        let salesQuery = supabase
          .from('lats_sales')
          .select('total_amount')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
        
        if (currentBranchId) {
          salesQuery = salesQuery.eq('branch_id', currentBranchId);
        }
        
        const { data: salesData, error: salesError } = await salesQuery;
        
        if (salesError) {
          console.error('Error fetching sales:', salesError);
        }
        
        // Calculate revenue
        const dayRevenue = (salesData || []).reduce((sum, sale) => {
          const amount = typeof sale.total_amount === 'string' 
            ? parseFloat(sale.total_amount) 
            : sale.total_amount || 0;
          return sum + amount;
        }, 0);
        
        // Query sale items for costs - Neon compatible approach
        let itemsQuery = supabase
          .from('lats_sale_items')
          .select('id, quantity, unit_price, variant_id, sale_id, created_at')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
        
        if (currentBranchId) {
          itemsQuery = itemsQuery.eq('branch_id', currentBranchId);
        }
        
        const { data: itemsData, error: itemsError } = await itemsQuery;
        
        if (itemsError) {
          console.error('Error fetching items:', itemsError);
        }
        
        // Fetch cost prices for variants
        let dayCost = 0;
        if (itemsData && itemsData.length > 0) {
          const variantIds = [...new Set(itemsData.map((item: any) => item.variant_id).filter(Boolean))];
          
          if (variantIds.length > 0) {
            const { data: variants, error: variantsError } = await supabase
              .from('lats_product_variants')
              .select('id, cost_price')
              .in('id', variantIds);
            
            if (!variantsError && variants) {
              const variantsMap = new Map(variants.map((v: any) => [v.id, v]));
              
              dayCost = itemsData.reduce((sum, item: any) => {
                const variant = variantsMap.get(item.variant_id);
                const costPrice = variant?.cost_price || 0;
                const quantity = item.quantity || 0;
                const cost = typeof costPrice === 'string' ? parseFloat(costPrice) : costPrice;
                return sum + (cost * quantity);
              }, 0);
            } else {
              console.error('Error fetching variants:', variantsError);
            }
          }
        }
        
        const dayProfit = dayRevenue - dayCost;
        const dayMargin = dayRevenue > 0 ? (dayProfit / dayRevenue) * 100 : 0;
        
        totalProfitSum += dayProfit;
        if (dayRevenue > 0) {
          marginSum += dayMargin;
          daysWithData++;
        }
        
        data.push({
          day: dayName,
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayRevenue,
          cost: dayCost,
          profit: dayProfit,
          margin: dayMargin
        });
      }
      
      setProfitData(data);
      setTotalProfit(totalProfitSum);
      setAvgMargin(daysWithData > 0 ? marginSum / daysWithData : 0);
      
    } catch (error) {
      console.error('Error loading profit data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="text-xs font-medium mb-2">{data.date}</p>
          <div className="space-y-1">
            <p className="text-xs">
              <span className="text-emerald-400">Revenue:</span> TSh {formatCurrency(data.revenue)}
            </p>
            <p className="text-xs">
              <span className="text-red-400">Cost:</span> TSh {formatCurrency(data.cost)}
            </p>
            <p className="text-xs font-semibold border-t border-gray-700 pt-1 mt-1">
              <span className="text-blue-400">Profit:</span> TSh {formatCurrency(data.profit)}
            </p>
            <p className="text-xs">
              <span className="text-yellow-400">Margin:</span> {data.margin.toFixed(1)}%
            </p>
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
    <div className={`bg-white rounded-2xl p-6 h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-medium text-gray-900">Profit & Margin</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            TSh {formatCurrency(totalProfit)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Avg Margin: {avgMargin.toFixed(1)}%
          </p>
        </div>
        <div className="px-3 py-2 rounded-lg bg-emerald-50">
          <p className="text-sm font-semibold text-emerald-600">
            Week Profit
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-grow -mx-2 min-h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={profitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis 
              dataKey="day" 
              stroke="#9ca3af" 
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              height={20}
            />
            <YAxis 
              yAxisId="left"
              stroke="#9ca3af" 
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrency}
              width={50}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#9ca3af" 
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              yAxisId="left"
              dataKey="profit" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="margin" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-xs text-gray-600">Profit (TSh)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs text-gray-600">Margin (%)</span>
        </div>
      </div>
    </div>
  );
};

