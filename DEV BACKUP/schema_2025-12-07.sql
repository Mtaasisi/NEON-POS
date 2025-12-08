-- ============================================
-- FULL DATABASE SCHEMA BACKUP
-- Generated: 2025-12-07T01:30:32.171Z
-- ============================================

-- ============================================
-- Table: account_transactions
-- ============================================

DROP TABLE IF EXISTS account_transactions CASCADE;

CREATE TABLE account_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  transaction_type text NOT NULL,
  amount numeric NOT NULL,
  balance_before numeric DEFAULT 0,
  balance_after numeric DEFAULT 0,
  reference_number text,
  description text,
  related_transaction_id uuid,
  metadata jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  related_entity_type varchar(50),
  related_entity_id uuid,
  branch_id uuid,
  status text DEFAULT 'approved'::text
);

ALTER TABLE account_transactions ADD CONSTRAINT account_transactions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: admin_settings
-- ============================================

DROP TABLE IF EXISTS admin_settings CASCADE;

CREATE TABLE admin_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category varchar(50) NOT NULL,
  setting_key varchar(100) NOT NULL,
  setting_value text,
  setting_type varchar(20) DEFAULT 'string'::character varying,
  description text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: admin_settings_log
-- ============================================

DROP TABLE IF EXISTS admin_settings_log CASCADE;

CREATE TABLE admin_settings_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category varchar(50) NOT NULL,
  setting_key varchar(100) NOT NULL,
  old_value text,
  new_value text,
  changed_by text,
  change_reason text,
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings_log ADD CONSTRAINT admin_settings_log_pkey PRIMARY KEY (id);

-- ============================================
-- Table: api_keys
-- ============================================

DROP TABLE IF EXISTS api_keys CASCADE;

CREATE TABLE api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  key text NOT NULL,
  scopes _text DEFAULT '{}'::text[],
  is_active bool DEFAULT true,
  last_used timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_keys ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);

-- ============================================
-- Table: api_request_logs
-- ============================================

DROP TABLE IF EXISTS api_request_logs CASCADE;

CREATE TABLE api_request_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  api_key_id uuid,
  endpoint text NOT NULL,
  method text NOT NULL,
  ip_address text,
  user_agent text,
  response_status int4,
  response_time_ms int4,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_request_logs ADD CONSTRAINT api_request_logs_pkey PRIMARY KEY (id);

-- ============================================
-- Table: appointments
-- ============================================

DROP TABLE IF EXISTS appointments CASCADE;

CREATE TABLE appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  device_id uuid,
  technician_id uuid,
  appointment_date timestamptz NOT NULL,
  duration_minutes int4 DEFAULT 60,
  status text DEFAULT 'scheduled'::text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  service_type text,
  appointment_time text DEFAULT '00:00:00'::text,
  customer_name text,
  customer_phone text,
  technician_name text,
  priority text DEFAULT 'normal'::text,
  created_by uuid,
  branch_id uuid
);

ALTER TABLE appointments ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: attendance_records
-- ============================================

DROP TABLE IF EXISTS attendance_records CASCADE;

CREATE TABLE attendance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  attendance_date date NOT NULL,
  check_in_time timestamptz,
  check_out_time timestamptz,
  check_in_location_lat numeric,
  check_in_location_lng numeric,
  check_out_location_lat numeric,
  check_out_location_lng numeric,
  check_in_network_ssid varchar(255),
  check_out_network_ssid varchar(255),
  check_in_photo_url text,
  check_out_photo_url text,
  total_hours numeric DEFAULT 0,
  break_hours numeric DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  status varchar(50) DEFAULT 'present'::character varying,
  notes text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  branch_id uuid
);

ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);

-- ============================================
-- Table: audit_logs
-- ============================================

DROP TABLE IF EXISTS audit_logs CASCADE;

CREATE TABLE audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  details text,
  entity_type text,
  entity_id uuid,
  user_role text,
  timestamp timestamptz,
  category varchar(50),
  description text,
  old_values jsonb,
  new_values jsonb,
  user_name varchar(255),
  branch_id uuid,
  branch_name varchar(255),
  metadata jsonb
);

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

-- ============================================
-- Table: auth_users
-- ============================================

DROP TABLE IF EXISTS auth_users CASCADE;

CREATE TABLE auth_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  username text,
  name text,
  role text DEFAULT 'technician'::text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  permissions _text,
  max_devices_allowed int4 DEFAULT 10,
  require_approval bool DEFAULT false,
  failed_login_attempts int4 DEFAULT 0,
  two_factor_enabled bool DEFAULT false,
  two_factor_secret text,
  last_login timestamptz,
  branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE auth_users ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);

-- ============================================
-- Table: auto_reorder_log
-- ============================================

DROP TABLE IF EXISTS auto_reorder_log CASCADE;

CREATE TABLE auto_reorder_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  supplier_id uuid,
  triggered_quantity int4 NOT NULL,
  reorder_point int4 NOT NULL,
  suggested_quantity int4 NOT NULL,
  purchase_order_id uuid,
  po_created bool DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE auto_reorder_log ADD CONSTRAINT auto_reorder_log_pkey PRIMARY KEY (id);

-- ============================================
-- Table: backup_logs
-- ============================================

DROP TABLE IF EXISTS backup_logs CASCADE;

CREATE TABLE backup_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  backup_type text NOT NULL,
  status text DEFAULT 'pending'::text,
  file_path text,
  file_size int8,
  record_count int4,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  created_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE backup_logs ADD CONSTRAINT backup_logs_pkey PRIMARY KEY (id);

-- ============================================
-- Table: branch_activity_log
-- ============================================

DROP TABLE IF EXISTS branch_activity_log CASCADE;

CREATE TABLE branch_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL,
  user_id uuid,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE branch_activity_log ADD CONSTRAINT branch_activity_log_pkey PRIMARY KEY (id);

-- ============================================
-- Table: branch_transfers
-- ============================================

DROP TABLE IF EXISTS branch_transfers CASCADE;

CREATE TABLE branch_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_branch_id uuid NOT NULL,
  to_branch_id uuid NOT NULL,
  transfer_type text NOT NULL DEFAULT 'stock'::text,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  quantity int4,
  status text DEFAULT 'pending'::text,
  requested_by uuid,
  approved_by uuid,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  requested_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  rejection_reason text
);

ALTER TABLE branch_transfers ADD CONSTRAINT branch_transfers_pkey PRIMARY KEY (id);

-- ============================================
-- Table: bulk_message_templates
-- ============================================

DROP TABLE IF EXISTS bulk_message_templates CASCADE;

CREATE TABLE bulk_message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  branch_id uuid,
  name varchar(255) NOT NULL,
  description text,
  message_type varchar(20) NOT NULL,
  content text NOT NULL,
  category varchar(50),
  tags _text,
  media_url text,
  media_type varchar(20),
  usage_count int4 DEFAULT 0,
  last_used_at timestamptz,
  is_active bool DEFAULT true,
  is_favorite bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bulk_message_templates ADD CONSTRAINT bulk_message_templates_pkey PRIMARY KEY (id);

-- ============================================
-- Table: buyer_details
-- ============================================

DROP TABLE IF EXISTS buyer_details CASCADE;

CREATE TABLE buyer_details (
  buyer_id int8 NOT NULL DEFAULT nextval('buyer_details_buyer_id_seq'::regclass),
  customer_id int8 NOT NULL,
  buying_messages int4 DEFAULT 0,
  unique_keywords int4 DEFAULT 0,
  keywords_found text,
  first_inquiry_date timestamp,
  last_inquiry_date timestamp,
  buying_score int4 DEFAULT 0,
  buyer_tier text,
  sample_message text,
  conversion_status text DEFAULT 'pending'::text,
  last_contacted timestamp,
  notes text
);

ALTER TABLE buyer_details ADD CONSTRAINT buyer_details_pkey PRIMARY KEY (buyer_id);

-- ============================================
-- Table: campaign_notifications
-- ============================================

DROP TABLE IF EXISTS campaign_notifications CASCADE;

CREATE TABLE campaign_notifications (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  user_id text NOT NULL,
  campaign_id text,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read bool DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_notifications ADD CONSTRAINT campaign_notifications_pkey PRIMARY KEY (id);

-- ============================================
-- Table: categories
-- ============================================

DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_id uuid,
  branch_id uuid,
  is_shared bool DEFAULT true,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

-- ============================================
-- Table: chat_messages
-- ============================================

DROP TABLE IF EXISTS chat_messages CASCADE;

CREATE TABLE chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid,
  sender_id uuid,
  sender_type text,
  recipient_id uuid,
  recipient_type text,
  message_text text NOT NULL,
  message_type text DEFAULT 'text'::text,
  is_read bool DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);

-- ============================================
-- Table: communication_log
-- ============================================

DROP TABLE IF EXISTS communication_log CASCADE;

CREATE TABLE communication_log (
  log_id int8 NOT NULL DEFAULT nextval('communication_log_log_id_seq'::regclass),
  customer_id int8 NOT NULL,
  communication_type text,
  direction text,
  subject text,
  notes text,
  contacted_by text,
  contact_date timestamp DEFAULT CURRENT_TIMESTAMP,
  follow_up_required int4 DEFAULT 0,
  follow_up_date timestamp
);

ALTER TABLE communication_log ADD CONSTRAINT communication_log_pkey PRIMARY KEY (log_id);

-- ============================================
-- Table: communication_templates
-- ============================================

DROP TABLE IF EXISTS communication_templates CASCADE;

CREATE TABLE communication_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_type text NOT NULL,
  subject text,
  body text NOT NULL,
  variables jsonb,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE communication_templates ADD CONSTRAINT communication_templates_pkey PRIMARY KEY (id);

-- ============================================
-- Table: contact_history
-- ============================================

DROP TABLE IF EXISTS contact_history CASCADE;

CREATE TABLE contact_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  contact_type text NOT NULL,
  contact_method text,
  contact_subject text,
  contact_notes text,
  contacted_by uuid,
  contacted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_history ADD CONSTRAINT contact_history_pkey PRIMARY KEY (id);

-- ============================================
-- Table: contact_methods
-- ============================================

DROP TABLE IF EXISTS contact_methods CASCADE;

CREATE TABLE contact_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  method_type text NOT NULL,
  contact_value text NOT NULL,
  is_primary bool DEFAULT false,
  is_verified bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contact_methods ADD CONSTRAINT contact_methods_pkey PRIMARY KEY (id);

-- ============================================
-- Table: contact_preferences
-- ============================================

DROP TABLE IF EXISTS contact_preferences CASCADE;

CREATE TABLE contact_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  preference_type text NOT NULL,
  preference_value jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contact_preferences ADD CONSTRAINT contact_preferences_pkey PRIMARY KEY (id);

-- ============================================
-- Table: customer_checkins
-- ============================================

DROP TABLE IF EXISTS customer_checkins CASCADE;

CREATE TABLE customer_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  checkin_date timestamptz DEFAULT now(),
  checkout_date timestamptz,
  purpose text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  staff_id uuid
);

ALTER TABLE customer_checkins ADD CONSTRAINT customer_checkins_pkey PRIMARY KEY (id);

-- ============================================
-- Table: customer_communications
-- ============================================

DROP TABLE IF EXISTS customer_communications CASCADE;

CREATE TABLE customer_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  type text,
  message text,
  status text,
  phone_number text,
  sent_by uuid,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_communications ADD CONSTRAINT customer_communications_pkey PRIMARY KEY (id);

-- ============================================
-- Table: customer_fix_backup
-- ============================================

DROP TABLE IF EXISTS customer_fix_backup CASCADE;

CREATE TABLE customer_fix_backup (
  backup_id int4 NOT NULL DEFAULT nextval('customer_fix_backup_backup_id_seq'::regclass),
  backup_timestamp timestamptz DEFAULT now(),
  customer_id uuid,
  customer_name text,
  customer_phone text,
  old_total_spent numeric,
  new_total_spent numeric,
  old_points int4,
  new_points int4,
  old_loyalty_level text,
  new_loyalty_level text,
  sale_number text,
  fix_reason text
);

ALTER TABLE customer_fix_backup ADD CONSTRAINT customer_fix_backup_pkey PRIMARY KEY (backup_id);

-- ============================================
-- Table: customer_installment_plan_payments
-- ============================================

DROP TABLE IF EXISTS customer_installment_plan_payments CASCADE;

CREATE TABLE customer_installment_plan_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  installment_plan_id uuid,
  customer_id uuid,
  installment_number int4 NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  payment_date timestamptz DEFAULT now(),
  due_date date NOT NULL,
  status text DEFAULT 'paid'::text,
  days_late int4 DEFAULT 0,
  late_fee numeric DEFAULT 0,
  account_id uuid,
  reference_number text,
  notification_sent bool DEFAULT false,
  notification_sent_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_installment_plan_payments ADD CONSTRAINT customer_installment_plan_payments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: customer_installment_plans
-- ============================================

DROP TABLE IF EXISTS customer_installment_plans CASCADE;

CREATE TABLE customer_installment_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_number text NOT NULL,
  customer_id uuid,
  sale_id uuid,
  branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  total_amount numeric NOT NULL,
  down_payment numeric DEFAULT 0,
  amount_financed numeric NOT NULL,
  total_paid numeric DEFAULT 0,
  balance_due numeric NOT NULL,
  installment_amount numeric NOT NULL,
  number_of_installments int4 NOT NULL,
  installments_paid int4 DEFAULT 0,
  payment_frequency text DEFAULT 'monthly'::text,
  start_date date NOT NULL,
  next_payment_date date NOT NULL,
  end_date date NOT NULL,
  completion_date date,
  status text DEFAULT 'active'::text,
  late_fee_amount numeric DEFAULT 0,
  late_fee_applied numeric DEFAULT 0,
  days_overdue int4 DEFAULT 0,
  last_reminder_sent timestamptz,
  reminder_count int4 DEFAULT 0,
  terms_accepted bool DEFAULT true,
  terms_accepted_date timestamptz DEFAULT now(),
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_installment_plans ADD CONSTRAINT customer_installment_plans_pkey PRIMARY KEY (id);

-- ============================================
-- Table: customer_messages
-- ============================================

DROP TABLE IF EXISTS customer_messages CASCADE;

CREATE TABLE customer_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  message text NOT NULL,
  direction text NOT NULL DEFAULT 'inbound'::text,
  channel text NOT NULL DEFAULT 'chat'::text,
  status text NOT NULL DEFAULT 'sent'::text,
  sender_id uuid,
  sender_name text,
  device_id uuid,
  appointment_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  delivered_at timestamptz,
  branch_id uuid,
  is_shared bool DEFAULT false
);

ALTER TABLE customer_messages ADD CONSTRAINT customer_messages_pkey PRIMARY KEY (id);

-- ============================================
-- Table: customer_notes
-- ============================================

DROP TABLE IF EXISTS customer_notes CASCADE;

CREATE TABLE customer_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  note text NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_notes ADD CONSTRAINT customer_notes_pkey PRIMARY KEY (id);

-- ============================================
-- Table: customer_payments
-- ============================================

DROP TABLE IF EXISTS customer_payments CASCADE;

CREATE TABLE customer_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  device_id uuid,
  amount numeric NOT NULL,
  method text DEFAULT 'cash'::text,
  payment_type text DEFAULT 'payment'::text,
  status text DEFAULT 'completed'::text,
  reference_number text,
  notes text,
  payment_date timestamptz DEFAULT now(),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sale_id uuid,
  branch_id uuid,
  currency varchar(10) DEFAULT 'TZS'::character varying,
  is_shared bool DEFAULT true
);

ALTER TABLE customer_payments ADD CONSTRAINT customer_payments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: customer_points_history
-- ============================================

DROP TABLE IF EXISTS customer_points_history CASCADE;

CREATE TABLE customer_points_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  points_change int4 NOT NULL,
  reason text,
  transaction_type text DEFAULT 'manual'::text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_points_history ADD CONSTRAINT customer_points_history_pkey PRIMARY KEY (id);

-- ============================================
-- Table: customer_preferences
-- ============================================

DROP TABLE IF EXISTS customer_preferences CASCADE;

CREATE TABLE customer_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  preferred_contact_method varchar(50),
  communication_frequency varchar(50),
  marketing_opt_in bool DEFAULT true,
  sms_opt_in bool DEFAULT true,
  email_opt_in bool DEFAULT true,
  whatsapp_opt_in bool DEFAULT true,
  preferred_language varchar(10) DEFAULT 'en'::character varying,
  notification_preferences jsonb DEFAULT '{}'::jsonb,
  preferred_branch varchar(255),
  preferred_payment_method varchar(50),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_preferences ADD CONSTRAINT customer_preferences_pkey PRIMARY KEY (id);

