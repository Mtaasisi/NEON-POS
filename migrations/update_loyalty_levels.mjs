#!/usr/bin/env node

/**
 * Migration Script: Update Customer Loyalty Levels
 * 
 * This script migrates customer loyalty levels from the old 4-tier system
 * to the new 7-tier system:
 * 
 * Old System:  bronze, silver, gold, platinum
 * New System:  interested, engaged, payment_customer, active, regular, premium, vip
 * 
 * Mapping Strategy:
 * - platinum → vip (highest tier)
 * - gold → premium (high tier)
 * - silver → active (mid tier)
 * - bronze → interested (entry tier)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mapping from old loyalty levels to new ones
const LOYALTY_LEVEL_MAPPING = {
  'platinum': 'vip',
  'gold': 'premium',
  'silver': 'active',
  'bronze': 'interested'
};

async function migrateCustomerLoyaltyLevels() {
  console.log('🚀 Starting Customer Loyalty Level Migration...\n');
  
  try {
    // Step 1: Get current distribution of loyalty levels
    console.log('📊 Analyzing current loyalty level distribution...');
    const { data: currentStats, error: statsError } = await supabase
      .from('customers')
      .select('loyalty_level');
    
    if (statsError) {
      throw new Error(`Failed to fetch customer stats: ${statsError.message}`);
    }
    
    const distribution = {};
    currentStats.forEach(customer => {
      const level = customer.loyalty_level || 'null';
      distribution[level] = (distribution[level] || 0) + 1;
    });
    
    console.log('\n📈 Current Distribution:');
    Object.entries(distribution).forEach(([level, count]) => {
      console.log(`   ${level}: ${count} customers`);
    });
    
    // Step 2: Perform the migration
    console.log('\n🔄 Migrating loyalty levels...');
    
    let totalUpdated = 0;
    
    for (const [oldLevel, newLevel] of Object.entries(LOYALTY_LEVEL_MAPPING)) {
      const { data, error } = await supabase
        .from('customers')
        .update({ loyalty_level: newLevel })
        .eq('loyalty_level', oldLevel)
        .select();
      
      if (error) {
        console.error(`❌ Error updating ${oldLevel} to ${newLevel}:`, error.message);
        continue;
      }
      
      const count = data?.length || 0;
      if (count > 0) {
        console.log(`   ✓ Updated ${count} customers: ${oldLevel} → ${newLevel}`);
        totalUpdated += count;
      }
    }
    
    // Step 3: Update NULL or empty loyalty levels to 'interested'
    const { data: nullUpdates, error: nullError } = await supabase
      .from('customers')
      .update({ loyalty_level: 'interested' })
      .or('loyalty_level.is.null,loyalty_level.eq.')
      .select();
    
    if (!nullError && nullUpdates && nullUpdates.length > 0) {
      console.log(`   ✓ Updated ${nullUpdates.length} customers: NULL/empty → interested`);
      totalUpdated += nullUpdates.length;
    }
    
    // Step 4: Verify the migration
    console.log('\n🔍 Verifying migration results...');
    const { data: newStats, error: verifyError } = await supabase
      .from('customers')
      .select('loyalty_level');
    
    if (verifyError) {
      throw new Error(`Failed to verify migration: ${verifyError.message}`);
    }
    
    const newDistribution = {};
    newStats.forEach(customer => {
      const level = customer.loyalty_level || 'null';
      newDistribution[level] = (newDistribution[level] || 0) + 1;
    });
    
    console.log('\n📊 New Distribution:');
    const tierOrder = ['vip', 'premium', 'regular', 'active', 'payment_customer', 'engaged', 'interested'];
    tierOrder.forEach(level => {
      const count = newDistribution[level] || 0;
      if (count > 0) {
        console.log(`   ${level}: ${count} customers`);
      }
    });
    
    // Check if any old levels remain
    const remainingOldLevels = ['bronze', 'silver', 'gold', 'platinum']
      .filter(level => newDistribution[level] > 0);
    
    if (remainingOldLevels.length > 0) {
      console.warn('\n⚠️  Warning: Some old loyalty levels still exist:');
      remainingOldLevels.forEach(level => {
        console.warn(`   - ${level}: ${newDistribution[level]} customers`);
      });
    } else {
      console.log('\n✅ All customers successfully migrated to new loyalty levels!');
    }
    
    console.log(`\n📝 Summary:`);
    console.log(`   Total customers updated: ${totalUpdated}`);
    console.log(`   Total customers in system: ${newStats.length}`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the migration
console.log('═'.repeat(60));
console.log('   CUSTOMER LOYALTY LEVEL MIGRATION');
console.log('   Old System: bronze, silver, gold, platinum');
console.log('   New System: interested, engaged, payment_customer,');
console.log('               active, regular, premium, vip');
console.log('═'.repeat(60));
console.log();

migrateCustomerLoyaltyLevels()
  .then(() => {
    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });

