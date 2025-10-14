#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');

console.log('\n💰 Checking Account Balances and Recent Payments...\n');

// Check the payment that was just made
const payment = await sql`
  SELECT 
    pop.*,
    po.po_number,
    fa.name as account_name,
    fa.balance as current_balance
  FROM purchase_order_payments pop
  JOIN lats_purchase_orders po ON po.id = pop.purchase_order_id
  JOIN finance_accounts fa ON fa.id = pop.payment_account_id
  WHERE pop.id = '69540f19-bd72-4678-b84b-3b2ad5bb90f9'
`;

if (payment.length > 0) {
  const p = payment[0];
  console.log('📋 Your Last Payment (90,000 TZS):');
  console.log(`   PO: ${p.po_number}`);
  console.log(`   Amount Paid: TZS ${p.amount}`);
  console.log(`   From Account: ${p.account_name}`);
  console.log(`   Current Account Balance: TZS ${p.current_balance}`);
  console.log(`   Payment Time: ${p.created_at}`);
  console.log('');
}

// Check all accounts
const accounts = await sql`
  SELECT id, name, balance, currency, updated_at
  FROM finance_accounts
  WHERE is_active = true
  ORDER BY name
`;

console.log('📊 All Account Balances:');
accounts.forEach(acc => {
  console.log(`   ${acc.name.padEnd(20)} ${acc.currency} ${acc.balance.toString().padStart(15)} (updated: ${new Date(acc.updated_at).toLocaleTimeString()})`);
});
console.log('');

// Check all payments from the last hour
const recentPayments = await sql`
  SELECT 
    pop.amount,
    pop.created_at,
    fa.name as account_name,
    po.po_number
  FROM purchase_order_payments pop
  JOIN finance_accounts fa ON fa.id = pop.payment_account_id
  JOIN lats_purchase_orders po ON po.id = pop.purchase_order_id
  WHERE pop.created_at > NOW() - INTERVAL '1 hour'
  ORDER BY pop.created_at DESC
`;

if (recentPayments.length > 0) {
  console.log('🕐 Recent Payments (last hour):');
  recentPayments.forEach(p => {
    console.log(`   ${p.po_number}: TZS ${p.amount} from ${p.account_name} at ${new Date(p.created_at).toLocaleTimeString()}`);
  });
  console.log('');
}

// Check if balance was actually deducted
console.log('═══════════════════════════════════════════════════════');
console.log('🔍 DIAGNOSIS:');
console.log('═══════════════════════════════════════════════════════');
if (payment.length > 0) {
  const p = payment[0];
  console.log(`Payment of TZS ${p.amount} was recorded`);
  console.log(`Current balance in ${p.account_name}: TZS ${p.current_balance}`);
  console.log('');
  console.log('❓ Was the balance deducted?');
  console.log('   Check if the current balance reflects the payment.');
  console.log('');
  console.log('💡 If balance looks wrong, the issue might be:');
  console.log('   1. UI not refreshing (need to reload page)');
  console.log('   2. Balance deduction function not called');
  console.log('   3. Using the RPC function which might not deduct balance');
}
console.log('═══════════════════════════════════════════════════════\n');

