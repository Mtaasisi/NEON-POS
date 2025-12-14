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
}

export const SimpleInput: React.FC<SimpleInputProps> = ({
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  autoFocus = false
}) => (
  <div className="px-4 py-3.5">
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      autoFocus={autoFocus}
      className="w-full text-[17px] text-gray-900 placeholder-gray-400 outline-none bg-transparent border-0 p-0 disabled:text-gray-400"
    />
  </div>
);

// ============================================
// INPUT GROUP - Multiple inputs divided by lines
// ============================================
interface InputGroupProps {
  children: ReactNode;
}

export const InputGroup: React.FC<InputGroupProps> = ({ children }) => (
  <div className="divide-y divide-gray-200">
    {children}
  </div>
);

// ============================================
// LABEL VALUE ROW - Like "Rate: TZS 0" in image
// ============================================
interface LabelValueRowProps {
  label: string;
  value: string | ReactNode;
}

export const LabelValueRow: React.FC<LabelValueRowProps> = ({ label, value }) => (
  <div className="px-4 py-3.5">
    <div className="flex items-center justify-between">
      <span className="text-[17px] text-gray-900">{label}</span>
      <span className="text-[17px] font-semibold text-gray-900">{value}</span>
    </div>
  </div>
);

// ============================================
// SECTION DIVIDER - Gray background spacer
// ============================================
export const SectionDivider: React.FC = () => (
  <div className="h-2 bg-gray-50" />
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
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  isOpen,
  onToggle,
  children
}) => (
  <div className="border-t border-gray-200 pt-4">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2"
    >
      <div className="flex-1 text-left">
        <div className="text-[17px] font-semibold text-gray-900">
          {title}
        </div>
        <div className="text-[13px] text-gray-500 mt-1">
          {subtitle}
        </div>
      </div>
      <ChevronRight 
        size={20} 
        className={`text-gray-400 transition-transform flex-shrink-0 ml-3 ${
          isOpen ? 'rotate-90' : ''
        }`}
      />
    </button>

    {isOpen && (
      <div className="space-y-5 pt-4">
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
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  options,
  selected,
  onChange
}) => (
  <div className="flex gap-3">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`flex-1 py-2.5 px-4 rounded-lg text-[15px] font-medium transition-all ${
          selected === option.value
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-700'
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
}

export const Dropdown: React.FC<DropdownProps> = ({
  placeholder,
  value,
  onChange,
  options
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg text-[15px] text-gray-900 outline-none"
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
}

export const Textarea: React.FC<TextareaProps> = ({
  placeholder,
  value,
  onChange,
  rows = 3
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg text-[15px] text-gray-900 placeholder-gray-400 outline-none resize-none"
  />
);

// ============================================
// BOTTOM SPACER - Safe area padding
// ============================================
export const BottomSpacer: React.FC = () => (
  <div className="h-20 sm:h-8" />
);

