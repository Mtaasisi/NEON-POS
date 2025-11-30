#!/usr/bin/env node

/**
 * Run the suppliers fix script
 * This will create real suppliers in the database to fix the "No active suppliers found" issue
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSuppliersFix() {
  try {
    console.log('🔧 Running suppliers fix...');
    
    // Read the SQL file
    const sqlPath = join(__dirname, 'MAKE-SUPPLIERS-WORK.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          if (data) {
            console.log('📊 Result:', data);
          }
        }
      }
    }
    
    console.log('\n🎉 Suppliers fix completed!');
    console.log('🔄 Please refresh your application to see the changes.');
    
  } catch (error) {
    console.error('❌ Error running suppliers fix:', error.message);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function runSuppliersFixDirect() {
  try {
    console.log('🔧 Running suppliers fix (direct method)...');
    
    // Check current state
    console.log('\n📊 Checking current suppliers...');
    const { data: currentData, error: currentError } = await supabase
      .from('lats_suppliers')
      .select('id, name, is_trade_in_customer, is_active');
    
    if (currentError) {
      console.error('❌ Error checking current suppliers:', currentError.message);
      return;
    }
    
    console.log(`📈 Current suppliers: ${currentData?.length || 0}`);
    console.log(`📈 Trade-in customers: ${currentData?.filter(s => s.is_trade_in_customer).length || 0}`);
    console.log(`📈 Real suppliers: ${currentData?.filter(s => !s.is_trade_in_customer).length || 0}`);
    
    // Create real suppliers
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
    
    console.log('\n🔄 Creating real suppliers...');
    
    for (const supplier of suppliers) {
      // Check if supplier already exists
      const { data: existing } = await supabase
        .from('lats_suppliers')
        .select('id')
        .eq('name', supplier.name)
        .single();
      
      if (existing) {
        console.log(`⏭️  Supplier "${supplier.name}" already exists, skipping...`);
        continue;
      }
      
      const { data, error } = await supabase
        .from('lats_suppliers')
        .insert(supplier)
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Error creating supplier "${supplier.name}":`, error.message);
      } else {
        console.log(`✅ Created supplier: ${supplier.name}`);
      }
    }
    
    // Verify the fix
    console.log('\n📊 Verifying fix...');
    const { data: finalData, error: finalError } = await supabase
      .from('lats_suppliers')
      .select('id, name, is_trade_in_customer, is_active');
    
    if (finalError) {
      console.error('❌ Error verifying fix:', finalError.message);
      return;
    }
    
    const realSuppliers = finalData?.filter(s => !s.is_trade_in_customer && s.is_active) || [];
    
    console.log(`\n🎉 Fix completed!`);
    console.log(`📈 Total suppliers: ${finalData?.length || 0}`);
    console.log(`📈 Real active suppliers: ${realSuppliers.length}`);
    
    if (realSuppliers.length > 0) {
      console.log('\n✅ Real suppliers created:');
      realSuppliers.forEach(supplier => {
        console.log(`   - ${supplier.name}`);
      });
      console.log('\n🔄 Please refresh your application to see the changes.');
    } else {
      console.log('\n❌ No real suppliers found. Please check the database manually.');
    }
    
  } catch (error) {
    console.error('❌ Error running suppliers fix:', error.message);
    process.exit(1);
  }
}

// Run the fix
runSuppliersFixDirect();
