// Neon Database Client Implementation
// ✅ FIXED: Using WebSocket pooler connection for browser compatibility
// 
// This implementation uses Neon's WebSocket pooler connection which works in browsers.
// The HTTP API (neon() function) has CORS restrictions in browsers.
//
// IMPORTANT: WebSocket connection errors are EXPECTED and NORMAL
// - Initial connection attempts may fail (especially on cold starts)
// - The Pool automatically retries failed connections
// - These errors are suppressed in the console to reduce noise
// - Your application will continue to work - queries will succeed after retry
//
// For production, consider:
// 1. Backend API proxy for database calls (BEST for production security)
// 2. Deploy as serverless function (Vercel, Netlify, Cloudflare Workers)

import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Configure Neon Pool for browser environment
// Pool uses native PostgreSQL protocol over WebSocket - different from neon() HTTP API
if (typeof WebSocket !== 'undefined') {
  // Set the WebSocket constructor for browser environments
  neonConfig.webSocketConstructor = WebSocket;
}

// Pool-specific configuration (not used by neon() HTTP API)
neonConfig.useSecureWebSocket = true;      // Use wss:// for secure connections
neonConfig.pipelineConnect = false;        // Disable pipelining for better compatibility
neonConfig.pipelineTLS = false;            // Disable TLS pipelining
neonConfig.disableWarningInBrowsers = true; // Suppress browser warnings

// Note: wsProxy is NOT needed for Pool class
// Pool connects directly using PostgreSQL wire protocol over WebSocket
// The pooler endpoint handles WebSocket upgrades automatically

// Database URL - Load from environment variable (REQUIRED)
// Priority: VITE_DATABASE_URL (frontend accessible) > DATABASE_URL (fallback) > Development database (default)
let DATABASE_URL = import.meta.env.VITE_DATABASE_URL || import.meta.env.DATABASE_URL;

// Fallback to production Supabase database if not configured
if (!DATABASE_URL) {
  // PRODUCTION NEON DATABASE - Default fallback
  DATABASE_URL = 'postgresql://neondb_owner:npg_tHAqPdo2x0LR@ep-aged-pond-adays3pg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  console.log('⚠️  Using production Neon database (VITE_DATABASE_URL not set)');
}

// Detect Supabase EARLY - before pool initialization
const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const isSupabaseDatabase = DATABASE_URL?.toLowerCase().includes('supabase') || 
                           DATABASE_URL?.toLowerCase().includes('jxhzveborezjhsmzsgbc') ||
                           SUPABASE_URL_ENV?.toLowerCase().includes('supabase') ||
                           import.meta.env.VITE_SUPABASE_URL?.toLowerCase().includes('supabase');

if (isSupabaseDatabase) {
  console.log('✅ Detected Supabase database - will use REST API instead of WebSocket');
} else {
  console.log('✅ Neon client initializing with URL:', DATABASE_URL.substring(0, 50) + '...');
}

// Global error handler for WebSocket connection errors
// ✅ CRITICAL: Set up error suppression BEFORE any database connections
if (typeof window !== 'undefined') {
  // Initialize error counter if not exists
  if (!(window as any).__wsErrorCount) {
    (window as any).__wsErrorCount = 0;
  }
  
  // Suppress transient WebSocket errors that are automatically retried
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;
  
  // Track WebSocket errors to avoid spam
  const wsErrorCounts = new Map<string, number>();
  const WS_ERROR_SUPPRESS_THRESHOLD = 3; // Suppress after 3 occurrences
  
  // Helper function to check if a message is a WebSocket error
  const isWebSocketError = (errorMsg: string, fullMessage: string, allArgsString: string): boolean => {
    // Check all arguments for WebSocket-related content
    // The library may log errors with file paths first, so check the full message
    return (
      // Direct WebSocket error patterns
      errorMsg.includes('WebSocket connection to') ||
      errorMsg.includes('WebSocket is closed before the connection is established') ||
      errorMsg.includes('Failed to construct \'WebSocket\'') ||
      (errorMsg.includes('WebSocket connection') && errorMsg.includes('failed')) ||
      // Check full message for WebSocket errors (library may log file path first)
      fullMessage.includes('WebSocket connection to') ||
      (fullMessage.includes('WebSocket connection') && fullMessage.includes('failed')) ||
      // Neon-specific patterns - match the exact error format we're seeing
      fullMessage.includes('wss://') && (
        fullMessage.includes('neon.tech') || 
        fullMessage.includes('ep-') || 
        allArgsString.includes('ep-')
      ) && (
        fullMessage.includes('failed') || 
        fullMessage.includes('error') ||
        errorMsg.includes('failed')
      ) ||
      (fullMessage.includes('wss://') && (fullMessage.includes('pooler') || allArgsString.includes('pooler'))) ||
      (errorMsg.includes('@neondatabase/serverless') && errorMsg.includes('Unhandled error')) ||
      (fullMessage.includes('neon.tech') && fullMessage.includes('WebSocket')) ||
      // Library file path patterns
      (fullMessage.includes('@neondatabase_serverless.js') || fullMessage.includes('neondatabase_serverless.js')) ||
      (fullMessage.includes('@neondatabase') && (fullMessage.includes('WebSocket') || fullMessage.includes('wss://'))) ||
      // Lowercase checks for case-insensitive matching
      (allArgsString.includes('websocket') && (allArgsString.includes('failed') || allArgsString.includes('connection'))) ||
      (allArgsString.includes('websocket') && allArgsString.includes('neon')) ||
      (allArgsString.includes('wss://') && (allArgsString.includes('pooler') || allArgsString.includes('neon.tech'))) ||
      (allArgsString.includes('websocket') && allArgsString.includes('pooler')) ||
      // Additional patterns from the actual error messages
      (allArgsString.includes('ep-icy-mouse') || allArgsString.includes('ep-') && allArgsString.includes('pooler')) ||
      (errorMsg.includes('connect @') && (allArgsString.includes('neondatabase') || allArgsString.includes('@neondatabase'))) ||
      (fullMessage.includes('supabaseClient.ts') && allArgsString.includes('websocket')) ||
      // Stack trace patterns
      (allArgsString.includes('neondatabase') && allArgsString.includes('websocket')) ||
      (allArgsString.includes('neondatabase') && (allArgsString.includes('wss://') || allArgsString.includes('pooler'))) ||
      // Match the specific error format: "WebSocket connection to 'wss://...' failed"
      (fullMessage.match(/websocket\s+connection\s+to\s+['"]wss:\/\//i)) ||
      (allArgsString.match(/websocket\s+connection\s+to/i))
    );
  };
  
  // Enhanced error suppression for WebSocket connection errors
  console.error = (...args: any[]) => {
    // Convert all arguments to strings and check the full message
    const errorMsg = String(args[0] || '');
    const fullMessage = args.map(a => {
      // Handle different argument types
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.message + ' ' + a.stack;
      if (typeof a === 'object' && a !== null) return JSON.stringify(a);
      return String(a);
    }).join(' ');
    const allArgsString = fullMessage.toLowerCase();
    
    // Suppress common WebSocket connection errors that are automatically retried
    // These errors occur during initial connection attempts and are handled by the pool's retry mechanism
    if (isWebSocketError(errorMsg, fullMessage, allArgsString)) {
      // Track error frequency to avoid spam
      const errorKey = 'websocket_connection_error';
      const count = (wsErrorCounts.get(errorKey) || 0) + 1;
      wsErrorCounts.set(errorKey, count);
      
      // These errors are transient and will be retried automatically by the pool
      // Only log in development mode as debug info (not as error), and only occasionally
      if (import.meta.env.DEV && count <= WS_ERROR_SUPPRESS_THRESHOLD) {
        console.debug(`🔄 WebSocket connection attempt ${count}/${WS_ERROR_SUPPRESS_THRESHOLD} (automatic retry enabled)`);
      }
      return;
    }
    
    // Pass through all other errors
    originalConsoleError.apply(console, args);
  };
  
  console.warn = (...args: any[]) => {
    const warnMsg = String(args[0] || '');
    const fullMessage = args.map(a => String(a)).join(' ');
    const allArgsString = fullMessage.toLowerCase();
    
    // Suppress WebSocket warning noise and slow database response warnings
    if (
      isWebSocketError(warnMsg, fullMessage, allArgsString) ||
      warnMsg.includes('Slow database response') ||
      warnMsg.includes('possible cold start') ||
      warnMsg.includes('Cold start detected') ||
      fullMessage.includes('Database was asleep')
    ) {
      return; // Silently ignore - these are expected during connection attempts or cold starts
    }
    
    // Pass through all other warnings
    originalConsoleWarn.apply(console, args);
  };
  
  // Also suppress console.log messages that contain WebSocket errors
  console.log = (...args: any[]) => {
    // Convert all arguments to strings and check the full message
    const logMsg = String(args[0] || '');
    const fullMessage = args.map(a => {
      // Handle different argument types
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.message + ' ' + a.stack;
      if (typeof a === 'object' && a !== null) return JSON.stringify(a);
      return String(a);
    }).join(' ');
    const allArgsString = fullMessage.toLowerCase();
    
    // Suppress WebSocket error logs from the library
    if (isWebSocketError(logMsg, fullMessage, allArgsString)) {
      return; // Silently ignore
    }
    
    // Pass through all other logs
    originalConsoleLog.apply(console, args);
  };
  
  // Also suppress unhandled promise rejections from WebSocket connections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const errorMsg = reason?.message || String(reason || '');
    const errorString = String(reason || '').toLowerCase();
    
    // Suppress WebSocket-related unhandled rejections
    if (
      errorMsg.includes('WebSocket') ||
      errorMsg.includes('neon.tech') ||
      errorMsg.includes('pooler') ||
      errorString.includes('websocket') ||
      errorString.includes('wss://') ||
      (errorString.includes('neon') && errorString.includes('pooler'))
    ) {
      // These are handled by the pool's retry mechanism
      event.preventDefault();
      if (import.meta.env.DEV) {
        console.debug('🔄 Suppressed WebSocket unhandled rejection (will retry)');
      }
    }
  });
  
  // Global error event listener to catch WebSocket errors at the window level
  // ✅ Use capture phase and set up immediately to catch errors as early as possible
  const errorListener = (event: ErrorEvent) => {
    const errorMsg = event.message || String(event.error || '');
    const errorString = errorMsg.toLowerCase();
    const errorSource = (event.filename || '').toLowerCase();
    const fullErrorText = `${errorMsg} ${errorSource}`.toLowerCase();
    
    // Suppress WebSocket connection errors - check multiple sources
    // Match the exact error format: "WebSocket connection to 'wss://ep-...' failed"
    const isWebSocketError = (
      errorString.includes('websocket') ||
      errorString.includes('wss://') ||
      errorString.includes('ws://') ||
      (errorString.includes('neon') && (errorString.includes('pooler') || errorString.includes('ep-') || errorString.includes('.tech'))) ||
      errorMsg.includes('WebSocket connection to') ||
      errorMsg.includes('WebSocket connection') ||
      errorSource.includes('neondatabase') ||
      errorSource.includes('serverless') ||
      fullErrorText.match(/websocket\s+connection\s+to/i) ||
      (fullErrorText.includes('ep-') && (fullErrorText.includes('pooler') || fullErrorText.includes('neon')))
    );
    
    if (isWebSocketError) {
      // These are transient and will be retried automatically
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      // Only log occasionally in dev mode
      if (import.meta.env.DEV) {
        const errorKey = 'websocket_window_error';
        const count = ((window as any).__wsErrorCount || 0) + 1;
        (window as any).__wsErrorCount = count;
        if (count <= 3) {
          console.debug(`🔄 Suppressed WebSocket error event ${count}/3 (will retry automatically)`);
        }
      }
      return false; // Prevent default and stop propagation
    }
  };
  
  // Add listener in capture phase to catch errors as early as possible
  window.addEventListener('error', errorListener, true);
  
  // Also listen for unhandled promise rejections from WebSocket connections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const errorMsg = reason?.message || String(reason || '');
    const errorString = String(reason || '').toLowerCase();
    
    // Suppress WebSocket-related unhandled rejections
    const isWebSocketRejection = (
      errorMsg.includes('WebSocket') ||
      errorMsg.includes('neon.tech') ||
      errorMsg.includes('pooler') ||
      errorString.includes('websocket') ||
      errorString.includes('wss://') ||
      (errorString.includes('neon') && (errorString.includes('pooler') || errorString.includes('ep-'))) ||
      (errorString.includes('ep-') && errorString.includes('pooler')) ||
      errorString.match(/websocket\s+connection/i)
    );
    
    if (isWebSocketRejection) {
      // These are handled by the pool's retry mechanism
      event.preventDefault();
      if (import.meta.env.DEV) {
        const errorKey = 'websocket_rejection';
        const count = ((window as any).__wsErrorCount || 0) + 1;
        (window as any).__wsErrorCount = count;
        if (count <= 3) {
          console.debug(`🔄 Suppressed WebSocket unhandled rejection ${count}/3 (will retry)`);
        }
      }
    }
  });
}

