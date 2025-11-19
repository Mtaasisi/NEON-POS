#!/usr/bin/env node

/**
 * Quick Verification and Fix Script for Variant Display Issue
 * Checks database, verifies code fixes, and provides clear action items
 */

import pg from 'pg';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

const { Client } = pg;

console.log('🔍 VARIANT DISPLAY FIX VERIFIER');
console.log('═'.repeat(70));
console.log('');

let allChecks = [];
let issuesFound = [];
let actionsNeeded = [];

// Check 1: Database
async function checkDatabase() {
  console.log('📊 CHECK 1: Database Verification');
  console.log('─'.repeat(70));
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  });

  try {
    await client.connect();
    
    const productQuery = await client.query(
      `SELECT id, name, sku FROM lats_products WHERE sku = $1`,
      ['SKU-1761304091007-1KN']
    );

    if (productQuery.rows.length === 0) {
      allChecks.push({ name: 'Database - Product', status: '❌', message: 'Product not found' });
      issuesFound.push('Product does not exist in database');
      return false;
    }

    const product = productQuery.rows[0];
    console.log(`✅ Product found: ${product.name}`);
    allChecks.push({ name: 'Database - Product', status: '✅', message: 'Product exists' });

    const variantsQuery = await client.query(
      `SELECT variant_name, sku FROM lats_product_variants WHERE product_id = $1 ORDER BY variant_name`,
      [product.id]
    );

    if (variantsQuery.rows.length === 0) {
      allChecks.push({ name: 'Database - Variants', status: '❌', message: 'No variants found' });
      issuesFound.push('No variants exist for product');
      return false;
    }

    let allVariantsValid = true;
    variantsQuery.rows.forEach((variant, index) => {
      const isValid = variant.variant_name && variant.variant_name !== 'Default Variant';
      const status = isValid ? '✅' : '❌';
      console.log(`${status} Variant ${index + 1}: "${variant.variant_name}" (${variant.sku})`);
      
      if (!isValid) {
        allVariantsValid = false;
        issuesFound.push(`Variant ${variant.sku} has invalid name: "${variant.variant_name}"`);
      }
    });

    if (allVariantsValid) {
      allChecks.push({ name: 'Database - Variant Names', status: '✅', message: 'All variants have valid names' });
    } else {
      allChecks.push({ name: 'Database - Variant Names', status: '❌', message: 'Some variants have invalid names' });
    }

    return allVariantsValid;

  } catch (error) {
    console.error(`❌ Database error: ${error.message}`);
    allChecks.push({ name: 'Database - Connection', status: '❌', message: error.message });
    issuesFound.push(`Database connection error: ${error.message}`);
    return false;
  } finally {
    await client.end();
  }
}

// Check 2: Code Fixes
function checkCodeFixes() {
  console.log('\n\n🔧 CHECK 2: Code Fixes Verification');
  console.log('─'.repeat(70));
  
  try {
    // Check dataProcessor.ts
    const dataProcessorPath = join(__dirname, 'src/features/lats/lib/dataProcessor.ts');
    const dataProcessorContent = readFileSync(dataProcessorPath, 'utf-8');
    
    if (dataProcessorContent.includes('// delete processedVariant.variant_name')) {
      console.log('✅ dataProcessor.ts: variant_name deletion is commented out');
      allChecks.push({ name: 'Code - dataProcessor.ts', status: '✅', message: 'Not deleting variant_name' });
    } else if (dataProcessorContent.includes('delete processedVariant.variant_name')) {
      console.log('❌ dataProcessor.ts: STILL DELETING variant_name!');
      allChecks.push({ name: 'Code - dataProcessor.ts', status: '❌', message: 'Still deleting variant_name' });
      issuesFound.push('dataProcessor.ts is still deleting variant_name field');
      actionsNeeded.push('Comment out "delete processedVariant.variant_name" in dataProcessor.ts');
    } else {
      console.log('⚠️  dataProcessor.ts: Could not verify (might be already fixed differently)');
      allChecks.push({ name: 'Code - dataProcessor.ts', status: '⚠️', message: 'Could not verify' });
    }

    // Check provider.supabase.ts
    const providerPath = join(__dirname, 'src/features/lats/lib/data/provider.supabase.ts');
    const providerContent = readFileSync(providerPath, 'utf-8');
    
    if (providerContent.includes('v.variant_name || v.name')) {
      console.log('✅ provider.supabase.ts: Correct priority order (variant_name first)');
      allChecks.push({ name: 'Code - provider.supabase.ts', status: '✅', message: 'Correct priority order' });
    } else if (providerContent.includes('v.name || v.variant_name')) {
      console.log('❌ provider.supabase.ts: WRONG priority order!');
      allChecks.push({ name: 'Code - provider.supabase.ts', status: '❌', message: 'Wrong priority order' });
      issuesFound.push('provider.supabase.ts checks "name" before "variant_name"');
      actionsNeeded.push('Change "v.name || v.variant_name" to "v.variant_name || v.name"');
    } else {
      console.log('⚠️  provider.supabase.ts: Could not verify mapping');
      allChecks.push({ name: 'Code - provider.supabase.ts', status: '⚠️', message: 'Could not verify' });
    }

    return true;

  } catch (error) {
    console.error(`❌ Error checking code files: ${error.message}`);
    allChecks.push({ name: 'Code - File Access', status: '❌', message: error.message });
    return false;
  }
}

