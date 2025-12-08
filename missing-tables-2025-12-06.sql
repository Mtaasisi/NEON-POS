--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Homebrew)
-- Dumped by pg_dump version 17.5 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    key text NOT NULL,
    scopes text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    last_used timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_request_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_request_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    api_key_id uuid,
    endpoint text NOT NULL,
    method text NOT NULL,
    ip_address text,
    user_agent text,
    response_status integer,
    response_time_ms integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    attendance_date date NOT NULL,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    check_in_location_lat numeric(10,8),
    check_in_location_lng numeric(11,8),
    check_out_location_lat numeric(10,8),
    check_out_location_lng numeric(11,8),
    check_in_network_ssid character varying(255),
    check_out_network_ssid character varying(255),
    check_in_photo_url text,
    check_out_photo_url text,
    total_hours numeric(5,2) DEFAULT 0,
    break_hours numeric(5,2) DEFAULT 0,
    overtime_hours numeric(5,2) DEFAULT 0,
    status character varying(50) DEFAULT 'present'::character varying,
    notes text,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid
);


--
-- Name: auto_reorder_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auto_reorder_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    supplier_id uuid,
    triggered_quantity integer NOT NULL,
    reorder_point integer NOT NULL,
    suggested_quantity integer NOT NULL,
    purchase_order_id uuid,
    po_created boolean DEFAULT false,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: backup_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    backup_type text NOT NULL,
    status text DEFAULT 'pending'::text,
    file_path text,
    file_size bigint,
    record_count integer,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    error_message text,
    created_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT backup_logs_backup_type_check CHECK ((backup_type = ANY (ARRAY['full'::text, 'incremental'::text, 'manual'::text, 'scheduled'::text]))),
    CONSTRAINT backup_logs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: TABLE backup_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.backup_logs IS 'Database backup operation logs';


--
-- Name: branch_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branch_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    user_id uuid,
    action_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: branch_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branch_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_branch_id uuid NOT NULL,
    to_branch_id uuid NOT NULL,
    transfer_type text DEFAULT 'stock'::text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    quantity integer,
    status text DEFAULT 'pending'::text,
    requested_by uuid,
    approved_by uuid,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    requested_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    rejection_reason text,
    CONSTRAINT branch_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'in_transit'::text, 'completed'::text, 'rejected'::text, 'cancelled'::text]))),
    CONSTRAINT branch_transfers_transfer_type_check CHECK ((transfer_type = ANY (ARRAY['stock'::text, 'customer'::text, 'product'::text])))
);


--
-- Name: TABLE branch_transfers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.branch_transfers IS 'Manages stock transfers between branches';


--
-- Name: COLUMN branch_transfers.from_branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch_transfers.from_branch_id IS 'Source branch for the transfer';


--
-- Name: COLUMN branch_transfers.to_branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch_transfers.to_branch_id IS 'Destination branch for the transfer';


--
-- Name: COLUMN branch_transfers.transfer_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch_transfers.transfer_type IS 'Type of transfer: stock, customer, or product';


--
-- Name: COLUMN branch_transfers.entity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch_transfers.entity_id IS 'ID of the product/variant being transferred';


--
-- Name: COLUMN branch_transfers.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch_transfers.status IS 'Transfer status: pending, approved, in_transit, completed, rejected, cancelled';


--
-- Name: buyer_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buyer_details (
    buyer_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    buying_messages integer DEFAULT 0,
    unique_keywords integer DEFAULT 0,
    keywords_found text,
    first_inquiry_date timestamp without time zone,
    last_inquiry_date timestamp without time zone,
    buying_score integer DEFAULT 0,
    buyer_tier text,
    sample_message text,
    conversion_status text DEFAULT 'pending'::text,
    last_contacted timestamp without time zone,
    notes text
);


--
-- Name: buyer_details_buyer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.buyer_details_buyer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: buyer_details_buyer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.buyer_details_buyer_id_seq OWNED BY public.buyer_details.buyer_id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    parent_id uuid,
    branch_id uuid,
    is_shared boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: communication_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communication_log (
    log_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    communication_type text,
    direction text,
    subject text,
    notes text,
    contacted_by text,
    contact_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    follow_up_required integer DEFAULT 0,
    follow_up_date timestamp without time zone
);


--
-- Name: communication_log_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.communication_log_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: communication_log_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.communication_log_log_id_seq OWNED BY public.communication_log.log_id;


--
-- Name: customer_fix_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_fix_backup (
    backup_id integer NOT NULL,
    backup_timestamp timestamp with time zone DEFAULT now(),
    customer_id uuid,
    customer_name text,
    customer_phone text,
    old_total_spent numeric,
    new_total_spent numeric,
    old_points integer,
    new_points integer,
    old_loyalty_level text,
    new_loyalty_level text,
    sale_number text,
    fix_reason text
);


--
-- Name: customer_fix_backup_backup_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_fix_backup_backup_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_fix_backup_backup_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_fix_backup_backup_id_seq OWNED BY public.customer_fix_backup.backup_id;


--
-- Name: customer_installment_plan_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_installment_plan_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    installment_plan_id uuid,
    customer_id uuid,
    installment_number integer NOT NULL,
    amount numeric NOT NULL,
    payment_method text NOT NULL,
    payment_date timestamp with time zone DEFAULT now(),
    due_date date NOT NULL,
    status text DEFAULT 'paid'::text,
    days_late integer DEFAULT 0,
    late_fee numeric DEFAULT 0,
    account_id uuid,
    reference_number text,
    notification_sent boolean DEFAULT false,
    notification_sent_at timestamp with time zone,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_installment_plan_payments_status_check CHECK ((status = ANY (ARRAY['paid'::text, 'pending'::text, 'late'::text, 'waived'::text])))
);


--
-- Name: TABLE customer_installment_plan_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_installment_plan_payments IS 'Individual payments made towards customer installment plans';


--
-- Name: customer_installment_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_installment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    number_of_installments integer NOT NULL,
    installments_paid integer DEFAULT 0,
    payment_frequency text DEFAULT 'monthly'::text,
    start_date date NOT NULL,
    next_payment_date date NOT NULL,
    end_date date NOT NULL,
    completion_date date,
    status text DEFAULT 'active'::text,
    late_fee_amount numeric DEFAULT 0,
    late_fee_applied numeric DEFAULT 0,
    days_overdue integer DEFAULT 0,
    last_reminder_sent timestamp with time zone,
    reminder_count integer DEFAULT 0,
    terms_accepted boolean DEFAULT true,
    terms_accepted_date timestamp with time zone DEFAULT now(),
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_installment_plans_payment_frequency_check CHECK ((payment_frequency = ANY (ARRAY['weekly'::text, 'bi_weekly'::text, 'monthly'::text, 'custom'::text]))),
    CONSTRAINT customer_installment_plans_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'defaulted'::text, 'cancelled'::text])))
);


--
-- Name: TABLE customer_installment_plans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_installment_plans IS 'Customer installment payment plans for sales';


--
-- Name: customer_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    message text NOT NULL,
    direction text DEFAULT 'inbound'::text NOT NULL,
    channel text DEFAULT 'chat'::text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    sender_id uuid,
    sender_name text,
    device_id uuid,
    appointment_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    delivered_at timestamp with time zone,
    branch_id uuid,
    is_shared boolean DEFAULT false,
    CONSTRAINT customer_messages_channel_check CHECK ((channel = ANY (ARRAY['chat'::text, 'sms'::text, 'whatsapp'::text, 'email'::text]))),
    CONSTRAINT customer_messages_direction_check CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text]))),
    CONSTRAINT customer_messages_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text, 'failed'::text])))
);


--
-- Name: TABLE customer_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_messages IS 'Stores all customer communication messages across different channels';