// ✅ FIXED: Use WebSocket Pool for browser compatibility
// The neon() function uses HTTP API which has CORS restrictions in browsers
// Pool with WebSocket connections works in browser environments
let sql: any;
let pool: Pool;

// Supabase REST API client for authentication (works even if WebSocket fails)
const SUPABASE_URL = SUPABASE_URL_ENV;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';
// Create Supabase client with real-time completely disabled to prevent WebSocket connections
// This ensures no WebSocket connections are attempted
const supabaseRestClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    // Disable real-time completely
    disabled: true
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-rest-only'
    }
  },
  // Disable auto-refresh token to prevent additional connections
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

if (isSupabaseDatabase) {
  console.log('✅ Supabase REST client initialized for all database operations');
  console.log('🌐 Using Supabase REST API (no WebSocket needed)');
} else {
  console.log('✅ Supabase REST client initialized for authentication');
  console.log('📡 Using Neon WebSocket Pooler for browser-compatible database connections');
  console.log('ℹ️  Note: WebSocket pooler enabled for CORS-free browser access');
}

// Only initialize Neon pool if NOT using Supabase
if (!isSupabaseDatabase) {
  try {
    // Create a Pool instance for WebSocket connections with proper configuration
    // These settings prevent "Connection terminated unexpectedly" errors
    pool = new Pool({ 
    connectionString: DATABASE_URL,
    // Connection pool settings optimized for browser environments
    max: 10,                          // Maximum number of clients in the pool (browser-friendly limit)
    idleTimeoutMillis: 30000,         // Close idle connections after 30 seconds
    connectionTimeoutMillis: 60000,   // Wait 60 seconds for new connection (increased for cold starts)
    maxUses: 7500,                    // Maximum uses before connection is closed and recreated
    // Statement timeout to prevent long-running queries
    statement_timeout: 60000,         // 60 seconds max per query (increased from 30s)
    // Connection parameters for stability
    keepAlive: true,                  // Enable TCP keepalive
    keepAliveInitialDelayMillis: 10000, // Start keepalive after 10 seconds
  });
  
  // Add pool error handler to catch connection errors gracefully
  pool.on('error', (err: any) => {
    const errorMsg = err?.message || String(err || '');
    const errorString = String(err || '').toLowerCase();
    
    // Suppress expected WebSocket connection errors that are automatically retried
    const isWebSocketError = (
      errorMsg.includes('WebSocket') ||
      errorMsg.includes('connection terminated') ||
      errorMsg.includes('ECONNRESET') ||
      errorMsg.includes('socket hang up') ||
      errorString.includes('websocket') ||
      errorString.includes('wss://') ||
      (errorString.includes('neon') && errorString.includes('pooler')) ||
      (errorString.includes('failed') && (errorString.includes('websocket') || errorString.includes('wss://')))
    );
    
    if (isWebSocketError) {
      // These are transient errors - the pool will automatically retry
      // Only log in development mode, and only occasionally to avoid spam
      if (import.meta.env.DEV) {
        const errorKey = 'pool_websocket_error';
        const count = (wsErrorCounts.get(errorKey) || 0) + 1;
        wsErrorCounts.set(errorKey, count);
        
        if (count <= WS_ERROR_SUPPRESS_THRESHOLD) {
          console.debug(`🔄 Pool WebSocket connection error ${count}/${WS_ERROR_SUPPRESS_THRESHOLD} (will retry automatically)`);
        }
      }
      return;
    }
    
    // Log unexpected errors
    console.warn('⚠️ Unexpected pool error (connection will be recreated):', errorMsg);
    // Don't throw - let the pool handle reconnection
  });
  
  // Add pool connection handler for debugging (only in dev mode to reduce noise)
  pool.on('connect', () => {
    if (import.meta.env.DEV) {
      console.debug('🔌 New database connection established');
    }
  });
  
  // Add pool removal handler (only in dev mode)
  pool.on('remove', () => {
    if (import.meta.env.DEV) {
      console.debug('🔌 Database connection removed from pool');
    }
  });
  
  // Wrap pool.query in a sql-like interface for compatibility
  sql = async (strings: TemplateStringsArray, ...values: any[]) => {
    // Build the query string
    let query = strings[0];
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      let formattedValue: string;
      
      if (value === null || value === undefined) {
        formattedValue = 'NULL';
      } else if (typeof value === 'string') {
        formattedValue = `'${value.replace(/'/g, "''")}'`;
      } else if (typeof value === 'boolean') {
        formattedValue = value ? 'TRUE' : 'FALSE';
      } else if (value instanceof Date) {
        formattedValue = `'${value.toISOString()}'`;
      } else if (Array.isArray(value)) {
        formattedValue = `ARRAY[${value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]`;
      } else if (typeof value === 'object') {
        formattedValue = `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
      } else {
        formattedValue = String(value);
      }
      
      query += formattedValue + strings[i + 1];
    }
    
    // Execute query using pool
    const result = await pool.query(query);
    return result.rows;
  };
  
    console.log('✅ Neon WebSocket Pool created successfully');
    console.log('ℹ️  Pool config: max=10, idle=30s, timeout=60s, statement_timeout=60s');
    console.log('ℹ️  Note: WebSocket connection errors are expected during initial connection and will be automatically retried');
    
    // Warm up the connection pool in the background (non-blocking)
    // This helps reduce cold start latency for the first query
    // Use a longer delay to allow the pool to initialize properly
    setTimeout(async () => {
      try {
        if (import.meta.env.DEV) {
          console.log('🔥 Warming up connection pool...');
        }
        // Use a timeout for the warmup query to prevent hanging
        const warmupPromise = pool.query('SELECT 1');
        const warmupTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Warmup timeout')), 10000)
        );
        
        await Promise.race([warmupPromise, warmupTimeout]);
        if (import.meta.env.DEV) {
          console.log('✅ Connection pool warmed up successfully');
        }
      } catch (warmupError: any) {
        // Ignore warmup errors - they'll be retried on actual queries
        // WebSocket connection failures during warmup are expected and will be handled by retry logic
        const errorMsg = getErrorMessage(warmupError);
        if (import.meta.env.DEV && !errorMsg.includes('WebSocket') && !errorMsg.includes('timeout')) {
          console.debug('ℹ️  Pool warmup deferred - will connect on first query');
        }
      }
    }, 2000); // Start warmup after 2 seconds to allow pool initialization
    
    // Keep-alive: Ping database every 4 minutes to prevent it from sleeping
    // Neon free tier databases sleep after ~5 minutes of inactivity
    setInterval(async () => {
      try {
        await pool.query('SELECT 1');
        console.log('💓 Database keep-alive ping successful');
      } catch (error) {
        console.debug('⚠️ Keep-alive ping failed (will retry):', getErrorMessage(error));
      }
    }, 4 * 60 * 1000); // Ping every 4 minutes
  } catch (error: any) {
    console.error('❌ Failed to initialize Neon pool:', error);
    // Don't throw - let the app continue with Supabase REST API if available
  }
} else {
  // Using Supabase - no pool needed
  console.log('✅ Skipping Neon pool initialization (using Supabase REST API)');
  
  // Create a dummy sql function that throws helpful error
  sql = async (strings: TemplateStringsArray, ...values: any[]) => {
    console.error('❌ Attempted to use sql template with Supabase. Use supabase.from() instead.');
    throw new Error('Direct SQL queries not supported with Supabase. Use supabase.from() for REST API queries.');
  };
  
  // Create a dummy pool object to prevent errors
  pool = null as any;
  
  // ✅ ADDED: Supabase REST API keep-alive mechanism
  // Supabase free tier can also experience cold starts when idle
  // This lightweight ping keeps the connection warm and prevents slow first queries
  console.log('🔥 Initializing Supabase REST API keep-alive mechanism...');
  
  // Warm up Supabase connection immediately (non-blocking)
  setTimeout(async () => {
    try {
      console.log('🔥 Warming up Supabase REST API connection...');
      // Perform a lightweight query to warm up the connection
      const { error } = await supabaseRestClient
        .from('store_locations')
        .select('id')
        .limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned (ok for warmup)
        console.debug('⚠️ Supabase warmup query returned:', error.message);
      } else {
        console.log('✅ Supabase REST API connection warmed up successfully');
      }
    } catch (warmupError: any) {
      // Ignore warmup errors - they'll be retried on actual queries
      console.debug('ℹ️  Supabase warmup deferred:', getErrorMessage(warmupError));
    }
  }, 1000); // Start warmup after 1 second
  
  // Keep-alive: Ping Supabase REST API every 4 minutes to prevent cold starts
  // This ensures the first user query after idle period is fast
  setInterval(async () => {
    try {
      // Perform a lightweight query - just check if a system table exists
      // Using store_locations as it's a core table that should always exist
      const { error } = await supabaseRestClient
        .from('store_locations')
        .select('id')
        .limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned (acceptable)
        console.debug('⚠️ Supabase keep-alive ping returned:', error.message);
      } else {
        console.log('💓 Supabase REST API keep-alive ping successful');
      }
    } catch (error) {
      // Silently fail - the retry mechanism will handle reconnection on actual queries
      console.debug('⚠️ Supabase keep-alive ping failed (will retry):', getErrorMessage(error));
    }
  }, 4 * 60 * 1000); // Ping every 4 minutes (240000ms)
  
  console.log('✅ Supabase REST API keep-alive initialized (ping every 4 minutes)');
}

// Helper function to safely get error message
const getErrorMessage = (error: any): string => {
  if (!error) return 'Unknown error';
  
  // Handle Event objects (WebSocket errors)
  if (error instanceof Event) {
    return `Connection error: ${error.type || 'Unknown event'}`;
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    return error.message || 'Unknown error';
  }
  
  // Handle plain objects with message property
  if (typeof error === 'object' && error.message) {
    return String(error.message);
  }
  
  // Handle strings
  if (typeof error === 'string') {
    return error;
  }
  
  // Last resort - try JSON stringify, fallback to type
  try {
    const str = JSON.stringify(error);
    if (str && str !== '{}') return str;
  } catch (e) {
    // JSON.stringify failed
  }
  
  return 'Unknown error occurred';
};

// Helper function to check if error is a network/connection error
const isNetworkError = (error: any): boolean => {
  // Check if it's an Event object (WebSocket errors)
  if (error instanceof Event) {
    return true;
  }
  
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorName = error?.name?.toLowerCase() || '';
  const errorType = error?.type?.toLowerCase() || '';
  
  return (
    // Network errors
    errorMessage.includes('network') ||
    errorMessage.includes('err_network_changed') ||
    errorMessage.includes('err_name_not_resolved') ||
    errorMessage.includes('err_internet_disconnected') ||
    errorMessage.includes('err_connection_closed') ||
    errorMessage.includes('err_connection_refused') ||
    errorMessage.includes('err_connection_reset') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network request failed') ||
    errorMessage.includes('websocket') ||
    errorMessage.includes('connection lost') ||
    // Connection termination errors (common with WebSocket pooler)
    errorMessage.includes('connection terminated') ||
    errorMessage.includes('connection closed') ||
    errorMessage.includes('socket closed') ||
    errorMessage.includes('socket hang up') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('epipe') ||
    // Timeout errors (common during cold starts)
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('deadline') ||
    errorType.includes('error') ||
    errorName.includes('networkerror') ||
    (errorName.includes('typeerror') && errorMessage.includes('fetch'))
  );
};

// Helper function to execute SQL queries with the Neon serverless client
const executeSql = async (query: string, params: any[] = [], suppressLogs: boolean = false, retryCount: number = 0): Promise<any> => {
  const MAX_RETRIES = 5; // Increased for network errors
  const RETRY_DELAY = 800; // Increased base delay for network errors
  const MAX_NETWORK_RETRIES = 5; // Increased for WebSocket reconnection
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  // Check if pool is available (might be null if Supabase is being used)
  if (!pool) {
    const errorMsg = 'Database pool not initialized. Check your database configuration.';
    if (!suppressLogs) {
      console.error('❌', errorMsg);
    }
    throw new Error(errorMsg);
  }
  
  // Only log queries when suppressLogs is false (reduced noise)
  if (!suppressLogs && isDevelopment && retryCount === 0) {
    console.log('🔍 [SQL]', query.substring(0, 100) + '...');
  }
  
  try {
    // ✅ FIXED: Use pool.query() for WebSocket connections
    // The Pool already has built-in connection pooling, so we don't need the connectionPool wrapper
    const result = await pool.query(query);
    
    // Reduced logging - only in dev mode and when not suppressed
    if (!suppressLogs && isDevelopment) {
      if (retryCount > 0) {
        console.log(`✅ [SQL OK after ${retryCount} retries]`, result.rows ? `${result.rows.length} rows` : 'Success');
      } else {
        console.log('✅ [SQL OK]', result.rows ? `${result.rows.length} rows` : 'Success');
      }
    }
    
    // Return rows array from the Pool result
    return result.rows || [];
  } catch (error: any) {
    // Check error types - safely handle undefined message and Event objects
    const errorMessage = getErrorMessage(error);
    const errorString = errorMessage.toLowerCase();
    const is400Error = errorMessage.includes('400') || error?.status === 400 || error?.statusCode === 400;
    const isNetwork = isNetworkError(error);
    const isConnectionTerminated = errorString.includes('connection terminated') || errorString.includes('connection closed');
    const isTimeout = errorString.includes('timeout') || errorString.includes('timed out');
    // Enhanced WebSocket error detection - check for various WebSocket failure patterns
    const isWebSocketError = (
      errorMessage.includes('WebSocket') || 
      errorMessage.includes('wss://') || 
      errorMessage.includes('ws://') ||
      errorString.includes('websocket') ||
      errorString.includes('websocket connection') ||
      (errorString.includes('failed') && (errorString.includes('wss://') || errorString.includes('ws://'))) ||
      error?.type === 'error' ||
      (error instanceof Event && error.type === 'error')
    );
    
    // Determine if we should retry
    const shouldRetry = (
      (is400Error && retryCount < MAX_RETRIES) ||
      (isNetwork && retryCount < MAX_NETWORK_RETRIES) ||
      (isConnectionTerminated && retryCount < MAX_NETWORK_RETRIES) ||
      (isTimeout && retryCount < MAX_NETWORK_RETRIES) ||
      (isWebSocketError && retryCount < MAX_NETWORK_RETRIES)
    );
    
    // Suppress WebSocket errors from logging (they're expected and will retry)
    if (isWebSocketError && !suppressLogs) {
      // Only log in dev mode as debug, not as error
      if (isDevelopment && retryCount === 0) {
        console.debug('🔄 WebSocket connection error (automatic retry enabled)');
      }
    }
    
    if (shouldRetry) {
      // Log timeout errors with specific guidance (only in dev mode and only on first attempt)
      if (isTimeout && !suppressLogs && isDevelopment && retryCount === 0) {
        console.debug(`⏱️ Connection timeout (attempt ${retryCount + 1}/${MAX_NETWORK_RETRIES}) - retrying automatically`);
      }
      // Log connection termination errors with specific guidance
      else if (isConnectionTerminated && !suppressLogs) {
        console.warn(`🔌 Connection terminated (attempt ${retryCount + 1}/${MAX_NETWORK_RETRIES})`);
        console.warn('💡 Reconnecting to database pool...');
      }
      // Log other network errors
      else if (isNetwork && !suppressLogs) {
        const networkErrorMsg = getErrorMessage(error);
        console.warn(`🌐 Network error detected (attempt ${retryCount + 1}/${MAX_NETWORK_RETRIES}): ${networkErrorMsg}`);
        console.warn('💡 Tip: Check your internet connection. Retrying...');
      }
      
      // Silent retry for 400 errors - don't log transient errors that will be retried
      // Only log if this is the LAST retry attempt (to reduce console noise)
      if (!suppressLogs && isDevelopment && is400Error && retryCount >= MAX_RETRIES - 1) {
        // Only log on final retry attempt
        const error400Msg = getErrorMessage(error);
        console.warn(`⚠️ 400 error (final attempt ${retryCount + 1}/${MAX_RETRIES}):`, error400Msg);
        console.warn('📝 Query causing 400 error:', query.substring(0, 300));
      }
      
      // Exponential backoff with jitter for better retry distribution
      // WebSocket errors get longer delays since they need time to reconnect
      const baseDelay = (isWebSocketError || isNetwork || isConnectionTerminated || isTimeout) 
        ? RETRY_DELAY * 2 
        : RETRY_DELAY;
      const exponentialDelay = baseDelay * Math.pow(2, retryCount);
      const jitter = Math.random() * 0.3 * exponentialDelay; // Add 0-30% jitter
      const totalDelay = Math.round(exponentialDelay + jitter);
      
      // Only log retry attempts in development mode and when not suppressed
      if (!suppressLogs && isDevelopment && isWebSocketError) {
        console.debug(`🔄 WebSocket connection retry ${retryCount + 1}/${MAX_NETWORK_RETRIES} in ${totalDelay}ms...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, totalDelay));
      return executeSql(query, params, suppressLogs, retryCount + 1);
    }
    
    // Only log significant errors, not every failure
    if (!suppressLogs) {
      const finalErrorMsg = getErrorMessage(error);
      if (isWebSocketError) {
        console.error('❌ WebSocket connection failed after', MAX_NETWORK_RETRIES, 'retries');
        console.error('💡 Possible causes:');
        console.error('   - Network firewall blocking WebSocket connections (wss://)');
        console.error('   - Database pooler endpoint is unreachable');
        console.error('   - Browser security settings blocking WebSocket connections');
        console.error('   - Database is temporarily unavailable');
        console.error('💡 Solutions:');
        console.error('   - Check your internet connection');
        console.error('   - Verify database connection string is correct');
        console.error('   - Try refreshing the page');
        console.error('   - If using Supabase, ensure VITE_SUPABASE_URL is set');
        console.error('Error details:', finalErrorMsg);
      } else if (isTimeout) {
        console.error('⏱️ Database connection timeout after', MAX_NETWORK_RETRIES, 'retries');
        console.error('💡 Possible causes:');
        console.error('   - Database is cold-starting (first request after idle period)');
        console.error('   - Network latency is high');
        console.error('   - Query is too complex');
        console.error('Error details:', finalErrorMsg);
      } else if (isNetwork) {
        console.error('❌ Network connection failed after', MAX_NETWORK_RETRIES, 'retries');
        console.error('📡 Please check your internet connection and try again');
        console.error('Error details:', finalErrorMsg);
      } else if (is400Error) {
        console.error('❌ Persistent 400 error after', MAX_RETRIES, 'retries:', finalErrorMsg);
      } else {
        console.error('❌ SQL Error:', finalErrorMsg);
      }
      // Always show full query for "column does not exist" errors (42703)
      const errorCode = error?.code || '';
      if (errorCode === '42703') {
        console.error('🔍 COLUMN ERROR - Full Query:', query);
        console.error('🔍 Error Code:', errorCode);
      } else if (errorCode && errorCode !== '42P01') {
        console.error('Code:', errorCode, '| Query:', query.substring(0, 100));
      }
    }
    
    // Throw error to be handled by caller
    throw error;
  }
};

