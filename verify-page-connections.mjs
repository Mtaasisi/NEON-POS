#!/usr/bin/env node

import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';

neonConfig.webSocketConstructor = ws;

console.log('🔍 Verifying Page Connections...\n');

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL });

// Define all pages and their required data sources
const pageTests = [
  {
    category: 'Dashboard & Main Pages',
    pages: [
      { name: 'DashboardPage', tables: ['users', 'devices', 'customers', 'lats_products', 'lats_sales'] },
      { name: 'TechnicianDashboardPage', tables: ['devices', 'users'] },
      { name: 'CustomerCareDashboardPage', tables: ['customers', 'devices'] },
      { name: 'LATSDashboardPage', tables: ['lats_products', 'lats_sales', 'lats_suppliers'] }
    ]
  },
  {
    category: 'POS & Sales',
    pages: [
      { name: 'POSPage', tables: ['lats_products', 'lats_categories', 'customers', 'lats_sales'] },
      { name: 'SalesReportsPage', tables: ['lats_sales', 'lats_sale_items', 'customers'] },
      { name: 'CustomerLoyaltyPage', tables: ['customers', 'customer_points_history'] },
      { name: 'PaymentTrackingPage', tables: ['customer_payments', 'customers'] }
    ]
  },
  {
    category: 'Inventory & Products',
    pages: [
      { name: 'UnifiedInventoryPage', tables: ['lats_products', 'lats_categories', 'lats_suppliers', 'lats_stock_movements'] },
      { name: 'InventoryManagementPage', tables: ['lats_products', 'lats_categories'] },
      { name: 'AddProductPage', tables: ['lats_categories', 'lats_suppliers'] },
      { name: 'EditProductPage', tables: ['lats_products', 'lats_categories', 'lats_suppliers'] },
      { name: 'InventorySparePartsPage', tables: ['lats_spare_parts', 'lats_categories'] }
    ]
  },
  {
    category: 'Purchase Orders & Suppliers',
    pages: [
      { name: 'PurchaseOrdersPage', tables: ['lats_purchase_orders', 'lats_suppliers'] },
      { name: 'POcreate', tables: ['lats_suppliers', 'lats_products'] },
      { name: 'PurchaseOrderDetailPage', tables: ['lats_purchase_orders', 'lats_purchase_order_items'] },
      { name: 'SuppliersManagementPage', tables: ['lats_suppliers'] }
    ]
  },
  {
    category: 'Customer Management',
    pages: [
      { name: 'CustomersPage', tables: ['customers', 'devices', 'appointments'] },
      { name: 'CustomerDataUpdatePage', tables: ['customers'] }
    ]
  },
  {
    category: 'Communication',
    pages: [
      { name: 'WhatsAppChatPage', tables: ['customers', 'whatsapp_instances_comprehensive'] },
      { name: 'SMSControlCenterPage', tables: ['customers', 'sms_logs'] },
      { name: 'BulkSMSPage', tables: ['customers', 'sms_logs'] },
      { name: 'SMSLogsPage', tables: ['sms_logs'] }
    ]
  },
  {
    category: 'Device Management',
    pages: [
      { name: 'DevicesPage', tables: ['devices', 'customers'] },
      { name: 'NewDevicePage', tables: ['customers', 'devices'] }
    ]
  },
  {
    category: 'Employee & Attendance',
    pages: [
      { name: 'EmployeeManagementPage', tables: ['employees', 'attendance_records'] },
      { name: 'MyAttendancePage', tables: ['attendance_records', 'employees'] }
    ]
  },
  {
    category: 'Appointments & Reminders',
    pages: [
      { name: 'UnifiedAppointmentPage', tables: ['appointments', 'customers', 'devices'] },
      { name: 'RemindersPage', tables: ['reminders', 'customers'] }
    ]
  },
  {
    category: 'Administration',
    pages: [
      { name: 'AdminSettingsPage', tables: ['users', 'admin_settings'] },
      { name: 'UserManagementPage', tables: ['users'] },
      { name: 'DatabaseSetupPage', tables: [] },
      { name: 'BackupManagementPage', tables: [] }
    ]
  }
];

