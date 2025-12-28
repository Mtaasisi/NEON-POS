import React, { useState, useEffect } from 'react';
import { DollarSign, X, AlertCircle, TrendingUp, Calculator, Package, Plus, Trash2, CheckCircle, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import type { TradeInTransaction } from '../../types/tradeIn';
import { useDialog } from '../../../shared/hooks/useDialog';

interface AdditionalCost {
  id: string;
  category: string;
  amount: number;
  description: string;
}

interface PricingData {
  cost_price: number; // Trade-in value we paid
  additional_costs: AdditionalCost[];
  total_cost: number; // cost_price + sum of additional_costs
  selling_price: number;
  markup_percentage: number;
  profit_per_unit: number;
}

interface TradeInPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TradeInTransaction;
  onConfirm: (pricingData: PricingData) => Promise<void>;
  isLoading?: boolean;
}

const COST_CATEGORIES = [
  'Repair Cost',
  'Cleaning Cost',
  'Testing Cost',
  'Refurbishment',
  'Packaging',
  'Storage',
  'Insurance',
  'Other'
];

const TradeInPricingModal: React.FC<TradeInPricingModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onConfirm,
  isLoading = false
}) => {
  const { confirm: confirmDialog } = useDialog();
  const [pricingData, setPricingData] = useState<PricingData>({
    cost_price: transaction.final_trade_in_value || 0,
    additional_costs: [],
    total_cost: transaction.final_trade_in_value || 0,
    selling_price: 0,
    markup_percentage: 30,
    profit_per_unit: 0
  });
  const [animateStats, setAnimateStats] = useState(false);

  // Helper function to format numbers with comma separators
  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    // Remove .00 for whole numbers
    if (num % 1 === 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Initialize pricing on mount
  useEffect(() => {
    if (isOpen && transaction) {
      const costPrice = transaction.final_trade_in_value || 0;
      const defaultMarkup = 30; // 30% default markup
      const defaultSellingPrice = costPrice * (1 + defaultMarkup / 100);
      const profit = defaultSellingPrice - costPrice;

      setPricingData({
        cost_price: costPrice,
        additional_costs: [],
        total_cost: costPrice,
        selling_price: parseFloat(defaultSellingPrice.toFixed(2)),
        markup_percentage: defaultMarkup,
        profit_per_unit: parseFloat(profit.toFixed(2))
      });
    }
  }, [isOpen, transaction]);

  const updateSellingPrice = (sellingPrice: number) => {
    const totalCost = pricingData.total_cost;
    const profit = sellingPrice - totalCost;
    const markup = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    setPricingData({
      ...pricingData,
      selling_price: sellingPrice,
      markup_percentage: parseFloat(markup.toFixed(2)),
      profit_per_unit: parseFloat(profit.toFixed(2))
    });

    // Trigger animation
    setAnimateStats(true);
    setTimeout(() => setAnimateStats(false), 600);
  };

  const updateMarkupPercentage = (markupPercentage: number) => {
    const totalCost = pricingData.total_cost;
    const sellingPrice = totalCost * (1 + markupPercentage / 100);
    const profit = sellingPrice - totalCost;

    setPricingData({
      ...pricingData,
      selling_price: parseFloat(sellingPrice.toFixed(2)),
      markup_percentage: markupPercentage,
      profit_per_unit: parseFloat(profit.toFixed(2))
    });

    // Trigger animation
    setAnimateStats(true);
    setTimeout(() => setAnimateStats(false), 600);
  };

  const addAdditionalCost = () => {
    const newCost: AdditionalCost = {
      id: `cost-${Date.now()}-${Math.random()}`,
      category: 'Repair Cost',
      amount: 0,
      description: ''
    };

    const updatedCosts = [...pricingData.additional_costs, newCost];
    const totalAdditionalCost = updatedCosts.reduce((sum, cost) => sum + cost.amount, 0);
    const totalCost = pricingData.cost_price + totalAdditionalCost;
    const profit = pricingData.selling_price - totalCost;
    const markup = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    setPricingData({
      ...pricingData,
      additional_costs: updatedCosts,
      total_cost: parseFloat(totalCost.toFixed(2)),
      markup_percentage: parseFloat(markup.toFixed(2)),
      profit_per_unit: parseFloat(profit.toFixed(2))
    });
  };

  const removeAdditionalCost = (costId: string) => {
    const updatedCosts = pricingData.additional_costs.filter(cost => cost.id !== costId);
    const totalAdditionalCost = updatedCosts.reduce((sum, cost) => sum + cost.amount, 0);
    const totalCost = pricingData.cost_price + totalAdditionalCost;
    const profit = pricingData.selling_price - totalCost;
    const markup = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    setPricingData({
      ...pricingData,
      additional_costs: updatedCosts,
      total_cost: parseFloat(totalCost.toFixed(2)),
      markup_percentage: parseFloat(markup.toFixed(2)),
      profit_per_unit: parseFloat(profit.toFixed(2))
    });
  };

  const updateAdditionalCost = (costId: string, field: keyof AdditionalCost, value: string | number) => {
    const updatedCosts = pricingData.additional_costs.map(cost => 
      cost.id === costId ? { ...cost, [field]: value } : cost
    );
    const totalAdditionalCost = updatedCosts.reduce((sum, cost) => sum + cost.amount, 0);
    const totalCost = pricingData.cost_price + totalAdditionalCost;
    const profit = pricingData.selling_price - totalCost;
    const markup = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    setPricingData({
      ...pricingData,
      additional_costs: updatedCosts,
      total_cost: parseFloat(totalCost.toFixed(2)),
      markup_percentage: parseFloat(markup.toFixed(2)),
      profit_per_unit: parseFloat(profit.toFixed(2))
    });

    // Trigger animation when amount changes
    if (field === 'amount') {
      setAnimateStats(true);
      setTimeout(() => setAnimateStats(false), 600);
    }
  };

  const handleConfirm = async () => {
    if (pricingData.selling_price <= 0) {
      toast.error('Please set a selling price greater than 0');
      return;
    }

    if (pricingData.selling_price < pricingData.total_cost) {
      const confirmed = await confirmDialog(
        `Warning: Selling price (${formatPrice(pricingData.selling_price)} TZS) is below total cost (${formatPrice(pricingData.total_cost)} TZS). Continue anyway?`
      );
      if (!confirmed) return;
    }

    try {
      // Save additional costs as expenses if any
      if (pricingData.additional_costs.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        const currentBranchId = getCurrentBranchId();

        for (const cost of pricingData.additional_costs) {
          if (cost.amount > 0) {
            try {
              const { error: expenseError } = await supabase
                .from('expenses')
                .insert({
                  category: cost.category,
                  amount: cost.amount,
                  description: `${cost.description || cost.category} for ${transaction.device_name} ${transaction.device_model} - Trade-In Transaction ${transaction.id}`,
                  date: new Date().toISOString().split('T')[0],
                  created_by: userId,
                  branch_id: currentBranchId, // Assign current branch for isolation
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              if (expenseError) {
                console.error('Error creating expense record:', expenseError);
              }
            } catch (error) {
              console.error('Error saving expense:', error);
            }
          }
        }

        if (pricingData.additional_costs.filter(c => c.amount > 0).length > 0) {
          toast.success(`Recorded ${pricingData.additional_costs.filter(c => c.amount > 0).length} expense entries`);
        }
      }

      await onConfirm(pricingData);
    } catch (error) {
      console.error('Error confirming pricing:', error);
      toast.error('Failed to save pricing');
    }
  };

  if (!isOpen) return null;

  const isProfitable = pricingData.profit_per_unit > 0;
  const needsRepair = transaction.needs_repair || false;
  const isPricingComplete = pricingData.selling_price > 0;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" role="dialog" aria-modal="true" aria-labelledby="trade-in-pricing-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white text-center border-b border-gray-200 flex-shrink-0">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <h3 id="trade-in-pricing-modal-title" className="text-2xl font-bold text-gray-900 mb-2">Set Resale Price - Trade-In Device</h3>
          <p className="text-sm text-gray-600">Configure pricing before adding to inventory</p>
          
          {/* Status Badge */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {isPricingComplete ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-bold text-green-700">Pricing Complete</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg animate-pulse">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-bold text-orange-700">Set Selling Price</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 overflow-y-auto px-6 pt-6">
          {/* Device Info */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-5 mb-6 border-2 border-orange-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-xl mb-1">{transaction.device_name}</h4>
                <p className="text-sm text-gray-700 font-medium mb-3">{transaction.device_model}</p>
                <div className="flex flex-wrap gap-2">
                  {transaction.device_imei && (
                    <span className="text-xs bg-white px-3 py-1.5 rounded-lg border-2 border-gray-300 font-semibold text-gray-700">
                      📱 IMEI: {transaction.device_imei}
                    </span>
                  )}
                  <span className={`text-xs px-3 py-1.5 rounded-lg border-2 font-bold ${
                    transaction.condition_rating === 'excellent' ? 'bg-green-100 border-green-300 text-green-700' :
                    transaction.condition_rating === 'good' ? 'bg-blue-100 border-blue-300 text-blue-700' :
                    transaction.condition_rating === 'fair' ? 'bg-yellow-100 border-yellow-300 text-yellow-700' :
                    'bg-gray-100 border-gray-300 text-gray-700'
                  }`}>
                    ⭐ Condition: {transaction.condition_rating?.toUpperCase()}
                  </span>
                  {needsRepair && (
                    <span className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg border-2 border-red-600 font-bold shadow-sm">
                      ⚠️ Needs Repair
                    </span>
                  )}
                </div>
                {transaction.condition_description && (
                  <p className="text-sm text-gray-600 mt-3 italic">{transaction.condition_description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Summary Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 mb-2">Trade-In Paid</p>
              <p className={`text-xl font-bold text-gray-900 transition-all duration-300 ${animateStats ? 'scale-110 text-blue-600' : ''}`}>
                {formatPrice(pricingData.cost_price)}
              </p>
              <p className="text-xs text-gray-500 mt-1">TZS</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 mb-2">Total Cost</p>
              <p className={`text-xl font-bold text-gray-900 transition-all duration-300 ${animateStats ? 'scale-110 text-blue-600' : ''}`}>
                {formatPrice(pricingData.total_cost)}
              </p>
              <p className="text-xs text-gray-500 mt-1">TZS</p>
            </div>
          </div>

          {/* Main Pricing Form */}
          <div className="border-2 border-blue-200 rounded-2xl p-6 mb-6 bg-blue-50/30 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-5 flex items-center gap-2 text-lg">
              <Calculator className="w-6 h-6 text-blue-600" />
              Pricing Configuration
            </h4>

            <div className="grid grid-cols-2 gap-4 mb-5">
              {/* Selling Price */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <label className="block text-xs font-medium text-blue-700 mb-2">
                  Selling Price *
                </label>
                <input
                  type="text"
                  value={formatPrice(pricingData.selling_price)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '');
                    const numValue = parseFloat(value) || 0;
                    updateSellingPrice(numValue);
                  }}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-xl font-bold bg-white"
                  placeholder="Enter selling price"
                />
              </div>

              {/* Markup % */}
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                <label className="block text-xs font-medium text-purple-700 mb-2">
                  Markup %
                </label>
                <input
                  type="text"
                  value={pricingData.markup_percentage % 1 === 0 ? pricingData.markup_percentage : pricingData.markup_percentage.toFixed(2)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '');
                    const numValue = parseFloat(value) || 0;
                    updateMarkupPercentage(numValue);
                  }}
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900 text-xl font-bold bg-white"
                />
              </div>
            </div>

            {/* Quick Profit Add Buttons */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-sm font-semibold text-gray-700">Quick Add Profit:</span>
              <button
                type="button"
                onClick={() => {
                  const totalCost = pricingData.total_cost;
                  const sellingPrice = totalCost + 10000;
                  updateSellingPrice(sellingPrice);
                }}
                className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-lg transition-all font-semibold shadow-sm"
              >
                +10K
              </button>
              <button
                type="button"
                onClick={() => {
                  const totalCost = pricingData.total_cost;
                  const sellingPrice = totalCost + 50000;
                  updateSellingPrice(sellingPrice);
                }}
                className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-lg transition-all font-semibold shadow-sm"
              >
                +50K
              </button>
              <button
                type="button"
                onClick={() => {
                  const totalCost = pricingData.total_cost;
                  const sellingPrice = totalCost + 100000;
                  updateSellingPrice(sellingPrice);
                }}
                className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-lg transition-all font-semibold shadow-sm"
              >
                +100K
              </button>
              <button
                type="button"
                onClick={() => {
                  const totalCost = pricingData.total_cost;
                  const sellingPrice = totalCost + 200000;
                  updateSellingPrice(sellingPrice);
                }}
                className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-lg transition-all font-semibold shadow-sm"
              >
                +200K
              </button>
              <button
                type="button"
                onClick={() => {
                  const totalCost = pricingData.total_cost;
                  const sellingPrice = totalCost + 500000;
                  updateSellingPrice(sellingPrice);
                }}
                className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-lg transition-all font-semibold shadow-sm"
              >
                +500K
              </button>
            </div>

            {/* Warning for unprofitable pricing */}
            {!isProfitable && pricingData.selling_price > 0 && (
              <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl shadow-sm">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700">⚠️ Warning: Loss on This Item</p>
                  <p className="text-sm text-red-600 mt-1">
                    Selling price is below total cost. You will lose {formatPrice(Math.abs(pricingData.profit_per_unit))} TZS on this device.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Costs Section */}
          <div className="border-2 border-orange-200 rounded-2xl p-5 mb-4 bg-orange-50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-gray-900">Additional Costs</h4>
              <button
                type="button"
                onClick={addAdditionalCost}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-xl transition-colors font-semibold shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Add Cost
              </button>
            </div>

            {pricingData.additional_costs.length > 0 ? (
              <div className="space-y-3">
                {pricingData.additional_costs.map((cost) => (
                  <div key={cost.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-orange-200 shadow-sm">
                    <select
                      value={cost.category}
                      onChange={(e) => updateAdditionalCost(cost.id, 'category', e.target.value)}
                      className="flex-1 px-3 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-medium"
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
                        updateAdditionalCost(cost.id, 'amount', amount);
                      }}
                      placeholder="Amount"
                      className="w-44 px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-bold text-lg"
                    />
                    <input
                      type="text"
                      value={cost.description}
                      onChange={(e) => updateAdditionalCost(cost.id, 'description', e.target.value)}
                      placeholder="Description (optional)"
                      className="flex-1 px-3 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalCost(cost.id)}
                      className="p-2.5 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                      title="Remove cost"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t-2 border-orange-300 flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-bold">Total Additional Costs:</span>
                  <span className="text-xl text-orange-700 font-bold">
                    {formatPrice(pricingData.additional_costs.reduce((sum, c) => sum + c.amount, 0))} TZS
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600 bg-white rounded-xl p-5 border-2 border-dashed border-orange-300 text-center">
                No additional costs. Click "Add Cost" for repair, cleaning, or refurbishment expenses.
              </div>
            )}
          </div>
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          {!isPricingComplete && (
            <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-orange-700">
                Please set a selling price before confirming.
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || pricingData.selling_price <= 0}
            className="w-full px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : pricingData.selling_price <= 0 ? (
              <span className="flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Set Selling Price to Continue
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Confirm & Add to Inventory
              </span>
            )}
          </button>
          <p className="text-xs text-center text-gray-500 mt-3">
            Device will be added to inventory with pricing information
          </p>
        </div>
      </div>
    </div>
  );
};

export default TradeInPricingModal;

