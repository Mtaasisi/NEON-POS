-- ================================================
-- CREATE SPECIAL ORDERS AND INSTALLMENTS TABLES
-- ================================================
-- This migration creates tables for:
-- 1. Customer special orders (pre-orders/imports)
-- 2. Installment payment plans

-- ================================================
-- SPECIAL ORDERS (PRE-ORDERS/IMPORTS)
-- ================================================

CREATE TABLE IF NOT EXISTS customer_special_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    
    -- Product details
    product_name TEXT NOT NULL,
    product_description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    
    -- Payment tracking
    deposit_paid NUMERIC DEFAULT 0,
    balance_due NUMERIC DEFAULT 0,
    
    -- Order status workflow
    status TEXT DEFAULT 'deposit_received' CHECK (status IN (
        'deposit_received',
        'ordered',
        'in_transit',
        'arrived',
        'ready_for_pickup',
        'delivered',
        'cancelled'
    )),
    
    -- Dates
    order_date TIMESTAMPTZ DEFAULT now(),
    expected_arrival_date DATE,
    actual_arrival_date DATE,
    delivery_date TIMESTAMPTZ,
    
    -- Supplier/Origin info
    supplier_name TEXT,
    supplier_reference TEXT,
    country_of_origin TEXT,
    tracking_number TEXT,
    
    -- Additional info
    notes TEXT,
    internal_notes TEXT,
    customer_notified_arrival BOOLEAN DEFAULT false,
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payments for special orders
CREATE TABLE IF NOT EXISTS special_order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    special_order_id UUID REFERENCES customer_special_orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT now(),
    reference_number TEXT,
    account_id UUID REFERENCES finance_accounts(id),
    
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- INSTALLMENT PAYMENT PLANS
-- ================================================

CREATE TABLE IF NOT EXISTS customer_installment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES lats_sales(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    
    -- Amounts
    total_amount NUMERIC NOT NULL,
    down_payment NUMERIC DEFAULT 0,
    amount_financed NUMERIC NOT NULL, -- total_amount - down_payment
    total_paid NUMERIC DEFAULT 0,
    balance_due NUMERIC NOT NULL,
    
    -- Payment schedule
    installment_amount NUMERIC NOT NULL, -- amount per installment
    number_of_installments INTEGER NOT NULL,
    installments_paid INTEGER DEFAULT 0,
    payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN (
        'weekly',
        'bi_weekly',
        'monthly',
        'custom'
    )),
    
    -- Dates
    start_date DATE NOT NULL,
    next_payment_date DATE NOT NULL,
    end_date DATE NOT NULL,
    completion_date DATE,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active',
        'completed',
        'defaulted',
        'cancelled'
    )),
    
    -- Penalties and late fees
    late_fee_amount NUMERIC DEFAULT 0,
    late_fee_applied NUMERIC DEFAULT 0,
    days_overdue INTEGER DEFAULT 0,
    
    -- Notifications
    last_reminder_sent TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,
    
    -- Terms
    terms_accepted BOOLEAN DEFAULT true,
    terms_accepted_date TIMESTAMPTZ DEFAULT now(),
    
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual installment payments
CREATE TABLE IF NOT EXISTS installment_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_plan_id UUID REFERENCES customer_installment_plans(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Payment info
    installment_number INTEGER NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT now(),
    due_date DATE NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'late', 'waived')),
    days_late INTEGER DEFAULT 0,
    late_fee NUMERIC DEFAULT 0,
    
    -- Finance tracking
    account_id UUID REFERENCES finance_accounts(id),
    reference_number TEXT,
    
    -- Notification
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMPTZ,
    
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Special Orders
CREATE INDEX IF NOT EXISTS idx_special_orders_customer ON customer_special_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_special_orders_branch ON customer_special_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_special_orders_status ON customer_special_orders(status);
CREATE INDEX IF NOT EXISTS idx_special_orders_order_date ON customer_special_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_special_orders_expected_arrival ON customer_special_orders(expected_arrival_date);
CREATE INDEX IF NOT EXISTS idx_special_order_payments_order ON special_order_payments(special_order_id);

-- Installment Plans
CREATE INDEX IF NOT EXISTS idx_installment_plans_customer ON customer_installment_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_branch ON customer_installment_plans(branch_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_sale ON customer_installment_plans(sale_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_status ON customer_installment_plans(status);
CREATE INDEX IF NOT EXISTS idx_installment_plans_next_payment ON customer_installment_plans(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_installment_payments_plan ON installment_payments(installment_plan_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_customer ON installment_payments(customer_id);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

ALTER TABLE customer_special_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_payments ENABLE ROW LEVEL SECURITY;

-- Policies for special orders
CREATE POLICY "Enable read access for all users" ON customer_special_orders FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON customer_special_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON customer_special_orders FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON customer_special_orders FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON special_order_payments FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON special_order_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON special_order_payments FOR UPDATE USING (true);

-- Policies for installment plans
CREATE POLICY "Enable read access for all users" ON customer_installment_plans FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON customer_installment_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON customer_installment_plans FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON customer_installment_plans FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON installment_payments FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON installment_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON installment_payments FOR UPDATE USING (true);

-- ================================================
-- TRIGGERS FOR AUTO-UPDATES
-- ================================================

-- Auto-update special order balance when payment is made
CREATE OR REPLACE FUNCTION update_special_order_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customer_special_orders
    SET 
        deposit_paid = (
            SELECT COALESCE(SUM(amount), 0)
            FROM special_order_payments
            WHERE special_order_id = NEW.special_order_id
        ),
        balance_due = total_amount - (
            SELECT COALESCE(SUM(amount), 0)
            FROM special_order_payments
            WHERE special_order_id = NEW.special_order_id
        ),
        updated_at = now()
    WHERE id = NEW.special_order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_special_order_balance
    AFTER INSERT OR UPDATE OR DELETE ON special_order_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_special_order_balance();

-- Auto-update installment plan when payment is made
CREATE OR REPLACE FUNCTION update_installment_plan_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customer_installment_plans
    SET 
        total_paid = (
            SELECT COALESCE(SUM(amount), 0)
            FROM installment_payments
            WHERE installment_plan_id = NEW.installment_plan_id
        ),
        balance_due = amount_financed - (
            SELECT COALESCE(SUM(amount), 0)
            FROM installment_payments
            WHERE installment_plan_id = NEW.installment_plan_id
        ),
        installments_paid = (
            SELECT COUNT(*)
            FROM installment_payments
            WHERE installment_plan_id = NEW.installment_plan_id
            AND status = 'paid'
        ),
        status = CASE
            WHEN amount_financed - (
                SELECT COALESCE(SUM(amount), 0)
                FROM installment_payments
                WHERE installment_plan_id = NEW.installment_plan_id
            ) <= 0 THEN 'completed'
            ELSE status
        END,
        completion_date = CASE
            WHEN amount_financed - (
                SELECT COALESCE(SUM(amount), 0)
                FROM installment_payments
                WHERE installment_plan_id = NEW.installment_plan_id
            ) <= 0 THEN now()
            ELSE completion_date
        END,
        updated_at = now()
    WHERE id = NEW.installment_plan_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_installment_plan_balance
    AFTER INSERT OR UPDATE OR DELETE ON installment_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_installment_plan_balance();

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE customer_special_orders IS 'Customer pre-orders and special import orders';
COMMENT ON TABLE special_order_payments IS 'Payments made towards special orders';
COMMENT ON TABLE customer_installment_plans IS 'Customer installment payment plans for sales';
COMMENT ON TABLE installment_payments IS 'Individual payments made towards installment plans';

