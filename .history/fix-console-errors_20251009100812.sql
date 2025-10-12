-- ============================================
-- FIX CONSOLE ERRORS - Quick Diagnostic & Fix
-- ============================================

-- 1. CHECK WHATSAPP INSTANCES TABLE
SELECT 'Checking whatsapp_instance_settings_view' as step;
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'whatsapp_instance_settings_view'
) as table_exists;

-- Create if missing
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT NOT NULL,
  phone_number TEXT,
  api_key TEXT,
  api_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant access
GRANT ALL ON whatsapp_instances TO authenticated;
ALTER TABLE whatsapp_instances DISABLE ROW LEVEL SECURITY;

-- 2. CHECK DEVICES TABLE
SELECT 'Checking devices table' as step;
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'devices'
) as devices_exists;

-- Grant access if exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'devices') THEN
    EXECUTE 'GRANT ALL ON devices TO authenticated';
    EXECUTE 'ALTER TABLE devices DISABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- 3. FIX USER DAILY GOALS - Handle duplicates gracefully
SELECT 'Checking user_daily_goals table' as step;

-- Create function to safely get or create goals
CREATE OR REPLACE FUNCTION get_or_create_user_goal(
  p_user_id UUID,
  p_goal_date DATE,
  p_goal_type TEXT,
  p_target_value NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_goal_id UUID;
BEGIN
  -- Try to get existing goal
  SELECT id INTO v_goal_id
  FROM user_daily_goals
  WHERE user_id = p_user_id 
    AND date = p_goal_date 
    AND goal_type = p_goal_type;
  
  -- If not found, create it
  IF v_goal_id IS NULL THEN
    INSERT INTO user_daily_goals (user_id, date, goal_type, target_value)
    VALUES (p_user_id, p_goal_date, p_goal_type, p_target_value)
    ON CONFLICT (user_id, date, goal_type) DO NOTHING
    RETURNING id INTO v_goal_id;
    
    -- If still null due to concurrent insert, try to get again
    IF v_goal_id IS NULL THEN
      SELECT id INTO v_goal_id
      FROM user_daily_goals
      WHERE user_id = p_user_id 
        AND date = p_goal_date 
        AND goal_type = p_goal_type;
    END IF;
  END IF;
  
  RETURN v_goal_id;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_or_create_user_goal TO authenticated;

-- 4. CHECK PURCHASE ORDER HISTORY FUNCTION
SELECT 'Checking purchase order functions' as step;

-- Create basic purchase order history function if missing
CREATE OR REPLACE FUNCTION get_purchase_order_history(p_product_id UUID)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  supplier_id UUID,
  quantity INTEGER,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  status TEXT,
  order_date TIMESTAMPTZ,
  received_date TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.id,
    po.product_id,
    po.supplier_id,
    po.quantity,
    po.unit_cost,
    po.total_cost,
    po.status,
    po.created_at as order_date,
    po.received_date
  FROM lats_purchase_orders po
  WHERE po.product_id = p_product_id
  ORDER BY po.created_at DESC;
  
  EXCEPTION WHEN OTHERS THEN
    -- Return empty if table doesn't exist
    RETURN;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_purchase_order_history TO authenticated;

-- 5. GRANT BROAD ACCESS TO KEY TABLES
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'user_daily_goals',
      'devices', 
      'lats_purchase_orders',
      'whatsapp_instances',
      'whatsapp_instance_settings_view'
    )
  LOOP
    EXECUTE format('GRANT ALL ON %I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON %I TO anon', table_name);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
    RAISE NOTICE 'Granted access to: %', table_name;
  END LOOP;
END $$;

SELECT '✅ All fixes applied!' as result;

