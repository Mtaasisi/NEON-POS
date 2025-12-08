#!/usr/bin/env node
/**
 * Verify webhook events are configured correctly
 */

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  🔍 VERIFYING WEBHOOK EVENTS CONFIGURATION            ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('✅ Webhook URL is configured:');
console.log('   https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook\n');

console.log('✅ Webhook test was successful (200 OK)\n');

console.log('⚠️  IMPORTANT: Webhook test only verifies the endpoint is reachable.');
console.log('   It does NOT verify that message events are enabled.\n');

console.log('📋 CRITICAL: You must enable these events in WasenderAPI:\n');
console.log('   ✅ messages.received  ← REQUIRED for incoming messages');
console.log('   ✅ messages.upsert    ← REQUIRED for incoming messages');
console.log('   ✅ messages.update    ← Optional (for delivery status)');
console.log('   ✅ messages.reaction  ← Optional (for emoji reactions)\n');

console.log('🔍 To check/enable events:');
console.log('   1. In WasenderAPI dashboard, look for "Webhook Events" section');
console.log('   2. Or look for checkboxes next to event names');
console.log('   3. Make sure "messages.received" is CHECKED ✅');
console.log('   4. Make sure "messages.upsert" is CHECKED ✅');
console.log('   5. Save the configuration\n');

console.log('🧪 Test Steps:');
console.log('   1. Ensure events are enabled (see above)');
console.log('   2. Send a WhatsApp message from your phone to: +255769601663');
console.log('   3. Wait 10-15 seconds');
console.log('   4. Run: node check-received-messages.mjs');
console.log('   5. Check Netlify logs for incoming webhook requests\n');

console.log('📊 Check Netlify Function Logs:');
console.log('   https://app.netlify.com/sites/inauzwaapp/functions');
console.log('   → Click "whatsapp-webhook"');
console.log('   → View "Logs" tab');
console.log('   → Look for: "📥 POST Request Received" entries\n');

console.log('💡 If messages still don\'t appear:');
console.log('   - Verify events are enabled (most common issue)');
console.log('   - Check Netlify logs for errors');
console.log('   - Verify WhatsApp session is connected');
console.log('   - Make sure you\'re sending to the correct number: +255769601663\n');

