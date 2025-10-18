-- Create Reminders Table Migration
-- This script creates the reminders table and related functionality

-- Drop existing table if it exists (for fresh install)
DROP TABLE IF EXISTS reminders CASCADE;

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  category TEXT NOT NULL CHECK (category IN ('general', 'device', 'customer', 'appointment', 'payment', 'other')) DEFAULT 'general',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  notify_before INTEGER DEFAULT 30, -- minutes before to notify
  related_to JSONB, -- { type: 'device'|'customer'|'appointment', id: 'uuid', name: 'string' }
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  branch_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
  recurring JSONB -- { enabled: boolean, type: 'daily'|'weekly'|'monthly', interval: number, endDate: 'date' }
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(date);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_branch_id ON reminders(branch_id);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON reminders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON reminders(created_by);
CREATE INDEX IF NOT EXISTS idx_reminders_priority ON reminders(priority);
CREATE INDEX IF NOT EXISTS idx_reminders_category ON reminders(category);
CREATE INDEX IF NOT EXISTS idx_reminders_datetime ON reminders(date, time);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reminders_updated_at ON reminders;
CREATE TRIGGER trigger_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_reminders_updated_at();

-- Create function to get upcoming reminders
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

-- Create function to get overdue reminders
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

-- Create function to handle recurring reminders
CREATE OR REPLACE FUNCTION create_next_recurring_reminder()
RETURNS TRIGGER AS $$
DECLARE
  next_date DATE;
  recurring_config JSONB;
BEGIN
  -- Only proceed if reminder is completed and has recurring config
  IF NEW.status = 'completed' AND OLD.status = 'pending' AND NEW.recurring IS NOT NULL THEN
    recurring_config := NEW.recurring;
    
    -- Check if recurring is enabled
    IF (recurring_config->>'enabled')::BOOLEAN = TRUE THEN
      -- Calculate next date based on type
      CASE recurring_config->>'type'
        WHEN 'daily' THEN
          next_date := NEW.date + ((recurring_config->>'interval')::INTEGER || ' days')::INTERVAL;
        WHEN 'weekly' THEN
          next_date := NEW.date + ((recurring_config->>'interval')::INTEGER * 7 || ' days')::INTERVAL;
        WHEN 'monthly' THEN
          next_date := NEW.date + ((recurring_config->>'interval')::INTEGER || ' months')::INTERVAL;
      END CASE;
      
      -- Check if we haven't reached end date
      IF recurring_config->>'endDate' IS NULL OR 
         next_date <= (recurring_config->>'endDate')::DATE THEN
        -- Create new reminder
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

-- Insert some sample reminders (optional - remove in production)
DO $$
DECLARE
  sample_user_id UUID;
  sample_branch_id UUID;
BEGIN
  -- Get first user and branch for sample data
  SELECT id INTO sample_user_id FROM users LIMIT 1;
  SELECT id INTO sample_branch_id FROM store_locations LIMIT 1;
  
  IF sample_user_id IS NOT NULL AND sample_branch_id IS NOT NULL THEN
    INSERT INTO reminders (title, description, date, time, priority, category, created_by, branch_id, status)
    VALUES 
      ('Team Meeting', 'Weekly team sync-up meeting', CURRENT_DATE + 1, '10:00:00', 'medium', 'general', sample_user_id, sample_branch_id, 'pending'),
      ('Check Inventory', 'Review low stock items and reorder', CURRENT_DATE + 2, '14:00:00', 'high', 'other', sample_user_id, sample_branch_id, 'pending'),
      ('Customer Follow-up', 'Follow up with VIP customers', CURRENT_DATE, '16:00:00', 'medium', 'customer', sample_user_id, sample_branch_id, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON reminders TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Reminders table created successfully!';
  RAISE NOTICE '✅ Indexes created';
  RAISE NOTICE '✅ Triggers configured';
  RAISE NOTICE '✅ Helper functions created';
  RAISE NOTICE '🎉 Reminders system is ready to use!';
END $$;