-- ============================================
-- Table: customer_revenue
-- ============================================

DROP TABLE IF EXISTS customer_revenue CASCADE;

CREATE TABLE customer_revenue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  revenue_date date NOT NULL,
  revenue_amount numeric DEFAULT 0,
  revenue_source text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_revenue ADD CONSTRAINT customer_revenue_pkey PRIMARY KEY (id);

-- ============================================
-- Table: customer_special_orders
-- ============================================

DROP TABLE IF EXISTS customer_special_orders CASCADE;

CREATE TABLE customer_special_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  customer_id uuid,
  branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  product_name text NOT NULL,
  product_description text,
  quantity int4 NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  deposit_paid numeric DEFAULT 0,
  balance_due numeric DEFAULT 0,
  status text DEFAULT 'deposit_received'::text,
  order_date timestamptz DEFAULT now(),
  expected_arrival_date date,
  actual_arrival_date date,
  delivery_date timestamptz,
  supplier_name text,
  supplier_reference text,
  country_of_origin text,
  tracking_number text,
  notes text,
  internal_notes text,
  customer_notified_arrival bool DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_special_orders ADD CONSTRAINT customer_special_orders_pkey PRIMARY KEY (id);

-- ============================================
-- Table: customers_duplicates_backup
-- ============================================

DROP TABLE IF EXISTS customers_duplicates_backup CASCADE;

CREATE TABLE customers_duplicates_backup (
  id uuid,
  name text,
  email text,
  phone text,
  address text,
  city text,
  location text,
  branch_id uuid,
  loyalty_points int4,
  total_spent numeric,
  status text,
  is_active bool,
  created_at timestamptz,
  updated_at timestamptz,
  whatsapp text,
  gender text,
  country text,
  color_tag text,
  loyalty_level text,
  points int4,
  last_visit timestamptz,
  referral_source text,
  birth_month text,
  birth_day text,
  birthday date,
  initial_notes text,
  notes text,
  customer_tag text,
  location_description text,
  national_id text,
  joined_date date,
  profile_image text,
  whatsapp_opt_out bool,
  referred_by uuid,
  created_by uuid,
  last_purchase_date timestamptz,
  total_purchases int4,
  total_returns int4,
  total_calls int4,
  total_call_duration_minutes numeric,
  incoming_calls int4,
  outgoing_calls int4,
  missed_calls int4,
  avg_call_duration_minutes numeric,
  first_call_date timestamptz,
  last_call_date timestamptz,
  call_loyalty_level text,
  last_activity_date timestamptz,
  referrals jsonb,
  is_shared bool,
  preferred_branch_id uuid,
  visible_to_branches _uuid,
  sharing_mode text,
  created_by_branch_id uuid,
  created_by_branch_name text,
  backup_date timestamptz,
  backup_reason text
);

-- ============================================
-- Table: daily_opening_sessions
-- ============================================

DROP TABLE IF EXISTS daily_opening_sessions CASCADE;

CREATE TABLE daily_opening_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  opened_by varchar(255),
  opened_by_user_id uuid,
  is_active bool DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_opening_sessions ADD CONSTRAINT daily_opening_sessions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: daily_reports
-- ============================================

DROP TABLE IF EXISTS daily_reports CASCADE;

CREATE TABLE daily_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  hours_worked numeric DEFAULT 0,
  tasks_completed _text,
  tasks_in_progress _text,
  projects_worked _text,
  sales_achieved numeric DEFAULT 0,
  customers_served int4 DEFAULT 0,
  issues_resolved int4 DEFAULT 0,
  achievements text,
  challenges text,
  learnings text,
  goals_for_tomorrow text,
  feedback text,
  mood_rating int4,
  energy_level int4,
  status text DEFAULT 'draft'::text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  report_type text NOT NULL DEFAULT 'daily'::text,
  report_month date,
  title text NOT NULL DEFAULT ''::text,
  customer_interactions text,
  pending_work text,
  recommendations text,
  additional_notes text,
  sales_made int4 DEFAULT 0,
  pending_tasks int4 DEFAULT 0,
  submitted_at timestamptz
);

ALTER TABLE daily_reports ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);

-- ============================================
-- Table: daily_sales_closures
-- ============================================

DROP TABLE IF EXISTS daily_sales_closures CASCADE;

CREATE TABLE daily_sales_closures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  total_sales numeric DEFAULT 0,
  total_transactions int4 DEFAULT 0,
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by text NOT NULL,
  closed_by_user_id uuid,
  sales_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  session_id uuid
);

ALTER TABLE daily_sales_closures ADD CONSTRAINT daily_sales_closures_pkey PRIMARY KEY (id);

-- ============================================
-- Table: device_attachments
-- ============================================

DROP TABLE IF EXISTS device_attachments CASCADE;

CREATE TABLE device_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size int4,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE device_attachments ADD CONSTRAINT device_attachments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: device_checklists
-- ============================================

DROP TABLE IF EXISTS device_checklists CASCADE;

CREATE TABLE device_checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  checklist_item text NOT NULL,
  is_checked bool DEFAULT false,
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE device_checklists ADD CONSTRAINT device_checklists_pkey PRIMARY KEY (id);

-- ============================================
-- Table: device_ratings
-- ============================================

DROP TABLE IF EXISTS device_ratings CASCADE;

CREATE TABLE device_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  customer_id uuid,
  rating int4,
  review_text text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE device_ratings ADD CONSTRAINT device_ratings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: device_remarks
-- ============================================

DROP TABLE IF EXISTS device_remarks CASCADE;

CREATE TABLE device_remarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  remark text NOT NULL,
  remark_type text DEFAULT 'general'::text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE device_remarks ADD CONSTRAINT device_remarks_pkey PRIMARY KEY (id);

-- ============================================
-- Table: device_transitions
-- ============================================

DROP TABLE IF EXISTS device_transitions CASCADE;

CREATE TABLE device_transitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  from_status text,
  to_status text NOT NULL,
  transitioned_by uuid,
  transition_notes text,
  transitioned_at timestamptz DEFAULT now(),
  performed_by uuid,
  created_at timestamptz DEFAULT now(),
  signature text
);

ALTER TABLE device_transitions ADD CONSTRAINT device_transitions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: devices
-- ============================================

DROP TABLE IF EXISTS devices CASCADE;

CREATE TABLE devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  device_name text NOT NULL,
  brand text,
  model text,
  serial_number text,
  imei text,
  problem_description text,
  diagnostic_notes text,
  repair_notes text,
  status text DEFAULT 'pending'::text,
  estimated_cost numeric DEFAULT 0,
  actual_cost numeric DEFAULT 0,
  deposit_amount numeric DEFAULT 0,
  balance_amount numeric DEFAULT 0,
  technician_id uuid,
  intake_date timestamptz DEFAULT now(),
  estimated_completion_date timestamptz,
  actual_completion_date timestamptz,
  pickup_date timestamptz,
  warranty_expiry_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  priority text DEFAULT 'normal'::text,
  password text,
  accessories text,
  issue_description text,
  assigned_to uuid,
  expected_return_date timestamptz,
  estimated_hours int4,
  diagnosis_required bool DEFAULT false,
  device_notes text,
  device_cost numeric DEFAULT 0,
  repair_cost numeric DEFAULT 0,
  repair_price numeric DEFAULT 0,
  unlock_code text,
  device_condition text,
  diagnostic_checklist jsonb,
  branch_id uuid,
  is_shared bool DEFAULT true
);

ALTER TABLE devices ADD CONSTRAINT devices_pkey PRIMARY KEY (id);

-- ============================================
-- Table: diagnostic_checklist_results
-- ============================================

DROP TABLE IF EXISTS diagnostic_checklist_results CASCADE;

CREATE TABLE diagnostic_checklist_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  problem_template_id uuid,
  checklist_items jsonb,
  overall_status text,
  technician_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE diagnostic_checklist_results ADD CONSTRAINT diagnostic_checklist_results_pkey PRIMARY KEY (id);

-- ============================================
-- Table: diagnostic_checks
-- ============================================

DROP TABLE IF EXISTS diagnostic_checks CASCADE;

CREATE TABLE diagnostic_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid,
  check_name text NOT NULL,
  check_result text,
  is_passed bool,
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  diagnostic_device_id uuid
);

ALTER TABLE diagnostic_checks ADD CONSTRAINT diagnostic_checks_pkey PRIMARY KEY (id);

-- ============================================
-- Table: diagnostic_devices
-- ============================================

DROP TABLE IF EXISTS diagnostic_devices CASCADE;

CREATE TABLE diagnostic_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  diagnostic_data jsonb,
  diagnostic_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE diagnostic_devices ADD CONSTRAINT diagnostic_devices_pkey PRIMARY KEY (id);

-- ============================================
-- Table: diagnostic_problem_templates
-- ============================================

DROP TABLE IF EXISTS diagnostic_problem_templates CASCADE;

CREATE TABLE diagnostic_problem_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  problem_name text NOT NULL,
  problem_description text,
  suggested_solutions jsonb,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  checklist_items jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE diagnostic_problem_templates ADD CONSTRAINT diagnostic_problem_templates_pkey PRIMARY KEY (id);

-- ============================================
-- Table: diagnostic_requests
-- ============================================

DROP TABLE IF EXISTS diagnostic_requests CASCADE;

CREATE TABLE diagnostic_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  template_id uuid,
  requested_by uuid,
  status text DEFAULT 'pending'::text,
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE diagnostic_requests ADD CONSTRAINT diagnostic_requests_pkey PRIMARY KEY (id);

-- ============================================
-- Table: diagnostic_templates
-- ============================================

DROP TABLE IF EXISTS diagnostic_templates CASCADE;

CREATE TABLE diagnostic_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  device_type text,
  checklist_items jsonb,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE diagnostic_templates ADD CONSTRAINT diagnostic_templates_pkey PRIMARY KEY (id);

-- ============================================
-- Table: document_templates
-- ============================================

DROP TABLE IF EXISTS document_templates CASCADE;

CREATE TABLE document_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type text NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  is_default bool DEFAULT false,
  variables _text DEFAULT '{}'::text[],
  paper_size text DEFAULT 'A4'::text,
  orientation text DEFAULT 'portrait'::text,
  header_html text,
  footer_html text,
  css_styles text,
  logo_url text,
  show_logo bool DEFAULT true,
  show_business_info bool DEFAULT true,
  show_customer_info bool DEFAULT true,
  show_payment_info bool DEFAULT true,
  show_terms bool DEFAULT true,
  terms_text text,
  show_signature bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE document_templates ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);

-- ============================================
-- Table: email_logs
-- ============================================

DROP TABLE IF EXISTS email_logs CASCADE;

CREATE TABLE email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  subject text,
  body text,
  status text DEFAULT 'pending'::text,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  to_email varchar(255),
  message_id varchar(255),
  provider_response jsonb,
  branch_id uuid,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz
);

ALTER TABLE email_logs ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);

-- ============================================
-- Table: employee_shifts
-- ============================================

DROP TABLE IF EXISTS employee_shifts CASCADE;

CREATE TABLE employee_shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  shift_template_id uuid,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_duration_minutes int4 DEFAULT 0,
  status varchar(50) DEFAULT 'scheduled'::character varying,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

ALTER TABLE employee_shifts ADD CONSTRAINT employee_shifts_pkey PRIMARY KEY (id);

-- ============================================
-- Table: employees
-- ============================================

DROP TABLE IF EXISTS employees CASCADE;

CREATE TABLE employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  email varchar(255) NOT NULL,
  phone varchar(50),
  date_of_birth date,
  gender varchar(20),
  position varchar(100) NOT NULL,
  department varchar(100) NOT NULL,
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  termination_date date,
  employment_type varchar(50) DEFAULT 'full-time'::character varying,
  salary numeric NOT NULL DEFAULT 0,
  currency varchar(10) DEFAULT 'TZS'::character varying,
  status varchar(50) DEFAULT 'active'::character varying,
  performance_rating numeric DEFAULT 3.0,
  skills _text,
  manager_id uuid,
  location varchar(255),
  emergency_contact_name varchar(100),
  emergency_contact_phone varchar(50),
  address_line1 varchar(255),
  address_line2 varchar(255),
  city varchar(100),
  state varchar(100),
  postal_code varchar(20),
  country varchar(100) DEFAULT 'Tanzania'::character varying,
  photo_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  branch_id uuid,
  can_work_at_all_branches bool DEFAULT false,
  assigned_branches _uuid DEFAULT '{}'::uuid[],
  is_shared bool DEFAULT false,
  full_name text,
  is_active bool DEFAULT true
);

ALTER TABLE employees ADD CONSTRAINT employees_pkey PRIMARY KEY (id);

-- ============================================
-- Table: employees_backup_migration
-- ============================================

DROP TABLE IF EXISTS employees_backup_migration CASCADE;

CREATE TABLE employees_backup_migration (
  id uuid,
  user_id uuid,
  first_name varchar(100),
  last_name varchar(100),
  email varchar(255),
  phone varchar(50),
  date_of_birth date,
  gender varchar(20),
  position varchar(100),
  department varchar(100),
  hire_date date,
  termination_date date,
  employment_type varchar(50),
  salary numeric,
  currency varchar(10),
  status varchar(50),
  performance_rating numeric,
  skills _text,
  manager_id uuid,
  location varchar(255),
  emergency_contact_name varchar(100),
  emergency_contact_phone varchar(50),
  address_line1 varchar(255),
  address_line2 varchar(255),
  city varchar(100),
  state varchar(100),
  postal_code varchar(20),
  country varchar(100),
  photo_url text,
  bio text,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid,
  updated_by uuid
);

-- ============================================
-- Table: expense_categories
-- ============================================

DROP TABLE IF EXISTS expense_categories CASCADE;

CREATE TABLE expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  color text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expense_categories ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);

-- ============================================
-- Table: expenses
-- ============================================

DROP TABLE IF EXISTS expenses CASCADE;

CREATE TABLE expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  category text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  date timestamptz NOT NULL DEFAULT now(),
  reference_number text,
  vendor_name text,
  notes text,
  payment_method text,
  status text DEFAULT 'pending'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  purchase_order_id uuid,
  product_id uuid,
  created_by uuid
);

ALTER TABLE expenses ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);

-- ============================================
-- Table: finance_accounts
-- ============================================

DROP TABLE IF EXISTS finance_accounts CASCADE;

CREATE TABLE finance_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  account_type text NOT NULL,
  account_number text,
  bank_name text,
  current_balance numeric DEFAULT 0,
  currency text DEFAULT 'USD'::text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_payment_method bool DEFAULT false,
  name text,
  type text,
  balance numeric DEFAULT 0,
  requires_reference bool DEFAULT false,
  requires_account_number bool DEFAULT false,
  description text,
  icon text,
  color text,
  branch_id uuid,
  is_shared bool DEFAULT false,
  notes text
);

ALTER TABLE finance_accounts ADD CONSTRAINT finance_accounts_pkey PRIMARY KEY (id);

-- ============================================
-- Table: finance_expense_categories
-- ============================================

DROP TABLE IF EXISTS finance_expense_categories CASCADE;

CREATE TABLE finance_expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_name text NOT NULL,
  description text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  is_shared bool DEFAULT true
);

ALTER TABLE finance_expense_categories ADD CONSTRAINT finance_expense_categories_pkey PRIMARY KEY (id);

-- ============================================
-- Table: finance_expenses
-- ============================================

DROP TABLE IF EXISTS finance_expenses CASCADE;

CREATE TABLE finance_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expense_category_id uuid,
  account_id uuid,
  expense_date date NOT NULL,
  amount numeric NOT NULL,
  description text,
  receipt_number text,
  vendor text,
  payment_method text DEFAULT 'cash'::text,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  branch_id uuid,
  title text,
  status text DEFAULT 'approved'::text,
  receipt_url text
);

ALTER TABLE finance_expenses ADD CONSTRAINT finance_expenses_pkey PRIMARY KEY (id);

-- ============================================
-- Table: finance_transfers
-- ============================================

DROP TABLE IF EXISTS finance_transfers CASCADE;

