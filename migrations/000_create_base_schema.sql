-- ================================================
-- LATS CHANCE POS - BASE DATABASE SCHEMA
-- ================================================
-- This file creates all the core tables needed for the POS system
-- Run this first before running any other migrations
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- USERS & AUTHENTICATION
-- ================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'customer-care',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'technician',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- BRANCHES
-- ================================================

CREATE TABLE IF NOT EXISTS lats_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default branch if none exists
INSERT INTO lats_branches (id, name, location) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Main Branch', 'Main Location')
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- PRODUCT MANAGEMENT
-- ================================================

CREATE TABLE IF NOT EXISTS lats_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES lats_categories(id),
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lats_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lats_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lats_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT UNIQUE,
    barcode TEXT,
    category_id UUID REFERENCES lats_categories(id),
    brand_id UUID REFERENCES lats_brands(id),
    supplier_id UUID REFERENCES lats_suppliers(id),
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    cost_price NUMERIC DEFAULT 0,
    selling_price NUMERIC DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lats_product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
    variant_name TEXT,
    sku TEXT,
    barcode TEXT,
    cost_price NUMERIC DEFAULT 0,
    selling_price NUMERIC DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- CUSTOMER MANAGEMENT
-- ================================================

CREATE TABLE IF NOT EXISTS lats_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    location TEXT,
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    loyalty_points INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Legacy customers table for backward compatibility
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    gender TEXT,
    city TEXT,
    joined_date DATE DEFAULT CURRENT_DATE,
    loyalty_level TEXT DEFAULT 'bronze',
    color_tag TEXT,
    total_spent NUMERIC DEFAULT 0,
    points INTEGER DEFAULT 0,
    last_visit TIMESTAMPTZ,
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
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- SALES MANAGEMENT
-- ================================================

CREATE TABLE IF NOT EXISTS lats_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES lats_customers(id),
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    subtotal NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'paid',
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lats_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES lats_sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES lats_products(id),
    variant_id UUID REFERENCES lats_product_variants(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    subtotal NUMERIC NOT NULL,
    discount_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- EMPLOYEE MANAGEMENT
-- ================================================

CREATE TABLE IF NOT EXISTS lats_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT,
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    salary NUMERIC DEFAULT 0,
    hire_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT,
    salary NUMERIC DEFAULT 0,
    hire_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- PURCHASE ORDERS
-- ================================================

CREATE TABLE IF NOT EXISTS lats_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number TEXT UNIQUE NOT NULL,
    supplier_id UUID REFERENCES lats_suppliers(id),
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status TEXT DEFAULT 'pending',
    subtotal NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    shipping_cost NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lats_purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES lats_products(id),
    variant_id UUID REFERENCES lats_product_variants(id),
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC NOT NULL,
    total_cost NUMERIC NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- STOCK MOVEMENTS
-- ================================================

CREATE TABLE IF NOT EXISTS lats_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES lats_products(id),
    variant_id UUID REFERENCES lats_product_variants(id),
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    movement_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reference_id UUID,
    reference_type TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- DEVICE MANAGEMENT (for repair shop)
-- ================================================

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    device_name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    imei TEXT,
    problem_description TEXT,
    diagnostic_notes TEXT,
    repair_notes TEXT,
    status TEXT DEFAULT 'pending',
    estimated_cost NUMERIC DEFAULT 0,
    actual_cost NUMERIC DEFAULT 0,
    deposit_amount NUMERIC DEFAULT 0,
    balance_amount NUMERIC DEFAULT 0,
    technician_id UUID,
    intake_date TIMESTAMPTZ DEFAULT now(),
    estimated_completion_date TIMESTAMPTZ,
    actual_completion_date TIMESTAMPTZ,
    pickup_date TIMESTAMPTZ,
    warranty_expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- APPOINTMENTS
-- ================================================

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    title TEXT NOT NULL,
    description TEXT,
    appointment_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'scheduled',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- PAYMENTS
-- ================================================

CREATE TABLE IF NOT EXISTS customer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    device_id UUID REFERENCES devices(id),
    amount NUMERIC NOT NULL,
    method TEXT DEFAULT 'cash',
    payment_type TEXT DEFAULT 'payment',
    status TEXT DEFAULT 'completed',
    reference_number TEXT,
    notes TEXT,
    payment_date TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- SETTINGS
-- ================================================

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lats_pos_general_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    business_name TEXT,
    tax_rate NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'TZS',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lats_pos_receipt_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    header_text TEXT,
    footer_text TEXT,
    show_logo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lats_pos_advanced_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    auto_print_receipt BOOLEAN DEFAULT false,
    enable_barcode_scanner BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- NOTIFICATIONS
-- ================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- AUDIT LOGS
-- ================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_products_category ON lats_products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_branch ON lats_products(branch_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON lats_products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON lats_products(barcode);

CREATE INDEX IF NOT EXISTS idx_sales_customer ON lats_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON lats_sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON lats_sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON lats_sales(sale_number);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON lats_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON lats_sale_items(product_id);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON lats_customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON lats_customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_branch ON lats_customers(branch_id);

CREATE INDEX IF NOT EXISTS idx_devices_customer ON devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON lats_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_branch ON lats_stock_movements(branch_id);

-- ================================================
-- SUMMARY
-- ================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public';
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'DATABASE SCHEMA CREATED SUCCESSFULLY';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total tables: %', table_count;
    RAISE NOTICE '✓ Users & Authentication';
    RAISE NOTICE '✓ Branches';
    RAISE NOTICE '✓ Products & Variants';
    RAISE NOTICE '✓ Categories & Brands';
    RAISE NOTICE '✓ Suppliers';
    RAISE NOTICE '✓ Customers';
    RAISE NOTICE '✓ Sales & Sale Items';
    RAISE NOTICE '✓ Employees';
    RAISE NOTICE '✓ Purchase Orders';
    RAISE NOTICE '✓ Stock Movements';
    RAISE NOTICE '✓ Devices';
    RAISE NOTICE '✓ Appointments';
    RAISE NOTICE '✓ Payments';
    RAISE NOTICE '✓ Settings';
    RAISE NOTICE '✓ Notifications';
    RAISE NOTICE '✓ Audit Logs';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'You can now run the application!';
    RAISE NOTICE '================================================';
END $$;

