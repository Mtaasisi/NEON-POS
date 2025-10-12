-- ============================================================================
-- CREATE 2 TEST CUSTOMERS
-- ============================================================================
-- This script creates 2 customers with all required fields and welcome notes

-- Customer 1: John Mwamba
INSERT INTO customers (
    id,
    name,
    phone,
    email,
    gender,
    city,
    loyalty_level,
    color_tag,
    points,
    total_spent,
    is_active,
    joined_date,
    last_visit,
    created_at,
    updated_at,
    whatsapp,
    birth_month,
    birth_day,
    referral_source
) VALUES (
    gen_random_uuid(),
    'John Mwamba',
    '+255712345678',
    'john.mwamba@example.com',
    'male',
    'Dar es Salaam',
    'bronze',
    'new',
    10,
    0,
    true,
    CURRENT_DATE,
    NOW(),
    NOW(),
    NOW(),
    '+255712345678',
    'January',
    '15',
    'Walk-in'
) RETURNING id, name, phone, points;

-- Customer 2: Mary Kamwela
INSERT INTO customers (
    id,
    name,
    phone,
    email,
    gender,
    city,
    loyalty_level,
    color_tag,
    points,
    total_spent,
    is_active,
    joined_date,
    last_visit,
    created_at,
    updated_at,
    whatsapp,
    birth_month,
    birth_day,
    referral_source
) VALUES (
    gen_random_uuid(),
    'Mary Kamwela',
    '+255787654321',
    'mary.kamwela@example.com',
    'female',
    'Arusha',
    'bronze',
    'new',
    10,
    0,
    true,
    CURRENT_DATE,
    NOW(),
    NOW(),
    NOW(),
    '+255787654321',
    'March',
    '22',
    'Friend'
) RETURNING id, name, phone, points;

-- Verify customers were created
SELECT 
    '✅ Successfully created customers!' as status,
    COUNT(*) as total_customers
FROM customers
WHERE name IN ('John Mwamba', 'Mary Kamwela');

-- Show the new customers
SELECT 
    name,
    phone,
    email,
    gender,
    city,
    points,
    loyalty_level,
    color_tag,
    joined_date
FROM customers
WHERE name IN ('John Mwamba', 'Mary Kamwela')
ORDER BY name;

