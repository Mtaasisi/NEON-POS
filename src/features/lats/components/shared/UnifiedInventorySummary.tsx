import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { Package, Wrench, AlertTriangle, DollarSign } from 'lucide-react';
import { format } from '../../lib/format';

export const UnifiedInventorySummary: React.FC = () => {
  const { products, spareParts, loadProducts, loadSpareParts } = useInventoryStore();
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalSpareParts: 0,
    lowStockProducts: 0,
    lowStockSpareParts: 0,
    totalValue: 0,
    isLoading: true
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          loadProducts({ page: 1, limit: 1000 }),
          loadSpareParts()
        ]);
      } catch (error) {
        console.error('Failed to load inventory summary:', error);
      }
    };
    
    loadData();
  }, [loadProducts, loadSpareParts]);

  useEffect(() => {
    const lowStockProducts = products.filter(
      p => (p.stockQuantity || 0) <= (p.minStockLevel || 0) && (p.stockQuantity || 0) > 0
    ).length;
    
    const outOfStockProducts = products.filter(p => (p.stockQuantity || 0) === 0).length;
    
    const lowStockSpareParts = spareParts.filter(
      sp => (sp.quantity || 0) <= (sp.min_quantity || 0) && (sp.quantity || 0) > 0
    ).length;
    
    const outOfStockSpareParts = spareParts.filter(sp => (sp.quantity || 0) === 0).length;

    // Calculate total value from variants when available, otherwise use product-level values
    const totalValue = 
      products.reduce((sum, p) => {
        let productValue = 0;
        
        if (p.variants && p.variants.length > 0) {
          // Product has variants - calculate from variants
          productValue = p.variants.reduce((variantSum, variant) => {
            const costPrice = variant.costPrice || (variant as any).cost_price || 0;
            const quantity = variant.quantity || 0;
            return variantSum + (costPrice * quantity);
          }, 0);
        } else {
          // Product has no variants - use product-level stock and cost
          const productStock = p.stockQuantity || (p as any).stock_quantity || 0;
          const productCost = p.costPrice || (p as any).cost_price || 0;
          productValue = productStock * productCost;
        }
        
        return sum + productValue;
      }, 0) +
      spareParts.reduce((sum, sp) => sum + ((sp.cost_price || 0) * (sp.quantity || 0)), 0);

    setSummary({
      totalProducts: products.length,
      totalSpareParts: spareParts.length,
      lowStockProducts: lowStockProducts + outOfStockProducts,
      lowStockSpareParts: lowStockSpareParts + outOfStockSpareParts,
      totalValue,
      isLoading: false
    });
  }, [products, spareParts]);

  if (summary.isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-700">Products</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{summary.totalProducts}</div>
        {summary.lowStockProducts > 0 && (
          <div className="text-sm text-orange-600 flex items-center gap-1 mt-2">
            <AlertTriangle size={14} />
            {summary.lowStockProducts} low stock
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-5 h-5 text-orange-600" />
          <span className="font-semibold text-gray-700">Spare Parts</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{summary.totalSpareParts}</div>
        {summary.lowStockSpareParts > 0 && (
          <div className="text-sm text-orange-600 flex items-center gap-1 mt-2">
            <AlertTriangle size={14} />
            {summary.lowStockSpareParts} low stock
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold text-gray-700">Total Items</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {summary.totalProducts + summary.totalSpareParts}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Combined inventory
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-gray-700">Total Value</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {format.currency(summary.totalValue)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          At cost price
        </div>
      </div>
    </div>
  );
};
