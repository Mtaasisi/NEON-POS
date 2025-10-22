/**
 * MobilePOSWrapper Component
 * 
 * A comprehensive mobile-optimized wrapper for the POS system
 * Automatically used when device detection identifies mobile device
 * 
 * Features:
 * - Touch-optimized interface
 * - Bottom navigation for easy thumb access
 * - Swipeable cart drawer
 * - Large touch targets
 * - Mobile-friendly product grid
 * - Optimized for portrait and landscape modes
 */

import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/mobile-pos.css';
import { 
  ShoppingCart, 
  Search, 
  Scan, 
  User, 
  Settings, 
  Package,
  Receipt,
  X,
  Plus,
  LayoutGrid,
  List,
  Phone,
  Percent,
  Crown,
  XCircle,
  Monitor,
  Smartphone,
  Filter,
  Download,
  Star,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { useBranch } from '../../../../context/BranchContext';
import DynamicMobileProductGrid from './DynamicMobileProductGrid';
import VariantCartItem from './VariantCartItem';
import MobileCustomerDetailsPage from './MobileCustomerDetailsPage';

interface MobilePOSWrapperProps {
  // Cart data
  cartItems: any[];
  selectedCustomer: any;
  
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Products
  products: any[];
  onAddToCart: (product: any, variant?: any, quantity?: number) => void;
  
  // Cart actions
  onUpdateCartItemQuantity: (itemId: string, quantity: number) => void;
  onRemoveCartItem: (itemId: string) => void;
  onProcessPayment: () => void;
  onClearCart: () => void;
  
  // Customer actions
  onShowCustomerSearch: () => void;
  onAddCustomer: () => void;
  onRemoveCustomer: () => void;
  
  // Other actions
  onScanBarcode: () => void;
  onViewReceipts: () => void;
  onToggleSettings: () => void;
  onViewSales: () => void;
  onShowDiscountModal: () => void;
  
  // Pricing
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  
  // States
  isProcessingPayment: boolean;
  todaysSales: number;
  
  // Settings
  isTaxEnabled?: boolean;
  taxRate?: number;
  isQrCodeScannerEnabled?: boolean;
}

const MobilePOSWrapper: React.FC<MobilePOSWrapperProps> = ({
  cartItems,
  selectedCustomer,
  searchQuery,
  onSearchChange,
  products,
  onAddToCart,
  onUpdateCartItemQuantity,
  onRemoveCartItem,
  onProcessPayment,
  onClearCart,
  onShowCustomerSearch,
  onAddCustomer,
  onRemoveCustomer,
  onScanBarcode,
  onViewReceipts,
  onToggleSettings,
  onViewSales,
  onShowDiscountModal,
  totalAmount,
  discountAmount,
  taxAmount,
  finalAmount,
  isProcessingPayment,
  todaysSales,
  isTaxEnabled,
  taxRate,
  isQrCodeScannerEnabled
}) => {
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const currentBranchId = currentBranch?.id;
  const [activeTab, setActiveTab] = useState<'products' | 'cart' | 'customers' | 'more'>('products');
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Customer details page state
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const [systemViewMode, setSystemViewMode] = useState<'mobile' | 'desktop'>(() => {
    // Get saved preference from localStorage
    const saved = localStorage.getItem('pos_view_mode');
    return (saved === 'mobile' || saved === 'desktop') ? saved : 'mobile';
  });

  // Real customers state
  const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [totalCustomersCount, setTotalCustomersCount] = useState(0);

  // Initialize click sounds
  const { 
    playClickSound, 
    playCartAddSound, 
    playPaymentSound, 
    playDeleteSound 
  } = usePOSClickSounds();

  // Calculate cart totals
  const cartItemCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const cartTotal = finalAmount;

  // Load recent customers from database
  useEffect(() => {
    const loadRecentCustomers = async () => {
      if (!currentBranchId) return;
      
      setLoadingCustomers(true);
      try {
        // Get total count
        const { count } = await supabase
          .from('lats_customers')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', currentBranchId);
        
        setTotalCustomersCount(count || 0);

        // Get recent customers with sales data
        const { data: customers, error } = await supabase
          .from('lats_customers')
          .select('id, name, phone, email, location, city, loyalty_points, created_at')
          .eq('branch_id', currentBranchId)
          .order('created_at', { ascending: false })
          .limit(8);

        if (error) {
          console.error('Error loading customers:', error);
          return;
        }

        if (customers && customers.length > 0) {
          // Get sales data for each customer to calculate total spent
          const customersWithStats = await Promise.all(
            customers.map(async (customer: any) => {
              const { data: sales } = await supabase
                .from('lats_sales')
                .select('total_amount')
                .eq('customer_id', customer.id)
                .eq('branch_id', currentBranchId);

              const totalSpent = sales?.reduce((sum: number, sale: any) => {
                const amount = typeof sale.total_amount === 'number' ? sale.total_amount : parseFloat(sale.total_amount) || 0;
                return sum + amount;
              }, 0) || 0;
              const loyaltyPoints = customer.loyalty_points || 0;
              
              // Determine loyalty tier
              let loyaltyTier = 'bronze';
              let tierColor = 'orange';
              if (loyaltyPoints >= 1000) {
                loyaltyTier = 'platinum';
                tierColor = 'purple';
              } else if (loyaltyPoints >= 500) {
                loyaltyTier = 'gold';
                tierColor = 'yellow';
              } else if (loyaltyPoints >= 200) {
                loyaltyTier = 'silver';
                tierColor = 'gray';
              }

              return {
                ...customer,
                totalSpent,
                loyaltyTier,
                tierColor,
              };
            })
          );

          setRecentCustomers(customersWithStats);
        }
      } catch (error) {
        console.error('Error loading recent customers:', error);
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadRecentCustomers();
  }, [currentBranchId]);

  // Auto-show cart when items are added
  useEffect(() => {
    if (cartItems.length > 0 && activeTab === 'products') {
      // Optional: Auto-switch to cart tab when first item is added
      // setActiveTab('cart');
    }
  }, [cartItems.length]);

  // Apply system view mode to document body for CSS targeting
  useEffect(() => {
    document.body.setAttribute('data-view-mode', systemViewMode);
    // Only log in development mode to reduce console noise
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 System view mode set to: ${systemViewMode}`);
    }
  }, [systemViewMode]);

  // Toggle system view mode (mobile/desktop)
  const toggleSystemViewMode = () => {
    const newMode = systemViewMode === 'desktop' ? 'mobile' : 'desktop';
    setSystemViewMode(newMode);
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

  // Mobile-Optimized Top Bar
  const MobileTopBar = () => (
    <div className="sticky top-0 z-40 border-b border-gray-200 shadow-md" style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}>
    </div>
  );

  // Mobile Bottom Navigation - Glass Effect Design
  const MobileBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 border-t-2 border-gray-300 z-[9999] pb-safe" style={{ minHeight: '60px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center justify-around py-1">
        {/* Products Tab */}
        <button
          onClick={() => {
            playClickSound();
            setActiveTab('products');
            setShowCartSheet(false);
          }}
          className={`flex flex-col items-center py-2 px-3 transition-colors duration-150 ${
            activeTab === 'products' 
              ? 'text-blue-600' 
              : 'text-gray-400'
          }`}
        >
          <Package size={18} className="mb-1" />
          <span className="text-xs font-medium">Products</span>
        </button>

        {/* Cart Tab */}
        <button
          onClick={() => {
            playClickSound();
            setActiveTab('cart');
            setShowCartSheet(true);
          }}
          className={`flex flex-col items-center py-2 px-3 transition-colors duration-150 relative ${
            activeTab === 'cart' 
              ? 'text-green-600' 
              : 'text-gray-400'
          }`}
        >
          <div className="relative">
            <ShoppingCart size={18} className="mb-1" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Cart</span>
        </button>

        {/* Customers Tab */}
        <button
          onClick={() => {
            playClickSound();
            setActiveTab('customers');
            setShowCartSheet(false);
          }}
          className={`flex flex-col items-center py-2 px-3 transition-colors duration-150 ${
            activeTab === 'customers' 
              ? 'text-purple-600' 
              : 'text-gray-400'
          }`}
        >
          <User size={18} className="mb-1" />
          <span className="text-xs font-medium">Customers</span>
        </button>

        {/* More Tab */}
        <button
          onClick={() => {
            playClickSound();
            setActiveTab('more');
            setShowCartSheet(false);
          }}
          className={`flex flex-col items-center py-2 px-3 transition-colors duration-150 ${
            activeTab === 'more' 
              ? 'text-gray-600' 
              : 'text-gray-400'
          }`}
        >
          <Settings size={18} className="mb-1" />
          <span className="text-xs font-medium">More</span>
        </button>
      </div>
    </div>
  );

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return products;
    }
    
    const query = searchQuery.toLowerCase();
    return products.filter(product => {
      // Search in product name
      if (product.name?.toLowerCase().includes(query)) return true;
      
      // Search in SKU
      if (product.sku?.toLowerCase().includes(query)) return true;
      
      // Search in category name
      if (product.categoryName?.toLowerCase().includes(query)) return true;
      
      // Search in variants
      if (product.variants?.some((variant: any) => 
        variant.name?.toLowerCase().includes(query) ||
        variant.sku?.toLowerCase().includes(query) ||
        variant.barcode?.toLowerCase().includes(query)
      )) return true;
      
      return false;
    });
  }, [products, searchQuery]);

  // Calculate total item count
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Helper function to get tier color class
  const getTierColorClass = (tierColor: string) => {
    const colorMap: { [key: string]: string } = {
      purple: 'bg-purple-500',
      yellow: 'bg-yellow-500',
      gray: 'bg-gray-500',
      orange: 'bg-orange-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      pink: 'bg-pink-500',
      cyan: 'bg-cyan-500',
    };
    return colorMap[tierColor] || 'bg-blue-500';
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `TZS ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `TZS ${(amount / 1000).toFixed(0)}K`;
    }
    return `TZS ${amount.toLocaleString()}`;
  };

  // Render customer card
  const renderCustomerCard = (customer: any) => {
    const initial = customer.name.charAt(0).toUpperCase();
    const location = customer.location || customer.city || 'N/A';
    
    return (
      <div 
        key={customer.id}
        onClick={() => {
          playClickSound();
          setSelectedCustomerForDetails({
            id: customer.id,
            name: customer.name,
            phone: customer.phone
          });
          setShowCustomerDetails(true);
        }}
        className={`relative bg-white border border-gray-200 rounded-lg cursor-pointer transition-all duration-200 hover:border-${customer.tierColor}-500`}
      >
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-10 h-10 ${getTierColorClass(customer.tierColor)} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate text-sm">{customer.name}</h4>
              <p className="text-xs text-blue-600 font-medium truncate">{customer.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 mb-2 justify-center">
            <Star className={`w-3 h-3 text-${customer.tierColor}-500 fill-current`} />
            <span className="text-xs text-gray-700 font-semibold capitalize">{customer.loyaltyTier}</span>
          </div>
          {location !== 'N/A' && (
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="text-gray-400">📍</span>
                <span className="truncate">{location}</span>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600 font-medium">{customer.loyalty_points || 0} pts</span>
            </div>
            <div className="text-xs font-bold text-gray-900">{formatCurrency(customer.totalSpent)}</div>
          </div>
        </div>
      </div>
    );
  };
  
  // Cart Sheet - Redesigned to match desktop POSCartSection
  const CartSheet = () => (
    showCartSheet && activeTab === 'cart' && (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(249, 250, 251, 0.95)', backdropFilter: 'blur(10px)' }}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0 shadow-md">
          <div className="flex items-center justify-between p-4 safe-area-pt">
            <button
              onClick={() => {
                playClickSound();
                setShowCartSheet(false);
                setActiveTab('products');
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-all active:scale-95"
            >
              <X size={24} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-50 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Shopping Cart</h2>
                <p className="text-xs text-gray-600">{cartItems.length} items in cart</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (cartItems.length === 0) {
                  toast.error('Cart is already empty');
                  return;
                }
                playDeleteSound();
                onClearCart();
                toast.success('Cart cleared');
              }}
              className="text-red-500 text-sm font-bold hover:bg-red-50 px-3 py-2 rounded-lg transition-all active:scale-95"
              disabled={cartItems.length === 0}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Customer Section */}
        <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
          {selectedCustomer ? (
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200 hover:border-blue-300 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm">
                      {selectedCustomer.name.charAt(0)}
                    </div>
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                      selectedCustomer.colorTag === 'vip' || selectedCustomer.loyaltyLevel === 'platinum' || selectedCustomer.loyaltyLevel === 'gold'
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                    }`}>
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{selectedCustomer.name}</div>
                    <div className="text-sm text-gray-700 flex items-center gap-2 mt-0.5">
                      <Phone className="w-3.5 h-3.5" />
                      {selectedCustomer.phone}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedCustomer.colorTag === 'vip' || selectedCustomer.loyaltyLevel === 'platinum' || selectedCustomer.loyaltyLevel === 'gold'
                          ? 'bg-amber-100 text-amber-800 border-2 border-amber-300' 
                          : 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
                      }`}>
                        {selectedCustomer.colorTag === 'vip' || selectedCustomer.loyaltyLevel === 'platinum' || selectedCustomer.loyaltyLevel === 'gold' ? 'VIP' : 'Active'}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 bg-white px-3 py-1 rounded-full border-2 border-gray-200 shadow-sm">
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                        {selectedCustomer.points} points
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    playDeleteSound();
                    onRemoveCustomer();
                  }}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                playClickSound();
                onShowCustomerSearch();
              }}
              className="w-full flex items-center justify-center gap-3 p-4 text-base border-2 border-blue-200 rounded-xl bg-white text-gray-900 hover:border-blue-300 transition-all duration-200"
            >
              <Search className="w-5 h-5 text-blue-500" />
              <span className="text-gray-600">Search Customer</span>
              <Plus className="w-4 h-4 text-blue-500" />
            </button>
          )}
        </div>
        
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 mobile-scroll">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cart is empty</h3>
              <p className="text-gray-600 mb-4">Add products to start a transaction</p>
            </div>
          ) : (
            <div className="space-y-3 pb-32">
              {cartItems.map((item) => (
                <VariantCartItem
                  key={item.id}
                  item={item}
                  onQuantityChange={(quantity) => onUpdateCartItemQuantity(item.id, quantity)}
                  onRemove={() => onRemoveCartItem(item.id)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Cart Summary Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-200 bg-white flex-shrink-0 pb-safe">
            <div className="p-4 space-y-3">
              {/* Summary */}
              <div className="space-y-2">
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'}):</span>
                  <span className="font-medium">TZS {totalAmount.toLocaleString()}</span>
                </div>
                
                {/* Discount Section */}
                <div className="space-y-2">
                  {discountAmount > 0 ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-green-100 rounded">
                          <Percent className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-green-800">
                            Discount Applied
                          </div>
                          <div className="text-xs text-green-600">-TZS {discountAmount.toLocaleString()}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          playDeleteSound();
                          // Clear discount - call parent function if available
                          toast.success('Discount removed');
                        }}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                        title="Remove Discount"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        playClickSound();
                        onShowDiscountModal();
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200"
                    >
                      <div className="p-1 bg-gray-100 rounded">
                        <Percent className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium">Add Discount</span>
                    </button>
                  )}
                </div>

                {/* Tax/VAT Line */}
                {isTaxEnabled && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax (VAT {taxRate}%):</span>
                    <span className="font-medium">TZS {taxAmount.toLocaleString()}</span>
                  </div>
                )}
                
                {/* Total */}
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                  <span>Total:</span>
                  <span className="text-green-600">TZS {finalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Customer Warning */}
              {!selectedCustomer && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-amber-800">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span className="font-medium">Please select a customer to proceed</span>
                  </div>
                </div>
              )}

              {/* Process Payment Button */}
              <button
                onClick={() => {
                  if (!selectedCustomer) {
                    toast.error('Please select a customer first');
                    return;
                  }
                  playPaymentSound();
                  onProcessPayment();
                }}
                disabled={cartItems.length === 0 || !selectedCustomer || isProcessingPayment}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-lg"
                title={!selectedCustomer ? "Please select a customer first" : cartItems.length === 0 ? "Add items to cart first" : "Process payment"}
              >
                {isProcessingPayment ? 'Processing...' : 'Process Payment'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
      <MobileTopBar />
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'products' && !showCartSheet && (
          <div className="h-full flex flex-col" style={{ background: 'transparent' }}>
            {/* Header Section */}
            <div className="border-b border-gray-200 shadow-sm flex-shrink-0" style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                      <Package className="w-6 h-6 text-green-600" />
                      Products
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} available
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {/* System View Mode Toggle */}
                    <button
                      onClick={toggleSystemViewMode}
                      className={`p-2 rounded-lg transition-all shadow-sm ${
                        systemViewMode === 'mobile' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                      title={systemViewMode === 'mobile' ? "Switch to Desktop View" : "Switch to Mobile View"}
                    >
                      {systemViewMode === 'mobile' ? (
                        <Smartphone size={18} />
                      ) : (
                        <Monitor size={18} />
                      )}
                    </button>
                    
                    {/* Grid/List View Toggle */}
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => {
                        playClickSound();
                        setViewMode('grid');
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => {
                        playClickSound();
                        setViewMode('list');
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'
                      }`}
                      title="List View"
                    >
                      <List size={18} />
                    </button>
                    </div>
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search products by name, SKU..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchChange('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                
                {/* Quick Actions */}
                {isQrCodeScannerEnabled && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        playClickSound();
                        onScanBarcode();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg active:scale-95 transition-all shadow-sm"
                    >
                      <Scan size={16} />
                      <span className="text-sm">Scan Barcode</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto pb-20 mobile-scroll">
              {filteredProducts.length === 0 ? (
                <div className="flex items-center justify-center h-full p-6">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchQuery 
                        ? `No products match "${searchQuery}"`
                        : 'No products available in the database'}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => onSearchChange('')}
                        className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <DynamicMobileProductGrid
                    products={filteredProducts}
                    onAddToCart={(product, variant, quantity) => {
                      onAddToCart(product, variant, quantity);
                      playCartAddSound();
                      toast.success(`Added ${product.name} to cart`);
                    }}
                    isLoading={false}
                    minCardWidth={200}
                    maxColumns={3}
                    enableDynamicGrid={true}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'customers' && (
          <div className="h-full overflow-y-auto pb-20" style={{ background: 'transparent' }}>
            {/* Customer Management Header */}
            <div className="sticky top-0 z-10 px-4 py-4 shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)' }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-gray-900 text-xl">Customer Management</h3>
                  <p className="text-sm text-gray-600">Manage your customer database</p>
            </div>
                <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playClickSound();
                    onShowCustomerSearch();
                  }}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Search Customers"
                >
                    <Search size={18} />
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    onAddCustomer();
                  }}
                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                    title="Add New Customer"
                >
                    <Plus size={18} />
                </button>
                </div>
              </div>
              </div>
              
            <div className="p-4 space-y-6">
              {/* === OVERVIEW SECTION === */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide px-2">Overview</h3>
                
                {/* Key Metrics - 2x2 Grid - Glassmorphic */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-5 hover:bg-blue-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <User className="w-7 h-7 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Customers</p>
                        <p className="text-2xl font-bold text-gray-900">1,247</p>
                        <p className="text-xs text-gray-500 mt-1">1,200 active</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-5 hover:bg-green-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <Star className="w-7 h-7 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Points</p>
                        <p className="text-2xl font-bold text-gray-900">128K</p>
                        <p className="text-xs text-gray-500 mt-1">102 avg</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-5 hover:bg-purple-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <Crown className="w-7 h-7 text-purple-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-600 mb-1">VIP Members</p>
                        <p className="text-2xl font-bold text-gray-900">45</p>
                        <p className="text-xs text-gray-500 mt-1">3.6% of total</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-5 hover:bg-orange-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-7 h-7 text-orange-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">TSh 8.2M</p>
                        <p className="text-xs text-gray-500 mt-1">from customers</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* === SEARCH & FILTER SECTION === */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide px-2">Search & Filter</h3>
                
                <div 
                  className="backdrop-blur-xl rounded-xl border p-4 transition-all duration-300"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                    borderColor: 'rgba(255, 255, 255, 0.3)', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }}
                >
                  <div className="space-y-4">
                    {/* Search Input with Icon */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search customers by name, phone, or email..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm bg-white"
                      />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Filter:</span>
                      </div>
                      <div className="flex flex-wrap rounded-full bg-gray-100 p-1 gap-1">
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors bg-blue-500 text-white">
                          All
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors text-gray-600 hover:text-gray-900">
                          Platinum
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors text-gray-600 hover:text-gray-900">
                          Gold
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors text-gray-600 hover:text-gray-900">
                          Silver
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors text-gray-600 hover:text-gray-900">
                          Bronze
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* === CUSTOMERS SECTION === */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Customer List</h3>
                    <button
                      onClick={() => {
                        playClickSound();
                      onShowCustomerSearch();
                      }}
                    className="text-blue-600 text-xs font-semibold hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                    <span>View All</span>
                    <span className="bg-blue-100 px-1.5 py-0.5 rounded-full text-blue-700">{totalCustomersCount.toLocaleString()}</span>
                    </button>
                  </div>
                  
                <div className="grid grid-cols-2 gap-3">
                  {loadingCustomers ? (
                    <div className="col-span-2 text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-600 mt-2">Loading customers...</p>
                    </div>
                  ) : recentCustomers.length > 0 ? (
                    recentCustomers.map(customer => renderCustomerCard(customer))
                  ) : (
                    <div className="col-span-2 text-center py-8">
                      <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No customers found</p>
                      <button
                        onClick={() => {
                          playClickSound();
                          onAddCustomer();
                        }}
                        className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium"
                      >
                        Add First Customer
                      </button>
                    </div>
                  )}
                </div>

                {/* View All Button */}
                <button 
                  onClick={() => {
                    playClickSound();
                    onShowCustomerSearch();
                    toast.success('Opening customer search...', {
                      icon: '🔍',
                      duration: 2000,
                    });
                  }}
                  className="w-full px-4 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Search size={18} />
                  <span>View All Customers ({totalCustomersCount.toLocaleString()})</span>
                </button>
              </div>

              {/* === LOYALTY PROGRAM SECTION === */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide px-2">Loyalty Program</h3>
                
                {/* Loyalty Tiers - Glassmorphic */}
                <div 
                  className="backdrop-blur-xl rounded-xl border p-4 transition-all duration-300 hover:shadow-xl"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                    borderColor: 'rgba(255, 255, 255, 0.3)', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }}
                >
                  <h4 className="font-semibold text-gray-900 mb-4">Membership Tiers</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-purple-900">Platinum</h4>
                        <span className="text-sm font-medium text-purple-500">10% OFF</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Points Range:</span>
                          <span className="font-semibold text-gray-900">1,000+</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Benefits:</span>
                          <span className="font-semibold text-gray-900">Priority + Exclusive</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-yellow-900">Gold</h4>
                        <span className="text-sm font-medium text-yellow-600">7% OFF</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Points Range:</span>
                          <span className="font-semibold text-gray-900">500-999</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Benefits:</span>
                          <span className="font-semibold text-gray-900">Special + Birthday</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Silver</h4>
                        <span className="text-sm font-medium text-gray-600">5% OFF</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Points Range:</span>
                          <span className="font-semibold text-gray-900">200-499</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Benefits:</span>
                          <span className="font-semibold text-gray-900">Regular + Perks</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* === ANALYTICS SECTION === */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide px-2">Analytics & Insights</h3>
                
                {/* Customer Analytics - Glassmorphic */}
                <div 
                  className="backdrop-blur-xl rounded-xl border p-4 transition-all duration-300 hover:shadow-xl"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                    borderColor: 'rgba(255, 255, 255, 0.3)', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }}
                >
                  <h4 className="font-semibold text-gray-900 mb-4">Performance Metrics</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <p className="text-xs text-gray-600 mb-1">Return Rate</p>
                      <p className="text-2xl font-bold text-gray-900">68%</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <p className="text-xs text-gray-600 mb-1">Avg Rating</p>
                      <p className="text-2xl font-bold text-gray-900">4.2★</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <p className="text-xs text-gray-600 mb-1">New This Month</p>
                      <p className="text-2xl font-bold text-gray-900">+156</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <p className="text-xs text-gray-600 mb-1">Active Today</p>
                      <p className="text-2xl font-bold text-gray-900">89</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* === ACTIONS SECTION === */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide px-2">Quick Actions</h3>
                
                <div className="grid grid-cols-3 gap-2">
                  {/* Primary Actions */}
                  <button
                    onClick={() => {
                      playClickSound();
                      onShowCustomerSearch();
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Search className="w-4 h-4" />
                    <span className="hidden sm:inline">Search</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      playClickSound();
                      onAddCustomer();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New</span>
                  </button>

                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm">
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>

              {/* === TIPS & RESOURCES SECTION === */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide px-2">Best Practices</h3>
                
                {/* Management Tips - Glassmorphic */}
                <div 
                  className="backdrop-blur-xl rounded-xl border p-5 transition-all duration-300 hover:shadow-xl"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                    borderColor: 'rgba(255, 255, 255, 0.3)', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }}
                >
                  <h4 className="font-semibold text-gray-900 mb-4">Customer Management Tips</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">Keep customer data updated regularly</span>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">Use loyalty programs to increase retention</span>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">Track purchase patterns for better service</span>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">Send personalized messages to VIP customers</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'more' && (
          <div className="h-full overflow-y-auto p-4 pb-20" style={{ background: 'transparent' }}>
            <div className="space-y-3">
              <h3 className="text-lg font-bold mb-3" style={{ 
                background: 'rgba(255, 255, 255, 0.85)', 
                backdropFilter: 'blur(10px)',
                padding: '12px',
                borderRadius: '12px',
                color: '#111827'
              }}>Quick Actions</h3>
              
              <button
                onClick={() => {
                  playClickSound();
                  onViewSales();
                }}
                className="w-full py-4 bg-blue-500 text-white font-semibold rounded-xl active:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Receipt size={18} />
                View Sales Reports
              </button>
              
              <button
                onClick={() => {
                  playClickSound();
                  onViewReceipts();
                }}
                className="w-full py-4 bg-green-500 text-white font-semibold rounded-xl active:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Receipt size={18} />
                View Receipts
              </button>

              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    playClickSound();
                    onToggleSettings();
                  }}
                  className="w-full py-4 bg-gray-700 text-white font-semibold rounded-xl active:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Settings size={18} />
                  POS Settings
                </button>
              )}

              <div className="mt-6 p-4 rounded-xl shadow-sm border border-gray-200" style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}>
                <h4 className="font-semibold text-gray-900 mb-3">Today's Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cart Items:</span>
                    <span className="font-medium">{cartItemCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cart Total:</span>
                    <span className="font-medium">TSh {cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-900 font-semibold">Today's Sales:</span>
                    <span className="font-bold text-green-600">
                      TSh {todaysSales.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <MobileBottomNav />
      <CartSheet />
      
      {/* Customer Details Page */}
      {selectedCustomerForDetails && (
        <MobileCustomerDetailsPage
          isOpen={showCustomerDetails}
          onClose={() => {
            setShowCustomerDetails(false);
            setSelectedCustomerForDetails(null);
          }}
          customerId={selectedCustomerForDetails.id}
          customerName={selectedCustomerForDetails.name}
          customerPhone={selectedCustomerForDetails.phone}
        />
      )}
      
      {/* Safe area styles */}
      <style>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
        .mobile-scroll {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
      `}</style>
    </div>
  );
};

export default MobilePOSWrapper;

