#!/usr/bin/env node

/**
 * ADD SAMPLE DATA
 * Adds sample data to empty tables
 */

import postgres from 'postgres';
import fs from 'fs';

console.log('📦 ADDING SAMPLE DATA\n');

const config = JSON.parse(fs.readFileSync('./database-config.json', 'utf8'));
const sql = postgres(config.url, { 
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

async function addSuppliers() {
  console.log('🏢 Adding suppliers...');
  try {
    const count = await sql`SELECT COUNT(*) as count FROM lats_suppliers`;
    
    if (count[0].count === 0) {
      await sql`
        INSERT INTO lats_suppliers (name, contact_person, email, phone, address, city, country, is_active, rating)
        VALUES 
          ('Tech Supplies Co', 'John Smith', 'john@techsupplies.com', '+1-555-0101', '123 Tech Street', 'New York', 'USA', true, 4.5),
          ('Global Electronics', 'Sarah Johnson', 'sarah@globalelec.com', '+1-555-0102', '456 Electronic Ave', 'Los Angeles', 'USA', true, 4.8),
          ('Mobile Parts Inc', 'Mike Chen', 'mike@mobileparts.com', '+1-555-0103', '789 Mobile Blvd', 'San Francisco', 'USA', true, 4.2)
      `;
      console.log('   ✅ Added 3 suppliers');
    } else {
      console.log(`   ℹ️  Already have ${count[0].count} suppliers`);
    }
  } catch (error) {
    console.log('   ⚠️  Error:', error.message);
  }
}

async function addCategories() {
  console.log('\n📦 Adding categories...');
  try {
    const count = await sql`SELECT COUNT(*) as count FROM lats_categories`;
    
    if (count[0].count === 0) {
      await sql`
        INSERT INTO lats_categories (name, description, is_active)
        VALUES 
          ('Electronics', 'Electronic devices and accessories', true),
          ('Mobile Phones', 'Smartphones and mobile devices', true),
          ('Laptops', 'Laptop computers', true),
          ('Tablets', 'Tablet devices', true),
          ('Accessories', 'Phone and computer accessories', true)
      `;
      console.log('   ✅ Added 5 categories');
    } else {
      console.log(`   ℹ️  Already have ${count[0].count} categories`);
    }
  } catch (error) {
    console.log('   ⚠️  Error:', error.message);
  }
}

async function addStoreLocations() {
  console.log('\n🏪 Adding store locations...');
  try {
    const count = await sql`SELECT COUNT(*) as count FROM lats_store_locations`;
    
    if (count[0].count === 0) {
      await sql`
        INSERT INTO lats_store_locations (name, code, city, address, is_active)
        VALUES ('Main Store', 'MAIN', 'Default City', 'Main Street', true)
      `;
      console.log('   ✅ Added 1 store location');
    } else {
      console.log(`   ℹ️  Already have ${count[0].count} store locations`);
    }
  } catch (error) {
    console.log('   ⚠️  Error:', error.message);
  }
}

async function main() {
  try {
    console.log('🔌 Connecting...');
    await sql`SELECT 1`;
    console.log('✅ Connected!\n');

    await addSuppliers();
    await addCategories();
    await addStoreLocations();

    console.log('\n🎉 Sample data added successfully!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);

