/**
 * Utility functions for formatting business information
 */

export interface PhoneEntry {
  phone: string;
  whatsapp: boolean;
}

/**
 * Parse phone numbers - supports both JSON format and legacy comma-separated format
 */
export const parsePhoneEntries = (phoneString: string | undefined | null): PhoneEntry[] => {
  if (!phoneString || phoneString.trim() === '') return [];
  
  try {
    // Try to parse as JSON first (new format)
    const parsed = JSON.parse(phoneString);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        phone: typeof item === 'string' ? item : (item.phone || ''),
        whatsapp: typeof item === 'object' && item !== null ? (item.whatsapp === true) : false
      })).filter((item: PhoneEntry) => item.phone && item.phone.trim().length > 0);
    }
  } catch {
    // Not JSON, try legacy comma-separated format
    const phones = phoneString.split(',').map(p => p.trim()).filter(p => p.length > 0);
    return phones.map(phone => ({ phone, whatsapp: false }));
  }
  
  return [];
};

/**
 * Parse phone numbers from comma-separated string (legacy support)
 */
export const parsePhoneNumbers = (phoneString: string | undefined | null): string[] => {
  return parsePhoneEntries(phoneString).map(entry => entry.phone);
};

/**
 * Format phone numbers for display
 * Returns formatted string or array of phones depending on format option
 */
export const formatPhoneNumbers = (
  phoneString: string | undefined | null,
  format: 'inline' | 'multiline' | 'array' = 'inline'
): string | string[] => {
  const phones = parsePhoneNumbers(phoneString);
  
  if (phones.length === 0) return format === 'array' ? [] : '';
  if (phones.length === 1) return format === 'array' ? phones : phones[0];
  
  switch (format) {
    case 'array':
      return phones;
    case 'multiline':
      return phones.join('\n');
    case 'inline':
    default:
      return phones.join(', ');
  }
};

/**
 * Format phone numbers for HTML display with WhatsApp indicators
 * Returns HTML string
 */
export const formatPhoneNumbersHTML = (
  phoneString: string | undefined | null,
  className: string = 'text-xs text-gray-600'
): string => {
  const entries = parsePhoneEntries(phoneString);
  
  if (entries.length === 0) return '';
  
  return entries.map(entry => {
    const whatsappIcon = entry.whatsapp 
      ? '<span style="color: #25D366; margin-right: 4px;">📱</span>' 
      : '';
    return `${whatsappIcon}${entry.phone}`;
  }).join('<br />');
};

/**
 * Get all phone numbers (just the numbers, no WhatsApp info)
 */
export const getAllPhoneNumbers = (phoneString: string | undefined | null): string[] => {
  return parsePhoneEntries(phoneString).map(entry => entry.phone);
};

/**
 * Get WhatsApp-enabled phone numbers only
 */
export const getWhatsAppNumbers = (phoneString: string | undefined | null): string[] => {
  return parsePhoneEntries(phoneString)
    .filter(entry => entry.whatsapp)
    .map(entry => entry.phone);
};