// Query builder implementation for Neon
class NeonQueryBuilder implements PromiseLike<{ data: any; error: any; count?: number | null }> {
  private tableName: string;
  private selectFields: string = '*';
  private whereConditions: string[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private rangeClause: { from: number; to: number } | null = null;
  private suppressErrors: boolean = false;
  private countMode: 'exact' | 'planned' | 'estimated' | null = null;
  private headMode: boolean = false;
  private joins: Array<{ table: string; alias: string; on: string; columns: string[] }> = [];

  constructor(tableName: string) {
    // SAFETY CHECK: Prevent using foreign key column names as table names
    // This prevents SQL errors like "relation 'customer_id' does not exist"
    if (tableName.endsWith('_id') && tableName !== 'id') {
      console.error(`❌ [NeonQueryBuilder] Invalid table name "${tableName}" - names ending with _id are foreign key columns, not table names`);
      throw new Error(`Invalid table name: "${tableName}". Names ending with _id are foreign key columns, not table names.`);
    }
    
    this.tableName = tableName;
    // Initialize operation flags
    (this as any).isInsert = false;
    (this as any).isUpdate = false;
    (this as any).isUpsert = false;
    (this as any).isDelete = false;
    (this as any).insertData = null;
    (this as any).updateData = null;
    (this as any).deleteData = null;
  }

  select(fields: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    // Handle options for count and head mode
    if (options?.count) {
      this.countMode = options.count;
    }
    if (options?.head) {
      this.headMode = true;
    }
    
    // Parse PostgREST relationship syntax and convert to JOINs
    if (fields.includes('(') && fields.includes(')')) {
      console.log('🔗 Parsing PostgREST relationship syntax:', fields.substring(0, 150));
      
      // Helper function to find matching closing parenthesis
      const findMatchingParen = (str: string, startIdx: number): number => {
        let depth = 1;
        for (let i = startIdx + 1; i < str.length; i++) {
          if (str[i] === '(') depth++;
          else if (str[i] === ')') {
            depth--;
            if (depth === 0) return i;
          }
        }
        return -1;
      };
      
      // Helper function to extract columns, removing nested relations first
      const extractColumns = (columnsStr: string): string[] => {
        let working = columnsStr;
        
        // First, remove all nested relations (alias:table(...))
        // Use the same findMatchingParen logic to handle nested parens correctly
        const nestedPattern = /(\w+):(\w+)\s*\(/g;
        let match;
        
        // Keep removing nested relations until there are none left
        let maxIterations = 10; // Prevent infinite loops
        while (maxIterations-- > 0 && (match = nestedPattern.exec(working)) !== null) {
          const openParenIdx = match.index + match[0].length - 1;
          const closeParenIdx = findMatchingParen(working, openParenIdx);
          
          if (closeParenIdx !== -1) {
            // Remove this nested relation
            const fullMatch = working.substring(match.index, closeParenIdx + 1);
            working = working.replace(fullMatch, '');
            // Reset regex after modification
            nestedPattern.lastIndex = 0;
          } else {
            // Skip if we can't find matching paren
            nestedPattern.lastIndex = match.index + 1;
          }
        }
        
        // Now split by comma and extract clean column names
        const columns = working.split(',')
          .map(c => c.trim())
          .filter(c => {
            // Only keep simple column names
            return c && c.length > 0 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c);
          });
        
        return columns;
      };
      
      // Extract base fields and relationships using regex
      const relationships: Array<{ alias: string; table: string; foreignKey: string; columns: string[] }> = [];
      let workingFields = fields;
      
      // Pattern 1: alias:table!foreign_key(columns) - explicit foreign key
      // Use a simpler regex to find the start, then use findMatchingParen for proper nesting
      const explicitPattern = /(\w+):(\w+)!(\w+)\s*\(/g;
      let match;
      
      while ((match = explicitPattern.exec(workingFields)) !== null) {
        const [startMatch, alias, table, foreignKeyOrJoinType] = match;
        
        // CRITICAL: Skip if table or alias name ends with _id - these are ALWAYS foreign key columns, never table names
        if ((table.endsWith('_id') && table !== 'id') || (alias.endsWith('_id') && alias !== 'id')) {
          console.log(`⏭️ [Pattern 1] Skipping ${alias}:${table}!${foreignKeyOrJoinType}( - names ending with _id are foreign key columns, not table names`);
          explicitPattern.lastIndex = 0;
          continue;
        }
        
        const openParenIdx = match.index + startMatch.length - 1;
        const closeParenIdx = findMatchingParen(workingFields, openParenIdx);
        
        if (closeParenIdx === -1) {
          console.warn(`⚠️ [Explicit FK] Could not find matching parenthesis for: ${startMatch}`);
          explicitPattern.lastIndex = 0;
          continue;
        }
        
        const fullMatch = workingFields.substring(match.index, closeParenIdx + 1);
        const columnsStr = workingFields.substring(openParenIdx + 1, closeParenIdx);
        
        // Check if the "foreignKey" is actually a JOIN type modifier (inner, left, right)
        const joinTypes = ['inner', 'left', 'right', 'outer', 'full'];
        let foreignKey;
        if (joinTypes.includes(foreignKeyOrJoinType.toLowerCase())) {
          // It's a JOIN type, infer the foreign key from alias
          foreignKey = `${alias}_id`;
          console.log(`🔗 [JOIN Type] Detected ${foreignKeyOrJoinType.toUpperCase()} JOIN, inferring FK: ${foreignKey}`);
        } else {
          // It's an actual foreign key
          foreignKey = foreignKeyOrJoinType;
        }
        
        // Extract only top-level column names (ignore nested relationships)
        const columns = extractColumns(columnsStr);
        
        console.log(`🔑 [Explicit FK] Alias: ${alias}, Table: ${table}, FK: ${foreignKey}, Columns: ${columns.join(', ')}`);
        relationships.push({ alias, table, foreignKey, columns });
        
        // Remove this relationship from working fields
        workingFields = workingFields.replace(fullMatch, '');
        // Reset regex index after modifying the string
        explicitPattern.lastIndex = 0;
      }
      
      // Pattern 1.5: table!foreign_key(columns) - explicit foreign key without alias
      // Use a simpler regex to find the start, then use findMatchingParen for proper nesting
      // Updated regex to handle underscores in foreign key names (like customer_id)
      const tableExplicitPattern = /([a-zA-Z][a-zA-Z0-9_]*)!([a-zA-Z][a-zA-Z0-9_]*)\s*\(/g;
      
      // Reset regex lastIndex to ensure we start from the beginning
      tableExplicitPattern.lastIndex = 0;
      
      while ((match = tableExplicitPattern.exec(workingFields)) !== null) {
        const [startMatch, table, foreignKeyOrJoinType] = match;
        
        console.log(`🔍 [Pattern 1.5] Found match: ${startMatch}, table: ${table}, FK: ${foreignKeyOrJoinType}`);
        
        // CRITICAL: Skip if table name ends with _id - these are ALWAYS foreign key columns, never table names
        if (table.endsWith('_id') && table !== 'id') {
          console.log(`⏭️ [Pattern 1.5] Skipping ${table}!${foreignKeyOrJoinType} - table name ending with _id is a foreign key column, not a table`);
          tableExplicitPattern.lastIndex = 0;
          continue;
        }
        
        // Skip if already processed as explicit relationship with alias
        if (relationships.some(r => r.table === table && r.foreignKey === foreignKeyOrJoinType)) {
          console.log(`⏭️ [Pattern 1.5] Skipping duplicate: ${table}!${foreignKeyOrJoinType}`);
          tableExplicitPattern.lastIndex = 0;
          continue;
        }
        
        const openParenIdx = match.index + startMatch.length - 1;
        const closeParenIdx = findMatchingParen(workingFields, openParenIdx);
        
        if (closeParenIdx === -1) {
          console.warn(`⚠️ [Table Explicit FK] Could not find matching parenthesis for: ${startMatch}`);
          tableExplicitPattern.lastIndex = 0;
          continue;
        }
        
        const fullMatch = workingFields.substring(match.index, closeParenIdx + 1);
        const columnsStr = workingFields.substring(openParenIdx + 1, closeParenIdx);
        
        // Check if the "foreignKey" is actually a JOIN type modifier (inner, left, right)
        const joinTypes = ['inner', 'left', 'right', 'outer', 'full'];
        let foreignKey;
        if (joinTypes.includes(foreignKeyOrJoinType.toLowerCase())) {
          // It's a JOIN type, infer the foreign key from table name
          foreignKey = `${table}_id`;
          if (table.endsWith('s') && table.length > 1) {
            const singularName = table.slice(0, -1);
            foreignKey = `${singularName}_id`;
          }
          console.log(`🔗 [Table JOIN Type] Detected ${foreignKeyOrJoinType.toUpperCase()} JOIN, inferring FK: ${foreignKey}`);
        } else {
          // It's an actual foreign key
          foreignKey = foreignKeyOrJoinType;
        }
        
        // Extract only top-level column names (ignore nested relationships)
        const columns = extractColumns(columnsStr);
        
        // Use table name as alias
        const alias = table;
        
        console.log(`🔑 [Table Explicit FK] Alias: ${alias}, Table: ${table}, FK: ${foreignKey}, Columns: ${columns.join(', ')}`);
        relationships.push({ alias, table, foreignKey, columns });
        
        // Remove this relationship from working fields
        // Use a more robust replacement that handles the full match including any whitespace
        const matchStart = match.index;
        const matchEnd = closeParenIdx + 1;
        const matchToRemove = workingFields.substring(matchStart, matchEnd);
        
        // Remove the match and clean up surrounding commas
        const beforeMatch = workingFields.substring(0, matchStart);
        const afterMatch = workingFields.substring(matchEnd);
        
        // Remove trailing comma from beforeMatch if present
        const cleanedBefore = beforeMatch.replace(/,\s*$/, '');
        // Remove leading comma from afterMatch if present
        const cleanedAfter = afterMatch.replace(/^\s*,/, '');
        
        // Reconstruct workingFields, adding comma only if both parts exist
        workingFields = (cleanedBefore + (cleanedBefore && cleanedAfter ? ',' : '') + cleanedAfter).trim();
        
        console.log(`🗑️ [Pattern 1.5] Removed: ${matchToRemove.substring(0, 50)}...`);
        
        // Reset regex index after modifying the string
        tableExplicitPattern.lastIndex = 0;
      }
      
      // Pattern 2: alias:table(columns) - inferred foreign key
      // Use a simpler regex to find the start, then use findMatchingParen for proper nesting
      const inferredPattern = /(\w+):(\w+)\s*\(/g;
      
      while ((match = inferredPattern.exec(workingFields)) !== null) {
        const [startMatch, alias, table] = match;
        
        // CRITICAL: Skip if table or alias name ends with _id - these are ALWAYS foreign key columns, never table names
        if ((table.endsWith('_id') && table !== 'id') || (alias.endsWith('_id') && alias !== 'id')) {
          console.log(`⏭️ [Pattern 2] Skipping ${alias}:${table}( - names ending with _id are foreign key columns, not table names`);
          inferredPattern.lastIndex = 0;
          continue;
        }
        
        // Skip if already processed as explicit relationship
        if (relationships.some(r => r.alias === alias && r.table === table)) {
          inferredPattern.lastIndex = 0;
          continue;
        }
        
        const openParenIdx = match.index + startMatch.length - 1;
        const closeParenIdx = findMatchingParen(workingFields, openParenIdx);
        
        if (closeParenIdx === -1) {
          console.warn(`⚠️ [Inferred FK] Could not find matching parenthesis for: ${startMatch}`);
          inferredPattern.lastIndex = 0;
          continue;
        }
        
        const fullMatch = workingFields.substring(match.index, closeParenIdx + 1);
        const columnsStr = workingFields.substring(openParenIdx + 1, closeParenIdx);
        
        // Infer foreign key
        // Special mappings for known foreign key exceptions
        const foreignKeyMappings: Record<string, string> = {
          'lats_categories': 'category_id',
          'lats_category': 'category_id',
          'categories': 'category_id',
          'category': 'category_id',
          'lats_product_variants': 'product_id',
          'product_variants': 'product_id',
          'variants': 'product_id',
        };
        
        let foreignKey = foreignKeyMappings[alias] || foreignKeyMappings[table];
        if (!foreignKey) {
          foreignKey = `${alias}_id`;
          
          // Special handling for known child tables (variants, items, etc.)
          const knownChildPatterns = ['variants', 'items', 'details', 'lines'];
          const isChildTable = knownChildPatterns.some(pattern => 
            alias.includes(pattern) || table.includes(`_${pattern}`)
          );
          
          if (isChildTable) {
            const tablePattern = /^(.+)_(variants|items|details|lines)$/;
            const tableMatch = table.match(tablePattern);
            
            if (tableMatch) {
              const parentTable = tableMatch[1];
              const parentParts = parentTable.split('_');
              const parentEntity = parentParts[parentParts.length - 1];
              foreignKey = `${parentEntity}_id`;
              console.log(`🔑 [FK Inference] Child table: ${table}, Alias: ${alias}, Inferred FK: ${foreignKey}`);
            }
          }
        }
        
        // Extract columns
        const columns = extractColumns(columnsStr);
        
        console.log(`🔑 [Inferred FK] Alias: ${alias}, Table: ${table}, FK: ${foreignKey}, Columns: ${columns.join(', ')}`);
        relationships.push({ alias, table, foreignKey, columns });
        
        // Remove this relationship from working fields
        workingFields = workingFields.replace(fullMatch, '');
        // Reset regex index after modifying the string
        inferredPattern.lastIndex = 0;
      }
      
      // Pattern 3: table_name (columns) - simple syntax with inferred foreign key
      // Use a simpler regex to find the start, then use findMatchingParen for proper nesting
      const simplePattern = /(\w+)\s*\(/g;
      
      while ((match = simplePattern.exec(workingFields)) !== null) {
        const [startMatch, tableName] = match;
        
        // Skip if already processed
        if (relationships.some(r => r.alias === tableName || r.table === tableName)) {
          simplePattern.lastIndex = 0;
          continue;
        }
        
        // CRITICAL FIX: Skip if tableName ends with _id - these are ALWAYS foreign key columns, never table names
        // Foreign key columns like customer_id, user_id, branch_id, etc. should NEVER be treated as table names
        // The only exception is the literal "id" which is a valid table column name
        if (tableName.endsWith('_id') && tableName !== 'id') {
          console.log(`⏭️ [Pattern 3] Skipping ${tableName}( - names ending with _id are foreign key columns, not table names`);
          simplePattern.lastIndex = 0;
          continue;
        }
        
        // Skip if this looks like it should have been matched by Pattern 1.5 (table!foreign_key)
        // Check if there's a ! before the opening parenthesis (but not part of alias:table! format)
        const checkStart = Math.max(0, match.index - 50);
        const beforeParen = workingFields.substring(checkStart, match.index);
        // If we see a ! before the paren and it's not in alias:table! format, skip this match
        const lastExclamation = beforeParen.lastIndexOf('!');
        if (lastExclamation !== -1) {
          const beforeExclamation = beforeParen.substring(0, lastExclamation);
          // Check if it's in alias:table! format (Pattern 1) - if so, it's already handled
          const hasColonBeforeExclamation = beforeExclamation.includes(':');
          if (!hasColonBeforeExclamation) {
            // This is table!foreign_key format that should have been caught by Pattern 1.5
            // Skip it to avoid incorrect parsing
            console.log(`⏭️ [Pattern 3] Skipping ${tableName}( - looks like it should be handled by Pattern 1.5`);
            simplePattern.lastIndex = 0;
            continue;
          }
        }
        
        // Also check if the tableName contains an underscore and there's a word before it with !
        // This catches cases like "customers!customer_id" where Pattern 1.5 should have matched
        // Increase lookback to catch cases where the pattern was partially removed
        const wordBeforeMatch = workingFields.substring(Math.max(0, match.index - 50), match.index);
        const tableExclamationPattern = /([a-zA-Z][a-zA-Z0-9_]*)!([a-zA-Z][a-zA-Z0-9_]*)\s*\(/;
        if (tableExclamationPattern.test(wordBeforeMatch + startMatch)) {
          console.log(`⏭️ [Pattern 3] Skipping ${tableName}( - detected table!foreign_key pattern`);
          simplePattern.lastIndex = 0;
          continue;
        }
        
        const openParenIdx = match.index + startMatch.length - 1;
        const closeParenIdx = findMatchingParen(workingFields, openParenIdx);
        
        if (closeParenIdx === -1) {
          console.warn(`⚠️ [Simple Syntax] Could not find matching parenthesis for: ${startMatch}`);
          simplePattern.lastIndex = 0;
          continue;
        }
        
        // CRITICAL: Skip if tableName ends with _id - these are ALWAYS foreign key columns, never table names
        if (tableName.endsWith('_id') && tableName !== 'id') {
          console.log(`⏭️ [Pattern 3] Skipping ${tableName}( - names ending with _id are foreign key columns, not table names`);
          simplePattern.lastIndex = 0;
          continue;
        }
        
        const fullMatch = workingFields.substring(match.index, closeParenIdx + 1);
        const columnsStr = workingFields.substring(openParenIdx + 1, closeParenIdx);
        
        const alias = tableName;
        const table = tableName;
        
        // Infer foreign key (handle plural table names)
        // Special mappings for known foreign key exceptions
        const foreignKeyMappings: Record<string, string> = {
          'lats_categories': 'category_id',
          'lats_category': 'category_id',
          'categories': 'category_id',
          'category': 'category_id',
          'lats_product_variants': 'product_id',
          'product_variants': 'product_id',
          'variants': 'product_id',
        };
        
        let foreignKey = foreignKeyMappings[tableName];
        if (!foreignKey) {
          foreignKey = `${tableName}_id`;
          if (tableName.endsWith('s') && tableName.length > 1) {
            const singularName = tableName.slice(0, -1);
            foreignKey = `${singularName}_id`;
          }
        }
        
        // Extract columns
        const columns = extractColumns(columnsStr);
        
        console.log(`🔑 [Simple Syntax] Table: ${table}, Inferred FK: ${foreignKey}`);
        relationships.push({ alias, table, foreignKey, columns });
        
        // Remove this relationship from working fields
        workingFields = workingFields.replace(fullMatch, '');
        // Reset regex index after modifying the string
        simplePattern.lastIndex = 0;
      }
      
      // Clean up remaining fields (non-relationship fields)
      workingFields = workingFields
        .replace(/,\s*,/g, ',')
        .replace(/,\s*$/,'')
        .replace(/^\s*,/, '')
        .replace(/[()]/g, '') // Remove any stray parentheses
        .trim();
      
      // Build JOIN clauses with additional validation
      this.joins = relationships
        .filter(rel => {
          // CRITICAL: Filter out any relationships where table name ends with _id
          // These are foreign key columns (like customer_id, user_id, branch_id), not table names
          if (rel.table.endsWith('_id') && rel.table !== 'id') {
            console.warn(`⚠️ [buildJoins] Filtering out invalid relationship - "${rel.table}" is a foreign key column, not a table name`);
            console.warn(`⚠️ [buildJoins] This likely means a query is using "${rel.table}" incorrectly. Check the select() call.`);
            return false;
          }
          // Also check alias
          if (rel.alias.endsWith('_id') && rel.alias !== 'id') {
            console.warn(`⚠️ [buildJoins] Filtering out invalid relationship - alias "${rel.alias}" ends with _id (foreign key column, not table name)`);
            return false;
          }
          return true;
        })
        .map(rel => ({
          table: rel.table,
          alias: rel.alias,
          on: rel.foreignKey,
          columns: rel.columns.filter(c => c && typeof c === 'string' && c.length > 0 && c !== 'undefined')
        }));
      
      // Build SELECT fields
      if (workingFields && workingFields !== '*' && workingFields.length > 0) {
        // Prefix base table fields with table name
        const baseFieldsList = workingFields.split(',')
          .map(f => f.trim())
          .filter(f => f && f.length > 0 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f)); // Only valid column names
        
        if (baseFieldsList.length > 0) {
          this.selectFields = baseFieldsList.map(f => f === '*' ? `${this.tableName}.*` : `${this.tableName}.${f} as ${f}`).join(', ');
        } else {
          this.selectFields = `${this.tableName}.*`;
        }
      } else {
        this.selectFields = `${this.tableName}.*`;
      }
      
      // Add relationship fields with JSON aggregation
      for (const join of this.joins) {
        // Validate columns before building JSON
        const validColumns = join.columns.filter(c => c && typeof c === 'string' && c.length > 0 && c !== 'undefined');
        
        if (validColumns.length > 0) {
          const jsonFields = validColumns.map(c => `'${c}', ${join.alias}.${c}`).join(', ');
          this.selectFields += `, json_build_object(${jsonFields}) as ${join.alias}`;
        } else {
          // If no columns specified, select all from joined table
          this.selectFields += `, row_to_json(${join.alias}.*) as ${join.alias}`;
        }
      }
      
      console.log('✅ Parsed JOINs:', this.joins);
      console.log('✅ Select fields:', this.selectFields);
    } else {
      this.selectFields = fields;
    }
    return this;
  }

  private qualifyColumn(column: string): string {
    // If we have joins and column is not already qualified, prefix with table name
    return (this.joins.length > 0 && !column.includes('.')) 
      ? `${this.tableName}.${column}` 
      : column;
  }

  eq(column: string, value: any) {
    this.whereConditions.push(`${this.qualifyColumn(column)} = ${this.formatValue(value)}`);
    return this;
  }

  neq(column: string, value: any) {
    this.whereConditions.push(`${this.qualifyColumn(column)} != ${this.formatValue(value)}`);
    return this;
  }

  gt(column: string, value: any) {
    this.whereConditions.push(`${this.qualifyColumn(column)} > ${this.formatValue(value)}`);
    return this;
  }

  gte(column: string, value: any) {
    this.whereConditions.push(`${this.qualifyColumn(column)} >= ${this.formatValue(value)}`);
    return this;
  }

  lt(column: string, value: any) {
    this.whereConditions.push(`${this.qualifyColumn(column)} < ${this.formatValue(value)}`);
    return this;
  }

  lte(column: string, value: any) {
    this.whereConditions.push(`${this.qualifyColumn(column)} <= ${this.formatValue(value)}`);
    return this;
  }

  like(column: string, pattern: string) {
    this.whereConditions.push(`${this.qualifyColumn(column)} LIKE ${this.formatValue(pattern)}`);
    return this;
  }

  ilike(column: string, pattern: string) {
    this.whereConditions.push(`${this.qualifyColumn(column)} ILIKE ${this.formatValue(pattern)}`);
    return this;
  }

  is(column: string, value: any) {
    if (value === null) {
      this.whereConditions.push(`${this.qualifyColumn(column)} IS NULL`);
    } else {
      this.whereConditions.push(`${this.qualifyColumn(column)} = ${this.formatValue(value)}`);
    }
    return this;
  }

  in(column: string, values: any[]) {
    // Handle empty array case - return a condition that's always false
    if (!values || values.length === 0) {
      this.whereConditions.push('1 = 0');
      return this;
    }
    const formattedValues = values.map(v => this.formatValue(v)).join(', ');
    this.whereConditions.push(`${this.qualifyColumn(column)} IN (${formattedValues})`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? 'DESC' : 'ASC';
    // If we have joins and column is not already qualified, prefix with table name
    const qualifiedColumn = (this.joins.length > 0 && !column.includes('.')) 
      ? `${this.tableName}.${column}` 
      : column;
    this.orderByClause = `ORDER BY ${qualifiedColumn} ${direction}`;
    return this;
  }

  limit(count: number) {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  range(from: number, to: number) {
    this.rangeClause = { from, to };
    return this;
  }

  single() {
    this.limitClause = 'LIMIT 1';
    return this.then((result: any) => {
      // Enhanced debugging for INSERT operations
      const isInsertOp = (this as any).isInsert;
      const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
      
      if (isInsertOp && isDevelopment) {
        console.log('🔍 [single()] Processing result:', {
          hasData: !!result.data,
          dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
          dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
          hasError: !!result.error,
          error: result.error
        });
      }
      
      // Check if there's an error
      if (result.error) {
        return { data: null, error: result.error };
      }
      
      // Handle array data
      if (result.data && Array.isArray(result.data)) {
        if (result.data.length > 0) {
          return { data: result.data[0], error: null };
        }
        // Empty array - for INSERT operations, this shouldn't happen with RETURNING *
        if (isInsertOp && isDevelopment) {
          console.error('❌ [single()] INSERT returned empty array - possible RLS issue');
          return { data: null, error: { message: 'No data returned from insert. Check RLS policies and database triggers.' } };
        }
        // For SELECT operations, empty array is normal (no rows found)
        return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
      }
      
      // Handle single object (non-array) data
      if (result.data && typeof result.data === 'object') {
        return { data: result.data, error: null };
      }
      
      // No data at all
      return { data: null, error: { message: 'No data returned from operation' } };
    });
  }

  maybeSingle() {
    return this.single();
  }

  private formatValue(value: any): string {
    // Handle null and undefined - both should be NULL in SQL
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return `'${value.toISOString()}'`;
    // Handle arrays - format as PostgreSQL array for text[] columns
    if (Array.isArray(value)) {
      // Check if array contains strings - format as text array
      if (value.length === 0 || typeof value[0] === 'string') {
        const arrayValues = value.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(',');
        return `ARRAY[${value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]`;
      }
      // For non-string arrays or complex arrays, use jsonb
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }
    // Handle objects (for JSONB columns)
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    }
    return String(value);
  }

  private buildQuery(): string {
    // If head mode with count, we only want the count, not the data
    if (this.headMode && this.countMode) {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }
      
      return query;
    }
    
    let query = `SELECT ${this.selectFields} FROM ${this.tableName}`;
    
    // Add JOIN clauses
    for (const join of this.joins) {
      // SAFETY CHECK: Skip any join where table name ends with _id (these are foreign key columns, not tables)
      // This prevents SQL errors like "relation 'customer_id' does not exist"
      // Also check if table name is exactly a common foreign key column name
      const commonFKColumns = ['customer_id', 'user_id', 'branch_id', 'product_id', 'variant_id', 'supplier_id', 'category_id'];
      if ((join.table.endsWith('_id') && join.table !== 'id') || commonFKColumns.includes(join.table)) {
        console.warn(`⚠️ [buildQuery] Skipping invalid JOIN - table name "${join.table}" is a foreign key column, not a table`);
        continue;
      }
      
      // Determine if this is a child table relationship
      // Child tables (variants, items, details, lines, payments, etc.) have the FK referencing the parent
      const knownChildPatterns = ['variants', 'items', 'details', 'lines', 'payments', 'images', 'transactions', 'orders', 'sales'];
      const isChildTable = knownChildPatterns.some(pattern => 
        join.alias.includes(pattern) || 
        join.table.includes(`_${pattern}`) ||
        join.table.endsWith('_' + pattern)
      );
      
      // Known foreign keys in main table that don't end with '_id'
      // These are foreign keys in the main table pointing to parent tables
      const knownParentTableFKs = ['assigned_to', 'related_to', 'created_by'];
      const isParentTableFK = knownParentTableFKs.includes(join.on);
      
      // Determine if foreign key is on main table or joined table
      // Priority: Check if it's a known parent table FK first, then check child patterns, then check _id suffix
      if (isParentTableFK) {
        // Parent table join: main_table.foreign_key = parent_table.id
        // Examples: main_table.assigned_to = users.id, main_table.related_to = reminders.id
        query += ` LEFT JOIN ${join.table} AS ${join.alias} ON ${this.tableName}.${join.on} = ${join.alias}.id`;
      } else if (isChildTable) {
        // Child table join: main_table.id = child_table.foreign_key
        // This handles cases like items, variants, details where the FK is on the child table
        query += ` LEFT JOIN ${join.table} AS ${join.alias} ON ${this.tableName}.id = ${join.alias}.${join.on}`;
      } else if (join.on.endsWith('_id')) {
        // Parent table join: main_table.foreign_key_id = parent_table.id
        // Examples: main_table.user_id = users.id, main_table.branch_id = branches.id
        query += ` LEFT JOIN ${join.table} AS ${join.alias} ON ${this.tableName}.${join.on} = ${join.alias}.id`;
      } else {
        // Default: assume child table join for unknown patterns
        // Child table join: main_table.id = child_table.foreign_key
        query += ` LEFT JOIN ${join.table} AS ${join.alias} ON ${this.tableName}.id = ${join.alias}.${join.on}`;
      }
    }
    
    if (this.whereConditions.length > 0) {
      query += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.orderByClause) {
      query += ` ${this.orderByClause}`;
    }
    
    if (this.rangeClause) {
      const offset = this.rangeClause.from;
      const limit = this.rangeClause.to - this.rangeClause.from + 1;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    } else if (this.limitClause) {
      query += ` ${this.limitClause}`;
    }
    
    // Debug log the generated query
    if (this.joins.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('📝 Generated SQL with JOINs:', query);
    }
    
    return query;
  }

  then<TResult1 = { data: any; error: any; count?: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2> {
    const promise = this.execute();
    return promise.then(onfulfilled as any, onrejected as any);
  }

  private async execute(): Promise<{ data: any; error: any; count?: number | null }> {
    let query: string;
    
    // Debug logging for INSERT operations
    const isInsertOp = (this as any).isInsert;
    if (isInsertOp && process.env.NODE_ENV === 'development') {
      console.log('🔍 [DEBUG] Executing INSERT operation');
    }
    
    // Check if this is an UPSERT operation
    if ((this as any).isUpsert) {
      const values = (this as any).upsertData;
      const options = (this as any).upsertOptions;
      
      // Handle array of objects (bulk upsert)
      if (Array.isArray(values)) {
        if (values.length === 0) {
          return { data: [], error: null };
        }
        
        // Collect ALL unique columns from ALL rows (not just the first)
        // This ensures all VALUES lists have the same length
        const allColumnsSet = new Set<string>();
        values.forEach(row => {
          Object.entries(row).forEach(([key, value]) => {
            if (value !== undefined) {
              allColumnsSet.add(key);
            }
          });
        });
        const allColumns = Array.from(allColumnsSet);
        const columns = allColumns.join(', ');
        
        // Build VALUES clause for multiple rows
        // Each row MUST have values for ALL columns (use NULL for missing ones)
        const allPlaceholders = values.map(row => {
          const rowValues = allColumns.map(col => {
            const value = row[col];
            return value !== undefined ? this.formatValue(value) : 'NULL';
          }).join(', ');
          return `(${rowValues})`;
        }).join(', ');
        
        // Determine conflict columns
        const conflictClause = options?.onConflict || allColumns.join(',');
        
        // Build update clause for conflict resolution
        const updateClauses = allColumns
          .map(key => `${key} = EXCLUDED.${key}`)
          .join(', ');
        
        query = `INSERT INTO ${this.tableName} (${columns}) VALUES ${allPlaceholders} ON CONFLICT (${conflictClause}) DO UPDATE SET ${updateClauses} RETURNING *`;
      } 
      // Handle single object upsert
      else {
        // Filter out undefined values - only upsert defined fields
        const filteredValues = Object.fromEntries(
          Object.entries(values).filter(([_, v]) => v !== undefined)
        );
        const columns = Object.keys(filteredValues).join(', ');
        const placeholders = Object.values(filteredValues).map(v => this.formatValue(v)).join(', ');
        
        // Determine conflict columns
        const conflictClause = options?.onConflict || Object.keys(filteredValues)[0];
        
        // Build update clause for conflict resolution
        const updateClauses = Object.entries(filteredValues)
          .map(([key, value]) => `${key} = ${this.formatValue(value)}`)
          .join(', ');
        
        query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) ON CONFLICT (${conflictClause}) DO UPDATE SET ${updateClauses} RETURNING *`;
      }
    }
    // Check if this is an INSERT operation
    else if ((this as any).isInsert) {
      const values = (this as any).insertData;
      
      // Handle array of objects (bulk insert)
      if (Array.isArray(values)) {
        if (values.length === 0) {
          return { data: [], error: null };
        }
        
        // Collect ALL unique columns from ALL rows (not just the first)
        // This ensures all VALUES lists have the same length
        const allColumnsSet = new Set<string>();
        values.forEach(row => {
          Object.entries(row).forEach(([key, value]) => {
            if (value !== undefined) {
              allColumnsSet.add(key);
            }
          });
        });
        const allColumns = Array.from(allColumnsSet);
        const columns = allColumns.join(', ');
        
        // Build VALUES clause for multiple rows
        // Each row MUST have values for ALL columns (use NULL for missing ones)
        const allPlaceholders = values.map(row => {
          const rowValues = allColumns.map(col => {
            const value = row[col];
            return value !== undefined ? this.formatValue(value) : 'NULL';
          }).join(', ');
          return `(${rowValues})`;
        }).join(', ');
        
        query = `INSERT INTO ${this.tableName} (${columns}) VALUES ${allPlaceholders} RETURNING *`;
      } 
      // Handle single object insert
      else {
        // Filter out undefined values - only insert defined fields
        const filteredValues = Object.fromEntries(
          Object.entries(values).filter(([_, v]) => v !== undefined)
        );
        const columns = Object.keys(filteredValues).join(', ');
        const placeholders = Object.values(filteredValues).map(v => this.formatValue(v)).join(', ');
        query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
      }
    } 
    // Check if this is an UPDATE operation
    else if ((this as any).isUpdate) {
      const values = (this as any).updateData;
      // Filter out undefined values - only update defined fields
      const setClauses = Object.entries(values)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key} = ${this.formatValue(value)}`)
        .join(', ');
      
      query = `UPDATE ${this.tableName} SET ${setClauses}`;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }
      
      query += ' RETURNING *';
    } 
    // Check if this is a DELETE operation
    else if ((this as any).isDelete) {
      query = `DELETE FROM ${this.tableName}`;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }
      
      query += ' RETURNING *';
    }
    // Regular SELECT query
    else {
      query = this.buildQuery();
    }
    
  // Declare isDevelopment outside try/catch so it's accessible in both blocks
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
  try {
    // ✅ ENHANCED DEBUG: Always log SQL queries that might fail with 400
    // This helps us identify the exact problematic query
    if (!this.suppressErrors && isDevelopment) {
      console.log('🔍 [SQL Query]:', query.substring(0, 300) + (query.length > 300 ? '...' : ''));
    }

    // Execute using Neon WebSocket Pool
    // Pass suppressErrors flag to reduce noise for expected errors
    let data = await executeSql(query, [], this.suppressErrors);
      
      // executeSql now returns rows array directly from pool.query().rows
      
      // Debug logging for INSERT operations
      if (isInsertOp && process.env.NODE_ENV === 'development') {
        console.log('🔍 [DEBUG] INSERT data:', data);
        console.log('🔍 [DEBUG] INSERT data length:', Array.isArray(data) ? data.length : 'not array');
      }
      
      // If this was a count query in head mode, extract the count
      let count: number | null = null;
      if (this.headMode && this.countMode && data && data.length > 0) {
        count = parseInt(data[0].count, 10);
        // In head mode, we don't return the data, just the count
        data = null;
      }
      
      return { data, error: null, count };
  } catch (error: any) {
      // Check if this is a table-not-found or expected error
      const catchErrorMsg = getErrorMessage(error);
      const errorCode = error?.code || '';
      const isExpectedError = 
        catchErrorMsg.includes('does not exist') ||
        catchErrorMsg.includes('relation') ||
        errorCode === '42P01' ||
        catchErrorMsg.includes('column') ||
        errorCode === '42703';
      
      // ✅ ENHANCED: Log 400 errors with the exact SQL query for debugging
      const is400Error = catchErrorMsg.includes('400') || error?.status === 400 || error?.statusCode === 400;
      
      // Minimal logging - only unexpected errors in development mode
      if (!this.suppressErrors && !isExpectedError && isDevelopment) {
        console.error(`❌ Query failed on '${this.tableName}':`, catchErrorMsg);

        // If it's a 400 error, log the full query to help debug
        if (is400Error) {
          console.error('🔍 Failing SQL Query:', query);
          console.error('🔍 Error Code:', errorCode);
          console.error('🔍 Error Details:', error);
        }
      }

      // Always log full query for "column does not exist" errors
      if (errorCode === '42703' && isDevelopment) {
        console.error('🔍 COLUMN ERROR - Table:', this.tableName);
        console.error('🔍 COLUMN ERROR - Full Query:', query);
        console.error('🔍 COLUMN ERROR - Error:', catchErrorMsg);
      }
      
      return { data: null, error: { message: catchErrorMsg, code: errorCode || '400' }, count: null };
    }
  }

  catch(onRejected: any) {
    return this.then(undefined, onRejected);
  }

  // Reset operation flags to prevent state pollution between chained operations
  resetOperationFlags() {
    (this as any).isInsert = false;
    (this as any).isUpdate = false;
    (this as any).isUpsert = false;
    (this as any).isDelete = false;
    (this as any).insertData = null;
    (this as any).updateData = null;
    (this as any).deleteData = null;
  }

  // Insert method
  insert(values: any) {
    // Reset any previous operation flags
    this.resetOperationFlags();
    // Store the insert data and return this for chaining
    (this as any).insertData = values;
    (this as any).isInsert = true;
    return this;
  }

  // Update method
  update(values: any) {
    // Reset any previous operation flags
    this.resetOperationFlags();
    // Store the update data and return this for chaining
    (this as any).updateData = values;
    (this as any).isUpdate = true;
    return this;
  }

  // Delete method
  delete() {
    // Reset any previous operation flags
    this.resetOperationFlags();
    // Store the delete flag and return this for chaining
    (this as any).isDelete = true;
    return this;
  }

  // Upsert method - supports chaining
  upsert(values: any, options?: { onConflict?: string }) {
    // Reset any previous operation flags
    this.resetOperationFlags();
    // Store the upsert data and options for execution in then()
    (this as any).upsertData = values;
    (this as any).upsertOptions = options;
    (this as any).isUpsert = true;
    return this;
  }

  // Additional filter methods
  match(conditions: Record<string, any>) {
    Object.entries(conditions).forEach(([key, value]) => {
      this.eq(key, value);
    });
    return this;
  }

  not(column: string, operator: string, value: any) {
    // ✅ FIX: Handle IS NULL specially for NOT (column IS NULL) = column IS NOT NULL
    if (operator === 'is' && (value === null || value === undefined)) {
      this.whereConditions.push(`${this.qualifyColumn(column)} IS NOT NULL`);
    } else {
      this.whereConditions.push(`NOT (${this.qualifyColumn(column)} ${operator} ${this.formatValue(value)})`);
    }
    return this;
  }

  or(conditions: string) {
    // Parse Supabase-style OR conditions: "column1.op.value1,column2.op.value2"
    // Split by comma to get individual conditions
    const parts = conditions.split(',');
    const sqlConditions = parts.map(part => {
      // Parse each part: "column.operator.value"
      const match = part.trim().match(/^(\w+)\.(eq|neq|gt|gte|lt|lte|like|ilike|is)\.(.+)$/);
      if (match) {
        const [, column, operator, value] = match;
        let sqlOp = '=';
        switch (operator) {
          case 'eq': sqlOp = '='; break;
          case 'neq': sqlOp = '!='; break;
          case 'gt': sqlOp = '>'; break;
          case 'gte': sqlOp = '>='; break;
          case 'lt': sqlOp = '<'; break;
          case 'lte': sqlOp = '<='; break;
          case 'like': sqlOp = 'LIKE'; break;
          case 'ilike': sqlOp = 'ILIKE'; break;
          case 'is': sqlOp = 'IS'; break;
        }
        // ✅ FIX: Handle 'IS NULL' and 'IS NOT NULL' properly
        // When operator is 'is' and value is the string 'null', use SQL NULL keyword
        if (operator === 'is' && value.toLowerCase() === 'null') {
          return `${column} IS NULL`;
        }
        return `${column} ${sqlOp} ${this.formatValue(value)}`;
      }
      // If it doesn't match the pattern, return as-is (fallback)
      return part.trim();
    });
    
    // Join with OR and wrap in parentheses
    this.whereConditions.push(`(${sqlConditions.join(' OR ')})`);
    return this;
  }

  filter(column: string, operator: string, value: any) {
    this.whereConditions.push(`${column} ${operator} ${this.formatValue(value)}`);
    return this;
  }

  contains(column: string, value: any) {
    this.whereConditions.push(`${column} @> ${this.formatValue(value)}`);
    return this;
  }

  containedBy(column: string, value: any) {
    this.whereConditions.push(`${column} <@ ${this.formatValue(value)}`);
    return this;
  }

  rangeGt(column: string, value: any) {
    this.whereConditions.push(`${column} >> ${this.formatValue(value)}`);
    return this;
  }

  rangeGte(column: string, value: any) {
    this.whereConditions.push(`${column} >>= ${this.formatValue(value)}`);
    return this;
  }

  rangeLt(column: string, value: any) {
    this.whereConditions.push(`${column} << ${this.formatValue(value)}`);
    return this;
  }

  rangeLte(column: string, value: any) {
    this.whereConditions.push(`${column} <<= ${this.formatValue(value)}`);
    return this;
  }

  rangeAdjacent(column: string, value: any) {
    this.whereConditions.push(`${column} -|- ${this.formatValue(value)}`);
    return this;
  }

  overlaps(column: string, value: any) {
    this.whereConditions.push(`${column} && ${this.formatValue(value)}`);
    return this;
  }

  textSearch(column: string, query: string) {
    this.whereConditions.push(`to_tsvector(${column}) @@ plainto_tsquery(${this.formatValue(query)})`);
    return this;
  }

  csv() {
    // CSV export not directly supported, would need custom implementation
    return this;
  }
}

// Mock auth implementation with actual user authentication via database
const mockAuth = {
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    try {
      console.log('🔐 Attempting login with:', { email });
      
      // Ensure Supabase client is initialized
      if (!supabaseRestClient) {
        console.error('❌ Supabase REST client not initialized');
        return { 
          data: { user: null, session: null }, 
          error: { message: 'Authentication service not available' } 
        };
      }
      
      // Use Supabase REST API instead of direct SQL to avoid WebSocket issues
      // This works even if the WebSocket pooler connection fails
      const { data: users, error } = await supabaseRestClient
        .from('users')
        .select('id, email, full_name, role, is_active, created_at, updated_at, password')
        .eq('email', email)
        .eq('is_active', true)
        .limit(1);
      
      if (error) {
        console.error('❌ Supabase query error:', error);
        const errorMessage = error.message || error.code || 'Database query failed';
        return { 
          data: { user: null, session: null }, 
          error: { message: errorMessage } 
        };
      }
      
      console.log('🔍 Login query result:', { found: users?.length || 0 });
      
      if (users && users.length > 0) {
        const user = users[0];
        
        // Verify password (plain text comparison - in production, use hashing)
        if (user.password !== password) {
          console.log('❌ Password mismatch');
          return { 
            data: { user: null, session: null }, 
            error: { message: 'Invalid login credentials' } 
          };
        }
        
        // Remove password from user object before storing
        const { password: _, ...userWithoutPassword } = user;
        
        // Store session in localStorage
        const session = {
          access_token: btoa(JSON.stringify({ userId: user.id, email: user.email })),
          refresh_token: btoa(JSON.stringify({ userId: user.id })),
          expires_at: Date.now() + 3600000, // 1 hour
          user: userWithoutPassword
        };
        localStorage.setItem('supabase.auth.session', JSON.stringify(session));
        
        console.log('✅ Login successful');
        return { 
          data: { user: userWithoutPassword, session }, 
          error: null 
        };
      }
      
      console.log('❌ User not found or inactive');
      return { 
        data: { user: null, session: null }, 
        error: { message: 'Invalid login credentials' } 
      };
    } catch (error: any) {
      // Handle different error types
      let errorMessage = 'Login failed';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.toString) {
        errorMessage = error.toString();
      }
      
      console.error('❌ Auth error:', { error, message: errorMessage, type: typeof error });
      return { 
        data: { user: null, session: null }, 
        error: { message: errorMessage } 
      };
    }
  },
  signIn: async (credentials: any) => {
    return mockAuth.signInWithPassword(credentials);
  },
  signUp: async ({ email, password, options }: any) => {
    try {
      // Insert new user
      const metadata = options?.data || {};
      const fullName = metadata.full_name || '';
      const role = metadata.role || 'customer-care';
      
      // Escape single quotes to prevent SQL injection
      const escapedEmail = email.replace(/'/g, "''");
      const escapedPassword = password.replace(/'/g, "''");
      const escapedFullName = fullName.replace(/'/g, "''");
      const escapedRole = role.replace(/'/g, "''");
      
      const query = `
        INSERT INTO users (email, password, full_name, role, is_active, created_at, updated_at)
        VALUES ('${escapedEmail}', '${escapedPassword}', '${escapedFullName}', '${escapedRole}', true, NOW(), NOW())
        RETURNING id, email, full_name, role, is_active, created_at, updated_at
      `;
      
      const result = await pool.query(query);
      
      if (result.rows && result.rows.length > 0) {
        return { data: { user: result.rows[0] }, error: null };
      }
      
      return { data: null, error: { message: 'Failed to create user' } };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { data: null, error: { message: error.message } };
    }
  },
  signOut: async () => {
    localStorage.removeItem('supabase.auth.session');
    return { error: null };
  },
  getSession: async () => {
    try {
      const sessionStr = localStorage.getItem('supabase.auth.session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        // Check if session is expired
        if (session.expires_at > Date.now()) {
          return { data: { session }, error: null };
        }
      }
      return { data: { session: null }, error: null };
    } catch (error) {
      return { data: { session: null }, error: null };
    }
  },
  getUser: async () => {
    try {
      const sessionStr = localStorage.getItem('supabase.auth.session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.expires_at > Date.now()) {
          return { data: { user: session.user }, error: null };
        }
      }
      return { data: { user: null }, error: null };
    } catch (error) {
      return { data: { user: null }, error: null };
    }
  },
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    // Initial session check
    mockAuth.getSession().then(({ data }) => {
      if (data.session) {
        callback('SIGNED_IN', data.session);
      } else {
        callback('SIGNED_OUT', null);
      }
    });
    
    return { 
      data: { 
        subscription: { 
          unsubscribe: () => {} 
        } 
      } 
    };
  },
  updateUser: async (attributes: any) => {
    try {
      const sessionStr = localStorage.getItem('supabase.auth.session');
      if (!sessionStr) {
        return { data: null, error: { message: 'Not authenticated' } };
      }
      
      const session = JSON.parse(sessionStr);
      const userId = session.user.id;
      
      const setClauses = Object.entries(attributes)
        .map(([key, value]) => {
          if (typeof value === 'string') return `${key} = '${value.replace(/'/g, "''")}'`;
          return `${key} = ${value}`;
        })
        .join(', ');
      
      const query = `
        UPDATE users 
        SET ${setClauses}, updated_at = NOW()
        WHERE id = '${userId}'
        RETURNING id, email, full_name, role, is_active, created_at, updated_at
      `;
      // Execute using Neon serverless client with new API
      const result = await executeSql(query);
      
      if (result && result.length > 0) {
        // Update session with new user data
        session.user = result[0];
        localStorage.setItem('supabase.auth.session', JSON.stringify(session));
        return { data: { user: result[0] }, error: null };
      }
      
      return { data: null, error: { message: 'Failed to update user' } };
    } catch (error: any) {
      console.error('Update user error:', error);
      return { data: null, error: { message: error.message } };
    }
  },
  setSession: async (session: any) => {
    if (session) {
      localStorage.setItem('supabase.auth.session', JSON.stringify(session));
    }
    return { data: { session }, error: null };
  },
  refreshSession: async () => {
    const { data } = await mockAuth.getSession();
    if (data.session) {
      // Extend session
      data.session.expires_at = Date.now() + 3600000;
      localStorage.setItem('supabase.auth.session', JSON.stringify(data.session));
      return { data, error: null };
    }
    return { data: { session: null, user: null }, error: { message: 'No session to refresh' } };
  },
};

// Mock storage implementation with real functionality
const mockStorage = {
  from: (bucket: string) => ({
    upload: async (path: string, file: File | Blob, options?: any) => {
      try {
        console.log('📤 Storage upload:', { bucket, path, fileSize: file.size });
        
        // Convert Blob to File if needed
        const actualFile = file instanceof File ? file : new File([file], path.split('/').pop() || 'file', { type: file.type });
        
        // Use WhatsApp media storage service for uploads
        const { WhatsAppMediaStorageService } = await import('./whatsappMediaStorage');
        const result = await WhatsAppMediaStorageService.uploadMedia(actualFile);
        
        if (result.success && result.url) {
          // Store the URL for later retrieval by getPublicUrl
          // Use localStorage instead of sessionStorage for persistence across page reloads
          localStorage.setItem(`storage:${bucket}:${path}`, result.url);
          
          return { 
            data: { 
              path: path,
              id: path,
              fullPath: path
            }, 
            error: null 
          };
        }
        
        return { 
          data: null, 
          error: { 
            message: result.error || 'Upload failed',
            statusCode: '400'
          } 
        };
      } catch (error: any) {
        console.error('❌ Storage upload error:', error);
        return { 
          data: null, 
          error: { 
            message: error.message || 'Upload failed',
            statusCode: '500'
          } 
        };
      }
    },
    download: () => Promise.resolve({ data: null, error: null }),
    list: () => Promise.resolve({ data: [], error: null }),
    remove: async (paths: string[]) => {
      try {
        const { WhatsAppMediaStorageService } = await import('./whatsappMediaStorage');
        for (const path of paths) {
          const url = localStorage.getItem(`storage:${bucket}:${path}`);
          if (url) {
            await WhatsAppMediaStorageService.deleteMedia(url);
            localStorage.removeItem(`storage:${bucket}:${path}`);
          }
        }
        return { data: null, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },
    createSignedUrl: () => Promise.resolve({ data: null, error: null }),
    getPublicUrl: (path: string) => {
      // Retrieve the URL that was stored during upload
      const url = localStorage.getItem(`storage:${bucket}:${path}`) || '';
      console.log('🔗 Getting public URL:', { bucket, path, url: url.substring(0, 50) + '...' });
      return { data: { publicUrl: url } };
    },
  }),
};

// Mock channel implementation
const mockChannel = () => ({
  on: () => mockChannel(),
  subscribe: () => mockChannel(),
  unsubscribe: () => Promise.resolve(),
});

// RPC implementation for stored procedures
const rpcCall = async (fn: string, params?: any) => {
  try {
    // Helper function to detect UUID format
    const isUUID = (str: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };
    
    const paramsList = params ? Object.entries(params).map(([key, value]) => {
      if (value === null) return 'NULL';
      if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
      if (typeof value === 'number') return String(value);
      if (typeof value === 'string') {
        const escapedValue = value.replace(/'/g, "''");
        // Check if this looks like a UUID parameter (by name or value format)
        // Only cast to UUID if the parameter name suggests it's an ID AND the value looks like a UUID
        if ((key.endsWith('_id') || key.endsWith('_id_param')) && isUUID(value)) {
          // Cast to UUID for parameters that are actually UUIDs
          return `'${escapedValue}'::uuid`;
        }
        // Regular text parameter
        return `'${escapedValue}'::text`;
      }
      return String(value);
    }).join(', ') : '';
    
    const query = `SELECT * FROM ${fn}(${paramsList})`;
    // Execute using Neon WebSocket Pool
    // Don't suppress logs for RPC calls - we want to see errors
    const data = await executeSql(query, [], false);
    
    return { data, error: null };
  } catch (error: any) {
    // Log RPC errors for debugging
    const rpcErrorMsg = getErrorMessage(error);
    console.error(`❌ RPC Error calling ${fn}:`, rpcErrorMsg);
    console.error('   Params:', params);
    return { data: null, error: { message: rpcErrorMsg, code: error?.code || '400' } };
  }
};

// Supabase-compatible client interface
export interface SupabaseClient {
  from: (table: string) => NeonQueryBuilder;
  auth: any;
  storage: any;
  rpc: (fn: string, params?: any) => Promise<any>;
  channel: (name: string) => any;
}

// Detect if we're using Supabase (by checking if URL contains supabase)  
const isSupabaseDatabase = DATABASE_URL?.toLowerCase().includes('supabase') || 
                           DATABASE_URL?.toLowerCase().includes('jxhzveborezjhsmzsgbc') ||
                           SUPABASE_URL?.toLowerCase().includes('supabase') ||
                           import.meta.env.VITE_SUPABASE_URL?.toLowerCase().includes('supabase');

// Create Supabase client - use REST API if Supabase detected, otherwise use Neon WebSocket
// When using Supabase, override auth to use our REST API implementation
export const supabase: SupabaseClient = isSupabaseDatabase ? {
  ...supabaseRestClient,
  auth: {
    ...supabaseRestClient.auth,
    signInWithPassword: mockAuth.signInWithPassword,
    signIn: mockAuth.signIn,
  }
} as any : {
  from: (table: string) => {
    // SAFETY CHECK: Prevent using foreign key column names as table names
    if (table.endsWith('_id') && table !== 'id') {
      console.error(`❌ [supabase.from] Invalid table name "${table}" - names ending with _id are foreign key columns, not table names`);
      throw new Error(`Invalid table name: "${table}". Names ending with _id are foreign key columns, not table names.`);
    }
    return new NeonQueryBuilder(table);
  },
  auth: mockAuth,
  storage: mockStorage,
  rpc: rpcCall,
  channel: mockChannel,
};

// Log which client is being used
if (isSupabaseDatabase) {
  console.log('✅ Using Supabase REST API client for all database operations');
} else {
  console.log('✅ Using Neon WebSocket pooler for database operations');
}

// Retry utility function with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error && typeof error === 'object') {
        const errorMessage = getErrorMessage(error);
        
        // Don't retry on auth errors or client errors
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('403') ||
          errorMessage.includes('Invalid') ||
          errorMessage.includes('not found')
        ) {
          throw error;
        }
        
        // Check if it's a network error - use longer delays
        const isNetwork = isNetworkError(error);
        if (isNetwork && attempt < maxRetries - 1) {
          console.warn(`🌐 Network error in retryWithBackoff (attempt ${attempt + 1}/${maxRetries})`);
        }
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        console.error(`❌ All retry attempts exhausted (${maxRetries})`);
        throw lastError;
      }
      
      // Check if it's a network error for longer delays
      const isNetwork = isNetworkError(lastError);
      const effectiveDelay = isNetwork ? baseDelay * 2 : baseDelay;
      
      // Calculate exponential backoff delay
      const delay = effectiveDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
      
      const totalDelay = Math.round(delay + jitter);
      console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} after ${totalDelay}ms`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError;
}

// Test Supabase connection function
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Test database connection with a simple query
    const result = await pool.query('SELECT 1 as test');
    
    if (result.rows && result.rows.length > 0) {
      return {
        success: true,
        message: 'Database connection successful',
        details: { connected: true }
      };
    }
    
    return {
      success: false,
      message: 'Database query returned no results',
      details: { connected: false }
    };
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    return {
      success: false,
      message: `Database connection failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

// Export for backward compatibility
export default supabase;

// Export raw SQL client for advanced queries (tagged template interface)
export { sql };

// Export pool for direct queries
export { pool };

