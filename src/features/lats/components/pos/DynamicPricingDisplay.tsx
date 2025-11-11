/**
 * Dynamic Pricing Display Component
 * 
 * Shows applied discounts and pricing information in the POS interface
 */

import React from 'react';
import { AppliedDiscount } from '../../lib/dynamicPricingService';
import { Clock, ShoppingCart, Star, Tag, Percent } from 'lucide-react';

interface DynamicPricingDisplayProps {
  appliedDiscounts: AppliedDiscount[];
  basePrice: number;
  finalPrice: number;
  showBreakdown?: boolean;
  className?: string;
}

const DynamicPricingDisplay: React.FC<DynamicPricingDisplayProps> = ({
  appliedDiscounts,
  basePrice,
  finalPrice,
  showBreakdown = true,
  className = ''
}) => {
  const totalDiscount = basePrice - finalPrice;
  const discountPercentage = basePrice > 0 ? (totalDiscount / basePrice) * 100 : 0;

  // Don't render if no discounts applied
  if (appliedDiscounts.length === 0) {
    return null;
  }

  const getDiscountIcon = (ruleName: string) => {
    if (ruleName.toLowerCase().includes('happy hour') || ruleName.toLowerCase().includes('time')) {
      return <Clock className="w-4 h-4 text-orange-500" />;
    }
    if (ruleName.toLowerCase().includes('bulk') || ruleName.toLowerCase().includes('quantity')) {
      return <ShoppingCart className="w-4 h-4 text-blue-500" />;
    }
    if (ruleName.toLowerCase().includes('vip') || ruleName.toLowerCase().includes('loyalty')) {
      return <Star className="w-4 h-4 text-purple-500" />;
    }
    return <Tag className="w-4 h-4 text-green-500" />;
  };

  const getDiscountColor = (ruleName: string) => {
    if (ruleName.toLowerCase().includes('happy hour') || ruleName.toLowerCase().includes('time')) {
      return 'bg-orange-50 border-orange-200 text-orange-800';
    }
    if (ruleName.toLowerCase().includes('bulk') || ruleName.toLowerCase().includes('quantity')) {
      return 'bg-blue-50 border-blue-200 text-blue-800';
    }
    if (ruleName.toLowerCase().includes('vip') || ruleName.toLowerCase().includes('loyalty')) {
      return 'bg-purple-50 border-purple-200 text-purple-800';
    }
    return 'bg-green-50 border-green-200 text-green-800';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main discount summary */}
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-800">
            Dynamic Pricing Applied
          </span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-green-900">
            {discountPercentage.toFixed(1)}% off
          </div>
          <div className="text-sm text-green-700">
            Save {totalDiscount.toLocaleString()} TZS
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Original Price:</span>
          <span className="line-through text-gray-500">{basePrice.toLocaleString()} TZS</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Discount:</span>
          <span className="text-red-600">-{totalDiscount.toLocaleString()} TZS</span>
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-1">
          <span>Final Price:</span>
          <span className="text-green-600">{finalPrice.toLocaleString()} TZS</span>
        </div>
      </div>

      {/* Individual discount breakdown */}
      {showBreakdown && appliedDiscounts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Applied Discounts:</h4>
          <div className="space-y-1">
            {appliedDiscounts.map((discount, index) => (
              <div
                key={`${discount.ruleId}-${index}`}
                className={`flex items-center justify-between p-2 rounded-md border ${getDiscountColor(discount.ruleName)}`}
              >
                <div className="flex items-center gap-2">
                  {getDiscountIcon(discount.ruleName)}
                  <span className="text-sm font-medium">
                    {discount.ruleName}
                  </span>
                </div>
                <div className="text-sm font-bold">
                  -{discount.discountAmount.toLocaleString()} TZS
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicPricingDisplay;