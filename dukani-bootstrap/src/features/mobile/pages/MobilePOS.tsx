/**
 * MobilePOS Page - Bootstrap Version
 * Simplified mobile POS for bootstrap
 */

import React, { useState } from 'react';

const MobilePOS: React.FC = () => {
  const [cart, setCart] = useState<Array<{id: number, name: string, price: number, quantity: number}>>([]);
  const [total, setTotal] = useState(0);

  const products = [
    { id: 1, name: 'Product A', price: 25.00 },
    { id: 2, name: 'Product B', price: 45.50 },
    { id: 3, name: 'Product C', price: 12.99 },
    { id: 4, name: 'Product D', price: 89.00 },
  ];

  const addToCart = (product: {id: number, name: string, price: number}) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      const updatedCart = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setCart(updatedCart);
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    calculateTotal();
  };

  const calculateTotal = () => {
    const newTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(newTotal);
  };

  const clearCart = () => {
    setCart([]);
    setTotal(0);
  };

  const processPayment = () => {
    alert(`Payment processed! Total: $${total.toFixed(2)}`);
    clearCart();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Point of Sale</h2>
        <p className="text-gray-600">Mobile POS Interface</p>
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Products</h3>
        <div className="grid grid-cols-2 gap-3">
          {products.map(product => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium text-gray-900">{product.name}</div>
              <div className="text-blue-600 font-semibold">${product.price.toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cart ({cart.length})</h3>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🛒</div>
            <p>Cart is empty</p>
            <p className="text-sm">Add products to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                  <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-blue-600">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={processPayment}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Process Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobilePOS;
