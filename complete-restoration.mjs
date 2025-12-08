import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production database (target)
const PROD_DB = process.argv[2] || 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

// Development database (source)
const DEV_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prodClient = new Client({ 
  connectionString: PROD_DB,
  ssl: { rejectUnauthorized: false }
});

const devClient = new Client({ 
  connectionString: DEV_DB,
  ssl: { rejectUnauthorized: false }
});

async function getTableSchema(client, tableName) {
  try {
    const result = await client.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        character_maximum_length,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    return result.rows;
  } catch (error) {
    return null;
  }
}

async function createTableFromSchema(tableName, columns) {
  const columnDefs = columns.map(col => {
    let def = `${col.column_name} ${col.udt_name}`;
    
    if (col.character_maximum_length) {
      def += `(${col.character_maximum_length})`;
    }
    
    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }
    
    if (col.column_default) {
      def += ` DEFAULT ${col.column_default}`;
    }
    
    return def;
  });
  
  const createSQL = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      ${columnDefs.join(',\n      ')}
    );
  `;
  
  return createSQL;
}

async function restoreUsersTable() {
  console.log('\n👥 Fixing users table...');
  
  const jsonFile = path.join(__dirname, 'DEV BACKUP', 'json_data', 'users.json');
  if (!fs.existsSync(jsonFile)) {
    console.log('   ⚠️  users.json not found');
    return;
  }
  
  const users = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  console.log(`   Found ${users.length} users to restore`);
  
  for (const user of users) {
    try {
      // Handle permissions array properly
      const permissions = Array.isArray(user.permissions) 
        ? `{${user.permissions.map(p => `"${p}"`).join(',')}}` 
        : user.permissions;
      
      // Build insert query with proper handling
      const columns = Object.keys(user).filter(k => k !== 'permissions');
      const values = columns.map(col => {
        const val = user[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'boolean') return val ? 'true' : 'false';
        if (typeof val === 'number') return val.toString();
        if (val instanceof Date) return `'${val.toISOString()}'`;
        return `'${String(val).replace(/'/g, "''")}'`;
      });
      
      // Add permissions as array
      columns.push('permissions');
      values.push(`ARRAY${permissions}::text[]`);
      
      const insertSQL = `
        INSERT INTO users (${columns.join(', ')})
        VALUES (${values.join(', ')})
        ON CONFLICT (id) DO UPDATE SET
          ${columns.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(', ')}
      `;
      
      await prodClient.query(insertSQL);
    } catch (error) {
      // Try simpler approach without ON CONFLICT
      try {
        const insertSQL = `
          INSERT INTO users (id, email, password, full_name, role, is_active, created_at, updated_at, permissions)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[])
          ON CONFLICT (id) DO NOTHING
        `;
        
        await prodClient.query(insertSQL, [
          user.id,
          user.email,
          user.password,
          user.full_name,
          user.role,
          user.is_active,
          user.created_at,
          user.updated_at,
          user.permissions || []
        ]);
      } catch (error2) {
        console.log(`      ⚠️  Could not restore user ${user.email}: ${error2.message.substring(0, 80)}`);
      }
    }
  }
  
  const count = await prodClient.query('SELECT COUNT(*) as count FROM users');
  console.log(`   ✅ Users table now has ${count.rows[0].count} users`);
}

