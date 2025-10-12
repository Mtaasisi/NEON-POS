/**
 * Improved Toast System
 * Better notifications with actions and icons
 */

import React from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  error: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  info: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
};

const CustomToast: React.FC<{
  type: ToastType;
  title?: string;
  message: string;
  action?: ToastOptions['action'];
  onDismiss: () => void;
}> = ({ type, title, message, action, onDismiss }) => {
  const config = toastConfig[type];
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${config.bgColor} ${config.borderColor} shadow-lg min-w-[300px] max-w-md`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`font-semibold ${config.color} mb-1`}>{title}</p>
        )}
        <p className="text-sm text-gray-700 break-words">{message}</p>
        {action && (
          <button
            onClick={() => {
              action.onClick();
              onDismiss();
            }}
            className={`mt-2 text-sm font-medium ${config.color} hover:underline`}
          >
            {action.label} →
          </button>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Enhanced toast functions
 */
export const showToast = {
  success: (options: ToastOptions) => {
    toast.custom(
      (t) => (
        <CustomToast
          type="success"
          title={options.title}
          message={options.message}
          action={options.action}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      { duration: options.duration || 4000 }
    );
  },

  error: (options: ToastOptions) => {
    toast.custom(
      (t) => (
        <CustomToast
          type="error"
          title={options.title}
          message={options.message}
          action={options.action}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      { duration: options.duration || 6000 }
    );
  },

  warning: (options: ToastOptions) => {
    toast.custom(
      (t) => (
        <CustomToast
          type="warning"
          title={options.title}
          message={options.message}
          action={options.action}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      { duration: options.duration || 5000 }
    );
  },

  info: (options: ToastOptions) => {
    toast.custom(
      (t) => (
        <CustomToast
          type="info"
          title={options.title}
          message={options.message}
          action={options.action}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      { duration: options.duration || 4000 }
    );
  },
};

/**
 * Enhanced Toaster component
 */
export const EnhancedToaster: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className: '',
        style: {
          background: 'transparent',
          boxShadow: 'none',
        },
      }}
    />
  );
};