--
-- Name: customer_points_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_points_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    points_change integer NOT NULL,
    reason text,
    transaction_type text DEFAULT 'manual'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_special_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_special_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    customer_id uuid,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    product_name text NOT NULL,
    product_description text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    deposit_paid numeric DEFAULT 0,
    balance_due numeric DEFAULT 0,
    status text DEFAULT 'deposit_received'::text,
    order_date timestamp with time zone DEFAULT now(),
    expected_arrival_date date,
    actual_arrival_date date,
    delivery_date timestamp with time zone,
    supplier_name text,
    supplier_reference text,
    country_of_origin text,
    tracking_number text,
    notes text,
    internal_notes text,
    customer_notified_arrival boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_special_orders_status_check CHECK ((status = ANY (ARRAY['deposit_received'::text, 'ordered'::text, 'in_transit'::text, 'arrived'::text, 'ready_for_pickup'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: TABLE customer_special_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_special_orders IS 'Customer pre-orders and special import orders';


--
-- Name: lats_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    city text,
    location text,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    loyalty_points integer DEFAULT 0,
    total_spent numeric DEFAULT 0,
    status text DEFAULT 'active'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    whatsapp text,
    gender text,
    country text,
    color_tag text DEFAULT 'new'::text,
    loyalty_level text DEFAULT 'bronze'::text,
    points integer DEFAULT 0,
    last_visit timestamp with time zone,
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
    whatsapp_opt_out boolean DEFAULT false,
    referred_by uuid,
    created_by uuid,
    last_purchase_date timestamp with time zone,
    total_purchases integer DEFAULT 0,
    total_returns integer DEFAULT 0,
    total_calls integer DEFAULT 0,
    total_call_duration_minutes numeric DEFAULT 0,
    incoming_calls integer DEFAULT 0,
    outgoing_calls integer DEFAULT 0,
    missed_calls integer DEFAULT 0,
    avg_call_duration_minutes numeric DEFAULT 0,
    first_call_date timestamp with time zone,
    last_call_date timestamp with time zone,
    call_loyalty_level text DEFAULT 'Basic'::text,
    last_activity_date timestamp with time zone DEFAULT now(),
    referrals jsonb DEFAULT '[]'::jsonb,
    is_shared boolean DEFAULT true,
    preferred_branch_id uuid,
    visible_to_branches uuid[],
    sharing_mode text DEFAULT 'isolated'::text,
    created_by_branch_id uuid,
    created_by_branch_name text,
    CONSTRAINT lats_customers_sharing_mode_check CHECK ((sharing_mode = ANY (ARRAY['isolated'::text, 'shared'::text, 'custom'::text])))
);


--
-- Name: whatsapp_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_customers (
    customer_id bigint NOT NULL,
    chat_session_name text NOT NULL,
    phone_number text,
    contact_name text,
    total_messages integer DEFAULT 0,
    messages_from_customer integer DEFAULT 0,
    messages_to_customer integer DEFAULT 0,
    first_contact_date timestamp without time zone,
    last_contact_date timestamp without time zone,
    status text DEFAULT 'active'::text,
    engagement_level text,
    is_buyer integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customers_customer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_customer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_customer_id_seq OWNED BY public.whatsapp_customers.customer_id;


--
-- Name: customers_duplicates_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers_duplicates_backup (
    id uuid,
    name text,
    email text,
    phone text,
    address text,
    city text,
    location text,
    branch_id uuid,
    loyalty_points integer,
    total_spent numeric,
    status text,
    is_active boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    whatsapp text,
    gender text,
    country text,
    color_tag text,
    loyalty_level text,
    points integer,
    last_visit timestamp with time zone,
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
    whatsapp_opt_out boolean,
    referred_by uuid,
    created_by uuid,
    last_purchase_date timestamp with time zone,
    total_purchases integer,
    total_returns integer,
    total_calls integer,
    total_call_duration_minutes numeric,
    incoming_calls integer,
    outgoing_calls integer,
    missed_calls integer,
    avg_call_duration_minutes numeric,
    first_call_date timestamp with time zone,
    last_call_date timestamp with time zone,
    call_loyalty_level text,
    last_activity_date timestamp with time zone,
    referrals jsonb,
    is_shared boolean,
    preferred_branch_id uuid,
    visible_to_branches uuid[],
    sharing_mode text,
    created_by_branch_id uuid,
    created_by_branch_name text,
    backup_date timestamp with time zone,
    backup_reason text
);


--
-- Name: daily_opening_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_opening_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    opened_by character varying(255),
    opened_by_user_id uuid,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE daily_opening_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.daily_opening_sessions IS 'Tracks daily POS session openings. RLS policies allow all operations since sessions are system-wide. The opened_by_user_id column tracks who opened each session for audit purposes.';


--
-- Name: daily_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_date date DEFAULT CURRENT_DATE NOT NULL,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    hours_worked numeric(4,2) DEFAULT 0,
    tasks_completed text[],
    tasks_in_progress text[],
    projects_worked text[],
    sales_achieved numeric(10,2) DEFAULT 0,
    customers_served integer DEFAULT 0,
    issues_resolved integer DEFAULT 0,
    achievements text,
    challenges text,
    learnings text,
    goals_for_tomorrow text,
    feedback text,
    mood_rating integer,
    energy_level integer,
    status text DEFAULT 'draft'::text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    report_type text DEFAULT 'daily'::text NOT NULL,
    report_month date,
    title text DEFAULT ''::text NOT NULL,
    customer_interactions text,
    pending_work text,
    recommendations text,
    additional_notes text,
    sales_made integer DEFAULT 0,
    pending_tasks integer DEFAULT 0,
    submitted_at timestamp with time zone,
    CONSTRAINT daily_reports_energy_level_check CHECK (((energy_level >= 1) AND (energy_level <= 5))),
    CONSTRAINT daily_reports_mood_rating_check CHECK (((mood_rating >= 1) AND (mood_rating <= 5))),
    CONSTRAINT daily_reports_report_type_check CHECK ((report_type = ANY (ARRAY['daily'::text, 'monthly'::text]))),
    CONSTRAINT daily_reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: COLUMN daily_reports.report_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_reports.report_date IS 'Date of the report (for daily reports)';


--
-- Name: COLUMN daily_reports.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_reports.status IS 'Report status: draft, submitted, reviewed, approved';


--
-- Name: document_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    name text NOT NULL,
    content text NOT NULL,
    is_default boolean DEFAULT false,
    variables text[] DEFAULT '{}'::text[],
    paper_size text DEFAULT 'A4'::text,
    orientation text DEFAULT 'portrait'::text,
    header_html text,
    footer_html text,
    css_styles text,
    logo_url text,
    show_logo boolean DEFAULT true,
    show_business_info boolean DEFAULT true,
    show_customer_info boolean DEFAULT true,
    show_payment_info boolean DEFAULT true,
    show_terms boolean DEFAULT true,
    terms_text text,
    show_signature boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT document_templates_orientation_check CHECK ((orientation = ANY (ARRAY['portrait'::text, 'landscape'::text]))),
    CONSTRAINT document_templates_paper_size_check CHECK ((paper_size = ANY (ARRAY['A4'::text, 'Letter'::text, 'Thermal-80mm'::text, 'Thermal-58mm'::text]))),
    CONSTRAINT document_templates_type_check CHECK ((type = ANY (ARRAY['invoice'::text, 'quote'::text, 'purchase_order'::text, 'repair_order'::text, 'receipt'::text])))
);


--
-- Name: employee_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    shift_template_id uuid,
    shift_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    break_duration_minutes integer DEFAULT 0,
    status character varying(50) DEFAULT 'scheduled'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: employees_backup_migration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees_backup_migration (
    id uuid,
    user_id uuid,
    first_name character varying(100),
    last_name character varying(100),
    email character varying(255),
    phone character varying(50),
    date_of_birth date,
    gender character varying(20),
    "position" character varying(100),
    department character varying(100),
    hire_date date,
    termination_date date,
    employment_type character varying(50),
    salary numeric(15,2),
    currency character varying(10),
    status character varying(50),
    performance_rating numeric(3,2),
    skills text[],
    manager_id uuid,
    location character varying(255),
    emergency_contact_name character varying(100),
    emergency_contact_phone character varying(50),
    address_line1 character varying(255),
    address_line2 character varying(255),
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country character varying(100),
    photo_url text,
    bio text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by uuid,
    updated_by uuid
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    color text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    category text,
    description text,
    amount numeric DEFAULT 0 NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL,
    reference_number text,
    vendor_name text,
    notes text,
    payment_method text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    purchase_order_id uuid,
    product_id uuid,
    created_by uuid
);


--
-- Name: TABLE expenses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.expenses IS 'Table for tracking business expenses and operational costs';


--
-- Name: COLUMN expenses.purchase_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expenses.purchase_order_id IS 'Reference to the purchase order this expense is related to (e.g., shipping, customs)';


--
-- Name: COLUMN expenses.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expenses.product_id IS 'Reference to the specific product this expense is allocated to';


--
-- Name: COLUMN expenses.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expenses.created_by IS 'User who created this expense record';


--
-- Name: store_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    state text,
    zip_code text,
    country text DEFAULT 'Tanzania'::text NOT NULL,
    phone text,
    email text,
    manager_name text,
    is_main boolean DEFAULT false,
    is_active boolean DEFAULT true,
    opening_time time without time zone DEFAULT '09:00:00'::time without time zone,
    closing_time time without time zone DEFAULT '18:00:00'::time without time zone,
    inventory_sync_enabled boolean DEFAULT true,
    pricing_model text DEFAULT 'centralized'::text,
    tax_rate_override numeric(5,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    data_isolation_mode text DEFAULT 'shared'::text,
    share_products boolean DEFAULT true,
    share_customers boolean DEFAULT true,
    share_inventory boolean DEFAULT false,
    share_suppliers boolean DEFAULT true,
    share_categories boolean DEFAULT true,
    share_employees boolean DEFAULT false,
    allow_stock_transfer boolean DEFAULT true,
    auto_sync_products boolean DEFAULT true,
    auto_sync_prices boolean DEFAULT true,
    require_approval_for_transfers boolean DEFAULT false,
    can_view_other_branches boolean DEFAULT false,
    can_transfer_to_branches text[] DEFAULT '{}'::text[],
    share_sales boolean DEFAULT false,
    share_purchase_orders boolean DEFAULT false,
    share_devices boolean DEFAULT false,
    share_payments boolean DEFAULT false,
    share_appointments boolean DEFAULT false,
    share_reminders boolean DEFAULT false,
    share_expenses boolean DEFAULT false,
    share_trade_ins boolean DEFAULT false,
    share_special_orders boolean DEFAULT false,
    share_attendance boolean DEFAULT false,
    share_loyalty_points boolean DEFAULT false,
    share_accounts boolean DEFAULT true,
    share_gift_cards boolean DEFAULT true,
    share_quality_checks boolean DEFAULT false,
    share_recurring_expenses boolean DEFAULT false,
    share_communications boolean DEFAULT false,
    share_reports boolean DEFAULT false,
    share_finance_transfers boolean DEFAULT false,
    CONSTRAINT store_locations_data_isolation_mode_check CHECK ((data_isolation_mode = ANY (ARRAY['shared'::text, 'isolated'::text, 'hybrid'::text]))),
    CONSTRAINT store_locations_pricing_model_check CHECK ((pricing_model = ANY (ARRAY['centralized'::text, 'location-specific'::text])))
);


--
-- Name: COLUMN store_locations.data_isolation_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_locations.data_isolation_mode IS 'Isolation mode: shared (all data shared), isolated (all data isolated), hybrid (per-entity configuration)';


--
-- Name: COLUMN store_locations.share_products; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_locations.share_products IS 'If true in hybrid mode, products are shared across branches. If false, products are isolated per branch.';


--
-- Name: COLUMN store_locations.share_customers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_locations.share_customers IS 'If true in hybrid mode, customers are shared across branches. If false, customers are isolated per branch.';


--
-- Name: COLUMN store_locations.share_inventory; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_locations.share_inventory IS 'If true in hybrid mode, inventory/variants are shared across branches. If false, inventory is isolated per branch.';


--
-- Name: COLUMN store_locations.share_suppliers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_locations.share_suppliers IS 'If true in hybrid mode, suppliers are shared across branches. If false, suppliers are isolated per branch.';


--
-- Name: COLUMN store_locations.share_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_locations.share_accounts IS 'If true in hybrid mode, payment accounts are shared across branches. If false, accounts are isolated per branch.';


--
-- Name: imei_validation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imei_validation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    imei text NOT NULL,
    imei_status text NOT NULL,
    validation_reason text,
    source_table text,
    source_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT imei_validation_imei_status_check CHECK ((imei_status = ANY (ARRAY['valid'::text, 'invalid'::text, 'duplicate'::text, 'empty'::text])))
);


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    branch_id uuid,
    quantity integer DEFAULT 0 NOT NULL,
    reserved_quantity integer DEFAULT 0,
    min_stock_level integer DEFAULT 0,
    max_stock_level integer,
    last_updated timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location text,
    phone text,
    email text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_data_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_data_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    field_name text NOT NULL,
    old_value text,
    new_value text,
    change_reason text,
    change_source text,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_data_audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_data_audit_log IS 'Tracks all data changes for auditing and preventing fake data';


--
-- Name: lats_employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    "position" text,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    salary numeric DEFAULT 0,
    hire_date date DEFAULT CURRENT_DATE,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    purchase_date timestamp with time zone DEFAULT now(),
    warranty_start date,
    warranty_end date,
    cost_price numeric(10,2) DEFAULT 0 NOT NULL,
    selling_price numeric(10,2),
    quality_check_status text DEFAULT 'pending'::text,
    quality_check_notes text,
    quality_checked_at timestamp with time zone,
    quality_checked_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    branch_id uuid,
    quantity integer DEFAULT 1,
    storage_room_id uuid,
    CONSTRAINT lats_inventory_items_quality_check_status_check CHECK ((quality_check_status = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text]))),
    CONSTRAINT lats_inventory_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'received'::text, 'in_stock'::text, 'sold'::text, 'returned'::text, 'damaged'::text, 'quality_checked'::text])))
);


--
-- Name: TABLE lats_inventory_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_inventory_items IS 'Individual inventory items received from purchase orders';


--
-- Name: COLUMN lats_inventory_items.serial_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.serial_number IS 'Serial number for trackable items';


--
-- Name: COLUMN lats_inventory_items.imei; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.imei IS 'IMEI for mobile devices';


--
-- Name: COLUMN lats_inventory_items.mac_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.mac_address IS 'MAC address for network devices';


--
-- Name: COLUMN lats_inventory_items.barcode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.barcode IS 'Barcode for scanning';


--
-- Name: COLUMN lats_inventory_items.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.status IS 'Current status of the inventory item';


--
-- Name: COLUMN lats_inventory_items.quality_check_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.quality_check_status IS 'Quality check result: pending, passed, failed';


--
-- Name: COLUMN lats_inventory_items.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.quantity IS 'Quantity of items (defaults to 1 for individual items)';


--
-- Name: COLUMN lats_inventory_items.storage_room_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.storage_room_id IS 'Storage room where inventory item is located';


--
-- Name: lats_pos_integrations_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_pos_integrations_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid,
    integration_name text NOT NULL,
    integration_type text NOT NULL,
    provider_name text,
    is_enabled boolean DEFAULT false,
    is_active boolean DEFAULT false,
    is_test_mode boolean DEFAULT true,
    credentials jsonb DEFAULT '{}'::jsonb,
    config jsonb DEFAULT '{}'::jsonb,
    description text,
    webhook_url text,
    callback_url text,
    environment text DEFAULT 'test'::text,
    last_used_at timestamp with time zone,
    total_requests integer DEFAULT 0,
    successful_requests integer DEFAULT 0,
    failed_requests integer DEFAULT 0,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lats_pos_integrations_settings_environment_check CHECK ((environment = ANY (ARRAY['test'::text, 'production'::text, 'sandbox'::text])))
);


--
-- Name: lats_product_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_product_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_variant_id uuid NOT NULL,
    imei text NOT NULL,
    status text DEFAULT 'in_stock'::text,
    sale_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    product_id uuid
);


--
-- Name: lats_purchase_order_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_purchase_order_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    action text NOT NULL,
    old_status text,
    new_status text,
    user_id uuid NOT NULL,
    notes text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_purchase_order_audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_purchase_order_audit_log IS 'Audit log for tracking all changes and actions performed on purchase orders';


--
-- Name: lats_purchase_order_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_purchase_order_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    payment_date timestamp with time zone DEFAULT now(),
    reference_number text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    branch_id uuid
);


--
-- Name: TABLE lats_purchase_order_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_purchase_order_payments IS 'Payment records for purchase orders';


--
-- Name: COLUMN lats_purchase_order_payments.amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_payments.amount IS 'Payment amount';


--
-- Name: COLUMN lats_purchase_order_payments.payment_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_payments.payment_method IS 'Method of payment (cash, bank transfer, credit, etc.)';


--
-- Name: COLUMN lats_purchase_order_payments.reference_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_payments.reference_number IS 'Transaction reference or receipt number';


--
-- Name: COLUMN lats_purchase_order_payments.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_payments.branch_id IS 'Branch ID for data isolation';


--
-- Name: lats_purchase_order_shipping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_purchase_order_shipping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    use_same_address boolean DEFAULT true,
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
    container_count integer DEFAULT 1,
    shipping_status text DEFAULT 'pending'::text,
    shipping_notes text,
    customs_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_shipping_status CHECK ((shipping_status = ANY (ARRAY['pending'::text, 'preparing'::text, 'in_transit'::text, 'customs'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: TABLE lats_purchase_order_shipping; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_purchase_order_shipping IS 'Detailed shipping information for each purchase order';


--
-- Name: COLUMN lats_purchase_order_shipping.use_same_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_shipping.use_same_address IS 'Whether billing address is same as shipping address';


--
-- Name: COLUMN lats_purchase_order_shipping.shipping_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_shipping.shipping_status IS 'Current status of the shipment';


--
-- Name: lats_shipping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_shipping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid,
    shipping_method text,
    tracking_number text,
    carrier text,
    estimated_arrival_date date,
    actual_arrival_date date,
    status text DEFAULT 'pending'::text,
    shipping_cost numeric(10,2),
    shipping_address text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_shipping_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_shipping_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    company_name text,
    contact_person text,
    phone text,
    email text,
    whatsapp text,
    shipping_methods text[] DEFAULT ARRAY['sea'::text, 'air'::text],
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
    total_shipments integer DEFAULT 0,
    successful_shipments integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_preferred boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT lats_shipping_agents_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);


--
-- Name: TABLE lats_shipping_agents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_shipping_agents IS 'Stores information about shipping agents and freight forwarders';


--
-- Name: COLUMN lats_shipping_agents.shipping_methods; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_shipping_agents.shipping_methods IS 'Array of shipping methods this agent handles';


--
-- Name: COLUMN lats_shipping_agents.rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_shipping_agents.rating IS 'Agent rating from 0 to 5';


--
-- Name: lats_shipping_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_shipping_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    estimated_days_min integer,
    estimated_days_max integer,
    cost_multiplier numeric DEFAULT 1.0,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_shipping_methods; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_shipping_methods IS 'Defines available shipping methods (air, sea, etc.)';


--
-- Name: lats_stock_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_stock_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_number text,
    from_branch_id uuid,
    to_branch_id uuid,
    product_id uuid,
    variant_id uuid,
    quantity integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text,
    requested_by uuid,
    approved_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT lats_stock_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'in_transit'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text])))
);


--
-- Name: TABLE lats_stock_transfers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_stock_transfers IS 'Stock transfers between branches';


--
-- Name: lats_store_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_store_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    location text,
    capacity integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    store_location_id uuid,
    code text,
    floor_level integer DEFAULT 0,
    area_sqm numeric,
    max_capacity integer,
    current_capacity integer DEFAULT 0,
    is_secure boolean DEFAULT false,
    requires_access_card boolean DEFAULT false,
    color_code text,
    notes text
);


--
-- Name: TABLE lats_store_rooms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_store_rooms IS 'Storage rooms for inventory organization';


--
-- Name: lats_supplier_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_supplier_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    color text,
    parent_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_supplier_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_categories IS 'Categories for organizing suppliers (Electronics, Phones, Accessories, etc.)';