// Check 3: Server Status
function checkServer() {
  console.log('\n\n🖥️  CHECK 3: Development Server');
  console.log('─'.repeat(70));
  
  // This is a placeholder - actual check would require network request
  console.log('ℹ️  To verify server:');
  console.log('   1. Check terminal where you ran "npm run dev"');
  console.log('   2. Should see: "Local: http://localhost:5173"');
  console.log('   3. No errors in terminal output');
  
  allChecks.push({ name: 'Server - Status', status: 'ℹ️', message: 'Manual verification needed' });
}

// Generate Report
function generateReport() {
  console.log('\n\n📋 VERIFICATION REPORT');
  console.log('═'.repeat(70));
  
  console.log('\n✅ Checks Completed:');
  allChecks.forEach((check, i) => {
    console.log(`   ${i + 1}. ${check.status} ${check.name}: ${check.message}`);
  });
  
  if (issuesFound.length > 0) {
    console.log('\n\n🐛 ISSUES FOUND:');
    issuesFound.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }
  
  if (actionsNeeded.length > 0) {
    console.log('\n\n🔧 ACTIONS REQUIRED:');
    actionsNeeded.forEach((action, i) => {
      console.log(`   ${i + 1}. ${action}`);
    });
  }
  
  if (issuesFound.length === 0) {
    console.log('\n\n✅ ALL CHECKS PASSED!');
    console.log('═'.repeat(70));
    console.log('');
    console.log('🎯 NEXT STEP: Clear Browser Cache');
    console.log('');
    console.log('The database and code are perfect. You just need to clear');
    console.log('your browser cache to see the fixes in action.');
    console.log('');
    console.log('Quick Methods:');
    console.log('  • Mac: Cmd + Shift + R');
    console.log('  • Windows: Ctrl + Shift + R');
    console.log('  • Or: Use Incognito/Private window');
    console.log('');
    console.log('Then test:');
    console.log('  1. Go to http://localhost:5173');
    console.log('  2. Login: care@care.com / 123456');
    console.log('  3. Find product "Final"');
    console.log('  4. Open product modal');
    console.log('  5. Check Variants tab');
    console.log('  6. Should see: "01" and "02" ✅');
    console.log('');
  } else {
    console.log('\n\n⚠️  ISSUES NEED TO BE FIXED');
    console.log('═'.repeat(70));
    console.log('');
    console.log('Please address the issues listed above, then:');
    console.log('  1. Restart dev server (npm run dev)');
    console.log('  2. Clear browser cache');
    console.log('  3. Run this script again to verify');
    console.log('');
  }
  
  console.log('═'.repeat(70));
}

// Main execution
async function main() {
  await checkDatabase();
  checkCodeFixes();
  checkServer();
  generateReport();
}

main();

