import React, { useState, useEffect } from 'react';
import { Filter, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SalesFunnelChartProps {
  className?: string;
}

export const SalesFunnelChart: React.FC<SalesFunnelChartProps> = ({ className }) => {
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [conversionRate, setConversionRate] = useState(0);

  useEffect(() => {
    loadFunnelData();
  }, []);

  const loadFunnelData = async () => {
    try {
      setIsLoading(true);
      
      // Import supabase and branch helper
      const { supabase } = await import('../../../../lib/supabaseClient');
      const { getCurrentBranchId } = await import('../../../../lib/branchAwareApi');
      
      const currentBranchId = getCurrentBranchId();
      
      console.log('🔍 Sales Funnel: Loading data for branch:', currentBranchId);
      
      // Fetch real sales data to build sales funnel
      let query = supabase
        .from('lats_sales')
        .select('payment_status, total_amount, created_at, customer_id');
      
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data: salesData, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching sales for funnel:', error);
        throw error;
      }
      
      const sales = salesData || [];
      console.log('✅ Loaded', sales.length, 'sales records for funnel');
      
      // Also get unique customers for lead tracking
      const uniqueCustomers = new Set(sales.map(s => s.customer_id));
      
      // Map payment statuses to funnel stages
      const statusCounts = {
        'Leads': uniqueCustomers.size,  // Unique customers (potential leads)
        'Initiated': 0,                  // All sales created
        'Pending': 0,                    // Payment pending
        'Completed': 0,                  // Payment completed
        'Converted': 0                   // Revenue generated
      };
      
      let totalRevenue = 0;
      
      sales.forEach((sale: any) => {
        const status = sale.payment_status?.toLowerCase() || 'pending';
        statusCounts['Initiated']++;
        
        if (status === 'pending') {
          statusCounts['Pending']++;
        } else if (status === 'completed') {
          statusCounts['Completed']++;
          statusCounts['Converted']++;
          totalRevenue += parseFloat(sale.total_amount || 0);
        }
      });
      
      // Convert to funnel data format - create progressive funnel
      const funnelStages = [
        { stage: 'Leads', value: statusCounts['Leads'], color: '#3b82f6' },
        { stage: 'Initiated', value: statusCounts['Initiated'], color: '#8b5cf6' },
        { stage: 'Pending', value: statusCounts['Pending'], color: '#f59e0b' },
        { stage: 'Completed', value: statusCounts['Completed'], color: '#10b981' },
        { stage: 'Revenue', value: Math.round(totalRevenue), color: '#059669', isRevenue: true }
      ];
      
      // Calculate percentages based on leads (top of funnel)
      const totalLeads = Math.max(statusCounts['Leads'], statusCounts['Initiated']);
      const stages = funnelStages.map(stage => {
        const percentage = totalLeads > 0 ? Math.round((stage.value / totalLeads) * 100) : 0;
        return {
          ...stage,
          percentage: Math.min(percentage, 100) // Cap at 100%
        };
      });
      
      // Calculate conversion rate (leads to completed)
      const conversionRate = totalLeads > 0 
        ? Math.round((statusCounts['Completed'] / totalLeads) * 100)
        : 0;
      
      console.log('📊 Funnel Data:', {
        leads: statusCounts['Leads'],
        initiated: statusCounts['Initiated'],
        pending: statusCounts['Pending'],
        completed: statusCounts['Completed'],
        revenue: totalRevenue,
        conversionRate: `${conversionRate}%`
      });
      
      setFunnelData(stages);
      setConversionRate(conversionRate);
      
    } catch (error) {
      console.error('❌ Error loading sales funnel data:', error);
      // Set empty data on error to show component is working but has no data
      setFunnelData([]);
      setConversionRate(0);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg">
          <p className="text-sm font-semibold mb-2">{payload[0].payload.stage}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-300">Count:</span>
              <span className="text-sm font-bold">{payload[0].value}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-300">Of Total:</span>
              <span className="text-sm font-bold text-blue-400">{payload[0].payload.percentage}%</span>
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
            <Filter className="w-5 h-5 text-gray-700" />
            <h3 className="text-sm font-medium text-gray-900">Sales Funnel</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">Conversion pipeline analysis</p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-green-50">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-600">
              {conversionRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-2 mb-6">
        {funnelData.map((stage, index) => {
          const width = stage.percentage;
          const isRevenue = stage.stage === 'Revenue';
          return (
            <div key={index} className="relative">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-medium text-gray-700 w-24">{stage.stage}</span>
                <span className="text-xs text-gray-500">
                  {isRevenue ? `TSh ${stage.value.toLocaleString()}` : stage.value}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                <div 
                  className="h-full rounded-full flex items-center justify-end px-3 transition-all duration-500"
                  style={{ 
                    width: `${width}%`,
                    backgroundColor: stage.color
                  }}
                >
                  <span className="text-xs font-semibold text-white">
                    {stage.percentage}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Leads</p>
          <p className="text-lg font-bold text-blue-600">{funnelData[0]?.value || 0}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Drop-off</p>
          <p className="text-lg font-bold text-amber-600">
            {/* Calculate drop-off as Leads - Completed (compare counts, not revenue) */}
            {Math.max(0, (funnelData[0]?.value || 0) - (funnelData[3]?.value || 0))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Revenue</p>
          <p className="text-lg font-bold text-green-600">
            {/* Show revenue from the last stage */}
            TSh {(funnelData[4]?.value || 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

