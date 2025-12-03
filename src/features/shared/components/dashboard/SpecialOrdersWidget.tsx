import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import Modal from '../../../shared/components/ui/Modal';
import toast from 'react-hot-toast';

interface SpecialOrdersWidgetProps {
  className?: string;
}

interface SpecialOrderMetrics {
  totalOrders: number;
  pendingOrders: number;
  inProgress: number;
  completed: number;
  overdue: number;
  totalValue: number;
}

export const SpecialOrdersWidget: React.FC<SpecialOrdersWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<SpecialOrderMetrics>({
    totalOrders: 0,
    pendingOrders: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    totalValue: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  useEffect(() => {
    loadSpecialOrderData();
  }, []);

  const loadSpecialOrderData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      let query = supabase
        .from('special_orders')
        .select('id, status, total_amount, created_at');

      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }

      const { data: orders, error } = await query;

      // Handle missing table gracefully
      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist - show empty state
          setMetrics({
            totalOrders: 0,
            pendingOrders: 0,
            inProgress: 0,
            completed: 0,
            overdue: 0,
            totalValue: 0
          });
          setIsLoading(false);
          return;
        }
        throw error;
      }

      const total = orders?.length || 0;
      const pending = orders?.filter(o => o.status === 'pending' || o.status === 'requested').length || 0;
      const inProgress = orders?.filter(o => o.status === 'processing' || o.status === 'ordered').length || 0;
      const completed = orders?.filter(o => o.status === 'completed' || o.status === 'delivered').length || 0;
      // Note: special_orders table may not have due_date column
      const overdue = 0; // orders?.filter(o => {
      //   if (o.status === 'completed' || o.status === 'cancelled') return false;
      //   if (!o.due_date) return false;
      //   return new Date(o.due_date) < new Date();
      // }).length || 0;
      const totalValue = orders?.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0;

      setMetrics({
        totalOrders: total,
        pendingOrders: pending,
        inProgress,
        completed,
        overdue,
        totalValue
      });
    } catch (error) {
      console.error('Error loading special order data:', error);
      setMetrics({
        totalOrders: 0,
        pendingOrders: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        totalValue: 0
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
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Special Orders</h3>
            <p className="text-xs text-gray-400 mt-0.5">Custom orders overview</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/special-orders')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Total Orders</p>
          <p className="text-2xl font-semibold text-gray-900">{metrics.totalOrders}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Pending</p>
          <p className="text-2xl font-semibold text-amber-600">{metrics.pendingOrders}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">In Progress</p>
          <p className="text-xl font-semibold text-blue-600">{metrics.inProgress}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Overdue</p>
          <p className="text-xl font-semibold text-rose-600">{metrics.overdue}</p>
        </div>
      </div>

      {/* Value Breakdown */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
          <span className="text-xs text-gray-500">Total Value</span>
          <span className="text-sm font-medium text-gray-900">{metrics.totalValue.toLocaleString()} TZS</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-gray-500">Completed</span>
          </div>
          <span className="text-sm font-medium text-emerald-700">{metrics.completed}</span>
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
          title="New Order"
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

      {/* Create Order Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Special Order" maxWidth="md">
        <div className="p-4">
          <p className="text-gray-600">Special order creation form will be implemented here.</p>
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

      {/* Pending Orders Modal */}
      <Modal isOpen={showPendingModal} onClose={() => setShowPendingModal(false)} title="Pending Special Orders" maxWidth="lg">
        <div className="p-4">
          <p className="text-gray-600">Pending special orders will be listed here.</p>
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

