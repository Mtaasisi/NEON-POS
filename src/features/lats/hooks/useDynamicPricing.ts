/**
 * Hook for integrating dynamic pricing with POS components
 * 
 * This hook provides easy access to dynamic pricing calculations
 * and automatically loads settings when needed.
 */

import { useState, useEffect, useCallback } from 'react';
import { dynamicPricingService, PricingContext, AppliedDiscount } from '../lib/dynamicPricingService';
import { Customer } from '../../../types/customer';

export interface DynamicPricingResult {
  finalPrice: number;
  appliedDiscounts: AppliedDiscount[];
  hasDiscounts: boolean;
  totalDiscount: number;
  discountPercentage: number;
}

export interface UseDynamicPricingOptions {
  autoLoad?: boolean;
  refreshInterval?: number;
}

export const useDynamicPricing = (options: UseDynamicPricingOptions = {}) => {
  const { autoLoad = true, refreshInterval } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    if (autoLoad) {
      loadSettings();
    }
  }, [autoLoad]);

  // Set up refresh interval if specified
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        loadSettings();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await dynamicPricingService.loadSettings();
      setIsEnabled(dynamicPricingService.isEnabled());
    } catch (err) {
      console.error('Failed to load dynamic pricing settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculatePrice = useCallback((
    basePrice: number,
    context: PricingContext
  ): DynamicPricingResult => {
    if (!isEnabled) {
      return {
        finalPrice: basePrice,
        appliedDiscounts: [],
        hasDiscounts: false,
        totalDiscount: 0,
        discountPercentage: 0
      };
    }

    const { finalPrice, appliedDiscounts } = dynamicPricingService.calculatePrice(basePrice, context);
    const totalDiscount = basePrice - finalPrice;
    const discountPercentage = basePrice > 0 ? (totalDiscount / basePrice) * 100 : 0;

    return {
      finalPrice,
      appliedDiscounts,
      hasDiscounts: appliedDiscounts.length > 0,
      totalDiscount,
      discountPercentage
    };
  }, [isEnabled]);

  const calculateItemPrice = useCallback((
    basePrice: number,
    quantity: number,
    customer?: Customer
  ): DynamicPricingResult => {
    const context: PricingContext = {
      customer,
      quantity,
      totalAmount: basePrice * quantity,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isHoliday: false // Could be enhanced to check actual holidays
    };

    return calculatePrice(basePrice, context);
  }, [calculatePrice]);

  const calculateCartTotal = useCallback((
    items: Array<{ price: number; quantity: number }>,
    customer?: Customer
  ): {
    subtotal: number;
    totalDiscount: number;
    finalTotal: number;
    allDiscounts: AppliedDiscount[];
  } => {
    let subtotal = 0;
    let totalDiscount = 0;
    const allDiscounts: AppliedDiscount[] = [];

    items.forEach(item => {
      const { finalPrice, appliedDiscounts } = calculateItemPrice(
        item.price,
        item.quantity,
        customer
      );
      
      subtotal += item.price * item.quantity;
      totalDiscount += (item.price * item.quantity) - (finalPrice * item.quantity);
      allDiscounts.push(...appliedDiscounts);
    });

    return {
      subtotal,
      totalDiscount,
      finalTotal: subtotal - totalDiscount,
      allDiscounts
    };
  }, [calculateItemPrice]);

  const getPricingPreview = useCallback((
    basePrice: number,
    quantity: number,
    customer?: Customer
  ) => {
    return dynamicPricingService.getPricingPreview(basePrice, quantity, customer);
  }, []);

  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  return {
    // State
    isLoading,
    isEnabled,
    error,
    
    // Actions
    loadSettings,
    refreshSettings,
    
    // Calculations
    calculatePrice,
    calculateItemPrice,
    calculateCartTotal,
    getPricingPreview,
    
    // Utility
    isDynamicPricingEnabled: () => isEnabled
  };
};

/**
 * Hook for cart-specific dynamic pricing
 * Provides optimized calculations for cart operations
 */
export const useCartDynamicPricing = (customer?: Customer) => {
  const { calculateItemPrice, calculateCartTotal, isEnabled } = useDynamicPricing();

  const addItemToCart = useCallback((
    items: Array<{ id: string; price: number; quantity: number; name: string }>,
    newItem: { id: string; price: number; quantity: number; name: string }
  ) => {
    const updatedItems = [...items, newItem];
    return calculateCartTotal(updatedItems, customer);
  }, [calculateCartTotal, customer]);

  const updateItemQuantity = useCallback((
    items: Array<{ id: string; price: number; quantity: number; name: string }>,
    itemId: string,
    newQuantity: number
  ) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    return calculateCartTotal(updatedItems, customer);
  }, [calculateCartTotal, customer]);

  const removeItemFromCart = useCallback((
    items: Array<{ id: string; price: number; quantity: number; name: string }>,
    itemId: string
  ) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    return calculateCartTotal(updatedItems, customer);
  }, [calculateCartTotal, customer]);

  return {
    isEnabled,
    addItemToCart,
    updateItemQuantity,
    removeItemFromCart,
    calculateCartTotal: (items: Array<{ price: number; quantity: number }>) => 
      calculateCartTotal(items, customer)
  };
};

/**
 * Hook for product-specific dynamic pricing
 * Shows pricing preview for individual products
 */
export const useProductDynamicPricing = (customer?: Customer) => {
  const { calculateItemPrice, getPricingPreview, isEnabled } = useDynamicPricing();

  const getProductPrice = useCallback((
    basePrice: number,
    quantity: number = 1
  ) => {
    return calculateItemPrice(basePrice, quantity, customer);
  }, [calculateItemPrice, customer]);

  const getProductPreview = useCallback((
    basePrice: number,
    quantity: number = 1
  ) => {
    return getPricingPreview(basePrice, quantity, customer);
  }, [getPricingPreview, customer]);

  return {
    isEnabled,
    getProductPrice,
    getProductPreview
  };
};