CREATE TABLE finance_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_account_id uuid,
  to_account_id uuid,
  transfer_date timestamptz DEFAULT now(),
  amount numeric NOT NULL,
  description text,
  reference_number text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  branch_id uuid,
  is_shared bool DEFAULT false
);

ALTER TABLE finance_transfers ADD CONSTRAINT finance_transfers_pkey PRIMARY KEY (id);

-- ============================================
-- Table: gift_card_transactions
-- ============================================

DROP TABLE IF EXISTS gift_card_transactions CASCADE;

CREATE TABLE gift_card_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gift_card_id uuid,
  transaction_type text NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  sale_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  branch_id uuid
);

ALTER TABLE gift_card_transactions ADD CONSTRAINT gift_card_transactions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: gift_cards
-- ============================================

DROP TABLE IF EXISTS gift_cards CASCADE;

CREATE TABLE gift_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  card_number text NOT NULL,
  initial_balance numeric NOT NULL,
  current_balance numeric NOT NULL,
  customer_id uuid,
  status text DEFAULT 'active'::text,
  issued_by uuid,
  issued_date timestamptz DEFAULT now(),
  expiry_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  branch_id uuid,
  is_shared bool DEFAULT true
);

ALTER TABLE gift_cards ADD CONSTRAINT gift_cards_pkey PRIMARY KEY (id);

-- ============================================
-- Table: imei_validation
-- ============================================

DROP TABLE IF EXISTS imei_validation CASCADE;

CREATE TABLE imei_validation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  imei text NOT NULL,
  imei_status text NOT NULL,
  validation_reason text,
  source_table text,
  source_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE imei_validation ADD CONSTRAINT imei_validation_pkey PRIMARY KEY (id);

-- ============================================
-- Table: installment_payments
-- ============================================

DROP TABLE IF EXISTS installment_payments CASCADE;

CREATE TABLE installment_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  customer_id uuid,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  remaining_amount numeric DEFAULT 0,
  installment_count int4 DEFAULT 1,
  installment_amount numeric DEFAULT 0,
  next_due_date date,
  status text DEFAULT 'active'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  installment_plan_id uuid,
  installment_number int4 NOT NULL DEFAULT 1,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash'::text,
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  account_id uuid,
  reference_number text,
  payment_date timestamptz DEFAULT now(),
  days_late int4 DEFAULT 0,
  late_fee numeric DEFAULT 0,
  notification_sent bool DEFAULT false,
  notification_sent_at timestamptz,
  notes text,
  created_by uuid,
  branch_id uuid
);

ALTER TABLE installment_payments ADD CONSTRAINT installment_payments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: integrations
-- ============================================

DROP TABLE IF EXISTS integrations CASCADE;

CREATE TABLE integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  integration_name text NOT NULL,
  integration_type text NOT NULL,
  api_key text,
  api_secret text,
  config jsonb,
  is_active bool DEFAULT true,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE integrations ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);

-- ============================================
-- Table: inventory
-- ============================================

DROP TABLE IF EXISTS inventory CASCADE;

CREATE TABLE inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  variant_id uuid,
  branch_id uuid,
  quantity int4 NOT NULL DEFAULT 0,
  reserved_quantity int4 DEFAULT 0,
  min_stock_level int4 DEFAULT 0,
  max_stock_level int4,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);

-- ============================================
-- Table: inventory_items
-- ============================================

DROP TABLE IF EXISTS inventory_items CASCADE;

CREATE TABLE inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  variant_id uuid,
  serial_number text,
  imei text,
  mac_address text,
  barcode text,
  status text DEFAULT 'available'::text,
  location text,
  shelf text,
  bin text,
  purchase_date timestamptz,
  warranty_start date,
  warranty_end date,
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric,
  metadata jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  purchase_order_id uuid,
  purchase_order_item_id uuid,
  branch_id uuid,
  is_shared bool DEFAULT false,
  visible_to_branches _uuid,
  sharing_mode text DEFAULT 'isolated'::text
);

ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_branches
-- ============================================

DROP TABLE IF EXISTS lats_branches CASCADE;

CREATE TABLE lats_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  phone text,
  email text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_branches ADD CONSTRAINT lats_branches_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_brands
-- ============================================

DROP TABLE IF EXISTS lats_brands CASCADE;

CREATE TABLE lats_brands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_brands ADD CONSTRAINT lats_brands_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_categories
-- ============================================

DROP TABLE IF EXISTS lats_categories CASCADE;

CREATE TABLE lats_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  color text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  parent_id uuid,
  sort_order int4 DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  branch_id uuid,
  is_shared bool DEFAULT true
);

ALTER TABLE lats_categories ADD CONSTRAINT lats_categories_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_customers
-- ============================================

DROP TABLE IF EXISTS lats_customers CASCADE;

CREATE TABLE lats_customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  location text,
  branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  loyalty_points int4 DEFAULT 0,
  total_spent numeric DEFAULT 0,
  status text DEFAULT 'active'::text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  whatsapp text,
  gender text,
  country text,
  color_tag text DEFAULT 'new'::text,
  loyalty_level text DEFAULT 'bronze'::text,
  points int4 DEFAULT 0,
  last_visit timestamptz,
  referral_source text,
  birth_month text,
  birth_day text,
  birthday date,
  initial_notes text,
  notes text,
  customer_tag text,
  location_description text,
  national_id text,
  joined_date date DEFAULT CURRENT_DATE,
  profile_image text,
  whatsapp_opt_out bool DEFAULT false,
  referred_by uuid,
  created_by uuid,
  last_purchase_date timestamptz,
  total_purchases int4 DEFAULT 0,
  total_returns int4 DEFAULT 0,
  total_calls int4 DEFAULT 0,
  total_call_duration_minutes numeric DEFAULT 0,
  incoming_calls int4 DEFAULT 0,
  outgoing_calls int4 DEFAULT 0,
  missed_calls int4 DEFAULT 0,
  avg_call_duration_minutes numeric DEFAULT 0,
  first_call_date timestamptz,
  last_call_date timestamptz,
  call_loyalty_level text DEFAULT 'Basic'::text,
  last_activity_date timestamptz DEFAULT now(),
  referrals jsonb DEFAULT '[]'::jsonb,
  is_shared bool DEFAULT true,
  preferred_branch_id uuid,
  visible_to_branches _uuid,
  sharing_mode text DEFAULT 'isolated'::text,
  created_by_branch_id uuid,
  created_by_branch_name text
);

ALTER TABLE lats_customers ADD CONSTRAINT lats_customers_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_data_audit_log
-- ============================================

DROP TABLE IF EXISTS lats_data_audit_log CASCADE;

CREATE TABLE lats_data_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  change_reason text,
  change_source text,
  changed_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lats_data_audit_log ADD CONSTRAINT lats_data_audit_log_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_employees
-- ============================================

DROP TABLE IF EXISTS lats_employees CASCADE;

CREATE TABLE lats_employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  position text,
  branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  salary numeric DEFAULT 0,
  hire_date date DEFAULT CURRENT_DATE,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_employees ADD CONSTRAINT lats_employees_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_inventory_adjustments
-- ============================================

DROP TABLE IF EXISTS lats_inventory_adjustments CASCADE;

CREATE TABLE lats_inventory_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  variant_id uuid,
  quantity int4 NOT NULL,
  type text NOT NULL,
  reason text,
  notes text,
  reference_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lats_inventory_adjustments ADD CONSTRAINT lats_inventory_adjustments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_inventory_items
-- ============================================

DROP TABLE IF EXISTS lats_inventory_items CASCADE;

CREATE TABLE lats_inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid,
  purchase_order_item_id uuid,
  product_id uuid,
  variant_id uuid,
  serial_number text,
  imei text,
  mac_address text,
  barcode text,
  status text DEFAULT 'pending'::text,
  location text,
  shelf text,
  bin text,
  purchase_date timestamptz DEFAULT now(),
  warranty_start date,
  warranty_end date,
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric,
  quality_check_status text DEFAULT 'pending'::text,
  quality_check_notes text,
  quality_checked_at timestamptz,
  quality_checked_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  branch_id uuid,
  quantity int4 DEFAULT 1,
  storage_room_id uuid
);

ALTER TABLE lats_inventory_items ADD CONSTRAINT lats_inventory_items_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_pos_advanced_settings
-- ============================================

DROP TABLE IF EXISTS lats_pos_advanced_settings CASCADE;

CREATE TABLE lats_pos_advanced_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id uuid,
  enable_performance_mode bool DEFAULT true,
  enable_caching bool DEFAULT true,
  cache_size int4 DEFAULT 100,
  enable_lazy_loading bool DEFAULT true,
  max_concurrent_requests int4 DEFAULT 5,
  enable_database_optimization bool DEFAULT true,
  enable_auto_backup bool DEFAULT false,
  backup_frequency text DEFAULT 'daily'::text,
  enable_data_compression bool DEFAULT false,
  enable_query_optimization bool DEFAULT true,
  enable_two_factor_auth bool DEFAULT false,
  enable_session_timeout bool DEFAULT true,
  session_timeout_minutes int4 DEFAULT 60,
  enable_audit_logging bool DEFAULT false,
  enable_encryption bool DEFAULT false,
  enable_api_access bool DEFAULT false,
  enable_webhooks bool DEFAULT false,
  enable_third_party_integrations bool DEFAULT false,
  enable_data_sync bool DEFAULT true,
  sync_interval int4 DEFAULT 300000,
  enable_debug_mode bool DEFAULT false,
  enable_error_reporting bool DEFAULT true,
  enable_performance_monitoring bool DEFAULT false,
  enable_logging bool DEFAULT true,
  log_level text DEFAULT 'error'::text,
  enable_experimental_features bool DEFAULT false,
  enable_beta_features bool DEFAULT false,
  enable_custom_scripts bool DEFAULT false,
  enable_plugin_system bool DEFAULT false,
  enable_auto_updates bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_pos_advanced_settings ADD CONSTRAINT lats_pos_advanced_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_pos_analytics_reporting_settings
-- ============================================

DROP TABLE IF EXISTS lats_pos_analytics_reporting_settings CASCADE;

CREATE TABLE lats_pos_analytics_reporting_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id uuid,
  enable_analytics bool DEFAULT true,
  enable_real_time_analytics bool DEFAULT true,
  analytics_refresh_interval int4 DEFAULT 30000,
  enable_data_export bool DEFAULT true,
  enable_sales_analytics bool DEFAULT true,
  enable_sales_trends bool DEFAULT true,
  enable_product_performance bool DEFAULT true,
  enable_customer_analytics bool DEFAULT true,
  enable_revenue_tracking bool DEFAULT true,
  enable_inventory_analytics bool DEFAULT true,
  enable_stock_alerts bool DEFAULT true,
  enable_low_stock_reports bool DEFAULT true,
  enable_inventory_turnover bool DEFAULT true,
  enable_supplier_analytics bool DEFAULT false,
  enable_automated_reports bool DEFAULT false,
  report_generation_time text DEFAULT '08:00'::text,
  enable_email_reports bool DEFAULT false,
  enable_pdf_reports bool DEFAULT true,
  enable_excel_reports bool DEFAULT true,
  enable_custom_dashboard bool DEFAULT true,
  enable_kpi_widgets bool DEFAULT true,
  enable_chart_animations bool DEFAULT true,
  enable_data_drill_down bool DEFAULT true,
  enable_comparative_analysis bool DEFAULT true,
  enable_predictive_analytics bool DEFAULT false,
  enable_data_retention bool DEFAULT true,
  data_retention_days int4 DEFAULT 365,
  enable_data_backup bool DEFAULT true,
  enable_api_export bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_pos_analytics_reporting_settings ADD CONSTRAINT lats_pos_analytics_reporting_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_pos_barcode_scanner_settings
-- ============================================

DROP TABLE IF EXISTS lats_pos_barcode_scanner_settings CASCADE;

CREATE TABLE lats_pos_barcode_scanner_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id uuid,
  enable_barcode_scanner bool DEFAULT true,
  enable_camera_scanner bool DEFAULT false,
  enable_keyboard_input bool DEFAULT true,
  enable_manual_entry bool DEFAULT true,
  auto_add_to_cart bool DEFAULT true,
  auto_focus_search bool DEFAULT true,
  play_sound_on_scan bool DEFAULT true,
  vibrate_on_scan bool DEFAULT false,
  show_scan_feedback bool DEFAULT true,
  show_invalid_barcode_alert bool DEFAULT true,
  allow_unknown_products bool DEFAULT false,
  prompt_for_unknown_products bool DEFAULT true,
  retry_on_error bool DEFAULT true,
  max_retry_attempts int4 DEFAULT 3,
  scanner_device_name text,
  scanner_connection_type text DEFAULT 'usb'::text,
  scanner_timeout int4 DEFAULT 5000,
  support_ean13 bool DEFAULT true,
  support_ean8 bool DEFAULT true,
  support_upc_a bool DEFAULT true,
  support_upc_e bool DEFAULT true,
  support_code128 bool DEFAULT true,
  support_code39 bool DEFAULT true,
  support_qr_code bool DEFAULT true,
  support_data_matrix bool DEFAULT false,
  enable_continuous_scanning bool DEFAULT false,
  scan_delay int4 DEFAULT 500,
  enable_scan_history bool DEFAULT true,
  max_scan_history int4 DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_pos_barcode_scanner_settings ADD CONSTRAINT lats_pos_barcode_scanner_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_pos_delivery_settings
-- ============================================

DROP TABLE IF EXISTS lats_pos_delivery_settings CASCADE;

CREATE TABLE lats_pos_delivery_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id uuid,
  enable_delivery bool DEFAULT true,
  default_delivery_fee numeric DEFAULT 5000,
  free_delivery_threshold numeric DEFAULT 50000,
  max_delivery_distance int4 DEFAULT 20,
  enable_delivery_areas bool DEFAULT false,
  delivery_areas _text DEFAULT ARRAY[]::text[],
  area_delivery_fees jsonb DEFAULT '{}'::jsonb,
  area_delivery_times jsonb DEFAULT '{}'::jsonb,
  enable_delivery_hours bool DEFAULT false,
  delivery_start_time text DEFAULT '08:00'::text,
  delivery_end_time text DEFAULT '18:00'::text,
  enable_same_day_delivery bool DEFAULT true,
  enable_next_day_delivery bool DEFAULT true,
  delivery_time_slots _text DEFAULT ARRAY[]::text[],
  notify_customer_on_delivery bool DEFAULT true,
  notify_driver_on_assignment bool DEFAULT true,
  enable_sms_notifications bool DEFAULT false,
  enable_email_notifications bool DEFAULT false,
  enable_driver_assignment bool DEFAULT false,
  driver_commission numeric DEFAULT 10,
  require_signature bool DEFAULT false,
  enable_driver_tracking bool DEFAULT false,
  enable_scheduled_delivery bool DEFAULT false,
  enable_partial_delivery bool DEFAULT false,
  require_advance_payment bool DEFAULT false,
  advance_payment_percent numeric DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_pos_delivery_settings ADD CONSTRAINT lats_pos_delivery_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_pos_dynamic_pricing_settings
-- ============================================

DROP TABLE IF EXISTS lats_pos_dynamic_pricing_settings CASCADE;

CREATE TABLE lats_pos_dynamic_pricing_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id text,
  enable_dynamic_pricing bool DEFAULT false,
  enable_loyalty_pricing bool DEFAULT false,
  enable_bulk_pricing bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  enable_time_based_pricing bool DEFAULT false,
  enable_customer_pricing bool DEFAULT false,
  enable_special_events bool DEFAULT false,
  loyalty_discount_percent numeric DEFAULT 0,
  loyalty_points_threshold int4 DEFAULT 100,
  loyalty_max_discount numeric DEFAULT 20,
  bulk_discount_enabled bool DEFAULT false,
  bulk_discount_threshold int4 DEFAULT 10,
  bulk_discount_percent numeric DEFAULT 5,
  time_based_discount_enabled bool DEFAULT false,
  time_based_start_time text DEFAULT '00:00'::text,
  time_based_end_time text DEFAULT '23:59'::text,
  time_based_discount_percent numeric DEFAULT 0,
  customer_pricing_enabled bool DEFAULT false,
  vip_customer_discount numeric DEFAULT 10,
  regular_customer_discount numeric DEFAULT 5,
  special_events_enabled bool DEFAULT false,
  special_event_discount_percent numeric DEFAULT 15
);

ALTER TABLE lats_pos_dynamic_pricing_settings ADD CONSTRAINT lats_pos_dynamic_pricing_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_pos_general_settings
-- ============================================

