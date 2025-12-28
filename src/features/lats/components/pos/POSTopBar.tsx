import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';
import { useGlobalSearchModal } from '../../../../context/GlobalSearchContext';
import {
  CreditCard,
  Trash2,
  DollarSign,
  BarChart3,
  User,
  FileText,
  RefreshCw,
  Maximize2,
  Minimize2,
  Lock,
  Home,
  Settings,
  Monitor,
  Calendar,
  Search,
  MoreHorizontal,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface POSTopBarProps {
  cartItemsCount: number;
  onProcessPayment: () => void;
  onClearCart: () => void;
  onPreviewInvoice?: () => void;
  onViewSales: () => void;
  isProcessingPayment: boolean;
  hasSelectedCustomer: boolean;
  todaysSales?: number;
  isDailyClosed?: boolean;
  onCloseDay?: () => void;
  canCloseDay?: boolean;
  // Bottom bar actions
  onViewAnalytics?: () => void;
  onCustomers?: () => void;
  onRefreshData?: () => void;
  onSettings?: () => void;
  onOpenInstallments?: () => void;
  onOpenExpense?: () => void;
}

const POSTopBar: React.FC<POSTopBarProps> = ({
  cartItemsCount,
  onProcessPayment,
  onClearCart,
  onPreviewInvoice,
  onViewSales,
  isProcessingPayment,
  hasSelectedCustomer,
  todaysSales = 0,
  isDailyClosed = false,
  onCloseDay,
  canCloseDay = false,
  // Bottom bar actions
  onViewAnalytics,
  onCustomers,
  onRefreshData,
  onSettings,
  onOpenInstallments,
  onOpenExpense,
}) => {
  const { currentUser } = useAuth();
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


  // Format money
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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


  // Dropdown states
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Refs for dropdowns
  const quickActionsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div
        className="px-4 sm:px-6 py-3"
        style={{
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingTop: '12px',
          paddingBottom: '12px'
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left Section: Title + Status */}
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            <button
              onClick={() => {
                playClickSound();
                navigate('/dashboard');
              }}
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
              title="Back to Dashboard"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>

            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">POS</h1>
              {isDailyClosed && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                  <Lock size={12} />
                  <span className="hidden lg:inline">Closed</span>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Center: Time Display */}
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
            
            {/* Sales Summary - Text Style */}
            <button
              onClick={() => {
                playClickSound();
                onViewSales();
              }}
              className="flex items-center justify-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 min-h-[44px]"
              title="Today's Sales"
            >
              <DollarSign size={20} className="text-gray-600" />
              <span className="text-lg sm:text-xl font-bold text-gray-900">{formatMoney(todaysSales)}</span>
            </button>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Cart Actions - Show when cart has items */}
              {cartItemsCount > 0 && (
              <div className="flex items-center gap-1">
                {onPreviewInvoice && (
                  <button
                    onClick={() => {
                      playClickSound();
                      onPreviewInvoice();
                    }}
                    disabled={!hasSelectedCustomer}
                    className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                    title={!hasSelectedCustomer ? "Please select a customer first" : "Preview invoice"}
                  >
                    <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                      <FileText size={16} className="text-blue-600" />
                    </div>
                  </button>
                )}
                
                <button
                  onClick={handleProcessPayment}
                  disabled={isProcessingPayment || !hasSelectedCustomer}
                  className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                  title={!hasSelectedCustomer ? "Please select a customer first" : "Process payment"}
                >
                  <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                    <CreditCard size={16} className="text-green-600" />
                  </div>
                </button>

                <button
                  onClick={handleClearCart}
                  className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                  title="Clear cart"
                >
                  <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center">
                    <Trash2 size={16} className="text-orange-600" />
                  </div>
                </button>
              </div>
            )}

            {/* Analytics Button */}
            {onViewAnalytics && (
              <button
                onClick={() => {
                  playClickSound();
                  onViewAnalytics();
                }}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                title="Sales Analytics"
              >
                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                  <BarChart3 size={16} className="text-blue-600" />
                </div>
              </button>
            )}

            {/* Customers Button */}
            {onCustomers && (
              <button
                onClick={() => {
                  playClickSound();
                  onCustomers();
                }}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                title="Customers"
              >
                <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
                  <User size={16} className="text-purple-600" />
                </div>
              </button>
            )}


            {/* Installments Button */}
              {onOpenInstallments && (
                <button
                  onClick={() => {
                    playClickSound();
                    onOpenInstallments();
                  }}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                title="Installments"
              >
                <div className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center">
                  <Calendar size={16} className="text-indigo-600" />
                </div>
              </button>
            )}

            {/* Expense Button - Admins only */}
            {onOpenExpense && currentUser?.role === 'admin' && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenExpense();
                }}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                title="Quick Expense"
              >
                <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center">
                  <DollarSign size={16} className="text-red-600" />
                </div>
                </button>
              )}

            {/* Close Day Button */}
              {onCloseDay && canCloseDay && !isDailyClosed && (
                <button
                  onClick={() => {
                    playClickSound();
                    onCloseDay();
                  }}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                  title="Close Daily Sales"
                >
                <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center">
                  <Lock size={16} className="text-red-600" />
                </div>
                </button>
              )}

            {/* Quick Actions Dropdown */}
            <div className="relative" ref={quickActionsRef}>
              <button
                onClick={() => {
                  playClickSound();
                  setShowQuickActions(!showQuickActions);
                }}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                title="More Actions"
              >
                <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                  <MoreHorizontal size={16} className="text-gray-600" />
                </div>
              </button>

              {showQuickActions && (
                <div className="absolute top-full mt-2 right-0 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      playClickSound();
                      openSearch();
                      setShowQuickActions(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                  >
                    <Search size={16} />
                    <span className="text-sm">Global Search</span>
                  </button>

                  <button
                    onClick={() => {
                      playClickSound();
                      // Note: onViewReceipts not available in props, could add later if needed
                      setShowQuickActions(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                  >
                    <FileText size={16} />
                    <span className="text-sm">Receipts</span>
                  </button>

                  <button
                    onClick={() => {
                      playClickSound();
                      // Note: onScanQrCode not available in props, could add later if needed
                      setShowQuickActions(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                  >
                    <Monitor size={16} />
                    <span className="text-sm">Scan QR Code</span>
                  </button>

                <button
                  onClick={() => {
                    playClickSound();
                      // Note: onAddCustomer not available in props, could add later if needed
                      setShowQuickActions(false);
                  }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                >
                    <User size={16} />
                    <span className="text-sm">Add Customer</span>
                </button>
                </div>
              )}
            </div>



            {/* Refresh Button */}
              {onRefreshData && (
                <button
                  onClick={() => {
                    playClickSound();
                    onRefreshData();
                  }}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                  title="Refresh Data"
                >
                <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                  <RefreshCw size={16} className="text-gray-600" />
                </div>
                </button>
              )}

            {/* Settings Button */}
            {onSettings && currentUser?.role === 'admin' && (
              <button
                onClick={() => {
                  playClickSound();
                  onSettings();
                }}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                title="POS Settings"
              >
                <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                  <Settings size={16} className="text-gray-600" />
                </div>
              </button>
            )}

            {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
              <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                {isFullscreen ? (
                  <Minimize2 size={16} className="text-gray-600" />
                ) : (
                  <Maximize2 size={16} className="text-gray-600" />
                )}
              </div>
              </button>

            {/* Exit to Dashboard Button */}
            <button
              onClick={() => {
                playClickSound();
                handleExitToDashboard();
              }}
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
              title="Exit to Dashboard"
            >
              <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                <Home size={16} className="text-gray-600" />
            </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default POSTopBar;