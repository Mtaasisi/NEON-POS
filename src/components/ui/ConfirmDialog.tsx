/**
 * Confirmation Dialog Component
 * Beautiful, accessible confirmation dialogs
 */

import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';
import { useModal } from '../../utils/modalManager';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export type ConfirmType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
  isLoading?: boolean;
}

const typeConfig = {
  danger: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    buttonColor: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
  },
  info: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    buttonColor: 'bg-green-600 hover:bg-green-700',
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false,
}) => {
  // Prevent body scroll when dialog is open
  useBodyScrollLock(isOpen);
  
  const { handleBackdropClick } = useModal(isOpen, onClose);
  const config = typeConfig[type];
  const Icon = config.icon;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${config.buttonColor}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to use confirmation dialog
 */
export const useConfirm = () => {
  const [state, setState] = React.useState<{
    isOpen: boolean;
    resolve?: (value: boolean) => void;
    config?: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>;
  }>({ isOpen: false });

  const confirm = (
    config: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ isOpen: true, resolve, config });
    });
  };

  const handleClose = () => {
    state.resolve?.(false);
    setState({ isOpen: false });
  };

  const handleConfirm = () => {
    state.resolve?.(true);
    setState({ isOpen: false });
  };

  const ConfirmComponent = state.config ? (
    <ConfirmDialog
      {...state.config}
      isOpen={state.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
    />
  ) : null;

  return { confirm, ConfirmComponent };
};

