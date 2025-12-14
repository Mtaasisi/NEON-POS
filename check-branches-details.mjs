#!/usr/bin/env node

/**
 * Check Branch Details
 * 
 * This script checks all branches in the database and their details
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.production') });

// Database configuration
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({ connectionString: DATABASE_URL });

async function checkBranches() {
  try {
    console.log('🔍 Checking Branches in Database');
    console.log('='.repeat(60));
    console.log('');

    // Check lats_branches table
    console.log('📋 Checking lats_branches table...');
    try {
      const branchesResult = await pool.query(`
        SELECT id, name, location, phone, email, is_active, created_at, updated_at 
        FROM lats_branches 
        ORDER BY name
      `);
      const branches = branchesResult.rows;
      
      console.log(`✅ Found ${branches.length} branches in lats_branches:\n`);
      branches.forEach((branch, idx) => {
        console.log(`   ${idx + 1}. ${branch.name || 'Unnamed'}`);
        console.log(`      ID: ${branch.id}`);
        console.log(`      Location: ${branch.location || 'Not set'}`);
        console.log(`      Phone: ${branch.phone || 'Not set'}`);
        console.log(`      Email: ${branch.email || 'Not set'}`);
        console.log(`      Active: ${branch.is_active ? 'Yes' : 'No'}`);
        console.log(`      Created: ${branch.created_at ? new Date(branch.created_at).toLocaleString() : 'Unknown'}`);
        console.log('');
      });
    } catch (error) {
      console.log(`   ⚠️  Error querying lats_branches: ${error.message}`);
    }

    // Check store_locations table
    console.log('📋 Checking store_locations table...');
    try {
      const locationsResult = await pool.query(`
        SELECT id, name, code, location, phone, email, is_active, 
               data_isolation_mode, share_products, share_customers, 
               share_inventory, created_at, updated_at
        FROM store_locations 
        WHERE is_active = true
        ORDER BY name
      `);
      const locations = locationsResult.rows;
      
      console.log(`✅ Found ${locations.length} active locations in store_locations:\n`);
      locations.forEach((location, idx) => {
        console.log(`   ${idx + 1}. ${location.name || 'Unnamed'}`);
        if (location.code) {
          console.log(`      Code: ${location.code}`);
        }
        console.log(`      ID: ${location.id}`);
        console.log(`      Location: ${location.location || 'Not set'}`);
        console.log(`      Phone: ${location.phone || 'Not set'}`);
        console.log(`      Email: ${location.email || 'Not set'}`);
        console.log(`      Isolation Mode: ${location.data_isolation_mode || 'Not set'}`);
        console.log(`      Share Products: ${location.share_products !== null ? location.share_products : 'Not set'}`);
        console.log(`      Share Customers: ${location.share_customers !== null ? location.share_customers : 'Not set'}`);
        console.log(`      Share Inventory: ${location.share_inventory !== null ? location.share_inventory : 'Not set'}`);
        console.log(`      Created: ${location.created_at ? new Date(location.created_at).toLocaleString() : 'Unknown'}`);
        console.log('');
      });
    } catch (error) {
      console.log(`   ⚠️  Error querying store_locations: ${error.message}`);
    }

    // Check products distribution
    console.log('📦 Checking Products Distribution by Branch...');
    try {
      const productsResult = await pool.query(`
        SELECT 
          p.branch_id,
          b.name as branch_name,
          COUNT(*) as product_count,
          COUNT(CASE WHEN p.is_shared = true THEN 1 END) as shared_count
        FROM lats_products p
        LEFT JOIN lats_branches b ON p.branch_id = b.id
        GROUP BY p.branch_id, b.name
        ORDER BY product_count DESC
      `);
      
      console.log(`\n   Products per branch:\n`);
      productsResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.branch_name || 'Unknown Branch'} (${row.branch_id})`);
        console.log(`      Total Products: ${row.product_count}`);
        console.log(`      Shared Products: ${row.shared_count}`);
        console.log('');
      });
    } catch (error) {
      console.log(`   ⚠️  Error checking products: ${error.message}`);
    }

    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the check
checkBranches();

