import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';

/**
 * Scheduled Transfer Service
 * Handles execution of scheduled transfers and monitoring
 */
class ScheduledTransferService {
  
  /**
   * Execute all due scheduled transfers
   */
  async executeDueTransfers(): Promise<{ success: number; failed: number; skipped: number }> {
    try {
      console.log('🔄 Checking for due scheduled transfers...');
      
      // Get all due transfers
      const { data: dueTransfers, error: fetchError } = await supabase
        .rpc('get_due_scheduled_transfers');

      if (fetchError) {
        console.error('❌ Error fetching due transfers:', fetchError);
        throw fetchError;
      }

      if (!dueTransfers || dueTransfers.length === 0) {
        console.log('✅ No due scheduled transfers found');
        return { success: 0, failed: 0, skipped: 0 };
      }

      console.log(`📋 Found ${dueTransfers.length} due scheduled transfer(s)`);
      
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      // Execute each due transfer
      for (const transfer of dueTransfers) {
        try {
          const { data, error } = await supabase.rpc('execute_scheduled_transfer', {
            p_scheduled_transfer_id: transfer.id
          });

          if (error) throw error;

          if (data && data.length > 0 && data[0].success) {
            console.log(`✅ Executed transfer: ${transfer.description}`);
            successCount++;
          } else {
            const message = data && data.length > 0 ? data[0].message : 'Unknown error';
            console.warn(`⚠️ Skipped transfer: ${transfer.description} - ${message}`);
            skippedCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to execute transfer: ${transfer.description}`, error);
          failedCount++;
        }
      }

      console.log(`📊 Execution complete: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`);
      
      return { success: successCount, failed: failedCount, skipped: skippedCount };
    } catch (error) {
      console.error('❌ Error in executeDueTransfers:', error);
      throw error;
    }
  }

  /**
   * Execute a specific scheduled transfer immediately
   */
  async executeTransferNow(transferId: string): Promise<{ success: boolean; message: string; executionId?: string }> {
    try {
      const { data, error } = await supabase.rpc('execute_scheduled_transfer', {
        p_scheduled_transfer_id: transferId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        return {
          success: data[0].success,
          message: data[0].message,
          executionId: data[0].execution_id
        };
      }

      return {
        success: false,
        message: 'No data returned from execution'
      };
    } catch (error: any) {
      console.error('Error executing transfer:', error);
      return {
        success: false,
        message: error.message || 'Failed to execute transfer'
      };
    }
  }

  /**
   * Get upcoming scheduled transfers (next 7 days)
   */
  async getUpcomingTransfers(days: number = 7) {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const { data, error } = await supabase
        .from('scheduled_transfers')
        .select(`
          *,
          source_account:finance_accounts!source_account_id(name, currency),
          destination_account:finance_accounts!destination_account_id(name, currency)
        `)
        .eq('is_active', true)
        .lte('next_execution_date', endDate.toISOString().split('T')[0])
        .order('next_execution_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting upcoming transfers:', error);
      return [];
    }
  }

  /**
   * Get overdue scheduled transfers
   */
  async getOverdueTransfers() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('scheduled_transfers')
        .select(`
          *,
          source_account:finance_accounts!source_account_id(name, currency),
          destination_account:finance_accounts!destination_account_id(name, currency)
        `)
        .eq('is_active', true)
        .lt('next_execution_date', today)
        .order('next_execution_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting overdue transfers:', error);
      return [];
    }
  }

  /**
   * Get scheduled transfer statistics
   */
  async getStatistics() {
    try {
      const { data: transfers, error } = await supabase
        .from('scheduled_transfers')
        .select('*');

      if (error) throw error;

      const { data: executions, error: execError } = await supabase
        .from('scheduled_transfer_executions')
        .select('*')
        .gte('execution_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (execError) throw execError;

      const stats = {
        total: transfers?.length || 0,
        active: transfers?.filter(t => t.is_active).length || 0,
        inactive: transfers?.filter(t => !t.is_active).length || 0,
        totalExecutions: transfers?.reduce((sum, t) => sum + (t.execution_count || 0), 0) || 0,
        last30DaysExecutions: executions?.length || 0,
        successRate: executions?.length 
          ? (executions.filter(e => e.status === 'success').length / executions.length * 100).toFixed(1)
          : '0',
      };

      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error);
      return null;
    }
  }

  /**
   * Pause a scheduled transfer
   */
  async pauseTransfer(transferId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('scheduled_transfers')
        .update({ is_active: false })
        .eq('id', transferId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error pausing transfer:', error);
      return false;
    }
  }

  /**
   * Resume a scheduled transfer
   */
  async resumeTransfer(transferId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('scheduled_transfers')
        .update({ is_active: true })
        .eq('id', transferId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error resuming transfer:', error);
      return false;
    }
  }

  /**
   * Delete a scheduled transfer
   */
  async deleteTransfer(transferId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('scheduled_transfers')
        .delete()
        .eq('id', transferId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting transfer:', error);
      return false;
    }
  }

  /**
   * Start monitoring scheduled transfers
   * This should be called when the app starts
   */
  startMonitoring(intervalMinutes: number = 60) {
    console.log(`🚀 Starting scheduled transfer monitoring (every ${intervalMinutes} minutes)`);
    
    // Execute immediately on start
    this.executeDueTransfers();

    // Then execute at intervals
    const intervalMs = intervalMinutes * 60 * 1000;
    return setInterval(() => {
      this.executeDueTransfers();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(intervalId: NodeJS.Timeout) {
    clearInterval(intervalId);
    console.log('⏹️ Stopped scheduled transfer monitoring');
  }
}

// Export singleton instance
export const scheduledTransferService = new ScheduledTransferService();
export default ScheduledTransferService;

