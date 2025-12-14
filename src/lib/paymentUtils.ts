/**
 * Payment Utility Functions
 * Provides safe number handling and formatting for payment operations
 */

/**
 * Safely converts a value to a number with NaN protection
 * @param value - The value to convert to number
 * @param defaultValue - Default value if conversion fails (default: 0)
 * @returns A safe number value
 */
export function safeNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value);
  if (!isFinite(num) || isNaN(num)) {
    return defaultValue;
  }
  return num;
}

/**
 * Safely parses a float with NaN protection
 * @param value - The value to parse
 * @param defaultValue - Default value if parsing fails (default: 0)
 * @returns A safe float value
 */
export function safeParseFloat(value: any, defaultValue: number = 0): number {
  const num = parseFloat(value);
  if (!isFinite(num) || isNaN(num)) {
    return defaultValue;
  }
  return num;
}

/**
 * Safely parses an integer with NaN protection
 * @param value - The value to parse
 * @param defaultValue - Default value if parsing fails (default: 0)
 * @returns A safe integer value
 */
export function safeParseInt(value: any, defaultValue: number = 0): number {
  const num = parseInt(value, 10);
  if (!isFinite(num) || isNaN(num)) {
    return defaultValue;
  }
  return num;
}

/**
 * Formats a number as currency with NaN protection
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'TZS')
 * @param locale - The locale for formatting (default: 'en-TZ')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | undefined | null,
  currency: string = 'TZS',
  locale: string = 'en-TZ'
): string {
  const safeAmount = safeNumber(amount, 0);
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(safeAmount);
}

/**
 * Formats a number with thousand separators
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(
  amount: number | undefined | null,
  decimals: number = 0
): string {
  const safeAmount = safeNumber(amount, 0);
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(safeAmount);
}

/**
 * Calculates the sum of amounts in an array with NaN protection
 * @param items - Array of items with amount property
 * @param amountKey - The key to access the amount (default: 'amount')
 * @returns The safe sum
 */
export function safeSum<T extends Record<string, any>>(
  items: T[],
  amountKey: keyof T = 'amount' as keyof T
): number {
  if (!Array.isArray(items)) {
    return 0;
  }
  
  return items.reduce((sum, item) => {
    const amount = safeNumber(item[amountKey], 0);
    return sum + amount;
  }, 0);
}

/**
 * Calculates percentage with division by zero protection
 * @param value - The numerator value
 * @param total - The denominator value
 * @param decimals - Number of decimal places (default: 2)
 * @returns The percentage value
 */
export function safePercentage(
  value: number | undefined | null,
  total: number | undefined | null,
  decimals: number = 2
): number {
  const safeValue = safeNumber(value, 0);
  const safeTotal = safeNumber(total, 0);
  
  if (safeTotal === 0) {
    return 0;
  }
  
  const percentage = (safeValue / safeTotal) * 100;
  return Number(percentage.toFixed(decimals));
}

/**
 * Validates if a value is a valid positive amount
 * @param amount - The amount to validate
 * @returns True if valid, false otherwise
 */
export function isValidAmount(amount: any): boolean {
  const num = safeNumber(amount, -1);
  return num >= 0;
}

/**
 * Rounds a number to specified decimal places with NaN protection
 * @param value - The value to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded value
 */
export function safeRound(
  value: number | undefined | null,
  decimals: number = 2
): number {
  const safeValue = safeNumber(value, 0);
  const multiplier = Math.pow(10, decimals);
  return Math.round(safeValue * multiplier) / multiplier;
}

/**
 * Calculates the average of amounts in an array with NaN protection
 * @param items - Array of items with amount property
 * @param amountKey - The key to access the amount (default: 'amount')
 * @returns The safe average
 */
export function safeAverage<T extends Record<string, any>>(
  items: T[],
  amountKey: keyof T = 'amount' as keyof T
): number {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }
  
  const sum = safeSum(items, amountKey);
  return sum / items.length;
}

/**
 * Formats a payment status with proper capitalization
 * @param status - The status string
 * @returns Formatted status
 */
export function formatPaymentStatus(status: string): string {
  if (!status) return 'Unknown';
  
  const normalized = status.toLowerCase();
  
  // Map common status values
  const statusMap: Record<string, string> = {
    'success': 'Completed',
    'completed': 'Completed',
    'pending': 'Pending',
    'failed': 'Failed',
    'cancelled': 'Cancelled',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'refunded': 'Refunded'
  };
  
  return statusMap[normalized] || status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

/**
 * Gets the appropriate badge variant for a payment status
 * @param status - The payment status
 * @returns Badge variant ('success', 'warning', 'error', 'secondary')
 */
export function getPaymentStatusVariant(
  status: string
): 'success' | 'warning' | 'error' | 'secondary' {
  const normalized = status.toLowerCase();
  
  switch (normalized) {
    case 'completed':
    case 'success':
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
    case 'cancelled':
    case 'rejected':
      return 'error';
    default:
      return 'secondary';
  }
}

/**
 * Calculates transaction fees with NaN protection
 * @param amount - The transaction amount
 * @param feePercentage - The fee percentage (e.g., 2.5 for 2.5%)
 * @param minimumFee - Minimum fee amount (optional)
 * @param maximumFee - Maximum fee amount (optional)
 * @returns The calculated fee
 */
export function calculateTransactionFee(
  amount: number | undefined | null,
  feePercentage: number,
  minimumFee?: number,
  maximumFee?: number
): number {
  const safeAmount = safeNumber(amount, 0);
  const safeFeePercentage = safeNumber(feePercentage, 0);
  
  let fee = (safeAmount * safeFeePercentage) / 100;
  
  if (minimumFee !== undefined && fee < minimumFee) {
    fee = minimumFee;
  }
  
  if (maximumFee !== undefined && fee > maximumFee) {
    fee = maximumFee;
  }
  
  return safeRound(fee, 2);
}

/**
 * Calculates net amount after fees
 * @param grossAmount - The gross amount
 * @param fees - The fees to deduct
 * @returns Net amount
 */
export function calculateNetAmount(
  grossAmount: number | undefined | null,
  fees: number | undefined | null
): number {
  const safeGross = safeNumber(grossAmount, 0);
  const safeFees = safeNumber(fees, 0);
  
  return Math.max(0, safeGross - safeFees);
}

/**
 * Groups payment transactions by a specific key
 * @param transactions - Array of payment transactions
 * @param groupKey - The key to group by
 * @returns Object with grouped transactions
 */
export function groupPaymentsByKey<T extends Record<string, any>>(
  transactions: T[],
  groupKey: keyof T
): Record<string, T[]> {
  if (!Array.isArray(transactions)) {
    return {};
  }
  
  return transactions.reduce((groups, transaction) => {
    const key = String(transaction[groupKey] || 'Unknown');
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(transaction);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Validates payment method reference
 * @param method - The payment method
 * @param reference - The reference number
 * @returns Validation result
 */
export function validatePaymentReference(
  method: string,
  reference?: string
): { isValid: boolean; message?: string } {
  const normalizedMethod = method.toLowerCase();
  
  // Methods that require references
  const requiresReference = ['bank', 'mpesa', 'm-pesa', 'mobile_money', 'mobile money', 'check', 'cheque'];
  
  if (requiresReference.some(m => normalizedMethod.includes(m))) {
    if (!reference || reference.trim().length === 0) {
      return {
        isValid: false,
        message: `${method} payment requires a reference number`
      };
    }
  }
  
  return { isValid: true };
}

