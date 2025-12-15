#!/usr/bin/env node

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

async function checkAllBranches() {
  console.log('🔍 Checking All Branches in Database...\n');

  try {
    // Check store_locations table (main branches table)
    console.log('🏪 Checking store_locations table:');
    const storeLocationsResult = await pool.query(`
      SELECT * FROM store_locations ORDER BY name
    `);

    const storeLocations = storeLocationsResult.rows;
    console.log(`✅ Found ${storeLocations.length} branches in store_locations:\n`);

    storeLocations.forEach((branch, idx) => {
      console.log(`   ${idx + 1}. ${branch.name || 'Unnamed Branch'}`);
      console.log(`      ID: ${branch.id}`);
      console.log(`      Active: ${branch.is_active ? 'Yes' : 'No'}`);
      console.log(`      Created: ${branch.created_at}`);
      console.log(`      All fields:`, Object.keys(branch).join(', '));
      console.log('');
    });

    // Check lats_branches table if it exists
    console.log('📋 Checking lats_branches table:');
    try {
      const latsBranchesResult = await pool.query(`
        SELECT id, name, location, phone, email, is_active, created_at
        FROM lats_branches
        ORDER BY name
      `);

      const latsBranches = latsBranchesResult.rows;
      console.log(`✅ Found ${latsBranches.length} branches in lats_branches:\n`);

      latsBranches.forEach((branch, idx) => {
        console.log(`   ${idx + 1}. ${branch.name || 'Unnamed Branch'}`);
        console.log(`      ID: ${branch.id}`);
        console.log(`      Location: ${branch.location || 'Not set'}`);
        console.log(`      Phone: ${branch.phone || 'Not set'}`);
        console.log(`      Email: ${branch.email || 'Not set'}`);
        console.log(`      Active: ${branch.is_active ? 'Yes' : 'No'}`);
        console.log('');
      });
    } catch (error) {
      console.log('ℹ️  lats_branches table not found or accessible');
    }

    // Summary
    console.log('='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log(`   • store_locations: ${storeLocations.length} branches`);
    console.log(`   • Total active branches: ${storeLocations.filter(b => b.is_active).length}`);

    if (storeLocations.length > 0) {
      console.log('\n🏪 ACTIVE BRANCHES:');
      storeLocations.filter(b => b.is_active).forEach((branch, idx) => {
        console.log(`   ${idx + 1}. ${branch.name} (${branch.location || 'No location'})`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking branches:', error.message);
  } finally {
    await pool.end();
  }
}

checkAllBranches();
