#!/usr/bin/env node

/**
 * Check and Add Sample Repair Data
 * This script checks your devices (repairs) table and optionally adds sample data
 */

import * as dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Missing database credentials in .env file');
  console.log('Required: DATABASE_URL or VITE_DATABASE_URL');
  console.log('Copy env.template.RECOMMENDED to .env and fill in your database URL');
  process.exit(1);
}

async function checkRepairsData() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('\n🔍 Checking repair data in devices table...\n');
    
    // Fetch all devices (repairs)
    const result = await client.query(`
      SELECT id, device_name, status, created_at, customer_id 
      FROM devices 
      ORDER BY created_at DESC
    `);
    
    const devices = result.rows;
    
    console.log(`📊 Total Repairs Found: ${devices?.length || 0}\n`);
    
    if (devices && devices.length > 0) {
      console.log('📱 Current Repairs:\n');
      devices.forEach((device, index) => {
        console.log(`${index + 1}. ${device.device_name || 'Unknown Device'}`);
        console.log(`   Status: ${device.status || 'N/A'}`);
        console.log(`   Created: ${new Date(device.created_at).toLocaleDateString()}`);
        console.log(`   ID: ${device.id}`);
        console.log('');
      });
      
      // Show status breakdown
      const statusBreakdown = {};
      devices.forEach(d => {
        const status = d.status || 'unknown';
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });
      
      console.log('📊 Status Breakdown:');
      Object.entries(statusBreakdown).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
      console.log('');
    } else {
      console.log('⚠️  No repairs found in database!\n');
    }
    
    // Ask if user wants to add sample data
    console.log('💡 Would you like to add sample repair data for testing?');
    console.log('   Run: node check-repairs-data.js --add-samples\n');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    await client.end();
  }
}

async function addSampleData() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('\n✨ Adding sample repair data...\n');
    
    // First, check if we have a customer to link to
    const customerResult = await client.query('SELECT id FROM customers LIMIT 1');
    
    let customerId = customerResult.rows[0]?.id;
    
    if (!customerId) {
      console.log('⚠️  No customers found. Creating a sample customer first...');
      
      const newCustomerResult = await client.query(`
        INSERT INTO customers (name, phone, email, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name
      `, ['John Doe', '+255123456789', 'john.doe@example.com', true]);
      
      customerId = newCustomerResult.rows[0].id;
      console.log('✅ Sample customer created:', newCustomerResult.rows[0].name);
    }
    
    // Sample repair data
    const sampleRepairs = [
      ['iPhone 13 Pro', 'Apple', 'iPhone 13 Pro', 'Screen cracked, not responding to touch', 'in-repair', 150000, 50000, null],
      ['Samsung Galaxy S21', 'Samsung', 'Galaxy S21', 'Battery draining fast, needs replacement', 'awaiting-parts', 80000, 30000, null],
      ['MacBook Pro 2020', 'Apple', 'MacBook Pro 16"', 'Keyboard keys not working', 'done', 200000, 100000, 180000],
      ['iPad Air', 'Apple', 'iPad Air 4', "Won't charge, charging port issue", 'diagnosis-started', 50000, null, null],
      ['Google Pixel 6', 'Google', 'Pixel 6', 'Camera not focusing properly', 'pending', 70000, null, null],
      ['Dell XPS 15', 'Dell', 'XPS 15 9500', 'Overheating and shutting down', 'repair-complete', 120000, 60000, 110000]
    ];
    
    console.log('📝 Inserting sample repairs...\n');
    
    let insertedCount = 0;
    const insertedDevices = [];
    
    for (const repair of sampleRepairs) {
      const [device_name, brand, model, problem_description, status, estimated_cost, deposit_amount, actual_cost] = repair;
      
      const result = await client.query(`
        INSERT INTO devices (
          customer_id, device_name, brand, model, problem_description, 
          status, estimated_cost, deposit_amount, actual_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, device_name, status, problem_description
      `, [customerId, device_name, brand, model, problem_description, status, estimated_cost, deposit_amount, actual_cost]);
      
      insertedDevices.push(result.rows[0]);
      insertedCount++;
    }
    
    console.log(`✅ Successfully added ${insertedCount} sample repairs!\n`);
    
    // Show what was added
    console.log('📱 Sample Repairs Added:\n');
    insertedDevices.forEach((device, index) => {
      console.log(`${index + 1}. ${device.device_name}`);
      console.log(`   Status: ${device.status}`);
      console.log(`   Problem: ${device.problem_description}`);
      console.log('');
    });
    
    console.log('✨ Your repair dashboard should now show multiple repairs!');
    console.log('🔄 Refresh your browser to see the changes.\n');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    await client.end();
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--add-samples')) {
  addSampleData();
} else {
  checkRepairsData();
}

