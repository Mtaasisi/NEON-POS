// Neon Database Client Implementation
import { neon, neonConfig } from '@neondatabase/serverless';

// Configure Neon BEFORE creating the client
neonConfig.fetchConnectionCache = true;
// ✅ Properly suppress browser warnings (we understand the security implications)
neonConfig.disableWarningInBrowsers = true;

// Database URL - Using the correct connection string
const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('✅ Neon client initializing with URL:', DATABASE_URL.substring(0, 50) + '...');

// Create Neon SQL client with full results
const sql = neon(DATABASE_URL, {
  fetchOptions: {
    cache: 'no-store',
  },
  fullResults: true,
});

console.log('✅ Neon SQL client created successfully');

// Helper function to execute SQL queries with the Neon serverless client
const executeSql = async (query: string, params: any[] = [], suppressLogs: boolean = false): Promise<any> => {
  // Only log queries when suppressLogs is false (reduced noise)
  if (!suppressLogs && process.env.NODE_ENV === 'development') {
    console.log('🔍 [SQL]', query.substring(0, 100) + '...');
  }
  
  try {
    // Use the neon sql function directly with template literal
    const parts = [query];
    const templateParts: TemplateStringsArray = Object.assign(parts, { raw: [query] });
    
    // Execute the query
    const result = await sql(templateParts as any, ...params);
    
    // Reduced logging - only in dev mode and when not suppressed
    if (!suppressLogs && process.env.NODE_ENV === 'development') {
      console.log('✅ [SQL OK]', Array.isArray(result) ? `${result.length} rows` : 'Success');
    }
    
    // Neon returns an array of rows by default
    return result;
  } catch (error: any) {
    // Only log significant errors, not every failure
    if (!suppressLogs) {
      console.error('❌ SQL Error:', error.message);
      // Only show details for unexpected errors
      if (error.code && error.code !== '42703' && error.code !== '42P01') {
        console.error('Code:', error.code, '| Query:', query.substring(0, 100));
      }
    }
    
    // Throw error to be handled by caller
    throw error;
  }
};

