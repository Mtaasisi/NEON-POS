import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, XCircle, Phone, Crown, Search, Plus, Percent, DollarSign, Edit3, CreditCard, Repeat, FileText, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import GlassCard from '../../../../features/shared/components/ui/GlassCard';
import VariantCartItem from './VariantCartItem';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';

interface Customer {
  id: string;
  name: string;
  phone: string;
  colorTag?: string;
  loyaltyLevel?: string;
  points: number;
}

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  totalPrice: number;
  variant?: any;
  image?: string;
}

interface POSCartSectionProps {
  cartItems: CartItem[];
  selectedCustomer: Customer | null;
  onRemoveCustomer: () => void;
  onShowCustomerSearch: () => void;
  onShowCustomerDetails: (customer: Customer) => void;
  onUpdateCartItemQuantity: (itemId: string, quantity: number) => void;
  onRemoveCartItem: (itemId: string) => void;
  onUpdateCartItemTags?: (itemId: string, tags: string[]) => void;
  onIMEISelect?: (item: CartItem) => void; // Callback to handle IMEI selection for cart items
  onApplyDiscount: (discountType: 'percentage' | 'fixed', value: number) => void;
  onProcessPayment: () => void;
  onShowInstallmentModal?: () => void;
  onShowTradeInModal?: () => void;
  onShowDiscountModal: () => void;
  onClearDiscount: () => void;
  onPreviewInvoice?: () => void;
  dynamicPricingEnabled?: boolean;
  totalAmount: number;
  discountAmount: number;
  discountPercentage?: number;
  currentDiscountType?: 'percentage' | 'fixed';
  taxAmount: number;
  taxRate: number;
  finalAmount: number;
  onEditCustomer?: (customer: Customer) => void;
  isTaxEnabled?: boolean;
}

