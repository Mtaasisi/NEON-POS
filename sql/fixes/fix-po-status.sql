-- Check for purchase orders with invalid status values (UUIDs instead of status)
SELECT id, po_number, status, created_at 
FROM lats_purchase_orders 
WHERE status ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
OR status NOT IN ('draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'shipped', 'partial_received', 'received', 'completed', 'cancelled');

-- Fix: Set invalid statuses to 'draft' as default
UPDATE lats_purchase_orders 
SET status = 'draft',
    updated_at = now()
WHERE status ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
OR status NOT IN ('draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'shipped', 'partial_received', 'received', 'completed', 'cancelled');

-- Verify the fix
SELECT COUNT(*) as fixed_count
FROM lats_purchase_orders 
WHERE status = 'draft' AND updated_at > now() - interval '1 minute';
