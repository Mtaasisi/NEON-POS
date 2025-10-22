import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { dashboardService } from '../../../../services/dashboardService';
import { useAuth } from '../../../../context/AuthContext';
import { getProducts } from '../../../../lib/latsProductApi';

interface StockLevelChartProps {
  className?: string;
}

interface StockItem {
  name: string;
  stock: number;
  status: 'good' | 'low' | 'critical';
  actualQuantity: number;
  minQuantity: number;
}

export const StockLevelChart: React.FC<StockLevelChartProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    loadStockData();
  }, [currentUser?.id]);

  const loadStockData = async () => {
    try {
      setIsLoading(true);
      
      if (currentUser?.id) {
        // Fetch real products with variants
        console.log('📦 Stock Levels: Loading product data...');
        const products = await getProducts();
        console.log(`📊 Loaded ${products.length} products for stock analysis`);
        console.log('📊 Sample products:', products.slice(0, 3).map(p => ({ name: p.name, variants: p.variants?.length || 0 })));
        
        // Calculate stock levels for each product with variants
        const stockItems: StockItem[] = [];
        let lowStockCounter = 0;
        let criticalStockCounter = 0;
        
        products.forEach(product => {
          if (product.variants && product.variants.length > 0) {
            // Calculate total quantity and average min quantity for product
            const totalQuantity = product.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
            const totalMinQuantity = product.variants.reduce((sum, v) => sum + (v.minQuantity || 0), 0);
            const avgMinQuantity = totalMinQuantity / product.variants.length;
            
            // Calculate stock percentage (quantity vs min quantity)
            const stockPercentage = avgMinQuantity > 0 
              ? Math.min(100, Math.round((totalQuantity / avgMinQuantity) * 100))
              : (totalQuantity > 0 ? 100 : 0);
            
            // Determine status
            let status: 'good' | 'low' | 'critical' = 'good';
            if (totalQuantity === 0) {
              status = 'critical';
              criticalStockCounter++;
            } else if (totalQuantity <= avgMinQuantity) {
              status = 'low';
              lowStockCounter++;
            }
            
            // Clean and truncate product name for better display
            const productName = product.name || 'Unnamed Product';
            const cleanName = productName
              .trim()
              .substring(0, 25); // Increased from 15 to 25 characters
            
            stockItems.push({
              name: productName.length > 25 ? cleanName + '...' : cleanName,
              stock: stockPercentage,
              status,
              actualQuantity: totalQuantity,
              minQuantity: Math.round(avgMinQuantity)
            });
            
            console.log(`📦 Product: "${productName}" | Qty: ${totalQuantity} | Min: ${Math.round(avgMinQuantity)} | Status: ${status}`);
          }
        });
        
        // Sort by status (critical first, then low, then good) and limit to top 10
        const sortedItems = stockItems
          .sort((a, b) => {
            const statusOrder = { critical: 0, low: 1, good: 2 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
              return statusOrder[a.status] - statusOrder[b.status];
            }
            return a.stock - b.stock; // Within same status, sort by stock level
          })
          .slice(0, 10); // Show top 10 items
        
        console.log('📊 Final stock data for chart:', sortedItems);
        console.log(`📊 Low stock count: ${lowStockCounter}, Critical: ${criticalStockCounter}`);
        
        setStockData(sortedItems);
        setLowStockCount(lowStockCounter + criticalStockCounter);
      }
      
    } catch (error) {
      console.error('❌ Error loading stock data:', error);
      console.error('❌ Error details:', error);
      // Set empty data on error
      setStockData([]);
      setLowStockCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const getBarColor = (status: string) => {
    switch (status) {
      case 'good': return '#10b981';
      case 'low': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const status = data.status;
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="text-sm font-semibold">{data.name}</p>
          <p className="text-xs text-gray-300 mt-1">
            Current: {data.actualQuantity} units
          </p>
          <p className="text-xs text-gray-300">
            Min Required: {data.minQuantity} units
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Stock Level: {payload[0].value}%
          </p>
          <p className={`text-xs mt-1 font-medium ${
            status === 'good' ? 'text-green-400' : 
            status === 'low' ? 'text-amber-400' : 
            'text-red-400'
          }`}>
            {status === 'good' ? '✓ Good Stock' : 
             status === 'low' ? '⚠ Low Stock' : 
             '✗ Critical Level'}
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

  console.log('📊 Rendering chart with data:', stockData);
  console.log('📊 Data length:', stockData.length);
  console.log('📊 First item:', stockData[0]);
  console.log('📊 All items stock values:', stockData.map(item => ({ name: item.name, stock: item.stock, status: item.status })));

  return (
    <div className={`bg-white rounded-2xl p-6 h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-gray-700" />
            <h3 className="text-sm font-medium text-gray-900">Stock Levels</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stockData.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stockData.length === 10 ? 'Top 10 products' : `Product${stockData.length !== 1 ? 's' : ''} tracked`}
          </p>
        </div>
        {lowStockCount > 0 && (
          <div className="px-2.5 py-1.5 rounded-lg bg-amber-50">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-600">
                {lowStockCount} low
              </span>
            </div>
          </div>
        )}
      </div>

      {/* No Data Message */}
      {stockData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <Package className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-sm">No inventory data available</p>
          <p className="text-xs mt-1">Add products to see stock levels</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="flex-grow -mx-2 min-h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stockData} layout="horizontal" margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis 
              type="number" 
              domain={[0, 100]}
              stroke="#9ca3af" 
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis 
              type="category"
              dataKey="name" 
              stroke="#9ca3af" 
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="stock" radius={[0, 4, 4, 0]} maxBarSize={20} fill="#10b981">
              {stockData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-600">Good</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-gray-600">Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-gray-600">Critical</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

