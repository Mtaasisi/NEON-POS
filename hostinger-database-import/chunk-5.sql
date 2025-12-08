-- Dependencies: 405
-- Name: sales_pipeline_sale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 5813 (class 2606 OID 1207097)
-- Name: users_sync users_sync_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: neondb_owner
--

ALTER TABLE neon_auth.users_sync
    ADD CONSTRAINT users_sync_pkey PRIMARY KEY (id);


--
-- TOC entry 5815 (class 2606 OID 1207099)
-- Name: account_transactions account_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE account_transactions
    ADD CONSTRAINT account_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5832 (class 2606 OID 1207101)
-- Name: admin_settings admin_settings_category_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE admin_settings
    ADD CONSTRAINT admin_settings_category_setting_key_key UNIQUE (category, setting_key);


--
-- TOC entry 5839 (class 2606 OID 1207103)
-- Name: admin_settings_log admin_settings_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE admin_settings_log
    ADD CONSTRAINT admin_settings_log_pkey PRIMARY KEY (id);


--
-- TOC entry 5834 (class 2606 OID 1207105)
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5843 (class 2606 OID 1207107)
-- Name: api_keys api_keys_key_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE api_keys
    ADD CONSTRAINT api_keys_key_key UNIQUE (key);


--
-- TOC entry 5845 (class 2606 OID 1207109)
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- TOC entry 5850 (class 2606 OID 1207111)
-- Name: api_request_logs api_request_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE api_request_logs
    ADD CONSTRAINT api_request_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5855 (class 2606 OID 1207113)
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- TOC entry 5858 (class 2606 OID 1207115)
-- Name: attendance_records attendance_records_employee_id_attendance_date_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_employee_id_attendance_date_key UNIQUE (employee_id, attendance_date);


--
-- TOC entry 5860 (class 2606 OID 1207117)
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- TOC entry 5867 (class 2606 OID 1207119)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5869 (class 2606 OID 1207121)
-- Name: auth_users auth_users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE auth_users
    ADD CONSTRAINT auth_users_email_key UNIQUE (email);


--
-- TOC entry 5871 (class 2606 OID 1207123)
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);


--
-- TOC entry 5874 (class 2606 OID 1207125)
-- Name: auto_reorder_log auto_reorder_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE auto_reorder_log
    ADD CONSTRAINT auto_reorder_log_pkey PRIMARY KEY (id);


--
-- TOC entry 5974 (class 2606 OID 1207127)
-- Name: backup_logs backup_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE backup_logs
    ADD CONSTRAINT backup_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5979 (class 2606 OID 1207129)
-- Name: branch_activity_log branch_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE branch_activity_log
    ADD CONSTRAINT branch_activity_log_pkey PRIMARY KEY (id);


--
-- TOC entry 5985 (class 2606 OID 1207131)
-- Name: branch_transfers branch_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE branch_transfers
    ADD CONSTRAINT branch_transfers_pkey PRIMARY KEY (id);


--
-- TOC entry 5993 (class 2606 OID 1207133)
-- Name: buyer_details buyer_details_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE buyer_details
    ADD CONSTRAINT buyer_details_pkey PRIMARY KEY (buyer_id);


--
-- TOC entry 5997 (class 2606 OID 1207135)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5999 (class 2606 OID 1207137)
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 6001 (class 2606 OID 1207139)
-- Name: communication_log communication_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE communication_log
    ADD CONSTRAINT communication_log_pkey PRIMARY KEY (log_id);


--
-- TOC entry 6004 (class 2606 OID 1207141)
-- Name: communication_templates communication_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE communication_templates
    ADD CONSTRAINT communication_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6006 (class 2606 OID 1207143)
-- Name: contact_history contact_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE contact_history
    ADD CONSTRAINT contact_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6008 (class 2606 OID 1207145)
-- Name: contact_methods contact_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE contact_methods
    ADD CONSTRAINT contact_methods_pkey PRIMARY KEY (id);


--
-- TOC entry 6010 (class 2606 OID 1207147)
-- Name: contact_preferences contact_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE contact_preferences
    ADD CONSTRAINT contact_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 6012 (class 2606 OID 1207149)
-- Name: customer_checkins customer_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_checkins
    ADD CONSTRAINT customer_checkins_pkey PRIMARY KEY (id);


--
-- TOC entry 6016 (class 2606 OID 1207151)
-- Name: customer_communications customer_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_communications
    ADD CONSTRAINT customer_communications_pkey PRIMARY KEY (id);


--
-- TOC entry 6022 (class 2606 OID 1207153)
-- Name: customer_fix_backup customer_fix_backup_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_fix_backup
    ADD CONSTRAINT customer_fix_backup_pkey PRIMARY KEY (backup_id);


--
-- TOC entry 6024 (class 2606 OID 1207155)
-- Name: customer_installment_plan_payments customer_installment_plan_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_installment_plan_payments
    ADD CONSTRAINT customer_installment_plan_payments_pkey PRIMARY KEY (id);


--
-- TOC entry 6028 (class 2606 OID 1207157)
-- Name: customer_installment_plans customer_installment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_installment_plans
    ADD CONSTRAINT customer_installment_plans_pkey PRIMARY KEY (id);


--
-- TOC entry 6030 (class 2606 OID 1207159)
-- Name: customer_installment_plans customer_installment_plans_plan_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_installment_plans
    ADD CONSTRAINT customer_installment_plans_plan_number_key UNIQUE (plan_number);


--
-- TOC entry 6037 (class 2606 OID 1207161)
-- Name: customer_messages customer_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_messages
    ADD CONSTRAINT customer_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 6046 (class 2606 OID 1207163)
-- Name: customer_notes customer_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_notes
    ADD CONSTRAINT customer_notes_pkey PRIMARY KEY (id);


--
-- TOC entry 6048 (class 2606 OID 1207165)
-- Name: customer_payments customer_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_payments
    ADD CONSTRAINT customer_payments_pkey PRIMARY KEY (id);


--
-- TOC entry 6061 (class 2606 OID 1207167)
-- Name: customer_points_history customer_points_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_points_history
    ADD CONSTRAINT customer_points_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6064 (class 2606 OID 1207169)
-- Name: customer_preferences customer_preferences_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_preferences
    ADD CONSTRAINT customer_preferences_customer_id_key UNIQUE (customer_id);


--
-- TOC entry 6066 (class 2606 OID 1207171)
-- Name: customer_preferences customer_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_preferences
    ADD CONSTRAINT customer_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 6069 (class 2606 OID 1207173)
-- Name: customer_revenue customer_revenue_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_revenue
    ADD CONSTRAINT customer_revenue_pkey PRIMARY KEY (id);


--
-- TOC entry 6071 (class 2606 OID 1207175)
-- Name: customer_special_orders customer_special_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_special_orders
    ADD CONSTRAINT customer_special_orders_order_number_key UNIQUE (order_number);


--
-- TOC entry 6073 (class 2606 OID 1207177)
-- Name: customer_special_orders customer_special_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_special_orders
    ADD CONSTRAINT customer_special_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 6098 (class 2606 OID 1207179)
-- Name: whatsapp_customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE whatsapp_customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- TOC entry 6104 (class 2606 OID 1207181)
-- Name: daily_opening_sessions daily_opening_sessions_date_is_active_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE daily_opening_sessions
    ADD CONSTRAINT daily_opening_sessions_date_is_active_key UNIQUE (date, is_active);


--
-- TOC entry 6106 (class 2606 OID 1207183)
-- Name: daily_opening_sessions daily_opening_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE daily_opening_sessions
    ADD CONSTRAINT daily_opening_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 6112 (class 2606 OID 1207185)
-- Name: daily_reports daily_reports_employee_id_report_date_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE daily_reports
    ADD CONSTRAINT daily_reports_employee_id_report_date_key UNIQUE (user_id, report_date);


--
-- TOC entry 6114 (class 2606 OID 1207187)
-- Name: daily_reports daily_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE daily_reports
    ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 6121 (class 2606 OID 1207189)
-- Name: daily_sales_closures daily_sales_closures_date_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE daily_sales_closures
    ADD CONSTRAINT daily_sales_closures_date_key UNIQUE (date);


--
-- TOC entry 6123 (class 2606 OID 1207191)
-- Name: daily_sales_closures daily_sales_closures_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE daily_sales_closures
    ADD CONSTRAINT daily_sales_closures_pkey PRIMARY KEY (id);


--
-- TOC entry 6133 (class 2606 OID 1207193)
-- Name: device_attachments device_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE device_attachments
    ADD CONSTRAINT device_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 6135 (class 2606 OID 1207195)
-- Name: device_checklists device_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE device_checklists
    ADD CONSTRAINT device_checklists_pkey PRIMARY KEY (id);


--
-- TOC entry 6137 (class 2606 OID 1207197)
-- Name: device_ratings device_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE device_ratings
    ADD CONSTRAINT device_ratings_pkey PRIMARY KEY (id);


--
-- TOC entry 6139 (class 2606 OID 1207199)
-- Name: device_remarks device_remarks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE device_remarks
    ADD CONSTRAINT device_remarks_pkey PRIMARY KEY (id);


--
-- TOC entry 6141 (class 2606 OID 1207201)
-- Name: device_transitions device_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE device_transitions
    ADD CONSTRAINT device_transitions_pkey PRIMARY KEY (id);


--
-- TOC entry 6143 (class 2606 OID 1207203)
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- TOC entry 6150 (class 2606 OID 1207205)
-- Name: diagnostic_checklist_results diagnostic_checklist_results_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_checklist_results
    ADD CONSTRAINT diagnostic_checklist_results_pkey PRIMARY KEY (id);


--
-- TOC entry 6152 (class 2606 OID 1207207)
-- Name: diagnostic_checks diagnostic_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_checks
    ADD CONSTRAINT diagnostic_checks_pkey PRIMARY KEY (id);


--
-- TOC entry 6154 (class 2606 OID 1207209)
-- Name: diagnostic_devices diagnostic_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_devices
    ADD CONSTRAINT diagnostic_devices_pkey PRIMARY KEY (id);


--
-- TOC entry 6156 (class 2606 OID 1207211)
-- Name: diagnostic_problem_templates diagnostic_problem_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_problem_templates
    ADD CONSTRAINT diagnostic_problem_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6158 (class 2606 OID 1207213)
-- Name: diagnostic_requests diagnostic_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_requests
    ADD CONSTRAINT diagnostic_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 6160 (class 2606 OID 1207215)
-- Name: diagnostic_templates diagnostic_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_templates
    ADD CONSTRAINT diagnostic_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6162 (class 2606 OID 1207217)
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6167 (class 2606 OID 1207219)
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 6181 (class 2606 OID 1207221)
-- Name: employee_shifts employee_shifts_employee_id_shift_date_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE employee_shifts
    ADD CONSTRAINT employee_shifts_employee_id_shift_date_key UNIQUE (employee_id, shift_date);


--
-- TOC entry 6183 (class 2606 OID 1207223)
-- Name: employee_shifts employee_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE employee_shifts
    ADD CONSTRAINT employee_shifts_pkey PRIMARY KEY (id);


--
-- TOC entry 6169 (class 2606 OID 1207225)
-- Name: employees employees_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE employees
    ADD CONSTRAINT employees_email_key UNIQUE (email);


--
-- TOC entry 6171 (class 2606 OID 1207227)
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- TOC entry 6188 (class 2606 OID 1207229)
-- Name: expense_categories expense_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE expense_categories
    ADD CONSTRAINT expense_categories_name_key UNIQUE (name);


--
-- TOC entry 6190 (class 2606 OID 1207231)
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 6192 (class 2606 OID 1207233)
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- TOC entry 6201 (class 2606 OID 1207235)
-- Name: finance_accounts finance_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE finance_accounts
    ADD CONSTRAINT finance_accounts_pkey PRIMARY KEY (id);


--
-- TOC entry 6218 (class 2606 OID 1207237)
-- Name: finance_expense_categories finance_expense_categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE finance_expense_categories
    ADD CONSTRAINT finance_expense_categories_category_name_key UNIQUE (category_name);


--
-- TOC entry 6220 (class 2606 OID 1207239)
-- Name: finance_expense_categories finance_expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE finance_expense_categories
    ADD CONSTRAINT finance_expense_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 6222 (class 2606 OID 1207241)
-- Name: finance_expenses finance_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE finance_expenses
    ADD CONSTRAINT finance_expenses_pkey PRIMARY KEY (id);


--
-- TOC entry 6230 (class 2606 OID 1207243)
-- Name: finance_transfers finance_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE finance_transfers
    ADD CONSTRAINT finance_transfers_pkey PRIMARY KEY (id);


--
-- TOC entry 6234 (class 2606 OID 1207245)
-- Name: gift_card_transactions gift_card_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE gift_card_transactions
    ADD CONSTRAINT gift_card_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6237 (class 2606 OID 1207247)
-- Name: gift_cards gift_cards_card_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE gift_cards
    ADD CONSTRAINT gift_cards_card_number_key UNIQUE (card_number);


--
-- TOC entry 6239 (class 2606 OID 1207249)
-- Name: gift_cards gift_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE gift_cards
    ADD CONSTRAINT gift_cards_pkey PRIMARY KEY (id);


--
-- TOC entry 6245 (class 2606 OID 1207251)
-- Name: imei_validation imei_validation_imei_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE imei_validation
    ADD CONSTRAINT imei_validation_imei_key UNIQUE (imei);


--
-- TOC entry 6247 (class 2606 OID 1207253)
-- Name: imei_validation imei_validation_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE imei_validation
    ADD CONSTRAINT imei_validation_pkey PRIMARY KEY (id);


--
-- TOC entry 6253 (class 2606 OID 1207255)
-- Name: installment_payments installment_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE installment_payments
    ADD CONSTRAINT installment_payments_pkey PRIMARY KEY (id);


--
-- TOC entry 6255 (class 2606 OID 1207257)
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- TOC entry 6265 (class 2606 OID 1207259)
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- TOC entry 6267 (class 2606 OID 1207261)
-- Name: inventory_items inventory_items_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE inventory_items
    ADD CONSTRAINT inventory_items_serial_number_key UNIQUE (serial_number);


--
-- TOC entry 6257 (class 2606 OID 1207263)
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- TOC entry 6269 (class 2606 OID 1207265)
-- Name: lats_branches lats_branches_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_branches
    ADD CONSTRAINT lats_branches_pkey PRIMARY KEY (id);


--
-- TOC entry 6271 (class 2606 OID 1207267)
-- Name: lats_brands lats_brands_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_brands
    ADD CONSTRAINT lats_brands_pkey PRIMARY KEY (id);


--
-- TOC entry 6277 (class 2606 OID 1207269)
-- Name: lats_categories lats_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_categories
    ADD CONSTRAINT lats_categories_name_key UNIQUE (name);


--
-- TOC entry 6279 (class 2606 OID 1207271)
-- Name: lats_categories lats_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_categories
    ADD CONSTRAINT lats_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 6096 (class 2606 OID 1207273)
-- Name: lats_customers lats_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_customers
    ADD CONSTRAINT lats_customers_pkey PRIMARY KEY (id);


--
-- TOC entry 6283 (class 2606 OID 1207275)
-- Name: lats_data_audit_log lats_data_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_data_audit_log
    ADD CONSTRAINT lats_data_audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 6285 (class 2606 OID 1207277)
-- Name: lats_employees lats_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_employees
    ADD CONSTRAINT lats_employees_pkey PRIMARY KEY (id);


--
-- TOC entry 6291 (class 2606 OID 1207279)
-- Name: lats_inventory_adjustments lats_inventory_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_inventory_adjustments
    ADD CONSTRAINT lats_inventory_adjustments_pkey PRIMARY KEY (id);


--
-- TOC entry 6302 (class 2606 OID 1207281)
-- Name: lats_inventory_items lats_inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_pkey PRIMARY KEY (id);


--
-- TOC entry 6305 (class 2606 OID 1207283)
-- Name: lats_pos_advanced_settings lats_pos_advanced_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_advanced_settings
    ADD CONSTRAINT lats_pos_advanced_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6307 (class 2606 OID 1207285)
-- Name: lats_pos_advanced_settings lats_pos_advanced_settings_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_advanced_settings
    ADD CONSTRAINT lats_pos_advanced_settings_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- TOC entry 6311 (class 2606 OID 1207287)
-- Name: lats_pos_analytics_reporting_settings lats_pos_analytics_reporting_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_analytics_reporting_settings
    ADD CONSTRAINT lats_pos_analytics_reporting_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6313 (class 2606 OID 1207289)
-- Name: lats_pos_analytics_reporting_settings lats_pos_analytics_reporting_settings_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_analytics_reporting_settings
    ADD CONSTRAINT lats_pos_analytics_reporting_settings_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- TOC entry 6317 (class 2606 OID 1207291)
-- Name: lats_pos_barcode_scanner_settings lats_pos_barcode_scanner_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_barcode_scanner_settings
    ADD CONSTRAINT lats_pos_barcode_scanner_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6319 (class 2606 OID 1207293)
-- Name: lats_pos_barcode_scanner_settings lats_pos_barcode_scanner_settings_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_barcode_scanner_settings
    ADD CONSTRAINT lats_pos_barcode_scanner_settings_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- TOC entry 6323 (class 2606 OID 1207295)
-- Name: lats_pos_delivery_settings lats_pos_delivery_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_delivery_settings
    ADD CONSTRAINT lats_pos_delivery_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6325 (class 2606 OID 1207297)
-- Name: lats_pos_delivery_settings lats_pos_delivery_settings_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_delivery_settings
    ADD CONSTRAINT lats_pos_delivery_settings_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- TOC entry 6333 (class 2606 OID 1207299)
-- Name: lats_pos_dynamic_pricing_settings lats_pos_dynamic_pricing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_dynamic_pricing_settings
    ADD CONSTRAINT lats_pos_dynamic_pricing_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6335 (class 2606 OID 1207301)
-- Name: lats_pos_dynamic_pricing_settings lats_pos_dynamic_pricing_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_dynamic_pricing_settings
    ADD CONSTRAINT lats_pos_dynamic_pricing_settings_user_id_unique UNIQUE (user_id);


--
-- TOC entry 6342 (class 2606 OID 1207303)
-- Name: lats_pos_general_settings lats_pos_general_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_general_settings
    ADD CONSTRAINT lats_pos_general_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6344 (class 2606 OID 1207305)
-- Name: lats_pos_general_settings lats_pos_general_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_general_settings
    ADD CONSTRAINT lats_pos_general_settings_user_id_unique UNIQUE (user_id);


--
-- TOC entry 6350 (class 2606 OID 1207307)
-- Name: lats_pos_integrations_settings lats_pos_integrations_setting_user_id_business_id_integrati_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_integrations_settings
    ADD CONSTRAINT lats_pos_integrations_setting_user_id_business_id_integrati_key UNIQUE (user_id, business_id, integration_name);


--
-- TOC entry 6352 (class 2606 OID 1207309)
-- Name: lats_pos_integrations_settings lats_pos_integrations_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_integrations_settings
    ADD CONSTRAINT lats_pos_integrations_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6358 (class 2606 OID 1207311)
-- Name: lats_pos_loyalty_customer_settings lats_pos_loyalty_customer_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_loyalty_customer_settings
    ADD CONSTRAINT lats_pos_loyalty_customer_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6360 (class 2606 OID 1207313)
-- Name: lats_pos_loyalty_customer_settings lats_pos_loyalty_customer_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_loyalty_customer_settings
    ADD CONSTRAINT lats_pos_loyalty_customer_settings_user_id_unique UNIQUE (user_id);


--
-- TOC entry 6364 (class 2606 OID 1207315)
-- Name: lats_pos_notification_settings lats_pos_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_notification_settings
    ADD CONSTRAINT lats_pos_notification_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6366 (class 2606 OID 1207317)
-- Name: lats_pos_notification_settings lats_pos_notification_settings_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_notification_settings
    ADD CONSTRAINT lats_pos_notification_settings_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- TOC entry 6371 (class 2606 OID 1207319)
-- Name: lats_pos_receipt_settings lats_pos_receipt_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_receipt_settings
    ADD CONSTRAINT lats_pos_receipt_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6373 (class 2606 OID 1207321)
-- Name: lats_pos_receipt_settings lats_pos_receipt_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_receipt_settings
    ADD CONSTRAINT lats_pos_receipt_settings_user_id_unique UNIQUE (user_id);


--
-- TOC entry 6377 (class 2606 OID 1207323)
-- Name: lats_pos_search_filter_settings lats_pos_search_filter_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_search_filter_settings
    ADD CONSTRAINT lats_pos_search_filter_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6379 (class 2606 OID 1207325)
-- Name: lats_pos_search_filter_settings lats_pos_search_filter_settings_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_search_filter_settings
    ADD CONSTRAINT lats_pos_search_filter_settings_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- TOC entry 6385 (class 2606 OID 1207327)
-- Name: lats_pos_user_permissions_settings lats_pos_user_permissions_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_user_permissions_settings
    ADD CONSTRAINT lats_pos_user_permissions_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6387 (class 2606 OID 1207329)
-- Name: lats_pos_user_permissions_settings lats_pos_user_permissions_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_user_permissions_settings
    ADD CONSTRAINT lats_pos_user_permissions_settings_user_id_unique UNIQUE (user_id);


--
-- TOC entry 6389 (class 2606 OID 1207331)
-- Name: lats_product_units lats_product_units_imei_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_units
    ADD CONSTRAINT lats_product_units_imei_key UNIQUE (imei);


--
-- TOC entry 6391 (class 2606 OID 1207333)
-- Name: lats_product_units lats_product_units_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_units
    ADD CONSTRAINT lats_product_units_pkey PRIMARY KEY (id);


--
-- TOC entry 6396 (class 2606 OID 1207335)
-- Name: lats_product_validation lats_product_validation_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_validation
    ADD CONSTRAINT lats_product_validation_pkey PRIMARY KEY (id);


--
-- TOC entry 6398 (class 2606 OID 1207337)
-- Name: lats_product_validation lats_product_validation_product_id_shipping_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_validation
    ADD CONSTRAINT lats_product_validation_product_id_shipping_id_key UNIQUE (product_id, shipping_id);


--
-- TOC entry 5904 (class 2606 OID 1207339)
-- Name: lats_product_variants lats_product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_variants
    ADD CONSTRAINT lats_product_variants_pkey PRIMARY KEY (id);


--
-- TOC entry 5906 (class 2606 OID 1207341)
-- Name: lats_product_variants lats_product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_variants
    ADD CONSTRAINT lats_product_variants_sku_key UNIQUE (sku);


--
-- TOC entry 5941 (class 2606 OID 1207343)
-- Name: lats_products lats_products_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_products
    ADD CONSTRAINT lats_products_pkey PRIMARY KEY (id);


--
-- TOC entry 5943 (class 2606 OID 1207345)
-- Name: lats_products lats_products_sku_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_products
    ADD CONSTRAINT lats_products_sku_key UNIQUE (sku);


--
-- TOC entry 6403 (class 2606 OID 1207347)
-- Name: lats_purchase_order_audit_log lats_purchase_order_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_audit_log
    ADD CONSTRAINT lats_purchase_order_audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 6131 (class 2606 OID 1207349)
-- Name: lats_purchase_order_items lats_purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_items
    ADD CONSTRAINT lats_purchase_order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 6408 (class 2606 OID 1207351)
-- Name: lats_purchase_order_payments lats_purchase_order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_payments
    ADD CONSTRAINT lats_purchase_order_payments_pkey PRIMARY KEY (id);


--
-- TOC entry 6415 (class 2606 OID 1207353)
-- Name: lats_purchase_order_shipping lats_purchase_order_shipping_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_shipping
    ADD CONSTRAINT lats_purchase_order_shipping_pkey PRIMARY KEY (id);


--
-- TOC entry 5950 (class 2606 OID 1207355)
-- Name: lats_purchase_orders lats_purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_orders
    ADD CONSTRAINT lats_purchase_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5952 (class 2606 OID 1207357)
-- Name: lats_purchase_orders lats_purchase_orders_po_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_orders
    ADD CONSTRAINT lats_purchase_orders_po_number_key UNIQUE (po_number);


--
-- TOC entry 6421 (class 2606 OID 1207359)
-- Name: lats_receipts lats_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_receipts
    ADD CONSTRAINT lats_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 6428 (class 2606 OID 1207361)
-- Name: lats_sale_items lats_sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_sale_items
    ADD CONSTRAINT lats_sale_items_pkey PRIMARY KEY (id);


--
-- TOC entry 6439 (class 2606 OID 1207363)
-- Name: lats_sales lats_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_sales
    ADD CONSTRAINT lats_sales_pkey PRIMARY KEY (id);


--
-- TOC entry 6441 (class 2606 OID 1207365)
-- Name: lats_sales lats_sales_sale_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_sales
    ADD CONSTRAINT lats_sales_sale_number_key UNIQUE (sale_number);


--
-- TOC entry 6450 (class 2606 OID 1207367)
-- Name: lats_shipping_agents lats_shipping_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping_agents
    ADD CONSTRAINT lats_shipping_agents_pkey PRIMARY KEY (id);


--
-- TOC entry 6454 (class 2606 OID 1207369)
-- Name: lats_shipping_cargo_items lats_shipping_cargo_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping_cargo_items
    ADD CONSTRAINT lats_shipping_cargo_items_pkey PRIMARY KEY (id);


--
-- TOC entry 6458 (class 2606 OID 1207371)
-- Name: lats_shipping_methods lats_shipping_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping_methods
    ADD CONSTRAINT lats_shipping_methods_code_key UNIQUE (code);


--
-- TOC entry 6460 (class 2606 OID 1207373)
-- Name: lats_shipping_methods lats_shipping_methods_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping_methods
    ADD CONSTRAINT lats_shipping_methods_name_key UNIQUE (name);