--
-- Name: lats_supplier_category_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_supplier_category_mapping (
    supplier_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_supplier_category_mapping; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_category_mapping IS 'Many-to-many relationship between suppliers and categories';


--
-- Name: lats_supplier_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_supplier_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    communication_type text NOT NULL,
    direction text DEFAULT 'outbound'::text,
    subject text,
    message text,
    notes text,
    contact_person text,
    response_time_hours integer,
    follow_up_required boolean DEFAULT false,
    follow_up_date date,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_supplier_communications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_communications IS 'Tracks all communications with suppliers for relationship management';


--
-- Name: lats_supplier_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_supplier_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    contract_number text,
    contract_name text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    contract_value numeric(15,2),
    currency text DEFAULT 'TZS'::text,
    auto_renew boolean DEFAULT false,
    renewal_notice_days integer DEFAULT 30,
    payment_terms text,
    terms_and_conditions text,
    document_url text,
    status text DEFAULT 'active'::text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_supplier_contracts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_contracts IS 'Manages supplier contracts with expiry tracking and renewal reminders';


--
-- Name: lats_supplier_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_supplier_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    document_type text NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    mime_type text,
    expiry_date date,
    notes text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_supplier_documents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_documents IS 'Stores all supplier-related documents (contracts, licenses, certificates, etc.)';


--
-- Name: lats_supplier_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_supplier_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    purchase_order_id uuid,
    overall_rating integer,
    quality_rating integer,
    delivery_rating integer,
    communication_rating integer,
    price_rating integer,
    review_text text,
    pros text,
    cons text,
    would_recommend boolean DEFAULT true,
    rated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lats_supplier_ratings_communication_rating_check CHECK (((communication_rating >= 1) AND (communication_rating <= 5))),
    CONSTRAINT lats_supplier_ratings_delivery_rating_check CHECK (((delivery_rating >= 1) AND (delivery_rating <= 5))),
    CONSTRAINT lats_supplier_ratings_overall_rating_check CHECK (((overall_rating >= 1) AND (overall_rating <= 5))),
    CONSTRAINT lats_supplier_ratings_price_rating_check CHECK (((price_rating >= 1) AND (price_rating <= 5))),
    CONSTRAINT lats_supplier_ratings_quality_rating_check CHECK (((quality_rating >= 1) AND (quality_rating <= 5)))
);


--
-- Name: TABLE lats_supplier_ratings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_ratings IS 'Stores ratings and reviews for supplier performance tracking';


--
-- Name: lats_supplier_tag_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_supplier_tag_mapping (
    supplier_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_supplier_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_supplier_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_supplier_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_tags IS 'Custom tags for flexible supplier organization';


--
-- Name: lats_trade_in_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_trade_in_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    customer_agreed_terms boolean DEFAULT false,
    customer_signature_data text,
    staff_signature_data text,
    customer_signed_at timestamp with time zone,
    staff_signed_at timestamp with time zone,
    witness_name text,
    witness_signature_data text,
    witness_signed_at timestamp with time zone,
    status text DEFAULT 'draft'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    voided_at timestamp with time zone,
    voided_by uuid,
    void_reason text
);


--
-- Name: TABLE lats_trade_in_contracts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_trade_in_contracts IS 'Legal contracts for device trade-in purchases';


--
-- Name: lats_trade_in_damage_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_trade_in_damage_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid,
    damage_type text NOT NULL,
    damage_description text,
    spare_part_id uuid,
    spare_part_name text,
    deduction_amount numeric DEFAULT 0 NOT NULL,
    assessed_by uuid,
    assessed_at timestamp with time zone DEFAULT now(),
    damage_photos jsonb
);


--
-- Name: TABLE lats_trade_in_damage_assessments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_trade_in_damage_assessments IS 'Detailed damage assessments with spare part pricing';


--
-- Name: lats_trade_in_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_trade_in_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    variant_id uuid,
    device_name text NOT NULL,
    device_model text NOT NULL,
    base_trade_in_price numeric DEFAULT 0 NOT NULL,
    branch_id uuid,
    excellent_multiplier numeric DEFAULT 1.0,
    good_multiplier numeric DEFAULT 0.85,
    fair_multiplier numeric DEFAULT 0.70,
    poor_multiplier numeric DEFAULT 0.50,
    notes text,
    is_active boolean DEFAULT true,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_trade_in_prices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_trade_in_prices IS 'Base trade-in pricing for device models';


--
-- Name: lats_trade_in_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_trade_in_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_trade_in_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_trade_in_settings IS 'Settings and configuration for trade-in system';


--
-- Name: lats_trade_in_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lats_trade_in_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_number text NOT NULL,
    customer_id uuid NOT NULL,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    device_name text NOT NULL,
    device_model text NOT NULL,
    device_imei text,
    device_serial_number text,
    base_trade_in_price numeric DEFAULT 0 NOT NULL,
    condition_rating text NOT NULL,
    condition_multiplier numeric DEFAULT 1.0 NOT NULL,
    condition_description text,
    total_damage_deductions numeric DEFAULT 0,
    damage_items jsonb,
    final_trade_in_value numeric DEFAULT 0 NOT NULL,
    new_product_id uuid,
    new_variant_id uuid,
    new_device_price numeric,
    customer_payment_amount numeric DEFAULT 0,
    contract_id uuid,
    contract_signed boolean DEFAULT false,
    contract_signed_at timestamp with time zone,
    customer_signature_data text,
    staff_signature_data text,
    customer_id_number text,
    customer_id_type text,
    customer_id_photo_url text,
    device_photos jsonb,
    status text DEFAULT 'pending'::text,
    inventory_item_id uuid,
    needs_repair boolean DEFAULT false,
    repair_status text,
    repair_cost numeric DEFAULT 0,
    ready_for_resale boolean DEFAULT false,
    resale_price numeric,
    sale_id uuid,
    created_by uuid,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    staff_notes text,
    internal_notes text
);


--
-- Name: TABLE lats_trade_in_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_trade_in_transactions IS 'Records of device trade-in transactions';


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    leave_type character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_days integer NOT NULL,
    reason text NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    attachment_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: loyalty_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    branch_id uuid,
    points numeric DEFAULT 0 NOT NULL,
    points_type text NOT NULL,
    reason text,
    reference_id uuid,
    reference_type text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT loyalty_points_points_type_check CHECK ((points_type = ANY (ARRAY['earned'::text, 'purchased'::text, 'redeemed'::text, 'expired'::text, 'adjusted'::text])))
);


--
-- Name: TABLE loyalty_points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.loyalty_points IS 'Customer loyalty points tracking';


--
-- Name: mobile_money_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobile_money_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    transaction_type text NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency text DEFAULT 'TZS'::text,
    sender_phone text,
    sender_name text,
    receiver_phone text,
    receiver_name text,
    bank_name text,
    bank_account text,
    reference_number text,
    balance_after numeric(15,2),
    fees numeric(15,2) DEFAULT 0,
    tax numeric(15,2) DEFAULT 0,
    message_body text,
    message_date timestamp with time zone,
    customer_id uuid,
    payment_transaction_id uuid,
    is_processed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    branch_id uuid
);


--
-- Name: TABLE mobile_money_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mobile_money_transactions IS 'Stores mobile money transactions from SMS notifications (TigoPesa, M-Pesa, Airtel Money, etc.)';


--
-- Name: COLUMN mobile_money_transactions.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mobile_money_transactions.branch_id IS 'Branch ID for data isolation';


--
-- Name: paragraphs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paragraphs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    note_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_interests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_interests (
    interest_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    product_category text,
    product_name text,
    interest_level text,
    first_mentioned timestamp without time zone,
    last_mentioned timestamp without time zone,
    mention_count integer DEFAULT 1
);


--
-- Name: product_interests_interest_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_interests_interest_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_interests_interest_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_interests_interest_id_seq OWNED BY public.product_interests.interest_id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    branch_id uuid,
    order_number text,
    total_amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text,
    expected_delivery_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: quality_check_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_check_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quality_check_id uuid,
    check_item_id uuid,
    result boolean,
    numeric_value numeric(10,2),
    text_value text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: quality_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid,
    template_id text,
    status text DEFAULT 'in_progress'::text,
    checked_by uuid,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    is_shared boolean DEFAULT false,
    CONSTRAINT quality_checks_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: recurring_expense_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_expense_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recurring_expense_id uuid NOT NULL,
    transaction_id uuid,
    processed_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    status text DEFAULT 'processed'::text NOT NULL,
    failure_reason text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT recurring_expense_history_status_check CHECK ((status = ANY (ARRAY['processed'::text, 'failed'::text, 'skipped'::text, 'pending'::text])))
);


--
-- Name: recurring_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    account_id uuid NOT NULL,
    category text NOT NULL,
    amount numeric(15,2) NOT NULL,
    frequency text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    next_due_date date NOT NULL,
    last_processed_date date,
    vendor_name text,
    reference_prefix text,
    auto_process boolean DEFAULT true,
    is_active boolean DEFAULT true,
    notification_days_before integer DEFAULT 3,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    branch_id uuid,
    is_shared boolean DEFAULT false,
    CONSTRAINT recurring_expenses_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT recurring_expenses_frequency_check CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text])))
);


--
-- Name: TABLE recurring_expenses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.recurring_expenses IS 'Recurring/scheduled expense definitions';


--
-- Name: COLUMN recurring_expenses.frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.recurring_expenses.frequency IS 'How often the expense recurs: daily, weekly, monthly, yearly';


--
-- Name: COLUMN recurring_expenses.next_due_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.recurring_expenses.next_due_date IS 'Next date when this expense should be processed';


--
-- Name: COLUMN recurring_expenses.auto_process; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.recurring_expenses.auto_process IS 'If true, expense is automatically created; if false, only notification is sent';


--
-- Name: reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    date date NOT NULL,
    "time" time without time zone NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notify_before integer DEFAULT 30,
    related_to jsonb,
    assigned_to uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    branch_id uuid,
    recurring jsonb,
    CONSTRAINT reminders_category_check CHECK ((category = ANY (ARRAY['general'::text, 'device'::text, 'customer'::text, 'appointment'::text, 'payment'::text, 'other'::text]))),
    CONSTRAINT reminders_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT reminders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: report_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size integer,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE report_attachments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_attachments IS 'Table for storing file attachments related to reports';


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    report_type character varying(50) NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying,
    status character varying(20) DEFAULT 'open'::character varying,
    created_by uuid,
    branch_id uuid,
    assigned_to uuid,
    customer_name character varying(255),
    customer_phone character varying(20),
    contact_method character varying(20),
    device_info text,
    issue_category character varying(100),
    resolution_status character varying(20),
    transaction_amount numeric(12,2),
    transaction_type character varying(50),
    payment_method character varying(50),
    product_info text,
    quantity_affected integer,
    stock_level integer,
    location character varying(255),
    occurred_at timestamp with time zone,
    tags text[] DEFAULT '{}'::text[],
    follow_up_required boolean DEFAULT false,
    follow_up_date timestamp with time zone,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reports_contact_method_check CHECK (((contact_method)::text = ANY (ARRAY[('call'::character varying)::text, ('whatsapp'::character varying)::text, ('sms'::character varying)::text, ('in-person'::character varying)::text]))),
    CONSTRAINT reports_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text, ('urgent'::character varying)::text]))),
    CONSTRAINT reports_resolution_status_check CHECK (((resolution_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in-progress'::character varying)::text, ('resolved'::character varying)::text, ('escalated'::character varying)::text]))),
    CONSTRAINT reports_status_check CHECK (((status)::text = ANY (ARRAY[('open'::character varying)::text, ('in-progress'::character varying)::text, ('resolved'::character varying)::text, ('closed'::character varying)::text])))
);


--
-- Name: TABLE reports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reports IS 'Main table for storing all types of reports and incidents';


--
-- Name: COLUMN reports.report_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reports.report_type IS 'Type of report: customer-call, whatsapp-inquiry, device-repair, etc.';


--
-- Name: COLUMN reports.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reports.priority IS 'Priority level: low, medium, high, urgent';


--
-- Name: COLUMN reports.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reports.status IS 'Current status: open, in-progress, resolved, closed';


--
-- Name: COLUMN reports.contact_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reports.contact_method IS 'How the customer contacted: call, whatsapp, sms, in-person';


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    branch_id uuid,
    total_amount numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    payment_method text,
    status text DEFAULT 'completed'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sales_pipeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_pipeline (
    sale_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    product text,
    quoted_price numeric(10,2),
    stage text DEFAULT 'inquiry'::text,
    probability integer DEFAULT 0,
    expected_close_date date,
    actual_close_date date,
    sale_amount numeric(10,2),
    status text DEFAULT 'open'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sales_pipeline_sale_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_pipeline_sale_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_pipeline_sale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_pipeline_sale_id_seq OWNED BY public.sales_pipeline.sale_id;


--
-- Name: scheduled_transfer_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_transfer_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scheduled_transfer_id uuid NOT NULL,
    execution_date timestamp with time zone DEFAULT now(),
    amount numeric(15,2) NOT NULL,
    status character varying(20) NOT NULL,
    source_transaction_id uuid,
    destination_transaction_id uuid,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT scheduled_transfer_executions_status_check CHECK (((status)::text = ANY (ARRAY[('success'::character varying)::text, ('failed'::character varying)::text, ('pending'::character varying)::text, ('skipped'::character varying)::text])))
);


--
-- Name: TABLE scheduled_transfer_executions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scheduled_transfer_executions IS 'Logs execution history of scheduled transfers';


--
-- Name: scheduled_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_account_id uuid NOT NULL,
    destination_account_id uuid NOT NULL,
    amount numeric(15,2) NOT NULL,
    description text NOT NULL,
    reference_prefix character varying(50) DEFAULT 'SCHED-TRF'::character varying,
    frequency character varying(20) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    next_execution_date date NOT NULL,
    last_executed_date date,
    auto_execute boolean DEFAULT true,
    notification_enabled boolean DEFAULT true,
    notification_days_before integer DEFAULT 1,
    is_active boolean DEFAULT true,
    execution_count integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT scheduled_transfers_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT scheduled_transfers_frequency_check CHECK (((frequency)::text = ANY (ARRAY[('daily'::character varying)::text, ('weekly'::character varying)::text, ('biweekly'::character varying)::text, ('monthly'::character varying)::text, ('quarterly'::character varying)::text, ('yearly'::character varying)::text])))
);


--
-- Name: TABLE scheduled_transfers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scheduled_transfers IS 'Stores recurring scheduled transfers between accounts';


--
-- Name: shelves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shelves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    storage_room_id uuid,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    row_number integer,
    column_number integer,
    capacity integer,
    is_refrigerated boolean DEFAULT false,
    requires_ladder boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE shelves; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.shelves IS 'Individual shelves within storage rooms';


--
-- Name: shift_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    break_duration_minutes integer DEFAULT 0,
    monday boolean DEFAULT true,
    tuesday boolean DEFAULT true,
    wednesday boolean DEFAULT true,
    thursday boolean DEFAULT true,
    friday boolean DEFAULT true,
    saturday boolean DEFAULT false,
    sunday boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: special_order_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.special_order_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    special_order_id uuid,
    customer_id uuid,
    amount numeric NOT NULL,
    payment_method text NOT NULL,
    payment_date timestamp with time zone DEFAULT now(),
    reference_number text,
    account_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    branch_id uuid
);


