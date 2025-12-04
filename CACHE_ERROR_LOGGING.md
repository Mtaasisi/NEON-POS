# Cache Error Logging System

## Overview

This system captures and logs logical errors during cache management in offline operations. It provides comprehensive error tracking with detailed context to help diagnose and resolve issues in offline-first scenarios.

## Features

- **Automatic Error Capture**: Errors are automatically logged with detailed context
- **User & Location Tracking**: Logs include user information and branch details
- **Operation Context**: Stores the operation type and relevant context data
- **Error Classification**: Categorizes errors by type (logical, network, storage, sync, validation)
- **Severity Levels**: Assigns severity (low, medium, high, critical) for prioritization
- **Persistent Storage**: Uses IndexedDB for reliable, persistent error logging
- **Advanced Filtering**: Filter logs by module, error type, severity, date range, and more
- **Export Capabilities**: Export logs as JSON or CSV for external analysis
- **Resolution Tracking**: Mark errors as resolved with notes
- **Statistics Dashboard**: View error statistics and trends

## Architecture

### Core Components

#### 1. Error Logger Service (`src/services/cacheErrorLogger.ts`)
The main service that handles all error logging operations:

```typescript
import { cacheErrorLogger } from '../services/cacheErrorLogger';

// Log an error
await cacheErrorLogger.logCacheError(
  'moduleName',
  'functionName',
  error,
  'operation', // fetch, save, sync, delete, etc.
  {
    // Additional context
    storeName: 'products',
    itemCount: 100,
  }
);
```

#### 2. Log Viewer Component (`src/components/CacheErrorLogViewer.tsx`)
React component for viewing and managing error logs:
- Displays error logs in a sortable, filterable table
- Provides detailed error information in a modal
- Supports marking errors as resolved
- Export functionality for JSON and CSV

#### 3. Admin Page (`src/features/admin/pages/ErrorLogsPage.tsx`)
Admin dashboard page that integrates the log viewer

## Integration Points

The error logger is integrated into the following modules:

### Enhanced Cache Manager (`src/lib/enhancedCacheManager.ts`)
Logs errors from:
- `smartFetch`: Cache fetch operations
- `refreshInBackground`: Background refresh operations
- `getCacheStatus`: Cache status checks
- `getFromCache`: Cache read operations
- `saveToCache`: Cache write operations
- `queueForSync`: Sync queue operations
- `syncPendingOperations`: Sync operations

### Offline Sale Sync Service (`src/services/offlineSaleSyncService.ts`)
Logs errors from:
- `saveSaleLocally`: Local sale storage
- `syncSale`: Sale synchronization
- `cleanupOldSyncedSales`: Cleanup operations
- `saveOfflineSales`: Sale data persistence

## Error Log Structure

Each error log contains:

```typescript
interface CacheErrorLog {
  id?: number;
  timestamp: string;
  module: string; // e.g., 'enhancedCacheManager'
  function: string; // e.g., 'smartFetch'
  errorType: 'logical' | 'network' | 'storage' | 'sync' | 'validation' | 'unknown';
  errorMessage: string;
  errorStack?: string;
  operation: string; // e.g., 'fetch', 'save', 'sync'
  operationContext?: Record<string, any>;
  userId?: string;
  userName?: string;
  userRole?: string;
  branchId?: string;
  branchName?: string;
  isOnline: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}
```

## Usage Guide

### Accessing Error Logs

1. **Admin Dashboard**: Navigate to Admin > Cache Error Logs
2. **Direct URL**: `/admin/error-logs` (admin role required)

### Viewing Logs

The log viewer displays:
- **Statistics**: Total errors, unresolved count, recent errors
- **Error List**: Sortable table with all error details
- **Filters**: Module, error type, severity, status, date range
- **Search**: Full-text search across error messages and modules

### Filtering Logs

Use the filters panel to narrow down logs:
1. Click "Filters" button to show filter options
2. Select module, error type, severity, or status
3. Use date range filters for time-based analysis
4. Use search box for text-based filtering

### Exporting Logs

1. Apply desired filters
2. Click "Export JSON" or "Export CSV"
3. File will be downloaded with filtered logs

Export formats:
- **JSON**: Complete log data with all fields
- **CSV**: Tabular format for Excel/spreadsheet analysis

### Resolving Errors

1. Click on an error row to view details
2. Review the error information, context, and stack trace
3. Click "Mark as Resolved" button
4. Resolution is tracked with timestamp and user

### Managing Logs

- **Delete Individual Log**: Click trash icon on any log entry
- **Clear All Logs**: Use "Clear All" button (requires confirmation)
- **Auto-Cleanup**: System automatically removes logs older than 90 days

## Error Types

