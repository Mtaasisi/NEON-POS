import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Plus, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import Modal from '../../../shared/components/ui/Modal';
import toast from 'react-hot-toast';

interface InstallmentsWidgetProps {
  className?: string;
}

interface InstallmentMetrics {
  totalInstallments: number;
  activeInstallments: number;
  overdueInstallments: number;
  totalAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  collectionRate: number;
}

export const InstallmentsWidget: React.FC<InstallmentsWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<InstallmentMetrics>({
    totalInstallments: 0,
    activeInstallments: 0,
    overdueInstallments: 0,
    totalAmount: 0,
    collectedAmount: 0,
    pendingAmount: 0,
    collectionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOverdueModal, setShowOverdueModal] = useState(false);

  useEffect(() => {
    loadInstallmentData();
  }, []);

  const loadInstallmentData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      // Query installment plans
      let query = supabase
        .from('customer_installment_plans')
        .select('id, total_amount, total_paid, status, next_payment_date, created_at');

      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }

      const { data: installments, error } = await query;

      // Handle missing table gracefully
      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist - show empty state
          setMetrics({
            totalInstallments: 0,
            activeInstallments: 0,
            overdueInstallments: 0,
            totalAmount: 0,
            collectedAmount: 0,
            pendingAmount: 0,
            collectionRate: 0
          });
          setIsLoading(false);
          return;
        }
        throw error;
      }

      const total = installments?.length || 0;
      const active = installments?.filter(i => i.status === 'active' || i.status === 'pending').length || 0;
      const overdue = installments?.filter(i => {
        if (i.status === 'completed' || i.status === 'cancelled') return false;
        if (!i.next_payment_date) return false;
        return new Date(i.next_payment_date) < new Date();
      }).length || 0;
      
      const totalAmount = installments?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
      const collectedAmount = installments?.reduce((sum, i) => sum + (i.total_paid || 0), 0) || 0;
      const pendingAmount = totalAmount - collectedAmount;
      const collectionRate = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;

      setMetrics({
        totalInstallments: total,
        activeInstallments: active,
        overdueInstallments: overdue,
        totalAmount,
        collectedAmount,
        pendingAmount,
        collectionRate
      });
    } catch (error) {
      console.error('Error loading installment data:', error);
      setMetrics({
        totalInstallments: 0,
        activeInstallments: 0,
        overdueInstallments: 0,
        totalAmount: 0,
        collectedAmount: 0,
        pendingAmount: 0,
        collectionRate: 0
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
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Installments</h3>
            <p className="text-xs text-gray-400 mt-0.5">Payment plans overview</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/installments')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Total Plans</p>
          <p className="text-2xl font-semibold text-gray-900">{metrics.totalInstallments}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Active</p>
          <p className="text-2xl font-semibold text-blue-600">{metrics.activeInstallments}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Overdue</p>
          <p className="text-xl font-semibold text-rose-600">{metrics.overdueInstallments}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Collection Rate</p>
          <p className="text-xl font-semibold text-emerald-600">{metrics.collectionRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Amount Breakdown */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
          <span className="text-xs text-gray-500">Total Amount</span>
          <span className="text-sm font-medium text-gray-900">{metrics.totalAmount.toLocaleString()} TZS</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50">
          <span className="text-xs text-gray-500">Collected</span>
          <span className="text-sm font-medium text-emerald-700">{metrics.collectedAmount.toLocaleString()} TZS</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50">
          <span className="text-xs text-gray-500">Pending</span>
          <span className="text-sm font-medium text-amber-700">{metrics.pendingAmount.toLocaleString()} TZS</span>
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
          title="New Plan"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowOverdueModal(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-black hover:scale-105 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <AlertCircle size={14} />
          <span>Overdue</span>
        </button>
      </div>

      {/* Create Installment Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Installment Plan" maxWidth="md">
        <div className="p-4">
          <p className="text-gray-600">Installment plan creation form will be implemented here.</p>
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

      {/* Overdue Items Modal */}
      <Modal isOpen={showOverdueModal} onClose={() => setShowOverdueModal(false)} title="Overdue Installments" maxWidth="lg">
        <div className="p-4">
          <p className="text-gray-600">Overdue installment plans will be listed here.</p>
          <button
            onClick={() => setShowOverdueModal(false)}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

