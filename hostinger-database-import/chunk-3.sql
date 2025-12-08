    currency text DEFAULT 'TZS'::text,
    total_paid numeric DEFAULT 0,
    payment_status text DEFAULT 'unpaid'::text,
    expected_delivery DATETIME,
    branch_id CHAR(36),
    payment_terms text,
    exchange_rate numeric(10,6) DEFAULT 1.0,
    base_currency text DEFAULT 'TZS'::text,
    exchange_rate_source text DEFAULT 'manual'::text,
    exchange_rate_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_amount_base_currency numeric,
    CONSTRAINT lats_purchase_orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'partial'::text, 'paid'::text]))),
    CONSTRAINT lats_purchase_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'sent'::text, 'confirmed'::text, 'shipped'::text, 'partial_received'::text, 'received'::text, 'completed'::text, 'cancelled'::text])))
);



--
-- TOC entry 7824 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN lats_purchase_orders.po_number; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7825 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN lats_purchase_orders.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7826 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN lats_purchase_orders.payment_terms; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7827 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN lats_purchase_orders.exchange_rate; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7828 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN lats_purchase_orders.base_currency; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7829 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN lats_purchase_orders.exchange_rate_source; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7830 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN lats_purchase_orders.exchange_rate_date; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7831 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN lats_purchase_orders.total_amount_base_currency; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 243 (class 1259 OID 1204689)
-- Name: lats_suppliers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_suppliers (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_person text,
    email text,
    phone text,
    address text,
    city text,
    country text,
    is_active TINYINT(1) DEFAULT 1,
    notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    branch_id CHAR(36),
    is_shared TINYINT(1) DEFAULT 1,
    is_trade_in_customer TINYINT(1) DEFAULT 0,
    company_name text,
    description text,
    whatsapp text,
    tax_id text,
    payment_terms text,
    rating numeric,
    preferred_currency text DEFAULT 'TZS'::text,
    exchange_rate numeric,
    wechat text,
    credit_limit numeric(15,2) DEFAULT 0,
    current_balance numeric(15,2) DEFAULT 0,
    payment_days integer DEFAULT 30,
    discount_percentage numeric(5,2) DEFAULT 0,
    website_url text,
    logo_url text,
    business_registration text,
    business_type text,
    year_established integer,
    employee_count text,
    linkedin_url text,
    facebook_url text,
    instagram_url text,
    minimum_order_quantity integer,
    lead_time_days integer,
    warehouse_location text,
    shipping_methods text[],
    delivery_zones text[],
    certifications text[],
    quality_standards text,
    return_policy text,
    warranty_terms text,
    total_orders integer DEFAULT 0,
    total_order_value numeric(15,2) DEFAULT 0,
    average_rating numeric(3,2) DEFAULT 0,
    on_time_delivery_rate numeric(5,2) DEFAULT 0,
    quality_score numeric(5,2) DEFAULT 0,
    response_time_hours numeric(10,2),
    business_hours text,
    language_preferences text[],
    time_zone text,
    last_contact_date date,
    next_follow_up_date date,
    is_favorite TINYINT(1) DEFAULT 0,
    internal_notes text,
    priority_level text DEFAULT 'standard'::text,
    wechat_qr_code text,
    alipay_qr_code text,
    bank_account_details text,
    CONSTRAINT lats_suppliers_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);



--
-- TOC entry 7832 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.name; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7833 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.contact_person; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7834 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.email; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7835 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.phone; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7836 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.address; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7837 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.city; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7838 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.country; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7839 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.is_active; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7840 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.notes; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7841 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.is_shared; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7842 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.is_trade_in_customer; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7843 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.company_name; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7844 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.description; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7845 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.whatsapp; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7846 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.tax_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7847 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.payment_terms; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7848 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.preferred_currency; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7849 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.exchange_rate; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7850 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.wechat; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7851 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.credit_limit; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7852 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.current_balance; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7853 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.is_favorite; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7854 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.priority_level; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7855 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.wechat_qr_code; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7856 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.alipay_qr_code; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7857 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN lats_suppliers.bank_account_details; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 244 (class 1259 OID 1204715)
-- Name: auto_reorder_status; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW auto_reorder_status AS
 SELECT p.name AS product_name,
    pv.sku,
    pv.quantity AS current_stock,
    pv.reorder_point,
    (pv.quantity - pv.reorder_point) AS stock_buffer,
        CASE
            WHEN (pv.quantity <= 0) THEN 'OUT_OF_STOCK'::text
            WHEN (pv.quantity <= pv.reorder_point) THEN 'BELOW_REORDER_POINT'::text
            WHEN ((pv.quantity)::numeric <= ((pv.reorder_point)::numeric * 1.5)) THEN 'LOW_STOCK_WARNING'::text
            ELSE 'OK'::text
        END AS stock_status,
    arl.purchase_order_id AS latest_auto_po_id,
    arl.created_at AS latest_auto_po_date,
    po.status AS latest_po_status,
    s.name AS supplier_name
   FROM ((((lats_product_variants pv
     JOIN lats_products p ON ((p.id = pv.product_id)))
     LEFT JOIN LATERAL ( SELECT auto_reorder_log.id,
            auto_reorder_log.product_id,
            auto_reorder_log.variant_id,
            auto_reorder_log.supplier_id,
            auto_reorder_log.triggered_quantity,
            auto_reorder_log.reorder_point,
            auto_reorder_log.suggested_quantity,
            auto_reorder_log.purchase_order_id,
            auto_reorder_log.po_created,
            auto_reorder_log.error_message,
            auto_reorder_log.created_at
           FROM auto_reorder_log
          WHERE (auto_reorder_log.variant_id = pv.id)
          ORDER BY auto_reorder_log.created_at DESC
         LIMIT 1) arl ON (true))
     LEFT JOIN lats_purchase_orders po ON ((po.id = arl.purchase_order_id)))
     LEFT JOIN lats_suppliers s ON ((s.id = po.supplier_id)))
  WHERE ((pv.reorder_point > 0) AND (p.is_active = true))
  ORDER BY
        CASE
            WHEN (pv.quantity <= 0) THEN 1
            WHEN (pv.quantity <= pv.reorder_point) THEN 2
            WHEN ((pv.quantity)::numeric <= ((pv.reorder_point)::numeric * 1.5)) THEN 3
            ELSE 4
        END, p.name;



--
-- TOC entry 245 (class 1259 OID 1204720)
-- Name: backup_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE backup_logs (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    backup_type text NOT NULL,
    status text DEFAULT 'pending'::text,
    file_path text,
    file_size bigint,
    record_count integer,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    error_message text,
    created_by CHAR(36),
    metadata JSON DEFAULT '{}'::JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT backup_logs_backup_type_check CHECK ((backup_type = ANY (ARRAY['full'::text, 'incremental'::text, 'manual'::text, 'scheduled'::text]))),
    CONSTRAINT backup_logs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'failed'::text])))
);



--
-- TOC entry 7858 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE backup_logs; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 246 (class 1259 OID 1204732)
-- Name: branch_activity_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE branch_activity_log (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    branch_id CHAR(36) NOT NULL,
    user_id CHAR(36),
    action_type text NOT NULL,
    entity_type text,
    entity_id CHAR(36),
    description text,
    metadata JSON DEFAULT '{}'::JSON,
    ip_address text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 247 (class 1259 OID 1204740)
-- Name: branch_transfers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE branch_transfers (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    from_branch_id CHAR(36) NOT NULL,
    to_branch_id CHAR(36) NOT NULL,
    transfer_type text DEFAULT 'stock'::text NOT NULL,
    entity_type text NOT NULL,
    entity_id CHAR(36) NOT NULL,
    quantity integer,
    status text DEFAULT 'pending'::text,
    requested_by CHAR(36),
    approved_by CHAR(36),
    notes text,
    metadata JSON DEFAULT '{}'::JSON,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    rejection_reason text,
    CONSTRAINT branch_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'in_transit'::text, 'completed'::text, 'rejected'::text, 'cancelled'::text]))),
    CONSTRAINT branch_transfers_transfer_type_check CHECK ((transfer_type = ANY (ARRAY['stock'::text, 'customer'::text, 'product'::text])))
);



--
-- TOC entry 7859 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE branch_transfers; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7860 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN branch_transfers.from_branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7861 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN branch_transfers.to_branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7862 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN branch_transfers.transfer_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7863 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN branch_transfers.entity_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7864 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN branch_transfers.status; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 248 (class 1259 OID 1204754)
-- Name: buyer_details; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE buyer_details (
    buyer_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    buying_messages integer DEFAULT 0,
    unique_keywords integer DEFAULT 0,
    keywords_found text,
    first_inquiry_date DATETIME,
    last_inquiry_date DATETIME,
    buying_score integer DEFAULT 0,
    buyer_tier text,
    sample_message text,
    conversion_status text DEFAULT 'pending'::text,
    last_contacted DATETIME,
    notes text
);



--
-- TOC entry 249 (class 1259 OID 1204763)
-- Name: buyer_details_buyer_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- TOC entry 7865 (class 0 OID 0)
-- Dependencies: 249
-- Name: buyer_details_buyer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 250 (class 1259 OID 1204764)
-- Name: categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE categories (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    parent_id CHAR(36),
    branch_id CHAR(36),
    is_shared TINYINT(1) DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 251 (class 1259 OID 1204774)
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE chat_messages (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    conversation_id CHAR(36),
    sender_id CHAR(36),
    sender_type text,
    recipient_id CHAR(36),
    recipient_type text,
    message_text text NOT NULL,
    message_type text DEFAULT 'text'::text,
    is_read TINYINT(1) DEFAULT 0,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 252 (class 1259 OID 1204783)
-- Name: communication_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE communication_log (
    log_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    communication_type text,
    direction text,
    subject text,
    notes text,
    contacted_by text,
    contact_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    follow_up_required integer DEFAULT 0,
    follow_up_date DATETIME
);



--
-- TOC entry 253 (class 1259 OID 1204790)
-- Name: communication_log_log_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- TOC entry 7866 (class 0 OID 0)
-- Dependencies: 253
-- Name: communication_log_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 254 (class 1259 OID 1204791)
-- Name: communication_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE communication_templates (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    template_name text NOT NULL,
    template_type text NOT NULL,
    subject text,
    body text NOT NULL,
    variables JSON,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 255 (class 1259 OID 1204800)
-- Name: contact_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE contact_history (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36),
    contact_type text NOT NULL,
    contact_method text,
    contact_subject text,
    contact_notes text,
    contacted_by CHAR(36),
    contacted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 256 (class 1259 OID 1204808)
-- Name: contact_methods; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE contact_methods (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36),
    method_type text NOT NULL,
    contact_value text NOT NULL,
    is_primary TINYINT(1) DEFAULT 0,
    is_verified TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 257 (class 1259 OID 1204818)
-- Name: contact_preferences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE contact_preferences (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36),
    preference_type text NOT NULL,
    preference_value JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 258 (class 1259 OID 1204826)
-- Name: customer_checkins; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customer_checkins (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36),
    checkin_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    checkout_date DATETIME,
    purpose text,
    notes text,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    staff_id CHAR(36)
);



--
-- TOC entry 259 (class 1259 OID 1204834)
-- Name: customer_communications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customer_communications (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36),
    type text,
    message text,
    status text,
    phone_number text,
    sent_by CHAR(36),
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7867 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE customer_communications; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 260 (class 1259 OID 1204841)
-- Name: customer_fix_backup; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customer_fix_backup (
    backup_id integer NOT NULL,
    backup_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    customer_id CHAR(36),
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
-- TOC entry 261 (class 1259 OID 1204847)
-- Name: customer_fix_backup_backup_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- TOC entry 7868 (class 0 OID 0)
-- Dependencies: 261
-- Name: customer_fix_backup_backup_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 262 (class 1259 OID 1204848)
-- Name: customer_installment_plan_payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customer_installment_plan_payments (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    installment_plan_id CHAR(36),
    customer_id CHAR(36),
    installment_number integer NOT NULL,
    amount numeric NOT NULL,
    payment_method text NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date date NOT NULL,
    status text DEFAULT 'paid'::text,
    days_late integer DEFAULT 0,
    late_fee numeric DEFAULT 0,
    account_id CHAR(36),
    reference_number text,
    notification_sent TINYINT(1) DEFAULT 0,
    notification_sent_at DATETIME,
    notes text,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_installment_plan_payments_status_check CHECK ((status = ANY (ARRAY['paid'::text, 'pending'::text, 'late'::text, 'waived'::text])))
);



--
-- TOC entry 7869 (class 0 OID 0)
-- Dependencies: 262
-- Name: TABLE customer_installment_plan_payments; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 263 (class 1259 OID 1204861)
-- Name: customer_installment_plans; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customer_installment_plans (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    plan_number text NOT NULL,
    customer_id CHAR(36),
    sale_id CHAR(36),
    branch_id CHAR(36) DEFAULT '00000000-0000-0000-0000-000000000001'::CHAR(36),
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
    last_reminder_sent DATETIME,
    reminder_count integer DEFAULT 0,
    terms_accepted TINYINT(1) DEFAULT 1,
    terms_accepted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes text,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_installment_plans_payment_frequency_check CHECK ((payment_frequency = ANY (ARRAY['weekly'::text, 'bi_weekly'::text, 'monthly'::text, 'custom'::text]))),
    CONSTRAINT customer_installment_plans_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'defaulted'::text, 'cancelled'::text])))
);