async function checkTableExists(tableName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

async function checkTableHasData(tableName) {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName} LIMIT 1`);
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    return false;
  }
}

async function verifyPageConnections() {
  const results = {
    totalPages: 0,
    workingPages: 0,
    partialPages: 0,
    failingPages: 0,
    details: []
  };

  console.log('📊 Testing Page Connections...\n');
  console.log('═'.repeat(60) + '\n');

  for (const category of pageTests) {
    console.log(`\n📁 ${category.category}`);
    console.log('─'.repeat(60));

    for (const page of category.pages) {
      results.totalPages++;
      
      const tableStatus = [];
      let workingTables = 0;
      let missingTables = 0;
      let emptyTables = 0;

      for (const table of page.tables) {
        const exists = await checkTableExists(table);
        if (exists) {
          const hasData = await checkTableHasData(table);
          if (hasData) {
            tableStatus.push({ table, status: 'OK', hasData: true });
            workingTables++;
          } else {
            tableStatus.push({ table, status: 'EMPTY', hasData: false });
            emptyTables++;
          }
        } else {
          tableStatus.push({ table, status: 'MISSING', hasData: false });
          missingTables++;
        }
      }

      let pageStatus = '✅ WORKING';
      if (missingTables > 0) {
        pageStatus = '❌ FAILING';
        results.failingPages++;
      } else if (emptyTables > 0) {
        pageStatus = '⚠️ PARTIAL';
        results.partialPages++;
      } else {
        results.workingPages++;
      }

      console.log(`  ${pageStatus} - ${page.name}`);
      
      // Show table details if there are issues
      if (missingTables > 0 || emptyTables > 0) {
        for (const ts of tableStatus) {
          if (ts.status !== 'OK') {
            console.log(`      └─ ${ts.table}: ${ts.status}`);
          }
        }
      }

      results.details.push({
        category: category.category,
        page: page.name,
        status: pageStatus,
        tables: tableStatus,
        workingTables,
        missingTables,
        emptyTables
      });
    }
  }

  return results;
}

async function generateDetailedReport(results) {
  console.log('\n\n═'.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('═'.repeat(60));
  console.log(`\n📄 Total Pages Tested: ${results.totalPages}`);
  console.log(`✅ Fully Working: ${results.workingPages} (${Math.round(results.workingPages/results.totalPages*100)}%)`);
  console.log(`⚠️  Partially Working: ${results.partialPages} (${Math.round(results.partialPages/results.totalPages*100)}%)`);
  console.log(`❌ Not Working: ${results.failingPages} (${Math.round(results.failingPages/results.totalPages*100)}%)`);

  // Show failing pages
  if (results.failingPages > 0) {
    console.log('\n\n❌ PAGES WITH ISSUES:');
    console.log('─'.repeat(60));
    const failingPages = results.details.filter(d => d.status.includes('FAILING'));
    failingPages.forEach(page => {
      console.log(`\n${page.page} (${page.category})`);
      page.tables.forEach(t => {
        if (t.status === 'MISSING') {
          console.log(`  ❌ ${t.table}: Table does not exist`);
        }
      });
    });
  }

  // Show partial pages
  if (results.partialPages > 0) {
    console.log('\n\n⚠️  PAGES WITH WARNINGS:');
    console.log('─'.repeat(60));
    const partialPages = results.details.filter(d => d.status.includes('PARTIAL'));
    partialPages.forEach(page => {
      console.log(`\n${page.page} (${page.category})`);
      page.tables.forEach(t => {
        if (t.status === 'EMPTY') {
          console.log(`  ⚠️  ${t.table}: Table exists but has no data`);
        }
      });
    });
  }

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPages: results.totalPages,
      workingPages: results.workingPages,
      partialPages: results.partialPages,
      failingPages: results.failingPages,
      successRate: Math.round(results.workingPages/results.totalPages*100)
    },
    details: results.details
  };

  fs.writeFileSync('page-connection-verification.json', JSON.stringify(report, null, 2));
  
  console.log('\n\n💾 Detailed report saved to: page-connection-verification.json');
  
  // Final status
  console.log('\n\n🎯 FINAL STATUS:');
  console.log('═'.repeat(60));
  if (results.failingPages === 0 && results.partialPages === 0) {
    console.log('🎉 ALL PAGES ARE FULLY CONNECTED!');
    console.log('✅ Your application is ready to use.');
  } else if (results.failingPages === 0) {
    console.log('✅ ALL PAGES ARE CONNECTED!');
    console.log('⚠️  Some pages have empty tables (this is normal for new installations).');
  } else {
    console.log('⚠️  Some pages have connection issues.');
    console.log('📋 Check the report above for details.');
  }
  console.log('\n');
}

async function main() {
  try {
    const results = await verifyPageConnections();
    await generateDetailedReport(results);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

