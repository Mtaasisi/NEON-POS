import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, ExternalLink, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import Modal from '../../../shared/components/ui/Modal';
import toast from 'react-hot-toast';

interface StockTransfersWidgetProps {
  className?: string;
}

interface StockTransferMetrics {
  totalTransfers: number;
  pendingTransfers: number;
  inTransit: number;
  completed: number;
  averageTime: number;
}

export const StockTransfersWidget: React.FC<StockTransfersWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<StockTransferMetrics>({
    totalTransfers: 0,
    pendingTransfers: 0,
    inTransit: 0,
    completed: 0,
    averageTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  useEffect(() => {
    loadStockTransferData();
  }, []);

  const loadStockTransferData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      let query = supabase
        .from('lats_stock_transfers')
        .select('id, status, created_at, completed_at');

      // Note: lats_stock_transfers may not have branch_id column
      // if (currentBranchId) {
      //   query = query.eq('branch_id', currentBranchId);
      // }

      const { data: transfers, error } = await query;

      // Handle missing table gracefully
      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist - show empty state
          setMetrics({
            totalTransfers: 0,
            pendingTransfers: 0,
            inTransit: 0,
            completed: 0,
            averageTime: 0
          });
          setIsLoading(false);
          return;
        }
        throw error;
      }

      const total = transfers?.length || 0;
      const pending = transfers?.filter(t => t.status === 'pending').length || 0;
      const inTransit = transfers?.filter(t => t.status === 'in_transit').length || 0;
      const completed = transfers?.filter(t => t.status === 'completed').length || 0;

      // Calculate average completion time
      const completedTransfers = transfers?.filter(t => t.status === 'completed' && t.completed_at && t.created_at) || [];
      const totalTime = completedTransfers.reduce((sum, t) => {
        const created = new Date(t.created_at).getTime();
        const completed = new Date(t.completed_at).getTime();
        return sum + (completed - created);
      }, 0);
      const averageTime = completedTransfers.length > 0 ? totalTime / completedTransfers.length / (1000 * 60 * 60) : 0; // in hours

      setMetrics({
        totalTransfers: total,
        pendingTransfers: pending,
        inTransit,
        completed,
        averageTime
      });
    } catch (error) {
      console.error('Error loading stock transfer data:', error);
      setMetrics({
        totalTransfers: 0,
        pendingTransfers: 0,
        inTransit: 0,
        completed: 0,
        averageTime: 0
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
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <Truck className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Stock Transfers</h3>
            <p className="text-xs text-gray-400 mt-0.5">Transfer tracking</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/stock-transfers')}
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
          <p className="text-2xl font-semibold text-gray-900">{metrics.totalTransfers}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Pending</p>
          <p className="text-2xl font-semibold text-amber-600">{metrics.pendingTransfers}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">In Transit</p>
          <p className="text-xl font-semibold text-blue-600">{metrics.inTransit}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Completed</p>
          <p className="text-xl font-semibold text-emerald-600">{metrics.completed}</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Avg. Time</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{metrics.averageTime.toFixed(1)}h</span>
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
          title="New Transfer"
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

      {/* Create Transfer Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Stock Transfer" maxWidth="md">
        <div className="p-4">
          <p className="text-gray-600">Stock transfer creation form will be implemented here.</p>
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

      {/* Pending Transfers Modal */}
      <Modal isOpen={showPendingModal} onClose={() => setShowPendingModal(false)} title="Pending Transfers" maxWidth="lg">
        <div className="p-4">
          <p className="text-gray-600">Pending stock transfers will be listed here.</p>
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