--
-- Name: TABLE special_order_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.special_order_payments IS 'Payments made towards special orders';


--
-- Name: COLUMN special_order_payments.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.special_order_payments.branch_id IS 'Branch ID for data isolation';


--
-- Name: storage_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    store_location_id uuid,
    floor_level integer DEFAULT 1,
    area_sqm numeric(10,2),
    is_secure boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE storage_rooms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.storage_rooms IS 'Physical storage rooms in store locations';


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    company_name text,
    phone text,
    email text,
    address text,
    city text,
    country text,
    tax_id text,
    payment_terms text,
    credit_limit numeric(15,2) DEFAULT 0,
    current_balance numeric(15,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    rating integer DEFAULT 5,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_branch_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_branch_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    can_manage boolean DEFAULT false,
    can_view_reports boolean DEFAULT false,
    can_manage_inventory boolean DEFAULT false,
    can_manage_staff boolean DEFAULT false,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    full_name text,
    role text DEFAULT 'user'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    username text,
    permissions text[] DEFAULT ARRAY['all'::text],
    max_devices_allowed integer DEFAULT 1000,
    require_approval boolean DEFAULT false,
    failed_login_attempts integer DEFAULT 0,
    two_factor_enabled boolean DEFAULT false,
    two_factor_secret text,
    last_login timestamp with time zone,
    phone text,
    department text,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);


--
-- Name: COLUMN users.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.branch_id IS 'References the branch this user/technician belongs to for multi-branch isolation';


--
-- Name: v_has_payment_method_column; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.v_has_payment_method_column (
    "exists" boolean
);


--
-- Name: webhook_endpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_endpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    url text NOT NULL,
    events text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    secret text NOT NULL,
    retry_attempts integer DEFAULT 3,
    timeout_seconds integer DEFAULT 30,
    last_triggered timestamp with time zone,
    success_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_id uuid,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    response_status integer,
    response_body text,
    error_message text,
    attempt_number integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: buyer_details buyer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_details ALTER COLUMN buyer_id SET DEFAULT nextval('public.buyer_details_buyer_id_seq'::regclass);


--
-- Name: communication_log log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_log ALTER COLUMN log_id SET DEFAULT nextval('public.communication_log_log_id_seq'::regclass);


--
-- Name: customer_fix_backup backup_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_fix_backup ALTER COLUMN backup_id SET DEFAULT nextval('public.customer_fix_backup_backup_id_seq'::regclass);


--
-- Name: product_interests interest_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_interests ALTER COLUMN interest_id SET DEFAULT nextval('public.product_interests_interest_id_seq'::regclass);


--
-- Name: sales_pipeline sale_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_pipeline ALTER COLUMN sale_id SET DEFAULT nextval('public.sales_pipeline_sale_id_seq'::regclass);


--
-- Name: whatsapp_customers customer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_customers ALTER COLUMN customer_id SET DEFAULT nextval('public.customers_customer_id_seq'::regclass);


--
-- Name: api_keys api_keys_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_key UNIQUE (key);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: api_request_logs api_request_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_request_logs
    ADD CONSTRAINT api_request_logs_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_employee_id_attendance_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_attendance_date_key UNIQUE (employee_id, attendance_date);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: auto_reorder_log auto_reorder_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_reorder_log
    ADD CONSTRAINT auto_reorder_log_pkey PRIMARY KEY (id);


--
-- Name: backup_logs backup_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_logs
    ADD CONSTRAINT backup_logs_pkey PRIMARY KEY (id);


--
-- Name: branch_activity_log branch_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_activity_log
    ADD CONSTRAINT branch_activity_log_pkey PRIMARY KEY (id);


--
-- Name: branch_transfers branch_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT branch_transfers_pkey PRIMARY KEY (id);


--
-- Name: buyer_details buyer_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_details
    ADD CONSTRAINT buyer_details_pkey PRIMARY KEY (buyer_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: communication_log communication_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_pkey PRIMARY KEY (log_id);


--
-- Name: customer_fix_backup customer_fix_backup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_fix_backup
    ADD CONSTRAINT customer_fix_backup_pkey PRIMARY KEY (backup_id);


--
-- Name: customer_installment_plan_payments customer_installment_plan_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plan_payments
    ADD CONSTRAINT customer_installment_plan_payments_pkey PRIMARY KEY (id);


--
-- Name: customer_installment_plans customer_installment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plans
    ADD CONSTRAINT customer_installment_plans_pkey PRIMARY KEY (id);


--
-- Name: customer_installment_plans customer_installment_plans_plan_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plans
    ADD CONSTRAINT customer_installment_plans_plan_number_key UNIQUE (plan_number);


--
-- Name: customer_messages customer_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_pkey PRIMARY KEY (id);


--
-- Name: customer_points_history customer_points_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_points_history
    ADD CONSTRAINT customer_points_history_pkey PRIMARY KEY (id);


--
-- Name: customer_special_orders customer_special_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_special_orders
    ADD CONSTRAINT customer_special_orders_order_number_key UNIQUE (order_number);


--
-- Name: customer_special_orders customer_special_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_special_orders
    ADD CONSTRAINT customer_special_orders_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- Name: daily_opening_sessions daily_opening_sessions_date_is_active_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_opening_sessions
    ADD CONSTRAINT daily_opening_sessions_date_is_active_key UNIQUE (date, is_active);


--
-- Name: daily_opening_sessions daily_opening_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_opening_sessions
    ADD CONSTRAINT daily_opening_sessions_pkey PRIMARY KEY (id);


--
-- Name: daily_reports daily_reports_employee_id_report_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_employee_id_report_date_key UNIQUE (user_id, report_date);


--
-- Name: daily_reports daily_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);


--
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- Name: employee_shifts employee_shifts_employee_id_shift_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shifts
    ADD CONSTRAINT employee_shifts_employee_id_shift_date_key UNIQUE (employee_id, shift_date);


--
-- Name: employee_shifts employee_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shifts
    ADD CONSTRAINT employee_shifts_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_name_key UNIQUE (name);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: imei_validation imei_validation_imei_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imei_validation
    ADD CONSTRAINT imei_validation_imei_key UNIQUE (imei);


--
-- Name: imei_validation imei_validation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imei_validation
    ADD CONSTRAINT imei_validation_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: lats_branches lats_branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_branches
    ADD CONSTRAINT lats_branches_pkey PRIMARY KEY (id);


--
-- Name: lats_customers lats_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_customers
    ADD CONSTRAINT lats_customers_pkey PRIMARY KEY (id);


--
-- Name: lats_data_audit_log lats_data_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_data_audit_log
    ADD CONSTRAINT lats_data_audit_log_pkey PRIMARY KEY (id);


--
-- Name: lats_employees lats_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_employees
    ADD CONSTRAINT lats_employees_pkey PRIMARY KEY (id);


--
-- Name: lats_inventory_items lats_inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_integrations_settings lats_pos_integrations_setting_user_id_business_id_integrati_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_integrations_settings
    ADD CONSTRAINT lats_pos_integrations_setting_user_id_business_id_integrati_key UNIQUE (user_id, business_id, integration_name);


--
-- Name: lats_pos_integrations_settings lats_pos_integrations_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_integrations_settings
    ADD CONSTRAINT lats_pos_integrations_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_product_units lats_product_units_imei_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_units
    ADD CONSTRAINT lats_product_units_imei_key UNIQUE (imei);


--
-- Name: lats_product_units lats_product_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_units
    ADD CONSTRAINT lats_product_units_pkey PRIMARY KEY (id);


--
-- Name: lats_purchase_order_audit_log lats_purchase_order_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_audit_log
    ADD CONSTRAINT lats_purchase_order_audit_log_pkey PRIMARY KEY (id);


--
-- Name: lats_purchase_order_payments lats_purchase_order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_payments
    ADD CONSTRAINT lats_purchase_order_payments_pkey PRIMARY KEY (id);


--
-- Name: lats_purchase_order_shipping lats_purchase_order_shipping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_shipping
    ADD CONSTRAINT lats_purchase_order_shipping_pkey PRIMARY KEY (id);


--
-- Name: lats_shipping_agents lats_shipping_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_agents
    ADD CONSTRAINT lats_shipping_agents_pkey PRIMARY KEY (id);


--
-- Name: lats_shipping_methods lats_shipping_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_methods
    ADD CONSTRAINT lats_shipping_methods_code_key UNIQUE (code);


--
-- Name: lats_shipping_methods lats_shipping_methods_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_methods
    ADD CONSTRAINT lats_shipping_methods_name_key UNIQUE (name);


--
-- Name: lats_shipping_methods lats_shipping_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_methods
    ADD CONSTRAINT lats_shipping_methods_pkey PRIMARY KEY (id);


--
-- Name: lats_shipping lats_shipping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping
    ADD CONSTRAINT lats_shipping_pkey PRIMARY KEY (id);


--
-- Name: lats_stock_transfers lats_stock_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_pkey PRIMARY KEY (id);


--
-- Name: lats_stock_transfers lats_stock_transfers_transfer_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_transfer_number_key UNIQUE (transfer_number);


--
-- Name: lats_store_rooms lats_store_rooms_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_rooms
    ADD CONSTRAINT lats_store_rooms_name_key UNIQUE (name);


--
-- Name: lats_store_rooms lats_store_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_rooms
    ADD CONSTRAINT lats_store_rooms_pkey PRIMARY KEY (id);


--
-- Name: lats_supplier_categories lats_supplier_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_categories
    ADD CONSTRAINT lats_supplier_categories_name_key UNIQUE (name);


--
-- Name: lats_supplier_categories lats_supplier_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_categories
    ADD CONSTRAINT lats_supplier_categories_pkey PRIMARY KEY (id);


--
-- Name: lats_supplier_category_mapping lats_supplier_category_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_category_mapping
    ADD CONSTRAINT lats_supplier_category_mapping_pkey PRIMARY KEY (supplier_id, category_id);


--
-- Name: lats_supplier_communications lats_supplier_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_communications
    ADD CONSTRAINT lats_supplier_communications_pkey PRIMARY KEY (id);


--
-- Name: lats_supplier_contracts lats_supplier_contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_contracts
    ADD CONSTRAINT lats_supplier_contracts_contract_number_key UNIQUE (contract_number);


--
-- Name: lats_supplier_contracts lats_supplier_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_contracts
    ADD CONSTRAINT lats_supplier_contracts_pkey PRIMARY KEY (id);


--
-- Name: lats_supplier_documents lats_supplier_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_documents
    ADD CONSTRAINT lats_supplier_documents_pkey PRIMARY KEY (id);


--
-- Name: lats_supplier_ratings lats_supplier_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_ratings
    ADD CONSTRAINT lats_supplier_ratings_pkey PRIMARY KEY (id);


--
-- Name: lats_supplier_tag_mapping lats_supplier_tag_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_tag_mapping
    ADD CONSTRAINT lats_supplier_tag_mapping_pkey PRIMARY KEY (supplier_id, tag_id);


--
-- Name: lats_supplier_tags lats_supplier_tags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_tags
    ADD CONSTRAINT lats_supplier_tags_name_key UNIQUE (name);


--
-- Name: lats_supplier_tags lats_supplier_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_tags
    ADD CONSTRAINT lats_supplier_tags_pkey PRIMARY KEY (id);


--
-- Name: lats_trade_in_contracts lats_trade_in_contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_contract_number_key UNIQUE (contract_number);


--
-- Name: lats_trade_in_contracts lats_trade_in_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_pkey PRIMARY KEY (id);


--
-- Name: lats_trade_in_damage_assessments lats_trade_in_damage_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_damage_assessments
    ADD CONSTRAINT lats_trade_in_damage_assessments_pkey PRIMARY KEY (id);


--
-- Name: lats_trade_in_prices lats_trade_in_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_pkey PRIMARY KEY (id);


--
-- Name: lats_trade_in_settings lats_trade_in_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_settings
    ADD CONSTRAINT lats_trade_in_settings_key_key UNIQUE (key);


--
-- Name: lats_trade_in_settings lats_trade_in_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_settings
    ADD CONSTRAINT lats_trade_in_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_pkey PRIMARY KEY (id);


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_transaction_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_transaction_number_key UNIQUE (transaction_number);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: loyalty_points loyalty_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_pkey PRIMARY KEY (id);


--
-- Name: mobile_money_transactions mobile_money_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_money_transactions
    ADD CONSTRAINT mobile_money_transactions_pkey PRIMARY KEY (id);


--
-- Name: paragraphs paragraphs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paragraphs
    ADD CONSTRAINT paragraphs_pkey PRIMARY KEY (id);


--
-- Name: product_interests product_interests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_interests
    ADD CONSTRAINT product_interests_pkey PRIMARY KEY (interest_id);


