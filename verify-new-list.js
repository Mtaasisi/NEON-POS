import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function verifyNewList() {
  try {
    const sql = neon(DATABASE_URL);
    console.log('🔍 Verifying New Sales List in Modal (After Hiding All Sent Sales)\n');

    // List of sales from the user's current screenshot
    const currentModalSales = [
      'SALE-19161834-1K5B',
      'SALE-18557507-MB7V',
      'SALE-15929401-9NZF',
      'SALE-43233064-KAOU',
      'SALE-42034282-UDZQ',
      'SALE-41418543-3RL7',
      'SALE-41007758-37V6',
      'SALE-36945028-KXTO',
      'SALE-56861023-AMJ8',
      'SALE-59363607-6F15',
      'SALE-37450895-TL8M',
      'SALE-37297785-FTAY',
      'SALE-37108220-V3BO'
    ];

    console.log(`Checking ${currentModalSales.length} sales currently shown in modal...\n`);

    // Get sale data for these sales
    const salesData = await sql`
      SELECT id, sale_number, customer_name, total_amount, created_at
      FROM lats_sales
      WHERE sale_number = ANY(${currentModalSales})
      ORDER BY created_at DESC
    `;

    console.log('📦 Sales in Current Modal:');
    salesData.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name} - TZS ${sale.total_amount}`);
    });

    // Check for ANY deliveries for these sales
    const saleIds = salesData.map(sale => sale.id);
    const allDeliveries = await sql`
      SELECT sale_id, tracking_number, status
      FROM lats_delivery_orders
      WHERE sale_id = ANY(${saleIds})
    `;

    console.log('\n🚚 Delivery Check for Current Modal Sales:');
    if (allDeliveries.length === 0) {
      console.log('  ✅ PERFECT: No deliveries found for any sales in the modal!');
      console.log('  ✅ All sales shown are truly "never sent"');
    } else {
      console.log('  ❌ ERROR: Found deliveries for some sales:');
      allDeliveries.forEach((delivery, i) => {
        const sale = salesData.find(s => s.id === delivery.sale_id);
        console.log(`     ${i + 1}. ${sale?.sale_number} → ${delivery.tracking_number} (${delivery.status})`);
      });
    }

    // Also check what sales are being hidden
    console.log('\n🚫 Sales That Should Be Hidden (Have Deliveries):');

    // Get recent sales and their delivery status
    const recentSales = await sql`
      SELECT s.id, s.sale_number, s.customer_name
      FROM lats_sales s
      ORDER BY s.created_at DESC
      LIMIT 20
    `;

    const recentSaleIds = recentSales.map(sale => sale.id);
    const recentDeliveries = await sql`
      SELECT sale_id, tracking_number, status
      FROM lats_delivery_orders
      WHERE sale_id = ANY(${recentSaleIds})
    `;

    const salesWithDeliveries = new Set();
    recentDeliveries.forEach(delivery => {
      salesWithDeliveries.add(delivery.sale_id);
    });

    const hiddenSales = recentSales.filter(sale => salesWithDeliveries.has(sale.id));
    const shownSales = recentSales.filter(sale => !salesWithDeliveries.has(sale.id));

    console.log(`Hidden sales (${hiddenSales.length}):`);
    hiddenSales.forEach((sale, i) => {
      const deliveries = recentDeliveries.filter(d => d.sale_id === sale.id);
      console.log(`  ${i + 1}. ${sale.sale_number} (${deliveries.length} deliveries)`);
    });

    console.log(`\n✅ Sales shown in modal (${shownSales.length}):`);
    shownSales.slice(0, 10).forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.sale_number}`);
    });

    if (shownSales.length > 10) {
      console.log(`  ... and ${shownSales.length - 10} more`);
    }

    // Final verification
    console.log('\n📊 FINAL VERIFICATION:');
    console.log(`  Modal shows: ${salesData.length} sales`);
    console.log(`  Hidden sales: ${hiddenSales.length} sales`);
    console.log(`  Total recent: ${recentSales.length} sales`);

    const modalSalesSet = new Set(currentModalSales);
    const actualShownSet = new Set(shownSales.map(s => s.sale_number));
    const matches = currentModalSales.every(sale => actualShownSet.has(sale));

    if (matches && allDeliveries.length === 0) {
      console.log('\n🎉 SUCCESS: Modal is correctly showing only sales that have never been sent!');
      console.log('✅ No sales with deliveries are shown');
      console.log('✅ All shown sales are eligible for delivery creation');
    } else {
      console.log('\n⚠️  MISMATCH: Modal content does not match expected filtering');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyNewList();