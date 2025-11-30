#!/usr/bin/env node

/**
 * Simple script to fix the suppliers issue
 * This creates real suppliers in the database
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL environment variable');
  console.error('Please set VITE_DATABASE_URL in your .env file');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function fixSuppliers() {
  try {
    console.log('🔧 Fixing suppliers issue...');
    
    // First, check current state
    console.log('\n📊 Checking current suppliers...');
    const currentSuppliers = await sql`
      SELECT 
        COUNT(*) as total_suppliers,
        COUNT(*) FILTER (WHERE is_trade_in_customer = true) as trade_in_customers,
        COUNT(*) FILTER (WHERE is_trade_in_customer = false) as real_suppliers,
        COUNT(*) FILTER (WHERE is_active = true AND is_trade_in_customer = false) as active_real_suppliers
      FROM lats_suppliers
    `;
    
    console.log('Current state:', currentSuppliers[0]);
    
    // Create real suppliers
    console.log('\n🔄 Creating real suppliers...');
    
    const suppliers = [
      {
        name: 'Tech Solutions Ltd',
        contact_person: 'John Smith',
        email: 'john@techsolutions.com',
        phone: '+255-22-123-4567',
        address: '123 Technology Street',
        city: 'Dar es Salaam',
        country: 'Tanzania',
        tax_id: 'TIN-001',
        payment_terms: 'Net 30',
        rating: 5,
        is_active: true,
        is_trade_in_customer: false,
        notes: 'Leading technology supplier for mobile devices and accessories'
      },
      {
        name: 'Mobile World Distributors',
        contact_person: 'Sarah Johnson',
        email: 'sarah@mobileworld.co.tz',
        phone: '+255-22-234-5678',
        address: '456 Business Avenue',
        city: 'Dar es Salaam',
        country: 'Tanzania',
        tax_id: 'TIN-002',
        payment_terms: 'Net 15',
        rating: 4,
        is_active: true,
        is_trade_in_customer: false,
        notes: 'Wholesale distributor of mobile phones and tablets'
      },
      {
        name: 'Electronics Plus',
        contact_person: 'Michael Brown',
        email: 'michael@electronicsplus.com',
        phone: '+255-22-345-6789',
        address: '789 Electronics Plaza',
        city: 'Arusha',
        country: 'Tanzania',
        tax_id: 'TIN-003',
        payment_terms: 'Cash on Delivery',
        rating: 4,
        is_active: true,
        is_trade_in_customer: false,
        notes: 'Specialized in smartphone accessories and repair parts'
      },
      {
        name: 'Gadget Hub Tanzania',
        contact_person: 'Fatma Hassan',
        email: 'fatma@gadgethub.co.tz',
        phone: '+255-22-456-7890',
        address: '321 Innovation Center',
        city: 'Mwanza',
        country: 'Tanzania',
        tax_id: 'TIN-004',
        payment_terms: 'Net 30',
        rating: 5,
        is_active: true,
        is_trade_in_customer: false,
        notes: 'Premium supplier of latest mobile devices and gadgets'
      },
      {
        name: 'Phone Accessories Co',
        contact_person: 'David Wilson',
        email: 'david@phoneaccessories.com',
        phone: '+255-22-567-8901',
        address: '654 Accessory Lane',
        city: 'Dodoma',
        country: 'Tanzania',
        tax_id: 'TIN-005',
        payment_terms: 'Net 7',
        rating: 3,
        is_active: true,
        is_trade_in_customer: false,
        notes: 'Bulk supplier of phone cases, chargers, and accessories'
      }
    ];
    
    for (const supplier of suppliers) {
      try {
        // Check if supplier already exists
        const existing = await sql`
          SELECT id FROM lats_suppliers
          WHERE name = ${supplier.name}
          LIMIT 1
        `;
        
        if (existing && existing.length > 0) {
          console.log(`⏭️  Supplier "${supplier.name}" already exists, skipping...`);
          continue;
        }
        
        // Insert new supplier
        const result = await sql`
          INSERT INTO lats_suppliers (
            name, contact_person, email, phone, address, city, country,
            tax_id, payment_terms, rating, is_active, is_trade_in_customer, notes,
            created_at, updated_at
          ) VALUES (
            ${supplier.name}, ${supplier.contact_person}, ${supplier.email}, 
            ${supplier.phone}, ${supplier.address}, ${supplier.city}, ${supplier.country},
            ${supplier.tax_id}, ${supplier.payment_terms}, ${supplier.rating}, 
            ${supplier.is_active}, ${supplier.is_trade_in_customer}, ${supplier.notes},
            NOW(), NOW()
          )
          RETURNING id, name
        `;
        
        console.log(`✅ Created supplier: ${supplier.name} (ID: ${result[0].id})`);
      } catch (error) {
        console.error(`❌ Error creating supplier "${supplier.name}":`, error.message);
      }
    }
    
    // Verify the fix
    console.log('\n📊 Verifying fix...');
    const finalSuppliers = await sql`
      SELECT 
        COUNT(*) as total_suppliers,
        COUNT(*) FILTER (WHERE is_trade_in_customer = true) as trade_in_customers,
        COUNT(*) FILTER (WHERE is_trade_in_customer = false) as real_suppliers,
        COUNT(*) FILTER (WHERE is_active = true AND is_trade_in_customer = false) as active_real_suppliers
      FROM lats_suppliers
    `;
    
    console.log('Final state:', finalSuppliers[0]);
    
    // Show the new suppliers
    const newSuppliers = await sql`
      SELECT id, name, contact_person, email, phone, city, country, is_active, is_trade_in_customer
      FROM lats_suppliers 
      WHERE is_trade_in_customer = false 
      ORDER BY name
    `;
    
    console.log('\n✅ Real suppliers in database:');
    newSuppliers.forEach(supplier => {
      console.log(`   - ${supplier.name} (${supplier.contact_person}) - ${supplier.city}, ${supplier.country}`);
    });
    
    if (finalSuppliers[0].active_real_suppliers > 0) {
      console.log('\n🎉 SUCCESS: Real suppliers created!');
      console.log('🔄 Please refresh your application to see the changes.');
    } else {
      console.log('\n❌ No real suppliers found. Please check the database manually.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing suppliers:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixSuppliers();
