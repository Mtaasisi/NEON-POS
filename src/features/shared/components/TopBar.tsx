import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useBranch } from '../../../context/BranchContext';
import { useDevices } from '../../../context/DevicesContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useNavigationHistory } from '../../../hooks/useNavigationHistory';
import { useNotifications } from '../../notifications/hooks/useNotifications';
import { reminderApi } from '../../../lib/reminderApi';
import {
  Bell,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  Smartphone,
  Users,
  Package,
  MessageSquare,
  Stethoscope,
  Plus,
  ChevronDown,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  ShoppingCart,
  FileText,
  Crown,
  CreditCard,
  Scan,
  Trash2,
  TrendingUp,
  Warehouse,
  BarChart3,
  Activity,
  ArrowLeft,
  LayoutDashboard,
  Monitor,
  Laptop,
  Tablet,
  TestTube,
  Receipt,
  Calendar,
  Briefcase,
  MapPin,
  Layers,
  Brain,
  Wrench,
  Star,
  ClipboardList,
  Building,
  DollarSign,
  Home,
  Shield,
  Database,
  Upload,
  Download,
  Clock,
  UserCheck,
  UserPlus,
  MobileIcon,
  Maximize2,
  Minimize2,
  Search,
  Truck,
  ArrowRight,
  ArrowRightLeft,
  CalendarPlus,
} from 'lucide-react';
import ActivityCounter from './ui/ActivityCounter';
import GlassButton from './ui/GlassButton';
import SearchDropdown from './SearchDropdown';
import CacheClearButton from '../../../components/CacheClearButton';
import RefreshButton from '../../../components/RefreshButton';
import SimpleBranchSelector from '../../../components/SimpleBranchSelector';
import QuickExpenseModal from '../../../components/QuickExpenseModal';
import QuickReminderModal from '../../../components/QuickReminderModal';
import { useGlobalSearchModal } from '../../../context/GlobalSearchContext';
import AddProductModal from '../../lats/components/product/AddProductModal';
import EnhancedAddSupplierModal from '../../settings/components/EnhancedAddSupplierModal';
import UnifiedContactImportModal from '../../customers/components/UnifiedContactImportModal';
import AppointmentModal from '../../customers/components/forms/AppointmentModal';
import PaymentsPopupModal from '../../../components/PaymentsPopupModal';
import { createAppointment, type CreateAppointmentData } from '../../../lib/customerApi/appointments';
import { createStockTransfer } from '../../../lib/stockTransferApi';
import { supabase } from '../../../lib/supabaseClient';
import { smsService } from '../../../services/smsService';
import { toast } from 'react-hot-toast';
import Modal from './ui/Modal';
import ImportEmployeesFromUsersModal from '../../employees/components/ImportEmployeesFromUsersModal';
import TransferModal from '../../payments/components/TransferModal';
import BulkSMSModal from '../../reports/components/BulkSMSModal';
import DailyReportModal from './DailyReportModal';
import InstallmentManagementModal from '../../lats/components/pos/InstallmentManagementModal';

