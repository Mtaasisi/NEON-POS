/**
 * Local Database API
 * Provides API-compatible interface for local SQLite database operations
 */

import {
  initializeLocalDatabase,
  executeQuery,
  executeTransaction,
  saveDatabase,
  isDatabaseInitialized
} from './localDatabase';

// Types for API responses
export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  count?: number;
}

export interface QueryBuilder {
  from: (table: string) => QueryBuilder;
  select: (columns?: string) => QueryBuilder;
  insert: (data: any | any[]) => QueryBuilder;
  update: (data: any) => QueryBuilder;
  delete: () => QueryBuilder;
  where: (conditions: string, params?: any[]) => QueryBuilder;
  orderBy: (column: string, direction?: 'asc' | 'desc') => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  offset: (count: number) => QueryBuilder;
  execute: () => Promise<ApiResponse>;
  single: () => Promise<ApiResponse>;
}

// Generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Initialize database when API is used
async function ensureInitialized(): Promise<void> {
  if (!isDatabaseInitialized()) {
    await initializeLocalDatabase();
  }
}

// Query builder implementation
class LocalQueryBuilder implements QueryBuilder {
  private tableName: string = '';
  private selectColumns: string = '*';
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private insertData: any | any[] | null = null;
  private updateData: any | null = null;
  private whereClause: string = '';
  private whereParams: any[] = [];
  private orderByClause: string = '';
  private limitCount: number | null = null;
  private offsetCount: number | null = null;

  from(table: string): QueryBuilder {
    this.tableName = table;
    return this;
  }

  select(columns: string = '*'): QueryBuilder {
    this.selectColumns = columns;
    this.operation = 'select';
    return this;
  }

  insert(data: any | any[]): QueryBuilder {
    this.operation = 'insert';
    this.insertData = data;
    return this;
  }

  update(data: any): QueryBuilder {
    this.operation = 'update';
    this.updateData = data;
    return this;
  }

  delete(): QueryBuilder {
    this.operation = 'delete';
    return this;
  }

  where(conditions: string, params: any[] = []): QueryBuilder {
    this.whereClause = conditions;
    this.whereParams = params;
    return this;
  }

  orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): QueryBuilder {
    this.orderByClause = `ORDER BY ${column} ${direction.toUpperCase()}`;
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitCount = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetCount = count;
    return this;
  }

  async execute(): Promise<ApiResponse> {
    await ensureInitialized();

    try {
      let sql = '';
      let params: any[] = [];

      switch (this.operation) {
        case 'select':
          sql = `SELECT ${this.selectColumns} FROM ${this.tableName}`;
          if (this.whereClause) {
            sql += ` WHERE ${this.whereClause}`;
            params = params.concat(this.whereParams);
          }
          if (this.orderByClause) {
            sql += ` ${this.orderByClause}`;
          }
          if (this.limitCount !== null) {
            sql += ` LIMIT ${this.limitCount}`;
          }
          if (this.offsetCount !== null) {
            sql += ` OFFSET ${this.offsetCount}`;
          }
          break;

        case 'insert':
          if (Array.isArray(this.insertData)) {
            // Bulk insert
            const items = this.insertData;
            if (items.length === 0) return { data: [], error: null };

            const columns = Object.keys(items[0]);
            const placeholders = items.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
            sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES ${placeholders}`;

            params = items.flatMap(item =>
              columns.map(col => {
                if (col === 'id' && !item[col]) {
                  return generateUUID();
                }
                if (col === 'created_at' && !item[col]) {
                  return new Date().toISOString();
                }
                if (col === 'updated_at') {
                  return new Date().toISOString();
                }
                return item[col];
              })
            );
          } else {
            // Single insert
            const columns = Object.keys(this.insertData);
            const placeholders = columns.map(() => '?').join(', ');
            sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

            params = columns.map(col => {
              if (col === 'id' && !this.insertData[col]) {
                return generateUUID();
              }
              if (col === 'created_at' && !this.insertData[col]) {
                return new Date().toISOString();
              }
              if (col === 'updated_at') {
                return new Date().toISOString();
              }
              return this.insertData[col];
            });
          }
          break;

        case 'update':
          const updateColumns = Object.keys(this.updateData).filter(col => col !== 'id');
          const setClause = updateColumns.map(col => `${col} = ?`).join(', ');
          sql = `UPDATE ${this.tableName} SET ${setClause}, updated_at = ?`;

          params = updateColumns.map(col => this.updateData[col]);
          params.push(new Date().toISOString()); // updated_at

          if (this.whereClause) {
            sql += ` WHERE ${this.whereClause}`;
            params = params.concat(this.whereParams);
          }
          break;

        case 'delete':
          sql = `DELETE FROM ${this.tableName}`;
          if (this.whereClause) {
            sql += ` WHERE ${this.whereClause}`;
            params = params.concat(this.whereParams);
          }
          break;
      }

      const results = executeQuery(sql, params);

      // For SELECT operations, return the results
      if (this.operation === 'select') {
        return { data: results, error: null, count: results.length };
      }

      // For INSERT, return the inserted data
      if (this.operation === 'insert') {
        if (Array.isArray(this.insertData)) {
          return { data: this.insertData, error: null };
        } else {
          return { data: [this.insertData], error: null };
        }
      }

      // For UPDATE/DELETE, return success
      return { data: null, error: null };

    } catch (error: any) {
      console.error('Database operation failed:', error);
      return { data: null, error: error.message };
    }
  }

  async single(): Promise<ApiResponse> {
    const result = await this.execute();
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      return { data: result.data[0], error: null };
    }
    return { data: null, error: 'No data found' };
  }
}

// Create a query builder instance
export function createQueryBuilder(): QueryBuilder {
  return new LocalQueryBuilder();
}

// Helper functions to mimic Supabase API
export const localDb = {
  from: (table: string) => createQueryBuilder().from(table),

  // Direct query execution
  execute: async (sql: string, params: any[] = []) => {
    await ensureInitialized();
    return executeQuery(sql, params);
  },

  // Transaction support
  transaction: async (operations: Array<{ sql: string; params?: any[] }>) => {
    await ensureInitialized();
    executeTransaction(operations);
  },

  // Save database
  save: () => saveDatabase(),

  // Check if initialized
  isReady: () => isDatabaseInitialized(),

  // Initialize
  init: () => initializeLocalDatabase()
};

// Export default
export default localDb;