DROP TABLE IF EXISTS lats_pos_general_settings CASCADE;

CREATE TABLE lats_pos_general_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id text,
  theme text DEFAULT 'light'::text,
  language text DEFAULT 'en'::text,
  currency text DEFAULT 'USD'::text,
  timezone text DEFAULT 'UTC'::text,
  date_format text DEFAULT 'MM/DD/YYYY'::text,
  time_format text DEFAULT '12'::text,
  show_product_images bool DEFAULT true,
  show_stock_levels bool DEFAULT true,
  show_prices bool DEFAULT true,
  show_barcodes bool DEFAULT true,
  products_per_page int4 DEFAULT 20,
  auto_complete_search bool DEFAULT true,
  confirm_delete bool DEFAULT true,
  show_confirmations bool DEFAULT true,
  enable_sound_effects bool DEFAULT true,
  sound_volume numeric DEFAULT 0.5,
  enable_click_sounds bool DEFAULT true,
  enable_cart_sounds bool DEFAULT true,
  enable_payment_sounds bool DEFAULT true,
  enable_delete_sounds bool DEFAULT true,
  enable_animations bool DEFAULT true,
  enable_caching bool DEFAULT true,
  cache_duration int4 DEFAULT 300000,
  enable_lazy_loading bool DEFAULT true,
  max_search_results int4 DEFAULT 50,
  enable_tax bool DEFAULT false,
  tax_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  day_closing_passcode varchar(255) DEFAULT '1234'::character varying,
  business_name text DEFAULT 'My Store'::text,
  business_address text DEFAULT ''::text,
  business_phone text DEFAULT ''::text,
  business_email text DEFAULT ''::text,
  business_website text DEFAULT ''::text,
  business_logo text,
  app_logo text,
  logo_size text DEFAULT 'medium'::text,
  logo_position text DEFAULT 'left'::text,
  company_name text,
  primary_color text DEFAULT '#3B82F6'::text,
  secondary_color text DEFAULT '#1E40AF'::text,
  accent_color text DEFAULT '#10B981'::text,
  tagline text DEFAULT ''::text,
  tax_id text DEFAULT ''::text,
  registration_number text DEFAULT ''::text,
  auto_backup_enabled bool DEFAULT false,
  auto_backup_frequency text DEFAULT 'daily'::text,
  auto_backup_time text DEFAULT '02:00'::text,
  auto_backup_type text DEFAULT 'full'::text,
  last_auto_backup timestamptz,
  font_size text DEFAULT 'medium'::text,
  products_per_row int4 DEFAULT 4
);

ALTER TABLE lats_pos_general_settings ADD CONSTRAINT lats_pos_general_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_pos_integrations_settings
-- ============================================

DROP TABLE IF EXISTS lats_pos_integrations_settings CASCADE;

CREATE TABLE lats_pos_integrations_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid,
  integration_name text NOT NULL,
  integration_type text NOT NULL,
  provider_name text,
  is_enabled bool DEFAULT false,
  is_active bool DEFAULT false,
  is_test_mode bool DEFAULT true,
  credentials jsonb DEFAULT '{}'::jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  description text,
  webhook_url text,
  callback_url text,
  environment text DEFAULT 'test'::text,
  last_used_at timestamptz,
  total_requests int4 DEFAULT 0,
  successful_requests int4 DEFAULT 0,
  failed_requests int4 DEFAULT 0,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_pos_integrations_settings ADD CONSTRAINT lats_pos_integrations_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_pos_loyalty_customer_settings
-- ============================================

DROP TABLE IF EXISTS lats_pos_loyalty_customer_settings CASCADE;

CREATE TABLE lats_pos_loyalty_customer_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id text,
  enable_loyalty bool DEFAULT false,
  points_per_dollar numeric DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  enable_loyalty_program bool DEFAULT true,
  loyalty_program_name text DEFAULT 'Loyalty Rewards'::text,
  points_per_currency numeric DEFAULT 1,
  points_redemption_rate numeric DEFAULT 100,
  minimum_points_redemption int4 DEFAULT 500,
  points_expiry_days int4 DEFAULT 365,
  enable_customer_registration bool DEFAULT true,
  require_customer_info bool DEFAULT false,
  enable_customer_categories bool DEFAULT true,
  enable_customer_tags bool DEFAULT true,
  enable_customer_notes bool DEFAULT true,
  enable_automatic_rewards bool DEFAULT true,
  enable_manual_rewards bool DEFAULT true,
  enable_birthday_rewards bool DEFAULT true,
  enable_anniversary_rewards bool DEFAULT false,
  enable_referral_rewards bool DEFAULT false,
  enable_email_communication bool DEFAULT false,
  enable_sms_communication bool DEFAULT false,
  enable_push_notifications bool DEFAULT false,
  enable_marketing_emails bool DEFAULT false,
  enable_customer_analytics bool DEFAULT true,
  enable_purchase_history bool DEFAULT true,
  enable_spending_patterns bool DEFAULT true,
  enable_customer_segmentation bool DEFAULT false,
  enable_customer_insights bool DEFAULT false
);

ALTER TABLE lats_pos_loyalty_customer_settings ADD CONSTRAINT lats_pos_loyalty_customer_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_pos_notification_settings
-- ============================================

DROP TABLE IF EXISTS lats_pos_notification_settings CASCADE;

CREATE TABLE lats_pos_notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id uuid,
  enable_notifications bool DEFAULT true,
  enable_sound_notifications bool DEFAULT true,
  enable_visual_notifications bool DEFAULT true,
  enable_push_notifications bool DEFAULT false,
  notification_timeout int4 DEFAULT 5000,
  enable_sales_notifications bool DEFAULT true,
  notify_on_sale_completion bool DEFAULT true,
  notify_on_refund bool DEFAULT true,
  notify_on_void bool DEFAULT true,
  notify_on_discount bool DEFAULT false,
  enable_inventory_notifications bool DEFAULT true,
  notify_on_low_stock bool DEFAULT true,
  low_stock_threshold int4 DEFAULT 10,
  notify_on_out_of_stock bool DEFAULT true,
  notify_on_stock_adjustment bool DEFAULT false,
  enable_customer_notifications bool DEFAULT false,
  notify_on_customer_registration bool DEFAULT false,
  notify_on_loyalty_points bool DEFAULT false,
  notify_on_customer_birthday bool DEFAULT false,
  notify_on_customer_anniversary bool DEFAULT false,
  enable_system_notifications bool DEFAULT true,
  notify_on_system_errors bool DEFAULT true,
  notify_on_backup_completion bool DEFAULT false,
  notify_on_sync_completion bool DEFAULT false,
  notify_on_maintenance bool DEFAULT true,
  enable_email_notifications bool DEFAULT false,
  enable_sms_notifications bool DEFAULT false,
  enable_in_app_notifications bool DEFAULT true,
  enable_desktop_notifications bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  whatsapp_closing_message text DEFAULT ''::text
);

ALTER TABLE lats_pos_notification_settings ADD CONSTRAINT lats_pos_notification_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_pos_receipt_settings
-- ============================================

DROP TABLE IF EXISTS lats_pos_receipt_settings CASCADE;

CREATE TABLE lats_pos_receipt_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id text,
  receipt_template text DEFAULT 'standard'::text,
  receipt_width int4 DEFAULT 80,
  receipt_font_size int4 DEFAULT 12,
  show_business_logo bool DEFAULT true,
  show_business_name bool DEFAULT true,
  show_business_address bool DEFAULT true,
  show_business_phone bool DEFAULT true,
  show_business_email bool DEFAULT true,
  show_business_website bool DEFAULT false,
  show_transaction_id bool DEFAULT true,
  show_date_time bool DEFAULT true,
  show_cashier_name bool DEFAULT true,
  show_customer_name bool DEFAULT true,
  show_customer_phone bool DEFAULT false,
  show_product_names bool DEFAULT true,
  show_product_skus bool DEFAULT false,
  show_product_barcodes bool DEFAULT false,
  show_quantities bool DEFAULT true,
  show_unit_prices bool DEFAULT true,
  show_discounts bool DEFAULT true,
  show_subtotal bool DEFAULT true,
  show_tax bool DEFAULT true,
  show_discount_total bool DEFAULT true,
  show_grand_total bool DEFAULT true,
  show_payment_method bool DEFAULT true,
  show_change_amount bool DEFAULT true,
  auto_print_receipt bool DEFAULT false,
  print_duplicate_receipt bool DEFAULT false,
  enable_email_receipt bool DEFAULT true,
  enable_sms_receipt bool DEFAULT false,
  enable_receipt_numbering bool DEFAULT true,
  receipt_number_prefix text DEFAULT 'RCP'::text,
  receipt_number_start int4 DEFAULT 1000,
  receipt_number_format text DEFAULT 'RCP-{number}'::text,
  show_footer_message bool DEFAULT true,
  footer_message text DEFAULT 'Thank you for your business!'::text,
  show_return_policy bool DEFAULT false,
  return_policy_text text DEFAULT '30-day return policy'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  enable_whatsapp_pdf bool DEFAULT true,
  whatsapp_pdf_auto_send bool DEFAULT false,
  whatsapp_pdf_show_preview bool DEFAULT true,
  whatsapp_pdf_format text DEFAULT 'a4'::text,
  whatsapp_pdf_quality text DEFAULT 'standard'::text,
  whatsapp_pdf_include_logo bool DEFAULT true,
  whatsapp_pdf_include_images bool DEFAULT false,
  whatsapp_pdf_include_qr bool DEFAULT true,
  whatsapp_pdf_include_barcode bool DEFAULT false,
  whatsapp_pdf_message text DEFAULT 'Thank you for your purchase! Please find your receipt attached.'::text,
  enable_email_pdf bool DEFAULT true,
  enable_print_pdf bool DEFAULT true,
  enable_download_pdf bool DEFAULT true,
  show_share_button bool DEFAULT true,
  sms_header_message text DEFAULT 'Thank you for your purchase!'::text,
  sms_footer_message text DEFAULT 'Thank you for choosing us!'::text
);

ALTER TABLE lats_pos_receipt_settings ADD CONSTRAINT lats_pos_receipt_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_pos_search_filter_settings
-- ============================================

DROP TABLE IF EXISTS lats_pos_search_filter_settings CASCADE;

CREATE TABLE lats_pos_search_filter_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id uuid,
  enable_product_search bool DEFAULT true,
  enable_customer_search bool DEFAULT true,
  enable_sales_search bool DEFAULT true,
  search_by_name bool DEFAULT true,
  search_by_barcode bool DEFAULT true,
  search_by_sku bool DEFAULT true,
  search_by_category bool DEFAULT true,
  search_by_supplier bool DEFAULT true,
  search_by_description bool DEFAULT true,
  search_by_tags bool DEFAULT true,
  enable_fuzzy_search bool DEFAULT true,
  enable_autocomplete bool DEFAULT true,
  min_search_length int4 DEFAULT 2,
  max_search_results int4 DEFAULT 50,
  search_timeout int4 DEFAULT 5000,
  search_debounce_time int4 DEFAULT 300,
  enable_search_history bool DEFAULT true,
  max_search_history int4 DEFAULT 50,
  enable_recent_searches bool DEFAULT true,
  enable_popular_searches bool DEFAULT true,
  enable_search_suggestions bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_pos_search_filter_settings ADD CONSTRAINT lats_pos_search_filter_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_pos_user_permissions_settings
-- ============================================

DROP TABLE IF EXISTS lats_pos_user_permissions_settings CASCADE;

CREATE TABLE lats_pos_user_permissions_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  business_id text,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  enable_pos_access bool DEFAULT true,
  enable_sales_access bool DEFAULT true,
  enable_refunds_access bool DEFAULT true,
  enable_void_access bool DEFAULT false,
  enable_discount_access bool DEFAULT true,
  enable_inventory_view bool DEFAULT true,
  enable_inventory_edit bool DEFAULT true,
  enable_stock_adjustments bool DEFAULT true,
  enable_product_creation bool DEFAULT true,
  enable_product_deletion bool DEFAULT false,
  enable_customer_view bool DEFAULT true,
  enable_customer_creation bool DEFAULT true,
  enable_customer_edit bool DEFAULT true,
  enable_customer_deletion bool DEFAULT false,
  enable_customer_history bool DEFAULT true,
  enable_payment_processing bool DEFAULT true,
  enable_cash_management bool DEFAULT true,
  enable_daily_reports bool DEFAULT true,
  enable_financial_reports bool DEFAULT false,
  enable_tax_management bool DEFAULT false,
  enable_settings_access bool DEFAULT false,
  enable_user_management bool DEFAULT false,
  enable_backup_restore bool DEFAULT false,
  enable_system_maintenance bool DEFAULT false,
  enable_api_access bool DEFAULT false,
  enable_audit_logs bool DEFAULT false,
  enable_security_settings bool DEFAULT false,
  enable_password_reset bool DEFAULT false,
  enable_session_management bool DEFAULT false,
  enable_data_export bool DEFAULT true
);

ALTER TABLE lats_pos_user_permissions_settings ADD CONSTRAINT lats_pos_user_permissions_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_product_units
-- ============================================

DROP TABLE IF EXISTS lats_product_units CASCADE;

CREATE TABLE lats_product_units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_variant_id uuid NOT NULL,
  imei text NOT NULL,
  status text DEFAULT 'in_stock'::text,
  sale_id uuid,
  created_at timestamptz DEFAULT now(),
  product_id uuid
);

ALTER TABLE lats_product_units ADD CONSTRAINT lats_product_units_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_product_validation
-- ============================================

DROP TABLE IF EXISTS lats_product_validation CASCADE;

CREATE TABLE lats_product_validation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  shipping_id uuid,
  is_validated bool DEFAULT false,
  validation_errors _text,
  validated_by uuid,
  validated_at timestamptz,
  updated_cost_price numeric,
  updated_selling_price numeric,
  updated_supplier_id uuid,
  updated_category_id uuid,
  updated_product_name text,
  updated_product_description text,
  updated_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_product_validation ADD CONSTRAINT lats_product_validation_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_product_variants
-- ============================================

DROP TABLE IF EXISTS lats_product_variants CASCADE;

CREATE TABLE lats_product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  sku text,
  barcode text,
  quantity int4 DEFAULT 0,
  min_quantity int4 DEFAULT 5,
  unit_price numeric DEFAULT 0,
  cost_price numeric DEFAULT 0,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text NOT NULL DEFAULT 'Default Variant'::text,
  selling_price numeric DEFAULT 0,
  attributes jsonb DEFAULT '{}'::jsonb,
  weight numeric,
  dimensions jsonb,
  variant_name text,
  variant_attributes jsonb DEFAULT '{}'::jsonb,
  branch_id uuid NOT NULL,
  stock_per_branch jsonb DEFAULT '{}'::jsonb,
  is_shared bool DEFAULT true,
  visible_to_branches _uuid,
  sharing_mode text DEFAULT 'isolated'::text,
  reserved_quantity int4 DEFAULT 0,
  reorder_point int4 DEFAULT 0,
  parent_variant_id uuid,
  is_parent bool DEFAULT false,
  variant_type varchar(20) DEFAULT 'standard'::character varying,
  status text DEFAULT 'active'::text
);

ALTER TABLE lats_product_variants ADD CONSTRAINT lats_product_variants_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_products
-- ============================================

DROP TABLE IF EXISTS lats_products CASCADE;

CREATE TABLE lats_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sku text,
  barcode text,
  category_id uuid,
  unit_price numeric DEFAULT 0,
  cost_price numeric DEFAULT 0,
  stock_quantity int4 DEFAULT 0,
  min_stock_level int4 DEFAULT 0,
  max_stock_level int4 DEFAULT 1000,
  is_active bool DEFAULT true,
  image_url text,
  supplier_id uuid,
  brand text,
  model text,
  warranty_period int4,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  specification text,
  condition text DEFAULT 'new'::text,
  selling_price numeric DEFAULT 0,
  tags jsonb DEFAULT '[]'::jsonb,
  total_quantity int4 DEFAULT 0,
  total_value numeric DEFAULT 0,
  storage_room_id uuid,
  store_shelf_id uuid,
  attributes jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  branch_id uuid,
  is_shared bool DEFAULT true,
  visible_to_branches _uuid,
  sharing_mode text DEFAULT 'isolated'::text,
  shelf_id uuid,
  category text
);

ALTER TABLE lats_products ADD CONSTRAINT lats_products_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_purchase_order_audit_log
-- ============================================

