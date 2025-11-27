import { supabase } from '../supabaseClient';
import { Customer } from '../../types';
import { trackCustomerActivity } from '../customerStatusService';
import { withTimeoutAndRetry } from '../../utils/networkErrorHandler';

// console.log removed.toISOString());

// Configuration constants to prevent resource exhaustion
const BATCH_SIZE = 50; // Maximum customers per batch
const REQUEST_DELAY = 100; // Delay between batches in milliseconds
// const MAX_CONCURRENT_REQUESTS = 10; // Maximum concurrent requests
const MAX_RETRIES = 3; // Maximum retry attempts for failed requests
const RETRY_DELAY = 1000; // Delay between retries in milliseconds
const REQUEST_TIMEOUT = 90000; // Default timeout for requests in milliseconds (increased to 90s for large datasets)

// Request deduplication cache
const requestCache = new Map<string, Promise<any>>();

// Helper function to check if supabase is initialized
function checkSupabase() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  return supabase;
}

// Enhanced retry wrapper function for network requests with QUIC error handling
async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  return withTimeoutAndRetry(requestFn, REQUEST_TIMEOUT, {
    maxRetries,
    baseDelay: delay,
    maxDelay: 10000,
    backoffMultiplier: 2
  });
}

// Timeout wrapper function to prevent hanging requests
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = REQUEST_TIMEOUT
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

// Network status check function
export function checkNetworkStatus() {
  const status = {
    online: navigator.onLine,
    connectionType: 'unknown' as string,
    effectiveType: 'unknown' as string,
    downlink: 0,
    rtt: 0,
    saveData: false
  };
  
  // Check for Network Information API
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      status.connectionType = connection.effectiveType || 'unknown';
      status.effectiveType = connection.effectiveType || 'unknown';
      status.downlink = connection.downlink || 0;
      status.rtt = connection.rtt || 0;
      status.saveData = connection.saveData || false;
    }
  }
  
  return status;
}

// Connection quality indicator
export function getConnectionQuality() {
  const status = checkNetworkStatus();
  
  if (!status.online) {
    return { quality: 'offline', message: 'No internet connection' };
  }
  
  if (status.effectiveType === 'slow-2g' || status.effectiveType === '2g') {
    return { quality: 'poor', message: 'Slow connection detected' };
  }
  
  if (status.effectiveType === '3g') {
    return { quality: 'fair', message: 'Moderate connection speed' };
  }
  
  if (status.effectiveType === '4g') {
    return { quality: 'good', message: 'Good connection speed' };
  }
  
  return { quality: 'unknown', message: 'Connection quality unknown' };
}

// Function to normalize color tag values
function normalizeColorTag(colorTag: string): 'new' | 'vip' | 'complainer' | 'purchased' {
  if (!colorTag) return 'new';
  
  const normalized = colorTag.trim().toLowerCase();
  
  // Map common variations to valid values
  const colorMap: { [key: string]: 'new' | 'vip' | 'complainer' | 'purchased' } = {
    'normal': 'new',
    'vip': 'vip',
    'complainer': 'complainer',
    'purchased': 'purchased',
    'not normal': 'new', // Map "not normal" to "new"
    'new': 'new',
    'regular': 'new',
    'standard': 'new',
    'basic': 'new',
    'premium': 'vip',
    'important': 'vip',
    'priority': 'vip',
    'problem': 'complainer',
    'issue': 'complainer',
    'buyer': 'purchased',
    'customer': 'purchased',
    'buying': 'purchased'
  };
  
  return colorMap[normalized] || 'new';
}

// Utility for formatting currency with full numbers
export function formatCurrency(amount: number) {
  const formatted = Number(amount).toLocaleString('en-TZ', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  });
  return 'Tsh ' + formatted;
}

export async function fetchAllCustomers() {
  // Check if there's already a request in progress
  const cacheKey = 'fetchAllCustomers';
  if (requestCache.has(cacheKey)) {

    return requestCache.get(cacheKey);
  }

  // Create new request
  const requestPromise = performFetchAllCustomers();
  requestCache.set(cacheKey, requestPromise);

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Clean up cache after request completes (success or failure)
    setTimeout(() => {
      requestCache.delete(cacheKey);
    }, 1000); // Keep in cache for 1 second to prevent rapid re-requests
  }
}

