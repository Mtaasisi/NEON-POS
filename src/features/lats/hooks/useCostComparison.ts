import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export interface PriceComparison {
  currentPrice: number;
  lastPrice?: number;
  priceChange?: number;
  percentageChange?: number;
  trend: 'up' | 'down' | 'same' | 'new';
  lastOrderDate?: string;
}

export const useCostComparison = (variantId: string, currentPrice: number) => {
  const [comparison, setComparison] = useState<PriceComparison>({
    currentPrice,
    trend: 'new'
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLastPrice();
  }, [variantId]);

  const loadLastPrice = async () => {
    if (!variantId) return;

    setIsLoading(true);
    try {
      // First get valid purchase order IDs with required status
      const { addBranchFilter } = await import('../../../lib/branchAwareApi');
      let ordersQuery = supabase
        .from('lats_purchase_orders')
        .select('id, order_date')
        .in('status', ['sent', 'received', 'completed']);
      
      // Apply branch filtering
      ordersQuery = await addBranchFilter(ordersQuery, 'purchase_orders');
      const { data: validOrders, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

      const validPurchaseOrderIds = validOrders?.map(po => po.id) || [];

      if (validPurchaseOrderIds.length === 0) {
        setComparison({ currentPrice, trend: 'new' });
        return;
      }

      // Get the most recent purchase order item for this variant
      const { data, error } = await supabase
        .from('lats_purchase_order_items')
        .select('cost_price, purchase_order_id')
        .eq('variant_id', variantId)
        .in('purchase_order_id', validPurchaseOrderIds)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const lastPrice = data[0].cost_price;
        const purchaseOrder = validOrders?.find(po => po.id === data[0].purchase_order_id);
        const lastOrderDate = purchaseOrder?.order_date;
        const priceChange = currentPrice - lastPrice;
        const percentageChange = lastPrice > 0 ? ((currentPrice - lastPrice) / lastPrice) * 100 : 0;

        let trend: 'up' | 'down' | 'same' = 'same';
        if (priceChange > 0) trend = 'up';
        else if (priceChange < 0) trend = 'down';

        setComparison({
          currentPrice,
          lastPrice,
          priceChange,
          percentageChange,
          trend,
          lastOrderDate
        });
      } else {
        setComparison({
          currentPrice,
          trend: 'new'
        });
      }
    } catch (error) {
      console.error('Error loading price comparison:', error);
      setComparison({
        currentPrice,
        trend: 'new'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { comparison, isLoading, refresh: loadLastPrice };
};

// Utility component to display price comparison badge
export const PriceComparisonBadge: React.FC<{ comparison: PriceComparison; showDetails?: boolean }> = ({ 
  comparison, 
  showDetails = true 
}) => {
  if (comparison.trend === 'new') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
        NEW
      </span>
    );
  }

  if (comparison.trend === 'same') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
        SAME
      </span>
    );
  }

  const isIncrease = comparison.trend === 'up';
  const color = isIncrease ? 'red' : 'green';
  const bgColor = isIncrease ? 'bg-red-100' : 'bg-green-100';
  const textColor = isIncrease ? 'text-red-700' : 'text-green-700';
  const symbol = isIncrease ? '▲' : '▼';

  return (
    <div className="space-y-1">
      <span className={`inline-flex items-center gap-1 px-2 py-1 ${bgColor} ${textColor} text-xs font-semibold rounded`}>
        {symbol} {Math.abs(comparison.percentageChange || 0).toFixed(1)}%
      </span>
      {showDetails && comparison.lastPrice !== undefined && (
        <p className="text-xs text-gray-600">
          Last: TSh {comparison.lastPrice.toLocaleString()}
        </p>
      )}
    </div>
  );
};

