import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, XCircle, Phone, Crown, Search, Plus, Percent, DollarSign, Edit3, CreditCard, Repeat, FileText } from 'lucide-react';
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
  
  // Reverse cart items so latest added appears at top
  const reversedCartItems = [...cartItems].reverse();
  
  // Auto-expand the latest added item (first item in reversed array)
  useEffect(() => {
    if (reversedCartItems.length > 0) {
      const latestItem = reversedCartItems[0];
      setExpandedItemId(latestItem.id);
    }
  }, [cartItems.length]);
  
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
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm flex-shrink-0">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            Active
                          </span>
                        )}
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
                      onClick={() => {
                        playDeleteSound();
                        onRemoveCustomer();
                      }}
                      className="p-2.5 text-red-600 hover:bg-red-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                      title="Remove customer"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => {
                  playClickSound();
                  onShowCustomerSearch();
                }}
                className="w-full flex items-center justify-center gap-3 p-4 text-base border-2 border-blue-200 rounded-xl bg-white text-gray-900 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
              >
                <Search className="w-5 h-5 text-blue-500" />
                <span className="text-gray-600">Search Customer</span>
                <Plus className="w-4 h-4 text-blue-500" />
              </button>
            </div>
          )}
        </div>

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
              {/* Dynamic Pricing Display */}
              {dynamicPricingEnabled && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-yellow-800">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    Dynamic pricing is active
                  </div>
                </div>
              )}

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
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              {/* Summary Row - Larger Text */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 text-base">
                  <span className="text-gray-600 font-medium">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600 font-medium">Subtotal:</span>
                  <span className="font-bold text-gray-900">TZS {totalAmount.toLocaleString()}</span>
                </div>
                {/* Discount Button - Larger */}
                {discountAmount > 0 ? (
                  <button
                    onClick={() => {
                      playClickSound();
                      onShowDiscountModal();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 hover:bg-green-100 transition-colors"
                    title="Edit Discount"
                  >
                    <Percent className="w-4 h-4" />
                    <span className="text-sm font-semibold">-{discountAmount.toLocaleString()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playDeleteSound();
                        onClearDiscount();
                      }}
                      className="ml-1 p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Remove Discount"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      playClickSound();
                      onShowDiscountModal();
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Percent className="w-5 h-5" />
                    <span className="text-sm font-medium">Discount</span>
                  </button>
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
              <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-green-600">TZS {finalAmount.toLocaleString()}</span>
              </div>

              {/* Customer Warning - Larger */}
              {!selectedCustomer && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-4">
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
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default POSCartSection;
