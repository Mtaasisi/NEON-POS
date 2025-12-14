import React from 'react';
import { Copy, RefreshCw, Clock, Calendar as CalendarIcon, Zap } from 'lucide-react';

interface QuickActionButton {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  tooltip?: string;
}

interface QuickActionButtonsProps {
  actions: QuickActionButton[];
  className?: string;
}

const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({
  actions,
  className = '',
}) => {
  const getVariantClasses = (variant: string = 'secondary') => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {actions.map((action, index) => (
        <button
          key={index}
          type="button"
          onClick={action.action}
          title={action.tooltip || action.label}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all hover:shadow-sm ${getVariantClasses(
            action.variant
          )}`}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
};

// Pre-defined quick actions for common use cases
export const commonQuickActions = {
  copyFromLast: (onCopy: () => void): QuickActionButton => ({
    label: 'Copy from Last',
    icon: <Copy size={16} />,
    action: onCopy,
    variant: 'secondary',
    tooltip: 'Copy data from the last entry',
  }),

  useMyInfo: (onUse: () => void): QuickActionButton => ({
    label: 'Use My Info',
    icon: <Zap size={16} />,
    action: onUse,
    variant: 'primary',
    tooltip: 'Autofill with your information',
  }),

  todayPlusWeek: (onSet: () => void): QuickActionButton => ({
    label: 'Today + 7 Days',
    icon: <CalendarIcon size={16} />,
    action: onSet,
    variant: 'success',
    tooltip: 'Set date to 7 days from today',
  }),

  nowPlusHour: (onSet: () => void): QuickActionButton => ({
    label: 'In 1 Hour',
    icon: <Clock size={16} />,
    action: onSet,
    variant: 'warning',
    tooltip: 'Set time to 1 hour from now',
  }),

  reset: (onReset: () => void): QuickActionButton => ({
    label: 'Reset',
    icon: <RefreshCw size={16} />,
    action: onReset,
    variant: 'secondary',
    tooltip: 'Reset form to default values',
  }),
};

export default QuickActionButtons;

