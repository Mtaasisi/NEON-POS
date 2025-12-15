import React, { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * MobilePopupInputs
 * 
 * Pre-styled input components that match the exact dimensions and style from the reference image.
 * These components maintain consistent spacing, font sizes, and borders throughout your app.
 */

// ============================================
// SIMPLE INPUT - Borderless with divider
// ============================================
interface SimpleInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'tel' | 'email' | 'number';
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const SimpleInput: React.FC<SimpleInputProps> = ({
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
// INPUT GROUP - Multiple inputs divided by lines
// ============================================
interface InputGroupProps {
  children: ReactNode;
  className?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({ children, className = '' }) => (
  <div className={`divide-y divide-neutral-200 bg-white rounded-2xl shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

// ============================================
// LABEL VALUE ROW - Like "Rate: TZS 0" in image
// ============================================
interface LabelValueRowProps {
  label: string;
  value: string | ReactNode;
  className?: string;
  onClick?: () => void;
  hideChevron?: boolean;
}

export const LabelValueRow: React.FC<LabelValueRowProps> = ({
  label,
  value,
  className = '',
  onClick,
  hideChevron = false
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
      {onClick && !hideChevron && <ChevronRight size={20} className="text-neutral-400 flex-shrink-0" strokeWidth={2} />}
    </div>
  </button>
);

// ============================================
// SECTION DIVIDER - Gray background spacer
// ============================================
export const SectionDivider: React.FC = () => (
  <div className="h-4 bg-neutral-100" />
);

// ============================================
// CONTENT SECTION - Padded container for controls
// ============================================
interface ContentSectionProps {
  children: ReactNode;
  className?: string;
}

export const ContentSection: React.FC<ContentSectionProps> = ({
  children,
  className = ''
}) => (
  <div className={`px-4 py-4 space-y-6 ${className}`}>
    {children}
  </div>
);

// ============================================
// COLLAPSIBLE SECTION - Like "More options" in image
// ============================================
interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
  className = ''
}) => (
  <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${className}`}>
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3.5 active:bg-neutral-100 transition-colors"
    >
      <div className="flex-1 text-left">
        <div className="text-[17px] font-semibold text-neutral-900">
          {title}
        </div>
        {subtitle && (
          <div className="text-[13px] text-neutral-500 mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      <ChevronRight 
        size={20} 
        className={`text-neutral-400 transition-transform flex-shrink-0 ml-3 ${
          isOpen ? 'rotate-90' : ''
        }`}
      />
    </button>

    {isOpen && (
      <div className="divide-y divide-neutral-200">
        {children}
      </div>
    )}
  </div>
);

// ============================================
// BUTTON GROUP - Side-by-side buttons
// ============================================
interface ButtonGroupProps {
  options: Array<{
    value: string;
    label: string;
  }>;
  selected: string;
  onChange: (value: string) => void;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  options,
  selected,
  onChange,
  className = ''
}) => (
  <div className={`flex gap-2 p-1 bg-neutral-100 rounded-xl ${className}`}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`flex-1 py-2.5 px-4 rounded-lg text-[15px] font-medium transition-all active:scale-[0.98] ${
          selected === option.value
            ? 'bg-primary-500 text-white shadow-sm'
            : 'bg-transparent text-neutral-700'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

// ============================================
// DROPDOWN - Gray background select
// ============================================
interface DropdownProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  placeholder,
  value,
  onChange,
  options,
  className = ''
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`w-full px-4 py-3 bg-neutral-100 border-0 rounded-xl text-[15px] text-neutral-900 outline-none ${className}`}
    style={{ WebkitAppearance: 'none' }}
  >
    <option value="">{placeholder}</option>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

// ============================================
// TEXTAREA - Gray background with placeholder
// ============================================
interface TextareaProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  placeholder,
  value,
  onChange,
  rows = 3,
  className = ''
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    className={`w-full px-4 py-3 bg-neutral-100 border-0 rounded-xl text-[15px] text-neutral-900 placeholder-neutral-400 outline-none resize-none ${className}`}
  />
);

// ============================================
// BOTTOM SPACER - Safe area padding
// ============================================
export const BottomSpacer: React.FC = () => (
  <div className="h-[calc(env(safe-area-inset-bottom)+20px)] bg-neutral-100" />
);

export default {
  SimpleInput, InputGroup, LabelValueRow, SectionDivider, ContentSection,
  CollapsibleSection, ButtonGroup, Dropdown, Textarea, BottomSpacer
};
