import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testDeliveryFix() {
  try {
    const sql = neon(DATABASE_URL);
    console.log('🧪 Testing Delivery Creation Fix\n');

    // Test the corrected sale query approach
    const testSaleId = '2c2eee51-657a-4e1b-9475-3485514e270c';

    // Step 1: Get sale data
    const saleData = await sql`
      SELECT id, customer_id, customer_name, customer_phone, customer_email,
             total_amount, subtotal, tax, discount
      FROM lats_sales
      WHERE id = ${testSaleId}
    `;

    console.log('📦 Sale data query result:', {
      found: saleData.length,
      sale: saleData[0]
    });

    if (saleData.length === 0) {
      console.log('❌ Sale not found');
      return;
    }

    const sale = saleData[0];

    // Step 2: Get sale items
    const saleItems = await sql`
      SELECT product_name, quantity, unit_price, total_price
      FROM lats_sale_items
      WHERE sale_id = ${testSaleId}
    `;

    console.log('📦 Sale items query result:', {
      count: saleItems.length,
      items: saleItems
    });

    // Combine the data like the service does
    sale.items = saleItems;

    console.log('✅ Combined sale data:', {
      id: sale.id,
      customerName: sale.customer_name,
      total: sale.total_amount,
      itemCount: sale.items.length
    });

    console.log('\n🎉 Delivery creation query fix verified!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDeliveryFix();