#!/usr/bin/env node

/**
 * Update Customer Names from SMS Data
 * 
 * This script:
 * 1. Parses SMS JSON data to extract customer names from message patterns
 * 2. Finds customers in the database with "unknown" or generic names
 * 3. Matches phone numbers and updates customer names
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Patterns to identify customer names in SMS messages
const NAME_PATTERNS = [
  // Sender identification (most reliable)
  /(?:jina langu ni|mimi ni|naitwa)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  // Direct name mention with "bro", "boss", etc.
  /(?:bro|boss|ndugu|kaka|dada)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)/i,
  // Name after greetings (more specific - requires longer names)
  /(?:mambo\s+vipi|habari\s+ya\s+(?:asubuhi|jioni|mchana|leo))\s+([A-Z][a-z]{3,}(?:\s+[A-Z][a-z]+)?)/i,
];

// Common words to filter out (not actual names)
const EXCLUDED_WORDS = new Set([
  'habari', 'mambo', 'vipi', 'hello', 'hi', 'boss', 'bro', 'ndugu', 'kaka', 'dada',
  'vodacom', 'airtel', 'tigo', 'halotel', 'mpesa', 'tigopesa', 'halopesa',
  'inauzwa', 'mtaasisi', 'team', 'customer', 'mteja', 'samahani', 'ningependa',
  'naitaji', 'kuuliza', 'natafuta', 'mnapatikana', 'account', 'bank', 'pesa',
  'access', 'crdb', 'nmb', 'nbc', 'kcb', 'azam', 'remitly', 'food', 'shishi',
  'karibu', 'asante', 'ahsante', 'pole', 'sawa', 'hapana', 'ndio', 'ndiyo',
  'asubuhi', 'jioni', 'mchana', 'usiku', 'leo', 'jana', 'kesho', 'wiki',
  'mwezi', 'mwaka', 'siku', 'saa', 'dakika', 'intaneti', 'data', 'bomba',
  'vifurushi', 'zawadi', 'ofa', 'spesho', 'kujiunga', 'piga', 'bonyeza',
  'arabic', 'english', 'kiswahili', 'lugha', 'mkuu', 'kiongozi', 'tajiri'
].map(w => w.toLowerCase()));

// Generic/unknown name patterns to identify customers that need updating
const UNKNOWN_NAME_PATTERNS = [
  /^unknown$/i,
  /^customer$/i,
  /^guest$/i,
  /^mteja$/i,
  /^anonymous$/i,
  /^walk[-\s]?in$/i,
  /^no\s+name$/i,
  /^n\/a$/i,
  /^\d+$/,  // Only numbers
  /^test/i,
  /^sample/i
];

/**
 * Clean and normalize phone number
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Tanzania numbers
  if (cleaned.startsWith('255')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    return '+255' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    return '+255' + cleaned;
  }
  
  return '+' + cleaned;
}

/**
 * Extract potential customer name from SMS message
 */
function extractNameFromMessage(message) {
  if (!message || typeof message !== 'string') return null;
  
  for (const pattern of NAME_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let name = match[1].trim();
      
      // Validate name length (must be meaningful)
      if (name.length < 3 || name.length > 50) continue;
      
      // Capitalize properly
      name = name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      // Filter out excluded words
      const words = name.toLowerCase().split(' ');
      if (words.some(word => EXCLUDED_WORDS.has(word))) {
        continue;
      }
      
      // Name should not be all caps (spam) or all lowercase
      const originalCase = match[1];
      if (originalCase === originalCase.toUpperCase() && originalCase.length > 10) {
        continue;
      }
      
      // Should contain at least one letter
      if (!/[a-zA-Z]/.test(name)) {
        continue;
      }
      
      // Should not start with common non-name prefixes
      if (/^(za|ya|wa|vya|cha|kwa|na|au|hizo|hii|yule|ile)/i.test(name)) {
        continue;
      }
      
      return name;
    }
  }
  
  return null;
}

/**
 * Check if a name is unknown/generic
 */
function isUnknownName(name) {
  if (!name || typeof name !== 'string') return true;
  
  const trimmed = name.trim();
  
  // Check if empty or too short
  if (trimmed.length < 2) return true;
  
  // Check against unknown patterns
  return UNKNOWN_NAME_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Parse SMS JSON file and extract phone-to-name mapping
 */
function parseSmsData(filePath) {
  console.log('📖 Reading SMS data from:', filePath);
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(content);
    const messages = jsonData.data || jsonData; // Handle both {data: [...]} and [...] formats
    
    console.log(`✅ Parsed ${messages.length} SMS messages`);
    
    // Map of phone number -> potential names (array to handle multiple possibilities)
    const phoneToNames = new Map();
    
    for (const msg of messages) {
      const phone = normalizePhoneNumber(msg.address);
      if (!phone) continue;
      
      // Type 1 = received message (more likely to contain sender name)
      // Type 2 = sent message
      const name = extractNameFromMessage(msg.body);
      
      if (name && name !== 'MTAASISI' && !name.includes('Team')) {
        if (!phoneToNames.has(phone)) {
          phoneToNames.set(phone, []);
        }
        phoneToNames.get(phone).push(name);
      }
    }
    
    // Consolidate multiple names for same number (use most common)
    const consolidatedMap = new Map();
    for (const [phone, names] of phoneToNames.entries()) {
      // Count occurrences
      const nameCounts = {};
      names.forEach(name => {
        nameCounts[name] = (nameCounts[name] || 0) + 1;
      });
      
      // Get most common name
      const mostCommon = Object.entries(nameCounts)
        .sort((a, b) => b[1] - a[1])[0];
      
      if (mostCommon) {
        consolidatedMap.set(phone, {
          name: mostCommon[0],
          confidence: mostCommon[1]
        });
      }
    }
    
    console.log(`📊 Extracted ${consolidatedMap.size} unique phone numbers with names`);
    
    return consolidatedMap;
  } catch (error) {
    console.error('❌ Error reading SMS file:', error.message);
    throw error;
  }
}

