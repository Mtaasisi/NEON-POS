/**
 * Country Flags Utility
 * Centralized mapping of countries to their flag emojis and display names
 */

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  currency?: string;
}

// Comprehensive country to flag mapping
export const countryFlags: Record<string, string> = {
  // Africa
  'Tanzania': '🇹🇿',
  'Kenya': '🇰🇪',
  'Uganda': '🇺🇬',
  'Rwanda': '🇷🇼',
  'Ethiopia': '🇪🇹',
  'Nigeria': '🇳🇬',
  'Ghana': '🇬🇭',
  'South Africa': '🇿🇦',
  'Egypt': '🇪🇬',
  'Morocco': '🇲🇦',
  
  // Asia
  'China': '🇨🇳',
  'Hong Kong': '🇭🇰',
  'India': '🇮🇳',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'Singapore': '🇸🇬',
  'Malaysia': '🇲🇾',
  'Thailand': '🇹🇭',
  'Vietnam': '🇻🇳',
  'Indonesia': '🇮🇩',
  'Philippines': '🇵🇭',
  'Pakistan': '🇵🇰',
  
  // Middle East
  'UAE': '🇦🇪',
  'Saudi Arabia': '🇸🇦',
  'Turkey': '🇹🇷',
  
  // Europe
  'UK': '🇬🇧',
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'Italy': '🇮🇹',
  'Spain': '🇪🇸',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Switzerland': '🇨🇭',
  'Russia': '🇷🇺',
  
  // Americas
  'USA': '🇺🇸',
  'Canada': '🇨🇦',
  'Brazil': '🇧🇷',
  'Mexico': '🇲🇽',
  'Argentina': '🇦🇷',
  
  // Oceania
  'Australia': '🇦🇺',
  'New Zealand': '🇳🇿',
  
  // Legacy code mappings (for backward compatibility)
  'TZ': '🇹🇿',
  'KE': '🇰🇪',
  'UG': '🇺🇬',
  'RW': '🇷🇼',
  'ET': '🇪🇹',
  'NG': '🇳🇬',
  'GH': '🇬🇭',
  'ZA': '🇿🇦',
  'EG': '🇪🇬',
  'MA': '🇲🇦',
  'CN': '🇨🇳',
  'HK': '🇭🇰',
  'IN': '🇮🇳',
  'JP': '🇯🇵',
  'KR': '🇰🇷',
  'SG': '🇸🇬',
  'MY': '🇲🇾',
  'TH': '🇹🇭',
  'VN': '🇻🇳',
  'ID': '🇮🇩',
  'PH': '🇵🇭',
  'PK': '🇵🇰',
  'AE': '🇦🇪',
  'SA': '🇸🇦',
  'TR': '🇹🇷',
  'GB': '🇬🇧',
  'DE': '🇩🇪',
  'FR': '🇫🇷',
  'IT': '🇮🇹',
  'ES': '🇪🇸',
  'NL': '🇳🇱',
  'BE': '🇧🇪',
  'CH': '🇨🇭',
  'RU': '🇷🇺',
  'US': '🇺🇸',
  'CA': '🇨🇦',
  'BR': '🇧🇷',
  'MX': '🇲🇽',
  'AR': '🇦🇷',
  'AU': '🇦🇺',
  'NZ': '🇳🇿',
};

// Full country information with currency mapping
export const countryInfo: Record<string, CountryInfo> = {
  'Tanzania': { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS' },
  'Kenya': { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  'Uganda': { code: 'UG', name: 'Uganda', flag: '🇺🇬', currency: 'UGX' },
  'Rwanda': { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF' },
  'Ethiopia': { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', currency: 'ETB' },
  'Nigeria': { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  'Ghana': { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS' },
  'South Africa': { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR' },
  'Egypt': { code: 'EG', name: 'Egypt', flag: '🇪🇬', currency: 'EGP' },
  'Morocco': { code: 'MA', name: 'Morocco', flag: '🇲🇦', currency: 'MAD' },
  'China': { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY' },
  'Hong Kong': { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', currency: 'HKD' },
  'India': { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR' },
  'Japan': { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY' },
  'South Korea': { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW' },
  'Singapore': { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD' },
  'Malaysia': { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'MYR' },
  'Thailand': { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'THB' },
  'Vietnam': { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND' },
  'Indonesia': { code: 'ID', name: 'Indonesia', flag: '🇮🇩', currency: 'IDR' },
  'Philippines': { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP' },
  'Pakistan': { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR' },
  'UAE': { code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED' },
  'Saudi Arabia': { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR' },
  'Turkey': { code: 'TR', name: 'Turkey', flag: '🇹🇷', currency: 'TRY' },
  'UK': { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  'Germany': { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR' },
  'France': { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR' },
  'Italy': { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR' },
  'Spain': { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR' },
  'Netherlands': { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR' },
  'Belgium': { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'EUR' },
  'Switzerland': { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF' },
  'Russia': { code: 'RU', name: 'Russia', flag: '🇷🇺', currency: 'RUB' },
  'USA': { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' },
  'Canada': { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
  'Brazil': { code: 'BR', name: 'Brazil', flag: '🇧🇷', currency: 'BRL' },
  'Mexico': { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'MXN' },
  'Argentina': { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS' },
  'Australia': { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD' },
  'New Zealand': { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currency: 'NZD' },
};

/**
 * Get flag emoji for a country
 * @param country - Country name or code
 * @returns Flag emoji or default globe emoji
 */
export const getCountryFlag = (country?: string | null): string => {
  if (!country) return '🌍';
  return countryFlags[country] || countryFlags[country.toUpperCase()] || '🌍';
};

/**
 * Get full country information
 * @param country - Country name or code
 * @returns Country info object or null
 */
export const getCountryInfo = (country?: string | null): CountryInfo | null => {
  if (!country) return null;
  return countryInfo[country] || null;
};

/**
 * Format country display with flag and name
 * @param country - Country name or code
 * @param options - Display options
 * @returns Formatted string with flag and country name
 */
export const formatCountryDisplay = (
  country?: string | null,
  options?: {
    showFlag?: boolean;
    showName?: boolean;
    flagFirst?: boolean;
  }
): string => {
  const { showFlag = true, showName = true, flagFirst = true } = options || {};
  
  if (!country) return '';
  
  const flag = getCountryFlag(country);
  const name = country;
  
  if (showFlag && !showName) return flag;
  if (!showFlag && showName) return name;
  
  return flagFirst ? `${flag} ${name}` : `${name} ${flag}`;
};

/**
 * Get list of all countries with flags for dropdowns
 * @returns Array of country display strings
 */
export const getCountryOptions = (): Array<{ value: string; label: string; flag: string }> => {
  return Object.entries(countryInfo).map(([key, info]) => ({
    value: key,
    label: info.name,
    flag: info.flag,
  })).sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Component: Country Badge
 * Ready-to-use component for displaying country with flag
 */
export interface CountryBadgeProps {
  country?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

/**
 * Get CSS classes for country badge based on size
 */
export const getCountryBadgeClasses = (size: 'sm' | 'md' | 'lg' = 'md'): string => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  
  return `inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full font-medium ${sizeClasses[size]}`;
};

export default {
  countryFlags,
  countryInfo,
  getCountryFlag,
  getCountryInfo,
  formatCountryDisplay,
  getCountryOptions,
  getCountryBadgeClasses,
};

