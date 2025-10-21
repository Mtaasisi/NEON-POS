/**
 * Deduplicated Query Wrappers
 * Common queries wrapped with deduplication to prevent duplicate database calls
 */

import { supabase } from './supabaseClient';
import { deduplicatedQuery } from './queryDeduplication';
import { getCurrentBranchId } from './branchAwareApi';

/**
 * Fetch device statistics with deduplication
 */
export async function fetchDeviceStats(cacheDuration: number = 5000) {
  const currentBranchId = getCurrentBranchId();
  return deduplicatedQuery(
    `device-stats-${currentBranchId || 'all'}`,
    async () => {
      let query = supabase
        .from('devices')
        .select('status, estimated_completion_date, created_at');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
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
  const currentBranchId = getCurrentBranchId();
  return deduplicatedQuery(
    `customer-stats-${currentBranchId || 'all'}`,
    async () => {
      let query = supabase
        .from('customers')
        .select('id, joined_date, is_active');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
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
  const currentBranchId = getCurrentBranchId();
  return deduplicatedQuery(
    `payment-stats-${currentBranchId || 'all'}`,
    async () => {
      let query = supabase
        .from('customer_payments')
        .select('amount, payment_date, status');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration
  );
}

/**
 * Fetch inventory statistics with deduplication
 * ✅ FIXED: Now fetches from correct tables (lats_products & lats_product_variants)
 */
export async function fetchInventoryStats(cacheDuration: number = 5000) {
  const currentBranchId = getCurrentBranchId();
  return deduplicatedQuery(
    `inventory-stats-${currentBranchId || 'all'}`,
    async () => {
      // Get products with branch filter
      let productsQuery = supabase
        .from('lats_products')
        .select('id, name, is_active, branch_id')
        .eq('is_active', true);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        productsQuery = productsQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: products, error: productsError } = await productsQuery;
      
      if (productsError) throw productsError;
      
      // Get all product IDs
      const productIds = (products || []).map(p => p.id);
      
      if (productIds.length === 0) {
        return [];
      }
      
      // Get variants for these products
      let variantsQuery = supabase
        .from('lats_product_variants')
        .select('id, product_id, quantity, cost_price, unit_price, selling_price, min_quantity, branch_id')
        .in('product_id', productIds);
      
      // Apply branch filter to variants if branch is selected
      if (currentBranchId) {
        variantsQuery = variantsQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: variants, error: variantsError } = await variantsQuery;
      
      if (variantsError) throw variantsError;
      
      return variants || [];
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
  const currentBranchId = getCurrentBranchId();
  return deduplicatedQuery(
    `recent-customers-${limit}-${currentBranchId || 'all'}`,
    async () => {
      let query = supabase
        .from('customers')
        .select('id, name, joined_date')
        .order('joined_date', { ascending: false })
        .limit(limit);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
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
  const currentBranchId = getCurrentBranchId();
  return deduplicatedQuery(
    `recent-payments-${limit}-${currentBranchId || 'all'}`,
    async () => {
      let query = supabase
        .from('customer_payments')
        .select('id, amount, payment_date, status')
        .order('payment_date', { ascending: false })
        .limit(limit);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
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
  const currentBranchId = getCurrentBranchId();
  return deduplicatedQuery(
    `customer-payments-${currentBranchId || 'all'}`,
    async () => {
      let query = supabase
        .from('customer_payments')
        .select('*')
        .order('payment_date', { ascending: false });
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
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
      console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #9900cc; font-weight: bold;');
      console.log('%c💰 FETCHING SALES', 'background: #9900cc; color: white; font-size: 14px; padding: 3px;');
      
      // 🔒 Get current branch for isolation
      const currentBranchId = typeof localStorage !== 'undefined' ? localStorage.getItem('current_branch_id') : null;
      
      const branchNames = {
        '24cd45b8-1ce1-486a-b055-29d169c3a8ea': 'Main Store',
        '115e0e51-d0d6-437b-9fda-dfe11241b167': 'ARUSHA',
        'd4603b1e-6bb7-414d-91b6-ca1a4938b441': 'Airport Branch'
      };
      
      console.log('%c🏪 Current Branch:', 'color: #9900cc; font-weight: bold;', currentBranchId);
      console.log('%c📍 Branch Name:', 'color: #9900cc; font-weight: bold;', branchNames[currentBranchId] || 'UNKNOWN');
      
      let query = supabase
        .from('lats_sales')
        .select('*')
        .order('created_at', { ascending: false });
      
      // 🔒 COMPLETE ISOLATION: Only show sales from current branch
      if (currentBranchId) {
        console.log('%c🔒 APPLYING BRANCH FILTER TO SALES!', 'background: #ff0000; color: white; font-weight: bold; padding: 3px;');
        console.log('%c   Filter: branch_id = ' + currentBranchId, 'color: #ff0000;');
        query = query.eq('branch_id', currentBranchId);
      } else {
        console.log('%c⚠️ NO BRANCH FILTER - SHOWING ALL SALES!', 'background: #ff9900; color: black; font-weight: bold; padding: 3px;');
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('%c❌ SALES QUERY FAILED!', 'background: #ff0000; color: white; padding: 3px;');
        console.error('Error:', error);
        throw error;
      }
      
      console.log('%c✅ SALES RETURNED:', 'background: #00cc00; color: white; font-weight: bold; padding: 3px;', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('%c📊 SAMPLE SALES (first 3):', 'color: #9900cc; font-weight: bold;');
        data.slice(0, 3).forEach((s, i) => {
          console.log(`   ${i+1}. ${s.sale_number} - ${s.total_amount} TZS (${branchNames[s.branch_id] || 'Unknown Branch'})`);
        });
      }
      
      console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #9900cc; font-weight: bold;');
      
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

