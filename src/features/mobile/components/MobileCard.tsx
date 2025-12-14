import React, { ReactNode } from 'react';
import { useResponsiveSizes } from '../../../hooks/useResponsiveSize';

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
  const sizes = useResponsiveSizes();
  
  const baseClasses = 'overflow-hidden transition-all duration-300';
  const interactiveClasses = onClick 
    ? 'cursor-pointer active:scale-[0.98] transform' 
    : '';
  
  const variantClasses = {
    default: 'bg-white shadow-sm border border-gray-100/50 hover:shadow-md',
    elevated: 'bg-white shadow-lg shadow-gray-200/50 hover:shadow-xl hover:shadow-gray-300/50',
    filled: 'bg-gradient-to-br from-gray-50 to-white border border-gray-100/30'
  };
  
  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${interactiveClasses} ${className}`}
      onClick={onClick}
      style={{
        WebkitTapHighlightColor: 'transparent',
        borderRadius: `${sizes.radiusXl}px`
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
  const sizes = useResponsiveSizes();
  
  return (
    <div className="flex items-start justify-between" style={{
      padding: `${sizes.spacing5}px ${sizes.spacing5}px ${sizes.spacing4}px`
    }}>
      <div className="flex items-start flex-1" style={{ gap: `${sizes.spacing3}px` }}>
        {icon && (
          <div className="flex-shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 tracking-tight" style={{
            fontSize: `${sizes.textLg}px`
          }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-gray-500 leading-tight" style={{
              fontSize: `${sizes.textSm}px`,
              marginTop: `${sizes.spacing1}px`
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0" style={{ marginLeft: `${sizes.spacing3}px` }}>{action}</div>}
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
  const sizes = useResponsiveSizes();
  
  return (
    <div className={className} style={{
      padding: noPadding ? '0' : `0 ${sizes.spacing5}px ${sizes.spacing5}px`
    }}>
      {children}
    </div>
  );
};

// iOS 17 style stat card
interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  trend,
  color = 'blue',
  onClick
}) => {
  const sizes = useResponsiveSizes();
  
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <MobileCard onClick={onClick} variant="elevated">
      <div style={{ padding: `${sizes.spacing5}px` }}>
        <div 
          className={`flex items-center justify-center ${colorClasses[color]}`}
          style={{
            width: `${sizes.avatarSize}px`,
            height: `${sizes.avatarSize}px`,
            borderRadius: `${sizes.radiusLg}px`,
            marginBottom: `${sizes.spacing4}px`
          }}
        >
          {icon}
        </div>
        <p className="text-gray-500 font-medium" style={{
          fontSize: `${sizes.textSm}px`,
          marginBottom: `${sizes.spacing1}px`
        }}>
          {label}
        </p>
        <div className="flex items-end justify-between">
          <p className="font-bold text-gray-900 tracking-tight" style={{
            fontSize: `${sizes.text3xl}px`
          }}>
            {value}
          </p>
          {trend && (
            <div className={`flex items-center font-semibold ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`} style={{
              gap: `${sizes.spacing1}px`,
              fontSize: `${sizes.textSm}px`
            }}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </div>
    </MobileCard>
  );
};

