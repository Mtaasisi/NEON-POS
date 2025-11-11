#!/usr/bin/env node

/**
 * Preview Customer Name Updates from SMS Data
 * 
 * This script shows what changes would be made WITHOUT updating the database
 */

import { readFileSync } from 'fs';

// Clean and normalize phone number
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

// Patterns to identify customer names
const NAME_PATTERNS = [
  /(?:jina langu ni|mimi ni|naitwa)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  /(?:bro|boss|ndugu|kaka|dada)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)/i,
  /(?:mambo\s+vipi|habari\s+ya\s+(?:asubuhi|jioni|mchana|leo))\s+([A-Z][a-z]{3,}(?:\s+[A-Z][a-z]+)?)/i,
];

// Excluded words (not actual names)
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

// Extract customer name from SMS message
function extractNameFromMessage(message) {
  if (!message || typeof message !== 'string') return null;
  
  for (const pattern of NAME_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let name = match[1].trim();
      
      if (name.length < 3 || name.length > 50) continue;
      
      name = name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      const words = name.toLowerCase().split(' ');
      if (words.some(word => EXCLUDED_WORDS.has(word))) continue;
      
      const originalCase = match[1];
      if (originalCase === originalCase.toUpperCase() && originalCase.length > 10) continue;
      
      if (!/[a-zA-Z]/.test(name)) continue;
      
      if (/^(za|ya|wa|vya|cha|kwa|na|au|hizo|hii|yule|ile)/i.test(name)) continue;
      
      return name;
    }
  }
  
  return null;
}

function main() {
  const smsFilePath = process.argv[2] || '/Users/mtaasisi/Downloads/2025-1027-13-59-05.json';
  
  console.log('📖 Reading SMS data from:', smsFilePath);
  console.log('=' .repeat(70) + '\n');
  
  try {
    const content = readFileSync(smsFilePath, 'utf-8');
    const jsonData = JSON.parse(content);
    const messages = jsonData.data || jsonData; // Handle both {data: [...]} and [...] formats
    
    console.log(`✅ Parsed ${messages.length} SMS messages\n`);
    
    const phoneToNames = new Map();
    const phoneToMessages = new Map();
    
    for (const msg of messages) {
      const phone = normalizePhoneNumber(msg.address);
      if (!phone) continue;
      
      const name = extractNameFromMessage(msg.body);
      
      if (name && name !== 'MTAASISI' && !name.includes('Team')) {
        if (!phoneToNames.has(phone)) {
          phoneToNames.set(phone, []);
          phoneToMessages.set(phone, []);
        }
        phoneToNames.get(phone).push(name);
        phoneToMessages.get(phone).push({
          name: name,
          message: msg.body.substring(0, 100) + '...',
          date: new Date(parseInt(msg.date)).toLocaleDateString()
        });
      }
    }
    
    console.log(`📊 Found ${phoneToNames.size} phone numbers with potential customer names\n`);
    console.log('=' .repeat(70) + '\n');
    
    if (phoneToNames.size === 0) {
      console.log('⚠️  No customer names detected in SMS data');
      return;
    }
    
    // Display extracted names
    let count = 0;
    for (const [phone, names] of phoneToNames.entries()) {
      count++;
      
      // Count occurrences
      const nameCounts = {};
      names.forEach(name => {
        nameCounts[name] = (nameCounts[name] || 0) + 1;
      });
      
      const mostCommon = Object.entries(nameCounts)
        .sort((a, b) => b[1] - a[1])[0];
      
      console.log(`${count}. Phone: ${phone}`);
      console.log(`   Suggested Name: ${mostCommon[0]} (appeared ${mostCommon[1]} time(s))`);
      
      // Show alternative names if any
      const alternatives = Object.entries(nameCounts)
        .filter(([name]) => name !== mostCommon[0])
        .map(([name, count]) => `${name} (${count})`);
      
      if (alternatives.length > 0) {
        console.log(`   Alternatives: ${alternatives.join(', ')}`);
      }
      
      // Show a sample message
      const sampleMsg = phoneToMessages.get(phone)[0];
      console.log(`   Sample message: "${sampleMsg.message}"`);
      console.log(`   Date: ${sampleMsg.date}`);
      console.log('');
    }
    
    console.log('=' .repeat(70));
    console.log(`\n✅ Preview complete! Found ${phoneToNames.size} potential customer names.`);
    console.log('\n💡 To apply these updates to your database, run:');
    console.log('   node update-customer-names-from-sms.mjs');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();

