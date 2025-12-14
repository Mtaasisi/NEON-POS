import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Settings, AlertCircle } from 'lucide-react';
import { SparePart } from '../../types/spareParts';
import { toast } from 'react-hot-toast';

interface SparePartStockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  sparePart: SparePart | null;
  onAdjust: (adjustmentType: 'in' | 'out' | 'set', quantity: number, reason: string, notes?: string) => void;
}

const SparePartStockAdjustModal: React.FC<SparePartStockAdjustModalProps> = ({
  isOpen,
  onClose,
  sparePart,
  onAdjust
}) => {
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out' | 'set'>('in');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const reasonOptions = [
    'Purchase Order',
    'Sale',
    'Return',
    'Damaged Goods',
    'Expired Goods',
    'Theft/Loss',
    'Manual Adjustment',
    'Location Transfer',
    'Stock Audit',
    'Other'
  ];

  useEffect(() => {
    if (isOpen && sparePart) {
      setAdjustmentType('in');
      setQuantity(0);
      setReason('');
      setNotes('');
    }
  }, [isOpen, sparePart]);

  if (!isOpen || !sparePart) return null;

  const getNewStockLevel = (): number => {
    if (adjustmentType === 'in') return sparePart.quantity + quantity;
    if (adjustmentType === 'out') return Math.max(0, sparePart.quantity - quantity);
    return quantity;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (adjustmentType === 'out' && quantity > sparePart.quantity) {
      toast.error('Cannot remove more than available quantity');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    onAdjust(adjustmentType, quantity, reason, notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Adjust Stock</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Spare Part</p>
            <p className="font-semibold text-gray-900">{sparePart.name}</p>
            <p className="text-sm text-gray-500">Current Stock: {sparePart.quantity}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Adjustment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjustment Type *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentType('in')}
                  className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                    adjustmentType === 'in'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                  }`}
                >
                  <Plus className="w-5 h-5 mx-auto mb-1" />
                  Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('out')}
                  className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                    adjustmentType === 'out'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                  }`}
                >
                  <Minus className="w-5 h-5 mx-auto mb-1" />
                  Remove Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('set')}
                  className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                    adjustmentType === 'set'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  <Settings className="w-5 h-5 mx-auto mb-1" />
                  Set Stock
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(0, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-gray-700 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={quantity <= 0}
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  type="number"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  min={0}
                  step={1}
                  placeholder="0"
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-xl font-bold bg-white text-center"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-gray-700 hover:text-blue-700"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {adjustmentType === 'set' 
                  ? 'Set stock to this quantity'
                  : adjustmentType === 'in'
                  ? 'Add to current stock'
                  : 'Remove from current stock'}
              </p>
              {getNewStockLevel() !== sparePart.quantity && (
                <p className="text-sm font-medium text-blue-600 mt-1">
                  New Stock Level: {getNewStockLevel()}
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 bg-white"
                required
              >
                <option value="">Select a reason</option>
                {reasonOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 bg-white"
                placeholder="Additional notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
              >
                Adjust Stock
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SparePartStockAdjustModal;

