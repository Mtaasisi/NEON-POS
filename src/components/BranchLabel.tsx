import React from 'react';
import { Building2 } from 'lucide-react';

interface BranchLabelProps {
  branchName?: string;
  branchId?: string;
  variant?: 'badge' | 'text' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * BranchLabel Component
 * 
 * Displays which branch originally created a customer
 * Note: Customers are SHARED across branches - this is just a label for tracking
 * 
 * @example
 * <BranchLabel branchName="ARUSHA" variant="badge" />
 * <BranchLabel branchName="Main Store" variant="text" size="sm" />
 */
const BranchLabel: React.FC<BranchLabelProps> = ({
  branchName,
  branchId,
  variant = 'badge',
  size = 'sm',
  className = ''
}) => {
  // Don't render if no branch name
  if (!branchName) return null;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Badge variant - colorful pill
  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full ${sizeClasses[size]} font-medium ${className}`}
        title={`Customer created by ${branchName} branch`}
      >
        <Building2 className={iconSizes[size]} />
        {branchName}
      </span>
    );
  }

  // Text variant - subtle gray text
  if (variant === 'text') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-gray-500 ${sizeClasses[size]} ${className}`}
        title={`Customer created by ${branchName} branch`}
      >
        <Building2 className={iconSizes[size]} />
        <span>Added by: {branchName}</span>
      </span>
    );
  }

  // Icon variant - just icon with tooltip
  if (variant === 'icon') {
    return (
      <div
        className={`inline-flex items-center gap-1 text-gray-400 ${className}`}
        title={`Customer created by ${branchName} branch`}
      >
        <Building2 className={iconSizes[size]} />
        <span className={`${sizeClasses[size]} text-gray-500`}>{branchName}</span>
      </div>
    );
  }

  return null;
};

export default BranchLabel;

