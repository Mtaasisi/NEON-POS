import React, { useState, useEffect } from 'react';
import { ShoppingCart, TrendingUp, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';

interface PurchaseOrderChartProps {
  className?: string;
}

interface PODayData {
  day: string;
  date: string;
  pending: number;
  received: number;
  total: number;
}

export const PurchaseOrderChart: React.FC<PurchaseOrderChartProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const [poData, setPOData] = useState<PODayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [growth, setGrowth] = useState(0);

  useEffect(() => {
    loadPOData();
  }, [currentUser?.id]);

  const loadPOData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      const data: PODayData[] = [];
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
        
        // Query purchase orders for this day
        let query = supabase
          .from('purchase_orders')
          .select('id, status')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
        
        // Apply branch filter if branch is selected
        if (currentBranchId) {
          query = query.eq('branch_id', currentBranchId);
        }
        
        const { data: orders, error } = await query;
        
        if (error) {
          console.error('Error fetching PO data:', error);
        }
        
        // Count orders by status
        const allOrders = orders || [];
        const pendingCount = allOrders.filter(o => 
          o.status === 'pending' || o.status === 'ordered'
        ).length;
        const receivedCount = allOrders.filter(o => 
          o.status === 'received'
        ).length;
        
        const dayTotal = allOrders.length;
        total += dayTotal;
        
        data.push({
          day: dayName,
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          pending: pendingCount,
          received: receivedCount,
          total: dayTotal
        });
      }
      
      setPOData(data);
      setTotalOrders(total);
      
      // Calculate growth (compare last 3 days vs previous 4 days)
      const recent = data.slice(-3).reduce((sum, d) => sum + (d.total || 0), 0) / 3;
      const previous = data.slice(0, 4).reduce((sum, d) => sum + (d.total || 0), 0) / 4;
      const growthPercent = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
      setGrowth(Math.round(growthPercent * 10) / 10);
      
    } catch (error) {
      console.error('Error loading PO data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="text-xs font-medium mb-2">{data.date}</p>
          <div className="space-y-1">
            <p className="text-xs">
              <span className="text-amber-400">● Pending:</span> {data.pending}
            </p>
            <p className="text-xs">
              <span className="text-emerald-400">● Received:</span> {data.received}
            </p>
            <p className="text-xs font-semibold border-t border-gray-700 pt-1 mt-1">
              Total: {data.total}
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
    <div className={`bg-white rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-gray-900">Purchase Orders This Week</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
          <p className="text-xs text-gray-500 mt-1">Total orders created</p>
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

      {/* No Data Message */}
      {poData.length === 0 || totalOrders === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <Package className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-sm">No purchase orders this week</p>
          <p className="text-xs mt-1">Create your first order to see trends</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="h-56 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={poData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  stroke="#9ca3af" 
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Bar 
                  dataKey="pending" 
                  stackId="a" 
                  fill="#f59e0b" 
                  radius={[0, 0, 0, 0]}
                  maxBarSize={40}
                />
                <Bar 
                  dataKey="received" 
                  stackId="a" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-xs text-gray-600">Pending Orders</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-xs text-gray-600">Received Orders</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

