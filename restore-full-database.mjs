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
  console.error('Usage: node restore-full-database.mjs "postgresql://postgres:PASSWORD@host:5432/postgres"');
  console.error('Or set DATABASE_URL environment variable');
  process.exit(1);
}

// Parse connection string
const url = new URL(connectionString);
const dbHost = url.hostname;
const dbPort = url.port || '5432';
const dbName = url.pathname.replace('/', '');
const dbUser = url.username;
// Decode URL-encoded password (e.g., %40 becomes @)
const dbPassword = decodeURIComponent(url.password || '');

// Find backup file
const backupDir = path.join(__dirname, 'DEV BACKUP');
const backupFiles = fs.readdirSync(backupDir);

// Look for the best backup file to restore
let backupFile = null;
let backupType = null;

// Prefer custom format dump (best for restoration)
const customDump = backupFiles.find(f => f.endsWith('.dump') && f.includes('custom'));
if (customDump) {
  backupFile = path.join(backupDir, customDump);
  backupType = 'custom';
  console.log(`📦 Found custom format backup: ${customDump}`);
} else {
  // Fall back to full SQL backup
  const fullBackup = backupFiles.find(f => f.endsWith('.sql') && (f.includes('full_backup') || f.includes('pgdump')));
  if (fullBackup) {
    backupFile = path.join(backupDir, fullBackup);
    backupType = 'sql';
    console.log(`📦 Found SQL backup: ${fullBackup}`);
  } else {
    console.error('❌ Error: No suitable backup file found in DEV BACKUP folder');
    console.error('   Looking for:');
    console.error('   - *.dump (custom format)');
    console.error('   - *full_backup*.sql or *pgdump*.sql');
    console.error('\n   Available files:');
    backupFiles.forEach(f => console.error(`     - ${f}`));
    process.exit(1);
  }
}

async function restoreDatabase() {
  console.log('\n🔍 Starting Database Restoration\n');
  console.log('⚠️  WARNING: This will REPLACE ALL DATA in the target database!\n');
  console.log('📊 Target Database:');
  console.log(`   Host: ${dbHost}`);
  console.log(`   Port: ${dbPort}`);
  console.log(`   Database: ${dbName}`);
  console.log(`   User: ${dbUser}`);
  console.log(`   Backup: ${path.basename(backupFile)}`);
  console.log('');

  try {
    // Set PGPASSWORD environment variable
    process.env.PGPASSWORD = dbPassword;

    if (backupType === 'custom') {
      // Restore from custom format dump using pg_restore
      console.log('📦 Restoring from custom format dump...');
      console.log('   This may take several minutes depending on database size...\n');
      
      // First, clean the database (drop all existing objects)
      console.log('🧹 Step 1: Cleaning existing database objects...');
      const cleanCmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"`;
      
      try {
        await execAsync(cleanCmd);
        console.log('   ✅ Database cleaned\n');
      } catch (error) {
        console.log('   ⚠️  Could not clean database (may not be necessary):', error.message);
        console.log('   Continuing with restore...\n');
      }

      // Restore using pg_restore
      console.log('📥 Step 2: Restoring database from backup...');
      const restoreCmd = `pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-owner --no-acl --verbose "${backupFile}"`;
      
      const { stdout, stderr } = await execAsync(restoreCmd);
      
      if (stderr && !stderr.includes('WARNING')) {
        console.error('⚠️  Warnings during restore:', stderr);
      }
      
      console.log('\n   ✅ Database restored successfully!');
      
    } else {
      // Restore from SQL file using psql
      console.log('📦 Restoring from SQL file...');
      console.log('   This may take several minutes depending on database size...\n');
      
      // First, clean the database
      console.log('🧹 Step 1: Cleaning existing database objects...');
      const cleanCmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"`;
      
      try {
        await execAsync(cleanCmd);
        console.log('   ✅ Database cleaned\n');
      } catch (error) {
        console.log('   ⚠️  Could not clean database (may not be necessary):', error.message);
        console.log('   Continuing with restore...\n');
      }

      // Restore using psql
      console.log('📥 Step 2: Restoring database from backup...');
      const restoreCmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backupFile}"`;
      
      const { stdout, stderr } = await execAsync(restoreCmd);
      
      if (stderr && !stderr.includes('WARNING') && !stderr.includes('NOTICE')) {
        console.error('⚠️  Errors during restore:', stderr);
      } else {
        console.log('\n   ✅ Database restored successfully!');
      }
    }

    // Verify restoration
    console.log('\n✅ Step 3: Verifying restoration...');
    const verifyCmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"`;
    
    const { stdout: verifyOutput } = await execAsync(verifyCmd);
    const tableCount = verifyOutput.match(/\s+(\d+)\s+/)?.[1] || 'unknown';
    
    console.log(`   ✅ Found ${tableCount} tables in restored database`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESTORATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Database: ${dbName}`);
    console.log(`✅ Backup file: ${path.basename(backupFile)}`);
    console.log(`✅ Tables restored: ${tableCount}`);
    console.log(`✅ Restoration completed successfully!`);
    console.log('='.repeat(60));

    console.log('\n✅ Database restoration completed!');
  } catch (error) {
    console.error('\n❌ Error during restoration:', error.message);
    if (error.stderr) {
      console.error('Error details:', error.stderr);
    }
    process.exit(1);
  }
}

restoreDatabase();
