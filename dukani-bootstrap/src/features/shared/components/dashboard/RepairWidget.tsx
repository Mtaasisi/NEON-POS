import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Plus, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import Modal from '../../../shared/components/ui/Modal';
import toast from 'react-hot-toast';

interface RepairWidgetProps {
  className?: string;
}

interface RepairMetrics {
  totalRepairs: number;
  inProgress: number;
  completed: number;
  overdue: number;
  pending: number;
  averageTime: number;
}

export const RepairWidget: React.FC<RepairWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<RepairMetrics>({
    totalRepairs: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    pending: 0,
    averageTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOverdueModal, setShowOverdueModal] = useState(false);

  useEffect(() => {
    loadRepairData();
  }, []);

  const loadRepairData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      // Query devices - note: repair columns may not exist in devices table
      let query = supabase
        .from('devices')
        .select('id, status, created_at');

      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }

      const { data: devices, error } = await query;

      if (error) {
        console.error('Error loading repair data:', error);
        setMetrics({
          totalRepairs: 0,
          inProgress: 0,
          completed: 0,
          overdue: 0,
          pending: 0,
          averageTime: 0
        });
        setIsLoading(false);
        return;
      }

      // Note: devices table may not have repair_status columns
      // For now, return empty metrics until repair columns are added to devices table
      const repairs: any[] = [];
      const totalRepairs = 0;
      const inProgress = 0;
      const completed = 0;
      const pending = 0;
      const overdue = 0;
      const averageTime = 0;

      setMetrics({
        totalRepairs,
        inProgress,
        completed,
        overdue,
        pending,
        averageTime
      });
    } catch (error) {
      console.error('Error loading repair data:', error);
      setMetrics({
        totalRepairs: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        pending: 0,
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
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Repairs</h3>
            <p className="text-xs text-gray-400 mt-0.5">Repair management</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/devices')}
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
          <p className="text-2xl font-semibold text-gray-900">{metrics.totalRepairs}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">In Progress</p>
          <p className="text-2xl font-semibold text-blue-600">{metrics.inProgress}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Completed</p>
          <p className="text-xl font-semibold text-emerald-600">{metrics.completed}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Overdue</p>
          <p className="text-xl font-semibold text-rose-600">{metrics.overdue}</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Pending</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{metrics.pending}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-500">Avg. Time</span>
          </div>
          <span className="text-sm font-medium text-blue-700">{metrics.averageTime.toFixed(1)}d</span>
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
          title="New Repair"
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

      {/* Create Repair Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Repair" maxWidth="md">
        <div className="p-4">
          <p className="text-gray-600">Repair creation form will be implemented here.</p>
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

      {/* Overdue Repairs Modal */}
      <Modal isOpen={showOverdueModal} onClose={() => setShowOverdueModal(false)} title="Overdue Repairs" maxWidth="lg">
        <div className="p-4">
          <p className="text-gray-600">Overdue repairs will be listed here.</p>
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

