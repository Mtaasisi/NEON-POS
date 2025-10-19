import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, TrendingUp, Clock, Star, ExternalLink, Award, Target } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import GlassButton from '../ui/GlassButton';

interface ServiceWidgetProps {
  className?: string;
}

interface ServiceMetrics {
  activeServices: number;
  completionRate: number;
  averageDuration: number;
  popularServices: Array<{
    name: string;
    count: number;
    revenue: number;
    rating: number;
  }>;
  todayCompleted: number;
  inProgress: number;
  avgRating: number;
}

export const ServiceWidget: React.FC<ServiceWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<ServiceMetrics>({
    activeServices: 0,
    completionRate: 0,
    averageDuration: 0,
    popularServices: [],
    todayCompleted: 0,
    inProgress: 0,
    avgRating: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadServiceMetrics();
  }, []);

  const loadServiceMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Import supabase client and branch helper
      const { supabase } = await import('../../../../lib/supabaseClient');
      const { getCurrentBranchId } = await import('../../../../lib/branchAwareApi');
      
      const currentBranchId = getCurrentBranchId();
      
      // Fetch devices data for service metrics in current branch
      let query = supabase
        .from('devices')
        .select('id, status, problem_description, created_at, updated_at, actual_cost');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data: devicesData, error: devicesError } = await query;

      if (devicesError) {
        console.error('❌ Devices query Supabase error:', JSON.stringify(devicesError, null, 2));
        throw devicesError;
      }

      const devices = devicesData || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate metrics
      const activeServices = devices.filter((d: any) => 
        !['done', 'failed', 'repair-complete'].includes(d.status)
      ).length;

      const completedDevices = devices.filter((d: any) => 
        ['done', 'repair-complete'].includes(d.status)
      ).length;

      const completionRate = devices.length > 0 
        ? Math.round((completedDevices / devices.length) * 100)
        : 0;

      const todayCompleted = devices.filter((d: any) => 
        ['done', 'repair-complete'].includes(d.status) &&
        new Date(d.updated_at) >= today
      ).length;

      const inProgress = devices.filter((d: any) => 
        ['diagnosis-started', 'in-repair', 'reassembled-testing'].includes(d.status)
      ).length;

      // Default rating since we don't have a rating column
      const avgRating = 4.5;

      // Group by problem description (simplified service type)
      const serviceGroups = devices.reduce((acc: any, device: any) => {
        const service = device.problem_description || 'General Repair';
        if (!acc[service]) {
          acc[service] = { count: 0, revenue: 0, ratings: [] };
        }
        acc[service].count += 1;
        acc[service].revenue += device.actual_cost || 0;
        acc[service].ratings.push(4.5); // Default rating
        return acc;
      }, {});

      const popularServices = Object.entries(serviceGroups)
        .map(([name, data]: any) => ({
          name,
          count: data.count,
          revenue: data.revenue,
          rating: data.ratings.length > 0 
            ? data.ratings.reduce((a: number, b: number) => a + b, 0) / data.ratings.length
            : 4.5
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setMetrics({
        activeServices,
        completionRate,
        averageDuration: 75, // TODO: Calculate from actual completion times
        popularServices,
        todayCompleted,
        inProgress,
        avgRating
      });
    } catch (error: any) {
      console.error('❌ Error loading service metrics - Full error:', error);
      console.error('❌ Nested error details:', error?.error || error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `TSh ${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `TSh ${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `TSh ${(amount / 1000).toFixed(1)}K`;
    }
    return `TSh ${amount.toLocaleString()}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={10}
            className={`${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs font-medium text-gray-700 ml-1">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 ${className}`}>
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
    <div className={`bg-white rounded-2xl p-7 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Service Performance</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {metrics.activeServices} services • {metrics.completionRate}% completion
            </p>
          </div>
        </div>
      </div>

      {/* Service Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Completed</p>
          <p className="text-2xl font-semibold text-gray-900">{metrics.todayCompleted}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">In Progress</p>
          <p className="text-2xl font-semibold text-gray-900">{metrics.inProgress}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Avg Time</p>
          <p className="text-2xl font-semibold text-gray-900">{formatDuration(metrics.averageDuration)}</p>
        </div>
      </div>

      {/* Average Rating */}
      <div className="p-4 bg-gray-50 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Service Quality</p>
            {renderStarRating(metrics.avgRating)}
          </div>
          <div className="flex items-center gap-1 text-emerald-600">
            <TrendingUp size={14} />
            <span className="text-sm font-medium">{metrics.completionRate}%</span>
          </div>
        </div>
      </div>

      {/* Popular Services */}
      <div className="space-y-3 mb-6">
        <h4 className="text-xs text-gray-400 mb-3">Popular Services</h4>
        {metrics.popularServices.slice(0, 3).map((service, index) => (
          <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {service.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStarRating(service.rating)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {service.count} jobs
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(service.revenue)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => navigate('/services')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          <ExternalLink size={14} />
          <span>Services</span>
        </button>
        <button
          onClick={() => navigate('/services/reports')}
          className="px-5 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Target size={14} />
          <span>Reports</span>
        </button>
      </div>
    </div>
  );
};
