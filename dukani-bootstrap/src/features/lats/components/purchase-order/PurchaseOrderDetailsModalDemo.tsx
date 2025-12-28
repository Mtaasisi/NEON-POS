import React, { useState } from 'react';
import PurchaseOrderDetailsModal from './PurchaseOrderDetailsModal';

// Demo component to showcase the polished PurchaseOrderDetailsModal
const PurchaseOrderDetailsModalDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sample purchase order data
  const sampleOrder = {
    id: 'PO-1762972840565',
    orderNumber: 'PO-1762972840565',
    status: 'sent',
    currency: 'CNY',
    totalAmount: 14000,
    totalPaid: 4900000,
    paymentStatus: 'paid',
    createdAt: '2025-11-12T00:00:00Z',
    expectedDeliveryDate: null,
    notes: 'Please ensure all items are carefully packaged and labeled correctly.',
    supplier: {
      id: 'SUP-001',
      name: 'CHINA',
      contactPerson: 'John Smith',
      phone: '+86-123-456-7890',
      email: 'john@china-supplier.com'
    },
    items: [
      {
        id: 'ITEM-001',
        productId: 'PROD-001',
        product: {
          id: 'PROD-001',
          name: 'iPhone 15 Pro Max',
          sku: 'IPH15PM-256'
        },
        variant: {
          id: 'VAR-001',
          name: '256GB - Natural Titanium'
        },
        quantity: 2,
        receivedQuantity: 2,
        costPrice: 1200,
        totalPrice: 2400
      },
      {
        id: 'ITEM-002',
        productId: 'PROD-002',
        product: {
          id: 'PROD-002',
          name: 'Samsung Galaxy S24 Ultra',
          sku: 'SGS24U-512'
        },
        variant: {
          id: 'VAR-002',
          name: '512GB - Titanium Black'
        },
        quantity: 2,
        receivedQuantity: 0,
        costPrice: 1100,
        totalPrice: 2200
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Purchase Order Details Modal Demo</h1>

        <div className="bg-white rounded-3xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Polished Design Features:</h2>
          <ul className="space-y-3 text-gray-700 mb-8">
            <li className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Enhanced gradient header with improved visual hierarchy
            </li>
            <li className="flex items-center gap-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              Smooth animations and transitions throughout
            </li>
            <li className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Improved card designs with subtle shadows and hover effects
            </li>
            <li className="flex items-center gap-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              Better responsive design for mobile and desktop
            </li>
            <li className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              Enhanced color scheme and typography
            </li>
            <li className="flex items-center gap-3">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              Highly rounded corners for modern, soft appearance
            </li>
            <li className="flex items-center gap-3">
              <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
              Improved spacing and visual balance
            </li>
          </ul>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            Open Purchase Order Details Modal
          </button>
        </div>
      </div>

      <PurchaseOrderDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={sampleOrder}
      />
    </div>
  );
};

export default PurchaseOrderDetailsModalDemo;
