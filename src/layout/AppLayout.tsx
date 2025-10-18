import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDevices } from '../context/DevicesContext';
import { useCustomers } from '../context/CustomersContext';
import { useBusinessInfo } from '../hooks/useBusinessInfo';
import { useTheme } from '../context/ThemeContext';

import AddCustomerModal from '../features/customers/components/forms/AddCustomerModal';
import TopBar from '../features/shared/components/TopBar';
import GlobalSearchShortcut from '../features/shared/components/GlobalSearchShortcut';

import ActivityCounter from '../features/shared/components/ui/ActivityCounter';
import {
  LayoutDashboard, 
  LogOut, 
  Smartphone, 
  Settings,
  Users,
  User, 
  ChevronRight as ChevronRightIcon,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  BarChart2,
  CreditCard,
  Stethoscope,
  Package,
  ShoppingCart,
  Calendar,
  Briefcase,
  UserCheck,
  Clock,
  Shield, 
  Wrench,
  Star,
  Phone,
  ArrowRightLeft,
  Bell
} from 'lucide-react';

import GlassButton from '../features/shared/components/ui/GlassButton';

const AppLayout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { isDark } = useTheme();
  
  // Safely access context hooks with error handling
  let devices: any[] = [];
  let customers: any[] = [];
  
  try {
    const devicesContext = useDevices();
    devices = devicesContext?.devices || [];
  } catch (error) {
    // Silently handle - context may not be available during HMR
    devices = [];
  }
  
  try {
    const customersContext = useCustomers();
    customers = customersContext?.customers || [];
  } catch (error) {
    // Silently handle - context may not be available during HMR
    customers = [];
  }
  
  // Get business info from settings
  const { businessInfo } = useBusinessInfo();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isHoveringUserMenu, setIsHoveringUserMenu] = useState(false);
  const [readItems, setReadItems] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('navReadItems');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Check if we're on the POS page
  const isOnPOSPage = location.pathname === '/pos';

  // Mark navigation item as read when visited
  const markAsRead = (path: string) => {
    setReadItems(prev => {
      const newSet = new Set([...prev, path]);
      localStorage.setItem('navReadItems', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  // Mark current page as read when location changes
  useEffect(() => {
    if (location.pathname) {
      markAsRead(location.pathname);
    }
  }, [location.pathname]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
        setIsHoveringUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Calculate activity counts
  const getActivityCounts = () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total devices
    const totalDevices = devices.length;

    // Active devices (not done or failed)
    const activeDevices = devices.filter(device => {
      return device.status !== 'done' && device.status !== 'failed';
    }).length;

    // Recent devices (last 24 hours)
    const recentDevices = devices.filter(device => {
      const deviceDate = new Date(device.createdAt || device.updatedAt);
      return deviceDate > oneDayAgo;
    }).length;

    // Overdue devices
    const overdueDevices = devices.filter(device => {
      if (device.status === 'done' || device.status === 'failed') return false;
      if (!device.expectedReturnDate) return false;
      const dueDate = new Date(device.expectedReturnDate);
      return dueDate < now;
    }).length;

    // Recent customers (last week)
    const recentCustomers = customers.filter(customer => {
      if (!customer.created_at) return false;
      const customerDate = new Date(customer.created_at);
      return customerDate > oneWeekAgo;
    }).length;

    // New customers (unread)
    const newCustomers = customers.filter(customer => {
      return customer.isRead === false || customer.isRead === undefined;
    }).length;

    return {
      totalDevices,
      activeDevices,
      recentDevices,
      overdueDevices,
      recentCustomers,
      newCustomers
    };
  };

  const activityCounts = getActivityCounts();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!currentUser) {
      localStorage.setItem('postLoginRedirect', location.pathname);
      navigate('/login');
    }
  }, [currentUser, location.pathname, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Early return if not authenticated
  if (!currentUser) {
    return null;
  }

  // Get unread count for an item
  const getUnreadCount = (path: string, count?: number) => {
    if (!count || count <= 0) return 0;
    return readItems.has(path) ? 0 : count;
  };

  const getNavItems = () => {
    // For technicians, only show repair-related navigation
    if (currentUser?.role === 'technician') {
      return [
        {
          path: '/dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard size={20} strokeWidth={1.5} />,
          roles: ['technician'],
          count: activityCounts.activeDevices
        },
        {
          path: '/devices',
          label: 'My Devices',
          icon: <Smartphone size={20} strokeWidth={1.5} />,
          roles: ['technician'],
          count: activityCounts.activeDevices + activityCounts.overdueDevices
        },
        {
          path: '/lats/spare-parts',
          label: 'Spare Parts',
          icon: <Package size={20} strokeWidth={1.5} />,
          roles: ['technician'],
          count: Math.floor(Math.random() * 2)
        },
      ];
    }

    const items = [
      // Main Dashboard
      {
        path: '/dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard size={20} strokeWidth={1.5} />,
        roles: ['admin', 'customer-care', 'technician'],
        count: activityCounts.activeDevices
      },

      // Core Operations
      {
        path: '/devices',
        label: 'Devices',
        icon: <Smartphone size={20} strokeWidth={1.5} />,
        roles: ['admin', 'customer-care', 'technician'],
        count: activityCounts.activeDevices + activityCounts.overdueDevices
      },
      {
        path: '/customers',
        label: 'Customers',
        icon: <Users size={20} strokeWidth={1.5} />,
        roles: ['admin', 'customer-care', 'technician'],
        count: activityCounts.newCustomers
      },
      {
        path: '/pos',
        label: 'POS System',
        icon: <ShoppingCart size={20} strokeWidth={1.5} />,
        roles: ['admin', 'customer-care'],
        count: 0
      },
      {
        path: '/appointments',
        label: 'Appointments',
        icon: <Calendar size={20} strokeWidth={1.5} />,
        roles: ['admin', 'customer-care', 'technician'],
        count: 0
      },
      {
        path: '/reminders',
        label: 'Reminders',
        icon: <Bell size={20} strokeWidth={1.5} />,
        roles: ['admin', 'customer-care', 'technician'],
        count: 0
      },
      {
        path: '/services',
        label: 'Services',
        icon: <Wrench size={20} strokeWidth={1.5} />,
        roles: ['admin'],
        count: 0
      },

      // Inventory & Stock
      {
        path: '/lats/unified-inventory',
        label: 'Inventory',
        icon: <Package size={20} strokeWidth={1.5} />,
        roles: ['admin'],
        count: 0
      },
      {
        path: '/lats/spare-parts',
        label: 'Spare Parts',
        icon: <Settings size={20} strokeWidth={1.5} />,
        roles: ['admin', 'technician'],
        count: 0
      },
      {
        path: '/lats/purchase-orders',
        label: 'Purchase Orders',
        icon: <ShoppingCart size={20} strokeWidth={1.5} />,
        roles: ['admin'],
        count: 0
      },
      {
        path: '/lats/stock-transfers',
        label: 'Stock Transfers',
        icon: <ArrowRightLeft size={20} strokeWidth={1.5} />,
        roles: ['admin'],
        count: 0
      },

      // People Management
      {
        path: '/employees',
        label: 'Employees',
        icon: <UserCheck size={20} strokeWidth={1.5} />,
        roles: ['admin', 'manager'],
        count: 0
      },

      // Diagnostics
      {
        path: '/diagnostics',
        label: 'Diagnostics',
        icon: <Stethoscope size={20} strokeWidth={1.5} />,
        roles: ['admin', 'customer-care', 'technician'],
        count: 0
      },

      // Business & Finance
      {
        path: '/lats/sales-reports',
        label: 'Sales Reports',
        icon: <BarChart2 size={20} strokeWidth={1.5} />,
        roles: ['admin'],
        count: 0
      },
      {
        path: '/payments',
        label: 'Payments',
        icon: <CreditCard size={20} strokeWidth={1.5} />,
        roles: ['admin'],
        count: 0
      },
      {
        path: '/lats/loyalty',
        label: 'Loyalty Program',
        icon: <Star size={20} strokeWidth={1.5} />,
        roles: ['admin'],
        count: 0
      },

      // Communication
      {
        path: '/lats/whatsapp-chat',
        label: 'WhatsApp',
        icon: <MessageCircle size={20} strokeWidth={1.5} />,
        roles: ['admin', 'customer-care'],
        count: 0
      },
      {
        path: '/sms',
        label: 'SMS',
        icon: <Phone size={20} strokeWidth={1.5} />,
        roles: ['admin', 'customer-care'],
        count: 0
      }
    ];

    return items.filter(item => item.roles.includes(currentUser.role));
  };

  const navItems = getNavItems();

  // If on POS page, render without TopBar and sidebar
  if (isOnPOSPage) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'transparent' }}>
        {/* Main Content - Full width for POS */}
        <main className="min-h-screen relative z-10 pt-0 pb-8">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'transparent' }}>
      <TopBar 
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        isMenuOpen={isMenuOpen}
        isNavCollapsed={isNavCollapsed}
      />
      
      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 bottom-0 left-0 z-40 w-64 md:w-72 
          ${isDark ? 'bg-slate-900/95' : 'bg-white/80'} backdrop-blur-xl 
          ${isDark ? 'border-slate-700/50' : 'border-white/30'} border-r shadow-xl
          transition-all duration-500 transform
          ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          ${isNavCollapsed ? 'md:w-[5.5rem]' : 'md:w-72'}
          sidebar-hover sidebar-bg
        `}
        onMouseEnter={() => {
          if (window.innerWidth >= 768 && isNavCollapsed) setIsNavCollapsed(false);
        }}
        onMouseLeave={() => {
          if (window.innerWidth >= 768 && !isNavCollapsed) setIsNavCollapsed(true);
        }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`
            p-6 ${isDark ? 'border-slate-700/50' : 'border-white/20'} border-b flex items-center 
            ${isDark ? 'bg-slate-900/40' : 'bg-white/20'}
            ${isNavCollapsed ? 'justify-center' : ''}
          `}>
            <div className="flex items-center gap-3 w-full">
              {/* Business Logo or Default Icon */}
              {businessInfo?.logo ? (
                <div className="relative">
                  <div className={`rounded-full bg-white shadow-lg overflow-hidden flex items-center justify-center ${isNavCollapsed ? 'w-10 h-10' : 'w-12 h-12'}`}>
                    <img 
                      src={businessInfo.logo} 
                      alt={businessInfo.name || 'Business Logo'} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className={`p-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg ${isNavCollapsed ? 'w-10 h-10' : ''}`}>
                  <Smartphone className={`h-6 w-6 ${isNavCollapsed ? 'scale-90' : ''}`} strokeWidth={1.5} />
                </div>
              )}
              
              {/* Business Name and Info */}
              <div className={`transition-opacity duration-300 ${isNavCollapsed ? 'md:hidden' : ''} min-w-0 flex-1`}>
                <h1 className={`font-bold text-xl truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {businessInfo?.name || 'My Store'}
                </h1>
                {businessInfo?.address && (
                  <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{businessInfo.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 ${isNavCollapsed ? 'p-2 scrollbar-hide' : 'p-4 sidebar-scrollbar'} overflow-y-auto`}>
            <ul className="space-y-1">
              {navItems.map(item => (
                <li key={item.path}>
                  <div className="relative group">
                    <Link
                      to={item.path}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300
                        ${isNavCollapsed ? 'justify-center' : ''}
                        ${location.pathname === item.path
                          ? isDark 
                            ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 font-medium shadow-sm backdrop-blur-sm border border-blue-500/30'
                            : 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 font-medium shadow-sm backdrop-blur-sm border border-blue-200/30'
                          : isDark
                            ? 'text-gray-300 hover:bg-slate-800/60 hover:text-white'
                            : 'text-gray-700 hover:bg-white/40 hover:text-gray-900'
                        }
                      `}
                      onClick={() => {
                        setIsMenuOpen(false);
                        markAsRead(item.path);
                      }}
                    >
                    <span className={`
                      ${location.pathname === item.path 
                        ? isDark ? 'text-blue-400' : 'text-blue-600' 
                        : isDark ? 'text-gray-400' : 'text-blue-500'
                      }
                      ${isNavCollapsed ? 'w-8 h-8 flex items-center justify-center' : ''}
                      relative
                    `}>
                      {item.icon}
                      
                      {/* Activity Counter - Compact mode for collapsed sidebar */}
                      {getUnreadCount(item.path, item.count) > 0 && isNavCollapsed && (
                        <ActivityCounter 
                          count={getUnreadCount(item.path, item.count)} 
                          compact={true}
                        />
                      )}

                    </span>
                    <span className={`transition-opacity duration-300 ${isNavCollapsed ? 'md:hidden' : ''} flex-1`}>
                      {item.label}
                    </span>
                    
                    {/* Activity Counter - Normal mode for expanded sidebar */}
                    {getUnreadCount(item.path, item.count) > 0 && !isNavCollapsed && (
                      <ActivityCounter 
                        count={getUnreadCount(item.path, item.count)} 
                        className={`${isNavCollapsed ? 'md:hidden' : ''}`}
                      />
                    )}
                    
                      {location.pathname === item.path && (
                        <ChevronRightIcon size={16} strokeWidth={1.5} className={`
                          ml-auto ${isDark ? 'text-blue-400' : 'text-blue-500'}
                          ${isNavCollapsed ? 'md:hidden' : ''}
                        `} />
                      )}
                    </Link>
                    
                    {/* Hover tooltip - only show when sidebar is collapsed */}
                    {isNavCollapsed && (
                      <div className={`absolute left-full ml-2 top-1/2 transform -translate-y-1/2 px-3 py-2 
                        ${isDark ? 'bg-slate-800/95 border-slate-600/50 text-gray-200' : 'bg-white/95 border-gray-200/50 text-gray-700'} 
                        backdrop-blur-sm border text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50`}>
                        {item.label}
                        <div className={`absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent 
                          ${isDark ? 'border-r-slate-800/95' : 'border-r-white/95'}`}></div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* User Profile & Logout */}
          <div className={`${isNavCollapsed ? 'p-2' : 'p-4'} ${isDark ? 'border-slate-700/50' : 'border-white/20'} border-t relative`} ref={userMenuRef}>
            <div className={`
              flex items-center gap-3 p-2 rounded-lg
              ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-100 to-gray-50'}
              backdrop-blur-sm mb-4 
              ${isNavCollapsed ? 'justify-center' : ''}
            `}>
              <div className="p-2 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                <User size={20} strokeWidth={1.5} />
              </div>
              <div className={`transition-opacity duration-300 ${isNavCollapsed ? 'md:hidden' : ''} min-w-0 flex-1`}>
                <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentUser.name}</p>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                    setIsHoveringUserMenu(false);
                  }}
                  onMouseEnter={() => !showUserMenu && setIsHoveringUserMenu(true)}
                  onMouseLeave={() => setIsHoveringUserMenu(false)}
                  className={`flex items-center gap-1 w-full text-left text-sm capitalize ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'} cursor-pointer transition-colors`}
                >
                  <span className="truncate">{currentUser.role.replace('-', ' ')}</span>
                  {showUserMenu ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {/* Minimized Hover Preview */}
            {isHoveringUserMenu && !showUserMenu && !isNavCollapsed && (
              <div 
                className={`
                  absolute bottom-full left-0 right-0 mb-2 mx-4
                  ${isDark 
                    ? 'bg-gradient-to-br from-slate-800/95 to-slate-900/95' 
                    : 'bg-gradient-to-br from-white/95 to-gray-50/95'
                  }
                  backdrop-blur-xl rounded-lg shadow-xl border
                  ${isDark ? 'border-slate-700/50' : 'border-white/20'}
                  overflow-hidden
                  animate-in fade-in duration-150
                  p-3
                `}
                style={{ zIndex: 9999 }}
                onMouseEnter={() => setIsHoveringUserMenu(true)}
                onMouseLeave={() => setIsHoveringUserMenu(false)}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Click to view menu
                  </p>
                  <div className="flex gap-2">
                    <Settings size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} strokeWidth={1.5} />
                    {currentUser.role === 'admin' && (
                      <Users size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} strokeWidth={1.5} />
                    )}
                    <User size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            )}

            {/* Minimized Hover Preview for Collapsed Sidebar */}
            {isHoveringUserMenu && !showUserMenu && isNavCollapsed && (
              <div 
                className={`
                  absolute bottom-full left-full ml-2 mb-2
                  ${isDark 
                    ? 'bg-gradient-to-br from-slate-800/95 to-slate-900/95' 
                    : 'bg-gradient-to-br from-white/95 to-gray-50/95'
                  }
                  backdrop-blur-xl rounded-lg shadow-xl border
                  ${isDark ? 'border-slate-700/50' : 'border-white/20'}
                  overflow-hidden
                  animate-in fade-in duration-150
                  px-3 py-2 flex gap-2
                `}
                style={{ zIndex: 9999 }}
                onMouseEnter={() => setIsHoveringUserMenu(true)}
                onMouseLeave={() => setIsHoveringUserMenu(false)}
              >
                <Settings size={14} className={isDark ? 'text-gray-400' : 'text-gray-500'} strokeWidth={1.5} />
                {currentUser.role === 'admin' && (
                  <Users size={14} className={isDark ? 'text-gray-400' : 'text-gray-500'} strokeWidth={1.5} />
                )}
                <User size={14} className={isDark ? 'text-gray-400' : 'text-gray-500'} strokeWidth={1.5} />
              </div>
            )}

            {/* Compact Dropdown for Collapsed Sidebar */}
            {showUserMenu && isNavCollapsed && (
              <div 
                className={`
                  absolute bottom-full left-full ml-2 mb-2
                  ${isDark 
                    ? 'bg-gradient-to-br from-slate-800/95 to-slate-900/95' 
                    : 'bg-gradient-to-br from-white/95 to-gray-50/95'
                  }
                  backdrop-blur-xl rounded-xl shadow-2xl border
                  ${isDark ? 'border-slate-700/50' : 'border-white/20'}
                  overflow-hidden
                  animate-in slide-in-from-left-2 fade-in duration-200
                  w-48
                `}
                style={{ zIndex: 9999 }}
              >
                <div className="py-2 px-2">
                  <button
                    onClick={() => {
                      navigate('/admin-settings');
                      setShowUserMenu(false);
                    }}
                    className={`
                      w-full px-3 py-2 text-left text-sm rounded-lg
                      ${isDark 
                        ? 'text-gray-300 hover:bg-slate-700/50 hover:text-white' 
                        : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                      }
                      transition-all duration-200 flex items-center gap-3
                    `}
                  >
                    <Settings size={16} strokeWidth={1.5} />
                    <span>Settings</span>
                  </button>

                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => {
                        navigate('/users');
                        setShowUserMenu(false);
                      }}
                      className={`
                        w-full px-3 py-2 text-left text-sm rounded-lg
                        ${isDark 
                          ? 'text-gray-300 hover:bg-slate-700/50 hover:text-white' 
                          : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                        }
                        transition-all duration-200 flex items-center gap-3
                      `}
                    >
                      <Users size={16} strokeWidth={1.5} />
                      <span>Users</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      alert(`Name: ${currentUser.name}\nRole: ${currentUser.role}\nEmail: ${currentUser.email || 'N/A'}\nID: ${currentUser.id}`);
                      setShowUserMenu(false);
                    }}
                    className={`
                      w-full px-3 py-2 text-left text-sm rounded-lg
                      ${isDark 
                        ? 'text-gray-300 hover:bg-slate-700/50 hover:text-white' 
                        : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                      }
                      transition-all duration-200 flex items-center gap-3
                    `}
                  >
                    <User size={16} strokeWidth={1.5} />
                    <span>Info</span>
                  </button>
                </div>
              </div>
            )}

            {/* User Dropdown Menu */}
            {showUserMenu && !isNavCollapsed && (
              <div 
                className={`
                  absolute bottom-full left-0 right-0 mb-2 mx-4
                  ${isDark 
                    ? 'bg-gradient-to-br from-slate-800/95 to-slate-900/95' 
                    : 'bg-gradient-to-br from-white/95 to-gray-50/95'
                  }
                  backdrop-blur-xl rounded-xl shadow-2xl border
                  ${isDark ? 'border-slate-700/50' : 'border-white/20'}
                  overflow-hidden
                  animate-in slide-in-from-bottom-2 fade-in duration-200
                `}
                style={{ zIndex: 9999 }}
              >
                {/* Header with gradient background */}
                <div className={`
                  p-4 
                  ${isDark 
                    ? 'bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-b border-slate-700/50' 
                    : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-b border-gray-200/50'
                  }
                `}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                      <User size={16} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {currentUser.name}
                      </p>
                      <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {currentUser.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  <div className={`
                    mt-2 px-2 py-1 rounded-md inline-block text-xs font-medium capitalize
                    ${isDark 
                      ? 'bg-slate-800/50 text-indigo-400' 
                      : 'bg-white/50 text-indigo-600'
                    }
                  `}>
                    {currentUser.role.replace('-', ' ')}
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2 px-2">
                  <button
                    onClick={() => {
                      navigate('/admin-settings');
                      setShowUserMenu(false);
                    }}
                    className={`
                      w-full px-3 py-2.5 text-left text-sm rounded-lg
                      ${isDark 
                        ? 'text-gray-300 hover:bg-slate-700/50 hover:text-white' 
                        : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                      }
                      transition-all duration-200 flex items-center gap-3
                      group
                    `}
                  >
                    <div className={`
                      p-1.5 rounded-md
                      ${isDark ? 'bg-slate-700/50 group-hover:bg-indigo-600' : 'bg-gray-100 group-hover:bg-indigo-600'}
                      transition-colors duration-200
                    `}>
                      <Settings size={14} className="group-hover:text-white" strokeWidth={1.5} />
                    </div>
                    <span className="font-medium">Settings</span>
                  </button>

                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => {
                        navigate('/users');
                        setShowUserMenu(false);
                      }}
                      className={`
                        w-full px-3 py-2.5 text-left text-sm rounded-lg
                        ${isDark 
                          ? 'text-gray-300 hover:bg-slate-700/50 hover:text-white' 
                          : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                        }
                        transition-all duration-200 flex items-center gap-3
                        group
                      `}
                    >
                      <div className={`
                        p-1.5 rounded-md
                        ${isDark ? 'bg-slate-700/50 group-hover:bg-purple-600' : 'bg-gray-100 group-hover:bg-purple-600'}
                        transition-colors duration-200
                      `}>
                        <Users size={14} className="group-hover:text-white" strokeWidth={1.5} />
                      </div>
                      <span className="font-medium">User Management</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      alert(`Name: ${currentUser.name}\nRole: ${currentUser.role}\nEmail: ${currentUser.email || 'N/A'}\nID: ${currentUser.id}`);
                      setShowUserMenu(false);
                    }}
                    className={`
                      w-full px-3 py-2.5 text-left text-sm rounded-lg
                      ${isDark 
                        ? 'text-gray-300 hover:bg-slate-700/50 hover:text-white' 
                        : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                      }
                      transition-all duration-200 flex items-center gap-3
                      group
                    `}
                  >
                    <div className={`
                      p-1.5 rounded-md
                      ${isDark ? 'bg-slate-700/50 group-hover:bg-blue-600' : 'bg-gray-100 group-hover:bg-blue-600'}
                      transition-colors duration-200
                    `}>
                      <User size={14} className="group-hover:text-white" strokeWidth={1.5} />
                    </div>
                    <span className="font-medium">Account Info</span>
                  </button>
                </div>
              </div>
            )}
            
            
            <GlassButton
              onClick={handleLogout} 
              variant="danger"
              className={`w-full ${isNavCollapsed ? 'justify-center px-0' : 'justify-start'}`}
            >
              <LogOut size={18} strokeWidth={1.5} />
              <span className={`transition-opacity duration-300 ${isNavCollapsed ? 'md:hidden' : ''}`}>
                Logout
              </span>
            </GlassButton>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <main className={`transition-all duration-500 min-h-screen relative z-10 pt-0 pb-8 ${isNavCollapsed ? 'md:ml-[5.5rem]' : 'md:ml-72'}`}>
        <Outlet />

        {/* Only show modals for users with permissions */}
        {(currentUser.role === 'admin' || currentUser.role === 'customer-care') && (
          <>
            <AddCustomerModal
              isOpen={showAddCustomer}
              onClose={() => setShowAddCustomer(false)}
            />
          </>
        )}
        
        {/* Global Search Shortcut */}
        <GlobalSearchShortcut />

      </main>
    </div>
  );
};

export default AppLayout;