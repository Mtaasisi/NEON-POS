import React, { useState, useEffect } from 'react';
import { History, Plus, RefreshCw, X, Clock, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabaseClient';
import { formatMoney, Currency } from '../../lib/purchaseOrderUtils';

interface RecentlyOrderedProduct {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  lastOrderedDate: string;
  lastOrderedQuantity: number;
  lastCostPrice: number;
  orderCount: number;
  supplierId?: string;
  supplierName?: string;
}

interface RecentlyOrderedWidgetProps {
  selectedSupplierId?: string;
  currency: Currency;
  onAddToCart: (product: any, variant: any, quantity: number) => void;
  className?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const RecentlyOrderedWidget: React.FC<RecentlyOrderedWidgetProps> = ({
  selectedSupplierId,
  currency,
  onAddToCart,
  className = '',
  isExpanded = false,
  onToggle
}) => {
  const [recentProducts, setRecentProducts] = useState<RecentlyOrderedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecentlyOrdered();
  }, [selectedSupplierId]);

  const loadRecentlyOrdered = async () => {
    setIsLoading(true);
    try {
      // Get recent PO items from the last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Build the query starting from purchase_orders to enable proper filtering
      let poQuery = supabase
        .from('lats_purchase_orders')
        .select('id, order_date, supplier_id')
        .gte('order_date', ninetyDaysAgo.toISOString())
        .order('order_date', { ascending: false });

      // Filter by supplier if selected
      if (selectedSupplierId) {
        poQuery = poQuery.eq('supplier_id', selectedSupplierId);
      }

      // Apply branch filtering
      const { addBranchFilter } = await import('../../../../lib/branchAwareApi');
      poQuery = await addBranchFilter(poQuery, 'purchase_orders');

      const { data: purchaseOrders, error: poError } = await poQuery;
      
      if (poError) throw poError;
      if (!purchaseOrders || purchaseOrders.length === 0) {
        setRecentProducts([]);
        setIsLoading(false);
        return;
      }

      // Get the PO IDs to fetch items
      const poIds = purchaseOrders.map(po => po.id);

      // Now fetch the items for these purchase orders
      const { data, error } = await supabase
        .from('lats_purchase_order_items')
        .select(`
          product_id,
          variant_id,
          quantity_ordered,
          unit_cost,
          purchase_order_id,
          product:lats_products(
            id,
            name
          ),
          variant:lats_product_variants(
            id,
            variant_name,
            sku
          )
        `)
        .in('purchase_order_id', poIds);

      if (error) throw error;

      if (data) {
        // Create a map of purchase orders for quick lookup
        const poMap = new Map(purchaseOrders.map(po => [po.id, po]));

        // Fetch supplier data for the purchase orders with branch filtering
        const supplierIds = [...new Set(purchaseOrders.map(po => po.supplier_id).filter(Boolean))];
        let suppliersQuery = supabase
          .from('lats_suppliers')
          .select('id, name')
          .in('id', supplierIds);
        suppliersQuery = await addBranchFilter(suppliersQuery, 'suppliers');
        const { data: suppliers } = await suppliersQuery;
        
        const supplierMap = new Map(suppliers?.map(s => [s.id, s]) || []);

        // Group by product and variant, keep most recent
        const productMap = new Map<string, RecentlyOrderedProduct>();

        data.forEach((item: any) => {
          const key = `${item.product_id}-${item.variant_id}`;
          const po = poMap.get(item.purchase_order_id);
          
          if (!po) return; // Skip if PO not found
          
          if (!productMap.has(key)) {
            const supplier = po.supplier_id ? supplierMap.get(po.supplier_id) : null;
            productMap.set(key, {
              productId: item.product_id,
              productName: item.product.name,
              variantId: item.variant_id,
              variantName: item.variant.variant_name,
              sku: item.variant.sku,
              lastOrderedDate: po.order_date,
              lastOrderedQuantity: item.quantity_ordered,
              lastCostPrice: item.unit_cost,
              orderCount: 1,
              supplierId: po.supplier_id,
              supplierName: supplier?.name || 'Unknown'
            });
          } else {
            // Increment order count
            const existing = productMap.get(key)!;
            existing.orderCount++;
          }
        });

        // Convert to array and take top 15
        const recentArray = Array.from(productMap.values())
          .sort((a, b) => new Date(b.lastOrderedDate).getTime() - new Date(a.lastOrderedDate).getTime())
          .slice(0, 15);

        setRecentProducts(recentArray);
      }
    } catch (error) {
      console.error('Error loading recently ordered products:', error);
      toast.error('Failed to load recently ordered products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = (product: RecentlyOrderedProduct) => {
    const productData = {
      id: product.productId,
      name: product.productName,
      supplierId: product.supplierId
    };

    const variantData = {
      id: product.variantId,
      name: product.variantName,
      sku: product.sku,
      costPrice: product.lastCostPrice
    };

    onAddToCart(productData, variantData, product.lastOrderedQuantity);
    toast.success(`Added ${product.productName} (${product.lastOrderedQuantity} units)`);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  if (!isExpanded) {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-3 cursor-pointer hover:bg-blue-50/80 transition-colors ${className}`}>
        <div
          onClick={onToggle}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Recently Ordered</span>
            {recentProducts.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                {recentProducts.length}
              </span>
            )}
          </div>
          <ChevronDown className="w-5 h-5 text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className="p-4 border-b border-blue-200 bg-white/50 cursor-pointer hover:bg-blue-50/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                Recently Ordered
                {recentProducts.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                    {recentProducts.length}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-600">Last 90 days</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadRecentlyOrdered();
              }}
              disabled={isLoading}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <div className="p-2 text-blue-600">
              <ChevronUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading order history...</p>
          </div>
        ) : recentProducts.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">No Recent Orders</p>
            <p className="text-xs text-gray-600">
              {selectedSupplierId 
                ? 'No orders from this supplier in the last 90 days'
                : 'No purchase orders in the last 90 days'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {recentProducts.map((product) => (
              <div
                key={`${product.productId}-${product.variantId}`}
                className="bg-white border border-blue-200 rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate mb-1">
                      {product.productName}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2">
                      {product.variantName} • SKU: {product.sku}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">{getTimeAgo(product.lastOrderedDate)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Last qty:</span>
                        <span className="font-semibold text-blue-600">{product.lastOrderedQuantity}</span>
                      </div>
                      {product.orderCount > 1 && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                          {product.orderCount}x ordered
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs">
                      <span className="text-gray-500">Last price:</span>
                      <span className="font-semibold text-gray-900 ml-1">
                        {formatMoney(product.lastCostPrice, currency)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddProduct(product)}
                    className="flex-shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                    title="Reorder with same quantity"
                  >
                    <Plus className="w-3 h-3" />
                    Reorder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentlyOrderedWidget;

