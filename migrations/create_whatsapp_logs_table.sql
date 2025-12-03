-- Create whatsapp_logs table for WhatsApp message logging
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone TEXT NOT NULL,
  message TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  sent_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  device_id UUID,
  customer_id UUID,
  message_id TEXT,
  media_url TEXT,
  branch_id UUID,
  is_shared BOOLEAN DEFAULT false
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient ON whatsapp_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON whatsapp_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_customer ON whatsapp_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_device ON whatsapp_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_branch ON whatsapp_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_shared ON whatsapp_logs(is_shared) WHERE is_shared = true;

-- Add foreign key constraint for branch_id (if store_locations table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_locations') THEN
    ALTER TABLE whatsapp_logs 
    ADD CONSTRAINT whatsapp_logs_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE whatsapp_logs IS 'Stores all WhatsApp messages sent through WasenderAPI';
COMMENT ON COLUMN whatsapp_logs.recipient_phone IS 'Phone number in format: 255XXXXXXXXX (country code + number)';
COMMENT ON COLUMN whatsapp_logs.message_type IS 'Type of message: text, image, video, document, audio, location, contact';
COMMENT ON COLUMN whatsapp_logs.status IS 'Message status: pending, sent, delivered, read, failed';
COMMENT ON COLUMN whatsapp_logs.message_id IS 'WasenderAPI message ID for tracking';

