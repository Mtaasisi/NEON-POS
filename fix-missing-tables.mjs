import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';

const { Client } = pg;

const PROD_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';
const DEV_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prodClient = new Client({ connectionString: PROD_DB, ssl: { rejectUnauthorized: false } });
const devClient = new Client({ connectionString: DEV_DB, ssl: { rejectUnauthorized: false } });

async function getTableDDL(tableName) {
  try {
    // Get the full CREATE TABLE statement from dev
    const result = await devClient.query(`
      SELECT 
        'CREATE TABLE ' || table_name || ' (' ||
        string_agg(
          column_name || ' ' || 
          CASE 
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            WHEN data_type = 'ARRAY' THEN udt_name
            ELSE data_type
          END ||
          CASE WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')' ELSE '' END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
          ', '
          ORDER BY ordinal_position
        ) || ');' as ddl
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      GROUP BY table_name
    `, [tableName]);
    
    if (result.rows.length > 0) {
      return result.rows[0].ddl;
    }
    
    // Alternative: Use pg_dump approach - get actual CREATE statement
    const pgResult = await devClient.query(`
      SELECT pg_get_tabledef($1)
    `, [tableName]).catch(() => null);
    
    return null;
  } catch (error) {
    return null;
  }
}

async function createTableWithFullSchema(tableName) {
  try {
    // Get sequences first
    const sequences = await devClient.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
      AND sequence_name LIKE $1 || '%'
    `, [`${tableName}_%`]);
    
    for (const seq of sequences.rows) {
      const seqInfo = await devClient.query(`
        SELECT 
          data_type,
          numeric_precision,
          start_value,
          minimum_value,
          maximum_value,
          increment
        FROM information_schema.sequences
        WHERE sequence_schema = 'public' AND sequence_name = $1
      `, [seq.sequence_name]);
      
      if (seqInfo.rows.length > 0) {
        const s = seqInfo.rows[0];
        await prodClient.query(`
          CREATE SEQUENCE IF NOT EXISTS ${seq.sequence_name}
          START WITH ${s.start_value || 1}
          INCREMENT BY ${s.increment || 1}
          MINVALUE ${s.minimum_value || 1}
          MAXVALUE ${s.maximum_value || '9223372036854775807'}
        `).catch(() => {});
      }
    }
    
    // Get columns
    const columns = await devClient.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    if (columns.rows.length === 0) return false;
    
    const colDefs = columns.rows.map(col => {
      let def = `${col.column_name} `;
      
      // Handle data types
      if (col.data_type === 'ARRAY') {
        def += col.udt_name;
      } else if (col.data_type === 'USER-DEFINED') {
        def += col.udt_name;
      } else {
        def += col.udt_name || col.data_type;
      }
      
      if (col.character_maximum_length) {
        def = def.replace(/\(\)/, `(${col.character_maximum_length})`);
        if (!def.includes('(')) {
          def += `(${col.character_maximum_length})`;
        }
      }
      
      if (col.is_nullable === 'NO') {
        def += ' NOT NULL';
      }
      
      if (col.column_default) {
        // Clean up default value
        let defaultValue = col.column_default;
        // Replace sequence references
        defaultValue = defaultValue.replace(/nextval\([^)]+\)/g, (match) => {
          // Extract sequence name
          const seqMatch = match.match(/'([^']+)'/);
          if (seqMatch) {
            return `nextval('${seqMatch[1]}')`;
          }
          return match;
        });
        def += ` DEFAULT ${defaultValue}`;
      }
      
      return def;
    });
    
    const createSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${colDefs.join(',\n  ')}\n);`;
    
    await prodClient.query(createSQL);
    
    // Add primary key
    const pk = await devClient.query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    `, [tableName]);
    
    if (pk.rows.length > 0) {
      const pkCols = pk.rows.map(r => r.column_name).join(', ');
      await prodClient.query(`
        ALTER TABLE ${tableName} ADD PRIMARY KEY (${pkCols})
      `).catch(() => {});
    }
    
    return true;
  } catch (error) {
    console.error(`      Error: ${error.message.substring(0, 100)}`);
    return false;
  }
}

async function fixMissingTables() {
  console.log('🔧 Fixing Missing Tables\n');
  
  await prodClient.connect();
  await devClient.connect();
  
  const missingTables = [
    'buyer_details',
    'communication_log',
    'customer_fix_backup',
    'notes',
    'product_interests',
    'sales_pipeline',
    'user_whatsapp_preferences',
    'whatsapp_antiban_settings',
    'whatsapp_customers',
    'whatsapp_session_logs',
    'whatsapp_sessions'
  ];
  
  for (const tableName of missingTables) {
    console.log(`   Creating ${tableName}...`);
    const success = await createTableWithFullSchema(tableName);
    if (success) {
      console.log(`      ✅ Created ${tableName}`);
    } else {
      console.log(`      ❌ Failed to create ${tableName}`);
    }
  }
  
  // Restore customers table data
  console.log('\n👥 Restoring customers table data...');
  const __dirname = new URL('.', import.meta.url).pathname;
  const jsonFile = `${__dirname}DEV BACKUP/json_data/customers.json`;
  
  if (fs.existsSync(jsonFile)) {
    const customers = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log(`   Found ${customers.length} customers`);
    
    for (const customer of customers) {
      try {
        const cols = Object.keys(customer);
        const vals = cols.map((_, i) => `$${i + 1}`);
        const params = cols.map(c => {
          const v = customer[c];
          if (v === null) return null;
          if (typeof v === 'object') return JSON.stringify(v);
          return v;
        });
        
        await prodClient.query(`
          INSERT INTO customers (${cols.join(', ')})
          VALUES (${vals.join(', ')})
          ON CONFLICT (id) DO NOTHING
        `, params);
      } catch (error) {
        // Skip
      }
    }
    
    const count = await prodClient.query('SELECT COUNT(*) as count FROM customers');
    console.log(`   ✅ Customers: ${count.rows[0].count} rows`);
  }
  
  await prodClient.end();
  await devClient.end();
  
  console.log('\n✅ Done!');
}

fixMissingTables().catch(console.error);
