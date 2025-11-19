#!/usr/bin/env node
/**
 * 📥 Customer Import Script
 * Imports customers from CSV into Supabase database
 * 
 * Usage: node import-customers.mjs [path-to-csv]
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import Papa from 'papaparse';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize database client (works with both Supabase and Neon)
// Try Supabase first, then fall back to Neon
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const neonUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';

let supabase;

if (supabaseUrl && supabaseKey) {
  console.log('🔗 Using Supabase connection');
  supabase = createClient(supabaseUrl, supabaseKey);
} else if (neonUrl) {
  console.log('🔗 Using Neon database with Supabase-compatible API');
  // Create a minimal Supabase-compatible client for Neon
  // We'll use direct SQL queries through the Pool
  const { Pool } = await import('@neondatabase/serverless');
  const pool = new Pool({ connectionString: neonUrl });
  
  // Create Supabase-like API wrapper
  supabase = {
    from: (table) => ({
      insert: (data) => {
        const records = Array.isArray(data) ? data : [data];
        
        return {
          select: async () => {
            const columns = Object.keys(records[0]);
            const values = records.map(record => 
              `(${columns.map(col => {
                const val = record[col];
                if (val === null || val === undefined) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                if (val instanceof Date) return `'${val.toISOString()}'`;
                if (typeof val === 'number') return String(val);
                return 'NULL';
              }).join(', ')})`
            ).join(', ');
            
            try {
              const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values} RETURNING id`;
              const result = await pool.query(query);
              return { data: result.rows, error: null };
            } catch (error) {
              console.error('Database error:', error.message);
              return { data: null, error };
            }
          }
        };
      },
      select: () => ({ data: [], error: null })
    })
  };
} else {
  console.error('❌ Missing database credentials in .env file');
  console.error('Please ensure either:');
  console.error('  - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (for Supabase)');
  console.error('  - VITE_DATABASE_URL or DATABASE_URL (for Neon)');
  process.exit(1);
}

// Parse date from various formats
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    // Try parsing M/D/YY format (e.g., "10/1/24")
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let [month, day, year] = parts;
      
      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        const yearNum = parseInt(year);
        year = yearNum > 50 ? `19${year}` : `20${year}`;
      }
      
      // Pad month and day
      month = month.padStart(2, '0');
      day = day.padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    }
    
    // Try parsing as ISO date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // Ignore parse errors
  }
  
  return null;
}

// Clean phone number
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove any non-digit characters except +
  let cleaned = phone.toString().replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

// Parse currency (remove commas and quotes)
function parseCurrency(value) {
  if (!value || value.toString().trim() === '') return 0;
  
  const cleaned = value.toString().replace(/[",]/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? 0 : num;
}

// Map CSV tier to loyalty level
function mapTierToLoyalty(tier) {
  if (!tier) return 'bronze';
  
  const tierLower = tier.toLowerCase();
  
  if (tierLower.includes('vip diamond')) return 'diamond';
  if (tierLower.includes('vip gold') || tierLower.includes('gold')) return 'gold';
  if (tierLower.includes('silver')) return 'silver';
  if (tierLower.includes('bronze')) return 'bronze';
  
  return 'bronze';
}

// Map status to is_active
function isActiveStatus(status) {
  if (!status) return true;
  
  const statusLower = status.toLowerCase();
  return statusLower === 'active' || statusLower === 'recent';
}

// Map status to color tag
function mapStatusToColorTag(status, tier) {
  if (!status) return 'new';
  
  const statusLower = status.toLowerCase();
  const tierLower = (tier || '').toLowerCase();
  
  if (tierLower.includes('vip')) return 'vip';
  if (statusLower === 'active' || statusLower === 'recent') return 'purchased';
  if (statusLower === 'inactive') return 'new';
  if (statusLower === 'at risk') return 'complainer';
  
  return 'new';
}

// Transform CSV row to database customer
function transformCustomer(row) {
  // Skip if no customer name or phone
  if (!row.Customer_Name || !row.Phone_Number) {
    return null;
  }
  
  // Skip if phone is empty or invalid
  const cleanedPhone = cleanPhoneNumber(row.Phone_Number);
  if (!cleanedPhone || cleanedPhone === '+' || cleanedPhone.length < 10) {
    return null;
  }
  
  // Calculate total spent from Tigopesa if available
  const totalReceived = parseCurrency(row.Tigopesa_Total_Received_TSh || 0);
  const totalSent = parseCurrency(row.Tigopesa_Total_Sent_TSh || 0);
  
  // Use received amount as total spent (money received by business)
  // Convert from TSh to dollars (assuming 1000 TSh = $1 for demo purposes)
  const totalSpent = totalReceived > 0 ? totalReceived / 1000 : 0;
  
  // Parse call data
  const incomingCalls = parseInt(row.Incoming_Calls) || 0;
  const outgoingCalls = parseInt(row.Outgoing_Calls) || 0;
  const missedCalls = parseInt(row.Missed_Calls) || 0;
  const totalCalls = incomingCalls + outgoingCalls + missedCalls;
  
  const callDuration = parseFloat(row.Total_Talk_Time_Minutes) || 0;
  const avgCallDuration = totalCalls > 0 ? callDuration / totalCalls : 0;
  
  const customer = {
    name: row.Customer_Name.replace(/^"|"$/g, ''), // Remove surrounding quotes
    phone: cleanedPhone,
    whatsapp: cleanedPhone, // Use same phone for WhatsApp
    joined_date: parseDate(row.Customer_Creation_Date),
    last_visit: parseDate(row.Last_Visit),
    total_purchases: parseInt(row.Total_Checkins) || 0,
    points: parseInt(row.Loyalty_Points) || 0,
    loyalty_level: mapTierToLoyalty(row.Customer_Tier),
    is_active: isActiveStatus(row.Status),
    total_calls: totalCalls,
    total_call_duration_minutes: callDuration,
    incoming_calls: incomingCalls,
    outgoing_calls: outgoingCalls,
    missed_calls: missedCalls,
    avg_call_duration_minutes: avgCallDuration,
    first_call_date: parseDate(row.First_Activity_Date),
    last_activity_date: parseDate(row.Last_Visit) || parseDate(row.First_Activity_Date),
    customer_tag: row.Status?.toLowerCase(),
    color_tag: mapStatusToColorTag(row.Status, row.Customer_Tier),
    total_spent: totalSpent,
    country: 'Tanzania',
    notes: row.Alternate_Names ? `Alternate names: ${row.Alternate_Names}` : null,
  };
  
  return customer;
}

// Insert customers in batches
async function insertCustomers(customers) {
  const BATCH_SIZE = 100;
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  console.log(`\n📦 Inserting ${customers.length} customers in batches of ${BATCH_SIZE}...`);
  
  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(customers.length / BATCH_SIZE);
    
    process.stdout.write(`\r🔄 Processing batch ${batchNum}/${totalBatches}...`);
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert(batch)
        .select('id');
      
      if (error) {
        console.error(`\n❌ Batch ${batchNum} error:`, error.message);
        errorCount += batch.length;
        errors.push({ batch: batchNum, error: error.message });
      } else {
        successCount += data?.length || batch.length;
      }
    } catch (err) {
      console.error(`\n❌ Batch ${batchNum} exception:`, err.message);
      errorCount += batch.length;
      errors.push({ batch: batchNum, error: err.message });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n\n✅ Import completed!`);
  console.log(`   Success: ${successCount} customers`);
  console.log(`   Errors: ${errorCount} customers`);
  
  if (errors.length > 0 && errors.length < 10) {
    console.log(`\n⚠️  Errors occurred in ${errors.length} batches:`);
    errors.forEach(e => {
      console.log(`   Batch ${e.batch}: ${e.error}`);
    });
  } else if (errors.length >= 10) {
    console.log(`\n⚠️  Many errors occurred (${errors.length} batches)`);
    console.log(`   First error: ${errors[0].error}`);
  }
  
  return { successCount, errorCount };
}

// Main execution
async function main() {
  const csvPath = process.argv[2] || '/Users/mtaasisi/Desktop/ANDROID SHARE/For my database/Merged_Customer_Database copy.csv';
  
  console.log('📥 Customer Import Utility');
  console.log('='.repeat(50));
  console.log(`📄 CSV File: ${csvPath}`);
  
  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    console.error('\nUsage: node import-customers.mjs [path-to-csv]');
    process.exit(1);
  }
  
  console.log('\n🔍 Reading CSV file...');
  
  // Read and parse CSV
  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });
  
  const rows = parsed.data;
  console.log(`✅ Found ${rows.length} rows`);
  
  if (parsed.errors.length > 0) {
    console.warn(`⚠️  CSV parsing warnings: ${parsed.errors.length}`);
  }
  
  console.log('\n🔄 Transforming data...');
  const customers = rows
    .map(transformCustomer)
    .filter(c => c !== null);
  
  console.log(`✅ Transformed ${customers.length} valid customers`);
  console.log(`⚠️  Skipped ${rows.length - customers.length} invalid rows`);
  
  if (customers.length === 0) {
    console.error('❌ No valid customers to import!');
    process.exit(1);
  }
  
  // Show sample
  console.log('\n📋 Sample customer (first record):');
  console.log(JSON.stringify(customers[0], null, 2));
  
  // Confirm import
  console.log('\n⚡ Ready to import customers to database');
  console.log(`   Database: ${supabaseUrl}`);
  console.log(`   Records: ${customers.length}`);
  console.log('\n⏳ Starting import in 3 seconds... (Press Ctrl+C to cancel)');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Import
  const result = await insertCustomers(customers);
  
  console.log('\n✨ Import complete!');
  console.log(`   Total processed: ${customers.length}`);
  console.log(`   Successfully imported: ${result.successCount}`);
  console.log(`   Failed: ${result.errorCount}`);
  
  if (result.successCount > 0) {
    console.log('\n🎉 You can now view your customers in the app!');
    console.log('   Navigate to the Clients page to see them.');
  }
}

// Run
main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

