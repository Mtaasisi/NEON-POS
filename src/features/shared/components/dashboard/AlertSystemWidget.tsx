import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Bell, CheckCircle, XCircle, Clock, Settings, Volume2, VolumeX } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useRealtimeDashboard } from '../../../../hooks/useRealtimeDashboard';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  autoExpire?: boolean;
  expireTime?: number; // minutes
  category: 'inventory' | 'sales' | 'customers' | 'operations' | 'system';
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface AlertSystemWidgetProps {
  className?: string;
}

export const AlertSystemWidget: React.FC<AlertSystemWidgetProps> = ({ className }) => {
  const { metrics, updates } = useRealtimeDashboard();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoDismissEnabled, setAutoDismissEnabled] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  // Generate alerts based on real-time data
  const generateAlerts = useMemo(() => {
    const newAlerts: Alert[] = [];

    // Critical inventory alerts
    if (metrics.inventory.criticalStock > 0) {
      newAlerts.push({
        id: 'critical-stock',
        type: 'critical',
        title: 'Critical Stock Alert',
        message: `${metrics.inventory.criticalStock} items are critically low or out of stock. Immediate action required.`,
        timestamp: new Date(),
        acknowledged: false,
        category: 'inventory',
        priority: 'high',
        actionable: true,
        actionLabel: 'Restock Now',
        onAction: () => console.log('Navigate to inventory management')
      });
    }

    // Low stock warnings
    if (metrics.inventory.lowStock > 5) {
      newAlerts.push({
        id: 'low-stock-warning',
        type: 'warning',
        title: 'Low Stock Warning',
        message: `${metrics.inventory.lowStock} items are running low. Consider restocking soon.`,
        timestamp: new Date(),
        acknowledged: false,
        autoExpire: true,
        expireTime: 60, // 1 hour
        category: 'inventory',
        priority: 'medium',
        actionable: true,
        actionLabel: 'View Inventory'
      });
    }

    // Sales performance alerts
    if (metrics.sales.today < 50000) { // Low sales threshold
      const currentHour = new Date().getHours();
      if (currentHour >= 14) { // After 2 PM
        newAlerts.push({
          id: 'low-sales-performance',
          type: 'warning',
          title: 'Low Sales Performance',
          message: `Daily sales target not met. Only TZS ${metrics.sales.today.toLocaleString()} achieved today.`,
          timestamp: new Date(),
          acknowledged: false,
          category: 'sales',
          priority: 'medium',
          actionable: true,
          actionLabel: 'View Promotions'
        });
      }
    }

    // Overdue devices
    if (metrics.devices.overdue > 0) {
      newAlerts.push({
        id: 'overdue-devices',
        type: 'critical',
        title: 'Overdue Devices',
        message: `${metrics.devices.overdue} devices are past their expected completion date.`,
        timestamp: new Date(),
        acknowledged: false,
        category: 'operations',
        priority: 'high',
        actionable: true,
        actionLabel: 'View Overdue'
      });
    }

    // High completion rate success
    if (metrics.devices.completed > 10) {
      newAlerts.push({
        id: 'high-completion-rate',
        type: 'success',
        title: 'Excellent Performance!',
        message: `${metrics.devices.completed} devices completed today. Great job!`,
        timestamp: new Date(),
        acknowledged: false,
        autoExpire: true,
        expireTime: 30, // 30 minutes
        category: 'operations',
        priority: 'low',
        actionable: false
      });
    }

    // Customer acquisition milestone
    if (metrics.customers.newToday >= 5) {
      newAlerts.push({
        id: 'customer-milestone',
        type: 'success',
        title: 'Customer Acquisition Milestone',
        message: `Acquired ${metrics.customers.newToday} new customers today!`,
        timestamp: new Date(),
        acknowledged: false,
        autoExpire: true,
        expireTime: 15, // 15 minutes
        category: 'customers',
        priority: 'low',
        actionable: false
      });
    }

    // Attendance issues
    if (metrics.employees.present < metrics.employees.total * 0.8) {
      newAlerts.push({
        id: 'low-attendance',
        type: 'warning',
        title: 'Low Employee Attendance',
        message: `Only ${metrics.employees.present} out of ${metrics.employees.total} employees present today.`,
        timestamp: new Date(),
        acknowledged: false,
        category: 'operations',
        priority: 'medium',
        actionable: true,
        actionLabel: 'View Attendance'
      });
    }

    // System alerts (simulated)
    const systemAlerts: Alert[] = [
      {
        id: 'backup-due',
        type: 'info' as const,
        title: 'Backup Due',
        message: 'Daily backup is due. Consider running a backup now.',
        timestamp: new Date(),
        acknowledged: false,
        category: 'system' as const,
        priority: 'low' as const,
        actionable: false,
        autoExpire: true,
        expireTime: 120 // 2 hours
      },
      {
        id: 'software-update',
        type: 'info' as const,
        title: 'Software Update Available',
        message: 'A new version of the POS system is available.',
        timestamp: new Date(),
        acknowledged: false,
        category: 'system' as const,
        priority: 'low' as const,
        actionable: true,
        actionLabel: 'Update Now'
      }
    ];

    // Add system alerts randomly (for demo)
    if (Math.random() > 0.7) {
      newAlerts.push(...systemAlerts);
    }

    return newAlerts;
  }, [metrics]);

  // Update alerts when metrics change
  useEffect(() => {
    setAlerts(prevAlerts => {
      const newAlerts = [...generateAlerts];

      // Remove expired alerts
      const now = new Date();
      const validAlerts = prevAlerts.filter(alert => {
        if (alert.autoExpire && alert.expireTime) {
          const expireDate = new Date(alert.timestamp.getTime() + alert.expireTime * 60000);
          return now < expireDate;
        }
        return true;
      });

      // Merge with new alerts, avoiding duplicates
      const mergedAlerts = [...validAlerts];
      newAlerts.forEach(newAlert => {
        const existingIndex = mergedAlerts.findIndex(a => a.id === newAlert.id);
        if (existingIndex === -1) {
          mergedAlerts.unshift(newAlert); // Add new alerts at the top
        } else {
          // Update existing alert
          mergedAlerts[existingIndex] = { ...newAlert, acknowledged: mergedAlerts[existingIndex].acknowledged };
        }
      });

      return mergedAlerts.slice(0, 20); // Keep only 20 most recent alerts
    });
  }, [generateAlerts]);

  // Play sound for critical alerts
  useEffect(() => {
    const criticalAlerts = alerts.filter(a => a.type === 'critical' && !a.acknowledged);
    if (criticalAlerts.length > 0 && soundEnabled) {
      // In a real app, you'd play an alert sound
      console.log('🚨 Critical alert sound would play here');
    }
  }, [alerts, soundEnabled]);

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
  };

  const executeAlertAction = (alert: Alert) => {
    if (alert.onAction) {
      alert.onAction();
    }
    acknowledgeAlert(alert.id);
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.type === filter;
  });

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Bell className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'info':
        return 'border-l-blue-500 bg-blue-50';
      case 'success':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority: Alert['priority']) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const formatTimeAgo = (timestamp: Date | undefined | null) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return timestamp.toLocaleDateString();
  };

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg relative">
            <Bell className="w-6 h-6 text-red-600" />
            {unacknowledgedCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unacknowledgedCount > 9 ? '9+' : unacknowledgedCount}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Alert System</h3>
            <p className="text-sm text-gray-600">Real-time notifications & alerts</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}
            title={soundEnabled ? 'Disable sound alerts' : 'Enable sound alerts'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="all">All Alerts</option>
            <option value="critical">Critical</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
            <p className="text-gray-500">All clear! No active alerts.</p>
            <p className="text-sm text-gray-400">Alerts will appear here as issues arise.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${getAlertColor(alert.type)} ${
                !alert.acknowledged ? 'ring-1 ring-opacity-50' : ''
              } ${alert.type === 'critical' ? 'ring-red-200' : ''} transition-all`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`font-medium ${!alert.acknowledged ? 'font-bold' : ''}`}>
                        {alert.title}
                      </h4>
                      {getPriorityBadge(alert.priority)}
                      {!alert.acknowledged && (
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(alert.timestamp)}</span>
                      </span>
                      <span className="capitalize">{alert.category}</span>
                      {alert.autoExpire && alert.expireTime && (
                        <span className="text-orange-600">
                          Expires in {alert.expireTime}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-4">
                  {alert.actionable && alert.actionLabel && (
                    <button
                      onClick={() => executeAlertAction(alert)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      {alert.actionLabel}
                    </button>
                  )}

                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Acknowledge"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Dismiss"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {alerts.length > 10 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all {alerts.length} alerts
          </button>
        </div>
      )}
    </GlassCard>
  );
};

