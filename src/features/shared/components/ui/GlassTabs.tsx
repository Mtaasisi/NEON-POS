import React, { useState } from 'react';
import { cn } from '../../../../lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: string | number; // Optional badge for tab
  description?: string; // Optional description for modern variant
}

interface GlassTabsProps {
  tabs: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline' | 'modern' | 'cards';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

const GlassTabs: React.FC<GlassTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  size = 'md',
  className,
  children
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(activeTab || tabs[0]?.id);

  const currentActiveTab = activeTab || internalActiveTab;

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
  };

  const tabClasses = cn(
    'flex transition-all duration-200',
    {
      'border-b border-gray-200': variant === 'default',
      'bg-gray-100 rounded-lg p-1': variant === 'pills',
      'border-b-2 border-gray-200': variant === 'underline',
      'bg-white rounded-2xl border-2 border-gray-200 p-2 shadow-sm': variant === 'modern',
      'grid gap-3': variant === 'cards',
    },
    variant === 'cards' && (size === 'sm' ? 'grid-cols-2' : size === 'lg' ? 'grid-cols-4' : 'grid-cols-3'),
    className
  );

  const getTabButtonClasses = (isActive: boolean, isDisabled: boolean) => {
    // Modern variant has special styling
    if (variant === 'modern') {
      return cn(
        'flex items-center justify-center gap-3 font-semibold transition-all duration-300 rounded-xl relative overflow-hidden',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        {
          // Sizes
          'px-4 py-2.5 text-sm': size === 'sm',
          'px-6 py-3.5 text-base': size === 'md',
          'px-8 py-4 text-lg': size === 'lg',
          
          // States
          'opacity-50 cursor-not-allowed': isDisabled,
          'cursor-pointer': !isDisabled,
          
          // Active state - gradient background with shadow
          'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl': isActive && !isDisabled,
          
          // Inactive state - subtle background with hover
          'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900': !isActive && !isDisabled,
        }
      );
    }

    // Cards variant has special styling
    if (variant === 'cards') {
      return cn(
        'flex flex-col items-center justify-center gap-2 font-semibold transition-all duration-300 rounded-2xl border-2 p-6 relative overflow-hidden group',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        {
          // Sizes
          'p-4 text-sm': size === 'sm',
          'p-6 text-base': size === 'md',
          'p-8 text-lg': size === 'lg',
          
          // States
          'opacity-50 cursor-not-allowed': isDisabled,
          'cursor-pointer': !isDisabled,
          
          // Active state - gradient border with shadow
          'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-700 shadow-lg hover:shadow-xl': isActive && !isDisabled,
          
          // Inactive state - subtle background with hover
          'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-md': !isActive && !isDisabled,
        }
      );
    }

    // Default, pills, and underline variants
    return cn(
      'flex items-center gap-2 font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
      {
        // Sizes
        'px-3 py-2 text-sm': size === 'sm',
        'px-4 py-3 text-base': size === 'md',
        'px-6 py-4 text-lg': size === 'lg',
        
        // Variants
        'border-b-2': variant === 'default' || variant === 'underline',
        'rounded-md': variant === 'pills',
        
        // States
        'opacity-50 cursor-not-allowed': isDisabled,
        'cursor-pointer hover:bg-gray-50': !isDisabled,
        
        // Active states by variant
        'border-blue-500 text-blue-600 bg-blue-50': isActive && variant === 'default',
        'bg-white text-gray-900 shadow-sm': isActive && variant === 'pills',
        'border-blue-500 text-blue-600': isActive && variant === 'underline',
        
        // Inactive states
        'border-transparent text-gray-600': !isActive && (variant === 'default' || variant === 'underline'),
        'text-gray-600': !isActive && variant === 'pills',
      }
    );
  };

  return (
    <div className="w-full">
      <div className={tabClasses}>
        {tabs.map((tab) => {
          const isActive = currentActiveTab === tab.id;
          
          // Cards variant has special layout
          if (variant === 'cards') {
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && handleTabClick(tab.id)}
                className={getTabButtonClasses(isActive, !!tab.disabled)}
                disabled={tab.disabled}
              >
                {tab.icon && (
                  <div className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300',
                    isActive 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                  )}>
                    {tab.icon}
                  </div>
                )}
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold">{tab.label}</span>
                  {tab.description && (
                    <span className="text-xs opacity-70 text-center">{tab.description}</span>
                  )}
                </div>
                {tab.badge && (
                  <span className={cn(
                    'absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold',
                    isActive 
                      ? 'bg-white text-blue-600' 
                      : 'bg-blue-100 text-blue-700'
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          }

          // Modern variant has special layout
          if (variant === 'modern') {
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && handleTabClick(tab.id)}
                className={getTabButtonClasses(isActive, !!tab.disabled)}
                disabled={tab.disabled}
              >
                {tab.icon && (
                  <span className={cn(
                    'flex-shrink-0 transition-all duration-300',
                    isActive ? 'scale-110' : 'scale-100'
                  )}>
                    {tab.icon}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  {tab.label}
                  {tab.badge && (
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-bold',
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-blue-100 text-blue-700'
                    )}>
                      {tab.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          }

          // Default rendering for other variants
          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && handleTabClick(tab.id)}
              className={getTabButtonClasses(isActive, !!tab.disabled)}
              disabled={tab.disabled}
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.badge && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default GlassTabs;
