-- ============================================================================
-- ENSURE ALL NEW RECORDS IN UPDATED TABLES ARE ALWAYS ISOLATED WITH BRANCH_ID
-- ============================================================================
-- This script creates triggers to automatically assign branch_id to new records
-- in the tables we just added branch_id columns to.
-- ============================================================================

-- ============================================================================
-- 1. LOGGING TABLES
-- ============================================================================

-- whatsapp_incoming_messages
DROP TRIGGER IF EXISTS ensure_whatsapp_incoming_messages_isolation ON whatsapp_incoming_messages;
DROP FUNCTION IF EXISTS ensure_whatsapp_incoming_messages_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_incoming_messages_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_incoming_messages_isolation
  BEFORE INSERT ON whatsapp_incoming_messages
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_incoming_messages_isolation();

COMMENT ON FUNCTION ensure_whatsapp_incoming_messages_isolation() IS 'Ensures all new WhatsApp incoming messages have branch_id assigned';

-- whatsapp_reactions
DROP TRIGGER IF EXISTS ensure_whatsapp_reactions_isolation ON whatsapp_reactions;
DROP FUNCTION IF EXISTS ensure_whatsapp_reactions_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_reactions_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_reactions_isolation
  BEFORE INSERT ON whatsapp_reactions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_reactions_isolation();

-- whatsapp_calls
DROP TRIGGER IF EXISTS ensure_whatsapp_calls_isolation ON whatsapp_calls;
DROP FUNCTION IF EXISTS ensure_whatsapp_calls_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_calls_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_calls_isolation
  BEFORE INSERT ON whatsapp_calls
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_calls_isolation();

-- whatsapp_poll_results
DROP TRIGGER IF EXISTS ensure_whatsapp_poll_results_isolation ON whatsapp_poll_results;
DROP FUNCTION IF EXISTS ensure_whatsapp_poll_results_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_poll_results_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_poll_results_isolation
  BEFORE INSERT ON whatsapp_poll_results
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_poll_results_isolation();

-- ============================================================================
-- 2. COMMUNICATION TABLES
-- ============================================================================

-- whatsapp_campaigns
DROP TRIGGER IF EXISTS ensure_whatsapp_campaigns_isolation ON whatsapp_campaigns;
DROP FUNCTION IF EXISTS ensure_whatsapp_campaigns_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_campaigns_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_campaigns_isolation
  BEFORE INSERT ON whatsapp_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_campaigns_isolation();

-- whatsapp_scheduled_campaigns
DROP TRIGGER IF EXISTS ensure_whatsapp_scheduled_campaigns_isolation ON whatsapp_scheduled_campaigns;
DROP FUNCTION IF EXISTS ensure_whatsapp_scheduled_campaigns_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_scheduled_campaigns_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  campaign_branch_id UUID;
BEGIN
  -- Try to get branch_id from related campaign
  IF NEW.branch_id IS NULL AND NEW.campaign_id IS NOT NULL THEN
    SELECT branch_id INTO campaign_branch_id
    FROM whatsapp_campaigns
    WHERE id = NEW.campaign_id;
    
    IF campaign_branch_id IS NOT NULL THEN
      NEW.branch_id := campaign_branch_id;
    END IF;
  END IF;
  
  -- If still no branch_id, get default
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_scheduled_campaigns_isolation
  BEFORE INSERT ON whatsapp_scheduled_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_scheduled_campaigns_isolation();

-- whatsapp_customer_segments
DROP TRIGGER IF EXISTS ensure_whatsapp_customer_segments_isolation ON whatsapp_customer_segments;
DROP FUNCTION IF EXISTS ensure_whatsapp_customer_segments_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_customer_segments_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_customer_segments_isolation
  BEFORE INSERT ON whatsapp_customer_segments
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_customer_segments_isolation();

