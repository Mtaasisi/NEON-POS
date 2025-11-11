import React from 'react';
import { ShoppingCart, User, XCircle, Phone, Crown, Search, Plus, Percent, DollarSign, Edit3, CreditCard, Repeat } from 'lucide-react';
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
  onApplyDiscount: (discountType: 'percentage' | 'fixed', value: number) => void;
  onProcessPayment: () => void;
  onShowInstallmentModal?: () => void;
  onShowTradeInModal?: () => void;
  onShowDiscountModal: () => void;
  onClearDiscount: () => void;
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
  onApplyDiscount,
  onProcessPayment,
  onShowInstallmentModal,
  onShowTradeInModal,
  onShowDiscountModal,
  onClearDiscount,
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

        {/* Customer Search Section */}
        <div className="mb-6">
          {selectedCustomer ? (
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:scale-110 transition-transform duration-300">
                      {selectedCustomer.name.charAt(0)}
                    </div>
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm animate-bounce ${
                      selectedCustomer.colorTag === 'vip' || selectedCustomer.loyaltyLevel === 'vip' || selectedCustomer.loyaltyLevel === 'premium'
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
                      <span className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 hover:scale-105 ${
                        selectedCustomer.colorTag === 'vip' || selectedCustomer.loyaltyLevel === 'vip' || selectedCustomer.loyaltyLevel === 'premium'
                          ? 'bg-amber-100 text-amber-800 border-2 border-amber-300 hover:bg-amber-200' 
                          : 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300 hover:bg-emerald-200'
                      }`}>
                        {selectedCustomer.colorTag === 'vip' || selectedCustomer.loyaltyLevel === 'vip' || selectedCustomer.loyaltyLevel === 'premium' ? 'VIP' : 'Active'}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 bg-white px-3 py-1 rounded-full border-2 border-gray-200 shadow-sm hover:scale-105 hover:border-blue-300 transition-all duration-300">
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                        {selectedCustomer.points} points
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      playClickSound();
                      onShowCustomerDetails(selectedCustomer);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
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
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
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
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 hover:rotate-6"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
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

        <div className="flex-1 overflow-y-auto">
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
                {cartItems.map((item) => (
                  <VariantCartItem
                    key={item.id}
                    item={item}
                    onQuantityChange={(quantity) => onUpdateCartItemQuantity(item.id, quantity)}
                    onRemove={() => onRemoveCartItem(item.id)}
                    onTagsChange={onUpdateCartItemTags ? (tags) => onUpdateCartItemTags(item.id, tags) : undefined}
                    variant="compact"
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cart Summary */}
        {cartItems.length > 0 && (
          <div className="flex-shrink-0 border-t-2 border-gray-300 pt-4 space-y-3">
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
              {/* Quantity */}
              <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                <span className="text-base font-bold text-gray-900">Quantity:</span>
                <span className="text-lg font-extrabold text-gray-900">{totalItems}</span>
              </div>
              
              {/* Subtotal with item count */}
              <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                <span className="text-base font-bold text-gray-900">Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'}):</span>
                <span className="text-lg font-extrabold text-gray-900">TZS {totalAmount.toLocaleString()}</span>
              </div>
              
              {/* Discount Section */}
              <div className="space-y-2">
                {discountAmount > 0 ? (
                  <div className="flex items-center justify-between p-3 bg-green-100 border-2 border-green-300 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-200 rounded-lg">
                        <Percent className="w-5 h-5 text-green-700" />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-green-900">
                          Discount Applied {discountPercentage > 0 && `(${discountPercentage}%)`}
                        </div>
                        <div className="text-sm font-bold text-green-700">-TZS {discountAmount.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          playClickSound();
                          onShowDiscountModal();
                        }}
                        className="p-2 text-green-700 hover:text-green-800 hover:bg-green-200 rounded-lg transition-colors"
                        title="Edit Discount"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          playDeleteSound();
                          onClearDiscount();
                        }}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                        title="Remove Discount"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      playClickSound();
                      onShowDiscountModal();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-4 border-3 border-dashed border-purple-300 rounded-xl text-purple-700 hover:border-purple-500 hover:text-purple-800 hover:bg-purple-100 transition-all duration-200 group shadow-sm bg-purple-50"
                  >
                    <div className="p-1.5 bg-purple-200 group-hover:bg-purple-300 rounded-lg transition-colors">
                      <Percent className="w-5 h-5" />
                    </div>
                    <span className="text-base font-extrabold">Add Discount</span>
                  </button>
                )}
              </div>

              {/* Tax/VAT Line - Only show if tax is enabled */}
              {isTaxEnabled && (
                <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                  <span className="text-base font-bold text-gray-900">Tax (VAT {taxRate}%):</span>
                  <span className="text-lg font-extrabold text-gray-900">TZS {taxAmount.toLocaleString()}</span>
                </div>
              )}
              
              {/* Total */}
              <div className="flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-3 shadow-md">
                <span className="text-xl font-extrabold text-gray-900">Total:</span>
                <span className="text-2xl font-black text-green-600">TZS {finalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Customer Selection Warning */}
            {!selectedCustomer && (
              <div className="p-4 bg-gradient-to-r from-amber-100 to-orange-100 border-3 border-amber-400 rounded-xl shadow-md">
                <div className="flex items-center gap-3 text-base text-amber-900">
                  <div className="w-3 h-3 bg-amber-600 rounded-full animate-pulse"></div>
                  <span className="font-extrabold">Please select a customer to proceed</span>
                </div>
              </div>
            )}

            {/* Installment Plan Button */}
            {onShowInstallmentModal && (
              <button
                onClick={() => {
                  playClickSound();
                  onShowInstallmentModal();
                }}
                disabled={cartItems.length === 0 || !selectedCustomer}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                title={!selectedCustomer ? "Please select a customer first" : cartItems.length === 0 ? "Add items to cart first" : "Create installment plan"}
              >
                <CreditCard className="w-5 h-5" />
                Installment Plan
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
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                title={!selectedCustomer ? "Please select a customer first" : cartItems.length === 0 ? "Add items to cart first" : "Add trade-in device"}
              >
                <Repeat className="w-5 h-5" />
                Add Trade-In
              </button>
            )}

            {/* Process Payment Button */}
            <button
              onClick={() => {
                playPaymentSound();
                onProcessPayment();
              }}
              disabled={cartItems.length === 0 || !selectedCustomer}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
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
