import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function debugSalesFiltering() {
  try {
    const sql = neon(DATABASE_URL);
    console.log('🔍 Debugging Sales Filtering in Create Delivery Modal\n');

    // Get recent sales
    const recentSales = await sql`
      SELECT id, sale_number, customer_name, total_amount, created_at
      FROM lats_sales
      ORDER BY created_at DESC
      LIMIT 10
    `;

    console.log('📦 Recent Sales:');
    recentSales.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name} - TZS ${sale.total_amount}`);
    });

    // Get delivery status for these sales
    const saleIds = recentSales.map(sale => sale.id);
    const deliveries = await sql`
      SELECT sale_id, tracking_number, status
      FROM lats_delivery_orders
      WHERE sale_id = ANY(${saleIds})
    `;

    console.log('\n🚚 Deliveries for Recent Sales:');
    if (deliveries.length === 0) {
      console.log('  No deliveries found');
    } else {
      deliveries.forEach((delivery, i) => {
        const sale = recentSales.find(s => s.id === delivery.sale_id);
        console.log(`  ${i + 1}. ${sale?.sale_number} → ${delivery.tracking_number} (${delivery.status})`);
      });
    }

    // Simulate the filtering logic
    const deliveryCountMap = {};
    deliveries.forEach(delivery => {
      deliveryCountMap[delivery.sale_id] = (deliveryCountMap[delivery.sale_id] || 0) + 1;
    });

    console.log('\n🔍 Filtering Logic Simulation:');
    const availableSales = recentSales.filter(sale => (deliveryCountMap[sale.id] || 0) === 0);
    const hiddenSales = recentSales.filter(sale => (deliveryCountMap[sale.id] || 0) > 0);

    console.log('✅ Sales that would APPEAR in modal:');
    availableSales.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name}`);
    });

    console.log('\n🚫 Sales that would be HIDDEN from modal:');
    hiddenSales.forEach((sale, i) => {
      const deliveryCount = deliveryCountMap[sale.id] || 0;
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name} (${deliveryCount} deliveries)`);
    });

    // Check delivery statuses
    console.log('\n📊 Delivery Status Breakdown:');
    const statusCounts = {};
    deliveries.forEach(delivery => {
      statusCounts[delivery.status] = (statusCounts[delivery.status] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} deliveries`);
    });

    console.log('\n🎯 Summary:');
    console.log(`  Total recent sales: ${recentSales.length}`);
    console.log(`  Sales with deliveries: ${hiddenSales.length}`);
    console.log(`  Sales available for delivery: ${availableSales.length}`);

    if (hiddenSales.length > 0) {
      console.log('\n⚠️  If sales with deliveries are still showing in the modal,');
      console.log('   there might be an issue with the filtering logic.');
    } else {
      console.log('\n✅ All recent sales are available for delivery creation.');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugSalesFiltering();