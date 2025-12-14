import { supabase } from './supabaseClient';
import { addBranchFilter } from './branchAwareApi';
import { fetchPaymentMethods as fetchPaymentMethodsDedup } from './deduplicatedQueries';

export interface FinanceAccount {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'mobile_money' | 'credit_card' | 'savings' | 'investment' | 'other';
  balance: number;
  account_number?: string;
  bank_name?: string;
  currency: string;
  is_active: boolean;
  is_payment_method: boolean;
  icon?: string; // Database column: icon (not payment_icon)
  color?: string; // Database column: color (not payment_color)
  description?: string; // Database column: description (not payment_description)
  // Legacy aliases for backward compatibility
  payment_icon?: string;
  payment_color?: string;
  payment_description?: string;
  requires_reference: boolean;
  requires_account_number: boolean;
  notes?: string;
  branch_id?: string | null;
  is_shared?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceAccountWithStats extends FinanceAccount {
  transaction_count?: number;
  total_transactions?: number;
}

// Helper function to transform database row to FinanceAccount interface
function transformAccountRow(row: any): FinanceAccount {
  return {
    ...row,
    // Map database columns to interface properties
    payment_icon: row.icon || row.payment_icon,
    payment_color: row.color || row.payment_color,
    payment_description: row.description || row.payment_description,
    // Ensure balance is a number
    balance: typeof row.balance === 'string' ? parseFloat(row.balance) || 0 : (row.balance || 0)
  };
}

class FinanceAccountService {
  public supabase = supabase;
  // Get all active finance accounts that are payment methods
  async getPaymentMethods(): Promise<FinanceAccount[]> {
    try {
      console.log('🔍 FinanceAccountService: Fetching payment methods (deduplicated)...');
      console.log('🔍 FinanceAccountService: Supabase client:', !!supabase);
      
      // Use deduplicated query to prevent duplicate calls
      const data = await fetchPaymentMethodsDedup();

      console.log('🔍 FinanceAccountService: Query result:', { data: data?.length || 0 });
      console.log('📋 FinanceAccountService: Fetched payment methods:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📋 FinanceAccountService: First method:', { id: data[0].id, name: data[0].name, type: data[0].type });
      }
      
      // Transform database rows to interface format
      return (data || []).map(transformAccountRow);
    } catch (error) {
      console.error('❌ Exception fetching payment methods:', error);
      return [];
    }
  }

  // Get all active finance accounts
  async getActiveFinanceAccounts(): Promise<FinanceAccount[]> {
    try {
      // Explicitly include branch_id in select (using correct column names)
      const query = supabase
        .from('finance_accounts')
        .select('id, name, type, balance, account_number, bank_name, currency, is_active, is_payment_method, icon, color, description, requires_reference, requires_account_number, notes, branch_id, is_shared, created_at, updated_at')
        .eq('is_active', true)
        .order('name');

      const filteredQuery = await addBranchFilter(query, 'accounts');
      const { data, error } = await filteredQuery;

      if (error) throw error;
      
      // Log branch_id for debugging
      if (data && data.length > 0) {
        console.log(`✅ Fetched ${data.length} finance accounts with branch filtering`);
      }
      
      // Transform database rows to interface format
      return (data || []).map(transformAccountRow);
    } catch (error) {
      console.error('Error fetching finance accounts:', error);
      return [];
    }
  }

  // Get finance accounts by type
  async getFinanceAccountsByType(type: FinanceAccount['type']): Promise<FinanceAccount[]> {
    try {
      // Explicitly include branch_id in select (using correct column names)
      const query = supabase
        .from('finance_accounts')
        .select('id, name, type, balance, account_number, bank_name, currency, is_active, is_payment_method, icon, color, description, requires_reference, requires_account_number, notes, branch_id, is_shared, created_at, updated_at')
        .eq('type', type)
        .eq('is_active', true)
        .order('name');

      const filteredQuery = await addBranchFilter(query, 'accounts');
      const { data, error } = await filteredQuery;

      if (error) throw error;
      
      // Transform database rows to interface format
      return (data || []).map(transformAccountRow);
    } catch (error) {
      console.error('Error fetching finance accounts by type:', error);
      return [];
    }
  }

