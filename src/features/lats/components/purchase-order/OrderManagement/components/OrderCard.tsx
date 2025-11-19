import React from 'react';
import { Check, Clock, Truck, Package, CheckCircle } from 'lucide-react';
import { OrderCardProps } from '../types';

const statusColors = {
  draft: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  partial_received: 'bg-purple-100 text-purple-800',
  received: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusIcons = {
  draft: <Clock className="h-4 w-4" />,
  sent: <Truck className="h-4 w-4" />,
  confirmed: <CheckCircle className="h-4 w-4" />,
  shipped: <Truck className="h-4 w-4" />,
  partial_received: <Package className="h-4 w-4" />,
  received: <CheckCircle className="h-4 w-4" />,
  completed: <Check className="h-4 w-4" />,
  cancelled: <Check className="h-4 w-4" />,
};

const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  isSelected, 
  onSelect, 
  viewMode, 
  onViewDetails, 
  onEdit, 
  onPrint, 
  onDelete, 
  onStatusChange 
}) => {
  const statusColor = statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  const statusIcon = statusIcons[order.status as keyof typeof statusIcons] || null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: order.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (viewMode === 'list') {
    return (
      <div 
        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
          isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
        }`}
        onClick={() => onSelect(order.id)}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900">{order.orderNumber}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                {statusIcon}
                <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {order.supplier?.name || 'No supplier'}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium">{formatCurrency(order.totalAmount || 0)}</p>
            <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-colors flex flex-col h-full ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
      }`}
      onClick={() => onSelect(order.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-gray-900 truncate">{order.orderNumber}</h3>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
          {statusIcon}
          <span className="ml-1 capitalize text-xs">{order.status.replace('_', ' ')}</span>
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
        {order.supplier?.name || 'No supplier'}
      </p>
      
      <div className="mt-auto pt-2 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
          <p className="font-medium text-right">{formatCurrency(order.totalAmount || 0)}</p>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
