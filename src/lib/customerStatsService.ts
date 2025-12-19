import { supabase } from './supabaseClient';

export interface CustomerStatistics {
  totalOrders: number;
  totalSpent: number;
  averageOrder: number;
  lastOrderDate: string | null;
}

export interface CustomerStatsWithId extends CustomerStatistics {
  customerId: string;
}

/**
 * Calculate customer statistics from sales data
 * @param customerId - The customer ID to get statistics for
 * @returns Promise<CustomerStatistics> - Statistics for the customer
 */
export async function getCustomerStatistics(customerId: string): Promise<CustomerStatistics> {
  try {
    console.log(`📊 [CustomerStatsService] Calculating statistics for customer: ${customerId}`);

    // Get all sales for this customer
    const { data: sales, error } = await supabase
      .from('lats_sales')
      .select('id, total_amount, created_at')
      .eq('customer_id', customerId)
      .eq('status', 'completed') // Only count completed sales
      .order('created_at', { ascending: false }); // Get most recent first

    if (error) {
      console.error('❌ [CustomerStatsService] Error fetching sales:', error);
      throw error;
    }

    if (!sales || sales.length === 0) {
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrder: 0,
        lastOrderDate: null
      };
    }

    // Calculate statistics
    const totalOrders = sales.length;
    const totalSpent = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const averageOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const lastOrderDate = sales[0]?.created_at || null;

    const stats = {
      totalOrders,
      totalSpent,
      averageOrder,
      lastOrderDate
    };

    console.log(`✅ [CustomerStatsService] Calculated stats for ${customerId}:`, stats);

    return stats;
  } catch (error) {
    console.error('❌ [CustomerStatsService] Error calculating customer statistics:', error);
    // Return default values on error
    return {
      totalOrders: 0,
      totalSpent: 0,
      averageOrder: 0,
      lastOrderDate: null
    };
  }
}

/**
 * Calculate statistics for multiple customers in batch
 * @param customerIds - Array of customer IDs
 * @returns Promise<CustomerStatsWithId[]> - Array of customer statistics
 */
export async function getMultipleCustomerStatistics(customerIds: string[]): Promise<CustomerStatsWithId[]> {
  try {
    console.log(`📊 [CustomerStatsService] Calculating statistics for ${customerIds.length} customers`);

    // Get all sales for these customers
    const { data: sales, error } = await supabase
      .from('lats_sales')
      .select('customer_id, total_amount, created_at')
      .in('customer_id', customerIds)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [CustomerStatsService] Error fetching sales for multiple customers:', error);
      throw error;
    }

    // Group sales by customer
    const salesByCustomer: Record<string, any[]> = {};
    sales?.forEach(sale => {
      if (!salesByCustomer[sale.customer_id]) {
        salesByCustomer[sale.customer_id] = [];
      }
      salesByCustomer[sale.customer_id].push(sale);
    });

    // Calculate statistics for each customer
    const results: CustomerStatsWithId[] = customerIds.map(customerId => {
      const customerSales = salesByCustomer[customerId] || [];

      if (customerSales.length === 0) {
        return {
          customerId,
          totalOrders: 0,
          totalSpent: 0,
          averageOrder: 0,
          lastOrderDate: null
        };
      }

      const totalOrders = customerSales.length;
      const totalSpent = customerSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      const averageOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const lastOrderDate = customerSales[0]?.created_at || null;

      return {
        customerId,
        totalOrders,
        totalSpent,
        averageOrder,
        lastOrderDate
      };
    });

    console.log(`✅ [CustomerStatsService] Calculated stats for ${results.length} customers`);

    return results;
  } catch (error) {
    console.error('❌ [CustomerStatsService] Error calculating multiple customer statistics:', error);
    // Return default values for all customers on error
    return customerIds.map(customerId => ({
      customerId,
      totalOrders: 0,
      totalSpent: 0,
      averageOrder: 0,
      lastOrderDate: null
    }));
  }
}

/**
 * Format time since last order
 * @param lastOrderDate - ISO date string or null
 * @returns Formatted time string (e.g., "2 days ago", "N/A")
 */
export function formatTimeSinceLastOrder(lastOrderDate: string | null): string {
  if (!lastOrderDate) return 'N/A';

  try {
    const lastOrder = new Date(lastOrderDate);
    const now = new Date();
    const diffMs = now.getTime() - lastOrder.getTime();

    // Convert to different time units
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  } catch (error) {
    console.error('❌ [CustomerStatsService] Error formatting time:', error);
    return 'N/A';
  }
}