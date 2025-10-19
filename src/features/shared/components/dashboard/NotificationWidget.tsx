import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertCircle, ExternalLink, Clock } from 'lucide-react';
import { dashboardService, NotificationSummary } from '../../../../services/dashboardService';
import { useAuth } from '../../../../context/AuthContext';

interface NotificationWidgetProps {
  className?: string;
}

export const NotificationWidget: React.FC<NotificationWidgetProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.id) {
      loadNotifications();
    }
  }, [currentUser?.id]);

  const loadNotifications = async () => {
    if (!currentUser?.id) return;
    
    try {
      setIsLoading(true);
      const [recentNotifications, stats] = await Promise.all([
        dashboardService.getRecentNotifications(currentUser.id, 5),
        dashboardService.getDashboardStats(currentUser.id)
      ]);
      
      setNotifications(recentNotifications);
      setUnreadCount(stats.unreadNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'normal': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
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
            <Bell className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Notifications</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread messages` : 'All caught up'}
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <div className="px-3 py-1.5 rounded-full bg-rose-50 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
            <span className="text-xs font-medium text-rose-500">{unreadCount}</span>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3 max-h-64 overflow-y-auto mb-6">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`p-4 rounded-lg transition-colors ${
                !notification.isRead 
                  ? 'bg-blue-50 hover:bg-blue-100' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="font-medium text-gray-900 text-sm truncate flex-1">
                      {notification.title}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      notification.priority === 'urgent' ? 'bg-rose-100 text-rose-600' :
                      notification.priority === 'high' ? 'bg-amber-100 text-amber-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {notification.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock size={12} />
                    <span>{getTimeAgo(notification.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No notifications yet</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => navigate('/notifications')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>
    </div>
  );
};