async function performFetchAllCustomers() {
  if (navigator.onLine) {
    try {


      
      // 🔒 CHECK BRANCH ISOLATION MODE
      const currentBranchId = localStorage.getItem('current_branch_id');
      
      // Get branch settings to determine isolation mode
      let isolationMode: 'shared' | 'isolated' | 'hybrid' = 'shared';
      let shareCustomers = true;
      
      if (currentBranchId) {
        try {
          const { data: branchSettings } = await checkSupabase()
            .from('store_locations')
            .select('data_isolation_mode, share_customers')
            .eq('id', currentBranchId)
            .single();
          
          if (branchSettings) {
            isolationMode = branchSettings.data_isolation_mode;
            shareCustomers = isolationMode === 'shared' || 
                           (isolationMode === 'hybrid' && branchSettings.share_customers);
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch branch settings, defaulting to shared mode');
        }
      }
      


      


      // Count customers based on isolation mode
      const { count, error: countError } = await withTimeout(
        retryRequest(async () => {
          let countQuery = checkSupabase()
            .from('customers')
            .select('id', { count: 'exact', head: true });
          
          // Apply branch filter in isolated mode
          if (currentBranchId && !shareCustomers) {
            countQuery = countQuery.eq('branch_id', currentBranchId);
          }
          
          const result = await countQuery;
          
          if (result.error) {
            throw result.error;
          }
          return result;
        }),
        REQUEST_TIMEOUT
      );
      
      if (countError) {
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌ ERROR COUNTING CUSTOMERS');
        console.error('═══════════════════════════════════════════════════════');
        console.error('Error:', countError);
        console.error('═══════════════════════════════════════════════════════');
        throw countError;
      }


      if (currentBranchId) {

      } else {
        // console.log removed');
      }


      // Use pagination to fetch customers in batches to avoid overwhelming the browser
      const pageSize = BATCH_SIZE; // Use configured batch size
      const totalPages = Math.ceil((count || 0) / pageSize);
      const allCustomers = [];
      
      // Prevent infinite loops by limiting maximum pages
      const maxPages = Math.min(totalPages, 100);


      // Fetch customers page by page with controlled concurrency and timeout protection
      for (let page = 1; page <= maxPages; page++) {

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        // console.log removed...`);
        
        try {
          const { data: pageData, error: pageError } = await withTimeout(
            retryRequest(async () => {
              let query = checkSupabase()
                .from('customers')
                .select(`
                  id,name,phone,email,whatsapp,gender,city,country,color_tag,loyalty_level,points,total_spent,last_visit,is_active,referral_source,birth_month,birth_day,birthday,initial_notes,notes,customer_tag,location_description,national_id,joined_date,created_at,updated_at,branch_id,is_shared,created_by_branch_id,created_by_branch_name,profile_image,whatsapp_opt_out,referred_by,created_by,last_purchase_date,total_purchases,total_calls,total_call_duration_minutes,incoming_calls,outgoing_calls,missed_calls,avg_call_duration_minutes,first_call_date,last_call_date,call_loyalty_level,total_returns
                `)
                .range(from, to)
                .order('created_at', { ascending: false});
              
              // Apply branch filter based on isolation mode
              if (currentBranchId) {
                if (isolationMode === 'isolated') {
                  // ISOLATED MODE: Only show customers from this branch (ignore is_shared flag)
                  query = query.eq('branch_id', currentBranchId);
                  console.log(`🔒 [fetchAllCustomers] ISOLATED MODE - Only showing customers from branch ${currentBranchId}`);
                } else if (isolationMode === 'shared') {
                  // SHARED MODE: Show all customers (no filter)
                  console.log(`📊 [fetchAllCustomers] SHARED MODE - Showing all customers`);
                } else if (isolationMode === 'hybrid') {
                  // HYBRID MODE: Check share_customers flag
                  if (shareCustomers) {
                    // Customers are shared - show all customers (no filter)
                    console.log(`⚖️ [fetchAllCustomers] HYBRID MODE - Customers are SHARED - Showing all customers`);
                  } else {
                    // Customers are NOT shared - only show this branch's customers
                    query = query.eq('branch_id', currentBranchId);
                    console.log(`⚖️ [fetchAllCustomers] HYBRID MODE - Customers are NOT SHARED - Only showing branch ${currentBranchId}`);
                  }
                }
              }
              
              const result = await query;
              
              if (result.error) {
                throw result.error;
              }
              return result;
            }),
            REQUEST_TIMEOUT
          );
          
          if (pageError) {
            console.error('═══════════════════════════════════════════════════════');
            console.error(`❌ ERROR FETCHING PAGE ${page}/${maxPages}`);
            console.error('═══════════════════════════════════════════════════════');
            console.error('Error:', pageError);
            console.error('Page range:', from, '-', to);
            console.error('Branch filter:', currentBranchId || 'NONE');
            console.error('═══════════════════════════════════════════════════════');
            throw pageError;
          }
          

          
          // Log sample of branch_id values to verify filtering
          if (pageData && pageData.length > 0) {
            const branchIds = [...new Set(pageData.map((c: any) => c.branch_id))];

            
            const customersWithoutBranch = pageData.filter((c: any) => !c.branch_id).length;
            if (customersWithoutBranch > 0) {
              console.warn(`   ⚠️  ${customersWithoutBranch} customers WITHOUT branch_id (will be invisible in filtered view)`);
            }
          }
          
          if (pageData && Array.isArray(pageData)) {
            // Helper function to safely parse numeric values and detect corruption
            const safeParseNumber = (value: any, defaultValue: number = 0): number => {
              if (value === null || value === undefined) return defaultValue;
              const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
              // Detect corrupted data (unrealistic values > 1 trillion TZS)
              if (isNaN(parsed) || parsed > 1000000000000 || parsed < 0) {
                console.warn('⚠️ Detected corrupted value:', value, '- resetting to', defaultValue);
                return defaultValue;
              }
              return parsed;
            };
            
            // Fetch branch names separately since custom client doesn't support joins
            let branchNames: Record<string, string> = {};
            try {
              const branchIds = [...new Set(pageData.map((c: any) => c.branch_id).filter(Boolean))];
              if (branchIds.length > 0) {
                const branchQuery = checkSupabase()
                  .from('store_locations')
                  .select('id, name')
                  .in('id', branchIds);
                
                const branchResult = await branchQuery;
                if (branchResult.data) {
                  branchNames = branchResult.data.reduce((acc: any, branch: any) => {
                    acc[branch.id] = branch.name;
                    return acc;
                  }, {});
                }
              }
            } catch (branchError) {
              console.warn('⚠️ Could not fetch branch names:', branchError);
            }

            // Debug: Show raw data for first customer
            // (console.log removed)
            
            // Process and normalize the data
            const processedCustomers = pageData.map((customer: any) => {
              // Map snake_case database fields to camelCase interface fields
              const mappedCustomer = {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                gender: customer.gender,
                city: customer.city,
                joinedDate: customer.joined_date || customer.created_at,
                loyaltyLevel: customer.loyalty_level,
                colorTag: normalizeColorTag(customer.color_tag || 'new'),
                referredBy: null, // Not in DB yet
                totalSpent: safeParseNumber(customer.total_spent, 0),
                points: safeParseNumber(customer.points, 0),
                lastVisit: customer.last_visit,
                branchName: branchNames[customer.branch_id] || customer.created_by_branch_name || 'Unknown Branch',
                isActive: customer.is_active,
                referralSource: customer.referral_source,
                birthMonth: customer.birth_month,
                birthDay: customer.birth_day,
                totalReturns: 0, // Not in DB yet
                profileImage: null, // Not in DB yet
                createdAt: customer.created_at,
                updatedAt: customer.updated_at,
                createdBy: null, // Not in DB yet
                lastPurchaseDate: null, // Not in DB yet
                totalPurchases: 0, // Not in DB yet
                birthday: null, // Not in DB yet
                whatsapp: customer.phone, // Use phone as fallback
                whatsappOptOut: false, // Not in DB yet
                initialNotes: customer.initial_notes,
                locationDescription: customer.location_description,
                nationalId: customer.national_id,
                notes: customer.notes ? (typeof customer.notes === 'string' ? 
                  (() => {
                    try { return JSON.parse(customer.notes); } 
                    catch { return []; }
                  })() : customer.notes) : [],
                referrals: [], // Not in DB yet
                customerTag: customer.customer_tag,
                // Call analytics fields - not in DB yet, set defaults
                totalCalls: 0,
                totalCallDurationMinutes: 0,
                incomingCalls: 0,
                outgoingCalls: 0,
                missedCalls: 0,
                avgCallDurationMinutes: 0,
                firstCallDate: '',
                lastCallDate: '',
                callLoyaltyLevel: 'Basic',
                // Additional fields for interface compatibility
                customerNotes: [],
                customerPayments: [],
                devices: [],
                promoHistory: [],
                // Branch information
                branchId: customer.branch_id,
                createdByBranchId: customer.created_by_branch_id,
                createdByBranchName: customer.created_by_branch_name
              };
              return mappedCustomer;
            });
            
            allCustomers.push(...processedCustomers);

          }
          
          // Add delay between requests to prevent overwhelming the server
          if (page < maxPages) {
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
          }
          
        } catch (error) {
          console.error(`❌ Failed to fetch page ${page}:`, error);
          // Continue with partial data rather than failing completely

          break;
        }
      }


      
      if (currentBranchId) {


        
        // Check if all customers have the correct branch_id
        const branchIds = [...new Set(allCustomers.map((c: any) => c.branchId))];

        
        const customersWithoutBranch = allCustomers.filter((c: any) => !c.branchId).length;
        const customersWithWrongBranch = allCustomers.filter((c: any) => c.branchId && c.branchId !== currentBranchId).length;
        
        if (customersWithoutBranch > 0) {
          console.warn(`   ⚠️  ${customersWithoutBranch} customers missing branch_id`);
        }
        
        if (customersWithWrongBranch > 0) {
          console.error(`   ❌ ${customersWithWrongBranch} customers from WRONG branch!`);
          console.error(`   ❌ This indicates a filtering problem!`);
        }
        
        if (customersWithoutBranch === 0 && customersWithWrongBranch === 0) {

        }
      } else {
        console.warn('⚠️  No Branch Filter:');
        console.warn('   - Fetched customers from ALL branches');
        
        const branchIds = [...new Set(allCustomers.map((c: any) => c.branchId).filter(Boolean))];
        console.warn('   - Branches represented:', branchIds.length);
        console.warn('   - Branch IDs:', branchIds);
        
        const customersWithoutBranch = allCustomers.filter((c: any) => !c.branchId).length;
        if (customersWithoutBranch > 0) {
          console.warn(`   - ${customersWithoutBranch} customers without branch_id`);
        }
      }
      

      // console.log removed:');
      allCustomers.slice(0, 3).forEach((customer: any, index: number) => {
        // console.log removed`);


      });
      


      return allCustomers;
      
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      throw error;
    }
  } else {

    // Load from cache when offline
    const cachedCustomers = await import('../offlineCache').then(m => m.cacheGetAll('customers'));
    return cachedCustomers || [];
  }
}

// Lightweight version for app initialization - only essential fields
export async function fetchAllCustomersLight() {
  // Use request deduplication to prevent multiple simultaneous requests
  const cacheKey = 'fetchAllCustomersLight';
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey)!;
  }

  // Create new request
  const requestPromise = performFetchAllCustomersLight();
  requestCache.set(cacheKey, requestPromise);

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Clean up cache after request completes (success or failure)
    setTimeout(() => {
      requestCache.delete(cacheKey);
    }, 1000); // Keep in cache for 1 second to prevent rapid re-requests
  }
}

