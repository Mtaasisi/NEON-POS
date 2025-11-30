-- Migration: Add Social Media Columns to lats_pos_general_settings
-- Description: Adds Instagram, TikTok, and WhatsApp fields for business social media handles

-- Add social media columns if they don't exist
ALTER TABLE lats_pos_general_settings
  ADD COLUMN IF NOT EXISTS business_instagram TEXT,
  ADD COLUMN IF NOT EXISTS business_tiktok TEXT,
  ADD COLUMN IF NOT EXISTS business_whatsapp TEXT;

-- Add comments for documentation
COMMENT ON COLUMN lats_pos_general_settings.business_instagram IS 'Instagram handle or URL for the business';
COMMENT ON COLUMN lats_pos_general_settings.business_tiktok IS 'TikTok handle or URL for the business';
COMMENT ON COLUMN lats_pos_general_settings.business_whatsapp IS 'WhatsApp number or link for the business';

