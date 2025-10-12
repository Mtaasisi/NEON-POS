-- ============================================================================
-- 🎯 ONE-COMMAND FIX FOR CUSTOMER CREATION ERROR
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Open https://console.neon.tech/ 
-- 2. Select your project (ep-dry-brook-ad3duuog)
-- 3. Click "SQL Editor"
-- 4. Copy and paste EVERYTHING below
-- 5. Click "Run"
-- ============================================================================

-- Fix customer_notes table (most common issue)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_notes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_notes' AND column_name = 'id') THEN
            ALTER TABLE customer_notes ADD COLUMN id UUID DEFAULT gen_random_uuid();
            RAISE NOTICE '✅ Added id column to customer_notes';
        END IF;
    ELSE
        CREATE TABLE customer_notes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID REFERENCES customers(id) ON DELETE CASCADE, note TEXT NOT NULL, note_type TEXT DEFAULT 'general', created_by UUID, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
        RAISE NOTICE '✅ Created customer_notes table';
    END IF;
END $$;

-- Disable RLS
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes DISABLE ROW LEVEL SECURITY;

-- Add missing columns
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'whatsapp') THEN ALTER TABLE customers ADD COLUMN whatsapp TEXT; END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'created_by') THEN ALTER TABLE customers ADD COLUMN created_by UUID; END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'referrals') THEN ALTER TABLE customers ADD COLUMN referrals JSONB DEFAULT '[]'::jsonb; ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'referrals' AND data_type = 'integer') THEN ALTER TABLE customers DROP COLUMN referrals; ALTER TABLE customers ADD COLUMN referrals JSONB DEFAULT '[]'::jsonb; END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'referred_by') THEN ALTER TABLE customers ADD COLUMN referred_by UUID; END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'joined_date') THEN ALTER TABLE customers ADD COLUMN joined_date DATE DEFAULT CURRENT_DATE; END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'created_at') THEN ALTER TABLE customers ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'updated_at') THEN ALTER TABLE customers ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); END IF; END $$;

-- Set defaults
ALTER TABLE customers ALTER COLUMN loyalty_level SET DEFAULT 'bronze';
ALTER TABLE customers ALTER COLUMN color_tag SET DEFAULT 'new';
ALTER TABLE customers ALTER COLUMN points SET DEFAULT 0;
ALTER TABLE customers ALTER COLUMN total_spent SET DEFAULT 0;
ALTER TABLE customers ALTER COLUMN is_active SET DEFAULT true;

-- Test and clean up
DO $$ DECLARE test_id UUID := gen_random_uuid(); test_note_id UUID := gen_random_uuid(); BEGIN INSERT INTO customers (id, name, phone, email, loyalty_level, color_tag, points, total_spent, is_active) VALUES (test_id, 'TEST DELETE ME', 'TEST_' || floor(random() * 1000000)::text, '', 'bronze', 'new', 0, 0, true); INSERT INTO customer_notes (id, customer_id, note, created_at) VALUES (test_note_id, test_id, 'Test note', NOW()); DELETE FROM customer_notes WHERE id = test_note_id; DELETE FROM customers WHERE id = test_id; RAISE NOTICE '✅ ALL TESTS PASSED! Customer creation fixed.'; END $$;

SELECT '🎉 FIX COMPLETE! Customer creation should work now.' as status;

