// Neon Database Client Implementation
import { neon, neonConfig } from '@neondatabase/serverless';

// Configure Neon BEFORE creating the client
// Note: fetchConnectionCache is now always true by default (deprecated option removed)
// ✅ Properly suppress browser warnings (we understand the security implications)
neonConfig.disableWarningInBrowsers = true;

// Database URL - Load from environment variable (REQUIRED)
// Priority: VITE_DATABASE_URL (frontend accessible) > DATABASE_URL (fallback)
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL || import.meta.env.DATABASE_URL;

// Validate that DATABASE_URL is configured
if (!DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL is not configured!');
  console.error('Please set VITE_DATABASE_URL in your .env file');
  throw new Error('DATABASE_URL environment variable is required. Check your .env file.');
}

console.log('✅ Neon client initializing with URL:', DATABASE_URL.substring(0, 50) + '...');

// Create Neon SQL client with full results and enhanced error handling
const sql = neon(DATABASE_URL, {
  fetchOptions: {
    cache: 'no-store',
  },
  fullResults: true,
  // Add connection pooling configuration
  poolQueryViaFetch: true, // Use fetch for better connection pooling
});

console.log('✅ Neon SQL client created successfully');
console.log('ℹ️ Note: Transient 400 errors from Neon are automatically retried - no action needed');

