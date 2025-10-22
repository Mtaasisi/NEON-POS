/**
 * Trade-In History & Reports Page
 * View all trade-in transactions with filtering and analytics
 */

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Wrench,
  Package,
  TrendingUp,
  DollarSign,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TradeInTransaction, TradeInFilters, ConditionRating, TradeInStatus } from '../types/tradeIn';
import { getTradeInTransactions } from '../lib/tradeInApi';
import { format } from '../lib/format';

export const TradeInHistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<TradeInTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<TradeInFilters>({});
  const [selectedStatus, setSelectedStatus] = useState<TradeInStatus | ''>('');
  const [selectedCondition, setSelectedCondition] = useState<ConditionRating | ''>('');
  const [needsRepairFilter, setNeedsRepairFilter] = useState<boolean | undefined>(undefined);
  const [readyForResaleFilter, setReadyForResaleFilter] = useState<boolean | undefined>(undefined);

  // Load transactions
  const loadTransactions = async () => {
    setLoading(true);
    
    const filterParams: TradeInFilters = {
      search: searchTerm || undefined,
      status: selectedStatus || undefined,
      condition_rating: selectedCondition || undefined,
      needs_repair: needsRepairFilter,
      ready_for_resale: readyForResaleFilter,
    };

    const result = await getTradeInTransactions(filterParams);
    
    if (result.success && result.data) {
      setTransactions(result.data);
    } else {
      toast.error(result.error || 'Failed to load transactions');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadTransactions();
  }, [selectedStatus, selectedCondition, needsRepairFilter, readyForResaleFilter]);

  // Calculate analytics
  const analytics = React.useMemo(() => {
    if (transactions.length === 0) {
      return {
        totalTransactions: 0,
        totalValue: 0,
        averageValue: 0,
        pendingCount: 0,
        completedCount: 0,
        needsRepairCount: 0,
        readyForResaleCount: 0,
      };
    }

    return {
      totalTransactions: transactions.length,
      totalValue: transactions.reduce((sum, t) => sum + t.final_trade_in_value, 0),
      averageValue: transactions.reduce((sum, t) => sum + t.final_trade_in_value, 0) / transactions.length,
      pendingCount: transactions.filter((t) => t.status === 'pending').length,
      completedCount: transactions.filter((t) => t.status === 'completed').length,
      needsRepairCount: transactions.filter((t) => t.needs_repair && !t.ready_for_resale).length,
      readyForResaleCount: transactions.filter((t) => t.ready_for_resale).length,
    };
  }, [transactions]);

  const handleSearch = () => {
    loadTransactions();
  };

  const getStatusBadge = (status: TradeInStatus) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getConditionColor = (condition: ConditionRating) => {
    const colors = {
      excellent: 'text-green-600',
      good: 'text-blue-600',
      fair: 'text-yellow-600',
      poor: 'text-red-600',
    };
    return colors[condition];
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <History className="w-8 h-8 text-blue-600" />
          Trade-In History & Reports
        </h1>
        <p className="text-gray-600 mt-2">
          View and manage all device trade-in transactions
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Transactions</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{analytics.totalTransactions}</p>
            </div>
            <Smartphone className="w-10 h-10 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Value</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {format.money(analytics.totalValue)}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Needs Repair</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{analytics.needsRepairCount}</p>
            </div>
            <Wrench className="w-10 h-10 text-purple-600 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Ready for Sale</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{analytics.readyForResaleCount}</p>
            </div>
            <Package className="w-10 h-10 text-orange-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by device, IMEI, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              showFilters
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Search
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as TradeInStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value as ConditionRating | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Conditions</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Repair Status</label>
              <select
                value={needsRepairFilter === undefined ? '' : needsRepairFilter.toString()}
                onChange={(e) =>
                  setNeedsRepairFilter(e.target.value === '' ? undefined : e.target.value === 'true')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="true">Needs Repair</option>
                <option value="false">No Repair Needed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sale Status</label>
              <select
                value={readyForResaleFilter === undefined ? '' : readyForResaleFilter.toString()}
                onChange={(e) =>
                  setReadyForResaleFilter(e.target.value === '' ? undefined : e.target.value === 'true')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="true">Ready for Sale</option>
                <option value="false">Not Ready</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Smartphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trade-In Transactions</h3>
            <p className="text-gray-600">
              {searchTerm ? 'No transactions match your search' : 'Start trading in devices to see them here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.transaction_number}
                      </div>
                      {transaction.contract_signed && (
                        <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3 h-3" />
                          Contract Signed
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{transaction.device_name}</div>
                      <div className="text-xs text-gray-500">{transaction.device_model}</div>
                      {transaction.device_imei && (
                        <div className="text-xs text-gray-400 mt-1">IMEI: {transaction.device_imei}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{transaction.customer?.name}</div>
                      <div className="text-xs text-gray-500">{transaction.customer?.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium capitalize ${getConditionColor(transaction.condition_rating)}`}>
                        {transaction.condition_rating}
                      </div>
                      {transaction.total_damage_deductions > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          -{format.money(transaction.total_damage_deductions)} deducted
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {format.money(transaction.final_trade_in_value)}
                      </div>
                      {transaction.needs_repair && (
                        <div className="flex items-center gap-1 text-xs text-purple-600 mt-1">
                          <Wrench className="w-3 h-3" />
                          Needs Repair
                        </div>
                      )}
                      {transaction.ready_for_resale && (
                        <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                          <Package className="w-3 h-3" />
                          Ready for Sale
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(transaction.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(transaction.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => {
                          // TODO: Implement view details modal
                          toast.info('View details coming soon');
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {transactions.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </div>
            <div className="text-gray-900 font-medium">
              Average Value: {format.money(analytics.averageValue)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeInHistoryPage;

