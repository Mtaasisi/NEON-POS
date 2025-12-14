-- ============================================
-- CREATE SCHEDULED TRANSFERS SYSTEM
-- Date: October 25, 2025
-- ============================================

-- Create scheduled_transfers table
CREATE TABLE IF NOT EXISTS scheduled_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Account information
  source_account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  destination_account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  
  -- Transfer details
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  reference_prefix VARCHAR(50) DEFAULT 'SCHED-TRF',
  
  -- Schedule configuration
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means no end date
  next_execution_date DATE NOT NULL,
  last_executed_date DATE,
  
  -- Execution settings
  auto_execute BOOLEAN DEFAULT true,
  notification_enabled BOOLEAN DEFAULT true,
  notification_days_before INTEGER DEFAULT 1,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_transfers_source_account ON scheduled_transfers(source_account_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_transfers_destination_account ON scheduled_transfers(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_transfers_next_execution ON scheduled_transfers(next_execution_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_transfers_active ON scheduled_transfers(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_transfers_frequency ON scheduled_transfers(frequency);

-- Create transfer execution log table
CREATE TABLE IF NOT EXISTS scheduled_transfer_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_transfer_id UUID NOT NULL REFERENCES scheduled_transfers(id) ON DELETE CASCADE,
  
  -- Execution details
  execution_date TIMESTAMPTZ DEFAULT NOW(),
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'skipped')),
  
  -- Transaction references
  source_transaction_id UUID REFERENCES account_transactions(id),
  destination_transaction_id UUID REFERENCES account_transactions(id),
  
  -- Error tracking
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for execution log
CREATE INDEX IF NOT EXISTS idx_scheduled_transfer_executions_schedule ON scheduled_transfer_executions(scheduled_transfer_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_transfer_executions_status ON scheduled_transfer_executions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_transfer_executions_date ON scheduled_transfer_executions(execution_date);

-- Function to calculate next execution date
CREATE OR REPLACE FUNCTION calculate_next_execution_date(
  p_frequency VARCHAR,
  p_current_date DATE
) RETURNS DATE AS $$
BEGIN
  RETURN CASE p_frequency
    WHEN 'daily' THEN p_current_date + INTERVAL '1 day'
    WHEN 'weekly' THEN p_current_date + INTERVAL '1 week'
    WHEN 'biweekly' THEN p_current_date + INTERVAL '2 weeks'
    WHEN 'monthly' THEN p_current_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN p_current_date + INTERVAL '3 months'
    WHEN 'yearly' THEN p_current_date + INTERVAL '1 year'
    ELSE p_current_date + INTERVAL '1 month'
  END::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to execute scheduled transfer
CREATE OR REPLACE FUNCTION execute_scheduled_transfer(p_scheduled_transfer_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, execution_id UUID) AS $$
DECLARE
  v_schedule RECORD;
  v_source_balance DECIMAL(15, 2);
  v_dest_balance DECIMAL(15, 2);
  v_new_source_balance DECIMAL(15, 2);
  v_new_dest_balance DECIMAL(15, 2);
  v_reference_number TEXT;
  v_source_transaction_id UUID;
  v_dest_transaction_id UUID;
  v_execution_id UUID;
BEGIN
  -- Get scheduled transfer details
  SELECT * INTO v_schedule
  FROM scheduled_transfers
  WHERE id = p_scheduled_transfer_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Scheduled transfer not found or inactive'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if execution date has arrived
  IF v_schedule.next_execution_date > CURRENT_DATE THEN
    RETURN QUERY SELECT false, 'Execution date not yet reached'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if end date has passed
  IF v_schedule.end_date IS NOT NULL AND CURRENT_DATE > v_schedule.end_date THEN
    -- Deactivate the schedule
    UPDATE scheduled_transfers SET is_active = false WHERE id = p_scheduled_transfer_id;
    RETURN QUERY SELECT false, 'Schedule has ended'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Get account balances
  SELECT balance INTO v_source_balance
  FROM finance_accounts WHERE id = v_schedule.source_account_id;
  
  SELECT balance INTO v_dest_balance
  FROM finance_accounts WHERE id = v_schedule.destination_account_id;
  
  -- Check sufficient balance
  IF v_source_balance < v_schedule.amount THEN
    -- Log failed execution
    INSERT INTO scheduled_transfer_executions (
      scheduled_transfer_id, amount, status, error_message
    ) VALUES (
      p_scheduled_transfer_id, v_schedule.amount, 'failed', 
      'Insufficient balance in source account'
    ) RETURNING id INTO v_execution_id;
    
    RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, v_execution_id;
    RETURN;
  END IF;
  
  -- Calculate new balances
  v_new_source_balance := v_source_balance - v_schedule.amount;
  v_new_dest_balance := v_dest_balance + v_schedule.amount;
  
  -- Generate reference number
  v_reference_number := v_schedule.reference_prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(v_schedule.execution_count::TEXT, 4, '0');
  
  -- Update source account balance
  UPDATE finance_accounts 
  SET balance = v_new_source_balance, updated_at = NOW()
  WHERE id = v_schedule.source_account_id;
  
  -- Update destination account balance
  UPDATE finance_accounts 
  SET balance = v_new_dest_balance, updated_at = NOW()
  WHERE id = v_schedule.destination_account_id;
  
  -- Create source transaction
  INSERT INTO account_transactions (
    account_id, transaction_type, amount, 
    balance_before, balance_after, description, reference_number,
    metadata, created_at
  ) VALUES (
    v_schedule.source_account_id, 'transfer_out', v_schedule.amount,
    v_source_balance, v_new_source_balance,
    'Scheduled Transfer: ' || v_schedule.description,
    v_reference_number,
    jsonb_build_object(
      'scheduled_transfer_id', p_scheduled_transfer_id,
      'transfer_type', 'outgoing',
      'destination_account_id', v_schedule.destination_account_id,
      'auto_executed', true
    ),
    NOW()
  ) RETURNING id INTO v_source_transaction_id;
  
  -- Create destination transaction
  INSERT INTO account_transactions (
    account_id, transaction_type, amount,
    balance_before, balance_after, description, reference_number,
    metadata, created_at
  ) VALUES (
    v_schedule.destination_account_id, 'transfer_in', v_schedule.amount,
    v_dest_balance, v_new_dest_balance,
    'Scheduled Transfer: ' || v_schedule.description,
    v_reference_number,
    jsonb_build_object(
      'scheduled_transfer_id', p_scheduled_transfer_id,
      'transfer_type', 'incoming',
      'source_account_id', v_schedule.source_account_id,
      'auto_executed', true
    ),
    NOW()
  ) RETURNING id INTO v_dest_transaction_id;
  
  -- Log successful execution
  INSERT INTO scheduled_transfer_executions (
    scheduled_transfer_id, amount, status,
    source_transaction_id, destination_transaction_id
  ) VALUES (
    p_scheduled_transfer_id, v_schedule.amount, 'success',
    v_source_transaction_id, v_dest_transaction_id
  ) RETURNING id INTO v_execution_id;
  
  -- Update scheduled transfer
  UPDATE scheduled_transfers
  SET 
    last_executed_date = CURRENT_DATE,
    next_execution_date = calculate_next_execution_date(frequency, next_execution_date),
    execution_count = execution_count + 1,
    updated_at = NOW()
  WHERE id = p_scheduled_transfer_id;
  
  RETURN QUERY SELECT true, 'Transfer executed successfully'::TEXT, v_execution_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get due scheduled transfers
CREATE OR REPLACE FUNCTION get_due_scheduled_transfers()
RETURNS TABLE(
  id UUID,
  source_account_name TEXT,
  destination_account_name TEXT,
  amount DECIMAL,
  description TEXT,
  next_execution_date DATE,
  frequency VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id,
    sa.name as source_account_name,
    da.name as destination_account_name,
    st.amount,
    st.description,
    st.next_execution_date,
    st.frequency
  FROM scheduled_transfers st
  JOIN finance_accounts sa ON st.source_account_id = sa.id
  JOIN finance_accounts da ON st.destination_account_id = da.id
  WHERE st.is_active = true
    AND st.auto_execute = true
    AND st.next_execution_date <= CURRENT_DATE
    AND (st.end_date IS NULL OR st.end_date >= CURRENT_DATE)
  ORDER BY st.next_execution_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_scheduled_transfers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp
DROP TRIGGER IF EXISTS trigger_update_scheduled_transfers_timestamp ON scheduled_transfers;
CREATE TRIGGER trigger_update_scheduled_transfers_timestamp
  BEFORE UPDATE ON scheduled_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_transfers_timestamp();

-- Add comments for documentation
COMMENT ON TABLE scheduled_transfers IS 'Stores recurring scheduled transfers between accounts';
COMMENT ON TABLE scheduled_transfer_executions IS 'Logs execution history of scheduled transfers';
COMMENT ON FUNCTION execute_scheduled_transfer IS 'Executes a scheduled transfer and logs the result';
COMMENT ON FUNCTION get_due_scheduled_transfers IS 'Returns all scheduled transfers that are due for execution';

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON scheduled_transfers TO authenticated;
-- GRANT ALL ON scheduled_transfer_executions TO authenticated;

SELECT '✅ Scheduled transfers system created successfully!' as status;

