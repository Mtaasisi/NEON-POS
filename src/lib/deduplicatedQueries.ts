/**
 * Deduplicated Query Wrappers
 * Common queries wrapped with deduplication to prevent duplicate database calls
 */

import { supabase } from './supabaseClient';
import { deduplicatedQuery } from './queryDeduplication';

/**
 * Fetch device statistics with deduplication
 */
export async function fetchDeviceStats(cacheDuration: number = 5000) {
  return deduplicatedQuery(
    'device-stats',
    async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('status, estimated_completion_date, created_at');
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Fetch customer statistics with deduplication
 */
export async function fetchCustomerStats(cacheDuration: number = 5000) {
  return deduplicatedQuery(
    'customer-stats',
    async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, joined_date, is_active');
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Fetch user statistics with deduplication
 */
export async function fetchUserStats(cacheDuration: number = 5000) {
  return deduplicatedQuery(
    'user-stats',
    async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, role, is_active')
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Fetch payment statistics with deduplication
 */
export async function fetchPaymentStats(cacheDuration: number = 5000) {
  return deduplicatedQuery(
    'payment-stats',
    async () => {
      const { data, error } = await supabase
        .from('customer_payments')
        .select('amount, payment_date, status');
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Fetch inventory statistics with deduplication
 */
export async function fetchInventoryStats(cacheDuration: number = 5000) {
  return deduplicatedQuery(
    'inventory-stats',
    async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('status, cost_price');
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Fetch settings with deduplication
 */
export async function fetchSettings(cacheDuration: number = 30000) {
  return deduplicatedQuery(
    'settings',
    async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1);
      
      if (error) throw error;
      return data?.[0] || null;
    },
    cacheDuration
  );
}

/**
 * Fetch suppliers with deduplication
 */
export async function fetchSuppliers(cacheDuration: number = 30000) {
  return deduplicatedQuery(
    'suppliers',
    async () => {
      const { data, error } = await supabase
        .from('lats_suppliers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Fetch payment methods with deduplication
 */
export async function fetchPaymentMethods(cacheDuration: number = 30000) {
  return deduplicatedQuery(
    'payment-methods',
    async () => {
      const { data, error } = await supabase
        .from('finance_accounts')
        .select('*')
        .eq('is_active', true)
        .eq('is_payment_method', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Fetch notifications for a user with deduplication
 */
export async function fetchNotifications(userId: string, cacheDuration: number = 10000) {
  return deduplicatedQuery(
    `notifications-${userId}`,
    async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Fetch recent customers with deduplication
 */
export async function fetchRecentCustomers(limit: number = 3, cacheDuration: number = 10000) {
  return deduplicatedQuery(
    `recent-customers-${limit}`,
    async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, joined_date')
        .order('joined_date', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Fetch recent payments with deduplication
 */
export async function fetchRecentPayments(limit: number = 5, cacheDuration: number = 10000) {
  return deduplicatedQuery(
    `recent-payments-${limit}`,
    async () => {
      const { data, error } = await supabase
        .from('customer_payments')
        .select('id, amount, payment_date, status')
        .order('payment_date', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Clear all query caches (useful after mutations)
 */
export function clearAllQueryCaches() {
  const { queryDeduplication } = require('./queryDeduplication');
  queryDeduplication.clearCache();
}

/**
 * Clear specific query cache
 */
export function clearQueryCache(key: string) {
  const { queryDeduplication } = require('./queryDeduplication');
  queryDeduplication.clearCache(key);
}

/**
 * Fetch customer payments with deduplication
 */
export async function fetchCustomerPayments(cacheDuration: number = 5000) {
  return deduplicatedQuery(
    'customer-payments',
    async () => {
      const { data, error } = await supabase
        .from('customer_payments')
        .select('*')
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Fetch POS sales with deduplication
 */
export async function fetchLatsSales(cacheDuration: number = 5000) {
  return deduplicatedQuery(
    'lats-sales',
    async () => {
      const { data, error } = await supabase
        .from('lats_sales')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Fetch customer names by IDs with deduplication
 */
export async function fetchCustomersByIds(customerIds: string[], cacheDuration: number = 5000) {
  const cacheKey = `customers-by-ids-${customerIds.sort().join(',')}`;
  return deduplicatedQuery(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', customerIds);
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

