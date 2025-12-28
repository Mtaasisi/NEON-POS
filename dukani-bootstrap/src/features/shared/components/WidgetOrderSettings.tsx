import React, { useState, useEffect, useRef } from 'react';
import { GripVertical, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { loadUserSettings, saveUserSettings } from '../../../lib/userSettingsApi';
import toast from 'react-hot-toast';
import { getRoleWidgetPermissions } from '../../../config/roleBasedWidgets';
import { useSmartGridLayout } from '../../../hooks/useSmartGridLayout';
import { useDashboardSettings } from '../../../hooks/useDashboardSettings';

interface WidgetOrderSettingsProps {
  className?: string;
}

const WIDGET_LABELS: Record<string, string> = {
  revenueTrendChart: 'Revenue Trend',
  deviceStatusChart: 'Device Status',
  appointmentsTrendChart: 'Appointments Trend',
  purchaseOrderChart: 'Purchase Orders',
  paymentMethodsChart: 'Payment Methods',
  analyticsWidget: 'Analytics',
  salesByCategoryChart: 'Sales by Category',
  profitMarginChart: 'Profit Margin',
  performanceMetricsChart: 'Performance Metrics',
  customerActivityChart: 'Customer Activity',
  appointmentWidget: 'Appointments',
  employeeWidget: 'Employees',
  notificationWidget: 'Notifications',
  financialWidget: 'Financial',
  salesFunnelChart: 'Sales Funnel',
  customerInsightsWidget: 'Customer Insights',
  systemHealthWidget: 'System Health',
  inventoryWidget: 'Inventory',
  activityFeedWidget: 'Activity Feed',
  purchaseOrderWidget: 'Purchase Order',
  chatWidget: 'Chat',
  salesWidget: 'Sales',
  topProductsWidget: 'Top Products',
  expensesWidget: 'Expenses',
  staffPerformanceWidget: 'Staff Performance',
  stockLevelChart: 'Stock Level',
  serviceWidget: 'Service',
  reminderWidget: 'Reminders'
};

// Exact order from user's dashboard
const DEFAULT_ORDER = [
  'purchaseOrderChart',      // 1. Purchase Orders This Week
  'revenueTrendChart',       // 2. Revenue This Week
  'deviceStatusChart',       // 4. Repair Status
  'appointmentWidget',       // 5. Appointments
  'paymentMethodsChart',     // 6. Payment Methods
  'analyticsWidget',         // 7. Business Analytics
  'salesByCategoryChart',    // 8. Sales by Category
  'profitMarginChart',       // 9. Profit & Margin
  'performanceMetricsChart', // 10. Performance Metrics
  'customerActivityChart',   // 11. Customer Activity
  'appointmentWidget',       // 12. Today's Schedule (duplicate in dashboard)
  'employeeWidget',          // 13. Staff Today
  'notificationWidget',      // 14. Notifications
  'financialWidget',         // 15. Financial Overview
  'salesFunnelChart',        // 16. Sales Funnel
  'customerInsightsWidget',  // 17. Customer Insights
  'inventoryWidget',         // 18. Inventory Status
  'activityFeedWidget',      // 19. Recent Activity
  'purchaseOrderWidget',     // 20. Purchase Orders
  'chatWidget',              // 21. Messages
  'salesWidget',             // 22. Today's Sales
  'topProductsWidget',       // 23. Top Products
  'expensesWidget',          // 24. Expenses
  'staffPerformanceWidget'   // 25. Staff Performance
];

export const WidgetOrderSettings: React.FC<WidgetOrderSettingsProps> = ({ className = '' }) => {
  const { currentUser } = useAuth();
  const { autoArrangeWidgets } = useSmartGridLayout();
  const { getWidgetColumnSpan } = useDashboardSettings();
  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Use ref to ensure order persists through re-renders
  const committedOrderRef = useRef<string[]>([]);

  // Load saved widget order
  useEffect(() => {
    const loadWidgetOrder = async () => {
      if (!currentUser?.id) return;

      try {
        setLoading(true);

        // Get role permissions to determine which widgets are allowed
        const rolePerms = getRoleWidgetPermissions(currentUser.role);
        const allowedWidgets = DEFAULT_ORDER.filter(widget => rolePerms[widget as keyof typeof rolePerms]);

        // Try to load saved order
        const savedOrder = localStorage.getItem('dashboard_widget_order');

        if (savedOrder) {
          try {
            const parsedOrder = JSON.parse(savedOrder);
            // Filter to only allowed widgets for this role and combine with disabled ones
            const filteredOrder = parsedOrder.filter((widget: string) =>
              allowedWidgets.includes(widget)
            );
            // Keep full order including disabled widgets for layout purposes
            const fullOrder = DEFAULT_ORDER.map(widget =>
              filteredOrder.includes(widget) ? widget : widget
            );
            setWidgetOrder(fullOrder);
            committedOrderRef.current = filteredOrder; // Only store enabled ones for actual ordering
            console.log('📂 Loaded saved widget order:', filteredOrder);
          } catch (e) {
            console.error('Error parsing saved order:', e);
            setWidgetOrder(DEFAULT_ORDER);
            committedOrderRef.current = allowedWidgets;
          }
        } else {
          // Use default order (shows all positions)
          setWidgetOrder(DEFAULT_ORDER);
          committedOrderRef.current = allowedWidgets;
        }
      } catch (error) {
        console.error('Error loading widget order:', error);
        toast.error('Failed to load widget order');
      } finally {
        setLoading(false);
      }
    };

    loadWidgetOrder();
  }, [currentUser?.id, currentUser?.role]);

  // Check if widget is enabled for this user
  const isWidgetEnabledForUser = (widgetId: string) => {
    const rolePerms = getRoleWidgetPermissions(currentUser?.role || 'user');
    return rolePerms[widgetId as keyof typeof rolePerms];
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    // Only allow dragging of enabled widgets
    if (!isWidgetEnabledForUser(widgetId)) {
      e.preventDefault();
      return;
    }
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widgetId);
  };

  const handleDragOver = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (targetWidgetId && draggedWidget && targetWidgetId !== draggedWidget) {
      setDragOverWidget(targetWidgetId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedWidgetId = e.dataTransfer.getData('text/plain');

    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) {
      setDraggedWidget(null);
      setDragOverWidget(null);
      return;
    }

    // Only allow dropping on enabled widgets
    if (!isWidgetEnabledForUser(targetWidgetId)) {
      setDraggedWidget(null);
      setDragOverWidget(null);
      return;
    }

    // Get current order from ref (most reliable source)
    const currentOrder = [...committedOrderRef.current];

    const draggedIndex = currentOrder.indexOf(draggedWidgetId);
    const targetIndex = currentOrder.indexOf(targetWidgetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedWidget(null);
      setDragOverWidget(null);
      return;
    }

    // Perform the reorder
    currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedWidgetId);

    // Commit to ref IMMEDIATELY
    committedOrderRef.current = currentOrder;

    // Clear drag states
    setDraggedWidget(null);
    setDragOverWidget(null);

    // Update state to trigger re-render (rebuild full layout)
    const rolePerms = getRoleWidgetPermissions(currentUser?.role || 'user');
    const allowedWidgets = DEFAULT_ORDER.filter(widget => rolePerms[widget as keyof typeof rolePerms]);
    const fullOrder = DEFAULT_ORDER.map(widget =>
      currentOrder.includes(widget) ? widget : widget
    );
    setWidgetOrder(fullOrder);

    toast.success('Widget order updated! Click Save to apply.', { duration: 2000 });
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  // Save widget order
  const handleSave = async () => {
    if (!currentUser?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setSaving(true);

      const orderToSave = committedOrderRef.current.length > 0
        ? committedOrderRef.current
        : widgetOrder;

      console.log('💾 Saving widget order:', orderToSave);

      // Save to localStorage
      localStorage.setItem('dashboard_widget_order', JSON.stringify(orderToSave));

      // Dispatch custom event to notify dashboard of change
      window.dispatchEvent(new CustomEvent('widgetOrderUpdated', {
        detail: { order: orderToSave }
      }));

      // Also save to user settings if available
      try {
        const currentSettings = await loadUserSettings(currentUser.id);
        const updatedSettings = {
          ...currentSettings,
          widgetOrder: orderToSave
        };
        await saveUserSettings(currentUser.id, updatedSettings, 'Widget Order');
      } catch (e) {
        console.warn('Could not save to user settings, but saved to localStorage');
      }

      toast.success('Widget order saved! Go back to dashboard to see changes.');
    } catch (error) {
      console.error('Error saving widget order:', error);
      toast.error('Failed to save widget order');
    } finally {
      setSaving(false);
    }
  };

  // Reset to default order
  const handleReset = () => {
    const rolePerms = getRoleWidgetPermissions(currentUser?.role || 'user');
    const allowedWidgets = DEFAULT_ORDER.filter(widget => rolePerms[widget as keyof typeof rolePerms]);

    setWidgetOrder(allowedWidgets);
    committedOrderRef.current = allowedWidgets;

    // Save the reset order
    localStorage.setItem('dashboard_widget_order', JSON.stringify(allowedWidgets));

    // Dispatch event to notify dashboard
    window.dispatchEvent(new CustomEvent('widgetOrderUpdated', {
      detail: { order: allowedWidgets }
    }));

    toast.success('Widget order reset to default. Check your dashboard!');
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Loading widget order...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Widget Order</h3>
        <p className="text-sm text-gray-600">
          This shows your currently enabled widgets arranged exactly like your dashboard. Widgets automatically expand to fill available space (no empty gaps).
          Each numbered position (#1, #2, #3...) matches your dashboard. Drag and drop to reorder - widgets will resize to fill space just like on your dashboard.
        </p>
      </div>

      {/* Widget Grid - Shows EXACT dashboard layout with auto-arranged widgets */}
      <div className="mb-6">
        {/* Show widgets arranged exactly like the dashboard */}
        {(() => {
          // Get enabled widgets in their custom order (same as dashboard)
          const rolePerms = getRoleWidgetPermissions(currentUser?.role || 'user');
          const enabledWidgets = DEFAULT_ORDER.filter(widget => rolePerms[widget as keyof typeof rolePerms]);
          const orderedEnabledWidgets = committedOrderRef.current.length > 0
            ? committedOrderRef.current.filter(widget => enabledWidgets.includes(widget))
            : enabledWidgets;

          // Group into rows like dashboard (but let autoArrangeWidgets handle the layout)
          const rows: string[][] = [];
          for (let i = 0; i < orderedEnabledWidgets.length; i += 3) {
            rows.push(orderedEnabledWidgets.slice(i, i + 3));
          }

          return (
            <div className="space-y-4">
              {rows.map((row, rowIndex) => {
                // Use same auto-arrangement logic as dashboard
                const smartLayout = autoArrangeWidgets(row);

                return (
                  <div
                    key={`dashboard-row-${rowIndex}`}
                    className="dashboard-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full"
                    style={{ alignItems: 'stretch' }}
                  >
                    {smartLayout.widgets.map((widget, widgetIndex) => {
                      const { key, expanded, gridColumn } = widget;
                      const position = rowIndex * 3 + widgetIndex + 1;
                      const isDragging = draggedWidget === key;
                      const isDragOver = dragOverWidget === key;

                      // Extract column span number from gridColumn (e.g., "span 2" -> 2)
                      const colSpan = parseInt(gridColumn.split(' ')[1]);

                      return (
                        <div
                          key={key}
                          draggable
                          onDragStart={(e) => handleDragStart(e, key)}
                          onDragOver={(e) => handleDragOver(e, key)}
                          onDrop={(e) => handleDrop(e, key)}
                          onDragEnd={handleDragEnd}
                          className={`
                            relative p-4 rounded-lg border-2 transition-all cursor-move min-h-[120px]
                            ${isDragging ? 'opacity-50 border-indigo-400 bg-indigo-50' : ''}
                            ${isDragOver ? 'border-indigo-600 bg-indigo-50 scale-105' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                            ${!isDragging && !isDragOver ? 'hover:shadow-md' : ''}
                            ${colSpan === 2 ? 'md:col-span-2' : ''}
                            ${colSpan === 3 ? 'md:col-span-2 lg:col-span-3' : ''}
                          `}
                          style={{ height: '100%' }}
                        >
                          {/* Grip handle */}
                          <div className="absolute top-2 left-2 flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500">
                              #{position}
                            </span>
                            {expanded && (
                              <span className="text-xs font-medium text-green-600 bg-green-100 px-1 rounded">
                                Auto-sized
                              </span>
                            )}
                          </div>

                          {/* Drag indicators */}
                          {isDragging && (
                            <div className="absolute top-2 right-2">
                              <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                                Dragging...
                              </span>
                            </div>
                          )}

                          {isDragOver && !isDragging && (
                            <div className="absolute top-2 right-2">
                              <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                                Drop here
                              </span>
                            </div>
                          )}

                          {/* Widget content */}
                          <div className="pt-8 text-center h-full flex flex-col justify-center">
                            <div className="font-medium text-gray-900 text-sm mb-1">
                              {WIDGET_LABELS[key] || key}
                            </div>
                            <div className="text-xs text-gray-500">
                              Dashboard position #{position}
                            </div>
                            {expanded && (
                              <div className="text-xs text-green-600 mt-1">
                                Expanded to fill space
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* If no widgets at all, show empty state */}
              {orderedEnabledWidgets.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg mb-2">📊 No widgets enabled</div>
                  <div className="text-sm">Enable widgets using the toggle section above</div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Order'}
        </button>

        <button
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Default
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> This grid shows only your enabled widgets in their current dashboard positions.
          Drag any widget to reorder - the layout will match your dashboard exactly.
        </p>
      </div>
    </div>
  );
};
