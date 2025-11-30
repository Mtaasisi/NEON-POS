#!/usr/bin/env node

/**
 * Update Customer Names from CSV File
 * 
 * This script allows you to manually map phone numbers to customer names
 * using a simple CSV file format:
 * 
 * phone,name
 * +255712345678,John Doe
 * 0622123456,Mary Smith
 * ...
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

function normalizePhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('255')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    return '+255' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    return '+255' + cleaned;
  }
  
  return '+' + cleaned;
}

function parseCsvFile(filePath) {
  console.log('📖 Reading CSV file:', filePath);
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Skip header if it exists
    const startIndex = lines[0].toLowerCase().includes('phone') ? 1 : 0;
    
    const mappings = new Map();
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 2) {
        console.warn(`⚠️  Skipping invalid line ${i + 1}: ${line}`);
        continue;
      }
      
      const phone = normalizePhoneNumber(parts[0]);
      const name = parts.slice(1).join(' ').replace(/^["']|["']$/g, ''); // Remove quotes if any
      
      if (phone && name) {
        mappings.set(phone, name);
      }
    }
    
    console.log(`✅ Loaded ${mappings.size} phone-to-name mappings\n`);
    return mappings;
    
  } catch (error) {
    console.error('❌ Error reading CSV file:', error.message);
    throw error;
  }
}

async function findCustomerByPhone(phone) {
  // Check both tables
  const customers = await sql`
    SELECT id, name, phone, 'customers' as table_name
    FROM customers
    WHERE phone = ${phone} OR whatsapp = ${phone}
    
    UNION
    
    SELECT id, name, phone, 'lats_customers' as table_name
    FROM lats_customers
    WHERE phone = ${phone}
  `;
  
  return customers;
}

async function updateCustomerName(customerId, newName, tableName) {
  try {
    if (tableName === 'customers') {
      await sql`
        UPDATE customers
        SET name = ${newName},
            updated_at = NOW()
        WHERE id = ${customerId}
      `;
    } else if (tableName === 'lats_customers') {
      await sql`
        UPDATE lats_customers
        SET name = ${newName},
            updated_at = NOW()
        WHERE id = ${customerId}
      `;
    }
    return true;
  } catch (error) {
    console.error(`❌ Error updating:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Customer Name Update from CSV\n');
  console.log('=' .repeat(60));
  
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.log('\n❌ Error: CSV file path required\n');
    console.log('Usage: node update-customers-from-csv.mjs <csv-file-path>\n');
    console.log('CSV Format:');
    console.log('  phone,name');
    console.log('  +255712345678,John Doe');
    console.log('  0622123456,Mary Smith');
    console.log('');
    process.exit(1);
  }
  
  try {
    const mappings = parseCsvFile(csvFilePath);
    
    if (mappings.size === 0) {
      console.log('⚠️  No mappings found in CSV file');
      return;
    }
    
    console.log('📝 Updating customer names...\n');
    
    let updatedCount = 0;
    let notFoundCount = 0;
    let foundMultipleCount = 0;
    
    for (const [phone, name] of mappings.entries()) {
      const customers = await findCustomerByPhone(phone);
      
      if (customers.length === 0) {
        notFoundCount++;
        console.log(`❌ No customer found with phone: ${phone}`);
        continue;
      }
      
      if (customers.length > 1) {
        foundMultipleCount++;
        console.log(`⚠️  Multiple customers found for ${phone}:`);
        customers.forEach(c => {
          console.log(`   - ${c.name} (${c.table_name})`);
        });
        console.log(`   Updating all...`);
      }
      
      for (const customer of customers) {
        console.log(`✓ Updating: ${phone} -> ${name}`);
        console.log(`  Current name: "${customer.name}" -> New name: "${name}"`);
        console.log(`  Table: ${customer.table_name}`);
        
        const success = await updateCustomerName(customer.id, name, customer.table_name);
        if (success) {
          updatedCount++;
          console.log(`  ✅ Updated successfully!\n`);
        } else {
          console.log(`  ❌ Update failed\n`);
        }
      }
    }
    
    console.log('=' .repeat(60));
    console.log('\n📊 SUMMARY\n');
    console.log(`Total mappings in CSV: ${mappings.size}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Not found in database: ${notFoundCount}`);
    console.log(`Multiple matches: ${foundMultipleCount}`);
    
    if (updatedCount > 0) {
      console.log('\n✅ Customer names updated successfully!');
    }
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

