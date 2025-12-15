import React from 'react';

interface ProgressIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  size = 'md',
  color = '#64748b',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full border-2 border-gray-200 transition-all duration-200 ease-in-out`}
        style={{
          borderTopColor: color,
          borderRightColor: color,
          animation: 'spin 1s linear infinite',
        }}
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default ProgressIndicator;
