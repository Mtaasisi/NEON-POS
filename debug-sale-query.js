import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function debugSaleQuery() {
  try {
    const sql = neon(DATABASE_URL);
    console.log('🔍 Debugging Sale Query Issues\n');

    // Check recent sales
    console.log('📊 Recent Sales:');
    const recentSales = await sql`
      SELECT id, sale_number, customer_name, total_amount, created_at
      FROM lats_sales
      ORDER BY created_at DESC
      LIMIT 5
    `;

    recentSales.forEach((sale, i) => {
      console.log(`${i + 1}. ID: ${sale.id}`);
      console.log(`   Sale #: ${sale.sale_number}`);
      console.log(`   Customer: ${sale.customer_name}`);
      console.log(`   Total: TZS ${sale.total_amount}`);
      console.log(`   Created: ${sale.created_at}`);
      console.log('');
    });

    // Check if there are any sales with deliveries
    console.log('🔗 Sales with Deliveries:');
    const salesWithDeliveries = await sql`
      SELECT s.id, s.sale_number, s.customer_name, d.id as delivery_id, d.tracking_number
      FROM lats_sales s
      INNER JOIN lats_delivery_orders d ON s.id = d.sale_id
      ORDER BY s.created_at DESC
      LIMIT 5
    `;

    if (salesWithDeliveries.length === 0) {
      console.log('No sales found with deliveries');
    } else {
      salesWithDeliveries.forEach((item, i) => {
        console.log(`${i + 1}. Sale ${item.sale_number} has delivery ${item.tracking_number}`);
      });
    }

    console.log('\n✅ Debug complete');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugSaleQuery();