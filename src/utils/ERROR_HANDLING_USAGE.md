# Enhanced Error Handling System - Usage Guide

This guide shows you how to use the new enhanced error handling system that provides clear, actionable error messages with fix suggestions.

## Quick Start

### 1. Import the hook

```typescript
import { useEnhancedError } from '../hooks/useEnhancedError';
```

### 2. Use in your component

```typescript
function MyComponent() {
  const { handleError, handleDatabaseError, handleNetworkError } = useEnhancedError();

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      
      if (error) {
        // Automatically shows error panel with fix suggestions!
        handleDatabaseError(error, 'Fetching products', 'products');
        return;
      }
      
      // Use data...
    } catch (error) {
      handleError(error, 'Product fetch operation');
    }
  };

  return <div>...</div>;
}
```

## Usage Examples

### Example 1: Database Errors

```typescript
const { handleDatabaseError } = useEnhancedError();

// When querying database
try {
  const { data, error } = await supabase
    .from('lats_inventory')
    .insert({ name: 'Product' });
  
  if (error) {
    // Shows detailed error with SQL fixes!
    handleDatabaseError(error, 'Creating product', 'lats_inventory');
  }
} catch (error) {
  handleDatabaseError(error, 'Product creation');
}
```

### Example 2: Network Errors

```typescript
const { handleNetworkError } = useEnhancedError();

try {
  const response = await fetch('/api/endpoint');
  if (!response.ok) {
    throw new Error('API request failed');
  }
} catch (error) {
  handleNetworkError(error, '/api/endpoint');
}
```

### Example 3: Authentication Errors

```typescript
const { handleAuthError } = useEnhancedError();

try {
  const { error } = await supabase.auth.signIn({ email, password });
  if (error) {
    handleAuthError(error, 'Login');
  }
} catch (error) {
  handleAuthError(error);
}
```

### Example 4: Validation Errors

```typescript
const { handleValidationError } = useEnhancedError();

if (!email) {
  handleValidationError('Email is required', 'email');
}

if (!isValidEmail(email)) {
  handleValidationError('Please enter a valid email address', 'email');
}
```

### Example 5: Wrap Async Functions (Advanced)

```typescript
const { withErrorHandling, withSafeErrorHandling } = useEnhancedError();

// Wraps function and shows errors automatically
const fetchProducts = withErrorHandling(
  async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    return data;
  },
  'Fetching products'
);

// Use it
const products = await fetchProducts();

// Or use safe version that doesn't re-throw
const fetchProductsSafe = withSafeErrorHandling(
  async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    return data;
  },
  'Fetching products',
  [] // default value on error
);

// Returns empty array on error instead of throwing
const products = await fetchProductsSafe();
```

### Example 6: Custom Errors with Fix Suggestions

```typescript
const { createCustomError } = useEnhancedError();

// Create a custom error with specific fix suggestions
createCustomError({
  title: 'Payment Processing Failed',
  message: 'Unable to process your payment. Please try again.',
  type: 'api',
  severity: 'high',
  context: 'Checkout process',
  fixSuggestions: [
    {
      title: 'Check payment details',
      description: 'Verify your payment information is correct',
      steps: [
        'Confirm your card number is entered correctly',
        'Check the expiration date',
        'Verify the CVV code',
        'Ensure billing address matches'
      ]
    },
    {
      title: 'Try a different payment method',
      description: 'Use an alternative payment option',
      steps: [
        'Select a different card',
        'Try PayPal or other payment methods',
        'Contact your bank if the issue persists'
      ]
    },
    {
      title: 'Contact support',
      description: 'Get help from our support team',
      steps: [
        'Click the support button',
        'Provide your order ID',
        'Describe the issue you\'re experiencing'
      ]
    }
  ]
});
```

## Features

### Automatic Error Detection

The system automatically detects and categorizes:

- **Database Errors**: PostgreSQL error codes (23505, 42P01, etc.)
- **Network Errors**: Connection issues, timeouts, fetch failures
- **Auth Errors**: JWT, session, permission issues
- **Validation Errors**: Form validation, data validation

### Fix Suggestions

