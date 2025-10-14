import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-dry-brook-ad3duuog-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function checkCorruptCustomer() {
  console.log('🔍 Checking customer data in database...\n');
  
  // Get the specific customer mentioned
  const customer = await sql`
    SELECT 
      id,
      name,
      phone,
      total_spent,
      points,
      city
    FROM customers 
    WHERE name LIKE '%Samuel masikabbbb%'
    LIMIT 1
  `;
  
  if (customer && customer.length > 0) {
    console.log('📊 Found customer:', customer[0].name);
    console.log('📞 Phone:', customer[0].phone);
    console.log('🆔 ID:', customer[0].id);
    console.log('💰 Total Spent (raw):', customer[0].total_spent);
    console.log('💰 Total Spent (type):', typeof customer[0].total_spent);
    console.log('💰 Total Spent (string):', String(customer[0].total_spent));
    console.log('⭐ Points:', customer[0].points);
    console.log('📍 City:', customer[0].city);
    console.log('\n');
    
    // Check if it matches the display value
    const displayValue = '62481506778870434343543547784343';
    console.log('🔢 Display shows (as string):', displayValue);
    console.log('🔢 Database has (as string):', String(customer[0].total_spent));
    console.log('✅ Exact match?', String(customer[0].total_spent) === displayValue);
    console.log('\n');
  } else {
    console.log('❌ Customer not found');
  }
  
  // Get all customers with very high total_spent
  console.log('🔍 All customers with total_spent > 1 billion:\n');
  const highSpenders = await sql`
    SELECT 
      name,
      phone,
      total_spent,
      points
    FROM customers 
    WHERE total_spent > 1000000000
    ORDER BY total_spent DESC
  `;
  
  console.log(`Found ${highSpenders.length} customers:\n`);
  highSpenders.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name}`);
    console.log(`   Total Spent: ${c.total_spent}`);
    console.log(`   Points: ${c.points}`);
    console.log(`   Phone: ${c.phone}`);
    console.log('');
  });
}

checkCorruptCustomer().catch(console.error);
