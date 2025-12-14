#!/usr/bin/env node

/**
 * Update Customer Names from Transaction Data
 * 
 * This script extracts customer names from transaction records (lats_sales, payment_transactions)
 * and uses them to update customer records that currently have "unknown" or generic names.
 * 
 * Strategy:
 * 1. Find all transactions with valid customer names (not "Unknown", "Guest", etc.)
 * 2. Match these to customers with unknown names by customer_id or phone number
 * 3. Update the customer records with the real names from transactions
 */

import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// List of generic/unknown name patterns to ignore
const UNKNOWN_NAME_PATTERNS = [
  /^unknown$/i,
  /^guest$/i,
  /^customer$/i,
  /^walk[- ]?in$/i,
  /^cash[- ]?customer$/i,
  /^anonymous$/i,
  /^n\/?a$/i,
  /^none$/i,
  /^-+$/,
  /^\.+$/,
  /^test$/i,
  /^\d+$/,  // Just numbers
  /^[a-z0-9]{8,}$/i,  // Looks like a UUID or hash
];

/**
 * Check if a name is "unknown" or generic
 */
function isUnknownName(name) {
  if (!name || typeof name !== 'string') return true;
  
  const trimmed = name.trim();
  if (trimmed.length === 0) return true;
  
  return UNKNOWN_NAME_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if a name is valid (not unknown and meets quality criteria)
 */
function isValidName(name) {
  if (isUnknownName(name)) return false;
  
  const trimmed = name.trim();
  
  // Must be at least 2 characters
  if (trimmed.length < 2) return false;
  
  // Should contain at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  
  // Should not be just special characters
  if (/^[^a-zA-Z0-9]+$/.test(trimmed)) return false;
  
  return true;
}

/**
 * Normalize phone number for comparison
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Tanzania numbers (255)
  if (cleaned.startsWith('255')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+255' + cleaned.slice(1);
  } else if (cleaned.length === 9) {
    return '+255' + cleaned;
  }
  
  return '+' + cleaned;
}

/**
 * Extract customer names from lats_sales table
 */
async function extractNamesFromSales() {
  console.log('\n📊 Extracting names from lats_sales...');
  
  const result = await sql`
    SELECT DISTINCT 
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      COUNT(*) as transaction_count,
      MAX(created_at) as last_transaction
    FROM lats_sales
    WHERE customer_name IS NOT NULL 
      AND customer_name != ''
      AND customer_name != 'Unknown'
      AND customer_name != 'Guest'
      AND customer_name != 'Cash Customer'
      AND (customer_id IS NOT NULL OR customer_phone IS NOT NULL)
    GROUP BY customer_id, customer_name, customer_phone, customer_email
    ORDER BY transaction_count DESC
  `;
  
  // Filter for valid names
  const validNames = result.filter(row => isValidName(row.customer_name));
  
  console.log(`   Found ${result.length} distinct names (${validNames.length} valid)`);
  return validNames;
}

/**
 * Extract customer names from payment_transactions table
 */
async function extractNamesFromPayments() {
  console.log('\n💳 Extracting names from payment_transactions...');
  
  const result = await sql`
    SELECT DISTINCT 
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      COUNT(*) as transaction_count,
      MAX(created_at) as last_transaction
    FROM payment_transactions
    WHERE customer_name IS NOT NULL 
      AND customer_name != ''
      AND customer_name != 'Unknown'
      AND customer_name != 'Guest'
      AND (customer_id IS NOT NULL OR customer_phone IS NOT NULL)
    GROUP BY customer_id, customer_name, customer_phone, customer_email
    ORDER BY transaction_count DESC
  `;
  
  // Filter for valid names
  const validNames = result.filter(row => isValidName(row.customer_name));
  
  console.log(`   Found ${result.length} distinct names (${validNames.length} valid)`);
  return validNames;
}

/**
 * Find customers with unknown names
 */
async function findUnknownCustomers() {
  console.log('\n🔍 Finding customers with unknown names...');
  
  // Check both customers and lats_customers tables
  const [customers, latsCustomers] = await Promise.all([
    sql`SELECT id, name, phone, whatsapp, email FROM customers ORDER BY name`,
    sql`SELECT id, name, phone, email FROM lats_customers ORDER BY name`
  ]);
  
  // Filter for unknown names
  const unknownCustomers = customers.filter(c => isUnknownName(c.name));
  const unknownLatsCustomers = latsCustomers.filter(c => isUnknownName(c.name));
  
  console.log(`   Customers table: ${unknownCustomers.length} with unknown names`);
  console.log(`   Lats_customers table: ${unknownLatsCustomers.length} with unknown names`);
  
  return {
    customers: unknownCustomers,
    latsCustomers: unknownLatsCustomers
  };
}

/**
 * Match transaction names to customers
 */
function matchTransactionNamesToCustomers(transactionData, unknownCustomers, tableName) {
  console.log(`\n🔗 Matching transaction names to ${tableName}...`);
  
  const matches = [];
  let matchedByCustomerId = 0;
  let matchedByPhone = 0;
  
  for (const txn of transactionData) {
    for (const customer of unknownCustomers) {
      let matchType = null;
      
      // Match by customer_id (most reliable)
      if (txn.customer_id && customer.id === txn.customer_id) {
        matchType = 'customer_id';
        matchedByCustomerId++;
      }
      // Match by phone number
      else if (txn.customer_phone && customer.phone) {
        const txnPhone = normalizePhoneNumber(txn.customer_phone);
        const custPhone = normalizePhoneNumber(customer.phone);
        if (txnPhone && custPhone && txnPhone === custPhone) {
          matchType = 'phone';
          matchedByPhone++;
        }
      }
      // Match by WhatsApp number (for customers table)
      else if (txn.customer_phone && customer.whatsapp) {
        const txnPhone = normalizePhoneNumber(txn.customer_phone);
        const whatsappPhone = normalizePhoneNumber(customer.whatsapp);
        if (txnPhone && whatsappPhone && txnPhone === whatsappPhone) {
          matchType = 'whatsapp';
          matchedByPhone++;
        }
      }
      
      if (matchType) {
        matches.push({
          customerId: customer.id,
          currentName: customer.name,
          newName: txn.customer_name.trim(),
          matchType,
          transactionCount: txn.transaction_count,
          lastTransaction: txn.last_transaction,
          phone: customer.phone || customer.whatsapp,
          tableName
        });
      }
    }
  }
  
  console.log(`   Matched by customer_id: ${matchedByCustomerId}`);
  console.log(`   Matched by phone: ${matchedByPhone}`);
  console.log(`   Total matches: ${matches.length}`);
  
  return matches;
}

/**
 * Consolidate duplicate matches (same customer matched multiple times)
 */
function consolidateMatches(matches) {
  console.log('\n📋 Consolidating duplicate matches...');
  
  const customerMap = new Map();
  
  for (const match of matches) {
    const key = `${match.tableName}:${match.customerId}`;
    
    if (!customerMap.has(key)) {
      customerMap.set(key, match);
    } else {
      // Keep the match with more transactions or more recent
      const existing = customerMap.get(key);
      if (match.transactionCount > existing.transactionCount) {
        customerMap.set(key, match);
      } else if (match.transactionCount === existing.transactionCount &&
                 match.lastTransaction > existing.lastTransaction) {
        customerMap.set(key, match);
      }
    }
  }
  
  const consolidated = Array.from(customerMap.values());
  console.log(`   Reduced from ${matches.length} to ${consolidated.length} unique updates`);
  
  return consolidated;
}

/**
 * Update customer name in database
 */
async function updateCustomerName(customerId, newName, tableName) {
  // Use different queries for different tables
  let result;
  if (tableName === 'customers') {
    result = await sql`
      UPDATE customers
      SET name = ${newName}, updated_at = NOW()
      WHERE id = ${customerId}
      RETURNING id, name
    `;
  } else {
    result = await sql`
      UPDATE lats_customers
      SET name = ${newName}, updated_at = NOW()
      WHERE id = ${customerId}
      RETURNING id, name
    `;
  }
  
  return result[0];
}

/**
 * Preview the updates
 */
function previewUpdates(matches) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 PREVIEW OF UPDATES');
  console.log('='.repeat(80));
  
  // Group by table
  const byTable = {
    customers: matches.filter(m => m.tableName === 'customers'),
    lats_customers: matches.filter(m => m.tableName === 'lats_customers')
  };
  
  for (const [table, tableMatches] of Object.entries(byTable)) {
    if (tableMatches.length === 0) continue;
    
    console.log(`\n📊 ${table.toUpperCase()} (${tableMatches.length} updates)`);
    console.log('-'.repeat(80));
    
    // Show first 10
    const preview = tableMatches.slice(0, 10);
    for (const match of preview) {
      console.log(`\nPhone: ${match.phone || 'N/A'}`);
      console.log(`  Current: "${match.currentName}"`);
      console.log(`  New:     "${match.newName}"`);
      console.log(`  Matched by: ${match.matchType}`);
      console.log(`  Transactions: ${match.transactionCount} (last: ${match.lastTransaction?.toISOString().split('T')[0]})`);
    }
    
    if (tableMatches.length > 10) {
      console.log(`\n... and ${tableMatches.length - 10} more updates`);
    }
  }
  
  return byTable;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Customer Name Update from Transactions');
  console.log('='.repeat(80));
  
  try {
    // Step 1: Extract names from transactions
    const [salesNames, paymentNames] = await Promise.all([
      extractNamesFromSales(),
      extractNamesFromPayments()
    ]);
    
    // Combine and deduplicate
    const allTransactionData = [...salesNames];
    for (const payment of paymentNames) {
      const existing = allTransactionData.find(s => 
        s.customer_id === payment.customer_id &&
        s.customer_name === payment.customer_name
      );
      if (!existing) {
        allTransactionData.push(payment);
      }
    }
    
    console.log(`\n✅ Total unique transaction names: ${allTransactionData.length}`);
    
    // Step 2: Find customers with unknown names
    const unknownCustomers = await findUnknownCustomers();
    const totalUnknown = unknownCustomers.customers.length + unknownCustomers.latsCustomers.length;
    
    if (totalUnknown === 0) {
      console.log('\n✅ No customers with unknown names found!');
      return;
    }
    
    // Step 3: Match transaction names to customers
    const customersMatches = matchTransactionNamesToCustomers(
      allTransactionData,
      unknownCustomers.customers,
      'customers'
    );
    
    const latsCustomersMatches = matchTransactionNamesToCustomers(
      allTransactionData,
      unknownCustomers.latsCustomers,
      'lats_customers'
    );
    
    const allMatches = [...customersMatches, ...latsCustomersMatches];
    
    if (allMatches.length === 0) {
      console.log('\n❌ No matches found between transactions and unknown customers');
      console.log('   This could mean:');
      console.log('   - Customers with unknown names have no transaction history');
      console.log('   - Phone numbers don\'t match between records');
      console.log('   - Customer IDs are not linked properly');
      return;
    }
    
    // Step 4: Consolidate matches
    const consolidatedMatches = consolidateMatches(allMatches);
    
    // Step 5: Preview updates
    const byTable = previewUpdates(consolidatedMatches);
    
    // Step 6: Ask for confirmation
    console.log('\n' + '='.repeat(80));
    console.log(`\n⚠️  Ready to update ${consolidatedMatches.length} customer records`);
    console.log(`   - customers table: ${byTable.customers.length} updates`);
    console.log(`   - lats_customers table: ${byTable.lats_customers.length} updates`);
    
    // Check if running with --dry-run flag
    const isDryRun = process.argv.includes('--dry-run');
    
    if (isDryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
      return;
    }
    
    // Proceed with updates
    console.log('\n🔄 Proceeding with updates...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const match of consolidatedMatches) {
      try {
        await updateCustomerName(match.customerId, match.newName, match.tableName);
        successCount++;
        
        if (successCount % 10 === 0) {
          process.stdout.write(`\r   Updated: ${successCount}/${consolidatedMatches.length}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`\n❌ Error updating ${match.tableName}.${match.customerId}: ${error.message}`);
      }
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ UPDATE COMPLETE');
    console.log('='.repeat(80));
    console.log(`   Successfully updated: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total processed: ${consolidatedMatches.length}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some updates failed. Check error messages above.');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