export async function fetchAllCustomersSimple() {
  // console.log removed.toISOString());

  // Use request deduplication to prevent multiple simultaneous requests
  const cacheKey = 'fetchAllCustomersSimple';
  if (requestCache.has(cacheKey)) {

    return requestCache.get(cacheKey)!;
  }

  // Create new request
  const requestPromise = performFetchAllCustomersSimple();
  requestCache.set(cacheKey, requestPromise);

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Clean up cache after request completes (success or failure)
    setTimeout(() => {
      requestCache.delete(cacheKey);
    }, 1000); // Keep in cache for 1 second to prevent rapid re-requests
  }
}

async function performFetchAllCustomersLight() {
  if (navigator.onLine) {
    try {
      // 🔒 CHECK BRANCH ISOLATION MODE
      const currentBranchId = localStorage.getItem('current_branch_id');

      // Get branch settings to determine isolation mode
      let isolationMode: 'shared' | 'isolated' | 'hybrid' = 'shared';
      let shareCustomers = true;

      if (currentBranchId) {
        try {
          const { data: branchSettings } = await checkSupabase()
            .from('store_locations')
            .select('data_isolation_mode, share_customers')
            .eq('id', currentBranchId)
            .single();

          if (branchSettings) {
            isolationMode = branchSettings.data_isolation_mode;
            shareCustomers = isolationMode === 'shared' ||
                           (isolationMode === 'hybrid' && branchSettings.share_customers);
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch branch settings, defaulting to shared mode');
        }
      }

      // Lightweight query - only essential fields for app initialization
      const { data, error } = await withTimeout(
        retryRequest(async () => {
          let query = checkSupabase()
            .from('customers')
            .select(`
              id,name,phone,email,is_active,total_spent,last_visit,points,city,branch_id
            `)
            .order('created_at', { ascending: false })
            .limit(5000); // Reasonable limit for initial load

          // Apply branch filter based on isolation mode
          if (currentBranchId) {
            if (isolationMode === 'isolated') {
              // ISOLATED MODE: Only show customers from this branch (ignore is_shared flag)
              query = query.eq('branch_id', currentBranchId);
              console.log(`🔒 [fetchAllCustomersLight] ISOLATED MODE - Only showing customers from branch ${currentBranchId}`);
            } else if (isolationMode === 'shared') {
              // SHARED MODE: Show all customers (no filter)
              console.log(`📊 [fetchAllCustomersLight] SHARED MODE - Showing all customers`);
            } else if (isolationMode === 'hybrid') {
              // HYBRID MODE: Check share_customers flag
              if (shareCustomers) {
                // Customers are shared - show all customers (no filter)
                console.log(`⚖️ [fetchAllCustomersLight] HYBRID MODE - Customers are SHARED - Showing all customers`);
              } else {
                // Customers are NOT shared - only show this branch's customers
                query = query.eq('branch_id', currentBranchId);
                console.log(`⚖️ [fetchAllCustomersLight] HYBRID MODE - Customers are NOT SHARED - Only showing branch ${currentBranchId}`);
              }
            }
          }

          const result = await query;
          return result;
        }),
        30000 // 30 second timeout for lightweight query
      );

      if (error) {
        console.error('❌ Error fetching customers (light):', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} customers (lightweight)`);
      return data || [];

    } catch (error: any) {
      console.error('❌ Error fetching customers (light):', error.message || error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error stringified:', JSON.stringify(error, null, 2));
      if (error && typeof error === 'object') {
        console.error('❌ Error keys:', Object.keys(error as any));
        console.error('❌ Error message:', (error as any)?.message);
        console.error('❌ Error code:', (error as any)?.code);
        console.error('❌ Error details:', (error as any)?.details);
        console.error('❌ Error hint:', (error as any)?.hint);
      }
      throw error;
    }
  } else {
    // Return cached data when offline
    const cachedCustomers = await import('../offlineCache').then(m => m.cacheGetAll('customers'));
    return cachedCustomers || [];
  }
}

async function performFetchAllCustomersSimple() {

  if (navigator.onLine) {
    try {
      // 🔒 CHECK BRANCH ISOLATION MODE
      const currentBranchId = localStorage.getItem('current_branch_id');
      
      // Get branch settings to determine isolation mode
      let isolationMode: 'shared' | 'isolated' | 'hybrid' = 'shared';
      let shareCustomers = true;
      
      if (currentBranchId) {
        try {
          const { data: branchSettings } = await checkSupabase()
            .from('store_locations')
            .select('data_isolation_mode, share_customers')
            .eq('id', currentBranchId)
            .single();
          
          if (branchSettings) {
            isolationMode = branchSettings.data_isolation_mode;
            shareCustomers = isolationMode === 'shared' || 
                           (isolationMode === 'hybrid' && branchSettings.share_customers);
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch branch settings, defaulting to shared mode');
        }
      }
      
      // console.log removed...');


      
      // First, get the total count
      const countResult = await withTimeout(
        retryRequest(async () => {
          let countQuery = checkSupabase()
            .from('customers')
            .select('id', { count: 'exact', head: true });
          
          // Apply branch filter in isolated mode
          if (currentBranchId && !shareCustomers) {
            countQuery = countQuery.eq('branch_id', currentBranchId);
          }
          
          const result = await countQuery;
          return result;
        }),
        REQUEST_TIMEOUT
      );

      if (countResult.error) {
        console.error('❌ Error getting customer count:', countResult.error);
        console.error('❌ Error details:', JSON.stringify(countResult.error, null, 2));
        throw countResult.error;
      }

      const count = countResult.count;

      // Log the count for debugging


      // If count is reasonable, fetch all at once with a high limit
      // Handle undefined count by trying to fetch anyway (count query might have failed)
      const customerCount = count ?? -1; // Use -1 to distinguish undefined from actual 0
      if ((customerCount > 0 || customerCount === -1) && (customerCount <= 100000 || customerCount === -1)) { // 100k limit for safety, but allow -1 (undefined)
        const { data, error } = await withTimeout(
          retryRequest(async () => {
            let query = checkSupabase()
              .from('customers')
              .select(`
                id,name,phone,email,whatsapp,gender,city,country,color_tag,loyalty_level,points,total_spent,last_visit,is_active,referral_source,birth_month,birth_day,birthday,initial_notes,notes,customer_tag,location_description,national_id,joined_date,created_at,updated_at,branch_id,is_shared,created_by_branch_id,created_by_branch_name,profile_image,whatsapp_opt_out,referred_by,created_by,last_purchase_date,total_purchases,total_calls,total_call_duration_minutes,incoming_calls,outgoing_calls,missed_calls,avg_call_duration_minutes,first_call_date,last_call_date,call_loyalty_level,total_returns
              `)
              .order('created_at', { ascending: false })
              .limit(100000); // High limit to get all customers
            
            // Apply branch filter based on isolation mode
            if (currentBranchId) {
              if (isolationMode === 'isolated') {
                // ISOLATED MODE: Only show customers from this branch (ignore is_shared flag)
                query = query.eq('branch_id', currentBranchId);
                console.log(`🔒 [fetchAllCustomersSimple] ISOLATED MODE - Only showing customers from branch ${currentBranchId}`);
              } else if (isolationMode === 'shared') {
                // SHARED MODE: Show all customers (no filter)
                console.log(`📊 [fetchAllCustomersSimple] SHARED MODE - Showing all customers`);
              } else if (isolationMode === 'hybrid') {
                // HYBRID MODE: Check share_customers flag
                if (shareCustomers) {
                  // Customers are shared - show all customers (no filter)
                  console.log(`⚖️ [fetchAllCustomersSimple] HYBRID MODE - Customers are SHARED - Showing all customers`);
                } else {
                  // Customers are NOT shared - only show this branch's customers
                  query = query.eq('branch_id', currentBranchId);
                  console.log(`⚖️ [fetchAllCustomersSimple] HYBRID MODE - Customers are NOT SHARED - Only showing branch ${currentBranchId}`);
                }
              }
            }
            
            const result = await query;
            
            if (result.error) {
              throw result.error;
            }
            return result;
          }),
          REQUEST_TIMEOUT
        );
        
        if (error) {
          console.error('❌ Error fetching customers (simple):', error);
          console.error('❌ Error details:', JSON.stringify(error, null, 2));
          console.error('❌ Error message:', error?.message);
          console.error('❌ Error code:', error?.code);
          console.error('❌ Error hint:', error?.hint);
          console.error('❌ Error details:', error?.details);
          throw error;
        }
        
        if (data && Array.isArray(data)) {
          // Debug: Show raw database data for first customer
          if (data.length > 0) {

          }
          
          // Helper function to safely parse numeric values and detect corruption
          const safeParseNumber = (value: any, defaultValue: number = 0): number => {
            if (value === null || value === undefined) return defaultValue;
            const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
            // Detect corrupted data (unrealistic values > 1 trillion TZS)
            if (isNaN(parsed) || parsed > 1000000000000 || parsed < 0) {
              console.warn('⚠️ Detected corrupted value:', value, '- resetting to', defaultValue);
              return defaultValue;
            }
            return parsed;
          };
          
          // Fetch branch names separately since custom client doesn't support joins
          let branchNames: Record<string, string> = {};
          try {
            const branchIds = [...new Set(data.map((c: any) => c.branch_id).filter(Boolean))];
            if (branchIds.length > 0) {
              const branchQuery = checkSupabase()
                .from('store_locations')
                .select('id, name')
                .in('id', branchIds);
              
              const branchResult = await branchQuery;
              if (branchResult.data) {
                branchNames = branchResult.data.reduce((acc: any, branch: any) => {
                  acc[branch.id] = branch.name;
                  return acc;
                }, {});
              }
            }
          } catch (branchError) {
            console.warn('⚠️ Could not fetch branch names:', branchError);
          }

          // Process and normalize the data
          const processedCustomers = data.map((customer: any) => {
            // Map snake_case database fields to camelCase interface fields
            const mappedCustomer = {
              id: customer.id,
              name: customer.name || 'Unknown Customer', // Ensure name is never null/undefined
              phone: customer.phone || `NO_PHONE_${customer.id}`, // Ensure phone is never null/undefined
              email: customer.email || '',
              gender: customer.gender || 'other',
              city: customer.city || '',
              colorTag: normalizeColorTag(customer.color_tag || 'new'),
              loyaltyLevel: customer.loyalty_level || 'interested',
              points: safeParseNumber(customer.points, 0),
              totalSpent: safeParseNumber(customer.total_spent, 0),
              lastVisit: customer.last_visit || customer.created_at,
              isActive: customer.is_active !== false, // Default to true if null
              referralSource: customer.referral_source,
              birthMonth: customer.birth_month,
              birthDay: customer.birth_day,
              totalReturns: 0, // Not in DB yet
              profileImage: null, // Not in DB yet
              branchName: branchNames[customer.branch_id] || customer.created_by_branch_name || 'Unknown Branch',
              whatsapp: customer.phone, // Use phone as fallback
              whatsappOptOut: false, // Not in DB yet
              initialNotes: customer.initial_notes,
              notes: customer.notes ? (typeof customer.notes === 'string' ? 
                (() => {
                  try { return JSON.parse(customer.notes); } 
                  catch { return []; }
                })() : customer.notes) : [],
              referrals: [], // Not in DB yet
              customerTag: customer.customer_tag,
              joinedDate: customer.joined_date || customer.created_at,
              createdAt: customer.created_at,
              updatedAt: customer.updated_at,
              createdBy: null, // Not in DB yet
              lastPurchaseDate: null, // Not in DB yet
              totalPurchases: 0, // Not in DB yet
              birthday: null, // Not in DB yet
              referredBy: null, // Not in DB yet
              locationDescription: customer.location_description,
              nationalId: customer.national_id,
              // Call analytics fields - not in DB yet, set defaults
              totalCalls: 0,
              totalCallDurationMinutes: 0,
              incomingCalls: 0,
              outgoingCalls: 0,
              missedCalls: 0,
              avgCallDurationMinutes: 0,
              firstCallDate: '',
              lastCallDate: '',
              callLoyaltyLevel: 'Basic',
              // Additional fields for interface compatibility
              customerNotes: [],
              customerPayments: [],
              devices: [],
              promoHistory: [],
              // Branch information
              branchId: customer.branch_id,
              createdByBranchId: customer.created_by_branch_id,
              createdByBranchName: customer.created_by_branch_name
            };
            return mappedCustomer;
          });

          // Debug: Show first few customer names and check for corrupt data
          // (console.log removed)
          
          return processedCustomers;
        } else {
          console.warn('⚠️ No customer data returned from query');
          return [];
        }
      } else {
        // Handle case where count is 0 (actual zero, not undefined) or exceeds limit
        if (customerCount === 0) {
          // console.log removed');
          return [];
        }
        // console.log removed exceeds safety limit (100,000). Using fallback method.`);
        // Fallback to original method for very large datasets
        // ✅ Using same column list as the normal query to avoid 400 errors
        const { data, error } = await withTimeout(
          retryRequest(async () => {
            let query = checkSupabase()
              .from('customers')
              .select('id,name,phone,email,gender,city,color_tag,loyalty_level,points,total_spent,last_visit,is_active,referral_source,birth_month,birth_day,initial_notes,notes,customer_tag,location_description,national_id,joined_date,created_at,updated_at,branch_id,is_shared')
              .order('created_at', { ascending: false })
              .limit(100000); // Increased limit for large datasets
            
            // Apply branch filter in isolated mode
            if (currentBranchId && !shareCustomers) {
              // Show customers from this branch OR customers marked as shared
              query = query.or(`branch_id.eq.${currentBranchId},is_shared.eq.true`);
              // console.log removed (branch:', currentBranchId, 'OR is_shared=true)');
            } else {
              // console.log removed (shared across branches)');
            }
            
            const result = await query;
            
            if (result.error) {
              throw result.error;
            }
            return result;
          }),
          REQUEST_TIMEOUT
        );
        
        if (error) {
          console.error('❌ Error fetching customers (fallback):', error);
          throw error;
        }
        
        if (data && Array.isArray(data)) {
          // Debug: Show raw database data for first customer (fallback)
          if (data.length > 0) {
            // console.log removed:`, data[0]);
          }
          
          // Process and normalize the data
          const processedCustomers = data.map((customer: any) => {
            // Map snake_case database fields to camelCase interface fields
          const mappedCustomer = {
            id: customer.id,
            name: customer.name || 'Unknown Customer', // Ensure name is never null/undefined
            phone: customer.phone || `NO_PHONE_${customer.id}`, // Ensure phone is never null/undefined
            email: customer.email || '',
            gender: customer.gender || 'other',
            city: customer.city || '',
            colorTag: normalizeColorTag(customer.color_tag || 'new'),
            loyaltyLevel: customer.loyalty_level || 'bronze',
            points: customer.points || 0,
            totalSpent: customer.total_spent || 0,
            lastVisit: customer.last_visit || customer.created_at,
            isActive: customer.is_active !== false, // Default to true if null
            referralSource: customer.referral_source,
            birthMonth: customer.birth_month,
            birthDay: customer.birth_day,
            totalReturns: 0, // Not in DB yet
            profileImage: null, // Not in DB yet
            whatsapp: customer.phone, // Use phone as fallback
            whatsappOptOut: false, // Not in DB yet
            initialNotes: customer.initial_notes,
            notes: customer.notes ? (typeof customer.notes === 'string' ? 
              (() => {
                try { return JSON.parse(customer.notes); } 
                catch { return []; }
              })() : customer.notes) : [],
            referrals: [], // Not in DB yet
            customerTag: customer.customer_tag,
            joinedDate: customer.joined_date || customer.created_at,
            createdAt: customer.created_at,
            updatedAt: customer.updated_at,
            createdBy: null, // Not in DB yet
            lastPurchaseDate: null, // Not in DB yet
            totalPurchases: 0, // Not in DB yet
            birthday: null, // Not in DB yet
            referredBy: null, // Not in DB yet
            locationDescription: customer.location_description,
            nationalId: customer.national_id,
            // Call analytics fields - not in DB yet, set defaults
            totalCalls: 0,
            totalCallDurationMinutes: 0,
            incomingCalls: 0,
            outgoingCalls: 0,
            missedCalls: 0,
            avgCallDurationMinutes: 0,
            firstCallDate: '',
            lastCallDate: '',
            callLoyaltyLevel: 'Basic',
            // Additional fields for interface compatibility
            customerNotes: [],
            customerPayments: [],
            devices: [],
            promoHistory: []
          };
          return mappedCustomer;
          });
          
          // console.log removed`);
          return processedCustomers;
        } else {

          return [];
        }
      }
      
    } catch (error) {
      console.error('❌ Error fetching customers (simple):', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error stringified:', JSON.stringify(error, null, 2));
      if (error && typeof error === 'object') {
        console.error('❌ Error keys:', Object.keys(error));
        console.error('❌ Error message:', (error as any)?.message);
        console.error('❌ Error code:', (error as any)?.code);
        console.error('❌ Error hint:', (error as any)?.hint);
        console.error('❌ Error details:', (error as any)?.details);
      }
      throw error;
    }
  } else {

    // Load from cache when offline
    const cachedCustomers = await import('../offlineCache').then(m => m.cacheGetAll('customers'));
    return cachedCustomers || [];
  }
}

export async function fetchCustomerById(customerId: string) {
  try {

    const { data, error } = await checkSupabase()
      .from('customers')
      .select(`
        id,
        name,
        phone,
        email,
        whatsapp,
        gender,
        city,
        country,
        address,
        color_tag,
        loyalty_level,
        points,
        total_spent,
        last_visit,
        is_active,
        referral_source,
        birth_month,
        birth_day,
        birthday,
        initial_notes,
        notes,
        customer_tag,
        location_description,
        national_id,
        joined_date,
        created_at,
        updated_at,
        branch_id,
        is_shared,
        created_by_branch_id,
        created_by_branch_name,
        profile_image,
        whatsapp_opt_out,
        referred_by,
        created_by,
        last_purchase_date,
        total_purchases,
        total_calls,
        total_call_duration_minutes,
        incoming_calls,
        outgoing_calls,
        missed_calls,
        avg_call_duration_minutes,
        first_call_date,
        last_call_date,
        call_loyalty_level,
        total_returns
      `)
      .eq('id', customerId as any)
      .single();
    
    if (error) {
      console.error('❌ Error fetching customer by ID:', error);
      throw error;
    }
    
    if (data && !error && typeof data === 'object' && 'id' in data) {
      // Process and normalize the data
      const processedCustomer = {
        id: (data as any).id,
        name: (data as any).name,
        phone: (data as any).phone,
        email: (data as any).email,
        gender: (data as any).gender || 'other',
        city: (data as any).city || '',
        colorTag: normalizeColorTag((data as any).color_tag || 'new'),
        loyaltyLevel: (data as any).loyalty_level || 'bronze',
        points: (data as any).points || 0,
        totalSpent: (data as any).total_spent || 0,
        lastVisit: (data as any).last_visit || (data as any).created_at,
        isActive: (data as any).is_active !== false, // Default to true if null
        referralSource: (data as any).referral_source,
        birthMonth: (data as any).birth_month,
        birthDay: (data as any).birth_day,
        totalReturns: 0, // Not in DB yet
        profileImage: null, // Not in DB yet
        whatsapp: (data as any).phone, // Use phone as fallback
        whatsappOptOut: false, // Not in DB yet
        initialNotes: (data as any).initial_notes,
        notes: (data as any).notes ? (typeof (data as any).notes === 'string' ? 
          (() => {
            try { return JSON.parse((data as any).notes); } 
            catch { return []; }
          })() : (data as any).notes) : [],
        referrals: [], // Not in DB yet
        customerTag: (data as any).customer_tag,
        joinedDate: (data as any).joined_date || (data as any).created_at,
        createdAt: (data as any).created_at,
        updatedAt: (data as any).updated_at,
        createdBy: null, // Not in DB yet
        lastPurchaseDate: null, // Not in DB yet
        totalPurchases: 0, // Not in DB yet
        birthday: null, // Not in DB yet
        referredBy: null, // Not in DB yet
        locationDescription: (data as any).location_description,
        nationalId: (data as any).national_id,
        // Call analytics fields - not in DB yet, set defaults
        totalCalls: 0,
        totalCallDurationMinutes: 0,
        incomingCalls: 0,
        outgoingCalls: 0,
        missedCalls: 0,
        avgCallDurationMinutes: 0,
        firstCallDate: '',
        lastCallDate: '',
        callLoyaltyLevel: 'Basic',
        // Additional fields for interface compatibility
        customerNotes: [],
        customerPayments: [],
        devices: [],
        promoHistory: []
      };

      return processedCustomer;
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Error fetching customer by ID:', error);
    throw error;
  }
}

export async function addCustomerToDb(customer: Omit<Customer, 'promoHistory' | 'payments' | 'devices'>) {
  try {


    // Map camelCase fields to snake_case database fields
    // Only include fields that actually exist in the database schema
    const fieldMapping: Record<string, string> = {
      colorTag: 'color_tag',
      isActive: 'is_active',
      isShared: 'is_shared',
      lastVisit: 'last_visit',
      joinedDate: 'joined_date',
      loyaltyLevel: 'loyalty_level',
      totalSpent: 'total_spent',
      referralSource: 'referral_source',
      birthMonth: 'birth_month',
      birthDay: 'birth_day',
      totalReturns: 'total_returns',
      initialNotes: 'initial_notes',
      locationDescription: 'location_description',
      nationalId: 'national_id',
      customerTag: 'customer_tag',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      createdBy: 'created_by',
      whatsapp: 'whatsapp',
      branchId: 'branch_id',
      createdByBranchId: 'created_by_branch_id',
      createdByBranchName: 'created_by_branch_name'
    };
    
    // Fields that should not be inserted into the database (TypeScript-only fields)
    const excludeFields = ['devices', 'promoHistory', 'payments', 'notes', 'referrals'];
    

    
    // Map customer fields to database fields
    const dbCustomer: any = {};
    Object.entries(customer).forEach(([key, value]) => {
      // Skip fields that don't exist in the database
      if (excludeFields.includes(key)) {
        // console.log removed`);
        return;
      }
      
      if (value !== undefined && value !== null) {
        const dbFieldName = fieldMapping[key] || key;
        dbCustomer[dbFieldName] = value;
        // console.log removed}`);
      } else {
        // console.log removed`);
      }
    });
    
    // 🏪 Automatically capture current branch information


    
    const currentBranchId = typeof localStorage !== 'undefined' ? localStorage.getItem('current_branch_id') : null;
    

    
    if (currentBranchId) {

      
      // 🔒 CRITICAL: Verify branch exists in lats_branches (required by FK constraint)
      let validBranchId: string | null = null;
      let branchName: string | null = null;
      
      try {
        // Get branch info from store_locations (where the ID comes from)
        const { data: storeLocationData } = await checkSupabase()
          .from('store_locations')
          .select('id, name')
          .eq('id', currentBranchId)
          .single();
        
        if (!storeLocationData) {
          throw new Error(`Branch ID ${currentBranchId} not found in store_locations`);
        }
        
        branchName = storeLocationData.name;
        
        // Check if branch exists in lats_branches (required by FK constraint)
        const { data: latsBranchData, error: latsBranchError } = await checkSupabase()
          .from('lats_branches')
          .select('id, name')
          .eq('id', currentBranchId)
          .single();
        
        if (latsBranchData && !latsBranchError) {
          validBranchId = latsBranchData.id;
          branchName = latsBranchData.name || branchName;
          console.log('✅ Branch verified in lats_branches:', branchName);
        } else {
          // Create branch in lats_branches with SAME ID as store_locations
          console.warn('⚠️  Creating branch in lats_branches with same ID...');
          const { data: newBranch, error: createError } = await checkSupabase()
            .from('lats_branches')
            .insert([{
              id: currentBranchId,
              name: storeLocationData.name,
              is_active: true
            }])
            .select('id, name')
            .single();
          
          if (newBranch && !createError) {
            validBranchId = newBranch.id;
            branchName = newBranch.name;
            console.log('✅ Created branch in lats_branches:', branchName);
          } else {
            throw new Error(`Failed to create branch: ${createError?.message || 'Unknown error'}`);
          }
        }
      } catch (branchError: any) {
        console.error('❌ Error verifying branch:', branchError);
        throw new Error(`Failed to verify branch: ${branchError.message || 'Unknown error'}`);
      }

      if (validBranchId) {
        // Set branch_id for branch filtering (REQUIRED for branch isolation)
        dbCustomer.branch_id = validBranchId;
        dbCustomer.created_by_branch_id = validBranchId;
        if (branchName) {
          dbCustomer.created_by_branch_name = branchName;
        }
        // Mark as branch-specific (not shared)
        dbCustomer.is_shared = false;
      }
      // console.log removed');
      


    } else {
      console.warn('⚠️  No current branch ID found!');
      console.warn('⚠️  Customer will be created WITHOUT branch assignment');
      console.warn('⚠️  This customer will NOT appear in branch-filtered views');
      console.warn('💡 Tip: Make sure a branch is selected before creating customers');
    }
    

    
    // Normalize color tag
    if (dbCustomer.color_tag) {
      const originalTag = dbCustomer.color_tag;
      dbCustomer.color_tag = normalizeColorTag(dbCustomer.color_tag);

    }
    
    // Ensure phone is unique and valid
    if (!dbCustomer.phone || dbCustomer.phone.trim() === '') {
      const generatedPhone = `NO_PHONE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.warn(`⚠️  No phone provided, generating: ${generatedPhone}`);
      dbCustomer.phone = generatedPhone;
    }
    


    // console.log removed');

    // console.log removed:');


    // console.log removed');
    // console.log removed');


    // console.log removed');

    // console.log removed:');
    // console.log removed);


    
    const { data, error } = await checkSupabase()
      .from('customers')
      .insert([dbCustomer])
      .select()
      .single();
    
    if (error) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ DATABASE INSERT FAILED');
      console.error('═══════════════════════════════════════════════════════');
      console.error('Supabase Error Details:');
      console.error('  Error Message:', error.message);
      console.error('  Error Code:', error.code);
      console.error('  Error Details:', error.details);
      console.error('  Error Hint:', error.hint);
      console.error('Full Error Object:', error);
      console.error('═══════════════════════════════════════════════════════');
      console.error('Database object that failed to insert:', dbCustomer);
      console.error('═══════════════════════════════════════════════════════');
      throw error;
    }


    // console.log removed:');


    // console.log removed');
    // console.log removed');

    
    if (!data?.branch_id) {
      console.error('🚨 CRITICAL WARNING 🚨');
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ Customer was created WITHOUT branch_id in database!');
      console.error('❌ This customer will NOT appear in branch-filtered queries!');
      console.error('❌ User will NOT see this customer in their customer list!');
      console.error('═══════════════════════════════════════════════════════');
      console.error('Possible causes:');
      console.error('  1. No branch selected (check localStorage.current_branch_id)');
      console.error('  2. Database column "branch_id" missing in customers table');
      console.error('  3. Database permissions preventing branch_id insert');
      console.error('═══════════════════════════════════════════════════════');
    } else {


    }
    


    // console.log removed);


    return data;
    
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ customerApi.addCustomerToDb: EXCEPTION CAUGHT');
    console.error('═══════════════════════════════════════════════════════');
    console.error('Exception Type:', error?.constructor?.name || 'Unknown');
    console.error('Exception Message:', error?.message || 'No message');
    console.error('Exception Code:', error?.code || 'No code');
    console.error('Is Supabase Error:', error?.code ? 'Yes' : 'No');
    console.error('Full Exception:', error);
    console.error('Stack Trace:', error?.stack || 'No stack trace');
    console.error('═══════════════════════════════════════════════════════');
    throw error;
  }
}

export async function updateCustomerInDb(customerId: string, updates: Partial<Customer>) {
  try {

    // Map camelCase fields to snake_case database fields
    // Only include fields that actually exist in the database schema
    const fieldMapping: Record<string, string> = {
      colorTag: 'color_tag',
      isActive: 'is_active',
      isShared: 'is_shared',
      lastVisit: 'last_visit',
      joinedDate: 'joined_date',
      loyaltyLevel: 'loyalty_level',
      totalSpent: 'total_spent',
      referralSource: 'referral_source',
      birthMonth: 'birth_month',
      birthDay: 'birth_day',
      totalReturns: 'total_returns',
      initialNotes: 'initial_notes',
      locationDescription: 'location_description',
      nationalId: 'national_id',
      customerTag: 'customer_tag',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      createdBy: 'created_by',
      whatsapp: 'whatsapp',
      branchId: 'branch_id',
      createdByBranchId: 'created_by_branch_id',
      createdByBranchName: 'created_by_branch_name'
    };
    
    // Filter out undefined values and map field names
    const cleanUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const dbFieldName = fieldMapping[key] || key;
        cleanUpdates[dbFieldName] = value;
      }
    });
    
    // Add updated_at timestamp
    cleanUpdates.updated_at = new Date().toISOString();
    
    // Handle colorTag normalization (now mapped to color_tag)
    if (cleanUpdates.color_tag) {
      cleanUpdates.color_tag = normalizeColorTag(cleanUpdates.color_tag);
    }
    
    // Ensure phone is unique and valid for updates
    if (cleanUpdates.phone !== undefined) {
      if (!cleanUpdates.phone || cleanUpdates.phone.trim() === '') {
        // Generate a unique phone number for customers without phones
        cleanUpdates.phone = `NO_PHONE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    }

    // Validate that we're not trying to update invalid fields
    // Only include fields that actually exist in the database schema
    const validFields = [
      'id', 'name', 'email', 'phone', 'gender', 'city', 'address',
      'joined_date', 'loyalty_level', 'color_tag', 'total_spent', 'points', 
      'last_visit', 'is_active', 'referral_source', 'birth_month', 'birth_day', 
      'total_returns', 'initial_notes', 'notes', 'customer_tag',
      'location_description', 'national_id', 'created_at', 'updated_at',
      'branch_id', 'is_shared', 'created_by_branch_id', 'created_by_branch_name', 'whatsapp'
    ];
    
    // Filter out any invalid fields and handle data type conversions
    const validatedUpdates: any = {};
    const invalidFields: string[] = [];
    
    Object.entries(cleanUpdates).forEach(([key, value]) => {
      if (validFields.includes(key)) {
        // Handle special data type conversions
        if (key === 'notes' && Array.isArray(value)) {
          // Convert CustomerNote[] to string for database storage
          validatedUpdates[key] = JSON.stringify(value);
        } else if (key === 'points' && typeof value === 'string') {
          // Convert string points to number
          validatedUpdates[key] = parseInt(value, 10) || 0;
        } else if (key === 'total_spent' && typeof value === 'string') {
          // Convert string total_spent to number
          validatedUpdates[key] = parseFloat(value) || 0;
        } else if (key === 'total_returns' && typeof value === 'string') {
          // Convert string total_returns to number
          validatedUpdates[key] = parseInt(value, 10) || 0;
        } else if (key === 'is_active' && typeof value === 'string') {
          // Convert string boolean to actual boolean
          validatedUpdates[key] = value === 'true' || value === '1';
        } else {
          validatedUpdates[key] = value;
        }
      } else {
        invalidFields.push(key);
        console.warn(`⚠️ Skipping invalid field: ${key} (not in database schema)`);
      }
    });
    
    if (invalidFields.length > 0) {
      console.warn(`⚠️ Filtered out ${invalidFields.length} invalid fields:`, invalidFields);
    }
    


    const { data, error } = await checkSupabase()
      .from('lats_customers')
      .update(validatedUpdates)
      .eq('id', customerId as any)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error updating customer:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      console.error('❌ Update data that caused error:', validatedUpdates);
      throw error;
    }

    // Track customer activity when they are updated
    try {
      await trackCustomerActivity(customerId, 'profile_updated');
    } catch (activityError) {

      // Don't throw here as the main update was successful
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Error updating customer:', error);
    throw error;
  }
}

// Alias for backward compatibility
export const createCustomer = addCustomerToDb;

// Function to clear request cache (useful for debugging or forcing fresh requests)
export function clearRequestCache() {
  requestCache.clear();

}

// Function to get request cache stats
export function getRequestCacheStats() {
  return {
    size: requestCache.size,
    keys: Array.from(requestCache.keys())
  };
}
