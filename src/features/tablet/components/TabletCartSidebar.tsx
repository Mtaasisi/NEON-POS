import React, { useState } from 'react';
import { X, Plus, Minus, CreditCard, ChevronDown, ChevronUp, Truck, Printer, Trash2, MapPin, Clock, Phone, FileText, Users } from 'lucide-react';
import { format } from '../../lats/lib/format';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import GlassCard from '../../../features/shared/components/ui/GlassCard';

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
        <GlassCard className="max-w-md w-full p-6">
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
                  <option value="today">Later today</option>
                  <option value="tomorrow">Tomorrow</option>
                </select>
              </div>
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
                placeholder="Delivery fee"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <GlassButton
              onClick={() => setShowDeliveryModal(false)}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleConfirm}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!deliveryAddress || !deliveryPhone}
            >
              Confirm Delivery
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    );
  };

  // Held Orders Modal Component
  const HeldOrdersModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <GlassCard className="max-w-lg w-full p-6 max-h-96 overflow-y-auto">
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
            <div className="space-y-3">
              {heldOrders.map((order) => (
                <div key={order.id} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">Order #{order.orderNumber}</h4>
                      <p className="text-sm text-gray-600">{order.heldAt}</p>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{format.currency(order.cartTotal)}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    {order.cart.length} item(s)
                  </div>
                  <GlassButton
                    onClick={() => handleRecallOrderConfirm(order.id)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                    size="sm"
                  >
                    Recall Order
                  </GlassButton>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <GlassButton
              onClick={() => setShowHeldOrdersModal(false)}
              variant="secondary"
              className="flex-1"
            >
              Close
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    );
  };

  // Customer Modal Component
  const CustomerModal = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

    // Mock customer data - in real app, this would come from API
    const mockCustomers = [
      { id: 1, name: 'John Doe', phone: '+255 712 345 678', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', phone: '+255 765 432 109', email: 'jane@example.com' },
      { id: 3, name: 'Bob Johnson', phone: '+255 789 012 345', email: 'bob@example.com' },
    ];

    const filteredCustomers = mockCustomers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <GlassCard className="max-w-md w-full p-6 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Customer</h3>
            <button
              onClick={() => setShowCustomerModal(false)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Customer List */}
          <div className="space-y-2 mb-4">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedCustomer?.id === customer.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium text-gray-900">{customer.name}</div>
                <div className="text-sm text-gray-600">{customer.phone}</div>
                <div className="text-sm text-gray-500">{customer.email}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <GlassButton
              onClick={() => setShowCustomerModal(false)}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              onClick={() => {
                if (selectedCustomer) {
                  handleCustomerConfirm(selectedCustomer);
                }
              }}
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
              disabled={!selectedCustomer}
            >
              Select Customer
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    );
  };

  return (
    <>
      {showDeliveryModal && <DeliveryModal />}
      {showHeldOrdersModal && <HeldOrdersModal />}
      {showCustomerModal && <CustomerModal />}
      <div className="flex flex-col h-full min-h-0">
      {/* Cart Header */}
      <div
        className="border-b border-gray-200 bg-gray-50"
        style={{
          padding: `${sizes.spacing3}px ${sizes.spacing3}px`,
        }}
      >
        <h2 style={{ fontSize: `${cartSizes.textXl}px` }} className="font-bold text-gray-900">
          Cart ({cart.length})
        </h2>
      </div>

      {/* Cart Items */}
      <div
        className="flex-1 overflow-y-auto min-h-0 text-blue-600 bg-gray-100"
        style={{ overscrollBehavior: 'contain' }}
      >
        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard size={32} className="text-gray-400" />
              </div>
              <p style={{ fontSize: `${cartSizes.textBase}px` }} className="text-gray-500">
                Your cart is empty
              </p>
              <p style={{ fontSize: `${cartSizes.textSm}px` }} className="text-gray-400 mt-1">
                Add items from the left panel
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {cart.map((item, index) => (
              <div
                key={item.id}
                className="bg-white rounded-[20px] border border-gray-100 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-[0.98] select-none relative shadow-sm"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div className="flex p-4 space-x-3">
                  {/* Product Image - Left side */}
                  {item.image && (
                    <div className="flex-shrink-0">
                      <div
                        className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden border border-gray-200"
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

                  {/* Product Details - Right side */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: Product name and remove button */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4
                          style={{ fontSize: `${cartSizes.textBase}px` }}
                          className="font-semibold text-gray-900 truncate"
                          title={item.productName}
                        >
                          {item.productName}
                        </h4>
                        {item.variantName !== 'Default' && (
                          <p
                            style={{ fontSize: `${cartSizes.textSm}px` }}
                            className="text-gray-500 truncate"
                          >
                            {item.variantName}
                          </p>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => onRemoveFromCart(item.id)}
                        className="w-7 h-7 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center transition-colors ml-2 flex-shrink-0"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <X size={14} className="text-red-600" />
                      </button>
                    </div>

                    {/* Bottom row: Price and quantity controls */}
                    <div className="flex items-center justify-between">
                      {/* Price and unit info */}
                      <div>
                        <div
                          style={{ fontSize: `${cartSizes.textLg}px` }}
                          className="font-bold text-gray-900"
                        >
                          {format.currency(item.totalPrice)}
                        </div>
                        <div
                          style={{ fontSize: `${cartSizes.textXs}px` }}
                          className="text-gray-400"
                        >
                          {format.currency(item.unitPrice)} × {item.quantity}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-1 bg-gray-50 rounded-full p-1 border border-gray-200">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <Minus size={12} className="text-gray-600" />
                        </button>

                        <span
                          style={{ fontSize: `${cartSizes.textSm}px` }}
                          className="font-semibold text-gray-900 min-w-[1.5rem] text-center"
                        >
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          disabled={item.quantity >= item.availableQuantity}
                          className="w-6 h-6 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-200 rounded-full flex items-center justify-center transition-colors"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <Plus size={12} className="text-white disabled:text-blue-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                    handleDeliverySetup();
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
    </div>
    </>
  );
};

export default TabletCartSidebar;