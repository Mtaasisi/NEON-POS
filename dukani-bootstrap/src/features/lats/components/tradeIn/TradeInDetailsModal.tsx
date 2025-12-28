/**
 * Trade-In Details Modal
 * Displays comprehensive details of a trade-in transaction
 * Updated to match SetPricingModal UI style
 */

import React, { useState } from 'react';
import {
  X,
  Smartphone,
  User,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  Wrench,
  FileText,
  Hash,
  AlertCircle,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import type { TradeInTransaction } from '../../types/tradeIn';
import { format } from '../../lib/format';
import { approveTradeInTransaction, completeTradeInTransaction, cancelTradeInTransaction } from '../../lib/tradeInApi';
import { toast } from 'sonner';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface TradeInDetailsModalProps {
  transaction: TradeInTransaction;
  onClose: () => void;
  onStatusChange?: () => void;
}

const TradeInDetailsModal: React.FC<TradeInDetailsModalProps> = ({ transaction, onClose, onStatusChange }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  useBodyScrollLock(true);

  const handleApprove = async () => {
    setIsProcessing(true);
    const result = await approveTradeInTransaction(transaction.id);
    setIsProcessing(false);
    
    if (result.success) {
      toast.success('Transaction approved successfully!');
      onStatusChange?.();
      onClose();
    } else {
      toast.error(result.error || 'Failed to approve transaction');
    }
  };

  const handleComplete = async () => {
    setIsProcessing(true);
    const result = await completeTradeInTransaction(transaction.id);
    setIsProcessing(false);
    
    if (result.success) {
      toast.success('Transaction completed successfully!');
      onStatusChange?.();
      onClose();
    } else {
      toast.error(result.error || 'Failed to complete transaction');
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    setIsProcessing(true);
    const result = await cancelTradeInTransaction(transaction.id, cancelReason);
    setIsProcessing(false);
    
    if (result.success) {
      toast.success('Transaction cancelled successfully!');
      onStatusChange?.();
      onClose();
    } else {
      toast.error(result.error || 'Failed to cancel transaction');
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pending' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle, label: 'Approved' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Cancelled' },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;

  const getConditionColor = (condition: string) => {
    const colors = {
      excellent: 'text-green-600 bg-green-50',
      good: 'text-blue-600 bg-blue-50',
      fair: 'text-yellow-600 bg-yellow-50',
      poor: 'text-red-600 bg-red-50',
    };
    return colors[condition as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const canCancel = transaction.status === 'pending' || transaction.status === 'approved';
  const canApprove = transaction.status === 'pending';
  const canComplete = transaction.status === 'pending' || transaction.status === 'approved';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            
            {/* Text and Status */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Trade-In Transaction Details</h2>
              <div className="flex items-center gap-4">
                <div className={`${statusConfig.bg} ${statusConfig.text} px-4 py-2 rounded-lg flex items-center gap-2`}>
                  <StatusIcon className="w-5 h-5" />
                  <span className="font-semibold">{statusConfig.label}</span>
                </div>
                {transaction.contract_signed && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-bold text-green-700">Contract Signed</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Status Alerts */}
          {transaction.status === 'completed' && !transaction.inventory_item_id && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <ShoppingCart className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-green-900">Ready for Inventory</div>
                <p className="text-sm text-green-700 mt-1">
                  This device can now be added to POS inventory and sold to customers.
                </p>
              </div>
            </div>
          )}
          
          {transaction.status !== 'completed' && transaction.status !== 'cancelled' && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-yellow-900">Not Ready for Sale</div>
                <p className="text-sm text-yellow-700 mt-1">
                  This device cannot be added to inventory or sold until an admin marks it as <strong>Completed</strong>.
                </p>
              </div>
            </div>
          )}

          {transaction.inventory_item_id && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-blue-900">Already in Inventory</div>
                <p className="text-sm text-blue-700 mt-1">
                  This device has been added to inventory and is available for sale in POS.
                </p>
              </div>
            </div>
          )}

          {/* Device Information Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 mb-6 border-2 border-blue-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Device Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-blue-200">
                <label className="text-xs font-medium text-gray-600">Device Name</label>
                <p className="text-base font-bold text-gray-900 mt-1">{transaction.device_name}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-blue-200">
                <label className="text-xs font-medium text-gray-600">Model</label>
                <p className="text-base font-bold text-gray-900 mt-1">{transaction.device_model}</p>
              </div>
              {transaction.device_imei && (
                <div className="bg-white rounded-xl p-4 border border-blue-200">
                  <label className="text-xs font-medium text-gray-600">IMEI</label>
                  <p className="text-base font-mono font-bold text-gray-900 mt-1">{transaction.device_imei}</p>
                </div>
              )}
              {transaction.device_serial_number && (
                <div className="bg-white rounded-xl p-4 border border-blue-200">
                  <label className="text-xs font-medium text-gray-600">Serial Number</label>
                  <p className="text-base font-mono font-bold text-gray-900 mt-1">{transaction.device_serial_number}</p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information Card */}
          {transaction.customer && (
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 mb-6 border-2 border-purple-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-purple-200">
                  <label className="text-xs font-medium text-gray-600">Name</label>
                  <p className="text-base font-bold text-gray-900 mt-1">{transaction.customer.name}</p>
                </div>
                {transaction.customer.phone && (
                  <div className="bg-white rounded-xl p-4 border border-purple-200">
                    <label className="text-xs font-medium text-gray-600">Phone</label>
                    <p className="text-base font-bold text-gray-900 mt-1">{transaction.customer.phone}</p>
                  </div>
                )}
                {transaction.customer.email && (
                  <div className="bg-white rounded-xl p-4 border border-purple-200">
                    <label className="text-xs font-medium text-gray-600">Email</label>
                    <p className="text-base font-bold text-gray-900 mt-1">{transaction.customer.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Condition & Pricing Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 mb-6 border-2 border-green-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Condition & Pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-xl p-4 border border-green-200">
                <label className="text-xs font-medium text-gray-600">Condition</label>
                <div className="mt-2">
                  <span className={`inline-flex px-4 py-2 rounded-lg font-bold capitalize ${getConditionColor(transaction.condition_rating)}`}>
                    {transaction.condition_rating}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-green-200">
                <label className="text-xs font-medium text-gray-600">Damage Deductions</label>
                <p className="text-base font-bold text-red-600 mt-1">
                  {transaction.total_damage_deductions > 0 
                    ? `-${format.money(transaction.total_damage_deductions)}`
                    : 'None'}
                </p>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="bg-white rounded-xl p-4 border border-green-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Base Trade-In Price:</span>
                <span className="text-base font-bold text-gray-900">
                  {format.money(transaction.base_trade_in_price)}
                </span>
              </div>
              {transaction.total_damage_deductions > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span className="text-sm">Damage Deductions:</span>
                  <span className="text-base font-bold">
                    -{format.money(transaction.total_damage_deductions)}
                  </span>
                </div>
              )}
              <div className="border-t border-green-300 pt-3 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Final Trade-In Value:</span>
                <span className="text-2xl font-bold text-green-700">
                  {format.money(transaction.final_trade_in_value)}
                </span>
              </div>
            </div>

            {/* Condition Flags */}
            <div className="mt-4 flex flex-wrap gap-3">
              {transaction.needs_repair && (
                <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg border border-purple-200">
                  <Wrench className="w-4 h-4" />
                  <span className="font-medium">Needs Repair</span>
                </div>
              )}
              {transaction.ready_for_resale && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
                  <Package className="w-4 h-4" />
                  <span className="font-medium">Ready for Resale</span>
                </div>
              )}
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Transaction Date</span>
              </div>
              <p className="text-base font-bold text-gray-900">
                {format.dateTime(new Date(transaction.created_at))}
              </p>
            </div>

            {transaction.transaction_number && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Hash className="w-4 h-4" />
                  <span className="text-sm font-medium">Transaction Number</span>
                </div>
                <p className="text-base font-mono font-bold text-gray-900">
                  {transaction.transaction_number}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {(transaction.staff_notes || transaction.internal_notes) && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                Notes
              </h3>
              {transaction.staff_notes && (
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-600">Staff Notes</label>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200 mt-1 whitespace-pre-wrap">
                    {transaction.staff_notes}
                  </p>
                </div>
              )}
              {transaction.internal_notes && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Internal Notes</label>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200 mt-1 whitespace-pre-wrap">
                    {transaction.internal_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex justify-between gap-3">
            <div className="flex gap-3">
              {canApprove && (
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                >
                  <CheckCircle className="w-5 h-5" />
                  {isProcessing ? 'Approving...' : 'Approve'}
                </button>
              )}
              
              {canComplete && (
                <button
                  onClick={handleComplete}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                >
                  <CheckCircle className="w-5 h-5" />
                  {isProcessing ? 'Completing...' : 'Complete'}
                </button>
              )}

              {canCancel && (
                <button
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                >
                  <XCircle className="w-5 h-5" />
                  Cancel Transaction
                </button>
              )}
            </div>
            
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              Close
            </button>
          </div>
        </div>

        {/* Cancel Confirmation Dialog */}
        {showCancelDialog && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-600" />
                Cancel Transaction
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to cancel this transaction? This action cannot be undone.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cancellation Reason *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter reason for cancellation..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCancelDialog(false);
                    setCancelReason('');
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isProcessing || !cancelReason.trim()}
                  className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeInDetailsModal;