--
-- TOC entry 6462 (class 2606 OID 1207375)
-- Name: lats_shipping_methods lats_shipping_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping_methods
    ADD CONSTRAINT lats_shipping_methods_pkey PRIMARY KEY (id);


--
-- TOC entry 6445 (class 2606 OID 1207377)
-- Name: lats_shipping lats_shipping_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping
    ADD CONSTRAINT lats_shipping_pkey PRIMARY KEY (id);


--
-- TOC entry 6464 (class 2606 OID 1207379)
-- Name: lats_shipping_settings lats_shipping_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping_settings
    ADD CONSTRAINT lats_shipping_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6468 (class 2606 OID 1207381)
-- Name: lats_spare_part_usage lats_spare_part_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_spare_part_usage
    ADD CONSTRAINT lats_spare_part_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 6472 (class 2606 OID 1207383)
-- Name: lats_spare_part_variants lats_spare_part_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_spare_part_variants
    ADD CONSTRAINT lats_spare_part_variants_pkey PRIMARY KEY (id);


--
-- TOC entry 6474 (class 2606 OID 1207385)
-- Name: lats_spare_part_variants lats_spare_part_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_spare_part_variants
    ADD CONSTRAINT lats_spare_part_variants_sku_key UNIQUE (sku);


--
-- TOC entry 6476 (class 2606 OID 1207387)
-- Name: lats_spare_parts lats_spare_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_spare_parts
    ADD CONSTRAINT lats_spare_parts_pkey PRIMARY KEY (id);


--
-- TOC entry 6490 (class 2606 OID 1207389)
-- Name: lats_stock_movements lats_stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_stock_movements
    ADD CONSTRAINT lats_stock_movements_pkey PRIMARY KEY (id);


--
-- TOC entry 6497 (class 2606 OID 1207391)
-- Name: lats_stock_transfers lats_stock_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_pkey PRIMARY KEY (id);


--
-- TOC entry 6499 (class 2606 OID 1207393)
-- Name: lats_stock_transfers lats_stock_transfers_transfer_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_transfer_number_key UNIQUE (transfer_number);


--
-- TOC entry 6512 (class 2606 OID 1207395)
-- Name: lats_store_locations lats_store_locations_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_store_locations
    ADD CONSTRAINT lats_store_locations_code_key UNIQUE (code);


--
-- TOC entry 6514 (class 2606 OID 1207397)
-- Name: lats_store_locations lats_store_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_store_locations
    ADD CONSTRAINT lats_store_locations_pkey PRIMARY KEY (id);


--
-- TOC entry 6505 (class 2606 OID 1207399)
-- Name: lats_store_rooms lats_store_rooms_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_store_rooms
    ADD CONSTRAINT lats_store_rooms_name_key UNIQUE (name);


--
-- TOC entry 6507 (class 2606 OID 1207401)
-- Name: lats_store_rooms lats_store_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_store_rooms
    ADD CONSTRAINT lats_store_rooms_pkey PRIMARY KEY (id);


--
-- TOC entry 6522 (class 2606 OID 1207403)
-- Name: lats_store_shelves lats_store_shelves_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_store_shelves
    ADD CONSTRAINT lats_store_shelves_pkey PRIMARY KEY (id);


--
-- TOC entry 6524 (class 2606 OID 1207405)
-- Name: lats_store_shelves lats_store_shelves_room_id_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_store_shelves
    ADD CONSTRAINT lats_store_shelves_room_id_name_key UNIQUE (room_id, name);


--
-- TOC entry 6527 (class 2606 OID 1207407)
-- Name: lats_supplier_categories lats_supplier_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_categories
    ADD CONSTRAINT lats_supplier_categories_name_key UNIQUE (name);


--
-- TOC entry 6529 (class 2606 OID 1207409)
-- Name: lats_supplier_categories lats_supplier_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_categories
    ADD CONSTRAINT lats_supplier_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 6533 (class 2606 OID 1207411)
-- Name: lats_supplier_category_mapping lats_supplier_category_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_category_mapping
    ADD CONSTRAINT lats_supplier_category_mapping_pkey PRIMARY KEY (supplier_id, category_id);


--
-- TOC entry 6538 (class 2606 OID 1207413)
-- Name: lats_supplier_communications lats_supplier_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_communications
    ADD CONSTRAINT lats_supplier_communications_pkey PRIMARY KEY (id);


--
-- TOC entry 6543 (class 2606 OID 1207415)
-- Name: lats_supplier_contracts lats_supplier_contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_contracts
    ADD CONSTRAINT lats_supplier_contracts_contract_number_key UNIQUE (contract_number);


--
-- TOC entry 6545 (class 2606 OID 1207417)
-- Name: lats_supplier_contracts lats_supplier_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_contracts
    ADD CONSTRAINT lats_supplier_contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 6550 (class 2606 OID 1207419)
-- Name: lats_supplier_documents lats_supplier_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_documents
    ADD CONSTRAINT lats_supplier_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6555 (class 2606 OID 1207421)
-- Name: lats_supplier_ratings lats_supplier_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_ratings
    ADD CONSTRAINT lats_supplier_ratings_pkey PRIMARY KEY (id);


--
-- TOC entry 6559 (class 2606 OID 1207423)
-- Name: lats_supplier_tag_mapping lats_supplier_tag_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_tag_mapping
    ADD CONSTRAINT lats_supplier_tag_mapping_pkey PRIMARY KEY (supplier_id, tag_id);


--
-- TOC entry 6561 (class 2606 OID 1207425)
-- Name: lats_supplier_tags lats_supplier_tags_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_tags
    ADD CONSTRAINT lats_supplier_tags_name_key UNIQUE (name);


--
-- TOC entry 6563 (class 2606 OID 1207427)
-- Name: lats_supplier_tags lats_supplier_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_tags
    ADD CONSTRAINT lats_supplier_tags_pkey PRIMARY KEY (id);


--
-- TOC entry 5972 (class 2606 OID 1207429)
-- Name: lats_suppliers lats_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_suppliers
    ADD CONSTRAINT lats_suppliers_pkey PRIMARY KEY (id);


--
-- TOC entry 6568 (class 2606 OID 1207431)
-- Name: lats_trade_in_contracts lats_trade_in_contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_contract_number_key UNIQUE (contract_number);


--
-- TOC entry 6570 (class 2606 OID 1207433)
-- Name: lats_trade_in_contracts lats_trade_in_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 6574 (class 2606 OID 1207436)
-- Name: lats_trade_in_damage_assessments lats_trade_in_damage_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_damage_assessments
    ADD CONSTRAINT lats_trade_in_damage_assessments_pkey PRIMARY KEY (id);


--
-- TOC entry 6580 (class 2606 OID 1207438)
-- Name: lats_trade_in_prices lats_trade_in_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_pkey PRIMARY KEY (id);


--
-- TOC entry 6582 (class 2606 OID 1207440)
-- Name: lats_trade_in_settings lats_trade_in_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_settings
    ADD CONSTRAINT lats_trade_in_settings_key_key UNIQUE (key);


--
-- TOC entry 6584 (class 2606 OID 1207442)
-- Name: lats_trade_in_settings lats_trade_in_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_settings
    ADD CONSTRAINT lats_trade_in_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6593 (class 2606 OID 1207444)
-- Name: lats_trade_in_transactions lats_trade_in_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6595 (class 2606 OID 1207446)
-- Name: lats_trade_in_transactions lats_trade_in_transactions_transaction_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_transaction_number_key UNIQUE (transaction_number);


--
-- TOC entry 6600 (class 2606 OID 1207448)
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 6606 (class 2606 OID 1207450)
-- Name: loyalty_points loyalty_points_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE loyalty_points
    ADD CONSTRAINT loyalty_points_pkey PRIMARY KEY (id);


--
-- TOC entry 6617 (class 2606 OID 1207452)
-- Name: mobile_money_transactions mobile_money_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE mobile_money_transactions
    ADD CONSTRAINT mobile_money_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6619 (class 2606 OID 1207454)
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- TOC entry 6622 (class 2606 OID 1207456)
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6637 (class 2606 OID 1207458)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 6639 (class 2606 OID 1207460)
-- Name: paragraphs paragraphs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE paragraphs
    ADD CONSTRAINT paragraphs_pkey PRIMARY KEY (id);


--
-- TOC entry 6642 (class 2606 OID 1207462)
-- Name: payment_methods payment_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE payment_methods
    ADD CONSTRAINT payment_methods_code_key UNIQUE (code);


--
-- TOC entry 6644 (class 2606 OID 1207464)
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- TOC entry 6654 (class 2606 OID 1207466)
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6660 (class 2606 OID 1207468)
-- Name: points_transactions points_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE points_transactions
    ADD CONSTRAINT points_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6665 (class 2606 OID 1207470)
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- TOC entry 6668 (class 2606 OID 1207472)
-- Name: product_interests product_interests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE product_interests
    ADD CONSTRAINT product_interests_pkey PRIMARY KEY (interest_id);


--
-- TOC entry 6672 (class 2606 OID 1207474)
-- Name: purchase_order_audit purchase_order_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_audit
    ADD CONSTRAINT purchase_order_audit_pkey PRIMARY KEY (id);


--
-- TOC entry 6674 (class 2606 OID 1207476)
-- Name: purchase_order_messages purchase_order_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_messages
    ADD CONSTRAINT purchase_order_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 6681 (class 2606 OID 1207478)
-- Name: purchase_order_payments purchase_order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_payments
    ADD CONSTRAINT purchase_order_payments_pkey PRIMARY KEY (id);


--
-- TOC entry 6685 (class 2606 OID 1207480)
-- Name: purchase_order_quality_check_items purchase_order_quality_check_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_quality_check_items
    ADD CONSTRAINT purchase_order_quality_check_items_pkey PRIMARY KEY (id);


--
-- TOC entry 6689 (class 2606 OID 1207482)
-- Name: purchase_order_quality_checks purchase_order_quality_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_quality_checks
    ADD CONSTRAINT purchase_order_quality_checks_pkey PRIMARY KEY (id);


--
-- TOC entry 6691 (class 2606 OID 1207484)
-- Name: purchase_orders purchase_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_orders
    ADD CONSTRAINT purchase_orders_order_number_key UNIQUE (order_number);


--
-- TOC entry 6693 (class 2606 OID 1207486)
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 6696 (class 2606 OID 1207488)
-- Name: quality_check_criteria quality_check_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE quality_check_criteria
    ADD CONSTRAINT quality_check_criteria_pkey PRIMARY KEY (id);


--
-- TOC entry 6698 (class 2606 OID 1207490)
-- Name: quality_check_items quality_check_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE quality_check_items
    ADD CONSTRAINT quality_check_items_pkey PRIMARY KEY (id);


--
-- TOC entry 6700 (class 2606 OID 1207492)
-- Name: quality_check_results quality_check_results_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE quality_check_results
    ADD CONSTRAINT quality_check_results_pkey PRIMARY KEY (id);


--
-- TOC entry 6702 (class 2606 OID 1207494)
-- Name: quality_check_templates quality_check_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE quality_check_templates
    ADD CONSTRAINT quality_check_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6706 (class 2606 OID 1207496)
-- Name: quality_checks quality_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE quality_checks
    ADD CONSTRAINT quality_checks_pkey PRIMARY KEY (id);


--
-- TOC entry 6711 (class 2606 OID 1207498)
-- Name: recurring_expense_history recurring_expense_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE recurring_expense_history
    ADD CONSTRAINT recurring_expense_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6720 (class 2606 OID 1207500)
-- Name: recurring_expenses recurring_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE recurring_expenses
    ADD CONSTRAINT recurring_expenses_pkey PRIMARY KEY (id);


--
-- TOC entry 6730 (class 2606 OID 1207502)
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 6733 (class 2606 OID 1207504)
-- Name: repair_parts repair_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE repair_parts
    ADD CONSTRAINT repair_parts_pkey PRIMARY KEY (id);


--
-- TOC entry 6736 (class 2606 OID 1207506)
-- Name: report_attachments report_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE report_attachments
    ADD CONSTRAINT report_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 6745 (class 2606 OID 1207508)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 6750 (class 2606 OID 1207510)
-- Name: returns returns_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (id);


--
-- TOC entry 6755 (class 2606 OID 1207512)
-- Name: sale_inventory_items sale_inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sale_inventory_items
    ADD CONSTRAINT sale_inventory_items_pkey PRIMARY KEY (id);


--
-- TOC entry 6760 (class 2606 OID 1207514)
-- Name: sales_pipeline sales_pipeline_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sales_pipeline
    ADD CONSTRAINT sales_pipeline_pkey PRIMARY KEY (sale_id);


--
-- TOC entry 6757 (class 2606 OID 1207516)
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- TOC entry 6765 (class 2606 OID 1207518)
-- Name: scheduled_transfer_executions scheduled_transfer_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE scheduled_transfer_executions
    ADD CONSTRAINT scheduled_transfer_executions_pkey PRIMARY KEY (id);


--
-- TOC entry 6772 (class 2606 OID 1207520)
-- Name: scheduled_transfers scheduled_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE scheduled_transfers
    ADD CONSTRAINT scheduled_transfers_pkey PRIMARY KEY (id);


--
-- TOC entry 6777 (class 2606 OID 1207522)
-- Name: serial_number_movements serial_number_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE serial_number_movements
    ADD CONSTRAINT serial_number_movements_pkey PRIMARY KEY (id);


--
-- TOC entry 6780 (class 2606 OID 1207524)
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- TOC entry 6782 (class 2606 OID 1207526)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6786 (class 2606 OID 1207528)
-- Name: shelves shelves_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE shelves
    ADD CONSTRAINT shelves_code_key UNIQUE (code);


--
-- TOC entry 6788 (class 2606 OID 1207530)
-- Name: shelves shelves_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE shelves
    ADD CONSTRAINT shelves_pkey PRIMARY KEY (id);


--
-- TOC entry 6790 (class 2606 OID 1207532)
-- Name: shift_templates shift_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE shift_templates
    ADD CONSTRAINT shift_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6799 (class 2606 OID 1207534)
-- Name: sms_logs sms_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sms_logs
    ADD CONSTRAINT sms_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 6801 (class 2606 OID 1207536)
-- Name: sms_trigger_logs sms_trigger_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sms_trigger_logs
    ADD CONSTRAINT sms_trigger_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 6804 (class 2606 OID 1207538)
-- Name: sms_triggers sms_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sms_triggers
    ADD CONSTRAINT sms_triggers_pkey PRIMARY KEY (id);


--
-- TOC entry 6808 (class 2606 OID 1207540)
-- Name: special_order_payments special_order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE special_order_payments
    ADD CONSTRAINT special_order_payments_pkey PRIMARY KEY (id);


--
-- TOC entry 6811 (class 2606 OID 1207542)
-- Name: storage_rooms storage_rooms_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE storage_rooms
    ADD CONSTRAINT storage_rooms_code_key UNIQUE (code);


--
-- TOC entry 6813 (class 2606 OID 1207544)
-- Name: storage_rooms storage_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE storage_rooms
    ADD CONSTRAINT storage_rooms_pkey PRIMARY KEY (id);


--
-- TOC entry 6214 (class 2606 OID 1207546)
-- Name: store_locations store_locations_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE store_locations
    ADD CONSTRAINT store_locations_code_key UNIQUE (code);


--
-- TOC entry 6216 (class 2606 OID 1207548)
-- Name: store_locations store_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE store_locations
    ADD CONSTRAINT store_locations_pkey PRIMARY KEY (id);


--
-- TOC entry 6815 (class 2606 OID 1207550)
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- TOC entry 6817 (class 2606 OID 1207552)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6819 (class 2606 OID 1207554)
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- TOC entry 6824 (class 2606 OID 1207556)
-- Name: user_branch_assignments user_branch_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 6826 (class 2606 OID 1207558)
-- Name: user_branch_assignments user_branch_assignments_user_id_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_user_id_branch_id_key UNIQUE (user_id, branch_id);


--
-- TOC entry 6829 (class 2606 OID 1207560)
-- Name: user_daily_goals user_daily_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE user_daily_goals
    ADD CONSTRAINT user_daily_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 6831 (class 2606 OID 1207562)
-- Name: user_daily_goals user_daily_goals_user_id_date_goal_type_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE user_daily_goals
    ADD CONSTRAINT user_daily_goals_user_id_date_goal_type_key UNIQUE (user_id, date, goal_type);


--
-- TOC entry 6835 (class 2606 OID 1207564)
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6837 (class 2606 OID 1207566)
-- Name: user_settings user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE user_settings
    ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);


--
-- TOC entry 6844 (class 2606 OID 1207568)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 6846 (class 2606 OID 1207570)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 6850 (class 2606 OID 1207572)
-- Name: webhook_endpoints webhook_endpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id);


--
-- TOC entry 6854 (class 2606 OID 1207574)
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 6857 (class 2606 OID 1207576)
-- Name: whatsapp_instances_comprehensive whatsapp_instances_comprehensive_instance_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE whatsapp_instances_comprehensive
    ADD CONSTRAINT whatsapp_instances_comprehensive_instance_id_key UNIQUE (instance_id);


--
-- TOC entry 6859 (class 2606 OID 1207578)
-- Name: whatsapp_instances_comprehensive whatsapp_instances_comprehensive_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE whatsapp_instances_comprehensive
    ADD CONSTRAINT whatsapp_instances_comprehensive_pkey PRIMARY KEY (id);


--
-- TOC entry 6861 (class 2606 OID 1207580)
-- Name: whatsapp_message_templates whatsapp_message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE whatsapp_message_templates
    ADD CONSTRAINT whatsapp_message_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6863 (class 2606 OID 1207582)
-- Name: whatsapp_templates whatsapp_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6865 (class 2606 OID 1207584)
-- Name: whatsapp_templates whatsapp_templates_template_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_template_id_key UNIQUE (template_id);


--
-- TOC entry 5811 (class 1259 OID 1207585)
-- Name: users_sync_deleted_at_idx; Type: INDEX; Schema: neon_auth; Owner: neondb_owner
--

CREATE INDEX users_sync_deleted_at_idx ON neon_auth.users_sync  (deleted_at);


--
-- TOC entry 5816 (class 1259 OID 1207586)
-- Name: idx_account_trans_account; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_trans_account ON account_transactions  (account_id);


--
-- TOC entry 5817 (class 1259 OID 1207587)
-- Name: idx_account_trans_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_trans_created ON account_transactions  (created_at);


--
-- TOC entry 5818 (class 1259 OID 1207588)
-- Name: idx_account_trans_reference; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_trans_reference ON account_transactions  (reference_number);


--
-- TOC entry 5819 (class 1259 OID 1207589)
-- Name: idx_account_trans_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_trans_type ON account_transactions  (transaction_type);


--
-- TOC entry 5820 (class 1259 OID 1207590)
-- Name: idx_account_transactions_account_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_transactions_account_id ON account_transactions  (account_id);


--
-- TOC entry 5821 (class 1259 OID 1207591)
-- Name: idx_account_transactions_account_type_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_transactions_account_type_date ON account_transactions  (account_id, transaction_type, created_at DESC);


--
-- TOC entry 5822 (class 1259 OID 1207592)
-- Name: idx_account_transactions_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_transactions_branch_id ON account_transactions  (branch_id);


--
-- TOC entry 5823 (class 1259 OID 1207593)
-- Name: idx_account_transactions_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_transactions_created_at ON account_transactions  (created_at DESC);


--
-- TOC entry 5824 (class 1259 OID 1207594)
-- Name: idx_account_transactions_entity_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_transactions_entity_id ON account_transactions  (related_entity_id) WHERE (related_entity_id IS NOT NULL);


--
-- TOC entry 5825 (class 1259 OID 1207595)
-- Name: idx_account_transactions_entity_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_transactions_entity_type ON account_transactions  (related_entity_type) WHERE (related_entity_type IS NOT NULL);


--
-- TOC entry 5826 (class 1259 OID 1207596)
-- Name: idx_account_transactions_entity_type_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_transactions_entity_type_id ON account_transactions  (related_entity_type, related_entity_id) WHERE ((related_entity_type IS NOT NULL) AND (related_entity_id IS NOT NULL));


--
-- TOC entry 5827 (class 1259 OID 1207597)
-- Name: idx_account_transactions_reference_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_transactions_reference_number ON account_transactions  (reference_number);


--
-- TOC entry 5828 (class 1259 OID 1207598)
-- Name: idx_account_transactions_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_transactions_status ON account_transactions  (status) WHERE (status IS NOT NULL);


--
-- TOC entry 5829 (class 1259 OID 1207599)
-- Name: idx_account_transactions_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_transactions_type ON account_transactions  (transaction_type);


--
-- TOC entry 5830 (class 1259 OID 1207600)
-- Name: idx_account_transactions_validation; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_account_transactions_validation ON account_transactions  (account_id, created_at DESC);


--
-- TOC entry 5835 (class 1259 OID 1207601)
-- Name: idx_admin_settings_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_admin_settings_active ON admin_settings  (is_active);


--
-- TOC entry 5836 (class 1259 OID 1207602)
-- Name: idx_admin_settings_category; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_admin_settings_category ON admin_settings  (category);


--
-- TOC entry 5837 (class 1259 OID 1207603)
-- Name: idx_admin_settings_category_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_admin_settings_category_key ON admin_settings  (category, setting_key);


--
-- TOC entry 5840 (class 1259 OID 1207604)
-- Name: idx_admin_settings_log_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_admin_settings_log_date ON admin_settings_log  (changed_at DESC);


--
-- TOC entry 5841 (class 1259 OID 1207605)
-- Name: idx_admin_settings_log_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_admin_settings_log_key ON admin_settings_log  (category, setting_key);


--
-- TOC entry 6303 (class 1259 OID 1207606)
-- Name: idx_advanced_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_advanced_settings_user_id ON lats_pos_advanced_settings  (user_id);


--
-- TOC entry 6308 (class 1259 OID 1207607)
-- Name: idx_analytics_reporting_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_analytics_reporting_settings_user_id ON lats_pos_analytics_reporting_settings  (user_id);


--
-- TOC entry 6309 (class 1259 OID 1207608)
-- Name: idx_analytics_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_analytics_settings_user_id ON lats_pos_analytics_reporting_settings  (user_id);


--
-- TOC entry 5846 (class 1259 OID 1207609)
-- Name: idx_api_keys_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_api_keys_active ON api_keys  (is_active);


--
-- TOC entry 5847 (class 1259 OID 1207610)
-- Name: idx_api_keys_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_api_keys_key ON api_keys  (key);


--
-- TOC entry 5848 (class 1259 OID 1207611)
-- Name: idx_api_keys_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_api_keys_user ON api_keys  (user_id);


--
-- TOC entry 5851 (class 1259 OID 1207612)
-- Name: idx_api_logs_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_api_logs_created ON api_request_logs  (created_at);


--
-- TOC entry 5852 (class 1259 OID 1207613)
-- Name: idx_api_logs_ip; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_api_logs_ip ON api_request_logs  (ip_address);


--
-- TOC entry 5853 (class 1259 OID 1207614)
-- Name: idx_api_logs_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_api_logs_key ON api_request_logs  (api_key_id);


--
-- TOC entry 5856 (class 1259 OID 1207615)
-- Name: idx_appointments_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_appointments_branch_id ON appointments  (branch_id);


--
-- TOC entry 5861 (class 1259 OID 1207616)
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_attendance_date ON attendance_records  (attendance_date);


--
-- TOC entry 5862 (class 1259 OID 1207617)
-- Name: idx_attendance_employee_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_attendance_employee_date ON attendance_records  (employee_id, attendance_date);


--
-- TOC entry 5863 (class 1259 OID 1207618)
-- Name: idx_attendance_employee_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_attendance_employee_id ON attendance_records  (employee_id);


--
-- TOC entry 5864 (class 1259 OID 1207619)
-- Name: idx_attendance_records_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_attendance_records_branch_id ON attendance_records  (branch_id);


--
-- TOC entry 5865 (class 1259 OID 1207620)
-- Name: idx_attendance_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_attendance_status ON attendance_records  (status);


--
-- TOC entry 6280 (class 1259 OID 1207621)
-- Name: idx_audit_log_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_log_created ON lats_data_audit_log  (created_at DESC);


--
-- TOC entry 6399 (class 1259 OID 1207622)
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_log_created_at ON lats_purchase_order_audit_log  (created_at DESC);


--
-- TOC entry 6400 (class 1259 OID 1207623)
-- Name: idx_audit_log_po_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_log_po_id ON lats_purchase_order_audit_log  (purchase_order_id);


--
-- TOC entry 6281 (class 1259 OID 1207624)
-- Name: idx_audit_log_record; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_log_record ON lats_data_audit_log  (table_name, record_id);


--
-- TOC entry 6401 (class 1259 OID 1207625)
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_audit_log_user_id ON lats_purchase_order_audit_log  (user_id);


--
-- TOC entry 5872 (class 1259 OID 1207626)
-- Name: idx_auth_users_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_auth_users_branch_id ON auth_users  (branch_id);


--
-- TOC entry 5875 (class 1259 OID 1207627)
-- Name: idx_auto_reorder_log_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_auto_reorder_log_created ON auto_reorder_log  (created_at DESC);


--
-- TOC entry 5876 (class 1259 OID 1207628)
-- Name: idx_auto_reorder_log_po; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_auto_reorder_log_po ON auto_reorder_log  (purchase_order_id);


--
-- TOC entry 5975 (class 1259 OID 1207629)
-- Name: idx_backup_logs_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_backup_logs_created_at ON backup_logs  (created_at);


--
-- TOC entry 5976 (class 1259 OID 1207630)
-- Name: idx_backup_logs_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_backup_logs_status ON backup_logs  (status);


--
-- TOC entry 5977 (class 1259 OID 1207631)
-- Name: idx_backup_logs_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_backup_logs_type ON backup_logs  (backup_type);


--
-- TOC entry 6314 (class 1259 OID 1207632)
-- Name: idx_barcode_scanner_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_barcode_scanner_settings_user_id ON lats_pos_barcode_scanner_settings  (user_id);


--
-- TOC entry 5980 (class 1259 OID 1207633)
-- Name: idx_branch_activity_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branch_activity_branch ON branch_activity_log  (branch_id);


--
-- TOC entry 5981 (class 1259 OID 1207634)
-- Name: idx_branch_activity_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branch_activity_created ON branch_activity_log  (created_at);


--
-- TOC entry 5982 (class 1259 OID 1207635)
-- Name: idx_branch_activity_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branch_activity_type ON branch_activity_log  (action_type);


--
-- TOC entry 5983 (class 1259 OID 1207636)
-- Name: idx_branch_activity_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branch_activity_user ON branch_activity_log  (user_id);


--
-- TOC entry 5986 (class 1259 OID 1207637)
-- Name: idx_branch_transfers_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branch_transfers_created ON branch_transfers  (created_at DESC);


--
-- TOC entry 5987 (class 1259 OID 1207638)
-- Name: idx_branch_transfers_entity; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branch_transfers_entity ON branch_transfers  (entity_id);


--
-- TOC entry 5988 (class 1259 OID 1207639)
-- Name: idx_branch_transfers_from_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branch_transfers_from_branch ON branch_transfers  (from_branch_id);


--
-- TOC entry 5989 (class 1259 OID 1207640)
-- Name: idx_branch_transfers_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branch_transfers_status ON branch_transfers  (status);


--
-- TOC entry 5990 (class 1259 OID 1207641)
-- Name: idx_branch_transfers_to_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branch_transfers_to_branch ON branch_transfers  (to_branch_id);


--
-- TOC entry 5991 (class 1259 OID 1207642)
-- Name: idx_branch_transfers_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_branch_transfers_type ON branch_transfers  (transfer_type);


--
-- TOC entry 5994 (class 1259 OID 1207643)
-- Name: idx_buyer_score; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buyer_score ON buyer_details  (buying_score DESC);


--
-- TOC entry 5995 (class 1259 OID 1207644)
-- Name: idx_buyer_tier; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buyer_tier ON buyer_details  (buyer_tier);


--
-- TOC entry 6451 (class 1259 OID 1207645)
-- Name: idx_cargo_items_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_cargo_items_product ON lats_shipping_cargo_items  (product_id);


--
-- TOC entry 6452 (class 1259 OID 1207646)
-- Name: idx_cargo_items_shipping; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_cargo_items_shipping ON lats_shipping_cargo_items  (shipping_id);


--
-- TOC entry 6272 (class 1259 OID 1207647)
-- Name: idx_categories_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_categories_branch ON lats_categories  (branch_id);


--
-- TOC entry 6273 (class 1259 OID 1207648)
-- Name: idx_categories_is_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_categories_is_shared ON lats_categories  (is_shared) WHERE (is_shared = true);


--
-- TOC entry 6274 (class 1259 OID 1207649)
-- Name: idx_categories_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_categories_shared ON lats_categories  (is_shared);


--
-- TOC entry 6002 (class 1259 OID 1207650)
-- Name: idx_comm_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_comm_date ON communication_log  (contact_date);


--
-- TOC entry 6025 (class 1259 OID 1207651)
-- Name: idx_cust_inst_payments_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_cust_inst_payments_customer ON customer_installment_plan_payments  (customer_id);


--
-- TOC entry 6026 (class 1259 OID 1207652)
-- Name: idx_cust_inst_payments_plan; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_cust_inst_payments_plan ON customer_installment_plan_payments  (installment_plan_id);


--
-- TOC entry 6099 (class 1259 OID 1207653)
-- Name: idx_customer_buyer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_buyer ON whatsapp_customers  (is_buyer);


--
-- TOC entry 6013 (class 1259 OID 1207654)
-- Name: idx_customer_checkins_checkin_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_checkins_checkin_date ON customer_checkins  (checkin_date DESC);


--
-- TOC entry 6014 (class 1259 OID 1207655)
-- Name: idx_customer_checkins_customer_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_checkins_customer_id ON customer_checkins  (customer_id);


--
-- TOC entry 6017 (class 1259 OID 1207656)
-- Name: idx_customer_communications_customer_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_communications_customer_id ON customer_communications  (customer_id);


--
-- TOC entry 6018 (class 1259 OID 1207657)
-- Name: idx_customer_communications_sent_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_communications_sent_at ON customer_communications  (sent_at DESC);


--
-- TOC entry 6019 (class 1259 OID 1207658)
-- Name: idx_customer_communications_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_communications_status ON customer_communications  (status);


--
-- TOC entry 6020 (class 1259 OID 1207659)
-- Name: idx_customer_communications_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_communications_type ON customer_communications  (type);


--
-- TOC entry 6100 (class 1259 OID 1207660)
-- Name: idx_customer_engagement; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_engagement ON whatsapp_customers  (engagement_level);


--
-- TOC entry 6038 (class 1259 OID 1207661)
-- Name: idx_customer_messages_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_messages_branch_id ON customer_messages  (branch_id);


--
-- TOC entry 6039 (class 1259 OID 1207662)
-- Name: idx_customer_messages_channel; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_messages_channel ON customer_messages  (channel);


--
-- TOC entry 6040 (class 1259 OID 1207663)
-- Name: idx_customer_messages_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_messages_created_at ON customer_messages  (created_at DESC);


--
-- TOC entry 6041 (class 1259 OID 1207664)
-- Name: idx_customer_messages_customer_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_messages_customer_created ON customer_messages  (customer_id, created_at DESC);


--
-- TOC entry 6042 (class 1259 OID 1207665)
-- Name: idx_customer_messages_customer_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_messages_customer_id ON customer_messages  (customer_id);


--
-- TOC entry 6043 (class 1259 OID 1207666)
-- Name: idx_customer_messages_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_messages_shared ON customer_messages  (is_shared) WHERE (is_shared = true);


--
-- TOC entry 6044 (class 1259 OID 1207667)
-- Name: idx_customer_messages_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_messages_status ON customer_messages  (status);


--
-- TOC entry 6049 (class 1259 OID 1207668)
-- Name: idx_customer_payments_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_payments_branch_id ON customer_payments  (branch_id);


--
-- TOC entry 6050 (class 1259 OID 1207669)
-- Name: idx_customer_payments_currency; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_payments_currency ON customer_payments  (currency);


--
-- TOC entry 6051 (class 1259 OID 1207670)
-- Name: idx_customer_payments_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_payments_customer ON customer_payments  (customer_id);


--
-- TOC entry 6052 (class 1259 OID 1207671)
-- Name: idx_customer_payments_customer_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_payments_customer_date ON customer_payments  (customer_id, payment_date DESC);


--
-- TOC entry 6053 (class 1259 OID 1207672)
-- Name: idx_customer_payments_customer_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_payments_customer_id ON customer_payments  (customer_id);


--
-- TOC entry 6054 (class 1259 OID 1207673)
-- Name: idx_customer_payments_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_payments_date ON customer_payments  (payment_date);


--
-- TOC entry 6055 (class 1259 OID 1207674)
-- Name: idx_customer_payments_payment_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_payments_payment_date ON customer_payments  (payment_date DESC);


--
-- TOC entry 6056 (class 1259 OID 1207675)
-- Name: idx_customer_payments_reference_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_payments_reference_number ON customer_payments  (reference_number);


--
-- TOC entry 6057 (class 1259 OID 1207676)
-- Name: idx_customer_payments_sale; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_payments_sale ON customer_payments  (sale_id);


--
-- TOC entry 6058 (class 1259 OID 1207677)
-- Name: idx_customer_payments_sale_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_payments_sale_id ON customer_payments  (sale_id);


--
-- TOC entry 6059 (class 1259 OID 1207678)
-- Name: idx_customer_payments_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_payments_status ON customer_payments  (status);


--
-- TOC entry 6101 (class 1259 OID 1207679)
-- Name: idx_customer_phone; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_phone ON whatsapp_customers  (phone_number);


--
-- TOC entry 6067 (class 1259 OID 1207680)
-- Name: idx_customer_preferences_customer_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_preferences_customer_id ON customer_preferences  (customer_id);


--
-- TOC entry 6102 (class 1259 OID 1207681)
-- Name: idx_customer_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customer_status ON whatsapp_customers  (status);


--
-- TOC entry 6079 (class 1259 OID 1207682)
-- Name: idx_customers_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customers_branch ON lats_customers  (branch_id);


--
-- TOC entry 6080 (class 1259 OID 1207683)
-- Name: idx_customers_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customers_email ON lats_customers  (email);


--
-- TOC entry 6081 (class 1259 OID 1207684)
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customers_phone ON lats_customers  (phone);


--
-- TOC entry 6107 (class 1259 OID 1207685)
-- Name: idx_daily_opening_sessions_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_opening_sessions_active ON daily_opening_sessions  (is_active);


--
-- TOC entry 6108 (class 1259 OID 1207686)
-- Name: idx_daily_opening_sessions_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_opening_sessions_date ON daily_opening_sessions  (date);


--
-- TOC entry 6109 (class 1259 OID 1207687)
-- Name: idx_daily_opening_sessions_opened_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_opening_sessions_opened_at ON daily_opening_sessions  (opened_at);


--
-- TOC entry 6110 (class 1259 OID 1207688)
-- Name: idx_daily_opening_sessions_opened_by; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_opening_sessions_opened_by ON daily_opening_sessions  (opened_by_user_id);


--
-- TOC entry 6115 (class 1259 OID 1207689)
-- Name: idx_daily_reports_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_reports_branch ON daily_reports  (branch_id);


--
-- TOC entry 6116 (class 1259 OID 1207690)
-- Name: idx_daily_reports_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_reports_branch_id ON daily_reports  (branch_id);


--
-- TOC entry 6117 (class 1259 OID 1207691)
-- Name: idx_daily_reports_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_reports_date ON daily_reports  (report_date);


--
-- TOC entry 6118 (class 1259 OID 1207692)
-- Name: idx_daily_reports_employee_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_reports_employee_date ON daily_reports  (user_id, report_date);


--
-- TOC entry 6119 (class 1259 OID 1207693)
-- Name: idx_daily_reports_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_reports_status ON daily_reports  (status);


--
-- TOC entry 6124 (class 1259 OID 1207694)
-- Name: idx_daily_sales_closures_closed_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_sales_closures_closed_at ON daily_sales_closures  (closed_at DESC);


--
-- TOC entry 6125 (class 1259 OID 1207695)
-- Name: idx_daily_sales_closures_closed_by; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_sales_closures_closed_by ON daily_sales_closures  (closed_by_user_id);


--
-- TOC entry 6126 (class 1259 OID 1207696)
-- Name: idx_daily_sales_closures_closed_by_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_sales_closures_closed_by_user_id ON daily_sales_closures  (closed_by_user_id);


--
-- TOC entry 6127 (class 1259 OID 1207697)
-- Name: idx_daily_sales_closures_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_sales_closures_date ON daily_sales_closures  (date DESC);


--
-- TOC entry 6128 (class 1259 OID 1207698)
-- Name: idx_daily_sales_closures_session; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_daily_sales_closures_session ON daily_sales_closures  (session_id);


--
-- TOC entry 6320 (class 1259 OID 1207699)
-- Name: idx_delivery_settings_business_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_delivery_settings_business_id ON lats_pos_delivery_settings  (business_id);


--
-- TOC entry 6321 (class 1259 OID 1207700)
-- Name: idx_delivery_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_delivery_settings_user_id ON lats_pos_delivery_settings  (user_id);


--
-- TOC entry 6144 (class 1259 OID 1207701)
-- Name: idx_devices_assigned_to; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_devices_assigned_to ON devices  (assigned_to);


--
-- TOC entry 6145 (class 1259 OID 1207702)
-- Name: idx_devices_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_devices_branch_id ON devices  (branch_id);


--
-- TOC entry 6146 (class 1259 OID 1207703)
-- Name: idx_devices_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_devices_customer ON devices  (customer_id);


--
-- TOC entry 6147 (class 1259 OID 1207704)
-- Name: idx_devices_is_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_devices_is_shared ON devices  (is_shared);


--
-- TOC entry 6148 (class 1259 OID 1207705)
-- Name: idx_devices_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_devices_status ON devices  (status);


--
-- TOC entry 6163 (class 1259 OID 1207706)
-- Name: idx_document_templates_default; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_templates_default ON document_templates  (is_default);


--
-- TOC entry 6164 (class 1259 OID 1207707)
-- Name: idx_document_templates_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_templates_type ON document_templates  (type);


--
-- TOC entry 6165 (class 1259 OID 1207708)
-- Name: idx_document_templates_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_document_templates_user ON document_templates  (user_id);


--
-- TOC entry 6326 (class 1259 OID 1207709)
-- Name: idx_dynamic_pricing_business_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_dynamic_pricing_business_id ON lats_pos_dynamic_pricing_settings  (business_id);


--
-- TOC entry 6327 (class 1259 OID 1207710)
-- Name: idx_dynamic_pricing_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_dynamic_pricing_settings_user_id ON lats_pos_dynamic_pricing_settings  (user_id);


--
-- TOC entry 6328 (class 1259 OID 1207711)
-- Name: idx_dynamic_pricing_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_dynamic_pricing_user_id ON lats_pos_dynamic_pricing_settings  (user_id);


--
-- TOC entry 6172 (class 1259 OID 1207712)
-- Name: idx_employees_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employees_branch ON employees  (branch_id);


--
-- TOC entry 6173 (class 1259 OID 1207713)
-- Name: idx_employees_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employees_branch_id ON employees  (branch_id);


--
-- TOC entry 6174 (class 1259 OID 1207714)
-- Name: idx_employees_department; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employees_department ON employees  (department);


--
-- TOC entry 6175 (class 1259 OID 1207715)
-- Name: idx_employees_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employees_email ON employees  (email);


--
-- TOC entry 6176 (class 1259 OID 1207716)
-- Name: idx_employees_is_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employees_is_shared ON employees  (is_shared) WHERE (is_shared = true);


--
-- TOC entry 6177 (class 1259 OID 1207717)
-- Name: idx_employees_manager_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employees_manager_id ON employees  (manager_id);


--
-- TOC entry 6178 (class 1259 OID 1207718)
-- Name: idx_employees_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employees_status ON employees  (status);


--
-- TOC entry 6179 (class 1259 OID 1207719)
-- Name: idx_employees_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_employees_user_id ON employees  (user_id);


--
-- TOC entry 6193 (class 1259 OID 1207720)
-- Name: idx_expenses_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_branch_id ON expenses  (branch_id);


--
-- TOC entry 6194 (class 1259 OID 1207721)
-- Name: idx_expenses_category; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_category ON expenses  (category);


--
-- TOC entry 6195 (class 1259 OID 1207722)
-- Name: idx_expenses_created_by; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_created_by ON expenses  (created_by);


--
-- TOC entry 6196 (class 1259 OID 1207723)
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_date ON expenses  (date);


--
-- TOC entry 6197 (class 1259 OID 1207724)
-- Name: idx_expenses_product_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_product_id ON expenses  (product_id);


--
-- TOC entry 6198 (class 1259 OID 1207725)
-- Name: idx_expenses_purchase_order_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_purchase_order_id ON expenses  (purchase_order_id);


--
-- TOC entry 6199 (class 1259 OID 1207726)
-- Name: idx_expenses_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_expenses_status ON expenses  (status);


--
-- TOC entry 6202 (class 1259 OID 1207727)
-- Name: idx_finance_accounts_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_finance_accounts_active ON finance_accounts  (is_active);


--
-- TOC entry 6203 (class 1259 OID 1207728)
-- Name: idx_finance_accounts_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_finance_accounts_branch_id ON finance_accounts  (branch_id);


--
-- TOC entry 6204 (class 1259 OID 1207729)
-- Name: idx_finance_accounts_payment_method; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_finance_accounts_payment_method ON finance_accounts  (is_payment_method);


--
-- TOC entry 6205 (class 1259 OID 1207730)
-- Name: idx_finance_accounts_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_finance_accounts_type ON finance_accounts  (account_type);


--
-- TOC entry 6223 (class 1259 OID 1207731)
-- Name: idx_finance_expenses_account; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_finance_expenses_account ON finance_expenses  (account_id);


--
-- TOC entry 6224 (class 1259 OID 1207732)
-- Name: idx_finance_expenses_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_finance_expenses_branch ON finance_expenses  (branch_id);


--
-- TOC entry 6225 (class 1259 OID 1207733)
-- Name: idx_finance_expenses_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_finance_expenses_branch_id ON finance_expenses  (branch_id);


--
-- TOC entry 6226 (class 1259 OID 1207734)
-- Name: idx_finance_expenses_category_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_finance_expenses_category_id ON finance_expenses  (expense_category_id);


--
-- TOC entry 6227 (class 1259 OID 1207735)
-- Name: idx_finance_expenses_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_finance_expenses_date ON finance_expenses  (expense_date DESC);


--
-- TOC entry 6228 (class 1259 OID 1207736)
-- Name: idx_finance_expenses_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_finance_expenses_status ON finance_expenses  (status);


--
-- TOC entry 6231 (class 1259 OID 1207737)
-- Name: idx_finance_transfers_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_finance_transfers_branch_id ON finance_transfers  (branch_id);


--
-- TOC entry 6232 (class 1259 OID 1207738)
-- Name: idx_finance_transfers_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_finance_transfers_shared ON finance_transfers  (is_shared) WHERE (is_shared = true);


--
-- TOC entry 6336 (class 1259 OID 1207739)
-- Name: idx_general_settings_business_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_general_settings_business_id ON lats_pos_general_settings  (business_id);


--
-- TOC entry 6337 (class 1259 OID 1207740)
-- Name: idx_general_settings_passcode; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_general_settings_passcode ON lats_pos_general_settings  (day_closing_passcode);


--
-- TOC entry 6338 (class 1259 OID 1207741)
-- Name: idx_general_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_general_settings_user_id ON lats_pos_general_settings  (user_id);


--
-- TOC entry 6235 (class 1259 OID 1207742)
-- Name: idx_gift_card_transactions_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_gift_card_transactions_branch_id ON gift_card_transactions  (branch_id);


--
-- TOC entry 6240 (class 1259 OID 1207743)
-- Name: idx_gift_cards_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_gift_cards_branch ON gift_cards  (branch_id);


--
-- TOC entry 6241 (class 1259 OID 1207744)
-- Name: idx_gift_cards_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_gift_cards_shared ON gift_cards  (is_shared) WHERE (is_shared = true);


--
-- TOC entry 6242 (class 1259 OID 1207745)
-- Name: idx_imei_validation_imei; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_imei_validation_imei ON imei_validation  (imei);


--
-- TOC entry 6243 (class 1259 OID 1207746)
-- Name: idx_imei_validation_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_imei_validation_status ON imei_validation  (imei_status);


--
-- TOC entry 6248 (class 1259 OID 1207747)
-- Name: idx_installment_payments_account; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_installment_payments_account ON installment_payments  (account_id);


--
-- TOC entry 6249 (class 1259 OID 1207748)
-- Name: idx_installment_payments_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_installment_payments_branch_id ON installment_payments  (branch_id);


--
-- TOC entry 6250 (class 1259 OID 1207749)
-- Name: idx_installment_payments_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_installment_payments_customer ON installment_payments  (customer_id);


--
-- TOC entry 6251 (class 1259 OID 1207750)
-- Name: idx_installment_payments_plan; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_installment_payments_plan ON installment_payments  (installment_plan_id);


--
-- TOC entry 6031 (class 1259 OID 1207751)
-- Name: idx_installment_plans_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_installment_plans_branch ON customer_installment_plans  (branch_id);


--
-- TOC entry 6032 (class 1259 OID 1207752)
-- Name: idx_installment_plans_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_installment_plans_customer ON customer_installment_plans  (customer_id);


--
-- TOC entry 6033 (class 1259 OID 1207753)
-- Name: idx_installment_plans_next_payment; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_installment_plans_next_payment ON customer_installment_plans  (next_payment_date);


--
-- TOC entry 6034 (class 1259 OID 1207754)
-- Name: idx_installment_plans_sale; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_installment_plans_sale ON customer_installment_plans  (sale_id);


--
-- TOC entry 6035 (class 1259 OID 1207755)
-- Name: idx_installment_plans_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_installment_plans_status ON customer_installment_plans  (status);


--
-- TOC entry 6345 (class 1259 OID 1207756)
-- Name: idx_integrations_business_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_integrations_business_id ON lats_pos_integrations_settings  (business_id);


--
-- TOC entry 6346 (class 1259 OID 1207757)
-- Name: idx_integrations_enabled; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_integrations_enabled ON lats_pos_integrations_settings  (is_enabled) WHERE (is_enabled = true);


--
-- TOC entry 6347 (class 1259 OID 1207758)
-- Name: idx_integrations_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_integrations_type ON lats_pos_integrations_settings  (integration_type);


--
-- TOC entry 6348 (class 1259 OID 1207759)
-- Name: idx_integrations_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_integrations_user_id ON lats_pos_integrations_settings  (user_id);


--
-- TOC entry 6286 (class 1259 OID 1207760)
-- Name: idx_inventory_adjustments_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_adjustments_created ON lats_inventory_adjustments  (created_at);


--
-- TOC entry 6287 (class 1259 OID 1207761)
-- Name: idx_inventory_adjustments_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_adjustments_product ON lats_inventory_adjustments  (product_id);


--
-- TOC entry 6288 (class 1259 OID 1207762)
-- Name: idx_inventory_adjustments_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_adjustments_type ON lats_inventory_adjustments  (type);


--
-- TOC entry 6289 (class 1259 OID 1207763)
-- Name: idx_inventory_adjustments_variant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_adjustments_variant ON lats_inventory_adjustments  (variant_id);


--
-- TOC entry 6292 (class 1259 OID 1207764)
-- Name: idx_inventory_items_barcode; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_items_barcode ON lats_inventory_items  (barcode) WHERE (barcode IS NOT NULL);


--
-- TOC entry 6258 (class 1259 OID 1207765)
-- Name: idx_inventory_items_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_items_branch_id ON inventory_items  (branch_id);


--
-- TOC entry 6293 (class 1259 OID 1207766)
-- Name: idx_inventory_items_imei; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_items_imei ON lats_inventory_items  (imei) WHERE (imei IS NOT NULL);


--
-- TOC entry 6259 (class 1259 OID 1207767)
-- Name: idx_inventory_items_is_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_items_is_shared ON inventory_items  (is_shared);


--
-- TOC entry 6260 (class 1259 OID 1207768)
-- Name: idx_inventory_items_metadata; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_items_metadata ON inventory_items  (metadata);


--
-- TOC entry 6294 (class 1259 OID 1207769)
-- Name: idx_inventory_items_po; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_items_po ON lats_inventory_items  (purchase_order_id);


--
-- TOC entry 6261 (class 1259 OID 1207770)
-- Name: idx_inventory_items_po_item; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_items_po_item ON inventory_items  (purchase_order_item_id);


--
-- TOC entry 6295 (class 1259 OID 1207771)
-- Name: idx_inventory_items_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_items_product ON lats_inventory_items  (product_id);


--
-- TOC entry 6296 (class 1259 OID 1207772)
-- Name: idx_inventory_items_serial; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_items_serial ON lats_inventory_items  (serial_number) WHERE (serial_number IS NOT NULL);


--
-- TOC entry 6297 (class 1259 OID 1207773)
-- Name: idx_inventory_items_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_items_status ON lats_inventory_items  (status);


--
-- TOC entry 6298 (class 1259 OID 1207774)
-- Name: idx_inventory_items_variant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_items_variant ON lats_inventory_items  (variant_id);


--
-- TOC entry 6262 (class 1259 OID 1207775)
-- Name: idx_inventory_items_variant_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_items_variant_id ON inventory_items  (variant_id) WHERE (variant_id IS NOT NULL);


--
-- TOC entry 6263 (class 1259 OID 1207776)
-- Name: idx_inventory_visible_branches; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_inventory_visible_branches ON inventory_items  (visible_to_branches);


--
-- TOC entry 6275 (class 1259 OID 1207777)
-- Name: idx_lats_categories_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_categories_active ON lats_categories  (is_active);


--
-- TOC entry 6082 (class 1259 OID 1207778)
-- Name: idx_lats_customers_birthday; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_customers_birthday ON lats_customers  (birthday);


--
-- TOC entry 6083 (class 1259 OID 1207779)
-- Name: idx_lats_customers_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_customers_branch ON lats_customers  (branch_id);


--
-- TOC entry 6084 (class 1259 OID 1207780)
-- Name: idx_lats_customers_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_customers_created_at ON lats_customers  (created_at);


--
-- TOC entry 6085 (class 1259 OID 1207781)
-- Name: idx_lats_customers_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_customers_email ON lats_customers  (email);


--
-- TOC entry 6086 (class 1259 OID 1207782)
-- Name: idx_lats_customers_is_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_customers_is_active ON lats_customers  (is_active);


--
-- TOC entry 6087 (class 1259 OID 1207783)
-- Name: idx_lats_customers_is_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_customers_is_shared ON lats_customers  (is_shared);


--
-- TOC entry 6088 (class 1259 OID 1207784)
-- Name: idx_lats_customers_last_visit; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_customers_last_visit ON lats_customers  (last_visit);


--
-- TOC entry 6089 (class 1259 OID 1207785)
-- Name: idx_lats_customers_loyalty_level; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_customers_loyalty_level ON lats_customers  (loyalty_level);


--
-- TOC entry 6090 (class 1259 OID 1207786)
-- Name: idx_lats_customers_phone; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_customers_phone ON lats_customers  (phone);


