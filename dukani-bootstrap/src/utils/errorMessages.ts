/**
 * Improved Error Message System
 * Provides user-friendly, actionable error messages
 */

export type ErrorContext = {
  productName?: string;
  customerName?: string;
  action?: string;
  field?: string;
};

export const errorMessages = {
  // Product Errors
  PRODUCT_NO_PRICE: (context?: ErrorContext) => ({
    title: 'Product Price Missing',
    message: `${context?.productName || 'This product'} needs a price set.`,
    action: 'Go to Products → Edit → Set Price',
    actionUrl: context?.productName ? `/products/edit?name=${context.productName}` : '/products',
  }),

  PRODUCT_OUT_OF_STOCK: (context?: ErrorContext) => ({
    title: 'Out of Stock',
    message: `${context?.productName || 'This product'} is currently out of stock.`,
    action: 'Check inventory or select a different product',
    actionUrl: '/inventory',
  }),

  PRODUCT_NO_VARIANT: (context?: ErrorContext) => ({
    title: 'Product Configuration Issue',
    message: `${context?.productName || 'This product'} has no variants configured.`,
    action: 'Go to Products → Edit → Add Variants',
    actionUrl: context?.productName ? `/products/edit?name=${context.productName}` : '/products',
  }),

  PRODUCT_INVALID_PRICE: (context?: ErrorContext) => ({
    title: 'Invalid Price',
    message: `The price for ${context?.productName || 'this product'} is not valid.`,
    action: 'Please enter a valid price (greater than 0)',
    actionUrl: '/products',
  }),

  // Cart Errors
  CART_EMPTY: () => ({
    title: 'Cart is Empty',
    message: 'Please add at least one product to continue.',
    action: 'Browse products and add to cart',
    actionUrl: '/pos',
  }),

  CART_ADD_FAILED: (context?: ErrorContext) => ({
    title: 'Could Not Add to Cart',
    message: `Unable to add ${context?.productName || 'product'} to cart.`,
    action: 'Please try again or contact support if issue persists',
  }),

  // Customer Errors
  CUSTOMER_REQUIRED: () => ({
    title: 'Customer Required',
    message: 'Please select or add a customer to continue.',
    action: 'Click "Add Customer" or search for existing customer',
    actionUrl: '/customers',
  }),

  CUSTOMER_NOT_FOUND: (context?: ErrorContext) => ({
    title: 'Customer Not Found',
    message: `Could not find customer: ${context?.customerName || 'Unknown'}`,
    action: 'Try searching again or add new customer',
    actionUrl: '/customers/add',
  }),

  // Payment Errors
  PAYMENT_INVALID_AMOUNT: () => ({
    title: 'Invalid Payment Amount',
    message: 'The payment amount must be greater than 0.',
    action: 'Please check the cart total and try again',
  }),

  PAYMENT_INSUFFICIENT: (context?: ErrorContext) => ({
    title: 'Insufficient Payment',
    message: 'Payment amount is less than the total.',
    action: 'Please enter the full amount or adjust the cart',
  }),

  PAYMENT_FAILED: () => ({
    title: 'Payment Failed',
    message: 'Unable to process payment.',
    action: 'Please try again or use a different payment method',
  }),

  // Database Errors
  DATABASE_CONNECTION: () => ({
    title: 'Connection Issue',
    message: 'Unable to connect to the database.',
    action: 'Check your internet connection and try again',
  }),

  DATABASE_SAVE_FAILED: (context?: ErrorContext) => ({
    title: 'Save Failed',
    message: `Could not save ${context?.action || 'changes'}.`,
    action: 'Please try again or contact support',
  }),

  // Validation Errors
  VALIDATION_REQUIRED: (context?: ErrorContext) => ({
    title: 'Required Field',
    message: `${context?.field || 'This field'} is required.`,
    action: 'Please fill in the required information',
  }),

  VALIDATION_INVALID_FORMAT: (context?: ErrorContext) => ({
    title: 'Invalid Format',
    message: `${context?.field || 'This field'} has an invalid format.`,
    action: 'Please check the format and try again',
  }),

  // Permission Errors
  PERMISSION_DENIED: (context?: ErrorContext) => ({
    title: 'Permission Denied',
    message: `You don't have permission to ${context?.action || 'perform this action'}.`,
    action: 'Contact your manager for access',
  }),

  // Generic
  GENERIC_ERROR: (context?: ErrorContext) => ({
    title: 'Something Went Wrong',
    message: context?.action || 'An unexpected error occurred.',
    action: 'Please try again or contact support if the issue continues',
  }),
};

/**
 * Format error for toast display
 */
export const formatErrorForToast = (
  errorKey: keyof typeof errorMessages,
  context?: ErrorContext
) => {
  const error = errorMessages[errorKey](context as any);
  return {
    title: error.title,
    message: `${error.message}\n\n💡 ${error.action}`,
    action: error.actionUrl,
  };
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyError = (
  error: Error | string,
  context?: ErrorContext
): string => {
  const errorText = typeof error === 'string' ? error : error.message;

  // Map technical errors to user-friendly messages
  if (errorText.includes('price') && errorText.includes('invalid')) {
    return errorMessages.PRODUCT_INVALID_PRICE(context).message;
  }
  
  if (errorText.includes('out of stock') || errorText.includes('quantity')) {
    return errorMessages.PRODUCT_OUT_OF_STOCK(context).message;
  }
  
  if (errorText.includes('database') || errorText.includes('fetch')) {
    return errorMessages.DATABASE_CONNECTION().message;
  }
  
  if (errorText.includes('permission') || errorText.includes('unauthorized')) {
    return errorMessages.PERMISSION_DENIED(context).message;
  }

  return errorMessages.GENERIC_ERROR({ action: errorText }).message;
};

