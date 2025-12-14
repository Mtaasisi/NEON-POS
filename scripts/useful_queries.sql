-- ============================================================================
-- USEFUL QUERIES AFTER CALL ANALYTICS IMPORT
-- ============================================================================

-- 1. TOP 20 VIP CUSTOMERS (Most Engaged)
-- Use this to identify your most valuable relationships
SELECT 
    name,
    phone,
    total_calls,
    incoming_calls,
    outgoing_calls,
    missed_calls,
    ROUND(total_call_duration_minutes / 60, 1) as hours_on_call,
    call_loyalty_level,
    total_spent,
    COALESCE(loyalty_points, 0) as points
FROM customers
WHERE total_calls > 0
ORDER BY total_calls DESC
LIMIT 20;


-- 2. VIP CUSTOMERS WITH HIGH PURCHASE VALUE
-- Customers who both call frequently AND spend a lot
SELECT 
    name,
    phone,
    total_calls,
    total_spent,
    ROUND(total_call_duration_minutes / 60, 1) as hours_on_call,
    call_loyalty_level
FROM customers
WHERE total_calls >= 20 OR total_spent > 100000
ORDER BY (total_calls * total_spent) DESC
LIMIT 30;


-- 3. CUSTOMERS WITH HIGH MISSED CALLS (Need Follow-up)
-- These customers tried to reach you but couldn't get through
SELECT 
    name,
    phone,
    missed_calls,
    total_calls,
    ROUND(missed_calls::numeric / NULLIF(total_calls, 0) * 100, 1) as missed_percentage,
    last_call_date,
    last_activity_date
FROM customers
WHERE missed_calls >= 5
ORDER BY missed_calls DESC;


-- 4. UNKNOWN CONTACTS WHO CALL FREQUENTLY
-- These are potential customers you should identify
SELECT 
    phone,
    total_calls,
    incoming_calls,
    outgoing_calls,
    missed_calls,
    first_call_date,
    last_call_date
FROM customers
WHERE name = 'Unknown' AND total_calls >= 3
ORDER BY total_calls DESC
LIMIT 50;


-- 5. CUSTOMER TIER DISTRIBUTION
-- See how your customers are segmented
SELECT 
    call_loyalty_level,
    COUNT(*) as customer_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage,
    SUM(total_calls) as total_calls,
    SUM(total_spent) as total_revenue
FROM customers
WHERE total_calls > 0
GROUP BY call_loyalty_level
ORDER BY 
    CASE call_loyalty_level
        WHEN 'VIP' THEN 1
        WHEN 'Premium' THEN 2
        WHEN 'Regular' THEN 3
        WHEN 'Active' THEN 4
        WHEN 'Basic' THEN 5
        ELSE 6
    END;


-- 6. RECENTLY ACTIVE CUSTOMERS (Last 30 Days)
-- Customers who contacted you recently
SELECT 
    name,
    phone,
    total_calls,
    last_call_date,
    missed_calls,
    call_loyalty_level,
    total_spent
FROM customers
WHERE last_call_date >= NOW() - INTERVAL '30 days'
ORDER BY last_call_date DESC;


