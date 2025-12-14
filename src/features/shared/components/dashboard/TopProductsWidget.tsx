import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Package, ExternalLink, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';

interface TopProductsWidgetProps {
  className?: string;
}

interface TopProduct {
  id: string;
  name: string;
  quantitySold: number;
  revenue: number;
  category: string;
}

export const TopProductsWidget: React.FC<TopProductsWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    loadTopProducts();
  }, []);

  const loadTopProducts = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      // Get sales from last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      // Fetch sales first (Neon compatible approach)
      let salesQuery = supabase
        .from('lats_sales')
        .select('id, created_at, branch_id')
        .gte('created_at', weekAgo.toISOString());
      
      if (currentBranchId) {
        salesQuery = salesQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: sales, error: salesError } = await salesQuery;
      if (salesError) throw salesError;
      
      if (!sales || sales.length === 0) {
        setTopProducts([]);
        setTotalRevenue(0);
        return;
      }
      
      // Get sale IDs
      const saleIds = sales.map((s: any) => s.id);
      
      // Query sale items
      const { data: saleItems, error: itemsError } = await supabase
        .from('lats_sale_items')
        .select('id, product_id, variant_id, quantity, unit_price, sale_id')
        .in('sale_id', saleIds);
      
      if (itemsError) throw itemsError;
      
      if (!saleItems || saleItems.length === 0) {
        setTopProducts([]);
        setTotalRevenue(0);
        return;
      }
      
      // Fetch product info
      const productIds = [...new Set(saleItems.map((item: any) => item.product_id).filter(Boolean))];
      const { data: products, error: productsError } = await supabase
        .from('lats_products')
        .select('id, name, category')
        .in('id', productIds);
      
      if (productsError) throw productsError;
      
      const productsMap = new Map((products || []).map((p: any) => [p.id, p]));
      
      // Aggregate by product
      const productMap = new Map<string, TopProduct>();
      let total = 0;
      
      (saleItems || []).forEach((item: any) => {
        const product = productsMap.get(item.product_id);
        if (!product) return;
        
        const productId = item.product_id;
        const price = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price;
        const quantity = item.quantity || 0;
        const revenue = (price || 0) * quantity;
        
        total += revenue;
        
        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!;
          existing.quantitySold += quantity;
          existing.revenue += revenue;
        } else {
          productMap.set(productId, {
            id: productId,
            name: product.name || 'Unknown Product',
            quantitySold: quantity,
            revenue: revenue,
            category: product.category || 'Uncategorized'
          });
        }
      });
      
      // Sort by revenue and get top 5
      const sortedProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      
      setTopProducts(sortedProducts);
      setTotalRevenue(total);
      
    } catch (error) {
      console.error('Error loading top products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `TSh ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `TSh ${(amount / 1000).toFixed(0)}K`;
    return `TSh ${amount.toFixed(0)}`;
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
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Top Products</h3>
            <p className="text-xs text-gray-400 mt-0.5">Last 7 days</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/lats/inventory')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View Products"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Total Revenue */}
      <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-orange-50 to-red-50">
        <p className="text-xs text-gray-600 mb-1">Total Revenue (Top 5)</p>
        <p className="text-2xl font-bold text-gray-900">
          {formatCurrency(totalRevenue)}
        </p>
      </div>

      {/* Top Products List */}
      <div className="space-y-3 flex-grow max-h-72 overflow-y-auto mb-6">
        {topProducts.length > 0 ? (
          topProducts.map((product, index) => (
            <div 
              key={product.id} 
              className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  index === 2 ? 'bg-orange-600' :
                  'bg-gray-300'
                }`}>
                  <span className="text-sm font-bold text-white">#{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{product.category}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <ShoppingCart size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-600">
                        {product.quantitySold} sold
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-orange-600">
                      {formatCurrency(product.revenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No sales data yet</p>
            <p className="text-xs text-gray-400 mt-1">Start selling to see top products</p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-auto pt-6">
        <button
          onClick={() => navigate('/lats/inventory')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <Package size={14} />
          <span>View All Products</span>
        </button>
      </div>
    </div>
  );
};

