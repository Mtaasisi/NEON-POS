import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('Looking for: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixSupplierIds() {
  console.log('🔍 Checking product supplier assignments...\n');
  
  try {
    // 1. Get all suppliers
    console.log('1️⃣ Fetching suppliers...');
    const { data: suppliers, error: supplierError } = await supabase
      .from('lats_suppliers')
      .select('*')
      .order('name');
    
    if (supplierError) {
      console.error('❌ Error fetching suppliers:', supplierError);
      return;
    }
    
    console.log(`   ✅ Found ${suppliers.length} suppliers:`);
    suppliers.forEach((s, i) => {
      console.log(`      ${i + 1}. ${s.name} (ID: ${s.id.substring(0, 8)}..., Active: ${s.is_active})`);
    });
    
    if (suppliers.length === 0) {
      console.log('\n❌ No suppliers in database! Please add suppliers first.');
      return;
    }
    
    // 2. Get products without supplier_id
    console.log('\n2️⃣ Checking products...');
    const { data: allProducts, error: productsError } = await supabase
      .from('lats_products')
      .select('id, name, supplier_id, category_id')
      .limit(100);
    
    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return;
    }
    
    const productsWithoutSupplier = allProducts.filter(p => !p.supplier_id);
    const productsWithSupplier = allProducts.filter(p => p.supplier_id);
    
    console.log(`   📊 Total products: ${allProducts.length}`);
    console.log(`   ✅ Products with supplier: ${productsWithSupplier.length}`);
    console.log(`   ❌ Products WITHOUT supplier: ${productsWithoutSupplier.length}`);
    
    if (productsWithoutSupplier.length === 0) {
      console.log('\n✅ All products already have suppliers assigned!');
      return;
    }
    
    // 3. Show products that need suppliers
    console.log('\n3️⃣ Products that need supplier assignment:');
    productsWithoutSupplier.slice(0, 10).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (ID: ${p.id.substring(0, 8)}...)`);
    });
    
    if (productsWithoutSupplier.length > 10) {
      console.log(`   ... and ${productsWithoutSupplier.length - 10} more`);
    }
    
    // 4. Auto-assign default supplier
    console.log('\n4️⃣ Auto-assigning suppliers...');
    console.log('   Using first active supplier as default...');
    
    const defaultSupplier = suppliers.find(s => s.is_active) || suppliers[0];
    console.log(`   📌 Default supplier: ${defaultSupplier.name}`);
    
    // Update products
    const { data: updated, error: updateError } = await supabase
      .from('lats_products')
      .update({ supplier_id: defaultSupplier.id })
      .is('supplier_id', null)
      .select();
    
    if (updateError) {
      console.error('❌ Error updating products:', updateError);
      return;
    }
    
    console.log(`   ✅ Updated ${updated?.length || 0} products`);
    
    // 5. Verify the fix
    console.log('\n5️⃣ Verifying fix...');
    const { data: verifyProducts, error: verifyError } = await supabase
      .from('lats_products')
      .select('id, name, supplier_id')
      .limit(10);
    
    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
      return;
    }
    
    const stillMissing = verifyProducts.filter(p => !p.supplier_id);
    
    if (stillMissing.length === 0) {
      console.log('   ✅ All checked products now have suppliers!');
      console.log('\n   Sample products:');
      verifyProducts.slice(0, 5).forEach(p => {
        console.log(`      - ${p.name}: ${p.supplier_id ? '✅' : '❌'}`);
      });
    } else {
      console.log(`   ⚠️  ${stillMissing.length} products still missing suppliers`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ SUPPLIER ASSIGNMENT COMPLETE');
    console.log('='.repeat(80));
    console.log('Next steps:');
    console.log('1. Clear browser cache (localStorage)');
    console.log('2. Refresh inventory page');
    console.log('3. Suppliers should now be visible!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAndFixSupplierIds();

