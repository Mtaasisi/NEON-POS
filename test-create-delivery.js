import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testCreateDelivery() {
  try {
    const sql = neon(DATABASE_URL);
    console.log('🧪 Testing Delivery Creation\n');

    // Get a sale that doesn't have a delivery
    const availableSales = await sql`
      SELECT s.id, s.sale_number, s.customer_name, s.customer_phone, s.total_amount
      FROM lats_sales s
      LEFT JOIN lats_delivery_orders d ON s.id = d.sale_id
      WHERE d.id IS NULL
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    if (availableSales.length === 0) {
      console.log('❌ No sales available for delivery creation');
      return;
    }

    const testSale = availableSales[0];
    console.log('🎯 Using sale:', {
      id: testSale.id,
      saleNumber: testSale.sale_number,
      customerName: testSale.customer_name,
      total: testSale.total_amount
    });

    // Try to query the sale directly like the service does
    const saleQuery = await sql`
      SELECT
        id,
        customer_id,
        customer_name,
        customer_phone,
        customer_email,
        total_amount,
        subtotal,
        tax,
        discount
      FROM lats_sales
      WHERE id = ${testSale.id}
    `;

    console.log('🔍 Direct sale query result:', {
      found: saleQuery.length,
      sale: saleQuery[0]
    });

    if (saleQuery.length === 0) {
      console.log('❌ Sale not found in direct query');
      return;
    }

    // Try creating a delivery manually
    console.log('🚚 Attempting to create delivery...');

    const trackingNumber = `DEL${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const deliveryResult = await sql`
      INSERT INTO lats_delivery_orders (
        sale_id, customer_id, delivery_method, delivery_address,
        delivery_phone, delivery_fee, subtotal, total_amount, status,
        tracking_number, branch_id
      ) VALUES (
        ${testSale.id}, '00000000-0000-0000-0000-000000000001', 'boda',
        ${testSale.customer_name + "'s location"}, ${testSale.customer_phone || '+255712345678'},
        2000, ${parseFloat(testSale.total)}, ${parseFloat(testSale.total) + 2000}, 'confirmed',
        ${trackingNumber}, '00000000-0000-0000-0000-000000000001'
      ) RETURNING id, tracking_number
    `;

    console.log('✅ Delivery created successfully:', deliveryResult[0]);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCreateDelivery();