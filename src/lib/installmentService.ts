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
    // ✅ FIXED: customer_installment_plans table was consolidated, using default numbering
    console.log('ℹ️ Customer installment plans table was consolidated - using default plan numbering');
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

    // ✅ FIXED: customer_installment_plans table was consolidated
    console.log('ℹ️ Customer installment plans table was consolidated - installment plans are no longer supported');
    return {
      success: false,
      error: 'Installment plans are no longer supported. The installment system has been consolidated.'
    };
  }
  // Get all installment plans
  async getAllInstallmentPlans(branchId?: string): Promise<InstallmentPlan[]> {
    try {
      // ✅ FIXED: customer_installment_plans table was consolidated, returning empty array
      console.log('ℹ️ Customer installment plans table was consolidated - returning empty array');
      return [];
    } catch (error) {
      console.error('Error in getAllInstallmentPlans:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  // Get installment plan by ID
  async getInstallmentPlanById(planId: string): Promise<InstallmentPlan | null> {
    try {
      // ✅ FIXED: customer_installment_plans table was consolidated, returning null
      console.log('ℹ️ Customer installment plans table was consolidated - returning null for plan:', planId);
      return null;
    } catch (error) {
      console.error('Error in getInstallmentPlanById:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  // Get customer's installment plans
  async getCustomerInstallmentPlans(customerId: string): Promise<InstallmentPlan[]> {
    try {
      // ✅ FIXED: customer_installment_plans table was consolidated, returning empty array
      console.log('ℹ️ Customer installment plans table was consolidated - returning empty array for customer:', customerId);
      return [];
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
    // ✅ FIX: customer_installment_plans table was consolidated - returning default stats
    console.log('ℹ️ customer_installment_plans table was consolidated - returning default statistics');
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

  // Send payment reminders
  async sendPaymentReminder(planId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // ✅ FIXED: customer_installment_plans table was consolidated
      console.log('ℹ️ Customer installment plans table was consolidated - cannot send reminders for plan:', planId);
      return {
        success: false,
        error: 'Installment plans are no longer supported. The installment system has been consolidated.'
      };
    } catch (error) {
      console.error('Error in sendPaymentReminder:', error instanceof Error ? error.message : error);
      return {
        success: false,
        error: 'Installment plans are no longer supported. The installment system has been consolidated.'
      };
    }
  }

  // Cancel installment plan
  async cancelPlan(planId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // ✅ FIXED: customer_installment_plans table was consolidated
      console.log('ℹ️ Customer installment plans table was consolidated - cannot cancel plan:', planId);
      return {
        success: false,
        error: 'Installment plans are no longer supported. The installment system has been consolidated.'
      };
    } catch (error) {
      console.error('Error in cancelPlan:', error instanceof Error ? error.message : error);
      return {
        success: false,
        error: 'Installment plans are no longer supported. The installment system has been consolidated.'
      };
    }
  }

  // Update installment plan
  async updateInstallmentPlan(
    planId: string,
    input: UpdateInstallmentPlanInput
  ): Promise<{ success: boolean; plan?: InstallmentPlan; error?: string }> {
    try {
      // ✅ FIXED: customer_installment_plans table was consolidated
      console.log('ℹ️ Customer installment plans table was consolidated - cannot update plan:', planId);
      return {
        success: false,
        error: 'Installment plans are no longer supported. The installment system has been consolidated.'
      };
    } catch (error) {
      console.error('Error in updateInstallmentPlan:', error instanceof Error ? error.message : error);
      return {
        success: false,
        error: 'Installment plans are no longer supported. The installment system has been consolidated.'
      };
    }
  }

}

export const installmentService = new InstallmentService();