--
-- TOC entry 6091 (class 1259 OID 1207787)
-- Name: idx_lats_customers_referred_by; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_customers_referred_by ON lats_customers  (referred_by);


--
-- TOC entry 6092 (class 1259 OID 1207788)
-- Name: idx_lats_customers_sharing_mode; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_customers_sharing_mode ON lats_customers  (sharing_mode);


--
-- TOC entry 6093 (class 1259 OID 1207789)
-- Name: idx_lats_customers_whatsapp; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_customers_whatsapp ON lats_customers  (whatsapp);


--
-- TOC entry 6299 (class 1259 OID 1207790)
-- Name: idx_lats_inventory_items_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_inventory_items_branch ON lats_inventory_items  (branch_id);


--
-- TOC entry 6300 (class 1259 OID 1207791)
-- Name: idx_lats_inventory_items_storage_room; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_inventory_items_storage_room ON lats_inventory_items  (storage_room_id);


--
-- TOC entry 6329 (class 1259 OID 1207792)
-- Name: idx_lats_pos_dynamic_pricing_settings_business_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_pos_dynamic_pricing_settings_business_id ON lats_pos_dynamic_pricing_settings  (business_id);


--
-- TOC entry 6330 (class 1259 OID 1207793)
-- Name: idx_lats_pos_dynamic_pricing_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_pos_dynamic_pricing_settings_user_id ON lats_pos_dynamic_pricing_settings  (user_id);


--
-- TOC entry 6339 (class 1259 OID 1207794)
-- Name: idx_lats_pos_general_settings_business_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_pos_general_settings_business_id ON lats_pos_general_settings  (business_id);


--
-- TOC entry 6340 (class 1259 OID 1207795)
-- Name: idx_lats_pos_general_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_pos_general_settings_user_id ON lats_pos_general_settings  (user_id);


--
-- TOC entry 6353 (class 1259 OID 1207796)
-- Name: idx_lats_pos_loyalty_customer_settings_business_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_pos_loyalty_customer_settings_business_id ON lats_pos_loyalty_customer_settings  (business_id);


--
-- TOC entry 6354 (class 1259 OID 1207797)
-- Name: idx_lats_pos_loyalty_customer_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_pos_loyalty_customer_settings_user_id ON lats_pos_loyalty_customer_settings  (user_id);


--
-- TOC entry 6367 (class 1259 OID 1207798)
-- Name: idx_lats_pos_receipt_settings_business_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_pos_receipt_settings_business_id ON lats_pos_receipt_settings  (business_id);


--
-- TOC entry 6368 (class 1259 OID 1207799)
-- Name: idx_lats_pos_receipt_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_pos_receipt_settings_user_id ON lats_pos_receipt_settings  (user_id);


--
-- TOC entry 6380 (class 1259 OID 1207800)
-- Name: idx_lats_pos_user_permissions_settings_business_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_pos_user_permissions_settings_business_id ON lats_pos_user_permissions_settings  (business_id);


--
-- TOC entry 6381 (class 1259 OID 1207801)
-- Name: idx_lats_pos_user_permissions_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_pos_user_permissions_settings_user_id ON lats_pos_user_permissions_settings  (user_id);


--
-- TOC entry 5877 (class 1259 OID 1207802)
-- Name: idx_lats_product_variants_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_product_variants_branch_id ON lats_product_variants  (branch_id);


--
-- TOC entry 5878 (class 1259 OID 1207803)
-- Name: idx_lats_product_variants_imei; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_product_variants_imei ON lats_product_variants  (((variant_attributes ->> 'imei'::text))) WHERE ((variant_attributes ->> 'imei'::text) IS NOT NULL);


--
-- TOC entry 5879 (class 1259 OID 1207804)
-- Name: idx_lats_product_variants_imei_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_product_variants_imei_status ON lats_product_variants  (((variant_attributes ->> 'imei_status'::text))) WHERE ((variant_type)::text = 'imei_child'::text);


--
-- TOC entry 5880 (class 1259 OID 1207805)
-- Name: idx_lats_product_variants_is_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_product_variants_is_shared ON lats_product_variants  (is_shared);


--
-- TOC entry 5881 (class 1259 OID 1207806)
-- Name: idx_lats_product_variants_parent_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_product_variants_parent_id ON lats_product_variants  (parent_variant_id) WHERE (parent_variant_id IS NOT NULL);


--
-- TOC entry 5882 (class 1259 OID 1207807)
-- Name: idx_lats_product_variants_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_product_variants_product ON lats_product_variants  (product_id);


--
-- TOC entry 5883 (class 1259 OID 1207808)
-- Name: idx_lats_product_variants_quantity; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_product_variants_quantity ON lats_product_variants  (product_id, quantity);


--
-- TOC entry 5884 (class 1259 OID 1207809)
-- Name: idx_lats_product_variants_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_product_variants_status ON lats_product_variants  (status);


--
-- TOC entry 5908 (class 1259 OID 1207810)
-- Name: idx_lats_products_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_active ON lats_products  (is_active);


--
-- TOC entry 5909 (class 1259 OID 1207811)
-- Name: idx_lats_products_attributes_gin; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_attributes_gin ON lats_products  (attributes);


--
-- TOC entry 5910 (class 1259 OID 1207812)
-- Name: idx_lats_products_barcode; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_barcode ON lats_products  (barcode);


--
-- TOC entry 5911 (class 1259 OID 1207813)
-- Name: idx_lats_products_branch_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_branch_created ON lats_products  (branch_id, created_at DESC);


--
-- TOC entry 5912 (class 1259 OID 1207814)
-- Name: idx_lats_products_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_branch_id ON lats_products  (branch_id);


--
-- TOC entry 5913 (class 1259 OID 1207815)
-- Name: idx_lats_products_category; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_category ON lats_products  (category_id);


--
-- TOC entry 5914 (class 1259 OID 1207816)
-- Name: idx_lats_products_category_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_category_id ON lats_products  (category_id);


--
-- TOC entry 5915 (class 1259 OID 1207817)
-- Name: idx_lats_products_condition; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_condition ON lats_products  (condition);


--
-- TOC entry 5916 (class 1259 OID 1207818)
-- Name: idx_lats_products_is_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_is_active ON lats_products  (is_active);


--
-- TOC entry 5917 (class 1259 OID 1207819)
-- Name: idx_lats_products_is_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_is_shared ON lats_products  (is_shared);


--
-- TOC entry 5918 (class 1259 OID 1207820)
-- Name: idx_lats_products_metadata_gin; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_metadata_gin ON lats_products  (metadata);


--
-- TOC entry 5919 (class 1259 OID 1207821)
-- Name: idx_lats_products_name; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_name ON lats_products  (name);


--
-- TOC entry 5920 (class 1259 OID 1207822)
-- Name: idx_lats_products_null_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_null_branch ON lats_products  (id, created_at DESC) WHERE (branch_id IS NULL);


--
-- TOC entry 5921 (class 1259 OID 1207823)
-- Name: idx_lats_products_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_shared ON lats_products  (is_shared, branch_id);


--
-- TOC entry 5922 (class 1259 OID 1207824)
-- Name: idx_lats_products_sharing_mode; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_sharing_mode ON lats_products  (sharing_mode);


--
-- TOC entry 5923 (class 1259 OID 1207825)
-- Name: idx_lats_products_shelf_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_shelf_id ON lats_products  (shelf_id);


--
-- TOC entry 5924 (class 1259 OID 1207826)
-- Name: idx_lats_products_sku; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_sku ON lats_products  (sku);


--
-- TOC entry 5925 (class 1259 OID 1207827)
-- Name: idx_lats_products_storage; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_storage ON lats_products  (storage_room_id, store_shelf_id);


--
-- TOC entry 5926 (class 1259 OID 1207828)
-- Name: idx_lats_products_storage_room_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_storage_room_id ON lats_products  (storage_room_id);


--
-- TOC entry 5927 (class 1259 OID 1207829)
-- Name: idx_lats_products_store_shelf_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_store_shelf_id ON lats_products  (store_shelf_id);


--
-- TOC entry 5928 (class 1259 OID 1207830)
-- Name: idx_lats_products_supplier; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_supplier ON lats_products  (supplier_id);


--
-- TOC entry 5929 (class 1259 OID 1207831)
-- Name: idx_lats_products_tags_gin; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_products_tags_gin ON lats_products  (tags);


--
-- TOC entry 6404 (class 1259 OID 1207832)
-- Name: idx_lats_purchase_order_payments_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_purchase_order_payments_branch_id ON lats_purchase_order_payments  (branch_id);


--
-- TOC entry 5944 (class 1259 OID 1207833)
-- Name: idx_lats_purchase_orders_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_purchase_orders_branch_id ON lats_purchase_orders  (branch_id);


--
-- TOC entry 5945 (class 1259 OID 1207834)
-- Name: idx_lats_purchase_orders_currency; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_purchase_orders_currency ON lats_purchase_orders  (currency);


--
-- TOC entry 5946 (class 1259 OID 1207835)
-- Name: idx_lats_purchase_orders_exchange_rate_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_purchase_orders_exchange_rate_date ON lats_purchase_orders  (exchange_rate_date);


--
-- TOC entry 5947 (class 1259 OID 1207836)
-- Name: idx_lats_purchase_orders_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_purchase_orders_status ON lats_purchase_orders  (status);


--
-- TOC entry 6416 (class 1259 OID 1207837)
-- Name: idx_lats_receipts_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_receipts_created_at ON lats_receipts  (created_at DESC);


--
-- TOC entry 6417 (class 1259 OID 1207838)
-- Name: idx_lats_receipts_customer_phone; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_receipts_customer_phone ON lats_receipts  (customer_phone);


--
-- TOC entry 6418 (class 1259 OID 1207839)
-- Name: idx_lats_receipts_receipt_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_receipts_receipt_number ON lats_receipts  (receipt_number);


--
-- TOC entry 6419 (class 1259 OID 1207840)
-- Name: idx_lats_receipts_sale_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_receipts_sale_id ON lats_receipts  (sale_id);


--
-- TOC entry 6422 (class 1259 OID 1207841)
-- Name: idx_lats_sale_items_product_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_sale_items_product_id ON lats_sale_items  (product_id);


--
-- TOC entry 6423 (class 1259 OID 1207842)
-- Name: idx_lats_sale_items_sale_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_sale_items_sale_id ON lats_sale_items  (sale_id);


--
-- TOC entry 6429 (class 1259 OID 1207843)
-- Name: idx_lats_sales_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_sales_branch_id ON lats_sales  (branch_id);


--
-- TOC entry 6430 (class 1259 OID 1207844)
-- Name: idx_lats_sales_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_sales_created_at ON lats_sales  (created_at DESC);


--
-- TOC entry 6431 (class 1259 OID 1207845)
-- Name: idx_lats_sales_customer_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_sales_customer_id ON lats_sales  (customer_id);


--
-- TOC entry 6432 (class 1259 OID 1207846)
-- Name: idx_lats_sales_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_sales_status ON lats_sales  (status);


--
-- TOC entry 6433 (class 1259 OID 1207847)
-- Name: idx_lats_sales_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_sales_user_id ON lats_sales  (user_id);


--
-- TOC entry 6477 (class 1259 OID 1207848)
-- Name: idx_lats_stock_movements_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_stock_movements_created_at ON lats_stock_movements  (created_at DESC);


--
-- TOC entry 6478 (class 1259 OID 1207849)
-- Name: idx_lats_stock_movements_movement_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_stock_movements_movement_type ON lats_stock_movements  (movement_type);


--
-- TOC entry 6479 (class 1259 OID 1207850)
-- Name: idx_lats_stock_movements_product_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_stock_movements_product_id ON lats_stock_movements  (product_id);


--
-- TOC entry 6480 (class 1259 OID 1207851)
-- Name: idx_lats_stock_movements_variant_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_stock_movements_variant_id ON lats_stock_movements  (variant_id);


--
-- TOC entry 6491 (class 1259 OID 1207852)
-- Name: idx_lats_stock_transfers_from_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_stock_transfers_from_branch ON lats_stock_transfers  (from_branch_id);


--
-- TOC entry 6492 (class 1259 OID 1207853)
-- Name: idx_lats_stock_transfers_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_stock_transfers_product ON lats_stock_transfers  (product_id);


--
-- TOC entry 6493 (class 1259 OID 1207854)
-- Name: idx_lats_stock_transfers_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_stock_transfers_status ON lats_stock_transfers  (status);


--
-- TOC entry 6494 (class 1259 OID 1207855)
-- Name: idx_lats_stock_transfers_to_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_stock_transfers_to_branch ON lats_stock_transfers  (to_branch_id);


--
-- TOC entry 6495 (class 1259 OID 1207856)
-- Name: idx_lats_stock_transfers_variant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_stock_transfers_variant ON lats_stock_transfers  (variant_id);


--
-- TOC entry 6508 (class 1259 OID 1207857)
-- Name: idx_lats_store_locations_city; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_store_locations_city ON lats_store_locations  (city);


--
-- TOC entry 6509 (class 1259 OID 1207858)
-- Name: idx_lats_store_locations_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_store_locations_code ON lats_store_locations  (code);


