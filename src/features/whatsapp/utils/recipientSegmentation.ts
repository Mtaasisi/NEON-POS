/**
 * Recipient Segmentation Utility
 * Filter recipients by customer data, purchase history, tags, etc.
 */

import { supabase } from '../../../lib/supabaseClient';

export interface SegmentFilter {
  // Purchase filters
  minTotalSpent?: number;
  maxTotalSpent?: number;
  minOrders?: number;
  maxOrders?: number;
  daysSinceLastOrder?: {
    min?: number;
    max?: number;
  };
  lastPurchaseAmount?: {
    min?: number;
    max?: number;
  };
  
  // Customer filters
  hasEmail?: boolean;
  hasAddress?: boolean;
  customerTags?: string[]; // Include customers with these tags
  excludeTags?: string[]; // Exclude customers with these tags
  
  // Date filters
  createdAfter?: string; // ISO date
  createdBefore?: string; // ISO date
  
  // Location filters
  city?: string;
  region?: string;
}

export interface CustomerSegmentData {
  phone: string;
  customer_id?: string;
  name?: string;
  total_spent: number;
  total_orders: number;
  last_order_date?: string;
  last_order_amount: number;
  days_since_last_order: number | null;
  has_email: boolean;
  has_address: boolean;
  tags: string[];
  created_at?: string;
  city?: string;
  region?: string;
}

/**
 * Get customer segment data for a phone number
 */
async function getCustomerSegmentData(phone: string): Promise<CustomerSegmentData | null> {
  try {
    // Find customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, phone, email, address, city, region, created_at, tags')
      .or(`phone.eq.${phone},whatsapp.eq.${phone}`)
      .single();

    if (!customer) {
      return {
        phone,
        total_spent: 0,
        total_orders: 0,
        last_order_amount: 0,
        days_since_last_order: null,
        has_email: !!customer?.email,
        has_address: !!customer?.address,
        tags: customer?.tags || []
      };
    }

    // Get orders
    const { data: orders } = await supabase
      .from('orders')
      .select('total, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(100);

    const totalSpent = orders?.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0) || 0;
    const totalOrders = orders?.length || 0;
    const lastOrder = orders?.[0];
    const lastOrderDate = lastOrder?.created_at;
    const lastOrderAmount = lastOrder ? parseFloat(lastOrder.total) || 0 : 0;
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      phone,
      customer_id: customer.id,
      name: customer.name,
      total_spent: totalSpent,
      total_orders: totalOrders,
      last_order_date: lastOrderDate,
      last_order_amount: lastOrderAmount,
      days_since_last_order: daysSinceLastOrder,
      has_email: !!customer.email,
      has_address: !!customer.address,
      tags: customer.tags || [],
      created_at: customer.created_at,
      city: customer.city,
      region: customer.region
    };
  } catch (error) {
    console.error('Error getting customer segment data:', error);
    return null;
  }
}

/**
 * Filter recipients by segment criteria
 */
export async function filterRecipientsBySegment(
  phones: string[],
  filter: SegmentFilter
): Promise<string[]> {
  const filtered: string[] = [];
  
  for (const phone of phones) {
    const segmentData = await getCustomerSegmentData(phone);
    if (!segmentData) {
      // If no customer data, include by default (or exclude based on your preference)
      continue;
    }
    
    let matches = true;
    
    // Purchase filters
    if (filter.minTotalSpent !== undefined && segmentData.total_spent < filter.minTotalSpent) {
      matches = false;
    }
    if (filter.maxTotalSpent !== undefined && segmentData.total_spent > filter.maxTotalSpent) {
      matches = false;
    }
    if (filter.minOrders !== undefined && segmentData.total_orders < filter.minOrders) {
      matches = false;
    }
    if (filter.maxOrders !== undefined && segmentData.total_orders > filter.maxOrders) {
      matches = false;
    }
    if (filter.daysSinceLastOrder) {
      if (segmentData.days_since_last_order === null) {
        matches = false; // No orders
      } else {
        if (filter.daysSinceLastOrder.min !== undefined && 
            segmentData.days_since_last_order < filter.daysSinceLastOrder.min) {
          matches = false;
        }
        if (filter.daysSinceLastOrder.max !== undefined && 
            segmentData.days_since_last_order > filter.daysSinceLastOrder.max) {
          matches = false;
        }
      }
    }
    if (filter.lastPurchaseAmount) {
      if (filter.lastPurchaseAmount.min !== undefined && 
          segmentData.last_order_amount < filter.lastPurchaseAmount.min) {
        matches = false;
      }
      if (filter.lastPurchaseAmount.max !== undefined && 
          segmentData.last_order_amount > filter.lastPurchaseAmount.max) {
        matches = false;
      }
    }
    
    // Customer filters
    if (filter.hasEmail === true && !segmentData.has_email) {
      matches = false;
    }
    if (filter.hasAddress === true && !segmentData.has_address) {
      matches = false;
    }
    if (filter.customerTags && filter.customerTags.length > 0) {
      const hasAnyTag = filter.customerTags.some(tag => segmentData.tags.includes(tag));
      if (!hasAnyTag) {
        matches = false;
      }
    }
    if (filter.excludeTags && filter.excludeTags.length > 0) {
      const hasExcludedTag = filter.excludeTags.some(tag => segmentData.tags.includes(tag));
      if (hasExcludedTag) {
        matches = false;
      }
    }
    
    // Date filters
    if (filter.createdAfter && segmentData.created_at) {
      if (new Date(segmentData.created_at) < new Date(filter.createdAfter)) {
        matches = false;
      }
    }
    if (filter.createdBefore && segmentData.created_at) {
      if (new Date(segmentData.created_at) > new Date(filter.createdBefore)) {
        matches = false;
      }
    }
    
    // Location filters
    if (filter.city && segmentData.city !== filter.city) {
      matches = false;
    }
    if (filter.region && segmentData.region !== filter.region) {
      matches = false;
    }
    
    if (matches) {
      filtered.push(phone);
    }
  }
  
  return filtered;
}

/**
 * Get segment statistics for a list of phones
 */
export async function getSegmentStats(phones: string[]): Promise<{
  total: number;
  withOrders: number;
  averageSpent: number;
  averageOrders: number;
  byCity: Record<string, number>;
  byRegion: Record<string, number>;
}> {
  const stats = {
    total: phones.length,
    withOrders: 0,
    totalSpent: 0,
    totalOrders: 0,
    byCity: {} as Record<string, number>,
    byRegion: {} as Record<string, number>
  };
  
  for (const phone of phones) {
    const data = await getCustomerSegmentData(phone);
    if (data) {
      if (data.total_orders > 0) stats.withOrders++;
      stats.totalSpent += data.total_spent;
      stats.totalOrders += data.total_orders;
      if (data.city) stats.byCity[data.city] = (stats.byCity[data.city] || 0) + 1;
      if (data.region) stats.byRegion[data.region] = (stats.byRegion[data.region] || 0) + 1;
    }
  }
  
  return {
    total: stats.total,
    withOrders: stats.withOrders,
    averageSpent: stats.total > 0 ? stats.totalSpent / stats.total : 0,
    averageOrders: stats.total > 0 ? stats.totalOrders / stats.total : 0,
    byCity: stats.byCity,
    byRegion: stats.byRegion
  };
}