-- whatsapp_campaign_metrics
DROP TRIGGER IF EXISTS ensure_whatsapp_campaign_metrics_isolation ON whatsapp_campaign_metrics;
DROP FUNCTION IF EXISTS ensure_whatsapp_campaign_metrics_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_campaign_metrics_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  campaign_branch_id UUID;
BEGIN
  -- Try to get branch_id from related campaign
  IF NEW.branch_id IS NULL AND NEW.campaign_id IS NOT NULL THEN
    SELECT branch_id INTO campaign_branch_id
    FROM whatsapp_campaigns
    WHERE id = NEW.campaign_id;
    
    IF campaign_branch_id IS NOT NULL THEN
      NEW.branch_id := campaign_branch_id;
    END IF;
  END IF;
  
  -- If still no branch_id, get default
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_campaign_metrics_isolation
  BEFORE INSERT ON whatsapp_campaign_metrics
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_campaign_metrics_isolation();

-- whatsapp_failed_queue
DROP TRIGGER IF EXISTS ensure_whatsapp_failed_queue_isolation ON whatsapp_failed_queue;
DROP FUNCTION IF EXISTS ensure_whatsapp_failed_queue_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_failed_queue_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_failed_queue_isolation
  BEFORE INSERT ON whatsapp_failed_queue
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_failed_queue_isolation();

-- whatsapp_blacklist
DROP TRIGGER IF EXISTS ensure_whatsapp_blacklist_isolation ON whatsapp_blacklist;
DROP FUNCTION IF EXISTS ensure_whatsapp_blacklist_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_blacklist_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_blacklist_isolation
  BEFORE INSERT ON whatsapp_blacklist
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_blacklist_isolation();

-- whatsapp_media_library
DROP TRIGGER IF EXISTS ensure_whatsapp_media_library_isolation ON whatsapp_media_library;
DROP FUNCTION IF EXISTS ensure_whatsapp_media_library_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_media_library_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_media_library_isolation
  BEFORE INSERT ON whatsapp_media_library
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_media_library_isolation();

-- whatsapp_reply_templates
DROP TRIGGER IF EXISTS ensure_whatsapp_reply_templates_isolation ON whatsapp_reply_templates;
DROP FUNCTION IF EXISTS ensure_whatsapp_reply_templates_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_reply_templates_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_reply_templates_isolation
  BEFORE INSERT ON whatsapp_reply_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_reply_templates_isolation();

-- whatsapp_ab_tests
DROP TRIGGER IF EXISTS ensure_whatsapp_ab_tests_isolation ON whatsapp_ab_tests;
DROP FUNCTION IF EXISTS ensure_whatsapp_ab_tests_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_ab_tests_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_ab_tests_isolation
  BEFORE INSERT ON whatsapp_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_ab_tests_isolation();

-- whatsapp_bulk_campaigns
DROP TRIGGER IF EXISTS ensure_whatsapp_bulk_campaigns_isolation ON whatsapp_bulk_campaigns;
DROP FUNCTION IF EXISTS ensure_whatsapp_bulk_campaigns_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_bulk_campaigns_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_bulk_campaigns_isolation
  BEFORE INSERT ON whatsapp_bulk_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_bulk_campaigns_isolation();

-- campaign_notifications
DROP TRIGGER IF EXISTS ensure_campaign_notifications_isolation ON campaign_notifications;
DROP FUNCTION IF EXISTS ensure_campaign_notifications_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_campaign_notifications_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_campaign_notifications_isolation
  BEFORE INSERT ON campaign_notifications
  FOR EACH ROW
  EXECUTE FUNCTION ensure_campaign_notifications_isolation();

-- scheduled_message_executions
DROP TRIGGER IF EXISTS ensure_scheduled_message_executions_isolation ON scheduled_message_executions;
DROP FUNCTION IF EXISTS ensure_scheduled_message_executions_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_scheduled_message_executions_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  message_branch_id UUID;
BEGIN
  -- Try to get branch_id from related scheduled message
  IF NEW.branch_id IS NULL AND NEW.scheduled_message_id IS NOT NULL THEN
    SELECT branch_id INTO message_branch_id
    FROM scheduled_bulk_messages
    WHERE id = NEW.scheduled_message_id;
    
    IF message_branch_id IS NOT NULL THEN
      NEW.branch_id := message_branch_id;
    END IF;
  END IF;
  
  -- If still no branch_id, get default
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_scheduled_message_executions_isolation
  BEFORE INSERT ON scheduled_message_executions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_scheduled_message_executions_isolation();

-- ============================================================================
-- 3. SESSION TABLES
-- ============================================================================

