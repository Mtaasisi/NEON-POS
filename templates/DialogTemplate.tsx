/**
 * [YourFeature]Dialog.tsx
 * 
 * Use this template for simple confirmation, alert, or prompt dialogs
 */

import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export type DialogType = 'warning' | 'danger' | 'info' | 'success';

interface [YourFeature]DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

const [YourFeature]Dialog: React.FC<[YourFeature]DialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false
}) => {
  // ✅ MANDATORY: Add scroll lock
  useBodyScrollLock(isOpen);
  
  if (!isOpen) return null;

  // Icon based on type
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <XCircle className="w-8 h-8 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'info':
        return <Info className="w-8 h-8 text-blue-500" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-amber-500" />;
    }
  };

  // Button color based on type
  const getButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-amber-600 hover:bg-amber-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            
            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={loading}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${getButtonClass()}`}
                disabled={loading}
              >
                {loading ? 'Processing...' : confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default [YourFeature]Dialog;

/**
 * USAGE:
 * 
 * <[YourFeature]Dialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this item?"
 *   type="danger"
 * />
 */

