/**
 * CountryBadge Component
 * Reusable component for displaying country with flag icon
 */
import React from 'react';
import { getCountryFlag } from '../utils/countryFlags';
import { Globe } from 'lucide-react';

export interface CountryBadgeProps {
  country?: string | null;
  city?: string | null;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'inline' | 'badge' | 'pill';
  showIcon?: boolean;
  showFlag?: boolean;
  showCity?: boolean;
}

/**
 * CountryBadge - Display country with flag in various styles
 * 
 * @example
 * // Default usage
 * <CountryBadge country="Tanzania" />
 * 
 * // With city
 * <CountryBadge country="China" city="Guangzhou" />
 * 
 * // As a badge
 * <CountryBadge country="UAE" variant="badge" />
 * 
 * // Small inline
 * <CountryBadge country="Kenya" variant="inline" size="sm" />
 */
const CountryBadge: React.FC<CountryBadgeProps> = ({
  country,
  city,
  className = '',
  size = 'md',
  variant = 'default',
  showIcon = false,
  showFlag = true,
  showCity = true,
}) => {
  // Return null if no country data
  if (!country && !city) return null;

  // Size classes
  const sizeClasses = {
    xs: {
      text: 'text-xs',
      flag: 'text-sm',
      icon: 'w-2.5 h-2.5',
      padding: 'px-1.5 py-0.5',
      gap: 'gap-1',
    },
    sm: {
      text: 'text-xs',
      flag: 'text-base',
      icon: 'w-3 h-3',
      padding: 'px-2 py-0.5',
      gap: 'gap-1',
    },
    md: {
      text: 'text-sm',
      flag: 'text-lg',
      icon: 'w-3.5 h-3.5',
      padding: 'px-2.5 py-1',
      gap: 'gap-1.5',
    },
    lg: {
      text: 'text-base',
      flag: 'text-xl',
      icon: 'w-4 h-4',
      padding: 'px-3 py-1.5',
      gap: 'gap-2',
    },
  };

  const currentSize = sizeClasses[size];

  // Variant styles
  const variantClasses = {
    default: `inline-flex items-center ${currentSize.gap}`,
    inline: `inline-flex items-center ${currentSize.gap}`,
    badge: `inline-flex items-center ${currentSize.gap} ${currentSize.padding} bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-700 rounded-lg font-medium border border-blue-200`,
    pill: `inline-flex items-center ${currentSize.gap} ${currentSize.padding} bg-gray-100 text-gray-700 rounded-full font-medium`,
  };

  const flag = country ? getCountryFlag(country) : '🌍';

  return (
    <span className={`${variantClasses[variant]} ${className}`}>
      {showIcon && (
        <Globe className={`${currentSize.icon} text-gray-400`} />
      )}
      
      {showFlag && (
        <span className={`${currentSize.flag} leading-none`} role="img" aria-label={`${country} flag`}>
          {flag}
        </span>
      )}
      
      <span className={`${currentSize.text}`}>
        {showCity && city && country 
          ? `${city}, ${country}` 
          : city || country || 'Unknown'
        }
      </span>
    </span>
  );
};

export default CountryBadge;

/**
 * CountryFlag - Simple flag emoji component
 */
export const CountryFlag: React.FC<{
  country?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ country, size = 'md', className = '' }) => {
  if (!country) return null;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const flag = getCountryFlag(country);

  return (
    <span 
      className={`${sizeClasses[size]} leading-none ${className}`}
      role="img" 
      aria-label={`${country} flag`}
    >
      {flag}
    </span>
  );
};

/**
 * CountrySelector - Enhanced select/dropdown option component
 */
export const CountryOption: React.FC<{
  country: string;
  selected?: boolean;
  onClick?: () => void;
}> = ({ country, selected = false, onClick }) => {
  const flag = getCountryFlag(country);

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
        selected 
          ? 'bg-blue-50 text-blue-700 font-medium' 
          : 'hover:bg-gray-50'
      }`}
    >
      <span className="text-lg leading-none">{flag}</span>
      <span className="text-sm">{country}</span>
    </div>
  );
};