--
-- TOC entry 6510 (class 1259 OID 1207859)
-- Name: idx_lats_store_locations_is_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_store_locations_is_active ON lats_store_locations  (is_active);


--
-- TOC entry 6500 (class 1259 OID 1207860)
-- Name: idx_lats_store_rooms_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_store_rooms_code ON lats_store_rooms  (code);


--
-- TOC entry 6501 (class 1259 OID 1207861)
-- Name: idx_lats_store_rooms_is_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_store_rooms_is_active ON lats_store_rooms  (is_active);


--
-- TOC entry 6502 (class 1259 OID 1207862)
-- Name: idx_lats_store_rooms_location_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_store_rooms_location_id ON lats_store_rooms  (store_location_id);


--
-- TOC entry 6515 (class 1259 OID 1207863)
-- Name: idx_lats_store_shelves_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_store_shelves_code ON lats_store_shelves  (code);


--
-- TOC entry 6516 (class 1259 OID 1207864)
-- Name: idx_lats_store_shelves_is_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_store_shelves_is_active ON lats_store_shelves  (is_active);


--
-- TOC entry 6517 (class 1259 OID 1207865)
-- Name: idx_lats_store_shelves_location_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_store_shelves_location_id ON lats_store_shelves  (store_location_id);


--
-- TOC entry 6518 (class 1259 OID 1207866)
-- Name: idx_lats_store_shelves_storage_room_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_store_shelves_storage_room_id ON lats_store_shelves  (storage_room_id);


--
-- TOC entry 5953 (class 1259 OID 1207867)
-- Name: idx_lats_suppliers_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_suppliers_active ON lats_suppliers  (is_active);


--
-- TOC entry 5954 (class 1259 OID 1207868)
-- Name: idx_lats_suppliers_city; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_suppliers_city ON lats_suppliers  (city);


--
-- TOC entry 5955 (class 1259 OID 1207869)
-- Name: idx_lats_suppliers_country; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_suppliers_country ON lats_suppliers  (country);


--
-- TOC entry 5956 (class 1259 OID 1207870)
-- Name: idx_lats_suppliers_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_suppliers_created_at ON lats_suppliers  (created_at DESC);


--
-- TOC entry 5957 (class 1259 OID 1207871)
-- Name: idx_lats_suppliers_is_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_suppliers_is_active ON lats_suppliers  (is_active);


--
-- TOC entry 5958 (class 1259 OID 1207872)
-- Name: idx_lats_suppliers_is_trade_in; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_suppliers_is_trade_in ON lats_suppliers  (is_trade_in_customer);


--
-- TOC entry 5959 (class 1259 OID 1207873)
-- Name: idx_lats_suppliers_name; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_suppliers_name ON lats_suppliers  (name);


--
-- TOC entry 5960 (class 1259 OID 1207874)
-- Name: idx_lats_suppliers_preferred_currency; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lats_suppliers_preferred_currency ON lats_suppliers  (preferred_currency);


--
-- TOC entry 6596 (class 1259 OID 1207875)
-- Name: idx_leave_dates; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_leave_dates ON leave_requests  (start_date, end_date);


--
-- TOC entry 6597 (class 1259 OID 1207876)
-- Name: idx_leave_employee_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_leave_employee_id ON leave_requests  (employee_id);


--
-- TOC entry 6598 (class 1259 OID 1207877)
-- Name: idx_leave_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_leave_status ON leave_requests  (status);


--
-- TOC entry 6355 (class 1259 OID 1207878)
-- Name: idx_loyalty_customer_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_loyalty_customer_settings_user_id ON lats_pos_loyalty_customer_settings  (user_id);


--
-- TOC entry 6601 (class 1259 OID 1207879)
-- Name: idx_loyalty_points_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_loyalty_points_branch ON loyalty_points  (branch_id);


--
-- TOC entry 6602 (class 1259 OID 1207880)
-- Name: idx_loyalty_points_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_loyalty_points_created_at ON loyalty_points  (created_at);


--
-- TOC entry 6603 (class 1259 OID 1207881)
-- Name: idx_loyalty_points_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_loyalty_points_customer ON loyalty_points  (customer_id);


--
-- TOC entry 6604 (class 1259 OID 1207882)
-- Name: idx_loyalty_points_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_loyalty_points_type ON loyalty_points  (points_type);


--
-- TOC entry 6356 (class 1259 OID 1207883)
-- Name: idx_loyalty_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_loyalty_settings_user_id ON lats_pos_loyalty_customer_settings  (user_id);


--
-- TOC entry 6607 (class 1259 OID 1207884)
-- Name: idx_mobile_money_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_mobile_money_customer ON mobile_money_transactions  (customer_id);


--
-- TOC entry 6608 (class 1259 OID 1207885)
-- Name: idx_mobile_money_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_mobile_money_date ON mobile_money_transactions  (message_date DESC);


--
-- TOC entry 6609 (class 1259 OID 1207886)
-- Name: idx_mobile_money_processed; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_mobile_money_processed ON mobile_money_transactions  (is_processed);


--
-- TOC entry 6610 (class 1259 OID 1207887)
-- Name: idx_mobile_money_provider; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_mobile_money_provider ON mobile_money_transactions  (provider);


--
-- TOC entry 6611 (class 1259 OID 1207888)
-- Name: idx_mobile_money_receiver_phone; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_mobile_money_receiver_phone ON mobile_money_transactions  (receiver_phone);


--
-- TOC entry 6612 (class 1259 OID 1207889)
-- Name: idx_mobile_money_reference; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_mobile_money_reference ON mobile_money_transactions  (reference_number);


--
-- TOC entry 6613 (class 1259 OID 1207890)
-- Name: idx_mobile_money_sender_phone; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_mobile_money_sender_phone ON mobile_money_transactions  (sender_phone);


--
-- TOC entry 6614 (class 1259 OID 1207891)
-- Name: idx_mobile_money_transactions_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_mobile_money_transactions_branch_id ON mobile_money_transactions  (branch_id);


--
-- TOC entry 6615 (class 1259 OID 1207892)
-- Name: idx_mobile_money_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_mobile_money_type ON mobile_money_transactions  (transaction_type);


--
-- TOC entry 6361 (class 1259 OID 1207893)
-- Name: idx_notification_settings_business_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notification_settings_business_id ON lats_pos_notification_settings  (business_id);


--
-- TOC entry 6362 (class 1259 OID 1207894)
-- Name: idx_notification_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notification_settings_user_id ON lats_pos_notification_settings  (user_id);


--
-- TOC entry 6623 (class 1259 OID 1207895)
-- Name: idx_notifications_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_branch_id ON notifications  (branch_id);


--
-- TOC entry 6624 (class 1259 OID 1207896)
-- Name: idx_notifications_category; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_category ON notifications  (category);


--
-- TOC entry 6625 (class 1259 OID 1207897)
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_created_at ON notifications  (created_at DESC);


--
-- TOC entry 6626 (class 1259 OID 1207898)
-- Name: idx_notifications_customer_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_customer_id ON notifications  (customer_id);


--
-- TOC entry 6627 (class 1259 OID 1207899)
-- Name: idx_notifications_device_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_device_id ON notifications  (device_id);


--
-- TOC entry 6628 (class 1259 OID 1207900)
-- Name: idx_notifications_group_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_group_id ON notifications  (group_id);


--
-- TOC entry 6629 (class 1259 OID 1207901)
-- Name: idx_notifications_priority; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_priority ON notifications  (priority);


--
-- TOC entry 6630 (class 1259 OID 1207902)
-- Name: idx_notifications_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_status ON notifications  (status);


--
-- TOC entry 6631 (class 1259 OID 1207903)
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_type ON notifications  (type);


--
-- TOC entry 6632 (class 1259 OID 1207904)
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_user_created ON notifications  (user_id, created_at DESC);


--
-- TOC entry 6633 (class 1259 OID 1207905)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_user_id ON notifications  (user_id);


--
-- TOC entry 6634 (class 1259 OID 1207906)
-- Name: idx_notifications_user_priority; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_user_priority ON notifications  (user_id, priority);


--
-- TOC entry 6635 (class 1259 OID 1207907)
-- Name: idx_notifications_user_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_user_status ON notifications  (user_id, status);


--
-- TOC entry 6640 (class 1259 OID 1207908)
-- Name: idx_payment_methods_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_methods_active ON payment_methods  (is_active);


--
-- TOC entry 6645 (class 1259 OID 1207909)
-- Name: idx_payment_trans_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_trans_created ON payment_transactions  (created_at);


--
-- TOC entry 6646 (class 1259 OID 1207910)
-- Name: idx_payment_trans_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_trans_customer ON payment_transactions  (customer_id);


--
-- TOC entry 6647 (class 1259 OID 1207911)
-- Name: idx_payment_trans_order; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_trans_order ON payment_transactions  (order_id);


--
-- TOC entry 6648 (class 1259 OID 1207912)
-- Name: idx_payment_trans_provider; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_trans_provider ON payment_transactions  (provider);


--
-- TOC entry 6649 (class 1259 OID 1207913)
-- Name: idx_payment_trans_sale; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_trans_sale ON payment_transactions  (sale_id);


--
-- TOC entry 6650 (class 1259 OID 1207914)
-- Name: idx_payment_trans_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_trans_status ON payment_transactions  (status);


--
-- TOC entry 6651 (class 1259 OID 1207915)
-- Name: idx_payment_transactions_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payment_transactions_branch ON payment_transactions  (branch_id);


--
-- TOC entry 6652 (class 1259 OID 1207916)
-- Name: idx_payment_transactions_sale_id_unique; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_payment_transactions_sale_id_unique ON payment_transactions  (sale_id) WHERE (sale_id IS NOT NULL);


--
-- TOC entry 6382 (class 1259 OID 1207917)
-- Name: idx_permissions_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_permissions_settings_user_id ON lats_pos_user_permissions_settings  (user_id);


--
-- TOC entry 6129 (class 1259 OID 1207918)
-- Name: idx_po_items_variant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_items_variant ON lats_purchase_order_items  (variant_id);


--
-- TOC entry 6405 (class 1259 OID 1207919)
-- Name: idx_po_payments_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_payments_date ON lats_purchase_order_payments  (payment_date);


--
-- TOC entry 6675 (class 1259 OID 1207920)
-- Name: idx_po_payments_payment_account_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_payments_payment_account_id ON purchase_order_payments  (payment_account_id);


--
-- TOC entry 6676 (class 1259 OID 1207921)
-- Name: idx_po_payments_payment_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_payments_payment_date ON purchase_order_payments  (payment_date);


--
-- TOC entry 6406 (class 1259 OID 1207922)
-- Name: idx_po_payments_po; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_payments_po ON lats_purchase_order_payments  (purchase_order_id);


--
-- TOC entry 6677 (class 1259 OID 1207923)
-- Name: idx_po_payments_purchase_order_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_payments_purchase_order_id ON purchase_order_payments  (purchase_order_id);


--
-- TOC entry 6678 (class 1259 OID 1207924)
-- Name: idx_po_payments_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_payments_status ON purchase_order_payments  (status);


--
-- TOC entry 6682 (class 1259 OID 1207925)
-- Name: idx_po_quality_check_items_po_item; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_quality_check_items_po_item ON purchase_order_quality_check_items  (purchase_order_item_id);


--
-- TOC entry 6683 (class 1259 OID 1207926)
-- Name: idx_po_quality_check_items_qc; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_quality_check_items_qc ON purchase_order_quality_check_items  (quality_check_id);


--
-- TOC entry 6686 (class 1259 OID 1207927)
-- Name: idx_po_quality_checks_po; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_quality_checks_po ON purchase_order_quality_checks  (purchase_order_id);


--
-- TOC entry 6687 (class 1259 OID 1207928)
-- Name: idx_po_quality_checks_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_quality_checks_status ON purchase_order_quality_checks  (status);


--
-- TOC entry 6409 (class 1259 OID 1207929)
-- Name: idx_po_shipping_agent; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_shipping_agent ON lats_purchase_order_shipping  (shipping_agent_id);


--
-- TOC entry 6410 (class 1259 OID 1207930)
-- Name: idx_po_shipping_method; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_shipping_method ON lats_purchase_order_shipping  (shipping_method_id);


--
-- TOC entry 6411 (class 1259 OID 1207931)
-- Name: idx_po_shipping_order_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_shipping_order_id ON lats_purchase_order_shipping  (purchase_order_id);


--
-- TOC entry 6412 (class 1259 OID 1207932)
-- Name: idx_po_shipping_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_shipping_status ON lats_purchase_order_shipping  (shipping_status);


--
-- TOC entry 6413 (class 1259 OID 1207933)
-- Name: idx_po_shipping_tracking; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_po_shipping_tracking ON lats_purchase_order_shipping  (tracking_number) WHERE (tracking_number IS NOT NULL);


--
-- TOC entry 6062 (class 1259 OID 1207934)
-- Name: idx_points_history_customer_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_points_history_customer_id ON customer_points_history  (customer_id);
