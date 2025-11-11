import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'white';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  color = 'blue',
  text
}) => {
  // Size mappings
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  // Color mappings for the spinner
  const colorClasses = {
    blue: {
      primary: 'border-blue-500',
      secondary: 'border-blue-200',
      text: 'text-blue-600'
    },
    green: {
      primary: 'border-green-500',
      secondary: 'border-green-200',
      text: 'text-green-600'
    },
    purple: {
      primary: 'border-purple-500',
      secondary: 'border-purple-200',
      text: 'text-purple-600'
    },
    orange: {
      primary: 'border-orange-500',
      secondary: 'border-orange-200',
      text: 'text-orange-600'
    },
    white: {
      primary: 'border-white',
      secondary: 'border-white/30',
      text: 'text-white'
    }
  };

  const colors = colorClasses[color];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Circular Loading Spinner */}
      <div className="relative">
        {/* Background circle (light/faded) */}
        <div 
          className={`${sizeClasses[size]} rounded-full border-4 ${colors.secondary}`}
        />
        
        {/* Progress circle (vibrant blue) */}
        <div 
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-4 ${colors.primary} border-t-transparent border-r-transparent animate-spin`}
          style={{
            borderTopColor: 'transparent',
            borderRightColor: 'transparent'
          }}
        />
      </div>

      {/* Optional text */}
      {text && (
        <p className={`mt-3 font-medium ${colors.text} ${textSizeClasses[size]}`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;

