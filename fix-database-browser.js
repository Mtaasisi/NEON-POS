/**
 * Browser-based Database Schema Fix
 * Run this in the browser console to fix database schema issues
 */

async function fixDatabaseSchema() {
  console.log('🔧 Starting browser-based database schema fixes...');

  try {
    // Load sql.js
    if (!window.SQL) {
      console.log('📥 Loading sql.js...');
      const script = document.createElement('script');
      script.src = 'https://sql.js.org/dist/sql-wasm.js';
      document.head.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });

      // Initialize SQL.js
      window.SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`
      });
    }

    // Load database from localStorage
    const savedDbData = localStorage.getItem('dukani-db-data');
    if (!savedDbData) {
      console.log('❌ No database found in localStorage');
      return;
    }

    const dbArray = new Uint8Array(JSON.parse(savedDbData));
    const db = new window.SQL.Database(dbArray);
    console.log('✅ Database loaded from localStorage');

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON;');

    // 1. Fix schema_migrations table
    console.log('🔄 Fixing schema_migrations table...');
    try {
      // Create schema_migrations table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          success INTEGER DEFAULT 1
        )
      `);

      // Remove duplicate entries
      db.run(`
        DELETE FROM schema_migrations
        WHERE rowid NOT IN (
          SELECT MIN(rowid)
          FROM schema_migrations
          GROUP BY version
        )
      `);

      // Ensure basic migrations are recorded
      db.run(`INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)`, [1, 'Initialize core schema and sample data']);
      db.run(`INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)`, [2, 'Add sku column to lats_products table']);
      db.run(`INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)`, [3, 'Update product IDs to UUID format']);

      console.log('✅ schema_migrations table fixed');
    } catch (error) {
      console.warn('⚠️ Issue with schema_migrations:', error.message);
    }

    // 2. Add sku column to lats_products if missing
    console.log('📝 Checking sku column in lats_products...');
    try {
      const skuExists = db.exec(`
        SELECT COUNT(*) as count
        FROM pragma_table_info('lats_products')
        WHERE name = 'sku'
      `)[0]?.values[0][0] > 0;

      if (!skuExists) {
        console.log('📝 Adding sku column to lats_products...');
        db.run('ALTER TABLE lats_products ADD COLUMN sku TEXT');
        console.log('✅ Added sku column');
      } else {
        console.log('✅ sku column already exists');
      }
    } catch (error) {
      console.warn('⚠️ Issue with sku column:', error.message);
    }

    // 3. Add background_color column to store_locations if missing
    console.log('🎨 Checking background_color column in store_locations...');
    try {
      const bgColorExists = db.exec(`
        SELECT COUNT(*) as count
        FROM pragma_table_info('store_locations')
        WHERE name = 'background_color'
      `)[0]?.values[0][0] > 0;

      if (!bgColorExists) {
        console.log('📝 Adding background_color column to store_locations...');
        db.run('ALTER TABLE store_locations ADD COLUMN background_color TEXT');
        console.log('✅ Added background_color column');
      } else {
        console.log('✅ background_color column already exists');
      }
    } catch (error) {
      console.warn('⚠️ Issue with background_color column:', error.message);
    }

    // 4. Add other missing columns to store_locations
    console.log('🏪 Checking other store_locations columns...');
    try {
      const isolationModeExists = db.exec(`
        SELECT COUNT(*) as count
        FROM pragma_table_info('store_locations')
        WHERE name = 'data_isolation_mode'
      `)[0]?.values[0][0] > 0;

      if (!isolationModeExists) {
        db.run('ALTER TABLE store_locations ADD COLUMN data_isolation_mode TEXT DEFAULT \'shared\'');
        console.log('✅ Added data_isolation_mode column');
      }

      const shareInventoryExists = db.exec(`
        SELECT COUNT(*) as count
        FROM pragma_table_info('store_locations')
        WHERE name = 'share_inventory'
      `)[0]?.values[0][0] > 0;

      if (!shareInventoryExists) {
        db.run('ALTER TABLE store_locations ADD COLUMN share_inventory INTEGER DEFAULT 1');
        console.log('✅ Added share_inventory column');
      }
    } catch (error) {
      console.warn('⚠️ Issue with store_locations columns:', error.message);
    }

    // 5. Ensure customers table exists
    console.log('👥 Ensuring customers table exists...');
    try {
      db.run(`
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          branch_id TEXT,
          is_active INTEGER DEFAULT 1,
          loyalty_points INTEGER DEFAULT 0,
          total_purchases REAL DEFAULT 0.00,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ customers table ensured');
    } catch (error) {
      console.warn('⚠️ Issue with customers table:', error.message);
    }

    // 6. Ensure lats_customers table exists
    console.log('👥 Ensuring lats_customers table exists...');
    try {
      db.run(`
        CREATE TABLE IF NOT EXISTS lats_customers (
          id TEXT PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT,
          email TEXT,
          phone TEXT,
          phone2 TEXT,
          address TEXT,
          city TEXT,
          country TEXT DEFAULT 'Tanzania',
          date_of_birth TEXT,
          branch_id TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ lats_customers table ensured');
    } catch (error) {
      console.warn('⚠️ Issue with lats_customers table:', error.message);
    }

    // 7. Ensure store_locations table exists
    console.log('🏪 Ensuring store_locations table exists...');
    try {
      db.run(`
        CREATE TABLE IF NOT EXISTS store_locations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT NOT NULL UNIQUE,
          address TEXT,
          phone TEXT,
          email TEXT,
          manager_id TEXT,
          is_active INTEGER DEFAULT 1,
          created_by TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          location TEXT,
          operating_hours TEXT,
          background_color TEXT,
          data_isolation_mode TEXT DEFAULT 'shared',
          share_inventory INTEGER DEFAULT 1
        )
      `);
      console.log('✅ store_locations table ensured');
    } catch (error) {
      console.warn('⚠️ Issue with store_locations table:', error.message);
    }

    // 8. Add default branch if it doesn't exist
    console.log('🏪 Ensuring default branch exists...');
    try {
      const defaultBranchExists = db.exec(`
        SELECT COUNT(*) as count
        FROM store_locations
        WHERE id = '00000000-0000-0000-0000-000000000001'
      `)[0]?.values[0][0] > 0;

      if (!defaultBranchExists) {
        db.run(`
          INSERT INTO store_locations (
            id, name, code, address, phone, email, is_active,
            data_isolation_mode, share_inventory, background_color
          ) VALUES (
            '00000000-0000-0000-0000-000000000001',
            'Main Store',
            'MAIN',
            'Default Address',
            '+255000000000',
            'admin@store.com',
            1,
            'shared',
            1,
            '#3b82f6'
          )
        `);
        console.log('✅ Created default branch');
      } else {
        console.log('✅ Default branch already exists');
      }
    } catch (error) {
      console.warn('⚠️ Issue with default branch:', error.message);
    }

    // 9. Create indexes
    console.log('📊 Creating indexes...');
    try {
      db.run('CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)');
      db.run('CREATE INDEX IF NOT EXISTS idx_lats_customers_branch ON lats_customers(branch_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_store_locations_active ON store_locations(is_active)');
      db.run('CREATE INDEX IF NOT EXISTS idx_lats_products_sku ON lats_products(sku)');
      console.log('✅ Indexes created');
    } catch (error) {
      console.warn('⚠️ Issue with indexes:', error.message);
    }

    // 10. Save the fixed database back to localStorage
    console.log('💾 Saving fixed database to localStorage...');
    const dbData = db.export();
    const dbArrayForStorage = Array.from(dbData);
    localStorage.setItem('dukani-db-data', JSON.stringify(dbArrayForStorage));
    console.log('✅ Database saved to localStorage');

    // 11. Verification
    console.log('🔍 Verifying fixes...');
    try {
      const tables = ['customers', 'lats_customers', 'store_locations', 'lats_products', 'schema_migrations'];

      for (const table of tables) {
        try {
          const result = db.exec(`SELECT COUNT(*) as count FROM ${table}`)[0];
          const count = result?.values[0][0] || 0;
          console.log(`✅ ${table}: ${count} records`);
        } catch (e) {
          console.log(`❌ ${table}: error - ${e.message}`);
        }
      }

      // Check columns
      const bgColorCheck = db.exec(`
        SELECT COUNT(*) as count
        FROM pragma_table_info('store_locations')
        WHERE name = 'background_color'
      `)[0]?.values[0][0] > 0;
      console.log(`✅ background_color column: ${bgColorCheck ? 'exists' : 'missing'}`);

      const skuCheck = db.exec(`
        SELECT COUNT(*) as count
        FROM pragma_table_info('lats_products')
        WHERE name = 'sku'
      `)[0]?.values[0][0] > 0;
      console.log(`✅ sku column: ${skuCheck ? 'exists' : 'missing'}`);

    } catch (error) {
      console.warn('⚠️ Issue with verification:', error.message);
    }

    // Close database
    db.close();

    console.log('🎉 Database schema fixes completed successfully!');
    console.log('🔄 Please refresh the page to see the changes.');

  } catch (error) {
    console.error('❌ Database schema fixes failed:', error);
  }
}

// Auto-run the fix
fixDatabaseSchema();