--
-- TOC entry 7870 (class 0 OID 0)
-- Dependencies: 263
-- Name: TABLE customer_installment_plans; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 264 (class 1259 OID 1204883)
-- Name: customer_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customer_messages (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36) NOT NULL,
    message text NOT NULL,
    direction text DEFAULT 'inbound'::text NOT NULL,
    channel text DEFAULT 'chat'::text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    sender_id CHAR(36),
    sender_name text,
    device_id CHAR(36),
    appointment_id CHAR(36),
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    delivered_at DATETIME,
    branch_id CHAR(36),
    is_shared TINYINT(1) DEFAULT 0,
    CONSTRAINT customer_messages_channel_check CHECK ((channel = ANY (ARRAY['chat'::text, 'sms'::text, 'whatsapp'::text, 'email'::text]))),
    CONSTRAINT customer_messages_direction_check CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text]))),
    CONSTRAINT customer_messages_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text, 'failed'::text])))
);



--
-- TOC entry 7871 (class 0 OID 0)
-- Dependencies: 264
-- Name: TABLE customer_messages; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 265 (class 1259 OID 1204897)
-- Name: customer_notes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customer_notes (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36),
    note text NOT NULL,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 266 (class 1259 OID 1204905)
-- Name: customer_payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customer_payments (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36),
    device_id CHAR(36),
    amount numeric NOT NULL,
    method text DEFAULT 'cash'::text,
    payment_type text DEFAULT 'payment'::text,
    status text DEFAULT 'completed'::text,
    reference_number text,
    notes text,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sale_id CHAR(36),
    branch_id CHAR(36),
    currency character varying(10) DEFAULT 'TZS'::character varying,
    is_shared TINYINT(1) DEFAULT 1
);



--
-- TOC entry 7872 (class 0 OID 0)
-- Dependencies: 266
-- Name: COLUMN customer_payments.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7873 (class 0 OID 0)
-- Dependencies: 266
-- Name: COLUMN customer_payments.currency; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 267 (class 1259 OID 1204919)
-- Name: customer_points_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customer_points_history (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36) NOT NULL,
    points_change integer NOT NULL,
    reason text,
    transaction_type text DEFAULT 'manual'::text,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 268 (class 1259 OID 1204927)
-- Name: customer_preferences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customer_preferences (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36) NOT NULL,
    preferred_contact_method character varying(50),
    communication_frequency character varying(50),
    marketing_opt_in TINYINT(1) DEFAULT 1,
    sms_opt_in TINYINT(1) DEFAULT 1,
    email_opt_in TINYINT(1) DEFAULT 1,
    whatsapp_opt_in TINYINT(1) DEFAULT 1,
    preferred_language character varying(10) DEFAULT 'en'::character varying,
    notification_preferences JSON DEFAULT '{}'::JSON,
    preferred_branch character varying(255),
    preferred_payment_method character varying(50),
    notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 269 (class 1259 OID 1204941)
-- Name: customer_revenue; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customer_revenue (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36),
    revenue_date date NOT NULL,
    revenue_amount numeric DEFAULT 0,
    revenue_source text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 270 (class 1259 OID 1204949)
-- Name: customer_special_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customer_special_orders (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    customer_id CHAR(36),
    branch_id CHAR(36) DEFAULT '00000000-0000-0000-0000-000000000001'::CHAR(36),
    product_name text NOT NULL,
    product_description text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    deposit_paid numeric DEFAULT 0,
    balance_due numeric DEFAULT 0,
    status text DEFAULT 'deposit_received'::text,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expected_arrival_date date,
    actual_arrival_date date,
    delivery_date DATETIME,
    supplier_name text,
    supplier_reference text,
    country_of_origin text,
    tracking_number text,
    notes text,
    internal_notes text,
    customer_notified_arrival TINYINT(1) DEFAULT 0,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_special_orders_status_check CHECK ((status = ANY (ARRAY['deposit_received'::text, 'ordered'::text, 'in_transit'::text, 'arrived'::text, 'ready_for_pickup'::text, 'delivered'::text, 'cancelled'::text])))
);



--
-- TOC entry 7874 (class 0 OID 0)
-- Dependencies: 270
-- Name: TABLE customer_special_orders; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 271 (class 1259 OID 1204967)
-- Name: lats_customers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_customers (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    city text,
    location text,
    branch_id CHAR(36) DEFAULT '00000000-0000-0000-0000-000000000001'::CHAR(36),
    loyalty_points integer DEFAULT 0,
    total_spent numeric DEFAULT 0,
    status text DEFAULT 'active'::text,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    whatsapp text,
    gender text,
    country text,
    color_tag text DEFAULT 'new'::text,
    loyalty_level text DEFAULT 'bronze'::text,
    points integer DEFAULT 0,
    last_visit DATETIME,
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
    whatsapp_opt_out TINYINT(1) DEFAULT 0,
    referred_by CHAR(36),
    created_by CHAR(36),
    last_purchase_date DATETIME,
    total_purchases integer DEFAULT 0,
    total_returns integer DEFAULT 0,
    total_calls integer DEFAULT 0,
    total_call_duration_minutes numeric DEFAULT 0,
    incoming_calls integer DEFAULT 0,
    outgoing_calls integer DEFAULT 0,
    missed_calls integer DEFAULT 0,
    avg_call_duration_minutes numeric DEFAULT 0,
    first_call_date DATETIME,
    last_call_date DATETIME,
    call_loyalty_level text DEFAULT 'Basic'::text,
    last_activity_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    referrals JSON DEFAULT '[]'::JSON,
    is_shared TINYINT(1) DEFAULT 1,
    preferred_branch_id CHAR(36),
    visible_to_branches CHAR(36)[],
    sharing_mode text DEFAULT 'isolated'::text,
    created_by_branch_id CHAR(36),
    created_by_branch_name text,
    CONSTRAINT lats_customers_sharing_mode_check CHECK ((sharing_mode = ANY (ARRAY['isolated'::text, 'shared'::text, 'custom'::text])))
);



--
-- TOC entry 272 (class 1259 OID 1204999)
-- Name: customers; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW customers AS
 SELECT id,
    name,
    email,
    phone,
    address,
    city,
    location,
    branch_id,
    loyalty_points,
    total_spent,
    status,
    is_active,
    created_at,
    updated_at,
    whatsapp,
    gender,
    country,
    color_tag,
    loyalty_level,
    points,
    last_visit,
    referral_source,
    birth_month,
    birth_day,
    birthday,
    initial_notes,
    notes,
    customer_tag,
    location_description,
    national_id,
    joined_date,
    profile_image,
    whatsapp_opt_out,
    referred_by,
    created_by,
    last_purchase_date,
    total_purchases,
    total_returns,
    total_calls,
    total_call_duration_minutes,
    incoming_calls,
    outgoing_calls,
    missed_calls,
    avg_call_duration_minutes,
    first_call_date,
    last_call_date,
    call_loyalty_level,
    last_activity_date,
    referrals,
    is_shared,
    preferred_branch_id,
    visible_to_branches,
    sharing_mode,
    created_by_branch_id,
    created_by_branch_name
   FROM lats_customers;



--
-- TOC entry 273 (class 1259 OID 1205004)
-- Name: whatsapp_customers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE whatsapp_customers (
    customer_id bigint NOT NULL,
    chat_session_name text NOT NULL,
    phone_number text,
    contact_name text,
    total_messages integer DEFAULT 0,
    messages_from_customer integer DEFAULT 0,
    messages_to_customer integer DEFAULT 0,
    first_contact_date DATETIME,
    last_contact_date DATETIME,
    status text DEFAULT 'active'::text,
    engagement_level text,
    is_buyer integer DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 274 (class 1259 OID 1205016)
-- Name: customers_customer_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- TOC entry 7875 (class 0 OID 0)
-- Dependencies: 274
-- Name: customers_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 275 (class 1259 OID 1205017)
-- Name: customers_duplicates_backup; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE customers_duplicates_backup (
    id CHAR(36),
    name text,
    email text,
    phone text,
    address text,
    city text,
    location text,
    branch_id CHAR(36),
    loyalty_points integer,
    total_spent numeric,
    status text,
    is_active TINYINT(1),
    created_at DATETIME,
    updated_at DATETIME,
    whatsapp text,
    gender text,
    country text,
    color_tag text,
    loyalty_level text,
    points integer,
    last_visit DATETIME,
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
    whatsapp_opt_out TINYINT(1),
    referred_by CHAR(36),
    created_by CHAR(36),
    last_purchase_date DATETIME,
    total_purchases integer,
    total_returns integer,
    total_calls integer,
    total_call_duration_minutes numeric,
    incoming_calls integer,
    outgoing_calls integer,
    missed_calls integer,
    avg_call_duration_minutes numeric,
    first_call_date DATETIME,
    last_call_date DATETIME,
    call_loyalty_level text,
    last_activity_date DATETIME,
    referrals JSON,
    is_shared TINYINT(1),
    preferred_branch_id CHAR(36),
    visible_to_branches CHAR(36)[],
    sharing_mode text,
    created_by_branch_id CHAR(36),
    created_by_branch_name text,
    backup_date DATETIME,
    backup_reason text
);



--
-- TOC entry 276 (class 1259 OID 1205022)
-- Name: daily_opening_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE daily_opening_sessions (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    opened_by character varying(255),
    opened_by_user_id CHAR(36),
    is_active TINYINT(1) DEFAULT 1,
    notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7876 (class 0 OID 0)
-- Dependencies: 276
-- Name: TABLE daily_opening_sessions; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 277 (class 1259 OID 1205031)
-- Name: daily_reports; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE daily_reports (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36) NOT NULL,
    report_date date DEFAULT CURRENT_DATE NOT NULL,
    branch_id CHAR(36) DEFAULT '00000000-0000-0000-0000-000000000001'::CHAR(36),
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
    reviewed_by CHAR(36),
    reviewed_at DATETIME,
    review_notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    report_type text DEFAULT 'daily'::text NOT NULL,
    report_month date,
    title text DEFAULT ''::text NOT NULL,
    customer_interactions text,
    pending_work text,
    recommendations text,
    additional_notes text,
    sales_made integer DEFAULT 0,
    pending_tasks integer DEFAULT 0,
    submitted_at DATETIME,
    CONSTRAINT daily_reports_energy_level_check CHECK (((energy_level >= 1) AND (energy_level <= 5))),
    CONSTRAINT daily_reports_mood_rating_check CHECK (((mood_rating >= 1) AND (mood_rating <= 5))),
    CONSTRAINT daily_reports_report_type_check CHECK ((report_type = ANY (ARRAY['daily'::text, 'monthly'::text]))),
    CONSTRAINT daily_reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text])))
);



--
-- TOC entry 7877 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN daily_reports.report_date; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7878 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN daily_reports.status; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 278 (class 1259 OID 1205054)
-- Name: daily_sales_closures; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE daily_sales_closures (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    total_sales numeric(12,2) DEFAULT 0,
    total_transactions integer DEFAULT 0,
    closed_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_by text NOT NULL,
    closed_by_user_id CHAR(36),
    sales_data JSON DEFAULT '{}'::JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_id CHAR(36)
);



--
-- TOC entry 7879 (class 0 OID 0)
-- Dependencies: 278
-- Name: TABLE daily_sales_closures; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7880 (class 0 OID 0)
-- Dependencies: 278
-- Name: COLUMN daily_sales_closures.date; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7881 (class 0 OID 0)
-- Dependencies: 278
-- Name: COLUMN daily_sales_closures.sales_data; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 279 (class 1259 OID 1205066)
-- Name: lats_purchase_order_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_purchase_order_items (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id CHAR(36),
    product_id CHAR(36),
    variant_id CHAR(36),
    quantity_ordered integer NOT NULL,
    quantity_received integer DEFAULT 0,
    unit_cost numeric NOT NULL,
    subtotal numeric NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes text,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7882 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN lats_purchase_order_items.quantity_ordered; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7883 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN lats_purchase_order_items.quantity_received; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 280 (class 1259 OID 1205075)
-- Name: data_quality_issues; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW data_quality_issues AS
 SELECT 'Suspicious Markup'::text AS issue_type,
    pv.id AS variant_id,
    p.name AS product_name,
    pv.variant_name,
    pv.sku,
    pv.cost_price,
    pv.selling_price,
        CASE
            WHEN ((pv.cost_price > (0)::numeric) AND (pv.selling_price > (0)::numeric)) THEN (((((pv.selling_price - pv.cost_price) / pv.cost_price) * (100)::numeric))::text || '%'::text)
            ELSE 'N/A'::text
        END AS markup,
    (EXISTS ( SELECT 1
           FROM lats_purchase_order_items poi
          WHERE (poi.variant_id = pv.id))) AS has_po,
    pv.created_at
   FROM (lats_product_variants pv
     LEFT JOIN lats_products p ON ((pv.product_id = p.id)))
  WHERE ((pv.cost_price > (0)::numeric) AND (pv.selling_price > (0)::numeric) AND ((((pv.selling_price - pv.cost_price) / pv.cost_price) * (100)::numeric) > (100000)::numeric))
UNION ALL
 SELECT 'No Purchase Order'::text AS issue_type,
    pv.id AS variant_id,
    p.name AS product_name,
    pv.variant_name,
    pv.sku,
    pv.cost_price,
    pv.selling_price,
    NULL::text AS markup,
    false AS has_po,
    pv.created_at
   FROM (lats_product_variants pv
     LEFT JOIN lats_products p ON ((pv.product_id = p.id)))
  WHERE ((NOT (EXISTS ( SELECT 1
           FROM lats_purchase_order_items poi
          WHERE (poi.variant_id = pv.id)))) AND (pv.cost_price > (0)::numeric) AND (pv.created_at > (now() - '30 days'::interval)))
UNION ALL
 SELECT 'Selling Below Cost'::text AS issue_type,
    pv.id AS variant_id,
    p.name AS product_name,
    pv.variant_name,
    pv.sku,
    pv.cost_price,
    pv.selling_price,
    (((((pv.selling_price - pv.cost_price) / pv.cost_price) * (100)::numeric))::text || '%'::text) AS markup,
    (EXISTS ( SELECT 1
           FROM lats_purchase_order_items poi
          WHERE (poi.variant_id = pv.id))) AS has_po,
    pv.created_at
   FROM (lats_product_variants pv
     LEFT JOIN lats_products p ON ((pv.product_id = p.id)))
  WHERE ((pv.cost_price > (0)::numeric) AND (pv.selling_price > (0)::numeric) AND (pv.selling_price < pv.cost_price))
UNION ALL
 SELECT 'Zero or Missing Price'::text AS issue_type,
    pv.id AS variant_id,
    p.name AS product_name,
    pv.variant_name,
    pv.sku,
    pv.cost_price,
    pv.selling_price,
    NULL::text AS markup,
    (EXISTS ( SELECT 1
           FROM lats_purchase_order_items poi
          WHERE (poi.variant_id = pv.id))) AS has_po,
    pv.created_at
   FROM (lats_product_variants pv
     LEFT JOIN lats_products p ON ((pv.product_id = p.id)))
  WHERE (((pv.cost_price = (0)::numeric) OR (pv.selling_price = (0)::numeric)) AND (pv.is_active = true))
  ORDER BY 10 DESC;



--
-- TOC entry 7884 (class 0 OID 0)
-- Dependencies: 280
-- Name: VIEW data_quality_issues; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 281 (class 1259 OID 1205080)
-- Name: device_attachments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE device_attachments (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    device_id CHAR(36),
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_type text,
    file_size integer,
    uploaded_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 282 (class 1259 OID 1205087)
-- Name: device_checklists; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE device_checklists (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    device_id CHAR(36),
    checklist_item text NOT NULL,
    is_checked TINYINT(1) DEFAULT 0,
    checked_by CHAR(36),
    checked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 283 (class 1259 OID 1205095)
-- Name: device_ratings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE device_ratings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    device_id CHAR(36),
    customer_id CHAR(36),
    rating integer,
    review_text text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT device_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);



--
-- TOC entry 284 (class 1259 OID 1205103)
-- Name: device_remarks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE device_remarks (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    device_id CHAR(36),
    remark text NOT NULL,
    remark_type text DEFAULT 'general'::text,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 285 (class 1259 OID 1205111)
-- Name: device_transitions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE device_transitions (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    device_id CHAR(36),
    from_status text,
    to_status text NOT NULL,
    transitioned_by CHAR(36),
    transition_notes text,
    transitioned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    performed_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    signature text
);



--
-- TOC entry 286 (class 1259 OID 1205119)
-- Name: devices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE devices (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36),
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
    technician_id CHAR(36),
    intake_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    estimated_completion_date DATETIME,
    actual_completion_date DATETIME,
    pickup_date DATETIME,
    warranty_expiry_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    priority text DEFAULT 'normal'::text,
    password text,
    accessories text,
    issue_description text,
    assigned_to CHAR(36),
    expected_return_date DATETIME,
    estimated_hours integer,
    diagnosis_required TINYINT(1) DEFAULT 0,
    device_notes text,
    device_cost numeric DEFAULT 0,
    repair_cost numeric DEFAULT 0,
    repair_price numeric DEFAULT 0,
    unlock_code text,
    device_condition text,
    diagnostic_checklist JSON,
    branch_id CHAR(36),
    is_shared TINYINT(1) DEFAULT 1
);



--
-- TOC entry 7885 (class 0 OID 0)
-- Dependencies: 286
-- Name: COLUMN devices.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 287 (class 1259 OID 1205139)
-- Name: diagnostic_checklist_results; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE diagnostic_checklist_results (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    device_id CHAR(36),
    problem_template_id CHAR(36),
    checklist_items JSON,
    overall_status text,
    technician_notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);



--
-- TOC entry 288 (class 1259 OID 1205147)
-- Name: diagnostic_checks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE diagnostic_checks (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    request_id CHAR(36),
    check_name text NOT NULL,
    check_result text,
    is_passed TINYINT(1),
    checked_by CHAR(36),
    checked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    diagnostic_device_id CHAR(36)
);



--
-- TOC entry 289 (class 1259 OID 1205154)
-- Name: diagnostic_devices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE diagnostic_devices (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    device_id CHAR(36),
    diagnostic_data JSON,
    diagnostic_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 290 (class 1259 OID 1205162)
-- Name: diagnostic_problem_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE diagnostic_problem_templates (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    problem_name text NOT NULL,
    problem_description text,
    suggested_solutions JSON,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    checklist_items JSON DEFAULT '[]'::JSON
);



--
-- TOC entry 291 (class 1259 OID 1205172)
-- Name: diagnostic_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE diagnostic_requests (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    device_id CHAR(36),
    template_id CHAR(36),
    requested_by CHAR(36),
    status text DEFAULT 'pending'::text,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 292 (class 1259 OID 1205181)
-- Name: diagnostic_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE diagnostic_templates (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    template_name text NOT NULL,
    device_type text,
    checklist_items JSON,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 293 (class 1259 OID 1205190)
-- Name: document_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE document_templates (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    type text NOT NULL,
    name text NOT NULL,
    content text NOT NULL,
    is_default TINYINT(1) DEFAULT 0,
    variables text[] DEFAULT '{}'::text[],
    paper_size text DEFAULT 'A4'::text,
    orientation text DEFAULT 'portrait'::text,
    header_html text,
    footer_html text,
    css_styles text,
    logo_url text,
    show_logo TINYINT(1) DEFAULT 1,
    show_business_info TINYINT(1) DEFAULT 1,
    show_customer_info TINYINT(1) DEFAULT 1,
    show_payment_info TINYINT(1) DEFAULT 1,
    show_terms TINYINT(1) DEFAULT 1,
    terms_text text,
    show_signature TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_templates_orientation_check CHECK ((orientation = ANY (ARRAY['portrait'::text, 'landscape'::text]))),
    CONSTRAINT document_templates_paper_size_check CHECK ((paper_size = ANY (ARRAY['A4'::text, 'Letter'::text, 'Thermal-80mm'::text, 'Thermal-58mm'::text]))),
    CONSTRAINT document_templates_type_check CHECK ((type = ANY (ARRAY['invoice'::text, 'quote'::text, 'purchase_order'::text, 'repair_order'::text, 'receipt'::text])))
);



--
-- TOC entry 294 (class 1259 OID 1205211)
-- Name: email_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE email_logs (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    recipient_email text NOT NULL,
    subject text,
    body text,
    status text DEFAULT 'pending'::text,
    sent_at DATETIME,
    error_message text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 295 (class 1259 OID 1205219)
-- Name: employees; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE employees (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    date_of_birth date,
    gender character varying(20),
    "position" character varying(100) NOT NULL,
    department character varying(100) NOT NULL,
    hire_date date DEFAULT CURRENT_DATE NOT NULL,
    termination_date date,
    employment_type character varying(50) DEFAULT 'full-time'::character varying,
    salary numeric(15,2) DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'TZS'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    performance_rating numeric(3,2) DEFAULT 3.0,
    skills text[],
    manager_id CHAR(36),
    location character varying(255),
    emergency_contact_name character varying(100),
    emergency_contact_phone character varying(50),
    address_line1 character varying(255),
    address_line2 character varying(255),
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country character varying(100) DEFAULT 'Tanzania'::character varying,
    photo_url text,
    bio text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    branch_id CHAR(36),
    can_work_at_all_branches TINYINT(1) DEFAULT 0,
    assigned_branches CHAR(36)[] DEFAULT '{}'::CHAR(36)[],
    is_shared TINYINT(1) DEFAULT 0,
    full_name text,
    is_active TINYINT(1) DEFAULT 1,
    CONSTRAINT employees_performance_rating_check CHECK (((performance_rating >= (0)::numeric) AND (performance_rating <= (5)::numeric)))
);



--
-- TOC entry 7886 (class 0 OID 0)
-- Dependencies: 295
-- Name: COLUMN employees."position"; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7887 (class 0 OID 0)
-- Dependencies: 295
-- Name: COLUMN employees.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7888 (class 0 OID 0)
-- Dependencies: 295
-- Name: COLUMN employees.is_shared; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7889 (class 0 OID 0)
-- Dependencies: 295
-- Name: COLUMN employees.full_name; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7890 (class 0 OID 0)
-- Dependencies: 295
-- Name: COLUMN employees.is_active; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 296 (class 1259 OID 1205239)
-- Name: employee_attendance_summary; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW employee_attendance_summary AS
 SELECT e.id,
    e.first_name,
    e.last_name,
    e.email,
    e."position",
    e.department,
    e.status,
    count(DISTINCT ar.id) FILTER (WHERE ((ar.status)::text = 'present'::text)) AS present_days,
    count(DISTINCT ar.id) AS total_attendance_records,
    round(
        CASE
            WHEN (count(DISTINCT ar.id) > 0) THEN (((count(DISTINCT ar.id) FILTER (WHERE ((ar.status)::text = 'present'::text)))::numeric / (count(DISTINCT ar.id))::numeric) * (100)::numeric)
            ELSE (100)::numeric
        END, 2) AS attendance_rate,
    avg(ar.total_hours) FILTER (WHERE (ar.total_hours > (0)::numeric)) AS avg_hours_per_day,
    sum(ar.overtime_hours) AS total_overtime_hours
   FROM (employees e
     LEFT JOIN attendance_records ar ON ((e.id = ar.employee_id)))
  WHERE ((e.status)::text = 'active'::text)
  GROUP BY e.id, e.first_name, e.last_name, e.email, e."position", e.department, e.status;



--
-- TOC entry 297 (class 1259 OID 1205244)
-- Name: employee_shifts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE employee_shifts (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    employee_id CHAR(36) NOT NULL,
    shift_template_id CHAR(36),
    shift_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    break_duration_minutes integer DEFAULT 0,
    status character varying(50) DEFAULT 'scheduled'::character varying,
    notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by CHAR(36)
);



--
-- TOC entry 298 (class 1259 OID 1205254)
-- Name: employees_backup_migration; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE employees_backup_migration (
    id CHAR(36),
    user_id CHAR(36),
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
    manager_id CHAR(36),
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
    created_at DATETIME,
    updated_at DATETIME,
    created_by CHAR(36),
    updated_by CHAR(36)
);



--
-- TOC entry 299 (class 1259 OID 1205259)
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE expense_categories (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    color text,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 300 (class 1259 OID 1205267)
-- Name: expenses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE expenses (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    branch_id CHAR(36) DEFAULT '00000000-0000-0000-0000-000000000001'::CHAR(36),
    category text,
    description text,
    amount numeric DEFAULT 0 NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reference_number text,
    vendor_name text,
    notes text,
    payment_method text,
    status text DEFAULT 'pending'::text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    purchase_order_id CHAR(36),
    product_id CHAR(36),
    created_by CHAR(36)
);



--
-- TOC entry 7891 (class 0 OID 0)
-- Dependencies: 300
-- Name: TABLE expenses; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7892 (class 0 OID 0)
-- Dependencies: 300
-- Name: COLUMN expenses.purchase_order_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7893 (class 0 OID 0)
-- Dependencies: 300
-- Name: COLUMN expenses.product_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7894 (class 0 OID 0)
-- Dependencies: 300
-- Name: COLUMN expenses.created_by; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 301 (class 1259 OID 1205279)
-- Name: finance_accounts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE finance_accounts (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    account_name text NOT NULL,
    account_type text NOT NULL,
    account_number text,
    bank_name text,
    current_balance numeric DEFAULT 0,
    currency text DEFAULT 'USD'::text,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_payment_method TINYINT(1) DEFAULT 0,
    name text,
    type text,
    balance numeric DEFAULT 0,
    requires_reference TINYINT(1) DEFAULT 0,
    requires_account_number TINYINT(1) DEFAULT 0,
    description text,
    icon text,
    color text,
    branch_id CHAR(36),
    is_shared TINYINT(1) DEFAULT 0,
    notes text
);



--
-- TOC entry 302 (class 1259 OID 1205295)
-- Name: store_locations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE store_locations (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
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
    is_main TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    opening_time time without time zone DEFAULT '09:00:00'::time without time zone,
    closing_time time without time zone DEFAULT '18:00:00'::time without time zone,
    inventory_sync_enabled TINYINT(1) DEFAULT 1,
    pricing_model text DEFAULT 'centralized'::text,
    tax_rate_override numeric(5,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_isolation_mode text DEFAULT 'shared'::text,
    share_products TINYINT(1) DEFAULT 1,
    share_customers TINYINT(1) DEFAULT 1,
    share_inventory TINYINT(1) DEFAULT 0,
    share_suppliers TINYINT(1) DEFAULT 1,
    share_categories TINYINT(1) DEFAULT 1,
    share_employees TINYINT(1) DEFAULT 0,
    allow_stock_transfer TINYINT(1) DEFAULT 1,
    auto_sync_products TINYINT(1) DEFAULT 1,
    auto_sync_prices TINYINT(1) DEFAULT 1,
    require_approval_for_transfers TINYINT(1) DEFAULT 0,
    can_view_other_branches TINYINT(1) DEFAULT 0,
    can_transfer_to_branches text[] DEFAULT '{}'::text[],
    share_sales TINYINT(1) DEFAULT 0,
    share_purchase_orders TINYINT(1) DEFAULT 0,
    share_devices TINYINT(1) DEFAULT 0,
    share_payments TINYINT(1) DEFAULT 0,
    share_appointments TINYINT(1) DEFAULT 0,
    share_reminders TINYINT(1) DEFAULT 0,
    share_expenses TINYINT(1) DEFAULT 0,
    share_trade_ins TINYINT(1) DEFAULT 0,
    share_special_orders TINYINT(1) DEFAULT 0,
    share_attendance TINYINT(1) DEFAULT 0,
    share_loyalty_points TINYINT(1) DEFAULT 0,
    share_accounts TINYINT(1) DEFAULT 1,
    share_gift_cards TINYINT(1) DEFAULT 1,
    share_quality_checks TINYINT(1) DEFAULT 0,
    share_recurring_expenses TINYINT(1) DEFAULT 0,
    share_communications TINYINT(1) DEFAULT 0,
    share_reports TINYINT(1) DEFAULT 0,
    share_finance_transfers TINYINT(1) DEFAULT 0,
    CONSTRAINT store_locations_data_isolation_mode_check CHECK ((data_isolation_mode = ANY (ARRAY['shared'::text, 'isolated'::text, 'hybrid'::text]))),
    CONSTRAINT store_locations_pricing_model_check CHECK ((pricing_model = ANY (ARRAY['centralized'::text, 'location-specific'::text])))
);



--
-- TOC entry 7895 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN store_locations.data_isolation_mode; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7896 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN store_locations.share_products; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7897 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN store_locations.share_customers; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7898 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN store_locations.share_inventory; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7899 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN store_locations.share_suppliers; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7900 (class 0 OID 0)
-- Dependencies: 302
-- Name: COLUMN store_locations.share_accounts; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 303 (class 1259 OID 1205343)
-- Name: finance_accounts_with_branches; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW finance_accounts_with_branches AS
 SELECT fa.id,
    fa.account_name,
    fa.account_type,
    fa.account_number,
    fa.bank_name,
    fa.current_balance,
    fa.currency,
    fa.is_active,
    fa.created_at,
    fa.updated_at,
    fa.is_payment_method,
    fa.name,
    fa.type,
    fa.balance,
    fa.requires_reference,
    fa.requires_account_number,
    fa.description,
    fa.icon,
    fa.color,
    fa.branch_id,
    fa.is_shared,
    fa.notes,
    sl.name AS branch_name,
    sl.code AS branch_code,
    sl.is_main AS is_main_branch,
    sl.data_isolation_mode,
        CASE
            WHEN fa.is_shared THEN 'Shared'::text
            WHEN (fa.branch_id IS NOT NULL) THEN 'Branch-Specific'::text
            ELSE 'Unassigned'::text
        END AS isolation_status
   FROM (finance_accounts fa
     LEFT JOIN store_locations sl ON ((fa.branch_id = sl.id)));



--
-- TOC entry 7901 (class 0 OID 0)
-- Dependencies: 303
-- Name: VIEW finance_accounts_with_branches; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 304 (class 1259 OID 1205348)
-- Name: finance_expense_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE finance_expense_categories (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    category_name text NOT NULL,
    description text,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_shared TINYINT(1) DEFAULT 1
);



--
-- TOC entry 305 (class 1259 OID 1205357)
-- Name: finance_expenses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE finance_expenses (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    expense_category_id CHAR(36),
    account_id CHAR(36),
    expense_date date NOT NULL,
    amount numeric NOT NULL,
    description text,
    receipt_number text,
    vendor text,
    payment_method text DEFAULT 'cash'::text,
    created_by CHAR(36),
    approved_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    branch_id CHAR(36),
    title text,
    status text DEFAULT 'approved'::text,
    receipt_url text,
    CONSTRAINT finance_expenses_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);



--
-- TOC entry 306 (class 1259 OID 1205368)
-- Name: finance_transfers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE finance_transfers (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    from_account_id CHAR(36),
    to_account_id CHAR(36),
    transfer_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    amount numeric NOT NULL,
    description text,
    reference_number text,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    branch_id CHAR(36),
    is_shared TINYINT(1) DEFAULT 0
);



--
-- TOC entry 307 (class 1259 OID 1205377)
-- Name: gift_card_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE gift_card_transactions (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    gift_card_id CHAR(36),
    transaction_type text NOT NULL,
    amount numeric NOT NULL,
    balance_after numeric NOT NULL,
    sale_id CHAR(36),
    notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    branch_id CHAR(36)
);



--
-- TOC entry 7902 (class 0 OID 0)
-- Dependencies: 307
-- Name: COLUMN gift_card_transactions.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 308 (class 1259 OID 1205384)
-- Name: gift_cards; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE gift_cards (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    card_number text NOT NULL,
    initial_balance numeric NOT NULL,
    current_balance numeric NOT NULL,
    customer_id CHAR(36),
    status text DEFAULT 'active'::text,
    issued_by CHAR(36),
    issued_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    branch_id CHAR(36),
    is_shared TINYINT(1) DEFAULT 1
);



--
-- TOC entry 309 (class 1259 OID 1205395)
-- Name: imei_validation; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE imei_validation (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    imei text NOT NULL,
    imei_status text NOT NULL,
    validation_reason text,
    source_table text,
    source_id CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT imei_validation_imei_status_check CHECK ((imei_status = ANY (ARRAY['valid'::text, 'invalid'::text, 'duplicate'::text, 'empty'::text])))
);



--
-- TOC entry 310 (class 1259 OID 1205404)
-- Name: installment_payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE installment_payments (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    device_id CHAR(36),
    customer_id CHAR(36),
    total_amount numeric DEFAULT 0,
    paid_amount numeric DEFAULT 0,
    remaining_amount numeric DEFAULT 0,
    installment_count integer DEFAULT 1,
    installment_amount numeric DEFAULT 0,
    next_due_date date,
    status text DEFAULT 'active'::text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    installment_plan_id CHAR(36),
    installment_number integer DEFAULT 1 NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    payment_method text DEFAULT 'cash'::text NOT NULL,
    due_date date DEFAULT CURRENT_DATE NOT NULL,
    account_id CHAR(36),
    reference_number text,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    days_late integer DEFAULT 0,
    late_fee numeric DEFAULT 0,
    notification_sent TINYINT(1) DEFAULT 0,
    notification_sent_at DATETIME,
    notes text,
    created_by CHAR(36),
    branch_id CHAR(36)
);



--
-- TOC entry 7903 (class 0 OID 0)
-- Dependencies: 310
-- Name: TABLE installment_payments; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7904 (class 0 OID 0)
-- Dependencies: 310
-- Name: COLUMN installment_payments.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 311 (class 1259 OID 1205426)
-- Name: installment_plans; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW installment_plans AS
 SELECT id,
    plan_number,
    customer_id,
    sale_id,
    branch_id,
    total_amount,
    down_payment,
    amount_financed,
    total_paid,
    balance_due,
    installment_amount,
    number_of_installments,
    installments_paid,
    payment_frequency,
    start_date,
    next_payment_date,
    end_date,
    completion_date,
    status,
    late_fee_amount,
    late_fee_applied,
    days_overdue,
    last_reminder_sent,
    reminder_count,
    terms_accepted,
    terms_accepted_date,
    notes,
    created_by,
    created_at,
    updated_at
   FROM customer_installment_plans;



--
-- TOC entry 312 (class 1259 OID 1205431)
-- Name: integrations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE integrations (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    integration_name text NOT NULL,
    integration_type text NOT NULL,
    api_key text,
    api_secret text,
    config JSON,
    is_active TINYINT(1) DEFAULT 1,
    last_sync DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 313 (class 1259 OID 1205440)
-- Name: inventory; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE inventory (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    branch_id CHAR(36),
    quantity integer DEFAULT 0 NOT NULL,
    reserved_quantity integer DEFAULT 0,
    min_stock_level integer DEFAULT 0,
    max_stock_level integer,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 314 (class 1259 OID 1205449)
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE inventory_items (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    serial_number text,
    imei text,
    mac_address text,
    barcode text,
    status text DEFAULT 'available'::text,
    location text,
    shelf text,
    bin text,
    purchase_date DATETIME,
    warranty_start date,
    warranty_end date,
    cost_price numeric(10,2) DEFAULT 0 NOT NULL,
    selling_price numeric(10,2),
    metadata JSON,
    notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    purchase_order_id CHAR(36),
    purchase_order_item_id CHAR(36),
    branch_id CHAR(36),
    is_shared TINYINT(1) DEFAULT 0,
    visible_to_branches CHAR(36)[],
    sharing_mode text DEFAULT 'isolated'::text,
    CONSTRAINT inventory_items_sharing_mode_check CHECK ((sharing_mode = ANY (ARRAY['isolated'::text, 'shared'::text, 'custom'::text]))),
    CONSTRAINT inventory_items_status_check CHECK ((status = ANY (ARRAY['available'::text, 'sold'::text, 'reserved'::text, 'damaged'::text, 'returned'::text, 'in_transit'::text, 'pending_pricing'::text, 'on_hold'::text, 'pending_quality_check'::text])))
);



--
-- TOC entry 7905 (class 0 OID 0)
-- Dependencies: 314
-- Name: TABLE inventory_items; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7906 (class 0 OID 0)
-- Dependencies: 314
-- Name: COLUMN inventory_items.serial_number; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7907 (class 0 OID 0)
-- Dependencies: 314
-- Name: COLUMN inventory_items.imei; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7908 (class 0 OID 0)
-- Dependencies: 314
-- Name: COLUMN inventory_items.metadata; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7909 (class 0 OID 0)
-- Dependencies: 314
-- Name: COLUMN inventory_items.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7910 (class 0 OID 0)
-- Dependencies: 314
-- Name: COLUMN inventory_items.is_shared; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 315 (class 1259 OID 1205463)
-- Name: inventory_settings_view; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW inventory_settings_view AS
 SELECT setting_key,
    setting_value,
    setting_type,
    description,
    is_active,
    updated_at
   FROM admin_settings
  WHERE (((category)::text = 'inventory'::text) AND (is_active = true))
  ORDER BY setting_key;



--
-- TOC entry 316 (class 1259 OID 1205467)
-- Name: lats_branches; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_branches (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location text,
    phone text,
    email text,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 317 (class 1259 OID 1205476)
-- Name: lats_brands; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_brands (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 318 (class 1259 OID 1205485)
-- Name: lats_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_categories (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    color text,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    parent_id CHAR(36),
    sort_order integer DEFAULT 0,
    metadata JSON DEFAULT '{}'::JSON,
    branch_id CHAR(36),
    is_shared TINYINT(1) DEFAULT 1
);



--
-- TOC entry 7911 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN lats_categories.is_shared; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 319 (class 1259 OID 1205497)
-- Name: lats_data_audit_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_data_audit_log (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id CHAR(36) NOT NULL,
    field_name text NOT NULL,
    old_value text,
    new_value text,
    change_reason text,
    change_source text,
    changed_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7912 (class 0 OID 0)
-- Dependencies: 319
-- Name: TABLE lats_data_audit_log; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 320 (class 1259 OID 1205504)
-- Name: lats_employees; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_employees (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    "position" text,
    branch_id CHAR(36) DEFAULT '00000000-0000-0000-0000-000000000001'::CHAR(36),
    salary numeric DEFAULT 0,
    hire_date date DEFAULT CURRENT_DATE,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 321 (class 1259 OID 1205516)
-- Name: lats_inventory_adjustments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_inventory_adjustments (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    product_id CHAR(36),
    variant_id CHAR(36),
    quantity integer NOT NULL,
    type text NOT NULL,
    reason text,
    notes text,
    reference_id CHAR(36),
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lats_inventory_adjustments_type_check CHECK ((type = ANY (ARRAY['purchase_order'::text, 'sale'::text, 'return'::text, 'adjustment'::text, 'damage'::text, 'transfer'::text])))
);



--
-- TOC entry 322 (class 1259 OID 1205524)
-- Name: lats_inventory_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_inventory_items (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id CHAR(36),
    purchase_order_item_id CHAR(36),
    product_id CHAR(36),
    variant_id CHAR(36),
    serial_number text,
    imei text,
    mac_address text,
    barcode text,
    status text DEFAULT 'pending'::text,
    location text,
    shelf text,
    bin text,
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    warranty_start date,
    warranty_end date,
    cost_price numeric(10,2) DEFAULT 0 NOT NULL,
    selling_price numeric(10,2),
    quality_check_status text DEFAULT 'pending'::text,
    quality_check_notes text,
    quality_checked_at DATETIME,
    quality_checked_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    branch_id CHAR(36),
    quantity integer DEFAULT 1,
    storage_room_id CHAR(36),
    CONSTRAINT lats_inventory_items_quality_check_status_check CHECK ((quality_check_status = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text]))),
    CONSTRAINT lats_inventory_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'received'::text, 'in_stock'::text, 'sold'::text, 'returned'::text, 'damaged'::text, 'quality_checked'::text])))
);



--
-- TOC entry 7913 (class 0 OID 0)
-- Dependencies: 322
-- Name: TABLE lats_inventory_items; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7914 (class 0 OID 0)
-- Dependencies: 322
-- Name: COLUMN lats_inventory_items.serial_number; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7915 (class 0 OID 0)
-- Dependencies: 322
-- Name: COLUMN lats_inventory_items.imei; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7916 (class 0 OID 0)
-- Dependencies: 322
-- Name: COLUMN lats_inventory_items.mac_address; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7917 (class 0 OID 0)
-- Dependencies: 322
-- Name: COLUMN lats_inventory_items.barcode; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7918 (class 0 OID 0)
-- Dependencies: 322
-- Name: COLUMN lats_inventory_items.status; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7919 (class 0 OID 0)
-- Dependencies: 322
-- Name: COLUMN lats_inventory_items.quality_check_status; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7920 (class 0 OID 0)
-- Dependencies: 322
-- Name: COLUMN lats_inventory_items.quantity; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7921 (class 0 OID 0)
-- Dependencies: 322
-- Name: COLUMN lats_inventory_items.storage_room_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 323 (class 1259 OID 1205539)
-- Name: lats_pos_advanced_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_pos_advanced_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    business_id CHAR(36),
    enable_performance_mode TINYINT(1) DEFAULT 1,
    enable_caching TINYINT(1) DEFAULT 1,
    cache_size integer DEFAULT 100,
    enable_lazy_loading TINYINT(1) DEFAULT 1,
    max_concurrent_requests integer DEFAULT 5,
    enable_database_optimization TINYINT(1) DEFAULT 1,
    enable_auto_backup TINYINT(1) DEFAULT 0,
    backup_frequency text DEFAULT 'daily'::text,
    enable_data_compression TINYINT(1) DEFAULT 0,
    enable_query_optimization TINYINT(1) DEFAULT 1,
    enable_two_factor_auth TINYINT(1) DEFAULT 0,
    enable_session_timeout TINYINT(1) DEFAULT 1,
    session_timeout_minutes integer DEFAULT 60,
    enable_audit_logging TINYINT(1) DEFAULT 0,
    enable_encryption TINYINT(1) DEFAULT 0,
    enable_api_access TINYINT(1) DEFAULT 0,
    enable_webhooks TINYINT(1) DEFAULT 0,
    enable_third_party_integrations TINYINT(1) DEFAULT 0,
    enable_data_sync TINYINT(1) DEFAULT 1,
    sync_interval integer DEFAULT 300000,
    enable_debug_mode TINYINT(1) DEFAULT 0,
    enable_error_reporting TINYINT(1) DEFAULT 1,
    enable_performance_monitoring TINYINT(1) DEFAULT 0,
    enable_logging TINYINT(1) DEFAULT 1,
    log_level text DEFAULT 'error'::text,
    enable_experimental_features TINYINT(1) DEFAULT 0,
    enable_beta_features TINYINT(1) DEFAULT 0,
    enable_custom_scripts TINYINT(1) DEFAULT 0,
    enable_plugin_system TINYINT(1) DEFAULT 0,
    enable_auto_updates TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7922 (class 0 OID 0)
-- Dependencies: 323
-- Name: TABLE lats_pos_advanced_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 324 (class 1259 OID 1205577)
-- Name: lats_pos_analytics_reporting_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_pos_analytics_reporting_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    business_id CHAR(36),
    enable_analytics TINYINT(1) DEFAULT 1,
    enable_real_time_analytics TINYINT(1) DEFAULT 1,
    analytics_refresh_interval integer DEFAULT 30000,
    enable_data_export TINYINT(1) DEFAULT 1,
    enable_sales_analytics TINYINT(1) DEFAULT 1,
    enable_sales_trends TINYINT(1) DEFAULT 1,
    enable_product_performance TINYINT(1) DEFAULT 1,
    enable_customer_analytics TINYINT(1) DEFAULT 1,
    enable_revenue_tracking TINYINT(1) DEFAULT 1,
    enable_inventory_analytics TINYINT(1) DEFAULT 1,
    enable_stock_alerts TINYINT(1) DEFAULT 1,
    enable_low_stock_reports TINYINT(1) DEFAULT 1,
    enable_inventory_turnover TINYINT(1) DEFAULT 1,
    enable_supplier_analytics TINYINT(1) DEFAULT 0,
    enable_automated_reports TINYINT(1) DEFAULT 0,
    report_generation_time text DEFAULT '08:00'::text,
    enable_email_reports TINYINT(1) DEFAULT 0,
    enable_pdf_reports TINYINT(1) DEFAULT 1,
    enable_excel_reports TINYINT(1) DEFAULT 1,
    enable_custom_dashboard TINYINT(1) DEFAULT 1,
    enable_kpi_widgets TINYINT(1) DEFAULT 1,
    enable_chart_animations TINYINT(1) DEFAULT 1,
    enable_data_drill_down TINYINT(1) DEFAULT 1,
    enable_comparative_analysis TINYINT(1) DEFAULT 1,
    enable_predictive_analytics TINYINT(1) DEFAULT 0,
    enable_data_retention TINYINT(1) DEFAULT 1,
    data_retention_days integer DEFAULT 365,
    enable_data_backup TINYINT(1) DEFAULT 1,
    enable_api_export TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7923 (class 0 OID 0)
-- Dependencies: 324
-- Name: TABLE lats_pos_analytics_reporting_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 325 (class 1259 OID 1205614)
-- Name: lats_pos_barcode_scanner_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_pos_barcode_scanner_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    business_id CHAR(36),
    enable_barcode_scanner TINYINT(1) DEFAULT 1,
    enable_camera_scanner TINYINT(1) DEFAULT 0,
    enable_keyboard_input TINYINT(1) DEFAULT 1,
    enable_manual_entry TINYINT(1) DEFAULT 1,
    auto_add_to_cart TINYINT(1) DEFAULT 1,
    auto_focus_search TINYINT(1) DEFAULT 1,
    play_sound_on_scan TINYINT(1) DEFAULT 1,
    vibrate_on_scan TINYINT(1) DEFAULT 0,
    show_scan_feedback TINYINT(1) DEFAULT 1,
    show_invalid_barcode_alert TINYINT(1) DEFAULT 1,
    allow_unknown_products TINYINT(1) DEFAULT 0,
    prompt_for_unknown_products TINYINT(1) DEFAULT 1,
    retry_on_error TINYINT(1) DEFAULT 1,
    max_retry_attempts integer DEFAULT 3,
    scanner_device_name text,
    scanner_connection_type text DEFAULT 'usb'::text,
    scanner_timeout integer DEFAULT 5000,
    support_ean13 TINYINT(1) DEFAULT 1,
    support_ean8 TINYINT(1) DEFAULT 1,
    support_upc_a TINYINT(1) DEFAULT 1,
    support_upc_e TINYINT(1) DEFAULT 1,
    support_code128 TINYINT(1) DEFAULT 1,
    support_code39 TINYINT(1) DEFAULT 1,
    support_qr_code TINYINT(1) DEFAULT 1,
    support_data_matrix TINYINT(1) DEFAULT 0,
    enable_continuous_scanning TINYINT(1) DEFAULT 0,
    scan_delay integer DEFAULT 500,
    enable_scan_history TINYINT(1) DEFAULT 1,
    max_scan_history integer DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7924 (class 0 OID 0)
-- Dependencies: 325
-- Name: TABLE lats_pos_barcode_scanner_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 326 (class 1259 OID 1205650)
-- Name: lats_pos_delivery_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_pos_delivery_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    business_id CHAR(36),
    enable_delivery TINYINT(1) DEFAULT 1,
    default_delivery_fee numeric(10,2) DEFAULT 5000,
    free_delivery_threshold numeric(10,2) DEFAULT 50000,
    max_delivery_distance integer DEFAULT 20,
    enable_delivery_areas TINYINT(1) DEFAULT 0,
    delivery_areas text[] DEFAULT ARRAY[]::text[],
    area_delivery_fees JSON DEFAULT '{}'::JSON,
    area_delivery_times JSON DEFAULT '{}'::JSON,
    enable_delivery_hours TINYINT(1) DEFAULT 0,
    delivery_start_time text DEFAULT '08:00'::text,
    delivery_end_time text DEFAULT '18:00'::text,
    enable_same_day_delivery TINYINT(1) DEFAULT 1,
    enable_next_day_delivery TINYINT(1) DEFAULT 1,
    delivery_time_slots text[] DEFAULT ARRAY[]::text[],
    notify_customer_on_delivery TINYINT(1) DEFAULT 1,
    notify_driver_on_assignment TINYINT(1) DEFAULT 1,
    enable_sms_notifications TINYINT(1) DEFAULT 0,
    enable_email_notifications TINYINT(1) DEFAULT 0,
    enable_driver_assignment TINYINT(1) DEFAULT 0,
    driver_commission numeric(5,2) DEFAULT 10,
    require_signature TINYINT(1) DEFAULT 0,
    enable_driver_tracking TINYINT(1) DEFAULT 0,
    enable_scheduled_delivery TINYINT(1) DEFAULT 0,
    enable_partial_delivery TINYINT(1) DEFAULT 0,
    require_advance_payment TINYINT(1) DEFAULT 0,
    advance_payment_percent numeric(5,2) DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7925 (class 0 OID 0)
-- Dependencies: 326
-- Name: TABLE lats_pos_delivery_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 327 (class 1259 OID 1205684)
-- Name: lats_pos_dynamic_pricing_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_pos_dynamic_pricing_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    business_id text,
    enable_dynamic_pricing TINYINT(1) DEFAULT 0,
    enable_loyalty_pricing TINYINT(1) DEFAULT 0,
    enable_bulk_pricing TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    enable_time_based_pricing TINYINT(1) DEFAULT 0,
    enable_customer_pricing TINYINT(1) DEFAULT 0,
    enable_special_events TINYINT(1) DEFAULT 0,
    loyalty_discount_percent numeric(5,2) DEFAULT 0,
    loyalty_points_threshold integer DEFAULT 100,
    loyalty_max_discount numeric(5,2) DEFAULT 20,
    bulk_discount_enabled TINYINT(1) DEFAULT 0,
    bulk_discount_threshold integer DEFAULT 10,
    bulk_discount_percent numeric(5,2) DEFAULT 5,
    time_based_discount_enabled TINYINT(1) DEFAULT 0,
    time_based_start_time text DEFAULT '00:00'::text,
    time_based_end_time text DEFAULT '23:59'::text,
    time_based_discount_percent numeric(5,2) DEFAULT 0,
    customer_pricing_enabled TINYINT(1) DEFAULT 0,
    vip_customer_discount numeric(5,2) DEFAULT 10,
    regular_customer_discount numeric(5,2) DEFAULT 5,
    special_events_enabled TINYINT(1) DEFAULT 0,
    special_event_discount_percent numeric(5,2) DEFAULT 15,
    CONSTRAINT check_bulk_discount_percent CHECK (((bulk_discount_percent >= (0)::numeric) AND (bulk_discount_percent <= (100)::numeric))),
    CONSTRAINT check_bulk_discount_threshold CHECK ((bulk_discount_threshold >= 1)),
    CONSTRAINT check_loyalty_discount_percent CHECK (((loyalty_discount_percent >= (0)::numeric) AND (loyalty_discount_percent <= (100)::numeric))),
    CONSTRAINT check_time_based_discount_percent CHECK (((time_based_discount_percent >= (0)::numeric) AND (time_based_discount_percent <= (100)::numeric)))
);



--
-- TOC entry 7926 (class 0 OID 0)
-- Dependencies: 327
-- Name: TABLE lats_pos_dynamic_pricing_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7927 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN lats_pos_dynamic_pricing_settings.enable_dynamic_pricing; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7928 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN lats_pos_dynamic_pricing_settings.enable_loyalty_pricing; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7929 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN lats_pos_dynamic_pricing_settings.enable_bulk_pricing; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7930 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN lats_pos_dynamic_pricing_settings.enable_time_based_pricing; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7931 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN lats_pos_dynamic_pricing_settings.loyalty_discount_percent; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7932 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN lats_pos_dynamic_pricing_settings.bulk_discount_threshold; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7933 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN lats_pos_dynamic_pricing_settings.bulk_discount_percent; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7934 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN lats_pos_dynamic_pricing_settings.time_based_start_time; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7935 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN lats_pos_dynamic_pricing_settings.time_based_end_time; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7936 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN lats_pos_dynamic_pricing_settings.time_based_discount_percent; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 328 (class 1259 OID 1205717)
-- Name: lats_pos_general_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_pos_general_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    business_id text,
    theme text DEFAULT 'light'::text,

    currency text DEFAULT 'USD'::text,
    timezone text DEFAULT 'UTC'::text,
    date_format text DEFAULT 'MM/DD/YYYY'::text,
    time_format text DEFAULT '12'::text,
    show_product_images TINYINT(1) DEFAULT 1,
    show_stock_levels TINYINT(1) DEFAULT 1,
    show_prices TINYINT(1) DEFAULT 1,
    show_barcodes TINYINT(1) DEFAULT 1,
    products_per_page integer DEFAULT 20,
    auto_complete_search TINYINT(1) DEFAULT 1,
    confirm_delete TINYINT(1) DEFAULT 1,
    show_confirmations TINYINT(1) DEFAULT 1,
    enable_sound_effects TINYINT(1) DEFAULT 1,
    sound_volume numeric(3,2) DEFAULT 0.5,
    enable_click_sounds TINYINT(1) DEFAULT 1,
    enable_cart_sounds TINYINT(1) DEFAULT 1,
    enable_payment_sounds TINYINT(1) DEFAULT 1,
    enable_delete_sounds TINYINT(1) DEFAULT 1,
    enable_animations TINYINT(1) DEFAULT 1,
    enable_caching TINYINT(1) DEFAULT 1,
    cache_duration integer DEFAULT 300000,
    enable_lazy_loading TINYINT(1) DEFAULT 1,
    max_search_results integer DEFAULT 50,
    enable_tax TINYINT(1) DEFAULT 0,
    tax_rate numeric(5,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    day_closing_passcode character varying(255) DEFAULT '1234'::character varying,
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
    auto_backup_enabled TINYINT(1) DEFAULT 0,
    auto_backup_frequency text DEFAULT 'daily'::text,
    auto_backup_time text DEFAULT '02:00'::text,
    auto_backup_type text DEFAULT 'full'::text,
    last_auto_backup DATETIME,
    font_size text DEFAULT 'medium'::text,
    products_per_row integer DEFAULT 4,
    CONSTRAINT lats_pos_general_settings_auto_backup_frequency_check CHECK ((auto_backup_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text]))),
    CONSTRAINT lats_pos_general_settings_auto_backup_type_check CHECK ((auto_backup_type = ANY (ARRAY['full'::text, 'schema-only'::text, 'data-only'::text]))),
    CONSTRAINT lats_pos_general_settings_font_size_check CHECK ((font_size = ANY (ARRAY['tiny'::text, 'extra-small'::text, 'small'::text, 'medium'::text, 'large'::text]))),
    CONSTRAINT lats_pos_general_settings_logo_position_check CHECK ((logo_position = ANY (ARRAY['left'::text, 'center'::text, 'right'::text]))),
    CONSTRAINT lats_pos_general_settings_logo_size_check CHECK ((logo_size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text]))),
    CONSTRAINT lats_pos_general_settings_products_per_row_check CHECK (((products_per_row >= 2) AND (products_per_row <= 12)))
);



--
-- TOC entry 7937 (class 0 OID 0)
-- Dependencies: 328
-- Name: TABLE lats_pos_general_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7938 (class 0 OID 0)
-- Dependencies: 328
-- Name: COLUMN lats_pos_general_settings.products_per_row; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 329 (class 1259 OID 1205778)
-- Name: lats_pos_integrations_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_pos_integrations_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36) NOT NULL,
    business_id CHAR(36),
    integration_name text NOT NULL,
    integration_type text NOT NULL,
    provider_name text,
    is_enabled TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 0,
    is_test_mode TINYINT(1) DEFAULT 1,
    credentials JSON DEFAULT '{}'::JSON,
    config JSON DEFAULT '{}'::JSON,
    description text,
    webhook_url text,
    callback_url text,
    environment text DEFAULT 'test'::text,
    last_used_at DATETIME,
    total_requests integer DEFAULT 0,
    successful_requests integer DEFAULT 0,
    failed_requests integer DEFAULT 0,
    notes text,
    metadata JSON DEFAULT '{}'::JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lats_pos_integrations_settings_environment_check CHECK ((environment = ANY (ARRAY['test'::text, 'production'::text, 'sandbox'::text])))
);



--
-- TOC entry 330 (class 1259 OID 1205797)
-- Name: lats_pos_loyalty_customer_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_pos_loyalty_customer_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    business_id text,
    enable_loyalty TINYINT(1) DEFAULT 0,
    points_per_dollar numeric(5,2) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    enable_loyalty_program TINYINT(1) DEFAULT 1,
    loyalty_program_name text DEFAULT 'Loyalty Rewards'::text,
    points_per_currency numeric DEFAULT 1,
    points_redemption_rate numeric DEFAULT 100,
    minimum_points_redemption integer DEFAULT 500,
    points_expiry_days integer DEFAULT 365,
    enable_customer_registration TINYINT(1) DEFAULT 1,
    require_customer_info TINYINT(1) DEFAULT 0,
    enable_customer_categories TINYINT(1) DEFAULT 1,
    enable_customer_tags TINYINT(1) DEFAULT 1,
    enable_customer_notes TINYINT(1) DEFAULT 1,
    enable_automatic_rewards TINYINT(1) DEFAULT 1,
    enable_manual_rewards TINYINT(1) DEFAULT 1,
    enable_birthday_rewards TINYINT(1) DEFAULT 1,
    enable_anniversary_rewards TINYINT(1) DEFAULT 0,
    enable_referral_rewards TINYINT(1) DEFAULT 0,
    enable_email_communication TINYINT(1) DEFAULT 0,
    enable_sms_communication TINYINT(1) DEFAULT 0,
    enable_push_notifications TINYINT(1) DEFAULT 0,
    enable_marketing_emails TINYINT(1) DEFAULT 0,
    enable_customer_analytics TINYINT(1) DEFAULT 1,
    enable_purchase_history TINYINT(1) DEFAULT 1,
    enable_spending_patterns TINYINT(1) DEFAULT 1,
    enable_customer_segmentation TINYINT(1) DEFAULT 0,
    enable_customer_insights TINYINT(1) DEFAULT 0
);



