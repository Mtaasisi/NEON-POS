import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { rbacManager, type UserRole } from '../../lib/rbac';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';
import { useGlobalSearchModal } from '../../../../context/GlobalSearchContext';
import {
  ShoppingCart,
  CreditCard,
  Trash2,
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
  Calendar,
  Search,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface POSTopBarProps {
  cartItemsCount: number;
  totalAmount: number;
  onProcessPayment: () => void;
  onClearCart: () => void;
  onPreviewInvoice?: () => void;
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
  onCustomers?: () => void;
  onReports?: () => void;
  onRefreshData?: () => void;
  onSettings?: () => void;
  onOpenInstallments?: () => void;
  onOpenExpense?: () => void;
}

const POSTopBar: React.FC<POSTopBarProps> = ({
  cartItemsCount,
  totalAmount,
  onProcessPayment,
  onClearCart,
  onPreviewInvoice,
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
  onCustomers,
  onReports,
  onRefreshData,
  onSettings,
  onOpenInstallments,
  onOpenExpense,
}) => {
  const { currentUser, logout } = useAuth();
  const { playPaymentSound, playDeleteSound, playClickSound } = usePOSClickSounds();
  const { openSearch } = useGlobalSearchModal();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

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
      <div className="px-4 sm:px-6 py-2.5 sm:py-3">
        {/* Single Row Layout */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Title + Quick Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold text-gray-900">POS</h1>
              {isDailyClosed && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                  <Lock size={12} />
                  <span className="hidden lg:inline">Closed</span>
                </div>
              )}
            </div>
          </div>

          {/* Center: Time + Sales + Search */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 min-h-[44px] flex items-center">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">
                  {currentTime.toLocaleTimeString('en-TZ', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                <div className="text-xs text-gray-600">
                  {currentTime.toLocaleDateString('en-TZ', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                playClickSound();
                onViewSales();
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 min-w-[110px] rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-300 shadow-sm hover:shadow-md"
              title="View Sales Report"
            >
              <DollarSign size={18} />
              <span className="text-sm font-medium">{formatMoney(todaysSales)}</span>
            </button>

            {/* Global Search Button */}
            <button
              onClick={() => {
                playClickSound();
                openSearch();
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200 shadow-sm hover:shadow-md min-h-[44px]"
              title="Global Search (⌘K)"
            >
              <Search size={18} />
              <span className="text-sm font-medium hidden xl:inline">Search</span>
            </button>

            {/* Quick Expense Button - Admins only */}
            {onOpenExpense && currentUser?.role === 'admin' && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenExpense();
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-200 shadow-sm hover:shadow-md min-h-[44px]"
                title="Quick Expense (⚡ Fast Entry)"
              >
                <DollarSign size={18} />
                <span className="text-sm font-medium hidden xl:inline">Expense</span>
              </button>
            )}
          </div>

          {/* Right: Action Buttons + System Controls */}
          <div className="flex items-center gap-2">
            {/* Cart Actions - Show when cart has items */}
              {cartItemsCount > 0 && (
              <div className="flex items-center gap-2">
                {onPreviewInvoice && (
                  <button
                    onClick={onPreviewInvoice}
                    disabled={!hasSelectedCustomer}
                    className="flex items-center justify-center gap-2 px-4 py-3 min-w-[100px] rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 text-white transition-all duration-300 shadow-sm hover:shadow-md"
                    title={!hasSelectedCustomer ? "Please select a customer first" : "Preview invoice with current prices"}
                  >
                    <FileText size={18} />
                    <span className="hidden md:inline text-sm font-medium">Invoice</span>
                    <span className="md:hidden text-xs font-medium">Inv</span>
                  </button>
                )}
                
                <button
                  onClick={handleProcessPayment}
                  disabled={isProcessingPayment || !hasSelectedCustomer}
                  className="flex items-center justify-center gap-2 px-5 py-3 min-w-[110px] rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white transition-all duration-300 shadow-sm hover:shadow-md"
                  title={!hasSelectedCustomer ? "Please select a customer first" : isProcessingPayment ? "Processing payment..." : "Process payment"}
                >
                  <CreditCard size={18} />
                  <span className="hidden md:inline text-sm font-medium">{isProcessingPayment ? 'Processing...' : 'Pay'}</span>
                  <span className="md:hidden text-xs font-medium">{isProcessingPayment ? '...' : 'Pay'}</span>
                </button>

                <button
                  onClick={handleClearCart}
                  className="flex items-center justify-center gap-2 px-5 py-3 min-w-[110px] rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white transition-all duration-300 shadow-sm hover:shadow-md"
                  title="Clear Cart"
                >
                  <Trash2 size={18} />
                  <span className="hidden md:inline text-sm font-medium">Clear</span>
                </button>
              </div>
            )}

            {/* Primary Actions */}
            <div className="hidden md:flex items-center gap-2">
              {onOpenInstallments && (
                <button
                  onClick={() => {
                    playClickSound();
                    onOpenInstallments();
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                  title="Installment Plans"
                >
                  <Calendar size={18} />
                  <span className="hidden lg:inline">Installments</span>
                </button>
              )}

              {onCloseDay && canCloseDay && !isDailyClosed && (
                <button
                  onClick={() => {
                    playClickSound();
                    onCloseDay();
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-3 min-w-[110px] rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-300 shadow-sm hover:shadow-md"
                  title="Close Daily Sales"
                >
                  <Lock size={18} />
                  <span className="text-sm font-medium">Close Day</span>
                </button>
              )}
            </div>

            {/* Global Search Button - Mobile/Tablet */}
            <button
              onClick={() => {
                playClickSound();
                openSearch();
              }}
              className="lg:hidden flex items-center justify-center p-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 shadow-sm min-h-[40px] min-w-[40px]"
              title="Global Search"
            >
              <Search size={18} />
            </button>

            {/* Divider */}
            <div className="hidden md:block h-8 w-px bg-gray-300 mx-1"></div>

            {/* System Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  playClickSound();
                  handleExitToDashboard();
                }}
                className="p-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 shadow-sm min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Exit to Dashboard"
              >
                <Home size={18} />
              </button>

              {onSettings && currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    playClickSound();
                    onSettings();
                  }}
                  className="hidden md:flex p-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 shadow-sm min-h-[40px] min-w-[40px] items-center justify-center"
                  title="POS Settings"
                >
                  <Settings size={18} />
                </button>
              )}

              {onRefreshData && (
                <button
                  onClick={() => {
                    playClickSound();
                    onRefreshData();
                  }}
                  className="hidden md:flex p-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 shadow-sm min-h-[40px] min-w-[40px] items-center justify-center"
                  title="Refresh Data"
                >
                  <RefreshCw size={18} />
                </button>
              )}

              <button
                onClick={toggleViewMode}
                className={`hidden lg:flex p-2.5 rounded-lg transition-all duration-200 shadow-sm min-h-[40px] min-w-[40px] items-center justify-center ${
                  viewMode === 'mobile' 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={viewMode === 'mobile' ? "Switch to Desktop View" : "Switch to Mobile View"}
              >
                {viewMode === 'mobile' ? (
                  <Smartphone size={18} />
                ) : (
                  <Monitor size={18} />
                )}
              </button>

              <button
                onClick={toggleFullscreen}
                className="hidden lg:flex p-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 shadow-sm min-h-[40px] min-w-[40px] items-center justify-center"
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