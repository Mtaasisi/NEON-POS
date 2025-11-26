import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, ExternalLink, Send, Users } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import Modal from '../../../shared/components/ui/Modal';
import toast from 'react-hot-toast';

interface SMSWidgetProps {
  className?: string;
}

interface SMSMetrics {
  totalSent: number;
  sentToday: number;
  failed: number;
  pending: number;
  successRate: number;
}

export const SMSWidget: React.FC<SMSWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<SMSMetrics>({
    totalSent: 0,
    sentToday: 0,
    failed: 0,
    pending: 0,
    successRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    loadSMSData();
  }, []);

  const loadSMSData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      // Query SMS logs
      let query = supabase
        .from('sms_logs')
        .select('id, status, created_at');

      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }

      const { data: logs, error } = await query;

      // Handle missing table gracefully
      if (error) {
        if (error.code === '42P01') {
          setMetrics({
            totalSent: 0,
            sentToday: 0,
            failed: 0,
            pending: 0,
            successRate: 0
          });
          setIsLoading(false);
          return;
        }
        throw error;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalSent = logs?.length || 0;
      const sentToday = logs?.filter(l => {
        const logDate = new Date(l.created_at);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime();
      }).length || 0;
      const failed = logs?.filter(l => l.status === 'failed').length || 0;
      const pending = logs?.filter(l => l.status === 'pending').length || 0;
      const success = logs?.filter(l => l.status === 'sent' || l.status === 'delivered').length || 0;
      const successRate = totalSent > 0 ? (success / totalSent) * 100 : 0;

      setMetrics({
        totalSent,
        sentToday,
        failed,
        pending,
        successRate
      });
    } catch (error) {
      console.error('Error loading SMS data:', error);
      setMetrics({
        totalSent: 0,
        sentToday: 0,
        failed: 0,
        pending: 0,
        successRate: 0
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
            <MessageSquare className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">SMS Center</h3>
            <p className="text-xs text-gray-400 mt-0.5">Message overview</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/sms')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Total Sent</p>
          <p className="text-2xl font-semibold text-gray-900">{metrics.totalSent}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Sent Today</p>
          <p className="text-2xl font-semibold text-blue-600">{metrics.sentToday}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Failed</p>
          <p className="text-xl font-semibold text-rose-600">{metrics.failed}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Success Rate</p>
          <p className="text-xl font-semibold text-emerald-600">{metrics.successRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Pending</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{metrics.pending}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-4 border-t">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowSendModal(true);
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 shadow-sm hover:shadow-md transition-all duration-200"
          title="Send SMS"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowBulkModal(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-black hover:scale-105 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Users size={14} />
          <span>Bulk SMS</span>
        </button>
      </div>

      {/* Send SMS Modal */}
      <Modal isOpen={showSendModal} onClose={() => setShowSendModal(false)} title="Send SMS" maxWidth="md">
        <div className="p-4">
          <p className="text-gray-600">SMS sending form will be implemented here.</p>
          <button
            onClick={() => {
              toast.success('Feature coming soon');
              setShowSendModal(false);
            }}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Bulk SMS Modal */}
      <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title="Bulk SMS" maxWidth="lg">
        <div className="p-4">
          <p className="text-gray-600">Bulk SMS sending form will be implemented here.</p>
          <button
            onClick={() => setShowBulkModal(false)}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

