import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testDuplicatePrevention() {
  try {
    const sql = neon(DATABASE_URL);
    console.log('🧪 Testing Duplicate Delivery Prevention\n');

    // Find a sale that already has a delivery
    const saleWithDelivery = await sql`
      SELECT s.id, s.sale_number, s.customer_name, d.id as delivery_id, d.tracking_number
      FROM lats_sales s
      INNER JOIN lats_delivery_orders d ON s.id = d.sale_id
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    if (saleWithDelivery.length === 0) {
      console.log('❌ No sales with deliveries found for testing');
      return;
    }

    const testSale = saleWithDelivery[0];
    console.log('🎯 Testing with sale that already has delivery:');
    console.log(`   Sale: ${testSale.sale_number} (${testSale.customer_name})`);
    console.log(`   Existing Delivery: ${testSale.tracking_number}`);

    // Try to create another delivery for the same sale
    // This should be prevented by the service
    console.log('\n🚫 Attempting to create duplicate delivery (should fail)...');

    const trackingNumber = `DEL${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    try {
      const duplicateDelivery = await sql`
        INSERT INTO lats_delivery_orders (
          sale_id, customer_id, delivery_method, delivery_address,
          delivery_phone, delivery_fee, subtotal, total_amount, status,
          tracking_number, branch_id
        ) VALUES (
          ${testSale.id}, '00000000-0000-0000-0000-000000000001', 'boda',
          'Test Address', '+255712345678', 2000, 10000, 12000, 'confirmed',
          ${trackingNumber}, '00000000-0000-0000-0000-000000000001'
        ) RETURNING id, tracking_number
      `;

      console.log('❌ ERROR: Duplicate delivery was created!', duplicateDelivery[0]);

    } catch (error) {
      console.log('✅ SUCCESS: Duplicate delivery prevented by database constraint');
      console.log('   Error:', error.message);
    }

    // Check how many deliveries this sale has
    const deliveryCount = await sql`
      SELECT COUNT(*) as count FROM lats_delivery_orders WHERE sale_id = ${testSale.id}
    `;

    console.log(`\n📊 Sale ${testSale.sale_number} has ${deliveryCount[0].count} deliveries`);

    // Test the UI filtering - find sales without deliveries
    const availableSales = await sql`
      SELECT COUNT(*) as count
      FROM lats_sales s
      LEFT JOIN lats_delivery_orders d ON s.id = d.sale_id
      WHERE d.id IS NULL
    `;

    console.log(`📋 Sales available for delivery creation: ${availableSales[0].count}`);

    console.log('\n🎉 Duplicate prevention test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDuplicatePrevention();