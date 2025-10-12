#!/usr/bin/env node

import { readFileSync } from 'fs';
import postgres from 'postgres';

console.log('👥 Creating 2 Test Customers');
console.log('═══════════════════════════════════════════════\n');

// Read database URL from .env
const envContent = readFileSync('.env', 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);

if (!dbUrlMatch) {
  console.error('❌ Could not find DATABASE_URL in .env');
  process.exit(1);
}

const databaseUrl = dbUrlMatch[1].trim();
console.log('✅ Found database connection');
console.log('🔗 Connecting to database...\n');

// Create postgres client
const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 1
});

async function createCustomers() {
  try {
    console.log('👤 Creating Customer 1: John Mwamba...');
    
    // Customer 1
    const customer1Id = crypto.randomUUID();
    const customer1 = await sql`
      INSERT INTO customers (
        id, name, phone, email, gender, city,
        loyalty_level, color_tag, points, total_spent,
        is_active, joined_date, last_visit, created_at, updated_at,
        whatsapp, birth_month, birth_day, referral_source
      ) VALUES (
        ${customer1Id},
        'John Mwamba',
        '+255712345678',
        'john.mwamba@example.com',
        'male',
        'Dar es Salaam',
        'bronze',
        'new',
        10,
        0,
        true,
        ${new Date().toISOString().split('T')[0]},
        ${new Date().toISOString()},
        ${new Date().toISOString()},
        ${new Date().toISOString()},
        '+255712345678',
        'January',
        '15',
        'Walk-in'
      )
      RETURNING id, name, phone, email, points
    `;
    
    console.log('✅ Created:', customer1[0].name);
    console.log('   📞 Phone:', customer1[0].phone);
    console.log('   📧 Email:', customer1[0].email);
    console.log('   ⭐ Points:', customer1[0].points);
    console.log('');
    
    // Add welcome note for customer 1
    await sql`
      INSERT INTO customer_notes (
        id, customer_id, note, created_by, created_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${customer1Id},
        'Welcome to our store! Thank you for joining us. Enjoy your 10 welcome points!',
        NULL,
        ${new Date().toISOString()}
      )
    `;
    console.log('   📝 Welcome note added');
    console.log('');
    
    // Customer 2
    console.log('👤 Creating Customer 2: Mary Kamwela...');
    
    const customer2Id = crypto.randomUUID();
    const customer2 = await sql`
      INSERT INTO customers (
        id, name, phone, email, gender, city,
        loyalty_level, color_tag, points, total_spent,
        is_active, joined_date, last_visit, created_at, updated_at,
        whatsapp, birth_month, birth_day, referral_source
      ) VALUES (
        ${customer2Id},
        'Mary Kamwela',
        '+255787654321',
        'mary.kamwela@example.com',
        'female',
        'Arusha',
        'bronze',
        'new',
        10,
        0,
        true,
        ${new Date().toISOString().split('T')[0]},
        ${new Date().toISOString()},
        ${new Date().toISOString()},
        ${new Date().toISOString()},
        '+255787654321',
        'March',
        '22',
        'Friend'
      )
      RETURNING id, name, phone, email, points
    `;
    
    console.log('✅ Created:', customer2[0].name);
    console.log('   📞 Phone:', customer2[0].phone);
    console.log('   📧 Email:', customer2[0].email);
    console.log('   ⭐ Points:', customer2[0].points);
    console.log('');
    
    // Add welcome note for customer 2
    await sql`
      INSERT INTO customer_notes (
        id, customer_id, note, created_by, created_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${customer2Id},
        'Welcome to our store! Thank you for joining us. Enjoy your 10 welcome points!',
        NULL,
        ${new Date().toISOString()}
      )
    `;
    console.log('   📝 Welcome note added');
    console.log('');
    
    // Verify
    console.log('═══════════════════════════════════════════════');
    console.log('🎉 CUSTOMERS CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════\n');
    
    const allCustomers = await sql`
      SELECT 
        name, phone, email, gender, city, points, 
        loyalty_level, color_tag, joined_date
      FROM customers
      WHERE name IN ('John Mwamba', 'Mary Kamwela')
      ORDER BY name
    `;
    
    console.log('📊 Customer Summary:\n');
    allCustomers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name}`);
      console.log(`   Phone: ${customer.phone}`);
      console.log(`   Email: ${customer.email}`);
      console.log(`   Gender: ${customer.gender}`);
      console.log(`   City: ${customer.city}`);
      console.log(`   Points: ${customer.points}`);
      console.log(`   Level: ${customer.loyalty_level}`);
      console.log(`   Tag: ${customer.color_tag}`);
      console.log(`   Joined: ${customer.joined_date}`);
      console.log('');
    });
    
    // Count total customers
    const total = await sql`SELECT COUNT(*) as count FROM customers`;
    console.log(`✅ Total customers in database: ${total[0].count}`);
    console.log('');
    
    console.log('═══════════════════════════════════════════════');
    console.log('✨ You can now see these customers in your POS app!');
    console.log('═══════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Error creating customers:', error.message);
    console.error('\nPlease check the error and try again.\n');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the creation
createCustomers();

