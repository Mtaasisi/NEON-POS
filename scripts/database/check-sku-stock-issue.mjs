#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSkuIssue() {
  console.log('\n🔍 Checking SKU-1761465747854-0E5 variants...\n');
  console.log('='.repeat(120));

  // Query 1: Get all variants (parents and children)
  const { data: allVariants, error: error1 } = await supabase
    .from('lats_product_variants')
    .select('*')
    .or(`sku.like.SKU-1761465747854-0E5%,parent_variant_id.in.(${await getParentIds()})`)
    .order('parent_variant_id', { nullsFirst: true })
    .order('created_at');

  if (error1) {
    console.error('❌ Error fetching variants:', error1);
    return;
  }

  // Query 2: Get parent variants with their children stats
  const { data: parents, error: error2 } = await supabase.rpc('get_parent_variant_stats', {
    sku_pattern: 'SKU-1761465747854-0E5%'
  }).catch(async () => {
    // If RPC doesn't exist, do manual query
    const { data: parentData } = await supabase
      .from('lats_product_variants')
      .select('*')
      .like('sku', 'SKU-1761465747854-0E5%')
      .is('parent_variant_id', null);
    return { data: parentData };
  });

  console.log('\n📋 PARENT VARIANTS:\n');
  console.log('SKU'.padEnd(35), 'Name'.padEnd(20), 'Stock'.padEnd(8), 'Is Parent'.padEnd(12), 'Type'.padEnd(15));
  console.log('-'.repeat(120));

  const parentVariants = allVariants?.filter(v => !v.parent_variant_id) || [];
  
  for (const parent of parentVariants) {
    console.log(
      (parent.sku || 'N/A').padEnd(35),
      (parent.variant_name || 'N/A').padEnd(20),
      String(parent.quantity || 0).padEnd(8),
      String(parent.is_parent || false).padEnd(12),
      (parent.variant_type || 'N/A').padEnd(15)
    );
  }

  console.log('\n📱 CHILD DEVICES (IMEI):\n');
  console.log('Parent SKU'.padEnd(35), 'IMEI/S/N'.padEnd(25), 'Active'.padEnd(10), 'Qty'.padEnd(6), 'Price');
  console.log('-'.repeat(120));

  for (const parent of parentVariants) {
    const children = allVariants?.filter(v => v.parent_variant_id === parent.id) || [];
    
    if (children.length > 0) {
      console.log(`\n${parent.sku} (${parent.variant_name}) - ${children.length} devices:`);
      
      for (const child of children) {
        const imei = child.variant_attributes?.imei || 'N/A';
        const sn = child.variant_attributes?.serial_number || '';
        const identifier = imei !== 'N/A' ? imei : (sn || 'Unknown');
        
        console.log(
          '  →'.padEnd(35),
          identifier.padEnd(25),
          String(child.is_active).padEnd(10),
          String(child.quantity || 0).padEnd(6),
          `TSh ${(child.selling_price || 0).toLocaleString()}`
        );
      }
    }
  }

  console.log('\n📊 STOCK ANALYSIS:\n');
  console.log('Parent SKU'.padEnd(35), 'DB Stock'.padEnd(12), 'Actual Children'.padEnd(18), 'Available'.padEnd(12), 'Status');
  console.log('-'.repeat(120));

  for (const parent of parentVariants) {
    const children = allVariants?.filter(v => v.parent_variant_id === parent.id) || [];
    const totalChildren = children.length;
    const availableChildren = children.filter(c => c.is_active && c.quantity > 0).length;
    const dbStock = parent.quantity || 0;
    
    const status = dbStock === availableChildren ? '✅ CORRECT' : '❌ MISMATCH!';
    
    console.log(
      (parent.sku || 'N/A').padEnd(35),
      String(dbStock).padEnd(12),
      `${totalChildren} total`.padEnd(18),
      `${availableChildren} available`.padEnd(12),
      status
    );
  }

  console.log('\n' + '='.repeat(120));
  console.log('\n🔧 RECOMMENDATIONS:\n');

  for (const parent of parentVariants) {
    const children = allVariants?.filter(v => v.parent_variant_id === parent.id) || [];
    const availableChildren = children.filter(c => c.is_active && c.quantity > 0).length;
    const dbStock = parent.quantity || 0;
    
    if (dbStock !== availableChildren) {
      console.log(`❌ ${parent.sku} (${parent.variant_name}):`);
      console.log(`   Current DB stock: ${dbStock}`);
      console.log(`   Should be: ${availableChildren}`);
      console.log(`   Fix: UPDATE lats_product_variants SET quantity = ${availableChildren} WHERE id = '${parent.id}';`);
      console.log('');
    }
  }

  console.log('\n✨ Analysis complete!\n');
}

async function getParentIds() {
  const { data } = await supabase
    .from('lats_product_variants')
    .select('id')
    .like('sku', 'SKU-1761465747854-0E5%')
    .is('parent_variant_id', null);
  
  return data?.map(v => v.id).join(',') || '';
}

checkSkuIssue().catch(console.error);

