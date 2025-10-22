#!/usr/bin/env node

import dotenv from 'dotenv';
import postgres from 'postgres';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or VITE_DATABASE_URL not found in .env file');
  console.error('\nPlease set one of the following in your .env file:');
  console.error('  DATABASE_URL=postgresql://user:password@host:5432/database');
  console.error('  VITE_DATABASE_URL=postgresql://user:password@host:5432/database');
  process.exit(1);
}

if (DATABASE_URL === 'YOUR_NEON_DATABASE_URL_HERE') {
  console.error('❌ Please update your .env file with your actual Neon database URL');
  console.error('\nYour VITE_DATABASE_URL is still set to the placeholder value.');
  console.error('Get your database URL from your Neon dashboard.');
  process.exit(1);
}

// Create SQL client
const sql = postgres(DATABASE_URL, {
  max: 1,
  ssl: 'require'
});

console.log('🔍 Checking all installment data in database...\n');

async function checkInstallments() {
  try {
    // ==========================================
    // 1. GET ALL INSTALLMENT PLANS
    // ==========================================
    console.log('📋 INSTALLMENT PLANS:\n');
    console.log('='.repeat(100));
    
    const plans = await sql`
      SELECT 
        cip.*,
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        ls.id as sale_id,
        ls.sale_number,
        ls.total_amount as sale_total,
        lb.id as branch_id,
        lb.name as branch_name
      FROM customer_installment_plans cip
      LEFT JOIN customers c ON cip.customer_id = c.id
      LEFT JOIN lats_sales ls ON cip.sale_id = ls.id
      LEFT JOIN lats_branches lb ON cip.branch_id = lb.id
      ORDER BY cip.created_at DESC
    `;

    if (!plans || plans.length === 0) {
      console.log('📭 No installment plans found in database\n');
    } else {
      console.log(`✅ Found ${plans.length} installment plan(s)\n`);
      
      plans.forEach((plan, index) => {
        console.log(`\n${index + 1}. PLAN #${plan.plan_number}`);
        console.log('-'.repeat(100));
        console.log(`   ID: ${plan.id}`);
        console.log(`   Customer: ${plan.customer_name || 'Unknown'} (${plan.customer_phone || 'No phone'})`);
        console.log(`   Branch: ${plan.branch_name || 'Unknown'}`);
        console.log(`   Sale: ${plan.sale_number || 'No linked sale'}`);
        console.log(`   Status: ${plan.status.toUpperCase()}`);
        console.log(`\n   💰 Financial Details:`);
        console.log(`      Total Amount: $${parseFloat(plan.total_amount).toFixed(2)}`);
        console.log(`      Down Payment: $${parseFloat(plan.down_payment).toFixed(2)}`);
        console.log(`      Amount Financed: $${parseFloat(plan.amount_financed).toFixed(2)}`);
        console.log(`      Total Paid: $${parseFloat(plan.total_paid).toFixed(2)}`);
        console.log(`      Balance Due: $${parseFloat(plan.balance_due).toFixed(2)}`);
        console.log(`\n   📅 Payment Schedule:`);
        console.log(`      Installment Amount: $${parseFloat(plan.installment_amount).toFixed(2)}`);
        console.log(`      Number of Installments: ${plan.number_of_installments}`);
        console.log(`      Installments Paid: ${plan.installments_paid}`);
        console.log(`      Payment Frequency: ${plan.payment_frequency}`);
        console.log(`\n   📆 Dates:`);
        console.log(`      Start Date: ${plan.start_date}`);
        console.log(`      Next Payment Date: ${plan.next_payment_date}`);
        console.log(`      End Date: ${plan.end_date}`);
        if (plan.completion_date) {
          console.log(`      Completion Date: ${plan.completion_date}`);
        }
        console.log(`\n   ⚠️  Late Payment Info:`);
        console.log(`      Days Overdue: ${plan.days_overdue}`);
        console.log(`      Late Fee Applied: $${parseFloat(plan.late_fee_applied).toFixed(2)}`);
        console.log(`      Reminder Count: ${plan.reminder_count}`);
        if (plan.last_reminder_sent) {
          console.log(`      Last Reminder: ${new Date(plan.last_reminder_sent).toLocaleString()}`);
        }
        if (plan.notes) {
          console.log(`\n   📝 Notes: ${plan.notes}`);
        }
        console.log(`   Created: ${new Date(plan.created_at).toLocaleString()}`);
      });
    }

    // ==========================================
    // 2. GET ALL INSTALLMENT PAYMENTS
    // ==========================================
    console.log('\n\n' + '='.repeat(100));
    console.log('💳 INSTALLMENT PAYMENTS:\n');
    console.log('='.repeat(100));
    
    const payments = await sql`
      SELECT 
        ip.*,
        cip.plan_number,
        c.name as customer_name,
        c.phone as customer_phone,
        fa.account_name
      FROM customer_installment_plan_payments ip
      LEFT JOIN customer_installment_plans cip ON ip.installment_plan_id = cip.id
      LEFT JOIN customers c ON ip.customer_id = c.id
      LEFT JOIN finance_accounts fa ON ip.account_id = fa.id
      ORDER BY ip.payment_date DESC
    `;

    if (!payments || payments.length === 0) {
      console.log('📭 No installment payments found in database\n');
    } else {
      console.log(`✅ Found ${payments.length} installment payment(s)\n`);
      
      payments.forEach((payment, index) => {
        console.log(`\n${index + 1}. PAYMENT #${payment.installment_number}`);
        console.log('-'.repeat(100));
        console.log(`   ID: ${payment.id}`);
        console.log(`   Plan: ${payment.plan_number || 'Unknown'}`);
        console.log(`   Customer: ${payment.customer_name || 'Unknown'} (${payment.customer_phone || 'No phone'})`);
        console.log(`   Amount: $${parseFloat(payment.amount).toFixed(2)}`);
        console.log(`   Payment Method: ${payment.payment_method}`);
        console.log(`   Payment Date: ${new Date(payment.payment_date).toLocaleString()}`);
        console.log(`   Due Date: ${payment.due_date}`);
        console.log(`   Status: ${payment.status.toUpperCase()}`);
        if (payment.days_late > 0) {
          console.log(`   Days Late: ${payment.days_late}`);
          console.log(`   Late Fee: $${parseFloat(payment.late_fee).toFixed(2)}`);
        }
        if (payment.account_name) {
          console.log(`   Account: ${payment.account_name}`);
        }
        if (payment.reference_number) {
          console.log(`   Reference: ${payment.reference_number}`);
        }
        if (payment.notes) {
          console.log(`   Notes: ${payment.notes}`);
        }
        console.log(`   Notification Sent: ${payment.notification_sent ? 'Yes' : 'No'}`);
      });
    }

    // ==========================================
    // 3. SUMMARY STATISTICS
    // ==========================================
    console.log('\n\n' + '='.repeat(100));
    console.log('📊 SUMMARY STATISTICS:\n');
    console.log('='.repeat(100));
    
    if (plans && plans.length > 0) {
      const totalPlans = plans.length;
      const activePlans = plans.filter(p => p.status === 'active').length;
      const completedPlans = plans.filter(p => p.status === 'completed').length;
      const defaultedPlans = plans.filter(p => p.status === 'defaulted').length;
      const cancelledPlans = plans.filter(p => p.status === 'cancelled').length;
      
      const totalAmountFinanced = plans.reduce((sum, p) => sum + parseFloat(p.total_amount), 0);
      const totalPaid = plans.reduce((sum, p) => sum + parseFloat(p.total_paid), 0);
      const totalBalanceDue = plans.reduce((sum, p) => sum + parseFloat(p.balance_due), 0);
      const totalOverdue = plans.filter(p => p.days_overdue > 0).length;
      const totalLateFees = plans.reduce((sum, p) => sum + parseFloat(p.late_fee_applied), 0);
      
      console.log(`\n📋 Plans Overview:`);
      console.log(`   Total Plans: ${totalPlans}`);
      console.log(`   Active Plans: ${activePlans}`);
      console.log(`   Completed Plans: ${completedPlans}`);
      console.log(`   Defaulted Plans: ${defaultedPlans}`);
      console.log(`   Cancelled Plans: ${cancelledPlans}`);
      
      console.log(`\n💰 Financial Overview:`);
      console.log(`   Total Amount Financed: $${totalAmountFinanced.toFixed(2)}`);
      console.log(`   Total Paid: $${totalPaid.toFixed(2)}`);
      console.log(`   Total Balance Due: $${totalBalanceDue.toFixed(2)}`);
      console.log(`   Collection Rate: ${totalAmountFinanced > 0 ? ((totalPaid / totalAmountFinanced) * 100).toFixed(2) : 0}%`);
      
      console.log(`\n⚠️  Late Payment Overview:`);
      console.log(`   Plans with Overdue Payments: ${totalOverdue}`);
      console.log(`   Total Late Fees Applied: $${totalLateFees.toFixed(2)}`);
    }
    
    if (payments && payments.length > 0) {
      const totalPayments = payments.length;
      const paidPayments = payments.filter(p => p.status === 'paid').length;
      const latePayments = payments.filter(p => p.status === 'late').length;
      const pendingPayments = payments.filter(p => p.status === 'pending').length;
      const totalPaymentAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      console.log(`\n💳 Payments Overview:`);
      console.log(`   Total Payments: ${totalPayments}`);
      console.log(`   Paid: ${paidPayments}`);
      console.log(`   Late: ${latePayments}`);
      console.log(`   Pending: ${pendingPayments}`);
      console.log(`   Total Payment Amount: $${totalPaymentAmount.toFixed(2)}`);
    }

    console.log('\n' + '='.repeat(100));
    console.log('✅ Installment check complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    await sql.end();
  }
}

// Run the check
checkInstallments().catch(async (error) => {
  console.error('❌ Check failed:', error);
  await sql.end();
  process.exit(1);
});

