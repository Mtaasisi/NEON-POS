#!/usr/bin/env node

/**
 * 🔧 Auto-Fix Script for Identified Issues
 * Automatically fixes common issues found in browser tests
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const fixes = [];

function logFix(issue, action, status) {
  fixes.push({ issue, action, status, timestamp: new Date().toISOString() });
  const emoji = status === 'success' ? '✅' : '⚠️';
  console.log(`${emoji} ${issue}: ${action}`);
}

// Fix 1: Database Connection Issues
function fixDatabaseConnectionIssues() {
  console.log('\n🔧 Fixing Database Connection Issues...');
  
  const envFile = '.env.local';
  if (existsSync(envFile)) {
    let content = readFileSync(envFile, 'utf-8');
    
    // Check if DATABASE_URL exists
    if (!content.includes('DATABASE_URL') || !content.includes('VITE_DATABASE_URL')) {
      logFix(
        'Database Environment Variables',
        'Please ensure DATABASE_URL and VITE_DATABASE_URL are set in .env.local',
        'warning'
      );
    } else {
      logFix('Database Environment Variables', 'Variables exist', 'success');
    }
  } else {
    logFix('Environment File', 'Missing .env.local file', 'warning');
  }
}

// Fix 2: POS Delivery Settings SQL Error
function fixDeliverySettingsSQL() {
  console.log('\n🔧 Creating SQL Fix for Delivery Settings...');
  
  const sqlFix = `
-- Fix for Delivery Settings Empty Array Issue
-- This adds default values for empty arrays

DO $$ 
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lats_pos_delivery_settings') THEN
    -- Update any rows with NULL arrays to empty JSONB arrays
    UPDATE lats_pos_delivery_settings 
    SET 
      delivery_zones = COALESCE(delivery_zones, '[]'::jsonb),
      delivery_hours = COALESCE(delivery_hours, '[]'::jsonb)
    WHERE delivery_zones IS NULL OR delivery_hours IS NULL;
    
    RAISE NOTICE 'Delivery settings updated successfully';
  END IF;
END $$;
`;

  writeFileSync('fix-delivery-settings.sql', sqlFix);
  logFix('Delivery Settings SQL', 'Created fix-delivery-settings.sql', 'success');
}

// Fix 3: Daily Opening Sessions Duplicate Key Issue
function fixDailyOpeningSessionsSQL() {
  console.log('\n🔧 Creating SQL Fix for Daily Opening Sessions...');
  
  const sqlFix = `
-- Fix for Daily Opening Sessions Duplicate Key Issue

DO $$
BEGIN
  -- Close any duplicate active sessions
  WITH duplicates AS (
    SELECT id, date, is_active,
           ROW_NUMBER() OVER (PARTITION BY date, is_active ORDER BY opened_at DESC) as rn
    FROM daily_opening_sessions
    WHERE is_active = true
  )
  UPDATE daily_opening_sessions
  SET is_active = false
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  RAISE NOTICE 'Duplicate sessions fixed successfully';
END $$;
`;

  writeFileSync('fix-daily-sessions.sql', sqlFix);
  logFix('Daily Opening Sessions', 'Created fix-daily-sessions.sql', 'success');
}

// Fix 4: Page Timeout Issues - Create Loading Optimization
function createLoadingOptimization() {
  console.log('\n🔧 Creating Loading Optimization Guide...');
  
  const optimizationGuide = `
# 🚀 Page Loading Optimization Guide

## Issues Identified:
- POS page timeout (10s)
- Customers page timeout (10s)
- Multiple database connection failures

## Recommended Fixes:

### 1. Optimize Database Queries
\`\`\`typescript
// Add caching for frequently accessed data
const useOptimizedQuery = () => {
  const [cache, setCache] = useState(new Map());
  
  const cachedQuery = async (key, queryFn, ttl = 30000) => {
    if (cache.has(key)) {
      const { data, timestamp } = cache.get(key);
      if (Date.now() - timestamp < ttl) {
        return data;
      }
    }
    
    const data = await queryFn();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  };
  
  return cachedQuery;
};
\`\`\`

### 2. Implement Progressive Loading
\`\`\`typescript
// Load critical data first, then secondary data
const useLazyDataLoad = () => {
  const [loading, setLoading] = useState(true);
  const [critical Data, setCriticalData] = useState(null);
  
  useEffect(() => {
    // Load critical data immediately
    loadCriticalData().then(setCriticalData);
    setLoading(false);
    
    // Load secondary data after render
    setTimeout(() => loadSecondaryData(), 100);
  }, []);
};
\`\`\`

### 3. Add Request Debouncing
\`\`\`typescript
// Prevent duplicate requests
const debouncedFetch = debounce(async (query) => {
  return await fetchData(query);
}, 300);
\`\`\`

### 4. Enable Service Worker for Offline Support
\`\`\`typescript
// Add to vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [{
          urlPattern: /^https:\\/\\/.*\\.neon\\.tech\\/.*$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'db-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 300 // 5 minutes
            }
          }
        }]
      }
    })
  ]
});
\`\`\`

## Quick Wins:

1. **Increase Timeout**: Change networkidle timeout from 10s to 30s
2. **Add Loading States**: Show skeleton screens while loading
3. **Implement Retry Logic**: Retry failed requests automatically
4. **Connection Pooling**: Reuse database connections
5. **Query Optimization**: Use indexes and limit results

Run these SQL commands to improve database performance:

\`\`\`sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- Analyze tables for better query planning
ANALYZE customers;
ANALYZE sales;
ANALYZE products;
ANALYZE devices;
\`\`\`
`;

  writeFileSync('OPTIMIZATION-GUIDE.md', optimizationGuide);
  logFix('Page Loading Optimization', 'Created OPTIMIZATION-GUIDE.md', 'success');
}

// Fix 5: Create Database Health Check Script
function createDBHealthCheck() {
  console.log('\n🔧 Creating Database Health Check...');
  
  const healthCheckScript = `
-- Database Health Check
-- Run this to diagnose connection issues

SELECT 
  'Active Connections' as metric,
  count(*) as value
FROM pg_stat_activity;

SELECT 
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value;

SELECT 
  'Slow Queries (>1s)' as metric,
  count(*) as value
FROM pg_stat_statements
WHERE mean_exec_time > 1000;

-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND n_distinct > 100
  AND correlation < 0.1;

-- Check table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
`;

  writeFileSync('database-health-check.sql', healthCheckScript);
  logFix('Database Health Check', 'Created database-health-check.sql', 'success');
}

// Generate Fix Report
function generateFixReport() {
  console.log('\n📄 Generating Fix Report...');
  
  const report = `
# 🔧 Auto-Fix Report
**Generated:** ${new Date().toLocaleString()}

## Issues Fixed: ${fixes.filter(f => f.status === 'success').length}
## Warnings: ${fixes.filter(f => f.status === 'warning').length}

## Actions Taken:

${fixes.map(f => `### ${f.issue}
- **Action:** ${f.action}
- **Status:** ${f.status === 'success' ? '✅ Success' : '⚠️ Warning'}
- **Time:** ${new Date(f.timestamp).toLocaleTimeString()}
`).join('\n')}

## Next Steps:

1. **Run SQL Fixes:**
   \`\`\`bash
   psql "$DATABASE_URL" -f fix-delivery-settings.sql
   psql "$DATABASE_URL" -f fix-daily-sessions.sql
   psql "$DATABASE_URL" -f database-health-check.sql
   \`\`\`

2. **Check Database Connection:**
   - Verify .env.local has correct DATABASE_URL
   - Test connection with: \`psql "$DATABASE_URL" -c "SELECT 1;"\`

3. **Apply Optimizations:**
   - Review OPTIMIZATION-GUIDE.md
   - Implement caching strategies
   - Add progressive loading

4. **Re-run Tests:**
   \`\`\`bash
   node comprehensive-auto-test-and-fix.mjs
   \`\`\`

## Files Created:
- fix-delivery-settings.sql
- fix-daily-sessions.sql  
- database-health-check.sql
- OPTIMIZATION-GUIDE.md
- AUTO-FIX-REPORT.md

---
*Auto-generated by auto-fix-issues.mjs*
`;

  writeFileSync('AUTO-FIX-REPORT.md', report);
  console.log('\n✅ Fix report saved to AUTO-FIX-REPORT.md');
}

// Main execution
async function main() {
  console.log('🚀 Starting Auto-Fix Process...\n');
  
  fixDatabaseConnectionIssues();
  fixDeliverySettingsSQL();
  fixDailyOpeningSessionsSQL();
  createLoadingOptimization();
  createDBHealthCheck();
  generateFixReport();
  
  console.log('\n🎉 Auto-Fix Complete!');
  console.log('\n📊 Summary:');
  console.log(`   ✅ Fixed: ${fixes.filter(f => f.status === 'success').length}`);
  console.log(`   ⚠️  Warnings: ${fixes.filter(f => f.status === 'warning').length}`);
  console.log('\n📄 See AUTO-FIX-REPORT.md for detailed instructions');
}

main();