/**
 * Find customers with unknown names in database
 */
async function findCustomersWithUnknownNames() {
  console.log('\n🔍 Searching for customers with unknown names...');
  
  try {
    // Check both customers tables
    const customers = await sql`
      SELECT id, name, phone, whatsapp, created_at
      FROM customers
      WHERE phone IS NOT NULL AND phone != ''
      ORDER BY created_at DESC
    `;
    
    const latsCustomers = await sql`
      SELECT id, name, phone, created_at
      FROM lats_customers
      WHERE phone IS NOT NULL AND phone != ''
      ORDER BY created_at DESC
    `;
    
    // Filter for unknown names
    const unknownCustomers = customers.filter(c => isUnknownName(c.name));
    const unknownLatsCustomers = latsCustomers.filter(c => isUnknownName(c.name));
    
    console.log(`📋 Found ${unknownCustomers.length} customers with unknown names in 'customers' table`);
    console.log(`📋 Found ${unknownLatsCustomers.length} customers with unknown names in 'lats_customers' table`);
    
    return {
      customers: unknownCustomers,
      latsCustomers: unknownLatsCustomers
    };
  } catch (error) {
    console.error('❌ Error querying database:', error.message);
    throw error;
  }
}

/**
 * Update customer name in database
 */
async function updateCustomerName(customerId, newName, tableName = 'customers') {
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
    console.error(`❌ Error updating customer ${customerId}:`, error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Customer Name Update from SMS Data\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Parse SMS data
    const smsFilePath = process.argv[2] || '/Users/mtaasisi/Downloads/2025-1027-13-59-05.json';
    const phoneToNames = parseSmsData(smsFilePath);
    
    if (phoneToNames.size === 0) {
      console.log('⚠️  No customer names found in SMS data');
      return;
    }
    
    // Step 2: Find customers with unknown names
    const { customers, latsCustomers } = await findCustomersWithUnknownNames();
    
    if (customers.length === 0 && latsCustomers.length === 0) {
      console.log('\n✅ No customers with unknown names found!');
      return;
    }
    
    // Step 3: Match and update
    console.log('\n📝 Matching phone numbers and updating names...\n');
    
    let updatedCount = 0;
    let matchedCount = 0;
    
    // Update customers table
    for (const customer of customers) {
      const normalizedPhone = normalizePhoneNumber(customer.phone);
      const normalizedWhatsapp = normalizePhoneNumber(customer.whatsapp);
      
      let nameData = phoneToNames.get(normalizedPhone) || phoneToNames.get(normalizedWhatsapp);
      
      if (nameData) {
        matchedCount++;
        console.log(`✓ Match found: ${customer.phone} -> ${nameData.name} (confidence: ${nameData.confidence})`);
        console.log(`  Current name: "${customer.name}" -> New name: "${nameData.name}"`);
        
        const success = await updateCustomerName(customer.id, nameData.name, 'customers');
        if (success) {
          updatedCount++;
          console.log(`  ✅ Updated successfully!\n`);
        } else {
          console.log(`  ❌ Update failed\n`);
        }
      }
    }
    
    // Update lats_customers table
    for (const customer of latsCustomers) {
      const normalizedPhone = normalizePhoneNumber(customer.phone);
      
      const nameData = phoneToNames.get(normalizedPhone);
      
      if (nameData) {
        matchedCount++;
        console.log(`✓ Match found: ${customer.phone} -> ${nameData.name} (confidence: ${nameData.confidence})`);
        console.log(`  Current name: "${customer.name}" -> New name: "${nameData.name}"`);
        
        const success = await updateCustomerName(customer.id, nameData.name, 'lats_customers');
        if (success) {
          updatedCount++;
          console.log(`  ✅ Updated successfully!\n`);
        } else {
          console.log(`  ❌ Update failed\n`);
        }
      }
    }
    
    // Summary
    console.log('=' .repeat(60));
    console.log('\n📊 SUMMARY\n');
    console.log(`Total customers with unknown names: ${customers.length + latsCustomers.length}`);
    console.log(`Matches found in SMS data: ${matchedCount}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Not matched: ${(customers.length + latsCustomers.length) - matchedCount}`);
    
    if (updatedCount > 0) {
      console.log('\n✅ Customer names updated successfully!');
    } else {
      console.log('\n⚠️  No customers were updated');
    }
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

