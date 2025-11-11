import React, { useState, useEffect } from 'react';
import { CreditCard, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';

interface PaymentMethodsChartProps {
  className?: string;
}

interface PaymentData {
  name: string;
  value: number;
  color: string;
  count: number;
}

export const PaymentMethodsChart: React.FC<PaymentMethodsChartProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const [paymentData, setPaymentData] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    loadPaymentData();
  }, [currentUser?.id]);

  const loadPaymentData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      // Get last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      let query = supabase
        .from('lats_sales')
        .select('payment_method, total_amount')
        .gte('created_at', weekAgo.toISOString());
      
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data: sales, error } = await query;
      
      if (error) throw error;
      
      // Aggregate by payment method
      const methodMap = new Map<string, { total: number; count: number }>();
      let totalTx = 0;
      let totalAmt = 0;
      
      (sales || []).forEach((sale) => {
        // Handle payment_method which can be a string or JSONB object
        let method = 'Unknown';
        
        if (sale.payment_method) {
          if (typeof sale.payment_method === 'string') {
            method = sale.payment_method;
          } else if (typeof sale.payment_method === 'object') {
            // payment_method is stored as JSONB object, extract the method name
            method = sale.payment_method.method || 
                     sale.payment_method.name || 
                     sale.payment_method.type ||
                     Object.keys(sale.payment_method)[0] || 
                     'Unknown';
          }
        }
        
        const amount = typeof sale.total_amount === 'string' 
          ? parseFloat(sale.total_amount) 
          : sale.total_amount || 0;
        
        totalTx++;
        totalAmt += amount;
        
        if (methodMap.has(method)) {
          const existing = methodMap.get(method)!;
          existing.total += amount;
          existing.count += 1;
        } else {
          methodMap.set(method, { total: amount, count: 1 });
        }
      });
      
      // Define colors for common payment methods
      const colorMap: { [key: string]: string } = {
        'cash': '#10b981',
        'card': '#3b82f6',
        'credit_card': '#3b82f6',
        'debit_card': '#6366f1',
        'mobile_money': '#f59e0b',
        'mpesa': '#f59e0b',
        'bank_transfer': '#8b5cf6',
        'unknown': '#6b7280'
      };
      
      // Convert to array format for chart
      const chartData: PaymentData[] = Array.from(methodMap.entries()).map(([name, data]) => {
        // Ensure name is a string
        const nameStr = String(name || 'Unknown');
        return {
          name: nameStr.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: data.total,
          count: data.count,
          color: colorMap[nameStr.toLowerCase()] || '#6b7280'
        };
      });
      
      setPaymentData(chartData);
      setTotalTransactions(totalTx);
      setTotalAmount(totalAmt);
      
    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `TSh ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `TSh ${(value / 1000).toFixed(0)}K`;
    return `TSh ${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalAmount > 0 ? ((data.value / totalAmount) * 100).toFixed(1) : 0;
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="text-sm font-semibold mb-1">{data.name}</p>
          <p className="text-xs text-gray-300">
            Amount: {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-gray-300">
            Transactions: {data.count}
          </p>
          <p className="text-xs text-emerald-400 font-medium mt-1">
            {percentage}% of total
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
    <div className={`bg-white rounded-2xl p-6 h-full flex flex-col w-full ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-gray-900">Payment Methods</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalTransactions}</p>
          <p className="text-xs text-gray-500 mt-1">
            Total: {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      {/* No Data Message */}
      {paymentData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <CreditCard className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-sm">No payment data available</p>
          <p className="text-xs mt-1">Make sales to see payment distribution</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="flex-grow -mx-2 min-h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend - Auto-fit Grid */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
                gap: 'clamp(0.5rem, 1.5vw, 0.75rem)',
                gridAutoRows: '1fr'
              }}
            >
              {paymentData.map((item, index) => {
                const percentage = totalAmount > 0 ? ((item.value / totalAmount) * 100).toFixed(0) : 0;
                return (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-900 font-medium truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