// Query builder implementation for Neon
class NeonQueryBuilder {
  private tableName: string;
  private selectFields: string = '*';
  private whereConditions: string[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private rangeClause: { from: number; to: number } | null = null;
  private suppressErrors: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = '*') {
    // Strip out PostgREST relationship syntax (e.g., "devices(brand, model)")
    // which is not supported in raw SQL
    if (fields.includes('(') && fields.includes(')')) {
      console.warn('⚠️ Stripping PostgREST relationship syntax from select:', fields.substring(0, 100));
      
      // Remove all relationship patterns with nested parentheses support
      // Use a recursive approach to handle nested relationships properly
      let previousFields = '';
      while (previousFields !== fields) {
        previousFields = fields;
        // Remove innermost relationship patterns first
        fields = fields.replace(/,?\s*(\w+\s*:)?\s*\w+\s*\([^()]*\)/gs, '');
      }
      
      // Clean up any double commas, leading/trailing commas, and extra whitespace
      fields = fields
        .replace(/,\s*,/g, ',')  // Remove double commas
        .replace(/,\s*$/,'')     // Remove trailing commas
        .replace(/^\s*,/, '')     // Remove leading commas
        .replace(/^\s*\)\s*$/, '*')  // If only closing paren left, use *
        .trim();
      
      // If empty or invalid after cleanup, default to *
      if (!fields || fields === ',' || fields === ')' || fields.length === 0) fields = '*';
    }
    this.selectFields = fields;
    return this;
  }

  eq(column: string, value: any) {
    this.whereConditions.push(`${column} = ${this.formatValue(value)}`);
    return this;
  }

  neq(column: string, value: any) {
    this.whereConditions.push(`${column} != ${this.formatValue(value)}`);
    return this;
  }

  gt(column: string, value: any) {
    this.whereConditions.push(`${column} > ${this.formatValue(value)}`);
    return this;
  }

  gte(column: string, value: any) {
    this.whereConditions.push(`${column} >= ${this.formatValue(value)}`);
    return this;
  }

  lt(column: string, value: any) {
    this.whereConditions.push(`${column} < ${this.formatValue(value)}`);
    return this;
  }

  lte(column: string, value: any) {
    this.whereConditions.push(`${column} <= ${this.formatValue(value)}`);
    return this;
  }

  like(column: string, pattern: string) {
    this.whereConditions.push(`${column} LIKE ${this.formatValue(pattern)}`);
    return this;
  }

  ilike(column: string, pattern: string) {
    this.whereConditions.push(`${column} ILIKE ${this.formatValue(pattern)}`);
    return this;
  }

  is(column: string, value: any) {
    if (value === null) {
      this.whereConditions.push(`${column} IS NULL`);
    } else {
      this.whereConditions.push(`${column} = ${this.formatValue(value)}`);
    }
    return this;
  }

  in(column: string, values: any[]) {
    const formattedValues = values.map(v => this.formatValue(v)).join(', ');
    this.whereConditions.push(`${column} IN (${formattedValues})`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? 'DESC' : 'ASC';
    this.orderByClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(count: number) {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  range(from: number, to: number) {
    this.rangeClause = { from, to };
    return this;
  }

  single() {
    this.limitClause = 'LIMIT 1';
    return this.then((result: any) => {
      if (result.data && result.data.length > 0) {
        return { data: result.data[0], error: null };
      }
      return { data: null, error: null };
    });
  }

  maybeSingle() {
    return this.single();
  }

  private formatValue(value: any): string {
    if (value === null) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return `'${value.toISOString()}'`;
    // Handle arrays and objects (for JSONB columns)
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }
    return String(value);
  }

  private buildQuery(): string {
    let query = `SELECT ${this.selectFields} FROM ${this.tableName}`;
    
    if (this.whereConditions.length > 0) {
      query += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.orderByClause) {
      query += ` ${this.orderByClause}`;
    }
    
    if (this.rangeClause) {
      const offset = this.rangeClause.from;
      const limit = this.rangeClause.to - this.rangeClause.from + 1;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    } else if (this.limitClause) {
      query += ` ${this.limitClause}`;
    }
    
    return query;
  }

  async then(resolve?: any, reject?: any) {
    let query: string;
    
    // Check if this is an INSERT operation
    if ((this as any).isInsert) {
      const values = (this as any).insertData;
      
      // Handle array of objects (bulk insert)
      if (Array.isArray(values)) {
        if (values.length === 0) {
          const result = { data: [], error: null };
          return resolve ? resolve(result) : result;
        }
        
        // Get columns from the first object
        const columns = Object.keys(values[0]).join(', ');
        
        // Build VALUES clause for multiple rows
        const allPlaceholders = values.map(row => {
          const rowValues = Object.values(row).map(v => this.formatValue(v)).join(', ');
          return `(${rowValues})`;
        }).join(', ');
        
        query = `INSERT INTO ${this.tableName} (${columns}) VALUES ${allPlaceholders} RETURNING *`;
      } 
      // Handle single object insert
      else {
        const columns = Object.keys(values).join(', ');
        const placeholders = Object.values(values).map(v => this.formatValue(v)).join(', ');
        query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
      }
    } 
    // Check if this is an UPDATE operation
    else if ((this as any).isUpdate) {
      const values = (this as any).updateData;
      const setClauses = Object.entries(values)
        .map(([key, value]) => `${key} = ${this.formatValue(value)}`)
        .join(', ');
      
      query = `UPDATE ${this.tableName} SET ${setClauses}`;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }
      
      query += ' RETURNING *';
    } 
    // Regular SELECT query
    else {
      query = this.buildQuery();
    }
    
    try {
      // Execute using Neon serverless client with new API
      // Pass suppressErrors flag to reduce noise for expected errors
      const rawData = await executeSql(query, [], this.suppressErrors);
      
      // Extract rows from Neon fullResults format {fields, rows, command, ...}
      // Neon with fullResults: true returns an object, not an array
      let data: any;
      if (rawData && typeof rawData === 'object' && 'rows' in rawData) {
        data = rawData.rows; // Extract just the rows array
      } else if (Array.isArray(rawData)) {
        data = rawData; // Already an array
      } else {
        data = rawData; // Fallback
      }
      
      const result = { data, error: null };
      return resolve ? resolve(result) : result;
    } catch (error: any) {
      // Check if this is a table-not-found or expected error
      const isExpectedError = 
        error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.code === '42P01' ||
        error.message?.includes('column') ||
        error.code === '42703';
      
      // Minimal logging - only unexpected errors in development mode
      if (!this.suppressErrors && !isExpectedError && process.env.NODE_ENV === 'development') {
        console.error(`❌ Query failed on '${this.tableName}':`, error.message);
      }
      
      const result = { data: null, error: { message: error.message, code: error.code || '400' } };
      return reject ? reject(result) : result;
    }
  }

  catch(onRejected: any) {
    return this.then(undefined, onRejected);
  }

  // Insert method
  insert(values: any) {
    // Store the insert data and return this for chaining
    (this as any).insertData = values;
    (this as any).isInsert = true;
    return this;
  }

  // Update method
  update(values: any) {
    // Store the update data and return this for chaining
    (this as any).updateData = values;
    (this as any).isUpdate = true;
    return this;
  }

  // Delete method
  async delete() {
    try {
      let query = `DELETE FROM ${this.tableName}`;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }
      
      query += ' RETURNING *';
      // Execute using Neon serverless client with new API
      const rawData = await executeSql(query, [], this.suppressErrors);
      
      // Extract rows from Neon fullResults format
      let data: any;
      if (rawData && typeof rawData === 'object' && 'rows' in rawData) {
        data = rawData.rows;
      } else if (Array.isArray(rawData)) {
        data = rawData;
      } else {
        data = rawData;
      }
      
      return { data, error: null };
    } catch (error: any) {
      const isExpectedError = 
        error.message?.includes('does not exist') || 
        error.code === '42P01' ||
        error.message?.includes('column') ||
        error.code === '42703';
      
      if (!this.suppressErrors && !isExpectedError) {
        console.error(`❌ Delete failed on '${this.tableName}':`, error.message || error);
      }
      return { data: null, error: { message: error.message, code: error.code || '400' } };
    }
  }

  // Upsert method
  async upsert(values: any, options?: { onConflict?: string }) {
    try {
      const columns = Object.keys(values).join(', ');
      const placeholders = Object.values(values).map(v => this.formatValue(v)).join(', ');
      const updateClauses = Object.entries(values)
        .map(([key, value]) => `${key} = ${this.formatValue(value)}`)
        .join(', ');
      
      const conflictClause = options?.onConflict || Object.keys(values)[0];
      const query = `
        INSERT INTO ${this.tableName} (${columns}) 
        VALUES (${placeholders}) 
        ON CONFLICT (${conflictClause}) 
        DO UPDATE SET ${updateClauses}
        RETURNING *
      `;
      // Execute using Neon serverless client with new API
      const rawData = await executeSql(query, [], this.suppressErrors);
      
      // Extract rows from Neon fullResults format
      let data: any;
      if (rawData && typeof rawData === 'object' && 'rows' in rawData) {
        data = rawData.rows;
      } else if (Array.isArray(rawData)) {
        data = rawData;
      } else {
        data = rawData;
      }
      
      return { data, error: null };
    } catch (error: any) {
      const isExpectedError = 
        error.message?.includes('does not exist') || 
        error.code === '42P01' ||
        error.message?.includes('column') ||
        error.code === '42703';
      
      if (!this.suppressErrors && !isExpectedError) {
        console.error(`❌ Upsert failed on '${this.tableName}':`, error.message || error);
      }
      return { data: null, error: { message: error.message, code: error.code || '400' } };
    }
  }

  // Additional filter methods
  match(conditions: Record<string, any>) {
    Object.entries(conditions).forEach(([key, value]) => {
      this.eq(key, value);
    });
    return this;
  }

  not(column: string, operator: string, value: any) {
    this.whereConditions.push(`NOT (${column} ${operator} ${this.formatValue(value)})`);
    return this;
  }

  or(conditions: string) {
    this.whereConditions.push(`(${conditions})`);
    return this;
  }

  filter(column: string, operator: string, value: any) {
    this.whereConditions.push(`${column} ${operator} ${this.formatValue(value)}`);
    return this;
  }

  contains(column: string, value: any) {
    this.whereConditions.push(`${column} @> ${this.formatValue(value)}`);
    return this;
  }

  containedBy(column: string, value: any) {
    this.whereConditions.push(`${column} <@ ${this.formatValue(value)}`);
    return this;
  }

  rangeGt(column: string, value: any) {
    this.whereConditions.push(`${column} >> ${this.formatValue(value)}`);
    return this;
  }

  rangeGte(column: string, value: any) {
    this.whereConditions.push(`${column} >>= ${this.formatValue(value)}`);
    return this;
  }

  rangeLt(column: string, value: any) {
    this.whereConditions.push(`${column} << ${this.formatValue(value)}`);
    return this;
  }

  rangeLte(column: string, value: any) {
    this.whereConditions.push(`${column} <<= ${this.formatValue(value)}`);
    return this;
  }

  rangeAdjacent(column: string, value: any) {
    this.whereConditions.push(`${column} -|- ${this.formatValue(value)}`);
    return this;
  }

  overlaps(column: string, value: any) {
    this.whereConditions.push(`${column} && ${this.formatValue(value)}`);
    return this;
  }

  textSearch(column: string, query: string) {
    this.whereConditions.push(`to_tsvector(${column}) @@ plainto_tsquery(${this.formatValue(query)})`);
    return this;
  }

  csv() {
    // CSV export not directly supported, would need custom implementation
    return this;
  }
}

// Mock auth implementation with actual user authentication via database
const mockAuth = {
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    try {
      console.log('🔐 Attempting login with:', { email, password });
      
      // Query users table for authentication - using tagged template
      const rawResult = await sql`
        SELECT id, email, full_name, role, is_active, created_at, updated_at 
        FROM users 
        WHERE email = ${email}
        AND password = ${password}
        AND is_active = true
        LIMIT 1
      `;
      
      // Neon returns results directly as an array (with fullResults: true, but we extract rows)
      const result = Array.isArray(rawResult) ? rawResult : (rawResult?.rows || rawResult);
      
      console.log('🔍 Login query result:', { rawResult, result, length: result?.length });
      
      if (result && Array.isArray(result) && result.length > 0) {
        const user = result[0];
        // Store session in localStorage
        const session = {
          access_token: btoa(JSON.stringify({ userId: user.id, email: user.email })),
          refresh_token: btoa(JSON.stringify({ userId: user.id })),
          expires_at: Date.now() + 3600000, // 1 hour
          user: user
        };
        localStorage.setItem('supabase.auth.session', JSON.stringify(session));
        
        return { 
          data: { user, session }, 
          error: null 
        };
      }
      
      return { 
        data: { user: null, session: null }, 
        error: { message: 'Invalid login credentials' } 
      };
    } catch (error: any) {
      console.error('Auth error:', error);
      return { 
        data: { user: null, session: null }, 
        error: { message: error.message } 
      };
    }
  },
  signIn: async (credentials: any) => {
    return mockAuth.signInWithPassword(credentials);
  },
  signUp: async ({ email, password, options }: any) => {
    try {
      // Insert new user - using tagged template
      const metadata = options?.data || {};
      const fullName = metadata.full_name || '';
      const role = metadata.role || 'customer-care';
      
      const result = await sql`
        INSERT INTO users (email, password, full_name, role, is_active, created_at, updated_at)
        VALUES (
          ${email},
          ${password},
          ${fullName},
          ${role},
          true,
          NOW(),
          NOW()
        )
        RETURNING id, email, full_name, role, is_active, created_at, updated_at
      `;
      
      if (result && result.length > 0) {
        return { data: { user: result[0] }, error: null };
      }
      
      return { data: null, error: { message: 'Failed to create user' } };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { data: null, error: { message: error.message } };
    }
  },
  signOut: async () => {
    localStorage.removeItem('supabase.auth.session');
    return { error: null };
  },
  getSession: async () => {
    try {
      const sessionStr = localStorage.getItem('supabase.auth.session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        // Check if session is expired
        if (session.expires_at > Date.now()) {
          return { data: { session }, error: null };
        }
      }
      return { data: { session: null }, error: null };
    } catch (error) {
      return { data: { session: null }, error: null };
    }
  },
  getUser: async () => {
    try {
      const sessionStr = localStorage.getItem('supabase.auth.session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.expires_at > Date.now()) {
          return { data: { user: session.user }, error: null };
        }
      }
      return { data: { user: null }, error: null };
    } catch (error) {
      return { data: { user: null }, error: null };
    }
  },
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    // Initial session check
    mockAuth.getSession().then(({ data }) => {
      if (data.session) {
        callback('SIGNED_IN', data.session);
      } else {
        callback('SIGNED_OUT', null);
      }
    });
    
    return { 
      data: { 
        subscription: { 
          unsubscribe: () => {} 
        } 
      } 
    };
  },
  updateUser: async (attributes: any) => {
    try {
      const sessionStr = localStorage.getItem('supabase.auth.session');
      if (!sessionStr) {
        return { data: null, error: { message: 'Not authenticated' } };
      }
      
      const session = JSON.parse(sessionStr);
      const userId = session.user.id;
      
      const setClauses = Object.entries(attributes)
        .map(([key, value]) => {
          if (typeof value === 'string') return `${key} = '${value.replace(/'/g, "''")}'`;
          return `${key} = ${value}`;
        })
        .join(', ');
      
      const query = `
        UPDATE users 
        SET ${setClauses}, updated_at = NOW()
        WHERE id = '${userId}'
        RETURNING id, email, full_name, role, is_active, created_at, updated_at
      `;
      // Execute using Neon serverless client with new API
      const result = await executeSql(query);
      
      if (result && result.length > 0) {
        // Update session with new user data
        session.user = result[0];
        localStorage.setItem('supabase.auth.session', JSON.stringify(session));
        return { data: { user: result[0] }, error: null };
      }
      
      return { data: null, error: { message: 'Failed to update user' } };
    } catch (error: any) {
      console.error('Update user error:', error);
      return { data: null, error: { message: error.message } };
    }
  },
  setSession: async (session: any) => {
    if (session) {
      localStorage.setItem('supabase.auth.session', JSON.stringify(session));
    }
    return { data: { session }, error: null };
  },
  refreshSession: async () => {
    const { data } = await mockAuth.getSession();
    if (data.session) {
      // Extend session
      data.session.expires_at = Date.now() + 3600000;
      localStorage.setItem('supabase.auth.session', JSON.stringify(data.session));
      return { data, error: null };
    }
    return { data: { session: null, user: null }, error: { message: 'No session to refresh' } };
  },
};