const POSCartSection: React.FC<POSCartSectionProps> = ({
  cartItems,
  selectedCustomer,
  onRemoveCustomer,
  onShowCustomerSearch,
  onShowCustomerDetails,
  onUpdateCartItemQuantity,
  onRemoveCartItem,
  onUpdateCartItemTags,
  onIMEISelect,
  onApplyDiscount,
  onProcessPayment,
  onShowInstallmentModal,
  onShowTradeInModal,
  onShowDiscountModal,
  onClearDiscount,
  onPreviewInvoice,
  dynamicPricingEnabled = false,
  totalAmount,
  discountAmount,
  discountPercentage = 0,
  currentDiscountType,
  taxAmount,
  taxRate,
  finalAmount,
  onEditCustomer,
  isTaxEnabled = true
}) => {
  // Calculate total item count
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const { playClickSound, playPaymentSound, playDeleteSound } = usePOSClickSounds();
  
  // Track which item is expanded (only one at a time)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Track discount section expansion state
  const [isDiscountExpanded, setIsDiscountExpanded] = useState(false);

  // Track if a discount was recently applied (for auto-collapse logic)
  const [wasDiscountRecentlyApplied, setWasDiscountRecentlyApplied] = useState(false);

  // Format number with commas
  const formatNumberWithCommas = (value: string) => {
    if (!value) return '';
    // Remove any existing commas
    const number = value.replace(/,/g, '');
    // Add commas as thousand separators
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Parse number by removing commas
  const parseNumberValue = (value: string) => {
    return value.replace(/,/g, '');
  };

  // Inline discount input state
  const [inlineDiscountType, setInlineDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [inlineDiscountValue, setInlineDiscountValue] = useState('');
  
  // Reverse cart items so latest added appears at top
  const reversedCartItems = [...cartItems].reverse();
  
  // Auto-expand the latest added item (first item in reversed array)
  useEffect(() => {
    if (reversedCartItems.length > 0) {
      const latestItem = reversedCartItems[0];
      setExpandedItemId(latestItem.id);
    }
  }, [cartItems.length]);

  // Track when discount is applied
  useEffect(() => {
    if (discountAmount > 0) {
      setWasDiscountRecentlyApplied(true);
    }
  }, [discountAmount]);

  // Auto-collapse discount section only after a discount was applied and then cleared
  useEffect(() => {
    if (discountAmount === 0 && isDiscountExpanded && wasDiscountRecentlyApplied) {
      // Small delay to allow for visual feedback
      const timer = setTimeout(() => {
        setIsDiscountExpanded(false);
        setWasDiscountRecentlyApplied(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [discountAmount, isDiscountExpanded, wasDiscountRecentlyApplied]);
  
  // Handle toggle expand - close previous item when opening a new one
  const handleToggleExpand = (itemId: string) => {
    setExpandedItemId(prev => prev === itemId ? null : itemId);
  };

  return (
    <div className="lg:w-[450px] flex-shrink-0 pos-cart-section">
      <GlassCard className="p-6 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-6 flex-shrink-0">
          <div className="p-2 bg-green-50 rounded-lg">
            <ShoppingCart className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Shopping Cart</h2>
            <p className="text-sm text-gray-600">{cartItems.length} items in cart</p>
          </div>
        </div>

        {/* Customer Search Section - Fixed - Redesigned to match SetPricingModal */}
        <div className="flex-shrink-0 mb-6">
          {selectedCustomer ? (
            <div className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
              selectedCustomer.colorTag === 'vip' || selectedCustomer.loyaltyLevel === 'vip' || selectedCustomer.loyaltyLevel === 'premium'
                ? 'border-amber-300 hover:border-amber-400 hover:shadow-md' 
                : 'border-green-200 hover:border-green-300 hover:shadow-md'
            }`}>
              {/* Customer Header - Clickable */}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar with Status Badge */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                        selectedCustomer.colorTag === 'vip' || selectedCustomer.loyaltyLevel === 'vip' || selectedCustomer.loyaltyLevel === 'premium'
                          ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
                          : 'bg-gradient-to-br from-blue-500 to-blue-600'
                      }`}>
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Status Indicator */}
                      <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-md ${
                        selectedCustomer.colorTag === 'vip' || selectedCustomer.loyaltyLevel === 'vip' || selectedCustomer.loyaltyLevel === 'premium'
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`}>
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900 truncate">
                          {selectedCustomer.name}
                        </h3>
                        {/* Status Badge */}
                        {selectedCustomer.colorTag === 'vip' || selectedCustomer.loyaltyLevel === 'vip' || selectedCustomer.loyaltyLevel === 'premium' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm flex-shrink-0">
                            <Crown className="w-3 h-3" />
                            VIP
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="truncate">{selectedCustomer.phone}</span>
                      </div>
                      {/* Points Badge */}
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 w-fit">
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                        <span className="text-xs font-semibold text-blue-700">{selectedCustomer.points || 0} points</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        playClickSound();
                        onShowCustomerDetails(selectedCustomer);
                      }}
                      className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                      title="View customer details"
                    >
                      <User className="w-5 h-5" />
                    </button>
                    {onEditCustomer && (
                      <button
                        onClick={() => {
                          playClickSound();
                          onEditCustomer(selectedCustomer);
                        }}
                        className="p-2.5 text-green-600 hover:bg-green-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                        title="Edit customer information"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        playDeleteSound();
                        onRemoveCustomer();
                      }}
                      className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 text-sm font-medium text-white bg-red-500 hover:bg-red-600 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 shadow-lg"
                      title="Remove customer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => {
                playClickSound();
                onShowCustomerSearch();
              }}
              className="bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 rounded-xl border-2 border-dashed border-blue-300 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className="p-6 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
                    <Search className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Select Customer</h3>
                    <p className="text-sm text-gray-600">Choose a customer to continue</p>
                    <p className="text-xs text-gray-500 mt-2">Click here to select</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      playClickSound();
                      onShowCustomerSearch();
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Select Customer</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="my-4 border-t border-gray-200"></div>

        {/* Cart Items - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2" style={{ minHeight: 0 }}>
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cart is empty</h3>
              <p className="text-gray-600 mb-4">Add products to start a transaction</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3 mb-6">
                {reversedCartItems.map((item, index) => (
                  <VariantCartItem
                    key={item.id}
                    item={item}
                    onQuantityChange={(quantity) => onUpdateCartItemQuantity(item.id, quantity)}
                    onRemove={() => onRemoveCartItem(item.id)}
                    onTagsChange={onUpdateCartItemTags ? (tags) => onUpdateCartItemTags(item.id, tags) : undefined}
                    onIMEISelect={onIMEISelect}
                    variant="compact"
                    autoExpand={index === 0} // Auto-expand the latest added item (first in reversed array)
                    isExpanded={expandedItemId === item.id}
                    onToggleExpand={handleToggleExpand}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cart Summary - Compact Redesign with Larger Touch Targets */}
        {cartItems.length > 0 && (
          <div className="flex-shrink-0 border-t border-gray-200 pt-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
              {/* Summary Row - Larger Text */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 text-base">
                  <span className="text-gray-600 font-medium">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600 font-medium">Subtotal:</span>
                  <span className="font-bold text-gray-900">TZS {totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Collapsible Discount Section */}
              <div className="mb-4">
                  {/* Collapsed State - Compact Button */}
                  {!isDiscountExpanded ? (
                    <div className="relative">
                      <button
                        onClick={() => {
                          playClickSound();
                          setIsDiscountExpanded(true);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-300 hover:shadow-md ${
                          discountAmount > 0
                            ? 'bg-green-50 border-green-200 hover:bg-green-100'
                            : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Percent className={`w-5 h-5 ${discountAmount > 0 ? 'text-green-600' : 'text-orange-600'}`} />
                          <div className="text-left">
                            <span className="font-semibold text-gray-900">
                              {discountAmount > 0 ? 'Discount Applied' : 'Add Discount'}
                            </span>
                            {discountAmount > 0 && (
                              <div className="text-sm text-green-600 font-medium">
                                -TZS {discountAmount.toLocaleString()} ({currentDiscountType === 'percentage' ? `${discountPercentage}%` : 'fixed'})
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        </div>
                      </button>
                      {discountAmount > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playDeleteSound();
                            onClearDiscount();
                          }}
                          className="absolute top-2 right-12 inline-flex items-center justify-center w-9 h-9 text-sm font-medium text-white bg-red-500 hover:bg-red-600 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 shadow-lg"
                          title="Remove Discount"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            <line x1="10" x2="10" y1="11" y2="17"></line>
                            <line x1="14" x2="14" y1="11" y2="17"></line>
                          </svg>
                        </button>
                      )}
                    </div>
                ) : (
                    /* Expanded State - Full Discount Section */
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 overflow-hidden">
                      {/* Header with collapse button */}
                      <div className="flex items-center justify-between p-4 border-b border-orange-200">
                        <div className="flex items-center gap-2">
                          <Percent className="w-5 h-5 text-orange-600" />
                          <span className="font-semibold text-gray-900">Discount Options</span>
                        </div>
                  <button
                    onClick={() => {
                      playClickSound();
                            setIsDiscountExpanded(false);
                          }}
                          className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                          title="Collapse"
                        >
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        {discountAmount === 0 ? (
                          <>
                            {/* Type Toggle Buttons */}
                            <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
                              <button
                                onClick={() => {
                                  setInlineDiscountType('fixed');
                                  setInlineDiscountValue('');
                    }}
                                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                                  inlineDiscountType === 'fixed'
                                    ? 'bg-white text-orange-600 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                TZS
                              </button>
                              <button
                                onClick={() => {
                                  setInlineDiscountType('percentage');
                                  setInlineDiscountValue('');
                                }}
                                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                                  inlineDiscountType === 'percentage'
                                    ? 'bg-white text-orange-600 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                %
                              </button>
                            </div>

                            {/* Combined Input and Quick Actions */}
                            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 focus-within:border-orange-500 transition-colors">
                              {/* Input Field */}
                              <input
                                type="text"
                                value={formatNumberWithCommas(inlineDiscountValue)}
                                onChange={(e) => {
                                  // Only allow numbers and remove any non-numeric characters except commas
                                  const cleanedValue = e.target.value.replace(/[^0-9,]/g, '');
                                  setInlineDiscountValue(parseNumberValue(cleanedValue));
                                }}
                                placeholder="0"
                                className="w-full text-center text-3xl font-bold text-gray-900 bg-transparent border-none outline-none mb-3"
                                autoFocus
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    const applyBtn = e.currentTarget.parentElement?.parentElement?.parentElement?.querySelector('button[type="submit"]') as HTMLButtonElement;
                                    applyBtn?.click();
                                  }
                                }}
                              />

                              {/* Quick Actions Inside Field */}
                              {inlineDiscountType === 'percentage' && (
                                <div className="flex gap-2 justify-center">
                                  {[5, 10, 15, 20].map((percent) => (
                                    <button
                                      key={percent}
                                      onClick={() => {
                                        playClickSound();
                                        onApplyDiscount('percentage', percent.toString());
                                        setIsDiscountExpanded(false); // Collapse after applying
                                      }}
                                      className="px-3 py-1.5 bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-700 rounded-md text-sm font-medium transition-colors border border-gray-200"
                                    >
                                      {percent}%
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Apply Button - Primary Action */}
                            <div className="mt-4">
                              <button
                              type="submit"
                              onClick={() => {
                                playClickSound();
                                if (!inlineDiscountValue || parseFloat(inlineDiscountValue) <= 0) {
                                  return;
                                }
                                onApplyDiscount(inlineDiscountType, inlineDiscountValue);
                                setInlineDiscountValue('');
                                setIsDiscountExpanded(false); // Collapse after applying
                              }}
                              disabled={!inlineDiscountValue || parseFloat(inlineDiscountValue) <= 0}
                              className="w-full flex items-center justify-center gap-2 p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
                  >
                    <Percent className="w-5 h-5" />
                              Apply Discount
                            </button>
                            </div>
                          </>
                        ) : (
                          /* Show applied discount with option to edit */
                          <div className="bg-white p-3 rounded-lg border border-green-200">
                            <div className="text-center mb-2">
                              <span className="text-sm text-gray-600">
                                Currently Applied: {currentDiscountType === 'percentage' ? `${discountPercentage}% off` : 'Fixed discount'}
                              </span>
                            </div>
                            <div className="text-center mb-3">
                              <span className="text-2xl font-bold text-green-600">
                                -TZS {discountAmount.toLocaleString()}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                playClickSound();
                                // Pre-fill with current discount values for editing
                                setInlineDiscountType(currentDiscountType || 'fixed');
                                setInlineDiscountValue(currentDiscountType === 'percentage' ? discountPercentage.toString() : discountAmount.toString());
                                // Section stays expanded for editing
                              }}
                              className="w-full flex items-center justify-center gap-2 p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors text-sm font-medium"
                            >
                              <Edit3 className="w-4 h-4" />
                              Edit Discount
                  </button>
                          </div>
                        )}
                      </div>
                    </div>
                )}
                </div>

              {/* Tax - Larger Text */}
              {isTaxEnabled && (
                <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                  <span className="font-medium">Tax (VAT {taxRate}%):</span>
                  <span className="font-bold text-gray-900">TZS {taxAmount.toLocaleString()}</span>
                </div>
              )}
              
              {/* Total - Prominent & Larger */}
              <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-green-600">TZS {finalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Customer Warning - Larger */}
            {!selectedCustomer && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-4 mt-4">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-amber-900">Please select a customer to proceed</span>
              </div>
            )}

            {/* Action Buttons - Grid Layout with Larger Touch Targets */}
            <div className="grid grid-cols-2 gap-3">
                {/* Installment Plan Button */}
                {onShowInstallmentModal && (
                  <button
                    onClick={() => {
                      playClickSound();
                      onShowInstallmentModal();
                    }}
                    disabled={cartItems.length === 0 || !selectedCustomer}
                    className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-base"
                    title={!selectedCustomer ? "Please select a customer first" : cartItems.length === 0 ? "Add items to cart first" : "Create installment plan"}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="truncate">Installment</span>
                  </button>
                )}

                {/* Trade-In Button */}
                {onShowTradeInModal && (
                  <button
                    onClick={() => {
                      playClickSound();
                      onShowTradeInModal();
                    }}
                    disabled={cartItems.length === 0 || !selectedCustomer}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-base"
                    title={!selectedCustomer ? "Please select a customer first" : cartItems.length === 0 ? "Add items to cart first" : "Add trade-in device"}
                  >
                    <Repeat className="w-5 h-5" />
                    <span className="truncate">Trade-In</span>
                  </button>
                )}
              </div>

            {/* Preview Invoice Button - Show before payment */}
            {onPreviewInvoice && cartItems.length > 0 && (
              <button
                onClick={() => {
                  playClickSound();
                  onPreviewInvoice();
                }}
                disabled={!selectedCustomer}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg mt-3 flex items-center justify-center gap-2"
                title={!selectedCustomer ? "Please select a customer first to preview invoice" : "Preview invoice with current prices"}
              >
                <FileText className="w-5 h-5" />
                Preview Invoice
              </button>
            )}

            {/* Process Payment Button - Full Width, Prominent & Larger */}
            <button
              onClick={() => {
                playPaymentSound();
                onProcessPayment();
              }}
              disabled={cartItems.length === 0 || !selectedCustomer}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl mt-3 text-lg"
              title={!selectedCustomer ? "Please select a customer first" : cartItems.length === 0 ? "Add items to cart first" : "Process payment"}
            >
              Process Payment
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default POSCartSection;
