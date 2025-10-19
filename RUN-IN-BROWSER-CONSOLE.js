/**
 * 🚀 COPY AND PASTE THIS INTO YOUR BROWSER CONSOLE
 * Press F12 → Console Tab → Paste this entire file → Press Enter
 */

(async () => {
  console.log('🚀 Starting Data Sharing Migration...\n');
  
  // Import the SQL client from your app
  const { executeSql } = await import('./src/lib/supabaseClient.ts');
  
  try {
    // Step 1: Add is_shared columns
    console.log('📝 Step 1: Adding is_shared columns...');
    
    await executeSql(`ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false`);
    console.log('✅ Added is_shared to lats_products');
    
    await executeSql(`ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false`);
    console.log('✅ Added is_shared to lats_product_variants');
    
    await executeSql(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false`);
    console.log('✅ Added is_shared to customers');
    
    await executeSql(`ALTER TABLE lats_categories ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false`);
    console.log('✅ Added is_shared to lats_categories');
    
    await executeSql(`ALTER TABLE lats_suppliers ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false`);
    console.log('✅ Added is_shared to lats_suppliers');
    
    await executeSql(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false`);
    console.log('✅ Added is_shared to employees');
    
    console.log('\n✅ All columns added successfully!\n');
    console.log('🔄 Now refreshing the page to apply changes...\n');
    
    // Refresh the page
    setTimeout(() => window.location.reload(), 2000);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
})();