--
-- TOC entry 7939 (class 0 OID 0)
-- Dependencies: 330
-- Name: TABLE lats_pos_loyalty_customer_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 331 (class 1259 OID 1205832)
-- Name: lats_pos_notification_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_pos_notification_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    business_id CHAR(36),
    enable_notifications TINYINT(1) DEFAULT 1,
    enable_sound_notifications TINYINT(1) DEFAULT 1,
    enable_visual_notifications TINYINT(1) DEFAULT 1,
    enable_push_notifications TINYINT(1) DEFAULT 0,
    notification_timeout integer DEFAULT 5000,
    enable_sales_notifications TINYINT(1) DEFAULT 1,
    notify_on_sale_completion TINYINT(1) DEFAULT 1,
    notify_on_refund TINYINT(1) DEFAULT 1,
    notify_on_void TINYINT(1) DEFAULT 1,
    notify_on_discount TINYINT(1) DEFAULT 0,
    enable_inventory_notifications TINYINT(1) DEFAULT 1,
    notify_on_low_stock TINYINT(1) DEFAULT 1,
    low_stock_threshold integer DEFAULT 10,
    notify_on_out_of_stock TINYINT(1) DEFAULT 1,
    notify_on_stock_adjustment TINYINT(1) DEFAULT 0,
    enable_customer_notifications TINYINT(1) DEFAULT 0,
    notify_on_customer_registration TINYINT(1) DEFAULT 0,
    notify_on_loyalty_points TINYINT(1) DEFAULT 0,
    notify_on_customer_birthday TINYINT(1) DEFAULT 0,
    notify_on_customer_anniversary TINYINT(1) DEFAULT 0,
    enable_system_notifications TINYINT(1) DEFAULT 1,
    notify_on_system_errors TINYINT(1) DEFAULT 1,
    notify_on_backup_completion TINYINT(1) DEFAULT 0,
    notify_on_sync_completion TINYINT(1) DEFAULT 0,
    notify_on_maintenance TINYINT(1) DEFAULT 1,
    enable_email_notifications TINYINT(1) DEFAULT 0,
    enable_sms_notifications TINYINT(1) DEFAULT 0,
    enable_in_app_notifications TINYINT(1) DEFAULT 1,
    enable_desktop_notifications TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    whatsapp_closing_message text DEFAULT ''::text
);



