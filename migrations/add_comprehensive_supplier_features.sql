-- ================================================
-- COMPREHENSIVE SUPPLIER MANAGEMENT FEATURES
-- ================================================
-- This migration adds all advanced supplier management features
-- Documents, Communications, Ratings, Categories, Contracts, Financial Tracking
-- ================================================

-- ================================================
-- 1. SUPPLIER DOCUMENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lats_supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES lats_suppliers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- contract, license, certificate, insurance, tax_certificate, quality_cert, other
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  mime_type TEXT,
  expiry_date DATE,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier_id ON lats_supplier_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_expiry_date ON lats_supplier_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_documents_type ON lats_supplier_documents(document_type);

COMMENT ON TABLE lats_supplier_documents IS 'Stores all supplier-related documents (contracts, licenses, certificates, etc.)';

-- ================================================
-- 2. SUPPLIER COMMUNICATIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lats_supplier_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES lats_suppliers(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL, -- email, phone, meeting, whatsapp, wechat, sms, other
  direction TEXT DEFAULT 'outbound', -- inbound, outbound
  subject TEXT,
  message TEXT,
  notes TEXT,
  contact_person TEXT,
  response_time_hours INTEGER, -- track how long supplier took to respond
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_comms_supplier_id ON lats_supplier_communications(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_comms_date ON lats_supplier_communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_comms_follow_up ON lats_supplier_communications(follow_up_required, follow_up_date) WHERE follow_up_required = true;

COMMENT ON TABLE lats_supplier_communications IS 'Tracks all communications with suppliers for relationship management';

-- ================================================
-- 3. SUPPLIER RATINGS & REVIEWS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lats_supplier_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES lats_suppliers(id) ON DELETE CASCADE,
  purchase_order_id UUID, -- reference to lats_purchase_orders if applicable
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  price_rating INTEGER CHECK (price_rating >= 1 AND price_rating <= 5),
  review_text TEXT,
  pros TEXT,
  cons TEXT,
  would_recommend BOOLEAN DEFAULT true,
  rated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier_id ON lats_supplier_ratings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_overall ON lats_supplier_ratings(overall_rating);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_date ON lats_supplier_ratings(created_at DESC);

COMMENT ON TABLE lats_supplier_ratings IS 'Stores ratings and reviews for supplier performance tracking';

-- ================================================
-- 4. SUPPLIER CATEGORIES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lats_supplier_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- lucide icon name
  color TEXT, -- hex color for UI
  parent_id UUID REFERENCES lats_supplier_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_categories_parent ON lats_supplier_categories(parent_id) WHERE parent_id IS NOT NULL;

COMMENT ON TABLE lats_supplier_categories IS 'Categories for organizing suppliers (Electronics, Phones, Accessories, etc.)';

-- ================================================
-- 5. SUPPLIER CATEGORY MAPPING TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lats_supplier_category_mapping (
  supplier_id UUID REFERENCES lats_suppliers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES lats_supplier_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (supplier_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_category_mapping_supplier ON lats_supplier_category_mapping(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_category_mapping_category ON lats_supplier_category_mapping(category_id);

COMMENT ON TABLE lats_supplier_category_mapping IS 'Many-to-many relationship between suppliers and categories';

-- ================================================
-- 6. SUPPLIER CONTRACTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lats_supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES lats_suppliers(id) ON DELETE CASCADE,
  contract_number TEXT UNIQUE,
  contract_name TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  contract_value NUMERIC(15, 2),
  currency TEXT DEFAULT 'TZS',
  auto_renew BOOLEAN DEFAULT false,
  renewal_notice_days INTEGER DEFAULT 30, -- notify X days before expiry
  payment_terms TEXT,
  terms_and_conditions TEXT,
  document_url TEXT,
  status TEXT DEFAULT 'active', -- active, expired, pending, cancelled, renewed
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_contracts_supplier_id ON lats_supplier_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_end_date ON lats_supplier_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_status ON lats_supplier_contracts(status);

COMMENT ON TABLE lats_supplier_contracts IS 'Manages supplier contracts with expiry tracking and renewal reminders';

-- ================================================
-- 7. SUPPLIER TAGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lats_supplier_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT, -- hex color
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE lats_supplier_tags IS 'Custom tags for flexible supplier organization';

-- ================================================
-- 8. SUPPLIER TAG MAPPING TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lats_supplier_tag_mapping (
  supplier_id UUID REFERENCES lats_suppliers(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES lats_supplier_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (supplier_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_tag_mapping_supplier ON lats_supplier_tag_mapping(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_tag_mapping_tag ON lats_supplier_tag_mapping(tag_id);

-- ================================================
-- 9. ADD NEW FIELDS TO SUPPLIERS TABLE
-- ================================================
ALTER TABLE lats_suppliers 
  -- Financial fields
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_balance NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0,
  
  -- Business information
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS business_registration TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT, -- manufacturer, distributor, wholesaler, retailer, other
  ADD COLUMN IF NOT EXISTS year_established INTEGER,
  ADD COLUMN IF NOT EXISTS employee_count TEXT, -- 1-10, 11-50, 51-200, 201-500, 500+
  
  -- Social media
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  
  -- Logistics
  ADD COLUMN IF NOT EXISTS minimum_order_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER,
  ADD COLUMN IF NOT EXISTS warehouse_location TEXT,
  ADD COLUMN IF NOT EXISTS shipping_methods TEXT[], -- array of shipping methods
  ADD COLUMN IF NOT EXISTS delivery_zones TEXT[], -- array of delivery zones
  
  -- Quality & Compliance
  ADD COLUMN IF NOT EXISTS certifications TEXT[], -- array of certifications (ISO, CE, etc.)
  ADD COLUMN IF NOT EXISTS quality_standards TEXT,
  ADD COLUMN IF NOT EXISTS return_policy TEXT,
  ADD COLUMN IF NOT EXISTS warranty_terms TEXT,
  
  -- Performance metrics
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_order_value NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS on_time_delivery_rate NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_time_hours NUMERIC(10, 2),
  
  -- Additional fields
  ADD COLUMN IF NOT EXISTS business_hours TEXT,
  ADD COLUMN IF NOT EXISTS language_preferences TEXT[],
  ADD COLUMN IF NOT EXISTS time_zone TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_date DATE,
  ADD COLUMN IF NOT EXISTS next_follow_up_date DATE,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'standard'; -- premium, standard, budget

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_suppliers_business_type ON lats_suppliers(business_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_priority_level ON lats_suppliers(priority_level);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_favorite ON lats_suppliers(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_suppliers_average_rating ON lats_suppliers(average_rating) WHERE average_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_last_contact ON lats_suppliers(last_contact_date) WHERE last_contact_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_next_follow_up ON lats_suppliers(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;

-- Add comments
COMMENT ON COLUMN lats_suppliers.credit_limit IS 'Maximum credit allowed for this supplier';
COMMENT ON COLUMN lats_suppliers.current_balance IS 'Current outstanding balance';
COMMENT ON COLUMN lats_suppliers.priority_level IS 'Supplier priority: premium, standard, or budget';
COMMENT ON COLUMN lats_suppliers.is_favorite IS 'Flag for quick access to frequently used suppliers';

-- ================================================
-- 10. CREATE USEFUL VIEWS
-- ================================================

-- View for suppliers with expiring contracts
CREATE OR REPLACE VIEW supplier_contracts_expiring AS
SELECT 
  s.id AS supplier_id,
  s.name AS supplier_name,
  c.id AS contract_id,
  c.contract_number,
  c.contract_name,
  c.end_date,
  c.contract_value,
  c.auto_renew,
  (c.end_date - CURRENT_DATE) AS days_until_expiry
FROM lats_suppliers s
JOIN lats_supplier_contracts c ON s.id = c.supplier_id
WHERE c.status = 'active'
  AND c.end_date >= CURRENT_DATE
  AND c.end_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY c.end_date ASC;

COMMENT ON VIEW supplier_contracts_expiring IS 'Shows contracts expiring in the next 90 days';

-- View for supplier performance summary
CREATE OR REPLACE VIEW supplier_performance_summary AS
SELECT 
  s.id,
  s.name,
  s.average_rating,
  s.total_orders,
  s.total_order_value,
  s.on_time_delivery_rate,
  s.quality_score,
  COUNT(DISTINCT r.id) AS review_count,
  AVG(r.overall_rating)::NUMERIC(3,2) AS calculated_avg_rating,
  MAX(c.created_at) AS last_communication_date,
  COUNT(DISTINCT d.id) AS document_count
FROM lats_suppliers s
LEFT JOIN lats_supplier_ratings r ON s.id = r.supplier_id
LEFT JOIN lats_supplier_communications c ON s.id = c.supplier_id
LEFT JOIN lats_supplier_documents d ON s.id = d.supplier_id
WHERE s.is_active = true
  AND s.is_trade_in_customer = false
GROUP BY s.id, s.name, s.average_rating, s.total_orders, s.total_order_value, 
         s.on_time_delivery_rate, s.quality_score;

COMMENT ON VIEW supplier_performance_summary IS 'Comprehensive supplier performance metrics';

-- View for documents expiring soon
CREATE OR REPLACE VIEW supplier_documents_expiring AS
SELECT 
  s.id AS supplier_id,
  s.name AS supplier_name,
  d.id AS document_id,
  d.document_type,
  d.file_name,
  d.expiry_date,
  (d.expiry_date - CURRENT_DATE) AS days_until_expiry
FROM lats_suppliers s
JOIN lats_supplier_documents d ON s.id = d.supplier_id
WHERE d.expiry_date IS NOT NULL
  AND d.expiry_date >= CURRENT_DATE
  AND d.expiry_date <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY d.expiry_date ASC;

COMMENT ON VIEW supplier_documents_expiring IS 'Shows supplier documents expiring in the next 60 days';

-- ================================================
-- 11. INSERT DEFAULT SUPPLIER CATEGORIES
-- ================================================
INSERT INTO lats_supplier_categories (name, description, icon, color) VALUES
  ('Electronics', 'Consumer electronics and gadgets', 'Laptop', '#3B82F6'),
  ('Mobile Phones', 'Smartphones and mobile devices', 'Smartphone', '#10B981'),
  ('Accessories', 'Phone cases, chargers, cables', 'Headphones', '#F59E0B'),
  ('Computers', 'Laptops, desktops, tablets', 'Monitor', '#8B5CF6'),
  ('Audio Equipment', 'Speakers, headphones, microphones', 'Speaker', '#EF4444'),
  ('Gaming', 'Gaming consoles and accessories', 'Gamepad2', '#EC4899'),
  ('Networking', 'Routers, switches, network equipment', 'Router', '#14B8A6'),
  ('Storage', 'Hard drives, SSDs, memory cards', 'HardDrive', '#6366F1'),
  ('Office Equipment', 'Printers, scanners, office supplies', 'Printer', '#84CC16'),
  ('Wearables', 'Smart watches, fitness trackers', 'Watch', '#F97316')
ON CONFLICT (name) DO NOTHING;

-- ================================================
-- 12. INSERT DEFAULT SUPPLIER TAGS
-- ================================================
INSERT INTO lats_supplier_tags (name, color, description) VALUES
  ('Trusted', '#10B981', 'Highly reliable supplier'),
  ('Fast Shipping', '#3B82F6', 'Quick delivery times'),
  ('Competitive Pricing', '#F59E0B', 'Best prices in market'),
  ('Quality Products', '#8B5CF6', 'High quality standards'),
  ('Good Communication', '#EC4899', 'Responsive and helpful'),
  ('Bulk Discounts', '#14B8A6', 'Offers quantity discounts'),
  ('Credit Terms', '#6366F1', 'Provides payment terms'),
  ('Local Supplier', '#84CC16', 'Based locally'),
  ('International', '#F97316', 'International supplier'),
  ('New Supplier', '#94A3B8', 'Recently added')
ON CONFLICT (name) DO NOTHING;

-- ================================================
-- 13. CREATE TRIGGERS FOR AUTO-UPDATING
-- ================================================

-- Trigger to update supplier average rating when new rating is added
CREATE OR REPLACE FUNCTION update_supplier_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lats_suppliers
  SET average_rating = (
    SELECT AVG(overall_rating)::NUMERIC(3,2)
    FROM lats_supplier_ratings
    WHERE supplier_id = NEW.supplier_id
  )
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_supplier_rating ON lats_supplier_ratings;
CREATE TRIGGER trigger_update_supplier_rating
AFTER INSERT OR UPDATE ON lats_supplier_ratings
FOR EACH ROW
EXECUTE FUNCTION update_supplier_average_rating();

-- Trigger to update last_contact_date when communication is added
CREATE OR REPLACE FUNCTION update_supplier_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lats_suppliers
  SET last_contact_date = CURRENT_DATE
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_contact ON lats_supplier_communications;
CREATE TRIGGER trigger_update_last_contact
AFTER INSERT ON lats_supplier_communications
FOR EACH ROW
EXECUTE FUNCTION update_supplier_last_contact();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_supplier_documents_updated_at ON lats_supplier_documents;
CREATE TRIGGER update_supplier_documents_updated_at
BEFORE UPDATE ON lats_supplier_documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_communications_updated_at ON lats_supplier_communications;
CREATE TRIGGER update_supplier_communications_updated_at
BEFORE UPDATE ON lats_supplier_communications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_ratings_updated_at ON lats_supplier_ratings;
CREATE TRIGGER update_supplier_ratings_updated_at
BEFORE UPDATE ON lats_supplier_ratings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_contracts_updated_at ON lats_supplier_contracts;
CREATE TRIGGER update_supplier_contracts_updated_at
BEFORE UPDATE ON lats_supplier_contracts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
-- This migration adds:
-- 1. Supplier Documents (contracts, licenses, certificates)
-- 2. Communication History (emails, calls, meetings)
-- 3. Ratings & Reviews (performance tracking)
-- 4. Categories & Tags (organization)
-- 5. Contract Management (with expiry tracking)
-- 6. Financial Tracking (credit limits, balances)
-- 7. Enhanced supplier fields (business info, logistics, etc.)
-- 8. Useful views for reporting
-- 9. Auto-update triggers
-- ================================================

