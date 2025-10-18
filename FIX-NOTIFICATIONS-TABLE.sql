-- ============================================
-- FIX NOTIFICATIONS TABLE
-- Drops and recreates notifications table with proper schema
-- ============================================

SELECT '🔧 Fixing notifications table...' as status;

-- Drop old notifications table (backup data first if needed)
DROP TABLE IF EXISTS notifications CASCADE;

-- Create proper notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User association
  user_id UUID NOT NULL,
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  
  -- Status tracking
  status TEXT DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  actioned_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  actioned_by UUID,
  dismissed_by UUID,
  
  -- Related entities
  device_id UUID,
  customer_id UUID,
  appointment_id UUID,
  diagnostic_id UUID,
  
  -- UI metadata
  icon TEXT,
  color TEXT,
  action_url TEXT,
  action_text TEXT,
  metadata JSONB,
  
  -- Grouping
  group_id UUID,
  is_grouped BOOLEAN DEFAULT false,
  group_count INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_device_id ON notifications(device_id);
CREATE INDEX idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_priority ON notifications(priority);

-- Disable RLS (you can enable later with proper policies)
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON notifications TO neondb_owner, authenticated, anon;

SELECT '✅ Notifications table recreated with proper schema!' as status;

-- ============================================
-- Test: Insert a sample notification
-- ============================================

-- You can uncomment this to test
-- INSERT INTO notifications (
--   user_id, title, message, type, category, priority, status, icon, color
-- ) VALUES (
--   (SELECT id FROM auth_users LIMIT 1),
--   'Welcome!',
--   'Notification system is now working properly',
--   'system_alert',
--   'system',
--   'normal',
--   'unread',
--   '🎉',
--   'bg-blue-500'
-- );

SELECT '🎉 All done! Your notifications should work now!' as status;

