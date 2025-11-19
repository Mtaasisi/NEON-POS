// Quick test to debug supplier loading
import { supabase } from './supabaseClient';

export async function testSuppliersDirectly() {
  // Disabled - uncomment to debug suppliers
  // console.log('=== TESTING SUPPLIERS DIRECTLY ===');
  
  // try {
  //   console.log('1️⃣ Testing direct query...');
  //   const result = await supabase.from('lats_suppliers').select('*');
  //   console.log('✅ Direct query result:', result);
  //   console.log('   Data:', result.data);
  //   console.log('   Error:', result.error);
  //   console.log('   Count:', result.data?.length || 0);
  //   
  //   if (result.data && result.data.length > 0) {
  //     console.log('   First supplier:', result.data[0]);
  //   }
  // } catch (error) {
  //   console.error('❌ Direct query failed:', error);
  // }
  // 
  // console.log('=== TEST COMPLETE ===');
}

// Auto-run disabled - uncomment to test
// setTimeout(() => {
//   console.log('🚀 Auto-running supplier test...');
//   testSuppliersDirectly();
// }, 2000);