--
-- Name: purchase_orders purchase_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_order_number_key UNIQUE (order_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: quality_check_results quality_check_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_check_results
    ADD CONSTRAINT quality_check_results_pkey PRIMARY KEY (id);


--
-- Name: quality_checks quality_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_pkey PRIMARY KEY (id);


--
-- Name: recurring_expense_history recurring_expense_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expense_history
    ADD CONSTRAINT recurring_expense_history_pkey PRIMARY KEY (id);


--
-- Name: recurring_expenses recurring_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_pkey PRIMARY KEY (id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: report_attachments report_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_attachments
    ADD CONSTRAINT report_attachments_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: sales_pipeline sales_pipeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_pipeline
    ADD CONSTRAINT sales_pipeline_pkey PRIMARY KEY (sale_id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: scheduled_transfer_executions scheduled_transfer_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfer_executions
    ADD CONSTRAINT scheduled_transfer_executions_pkey PRIMARY KEY (id);


--
-- Name: scheduled_transfers scheduled_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfers
    ADD CONSTRAINT scheduled_transfers_pkey PRIMARY KEY (id);


--
-- Name: shelves shelves_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelves
    ADD CONSTRAINT shelves_code_key UNIQUE (code);


--
-- Name: shelves shelves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelves
    ADD CONSTRAINT shelves_pkey PRIMARY KEY (id);


--
-- Name: shift_templates shift_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_templates
    ADD CONSTRAINT shift_templates_pkey PRIMARY KEY (id);


--
-- Name: special_order_payments special_order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.special_order_payments
    ADD CONSTRAINT special_order_payments_pkey PRIMARY KEY (id);


--
-- Name: storage_rooms storage_rooms_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_rooms
    ADD CONSTRAINT storage_rooms_code_key UNIQUE (code);


--
-- Name: storage_rooms storage_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_rooms
    ADD CONSTRAINT storage_rooms_pkey PRIMARY KEY (id);


--
-- Name: store_locations store_locations_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_locations
    ADD CONSTRAINT store_locations_code_key UNIQUE (code);


--
-- Name: store_locations store_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_locations
    ADD CONSTRAINT store_locations_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: user_branch_assignments user_branch_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_pkey PRIMARY KEY (id);


--
-- Name: user_branch_assignments user_branch_assignments_user_id_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_user_id_branch_id_key UNIQUE (user_id, branch_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_endpoints webhook_endpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_api_keys_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_active ON public.api_keys USING btree (is_active);


--
-- Name: idx_api_keys_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_key ON public.api_keys USING btree (key);


--
-- Name: idx_api_keys_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_user ON public.api_keys USING btree (user_id);


--
-- Name: idx_api_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_created ON public.api_request_logs USING btree (created_at);


--
-- Name: idx_api_logs_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_ip ON public.api_request_logs USING btree (ip_address);


--
-- Name: idx_api_logs_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_key ON public.api_request_logs USING btree (api_key_id);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_date ON public.attendance_records USING btree (attendance_date);


--
-- Name: idx_attendance_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_employee_date ON public.attendance_records USING btree (employee_id, attendance_date);


--
-- Name: idx_attendance_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_employee_id ON public.attendance_records USING btree (employee_id);


--
-- Name: idx_attendance_records_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_records_branch_id ON public.attendance_records USING btree (branch_id);


--
-- Name: idx_attendance_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_status ON public.attendance_records USING btree (status);


--
-- Name: idx_audit_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created ON public.lats_data_audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.lats_purchase_order_audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_po_id ON public.lats_purchase_order_audit_log USING btree (purchase_order_id);


--
-- Name: idx_audit_log_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_record ON public.lats_data_audit_log USING btree (table_name, record_id);


--
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user_id ON public.lats_purchase_order_audit_log USING btree (user_id);


--
-- Name: idx_auto_reorder_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_reorder_log_created ON public.auto_reorder_log USING btree (created_at DESC);


--
-- Name: idx_auto_reorder_log_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_reorder_log_po ON public.auto_reorder_log USING btree (purchase_order_id);


--
-- Name: idx_backup_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_logs_created_at ON public.backup_logs USING btree (created_at);


--
-- Name: idx_backup_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_logs_status ON public.backup_logs USING btree (status);


--
-- Name: idx_backup_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_logs_type ON public.backup_logs USING btree (backup_type);


--
-- Name: idx_branch_activity_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_activity_branch ON public.branch_activity_log USING btree (branch_id);


--
-- Name: idx_branch_activity_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_activity_created ON public.branch_activity_log USING btree (created_at);


--
-- Name: idx_branch_activity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_activity_type ON public.branch_activity_log USING btree (action_type);


--
-- Name: idx_branch_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_activity_user ON public.branch_activity_log USING btree (user_id);


--
-- Name: idx_branch_transfers_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_transfers_created ON public.branch_transfers USING btree (created_at DESC);


--
-- Name: idx_branch_transfers_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_transfers_entity ON public.branch_transfers USING btree (entity_id);


--
-- Name: idx_branch_transfers_from_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_transfers_from_branch ON public.branch_transfers USING btree (from_branch_id);


--
-- Name: idx_branch_transfers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_transfers_status ON public.branch_transfers USING btree (status);


--
-- Name: idx_branch_transfers_to_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_transfers_to_branch ON public.branch_transfers USING btree (to_branch_id);


--
-- Name: idx_branch_transfers_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_transfers_type ON public.branch_transfers USING btree (transfer_type);


--
-- Name: idx_buyer_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_score ON public.buyer_details USING btree (buying_score DESC);


--
-- Name: idx_buyer_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_tier ON public.buyer_details USING btree (buyer_tier);


--
-- Name: idx_comm_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comm_date ON public.communication_log USING btree (contact_date);


--
-- Name: idx_cust_inst_payments_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cust_inst_payments_customer ON public.customer_installment_plan_payments USING btree (customer_id);


--
-- Name: idx_cust_inst_payments_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cust_inst_payments_plan ON public.customer_installment_plan_payments USING btree (installment_plan_id);


--
-- Name: idx_customer_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_buyer ON public.whatsapp_customers USING btree (is_buyer);


--
-- Name: idx_customer_engagement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_engagement ON public.whatsapp_customers USING btree (engagement_level);


--
-- Name: idx_customer_messages_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_messages_branch_id ON public.customer_messages USING btree (branch_id);


--
-- Name: idx_customer_messages_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_messages_channel ON public.customer_messages USING btree (channel);


--
-- Name: idx_customer_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_messages_created_at ON public.customer_messages USING btree (created_at DESC);


--
-- Name: idx_customer_messages_customer_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_messages_customer_created ON public.customer_messages USING btree (customer_id, created_at DESC);


--
-- Name: idx_customer_messages_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_messages_customer_id ON public.customer_messages USING btree (customer_id);


--
-- Name: idx_customer_messages_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_messages_shared ON public.customer_messages USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_customer_messages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_messages_status ON public.customer_messages USING btree (status);


--
-- Name: idx_customer_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_phone ON public.whatsapp_customers USING btree (phone_number);


--
-- Name: idx_customer_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_status ON public.whatsapp_customers USING btree (status);


--
-- Name: idx_customers_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_branch ON public.lats_customers USING btree (branch_id);


--
-- Name: idx_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_email ON public.lats_customers USING btree (email);


--
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_phone ON public.lats_customers USING btree (phone);


--
-- Name: idx_daily_opening_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_opening_sessions_active ON public.daily_opening_sessions USING btree (is_active);


--
-- Name: idx_daily_opening_sessions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_opening_sessions_date ON public.daily_opening_sessions USING btree (date);


--
-- Name: idx_daily_opening_sessions_opened_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_opening_sessions_opened_at ON public.daily_opening_sessions USING btree (opened_at);


--
-- Name: idx_daily_opening_sessions_opened_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_opening_sessions_opened_by ON public.daily_opening_sessions USING btree (opened_by_user_id);


--
-- Name: idx_daily_reports_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_reports_branch ON public.daily_reports USING btree (branch_id);


--
-- Name: idx_daily_reports_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_reports_branch_id ON public.daily_reports USING btree (branch_id);


--
-- Name: idx_daily_reports_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_reports_date ON public.daily_reports USING btree (report_date);


--
-- Name: idx_daily_reports_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_reports_employee_date ON public.daily_reports USING btree (user_id, report_date);


--
-- Name: idx_daily_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_reports_status ON public.daily_reports USING btree (status);


--
-- Name: idx_document_templates_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_templates_default ON public.document_templates USING btree (is_default);


--
-- Name: idx_document_templates_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_templates_type ON public.document_templates USING btree (type);


--
-- Name: idx_document_templates_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_templates_user ON public.document_templates USING btree (user_id);


--
-- Name: idx_expenses_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_branch_id ON public.expenses USING btree (branch_id);


--
-- Name: idx_expenses_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_category ON public.expenses USING btree (category);


--
-- Name: idx_expenses_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_created_by ON public.expenses USING btree (created_by);


--
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_date ON public.expenses USING btree (date);


--
-- Name: idx_expenses_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_product_id ON public.expenses USING btree (product_id);


--
-- Name: idx_expenses_purchase_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_purchase_order_id ON public.expenses USING btree (purchase_order_id);


--
-- Name: idx_expenses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_status ON public.expenses USING btree (status);


--
-- Name: idx_imei_validation_imei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imei_validation_imei ON public.imei_validation USING btree (imei);


--
-- Name: idx_imei_validation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imei_validation_status ON public.imei_validation USING btree (imei_status);


--
-- Name: idx_installment_plans_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installment_plans_branch ON public.customer_installment_plans USING btree (branch_id);


--
-- Name: idx_installment_plans_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installment_plans_customer ON public.customer_installment_plans USING btree (customer_id);


--
-- Name: idx_installment_plans_next_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installment_plans_next_payment ON public.customer_installment_plans USING btree (next_payment_date);


--
-- Name: idx_installment_plans_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installment_plans_sale ON public.customer_installment_plans USING btree (sale_id);


--
-- Name: idx_installment_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installment_plans_status ON public.customer_installment_plans USING btree (status);


--
-- Name: idx_integrations_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_business_id ON public.lats_pos_integrations_settings USING btree (business_id);


--
-- Name: idx_integrations_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_enabled ON public.lats_pos_integrations_settings USING btree (is_enabled) WHERE (is_enabled = true);


--
-- Name: idx_integrations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_type ON public.lats_pos_integrations_settings USING btree (integration_type);


--
-- Name: idx_integrations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_user_id ON public.lats_pos_integrations_settings USING btree (user_id);


--
-- Name: idx_inventory_items_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_items_barcode ON public.lats_inventory_items USING btree (barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_inventory_items_imei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_items_imei ON public.lats_inventory_items USING btree (imei) WHERE (imei IS NOT NULL);


--
-- Name: idx_inventory_items_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_items_po ON public.lats_inventory_items USING btree (purchase_order_id);


--
-- Name: idx_inventory_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_items_product ON public.lats_inventory_items USING btree (product_id);


--
-- Name: idx_inventory_items_serial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_items_serial ON public.lats_inventory_items USING btree (serial_number) WHERE (serial_number IS NOT NULL);


--
-- Name: idx_inventory_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_items_status ON public.lats_inventory_items USING btree (status);


--
-- Name: idx_inventory_items_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_items_variant ON public.lats_inventory_items USING btree (variant_id);


--
-- Name: idx_lats_customers_birthday; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_customers_birthday ON public.lats_customers USING btree (birthday);


--
-- Name: idx_lats_customers_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_customers_branch ON public.lats_customers USING btree (branch_id);


--
-- Name: idx_lats_customers_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_customers_created_at ON public.lats_customers USING btree (created_at);


--
-- Name: idx_lats_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_customers_email ON public.lats_customers USING btree (email);


--
-- Name: idx_lats_customers_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_customers_is_active ON public.lats_customers USING btree (is_active);


--
-- Name: idx_lats_customers_is_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_customers_is_shared ON public.lats_customers USING btree (is_shared);


--
-- Name: idx_lats_customers_last_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_customers_last_visit ON public.lats_customers USING btree (last_visit);


--
-- Name: idx_lats_customers_loyalty_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_customers_loyalty_level ON public.lats_customers USING btree (loyalty_level);


--
-- Name: idx_lats_customers_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_customers_phone ON public.lats_customers USING btree (phone);


--
-- Name: idx_lats_customers_referred_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_customers_referred_by ON public.lats_customers USING btree (referred_by);


--
-- Name: idx_lats_customers_sharing_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_customers_sharing_mode ON public.lats_customers USING btree (sharing_mode);


--
-- Name: idx_lats_customers_whatsapp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_customers_whatsapp ON public.lats_customers USING btree (whatsapp);


--
-- Name: idx_lats_inventory_items_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_inventory_items_branch ON public.lats_inventory_items USING btree (branch_id);


--
-- Name: idx_lats_inventory_items_storage_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_inventory_items_storage_room ON public.lats_inventory_items USING btree (storage_room_id);


--
-- Name: idx_lats_purchase_order_payments_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_purchase_order_payments_branch_id ON public.lats_purchase_order_payments USING btree (branch_id);


--
-- Name: idx_lats_stock_transfers_from_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_stock_transfers_from_branch ON public.lats_stock_transfers USING btree (from_branch_id);


--
-- Name: idx_lats_stock_transfers_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_stock_transfers_product ON public.lats_stock_transfers USING btree (product_id);


--
-- Name: idx_lats_stock_transfers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_stock_transfers_status ON public.lats_stock_transfers USING btree (status);


--
-- Name: idx_lats_stock_transfers_to_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_stock_transfers_to_branch ON public.lats_stock_transfers USING btree (to_branch_id);


--
-- Name: idx_lats_stock_transfers_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_stock_transfers_variant ON public.lats_stock_transfers USING btree (variant_id);


--
-- Name: idx_lats_store_rooms_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_store_rooms_code ON public.lats_store_rooms USING btree (code);


--
-- Name: idx_lats_store_rooms_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_store_rooms_is_active ON public.lats_store_rooms USING btree (is_active);


--
-- Name: idx_lats_store_rooms_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lats_store_rooms_location_id ON public.lats_store_rooms USING btree (store_location_id);


--
-- Name: idx_leave_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_dates ON public.leave_requests USING btree (start_date, end_date);


--
-- Name: idx_leave_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_employee_id ON public.leave_requests USING btree (employee_id);


--
-- Name: idx_leave_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_status ON public.leave_requests USING btree (status);


--
-- Name: idx_loyalty_points_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_points_branch ON public.loyalty_points USING btree (branch_id);


--
-- Name: idx_loyalty_points_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_points_created_at ON public.loyalty_points USING btree (created_at);


--
-- Name: idx_loyalty_points_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_points_customer ON public.loyalty_points USING btree (customer_id);


--
-- Name: idx_loyalty_points_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_points_type ON public.loyalty_points USING btree (points_type);


--
-- Name: idx_mobile_money_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mobile_money_customer ON public.mobile_money_transactions USING btree (customer_id);


--
-- Name: idx_mobile_money_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mobile_money_date ON public.mobile_money_transactions USING btree (message_date DESC);


--
-- Name: idx_mobile_money_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mobile_money_processed ON public.mobile_money_transactions USING btree (is_processed);


--
-- Name: idx_mobile_money_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mobile_money_provider ON public.mobile_money_transactions USING btree (provider);


--
-- Name: idx_mobile_money_receiver_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mobile_money_receiver_phone ON public.mobile_money_transactions USING btree (receiver_phone);


--
-- Name: idx_mobile_money_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mobile_money_reference ON public.mobile_money_transactions USING btree (reference_number);


--
-- Name: idx_mobile_money_sender_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mobile_money_sender_phone ON public.mobile_money_transactions USING btree (sender_phone);


--
-- Name: idx_mobile_money_transactions_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mobile_money_transactions_branch_id ON public.mobile_money_transactions USING btree (branch_id);


--
-- Name: idx_mobile_money_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mobile_money_type ON public.mobile_money_transactions USING btree (transaction_type);


--
-- Name: idx_po_payments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_payments_date ON public.lats_purchase_order_payments USING btree (payment_date);


--
-- Name: idx_po_payments_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_payments_po ON public.lats_purchase_order_payments USING btree (purchase_order_id);


--
-- Name: idx_po_shipping_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_shipping_agent ON public.lats_purchase_order_shipping USING btree (shipping_agent_id);


--
-- Name: idx_po_shipping_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_shipping_method ON public.lats_purchase_order_shipping USING btree (shipping_method_id);


--
-- Name: idx_po_shipping_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_shipping_order_id ON public.lats_purchase_order_shipping USING btree (purchase_order_id);


--
-- Name: idx_po_shipping_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_shipping_status ON public.lats_purchase_order_shipping USING btree (shipping_status);


--
-- Name: idx_po_shipping_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_shipping_tracking ON public.lats_purchase_order_shipping USING btree (tracking_number) WHERE (tracking_number IS NOT NULL);


--
-- Name: idx_points_history_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_history_customer_id ON public.customer_points_history USING btree (customer_id);


--
-- Name: idx_product_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_category ON public.product_interests USING btree (product_category);


--
-- Name: idx_quality_checks_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_checks_branch ON public.quality_checks USING btree (branch_id);


--
-- Name: idx_quality_checks_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_checks_shared ON public.quality_checks USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_rec_exp_history_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rec_exp_history_date ON public.recurring_expense_history USING btree (processed_date);


--
-- Name: idx_rec_exp_history_recurring; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rec_exp_history_recurring ON public.recurring_expense_history USING btree (recurring_expense_id);


--
-- Name: idx_rec_exp_history_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rec_exp_history_status ON public.recurring_expense_history USING btree (status);


--
-- Name: idx_recurring_exp_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_exp_account ON public.recurring_expenses USING btree (account_id);


--
-- Name: idx_recurring_exp_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_exp_active ON public.recurring_expenses USING btree (is_active);


--
-- Name: idx_recurring_exp_auto_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_exp_auto_process ON public.recurring_expenses USING btree (auto_process);


--
-- Name: idx_recurring_exp_frequency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_exp_frequency ON public.recurring_expenses USING btree (frequency);


--
-- Name: idx_recurring_exp_next_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_exp_next_due ON public.recurring_expenses USING btree (next_due_date);


--
-- Name: idx_recurring_expenses_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_expenses_branch ON public.recurring_expenses USING btree (branch_id);


--
-- Name: idx_recurring_expenses_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_expenses_shared ON public.recurring_expenses USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_reminders_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_assigned_to ON public.reminders USING btree (assigned_to);


--
-- Name: idx_reminders_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_branch_id ON public.reminders USING btree (branch_id);


--
-- Name: idx_reminders_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_category ON public.reminders USING btree (category);


--
-- Name: idx_reminders_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_created_by ON public.reminders USING btree (created_by);


--
-- Name: idx_reminders_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_date ON public.reminders USING btree (date);


--
-- Name: idx_reminders_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_datetime ON public.reminders USING btree (date, "time");


--
-- Name: idx_reminders_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_priority ON public.reminders USING btree (priority);


--
-- Name: idx_reminders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_status ON public.reminders USING btree (status);


--
-- Name: idx_report_attachments_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_attachments_report_id ON public.report_attachments USING btree (report_id);


--
-- Name: idx_reports_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_branch_id ON public.reports USING btree (branch_id);


--
-- Name: idx_reports_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_created_at ON public.reports USING btree (created_at DESC);


--
-- Name: idx_reports_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_created_by ON public.reports USING btree (created_by);


--
-- Name: idx_reports_customer_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_customer_phone ON public.reports USING btree (customer_phone);


--
-- Name: idx_reports_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_priority ON public.reports USING btree (priority);


--
-- Name: idx_reports_report_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_report_type ON public.reports USING btree (report_type);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_status ON public.reports USING btree (status);


--
-- Name: idx_sales_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_stage ON public.sales_pipeline USING btree (stage);


--
-- Name: idx_scheduled_transfer_executions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_transfer_executions_date ON public.scheduled_transfer_executions USING btree (execution_date);


--
-- Name: idx_scheduled_transfer_executions_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_transfer_executions_schedule ON public.scheduled_transfer_executions USING btree (scheduled_transfer_id);


--
-- Name: idx_scheduled_transfer_executions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_transfer_executions_status ON public.scheduled_transfer_executions USING btree (status);


--
-- Name: idx_scheduled_transfers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_transfers_active ON public.scheduled_transfers USING btree (is_active);


--
-- Name: idx_scheduled_transfers_destination_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_transfers_destination_account ON public.scheduled_transfers USING btree (destination_account_id);


--
-- Name: idx_scheduled_transfers_frequency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_transfers_frequency ON public.scheduled_transfers USING btree (frequency);


--
-- Name: idx_scheduled_transfers_next_execution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_transfers_next_execution ON public.scheduled_transfers USING btree (next_execution_date) WHERE (is_active = true);


--
-- Name: idx_scheduled_transfers_source_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_transfers_source_account ON public.scheduled_transfers USING btree (source_account_id);


--
-- Name: idx_shelves_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shelves_code ON public.shelves USING btree (code);


--
-- Name: idx_shelves_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shelves_room ON public.shelves USING btree (storage_room_id);


--
-- Name: idx_shifts_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shifts_date ON public.employee_shifts USING btree (shift_date);


--
-- Name: idx_shifts_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shifts_employee_date ON public.employee_shifts USING btree (employee_id, shift_date);


--
-- Name: idx_shifts_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shifts_employee_id ON public.employee_shifts USING btree (employee_id);


--
-- Name: idx_shipping_agents_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_agents_active ON public.lats_shipping_agents USING btree (is_active);


--
-- Name: idx_shipping_agents_methods; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_agents_methods ON public.lats_shipping_agents USING gin (shipping_methods);


--
-- Name: idx_shipping_agents_preferred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_agents_preferred ON public.lats_shipping_agents USING btree (is_preferred) WHERE (is_preferred = true);


--
-- Name: idx_shipping_methods_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_methods_active ON public.lats_shipping_methods USING btree (is_active);


--
-- Name: idx_shipping_methods_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_methods_code ON public.lats_shipping_methods USING btree (code);


--
-- Name: idx_shipping_purchase_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_purchase_order ON public.lats_shipping USING btree (purchase_order_id);


--
-- Name: idx_shipping_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_status ON public.lats_shipping USING btree (status);


--
-- Name: idx_special_order_payments_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_special_order_payments_branch_id ON public.special_order_payments USING btree (branch_id);


--
-- Name: idx_special_order_payments_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_special_order_payments_order ON public.special_order_payments USING btree (special_order_id);


--
-- Name: idx_special_orders_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_special_orders_branch ON public.customer_special_orders USING btree (branch_id);


--
-- Name: idx_special_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_special_orders_customer ON public.customer_special_orders USING btree (customer_id);


--
-- Name: idx_special_orders_expected_arrival; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_special_orders_expected_arrival ON public.customer_special_orders USING btree (expected_arrival_date);


--
-- Name: idx_special_orders_order_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_special_orders_order_date ON public.customer_special_orders USING btree (order_date);


--
-- Name: idx_special_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_special_orders_status ON public.customer_special_orders USING btree (status);


--
-- Name: idx_storage_rooms_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_rooms_location ON public.storage_rooms USING btree (store_location_id);


--
-- Name: idx_store_locations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_locations_active ON public.store_locations USING btree (is_active);


--
-- Name: idx_store_locations_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_locations_code ON public.store_locations USING btree (code);


--
-- Name: idx_store_locations_is_main; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_locations_is_main ON public.store_locations USING btree (is_main);


--
-- Name: idx_store_locations_isolation_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_locations_isolation_mode ON public.store_locations USING btree (data_isolation_mode);


--
-- Name: idx_store_locations_share_accounts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_locations_share_accounts ON public.store_locations USING btree (share_accounts);


--
-- Name: idx_store_locations_share_inventory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_locations_share_inventory ON public.store_locations USING btree (share_inventory);


--
-- Name: idx_store_locations_share_products; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_locations_share_products ON public.store_locations USING btree (share_products);


--
-- Name: idx_store_rooms_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_rooms_is_active ON public.lats_store_rooms USING btree (is_active);


--
-- Name: idx_supplier_categories_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_categories_parent ON public.lats_supplier_categories USING btree (parent_id) WHERE (parent_id IS NOT NULL);


--
-- Name: idx_supplier_category_mapping_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_category_mapping_category ON public.lats_supplier_category_mapping USING btree (category_id);


--
-- Name: idx_supplier_category_mapping_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_category_mapping_supplier ON public.lats_supplier_category_mapping USING btree (supplier_id);


--
-- Name: idx_supplier_comms_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_comms_date ON public.lats_supplier_communications USING btree (created_at DESC);


--
-- Name: idx_supplier_comms_follow_up; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_comms_follow_up ON public.lats_supplier_communications USING btree (follow_up_required, follow_up_date) WHERE (follow_up_required = true);


--
-- Name: idx_supplier_comms_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_comms_supplier_id ON public.lats_supplier_communications USING btree (supplier_id);


--
-- Name: idx_supplier_contracts_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_contracts_end_date ON public.lats_supplier_contracts USING btree (end_date);


--
-- Name: idx_supplier_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_contracts_status ON public.lats_supplier_contracts USING btree (status);


--
-- Name: idx_supplier_contracts_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_contracts_supplier_id ON public.lats_supplier_contracts USING btree (supplier_id);


--
-- Name: idx_supplier_documents_expiry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_documents_expiry_date ON public.lats_supplier_documents USING btree (expiry_date) WHERE (expiry_date IS NOT NULL);


--
-- Name: idx_supplier_documents_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_documents_supplier_id ON public.lats_supplier_documents USING btree (supplier_id);


--
-- Name: idx_supplier_documents_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_documents_type ON public.lats_supplier_documents USING btree (document_type);


--
-- Name: idx_supplier_ratings_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_ratings_date ON public.lats_supplier_ratings USING btree (created_at DESC);


--
-- Name: idx_supplier_ratings_overall; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_ratings_overall ON public.lats_supplier_ratings USING btree (overall_rating);


--
-- Name: idx_supplier_ratings_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_ratings_supplier_id ON public.lats_supplier_ratings USING btree (supplier_id);


--
-- Name: idx_supplier_tag_mapping_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_tag_mapping_supplier ON public.lats_supplier_tag_mapping USING btree (supplier_id);


--
-- Name: idx_supplier_tag_mapping_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_tag_mapping_tag ON public.lats_supplier_tag_mapping USING btree (tag_id);


--
-- Name: idx_trade_in_contracts_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_contracts_customer ON public.lats_trade_in_contracts USING btree (customer_id);


--
-- Name: idx_trade_in_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_contracts_status ON public.lats_trade_in_contracts USING btree (status);


--
-- Name: idx_trade_in_contracts_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_contracts_transaction ON public.lats_trade_in_contracts USING btree (transaction_id);


--
-- Name: idx_trade_in_damage_spare_part; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_damage_spare_part ON public.lats_trade_in_damage_assessments USING btree (spare_part_id);


--
-- Name: idx_trade_in_damage_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_damage_transaction ON public.lats_trade_in_damage_assessments USING btree (transaction_id);


--
-- Name: idx_trade_in_prices_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_prices_active ON public.lats_trade_in_prices USING btree (is_active);


--
-- Name: idx_trade_in_prices_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_prices_branch ON public.lats_trade_in_prices USING btree (branch_id);


--
-- Name: idx_trade_in_prices_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_prices_product ON public.lats_trade_in_prices USING btree (product_id);


--
-- Name: idx_trade_in_prices_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_prices_variant ON public.lats_trade_in_prices USING btree (variant_id);


--
-- Name: idx_trade_in_transactions_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_transactions_branch ON public.lats_trade_in_transactions USING btree (branch_id);


--
-- Name: idx_trade_in_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_transactions_created_at ON public.lats_trade_in_transactions USING btree (created_at DESC);


--
-- Name: idx_trade_in_transactions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_transactions_customer ON public.lats_trade_in_transactions USING btree (customer_id);


--
-- Name: idx_trade_in_transactions_imei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_transactions_imei ON public.lats_trade_in_transactions USING btree (device_imei);


--
-- Name: idx_trade_in_transactions_new_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_transactions_new_product ON public.lats_trade_in_transactions USING btree (new_product_id);


--
-- Name: idx_trade_in_transactions_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_transactions_sale ON public.lats_trade_in_transactions USING btree (sale_id);


--
-- Name: idx_trade_in_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_in_transactions_status ON public.lats_trade_in_transactions USING btree (status);


--
-- Name: idx_unique_customer_phone_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_customer_phone_name ON public.lats_customers USING btree (phone, name) WHERE ((phone IS NOT NULL) AND (name IS NOT NULL));


--
-- Name: idx_user_branch_assignments_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_branch_assignments_branch ON public.user_branch_assignments USING btree (branch_id);


--
-- Name: idx_user_branch_assignments_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_branch_assignments_primary ON public.user_branch_assignments USING btree (is_primary);


--
-- Name: idx_user_branch_assignments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_branch_assignments_user ON public.user_branch_assignments USING btree (user_id);


--
-- Name: idx_users_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_branch_id ON public.users USING btree (branch_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_webhook_endpoints_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_endpoints_active ON public.webhook_endpoints USING btree (is_active);


--
-- Name: idx_webhook_endpoints_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_endpoints_user ON public.webhook_endpoints USING btree (user_id);


--
-- Name: idx_webhook_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_logs_created ON public.webhook_logs USING btree (created_at);


--
-- Name: idx_webhook_logs_webhook; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_logs_webhook ON public.webhook_logs USING btree (webhook_id);


--
-- Name: attendance_records calculate_hours_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calculate_hours_trigger BEFORE INSERT OR UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.calculate_attendance_hours();


--
-- Name: leave_requests calculate_leave_days_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calculate_leave_days_trigger BEFORE INSERT OR UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.calculate_leave_days();


--
-- Name: expenses handle_expense_transaction_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_expense_transaction_trigger AFTER INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.handle_expense_transaction();


--
-- Name: lats_inventory_items inventory_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inventory_items_updated_at BEFORE UPDATE ON public.lats_inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_inventory_items_updated_at();


--
-- Name: lats_purchase_order_payments po_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER po_payments_updated_at BEFORE UPDATE ON public.lats_purchase_order_payments FOR EACH ROW EXECUTE FUNCTION public.update_po_payments_updated_at();


--
-- Name: users sync_users_to_auth_users_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_users_to_auth_users_trigger AFTER UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_auth_users();


--
-- Name: branch_transfers trg_update_branch_transfer_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_branch_transfer_timestamp BEFORE UPDATE ON public.branch_transfers FOR EACH ROW EXECUTE FUNCTION public.update_branch_transfer_timestamp();


--
-- Name: store_locations trigger_auto_sync_sharing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_sync_sharing AFTER UPDATE ON public.store_locations FOR EACH ROW EXECUTE FUNCTION public.auto_sync_sharing_on_branch_update();


--
-- Name: reminders trigger_create_recurring_reminder; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_recurring_reminder AFTER UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.create_next_recurring_reminder();


--
-- Name: lats_purchase_order_shipping trigger_po_shipping_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_po_shipping_updated_at BEFORE UPDATE ON public.lats_purchase_order_shipping FOR EACH ROW EXECUTE FUNCTION public.update_po_shipping_updated_at();


--
-- Name: reminders trigger_reminders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_reminders_updated_at BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.update_reminders_updated_at();


--
-- Name: customer_messages trigger_set_is_shared_customer_messages; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_customer_messages BEFORE INSERT ON public.customer_messages FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: quality_checks trigger_set_is_shared_quality_checks; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_quality_checks BEFORE INSERT ON public.quality_checks FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: recurring_expenses trigger_set_is_shared_recurring_expenses; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_recurring_expenses BEFORE INSERT ON public.recurring_expenses FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: lats_trade_in_contracts trigger_set_trade_in_contract_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_trade_in_contract_number BEFORE INSERT ON public.lats_trade_in_contracts FOR EACH ROW EXECUTE FUNCTION public.set_trade_in_contract_number();


--
-- Name: lats_trade_in_transactions trigger_set_trade_in_transaction_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_trade_in_transaction_number BEFORE INSERT ON public.lats_trade_in_transactions FOR EACH ROW EXECUTE FUNCTION public.set_trade_in_transaction_number();


--
-- Name: lats_shipping_agents trigger_shipping_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_shipping_agents_updated_at BEFORE UPDATE ON public.lats_shipping_agents FOR EACH ROW EXECUTE FUNCTION public.update_shipping_agents_updated_at();


--
-- Name: lats_shipping_methods trigger_shipping_methods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_shipping_methods_updated_at BEFORE UPDATE ON public.lats_shipping_methods FOR EACH ROW EXECUTE FUNCTION public.update_shipping_methods_updated_at();


--
-- Name: api_keys trigger_update_api_keys; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_api_keys BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_api_keys_updated_at();


--
-- Name: customer_installment_plan_payments trigger_update_customer_installment_plan_balance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_customer_installment_plan_balance AFTER INSERT OR DELETE OR UPDATE ON public.customer_installment_plan_payments FOR EACH ROW EXECUTE FUNCTION public.update_customer_installment_plan_balance();


--
-- Name: daily_reports trigger_update_daily_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_daily_reports_updated_at BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION public.update_daily_reports_updated_at();


--
-- Name: document_templates trigger_update_document_templates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_document_templates BEFORE UPDATE ON public.document_templates FOR EACH ROW EXECUTE FUNCTION public.update_document_templates_updated_at();


--
-- Name: lats_supplier_communications trigger_update_last_contact; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_last_contact AFTER INSERT ON public.lats_supplier_communications FOR EACH ROW EXECUTE FUNCTION public.update_supplier_last_contact();


--
-- Name: lats_supplier_communications trigger_update_response_time; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_response_time AFTER INSERT ON public.lats_supplier_communications FOR EACH ROW WHEN ((new.direction = 'inbound'::text)) EXECUTE FUNCTION public.update_supplier_response_time();


--
-- Name: scheduled_transfers trigger_update_scheduled_transfers_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_scheduled_transfers_timestamp BEFORE UPDATE ON public.scheduled_transfers FOR EACH ROW EXECUTE FUNCTION public.update_scheduled_transfers_timestamp();


--
-- Name: special_order_payments trigger_update_special_order_balance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_special_order_balance AFTER INSERT OR DELETE OR UPDATE ON public.special_order_payments FOR EACH ROW EXECUTE FUNCTION public.update_special_order_balance();


--
-- Name: store_locations trigger_update_store_locations; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_store_locations BEFORE UPDATE ON public.store_locations FOR EACH ROW EXECUTE FUNCTION public.update_store_locations_updated_at();


--
-- Name: lats_supplier_ratings trigger_update_supplier_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_supplier_rating AFTER INSERT OR UPDATE ON public.lats_supplier_ratings FOR EACH ROW EXECUTE FUNCTION public.update_supplier_average_rating();


--
-- Name: lats_trade_in_contracts trigger_update_trade_in_contracts_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_trade_in_contracts_timestamp BEFORE UPDATE ON public.lats_trade_in_contracts FOR EACH ROW EXECUTE FUNCTION public.update_trade_in_timestamp();


--
-- Name: lats_trade_in_prices trigger_update_trade_in_prices_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_trade_in_prices_timestamp BEFORE UPDATE ON public.lats_trade_in_prices FOR EACH ROW EXECUTE FUNCTION public.update_trade_in_timestamp();


--
-- Name: lats_trade_in_transactions trigger_update_trade_in_transactions_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_trade_in_transactions_timestamp BEFORE UPDATE ON public.lats_trade_in_transactions FOR EACH ROW EXECUTE FUNCTION public.update_trade_in_timestamp();


--
-- Name: webhook_endpoints trigger_update_webhook_endpoints; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_webhook_endpoints BEFORE UPDATE ON public.webhook_endpoints FOR EACH ROW EXECUTE FUNCTION public.update_webhook_endpoints_updated_at();


--
-- Name: attendance_records update_attendance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_shipping update_lats_shipping_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lats_shipping_updated_at BEFORE UPDATE ON public.lats_shipping FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leave_requests update_leave_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leave_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reports update_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_reports_updated_at();


--
-- Name: shift_templates update_shift_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON public.shift_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employee_shifts update_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON public.employee_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_supplier_communications update_supplier_communications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplier_communications_updated_at BEFORE UPDATE ON public.lats_supplier_communications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_supplier_contracts update_supplier_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplier_contracts_updated_at BEFORE UPDATE ON public.lats_supplier_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_supplier_documents update_supplier_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplier_documents_updated_at BEFORE UPDATE ON public.lats_supplier_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_supplier_ratings update_supplier_ratings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplier_ratings_updated_at BEFORE UPDATE ON public.lats_supplier_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_request_logs api_request_logs_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_request_logs
    ADD CONSTRAINT api_request_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: attendance_records attendance_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: auto_reorder_log auto_reorder_log_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_reorder_log
    ADD CONSTRAINT auto_reorder_log_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id);


--
-- Name: auto_reorder_log auto_reorder_log_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_reorder_log
    ADD CONSTRAINT auto_reorder_log_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id);


--
-- Name: auto_reorder_log auto_reorder_log_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_reorder_log
    ADD CONSTRAINT auto_reorder_log_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.lats_product_variants(id);


--
-- Name: branch_activity_log branch_activity_log_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_activity_log
    ADD CONSTRAINT branch_activity_log_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE CASCADE;


--
-- Name: branch_transfers branch_transfers_entity_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT branch_transfers_entity_fkey FOREIGN KEY (entity_id) REFERENCES public.lats_product_variants(id);


--
-- Name: branch_transfers branch_transfers_from_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT branch_transfers_from_branch_fkey FOREIGN KEY (from_branch_id) REFERENCES public.store_locations(id);


--
-- Name: branch_transfers branch_transfers_from_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT branch_transfers_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES public.store_locations(id) ON DELETE CASCADE;


--
-- Name: branch_transfers branch_transfers_to_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT branch_transfers_to_branch_fkey FOREIGN KEY (to_branch_id) REFERENCES public.store_locations(id);


--
-- Name: branch_transfers branch_transfers_to_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT branch_transfers_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES public.store_locations(id) ON DELETE CASCADE;


--
-- Name: buyer_details buyer_details_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_details
    ADD CONSTRAINT buyer_details_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.whatsapp_customers(customer_id);


--
-- Name: categories categories_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: communication_log communication_log_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.whatsapp_customers(customer_id);


--
-- Name: customer_installment_plan_payments customer_installment_plan_payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plan_payments
    ADD CONSTRAINT customer_installment_plan_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.finance_accounts(id);


--
-- Name: customer_installment_plan_payments customer_installment_plan_payments_installment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plan_payments
    ADD CONSTRAINT customer_installment_plan_payments_installment_plan_id_fkey FOREIGN KEY (installment_plan_id) REFERENCES public.customer_installment_plans(id) ON DELETE CASCADE;


--
-- Name: customer_installment_plans customer_installment_plans_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plans
    ADD CONSTRAINT customer_installment_plans_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: customer_installment_plans customer_installment_plans_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plans
    ADD CONSTRAINT customer_installment_plans_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.lats_sales(id) ON DELETE SET NULL;


--
-- Name: customer_messages customer_messages_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: customer_messages customer_messages_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: customer_messages customer_messages_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL;


--
-- Name: customer_messages customer_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_special_orders customer_special_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_special_orders
    ADD CONSTRAINT customer_special_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: daily_reports daily_reports_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: daily_reports daily_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.employees(id);


--
-- Name: employee_shifts employee_shifts_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shifts
    ADD CONSTRAINT employee_shifts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_shifts employee_shifts_shift_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shifts
    ADD CONSTRAINT employee_shifts_shift_template_id_fkey FOREIGN KEY (shift_template_id) REFERENCES public.shift_templates(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE SET NULL;


--
-- Name: lats_inventory_items fk_lats_inventory_items_storage_room; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT fk_lats_inventory_items_storage_room FOREIGN KEY (storage_room_id) REFERENCES public.lats_store_rooms(id) ON DELETE SET NULL;


--
-- Name: inventory inventory_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: lats_customers lats_customers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_customers
    ADD CONSTRAINT lats_customers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_customers lats_customers_created_by_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_customers
    ADD CONSTRAINT lats_customers_created_by_branch_id_fkey FOREIGN KEY (created_by_branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_customers lats_customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_customers
    ADD CONSTRAINT lats_customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: lats_customers lats_customers_preferred_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_customers
    ADD CONSTRAINT lats_customers_preferred_branch_id_fkey FOREIGN KEY (preferred_branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_customers lats_customers_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_customers
    ADD CONSTRAINT lats_customers_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.lats_customers(id);


--
-- Name: lats_employees lats_employees_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_employees
    ADD CONSTRAINT lats_employees_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_inventory_items lats_inventory_items_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_inventory_items lats_inventory_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id) ON DELETE CASCADE;


--
-- Name: lats_inventory_items lats_inventory_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: lats_inventory_items lats_inventory_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.lats_purchase_order_items(id) ON DELETE SET NULL;


--
-- Name: lats_inventory_items lats_inventory_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.lats_product_variants(id) ON DELETE CASCADE;


--
-- Name: lats_product_units lats_product_units_parent_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_units
    ADD CONSTRAINT lats_product_units_parent_variant_id_fkey FOREIGN KEY (parent_variant_id) REFERENCES public.lats_product_variants(id) ON DELETE CASCADE;


--
-- Name: lats_purchase_order_audit_log lats_purchase_order_audit_log_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_audit_log
    ADD CONSTRAINT lats_purchase_order_audit_log_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: lats_purchase_order_audit_log lats_purchase_order_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_audit_log
    ADD CONSTRAINT lats_purchase_order_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: lats_purchase_order_payments lats_purchase_order_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_payments
    ADD CONSTRAINT lats_purchase_order_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: lats_purchase_order_payments lats_purchase_order_payments_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_payments
    ADD CONSTRAINT lats_purchase_order_payments_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: lats_purchase_order_shipping lats_purchase_order_shipping_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_shipping
    ADD CONSTRAINT lats_purchase_order_shipping_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: lats_purchase_order_shipping lats_purchase_order_shipping_shipping_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_shipping
    ADD CONSTRAINT lats_purchase_order_shipping_shipping_agent_id_fkey FOREIGN KEY (shipping_agent_id) REFERENCES public.lats_shipping_agents(id);


--
-- Name: lats_purchase_order_shipping lats_purchase_order_shipping_shipping_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_shipping
    ADD CONSTRAINT lats_purchase_order_shipping_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES public.lats_shipping_methods(id);


--
-- Name: lats_shipping lats_shipping_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping
    ADD CONSTRAINT lats_shipping_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: lats_shipping lats_shipping_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping
    ADD CONSTRAINT lats_shipping_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: lats_stock_transfers lats_stock_transfers_from_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_stock_transfers lats_stock_transfers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id);


--
-- Name: lats_stock_transfers lats_stock_transfers_to_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_stock_transfers lats_stock_transfers_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.lats_product_variants(id);


--
-- Name: lats_store_rooms lats_store_rooms_store_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_rooms
    ADD CONSTRAINT lats_store_rooms_store_location_id_fkey FOREIGN KEY (store_location_id) REFERENCES public.lats_store_locations(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_categories lats_supplier_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_categories
    ADD CONSTRAINT lats_supplier_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.lats_supplier_categories(id);


--
-- Name: lats_supplier_category_mapping lats_supplier_category_mapping_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_category_mapping
    ADD CONSTRAINT lats_supplier_category_mapping_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.lats_supplier_categories(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_category_mapping lats_supplier_category_mapping_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_category_mapping
    ADD CONSTRAINT lats_supplier_category_mapping_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_communications lats_supplier_communications_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_communications
    ADD CONSTRAINT lats_supplier_communications_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_contracts lats_supplier_contracts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_contracts
    ADD CONSTRAINT lats_supplier_contracts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_documents lats_supplier_documents_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_documents
    ADD CONSTRAINT lats_supplier_documents_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_ratings lats_supplier_ratings_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_ratings
    ADD CONSTRAINT lats_supplier_ratings_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_tag_mapping lats_supplier_tag_mapping_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_tag_mapping
    ADD CONSTRAINT lats_supplier_tag_mapping_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_tag_mapping lats_supplier_tag_mapping_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_tag_mapping
    ADD CONSTRAINT lats_supplier_tag_mapping_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.lats_supplier_tags(id) ON DELETE CASCADE;


--
-- Name: lats_trade_in_contracts lats_trade_in_contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id);


--
-- Name: lats_trade_in_contracts lats_trade_in_contracts_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.lats_trade_in_transactions(id) ON DELETE CASCADE;


--
-- Name: lats_trade_in_contracts lats_trade_in_contracts_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.auth_users(id);


--
-- Name: lats_trade_in_damage_assessments lats_trade_in_damage_assessments_assessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_damage_assessments
    ADD CONSTRAINT lats_trade_in_damage_assessments_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES public.auth_users(id);


--
-- Name: lats_trade_in_damage_assessments lats_trade_in_damage_assessments_spare_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_damage_assessments
    ADD CONSTRAINT lats_trade_in_damage_assessments_spare_part_id_fkey FOREIGN KEY (spare_part_id) REFERENCES public.lats_spare_parts(id);


--
-- Name: lats_trade_in_damage_assessments lats_trade_in_damage_assessments_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_damage_assessments
    ADD CONSTRAINT lats_trade_in_damage_assessments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.lats_trade_in_transactions(id) ON DELETE CASCADE;


--
-- Name: lats_trade_in_prices lats_trade_in_prices_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_prices lats_trade_in_prices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_prices lats_trade_in_prices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id) ON DELETE CASCADE;


--
-- Name: lats_trade_in_prices lats_trade_in_prices_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.auth_users(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_prices lats_trade_in_prices_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.lats_product_variants(id) ON DELETE CASCADE;


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.auth_users(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_new_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_new_product_id_fkey FOREIGN KEY (new_product_id) REFERENCES public.lats_products(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_new_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_new_variant_id_fkey FOREIGN KEY (new_variant_id) REFERENCES public.lats_product_variants(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.lats_sales(id) ON DELETE SET NULL;


--
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: loyalty_points loyalty_points_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: mobile_money_transactions mobile_money_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_money_transactions
    ADD CONSTRAINT mobile_money_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: mobile_money_transactions mobile_money_transactions_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_money_transactions
    ADD CONSTRAINT mobile_money_transactions_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id);


--
-- Name: product_interests product_interests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_interests
    ADD CONSTRAINT product_interests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.whatsapp_customers(customer_id);


--
-- Name: purchase_orders purchase_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: quality_check_results quality_check_results_check_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_check_results
    ADD CONSTRAINT quality_check_results_check_item_id_fkey FOREIGN KEY (check_item_id) REFERENCES public.quality_check_items(id);


--
-- Name: quality_check_results quality_check_results_quality_check_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_check_results
    ADD CONSTRAINT quality_check_results_quality_check_id_fkey FOREIGN KEY (quality_check_id) REFERENCES public.quality_checks(id) ON DELETE CASCADE;


--
-- Name: quality_checks quality_checks_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: quality_checks quality_checks_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: quality_checks quality_checks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.quality_check_templates(id);


--
-- Name: recurring_expense_history recurring_expense_history_recurring_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expense_history
    ADD CONSTRAINT recurring_expense_history_recurring_expense_id_fkey FOREIGN KEY (recurring_expense_id) REFERENCES public.recurring_expenses(id) ON DELETE CASCADE;


--
-- Name: recurring_expense_history recurring_expense_history_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expense_history
    ADD CONSTRAINT recurring_expense_history_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.account_transactions(id) ON DELETE SET NULL;


--
-- Name: recurring_expenses recurring_expenses_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.finance_accounts(id) ON DELETE CASCADE;


--
-- Name: recurring_expenses recurring_expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: reminders reminders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reminders reminders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE CASCADE;


--
-- Name: reminders reminders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: report_attachments report_attachments_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_attachments
    ADD CONSTRAINT report_attachments_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: report_attachments report_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_attachments
    ADD CONSTRAINT report_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.auth_users(id);


--
-- Name: reports reports_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.auth_users(id);


--
-- Name: reports reports_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: reports reports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id);


--
-- Name: sales sales_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: sales_pipeline sales_pipeline_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_pipeline
    ADD CONSTRAINT sales_pipeline_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.whatsapp_customers(customer_id);


--
-- Name: scheduled_transfer_executions scheduled_transfer_executions_destination_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfer_executions
    ADD CONSTRAINT scheduled_transfer_executions_destination_transaction_id_fkey FOREIGN KEY (destination_transaction_id) REFERENCES public.account_transactions(id);


--
-- Name: scheduled_transfer_executions scheduled_transfer_executions_scheduled_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfer_executions
    ADD CONSTRAINT scheduled_transfer_executions_scheduled_transfer_id_fkey FOREIGN KEY (scheduled_transfer_id) REFERENCES public.scheduled_transfers(id) ON DELETE CASCADE;


--
-- Name: scheduled_transfer_executions scheduled_transfer_executions_source_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfer_executions
    ADD CONSTRAINT scheduled_transfer_executions_source_transaction_id_fkey FOREIGN KEY (source_transaction_id) REFERENCES public.account_transactions(id);


--
-- Name: scheduled_transfers scheduled_transfers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfers
    ADD CONSTRAINT scheduled_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: scheduled_transfers scheduled_transfers_destination_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfers
    ADD CONSTRAINT scheduled_transfers_destination_account_id_fkey FOREIGN KEY (destination_account_id) REFERENCES public.finance_accounts(id) ON DELETE CASCADE;


--
-- Name: scheduled_transfers scheduled_transfers_source_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfers
    ADD CONSTRAINT scheduled_transfers_source_account_id_fkey FOREIGN KEY (source_account_id) REFERENCES public.finance_accounts(id) ON DELETE CASCADE;


--
-- Name: shelves shelves_storage_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelves
    ADD CONSTRAINT shelves_storage_room_id_fkey FOREIGN KEY (storage_room_id) REFERENCES public.storage_rooms(id) ON DELETE CASCADE;


--
-- Name: special_order_payments special_order_payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.special_order_payments
    ADD CONSTRAINT special_order_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.finance_accounts(id);


--
-- Name: special_order_payments special_order_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.special_order_payments
    ADD CONSTRAINT special_order_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: special_order_payments special_order_payments_special_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.special_order_payments
    ADD CONSTRAINT special_order_payments_special_order_id_fkey FOREIGN KEY (special_order_id) REFERENCES public.customer_special_orders(id) ON DELETE CASCADE;


--
-- Name: storage_rooms storage_rooms_store_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_rooms
    ADD CONSTRAINT storage_rooms_store_location_id_fkey FOREIGN KEY (store_location_id) REFERENCES public.store_locations(id);


--
-- Name: user_branch_assignments user_branch_assignments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE CASCADE;


--
-- Name: users users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: webhook_logs webhook_logs_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE;


--
-- Name: customer_installment_plans Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users" ON public.customer_installment_plans FOR DELETE USING (true);


--
-- Name: customer_special_orders Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users" ON public.customer_special_orders FOR DELETE USING (true);


--
-- Name: expenses Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users" ON public.expenses FOR DELETE USING (true);


--
-- Name: lats_stock_transfers Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users" ON public.lats_stock_transfers FOR DELETE USING (true);


--
-- Name: loyalty_points Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users" ON public.loyalty_points FOR DELETE USING (true);


--
-- Name: backup_logs Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.backup_logs FOR INSERT WITH CHECK (true);


--
-- Name: customer_installment_plan_payments Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.customer_installment_plan_payments FOR INSERT WITH CHECK (true);


--
-- Name: customer_installment_plans Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.customer_installment_plans FOR INSERT WITH CHECK (true);


--
-- Name: customer_special_orders Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.customer_special_orders FOR INSERT WITH CHECK (true);


--
-- Name: expenses Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.expenses FOR INSERT WITH CHECK (true);


--
-- Name: lats_stock_transfers Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.lats_stock_transfers FOR INSERT WITH CHECK (true);


--
-- Name: loyalty_points Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.loyalty_points FOR INSERT WITH CHECK (true);


--
-- Name: special_order_payments Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.special_order_payments FOR INSERT WITH CHECK (true);


--
-- Name: backup_logs Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.backup_logs FOR SELECT USING (true);


--
-- Name: customer_installment_plan_payments Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.customer_installment_plan_payments FOR SELECT USING (true);


--
-- Name: customer_installment_plans Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.customer_installment_plans FOR SELECT USING (true);


--
-- Name: customer_special_orders Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.customer_special_orders FOR SELECT USING (true);


--
-- Name: expenses Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.expenses FOR SELECT USING (true);


--
-- Name: lats_stock_transfers Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.lats_stock_transfers FOR SELECT USING (true);


--
-- Name: loyalty_points Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.loyalty_points FOR SELECT USING (true);


--
-- Name: special_order_payments Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.special_order_payments FOR SELECT USING (true);


--
-- Name: customer_installment_plan_payments Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.customer_installment_plan_payments FOR UPDATE USING (true);


--
-- Name: customer_installment_plans Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.customer_installment_plans FOR UPDATE USING (true);


--
-- Name: customer_special_orders Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.customer_special_orders FOR UPDATE USING (true);


--
-- Name: expenses Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.expenses FOR UPDATE USING (true);


--
-- Name: lats_stock_transfers Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.lats_stock_transfers FOR UPDATE USING (true);


--
-- Name: loyalty_points Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.loyalty_points FOR UPDATE USING (true);


--
-- Name: special_order_payments Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.special_order_payments FOR UPDATE USING (true);


--
-- Name: backup_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: branch_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branch_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: branch_transfers branch_transfers_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branch_transfers_delete_policy ON public.branch_transfers FOR DELETE USING ((status = ANY (ARRAY['pending'::text, 'rejected'::text, 'cancelled'::text])));


--
-- Name: branch_transfers branch_transfers_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branch_transfers_insert_policy ON public.branch_transfers FOR INSERT WITH CHECK (true);


--
-- Name: branch_transfers branch_transfers_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branch_transfers_select_policy ON public.branch_transfers FOR SELECT USING (true);


--
-- Name: branch_transfers branch_transfers_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branch_transfers_update_policy ON public.branch_transfers FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_delete_policy ON public.categories FOR DELETE USING (true);


--
-- Name: categories categories_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_insert_policy ON public.categories FOR INSERT WITH CHECK (true);


--
-- Name: categories categories_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_select_policy ON public.categories FOR SELECT USING (true);


--
-- Name: categories categories_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_update_policy ON public.categories FOR UPDATE USING (true);


--
-- Name: customer_installment_plan_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_installment_plan_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_installment_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_installment_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_special_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_special_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_opening_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_opening_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory inventory_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_delete_policy ON public.inventory FOR DELETE USING (true);


--
-- Name: inventory inventory_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_insert_policy ON public.inventory FOR INSERT WITH CHECK (true);


--
-- Name: inventory inventory_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_select_policy ON public.inventory FOR SELECT USING (true);


--
-- Name: inventory inventory_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_update_policy ON public.inventory FOR UPDATE USING (true);


--
-- Name: lats_stock_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lats_stock_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

--
-- Name: paragraphs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.paragraphs ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders purchase_orders_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_orders_delete_policy ON public.purchase_orders FOR DELETE USING (true);


--
-- Name: purchase_orders purchase_orders_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_orders_insert_policy ON public.purchase_orders FOR INSERT WITH CHECK (true);


--
-- Name: purchase_orders purchase_orders_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_orders_select_policy ON public.purchase_orders FOR SELECT USING (true);


--
-- Name: purchase_orders purchase_orders_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_orders_update_policy ON public.purchase_orders FOR UPDATE USING (true);


--
-- Name: recurring_expense_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_expense_history ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

--
-- Name: sales sales_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_delete_policy ON public.sales FOR DELETE USING (true);


--
-- Name: sales sales_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_insert_policy ON public.sales FOR INSERT WITH CHECK (true);


--
-- Name: sales sales_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_select_policy ON public.sales FOR SELECT USING (true);


--
-- Name: sales sales_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_update_policy ON public.sales FOR UPDATE USING (true);


--
-- Name: special_order_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.special_order_payments ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

