-- ============================================
-- CREATE CUSTOMER MESSAGES TABLE
-- For dashboard chat widget and customer communication
-- Date: October 2025
-- ============================================

-- Create customer_messages table
CREATE TABLE IF NOT EXISTS customer_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Message content
    message TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')) DEFAULT 'inbound',
    
    -- Message metadata
    channel TEXT NOT NULL CHECK (channel IN ('chat', 'sms', 'whatsapp', 'email')) DEFAULT 'chat',
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'failed')) DEFAULT 'sent',
    
    -- User tracking
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_name TEXT,
    
    -- Related data
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Branch isolation
    branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_messages_customer_id ON customer_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_created_at ON customer_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_messages_status ON customer_messages(status);
CREATE INDEX IF NOT EXISTS idx_customer_messages_branch_id ON customer_messages(branch_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_channel ON customer_messages(channel);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_customer_messages_customer_created ON customer_messages(customer_id, created_at DESC);

-- Add comment
COMMENT ON TABLE customer_messages IS 'Stores all customer communication messages across different channels';

-- Grant permissions (standard PostgreSQL - adjust role names as needed)
-- GRANT ALL ON customer_messages TO authenticated;
-- GRANT ALL ON customer_messages TO service_role;

-- For standard PostgreSQL/Neon, you can grant to your database user or public:
-- GRANT ALL ON customer_messages TO PUBLIC;
-- Or grant to your specific user role

