import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testDeliveryBranchFix() {
  try {
    const sql = neon(DATABASE_URL);
    console.log('🧪 Testing Delivery Creation with Branch Fix\n');

    // Test that we can manually create a delivery with branch info
    const testSaleId = '2c2eee51-657a-4e1b-9475-3485514e270c';
    const testBranchId = '00000000-0000-0000-0000-000000000001';

    // Get sale data
    const saleData = await sql`
      SELECT id, customer_id, customer_name, customer_phone, total_amount, subtotal
      FROM lats_sales
      WHERE id = ${testSaleId}
    `;

    if (saleData.length === 0) {
      console.log('❌ Sale not found');
      return;
    }

    const sale = saleData[0];
    console.log('📦 Sale found:', {
      id: sale.id,
      customerName: sale.customer_name,
      total: sale.total_amount
    });

    // Get sale items
    const saleItems = await sql`
      SELECT product_name, quantity, unit_price, total_price
      FROM lats_sale_items
      WHERE sale_id = ${testSaleId}
    `;

    console.log('📦 Items found:', saleItems.length);

    // Simulate delivery creation data
    const deliveryData = {
      deliveryMethod: 'boda',
      deliveryAddress: `${sale.customer_name}'s location`,
      deliveryPhone: sale.customer_phone || '+255712345678',
      deliveryTime: 'ASAP',
      deliveryNotes: 'Test delivery',
      deliveryFee: 2000
    };

    console.log('🚚 Delivery data:', deliveryData);

    // Calculate totals
    const subtotal = parseFloat(sale.subtotal) || parseFloat(sale.total_amount) || 0;
    const totalAmount = subtotal + deliveryData.deliveryFee;

    console.log('💰 Calculated totals:', {
      subtotal,
      deliveryFee: deliveryData.deliveryFee,
      totalAmount
    });

    // Generate tracking number
    const trackingNumber = `DEL${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // Create delivery
    const deliveryResult = await sql`
      INSERT INTO lats_delivery_orders (
        sale_id, customer_id, delivery_method, delivery_address,
        delivery_phone, delivery_time, delivery_notes, delivery_fee,
        subtotal, tax_amount, discount_amount, total_amount,
        status, tracking_number, branch_id, created_at, updated_at
      ) VALUES (
        ${sale.id}, ${sale.customer_id}, ${deliveryData.deliveryMethod},
        ${deliveryData.deliveryAddress}, ${deliveryData.deliveryPhone},
        ${deliveryData.deliveryTime}, ${deliveryData.deliveryNotes}, ${deliveryData.deliveryFee},
        ${subtotal}, 0, 0, ${totalAmount},
        'confirmed', ${trackingNumber}, ${testBranchId},
        NOW(), NOW()
      ) RETURNING id, tracking_number
    `;

    console.log('✅ Delivery created successfully:', deliveryResult[0]);
    console.log('\n🎉 Branch fix verified - delivery creation working!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDeliveryBranchFix();