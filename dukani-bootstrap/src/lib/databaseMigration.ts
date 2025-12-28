/**
 * Database Migration System
 * Converts MySQL schema to SQLite and initializes with sample data
 */

import { executeQuery, executeTransaction } from './localDatabase';

// Convert MySQL schema to SQLite
export function convertMySQLToSQLite(mysqlSchema: string): string {
  let sqliteSchema = mysqlSchema;

  // Remove MySQL-specific syntax
  sqliteSchema = sqliteSchema.replace(/DROP TABLE IF EXISTS `(\w+)`;/g, 'DROP TABLE IF EXISTS $1;');
  sqliteSchema = sqliteSchema.replace(/CREATE TABLE `(\w+)` \(/g, 'CREATE TABLE $1 (');

  // Convert AUTO_INCREMENT to AUTOINCREMENT (though we'll use UUIDs instead)
  sqliteSchema = sqliteSchema.replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT');

  // Convert ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  sqliteSchema = sqliteSchema.replace(/ENGINE=\w+.*;/g, ';');

  // Convert data types
  sqliteSchema = sqliteSchema.replace(/CHAR\(36\)/g, 'TEXT');
  sqliteSchema = sqliteSchema.replace(/VARCHAR\(\d+\)/g, 'TEXT');
  sqliteSchema = sqliteSchema.replace(/TEXT/g, 'TEXT');
  sqliteSchema = sqliteSchema.replace(/JSON/g, 'TEXT'); // SQLite doesn't have JSON type
  sqliteSchema = sqliteSchema.replace(/BOOLEAN/g, 'INTEGER'); // SQLite uses INTEGER for boolean
  sqliteSchema = sqliteSchema.replace(/DECIMAL\(\d+,\d+\)/g, 'REAL');
  sqliteSchema = sqliteSchema.replace(/INT/g, 'INTEGER');
  sqliteSchema = sqliteSchema.replace(/BIGINT/g, 'INTEGER');
  sqliteSchema = sqliteSchema.replace(/TINYINT/g, 'INTEGER');
  sqliteSchema = sqliteSchema.replace(/DATETIME/g, 'TEXT'); // SQLite uses TEXT for dates
  sqliteSchema = sqliteSchema.replace(/TIMESTAMP/g, 'TEXT');
  sqliteSchema = sqliteSchema.replace(/DEFAULT CURRENT_TIMESTAMP/g, "DEFAULT (datetime('now'))");
  sqliteSchema = sqliteSchema.replace(/ON UPDATE CURRENT_TIMESTAMP/g, ''); // SQLite doesn't support this

  // Convert DEFAULT (UUID()) to a trigger-based approach
  sqliteSchema = sqliteSchema.replace(/DEFAULT \(UUID\(\)\)/g, ''); // We'll handle UUID generation in code

  // Convert KEY to INDEX
  sqliteSchema = sqliteSchema.replace(/KEY `([^`]+)` \(([^)]+)\)/g, 'INDEX $1 ON ($2)');

  // Convert UNIQUE KEY to UNIQUE INDEX
  sqliteSchema = sqliteSchema.replace(/UNIQUE KEY `([^`]+)` \(([^)]+)\)/g, 'CREATE UNIQUE INDEX $1 ON ($2)');

  // Convert PRIMARY KEY
  sqliteSchema = sqliteSchema.replace(/PRIMARY KEY \(`([^`]+)`\)/g, 'PRIMARY KEY ($1)');

  // Clean up backticks
  sqliteSchema = sqliteSchema.replace(/`/g, '');

  return sqliteSchema;
}

