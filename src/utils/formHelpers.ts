/**
 * Form Helper Utilities
 * Provides smart defaults, validation, and auto-fill functionality
 */

// Date/Time Helpers
export const getSmartDefaults = () => {
  const now = new Date();

  return {
    today: now.toISOString().split('T')[0],
    tomorrow: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    nextWeek: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    todayPlus7: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    todayPlus14: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    
    currentTime: now.toTimeString().slice(0, 5), // HH:MM
    oneHourLater: new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5),
    twoHoursLater: new Date(now.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5),
    
    nineAM: '09:00',
    fivePM: '17:00',
  };
};

// Common Presets
export const commonPresets = {
  reminderTimes: [
    { label: 'In 15 minutes', value: 15 },
    { label: 'In 30 minutes', value: 30 },
    { label: 'In 1 hour', value: 60 },
    { label: 'In 2 hours', value: 120 },
    { label: 'In 1 day', value: 1440 },
  ],

  deviceReturnDays: [
    { label: 'Same day', value: 0 },
    { label: '3 days', value: 3 },
    { label: '1 week', value: 7 },
    { label: '2 weeks', value: 14 },
    { label: '1 month', value: 30 },
  ],

  priorities: [
    { value: 'low', label: 'Low', color: 'blue' },
    { value: 'medium', label: 'Medium', color: 'orange' },
    { value: 'high', label: 'High', color: 'red' },
  ],

  employeePositions: [
    'Technician',
    'Senior Technician',
    'Customer Care',
    'Manager',
    'Sales Representative',
    'Administrator',
    'Inventory Manager',
    'Finance Officer',
  ],

  deviceBrands: [
    'Apple',
    'Samsung',
    'Huawei',
    'Xiaomi',
    'OnePlus',
    'Google',
    'Sony',
    'LG',
    'Motorola',
    'Nokia',
    'Oppo',
    'Vivo',
    'Realme',
    'Tecno',
    'Infinix',
  ],

  commonIssues: [
    'Screen Broken',
    'Battery Issue',
    'Charging Problem',
    'Water Damage',
    'Software Issue',
    'Network Problem',
    'Speaker Not Working',
    'Microphone Not Working',
    'Camera Issue',
    'Power Button Stuck',
    'Volume Button Not Working',
    'WiFi Not Working',
    'Bluetooth Issue',
    'Overheating',
  ],
};

// Smart Auto-fill
export const getLastUsedValues = (key: string): any => {
  try {
    const stored = localStorage.getItem(`last_used_${key}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const saveLastUsedValues = (key: string, values: any) => {
  try {
    localStorage.setItem(`last_used_${key}`, JSON.stringify(values));
  } catch (error) {
    console.error('Error saving last used values:', error);
  }
};

// Validation Helpers
export const validators = {
  required: (value: any) => {
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return !isNaN(value);
    return value != null;
  },

  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  phone: (value: string) => {
    // Tanzania phone format
    const phoneRegex = /^(\+?255|0)[67]\d{8}$/;
    return phoneRegex.test(value.replace(/\s/g, ''));
  },

  minLength: (value: string, length: number) => {
    return value.length >= length;
  },

  maxLength: (value: string, length: number) => {
    return value.length <= length;
  },

  number: (value: string) => {
    return !isNaN(Number(value));
  },

  positiveNumber: (value: string | number) => {
    const num = typeof value === 'string' ? Number(value) : value;
    return !isNaN(num) && num > 0;
  },

  dateInFuture: (value: string) => {
    const date = new Date(value);
    return date > new Date();
  },

  dateNotPast: (value: string) => {
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  },
};

// Field Suggestions
export const getSuggestions = (fieldType: string, currentValue: string): string[] => {
  const recent = getRecentValues(fieldType);
  
  switch (fieldType) {
    case 'deviceBrand':
      return filterSuggestions(commonPresets.deviceBrands, currentValue, recent);
    
    case 'deviceIssue':
      return filterSuggestions(commonPresets.commonIssues, currentValue, recent);
    
    case 'employeePosition':
      return filterSuggestions(commonPresets.employeePositions, currentValue, recent);
    
    default:
      return recent;
  }
};

const filterSuggestions = (
  options: string[],
  query: string,
  recent: string[] = []
): string[] => {
  const lowerQuery = query.toLowerCase();
  
  // Combine recent with options
  const combined = [...new Set([...recent, ...options])];
  
  if (!query) return combined.slice(0, 10);
  
  // Filter and sort by relevance
  return combined
    .filter(option => option.toLowerCase().includes(lowerQuery))
    .sort((a, b) => {
      const aStartsWith = a.toLowerCase().startsWith(lowerQuery);
      const bStartsWith = b.toLowerCase().startsWith(lowerQuery);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return 0;
    })
    .slice(0, 10);
};

const getRecentValues = (key: string): string[] => {
  try {
    const stored = localStorage.getItem(`recent_values_${key}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveRecentValue = (key: string, value: string) => {
  try {
    const recent = getRecentValues(key);
    const updated = [value, ...recent.filter(v => v !== value)].slice(0, 5);
    localStorage.setItem(`recent_values_${key}`, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving recent value:', error);
  }
};

// Form State Management
export const getFormProgress = (formData: Record<string, any>, requiredFields: string[]): number => {
  const filledRequired = requiredFields.filter(field => {
    const value = formData[field];
    if (typeof value === 'string') return value.trim() !== '';
    return value != null;
  }).length;

  return Math.round((filledRequired / requiredFields.length) * 100);
};

// Smart Suggestions based on context
export const getContextualSuggestions = (context: {
  formType: 'device' | 'customer' | 'reminder' | 'employee';
  currentData: Record<string, any>;
}): Record<string, any> => {
  const { formType, currentData } = context;
  const defaults = getSmartDefaults();

  switch (formType) {
    case 'device':
      return {
        expectedReturnDate: defaults.todayPlus7,
        // If brand is iPhone, suggest common iPhone issues
        commonIssues: currentData.brand === 'Apple' 
          ? ['Screen Broken', 'Battery Issue', 'Camera Issue']
          : commonPresets.commonIssues,
      };

    case 'reminder':
      return {
        date: defaults.today,
        time: defaults.oneHourLater,
        notifyBefore: 15,
        priority: 'medium',
      };

    case 'customer':
      return {
        loyaltyLevel: 'bronze',
        colorTag: 'new',
      };

    case 'employee':
      return {
        hireDate: defaults.today,
        status: 'active',
        performance: 3,
        attendance: 100,
      };

    default:
      return {};
  }
};

export default {
  getSmartDefaults,
  commonPresets,
  getLastUsedValues,
  saveLastUsedValues,
  validators,
  getSuggestions,
  saveRecentValue,
  getFormProgress,
  getContextualSuggestions,
};