--
-- TOC entry 7940 (class 0 OID 0)
-- Dependencies: 331
-- Name: TABLE lats_pos_notification_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 332 (class 1259 OID 1205872)
-- Name: lats_pos_receipt_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_pos_receipt_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    business_id text,
    receipt_template text DEFAULT 'standard'::text,
    receipt_width integer DEFAULT 80,
    receipt_font_size integer DEFAULT 12,
    show_business_logo TINYINT(1) DEFAULT 1,
    show_business_name TINYINT(1) DEFAULT 1,
    show_business_address TINYINT(1) DEFAULT 1,
    show_business_phone TINYINT(1) DEFAULT 1,
    show_business_email TINYINT(1) DEFAULT 1,
    show_business_website TINYINT(1) DEFAULT 0,
    show_transaction_id TINYINT(1) DEFAULT 1,
    show_date_time TINYINT(1) DEFAULT 1,
    show_cashier_name TINYINT(1) DEFAULT 1,
    show_customer_name TINYINT(1) DEFAULT 1,
    show_customer_phone TINYINT(1) DEFAULT 0,
    show_product_names TINYINT(1) DEFAULT 1,
    show_product_skus TINYINT(1) DEFAULT 0,
    show_product_barcodes TINYINT(1) DEFAULT 0,
    show_quantities TINYINT(1) DEFAULT 1,
    show_unit_prices TINYINT(1) DEFAULT 1,
    show_discounts TINYINT(1) DEFAULT 1,
    show_subtotal TINYINT(1) DEFAULT 1,
    show_tax TINYINT(1) DEFAULT 1,
    show_discount_total TINYINT(1) DEFAULT 1,
    show_grand_total TINYINT(1) DEFAULT 1,
    show_payment_method TINYINT(1) DEFAULT 1,
    show_change_amount TINYINT(1) DEFAULT 1,
    auto_print_receipt TINYINT(1) DEFAULT 0,
    print_duplicate_receipt TINYINT(1) DEFAULT 0,
    enable_email_receipt TINYINT(1) DEFAULT 1,
    enable_sms_receipt TINYINT(1) DEFAULT 0,
    enable_receipt_numbering TINYINT(1) DEFAULT 1,
    receipt_number_prefix text DEFAULT 'RCP'::text,
    receipt_number_start integer DEFAULT 1000,
    receipt_number_format text DEFAULT 'RCP-{number}'::text,
    show_footer_message TINYINT(1) DEFAULT 1,
    footer_message text DEFAULT 'Thank you for your business!'::text,
    show_return_policy TINYINT(1) DEFAULT 0,
    return_policy_text text DEFAULT '30-day return policy'::text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    enable_whatsapp_pdf TINYINT(1) DEFAULT 1,
    whatsapp_pdf_auto_send TINYINT(1) DEFAULT 0,
    whatsapp_pdf_show_preview TINYINT(1) DEFAULT 1,
    whatsapp_pdf_format text DEFAULT 'a4'::text,
    whatsapp_pdf_quality text DEFAULT 'standard'::text,
    whatsapp_pdf_include_logo TINYINT(1) DEFAULT 1,
    whatsapp_pdf_include_images TINYINT(1) DEFAULT 0,
    whatsapp_pdf_include_qr TINYINT(1) DEFAULT 1,
    whatsapp_pdf_include_barcode TINYINT(1) DEFAULT 0,
    whatsapp_pdf_message text DEFAULT 'Thank you for your purchase! Please find your receipt attached.'::text,
    enable_email_pdf TINYINT(1) DEFAULT 1,
    enable_print_pdf TINYINT(1) DEFAULT 1,
    enable_download_pdf TINYINT(1) DEFAULT 1,
    show_share_button TINYINT(1) DEFAULT 1,
    sms_header_message text DEFAULT 'Thank you for your purchase!'::text,
    sms_footer_message text DEFAULT 'Thank you for choosing us!'::text,
    CONSTRAINT whatsapp_pdf_format_check CHECK ((whatsapp_pdf_format = ANY (ARRAY['a4'::text, 'letter'::text, 'thermal'::text]))),
    CONSTRAINT whatsapp_pdf_quality_check CHECK ((whatsapp_pdf_quality = ANY (ARRAY['high'::text, 'standard'::text, 'compressed'::text])))
);