Each error type includes:
- **Clear explanation** of what went wrong
- **Step-by-step fixes** to resolve the issue
- **SQL snippets** for database issues (with copy button!)
- **Auto-fix buttons** (where applicable)

### Error Diagnostics

Access the error diagnostics panel:
- Click the floating red button (bottom-right) when errors occur
- View all error history
- Filter by type, severity, or search
- Export error logs for debugging
- Clear error history

### Error Severity Levels

- **Critical**: System-breaking errors (database connection, auth failure)
- **High**: Major functionality broken (table missing, permission denied)
- **Medium**: Feature not working (validation error, data not found)
- **Low**: Minor issues (no results, optional feature unavailable)

## Common Error Codes & Solutions

### Database Errors

| Code | Name | What it means | Quick fix |
|------|------|---------------|-----------|
| 23505 | Unique Violation | Record already exists | Use UPDATE instead of INSERT |
| 23503 | Foreign Key Violation | Referenced record missing | Create parent record first |
| 42P01 | Undefined Table | Table doesn't exist | Run database migrations |
| 42703 | Undefined Column | Column missing | Update table schema |
| 42501 | Insufficient Privilege | Permission denied | Check RLS policies |

### Network Errors

| Error | What it means | Quick fix |
|-------|---------------|-----------|
| ERR_CONNECTION_CLOSED | Connection lost | Check internet, retry |
| TIMEOUT | Request too slow | Reduce data size, retry |
| Failed to fetch | Network unavailable | Check connection |

## Pro Tips

### 1. Always handle database errors specifically

```typescript
// ❌ Don't do this
try {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
} catch (error) {
  console.error(error); // Users see nothing!
}

// ✅ Do this
try {
  const { data, error } = await supabase.from('table').select('*');
  if (error) {
    handleDatabaseError(error, 'Fetching data', 'table');
    return;
  }
} catch (error) {
  handleDatabaseError(error, 'Data fetch');
}
```

### 2. Provide context

```typescript
// ❌ Vague
handleError(error);

// ✅ Clear
handleDatabaseError(error, 'Creating customer order', 'orders');
```

### 3. Use the right handler

```typescript
// Database operations
handleDatabaseError(error, operation, tableName);

// API calls
handleNetworkError(error, endpoint);

// Authentication
handleAuthError(error, action);

// Form validation
handleValidationError(message, fieldName);

// Everything else
handleError(error, context);
```

### 4. Check error diagnostics

Press the red button in the bottom-right corner to:
- View all errors that occurred
- See patterns (same error happening repeatedly?)
- Export logs for debugging
- Share with support

## Integration with Existing Code

The enhanced error handler works seamlessly with your existing code:

```typescript
// Old code still works
import { handleSupabaseError } from '../utils/supabaseErrorHandler';

// But now you can upgrade to enhanced handling
import { useEnhancedError } from '../hooks/useEnhancedError';

function MyComponent() {
  const { handleDatabaseError } = useEnhancedError();
  
  // Old way (still works)
  const oldWay = () => {
    const { data, error } = await supabase.from('table').select('*');
    if (error) {
      const dbError = handleSupabaseError(error);
      toast.error(dbError.message); // Just a toast, no fix suggestions
    }
  };
  
  // New way (better!)
  const newWay = () => {
    const { data, error } = await supabase.from('table').select('*');
    if (error) {
      // Shows beautiful error panel with fix suggestions!
      handleDatabaseError(error, 'Fetching data', 'table');
    }
  };
}
```

## Troubleshooting

### Error panel not showing?

1. Check that `ErrorProvider` is wrapping your app (already done in App.tsx)
2. Check that `ErrorManager` component is rendered (already added)
3. Make sure you're using the hook: `useEnhancedError()`

### Want to customize errors?

Use `createCustomError()` to create errors with custom messages and fix suggestions.

### Need to disable error panels temporarily?

```typescript
const { setShowErrorPanel } = useEnhancedError();
setShowErrorPanel(false); // Hide error panel
```

## Support

If you encounter issues with the error handling system itself:
1. Check the browser console for additional details
2. View error diagnostics (red button)
3. Export error logs and share with the team

---

**Remember**: Good error handling = Happy developers = Faster debugging! 🚀

