/**
 * Local SQLite Database Service
 * Uses sql.js for browser-based SQLite database functionality
 */

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic;
let db: Database | null = null;
let isInitialized = false;

// Database file name for persistence
const DB_FILE_NAME = 'dukani-local.db';

// Initialize SQL.js
export async function initializeLocalDatabase(): Promise<void> {
  if (isInitialized) return;

  try {
    console.log('🗄️ Initializing local SQLite database...');

    // Initialize SQL.js
    SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });

    // Try to load existing database from localStorage
    const savedDbData = localStorage.getItem('dukani-db-data');
    if (savedDbData) {
      const dbArray = new Uint8Array(JSON.parse(savedDbData));
      db = new SQL.Database(dbArray);
      console.log('✅ Loaded existing database from localStorage');
    } else {
      // Create new database
      db = new SQL.Database();
      console.log('✅ Created new local database');

      // Initialize schema
      await initializeSchema();
    }

    isInitialized = true;
    console.log('✅ Local database initialized successfully');

  } catch (error) {
    console.error('❌ Failed to initialize local database:', error);
    throw error;
  }
}

// Save database to localStorage
export function saveDatabase(): void {
  if (!db) return;

  try {
    const data = db.export();
    const buffer = Array.from(data);
    localStorage.setItem('dukani-db-data', JSON.stringify(buffer));
    console.log('💾 Database saved to localStorage');
  } catch (error) {
    console.error('❌ Failed to save database:', error);
  }
}

// Initialize database schema
async function initializeSchema(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  // Disable foreign key constraints temporarily during schema setup
  db.exec('PRAGMA foreign_keys = OFF;');

  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      branch_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Store locations (branches)
    CREATE TABLE IF NOT EXISTS store_locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      data_isolation_mode TEXT DEFAULT 'shared',
      share_inventory BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS lats_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sku TEXT,
      category_id TEXT,
      brand_id TEXT,
      supplier_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Product variants
    CREATE TABLE IF NOT EXISTS lats_product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      name TEXT,
      sku TEXT,
      barcode TEXT,
      unit_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      quantity INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      is_parent BOOLEAN DEFAULT false,
      variant_type TEXT,
      parent_variant_id TEXT,
      branch_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES lats_products(id),
      FOREIGN KEY (branch_id) REFERENCES store_locations(id)
    );

    -- Categories
    CREATE TABLE IF NOT EXISTS lats_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      parent_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS lats_customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      branch_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES store_locations(id)
    );

    -- Sales
    CREATE TABLE IF NOT EXISTS lats_sales (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      total_amount REAL DEFAULT 0,
      payment_method TEXT,
      status TEXT DEFAULT 'completed',
      branch_id TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES lats_customers(id),
      FOREIGN KEY (branch_id) REFERENCES store_locations(id)
    );

    -- Sale items
    CREATE TABLE IF NOT EXISTS lats_sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES lats_sales(id),
      FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id)
    );

    -- Suppliers
    CREATE TABLE IF NOT EXISTS lats_suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Settings
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      type TEXT DEFAULT 'string',
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_products_category ON lats_products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_brand ON lats_products(brand_id);
    CREATE INDEX IF NOT EXISTS idx_variants_product ON lats_product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_variants_branch ON lats_product_variants(branch_id);
    CREATE INDEX IF NOT EXISTS idx_variants_sku ON lats_product_variants(sku);
    CREATE INDEX IF NOT EXISTS idx_variants_barcode ON lats_product_variants(barcode);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON lats_sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_branch ON lats_sales(branch_id);
    CREATE INDEX IF NOT EXISTS idx_sales_created_by ON lats_sales(created_by);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON lats_sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_variant ON lats_sale_items(variant_id);
    CREATE INDEX IF NOT EXISTS idx_customers_branch ON lats_customers(branch_id);
    CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
  `;

  // Execute schema creation
  const statements = schema.split(';').filter(stmt => stmt.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        db.exec(statement);
      } catch (error) {
        console.warn('Schema statement failed:', statement.trim(), error);
      }
    }
  }

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ Database schema initialized');
}

// Execute a query
export function executeQuery(sql: string, params: any[] = []): any[] {
  if (!db) {
    console.warn('⚠️ Database not initialized, cannot execute query:', sql);
    return [];
  }

  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
  } catch (error) {
    console.error('Query execution failed:', sql, error);
    return [];
  }
}

// Execute multiple queries in a transaction
export function executeTransaction(queries: Array<{ sql: string; params?: any[] }>): void {
  if (!db) {
    console.warn('⚠️ Database not initialized, cannot execute transaction');
    return;
  }

  try {
    console.log(`🔄 Starting transaction with ${queries.length} queries...`);
    db.exec('BEGIN TRANSACTION');

    let completedQueries = 0;
    for (const query of queries) {
      try {
        const stmt = db.prepare(query.sql);
        if (query.params && query.params.length > 0) {
          stmt.bind(query.params);
        }
        stmt.step();
        stmt.free();
        completedQueries++;
      } catch (queryError) {
        console.error(`❌ Query failed in transaction: ${query.sql}`, queryError);
        throw queryError;
      }
    }

    db.exec('COMMIT');
    console.log(`✅ Transaction completed: ${completedQueries} queries executed`);
  } catch (error) {
    console.error('❌ Transaction failed:', error);
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ Rollback also failed:', rollbackError);
    }
  }
}

// Get database instance (for advanced operations)
export function getDatabase(): Database | null {
  return db;
}

// Check if database is initialized
export function isDatabaseInitialized(): boolean {
  return isInitialized && db !== null;
}

// Close database
export function closeDatabase(): void {
  if (db) {
    saveDatabase(); // Save before closing
    db.close();
    db = null;
    isInitialized = false;
    console.log('🔌 Database closed');
  }
}

// Auto-save database periodically
let autoSaveInterval: number | null = null;
export function enableAutoSave(intervalMs: number = 30000): void {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }

  autoSaveInterval = window.setInterval(() => {
    saveDatabase();
  }, intervalMs);

  console.log(`⏰ Auto-save enabled (${intervalMs}ms interval)`);
}

export function disableAutoSave(): void {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
    console.log('⏰ Auto-save disabled');
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  // Browser environment - initialize when needed
  console.log('🗄️ Local database service loaded');
}