// Helper function to execute SQL queries with the Neon serverless client
const executeSql = async (query: string, params: any[] = [], suppressLogs: boolean = false, retryCount: number = 0): Promise<any> => {
  const MAX_RETRIES = 2; // Retry up to 2 times for 400 errors
  const RETRY_DELAY = 100; // Wait 100ms before retry
  
  // Only log queries when suppressLogs is false (reduced noise)
  if (!suppressLogs && process.env.NODE_ENV === 'development' && retryCount === 0) {
    console.log('🔍 [SQL]', query.substring(0, 100) + '...');
  }
  
  try {
    // Properly construct template literal for Neon
    // Neon expects actual template literals, so we need to properly construct them
    const parts = [query];
    const raw = [query];
    const templateParts = Object.assign(parts, { raw }) as TemplateStringsArray;
    
    // Execute the query with proper error handling
    let result;
    
    if (params && params.length > 0) {
      // If we have params, use them (shouldn't happen often in current code)
      result = await sql(templateParts, ...params);
    } else {
      // No params - execute as-is
      result = await sql(templateParts);
    }
    
    // Reduced logging - only in dev mode and when not suppressed
    if (!suppressLogs && process.env.NODE_ENV === 'development') {
      if (retryCount > 0) {
        console.log(`✅ [SQL OK after ${retryCount} retries]`, Array.isArray(result) ? `${result.length} rows` : 'Success');
      } else {
        console.log('✅ [SQL OK]', Array.isArray(result) ? `${result.length} rows` : 'Success');
      }
    }
    
    // Neon returns an array of rows by default
    return result;
  } catch (error: any) {
    // Check if this is a transient 400 error that we should retry
    const is400Error = error.message?.includes('400') || error.status === 400 || error.statusCode === 400;
    const shouldRetry = is400Error && retryCount < MAX_RETRIES;
    
    if (shouldRetry) {
      // Retry after a short delay
      if (!suppressLogs && process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ 400 error on attempt ${retryCount + 1}, retrying...`);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return executeSql(query, params, suppressLogs, retryCount + 1);
    }
    
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
class NeonQueryBuilder implements PromiseLike<{ data: any; error: any; count?: number | null }> {
  private tableName: string;
  private selectFields: string = '*';
  private whereConditions: string[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private rangeClause: { from: number; to: number } | null = null;
  private suppressErrors: boolean = false;
  private countMode: 'exact' | 'planned' | 'estimated' | null = null;
  private headMode: boolean = false;
  private joins: Array<{ table: string; alias: string; on: string; columns: string[] }> = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    // Handle options for count and head mode
    if (options?.count) {
      this.countMode = options.count;
    }
    if (options?.head) {
      this.headMode = true;
    }
    
    // Parse PostgREST relationship syntax and convert to JOINs
    if (fields.includes('(') && fields.includes(')')) {
      console.log('🔗 Parsing PostgREST relationship syntax:', fields.substring(0, 150));
      
      // Helper function to find matching closing parenthesis
      const findMatchingParen = (str: string, startIdx: number): number => {
        let depth = 1;
        for (let i = startIdx + 1; i < str.length; i++) {
          if (str[i] === '(') depth++;
          else if (str[i] === ')') {
            depth--;
            if (depth === 0) return i;
          }
        }
        return -1;
      };
      
      // Extract base fields and relationships
      const relationships: Array<{ alias: string; table: string; foreignKey: string; columns: string[] }> = [];
      let remainingFields = fields;
      
      // Find all top-level relationships (handles nested parentheses)
      let i = 0;
      while (i < fields.length) {
        // Look for pattern: alias:table!foreign_key( or alias:table(
        const explicitMatch = fields.substring(i).match(/^(\w+):(\w+)!(\w+)\(/);
        const inferredMatch = !explicitMatch ? fields.substring(i).match(/^(\w+):(\w+)\(/) : null;
        
        if (explicitMatch) {
          const alias = explicitMatch[1];
          const table = explicitMatch[2];
          const foreignKey = explicitMatch[3];
          const openParenIdx = i + explicitMatch[0].length - 1;
          const closeParenIdx = findMatchingParen(fields, openParenIdx);
          
          if (closeParenIdx !== -1) {
            const columnsStr = fields.substring(openParenIdx + 1, closeParenIdx);
            // Extract only top-level column names (ignore nested relationships)
            const columns = columnsStr.split(',').map(c => c.trim()).filter(c => {
              // Only keep simple column names, skip nested relationships
              return !c.includes(':') && !c.includes('(');
            });
            
            relationships.push({ alias, table, foreignKey, columns });
            
            // Remove this relationship from remaining fields
            const fullMatch = fields.substring(i, closeParenIdx + 1);
            remainingFields = remainingFields.replace(fullMatch, '');
            
            i = closeParenIdx + 1;
            continue;
          }
        } else if (inferredMatch) {
          const alias = inferredMatch[1];
          const table = inferredMatch[2];
          const foreignKey = `${alias}_id`;
          const openParenIdx = i + inferredMatch[0].length - 1;
          const closeParenIdx = findMatchingParen(fields, openParenIdx);
          
          if (closeParenIdx !== -1) {
            const columnsStr = fields.substring(openParenIdx + 1, closeParenIdx);
            // Extract only top-level column names (ignore nested relationships)
            const columns = columnsStr.split(',').map(c => c.trim()).filter(c => {
              // Only keep simple column names, skip nested relationships
              return !c.includes(':') && !c.includes('(');
            });
            
            relationships.push({ alias, table, foreignKey, columns });
            
            // Remove this relationship from remaining fields
            const fullMatch = fields.substring(i, closeParenIdx + 1);
            remainingFields = remainingFields.replace(fullMatch, '');
            
            i = closeParenIdx + 1;
            continue;
          }
        }
        
        i++;
      }
      
      // Clean up remaining fields (non-relationship fields)
      remainingFields = remainingFields
        .replace(/,\s*,/g, ',')
        .replace(/,\s*$/,'')
        .replace(/^\s*,/, '')
        .trim();
      
      // Build JOIN clauses
      this.joins = relationships.map(rel => ({
        table: rel.table,
        alias: rel.alias,
        on: rel.foreignKey,
        columns: rel.columns.filter(c => c.length > 0) // Filter out empty strings
      }));
      
      // Build SELECT fields
      if (remainingFields && remainingFields !== '*' && remainingFields.length > 0) {
        // Prefix base table fields with table name
        const baseFieldsList = remainingFields.split(',').map(f => f.trim()).filter(f => f);
        this.selectFields = baseFieldsList.map(f => f === '*' ? `${this.tableName}.*` : `${this.tableName}.${f} as ${f}`).join(', ');
      } else {
        this.selectFields = `${this.tableName}.*`;
      }
      
      // Add relationship fields with JSON aggregation
      for (const join of this.joins) {
        if (join.columns.length > 0) {
          const jsonFields = join.columns.map(c => `'${c}', ${join.alias}.${c}`).join(', ');
          this.selectFields += `, json_build_object(${jsonFields}) as ${join.alias}`;
        } else {
          // If no columns specified, select all from joined table
          this.selectFields += `, row_to_json(${join.alias}.*) as ${join.alias}`;
        }
      }
      
      console.log('✅ Parsed JOINs:', this.joins);
      console.log('✅ Select fields:', this.selectFields);
    } else {
      this.selectFields = fields;
    }
    return this;
  }

  private qualifyColumn(column: string): string {
    // If we have joins and column is not already qualified, prefix with table name
    return (this.joins.length > 0 && !column.includes('.')) 
      ? `${this.tableName}.${column}` 
      : column;
  }

  eq(column: string, value: any) {
    this.whereConditions.push(`${this.qualifyColumn(column)} = ${this.formatValue(value)}`);
    return this;
  }

  neq(column: string, value: any) {
    this.whereConditions.push(`${this.qualifyColumn(column)} != ${this.formatValue(value)}`);
    return this;
  }

  gt(column: string, value: any) {
    this.whereConditions.push(`${this.qualifyColumn(column)} > ${this.formatValue(value)}`);
    return this;
  }

  gte(column: string, value: any) {
    this.whereConditions.push(`${this.qualifyColumn(column)} >= ${this.formatValue(value)}`);
    return this;
  }

  lt(column: string, value: any) {
    this.whereConditions.push(`${this.qualifyColumn(column)} < ${this.formatValue(value)}`);
    return this;
  }

  lte(column: string, value: any) {
    this.whereConditions.push(`${this.qualifyColumn(column)} <= ${this.formatValue(value)}`);
    return this;
  }

  like(column: string, pattern: string) {
    this.whereConditions.push(`${this.qualifyColumn(column)} LIKE ${this.formatValue(pattern)}`);
    return this;
  }

  ilike(column: string, pattern: string) {
    this.whereConditions.push(`${this.qualifyColumn(column)} ILIKE ${this.formatValue(pattern)}`);
    return this;
  }

  is(column: string, value: any) {
    if (value === null) {
      this.whereConditions.push(`${this.qualifyColumn(column)} IS NULL`);
    } else {
      this.whereConditions.push(`${this.qualifyColumn(column)} = ${this.formatValue(value)}`);
    }
    return this;
  }

  in(column: string, values: any[]) {
    const formattedValues = values.map(v => this.formatValue(v)).join(', ');
    this.whereConditions.push(`${this.qualifyColumn(column)} IN (${formattedValues})`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? 'DESC' : 'ASC';
    // If we have joins and column is not already qualified, prefix with table name
    const qualifiedColumn = (this.joins.length > 0 && !column.includes('.')) 
      ? `${this.tableName}.${column}` 
      : column;
    this.orderByClause = `ORDER BY ${qualifiedColumn} ${direction}`;
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
    // Handle arrays - format as PostgreSQL array for text[] columns
    if (Array.isArray(value)) {
      // Check if array contains strings - format as text array
      if (value.length === 0 || typeof value[0] === 'string') {
        const arrayValues = value.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(',');
        return `ARRAY[${value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]`;
      }
      // For non-string arrays or complex arrays, use jsonb
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }
    // Handle objects (for JSONB columns)
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }
    return String(value);
  }

  private buildQuery(): string {
    // If head mode with count, we only want the count, not the data
    if (this.headMode && this.countMode) {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }
      
      return query;
    }
    
    let query = `SELECT ${this.selectFields} FROM ${this.tableName}`;
    
    // Add JOIN clauses
    for (const join of this.joins) {
      query += ` LEFT JOIN ${join.table} AS ${join.alias} ON ${this.tableName}.${join.on} = ${join.alias}.id`;
    }
    
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
    
    // Debug log the generated query
    if (this.joins.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('📝 Generated SQL with JOINs:', query);
    }
    
    return query;
  }

  then<TResult1 = { data: any; error: any; count?: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2> {
    const promise = this.execute();
    return promise.then(onfulfilled as any, onrejected as any);
  }

  private async execute(): Promise<{ data: any; error: any; count?: number | null }> {
    let query: string;
    
    // Debug logging for INSERT operations
    const isInsertOp = (this as any).isInsert;
    if (isInsertOp && process.env.NODE_ENV === 'development') {
      console.log('🔍 [DEBUG] Executing INSERT operation');
    }
    
    // Check if this is an UPSERT operation
    if ((this as any).isUpsert) {
      const values = (this as any).upsertData;
      const options = (this as any).upsertOptions;
      
      // Handle array of objects (bulk upsert)
      if (Array.isArray(values)) {
        if (values.length === 0) {
          return { data: [], error: null };
        }
        
        // Get columns from the first object
        const columns = Object.keys(values[0]).join(', ');
        
        // Build VALUES clause for multiple rows
        const allPlaceholders = values.map(row => {
          const rowValues = Object.values(row).map(v => this.formatValue(v)).join(', ');
          return `(${rowValues})`;
        }).join(', ');
        
        // Determine conflict columns
        const conflictClause = options?.onConflict || Object.keys(values[0]).join(',');
        
        // Build update clause for conflict resolution
        const updateClauses = Object.keys(values[0])
          .map(key => `${key} = EXCLUDED.${key}`)
          .join(', ');
        
        query = `INSERT INTO ${this.tableName} (${columns}) VALUES ${allPlaceholders} ON CONFLICT (${conflictClause}) DO UPDATE SET ${updateClauses} RETURNING *`;
      } 
      // Handle single object upsert
      else {
        const columns = Object.keys(values).join(', ');
        const placeholders = Object.values(values).map(v => this.formatValue(v)).join(', ');
        
        // Determine conflict columns
        const conflictClause = options?.onConflict || Object.keys(values)[0];
        
        // Build update clause for conflict resolution
        const updateClauses = Object.entries(values)
          .map(([key, value]) => `${key} = ${this.formatValue(value)}`)
          .join(', ');
        
        query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) ON CONFLICT (${conflictClause}) DO UPDATE SET ${updateClauses} RETURNING *`;
      }
    }
    // Check if this is an INSERT operation
    else if ((this as any).isInsert) {
      const values = (this as any).insertData;
      
      // Handle array of objects (bulk insert)
      if (Array.isArray(values)) {
        if (values.length === 0) {
          return { data: [], error: null };
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
    // Check if this is a DELETE operation
    else if ((this as any).isDelete) {
      query = `DELETE FROM ${this.tableName}`;
      
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
      
      // Debug logging for INSERT operations
      if (isInsertOp && process.env.NODE_ENV === 'development') {
        console.log('🔍 [DEBUG] INSERT rawData type:', typeof rawData);
        console.log('🔍 [DEBUG] INSERT has rows property:', rawData && 'rows' in rawData);
        console.log('🔍 [DEBUG] INSERT extracted data:', data);
        console.log('🔍 [DEBUG] INSERT data length:', Array.isArray(data) ? data.length : 'not array');
      }
      
      // If this was a count query in head mode, extract the count
      let count: number | null = null;
      if (this.headMode && this.countMode && data && data.length > 0) {
        count = parseInt(data[0].count, 10);
        // In head mode, we don't return the data, just the count
        data = null;
      }
      
      return { data, error: null, count };
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
      
      return { data: null, error: { message: error.message, code: error.code || '400' }, count: null };
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
  delete() {
    // Store the delete flag and return this for chaining
    (this as any).isDelete = true;
    return this;
  }

  // Upsert method - supports chaining
  upsert(values: any, options?: { onConflict?: string }) {
    // Store the upsert data and options for execution in then()
    (this as any).upsertData = values;
    (this as any).upsertOptions = options;
    (this as any).isUpsert = true;
    return this;
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
    // Parse Supabase-style OR conditions: "column1.op.value1,column2.op.value2"
    // Split by comma to get individual conditions
    const parts = conditions.split(',');
    const sqlConditions = parts.map(part => {
      // Parse each part: "column.operator.value"
      const match = part.trim().match(/^(\w+)\.(eq|neq|gt|gte|lt|lte|like|ilike|is)\.(.+)$/);
      if (match) {
        const [, column, operator, value] = match;
        let sqlOp = '=';
        switch (operator) {
          case 'eq': sqlOp = '='; break;
          case 'neq': sqlOp = '!='; break;
          case 'gt': sqlOp = '>'; break;
          case 'gte': sqlOp = '>='; break;
          case 'lt': sqlOp = '<'; break;
          case 'lte': sqlOp = '<='; break;
          case 'like': sqlOp = 'LIKE'; break;
          case 'ilike': sqlOp = 'ILIKE'; break;
          case 'is': sqlOp = 'IS'; break;
        }
        return `${column} ${sqlOp} ${this.formatValue(value)}`;
      }
      // If it doesn't match the pattern, return as-is (fallback)
      return part.trim();
    });
    
    // Join with OR and wrap in parentheses
    this.whereConditions.push(`(${sqlConditions.join(' OR ')})`);
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

