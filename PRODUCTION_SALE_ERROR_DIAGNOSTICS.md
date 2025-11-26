# Production Sale Creation Error Diagnostics

This guide helps diagnose and fix sale creation errors in production.

## Common Issues

### 1. Row Level Security (RLS) Policy Issues

**Symptoms:**
- Error code: `42501`
- Error message contains: "permission denied" or "row-level security"
- Works in development but fails in production

**Diagnosis:**
```sql
-- Check RLS policies on lats_sales table
SELECT * FROM pg_policies WHERE tablename = 'lats_sales';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'lats_sales';
```

**Solution:**
Create or update RLS policies to allow inserts:
```sql
-- Allow authenticated users to insert sales
CREATE POLICY "Allow authenticated users to insert sales" 
ON lats_sales 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to insert sale items
CREATE POLICY "Allow authenticated users to insert sale items" 
ON lats_sale_items 
FOR INSERT 
TO authenticated 
WITH CHECK (true);
```

### 2. Foreign Key Constraint Violations

**Symptoms:**
- Error code: `23503`
- Error message contains: "foreign key constraint"

**Diagnosis:**
```sql
-- Check if customer exists
SELECT id, name FROM lats_customers WHERE id = '<customer_id>';

-- Check if branch exists
SELECT id, name FROM lats_branches WHERE id = '<branch_id>';

-- Check if product exists
SELECT id, name FROM lats_products WHERE id = '<product_id>';

-- Check if variant exists
SELECT id, name FROM lats_product_variants WHERE id = '<variant_id>';
```

**Solution:**
- Ensure customer is selected before creating sale
- Verify branch_id is set correctly in localStorage
- Ensure products/variants exist and are active

### 3. Database Connection Issues

**Symptoms:**
- Error message contains: "connection", "timeout", or "network"
- Intermittent failures

**Diagnosis:**
1. Check environment variable:
   ```bash
   echo $VITE_DATABASE_URL
   ```

2. Verify database is accessible:
   ```bash
   # Test connection
   psql "$VITE_DATABASE_URL" -c "SELECT 1;"
   ```

**Solution:**
- Ensure `VITE_DATABASE_URL` is set in production environment
- Verify database URL uses WebSocket pooler endpoint (ends with `-pooler`)
- Check network connectivity from production server to database

### 4. Authentication Issues

**Symptoms:**
- Error: "Authentication required"
- User session not found

**Diagnosis:**
```javascript
// Check in browser console
localStorage.getItem('supabase.auth.session')
```

**Solution:**
- Ensure user is logged in before creating sale
- Check session expiration
- Verify authentication service is working

### 5. Unique Constraint Violations

**Symptoms:**
- Error code: `23505`
- Error message contains: "unique constraint" or "duplicate key"

**Diagnosis:**
```sql
-- Check if sale number already exists
SELECT sale_number, created_at 
FROM lats_sales 
WHERE sale_number = '<sale_number>';
```

**Solution:**
- Sale number generation collision (rare)
- Check for concurrent sale creation
- Verify sale_number generation logic

## Debugging Steps

### Step 1: Check Browser Console

Open browser developer tools (F12) and check:
1. Console errors (red messages)
2. Network tab for failed requests
3. Application tab > Local Storage for session data

### Step 2: Check Production Logs

Look for error messages with these prefixes:
- `❌ Error creating sale`
- `🚨 PRODUCTION DIAGNOSTICS`
- `🚨 RLS POLICY ISSUE DETECTED`

### Step 3: Verify Environment Variables

In production, ensure these are set:
```bash
VITE_DATABASE_URL=postgresql://...@...-pooler.neon.tech/...
```

### Step 4: Test Database Connection

Run this query in production database:
```sql
-- Test basic connection
SELECT 1;

-- Test table access
SELECT COUNT(*) FROM lats_sales;

-- Test insert (with rollback)
BEGIN;
INSERT INTO lats_sales (sale_number, customer_id, total_amount, payment_method, payment_status, sold_by)
VALUES ('TEST-' || NOW()::text, (SELECT id FROM lats_customers LIMIT 1), 100, '{"type":"cash"}', 'completed', 'test@example.com')
RETURNING id;
ROLLBACK;
```

### Step 5: Check RLS Policies

```sql
-- List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('lats_sales', 'lats_sale_items')
ORDER BY tablename, policyname;
```

## Quick Fixes

### Fix 1: Disable RLS (Temporary - for testing only)

```sql
-- ⚠️ WARNING: Only for testing! Re-enable after fixing policies
ALTER TABLE lats_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_sale_items DISABLE ROW LEVEL SECURITY;
```

### Fix 2: Create Permissive RLS Policies

```sql
-- Allow all authenticated users to insert sales
CREATE POLICY "allow_insert_sales" 
ON lats_sales 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow all authenticated users to insert sale items
CREATE POLICY "allow_insert_sale_items" 
ON lats_sale_items 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to view their own sales (optional)
CREATE POLICY "allow_select_sales" 
ON lats_sales 
FOR SELECT 
TO authenticated 
USING (true);
```

### Fix 3: Verify Customer Selection

Ensure customer is selected before processing payment:
```javascript
// In POS component
if (!selectedCustomer?.id) {
  toast.error('Please select a customer before processing payment');
  return;
}
```

## Contact Support

If the issue persists, provide:
1. Browser console errors (screenshot)
2. Network tab errors (screenshot)
3. Error code and message from console
4. Database connection test results
5. RLS policy list (from Step 5 above)

