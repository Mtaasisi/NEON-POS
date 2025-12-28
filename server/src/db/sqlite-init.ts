/**
 * SQLite Database Initialization for Backend
 * Converts MySQL schema to SQLite and initializes database
 */

import Database from 'better-sqlite3';

// SQLite schema (converted from MySQL)
const SQLITE_SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'staff',
  branch_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Store locations (branches)
CREATE TABLE IF NOT EXISTS store_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  data_isolation_mode TEXT DEFAULT 'isolated',
  share_inventory INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories
CREATE TABLE IF NOT EXISTS lats_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES lats_categories(id)
);

-- Suppliers
CREATE TABLE IF NOT EXISTS lats_suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS lats_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  barcode TEXT,
  category_id TEXT,
  supplier_id TEXT,
  unit_cost REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  selling_price REAL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES lats_categories(id),
  FOREIGN KEY (supplier_id) REFERENCES lats_suppliers(id)
);

-- Product variants
CREATE TABLE IF NOT EXISTS lats_product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  unit_price REAL DEFAULT 0,
  selling_price REAL DEFAULT 0,
  cost_price REAL DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  is_parent INTEGER DEFAULT 0,
  variant_type TEXT,
  parent_variant_id TEXT,
  branch_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES lats_products(id),
  FOREIGN KEY (parent_variant_id) REFERENCES lats_product_variants(id),
  FOREIGN KEY (branch_id) REFERENCES store_locations(id)
);

-- Customers
CREATE TABLE IF NOT EXISTS lats_customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  branch_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES store_locations(id)
);

-- Sales
CREATE TABLE IF NOT EXISTS lats_sales (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  branch_id TEXT,
  total_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  sale_status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES lats_customers(id),
  FOREIGN KEY (branch_id) REFERENCES store_locations(id)
);

-- Sale items
CREATE TABLE IF NOT EXISTS lats_sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT,
  variant_id TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES lats_sales(id),
  FOREIGN KEY (product_id) REFERENCES lats_products(id),
  FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id)
);

