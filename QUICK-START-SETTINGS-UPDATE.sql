-- ==============================================
-- QUICK START: Database Schema Updates
-- ==============================================
-- Run this SQL in your Neon Database SQL Editor
-- This adds missing columns for production readiness
-- ==============================================

-- ==============================================
-- 1. ADD MISSING INVENTORY COLUMNS
-- ==============================================
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS supplier_lead_time_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS last_restock_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS batch_number TEXT,
ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS warranty_start_date TIMESTAMP;

-- Add index for expiry date lookups (for perishables)
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory_items(expiry_date) WHERE expiry_date IS NOT NULL;

-- Add index for low stock alerts
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory_items(quantity) WHERE quantity <= reorder_point;

-- ==============================================
-- 2. ENHANCE TRANSACTIONS TABLE FOR PAYMENT TRACKING
-- ==============================================
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'cash',  -- 'cash', 'mpesa', 'tigopesa', 'airtel'
ADD COLUMN IF NOT EXISTS payment_reference TEXT,  -- Transaction reference from payment provider
ADD COLUMN IF NOT EXISTS payment_phone TEXT,  -- Phone number used for mobile money
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'completed',  -- 'pending', 'completed', 'failed', 'refunded'
ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP;

-- Add index for payment status
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);

-- Add index for payment provider analytics
CREATE INDEX IF NOT EXISTS idx_transactions_payment_provider ON transactions(payment_provider);

-- ==============================================
-- 3. CREATE CUSTOMER FEEDBACK TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  feedback_category TEXT,  -- 'service', 'product', 'staff', 'overall'
  would_recommend BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for analytics
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON customer_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_date ON customer_feedback(created_at DESC);

-- ==============================================
-- 4. CREATE STOCK ALERTS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,  -- 'low_stock', 'out_of_stock', 'expiring_soon', 'expired'
  alert_message TEXT NOT NULL,
  current_quantity INTEGER,
  threshold_quantity INTEGER,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for unresolved alerts
CREATE INDEX IF NOT EXISTS idx_stock_alerts_unresolved ON stock_alerts(is_resolved) WHERE is_resolved = false;

-- ==============================================
-- 5. CREATE AUDIT LOG TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,  -- 'sale', 'refund', 'void', 'stock_adjustment', 'login', 'logout'
  entity_type TEXT,  -- 'transaction', 'inventory', 'customer', 'user'
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(created_at DESC);

-- ==============================================
-- 6. CREATE EMPLOYEE PERFORMANCE TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS employee_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sales_count INTEGER DEFAULT 0,
  sales_total NUMERIC(10, 2) DEFAULT 0,
  refunds_count INTEGER DEFAULT 0,
  refunds_total NUMERIC(10, 2) DEFAULT 0,
  hours_worked NUMERIC(5, 2) DEFAULT 0,
  commission_earned NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- Add index for performance queries
CREATE INDEX IF NOT EXISTS idx_employee_performance_date ON employee_performance(date DESC);
CREATE INDEX IF NOT EXISTS idx_employee_performance_employee ON employee_performance(employee_id, date DESC);

-- ==============================================
-- 7. CREATE BACKUP LOG TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS backup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL,  -- 'manual', 'automatic', 'scheduled'
  backup_status TEXT NOT NULL,  -- 'started', 'completed', 'failed'
  backup_size_mb NUMERIC(10, 2),
  backup_location TEXT,
  error_message TEXT,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for backup monitoring
CREATE INDEX IF NOT EXISTS idx_backup_log_date ON backup_log(started_at DESC);

-- ==============================================
-- 8. ADD BUSINESS SETTINGS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Business Information
  business_name TEXT NOT NULL DEFAULT 'My Business',
  business_registration_number TEXT,
  business_address TEXT,
  business_city TEXT,
  business_postal_code TEXT,
  business_country TEXT DEFAULT 'Tanzania',
  business_phone TEXT,
  business_email TEXT,
  business_website TEXT,
  tax_number TEXT,  -- TIN for Tanzania
  vat_number TEXT,
  
  -- Receipt Settings
  receipt_header TEXT DEFAULT 'Thank you for shopping with us!',
  receipt_footer TEXT DEFAULT 'Karibu tena!',
  return_policy TEXT DEFAULT 'Returns within 7 days with receipt',
  warranty_period_days INTEGER DEFAULT 90,
  
  -- Operational Settings
  low_stock_threshold INTEGER DEFAULT 10,
  enable_stock_alerts BOOLEAN DEFAULT true,
  enable_offline_mode BOOLEAN DEFAULT true,
  enable_audit_log BOOLEAN DEFAULT true,
  
  -- Payment Methods
  accept_cash BOOLEAN DEFAULT true,
  accept_mpesa BOOLEAN DEFAULT false,
  accept_tigopesa BOOLEAN DEFAULT false,
  accept_airtel_money BOOLEAN DEFAULT false,
  mpesa_business_number TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ==============================================
