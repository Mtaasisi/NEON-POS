# 🚨 Automatic Error Export System

## Overview

The NEON POS system now includes a comprehensive **Automatic Error Export System** that automatically downloads errors as JSON files to help you debug and track issues more effectively.

## Features

✅ **Auto-Download Critical Errors** - High and critical severity errors are automatically downloaded as JSON files  
✅ **Manual Export** - Download individual errors or all saved errors  
✅ **Error Management Page** - View, search, filter, and manage all saved errors  
✅ **Rich Error Context** - Includes stack traces, system info, and custom context  
✅ **LocalStorage Backup** - Errors are also saved to localStorage as backup  
✅ **Browser Console Access** - Access error exporter via `window.errorExporter`

---

## How It Works

### 1. **Automatic Error Detection**

The system captures errors from multiple sources:

- **Unhandled Promise Rejections** - Catches async errors
- **Window Errors** - Catches runtime errors  
- **Console Errors** - Intercepts console.error calls
- **React Error Boundaries** - Catches component rendering errors
- **Manual Logging** - Explicitly log errors from anywhere in your code

### 2. **Automatic File Download**

When a **high** or **critical** severity error occurs:

1. Error is captured with full context
2. JSON file is automatically created
3. File is downloaded to your browser's Downloads folder
4. File is also saved to localStorage as backup

**Filename Format:**
```
error-YYYYMMDD-HHMMSS-ErrorType-severity.json
```

**Example:**
```
error-20251204-143022-TypeError-critical.json
```

### 3. **Error Data Structure**

Each exported error contains:

```json
{
  "timestamp": "2025-12-04T14:30:22.123Z",
  "errorType": "TypeError",
  "severity": "critical",
  "message": "Cannot read property 'x' of undefined",
  "stack": "Error stack trace...",
  "module": "WhatsAppInboxPage",
  "function": "initialization",
  "operation": "page_load",
  "context": {
    "filter": "all",
    "currentUser": "user123"
  },
  "userAgent": "Mozilla/5.0...",
  "url": "http://localhost:5173/whatsapp-inbox",
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "online": true,
  "localStorage": {
    "available": true,
    "quotaExceeded": false
  },
  "memoryInfo": {
    "usedJSHeapSize": 45678912,
    "totalJSHeapSize": 67108864,
    "jsHeapSizeLimit": 2172649472
  }
}
```

---

## Usage

### **1. Automatic Export (Already Enabled)**

Errors are automatically exported when they occur. No action needed!

### **2. Manual Export from Code**

```typescript
import { errorExporter } from '../utils/errorExporter';

try {
  // Your code
} catch (error) {
  await errorExporter.exportError(error, {
    severity: 'high',
    module: 'MyComponent',
    function: 'myFunction',
    operation: 'data_load',
    context: {
      customData: 'additional info'
    },
    autoDownload: true
  });
}
```

### **3. View Error Management Page**

Access the Error Management page to:
- View all saved errors
- Filter by severity, date, module
- Search error messages
- Download individual or all errors
- Clear old errors

**Location:** Create a route to `/error-management` → `ErrorManagement` component

### **4. Browser Console Access**

```javascript
// Get error count
window.errorExporter.getSavedErrorCount()

// Export all saved errors
window.errorExporter.exportAllSavedErrors()

// Clear all saved errors
window.errorExporter.clearSavedErrors()

// Configure auto-download
window.errorExporter.configure({
  autoDownload: true,
  minSeverity: 'high' // 'medium', 'high', or 'critical'
})
```

---

## Error Severity Levels

| Severity | Auto-Download | Description | Examples |
|----------|---------------|-------------|----------|
| **Critical** | ✅ Yes | App-breaking errors | React component crashes, unhandled rejections |
| **High** | ✅ Yes | Major functionality broken | Database errors, API failures |
| **Medium** | ❌ No | Minor issues, degraded UX | Cache errors, storage quota |
| **Low** | ❌ No | Warnings, non-critical issues | Deprecation warnings |

*You can change auto-download settings using `errorExporter.configure()`*

---

## File Locations

### **Downloaded Files**

Error JSON files are downloaded to your browser's **Downloads folder**:

```
~/Downloads/
  ├── error-20251204-143022-TypeError-critical.json
  ├── error-20251204-143045-NetworkError-high.json
  └── all-errors-2025-12-04.json (bulk export)
```

### **LocalStorage Backup**

Errors are also saved to localStorage with keys:

```
error_log_2025-12-04T14:30:22.123Z
error_log_2025-12-04T14:30:45.678Z
```

*Note: Only the last 10 errors are kept to avoid quota issues*

---

## Integration Points

The error export system is integrated into:

1. **Global Error Handler** (`src/services/globalErrorHandler.ts`)
   - Auto-exports unhandled promise rejections
   - Auto-exports window errors
   - Auto-exports console errors

