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
      
      // If down_payment exists, it counts as payment #1, so we have one less remaining installment
      const numberOfRemainingInstallments = input.down_payment > 0 
        ? input.number_of_installments - 1 
        : input.number_of_installments;
      
      // Calculate balanced installment amounts
      // The last installment will be the remainder to ensure perfect balance
      let installmentAmount = 0;
      let balancedInstallmentAmounts: number[] = [];
      
      if (numberOfRemainingInstallments > 0) {
        const baseAmount = amountFinanced / numberOfRemainingInstallments;
        
        // Calculate all installments except the last one as rounded amounts
        let totalCalculated = 0;
        for (let i = 0; i < numberOfRemainingInstallments - 1; i++) {
          const rounded = Math.round(baseAmount * 100) / 100;
          balancedInstallmentAmounts.push(rounded);
          totalCalculated += rounded;
        }
        
        // Last installment is the remainder to ensure perfect balance
        const lastAmount = Math.round((amountFinanced - totalCalculated) * 100) / 100;
        balancedInstallmentAmounts.push(lastAmount);
        
        // Use the first installment amount as the standard installment amount
        installmentAmount = balancedInstallmentAmounts[0] || baseAmount;
      }
      
      // Validate payment balance: Down Payment + (All Installments) must equal Total Amount
      const totalInstallmentAmounts = balancedInstallmentAmounts.reduce((sum, amt) => sum + amt, 0);
      const totalPayments = input.down_payment + totalInstallmentAmounts;
      const balanceDifference = Math.abs(totalPayments - input.total_amount);
      
      // Allow tiny rounding differences (less than 0.001) due to floating point precision
      if (balanceDifference > 0.001) {
        const errorMessage = `Payment amounts don't balance! Total: ${input.total_amount}, Down Payment: ${input.down_payment}, Installments Total: ${totalInstallmentAmounts}, Total Payments: ${totalPayments}, Difference: ${balanceDifference}`;
        console.error('❌ [InstallmentService] Payment balance mismatch:', {
          totalAmount: input.total_amount,
          downPayment: input.down_payment,
          totalInstallments: totalInstallmentAmounts,
          totalPayments,
          difference: balanceDifference,
          numberOfRemainingInstallments,
          balancedInstallmentAmounts
        });
        return {
          success: false,
          error: errorMessage
        };
      }
      
      console.log('💰 [InstallmentService] Calculations:');
      console.log('   - Total Amount:', input.total_amount);
      console.log('   - Down Payment:', input.down_payment);
      console.log('   - Amount Financed:', amountFinanced);
      console.log('   - Number of Total Installments:', input.number_of_installments);
      console.log('   - Number of Remaining Installments:', numberOfRemainingInstallments);
      console.log('   - Base Installment Amount:', amountFinanced / numberOfRemainingInstallments);
      console.log('   - Balanced Installment Amounts:', balancedInstallmentAmounts);
      console.log('   - Installment Amount (stored):', installmentAmount);
      console.log('   - Total Installment Amounts:', totalInstallmentAmounts);
      console.log('   - Total Payments:', totalPayments);
      console.log('   - Balance Difference:', balanceDifference);
      console.log('   - Payment Balance Check: ✅ PASSED');
      
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

      // Record down payment if any (as installment #1)
      if (input.down_payment > 0) {
        console.log('💵 [InstallmentService] Recording down payment as installment #1:', input.down_payment);
        
        // Calculate plan start date: if there's a down payment, it's due today (plan creation date)
        // The start_date in input might be the next payment date, so we calculate backwards
        // or use the plan's created_at date for the down payment due date
        const planStartDate = new Date(plan.created_at || new Date().toISOString()).toISOString().split('T')[0];
        
        const downPaymentData = {
          installment_plan_id: plan.id,
          customer_id: input.customer_id,
          installment_number: 1, // Down payment is payment #1
          amount: input.down_payment,
          payment_method: input.payment_method,
          due_date: planStartDate, // Down payment is due on plan start date (creation date)
          account_id: input.account_id,
          reference_number: `${planNumber}-DOWN`,
          notes: 'Down payment (First Payment)',
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
      console.error('❌ [InstallmentService] Error Details:', {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        name: error?.name,
        hint: error?.hint,
        details: error?.details,
        input: {
          customerId: input.customer_id,
          totalAmount: input.total_amount,
          numberOfInstallments: input.number_of_installments,
          downPayment: input.down_payment
        }
      });

      // Categorize errors for better error messages
      let errorMessage = 'Failed to create installment plan.';
      
      // Network errors
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('timeout') ||
          error?.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error: Unable to connect to the database. Please check your internet connection and try again.';
      }
      // Database constraint errors
      else if (error?.code === '23505') {
        errorMessage = `Duplicate entry: ${error?.hint || 'An installment plan with these details already exists.'}`;
      }
      // Not null constraint errors
      else if (error?.code === '23502') {
        errorMessage = `Validation error: ${error?.hint || 'A required field is missing.'}`;
      }
      // Foreign key constraint errors
      else if (error?.code === '23503') {
        errorMessage = `Reference error: ${error?.hint || 'Invalid customer or sale reference.'}`;
      }
      // Check constraint errors
      else if (error?.code === '23514') {
        errorMessage = `Validation error: ${error?.hint || 'Invalid data provided.'}`;
      }
      // Permission errors
      else if (error?.code === '42501' || error?.message?.includes('permission denied')) {
        errorMessage = 'Permission denied: You do not have permission to create installment plans.';
      }
      // Generic database errors
      else if (error?.code?.startsWith('23')) {
        errorMessage = `Database error: ${error?.message || 'Invalid data provided.'}`;
      }
      // Supabase-specific errors
      else if (error?.message) {
        errorMessage = error.message;
      }

      // Log stack trace in development
      if (import.meta.env.MODE === 'development') {
        console.error('❌ [InstallmentService] Error stack:', error?.stack);
        console.group('🔍 [InstallmentService] Detailed Error Information');
        console.error('Error Type:', error?.constructor?.name || 'Unknown');
        console.error('Full Error Object:', error);
        console.groupEnd();
      }

      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  // Record installment payment
  async recordPayment(
    input: RecordInstallmentPaymentInput,
    userId: string
  ): Promise<{ success: boolean; payment?: InstallmentPayment; error?: string; planCompleted?: boolean }> {
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

      // Check if there are unpaid installments
      // Exclude down payment (installment_number 0) to match database logic
      const paidInstallmentsExcludingDownPayment = new Set(
        existingPayments
          ? existingPayments
              .filter(p => p.installment_number > 0)
              .map(p => p.installment_number)
          : []
      );
      const hasUnpaidInstallments = paidInstallmentsExcludingDownPayment.size < plan.number_of_installments;

      // Validate plan status - allow payments if there are unpaid installments
      if (plan.status === 'cancelled') {
        console.error('❌ [Installment Payment] Plan is cancelled');
        return { success: false, error: 'This installment plan has been cancelled. Payments cannot be recorded.' };
      }

      // If status is 'completed' but there are unpaid installments, allow the payment
      // This handles cases where the status was incorrectly set to completed
      if (plan.status === 'completed' && !hasUnpaidInstallments) {
        const balanceDue = Number(plan.balance_due || 0);
        if (balanceDue <= 0) {
          console.error('❌ [Installment Payment] Plan is already completed with no balance');
          return { success: false, error: 'This installment plan is already completed. No further payments can be recorded.' };
        }
        // If there's a balance but status is completed, allow payment (data inconsistency fix)
        console.warn('⚠️ [Installment Payment] Plan status is completed but balance exists. Allowing payment to fix inconsistency.');
      }

      // Validate payment amount
      const balanceDue = Number(plan.balance_due || 0);
      const paymentAmount = Number(input.amount || 0);
      
      if (paymentAmount <= 0) {
        console.error('❌ [Installment Payment] Invalid payment amount:', paymentAmount);
        return { success: false, error: 'Payment amount must be greater than zero.' };
      }

      // If there are unpaid installments, allow payment even if balance_due is 0 or negative
      // This fixes data inconsistency issues where balance_due is incorrectly calculated
      if (hasUnpaidInstallments && balanceDue <= 0) {
        console.warn('⚠️ [Installment Payment] Balance is 0 or negative but unpaid installments exist. Allowing payment to fix data inconsistency:', {
          balanceDue,
          unpaidInstallments: plan.number_of_installments - paidInstallmentsExcludingDownPayment.size,
          paymentAmount
        });
        // Skip balance validation - the database trigger will recalculate balance_due after payment
      } else if (!hasUnpaidInstallments && paymentAmount > balanceDue && balanceDue > 0) {
        // Only validate balance if all installments are paid and there's a positive balance
        console.error('❌ [Installment Payment] Payment amount exceeds balance:', { paymentAmount, balanceDue });
        return { success: false, error: `Payment amount (${this.formatCurrency(paymentAmount)}) cannot exceed the remaining balance (${this.formatCurrency(balanceDue)}).` };
      }

      // If all installments are paid, check if this is an overpayment
      if (!hasUnpaidInstallments) {
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
      
      // Calculate how many unique paid installments we'll have after this payment
      // Add the current installment number to the set (excluding down payment)
      const updatedPaidInstallmentNumbers = new Set(
        existingPayments
          ? existingPayments
              .filter(p => p.installment_number > 0)
              .map(p => p.installment_number)
          : []
      );
      updatedPaidInstallmentNumbers.add(installmentNumber);
      
      // Plan is completed only if:
      // 1. All installments are paid (updatedPaidInstallmentNumbers.size >= total installments, excluding down payment)
      // 2. AND balance_due is 0 or negative
      // This prevents marking as completed when there are still unpaid installments
      const allInstallmentsPaid = updatedPaidInstallmentNumbers.size >= plan.number_of_installments;
      const balanceIsZero = updatedPlan && Number(updatedPlan.balance_due || 0) <= 0;
      const willBeCompleted = allInstallmentsPaid && balanceIsZero;
      
      // Double check: ensure all installments from 1 to number_of_installments are paid
      let trulyAllPaid = true;
      for (let i = 1; i <= plan.number_of_installments; i++) {
        if (!updatedPaidInstallmentNumbers.has(i)) {
          trulyAllPaid = false;
          break;
        }
      }
      
      const isCompleted = willBeCompleted && trulyAllPaid;
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
        
        // Always reset to active if not truly completed
        // This fixes data inconsistency issues where status was incorrectly set to completed
        if (!isCompleted) {
          // Check if all installments are truly paid by verifying with updated plan
          const finalCheck = updatedPlan && 
            Number(updatedPlan.installments_paid || 0) >= plan.number_of_installments &&
            Number(updatedPlan.balance_due || 0) <= 0;
          
          if (!finalCheck && plan.status === 'completed') {
            updateData.status = 'active';
            updateData.completion_date = null;
            console.log('🔄 [Installment Payment] Resetting status from completed to active - not all installments paid');
          }
        }
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
      
      // Get updated plan to check if it was completed
      const finalPlan = await this.getInstallmentPlanById(input.installment_plan_id);
      const wasCompleted = finalPlan?.status === 'completed';
      
      // If plan was completed, send completion notification with PDF receipt
      // Use setTimeout to avoid rate limiting (wait 6 seconds after payment notification)
      if (wasCompleted && finalPlan) {
        console.log('🎉 [Installment Payment] Plan completed! Will send completion notification with PDF receipt in 6 seconds...');
        // Don't await - let it run in background to avoid blocking payment response
        setTimeout(async () => {
          try {
            await this.sendCompletionNotificationWithReceipt(finalPlan, userId);
          } catch (error) {
            console.error('⚠️ [Installment Completion] Error sending completion notification:', error);
          }
        }, 6000); // Wait 6 seconds to avoid rate limiting (API allows 1 message per 5 seconds)
      }
      
      return { 
        success: true, 
        payment: payment as InstallmentPayment,
        planCompleted: wasCompleted || false
      };
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
      if (!plan || !plan.customer) {
        console.warn('⚠️ [Installment Payment] Cannot send notification: Plan or customer not found');
        return;
      }

      // Create in-app notification
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
        console.error('Error creating in-app notification:', error);
      }

      // Send WhatsApp/SMS notification to customer
      if (!plan.customer.phone) {
        console.warn('⚠️ [Installment Payment] Customer has no phone number, skipping WhatsApp notification');
        return;
      }

      try {
        // Check if notifications are enabled and auto-send is on
        const { notificationSettingsService } = await import('../services/notificationSettingsService');
        const settings = notificationSettingsService.getSettings();
        
        // Check if any notification method is enabled with auto-send
        const shouldSend = (settings.whatsappEnabled && settings.whatsappAutoSend) || 
                          (settings.smsEnabled && settings.smsAutoSend);
        
        if (!shouldSend) {
          console.log('ℹ️ [Installment Payment] Auto-send notifications disabled in settings');
          return;
        }

        // Get business info
        let businessName = 'inauzwa';
        let businessPhone = '';
        try {
          const { businessInfoService } = await import('./businessInfoService');
          const businessInfo = await businessInfoService.getBusinessInfo();
          businessName = businessInfo.name || 'inauzwa';
          businessPhone = businessInfo.phone || '';
        } catch (error) {
          console.warn('⚠️ Could not load business info for payment notification, using defaults');
        }

        // Format contact phone numbers properly
        let formattedContact = '';
        if (businessPhone) {
          try {
            const { formatContactForMessage } = await import('../utils/formatPhoneForInvoice');
            formattedContact = formatContactForMessage(businessPhone);
          } catch (error) {
            console.warn('⚠️ Could not format contact, using raw phone:', error);
            formattedContact = businessPhone;
          }
        }

        // Generate payment receipt message
        const paymentMessage = `✅ Payment Received!\n\n` +
          `📋 Plan: ${plan.plan_number}\n` +
          `💰 Amount Paid: ${this.formatCurrency(amount)}\n` +
          `💵 Total Paid: ${this.formatCurrency(plan.total_paid)}\n` +
          `📊 Balance Due: ${this.formatCurrency(plan.balance_due)}\n` +
          `📅 Payment Date: ${new Date().toLocaleDateString()}\n\n` +
          `Thank you for your payment! 🙏\n\n` +
          (formattedContact ? `📞 Contact: ${formattedContact}\n` : '');

        // Use smart notification service (WhatsApp first, SMS fallback)
        const { smartNotificationService } = await import('../services/smartNotificationService');
        
        console.log('📱 [Installment Payment] Sending payment notification to customer...');
        const result = await smartNotificationService.sendNotification(
          plan.customer.phone,
          paymentMessage
        );

        if (result.success) {
          console.log(`✅ [Installment Payment] Notification sent via ${result.method} to ${plan.customer.phone}`);
        } else {
          console.warn(`⚠️ [Installment Payment] Notification failed: ${result.error}`);
        }
      } catch (error) {
        // Don't fail the payment if notification fails
        console.error('⚠️ [Installment Payment] Error sending customer notification:', error);
      }
    } catch (error) {
      console.error('❌ [Installment Payment] Error in payment notification:', error);
    }
  }

  /**
   * Send completion notification with PDF receipt when installment plan is completed
   */
  private async sendCompletionNotificationWithReceipt(
    plan: InstallmentPlan,
    userId: string
  ): Promise<void> {
    try {
      if (!plan.customer || !plan.customer.phone) {
        console.warn('⚠️ [Installment Completion] Cannot send notification: Customer or phone not found');
        return;
      }

      // Check if notifications are enabled
      const { notificationSettingsService } = await import('../services/notificationSettingsService');
      const settings = notificationSettingsService.getSettings();
      
      const shouldSend = (settings.whatsappEnabled && settings.whatsappAutoSend) || 
                        (settings.smsEnabled && settings.smsAutoSend);
      
      if (!shouldSend) {
        console.log('ℹ️ [Installment Completion] Auto-send notifications disabled in settings');
        return;
      }

      // Get business info
      let businessName = 'inauzwa';
      let businessPhone = '';
      let businessLogo = '';
      let businessAddress = '';
      try {
        const { businessInfoService } = await import('./businessInfoService');
        const businessInfo = await businessInfoService.getBusinessInfo();
        businessName = businessInfo.name || 'inauzwa';
        businessPhone = businessInfo.phone || '';
        businessLogo = businessInfo.logo || '';
        businessAddress = businessInfo.address || '';
      } catch (error) {
        console.warn('⚠️ Could not load business info for completion notification, using defaults');
      }

      // Format contact phone numbers properly
      let formattedContact = '';
      if (businessPhone) {
        try {
          const { formatContactForMessage } = await import('../utils/formatPhoneForInvoice');
          formattedContact = formatContactForMessage(businessPhone);
        } catch (error) {
          formattedContact = businessPhone;
        }
      }

      // Generate completion message
      const completionMessage = `🎉 Congratulations! Your installment plan is now complete!\n\n` +
        `📋 Plan: ${plan.plan_number}\n` +
        `💰 Total Amount: ${this.formatCurrency(plan.total_amount)}\n` +
        `✅ Total Paid: ${this.formatCurrency(plan.total_paid)}\n` +
        `📅 Completion Date: ${new Date().toLocaleDateString()}\n\n` +
        `Thank you for completing all payments! 🙏\n\n` +
        `Please find your receipt attached.\n\n` +
        (formattedContact ? `📞 Contact: ${formattedContact}\n` : '');

      // Generate receipt (PDF and PNG)
      try {
        // Generate both PDF and PNG
        const [pdfDataUrl, pngDataUrl] = await Promise.all([
          this.generateInstallmentReceiptPDF(plan, {
            businessName,
            businessPhone: formattedContact,
            businessAddress,
            businessLogo
          }),
          this.generateInstallmentReceiptPNG(plan, {
            businessName,
            businessPhone: formattedContact,
            businessAddress,
            businessLogo
          })
        ]);

        // Send via WhatsApp with receipt attachment (try PNG first, fallback to PDF)
        const { default: whatsappService } = await import('../services/whatsappService');
        
        // Retry logic for rate limiting
        let result;
        let retries = 3;
        let delay = 6000; // Start with 6 seconds delay
        let usePNG = true; // Try PNG first
        
        while (retries > 0) {
          const mediaUrl = usePNG ? pngDataUrl : pdfDataUrl;
          const messageType = usePNG ? 'image' : 'document';
          const caption = usePNG 
            ? `Receipt for Installment Plan ${plan.plan_number}` 
            : `Receipt for Installment Plan ${plan.plan_number}`;
          
          result = await whatsappService.sendMessage(
            plan.customer.phone,
            completionMessage,
            {
              message_type: messageType,
              media_url: mediaUrl,
              caption: caption
            }
          );

          if (result.success) {
            console.log(`✅ [Installment Completion] ${usePNG ? 'PNG' : 'PDF'} receipt sent via WhatsApp to ${plan.customer.phone}`);
            break;
          }

          // Check if it's a rate limit error
          const isRateLimit = result.error && (
            result.error.includes('429') ||
            result.error.includes('rate limit') ||
            result.error.includes('too many') ||
            result.error.includes('account protection') ||
            result.error.includes('5 seconds')
          );

          if (isRateLimit && retries > 0) {
            retries--;
            console.warn(`⚠️ [Installment Completion] Rate limited. Retrying in ${delay / 1000} seconds... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff: 6s, 12s, 24s
          } else if (usePNG && !isRateLimit) {
            // If PNG fails for non-rate-limit reason, try PDF
            console.warn(`⚠️ [Installment Completion] PNG failed, trying PDF: ${result.error}`);
            usePNG = false;
            retries = 3; // Reset retries for PDF attempt
            delay = 6000;
          } else {
            // Not a rate limit error or out of retries
            break;
          }
        }

        if (!result.success) {
          // If both PNG and PDF fail, try sending text message only
          console.warn(`⚠️ [Installment Completion] Both PNG and PDF failed, sending text message: ${result.error}`);
          const { smartNotificationService } = await import('../services/smartNotificationService');
          await smartNotificationService.sendNotification(plan.customer.phone, completionMessage);
        }
      } catch (error) {
        console.error('⚠️ [Installment Completion] Error generating receipt, sending text message only:', error);
        // Send text message if receipt generation fails
        const { smartNotificationService } = await import('../services/smartNotificationService');
        await smartNotificationService.sendNotification(plan.customer.phone, completionMessage);
      }
    } catch (error) {
      console.error('❌ [Installment Completion] Error sending completion notification:', error);
    }
  }

  /**
   * Generate PDF receipt for completed installment plan
   */
  private async generateInstallmentReceiptPDF(
    plan: InstallmentPlan,
    businessInfo: { businessName: string; businessPhone: string; businessAddress: string; businessLogo?: string }
  ): Promise<string> {
    // Dynamically import jsPDF
    const { default: jsPDF } = await import('jspdf');
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Helper to add text with word wrap
    const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return lines.length * (fontSize * 0.4); // Return height used
    };

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTALLMENT PLAN RECEIPT', margin, yPos);
    yPos += 10;

    // Business Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(businessInfo.businessName, margin, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (businessInfo.businessAddress) {
      doc.text(businessInfo.businessAddress, margin, yPos);
      yPos += 5;
    }
    if (businessInfo.businessPhone) {
      doc.text(`Phone: ${businessInfo.businessPhone}`, margin, yPos);
      yPos += 5;
    }
    yPos += 5;

    // Receipt Details
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Plan Information:', margin, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Plan Number: ${plan.plan_number}`, margin, yPos);
    yPos += 5;
    doc.text(`Customer: ${plan.customer?.name || 'N/A'}`, margin, yPos);
    yPos += 5;
    doc.text(`Phone: ${plan.customer?.phone || 'N/A'}`, margin, yPos);
    yPos += 5;
    doc.text(`Completion Date: ${plan.completion_date ? new Date(plan.completion_date).toLocaleDateString() : new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 8;

    // Payment Summary
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Summary:', margin, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Amount: ${this.formatCurrency(plan.total_amount)}`, margin, yPos);
    yPos += 5;
    doc.text(`Down Payment: ${this.formatCurrency(plan.down_payment || 0)}`, margin, yPos);
    yPos += 5;
    doc.text(`Number of Installments: ${plan.number_of_installments}`, margin, yPos);
    yPos += 5;
    doc.text(`Total Paid: ${this.formatCurrency(plan.total_paid)}`, margin, yPos);
    yPos += 5;
    doc.text(`Balance Due: ${this.formatCurrency(plan.balance_due)}`, margin, yPos);
    yPos += 8;

    // Payment History
    if (plan.payments && plan.payments.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Payment History:', margin, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      plan.payments.forEach((payment, index) => {
        if (yPos > doc.internal.pageSize.getHeight() - 30) {
          doc.addPage();
          yPos = margin;
        }
        
        const paymentDate = payment.payment_date || payment.created_at || '';
        const paymentLabel = payment.installment_number === 0 ? 'Down Payment' : `Installment #${payment.installment_number}`;
        doc.text(`${paymentLabel}: ${this.formatCurrency(payment.amount)} - ${paymentDate ? new Date(paymentDate).toLocaleDateString() : 'N/A'}`, margin + 5, yPos);
        yPos += 5;
      });
      yPos += 5;
    }

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 30;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your business!', margin, yPos);
    yPos += 5;
    doc.text(`Generated on ${new Date().toLocaleString()}`, margin, yPos);

    // Convert to data URL
    return doc.output('dataurlstring');
  }

  /**
   * Generate PNG receipt for completed installment plan
   */
  private async generateInstallmentReceiptPNG(
    plan: InstallmentPlan,
    businessInfo: { businessName: string; businessPhone: string; businessAddress: string; businessLogo?: string }
  ): Promise<string> {
    // Create HTML receipt
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            background: white;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
          }
          .header h1 {
            font-size: 24px;
            color: #10b981;
            margin-bottom: 10px;
          }
          .business-info {
            margin-bottom: 20px;
          }
          .business-info h2 {
            font-size: 18px;
            margin-bottom: 8px;
          }
          .section {
            margin-bottom: 25px;
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 12px;
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 600;
            color: #6b7280;
          }
          .info-value {
            color: #1f2937;
            text-align: right;
          }
          .payment-history {
            margin-top: 15px;
          }
          .payment-item {
            padding: 10px;
            background: white;
            border-radius: 6px;
            margin-bottom: 8px;
            border-left: 4px solid #10b981;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INSTALLMENT PLAN RECEIPT</h1>
        </div>
        
        <div class="business-info">
          <h2>${businessInfo.businessName}</h2>
          ${businessInfo.businessAddress ? `<p>${businessInfo.businessAddress}</p>` : ''}
          ${businessInfo.businessPhone ? `<p>Phone: ${businessInfo.businessPhone}</p>` : ''}
        </div>
        
        <div class="section">
          <div class="section-title">Plan Information</div>
          <div class="info-row">
            <span class="info-label">Plan Number:</span>
            <span class="info-value">${plan.plan_number}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Customer:</span>
            <span class="info-value">${plan.customer?.name || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phone:</span>
            <span class="info-value">${plan.customer?.phone || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Completion Date:</span>
            <span class="info-value">${plan.completion_date ? new Date(plan.completion_date).toLocaleDateString() : new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Payment Summary</div>
          <div class="info-row">
            <span class="info-label">Total Amount:</span>
            <span class="info-value">${this.formatCurrency(plan.total_amount)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Down Payment:</span>
            <span class="info-value">${this.formatCurrency(plan.down_payment || 0)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Number of Installments:</span>
            <span class="info-value">${plan.number_of_installments}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total Paid:</span>
            <span class="info-value">${this.formatCurrency(plan.total_paid)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Balance Due:</span>
            <span class="info-value">${this.formatCurrency(plan.balance_due)}</span>
          </div>
        </div>
        
        ${plan.payments && plan.payments.length > 0 ? `
        <div class="section">
          <div class="section-title">Payment History</div>
          <div class="payment-history">
            ${plan.payments.map(payment => {
              const paymentDate = payment.payment_date || payment.created_at || '';
              const paymentLabel = payment.installment_number === 0 ? 'Down Payment' : `Installment #${payment.installment_number}`;
              return `
                <div class="payment-item">
                  <div class="info-row">
                    <span class="info-label">${paymentLabel}</span>
                    <span class="info-value">${this.formatCurrency(payment.amount)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${paymentDate ? new Date(paymentDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Thank you for your business! 🙏</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    // Create a temporary container and render HTML
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '800px';
    container.innerHTML = receiptHTML;
    document.body.appendChild(container);

    try {
      // Use html2canvas to convert HTML to PNG
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: 800,
        useCORS: true,
        allowTaint: true
      });

      // Convert canvas to data URL
      const pngDataUrl = canvas.toDataURL('image/png', 1.0);
      
      // Clean up
      document.body.removeChild(container);
      
      return pngDataUrl;
    } catch (error) {
      // Clean up on error
      if (container.parentNode) {
        document.body.removeChild(container);
      }
      throw error;
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

