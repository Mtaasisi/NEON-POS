import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  User, Phone, Mail, X, 
  DollarSign, Clock,
  MapPin, Gift, Star, ShoppingBag, Calendar as CalendarIcon,
  MessageCircle
} from 'lucide-react';
import { InstallmentPlan } from '../../../../types/specialOrders';
import { fetchCustomerById } from '../../../../lib/customerApi/core';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  gender?: string;
  points?: number;
  totalSpent?: number;
  loyaltyLevel?: string;
  joinedDate?: string;
  lastVisit?: string;
  isActive?: boolean;
  locationDescription?: string;
  nationalId?: string;
  totalPurchases?: number;
  lastPurchaseDate?: string;
  profileImage?: string;
  whatsapp?: string;
}

interface CustomerTooltipProps {
  customer: Customer | null | undefined;
  plan?: InstallmentPlan;
  anchorRef: React.RefObject<HTMLElement>;
  isOpen: boolean;
  onClose: () => void;
  formatCurrency?: (amount: number) => string;
  formatDate?: (dateString: string) => string;
}

const CustomerTooltip: React.FC<CustomerTooltipProps> = ({
  customer,
  plan,
  anchorRef,
  isOpen,
  onClose,
  formatCurrency = (amount) => `$${amount.toFixed(2)}`,
  formatDate = (date) => new Date(date).toLocaleDateString()
}) => {
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tailPosition, setTailPosition] = useState<{ side: 'top' | 'bottom'; left: number } | null>(null);
  const [fullCustomerData, setFullCustomerData] = useState<Customer | null>(null);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Add CSS animations for tooltip entrance and exit
  useEffect(() => {
    const styleId = 'customer-tooltip-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes tooltipEnter {
          0% {
            opacity: 0;
            transform: scale(0.2) translateY(-20px);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05) translateY(2px);
          }
          70% {
            transform: scale(0.98) translateY(-1px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes tooltipExit {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          30% {
            opacity: 0.8;
            transform: scale(1.02) translateY(-2px);
          }
          100% {
            opacity: 0;
            transform: scale(0.2) translateY(-20px);
          }
        }
        @keyframes backdropEnter {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes backdropExit {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Handle closing animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 600); // Match animation duration
  };

  // Fetch full customer details when tooltip opens
  useEffect(() => {
    if (isOpen && customer?.id && !fullCustomerData) {
      setIsLoadingCustomer(true);
      fetchCustomerById(customer.id)
        .then((data) => {
          if (data) {
            setFullCustomerData({
              id: data.id,
              name: data.name,
              phone: data.phone,
              email: data.email,
              city: data.city,
              gender: data.gender,
              points: data.points || 0,
              totalSpent: data.totalSpent || 0,
              loyaltyLevel: data.loyaltyLevel || undefined,
              joinedDate: data.joinedDate || undefined,
              lastVisit: data.lastVisit || undefined,
              isActive: data.isActive,
              locationDescription: data.locationDescription,
              nationalId: data.nationalId,
              totalPurchases: data.totalPurchases || 0,
              lastPurchaseDate: data.lastPurchaseDate || undefined,
              profileImage: data.profileImage || undefined,
              whatsapp: data.whatsapp || data.phone || undefined
            });
          }
        })
        .catch((error) => {
          console.error('Error fetching customer details:', error);
        })
        .finally(() => {
          setIsLoadingCustomer(false);
        });
    }
  }, [isOpen, customer?.id, fullCustomerData]);

  // Reset when tooltip closes
  useEffect(() => {
    if (!isOpen) {
      setFullCustomerData(null);
      setAnchorPosition(null);
      setIsClosing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      // Scroll button into view smoothly when tooltip opens
      anchorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
      
      const updatePosition = () => {
        if (!anchorRef.current) {
          // Anchor element is no longer in DOM, close tooltip
          handleClose();
          return;
        }
        
        const rect = anchorRef.current.getBoundingClientRect();
        
        // Store anchor position for animation
        if (!anchorPosition) {
          setAnchorPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height
          });
        }
        
        // Check if anchor is visible
        if (rect.width === 0 || rect.height === 0 || rect.top < -1000 || rect.bottom > window.innerHeight + 1000) {
          // Anchor is not visible, close tooltip
          handleClose();
          return;
        }
        
        const tooltipWidth = 600; // Expanded width for grid layout
        const tooltipHeight = plan ? 700 : 400; // Taller to fit grid content
        
        // Calculate anchor center
        const anchorCenterX = rect.left + rect.width / 2;
        const anchorCenterY = rect.top + rect.height / 2;
        
        // Calculate position - prefer bottom, but adjust if needed
        let top = rect.bottom + window.scrollY + 8;
        let left = rect.left + window.scrollX;
        let tailSide: 'top' | 'bottom' = 'top';
        
        // Adjust if tooltip would go off screen
        if (left + tooltipWidth > window.innerWidth) {
          left = window.innerWidth - tooltipWidth - 10;
        }
        if (left < 10) {
          left = 10;
        }
        
        // If bottom doesn't fit, show above
        if (rect.bottom + tooltipHeight > window.innerHeight) {
          top = rect.top + window.scrollY - tooltipHeight - 8;
          tailSide = 'bottom';
        }
        
        // Calculate tail position (relative to tooltip)
        const tailLeft = anchorCenterX - left;
        const clampedTailLeft = Math.max(30, Math.min(tooltipWidth - 30, tailLeft));
        
        setPosition({ top, left });
        setTailPosition({ side: tailSide, left: clampedTailLeft });
      };
      
      // Update position immediately
      updatePosition();
      
      // Update on scroll/resize - close if anchor moves significantly
      const handleScroll = () => {
        updatePosition();
      };
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    } else if (!isOpen) {
      // Reset anchor position when closed
      setAnchorPosition(null);
    }
  }, [isOpen, anchorRef, plan, anchorPosition]);

  useEffect(() => {
    if (!isOpen) return;
    
    let cleanup: (() => void) | null = null;
    
    // Use a small delay to prevent immediate closing when opening
    const timeoutId = setTimeout(() => {
      function handleClickOutside(event: MouseEvent) {
        const target = event.target as Node;
        
        // Don't close if clicking on the tooltip or anchor
        if (
          tooltipRef.current?.contains(target) ||
          anchorRef.current?.contains(target)
        ) {
          return;
        }
        
        // Close if clicking outside
        handleClose();
      }
      
      function handleEscape(event: KeyboardEvent) {
        if (event.key === 'Escape') {
          handleClose();
        }
      }
      
      // Use click without capture phase to avoid conflicts with stopPropagation
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      
      // Store cleanup function
      cleanup = () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (cleanup) {
        cleanup();
      }
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || !customer) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1000000 }}>
      {/* Subtle backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto"
        style={{
          animation: isClosing ? 'backdropExit 600ms ease-out forwards' : 'backdropEnter 600ms ease-out forwards',
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
      />
      
      {/* Tooltip with animations */}
      <div
        ref={tooltipRef}
        className="fixed bg-white/98 backdrop-blur-md rounded-2xl shadow-[0_25px_100px_rgba(0,0,0,0.25)] border-2 border-purple-200/50 overflow-visible pointer-events-auto"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: '600px',
          maxHeight: '800px',
          boxShadow: '0 25px 100px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(139, 92, 246, 0.1), 0 0 40px rgba(139, 92, 246, 0.1)',
          animation: isClosing ? 'tooltipExit 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'tooltipEnter 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          transformOrigin: anchorPosition 
            ? `${(anchorPosition.left + anchorPosition.width / 2 - position.left)}px ${(anchorPosition.top + anchorPosition.height / 2 - position.top)}px`
            : 'center center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tail pointing to button */}
        {tailPosition && (
          <div
            className={`absolute ${tailPosition.side === 'top' ? '-top-3' : '-bottom-3'} left-0 z-10`}
            style={{
              left: `${tailPosition.left}px`,
              transform: 'translateX(-50%)',
            }}
          >
            {/* Outer tail with border */}
            <div
              className={`w-0 h-0 ${
                tailPosition.side === 'top'
                  ? 'border-l-[12px] border-r-[12px] border-b-[12px] border-l-transparent border-r-transparent border-b-purple-200/50'
                  : 'border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent border-t-purple-200/50'
              }`}
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
              }}
            />
            {/* Inner tail (white) */}
            <div
              className={`absolute ${tailPosition.side === 'top' ? 'top-[2px]' : 'top-[-10px]'} left-1/2 -translate-x-1/2 w-0 h-0 ${
                tailPosition.side === 'top'
                  ? 'border-l-[10px] border-r-[10px] border-b-[10px] border-l-transparent border-r-transparent border-b-white/98'
                  : 'border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-white/98'
              }`}
            />
          </div>
        )}
        
        {/* Content wrapper with rounded corners */}
        <div className="overflow-hidden rounded-2xl">
      {/* Header with white background */}
      <div className="bg-white p-5 border-b border-gray-200 relative overflow-hidden">
        {/* Close Button - Matching main page style */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full -ml-12 -mb-12"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4 pr-12">
            <div className="flex items-center gap-3 flex-1">
              {/* Customer Avatar with Initials */}
              <div className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center border-2 border-purple-200 shadow-lg">
                {fullCustomerData?.profileImage ? (
                  <img 
                    src={fullCustomerData.profileImage} 
                    alt={customer.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-white">
                    {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg truncate text-gray-900">{customer.name || 'Unknown Customer'}</h3>
                  {fullCustomerData?.isActive !== false && (
                    <div className="flex items-center gap-1 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-green-700">Active</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-sm">Customer & Installment Details</p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {customer.phone && (
              <>
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-700 transition-all hover:scale-105"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 transition-all hover:scale-105"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg text-sm font-medium text-purple-700 transition-all hover:scale-105"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5 max-h-[700px] overflow-y-auto">
        {/* Quick Stats Bar */}
        {fullCustomerData && (fullCustomerData.points !== undefined || fullCustomerData.totalSpent !== undefined) && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {fullCustomerData.points !== undefined && (
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-600 mb-1 font-medium">Loyalty Points</p>
                    <p className="text-2xl font-bold text-amber-900">{fullCustomerData.points.toLocaleString()}</p>
                  </div>
                  <Gift className="w-8 h-8 text-amber-600" />
                </div>
              </div>
            )}
            {fullCustomerData.totalSpent !== undefined && (
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 mb-1 font-medium">Total Spent</p>
                    <p className="text-2xl font-bold text-emerald-900 truncate">{formatCurrency(fullCustomerData.totalSpent)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer Information Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded"></div>
              Customer Information
            </h4>
            {fullCustomerData?.loyaltyLevel && (
              <div className="flex items-center gap-1 bg-gradient-to-r from-purple-100 to-indigo-100 px-2.5 py-1 rounded-full border border-purple-200">
                <Star className="w-3 h-3 text-purple-600" />
                <span className="text-xs font-bold text-purple-700 capitalize">{fullCustomerData.loyaltyLevel}</span>
              </div>
            )}
          </div>
          
          {isLoadingCustomer ? (
            <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading customer details...</p>
            </div>
          ) : (
            <>
              {/* Compact Grid Layout for Customer Info */}
              <div className="grid grid-cols-3 gap-2">
                {/* Phone */}
                {customer.phone && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2.5 border border-blue-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-blue-200 rounded flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3 h-3 text-blue-600" />
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">Phone</p>
                    </div>
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline truncate block"
                    >
                      {customer.phone}
                    </a>
                  </div>
                )}
                
                {/* Email */}
                {customer.email && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2.5 border border-purple-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-purple-200 rounded flex items-center justify-center flex-shrink-0">
                        <Mail className="w-3 h-3 text-purple-600" />
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">Email</p>
                    </div>
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-800 hover:underline truncate block"
                    >
                      {customer.email}
                    </a>
                  </div>
                )}

                {/* Location */}
                {(fullCustomerData?.city || fullCustomerData?.locationDescription) && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2.5 border border-green-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-green-200 rounded flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-green-600" />
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">Location</p>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {fullCustomerData.city || fullCustomerData.locationDescription || 'N/A'}
                    </p>
                  </div>
                )}

                {/* Gender */}
                {fullCustomerData?.gender && (
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-2.5 border border-pink-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-pink-200 rounded flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-pink-600" />
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">Gender</p>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 capitalize">{fullCustomerData.gender}</p>
                  </div>
                )}

                {/* Loyalty Points */}
                {fullCustomerData?.points !== undefined && (
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-2.5 border border-amber-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-amber-200 rounded flex items-center justify-center flex-shrink-0">
                        <Gift className="w-3 h-3 text-amber-600" />
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">Points</p>
                    </div>
                    <p className="text-xs font-bold text-amber-700">{fullCustomerData.points.toLocaleString()}</p>
                  </div>
                )}

                {/* Total Purchases */}
                {fullCustomerData?.totalPurchases !== undefined && fullCustomerData.totalPurchases > 0 && (
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-2.5 border border-cyan-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-cyan-200 rounded flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="w-3 h-3 text-cyan-600" />
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">Purchases</p>
                    </div>
                    <p className="text-xs font-bold text-cyan-700">{fullCustomerData.totalPurchases}</p>
                  </div>
                )}

                {/* Joined Date */}
                {fullCustomerData?.joinedDate && (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-2.5 border border-slate-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-slate-200 rounded flex items-center justify-center flex-shrink-0">
                        <CalendarIcon className="w-3 h-3 text-slate-600" />
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">Joined</p>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 truncate">{formatDate(fullCustomerData.joinedDate)}</p>
                  </div>
                )}

                {/* Last Visit */}
                {fullCustomerData?.lastVisit && (
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-2.5 border border-teal-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-teal-200 rounded flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3 h-3 text-teal-600" />
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">Last Visit</p>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 truncate">{formatDate(fullCustomerData.lastVisit)}</p>
                  </div>
                )}

                {/* National ID */}
                {fullCustomerData?.nationalId && (
                  <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg p-2.5 border border-violet-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-violet-200 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] font-bold text-violet-700">ID</span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">National ID</p>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 truncate">{fullCustomerData.nationalId}</p>
                  </div>
                )}
              </div>

              {!customer.phone && !customer.email && (
                <div className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                  No contact information available
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
};

export default CustomerTooltip;
