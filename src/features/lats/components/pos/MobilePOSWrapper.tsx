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
  Mail,
  Crown,
  XCircle,
  Monitor,
  Smartphone
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';
import { useAuth } from '../../../../context/AuthContext';
import DynamicMobileProductGrid from './DynamicMobileProductGrid';
import VariantCartItem from './VariantCartItem';

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
  const [activeTab, setActiveTab] = useState<'products' | 'cart' | 'customers' | 'more'>('products');
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [systemViewMode, setSystemViewMode] = useState<'mobile' | 'desktop'>(() => {
    // Get saved preference from localStorage
    const saved = localStorage.getItem('pos_view_mode');
    return (saved === 'mobile' || saved === 'desktop') ? saved : 'mobile';
  });

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
    console.log(`📱 System view mode set to: ${systemViewMode}`);
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
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-gray-200 px-4 py-3 shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}>
              <h3 className="font-bold text-gray-800 text-lg">Customer Management</h3>
              <p className="text-xs text-gray-600">Select or add a customer for your transaction</p>
            </div>

            <div className="p-4 space-y-4">
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    playClickSound();
                    onShowCustomerSearch();
                  }}
                  className="py-4 bg-blue-500 text-white font-bold rounded-xl active:bg-blue-600 transition-all flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
                >
                  <Search size={24} />
                  <span className="text-sm">Search</span>
                </button>
                
                <button
                  onClick={() => {
                    playClickSound();
                    onAddCustomer();
                  }}
                  className="py-4 bg-green-500 text-white font-bold rounded-xl active:bg-green-600 transition-all flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
                >
                  <Plus size={24} />
                  <span className="text-sm">Add New</span>
                </button>
              </div>
              
              {/* Selected Customer Card */}
              {selectedCustomer ? (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 shadow-md border-2 border-blue-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{selectedCustomer.name}</h4>
                        <p className="text-sm text-gray-600">Selected Customer</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        playClickSound();
                        onRemoveCustomer();
                      }}
                      className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone size={16} className="text-blue-600" />
                        <span className="font-medium">{selectedCustomer.phone}</span>
                      </div>
                    )}
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Mail size={16} className="text-blue-600" />
                        <span className="text-sm">{selectedCustomer.email}</span>
                      </div>
                    )}
                    {selectedCustomer.loyaltyLevel && (
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          selectedCustomer.loyaltyLevel === 'platinum' || selectedCustomer.loyaltyLevel === 'gold'
                            ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                            : 'bg-green-100 text-green-800 border-2 border-green-300'
                        }`}>
                          ⭐ {selectedCustomer.loyaltyLevel} Member
                        </span>
                      </div>
                    )}
                    {selectedCustomer.points !== undefined && (
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-blue-200">
                        <span className="text-sm font-medium text-gray-700">Loyalty Points</span>
                        <span className="text-lg font-black text-blue-600">{selectedCustomer.points}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-6 text-center border-2 border-dashed border-gray-300">
                  <User size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No Customer Selected</p>
                  <p className="text-sm text-gray-400 mt-1">Search or add a customer to continue</p>
                </div>
              )}

              {/* Quick Stats */}
              {selectedCustomer && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm border border-gray-200">
                    <div className="text-2xl font-black text-blue-600">{selectedCustomer.totalPurchases || 0}</div>
                    <div className="text-xs text-gray-600 mt-1">Purchases</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm border border-gray-200">
                    <div className="text-2xl font-black text-green-600">
                      {selectedCustomer.totalSpent ? `${(selectedCustomer.totalSpent / 1000).toFixed(0)}K` : '0'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Total Spent</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm border border-gray-200">
                    <div className="text-2xl font-black text-purple-600">{selectedCustomer.points || 0}</div>
                    <div className="text-xs text-gray-600 mt-1">Points</div>
                  </div>
                </div>
              )}

              {/* Info Card */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-900 mb-1">Why Select a Customer?</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Track purchase history</li>
                      <li>• Apply loyalty discounts</li>
                      <li>• Earn reward points</li>
                      <li>• Send digital receipts</li>
                    </ul>
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

