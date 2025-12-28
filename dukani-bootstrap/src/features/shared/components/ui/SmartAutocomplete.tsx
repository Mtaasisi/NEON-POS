import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, Plus } from 'lucide-react';

interface SmartAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: string[] | { value: string; label: string; icon?: React.ReactNode }[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  createNew?: boolean;
  onCreateNew?: (value: string) => void;
  fuzzyMatch?: boolean;
  showRecent?: boolean;
  recentKey?: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
  maxSuggestions?: number;
  className?: string;
}

const SmartAutocomplete: React.FC<SmartAutocompleteProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Type to search...',
  label,
  required = false,
  disabled = false,
  createNew = false,
  onCreateNew,
  fuzzyMatch = true,
  showRecent = true,
  recentKey,
  icon,
  error,
  helperText,
  maxSuggestions = 10,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentItems, setRecentItems] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize options to consistent format
  const normalizedOptions = useMemo(() => {
    return options.map(opt => 
      typeof opt === 'string' 
        ? { value: opt, label: opt, icon: undefined }
        : opt
    );
  }, [options]);

  // Load recent items from localStorage
  useEffect(() => {
    if (showRecent && recentKey) {
      const stored = localStorage.getItem(`recent_${recentKey}`);
      if (stored) {
        setRecentItems(JSON.parse(stored));
      }
    }
  }, [showRecent, recentKey]);

  // Update input value when external value changes
  useEffect(() => {
    // If options have labels, find the label for the current value
    const matchedOption = normalizedOptions.find(opt => opt.value === value);
    setInputValue(matchedOption ? matchedOption.label : value);
  }, [value, normalizedOptions]);

  // Fuzzy match algorithm
  const fuzzyMatchScore = (searchText: string, targetText: string): number => {
    searchText = searchText.toLowerCase();
    targetText = targetText.toLowerCase();
    
    let score = 0;
    let searchIndex = 0;
    
    for (let i = 0; i < targetText.length; i++) {
      if (targetText[i] === searchText[searchIndex]) {
        score += (searchText.length - searchIndex);
        searchIndex++;
        
        if (searchIndex === searchText.length) {
          return score;
        }
      }
    }
    
    return searchIndex === searchText.length ? score : 0;
  };

  // Filter and sort options
  const filteredOptions = useMemo(() => {
    if (!inputValue.trim()) {
      // Show recent items first if available
      if (showRecent && recentItems.length > 0) {
        const recent = normalizedOptions.filter(opt => 
          recentItems.includes(opt.value)
        );
        const others = normalizedOptions.filter(opt => 
          !recentItems.includes(opt.value)
        ).slice(0, maxSuggestions - recent.length);
        return [...recent, ...others];
      }
      return normalizedOptions.slice(0, maxSuggestions);
    }

    if (fuzzyMatch) {
      return normalizedOptions
        .map(opt => ({
          ...opt,
          score: fuzzyMatchScore(inputValue, opt.label)
        }))
        .filter(opt => opt.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSuggestions);
    } else {
      return normalizedOptions
        .filter(opt => 
          opt.label.toLowerCase().includes(inputValue.toLowerCase())
        )
        .slice(0, maxSuggestions);
    }
  }, [inputValue, normalizedOptions, fuzzyMatch, recentItems, showRecent, maxSuggestions]);

  // Save to recent items
  const saveToRecent = (itemValue: string) => {
    if (showRecent && recentKey) {
      const updated = [itemValue, ...recentItems.filter(i => i !== itemValue)].slice(0, 5);
      setRecentItems(updated);
      localStorage.setItem(`recent_${recentKey}`, JSON.stringify(updated));
    }
  };

  // Handle selection
  const handleSelect = (optionValue: string) => {
    const selectedOption = normalizedOptions.find(opt => opt.value === optionValue);
    onChange(optionValue);
    setInputValue(selectedOption ? selectedOption.label : optionValue);
    saveToRecent(optionValue);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key !== 'Escape') {
      setIsOpen(true);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[selectedIndex].value);
        } else if (createNew && inputValue.trim() && onCreateNew) {
          onCreateNew(inputValue.trim());
          saveToRecent(inputValue.trim());
          setIsOpen(false);
        } else if (inputValue.trim()) {
          onChange(inputValue.trim());
          saveToRecent(inputValue.trim());
          setIsOpen(false);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      
      case 'Tab':
        if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
          e.preventDefault();
          handleSelect(filteredOptions[selectedIndex].value);
        } else {
          setIsOpen(false);
        }
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const showCreateOption = createNew && inputValue.trim() && 
    !filteredOptions.some(opt => opt.value.toLowerCase() === inputValue.toLowerCase());

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            setInputValue('');
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
            icon ? 'pl-11' : ''
          } ${
            error 
              ? 'border-red-500 focus:border-red-500' 
              : value 
              ? 'border-green-500 focus:border-green-500 bg-green-50'
              : 'border-gray-200 focus:border-blue-500'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {/* Left icon */}
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div
            ref={dropdownRef}
            className="absolute z-[9999] w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto"
          >
            {filteredOptions.length === 0 && !showCreateOption ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No matches found
              </div>
            ) : (
              <>
                {filteredOptions.map((option, index) => {
                  const isRecent = recentItems.includes(option.value);
                  const isSelected = index === selectedIndex;
                  
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-gray-50'
                      } ${
                        index === 0 ? 'rounded-t-lg' : ''
                      } ${
                        index === filteredOptions.length - 1 && !showCreateOption ? 'rounded-b-lg' : ''
                      }`}
                    >
                      {option.icon && (
                        <div className="flex-shrink-0 text-gray-400">
                          {option.icon}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">
                          {option.label}
                        </span>
                        {isRecent && (
                          <span className="ml-2 text-xs text-gray-500">(Recent)</span>
                        )}
                      </div>
                      {value === option.value && (
                        <Check size={16} className="text-blue-600 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}

                {/* Create new option */}
                {showCreateOption && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onCreateNew) {
                        onCreateNew(inputValue.trim());
                      } else {
                        onChange(inputValue.trim());
                      }
                      saveToRecent(inputValue.trim());
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 border-t-2 border-gray-100 transition-colors ${
                      selectedIndex === filteredOptions.length 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'hover:bg-gray-50'
                    } rounded-b-lg`}
                  >
                    <Plus size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-600">
                      Create "{inputValue.trim()}"
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Helper text or error */}
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}

      {/* Keyboard hint */}
      {isOpen && !disabled && (
        <div className="mt-1 text-xs text-gray-400 flex items-center gap-3">
          <span>↑↓ Navigate</span>
          <span>Enter Select</span>
          <span>Esc Close</span>
          {showCreateOption && <span>Tab Create</span>}
        </div>
      )}
    </div>
  );
};

export default SmartAutocomplete;

