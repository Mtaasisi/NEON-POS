import React, { forwardRef, useState, useId } from 'react';
import { cn } from '../../../../lib/utils';
import { X, AlertCircle } from 'lucide-react';

interface GlassInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  clearable?: boolean;
  loading?: boolean;
  success?: boolean;
  onClear?: () => void;
}

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    leftIcon, 
    rightIcon,
    onRightIconClick, 
    variant = 'default',
    size = 'md',
    multiline = false,
    rows = 3,
    required = false,
    maxLength,
    showCharacterCount = false,
    clearable = false,
    loading = false,
    success = false,
    onClear,
    disabled,
    value,
    onChange,
    ...props 
  }, ref) => {
    const id = useId();
    const errorId = useId();
    const helperTextId = useId();
    
    const [charCount, setCharCount] = useState(
      typeof value === 'string' ? value.length : 0
    );

    const iconSize = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    }[size];

    const baseClasses = cn(
      // Base styles
      'w-full transition-all duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'border rounded-lg backdrop-blur-sm',
      'placeholder-gray-400 font-medium',
      
      // Padding
      {
        'py-2 text-sm': size === 'sm',
        'py-3 text-sm': size === 'md',
        'py-4 text-base': size === 'lg',
      },
      
      // Left padding (for icon)
      {
        'pl-10': leftIcon && size === 'sm',
        'pl-11': leftIcon && size === 'md',
        'pl-12': leftIcon && size === 'lg',
        'pl-3': !leftIcon && size === 'sm',
        'pl-4': !leftIcon && size === 'md',
        'pl-5': !leftIcon && size === 'lg',
      },
      
      // Right padding (for icons/clear button)
      {
        'pr-10': (rightIcon || clearable || error) && size === 'sm',
        'pr-20': (rightIcon && clearable) || (rightIcon && error),
        'pr-11': (rightIcon || clearable || error) && size === 'md',
        'pr-12': (rightIcon || clearable || error) && size === 'lg',
        'pr-3': !rightIcon && !clearable && !error && size === 'sm',
        'pr-4': !rightIcon && !clearable && !error && size === 'md',
        'pr-5': !rightIcon && !clearable && !error && size === 'lg',
      },
      
      // Variant styles
      {
        'bg-white/80 hover:bg-white/90': variant === 'default' && !disabled,
        'bg-gray-50/80 hover:bg-gray-100/80': variant === 'filled' && !disabled,
        'bg-transparent hover:bg-white/5 border-2': variant === 'outlined',
      },
      
      // State styles
      {
        // Error state
        'border-red-300 focus:border-red-500 focus:ring-red-500/50 text-red-900': error,
        // Success state
        'border-green-300 focus:border-green-500 focus:ring-green-500/50 text-gray-900': success && !error,
        // Normal state
        'border-gray-300 focus:border-blue-500 focus:ring-blue-500/50 text-gray-900': !error && !success,
        // Disabled state
        'opacity-60 cursor-not-allowed bg-gray-100/50': disabled || loading,
      },
      
      className
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (showCharacterCount || maxLength) {
        setCharCount(e.target.value.length);
      }
      if (onChange) {
        onChange(e as React.ChangeEvent<HTMLInputElement>);
      }
    };

    const handleClear = () => {
      setCharCount(0);
      if (onClear) {
        onClear();
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
          {/* Left Icon */}
          {leftIcon && (
            <div className={cn(
              "absolute top-1/2 -translate-y-1/2 transition-colors",
              size === 'sm' ? 'left-3' : size === 'md' ? 'left-3' : 'left-4',
              error ? "text-red-400" : success ? "text-green-400" : "text-gray-400 group-hover:text-gray-600"
            )}>
              {leftIcon}
            </div>
          )}
          
          {multiline ? (
            <textarea
              id={id}
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={baseClasses}
              rows={rows}
              maxLength={maxLength}
              disabled={disabled || loading}
              required={required}
              value={value}
              onChange={handleChange}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={cn(
                error && errorId,
                helperText && !error && helperTextId
              )}
              {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              id={id}
              ref={ref}
              className={baseClasses}
              maxLength={maxLength}
              disabled={disabled || loading}
              required={required}
              value={value}
              onChange={handleChange}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={cn(
                error && errorId,
                helperText && !error && helperTextId
              )}
              {...props}
            />
          )}
          
          {/* Right Icons */}
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 flex items-center gap-1",
            multiline ? 'top-3 translate-y-0' : '',
            size === 'sm' ? 'right-2' : size === 'md' ? 'right-3' : 'right-4'
          )}>
            {/* Clear button */}
            {showClearButton && (
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  "p-0.5 rounded-full hover:bg-gray-200/80 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                )}
                aria-label="Clear input"
                tabIndex={-1}
              >
                <X className={cn(iconSize, "text-gray-500 hover:text-gray-700")} />
              </button>
            )}
            
            {/* Error icon */}
            {error && (
              <AlertCircle className={cn(iconSize, "text-red-500")} />
            )}
            
            {/* Loading spinner */}
            {loading && (
              <div className={iconSize}>
                <svg className="animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
            
            {/* Custom right icon */}
            {rightIcon && !loading && (
              <div 
                className={cn(
                  "transition-colors",
                  error ? "text-red-400" : success ? "text-green-400" : "text-gray-400 group-hover:text-gray-600",
                  onRightIconClick && "cursor-pointer hover:text-gray-700"
                )}
                onClick={onRightIconClick}
                role={onRightIconClick ? "button" : undefined}
                tabIndex={onRightIconClick ? 0 : undefined}
              >
                {rightIcon}
              </div>
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
        
        {/* Helper text and character count */}
        <div className="flex justify-between items-center mt-1.5">
          {helperText && !error && (
            <p id={helperTextId} className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
          {showCharacterCount && maxLength && (
            <p className={cn(
              "text-xs font-medium ml-auto",
              charCount >= maxLength ? "text-red-600" : "text-gray-500"
            )}>
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

export default GlassInput;
export type { GlassInputProps };
