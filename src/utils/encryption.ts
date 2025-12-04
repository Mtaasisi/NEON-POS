/**
 * Data Encryption Utilities
 * 
 * Provides field-level encryption for sensitive data at rest
 */

import CryptoJS from 'crypto-js';

// Encryption key should come from environment variable
const getEncryptionKey = (): string => {
  const key = import.meta.env.VITE_ENCRYPTION_KEY || 
               localStorage.getItem('app_encryption_key');
  
  if (!key) {
    console.warn('⚠️ No encryption key found. Using fallback key. Set VITE_ENCRYPTION_KEY in .env');
    // Generate a session-specific key as fallback
    const fallbackKey = `fallback-${Date.now()}-${Math.random()}`;
    localStorage.setItem('app_encryption_key', fallbackKey);
    return fallbackKey;
  }
  
  return key;
};

/**
 * Encrypt sensitive text data
 */
export const encryptText = (plaintext: string): string => {
  if (!plaintext) return '';
  
  try {
    const key = getEncryptionKey();
    const encrypted = CryptoJS.AES.encrypt(plaintext, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt sensitive text data
 */
export const decryptText = (ciphertext: string): string => {
  if (!ciphertext) return '';
  
  try {
    const key = getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Encrypt an object
 */
export const encryptObject = (obj: Record<string, any>): string => {
  try {
    const jsonString = JSON.stringify(obj);
    return encryptText(jsonString);
  } catch (error) {
    console.error('Object encryption error:', error);
    throw new Error('Failed to encrypt object');
  }
};

/**
 * Decrypt an object
 */
export const decryptObject = <T = any>(ciphertext: string): T => {
  try {
    const decrypted = decryptText(ciphertext);
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error('Object decryption error:', error);
    throw new Error('Failed to decrypt object');
  }
};

/**
 * Hash data (one-way, for comparison not retrieval)
 * Use this for checksums, not for passwords (use bcrypt for passwords)
 */
export const hashData = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};

/**
 * Generate a secure random key
 */
export const generateEncryptionKey = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const randomBytes = CryptoJS.lib.WordArray.random(length);
  const randomString = randomBytes.toString(CryptoJS.enc.Base64).substring(0, length);
  
  return randomString;
};

/**
 * Encrypt specific fields in an object
 * Only encrypts the specified fields, leaves others unchanged
 */
export const encryptFields = <T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: string[]
): T => {
  const result = { ...obj };
  
  for (const field of fieldsToEncrypt) {
    if (field in result && result[field] !== null && result[field] !== undefined) {
      const value = result[field];
      
      if (typeof value === 'string') {
        result[field] = encryptText(value);
      } else if (typeof value === 'object') {
        result[field] = encryptText(JSON.stringify(value));
      }
    }
  }
  
  return result;
};

/**
 * Decrypt specific fields in an object
 */
export const decryptFields = <T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: string[],
  parseJson: boolean = false
): T => {
  const result = { ...obj };
  
  for (const field of fieldsToDecrypt) {
    if (field in result && result[field]) {
      try {
        const decrypted = decryptText(result[field]);
        result[field] = parseJson ? JSON.parse(decrypted) : decrypted;
      } catch (error) {
        console.error(`Failed to decrypt field: ${field}`, error);
        // Leave field as is if decryption fails
      }
    }
  }
  
  return result;
};

/**
 * Check if data is encrypted (basic check)
 */
export const isEncrypted = (data: string): boolean => {
  if (!data || typeof data !== 'string') return false;
  
  // AES encrypted data typically starts with "U2FsdGVkX1" (base64 of "Salted__")
  return data.startsWith('U2FsdGVkX1');
};

/**
 * Mask sensitive data for display (e.g., credit cards, SSN)
 */
export const maskSensitiveData = (
  data: string,
  options: {
    maskChar?: string;
    visibleStart?: number;
    visibleEnd?: number;
  } = {}
): string => {
  if (!data) return '';
  
  const {
    maskChar = '*',
    visibleStart = 4,
    visibleEnd = 4
  } = options;
  
  if (data.length <= visibleStart + visibleEnd) {
    return maskChar.repeat(data.length);
  }
  
  const start = data.substring(0, visibleStart);
  const end = data.substring(data.length - visibleEnd);
  const middle = maskChar.repeat(data.length - visibleStart - visibleEnd);
  
  return `${start}${middle}${end}`;
};

/**
 * Encrypt data for storage in localStorage
 * Use this instead of storing sensitive data in plain text
 */
export const secureLocalStorage = {
  setItem: (key: string, value: any): void => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const encrypted = encryptText(stringValue);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Secure localStorage setItem error:', error);
    }
  },
  
  getItem: (key: string): any => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      
      const decrypted = decryptText(encrypted);
      
      // Try to parse as JSON, if fails return as string
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error('Secure localStorage getItem error:', error);
      return null;
    }
  },
  
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },
  
  clear: (): void => {
    localStorage.clear();
  }
};

/**
 * Sensitive fields that should be encrypted
 * Add your sensitive field names here
 */
export const SENSITIVE_FIELDS = [
  'password',
  'api_key',
  'secret',
  'token',
  'credit_card',
  'ssn',
  'tax_id',
  'bank_account',
  'api_token',
  'private_key'
];

/**
 * Auto-encrypt an object based on field names
 * Automatically encrypts fields that match common sensitive field names
 */
export const autoEncryptSensitive = <T extends Record<string, any>>(obj: T): T => {
  const fieldsToEncrypt = Object.keys(obj).filter(key =>
    SENSITIVE_FIELDS.some(sensitiveField =>
      key.toLowerCase().includes(sensitiveField)
    )
  );
  
  return encryptFields(obj, fieldsToEncrypt);
};

/**
 * Auto-decrypt an object based on field names
 */
export const autoDecryptSensitive = <T extends Record<string, any>>(obj: T): T => {
  const fieldsToDecrypt = Object.keys(obj).filter(key =>
    SENSITIVE_FIELDS.some(sensitiveField =>
      key.toLowerCase().includes(sensitiveField)
    )
  );
  
  return decryptFields(obj, fieldsToDecrypt);
};

export default {
  encryptText,
  decryptText,
  encryptObject,
  decryptObject,
  hashData,
  generateEncryptionKey,
  encryptFields,
  decryptFields,
  isEncrypted,
  maskSensitiveData,
  secureLocalStorage,
  autoEncryptSensitive,
  autoDecryptSensitive,
  SENSITIVE_FIELDS
};

