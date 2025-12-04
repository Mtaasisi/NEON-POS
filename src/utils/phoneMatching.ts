/**
 * Enhanced Phone Number Matching Utility
 * Handles all common Tanzanian phone number format variations
 * 
 * Supports:
 * - +255712345678
 * - 255712345678
 * - 0712345678
 * - 712345678
 * - +255 712 345 678
 * - 0712-345-678
 */

/**
 * Normalize phone number to standard format (remove all non-digits except +)
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove spaces, dashes, parentheses, dots
  let cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');
  
  // Keep only digits and + at the start
  cleaned = cleaned.replace(/[^\d+]/g, '');
  
  // Ensure + is only at the start
  if (cleaned.includes('+')) {
    cleaned = '+' + cleaned.replace(/\+/g, '');
  }
  
  return cleaned;
}

/**
 * Get the last 9 digits of a phone number (unique identifier for Tanzanian numbers)
 */
export function getPhoneLast9Digits(phone: string): string {
  const normalized = normalizePhone(phone).replace(/\+/g, '');
  if (normalized.length >= 9) {
    return normalized.slice(-9);
  }
  return normalized;
}

/**
 * Generate all possible phone number variations for matching
 */
export function getPhoneVariations(phone: string): string[] {
  if (!phone) return [];
  
  const normalized = normalizePhone(phone);
  const variations = new Set<string>([normalized]);
  
  // Remove + prefix
  const withoutPlus = normalized.replace(/^\+/, '');
  variations.add(withoutPlus);
  
  // Add + prefix if not present
  if (!normalized.startsWith('+')) {
    variations.add('+' + withoutPlus);
  }
  
  // Handle Tanzanian country code (255)
  if (withoutPlus.startsWith('255')) {
    // Remove country code: 255712345678 -> 712345678
    const without255 = withoutPlus.substring(3);
    variations.add(without255);
    variations.add('+' + withoutPlus);
    
    // Add with leading 0: 712345678 -> 0712345678
    if (!without255.startsWith('0')) {
      variations.add('0' + without255);
    }
  } else if (withoutPlus.startsWith('0')) {
    // If starts with 0, add variations with 255
    const without0 = withoutPlus.substring(1);
    variations.add(without0);
    variations.add('255' + without0);
    variations.add('+255' + without0);
  } else {
    // Just digits, add all variations
    variations.add('0' + withoutPlus);
    variations.add('255' + withoutPlus);
    variations.add('+255' + withoutPlus);
  }
  
  return Array.from(variations);
}

/**
 * Check if two phone numbers match
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  if (!phone1 || !phone2) return false;
  
  // Try exact match after normalization
  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);
  
  if (normalized1 === normalized2) return true;
  
  // Try matching by last 9 digits (works for most Tanzanian numbers)
  const last9_1 = getPhoneLast9Digits(phone1);
  const last9_2 = getPhoneLast9Digits(phone2);
  
  if (last9_1 && last9_2 && last9_1 === last9_2 && last9_1.length === 9) {
    return true;
  }
  
  // Try all variations
  const variations1 = getPhoneVariations(phone1);
  const variations2 = getPhoneVariations(phone2);
  
  return variations1.some(v1 => variations2.includes(v1));
}

/**
 * Find customer by phone number with fuzzy matching
 * Returns the customer object or null
 */
export function findCustomerByPhoneMatch(
  phone: string, 
  customers: Array<{ phone?: string; whatsapp?: string; [key: string]: any }>
): any | null {
  if (!phone || !customers || customers.length === 0) return null;
  
  // Try exact match first (fastest)
  const normalizedSearch = normalizePhone(phone);
  let match = customers.find(c => 
    normalizePhone(c.phone || '') === normalizedSearch || 
    normalizePhone(c.whatsapp || '') === normalizedSearch
  );
  
  if (match) return match;
  
  // Try last 9 digits match (very reliable for Tanzanian numbers)
  const searchLast9 = getPhoneLast9Digits(phone);
  if (searchLast9 && searchLast9.length === 9) {
    match = customers.find(c => {
      const phoneLast9 = getPhoneLast9Digits(c.phone || '');
      const whatsappLast9 = getPhoneLast9Digits(c.whatsapp || '');
      return phoneLast9 === searchLast9 || whatsappLast9 === searchLast9;
    });
    
    if (match) return match;
  }
  
  // Try all variations (slowest, but most thorough)
  const searchVariations = getPhoneVariations(phone);
  match = customers.find(c => {
    const phoneVariations = getPhoneVariations(c.phone || '');
    const whatsappVariations = getPhoneVariations(c.whatsapp || '');
    
    return searchVariations.some(sv => 
      phoneVariations.includes(sv) || whatsappVariations.includes(sv)
    );
  });
  
  return match || null;
}

