import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 Testing product price loading...\n');

// Test 1: Check raw database values
const { data: variants, error } = await supabase
  .from('lats_product_variants')
  .select('id, variant_name, name, unit_price, selling_price, cost_price')
  .limit(3);

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ Raw database values:');
  variants.forEach(v => {
    console.log({
      name: v.variant_name || v.name,
      unit_price: v.unit_price,
      selling_price: v.selling_price,
      cost_price: v.cost_price
    });
  });
}

console.log('\n---\n');
console.log('Expected behavior:');
console.log('- App should display selling_price (780, 104, 10000)');
console.log('- NOT unit_price (2323, 4545, 45345)');
console.log('\nIf app shows unit_price, the data transformers need more work.');

process.exit(0);

