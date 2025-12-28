import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testSalesQuery() {
  try {
    const sql = neon(DATABASE_URL);
    console.log('🧪 Testing Sales Query for Delivery Modal\n');

    // Test the corrected query - simplified version
    const { data: salesData, error } = await sql`
      SELECT id, sale_number, customer_name, total_amount, created_at
      FROM lats_sales
      ORDER BY created_at DESC
      LIMIT 5
    `;

    if (error) {
      console.error('❌ Query error:', error);
      return;
    }

    console.log('Raw result:', { data: salesData, error });
    console.log('Data type:', typeof salesData);
    console.log('Data is array:', Array.isArray(salesData));

    if (!salesData) {
      console.error('❌ salesData is null or undefined');
      return;
    }

    console.log(`✅ Found ${salesData.length} recent sales\n`);

    // Filter sales without deliveries
    const availableSales = salesData.filter(sale => sale.delivery_count === 0);

    console.log(`📦 Available for delivery creation: ${availableSales.length} sales\n`);

    availableSales.forEach((sale, i) => {
      console.log(`${i + 1}. ${sale.sale_number} - ${sale.customer_name} - TZS ${sale.total_amount} (${sale.items_count} items)`);
    });

    if (availableSales.length === 0) {
      console.log('ℹ️  All recent sales already have deliveries');
    }

    console.log('\n🎉 Query test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSalesQuery();