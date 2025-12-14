import React, { useState, useEffect } from 'react';
import { Phone, Plus, X, MessageCircle } from 'lucide-react';

interface PhoneEntry {
  phone: string;
  whatsapp: boolean;
}

interface MultiPhoneInputProps {
  value: string; // JSON string array or comma-separated (for backward compatibility)
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  maxPhones?: number;
}

/**
 * Parse phone value - supports both JSON format and legacy comma-separated format
 */
const parsePhoneValue = (value: string | undefined | null): PhoneEntry[] => {
  if (!value || value.trim() === '') return [];
  
  try {
    // Try to parse as JSON first (new format)
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        phone: typeof item === 'string' ? item : (item.phone || ''),
        whatsapp: typeof item === 'object' ? (item.whatsapp === true) : false
      })).filter((item: PhoneEntry) => item.phone.length > 0);
    }
  } catch {
    // Not JSON, try legacy comma-separated format
    const phones = value.split(',').map(p => p.trim()).filter(p => p.length > 0);
    return phones.map(phone => ({ phone, whatsapp: false }));
  }
  
  return [];
};

/**
 * Serialize phone entries to JSON string
 */
const serializePhoneValue = (phones: PhoneEntry[]): string => {
  if (phones.length === 0) return '';
  return JSON.stringify(phones);
};

/**
 * Multi-Phone Input Component
 * Allows users to add multiple phone numbers with WhatsApp toggle for each
 * Stores as JSON string array for database compatibility
 */
export const MultiPhoneInput: React.FC<MultiPhoneInputProps> = ({
  value,
  onChange,
  placeholder = '+255 123 456 789',
  className = '',
  label = 'Business Phone',
  maxPhones = 5
}) => {
  const [phoneEntries, setPhoneEntries] = useState<PhoneEntry[]>(() => parsePhoneValue(value));
  const [newPhone, setNewPhone] = useState('');

  // Sync with external value changes (only when value actually changes externally)
  useEffect(() => {
    const parsed = parsePhoneValue(value);
    const currentSerialized = serializePhoneValue(phoneEntries);
    
    // Only update if the external value is actually different
    if (value !== currentSerialized && value !== undefined) {
      console.log('📥 MultiPhoneInput: External value changed', {
        oldValue: currentSerialized?.substring(0, 100),
        newValue: value?.substring(0, 100),
        parsedEntries: parsed.length
      });
      setPhoneEntries(parsed);
    }
  }, [value]); // Only depend on value, not phoneEntries to avoid loops

  // Update parent when entries change internally
  const handleEntriesChange = (newEntries: PhoneEntry[]) => {
    const serialized = serializePhoneValue(newEntries);
    console.log('📤 MultiPhoneInput: Entries changed', {
      entryCount: newEntries.length,
      serialized: serialized?.substring(0, 100),
      entries: newEntries.map(e => `${e.phone} ${e.whatsapp ? '📱' : ''}`)
    });
    setPhoneEntries(newEntries);
    onChange(serialized);
  };

  const handleAddPhone = () => {
    const trimmed = newPhone.trim();
    if (!trimmed) return;
    
    if (phoneEntries.length >= maxPhones) {
      return;
    }

    // Check for duplicates
    if (phoneEntries.some(entry => entry.phone === trimmed)) {
      return;
    }

    const updatedEntries = [...phoneEntries, { phone: trimmed, whatsapp: false }];
    handleEntriesChange(updatedEntries);
    setNewPhone('');
  };

  const handleRemovePhone = (index: number) => {
    const updatedEntries = phoneEntries.filter((_, i) => i !== index);
    handleEntriesChange(updatedEntries);
  };

  const handleUpdatePhone = (index: number, newValue: string) => {
    const updatedEntries = [...phoneEntries];
    updatedEntries[index] = { ...updatedEntries[index], phone: newValue.trim() };
    handleEntriesChange(updatedEntries);
  };

  const handleToggleWhatsApp = (index: number) => {
    const updatedEntries = [...phoneEntries];
    updatedEntries[index] = { ...updatedEntries[index], whatsapp: !updatedEntries[index].whatsapp };
    handleEntriesChange(updatedEntries);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPhone();
    }
  };

  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-700 mb-2">
        {label} {phoneEntries.length > 0 && <span className="text-gray-500">({phoneEntries.length}/{maxPhones})</span>}
      </label>
      
      {/* Existing Phone Numbers */}
      {phoneEntries.length > 0 && (
        <div className="space-y-2 mb-3">
          {phoneEntries.map((entry, index) => (
            <div
              key={index}
              className="flex items-center gap-2 group"
            >
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="tel"
                  value={entry.phone}
                  onChange={(e) => handleUpdatePhone(index, e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white text-sm"
                />
              </div>
              
              {/* WhatsApp Toggle */}
              <button
                type="button"
                onClick={() => handleToggleWhatsApp(index)}
                className={`p-2 rounded-lg transition-all ${
                  entry.whatsapp
                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title={entry.whatsapp ? 'Has WhatsApp - Click to remove' : 'Add WhatsApp'}
              >
                <MessageCircle className={`w-4 h-4 ${entry.whatsapp ? 'fill-current' : ''}`} />
              </button>
              
              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemovePhone(index)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Remove phone number"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Phone Input */}
      {phoneEntries.length < maxPhones && (
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="w-full pl-10 pr-12 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAddPhone}
            disabled={!newPhone.trim() || phoneEntries.length >= maxPhones}
            className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
            title="Add phone number"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      )}

      {phoneEntries.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">Click "Add" to add your first phone number</p>
      )}
      
      {phoneEntries.length > 0 && (
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <MessageCircle className="w-3 h-3 text-green-600" />
          <span>Green icon = WhatsApp available</span>
        </p>
      )}
    </div>
  );
};