// Mock storage implementation (you can enhance this later)
const mockStorage = {
  from: () => ({
    upload: () => Promise.resolve({ data: null, error: null }),
    download: () => Promise.resolve({ data: null, error: null }),
    list: () => Promise.resolve({ data: [], error: null }),
    remove: () => Promise.resolve({ data: null, error: null }),
    createSignedUrl: () => Promise.resolve({ data: null, error: null }),
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
  }),
};

// Mock channel implementation
const mockChannel = () => ({
  on: () => mockChannel(),
  subscribe: () => mockChannel(),
  unsubscribe: () => Promise.resolve(),
});

// RPC implementation for stored procedures
const rpcCall = async (fn: string, params?: any) => {
  try {
    const paramsList = params ? Object.entries(params).map(([key, value]) => {
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (value === null) return 'NULL';
      if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
      return String(value);
    }).join(', ') : '';
    
    const query = `SELECT * FROM ${fn}(${paramsList})`;
    // Execute using Neon serverless client with new API
    // Suppress logs for RPC calls as they're often optional/expected to fail
    const rawData = await executeSql(query, [], true);
    
    // Extract rows from Neon fullResults format
    let data: any;
    if (rawData && typeof rawData === 'object' && 'rows' in rawData) {
      data = rawData.rows;
    } else if (Array.isArray(rawData)) {
      data = rawData;
    } else {
      data = rawData;
    }
    
    return { data, error: null };
  } catch (error: any) {
    // Function not found is expected - don't log it
    return { data: null, error: { message: error.message, code: error.code || '400' } };
  }
};

