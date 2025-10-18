-- ============================================
-- CREATE REMINDERS TABLE (NEON VERSION)
-- Simplified for Neon PostgreSQL
-- Date: October 17, 2025
-- ============================================

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    category TEXT NOT NULL CHECK (category IN ('general', 'device', 'customer', 'appointment', 'payment', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notify_before INTEGER DEFAULT 15,
    related_to JSONB,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(date);
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON reminders(created_by);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON reminders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reminders_branch_id ON reminders(branch_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date_time ON reminders(date, time);

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

-- Comments for documentation
COMMENT ON TABLE reminders IS 'Store user reminders and notifications';
COMMENT ON COLUMN reminders.notify_before IS 'Minutes before the reminder time to send notification';
COMMENT ON COLUMN reminders.related_to IS 'JSON object: {type, id, name}';
COMMENT ON COLUMN reminders.branch_id IS 'References store_locations for branch isolation';

SELECT '✅ Reminders table created successfully!' as status;