-- user_sessions
DROP TRIGGER IF EXISTS ensure_user_sessions_isolation ON user_sessions;
DROP FUNCTION IF EXISTS ensure_user_sessions_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_user_sessions_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  user_branch_id UUID;
BEGIN
  -- Try to get branch_id from user's branch assignment
  IF NEW.branch_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT branch_id INTO user_branch_id
    FROM user_branch_assignments
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF user_branch_id IS NOT NULL THEN
      NEW.branch_id := user_branch_id;
    END IF;
  END IF;
  
  -- If still no branch_id, get default
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_user_sessions_isolation
  BEFORE INSERT ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_sessions_isolation();

-- whatsapp_sessions
DROP TRIGGER IF EXISTS ensure_whatsapp_sessions_isolation ON whatsapp_sessions;
DROP FUNCTION IF EXISTS ensure_whatsapp_sessions_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_sessions_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_sessions_isolation
  BEFORE INSERT ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_sessions_isolation();

-- whatsapp_session_logs
DROP TRIGGER IF EXISTS ensure_whatsapp_session_logs_isolation ON whatsapp_session_logs;
DROP FUNCTION IF EXISTS ensure_whatsapp_session_logs_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_session_logs_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  session_branch_id UUID;
BEGIN
  -- Try to get branch_id from related session
  IF NEW.branch_id IS NULL AND NEW.session_id IS NOT NULL THEN
    SELECT branch_id INTO session_branch_id
    FROM whatsapp_sessions
    WHERE id = NEW.session_id;
    
    IF session_branch_id IS NOT NULL THEN
      NEW.branch_id := session_branch_id;
    END IF;
  END IF;
  
  -- If still no branch_id, get default
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_session_logs_isolation
  BEFORE INSERT ON whatsapp_session_logs
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_session_logs_isolation();

-- user_whatsapp_preferences
DROP TRIGGER IF EXISTS ensure_user_whatsapp_preferences_isolation ON user_whatsapp_preferences;
DROP FUNCTION IF EXISTS ensure_user_whatsapp_preferences_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_user_whatsapp_preferences_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  user_branch_id UUID;
BEGIN
  -- Try to get branch_id from user's branch assignment
  IF NEW.branch_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT branch_id INTO user_branch_id
    FROM user_branch_assignments
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF user_branch_id IS NOT NULL THEN
      NEW.branch_id := user_branch_id;
    END IF;
  END IF;
  
  -- If still no branch_id, get default
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_user_whatsapp_preferences_isolation
  BEFORE INSERT ON user_whatsapp_preferences
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_whatsapp_preferences_isolation();

-- webhook_failures
DROP TRIGGER IF EXISTS ensure_webhook_failures_isolation ON webhook_failures;
DROP FUNCTION IF EXISTS ensure_webhook_failures_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_webhook_failures_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_webhook_failures_isolation
  BEFORE INSERT ON webhook_failures
  FOR EACH ROW
  EXECUTE FUNCTION ensure_webhook_failures_isolation();

-- whatsapp_api_health
DROP TRIGGER IF EXISTS ensure_whatsapp_api_health_isolation ON whatsapp_api_health;
DROP FUNCTION IF EXISTS ensure_whatsapp_api_health_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_whatsapp_api_health_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_whatsapp_api_health_isolation
  BEFORE INSERT ON whatsapp_api_health
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_api_health_isolation();

-- ============================================================================
-- 4. OPERATIONAL TABLES
-- ============================================================================

-- daily_opening_sessions
DROP TRIGGER IF EXISTS ensure_daily_opening_sessions_isolation ON daily_opening_sessions;
DROP FUNCTION IF EXISTS ensure_daily_opening_sessions_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_daily_opening_sessions_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_daily_opening_sessions_isolation
  BEFORE INSERT ON daily_opening_sessions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_daily_opening_sessions_isolation();

-- daily_sales_closures
DROP TRIGGER IF EXISTS ensure_daily_sales_closures_isolation ON daily_sales_closures;
DROP FUNCTION IF EXISTS ensure_daily_sales_closures_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_daily_sales_closures_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_daily_sales_closures_isolation
  BEFORE INSERT ON daily_sales_closures
  FOR EACH ROW
  EXECUTE FUNCTION ensure_daily_sales_closures_isolation();