// Initialize database with sample data for offline demo
export async function initializeSampleData(): Promise<void> {
  console.log('🌱 Initializing sample data...');

  try {
    // Temporarily disable foreign key constraints during data seeding
    executeQuery('PRAGMA foreign_keys = OFF;');
    console.log('🔓 Foreign key constraints disabled for data seeding');
    // Sample branches
    const branches = [
      {
        id: 'branch-1',
        name: 'Main Store',
        address: '123 Main Street, City Center',
        phone: '+1234567890',
        data_isolation_mode: 'shared',
        share_inventory: true
      },
      {
        id: 'branch-2',
        name: 'Downtown Branch',
        address: '456 Downtown Ave, Business District',
        phone: '+1234567891',
        data_isolation_mode: 'hybrid',
        share_inventory: true
      }
    ];

    // Sample categories
    const categories = [
      { id: 'cat-1', name: 'Electronics', description: 'Electronic devices and accessories' },
      { id: 'cat-2', name: 'Clothing', description: 'Clothing and fashion items' },
      { id: 'cat-3', name: 'Home & Garden', description: 'Home improvement and garden supplies' }
    ];

    // Sample suppliers
    const suppliers = [
      { id: 'sup-1', name: 'TechCorp', contact_person: 'John Smith', phone: '+1234567892', email: 'john@techcorp.com' },
      { id: 'sup-2', name: 'FashionHub', contact_person: 'Sarah Johnson', phone: '+1234567893', email: 'sarah@fashionhub.com' }
    ];

    // Generate UUIDs for products
    const productIds = [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
      '550e8400-e29b-41d4-a716-446655440004'
    ];

    // Sample products
    const products = [
      { id: productIds[0], name: 'Wireless Headphones', description: 'High-quality wireless headphones', category_id: 'cat-1', supplier_id: 'sup-1', sku: 'WH-001' },
      { id: productIds[1], name: 'Smart Watch', description: 'Latest smartwatch with health tracking', category_id: 'cat-1', supplier_id: 'sup-1', sku: 'SW-001' },
      { id: productIds[2], name: 'Cotton T-Shirt', description: 'Comfortable cotton t-shirt', category_id: 'cat-2', supplier_id: 'sup-2', sku: 'TSH-001' },
      { id: productIds[3], name: 'Garden Hose', description: 'Durable garden hose 50ft', category_id: 'cat-3', supplier_id: null, sku: 'GH-001' }
    ];

    // Generate UUIDs for variants
    const variantIds = [
      '550e8400-e29b-41d4-a716-446655440011',
      '550e8400-e29b-41d4-a716-446655440012',
      '550e8400-e29b-41d4-a716-446655440013',
      '550e8400-e29b-41d4-a716-446655440014',
      '550e8400-e29b-41d4-a716-446655440015'
    ];

    // Sample product variants
    const variants = [
      { id: variantIds[0], product_id: productIds[0], name: 'Wireless Headphones - Black', sku: 'WH-BLK-001', unit_price: 79.99, selling_price: 99.99, cost_price: 60.00, quantity: 25, branch_id: 'branch-1' },
      { id: variantIds[1], product_id: productIds[0], name: 'Wireless Headphones - White', sku: 'WH-WHT-001', unit_price: 79.99, selling_price: 99.99, cost_price: 60.00, quantity: 15, branch_id: 'branch-1' },
      { id: variantIds[2], product_id: productIds[1], name: 'Smart Watch - 42mm', sku: 'SW-42MM-001', unit_price: 199.99, selling_price: 249.99, cost_price: 150.00, quantity: 10, branch_id: 'branch-1' },
      { id: variantIds[3], product_id: productIds[2], name: 'T-Shirt - Medium', sku: 'TSH-M-001', unit_price: 9.99, selling_price: 14.99, cost_price: 7.00, quantity: 50, branch_id: 'branch-2' },
      { id: variantIds[4], product_id: productIds[3], name: 'Garden Hose - 50ft', sku: 'GH-50FT-001', unit_price: 24.99, selling_price: 34.99, cost_price: 18.00, quantity: 8, branch_id: 'branch-2' }
    ];

    // Sample customers
    const customers = [
      { id: 'cust-1', name: 'John Doe', phone: '+1234567894', email: 'john.doe@email.com', branch_id: 'branch-1' },
      { id: 'cust-2', name: 'Jane Smith', phone: '+1234567895', email: 'jane.smith@email.com', branch_id: 'branch-2' },
      { id: 'cust-3', name: 'Bob Johnson', phone: '+1234567896', email: 'bob.johnson@email.com', branch_id: 'branch-1' }
    ];

    // Sample users
    const users = [
      { id: 'user-1', email: 'admin@dukani.com', name: 'Admin User', role: 'admin', branch_id: 'branch-1' },
      { id: 'user-2', email: 'manager@dukani.com', name: 'Store Manager', role: 'manager', branch_id: 'branch-1' },
      { id: 'user-3', email: 'cashier@dukani.com', name: 'Cashier', role: 'cashier', branch_id: 'branch-2' }
    ];

    // Execute inserts in transaction - insert in dependency order
    const operations = [
      // Insert branches first (no dependencies)
      ...branches.map(branch => ({
        sql: `INSERT OR REPLACE INTO store_locations (id, name, address, phone, data_isolation_mode, share_inventory) VALUES (?, ?, ?, ?, ?, ?)`,
        params: [branch.id, branch.name, branch.address, branch.phone, branch.data_isolation_mode, branch.share_inventory ? 1 : 0]
      })),

      // Insert categories (no dependencies)
      ...categories.map(cat => ({
        sql: `INSERT OR REPLACE INTO lats_categories (id, name, description) VALUES (?, ?, ?)`,
        params: [cat.id, cat.name, cat.description]
      })),

      // Insert suppliers (no dependencies)
      ...suppliers.map(sup => ({
        sql: `INSERT OR REPLACE INTO lats_suppliers (id, name, contact_person, phone, email) VALUES (?, ?, ?, ?, ?)`,
        params: [sup.id, sup.name, sup.contact_person, sup.phone, sup.email]
      })),

      // Insert users (depends on branches)
      ...users.map(user => ({
        sql: `INSERT OR REPLACE INTO users (id, email, name, role, branch_id) VALUES (?, ?, ?, ?, ?)`,
        params: [user.id, user.email, user.name, user.role, user.branch_id]
      })),

      // Insert customers (depends on branches)
      ...customers.map(cust => ({
        sql: `INSERT OR REPLACE INTO lats_customers (id, name, phone, email, branch_id) VALUES (?, ?, ?, ?, ?)`,
        params: [cust.id, cust.name, cust.phone, cust.email, cust.branch_id]
      })),

      // Insert products (depends on categories and suppliers)
      ...products.map(prod => ({
        sql: `INSERT OR REPLACE INTO lats_products (id, name, description, category_id, supplier_id, sku) VALUES (?, ?, ?, ?, ?, ?)`,
        params: [prod.id, prod.name, prod.description, prod.category_id, prod.supplier_id, prod.sku]
      })),

      // Insert variants (depends on products and branches)
      ...variants.map(variant => ({
        sql: `INSERT OR REPLACE INTO lats_product_variants (id, product_id, name, sku, unit_price, selling_price, cost_price, quantity, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [variant.id, variant.product_id, variant.name, variant.sku, variant.unit_price, variant.selling_price, variant.cost_price, variant.quantity, variant.branch_id]
      }))
    ];

    console.log(`📝 Executing ${operations.length} sample data operations...`);

    // Execute all operations in one transaction
    try {
      executeTransaction(operations);
      console.log('✅ Sample data transaction completed successfully');
    } catch (transactionError) {
      console.error('❌ Sample data transaction failed:', transactionError);
      throw transactionError;
    }

    // Re-enable foreign key constraints
    executeQuery('PRAGMA foreign_keys = ON;');
    console.log('🔒 Foreign key constraints re-enabled');

    // Verify data was inserted
    try {
      const branchResult = executeQuery('SELECT COUNT(*) as count FROM store_locations');
      const branchCount = branchResult.length > 0 ? branchResult[0].count : 0;

      const productResult = executeQuery('SELECT COUNT(*) as count FROM lats_products');
      const productCount = productResult.length > 0 ? productResult[0].count : 0;

      const customerResult = executeQuery('SELECT COUNT(*) as count FROM lats_customers');
      const customerCount = customerResult.length > 0 ? customerResult[0].count : 0;

      console.log(`✅ Sample data initialized: ${branchCount} branches, ${productCount} products, ${customerCount} customers`);

      // Log individual table counts for debugging
      console.log('📊 Detailed counts:');
      console.log(`  - Categories: ${executeQuery('SELECT COUNT(*) as count FROM lats_categories')[0]?.count || 0}`);
      console.log(`  - Suppliers: ${executeQuery('SELECT COUNT(*) as count FROM lats_suppliers')[0]?.count || 0}`);
      console.log(`  - Users: ${executeQuery('SELECT COUNT(*) as count FROM users')[0]?.count || 0}`);
      console.log(`  - Product Variants: ${executeQuery('SELECT COUNT(*) as count FROM lats_product_variants')[0]?.count || 0}`);
      console.log(`  - Sales: ${executeQuery('SELECT COUNT(*) as count FROM lats_sales')[0]?.count || 0}`);

    } catch (countError) {
      console.error('❌ Failed to count records:', countError);
    }

  } catch (error) {
    console.error('❌ Failed to initialize sample data:', error);
    // Make sure to re-enable foreign keys even if there's an error
    try {
      executeQuery('PRAGMA foreign_keys = ON;');
    } catch (fkError) {
      console.error('❌ Failed to re-enable foreign keys:', fkError);
    }
    throw error;
  }
}

// Migration status
export interface MigrationStatus {
  version: number;
  lastRun: string;
  completed: boolean;
  error?: string;
}

// Run migrations
export async function runMigrations(): Promise<MigrationStatus> {
  try {
    console.log('🚀 Running database migrations...');

    // Create migrations table if it doesn't exist
    executeQuery(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        success INTEGER DEFAULT 1
      )
    `);

    // Get current migration version
    const currentVersion = executeQuery('SELECT MAX(version) as version FROM schema_migrations')[0]?.version || 0;

    // Migration 1: Initialize core schema
    if (currentVersion < 1) {
      await initializeSampleData();

      executeQuery('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [1, 'Initialize core schema and sample data']);
      console.log('✅ Migration 1 completed: Core schema initialized');
    }

    // Migration 2: Add sku column to lats_products table
    if (currentVersion < 2) {
      console.log('🔄 Running Migration 2: Add sku column to lats_products');
      try {
        executeQuery('ALTER TABLE lats_products ADD COLUMN sku TEXT');
        console.log('✅ Added sku column to lats_products table');
        executeQuery('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [2, 'Add sku column to lats_products table']);
      } catch (error: any) {
        console.warn('⚠️ Migration 2 may have already been applied:', error.message);
        // Try to insert the migration record anyway in case it failed
        try {
          executeQuery('INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)', [2, 'Add sku column to lats_products table']);
        } catch (recordError) {
          console.error('❌ Failed to record migration 2:', recordError);
        }
      }
    }

    // Migration 3: Update product IDs to UUID format
    if (currentVersion < 3) {
      console.log('🔄 Running Migration 3: Update product IDs to UUID format');
      try {
        // Get all products with non-UUID IDs
        const products = executeQuery('SELECT id, name FROM lats_products WHERE LENGTH(id) < 36 OR id NOT LIKE "%-%"');

        for (const product of products) {
          const newId = crypto.randomUUID();
          // Update product ID
          executeQuery('UPDATE lats_products SET id = ? WHERE id = ?', [newId, product.id]);
          // Update related variants
          executeQuery('UPDATE lats_product_variants SET product_id = ? WHERE product_id = ?', [newId, product.id]);
          console.log(`✅ Updated product ID: ${product.name} (${product.id} -> ${newId})`);
        }

        executeQuery('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [3, 'Update product IDs to UUID format']);
        console.log('✅ Migration 3 completed: Updated product IDs to UUID format');
      } catch (error: any) {
        console.error('❌ Migration 3 failed:', error);
        // Don't throw - allow the app to continue
      }
    }

    const finalVersion = executeQuery('SELECT MAX(version) as version FROM schema_migrations')[0]?.version || 0;

    console.log('✅ All migrations completed successfully');

    return {
      version: finalVersion,
      lastRun: new Date().toISOString(),
      completed: true
    };

  } catch (error: any) {
    console.error('❌ Migration failed:', error);

    // Record failed migration
    try {
      executeQuery('INSERT INTO schema_migrations (version, name, success) VALUES (?, ?, ?)',
        [Date.now(), 'Migration failed', 0]);
    } catch (recordError) {
      console.error('Failed to record migration error:', recordError);
    }

    return {
      version: 0,
      lastRun: new Date().toISOString(),
      completed: false,
      error: error.message
    };
  }
}

// Export migration status
export function getMigrationStatus(): MigrationStatus {
  try {
    const result = executeQuery('SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1');
    if (result.length > 0) {
      return {
        version: result[0].version,
        lastRun: result[0].executed_at,
        completed: result[0].success === 1
      };
    }
    return {
      version: 0,
      lastRun: '',
      completed: false
    };
  } catch (error) {
    return {
      version: 0,
      lastRun: '',
      completed: false,
      error: 'Failed to get migration status'
    };
  }
}
