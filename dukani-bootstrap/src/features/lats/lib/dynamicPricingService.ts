/**
 * Enhanced Dynamic Pricing Service
 * 
 * This service connects the database settings to actual pricing calculations.
 * It loads settings from the database and converts them to pricing rules.
 */

import { DynamicPricingSettings } from '../../../lib/posSettingsApi';
import { POSSettingsService } from '../../../lib/posSettingsApi';
import { Customer } from '../../../types/customer';

export interface PricingRule {
  id: string;
  name: string;
  type: 'loyalty' | 'bulk' | 'time' | 'category' | 'custom';
  conditions: PricingCondition[];
  discount: DiscountConfig;
  priority: number;
  isActive: boolean;
}

export interface PricingCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between';
  value: any;
}

export interface DiscountConfig {
  type: 'percentage' | 'fixed' | 'tiered';
  value: number;
  maxDiscount?: number;
  minPurchase?: number;
}

export interface PricingContext {
  customer?: Customer;
  quantity: number;
  totalAmount: number;
  category?: string;
  brand?: string;
  timeOfDay?: number;
  dayOfWeek?: number;
  isHoliday?: boolean;
}

export interface AppliedDiscount {
  ruleId: string;
  ruleName: string;
  discountAmount: number;
  discountType: 'percentage' | 'fixed' | 'tiered';
  originalValue: number;
}

export interface PricingPreview {
  basePrice: number;
  finalPrice: number;
  totalDiscount: number;
  discountPercentage: number;
  appliedDiscounts: AppliedDiscount[];
  loyaltyPoints: number;
  savings: number;
}

export class DynamicPricingService {
  private static instance: DynamicPricingService;
  private pricingRules: PricingRule[] = [];
  private settings: DynamicPricingSettings | null = null;
  private holidayDates: Set<string> = new Set();

  static getInstance(): DynamicPricingService {
    if (!DynamicPricingService.instance) {
      DynamicPricingService.instance = new DynamicPricingService();
    }
    return DynamicPricingService.instance;
  }

  constructor() {
    this.loadHolidayDates();
  }

  // Load settings from database and convert to pricing rules
  async loadSettings(): Promise<void> {
    try {
      this.settings = await POSSettingsService.loadDynamicPricingSettings();
      if (this.settings) {
        this.pricingRules = this.convertSettingsToRules(this.settings);
        console.log('🔧 Dynamic Pricing: Loaded', this.pricingRules.length, 'pricing rules from database');
      }
    } catch (error) {
      console.error('❌ Dynamic Pricing: Failed to load settings:', error);
      this.pricingRules = [];
    }
  }

  // Convert database settings to pricing rules
  private convertSettingsToRules(settings: DynamicPricingSettings): PricingRule[] {
    const rules: PricingRule[] = [];

    // Only create rules if dynamic pricing is enabled
    if (!settings.enable_dynamic_pricing) {
      console.log('🔧 Dynamic Pricing: Disabled in settings, no rules created');
      return rules;
    }

    // Happy Hour (Time-based) Rule
    if (settings.enable_time_based_pricing) {
      rules.push({
        id: 'happy_hour',
        name: 'Happy Hour Discount',
        type: 'time',
        conditions: [
          {
            field: 'timeOfDay',
            operator: 'between',
            value: {
              start: this.parseTime(settings.time_based_start_time || '18:00'),
              end: this.parseTime(settings.time_based_end_time || '21:00')
            }
          }
        ],
        discount: {
          type: 'percentage',
          value: settings.time_based_discount_percent || 15
        },
        priority: 1,
        isActive: true
      });
    }

    // Bulk Purchase Rule
    if (settings.enable_bulk_pricing) {
      rules.push({
        id: 'bulk_discount',
        name: 'Bulk Purchase Discount',
        type: 'bulk',
        conditions: [
          {
            field: 'quantity',
            operator: 'greater_than',
            value: settings.bulk_discount_threshold || 10
          }
        ],
        discount: {
          type: 'percentage',
          value: settings.bulk_discount_percent || 10
        },
        priority: 2,
        isActive: true
      });
    }

    // VIP Customer Rule
    if (settings.enable_loyalty_pricing) {
      rules.push({
        id: 'vip_discount',
        name: 'VIP Customer Discount',
        type: 'loyalty',
        conditions: [
          {
            field: 'customer',
            operator: 'equals',
            value: 'vip' // This would need to be determined from customer data
          }
        ],
        discount: {
          type: 'percentage',
          value: settings.loyalty_discount_percent || 5
        },
        priority: 3,
        isActive: true
      });
    }

    return rules;
  }

  // Parse time string (HH:MM) to hour number
  private parseTime(timeStr: string): number {
    const [hours] = timeStr.split(':').map(Number);
    return hours;
  }

  // Load holiday dates
  private loadHolidayDates(): void {
    const currentYear = new Date().getFullYear();
    const holidays = [
      `${currentYear}-01-01`, // New Year
      `${currentYear}-12-25`, // Christmas
      `${currentYear}-12-26`, // Boxing Day
    ];
    
    holidays.forEach(date => this.holidayDates.add(date));
  }

