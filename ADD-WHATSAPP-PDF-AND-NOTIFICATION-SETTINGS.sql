-- ============================================
-- Add WhatsApp PDF & Enhanced Notification Settings
-- Run this to add new columns to existing tables
-- ============================================

-- ============================================
-- 1. ADD WHATSAPP PDF SETTINGS TO RECEIPT TABLE
-- ============================================

-- Add WhatsApp PDF columns to lats_pos_receipt_settings
ALTER TABLE lats_pos_receipt_settings 
ADD COLUMN IF NOT EXISTS enable_whatsapp_pdf BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_pdf_auto_send BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_pdf_show_preview BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_pdf_format TEXT DEFAULT 'a4',
ADD COLUMN IF NOT EXISTS whatsapp_pdf_quality TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS whatsapp_pdf_include_logo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_pdf_include_images BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_pdf_include_qr BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_pdf_include_barcode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_pdf_message TEXT DEFAULT 'Thank you for your purchase! Please find your receipt attached.',
ADD COLUMN IF NOT EXISTS enable_email_pdf BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_print_pdf BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_download_pdf BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_share_button BOOLEAN DEFAULT true;

-- Add check constraints for format and quality
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_pdf_format_check'
  ) THEN
    ALTER TABLE lats_pos_receipt_settings 
    ADD CONSTRAINT whatsapp_pdf_format_check 
    CHECK (whatsapp_pdf_format IN ('a4', 'letter', 'thermal'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_pdf_quality_check'
  ) THEN
    ALTER TABLE lats_pos_receipt_settings 
    ADD CONSTRAINT whatsapp_pdf_quality_check 
    CHECK (whatsapp_pdf_quality IN ('high', 'standard', 'compressed'));
  END IF;
END $$;

-- ============================================
-- 2. CREATE/UPDATE NOTIFICATION SETTINGS TABLE
-- ============================================

-- Create notification settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS lats_pos_notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID,
  
  -- WhatsApp Text Invoice Settings
  whatsapp_enabled BOOLEAN DEFAULT true,
  whatsapp_auto_send BOOLEAN DEFAULT false,
  whatsapp_show_preview BOOLEAN DEFAULT true,
  whatsapp_include_logo BOOLEAN DEFAULT true,
  whatsapp_include_items BOOLEAN DEFAULT true,
  whatsapp_message TEXT DEFAULT 'Thank you for your purchase! Here''s your invoice:',
  whatsapp_closing_message TEXT DEFAULT '',
  
  -- SMS Invoice Settings
  sms_enabled BOOLEAN DEFAULT true,
  sms_auto_send BOOLEAN DEFAULT false,
  sms_template TEXT DEFAULT 'Thank you! Total: {total}. Balance: {balance}. Ref: {invoice_no}',
  sms_include_total BOOLEAN DEFAULT true,
  sms_include_balance BOOLEAN DEFAULT true,
  
  -- Email Invoice Settings
  email_enabled BOOLEAN DEFAULT true,
  email_auto_send BOOLEAN DEFAULT false,
  email_subject TEXT DEFAULT 'Your Invoice from {business_name}',
  email_template TEXT DEFAULT 'Thank you for your purchase. Please find your invoice attached.',
  email_attach_pdf BOOLEAN DEFAULT true,
  
  -- General Notification Settings
  notify_on_payment BOOLEAN DEFAULT true,
  notify_on_refund BOOLEAN DEFAULT true,
  notify_low_stock BOOLEAN DEFAULT true,
  notify_new_customer BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id 
ON lats_pos_notification_settings(user_id);

-- Add index for business lookups
CREATE INDEX IF NOT EXISTS idx_notification_settings_business_id 
ON lats_pos_notification_settings(business_id);

-- If the table already exists, add missing columns
DO $$ 
BEGIN
  -- Add whatsapp_closing_message if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_pos_notification_settings' 
    AND column_name = 'whatsapp_closing_message'
  ) THEN
    ALTER TABLE lats_pos_notification_settings 
    ADD COLUMN whatsapp_closing_message TEXT DEFAULT '';
  END IF;
END $$;

-- ============================================
-- 3. UPDATE TRIGGER FOR updated_at
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for receipt settings
DROP TRIGGER IF EXISTS update_receipt_settings_updated_at ON lats_pos_receipt_settings;
CREATE TRIGGER update_receipt_settings_updated_at
  BEFORE UPDATE ON lats_pos_receipt_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for notification settings
DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON lats_pos_notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON lats_pos_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. GRANT PERMISSIONS (If using RLS)
-- ============================================

-- Enable RLS
ALTER TABLE lats_pos_receipt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_notification_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own receipt settings" ON lats_pos_receipt_settings;
DROP POLICY IF EXISTS "Users can insert own receipt settings" ON lats_pos_receipt_settings;
DROP POLICY IF EXISTS "Users can update own receipt settings" ON lats_pos_receipt_settings;
DROP POLICY IF EXISTS "Users can delete own receipt settings" ON lats_pos_receipt_settings;

DROP POLICY IF EXISTS "Users can view own notification settings" ON lats_pos_notification_settings;
DROP POLICY IF EXISTS "Users can insert own notification settings" ON lats_pos_notification_settings;
DROP POLICY IF EXISTS "Users can update own notification settings" ON lats_pos_notification_settings;
DROP POLICY IF EXISTS "Users can delete own notification settings" ON lats_pos_notification_settings;

-- Create policies for receipt settings
CREATE POLICY "Users can view own receipt settings"
  ON lats_pos_receipt_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipt settings"
  ON lats_pos_receipt_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipt settings"
  ON lats_pos_receipt_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipt settings"
  ON lats_pos_receipt_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for notification settings
CREATE POLICY "Users can view own notification settings"
  ON lats_pos_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON lats_pos_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON lats_pos_notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification settings"
  ON lats_pos_notification_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Verify receipt settings columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'lats_pos_receipt_settings'
AND column_name LIKE '%whatsapp%'
ORDER BY ordinal_position;

-- Verify notification settings table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'lats_pos_notification_settings'
ORDER BY ordinal_position;

-- ============================================
-- 6. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ WhatsApp PDF & Notification settings tables updated successfully!';
  RAISE NOTICE '📋 Receipt Settings: Added % new columns', (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'lats_pos_receipt_settings' 
    AND column_name LIKE '%whatsapp%'
  );
  RAISE NOTICE '📢 Notification Settings: Table ready with all columns';
  RAISE NOTICE '🔒 Row Level Security policies enabled';
  RAISE NOTICE '🔄 Triggers for updated_at created';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You can now use:';
  RAISE NOTICE '   - WhatsApp PDF receipts (Receipt tab)';
  RAISE NOTICE '   - Enhanced notification templates (Notifications tab)';
  RAISE NOTICE '   - Auto/Manual sending for all channels';
  RAISE NOTICE '   - Full template customization';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Go to POS Settings → Receipt → WhatsApp PDF';
  RAISE NOTICE '   2. Configure your PDF settings';
  RAISE NOTICE '   3. Go to POS Settings → Notifications';
  RAISE NOTICE '   4. Customize your templates';
  RAISE NOTICE '   5. Test and go live! 🚀';
END $$;

