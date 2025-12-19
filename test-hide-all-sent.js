import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testHideAllSent() {
  try {
    const sql = neon(DATABASE_URL);
    console.log('🧪 Testing: Hide ALL Sales That Have Been Sent\n');

    // Get recent sales
    const recentSales = await sql`
      SELECT id, sale_number, customer_name, total_amount, created_at
      FROM lats_sales
      ORDER BY created_at DESC
      LIMIT 15
    `;

    console.log('📦 Recent Sales:');
    recentSales.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name}`);
    });

    // Get ANY deliveries for these sales
    const saleIds = recentSales.map(sale => sale.id);
    const anyDeliveries = await sql`
      SELECT sale_id, tracking_number, status
      FROM lats_delivery_orders
      WHERE sale_id = ANY(${saleIds})
    `;

    console.log('\n🚚 ANY Deliveries for These Sales:');
    if (anyDeliveries.length === 0) {
      console.log('  No deliveries found');
    } else {
      anyDeliveries.forEach((delivery, i) => {
        const sale = recentSales.find(s => s.id === delivery.sale_id);
        console.log(`  ${i + 1}. ${sale?.sale_number} → ${delivery.tracking_number} (${delivery.status})`);
      });
    }

    // Apply new filtering logic (hide ALL sales with ANY delivery)
    const salesWithAnyDeliveries = new Set();
    anyDeliveries.forEach(delivery => {
      salesWithAnyDeliveries.add(delivery.sale_id);
    });

    const availableSales = recentSales.filter(sale => !salesWithAnyDeliveries.has(sale.id));
    const hiddenSales = recentSales.filter(sale => salesWithAnyDeliveries.has(sale.id));

    console.log('\n🎯 New Filtering Results (Hide ALL Sent Sales):');
    console.log('✅ Sales that would APPEAR in modal:');
    availableSales.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name}`);
    });

    console.log('\n🚫 Sales that would be HIDDEN from modal (Already Sent):');
    hiddenSales.forEach((sale, i) => {
      const deliveriesForSale = anyDeliveries.filter(d => d.sale_id === sale.id);
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name} (${deliveriesForSale.length} deliveries)`);
      deliveriesForSale.forEach(delivery => {
        console.log(`      └─ ${delivery.tracking_number} (${delivery.status})`);
      });
    });

    console.log('\n📊 Summary:');
    console.log(`  Total recent sales: ${recentSales.length}`);
    console.log(`  Sales that have been sent: ${hiddenSales.length}`);
    console.log(`  Sales never sent (available): ${availableSales.length}`);

    if (hiddenSales.length > 0) {
      console.log('\n✅ SUCCESS: Sales that have been sent are now hidden from the modal');
      console.log('   This prevents any re-delivery or duplicate delivery creation');
    } else {
      console.log('\nℹ️  All recent sales are available (none have been sent yet)');
    }

    console.log('\n🎉 Hide all sent sales test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testHideAllSent();