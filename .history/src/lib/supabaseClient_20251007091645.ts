// Neon Database Client Implementation
import { neon, neonConfig } from '@neondatabase/serverless';

// Enable WebSocket for better performance (optional)
neonConfig.fetchConnectionCache = true;

// Get database URL from environment
const databaseUrl = import.meta.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.error('VITE_DATABASE_URL is not defined in environment variables');
}

// Create Neon SQL client
const sql = neon(databaseUrl || '');

// Query builder implementation for Neon
class NeonQueryBuilder {
  private tableName: string;
  private selectFields: string = '*';
  private whereConditions: string[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private rangeClause: { from: number; to: number } | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = '*') {
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
    try {
      const query = this.buildQuery();
      console.log('Executing query:', query);
      // Use Function constructor to create tagged template for dynamic query
      const data = await (new Function('sql', 'query', 'return sql`' + query + '`;'))(sql, query);
      const result = { data, error: null };
      return resolve ? resolve(result) : result;
    } catch (error: any) {
      console.error('Query error:', error);
      const result = { data: null, error: { message: error.message } };
      return reject ? reject(result) : result;
    }
  }

  catch(onRejected: any) {
    return this.then(undefined, onRejected);
  }

  // Insert method
  async insert(values: any) {
    try {
      const columns = Object.keys(values).join(', ');
      const placeholders = Object.values(values).map(v => this.formatValue(v)).join(', ');
      const query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
      console.log('Executing insert:', query);
      // Use Function constructor to create tagged template for dynamic query
      const data = await (new Function('sql', 'query', 'return sql`' + query + '`;'))(sql, query);
      return { data, error: null };
    } catch (error: any) {
      console.error('Insert error:', error);
      return { data: null, error: { message: error.message } };
    }
  }

  // Update method
  async update(values: any) {
    try {
      const setClauses = Object.entries(values)
        .map(([key, value]) => `${key} = ${this.formatValue(value)}`)
        .join(', ');
      
      let query = `UPDATE ${this.tableName} SET ${setClauses}`;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }
      
      query += ' RETURNING *';
      console.log('Executing update:', query);
      // Use Function constructor to create tagged template for dynamic query
      const data = await (new Function('sql', 'query', 'return sql`' + query + '`;'))(sql, query);
      return { data, error: null };
    } catch (error: any) {
      console.error('Update error:', error);
      return { data: null, error: { message: error.message } };
    }
  }

  // Delete method
  async delete() {
    try {
      let query = `DELETE FROM ${this.tableName}`;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }
      
      query += ' RETURNING *';
      console.log('Executing delete:', query);
      // Use Function constructor to create tagged template for dynamic query
      const data = await (new Function('sql', 'query', 'return sql`' + query + '`;'))(sql, query);
      return { data, error: null };
    } catch (error: any) {
      console.error('Delete error:', error);
      return { data: null, error: { message: error.message } };
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
      console.log('Executing upsert:', query);
      // Use Function constructor to create tagged template for dynamic query
      const data = await (new Function('sql', 'query', 'return sql`' + query + '`;'))(sql, query);
      return { data, error: null };
    } catch (error: any) {
      console.error('Upsert error:', error);
      return { data: null, error: { message: error.message } };
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
      // Query users table for authentication
      const query = `
        SELECT id, email, full_name, role, is_active, created_at, updated_at 
        FROM users 
        WHERE email = '${email.replace(/'/g, "''")}' 
        AND password = '${password.replace(/'/g, "''")}'
        AND is_active = true
        LIMIT 1
      `;
      const result = await sql(query);
      
      if (result && result.length > 0) {
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
      // Insert new user
      const metadata = options?.data || {};
      const query = `
        INSERT INTO users (email, password, full_name, role, is_active, created_at, updated_at)
        VALUES (
          '${email.replace(/'/g, "''")}',
          '${password.replace(/'/g, "''")}',
          '${(metadata.full_name || '').replace(/'/g, "''")}',
          '${(metadata.role || 'customer-care').replace(/'/g, "''")}',
          true,
          NOW(),
          NOW()
        )
        RETURNING id, email, full_name, role, is_active, created_at, updated_at
      `;
      const result = await sql(query);
      
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
      const result = await sql(query);
      
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
    console.log('Executing RPC:', query);
    const data = await sql(query);
    return { data, error: null };
  } catch (error: any) {
    console.error('RPC error:', error);
    return { data: null, error: { message: error.message } };
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