DROP TABLE IF EXISTS lats_purchase_order_audit_log CASCADE;

CREATE TABLE lats_purchase_order_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  action text NOT NULL,
  old_status text,
  new_status text,
  user_id uuid NOT NULL,
  notes text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lats_purchase_order_audit_log ADD CONSTRAINT lats_purchase_order_audit_log_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_purchase_order_items
-- ============================================

DROP TABLE IF EXISTS lats_purchase_order_items CASCADE;

CREATE TABLE lats_purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid,
  product_id uuid,
  variant_id uuid,
  quantity_ordered int4 NOT NULL,
  quantity_received int4 DEFAULT 0,
  unit_cost numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  notes text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_purchase_order_items ADD CONSTRAINT lats_purchase_order_items_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_purchase_order_payments
-- ============================================

DROP TABLE IF EXISTS lats_purchase_order_payments CASCADE;

CREATE TABLE lats_purchase_order_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  payment_date timestamptz DEFAULT now(),
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  branch_id uuid
);

ALTER TABLE lats_purchase_order_payments ADD CONSTRAINT lats_purchase_order_payments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_purchase_order_shipping
-- ============================================

DROP TABLE IF EXISTS lats_purchase_order_shipping CASCADE;

CREATE TABLE lats_purchase_order_shipping (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  shipping_method_id uuid,
  shipping_method_code text,
  shipping_agent_id uuid,
  agent_name text,
  agent_contact text,
  agent_phone text,
  shipping_address_street text,
  shipping_address_city text DEFAULT 'Dar es Salaam'::text,
  shipping_address_region text,
  shipping_address_country text DEFAULT 'Tanzania'::text,
  shipping_address_postal_code text,
  billing_address_street text,
  billing_address_city text,
  billing_address_region text,
  billing_address_country text,
  billing_address_postal_code text,
  use_same_address bool DEFAULT true,
  expected_departure_date date,
  expected_arrival_date date,
  actual_departure_date date,
  actual_arrival_date date,
  tracking_number text,
  container_number text,
  bill_of_lading text,
  airway_bill text,
  shipping_cost numeric DEFAULT 0,
  insurance_cost numeric DEFAULT 0,
  customs_duty numeric DEFAULT 0,
  other_charges numeric DEFAULT 0,
  total_shipping_cost numeric DEFAULT 0,
  currency text DEFAULT 'USD'::text,
  port_of_loading text,
  port_of_discharge text,
  container_type text,
  container_count int4 DEFAULT 1,
  shipping_status text DEFAULT 'pending'::text,
  shipping_notes text,
  customs_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_purchase_order_shipping ADD CONSTRAINT lats_purchase_order_shipping_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_purchase_orders
-- ============================================

DROP TABLE IF EXISTS lats_purchase_orders CASCADE;

CREATE TABLE lats_purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  po_number text NOT NULL,
  supplier_id uuid,
  status text DEFAULT 'pending'::text,
  total_amount numeric DEFAULT 0,
  notes text,
  order_date timestamptz DEFAULT now(),
  expected_delivery_date timestamptz,
  received_date timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tax_amount numeric DEFAULT 0,
  shipping_cost numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  final_amount numeric DEFAULT 0,
  approved_by uuid,
  currency text DEFAULT 'TZS'::text,
  total_paid numeric DEFAULT 0,
  payment_status text DEFAULT 'unpaid'::text,
  expected_delivery timestamptz,
  branch_id uuid,
  payment_terms text,
  exchange_rate numeric DEFAULT 1.0,
  base_currency text DEFAULT 'TZS'::text,
  exchange_rate_source text DEFAULT 'manual'::text,
  exchange_rate_date timestamptz DEFAULT now(),
  total_amount_base_currency numeric
);

ALTER TABLE lats_purchase_orders ADD CONSTRAINT lats_purchase_orders_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_receipts
-- ============================================

DROP TABLE IF EXISTS lats_receipts CASCADE;

CREATE TABLE lats_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid,
  receipt_number text NOT NULL,
  customer_name text,
  customer_phone text,
  total_amount numeric NOT NULL,
  payment_method text NOT NULL,
  items_count int4 NOT NULL,
  generated_by text,
  receipt_content jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lats_receipts ADD CONSTRAINT lats_receipts_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_sale_items
-- ============================================

DROP TABLE IF EXISTS lats_sale_items CASCADE;

CREATE TABLE lats_sale_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid,
  product_id uuid,
  product_name text NOT NULL,
  quantity int4 NOT NULL,
  unit_price numeric NOT NULL,
  discount numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  variant_id uuid,
  variant_name text,
  sku text,
  total_price numeric DEFAULT 0,
  cost_price numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE lats_sale_items ADD CONSTRAINT lats_sale_items_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_sales
-- ============================================

DROP TABLE IF EXISTS lats_sales CASCADE;

CREATE TABLE lats_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_number text NOT NULL,
  customer_id uuid,
  user_id uuid,
  total_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  final_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'completed'::text,
  status text DEFAULT 'completed'::text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  subtotal numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  sold_by text,
  customer_email text,
  customer_name text,
  customer_phone text,
  discount numeric DEFAULT 0,
  branch_id uuid,
  payment_method jsonb
);

ALTER TABLE lats_sales ADD CONSTRAINT lats_sales_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_shipping
-- ============================================

DROP TABLE IF EXISTS lats_shipping CASCADE;

CREATE TABLE lats_shipping (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid,
  shipping_method text,
  tracking_number text,
  carrier text,
  estimated_arrival_date date,
  actual_arrival_date date,
  status text DEFAULT 'pending'::text,
  shipping_cost numeric,
  shipping_address text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_shipping ADD CONSTRAINT lats_shipping_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_shipping_agents
-- ============================================

DROP TABLE IF EXISTS lats_shipping_agents CASCADE;

CREATE TABLE lats_shipping_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text,
  contact_person text,
  phone text,
  email text,
  whatsapp text,
  shipping_methods _text DEFAULT ARRAY['sea'::text, 'air'::text],
  address text,
  city text,
  country text,
  license_number text,
  website text,
  notes text,
  base_rate_sea numeric DEFAULT 0,
  base_rate_air numeric DEFAULT 0,
  currency text DEFAULT 'USD'::text,
  rating numeric DEFAULT 0,
  total_shipments int4 DEFAULT 0,
  successful_shipments int4 DEFAULT 0,
  is_active bool DEFAULT true,
  is_preferred bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

ALTER TABLE lats_shipping_agents ADD CONSTRAINT lats_shipping_agents_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_shipping_cargo_items
-- ============================================

DROP TABLE IF EXISTS lats_shipping_cargo_items CASCADE;

CREATE TABLE lats_shipping_cargo_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shipping_id uuid,
  product_id uuid,
  purchase_order_item_id uuid,
  quantity int4 NOT NULL DEFAULT 0,
  cost_price numeric,
  description text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_shipping_cargo_items ADD CONSTRAINT lats_shipping_cargo_items_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_shipping_methods
-- ============================================

DROP TABLE IF EXISTS lats_shipping_methods CASCADE;

CREATE TABLE lats_shipping_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  description text,
  estimated_days_min int4,
  estimated_days_max int4,
  cost_multiplier numeric DEFAULT 1.0,
  display_order int4 DEFAULT 0,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_shipping_methods ADD CONSTRAINT lats_shipping_methods_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_shipping_settings
-- ============================================

DROP TABLE IF EXISTS lats_shipping_settings CASCADE;

CREATE TABLE lats_shipping_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  default_shipping_address_street text,
  default_shipping_address_city text DEFAULT 'Dar es Salaam'::text,
  default_shipping_address_region text DEFAULT 'Dar es Salaam'::text,
  default_shipping_address_country text DEFAULT 'Tanzania'::text,
  default_shipping_address_postal_code text,
  default_billing_address_street text,
  default_billing_address_city text,
  default_billing_address_region text,
  default_billing_address_country text,
  default_billing_address_postal_code text,
  default_shipping_method_id uuid,
  default_agent_id uuid,
  notify_on_shipment bool DEFAULT true,
  notify_on_arrival bool DEFAULT true,
  notification_email text,
  notification_phone text,
  auto_calculate_shipping bool DEFAULT false,
  include_insurance bool DEFAULT true,
  insurance_percentage numeric DEFAULT 2.0,
  user_id uuid,
  branch_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_shipping_settings ADD CONSTRAINT lats_shipping_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_spare_part_usage
-- ============================================

DROP TABLE IF EXISTS lats_spare_part_usage CASCADE;

CREATE TABLE lats_spare_part_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  spare_part_id uuid,
  device_id uuid,
  quantity int4 NOT NULL,
  reason text,
  notes text,
  used_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_spare_part_usage ADD CONSTRAINT lats_spare_part_usage_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_spare_part_variants
-- ============================================

DROP TABLE IF EXISTS lats_spare_part_variants CASCADE;

CREATE TABLE lats_spare_part_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  spare_part_id uuid NOT NULL,
  name text NOT NULL,
  sku text,
  cost_price numeric DEFAULT 0,
  selling_price numeric DEFAULT 0,
  quantity int4 DEFAULT 0,
  min_quantity int4 DEFAULT 0,
  attributes jsonb DEFAULT '{}'::jsonb,
  image_url text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_spare_part_variants ADD CONSTRAINT lats_spare_part_variants_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_spare_parts
-- ============================================

DROP TABLE IF EXISTS lats_spare_parts CASCADE;

CREATE TABLE lats_spare_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  part_number text,
  quantity int4 DEFAULT 0,
  selling_price numeric DEFAULT 0,
  cost_price numeric DEFAULT 0,
  category_id uuid,
  brand text,
  description text,
  condition text,
  location text,
  min_quantity int4 DEFAULT 0,
  compatible_devices text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  supplier_id uuid,
  unit_price numeric DEFAULT 0
);

ALTER TABLE lats_spare_parts ADD CONSTRAINT lats_spare_parts_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_stock_movements
-- ============================================

DROP TABLE IF EXISTS lats_stock_movements CASCADE;

CREATE TABLE lats_stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  variant_id uuid,
  movement_type text NOT NULL,
  quantity int4 NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  from_branch_id uuid,
  to_branch_id uuid,
  branch_id uuid,
  previous_quantity int4,
  new_quantity int4,
  reason text,
  reference text
);

ALTER TABLE lats_stock_movements ADD CONSTRAINT lats_stock_movements_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_stock_transfers
-- ============================================

DROP TABLE IF EXISTS lats_stock_transfers CASCADE;

CREATE TABLE lats_stock_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transfer_number text,
  from_branch_id uuid,
  to_branch_id uuid,
  product_id uuid,
  variant_id uuid,
  quantity int4 NOT NULL DEFAULT 0,
  status text DEFAULT 'pending'::text,
  requested_by uuid,
  approved_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE lats_stock_transfers ADD CONSTRAINT lats_stock_transfers_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_store_locations
-- ============================================

DROP TABLE IF EXISTS lats_store_locations CASCADE;

CREATE TABLE lats_store_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  description text,
  address text,
  city text,
  region text,
  country text DEFAULT 'Tanzania'::text,
  postal_code text,
  phone text,
  email text,
  manager_name text,
  manager_phone text,
  is_active bool DEFAULT true,
  is_main_branch bool DEFAULT false,
  has_repair_service bool DEFAULT false,
  has_sales_service bool DEFAULT true,
  has_delivery_service bool DEFAULT false,
  store_size_sqm numeric,
  current_staff_count int4 DEFAULT 0,
  monthly_target numeric DEFAULT 0,
  opening_hours jsonb,
  priority_order int4 DEFAULT 0,
  latitude numeric,
  longitude numeric,
  timezone text DEFAULT 'Africa/Dar_es_Salaam'::text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_store_locations ADD CONSTRAINT lats_store_locations_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_store_rooms
-- ============================================

DROP TABLE IF EXISTS lats_store_rooms CASCADE;

CREATE TABLE lats_store_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text,
  capacity int4,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  store_location_id uuid,
  code text,
  floor_level int4 DEFAULT 0,
  area_sqm numeric,
  max_capacity int4,
  current_capacity int4 DEFAULT 0,
  is_secure bool DEFAULT false,
  requires_access_card bool DEFAULT false,
  color_code text,
  notes text
);

ALTER TABLE lats_store_rooms ADD CONSTRAINT lats_store_rooms_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_store_shelves
-- ============================================

DROP TABLE IF EXISTS lats_store_shelves CASCADE;

CREATE TABLE lats_store_shelves (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid,
  name text NOT NULL,
  position text,
  capacity int4,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  store_location_id uuid,
  storage_room_id uuid,
  code text,
  description text,
  shelf_type text DEFAULT 'standard'::text,
  section text,
  aisle text,
  row_number int4,
  column_number int4,
  max_capacity int4,
  current_capacity int4 DEFAULT 0,
  floor_level int4 DEFAULT 0,
  zone text,
  is_accessible bool DEFAULT true,
  requires_ladder bool DEFAULT false,
  is_refrigerated bool DEFAULT false,
  priority_order int4 DEFAULT 0,
  color_code text,
  barcode text,
  notes text,
  images _text DEFAULT ARRAY[]::text[],
  created_by uuid,
  updated_by uuid
);

ALTER TABLE lats_store_shelves ADD CONSTRAINT lats_store_shelves_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_supplier_categories
-- ============================================

DROP TABLE IF EXISTS lats_supplier_categories CASCADE;

CREATE TABLE lats_supplier_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  color text,
  parent_id uuid,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_supplier_categories ADD CONSTRAINT lats_supplier_categories_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_supplier_category_mapping
-- ============================================

DROP TABLE IF EXISTS lats_supplier_category_mapping CASCADE;

CREATE TABLE lats_supplier_category_mapping (
  supplier_id uuid NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lats_supplier_category_mapping ADD CONSTRAINT lats_supplier_category_mapping_pkey PRIMARY KEY (supplier_id, category_id);

-- ============================================
-- Table: lats_supplier_communications
-- ============================================

DROP TABLE IF EXISTS lats_supplier_communications CASCADE;

CREATE TABLE lats_supplier_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid,
  communication_type text NOT NULL,
  direction text DEFAULT 'outbound'::text,
  subject text,
  message text,
  notes text,
  contact_person text,
  response_time_hours int4,
  follow_up_required bool DEFAULT false,
  follow_up_date date,
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_supplier_communications ADD CONSTRAINT lats_supplier_communications_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_supplier_contracts
-- ============================================

DROP TABLE IF EXISTS lats_supplier_contracts CASCADE;

CREATE TABLE lats_supplier_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid,
  contract_number text,
  contract_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  contract_value numeric,
  currency text DEFAULT 'TZS'::text,
  auto_renew bool DEFAULT false,
  renewal_notice_days int4 DEFAULT 30,
  payment_terms text,
  terms_and_conditions text,
  document_url text,
  status text DEFAULT 'active'::text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_supplier_contracts ADD CONSTRAINT lats_supplier_contracts_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_supplier_documents
-- ============================================

DROP TABLE IF EXISTS lats_supplier_documents CASCADE;

CREATE TABLE lats_supplier_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid,
  document_type text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size int4,
  mime_type text,
  expiry_date date,
  notes text,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_supplier_documents ADD CONSTRAINT lats_supplier_documents_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_supplier_ratings
-- ============================================

DROP TABLE IF EXISTS lats_supplier_ratings CASCADE;

CREATE TABLE lats_supplier_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid,
  purchase_order_id uuid,
  overall_rating int4,
  quality_rating int4,
  delivery_rating int4,
  communication_rating int4,
  price_rating int4,
  review_text text,
  pros text,
  cons text,
  would_recommend bool DEFAULT true,
  rated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_supplier_ratings ADD CONSTRAINT lats_supplier_ratings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_supplier_tag_mapping
-- ============================================

DROP TABLE IF EXISTS lats_supplier_tag_mapping CASCADE;

CREATE TABLE lats_supplier_tag_mapping (
  supplier_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lats_supplier_tag_mapping ADD CONSTRAINT lats_supplier_tag_mapping_pkey PRIMARY KEY (supplier_id, tag_id);

-- ============================================
-- Table: lats_supplier_tags
-- ============================================

DROP TABLE IF EXISTS lats_supplier_tags CASCADE;

CREATE TABLE lats_supplier_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lats_supplier_tags ADD CONSTRAINT lats_supplier_tags_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_suppliers
-- ============================================

DROP TABLE IF EXISTS lats_suppliers CASCADE;

CREATE TABLE lats_suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  country text,
  is_active bool DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  branch_id uuid,
  is_shared bool DEFAULT true,
  is_trade_in_customer bool DEFAULT false,
  company_name text,
  description text,
  whatsapp text,
  tax_id text,
  payment_terms text,
  rating numeric,
  preferred_currency text DEFAULT 'TZS'::text,
  exchange_rate numeric,
  wechat text,
  credit_limit numeric DEFAULT 0,
  current_balance numeric DEFAULT 0,
  payment_days int4 DEFAULT 30,
  discount_percentage numeric DEFAULT 0,
  website_url text,
  logo_url text,
  business_registration text,
  business_type text,
  year_established int4,
  employee_count text,
  linkedin_url text,
  facebook_url text,
  instagram_url text,
  minimum_order_quantity int4,
  lead_time_days int4,
  warehouse_location text,
  shipping_methods _text,
  delivery_zones _text,
  certifications _text,
  quality_standards text,
  return_policy text,
  warranty_terms text,
  total_orders int4 DEFAULT 0,
  total_order_value numeric DEFAULT 0,
  average_rating numeric DEFAULT 0,
  on_time_delivery_rate numeric DEFAULT 0,
  quality_score numeric DEFAULT 0,
  response_time_hours numeric,
  business_hours text,
  language_preferences _text,
  time_zone text,
  last_contact_date date,
  next_follow_up_date date,
  is_favorite bool DEFAULT false,
  internal_notes text,
  priority_level text DEFAULT 'standard'::text,
  wechat_qr_code text,
  alipay_qr_code text,
  bank_account_details text
);

ALTER TABLE lats_suppliers ADD CONSTRAINT lats_suppliers_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_trade_in_contracts
-- ============================================

DROP TABLE IF EXISTS lats_trade_in_contracts CASCADE;

CREATE TABLE lats_trade_in_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_number text NOT NULL,
  transaction_id uuid,
  customer_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  customer_address text,
  customer_id_number text NOT NULL,
  customer_id_type text NOT NULL,
  customer_id_photo_url text,
  device_name text NOT NULL,
  device_model text NOT NULL,
  device_imei text NOT NULL,
  device_serial_number text,
  device_condition text NOT NULL,
  agreed_value numeric NOT NULL,
  terms_and_conditions text NOT NULL,
  ownership_declaration text NOT NULL,
  customer_agreed_terms bool DEFAULT false,
  customer_signature_data text,
  staff_signature_data text,
  customer_signed_at timestamptz,
  staff_signed_at timestamptz,
  witness_name text,
  witness_signature_data text,
  witness_signed_at timestamptz,
  status text DEFAULT 'draft'::text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  voided_at timestamptz,
  voided_by uuid,
  void_reason text
);