--
-- TOC entry 7941 (class 0 OID 0)
-- Dependencies: 332
-- Name: TABLE lats_pos_receipt_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7942 (class 0 OID 0)
-- Dependencies: 332
-- Name: COLUMN lats_pos_receipt_settings.sms_header_message; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7943 (class 0 OID 0)
-- Dependencies: 332
-- Name: COLUMN lats_pos_receipt_settings.sms_footer_message; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 333 (class 1259 OID 1205936)
-- Name: lats_pos_search_filter_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_pos_search_filter_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    business_id CHAR(36),
    enable_product_search TINYINT(1) DEFAULT 1,
    enable_customer_search TINYINT(1) DEFAULT 1,
    enable_sales_search TINYINT(1) DEFAULT 1,
    search_by_name TINYINT(1) DEFAULT 1,
    search_by_barcode TINYINT(1) DEFAULT 1,
    search_by_sku TINYINT(1) DEFAULT 1,
    search_by_category TINYINT(1) DEFAULT 1,
    search_by_supplier TINYINT(1) DEFAULT 1,
    search_by_description TINYINT(1) DEFAULT 1,
    search_by_tags TINYINT(1) DEFAULT 1,
    enable_fuzzy_search TINYINT(1) DEFAULT 1,
    enable_autocomplete TINYINT(1) DEFAULT 1,
    min_search_length integer DEFAULT 2,
    max_search_results integer DEFAULT 50,
    search_timeout integer DEFAULT 5000,
    search_debounce_time integer DEFAULT 300,
    enable_search_history TINYINT(1) DEFAULT 1,
    max_search_history integer DEFAULT 50,
    enable_recent_searches TINYINT(1) DEFAULT 1,
    enable_popular_searches TINYINT(1) DEFAULT 1,
    enable_search_suggestions TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7944 (class 0 OID 0)