-- 9. CREATE FUNCTION TO AUTO-GENERATE STOCK ALERTS
-- ==============================================
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stock is below reorder point
  IF NEW.quantity <= NEW.reorder_point AND (OLD.quantity IS NULL OR OLD.quantity > NEW.reorder_point) THEN
    INSERT INTO stock_alerts (
      inventory_item_id,
      alert_type,
      alert_message,
      current_quantity,
      threshold_quantity
    ) VALUES (
      NEW.id,
      'low_stock',
      'Stock level for ' || NEW.name || ' is below reorder point',
      NEW.quantity,
      NEW.reorder_point
    );
  END IF;
  
  -- Check if stock is completely out
  IF NEW.quantity = 0 AND (OLD.quantity IS NULL OR OLD.quantity > 0) THEN
    INSERT INTO stock_alerts (
      inventory_item_id,
      alert_type,
      alert_message,
      current_quantity,
      threshold_quantity
    ) VALUES (
      NEW.id,
      'out_of_stock',
      NEW.name || ' is out of stock',
      0,
      NEW.reorder_point
    );
  END IF;
  
  -- Check for expiring items (within 7 days)
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= NOW() + INTERVAL '7 days' AND NEW.expiry_date > NOW() THEN
    INSERT INTO stock_alerts (
      inventory_item_id,
      alert_type,
      alert_message,
      current_quantity,
      threshold_quantity
    ) VALUES (
      NEW.id,
      'expiring_soon',
      NEW.name || ' expires on ' || to_char(NEW.expiry_date, 'YYYY-MM-DD'),
      NEW.quantity,
      0
    );
  END IF;
  
  -- Check for expired items
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= NOW() THEN
    INSERT INTO stock_alerts (
      inventory_item_id,
      alert_type,
      alert_message,
      current_quantity,
      threshold_quantity
    ) VALUES (
      NEW.id,
      'expired',
      NEW.name || ' has expired',
      NEW.quantity,
      0
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stock alerts
DROP TRIGGER IF EXISTS trigger_check_low_stock ON inventory_items;
CREATE TRIGGER trigger_check_low_stock
  AFTER INSERT OR UPDATE OF quantity, expiry_date, reorder_point
  ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock();

-- ==============================================
-- 10. CREATE FUNCTION TO LOG TRANSACTIONS IN AUDIT TABLE
-- ==============================================
CREATE OR REPLACE FUNCTION log_transaction_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    user_id,
    action,
    entity_type,
    entity_id,
    new_value
  ) VALUES (
    NEW.user_id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'sale'
      WHEN TG_OP = 'UPDATE' AND OLD.payment_status != NEW.payment_status THEN 'payment_update'
      ELSE 'transaction_update'
    END,
    'transaction',
    NEW.id,
    row_to_json(NEW)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transaction auditing
DROP TRIGGER IF EXISTS trigger_log_transaction_audit ON transactions;
CREATE TRIGGER trigger_log_transaction_audit
  AFTER INSERT OR UPDATE
  ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION log_transaction_audit();

-- ==============================================
-- 11. CREATE VIEW FOR LOW STOCK ITEMS
-- ==============================================
CREATE OR REPLACE VIEW low_stock_items AS
SELECT 
  i.id,
  i.name,
  i.sku,
  i.barcode,
  i.quantity,
  i.reorder_point,
  i.reorder_quantity,
  i.supplier_lead_time_days,
  i.last_restock_date,
  CASE 
    WHEN i.quantity = 0 THEN 'OUT_OF_STOCK'
    WHEN i.quantity <= i.reorder_point THEN 'LOW_STOCK'
    ELSE 'OK'
  END as stock_status
FROM inventory_items i
WHERE i.quantity <= i.reorder_point
ORDER BY i.quantity ASC, i.name ASC;

-- ==============================================
-- 12. CREATE VIEW FOR EXPIRING ITEMS
-- ==============================================
CREATE OR REPLACE VIEW expiring_items AS
SELECT 
  i.id,
  i.name,
  i.sku,
  i.quantity,
  i.expiry_date,
  EXTRACT(DAY FROM (i.expiry_date - NOW())) as days_until_expiry,
  CASE 
    WHEN i.expiry_date <= NOW() THEN 'EXPIRED'
    WHEN i.expiry_date <= NOW() + INTERVAL '7 days' THEN 'EXPIRING_SOON'
    WHEN i.expiry_date <= NOW() + INTERVAL '30 days' THEN 'EXPIRING_THIS_MONTH'
    ELSE 'OK'
  END as expiry_status
FROM inventory_items i
WHERE i.expiry_date IS NOT NULL
  AND i.expiry_date <= NOW() + INTERVAL '30 days'
ORDER BY i.expiry_date ASC;

-- ==============================================
-- 13. CREATE VIEW FOR DAILY SALES SUMMARY
-- ==============================================
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
  DATE(t.created_at) as sale_date,
  COUNT(*) as total_transactions,
  SUM(t.total_amount) as total_sales,
  SUM(t.discount_amount) as total_discounts,
  SUM(t.tax_amount) as total_tax,
  AVG(t.total_amount) as average_transaction_value,
  COUNT(DISTINCT t.customer_id) as unique_customers,
  STRING_AGG(DISTINCT t.payment_provider, ', ') as payment_methods_used
FROM transactions t
WHERE t.payment_status = 'completed'
GROUP BY DATE(t.created_at)
ORDER BY sale_date DESC;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================
SELECT '✅ Database schema updates completed successfully!' as status;
SELECT 'Tables Added: customer_feedback, stock_alerts, audit_log, employee_performance, backup_log, business_settings' as info;
SELECT 'Triggers Created: check_low_stock, log_transaction_audit' as info;
SELECT 'Views Created: low_stock_items, expiring_items, daily_sales_summary' as info;