ALTER TABLE lats_trade_in_contracts ADD CONSTRAINT lats_trade_in_contracts_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_trade_in_damage_assessments
-- ============================================

DROP TABLE IF EXISTS lats_trade_in_damage_assessments CASCADE;

CREATE TABLE lats_trade_in_damage_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid,
  damage_type text NOT NULL,
  damage_description text,
  spare_part_id uuid,
  spare_part_name text,
  deduction_amount numeric NOT NULL DEFAULT 0,
  assessed_by uuid,
  assessed_at timestamptz DEFAULT now(),
  damage_photos jsonb
);

ALTER TABLE lats_trade_in_damage_assessments ADD CONSTRAINT lats_trade_in_damage_assessments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_trade_in_prices
-- ============================================

DROP TABLE IF EXISTS lats_trade_in_prices CASCADE;

CREATE TABLE lats_trade_in_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  variant_id uuid,
  device_name text NOT NULL,
  device_model text NOT NULL,
  base_trade_in_price numeric NOT NULL DEFAULT 0,
  branch_id uuid,
  excellent_multiplier numeric DEFAULT 1.0,
  good_multiplier numeric DEFAULT 0.85,
  fair_multiplier numeric DEFAULT 0.70,
  poor_multiplier numeric DEFAULT 0.50,
  notes text,
  is_active bool DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_trade_in_prices ADD CONSTRAINT lats_trade_in_prices_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_trade_in_settings
-- ============================================

DROP TABLE IF EXISTS lats_trade_in_settings CASCADE;

CREATE TABLE lats_trade_in_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lats_trade_in_settings ADD CONSTRAINT lats_trade_in_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: lats_trade_in_transactions
-- ============================================

DROP TABLE IF EXISTS lats_trade_in_transactions CASCADE;

CREATE TABLE lats_trade_in_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_number text NOT NULL,
  customer_id uuid NOT NULL,
  branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  device_name text NOT NULL,
  device_model text NOT NULL,
  device_imei text,
  device_serial_number text,
  base_trade_in_price numeric NOT NULL DEFAULT 0,
  condition_rating text NOT NULL,
  condition_multiplier numeric NOT NULL DEFAULT 1.0,
  condition_description text,
  total_damage_deductions numeric DEFAULT 0,
  damage_items jsonb,
  final_trade_in_value numeric NOT NULL DEFAULT 0,
  new_product_id uuid,
  new_variant_id uuid,
  new_device_price numeric,
  customer_payment_amount numeric DEFAULT 0,
  contract_id uuid,
  contract_signed bool DEFAULT false,
  contract_signed_at timestamptz,
  customer_signature_data text,
  staff_signature_data text,
  customer_id_number text,
  customer_id_type text,
  customer_id_photo_url text,
  device_photos jsonb,
  status text DEFAULT 'pending'::text,
  inventory_item_id uuid,
  needs_repair bool DEFAULT false,
  repair_status text,
  repair_cost numeric DEFAULT 0,
  ready_for_resale bool DEFAULT false,
  resale_price numeric,
  sale_id uuid,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  completed_at timestamptz,
  staff_notes text,
  internal_notes text
);

ALTER TABLE lats_trade_in_transactions ADD CONSTRAINT lats_trade_in_transactions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: leave_requests
-- ============================================

DROP TABLE IF EXISTS leave_requests CASCADE;

CREATE TABLE leave_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  leave_type varchar(50) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days int4 NOT NULL,
  reason text NOT NULL,
  status varchar(50) DEFAULT 'pending'::character varying,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  attachment_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);

-- ============================================
-- Table: loyalty_points
-- ============================================

DROP TABLE IF EXISTS loyalty_points CASCADE;

CREATE TABLE loyalty_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  branch_id uuid,
  points numeric NOT NULL DEFAULT 0,
  points_type text NOT NULL,
  reason text,
  reference_id uuid,
  reference_type text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE loyalty_points ADD CONSTRAINT loyalty_points_pkey PRIMARY KEY (id);

-- ============================================
-- Table: message_recipient_lists
-- ============================================

DROP TABLE IF EXISTS message_recipient_lists CASCADE;

CREATE TABLE message_recipient_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  branch_id uuid,
  name varchar(255) NOT NULL,
  description text,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_recipients int4 NOT NULL DEFAULT 0,
  category varchar(50),
  tags _text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE message_recipient_lists ADD CONSTRAINT message_recipient_lists_pkey PRIMARY KEY (id);

-- ============================================
-- Table: mobile_money_transactions
-- ============================================

DROP TABLE IF EXISTS mobile_money_transactions CASCADE;

CREATE TABLE mobile_money_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  transaction_type text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'TZS'::text,
  sender_phone text,
  sender_name text,
  receiver_phone text,
  receiver_name text,
  bank_name text,
  bank_account text,
  reference_number text,
  balance_after numeric,
  fees numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  message_body text,
  message_date timestamptz,
  customer_id uuid,
  payment_transaction_id uuid,
  is_processed bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb,
  branch_id uuid
);

ALTER TABLE mobile_money_transactions ADD CONSTRAINT mobile_money_transactions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: notes
-- ============================================

DROP TABLE IF EXISTS notes CASCADE;

CREATE TABLE notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id text NOT NULL DEFAULT auth.user_id(),
  title text NOT NULL DEFAULT 'untitled note'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  shared bool DEFAULT false
);

ALTER TABLE notes ADD CONSTRAINT notes_pkey PRIMARY KEY (id);

-- ============================================
-- Table: notification_templates
-- ============================================

DROP TABLE IF EXISTS notification_templates CASCADE;

CREATE TABLE notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  notification_type text NOT NULL,
  title text,
  message text NOT NULL,
  variables jsonb,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_templates ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);

-- ============================================
-- Table: notifications
-- ============================================

DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  priority text DEFAULT 'normal'::text,
  status text DEFAULT 'unread'::text,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  actioned_at timestamptz,
  dismissed_at timestamptz,
  actioned_by uuid,
  dismissed_by uuid,
  device_id uuid,
  customer_id uuid,
  appointment_id uuid,
  diagnostic_id uuid,
  icon text,
  color text,
  action_url text,
  action_text text,
  metadata jsonb,
  group_id uuid,
  is_grouped bool DEFAULT false,
  group_count int4 DEFAULT 0,
  branch_id uuid,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

-- ============================================
-- Table: paragraphs
-- ============================================

DROP TABLE IF EXISTS paragraphs CASCADE;

CREATE TABLE paragraphs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  note_id uuid,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE paragraphs ADD CONSTRAINT paragraphs_pkey PRIMARY KEY (id);

-- ============================================
-- Table: payment_methods
-- ============================================

DROP TABLE IF EXISTS payment_methods CASCADE;

CREATE TABLE payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  type text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_methods ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);

-- ============================================
-- Table: payment_transactions
-- ============================================

DROP TABLE IF EXISTS payment_transactions CASCADE;

CREATE TABLE payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id text,
  provider text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'TZS'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  customer_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  reference text,
  metadata jsonb,
  sale_id uuid,
  pos_session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  is_shared bool DEFAULT true,
  branch_id uuid
);

ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: points_transactions
-- ============================================

DROP TABLE IF EXISTS points_transactions CASCADE;

CREATE TABLE points_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  transaction_type text NOT NULL,
  points_change int4 NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  device_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  branch_id uuid
);

ALTER TABLE points_transactions ADD CONSTRAINT points_transactions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: product_images
-- ============================================

DROP TABLE IF EXISTS product_images CASCADE;

CREATE TABLE product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  image_url text NOT NULL,
  thumbnail_url text,
  file_name text NOT NULL,
  file_size int4 NOT NULL DEFAULT 0,
  is_primary bool DEFAULT false,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  mime_type text
);

ALTER TABLE product_images ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);

-- ============================================
-- Table: product_interests
-- ============================================

DROP TABLE IF EXISTS product_interests CASCADE;

CREATE TABLE product_interests (
  interest_id int8 NOT NULL DEFAULT nextval('product_interests_interest_id_seq'::regclass),
  customer_id int8 NOT NULL,
  product_category text,
  product_name text,
  interest_level text,
  first_mentioned timestamp,
  last_mentioned timestamp,
  mention_count int4 DEFAULT 1
);

ALTER TABLE product_interests ADD CONSTRAINT product_interests_pkey PRIMARY KEY (interest_id);

-- ============================================
-- Table: purchase_order_audit
-- ============================================

DROP TABLE IF EXISTS purchase_order_audit CASCADE;

CREATE TABLE purchase_order_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  action text NOT NULL,
  user_id uuid,
  created_by uuid,
  details text,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_audit ADD CONSTRAINT purchase_order_audit_pkey PRIMARY KEY (id);

-- ============================================
-- Table: purchase_order_messages
-- ============================================

DROP TABLE IF EXISTS purchase_order_messages CASCADE;

CREATE TABLE purchase_order_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  sender text NOT NULL,
  content text NOT NULL,
  type text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_messages ADD CONSTRAINT purchase_order_messages_pkey PRIMARY KEY (id);

-- ============================================
-- Table: purchase_order_payments
-- ============================================

DROP TABLE IF EXISTS purchase_order_payments CASCADE;

CREATE TABLE purchase_order_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  payment_account_id uuid,
  amount numeric NOT NULL,
  currency varchar(10) DEFAULT 'TZS'::character varying,
  payment_method varchar(50),
  payment_method_id uuid,
  reference text,
  notes text,
  status varchar(20) NOT NULL DEFAULT 'completed'::character varying,
  payment_date timestamptz DEFAULT now(),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  branch_id uuid
);

ALTER TABLE purchase_order_payments ADD CONSTRAINT purchase_order_payments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: purchase_order_quality_check_items
-- ============================================

DROP TABLE IF EXISTS purchase_order_quality_check_items CASCADE;

CREATE TABLE purchase_order_quality_check_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quality_check_id uuid NOT NULL,
  purchase_order_item_id uuid NOT NULL,
  criteria_id uuid,
  criteria_name text NOT NULL,
  result text,
  quantity_checked int4 DEFAULT 0,
  quantity_passed int4 DEFAULT 0,
  quantity_failed int4 DEFAULT 0,
  defect_type text,
  defect_description text,
  action_taken text,
  notes text,
  images jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_quality_check_items ADD CONSTRAINT purchase_order_quality_check_items_pkey PRIMARY KEY (id);

-- ============================================
-- Table: purchase_order_quality_checks
-- ============================================

DROP TABLE IF EXISTS purchase_order_quality_checks CASCADE;

CREATE TABLE purchase_order_quality_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  template_id text,
  status text DEFAULT 'pending'::text,
  overall_result text,
  checked_by uuid,
  checked_at timestamptz,
  notes text,
  signature text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_quality_checks ADD CONSTRAINT purchase_order_quality_checks_pkey PRIMARY KEY (id);

-- ============================================
-- Table: purchase_orders
-- ============================================

DROP TABLE IF EXISTS purchase_orders CASCADE;

CREATE TABLE purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid,
  branch_id uuid,
  order_number text,
  total_amount numeric NOT NULL,
  status text DEFAULT 'pending'::text,
  expected_delivery_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);

-- ============================================
-- Table: quality_check_criteria
-- ============================================

DROP TABLE IF EXISTS quality_check_criteria CASCADE;

CREATE TABLE quality_check_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id text NOT NULL,
  name text NOT NULL,
  description text,
  is_required bool DEFAULT false,
  sort_order int4 DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quality_check_criteria ADD CONSTRAINT quality_check_criteria_pkey PRIMARY KEY (id);

-- ============================================
-- Table: quality_check_items
-- ============================================

DROP TABLE IF EXISTS quality_check_items CASCADE;

CREATE TABLE quality_check_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id text,
  check_name text NOT NULL,
  check_description text,
  check_type text DEFAULT 'boolean'::text,
  is_required bool DEFAULT false,
  sort_order int4 DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quality_check_items ADD CONSTRAINT quality_check_items_pkey PRIMARY KEY (id);

-- ============================================
-- Table: quality_check_results
-- ============================================

DROP TABLE IF EXISTS quality_check_results CASCADE;

CREATE TABLE quality_check_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quality_check_id uuid,
  check_item_id uuid,
  result bool,
  numeric_value numeric,
  text_value text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quality_check_results ADD CONSTRAINT quality_check_results_pkey PRIMARY KEY (id);

-- ============================================
-- Table: quality_check_templates
-- ============================================

DROP TABLE IF EXISTS quality_check_templates CASCADE;

CREATE TABLE quality_check_templates (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  category text DEFAULT 'general'::text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

ALTER TABLE quality_check_templates ADD CONSTRAINT quality_check_templates_pkey PRIMARY KEY (id);

-- ============================================
-- Table: quality_checks
-- ============================================

DROP TABLE IF EXISTS quality_checks CASCADE;

CREATE TABLE quality_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid,
  template_id text,
  status text DEFAULT 'in_progress'::text,
  checked_by uuid,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  branch_id uuid,
  is_shared bool DEFAULT false
);

ALTER TABLE quality_checks ADD CONSTRAINT quality_checks_pkey PRIMARY KEY (id);

-- ============================================
-- Table: recurring_expense_history
-- ============================================

DROP TABLE IF EXISTS recurring_expense_history CASCADE;

CREATE TABLE recurring_expense_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recurring_expense_id uuid NOT NULL,
  transaction_id uuid,
  processed_date date NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'processed'::text,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recurring_expense_history ADD CONSTRAINT recurring_expense_history_pkey PRIMARY KEY (id);

-- ============================================
-- Table: recurring_expenses
-- ============================================

DROP TABLE IF EXISTS recurring_expenses CASCADE;

CREATE TABLE recurring_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  account_id uuid NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  frequency text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  next_due_date date NOT NULL,
  last_processed_date date,
  vendor_name text,
  reference_prefix text,
  auto_process bool DEFAULT true,
  is_active bool DEFAULT true,
  notification_days_before int4 DEFAULT 3,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  branch_id uuid,
  is_shared bool DEFAULT false
);

