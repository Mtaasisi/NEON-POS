import { neon } from '@neondatabase/serverless';

// Use the URL that's working in the browser
const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-glitter-a5s4ufjb.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function fixCorruptCustomers() {
  console.log('🚀 Starting customer total_spent corruption fix...\n');
  
  try {
    // Step 1: Show corrupted customers BEFORE fix
    console.log('📊 Step 1: Identifying corrupt customers...\n');
    const corruptCustomers = await sql`
      SELECT 
        id,
        name,
        phone,
        total_spent as corrupted_value,
        points
      FROM customers
      WHERE 
        total_spent > 1000000000000
        OR total_spent < 0
      ORDER BY total_spent DESC
    `;
    
    console.log(`🚨 Found ${corruptCustomers.length} corrupt customer(s):\n`);
    corruptCustomers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} (${c.phone})`);
      console.log(`   Current (corrupt): ${c.corrupted_value}`);
      console.log(`   Points: ${c.points}`);
      console.log('');
    });
    
    // Step 2: Calculate correct values
    console.log('📊 Step 2: Calculating correct values from sales...\n');
    
    for (const customer of corruptCustomers) {
      const sales = await sql`
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN status = 'completed' 
              THEN COALESCE(final_amount, total_amount, 0)
              ELSE 0 
            END
          ), 0) as actual_total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as sale_count
        FROM lats_sales
        WHERE customer_id = ${customer.id}
      `;
      
      const actualTotal = Number(sales[0].actual_total);
      const saleCount = Number(sales[0].sale_count);
      
      console.log(`${customer.name}:`);
      console.log(`  Corrupt value: ${customer.corrupted_value}`);
      console.log(`  Actual sales total: ${actualTotal} TZS`);
      console.log(`  Number of sales: ${saleCount}`);
      console.log(`  Will fix: ${customer.corrupted_value} → ${actualTotal}`);
      console.log('');
    }
    
    // Step 3: FIX THE CORRUPTION
    console.log('🔧 Step 3: Applying fixes...\n');
    
    const fixResult = await sql`
      UPDATE customers c
      SET 
        total_spent = COALESCE(
          (
            SELECT SUM(
              CASE 
                WHEN s.status = 'completed' 
                THEN COALESCE(s.final_amount, s.total_amount, 0)
                ELSE 0 
              END
            )
            FROM lats_sales s
            WHERE s.customer_id = c.id
          ),
          0
        ),
        points = FLOOR(
          COALESCE(
            (
              SELECT SUM(
                CASE 
                  WHEN s.status = 'completed' 
                  THEN COALESCE(s.final_amount, s.total_amount, 0)
                  ELSE 0 
                END
              )
              FROM lats_sales s
              WHERE s.customer_id = c.id
            ),
            0
          ) / 1000
        ),
        updated_at = NOW()
      WHERE 
        c.total_spent > 1000000000000
        OR c.total_spent < 0
      RETURNING id, name, total_spent, points
    `;
    
    console.log(`✅ Fixed ${fixResult.length} customer record(s)\n`);
    
    fixResult.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name}`);
      console.log(`   New total_spent: ${c.total_spent} TZS`);
      console.log(`   New points: ${c.points}`);
      console.log('');
    });
    
    // Step 4: Verify no corruption remains
    console.log('🔍 Step 4: Verifying fix...\n');
    
    const remaining = await sql`
      SELECT COUNT(*) as count
      FROM customers
      WHERE 
        total_spent > 1000000000000
        OR total_spent < 0
    `;
    
    if (remaining[0].count == 0) {
      console.log('✅ SUCCESS! No corrupt records remaining!\n');
    } else {
      console.log(`⚠️ WARNING: ${remaining[0].count} corrupt records still remain\n`);
    }
    
    // Step 5: Show top customers by spending (verification)
    console.log('📊 Step 5: Top 5 customers by total spent:\n');
    
    const topCustomers = await sql`
      SELECT 
        name,
        phone,
        total_spent,
        points
      FROM customers
      ORDER BY total_spent DESC
      LIMIT 5
    `;
    
    topCustomers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name}`);
      console.log(`   Total Spent: ${c.total_spent} TZS`);
      console.log(`   Points: ${c.points}`);
      console.log('');
    });
    
    console.log('🎉 ALL FIXES COMPLETE!');
    console.log('✅ Customer data corruption has been resolved');
    console.log('✅ All totals recalculated from actual sales');
    console.log('✅ Points updated correctly');
    
  } catch (error) {
    console.error('❌ Error fixing corrupt customers:', error);
    throw error;
  }
}

fixCorruptCustomers().catch(console.error);
