import { supabase } from '../supabaseClient';

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

// Search cache for performance optimization
const searchCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function searchCustomers(query: string, page: number = 1, pageSize: number = 50) {
  try {
    console.log(`🔍 Searching customers: "${query}" (page ${page})`);
    
    // Try the RPC function first, but have a fallback
    let searchResults: any[] | null = null;
    let searchError: any = null;
    
    try {
      const { data, error } = await supabase
        .rpc('search_customers_fn', {
          search_query: query,
          page_number: page,
          page_size: pageSize
        });
      searchResults = data;
      searchError = error;
    } catch (rpcError) {
      console.warn('⚠️ RPC function not available, using fallback search');
      searchError = rpcError;
    }
    
    // If RPC failed, use direct table query as fallback
    if (searchError || !searchResults) {
      console.log('📋 Using fallback search method');
      const offset = (page - 1) * pageSize;
      
      // Build the search query
      const searchPattern = `%${query}%`;
      
      const countResult = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .or(`name.ilike.${searchPattern},phone.ilike.${searchPattern},email.ilike.${searchPattern},city.ilike.${searchPattern}`);
      
      const totalCount = countResult.count || 0;
      
      const dataResult = await supabase
        .from('customers')
        .select('id')
        .or(`name.ilike.${searchPattern},phone.ilike.${searchPattern},email.ilike.${searchPattern},city.ilike.${searchPattern}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      const { data: directResults, error: directError } = dataResult;
      
      if (directError) {
        console.error('❌ Error in fallback search:', directError);
        throw directError;
      }
      
      // Transform to match RPC format
      searchResults = directResults?.map((r: any) => ({ ...r, total_count: totalCount })) || [];
    }
    
    // Get the total count from the first result
    const count = searchResults && searchResults.length > 0 ? searchResults[0].total_count : 0;
    
    // Extract the customer IDs
    const customerIds = searchResults?.map(r => r.id) || [];
    
    if (customerIds.length === 0) {
      return {
        customers: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }
    
    // Fetch full customer details for the search results
    const customerQuery = await supabase
      .from('customers')
      .select(`
        id,
        name,
        phone,
        email,
        gender,
        city,
        color_tag,
        loyalty_level,
        points,
        total_spent,
        last_visit,
        is_active,
        referral_source,
        birth_month,
        birth_day,
        initial_notes,
        notes,
        customer_tag,
        location_description,
        national_id,
        joined_date,
        total_returns,
        created_at,
        updated_at
      `)
      .in('id', customerIds);
    
    const { data, error } = customerQuery;
    
    if (error) {
      console.error('❌ Error fetching customer details:', error);
      throw error;
    }
    
    if (data) {
      // Process and normalize the data
      const processedCustomers = data.map((customer: any) => {
        // Map snake_case database fields to camelCase interface fields
        const mappedCustomer = {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
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
          totalReturns: 0, // Field doesn't exist in database
          profileImage: null, // Field doesn't exist in database
          whatsapp: customer.whatsapp,
          whatsappOptOut: customer.whatsapp_opt_out || false,
          initialNotes: customer.initial_notes,
          notes: customer.notes ? (typeof customer.notes === 'string' ? 
            (() => {
              try { return JSON.parse(customer.notes); } 
              catch { return []; }
            })() : customer.notes) : [],
          referrals: customer.referrals ? (typeof customer.referrals === 'string' ? 
            (() => {
              try { return JSON.parse(customer.referrals); } 
              catch { return []; }
            })() : customer.referrals) : [],
          customerTag: customer.customer_tag,
          joinedDate: customer.created_at,
          createdAt: customer.created_at,
          updatedAt: customer.updated_at,
          createdBy: customer.created_by,
          lastPurchaseDate: customer.last_purchase_date,
          totalPurchases: customer.total_purchases || 0,
          birthday: customer.birthday,
          referredBy: customer.referred_by,
          // Call analytics fields
          totalCalls: customer.total_calls || 0,
          totalCallDurationMinutes: customer.total_call_duration_minutes || 0,
          incomingCalls: customer.incoming_calls || 0,
          outgoingCalls: customer.outgoing_calls || 0,
          missedCalls: customer.missed_calls || 0,
          avgCallDurationMinutes: customer.avg_call_duration_minutes || 0,
          firstCallDate: customer.first_call_date || '',
          lastCallDate: customer.last_call_date || '',
          callLoyaltyLevel: customer.call_loyalty_level || 'Basic',
          // Additional fields for interface compatibility
          customerNotes: [],
          customerPayments: [],
          devices: [],
          promoHistory: []
        };
        return mappedCustomer;
      });
      
      console.log(`✅ Search completed: ${processedCustomers.length} results`);
      return {
        customers: processedCustomers,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }
    
    return {
      customers: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
    
  } catch (error) {
    console.error('❌ Error searching customers:', error);
    throw error;
  }
}

export async function searchCustomersFast(query: string, page: number = 1, pageSize: number = 50) {
  try {
    console.log(`🔍 Fast search customers: "${query}" (page ${page})`);
    
    // Check cache first
    const cacheKey = `search_${query}_${page}_${pageSize}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📦 Returning cached search results');
      return cached.data;
    }
    
    // Try the RPC function first, with fallback
    let data: any[] | null = null;
    let error: any = null;
    
    try {
      const result = await supabase
        .rpc('search_customers_fn', {
          search_query: query,
          page_number: page,
          page_size: pageSize
        });
      data = result.data;
      error = result.error;
    } catch (rpcError) {
      console.warn('⚠️ RPC function not available, using fallback');
      error = rpcError;
    }
    
    // If RPC failed, use direct table query as fallback
    if (error || !data) {
      console.log('📋 Using fallback fast search');
      const offset = (page - 1) * pageSize;
      const searchPattern = `%${query}%`;
      
      const countResult = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .or(`name.ilike.${searchPattern},phone.ilike.${searchPattern},email.ilike.${searchPattern},city.ilike.${searchPattern}`);
      
      const totalCount = countResult.count || 0;
      
      const dataResult = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.${searchPattern},phone.ilike.${searchPattern},email.ilike.${searchPattern},city.ilike.${searchPattern}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      const { data: directResults, error: directError } = dataResult;
      
      if (directError) {
        console.error('❌ Error in fallback fast search:', directError);
        throw directError;
      }
      
      // Transform to match RPC format
      data = directResults?.map((r: any) => ({ ...r, total_count: totalCount })) || [];
    }
    
    // Extract count from the first row (if exists)
    const count = data && data.length > 0 ? data[0].total_count : 0;
    
    if (data) {
      // Process and normalize the data
      const processedCustomers = data.map((customer: any) => ({
        ...customer,
        colorTag: normalizeColorTag(customer.color_tag || 'new')
      }));
      
      const result = {
        customers: processedCustomers,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
      
      // Cache the result
      searchCache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      console.log(`✅ Fast search completed: ${processedCustomers.length} results`);
      return result;
    }
    
    const emptyResult = {
      customers: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
    
    return emptyResult;
    
  } catch (error) {
    console.error('❌ Error in fast search:', error);
    throw error;
  }
}

export function clearSearchCache() {
  searchCache.clear();
  console.log('🧹 Search cache cleared');
}

export function getSearchCacheStats() {
  return {
    size: searchCache.size,
    entries: Array.from(searchCache.keys())
  };
}

// Background search manager
class BackgroundSearchManager {
  private searchQueue: Array<{ query: string; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private isProcessing = false;
  private results = new Map<string, any[]>();
  public activeJobs = new Map<string, { query: string; resolve: (value: any) => void; reject: (error: any) => void }>();

  async search(query: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.searchQueue.push({ query, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.searchQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.searchQueue.length > 0) {
      const { query, resolve, reject } = this.searchQueue.shift()!;
      
      // Generate a job ID for this search
      const jobId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.activeJobs.set(jobId, { query, resolve, reject });
      
      try {
        // Check if we already have results for this query
        if (this.results.has(query)) {
          resolve(this.results.get(query)!);
          this.activeJobs.delete(jobId);
          continue;
        }
        
        // Perform the search
        const result = await searchCustomersFast(query, 1, 100);
        this.results.set(query, result.customers);
        resolve(result.customers);
        this.activeJobs.delete(jobId);
        
      } catch (error) {
        reject(error);
        this.activeJobs.delete(jobId);
      }
    }
    
    this.isProcessing = false;
  }

  cancelSearchJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job) {
      // Resolve with a cancellation indicator instead of rejecting
      job.resolve({ cancelled: true, customers: [], totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
      this.activeJobs.delete(jobId);
      console.log(`🚫 Cancelled search job: ${jobId}`);
      return true;
    }
    return false;
  }

  clearResults() {
    this.results.clear();
    // Cancel all active jobs
    for (const [jobId, job] of this.activeJobs) {
      job.reject(new Error('Search manager cleared'));
    }
    this.activeJobs.clear();
  }
}

export const backgroundSearchManager = new BackgroundSearchManager();

export async function searchCustomersBackground(
  query: string,
  page: number = 1,
  pageSize: number = 50,
  onStatus?: (status: string) => void,
  onComplete?: (result: any) => void,
  onError?: (error: string) => void
): Promise<string> {
  try {
    console.log(`🔄 Starting background search for: "${query}"`);
    
    // Create a job ID
    const jobId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store the job in the background search manager for cancellation
    const jobPromise = new Promise<any>((resolve, reject) => {
      // Store the job in the manager's active jobs
      backgroundSearchManager.activeJobs.set(jobId, { 
        query, 
        resolve: (result) => {
          // Transform the result to match what CustomersPage expects
          const transformedResult = {
            customers: result.customers || result,
            totalCount: result.total || (Array.isArray(result) ? result.length : 0),
            totalPages: result.totalPages || Math.ceil((result.total || (Array.isArray(result) ? result.length : 0)) / pageSize),
            hasNextPage: page < (result.totalPages || Math.ceil((result.total || (Array.isArray(result) ? result.length : 0)) / pageSize)),
            hasPreviousPage: page > 1
          };
          resolve(transformedResult);
        }, 
        reject 
      });
    });
    
    // Start the search in the background
    setTimeout(async () => {
      try {
        onStatus?.('processing');
        
        // Use the regular search function with pagination
        const result = await searchCustomers(query, page, pageSize);
        
        // Get the job and resolve it
        const job = backgroundSearchManager.activeJobs.get(jobId);
        if (job) {
          // Transform the result to match what CustomersPage expects
          const transformedResult = {
            customers: result.customers,
            totalCount: result.total,
            totalPages: result.totalPages,
            hasNextPage: page < result.totalPages,
            hasPreviousPage: page > 1
          };
          job.resolve(transformedResult);
          backgroundSearchManager.activeJobs.delete(jobId);
          
          onStatus?.('completed');
          onComplete?.(transformedResult);
        }
        
        console.log(`✅ Background search completed for: "${query}"`);
        
      } catch (error) {
        console.error('❌ Background search failed:', error);
        const job = backgroundSearchManager.activeJobs.get(jobId);
        if (job) {
          job.reject(error);
          backgroundSearchManager.activeJobs.delete(jobId);
        }
        onError?.(error instanceof Error ? error.message : 'Search failed');
      }
    }, 100);
    
    return jobId;
    
  } catch (error) {
    console.error('❌ Error starting background search:', error);
    throw error;
  }
}

export function getBackgroundSearchManager() {
  return backgroundSearchManager;
}

