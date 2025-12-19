import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function checkSalesStatus() {
  try {
    const sql = neon(DATABASE_URL);
    console.log('🔍 Checking Status of Sales Shown in Modal\n');

    // List of sales from the user's screenshot
    const salesToCheck = [
      'SALE-19161834-1K5B',
      'SALE-18557507-MB7V',
      'SALE-16298018-6YM1',
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

    console.log(`Checking ${salesToCheck.length} sales from the modal...\n`);

    // Get sale IDs for these sale numbers
    const salesData = await sql`
      SELECT id, sale_number, customer_name, total_amount, created_at
      FROM lats_sales
      WHERE sale_number = ANY(${salesToCheck})
      ORDER BY created_at DESC
    `;

    console.log('📦 Found Sales:');
    salesData.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name} - TZS ${sale.total_amount}`);
    });

    // Get ALL deliveries for these sales (not just active ones)
    const saleIds = salesData.map(sale => sale.id);
    const allDeliveries = await sql`
      SELECT sale_id, tracking_number, status, created_at
      FROM lats_delivery_orders
      WHERE sale_id = ANY(${saleIds})
      ORDER BY created_at DESC
    `;

    console.log('\n🚚 ALL Deliveries for These Sales:');
    if (allDeliveries.length === 0) {
      console.log('  ✅ No deliveries found for any of these sales');
    } else {
      allDeliveries.forEach((delivery, i) => {
        const sale = salesData.find(s => s.id === delivery.sale_id);
        console.log(`  ${i + 1}. ${sale?.sale_number} → ${delivery.tracking_number} (${delivery.status})`);
      });
    }

    // Check which sales should be HIDDEN (have active deliveries)
    const activeDeliveries = await sql`
      SELECT sale_id, tracking_number, status
      FROM lats_delivery_orders
      WHERE sale_id = ANY(${saleIds})
      AND status IN ('pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery')
    `;

    console.log('\n🚫 Sales with ACTIVE Deliveries (Should be Hidden):');
    if (activeDeliveries.length === 0) {
      console.log('  ✅ No active deliveries found - all sales should be visible');
    } else {
      activeDeliveries.forEach((delivery, i) => {
        const sale = salesData.find(s => s.id === delivery.sale_id);
        console.log(`  ❌ ${sale?.sale_number} → ${delivery.tracking_number} (${delivery.status})`);
      });
    }

    // Check which sales should be VISIBLE (no active deliveries)
    const salesWithActiveDeliveries = new Set();
    activeDeliveries.forEach(delivery => {
      salesWithActiveDeliveries.add(delivery.sale_id);
    });

    const visibleSales = salesData.filter(sale => !salesWithActiveDeliveries.has(sale.id));
    const hiddenSales = salesData.filter(sale => salesWithActiveDeliveries.has(sale.id));

    console.log('\n✅ Sales that SHOULD be VISIBLE in Modal:');
    visibleSales.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name}`);
    });

    console.log('\n🚫 Sales that SHOULD be HIDDEN from Modal:');
    hiddenSales.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.sale_number} - ${sale.customer_name}`);
    });

    // Summary
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log(`  Total sales checked: ${salesData.length}`);
    console.log(`  Sales with any deliveries: ${allDeliveries.length > 0 ? salesData.filter(sale =>
      allDeliveries.some(d => d.sale_id === sale.id)
    ).length : 0}`);
    console.log(`  Sales with ACTIVE deliveries: ${hiddenSales.length}`);
    console.log(`  Sales that should be VISIBLE: ${visibleSales.length}`);
    console.log(`  Sales that should be HIDDEN: ${hiddenSales.length}`);

    if (hiddenSales.length === 0) {
      console.log('\n🎉 SUCCESS: All sales in the modal are correctly shown (no active deliveries)');
    } else {
      console.log('\n⚠️  WARNING: Some sales have active deliveries and should be hidden!');
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkSalesStatus();