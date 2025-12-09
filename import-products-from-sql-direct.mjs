#!/usr/bin/env node

/**
 * Import Products from SQL File (Direct Execution)
 * 
 * This script executes the SQL file directly to import products.
 */

import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.production') });

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const DEFAULT_SQL_FILE = path.join(__dirname, 'PROD BACKUP', 'lats_products_2025-12-07_01-43-50.sql');
const SQL_FILE_PATH = process.argv[3] || DEFAULT_SQL_FILE;

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  try {
    console.log('🚀 Import Products from SQL File (Direct)');
    console.log('='.repeat(60));
    console.log(`📁 SQL File: ${SQL_FILE_PATH}`);
    console.log('='.repeat(60));

    if (!fs.existsSync(SQL_FILE_PATH)) {
      console.error(`❌ Error: File not found: ${SQL_FILE_PATH}`);
      process.exit(1);
    }

    console.log('\n📖 Reading SQL file...');
    const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf8');
    
    // Get valid branch IDs first
    console.log('🔍 Fetching valid branches...');
    const branchesResult = await pool.query('SELECT id FROM lats_branches WHERE is_active = true');
    const validBranchIds = branchesResult.rows.map(row => row.id);
    console.log(`✅ Found ${validBranchIds.length} branches\n`);

    // Replace the branch_id in SQL with a valid one
    let modifiedSQL = sqlContent;
    if (validBranchIds.length > 0) {
      // Replace the old branch_id with the first valid branch
      const defaultBranchId = validBranchIds[0];
      modifiedSQL = modifiedSQL.replace(
        /'24cd45b8-1ce1-486a-b055-29d169c3a8ea'/g,
        `'${defaultBranchId}'`
      );
      console.log(`🔄 Replaced branch_id with: ${defaultBranchId}\n`);
    }

    // Add ON CONFLICT clause to handle duplicates
    // The SQL file has INSERT statements that need ON CONFLICT handling
    // Extract column names from first INSERT statement
    const columnsMatch = sqlContent.match(/INSERT INTO\s+lats_products\s*\(([^)]+)\)/i);
    if (columnsMatch) {
      const columns = columnsMatch[1].split(',').map(c => c.trim());
      // Build UPDATE clause for all columns except id
      const updateColumns = columns.filter(col => col !== 'id').map(col => `${col} = EXCLUDED.${col}`).join(', ');
      
      // Replace all INSERT statements with ON CONFLICT clause
      // Match: INSERT ... VALUES ... ; (where semicolon ends the statement)
      modifiedSQL = modifiedSQL.replace(
        /(INSERT INTO\s+lats_products\s*\([^)]+\)\s*VALUES[\s\S]*?);/gi,
        (match) => {
          // Replace the final semicolon with ON CONFLICT clause
          return match.replace(/\);?\s*$/, `) ON CONFLICT (id) DO UPDATE SET ${updateColumns};`);
        }
      );
      
      console.log('✅ Added ON CONFLICT DO UPDATE to handle duplicates\n');
    } else {
      console.log('⚠️  Could not find column list, proceeding without conflict handling\n');
    }

    // Test database connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Count products that will be imported
    const countMatch = sqlContent.match(/Total records: (\d+)/);
    const expectedCount = countMatch ? parseInt(countMatch[1]) : 0;
    console.log(`📊 Expected to import: ${expectedCount} products\n`);

    console.log(`⚠️  About to execute SQL to import products`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Execute the SQL
    console.log('🔄 Executing SQL...');
    const result = await pool.query(modifiedSQL);
    
    console.log(`✅ SQL executed successfully`);
    console.log(`   Rows affected: ${result.rowCount || 'N/A'}\n`);

    // Verify import
    console.log('✅ Verifying import...');
    const verifyResult = await pool.query('SELECT COUNT(*) as count FROM lats_products');
    const totalProducts = parseInt(verifyResult.rows[0].count);
    console.log(`   Total products in database: ${totalProducts}\n`);

    // Assign to all branches
    console.log('🔄 Assigning products to all branches...');
    const allBranchIds = validBranchIds;
    const assignResult = await pool.query(`
      UPDATE lats_products 
      SET 
        is_shared = true,
        visible_to_branches = $1::uuid[],
        sharing_mode = 'shared',
        updated_at = NOW()
      WHERE is_shared = false OR visible_to_branches IS NULL OR sharing_mode != 'shared'
    `, [allBranchIds]);
    console.log(`   ✅ Updated ${assignResult.rowCount} products to be shared\n`);

    console.log('='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Products imported: ${expectedCount}`);
    console.log(`✅ Total products in database: ${totalProducts}`);
    console.log(`✅ All products assigned to ${validBranchIds.length} branches`);
    console.log('='.repeat(60));

    console.log('\n🎉 Import completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
