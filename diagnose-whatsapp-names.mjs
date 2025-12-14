#!/usr/bin/env node
/**
 * WhatsApp Name Matching Diagnostic Tool
 * 
 * This script helps identify why customer names are not appearing in WhatsApp Inbox
 * 
 * Usage:
 *   node diagnose-whatsapp-names.mjs
 * 
 * What it checks:
 * 1. Messages without customer_id (not linked to customer)
 * 2. Phone number format mismatches
 * 3. Suggests which customers might match based on last 9 digits
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Normalize phone number
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.trim().replace(/[\s\-\(\)\.]/g, '').replace(/[^\d+]/g, '');
}

/**
 * Get last 9 digits of phone number
 */
function getLast9Digits(phone) {
  const normalized = normalizePhone(phone).replace(/\+/g, '');
  if (normalized.length >= 9) {
    return normalized.slice(-9);
  }
  return normalized;
}

/**
 * Get all phone variations
 */
function getPhoneVariations(phone) {
  if (!phone) return [];
  
  const normalized = normalizePhone(phone);
  const variations = new Set([normalized]);
  
  const withoutPlus = normalized.replace(/^\+/, '');
  variations.add(withoutPlus);
  
  if (!normalized.startsWith('+')) {
    variations.add('+' + withoutPlus);
  }
  
  if (withoutPlus.startsWith('255')) {
    const without255 = withoutPlus.substring(3);
    variations.add(without255);
    variations.add('+' + withoutPlus);
    if (!without255.startsWith('0')) {
      variations.add('0' + without255);
    }
  } else if (withoutPlus.startsWith('0')) {
    const without0 = withoutPlus.substring(1);
    variations.add(without0);
    variations.add('255' + without0);
    variations.add('+255' + without0);
  } else {
    variations.add('0' + withoutPlus);
    variations.add('255' + withoutPlus);
    variations.add('+255' + withoutPlus);
  }
  
  return Array.from(variations);
}

console.log('🔍 WhatsApp Name Matching Diagnostic Tool\n');
console.log('=' .repeat(80) + '\n');

// Step 1: Get messages without customer_id
console.log('📊 Step 1: Checking messages without customer names...\n');

const { data: unmatchedMessages, error: msgError } = await supabase
  .from('whatsapp_incoming_messages')
  .select('*')
  .is('customer_id', null)
  .order('created_at', { ascending: false })
  .limit(20);

if (msgError) {
  console.error('❌ Error fetching messages:', msgError.message);
  process.exit(1);
}

console.log(`Found ${unmatchedMessages.length} messages without customer link\n`);

if (unmatchedMessages.length === 0) {
  console.log('✅ All messages are linked to customers! No issues found.\n');
  process.exit(0);
}

// Step 2: Load all customers
const { data: customers, error: custError } = await supabase
  .from('customers')
  .select('id, name, phone, whatsapp');

if (custError) {
  console.error('❌ Error fetching customers:', custError.message);
  process.exit(1);
}

console.log(`Loaded ${customers.length} customers from database\n`);

// Step 3: Analyze each unmatched message
console.log('🔎 Analyzing unmatched messages:\n');
console.log('=' .repeat(80) + '\n');

const fixableMatches = [];

for (const msg of unmatchedMessages) {
  const fromPhone = msg.from_phone;
  const msgLast9 = getLast9Digits(fromPhone);
  const msgVariations = getPhoneVariations(fromPhone);
  
  console.log(`📱 Message from: ${fromPhone}`);
  console.log(`   Last 9 digits: ${msgLast9}`);
  console.log(`   Message preview: "${msg.message_text.substring(0, 50)}..."`);
  console.log(`   Received: ${new Date(msg.created_at).toLocaleString()}`);
  
  // Try to find matching customer
  let matchedCustomers = [];
  
  // Match by last 9 digits (most reliable for Tanzanian numbers)
  if (msgLast9 && msgLast9.length === 9) {
    matchedCustomers = customers.filter(c => {
      const phoneLast9 = getLast9Digits(c.phone || '');
      const whatsappLast9 = getLast9Digits(c.whatsapp || '');
      return phoneLast9 === msgLast9 || whatsappLast9 === msgLast9;
    });
  }
  
  // If no match, try all variations
  if (matchedCustomers.length === 0) {
    matchedCustomers = customers.filter(c => {
      const phoneVariations = getPhoneVariations(c.phone || '');
      const whatsappVariations = getPhoneVariations(c.whatsapp || '');
      return msgVariations.some(v => 
        phoneVariations.includes(v) || whatsappVariations.includes(v)
      );
    });
  }
  
  if (matchedCustomers.length > 0) {
    console.log(`   ✅ MATCH FOUND!`);
    for (const customer of matchedCustomers) {
      console.log(`      → Customer: ${customer.name}`);
      console.log(`         Phone: ${customer.phone || 'N/A'}`);
      console.log(`         WhatsApp: ${customer.whatsapp || 'N/A'}`);
      
      fixableMatches.push({
        messageId: msg.id,
        customerId: customer.id,
        customerName: customer.name,
        fromPhone: fromPhone,
        customerPhone: customer.phone,
        customerWhatsapp: customer.whatsapp
      });
    }
  } else {
    console.log(`   ❌ NO MATCH - Customer not in database`);
    console.log(`      Tried variations: ${msgVariations.slice(0, 3).join(', ')}...`);
  }
  
  console.log('');
}

// Step 4: Summary and fix suggestions
console.log('=' .repeat(80) + '\n');
console.log('📋 SUMMARY:\n');
console.log(`Total unmatched messages: ${unmatchedMessages.length}`);
console.log(`Messages with potential matches: ${fixableMatches.length}`);
console.log(`Messages with no customer in DB: ${unmatchedMessages.length - fixableMatches.length}\n`);

if (fixableMatches.length > 0) {
  console.log('🔧 FIX SUGGESTIONS:\n');
  console.log('Option 1: Run auto-fix to link these messages to customers:');
  console.log('   node diagnose-whatsapp-names.mjs --fix\n');
  
  console.log('Option 2: Update webhook to use enhanced phone matching:');
  console.log('   The webhook handler should use the improved phone matching logic');
  console.log('   from src/utils/phoneMatching.ts\n');
  
  console.log('Option 3: Standardize phone formats in customers table:');
  console.log('   Run: UPDATE customers SET phone = ..., whatsapp = ...\n');
}

// Auto-fix option
if (process.argv.includes('--fix')) {
  console.log('\n🔧 AUTO-FIX MODE\n');
  console.log('Updating messages with customer links...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const match of fixableMatches) {
    const { error } = await supabase
      .from('whatsapp_incoming_messages')
      .update({ customer_id: match.customerId })
      .eq('id', match.messageId);
    
    if (error) {
      console.error(`❌ Failed to link message ${match.messageId}:`, error.message);
      errorCount++;
    } else {
      console.log(`✅ Linked message from ${match.fromPhone} to ${match.customerName}`);
      successCount++;
    }
  }
  
  console.log(`\n✅ Fixed ${successCount} messages`);
  if (errorCount > 0) {
    console.log(`❌ Failed to fix ${errorCount} messages`);
  }
}

console.log('\n✨ Diagnostic complete!\n');

