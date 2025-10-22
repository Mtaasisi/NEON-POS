import React, { useState, useEffect, useRef } from 'react';
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
  MobileIcon,
  Maximize2,
  Minimize2,
  Search,
} from 'lucide-react';
import ActivityCounter from './ui/ActivityCounter';
import GlassButton from './ui/GlassButton';
import SearchDropdown from './SearchDropdown';
import CacheClearButton from '../../../components/CacheClearButton';
import SimpleBranchSelector from '../../../components/SimpleBranchSelector';
import QuickExpenseModal from '../../../components/QuickExpenseModal';
import QuickReminderModal from '../../../components/QuickReminderModal';
import { useGlobalSearchModal } from '../../../context/GlobalSearchContext';

interface TopBarProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
  isNavCollapsed: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuToggle, isMenuOpen, isNavCollapsed }) => {
  const { currentUser, logout } = useAuth();
  const { isDark } = useTheme();
  const { openSearch } = useGlobalSearchModal();
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [showQuickReminder, setShowQuickReminder] = useState(false);
  
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
    
    if (currentUser.role === 'admin') {
      actions.push(
        { label: 'Add Customer', icon: <Users size={16} />, action: () => navigate('/customers') },
        { label: 'Add Device', icon: <Smartphone size={16} />, action: () => navigate('/devices/new') },
        { label: 'Add Product', icon: <Plus size={16} />, action: () => navigate('/lats/add-product') },
        { label: 'Unified Inventory', icon: <Package size={16} />, action: () => navigate('/lats/unified-inventory') }
      );
    }
    
    if (currentUser.role === 'customer-care') {
      actions.push(
        { label: 'Add Device', icon: <Smartphone size={16} />, action: () => navigate('/devices/new') },
        { label: 'Add Customer', icon: <Users size={16} />, action: () => navigate('/customers') }
      );
    }
    
    if (currentUser.role === 'admin') {
      actions.push(
        { label: 'SMS Centre', icon: <MessageSquare size={16} />, action: () => navigate('/sms') }
      );
    }
    
    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <header className={`sticky top-0 z-20 transition-all duration-500 ${isNavCollapsed ? 'md:ml-[5.5rem]' : 'md:ml-72'}`}>
      {/* Main TopBar */}
      <div className={`topbar ${isDark ? 'bg-slate-900/90' : 'bg-white/80'} backdrop-blur-xl ${isDark ? 'border-slate-700/50' : 'border-white/30'} border-b shadow-lg`}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left Section - Menu Toggle & Back Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className={`p-2.5 rounded-lg ${isDark ? 'bg-slate-800/60 hover:bg-slate-700/60' : 'bg-white/30 hover:bg-white/50'} transition-all duration-300 backdrop-blur-sm md:hidden ${isDark ? 'border-slate-600' : 'border-white/30'} border shadow-sm`}
            >
              {isMenuOpen ? <X size={20} className={isDark ? 'text-gray-200' : 'text-gray-700'} /> : <Menu size={20} className={isDark ? 'text-gray-200' : 'text-gray-700'} />}
            </button>
            
            {/* Back Button */}
            <button
              onClick={handleBackClick}
              className={`p-2.5 rounded-lg ${isDark ? 'bg-slate-800/60 hover:bg-slate-700/60' : 'bg-white/30 hover:bg-white/50'} transition-all duration-300 backdrop-blur-sm ${isDark ? 'border-slate-600' : 'border-white/30'} border shadow-sm`}
              title={previousPage ? "Go Back" : "Go to Dashboard"}
            >
              <ArrowLeft size={18} className={isDark ? 'text-gray-200' : 'text-gray-700'} />
            </button>
          </div>

          {/* Center Section - Search & Action Buttons */}
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-4xl mx-4">
            {/* Search Button */}
            <button
              onClick={() => openSearch()}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                isDark 
                  ? 'bg-slate-800/60 hover:bg-slate-700/60 text-gray-300 border border-slate-700' 
                  : 'bg-white/60 hover:bg-white/80 text-gray-700 border border-gray-200'
              } cursor-pointer backdrop-blur-sm shadow-sm hover:shadow-md`}
              title="Search (⌘K)"
            >
              <Search size={20} />
            </button>

            {/* Action Buttons Group */}
            <div className="flex items-center gap-3">
              {/* Quick Expense Button - Admins only */}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setShowQuickExpense(true)}
                  className="flex items-center justify-center gap-2 px-5 py-3 min-w-[110px] rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-300 shadow-sm hover:shadow-md"
                  title="Quick Expense (⚡ Fast Entry)"
                >
                  <DollarSign size={18} />
                  <span className="hidden lg:inline font-medium">Expense</span>
                </button>
              )}

              {/* Quick Reminder Button - All roles */}
              <button
                onClick={() => setShowQuickReminder(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 min-w-[110px] rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-300 shadow-sm hover:shadow-md"
                title="Quick Reminder (⚡ Fast Entry)"
              >
                <Bell size={18} />
                <span className="hidden lg:inline font-medium">Reminder</span>
              </button>

              {/* Create Dropdown - Role-based */}
              {currentUser?.role !== 'technician' && (
                <div className="relative" ref={createDropdownRef}>
                  <button
                    onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                    className="flex items-center justify-center gap-2 px-5 py-3 min-w-[110px] rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <span className="font-medium">Create</span>
                    <ChevronDown size={18} className={`transition-transform duration-200 ${showCreateDropdown ? 'rotate-180' : ''}`} />
                  </button>
              
              {/* Create Dropdown Menu - Image Style */}
              {showCreateDropdown && (
                <div className={`absolute right-0 top-full mt-2 w-80 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-lg border z-50`}>
                  <div className="p-4 space-y-3">
                    {/* New Sale - Priority for Customer Care */}
                    <button
                      onClick={() => {
                        navigate('/pos');
                        setShowCreateDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg ${isDark ? 'hover:bg-emerald-900/30' : 'hover:bg-emerald-50'} transition-colors group`}
                    >
                      <div className="p-2 rounded-lg bg-emerald-500 text-white">
                        <ShoppingCart size={20} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>New Sale</p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Start POS transaction</p>
                      </div>
                    </button>
                    
                    {/* New Device */}
                    <button
                      onClick={() => {
                        navigate('/devices/new');
                        setShowCreateDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg ${isDark ? 'hover:bg-blue-900/30' : 'hover:bg-blue-50'} transition-colors group`}
                    >
                      <div className="p-2 rounded-lg bg-blue-500 text-white">
                        <Smartphone size={20} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>New Device</p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Add device for repair</p>
                      </div>
                    </button>
                    
                    {/* Add Customer */}
                    <button
                      onClick={() => {
                        navigate('/customers');
                        setShowCreateDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg ${isDark ? 'hover:bg-purple-900/30' : 'hover:bg-purple-50'} transition-colors group`}
                    >
                      <div className="p-2 rounded-lg bg-purple-500 text-white">
                        <Users size={20} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Customer</p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Register new customer</p>
                      </div>
                    </button>
                    
                    {/* Admin-only options */}
                    {currentUser.role === 'admin' && (
                      <>
                        {/* Quick Expense */}
                        <button
                          onClick={() => {
                            setShowQuickExpense(true);
                            setShowCreateDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-colors group border-2 border-red-100"
                        >
                          <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white">
                            <DollarSign size={20} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-gray-900">⚡ Quick Expense</p>
                            <p className="text-sm text-gray-600">Fast expense entry</p>
                          </div>
                        </button>
                        
                        {/* Add Product */}
                        <button
                          onClick={() => {
                            navigate('/lats/add-product');
                            setShowCreateDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-orange-500 text-white">
                            <Package size={20} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-gray-900">Add Product</p>
                            <p className="text-sm text-gray-600">Add new inventory item</p>
                          </div>
                        </button>
                      </>
                    )}
                    
                    {/* SMS Centre - Available for admin and customer-care */}
                    {(currentUser.role === 'admin' || currentUser.role === 'customer-care') && (
                      <button
                        onClick={() => {
                          navigate('/sms');
                          setShowCreateDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 transition-colors group"
                      >
                        <div className="p-2 rounded-lg bg-indigo-500 text-white">
                          <MessageSquare size={20} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">SMS Centre</p>
                          <p className="text-sm text-gray-600">Send messages to customers</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
          </div>

          {/* Technician Quick Actions */}
          {currentUser?.role === 'technician' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/lats/spare-parts')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <Package size={16} />
                <span className="font-medium">Spare Parts</span>
              </button>
            </div>
          )}

          {/* Navigation Icons - Clean & Essential Only */}
          {currentUser?.role !== 'technician' && (
            <div className="hidden lg:flex items-center gap-1">
              {/* POS System - Priority for Customer Care */}
              <div className="relative group">
                <button 
                  onClick={() => navigate('/pos')}
                  className={`p-3 rounded-lg transition-all duration-300 backdrop-blur-sm border shadow-sm hover:scale-110 ${
                    location.pathname.includes('/pos') 
                      ? 'bg-emerald-500 text-white border-emerald-400' 
                      : isDark
                        ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600'
                        : 'bg-white/30 hover:bg-white/50 border-white/30'
                  }`}
                  title="POS System"
                >
                  <ShoppingCart size={18} className={location.pathname.includes('/pos') ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-700'} />
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
                  className={`p-3 rounded-lg transition-all duration-300 backdrop-blur-sm border shadow-sm hover:scale-110 ${
                    location.pathname.includes('/customers') 
                      ? 'bg-purple-500 text-white border-purple-400' 
                      : isDark
                        ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600'
                        : 'bg-white/30 hover:bg-white/50 border-white/30'
                  }`}
                  title="Customers"
                >
                  <Users size={18} className={location.pathname.includes('/customers') ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-700'} />
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
                  className={`p-3 rounded-lg transition-all duration-300 backdrop-blur-sm border shadow-sm hover:scale-110 ${
                    location.pathname.includes('/devices') 
                      ? 'bg-blue-500 text-white border-blue-400' 
                      : isDark
                        ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600'
                        : 'bg-white/30 hover:bg-white/50 border-white/30'
                  }`}
                  title="Devices"
                >
                  <Smartphone size={18} className={location.pathname.includes('/devices') ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-700'} />
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
                  className={`p-3 rounded-lg transition-all duration-300 backdrop-blur-sm border shadow-sm hover:scale-110 relative ${
                    location.pathname.includes('/reminders') 
                      ? 'bg-yellow-500 text-white border-yellow-400' 
                      : isDark
                        ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600'
                        : 'bg-white/30 hover:bg-white/50 border-white/30'
                  }`}
                  title="Reminders"
                >
                  <Clock size={18} className={location.pathname.includes('/reminders') ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-700'} />
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
                      className={`p-3 rounded-lg transition-all duration-300 backdrop-blur-sm border shadow-sm hover:scale-110 ${
                        location.pathname.includes('/lats/unified-inventory') 
                          ? 'bg-orange-500 text-white border-orange-400' 
                          : isDark
                            ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600'
                            : 'bg-white/30 hover:bg-white/50 border-white/30'
                      }`}
                      title="Inventory"
                    >
                      <Warehouse size={18} className={location.pathname.includes('/lats/unified-inventory') ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-700'} />
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

          {/* Right Section - Status & Actions */}
          <div className="flex items-center gap-3">

            {/* Activity Pills - Real Counts Only */}
            <div className="hidden lg:flex items-center gap-4">
              {activityCounts.activeDevices > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 backdrop-blur-sm border border-blue-200 shadow-sm">
                  <Smartphone size={14} />
                  <span className="text-xs font-semibold">{formatNumber(activityCounts.activeDevices)}</span>
                </div>
              )}
              {activityCounts.overdueDevices > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-700 backdrop-blur-sm border border-red-200 shadow-sm">
                  <Clock size={14} />
                  <span className="text-xs font-semibold">{formatNumber(activityCounts.overdueDevices)}</span>
                </div>
              )}
              
              {/* Show customer count only for non-technicians */}
              {currentUser?.role !== 'technician' && activityCounts.newCustomers > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 backdrop-blur-sm border border-green-200 shadow-sm">
                  <Users size={14} />
                  <span className="text-xs font-semibold">{formatNumber(activityCounts.newCustomers)}</span>
                </div>
              )}
            </div>

            {/* Status Indicator */}
            <div className="hidden sm:flex items-center justify-center w-6 h-6">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className={`p-2.5 rounded-lg ${isDark ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600' : 'bg-white/30 hover:bg-white/50 border-white/30'} transition-all duration-300 backdrop-blur-sm border shadow-sm active:scale-95`}
              title={isFullscreen ? "Exit Fullscreen (ESC)" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 size={20} className={isDark ? 'text-gray-200' : 'text-gray-700'} />
              ) : (
                <Maximize2 size={20} className={isDark ? 'text-gray-200' : 'text-gray-700'} />
              )}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2.5 rounded-lg ${isDark ? 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-600' : 'bg-white/30 hover:bg-white/50 border-white/30'} transition-all duration-300 backdrop-blur-sm border relative shadow-sm`}
              >
                <Bell size={20} className={isDark ? 'text-gray-200' : 'text-gray-700'} />
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
          <div className={`mt-3 p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-lg border`}>
            <div className="space-y-3">
              {/* New Sale - Priority for Customer Care */}
              <button
                onClick={() => {
                  navigate('/pos');
                  setShowCreateDropdown(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg ${isDark ? 'hover:bg-emerald-900/30' : 'hover:bg-emerald-50'} transition-colors`}
              >
                <div className="p-2 rounded-lg bg-emerald-500 text-white">
                  <ShoppingCart size={20} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>New Sale</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Start POS transaction</p>
                </div>
              </button>
              
              <button
                onClick={() => {
                  navigate('/devices/new');
                  setShowCreateDropdown(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg ${isDark ? 'hover:bg-blue-900/30' : 'hover:bg-blue-50'} transition-colors`}
              >
                <div className="p-2 rounded-lg bg-blue-500 text-white">
                  <Smartphone size={20} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>New Device</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Add device for repair</p>
                </div>
              </button>
              
              <button
                onClick={() => {
                  navigate('/customers');
                  setShowCreateDropdown(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg ${isDark ? 'hover:bg-purple-900/30' : 'hover:bg-purple-50'} transition-colors`}
              >
                <div className="p-2 rounded-lg bg-purple-500 text-white">
                  <Users size={20} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Customer</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Register new customer</p>
                </div>
              </button>
              
              {/* Admin-only options */}
              {currentUser?.role === 'admin' && (
                <>
                  <button
                    onClick={() => {
                      navigate('/lats/add-product');
                      setShowCreateDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-orange-500 text-white">
                      <Package size={20} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">Add Product</p>
                      <p className="text-sm text-gray-600">Add new inventory item</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate('/sms');
                      setShowCreateDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-indigo-500 text-white">
                      <MessageSquare size={20} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">SMS Centre</p>
                      <p className="text-sm text-gray-600">Send messages to customers</p>
                    </div>
                  </button>
                </>
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
    </header>
  );
};

export default TopBar; 