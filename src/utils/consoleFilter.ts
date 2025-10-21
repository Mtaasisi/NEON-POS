/**
 * Console Filter Utility
 * 
 * Filters out noisy console logs in production and reduces debug spam in development.
 * This helps keep the console clean and focused on actual issues.
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  debug: console.debug,
};

// Patterns to suppress (even in development)
const SUPPRESS_PATTERNS = [
  // Audio context warnings (handled gracefully in code)
  /AudioContext.*not allowed to start/i,
  /AudioContext.*user gesture/i,
  
  // Neon transient 400 errors (automatically retried)
  /POST.*neon\.tech.*400/i,
  
  // Auth state changes (noisy)
  /^Auth state changed:/,
  
  // PaymentMethodsContext logs
  /PaymentMethodsContext.*Starting/i,
  /PaymentMethodsContext.*Loaded/i,
  /Payment methods refreshed/i,
  
  // FinanceAccountService logs  
  /FinanceAccountService.*Fetching/i,
  /FinanceAccountService.*Supabase/i,
  /FinanceAccountService.*Query result/i,
  /FinanceAccountService.*Fetched/i,
  /FinanceAccountService.*First method/i,
  
  // Sales and POS logs
  /Using deduplicated.*query/i,
  /━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━/,
  /FETCHING SALES/i,
  /Current Branch:/,
  /Branch Name:/,
  /APPLYING BRANCH FILTER/i,
  /Filter: branch_id/,
  /SALES RETURNED:/i,
  /SAMPLE SALES/i,
  /SALE-.*TZS/,
  /Loaded.*POS sales/i,
  /Active session found/i,
  
  // Debug noise patterns
  /^\[Analytics\]/,
  /^🔍 \[.*\]/,
  /^✅ \[.*\]/,
  /^📍 \[SimpleBranchSelector\]/,
  /^🏪 Loading branches/,
  /^ℹ️ \[EnhancedInventoryTab\]/,
  /^⏳ Suppliers/,
  /^💰 \[LiveInventoryService\]/,
  /^🔍 \[formatCurrency\]/,
  /^🔍 \[PurchaseOrdersPage\]/,
  /^📱 System view mode/,
  /^🔧 Device Detection/,
  /^🚀 \[POS\]/,
  /^📊 Session started/,
  /^🔄 Starting supplier/,
  /^✅ Using cached/,
  /^✅ Branches loaded/,
  /^✅ Products loaded/,
];

// All emoji-prefixed logs (catch-all)
const EMOJI_PATTERN = /^[\u{1F300}-\u{1F9FF}]/u;

// Development-only patterns (suppressed only in production)
const DEV_ONLY_PATTERNS = [
  /^🔍/,
  /^✅/,
  /^📊/,
  /^🚀/,
  /^ℹ️/,
  /^⏳/,
  /^💰/,
  /^📱/,
  /^🔧/,
  /^📍/,
  /^🏪/,
  /^🔄/,
  /^📋/,
  /^🔒/,
];

/**
 * Check if a message should be suppressed
 */
function shouldSuppress(message: string, isProduction: boolean): boolean {
  // Check for DEBUG_MODE override
  if (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_MODE') === 'true') {
    return false; // Don't suppress anything in debug mode
  }
  
  // Always suppress certain patterns
  for (const pattern of SUPPRESS_PATTERNS) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  // Always suppress emoji-prefixed logs (catch-all for missed patterns)
  if (EMOJI_PATTERN.test(message)) {
    return true;
  }
  
  // Suppress dev-only patterns in production
  if (isProduction) {
    for (const pattern of DEV_ONLY_PATTERNS) {
      if (pattern.test(message)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Filter console messages
 */
function filterConsoleMethod(
  method: 'log' | 'info' | 'warn' | 'debug',
  ...args: any[]
): void {
  const isProduction = import.meta.env.PROD;
  
  // Convert args to string for pattern matching
  let message = '';
  if (args.length > 0) {
    // Handle different types of arguments
    message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'number') return String(arg);
      if (typeof arg === 'object') return JSON.stringify(arg);
      return String(arg);
    }).join(' ');
  }
  
  if (!shouldSuppress(message, isProduction)) {
    originalConsole[method](...args);
  }
}

/**
 * Initialize console filtering
 */
export function initConsoleFilter() {
  // Only filter in browser environment
  if (typeof window === 'undefined') return;
  
  console.log = (...args) => filterConsoleMethod('log', ...args);
  console.info = (...args) => filterConsoleMethod('info', ...args);
  console.warn = (...args) => filterConsoleMethod('warn', ...args);
  console.debug = (...args) => filterConsoleMethod('debug', ...args);
  
  // Special handling for console.error to filter network errors
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Suppress Neon 400 errors from network stack
    if (message.includes('neon.tech') && (message.includes('400') || message.includes('Bad Request'))) {
      return; // Silent suppression - these are handled by retry logic
    }
    
    // Allow all other errors through
    originalError(...args);
  };
}

/**
 * Restore original console methods (for testing)
 */
export function restoreConsole() {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.debug = originalConsole.debug;
}

// Auto-initialize if not in test environment
if (import.meta.env.MODE !== 'test') {
  // Initialize immediately
  initConsoleFilter();
  
  // Log that filter is active (using original console before it's wrapped)
  originalConsole.log('✅ Console filter initialized - debug logs will be suppressed');
  
  // Also suppress network errors logged to console
  if (typeof window !== 'undefined') {
    // Create a global error event listener to suppress Neon 400s
    window.addEventListener('error', (event) => {
      if (event.message && (
        event.message.includes('neon.tech') || 
        event.message.includes('400') ||
        event.message.includes('Bad Request')
      )) {
        event.preventDefault();
        return false;
      }
    }, true);
    
    // Suppress unhandledrejection for Neon errors
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && typeof event.reason === 'object') {
        const message = JSON.stringify(event.reason);
        if (message.includes('neon.tech') && message.includes('400')) {
          event.preventDefault();
          return false;
        }
      }
    });
  }
}

