-- SMS Tables Setup Script
-- Run this if you're getting warnings about missing SMS tables

-- Create sms_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'pending')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    sent_by UUID REFERENCES staff(id),
    device_id UUID REFERENCES devices(id),
    cost DECIMAL(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient_phone ON sms_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_device_id ON sms_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);

-- Create customer_communications table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sms', 'whatsapp', 'call', 'email')),
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'pending', 'read')),
    phone_number TEXT,
    sent_by UUID REFERENCES staff(id),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_communications_customer_id ON customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_type ON customer_communications(type);
CREATE INDEX IF NOT EXISTS idx_customer_communications_sent_at ON customer_communications(sent_at DESC);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_sms_logs_updated_at ON sms_logs;
CREATE TRIGGER update_sms_logs_updated_at
    BEFORE UPDATE ON sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_communications_updated_at ON customer_communications;
CREATE TRIGGER update_customer_communications_updated_at
    BEFORE UPDATE ON customer_communications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE sms_logs IS 'Logs all SMS messages sent through the system';
COMMENT ON TABLE customer_communications IS 'Tracks all communications with customers (SMS, WhatsApp, calls, emails)';

-- Success message
SELECT 
    '✅ SMS tables created successfully!' as status,
    (SELECT COUNT(*) FROM sms_logs) as sms_logs_count,
    (SELECT COUNT(*) FROM customer_communications) as communications_count;

