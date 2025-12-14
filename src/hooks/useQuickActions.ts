import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import {
  Smartphone,
  UserPlus,
  Package,
  BarChart3,
  Zap,
  Settings,
  ShoppingCart,
  RotateCcw,
  PieChart,
  MessageCircle,
  Database,
  Target,
  Compass,
  FileText,
  Cog,
  Stethoscope,
  Upload,
  ArrowRightLeft
} from 'lucide-react';

interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  color: string;
  isEnabled: boolean;
  order: number;
  category: 'navigation' | 'action' | 'report' | 'settings';
  requiresPermission?: string;
}

export const useQuickActions = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Icon mapping
  const iconMap = useMemo(() => ({
    Smartphone,
    UserPlus,
    Package,
    BarChart3,
    Zap,
    Settings,
    ShoppingCart,
    RotateCcw,
    PieChart,
    MessageCircle,
    Database,
    Target,
    Compass,
    FileText,
    Cog,
    Stethoscope,
    Upload,
    ArrowRightLeft
  }), []);

  // Get icon component by name (memoized)
  const getIconComponent = useCallback((iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || Settings;
  }, [iconMap]);

  // Check if user has permission for an action
  const hasPermission = (action: QuickAction) => {
    if (!action.requiresPermission) return true;
    if (!currentUser) return false;
    
    // Check user permissions first (from their profile), then fall back to role
    const userPermissions = currentUser.permissions || [];
    
    // If user has 'all' permission, they can do anything
    if (userPermissions.includes('all')) {
      return true;
    }
    
    // Check if user has the required permission
    if (action.requiresPermission === 'customer') {
      return userPermissions.includes('view_customers') || 
             userPermissions.includes('create_customers') ||
             currentUser.role === 'customer-care';
    }
    if (action.requiresPermission === 'admin') {
      return userPermissions.includes('all') || 
             userPermissions.includes('manage_users') ||
             currentUser.role === 'admin';
    }
    
    // Check for specific permission strings
    if (typeof action.requiresPermission === 'string') {
      if (userPermissions.includes(action.requiresPermission)) {
        return true;
      }
    }
    
    // Fallback to role check
    return currentUser.role === 'admin' || action.requiresPermission === 'all';
  };

  // Default quick actions
  const defaultQuickActions: QuickAction[] = [
    { 
      id: 'new-device', 
      name: 'New Device', 
      description: 'Add new device for repair', 
      icon: 'Smartphone', 
      path: '/devices/new', 
      color: 'bg-blue-500 hover:bg-blue-600', 
      isEnabled: true, 
      order: 1, 
      category: 'action',
      requiresPermission: 'customer'
    },

    { 
      id: 'customer-hub', 
      name: 'Customer Hub', 
      description: 'Manage customer hub', 
      icon: 'UserPlus', 
      path: '/customers', 
      color: 'bg-green-500 hover:bg-green-600', 
      isEnabled: true, 
      order: 4, 
      category: 'navigation' 
    },
    { 
      id: 'import-export-customers', 
      name: 'Customer Import/Export', 
      description: 'Import, update, or export customers', 
      icon: 'Upload', 
      path: '/customers/import', 
      color: 'bg-emerald-500 hover:bg-emerald-600', 
      isEnabled: true, 
      order: 5, 
      category: 'action',
      requiresPermission: 'customer'
    },
    { 
      id: 'stock-transfers', 
      name: 'Stock Transfers', 
      description: 'Transfer inventory between branches', 
      icon: 'ArrowRightLeft', 
      path: '/lats/stock-transfers', 
      color: 'bg-blue-500 hover:bg-blue-600', 
      isEnabled: true, 
      order: 6, 
      category: 'action',
      requiresPermission: 'admin'
    },

    { 
      id: 'sales-report', 
      name: 'Sales Report', 
      description: 'View sales analytics', 
      icon: 'BarChart3', 
      path: '/sales-report', 
      color: 'bg-orange-500 hover:bg-orange-600', 
      isEnabled: true, 
      order: 7, 
      category: 'report' 
    },

    { 
      id: 'settings', 
      name: 'Settings', 
      description: 'System configuration', 
      icon: 'Settings', 
      path: '/settings', 
      color: 'bg-gray-500 hover:bg-gray-600', 
      isEnabled: true, 
      order: 9, 
      category: 'settings' 
    }
  ];

  // Get filtered and sorted quick actions
  const getQuickActions = useMemo(() => {
    return defaultQuickActions
      .filter(action => {
        // Check if action is enabled
        if (!action.isEnabled) return false;
        
        // Check permissions
        if (!hasPermission(action)) return false;
        
        return true;
      })
      .sort((a, b) => a.order - b.order)
      .slice(0, 12) // Default max actions
      .map(action => ({
        ...action,
        iconComponent: getIconComponent(action.icon),
        action: () => navigate(action.path)
      }));
  }, [currentUser?.id, navigate, getIconComponent]); // Only depend on user ID, not entire user object

  // Get actions by category
  const getActionsByCategory = (category: 'navigation' | 'action' | 'report' | 'settings') => {
    return getQuickActions.filter(action => action.category === category);
  };

  // Get layout configuration
  const getLayoutConfig = () => {
    return {
      layout: 'grid' as const,
      showDescriptions: true,
      showIcons: true,
      allowDragDrop: true,
      autoHide: false,
      hideThreshold: 6
    };
  };

  // Check if quick actions should be hidden (for auto-hide feature)
  const shouldHideQuickActions = () => {
    return false; // Always show for now
  };

  // Get grid layout classes based on layout setting
  const getGridClasses = () => {
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
  };

  // Get action button classes based on layout
  const getActionButtonClasses = (action: QuickAction, isCompact = false) => {
    const baseClasses = `${action.color} text-white rounded-lg hover:shadow-lg transition-all duration-200 group`;
    
    if (isCompact) {
      return `${baseClasses} p-2`;
    }
    
    return `${baseClasses} p-4`;
  };

  // Get icon size based on layout
  const getIconSize = () => {
    return 20;
  };

  // Get text size based on layout
  const getTextSize = () => {
    return 'text-sm';
  };

  // Get description visibility
  const shouldShowDescription = (action: QuickAction) => {
    return true; // Always show descriptions for now
  };

  return {
    quickActions: getQuickActions,
    getActionsByCategory,
    getLayoutConfig,
    shouldHideQuickActions,
    getGridClasses,
    getActionButtonClasses,
    getIconSize,
    getTextSize,
    shouldShowDescription,
    isEnabled: true,
    totalActions: defaultQuickActions.length,
    enabledActions: getQuickActions.length
  };
}; 