// Format utility for LATS module
export interface FormatOptions {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

// Default format options
const DEFAULT_OPTIONS: FormatOptions = {
  currency: 'TZS',
  locale: 'en-TZ',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
};

// Track warned amounts to prevent duplicate console spam
const warnedAmounts = new Set<string>();

/**
 * Format a number as currency
 * Shows real values with corruption warning if unrealistic
 * Handles both number and string inputs with proper type coercion
 */
export function money(
  amount: number | string | null | undefined, 
  options: FormatOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Step 1: Convert to number with robust handling
  let realAmount: number;
  
  if (amount === null || amount === undefined) {
    realAmount = 0;
  } else if (typeof amount === 'string') {
    // Check for concatenated decimal patterns (e.g., "123.45678.90")
    const concatenatedPattern = /[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}/;
    if (concatenatedPattern.test(amount)) {
      const amountKey = `concat-${amount}`;
      if (!warnedAmounts.has(amountKey)) {
        warnedAmounts.add(amountKey);
        console.warn(`⚠️ Invalid amount detected: ${amount}. Showing as 0.`);
        setTimeout(() => warnedAmounts.delete(amountKey), 60000);
      }
      return `${opts.currency} 0`;
    }
    
    // Parse string to number
    realAmount = parseFloat(amount);
    
    // Check if parsing failed
    if (isNaN(realAmount)) {
      const amountKey = `invalid-${amount}`;
      if (!warnedAmounts.has(amountKey)) {
        warnedAmounts.add(amountKey);
        console.warn(`⚠️ Invalid amount detected: ${amount}. Showing as 0.`);
        setTimeout(() => warnedAmounts.delete(amountKey), 60000);
      }
      return `${opts.currency} 0`;
    }
  } else if (typeof amount === 'number') {
    realAmount = amount;
  } else {
    // Unexpected type
    const amountKey = `type-${typeof amount}`;
    if (!warnedAmounts.has(amountKey)) {
      warnedAmounts.add(amountKey);
      console.warn(`⚠️ Unexpected amount type: ${typeof amount}. Showing as 0.`);
      setTimeout(() => warnedAmounts.delete(amountKey), 60000);
    }
    return `${opts.currency} 0`;
  }
  
  // Step 2: Validate the number value
  const MAX_REALISTIC_AMOUNT = 1_000_000_000_000; // 1 trillion
  const isCorrupt = Math.abs(realAmount) > MAX_REALISTIC_AMOUNT;
  
  // Only warn once per unique corrupt amount to prevent console spam
  if (isCorrupt) {
    const amountKey = `${realAmount}`;
    if (!warnedAmounts.has(amountKey)) {
      warnedAmounts.add(amountKey);
      console.warn(`⚠️ CORRUPT DATA - Unrealistic amount detected: ${realAmount}`);
      // Clear the cache after a minute to allow re-warnings for new data
      setTimeout(() => warnedAmounts.delete(amountKey), 60000);
    }
  }
  
  // Safety check: Handle NaN and Infinity
  if (!isFinite(realAmount)) {
    const amountKey = `invalid-${amount}`;
    if (!warnedAmounts.has(amountKey)) {
      warnedAmounts.add(amountKey);
      console.warn(`⚠️ Invalid amount detected: ${amount}. Showing as 0.`);
      setTimeout(() => warnedAmounts.delete(amountKey), 60000);
    }
    return `${opts.currency} 0`;
  }
  
  // For corrupt amounts, show a safe fallback value
  if (isCorrupt) {
    return `${opts.currency} 0 ⚠️`;
  }
  
  // Step 3: Format the validated number
  try {
    return new Intl.NumberFormat(opts.locale, {
      style: 'currency',
      currency: opts.currency,
      minimumFractionDigits: opts.minimumFractionDigits,
      maximumFractionDigits: opts.maximumFractionDigits
    }).format(realAmount);
  } catch (error) {
    // Fallback formatting
    return `${opts.currency} ${realAmount.toFixed(opts.maximumFractionDigits || 2)}`;
  }
}

/**
 * Safely parse an amount to a number
 * Returns 0 for invalid values
 */
export function parseAmount(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined) {
    return 0;
  }
  
