-- ============================================
-- CREATE WHATSAPP WEBHOOK TABLES
-- For storing incoming WhatsApp messages and events
-- Date: December 2025
-- ============================================

-- 1. INCOMING MESSAGES TABLE
-- Stores all incoming WhatsApp messages
CREATE TABLE IF NOT EXISTS whatsapp_incoming_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT UNIQUE NOT NULL,
    from_phone TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    message_text TEXT,
    message_type TEXT DEFAULT 'text', -- text, image, video, document, audio, sticker, location, contact
    media_url TEXT,
    raw_data JSONB,
    is_read BOOLEAN DEFAULT false,
    replied BOOLEAN DEFAULT false,
    replied_at TIMESTAMP WITH TIME ZONE,
    replied_by UUID,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_from ON whatsapp_incoming_messages(from_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_customer ON whatsapp_incoming_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_created ON whatsapp_incoming_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_unread ON whatsapp_incoming_messages(is_read) WHERE is_read = false;

COMMENT ON TABLE whatsapp_incoming_messages IS 'Stores all incoming WhatsApp messages from customers';


-- 2. MESSAGE REACTIONS TABLE
-- Stores emoji reactions to messages
CREATE TABLE IF NOT EXISTS whatsapp_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT NOT NULL,
    from_phone TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_reactions_message ON whatsapp_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_reactions_customer ON whatsapp_reactions(customer_id);

COMMENT ON TABLE whatsapp_reactions IS 'Stores emoji reactions to WhatsApp messages';


-- 3. INCOMING CALLS TABLE
-- Stores information about incoming WhatsApp calls
CREATE TABLE IF NOT EXISTS whatsapp_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_phone TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    call_type TEXT DEFAULT 'voice', -- voice, video
    call_timestamp TIMESTAMP WITH TIME ZONE,
    answered BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_calls_from ON whatsapp_calls(from_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_calls_customer ON whatsapp_calls(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_calls_created ON whatsapp_calls(created_at DESC);

COMMENT ON TABLE whatsapp_calls IS 'Stores information about incoming WhatsApp voice/video calls';


-- 4. POLL RESULTS TABLE
-- Stores responses to WhatsApp polls
CREATE TABLE IF NOT EXISTS whatsapp_poll_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id TEXT NOT NULL,
    voter_phone TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    selected_options TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_polls_poll_id ON whatsapp_poll_results(poll_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_polls_customer ON whatsapp_poll_results(customer_id);

COMMENT ON TABLE whatsapp_poll_results IS 'Stores customer responses to WhatsApp polls';


-- 5. UPDATE whatsapp_logs TABLE
-- Add columns for tracking delivery and read status
ALTER TABLE whatsapp_logs 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN whatsapp_logs.delivered_at IS 'Timestamp when message was delivered to recipient';
COMMENT ON COLUMN whatsapp_logs.read_at IS 'Timestamp when message was read by recipient';


-- 6. CREATE FUNCTION TO AUTO-LINK CUSTOMERS
-- Automatically link incoming messages/calls to customers based on phone number
CREATE OR REPLACE FUNCTION link_whatsapp_customer()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to find customer by phone number
    SELECT id INTO NEW.customer_id
    FROM customers
    WHERE phone = NEW.from_phone
       OR phone = '+' || NEW.from_phone
       OR whatsapp = NEW.from_phone
       OR whatsapp = '+' || NEW.from_phone
    LIMIT 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to incoming messages
DROP TRIGGER IF EXISTS link_customer_to_incoming_message ON whatsapp_incoming_messages;
CREATE TRIGGER link_customer_to_incoming_message
    BEFORE INSERT ON whatsapp_incoming_messages
    FOR EACH ROW
    EXECUTE FUNCTION link_whatsapp_customer();

-- Apply trigger to calls
DROP TRIGGER IF EXISTS link_customer_to_call ON whatsapp_calls;
CREATE TRIGGER link_customer_to_call
    BEFORE INSERT ON whatsapp_calls
    FOR EACH ROW
    EXECUTE FUNCTION link_whatsapp_customer();

-- Apply trigger to reactions
DROP TRIGGER IF EXISTS link_customer_to_reaction ON whatsapp_reactions;
CREATE TRIGGER link_customer_to_reaction
    BEFORE INSERT ON whatsapp_reactions
    FOR EACH ROW
    EXECUTE FUNCTION link_whatsapp_customer();

-- Apply trigger to poll results
DROP TRIGGER IF EXISTS link_customer_to_poll ON whatsapp_poll_results;
CREATE TRIGGER link_customer_to_poll
    BEFORE INSERT ON whatsapp_poll_results
    FOR EACH ROW
    EXECUTE FUNCTION link_whatsapp_customer();


-- 5. WEBHOOK FAILURES TABLE (for production monitoring)
-- Stores failed webhook processing attempts for manual retry
CREATE TABLE IF NOT EXISTS webhook_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_failures_event ON webhook_failures(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_failures_unresolved ON webhook_failures(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_webhook_failures_created ON webhook_failures(created_at DESC);

COMMENT ON TABLE webhook_failures IS 'Tracks failed webhook processing attempts for monitoring and retry';


-- Grant permissions
GRANT ALL ON whatsapp_incoming_messages TO PUBLIC;
GRANT ALL ON whatsapp_reactions TO PUBLIC;
GRANT ALL ON whatsapp_calls TO PUBLIC;
GRANT ALL ON whatsapp_poll_results TO PUBLIC;
GRANT ALL ON webhook_failures TO PUBLIC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ WhatsApp webhook tables created successfully!';
    RAISE NOTICE '📊 Tables created:';
    RAISE NOTICE '   - whatsapp_incoming_messages';
    RAISE NOTICE '   - whatsapp_reactions';
    RAISE NOTICE '   - whatsapp_calls';
    RAISE NOTICE '   - whatsapp_poll_results';
    RAISE NOTICE '   - webhook_failures (production monitoring)';
    RAISE NOTICE '🔗 Auto-linking triggers created for customer matching';
END $$;

