-- Create missing database functions for connection fixes

-- Function to create user_settings table
CREATE OR REPLACE FUNCTION create_user_settings_table()
RETURNS void AS $$
BEGIN
  -- Create user_settings table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') THEN
    CREATE TABLE user_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_settings_created_at ON user_settings(created_at);

    -- Create trigger function for updated_at
    CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create trigger
    CREATE TRIGGER trigger_update_user_settings_updated_at
      BEFORE UPDATE ON user_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_user_settings_updated_at();

    -- Enable RLS
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view their own settings" ON user_settings
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own settings" ON user_settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own settings" ON user_settings
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own settings" ON user_settings
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create notifications table
CREATE OR REPLACE FUNCTION create_notifications_table()
RETURNS void AS $$
BEGIN
  -- Create notifications table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      read_at TIMESTAMP WITH TIME ZONE
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

    -- Enable RLS
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view their own notifications" ON notifications
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own notifications" ON notifications
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own notifications" ON notifications
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create session tracking tables
CREATE OR REPLACE FUNCTION create_session_tables()
RETURNS void AS $$
BEGIN
  -- Create daily_opening_sessions table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_opening_sessions') THEN
    CREATE TABLE daily_opening_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      session_date DATE NOT NULL,
      opening_time TIMESTAMP WITH TIME ZONE NOT NULL,
      closing_time TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_user_id ON daily_opening_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_date ON daily_opening_sessions(session_date);
    CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_active ON daily_opening_sessions(is_active);

    -- Enable RLS
    ALTER TABLE daily_opening_sessions ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view their own sessions" ON daily_opening_sessions
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own sessions" ON daily_opening_sessions
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own sessions" ON daily_opening_sessions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- Create daily_sales_closures table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_sales_closures') THEN
    CREATE TABLE daily_sales_closures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      session_id UUID NOT NULL REFERENCES daily_opening_sessions(id) ON DELETE CASCADE,
      closure_date DATE NOT NULL,
      total_sales DECIMAL(10,2) DEFAULT 0,
      total_transactions INTEGER DEFAULT 0,
      closing_time TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_user_id ON daily_sales_closures(user_id);
    CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_session_id ON daily_sales_closures(session_id);
    CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_date ON daily_sales_closures(closure_date);

    -- Enable RLS
    ALTER TABLE daily_sales_closures ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view their own closures" ON daily_sales_closures
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own closures" ON daily_sales_closures
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own closures" ON daily_sales_closures
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to execute SQL safely
CREATE OR REPLACE FUNCTION execute_sql(query TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql;
