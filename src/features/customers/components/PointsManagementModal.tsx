import React, { useState } from 'react';
import { X, Gift, Plus, Minus, Award } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface PointsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  currentPoints: number;
  loyaltyLevel: string;
  onPointsUpdated: (newPoints: number) => void;
}

const PointsManagementModal: React.FC<PointsManagementModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  currentPoints,
  loyaltyLevel,
  onPointsUpdated
}) => {
  const [pointsToAdd, setPointsToAdd] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleAddPoints = async () => {
    if (pointsToAdd === 0) {
      toast.error('Please enter a valid points amount');
      return;
    }

    setIsProcessing(true);
    try {
      const newPoints = currentPoints + pointsToAdd;

      // Update customer points
      const { error } = await supabase
        .from('customers')
        .update({ 
          points: newPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (error) throw error;

      // Log the points transaction (optional - create table if needed)
      try {
        await supabase
          .from('customer_points_history')
          .insert({
            customer_id: customerId,
            points_change: pointsToAdd,
            new_balance: newPoints,
            reason: reason || 'Manual adjustment',
            created_at: new Date().toISOString()
          });
      } catch (logError) {
        // Ignore if table doesn't exist
        console.warn('Could not log points history:', logError);
      }

      toast.success(`${pointsToAdd > 0 ? 'Added' : 'Deducted'} ${Math.abs(pointsToAdd)} points`);
      onPointsUpdated(newPoints);
      setPointsToAdd(0);
      setReason('');
      onClose();
    } catch (error: any) {
      console.error('Error updating points:', error);
      toast.error('Failed to update points: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Points</h2>
              <p className="text-sm text-gray-600">{customerName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Points Display */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Current Points</p>
                <p className="text-3xl font-bold text-purple-900">{currentPoints}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-700 font-medium">Loyalty Level</p>
                <p className="text-lg font-semibold text-purple-900">{loyaltyLevel}</p>
              </div>
            </div>
          </div>

          {/* Points Adjustment */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points to Add/Deduct
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPointsToAdd(prev => prev - 10)}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={pointsToAdd}
                  onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center text-lg font-semibold"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => setPointsToAdd(prev => prev + 10)}
                  className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                New balance: {currentPoints + pointsToAdd} points
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPointsToAdd(50)}
                className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors text-sm font-medium"
              >
                +50
              </button>
              <button
                type="button"
                onClick={() => setPointsToAdd(100)}
                className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors text-sm font-medium"
              >
                +100
              </button>
              <button
                type="button"
                onClick={() => setPointsToAdd(200)}
                className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors text-sm font-medium"
              >
                +200
              </button>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., Loyalty reward, Compensation, Birthday bonus..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleAddPoints}
            disabled={isProcessing || pointsToAdd === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <Award className="w-4 h-4" />
                {pointsToAdd > 0 ? 'Add' : 'Deduct'} Points
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointsManagementModal;

