# Cache Error Logging System - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NEON POS APPLICATION                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────────┐      ┌──────────────────┐       ┌──────────────────┐
│  Enhanced Cache  │      │  Offline Sale    │       │  Mobile Offline  │
│    Manager       │      │  Sync Service    │       │  Cache Service   │
└──────────────────┘      └──────────────────┘       └──────────────────┘
        │                           │                           │
        │    Error Occurs           │    Error Occurs           │
        ▼                           ▼                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Cache Error Logger Service                      │
│                  (src/services/cacheErrorLogger.ts)                 │
│                                                                       │
│  • Captures error details                                           │
│  • Auto-detects error type & severity                               │
│  • Collects user & branch context                                   │
│  • Stores in IndexedDB                                              │
│  • Manages cleanup & retention                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────┐
                        │      IndexedDB      │
                        │   (pos-error-logs)  │
                        │                     │
                        │  • error_logs store │
                        │  • Indexes:         │
                        │    - timestamp      │
                        │    - module         │
                        │    - errorType      │
                        │    - severity       │
                        │    - resolved       │
                        │    - userId         │
                        └─────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────────┐      ┌──────────────────┐       ┌──────────────────┐
│  Log Viewer      │      │  Export Service  │       │  Statistics      │
│  Component       │      │  (JSON/CSV)      │       │  Dashboard       │
└──────────────────┘      └──────────────────┘       └──────────────────┘
        │                           │                           │
        └───────────────────────────┴───────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────┐
                        │   Admin Dashboard   │
                        │   /admin/error-logs │
                        │                     │
                        │  • View logs        │
                        │  • Filter/Search    │
                        │  • Export data      │
                        │  • Mark resolved    │
                        │  • Delete logs      │
                        └─────────────────────┘
