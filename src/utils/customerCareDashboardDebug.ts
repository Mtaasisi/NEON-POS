/**
 * Customer Care Dashboard Debug Utility
 * 
 * This utility provides comprehensive debugging information for the Customer Care Dashboard
 * to help diagnose data fetching issues.
 * 
 * Usage in browser console:
 * 1. Import this file in your CustomerCareDashboardPage
 * 2. Call window.debugCustomerCareDashboard() in the browser console
 */

import { supabase } from '../lib/supabaseClient';

export interface DashboardDebugInfo {
  timestamp: string;
  user: {
    authenticated: boolean;
    userId?: string;
    email?: string;
    role?: string;
  };
  network: {
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  database: {
    connected: boolean;
    supabaseUrl?: string;
    error?: string;
  };
  tables: {
    devices?: { count: number; error?: string };
    customers?: { count: number; error?: string };
    lats_sales?: { count: number; error?: string };
    diagnostic_requests?: { count: number; error?: string };
  };
  contexts: {
    devicesContext: boolean;
    customersContext: boolean;
    userGoalsContext: boolean;
  };
  cache: {
    hasCache: boolean;
    cacheSize?: number;
  };
}

/**
 * Check network status and connection quality
 */
function getNetworkInfo() {
  const info: any = {
    online: navigator.onLine
  };

  // Check for Network Information API
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      info.effectiveType = connection.effectiveType;
      info.downlink = connection.downlink;
      info.rtt = connection.rtt;
      info.saveData = connection.saveData;
    }
  }

  return info;
}

/**
 * Test database connectivity and fetch counts from key tables
 */
async function testDatabaseConnection(): Promise<DashboardDebugInfo['database'] & DashboardDebugInfo['tables']> {
  const result: any = {
    database: { connected: false },
    tables: {}
  };

  try {
    // Test basic connection
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      result.database.error = sessionError.message;
      return result;
    }

    result.database.connected = true;
    result.database.supabaseUrl = supabase['supabaseUrl'] || 'Unknown';

    // Test devices table
    try {
      const { count, error } = await supabase
        .from('devices')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        result.tables.devices = { count: 0, error: error.message };
      } else {
        result.tables.devices = { count: count || 0 };
      }
    } catch (err) {
      result.tables.devices = { count: 0, error: String(err) };
    }

    // Test customers table
    try {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        result.tables.customers = { count: 0, error: error.message };
      } else {
        result.tables.customers = { count: count || 0 };
      }
    } catch (err) {
      result.tables.customers = { count: 0, error: String(err) };
    }

    // Test lats_sales table
    try {
      const { count, error } = await supabase
        .from('lats_sales')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        result.tables.lats_sales = { count: 0, error: error.message };
      } else {
        result.tables.lats_sales = { count: count || 0 };
      }
    } catch (err) {
      result.tables.lats_sales = { count: 0, error: String(err) };
    }

    // Test diagnostic_requests table
    try {
      const { count, error } = await supabase
        .from('diagnostic_requests')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        result.tables.diagnostic_requests = { count: 0, error: error.message };
      } else {
        result.tables.diagnostic_requests = { count: count || 0 };
      }
    } catch (err) {
      result.tables.diagnostic_requests = { count: 0, error: String(err) };
    }

  } catch (err) {
    result.database.error = String(err);
  }

  return result;
}

/**
 * Get current user information
 */
async function getUserInfo() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return {
        authenticated: false
      };
    }

    return {
      authenticated: true,
      userId: session.user?.id,
      email: session.user?.email,
      role: session.user?.user_metadata?.role || 'Unknown'
    };
  } catch (err) {
    return {
      authenticated: false,
      error: String(err)
    };
  }
}

/**
 * Main debug function
 */
export async function debugCustomerCareDashboard(): Promise<DashboardDebugInfo> {
  console.log('🔍 Starting Customer Care Dashboard Debug...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const timestamp = new Date().toISOString();
  const user = await getUserInfo();
  const network = getNetworkInfo();
  const dbAndTables = await testDatabaseConnection();

  const debugInfo: DashboardDebugInfo = {
    timestamp,
    user,
    network,
    database: dbAndTables.database,
    tables: dbAndTables.tables,
    contexts: {
      devicesContext: true, // Will be updated by actual context check
      customersContext: true,
      userGoalsContext: true
    },
    cache: {
      hasCache: false
    }
  };

  // Log results
  console.log('');
  console.log('📅 Timestamp:', timestamp);
  console.log('');
  
  console.log('👤 User Information:');
  console.log('   Authenticated:', user.authenticated ? '✅ Yes' : '❌ No');
  if (user.authenticated) {
    console.log('   User ID:', user.userId);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
  }
  console.log('');
  
  console.log('🌐 Network Status:');
  console.log('   Online:', network.online ? '✅ Yes' : '❌ No');
  if (network.effectiveType) {
    console.log('   Connection Type:', network.effectiveType);
    console.log('   Downlink:', network.downlink, 'Mbps');
    console.log('   RTT:', network.rtt, 'ms');
  }
  console.log('');
  
  console.log('💾 Database Connection:');
  console.log('   Connected:', debugInfo.database.connected ? '✅ Yes' : '❌ No');
  if (debugInfo.database.supabaseUrl) {
    console.log('   Supabase URL:', debugInfo.database.supabaseUrl);
  }
  if (debugInfo.database.error) {
    console.error('   Error:', debugInfo.database.error);
  }
  console.log('');
  
  console.log('📊 Database Tables:');
  Object.entries(debugInfo.tables).forEach(([table, info]) => {
    if (info.error) {
      console.error(`   ${table}: ❌ Error - ${info.error}`);
    } else {
      console.log(`   ${table}: ✅ ${info.count} records`);
    }
  });
  console.log('');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Debug complete!');
  console.log('');

  return debugInfo;
}

/**
 * Export to window for easy access from browser console
 */
if (typeof window !== 'undefined') {
  (window as any).debugCustomerCareDashboard = debugCustomerCareDashboard;
  console.log('🔧 Debug utility loaded! Run window.debugCustomerCareDashboard() in console to debug.');
}

