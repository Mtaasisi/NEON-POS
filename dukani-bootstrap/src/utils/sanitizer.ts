/**
 * XSS Protection and Input Sanitization Utilities
 * 
 * Provides comprehensive sanitization for user inputs to prevent
 * Cross-Site Scripting (XSS) attacks.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content allowing only safe tags
 * Use this for rich text fields that need formatting
 */
export const sanitizeHtml = (dirty: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: string[];
}): string => {
  const defaultConfig = {
    ALLOWED_TAGS: options?.allowedTags || [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'
    ],
    ALLOWED_ATTR: options?.allowedAttributes || ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  };

  return DOMPurify.sanitize(dirty, defaultConfig);
};

/**
 * Sanitize plain text - strips all HTML and encodes special characters
 * Use this for fields that should never contain HTML
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

/**
 * Sanitize URL to prevent javascript: and data: schemes
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  
  const urlLower = url.toLowerCase().trim();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (urlLower.startsWith(protocol)) {
      return '';
    }
  }
  
  // Only allow http, https, mailto, tel
  const allowedProtocols = /^(https?|mailto|tel):/i;
  if (url.includes(':') && !allowedProtocols.test(url)) {
    return '';
  }
  
  return url;
};

/**
 * Sanitize filename to prevent path traversal
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename) return '';
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars
    .replace(/\.{2,}/g, '.') // Remove multiple dots
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length
};

/**
 * Sanitize JSON string
 */
export const sanitizeJson = (jsonString: string): string => {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed);
  } catch {
    return '';
  }
};

/**
 * Sanitize email address
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const cleaned = email.toLowerCase().trim();
  
  return emailRegex.test(cleaned) ? cleaned : '';
};

/**
 * Sanitize phone number - remove all non-numeric except leading +
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone) return '';
  
  let cleaned = phone.trim();
  
  // Keep leading + for international format
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\D/g, '');
  
  return hasPlus ? '+' + cleaned : cleaned;
};

/**
 * Sanitize SQL-like input (additional protection beyond parameterized queries)
 */
export const sanitizeSqlInput = (input: string): string => {
  if (!input) return '';
  
  // Remove SQL keywords and special chars that could be dangerous
  const dangerous = [
    'DROP', 'DELETE', 'INSERT', 'UPDATE', 'EXEC', 'EXECUTE',
    'SCRIPT', 'UNION', 'SELECT', '--', '/*', '*/', ';'
  ];
  
  let cleaned = input;
  dangerous.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  
  return cleaned.trim();
};

/**
 * Sanitize object recursively
 * Useful for sanitizing entire form data objects
 */
export const sanitizeObject = <T extends Record<string, any>>(
  obj: T,
  options?: {
    htmlFields?: string[]; // Fields that allow HTML
    urlFields?: string[]; // Fields that are URLs
    emailFields?: string[]; // Fields that are emails
    phoneFields?: string[]; // Fields that are phone numbers
  }
): T => {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    const value = sanitized[key];
    
    if (value === null || value === undefined) {
      continue;
    }
    
    // Handle nested objects
    if (typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value, options);
      continue;
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeText(item) :
        typeof item === 'object' ? sanitizeObject(item, options) :
        item
      ) as any;
      continue;
    }
    
    // Only sanitize strings
    if (typeof value !== 'string') {
      continue;
    }
    
    // Apply appropriate sanitization based on field type
    if (options?.htmlFields?.includes(key)) {
      sanitized[key] = sanitizeHtml(value) as any;
    } else if (options?.urlFields?.includes(key)) {
      sanitized[key] = sanitizeUrl(value) as any;
    } else if (options?.emailFields?.includes(key)) {
      sanitized[key] = sanitizeEmail(value) as any;
    } else if (options?.phoneFields?.includes(key)) {
      sanitized[key] = sanitizePhone(value) as any;
    } else {
      // Default to text sanitization
      sanitized[key] = sanitizeText(value) as any;
    }
  }
  
  return sanitized;
};

/**
 * Content Security Policy (CSP) header value
 * Use this in your server response headers
 */
export const CSP_HEADER = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://*.neon.tech wss://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
};

/**
 * Sanitization middleware for Express
 * Add to your server to automatically sanitize all request bodies
 */
export const sanitizationMiddleware = (req: any, res: any, next: any) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

export default {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeJson,
  sanitizeEmail,
  sanitizePhone,
  sanitizeSqlInput,
  sanitizeObject,
  CSP_HEADER,
  sanitizationMiddleware
};

