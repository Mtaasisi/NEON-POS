#!/usr/bin/env node

/**
 * 🧪 ROUTE VERIFICATION SCRIPT
 * Verifies all routes are accessible
 */

import http from 'http';
import { writeFileSync } from 'fs';

const BASE_URL = 'localhost';
const PORT = 3000;

const ROUTES = [
  '/dashboard', '/devices', '/customers', '/pos',
  '/appointments', '/services', '/calendar',
  '/lats/unified-inventory', '/stock-value', '/inventory-manager',
  '/lats/serial-manager', '/lats/spare-parts', '/add-product',
  '/lats/purchase-orders', '/supplier-management', '/lats/storage-rooms',
  '/employees', '/attendance',
  '/diagnostics', '/business',
  '/finance', '/finance/payments', '/analytics',
  '/sales-reports', '/loyalty', '/payments',
  '/lats/whatsapp-chat', '/lats/whatsapp-connection-manager',
  '/instagram/dm',
  '/admin-management', '/settings', '/ad-generator'
];

async function checkRoute(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      resolve({
        path,
        status: res.statusCode,
        success: res.statusCode === 200
      });
    });

    req.on('error', (error) => {
      resolve({
        path,
        status: 0,
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        path,
        status: 0,
        success: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

async function main() {
  console.log('🧪 Verifying all application routes...\n');
  
  const results = [];
  
  for (const route of ROUTES) {
    process.stdout.write(`Testing ${route}...`);
    const result = await checkRoute(route);
    results.push(result);
    
    if (result.success) {
      console.log(' ✅');
    } else {
      console.log(` ❌ (${result.status || result.error})`);
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📊 Summary:`);
  console.log(`Total routes: ${ROUTES.length}`);
  console.log(`✅ Accessible: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success rate: ${((successful / ROUTES.length) * 100).toFixed(1)}%\n`);

  writeFileSync('./route-verification.json', JSON.stringify(results, null, 2));
  console.log('📄 Results saved to route-verification.json\n');
}

main();

