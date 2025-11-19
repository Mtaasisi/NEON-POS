import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Users, Smartphone, CreditCard, Calendar, Package, 
  Clock, CheckCircle, AlertTriangle, DollarSign, ExternalLink 
} from 'lucide-react';
import { dashboardService, RecentActivity } from '../../../../services/dashboardService';

interface ActivityFeedWidgetProps {
  className?: string;
}

export const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    
    // Set up periodic refresh
    const interval = setInterval(loadActivities, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      if (isLoading) setIsLoading(true);
      const recentActivities = await dashboardService.getRecentActivities(8);
      setActivities(recentActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'device': return <Smartphone size={16} className="text-blue-600" />;
      case 'customer': return <Users size={16} className="text-green-600" />;
      case 'payment': return <CreditCard size={16} className="text-emerald-600" />;
      case 'appointment': return <Calendar size={16} className="text-purple-600" />;
      case 'inventory': return <Package size={16} className="text-orange-600" />;
      case 'employee': return <Users size={16} className="text-indigo-600" />;
      default: return <Activity size={16} className="text-gray-600" />;
    }
  };

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'device': return 'bg-blue-100';
      case 'customer': return 'bg-green-100';
      case 'payment': return 'bg-emerald-100';
      case 'appointment': return 'bg-purple-100';
      case 'inventory': return 'bg-orange-100';
      case 'employee': return 'bg-indigo-100';
      default: return 'bg-gray-100';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={12} className="text-green-600" />;
      case 'pending': return <Clock size={12} className="text-orange-600" />;
      case 'failed': return <AlertTriangle size={12} className="text-red-600" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-400';
      case 'high': return 'border-l-orange-400';
      case 'normal': return 'border-l-blue-400';
      default: return 'border-l-gray-300';
    }
  };

  const getTimeAgo = (timeString: string) => {
    const now = new Date();
    const time = new Date(timeString);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading && activities.length === 0) {
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
    <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-xs text-gray-400 mt-0.5">Live system activities</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-emerald-600 font-medium">Live</span>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
            title="View All Reports"
          >
            <ExternalLink size={14} />
            <span>View All</span>
          </button>
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-3 h-64 overflow-y-auto mb-6 flex-grow">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {activity.type === 'device' ? <Smartphone size={14} className="text-gray-700" /> :
                   activity.type === 'customer' ? <Users size={14} className="text-gray-700" /> :
                   activity.type === 'payment' ? <CreditCard size={14} className="text-gray-700" /> :
                   activity.type === 'appointment' ? <Calendar size={14} className="text-gray-700" /> :
                   activity.type === 'inventory' ? <Package size={14} className="text-gray-700" /> :
                   <Activity size={14} className="text-gray-700" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {activity.title}
                    </p>
                    {activity.status === 'completed' && <CheckCircle size={12} className="text-emerald-600" />}
                    {activity.status === 'pending' && <Clock size={12} className="text-amber-600" />}
                    {activity.status === 'failed' && <AlertTriangle size={12} className="text-rose-600" />}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {activity.description}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {getTimeAgo(activity.time)}
                    </span>
                    {activity.amount && (
                      <span className="text-xs font-medium text-gray-900">
                        {formatCurrency(activity.amount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Activity className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No recent activities</p>
          </div>
        )}
      </div>

    </div>
  );
};
