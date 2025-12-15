import React, { ReactNode } from 'react';

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'filled';
}

export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'default'
}) => {
  
  const baseClasses = 'overflow-hidden transition-all duration-300 rounded-2xl';
  const interactiveClasses = onClick
    ? 'cursor-pointer active:scale-[0.98] transform'
    : '';
  
  const variantClasses = {
    default: 'bg-white shadow-sm border border-neutral-100 hover:shadow-md',
    elevated: 'bg-white shadow-lg shadow-neutral-200/50 hover:shadow-xl hover:shadow-neutral-300/50',
    filled: 'bg-gradient-to-br from-neutral-50 to-white border border-neutral-100/30'
  };
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${interactiveClasses} ${className}`}
      onClick={onClick}
      style={{
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </div>
  );
};

interface MobileCardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export const MobileCardHeader: React.FC<MobileCardHeaderProps> = ({
  title,
  subtitle,
  action,
  icon
}) => {
  
  return (
    <div className="flex items-start justify-between px-4 pt-4 pb-3">
      <div className="flex items-start flex-1 gap-3">
        {icon && (
          <div className="flex-shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-neutral-900 tracking-tight text-[18px]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-neutral-500 leading-tight text-[14px] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0 ml-3">{action}</div>}
    </div>
  );
};

interface MobileCardBodyProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const MobileCardBody: React.FC<MobileCardBodyProps> = ({
  children,
  className = '',
  noPadding = false
}) => {
  
  return (
    <div className={className} style={{
      padding: noPadding ? '0' : '0 16px 16px'
    }}>
      {children}
    </div>
  );
};

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'purple' | 'warning' | 'danger';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  trend,
  color = 'primary',
  onClick
}) => {
  
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    purple: 'bg-purple-50 text-purple-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600'
  };

  return (
    <MobileCard onClick={onClick} variant="elevated">
      <div className="p-4">
        <div 
          className={`flex items-center justify-center w-12 h-12 rounded-lg mb-3 ${colorClasses[color]}`}
        >
          {icon}
        </div>
        <p className="text-neutral-500 font-medium text-[14px] mb-1">
          {label}
        </p>
        <div className="flex items-end justify-between">
          <p className="font-bold text-neutral-900 tracking-tight text-[28px]">
            {value}
          </p>
          {trend && (
            <div className={`flex items-center font-semibold text-[14px] gap-1 ${
              trend.isPositive ? 'text-success-600' : 'text-danger-600'
            }`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </div>
    </MobileCard>
  );
};