-- Dependencies: 333
-- Name: TABLE lats_pos_search_filter_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 334 (class 1259 OID 1205963)
-- Name: lats_pos_user_permissions_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_pos_user_permissions_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    business_id text,
    permissions JSON DEFAULT '[]'::JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    enable_pos_access TINYINT(1) DEFAULT 1,
    enable_sales_access TINYINT(1) DEFAULT 1,
    enable_refunds_access TINYINT(1) DEFAULT 1,
    enable_void_access TINYINT(1) DEFAULT 0,
    enable_discount_access TINYINT(1) DEFAULT 1,
    enable_inventory_view TINYINT(1) DEFAULT 1,
    enable_inventory_edit TINYINT(1) DEFAULT 1,
    enable_stock_adjustments TINYINT(1) DEFAULT 1,
    enable_product_creation TINYINT(1) DEFAULT 1,
    enable_product_deletion TINYINT(1) DEFAULT 0,
    enable_customer_view TINYINT(1) DEFAULT 1,
    enable_customer_creation TINYINT(1) DEFAULT 1,
    enable_customer_edit TINYINT(1) DEFAULT 1,
    enable_customer_deletion TINYINT(1) DEFAULT 0,
    enable_customer_history TINYINT(1) DEFAULT 1,
    enable_payment_processing TINYINT(1) DEFAULT 1,
    enable_cash_management TINYINT(1) DEFAULT 1,
    enable_daily_reports TINYINT(1) DEFAULT 1,
    enable_financial_reports TINYINT(1) DEFAULT 0,
    enable_tax_management TINYINT(1) DEFAULT 0,
    enable_settings_access TINYINT(1) DEFAULT 0,
    enable_user_management TINYINT(1) DEFAULT 0,
    enable_backup_restore TINYINT(1) DEFAULT 0,
    enable_system_maintenance TINYINT(1) DEFAULT 0,
    enable_api_access TINYINT(1) DEFAULT 0,
    enable_audit_logs TINYINT(1) DEFAULT 0,
    enable_security_settings TINYINT(1) DEFAULT 0,
    enable_password_reset TINYINT(1) DEFAULT 0,
    enable_session_management TINYINT(1) DEFAULT 0,
    enable_data_export TINYINT(1) DEFAULT 1
);



--
-- TOC entry 7945 (class 0 OID 0)
-- Dependencies: 334
-- Name: TABLE lats_pos_user_permissions_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 335 (class 1259 OID 1206002)
-- Name: lats_product_units; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_product_units (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    parent_variant_id CHAR(36) NOT NULL,
    imei text NOT NULL,
    status text DEFAULT 'in_stock'::text,
    sale_id CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    product_id CHAR(36)
);



