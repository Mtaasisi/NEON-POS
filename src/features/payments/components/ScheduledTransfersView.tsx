import React, { useState, useEffect } from 'react';
import { 
  RepeatIcon, Play, Pause, Edit3, Trash2, Eye, Calendar, 
  DollarSign, ArrowRight, CheckCircle, XCircle, AlertTriangle,
  Clock, TrendingUp, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassBadge from '../../shared/components/ui/GlassBadge';
import Modal from '../../shared/components/ui/Modal';

interface ScheduledTransfer {
  id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  description: string;
  reference_prefix: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string | null;
  next_execution_date: string;
  last_executed_date: string | null;
  auto_execute: boolean;
  notification_enabled: boolean;
  notification_days_before: number;
  is_active: boolean;
  execution_count: number;
  created_at: string;
  updated_at: string;
  metadata?: any;
  // Joined data
  source_account?: {
    name: string;
    currency: string;
  };
  destination_account?: {
    name: string;
    currency: string;
  };
}

interface TransferExecution {
  id: string;
  scheduled_transfer_id: string;
  execution_date: string;
  amount: number;
  status: 'success' | 'failed' | 'pending' | 'skipped';
  error_message?: string;
  created_at: string;
}

interface ScheduledTransfersViewProps {
  onRefresh?: () => void;
}

const ScheduledTransfersView: React.FC<ScheduledTransfersViewProps> = ({ onRefresh }) => {
  const [scheduledTransfers, setScheduledTransfers] = useState<ScheduledTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<ScheduledTransfer | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<TransferExecution[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadScheduledTransfers();
  }, []);

  const loadScheduledTransfers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_transfers')
        .select(`
          *,
          source_account:finance_accounts!source_account_id(name, currency),
          destination_account:finance_accounts!destination_account_id(name, currency)
        `)
        .order('next_execution_date', { ascending: true });

      if (error) throw error;
      setScheduledTransfers(data || []);
    } catch (error: any) {
      console.error('Error loading scheduled transfers:', error);
      toast.error('Failed to load scheduled transfers');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExecutionHistory = async (transferId: string) => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_transfer_executions')
        .select('*')
        .eq('scheduled_transfer_id', transferId)
        .order('execution_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setExecutionHistory(data || []);
    } catch (error: any) {
      console.error('Error loading execution history:', error);
      toast.error('Failed to load execution history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleTransferStatus = async (transfer: ScheduledTransfer) => {
    try {
      const { error } = await supabase
        .from('scheduled_transfers')
        .update({ is_active: !transfer.is_active })
        .eq('id', transfer.id);

      if (error) throw error;

      toast.success(`Transfer ${transfer.is_active ? 'paused' : 'activated'}`);
      loadScheduledTransfers();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error toggling transfer status:', error);
      toast.error('Failed to update transfer status');
    }
  };

  const executeTransferNow = async (transfer: ScheduledTransfer) => {
    try {
      const { data, error } = await supabase.rpc('execute_scheduled_transfer', {
        p_scheduled_transfer_id: transfer.id
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        toast.success('Transfer executed successfully!');
        loadScheduledTransfers();
        onRefresh?.();
      } else {
        const message = data && data.length > 0 ? data[0].message : 'Unknown error';
        toast.error(`Failed to execute transfer: ${message}`);
      }
    } catch (error: any) {
      console.error('Error executing transfer:', error);
      toast.error(error.message || 'Failed to execute transfer');
    }
  };

  const deleteScheduledTransfer = async (transferId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled transfer? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('scheduled_transfers')
        .delete()
        .eq('id', transferId);

      if (error) throw error;

      toast.success('Scheduled transfer deleted');
      loadScheduledTransfers();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error deleting scheduled transfer:', error);
      toast.error('Failed to delete scheduled transfer');
    }
  };

  const viewExecutionHistory = (transfer: ScheduledTransfer) => {
    setSelectedTransfer(transfer);
    setShowHistoryModal(true);
    loadExecutionHistory(transfer.id);
  };

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly'
    };
    return labels[frequency] || frequency;
  };

  const getDaysUntilExecution = (nextDate: string) => {
    const days = Math.ceil((new Date(nextDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `in ${days} days`;
  };

  const filteredTransfers = scheduledTransfers.filter(transfer => {
    if (filterStatus === 'active') return transfer.is_active;
    if (filterStatus === 'inactive') return !transfer.is_active;
    return true;
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading scheduled transfers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <RepeatIcon className="text-purple-600" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {scheduledTransfers.filter(t => t.is_active).length}
              </div>
              <div className="text-sm text-gray-600">Active Schedules</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {scheduledTransfers.reduce((sum, t) => sum + t.execution_count, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Executions</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  scheduledTransfers
                    .filter(t => t.is_active)
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </div>
              <div className="text-sm text-gray-600">Monthly Volume</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            filterStatus === 'all'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300'
          }`}
        >
          All ({scheduledTransfers.length})
        </button>
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            filterStatus === 'active'
              ? 'bg-green-600 text-white shadow-lg shadow-green-500/30'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
          }`}
        >
          Active ({scheduledTransfers.filter(t => t.is_active).length})
        </button>
        <button
          onClick={() => setFilterStatus('inactive')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            filterStatus === 'inactive'
              ? 'bg-gray-600 text-white shadow-lg shadow-gray-500/30'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
          }`}
        >
          Paused ({scheduledTransfers.filter(t => !t.is_active).length})
        </button>
        <div className="ml-auto">
          <GlassButton onClick={loadScheduledTransfers} size="sm">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </GlassButton>
        </div>
      </div>

      {/* Scheduled Transfers List */}
      {filteredTransfers.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <RepeatIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {filterStatus !== 'all' ? filterStatus : ''} scheduled transfers
          </h3>
          <p className="text-gray-600">
            {filterStatus === 'all' 
              ? 'Create your first scheduled transfer to automate recurring payments.'
              : `Switch to another tab to see ${filterStatus === 'active' ? 'paused' : 'active'} transfers.`}
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {filteredTransfers.map(transfer => (
            <GlassCard key={transfer.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{transfer.description}</h3>
                    {!transfer.is_active && (
                      <GlassBadge variant="secondary" size="sm">Paused</GlassBadge>
                    )}
                    {transfer.auto_execute && (
                      <GlassBadge variant="success" size="sm">Auto</GlassBadge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <RepeatIcon size={14} />
                      <span className="font-medium">{getFrequencyLabel(transfer.frequency)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} />
                      <span className="font-bold text-gray-900">
                        {formatCurrency(transfer.amount, transfer.source_account?.currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>Executed {transfer.execution_count}x</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-blue-50 rounded-lg text-blue-700 font-medium">
                        {transfer.source_account?.name}
                      </div>
                      <ArrowRight size={16} className="text-gray-400" />
                      <div className="px-3 py-1 bg-green-50 rounded-lg text-green-700 font-medium">
                        {transfer.destination_account?.name}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Next Transfer</div>
                    <div className="text-sm font-bold text-gray-900">
                      {new Date(transfer.next_execution_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-purple-600 font-medium">
                      {getDaysUntilExecution(transfer.next_execution_date)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => executeTransferNow(transfer)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium"
                  disabled={!transfer.is_active}
                >
                  <Play size={14} />
                  Execute Now
                </button>
                
                <button
                  onClick={() => toggleTransferStatus(transfer)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                    transfer.is_active
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {transfer.is_active ? <Pause size={14} /> : <Play size={14} />}
                  {transfer.is_active ? 'Pause' : 'Activate'}
                </button>

                <button
                  onClick={() => viewExecutionHistory(transfer)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium"
                >
                  <Eye size={14} />
                  History
                </button>

                <button
                  onClick={() => deleteScheduledTransfer(transfer.id)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all text-sm font-medium ml-auto"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Execution History Modal */}
      {showHistoryModal && selectedTransfer && (
        <Modal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedTransfer(null);
            setExecutionHistory([]);
          }}
          title={`Execution History - ${selectedTransfer.description}`}
        >
          <div className="space-y-4">
            {isLoadingHistory ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading history...</p>
              </div>
            ) : executionHistory.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No execution history yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {executionHistory.map(execution => (
                  <div 
                    key={execution.id}
                    className={`p-4 rounded-lg border-2 ${
                      execution.status === 'success' 
                        ? 'bg-green-50 border-green-200' 
                        : execution.status === 'failed'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {execution.status === 'success' && <CheckCircle className="text-green-600" size={16} />}
                        {execution.status === 'failed' && <XCircle className="text-red-600" size={16} />}
                        {execution.status === 'pending' && <Clock className="text-gray-600" size={16} />}
                        <span className={`text-sm font-bold ${
                          execution.status === 'success' 
                            ? 'text-green-700' 
                            : execution.status === 'failed'
                            ? 'text-red-700'
                            : 'text-gray-700'
                        }`}>
                          {execution.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(execution.amount, selectedTransfer.source_account?.currency)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(execution.execution_date).toLocaleString()}
                    </div>
                    {execution.error_message && (
                      <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded">
                        {execution.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ScheduledTransfersView;

