import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testNewFiltering() {
  try {
    const sql = neon(DATABASE_URL);
    console.log('🧪 Testing New Sales Filtering Logic\n');

    // Get recent sales
    const recentSales = await sql`
      SELECT id, sale_number, customer_name, total_amount, created_at
      FROM lats_sales
      ORDER BY created_at DESC
      LIMIT 10
    `;

    console.log('📦 Recent Sales:');
    recentSales.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name}`);
    });

    // Get ONLY active deliveries (new logic)
    const saleIds = recentSales.map(sale => sale.id);
    const activeDeliveries = await sql`
      SELECT sale_id, tracking_number, status
      FROM lats_delivery_orders
      WHERE sale_id = ANY(${saleIds})
      AND status IN ('pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery')
    `;

    console.log('\n🚚 Active Deliveries (that should hide sales):');
    if (activeDeliveries.length === 0) {
      console.log('  No active deliveries found');
    } else {
      activeDeliveries.forEach((delivery, i) => {
        const sale = recentSales.find(s => s.id === delivery.sale_id);
        console.log(`  ${i + 1}. ${sale?.sale_number} → ${delivery.tracking_number} (${delivery.status})`);
      });
    }

    // Get completed/cancelled deliveries (should allow sales to be shown)
    const completedDeliveries = await sql`
      SELECT sale_id, tracking_number, status
      FROM lats_delivery_orders
      WHERE sale_id = ANY(${saleIds})
      AND status IN ('delivered', 'cancelled', 'failed', 'returned')
    `;

    console.log('\n✅ Completed/Cancelled Deliveries (sales can be shown again):');
    if (completedDeliveries.length === 0) {
      console.log('  No completed/cancelled deliveries found');
    } else {
      completedDeliveries.forEach((delivery, i) => {
        const sale = recentSales.find(s => s.id === delivery.sale_id);
        console.log(`  ${i + 1}. ${sale?.sale_number} → ${delivery.tracking_number} (${delivery.status})`);
      });
    }

    // Apply new filtering logic
    const salesWithActiveDeliveries = new Set();
    activeDeliveries.forEach(delivery => {
      salesWithActiveDeliveries.add(delivery.sale_id);
    });

    const availableSales = recentSales.filter(sale => !salesWithActiveDeliveries.has(sale.id));
    const hiddenSales = recentSales.filter(sale => salesWithActiveDeliveries.has(sale.id));

    console.log('\n🎯 New Filtering Results:');
    console.log('✅ Sales that would APPEAR in modal:');
    availableSales.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name}`);
    });

    console.log('\n🚫 Sales that would be HIDDEN from modal:');
    hiddenSales.forEach((sale, i) => {
      const activeDeliveriesForSale = activeDeliveries.filter(d => d.sale_id === sale.id);
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name} (${activeDeliveriesForSale.length} active deliveries)`);
    });

    console.log('\n📊 Summary:');
    console.log(`  Total recent sales: ${recentSales.length}`);
    console.log(`  Sales with active deliveries: ${hiddenSales.length}`);
    console.log(`  Sales available for new delivery: ${availableSales.length}`);

    if (completedDeliveries.length > 0) {
      console.log('\n♻️  Sales with completed/cancelled deliveries can be shown again for new deliveries');
    }

    console.log('\n🎉 New filtering logic test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNewFiltering();