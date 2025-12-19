import React, { useState } from 'react';
import { X, Plus, Minus, CreditCard, ChevronDown, ChevronUp, Truck, Printer, Trash2, MapPin, Clock, Phone, FileText, Users } from 'lucide-react';
import { format } from '../../lats/lib/format';
// Using regular buttons instead of GlassButton/GlassCard for compatibility

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
  deliveryData?: any;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveFromCart: (itemId: string) => void;
  onUpdateDiscount: (discount: number) => void;
  onUpdateDiscountType: (type: 'percentage' | 'fixed') => void;
  onUpdateNotes: (notes: string) => void;
  onProceedToPayment: () => void;
  onClearCart: () => void;
  onDeliveryConfirm?: (deliveryData: any) => void;
  onAdvancedDelivery?: () => void; // For advanced delivery section
  customerSelected?: boolean;
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
  deliveryData,
  onUpdateQuantity,
  onRemoveFromCart,
  onUpdateDiscount,
  onUpdateDiscountType,
  onUpdateNotes,
  onProceedToPayment,
  onClearCart,
  onDeliveryConfirm,
  onAdvancedDelivery,
  customerSelected = false,
  sizes,
}) => {
  const TAX_RATE = 18;
  const [showDiscount, setShowDiscount] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);
  const [heldOrders, setHeldOrders] = useState<any[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Reduce text sizes slightly for cart contents
  const cartSizes = {
    ...sizes,
    textXs: sizes.textXs * 0.8,
    textSm: sizes.textSm * 0.8,
    textBase: sizes.textBase * 0.8,
    textLg: sizes.textLg * 0.8,
    textXl: sizes.textXl * 0.8,
    text2xl: sizes.text2xl * 0.8,
    text3xl: sizes.text3xl * 0.8,
  };

  // Delivery modal functionality
  const handleDeliverySetup = () => {
    setShowDeliveryModal(true);
  };

  const handleDeliveryConfirm = (deliveryData: any) => {
    // Call parent callback to update delivery data
    if (onDeliveryConfirm) {
      onDeliveryConfirm(deliveryData);
    }
    setShowDeliveryModal(false);
  };

  // Hold Order functionality
  const handleHoldOrder = () => {
    if (cart.length === 0) {
      alert('Cannot hold an empty cart');
      return;
    }

    const orderId = `held_${Date.now()}`;
    const heldOrder = {
      id: orderId,
      cart: [...cart],
      cartSubtotal,
      discount,
      discountType,
      cartTax,
      cartTotal,
      notes,
      customerSelected,
      heldAt: new Date().toLocaleString(),
      orderNumber: Math.floor(Math.random() * 10000) + 1
    };

    setHeldOrders(prev => [...prev, heldOrder]);
    onClearCart();
    alert(`Order #${heldOrder.orderNumber} has been held`);
  };

  // Print functionality
  const handlePrint = () => {
    if (cart.length === 0) {
      alert('No items in cart to print');
      return;
    }

    // Create a simple receipt
    const receiptContent = generateReceipt();
    printReceipt(receiptContent);
  };

  const generateReceipt = () => {
    let receipt = `DUKANI POS RECEIPT\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n`;
    receipt += `Order #${Math.floor(Math.random() * 10000) + 1}\n\n`;

    receipt += `Items:\n`;
    cart.forEach(item => {
      receipt += `${item.productName} (${item.variantName})\n`;
      receipt += `  ${item.quantity} x ${format.currency(item.unitPrice)} = ${format.currency(item.totalPrice)}\n`;
    });

    receipt += `\nSubtotal: ${format.currency(cartSubtotal)}\n`;
    if (discountAmount > 0) {
      receipt += `Discount: -${format.currency(discountAmount)}\n`;
    }
    receipt += `Tax (${TAX_RATE}%): ${format.currency(cartTax)}\n`;
    if (deliveryData?.fee > 0) {
      receipt += `Delivery Fee: ${format.currency(deliveryData.fee)}\n`;
    }
    receipt += `Total: ${format.currency(cartTotal)}\n\n`;

    if (notes) {
      receipt += `Notes: ${notes}\n\n`;
    }

    receipt += `Thank you for your business!\n`;

    return receipt;
  };

  const printReceipt = (content: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body { font-family: monospace; font-size: 12px; margin: 20px; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <pre>${content}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Recall Order functionality
  const handleRecallOrder = () => {
    if (cart.length > 0) {
      const confirmed = window.confirm('Current cart will be cleared. Continue?');
      if (!confirmed) return;
    }
    setShowHeldOrdersModal(true);
  };

  const handleRecallOrderConfirm = (orderId: string) => {
    const order = heldOrders.find(o => o.id === orderId);
    if (order) {
      // Clear current cart and restore held order
      onClearCart();

      // Restore cart items (this might need adjustment based on how onUpdateQuantity works)
      // For now, we'll just log it - you might need to pass a different prop for restoring cart
      console.log('Recalling order:', order);

      // Remove from held orders
      setHeldOrders(prev => prev.filter(o => o.id !== orderId));
      setShowHeldOrdersModal(false);

      alert(`Order #${order.orderNumber} has been recalled`);
    }
  };

  // Customer functionality
  const handleCustomerSelect = () => {
    setShowCustomerModal(true);
  };

  const handleCustomerConfirm = (customer: any) => {
    console.log('Customer selected:', customer);
    setShowCustomerModal(false);
    // You might want to update the order with customer information
  };

  // Delivery Modal Component
  const DeliveryModal = () => {
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryPhone, setDeliveryPhone] = useState('');
    const [deliveryTime, setDeliveryTime] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(5000); // Default delivery fee

    const handleConfirm = () => {
      const deliveryData = {
        address: deliveryAddress,
        phone: deliveryPhone,
        time: deliveryTime,
        notes: deliveryNotes,
        fee: deliveryFee
      };
      handleDeliveryConfirm(deliveryData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Delivery Setup</h3>
            <button
              onClick={() => setShowDeliveryModal(false)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Delivery Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter delivery address"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="tel"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder="Customer phone number"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Delivery Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Time
              </label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-3 text-gray-400" />
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select delivery time</option>
                  <option value="asap">ASAP (30-45 mins)</option>
                  <option value="1hour">Within 1 hour</option>
                  <option value="2hours">Within 2 hours</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                </select>
              </div>
            </div>

            {/* Delivery Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Notes
              </label>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Special delivery instructions..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Delivery Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Fee
              </label>
              <input
                type="number"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
                min="0"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirm}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Confirm Delivery Setup
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Held Orders Modal Component
  const HeldOrdersModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Held Orders</h3>
            <button
              onClick={() => setShowHeldOrdersModal(false)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {heldOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No held orders</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {heldOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">{order.heldAt}</p>
                    </div>
                    <p className="font-semibold text-gray-900">{format.currency(order.cartTotal)}</p>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {order.cart.length} item{order.cart.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={() => handleRecallOrderConfirm(order.id)}
                    className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                  >
                    Recall Order
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Customer Modal Component
  const CustomerModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Customer</h3>
            <button
              onClick={() => setShowCustomerModal(false)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="text-center py-8">
              <Users size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Customer selection would be implemented here</p>
              <p className="text-sm text-gray-400 mt-2">This is a placeholder for customer selection functionality</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleCustomerConfirm({ name: 'Walk-in Customer', phone: 'N/A' });
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Cart Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 style={{ fontSize: `${cartSizes.textXl}px` }} className="font-bold text-gray-900">
          Cart
        </h2>
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50"
            title="Clear Cart"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
            <div className="text-6xl mb-4">🛒</div>
            <p style={{ fontSize: `${cartSizes.textLg}px` }} className="font-medium">Your cart is empty</p>
            <p style={{ fontSize: `${cartSizes.textBase}px` }} className="text-gray-400 mt-1">Add some products to get started</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {cart.map((item) => {
              console.log('🎯 [TabletCartSidebar] Rendering cart item:', {
                id: item.id,
                productName: item.productName,
                variantName: item.variantName,
                unitPrice: item.unitPrice,
                quantity: item.quantity
              });

              return (
                <div key={item.id} className="bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all duration-200 p-4 relative shadow-sm">
                  {/* Product Image */}
                  {item.image && (
                    <div className="absolute top-4 left-4 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Product Header */}
                  <div className="flex items-start justify-between mb-3 pl-16">
                  <div className="flex-1 min-w-0">
                    <h4 style={{ fontSize: `${cartSizes.textBase}px` }} className="font-semibold text-gray-900 leading-tight">
                      {item.productName || 'Unknown Product'}
                    </h4>
                    {(item.variantName && item.variantName !== 'Default') && (
                      <p style={{ fontSize: `${cartSizes.textXs}px` }} className="text-gray-600 mt-1 font-medium">
                        {item.variantName}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveFromCart(item.id)}
                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Remove item"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Price Information */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-baseline gap-2">
                    <span style={{ fontSize: `${cartSizes.textSm}px` }} className="font-medium text-gray-700">
                      {format.currency(item.unitPrice)}
                    </span>
                    <span style={{ fontSize: `${cartSizes.textXs}px` }} className="text-gray-500">
                      each
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: `${cartSizes.textXs}px` }} className="text-gray-500">
                        Total:
                      </span>
                      <span style={{ fontSize: `${cartSizes.textBase}px` }} className="font-bold text-gray-900">
                        {format.currency(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-4 py-2 border border-blue-100 shadow-sm">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="w-8 h-8 flex items-center justify-center bg-white hover:bg-blue-50 text-blue-600 rounded-lg transition-all duration-200 shadow-sm"
                      disabled={item.quantity <= 1}
                    >
                      <Minus size={14} />
                    </button>
                    <div className="flex items-center justify-center min-w-[44px] px-3">
                      <span style={{ fontSize: `${cartSizes.textBase}px` }} className="font-bold text-gray-900">
                        {item.quantity}
                      </span>
                    </div>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="w-8 h-8 flex items-center justify-center bg-white hover:bg-blue-50 text-blue-600 rounded-lg transition-all duration-200 shadow-sm"
                      disabled={item.quantity >= item.availableQuantity}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Discount controls moved to payment modal */}

      {/* Order Options (collapsible, always visible; disabled when no items) */}
      <div className="border-t border-gray-200 bg-white p-3">
        <button
          type="button"
          className="w-full flex items-center justify-between"
          onClick={() => setShowNotes((v) => !v)}
        >
          <span
            style={{ fontSize: `${cartSizes.textBase}px` }}
            className="font-semibold text-gray-900"
          >
            Order Options
          </span>
          {showNotes ? (
            <ChevronUp size={18} className="text-gray-500" />
          ) : (
            <ChevronDown size={18} className="text-gray-500" />
          )}
        </button>

        {showNotes && (
          <div className="mt-2 space-y-3">
            {/* Order Notes */}
            <div>
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
                style={{ fontSize: `${cartSizes.textBase}px` }}
              />
              {cart.length === 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Add an item to enable order notes.
                </p>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-600 mb-3 font-medium">Quick Actions</p>
              <div className="grid grid-cols-3 gap-2">
                {/* Hold Order Button */}
                <button
                  onClick={handleHoldOrder}
                  disabled={cart.length === 0}
                  className="flex flex-col items-center justify-center p-2 bg-white hover:bg-yellow-50 active:bg-yellow-100 rounded-lg border border-gray-200 transition-all duration-150 group disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Clock size={18} className="text-yellow-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span style={{ fontSize: `${cartSizes.textXs}px` }} className="text-gray-700 font-medium text-center">Hold Order</span>
                </button>

                {/* Recall Order Button */}
                <button
                  onClick={handleRecallOrder}
                  disabled={heldOrders.length === 0}
                  className="flex flex-col items-center justify-center p-2 bg-white hover:bg-green-50 active:bg-green-100 rounded-lg border border-gray-200 transition-all duration-150 group disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <FileText size={18} className="text-green-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span style={{ fontSize: `${cartSizes.textXs}px` }} className="text-gray-700 font-medium text-center">Recall Order</span>
                </button>

                {/* Customer Button */}
                <button
                  onClick={handleCustomerSelect}
                  className="flex flex-col items-center justify-center p-2 bg-white hover:bg-purple-50 active:bg-purple-100 rounded-lg border border-gray-200 transition-all duration-150 group"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Users size={18} className="text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span style={{ fontSize: `${cartSizes.textXs}px` }} className="text-gray-700 font-medium text-center">Customer</span>
                </button>

                {/* Delivery Button */}
                <button
                  onClick={() => {
                    if (onAdvancedDelivery) {
                      onAdvancedDelivery(); // Use advanced delivery section
                    } else {
                      handleDeliverySetup(); // Fallback to simple modal
                    }
                  }}
                  className="flex flex-col items-center justify-center p-2 bg-white hover:bg-orange-50 active:bg-orange-100 rounded-lg border border-gray-200 transition-all duration-150 group"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Truck size={18} className="text-orange-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span style={{ fontSize: `${cartSizes.textXs}px` }} className="text-gray-700 font-medium text-center">Delivery</span>
                </button>

                {/* Print Button */}
                <button
                  onClick={handlePrint}
                  disabled={cart.length === 0}
                  className="flex flex-col items-center justify-center p-2 bg-white hover:bg-blue-50 active:bg-blue-100 rounded-lg border border-gray-200 transition-all duration-150 group disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Printer size={18} className="text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span style={{ fontSize: `${cartSizes.textXs}px` }} className="text-gray-700 font-medium text-center">Print</span>
                </button>

                {/* Clear Cart Button */}
                <button
                  onClick={() => {
                    if (cart.length > 0) {
                      const confirmed = window.confirm('Are you sure you want to clear the entire cart?');
                      if (confirmed) {
                        onClearCart();
                      }
                    }
                  }}
                  disabled={cart.length === 0}
                  className="flex flex-col items-center justify-center p-2 bg-white hover:bg-red-50 active:bg-red-100 rounded-lg border border-gray-200 transition-all duration-150 group disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Trash2 size={18} className="text-red-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span style={{ fontSize: `${cartSizes.textXs}px` }} className="text-gray-700 font-medium text-center">Clear Cart</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cart Summary and Payment */}
      {cart.length > 0 && (
        <div className="border-t border-gray-200 bg-white p-3 mb-8">
          {/* Summary */}
          <div className="space-y-2 mb-3">
            <div className="flex justify-between">
              <span style={{ fontSize: `${cartSizes.textBase}px` }} className="text-gray-600">Subtotal</span>
              <span style={{ fontSize: `${cartSizes.textBase}px` }} className="font-semibold text-gray-900">
                {format.currency(cartSubtotal)}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span style={{ fontSize: `${cartSizes.textBase}px` }} className="text-green-600">Discount</span>
                <span style={{ fontSize: `${cartSizes.textBase}px` }} className="font-semibold text-green-600">
                  -{format.currency(discountAmount)}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span style={{ fontSize: `${cartSizes.textBase}px` }} className="text-gray-600">Tax ({TAX_RATE}%)</span>
              <span style={{ fontSize: `${cartSizes.textBase}px` }} className="font-semibold text-gray-900">
                {format.currency(cartTax)}
              </span>
            </div>

            {deliveryData?.fee > 0 && (
              <div className="flex justify-between">
                <span style={{ fontSize: `${cartSizes.textBase}px` }} className="text-orange-600">Delivery Fee</span>
                <span style={{ fontSize: `${cartSizes.textBase}px` }} className="font-semibold text-orange-600">
                  {format.currency(deliveryData.fee)}
                </span>
              </div>
            )}

            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between">
                <span style={{ fontSize: `${cartSizes.textXl}px` }} className="font-bold text-gray-900">Total</span>
                <span style={{ fontSize: `${cartSizes.textXl}px` }} className="font-bold text-gray-900">
                  {format.currency(cartTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <button
            onClick={onProceedToPayment}
            className={`w-full py-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 font-semibold ${
              customerSelected
                ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            style={{
              WebkitTapHighlightColor: 'transparent',
              fontSize: `${cartSizes.textLg}px`,
            }}
            disabled={!customerSelected}
          >
            <CreditCard size={20} />
            <span>Proceed to Payment</span>
          </button>
        </div>
      )}

      {/* Modals */}
      {showDeliveryModal && <DeliveryModal />}
      {showHeldOrdersModal && <HeldOrdersModal />}
      {showCustomerModal && <CustomerModal />}
    </div>
  );
};

export default TabletCartSidebar;