```

## Data Flow Diagram

```
┌──────────────┐
│ Cache Error  │
│  Occurs      │
└──────┬───────┘
       │
       │ 1. Error thrown in cache operation
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  try {                                                       │
│    // Cache operation                                        │
│  } catch (error) {                                          │
│    await cacheErrorLogger.logCacheError(                    │
│      'moduleName', 'functionName', error, 'operation',      │
│      { context }                                            │
│    );                                                        │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
       │
       │ 2. Logger processes error
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  Cache Error Logger Service                                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Auto-Detect:                                       │    │
│  │  • Error Type (logical/network/storage/sync)      │    │
│  │  • Severity (low/medium/high/critical)            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Collect Context:                                   │    │
│  │  • User ID, Name, Role                            │    │
│  │  • Branch ID, Name                                │    │
│  │  • Online/Offline status                          │    │
│  │  • Timestamp                                      │    │
│  │  • Stack trace                                    │    │
│  │  • Operation context                              │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
       │
       │ 3. Store in database
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  IndexedDB (pos-error-logs)                                 │
│                                                              │
│  Error Log Entry:                                           │
│  {                                                           │
│    id: 123,                                                 │
│    timestamp: "2024-12-03T10:30:00Z",                      │
│    module: "enhancedCacheManager",                         │
│    function: "smartFetch",                                 │
│    errorType: "network",                                   │
│    errorMessage: "Failed to fetch",                        │
│    errorStack: "Error: ...\n  at ...",                    │
│    operation: "fetch",                                     │
│    operationContext: { storeName: "products" },            │
│    userId: "user123",                                      │
│    userName: "John Doe",                                   │
│    userRole: "admin",                                      │
│    branchId: "branch1",                                    │
│    branchName: "Main Store",                               │
│    isOnline: false,                                        │
│    severity: "high",                                       │
│    resolved: false                                         │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
       │
       │ 4. Admin views logs
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  Admin Dashboard (/admin/error-logs)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Statistics:                                       │    │
│  │  • Total: 150                                      │    │
│  │  • Unresolved: 23                                  │    │
│  │  • Last 24h: 5                                     │    │
│  │  • Resolved: 127                                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Filters & Search                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Error Log Table                                   │    │
│  │  [Timestamp] [Severity] [Module] [Message] [...]   │    │
│  │  Click row → View Details                          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Actions:                                          │    │
│  │  • Export JSON/CSV                                 │    │
│  │  • Mark as Resolved                                │    │
│  │  • Delete Log                                      │    │
│  │  • Clear All                                       │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interaction Flow                     │
└─────────────────────────────────────────────────────────────┘

Admin opens error logs page
         │
         ▼
┌─────────────────────┐
│  ErrorLogsPage      │
│  (Admin Page)       │
└──────────┬──────────┘
           │
           │ Renders
           ▼
┌─────────────────────────────────────────────────┐
│  CacheErrorLogViewer Component                  │
│                                                  │
│  useEffect(() => {                              │
│    loadLogs()     ──────────────┐               │
│    loadStats()    ──────────┐   │               │
│  }, [])                     │   │               │
└─────────────────────────────┼───┼───────────────┘
                              │   │
                              │   │ API Calls
                              ▼   ▼
                    ┌─────────────────────┐
                    │ cacheErrorLogger    │
                    │     Service         │
                    │                     │
                    │ • getLogs()         │
                    │ • getStats()        │
                    │ • exportLogs()      │
                    │ • markResolved()    │
                    │ • deleteLog()       │
                    └──────────┬──────────┘
                               │
                               │ IndexedDB Operations
                               ▼
                    ┌─────────────────────┐
                    │    IndexedDB        │
                    │  (pos-error-logs)   │
                    └─────────────────────┘

User applies filters
         │
         ▼
Component re-renders with filtered data
         │
         ▼
User clicks log row
         │
         ▼
Detail modal opens with full error info
         │
         ▼
User marks as resolved / exports / deletes
         │
         ▼
cacheErrorLogger updates database
         │
         ▼
Component reloads and displays updated data
```

## Error Logging Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│              Enhanced Cache Manager Integration              │
└─────────────────────────────────────────────────────────────┘

EnhancedCacheManager Methods:
├── smartFetch()
│   └── Logs: fetch failures, network errors
├── refreshInBackground()
│   └── Logs: background refresh failures
├── getCacheStatus()
│   └── Logs: status check errors
├── getFromCache()
│   └── Logs: read operation failures
├── saveToCache()
│   └── Logs: write operation failures, quota errors
├── queueForSync()
│   └── Logs: sync queue failures
├── syncPendingOperations()
│   └── Logs: sync failures for each operation
├── getCacheStats()
│   └── Logs: stats computation errors
├── clearAllCache()
│   └── Logs: cache clear failures
└── invalidateCache()
    └── Logs: invalidation errors

┌─────────────────────────────────────────────────────────────┐
│          Offline Sale Sync Service Integration              │
└─────────────────────────────────────────────────────────────┘

OfflineSaleSyncService Methods:
├── saveSaleLocally()
│   └── Logs: local storage failures
├── syncSale()
│   └── Logs: sync failures (with attempt tracking)
├── cleanupOldSyncedSales()
│   └── Logs: cleanup operation errors
└── saveOfflineSales()
    └── Logs: storage quota errors, save failures
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                   IndexedDB: pos-error-logs                  │
└─────────────────────────────────────────────────────────────┘

Database: pos-error-logs (version 1)

Object Store: error_logs
├── Key Path: id (auto-increment)
└── Indexes:
    ├── timestamp (IDBIndex)
    ├── module (IDBIndex)
    ├── errorType (IDBIndex)
    ├── severity (IDBIndex)
    ├── resolved (IDBIndex)
    └── userId (IDBIndex)

Record Structure:
{
  id: number                          // Primary key
  timestamp: string                   // ISO 8601 timestamp
  module: string                      // Module name
  function: string                    // Function name
  errorType: 'logical' | 'network'    // Error category
            | 'storage' | 'sync' 
            | 'validation' | 'unknown'
  errorMessage: string                // Error message
  errorStack?: string                 // Stack trace (optional)
  operation: string                   // Operation type
  operationContext?: object           // Context data
  userId?: string                     // User ID
  userName?: string                   // User name
  userRole?: string                   // User role
  branchId?: string                   // Branch ID
  branchName?: string                 // Branch name
  isOnline: boolean                   // Online status
  severity: 'low' | 'medium'          // Severity level
           | 'high' | 'critical'
  resolved: boolean                   // Resolution status
  resolvedAt?: string                 // Resolution time
  resolvedBy?: string                 // Resolver name
  notes?: string                      // Resolution notes
}

Constraints:
├── Max logs: 10,000
├── Retention: 90 days
└── Auto-cleanup on read/write
```

## File Structure

```
NEON-POS-main/
│
├── src/
│   ├── services/
│   │   └── cacheErrorLogger.ts          ← Core logging service
│   │
│   ├── components/
│   │   └── CacheErrorLogViewer.tsx       ← Log viewer UI component
│   │
│   ├── features/
│   │   └── admin/
│   │       ├── pages/
│   │       │   ├── ErrorLogsPage.tsx     ← Admin page
│   │       │   └── AdminManagementPage.tsx (modified)
│   │       └── components/
│   │
│   ├── lib/
│   │   ├── enhancedCacheManager.ts       ← Integrated logging
│   │   └── routeRegistry.ts              ← Route definition
│   │
│   └── App.tsx                            ← Route configuration
│
├── CACHE_ERROR_LOGGING.md                 ← Full documentation
├── CACHE_ERROR_LOGGING_SUMMARY.md         ← Implementation summary
├── ERROR_LOG_QUICK_REFERENCE.md           ← Quick reference
└── CACHE_ERROR_LOGGING_ARCHITECTURE.md    ← This file
```

## Security & Access Control

```
┌─────────────────────────────────────────────────────────────┐
│                    Access Control Flow                       │
└─────────────────────────────────────────────────────────────┘

User navigates to /admin/error-logs
         │
         ▼
┌──────────────────┐
│ RoleProtectedRoute│
│  allowedRoles:   │
│  ['admin']       │
└────────┬─────────┘
         │
         ▼
   Is user admin?
         │
    ┌────┴────┐
    │         │
   Yes       No
    │         │
    ▼         ▼
 Allow    Redirect to
 Access   Dashboard
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│                  Performance Features                        │
└─────────────────────────────────────────────────────────────┘

1. Async Operations
   ├── Non-blocking error logging
   ├── Background database operations
   └── Promise-based API

2. Database Indexing
   ├── Fast queries by timestamp
   ├── Fast queries by module
   ├── Fast queries by severity
   └── Fast queries by resolution status

3. Pagination
   ├── 20 logs per page
   ├── Reduces rendering load
   └── Smooth scrolling

4. Lazy Loading
   ├── Admin page loads on-demand
   ├── Component code-splitting
   └── Reduced initial bundle size

5. Auto Cleanup
   ├── Periodic cleanup (not every operation)
   ├── Debounced cleanup calls
   └── Prevents storage bloat

6. Efficient Exports
   ├── Streams data to file
   ├── Respects filters
   └── Memory-efficient
```

---

**System Status**: ✅ Fully Implemented  
**Architecture**: Modular, scalable, maintainable  
**Performance**: Optimized for production use  
**Security**: Role-based access control  
**Storage**: IndexedDB with automatic management

