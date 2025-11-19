/**
 * Trade-In Details Modal
 * Displays comprehensive details of a trade-in transaction
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
} from 'lucide-react';
import type { TradeInTransaction } from '../../types/tradeIn';
import { format } from '../../lib/format';
import { approveTradeInTransaction, completeTradeInTransaction } from '../../lib/tradeInApi';
import { toast } from 'sonner';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface TradeInDetailsModalProps {
  transaction: TradeInTransaction;
  onClose: () => void;
  onStatusChange?: () => void; // Callback to refresh the list after status change
}

const TradeInDetailsModal: React.FC<TradeInDetailsModalProps> = ({ transaction, onClose, onStatusChange }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Prevent body scroll when modal is open
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Smartphone className="w-7 h-7 text-blue-600" />
              Trade-In Details
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Transaction #{transaction.transaction_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Banner */}
          <div className={`${statusConfig.bg} ${statusConfig.text} rounded-lg p-4 flex items-center gap-3`}>
            <StatusIcon className="w-6 h-6" />
            <div>
              <div className="font-semibold text-lg">{statusConfig.label}</div>
              {transaction.contract_signed && (
                <div className="text-sm flex items-center gap-1 mt-1">
                  <CheckCircle className="w-4 h-4" />
                  Contract Signed
                </div>
              )}
            </div>
          </div>

          {/* Inventory Status Info */}
          {transaction.status === 'completed' && !transaction.inventory_item_id && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <ShoppingCart className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-semibold text-green-900">Ready for Inventory</div>
                <p className="text-sm text-green-700 mt-1">
                  This device can now be added to POS inventory and sold to customers.
                </p>
              </div>
            </div>
          )}
          
          {transaction.status !== 'completed' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-semibold text-yellow-900">Not Ready for Sale</div>
                <p className="text-sm text-yellow-700 mt-1">
                  This device cannot be added to inventory or sold until an admin marks it as <strong>Completed</strong>.
                  {transaction.status === 'pending' && ' Please approve and complete this transaction first.'}
                  {transaction.status === 'approved' && ' Please complete this transaction to proceed.'}
                </p>
              </div>
            </div>
          )}

          {transaction.inventory_item_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-semibold text-blue-900">Already in Inventory</div>
                <p className="text-sm text-blue-700 mt-1">
                  This device has been added to inventory and is available for sale in POS.
                </p>
              </div>
            </div>
          )}

          {/* Device Information */}
          <div className="bg-gray-50 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Device Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Device Name</label>
                <p className="text-base font-semibold text-gray-900 mt-1">{transaction.device_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Model</label>
                <p className="text-base font-semibold text-gray-900 mt-1">{transaction.device_model}</p>
              </div>
              {transaction.device_imei && (
                <div>
                  <label className="text-sm font-medium text-gray-600">IMEI</label>
                  <p className="text-base font-mono text-gray-900 mt-1">{transaction.device_imei}</p>
                </div>
              )}
              {transaction.device_serial_number && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Serial Number</label>
                  <p className="text-base font-mono text-gray-900 mt-1">{transaction.device_serial_number}</p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          {transaction.customer && (
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-base font-semibold text-gray-900 mt-1">{transaction.customer.name}</p>
                </div>
                {transaction.customer.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-base text-gray-900 mt-1">{transaction.customer.phone}</p>
                  </div>
                )}
                {transaction.customer.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-base text-gray-900 mt-1">{transaction.customer.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Condition Assessment */}
          <div className="bg-gray-50 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              Condition Assessment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Overall Condition</label>
                <div className="mt-2">
                  <span className={`inline-flex px-4 py-2 rounded-lg font-semibold capitalize ${getConditionColor(transaction.condition_rating)}`}>
                    {transaction.condition_rating}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Damage Deductions</label>
                <p className="text-base font-semibold text-red-600 mt-1">
                  {transaction.total_damage_deductions > 0 
                    ? `-${format.money(transaction.total_damage_deductions)}`
                    : 'None'}
                </p>
              </div>
            </div>

            {/* Condition Flags */}
            <div className="mt-4 flex flex-wrap gap-3">
              {transaction.needs_repair && (
                <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg">
                  <Wrench className="w-4 h-4" />
                  <span className="font-medium">Needs Repair</span>
                </div>
              )}
              {transaction.ready_for_resale && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg">
                  <Package className="w-4 h-4" />
                  <span className="font-medium">Ready for Resale</span>
                </div>
              )}
            </div>

            {/* Damage Notes */}
            {transaction.damage_notes && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-600">Damage Notes</label>
                <p className="text-sm text-gray-900 mt-1 bg-white p-3 rounded border border-gray-200">
                  {transaction.damage_notes}
                </p>
              </div>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Pricing Breakdown
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Base Trade-In Price:</span>
                <span className="text-base font-semibold text-gray-900">
                  {format.money(transaction.base_trade_in_price)}
                </span>
              </div>
              {transaction.total_damage_deductions > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span className="text-sm">Damage Deductions:</span>
                  <span className="text-base font-semibold">
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
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Transaction Date</span>
              </div>
              <p className="text-base font-semibold text-gray-900">
                {format.dateTime(new Date(transaction.created_at))}
              </p>
            </div>

            {transaction.transaction_number && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Hash className="w-4 h-4" />
                  <span className="text-sm font-medium">Transaction Number</span>
                </div>
                <p className="text-base font-mono font-semibold text-gray-900">
                  {transaction.transaction_number}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {transaction.notes && (
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Additional Notes
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-4 rounded border border-gray-200">
                {transaction.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-between">
          <div className="flex gap-3">
            {/* Show Approve button if status is pending */}
            {transaction.status === 'pending' && (
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {isProcessing ? 'Approving...' : 'Approve Transaction'}
              </button>
            )}
            
            {/* Show Complete button if status is pending or approved */}
            {(transaction.status === 'pending' || transaction.status === 'approved') && (
              <button
                onClick={handleComplete}
                disabled={isProcessing}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {isProcessing ? 'Completing...' : 'Complete Transaction'}
              </button>
            )}
          </div>
          
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeInDetailsModal;

