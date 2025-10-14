#!/usr/bin/env node

/**
 * Automatic Purchase Order Branch ID Fix
 * Fixes existing purchase orders that are not showing in UI due to missing branch_id
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${c.cyan}${c.bright}`);
console.log('═══════════════════════════════════════════════════════════');
console.log('🔧 AUTOMATIC PURCHASE ORDER BRANCH ID FIX');
console.log('═══════════════════════════════════════════════════════════');
console.log(`${c.reset}\n`);

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = join(__dirname, '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return env;
  } catch (error) {
    console.error(`${c.red}❌ Error loading .env file:${c.reset}`, error.message);
    console.log(`\n${c.yellow}💡 Make sure you have a .env file with:${c.reset}`);
    console.log('   VITE_DATABASE_URL=your_database_url\n');
    process.exit(1);
  }
}

async function main() {
  try {
    // Load environment
    const env = loadEnv();
    const databaseUrl = env.VITE_DATABASE_URL || env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error(`${c.red}❌ Missing database URL in .env file${c.reset}`);
      console.log(`\n${c.yellow}Please add to your .env file:${c.reset}`);
      console.log('   VITE_DATABASE_URL=your_neon_database_url\n');
      process.exit(1);
    }
    
    console.log(`${c.green}✅ Found database URL${c.reset}`);
    console.log(`${c.blue}📍 URL: ${databaseUrl.substring(0, 50)}...${c.reset}\n`);
    
    // Create Neon SQL client
    const sql = neon(databaseUrl, { fullResults: true });
    
    console.log(`${c.cyan}${c.bright}STEP 1: Checking Purchase Orders${c.reset}`);
    console.log('─'.repeat(60));
    
    // Check purchase orders without branch_id
    const checkResult = await sql`
      SELECT 
        id,
        po_number,
        supplier_id,
        status,
        total_amount,
        branch_id,
        created_at,
        CASE 
          WHEN branch_id IS NULL THEN 'NO BRANCH ID'
          ELSE 'HAS BRANCH ID'
        END as branch_status
      FROM lats_purchase_orders
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    console.log(`\n${c.blue}Found ${checkResult.rows.length} purchase orders:${c.reset}`);
    
    let ordersWithoutBranch = 0;
    checkResult.rows.forEach(row => {
      if (!row.branch_id) {
        ordersWithoutBranch++;
        console.log(`${c.yellow}  ⚠️  ${row.po_number} - NO BRANCH ID - Status: ${row.status}${c.reset}`);
      } else {
        console.log(`${c.green}  ✅ ${row.po_number} - Has Branch ID - Status: ${row.status}${c.reset}`);
      }
    });
    
    if (ordersWithoutBranch === 0) {
      console.log(`\n${c.green}${c.bright}✅ All purchase orders already have branch_id!${c.reset}`);
      console.log(`${c.green}No fixes needed.${c.reset}\n`);
      return;
    }
    
    console.log(`\n${c.cyan}${c.bright}STEP 2: Getting Main Branch${c.reset}`);
    console.log('─'.repeat(60));
    
    // Get main branch or first branch
    const branchResult = await sql`
      SELECT id, name, is_main
      FROM store_locations
      WHERE is_main = true
      LIMIT 1
    `;
    
    let branchId;
    let branchName;
    
    if (branchResult.rows.length > 0) {
      branchId = branchResult.rows[0].id;
      branchName = branchResult.rows[0].name;
      console.log(`${c.green}✅ Found main branch: ${branchName}${c.reset}`);
    } else {
      // Get first branch
      const firstBranchResult = await sql`
        SELECT id, name
        FROM store_locations
        ORDER BY created_at ASC
        LIMIT 1
      `;
      
      if (firstBranchResult.rows.length === 0) {
        console.error(`${c.red}❌ No branches found in database!${c.reset}`);
        console.log(`${c.yellow}Please create a branch first.${c.reset}\n`);
        process.exit(1);
      }
      
      branchId = firstBranchResult.rows[0].id;
      branchName = firstBranchResult.rows[0].name;
      console.log(`${c.yellow}⚠️  No main branch found, using first branch: ${branchName}${c.reset}`);
    }
    
    console.log(`${c.blue}📍 Branch ID: ${branchId}${c.reset}\n`);
    
    console.log(`${c.cyan}${c.bright}STEP 3: Updating Purchase Orders${c.reset}`);
    console.log('─'.repeat(60));
    
    // Update purchase orders without branch_id
    const updateResult = await sql`
      UPDATE lats_purchase_orders
      SET 
        branch_id = ${branchId},
        updated_at = NOW()
      WHERE branch_id IS NULL
      RETURNING id, po_number, status
    `;
    
    console.log(`\n${c.green}${c.bright}✅ Updated ${updateResult.rows.length} purchase order(s) with branch_id${c.reset}`);
    
    if (updateResult.rows.length > 0) {
      console.log(`\n${c.blue}Updated orders:${c.reset}`);
      updateResult.rows.forEach(row => {
        console.log(`${c.green}  ✅ ${row.po_number} (${row.status})${c.reset}`);
      });
    }
    
    console.log(`\n${c.cyan}${c.bright}STEP 4: Verification${c.reset}`);
    console.log('─'.repeat(60));
    
    // Verify all purchase orders now have branch_id
    const verifyResult = await sql`
      SELECT 
        po.id,
        po.po_number,
        po.status,
        po.total_amount,
        b.name as branch_name,
        po.created_at,
        CASE 
          WHEN po.branch_id IS NULL THEN 'NO BRANCH'
          ELSE 'HAS BRANCH'
        END as status_check
      FROM lats_purchase_orders po
      LEFT JOIN store_locations b ON b.id = po.branch_id
      ORDER BY po.created_at DESC
      LIMIT 10
    `;
    
    console.log(`\n${c.blue}Latest purchase orders:${c.reset}`);
    verifyResult.rows.forEach(row => {
      const icon = row.branch_name ? '✅' : '❌';
      const color = row.branch_name ? c.green : c.red;
      console.log(`${color}  ${icon} ${row.po_number} - Branch: ${row.branch_name || 'NONE'} - ${row.status}${c.reset}`);
    });
    
    console.log(`\n${c.green}${c.bright}═══════════════════════════════════════════════════════════`);
    console.log('✅ PURCHASE ORDER FIX COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`${c.reset}\n`);
    
    console.log(`${c.cyan}${c.bright}📋 NEXT STEPS:${c.reset}`);
    console.log(`${c.yellow}1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)${c.reset}`);
    console.log(`${c.yellow}2. Go to Purchase Orders page${c.reset}`);
    console.log(`${c.yellow}3. Your purchase orders should now be visible!${c.reset}\n`);
    
    console.log(`${c.cyan}${c.bright}🔍 VERIFICATION:${c.reset}`);
    console.log(`${c.yellow}Open browser console (F12) and run:${c.reset}`);
    console.log(`${c.blue}  localStorage.getItem('current_branch_id')${c.reset}`);
    console.log(`${c.yellow}It should return: ${branchId}${c.reset}\n`);
    
  } catch (error) {
    console.error(`\n${c.red}${c.bright}❌ ERROR:${c.reset}`, error.message);
    console.error(`\n${c.red}Stack trace:${c.reset}`, error.stack);
    process.exit(1);
  }
}

// Run the fix
main();

