import React, { useState, useEffect, useRef } from 'react';
import { GripVertical, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { loadUserSettings, saveUserSettings } from '../../../lib/userSettingsApi';
import toast from 'react-hot-toast';
import { getRoleWidgetPermissions } from '../../../config/roleBasedWidgets';

interface WidgetOrderSettingsProps {
  className?: string;
}

const WIDGET_LABELS: Record<string, string> = {
  revenueTrendChart: 'Revenue Trend',
  salesChart: 'Sales Overview',
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

const DEFAULT_ORDER = [
  'revenueTrendChart', 'salesChart', 'deviceStatusChart', 'appointmentsTrendChart',
  'purchaseOrderChart', 'paymentMethodsChart', 'analyticsWidget', 'salesByCategoryChart', 'profitMarginChart',
  'performanceMetricsChart', 'customerActivityChart',
  'appointmentWidget', 'employeeWidget', 'notificationWidget',
  'financialWidget', 'salesFunnelChart',
  'customerInsightsWidget', 'systemHealthWidget', 'inventoryWidget', 'activityFeedWidget',
  'purchaseOrderWidget', 'chatWidget', 'salesWidget', 'topProductsWidget', 'expensesWidget', 'staffPerformanceWidget'
];

export const WidgetOrderSettings: React.FC<WidgetOrderSettingsProps> = ({ className = '' }) => {
  const { currentUser } = useAuth();
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
        
        // Get role permissions to filter allowed widgets
        const rolePerms = getRoleWidgetPermissions(currentUser.role);
        const allowedWidgets = DEFAULT_ORDER.filter(widget => rolePerms[widget as keyof typeof rolePerms]);
        
        // Try to load saved order
        const savedOrder = localStorage.getItem('dashboard_widget_order');
        
        if (savedOrder) {
          try {
            const parsedOrder = JSON.parse(savedOrder);
            // Filter to only allowed widgets for this role
            const filteredOrder = parsedOrder.filter((widget: string) => 
              allowedWidgets.includes(widget)
            );
            setWidgetOrder(filteredOrder);
            committedOrderRef.current = filteredOrder;
            console.log('📂 Loaded saved widget order:', filteredOrder);
          } catch (e) {
            console.error('Error parsing saved order:', e);
            setWidgetOrder(allowedWidgets);
            committedOrderRef.current = allowedWidgets;
          }
        } else {
          // Use default order filtered by role permissions
          setWidgetOrder(allowedWidgets);
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

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
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
    
    // Get current order from ref (most reliable source)
    const currentOrder = committedOrderRef.current.length > 0 
      ? [...committedOrderRef.current]
      : [...widgetOrder];
    
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
    
    // Update state to trigger re-render
    setWidgetOrder([...currentOrder]);
    
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
          Drag and drop widgets to reorder them on your dashboard. Changes will take effect after saving.
        </p>
      </div>

      {/* Widget List */}
      <div className="space-y-2 mb-6">
        {widgetOrder.map((widgetKey, index) => {
          const isDragging = draggedWidget === widgetKey;
          const isDragOver = dragOverWidget === widgetKey;
          
          return (
            <div
              key={widgetKey}
              draggable
              onDragStart={(e) => handleDragStart(e, widgetKey)}
              onDragOver={(e) => handleDragOver(e, widgetKey)}
              onDrop={(e) => handleDrop(e, widgetKey)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-move
                ${isDragging ? 'opacity-50 border-indigo-400 bg-indigo-50' : ''}
                ${isDragOver ? 'border-indigo-600 bg-indigo-50 scale-105' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                ${!isDragging && !isDragOver ? 'hover:shadow-md' : ''}
              `}
            >
              <div className="flex-shrink-0">
                <GripVertical className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="flex-grow">
                <div className="font-medium text-gray-900">
                  {WIDGET_LABELS[widgetKey] || widgetKey}
                </div>
                <div className="text-xs text-gray-500">
                  Position {index + 1}
                </div>
              </div>
              
              {isDragging && (
                <div className="flex-shrink-0">
                  <span className="text-xs font-medium text-indigo-600">Dragging...</span>
                </div>
              )}
              
              {isDragOver && !isDragging && (
                <div className="flex-shrink-0">
                  <span className="text-xs font-medium text-indigo-600">Drop here</span>
                </div>
              )}
            </div>
          );
        })}
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
          <strong>Tip:</strong> Only widgets you have enabled will appear in this list. 
          To show or hide widgets, use the widgets toggle section above.
        </p>
      </div>
    </div>
  );
};

