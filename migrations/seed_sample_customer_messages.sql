-- ============================================
-- SEED SAMPLE CUSTOMER MESSAGES
-- For testing the dashboard chat widget
-- Date: October 2025
-- ============================================

-- Only insert if the customer_messages table is empty
DO $$
DECLARE
    msg_count INTEGER;
    sample_customer_id UUID;
    sample_user_id UUID;
BEGIN
    -- Check if there are already messages
    SELECT COUNT(*) INTO msg_count FROM customer_messages;
    
    -- Only seed if empty
    IF msg_count = 0 THEN
        -- Get a sample customer (or create one if needed)
        SELECT id INTO sample_customer_id FROM customers LIMIT 1;
        
        -- Get a sample user (or use NULL if none exists)
        SELECT id INTO sample_user_id FROM users LIMIT 1;
        
        -- If we have a customer, insert sample messages
        IF sample_customer_id IS NOT NULL THEN
            -- Insert sample inbound messages (from customers)
            INSERT INTO customer_messages (
                customer_id,
                message,
                direction,
                channel,
                status,
                sender_name,
                created_at
            ) VALUES
            (
                sample_customer_id,
                'Hi, I wanted to check on the status of my device repair.',
                'inbound',
                'chat',
                'read',
                (SELECT name FROM customers WHERE id = sample_customer_id),
                NOW() - INTERVAL '2 hours'
            ),
            (
                sample_customer_id,
                'Thank you for the quick response!',
                'inbound',
                'chat',
                'delivered',
                (SELECT name FROM customers WHERE id = sample_customer_id),
                NOW() - INTERVAL '30 minutes'
            );
            
            -- Insert sample outbound messages (to customers)
            INSERT INTO customer_messages (
                customer_id,
                message,
                direction,
                channel,
                status,
                sender_id,
                sender_name,
                created_at
            ) VALUES
            (
                sample_customer_id,
                'Your device is currently being repaired. We''ll notify you once it''s ready!',
                'outbound',
                'chat',
                'read',
                sample_user_id,
                'Support Team',
                NOW() - INTERVAL '1 hour'
            );
            
            RAISE NOTICE 'Sample customer messages have been inserted successfully!';
        ELSE
            RAISE NOTICE 'No customers found. Please add customers first before seeding messages.';
        END IF;
    ELSE
        RAISE NOTICE 'Customer messages table already has data. Skipping seed.';
    END IF;
END $$;

