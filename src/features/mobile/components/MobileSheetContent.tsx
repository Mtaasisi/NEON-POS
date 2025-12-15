import React, { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * MobileSheetContent Components
 * 
 * Pre-styled components that match the exact layout and spacing from the reference image.
 * These maintain pixel-perfect dimensions for iOS-style forms.
 */

// ============================================
// INPUT FIELD - Borderless with divider
// ============================================
interface SheetInputFieldProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'tel' | 'email' | 'number';
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const SheetInputField: React.FC<SheetInputFieldProps> = ({
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  autoFocus = false,
  className = '',
}) => (
  <div className="px-4 py-3.5">
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      autoFocus={autoFocus}
      className={`w-full text-[17px] text-neutral-900 placeholder-neutral-400 outline-none bg-transparent border-0 p-0 disabled:text-neutral-400 ${className}`}
      style={{ WebkitAppearance: 'none' }}
    />
  </div>
);

// ============================================
// INPUT GROUP - Multiple inputs with dividers
// ============================================
interface SheetInputGroupProps {
  children: ReactNode;
  className?: string;
}

export const SheetInputGroup: React.FC<SheetInputGroupProps> = ({ children, className = '' }) => (
  <div className={`divide-y divide-neutral-200 bg-white rounded-2xl shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

// ============================================
// DETAIL ROW - Label on left, value on right (like "Rate: TZS 0")
// ============================================
interface SheetDetailRowProps {
  label: string;
  value: string | ReactNode;
  onClick?: () => void;
  className?: string;
}

export const SheetDetailRow: React.FC<SheetDetailRowProps> = ({
  label,
  value,
  onClick,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full px-4 py-3.5 flex items-center justify-between text-left ${className} ${onClick ? 'active:bg-neutral-100 transition-colors' : ''}`}
    disabled={!onClick}
  >
    <span className="text-[17px] text-neutral-900 leading-tight flex-1">{label}</span>
    <div className="flex items-center gap-1">
      <span className="text-[17px] font-semibold text-neutral-900 leading-tight">
        {value}
      </span>
      {onClick && <ChevronRight size={20} className="text-neutral-400 flex-shrink-0" strokeWidth={2} />}
    </div>
  </button>
);

// ============================================
// SECTION DIVIDER - 8px gray background spacer
// ============================================
export const SheetSectionDivider: React.FC = () => (
  <div className="h-2 bg-neutral-100" />
);

// ============================================
// COLLAPSIBLE SECTION - Like "More options" in image
// ============================================
interface SheetCollapsibleSectionProps {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children?: ReactNode;
  className?: string;
}

export const SheetCollapsibleSection: React.FC<SheetCollapsibleSectionProps> = ({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
  className = '',
}) => (
  <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${className}`}>
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3.5 active:bg-neutral-100 transition-colors"
    >
      <div className="flex-1 text-left">
        <div 
          className="text-neutral-900 font-semibold text-[17px] tracking-tight"
        >
          {title}
        </div>
        {subtitle && (
          <div 
            className="text-neutral-500 mt-0.5 text-[13px] font-normal tracking-tight"
          >
            {subtitle}
          </div>
        )}
      </div>
      <ChevronRight 
        size={20}
        className={`text-neutral-400 transition-transform ml-3 flex-shrink-0 ${
          isOpen ? 'rotate-90' : ''
        }`}
        strokeWidth={2}
      />
    </button>

    {isOpen && children && (
      <div className="divide-y divide-neutral-200">
        {children}
      </div>
    )}
  </div>
);

// ============================================
// CONTENT SPACER - Adds bottom padding for scrolling
// ============================================
export const SheetContentSpacer: React.FC = () => (
  <div className="h-20 w-full bg-neutral-100" />
);

export default {
  SheetInputField, SheetInputGroup, SheetDetailRow, SheetSectionDivider,
  SheetCollapsibleSection, SheetContentSpacer
};
