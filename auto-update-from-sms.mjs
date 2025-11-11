#!/usr/bin/env node

/**
 * Automatic Customer Name Update from SMS Data
 * 
 * This script:
 * 1. Parses SMS messages to extract customer names
 * 2. Matches phone numbers to customers with unknown names
 * 3. Automatically updates customers where high-confidence matches are found
 * 4. Exports remaining unknowns to CSV for manual review
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, writeFileSync } from 'fs';
import 'dotenv/config';

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Enhanced name patterns for Swahili SMS - Only VERY explicit introductions
const NAME_PATTERNS = [
  // Explicit self-introductions (most reliable)
  /\b(?:jina\s+langu\s+(?:ni|ni:|ni\s+))\s*([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)/i,
  /\b(?:naitwa)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)/i,
  /\b(?:mimi\s+ni)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)/i,
  
  // Sign-off with name (end of message)
  /(?:regards|from|asante)\s*[,:-]?\s*([A-Z][a-z]{3,}(?:\s+[A-Z][a-z]+)?)\s*$/i,
];

// Words to exclude (not names)
const EXCLUDED_WORDS = new Set([
  'Unknown', 'Guest', 'Customer', 'Sir', 'Madam', 'Boss', 'Bro', 'Brother',
  'Sister', 'Friend', 'Hello', 'Hi', 'Hey', 'Thanks', 'Please', 'Sorry',
  'Yes', 'No', 'Ok', 'Okay', 'Good', 'Bad', 'New', 'Old', 'Big', 'Small',
  'Today', 'Tomorrow', 'Yesterday', 'Morning', 'Evening', 'Afternoon', 'Night',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
  // Swahili common words
  'Habari', 'Mambo', 'Salama', 'Sawa', 'Poa', 'Freshi', 'Vipi', 'Nini',
  'Nzuri', 'Mbaya', 'Leo', 'Kesho', 'Jana', 'Asubuhi', 'Jioni', 'Mchana',
  'Usiku', 'Ndugu', 'Kaka', 'Dada', 'Rafiki', 'Bwana', 'Bibi',
  // Business terms
  'Vodacom', 'Airtel', 'Tigo', 'Halotel', 'Mpesa', 'Tigopesa', 'Airtelmoney',
  'Phone', 'Simu', 'Message', 'Ujumbe', 'Call', 'Piga', 'Send', 'Tuma',
  'Price', 'Bei', 'Cost', 'Ghali', 'Rahisi', 'Shop', 'Duka', 'Store',
]);

function normalizePhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('255')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+255' + cleaned.slice(1);
  } else if (cleaned.length === 9) {
    return '+255' + cleaned;
  }
  
  return '+' + cleaned;
}

function isValidName(name) {
  if (!name || name.length < 3) return false;
  
  // Must contain letters
  if (!/[a-zA-Z]/.test(name)) return false;
  
  // Should not contain numbers
  if (/\d/.test(name)) return false;
  
  // Check if excluded
  const words = name.split(/\s+/);
  for (const word of words) {
    const normalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    if (EXCLUDED_WORDS.has(normalized) || EXCLUDED_WORDS.has(word.toLowerCase())) {
      return false;
    }
  }
  
  // Must not be all lowercase (names should be capitalized)
  if (name === name.toLowerCase()) return false;
  
  // Should not be all caps (likely business name)
  if (name === name.toUpperCase() && name.length > 10) return false;
  
  // Should not contain common non-name words
  const lowerName = name.toLowerCase();
  if (lowerName.includes('laptop') || 
      lowerName.includes('phone') || 
      lowerName.includes('simu') ||
      lowerName.includes('boss') ||
      lowerName.includes('customer') ||
      lowerName.includes('order') ||
      lowerName.includes('oda') ||
      lowerName.includes('shop') ||
      lowerName.includes('duka') ||
      lowerName.includes('price') ||
      lowerName.includes('bei')) {
    return false;
  }
  
  // For multi-word names, all words should be at least 2 chars
  if (words.some(w => w.length < 2)) return false;
  
  // Should be reasonable length (2-30 characters)
  if (name.length > 30) return false;
  
  return true;
}

function extractNameFromMessage(message) {
  if (!message || !message.body) return null;
  
  const body = message.body.trim();
  if (body.length < 10) return null; // Too short to contain meaningful name
  
  for (const pattern of NAME_PATTERNS) {
    const match = body.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (isValidName(name)) {
        return name;
      }
    }
  }
  
  return null;
}

function parseSmsData(filePath) {
  console.log(`📂 Reading SMS file: ${filePath}`);
  const content = readFileSync(filePath, 'utf-8');
  const jsonData = JSON.parse(content);
  const messages = jsonData.data || jsonData;
  
  console.log(`   Found ${messages.length.toLocaleString()} SMS messages`);
  
  // Extract phone->name mappings
  const phoneToNames = new Map();
  
  for (const msg of messages) {
    if (!msg.address) continue;
    
    const phone = normalizePhoneNumber(msg.address);
    if (!phone) continue;
    
    const name = extractNameFromMessage(msg);
    if (!name) continue;
    
    // Track all names found for this phone
    if (!phoneToNames.has(phone)) {
      phoneToNames.set(phone, new Map());
    }
    
    const namesForPhone = phoneToNames.get(phone);
    namesForPhone.set(name, (namesForPhone.get(name) || 0) + 1);
  }
  
  // For each phone, pick the most common name
  const finalMappings = new Map();
  for (const [phone, namesMap] of phoneToNames) {
    // Get the name that appeared most frequently
    let bestName = null;
    let maxCount = 0;
    
    for (const [name, count] of namesMap) {
      if (count > maxCount) {
        maxCount = count;
        bestName = name;
      }
    }
    
    if (bestName && maxCount >= 2) { // Require at least 2 occurrences for confidence
      finalMappings.set(phone, { name: bestName, confidence: maxCount });
    }
  }
  
  console.log(`   Extracted ${finalMappings.size} phone-to-name mappings`);
  return finalMappings;
}

async function getUnknownCustomers() {
  console.log('\n🔍 Fetching customers with unknown names...');
  
  const customers = await sql`
    SELECT id, name, phone, whatsapp, email
    FROM customers
    WHERE name IS NOT NULL
    ORDER BY created_at DESC
  `;
  
  const unknownPattern = /(unknown|guest|customer|walk.?in|cash.?customer|anonymous|n\/a|none|^-+$|^\d+$)/i;
  const unknown = customers.filter(c => 
    !c.name || 
    c.name.trim() === '' || 
    unknownPattern.test(c.name.trim())
  );
  
  console.log(`   Found ${unknown.length} customers with unknown names`);
  return unknown;
}

function matchSmsToCustomers(smsMap, unknownCustomers) {
  console.log('\n🔗 Matching SMS names to customers...');
  
  const matches = [];
  let matchedByPhone = 0;
  let matchedByWhatsApp = 0;
  
  for (const customer of unknownCustomers) {
    let match = null;
    
    // Try phone number
    if (customer.phone) {
      const normalized = normalizePhoneNumber(customer.phone);
      if (normalized && smsMap.has(normalized)) {
        match = smsMap.get(normalized);
        matchedByPhone++;
      }
    }
    
    // Try WhatsApp number
    if (!match && customer.whatsapp) {
      const normalized = normalizePhoneNumber(customer.whatsapp);
      if (normalized && smsMap.has(normalized)) {
        match = smsMap.get(normalized);
        matchedByWhatsApp++;
      }
    }
    
    if (match) {
      matches.push({
        customerId: customer.id,
        currentName: customer.name,
        newName: match.name,
        confidence: match.confidence,
        phone: customer.phone || customer.whatsapp,
        email: customer.email
      });
    }
  }
  
  console.log(`   Matched ${matches.length} customers`);
  console.log(`     - By phone: ${matchedByPhone}`);
  console.log(`     - By WhatsApp: ${matchedByWhatsApp}`);
  
  return matches;
}

async function updateCustomer(customerId, newName) {
  await sql`
    UPDATE customers
    SET name = ${newName}, updated_at = NOW()
    WHERE id = ${customerId}
  `;
}

function exportRemainingToCSV(unknownCustomers, matchedIds) {
  const remaining = unknownCustomers.filter(c => !matchedIds.has(c.id));
  
  if (remaining.length === 0) {
    console.log('\n✅ No remaining customers need manual review!');
    return;
  }
  
  console.log(`\n📄 Exporting ${remaining.length} remaining customers to CSV...`);
  
  let csv = 'phone,name,current_name,email\n';
  for (const customer of remaining) {
    const phone = (customer.phone || customer.whatsapp || '').replace(/,/g, '');
    const email = (customer.email || '').replace(/,/g, '');
    const currentName = (customer.name || 'Unknown').replace(/,/g, '');
    csv += `${phone},,${currentName},${email}\n`;
  }
  
  writeFileSync('remaining-customers-to-update.csv', csv);
  console.log(`   ✅ Exported to: remaining-customers-to-update.csv`);
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const args = process.argv.slice(2).filter(arg => arg !== '--dry-run');
  const smsFile = args[0] || '/Users/mtaasisi/Downloads/2025-1027-13-59-05.json';
  
  console.log('🚀 Automatic Customer Name Update from SMS');
  console.log('='.repeat(80));
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    // Step 1: Parse SMS data
    const smsMap = parseSmsData(smsFile);
    
    if (smsMap.size === 0) {
      console.log('\n❌ No valid names found in SMS data');
      return;
    }
    
    // Step 2: Get unknown customers
    const unknownCustomers = await getUnknownCustomers();
    
    if (unknownCustomers.length === 0) {
      console.log('\n✅ No customers with unknown names!');
      return;
    }
    
    // Step 3: Match SMS to customers
    const matches = matchSmsToCustomers(smsMap, unknownCustomers);
    
    if (matches.length === 0) {
      console.log('\n❌ No matches found between SMS and customers');
      console.log('   Exporting all unknown customers to CSV for manual review...');
      exportRemainingToCSV(unknownCustomers, new Set());
      return;
    }
    
    // Step 4: Preview matches
    console.log('\n' + '='.repeat(80));
    console.log('📋 PREVIEW OF UPDATES');
    console.log('='.repeat(80));
    
    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    
    // Show top 20
    const preview = matches.slice(0, 20);
    for (const match of preview) {
      console.log(`\nPhone: ${match.phone}`);
      console.log(`  Current: "${match.currentName}"`);
      console.log(`  New:     "${match.newName}"`);
      console.log(`  Confidence: ${match.confidence} SMS occurrences`);
    }
    
    if (matches.length > 20) {
      console.log(`\n... and ${matches.length - 20} more updates`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n⚠️  Ready to update ${matches.length} customers`);
    
    // High confidence vs low confidence
    const highConfidence = matches.filter(m => m.confidence >= 3);
    const lowConfidence = matches.filter(m => m.confidence < 3);
    
    console.log(`   - High confidence (3+ SMS): ${highConfidence.length}`);
    console.log(`   - Low confidence (2 SMS): ${lowConfidence.length}`);
    
    if (isDryRun) {
      console.log('\n🔍 DRY RUN - No changes made');
      console.log(`\nTo apply changes, run without --dry-run flag:`);
      console.log(`  node auto-update-from-sms.mjs "${smsFile}"`);
      return;
    }
    
    // Step 5: Update customers
    console.log('\n🔄 Updating customers...');
    
    let successCount = 0;
    let errorCount = 0;
    const updatedIds = new Set();
    
    for (const match of matches) {
      try {
        await updateCustomer(match.customerId, match.newName);
        successCount++;
        updatedIds.add(match.customerId);
        
        if (successCount % 10 === 0) {
          process.stdout.write(`\r   Progress: ${successCount}/${matches.length}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`\n❌ Error updating ${match.customerId}: ${error.message}`);
      }
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ UPDATE COMPLETE');
    console.log('='.repeat(80));
    console.log(`   Successfully updated: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total processed: ${matches.length}`);
    
    // Step 6: Export remaining unknowns
    exportRemainingToCSV(unknownCustomers, updatedIds);
    
    const remaining = unknownCustomers.length - updatedIds.size;
    if (remaining > 0) {
      console.log(`\n📝 Next Steps:`);
      console.log(`   1. Review: remaining-customers-to-update.csv (${remaining} entries)`);
      console.log(`   2. Fill in the 'name' column manually`);
      console.log(`   3. Run: node update-customers-from-csv.mjs remaining-customers-to-update.csv`);
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);

