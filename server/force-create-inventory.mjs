#!/usr/bin/env node
/**
 * Force create inventory items for specific PO
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', onnotice: () => {} });

console.log('🔍 Checking PO-1760129569389...\n');

try {
  // Find the PO
  const pos = await sql`
    SELECT id, po_number, status 
    FROM lats_purchase_orders 
    WHERE po_number = 'PO-1760129569389'
  `;

  if (pos.length === 0) {
    console.log('❌ PO-1760129569389 not found');
    await sql.end();
    process.exit(1);
  }

  const po = pos[0];
  console.log(`Found PO: ${po.po_number} (Status: ${po.status})`);

  // Check current inventory items
  const currentItems = await sql`
    SELECT COUNT(*) as count 
    FROM inventory_items 
    WHERE purchase_order_id = ${po.id}
  `;
  console.log(`Current inventory items: ${currentItems[0].count}`);

  // Check PO line items
  const poItems = await sql`
    SELECT COUNT(*) as count 
    FROM lats_purchase_order_items 
    WHERE purchase_order_id = ${po.id}
  `;
  console.log(`PO line items: ${poItems[0].count}`);

  // If status is not received/completed, update it first
  if (po.status !== 'received' && po.status !== 'completed') {
    console.log(`\n🔄 Updating PO status from '${po.status}' to 'received'...`);
    await sql`
      UPDATE lats_purchase_orders 
      SET status = 'received', received_date = NOW(), updated_at = NOW()
      WHERE id = ${po.id}
    `;
    console.log('✅ Status updated to received');
  }

  // Delete existing inventory items for this PO (if any)
  console.log('\n🗑️  Removing any existing inventory items...');
  const deleted = await sql`
    DELETE FROM inventory_items WHERE purchase_order_id = ${po.id}
  `;
  console.log(`Deleted ${deleted.count} existing items`);

  // Create new inventory items
  console.log('\n📦 Creating fresh inventory items...');
  const result = await sql`
    SELECT create_missing_inventory_items_for_po(${po.id}::UUID) as result
  `;

  const resultData = result[0].result;
  
  if (resultData.success) {
    console.log(`\n✅ SUCCESS! Created ${resultData.items_created} inventory items`);
  } else {
    console.log(`\n❌ FAILED: ${resultData.message}`);
  }

  // Verify
  const verifyItems = await sql`
    SELECT COUNT(*) as count 
    FROM inventory_items 
    WHERE purchase_order_id = ${po.id}
  `;
  console.log(`\n🔍 Verification: ${verifyItems[0].count} items in inventory\n`);

  await sql.end();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error:', error.message);
  await sql.end();
  process.exit(1);
}

