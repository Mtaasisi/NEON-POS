import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cxfeqUnity6qlabuzxzei.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZmVxbXVuaXR5NnFsYWJ1enh6ZWkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMTkzNTQ1NiwiZXhwIjoyMDQ3NTExNDU2fQ.vVCUJGhBlYIW8JOo_7C2oLqcfPMVJaFAsgWaFAQJ0bc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPlan() {
  console.log('🔍 Checking INS-006 plan...\n');
  
  const { data: plan, error } = await supabase
    .from('customer_installment_plans')
    .select('*')
    .eq('plan_number', 'INS-006')
    .single();
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  if (!plan) {
    console.log('❌ Plan INS-006 not found');
    return;
  }
  
  console.log('📋 Plan Details:');
  console.log('   Plan Number:', plan.plan_number);
  console.log('   Status:', plan.status);
  console.log('   Start Date:', plan.start_date);
  console.log('   Next Payment Date:', plan.next_payment_date);
  console.log('   End Date:', plan.end_date);
  console.log('   Frequency:', plan.payment_frequency);
  console.log('   Number of Installments:', plan.number_of_installments);
  console.log('   Installments Paid:', plan.installments_paid);
  console.log('   Total Paid:', plan.total_paid);
  console.log('   Balance Due:', plan.balance_due);
  console.log('   Created:', plan.created_at);
  console.log('   Updated:', plan.updated_at);
  
  // Check payments
  const { data: payments, error: paymentsError } = await supabase
    .from('installment_payments')
    .select('*')
    .eq('installment_plan_id', plan.id)
    .order('installment_number', { ascending: true });
  
  console.log('\n💳 Payments:');
  if (payments && payments.length > 0) {
    payments.forEach(p => {
      console.log(`   #${p.installment_number}: ${p.amount} - ${p.payment_date} (${p.status})`);
    });
  } else {
    console.log('   No payments recorded');
  }
}

checkPlan();
