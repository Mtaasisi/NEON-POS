#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

console.log('📝 Adding test customers to your database...\n');

const testCustomers = [
  {
    name: 'A - Zone Electronics',
    phone: '+255 712 000 001',
    email: 'azone@example.com',
    city: 'Dar es Salaam',
    total_spent: 5600000,
    points: 560,
    notes: 'Corporate client - bulk electronics'
  },
  {
    name: 'John Mwangi',
    phone: '+255 712 345 678',
    email: 'john.mwangi@gmail.com',
    city: 'Arusha',
    total_spent: 2450000,
    points: 245,
    notes: 'Regular customer - prefers Samsung devices'
  },
  {
    name: 'Mary Kamau',
    phone: '+255 723 456 789',
    email: 'mary.kamau@yahoo.com',
    city: 'Dar es Salaam',
    total_spent: 1850000,
    points: 185,
    notes: 'VIP customer - interested in Apple products'
  },
  {
    name: 'James Omondi',
    phone: '+255 734 567 890',
    email: 'james.o@outlook.com',
    city: 'Mwanza',
    total_spent: 980000,
    points: 98,
    notes: 'New customer - looking for laptops'
  },
  {
    name: 'Grace Njeri',
    phone: '+255 745 678 901',
    email: 'grace.njeri@gmail.com',
    city: 'Dodoma',
    total_spent: 3200000,
    points: 320,
    notes: 'Frequent buyer - accessories and phones'
  },
  {
    name: 'David Mbogo',
    phone: '+255 756 789 012',
    email: 'david.mbogo@hotmail.com',
    city: 'Dar es Salaam',
    total_spent: 1450000,
    points: 145,
    notes: 'Corporate account - IT department'
  },
  {
    name: 'Sarah Wanjiku',
    phone: '+255 767 890 123',
    email: 'sarah.w@gmail.com',
    city: 'Arusha',
    total_spent: 890000,
    points: 89,
    notes: 'Student - budget-conscious shopper'
  },
  {
    name: 'Peter Kimani',
    phone: '+255 778 901 234',
    city: 'Mbeya',
    total_spent: 2100000,
    points: 210,
    notes: 'Business owner - bulk purchases'
  }
];

async function addTestCustomers() {
  try {
    console.log(`Adding ${testCustomers.length} test customers...\n`);
    
    let successCount = 0;
    
    for (const customer of testCustomers) {
      try {
        const result = await sql`
          INSERT INTO customers (
            name, 
            phone, 
            email, 
            city, 
            total_spent, 
            points, 
            notes,
            loyalty_level,
            is_active,
            last_activity_date,
            total_purchases
          ) VALUES (
            ${customer.name},
            ${customer.phone},
            ${customer.email || null},
            ${customer.city},
            ${customer.total_spent},
            ${customer.points},
            ${customer.notes},
            ${customer.total_spent > 3000000 ? 'gold' : customer.total_spent > 1000000 ? 'silver' : 'bronze'},
            true,
            NOW(),
            ${Math.floor(customer.total_spent / 100000)}
          )
          RETURNING id, name
        `;
        
        console.log(`✅ Added: ${result[0].name}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to add ${customer.name}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`\n🎉 Successfully added ${successCount}/${testCustomers.length} test customers!`);
    
    // Verify
    const count = await sql`SELECT COUNT(*) as count FROM customers`;
    console.log(`\n📊 Total customers in database: ${count[0].count}`);
    
    console.log('\n✅ Your mobile app should now show these customers!');
    console.log('   Refresh the app to see them: /mobile/clients');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   - Database connection is working');
    console.error('   - customers table exists');
    console.error('   - You have insert permissions');
  }
}

addTestCustomers();








