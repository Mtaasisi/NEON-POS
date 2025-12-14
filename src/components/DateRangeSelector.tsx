import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export type DateRangePreset = '7days' | '1month' | '3months' | '6months' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DateRangePreset;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presets: { value: DateRangePreset; label: string }[] = [
  { value: '7days', label: 'Last 7 Days' },
  { value: '1month', label: 'Last Month' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'custom', label: 'Custom Range' }
];

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getDateRange = (preset: DateRangePreset): DateRange => {
    const endDate = new Date();
    const startDate = new Date();

    switch (preset) {
      case '7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '1month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case 'custom':
        // Return current range for custom
        return value;
    }

    return { startDate, endDate, preset };
  };

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange(getDateRange(preset));
      setIsOpen(false);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        startDate: new Date(customStart),
        endDate: new Date(customEnd),
        preset: 'custom'
      });
      setShowCustom(false);
      setIsOpen(false);
    }
  };

  const formatDateRange = (range: DateRange) => {
    if (range.preset === 'custom') {
      return `${range.startDate.toLocaleDateString()} - ${range.endDate.toLocaleDateString()}`;
    }
    return presets.find(p => p.value === range.preset)?.label || 'Select Range';
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {formatDateRange(value)}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setShowCustom(false);
            }}
          />
          <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {!showCustom ? (
              <div className="p-2">
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetSelect(preset.value)}
                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${
                      value.preset === preset.value
                        ? 'bg-indigo-50 text-indigo-600 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Custom Date Range</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      min={customStart}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setShowCustom(false)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCustomApply}
                      disabled={!customStart || !customEnd}
                      className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