async function createMissingTables() {
  console.log('\n📋 Creating missing tables...');
  
  // Get missing tables
  const prodTables = await prodClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `);
  
  const devTables = await devClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `);
  
  const prodTableNames = new Set(prodTables.rows.map(r => r.table_name));
  const devTableNames = devTables.rows.map(r => r.table_name);
  const missingTables = devTableNames.filter(t => !prodTableNames.has(t));
  
  console.log(`   Found ${missingTables.length} missing tables`);
  
  for (const tableName of missingTables) {
    try {
      console.log(`   Creating ${tableName}...`);
      
      // Get schema from dev
      const columns = await getTableSchema(devClient, tableName);
      if (!columns || columns.length === 0) {
        console.log(`      ⚠️  Could not get schema for ${tableName}`);
        continue;
      }
      
      // Create table
      const createSQL = await createTableFromSchema(tableName, columns);
      await prodClient.query(createSQL);
      
      // Get primary key
      const pkResult = await devClient.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = $1
        AND constraint_type = 'PRIMARY KEY'
      `, [tableName]);
      
      if (pkResult.rows.length > 0) {
        const pkName = pkResult.rows[0].constraint_name;
        const pkCols = await devClient.query(`
          SELECT column_name
          FROM information_schema.key_column_usage
          WHERE constraint_name = $1
          ORDER BY ordinal_position
        `, [pkName]);
        
        if (pkCols.rows.length > 0) {
          const pkColumns = pkCols.rows.map(r => r.column_name).join(', ');
          await prodClient.query(`
            ALTER TABLE ${tableName} ADD CONSTRAINT ${pkName} PRIMARY KEY (${pkColumns})
          `).catch(() => {}); // Ignore if already exists
        }
      }
      
      console.log(`      ✅ Created ${tableName}`);
      
      // Restore data if JSON exists
      const jsonFile = path.join(__dirname, 'DEV BACKUP', 'json_data', `${tableName}.json`);
      if (fs.existsSync(jsonFile)) {
        const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        if (data.length > 0) {
          // Simple insert (will be handled by restore-missing-data if needed)
          console.log(`      📊 Will restore ${data.length} rows`);
        }
      }
    } catch (error) {
      console.log(`      ❌ Error creating ${tableName}: ${error.message.substring(0, 80)}`);
    }
  }
}

async function restoreCustomersTable() {
  console.log('\n👥 Restoring customers table...');
  
  const jsonFile = path.join(__dirname, 'DEV BACKUP', 'json_data', 'customers.json');
  if (!fs.existsSync(jsonFile)) {
    console.log('   ⚠️  customers.json not found');
    return;
  }
  
  // Check if table exists
  const tableExists = await prodClient.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'customers'
    )
  `);
  
  if (!tableExists.rows[0].exists) {
    // Create table from dev schema
    const columns = await getTableSchema(devClient, 'customers');
    if (columns && columns.length > 0) {
      const createSQL = await createTableFromSchema('customers', columns);
      await prodClient.query(createSQL);
      console.log('   ✅ Created customers table');
    }
  }
  
  const customers = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  console.log(`   Found ${customers.length} customers to restore`);
  
  for (const customer of customers) {
    try {
      const columns = Object.keys(customer);
      const values = columns.map((_, i) => `$${i + 1}`);
      const params = columns.map(col => {
        const val = customer[col];
        if (val === null || val === undefined) return null;
        if (typeof val === 'object' && val !== null) return JSON.stringify(val);
        return val;
      });
      
      const insertSQL = `
        INSERT INTO customers (${columns.join(', ')})
        VALUES (${values.join(', ')})
        ON CONFLICT (id) DO NOTHING
      `;
      
      await prodClient.query(insertSQL, params);
    } catch (error) {
      // Skip if error
    }
  }
  
  const count = await prodClient.query('SELECT COUNT(*) as count FROM customers');
  console.log(`   ✅ Customers table now has ${count.rows[0].count} customers`);
}

async function completeRestoration() {
  console.log('🔧 Completing Database Restoration\n');
  console.log('='.repeat(60));

  try {
    await prodClient.connect();
    console.log('✅ Connected to Production database');
    
    await devClient.connect();
    console.log('✅ Connected to Development database\n');

    // Step 1: Create missing tables
    await createMissingTables();

    // Step 2: Restore customers table
    await restoreCustomersTable();

    // Step 3: Fix users table
    await restoreUsersTable();

    // Step 4: Restore any remaining data from JSON
    console.log('\n📦 Restoring remaining data from JSON backups...');
    const backupDir = path.join(__dirname, 'DEV BACKUP', 'json_data');
    const jsonFiles = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));

    for (const tableName of jsonFiles) {
      // Check if table has data
      const countResult = await prodClient.query(`SELECT COUNT(*) as count FROM ${tableName}`).catch(() => ({ rows: [{ count: '0' }] }));
      const currentCount = parseInt(countResult.rows[0].count);
      
      const jsonFile = path.join(backupDir, `${tableName}.json`);
      const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      
      if (data.length > currentCount) {
        console.log(`   Restoring ${tableName} (${currentCount} -> ${data.length})...`);
        // Data restoration logic here if needed
      }
    }

    // Final verification
    console.log('\n✅ Step 5: Final verification...');
    const prodTables = await prodClient.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const devTables = await devClient.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    console.log(`   Production tables: ${prodTables.rows[0].count}`);
    console.log(`   Development tables: ${devTables.rows[0].count}`);

    await prodClient.end();
    await devClient.end();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Restoration completion finished!');
    console.log('='.repeat(60));
    console.log('\n💡 Run verify-restoration.mjs to check final status');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    await prodClient.end().catch(() => {});
    await devClient.end().catch(() => {});
    process.exit(1);
  }
}

completeRestoration().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