ALTER TABLE recurring_expenses ADD CONSTRAINT recurring_expenses_pkey PRIMARY KEY (id);

-- ============================================
-- Table: reminders
-- ============================================

DROP TABLE IF EXISTS reminders CASCADE;

CREATE TABLE reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date date NOT NULL,
  time time NOT NULL,
  priority text NOT NULL DEFAULT 'medium'::text,
  category text NOT NULL DEFAULT 'general'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  notify_before int4 DEFAULT 30,
  related_to jsonb,
  assigned_to uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  branch_id uuid,
  recurring jsonb
);

ALTER TABLE reminders ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);

-- ============================================
-- Table: repair_parts
-- ============================================

DROP TABLE IF EXISTS repair_parts CASCADE;

CREATE TABLE repair_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  spare_part_id uuid,
  quantity_needed int4 DEFAULT 1,
  quantity_received int4 DEFAULT 0,
  cost_per_unit numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  status text DEFAULT 'needed'::text,
  notes text,
  estimated_arrival timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  branch_id uuid
);

ALTER TABLE repair_parts ADD CONSTRAINT repair_parts_pkey PRIMARY KEY (id);

-- ============================================
-- Table: report_attachments
-- ============================================

DROP TABLE IF EXISTS report_attachments CASCADE;

CREATE TABLE report_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_id uuid,
  file_name varchar(255) NOT NULL,
  file_path text NOT NULL,
  file_size int4,
  uploaded_by uuid,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE report_attachments ADD CONSTRAINT report_attachments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: reports
-- ============================================

DROP TABLE IF EXISTS reports CASCADE;

CREATE TABLE reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  description text NOT NULL,
  report_type varchar(50) NOT NULL,
  priority varchar(20) DEFAULT 'medium'::character varying,
  status varchar(20) DEFAULT 'open'::character varying,
  created_by uuid,
  branch_id uuid,
  assigned_to uuid,
  customer_name varchar(255),
  customer_phone varchar(20),
  contact_method varchar(20),
  device_info text,
  issue_category varchar(100),
  resolution_status varchar(20),
  transaction_amount numeric,
  transaction_type varchar(50),
  payment_method varchar(50),
  product_info text,
  quantity_affected int4,
  stock_level int4,
  location varchar(255),
  occurred_at timestamptz,
  tags _text DEFAULT '{}'::text[],
  follow_up_required bool DEFAULT false,
  follow_up_date timestamptz,
  internal_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reports ADD CONSTRAINT reports_pkey PRIMARY KEY (id);

-- ============================================
-- Table: returns
-- ============================================

DROP TABLE IF EXISTS returns CASCADE;

CREATE TABLE returns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  manual_device_brand varchar(255),
  manual_device_model varchar(255),
  manual_device_serial varchar(255),
  customer_id uuid NOT NULL,
  reason text NOT NULL,
  intake_checklist jsonb,
  status varchar(50) DEFAULT 'under-return-review'::character varying,
  attachments jsonb,
  resolution text,
  staff_signature text,
  customer_signature text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  purchase_date date,
  return_type varchar(50),
  branch varchar(255),
  staff_name varchar(255),
  contact_confirmed bool DEFAULT false,
  accessories jsonb,
  condition_description text,
  customer_reported_issue text,
  staff_observed_issue text,
  customer_satisfaction int4,
  preferred_contact varchar(50),
  return_auth_number varchar(100),
  return_method varchar(50),
  return_shipping_fee numeric,
  expected_pickup_date date,
  geo_location jsonb,
  policy_acknowledged bool DEFAULT false,
  device_locked varchar(50),
  privacy_wiped bool DEFAULT false,
  internal_notes text,
  escalation_required bool DEFAULT false,
  additional_docs jsonb,
  refund_amount numeric,
  exchange_device_id uuid,
  restocking_fee numeric,
  refund_method varchar(50),
  user_ip varchar(50),
  user_location varchar(255)
);

ALTER TABLE returns ADD CONSTRAINT returns_pkey PRIMARY KEY (id);

-- ============================================
-- Table: sale_inventory_items
-- ============================================

DROP TABLE IF EXISTS sale_inventory_items CASCADE;

CREATE TABLE sale_inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  customer_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sale_inventory_items ADD CONSTRAINT sale_inventory_items_pkey PRIMARY KEY (id);

-- ============================================
-- Table: sales
-- ============================================

DROP TABLE IF EXISTS sales CASCADE;

CREATE TABLE sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  branch_id uuid,
  total_amount numeric NOT NULL,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  payment_method text,
  status text DEFAULT 'completed'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales ADD CONSTRAINT sales_pkey PRIMARY KEY (id);

-- ============================================
-- Table: sales_pipeline
-- ============================================

DROP TABLE IF EXISTS sales_pipeline CASCADE;

CREATE TABLE sales_pipeline (
  sale_id int8 NOT NULL DEFAULT nextval('sales_pipeline_sale_id_seq'::regclass),
  customer_id int8 NOT NULL,
  product text,
  quoted_price numeric,
  stage text DEFAULT 'inquiry'::text,
  probability int4 DEFAULT 0,
  expected_close_date date,
  actual_close_date date,
  sale_amount numeric,
  status text DEFAULT 'open'::text,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sales_pipeline ADD CONSTRAINT sales_pipeline_pkey PRIMARY KEY (sale_id);

-- ============================================
-- Table: scheduled_bulk_messages
-- ============================================

DROP TABLE IF EXISTS scheduled_bulk_messages CASCADE;

CREATE TABLE scheduled_bulk_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  created_by uuid,
  branch_id uuid,
  name varchar(255) NOT NULL,
  message_type varchar(20) NOT NULL,
  message_content text NOT NULL,
  media_url text,
  media_type varchar(20),
  view_once bool DEFAULT false,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_recipients int4 NOT NULL DEFAULT 0,
  schedule_type varchar(30) NOT NULL,
  scheduled_for timestamptz NOT NULL,
  timezone varchar(100) DEFAULT 'Africa/Dar_es_Salaam'::character varying,
  recurrence_pattern jsonb,
  recurrence_end_date timestamptz,
  execution_mode varchar(20) NOT NULL,
  auto_execute bool DEFAULT true,
  settings jsonb DEFAULT '{"max_delay": 8000, "min_delay": 3000, "batch_size": 50, "random_delay": true, "use_presence": true, "use_personalization": true}'::jsonb,
  status varchar(30) NOT NULL DEFAULT 'pending'::character varying,
  last_executed_at timestamptz,
  next_execution_at timestamptz,
  execution_count int4 DEFAULT 0,
  progress jsonb DEFAULT '{"total": 0, "failed": 0, "current": 0, "pending": 0, "success": 0}'::jsonb,
  failed_recipients jsonb DEFAULT '[]'::jsonb,
  error_message text,
  last_error_at timestamptz,
  campaign_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  notes text
);

ALTER TABLE scheduled_bulk_messages ADD CONSTRAINT scheduled_bulk_messages_pkey PRIMARY KEY (id);

-- ============================================
-- Table: scheduled_message_executions
-- ============================================

DROP TABLE IF EXISTS scheduled_message_executions CASCADE;

CREATE TABLE scheduled_message_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scheduled_message_id uuid,
  executed_at timestamptz DEFAULT now(),
  execution_duration int4,
  total_sent int4 DEFAULT 0,
  success_count int4 DEFAULT 0,
  failed_count int4 DEFAULT 0,
  status varchar(20),
  failed_recipients jsonb DEFAULT '[]'::jsonb,
  error_message text,
  executed_by varchar(20),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE scheduled_message_executions ADD CONSTRAINT scheduled_message_executions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: scheduled_transfer_executions
-- ============================================

DROP TABLE IF EXISTS scheduled_transfer_executions CASCADE;

CREATE TABLE scheduled_transfer_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scheduled_transfer_id uuid NOT NULL,
  execution_date timestamptz DEFAULT now(),
  amount numeric NOT NULL,
  status varchar(20) NOT NULL,
  source_transaction_id uuid,
  destination_transaction_id uuid,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_transfer_executions ADD CONSTRAINT scheduled_transfer_executions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: scheduled_transfers
-- ============================================

DROP TABLE IF EXISTS scheduled_transfers CASCADE;

CREATE TABLE scheduled_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_account_id uuid NOT NULL,
  destination_account_id uuid NOT NULL,
  amount numeric NOT NULL,
  description text NOT NULL,
  reference_prefix varchar(50) DEFAULT 'SCHED-TRF'::character varying,
  frequency varchar(20) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  next_execution_date date NOT NULL,
  last_executed_date date,
  auto_execute bool DEFAULT true,
  notification_enabled bool DEFAULT true,
  notification_days_before int4 DEFAULT 1,
  is_active bool DEFAULT true,
  execution_count int4 DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE scheduled_transfers ADD CONSTRAINT scheduled_transfers_pkey PRIMARY KEY (id);

-- ============================================
-- Table: serial_number_movements
-- ============================================

DROP TABLE IF EXISTS serial_number_movements CASCADE;

CREATE TABLE serial_number_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL,
  movement_type text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  reference_id uuid,
  reference_type text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

ALTER TABLE serial_number_movements ADD CONSTRAINT serial_number_movements_pkey PRIMARY KEY (id);

-- ============================================
-- Table: settings
-- ============================================

DROP TABLE IF EXISTS settings CASCADE;

CREATE TABLE settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  description text
);

ALTER TABLE settings ADD CONSTRAINT settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: shelves
-- ============================================

DROP TABLE IF EXISTS shelves CASCADE;

CREATE TABLE shelves (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  storage_room_id uuid,
  name varchar(255) NOT NULL,
  code varchar(50) NOT NULL,
  row_number int4,
  column_number int4,
  capacity int4,
  is_refrigerated bool DEFAULT false,
  requires_ladder bool DEFAULT false,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shelves ADD CONSTRAINT shelves_pkey PRIMARY KEY (id);

-- ============================================
-- Table: shift_templates
-- ============================================

DROP TABLE IF EXISTS shift_templates CASCADE;

CREATE TABLE shift_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  description text,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_duration_minutes int4 DEFAULT 0,
  monday bool DEFAULT true,
  tuesday bool DEFAULT true,
  wednesday bool DEFAULT true,
  thursday bool DEFAULT true,
  friday bool DEFAULT true,
  saturday bool DEFAULT false,
  sunday bool DEFAULT false,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shift_templates ADD CONSTRAINT shift_templates_pkey PRIMARY KEY (id);

-- ============================================
-- Table: sms_logs
-- ============================================

DROP TABLE IF EXISTS sms_logs CASCADE;

CREATE TABLE sms_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_phone text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending'::text,
  provider text,
  message_id text,
  cost numeric,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  phone_number text,
  sent_by uuid,
  device_id uuid,
  branch_id uuid,
  is_shared bool DEFAULT false
);

ALTER TABLE sms_logs ADD CONSTRAINT sms_logs_pkey PRIMARY KEY (id);

-- ============================================
-- Table: sms_trigger_logs
-- ============================================

DROP TABLE IF EXISTS sms_trigger_logs CASCADE;

CREATE TABLE sms_trigger_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trigger_id uuid,
  recipient text,
  result text,
  status text,
  error text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sms_trigger_logs ADD CONSTRAINT sms_trigger_logs_pkey PRIMARY KEY (id);

-- ============================================
-- Table: sms_triggers
-- ============================================

DROP TABLE IF EXISTS sms_triggers CASCADE;

CREATE TABLE sms_triggers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trigger_name text NOT NULL,
  trigger_event text NOT NULL,
  template_id uuid,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text,
  trigger_type text,
  message_template uuid,
  created_by uuid
);

ALTER TABLE sms_triggers ADD CONSTRAINT sms_triggers_pkey PRIMARY KEY (id);

-- ============================================
-- Table: special_order_payments
-- ============================================

DROP TABLE IF EXISTS special_order_payments CASCADE;

CREATE TABLE special_order_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  special_order_id uuid,
  customer_id uuid,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  payment_date timestamptz DEFAULT now(),
  reference_number text,
  account_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  branch_id uuid
);

ALTER TABLE special_order_payments ADD CONSTRAINT special_order_payments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: storage_rooms
-- ============================================

DROP TABLE IF EXISTS storage_rooms CASCADE;

CREATE TABLE storage_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  code varchar(50) NOT NULL,
  description text,
  store_location_id uuid,
  floor_level int4 DEFAULT 1,
  area_sqm numeric,
  is_secure bool DEFAULT false,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE storage_rooms ADD CONSTRAINT storage_rooms_pkey PRIMARY KEY (id);

-- ============================================
-- Table: store_locations
-- ============================================

DROP TABLE IF EXISTS store_locations CASCADE;

CREATE TABLE store_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text,
  zip_code text,
  country text NOT NULL DEFAULT 'Tanzania'::text,
  phone text,
  email text,
  manager_name text,
  is_main bool DEFAULT false,
  is_active bool DEFAULT true,
  opening_time time DEFAULT '09:00:00'::time without time zone,
  closing_time time DEFAULT '18:00:00'::time without time zone,
  inventory_sync_enabled bool DEFAULT true,
  pricing_model text DEFAULT 'centralized'::text,
  tax_rate_override numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  data_isolation_mode text DEFAULT 'shared'::text,
  share_products bool DEFAULT true,
  share_customers bool DEFAULT true,
  share_inventory bool DEFAULT false,
  share_suppliers bool DEFAULT true,
  share_categories bool DEFAULT true,
  share_employees bool DEFAULT false,
  allow_stock_transfer bool DEFAULT true,
  auto_sync_products bool DEFAULT true,
  auto_sync_prices bool DEFAULT true,
  require_approval_for_transfers bool DEFAULT false,
  can_view_other_branches bool DEFAULT false,
  can_transfer_to_branches _text DEFAULT '{}'::text[],
  share_sales bool DEFAULT false,
  share_purchase_orders bool DEFAULT false,
  share_devices bool DEFAULT false,
  share_payments bool DEFAULT false,
  share_appointments bool DEFAULT false,
  share_reminders bool DEFAULT false,
  share_expenses bool DEFAULT false,
  share_trade_ins bool DEFAULT false,
  share_special_orders bool DEFAULT false,
  share_attendance bool DEFAULT false,
  share_loyalty_points bool DEFAULT false,
  share_accounts bool DEFAULT true,
  share_gift_cards bool DEFAULT true,
  share_quality_checks bool DEFAULT false,
  share_recurring_expenses bool DEFAULT false,
  share_communications bool DEFAULT false,
  share_reports bool DEFAULT false,
  share_finance_transfers bool DEFAULT false
);

ALTER TABLE store_locations ADD CONSTRAINT store_locations_pkey PRIMARY KEY (id);

-- ============================================
-- Table: suppliers
-- ============================================

DROP TABLE IF EXISTS suppliers CASCADE;

CREATE TABLE suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text,
  phone text,
  email text,
  address text,
  city text,
  country text,
  tax_id text,
  payment_terms text,
  credit_limit numeric DEFAULT 0,
  current_balance numeric DEFAULT 0,
  is_active bool DEFAULT true,
  rating int4 DEFAULT 5,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);

-- ============================================
-- Table: system_settings
-- ============================================

DROP TABLE IF EXISTS system_settings CASCADE;

CREATE TABLE system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_value text,
  setting_type text DEFAULT 'string'::text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: user_branch_assignments
-- ============================================

DROP TABLE IF EXISTS user_branch_assignments CASCADE;

CREATE TABLE user_branch_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  is_primary bool DEFAULT false,
  can_manage bool DEFAULT false,
  can_view_reports bool DEFAULT false,
  can_manage_inventory bool DEFAULT false,
  can_manage_staff bool DEFAULT false,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid
);

ALTER TABLE user_branch_assignments ADD CONSTRAINT user_branch_assignments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: user_daily_goals
-- ============================================

DROP TABLE IF EXISTS user_daily_goals CASCADE;

CREATE TABLE user_daily_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  goal_amount numeric DEFAULT 0,
  achieved_amount numeric DEFAULT 0,
  is_achieved bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  goal_type text NOT NULL DEFAULT 'general'::text,
  is_active bool DEFAULT true,
  goal_value int4 NOT NULL DEFAULT 5
);

ALTER TABLE user_daily_goals ADD CONSTRAINT user_daily_goals_pkey PRIMARY KEY (id);