### Logical Errors
General programming logic errors in cache operations

### Network Errors
Errors related to network connectivity and API calls

### Storage Errors
IndexedDB quota exceeded or storage access errors

### Sync Errors
Failures in synchronizing offline data with server

### Validation Errors
Data validation failures during cache operations

## Severity Levels

### Critical 🔴
System-breaking errors requiring immediate attention

### High 🟠
Serious errors that may impact functionality

### Medium 🟡
Moderate errors that should be addressed

### Low 🔵
Minor errors or warnings

## Best Practices

### For Developers

1. **Always log errors in cache operations**:
```typescript
try {
  // Cache operation
} catch (error) {
  await cacheErrorLogger.logCacheError(
    'moduleName',
    'functionName',
    error,
    'operation',
    { /* context */ }
  );
  // Handle error appropriately
}
```

2. **Provide meaningful context**:
```typescript
await cacheErrorLogger.logCacheError(
  'enhancedCacheManager',
  'saveToCache',
  error,
  'save',
  {
    storeName: 'products',
    itemCount: data.length,
    branchId: currentBranch,
  }
);
```

3. **Don't block on logging**:
```typescript
// Good - doesn't block execution
cacheErrorLogger.logCacheError(...).catch(err => 
  console.error('Failed to log error:', err)
);
```

### For Administrators

1. **Regular Monitoring**: Check logs daily for critical/high severity errors
2. **Pattern Analysis**: Look for repeated errors from same module/function
3. **Resolution Tracking**: Mark errors as resolved once fixed
4. **Export for Analysis**: Use exports for long-term trend analysis
5. **Storage Management**: Clear old resolved logs periodically

## Configuration

### Storage Limits

- **Max Logs**: 10,000 entries
- **Retention Period**: 90 days
- **Auto-Cleanup**: Runs on log read/write operations

### Customization

Edit `src/services/cacheErrorLogger.ts` to modify:

```typescript
const DB_NAME = 'pos-error-logs';
const DB_VERSION = 1;
const MAX_LOGS = 10000; // Maximum logs to store
const LOG_RETENTION_DAYS = 90; // Days to keep logs
```

## Troubleshooting

### Logs not appearing

1. Check browser console for errors
2. Verify IndexedDB is enabled in browser
3. Check browser storage quota
4. Verify logger is initialized: `await cacheErrorLogger.init()`

### Storage quota exceeded

1. Use "Clear All" to remove old logs
2. Reduce `MAX_LOGS` in configuration
3. Reduce `LOG_RETENTION_DAYS` for faster cleanup

### Export not working

1. Check browser popup blocker settings
2. Verify sufficient disk space
3. Try smaller date range for large exports

## API Reference

### Core Methods

#### `logCacheError()`
```typescript
await cacheErrorLogger.logCacheError(
  module: string,
  functionName: string,
  error: Error | unknown,
  operation: string,
  context?: Record<string, any>
): Promise<number | undefined>
```

#### `getLogs()`
```typescript
await cacheErrorLogger.getLogs(filters?: {
  module?: string;
  errorType?: string;
  severity?: string;
  resolved?: boolean;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<CacheErrorLog[]>
```

#### `markResolved()`
```typescript
await cacheErrorLogger.markResolved(
  id: number,
  resolvedBy: string,
  notes?: string
): Promise<boolean>
```

#### `exportLogs()`
```typescript
await cacheErrorLogger.exportLogs(filters?): Promise<string>
```

#### `exportLogsCSV()`
```typescript
await cacheErrorLogger.exportLogsCSV(filters?): Promise<string>
```

#### `getStats()`
```typescript
await cacheErrorLogger.getStats(): Promise<{
  total: number;
  unresolved: number;
  resolved: number;
  byModule: Record<string, number>;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  last24Hours: number;
  last7Days: number;
}>
```

## Performance Considerations

- **Async Operations**: All logging is asynchronous and non-blocking
- **Auto-Cleanup**: Cleanup runs periodically, not on every operation
- **Indexed Queries**: Database uses indexes for fast filtering
- **Batch Operations**: Use bulk operations when possible

## Security

- **Admin Only**: Error logs page is restricted to admin users
- **User Context**: Logs automatically capture user information
- **No Sensitive Data**: Avoid logging passwords or sensitive information
- **Local Storage**: Logs are stored locally in browser (IndexedDB)

## Future Enhancements

- Real-time error notifications
- Integration with external logging services
- Advanced analytics and visualization
- Automated error pattern detection
- Email alerts for critical errors

## Support

For issues or questions:
1. Check browser console for detailed errors
2. Review this documentation
3. Check integration points in source files
4. Contact development team

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Author**: Development Team

