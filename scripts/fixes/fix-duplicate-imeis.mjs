#!/usr/bin/env node

/**
 * Fix Duplicate IMEIs Script
 * Finds and resolves duplicate IMEI entries before applying unique index
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  max: 1,
  ssl: 'require'
});

console.log('');
console.log('═'.repeat(70));
console.log('  DUPLICATE IMEI CHECKER & FIXER');
console.log('═'.repeat(70));
console.log('');

async function fixDuplicates() {
  try {
    // Find duplicate IMEIs
    console.log('🔍 Checking for duplicate IMEIs...');
    console.log('');
    
    const duplicates = await sql`
      SELECT 
        variant_attributes->>'imei' as imei,
        COUNT(*) as count,
        array_agg(id ORDER BY created_at) as variant_ids,
        array_agg(is_active ORDER BY created_at) as active_status,
        array_agg(created_at ORDER BY created_at) as created_dates
      FROM lats_product_variants
      WHERE variant_attributes->>'imei' IS NOT NULL
        AND variant_attributes->>'imei' != ''
      GROUP BY variant_attributes->>'imei'
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `;
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate IMEIs found!');
      console.log('   Your database is clean and ready for the unique index.');
      console.log('');
      return;
    }
    
    console.log(`⚠️  Found ${duplicates.length} duplicate IMEI(s):`);
    console.log('');
    
    let totalDuplicates = 0;
    duplicates.forEach((d, index) => {
      console.log(`${index + 1}. IMEI: ${d.imei}`);
      console.log(`   Occurrences: ${d.count}`);
      console.log(`   IDs: ${d.variant_ids.join(', ')}`);
      console.log(`   Active: ${d.active_status.map(a => a ? '✓' : '✗').join(', ')}`);
      console.log('');
      totalDuplicates += d.count - 1;
    });
    
    console.log(`📊 Total duplicates to remove: ${totalDuplicates}`);
    console.log('');
    
    // Fix strategy: Keep the first (oldest) occurrence, remove others
    console.log('🔧 Fixing duplicates...');
    console.log('   Strategy: Keep oldest occurrence, remove newer ones');
    console.log('');
    
    let fixed = 0;
    
    for (const dup of duplicates) {
      const keepId = dup.variant_ids[0]; // Keep the first (oldest)
      const removeIds = dup.variant_ids.slice(1); // Remove the rest
      
      console.log(`   Processing IMEI: ${dup.imei}`);
      console.log(`   ✓ Keeping variant: ${keepId}`);
      console.log(`   ✗ Removing variants: ${removeIds.join(', ')}`);
      
      // Delete duplicate variants and their related records
      for (const removeId of removeIds) {
        // First, delete related stock movements
        await sql`
          DELETE FROM lats_stock_movements
          WHERE variant_id = ${removeId}
        `;
        
        // Then delete the variant
        await sql`
          DELETE FROM lats_product_variants
          WHERE id = ${removeId}
        `;
        fixed++;
      }
      
      console.log('');
    }
    
    console.log('═'.repeat(70));
    console.log('');
    console.log(`✅ Fixed ${fixed} duplicate IMEI entries!`);
    console.log('');
    console.log('📋 Summary:');
    console.log(`   • Duplicate IMEIs found: ${duplicates.length}`);
    console.log(`   • Variants removed: ${fixed}`);
    console.log(`   • Variants kept: ${duplicates.length}`);
    console.log('');
    console.log('🎉 Your database is now ready for the unique IMEI index!');
    console.log('');
    console.log('Next step:');
    console.log('   Run: node apply-comprehensive-imei-system.mjs');
    console.log('');
    console.log('═'.repeat(70));
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    console.error('');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the fixer
fixDuplicates();

