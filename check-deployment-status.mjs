#!/usr/bin/env node
/**
 * Check Netlify deployment status
 */

const WEBHOOK_URL = 'https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  🚀 CHECKING DEPLOYMENT STATUS                        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function checkDeployment() {
  console.log('🔍 Testing webhook endpoint...\n');
  
  try {
    const response = await fetch(WEBHOOK_URL);
    const data = await response.json();
    
    console.log('📊 Webhook Status:');
    console.log('   URL:', WEBHOOK_URL);
    console.log('   Status Code:', response.status);
    console.log('   Service:', data.service || 'N/A');
    console.log('   Database Connected:', data.database_connected ? '✅ YES' : '❌ NO');
    
    if (data.database_connected) {
      console.log('\n✅ DEPLOYMENT SUCCESSFUL!');
      console.log('   Database connection is working!');
      console.log('   Webhook is ready to receive messages.\n');
    } else {
      console.log('\n⏳ DEPLOYMENT IN PROGRESS OR NOT YET DEPLOYED');
      console.log('   Database connection not yet active.');
      console.log('   This may take 2-3 minutes after push.\n');
    }
    
    if (data.error) {
      console.log('   Error:', data.error);
    }
    
    console.log('📋 Next Steps:');
    if (data.database_connected) {
      console.log('   1. ✅ Deployment complete!');
      console.log('   2. Run: node auto-test-webhook.mjs');
      console.log('   3. Send a test message from your phone');
      console.log('   4. Check: node check-received-messages.mjs');
    } else {
      console.log('   1. Wait 2-3 minutes for auto-deploy to complete');
      console.log('   2. Check Netlify dashboard:');
      console.log('      https://app.netlify.com/sites/inauzwaapp/deploys');
      console.log('   3. Run this script again to verify');
    }
    console.log('');
    
  } catch (error) {
    console.log('❌ Error checking deployment:', error.message);
    console.log('');
    console.log('📋 Manual Check:');
    console.log('   Go to: https://app.netlify.com/sites/inauzwaapp/deploys');
    console.log('   Look for the latest deployment');
    console.log('   Status should show: "Published" or "Building"');
    console.log('');
  }
}

checkDeployment().catch(console.error);

