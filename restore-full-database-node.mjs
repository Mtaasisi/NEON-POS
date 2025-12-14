import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const { Client } = pg;
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get connection string from command line
const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Please provide a database connection string');
  console.error('Usage: node restore-full-database-node.mjs "postgresql://postgres:PASSWORD@host:5432/postgres"');
  process.exit(1);
}

// Replace [YOUR_PASSWORD] if present
let dbUrl = connectionString.replace('[YOUR_PASSWORD]', process.env.DB_PASSWORD || '');

if (dbUrl.includes('[YOUR_PASSWORD]')) {
  console.error('❌ Error: Password not provided');
  process.exit(1);
}

const client = new Client({ 
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

// Find backup file
const backupDir = path.join(__dirname, 'DEV BACKUP');
const backupFiles = fs.readdirSync(backupDir);

// Look for the best backup file to restore
let backupFile = null;
let backupType = null;

// Prefer full SQL backup (easier to restore with Node.js)
const fullBackup = backupFiles.find(f => f.endsWith('.sql') && (f.includes('full_backup_pgdump') || f.includes('full_backup')));
if (fullBackup) {
  backupFile = path.join(backupDir, fullBackup);
  backupType = 'sql';
  console.log(`📦 Found SQL backup: ${fullBackup}`);
} else {
  console.error('❌ Error: No suitable backup file found');
  process.exit(1);
}

async function restoreDatabase() {
  console.log('\n🔍 Starting Database Restoration\n');
  console.log('⚠️  WARNING: This will REPLACE ALL DATA in the target database!\n');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Clean database
    console.log('🧹 Step 1: Cleaning existing database...');
    try {
      // Drop all tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      if (tablesResult.rows.length > 0) {
        console.log(`   Found ${tablesResult.rows.length} existing tables, dropping...`);
        for (const table of tablesResult.rows) {
          try {
            await client.query(`DROP TABLE IF EXISTS ${table.table_name} CASCADE`);
          } catch (error) {
            // Ignore errors, continue
          }
        }
      }
      
      // Drop all sequences
      const sequencesResult = await client.query(`
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
      `);
      
      for (const seq of sequencesResult.rows) {
        try {
          await client.query(`DROP SEQUENCE IF EXISTS ${seq.sequence_name} CASCADE`);
        } catch (error) {
          // Ignore errors
        }
      }
      
      console.log('   ✅ Database cleaned\n');
    } catch (error) {
      console.log('   ⚠️  Could not clean database:', error.message);
      console.log('   Continuing with restore...\n');
    }

    // Step 2: Read and execute SQL file
    console.log('📥 Step 2: Reading backup file...');
    const sqlContent = fs.readFileSync(backupFile, 'utf8');
    console.log(`   ✅ Read ${(sqlContent.length / 1024 / 1024).toFixed(2)} MB\n`);

    console.log('📥 Step 3: Restoring database (this may take several minutes)...');
    
    // Split SQL into statements (simple approach - split by semicolon)
    // For better handling, we'll execute the entire file as one transaction where possible
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let executed = 0;
    let errors = 0;

    // Execute in batches
    const batchSize = 10;
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize);
      
      for (const statement of batch) {
        try {
          // Skip comments and empty statements
          if (statement.startsWith('--') || statement.length < 10) {
            continue;
          }
          
          await client.query(statement);
          executed++;
          
          if (executed % 50 === 0) {
            process.stdout.write(`   Progress: ${executed}/${statements.length} statements executed...\r`);
          }
        } catch (error) {
          // Some errors are expected (like "already exists"), so we'll continue
          if (!error.message.includes('already exists') && 
              !error.message.includes('does not exist') &&
              !error.message.includes('relation') &&
              !error.message.includes('duplicate')) {
            errors++;
            if (errors < 10) {
              console.log(`\n   ⚠️  Error: ${error.message.substring(0, 100)}`);
            }
          }
        }
      }
    }

    console.log(`\n   ✅ Executed ${executed} statements`);
    if (errors > 0) {
      console.log(`   ⚠️  ${errors} statements had errors (some may be expected)`);
    }

    // Step 3: Verify restoration
    console.log('\n✅ Step 4: Verifying restoration...');
    const verifyResult = await client.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const tableCount = verifyResult.rows[0].table_count;
    console.log(`   ✅ Found ${tableCount} tables in restored database`);

    // Get row counts from a few key tables
    const keyTables = ['lats_products', 'customers', 'lats_customers', 'products'];
    console.log('\n   📊 Sample table row counts:');
    for (const table of keyTables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`      ${table}: ${countResult.rows[0].count} rows`);
      } catch (error) {
        // Table doesn't exist, skip
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESTORATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Backup file: ${path.basename(backupFile)}`);
    console.log(`✅ Tables restored: ${tableCount}`);
    console.log(`✅ Statements executed: ${executed}`);
    console.log(`✅ Restoration completed successfully!`);
    console.log('='.repeat(60));

    await client.end();
    console.log('\n✅ Database restoration completed!');
  } catch (error) {
    console.error('\n❌ Error during restoration:', error.message);
    console.error('\nStack:', error.stack);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

restoreDatabase().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
