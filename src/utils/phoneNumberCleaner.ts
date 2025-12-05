/**
 * Phone Number Cleaner Utility
 * 
 * Helps clean and validate phone numbers to ensure they work with WhatsApp API
 */

export interface PhoneValidationResult {
  original: string;
  cleaned: string;
  isValid: boolean;
  error?: string;
  countryCode?: string;
  localNumber?: string;
}

/**
 * Clean and format a phone number for WhatsApp
 * @param phone - Raw phone number
 * @param defaultCountryCode - Default country code (default: 255 for Tanzania)
 * @returns Validation result with cleaned phone number
 */
export function cleanPhoneNumber(phone: string, defaultCountryCode: string = '255'): PhoneValidationResult {
  const result: PhoneValidationResult = {
    original: phone,
    cleaned: '',
    isValid: false
  };

  // Check if phone is empty
  if (!phone || typeof phone !== 'string') {
    result.error = 'Phone number is empty or invalid type';
    return result;
  }

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove + if present at the start
  cleaned = cleaned.replace(/^\+/, '');
  
  // Validate minimum length
  if (cleaned.length < 9) {
    result.error = `Phone number too short (${cleaned.length} digits). Minimum 9 digits required.`;
    return result;
  }
  
  // If starts with 0, replace with default country code
  if (cleaned.startsWith('0')) {
    cleaned = defaultCountryCode + cleaned.substring(1);
  }
  
  // If doesn't start with a country code, add default
  // Country codes typically start with 1-9 and are 1-3 digits long
  if (!cleaned.match(/^[1-9]\d{10,14}$/)) {
    // Looks like a local number (9-10 digits)
    if (cleaned.length >= 9 && cleaned.length <= 10) {
      cleaned = defaultCountryCode + cleaned;
    }
  }
  
  // Final validation: phone should be 10-15 digits (international format)
  if (cleaned.length < 10) {
    result.error = `Phone number too short after cleaning (${cleaned.length} digits). Expected 10-15 digits.`;
    return result;
  }
  
  if (cleaned.length > 15) {
    result.error = `Phone number too long (${cleaned.length} digits). Maximum 15 digits allowed.`;
    return result;
  }
  
  // Check if it matches international format
  if (!cleaned.match(/^[1-9]\d{9,14}$/)) {
    result.error = `Phone number doesn't match international format: ${cleaned}`;
    return result;
  }
  
  // Extract country code (first 1-3 digits)
  const countryCodeMatch = cleaned.match(/^(\d{1,3})/);
  if (countryCodeMatch) {
    result.countryCode = countryCodeMatch[1];
    result.localNumber = cleaned.substring(countryCodeMatch[1].length);
  }
  
  result.cleaned = cleaned;
  result.isValid = true;
  
  return result;
}

/**
 * Validate multiple phone numbers
 * @param phones - Array of phone numbers
 * @param defaultCountryCode - Default country code
 * @returns Array of validation results
 */
export function validatePhoneNumbers(
  phones: string[], 
  defaultCountryCode: string = '255'
): PhoneValidationResult[] {
  return phones.map(phone => cleanPhoneNumber(phone, defaultCountryCode));
}

/**
 * Get a summary of phone number validation results
 */
export function getValidationSummary(results: PhoneValidationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  validPhones: string[];
  invalidPhones: Array<{ phone: string; error: string }>;
} {
  const validPhones = results.filter(r => r.isValid).map(r => r.cleaned);
  const invalidPhones = results
    .filter(r => !r.isValid)
    .map(r => ({ phone: r.original, error: r.error || 'Unknown error' }));
  
  return {
    total: results.length,
    valid: validPhones.length,
    invalid: invalidPhones.length,
    validPhones,
    invalidPhones
  };
}

/**
 * Format phone number for display (with + and spacing)
 * @param phone - Cleaned phone number
 * @returns Formatted phone number
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  // Remove any non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Common country codes and their formatting
  const formatters: Record<string, (num: string) => string> = {
    // Tanzania (255)
    '255': (num) => {
      if (num.length === 12) {
        return `+${num.substring(0, 3)} ${num.substring(3, 6)} ${num.substring(6, 9)} ${num.substring(9)}`;
      }
      return `+${num}`;
    },
    // Kenya (254)
    '254': (num) => {
      if (num.length === 12) {
        return `+${num.substring(0, 3)} ${num.substring(3, 6)} ${num.substring(6, 9)} ${num.substring(9)}`;
      }
      return `+${num}`;
    },
    // USA/Canada (1)
    '1': (num) => {
      if (num.length === 11) {
        return `+${num.substring(0, 1)} (${num.substring(1, 4)}) ${num.substring(4, 7)}-${num.substring(7)}`;
      }
      return `+${num}`;
    },
    // India (91)
    '91': (num) => {
      if (num.length === 12) {
        return `+${num.substring(0, 2)} ${num.substring(2, 7)} ${num.substring(7)}`;
      }
      return `+${num}`;
    }
  };
  
  // Try to detect country code and format
  for (const [code, formatter] of Object.entries(formatters)) {
    if (cleaned.startsWith(code)) {
      return formatter(cleaned);
    }
  }
  
  // Default formatting
  return `+${cleaned}`;
}

/**
 * Common country codes
 */
export const COUNTRY_CODES = {
  TZ: '255', // Tanzania
  KE: '254', // Kenya
  UG: '256', // Uganda
  RW: '250', // Rwanda
  BI: '257', // Burundi
  US: '1',   // USA/Canada
  GB: '44',  // UK
  IN: '91',  // India
  PK: '92',  // Pakistan
  NG: '234', // Nigeria
  ZA: '27',  // South Africa
  EG: '20',  // Egypt
  MA: '212', // Morocco
  AE: '971', // UAE
  SA: '966', // Saudi Arabia
};

/**
 * Detect country code from phone number
 */
export function detectCountryCode(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  
  // Check against known country codes
  for (const [_, code] of Object.entries(COUNTRY_CODES)) {
    if (cleaned.startsWith(code)) {
      return code;
    }
  }
  
  return null;
}

/**
 * Examples of valid phone numbers for different countries
 */
export const PHONE_NUMBER_EXAMPLES = {
  TZ: ['255712345678', '255754123456', '0712345678'],
  KE: ['254712345678', '254722123456', '0712345678'],
  UG: ['256712345678', '256772123456', '0712345678'],
  US: ['1234567890', '2025551234'],
  UK: ['447911123456', '442079461234'],
};

/**
 * Get help text for phone number formatting
 */
export function getPhoneFormatHelp(countryCode?: string): string {
  const code = countryCode || '255';
  
  const helpTexts: Record<string, string> = {
    '255': 'Tanzania format: 255XXXXXXXXX (e.g., 255712345678) or 0712345678',
    '254': 'Kenya format: 254XXXXXXXXX (e.g., 254712345678) or 0712345678',
    '256': 'Uganda format: 256XXXXXXXXX (e.g., 256712345678) or 0712345678',
    '1': 'USA/Canada format: 1XXXXXXXXXX (e.g., 12025551234)',
    '91': 'India format: 91XXXXXXXXXX (e.g., 919876543210)',
  };
  
  return helpTexts[code] || `International format: ${code}XXXXXXXXX (country code + local number without +, spaces, or dashes)`;
}
