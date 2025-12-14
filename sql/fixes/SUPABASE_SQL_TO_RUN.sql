[dotenv@17.2.2] injecting env (5) from .env -- tip: 🔐 prevent building .env in docker: https://dotenvx.com/prebuild
🔧 Creating Tables via Supabase RPC...

⚠️  IMPORTANT: This script needs SERVICE_ROLE_KEY
   The ANON_KEY has limited permissions.

📋 MANUAL STEPS REQUIRED:

1. Go to: https://supabase.com/dashboard/project/jxhzveborezjhsmzsgbc
2. Click "SQL Editor" in the left sidebar
3. Click "+ New query"
4. Copy the SQL below and paste it into the editor
5. Click "Run" button

============================================================
📄 SQL TO RUN IN SUPABASE SQL EDITOR:
============================================================


-- Create customer_installment_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_installment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES lats_sales(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES lats_branches(id),
    
    -- Amounts
    total_amount NUMERIC NOT NULL,
    down_payment NUMERIC DEFAULT 0,
    amount_financed NUMERIC NOT NULL,
    total_paid NUMERIC DEFAULT 0,
    balance_due NUMERIC NOT NULL,
    
    -- Payment schedule
    installment_amount NUMERIC NOT NULL,
    number_of_installments INTEGER NOT NULL,
    installments_paid INTEGER DEFAULT 0,
    payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN (
        'weekly', 'bi_weekly', 'monthly', 'custom'
    )),
    
    -- Dates
    start_date DATE NOT NULL,
    next_payment_date DATE NOT NULL,
    end_date DATE NOT NULL,
    completion_date DATE,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active', 'completed', 'defaulted', 'cancelled'
    )),
    
    -- Additional fields
    late_fee_amount NUMERIC DEFAULT 0,
    late_fee_applied NUMERIC DEFAULT 0,
    days_overdue INTEGER DEFAULT 0,
    last_reminder_sent TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,
    terms_accepted BOOLEAN DEFAULT true,
    terms_accepted_date TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create installment_payments table
CREATE TABLE IF NOT EXISTS installment_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_plan_id UUID REFERENCES customer_installment_plans(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    installment_number INTEGER NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT now(),
    due_date DATE NOT NULL,
    
    status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'late', 'waived')),
    days_late INTEGER DEFAULT 0,
    late_fee NUMERIC DEFAULT 0,
    
    account_id UUID REFERENCES finance_accounts(id),
    reference_number TEXT,
    
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMPTZ,
    
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE customer_installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now)
DROP POLICY IF EXISTS "Enable read access for all users" ON customer_installment_plans;
CREATE POLICY "Enable read access for all users" 
    ON customer_installment_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON customer_installment_plans;
CREATE POLICY "Enable insert for authenticated users" 
    ON customer_installment_plans FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON customer_installment_plans;
CREATE POLICY "Enable update for authenticated users" 
    ON customer_installment_plans FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON customer_installment_plans;
CREATE POLICY "Enable delete for authenticated users" 
    ON customer_installment_plans FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON installment_payments;
CREATE POLICY "Enable read access for all users" 
    ON installment_payments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON installment_payments;
CREATE POLICY "Enable insert for authenticated users" 
    ON installment_payments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON installment_payments;
CREATE POLICY "Enable update for authenticated users" 
    ON installment_payments FOR UPDATE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_installment_plans_customer ON customer_installment_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_branch ON customer_installment_plans(branch_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_status ON customer_installment_plans(status);
CREATE INDEX IF NOT EXISTS idx_installment_payments_plan ON installment_payments(installment_plan_id);


============================================================
After running the SQL above in Supabase SQL Editor:
1. Refresh your browser
2. Login as care@care.com
3. Go to Installments page
4. You should see your installments!
============================================================

