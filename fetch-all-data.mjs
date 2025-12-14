#!/usr/bin/env node

/**
 * Fetch All Data from Database
 * This script fetches all relevant data from the database for inspection
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in environment variables');
  console.error('   Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAllData() {
  console.log('🔍 Fetching all data from database...\n');
  console.log('='.repeat(80));

  try {
    // 1. Fetch all categories
    console.log('\n📁 CATEGORIES');
    console.log('-'.repeat(80));
    const { data: categories, error: categoriesError } = await supabase
      .from('lats_categories')
      .select('*')
      .order('name', { ascending: true });

    if (categoriesError) {
      console.error('❌ Error fetching categories:', categoriesError.message);
    } else {
      console.log(`✅ Found ${categories?.length || 0} categories:\n`);
      if (categories && categories.length > 0) {
        categories.forEach((cat, index) => {
          console.log(`${index + 1}. ${cat.name} (ID: ${cat.id})`);
          console.log(`   Active: ${cat.is_active}, Shared: ${cat.is_shared || false}, Branch: ${cat.branch_id || 'N/A'}`);
          if (cat.description) console.log(`   Description: ${cat.description}`);
          console.log('');
        });
      } else {
        console.log('   No categories found\n');
      }
    }

    // 2. Fetch all spare parts (without branch filtering to see all)
    console.log('\n🔧 SPARE PARTS');
    console.log('-'.repeat(80));
    const { data: spareParts, error: sparePartsError } = await supabase
      .from('lats_spare_parts')
      .select('*')
      .order('created_at', { ascending: false });

    if (sparePartsError) {
      console.error('❌ Error fetching spare parts:', sparePartsError.message);
    } else {
      console.log(`✅ Found ${spareParts?.length || 0} spare parts:\n`);
      if (spareParts && spareParts.length > 0) {
        spareParts.forEach((part, index) => {
          console.log(`${index + 1}. ${part.name}`);
          console.log(`   ID: ${part.id}`);
          console.log(`   Category ID: ${part.category_id || 'NULL (Unknown)'}`);
          console.log(`   Brand: ${part.brand || 'N/A'}`);
          console.log(`   Condition: ${part.condition || 'N/A'}`);
          console.log(`   Active: ${part.is_active}`);
          console.log(`   Branch: ${part.branch_id || 'N/A'}`);
          console.log(`   Created: ${part.created_at || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('   No spare parts found\n');
      }
    }

    // 3. Fetch all spare part variants
    console.log('\n🔧 SPARE PART VARIANTS');
    console.log('-'.repeat(80));
    const { data: variants, error: variantsError } = await supabase
      .from('lats_spare_part_variants')
      .select('*')
      .order('created_at', { ascending: true });

    if (variantsError) {
      console.error('❌ Error fetching variants:', variantsError.message);
    } else {
      console.log(`✅ Found ${variants?.length || 0} variants:\n`);
      if (variants && variants.length > 0) {
        variants.forEach((variant, index) => {
          console.log(`${index + 1}. ${variant.name}`);
          console.log(`   ID: ${variant.id}`);
          console.log(`   Spare Part ID: ${variant.spare_part_id}`);
          console.log(`   SKU: ${variant.sku || 'N/A'}`);
          console.log(`   Quantity: ${variant.quantity || 0}`);
          console.log(`   Cost: ${variant.cost_price || 0}, Sell: ${variant.selling_price || 0}`);
          console.log(`   Active: ${variant.is_active}`);
          console.log('');
        });
      } else {
        console.log('   No variants found\n');
      }
    }

    // 4. Fetch all suppliers
    console.log('\n🏢 SUPPLIERS');
    console.log('-'.repeat(80));
    const { data: suppliers, error: suppliersError } = await supabase
      .from('lats_suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (suppliersError) {
      console.error('❌ Error fetching suppliers:', suppliersError.message);
    } else {
      console.log(`✅ Found ${suppliers?.length || 0} suppliers:\n`);
      if (suppliers && suppliers.length > 0) {
        suppliers.forEach((supplier, index) => {
          console.log(`${index + 1}. ${supplier.name}`);
          console.log(`   ID: ${supplier.id}`);
          console.log(`   Email: ${supplier.email || 'N/A'}`);
          console.log(`   Phone: ${supplier.phone || 'N/A'}`);
          console.log(`   Active: ${supplier.is_active}`);
          console.log('');
        });
      } else {
        console.log('   No suppliers found\n');
      }
    }

    // 5. Summary statistics
    console.log('\n📊 SUMMARY');
    console.log('-'.repeat(80));
    console.log(`Total Categories: ${categories?.length || 0}`);
    console.log(`Total Spare Parts: ${spareParts?.length || 0}`);
    console.log(`Total Variants: ${variants?.length || 0}`);
    console.log(`Total Suppliers: ${suppliers?.length || 0}`);
    
    // Count spare parts without categories
    const partsWithoutCategory = spareParts?.filter(p => !p.category_id).length || 0;
    if (partsWithoutCategory > 0) {
      console.log(`\n⚠️  Warning: ${partsWithoutCategory} spare parts have no category assigned`);
    }

    // Count spare parts without variants
    const partIds = new Set(spareParts?.map(p => p.id) || []);
    const variantPartIds = new Set(variants?.map(v => v.spare_part_id) || []);
    const partsWithoutVariants = Array.from(partIds).filter(id => !variantPartIds.has(id)).length;
    if (partsWithoutVariants > 0) {
      console.log(`⚠️  Warning: ${partsWithoutVariants} spare parts have no variants`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Data fetch completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fetchAllData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
