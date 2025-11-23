import React, { useState, useEffect } from 'react';
import { Package, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';

interface SupplierOrderHistoryTabProps {
  supplierId: string;
  supplierName: string;
}

const SupplierOrderHistoryTab: React.FC<SupplierOrderHistoryTabProps> = ({
  supplierId,
  supplierName
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalValue: 0,
    avgOrderValue: 0,
    lastOrderDate: null as string | null,
    currency: 'TZS',
    hasMultipleCurrencies: false
  });

  useEffect(() => {
    loadOrderHistory();
  }, [supplierId]);

  const loadOrderHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch purchase orders for this supplier
      const { data: purchaseOrders, error } = await supabase
        .from('lats_purchase_orders')
        .select(`
          id,
          po_number,
          order_date,
          expected_delivery_date,
          total_amount,
          currency,
          status,
          notes,
          created_at
        `)
        .eq('supplier_id', supplierId)
        .order('order_date', { ascending: false });

      if (error) throw error;

      setOrders(purchaseOrders || []);

      // Calculate stats
      if (purchaseOrders && purchaseOrders.length > 0) {
        const totalValue = purchaseOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        
        // Determine currency handling
        const currencies = [...new Set(purchaseOrders.map(o => o.currency || 'TZS'))];
        const hasMultipleCurrencies = currencies.length > 1;
        const primaryCurrency = purchaseOrders[0]?.currency || 'TZS';
        
        if (hasMultipleCurrencies) {
          console.warn(`⚠️ Multiple currencies in supplier orders: ${currencies.join(', ')}. Using ${primaryCurrency} for stats.`);
        }
        
        setStats({
          totalOrders: purchaseOrders.length,
          totalValue,
          avgOrderValue: totalValue / purchaseOrders.length,
          lastOrderDate: purchaseOrders[0]?.order_date,
          currency: primaryCurrency,
          hasMultipleCurrencies
        });
      }
    } catch (error) {
      console.error('Error loading order history:', error);
      toast.error('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  // Helper to format numbers
  const formatPrice = (amount: number): string => {
    if (amount % 1 === 0) {
      return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'approved': 'bg-blue-100 text-blue-700',
      'ordered': 'bg-purple-100 text-purple-700',
      'received': 'bg-green-100 text-green-700',
      'cancelled': 'bg-red-100 text-red-700'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border-2 border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-orange-600" />
            <span className="text-xs font-semibold text-orange-700">Total Orders</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">{stats.totalOrders}</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-xs font-semibold text-green-700">Total Value</span>
          </div>
          <div className="text-lg font-bold text-green-900">
            {formatPrice(stats.totalValue)} {stats.currency}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Avg Value</span>
          </div>
          <div className="text-lg font-bold text-blue-900">
            {formatPrice(stats.avgOrderValue)} {stats.currency}
          </div>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg font-medium">No orders found</p>
          <p className="text-sm text-gray-500 mt-2">No purchase orders for this supplier</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border-2 rounded-xl bg-white shadow-sm transition-all duration-300 hover:shadow-md border-gray-200 hover:border-orange-300"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-base font-bold text-gray-900">
                        {order.order_number || order.po_number || `Order #${order.id.slice(0, 8)}`}
                    </h4>
                    {getStatusBadge(order.status)}
                  </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(order.order_date).toLocaleDateString()}</span>
                      </div>
                    {order.expected_delivery_date && (
                        <div className="flex items-center gap-1">
                          <span>Expected: {new Date(order.expected_delivery_date).toLocaleDateString()}</span>
                        </div>
                    )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-gray-900">
                      {formatPrice(order.total_amount || 0)} {order.currency || 'TZS'}
                    </div>
                  </div>
                </div>
                {order.notes && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">{order.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierOrderHistoryTab;

