/**
 * Account Balance Dashboard Component
 * Real-time view of all account balances
 */

import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import { getAccountBalanceReport, formatCurrency, type AccountBalance } from '../utils/accountBalanceChecker';

interface AccountBalanceDashboardProps {
  onClose?: () => void;
}

export const AccountBalanceDashboard: React.FC<AccountBalanceDashboardProps> = ({ onClose }) => {
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadBalances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const report = await getAccountBalanceReport();
      setAccounts(report.accounts);
      setSummary(report.summary);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account balances');
      console.error('Error loading balances:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return '🏦';
      case 'cash':
        return '💵';
      case 'mobile_money':
        return '📱';
      case 'credit_card':
        return '💳';
      case 'savings':
        return '🏦';
      default:
        return '💰';
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 1000000) return 'text-green-600';
    if (balance > 100000) return 'text-blue-600';
    if (balance > 0) return 'text-gray-700';
    return 'text-red-600';
  };

  if (isLoading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600">Loading account balances...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Error Loading Balances</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <button
              onClick={loadBalances}
              className="mt-3 text-sm text-red-700 hover:text-red-900 underline"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Group accounts by currency
  const accountsByCurrency = accounts.reduce((acc, account) => {
    if (!acc[account.currency]) {
      acc[account.currency] = [];
    }
    acc[account.currency].push(account);
    return acc;
  }, {} as Record<string, AccountBalance[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Account Balances</h2>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={loadBalances}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Accounts</p>
                <p className="text-2xl font-bold text-blue-900">{summary.totalAccounts}</p>
              </div>
            </div>
          </div>

          {Object.entries(summary.totalsByCurrency).map(([currency, total]: [string, any]) => (
            <div key={currency} className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">{currency} Balance</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(Number(total), currency)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accounts by Currency */}
      {Object.entries(accountsByCurrency).map(([currency, currencyAccounts]) => (
        <div key={currency} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span>{currency} Accounts</span>
              <span className="text-sm text-gray-500">({currencyAccounts.length})</span>
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {currencyAccounts.map((account) => (
              <div key={account.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{getAccountTypeIcon(account.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{account.name}</h4>
                        {account.isPaymentMethod && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            Payment Method
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 capitalize">{account.type.replace('_', ' ')}</p>
                      {account.bankName && (
                        <p className="text-xs text-gray-400 mt-1">
                          {account.bankName}
                          {account.accountNumber && ` • A/C: ${account.accountNumber}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-xl font-bold ${getBalanceColor(account.balance)}`}>
                      {formatCurrency(account.balance, account.currency)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Currency Total */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Total {currency}</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(
                  currencyAccounts.reduce((sum, acc) => sum + acc.balance, 0),
                  currency
                )}
              </span>
            </div>
          </div>
        </div>
      ))}

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No active accounts found</p>
        </div>
      )}
    </div>
  );
};

export default AccountBalanceDashboard;

