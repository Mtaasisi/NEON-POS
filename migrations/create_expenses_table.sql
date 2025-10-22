-- ================================================
-- CREATE EXPENSES TABLE
-- ================================================
-- This migration creates the expenses table for tracking business expenses

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    category TEXT,
    description TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    reference_number TEXT,
    vendor_name TEXT,
    notes TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- Enable row-level security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for expenses table
CREATE POLICY "Enable read access for all users" ON expenses
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON expenses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON expenses
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON expenses
    FOR DELETE USING (true);

-- Add comment
COMMENT ON TABLE expenses IS 'Table for tracking business expenses and operational costs';

