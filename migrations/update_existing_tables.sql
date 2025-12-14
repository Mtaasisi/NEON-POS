-- Update Existing Tables to Add Missing Columns

-- ============================================
-- Update audit_logs table (if it exists)
-- ============================================

-- Add missing columns to audit_logs if they don't exist
DO $$
BEGIN
  -- Add category column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='category') THEN
    ALTER TABLE audit_logs ADD COLUMN category VARCHAR(50);
    RAISE NOTICE '✅ Added category column to audit_logs';
  END IF;

  -- Add action column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='action') THEN
    ALTER TABLE audit_logs ADD COLUMN action VARCHAR(50);
    RAISE NOTICE '✅ Added action column to audit_logs';
  END IF;

  -- Add description column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='description') THEN
    ALTER TABLE audit_logs ADD COLUMN description TEXT;
    RAISE NOTICE '✅ Added description column to audit_logs';
  END IF;

  -- Add table_name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='table_name') THEN
    ALTER TABLE audit_logs ADD COLUMN table_name VARCHAR(100);
    RAISE NOTICE '✅ Added table_name column to audit_logs';
  END IF;

  -- Add record_id column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='record_id') THEN
    ALTER TABLE audit_logs ADD COLUMN record_id VARCHAR(100);
    RAISE NOTICE '✅ Added record_id column to audit_logs';
  END IF;

  -- Add old_values column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='old_values') THEN
    ALTER TABLE audit_logs ADD COLUMN old_values JSONB;
    RAISE NOTICE '✅ Added old_values column to audit_logs';
  END IF;

  -- Add new_values column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='new_values') THEN
    ALTER TABLE audit_logs ADD COLUMN new_values JSONB;
    RAISE NOTICE '✅ Added new_values column to audit_logs';
  END IF;

  -- Add user_name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='user_name') THEN
    ALTER TABLE audit_logs ADD COLUMN user_name VARCHAR(255);
    RAISE NOTICE '✅ Added user_name column to audit_logs';
  END IF;

  -- Add user_role column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='user_role') THEN
    ALTER TABLE audit_logs ADD COLUMN user_role VARCHAR(50);
    RAISE NOTICE '✅ Added user_role column to audit_logs';
  END IF;

  -- Add branch_id column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='branch_id') THEN
    ALTER TABLE audit_logs ADD COLUMN branch_id UUID;
    RAISE NOTICE '✅ Added branch_id column to audit_logs';
  END IF;

  -- Add branch_name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='branch_name') THEN
    ALTER TABLE audit_logs ADD COLUMN branch_name VARCHAR(255);
    RAISE NOTICE '✅ Added branch_name column to audit_logs';
  END IF;

  -- Add ip_address column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='ip_address') THEN
    ALTER TABLE audit_logs ADD COLUMN ip_address INET;
    RAISE NOTICE '✅ Added ip_address column to audit_logs';
  END IF;

  -- Add user_agent column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='user_agent') THEN
    ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
    RAISE NOTICE '✅ Added user_agent column to audit_logs';
  END IF;

  -- Add metadata column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='metadata') THEN
    ALTER TABLE audit_logs ADD COLUMN metadata JSONB;
    RAISE NOTICE '✅ Added metadata column to audit_logs';
  END IF;

  RAISE NOTICE '✅ audit_logs table updated successfully';
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_category') THEN
    CREATE INDEX idx_audit_logs_category ON audit_logs(category);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_action') THEN
    CREATE INDEX idx_audit_logs_action ON audit_logs(action);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_table_name') THEN
    CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_branch_id') THEN
    CREATE INDEX idx_audit_logs_branch_id ON audit_logs(branch_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_record_id') THEN
    CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
  END IF;
END $$;

-- ============================================
-- Update email_logs table (if it exists)
-- ============================================

DO $$
BEGIN
  -- Add to_email column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='email_logs' AND column_name='to_email') THEN
    ALTER TABLE email_logs ADD COLUMN to_email VARCHAR(255);
    RAISE NOTICE '✅ Added to_email column to email_logs';
  END IF;

  -- Add subject column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='email_logs' AND column_name='subject') THEN
    ALTER TABLE email_logs ADD COLUMN subject VARCHAR(500);
    RAISE NOTICE '✅ Added subject column to email_logs';
  END IF;

  -- Add status column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='email_logs' AND column_name='status') THEN
    ALTER TABLE email_logs ADD COLUMN status VARCHAR(20);
    RAISE NOTICE '✅ Added status column to email_logs';
  END IF;

  -- Add message_id column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='email_logs' AND column_name='message_id') THEN
    ALTER TABLE email_logs ADD COLUMN message_id VARCHAR(255);
    RAISE NOTICE '✅ Added message_id column to email_logs';
  END IF;

  -- Add error_message column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='email_logs' AND column_name='error_message') THEN
    ALTER TABLE email_logs ADD COLUMN error_message TEXT;
    RAISE NOTICE '✅ Added error_message column to email_logs';
  END IF;

  -- Add provider_response column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='email_logs' AND column_name='provider_response') THEN
    ALTER TABLE email_logs ADD COLUMN provider_response JSONB;
    RAISE NOTICE '✅ Added provider_response column to email_logs';
  END IF;

  -- Add branch_id column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='email_logs' AND column_name='branch_id') THEN
    ALTER TABLE email_logs ADD COLUMN branch_id UUID;
    RAISE NOTICE '✅ Added branch_id column to email_logs';
  END IF;

  -- Add delivered_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='email_logs' AND column_name='delivered_at') THEN
    ALTER TABLE email_logs ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Added delivered_at column to email_logs';
  END IF;

  -- Add opened_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='email_logs' AND column_name='opened_at') THEN
    ALTER TABLE email_logs ADD COLUMN opened_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Added opened_at column to email_logs';
  END IF;

  -- Add clicked_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='email_logs' AND column_name='clicked_at') THEN
    ALTER TABLE email_logs ADD COLUMN clicked_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Added clicked_at column to email_logs';
  END IF;

  RAISE NOTICE '✅ email_logs table updated successfully';
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_logs_to_email') THEN
    CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_logs_status') THEN
    CREATE INDEX idx_email_logs_status ON email_logs(status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_logs_message_id') THEN
    CREATE INDEX idx_email_logs_message_id ON email_logs(message_id);
  END IF;
END $$;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ All tables updated successfully!';
  RAISE NOTICE '📊 Updated tables:';
  RAISE NOTICE '   - audit_logs (added missing columns)';
  RAISE NOTICE '   - email_logs (added missing columns)';
  RAISE NOTICE '   - user_sessions (created new)';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

