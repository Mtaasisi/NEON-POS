import React, { ReactNode } from 'react';
import { ChevronDown, Search } from 'lucide-react';

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
}

export const SheetInputField: React.FC<SheetInputFieldProps> = ({
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  autoFocus = false
}) => (
  <div style={{ padding: '14px 16px' }}>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      autoFocus={autoFocus}
      className="w-full outline-none bg-transparent border-0 p-0 disabled:text-gray-400"
      style={{
        fontSize: '17px',
        fontWeight: '400',
        color: value ? '#000000' : '#C7C7CC',
        letterSpacing: '-0.41px'
      }}
    />
  </div>
);

// ============================================
// INPUT GROUP - Multiple inputs with dividers
// ============================================
interface SheetInputGroupProps {
  children: ReactNode;
}

export const SheetInputGroup: React.FC<SheetInputGroupProps> = ({ children }) => (
  <div className="divide-y divide-gray-200">
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
}

export const SheetDetailRow: React.FC<SheetDetailRowProps> = ({ 
  label, 
  value,
  onClick 
}) => (
  <div 
    onClick={onClick}
    className={onClick ? 'cursor-pointer active:bg-gray-50' : ''}
    style={{ padding: '14px 16px' }}
  >
    <div className="flex items-center justify-between">
      <span 
        className="text-gray-900"
        style={{
          fontSize: '17px',
          fontWeight: '400',
          letterSpacing: '-0.41px'
        }}
      >
        {label}
      </span>
      <span 
        className="text-gray-900 font-semibold"
        style={{
          fontSize: '17px',
          letterSpacing: '-0.41px'
        }}
      >
        {value}
      </span>
    </div>
  </div>
);

// ============================================
// SECTION DIVIDER - 8px gray background spacer
// ============================================
export const SheetSectionDivider: React.FC = () => (
  <div style={{ height: '8px', backgroundColor: '#F2F2F7' }} />
);

// ============================================
// COLLAPSIBLE SECTION - Like "More options" in image
// ============================================
interface SheetCollapsibleSectionProps {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

export const SheetCollapsibleSection: React.FC<SheetCollapsibleSectionProps> = ({
  title,
  subtitle,
  isOpen,
  onToggle,
  children
}) => (
  <div className="border-t border-b border-gray-200">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between active:bg-gray-50 transition-colors"
      style={{ padding: '14px 16px' }}
    >
      <div className="flex-1 text-left">
        <div 
          className="text-gray-900 font-semibold"
          style={{
            fontSize: '17px',
            letterSpacing: '-0.41px'
          }}
        >
          {title}
        </div>
        <div 
          className="text-gray-500 mt-1"
          style={{
            fontSize: '13px',
            fontWeight: '400',
            letterSpacing: '-0.08px'
          }}
        >
          {subtitle}
        </div>
      </div>
      <ChevronDown 
        size={20}
        className={`text-gray-400 transition-transform ml-3 flex-shrink-0 ${
          isOpen ? 'rotate-180' : ''
        }`}
        strokeWidth={2.5}
      />
    </button>

    {isOpen && children && (
      <div className="border-t border-gray-200">
        {children}
      </div>
    )}
  </div>
);

// ============================================
// SEARCH SECTION - Like "Choose multiple" in image
// ============================================
interface SheetSearchSectionProps {
  title: string;
  subtitle: string;
  onClick: () => void;
}

export const SheetSearchSection: React.FC<SheetSearchSectionProps> = ({
  title,
  subtitle,
  onClick
}) => (
  <div className="border-t border-b border-gray-200">
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between active:bg-gray-50 transition-colors"
      style={{ padding: '14px 16px' }}
    >
      <div className="flex-1 text-left">
        <div 
          className="text-gray-900 font-semibold"
          style={{
            fontSize: '17px',
            letterSpacing: '-0.41px'
          }}
        >
          {title}
        </div>
        <div 
          className="text-gray-500 mt-1"
          style={{
            fontSize: '13px',
            fontWeight: '400',
            letterSpacing: '-0.08px'
          }}
        >
          {subtitle}
        </div>
      </div>
      <Search 
        size={22}
        className="text-gray-400 ml-3 flex-shrink-0"
        strokeWidth={2}
      />
    </button>
  </div>
);

// ============================================
// CONTENT SPACER - Adds bottom padding for scrolling
// ============================================
interface SheetContentSpacerProps {
  height?: number;
}

export const SheetContentSpacer: React.FC<SheetContentSpacerProps> = ({ 
  height = 80 
}) => (
  <div style={{ height: `${height}px` }} />
);

