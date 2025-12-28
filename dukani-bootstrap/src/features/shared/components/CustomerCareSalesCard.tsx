import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Package } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';

interface CustomerCareSalesCardProps {
  className?: string;
}

interface TodaySalesData {
  totalSales: number;
  transactionCount: number;
  totalItems: number;
  topProduct: string;
}

const CustomerCareSalesCard: React.FC<CustomerCareSalesCardProps> = ({ className = '' }) => {
  const { currentUser } = useAuth();
  const [salesData, setSalesData] = useState<TodaySalesData>({
    totalSales: 0,
    transactionCount: 0,
    totalItems: 0,
    topProduct: 'N/A'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodaySales = async () => {
      if (!currentUser?.id) {
        console.log('🔍 CustomerCareSalesCard: No current user, skipping sales fetch');
        return;
      }

      console.log('💰 CustomerCareSalesCard: Starting sales data fetch', {
        userId: currentUser.id,
        timestamp: new Date().toISOString()
      });

      try {
        // Create proper date range for today in local timezone
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Get local date string for logging
        const localDateStr = `${todayStart.getFullYear()}-${String(todayStart.getMonth() + 1).padStart(2, '0')}-${String(todayStart.getDate()).padStart(2, '0')}`;

        console.log('📅 Date range for sales query:', {
          localDate: localDateStr,
          start: todayStart.toISOString(),
          end: todayEnd.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });

        // Fetch sales made by this staff member today - simplified query
        const { data: sales, error } = await supabase
          .from('lats_sales')
          .select('*')
          .eq('createdBy', currentUser.id)
          .gte('createdAt', todayStart.toISOString())
          .lte('createdAt', todayEnd.toISOString());

        if (error) {
          console.error('❌ Error fetching today sales:', error);
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            hint: error.hint
          });
          return;
        }

        // Fetch sale items separately to avoid nested query syntax issues
        let salesWithItems = sales || [];
        if (sales && sales.length > 0) {
          const saleIds = sales.map(s => s.id);
          const { data: items } = await supabase
            .from('lats_sale_items')
            .select('sale_id, quantity, productName, variantName')
            .in('sale_id', saleIds);

          // Attach items to their respective sales
          salesWithItems = sales.map(sale => ({
            ...sale,
            lats_sale_items: (items || []).filter(item => item.sale_id === sale.id)
          }));
        }

        console.log('✅ Sales data fetched successfully:', {
          salesCount: salesWithItems?.length || 0,
          hasItems: salesWithItems?.some(s => s.lats_sale_items?.length > 0)
        });

        if (!salesWithItems || salesWithItems.length === 0) {
          console.log('ℹ️ No sales found for today');
          setLoading(false);
          return;
        }

        // Calculate metrics
        const totalSales = salesWithItems.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
        const transactionCount = salesWithItems.length;
        
        // Count total items sold
        let totalItems = 0;
        const productCounts: Record<string, number> = {};
        
        salesWithItems.forEach(sale => {
          if (sale.lats_sale_items && Array.isArray(sale.lats_sale_items)) {
            sale.lats_sale_items.forEach((item: any) => {
              totalItems += item.quantity || 0;
              const productName = item.productName || item.variantName || 'Unknown';
              productCounts[productName] = (productCounts[productName] || 0) + (item.quantity || 0);
            });
          }
        });

        // Find top product
        let topProduct = 'N/A';
        let maxCount = 0;
        Object.entries(productCounts).forEach(([product, count]) => {
          if (count > maxCount) {
            maxCount = count;
            topProduct = product;
          }
        });

        setSalesData({
          totalSales,
          transactionCount,
          totalItems,
          topProduct
        });

        console.log('📊 Sales metrics calculated:', {
          totalSales,
          transactionCount,
          totalItems,
          topProduct,
          avgPerTransaction: transactionCount > 0 ? (totalSales / transactionCount).toFixed(2) : 0
        });
      } catch (err) {
        console.error('❌ Error calculating today sales:', err);
        console.error('Stack trace:', err instanceof Error ? err.stack : 'Unknown error');
      } finally {
        setLoading(false);
        console.log('🏁 CustomerCareSalesCard: Fetch complete');
      }
    };

    fetchTodaySales();
  }, [currentUser?.id]);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-6">
        <DollarSign className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">Today's Sales Performance</h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign size={16} className="text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">Total Sales</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {salesData.totalSales.toLocaleString('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })}
          </p>
        </div>

        {/* Transaction Count */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <ShoppingBag size={16} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">Transactions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{salesData.transactionCount}</p>
        </div>

        {/* Total Items */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Package size={16} className="text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">Items Sold</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{salesData.totalItems}</p>
        </div>

        {/* Top Product */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <TrendingUp size={16} className="text-orange-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">Top Product</span>
          </div>
          <p className="text-sm font-bold text-gray-900 truncate" title={salesData.topProduct}>
            {salesData.topProduct}
          </p>
        </div>
      </div>

      {salesData.transactionCount === 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">No sales recorded yet today. Start selling! 🚀</p>
        </div>
      )}
    </div>
  );
};

export default CustomerCareSalesCard;

