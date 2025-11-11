import React, { useState, useEffect, useCallback } from 'react';
import { X, Package, Plus, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getLatsProvider } from '../../lib/data/provider';
import { supabase } from '../../../../lib/supabaseClient';

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

interface AdditionalCost {
  id: string;
  category: string;
  amount: number;
  description: string;
}

interface PricingData {
  cost_price: number;
  additional_costs: AdditionalCost[];
  total_cost: number; // cost_price + sum of additional_costs
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
    currency?: string;
    exchangeRate?: number;
    baseCurrency?: string;
  };
  onConfirm: (pricingData: Map<string, PricingData>) => Promise<void>;
  isLoading?: boolean;
  initialPricingData?: Map<string, PricingData>;
}

const COST_CATEGORIES = [
  'Shipping Cost',
  'Customs Duty',
  'Import Tax',
  'Handling Fee',
  'Insurance',
  'Transportation',
  'Packaging',
  'Other'
];

const SetPricingModal: React.FC<SetPricingModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onConfirm,
  isLoading = false,
  initialPricingData
}) => {
  const [pricingData, setPricingData] = useState<Map<string, PricingData>>(new Map());
  const [productPrices, setProductPrices] = useState<Map<string, number>>(new Map());
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [animateStats, setAnimateStats] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(
    purchaseOrder.items.length > 0 ? purchaseOrder.items[0].id : null
  );
  const [customProfit, setCustomProfit] = useState<string>('');
  const dataProvider = getLatsProvider();

  // Helper function to format numbers with comma separators
  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    // Remove .00 for whole numbers
    if (num % 1 === 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Helper function to convert cost from foreign currency to TZS
  const convertCostToTZS = useCallback((cost: number): number => {
    const poCurrency = purchaseOrder.currency;
    const exchangeRate = purchaseOrder.exchangeRate;
    
    // If currency is TZS or not set, no conversion needed
    if (!poCurrency || poCurrency === 'TZS') {
      return cost;
    }
    
    // If we have an exchange rate, convert the cost
    if (exchangeRate && exchangeRate > 0) {
      return cost * exchangeRate;
    }
    
    // No exchange rate available, return original cost
    return cost;
  }, [purchaseOrder.currency, purchaseOrder.exchangeRate]);

  // Ensure first item is always expanded when modal opens
  useEffect(() => {
    if (isOpen && purchaseOrder.items.length > 0) {
      setExpandedItemId(purchaseOrder.items[0].id);
    }
  }, [isOpen, purchaseOrder.items]);

  const fetchProductPrices = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const priceMap = new Map<string, number>();
      
      // Fetch current selling prices for all products in the PO
      for (const item of purchaseOrder.items) {
        // Skip items without a valid productId
        if (!item.productId) {
          continue;
        }
        
        try {
          const response = await dataProvider.getProduct(item.productId);
          if (response.ok && response.data) {
            const price = parseFloat(String(response.data.price || 0)) || 0;
            priceMap.set(item.id, price);
          }
        } catch (error) {
          // Silently handle errors to avoid console spam
        }
      }
      
      setProductPrices(priceMap);
    } catch (error) {
      toast.error('Error loading product prices');
    } finally {
      setIsLoadingProducts(false);
    }
  }, [purchaseOrder.items, dataProvider]);

  // Fetch product selling prices from database
  useEffect(() => {
    if (isOpen && purchaseOrder.items.length > 0) {
      fetchProductPrices();
    }
  }, [isOpen, fetchProductPrices]);

  // Initialize pricing data from purchase order items
  useEffect(() => {
    if (isOpen && purchaseOrder.items.length > 0) {
      // Check if we have saved pricing data to restore
      if (initialPricingData && initialPricingData.size > 0) {
        setPricingData(initialPricingData);
        return;
      }
      
      const initialPricing = new Map<string, PricingData>();
      
      purchaseOrder.items.forEach(item => {
        // Get the cost price from PO item (in foreign currency)
        const rawCostPrice = parseFloat(String(item.costPrice || 0)) || 0;
        
        // Convert to TZS if needed
        const costPrice = convertCostToTZS(rawCostPrice);
        
        // Get the current selling price from product database (if available)
        const currentSellingPrice = productPrices.get(item.id) || 0;
        const defaultMarkup = 30; // 30% default markup
        
        // Initialize with no additional costs
        const additionalCosts: AdditionalCost[] = [];
        const totalCost = costPrice; // Initially just the cost price
        
        // Use current selling price if available, otherwise calculate with default markup
        const calculatedSellingPrice = currentSellingPrice > 0 
          ? currentSellingPrice 
          : (totalCost * (1 + defaultMarkup / 100));
        
        const profit = calculatedSellingPrice - totalCost;
        const markup = totalCost > 0 ? (profit / totalCost) * 100 : defaultMarkup;
        
        initialPricing.set(item.id, {
          cost_price: parseFloat(costPrice.toFixed(2)),
          additional_costs: additionalCosts,
          total_cost: parseFloat(totalCost.toFixed(2)),
          selling_price: parseFloat(calculatedSellingPrice.toFixed(2)),
          markup_percentage: parseFloat(markup.toFixed(2)),
          profit_per_unit: parseFloat(profit.toFixed(2))
        });
      });
      
      setPricingData(initialPricing);
    }
  }, [isOpen, purchaseOrder.items, purchaseOrder.currency, purchaseOrder.exchangeRate, productPrices, initialPricingData, convertCostToTZS]);

  // Helper function to recalculate all items' costs when additional costs change
  const recalculateAllCosts = (pricingMap: Map<string, PricingData>) => {
    // Calculate total additional costs across entire order
    let totalAdditionalCosts = 0;
    let totalUnits = 0;
    
    // Sum up all additional costs and total units
    purchaseOrder.items.forEach(item => {
      const pricing = pricingMap.get(item.id);
      if (pricing) {
        const quantityToReceive = item.quantity - (item.receivedQuantity || 0);
        totalUnits += quantityToReceive;
        
        // Only count additional costs from first item to avoid duplicates
        // (since all items share the same additional costs in the UI)
        if (item === purchaseOrder.items[0]) {
          totalAdditionalCosts = pricing.additional_costs.reduce((sum, cost) => sum + cost.amount, 0);
        }
      }
    });
    
    // Calculate per-unit additional cost
    const perUnitAdditionalCost = totalUnits > 0 ? totalAdditionalCosts / totalUnits : 0;
    
    // Update each item with its share of additional costs
    const newMap = new Map(pricingMap);
    purchaseOrder.items.forEach(item => {
      const pricing = newMap.get(item.id);
      if (pricing) {
        const totalCost = pricing.cost_price + perUnitAdditionalCost;
        const profit = pricing.selling_price - totalCost;
        const markup = totalCost > 0 ? (profit / totalCost) * 100 : 0;
        
        newMap.set(item.id, {
          ...pricing,
          total_cost: parseFloat(totalCost.toFixed(2)),
          markup_percentage: parseFloat(markup.toFixed(2)),
          profit_per_unit: parseFloat(profit.toFixed(2))
        });
      }
    });
    
    return newMap;
  };

  const updateSellingPrice = (itemId: string, sellingPrice: number) => {
    setPricingData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (!current) return prev;

      const totalCost = current.total_cost;
      const profit = sellingPrice - totalCost;
      const markup = totalCost > 0 ? (profit / totalCost) * 100 : 0;

      newMap.set(itemId, {
        ...current,
        selling_price: sellingPrice,
        markup_percentage: parseFloat(markup.toFixed(2)),
        profit_per_unit: parseFloat(profit.toFixed(2))
      });
      
      // Trigger animation
      setAnimateStats(true);
      setTimeout(() => setAnimateStats(false), 600);
      
      return newMap;
    });
  };

  const updateMarkupPercentage = (itemId: string, markupPercentage: number) => {
    setPricingData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (!current) return prev;

      const totalCost = current.total_cost;
      const sellingPrice = totalCost * (1 + markupPercentage / 100);
      const profit = sellingPrice - totalCost;

      newMap.set(itemId, {
        ...current,
        selling_price: parseFloat(sellingPrice.toFixed(2)),
        markup_percentage: markupPercentage,
        profit_per_unit: parseFloat(profit.toFixed(2))
      });
      
      // Trigger animation
      setAnimateStats(true);
      setTimeout(() => setAnimateStats(false), 600);
      
      return newMap;
    });
  };

  const applyMarkupToAll = (markup: number) => {
    setPricingData(prev => {
      const newMap = new Map(prev);
      newMap.forEach((data, itemId) => {
        const totalCost = data.total_cost;
        const sellingPrice = totalCost * (1 + markup / 100);
        const profit = sellingPrice - totalCost;

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

  // Additional cost management functions
  const addAdditionalCost = (itemId: string) => {
    setPricingData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (!current) return prev;

      const newCost: AdditionalCost = {
        id: `cost-${Date.now()}-${Math.random()}`,
        category: 'Shipping Cost',
        amount: 0,
        description: ''
      };

      const updatedCosts = [...current.additional_costs, newCost];

      // Update all items with the new cost
      newMap.set(itemId, {
        ...current,
        additional_costs: updatedCosts
      });
      
      // Recalculate costs for all items with distributed additional costs
      return recalculateAllCosts(newMap);
    });
  };

  const removeAdditionalCost = (itemId: string, costId: string) => {
    setPricingData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (!current) return prev;

      const updatedCosts = current.additional_costs.filter(cost => cost.id !== costId);

      // Update all items with removed cost
      newMap.set(itemId, {
        ...current,
        additional_costs: updatedCosts
      });
      
      // Recalculate costs for all items with distributed additional costs
      return recalculateAllCosts(newMap);
    });
  };

  const updateAdditionalCost = (itemId: string, costId: string, field: keyof AdditionalCost, value: string | number) => {
    setPricingData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (!current) return prev;

      const updatedCosts = current.additional_costs.map(cost => 
        cost.id === costId ? { ...cost, [field]: value } : cost
      );

      // Update all items with modified cost
      newMap.set(itemId, {
        ...current,
        additional_costs: updatedCosts
      });
      
      // Trigger animation
      if (field === 'amount') {
        setAnimateStats(true);
        setTimeout(() => setAnimateStats(false), 600);
      }
      
      // Recalculate costs for all items with distributed additional costs
      return recalculateAllCosts(newMap);
    });
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
      // Get additional costs from the first item (they are shared across all items)
      const firstItem = purchaseOrder.items[0];
      const firstPricing = firstItem ? pricingData.get(firstItem.id) : null;
      const additionalCosts = firstPricing?.additional_costs || [];

      // Create expense records for additional costs (one record per cost type for entire order)
      if (additionalCosts.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        for (const cost of additionalCosts) {
          if (cost.amount > 0) {
            // The cost.amount is the total for the entire order, not per unit
            try {
              await supabase
                .from('expenses')
                .insert({
                  category: cost.category,
                  amount: cost.amount, // Total cost for entire order
                  description: `${cost.description || cost.category} for entire order - PO ${purchaseOrder.id}`,
                  date: new Date().toISOString().split('T')[0],
                  created_by: userId,
                  purchase_order_id: purchaseOrder.id,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
            } catch (error) {
              // Silently handle errors
            }
          }
        }

        toast.success(`Recorded ${additionalCosts.length} expense entries`);
      }

      await onConfirm(pricingData);
      toast.success(`Prices updated for ${productsWithPrices.length} products`);
      onClose();
    } catch (error) {
      toast.error('Failed to save pricing');
    }
  };

  const getTotalStats = () => {
    let totalBaseCost = 0;
    let totalAdditionalCosts = 0;
    let totalCost = 0;
    let totalSelling = 0;
    let totalProfit = 0;
    let itemCount = 0;
    let completedCount = 0;
    let pendingCount = 0;

    // Calculate total additional costs (only count once from first item)
    const firstItem = purchaseOrder.items[0];
    if (firstItem) {
      const firstPricing = pricingData.get(firstItem.id);
      if (firstPricing) {
        totalAdditionalCosts = firstPricing.additional_costs.reduce((sum, cost) => sum + cost.amount, 0);
      }
    }

    purchaseOrder.items.forEach(item => {
      const pricing = pricingData.get(item.id);
      if (pricing) {
        if (pricing.selling_price > 0) {
          completedCount++;
          const quantityToReceive = item.quantity - (item.receivedQuantity || 0);
          itemCount++;
          totalBaseCost += pricing.cost_price * quantityToReceive;
          totalCost += pricing.total_cost * quantityToReceive;
          totalSelling += pricing.selling_price * quantityToReceive;
          totalProfit += pricing.profit_per_unit * quantityToReceive;
        } else {
          pendingCount++;
        }
      }
    });

    return {
      totalBaseCost: totalBaseCost.toFixed(2),
      totalAdditionalCosts: totalAdditionalCosts.toFixed(2),
      totalCost: totalCost.toFixed(2),
      totalSelling: totalSelling.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      averageMarkup: totalCost > 0 ? (((totalSelling - totalCost) / totalCost) * 100).toFixed(2) : '0',
      itemCount,
      completedCount,
      pendingCount
    };
  };

  if (!isOpen) return null;

  const stats = getTotalStats();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" role="dialog" aria-modal="true" aria-labelledby="pricing-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            
            {/* Text and Progress */}
            <div>
              <h3 id="pricing-modal-title" className="text-2xl font-bold text-gray-900 mb-3">Set Product Prices</h3>
              
              {/* Progress Indicator */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-bold text-green-700">{stats.completedCount} Done</span>
                </div>
                {stats.pendingCount > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg animate-pulse">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-bold text-orange-700">{stats.pendingCount} Pending</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Summary Section */}
        <div className="p-6 pb-0 flex-shrink-0">

          {/* Additional Costs for Entire PO */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                {purchaseOrder.items.length > 0 && pricingData.get(purchaseOrder.items[0].id)?.additional_costs.length === 0 && (
                  <p className="text-sm text-gray-600">No additional costs</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  // Add additional cost to all items
                  purchaseOrder.items.forEach(item => {
                    addAdditionalCost(item.id);
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-xl transition-colors font-semibold shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Add Cost
              </button>
            </div>

            {/* Show cost fields if any costs exist */}
            {purchaseOrder.items.length > 0 && pricingData.get(purchaseOrder.items[0].id)?.additional_costs.length > 0 && (
              <div className="space-y-3">
                {pricingData.get(purchaseOrder.items[0].id)?.additional_costs.map((cost, idx) => {
                  const totalUnits = purchaseOrder.items.reduce((sum, item) => sum + (item.quantity - (item.receivedQuantity || 0)), 0);
                  const perUnitCost = totalUnits > 0 ? cost.amount / totalUnits : 0;
                  
                  return (
                    <div key={cost.id} className="flex items-center gap-3">
                      <select
                        value={cost.category}
                        onChange={(e) => {
                          // Update this cost for all items
                          purchaseOrder.items.forEach(item => {
                            const itemCosts = pricingData.get(item.id)?.additional_costs || [];
                            if (itemCosts[idx]) {
                              updateAdditionalCost(item.id, itemCosts[idx].id, 'category', e.target.value);
                            }
                          });
                        }}
                        className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-medium"
                      >
                        {COST_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={formatPrice(cost.amount)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, '');
                          const amount = parseFloat(value) || 0;
                          // Update this cost for all items
                          purchaseOrder.items.forEach(item => {
                            const itemCosts = pricingData.get(item.id)?.additional_costs || [];
                            if (itemCosts[idx]) {
                              updateAdditionalCost(item.id, itemCosts[idx].id, 'amount', amount);
                            }
                          });
                        }}
                        placeholder="Amount"
                        className="w-40 px-3 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-bold text-lg"
                      />
                      <span className="text-xs text-gray-500 w-32">
                        ≈ {formatPrice(perUnitCost)} / unit
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          // Remove this cost from all items
                          purchaseOrder.items.forEach(item => {
                            const itemCosts = pricingData.get(item.id)?.additional_costs || [];
                            if (itemCosts[idx]) {
                              removeAdditionalCost(item.id, itemCosts[idx].id);
                            }
                          });
                        }}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Products List Section */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
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
            <div className="space-y-4 py-4">
              {purchaseOrder.items.map((item) => {
                const pricing = pricingData.get(item.id);
                if (!pricing) return null;

                const quantityToReceive = item.quantity - (item.receivedQuantity || 0);
                const totalItemProfit = pricing.profit_per_unit * quantityToReceive;
                const isProfitable = pricing.profit_per_unit > 0;
                const isExpanded = expandedItemId === item.id;
                const isPricingComplete = pricing.selling_price > 0;

                return (
                  <div key={item.id} className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
                    isExpanded 
                      ? 'border-blue-500 shadow-xl' 
                      : isPricingComplete
                        ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                        : 'border-orange-300 hover:border-orange-400 hover:shadow-md'
                  }`}>
                    {/* Item Header - Clickable */}
                    <div 
                      className="flex items-start justify-between p-6 cursor-pointer"
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                            isExpanded ? 'bg-blue-500' : 'bg-gray-200'
                          }`}>
                            <svg 
                              className={`w-4 h-4 text-white transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-lg font-bold text-gray-900">
                                {item.product?.name || item.name || 'Unknown Product'}
                              </h4>
                              {/* Status Badge */}
                              {isPricingComplete ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Done
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm animate-pulse">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Pending
                                </span>
                              )}
                            </div>
                            {item.variant?.name && (
                              <p className="text-sm text-gray-600 mt-1">Variant: {item.variant.name}</p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">Quantity: {quantityToReceive} units</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {/* Profit Badge */}
                        {isPricingComplete && (
                          <div className={`px-4 py-2 rounded-xl text-base font-bold shadow-sm ${
                            isProfitable ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                            {isProfitable ? `+${formatPrice(pricing.profit_per_unit)} TZS per unit` : 'Loss'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content - Only show when item is expanded */}
                    {isExpanded && (
                      <div className="px-6 pb-6">
                        {/* Cost Summary Row */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="text-xs text-gray-500 mb-2">Base Cost</p>
                                <p className="text-lg font-bold text-gray-900">
                                  {formatPrice(pricing.cost_price * quantityToReceive)} <span className="text-sm text-gray-500">TZS</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatPrice(pricing.cost_price)} TZS per unit
                                </p>
                                {purchaseOrder.currency && purchaseOrder.currency !== 'TZS' && purchaseOrder.exchangeRate && (
                                  <p className="text-xs text-blue-600 mt-1 font-medium">
                                    💱 {formatPrice(item.costPrice)} {purchaseOrder.currency} × {purchaseOrder.exchangeRate}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500 mb-2">Total Cost</p>
                                <p className="text-xl font-bold text-gray-900">
                                  {formatPrice(pricing.total_cost * quantityToReceive)} <span className="text-sm text-gray-500">TZS</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatPrice(pricing.total_cost)} TZS per unit
                                </p>
                              </div>
                            </div>
                            {pricing.total_cost > pricing.cost_price && (
                              <div className="pt-3 border-t border-gray-200">
                                <p className="text-xs text-orange-600">
                                  +{formatPrice((pricing.total_cost - pricing.cost_price) * quantityToReceive)} additional costs for all units
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                            <p className="text-xs text-blue-700 mb-2 font-medium">Total Selling</p>
                            <p className="text-3xl font-bold text-blue-600">
                              {formatPrice(pricing.selling_price * quantityToReceive)} <span className="text-lg text-blue-500">TZS</span>
                            </p>
                            <p className="text-xs text-blue-500 mt-1">
                              {formatPrice(pricing.selling_price)} TZS per unit
                            </p>
                          </div>
                        </div>

                        {/* Editable Fields Row */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* Selling Price */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Selling Price *
                            </label>
                            <input
                              type="text"
                              value={formatPrice(pricing.selling_price)}
                              onChange={(e) => {
                                const value = e.target.value.replace(/,/g, '');
                                const numValue = parseFloat(value) || 0;
                                updateSellingPrice(item.id, numValue);
                              }}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-xl font-bold bg-white"
                            />
                          </div>

                          {/* Markup % */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Markup %
                            </label>
                            <input
                              type="text"
                              value={pricing.markup_percentage % 1 === 0 ? pricing.markup_percentage : pricing.markup_percentage.toFixed(2)}
                              onChange={(e) => {
                                const value = e.target.value.replace(/,/g, '');
                                const numValue = parseFloat(value) || 0;
                                updateMarkupPercentage(item.id, numValue);
                              }}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900 text-xl font-bold bg-white"
                            />
                          </div>
                        </div>

                        {/* Quick Profit Add Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">Quick Add Profit:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const totalCost = pricing.total_cost;
                              const sellingPrice = totalCost + 10000;
                              updateSellingPrice(item.id, sellingPrice);
                            }}
                            className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-lg transition-all font-semibold shadow-sm"
                          >
                            +10K
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const totalCost = pricing.total_cost;
                              const sellingPrice = totalCost + 50000;
                              updateSellingPrice(item.id, sellingPrice);
                            }}
                            className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-lg transition-all font-semibold shadow-sm"
                          >
                            +50K
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const totalCost = pricing.total_cost;
                              const sellingPrice = totalCost + 100000;
                              updateSellingPrice(item.id, sellingPrice);
                            }}
                            className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-lg transition-all font-semibold shadow-sm"
                          >
                            +100K
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const totalCost = pricing.total_cost;
                              const sellingPrice = totalCost + 200000;
                              updateSellingPrice(item.id, sellingPrice);
                            }}
                            className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-lg transition-all font-semibold shadow-sm"
                          >
                            +200K
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const totalCost = pricing.total_cost;
                              const sellingPrice = totalCost + 500000;
                              updateSellingPrice(item.id, sellingPrice);
                            }}
                            className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-lg transition-all font-semibold shadow-sm"
                          >
                            +500K
                          </button>
                          
                          {/* Custom Profit Input - Inline */}
                          <div className="flex items-center gap-1 ml-2">
                            <input
                              type="text"
                              value={customProfit}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                setCustomProfit(value);
                              }}
                              placeholder="Custom"
                              className="w-24 px-2 py-2 text-sm border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-900 font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const profitAmount = parseFloat(customProfit) || 0;
                                if (profitAmount > 0) {
                                  const totalCost = pricing.total_cost;
                                  const sellingPrice = totalCost + profitAmount;
                                  updateSellingPrice(item.id, sellingPrice);
                                  setCustomProfit('');
                                  toast.success(`Added ${formatPrice(profitAmount)} TZS profit`);
                                }
                              }}
                              disabled={!customProfit || parseFloat(customProfit) <= 0}
                              className="px-3 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-all font-semibold shadow-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          {stats.pendingCount > 0 && (
            <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-semibold text-orange-700">
                {stats.pendingCount} product{stats.pendingCount > 1 ? 's' : ''} still need{stats.pendingCount === 1 ? 's' : ''} pricing. Please set prices for all items before confirming.
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || isLoadingProducts || stats.pendingCount > 0}
            className="w-full px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : stats.pendingCount > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Complete All Pricing First
              </span>
            ) : (
              'Confirm & Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetPricingModal;