--
-- TOC entry 336 (class 1259 OID 1206010)
-- Name: lats_product_validation; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_product_validation (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    product_id CHAR(36),
    shipping_id CHAR(36),
    is_validated TINYINT(1) DEFAULT 0,
    validation_errors text[],
    validated_by CHAR(36),
    validated_at DATETIME,
    updated_cost_price numeric(10,2),
    updated_selling_price numeric(10,2),
    updated_supplier_id CHAR(36),
    updated_category_id CHAR(36),
    updated_product_name text,
    updated_product_description text,
    updated_notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 337 (class 1259 OID 1206019)
-- Name: lats_purchase_order_audit_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_purchase_order_audit_log (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id CHAR(36) NOT NULL,
    action text NOT NULL,
    old_status text,
    new_status text,
    user_id CHAR(36) NOT NULL,
    notes text,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7946 (class 0 OID 0)
-- Dependencies: 337
-- Name: TABLE lats_purchase_order_audit_log; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 338 (class 1259 OID 1206026)
-- Name: lats_purchase_order_payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_purchase_order_payments (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id CHAR(36) NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    reference_number text,
    notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    branch_id CHAR(36)
);



--
-- TOC entry 7947 (class 0 OID 0)
-- Dependencies: 338
-- Name: TABLE lats_purchase_order_payments; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7948 (class 0 OID 0)
-- Dependencies: 338
-- Name: COLUMN lats_purchase_order_payments.amount; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7949 (class 0 OID 0)
-- Dependencies: 338
-- Name: COLUMN lats_purchase_order_payments.payment_method; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7950 (class 0 OID 0)
-- Dependencies: 338
-- Name: COLUMN lats_purchase_order_payments.reference_number; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7951 (class 0 OID 0)
-- Dependencies: 338
-- Name: COLUMN lats_purchase_order_payments.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 339 (class 1259 OID 1206035)
-- Name: lats_purchase_order_shipping; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_purchase_order_shipping (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id CHAR(36) NOT NULL,
    shipping_method_id CHAR(36),
    shipping_method_code text,
    shipping_agent_id CHAR(36),
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
    use_same_address TINYINT(1) DEFAULT 1,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_shipping_status CHECK ((shipping_status = ANY (ARRAY['pending'::text, 'preparing'::text, 'in_transit'::text, 'customs'::text, 'delivered'::text, 'cancelled'::text])))
);



--
-- TOC entry 7952 (class 0 OID 0)
-- Dependencies: 339
-- Name: TABLE lats_purchase_order_shipping; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7953 (class 0 OID 0)
-- Dependencies: 339
-- Name: COLUMN lats_purchase_order_shipping.use_same_address; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7954 (class 0 OID 0)
-- Dependencies: 339
-- Name: COLUMN lats_purchase_order_shipping.shipping_status; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 340 (class 1259 OID 1206055)
-- Name: lats_receipts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_receipts (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    sale_id CHAR(36),
    receipt_number text NOT NULL,
    customer_name text,
    customer_phone text,
    total_amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    items_count integer NOT NULL,
    generated_by text,
    receipt_content JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- TOC entry 7955 (class 0 OID 0)
-- Dependencies: 340
-- Name: TABLE lats_receipts; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 341 (class 1259 OID 1206063)
-- Name: lats_sale_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_sale_items (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    sale_id CHAR(36),
    product_id CHAR(36),
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    discount numeric DEFAULT 0,
    subtotal numeric DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    variant_id CHAR(36),
    variant_name text,
    sku text,
    total_price numeric(15,2) DEFAULT 0,
    cost_price numeric DEFAULT 0,
    profit numeric DEFAULT 0,
    branch_id CHAR(36) DEFAULT '00000000-0000-0000-0000-000000000001'::CHAR(36),
    CONSTRAINT lats_sale_items_total_price_check CHECK (((total_price >= (0)::numeric) AND (total_price <= (100000000)::numeric)))
);



--
-- TOC entry 342 (class 1259 OID 1206077)
-- Name: lats_sales; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_sales (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    sale_number text NOT NULL,
    customer_id CHAR(36),
    user_id CHAR(36),
    total_amount numeric(15,2) DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    tax_amount numeric DEFAULT 0,
    final_amount numeric DEFAULT 0,
    payment_status text DEFAULT 'completed'::text,
    status text DEFAULT 'completed'::text,
    notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    subtotal numeric(12,2) DEFAULT 0,
    tax numeric(12,2) DEFAULT 0,
    sold_by text,
    customer_email text,
    customer_name text,
    customer_phone text,
    discount numeric DEFAULT 0,
    branch_id CHAR(36),
    payment_method JSON,
    CONSTRAINT lats_sales_total_amount_check CHECK (((total_amount >= (0)::numeric) AND (total_amount <= (1000000000)::numeric)))
);



--
-- TOC entry 7956 (class 0 OID 0)
-- Dependencies: 342
-- Name: COLUMN lats_sales.user_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7957 (class 0 OID 0)
-- Dependencies: 342
-- Name: COLUMN lats_sales.sold_by; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7958 (class 0 OID 0)
-- Dependencies: 342
-- Name: COLUMN lats_sales.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 343 (class 1259 OID 1206095)
-- Name: lats_shipping; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_shipping (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id CHAR(36),
    shipping_method text,
    tracking_number text,
    carrier text,
    estimated_arrival_date date,
    actual_arrival_date date,
    status text DEFAULT 'pending'::text,
    shipping_cost numeric(10,2),
    shipping_address text,
    notes text,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 344 (class 1259 OID 1206104)
-- Name: lats_shipping_agents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_shipping_agents (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
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
    is_active TINYINT(1) DEFAULT 1,
    is_preferred TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by CHAR(36),
    CONSTRAINT lats_shipping_agents_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);



--
-- TOC entry 7959 (class 0 OID 0)
-- Dependencies: 344
-- Name: TABLE lats_shipping_agents; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7960 (class 0 OID 0)
-- Dependencies: 344
-- Name: COLUMN lats_shipping_agents.shipping_methods; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7961 (class 0 OID 0)
-- Dependencies: 344
-- Name: COLUMN lats_shipping_agents.rating; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 345 (class 1259 OID 1206122)
-- Name: lats_shipping_cargo_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_shipping_cargo_items (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    shipping_id CHAR(36),
    product_id CHAR(36),
    purchase_order_item_id CHAR(36),
    quantity integer DEFAULT 0 NOT NULL,
    cost_price numeric(10,2),
    description text,
    notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 346 (class 1259 OID 1206131)
-- Name: lats_shipping_methods; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_shipping_methods (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    estimated_days_min integer,
    estimated_days_max integer,
    cost_multiplier numeric DEFAULT 1.0,
    display_order integer DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7962 (class 0 OID 0)
-- Dependencies: 346
-- Name: TABLE lats_shipping_methods; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 347 (class 1259 OID 1206142)
-- Name: lats_shipping_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_shipping_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
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
    default_shipping_method_id CHAR(36),
    default_agent_id CHAR(36),
    notify_on_shipment TINYINT(1) DEFAULT 1,
    notify_on_arrival TINYINT(1) DEFAULT 1,
    notification_email text,
    notification_phone text,
    auto_calculate_shipping TINYINT(1) DEFAULT 0,
    include_insurance TINYINT(1) DEFAULT 1,
    insurance_percentage numeric DEFAULT 2.0,
    user_id CHAR(36),
    branch_id CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7963 (class 0 OID 0)
-- Dependencies: 347
-- Name: TABLE lats_shipping_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 348 (class 1259 OID 1206158)
-- Name: lats_spare_part_usage; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_spare_part_usage (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    spare_part_id CHAR(36),
    device_id CHAR(36),
    quantity integer NOT NULL,
    reason text,
    notes text,
    used_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 349 (class 1259 OID 1206166)
-- Name: lats_spare_part_variants; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_spare_part_variants (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    spare_part_id CHAR(36) NOT NULL,
    name text NOT NULL,
    sku text,
    cost_price numeric(12,2) DEFAULT 0,
    selling_price numeric(12,2) DEFAULT 0,
    quantity integer DEFAULT 0,
    min_quantity integer DEFAULT 0,
    attributes JSON DEFAULT '{}'::JSON,
    image_url text,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 350 (class 1259 OID 1206180)
-- Name: lats_spare_parts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_spare_parts (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text,
    part_number text,
    quantity integer DEFAULT 0,
    selling_price numeric DEFAULT 0,
    cost_price numeric DEFAULT 0,
    category_id CHAR(36),
    brand text,
    description text,
    condition text,
    location text,
    min_quantity integer DEFAULT 0,
    compatible_devices text,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    supplier_id CHAR(36),
    unit_price numeric DEFAULT 0
);



--
-- TOC entry 7964 (class 0 OID 0)
-- Dependencies: 350
-- Name: COLUMN lats_spare_parts.unit_price; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 351 (class 1259 OID 1206194)
-- Name: lats_stock_movements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_stock_movements (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    product_id CHAR(36),
    variant_id CHAR(36),
    movement_type text NOT NULL,
    quantity integer NOT NULL,
    reference_type text,
    reference_id CHAR(36),
    notes text,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    from_branch_id CHAR(36),
    to_branch_id CHAR(36),
    branch_id CHAR(36),
    previous_quantity integer,
    new_quantity integer,
    reason text,
    reference text
);



--
-- TOC entry 7965 (class 0 OID 0)
-- Dependencies: 351
-- Name: TABLE lats_stock_movements; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7966 (class 0 OID 0)
-- Dependencies: 351
-- Name: COLUMN lats_stock_movements.previous_quantity; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7967 (class 0 OID 0)
-- Dependencies: 351
-- Name: COLUMN lats_stock_movements.new_quantity; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7968 (class 0 OID 0)
-- Dependencies: 351
-- Name: COLUMN lats_stock_movements.reason; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7969 (class 0 OID 0)
-- Dependencies: 351
-- Name: COLUMN lats_stock_movements.reference; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 352 (class 1259 OID 1206201)
-- Name: lats_stock_transfers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_stock_transfers (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    transfer_number text,
    from_branch_id CHAR(36),
    to_branch_id CHAR(36),
    product_id CHAR(36),
    variant_id CHAR(36),
    quantity integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text,
    requested_by CHAR(36),
    approved_by CHAR(36),
    notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    metadata JSON DEFAULT '{}'::JSON,
    CONSTRAINT lats_stock_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'in_transit'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text])))
);



--
-- TOC entry 7970 (class 0 OID 0)
-- Dependencies: 352
-- Name: TABLE lats_stock_transfers; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 353 (class 1259 OID 1206213)
-- Name: lats_store_rooms; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_store_rooms (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    location text,
    capacity integer,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    store_location_id CHAR(36),
    code text,
    floor_level integer DEFAULT 0,
    area_sqm numeric,
    max_capacity integer,
    current_capacity integer DEFAULT 0,
    is_secure TINYINT(1) DEFAULT 0,
    requires_access_card TINYINT(1) DEFAULT 0,
    color_code text,
    notes text
);



--
-- TOC entry 7971 (class 0 OID 0)
-- Dependencies: 353
-- Name: TABLE lats_store_rooms; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 354 (class 1259 OID 1206226)
-- Name: lats_storage_rooms; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW lats_storage_rooms AS
 SELECT id,
    name,
    description,
    location,
    capacity,
    is_active,
    created_at,
    updated_at,
    store_location_id,
    code,
    floor_level,
    area_sqm,
    max_capacity,
    current_capacity,
    is_secure,
    requires_access_card,
    color_code,
    notes
   FROM lats_store_rooms;



--
-- TOC entry 355 (class 1259 OID 1206230)
-- Name: lats_store_locations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_store_locations (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
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
    is_active TINYINT(1) DEFAULT 1,
    is_main_branch TINYINT(1) DEFAULT 0,
    has_repair_service TINYINT(1) DEFAULT 0,
    has_sales_service TINYINT(1) DEFAULT 1,
    has_delivery_service TINYINT(1) DEFAULT 0,
    store_size_sqm numeric,
    current_staff_count integer DEFAULT 0,
    monthly_target numeric DEFAULT 0,
    opening_hours JSON,
    priority_order integer DEFAULT 0,
    latitude numeric,
    longitude numeric,
    timezone text DEFAULT 'Africa/Dar_es_Salaam'::text,
    notes text,
    metadata JSON DEFAULT '{}'::JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 356 (class 1259 OID 1206249)
-- Name: lats_store_shelves; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_store_shelves (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    room_id CHAR(36),
    name text NOT NULL,
    "position" text,
    capacity integer,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    store_location_id CHAR(36),
    storage_room_id CHAR(36),
    code text,
    description text,
    shelf_type text DEFAULT 'standard'::text,
    section text,
    aisle text,
    row_number integer,
    column_number integer,
    max_capacity integer,
    current_capacity integer DEFAULT 0,
    floor_level integer DEFAULT 0,
    zone text,
    is_accessible TINYINT(1) DEFAULT 1,
    requires_ladder TINYINT(1) DEFAULT 0,
    is_refrigerated TINYINT(1) DEFAULT 0,
    priority_order integer DEFAULT 0,
    color_code text,
    barcode text,
    notes text,
    images text[] DEFAULT ARRAY[]::text[],
    created_by CHAR(36),
    updated_by CHAR(36)
);



--
-- TOC entry 7972 (class 0 OID 0)
-- Dependencies: 356
-- Name: TABLE lats_store_shelves; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 357 (class 1259 OID 1206266)
-- Name: lats_supplier_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_supplier_categories (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    color text,
    parent_id CHAR(36),
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7973 (class 0 OID 0)
-- Dependencies: 357
-- Name: TABLE lats_supplier_categories; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 358 (class 1259 OID 1206275)
-- Name: lats_supplier_category_mapping; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_supplier_category_mapping (
    supplier_id CHAR(36) NOT NULL,
    category_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7974 (class 0 OID 0)
-- Dependencies: 358
-- Name: TABLE lats_supplier_category_mapping; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 359 (class 1259 OID 1206279)
-- Name: lats_supplier_communications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_supplier_communications (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    supplier_id CHAR(36),
    communication_type text NOT NULL,
    direction text DEFAULT 'outbound'::text,
    subject text,
    message text,
    notes text,
    contact_person text,
    response_time_hours integer,
    follow_up_required TINYINT(1) DEFAULT 0,
    follow_up_date date,
    user_id CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7975 (class 0 OID 0)
-- Dependencies: 359
-- Name: TABLE lats_supplier_communications; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 360 (class 1259 OID 1206289)
-- Name: lats_supplier_contracts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_supplier_contracts (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    supplier_id CHAR(36),
    contract_number text,
    contract_name text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    contract_value numeric(15,2),
    currency text DEFAULT 'TZS'::text,
    auto_renew TINYINT(1) DEFAULT 0,
    renewal_notice_days integer DEFAULT 30,
    payment_terms text,
    terms_and_conditions text,
    document_url text,
    status text DEFAULT 'active'::text,
    notes text,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7976 (class 0 OID 0)
-- Dependencies: 360
-- Name: TABLE lats_supplier_contracts; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 361 (class 1259 OID 1206301)
-- Name: lats_supplier_documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_supplier_documents (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    supplier_id CHAR(36),
    document_type text NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    mime_type text,
    expiry_date date,
    notes text,
    uploaded_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7977 (class 0 OID 0)
-- Dependencies: 361
-- Name: TABLE lats_supplier_documents; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 362 (class 1259 OID 1206309)
-- Name: lats_supplier_ratings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_supplier_ratings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    supplier_id CHAR(36),
    purchase_order_id CHAR(36),
    overall_rating integer,
    quality_rating integer,
    delivery_rating integer,
    communication_rating integer,
    price_rating integer,
    review_text text,
    pros text,
    cons text,
    would_recommend TINYINT(1) DEFAULT 1,
    rated_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lats_supplier_ratings_communication_rating_check CHECK (((communication_rating >= 1) AND (communication_rating <= 5))),
    CONSTRAINT lats_supplier_ratings_delivery_rating_check CHECK (((delivery_rating >= 1) AND (delivery_rating <= 5))),
    CONSTRAINT lats_supplier_ratings_overall_rating_check CHECK (((overall_rating >= 1) AND (overall_rating <= 5))),
    CONSTRAINT lats_supplier_ratings_price_rating_check CHECK (((price_rating >= 1) AND (price_rating <= 5))),
    CONSTRAINT lats_supplier_ratings_quality_rating_check CHECK (((quality_rating >= 1) AND (quality_rating <= 5)))
);



--
-- TOC entry 7978 (class 0 OID 0)
-- Dependencies: 362
-- Name: TABLE lats_supplier_ratings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 363 (class 1259 OID 1206323)
-- Name: lats_supplier_tag_mapping; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_supplier_tag_mapping (
    supplier_id CHAR(36) NOT NULL,
    tag_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 364 (class 1259 OID 1206327)
-- Name: lats_supplier_tags; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_supplier_tags (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text,
    description text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7979 (class 0 OID 0)
-- Dependencies: 364
-- Name: TABLE lats_supplier_tags; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 365 (class 1259 OID 1206334)
-- Name: lats_trade_in_contracts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_trade_in_contracts (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    contract_number text NOT NULL,
    transaction_id CHAR(36),
    customer_id CHAR(36) NOT NULL,
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
    customer_agreed_terms TINYINT(1) DEFAULT 0,
    customer_signature_data text,
    staff_signature_data text,
    customer_signed_at DATETIME,
    staff_signed_at DATETIME,
    witness_name text,
    witness_signature_data text,
    witness_signed_at DATETIME,
    status text DEFAULT 'draft'::text,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    voided_at DATETIME,
    voided_by CHAR(36),
    void_reason text
);



--
-- TOC entry 7980 (class 0 OID 0)
-- Dependencies: 365
-- Name: TABLE lats_trade_in_contracts; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 366 (class 1259 OID 1206344)
-- Name: lats_trade_in_damage_assessments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_trade_in_damage_assessments (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    transaction_id CHAR(36),
    damage_type text NOT NULL,
    damage_description text,
    spare_part_id CHAR(36),
    spare_part_name text,
    deduction_amount numeric DEFAULT 0 NOT NULL,
    assessed_by CHAR(36),
    assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    damage_photos JSON
);



--
-- TOC entry 7981 (class 0 OID 0)
-- Dependencies: 366
-- Name: TABLE lats_trade_in_damage_assessments; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 367 (class 1259 OID 1206352)
-- Name: lats_trade_in_prices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_trade_in_prices (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    product_id CHAR(36),
    variant_id CHAR(36),
    device_name text NOT NULL,
    device_model text NOT NULL,
    base_trade_in_price numeric DEFAULT 0 NOT NULL,
    branch_id CHAR(36),
    excellent_multiplier numeric DEFAULT 1.0,
    good_multiplier numeric DEFAULT 0.85,
    fair_multiplier numeric DEFAULT 0.70,
    poor_multiplier numeric DEFAULT 0.50,
    notes text,
    is_active TINYINT(1) DEFAULT 1,
    created_by CHAR(36),
    updated_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7982 (class 0 OID 0)
-- Dependencies: 367
-- Name: TABLE lats_trade_in_prices; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 368 (class 1259 OID 1206366)
-- Name: lats_trade_in_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_trade_in_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 7983 (class 0 OID 0)
-- Dependencies: 368
-- Name: TABLE lats_trade_in_settings; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 369 (class 1259 OID 1206374)
-- Name: lats_trade_in_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_trade_in_transactions (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    transaction_number text NOT NULL,
    customer_id CHAR(36) NOT NULL,
    branch_id CHAR(36) DEFAULT '00000000-0000-0000-0000-000000000001'::CHAR(36),
    device_name text NOT NULL,
    device_model text NOT NULL,
    device_imei text,
    device_serial_number text,
    base_trade_in_price numeric DEFAULT 0 NOT NULL,
    condition_rating text NOT NULL,
    condition_multiplier numeric DEFAULT 1.0 NOT NULL,
    condition_description text,
    total_damage_deductions numeric DEFAULT 0,
    damage_items JSON,
    final_trade_in_value numeric DEFAULT 0 NOT NULL,
    new_product_id CHAR(36),
    new_variant_id CHAR(36),
    new_device_price numeric,
    customer_payment_amount numeric DEFAULT 0,
    contract_id CHAR(36),
    contract_signed TINYINT(1) DEFAULT 0,
    contract_signed_at DATETIME,
    customer_signature_data text,
    staff_signature_data text,
    customer_id_number text,
    customer_id_type text,
    customer_id_photo_url text,
    device_photos JSON,
    status text DEFAULT 'pending'::text,
    inventory_item_id CHAR(36),
    needs_repair TINYINT(1) DEFAULT 0,
    repair_status text,
    repair_cost numeric DEFAULT 0,
    ready_for_resale TINYINT(1) DEFAULT 0,
    resale_price numeric,
    sale_id CHAR(36),
    created_by CHAR(36),
    approved_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    completed_at DATETIME,
    staff_notes text,
    internal_notes text
);



--
-- TOC entry 7984 (class 0 OID 0)
-- Dependencies: 369
-- Name: TABLE lats_trade_in_transactions; Type: COMMENT; Schema: public; Owner: neondb_owner
--



