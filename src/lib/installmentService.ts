import { supabase } from './supabaseClient';
import {
  InstallmentPlan,
  InstallmentPayment,
  CreateInstallmentPlanInput,
  RecordInstallmentPaymentInput,
  UpdateInstallmentPlanInput,
  InstallmentsStats,
  InstallmentSchedule,
  PaymentFrequency
} from '../types/specialOrders';
import { whatsappService } from '../services/whatsappService';

class InstallmentService {
  // Generate unique plan number
  private async generatePlanNumber(): Promise<string> {
    const { data, error } = await supabase
      .from('customer_installment_plans')
      .select('plan_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching last plan number:', error);
      return `INS-${Date.now().toString().slice(-6)}`;
    }

    if (!data || data.length === 0) {
      return 'INS-001';
    }

    const lastNumber = data[0].plan_number;
    const match = lastNumber.match(/INS-(\d+)/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `INS-${nextNumber.toString().padStart(3, '0')}`;
    }

    return `INS-${Date.now().toString().slice(-6)}`;
  }

  // Calculate installment schedule
  private calculateSchedule(
    startDate: string,
    numberOfInstallments: number,
    frequency: PaymentFrequency
  ): { nextPaymentDate: string; endDate: string } {
    const start = new Date(startDate);
    let daysIncrement: number;

    switch (frequency) {
      case 'weekly':
        daysIncrement = 7;
        break;
      case 'bi_weekly':
        daysIncrement = 14;
        break;
      case 'monthly':
        daysIncrement = 30;
        break;
      default:
        daysIncrement = 30;
    }

    const nextPayment = new Date(start);
    nextPayment.setDate(nextPayment.getDate() + daysIncrement);

    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + (daysIncrement * numberOfInstallments));

    return {
      nextPaymentDate: nextPayment.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  // Validate and get valid branch_id from lats_branches
  private async getValidBranchId(branchId?: string): Promise<string | undefined> {
    if (!branchId) {
      console.log('ℹ️ [InstallmentService] No branch_id provided, will use default or NULL');
      return undefined;
    }

    // Check if branch exists in lats_branches
    const { data: branch, error } = await supabase
      .from('lats_branches')
      .select('id')
      .eq('id', branchId)
      .single();

    if (error || !branch) {
      console.warn('⚠️ [InstallmentService] Branch ID not found in lats_branches:', branchId);
      console.log('🔄 [InstallmentService] Attempting to sync branch from store_locations...');
      
      // Try to sync the branch from store_locations to lats_branches
      const { data: storeLocation } = await supabase
        .from('store_locations')
        .select('id, name, is_active, created_at, updated_at')
        .eq('id', branchId)
        .single();

      if (storeLocation) {
        // Insert into lats_branches
        const { data: syncedBranch, error: syncError } = await supabase
          .from('lats_branches')
          .insert({
            id: storeLocation.id,
            name: storeLocation.name,
            is_active: storeLocation.is_active,
            created_at: storeLocation.created_at,
            updated_at: storeLocation.updated_at
          })
          .select('id')
          .single();

        if (syncError) {
          // If insert fails (maybe due to conflict), try to get existing branch
          const { data: existingBranch } = await supabase
            .from('lats_branches')
            .select('id')
            .eq('id', branchId)
            .single();

          if (existingBranch) {
            console.log('✅ [InstallmentService] Branch found after sync attempt');
            return existingBranch.id;
          }

          console.error('❌ [InstallmentService] Failed to sync branch:', syncError);
          // Fallback: get default branch or first active branch
          return await this.getDefaultBranchId();
        }

        console.log('✅ [InstallmentService] Branch synced successfully');
        return syncedBranch.id;
      } else {
        console.warn('⚠️ [InstallmentService] Branch not found in store_locations either');
        return await this.getDefaultBranchId();
      }
    }

    console.log('✅ [InstallmentService] Branch ID validated:', branchId);
    return branch.id;
  }

  // Get default branch ID from lats_branches
  private async getDefaultBranchId(): Promise<string | undefined> {
    // Try to get main branch first
    const { data: mainBranch } = await supabase
      .from('lats_branches')
      .select('id')
      .eq('is_active', true)
      .order('is_main', { ascending: false })
      .limit(1)
      .single();

    if (mainBranch) {
      console.log('✅ [InstallmentService] Using default branch:', mainBranch.id);
      return mainBranch.id;
    }

    // If no main branch, get first active branch
    const { data: firstBranch } = await supabase
      .from('lats_branches')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (firstBranch) {
      console.log('✅ [InstallmentService] Using first active branch:', firstBranch.id);
      return firstBranch.id;
    }

    console.warn('⚠️ [InstallmentService] No active branches found, branch_id will be NULL');
    return undefined;
  }

  // Create installment plan
  async createInstallmentPlan(
    input: CreateInstallmentPlanInput,
    userId: string,
    branchId?: string
  ): Promise<{ success: boolean; plan?: InstallmentPlan; error?: string }> {
    console.log('🏦 [InstallmentService] createInstallmentPlan called');
    console.log('📥 [InstallmentService] Input:', JSON.stringify(input, null, 2));
    console.log('👤 [InstallmentService] User ID:', userId);
    console.log('🏢 [InstallmentService] Branch ID provided:', branchId);
    
    try {
      // Validate and get valid branch_id
      console.log('🔍 [InstallmentService] Validating branch_id...');
      const validBranchId = await this.getValidBranchId(branchId);
      console.log('✅ [InstallmentService] Valid branch_id:', validBranchId);

      console.log('🔢 [InstallmentService] Generating plan number...');
      const planNumber = await this.generatePlanNumber();
      console.log('✅ [InstallmentService] Plan number generated:', planNumber);
      
      const amountFinanced = input.total_amount - input.down_payment;
      const installmentAmount = amountFinanced / input.number_of_installments;
      
      console.log('💰 [InstallmentService] Calculations:');
      console.log('   - Total Amount:', input.total_amount);
      console.log('   - Down Payment:', input.down_payment);
      console.log('   - Amount Financed:', amountFinanced);
      console.log('   - Installment Amount:', installmentAmount);
      console.log('   - Number of Installments:', input.number_of_installments);
      
      const schedule = this.calculateSchedule(
        input.start_date,
        input.number_of_installments,
        input.payment_frequency
      );
      
      console.log('📅 [InstallmentService] Schedule calculated:');
      console.log('   - Start Date:', input.start_date);
      console.log('   - Next Payment Date:', schedule.nextPaymentDate);
      console.log('   - End Date:', schedule.endDate);
      console.log('   - Payment Frequency:', input.payment_frequency);

      // Create plan
      console.log('💾 [InstallmentService] Creating installment plan in database...');
      const planData = {
        plan_number: planNumber,
        customer_id: input.customer_id,
        sale_id: input.sale_id,
        total_amount: input.total_amount,
        down_payment: input.down_payment,
        amount_financed: amountFinanced,
        installment_amount: installmentAmount,
        number_of_installments: input.number_of_installments,
        payment_frequency: input.payment_frequency,
        start_date: input.start_date,
        next_payment_date: schedule.nextPaymentDate,
        end_date: schedule.endDate,
        balance_due: amountFinanced,
        late_fee_amount: input.late_fee_amount || 0,
        notes: input.notes,
        status: 'active',
        created_by: userId,
        branch_id: validBranchId
      };
      
      console.log('📤 [InstallmentService] Plan data to insert:', JSON.stringify(planData, null, 2));
      
      const { data: plan, error: planError } = await supabase
        .from('customer_installment_plans')
        .insert(planData)
        .select()
        .single();

      if (planError) {
        console.error('❌ [InstallmentService] Plan creation error:', planError);
        throw planError;
      }
      
      console.log('✅ [InstallmentService] Plan created successfully:', plan);
      console.log('🔢 [InstallmentService] Plan ID:', plan.id);

      // Record down payment if any
      if (input.down_payment > 0) {
        console.log('💵 [InstallmentService] Recording down payment:', input.down_payment);
        
        const downPaymentData = {
          installment_plan_id: plan.id,
          customer_id: input.customer_id,
          installment_number: 0,
          amount: input.down_payment,
          payment_method: input.payment_method,
          due_date: input.start_date,
          account_id: input.account_id,
          reference_number: `${planNumber}-DOWN`,
          notes: 'Down payment',
          status: 'paid',
          created_by: userId
        };
        
        console.log('📤 [InstallmentService] Down payment data:', JSON.stringify(downPaymentData, null, 2));
        
        const { error: paymentError } = await supabase
          .from('installment_payments')
          .insert(downPaymentData);

        if (paymentError) {
          console.error('❌ [InstallmentService] Error recording down payment:', paymentError);
        } else {
          console.log('✅ [InstallmentService] Down payment recorded successfully');
        }

        // Update finance account and create transaction
        console.log('🏦 [InstallmentService] Updating finance account:', input.account_id);
        await this.updateFinanceAccount(
          input.account_id, 
          input.down_payment,
          `Down payment for installment plan ${planNumber}`,
          `${planNumber}-DOWN`,
          'installment_plan',
          plan.id,
          branchId
        );
        console.log('✅ [InstallmentService] Finance account updated and transaction recorded');
      } else {
        console.log('ℹ️ [InstallmentService] No down payment to record');
      }

      // Send plan created notification
      console.log('📨 [InstallmentService] Sending plan created notification...');
      await this.sendPlanCreatedNotification(plan.id, userId);
      console.log('✅ [InstallmentService] Notification sent');

      console.log('🎉 [InstallmentService] Installment plan creation completed successfully!');
      return { success: true, plan: plan as InstallmentPlan };
    } catch (error: any) {
      console.error('❌ [InstallmentService] Error creating installment plan:', error);
      console.error('❌ [InstallmentService] Error message:', error.message);
      console.error('❌ [InstallmentService] Error stack:', error.stack);
      return { success: false, error: error.message };
    }
  }

  // Record installment payment
  async recordPayment(
    input: RecordInstallmentPaymentInput,
    userId: string
  ): Promise<{ success: boolean; payment?: InstallmentPayment; error?: string }> {
    try {
      console.log('💳 [Installment Payment] Starting payment recording...', { input, userId });
      
      // Get plan details
      const plan = await this.getInstallmentPlanById(input.installment_plan_id);
      if (!plan) {
        console.error('❌ [Installment Payment] Plan not found:', input.installment_plan_id);
        return { success: false, error: 'Installment plan not found' };
      }

      console.log('📋 [Installment Payment] Plan details:', {
        planId: plan.id,
        planNumber: plan.plan_number,
        installmentsPaid: plan.installments_paid,
        totalInstallments: plan.number_of_installments,
        totalPaid: plan.total_paid,
        balanceDue: plan.balance_due,
        status: plan.status
      });

      // Validate plan status
      if (plan.status === 'completed') {
        console.error('❌ [Installment Payment] Plan is already completed');
        return { success: false, error: 'This installment plan is already completed. No further payments can be recorded.' };
      }

      if (plan.status === 'cancelled') {
        console.error('❌ [Installment Payment] Plan is cancelled');
        return { success: false, error: 'This installment plan has been cancelled. Payments cannot be recorded.' };
      }

      // Validate payment amount
      const balanceDue = Number(plan.balance_due || 0);
      const paymentAmount = Number(input.amount || 0);
      
      if (paymentAmount <= 0) {
        console.error('❌ [Installment Payment] Invalid payment amount:', paymentAmount);
        return { success: false, error: 'Payment amount must be greater than zero.' };
      }

      if (paymentAmount > balanceDue) {
        console.error('❌ [Installment Payment] Payment amount exceeds balance:', { paymentAmount, balanceDue });
        return { success: false, error: `Payment amount (${this.formatCurrency(paymentAmount)}) cannot exceed the remaining balance (${this.formatCurrency(balanceDue)}).` };
      }

      // Get existing payments to determine the next installment number
      const { data: existingPayments, error: paymentsError } = await supabase
        .from('installment_payments')
        .select('installment_number')
        .eq('installment_plan_id', input.installment_plan_id)
        .eq('status', 'paid');

      if (paymentsError) {
        console.error('❌ [Installment Payment] Error fetching existing payments:', paymentsError);
        // Continue with fallback calculation
      }

      // Calculate next installment number based on unique paid installments
      const paidInstallmentNumbers = existingPayments 
        ? new Set(existingPayments.map(p => p.installment_number))
        : new Set();
      
      // Find the next unpaid installment number
      let installmentNumber = 1;
      for (let i = 1; i <= plan.number_of_installments; i++) {
        if (!paidInstallmentNumbers.has(i)) {
          installmentNumber = i;
          break;
        }
      }

      // If all installments are paid, check if this is an overpayment
      if (paidInstallmentNumbers.size >= plan.number_of_installments) {
        if (balanceDue > 0) {
          // Allow overpayment if there's still a balance
          installmentNumber = plan.number_of_installments;
          console.log('⚠️ [Installment Payment] All installments paid, but balance remains. Recording as final payment.');
        } else {
          console.error('❌ [Installment Payment] All installments paid and balance is zero');
          return { success: false, error: 'All installments have been paid and the balance is zero. This plan is complete.' };
        }
      }

      const dueDate = plan.next_payment_date;

      console.log('💰 [Installment Payment] Recording payment...', {
        installmentNumber,
        amount: input.amount,
        paymentMethod: input.payment_method,
        accountId: input.account_id
      });

      // Record payment
      const { data: payment, error: paymentError } = await supabase
        .from('installment_payments')
        .insert({
          installment_plan_id: input.installment_plan_id,
          customer_id: input.customer_id,
          installment_number: installmentNumber,
          amount: input.amount,
          payment_method: input.payment_method,
          due_date: dueDate,
          account_id: input.account_id,
          reference_number: input.reference_number,
          notes: input.notes,
          status: 'paid',
          created_by: userId
        })
        .select()
        .single();

      if (paymentError) {
        console.error('❌ [Installment Payment] Error inserting payment:', paymentError);
        throw paymentError;
      }
      
      console.log('✅ [Installment Payment] Payment recorded:', payment);

      // Get plan details for transaction metadata
      const planForTransaction = await this.getInstallmentPlanById(input.installment_plan_id);
      
      // Update finance account and create transaction
      console.log('💼 [Installment Payment] Updating finance account...');
      await this.updateFinanceAccount(
        input.account_id, 
        input.amount,
        `Installment payment #${installmentNumber} for plan ${planForTransaction?.plan_number || 'N/A'}`,
        input.reference_number || `INS-PAY-${Date.now().toString().slice(-8)}`,
        'installment_payment',
        payment.id,
        planForTransaction?.branch_id
      );

      // Calculate next payment date
      const schedule = this.calculateSchedule(
        dueDate,
        1,
        plan.payment_frequency
      );

      console.log('📅 [Installment Payment] New payment schedule:', {
        oldNextPaymentDate: plan.next_payment_date,
        newNextPaymentDate: schedule.nextPaymentDate
      });

      // Check if plan will be completed after this payment
      // Get updated plan to check actual installments_paid after trigger
      const updatedPlan = await this.getInstallmentPlanById(input.installment_plan_id);
      const willBeCompleted = updatedPlan && (
        (paidInstallmentNumbers.size + 1 >= plan.number_of_installments) ||
        (Number(updatedPlan.balance_due || 0) <= 0)
      );
      
      // Update next payment date only (installments_paid, total_paid, balance_due are auto-updated by DB trigger)
      const isCompleted = willBeCompleted || false;
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (isCompleted) {
        // When plan is completed, set next_payment_date to end_date (cannot be null due to NOT NULL constraint)
        // Also set completion_date and status
        updateData.next_payment_date = plan.end_date;
        updateData.completion_date = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
        updateData.status = 'completed';
      } else {
        // When plan is not completed, set next payment date to calculated schedule
        updateData.next_payment_date = schedule.nextPaymentDate;
      }
      
      console.log('🔄 [Installment Payment] Updating plan:', updateData);
      console.log('ℹ️  [Installment Payment] Note: total_paid, balance_due, and installments_paid are auto-updated by database trigger');
      
      const { error: updateError } = await supabase
        .from('customer_installment_plans')
        .update(updateData)
        .eq('id', input.installment_plan_id);

      if (updateError) {
        console.error('❌ [Installment Payment] Error updating plan:', updateError);
        throw updateError;
      }
      
      console.log('✅ [Installment Payment] Plan next payment date updated successfully!');
      console.log('✅ [Installment Payment] Database trigger will automatically update payment tracking fields');

      // Send payment received notification
      console.log('📧 [Installment Payment] Sending notification...');
      await this.sendPaymentReceivedNotification(
        input.installment_plan_id,
        input.amount,
        userId
      );

      console.log('🎉 [Installment Payment] Payment process completed successfully!');
      return { success: true, payment: payment as InstallmentPayment };
    } catch (error: any) {
      console.error('❌ [Installment Payment] Error recording installment payment:', error);
      console.error('❌ [Installment Payment] Error details:', error.message);
      console.error('❌ [Installment Payment] Error stack:', error.stack);
      return { success: false, error: error.message };
    }
  }

  // Get all installment plans
  async getAllInstallmentPlans(branchId?: string): Promise<InstallmentPlan[]> {
    try {
      // First, fetch plans with customer data
      let query = supabase
        .from('customer_installment_plans')
        .select(`
          *,
          customer:customers!customer_id(id, name, phone, email)
        `)
        .order('created_at', { ascending: false });

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Get unique sale IDs from plans
      const saleIds = [...new Set((data || [])
        .map(plan => plan.sale_id)
        .filter(Boolean))];

      // Fetch sales data separately if there are any sale IDs
      let salesMap = new Map();
      if (saleIds.length > 0) {
        const { data: sales, error: salesError } = await supabase
          .from('lats_sales')
          .select('id, sale_number, total_amount')
          .in('id', saleIds);

        if (!salesError && sales) {
          salesMap = new Map(sales.map(sale => [sale.id, sale]));
        }
      }
      
      // Transform data and merge sale information
      const plans = (data || []).map(plan => ({
        ...plan,
        total_amount: Number(plan.total_amount || 0),
        down_payment: Number(plan.down_payment || 0),
        amount_financed: Number(plan.amount_financed || 0),
        total_paid: Number(plan.total_paid || 0),
        balance_due: Number(plan.balance_due || 0),
        installment_amount: Number(plan.installment_amount || 0),
        number_of_installments: Number(plan.number_of_installments || 0),
        installments_paid: Number(plan.installments_paid || 0),
        late_fee_amount: Number(plan.late_fee_amount || 0),
        late_fee_applied: Number(plan.late_fee_applied || 0),
        days_overdue: Number(plan.days_overdue || 0),
        reminder_count: Number(plan.reminder_count || 0),
        sale: plan.sale_id ? salesMap.get(plan.sale_id) || null : null,
      })) as InstallmentPlan[];
      
      return plans;
    } catch (error) {
      console.error('Error fetching installment plans:', error);
      return [];
    }
  }

  // Get installment plan by ID
  async getInstallmentPlanById(planId: string): Promise<InstallmentPlan | null> {
    try {
      const { data, error } = await supabase
        .from('customer_installment_plans')
        .select(`
          *,
          customer:customers!customer_id(id, name, phone, email)
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;
      
      // Fetch sale data separately if sale_id exists
      let sale = null;
      if (data.sale_id) {
        const { data: saleData } = await supabase
          .from('lats_sales')
          .select('id, sale_number, total_amount')
          .eq('id', data.sale_id)
          .single();
        sale = saleData || null;
      }
      
      // Fetch payments separately for this plan
      const { data: payments } = await supabase
        .from('installment_payments')
        .select('*')
        .eq('installment_plan_id', planId)
        .order('created_at', { ascending: true }); // Use created_at instead of installment_number for now
      
      // Transform numeric fields
      const plan = {
        ...data,
        total_amount: Number(data.total_amount || 0),
        down_payment: Number(data.down_payment || 0),
        amount_financed: Number(data.amount_financed || 0),
        total_paid: Number(data.total_paid || 0),
        balance_due: Number(data.balance_due || 0),
        installment_amount: Number(data.installment_amount || 0),
        number_of_installments: Number(data.number_of_installments || 0),
        installments_paid: Number(data.installments_paid || 0),
        late_fee_amount: Number(data.late_fee_amount || 0),
        late_fee_applied: Number(data.late_fee_applied || 0),
        days_overdue: Number(data.days_overdue || 0),
        reminder_count: Number(data.reminder_count || 0),
        sale: sale,
        payments: payments || []
      } as InstallmentPlan;
      
      return plan;
    } catch (error) {
      console.error('Error fetching installment plan:', error);
      return null;
    }
  }

  // Get customer's installment plans
  async getCustomerInstallmentPlans(customerId: string): Promise<InstallmentPlan[]> {
    try {
      const { data, error } = await supabase
        .from('customer_installment_plans')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as InstallmentPlan[];
    } catch (error) {
      console.error('Error fetching customer installment plans:', error);
      return [];
    }
  }

  // Get payment schedule for a plan
  async getPaymentSchedule(planId: string): Promise<InstallmentSchedule[]> {
    try {
      const plan = await this.getInstallmentPlanById(planId);
      if (!plan) return [];

      const schedule: InstallmentSchedule[] = [];
      const startDate = new Date(plan.start_date);
      let daysIncrement: number;

      switch (plan.payment_frequency) {
        case 'weekly':
          daysIncrement = 7;
          break;
        case 'bi_weekly':
          daysIncrement = 14;
          break;
        case 'monthly':
          daysIncrement = 30;
          break;
        default:
          daysIncrement = 30;
      }

      for (let i = 1; i <= plan.number_of_installments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (daysIncrement * i));

        const payment = plan.payments?.find(p => p.installment_number === i);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let status: 'pending' | 'paid' | 'overdue' = 'pending';
        if (payment?.status === 'paid') {
          status = 'paid';
        } else if (dueDate < today) {
          status = 'overdue';
        }

        schedule.push({
          installment_number: i,
          due_date: dueDate.toISOString().split('T')[0],
          amount: plan.installment_amount,
          status,
          paid_date: payment?.payment_date,
          paid_amount: payment?.amount
        });
      }

      return schedule;
    } catch (error) {
      console.error('Error getting payment schedule:', error);
      return [];
    }
  }

  // Get statistics
  async getStatistics(branchId?: string): Promise<InstallmentsStats> {
    try {
      let query = supabase
        .from('customer_installment_plans')
        .select('*');

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const plans = data || [];
      const today = new Date();
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const monthFromNow = new Date(today);
      monthFromNow.setDate(monthFromNow.getDate() + 30);

      const stats: InstallmentsStats = {
        total: plans.length,
        active: plans.filter(p => p.status === 'active').length,
        completed: plans.filter(p => p.status === 'completed').length,
        defaulted: plans.filter(p => p.status === 'defaulted').length,
        cancelled: plans.filter(p => p.status === 'cancelled').length,
        total_value: plans.reduce((sum, p) => sum + Number(p.total_amount || 0), 0),
        total_paid: plans.reduce((sum, p) => sum + Number(p.total_paid || 0), 0),
        total_balance_due: plans.reduce((sum, p) => sum + Number(p.balance_due || 0), 0),
        overdue_count: plans.filter(p => {
          const nextPayment = new Date(p.next_payment_date);
          return p.status === 'active' && nextPayment < today;
        }).length,
        due_this_week: plans.filter(p => {
          const nextPayment = new Date(p.next_payment_date);
          return p.status === 'active' && nextPayment >= today && nextPayment <= weekFromNow;
        }).length,
        due_this_month: plans.filter(p => {
          const nextPayment = new Date(p.next_payment_date);
          return p.status === 'active' && nextPayment >= today && nextPayment <= monthFromNow;
        }).length
      };

      return stats;
    } catch (error) {
      console.error('Error calculating statistics:', error);
      return {
        total: 0,
        active: 0,
        completed: 0,
        defaulted: 0,
        cancelled: 0,
        total_value: 0,
        total_paid: 0,
        total_balance_due: 0,
        overdue_count: 0,
        due_this_week: 0,
        due_this_month: 0
      };
    }
  }

  // Send payment reminders
  async sendPaymentReminder(planId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = await this.getInstallmentPlanById(planId);
      if (!plan || !plan.customer) {
        return { success: false, error: 'Plan or customer not found' };
      }

      const daysUntilDue = Math.ceil(
        (new Date(plan.next_payment_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      const message = `📅 Payment Reminder\n\nHi ${plan.customer.name},\n\nYour installment payment of ${this.formatCurrency(plan.installment_amount)} is due on ${this.formatDate(plan.next_payment_date)} (${daysUntilDue} days).\n\nPlan: ${plan.plan_number}\nCurrent Balance: ${this.formatCurrency(plan.balance_due)}\nInstallments Paid: ${plan.installments_paid}/${plan.number_of_installments}\n\nPlease make your payment on time. Thank you!`;

      // Send WhatsApp/SMS
      if (plan.customer.phone) {
        await whatsappService.sendWhatsAppMessage(
          plan.customer.phone,
          message,
          plan.customer_id
        );
      }

      // Update reminder count
      await supabase
        .from('customer_installment_plans')
        .update({
          last_reminder_sent: new Date().toISOString(),
          reminder_count: plan.reminder_count + 1
        })
        .eq('id', planId);

      return { success: true };
    } catch (error: any) {
      console.error('Error sending payment reminder:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancel installment plan
  async cancelPlan(planId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('customer_installment_plans')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling plan:', error);
      return { success: false, error: error.message };
    }
  }

  // Update installment plan
  async updateInstallmentPlan(
    planId: string,
    input: UpdateInstallmentPlanInput
  ): Promise<{ success: boolean; plan?: InstallmentPlan; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('customer_installment_plans')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId)
        .select()
        .single();

      if (error) throw error;

      const plan = await this.getInstallmentPlanById(planId);
      return { success: true, plan: plan || undefined };
    } catch (error: any) {
      console.error('Error updating installment plan:', error);
      return { success: false, error: error.message };
    }
  }

  // ================================================
  // PRIVATE HELPER METHODS
  // ================================================

  private async updateFinanceAccount(
    accountId: string, 
    amount: number, 
    description?: string,
    referenceNumber?: string,
    relatedEntityType?: string,
    relatedEntityId?: string,
    branchId?: string
  ): Promise<void> {
    try {
      const { data: account, error: fetchError } = await supabase
        .from('finance_accounts')
        .select('balance, branch_id')
        .eq('id', accountId)
        .single();

      if (fetchError || !account) {
        console.error('Error fetching finance account:', fetchError);
        return;
      }

      const balanceBefore = Number(account.balance);
      const newBalance = balanceBefore + amount;
      // Validate branch_id before using it
      const accountBranchId = await this.getValidBranchId(branchId || account.branch_id);

      // Update finance account balance
      const { error: updateError } = await supabase
        .from('finance_accounts')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('Error updating finance account:', updateError);
        return;
      }

      // Create account transaction record
      const { error: transactionError } = await supabase
        .from('account_transactions')
        .insert({
          account_id: accountId,
          transaction_type: amount > 0 ? 'income' : 'expense',
          amount: Math.abs(amount),
          balance_before: balanceBefore,
          balance_after: newBalance,
          description: description || `Installment payment: ${amount > 0 ? 'Received' : 'Paid'} ${Math.abs(amount)}`,
          reference_number: referenceNumber || `INS-${Date.now().toString().slice(-8)}`,
          related_entity_type: relatedEntityType || 'installment_payment',
          related_entity_id: relatedEntityId,
          branch_id: accountBranchId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (transactionError) {
        console.error('Error creating account transaction:', transactionError);
      } else {
        console.log('✅ Account transaction recorded successfully');
      }
    } catch (error) {
      console.error('Error in updateFinanceAccount:', error);
    }
  }

  // ================================================
  // NOTIFICATION METHODS
  // ================================================

  private async sendPlanCreatedNotification(
    planId: string,
    userId: string
  ): Promise<void> {
    try {
      const plan = await this.getInstallmentPlanById(planId);
      if (!plan || !plan.customer) return;

      const message = `✅ Installment Plan Created!\n\nPlan: ${plan.plan_number}\nTotal Amount: ${this.formatCurrency(plan.total_amount)}\nDown Payment: ${this.formatCurrency(plan.down_payment)}\nAmount to Finance: ${this.formatCurrency(plan.amount_financed)}\n\nPayment Schedule:\n- ${this.formatCurrency(plan.installment_amount)} per ${plan.payment_frequency === 'monthly' ? 'month' : plan.payment_frequency === 'weekly' ? 'week' : 'payment'}\n- ${plan.number_of_installments} installments\n- Next payment: ${this.formatDate(plan.next_payment_date)}\n\nThank you for choosing our installment plan!`;

      if (plan.customer.phone) {
        await whatsappService.sendWhatsAppMessage(
          plan.customer.phone,
          message,
          plan.customer_id
        );
      }

      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'payment',
          category: 'payment',
          title: 'Installment Plan Created',
          message: `Plan ${plan.plan_number} for ${plan.customer.name}`,
          priority: 'normal',
          status: 'unread',
          metadata: { planId: plan.id, planNumber: plan.plan_number }
        });
      } catch (error) {
        console.error('Error creating notification:', error);
      }
    } catch (error) {
      console.error('Error sending plan created notification:', error);
    }
  }

  private async sendPaymentReceivedNotification(
    planId: string,
    amount: number,
    userId: string
  ): Promise<void> {
    try {
      const plan = await this.getInstallmentPlanById(planId);
      if (!plan || !plan.customer) return;

      const message = `✅ Payment Received!\n\nPlan: ${plan.plan_number}\nAmount Paid: ${this.formatCurrency(amount)}\nRemaining Balance: ${this.formatCurrency(plan.balance_due)}\n\nInstallments Paid: ${plan.installments_paid}/${plan.number_of_installments}\nNext Payment Due: ${this.formatDate(plan.next_payment_date)}\n\nThank you for your payment!`;

      if (plan.customer.phone) {
        await whatsappService.sendWhatsAppMessage(
          plan.customer.phone,
          message,
          plan.customer_id
        );
      }

      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'payment',
          category: 'payment',
          title: 'Installment Payment Received',
          message: `${this.formatCurrency(amount)} received for plan ${plan.plan_number}`,
          priority: 'normal',
          status: 'unread',
          metadata: { planId: plan.id, amount }
        });
      } catch (error) {
        console.error('Error creating notification:', error);
      }
    } catch (error) {
      console.error('Error sending payment received notification:', error);
    }
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

export const installmentService = new InstallmentService();

