import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { rbacManager, type UserRole } from '../../lib/rbac';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';
import {
  ShoppingCart,
  CreditCard,
  Trash2,
  Users,
  Scan,
  DollarSign,
  BarChart3,
  LogOut,
  User,
  FileText,
  RefreshCw,
  Maximize2,
  Minimize2,
  Lock,
  Home,
  Settings,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface POSTopBarProps {
  cartItemsCount: number;
  totalAmount: number;
  onProcessPayment: () => void;
  onClearCart: () => void;
  onScanQrCode: () => void;
  onAddCustomer: () => void;
  onViewReceipts: () => void;
  onViewSales: () => void;
  onOpenPaymentTracking: () => void;
  onOpenDrafts: () => void;
  isProcessingPayment: boolean;
  hasSelectedCustomer: boolean;
  draftCount?: number;
  todaysSales?: number;
  isDailyClosed?: boolean;
  onCloseDay?: () => void;
  canCloseDay?: boolean;
  // Bottom bar actions
  onViewAnalytics?: () => void;
  onPaymentTracking?: () => void;
  onCustomers?: () => void;
  onReports?: () => void;
  onRefreshData?: () => void;
  onSettings?: () => void;
}

const POSTopBar: React.FC<POSTopBarProps> = ({
  cartItemsCount,
  totalAmount,
  onProcessPayment,
  onClearCart,
  onScanQrCode,
  onAddCustomer,
  onViewReceipts,
  onViewSales,
  onOpenPaymentTracking,
  onOpenDrafts,
  isProcessingPayment,
  hasSelectedCustomer,
  draftCount = 0,
  todaysSales = 0,
  isDailyClosed = false,
  onCloseDay,
  canCloseDay = false,
  // Bottom bar actions
  onViewAnalytics,
  onPaymentTracking,
  onCustomers,
  onReports,
  onRefreshData,
  onSettings,
}) => {
  const { currentUser, logout } = useAuth();
  const { playPaymentSound, playDeleteSound, playClickSound } = usePOSClickSounds();

  const handleProcessPayment = () => {
    playPaymentSound();
    onProcessPayment();
  };

  const handleClearCart = () => {
    playDeleteSound();
    onClearCart();
  };
  const navigate = useNavigate();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>(() => {
    // Get saved preference from localStorage
    const saved = localStorage.getItem('pos_view_mode');
    return (saved === 'mobile' || saved === 'desktop') ? saved : 'desktop';
  });

  // Permission checks for current user
  const userRole = currentUser?.role as UserRole;
  const canViewReports = rbacManager.can(userRole, 'reports', 'view');
  const canAccessSettings = rbacManager.can(userRole, 'settings', 'view');

  // Handle fullscreen change events
  React.useEffect(() => {
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

  // Apply view mode to document body for CSS targeting
  React.useEffect(() => {
    document.body.setAttribute('data-view-mode', viewMode);
    console.log(`📱 View mode set to: ${viewMode}`);
  }, [viewMode]);

  // Format money
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExitToDashboard = () => {
    navigate('/dashboard');
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
        playClickSound();
        toast.success('Entered fullscreen mode');
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
        playClickSound();
        toast.success('Exited fullscreen mode');
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      toast.error('Failed to toggle fullscreen');
    }
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'desktop' ? 'mobile' : 'desktop';
    setViewMode(newMode);
    localStorage.setItem('pos_view_mode', newMode);
    playClickSound();
    toast.success(`Switched to ${newMode} view`, {
      icon: newMode === 'mobile' ? '📱' : '🖥️',
      duration: 2000,
    });
    
    // Trigger custom event to notify other components
    window.dispatchEvent(new Event('viewModeChanged'));
    
    // Trigger a window resize event to help responsive components update
    window.dispatchEvent(new Event('resize'));
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="px-3 py-2 sm:px-6 sm:py-4">
        {/* Main Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Customer Care POS</h1>
              {isDailyClosed && (
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium">
                  <Lock size={12} />
                  <span>Day Closed</span>
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Desktop Point of Sale System</p>
          </div>

          {/* Current Time & Date */}
          <div className="text-right">
            <div className="text-sm sm:text-lg font-semibold text-gray-900">
              {new Date().toLocaleTimeString('en-TZ', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 hidden sm:block">
              {new Date().toLocaleDateString('en-TZ', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div className="text-xs text-gray-600 sm:hidden">
              {new Date().toLocaleDateString('en-TZ', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          {/* Left Section - Essential Actions */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
            {/* Essential Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => {
                  playClickSound();
                  onScanQrCode();
                }}
                className="flex items-center gap-1 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 bg-green-50 text-green-700 rounded-lg active:bg-green-100 transition-all duration-200 border border-green-200 shadow-sm touch-target"
              >
                <Scan size={16} className="sm:hidden" />
                <Scan size={18} className="hidden sm:block" />
                <span className="text-xs sm:text-sm font-medium">Scan</span>
              </button>

              {(currentUser.role === 'admin' || currentUser.role === 'customer-care') && (
                <button
                  onClick={() => {
                    playClickSound();
                    onAddCustomer();
                  }}
                  className="flex items-center gap-1 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 bg-blue-50 text-blue-700 rounded-lg active:bg-blue-100 transition-all duration-200 border border-blue-200 shadow-sm touch-target"
                >
                  <Users size={16} className="sm:hidden" />
                  <Users size={18} className="hidden sm:block" />
                  <span className="text-xs sm:text-sm font-medium">Add Customer</span>
                </button>
              )}
            </div>
          </div>

          {/* Center Section - Today's Sales */}
          <div className="flex items-center justify-center w-full sm:w-auto">
            <button
              onClick={() => {
                playClickSound();
                onViewSales();
              }}
              className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all duration-200 border border-blue-200 shadow-sm hover:shadow-md min-h-[44px] min-w-[44px]"
              title="View Sales Report"
            >
              {/* Sales Info */}
              <span className="text-sm font-medium">{formatMoney(todaysSales)}</span>
            </button>
          </div>

          {/* Right Section - All Actions */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
            {/* Mobile: Show only essential buttons */}
            <div className="flex items-center gap-2 sm:hidden">
              {/* Payment Processing - Show when cart has items */}
              {cartItemsCount > 0 && (
                <button
                  onClick={handleProcessPayment}
                  disabled={isProcessingPayment}
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-lg active:bg-emerald-600 disabled:bg-gray-400 transition-all duration-200 font-semibold shadow-md touch-target"
                >
                  <CreditCard size={16} />
                  <span className="text-xs font-medium">{isProcessingPayment ? 'Processing...' : 'Pay'}</span>
                </button>
              )}

              {/* Clear Cart - Show when cart has items */}
              {cartItemsCount > 0 && (
                <button
                  onClick={handleClearCart}
                  className="flex items-center gap-1 px-2 py-2 bg-red-50 text-red-700 rounded-lg active:bg-red-100 transition-all duration-200 border border-red-200 shadow-sm touch-target"
                  title="Clear Cart"
                >
                  <Trash2 size={16} />
                  <span className="text-xs font-medium">Clear</span>
                </button>
              )}

              {/* Daily Close Button - Mobile - Show when available and day is not closed */}
              {onCloseDay && canCloseDay && !isDailyClosed && (
                <button
                  onClick={() => {
                    playClickSound();
                    onCloseDay();
                  }}
                  className="flex items-center gap-1 px-2 py-2 bg-red-500 text-white rounded-lg active:bg-red-600 transition-all duration-200 font-semibold shadow-md touch-target"
                  title="Close Daily Sales"
                >
                  <Lock size={16} />
                  <span className="text-xs font-medium">Close</span>
                </button>
              )}
            </div>

            {/* Desktop: Show all buttons */}
            <div className="hidden sm:flex items-center gap-3">

              {/* Payment Tracking Button - Show when available */}
              {onPaymentTracking && (
                <button
                  onClick={() => {
                    playClickSound();
                    onPaymentTracking?.();
                  }}
                  className="flex items-center gap-3 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-all duration-200 border border-emerald-200 shadow-sm hover:shadow-md min-h-[44px] min-w-[44px]"
                  title="Payment Tracking"
                >
                  <FileText size={18} />
                  <span className="text-sm font-medium">Payments</span>
                </button>
              )}



              {/* Daily Close Button - Show when available and day is not closed */}
              {onCloseDay && canCloseDay && !isDailyClosed && (
                <button
                  onClick={() => {
                    playClickSound();
                    onCloseDay();
                  }}
                  className="flex items-center gap-3 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 font-semibold shadow-md min-h-[44px] min-w-[44px]"
                  title="Close Daily Sales"
                >
                  <Lock size={18} />
                  <span className="text-sm font-medium">Close Day</span>
                </button>
              )}

              {/* Payment Processing - Show when cart has items */}
              {cartItemsCount > 0 && (
                <button
                  onClick={handleProcessPayment}
                  disabled={isProcessingPayment || !hasSelectedCustomer}
                  className="flex items-center gap-3 px-5 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-gray-400 transition-all duration-200 font-semibold shadow-md min-h-[44px] min-w-[44px]"
                  title={!hasSelectedCustomer ? "Please select a customer first" : isProcessingPayment ? "Processing payment..." : "Process payment"}
                >
                  <CreditCard size={18} />
                  <span className="text-sm font-medium">{isProcessingPayment ? 'Processing...' : 'Pay'}</span>
                </button>
              )}

              {/* Clear Cart - Show when cart has items */}
              {cartItemsCount > 0 && (
                <button
                  onClick={handleClearCart}
                  className="flex items-center gap-3 px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all duration-200 border border-red-200 shadow-sm min-h-[44px] min-w-[44px]"
                  title="Clear Cart"
                >
                  <Trash2 size={18} />
                  <span className="text-sm font-medium">Clear</span>
                </button>
              )}
            </div>

            {/* System Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Exit to Dashboard Button */}
              <button
                onClick={() => {
                  playClickSound();
                  handleExitToDashboard();
                }}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 shadow-sm touch-target"
                title="Exit to Dashboard"
              >
                <Home size={16} className="sm:hidden" />
                <Home size={18} className="hidden sm:block" />
                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Exit</span>
              </button>

              {/* Settings - Show only for admin users */}
              {onSettings && currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    playClickSound();
                    onSettings();
                  }}
                  className="p-2 sm:p-3 text-gray-600 active:text-gray-800 active:bg-gray-100 rounded-lg transition-all duration-200 shadow-sm touch-target flex items-center justify-center"
                  title="POS Settings"
                >
                  <Settings size={16} className="sm:hidden" />
                  <Settings size={18} className="hidden sm:block" />
                </button>
              )}

              {/* Refresh Data - Show when available */}
              {onRefreshData && (
                <button
                  onClick={() => {
                    playClickSound();
                    onRefreshData();
                  }}
                  className="p-2 sm:p-3 text-gray-600 active:text-gray-800 active:bg-gray-100 rounded-lg transition-all duration-200 shadow-sm touch-target flex items-center justify-center"
                  title="Refresh Data"
                >
                  <RefreshCw size={16} className="sm:hidden" />
                  <RefreshCw size={18} className="hidden sm:block" />
                </button>
              )}

              {/* View Mode Toggle */}
              <button
                onClick={toggleViewMode}
                className={`p-2 sm:p-3 rounded-lg transition-all duration-200 active:scale-95 shadow-sm touch-target flex items-center justify-center ${
                  viewMode === 'mobile' 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={viewMode === 'mobile' ? "Switch to Desktop View" : "Switch to Mobile View"}
              >
                {viewMode === 'mobile' ? (
                  <>
                    <Smartphone size={16} className="sm:hidden" />
                    <Smartphone size={18} className="hidden sm:block" />
                  </>
                ) : (
                  <>
                    <Monitor size={16} className="sm:hidden" />
                    <Monitor size={18} className="hidden sm:block" />
                  </>
                )}
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="hidden sm:flex p-3 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-all duration-200 shadow-soft min-h-[44px] min-w-[44px] items-center justify-center"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 size={18} />
                ) : (
                  <Maximize2 size={18} />
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

export default POSTopBar;