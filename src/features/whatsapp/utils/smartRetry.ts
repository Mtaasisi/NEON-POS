/**
 * Smart Retry System
 * Automatically retries failed messages with exponential backoff
 */

export interface RetryableError {
  phone: string;
  name: string;
  error: string;
  errorType: 'temporary' | 'permanent' | 'rate_limit';
  retryCount: number;
  lastRetryTime: number;
  timestamp: string;
}

const MAX_RETRIES = 3;
const BASE_DELAY = 5000; // 5 seconds
const MAX_DELAY = 300000; // 5 minutes

/**
 * Categorize error type
 */
export function categorizeError(error: string): 'temporary' | 'permanent' | 'rate_limit' {
  const errorLower = error.toLowerCase();
  
  // Rate limit errors
  if (errorLower.includes('rate limit') || 
      errorLower.includes('too many requests') ||
      errorLower.includes('429')) {
    return 'rate_limit';
  }
  
  // Permanent errors (don't retry)
  if (errorLower.includes('not on whatsapp') ||
      errorLower.includes('invalid number') ||
      errorLower.includes('number not found') ||
      errorLower.includes('blocked') ||
      errorLower.includes('banned')) {
    return 'permanent';
  }
  
  // Temporary errors (retry these)
  return 'temporary';
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(retryCount: number, errorType: string): number {
  if (errorType === 'rate_limit') {
    // Longer delay for rate limits
    return Math.min(BASE_DELAY * Math.pow(3, retryCount), MAX_DELAY * 2);
  }
  
  // Exponential backoff: 5s, 10s, 20s, 40s...
  return Math.min(BASE_DELAY * Math.pow(2, retryCount), MAX_DELAY);
}

/**
 * Check if error should be retried
 */
export function shouldRetry(error: RetryableError): boolean {
  // Don't retry permanent errors
  if (error.errorType === 'permanent') {
    return false;
  }
  
  // Don't retry if max retries reached
  if (error.retryCount >= MAX_RETRIES) {
    return false;
  }
  
  // Check if enough time has passed since last retry
  const delay = calculateRetryDelay(error.retryCount, error.errorType);
  const timeSinceLastRetry = Date.now() - error.lastRetryTime;
  
  return timeSinceLastRetry >= delay;
}

/**
 * Create retryable error from failed message
 */
export function createRetryableError(
  phone: string,
  name: string,
  error: string,
  timestamp: string
): RetryableError {
  return {
    phone,
    name,
    error,
    errorType: categorizeError(error),
    retryCount: 0,
    lastRetryTime: Date.now(),
    timestamp
  };
}

/**
 * Increment retry count
 */
export function incrementRetry(error: RetryableError): RetryableError {
  return {
    ...error,
    retryCount: error.retryCount + 1,
    lastRetryTime: Date.now()
  };
}

/**
 * Get retry queue (errors that should be retried now)
 */
export function getRetryQueue(errors: RetryableError[]): RetryableError[] {
  return errors.filter(shouldRetry);
}

/**
 * Filter out permanent errors
 */
export function filterPermanentErrors(errors: RetryableError[]): RetryableError[] {
  return errors.filter(e => e.errorType !== 'permanent');
}