  // Get finance account by ID
  async getFinanceAccountById(id: string): Promise<FinanceAccount | null> {
    try {
      // Explicitly include branch_id in select (using correct column names)
      const { data, error } = await supabase
        .from('finance_accounts')
        .select('id, name, type, balance, account_number, bank_name, currency, is_active, is_payment_method, icon, color, description, requires_reference, requires_account_number, notes, branch_id, is_shared, created_at, updated_at')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      if (data) {
        console.log(`✅ Fetched account ${data.name}: branch_id=${data.branch_id || 'NULL (shared)'}, is_shared=${data.is_shared}`);
        // Transform database row to interface format
        return transformAccountRow(data);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching finance account by ID:', error);
      return null;
    }
  }

  // Get finance accounts with transaction stats
  async getFinanceAccountsWithStats(): Promise<FinanceAccountWithStats[]> {
    try {
      const { data, error } = await supabase
        .from('finance_accounts')
        .select(`
          *,
          payment_transactions(
            id
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Transform data to include stats
      const accountsWithStats = data?.map(account => ({
        ...account,
        transaction_count: account.payment_transactions?.length || 0,
        total_transactions: account.payment_transactions?.length || 0
      })) || [];

      return accountsWithStats;
    } catch (error) {
      console.error('Error fetching finance accounts with stats:', error);
      return [];
    }
  }

  // Get default payment method
  async getDefaultPaymentMethod(): Promise<FinanceAccount | null> {
    try {
      const { data, error } = await supabase
        .from('finance_accounts')
        .select('*')
        .eq('is_active', true)
        .eq('is_payment_method', true)
        .eq('type', 'cash') // Default to cash
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching default payment method:', error);
      return null;
    }
  }

  // Get POS payment methods (cash, mobile money, cards)
  async getPOSPaymentMethods(): Promise<FinanceAccount[]> {
    try {
      // Explicitly include branch_id and apply branch filtering (using correct column names)
      const query = supabase
        .from('finance_accounts')
        .select('id, name, type, balance, account_number, bank_name, currency, is_active, is_payment_method, icon, color, description, requires_reference, requires_account_number, notes, branch_id, is_shared, created_at, updated_at')
        .eq('is_active', true)
        .eq('is_payment_method', true)
        .in('type', ['cash', 'mobile_money', 'credit_card'])
        .order('name');

      const filteredQuery = await addBranchFilter(query, 'accounts');
      const { data, error } = await filteredQuery;

      if (error) throw error;
      
      // Transform database rows to interface format
      return (data || []).map(transformAccountRow);
    } catch (error) {
      console.error('Error fetching POS payment methods:', error);
      return [];
    }
  }

  // Get finance payment methods (bank, savings, investment)
  async getFinancePaymentMethods(): Promise<FinanceAccount[]> {
    try {
      // Explicitly include branch_id and apply branch filtering (using correct column names)
      const query = supabase
        .from('finance_accounts')
        .select('id, name, type, balance, account_number, bank_name, currency, is_active, is_payment_method, icon, color, description, requires_reference, requires_account_number, notes, branch_id, is_shared, created_at, updated_at')
        .eq('is_active', true)
        .eq('is_payment_method', true)
        .in('type', ['bank', 'savings', 'investment'])
        .order('name');

      const filteredQuery = await addBranchFilter(query, 'accounts');
      const { data, error } = await filteredQuery;

      if (error) throw error;
      
      // Transform database rows to interface format
      return (data || []).map(transformAccountRow);
    } catch (error) {
      console.error('Error fetching finance payment methods:', error);
      return [];
    }
  }

  // Create new finance account
  async createFinanceAccount(financeAccount: Omit<FinanceAccount, 'id' | 'created_at' | 'updated_at'>): Promise<FinanceAccount | null> {
    try {
      // Get current branch ID
      const { getCurrentBranchId } = await import('./branchAwareApi');
      const currentBranchId = getCurrentBranchId();
      
      // Ensure account_name is set (required by database constraint)
      // Sync name and account_name - prioritize name if provided
      // Ensure account_type is set (required by database constraint)
      const accountData = {
        ...financeAccount,
        account_name: financeAccount.account_name || financeAccount.name || 'Unnamed Account',
        name: financeAccount.name || financeAccount.account_name || 'Unnamed Account',
        // Ensure account_type is set (required by database - NOT NULL constraint)
        account_type: financeAccount.account_type || financeAccount.type || 'cash',
        // If type is not set, use account_type
        type: financeAccount.type || financeAccount.account_type || 'cash',
        // Force isolation: always set is_shared = false and ensure branch_id is set
        is_shared: false,
        branch_id: financeAccount.branch_id || currentBranchId || await this.getDefaultBranchId()
      };

      const { data, error } = await supabase
        .from('finance_accounts')
        .insert([accountData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating finance account:', error);
      return null;
    }
  }

  // Helper method to get default branch ID
  private async getDefaultBranchId(): Promise<string | null> {
    try {
      const { data } = await supabase
        .from('store_locations')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      return data?.id || null;
    } catch (error) {
      console.error('Error getting default branch:', error);
      return null;
    }
  }

  // Test function to update just one field
  async testUpdateField(id: string, field: string, value: any): Promise<FinanceAccount | null> {
    try {
      console.log(`🧪 Testing update of field '${field}' with value:`, value);
      
      const { data, error } = await supabase
        .from('finance_accounts')
        .update({ [field]: value })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error(`❌ Error updating field '${field}':`, error);
        return null;
      }
      
      console.log(`✅ Successfully updated field '${field}'`);
      return data;
    } catch (error) {
      console.error(`❌ Exception updating field '${field}':`, error);
      return null;
    }
  }

  // Update finance account
  async updateFinanceAccount(id: string, updates: Partial<FinanceAccount>): Promise<FinanceAccount | null> {
    try {
      console.log('🔧 Updating finance account:', { id, updates });
      
      // Check authentication status
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🔐 Authentication status:', { 
        user: user ? { id: user.id, email: user.email } : null,
        authError: authError?.message 
      });
      
      // Log the exact request being made
      console.log('🔍 Supabase request details:', {
        table: 'finance_accounts',
        operation: 'update',
        id: id,
        updates: JSON.stringify(updates, null, 2)
      });
      
      // Try the update with explicit headers
      // Try with explicit headers and error handling
      console.log('🔍 Attempting update with data:', JSON.stringify(updates, null, 2));
      
      const { data, error } = await supabase
        .from('finance_accounts')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Supabase error updating finance account:', error);
        console.error('📋 Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Log the exact request data that caused the error
        console.error('🔍 Request data that caused error:', updates);
        
        // Log the full error object for debugging
        console.error('🔍 Full error object:', JSON.stringify(error, null, 2));
        
        // Check for common issues
        if (error.message?.includes('column')) {
          console.error('🚨 Column-related error - check if all columns exist');
        }
        if (error.message?.includes('type')) {
          console.error('🚨 Data type error - check field types');
        }
        if (error.message?.includes('constraint')) {
          console.error('🚨 Constraint error - check field values');
        }
        if (error.message?.includes('permission') || error.message?.includes('policy')) {
          console.error('🚨 Permission/RLS error - check user permissions');
        }
        
        throw error;
      }
      
      console.log('✅ Successfully updated finance account:', data);
      return data;
    } catch (error) {
      console.error('❌ Error updating finance account:', error);
      
      // Try to get more detailed error information
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      // Try to parse as JSON if it's a response error
      try {
        const errorObj = JSON.parse(error.message);
        console.error('❌ Parsed error:', errorObj);
      } catch (e) {
        console.error('❌ Raw error message:', error.message);
      }
      
      return null;
    }
  }

  // Delete finance account
  async deleteFinanceAccount(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('finance_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting finance account:', error);
      return false;
    }
  }

  // Get finance account stats
  async getFinanceAccountStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    active: number;
    totalBalance: number;
    paymentMethods: number;
  }> {
    try {
      const accounts = await this.getActiveFinanceAccounts();
      
      const stats = {
        total: accounts.length,
        byType: accounts.reduce((acc, account) => {
          acc[account.type] = (acc[account.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        active: accounts.filter(acc => acc.is_active).length,
        totalBalance: accounts.reduce((sum, account) => sum + Number(account.balance), 0),
        paymentMethods: accounts.filter(acc => acc.is_payment_method).length
      };

      return stats;
    } catch (error) {
      console.error('Error getting finance account stats:', error);
      return {
        total: 0,
        byType: {},
        active: 0,
        totalBalance: 0,
        paymentMethods: 0
      };
    }
  }

  // Get icon for account type
  getIconForAccountType(type: FinanceAccount['type']): string {
    switch (type) {
      case 'bank':
        return 'building';
      case 'cash':
        return 'dollar-sign';
      case 'mobile_money':
        return 'smartphone';
      case 'credit_card':
        return 'credit-card';
      case 'savings':
        return 'piggy-bank';
      case 'investment':
        return 'trending-up';
      default:
        return 'credit-card';
    }
  }

  // Get color for account type
  getColorForAccountType(type: FinanceAccount['type']): string {
    switch (type) {
      case 'bank':
        return '#059669';
      case 'cash':
        return '#10B981';
      case 'mobile_money':
        return '#DC2626';
      case 'credit_card':
        return '#3B82F6';
      case 'savings':
        return '#F59E0B';
      case 'investment':
        return '#10B981';
      default:
        return '#3B82F6';
    }
  }
}

// Utility function to get account balance before any storage/update operations
export async function getAccountBalanceBeforeStorage(accountId: string): Promise<{
  balance: number;
  accountData: FinanceAccount | null;
  isValid: boolean;
}> {
  try {
    const { data: account, error } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('is_active', true)
      .single();

    if (error || !account) {
      console.error('Error fetching account balance before storage:', error);
      return { balance: 0, accountData: null, isValid: false };
    }

    return {
      balance: Number(account.balance) || 0,
      accountData: account,
      isValid: true
    };
  } catch (error) {
    console.error('Exception fetching account balance before storage:', error);
    return { balance: 0, accountData: null, isValid: false };
  }
}

// Utility function to validate balance before transaction
export function validateBalanceBeforeTransaction(
  currentBalance: number,
  transactionAmount: number,
  transactionType: 'payment' | 'expense' | 'transfer' = 'payment'
): {
  isValid: boolean;
  newBalance: number;
  warning?: string;
} {
  const absAmount = Math.abs(transactionAmount);

  // For payments received (positive amounts), no validation needed
  if (transactionAmount > 0) {
    return {
      isValid: true,
      newBalance: Math.max(0, currentBalance + transactionAmount)
    };
  }

  // For payments made (negative amounts), check if sufficient balance
  if (absAmount > currentBalance) {
    return {
      isValid: false,
      newBalance: 0, // Will be set to 0 to prevent negative
      warning: `Transaction amount (${absAmount}) exceeds available balance (${currentBalance}). Balance will be set to 0.`
    };
  }

  return {
    isValid: true,
    newBalance: Math.max(0, currentBalance - absAmount)
  };
}

export const financeAccountService = new FinanceAccountService(); 