-- Stock movements
CREATE TABLE IF NOT EXISTS lats_stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  variant_id TEXT,
  branch_id TEXT,
  movement_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  reference_id TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES lats_products(id),
  FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id),
  FOREIGN KEY (branch_id) REFERENCES store_locations(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON lats_products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON lats_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON lats_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_branch ON lats_product_variants(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch ON lats_customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON lats_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON lats_sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON lats_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_product ON lats_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_branch ON lats_stock_movements(branch_id);
`;

// Sample data for testing
const SAMPLE_DATA = `
-- Sample branch
INSERT OR IGNORE INTO store_locations (id, name, address, data_isolation_mode, share_inventory) VALUES
('branch-1', 'Main Store', '123 Main St, City', 'shared', 1);

-- Sample categories
INSERT OR IGNORE INTO lats_categories (id, name, description) VALUES
('cat-1', 'Electronics', 'Electronic devices and accessories'),
('cat-2', 'Clothing', 'Clothing and fashion items'),
('cat-3', 'Food', 'Food and beverages');

-- Sample suppliers
INSERT OR IGNORE INTO lats_suppliers (id, name, contact_person, phone, email) VALUES
('sup-1', 'Tech Supplier Inc', 'John Doe', '+1234567890', 'john@techsupplier.com'),
('sup-2', 'Fashion Hub', 'Jane Smith', '+0987654321', 'jane@fashionhub.com');

-- Sample products
INSERT OR IGNORE INTO lats_products (id, name, description, sku, category_id, supplier_id, unit_cost, unit_price, selling_price, min_stock_level) VALUES
('prod-1', 'iPhone 15', 'Latest iPhone model', 'IPH15-128', 'cat-1', 'sup-1', 800.00, 900.00, 1000.00, 5),
('prod-2', 'Samsung Galaxy S24', 'Android flagship', 'SGS24-256', 'cat-1', 'sup-1', 700.00, 800.00, 950.00, 3),
('prod-3', 'T-Shirt', 'Cotton t-shirt', 'TSHIRT-M', 'cat-2', 'sup-2', 10.00, 15.00, 25.00, 10),
('prod-4', 'Jeans', 'Denim jeans', 'JEANS-32', 'cat-2', 'sup-2', 30.00, 40.00, 60.00, 8);

-- Sample product variants
INSERT OR IGNORE INTO lats_product_variants (id, product_id, name, sku, unit_price, selling_price, cost_price, quantity, variant_type, branch_id) VALUES
('var-1', 'prod-1', 'iPhone 15 128GB', 'IPH15-128-BLK', 900.00, 1000.00, 800.00, 10, 'storage', 'branch-1'),
('var-2', 'prod-2', 'Galaxy S24 256GB', 'SGS24-256-BLK', 800.00, 950.00, 700.00, 8, 'storage', 'branch-1'),
('var-3', 'prod-3', 'T-Shirt Medium Black', 'TSHIRT-M-BLK', 15.00, 25.00, 10.00, 20, 'size', 'branch-1'),
('var-4', 'prod-4', 'Jeans Size 32 Blue', 'JEANS-32-BLU', 40.00, 60.00, 30.00, 15, 'size', 'branch-1');

-- Sample customers
INSERT OR IGNORE INTO lats_customers (id, name, phone, email, branch_id) VALUES
('cust-1', 'Alice Johnson', '+1111111111', 'alice@example.com', 'branch-1'),
('cust-2', 'Bob Wilson', '+2222222222', 'bob@example.com', 'branch-1'),
('cust-3', 'Carol Brown', '+3333333333', 'carol@example.com', 'branch-1');

-- Sample sales
INSERT OR IGNORE INTO lats_sales (id, customer_id, branch_id, total_amount, payment_method, payment_status, sale_status) VALUES
('sale-1', 'cust-1', 'branch-1', 1000.00, 'cash', 'completed', 'completed'),
('sale-2', 'cust-2', 'branch-1', 60.00, 'card', 'completed', 'completed'),
('sale-3', 'cust-3', 'branch-1', 975.00, 'cash', 'completed', 'completed');

-- Sample sale items
INSERT OR IGNORE INTO lats_sale_items (id, sale_id, product_id, variant_id, quantity, unit_price, total_amount) VALUES
('item-1', 'sale-1', 'prod-1', 'var-1', 1, 1000.00, 1000.00),
('item-2', 'sale-2', 'prod-4', 'var-4', 1, 60.00, 60.00),
('item-3', 'sale-3', 'prod-2', 'var-2', 1, 950.00, 950.00);
`;

/**
 * Initialize SQLite database schema
 */
export function initializeSQLiteSchema(db: Database.Database): void {
  console.log('🏗️  Initializing SQLite schema...');

  try {
    // Execute schema creation
    db.exec(SQLITE_SCHEMA);
    console.log('✅ SQLite schema created successfully');
  } catch (error) {
    console.error('❌ Failed to create SQLite schema:', error);
    throw error;
  }
}

/**
 * Run database migrations
 */
export function runSQLiteMigrations(db: Database.Database): { version: number } {
  console.log('🔄 Running SQLite migrations...');

  try {
    // Create migrations table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check current migration version
    const result = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null };
    const currentVersion = result.version || 0;

    console.log(`📋 Current migration version: ${currentVersion}`);

    // Run migrations based on current version
    if (currentVersion < 1) {
      // Migration 1: Initial schema
      initializeSQLiteSchema(db);

      // Mark migration as executed
      db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(1, 'initial_schema');

      console.log('✅ Migration 1 (initial schema) completed');
    }

    return { version: 1 };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Initialize sample data
 */
export function initializeSQLiteSampleData(db: Database.Database): void {
  console.log('🌱 Initializing SQLite sample data...');

  try {
    // Execute sample data insertion
    db.exec(SAMPLE_DATA);
    console.log('✅ SQLite sample data initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize sample data:', error);
    throw error;
  }
}

/**
 * Initialize SQLite database completely
 */
export function initializeSQLiteDatabase(db: Database.Database): void {
  console.log('🚀 Initializing SQLite database...');

  try {
    // Run migrations
    const migrationResult = runSQLiteMigrations(db);

    // Initialize sample data
    initializeSQLiteSampleData(db);

    console.log(`✅ SQLite database initialized successfully (v${migrationResult.version})`);
  } catch (error) {
    console.error('❌ SQLite database initialization failed:', error);
    throw error;
  }
}

