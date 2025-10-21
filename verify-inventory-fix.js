#!/usr/bin/env node

/**
 * VERIFY INVENTORY FIX
 * ====================
 * 
 * Quick script to verify inventory is now in sync
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ VERIFY INVENTORY FIX');
console.log('=======================\n');

async function verify() {
  // Get variants with inventory items
  const { data: variants, error } = await supabase
    .from('lats_product_variants')
    .select(`
      id,
      name,
      quantity,
      product:lats_products!product_id(name)
    `)
    .order('name');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Checking ${variants.length} variants...\n`);

  let totalChecked = 0;
  let inSync = 0;
  let outOfSync = 0;
  const problems = [];

  for (const variant of variants) {
    // Count actual inventory items
    const { data: items } = await supabase
      .from('inventory_items')
      .select('id, status')
      .eq('variant_id', variant.id);

    if (!items || items.length === 0) continue;

    totalChecked++;
    const availableCount = items.filter(i => i.status === 'available').length;
    
    if (availableCount === variant.quantity) {
      inSync++;
      console.log(`✅ ${variant.product?.name} - ${variant.name}: ${variant.quantity} (synced)`);
    } else {
      outOfSync++;
      problems.push({
        variant: `${variant.product?.name} - ${variant.name}`,
        shown: variant.quantity,
        actual: availableCount
      });
      console.log(`❌ ${variant.product?.name} - ${variant.name}: Shows ${variant.quantity}, Actually ${availableCount}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total variants checked: ${totalChecked}`);
  console.log(`✅ In sync: ${inSync}`);
  console.log(`❌ Out of sync: ${outOfSync}`);

  if (outOfSync === 0) {
    console.log('\n🎉 SUCCESS! All inventory is synchronized!');
    console.log('   Your products should now show correctly in the UI.');
  } else {
    console.log('\n⚠️  Some items are still out of sync:');
    problems.forEach(p => {
      console.log(`   - ${p.variant}: ${p.shown} → ${p.actual}`);
    });
    console.log('\n💡 Try running: node diagnose-and-fix-inventory-sync.js');
  }
  
  console.log('='.repeat(60));
}

verify().catch(console.error);