interface TopBarProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
  isNavCollapsed: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuToggle, isMenuOpen, isNavCollapsed }) => {
  const { currentUser, logout, isImpersonating, impersonateUser, stopImpersonation, getAvailableTestUsers } = useAuth();
  const { isDark } = useTheme();
  const { openSearch } = useGlobalSearchModal();
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [showQuickReminder, setShowQuickReminder] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showStockTransferModal, setShowStockTransferModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showCustomerImportModal, setShowCustomerImportModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showEmployeeImportModal, setShowEmployeeImportModal] = useState(false);
  const [showAccountTransferModal, setShowAccountTransferModal] = useState(false);
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [showInstallmentManagementModal, setShowInstallmentManagementModal] = useState(false);
  const [availableTestUsers, setAvailableTestUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [paymentModalConfig, setPaymentModalConfig] = useState({
    amount: 0,
    description: 'Manual payment entry',
  });
  const headerRef = useRef<HTMLElement>(null);
  
  // WhatsApp Bulk Campaign Floating Panel State
  const [activeCampaign, setActiveCampaign] = useState<any>(null);
  const [showCampaignPanel, setShowCampaignPanel] = useState(false);
  
  // Safely access devices context with error handling for HMR
  let devices: any[] = [];
  try {
    const devicesContext = useDevices();
    devices = devicesContext.devices || [];
  } catch (error) {
    // Silently handle - context may not be available during HMR
    devices = [];
  }
  
  const { customers } = useCustomers();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use the notifications hook
  const { 
    notifications, 
    unreadNotifications, 
    markAsRead, 
    _markAsActioned, 
    dismissNotification 
  } = useNotifications();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [isOnline, _setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [reminderCount, setReminderCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const { handleBackClick, previousPage } = useNavigationHistory();
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  // Expose dynamic TopBar height as a CSS variable for other fixed elements
  useEffect(() => {
    const updateTopbarVars = () => {
      const headerEl = headerRef.current;
      const height = headerEl?.offsetHeight || 0;
      const computed = headerEl ? window.getComputedStyle(headerEl) : null;
      const marginLeft = computed?.marginLeft || '0px';
      document.documentElement.style.setProperty('--app-topbar-height', `${height}px`);
      document.documentElement.style.setProperty('--app-sidebar-offset', marginLeft);
    };
    updateTopbarVars();
    window.addEventListener('resize', updateTopbarVars);
    return () => window.removeEventListener('resize', updateTopbarVars);
  }, []);
  // Recalculate on UI changes that may alter header height
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const headerEl = headerRef.current;
      const height = headerEl?.offsetHeight || 0;
      const computed = headerEl ? window.getComputedStyle(headerEl) : null;
      const marginLeft = computed?.marginLeft || '0px';
      document.documentElement.style.setProperty('--app-topbar-height', `${height}px`);
      document.documentElement.style.setProperty('--app-sidebar-offset', marginLeft);
    });
    return () => cancelAnimationFrame(id);
  }, [showCreateDropdown, showNotifications, isMenuOpen, isNavCollapsed, reminderCount, isFullscreen, currentUser?.role]);
  
  // Fetch reminder count (pending + overdue)
  useEffect(() => {
    const fetchReminderCount = async () => {
      try {
        const [pending, overdue] = await Promise.all([
          reminderApi.getPendingReminders(),
          reminderApi.getOverdueReminders()
        ]);
        
        // Combine both counts (overdue is already included in pending, so just use overdue count for badge)
        setReminderCount(overdue.length);
      } catch (error) {
        console.error('Error fetching reminder count:', error);
      }
    };
    
    fetchReminderCount();
    
    // Refresh count every 5 minutes
    const interval = setInterval(fetchReminderCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Monitor active WhatsApp bulk campaigns
  useEffect(() => {
    const checkActiveCampaign = () => {
      try {
        const campaignData = localStorage.getItem('whatsapp_bulk_campaign_active');
        if (campaignData) {
          const campaign = JSON.parse(campaignData);
          setActiveCampaign(campaign);
          setShowCampaignPanel(campaign.isMinimized === true);
          console.log('📊 [TopBar] Active campaign detected:', campaign);
        } else {
          setActiveCampaign(null);
          setShowCampaignPanel(false);
        }
      } catch (error) {
        console.error('Error checking active campaign:', error);
      }
    };
    
    // Check immediately
    checkActiveCampaign();
    
    // Poll every 2 seconds for updates
    const interval = setInterval(checkActiveCampaign, 2000);
    
    // Listen for storage events (updates from other tabs/components)
    window.addEventListener('storage', checkActiveCampaign);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkActiveCampaign);
    };
  }, []);
  
  const notificationsRef = useRef<HTMLDivElement>(null);
  const createDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (createDropdownRef.current && !createDropdownRef.current.contains(event.target as Node)) {
        setShowCreateDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load available test users for admin
  const loadTestUsers = async () => {
    if (currentUser?.role !== 'admin') return;

    setLoadingUsers(true);
    try {
      const users = await getAvailableTestUsers();
      setAvailableTestUsers(users);
    } catch (error) {
      console.error('Error loading test users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSelect = async (userId: string) => {
    const success = await impersonateUser(userId);
    if (success) {
      setShowUserSelector(false);
      // No longer need to reload - impersonation state is now persisted
    }
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    setShowUserSelector(false);
    // No longer need to reload - impersonation state is now persisted
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Calculate activity counts
  const getActivityCounts = () => {
    const now = new Date();
    const _oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Active devices (not done or failed)
    const activeDevices = devices.filter(device => {
      return device.status !== 'done' && device.status !== 'failed';
    }).length;

    // New customers (unread)
    const newCustomers = customers.filter(customer => {
      return customer.isRead === false || customer.isRead === undefined;
    }).length;

    // Overdue devices
    const overdueDevices = devices.filter(device => {
      if (device.status === 'done' || device.status === 'failed') return false;
      if (!device.expectedReturnDate) return false;
      const dueDate = new Date(device.expectedReturnDate);
      return dueDate < now;
    }).length;

    return {
      activeDevices,
      newCustomers,
      overdueDevices
    };
  };

  const activityCounts = getActivityCounts();

  // Format numbers with abbreviations (1K, 1.2K, etc.)
  const formatNumber = (num: number): string => {
    if (num < 1000) return num.toString();
    if (num < 10000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    if (num < 1000000) return Math.round(num / 1000) + 'K';
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  };

  const handleAppointmentSave = useCallback(async (data: CreateAppointmentData) => {
    try {
      await createAppointment(data);
      toast.success('Appointment created successfully');
    } catch (error) {
      console.error('Failed to create appointment:', error);
      toast.error('Failed to create appointment');
      throw (error instanceof Error) ? error : new Error('Failed to create appointment');
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          await (elem as any).mozRequestFullScreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const getQuickActions = () => {
    const actions = [];
    const userPermissions = currentUser.permissions || [];
    const hasAll = userPermissions.includes('all');
    
    // Check permissions for each action
    if (hasAll || userPermissions.includes('create_customers') || currentUser.role === 'admin') {
      actions.push(
        { label: 'Add Customer', icon: <Users size={16} />, action: () => navigate('/customers') }
      );
    }
    
    if (hasAll || userPermissions.includes('add_device') || currentUser.role === 'admin' || currentUser.role === 'customer-care') {
      actions.push(
        { label: 'Add Device', icon: <Smartphone size={16} />, action: () => navigate('/devices/new') }
      );
    }
    
    if (hasAll || userPermissions.includes('add_products') || currentUser.role === 'admin') {
      actions.push(
        { label: 'Add Product', icon: <Plus size={16} />, action: () => setShowAddProductModal(true) }
      );
    }
    
    if (hasAll || userPermissions.includes('view_inventory') || currentUser.role === 'admin') {
      actions.push(
        { label: 'Unified Inventory', icon: <Package size={16} />, action: () => navigate('/lats/unified-inventory') }
      );
    }
    
    if (hasAll || currentUser.role === 'admin') {
      actions.push(
        { label: 'SMS Centre', icon: <MessageSquare size={16} />, action: () => navigate('/sms') }
      );
    }
    
    return actions;
  };

  const quickActions = getQuickActions();

  // Get dynamic quick access buttons based on current route
  const getContextualQuickActions = useMemo(() => {
    const path = location.pathname;
    const userPermissions = currentUser?.permissions || [];
    const hasAll = userPermissions.includes('all');
    const role = currentUser?.role;

    interface QuickActionButton {
      label: string;
      icon: React.ReactNode;
      path: string;
      color: string;
      hoverColor: string;
      permission?: string | string[];
    }

    const actions: QuickActionButton[] = [];

    // Inventory-related pages
    if (path.includes('/lats/unified-inventory') || path.includes('/lats/inventory')) {
      if (hasAll || role === 'admin' || userPermissions.includes('manage_inventory')) {
        actions.push(
          {
            label: 'Stock Transfer',
            icon: <ArrowRightLeft size={18} />,
            path: '/lats/stock-transfer',
            color: 'from-sky-500 to-blue-600',
            hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
          },
          {
            label: 'Purchase Orders',
            icon: <Truck size={18} />,
            path: '/lats/purchase-orders',
            color: 'from-orange-500 to-amber-600',
            hoverColor: 'hover:from-orange-600 hover:to-amber-700',
          },
          {
            label: 'Suppliers',
            icon: <Building size={18} />,
            path: '/supplier-management',
            color: 'from-amber-500 to-orange-600',
            hoverColor: 'hover:from-orange-600 hover:to-orange-700',
          },
          {
            label: 'Storage Rooms',
            icon: <Warehouse size={18} />,
            path: '/lats/storage-rooms',
            color: 'from-purple-500 to-purple-600',
            hoverColor: 'hover:from-purple-600 hover:to-purple-700',
          },
          {
            label: 'Categories',
            icon: <Layers size={18} />,
            path: '/category-management',
            color: 'from-green-500 to-emerald-600',
            hoverColor: 'hover:from-green-600 hover:to-emerald-700',
          }
        );
      }
    }

    // POS-related pages
    if (path.includes('/pos')) {
      if (hasAll || role === 'admin' || role === 'customer-care') {
        actions.push(
          {
            label: 'Inventory',
            icon: <Package size={18} />,
            path: '/lats/unified-inventory',
            color: 'from-orange-500 to-amber-600',
            hoverColor: 'hover:from-orange-600 hover:to-amber-700',
          },
          {
            label: 'Customers',
            icon: <Users size={18} />,
            path: '/customers',
            color: 'from-purple-500 to-purple-600',
            hoverColor: 'hover:from-purple-600 hover:to-purple-700',
          },
          {
            label: 'Sales Reports',
            icon: <BarChart3 size={18} />,
            path: '/lats/sales-reports',
            color: 'from-blue-500 to-indigo-600',
            hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
          },
          {
            label: 'Loyalty',
            icon: <Crown size={18} />,
            path: '/lats/loyalty',
            color: 'from-yellow-500 to-amber-600',
            hoverColor: 'hover:from-yellow-600 hover:to-amber-700',
          }
        );
      }
    }

    // Customer-related pages
    if (path.includes('/customers')) {
      if (hasAll || role === 'admin' || role === 'customer-care' || role === 'technician') {
        actions.push(
          {
            label: 'Add Customer',
            icon: <UserPlus size={18} />,
            path: '/customers',
            color: 'from-emerald-500 to-green-600',
            hoverColor: 'hover:from-green-600 hover:to-emerald-700',
          },
          {
            label: 'Appointments',
            icon: <Calendar size={18} />,
            path: '/appointments',
            color: 'from-pink-500 to-rose-600',
            hoverColor: 'hover:from-rose-600 hover:to-rose-700',
          },
          {
            label: 'SMS Centre',
            icon: <MessageSquare size={18} />,
            path: '/sms',
            color: 'from-indigo-500 to-indigo-600',
            hoverColor: 'hover:from-indigo-600 hover:to-indigo-700',
          },
          {
            label: 'POS',
            icon: <ShoppingCart size={18} />,
            path: '/pos',
            color: 'from-emerald-500 to-teal-600',
            hoverColor: 'hover:from-emerald-600 hover:to-teal-700',
          }
        );
      }
    }

    // Device-related pages
    if (path.includes('/devices')) {
      if (hasAll || role === 'admin' || role === 'customer-care' || role === 'technician') {
        actions.push(
          {
            label: 'Add Device',
            icon: <Smartphone size={18} />,
            path: '/devices/new',
            color: 'from-blue-500 to-indigo-600',
            hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
          },
          {
            label: 'Customers',
            icon: <Users size={18} />,
            path: '/customers',
            color: 'from-purple-500 to-purple-600',
            hoverColor: 'hover:from-purple-600 hover:to-purple-700',
          },
          {
            label: 'Reminders',
            icon: <Clock size={18} />,
            path: '/reminders',
            color: 'from-yellow-500 to-amber-600',
            hoverColor: 'hover:from-yellow-600 hover:to-amber-700',
          },
          {
            label: 'Appointments',
            icon: <Calendar size={18} />,
            path: '/appointments',
            color: 'from-pink-500 to-rose-600',
            hoverColor: 'hover:from-rose-600 hover:to-rose-700',
          }
        );
      }
    }

    // Purchase Orders pages
    if (path.includes('/purchase-orders') || path.includes('/purchase-order')) {
      if (hasAll || role === 'admin' || userPermissions.includes('manage_inventory')) {
        actions.push(
          {
            label: 'Create PO',
            icon: <Plus size={18} />,
            path: '/lats/purchase-order/create',
            color: 'from-orange-500 to-amber-600',
            hoverColor: 'hover:from-orange-600 hover:to-amber-700',
          },
          {
            label: 'Inventory',
            icon: <Package size={18} />,
            path: '/lats/unified-inventory',
            color: 'from-blue-500 to-indigo-600',
            hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
          },
          {
            label: 'Suppliers',
            icon: <Building size={18} />,
            path: '/supplier-management',
            color: 'from-amber-500 to-orange-600',
            hoverColor: 'hover:from-orange-600 hover:to-orange-700',
          },
          {
            label: 'Stock Transfer',
            icon: <ArrowRightLeft size={18} />,
            path: '/lats/stock-transfer',
            color: 'from-sky-500 to-blue-600',
            hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
          }
        );
      }
    }

    // Reports/Analytics pages
    if (path.includes('/reports') || path.includes('/analytics') || path.includes('/sales-reports')) {
      if (hasAll || role === 'admin') {
        actions.push(
          {
            label: 'Sales Reports',
            icon: <BarChart3 size={18} />,
            path: '/lats/sales-reports',
            color: 'from-blue-500 to-indigo-600',
            hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
          },
          {
            label: 'POS',
            icon: <ShoppingCart size={18} />,
            path: '/pos',
            color: 'from-emerald-500 to-teal-600',
            hoverColor: 'hover:from-emerald-600 hover:to-teal-700',
          },
          {
            label: 'Inventory',
            icon: <Package size={18} />,
            path: '/lats/unified-inventory',
            color: 'from-orange-500 to-amber-600',
            hoverColor: 'hover:from-orange-600 hover:to-amber-700',
          },
          {
            label: 'Dashboard',
            icon: <LayoutDashboard size={18} />,
            path: '/dashboard',
            color: 'from-slate-500 to-slate-600',
            hoverColor: 'hover:from-slate-600 hover:to-slate-700',
          }
        );
      }
    }

    // Storage Rooms pages
    if (path.includes('/storage-rooms')) {
      if (hasAll || role === 'admin') {
        actions.push(
          {
            label: 'Inventory',
            icon: <Package size={18} />,
            path: '/lats/unified-inventory',
            color: 'from-orange-500 to-amber-600',
            hoverColor: 'hover:from-orange-600 hover:to-amber-700',
          },
          {
            label: 'Stock Transfer',
            icon: <ArrowRightLeft size={18} />,
            path: '/lats/stock-transfer',
            color: 'from-sky-500 to-blue-600',
            hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
          },
          {
            label: 'Purchase Orders',
            icon: <Truck size={18} />,
            path: '/lats/purchase-orders',
            color: 'from-orange-500 to-amber-600',
            hoverColor: 'hover:from-orange-600 hover:to-amber-700',
          }
        );
      }
    }

    // Supplier Management pages
    if (path.includes('/supplier-management') || path.includes('/suppliers')) {
      if (hasAll || role === 'admin' || userPermissions.includes('manage_suppliers')) {
        actions.push(
          {
            label: 'Purchase Orders',
            icon: <Truck size={18} />,
            path: '/lats/purchase-orders',
            color: 'from-orange-500 to-amber-600',
            hoverColor: 'hover:from-orange-600 hover:to-amber-700',
          },
          {
            label: 'Inventory',
            icon: <Package size={18} />,
            path: '/lats/unified-inventory',
            color: 'from-blue-500 to-indigo-600',
            hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
          },
          {
            label: 'Create PO',
            icon: <Plus size={18} />,
            path: '/lats/purchase-order/create',
            color: 'from-emerald-500 to-green-600',
            hoverColor: 'hover:from-green-600 hover:to-emerald-700',
          }
        );
      }
    }

    // Appointments pages
    if (path.includes('/appointments')) {
      if (hasAll || role === 'admin' || role === 'customer-care' || role === 'technician') {
        actions.push(
          {
            label: 'Customers',
            icon: <Users size={18} />,
            path: '/customers',
            color: 'from-purple-500 to-purple-600',
            hoverColor: 'hover:from-purple-600 hover:to-purple-700',
          },
          {
            label: 'Devices',
            icon: <Smartphone size={18} />,
            path: '/devices',
            color: 'from-blue-500 to-indigo-600',
            hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
          },
          {
            label: 'Reminders',
            icon: <Clock size={18} />,
            path: '/reminders',
            color: 'from-yellow-500 to-amber-600',
            hoverColor: 'hover:from-yellow-600 hover:to-amber-700',
          },
          {
            label: 'Create',
            icon: <CalendarPlus size={18} />,
            path: '/appointments',
            color: 'from-pink-500 to-rose-600',
            hoverColor: 'hover:from-rose-600 hover:to-rose-700',
          }
        );
      }
    }

    // Reminders pages
    if (path.includes('/reminders')) {
      if (hasAll || role === 'admin' || role === 'customer-care' || role === 'technician') {
        actions.push(
          {
            label: 'Appointments',
            icon: <Calendar size={18} />,
            path: '/appointments',
            color: 'from-pink-500 to-rose-600',
            hoverColor: 'hover:from-rose-600 hover:to-rose-700',
          },
          {
            label: 'Devices',
            icon: <Smartphone size={18} />,
            path: '/devices',
            color: 'from-blue-500 to-indigo-600',
            hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
          },
          {
            label: 'Customers',
            icon: <Users size={18} />,
            path: '/customers',
            color: 'from-purple-500 to-purple-600',
            hoverColor: 'hover:from-purple-600 hover:to-purple-700',
          }
        );
      }
    }

    // Dashboard - show common quick actions
    if (path === '/dashboard' || path === '/') {
      if (hasAll || role === 'admin' || role === 'customer-care') {
        actions.push(
          {
            label: 'POS',
            icon: <ShoppingCart size={18} />,
            path: '/pos',
            color: 'from-emerald-500 to-teal-600',
            hoverColor: 'hover:from-emerald-600 hover:to-teal-700',
          },
          {
            label: 'Inventory',
            icon: <Package size={18} />,
            path: '/lats/unified-inventory',
            color: 'from-orange-500 to-amber-600',
            hoverColor: 'hover:from-orange-600 hover:to-amber-700',
          },
          {
            label: 'Customers',
            icon: <Users size={18} />,
            path: '/customers',
            color: 'from-purple-500 to-purple-600',
            hoverColor: 'hover:from-purple-600 hover:to-purple-700',
          },
          {
            label: 'Reports',
            icon: <BarChart3 size={18} />,
            path: '/lats/sales-reports',
            color: 'from-blue-500 to-indigo-600',
            hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
          }
        );
      }
    }

    return actions;
  }, [location.pathname, currentUser]);

  const createMenuOptions = useMemo(() => {
    const options: Array<{
      key: string;
      label: string;
      description: string;
      icon: React.ComponentType<{ size?: number }>;
      gradient: string;
      hover: string;
      action: () => void;
    }> = [];

    const userPermissions = currentUser?.permissions || [];
    const hasAll = userPermissions.includes('all');
    const role = currentUser?.role;
    const canManageInventory = hasAll || role === 'admin' || role === 'inventory-manager' || userPermissions.includes('manage_inventory');
    const canAddProducts = canManageInventory || userPermissions.includes('add_products');

    if (canAddProducts) {
      options.push({
        key: 'add-product',
        label: 'Add Product',
        description: 'Add new inventory item',
        icon: Package,
        gradient: 'from-orange-500 to-amber-600',
        hover: 'hover:from-orange-600 hover:to-amber-700',
        action: () => {
          setShowAddProductModal(true);
          setShowCreateDropdown(false);
        },
      });
    }

    if (canManageInventory) {
      options.push({
        key: 'stock-transfer',
        label: 'Stock Transfer',
        description: 'Move stock between branches',
        icon: ArrowRightLeft,
        gradient: 'from-sky-500 to-blue-600',
        hover: 'hover:from-blue-600 hover:to-indigo-700',
        action: () => {
          setShowStockTransferModal(true);
          setShowCreateDropdown(false);
        },
      });
    }


    if (role === 'admin' || hasAll || userPermissions.includes('manage_suppliers')) {
      options.push({
        key: 'add-supplier',
        label: 'Add Supplier',
        description: 'Manage procurement partners',
        icon: Building,
        gradient: 'from-amber-500 to-orange-600',
        hover: 'hover:from-orange-600 hover:to-orange-700',
        action: () => {
          setShowAddSupplierModal(true);
          setShowCreateDropdown(false);
        },
      });
    }

    if (role === 'admin' || hasAll) {
      options.push({
        key: 'customer-import',
        label: 'Import Customers',
        description: 'Upload customer records from Excel',
        icon: UserPlus,
        gradient: 'from-emerald-500 to-green-600',
        hover: 'hover:from-green-600 hover:to-emerald-700',
        action: () => {
          setShowCustomerImportModal(true);
          setShowCreateDropdown(false);
        },
      });
    }

    if (role === 'admin' || role === 'customer-care' || role === 'technician' || hasAll) {
      options.push({
        key: 'create-appointment',
        label: 'Create Appointment',
        description: 'Schedule customer visit or repair',
        icon: CalendarPlus,
        gradient: 'from-pink-500 to-rose-600',
        hover: 'hover:from-rose-600 hover:to-rose-700',
        action: () => {
          setShowAppointmentModal(true);
          setShowCreateDropdown(false);
        },
      });
    }

    if (role === 'admin' || hasAll) {
      options.push({
        key: 'payments',
        label: 'Payment Entry',
        description: 'Record manual payments & transfers',
        icon: CreditCard,
        gradient: 'from-slate-600 to-slate-700',
        hover: 'hover:from-slate-700 hover:to-slate-800',
        action: () => {
          setPaymentModalConfig({
            amount: 0,
            description: 'Manual payment entry',
          });
          setShowPaymentModal(true);
          setShowCreateDropdown(false);
        },
      });
    }

    if (hasAll || role === 'admin' || role === 'customer-care') {
      options.push({
        key: 'sms-centre',
        label: 'SMS Centre',
        description: 'Send messages to customers',
        icon: MessageSquare,
        gradient: 'from-indigo-500 to-indigo-600',
        hover: 'hover:from-indigo-600 hover:to-indigo-700',
        action: () => {
          setShowSMSModal(true);
          setShowCreateDropdown(false);
        },
      });
    }

    // Employee Import - HR Admin functionality
    if (role === 'admin' || hasAll || userPermissions.includes('manage_employees')) {
      options.push({
        key: 'employee-import',
        label: 'Import Employees',
        description: 'Add team members from users',
        icon: UserCheck,
        gradient: 'from-teal-500 to-cyan-600',
        hover: 'hover:from-cyan-600 hover:to-teal-700',
        action: () => {
          setShowEmployeeImportModal(true);
          setShowCreateDropdown(false);
        },
      });
    }

    // Account Transfers - Finance operations
    if (role === 'admin' || hasAll || userPermissions.includes('manage_finances')) {
      options.push({
        key: 'account-transfer',
        label: 'Account Transfer',
        description: 'Move funds between accounts',
        icon: ArrowRight,
        gradient: 'from-slate-500 to-slate-600',
        hover: 'hover:from-slate-600 hover:to-slate-700',
        action: () => {
          setShowAccountTransferModal(true);
          setShowCreateDropdown(false);
        },
      });
    }

    // Bulk SMS Campaigns - Marketing/Communication
    if (role === 'admin' || hasAll || role === 'customer-care' || userPermissions.includes('manage_communications')) {
      options.push({
        key: 'bulk-sms',
        label: 'Bulk SMS Campaign',
        description: 'Send messages to customer groups',
        icon: MessageSquare,
        gradient: 'from-violet-500 to-purple-600',
        hover: 'hover:from-purple-600 hover:to-violet-700',
        action: () => {
          setShowBulkSMSModal(true);
          setShowCreateDropdown(false);
        },
      });
    }

    // Daily Reports - All authenticated users
    if (role) {
      options.push({
        key: 'daily-report',
        label: 'Daily Report',
        description: 'Submit your daily work report',
        icon: FileText,
        gradient: 'from-blue-500 to-indigo-600',
        hover: 'hover:from-indigo-600 hover:to-blue-700',
        action: () => {
          setReportType('daily');
          setShowDailyReportModal(true);
          setShowCreateDropdown(false);
        },
      });

      options.push({
        key: 'monthly-report',
        label: 'Monthly Report',
        description: 'Submit your monthly summary report',
        icon: Calendar,
        gradient: 'from-teal-500 to-cyan-600',
        hover: 'hover:from-cyan-600 hover:to-teal-700',
        action: () => {
          setReportType('monthly');
          setShowDailyReportModal(true);
          setShowCreateDropdown(false);
        },
      });
    }

    return options;
  }, [currentUser, navigate, setShowCreateDropdown, setShowAddProductModal, setShowAddSupplierModal, setShowCustomerImportModal, setShowAppointmentModal, setPaymentModalConfig, setShowPaymentModal, setShowSMSModal, setShowEmployeeImportModal, setShowAccountTransferModal, setShowBulkSMSModal, setShowDailyReportModal, setReportType]);

  // Format time duration
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds < 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <>
      {/* Floating WhatsApp Bulk Campaign Panel - GLOBAL */}
      {showCampaignPanel && activeCampaign && (
        <div 
          className="fixed right-4 bg-white rounded-2xl shadow-2xl border-4 border-green-500 overflow-hidden z-[100000]"
          style={{ 
            top: '50%',
            transform: 'translateY(-50%)',
            width: '550px',
            maxHeight: '95vh',
            boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.2), 0 20px 60px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white p-5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    📤 Campaign Active
                  </h3>
                  <p className="text-xs text-green-100">
                    Sending in progress...
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Navigate to WhatsApp inbox and expand
                    window.location.href = '/whatsapp/inbox?expand=true';
                  }}
                  className="p-2.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                  title="Expand to full view"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setShowCampaignPanel(false);
                    toast.success('Panel hidden. Campaign continues.', { icon: '👁️' });
                  }}
                  className="p-2.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                  title="Hide panel"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto bg-white relative z-10" style={{ maxHeight: 'calc(95vh - 120px)' }}>
            {/* Progress Section */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700">Progress</span>
                <span className="text-2xl font-bold text-blue-600">
                  {activeCampaign.current || 0} / {activeCampaign.total || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2">
                <div
                  className="h-4 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${activeCampaign.total > 0 ? ((activeCampaign.current || 0) / activeCampaign.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-center text-sm font-bold text-gray-700">
                {activeCampaign.total > 0 ? Math.round(((activeCampaign.current || 0) / activeCampaign.total) * 100) : 0}% Complete
              </p>
            </div>

            {/* Statistics */}
            {((activeCampaign.success || 0) > 0 || (activeCampaign.failed || 0) > 0) && (
              <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-purple-50 to-pink-50">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Campaign Stats
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-600 mb-1">Success</p>
                    <p className="text-2xl font-bold text-green-600">{activeCampaign.success || 0}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-red-200">
                    <p className="text-xs text-gray-600 mb-1">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{activeCampaign.failed || 0}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Success Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {(activeCampaign.success || 0) + (activeCampaign.failed || 0) > 0 
                        ? Math.round(((activeCampaign.success || 0) / ((activeCampaign.success || 0) + (activeCampaign.failed || 0))) * 100) 
                        : 0}%
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <p className="text-xs text-gray-600 mb-1">Duration</p>
                    <p className="text-lg font-bold text-purple-600">
                      {activeCampaign.startTime 
                        ? formatDuration(Math.floor((Date.now() - activeCampaign.startTime) / 1000))
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Message */}
            <div className="p-4 bg-blue-50 border-l-4 border-blue-500">
              <p className="text-sm text-blue-900 font-medium">
                💡 Campaign is running in the background
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Click the eye icon above to view full details in WhatsApp Inbox
              </p>
            </div>

            {/* Quick Stats */}
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Recipients:</span>
                <span className="font-bold text-gray-900">{activeCampaign.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sent:</span>
                <span className="font-bold text-green-600">{activeCampaign.success || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Failed:</span>
                <span className="font-bold text-red-600">{activeCampaign.failed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remaining:</span>
                <span className="font-bold text-orange-600">
                  {(activeCampaign.total || 0) - (activeCampaign.current || 0)}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  window.location.href = '/whatsapp/inbox?expand=true';
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <Eye className="w-5 h-5" />
                View Full Campaign Details
              </button>
            </div>
          </div>
        </div>
      )}
      
    <header ref={headerRef} className={`fixed top-0 left-0 right-0 z-20 transition-all duration-500 ${isNavCollapsed ? 'md:ml-[5.5rem]' : 'md:ml-72'}`}>
      {/* Main TopBar */}
      <div className={`topbar ${isDark ? 'bg-slate-900/90' : 'bg-white/80'} backdrop-blur-xl ${isDark ? 'border-slate-700/50' : 'border-white/30'} border-b shadow-lg`}>
        <div className="flex items-center justify-between px-3 lg:px-6 py-2.5 lg:py-3">
          {/* Left Section - Menu Toggle & Back Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onMenuToggle}
              className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/60 hover:bg-slate-700/60' : 'bg-white/80 hover:bg-white'} transition-all duration-200 backdrop-blur-sm md:hidden ${isDark ? 'border-slate-600' : 'border-gray-200'} border shadow-sm`}
            >
              {isMenuOpen ? <X size={20} className={isDark ? 'text-gray-200' : 'text-gray-700'} /> : <Menu size={20} className={isDark ? 'text-gray-200' : 'text-gray-700'} />}
            </button>
            
            {/* Back Button */}
            <button
              onClick={handleBackClick}
              className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/60 hover:bg-slate-700/60' : 'bg-white/80 hover:bg-white'} transition-all duration-200 backdrop-blur-sm ${isDark ? 'border-slate-600' : 'border-gray-200'} border shadow-sm`}
              title={previousPage ? "Go Back" : "Go to Dashboard"}
            >
              <ArrowLeft size={18} className={isDark ? 'text-gray-200' : 'text-gray-700'} />
            </button>
          </div>

          {/* Center Section - Search & Action Buttons - Responsive with horizontal scroll */}
          <div className="hidden md:flex items-center gap-2 flex-1 mx-2 lg:mx-4 overflow-x-auto transition-all" style={{ scrollBehavior: 'smooth' }}>
            <div className="flex items-center gap-2 min-w-max">
            {/* Search Button */}
            <button
              onClick={() => openSearch()}
                className={`p-2.5 lg:p-3 rounded-xl transition-all duration-200 flex-shrink-0 ${
                isDark 
                  ? 'bg-slate-800/60 hover:bg-slate-700/60 text-gray-300 border border-slate-700' 
                  : 'bg-white/80 hover:bg-white text-gray-700 border border-gray-200'
              } cursor-pointer backdrop-blur-sm shadow-sm hover:shadow-md`}
              title="Search (⌘K)"
            >
                <Search size={18} />
            </button>

            {/* Divider */}
              <div className={`h-8 w-px mx-0.5 lg:mx-1 flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}></div>

            {/* Quick Actions Group */}
              <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
              {/* Quick Reminder Button - All roles */}
              <button
                onClick={() => setShowQuickReminder(true)}
                  className="flex items-center justify-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
                title="Quick Reminder (⚡ Fast Entry)"
              >
                  <Bell size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="hidden xl:inline font-medium text-sm">Reminder</span>
              </button>

              {/* Quick Expense Button - Admins only */}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setShowQuickExpense(true)}
                    className="flex items-center justify-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Quick Expense (⚡ Fast Entry)"
                >
                    <DollarSign size={16} className="lg:w-[18px] lg:h-[18px]" />
                    <span className="hidden xl:inline font-medium text-sm">Expense</span>
                </button>
              )}
            </div>

            {/* Divider */}
              <div className={`h-8 w-px mx-0.5 lg:mx-1 flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}></div>

            {/* Dynamic Quick Access Buttons - Context-aware */}
            {getContextualQuickActions.length > 0 && (
              <>
                  <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
                  {getContextualQuickActions.slice(0, 4).map((action, index) => (
                    <button
                      key={`${action.path}-${index}`}
                      onClick={() => navigate(action.path)}
                        className={`flex items-center justify-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-gradient-to-r ${action.color} ${action.hoverColor} text-white transition-all duration-200 shadow-sm hover:shadow-md font-medium whitespace-nowrap text-sm`}
                      title={action.label}
                    >
                        {React.cloneElement(action.icon as React.ReactElement, { 
                          size: 16, 
                          className: "lg:w-[18px] lg:h-[18px]" 
                        })}
                      <span className="hidden xl:inline">{action.label}</span>
                    </button>
                  ))}
                </div>
                  <div className={`h-8 w-px mx-0.5 lg:mx-1 flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
              </>
            )}

            {/* Business Actions Group */}
              <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
              {/* Installment Plans Button */}
              {(currentUser?.role === 'admin' || currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('view_installments')) && (
                <button
                  onClick={() => setShowInstallmentManagementModal(true)}
                    className="flex items-center justify-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm"
                  title="Installment Plans"
                >
                    <Calendar size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="hidden lg:inline">Installments</span>
                </button>
              )}

              {/* Purchase Order Button - Admins & Inventory Managers */}
              {(currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_inventory') || currentUser?.permissions?.includes('all')) && (
                <button
                  onClick={() => navigate('/lats/purchase-order/create')}
                    className="flex items-center justify-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm"
                  title="Create Purchase Order (⌘⇧O)"
                >
                    <Truck size={16} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="hidden lg:inline">PO</span>
                </button>
              )}

              {/* Create Dropdown - Role-based */}
              {currentUser?.role !== 'technician' && (
                <div className="relative" ref={createDropdownRef}>
                  <button
                    onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                      className="flex items-center justify-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm"
                    title="Create new items"
                  >
                      <Plus size={16} className="lg:w-[18px] lg:h-[18px]" />
                    <span className="hidden lg:inline">Create</span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${showCreateDropdown ? 'rotate-180' : ''}`} />
                  </button>
              
              {/* Create Dropdown Menu */}
              {showCreateDropdown && (
                <div className={`absolute right-0 top-full mt-2 w-80 ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-white/95 border-gray-200/60'} backdrop-blur-xl rounded-xl shadow-xl border z-50`}>
                  <div className="p-4 space-y-3">
                    {createMenuOptions.length === 0 ? (
                      <div className={`w-full px-4 py-6 rounded-xl border text-center ${isDark ? 'bg-slate-800/70 border-slate-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        <p className="text-sm font-medium">No quick create actions available</p>
                      </div>
                    ) : (
                      createMenuOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                    <button
                            key={option.key}
                            onClick={option.action}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${option.gradient} ${option.hover} text-white transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon size={20} className="shrink-0" />
                              <div className="text-left">
                                <p className="font-semibold leading-tight">{option.label}</p>
                                <p className="text-xs text-white/80 leading-tight">{option.description}</p>
                      </div>
                      </div>
                            <ArrowRight size={18} className="opacity-80" />
                    </button>
                        );
                      })
                    )}
                        </div>
                        </div>
                    )}
            </div>
          )}
              </div>
          </div>
          </div>

          {/* Technician Quick Actions */}
          {currentUser?.role === 'technician' && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => navigate('/lats/spare-parts')}
                className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm"
              >
                <Package size={16} />
                <span>Spare Parts</span>
              </button>
            </div>
          )}

          {/* Divider */}
          {currentUser?.role !== 'technician' && (
            <div className={`hidden lg:block h-8 w-px mx-1 flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
          )}

          {/* Navigation Icons - Clean & Essential Only */}
          {currentUser?.role !== 'technician' && (
            <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
              {/* POS System - Priority for Customer Care */}
              <div className="relative group">
                <button 
                  onClick={() => navigate('/pos')}
                  className={`p-2.5 rounded-xl transition-all duration-200 backdrop-blur-sm border shadow-sm ${
                    location.pathname.includes('/pos') 
                      ? 'bg-emerald-500 text-white border-emerald-400 scale-105' 
                      : isDark
                        ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600 hover:scale-105'
                        : 'bg-white/80 hover:bg-white border-gray-200 hover:scale-105'
                  }`}
                  title="POS System"
                >
                  <ShoppingCart size={16} className={location.pathname.includes('/pos') ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-700'} />
                </button>
                <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 ${isDark ? 'bg-slate-800/95 border-slate-600/50 text-gray-200' : 'bg-white/95 border-gray-200/50 text-gray-700'} backdrop-blur-sm border text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50`}>
                  POS System
                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${isDark ? 'border-t-slate-800/95' : 'border-t-white/95'}`}></div>
                </div>
              </div>
              
              {/* Customer Management */}
              <div className="relative group">
                <button 
                  onClick={() => navigate('/customers')}
                  className={`p-2.5 rounded-xl transition-all duration-200 backdrop-blur-sm border shadow-sm ${
                    location.pathname.includes('/customers') 
                      ? 'bg-purple-500 text-white border-purple-400 scale-105' 
                      : isDark
                        ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600 hover:scale-105'
                        : 'bg-white/80 hover:bg-white border-gray-200 hover:scale-105'
                  }`}
                  title="Customers"
                >
                  <Users size={16} className={location.pathname.includes('/customers') ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-700'} />
                </button>
                <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 ${isDark ? 'bg-slate-800/95 border-slate-600/50 text-gray-200' : 'bg-white/95 border-gray-200/50 text-gray-700'} backdrop-blur-sm border text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50`}>
                  Customers
                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${isDark ? 'border-t-slate-800/95' : 'border-t-white/95'}`}></div>
                </div>
              </div>
              
              {/* Device Management */}
              <div className="relative group">
                <button 
                  onClick={() => navigate('/devices')}
                  className={`p-2.5 rounded-xl transition-all duration-200 backdrop-blur-sm border shadow-sm ${
                    location.pathname.includes('/devices') 
                      ? 'bg-blue-500 text-white border-blue-400 scale-105' 
                      : isDark
                        ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600 hover:scale-105'
                        : 'bg-white/80 hover:bg-white border-gray-200 hover:scale-105'
                  }`}
                  title="Devices"
                >
                  <Smartphone size={16} className={location.pathname.includes('/devices') ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-700'} />
                </button>
                <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 ${isDark ? 'bg-slate-800/95 border-slate-600/50 text-gray-200' : 'bg-white/95 border-gray-200/50 text-gray-700'} backdrop-blur-sm border text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50`}>
                  Devices
                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${isDark ? 'border-t-slate-800/95' : 'border-t-white/95'}`}></div>
                </div>
              </div>
              
              {/* Reminders */}
              <div className="relative group">
                <button 
                  onClick={() => navigate('/reminders')}
                  className={`p-2.5 rounded-xl transition-all duration-200 backdrop-blur-sm border shadow-sm relative ${
                    location.pathname.includes('/reminders') 
                      ? 'bg-yellow-500 text-white border-yellow-400 scale-105' 
                      : isDark
                        ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600 hover:scale-105'
                        : 'bg-white/80 hover:bg-white border-gray-200 hover:scale-105'
                  }`}
                  title="Reminders"
                >
                  <Clock size={16} className={location.pathname.includes('/reminders') ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-700'} />
                  {reminderCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      <span className="text-[10px] text-white font-bold">
                        {reminderCount > 9 ? '9+' : reminderCount}
                      </span>
                    </div>
                  )}
                </button>
                <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 ${isDark ? 'bg-slate-800/95 border-slate-600/50 text-gray-200' : 'bg-white/95 border-gray-200/50 text-gray-700'} backdrop-blur-sm border text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50`}>
                  Reminders {reminderCount > 0 ? `(${reminderCount} overdue)` : ''}
                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${isDark ? 'border-t-slate-800/95' : 'border-t-white/95'}`}></div>
                </div>
              </div>
              
              {/* Admin-only quick access */}
              {currentUser?.role === 'admin' && (
                <>
                  {/* Inventory */}
                  <div className="relative group">
                    <button 
                      onClick={() => navigate('/lats/unified-inventory')}
                      className={`p-2.5 rounded-xl transition-all duration-200 backdrop-blur-sm border shadow-sm ${
                        location.pathname.includes('/lats/unified-inventory') 
                          ? 'bg-orange-500 text-white border-orange-400 scale-105' 
                          : isDark
                            ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600 hover:scale-105'
                            : 'bg-white/80 hover:bg-white border-gray-200 hover:scale-105'
                      }`}
                      title="Inventory"
                    >
                      <Warehouse size={16} className={location.pathname.includes('/lats/unified-inventory') ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-700'} />
                    </button>
                    <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 ${isDark ? 'bg-slate-800/95 border-slate-600/50 text-gray-200' : 'bg-white/95 border-gray-200/50 text-gray-700'} backdrop-blur-sm border text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50`}>
                      Inventory
                      <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${isDark ? 'border-t-slate-800/95' : 'border-t-white/95'}`}></div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Divider */}
          <div className={`hidden lg:block h-8 w-px mx-1 flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}></div>

          {/* Right Section - Status & Actions */}
          <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">

            {/* Activity Pills - Real Counts Only */}
            <div className="hidden xl:flex items-center gap-1.5 mr-1.5">
              {activityCounts.activeDevices > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-blue-100 text-blue-700 backdrop-blur-sm border border-blue-200 shadow-sm">
                  <Smartphone size={12} />
                  <span className="text-xs font-bold">{formatNumber(activityCounts.activeDevices)}</span>
                </div>
              )}
              {activityCounts.overdueDevices > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-red-100 text-red-700 backdrop-blur-sm border border-red-200 shadow-sm">
                  <Clock size={12} />
                  <span className="text-xs font-bold">{formatNumber(activityCounts.overdueDevices)}</span>
                </div>
              )}
              
              {/* Show customer count only for non-technicians */}
              {currentUser?.role !== 'technician' && activityCounts.newCustomers > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-green-100 text-green-700 backdrop-blur-sm border border-green-200 shadow-sm">
                  <Users size={12} />
                  <span className="text-xs font-bold">{formatNumber(activityCounts.newCustomers)}</span>
                </div>
              )}
            </div>

            {/* Status Indicator */}
            <div className="hidden sm:flex items-center justify-center w-7 h-7">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse shadow-sm`}></div>
            </div>

            {/* Divider */}
            <div className={`hidden sm:block h-8 w-px mx-0.5 flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}></div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className={`p-2.5 rounded-xl ${isDark ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600' : 'bg-white/80 hover:bg-white border-gray-200'} transition-all duration-200 backdrop-blur-sm border shadow-sm`}
              title={isFullscreen ? "Exit Fullscreen (ESC)" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 size={16} className={isDark ? 'text-gray-200' : 'text-gray-700'} />
              ) : (
                <Maximize2 size={16} className={isDark ? 'text-gray-200' : 'text-gray-700'} />
              )}
            </button>

            {/* Refresh Button - Clear all caches and refresh */}
            <RefreshButton
              variant="icon"
              size="md"
              showConfirmation={true}
              className={`${isDark ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600' : 'bg-white/80 hover:bg-white border-gray-200'} ${isDark ? 'text-gray-200 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'} !p-2.5`}
            />

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2.5 rounded-xl ${isDark ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600' : 'bg-white/80 hover:bg-white border-gray-200'} transition-all duration-200 backdrop-blur-sm border relative shadow-sm`}
                title="Notifications"
              >
                <Bell size={16} className={isDark ? 'text-gray-200' : 'text-gray-700'} />
                {unreadNotifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full notification-badge border-2 border-white shadow-sm flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                    </span>
                  </div>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className={`absolute right-0 top-full mt-3 w-80 ${isDark ? 'bg-slate-800/95' : 'bg-white/95'} backdrop-blur-xl rounded-xl shadow-xl ${isDark ? 'border-slate-700' : 'border-white/30'} border z-50 max-h-96 overflow-y-auto`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                      {unreadNotifications.length > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                          {unreadNotifications.length} unread
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 8).map((notification) => (
                          <div
                            key={notification.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-pointer ${
                              notification.status === 'unread' 
                                ? isDark
                                  ? 'bg-blue-900/30 border-blue-700'
                                  : 'bg-blue-50 border-blue-200'
                                : isDark
                                  ? 'bg-slate-700/30 border-slate-600'
                                  : 'bg-gray-50 border-gray-200'
                            }`}
                            onClick={() => {
                              if (notification.status === 'unread') {
                                markAsRead(notification.id);
                              }
                              if (notification.actionUrl) {
                                navigate(notification.actionUrl);
                                setShowNotifications(false);
                              }
                            }}
                          >
                            <div className={`p-2 rounded-full text-lg ${notification.color || 'bg-gray-500'}`}>
                              {notification.icon || '🔔'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${
                                notification.status === 'unread' 
                                  ? isDark ? 'text-white' : 'text-gray-900'
                                  : isDark ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </p>
                              <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {notification.message}
                              </p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              {notification.status === 'unread' && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismissNotification(notification.id);
                                }}
                                className={`${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
                                title="Dismiss"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={`text-center py-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Bell size={24} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium">No notifications</p>
                        </div>
                      )}
                    </div>
                    {notifications.length > 8 && (
                      <div className={`mt-3 pt-3 ${isDark ? 'border-slate-700' : 'border-gray-200'} border-t`}>
                        <button
                          onClick={() => {
                            navigate('/notifications');
                            setShowNotifications(false);
                          }}
                          className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View all notifications
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions - HIDDEN */}
            {/* <div className="hidden lg:flex items-center gap-1">
              {quickActions.slice(0, 2).map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="p-2 rounded-lg bg-white/30 hover:bg-white/50 transition-all duration-300 backdrop-blur-sm border border-white/30 shadow-sm"
                  title={action.label}
                >
                  {React.cloneElement(action.icon, { className: "text-gray-700", size: 18 })}
                </button>
              ))}
              
              <button
                className="p-3 rounded-lg bg-white/30 hover:bg-white/50 transition-all duration-300 backdrop-blur-sm border border-white/30 shadow-sm"
                title="Scan Barcode"
              >
                <Scan size={18} className="text-gray-700" />
              </button>
              
              <button
                className="p-3 rounded-lg bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white transition-all duration-300 shadow-sm"
                title="Clear Cart"
                disabled
              >
                <Trash2 size={18} />
              </button>
            </div> */}

            {/* Branch Selector - Admin Only - Right Corner */}
            {currentUser?.role === 'admin' && (
              <SimpleBranchSelector />
            )}

            {/* User Selector for Testing - Admin Only */}
            {currentUser?.role === 'admin' && (
              <div className="relative">
                <button
                  onClick={() => {
                    const willOpen = !showUserSelector;
                    setShowUserSelector(willOpen);
                    if (willOpen) {
                      loadTestUsers();
                    }
                  }}
                  className={`p-2.5 rounded-xl transition-all duration-200 backdrop-blur-sm border shadow-sm ${
                    isImpersonating
                      ? 'bg-red-500 text-white border-red-400 hover:bg-red-600'
                      : 'bg-purple-500 text-white border-purple-400 hover:bg-purple-600'
                  }`}
                  title={isImpersonating ? 'Stop User Testing (Currently impersonating)' : 'Test as Different User'}
                >
                  <User size={16} className={isImpersonating ? 'text-white' : 'text-white'} />
                </button>

                {/* User Selector Dropdown */}
                {showUserSelector && (
                  <div className={`absolute right-0 top-full mt-2 w-80 ${isDark ? 'bg-slate-800/95 border-slate-700/60' : 'bg-white/95 border-gray-200/60'} backdrop-blur-xl rounded-xl shadow-xl border z-50 max-h-96 overflow-y-auto`}>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {isImpersonating ? 'Stop Testing' : 'Test as User'}
                        </h3>
                        {isImpersonating && (
                          <button
                            onClick={handleStopImpersonation}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Stop Testing
                          </button>
                        )}
                      </div>

                      {isImpersonating && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-700">
                            <User size={16} />
                            <span className="text-sm font-medium">
                              Currently testing as: <strong>{currentUser?.name}</strong> ({currentUser?.role})
                            </span>
                          </div>
                        </div>
                      )}

                      {!isImpersonating && (
                        <div className="space-y-2">
                          {loadingUsers ? (
                            <div className="text-center py-4">
                              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                              <p className="text-sm text-gray-600">Loading users...</p>
                            </div>
                          ) : availableTestUsers.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">
                              <User size={24} className="mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No users available for testing</p>
                            </div>
                          ) : (
                            availableTestUsers.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => handleUserSelect(user.id)}
                                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
                                  isDark
                                    ? 'hover:bg-slate-700/60 text-gray-300'
                                    : 'hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-xs text-white font-bold">
                                      {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm font-medium">{user.full_name || user.email}</p>
                                    <p className="text-xs text-gray-500 capitalize">{user.role?.replace('-', ' ') || 'user'}</p>
                                  </div>
                                </div>
                                <ArrowRight size={16} className="text-gray-400" />
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                          {isImpersonating
                            ? 'Click "Stop Testing" to return to admin account'
                            : 'Select a user to test the system from their perspective'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Mobile Search Bar & Create Button */}
      <div className={`md:hidden px-4 py-3 ${isDark ? 'bg-slate-900/40' : 'bg-white/20'} backdrop-blur-sm ${isDark ? 'border-slate-700/50' : 'border-white/20'} border-b`}>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={() => openSearch()}
            className={`p-2.5 rounded-lg transition-all duration-200 ${
              isDark 
                ? 'bg-slate-800/60 hover:bg-slate-700/60 text-gray-300 border border-slate-700' 
                : 'bg-white/60 hover:bg-white/80 text-gray-700 border border-gray-200'
            } cursor-pointer backdrop-blur-sm shadow-sm hover:shadow-md`}
            title="Search"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setShowCreateDropdown(!showCreateDropdown)}
            className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <Plus size={20} />
          </button>
        </div>
        
        {/* Mobile Create Dropdown */}
        {showCreateDropdown && (
          <div className={`mt-3 p-4 ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-white/95 border-gray-200/60'} rounded-xl shadow-xl border backdrop-blur-xl`}>
            <div className="space-y-3">
              {createMenuOptions.length === 0 ? (
                <div className={`w-full px-4 py-6 rounded-xl border text-center ${isDark ? 'bg-slate-800/70 border-slate-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                  <p className="text-sm font-medium">No quick create actions available</p>
                </div>
              ) : (
                createMenuOptions.map((option) => {
                  const Icon = option.icon;
                  return (
              <button
                      key={option.key}
                      onClick={option.action}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${option.gradient} ${option.hover} text-white transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5`}
              >
                      <div className="flex items-center gap-3">
                        <Icon size={20} className="shrink-0" />
                        <div className="text-left">
                          <p className="font-semibold leading-tight">{option.label}</p>
                          <p className="text-xs text-white/80 leading-tight">{option.description}</p>
                </div>
                </div>
                      <ArrowRight size={18} className="opacity-80" />
              </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Expense Modal */}
      <QuickExpenseModal
        isOpen={showQuickExpense}
        onClose={() => setShowQuickExpense(false)}
        onSuccess={() => {
          // Optional: Show toast or refresh data
          console.log('Expense recorded successfully');
        }}
      />

      {/* Quick Reminder Modal */}
      <QuickReminderModal
        isOpen={showQuickReminder}
        onClose={() => setShowQuickReminder(false)}
        onSuccess={() => {
          // Optional: Show toast or refresh data
          console.log('Reminder created successfully');
        }}
      />

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onProductCreated={() => {
          setShowAddProductModal(false);
          console.log('Product created successfully');
        }}
      />

      <QuickStockTransferModal
        isOpen={showStockTransferModal}
        onClose={() => setShowStockTransferModal(false)}
        onSuccess={() => {
          toast.success('Stock transfer queued successfully');
          setShowStockTransferModal(false);
        }}
      />


      <EnhancedAddSupplierModal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        onSupplierCreated={() => {
          toast.success('Supplier added successfully');
          setShowAddSupplierModal(false);
        }}
      />

      <UnifiedContactImportModal
        isOpen={showCustomerImportModal}
        onClose={() => setShowCustomerImportModal(false)}
        onImportComplete={(stats) => {
          const imported = stats?.imported ?? 0;
          toast.success(`Imported ${imported} customers`);
          setShowCustomerImportModal(false);
        }}
      />

      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSave={handleAppointmentSave}
        mode="create"
      />

      <PaymentsPopupModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={paymentModalConfig.amount}
        description={paymentModalConfig.description}
        onPaymentComplete={async () => {
          toast.success('Payment recorded successfully');
          setShowPaymentModal(false);
        }}
        title="Quick Payment Entry"
        allowPriceEdit
        paymentType="cash_in"
      />

      <QuickSMSModal
        isOpen={showSMSModal}
        onClose={() => setShowSMSModal(false)}
      />

      {/* Employee Import Modal */}
      {showEmployeeImportModal && (
        <ImportEmployeesFromUsersModal
          isOpen={showEmployeeImportModal}
          onClose={() => setShowEmployeeImportModal(false)}
          onSuccess={() => {
            toast.success('Employees imported successfully');
            setShowEmployeeImportModal(false);
          }}
        />
      )}

      {/* Account Transfer Modal */}
      {showAccountTransferModal && (
        <TransferModal
          isOpen={showAccountTransferModal}
          onClose={() => setShowAccountTransferModal(false)}
          onTransferComplete={() => {
            toast.success('Transfer completed successfully');
            setShowAccountTransferModal(false);
          }}
        />
      )}

      {/* Bulk SMS Modal */}
      {showBulkSMSModal && (
        <BulkSMSModal
          isOpen={showBulkSMSModal}
          onClose={() => setShowBulkSMSModal(false)}
          onSuccess={(result) => {
            const sent = result?.sent || 0;
            const failed = result?.failed || 0;
            toast.success(`SMS campaign completed: ${sent} sent${failed ? `, ${failed} failed` : ''}`);
            setShowBulkSMSModal(false);
          }}
        />
      )}

      {/* Daily Report Modal */}
      <DailyReportModal
        isOpen={showDailyReportModal}
        onClose={() => setShowDailyReportModal(false)}
        reportType={reportType}
        onSuccess={() => {
          toast.success('Report submitted successfully!');
          setShowDailyReportModal(false);
        }}
      />

      {/* Installment Management Modal */}
      <InstallmentManagementModal
        isOpen={showInstallmentManagementModal}
        onClose={() => setShowInstallmentManagementModal(false)}
      />

    </header>
    </>
  );
};

interface QuickStockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickStockTransferModal: React.FC<QuickStockTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [branches, setBranches] = useState<Array<{ id: string; name: string; city?: string }>>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [toBranchId, setToBranchId] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variantInfo, setVariantInfo] = useState<{ name: string; quantity: number } | null>(null);

  const currentBranchId =
    typeof window !== 'undefined' ? localStorage.getItem('current_branch_id') || '' : '';

  const fetchBranches = useCallback(async () => {
    if (!currentBranchId) return;
    setLoadingBranches(true);
    try {
      const { data, error: branchError } = await supabase
        .from('store_locations')
        .select('id, name, city')
        .eq('is_active', true)
        .neq('id', currentBranchId)
        .order('name');

      if (branchError) {
        throw branchError;
      }
      setBranches(data || []);
    } catch (err) {
      console.error('Failed to load branches:', err);
      toast.error('Failed to load destination branches');
    } finally {
      setLoadingBranches(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSku('');
    setQuantity(1);
    setNotes('');
    setVariantInfo(null);
    fetchBranches();
  }, [isOpen, fetchBranches]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentBranchId) {
      setError('Please set your current branch before creating transfers.');
      toast.error('Select an active branch to continue');
      return;
    }
    if (!toBranchId) {
      setError('Select the destination branch.');
      return;
    }
    if (!sku.trim()) {
      setError('Enter the product SKU to transfer.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: variant, error: variantError } = await supabase
        .from('lats_product_variants')
        .select(
          `
            id,
            sku,
            quantity,
            variant_name,
            product:lats_products(name)
          `
        )
        .eq('branch_id', currentBranchId)
        .eq('sku', sku.trim())
        .single();

      if (variantError || !variant) {
        throw new Error('No stock found for that SKU in the current branch.');
      }

      if ((variant.quantity || 0) < quantity) {
        throw new Error('Quantity exceeds available stock.');
      }

      await createStockTransfer({
        from_branch_id: currentBranchId,
        to_branch_id: toBranchId,
        entity_type: 'variant',
        entity_id: variant.id,
        quantity,
        notes: notes || undefined,
      });

      setVariantInfo({
        name: variant.product?.name || variant.variant_name || variant.sku,
        quantity: variant.quantity || 0,
      });

      setSku('');
      setQuantity(1);
      setNotes('');

      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Quick stock transfer error:', err);
      const message = err instanceof Error ? err.message : 'Failed to create stock transfer.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Stock Transfer"
      maxWidth="md"
    >
      {!currentBranchId ? (
        <div className="space-y-3 text-gray-600">
          <p className="text-sm">
            Set your active branch to create a stock transfer. Use the branch selector in the top bar
            to choose your current branch.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">From Branch</label>
              <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {currentBranchId}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Current active branch (change via branch selector if needed)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Destination Branch</label>
              <select
                value={toBranchId}
                onChange={(event) => setToBranchId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={loadingBranches}
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                    {branch.city ? ` • ${branch.city}` : ''}
                  </option>
                ))}
              </select>
              {loadingBranches && (
                <p className="mt-1 text-xs text-blue-500">Loading branches…</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Product SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                placeholder="e.g. SKU-12345"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Special instructions or tracking details"
            />
          </div>

          {variantInfo && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <div className="font-medium">{variantInfo.name}</div>
              <div>Available stock: {variantInfo.quantity}</div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              disabled={submitting || loadingBranches}
            >
              {submitting ? 'Transferring…' : 'Create Transfer'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

interface QuickSMSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuickSMSModal: React.FC<QuickSMSModalProps> = ({ isOpen, onClose }) => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPhone('');
    setMessage('');
    setError(null);
  }, [isOpen]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!phone.trim()) {
      setError('Enter recipient phone number.');
      return;
    }
    if (!message.trim()) {
      setError('Enter an SMS message.');
      return;
    }

    setSending(true);
    setError(null);
    try {
      // Use smart routing: WhatsApp first, SMS fallback
      const { smartNotificationService } = await import('../../../services/smartNotificationService');
      const result = await smartNotificationService.sendNotification(phone.trim(), message.trim());
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message.');
      }
      const method = result.method === 'whatsapp' ? 'WhatsApp' : 'SMS';
      toast.success(`${method} sent successfully`);
      onClose();
    } catch (err) {
      console.error('Quick SMS error:', err);
      const messageText = err instanceof Error ? err.message : 'Failed to send SMS.';
      setError(messageText);
      toast.error(messageText);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick SMS"
      maxWidth="sm"
    >
      <form className="space-y-4" onSubmit={handleSend}>
        <div>
          <label className="text-sm font-medium text-gray-700">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+255..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p className="mt-1 text-xs text-gray-500">Use international format with country code.</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Message</label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Write your SMS message..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Standard SMS length is 160 characters. Longer messages will be split automatically.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            disabled={sending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
            disabled={sending}
          >
            {sending ? 'Sending…' : 'Send SMS'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TopBar; 