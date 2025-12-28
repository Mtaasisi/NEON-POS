// Universal Form Components for Settings
import React from 'react';
import HelpTooltip from './HelpTooltip';

// Toggle Switch Component - iOS 26 Flat Pill Style
interface ToggleSwitchProps {
  id?: string;
  label: string;
  description?: string;
  helpText?: string | React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  label,
  description,
  helpText,
  checked,
  onChange,
  disabled = false
}) => {
  const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;

  // iOS Switch exact dimensions: 51px × 31px
  // Handle: ~60-65% of width = 32px, height = track height - 8px padding = 23px
  // Travel distance: 51 - 32 - 4 = 15px

  const trackStyle = {
    position: 'absolute' as const,
    inset: 0,
    borderRadius: '999px',
    background: checked ? '#34C759' : '#929197',
    boxShadow: checked
      ? 'inset 0 0 0 1px rgba(52, 199, 89, 0.6)'
      : 'inset 0 0 0 1px #929197',
    transition: 'background-color 0.16s cubic-bezier(0.2, 0.6, 0.2, 1), box-shadow 0.16s cubic-bezier(0.2, 0.6, 0.2, 1)',
  };

  const handleStyle = {
    position: 'absolute' as const,
    left: '2px',
    top: '4px',
    width: '27px',
    height: '23px',
    borderRadius: '999px',
    background: '#ffffff',
    transform: checked ? 'translateX(20px)' : 'translateX(0)',
    transition: 'transform 0.16s cubic-bezier(0.2, 0.6, 0.2, 1)',
    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
  };

  const labelStyle = {
    position: 'relative' as const,
    display: 'inline-block',
    width: '51px',
    height: '31px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    verticalAlign: 'middle',
    opacity: disabled ? 0.5 : 1,
    borderRadius: '999px',
    outline: 'none',
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{label}</span>
          {helpText && <HelpTooltip content={helpText} />}
        </div>
        {description && <div className="text-sm text-gray-600 mt-1">{description}</div>}
      </div>
      <div className="inline-flex items-center ml-4">
        <input
          type="checkbox"
          id={switchId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="absolute opacity-0 w-0 h-0"
          role="switch"
          aria-label={label}
        />
        <label style={labelStyle} htmlFor={switchId}>
          <span style={trackStyle}></span>
          <span style={handleStyle}></span>
        </label>
      </div>
    </div>
  );
};

// Number Input Component
interface NumberInputProps {
  id: string;
  label: string;
  description?: string;
  helpText?: string | React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  id,
  label,
  description,
  helpText,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  disabled = false
}) => {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        <span>{label}</span>
        {helpText && <HelpTooltip content={helpText} />}
      </label>
      <input
        type="number"
        id={id}
        value={value || ''}
        onChange={(e) => {
          const numValue = parseFloat(e.target.value);
          onChange(isNaN(numValue) ? 0 : numValue);
        }}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );
};

// Text Input Component
interface TextInputProps {
  id: string;
  label: string;
  description?: string;
  helpText?: string | React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  type?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  id,
  label,
  description,
  helpText,
  value,
  onChange,
  placeholder,
  disabled = false,
  multiline = false,
  rows = 3,
  type = 'text'
}) => {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        <span>{label}</span>
        {helpText && <HelpTooltip content={helpText} />}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      ) : (
        <input
          type={type}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      )}
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );
};

// Select Component
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id: string;
  label: string;
  description?: string;
  helpText?: string | React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  multiple?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  id,
  label,
  description,
  helpText,
  value,
  onChange,
  options,
  disabled = false,
  multiple = false
}) => {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        <span>{label}</span>
        {helpText && <HelpTooltip content={helpText} />}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        multiple={multiple}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );
};

// Time Input Component
interface TimeInputProps {
  id: string;
  label: string;
  description?: string;
  helpText?: string | React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const TimeInput: React.FC<TimeInputProps> = ({
  id,
  label,
  description,
  helpText,
  value,
  onChange,
  disabled = false
}) => {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        <span>{label}</span>
        {helpText && <HelpTooltip content={helpText} />}
      </label>
      <input
        type="time"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );
};

// Settings Section Component
interface SettingsSectionProps {
  title: string;
  description?: string;
  helpText?: string | React.ReactNode;
  icon: React.ReactNode;
  colorClass?: string;
  children: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  helpText,
  icon,
  colorClass = "bg-white border-gray-200",
  children
}) => {
  return (
    <div className={`p-6 rounded-xl border ${colorClass}`}>
      <div className="flex items-start gap-2 mb-4">
        <div className="p-1 rounded mt-0.5">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {helpText && <HelpTooltip content={helpText} />}
          </div>
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};