  if (typeof amount === 'number') {
    // Validate it's a safe number
    if (!isFinite(amount) || Math.abs(amount) > 1_000_000_000_000) {
      console.warn(`⚠️ Invalid numeric amount: ${amount}, returning 0`);
      return 0;
    }
    return amount;
  }
  
  if (typeof amount === 'string') {
    // Check for concatenated patterns first
    const concatenatedPattern = /[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}/;
    if (concatenatedPattern.test(amount)) {
      console.warn(`⚠️ Concatenated string amount detected: ${amount}, returning 0`);
      return 0;
    }
    
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || !isFinite(parsed) || Math.abs(parsed) > 1_000_000_000_000) {
      console.warn(`⚠️ Invalid string amount: ${amount}, returning 0`);
      return 0;
    }
    return parsed;
  }
  
  console.warn(`⚠️ Unexpected amount type: ${typeof amount}, returning 0`);
  return 0;
}

/**
 * Format a number as currency (alias for money)
 */
export function currency(
  amount: number, 
  options: FormatOptions = {}
): string {
  return money(amount, options);
}

/**
 * Format a number as percentage
 */
export function percent(
  value: number, 
  options: Omit<FormatOptions, 'currency'> = {}
): string {
  const opts = { 
    locale: DEFAULT_OPTIONS.locale,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options 
  };
  
  try {
    return new Intl.NumberFormat(opts.locale, {
      style: 'percent',
      minimumFractionDigits: opts.minimumFractionDigits,
      maximumFractionDigits: opts.maximumFractionDigits
    }).format(value / 100);
  } catch (error) {
    // Fallback formatting
    return `${value.toFixed(opts.maximumFractionDigits || 2)}%`;
  }
}

/**
 * Format a number with thousands separators
 */
export function number(
  value: number, 
  options: Omit<FormatOptions, 'currency'> = {}
): string {
  const opts = { 
    locale: DEFAULT_OPTIONS.locale,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options 
  };
  
  try {
    return new Intl.NumberFormat(opts.locale, {
      minimumFractionDigits: opts.minimumFractionDigits,
      maximumFractionDigits: opts.maximumFractionDigits
    }).format(value);
  } catch (error) {
    // Fallback formatting
    return value.toFixed(opts.maximumFractionDigits || 2);
  }
}

/**
 * Format a date
 */
export function date(
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = DEFAULT_OPTIONS.locale;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  try {
    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
  } catch (error) {
    // Fallback formatting
    return dateObj.toLocaleDateString();
  }
}

/**
 * Format a date and time
 */
export function dateTime(
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = DEFAULT_OPTIONS.locale;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  try {
    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
  } catch (error) {
    // Fallback formatting
    return dateObj.toLocaleString();
  }
}

/**
 * Format a relative time (e.g., "2 hours ago", "3 days ago")
 */
export function relativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}

/**
 * Format file size
 */
export function fileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format phone number
 */
export function phoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format Kenyan phone numbers
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  
  // Format 11-digit numbers (remove leading 0)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+254 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  // Return original if no pattern matches
  return phone;
}

/**
 * Format SKU with padding
 */
export function formatSKU(sku: string, prefix: string = '', length: number = 6): string {
  const numericPart = sku.replace(/\D/g, '');
  const paddedNumber = numericPart.padStart(length, '0');
  return `${prefix}${paddedNumber}`;
}

/**
 * Format order number
 */
export function formatOrderNumber(orderNumber: string): string {
  return orderNumber.toUpperCase();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Format attributes object to readable string
 */
export function formatAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([key, value]) => `${capitalize(key)}: ${value}`)
    .join(', ');
}

// Default export with all formatting functions
export const format = {
  money,
  currency,
  percent,
  number,
  date,
  dateTime,
  relativeTime,
  fileSize,
  phoneNumber,
  formatSKU,
  formatOrderNumber,
  truncate,
  capitalize,
  formatAttributes,
  parseAmount
};