-- 7. INACTIVE VIP CUSTOMERS (Haven't Called in 60+ Days)
-- VIP customers who might be at risk
SELECT 
    name,
    phone,
    total_calls,
    last_call_date,
    DATE_PART('day', NOW() - last_call_date) as days_since_last_call,
    total_spent,
    call_loyalty_level
FROM customers
WHERE call_loyalty_level IN ('VIP', 'Premium', 'Regular')
  AND last_call_date < NOW() - INTERVAL '60 days'
ORDER BY total_calls DESC;


-- 8. NEW CUSTOMERS (First Call in Last 7 Days)
-- Track customer acquisition
SELECT 
    name,
    phone,
    total_calls,
    first_call_date,
    last_call_date,
    incoming_calls,
    outgoing_calls
FROM customers
WHERE first_call_date >= NOW() - INTERVAL '7 days'
ORDER BY first_call_date DESC;


-- 9. CUSTOMERS WITH LONG CONVERSATIONS (Engaged)
-- Customers who spend significant time talking with you
SELECT 
    name,
    phone,
    total_calls,
    ROUND(total_call_duration_minutes / 60, 1) as total_hours,
    ROUND(avg_call_duration_minutes, 1) as avg_minutes_per_call,
    call_loyalty_level,
    total_spent
FROM customers
WHERE total_call_duration_minutes >= 60  -- 1+ hour total
ORDER BY total_call_duration_minutes DESC
LIMIT 30;


-- 10. CALL ACTIVITY BY MONTH (Trend Analysis)
-- See how customer engagement has changed over time
SELECT 
    DATE_TRUNC('month', last_call_date) as month,
    COUNT(*) as active_customers,
    COUNT(CASE WHEN call_loyalty_level = 'VIP' THEN 1 END) as vip_count,
    COUNT(CASE WHEN call_loyalty_level = 'Premium' THEN 1 END) as premium_count,
    SUM(total_spent) as total_revenue
FROM customers
WHERE last_call_date IS NOT NULL
GROUP BY DATE_TRUNC('month', last_call_date)
ORDER BY month DESC
LIMIT 12;


-- 11. CUSTOMERS WHO CALL BUT NEVER BUY
-- Potential sales opportunities or service issues
SELECT 
    name,
    phone,
    total_calls,
    missed_calls,
    total_spent,
    last_call_date
FROM customers
WHERE total_calls >= 5 AND (total_spent IS NULL OR total_spent = 0)
ORDER BY total_calls DESC;


-- 12. BEST CUSTOMERS (High Calls + High Spending)
-- Your true VIPs who both engage and purchase
SELECT 
    name,
    phone,
    total_calls,
    total_spent,
    ROUND(total_call_duration_minutes / 60, 1) as hours_on_call,
    missed_calls,
    call_loyalty_level,
    last_call_date
FROM customers
WHERE total_calls >= 10 AND total_spent > 0
ORDER BY (total_calls * total_spent) DESC
LIMIT 50;


-- 13. CUSTOMER ENGAGEMENT SCORE
-- Combined metric of calls, duration, and spending
SELECT 
    name,
    phone,
    total_calls,
    total_spent,
    ROUND(total_call_duration_minutes / 60, 1) as hours_on_call,
    -- Engagement score: calls + (hours * 10) + (spent / 10000)
    ROUND(
        total_calls + 
        (total_call_duration_minutes / 6) + 
        (COALESCE(total_spent, 0) / 10000),
        0
    ) as engagement_score,
    call_loyalty_level
FROM customers
WHERE total_calls > 0
ORDER BY engagement_score DESC
LIMIT 50;


-- 14. UPDATE UNKNOWN CUSTOMER NAMES
-- Template for updating customer names
-- Replace phone and name with actual values
/*
UPDATE customers 
SET name = 'Actual Customer Name', 
    updated_at = NOW()
WHERE phone = '+255XXXXXXXXX' AND name = 'Unknown';
*/


-- 15. CREATE REMINDERS FOR MISSED CALLS
-- Template to create follow-up tasks for customers with missed calls
/*
INSERT INTO reminders (
    title,
    description,
    date,
    time,
    priority,
    category,
    status,
    related_to
)
SELECT 
    'Follow up: ' || COALESCE(name, 'Unknown') || ' - ' || missed_calls || ' missed calls',
    'Customer ' || phone || ' has ' || missed_calls || ' missed calls. Last call: ' || last_call_date::date,
    CURRENT_DATE + INTERVAL '1 day',
    '09:00:00',
    CASE 
        WHEN missed_calls >= 10 THEN 'high'
        WHEN missed_calls >= 5 THEN 'medium'
        ELSE 'low'
    END,
    'customer',
    'pending',
    jsonb_build_object('type', 'customer', 'id', id::text, 'phone', phone)
FROM customers
WHERE missed_calls >= 5
ORDER BY missed_calls DESC;
*/


-- ============================================================================
-- SUMMARY STATISTICS
-- ============================================================================

-- Overall customer engagement summary
SELECT 
    COUNT(*) as total_customers_with_calls,
    COUNT(CASE WHEN call_loyalty_level = 'VIP' THEN 1 END) as vip_customers,
    COUNT(CASE WHEN call_loyalty_level = 'Premium' THEN 1 END) as premium_customers,
    COUNT(CASE WHEN call_loyalty_level = 'Regular' THEN 1 END) as regular_customers,
    COUNT(CASE WHEN name = 'Unknown' THEN 1 END) as unknown_contacts,
    SUM(total_calls) as total_all_calls,
    SUM(incoming_calls) as total_incoming,
    SUM(outgoing_calls) as total_outgoing,
    SUM(missed_calls) as total_missed,
    ROUND(SUM(total_call_duration_minutes) / 60, 1) as total_hours_on_calls,
    ROUND(AVG(avg_call_duration_minutes), 1) as avg_call_duration_mins,
    SUM(total_spent) as total_revenue
FROM customers
WHERE total_calls > 0;

