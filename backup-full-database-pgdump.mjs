import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get connection string from command line
const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Please provide a database connection string');
  console.error('Usage: node backup-full-database-pgdump.mjs "postgresql://user:pass@host:port/db"');
  process.exit(1);
}

// Parse connection string
const url = new URL(connectionString);
const dbHost = url.hostname;
const dbPort = url.port || '5432';
const dbName = url.pathname.replace('/', '');
const dbUser = url.username;
const dbPassword = url.password;

// Create backup directory with date
const today = new Date().toISOString().split('T')[0];
const backupDir = path.join(__dirname, `supabase backup ${today}`);
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📁 Created backup directory: ${backupDir}`);
}

async function backupWithPgDump() {
  console.log('🔍 Starting Full Database Backup with pg_dump\n');
  console.log('📊 Database:', dbName);
  console.log('📊 Host:', dbHost);
  console.log('📊 Port:', dbPort);
  console.log('📊 User:', dbUser);
  console.log('');

  try {
    // Set PGPASSWORD environment variable
    process.env.PGPASSWORD = dbPassword;

    // Create schema-only backup
    console.log('📋 Creating schema-only backup...');
    const schemaFile = path.join(backupDir, `schema_only_${today}.sql`);
    const schemaCmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --schema-only --no-owner --no-acl -f "${schemaFile}"`;
    
    await execAsync(schemaCmd);
    const schemaSize = (fs.statSync(schemaFile).size / 1024 / 1024).toFixed(2);
    console.log(`   ✅ Schema saved: ${path.basename(schemaFile)} (${schemaSize} MB)\n`);

    // Create data-only backup
    console.log('📦 Creating data-only backup...');
    const dataFile = path.join(backupDir, `data_only_${today}.sql`);
    const dataCmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --data-only --no-owner --no-acl -f "${dataFile}"`;
    
    await execAsync(dataCmd);
    const dataSize = (fs.statSync(dataFile).size / 1024 / 1024).toFixed(2);
    console.log(`   ✅ Data saved: ${path.basename(dataFile)} (${dataSize} MB)\n`);

    // Create full backup (schema + data)
    console.log('💾 Creating full backup (schema + data)...');
    const fullFile = path.join(backupDir, `full_backup_pgdump_${today}.sql`);
    const fullCmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-owner --no-acl -f "${fullFile}"`;
    
    await execAsync(fullCmd);
    const fullSize = (fs.statSync(fullFile).size / 1024 / 1024).toFixed(2);
    console.log(`   ✅ Full backup saved: ${path.basename(fullFile)} (${fullSize} MB)\n`);

    // Create custom format backup (compressed, can be restored with pg_restore)
    console.log('🗜️  Creating compressed custom format backup...');
    const customFile = path.join(backupDir, `full_backup_custom_${today}.dump`);
    const customCmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-owner --no-acl -Fc -f "${customFile}"`;
    
    await execAsync(customCmd);
    const customSize = (fs.statSync(customFile).size / 1024 / 1024).toFixed(2);
    console.log(`   ✅ Custom format backup saved: ${path.basename(customFile)} (${customSize} MB)\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('📊 BACKUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Schema-only: schema_only_${today}.sql (${schemaSize} MB)`);
    console.log(`✅ Data-only: data_only_${today}.sql (${dataSize} MB)`);
    console.log(`✅ Full backup: full_backup_pgdump_${today}.sql (${fullSize} MB)`);
    console.log(`✅ Custom format: full_backup_custom_${today}.dump (${customSize} MB)`);
    console.log(`\n📁 Backup location: ${backupDir}`);
    console.log('='.repeat(60));
    console.log('\n✅ Full database backup completed successfully!');
    console.log('\n💡 To restore:');
    console.log(`   psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} < full_backup_pgdump_${today}.sql`);
    console.log(`   OR: pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} full_backup_custom_${today}.dump`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stderr) {
      console.error('Error details:', error.stderr);
    }
    process.exit(1);
  }
}

backupWithPgDump();
