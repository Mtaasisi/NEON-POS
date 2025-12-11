import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../shared/components/ui/BackButton';
import { useInventoryStore } from '../stores/useInventoryStore';
import { Wrench, TrendingUp, DollarSign, Package, AlertCircle, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { format } from '../lib/format';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';

const SparePartsAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { spareParts, loadSpareParts } = useInventoryStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<any[]>([]);

  useEffect(() => {
    loadSpareParts();
    loadSalesData();
  }, [selectedPeriod, loadSpareParts]);

  const loadSalesData = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case 'all':
          startDate.setFullYear(2020); // All time
          break;
      }

      // Fetch sales with spare parts
      const { data: sales, error } = await supabase
        .from('lats_sales')
        .select('id, created_at, total_amount')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Fetch sale items for spare parts
      if (sales && sales.length > 0) {
        const saleIds = sales.map(s => s.id);
        const { data: items, error: itemsError } = await supabase
          .from('lats_sale_items')
          .select('*')
          .in('sale_id', saleIds)
          .or('item_type.eq.spare-part,part_number.not.is.null');

        if (!itemsError && items) {
          // Group by spare part
          const sparePartSales = items
            .filter((item: any) => item.item_type === 'spare-part' || item.part_number)
            .map((item: any) => ({
              ...item,
              saleDate: sales.find(s => s.id === item.sale_id)?.created_at
            }));

          setSalesData(sparePartSales);
        }
      }
    } catch (error) {
      console.error('Error loading sales data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalParts = spareParts.length;
    const inStock = spareParts.filter(p => p.quantity > p.min_quantity).length;
    const lowStock = spareParts.filter(p => p.quantity <= p.min_quantity && p.quantity > 0).length;
    const outOfStock = spareParts.filter(p => p.quantity === 0).length;
    
    const totalValue = spareParts.reduce((sum, p) => sum + (p.quantity * (p.selling_price || 0)), 0);
    const totalCost = spareParts.reduce((sum, p) => sum + (p.quantity * (p.cost_price || 0)), 0);
    const potentialProfit = totalValue - totalCost;

    // Sales analytics
    const totalSales = salesData.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const totalQuantitySold = salesData.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const uniquePartsSold = new Set(salesData.map((item: any) => item.product_id || item.part_number)).size;

    // Top selling parts
    const partSales = salesData.reduce((acc: any, item: any) => {
      const key = item.product_id || item.part_number || 'unknown';
      if (!acc[key]) {
        acc[key] = {
          id: item.product_id,
          name: item.product_name || 'Unknown',
          partNumber: item.part_number,
          quantity: 0,
          revenue: 0
        };
      }
      acc[key].quantity += item.quantity || 0;
      acc[key].revenue += item.total_price || 0;
      return acc;
    }, {});

    const topSelling = Object.values(partSales)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    // Category breakdown
    const categoryBreakdown = spareParts.reduce((acc: any, part) => {
      const categoryName = 'Uncategorized'; // Can be enhanced with actual category lookup
      if (!acc[categoryName]) {
        acc[categoryName] = { name: categoryName, count: 0, value: 0 };
      }
      acc[categoryName].count += 1;
      acc[categoryName].value += part.quantity * (part.selling_price || 0);
      return acc;
    }, {});

    return {
      totalParts,
      inStock,
      lowStock,
      outOfStock,
      totalValue,
      totalCost,
      potentialProfit,
      totalSales,
      totalQuantitySold,
      uniquePartsSold,
      topSelling,
      categoryBreakdown: Object.values(categoryBreakdown)
    };
  }, [spareParts, salesData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Spare Parts Analytics</h1>
                <p className="text-sm text-gray-600">Comprehensive insights and performance metrics</p>
              </div>
            </div>
            <BackButton to="/lats/spare-parts" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg" />
          </div>
        </div>

        {/* Period Selector */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Period:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Total Parts</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalParts}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">{format.currency(analytics.totalValue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Sales Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{format.currency(analytics.totalSales)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Parts Sold</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalQuantitySold}</p>
                </div>
                <Wrench className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Stock Status Pie Chart */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Stock Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'In Stock', value: analytics.inStock, color: '#10b981' },
                      { name: 'Low Stock', value: analytics.lowStock, color: '#f59e0b' },
                      { name: 'Out of Stock', value: analytics.outOfStock, color: '#ef4444' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'In Stock', value: analytics.inStock, color: '#10b981' },
                      { name: 'Low Stock', value: analytics.lowStock, color: '#f59e0b' },
                      { name: 'Out of Stock', value: analytics.outOfStock, color: '#ef4444' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top Selling Parts */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top Selling Parts</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topSelling.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value: any) => format.currency(value)} />
                  <Bar dataKey="revenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stock Alerts */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <h3 className="text-lg font-bold text-gray-900">Stock Alerts</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">In Stock</p>
                <p className="text-2xl font-bold text-green-600">{analytics.inStock}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.lowStock}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{analytics.outOfStock}</p>
              </div>
            </div>
          </div>

          {/* Top Selling Parts List */}
          {analytics.topSelling.length > 0 && (
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 Selling Parts</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Part Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Part Number</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Quantity Sold</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topSelling.map((part: any, index: number) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{part.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{part.partNumber || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">{part.quantity}</td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">{format.currency(part.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SparePartsAnalyticsPage;
