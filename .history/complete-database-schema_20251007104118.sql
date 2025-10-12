-- ============================================================================
-- COMPLETE POS DATABASE SCHEMA
-- ============================================================================
-- This file creates all tables needed for the POS system
-- Run this in your Neon SQL Editor or psql

-- ============================================================================
-- AUTHENTICATION & USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  name TEXT,
  role TEXT DEFAULT 'technician',
  is_active BOOLEAN DEFAULT true,
  permissions TEXT[],
  max_devices_allowed INTEGER DEFAULT 10,
  require_approval BOOLEAN DEFAULT false,
  failed_login_attempts INTEGER DEFAULT 0,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

CREATE TABLE IF NOT EXISTS user_daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  goal_type TEXT NOT NULL,
  goal_value NUMERIC DEFAULT 0,
  achieved_value NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date, goal_type)
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  department TEXT,
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  salary NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CUSTOMER MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,
  city TEXT,
  address TEXT,
  joined_date DATE,
  loyalty_level TEXT DEFAULT 'bronze',
  color_tag TEXT,
  total_spent NUMERIC DEFAULT 0,
  points INTEGER DEFAULT 0,
  last_visit TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  referral_source TEXT,
  birth_month TEXT,
  birth_day TEXT,
  customer_tag TEXT,
  notes TEXT,
  total_returns INTEGER DEFAULT 0,
  initial_notes TEXT,
  location_description TEXT,
  national_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  checkin_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checkout_date TIMESTAMP WITH TIME ZONE,
  purpose TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  revenue_date DATE NOT NULL,
  revenue_amount NUMERIC DEFAULT 0,
  revenue_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CONTACT MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL,
  preference_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL,
  contact_method TEXT,
  contact_subject TEXT,
  contact_notes TEXT,
  contacted_by UUID,
  contacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DEVICE MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  imei TEXT,
  problem_description TEXT,
  diagnostic_notes TEXT,
  repair_notes TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  balance_amount NUMERIC DEFAULT 0,
  technician_id UUID,
  intake_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  estimated_completion_date TIMESTAMP WITH TIME ZONE,
  actual_completion_date TIMESTAMP WITH TIME ZONE,
  pickup_date TIMESTAMP WITH TIME ZONE,
  warranty_expiry_date TIMESTAMP WITH TIME ZONE,
  password TEXT,
  accessories TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  checklist_item TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  checked_by UUID,
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  remark TEXT NOT NULL,
  remark_type TEXT DEFAULT 'general',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  transitioned_by UUID,
  transition_notes TEXT,
  transitioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DIAGNOSTIC SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS diagnostic_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  device_type TEXT,
  checklist_items JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnostic_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  template_id UUID REFERENCES diagnostic_templates(id),
  requested_by UUID,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnostic_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES diagnostic_requests(id) ON DELETE CASCADE,
  check_name TEXT NOT NULL,
  check_result TEXT,
  is_passed BOOLEAN,
  checked_by UUID,
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnostic_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  diagnostic_data JSONB,
  diagnostic_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PRODUCT & INVENTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS lats_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  parent_category_id UUID REFERENCES lats_categories(id),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  tax_id TEXT,
  payment_terms TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  rating NUMERIC(2,1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  barcode TEXT,
  category_id UUID REFERENCES lats_categories(id),
  unit_price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER DEFAULT 1000,
  reorder_point INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  images JSONB,
  supplier_id UUID REFERENCES lats_suppliers(id),
  brand TEXT,
  model TEXT,
  warranty_period INTEGER,
  weight NUMERIC,
  dimensions TEXT,
  tax_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  sku TEXT UNIQUE,
  barcode TEXT,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 5,
  unit_price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  variant_attributes JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_alt TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES lats_products(id),
  variant_id UUID REFERENCES lats_product_variants(id),
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  from_location TEXT,
  to_location TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES lats_suppliers(id),
  status TEXT DEFAULT 'pending',
  total_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  final_amount NUMERIC DEFAULT 0,
  notes TEXT,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_delivery_date TIMESTAMP WITH TIME ZONE,
  received_date TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES lats_products(id),
  variant_id UUID REFERENCES lats_product_variants(id),
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_cost NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SALES & TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS lats_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  user_id UUID,
  cashier_name TEXT,
  sold_by TEXT,
  total_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  discount_percentage NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  final_amount NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'completed',
  status TEXT DEFAULT 'completed',
  notes TEXT,
  receipt_number TEXT,
  invoice_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES lats_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES lats_products(id),
  variant_id UUID REFERENCES lats_product_variants(id),
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  cost_price NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  discount_percentage NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  subtotal NUMERIC NOT NULL,
  profit NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  device_id UUID REFERENCES devices(id),
  sale_id UUID REFERENCES lats_sales(id),
  amount NUMERIC NOT NULL,
  method TEXT DEFAULT 'cash',
  payment_type TEXT DEFAULT 'payment',
  status TEXT DEFAULT 'completed',
  reference_number TEXT,
  transaction_id TEXT,
  notes TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS installment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id),
  customer_id UUID REFERENCES customers(id),
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC NOT NULL,
  installment_count INTEGER DEFAULT 1,
  installment_amount NUMERIC NOT NULL,
  next_due_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number TEXT UNIQUE NOT NULL,
  initial_balance NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  customer_id UUID REFERENCES customers(id),
  status TEXT DEFAULT 'active',
  issued_by UUID,
  issued_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID REFERENCES gift_cards(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  sale_id UUID REFERENCES lats_sales(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_number TEXT,
  bank_name TEXT,
  current_balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_category_id UUID REFERENCES finance_expense_categories(id),
  account_id UUID REFERENCES finance_accounts(id),
  expense_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  receipt_number TEXT,
  vendor TEXT,
  payment_method TEXT DEFAULT 'cash',
  created_by UUID,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id UUID REFERENCES finance_accounts(id),
  to_account_id UUID REFERENCES finance_accounts(id),
  transfer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_number TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- COMMUNICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  provider TEXT,
  message_id TEXT,
  cost NUMERIC,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  template_id UUID REFERENCES communication_templates(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  sender_id UUID,
  sender_type TEXT,
  recipient_id UUID,
  recipient_type TEXT,
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT UNIQUE,
  template_name TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  category TEXT,
  status TEXT,
  body_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- APPOINTMENTS & SCHEDULING
-- ============================================================================

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  device_id UUID REFERENCES devices(id),
  technician_id UUID,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled',
  appointment_type TEXT,
  priority TEXT DEFAULT 'normal',
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  setting_type TEXT,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_pos_general_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_pos_receipt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_pos_advanced_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================
-- Additional POS Settings Tables
-- ===================================================

CREATE TABLE IF NOT EXISTS lats_pos_dynamic_pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_dynamic_pricing BOOLEAN DEFAULT false,
  enable_loyalty_pricing BOOLEAN DEFAULT false,
  enable_bulk_pricing BOOLEAN DEFAULT false,
  enable_time_based_pricing BOOLEAN DEFAULT false,
  enable_customer_pricing BOOLEAN DEFAULT false,
  enable_special_events BOOLEAN DEFAULT false,
  loyalty_discount_percent NUMERIC(5,2) DEFAULT 0,
  loyalty_points_threshold INTEGER DEFAULT 100,
  loyalty_max_discount NUMERIC(5,2) DEFAULT 20,
  bulk_discount_enabled BOOLEAN DEFAULT false,
  bulk_discount_threshold INTEGER DEFAULT 10,
  bulk_discount_percent NUMERIC(5,2) DEFAULT 5,
  time_based_discount_enabled BOOLEAN DEFAULT false,
  time_based_start_time TEXT DEFAULT '00:00',
  time_based_end_time TEXT DEFAULT '23:59',
  time_based_discount_percent NUMERIC(5,2) DEFAULT 0,
  customer_pricing_enabled BOOLEAN DEFAULT false,
  vip_customer_discount NUMERIC(5,2) DEFAULT 10,
  regular_customer_discount NUMERIC(5,2) DEFAULT 5,
  special_events_enabled BOOLEAN DEFAULT false,
  special_event_discount_percent NUMERIC(5,2) DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_pos_barcode_scanner_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_barcode_scanner BOOLEAN DEFAULT true,
  enable_camera_scanner BOOLEAN DEFAULT false,
  enable_keyboard_input BOOLEAN DEFAULT true,
  enable_manual_entry BOOLEAN DEFAULT true,
  auto_add_to_cart BOOLEAN DEFAULT true,
  auto_focus_search BOOLEAN DEFAULT true,
  play_sound_on_scan BOOLEAN DEFAULT true,
  vibrate_on_scan BOOLEAN DEFAULT false,
  show_scan_feedback BOOLEAN DEFAULT true,
  show_invalid_barcode_alert BOOLEAN DEFAULT true,
  allow_unknown_products BOOLEAN DEFAULT false,
  prompt_for_unknown_products BOOLEAN DEFAULT true,
  retry_on_error BOOLEAN DEFAULT true,
  max_retry_attempts INTEGER DEFAULT 3,
  scanner_device_name TEXT,
  scanner_connection_type TEXT DEFAULT 'usb',
  scanner_timeout INTEGER DEFAULT 5000,
  support_ean13 BOOLEAN DEFAULT true,
  support_ean8 BOOLEAN DEFAULT true,
  support_upc_a BOOLEAN DEFAULT true,
  support_upc_e BOOLEAN DEFAULT true,
  support_code128 BOOLEAN DEFAULT true,
  support_code39 BOOLEAN DEFAULT true,
  support_qr_code BOOLEAN DEFAULT true,
  support_data_matrix BOOLEAN DEFAULT false,
  enable_continuous_scanning BOOLEAN DEFAULT false,
  scan_delay INTEGER DEFAULT 500,
  enable_scan_history BOOLEAN DEFAULT true,
  max_scan_history INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_pos_delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_delivery BOOLEAN DEFAULT false,
  default_delivery_fee NUMERIC(10,2) DEFAULT 0,
  free_delivery_threshold NUMERIC(10,2) DEFAULT 0,
  max_delivery_distance NUMERIC(10,2) DEFAULT 50,
  enable_delivery_areas BOOLEAN DEFAULT false,
  delivery_areas JSONB DEFAULT '[]'::jsonb,
  area_delivery_fees JSONB DEFAULT '{}'::jsonb,
  area_delivery_times JSONB DEFAULT '{}'::jsonb,
  enable_delivery_hours BOOLEAN DEFAULT false,
  delivery_start_time TEXT DEFAULT '08:00',
  delivery_end_time TEXT DEFAULT '20:00',
  enable_same_day_delivery BOOLEAN DEFAULT true,
  enable_next_day_delivery BOOLEAN DEFAULT true,
  delivery_time_slots JSONB DEFAULT '[]'::jsonb,
  notify_customer_on_delivery BOOLEAN DEFAULT true,
  notify_driver_on_assignment BOOLEAN DEFAULT true,
  enable_sms_notifications BOOLEAN DEFAULT false,
  enable_email_notifications BOOLEAN DEFAULT true,
  enable_driver_assignment BOOLEAN DEFAULT false,
  driver_commission NUMERIC(5,2) DEFAULT 10,
  require_signature BOOLEAN DEFAULT false,
  enable_driver_tracking BOOLEAN DEFAULT false,
  enable_scheduled_delivery BOOLEAN DEFAULT false,
  enable_partial_delivery BOOLEAN DEFAULT false,
  require_advance_payment BOOLEAN DEFAULT false,
  advance_payment_percent NUMERIC(5,2) DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_pos_search_filter_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_product_search BOOLEAN DEFAULT true,
  enable_customer_search BOOLEAN DEFAULT true,
  enable_sales_search BOOLEAN DEFAULT true,
  search_by_name BOOLEAN DEFAULT true,
  search_by_barcode BOOLEAN DEFAULT true,
  search_by_sku BOOLEAN DEFAULT true,
  search_by_category BOOLEAN DEFAULT true,
  search_by_supplier BOOLEAN DEFAULT true,
  search_by_description BOOLEAN DEFAULT true,
  search_by_tags BOOLEAN DEFAULT true,
  enable_fuzzy_search BOOLEAN DEFAULT true,
  enable_autocomplete BOOLEAN DEFAULT true,
  min_search_length INTEGER DEFAULT 2,
  max_search_results INTEGER DEFAULT 50,
  search_timeout INTEGER DEFAULT 5000,
  search_debounce_time INTEGER DEFAULT 300,
  enable_search_history BOOLEAN DEFAULT true,
  max_search_history INTEGER DEFAULT 20,
  enable_recent_searches BOOLEAN DEFAULT true,
  enable_popular_searches BOOLEAN DEFAULT true,
  enable_search_suggestions BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_pos_user_permissions_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_pos_access BOOLEAN DEFAULT true,
  enable_sales_access BOOLEAN DEFAULT true,
  enable_refunds_access BOOLEAN DEFAULT false,
  enable_void_access BOOLEAN DEFAULT false,
  enable_discount_access BOOLEAN DEFAULT true,
  enable_inventory_view BOOLEAN DEFAULT true,
  enable_inventory_edit BOOLEAN DEFAULT false,
  enable_stock_adjustments BOOLEAN DEFAULT false,
  enable_product_creation BOOLEAN DEFAULT false,
  enable_product_deletion BOOLEAN DEFAULT false,
  enable_customer_view BOOLEAN DEFAULT true,
  enable_customer_creation BOOLEAN DEFAULT true,
  enable_customer_edit BOOLEAN DEFAULT false,
  enable_customer_deletion BOOLEAN DEFAULT false,
  enable_customer_history BOOLEAN DEFAULT true,
  enable_payment_processing BOOLEAN DEFAULT true,
  enable_cash_management BOOLEAN DEFAULT false,
  enable_daily_reports BOOLEAN DEFAULT true,
  enable_financial_reports BOOLEAN DEFAULT false,
  enable_tax_management BOOLEAN DEFAULT false,
  enable_settings_access BOOLEAN DEFAULT false,
  enable_user_management BOOLEAN DEFAULT false,
  enable_backup_restore BOOLEAN DEFAULT false,
  enable_system_maintenance BOOLEAN DEFAULT false,
  enable_api_access BOOLEAN DEFAULT false,
  enable_audit_logs BOOLEAN DEFAULT false,
  enable_security_settings BOOLEAN DEFAULT false,
  enable_password_reset BOOLEAN DEFAULT true,
  enable_session_management BOOLEAN DEFAULT false,
  enable_data_export BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_pos_loyalty_customer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_loyalty_program BOOLEAN DEFAULT false,
  loyalty_program_name TEXT DEFAULT 'Loyalty Program',
  points_per_currency NUMERIC(10,2) DEFAULT 1,
  points_redemption_rate NUMERIC(10,2) DEFAULT 100,
  minimum_points_redemption INTEGER DEFAULT 100,
  points_expiry_days INTEGER DEFAULT 365,
  enable_customer_registration BOOLEAN DEFAULT true,
  require_customer_info BOOLEAN DEFAULT false,
  enable_customer_categories BOOLEAN DEFAULT true,
  enable_customer_tags BOOLEAN DEFAULT true,
  enable_customer_notes BOOLEAN DEFAULT true,
  enable_automatic_rewards BOOLEAN DEFAULT true,
  enable_manual_rewards BOOLEAN DEFAULT true,
  enable_birthday_rewards BOOLEAN DEFAULT true,
  enable_anniversary_rewards BOOLEAN DEFAULT true,
  enable_referral_rewards BOOLEAN DEFAULT true,
  enable_email_communication BOOLEAN DEFAULT true,
  enable_sms_communication BOOLEAN DEFAULT false,
  enable_push_notifications BOOLEAN DEFAULT true,
  enable_marketing_emails BOOLEAN DEFAULT true,
  enable_customer_analytics BOOLEAN DEFAULT true,
  enable_purchase_history BOOLEAN DEFAULT true,
  enable_spending_patterns BOOLEAN DEFAULT true,
  enable_customer_segmentation BOOLEAN DEFAULT true,
  enable_customer_insights BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_pos_analytics_reporting_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_analytics BOOLEAN DEFAULT true,
  enable_real_time_analytics BOOLEAN DEFAULT true,
  analytics_refresh_interval INTEGER DEFAULT 60000,
  enable_data_export BOOLEAN DEFAULT true,
  enable_sales_analytics BOOLEAN DEFAULT true,
  enable_sales_trends BOOLEAN DEFAULT true,
  enable_product_performance BOOLEAN DEFAULT true,
  enable_customer_analytics BOOLEAN DEFAULT true,
  enable_revenue_tracking BOOLEAN DEFAULT true,
  enable_inventory_analytics BOOLEAN DEFAULT true,
  enable_stock_alerts BOOLEAN DEFAULT true,
  enable_low_stock_reports BOOLEAN DEFAULT true,
  enable_inventory_turnover BOOLEAN DEFAULT true,
  enable_supplier_analytics BOOLEAN DEFAULT true,
  enable_automated_reports BOOLEAN DEFAULT false,
  report_generation_time TEXT DEFAULT '00:00',
  enable_email_reports BOOLEAN DEFAULT false,
  enable_pdf_reports BOOLEAN DEFAULT true,
  enable_excel_reports BOOLEAN DEFAULT true,
  enable_custom_dashboard BOOLEAN DEFAULT true,
  enable_kpi_widgets BOOLEAN DEFAULT true,
  enable_chart_animations BOOLEAN DEFAULT true,
  enable_data_drill_down BOOLEAN DEFAULT true,
  enable_comparative_analysis BOOLEAN DEFAULT true,
  enable_predictive_analytics BOOLEAN DEFAULT false,
  enable_data_retention BOOLEAN DEFAULT true,
  data_retention_days INTEGER DEFAULT 365,
  enable_data_backup BOOLEAN DEFAULT true,
  enable_api_export BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lats_pos_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_notifications BOOLEAN DEFAULT true,
  enable_sound_notifications BOOLEAN DEFAULT true,
  enable_visual_notifications BOOLEAN DEFAULT true,
  enable_push_notifications BOOLEAN DEFAULT true,
  notification_timeout INTEGER DEFAULT 5000,
  enable_sales_notifications BOOLEAN DEFAULT true,
  notify_on_sale_completion BOOLEAN DEFAULT true,
  notify_on_refund BOOLEAN DEFAULT true,
  notify_on_void BOOLEAN DEFAULT true,
  notify_on_discount BOOLEAN DEFAULT false,
  enable_inventory_notifications BOOLEAN DEFAULT true,
  notify_on_low_stock BOOLEAN DEFAULT true,
  low_stock_threshold INTEGER DEFAULT 10,
  notify_on_out_of_stock BOOLEAN DEFAULT true,
  notify_on_stock_adjustment BOOLEAN DEFAULT false,
  enable_customer_notifications BOOLEAN DEFAULT true,
  notify_on_customer_registration BOOLEAN DEFAULT false,
  notify_on_loyalty_points BOOLEAN DEFAULT true,
  notify_on_customer_birthday BOOLEAN DEFAULT true,
  notify_on_customer_anniversary BOOLEAN DEFAULT true,
  enable_system_notifications BOOLEAN DEFAULT true,
  notify_on_system_errors BOOLEAN DEFAULT true,
  notify_on_backup_completion BOOLEAN DEFAULT false,
  notify_on_sync_completion BOOLEAN DEFAULT false,
  notify_on_maintenance BOOLEAN DEFAULT true,
  enable_email_notifications BOOLEAN DEFAULT false,
  enable_sms_notifications BOOLEAN DEFAULT false,
  enable_in_app_notifications BOOLEAN DEFAULT true,
  enable_desktop_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT,
  message TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  config JSONB,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT & LOGGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DONE!
-- ============================================================================

