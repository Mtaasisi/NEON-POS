-- =====================================================
-- ADD ADDITIONAL ISOLATION FEATURES TO STORE LOCATIONS
-- =====================================================
-- This migration adds comprehensive isolation control for:
-- - Sales, Purchase Orders, Devices, Payments
-- - Appointments, Reminders, Expenses
-- - Trade-Ins, Special Orders, Attendance, Loyalty Points
-- =====================================================

-- Add new isolation columns to store_locations table
ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS share_sales BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_purchase_orders BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_devices BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_payments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_appointments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_reminders BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_expenses BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_trade_ins BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_special_orders BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_attendance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_loyalty_points BOOLEAN DEFAULT false;

-- Add comments to document the new columns
COMMENT ON COLUMN store_locations.share_sales IS 'If true, this branch shares sales records with other branches';
COMMENT ON COLUMN store_locations.share_purchase_orders IS 'If true, this branch shares purchase orders with other branches';
COMMENT ON COLUMN store_locations.share_devices IS 'If true, this branch shares device/repair records with other branches';
COMMENT ON COLUMN store_locations.share_payments IS 'If true, this branch shares payment records with other branches';
COMMENT ON COLUMN store_locations.share_appointments IS 'If true, this branch shares appointments with other branches';
COMMENT ON COLUMN store_locations.share_reminders IS 'If true, this branch shares reminders/tasks with other branches';
COMMENT ON COLUMN store_locations.share_expenses IS 'If true, this branch shares expense records with other branches';
COMMENT ON COLUMN store_locations.share_trade_ins IS 'If true, this branch shares trade-in records with other branches';
COMMENT ON COLUMN store_locations.share_special_orders IS 'If true, this branch shares special orders with other branches';
COMMENT ON COLUMN store_locations.share_attendance IS 'If true, this branch shares employee attendance records with other branches';
COMMENT ON COLUMN store_locations.share_loyalty_points IS 'If true, this branch shares loyalty program data with other branches';

-- Create an index for faster lookups of sharing settings
CREATE INDEX IF NOT EXISTS idx_store_locations_sharing_settings 
ON store_locations (
  data_isolation_mode, 
  share_products, 
  share_customers, 
  share_sales, 
  share_devices
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =====================================================';
  RAISE NOTICE '✅ Additional Isolation Features Added Successfully!';
  RAISE NOTICE '✅ =====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Added 11 new isolation options:';
  RAISE NOTICE '  ✅ Sales Records';
  RAISE NOTICE '  ✅ Purchase Orders';
  RAISE NOTICE '  ✅ Devices & Repairs';
  RAISE NOTICE '  ✅ Payments';
  RAISE NOTICE '  ✅ Appointments';
  RAISE NOTICE '  ✅ Reminders';
  RAISE NOTICE '  ✅ Expenses';
  RAISE NOTICE '  ✅ Trade-Ins';
  RAISE NOTICE '  ✅ Special Orders';
  RAISE NOTICE '  ✅ Attendance';
  RAISE NOTICE '  ✅ Loyalty Program';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Configure these in: Admin Settings > Store Management';
  RAISE NOTICE '';
END $$;

