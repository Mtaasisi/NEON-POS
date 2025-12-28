import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Plus, ExternalLink, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import Modal from '../../../shared/components/ui/Modal';
import toast from 'react-hot-toast';

interface TradeInWidgetProps {
  className?: string;
}

interface TradeInMetrics {
  totalTradeIns: number;
  pending: number;
  completed: number;
  totalValue: number;
  averageValue: number;
}

export const TradeInWidget: React.FC<TradeInWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<TradeInMetrics>({
    totalTradeIns: 0,
    pending: 0,
    completed: 0,
    totalValue: 0,
    averageValue: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  useEffect(() => {
    loadTradeInData();
  }, []);

  const loadTradeInData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      // Query trade-ins from lats_trade_in_transactions table
      let query = supabase
        .from('lats_trade_in_transactions')
        .select('id, status, final_trade_in_value, created_at');

      // ✅ Use addBranchFilter for proper isolation support
      const { addBranchFilter } = await import('../../../../lib/branchAwareApi');
      query = await addBranchFilter(query, 'trade_ins');

      const { data: tradeIns, error } = await query;

      // Handle missing table gracefully
      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist - show empty state
          setMetrics({
            totalTradeIns: 0,
            pending: 0,
            completed: 0,
            totalValue: 0,
            averageValue: 0
          });
          setIsLoading(false);
          return;
        }
        throw error;
      }

      const total = tradeIns?.length || 0;
      const pending = tradeIns?.filter(t => t.status === 'pending' || t.status === 'processing').length || 0;
      const completed = tradeIns?.filter(t => t.status === 'completed').length || 0;
      const totalValue = tradeIns?.reduce((sum, t) => sum + (t.final_trade_in_value || 0), 0) || 0;
      const averageValue = total > 0 ? totalValue / total : 0;

      setMetrics({
        totalTradeIns: total,
        pending,
        completed,
        totalValue,
        averageValue
      });
    } catch (error) {
      console.error('Error loading trade-in data:', error);
      setMetrics({
        totalTradeIns: 0,
        pending: 0,
        completed: 0,
        totalValue: 0,
        averageValue: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-7 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Trade-ins</h3>
            <p className="text-xs text-gray-400 mt-0.5">Device trade-ins</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/trade-ins')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Total</p>
          <p className="text-2xl font-semibold text-gray-900">{metrics.totalTradeIns}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Pending</p>
          <p className="text-2xl font-semibold text-amber-600">{metrics.pending}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Completed</p>
          <p className="text-xl font-semibold text-emerald-600">{metrics.completed}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Avg. Value</p>
          <p className="text-xl font-semibold text-blue-600">{metrics.averageValue.toLocaleString()} TZS</p>
        </div>
      </div>

      {/* Value Breakdown */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
          <span className="text-xs text-gray-500">Total Value</span>
          <span className="text-sm font-medium text-gray-900">{metrics.totalValue.toLocaleString()} TZS</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-4 border-t">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowCreateModal(true);
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 shadow-sm hover:shadow-md transition-all duration-200"
          title="New Trade-in"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowPendingModal(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-black hover:scale-105 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Clock size={14} />
          <span>Pending</span>
        </button>
      </div>

      {/* Create Trade-in Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Trade-in" maxWidth="md">
        <div className="p-4">
          <p className="text-gray-600">Trade-in creation form will be implemented here.</p>
          <button
            onClick={() => {
              toast.success('Feature coming soon');
              setShowCreateModal(false);
            }}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Pending Trade-ins Modal */}
      <Modal isOpen={showPendingModal} onClose={() => setShowPendingModal(false)} title="Pending Trade-ins" maxWidth="lg">
        <div className="p-4">
          <p className="text-gray-600">Pending trade-ins will be listed here.</p>
          <button
            onClick={() => setShowPendingModal(false)}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

