-- Create daily_reports table for employee daily and monthly reports
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,

  -- Report metadata
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'monthly')),
  report_date DATE NOT NULL,
  report_month DATE NULL, -- For monthly reports, stores the first day of the month

  -- Report content (Swahili language)
  title TEXT NOT NULL, -- e.g., "REPORT YA LEO", "REPORT YA MWEZI"
  customer_interactions TEXT, -- Customer service activities
  pending_work TEXT, -- Work that needs to be completed
  recommendations TEXT, -- Suggestions for improvement
  additional_notes TEXT, -- Any other notes

  -- Quick stats (optional numeric data)
  customers_served INTEGER DEFAULT 0,
  sales_made INTEGER DEFAULT 0,
  issues_resolved INTEGER DEFAULT 0,
  pending_tasks INTEGER DEFAULT 0,

  -- Status and metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved')),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,

  -- Auto-timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_reports_user_id ON daily_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_branch_id ON daily_reports(branch_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_month ON daily_reports(report_month);
CREATE INDEX IF NOT EXISTS idx_daily_reports_type ON daily_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON daily_reports(status);

-- Enable RLS (Row Level Security)
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own reports, admins can see all reports
CREATE POLICY "Users can view own reports" ON daily_reports
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Users can insert own reports" ON daily_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports" ON daily_reports
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add branch isolation for reports (if branch sharing is disabled)
CREATE POLICY "Branch isolation for reports" ON daily_reports
  FOR ALL USING (
    branch_id IS NULL OR
    branch_id IN (
      SELECT id FROM store_locations
      WHERE id = (SELECT (auth.jwt()->>'branch_id')::UUID)
      OR share_reports = true
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_daily_reports_updated_at
  BEFORE UPDATE ON daily_reports
  FOR EACH ROW EXECUTE FUNCTION update_daily_reports_updated_at();

-- Add helpful comments
COMMENT ON TABLE daily_reports IS 'Employee daily and monthly reports in Swahili';
COMMENT ON COLUMN daily_reports.report_type IS 'Type of report: daily or monthly';
COMMENT ON COLUMN daily_reports.report_date IS 'Date of the report (for daily reports)';
COMMENT ON COLUMN daily_reports.report_month IS 'Month of the report (for monthly reports)';
COMMENT ON COLUMN daily_reports.customer_interactions IS 'Customer service activities and interactions';
COMMENT ON COLUMN daily_reports.pending_work IS 'Work that needs to be completed';
COMMENT ON COLUMN daily_reports.recommendations IS 'Suggestions for improvement';
COMMENT ON COLUMN daily_reports.status IS 'Report status: draft, submitted, reviewed, approved';
