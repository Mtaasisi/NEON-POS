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
      
      // Fetch real device data to build repair pipeline funnel
      let query = supabase
        .from('devices')
        .select('status, created_at');
      
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data: devicesData, error } = await query;
      
      if (error) {
        console.error('Error fetching devices for funnel:', error);
        throw error;
      }
      
      const devices = devicesData || [];
      
      // Map device statuses to funnel stages
      const statusCounts = {
        'Inquiries': 0,      // New devices (assigned, returned-to-customer-care)
        'Quotes': 0,         // Awaiting parts, parts-arrived
        'Proposals': 0,      // In-repair, diagnosis-started
        'Negotiations': 0,   // Reassembled-testing
        'Closed': 0          // Done, repair-complete
      };
      
      devices.forEach((device: any) => {
        const status = device.status?.toLowerCase() || '';
        
        if (['assigned', 'returned-to-customer-care'].includes(status)) {
          statusCounts['Inquiries']++;
        } else if (['awaiting-parts', 'parts-arrived'].includes(status)) {
          statusCounts['Quotes']++;
        } else if (['in-repair', 'diagnosis-started'].includes(status)) {
          statusCounts['Proposals']++;
        } else if (['reassembled-testing'].includes(status)) {
          statusCounts['Negotiations']++;
        } else if (['done', 'repair-complete'].includes(status)) {
          statusCounts['Closed']++;
        }
      });
      
      // Convert to funnel data format
      const totalInquiries = statusCounts['Inquiries'];
      const stages = Object.entries(statusCounts)
        .filter(([_, count]) => count > 0)
        .map(([stage, value], index) => {
          const percentage = totalInquiries > 0 ? Math.round((value / totalInquiries) * 100) : 0;
          const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
          return {
            stage,
            value,
            color: colors[index] || '#6b7280',
            percentage
          };
        });
      
      // Calculate conversion rate (inquiries to closed)
      const conversionRate = totalInquiries > 0 
        ? Math.round((statusCounts['Closed'] / totalInquiries) * 100)
        : 0;
      
      setFunnelData(stages);
      setConversionRate(conversionRate);
      
    } catch (error) {
      console.error('Error loading funnel data:', error);
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
          return (
            <div key={index} className="relative">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-medium text-gray-700 w-24">{stage.stage}</span>
                <span className="text-xs text-gray-500">{stage.value}</span>
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
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Top Stage</p>
          <p className="text-lg font-bold text-blue-600">{funnelData[0]?.value || 0}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Drop-off</p>
          <p className="text-lg font-bold text-amber-600">
            {funnelData[0]?.value - funnelData[funnelData.length - 1]?.value || 0}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Closed</p>
          <p className="text-lg font-bold text-green-600">
            {funnelData[funnelData.length - 1]?.value || 0}
          </p>
        </div>
      </div>
    </div>
  );
};