-- ============================================
-- Table: user_sessions
-- ============================================

DROP TABLE IF EXISTS user_sessions CASCADE;

CREATE TABLE user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id varchar(255) NOT NULL,
  user_id uuid,
  device_info text,
  ip_address inet,
  user_agent text,
  last_activity timestamptz DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz NOT NULL,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: user_settings
-- ============================================

DROP TABLE IF EXISTS user_settings CASCADE;

CREATE TABLE user_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: user_whatsapp_preferences
-- ============================================

DROP TABLE IF EXISTS user_whatsapp_preferences CASCADE;

CREATE TABLE user_whatsapp_preferences (
  id int4 NOT NULL DEFAULT nextval('user_whatsapp_preferences_id_seq'::regclass),
  user_id uuid NOT NULL,
  active_session_id int4,
  auto_select_session bool DEFAULT true,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_whatsapp_preferences ADD CONSTRAINT user_whatsapp_preferences_pkey PRIMARY KEY (id);

-- ============================================
-- Table: users
-- ============================================

DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password text NOT NULL,
  full_name text,
  role text DEFAULT 'user'::text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  username text,
  permissions _text DEFAULT ARRAY['all'::text],
  max_devices_allowed int4 DEFAULT 1000,
  require_approval bool DEFAULT false,
  failed_login_attempts int4 DEFAULT 0,
  two_factor_enabled bool DEFAULT false,
  two_factor_secret text,
  last_login timestamptz,
  phone text,
  department text,
  branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- ============================================
-- Table: v_has_payment_method_column
-- ============================================

DROP TABLE IF EXISTS v_has_payment_method_column CASCADE;

CREATE TABLE v_has_payment_method_column (
  exists bool
);

-- ============================================
-- Table: webhook_endpoints
-- ============================================

DROP TABLE IF EXISTS webhook_endpoints CASCADE;

CREATE TABLE webhook_endpoints (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  url text NOT NULL,
  events _text DEFAULT '{}'::text[],
  is_active bool DEFAULT true,
  secret text NOT NULL,
  retry_attempts int4 DEFAULT 3,
  timeout_seconds int4 DEFAULT 30,
  last_triggered timestamptz,
  success_count int4 DEFAULT 0,
  failure_count int4 DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_endpoints ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id);

-- ============================================
-- Table: webhook_failures
-- ============================================

DROP TABLE IF EXISTS webhook_failures CASCADE;

CREATE TABLE webhook_failures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb,
  error_message text,
  retry_count int4 DEFAULT 0,
  last_retry_at timestamptz,
  resolved bool DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_failures ADD CONSTRAINT webhook_failures_pkey PRIMARY KEY (id);

-- ============================================
-- Table: webhook_logs
-- ============================================

DROP TABLE IF EXISTS webhook_logs CASCADE;

CREATE TABLE webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  webhook_id uuid,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status int4,
  response_body text,
  error_message text,
  attempt_number int4 DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_logs ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_ab_tests
-- ============================================

DROP TABLE IF EXISTS whatsapp_ab_tests CASCADE;

CREATE TABLE whatsapp_ab_tests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name varchar(255) NOT NULL,
  variants jsonb NOT NULL,
  test_size numeric DEFAULT 0.10,
  metric varchar(50) DEFAULT 'response_rate'::character varying,
  winner_variant varchar(10),
  results jsonb,
  status varchar(50) DEFAULT 'draft'::character varying,
  test_started_at timestamp,
  test_completed_at timestamp,
  winner_sent_at timestamp,
  created_by uuid,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE whatsapp_ab_tests ADD CONSTRAINT whatsapp_ab_tests_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_antiban_settings
-- ============================================

DROP TABLE IF EXISTS whatsapp_antiban_settings CASCADE;

CREATE TABLE whatsapp_antiban_settings (
  id int4 NOT NULL DEFAULT nextval('whatsapp_antiban_settings_id_seq'::regclass),
  user_id int4,
  use_personalization bool DEFAULT true,
  random_delay bool DEFAULT true,
  vary_length bool DEFAULT true,
  skip_recently_contacted bool DEFAULT true,
  use_invisible_chars bool DEFAULT true,
  use_emoji_variation bool DEFAULT true,
  min_delay int4 DEFAULT 3,
  max_delay int4 DEFAULT 8,
  batch_delay int4 DEFAULT 60,
  batch_size int4 DEFAULT 20,
  max_per_hour int4 DEFAULT 30,
  daily_limit int4 DEFAULT 100,
  respect_quiet_hours bool DEFAULT true,
  use_presence bool DEFAULT false,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE whatsapp_antiban_settings ADD CONSTRAINT whatsapp_antiban_settings_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_api_health
-- ============================================

DROP TABLE IF EXISTS whatsapp_api_health CASCADE;

CREATE TABLE whatsapp_api_health (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  status varchar(50),
  response_time_ms int4,
  rate_limit_remaining int4,
  rate_limit_total int4,
  credits_remaining int4,
  warnings jsonb,
  errors jsonb,
  checked_at timestamp DEFAULT now()
);

ALTER TABLE whatsapp_api_health ADD CONSTRAINT whatsapp_api_health_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_blacklist
-- ============================================

DROP TABLE IF EXISTS whatsapp_blacklist CASCADE;

CREATE TABLE whatsapp_blacklist (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  phone varchar(50) NOT NULL,
  reason varchar(100),
  opted_out_at timestamp DEFAULT now(),
  customer_id uuid,
  notes text,
  added_by uuid,
  created_at timestamp DEFAULT now()
);

ALTER TABLE whatsapp_blacklist ADD CONSTRAINT whatsapp_blacklist_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_bulk_campaigns
-- ============================================

DROP TABLE IF EXISTS whatsapp_bulk_campaigns CASCADE;

CREATE TABLE whatsapp_bulk_campaigns (
  id text NOT NULL,
  user_id text NOT NULL,
  name text NOT NULL,
  message text NOT NULL,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  progress jsonb NOT NULL DEFAULT '{"total": 0, "failed": 0, "current": 0, "success": 0}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_url text,
  media_type text,
  failed_recipients jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  last_heartbeat timestamptz,
  error_message text
);

ALTER TABLE whatsapp_bulk_campaigns ADD CONSTRAINT whatsapp_bulk_campaigns_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_calls
-- ============================================

DROP TABLE IF EXISTS whatsapp_calls CASCADE;

CREATE TABLE whatsapp_calls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_phone text NOT NULL,
  customer_id uuid,
  call_type text DEFAULT 'voice'::text,
  call_timestamp timestamptz,
  answered bool DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_calls ADD CONSTRAINT whatsapp_calls_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_campaign_metrics
-- ============================================

DROP TABLE IF EXISTS whatsapp_campaign_metrics CASCADE;

CREATE TABLE whatsapp_campaign_metrics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id uuid,
  total_sent int4 DEFAULT 0,
  total_delivered int4 DEFAULT 0,
  total_read int4 DEFAULT 0,
  total_replied int4 DEFAULT 0,
  total_failed int4 DEFAULT 0,
  avg_response_time_seconds int4,
  first_reply_at timestamp,
  last_reply_at timestamp,
  conversions int4 DEFAULT 0,
  revenue numeric DEFAULT 0,
  total_clicks int4 DEFAULT 0,
  unique_clicks int4 DEFAULT 0,
  open_rate numeric,
  response_rate numeric,
  conversion_rate numeric,
  calculated_at timestamp DEFAULT now()
);

ALTER TABLE whatsapp_campaign_metrics ADD CONSTRAINT whatsapp_campaign_metrics_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_campaigns
-- ============================================

DROP TABLE IF EXISTS whatsapp_campaigns CASCADE;

CREATE TABLE whatsapp_campaigns (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name varchar(255) NOT NULL,
  message text NOT NULL,
  media_url text,
  media_type varchar(50),
  total_recipients int4 NOT NULL,
  recipients_data jsonb,
  sent_count int4 DEFAULT 0,
  success_count int4 DEFAULT 0,
  failed_count int4 DEFAULT 0,
  replied_count int4 DEFAULT 0,
  settings jsonb,
  started_at timestamp,
  completed_at timestamp,
  duration_seconds int4,
  status varchar(50) DEFAULT 'draft'::character varying,
  created_by uuid,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE whatsapp_campaigns ADD CONSTRAINT whatsapp_campaigns_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_customer_segments
-- ============================================

DROP TABLE IF EXISTS whatsapp_customer_segments CASCADE;

CREATE TABLE whatsapp_customer_segments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name varchar(255) NOT NULL,
  description text,
  filters jsonb NOT NULL,
  customer_count int4 DEFAULT 0,
  last_calculated_at timestamp,
  created_by uuid,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE whatsapp_customer_segments ADD CONSTRAINT whatsapp_customer_segments_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_customers
-- ============================================

DROP TABLE IF EXISTS whatsapp_customers CASCADE;

CREATE TABLE whatsapp_customers (
  customer_id int8 NOT NULL DEFAULT nextval('customers_customer_id_seq'::regclass),
  chat_session_name text NOT NULL,
  phone_number text,
  contact_name text,
  total_messages int4 DEFAULT 0,
  messages_from_customer int4 DEFAULT 0,
  messages_to_customer int4 DEFAULT 0,
  first_contact_date timestamp,
  last_contact_date timestamp,
  status text DEFAULT 'active'::text,
  engagement_level text,
  is_buyer int4 DEFAULT 0,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE whatsapp_customers ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);

-- ============================================
-- Table: whatsapp_failed_queue
-- ============================================

DROP TABLE IF EXISTS whatsapp_failed_queue CASCADE;

CREATE TABLE whatsapp_failed_queue (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id uuid,
  recipient_phone varchar(50) NOT NULL,
  recipient_name varchar(255),
  message text NOT NULL,
  media_url text,
  error_message text,
  error_code varchar(50),
  failed_at timestamp DEFAULT now(),
  retry_count int4 DEFAULT 0,
  max_retries int4 DEFAULT 3,
  next_retry_at timestamp,
  last_retry_at timestamp,
  status varchar(50) DEFAULT 'pending'::character varying,
  resolved_at timestamp,
  created_at timestamp DEFAULT now()
);

ALTER TABLE whatsapp_failed_queue ADD CONSTRAINT whatsapp_failed_queue_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_incoming_messages
-- ============================================

DROP TABLE IF EXISTS whatsapp_incoming_messages CASCADE;

CREATE TABLE whatsapp_incoming_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  from_phone text NOT NULL,
  customer_id uuid,
  message_text text,
  message_type text DEFAULT 'text'::text,
  media_url text,
  raw_data jsonb,
  is_read bool DEFAULT false,
  replied bool DEFAULT false,
  replied_at timestamptz,
  replied_by uuid,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  session_id int4
);

ALTER TABLE whatsapp_incoming_messages ADD CONSTRAINT whatsapp_incoming_messages_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_instances_comprehensive
-- ============================================

DROP TABLE IF EXISTS whatsapp_instances_comprehensive CASCADE;

CREATE TABLE whatsapp_instances_comprehensive (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instance_name text NOT NULL,
  instance_id text,
  phone_number text,
  api_key text,
  api_url text,
  status text DEFAULT 'inactive'::text,
  qr_code text,
  is_active bool DEFAULT true,
  last_connected timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_instances_comprehensive ADD CONSTRAINT whatsapp_instances_comprehensive_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_logs
-- ============================================

DROP TABLE IF EXISTS whatsapp_logs CASCADE;

CREATE TABLE whatsapp_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_phone text NOT NULL,
  message text,
  message_type text NOT NULL DEFAULT 'text'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  error_message text,
  sent_at timestamptz,
  sent_by uuid,
  created_at timestamptz DEFAULT now(),
  device_id uuid,
  customer_id uuid,
  message_id text,
  media_url text,
  branch_id uuid,
  is_shared bool DEFAULT false,
  delivered_at timestamptz,
  read_at timestamptz,
  session_id int4
);

ALTER TABLE whatsapp_logs ADD CONSTRAINT whatsapp_logs_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_media_library
-- ============================================

DROP TABLE IF EXISTS whatsapp_media_library CASCADE;

CREATE TABLE whatsapp_media_library (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name varchar(255) NOT NULL,
  file_name varchar(255) NOT NULL,
  file_url text NOT NULL,
  file_type varchar(50),
  file_size int4,
  mime_type varchar(100),
  folder varchar(255) DEFAULT 'General'::character varying,
  tags _text DEFAULT '{}'::text[],
  usage_count int4 DEFAULT 0,
  last_used_at timestamp,
  width int4,
  height int4,
  duration int4,
  thumbnail_url text,
  uploaded_by uuid,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE whatsapp_media_library ADD CONSTRAINT whatsapp_media_library_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_message_templates
-- ============================================

DROP TABLE IF EXISTS whatsapp_message_templates CASCADE;

CREATE TABLE whatsapp_message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_content text NOT NULL,
  variables jsonb,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_message_templates ADD CONSTRAINT whatsapp_message_templates_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_poll_results
-- ============================================

DROP TABLE IF EXISTS whatsapp_poll_results CASCADE;

CREATE TABLE whatsapp_poll_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  poll_id text NOT NULL,
  voter_phone text NOT NULL,
  customer_id uuid,
  selected_options _text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_poll_results ADD CONSTRAINT whatsapp_poll_results_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_reactions
-- ============================================

DROP TABLE IF EXISTS whatsapp_reactions CASCADE;

CREATE TABLE whatsapp_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  from_phone text NOT NULL,
  customer_id uuid,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_reactions ADD CONSTRAINT whatsapp_reactions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_reply_templates
-- ============================================

DROP TABLE IF EXISTS whatsapp_reply_templates CASCADE;

CREATE TABLE whatsapp_reply_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name varchar(255) NOT NULL,
  category varchar(100),
  keywords _text DEFAULT '{}'::text[],
  message text NOT NULL,
  media_id uuid,
  auto_send bool DEFAULT false,
  usage_count int4 DEFAULT 0,
  last_used_at timestamp,
  created_by uuid,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE whatsapp_reply_templates ADD CONSTRAINT whatsapp_reply_templates_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_scheduled_campaigns
-- ============================================

DROP TABLE IF EXISTS whatsapp_scheduled_campaigns CASCADE;

CREATE TABLE whatsapp_scheduled_campaigns (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id uuid,
  schedule_type varchar(50),
  scheduled_for timestamp NOT NULL,
  timezone varchar(100) DEFAULT 'Africa/Dar_es_Salaam'::character varying,
  recurrence_pattern jsonb,
  drip_sequence jsonb,
  status varchar(50) DEFAULT 'pending'::character varying,
  executed_at timestamp,
  created_by uuid,
  created_at timestamp DEFAULT now()
);

ALTER TABLE whatsapp_scheduled_campaigns ADD CONSTRAINT whatsapp_scheduled_campaigns_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_session_logs
-- ============================================

DROP TABLE IF EXISTS whatsapp_session_logs CASCADE;

CREATE TABLE whatsapp_session_logs (
  id int4 NOT NULL DEFAULT nextval('whatsapp_session_logs_id_seq'::regclass),
  session_id int4,
  event_type varchar(100) NOT NULL,
  message text,
  metadata jsonb,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE whatsapp_session_logs ADD CONSTRAINT whatsapp_session_logs_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_sessions
-- ============================================

DROP TABLE IF EXISTS whatsapp_sessions CASCADE;

CREATE TABLE whatsapp_sessions (
  id int4 NOT NULL DEFAULT nextval('whatsapp_sessions_id_seq'::regclass),
  wasender_session_id int4 NOT NULL,
  name varchar(255) NOT NULL,
  phone_number varchar(50) NOT NULL,
  status varchar(50) DEFAULT 'DISCONNECTED'::character varying,
  account_protection bool DEFAULT true,
  log_messages bool DEFAULT true,
  webhook_url text,
  webhook_enabled bool DEFAULT false,
  webhook_events jsonb,
  api_key text,
  webhook_secret text,
  session_data jsonb,
  user_info jsonb,
  last_connected_at timestamp,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE whatsapp_sessions ADD CONSTRAINT whatsapp_sessions_pkey PRIMARY KEY (id);

-- ============================================
-- Table: whatsapp_templates
-- ============================================

DROP TABLE IF EXISTS whatsapp_templates CASCADE;

CREATE TABLE whatsapp_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id text,
  template_name text NOT NULL,
  language text DEFAULT 'en'::text,
  category text,
  status text,
  body_text text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_templates ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);
