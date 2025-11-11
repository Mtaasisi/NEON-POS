import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/MobileLayout';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Calendar,
  DollarSign,
  TruckIcon
} from 'lucide-react';
import { CustomerOrder } from '../types';
import toast from 'react-hot-toast';
import customerPortalService from '../services/customerPortalService';

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      const customerId = localStorage.getItem('customer_id');
      if (customerId) {
        const customerOrders = await customerPortalService.getCustomerOrders(customerId);
        setOrders(customerOrders);
      } else {
        // Mock data for guest users
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    filter === 'all' || order.status === filter
  );

  const getStatusIcon = (status: CustomerOrder['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'pending':
        return <Clock size={20} className="text-yellow-600" />;
      case 'processing':
        return <Package size={20} className="text-blue-600" />;
      case 'cancelled':
        return <XCircle size={20} className="text-red-600" />;
      default:
        return <Package size={20} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: CustomerOrder['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <MobileLayout title="My Orders">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="My Orders">
      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-14 z-40">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'pending', 'processing', 'completed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Package size={64} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600 text-center mb-4">
            {filter === 'all' 
              ? "You haven't placed any orders yet" 
              : `No ${filter} orders`}
          </p>
          <button
            onClick={() => navigate('/customer-portal/products')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {filteredOrders.map(order => (
            <button
              key={order.id}
              onClick={() => navigate(`/customer-portal/orders/${order.id}`)}
              className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md active:scale-98 transition-all"
            >
              {/* Order Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-gray-900 mb-1">{order.orderNumber}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={14} />
                    {formatDate(order.date)}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                  {order.status.toUpperCase()}
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="border-t border-gray-100 pt-3 mb-3">
                {order.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package size={20} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900 line-clamp-1">
                        {item.productName}
                      </div>
                      {item.variantName && (
                        <div className="text-xs text-gray-600">{item.variantName}</div>
                      )}
                      <div className="text-xs text-gray-600">Qty: {item.quantity}</div>
                    </div>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <div className="text-xs text-blue-600 font-medium mt-2">
                    +{order.items.length - 2} more items
                  </div>
                )}
              </div>

              {/* Order Footer */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-xs text-gray-600">Total Amount</div>
                    <div className="font-bold text-gray-900">
                      Tsh {order.totalAmount.toLocaleString()}
                    </div>
                  </div>
                  {order.deliveryStatus && (
                    <div className="flex items-center gap-1 text-xs">
                      <TruckIcon size={14} className="text-gray-600" />
                      <span className="text-gray-600 capitalize">{order.deliveryStatus}</span>
                    </div>
                  )}
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </MobileLayout>
  );
};

export default OrdersPage;

