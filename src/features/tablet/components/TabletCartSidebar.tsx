import React, { useState } from 'react';
import { X, Plus, Minus, CreditCard, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from '../../lats/lib/format';

interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableQuantity: number;
  image?: string;
}

interface TabletCartSidebarProps {
  cart: CartItem[];
  cartSubtotal: number;
  discountAmount: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  cartTax: number;
  cartTotal: number;
  notes: string;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveFromCart: (itemId: string) => void;
  onUpdateDiscount: (discount: number) => void;
  onUpdateDiscountType: (type: 'percentage' | 'fixed') => void;
  onUpdateNotes: (notes: string) => void;
  onProceedToPayment: () => void;
  sizes: any;
}

const TabletCartSidebar: React.FC<TabletCartSidebarProps> = ({
  cart,
  cartSubtotal,
  discountAmount,
  discount,
  discountType,
  cartTax,
  cartTotal,
  notes,
  onUpdateQuantity,
  onRemoveFromCart,
  onUpdateDiscount,
  onUpdateDiscountType,
  onUpdateNotes,
  onProceedToPayment,
  sizes,
}) => {
  const TAX_RATE = 18;
  const [showDiscount, setShowDiscount] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Cart Header */}
      <div
        className="border-b border-gray-200 bg-gray-50"
        style={{
          padding: `${sizes.spacing6}px ${sizes.spacing6}px`,
        }}
      >
        <h2 style={{ fontSize: `${sizes.textXl}px` }} className="font-bold text-gray-900">
          Cart ({cart.length})
        </h2>
      </div>

      {/* Cart Items */}
      <div
        className="flex-1 overflow-y-auto min-h-0"
        style={{ overscrollBehavior: 'contain' }}
      >
        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard size={32} className="text-gray-400" />
              </div>
              <p style={{ fontSize: `${sizes.textBase}px` }} className="text-gray-500">
                Your cart is empty
              </p>
              <p style={{ fontSize: `${sizes.textSm}px` }} className="text-gray-400 mt-1">
                Add items from the left panel
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {cart.map((item, index) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-100 p-4"
              >
                <div className="flex space-x-3">
                  {/* Product Image */}
                  {item.image && (
                    <div className="flex-shrink-0">
                      <div
                        className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden"
                        style={{ borderRadius: `${sizes.radiusMd}px` }}
                      >
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4
                      style={{ fontSize: `${sizes.textBase}px` }}
                      className="font-semibold text-gray-900 truncate"
                    >
                      {item.productName}
                    </h4>
                    {item.variantName !== 'Default' && (
                      <p
                        style={{ fontSize: `${sizes.textSm}px` }}
                        className="text-gray-500 truncate"
                      >
                        {item.variantName}
                      </p>
                    )}
                    <p
                      style={{ fontSize: `${sizes.textSm}px` }}
                      className="text-gray-600 mt-1"
                    >
                      {format.currency(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <Minus size={16} className="text-gray-600" />
                    </button>

                    <span
                      style={{ fontSize: `${sizes.textBase}px` }}
                      className="font-semibold text-gray-900 min-w-[2rem] text-center"
                    >
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      disabled={item.quantity >= item.availableQuantity}
                      className="w-8 h-8 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <Plus size={16} className="text-white disabled:text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Item Total and Remove */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span
                    style={{ fontSize: `${sizes.textBase}px` }}
                    className="font-semibold text-gray-900"
                  >
                    {format.currency(item.totalPrice)}
                  </span>

                  <button
                    onClick={() => onRemoveFromCart(item.id)}
                    className="w-8 h-8 bg-red-50 hover:bg-red-100 rounded-full flex items-center justify-center transition-colors"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <X size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discount Section (collapsible) */}
      {cart.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <button
            type="button"
            className="w-full flex items-center justify-between"
            onClick={() => setShowDiscount((v) => !v)}
          >
            <span
              style={{ fontSize: `${sizes.textBase}px` }}
              className="font-semibold text-gray-900"
            >
              Discount
            </span>
            {showDiscount ? (
              <ChevronUp size={18} className="text-gray-500" />
            ) : (
              <ChevronDown size={18} className="text-gray-500" />
            )}
          </button>

          {showDiscount && (
            <div className="space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <span style={{ fontSize: `${sizes.textBase}px` }} className="font-semibold text-gray-900">
                  Type
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => onUpdateDiscountType('percentage')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      discountType === 'percentage'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    %
                  </button>
                  <button
                    onClick={() => onUpdateDiscountType('fixed')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      discountType === 'fixed'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    TSh
                  </button>
                </div>
              </div>

              <input
                type="number"
                value={discount}
                onChange={(e) => onUpdateDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder={discountType === 'percentage' ? '0' : '0'}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontSize: `${sizes.textBase}px` }}
              />

              {discountAmount > 0 && (
                <p style={{ fontSize: `${sizes.textSm}px` }} className="text-green-600 font-medium">
                  Discount: -{format.currency(discountAmount)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Order Notes (collapsible, always visible; disabled when no items) */}
      <div className="border-t border-gray-200 bg-white p-4">
        <button
          type="button"
          className="w-full flex items-center justify-between"
          onClick={() => setShowNotes((v) => !v)}
        >
          <span
            style={{ fontSize: `${sizes.textBase}px` }}
            className="font-semibold text-gray-900"
          >
            Order Notes (Optional)
          </span>
          {showNotes ? (
            <ChevronUp size={18} className="text-gray-500" />
          ) : (
            <ChevronDown size={18} className="text-gray-500" />
          )}
        </button>

        {showNotes && (
          <div className="mt-3">
            <textarea
              id="tablet-cart-notes"
              value={notes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              placeholder="Add any special instructions..."
              rows={2}
              disabled={cart.length === 0}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                cart.length === 0
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-50 border-gray-200 text-gray-900'
              }`}
              style={{ fontSize: `${sizes.textBase}px` }}
            />
            {cart.length === 0 && (
              <p className="mt-2 text-xs text-gray-500">
                Add an item to enable order notes.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cart Summary and Payment */}
      {cart.length > 0 && (
        <div className="border-t border-gray-200 bg-white p-4 sticky bottom-0">
          {/* Summary */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span style={{ fontSize: `${sizes.textBase}px` }} className="text-gray-600">Subtotal</span>
              <span style={{ fontSize: `${sizes.textBase}px` }} className="font-semibold text-gray-900">
                {format.currency(cartSubtotal)}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span style={{ fontSize: `${sizes.textBase}px` }} className="text-green-600">Discount</span>
                <span style={{ fontSize: `${sizes.textBase}px` }} className="font-semibold text-green-600">
                  -{format.currency(discountAmount)}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span style={{ fontSize: `${sizes.textBase}px` }} className="text-gray-600">Tax ({TAX_RATE}%)</span>
              <span style={{ fontSize: `${sizes.textBase}px` }} className="font-semibold text-gray-900">
                {format.currency(cartTax)}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between">
                <span style={{ fontSize: `${sizes.textXl}px` }} className="font-bold text-gray-900">Total</span>
                <span style={{ fontSize: `${sizes.textXl}px` }} className="font-bold text-gray-900">
                  {format.currency(cartTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <button
            onClick={onProceedToPayment}
            className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
            style={{
              WebkitTapHighlightColor: 'transparent',
              fontSize: `${sizes.textLg}px`,
            }}
          >
            <CreditCard size={20} />
            <span>Proceed to Payment</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TabletCartSidebar;