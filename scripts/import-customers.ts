#!/usr/bin/env tsx
/**
 * 📥 Customer Import Script
 * Imports customers from CSV into Supabase database
 * 
 * Usage: npm run import-customers
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Initialize Supabase client from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface CSVRow {
  Rank: string;
  Customer_Name: string;
  Phone_Number: string;
  Customer_Creation_Date: string;
  Last_Visit: string;
  Total_Checkins: string;
  Days_Since_Last_Visit: string;
  Customer_Lifetime_Days: string;
  Total_Talk_Time_Minutes: string;
  Incoming_Calls: string;
  Outgoing_Calls: string;
  Missed_Calls: string;
  Avg_Checkins_Per_Month: string;
  Loyalty_Points: string;
  Customer_Tier: string;
  Tier_Rank: string;
  Status: string;
  CNP_Name: string;
  CNP_Saved_Name: string;
  CNP_Extracted_Names: string;
  CNP_Total_Messages: string;
  CNP_Received: string;
  CNP_Sent: string;
  Personal_Sender_Name: string;
  Personal_Message_Count: string;
  Personal_First_Message: string;
  Personal_Last_Message: string;
  Personal_Incoming_Count: string;
  Personal_Outgoing_Count: string;
  Tigopesa_Name: string;
  Tigopesa_Total_Sent_TSh: string;
  Tigopesa_Total_Received_TSh: string;
  Tigopesa_Net_Amount_TSh: string;
  Tigopesa_Sent_Transactions: string;
  Tigopesa_Received_Transactions: string;
  Tigopesa_Total_Transactions: string;
  Alternate_Names: string;
  Data_Sources: string;
  Data_Sources_Count: string;
  Enrichment_Level: string;
  First_Activity_Date: string;
}

interface CustomerInsert {
  name: string;
  phone: string;
  email?: string;
  joined_date?: string;
  last_visit?: string;
  total_purchases?: number;
  points?: number;
  loyalty_level?: string;
  is_active?: boolean;
  total_calls?: number;
  total_call_duration_minutes?: number;
  incoming_calls?: number;
  outgoing_calls?: number;
  missed_calls?: number;
  avg_call_duration_minutes?: number;
  first_call_date?: string;
  last_activity_date?: string;
  customer_tag?: string;
  notes?: string;
  country?: string;
  total_spent?: number;
  whatsapp?: string;
  color_tag?: string;
}

// Parse CSV line respecting quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Parse date from various formats
function parseDate(dateStr: string): string | undefined {
  if (!dateStr || dateStr.trim() === '') return undefined;
  
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
    console.warn(`⚠️  Could not parse date: ${dateStr}`);
  }
  
  return undefined;
}

// Clean phone number
function cleanPhoneNumber(phone: string): string {
  // Remove any non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

// Parse currency (remove commas and quotes)
function parseCurrency(value: string): number {
  if (!value || value.trim() === '') return 0;
  
  const cleaned = value.replace(/[",]/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? 0 : num;
}

// Map CSV tier to loyalty level
function mapTierToLoyalty(tier: string): string {
  if (!tier) return 'bronze';
  
  const tierLower = tier.toLowerCase();
  
  if (tierLower.includes('vip diamond')) return 'diamond';
  if (tierLower.includes('vip gold') || tierLower.includes('gold')) return 'gold';
  if (tierLower.includes('silver')) return 'silver';
  if (tierLower.includes('bronze')) return 'bronze';
  
  return 'bronze';
}

// Map status to is_active
function isActiveStatus(status: string): boolean {
  if (!status) return true;
  
  const statusLower = status.toLowerCase();
  return statusLower === 'active' || statusLower === 'recent';
}

// Map status to color tag
function mapStatusToColorTag(status: string, tier: string): string {
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
function transformCustomer(row: CSVRow): CustomerInsert | null {
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
  const totalReceived = parseCurrency(row.Tigopesa_Total_Received_TSh);
  const totalSent = parseCurrency(row.Tigopesa_Total_Sent_TSh);
  const netAmount = totalReceived - totalSent;
  
  // Use received amount as total spent (money received by business)
  const totalSpent = totalReceived > 0 ? totalReceived / 1000 : 0; // Convert TSh to thousands
  
  // Parse call data
  const totalCalls = (parseInt(row.Incoming_Calls) || 0) + 
                     (parseInt(row.Outgoing_Calls) || 0) + 
                     (parseInt(row.Missed_Calls) || 0);
  
  const callDuration = parseFloat(row.Total_Talk_Time_Minutes) || 0;
  const avgCallDuration = totalCalls > 0 ? callDuration / totalCalls : 0;
  
  const customer: CustomerInsert = {
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
    incoming_calls: parseInt(row.Incoming_Calls) || 0,
    outgoing_calls: parseInt(row.Outgoing_Calls) || 0,
    missed_calls: parseInt(row.Missed_Calls) || 0,
    avg_call_duration_minutes: avgCallDuration,
    first_call_date: parseDate(row.First_Activity_Date),
    last_activity_date: parseDate(row.Last_Visit) || parseDate(row.First_Activity_Date),
    customer_tag: row.Status?.toLowerCase(),
    color_tag: mapStatusToColorTag(row.Status, row.Customer_Tier),
    total_spent: totalSpent,
    country: 'Tanzania',
    notes: row.Alternate_Names ? `Alternate names: ${row.Alternate_Names}` : undefined,
  };
  
  return customer;
}

// Read and parse CSV file
async function readCSV(filePath: string): Promise<CSVRow[]> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  const rows: CSVRow[] = [];
  let headers: string[] = [];
  let isFirstLine = true;
  
  for await (const line of rl) {
    if (isFirstLine) {
      headers = parseCSVLine(line);
      isFirstLine = false;
      continue;
    }
    
    const values = parseCSVLine(line);
    
    // Create row object
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row as CSVRow);
  }
  
  return rows;
}

// Insert customers in batches
async function insertCustomers(customers: CustomerInsert[]) {
  const BATCH_SIZE = 100;
  let successCount = 0;
  let errorCount = 0;
  const errors: any[] = [];
  
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
        successCount += batch.length;
      }
    } catch (err: any) {
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
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Errors occurred in ${errors.length} batches:`);
    errors.forEach(e => {
      console.log(`   Batch ${e.batch}: ${e.error}`);
    });
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
    process.exit(1);
  }
  
  console.log('\n🔍 Reading CSV file...');
  const rows = await readCSV(csvPath);
  console.log(`✅ Found ${rows.length} rows`);
  
  console.log('\n🔄 Transforming data...');
  const customers = rows
    .map(transformCustomer)
    .filter((c): c is CustomerInsert => c !== null);
  
  console.log(`✅ Transformed ${customers.length} valid customers`);
  console.log(`⚠️  Skipped ${rows.length - customers.length} invalid rows`);
  
  // Show sample
  console.log('\n📋 Sample customer:');
  console.log(JSON.stringify(customers[0], null, 2));
  
  // Confirm import
  console.log('\n⚡ Ready to import customers to database');
  console.log(`   Database: ${supabaseUrl}`);
  console.log(`   Records: ${customers.length}`);
  
  // Import
  const result = await insertCustomers(customers);
  
  console.log('\n✨ Import complete!');
  console.log(`   Total processed: ${customers.length}`);
  console.log(`   Successfully imported: ${result.successCount}`);
  console.log(`   Failed: ${result.errorCount}`);
}

// Run
main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

