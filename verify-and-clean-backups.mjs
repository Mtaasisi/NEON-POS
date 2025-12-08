import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.argv[2] || 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const client = new Client({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const backupDir = path.join(__dirname, 'json backup');

async function verifyAndClean() {
  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    // Get actual table columns from database
    console.log('📊 Checking table schemas...\n');
    
    const productsColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'lats_products'
      ORDER BY ordinal_position
    `);
    
    const customersColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'customers'
      ORDER BY ordinal_position
    `);

    console.log(`📦 lats_products: ${productsColumns.rows.length} columns`);
    console.log(`👥 customers: ${customersColumns.rows.length} columns\n`);

    // Check latest backup files
    const files = fs.readdirSync(backupDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const sqlFiles = files.filter(f => f.endsWith('.sql'));

    // Find latest backups
    const latestProductsJson = jsonFiles.filter(f => f.startsWith('lats_products_')).sort().pop();
    const latestCustomersJson = jsonFiles.filter(f => f.startsWith('customers_')).sort().pop();

    if (latestProductsJson) {
      console.log(`📄 Checking latest products backup: ${latestProductsJson}`);
      const productsData = JSON.parse(fs.readFileSync(path.join(backupDir, latestProductsJson), 'utf8'));
      if (productsData.length > 0) {
        const backupColumns = Object.keys(productsData[0]);
        console.log(`   Backup has ${backupColumns.length} columns`);
        console.log(`   Database has ${productsColumns.rows.length} columns`);
        
        const missingInBackup = productsColumns.rows
          .map(r => r.column_name)
          .filter(col => !backupColumns.includes(col));
        
        if (missingInBackup.length > 0) {
          console.log(`   ⚠️  Missing columns in backup: ${missingInBackup.join(', ')}`);
        } else {
          console.log(`   ✅ All columns backed up!`);
        }
      }
    }

    if (latestCustomersJson) {
      console.log(`\n📄 Checking latest customers backup: ${latestCustomersJson}`);
      const customersData = JSON.parse(fs.readFileSync(path.join(backupDir, latestCustomersJson), 'utf8'));
      if (customersData.length > 0) {
        const backupColumns = Object.keys(customersData[0]);
        console.log(`   Backup has ${backupColumns.length} columns`);
        console.log(`   Database has ${customersColumns.rows.length} columns`);
        
        const missingInBackup = customersColumns.rows
          .map(r => r.column_name)
          .filter(col => !backupColumns.includes(col));
        
        if (missingInBackup.length > 0) {
          console.log(`   ⚠️  Missing columns in backup: ${missingInBackup.join(', ')}`);
        } else {
          console.log(`   ✅ All columns backed up!`);
        }
      }
    }

    // Clean up old backups (keep only the latest)
    console.log('\n🧹 Cleaning up old backups...');
    
    const productsBackups = jsonFiles.filter(f => f.startsWith('lats_products_')).sort();
    const customersBackups = jsonFiles.filter(f => f.startsWith('customers_')).sort();
    
    let deletedCount = 0;
    
    // Delete old products backups
    if (productsBackups.length > 1) {
      const toDelete = productsBackups.slice(0, -1); // All except the last one
      for (const file of toDelete) {
        const jsonFile = path.join(backupDir, file);
        const sqlFile = path.join(backupDir, file.replace('.json', '.sql'));
        
        if (fs.existsSync(jsonFile)) {
          fs.unlinkSync(jsonFile);
          deletedCount++;
          console.log(`   🗑️  Deleted: ${file}`);
        }
        if (fs.existsSync(sqlFile)) {
          fs.unlinkSync(sqlFile);
          deletedCount++;
          console.log(`   🗑️  Deleted: ${file.replace('.json', '.sql')}`);
        }
      }
    }
    
    // Delete old customers backups
    if (customersBackups.length > 1) {
      const toDelete = customersBackups.slice(0, -1); // All except the last one
      for (const file of toDelete) {
        const jsonFile = path.join(backupDir, file);
        const sqlFile = path.join(backupDir, file.replace('.json', '.sql'));
        
        if (fs.existsSync(jsonFile)) {
          fs.unlinkSync(jsonFile);
          deletedCount++;
          console.log(`   🗑️  Deleted: ${file}`);
        }
        if (fs.existsSync(sqlFile)) {
          fs.unlinkSync(sqlFile);
          deletedCount++;
          console.log(`   🗑️  Deleted: ${file.replace('.json', '.sql')}`);
        }
      }
    }
    
    if (deletedCount === 0) {
      console.log(`   ✅ No old backups to clean up`);
    } else {
      console.log(`\n   ✅ Cleaned up ${deletedCount} old backup files`);
    }

    // Show remaining files
    const remainingFiles = fs.readdirSync(backupDir);
    console.log(`\n📁 Remaining backup files (${remainingFiles.length}):`);
    remainingFiles.forEach(f => {
      const filePath = path.join(backupDir, f);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   - ${f} (${sizeMB} MB)`);
    });

    await client.end();
    console.log('\n✅ Verification and cleanup completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

verifyAndClean();
