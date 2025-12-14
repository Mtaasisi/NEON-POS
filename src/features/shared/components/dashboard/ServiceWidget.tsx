import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, CheckCircle, Clock, TrendingUp, AlertCircle, Plus, ExternalLink } from 'lucide-react';
import { dashboardService } from '../../../../services/dashboardService';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';

interface ServiceWidgetProps {
  className?: string;
}

interface ServiceMetrics {
  activeServices: number;
  completedToday: number;
  completedThisWeek: number;
  inProgressServices: number;
  completionRate: number;
  avgCompletionTime: number;
  popularServices: Array<{
    name: string;
    count: number;
  }>;
}

export const ServiceWidget: React.FC<ServiceWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState<ServiceMetrics>({
    activeServices: 0,
    completedToday: 0,
    completedThisWeek: 0,
    inProgressServices: 0,
    completionRate: 0,
    avgCompletionTime: 0,
    popularServices: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadServiceData();
  }, []);

  const loadServiceData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      // Get all devices (services) data
      let devicesQuery = supabase
        .from('devices')
        .select('id, status, problem_description, created_at, updated_at, estimated_completion_date');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        devicesQuery = devicesQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: devices, error } = await devicesQuery;

      if (error) throw error;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      // Calculate metrics
      const allDevices = devices || [];
      
      // Active services (not completed or failed)
      const activeServices = allDevices.filter((d: any) => 
        !['done', 'failed', 'repair-complete'].includes(d.status)
      ).length;

      // Completed today
      const completedToday = allDevices.filter((d: any) => 
        ['done', 'repair-complete'].includes(d.status) &&
        new Date(d.updated_at) >= today
      ).length;

      // Completed this week
      const completedThisWeek = allDevices.filter((d: any) => 
        ['done', 'repair-complete'].includes(d.status) &&
        new Date(d.updated_at) >= weekStart
      ).length;

      // In-progress services
      const inProgressServices = allDevices.filter((d: any) => 
        ['diagnosis-started', 'in-repair', 'reassembled-testing'].includes(d.status)
      ).length;

      // Calculate completion rate (completed vs total services this month)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthDevices = allDevices.filter((d: any) => 
        new Date(d.created_at) >= monthStart
      );
      const thisMonthCompleted = thisMonthDevices.filter((d: any) => 
        ['done', 'repair-complete'].includes(d.status)
      ).length;
      const completionRate = thisMonthDevices.length > 0 
        ? Math.round((thisMonthCompleted / thisMonthDevices.length) * 100)
        : 0;

      // Calculate average completion time (in hours)
      const completedDevices = allDevices.filter((d: any) => 
        ['done', 'repair-complete'].includes(d.status) &&
        d.created_at && d.updated_at
      );
      
      let avgCompletionTime = 0;
      if (completedDevices.length > 0) {
        const totalTime = completedDevices.reduce((sum: number, d: any) => {
          const start = new Date(d.created_at).getTime();
          const end = new Date(d.updated_at).getTime();
          return sum + (end - start);
        }, 0);
        avgCompletionTime = Math.round((totalTime / completedDevices.length) / (1000 * 60 * 60)); // Convert to hours
      }

      // Get popular service types (based on problem descriptions)
      const serviceTypes: { [key: string]: number } = {};
      allDevices.forEach((d: any) => {
        if (d.problem_description) {
          const desc = d.problem_description.toLowerCase();
          // Categorize common repair types
          if (desc.includes('screen') || desc.includes('display')) {
            serviceTypes['Screen Repair'] = (serviceTypes['Screen Repair'] || 0) + 1;
          } else if (desc.includes('battery')) {
            serviceTypes['Battery Replacement'] = (serviceTypes['Battery Replacement'] || 0) + 1;
          } else if (desc.includes('water') || desc.includes('liquid')) {
            serviceTypes['Water Damage'] = (serviceTypes['Water Damage'] || 0) + 1;
          } else if (desc.includes('charge') || desc.includes('charging')) {
            serviceTypes['Charging Issue'] = (serviceTypes['Charging Issue'] || 0) + 1;
          } else if (desc.includes('software') || desc.includes('update')) {
            serviceTypes['Software Issue'] = (serviceTypes['Software Issue'] || 0) + 1;
          } else {
            serviceTypes['General Repair'] = (serviceTypes['General Repair'] || 0) + 1;
          }
        }
      });

      // Convert to array and sort by count
      const popularServices = Object.entries(serviceTypes)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setMetrics({
        activeServices,
        completedToday,
        completedThisWeek,
        inProgressServices,
        completionRate,
        avgCompletionTime,
        popularServices
      });
    } catch (error) {
      console.error('Error loading service data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return 'text-emerald-600';
    if (rate >= 60) return 'text-blue-600';
    if (rate >= 40) return 'text-orange-600';
    return 'text-rose-600';
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Service Tracking</h3>
            <p className="text-xs text-gray-400 mt-0.5">Repair & maintenance overview</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/devices')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Devices"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-blue-500" />
            <span className="text-xs text-gray-500">Active Services</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-semibold text-gray-900">
              {metrics.activeServices}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-emerald-500" />
            <span className="text-xs text-gray-500">Completed Today</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-semibold text-gray-900">
              {metrics.completedToday}
            </span>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">In Progress</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-semibold text-gray-900">
              {metrics.inProgressServices}
            </p>
            <AlertCircle size={14} className="text-orange-500" />
          </div>
        </div>
        
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Completion Rate</p>
          <div className="flex items-center gap-2">
            <p className={`text-xl font-semibold ${getCompletionRateColor(metrics.completionRate)}`}>
              {metrics.completionRate}%
            </p>
            {metrics.completionRate >= 70 && <TrendingUp size={14} className="text-emerald-500" />}
          </div>
        </div>
      </div>

      {/* Average Completion Time */}
      {metrics.avgCompletionTime > 0 && (
        <div className="mb-6 p-3 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Avg. Completion Time</span>
            <span className="text-sm font-semibold text-gray-900">
              {metrics.avgCompletionTime}h
            </span>
          </div>
        </div>
      )}

      {/* Popular Services */}
      {metrics.popularServices.length > 0 && (
        <div className="mb-6 flex-grow max-h-64 overflow-y-auto">
          <h4 className="text-xs text-gray-400 mb-3">Popular Service Types</h4>
          <div className="space-y-2">
            {metrics.popularServices.slice(0, 4).map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>
                  <span className="text-sm text-gray-900 truncate">{service.name}</span>
                </div>
                <span className="text-xs font-semibold text-gray-600 ml-2">{service.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Summary */}
      <div className="mb-6 p-3 rounded-lg bg-blue-50 border border-blue-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Completed This Week</span>
          <span className="text-lg font-bold text-blue-600">
            {metrics.completedThisWeek}
          </span>
        </div>
      </div>

      {/* Actions - Always at bottom */}
      <div className="flex gap-2 mt-auto pt-6">
        <button
          onClick={() => navigate('/devices/new')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          <span>Add Service</span>
        </button>
      </div>

    </div>
  );
};

