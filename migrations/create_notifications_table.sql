-- ============================================
-- CREATE NOTIFICATIONS TABLE
-- For dashboard notifications system
-- Date: January 2025
-- ============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('urgent', 'high', 'normal', 'low')) DEFAULT 'normal',
    type TEXT NOT NULL CHECK (type IN ('system', 'device', 'customer', 'payment', 'inventory', 'appointment', 'employee', 'security', 'backup')) DEFAULT 'system',
    category TEXT NOT NULL CHECK (category IN ('general', 'device', 'customer', 'payment', 'inventory', 'appointment', 'employee', 'security', 'backup', 'maintenance')) DEFAULT 'general',
    status TEXT NOT NULL CHECK (status IN ('unread', 'read', 'actioned', 'dismissed')) DEFAULT 'unread',
    
    -- Related data
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES customer_payments(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB,
    icon TEXT,
    color TEXT,
    action_url TEXT,
    action_text TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    actioned_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    actioned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    dismissed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Branch isolation
    branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
    
    -- Grouping
    group_id UUID,
    is_grouped BOOLEAN DEFAULT FALSE,
    group_count INTEGER DEFAULT 1
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_branch_id ON notifications(branch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_device_id ON notifications(device_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_group_id ON notifications(group_id);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_priority ON notifications(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'updated_at') THEN
        ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (PostgreSQL compatible)
CREATE POLICY "notifications_select_policy" ON notifications
    FOR SELECT USING (true);

CREATE POLICY "notifications_update_policy" ON notifications
    FOR UPDATE USING (true);

CREATE POLICY "notifications_insert_policy" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_delete_policy" ON notifications
    FOR DELETE USING (true);

-- Comments for documentation
COMMENT ON TABLE notifications IS 'System notifications for dashboard and user alerts';
COMMENT ON COLUMN notifications.priority IS 'Notification priority: urgent, high, normal, low';
COMMENT ON COLUMN notifications.type IS 'Notification type: system, device, customer, payment, etc.';
COMMENT ON COLUMN notifications.category IS 'Notification category for grouping';
COMMENT ON COLUMN notifications.status IS 'Notification status: unread, read, actioned, dismissed';
COMMENT ON COLUMN notifications.metadata IS 'Additional data as JSON';
COMMENT ON COLUMN notifications.group_id IS 'For grouping related notifications';
COMMENT ON COLUMN notifications.branch_id IS 'Branch isolation for multi-tenant support';

-- Insert some sample notifications for testing
INSERT INTO notifications (user_id, title, message, priority, type, category, status, branch_id)
SELECT 
    u.id,
    'Welcome to the System',
    'Your account has been successfully set up. You can now start using all features.',
    'normal',
    'system',
    'general',
    'unread',
    (SELECT id FROM store_locations LIMIT 1)
FROM users u
WHERE u.id IS NOT NULL
LIMIT 1;

SELECT '✅ Notifications table created successfully!' as status;
