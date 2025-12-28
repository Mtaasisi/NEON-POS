import React, { useState, useEffect } from 'react';
import { Search, Truck, MapPin, Phone, Clock, CheckCircle, XCircle, AlertTriangle, Package } from 'lucide-react';
import { deliveryService, DeliveryStatus } from '../../services/deliveryService';
import GlassCard from '../ui/GlassCard';
import GlassButton from '../ui/GlassButton';
import toast from 'react-hot-toast';

interface DeliveryTrackingProps {
  customerId?: string; // If provided, show customer's deliveries
  trackingNumber?: string; // If provided, show specific delivery
}

const DeliveryTracking: React.FC<DeliveryTrackingProps> = ({ customerId, trackingNumber }) => {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTracking, setSearchTracking] = useState(trackingNumber || '');
  const [searchedDelivery, setSearchedDelivery] = useState<DeliveryStatus | null>(null);

  // Load customer deliveries if customerId is provided
  useEffect(() => {
    if (customerId) {
      loadCustomerDeliveries();
    }
  }, [customerId]);

  // Search for delivery by tracking number
  useEffect(() => {
    if (trackingNumber && !customerId) {
      searchDelivery(trackingNumber);
    }
  }, [trackingNumber]);

  const loadCustomerDeliveries = async () => {
    if (!customerId) return;

    setLoading(true);
    const result = await deliveryService.getCustomerDeliveries(customerId);

    if (result.success) {
      setDeliveries(result.deliveries || []);
    } else {
      toast.error('Failed to load deliveries');
    }
    setLoading(false);
  };

  const searchDelivery = async (tracking: string) => {
    if (!tracking.trim()) return;

    setLoading(true);
    // This would need a method to search by tracking number
    // For now, we'll simulate or show a message
    toast.info('Tracking search functionality coming soon');
    setLoading(false);
  };

  const handleTrackingSearch = () => {
    searchDelivery(searchTracking);
  };

  // Get status information
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Clock className="text-yellow-600" size={20} />,
          text: 'Order Confirmed',
          description: 'Your order has been confirmed and is being prepared.'
        };
      case 'confirmed':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <CheckCircle className="text-blue-600" size={20} />,
          text: 'Ready for Delivery',
          description: 'Your order is ready and waiting for driver assignment.'
        };
      case 'assigned':
        return {
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: <User className="text-purple-600" size={20} />,
          text: 'Driver Assigned',
          description: 'A driver has been assigned to deliver your order.'
        };
      case 'picked_up':
        return {
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: <Package className="text-indigo-600" size={20} />,
          text: 'Picked Up',
          description: 'Your order has been picked up and is on the way.'
        };
      case 'in_transit':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <Truck className="text-orange-600" size={20} />,
          text: 'In Transit',
          description: 'Your order is currently in transit to the delivery address.'
        };
      case 'out_for_delivery':
        return {
          color: 'bg-pink-100 text-pink-800 border-pink-200',
          icon: <MapPin className="text-pink-600" size={20} />,
          text: 'Out for Delivery',
          description: 'Your order is out for delivery and will arrive soon.'
        };
      case 'delivered':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="text-green-600" size={20} />,
          text: 'Delivered',
          description: 'Your order has been successfully delivered.'
        };
      case 'failed':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <XCircle className="text-red-600" size={20} />,
          text: 'Delivery Failed',
          description: 'There was an issue with the delivery. Please contact support.'
        };
      case 'returned':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <AlertTriangle className="text-gray-600" size={20} />,
          text: 'Returned',
          description: 'Your order has been returned to the store.'
        };
      case 'cancelled':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <XCircle className="text-gray-600" size={20} />,
          text: 'Cancelled',
          description: 'This delivery has been cancelled.'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <Clock className="text-gray-600" size={20} />,
          text: 'Unknown Status',
          description: 'Status information is being updated.'
        };
    }
  };

  const statusSteps = [
    { key: 'pending', label: 'Order Confirmed' },
    { key: 'confirmed', label: 'Ready for Delivery' },
    { key: 'assigned', label: 'Driver Assigned' },
    { key: 'picked_up', label: 'Picked Up' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' }
  ];

  const getCurrentStepIndex = (status: string) => {
    return statusSteps.findIndex(step => step.key === status);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Truck className="text-blue-600" size={32} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Delivery Tracking</h1>
        <p className="text-gray-600">Track your orders and deliveries in real-time</p>
      </div>

      {/* Tracking Search */}
      {!customerId && (
        <GlassCard className="p-6 mb-8">
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Track Your Delivery
            </h2>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Enter tracking number"
                  value={searchTracking}
                  onChange={(e) => setSearchTracking(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTrackingSearch()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <GlassButton
                onClick={handleTrackingSearch}
                disabled={loading || !searchTracking.trim()}
                className="px-6"
              >
                {loading ? 'Searching...' : 'Track'}
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Customer Deliveries List */}
      {customerId && deliveries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Recent Deliveries</h2>
          <div className="space-y-4">
            {deliveries.slice(0, 5).map((delivery) => {
              const statusInfo = getStatusInfo(delivery.status);
              return (
                <GlassCard
                  key={delivery.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedDelivery(delivery)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg border-2 ${statusInfo.color}`}>
                        {statusInfo.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Order {delivery.sale?.sale_number}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Tracking: {delivery.tracking_number}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(delivery.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.text}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Delivery Details Modal */}
      {(selectedDelivery || searchedDelivery) && (
        <DeliveryDetailsModal
          delivery={selectedDelivery || searchedDelivery}
          onClose={() => {
            setSelectedDelivery(null);
            setSearchedDelivery(null);
          }}
        />
      )}

      {/* Empty State */}
      {customerId && deliveries.length === 0 && !loading && (
        <GlassCard className="p-12 text-center">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No deliveries found</h3>
          <p className="text-gray-600">
            You haven't placed any orders with delivery yet.
          </p>
        </GlassCard>
      )}
    </div>
  );
};

// Delivery Details Modal Component
const DeliveryDetailsModal: React.FC<{
  delivery: any;
  onClose: () => void;
}> = ({ delivery, onClose }) => {
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliveryStatus();
  }, [delivery]);

  const loadDeliveryStatus = async () => {
    if (!delivery?.id) return;

    const result = await deliveryService.getDeliveryStatus(delivery.id);
    if (result.success) {
      setDeliveryStatus(result.delivery || null);
    }
    setLoading(false);
  };

  const statusSteps = [
    { key: 'pending', label: 'Order Confirmed', icon: <Clock className="text-yellow-600" size={16} /> },
    { key: 'confirmed', label: 'Ready for Delivery', icon: <CheckCircle className="text-blue-600" size={16} /> },
    { key: 'assigned', label: 'Driver Assigned', icon: <User className="text-purple-600" size={16} /> },
    { key: 'picked_up', label: 'Picked Up', icon: <Package className="text-indigo-600" size={16} /> },
    { key: 'in_transit', label: 'In Transit', icon: <Truck className="text-orange-600" size={16} /> },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: <MapPin className="text-pink-600" size={16} /> },
    { key: 'delivered', label: 'Delivered', icon: <CheckCircle className="text-green-600" size={16} /> }
  ];

  const currentStepIndex = deliveryStatus ? getCurrentStepIndex(deliveryStatus.status) : -1;

  const getCurrentStepIndex = (status: string) => {
    return statusSteps.findIndex(step => step.key === status);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <GlassCard className="p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span>Loading delivery details...</span>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <GlassCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Delivery Details</h2>
            <p className="text-sm text-gray-600">Tracking: {delivery?.tracking_number}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Progress Steps */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            {statusSteps.map((step, index) => (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    index <= currentStepIndex
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    {step.icon}
                  </div>
                  <span className={`text-xs mt-2 text-center max-w-20 ${
                    index <= currentStepIndex ? 'text-blue-700 font-medium' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < statusSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 mt-[-20px] transition-all ${
                    index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Delivery Information */}
        <div className="p-6 space-y-6">
          {/* Status & Driver Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Delivery Status</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Estimated: {deliveryStatus?.estimatedDeliveryTime
                      ? new Date(deliveryStatus.estimatedDeliveryTime).toLocaleString()
                      : 'Not available'
                    }
                  </span>
                </div>
                {deliveryStatus?.actualDeliveryTime && (
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm text-gray-600">
                      Delivered: {new Date(deliveryStatus.actualDeliveryTime).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {deliveryStatus?.assignedDriverName && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Driver Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-600">{deliveryStatus.assignedDriverName}</span>
                  </div>
                  {deliveryStatus.driverPhone && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-600">{deliveryStatus.driverPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Delivery Address */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Delivery Address</h3>
            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <MapPin size={16} className="text-gray-500 mt-0.5" />
              <span className="text-sm text-gray-700">{delivery?.delivery_address || 'Address not available'}</span>
            </div>
          </div>

          {/* Order Items */}
          {delivery?.sale && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Order Summary</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">Order #{delivery.sale.sale_number}</span>
                  <span className="font-medium text-gray-900">TZS {delivery.sale.total_amount?.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {new Date(delivery.created_at).toLocaleDateString()} • {delivery.delivery_method} delivery
                </p>
              </div>
            </div>
          )}

          {/* Status History */}
          {deliveryStatus?.statusHistory && deliveryStatus.statusHistory.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Status History</h3>
              <div className="space-y-3">
                {deliveryStatus.statusHistory.slice(-5).reverse().map((historyItem, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock size={14} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {historyItem.status.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(historyItem.timestamp).toLocaleString()}
                      </p>
                      {historyItem.notes && (
                        <p className="text-xs text-gray-500 mt-1">{historyItem.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default DeliveryTracking;