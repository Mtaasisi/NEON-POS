import React, { ReactNode } from 'react';

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
  
  const baseClasses = 'font-semibold transition-all flex items-center justify-center -webkit-tap-highlight-color: transparent rounded-xl';
  
  const variantClasses = {
    primary: 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-md disabled:bg-neutral-300',
    secondary: 'bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-700 disabled:bg-neutral-100 disabled:text-neutral-400',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 active:bg-primary-100 disabled:border-neutral-300 disabled:text-neutral-400',
    danger: 'bg-danger-500 hover:bg-danger-600 active:bg-danger-700 text-white shadow-md disabled:bg-neutral-300'
  };

  // Fixed sizing based on size prop
  const sizeClasses = {
    sm: 'px-3 py-2 text-[13px] gap-1 min-h-[36px]',
    md: 'px-4 py-3 text-[15px] gap-2 min-h-[44px]',
    lg: 'px-6 py-4 text-[17px] gap-3 min-h-[52px]'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${sizeClasses[size]}
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
