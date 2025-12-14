-- Verify and Setup Reminders System
-- This script checks if the reminders table exists and sets it up if needed

-- 1. Check if reminders table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reminders') THEN
    RAISE NOTICE '❌ Reminders table does not exist. Creating it now...';
    
    -- Create reminders table
    CREATE TABLE reminders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      time TIME NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
      category TEXT NOT NULL CHECK (category IN ('general', 'device', 'customer', 'appointment', 'payment', 'other')) DEFAULT 'general',
      status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
      notify_before INTEGER DEFAULT 30,
      related_to JSONB,
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      branch_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
      recurring JSONB
    );
    
    -- Create indexes
    CREATE INDEX idx_reminders_date ON reminders(date);
    CREATE INDEX idx_reminders_status ON reminders(status);
    CREATE INDEX idx_reminders_branch_id ON reminders(branch_id);
    CREATE INDEX idx_reminders_assigned_to ON reminders(assigned_to);
    CREATE INDEX idx_reminders_created_by ON reminders(created_by);
    CREATE INDEX idx_reminders_priority ON reminders(priority);
    CREATE INDEX idx_reminders_category ON reminders(category);
    CREATE INDEX idx_reminders_datetime ON reminders(date, time);
    
    RAISE NOTICE '✅ Reminders table created successfully!';
  ELSE
    RAISE NOTICE '✅ Reminders table already exists.';
  END IF;
END $$;

-- 2. Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_reminders_updated_at ON reminders;
CREATE TRIGGER trigger_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_reminders_updated_at();

-- 4. Create function to get upcoming reminders
CREATE OR REPLACE FUNCTION get_upcoming_reminders(
  p_user_id UUID,
  p_branch_id UUID,
  p_hours_ahead INTEGER DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  reminder_datetime TIMESTAMP,
  priority TEXT,
  category TEXT,
  minutes_until INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    (r.date + r.time)::TIMESTAMP as reminder_datetime,
    r.priority,
    r.category,
    EXTRACT(EPOCH FROM ((r.date + r.time)::TIMESTAMP - NOW()))/60 as minutes_until
  FROM reminders r
  WHERE r.status = 'pending'
    AND (r.assigned_to = p_user_id OR r.created_by = p_user_id)
    AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
    AND (r.date + r.time)::TIMESTAMP <= NOW() + (p_hours_ahead || ' hours')::INTERVAL
    AND (r.date + r.time)::TIMESTAMP >= NOW()
  ORDER BY (r.date + r.time)::TIMESTAMP ASC;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to get overdue reminders
CREATE OR REPLACE FUNCTION get_overdue_reminders(
  p_user_id UUID,
  p_branch_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  reminder_datetime TIMESTAMP,
  priority TEXT,
  category TEXT,
  minutes_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    (r.date + r.time)::TIMESTAMP as reminder_datetime,
    r.priority,
    r.category,
    EXTRACT(EPOCH FROM (NOW() - (r.date + r.time)::TIMESTAMP))/60 as minutes_overdue
  FROM reminders r
  WHERE r.status = 'pending'
    AND (r.assigned_to = p_user_id OR r.created_by = p_user_id)
    AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
    AND (r.date + r.time)::TIMESTAMP < NOW()
  ORDER BY (r.date + r.time)::TIMESTAMP ASC;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to handle recurring reminders
CREATE OR REPLACE FUNCTION create_next_recurring_reminder()
RETURNS TRIGGER AS $$
DECLARE
  next_date DATE;
  recurring_config JSONB;
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'pending' AND NEW.recurring IS NOT NULL THEN
    recurring_config := NEW.recurring;
    
    IF (recurring_config->>'enabled')::BOOLEAN = TRUE THEN
      CASE recurring_config->>'type'
        WHEN 'daily' THEN
          next_date := NEW.date + ((recurring_config->>'interval')::INTEGER || ' days')::INTERVAL;
        WHEN 'weekly' THEN
          next_date := NEW.date + ((recurring_config->>'interval')::INTEGER * 7 || ' days')::INTERVAL;
        WHEN 'monthly' THEN
          next_date := NEW.date + ((recurring_config->>'interval')::INTEGER || ' months')::INTERVAL;
      END CASE;
      
      IF recurring_config->>'endDate' IS NULL OR 
         next_date <= (recurring_config->>'endDate')::DATE THEN
        INSERT INTO reminders (
          title, description, date, time, priority, category,
          status, notify_before, related_to, assigned_to, created_by,
          branch_id, recurring
        ) VALUES (
          NEW.title, NEW.description, next_date, NEW.time, NEW.priority, NEW.category,
          'pending', NEW.notify_before, NEW.related_to, NEW.assigned_to, NEW.created_by,
          NEW.branch_id, NEW.recurring
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_recurring_reminder ON reminders;
CREATE TRIGGER trigger_create_recurring_reminder
  AFTER UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION create_next_recurring_reminder();

-- 7. Grant permissions (NO RLS for simplicity with Neon)
GRANT ALL ON reminders TO PUBLIC;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- 8. Verify setup
DO $$
DECLARE
  table_exists BOOLEAN;
  trigger_count INTEGER;
  function_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Check table
  SELECT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reminders'
  ) INTO table_exists;
  
  -- Count triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'reminders'::regclass;
  
  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('update_reminders_updated_at', 'get_upcoming_reminders', 'get_overdue_reminders', 'create_next_recurring_reminder');
  
  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'reminders';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '    REMINDERS SYSTEM VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table exists: %', table_exists;
  RAISE NOTICE '✅ Triggers configured: %', trigger_count;
  RAISE NOTICE '✅ Functions created: %', function_count;
  RAISE NOTICE '✅ Indexes created: %', index_count;
  RAISE NOTICE '';
  
  IF table_exists AND trigger_count >= 2 AND function_count >= 4 AND index_count >= 8 THEN
    RAISE NOTICE '🎉 Reminders system is fully configured and ready to use!';
  ELSE
    RAISE NOTICE '⚠️  Some components may be missing. Review the output above.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

