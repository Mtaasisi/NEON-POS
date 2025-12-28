/**
 * Account Balance Checker Utility
 * Helps identify which accounts have sufficient funds for payments
 */

import { supabase } from '../lib/supabaseClient';

export interface AccountBalance {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  isPaymentMethod: boolean;
  accountNumber?: string;
  bankName?: string;
}

export interface BalanceCheckResult {
  hasSufficientFunds: boolean;
  accountsWithFunds: AccountBalance[];
  accountsWithInsufficient: AccountBalance[];
  suggestedAccounts: AccountBalance[];
  totalAvailable: number;
  requiredAmount: number;
  shortfall: number;
}

/**
 * Check if accounts have sufficient balance for a payment
 */
export async function checkAccountsForPayment(
  requiredAmount: number,
  currency: string = 'TZS'
): Promise<BalanceCheckResult> {
  try {
    // Get all active payment method accounts in the specified currency
    const { data: accounts, error } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_payment_method', true)
      .eq('currency', currency);

    if (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }

    if (!accounts || accounts.length === 0) {
      return {
        hasSufficientFunds: false,
        accountsWithFunds: [],
        accountsWithInsufficient: [],
        suggestedAccounts: [],
        totalAvailable: 0,
        requiredAmount,
        shortfall: requiredAmount
      };
    }

    const accountBalances: AccountBalance[] = accounts.map(account => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: Number(account.balance || 0),
      currency: account.currency,
      isPaymentMethod: account.is_payment_method,
      accountNumber: account.account_number,
      bankName: account.bank_name
    }));

    // Separate accounts into those with sufficient and insufficient funds
    const accountsWithFunds = accountBalances.filter(acc => acc.balance >= requiredAmount);
    const accountsWithInsufficient = accountBalances.filter(acc => acc.balance < requiredAmount);

    // Calculate total available across all accounts
    const totalAvailable = accountBalances.reduce((sum, acc) => sum + acc.balance, 0);

    // Sort accounts by balance (highest first) for suggestions
    const suggestedAccounts = [...accountBalances].sort((a, b) => b.balance - a.balance);

    return {
      hasSufficientFunds: accountsWithFunds.length > 0,
      accountsWithFunds,
      accountsWithInsufficient,
      suggestedAccounts,
      totalAvailable,
      requiredAmount,
      shortfall: Math.max(0, requiredAmount - totalAvailable)
    };
  } catch (error) {
    console.error('Error checking account balances:', error);
    throw error;
  }
}

/**
 * Get detailed account balance report
 */
export async function getAccountBalanceReport(): Promise<{
  accounts: AccountBalance[];
  summary: {
    totalAccounts: number;
    accountsByCurrency: Record<string, number>;
    totalsByCurrency: Record<string, number>;
    totalsByType: Record<string, { count: number; total: number }>;
  };
}> {
  try {
    const { data: accounts, error } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('is_active', true)
      .order('currency, name');

    if (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }

    if (!accounts || accounts.length === 0) {
      return {
        accounts: [],
        summary: {
          totalAccounts: 0,
          accountsByCurrency: {},
          totalsByCurrency: {},
          totalsByType: {}
        }
      };
    }

    const accountBalances: AccountBalance[] = accounts.map(account => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: Number(account.balance || 0),
      currency: account.currency,
      isPaymentMethod: account.is_payment_method,
      accountNumber: account.account_number,
      bankName: account.bank_name
    }));

    // Calculate summaries
    const accountsByCurrency: Record<string, number> = {};
    const totalsByCurrency: Record<string, number> = {};
    const totalsByType: Record<string, { count: number; total: number }> = {};

    accountBalances.forEach(account => {
      // By currency
      accountsByCurrency[account.currency] = (accountsByCurrency[account.currency] || 0) + 1;
      totalsByCurrency[account.currency] = (totalsByCurrency[account.currency] || 0) + account.balance;

      // By type
      if (!totalsByType[account.type]) {
        totalsByType[account.type] = { count: 0, total: 0 };
      }
      totalsByType[account.type].count++;
      totalsByType[account.type].total += account.balance;
    });

    return {
      accounts: accountBalances,
      summary: {
        totalAccounts: accountBalances.length,
        accountsByCurrency,
        totalsByCurrency,
        totalsByType
      }
    };
  } catch (error) {
    console.error('Error generating account report:', error);
    throw error;
  }
}

/**
 * Format currency with proper locale formatting
 */
export function formatCurrency(amount: number, currency: string = 'TZS'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Get payment suggestions when insufficient balance
 */
export function getPaymentSuggestions(result: BalanceCheckResult): string[] {
  const suggestions: string[] = [];

  if (result.hasSufficientFunds) {
    suggestions.push(`✅ You have ${result.accountsWithFunds.length} account(s) with sufficient funds`);
    suggestions.push(`💡 Suggested: Use ${result.suggestedAccounts[0].name} (${formatCurrency(result.suggestedAccounts[0].balance, result.suggestedAccounts[0].currency)})`);
  } else {
    suggestions.push(`❌ No single account has sufficient funds for this payment`);
    suggestions.push(`💰 Required: ${formatCurrency(result.requiredAmount, result.suggestedAccounts[0]?.currency || 'TZS')}`);
    suggestions.push(`📊 Total Available: ${formatCurrency(result.totalAvailable, result.suggestedAccounts[0]?.currency || 'TZS')}`);
    
    if (result.totalAvailable >= result.requiredAmount) {
      suggestions.push(`\n💡 Solution: Split payment across multiple accounts:`);
      let remainingAmount = result.requiredAmount;
      for (const account of result.suggestedAccounts) {
        if (remainingAmount > 0) {
          const useAmount = Math.min(account.balance, remainingAmount);
          suggestions.push(`   - ${account.name}: ${formatCurrency(useAmount, account.currency)}`);
          remainingAmount -= useAmount;
        }
      }
    } else {
      suggestions.push(`\n⚠️ Shortfall: ${formatCurrency(result.shortfall, result.suggestedAccounts[0]?.currency || 'TZS')}`);
      suggestions.push(`💡 Action needed: Add funds to one of your accounts or reduce the payment amount`);
    }
  }

  // Show top 3 accounts by balance
  if (result.suggestedAccounts.length > 0) {
    suggestions.push(`\n📋 Your accounts (sorted by balance):`);
    result.suggestedAccounts.slice(0, 3).forEach((account, index) => {
      const status = account.balance >= result.requiredAmount ? '✅' : '⚠️';
      suggestions.push(`   ${index + 1}. ${status} ${account.name}: ${formatCurrency(account.balance, account.currency)}`);
    });
  }

  return suggestions;
}

/**
 * Log account balance check to console (for debugging)
 */
export function logBalanceCheck(result: BalanceCheckResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('💰 BALANCE CHECK RESULT');
  console.log('='.repeat(80));
  
  const suggestions = getPaymentSuggestions(result);
  suggestions.forEach(suggestion => console.log(suggestion));
  
  console.log('='.repeat(80) + '\n');
}

