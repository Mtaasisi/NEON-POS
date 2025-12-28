import React, { useState, useEffect } from 'react';
import { Tag, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';

interface SalesByCategoryChartProps {
  className?: string;
}

interface CategoryData {
  name: string;
  sales: number;
  count: number;
  color: string;
}

export const SalesByCategoryChart: React.FC<SalesByCategoryChartProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    loadCategoryData();
  }, [currentUser?.id]);

  const loadCategoryData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      // Get last 7 days
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
        setCategoryData([]);
        setTotalSales(0);
        return;
      }
      
      // Get sale IDs
      const saleIds = sales.map((s: any) => s.id);
      
      // Fetch sale items
      const { data: saleItems, error: itemsError } = await supabase
        .from('lats_sale_items')
        .select('id, quantity, unit_price, sale_id, product_id')
        .in('sale_id', saleIds);
      
      if (itemsError) throw itemsError;
      
      if (!saleItems || saleItems.length === 0) {
        setCategoryData([]);
        setTotalSales(0);
        return;
      }
      
      // Fetch product info for categories
      const productIds = [...new Set(saleItems.map((item: any) => item.product_id).filter(Boolean))];
      const { data: products, error: productsError } = await supabase
        .from('lats_products')
        .select('id, category')
        .in('id', productIds);
      
      if (productsError) throw productsError;
      
      const productsMap = new Map((products || []).map((p: any) => [p.id, p]));
      
      // Aggregate by category
      const categoryMap = new Map<string, { total: number; count: number }>();
      let total = 0;
      
      (saleItems || []).forEach((item: any) => {
        const product = productsMap.get(item.product_id);
        const category = product?.category || 'Uncategorized';
        
        // Validate price and quantity
        const rawPrice = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price;
        const price = isNaN(rawPrice) || rawPrice === null || rawPrice === undefined ? 0 : rawPrice;
        const quantity = isNaN(item.quantity) || item.quantity === null || item.quantity === undefined ? 0 : item.quantity;
        const revenue = price * quantity;
        
        // Validate revenue
        const validRevenue = isNaN(revenue) || !isFinite(revenue) ? 0 : revenue;
        
        total += validRevenue;
        
        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category)!;
          existing.total += validRevenue;
          existing.count += quantity;
        } else {
          categoryMap.set(category, { total: validRevenue, count: quantity });
        }
      });
      
      // Colors for categories
      const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
        '#ef4444', '#06b6d4', '#ec4899', '#84cc16'
      ];
      
      // Convert to array and sort by sales
      const chartData: CategoryData[] = Array.from(categoryMap.entries())
        .map(([name, data], index) => ({
          name: name.length > 15 ? name.substring(0, 15) + '...' : name,
          sales: data.total,
          count: data.count,
          color: colors[index % colors.length]
        }))
        .filter(item => {
          // Validate all numeric values
          const isValid = !isNaN(item.sales) && isFinite(item.sales) && 
                         !isNaN(item.count) && isFinite(item.count);
          if (!isValid) {
            console.warn('⚠️ Filtering out invalid category data:', item);
          }
          return isValid;
        })
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 8); // Top 8 categories
      
      const validTotal = isNaN(total) || !isFinite(total) ? 0 : total;
      setCategoryData(chartData);
      setTotalSales(validTotal);
      
    } catch (error) {
      console.error('Error loading category data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    // Validate value
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return '0';
    
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toFixed(0);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalSales > 0 ? ((data.sales / totalSales) * 100).toFixed(1) : 0;
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="text-sm font-semibold mb-1">{data.name}</p>
          <p className="text-xs text-gray-300">
            Sales: TSh {formatCurrency(data.sales)}
          </p>
          <p className="text-xs text-gray-300">
            Items Sold: {data.count}
          </p>
          <p className="text-xs text-emerald-400 font-medium mt-1">
            {percentage}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-6 h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-medium text-gray-900">Sales by Category</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            TSh {formatCurrency(totalSales)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
        </div>
      </div>

      {/* No Data Message */}
      {categoryData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <Tag className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-sm">No category data available</p>
          <p className="text-xs mt-1">Sales will be categorized here</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="flex-grow -mx-2 min-h-48">
            {categoryData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af" 
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCurrency}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Bar dataKey="sales" radius={[8, 8, 0, 0]} maxBarSize={40}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>

          {/* Top Category Highlight */}
          {categoryData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Top Category</p>
                    <p className="text-sm font-semibold text-gray-900">{categoryData[0].name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600">
                    TSh {formatCurrency(categoryData[0].sales)}
                  </p>
                  <p className="text-xs text-gray-600">{categoryData[0].count} items</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

