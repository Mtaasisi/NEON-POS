import React, { useState, useEffect } from 'react';
import { Package, Calendar, DollarSign, TrendingUp, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
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
          order_number,
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

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading order history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700">Order History</h4>
        <p className="text-xs text-gray-500">Purchase orders from {supplierName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalOrders}</div>
          <div className="text-sm text-gray-600">Total Orders</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalValue, stats.currency)}
          </div>
          <div className="text-sm text-gray-600">Total Value</div>
          {stats.hasMultipleCurrencies && (
            <div className="text-xs text-amber-600 mt-1">Mixed</div>
          )}
        </div>

        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(stats.avgOrderValue, stats.currency)}
          </div>
          <div className="text-sm text-gray-600">Avg Order Value</div>
          {stats.hasMultipleCurrencies && (
            <div className="text-xs text-amber-600 mt-1">Mixed</div>
          )}
        </div>

        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-sm font-bold text-orange-600">
            {stats.lastOrderDate 
              ? new Date(stats.lastOrderDate).toLocaleDateString()
              : 'N/A'
            }
          </div>
          <div className="text-sm text-gray-600">Last Order</div>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h4>
          <p className="text-gray-600">No purchase orders found for this supplier</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <GlassCard key={order.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {order.order_number || `Order #${order.id.slice(0, 8)}`}
                    </h4>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(order.order_date).toLocaleDateString()}
                    </span>
                    {order.expected_delivery_date && (
                      <span className="flex items-center gap-1">
                        Expected: {new Date(order.expected_delivery_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(order.total_amount, order.currency)}
                  </div>
                  <div className="text-sm text-gray-600">{order.currency}</div>
                </div>
              </div>

              {order.notes && (
                <p className="text-sm text-gray-600 mt-2">{order.notes}</p>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierOrderHistoryTab;