// Supabase-compatible client interface
export interface SupabaseClient {
  from: (table: string) => NeonQueryBuilder;
  auth: any;
  storage: any;
  rpc: (fn: string, params?: any) => Promise<any>;
  channel: (name: string) => any;
}

// Create Neon-based Supabase client
export const supabase: SupabaseClient = {
  from: (table: string) => new NeonQueryBuilder(table),
  auth: mockAuth,
  storage: mockStorage,
  rpc: rpcCall,
  channel: mockChannel,
};

// Retry utility function with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error && typeof error === 'object') {
        const errorMessage = (error as any).message || '';
        // Don't retry on auth errors or client errors
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('403') ||
          errorMessage.includes('Invalid') ||
          errorMessage.includes('not found')
        ) {
          throw error;
        }
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay + jitter)}ms`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
  
  throw lastError;
}

// Test Supabase connection function
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Test database connection with a simple query
    const result = await sql`SELECT 1 as test`;
    
    if (result && result.length > 0) {
      return {
        success: true,
        message: 'Database connection successful',
        details: { connected: true }
      };
    }
    
    return {
      success: false,
      message: 'Database query returned no results',
      details: { connected: false }
    };
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    return {
      success: false,
      message: `Database connection failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

// Export for backward compatibility
export default supabase;

// Export raw SQL client for advanced queries
export { sql };

