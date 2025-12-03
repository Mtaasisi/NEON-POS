import fetch from 'node-fetch';

const WEBHOOK_URL = 'https://dukani.site/api/whatsapp/webhook.php';

console.log('\n🔗 Configuring WasenderAPI Webhook...\n');
console.log('Webhook URL:', WEBHOOK_URL);
console.log('\nManual Configuration:');
console.log('1. Go to: https://wasenderapi.com/whatsapp/37637/edit');
console.log('2. Find "Webhook" or "Webhook URL" field');
console.log('3. Enter:', WEBHOOK_URL);
console.log('4. Enable events: messages.received, messages.update');
console.log('5. Toggle "Enable Webhook" to ON');
console.log('6. Click Save\n');
console.log('✅ Your webhook is already active and waiting!\n');
console.log('Test by sending WhatsApp to your business number!\n');
