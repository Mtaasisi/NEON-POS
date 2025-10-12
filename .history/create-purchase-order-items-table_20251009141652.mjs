#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function createPurchaseOrderItemsTable() {
  try {
    console.log('\n🔧 Creating lats_purchase_order_items table');
    console.log('===========================================\n');
    
    console.log('1️⃣ Creating table structure...');
    
    // Create the table with all required columns
    await sql`
      CREATE TABLE IF NOT EXISTS lats_purchase_order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id UUID NOT NULL,
        product_id UUID NOT NULL,
        variant_id UUID,
        quantity_ordered INTEGER NOT NULL DEFAULT 0,
        quantity_received INTEGER DEFAULT 0,
        unit_cost NUMERIC(10, 2) DEFAULT 0,
        total_cost NUMERIC(12, 2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        -- Foreign key constraints
        CONSTRAINT fk_purchase_order_items_purchase_order 
          FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_purchase_order_items_product 
          FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE,
        CONSTRAINT fk_purchase_order_items_variant 
          FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id) ON DELETE SET NULL
      )
    `;
    
    console.log('   ✅ Table created successfully\n');
    
    console.log('2️⃣ Adding indexes for performance...');
    
    // Create indexes for better query performance
    await sql`CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON lats_purchase_order_items(purchase_order_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON lats_purchase_order_items(product_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_purchase_order_items_variant_id ON lats_purchase_order_items(variant_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_purchase_order_items_created_at ON lats_purchase_order_items(created_at)`;
    
    console.log('   ✅ Indexes created\n');
    
    console.log('3️⃣ Adding comments for documentation...');
    
    // Add column comments
    await sql`COMMENT ON TABLE lats_purchase_order_items IS 'Items within purchase orders'`;
    await sql`COMMENT ON COLUMN lats_purchase_order_items.purchase_order_id IS 'Reference to the purchase order'`;
    await sql`COMMENT ON COLUMN lats_purchase_order_items.product_id IS 'Product being ordered'`;
    await sql`COMMENT ON COLUMN lats_purchase_order_items.variant_id IS 'Product variant (if applicable)'`;
    await sql`COMMENT ON COLUMN lats_purchase_order_items.quantity_ordered IS 'Quantity requested in the order'`;
    await sql`COMMENT ON COLUMN lats_purchase_order_items.quantity_received IS 'Quantity actually received'`;
    await sql`COMMENT ON COLUMN lats_purchase_order_items.unit_cost IS 'Cost per unit'`;
    await sql`COMMENT ON COLUMN lats_purchase_order_items.total_cost IS 'Total cost for this line item'`;
    
    console.log('   ✅ Comments added\n');
    
    console.log('4️⃣ Setting up permissions...');
    
    // Grant permissions
    await sql`GRANT ALL ON lats_purchase_order_items TO authenticated`;
    await sql`GRANT ALL ON lats_purchase_order_items TO anon`;
    await sql`ALTER TABLE lats_purchase_order_items ENABLE ROW LEVEL SECURITY`;
    
    // Create RLS policy (permissive for now)
    await sql`
      CREATE POLICY "Enable all access for authenticated users" ON lats_purchase_order_items
      FOR ALL USING (auth.role() = 'authenticated')
    `;
    
    await sql`
      CREATE POLICY "Enable all access for anon users" ON lats_purchase_order_items
      FOR ALL USING (auth.role() = 'anon')
    `;
    
    console.log('   ✅ Permissions set\n');
    
    console.log('5️⃣ Verifying table creation...');
    
    // Verify the table was created
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_purchase_order_items'
      ) as exists
    `;
    
    if (tableExists[0].exists) {
      console.log('   ✅ Table verification successful\n');
      
      // Show the table structure
      const columns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_order_items'
        ORDER BY ordinal_position
      `;
      
      console.log('   Table structure:');
      columns.forEach(c => {
        console.log(`     - ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
    } else {
      console.log('   ❌ Table verification failed\n');
    }
    
    console.log('===========================================');
    console.log('✅ PURCHASE ORDER ITEMS TABLE CREATED!');
    console.log('===========================================\n');
    console.log('The usePurchaseOrderHistory hook should now work without errors!');
    console.log('Please refresh your browser to test.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

createPurchaseOrderItemsTable();

