import React, { ReactNode } from 'react';
import { useResponsiveSizes } from '../../../hooks/useResponsiveSize';

interface MobileButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const MobileButton: React.FC<MobileButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  icon,
  type = 'button',
  className = ''
}) => {
  const sizes = useResponsiveSizes();
  
  const baseClasses = 'font-semibold transition-all flex items-center justify-center touch-target';
  
  const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white shadow-md disabled:bg-gray-300',
    secondary: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400',
    outline: 'border-2 border-blue-500 text-blue-500 hover:bg-blue-50 active:bg-blue-100 disabled:border-gray-300 disabled:text-gray-400',
    danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-md disabled:bg-gray-300'
  };

  // Responsive sizing based on size prop
  const getButtonStyles = () => {
    const baseStyle: React.CSSProperties = {
      borderRadius: `${sizes.radiusMd}px`,
      minHeight: `${sizes.buttonHeight}px`,
      WebkitTapHighlightColor: 'transparent'
    };

    switch (size) {
      case 'sm':
        return {
          ...baseStyle,
          padding: `${sizes.spacing2}px ${sizes.spacing3}px`,
          fontSize: `${sizes.textSm}px`,
          gap: `${sizes.spacing1}px`,
          minHeight: `${sizes.buttonHeight * 0.85}px`
        };
      case 'lg':
        return {
          ...baseStyle,
          padding: `${sizes.spacing4}px ${sizes.spacing6}px`,
          fontSize: `${sizes.textLg}px`,
          gap: `${sizes.spacing3}px`,
          minHeight: `${sizes.buttonHeight * 1.15}px`
        };
      default: // 'md'
        return {
          ...baseStyle,
          padding: `${sizes.spacing3}px ${sizes.spacing4}px`,
          fontSize: `${sizes.textBase}px`,
          gap: `${sizes.spacing2}px`
        };
    }
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={getButtonStyles()}
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${widthClass}
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
        ${className}
      `}
    >
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export default MobileButton;