2. **React Error Boundaries** (`src/components/GlobalErrorBoundary.tsx`)
   - Auto-exports component errors
   - Provides manual download button

3. **WhatsApp Inbox Page** (`src/features/whatsapp/pages/WhatsAppInboxPage.tsx`)
   - Error state includes download button
   - Initialization errors are captured

4. **Error Management Page** (`src/pages/ErrorManagement.tsx`)
   - View and manage all saved errors
   - Bulk export functionality

---

## Configuration

### **Change Auto-Download Settings**

```typescript
import { errorExporter } from '../utils/errorExporter';

// Only download critical errors
errorExporter.configure({
  autoDownload: true,
  minSeverity: 'critical'
});

// Disable auto-download completely
errorExporter.configure({
  autoDownload: false
});
```

### **Customize Error Context**

```typescript
await errorExporter.exportError(error, {
  severity: 'high',
  module: 'PaymentProcessor',
  function: 'processPayment',
  operation: 'payment_processing',
  context: {
    paymentId: payment.id,
    amount: payment.amount,
    method: payment.method,
    // Add any custom data
  }
});
```

---

## Troubleshooting

### **Errors Not Downloading**

1. Check browser download settings
2. Verify auto-download is enabled:
   ```javascript
   window.errorExporter.configure({ autoDownload: true })
   ```
3. Check severity level:
   ```javascript
   window.errorExporter.configure({ minSeverity: 'medium' })
   ```

### **Too Many Downloads**

If you're getting too many error downloads:

```javascript
// Only download critical errors
window.errorExporter.configure({
  autoDownload: true,
  minSeverity: 'critical'
});
```

### **LocalStorage Full**

Old errors are automatically cleaned up (keeps last 10). To manually clear:

```javascript
window.errorExporter.clearSavedErrors()
```

---

## Best Practices

1. **Review Downloaded Errors** - Periodically check your Downloads folder for error files

2. **Share Error Files** - When reporting bugs, attach the error JSON file for faster debugging

3. **Monitor Error Patterns** - Use the Error Management page to identify recurring issues

4. **Set Appropriate Severity** - Use correct severity levels when manually logging errors

5. **Include Context** - Always provide relevant context when exporting errors manually

6. **Don't Disable Auto-Download** - Keep it enabled at least for critical/high severity errors

---

## API Reference

### `errorExporter.exportError(error, options)`

Export an error to JSON file.

**Parameters:**
- `error` - Error object or any value
- `options` - Export options:
  - `severity`: 'low' | 'medium' | 'high' | 'critical'
  - `module`: Module name
  - `function`: Function name
  - `operation`: Operation being performed
  - `context`: Additional context data
  - `autoDownload`: Override auto-download setting

**Returns:** Promise<void>

### `errorExporter.configure(options)`

Configure error export behavior.

**Parameters:**
- `autoDownload`: Enable/disable auto-download
- `minSeverity`: Minimum severity for auto-download

### `errorExporter.exportAllSavedErrors()`

Export all saved errors from localStorage as single JSON file.

### `errorExporter.clearSavedErrors()`

Clear all saved errors from localStorage.

### `errorExporter.getSavedErrorCount()`

Get count of saved errors in localStorage.

**Returns:** number

---

## Examples

### Example 1: Database Error

```typescript
try {
  await supabase.from('customers').select('*');
} catch (error) {
  await errorExporter.exportError(error, {
    severity: 'high',
    module: 'CustomerService',
    function: 'loadCustomers',
    operation: 'database_query',
    context: {
      table: 'customers',
      query: 'select *'
    }
  });
}
```

### Example 2: API Error

```typescript
try {
  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
} catch (error) {
  await errorExporter.exportError(error, {
    severity: 'high',
    module: 'APIService',
    function: 'fetchData',
    operation: 'api_call',
    context: {
      endpoint: '/api/data',
      method: 'GET'
    }
  });
}
```

### Example 3: Validation Error

```typescript
if (!isValidEmail(email)) {
  const error = new Error('Invalid email format');
  await errorExporter.exportError(error, {
    severity: 'low',
    module: 'ValidationService',
    function: 'validateEmail',
    operation: 'input_validation',
    context: {
      email: email.substring(0, 3) + '***' // Partial for privacy
    }
  });
}
```

---

## Support

For questions or issues with the error export system:

1. Check browser console for error export logs
2. Review `src/utils/errorExporter.ts` for implementation details
3. Use `window.errorExporter` for debugging
4. Check Downloads folder for exported files

---

## Version History

**v1.0.0** (Dec 4, 2025)
- Initial release
- Auto-download for high/critical errors
- Error Management page
- LocalStorage backup
- Browser console access
- React error boundary integration


