/**
 * Format phone numbers for invoice/receipt display
 * Handles JSON arrays, adds country codes, and formats nicely
 */

import { parsePhoneEntries, PhoneEntry } from '../lib/formatBusinessInfo';
import { cleanPhoneNumber } from './phoneNumberCleaner';

/**
 * Format a phone number with country code for Tanzania
 * Converts 0712345678 to +255712345678
 */
function formatPhoneWithCountryCode(phone: string): string {
  if (!phone) return '';
  
  // Clean the phone number (remove all non-digits)
  let cleaned = phone.replace(/\D/g, '');
  
  if (!cleaned || cleaned.length === 0) return phone;
  
  // If starts with 0 and is 10 digits, replace 0 with 255
  // Example: 0712378850 -> 255712378850
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '255' + cleaned.substring(1);
    return `+${cleaned}`;
  }
  
  // If starts with 255 and is 12 digits, just add +
  // Example: 255712378850 -> +255712378850
  if (cleaned.startsWith('255') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  // If already has + in original, check if valid format
  if (phone.startsWith('+')) {
    const withoutPlus = phone.substring(1).replace(/\D/g, '');
    if (withoutPlus.startsWith('255') && withoutPlus.length === 12) {
      return phone; // Already formatted correctly
    }
    // Try to fix it
    if (withoutPlus.startsWith('0') && withoutPlus.length === 10) {
      return `+255${withoutPlus.substring(1)}`;
    }
    return phone;
  }
  
  // If it's a 9-digit number (without leading 0), assume Tanzania and add 255
  if (cleaned.length === 9) {
    return `+255${cleaned}`;
  }
  
  // Try to clean and format using the phone cleaner utility
  try {
    const result = cleanPhoneNumber(phone, '255');
    if (result.isValid && result.cleaned) {
      return `+${result.cleaned}`;
    }
  } catch (error) {
    // If cleaning fails, continue with manual formatting
  }
  
  // Default: if it looks valid, add + and country code if needed
  if (cleaned.length >= 9 && cleaned.length <= 15) {
    // If doesn't start with country code, add 255 for Tanzania
    if (!cleaned.startsWith('255') && !cleaned.startsWith('0')) {
      // Might be missing country code
      if (cleaned.length === 9) {
        return `+255${cleaned}`;
      }
    }
    // If starts with 0, replace with 255
    if (cleaned.startsWith('0')) {
      cleaned = '255' + cleaned.substring(1);
    }
    return `+${cleaned}`;
  }
  
  // Return as is if we can't determine format
  return phone.startsWith('+') ? phone : `+${cleaned}`;
}

/**
 * Format phone numbers for invoice contact display
 * Handles JSON arrays, plain strings, and formats nicely
 */
export function formatContactForInvoice(contactInfo: string | undefined | null): string {
  if (!contactInfo || contactInfo.trim() === '') {
    return '';
  }
  
  // Try to parse as JSON array first
  try {
    const parsed = JSON.parse(contactInfo);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // It's a JSON array - format each phone number
      const formattedPhones = parsed.map((item: any) => {
        const phone = typeof item === 'string' ? item : (item?.phone || '');
        if (!phone) return null;
        
        const formatted = formatPhoneWithCountryCode(phone);
        const whatsapp = typeof item === 'object' && item !== null && item.whatsapp === true;
        
        // Add WhatsApp indicator if applicable
        return whatsapp ? `${formatted} 📱` : formatted;
      }).filter((phone: string | null) => phone !== null);
      
      // Join with comma and space
      return formattedPhones.join(', ');
    }
  } catch {
    // Not JSON, continue with other formats
  }
  
  // Try using parsePhoneEntries (handles JSON arrays and plain strings)
  try {
    const entries = parsePhoneEntries(contactInfo);
    if (entries.length > 0) {
      const formattedPhones = entries.map(entry => {
        const formatted = formatPhoneWithCountryCode(entry.phone);
        return entry.whatsapp ? `${formatted} 📱` : formatted;
      });
      return formattedPhones.join(', ');
    }
  } catch {
    // If parsing fails, continue
  }
  
  // If it's a plain string (not JSON), format it
  // Check if it contains multiple numbers (comma-separated)
  if (contactInfo.includes(',')) {
    const phones = contactInfo.split(',').map(p => p.trim()).filter(p => p.length > 0);
    return phones.map(formatPhoneWithCountryCode).join(', ');
  }
  
  // Single phone number
  return formatPhoneWithCountryCode(contactInfo);
}

/**
 * Format phone numbers for display in receipt messages
 * Returns a clean, formatted string suitable for SMS/WhatsApp
 */
export function formatContactForMessage(contactInfo: string | undefined | null): string {
  const formatted = formatContactForInvoice(contactInfo);
  
  // For messages, remove WhatsApp emoji if present (keep it simple)
  return formatted.replace(/ 📱/g, '');
}
