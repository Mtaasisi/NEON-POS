#!/usr/bin/env node

/**
 * AUTO-REORDER FEATURE TEST RUNNER
 * Tests the auto-reorder functionality end-to-end
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
function loadEnv() {
  try {
    const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
    const lines = envContent.split('\n');
    
    const env = {};
    lines.forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        value = value.replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    });
    
    return env;
  } catch (error) {
    console.error('❌ Error loading .env file:', error.message);
    console.log('\n💡 Make sure you have a .env file with:');
    console.log('   VITE_SUPABASE_URL=your_url');
    console.log('   VITE_SUPABASE_ANON_KEY=your_key\n');
    process.exit(1);
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL(sql, description) {
  console.log(`\n🔧 ${description}...`);
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
  
  console.log('✅ Success');
  return true;
}

async function testAutoReorder() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  AUTO-REORDER FEATURE TEST SUITE       ║');
  console.log('╔════════════════════════════════════════╗');
  
  try {
    // Step 1: Check current settings
    console.log('\n📋 Step 1: Checking settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .eq('category', 'inventory')
      .in('setting_key', ['auto_reorder_enabled', 'auto_create_po_at_reorder']);
    
    if (settingsError) {
      console.error('❌ Error fetching settings:', settingsError.message);
      return;
    }
    
    settings.forEach(s => {
      console.log(`   ${s.setting_key}: ${s.setting_value}`);
    });
    
    // Step 2: Enable settings if needed
    const autoReorder = settings.find(s => s.setting_key === 'auto_reorder_enabled');
    const autoCreatePO = settings.find(s => s.setting_key === 'auto_create_po_at_reorder');
    
    if (autoReorder?.setting_value !== 'true' || autoCreatePO?.setting_value !== 'true') {
      console.log('\n📝 Step 2: Enabling auto-reorder settings...');
      
      const updates = [];
      if (autoReorder?.setting_value !== 'true') {
        updates.push({
          category: 'inventory',
          setting_key: 'auto_reorder_enabled',
          setting_value: 'true',
          setting_type: 'boolean'
        });
      }
      if (autoCreatePO?.setting_value !== 'true') {
        updates.push({
          category: 'inventory',
          setting_key: 'auto_create_po_at_reorder',
          setting_value: 'true',
          setting_type: 'boolean'
        });
      }
      
      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from('admin_settings')
          .upsert(updates);
        
        if (updateError) {
          console.error('❌ Error updating settings:', updateError.message);
          return;
        }
        console.log('✅ Settings enabled');
      }
    } else {
      console.log('✅ Settings already enabled');
    }
    
    // Step 3: Find test product
    console.log('\n📦 Step 3: Finding test product...');
    const { data: variants, error: variantsError } = await supabase
      .from('lats_product_variants')
      .select(`
        id,
        product_id,
        sku,
        quantity,
        reorder_point,
        lats_products!inner(id, name, is_active)
      `)
      .eq('lats_products.is_active', true)
      .gte('quantity', 20)
      .limit(1)
      .single();
    
    if (variantsError || !variants) {
      console.error('❌ No suitable test product found');
      console.log('💡 Create a product with stock >= 20');
      return;
    }
    
    console.log(`   Product: ${variants.lats_products.name}`);
    console.log(`   Current Stock: ${variants.quantity}`);
    console.log(`   Reorder Point: ${variants.reorder_point || 'Not Set'}`);
    
    // Set reorder point if needed
    if (!variants.reorder_point || variants.reorder_point === 0) {
      console.log('\n📝 Setting reorder point to 10...');
      const { error: updateError } = await supabase
        .from('lats_product_variants')
        .update({ reorder_point: 10 })
        .eq('id', variants.id);
      
      if (updateError) {
        console.error('❌ Error setting reorder point:', updateError.message);
        return;
      }
      variants.reorder_point = 10;
      console.log('✅ Reorder point set');
    }
    
    // Step 4: Count POs before
    console.log('\n📊 Step 4: Counting existing POs...');
    const { count: poCountBefore, error: countError1 } = await supabase
      .from('lats_purchase_orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());
    
    if (countError1) {
      console.error('❌ Error counting POs:', countError1.message);
      return;
    }
    console.log(`   Recent POs (last 5 min): ${poCountBefore || 0}`);
    
    // Step 5: Trigger auto-reorder by reducing stock
    console.log('\n🧪 Step 5: TESTING - Reducing stock below reorder point...');
    const newQty = variants.reorder_point - 2;
    console.log(`   Reducing stock from ${variants.quantity} to ${newQty}`);
    
    const { error: reduceError } = await supabase
      .from('lats_product_variants')
      .update({ quantity: newQty })
      .eq('id', variants.id);
    
    if (reduceError) {
      console.error('❌ Error reducing stock:', reduceError.message);
      return;
    }
    console.log('✅ Stock reduced');
    console.log('⏳ Waiting for trigger...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 6: Check if PO was created
    console.log('\n🔍 Step 6: Checking if auto-reorder worked...');
    const { count: poCountAfter, error: countError2 } = await supabase
      .from('lats_purchase_orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());
    
    if (countError2) {
      console.error('❌ Error counting POs:', countError2.message);
    } else {
      console.log(`   POs before: ${poCountBefore || 0}`);
      console.log(`   POs after: ${poCountAfter || 0}`);
      
      if ((poCountAfter || 0) > (poCountBefore || 0)) {
        console.log('\n✅ SUCCESS! Auto-reorder created a new PO!');
        
        // Get PO details
        const { data: newPO, error: poError } = await supabase
          .from('lats_purchase_orders')
          .select(`
            po_number,
            status,
            total_amount,
            lats_suppliers(name)
          `)
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (!poError && newPO) {
          console.log('\n📋 New PO Details:');
          console.log(`   PO Number: ${newPO.po_number}`);
          console.log(`   Status: ${newPO.status}`);
          console.log(`   Supplier: ${newPO.lats_suppliers?.name || 'N/A'}`);
          console.log(`   Amount: ${newPO.total_amount} TZS`);
        }
      } else {
        console.log('\n❌ FAILED! No new PO created');
        console.log('💡 Check auto_reorder_log table for errors');
      }
    }
    
    // Step 7: Restore stock
    console.log('\n🔄 Step 7: Restoring original stock...');
    const { error: restoreError } = await supabase
      .from('lats_product_variants')
      .update({ quantity: variants.quantity })
      .eq('id', variants.id);
    
    if (restoreError) {
      console.error('❌ Error restoring stock:', restoreError.message);
    } else {
      console.log(`✅ Stock restored to ${variants.quantity}`);
    }
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  TEST COMPLETE                         ║');
    console.log('╚════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testAutoReorder().catch(console.error);

