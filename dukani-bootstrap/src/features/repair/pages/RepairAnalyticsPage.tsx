import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '../../../context/DevicesContext';
import { useAuth } from '../../../context/AuthContext';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { BackButton } from '../../shared/components/ui/BackButton';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Clock,
  Wrench, Users, CheckCircle, AlertTriangle, Calendar,
  Download, Filter, Target, Award, Activity
} from 'lucide-react';
import { Device, DeviceStatus } from '../../../types';
import { formatCurrency } from '../../../lib/customerApi';
import { supabase } from '../../../lib/supabaseClient';

interface AnalyticsData {
  totalRevenue: number;
  totalRepairs: number;
  averageRepairTime: number;
  successRate: number;
  technicianPerformance: TechnicianStats[];
  monthlyTrends: MonthlyData[];
  deviceTypeStats: DeviceTypeStat[];
  profitMargin: number;
  averageRepairCost: number;
  partsUsage: PartsUsage[];
}

interface TechnicianStats {
  id: string;
  name: string;
  repairsCompleted: number;
  averageTime: number;
  efficiency: number;
  revenue: number;
  customerSatisfaction: number;
}

interface MonthlyData {
  month: string;
  repairs: number;
  revenue: number;
  profit: number;
}

interface DeviceTypeStat {
  brand: string;
  model: string;
  count: number;
  averageCost: number;
  successRate: number;
}

interface PartsUsage {
  partName: string;
  usageCount: number;
  totalCost: number;
  averageCost: number;
}

const RepairAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');

  // Safely access devices context
  let devices: Device[] = [];
  try {
    const devicesContext = useDevices();
    devices = devicesContext?.devices || [];
  } catch (error) {
    console.warn('Devices context not available:', error);
  }

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, selectedTechnician]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate(timeRange);

      // Load completed repairs within time range
      const { data: repairsData, error: repairsError } = await supabase
        .from('devices')
        .select(`
          *,
          customer:customers(name),
          transitions(*)
        `)
        .eq('status', 'done')
        .gte('updated_at', startDate.toISOString())
        .order('updated_at', { ascending: false });

      if (repairsError) throw repairsError;

      // Load technician data
      const { data: techniciansData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'technician');

      // Load parts usage data
      const { data: partsData } = await supabase
        .from('repair_parts')
        .select(`
          *,
          spare_part:spare_parts(name, selling_price)
        `)
        .gte('created_at', startDate.toISOString());

      // Calculate analytics
      const analytics: AnalyticsData = {
        totalRevenue: calculateTotalRevenue(repairsData || []),
        totalRepairs: repairsData?.length || 0,
        averageRepairTime: calculateAverageRepairTime(repairsData || []),
        successRate: calculateSuccessRate(repairsData || []),
        technicianPerformance: calculateTechnicianPerformance(repairsData || [], techniciansData || []),
        monthlyTrends: calculateMonthlyTrends(repairsData || []),
        deviceTypeStats: calculateDeviceTypeStats(repairsData || []),
        profitMargin: calculateProfitMargin(repairsData || [], partsData || []),
        averageRepairCost: calculateAverageRepairCost(repairsData || []),
        partsUsage: calculatePartsUsage(partsData || [])
      };

      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for calculations
  const getStartDate = (range: string): Date => {
    const now = new Date();
    switch (range) {
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        return new Date(now.getFullYear(), quarterStart, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  };

  const calculateTotalRevenue = (repairs: any[]): number => {
    return repairs.reduce((sum, repair) => {
      const cost = parseFloat(repair.repairCost || '0') || 0;
      return sum + cost;
    }, 0);
  };

  const calculateAverageRepairTime = (repairs: any[]): number => {
    if (repairs.length === 0) return 0;

    const totalTime = repairs.reduce((sum, repair) => {
      if (repair.transitions && repair.transitions.length > 0) {
        const startTime = new Date(repair.transitions[0].timestamp);
        const endTime = new Date(repair.transitions[repair.transitions.length - 1].timestamp);
        return sum + (endTime.getTime() - startTime.getTime());
      }
      return sum;
    }, 0);

    return Math.round((totalTime / repairs.length) / (1000 * 60 * 60)); // hours
  };

  const calculateSuccessRate = (repairs: any[]): number => {
    if (repairs.length === 0) return 0;
    const successful = repairs.filter(r => r.status === 'done').length;
    return Math.round((successful / repairs.length) * 100);
  };

  const calculateTechnicianPerformance = (repairs: any[], technicians: any[]): TechnicianStats[] => {
    return technicians.map(tech => {
      const techRepairs = repairs.filter(r => r.assignedTo === tech.id);
      const totalTime = techRepairs.reduce((sum, repair) => {
        if (repair.transitions && repair.transitions.length > 0) {
          const start = new Date(repair.transitions[0].timestamp);
          const end = new Date(repair.transitions[repair.transitions.length - 1].timestamp);
          return sum + (end.getTime() - start.getTime());
        }
        return sum;
      }, 0);

      const averageTime = techRepairs.length > 0 ? totalTime / techRepairs.length / (1000 * 60 * 60) : 0;
      const revenue = techRepairs.reduce((sum, r) => sum + (parseFloat(r.repairCost || '0') || 0), 0);

      return {
        id: tech.id,
        name: tech.full_name || tech.email,
        repairsCompleted: techRepairs.length,
        averageTime: Math.round(averageTime),
        efficiency: calculateEfficiency(techRepairs),
        revenue,
        customerSatisfaction: 95 // Placeholder - would need customer feedback system
      };
    });
  };

  const calculateEfficiency = (repairs: any[]): number => {
    if (repairs.length === 0) return 0;
    // Simple efficiency calculation based on repairs per day
    const daysWorked = 20; // Assume 20 working days in period
    return Math.min(100, Math.round((repairs.length / daysWorked) * 10));
  };

  const calculateMonthlyTrends = (repairs: any[]): MonthlyData[] => {
    const monthlyData: { [key: string]: MonthlyData } = {};

    repairs.forEach(repair => {
      const date = new Date(repair.updated_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          repairs: 0,
          revenue: 0,
          profit: 0
        };
      }

      monthlyData[monthKey].repairs++;
      monthlyData[monthKey].revenue += parseFloat(repair.repairCost || '0') || 0;
      // Profit calculation would need cost data
      monthlyData[monthKey].profit += (parseFloat(repair.repairCost || '0') || 0) * 0.3; // 30% margin
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  };

  const calculateDeviceTypeStats = (repairs: any[]): DeviceTypeStat[] => {
    const deviceStats: { [key: string]: DeviceTypeStat } = {};

    repairs.forEach(repair => {
      const key = `${repair.brand}-${repair.model}`;
      if (!deviceStats[key]) {
        deviceStats[key] = {
          brand: repair.brand,
          model: repair.model,
          count: 0,
          averageCost: 0,
          successRate: 100
        };
      }
      deviceStats[key].count++;
    });

    // Calculate averages
    Object.values(deviceStats).forEach(stat => {
      const deviceRepairs = repairs.filter(r => r.brand === stat.brand && r.model === stat.model);
      const totalCost = deviceRepairs.reduce((sum, r) => sum + (parseFloat(r.repairCost || '0') || 0), 0);
      stat.averageCost = totalCost / stat.count;
    });

    return Object.values(deviceStats);
  };

  const calculateProfitMargin = (repairs: any[], parts: any[]): number => {
    const totalRevenue = calculateTotalRevenue(repairs);
    const totalPartsCost = parts.reduce((sum, part) => sum + (part.total_cost || 0), 0);
    return totalRevenue > 0 ? Math.round(((totalRevenue - totalPartsCost) / totalRevenue) * 100) : 0;
  };

  const calculateAverageRepairCost = (repairs: any[]): number => {
    if (repairs.length === 0) return 0;
    const totalCost = calculateTotalRevenue(repairs);
    return totalCost / repairs.length;
  };

  const calculatePartsUsage = (parts: any[]): PartsUsage[] => {
    const partsStats: { [key: string]: PartsUsage } = {};

    parts.forEach(part => {
      const partName = part.spare_part?.name || 'Unknown Part';
      if (!partsStats[partName]) {
        partsStats[partName] = {
          partName,
          usageCount: 0,
          totalCost: 0,
          averageCost: 0
        };
      }
      partsStats[partName].usageCount += part.quantity || 1;
      partsStats[partName].totalCost += part.total_cost || 0;
    });

    Object.values(partsStats).forEach(stat => {
      stat.averageCost = stat.totalCost / stat.usageCount;
    });

    return Object.values(partsStats)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10); // Top 10 parts
  };

  const exportAnalytics = () => {
    if (!analyticsData) return;

    const data = {
      summary: {
        totalRevenue: analyticsData.totalRevenue,
        totalRepairs: analyticsData.totalRepairs,
        averageRepairTime: analyticsData.averageRepairTime,
        successRate: analyticsData.successRate,
        profitMargin: analyticsData.profitMargin
      },
      technicianPerformance: analyticsData.technicianPerformance,
      monthlyTrends: analyticsData.monthlyTrends,
      deviceTypeStats: analyticsData.deviceTypeStats,
      partsUsage: analyticsData.partsUsage
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repair-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Data Available</h3>
          <p className="text-gray-600">Unable to load analytics data. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Wrapper Container - Single rounded container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Fixed Header Section */}
        <div className="p-8 border-b border-gray-200 flex-shrink-0">
      <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
          <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Repair Analytics</h1>
                <p className="text-sm text-gray-600">
                  Comprehensive insights into repair operations
                </p>
          </div>
        </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
          <GlassSelect
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
                className="border-2 rounded-xl"
          >
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </GlassSelect>
            <button
            onClick={exportAnalytics}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-300 rounded-xl font-semibold transition-all"
          >
              <Download className="w-4 h-4" />
            Export
            </button>
          </div>
        </div>
      </div>

        {/* Main Container - Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

      {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-semibold text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(analyticsData.totalRevenue)}
              </p>
            </div>
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600 font-medium">+12% from last period</span>
              </div>
          </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-semibold text-gray-600">Total Repairs</p>
              <p className="text-2xl font-bold text-blue-600">
                {analyticsData.totalRepairs}
              </p>
            </div>
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600 font-medium">+8% from last period</span>
              </div>
          </div>

            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 hover:bg-purple-100 hover:border-purple-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-semibold text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {analyticsData.successRate}%
              </p>
            </div>
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <Target className="w-4 h-4 text-purple-500 mr-1" />
                <span className="text-purple-600 font-medium">Above target</span>
              </div>
          </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 hover:bg-orange-100 hover:border-orange-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-semibold text-gray-600">Avg Repair Time</p>
              <p className="text-2xl font-bold text-orange-600">
                {analyticsData.averageRepairTime}h
              </p>
            </div>
                <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600 font-medium">-5% improvement</span>
          </div>
            </div>
      </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Technician Performance */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Technician Performance</h3>
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Award className="w-5 h-5 text-yellow-600" />
                </div>
          </div>
          <div className="space-y-3">
            {analyticsData.technicianPerformance.map((tech) => (
              <div key={tech.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{tech.name}</div>
                  <div className="text-sm text-gray-600">
                    {tech.repairsCompleted} repairs • {tech.averageTime}h avg time
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{tech.efficiency}%</div>
                  <div className="text-sm text-gray-500">Efficiency</div>
                </div>
              </div>
            ))}
          </div>
            </div>

        {/* Monthly Trends */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Monthly Trends</h3>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
          </div>
          <div className="space-y-3">
            {analyticsData.monthlyTrends.slice(-6).map((month) => (
              <div key={month.month} className="flex items-center justify-between">
                <div className="text-sm font-medium">{month.month}</div>
                <div className="text-right">
                  <div className="text-sm font-medium">{month.repairs} repairs</div>
                  <div className="text-xs text-gray-500">{formatCurrency(month.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
            </div>
      </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Device Types */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Popular Device Types</h3>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
          </div>
          <div className="space-y-3">
            {analyticsData.deviceTypeStats.slice(0, 5).map((device) => (
              <div key={`${device.brand}-${device.model}`} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{device.brand} {device.model}</div>
                  <div className="text-sm text-gray-600">{device.count} repairs</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(device.averageCost)}</div>
                  <div className="text-sm text-gray-500">avg cost</div>
                </div>
              </div>
            ))}
          </div>
            </div>

        {/* Parts Usage */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Top Spare Parts Used</h3>
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
          </div>
          <div className="space-y-3">
            {analyticsData.partsUsage.map((part) => (
              <div key={part.partName} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium truncate">{part.partName}</div>
                  <div className="text-sm text-gray-600">{part.usageCount} times used</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(part.totalCost)}</div>
                  <div className="text-sm text-gray-500">total spent</div>
                </div>
              </div>
            ))}
          </div>
            </div>
      </div>

      {/* Profitability Analysis */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Profitability Analysis</h3>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {analyticsData.profitMargin}%
            </div>
            <div className="text-sm text-gray-600">Profit Margin</div>
            <div className="text-xs text-green-600 mt-1">Healthy margin</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {formatCurrency(analyticsData.averageRepairCost)}
            </div>
            <div className="text-sm text-gray-600">Average Repair Cost</div>
            <div className="text-xs text-blue-600 mt-1">Per repair</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {Math.round(analyticsData.totalRevenue * analyticsData.profitMargin / 100)}
            </div>
            <div className="text-sm text-gray-600">Total Profit</div>
            <div className="text-xs text-purple-600 mt-1">For period</div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default RepairAnalyticsPage;
