import React, { useState, useEffect } from 'react';
import { DollarSign, X, AlertCircle, TrendingUp, Calculator, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getLatsProvider } from '../../lib/data/provider';

interface PurchaseOrderItem {
  id: string;
  productId: string;
  variantId?: string;
  name?: string; // Legacy field, might not always be present
  quantity: number;
  receivedQuantity?: number;
  costPrice: number;
  product?: {
    id: string;
    name: string;
    sku?: string;
  };
  variant?: {
    id: string;
    name: string;
    sku?: string;
  };
}

interface PricingData {
  cost_price: number;
  selling_price: number;
  markup_percentage: number;
  profit_per_unit: number;
}

interface SetPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: {
    id: string;
    items: PurchaseOrderItem[];
  };
  onConfirm: (pricingData: Map<string, PricingData>) => Promise<void>;
  isLoading?: boolean;
}

const SetPricingModal: React.FC<SetPricingModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onConfirm,
  isLoading = false
}) => {
  const [pricingData, setPricingData] = useState<Map<string, PricingData>>(new Map());
  const [productPrices, setProductPrices] = useState<Map<string, number>>(new Map());
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const dataProvider = getLatsProvider();

  // Helper function to format numbers with comma separators
  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Fetch product selling prices from database
  useEffect(() => {
    if (isOpen && purchaseOrder.items.length > 0) {
      fetchProductPrices();
    }
  }, [isOpen, purchaseOrder.items]);

  const fetchProductPrices = async () => {
    setIsLoadingProducts(true);
    try {
      const priceMap = new Map<string, number>();
      
      // Fetch current selling prices for all products in the PO
      for (const item of purchaseOrder.items) {
        // Skip items without a valid productId
        if (!item.productId) {
          console.warn(`Skipping item ${item.id} - missing productId`, item);
          continue;
        }
        
        try {
          const response = await dataProvider.getProduct(item.productId);
          if (response.ok && response.data) {
            const price = parseFloat(String(response.data.price || 0)) || 0;
            priceMap.set(item.id, price);
          }
        } catch (error) {
          console.error(`Error fetching price for product ${item.productId}:`, error);
        }
      }
      
      setProductPrices(priceMap);
    } catch (error) {
      console.error('Error fetching product prices:', error);
      toast.error('Error loading product prices');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Initialize pricing data from purchase order items
  useEffect(() => {
    if (isOpen && purchaseOrder.items.length > 0) {
      const initialPricing = new Map<string, PricingData>();
      
      purchaseOrder.items.forEach(item => {
        // Use the actual cost price from the purchase order item
        const costPrice = parseFloat(String(item.costPrice || 0)) || 0;
        // Get the current selling price from product database (if available)
        const currentSellingPrice = productPrices.get(item.id) || 0;
        const defaultMarkup = 30; // 30% default markup
        
        // Use current selling price if available, otherwise calculate with default markup
        const calculatedSellingPrice = currentSellingPrice > 0 
          ? currentSellingPrice 
          : (costPrice * (1 + defaultMarkup / 100));
        
        const profit = calculatedSellingPrice - costPrice;
        const markup = costPrice > 0 ? (profit / costPrice) * 100 : defaultMarkup;
        
        initialPricing.set(item.id, {
          cost_price: parseFloat(costPrice.toFixed(2)),
          selling_price: parseFloat(calculatedSellingPrice.toFixed(2)),
          markup_percentage: parseFloat(markup.toFixed(2)),
          profit_per_unit: parseFloat(profit.toFixed(2))
        });
      });
      
      setPricingData(initialPricing);
    }
  }, [isOpen, purchaseOrder.items, productPrices]);

  const updateSellingPrice = (itemId: string, sellingPrice: number) => {
    setPricingData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (!current) return prev;

      const costPrice = current.cost_price;
      const profit = sellingPrice - costPrice;
      const markup = costPrice > 0 ? (profit / costPrice) * 100 : 0;

      newMap.set(itemId, {
        ...current,
        selling_price: sellingPrice,
        markup_percentage: parseFloat(markup.toFixed(2)),
        profit_per_unit: parseFloat(profit.toFixed(2))
      });
      return newMap;
    });
  };

  const updateMarkupPercentage = (itemId: string, markupPercentage: number) => {
    setPricingData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (!current) return prev;

      const costPrice = current.cost_price;
      const sellingPrice = costPrice * (1 + markupPercentage / 100);
      const profit = sellingPrice - costPrice;

      newMap.set(itemId, {
        ...current,
        selling_price: parseFloat(sellingPrice.toFixed(2)),
        markup_percentage: markupPercentage,
        profit_per_unit: parseFloat(profit.toFixed(2))
      });
      return newMap;
    });
  };

  const applyMarkupToAll = (markup: number) => {
    setPricingData(prev => {
      const newMap = new Map(prev);
      newMap.forEach((data, itemId) => {
        const costPrice = data.cost_price;
        const sellingPrice = costPrice * (1 + markup / 100);
        const profit = sellingPrice - costPrice;

        newMap.set(itemId, {
          ...data,
          selling_price: parseFloat(sellingPrice.toFixed(2)),
          markup_percentage: markup,
          profit_per_unit: parseFloat(profit.toFixed(2))
        });
      });
      return newMap;
    });
    toast.success(`Applied ${markup}% markup to all items`);
  };

  const handleConfirm = async () => {
    // Show confirmation
    const productsWithPrices = Array.from(pricingData.entries()).filter(
      ([_, data]) => data.selling_price > 0
    );

    if (productsWithPrices.length === 0) {
      toast.error('Please set prices for at least one product');
      return;
    }

    try {
      await onConfirm(pricingData);
      toast.success(`Prices updated for ${productsWithPrices.length} products`);
      onClose();
    } catch (error) {
      console.error('Error confirming pricing:', error);
      toast.error('Failed to save pricing');
    }
  };

  const getTotalStats = () => {
    let totalCost = 0;
    let totalSelling = 0;
    let totalProfit = 0;
    let itemCount = 0;

    purchaseOrder.items.forEach(item => {
      const pricing = pricingData.get(item.id);
      if (pricing && pricing.selling_price > 0) {
        const quantityToReceive = item.quantity - (item.receivedQuantity || 0);
        itemCount++;
        totalCost += pricing.cost_price * quantityToReceive;
        totalSelling += pricing.selling_price * quantityToReceive;
        totalProfit += pricing.profit_per_unit * quantityToReceive;
      }
    });

    return {
      totalCost: totalCost.toFixed(2),
      totalSelling: totalSelling.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      averageMarkup: totalCost > 0 ? (((totalSelling - totalCost) / totalCost) * 100).toFixed(2) : '0',
      itemCount
    };
  };

  if (!isOpen) return null;

  const stats = getTotalStats();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Set Product Prices</h3>
                <p className="text-xs text-gray-500">Configure selling prices before receiving inventory</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Stats Summary */}
          <div className="bg-green-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalCost)} TZS</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Selling</p>
                <p className="text-2xl font-bold text-green-600">{formatPrice(stats.totalSelling)} TZS</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Profit</p>
                <p className="text-2xl font-bold text-blue-600">{formatPrice(stats.totalProfit)} TZS</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Markup</p>
                <p className="text-2xl font-bold text-purple-600">{stats.averageMarkup}%</p>
              </div>
            </div>

            {/* Quick Markup Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Quick Apply:</span>
              <button
                onClick={() => applyMarkupToAll(20)}
                className="px-3 py-2 text-sm bg-white text-gray-700 border-2 border-gray-200 hover:border-green-500 rounded-lg transition-colors font-medium"
              >
                20% Markup
              </button>
              <button
                onClick={() => applyMarkupToAll(30)}
                className="px-3 py-2 text-sm bg-white text-gray-700 border-2 border-gray-200 hover:border-green-500 rounded-lg transition-colors font-medium"
              >
                30% Markup
              </button>
              <button
                onClick={() => applyMarkupToAll(50)}
                className="px-3 py-2 text-sm bg-white text-gray-700 border-2 border-gray-200 hover:border-green-500 rounded-lg transition-colors font-medium"
              >
                50% Markup
              </button>
              <button
                onClick={() => applyMarkupToAll(100)}
                className="px-3 py-2 text-sm bg-white text-gray-700 border-2 border-gray-200 hover:border-green-500 rounded-lg transition-colors font-medium"
              >
                100% Markup
              </button>
            </div>
          </div>

          {/* Products List */}
          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading products...</p>
              </div>
            </div>
          ) : purchaseOrder.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg font-medium">No items in purchase order</p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {purchaseOrder.items.map((item) => {
                const pricing = pricingData.get(item.id);
                if (!pricing) return null;

                const quantityToReceive = item.quantity - (item.receivedQuantity || 0);
                const totalItemProfit = pricing.profit_per_unit * quantityToReceive;
                const isProfitable = pricing.profit_per_unit > 0;

                return (
                  <div key={item.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors">
                    {/* Item Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {item.product?.name || item.name || 'Unknown Product'}
                          </h4>
                          {item.variant?.name && (
                            <p className="text-xs text-gray-500">Variant: {item.variant.name}</p>
                          )}
                          <p className="text-sm text-gray-600">Quantity: {quantityToReceive} units</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        isProfitable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isProfitable ? `+${formatPrice(totalItemProfit)} TZS` : 'Loss'}
                      </div>
                    </div>

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Cost Price (Read-only - from PO) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cost Price (per unit)
                        </label>
                        <input
                          type="text"
                          value={formatPrice(pricing.cost_price)}
                          readOnly
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none text-gray-900 bg-gray-50 cursor-not-allowed"
                          placeholder="0.00 TZS"
                        />
                      </div>

                      {/* Selling Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Selling Price * (per unit)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricing.selling_price}
                          onChange={(e) => updateSellingPrice(item.id, parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-900"
                          placeholder="0.00 TZS"
                        />
                      </div>

                      {/* Markup Percentage */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Markup %
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="1000"
                          value={pricing.markup_percentage}
                          onChange={(e) => updateMarkupPercentage(item.id, parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-900"
                          placeholder="0%"
                        />
                      </div>

                      {/* Profit Per Unit */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Profit (per unit)
                        </label>
                        <input
                          type="text"
                          value={formatPrice(pricing.profit_per_unit)}
                          readOnly
                          className={`w-full px-4 py-3 border-2 rounded-lg text-gray-900 font-medium cursor-not-allowed ${
                            isProfitable 
                              ? 'border-green-300 bg-green-50 text-green-700' 
                              : 'border-red-300 bg-red-50 text-red-700'
                          }`}
                          placeholder="0.00 TZS"
                        />
                      </div>
                    </div>

                    {/* Profit Indicator */}
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      {isProfitable ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-green-700">
                            Total profit for {quantityToReceive} units: <strong>{formatPrice(totalItemProfit)} TZS</strong>
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span className="text-red-700">
                            Warning: Selling price is below cost price!
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || isLoadingProducts}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                'Confirm & Receive Items'
              )}
            </button>
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">
            All prices will be saved to inventory items and product variants
          </p>
        </div>
      </div>
    </div>
  );
};

export default SetPricingModal;
