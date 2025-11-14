import React, { useState, useEffect } from 'react';
import { Building, Star, DollarSign, Calendar, Phone, Mail, MessageSquare, TrendingUp, Package } from 'lucide-react';
import { formatMoney, Currency } from '../../lib/purchaseOrderUtils';
import { supabase } from '../../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface SupplierStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
  rating?: number;
  onTimeDeliveryRate?: number;
}

interface SupplierQuickInfoCardProps {
  supplier: any;
  currency: Currency;
  onContactClick?: (method: 'phone' | 'email' | 'whatsapp') => void;
  className?: string;
}

const SupplierQuickInfoCard: React.FC<SupplierQuickInfoCardProps> = ({
  supplier,
  currency,
  onContactClick,
  className = ''
}) => {
  const [stats, setStats] = useState<SupplierStats>({
    totalOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (supplier) {
      loadSupplierStats();
    }
  }, [supplier?.id]);

  const loadSupplierStats = async () => {
    if (!supplier?.id) return;

    setIsLoading(true);
    try {
      // Get purchase orders for this supplier
      // Use total_amount (original currency) to display amounts in supplier's currency
      const { data: orders, error } = await supabase
        .from('lats_purchase_orders')
        .select('id, total_amount, total_amount_base_currency, currency, exchange_rate, order_date, status')
        .eq('supplier_id', supplier.id)
        .order('order_date', { ascending: false });

      if (error) throw error;

      if (orders && orders.length > 0) {
        // Calculate totals using original currency amounts for display in supplier's currency
        const totalSpent = orders.reduce((sum, order) => {
          // Use total_amount (original currency) to keep values in supplier's currency
          // Explicitly convert to number to avoid string concatenation
          const amount = parseFloat(order.total_amount) || 0;
          return sum + amount;
        }, 0);
        const averageOrderValue = totalSpent / orders.length;
        const lastOrderDate = orders[0].order_date;

        setStats({
          totalOrders: orders.length,
          totalSpent,
          averageOrderValue,
          lastOrderDate,
          rating: supplier.average_rating || undefined,
          onTimeDeliveryRate: supplier.on_time_delivery_rate || undefined
        });
      }
    } catch (error) {
      console.error('Error loading supplier stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContact = (method: 'phone' | 'email' | 'whatsapp') => {
    if (onContactClick) {
      onContactClick(method);
    } else {
      // Default behavior
      if (method === 'phone' && supplier.phone) {
        window.location.href = `tel:${supplier.phone}`;
      } else if (method === 'email' && supplier.email) {
        window.location.href = `mailto:${supplier.email}`;
      } else if (method === 'whatsapp' && supplier.whatsapp) {
        window.open(`https://wa.me/${supplier.whatsapp.replace(/[^0-9]/g, '')}`, '_blank');
      } else {
        toast.error('Contact information not available');
      }
    }
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  if (!supplier) {
    return (
      <div className={`bg-gray-50 border-2 border-gray-200 rounded-xl p-6 ${className}`}>
        <div className="text-center py-8">
          <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Select a supplier to see details</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-orange-50/30 to-amber-50/30 ${className}`}>
      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-orange-200/50 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600">Total Orders</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {isLoading ? '...' : stats.totalOrders}
          </p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-orange-200/50 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">Total Spent</span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {isLoading ? '...' : formatMoney(stats.totalSpent, currency)}
          </p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-orange-200/50 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-600">Avg Order</span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {isLoading ? '...' : formatMoney(stats.averageOrderValue, currency)}
          </p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-orange-200/50 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-gray-600">Last Order</span>
          </div>
          <p className="text-sm font-bold text-gray-900">
            {isLoading ? '...' : getTimeAgo(stats.lastOrderDate)}
          </p>
        </div>
      </div>

      {/* Rating & Performance */}
      {(stats.rating || stats.onTimeDeliveryRate) && (
        <div className="px-4 pb-4 space-y-2">
          {stats.rating && typeof stats.rating === 'number' && (
            <div className="bg-white rounded-lg p-3 border border-orange-200/50 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="font-bold text-gray-900">{Number(stats.rating).toFixed(1)}</span>
                  <span className="text-xs text-gray-500">/5.0</span>
                </div>
              </div>
            </div>
          )}
          {stats.onTimeDeliveryRate && typeof stats.onTimeDeliveryRate === 'number' && (
            <div className="bg-white rounded-lg p-3 border border-orange-200/50 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">On-Time Delivery</span>
                <span className="font-bold text-green-600">{Number(stats.onTimeDeliveryRate).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact Actions */}
      <div className="p-4 pt-0 grid grid-cols-2 gap-2">
        {supplier.phone && (
          <button
            onClick={() => handleContact('phone')}
            className="flex flex-col items-center gap-1 p-3 bg-white border border-orange-200/50 rounded-lg hover:bg-orange-50 transition-colors shadow-sm"
            title={supplier.phone}
          >
            <Phone className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-medium text-gray-700">Call</span>
          </button>
        )}
        {supplier.whatsapp && (
          <button
            onClick={() => handleContact('whatsapp')}
            className="flex flex-col items-center gap-1 p-3 bg-white border border-orange-200/50 rounded-lg hover:bg-green-50 transition-colors shadow-sm"
            title={supplier.whatsapp}
          >
            <MessageSquare className="w-5 h-5 text-green-600" />
            <span className="text-xs font-medium text-gray-700">WhatsApp</span>
          </button>
        )}
      </div>

      {/* Payment Terms */}
      {supplier.payment_terms && (
        <div className="px-4 pb-4">
          <div className="bg-white rounded-lg p-3 border border-orange-200/50 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Payment Terms</span>
              <span className="font-semibold text-gray-900">{supplier.payment_terms}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierQuickInfoCard;