  // Check if current date is a holiday
  private isHoliday(): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.holidayDates.has(today);
  }

  // Calculate dynamic price for a product
  calculatePrice(
    basePrice: number, 
    context: PricingContext
  ): { finalPrice: number; appliedDiscounts: AppliedDiscount[] } {
    // Safety check for basePrice
    if (basePrice === undefined || basePrice === null || isNaN(basePrice)) {
      console.warn('🔧 Dynamic Pricing: Invalid basePrice provided:', basePrice, 'returning 0');
      return {
        finalPrice: 0,
        appliedDiscounts: []
      };
    }

    // If no settings loaded or dynamic pricing disabled, return original price
    if (!this.settings?.enable_dynamic_pricing) {
      return {
        finalPrice: basePrice,
        appliedDiscounts: []
      };
    }

    console.log('🔧 Dynamic Pricing: Calculating price for basePrice:', basePrice, 'context:', context);
    
    const appliedDiscounts: AppliedDiscount[] = [];
    let finalPrice = basePrice;
    let totalDiscount = 0;

    // Sort rules by priority (highest first)
    const applicableRules = this.pricingRules
      .filter(rule => rule.isActive)
      .sort((a, b) => a.priority - b.priority);

    console.log('🔧 Dynamic Pricing: Found', applicableRules.length, 'active rules');

    for (const rule of applicableRules) {
      if (this.evaluateRule(rule, context)) {
        console.log('🔧 Dynamic Pricing: Rule applies:', rule.name);
        const discount = this.calculateDiscount(rule, basePrice, context);
        
        if (discount > 0) {
          appliedDiscounts.push({
            ruleId: rule.id,
            ruleName: rule.name,
            discountAmount: discount,
            discountType: rule.discount.type,
            originalValue: rule.discount.value
          });

          totalDiscount += discount;
          console.log('🔧 Dynamic Pricing: Applied discount:', discount, 'from rule:', rule.name);
        }
      }
    }

    finalPrice = Math.max(0, basePrice - totalDiscount);
    
    console.log('🔧 Dynamic Pricing: Final result - basePrice:', basePrice, 'totalDiscount:', totalDiscount, 'finalPrice:', finalPrice);
    
    return {
      finalPrice: Math.round(finalPrice),
      appliedDiscounts
    };
  }

  // Evaluate if a pricing rule applies
  private evaluateRule(rule: PricingRule, context: PricingContext): boolean {
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  // Evaluate a single condition
  private evaluateCondition(condition: PricingCondition, context: PricingContext): boolean {
    const { field, operator, value } = condition;
    
    switch (field) {
      case 'timeOfDay':
        if (operator === 'between' && value.start !== undefined && value.end !== undefined) {
          const currentHour = context.timeOfDay || new Date().getHours();
          return currentHour >= value.start && currentHour <= value.end;
        }
        break;
        
      case 'quantity':
        if (operator === 'greater_than') {
          return context.quantity > value;
        }
        break;
        
      case 'customer':
        if (operator === 'equals') {
          // This would need to be determined from customer data
          // For now, assume all customers are VIP if they exist
          return context.customer !== undefined;
        }
        break;
        
      case 'totalAmount':
        if (operator === 'greater_than') {
          return context.totalAmount > value;
        }
        break;
    }
    
    return false;
  }

  // Calculate discount amount for a rule
  private calculateDiscount(rule: PricingRule, basePrice: number, context: PricingContext): number {
    const { discount } = rule;
    
    switch (discount.type) {
      case 'percentage':
        const percentageDiscount = (basePrice * discount.value) / 100;
        return Math.min(percentageDiscount, discount.maxDiscount || percentageDiscount);
        
      case 'fixed':
        return Math.min(discount.value, basePrice);
        
      case 'tiered':
        // Implement tiered pricing if needed
        return 0;
        
      default:
        return 0;
    }
  }

  // Calculate loyalty points
  calculateLoyaltyPoints(amount: number, customer?: Customer): number {
    if (!this.settings?.enable_loyalty_pricing || !customer) {
      return 0;
    }

    const basePoints = Math.floor(amount / 100); // 1 point per 100 currency units
    return basePoints;
  }

  // Get pricing preview for a customer
  getPricingPreview(
    basePrice: number, 
    quantity: number, 
    customer?: Customer
  ): PricingPreview {
    const context: PricingContext = {
      customer,
      quantity,
      totalAmount: basePrice * quantity,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isHoliday: this.isHoliday()
    };

    const { finalPrice, appliedDiscounts } = this.calculatePrice(basePrice, context);
    const totalDiscount = basePrice - finalPrice;
    const discountPercentage = basePrice > 0 ? (totalDiscount / basePrice) * 100 : 0;
    const loyaltyPoints = this.calculateLoyaltyPoints(finalPrice * quantity, customer);

    return {
      basePrice,
      finalPrice,
      totalDiscount,
      discountPercentage,
      appliedDiscounts,
      loyaltyPoints,
      savings: totalDiscount * quantity
    };
  }

  // Get all pricing rules (for debugging)
  getPricingRules(): PricingRule[] {
    return this.pricingRules;
  }

  // Check if dynamic pricing is enabled
  isEnabled(): boolean {
    return this.settings?.enable_dynamic_pricing || false;
  }

  // Refresh settings from database
  async refreshSettings(): Promise<void> {
    await this.loadSettings();
  }
}

// Export singleton instance
export const dynamicPricingService = DynamicPricingService.getInstance();