-- lats_spare_parts
DROP TRIGGER IF EXISTS ensure_lats_spare_parts_isolation ON lats_spare_parts;
DROP FUNCTION IF EXISTS ensure_lats_spare_parts_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_lats_spare_parts_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_lats_spare_parts_isolation
  BEFORE INSERT ON lats_spare_parts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_lats_spare_parts_isolation();

-- purchase_order_quality_checks
DROP TRIGGER IF EXISTS ensure_purchase_order_quality_checks_isolation ON purchase_order_quality_checks;
DROP FUNCTION IF EXISTS ensure_purchase_order_quality_checks_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_purchase_order_quality_checks_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  po_branch_id UUID;
BEGIN
  -- Try to get branch_id from related purchase order
  IF NEW.branch_id IS NULL AND NEW.purchase_order_id IS NOT NULL THEN
    SELECT branch_id INTO po_branch_id
    FROM lats_purchase_orders
    WHERE id = NEW.purchase_order_id;
    
    IF po_branch_id IS NOT NULL THEN
      NEW.branch_id := po_branch_id;
    END IF;
  END IF;
  
  -- If still no branch_id, get default
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_purchase_order_quality_checks_isolation
  BEFORE INSERT ON purchase_order_quality_checks
  FOR EACH ROW
  EXECUTE FUNCTION ensure_purchase_order_quality_checks_isolation();

-- scheduled_transfers
DROP TRIGGER IF EXISTS ensure_scheduled_transfers_isolation ON scheduled_transfers;
DROP FUNCTION IF EXISTS ensure_scheduled_transfers_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_scheduled_transfers_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_scheduled_transfers_isolation
  BEFORE INSERT ON scheduled_transfers
  FOR EACH ROW
  EXECUTE FUNCTION ensure_scheduled_transfers_isolation();

-- scheduled_transfer_executions
DROP TRIGGER IF EXISTS ensure_scheduled_transfer_executions_isolation ON scheduled_transfer_executions;
DROP FUNCTION IF EXISTS ensure_scheduled_transfer_executions_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_scheduled_transfer_executions_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  transfer_branch_id UUID;
BEGIN
  -- Try to get branch_id from related scheduled transfer
  IF NEW.branch_id IS NULL AND NEW.scheduled_transfer_id IS NOT NULL THEN
    SELECT branch_id INTO transfer_branch_id
    FROM scheduled_transfers
    WHERE id = NEW.scheduled_transfer_id;
    
    IF transfer_branch_id IS NOT NULL THEN
      NEW.branch_id := transfer_branch_id;
    END IF;
  END IF;
  
  -- If still no branch_id, get default
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_scheduled_transfer_executions_isolation
  BEFORE INSERT ON scheduled_transfer_executions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_scheduled_transfer_executions_isolation();

-- lats_purchase_order_audit_log
DROP TRIGGER IF EXISTS ensure_lats_purchase_order_audit_log_isolation ON lats_purchase_order_audit_log;
DROP FUNCTION IF EXISTS ensure_lats_purchase_order_audit_log_isolation() CASCADE;

CREATE OR REPLACE FUNCTION ensure_lats_purchase_order_audit_log_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  po_branch_id UUID;
BEGIN
  -- Try to get branch_id from related purchase order
  IF NEW.branch_id IS NULL AND NEW.purchase_order_id IS NOT NULL THEN
    SELECT branch_id INTO po_branch_id
    FROM lats_purchase_orders
    WHERE id = NEW.purchase_order_id;
    
    IF po_branch_id IS NOT NULL THEN
      NEW.branch_id := po_branch_id;
    END IF;
  END IF;
  
  -- If still no branch_id, get default
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_lats_purchase_order_audit_log_isolation
  BEFORE INSERT ON lats_purchase_order_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION ensure_lats_purchase_order_audit_log_isolation();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all triggers were created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%_isolation'
ORDER BY event_object_table, trigger_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ ALL ISOLATION TRIGGERS CREATED SUCCESSFULLY!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'All new records in these tables will now automatically';
  RAISE NOTICE 'have branch_id assigned, even if application code';
  RAISE NOTICE 'doesn''t set it explicitly.';
  RAISE NOTICE '';
END $$;
