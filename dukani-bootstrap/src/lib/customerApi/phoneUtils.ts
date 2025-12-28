/**
 * Phone number utility functions for customer search
 */

/**
 * Clean and normalize a phone number
 * Removes spaces, dashes, parentheses, and other common formatting characters
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except + at the start
  let cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');
  
  // Keep the + if it's at the beginning
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
  }
  
  return cleaned;
}

/**
 * Generate phone number variations for search
 * Handles different formats like:
 * - With/without country code
 * - With/without +
 * - With/without leading zero
 */
export function getPhoneNumberVariations(phoneInput: string): string[] {
  if (!phoneInput) return [];
  
  const cleaned = cleanPhoneNumber(phoneInput);
  const variations: Set<string> = new Set();
  
  // If it's not a phone number (too short or has letters), return empty
  if (cleaned.length < 4 || /[a-zA-Z]/.test(phoneInput)) {
    return [];
  }
  
  // Add the cleaned version
  variations.add(cleaned);
  
  // Handle international format (+962...)
  if (cleaned.startsWith('+962')) {
    const withoutPlus = cleaned.slice(1);
    const localNumber = cleaned.slice(4); // Remove +962
    
    variations.add(withoutPlus); // 962...
    variations.add(localNumber); // Local number without country code
    
    // Add version with leading zero if not present
    if (!localNumber.startsWith('0')) {
      variations.add('0' + localNumber);
    }
  }
  
  // Handle Jordan format (962... without +)
  if (cleaned.startsWith('962') && !cleaned.startsWith('+')) {
    const localNumber = cleaned.slice(3);
    variations.add('+' + cleaned); // +962...
    variations.add(localNumber);
    
    if (!localNumber.startsWith('0')) {
      variations.add('0' + localNumber);
    }
  }
  
  // Handle local format (07... or 7...)
  if (cleaned.startsWith('07') || cleaned.startsWith('7')) {
    const withoutZero = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;
    const withZero = cleaned.startsWith('0') ? cleaned : '0' + cleaned;
    
    variations.add(withZero); // 07...
    variations.add(withoutZero); // 7...
    variations.add('+962' + withoutZero); // +9627...
    variations.add('962' + withoutZero); // 9627...
  }
  
  // If it starts with 0 but not 07, still handle it
  if (cleaned.startsWith('0') && !cleaned.startsWith('07')) {
    const withoutZero = cleaned.slice(1);
    variations.add(withoutZero);
    variations.add('+962' + withoutZero);
    variations.add('962' + withoutZero);
  }
  
  // Remove empty strings and return as array
  return Array.from(variations).filter(v => v.length > 0);
}

