import React, { forwardRef, useId } from 'react';
import { cn } from '../../../../lib/utils';
import { ChevronDown, X, AlertCircle } from 'lucide-react';

interface GlassSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  color?: string;
  group?: string;
}

interface GlassSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: GlassSelectOption[];
  placeholder?: string;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  onChange?: (value: string) => void;
  clearable?: boolean;
  loading?: boolean;
  success?: boolean;
}

const GlassSelect = forwardRef<HTMLSelectElement, GlassSelectProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    options = [],
    placeholder,
    variant = 'default',
    size = 'md',
    onChange,
    clearable = false,
    loading = false,
    success = false,
    disabled,
    required,
    value,
    ...props 
  }, ref) => {
    const id = useId();
    const errorId = useId();
    const helperTextId = useId();

    // Group options if they have groups
    const groupedOptions = React.useMemo(() => {
      const groups: { [key: string]: GlassSelectOption[] } = {};
      const ungrouped: GlassSelectOption[] = [];

      options.forEach(option => {
        if (option.group) {
          if (!groups[option.group]) {
            groups[option.group] = [];
          }
          groups[option.group].push(option);
        } else {
          ungrouped.push(option);
        }
      });

      return { groups, ungrouped };
    }, [options]);

    const baseClasses = cn(
      // Base styles
      'w-full transition-all duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'border rounded-lg backdrop-blur-sm',
      'appearance-none cursor-pointer',
      'font-medium',
      
      // Padding (right padding for icon, left padding for text)
      {
        'py-2 pl-3 pr-10 text-sm': size === 'sm',
        'py-3 pl-4 pr-11 text-sm': size === 'md',
        'py-4 pl-5 pr-12 text-base': size === 'lg',
      },
      
      // Variant styles
      {
        'bg-white/80 hover:bg-white/90': variant === 'default',
        'bg-gray-50/80 hover:bg-gray-100/80': variant === 'filled',
        'bg-transparent hover:bg-white/5 border-2': variant === 'outlined',
      },
      
      // State styles
      {
        // Error state
        'border-red-300 focus:border-red-500 focus:ring-red-500/50 text-red-900': error,
        // Success state
        'border-green-300 focus:border-green-500 focus:ring-green-500/50': success && !error,
        // Normal state
        'border-gray-300 focus:border-blue-500 focus:ring-blue-500/50 text-gray-900': !error && !success,
        // Disabled state
        'opacity-60 cursor-not-allowed bg-gray-100/50': disabled || loading,
      },
      
      className
    );

    const iconSize = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    }[size];

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (onChange) {
        onChange('');
      }
    };

    const showClearButton = clearable && value && !disabled && !loading;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={id}
            className={cn(
              "block text-sm font-semibold mb-2 transition-colors",
              error ? "text-red-700" : success ? "text-green-700" : "text-gray-700"
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative group">
          <select
            ref={ref}
            id={id}
            className={baseClasses}
            onChange={handleChange}
            disabled={disabled || loading}
            required={required}
            value={value}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(
              error && errorId,
              helperText && !error && helperTextId
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            
            {/* Render ungrouped options */}
            {groupedOptions.ungrouped.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="py-2"
              >
                {option.label}
              </option>
            ))}
            
            {/* Render grouped options */}
            {Object.entries(groupedOptions.groups).map(([groupName, groupOptions]) => (
              <optgroup key={groupName} label={groupName}>
                {groupOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="py-2"
                  >
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          
          {/* Icons on the right side */}
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 flex items-center gap-1",
            size === 'sm' ? 'right-2' : size === 'md' ? 'right-3' : 'right-4'
          )}>
            {/* Clear button */}
            {showClearButton && (
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  "p-0.5 rounded-full hover:bg-gray-200/80 transition-colors pointer-events-auto",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                )}
                aria-label="Clear selection"
                tabIndex={-1}
              >
                <X className={cn(iconSize, "text-gray-500 hover:text-gray-700")} />
              </button>
            )}
            
            {/* Error icon */}
            {error && (
              <AlertCircle className={cn(iconSize, "text-red-500 pointer-events-none")} />
            )}
            
            {/* Loading spinner or chevron */}
            {loading ? (
              <div className={cn(iconSize, "pointer-events-none")}>
                <svg className="animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : !showClearButton && (
              <ChevronDown 
                className={cn(
                  iconSize, 
                  "pointer-events-none transition-colors",
                  error ? "text-red-400" : success ? "text-green-400" : "text-gray-400 group-hover:text-gray-600"
                )} 
              />
            )}
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}
        
        {/* Helper text */}
        {helperText && !error && (
          <p id={helperTextId} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

GlassSelect.displayName = 'GlassSelect';

export default GlassSelect;
export type { GlassSelectOption, GlassSelectProps };
