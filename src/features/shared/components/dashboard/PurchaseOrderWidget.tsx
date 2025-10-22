import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, ExternalLink, Package, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';

interface PurchaseOrderWidgetProps {
  className?: string;
}

interface PurchaseOrderMetrics {
  pending: number;
  received: number;
  total: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    supplier: string;
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
}

export const PurchaseOrderWidget: React.FC<PurchaseOrderWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState<PurchaseOrderMetrics>({
    pending: 0,
    received: 0,
    total: 0,
    recentOrders: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPurchaseOrderData();
  }, []);

  const loadPurchaseOrderData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      console.log('📊 PurchaseOrderWidget: Loading data...', { currentBranchId });
      
      // Query purchase orders with branch filtering
      // FIXED: Query without PostgREST syntax
      let query = supabase
        .from('lats_purchase_orders')
        .select('id, po_number, status, total_amount, created_at, supplier_id')
        .order('created_at', { ascending: false });
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
        console.log('🏢 Filtering purchase orders by branch:', currentBranchId);
      } else {
        console.log('📂 Loading all purchase orders (no branch selected)');
      }
      
      const { data: orders, error } = await query.limit(50);

      if (error) {
        console.error('❌ Error loading purchase orders:', error);
        throw error;
      }
      
      console.log('✅ Loaded purchase orders:', orders?.length || 0);

      const allOrders = orders || [];

      // FIXED: Fetch supplier data separately
      const supplierIds = allOrders.map((o: any) => o.supplier_id).filter(Boolean);
      const { data: suppliers } = supplierIds.length > 0
        ? await supabase.from('lats_suppliers').select('id, name').in('id', supplierIds)
        : { data: [] };
      
      // Map suppliers for easy lookup
      const suppliersMap = new Map(suppliers?.map(s => [s.id, s]) || []);
      
      // Calculate metrics
      const pending = allOrders.filter((o: any) => 
        o.status === 'pending' || o.status === 'ordered'
      ).length;
      
      const received = allOrders.filter((o: any) => 
        o.status === 'received'
      ).length;

      // Get recent orders for display
      const recentOrders = allOrders.slice(0, 4).map((order: any) => ({
        id: order.id,
        orderNumber: order.po_number || 'N/A',
        supplier: order.supplier_id && suppliersMap.get(order.supplier_id)?.name || 'Unknown Supplier',
        status: order.status,
        totalAmount: order.total_amount || 0,
        createdAt: order.created_at
      }));

      setMetrics({
        pending,
        received,
        total: allOrders.length,
        recentOrders
      });
    } catch (error) {
      console.error('Error loading purchase order data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-emerald-100 text-emerald-700';
      case 'pending':
      case 'ordered':
        return 'bg-amber-100 text-amber-700';
      case 'cancelled':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return <CheckCircle size={12} className="text-emerald-600" />;
      case 'pending':
      case 'ordered':
        return <Clock size={12} className="text-amber-600" />;
      default:
        return <AlertCircle size={12} className="text-gray-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Purchase Orders</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {metrics.total} orders tracked
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/lats/purchase-orders')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Purchase Orders"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-amber-500" />
            <span className="text-xs text-gray-500">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-semibold text-gray-900">
              {metrics.pending}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-emerald-500" />
            <span className="text-xs text-gray-500">Received</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-semibold text-gray-900">
              {metrics.received}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Purchase Orders */}
      <div className="space-y-3 max-h-64 overflow-y-auto mb-6 flex-grow">
        {metrics.recentOrders.length > 0 ? (
          metrics.recentOrders.map((order) => (
            <div 
              key={order.id} 
              className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => navigate(`/lats/purchase-orders/${order.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {order.orderNumber}
                  </span>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  <span className="capitalize">{order.status}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 truncate">
                  {order.supplier}
                </span>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-semibold text-gray-900">
                    {formatCurrency(order.totalAmount)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No purchase orders yet</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-6">
        <button
          onClick={() => navigate('/lats/purchase-orders/new')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          <span>Create Order</span>
        </button>
        <button
          onClick={() => navigate('/lats/purchase-orders')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>
    </div>
  );
};

