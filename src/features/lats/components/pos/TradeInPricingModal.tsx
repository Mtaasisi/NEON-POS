import React, { useState, useEffect } from 'react';
import { DollarSign, X, AlertCircle, TrendingUp, Calculator, Package, Plus, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabaseClient';
import type { TradeInTransaction } from '../../types/tradeIn';

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
  const [pricingData, setPricingData] = useState<PricingData>({
    cost_price: transaction.final_trade_in_value || 0,
    additional_costs: [],
    total_cost: transaction.final_trade_in_value || 0,
    selling_price: 0,
    markup_percentage: 30,
    profit_per_unit: 0
  });

  // Helper function to format numbers with comma separators
  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
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
  };

  const handleConfirm = async () => {
    if (pricingData.selling_price <= 0) {
      toast.error('Please set a selling price greater than 0');
      return;
    }

    if (pricingData.selling_price < pricingData.total_cost) {
      const confirm = window.confirm(
        `Warning: Selling price (${formatPrice(pricingData.selling_price)} TZS) is below total cost (${formatPrice(pricingData.total_cost)} TZS). Continue anyway?`
      );
      if (!confirm) return;
    }

    try {
      // Save additional costs as expenses if any
      if (pricingData.additional_costs.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Set Resale Price - Trade-In Device</h3>
                <p className="text-xs text-gray-500">Configure pricing before adding to inventory</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Device Info */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 mb-6 border-2 border-orange-200">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-lg">{transaction.device_name}</h4>
                <p className="text-sm text-gray-600">{transaction.device_model}</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {transaction.device_imei && (
                    <span className="text-xs bg-white px-2 py-1 rounded border border-gray-300">
                      IMEI: {transaction.device_imei}
                    </span>
                  )}
                  <span className="text-xs bg-white px-2 py-1 rounded border border-gray-300">
                    Condition: {transaction.condition_rating?.toUpperCase()}
                  </span>
                  {needsRepair && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded border border-red-300">
                      ⚠️ Needs Repair
                    </span>
                  )}
                </div>
                {transaction.condition_description && (
                  <p className="text-xs text-gray-600 mt-2">{transaction.condition_description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Summary Stats */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-6 border-2 border-green-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Trade-In Value Paid</p>
                <p className="text-xl font-bold text-gray-700">{formatPrice(pricingData.cost_price)}</p>
                <p className="text-xs text-gray-500">TZS</p>
              </div>
              <div>
                <p className="text-xs text-orange-600 mb-1">+ Additional Costs</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatPrice(pricingData.additional_costs.reduce((sum, cost) => sum + cost.amount, 0))}
                </p>
                <p className="text-xs text-gray-500">TZS</p>
              </div>
              <div className="border-l-2 border-green-300 pl-4">
                <p className="text-xs text-gray-600 mb-1">Total Cost</p>
                <p className="text-xl font-bold text-gray-900">{formatPrice(pricingData.total_cost)}</p>
                <p className="text-xs text-gray-500">TZS</p>
              </div>
              <div className="bg-white rounded-lg p-2 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Expected Profit</p>
                <p className={`text-xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPrice(pricingData.profit_per_unit)}
                </p>
                <p className="text-xs text-purple-600 font-semibold">{pricingData.markup_percentage.toFixed(1)}% markup</p>
              </div>
            </div>
          </div>

          {/* Main Pricing Form */}
          <div className="border-2 border-gray-200 rounded-lg p-6 mb-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-600" />
              Pricing Configuration
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Trade-In Value (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trade-In Value Paid
                </label>
                <input
                  type="text"
                  value={formatPrice(pricingData.cost_price)}
                  readOnly
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none text-gray-900 bg-gray-50 cursor-not-allowed"
                />
              </div>

              {/* Total Cost (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-orange-700 mb-2">
                  Total Cost (with extras)
                </label>
                <input
                  type="text"
                  value={formatPrice(pricingData.total_cost)}
                  readOnly
                  className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:outline-none text-gray-900 bg-orange-50 cursor-not-allowed font-bold"
                />
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">
                  Selling Price * (Required)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricingData.selling_price}
                  onChange={(e) => updateSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-900 font-semibold"
                  placeholder="Enter selling price"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Markup Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Markup Percentage
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="1000"
                    value={pricingData.markup_percentage}
                    onChange={(e) => updateMarkupPercentage(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => updateMarkupPercentage(30)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                  >
                    30%
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMarkupPercentage(50)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                  >
                    50%
                  </button>
                </div>
              </div>

              {/* Profit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Profit
                </label>
                <input
                  type="text"
                  value={formatPrice(pricingData.profit_per_unit)}
                  readOnly
                  className={`w-full px-4 py-3 border-2 rounded-lg text-gray-900 font-bold cursor-not-allowed ${
                    isProfitable 
                      ? 'border-green-300 bg-green-50 text-green-700' 
                      : 'border-red-300 bg-red-50 text-red-700'
                  }`}
                />
              </div>
            </div>

            {/* Warning for unprofitable pricing */}
            {!isProfitable && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Warning: Loss on This Item</p>
                  <p className="text-xs text-red-600">
                    Selling price is below total cost. You will lose {formatPrice(Math.abs(pricingData.profit_per_unit))} TZS on this device.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Costs Section */}
          <div className="border-2 border-orange-200 rounded-lg p-6 mb-6 bg-orange-50/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-orange-600" />
                <h5 className="font-semibold text-gray-900">Additional Costs</h5>
                <span className="text-xs text-gray-500">Repairs, cleaning, refurbishment, etc.</span>
              </div>
              <button
                type="button"
                onClick={addAdditionalCost}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Cost
              </button>
            </div>

            {pricingData.additional_costs.length > 0 ? (
              <div className="space-y-2">
                {pricingData.additional_costs.map((cost) => (
                  <div key={cost.id} className="flex items-center gap-2 bg-white rounded p-3 border border-orange-200">
                    <select
                      value={cost.category}
                      onChange={(e) => updateAdditionalCost(cost.id, 'category', e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-orange-500"
                    >
                      {COST_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cost.amount}
                      onChange={(e) => updateAdditionalCost(cost.id, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="Amount"
                      className="w-32 px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-orange-500 font-semibold"
                    />
                    <input
                      type="text"
                      value={cost.description}
                      onChange={(e) => updateAdditionalCost(cost.id, 'description', e.target.value)}
                      placeholder="Description (optional)"
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalCost(cost.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove cost"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t-2 border-orange-300 flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-medium">Total Additional Costs:</span>
                  <span className="text-lg text-orange-700 font-bold">
                    {formatPrice(pricingData.additional_costs.reduce((sum, c) => sum + c.amount, 0))} TZS
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-gray-500 bg-white rounded border-2 border-dashed border-gray-300">
                No additional costs added. Click "Add Cost" if there are any repair, cleaning, or refurbishment expenses.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
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
              disabled={isLoading || pricingData.selling_price <= 0}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirm & Add to Inventory
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">
            Device will be added to inventory with all pricing information
          </p>
        </div>
      </div>
    </div>
  );
};

export default TradeInPricingModal;

