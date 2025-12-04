/**
 * Password Policy and Validation
 * 
 * Enforces strong password requirements and provides
 * password strength assessment.
 */

import zxcvbn from 'zxcvbn';

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-4 (0=weak, 4=strong)
  strength: 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    notCommon: boolean;
  };
}

export interface PasswordPolicyConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  minScore: number; // Minimum zxcvbn score (0-4)
  preventCommon: boolean;
}

// Default password policy configuration
export const DEFAULT_PASSWORD_POLICY: PasswordPolicyConfig = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  minScore: 3, // Strong password required
  preventCommon: true
};

// Relaxed policy for less critical accounts
export const RELAXED_PASSWORD_POLICY: PasswordPolicyConfig = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
  minScore: 2,
  preventCommon: true
};

// Common passwords to prevent (top 100 most common)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password1',
  '12345678', '111111', '123123', '1234567890', '1234567', 'password123',
  'admin', 'welcome', 'monkey', 'login', 'starwars', 'dragon', 'master',
  'hello', 'freedom', 'whatever', 'qazwsx', 'trustno1', 'letmein'
]);

/**
 * Validate password against policy
 */
export const validatePassword = (
  password: string,
  policy: PasswordPolicyConfig = DEFAULT_PASSWORD_POLICY,
  userData?: string[]
): PasswordValidationResult => {
  const feedback: string[] = [];
  
  // Check minimum length
  const hasMinLength = password.length >= policy.minLength;
  if (!hasMinLength) {
    feedback.push(`Password must be at least ${policy.minLength} characters long`);
  }
  
  // Check for uppercase letter
  const hasUppercase = /[A-Z]/.test(password);
  if (policy.requireUppercase && !hasUppercase) {
    feedback.push('Password must contain at least one uppercase letter (A-Z)');
  }
  
  // Check for lowercase letter
  const hasLowercase = /[a-z]/.test(password);
  if (policy.requireLowercase && !hasLowercase) {
    feedback.push('Password must contain at least one lowercase letter (a-z)');
  }
  
  // Check for number
  const hasNumber = /[0-9]/.test(password);
  if (policy.requireNumber && !hasNumber) {
    feedback.push('Password must contain at least one number (0-9)');
  }
  
  // Check for special character
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (policy.requireSpecialChar && !hasSpecialChar) {
    feedback.push('Password must contain at least one special character (!@#$%^&*...)');
  }
  
  // Check against common passwords
  const notCommon = !COMMON_PASSWORDS.has(password.toLowerCase());
  if (policy.preventCommon && !notCommon) {
    feedback.push('This password is too common. Please choose a more unique password');
  }
  
  // Use zxcvbn for advanced strength checking
  const result = zxcvbn(password, userData);
  
  // Add zxcvbn feedback
  if (result.feedback.warning) {
    feedback.push(result.feedback.warning);
  }
  result.feedback.suggestions.forEach(suggestion => {
    feedback.push(suggestion);
  });
  
  // Check if score meets minimum
  if (result.score < policy.minScore) {
    feedback.push(`Password is not strong enough. Try adding more characters or complexity`);
  }
  
  // Determine strength label
  const strengthLabels: Array<'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong'> = [
    'very-weak', 'weak', 'fair', 'strong', 'very-strong'
  ];
  const strength = strengthLabels[result.score];
  
  // Password is valid if it meets all requirements
  const isValid = 
    hasMinLength &&
    (!policy.requireUppercase || hasUppercase) &&
    (!policy.requireLowercase || hasLowercase) &&
    (!policy.requireNumber || hasNumber) &&
    (!policy.requireSpecialChar || hasSpecialChar) &&
    (!policy.preventCommon || notCommon) &&
    result.score >= policy.minScore;
  
  return {
    isValid,
    score: result.score,
    strength,
    feedback: [...new Set(feedback)], // Remove duplicates
    requirements: {
      minLength: hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecialChar,
      notCommon
    }
  };
};

/**
 * Generate a strong random password
 */
export const generateStrongPassword = (length: number = 16): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one of each required character type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Check if password has been breached (basic check against common list)
 * For production, integrate with HaveIBeenPwned API
 */
export const checkPasswordBreach = async (password: string): Promise<boolean> => {
  // Basic check against common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return true; // Password is breached/common
  }
  
  // TODO: Integrate with HaveIBeenPwned API for production
  // https://haveibeenpwned.com/API/v3#PwnedPasswords
  
  return false; // Password is not in common list
};

/**
 * Calculate password entropy (bits)
 */
export const calculatePasswordEntropy = (password: string): number => {
  let charsetSize = 0;
  
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 33; // Special chars
  
  return Math.log2(Math.pow(charsetSize, password.length));
};

/**
 * Get password strength color for UI
 */
export const getPasswordStrengthColor = (score: number): {
  bg: string;
  text: string;
  label: string;
} => {
  switch (score) {
    case 0:
      return { bg: 'bg-red-500', text: 'text-red-700', label: 'Very Weak' };
    case 1:
      return { bg: 'bg-orange-500', text: 'text-orange-700', label: 'Weak' };
    case 2:
      return { bg: 'bg-yellow-500', text: 'text-yellow-700', label: 'Fair' };
    case 3:
      return { bg: 'bg-blue-500', text: 'text-blue-700', label: 'Strong' };
    case 4:
      return { bg: 'bg-green-500', text: 'text-green-700', label: 'Very Strong' };
    default:
      return { bg: 'bg-gray-500', text: 'text-gray-700', label: 'Unknown' };
  }
};

/**
 * Check if password has been reused
 * Compares against password history
 */
export const checkPasswordReuse = async (
  userId: string,
  newPassword: string,
  passwordHistory: string[] = []
): Promise<boolean> => {
  // In production, hash the new password and compare with stored hashes
  // This is a simplified version
  
  const bcrypt = await import('bcryptjs');
  
  for (const hashedPassword of passwordHistory) {
    try {
      const matches = await bcrypt.compare(newPassword, hashedPassword);
      if (matches) {
        return true; // Password has been reused
      }
    } catch (error) {
      console.error('Error checking password reuse:', error);
    }
  }
  
  return false; // Password has not been reused
};

/**
 * Password policy requirements as readable text
 */
export const getPasswordRequirementsText = (
  policy: PasswordPolicyConfig = DEFAULT_PASSWORD_POLICY
): string[] => {
  const requirements: string[] = [];
  
  requirements.push(`At least ${policy.minLength} characters long`);
  
  if (policy.requireUppercase) {
    requirements.push('At least one uppercase letter (A-Z)');
  }
  
  if (policy.requireLowercase) {
    requirements.push('At least one lowercase letter (a-z)');
  }
  
  if (policy.requireNumber) {
    requirements.push('At least one number (0-9)');
  }
  
  if (policy.requireSpecialChar) {
    requirements.push('At least one special character (!@#$%^&*...)');
  }
  
  if (policy.preventCommon) {
    requirements.push('Not a common or previously breached password');
  }
  
  return requirements;
};

export default {
  validatePassword,
  generateStrongPassword,
  checkPasswordBreach,
  calculatePasswordEntropy,
  getPasswordStrengthColor,
  checkPasswordReuse,
  getPasswordRequirementsText,
  DEFAULT_PASSWORD_POLICY,
  RELAXED_PASSWORD_POLICY
};

