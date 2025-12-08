

--
-- TOC entry 6655 (class 1259 OID 1207935)
-- Name: idx_points_transactions_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_points_transactions_branch_id ON points_transactions  (branch_id);


--
-- TOC entry 6656 (class 1259 OID 1207936)
-- Name: idx_points_transactions_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_points_transactions_created ON points_transactions  (created_at DESC);


--
-- TOC entry 6657 (class 1259 OID 1207937)
-- Name: idx_points_transactions_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_points_transactions_customer ON points_transactions  (customer_id);


--
-- TOC entry 6658 (class 1259 OID 1207938)
-- Name: idx_points_transactions_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_points_transactions_type ON points_transactions  (transaction_type);


--
-- TOC entry 6331 (class 1259 OID 1207939)
-- Name: idx_pricing_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pricing_settings_user_id ON lats_pos_dynamic_pricing_settings  (user_id);


--
-- TOC entry 6666 (class 1259 OID 1207940)
-- Name: idx_product_category; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_product_category ON product_interests  (product_category);


--
-- TOC entry 6661 (class 1259 OID 1207941)
-- Name: idx_product_images_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_product_images_created_at ON product_images  (created_at);


--
-- TOC entry 6662 (class 1259 OID 1207942)
-- Name: idx_product_images_is_primary; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_product_images_is_primary ON product_images  (is_primary);


--
-- TOC entry 6663 (class 1259 OID 1207943)
-- Name: idx_product_images_product_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_product_images_product_id ON product_images  (product_id);


--
-- TOC entry 5930 (class 1259 OID 1207944)
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_products_active ON lats_products  (is_active);


--
-- TOC entry 5931 (class 1259 OID 1207945)
-- Name: idx_products_barcode; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_products_barcode ON lats_products  (barcode);


--
-- TOC entry 5932 (class 1259 OID 1207946)
-- Name: idx_products_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_products_branch ON lats_products  (branch_id);


--
-- TOC entry 5933 (class 1259 OID 1207947)
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_products_category ON lats_products  (category_id);


--
-- TOC entry 5934 (class 1259 OID 1207948)
-- Name: idx_products_category_text; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_products_category_text ON lats_products  (category);


--
-- TOC entry 5935 (class 1259 OID 1207949)
-- Name: idx_products_is_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_products_is_shared ON lats_products  (is_shared);


--
-- TOC entry 5936 (class 1259 OID 1207950)
-- Name: idx_products_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_products_shared ON lats_products  (is_shared);


--
-- TOC entry 5937 (class 1259 OID 1207951)
-- Name: idx_products_sharing_mode; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_products_sharing_mode ON lats_products  (sharing_mode);


--
-- TOC entry 5938 (class 1259 OID 1207952)
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_products_sku ON lats_products  (sku);


--
-- TOC entry 5939 (class 1259 OID 1207953)
-- Name: idx_products_visible_branches; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_products_visible_branches ON lats_products  (visible_to_branches);


--
-- TOC entry 6669 (class 1259 OID 1207954)
-- Name: idx_purchase_order_audit_order_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_purchase_order_audit_order_id ON purchase_order_audit  (purchase_order_id);


--
-- TOC entry 6670 (class 1259 OID 1207955)
-- Name: idx_purchase_order_audit_timestamp; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_purchase_order_audit_timestamp ON purchase_order_audit  ("DATETIME" DESC);


--
-- TOC entry 6679 (class 1259 OID 1207956)
-- Name: idx_purchase_order_payments_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_purchase_order_payments_branch_id ON purchase_order_payments  (branch_id);


--
-- TOC entry 5948 (class 1259 OID 1207957)
-- Name: idx_purchase_orders_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_purchase_orders_branch ON lats_purchase_orders  (branch_id);


--
-- TOC entry 6694 (class 1259 OID 1207958)
-- Name: idx_quality_check_criteria_template; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_quality_check_criteria_template ON quality_check_criteria  (template_id);


--
-- TOC entry 6703 (class 1259 OID 1207959)
-- Name: idx_quality_checks_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_quality_checks_branch ON quality_checks  (branch_id);


--
-- TOC entry 6704 (class 1259 OID 1207960)
-- Name: idx_quality_checks_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_quality_checks_shared ON quality_checks  (is_shared) WHERE (is_shared = true);


--
-- TOC entry 6707 (class 1259 OID 1207961)
-- Name: idx_rec_exp_history_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_rec_exp_history_date ON recurring_expense_history  (processed_date);


--
-- TOC entry 6708 (class 1259 OID 1207962)
-- Name: idx_rec_exp_history_recurring; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_rec_exp_history_recurring ON recurring_expense_history  (recurring_expense_id);


--
-- TOC entry 6709 (class 1259 OID 1207963)
-- Name: idx_rec_exp_history_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_rec_exp_history_status ON recurring_expense_history  (status);


--
-- TOC entry 6369 (class 1259 OID 1207964)
-- Name: idx_receipt_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_receipt_settings_user_id ON lats_pos_receipt_settings  (user_id);


--
-- TOC entry 6712 (class 1259 OID 1207965)
-- Name: idx_recurring_exp_account; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_recurring_exp_account ON recurring_expenses  (account_id);


--
-- TOC entry 6713 (class 1259 OID 1207966)
-- Name: idx_recurring_exp_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_recurring_exp_active ON recurring_expenses  (is_active);


--
-- TOC entry 6714 (class 1259 OID 1207967)
-- Name: idx_recurring_exp_auto_process; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_recurring_exp_auto_process ON recurring_expenses  (auto_process);


--
-- TOC entry 6715 (class 1259 OID 1207968)
-- Name: idx_recurring_exp_frequency; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_recurring_exp_frequency ON recurring_expenses  (frequency);


--
-- TOC entry 6716 (class 1259 OID 1207969)
-- Name: idx_recurring_exp_next_due; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_recurring_exp_next_due ON recurring_expenses  (next_due_date);


--
-- TOC entry 6717 (class 1259 OID 1207970)
-- Name: idx_recurring_expenses_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_recurring_expenses_branch ON recurring_expenses  (branch_id);


--
-- TOC entry 6718 (class 1259 OID 1207971)
-- Name: idx_recurring_expenses_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_recurring_expenses_shared ON recurring_expenses  (is_shared) WHERE (is_shared = true);


--
-- TOC entry 6721 (class 1259 OID 1207972)
-- Name: idx_reminders_assigned_to; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reminders_assigned_to ON reminders  (assigned_to);


--
-- TOC entry 6722 (class 1259 OID 1207973)
-- Name: idx_reminders_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reminders_branch_id ON reminders  (branch_id);


--
-- TOC entry 6723 (class 1259 OID 1207974)
-- Name: idx_reminders_category; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reminders_category ON reminders  (category);


--
-- TOC entry 6724 (class 1259 OID 1207975)
-- Name: idx_reminders_created_by; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reminders_created_by ON reminders  (created_by);


--
-- TOC entry 6725 (class 1259 OID 1207976)
-- Name: idx_reminders_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reminders_date ON reminders  (date);


--
-- TOC entry 6726 (class 1259 OID 1207977)
-- Name: idx_reminders_datetime; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reminders_datetime ON reminders  (date, "time");


--
-- TOC entry 6727 (class 1259 OID 1207978)
-- Name: idx_reminders_priority; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reminders_priority ON reminders  (priority);


--
-- TOC entry 6728 (class 1259 OID 1207979)
-- Name: idx_reminders_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reminders_status ON reminders  (status);


--
-- TOC entry 6731 (class 1259 OID 1207980)
-- Name: idx_repair_parts_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_repair_parts_branch_id ON repair_parts  (branch_id);


--
-- TOC entry 6734 (class 1259 OID 1207981)
-- Name: idx_report_attachments_report_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_report_attachments_report_id ON report_attachments  (report_id);


--
-- TOC entry 6737 (class 1259 OID 1207982)
-- Name: idx_reports_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reports_branch_id ON reports  (branch_id);


--
-- TOC entry 6738 (class 1259 OID 1207983)
-- Name: idx_reports_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reports_created_at ON reports  (created_at DESC);


--
-- TOC entry 6739 (class 1259 OID 1207984)
-- Name: idx_reports_created_by; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reports_created_by ON reports  (created_by);


--
-- TOC entry 6740 (class 1259 OID 1207985)
-- Name: idx_reports_customer_phone; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reports_customer_phone ON reports  (customer_phone);


--
-- TOC entry 6741 (class 1259 OID 1207986)
-- Name: idx_reports_priority; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reports_priority ON reports  (priority);


--
-- TOC entry 6742 (class 1259 OID 1207987)
-- Name: idx_reports_report_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reports_report_type ON reports  (report_type);


--
-- TOC entry 6743 (class 1259 OID 1207988)
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reports_status ON reports  (status);


--
-- TOC entry 6746 (class 1259 OID 1207989)
-- Name: idx_returns_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_returns_created_at ON returns  (created_at DESC);


--
-- TOC entry 6747 (class 1259 OID 1207990)
-- Name: idx_returns_customer_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_returns_customer_id ON returns  (customer_id);


--
-- TOC entry 6748 (class 1259 OID 1207991)
-- Name: idx_returns_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_returns_status ON returns  (status);


--
-- TOC entry 6751 (class 1259 OID 1207992)
-- Name: idx_sale_inventory_items_customer_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sale_inventory_items_customer_id ON sale_inventory_items  (customer_id);


--
-- TOC entry 6752 (class 1259 OID 1207993)
-- Name: idx_sale_inventory_items_inventory_item_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sale_inventory_items_inventory_item_id ON sale_inventory_items  (inventory_item_id);


--
-- TOC entry 6753 (class 1259 OID 1207994)
-- Name: idx_sale_inventory_items_sale_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sale_inventory_items_sale_id ON sale_inventory_items  (sale_id);


--
-- TOC entry 6424 (class 1259 OID 1207995)
-- Name: idx_sale_items_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sale_items_branch ON lats_sale_items  (branch_id);


--
-- TOC entry 6425 (class 1259 OID 1207996)
-- Name: idx_sale_items_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sale_items_product ON lats_sale_items  (product_id);


--
-- TOC entry 6426 (class 1259 OID 1207997)
-- Name: idx_sale_items_sale; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sale_items_sale ON lats_sale_items  (sale_id);


--
-- TOC entry 6434 (class 1259 OID 1207998)
-- Name: idx_sales_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_branch ON lats_sales  (branch_id);


--
-- TOC entry 6435 (class 1259 OID 1207999)
-- Name: idx_sales_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_created_at ON lats_sales  (created_at);


--
-- TOC entry 6436 (class 1259 OID 1208000)
-- Name: idx_sales_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_customer ON lats_sales  (customer_id);


--
-- TOC entry 6437 (class 1259 OID 1208001)
-- Name: idx_sales_sale_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_sale_number ON lats_sales  (sale_number);


--
-- TOC entry 6758 (class 1259 OID 1208002)
-- Name: idx_sales_stage; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_stage ON sales_pipeline  (stage);


--
-- TOC entry 6315 (class 1259 OID 1208003)
-- Name: idx_scanner_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_scanner_settings_user_id ON lats_pos_barcode_scanner_settings  (user_id);


--
-- TOC entry 6761 (class 1259 OID 1208004)
-- Name: idx_scheduled_transfer_executions_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_scheduled_transfer_executions_date ON scheduled_transfer_executions  (execution_date);


--
-- TOC entry 6762 (class 1259 OID 1208005)
-- Name: idx_scheduled_transfer_executions_schedule; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_scheduled_transfer_executions_schedule ON scheduled_transfer_executions  (scheduled_transfer_id);


--
-- TOC entry 6763 (class 1259 OID 1208006)
-- Name: idx_scheduled_transfer_executions_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_scheduled_transfer_executions_status ON scheduled_transfer_executions  (status);


--
-- TOC entry 6766 (class 1259 OID 1208007)
-- Name: idx_scheduled_transfers_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_scheduled_transfers_active ON scheduled_transfers  (is_active);


--
-- TOC entry 6767 (class 1259 OID 1208008)
-- Name: idx_scheduled_transfers_destination_account; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_scheduled_transfers_destination_account ON scheduled_transfers  (destination_account_id);


--
-- TOC entry 6768 (class 1259 OID 1208009)
-- Name: idx_scheduled_transfers_frequency; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_scheduled_transfers_frequency ON scheduled_transfers  (frequency);


--
-- TOC entry 6769 (class 1259 OID 1208010)
-- Name: idx_scheduled_transfers_next_execution; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_scheduled_transfers_next_execution ON scheduled_transfers  (next_execution_date) WHERE (is_active = true);


--
-- TOC entry 6770 (class 1259 OID 1208011)
-- Name: idx_scheduled_transfers_source_account; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_scheduled_transfers_source_account ON scheduled_transfers  (source_account_id);


--
-- TOC entry 6374 (class 1259 OID 1208012)
-- Name: idx_search_filter_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_search_filter_settings_user_id ON lats_pos_search_filter_settings  (user_id);


--
-- TOC entry 6375 (class 1259 OID 1208013)
-- Name: idx_search_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_search_settings_user_id ON lats_pos_search_filter_settings  (user_id);


--
-- TOC entry 6773 (class 1259 OID 1208014)
-- Name: idx_serial_movements_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_serial_movements_date ON serial_number_movements  (created_at);


--
-- TOC entry 6774 (class 1259 OID 1208015)
-- Name: idx_serial_movements_item; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_serial_movements_item ON serial_number_movements  (inventory_item_id);


--
-- TOC entry 6775 (class 1259 OID 1208016)
-- Name: idx_serial_movements_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_serial_movements_type ON serial_number_movements  (movement_type);


--
-- TOC entry 6778 (class 1259 OID 1208017)
-- Name: idx_settings_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_settings_key ON settings  (key);


--
-- TOC entry 6783 (class 1259 OID 1208018)
-- Name: idx_shelves_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shelves_code ON shelves  (code);


--
-- TOC entry 6784 (class 1259 OID 1208019)
-- Name: idx_shelves_room; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shelves_room ON shelves  (storage_room_id);


--
-- TOC entry 6184 (class 1259 OID 1208020)
-- Name: idx_shifts_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shifts_date ON employee_shifts  (shift_date);


--
-- TOC entry 6185 (class 1259 OID 1208021)
-- Name: idx_shifts_employee_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shifts_employee_date ON employee_shifts  (employee_id, shift_date);


--
-- TOC entry 6186 (class 1259 OID 1208022)
-- Name: idx_shifts_employee_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shifts_employee_id ON employee_shifts  (employee_id);


--
-- TOC entry 6446 (class 1259 OID 1208023)
-- Name: idx_shipping_agents_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipping_agents_active ON lats_shipping_agents  (is_active);


--
-- TOC entry 6447 (class 1259 OID 1208024)
-- Name: idx_shipping_agents_methods; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipping_agents_methods ON lats_shipping_agents  (shipping_methods);


--
-- TOC entry 6448 (class 1259 OID 1208025)
-- Name: idx_shipping_agents_preferred; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipping_agents_preferred ON lats_shipping_agents  (is_preferred) WHERE (is_preferred = true);


--
-- TOC entry 6455 (class 1259 OID 1208026)
-- Name: idx_shipping_methods_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipping_methods_active ON lats_shipping_methods  (is_active);


--
-- TOC entry 6456 (class 1259 OID 1208027)
-- Name: idx_shipping_methods_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipping_methods_code ON lats_shipping_methods  (code);


--
-- TOC entry 6442 (class 1259 OID 1208028)
-- Name: idx_shipping_purchase_order; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipping_purchase_order ON lats_shipping  (purchase_order_id);


--
-- TOC entry 6443 (class 1259 OID 1208029)
-- Name: idx_shipping_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipping_status ON lats_shipping  (status);


--
-- TOC entry 6791 (class 1259 OID 1208030)
-- Name: idx_sms_logs_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sms_logs_branch ON sms_logs  (branch_id);


--
-- TOC entry 6792 (class 1259 OID 1208031)
-- Name: idx_sms_logs_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sms_logs_created_at ON sms_logs  (created_at DESC);


--
-- TOC entry 6793 (class 1259 OID 1208032)
-- Name: idx_sms_logs_device_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sms_logs_device_id ON sms_logs  (device_id);


--
-- TOC entry 6794 (class 1259 OID 1208033)
-- Name: idx_sms_logs_phone; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sms_logs_phone ON sms_logs  (phone_number);


--
-- TOC entry 6795 (class 1259 OID 1208034)
-- Name: idx_sms_logs_recipient_phone; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sms_logs_recipient_phone ON sms_logs  (recipient_phone);


--
-- TOC entry 6796 (class 1259 OID 1208035)
-- Name: idx_sms_logs_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sms_logs_shared ON sms_logs  (is_shared) WHERE (is_shared = true);


--
-- TOC entry 6797 (class 1259 OID 1208036)
-- Name: idx_sms_logs_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sms_logs_status ON sms_logs  (status);


--
-- TOC entry 6802 (class 1259 OID 1208037)
-- Name: idx_sms_triggers_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sms_triggers_type ON sms_triggers  (trigger_type);


--
-- TOC entry 6465 (class 1259 OID 1208038)
-- Name: idx_spare_part_usage_device_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_spare_part_usage_device_id ON lats_spare_part_usage  (device_id);


--
-- TOC entry 6466 (class 1259 OID 1208039)
-- Name: idx_spare_part_usage_spare_part_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_spare_part_usage_spare_part_id ON lats_spare_part_usage  (spare_part_id);


--
-- TOC entry 6469 (class 1259 OID 1208040)
-- Name: idx_spare_part_variants_sku; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_spare_part_variants_sku ON lats_spare_part_variants  (sku) WHERE (sku IS NOT NULL);


--
-- TOC entry 6470 (class 1259 OID 1208041)
-- Name: idx_spare_part_variants_spare_part_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_spare_part_variants_spare_part_id ON lats_spare_part_variants  (spare_part_id);


--
-- TOC entry 6805 (class 1259 OID 1208042)
-- Name: idx_special_order_payments_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_special_order_payments_branch_id ON special_order_payments  (branch_id);


--
-- TOC entry 6806 (class 1259 OID 1208043)
-- Name: idx_special_order_payments_order; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_special_order_payments_order ON special_order_payments  (special_order_id);


--
-- TOC entry 6074 (class 1259 OID 1208044)
-- Name: idx_special_orders_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_special_orders_branch ON customer_special_orders  (branch_id);


--
-- TOC entry 6075 (class 1259 OID 1208045)
-- Name: idx_special_orders_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_special_orders_customer ON customer_special_orders  (customer_id);


--
-- TOC entry 6076 (class 1259 OID 1208046)
-- Name: idx_special_orders_expected_arrival; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_special_orders_expected_arrival ON customer_special_orders  (expected_arrival_date);


--
-- TOC entry 6077 (class 1259 OID 1208047)
-- Name: idx_special_orders_order_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_special_orders_order_date ON customer_special_orders  (order_date);


--
-- TOC entry 6078 (class 1259 OID 1208048)
-- Name: idx_special_orders_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_special_orders_status ON customer_special_orders  (status);


--
-- TOC entry 6481 (class 1259 OID 1208049)
-- Name: idx_stock_movements_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_stock_movements_branch ON lats_stock_movements  (branch_id);


--
-- TOC entry 6482 (class 1259 OID 1208050)
-- Name: idx_stock_movements_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_stock_movements_created_at ON lats_stock_movements  (created_at DESC);


--
-- TOC entry 6483 (class 1259 OID 1208051)
-- Name: idx_stock_movements_from_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_stock_movements_from_branch ON lats_stock_movements  (from_branch_id);


--
-- TOC entry 6484 (class 1259 OID 1208052)
-- Name: idx_stock_movements_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_stock_movements_product ON lats_stock_movements  (product_id);


--
-- TOC entry 6485 (class 1259 OID 1208053)
-- Name: idx_stock_movements_product_variant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_stock_movements_product_variant ON lats_stock_movements  (product_id, variant_id);


--
-- TOC entry 6486 (class 1259 OID 1208054)
-- Name: idx_stock_movements_to_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_stock_movements_to_branch ON lats_stock_movements  (to_branch_id);


--
-- TOC entry 6487 (class 1259 OID 1208055)
-- Name: idx_stock_movements_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_stock_movements_type ON lats_stock_movements  (movement_type);


--
-- TOC entry 6488 (class 1259 OID 1208056)
-- Name: idx_stock_movements_variant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_stock_movements_variant ON lats_stock_movements  (variant_id);


--
-- TOC entry 6809 (class 1259 OID 1208057)
-- Name: idx_storage_rooms_location; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_storage_rooms_location ON storage_rooms  (store_location_id);


--
-- TOC entry 6206 (class 1259 OID 1208058)
-- Name: idx_store_locations_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_store_locations_active ON store_locations  (is_active);


--
-- TOC entry 6207 (class 1259 OID 1208059)
-- Name: idx_store_locations_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_store_locations_code ON store_locations  (code);


--
-- TOC entry 6208 (class 1259 OID 1208060)
-- Name: idx_store_locations_is_main; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_store_locations_is_main ON store_locations  (is_main);


--
-- TOC entry 6209 (class 1259 OID 1208061)
-- Name: idx_store_locations_isolation_mode; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_store_locations_isolation_mode ON store_locations  (data_isolation_mode);


--
-- TOC entry 6210 (class 1259 OID 1208062)
-- Name: idx_store_locations_share_accounts; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_store_locations_share_accounts ON store_locations  (share_accounts);


--
-- TOC entry 6211 (class 1259 OID 1208063)
-- Name: idx_store_locations_share_inventory; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_store_locations_share_inventory ON store_locations  (share_inventory);


--
-- TOC entry 6212 (class 1259 OID 1208064)
-- Name: idx_store_locations_share_products; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_store_locations_share_products ON store_locations  (share_products);


--
-- TOC entry 6503 (class 1259 OID 1208065)
-- Name: idx_store_rooms_is_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_store_rooms_is_active ON lats_store_rooms  (is_active);


--
-- TOC entry 6519 (class 1259 OID 1208066)
-- Name: idx_store_shelves_is_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_store_shelves_is_active ON lats_store_shelves  (is_active);


--
-- TOC entry 6520 (class 1259 OID 1208067)
-- Name: idx_store_shelves_room_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_store_shelves_room_id ON lats_store_shelves  (room_id);


--
-- TOC entry 6525 (class 1259 OID 1208068)
-- Name: idx_supplier_categories_parent; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_categories_parent ON lats_supplier_categories  (parent_id) WHERE (parent_id IS NOT NULL);


--
-- TOC entry 6530 (class 1259 OID 1208069)
-- Name: idx_supplier_category_mapping_category; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_category_mapping_category ON lats_supplier_category_mapping  (category_id);


--
-- TOC entry 6531 (class 1259 OID 1208070)
-- Name: idx_supplier_category_mapping_supplier; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_category_mapping_supplier ON lats_supplier_category_mapping  (supplier_id);


--
-- TOC entry 6534 (class 1259 OID 1208071)
-- Name: idx_supplier_comms_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_comms_date ON lats_supplier_communications  (created_at DESC);


--
-- TOC entry 6535 (class 1259 OID 1208072)
-- Name: idx_supplier_comms_follow_up; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_comms_follow_up ON lats_supplier_communications  (follow_up_required, follow_up_date) WHERE (follow_up_required = true);


--
-- TOC entry 6536 (class 1259 OID 1208073)
-- Name: idx_supplier_comms_supplier_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_comms_supplier_id ON lats_supplier_communications  (supplier_id);


--
-- TOC entry 6539 (class 1259 OID 1208074)
-- Name: idx_supplier_contracts_end_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_contracts_end_date ON lats_supplier_contracts  (end_date);


--
-- TOC entry 6540 (class 1259 OID 1208075)
-- Name: idx_supplier_contracts_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_contracts_status ON lats_supplier_contracts  (status);


--
-- TOC entry 6541 (class 1259 OID 1208076)
-- Name: idx_supplier_contracts_supplier_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_contracts_supplier_id ON lats_supplier_contracts  (supplier_id);


--
-- TOC entry 6546 (class 1259 OID 1208077)
-- Name: idx_supplier_documents_expiry_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_documents_expiry_date ON lats_supplier_documents  (expiry_date) WHERE (expiry_date IS NOT NULL);


--
-- TOC entry 6547 (class 1259 OID 1208078)
-- Name: idx_supplier_documents_supplier_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_documents_supplier_id ON lats_supplier_documents  (supplier_id);


--
-- TOC entry 6548 (class 1259 OID 1208079)
-- Name: idx_supplier_documents_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_documents_type ON lats_supplier_documents  (document_type);


--
-- TOC entry 6551 (class 1259 OID 1208080)
-- Name: idx_supplier_ratings_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_ratings_date ON lats_supplier_ratings  (created_at DESC);


--
-- TOC entry 6552 (class 1259 OID 1208081)
-- Name: idx_supplier_ratings_overall; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_ratings_overall ON lats_supplier_ratings  (overall_rating);


--
-- TOC entry 6553 (class 1259 OID 1208082)
-- Name: idx_supplier_ratings_supplier_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_ratings_supplier_id ON lats_supplier_ratings  (supplier_id);


--
-- TOC entry 6556 (class 1259 OID 1208083)
-- Name: idx_supplier_tag_mapping_supplier; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_tag_mapping_supplier ON lats_supplier_tag_mapping  (supplier_id);


--
-- TOC entry 6557 (class 1259 OID 1208084)
-- Name: idx_supplier_tag_mapping_tag; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_supplier_tag_mapping_tag ON lats_supplier_tag_mapping  (tag_id);


--
-- TOC entry 5961 (class 1259 OID 1208085)
-- Name: idx_suppliers_average_rating; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_suppliers_average_rating ON lats_suppliers  (average_rating) WHERE (average_rating IS NOT NULL);


--
-- TOC entry 5962 (class 1259 OID 1208086)
-- Name: idx_suppliers_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_suppliers_branch ON lats_suppliers  (branch_id);


--
-- TOC entry 5963 (class 1259 OID 1208087)
-- Name: idx_suppliers_business_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_suppliers_business_type ON lats_suppliers  (business_type);


--
-- TOC entry 5964 (class 1259 OID 1208088)
-- Name: idx_suppliers_is_favorite; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_suppliers_is_favorite ON lats_suppliers  (is_favorite) WHERE (is_favorite = true);


--
-- TOC entry 5965 (class 1259 OID 1208089)
-- Name: idx_suppliers_is_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_suppliers_is_shared ON lats_suppliers  (is_shared) WHERE (is_shared = true);


--
-- TOC entry 5966 (class 1259 OID 1208090)
-- Name: idx_suppliers_is_trade_in_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_suppliers_is_trade_in_customer ON lats_suppliers  (is_trade_in_customer);


--
-- TOC entry 5967 (class 1259 OID 1208091)
-- Name: idx_suppliers_last_contact; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_suppliers_last_contact ON lats_suppliers  (last_contact_date) WHERE (last_contact_date IS NOT NULL);


--
-- TOC entry 5968 (class 1259 OID 1208092)
-- Name: idx_suppliers_next_follow_up; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_suppliers_next_follow_up ON lats_suppliers  (next_follow_up_date) WHERE (next_follow_up_date IS NOT NULL);


--
-- TOC entry 5969 (class 1259 OID 1208093)
-- Name: idx_suppliers_priority_level; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_suppliers_priority_level ON lats_suppliers  (priority_level);


--
-- TOC entry 5970 (class 1259 OID 1208094)
-- Name: idx_suppliers_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_suppliers_shared ON lats_suppliers  (is_shared);


--
-- TOC entry 6564 (class 1259 OID 1208095)
-- Name: idx_trade_in_contracts_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_contracts_customer ON lats_trade_in_contracts  (customer_id);


--
-- TOC entry 6565 (class 1259 OID 1208096)
-- Name: idx_trade_in_contracts_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_contracts_status ON lats_trade_in_contracts  (status);


--
-- TOC entry 6566 (class 1259 OID 1208097)
-- Name: idx_trade_in_contracts_transaction; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_contracts_transaction ON lats_trade_in_contracts  (transaction_id);


--
-- TOC entry 6571 (class 1259 OID 1208098)
-- Name: idx_trade_in_damage_spare_part; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_damage_spare_part ON lats_trade_in_damage_assessments  (spare_part_id);


--
-- TOC entry 6572 (class 1259 OID 1208099)
-- Name: idx_trade_in_damage_transaction; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_damage_transaction ON lats_trade_in_damage_assessments  (transaction_id);


--
-- TOC entry 6575 (class 1259 OID 1208100)
-- Name: idx_trade_in_prices_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_prices_active ON lats_trade_in_prices  (is_active);


--
-- TOC entry 6576 (class 1259 OID 1208101)
-- Name: idx_trade_in_prices_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_prices_branch ON lats_trade_in_prices  (branch_id);


--
-- TOC entry 6577 (class 1259 OID 1208102)
-- Name: idx_trade_in_prices_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_prices_product ON lats_trade_in_prices  (product_id);


--
-- TOC entry 6578 (class 1259 OID 1208103)
-- Name: idx_trade_in_prices_variant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_prices_variant ON lats_trade_in_prices  (variant_id);


--
-- TOC entry 6585 (class 1259 OID 1208104)
-- Name: idx_trade_in_transactions_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_transactions_branch ON lats_trade_in_transactions  (branch_id);


--
-- TOC entry 6586 (class 1259 OID 1208105)
-- Name: idx_trade_in_transactions_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_transactions_created_at ON lats_trade_in_transactions  (created_at DESC);


--
-- TOC entry 6587 (class 1259 OID 1208106)
-- Name: idx_trade_in_transactions_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_transactions_customer ON lats_trade_in_transactions  (customer_id);


--
-- TOC entry 6588 (class 1259 OID 1208107)
-- Name: idx_trade_in_transactions_imei; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_transactions_imei ON lats_trade_in_transactions  (device_imei);


--
-- TOC entry 6589 (class 1259 OID 1208108)
-- Name: idx_trade_in_transactions_new_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_transactions_new_product ON lats_trade_in_transactions  (new_product_id);


--
-- TOC entry 6590 (class 1259 OID 1208109)
-- Name: idx_trade_in_transactions_sale; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_transactions_sale ON lats_trade_in_transactions  (sale_id);


--
-- TOC entry 6591 (class 1259 OID 1208110)
-- Name: idx_trade_in_transactions_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trade_in_transactions_status ON lats_trade_in_transactions  (status);


--
-- TOC entry 6094 (class 1259 OID 1208111)
-- Name: idx_unique_customer_phone_name; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_unique_customer_phone_name ON lats_customers  (phone, name) WHERE ((phone IS NOT NULL) AND (name IS NOT NULL));


--
-- TOC entry 5885 (class 1259 OID 1208112)
-- Name: idx_unique_imei; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_unique_imei ON lats_product_variants  (((variant_attributes ->> 'imei'::text))) WHERE (((variant_type)::text = 'imei_child'::text) AND ((variant_attributes ->> 'imei'::text) IS NOT NULL) AND ((variant_attributes ->> 'imei'::text) <> ''::text) AND (((variant_attributes ->> 'imei_status'::text) IS NULL) OR ((variant_attributes ->> 'imei_status'::text) <> 'duplicate'::text)));


--
-- TOC entry 6820 (class 1259 OID 1208113)
-- Name: idx_user_branch_assignments_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_branch_assignments_branch ON user_branch_assignments  (branch_id);


--
-- TOC entry 6821 (class 1259 OID 1208114)
-- Name: idx_user_branch_assignments_primary; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_branch_assignments_primary ON user_branch_assignments  (is_primary);


--
-- TOC entry 6822 (class 1259 OID 1208115)
-- Name: idx_user_branch_assignments_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_branch_assignments_user ON user_branch_assignments  (user_id);


--
-- TOC entry 6827 (class 1259 OID 1208116)
-- Name: idx_user_daily_goals_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_daily_goals_active ON user_daily_goals  (user_id, date, is_active) WHERE (is_active = true);


--
-- TOC entry 6383 (class 1259 OID 1208117)
-- Name: idx_user_permissions_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_permissions_settings_user_id ON lats_pos_user_permissions_settings  (user_id);


--
-- TOC entry 6832 (class 1259 OID 1208118)
-- Name: idx_user_settings_updated_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_settings_updated_at ON user_settings  (updated_at);


--
-- TOC entry 6833 (class 1259 OID 1208119)
-- Name: idx_user_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_settings_user_id ON user_settings  (user_id);


--
-- TOC entry 6838 (class 1259 OID 1208120)
-- Name: idx_users_branch_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_branch_id ON users  (branch_id);


--
-- TOC entry 6839 (class 1259 OID 1208121)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_email ON users  (email);


--
-- TOC entry 6840 (class 1259 OID 1208122)
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_is_active ON users  (is_active);


--
-- TOC entry 6841 (class 1259 OID 1208123)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_role ON users  (role);


--
-- TOC entry 6842 (class 1259 OID 1208124)
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_username ON users  (username);


--
-- TOC entry 6392 (class 1259 OID 1208125)
-- Name: idx_validation_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_validation_product ON lats_product_validation  (product_id);


--
-- TOC entry 6393 (class 1259 OID 1208126)
-- Name: idx_validation_shipping; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_validation_shipping ON lats_product_validation  (shipping_id);


--
-- TOC entry 6394 (class 1259 OID 1208127)
-- Name: idx_validation_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_validation_status ON lats_product_validation  (is_validated);


--
-- TOC entry 5886 (class 1259 OID 1208128)
-- Name: idx_variant_attributes_imei; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variant_attributes_imei ON lats_product_variants  (variant_attributes);


--
-- TOC entry 5887 (class 1259 OID 1208129)
-- Name: idx_variant_imei; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variant_imei ON lats_product_variants  (((variant_attributes ->> 'imei'::text))) WHERE ((variant_type)::text = 'imei_child'::text);


--
-- TOC entry 5888 (class 1259 OID 1208130)
-- Name: idx_variant_is_parent; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variant_is_parent ON lats_product_variants  (is_parent) WHERE (is_parent = true);


--
-- TOC entry 5889 (class 1259 OID 1208131)
-- Name: idx_variant_parent_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variant_parent_id ON lats_product_variants  (parent_variant_id) WHERE (parent_variant_id IS NOT NULL);


--
-- TOC entry 5890 (class 1259 OID 1208132)
-- Name: idx_variant_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variant_type ON lats_product_variants  (variant_type);


--
-- TOC entry 5891 (class 1259 OID 1208133)
-- Name: idx_variants_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variants_active ON lats_product_variants  (is_active);


--
-- TOC entry 5892 (class 1259 OID 1208134)
-- Name: idx_variants_branch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variants_branch ON lats_product_variants  (branch_id);


--
-- TOC entry 5893 (class 1259 OID 1208135)
-- Name: idx_variants_imei_attributes; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variants_imei_attributes ON lats_product_variants  (variant_attributes) WHERE ((variant_type)::text = ANY (ARRAY[('imei'::character varying)::text, ('imei_child'::character varying)::text]));


--
-- TOC entry 5894 (class 1259 OID 1208136)
-- Name: idx_variants_is_shared; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variants_is_shared ON lats_product_variants  (is_shared);


--
-- TOC entry 5895 (class 1259 OID 1208137)
-- Name: idx_variants_parent_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variants_parent_id ON lats_product_variants  (parent_variant_id) WHERE (parent_variant_id IS NOT NULL);


--
-- TOC entry 5896 (class 1259 OID 1208138)
-- Name: idx_variants_parent_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variants_parent_type ON lats_product_variants  (parent_variant_id, variant_type) WHERE ((variant_type)::text = 'imei'::text);


--
-- TOC entry 5897 (class 1259 OID 1208139)
-- Name: idx_variants_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variants_product ON lats_product_variants  (product_id);


--
-- TOC entry 5898 (class 1259 OID 1208140)
-- Name: idx_variants_product_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variants_product_id ON lats_product_variants  (product_id);


--
-- TOC entry 5899 (class 1259 OID 1208141)
-- Name: idx_variants_sharing_mode; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variants_sharing_mode ON lats_product_variants  (sharing_mode);


--
-- TOC entry 5900 (class 1259 OID 1208142)
-- Name: idx_variants_sku; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variants_sku ON lats_product_variants  (sku);


--
-- TOC entry 5901 (class 1259 OID 1208143)
-- Name: idx_variants_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variants_type ON lats_product_variants  (variant_type);


--
-- TOC entry 5902 (class 1259 OID 1208144)
-- Name: idx_variants_visible_branches; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_variants_visible_branches ON lats_product_variants  (visible_to_branches);


--
-- TOC entry 6847 (class 1259 OID 1208145)
-- Name: idx_webhook_endpoints_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints  (is_active);


--
-- TOC entry 6848 (class 1259 OID 1208146)
-- Name: idx_webhook_endpoints_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_webhook_endpoints_user ON webhook_endpoints  (user_id);


--
-- TOC entry 6851 (class 1259 OID 1208147)
-- Name: idx_webhook_logs_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_webhook_logs_created ON webhook_logs  (created_at);


--
-- TOC entry 6852 (class 1259 OID 1208148)
-- Name: idx_webhook_logs_webhook; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_webhook_logs_webhook ON webhook_logs  (webhook_id);


--
-- TOC entry 6855 (class 1259 OID 1208149)
-- Name: idx_whatsapp_instances_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_whatsapp_instances_user_id ON whatsapp_instances_comprehensive  (user_id);


--
-- TOC entry 6620 (class 1259 OID 1208150)
-- Name: owner_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX owner_idx ON notes  (owner_id);


--
-- TOC entry 5907 (class 1259 OID 1208151)
-- Name: uniq_imei_index; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX uniq_imei_index ON lats_product_variants  (((variant_attributes ->> 'imei'::text))) WHERE ((variant_attributes ->> 'imei'::text) IS NOT NULL);


--
-- TOC entry 7128 (class 2620 OID 1208152)
-- Name: attendance_records calculate_hours_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7217 (class 2620 OID 1208153)
-- Name: leave_requests calculate_leave_days_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7166 (class 2620 OID 1208154)
-- Name: customers customers_delete_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7167 (class 2620 OID 1208155)
-- Name: customers customers_insert_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7168 (class 2620 OID 1208156)
-- Name: customers customers_update_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7130 (class 2620 OID 1208157)
-- Name: lats_product_variants ensure_imei_has_parent; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7221 (class 2620 OID 1208158)
-- Name: product_images ensure_single_primary_image_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7177 (class 2620 OID 1208159)
-- Name: expenses handle_expense_transaction_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7186 (class 2620 OID 1208160)
-- Name: inventory_items inventory_items_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7193 (class 2620 OID 1208161)
-- Name: lats_inventory_items inventory_items_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7195 (class 2620 OID 1208162)
-- Name: lats_purchase_order_payments po_payments_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7131 (class 2620 OID 1208163)
-- Name: lats_product_variants sync_product_stock_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7236 (class 2620 OID 1208164)
-- Name: users sync_users_to_auth_users_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7132 (class 2620 OID 1208165)
-- Name: lats_product_variants sync_variant_prices_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7223 (class 2620 OID 1208166)
-- Name: purchase_order_payments track_po_payment_expense_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7160 (class 2620 OID 1208167)
-- Name: branch_transfers trg_update_branch_transfer_timestamp; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7133 (class 2620 OID 1208168)
-- Name: lats_product_variants trg_update_parent_quantity; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7134 (class 2620 OID 1208169)
-- Name: lats_product_variants trg_validate_and_set_imei_status; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7135 (class 2620 OID 1208170)
-- Name: lats_product_variants trg_validate_new_imei; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7187 (class 2620 OID 1208171)
-- Name: inventory_items trigger_auto_convert_inventory_on_update; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7188 (class 2620 OID 1208172)
-- Name: inventory_items trigger_auto_convert_inventory_to_imei_child; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7172 (class 2620 OID 1208173)
-- Name: lats_purchase_order_items trigger_auto_convert_po_currency; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 8034 (class 0 OID 0)
-- Dependencies: 7172
-- Name: TRIGGER trigger_auto_convert_po_currency ON lats_purchase_order_items; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7151 (class 2620 OID 1208174)
-- Name: lats_products trigger_auto_create_default_variant; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7136 (class 2620 OID 1208175)
-- Name: lats_product_variants trigger_auto_reorder; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7179 (class 2620 OID 1208176)
-- Name: store_locations trigger_auto_sync_sharing; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7170 (class 2620 OID 1208177)
-- Name: daily_sales_closures trigger_close_session_on_day_close; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7226 (class 2620 OID 1208178)
-- Name: reminders trigger_create_recurring_reminder; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7181 (class 2620 OID 1208179)
-- Name: finance_expenses trigger_expense_delete; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7182 (class 2620 OID 1208180)
-- Name: finance_expenses trigger_expense_update; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7137 (class 2620 OID 1208181)
-- Name: lats_product_variants trigger_inherit_parent_prices; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7219 (class 2620 OID 1208182)
-- Name: notifications trigger_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7196 (class 2620 OID 1208183)
-- Name: lats_purchase_order_shipping trigger_po_shipping_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7227 (class 2620 OID 1208184)
-- Name: reminders trigger_reminders_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7138 (class 2620 OID 1208185)
-- Name: lats_product_variants trigger_set_imei_status; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7192 (class 2620 OID 1208186)
-- Name: lats_categories trigger_set_is_shared_categories; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7162 (class 2620 OID 1208187)
-- Name: customer_messages trigger_set_is_shared_customer_messages; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7163 (class 2620 OID 1208188)
-- Name: customer_payments trigger_set_is_shared_customer_payments; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7174 (class 2620 OID 1208189)
-- Name: employees trigger_set_is_shared_employees; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7183 (class 2620 OID 1208190)
-- Name: finance_transfers trigger_set_is_shared_finance_transfers; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7184 (class 2620 OID 1208191)
-- Name: gift_cards trigger_set_is_shared_gift_cards; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7220 (class 2620 OID 1208192)
-- Name: payment_transactions trigger_set_is_shared_payment_transactions; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7152 (class 2620 OID 1208193)
-- Name: lats_products trigger_set_is_shared_products; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7224 (class 2620 OID 1208194)
-- Name: quality_checks trigger_set_is_shared_quality_checks; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7225 (class 2620 OID 1208195)
-- Name: recurring_expenses trigger_set_is_shared_recurring_expenses; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7233 (class 2620 OID 1208196)
-- Name: sms_logs trigger_set_is_shared_sms_logs; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7158 (class 2620 OID 1208197)
-- Name: lats_suppliers trigger_set_is_shared_suppliers; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7139 (class 2620 OID 1208198)
-- Name: lats_product_variants trigger_set_is_shared_variants; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7153 (class 2620 OID 1208199)
-- Name: lats_products trigger_set_product_branch; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7212 (class 2620 OID 1208200)
-- Name: lats_trade_in_contracts trigger_set_trade_in_contract_number; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7215 (class 2620 OID 1208201)
-- Name: lats_trade_in_transactions trigger_set_trade_in_transaction_number; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7200 (class 2620 OID 1208202)
-- Name: lats_shipping_agents trigger_shipping_agents_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7202 (class 2620 OID 1208203)
-- Name: lats_shipping_methods trigger_shipping_methods_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7203 (class 2620 OID 1208204)
-- Name: lats_shipping_settings trigger_shipping_settings_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7164 (class 2620 OID 1208205)
-- Name: customer_payments trigger_sync_customer_payment; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7178 (class 2620 OID 1208206)
-- Name: finance_accounts trigger_sync_finance_account_columns; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7189 (class 2620 OID 1208207)
-- Name: inventory_items trigger_sync_imei_serial_number; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7140 (class 2620 OID 1208208)
-- Name: lats_product_variants trigger_sync_parent_quantity_on_imei_change; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7154 (class 2620 OID 1208209)
-- Name: lats_products trigger_sync_product_category; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7141 (class 2620 OID 1208210)
-- Name: lats_product_variants trigger_sync_product_stock_on_variant_delete; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7142 (class 2620 OID 1208211)
-- Name: lats_product_variants trigger_sync_product_stock_on_variant_insert; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7143 (class 2620 OID 1208212)
-- Name: lats_product_variants trigger_sync_product_stock_on_variant_update; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7197 (class 2620 OID 1208213)
-- Name: lats_sales trigger_sync_sale_payment; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 8035 (class 0 OID 0)
-- Dependencies: 7197
-- Name: TRIGGER trigger_sync_sale_payment ON lats_sales; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7144 (class 2620 OID 1208214)
-- Name: lats_product_variants trigger_sync_variant_imei_serial_number; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7190 (class 2620 OID 1208215)
-- Name: inventory_items trigger_sync_variant_quantity_delete; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 8036 (class 0 OID 0)
-- Dependencies: 7190
-- Name: TRIGGER trigger_sync_variant_quantity_delete ON inventory_items; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7191 (class 2620 OID 1208216)
-- Name: inventory_items trigger_sync_variant_quantity_insert_update; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 8037 (class 0 OID 0)
-- Dependencies: 7191
-- Name: TRIGGER trigger_sync_variant_quantity_insert_update ON inventory_items; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7145 (class 2620 OID 1208217)
-- Name: lats_product_variants trigger_track_variant_source; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7126 (class 2620 OID 1208218)
-- Name: account_transactions trigger_update_account_balance_secure; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7127 (class 2620 OID 1208219)
-- Name: api_keys trigger_update_api_keys; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7161 (class 2620 OID 1208220)
-- Name: customer_installment_plan_payments trigger_update_customer_installment_plan_balance; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7165 (class 2620 OID 1208221)
-- Name: customer_preferences trigger_update_customer_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7169 (class 2620 OID 1208222)
-- Name: daily_reports trigger_update_daily_reports_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7173 (class 2620 OID 1208223)
-- Name: document_templates trigger_update_document_templates; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7185 (class 2620 OID 1208224)
-- Name: installment_payments trigger_update_installment_plan_balance; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7205 (class 2620 OID 1208225)
-- Name: lats_supplier_communications trigger_update_last_contact; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7159 (class 2620 OID 1208226)
-- Name: lats_suppliers trigger_update_lats_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7155 (class 2620 OID 1208227)
-- Name: lats_purchase_orders trigger_update_on_time_delivery; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7146 (class 2620 OID 1208229)
-- Name: lats_product_variants trigger_update_parent_stock; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7147 (class 2620 OID 1208230)
-- Name: lats_product_variants trigger_update_product_totals; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7206 (class 2620 OID 1208231)
-- Name: lats_supplier_communications trigger_update_response_time; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7229 (class 2620 OID 1208232)
-- Name: returns trigger_update_returns_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7230 (class 2620 OID 1208233)
-- Name: scheduled_transfers trigger_update_scheduled_transfers_timestamp; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7231 (class 2620 OID 1208234)
-- Name: settings trigger_update_settings; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7234 (class 2620 OID 1208235)
-- Name: special_order_payments trigger_update_special_order_balance; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7204 (class 2620 OID 1208236)
-- Name: lats_stock_movements trigger_update_stock_on_movement; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 8038 (class 0 OID 0)
-- Dependencies: 7204
-- Name: TRIGGER trigger_update_stock_on_movement ON lats_stock_movements; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7180 (class 2620 OID 1208237)
-- Name: store_locations trigger_update_store_locations; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7156 (class 2620 OID 1208238)
-- Name: lats_purchase_orders trigger_update_supplier_order_value; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7210 (class 2620 OID 1208239)
-- Name: lats_supplier_ratings trigger_update_supplier_rating; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7157 (class 2620 OID 1208240)
-- Name: lats_purchase_orders trigger_update_supplier_total_orders; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7213 (class 2620 OID 1208241)
-- Name: lats_trade_in_contracts trigger_update_trade_in_contracts_timestamp; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7214 (class 2620 OID 1208242)
-- Name: lats_trade_in_prices trigger_update_trade_in_prices_timestamp; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7216 (class 2620 OID 1208243)
-- Name: lats_trade_in_transactions trigger_update_trade_in_transactions_timestamp; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7237 (class 2620 OID 1208244)
-- Name: webhook_endpoints trigger_update_webhook_endpoints; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7235 (class 2620 OID 1208245)
-- Name: user_settings trigger_user_settings_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7148 (class 2620 OID 1208246)
-- Name: lats_product_variants trigger_validate_variant_prices; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 8039 (class 0 OID 0)
-- Dependencies: 7148
-- Name: TRIGGER trigger_validate_variant_prices ON lats_product_variants; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7129 (class 2620 OID 1208247)
-- Name: attendance_records update_attendance_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7171 (class 2620 OID 1208248)
-- Name: daily_sales_closures update_daily_sales_closures_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7175 (class 2620 OID 1208249)
-- Name: employees update_employees_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7194 (class 2620 OID 1208250)
-- Name: lats_product_validation update_lats_product_validation_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7201 (class 2620 OID 1208251)
-- Name: lats_shipping_cargo_items update_lats_shipping_cargo_items_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7199 (class 2620 OID 1208252)
-- Name: lats_shipping update_lats_shipping_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7218 (class 2620 OID 1208253)
-- Name: leave_requests update_leave_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7222 (class 2620 OID 1208254)
-- Name: product_images update_product_images_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7228 (class 2620 OID 1208255)
-- Name: reports update_reports_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7232 (class 2620 OID 1208256)
-- Name: shift_templates update_shift_templates_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7176 (class 2620 OID 1208257)
-- Name: employee_shifts update_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7207 (class 2620 OID 1208258)
-- Name: lats_supplier_communications update_supplier_communications_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7208 (class 2620 OID 1208259)
-- Name: lats_supplier_contracts update_supplier_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7209 (class 2620 OID 1208260)
-- Name: lats_supplier_documents update_supplier_documents_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7211 (class 2620 OID 1208261)
-- Name: lats_supplier_ratings update_supplier_ratings_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7149 (class 2620 OID 1208262)
-- Name: lats_product_variants update_variant_count_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7198 (class 2620 OID 1208263)
-- Name: lats_sales validate_sale_amount_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7150 (class 2620 OID 1208264)
-- Name: lats_product_variants validate_variant_price_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 6866 (class 2606 OID 1208265)
-- Name: account_transactions account_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE account_transactions
    ADD CONSTRAINT account_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance_accounts(id) ON DELETE CASCADE;


--
-- TOC entry 6867 (class 2606 OID 1208270)
-- Name: account_transactions account_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE account_transactions
    ADD CONSTRAINT account_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 6868 (class 2606 OID 1208275)
-- Name: api_request_logs api_request_logs_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE api_request_logs
    ADD CONSTRAINT api_request_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE;


--
-- TOC entry 6869 (class 2606 OID 1208280)
-- Name: appointments appointments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE appointments
    ADD CONSTRAINT appointments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 6870 (class 2606 OID 1208285)
-- Name: appointments appointments_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE appointments
    ADD CONSTRAINT appointments_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id);


--
-- TOC entry 6871 (class 2606 OID 1208290)
-- Name: attendance_records attendance_records_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 6872 (class 2606 OID 1208295)
-- Name: attendance_records attendance_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;


--
-- TOC entry 6873 (class 2606 OID 1208300)
-- Name: auth_users auth_users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE auth_users
    ADD CONSTRAINT auth_users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 6874 (class 2606 OID 1208305)
-- Name: auto_reorder_log auto_reorder_log_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE auto_reorder_log
    ADD CONSTRAINT auto_reorder_log_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id);


--
-- TOC entry 6875 (class 2606 OID 1208310)
-- Name: auto_reorder_log auto_reorder_log_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE auto_reorder_log
    ADD CONSTRAINT auto_reorder_log_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id);


--
-- TOC entry 6876 (class 2606 OID 1208315)
-- Name: auto_reorder_log auto_reorder_log_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE auto_reorder_log
    ADD CONSTRAINT auto_reorder_log_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id);


--
-- TOC entry 6890 (class 2606 OID 1208320)
-- Name: branch_activity_log branch_activity_log_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE branch_activity_log
    ADD CONSTRAINT branch_activity_log_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE CASCADE;


--
-- TOC entry 6891 (class 2606 OID 1208325)
-- Name: branch_transfers branch_transfers_entity_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE branch_transfers
    ADD CONSTRAINT branch_transfers_entity_fkey FOREIGN KEY (entity_id) REFERENCES lats_product_variants(id);


--
-- TOC entry 6892 (class 2606 OID 1208330)
-- Name: branch_transfers branch_transfers_from_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE branch_transfers
    ADD CONSTRAINT branch_transfers_from_branch_fkey FOREIGN KEY (from_branch_id) REFERENCES store_locations(id);


--
-- TOC entry 6893 (class 2606 OID 1208335)
-- Name: branch_transfers branch_transfers_from_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE branch_transfers
    ADD CONSTRAINT branch_transfers_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES store_locations(id) ON DELETE CASCADE;


--
-- TOC entry 6894 (class 2606 OID 1208340)
-- Name: branch_transfers branch_transfers_to_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE branch_transfers
    ADD CONSTRAINT branch_transfers_to_branch_fkey FOREIGN KEY (to_branch_id) REFERENCES store_locations(id);


--
-- TOC entry 6895 (class 2606 OID 1208345)
-- Name: branch_transfers branch_transfers_to_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE branch_transfers
    ADD CONSTRAINT branch_transfers_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES store_locations(id) ON DELETE CASCADE;


--
-- TOC entry 6896 (class 2606 OID 1208350)
-- Name: buyer_details buyer_details_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE buyer_details
    ADD CONSTRAINT buyer_details_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES whatsapp_customers(customer_id);


--
-- TOC entry 6897 (class 2606 OID 1208355)
-- Name: categories categories_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE categories
    ADD CONSTRAINT categories_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 6898 (class 2606 OID 1208360)
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categories(id);


--
-- TOC entry 6899 (class 2606 OID 1208365)
-- Name: communication_log communication_log_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE communication_log
    ADD CONSTRAINT communication_log_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES whatsapp_customers(customer_id);


--
-- TOC entry 6901 (class 2606 OID 1208370)
-- Name: customer_installment_plan_payments customer_installment_plan_payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_installment_plan_payments
    ADD CONSTRAINT customer_installment_plan_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance_accounts(id);


--
-- TOC entry 6902 (class 2606 OID 1208375)
-- Name: customer_installment_plan_payments customer_installment_plan_payments_installment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_installment_plan_payments
    ADD CONSTRAINT customer_installment_plan_payments_installment_plan_id_fkey FOREIGN KEY (installment_plan_id) REFERENCES customer_installment_plans(id) ON DELETE CASCADE;


--
-- TOC entry 6903 (class 2606 OID 1208380)
-- Name: customer_installment_plans customer_installment_plans_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_installment_plans
    ADD CONSTRAINT customer_installment_plans_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 6904 (class 2606 OID 1208385)
-- Name: customer_installment_plans customer_installment_plans_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_installment_plans
    ADD CONSTRAINT customer_installment_plans_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES lats_sales(id) ON DELETE SET NULL;


--
-- TOC entry 6905 (class 2606 OID 1208390)
-- Name: customer_messages customer_messages_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_messages
    ADD CONSTRAINT customer_messages_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;


--
-- TOC entry 6906 (class 2606 OID 1208395)
-- Name: customer_messages customer_messages_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_messages
    ADD CONSTRAINT customer_messages_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 6907 (class 2606 OID 1208400)
-- Name: customer_messages customer_messages_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_messages
    ADD CONSTRAINT customer_messages_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL;


--
-- TOC entry 6908 (class 2606 OID 1208405)
-- Name: customer_messages customer_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_messages
    ADD CONSTRAINT customer_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 6909 (class 2606 OID 1208410)
-- Name: customer_payments customer_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_payments
    ADD CONSTRAINT customer_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 6910 (class 2606 OID 1208415)
-- Name: customer_payments customer_payments_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_payments
    ADD CONSTRAINT customer_payments_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id);


--
-- TOC entry 6911 (class 2606 OID 1208420)
-- Name: customer_payments customer_payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_payments
    ADD CONSTRAINT customer_payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES lats_sales(id);


--
-- TOC entry 6912 (class 2606 OID 1208425)
-- Name: customer_special_orders customer_special_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_special_orders
    ADD CONSTRAINT customer_special_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 6918 (class 2606 OID 1208430)
-- Name: daily_reports daily_reports_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE daily_reports
    ADD CONSTRAINT daily_reports_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 6919 (class 2606 OID 1208435)
-- Name: daily_reports daily_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE daily_reports
    ADD CONSTRAINT daily_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES employees(id);


--
-- TOC entry 6920 (class 2606 OID 1208440)
-- Name: daily_sales_closures daily_sales_closures_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE daily_sales_closures
    ADD CONSTRAINT daily_sales_closures_session_id_fkey FOREIGN KEY (session_id) REFERENCES daily_opening_sessions(id);


--
-- TOC entry 6924 (class 2606 OID 1208445)
-- Name: device_attachments device_attachments_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE device_attachments
    ADD CONSTRAINT device_attachments_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;


--
-- TOC entry 6925 (class 2606 OID 1208450)
-- Name: device_checklists device_checklists_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE device_checklists
    ADD CONSTRAINT device_checklists_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;


--
-- TOC entry 6926 (class 2606 OID 1208455)
-- Name: device_ratings device_ratings_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE device_ratings
    ADD CONSTRAINT device_ratings_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;


--
-- TOC entry 6927 (class 2606 OID 1208460)
-- Name: device_remarks device_remarks_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE device_remarks
    ADD CONSTRAINT device_remarks_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;


--
-- TOC entry 6928 (class 2606 OID 1208465)
-- Name: device_transitions device_transitions_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE device_transitions
    ADD CONSTRAINT device_transitions_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;


--
-- TOC entry 6929 (class 2606 OID 1208470)
-- Name: devices devices_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE devices
    ADD CONSTRAINT devices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 6930 (class 2606 OID 1208475)
-- Name: diagnostic_checklist_results diagnostic_checklist_results_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_checklist_results
    ADD CONSTRAINT diagnostic_checklist_results_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;


--
-- TOC entry 6931 (class 2606 OID 1208480)
-- Name: diagnostic_checklist_results diagnostic_checklist_results_problem_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_checklist_results
    ADD CONSTRAINT diagnostic_checklist_results_problem_template_id_fkey FOREIGN KEY (problem_template_id) REFERENCES diagnostic_problem_templates(id);


--
-- TOC entry 6932 (class 2606 OID 1208485)
-- Name: diagnostic_checks diagnostic_checks_diagnostic_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_checks
    ADD CONSTRAINT diagnostic_checks_diagnostic_device_id_fkey FOREIGN KEY (diagnostic_device_id) REFERENCES devices(id) ON DELETE CASCADE;


--
-- TOC entry 6933 (class 2606 OID 1208490)
-- Name: diagnostic_checks diagnostic_checks_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_checks
    ADD CONSTRAINT diagnostic_checks_request_id_fkey FOREIGN KEY (request_id) REFERENCES diagnostic_requests(id) ON DELETE CASCADE;


--
-- TOC entry 6934 (class 2606 OID 1208495)
-- Name: diagnostic_devices diagnostic_devices_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_devices
    ADD CONSTRAINT diagnostic_devices_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;


--
-- TOC entry 6935 (class 2606 OID 1208500)
-- Name: diagnostic_requests diagnostic_requests_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_requests
    ADD CONSTRAINT diagnostic_requests_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;


--
-- TOC entry 6936 (class 2606 OID 1208505)
-- Name: diagnostic_requests diagnostic_requests_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE diagnostic_requests
    ADD CONSTRAINT diagnostic_requests_template_id_fkey FOREIGN KEY (template_id) REFERENCES diagnostic_templates(id);


--
-- TOC entry 6939 (class 2606 OID 1208510)
-- Name: employee_shifts employee_shifts_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE employee_shifts
    ADD CONSTRAINT employee_shifts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;


--
-- TOC entry 6940 (class 2606 OID 1208515)
-- Name: employee_shifts employee_shifts_shift_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE employee_shifts
    ADD CONSTRAINT employee_shifts_shift_template_id_fkey FOREIGN KEY (shift_template_id) REFERENCES shift_templates(id) ON DELETE SET NULL;


--
-- TOC entry 6937 (class 2606 OID 1208520)
-- Name: employees employees_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE employees
    ADD CONSTRAINT employees_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 6941 (class 2606 OID 1208525)
-- Name: expenses expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE expenses
    ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 6942 (class 2606 OID 1208530)
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth_users(id) ON DELETE SET NULL;


--
-- TOC entry 6943 (class 2606 OID 1208535)
-- Name: expenses expenses_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE expenses
    ADD CONSTRAINT expenses_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE SET NULL;


--
-- TOC entry 6944 (class 2606 OID 1208540)
-- Name: expenses expenses_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE expenses
    ADD CONSTRAINT expenses_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE SET NULL;


--
-- TOC entry 6945 (class 2606 OID 1208545)
-- Name: finance_accounts finance_accounts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE finance_accounts
    ADD CONSTRAINT finance_accounts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 6946 (class 2606 OID 1208550)
-- Name: finance_expenses finance_expenses_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE finance_expenses
    ADD CONSTRAINT finance_expenses_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance_accounts(id);


--
-- TOC entry 6947 (class 2606 OID 1208555)
-- Name: finance_expenses finance_expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE finance_expenses
    ADD CONSTRAINT finance_expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 6948 (class 2606 OID 1208560)
-- Name: finance_expenses finance_expenses_expense_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE finance_expenses
    ADD CONSTRAINT finance_expenses_expense_category_id_fkey FOREIGN KEY (expense_category_id) REFERENCES finance_expense_categories(id);


--
-- TOC entry 6949 (class 2606 OID 1208565)
-- Name: finance_transfers finance_transfers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE finance_transfers
    ADD CONSTRAINT finance_transfers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 6950 (class 2606 OID 1208570)
-- Name: finance_transfers finance_transfers_from_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE finance_transfers
    ADD CONSTRAINT finance_transfers_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES finance_accounts(id);


--
-- TOC entry 6951 (class 2606 OID 1208575)
-- Name: finance_transfers finance_transfers_to_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE finance_transfers
    ADD CONSTRAINT finance_transfers_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES finance_accounts(id);


--
-- TOC entry 6900 (class 2606 OID 1208580)
-- Name: customer_checkins fk_customer_checkins_staff_id; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE customer_checkins
    ADD CONSTRAINT fk_customer_checkins_staff_id FOREIGN KEY (staff_id) REFERENCES users(id);


--
-- TOC entry 6938 (class 2606 OID 1208585)
-- Name: employees fk_employees_manager; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE employees
    ADD CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;


--
-- TOC entry 6971 (class 2606 OID 1208590)
-- Name: lats_inventory_items fk_lats_inventory_items_storage_room; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_inventory_items
    ADD CONSTRAINT fk_lats_inventory_items_storage_room FOREIGN KEY (storage_room_id) REFERENCES lats_store_rooms(id) ON DELETE SET NULL;


--
-- TOC entry 6886 (class 2606 OID 1208595)
-- Name: lats_purchase_orders fk_purchase_orders_supplier; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_orders
    ADD CONSTRAINT fk_purchase_orders_supplier FOREIGN KEY (supplier_id) REFERENCES lats_suppliers(id) ON DELETE RESTRICT;


--
-- TOC entry 7101 (class 2606 OID 1208600)
-- Name: returns fk_returns_device_id; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE returns
    ADD CONSTRAINT fk_returns_device_id FOREIGN KEY (device_id) REFERENCES devices(id);


--
-- TOC entry 6952 (class 2606 OID 1208605)
-- Name: gift_card_transactions gift_card_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE gift_card_transactions
    ADD CONSTRAINT gift_card_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 6953 (class 2606 OID 1208610)
-- Name: gift_card_transactions gift_card_transactions_gift_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE gift_card_transactions
    ADD CONSTRAINT gift_card_transactions_gift_card_id_fkey FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE;


--
-- TOC entry 6954 (class 2606 OID 1208615)
-- Name: gift_card_transactions gift_card_transactions_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE gift_card_transactions
    ADD CONSTRAINT gift_card_transactions_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES lats_sales(id);


--
-- TOC entry 6955 (class 2606 OID 1208620)
-- Name: gift_cards gift_cards_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE gift_cards
    ADD CONSTRAINT gift_cards_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 6956 (class 2606 OID 1208625)
-- Name: installment_payments installment_payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE installment_payments
    ADD CONSTRAINT installment_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance_accounts(id);


--
-- TOC entry 6957 (class 2606 OID 1208630)
-- Name: installment_payments installment_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE installment_payments
    ADD CONSTRAINT installment_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 6958 (class 2606 OID 1208635)
-- Name: installment_payments installment_payments_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE installment_payments
    ADD CONSTRAINT installment_payments_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id);


--
-- TOC entry 6959 (class 2606 OID 1208640)
-- Name: installment_payments installment_payments_installment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE installment_payments
    ADD CONSTRAINT installment_payments_installment_plan_id_fkey FOREIGN KEY (installment_plan_id) REFERENCES customer_installment_plans(id) ON DELETE CASCADE;


--
-- TOC entry 6960 (class 2606 OID 1208645)
-- Name: inventory inventory_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE inventory
    ADD CONSTRAINT inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 6961 (class 2606 OID 1208650)
-- Name: inventory_items inventory_items_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE inventory_items
    ADD CONSTRAINT inventory_items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 6962 (class 2606 OID 1208655)
-- Name: inventory_items inventory_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE inventory_items
    ADD CONSTRAINT inventory_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;


--
-- TOC entry 6963 (class 2606 OID 1208660)
-- Name: inventory_items inventory_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE inventory_items
    ADD CONSTRAINT inventory_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 6964 (class 2606 OID 1208665)
-- Name: inventory_items inventory_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE inventory_items
    ADD CONSTRAINT inventory_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES lats_purchase_order_items(id) ON DELETE SET NULL;


--
-- TOC entry 6965 (class 2606 OID 1208670)
-- Name: inventory_items inventory_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE inventory_items
    ADD CONSTRAINT inventory_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id) ON DELETE CASCADE;


--
-- TOC entry 6966 (class 2606 OID 1208675)
-- Name: lats_categories lats_categories_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_categories
    ADD CONSTRAINT lats_categories_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 6967 (class 2606 OID 1208680)
-- Name: lats_categories lats_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_categories
    ADD CONSTRAINT lats_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES lats_categories(id) ON DELETE CASCADE;


--
-- TOC entry 6913 (class 2606 OID 1208685)
-- Name: lats_customers lats_customers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_customers
    ADD CONSTRAINT lats_customers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 6914 (class 2606 OID 1208690)
-- Name: lats_customers lats_customers_created_by_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_customers
    ADD CONSTRAINT lats_customers_created_by_branch_id_fkey FOREIGN KEY (created_by_branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 6915 (class 2606 OID 1208695)
-- Name: lats_customers lats_customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_customers
    ADD CONSTRAINT lats_customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);


--
-- TOC entry 6916 (class 2606 OID 1208700)
-- Name: lats_customers lats_customers_preferred_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_customers
    ADD CONSTRAINT lats_customers_preferred_branch_id_fkey FOREIGN KEY (preferred_branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 6917 (class 2606 OID 1208705)
-- Name: lats_customers lats_customers_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_customers
    ADD CONSTRAINT lats_customers_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES lats_customers(id);


--
-- TOC entry 6968 (class 2606 OID 1208710)
-- Name: lats_employees lats_employees_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_employees
    ADD CONSTRAINT lats_employees_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 6969 (class 2606 OID 1208715)
-- Name: lats_inventory_adjustments lats_inventory_adjustments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_inventory_adjustments
    ADD CONSTRAINT lats_inventory_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;


--
-- TOC entry 6970 (class 2606 OID 1208720)
-- Name: lats_inventory_adjustments lats_inventory_adjustments_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_inventory_adjustments
    ADD CONSTRAINT lats_inventory_adjustments_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id) ON DELETE CASCADE;


--
-- TOC entry 6972 (class 2606 OID 1208725)
-- Name: lats_inventory_items lats_inventory_items_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 6973 (class 2606 OID 1208730)
-- Name: lats_inventory_items lats_inventory_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;


--
-- TOC entry 6974 (class 2606 OID 1208735)
-- Name: lats_inventory_items lats_inventory_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 6975 (class 2606 OID 1208740)
-- Name: lats_inventory_items lats_inventory_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES lats_purchase_order_items(id) ON DELETE SET NULL;


--
-- TOC entry 6976 (class 2606 OID 1208745)
-- Name: lats_inventory_items lats_inventory_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id) ON DELETE CASCADE;


--
-- TOC entry 6977 (class 2606 OID 1208750)
-- Name: lats_pos_advanced_settings lats_pos_advanced_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_advanced_settings
    ADD CONSTRAINT lats_pos_advanced_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 6978 (class 2606 OID 1208755)
-- Name: lats_pos_analytics_reporting_settings lats_pos_analytics_reporting_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_analytics_reporting_settings
    ADD CONSTRAINT lats_pos_analytics_reporting_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 6979 (class 2606 OID 1208760)
-- Name: lats_pos_barcode_scanner_settings lats_pos_barcode_scanner_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_barcode_scanner_settings
    ADD CONSTRAINT lats_pos_barcode_scanner_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 6980 (class 2606 OID 1208765)
-- Name: lats_pos_delivery_settings lats_pos_delivery_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_delivery_settings
    ADD CONSTRAINT lats_pos_delivery_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 6981 (class 2606 OID 1208770)
-- Name: lats_pos_dynamic_pricing_settings lats_pos_dynamic_pricing_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_dynamic_pricing_settings
    ADD CONSTRAINT lats_pos_dynamic_pricing_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 6982 (class 2606 OID 1208775)
-- Name: lats_pos_general_settings lats_pos_general_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_general_settings
    ADD CONSTRAINT lats_pos_general_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 6983 (class 2606 OID 1208780)
-- Name: lats_pos_loyalty_customer_settings lats_pos_loyalty_customer_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_loyalty_customer_settings
    ADD CONSTRAINT lats_pos_loyalty_customer_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 6984 (class 2606 OID 1208785)
-- Name: lats_pos_notification_settings lats_pos_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_notification_settings
    ADD CONSTRAINT lats_pos_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 6985 (class 2606 OID 1208790)
-- Name: lats_pos_receipt_settings lats_pos_receipt_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_receipt_settings
    ADD CONSTRAINT lats_pos_receipt_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 6986 (class 2606 OID 1208795)
-- Name: lats_pos_search_filter_settings lats_pos_search_filter_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_search_filter_settings
    ADD CONSTRAINT lats_pos_search_filter_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 6987 (class 2606 OID 1208800)
-- Name: lats_pos_user_permissions_settings lats_pos_user_permissions_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_pos_user_permissions_settings
    ADD CONSTRAINT lats_pos_user_permissions_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 6988 (class 2606 OID 1208805)
-- Name: lats_product_units lats_product_units_parent_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_units
    ADD CONSTRAINT lats_product_units_parent_variant_id_fkey FOREIGN KEY (parent_variant_id) REFERENCES lats_product_variants(id) ON DELETE CASCADE;


--
-- TOC entry 6989 (class 2606 OID 1208810)
-- Name: lats_product_validation lats_product_validation_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_validation
    ADD CONSTRAINT lats_product_validation_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;


--
-- TOC entry 6990 (class 2606 OID 1208815)
-- Name: lats_product_validation lats_product_validation_shipping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_validation
    ADD CONSTRAINT lats_product_validation_shipping_id_fkey FOREIGN KEY (shipping_id) REFERENCES lats_shipping(id) ON DELETE CASCADE;


--
-- TOC entry 6991 (class 2606 OID 1208820)
-- Name: lats_product_validation lats_product_validation_updated_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_validation
    ADD CONSTRAINT lats_product_validation_updated_category_id_fkey FOREIGN KEY (updated_category_id) REFERENCES lats_categories(id);


--
-- TOC entry 6992 (class 2606 OID 1208825)
-- Name: lats_product_validation lats_product_validation_updated_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_validation
    ADD CONSTRAINT lats_product_validation_updated_supplier_id_fkey FOREIGN KEY (updated_supplier_id) REFERENCES lats_suppliers(id);


--
-- TOC entry 6993 (class 2606 OID 1208830)
-- Name: lats_product_validation lats_product_validation_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_validation
    ADD CONSTRAINT lats_product_validation_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES users(id);


--
-- TOC entry 6877 (class 2606 OID 1208835)
-- Name: lats_product_variants lats_product_variants_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_variants
    ADD CONSTRAINT lats_product_variants_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE RESTRICT;


--
-- TOC entry 6878 (class 2606 OID 1208840)
-- Name: lats_product_variants lats_product_variants_parent_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_variants
    ADD CONSTRAINT lats_product_variants_parent_variant_id_fkey FOREIGN KEY (parent_variant_id) REFERENCES lats_product_variants(id) ON DELETE CASCADE;


--
-- TOC entry 6879 (class 2606 OID 1208845)
-- Name: lats_product_variants lats_product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_product_variants
    ADD CONSTRAINT lats_product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;


--
-- TOC entry 6880 (class 2606 OID 1208850)
-- Name: lats_products lats_products_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_products
    ADD CONSTRAINT lats_products_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE RESTRICT;


--
-- TOC entry 6881 (class 2606 OID 1208855)
-- Name: lats_products lats_products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_products
    ADD CONSTRAINT lats_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES lats_categories(id);


--
-- TOC entry 6882 (class 2606 OID 1208860)
-- Name: lats_products lats_products_shelf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_products
    ADD CONSTRAINT lats_products_shelf_id_fkey FOREIGN KEY (shelf_id) REFERENCES lats_store_shelves(id) ON DELETE SET NULL;


--
-- TOC entry 6883 (class 2606 OID 1208865)
-- Name: lats_products lats_products_storage_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_products
    ADD CONSTRAINT lats_products_storage_room_id_fkey FOREIGN KEY (storage_room_id) REFERENCES lats_store_rooms(id) ON DELETE SET NULL;


--
-- TOC entry 6884 (class 2606 OID 1208870)
-- Name: lats_products lats_products_store_shelf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_products
    ADD CONSTRAINT lats_products_store_shelf_id_fkey FOREIGN KEY (store_shelf_id) REFERENCES lats_store_shelves(id) ON DELETE SET NULL;


--
-- TOC entry 6885 (class 2606 OID 1208875)
-- Name: lats_products lats_products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_products
    ADD CONSTRAINT lats_products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES lats_suppliers(id) ON DELETE SET NULL;


--
-- TOC entry 6994 (class 2606 OID 1208880)
-- Name: lats_purchase_order_audit_log lats_purchase_order_audit_log_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_audit_log
    ADD CONSTRAINT lats_purchase_order_audit_log_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 6995 (class 2606 OID 1208885)
-- Name: lats_purchase_order_audit_log lats_purchase_order_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_audit_log
    ADD CONSTRAINT lats_purchase_order_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);


--
-- TOC entry 6921 (class 2606 OID 1208890)
-- Name: lats_purchase_order_items lats_purchase_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_items
    ADD CONSTRAINT lats_purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id);


--
-- TOC entry 6922 (class 2606 OID 1208895)
-- Name: lats_purchase_order_items lats_purchase_order_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_items
    ADD CONSTRAINT lats_purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 6923 (class 2606 OID 1208900)
-- Name: lats_purchase_order_items lats_purchase_order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_items
    ADD CONSTRAINT lats_purchase_order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id);


--
-- TOC entry 6996 (class 2606 OID 1208905)
-- Name: lats_purchase_order_payments lats_purchase_order_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_payments
    ADD CONSTRAINT lats_purchase_order_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 6997 (class 2606 OID 1208910)
-- Name: lats_purchase_order_payments lats_purchase_order_payments_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_payments
    ADD CONSTRAINT lats_purchase_order_payments_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 6998 (class 2606 OID 1208915)
-- Name: lats_purchase_order_shipping lats_purchase_order_shipping_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_shipping
    ADD CONSTRAINT lats_purchase_order_shipping_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 6999 (class 2606 OID 1208920)
-- Name: lats_purchase_order_shipping lats_purchase_order_shipping_shipping_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_shipping
    ADD CONSTRAINT lats_purchase_order_shipping_shipping_agent_id_fkey FOREIGN KEY (shipping_agent_id) REFERENCES lats_shipping_agents(id);


--
-- TOC entry 7000 (class 2606 OID 1208925)
-- Name: lats_purchase_order_shipping lats_purchase_order_shipping_shipping_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_order_shipping
    ADD CONSTRAINT lats_purchase_order_shipping_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES lats_shipping_methods(id);


--
-- TOC entry 6887 (class 2606 OID 1208930)
-- Name: lats_purchase_orders lats_purchase_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_orders
    ADD CONSTRAINT lats_purchase_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 6888 (class 2606 OID 1208935)
-- Name: lats_purchase_orders lats_purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_purchase_orders
    ADD CONSTRAINT lats_purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES lats_suppliers(id);


--
-- TOC entry 7001 (class 2606 OID 1208941)
-- Name: lats_sale_items lats_sale_items_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_sale_items
    ADD CONSTRAINT lats_sale_items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 7002 (class 2606 OID 1208946)
-- Name: lats_sale_items lats_sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_sale_items
    ADD CONSTRAINT lats_sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id);


--
-- TOC entry 7003 (class 2606 OID 1208951)
-- Name: lats_sale_items lats_sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_sale_items
    ADD CONSTRAINT lats_sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES lats_sales(id) ON DELETE CASCADE;


--
-- TOC entry 7004 (class 2606 OID 1208956)
-- Name: lats_sales lats_sales_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_sales
    ADD CONSTRAINT lats_sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 7007 (class 2606 OID 1208961)
-- Name: lats_shipping_cargo_items lats_shipping_cargo_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping_cargo_items
    ADD CONSTRAINT lats_shipping_cargo_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;


--
-- TOC entry 7008 (class 2606 OID 1208966)
-- Name: lats_shipping_cargo_items lats_shipping_cargo_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping_cargo_items
    ADD CONSTRAINT lats_shipping_cargo_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES lats_purchase_order_items(id);


--
-- TOC entry 7009 (class 2606 OID 1208971)
-- Name: lats_shipping_cargo_items lats_shipping_cargo_items_shipping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping_cargo_items
    ADD CONSTRAINT lats_shipping_cargo_items_shipping_id_fkey FOREIGN KEY (shipping_id) REFERENCES lats_shipping(id) ON DELETE CASCADE;


--
-- TOC entry 7005 (class 2606 OID 1208976)
-- Name: lats_shipping lats_shipping_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping
    ADD CONSTRAINT lats_shipping_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);


--
-- TOC entry 7006 (class 2606 OID 1208981)
-- Name: lats_shipping lats_shipping_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping
    ADD CONSTRAINT lats_shipping_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 7010 (class 2606 OID 1208986)
-- Name: lats_shipping_settings lats_shipping_settings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping_settings
    ADD CONSTRAINT lats_shipping_settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 7011 (class 2606 OID 1208991)
-- Name: lats_shipping_settings lats_shipping_settings_default_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping_settings
    ADD CONSTRAINT lats_shipping_settings_default_agent_id_fkey FOREIGN KEY (default_agent_id) REFERENCES lats_shipping_agents(id);


--
-- TOC entry 7012 (class 2606 OID 1208996)
-- Name: lats_shipping_settings lats_shipping_settings_default_shipping_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_shipping_settings
    ADD CONSTRAINT lats_shipping_settings_default_shipping_method_id_fkey FOREIGN KEY (default_shipping_method_id) REFERENCES lats_shipping_methods(id);


--
-- TOC entry 7013 (class 2606 OID 1209001)
-- Name: lats_spare_part_usage lats_spare_part_usage_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_spare_part_usage
    ADD CONSTRAINT lats_spare_part_usage_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL;


--
-- TOC entry 7014 (class 2606 OID 1209006)
-- Name: lats_spare_part_usage lats_spare_part_usage_spare_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_spare_part_usage
    ADD CONSTRAINT lats_spare_part_usage_spare_part_id_fkey FOREIGN KEY (spare_part_id) REFERENCES lats_spare_parts(id) ON DELETE CASCADE;


--
-- TOC entry 7015 (class 2606 OID 1209011)
-- Name: lats_spare_part_usage lats_spare_part_usage_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_spare_part_usage
    ADD CONSTRAINT lats_spare_part_usage_used_by_fkey FOREIGN KEY (used_by) REFERENCES users(id);


--
-- TOC entry 7016 (class 2606 OID 1209016)
-- Name: lats_spare_part_variants lats_spare_part_variants_spare_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_spare_part_variants
    ADD CONSTRAINT lats_spare_part_variants_spare_part_id_fkey FOREIGN KEY (spare_part_id) REFERENCES lats_spare_parts(id) ON DELETE CASCADE;


--
-- TOC entry 7017 (class 2606 OID 1209021)
-- Name: lats_stock_movements lats_stock_movements_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_stock_movements
    ADD CONSTRAINT lats_stock_movements_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 7018 (class 2606 OID 1209026)
-- Name: lats_stock_movements lats_stock_movements_from_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_stock_movements
    ADD CONSTRAINT lats_stock_movements_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES store_locations(id);


--
-- TOC entry 7019 (class 2606 OID 1209031)
-- Name: lats_stock_movements lats_stock_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_stock_movements
    ADD CONSTRAINT lats_stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id);


--
-- TOC entry 7020 (class 2606 OID 1209036)
-- Name: lats_stock_movements lats_stock_movements_to_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_stock_movements
    ADD CONSTRAINT lats_stock_movements_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES store_locations(id);


--
-- TOC entry 7021 (class 2606 OID 1209041)
-- Name: lats_stock_movements lats_stock_movements_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_stock_movements
    ADD CONSTRAINT lats_stock_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id);


--
-- TOC entry 7022 (class 2606 OID 1209046)
-- Name: lats_stock_transfers lats_stock_transfers_from_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 7023 (class 2606 OID 1209051)
-- Name: lats_stock_transfers lats_stock_transfers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id);


--
-- TOC entry 7024 (class 2606 OID 1209056)
-- Name: lats_stock_transfers lats_stock_transfers_to_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 7025 (class 2606 OID 1209061)
-- Name: lats_stock_transfers lats_stock_transfers_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id);


--
-- TOC entry 7026 (class 2606 OID 1209066)
-- Name: lats_store_rooms lats_store_rooms_store_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_store_rooms
    ADD CONSTRAINT lats_store_rooms_store_location_id_fkey FOREIGN KEY (store_location_id) REFERENCES lats_store_locations(id) ON DELETE CASCADE;


--
-- TOC entry 7027 (class 2606 OID 1209071)
-- Name: lats_store_shelves lats_store_shelves_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_store_shelves
    ADD CONSTRAINT lats_store_shelves_room_id_fkey FOREIGN KEY (room_id) REFERENCES lats_store_rooms(id) ON DELETE CASCADE;


--
-- TOC entry 7028 (class 2606 OID 1209076)
-- Name: lats_store_shelves lats_store_shelves_storage_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_store_shelves
    ADD CONSTRAINT lats_store_shelves_storage_room_id_fkey FOREIGN KEY (storage_room_id) REFERENCES lats_store_rooms(id) ON DELETE CASCADE;


--
-- TOC entry 7029 (class 2606 OID 1209081)
-- Name: lats_store_shelves lats_store_shelves_store_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_store_shelves
    ADD CONSTRAINT lats_store_shelves_store_location_id_fkey FOREIGN KEY (store_location_id) REFERENCES lats_store_locations(id) ON DELETE CASCADE;


--
-- TOC entry 7030 (class 2606 OID 1209086)
-- Name: lats_supplier_categories lats_supplier_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_categories
    ADD CONSTRAINT lats_supplier_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES lats_supplier_categories(id);


--
-- TOC entry 7031 (class 2606 OID 1209091)
-- Name: lats_supplier_category_mapping lats_supplier_category_mapping_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_category_mapping
    ADD CONSTRAINT lats_supplier_category_mapping_category_id_fkey FOREIGN KEY (category_id) REFERENCES lats_supplier_categories(id) ON DELETE CASCADE;


--
-- TOC entry 7032 (class 2606 OID 1209096)
-- Name: lats_supplier_category_mapping lats_supplier_category_mapping_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_category_mapping
    ADD CONSTRAINT lats_supplier_category_mapping_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES lats_suppliers(id) ON DELETE CASCADE;


--
-- TOC entry 7033 (class 2606 OID 1209101)
-- Name: lats_supplier_communications lats_supplier_communications_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_communications
    ADD CONSTRAINT lats_supplier_communications_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES lats_suppliers(id) ON DELETE CASCADE;


--
-- TOC entry 7034 (class 2606 OID 1209106)
-- Name: lats_supplier_contracts lats_supplier_contracts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_contracts
    ADD CONSTRAINT lats_supplier_contracts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES lats_suppliers(id) ON DELETE CASCADE;


--
-- TOC entry 7035 (class 2606 OID 1209111)
-- Name: lats_supplier_documents lats_supplier_documents_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_documents
    ADD CONSTRAINT lats_supplier_documents_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES lats_suppliers(id) ON DELETE CASCADE;


--
-- TOC entry 7036 (class 2606 OID 1209116)
-- Name: lats_supplier_ratings lats_supplier_ratings_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_ratings
    ADD CONSTRAINT lats_supplier_ratings_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES lats_suppliers(id) ON DELETE CASCADE;


--
-- TOC entry 7037 (class 2606 OID 1209121)
-- Name: lats_supplier_tag_mapping lats_supplier_tag_mapping_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_tag_mapping
    ADD CONSTRAINT lats_supplier_tag_mapping_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES lats_suppliers(id) ON DELETE CASCADE;


--
-- TOC entry 7038 (class 2606 OID 1209126)
-- Name: lats_supplier_tag_mapping lats_supplier_tag_mapping_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_supplier_tag_mapping
    ADD CONSTRAINT lats_supplier_tag_mapping_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES lats_supplier_tags(id) ON DELETE CASCADE;


--
-- TOC entry 6889 (class 2606 OID 1209131)
-- Name: lats_suppliers lats_suppliers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_suppliers
    ADD CONSTRAINT lats_suppliers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 7039 (class 2606 OID 1209136)
-- Name: lats_trade_in_contracts lats_trade_in_contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth_users(id);


--
-- TOC entry 7040 (class 2606 OID 1209141)
-- Name: lats_trade_in_contracts lats_trade_in_contracts_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES lats_trade_in_transactions(id) ON DELETE CASCADE;


--
-- TOC entry 7041 (class 2606 OID 1209146)
-- Name: lats_trade_in_contracts lats_trade_in_contracts_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES auth_users(id);


--
-- TOC entry 7042 (class 2606 OID 1209151)
-- Name: lats_trade_in_damage_assessments lats_trade_in_damage_assessments_assessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_damage_assessments
    ADD CONSTRAINT lats_trade_in_damage_assessments_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES auth_users(id);


--
-- TOC entry 7043 (class 2606 OID 1209156)
-- Name: lats_trade_in_damage_assessments lats_trade_in_damage_assessments_spare_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_damage_assessments
    ADD CONSTRAINT lats_trade_in_damage_assessments_spare_part_id_fkey FOREIGN KEY (spare_part_id) REFERENCES lats_spare_parts(id);


--
-- TOC entry 7044 (class 2606 OID 1209161)
-- Name: lats_trade_in_damage_assessments lats_trade_in_damage_assessments_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_damage_assessments
    ADD CONSTRAINT lats_trade_in_damage_assessments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES lats_trade_in_transactions(id) ON DELETE CASCADE;


--
-- TOC entry 7045 (class 2606 OID 1209166)
-- Name: lats_trade_in_prices lats_trade_in_prices_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE SET NULL;


--
-- TOC entry 7046 (class 2606 OID 1209171)
-- Name: lats_trade_in_prices lats_trade_in_prices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth_users(id) ON DELETE SET NULL;


--
-- TOC entry 7047 (class 2606 OID 1209176)
-- Name: lats_trade_in_prices lats_trade_in_prices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;


--
-- TOC entry 7048 (class 2606 OID 1209181)
-- Name: lats_trade_in_prices lats_trade_in_prices_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth_users(id) ON DELETE SET NULL;


--
-- TOC entry 7049 (class 2606 OID 1209186)
-- Name: lats_trade_in_prices lats_trade_in_prices_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id) ON DELETE CASCADE;


--
-- TOC entry 7050 (class 2606 OID 1209191)
-- Name: lats_trade_in_transactions lats_trade_in_transactions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth_users(id) ON DELETE SET NULL;


--
-- TOC entry 7051 (class 2606 OID 1209196)
-- Name: lats_trade_in_transactions lats_trade_in_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE SET NULL;


--
-- TOC entry 7052 (class 2606 OID 1209201)
-- Name: lats_trade_in_transactions lats_trade_in_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth_users(id) ON DELETE SET NULL;


--
-- TOC entry 7053 (class 2606 OID 1209206)
-- Name: lats_trade_in_transactions lats_trade_in_transactions_new_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_new_product_id_fkey FOREIGN KEY (new_product_id) REFERENCES lats_products(id) ON DELETE SET NULL;


--
-- TOC entry 7054 (class 2606 OID 1209211)
-- Name: lats_trade_in_transactions lats_trade_in_transactions_new_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_new_variant_id_fkey FOREIGN KEY (new_variant_id) REFERENCES lats_product_variants(id) ON DELETE SET NULL;


--
-- TOC entry 7055 (class 2606 OID 1209216)
-- Name: lats_trade_in_transactions lats_trade_in_transactions_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES lats_sales(id) ON DELETE SET NULL;


--
-- TOC entry 7056 (class 2606 OID 1209221)
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;


--
-- TOC entry 7057 (class 2606 OID 1209226)
-- Name: loyalty_points loyalty_points_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE loyalty_points
    ADD CONSTRAINT loyalty_points_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 7058 (class 2606 OID 1209231)
-- Name: mobile_money_transactions mobile_money_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE mobile_money_transactions
    ADD CONSTRAINT mobile_money_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 7059 (class 2606 OID 1209236)
-- Name: mobile_money_transactions mobile_money_transactions_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE mobile_money_transactions
    ADD CONSTRAINT mobile_money_transactions_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id);


--
-- TOC entry 7060 (class 2606 OID 1209241)
-- Name: notifications notifications_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE notifications
    ADD CONSTRAINT notifications_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 7061 (class 2606 OID 1209246)
-- Name: paragraphs paragraphs_note_id_notes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE paragraphs
    ADD CONSTRAINT paragraphs_note_id_notes_id_fk FOREIGN KEY (note_id) REFERENCES notes(id);


--
-- TOC entry 7062 (class 2606 OID 1209251)
-- Name: payment_transactions payment_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE payment_transactions
    ADD CONSTRAINT payment_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 7063 (class 2606 OID 1209256)
-- Name: payment_transactions payment_transactions_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE payment_transactions
    ADD CONSTRAINT payment_transactions_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES lats_sales(id);


--
-- TOC entry 7064 (class 2606 OID 1209261)
-- Name: points_transactions points_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE points_transactions
    ADD CONSTRAINT points_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 7065 (class 2606 OID 1209266)
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;


--
-- TOC entry 7066 (class 2606 OID 1209271)
-- Name: product_interests product_interests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE product_interests
    ADD CONSTRAINT product_interests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES whatsapp_customers(customer_id);


--
-- TOC entry 7067 (class 2606 OID 1209276)
-- Name: purchase_order_audit purchase_order_audit_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_audit
    ADD CONSTRAINT purchase_order_audit_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 7068 (class 2606 OID 1209281)
-- Name: purchase_order_messages purchase_order_messages_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_messages
    ADD CONSTRAINT purchase_order_messages_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 7069 (class 2606 OID 1209286)
-- Name: purchase_order_payments purchase_order_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_payments
    ADD CONSTRAINT purchase_order_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 7070 (class 2606 OID 1209291)
-- Name: purchase_order_payments purchase_order_payments_payment_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_payments
    ADD CONSTRAINT purchase_order_payments_payment_account_id_fkey FOREIGN KEY (payment_account_id) REFERENCES finance_accounts(id);


--
-- TOC entry 7071 (class 2606 OID 1209296)
-- Name: purchase_order_payments purchase_order_payments_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_payments
    ADD CONSTRAINT purchase_order_payments_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 7072 (class 2606 OID 1209301)
-- Name: purchase_order_quality_check_items purchase_order_quality_check_items_criteria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_quality_check_items
    ADD CONSTRAINT purchase_order_quality_check_items_criteria_id_fkey FOREIGN KEY (criteria_id) REFERENCES quality_check_criteria(id) ON DELETE SET NULL;


--
-- TOC entry 7073 (class 2606 OID 1209306)
-- Name: purchase_order_quality_check_items purchase_order_quality_check_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_quality_check_items
    ADD CONSTRAINT purchase_order_quality_check_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES lats_purchase_order_items(id) ON DELETE CASCADE;


--
-- TOC entry 7074 (class 2606 OID 1209311)
-- Name: purchase_order_quality_check_items purchase_order_quality_check_items_quality_check_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_quality_check_items
    ADD CONSTRAINT purchase_order_quality_check_items_quality_check_id_fkey FOREIGN KEY (quality_check_id) REFERENCES purchase_order_quality_checks(id) ON DELETE CASCADE;


--
-- TOC entry 7075 (class 2606 OID 1209316)
-- Name: purchase_order_quality_checks purchase_order_quality_checks_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_quality_checks
    ADD CONSTRAINT purchase_order_quality_checks_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 7076 (class 2606 OID 1209321)
-- Name: purchase_order_quality_checks purchase_order_quality_checks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_order_quality_checks
    ADD CONSTRAINT purchase_order_quality_checks_template_id_fkey FOREIGN KEY (template_id) REFERENCES quality_check_templates(id);


--
-- TOC entry 7077 (class 2606 OID 1209326)
-- Name: purchase_orders purchase_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE purchase_orders
    ADD CONSTRAINT purchase_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 7078 (class 2606 OID 1209331)
-- Name: quality_check_criteria quality_check_criteria_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE quality_check_criteria
    ADD CONSTRAINT quality_check_criteria_template_id_fkey FOREIGN KEY (template_id) REFERENCES quality_check_templates(id) ON DELETE CASCADE;


--
-- TOC entry 7079 (class 2606 OID 1209336)
-- Name: quality_check_items quality_check_items_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE quality_check_items
    ADD CONSTRAINT quality_check_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES quality_check_templates(id) ON DELETE CASCADE;


--
-- TOC entry 7080 (class 2606 OID 1209341)
-- Name: quality_check_results quality_check_results_check_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE quality_check_results
    ADD CONSTRAINT quality_check_results_check_item_id_fkey FOREIGN KEY (check_item_id) REFERENCES quality_check_items(id);


--
-- TOC entry 7081 (class 2606 OID 1209346)
-- Name: quality_check_results quality_check_results_quality_check_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE quality_check_results
    ADD CONSTRAINT quality_check_results_quality_check_id_fkey FOREIGN KEY (quality_check_id) REFERENCES quality_checks(id) ON DELETE CASCADE;


--
-- TOC entry 7082 (class 2606 OID 1209351)
-- Name: quality_checks quality_checks_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE quality_checks
    ADD CONSTRAINT quality_checks_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 7083 (class 2606 OID 1209356)
-- Name: quality_checks quality_checks_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE quality_checks
    ADD CONSTRAINT quality_checks_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 7084 (class 2606 OID 1209361)
-- Name: quality_checks quality_checks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE quality_checks
    ADD CONSTRAINT quality_checks_template_id_fkey FOREIGN KEY (template_id) REFERENCES quality_check_templates(id);


--
-- TOC entry 7085 (class 2606 OID 1209366)
-- Name: recurring_expense_history recurring_expense_history_recurring_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE recurring_expense_history
    ADD CONSTRAINT recurring_expense_history_recurring_expense_id_fkey FOREIGN KEY (recurring_expense_id) REFERENCES recurring_expenses(id) ON DELETE CASCADE;


--
-- TOC entry 7086 (class 2606 OID 1209371)
-- Name: recurring_expense_history recurring_expense_history_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE recurring_expense_history
    ADD CONSTRAINT recurring_expense_history_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES account_transactions(id) ON DELETE SET NULL;


--
-- TOC entry 7087 (class 2606 OID 1209376)
-- Name: recurring_expenses recurring_expenses_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE recurring_expenses
    ADD CONSTRAINT recurring_expenses_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance_accounts(id) ON DELETE CASCADE;


--
-- TOC entry 7088 (class 2606 OID 1209381)
-- Name: recurring_expenses recurring_expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE recurring_expenses
    ADD CONSTRAINT recurring_expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 7089 (class 2606 OID 1209386)
-- Name: reminders reminders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE reminders
    ADD CONSTRAINT reminders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 7090 (class 2606 OID 1209391)
-- Name: reminders reminders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE reminders
    ADD CONSTRAINT reminders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE CASCADE;


--
-- TOC entry 7091 (class 2606 OID 1209396)
-- Name: reminders reminders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE reminders
    ADD CONSTRAINT reminders_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- TOC entry 7092 (class 2606 OID 1209401)
-- Name: repair_parts repair_parts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE repair_parts
    ADD CONSTRAINT repair_parts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 7093 (class 2606 OID 1209406)
-- Name: repair_parts repair_parts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE repair_parts
    ADD CONSTRAINT repair_parts_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);


--
-- TOC entry 7094 (class 2606 OID 1209411)
-- Name: repair_parts repair_parts_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE repair_parts
    ADD CONSTRAINT repair_parts_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;


--
-- TOC entry 7095 (class 2606 OID 1209416)
-- Name: repair_parts repair_parts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE repair_parts
    ADD CONSTRAINT repair_parts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id);


--
-- TOC entry 7096 (class 2606 OID 1209421)
-- Name: report_attachments report_attachments_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE report_attachments
    ADD CONSTRAINT report_attachments_report_id_fkey FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE;


--
-- TOC entry 7097 (class 2606 OID 1209426)
-- Name: report_attachments report_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE report_attachments
    ADD CONSTRAINT report_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth_users(id);


--
-- TOC entry 7098 (class 2606 OID 1209431)
-- Name: reports reports_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE reports
    ADD CONSTRAINT reports_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth_users(id);


--
-- TOC entry 7099 (class 2606 OID 1209436)
-- Name: reports reports_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE reports
    ADD CONSTRAINT reports_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 7100 (class 2606 OID 1209441)
-- Name: reports reports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE reports
    ADD CONSTRAINT reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth_users(id);


--
-- TOC entry 7102 (class 2606 OID 1209446)
-- Name: sale_inventory_items sale_inventory_items_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sale_inventory_items
    ADD CONSTRAINT sale_inventory_items_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES lats_customers(id) ON DELETE SET NULL;


--
-- TOC entry 7103 (class 2606 OID 1209451)
-- Name: sale_inventory_items sale_inventory_items_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sale_inventory_items
    ADD CONSTRAINT sale_inventory_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;


--
-- TOC entry 7104 (class 2606 OID 1209456)
-- Name: sale_inventory_items sale_inventory_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sale_inventory_items
    ADD CONSTRAINT sale_inventory_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES lats_sales(id) ON DELETE CASCADE;


--
-- TOC entry 7105 (class 2606 OID 1209461)
-- Name: sales sales_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sales
    ADD CONSTRAINT sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 7106 (class 2606 OID 1209466)
-- Name: sales_pipeline sales_pipeline_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sales_pipeline
    ADD CONSTRAINT sales_pipeline_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES whatsapp_customers(customer_id);


--
-- TOC entry 7107 (class 2606 OID 1209471)
-- Name: scheduled_transfer_executions scheduled_transfer_executions_destination_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE scheduled_transfer_executions
    ADD CONSTRAINT scheduled_transfer_executions_destination_transaction_id_fkey FOREIGN KEY (destination_transaction_id) REFERENCES account_transactions(id);


--
-- TOC entry 7108 (class 2606 OID 1209476)
-- Name: scheduled_transfer_executions scheduled_transfer_executions_scheduled_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE scheduled_transfer_executions
    ADD CONSTRAINT scheduled_transfer_executions_scheduled_transfer_id_fkey FOREIGN KEY (scheduled_transfer_id) REFERENCES scheduled_transfers(id) ON DELETE CASCADE;


--
-- TOC entry 7109 (class 2606 OID 1209481)
-- Name: scheduled_transfer_executions scheduled_transfer_executions_source_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE scheduled_transfer_executions
    ADD CONSTRAINT scheduled_transfer_executions_source_transaction_id_fkey FOREIGN KEY (source_transaction_id) REFERENCES account_transactions(id);


--
-- TOC entry 7110 (class 2606 OID 1209486)
-- Name: scheduled_transfers scheduled_transfers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE scheduled_transfers
    ADD CONSTRAINT scheduled_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);


--
-- TOC entry 7111 (class 2606 OID 1209491)
-- Name: scheduled_transfers scheduled_transfers_destination_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE scheduled_transfers
    ADD CONSTRAINT scheduled_transfers_destination_account_id_fkey FOREIGN KEY (destination_account_id) REFERENCES finance_accounts(id) ON DELETE CASCADE;


--
-- TOC entry 7112 (class 2606 OID 1209496)
-- Name: scheduled_transfers scheduled_transfers_source_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE scheduled_transfers
    ADD CONSTRAINT scheduled_transfers_source_account_id_fkey FOREIGN KEY (source_account_id) REFERENCES finance_accounts(id) ON DELETE CASCADE;


--
-- TOC entry 7113 (class 2606 OID 1209501)
-- Name: serial_number_movements serial_number_movements_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE serial_number_movements
    ADD CONSTRAINT serial_number_movements_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;


--
-- TOC entry 7114 (class 2606 OID 1209506)
-- Name: shelves shelves_storage_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE shelves
    ADD CONSTRAINT shelves_storage_room_id_fkey FOREIGN KEY (storage_room_id) REFERENCES storage_rooms(id) ON DELETE CASCADE;


--
-- TOC entry 7115 (class 2606 OID 1209511)
-- Name: sms_logs sms_logs_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sms_logs
    ADD CONSTRAINT sms_logs_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;


--
-- TOC entry 7116 (class 2606 OID 1209516)
-- Name: sms_trigger_logs sms_trigger_logs_trigger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sms_trigger_logs
    ADD CONSTRAINT sms_trigger_logs_trigger_id_fkey FOREIGN KEY (trigger_id) REFERENCES sms_triggers(id) ON DELETE SET NULL;


--
-- TOC entry 7117 (class 2606 OID 1209521)
-- Name: sms_triggers sms_triggers_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE sms_triggers
    ADD CONSTRAINT sms_triggers_template_id_fkey FOREIGN KEY (template_id) REFERENCES communication_templates(id);


--
-- TOC entry 7118 (class 2606 OID 1209526)
-- Name: special_order_payments special_order_payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE special_order_payments
    ADD CONSTRAINT special_order_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance_accounts(id);


--
-- TOC entry 7119 (class 2606 OID 1209531)
-- Name: special_order_payments special_order_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE special_order_payments
    ADD CONSTRAINT special_order_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id);


--
-- TOC entry 7120 (class 2606 OID 1209536)
-- Name: special_order_payments special_order_payments_special_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE special_order_payments
    ADD CONSTRAINT special_order_payments_special_order_id_fkey FOREIGN KEY (special_order_id) REFERENCES customer_special_orders(id) ON DELETE CASCADE;


--
-- TOC entry 7121 (class 2606 OID 1209541)
-- Name: storage_rooms storage_rooms_store_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE storage_rooms
    ADD CONSTRAINT storage_rooms_store_location_id_fkey FOREIGN KEY (store_location_id) REFERENCES store_locations(id);


--
-- TOC entry 7122 (class 2606 OID 1209546)
-- Name: user_branch_assignments user_branch_assignments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE CASCADE;


--
-- TOC entry 7123 (class 2606 OID 1209551)
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- TOC entry 7124 (class 2606 OID 1209556)
-- Name: users users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES lats_branches(id);


--
-- TOC entry 7125 (class 2606 OID 1209561)
-- Name: webhook_logs webhook_logs_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE webhook_logs
    ADD CONSTRAINT webhook_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES webhook_endpoints(id) ON DELETE CASCADE;


--
-- TOC entry 7440 (class 3256 OID 1209566)
-- Name: user_settings Allow all operations on user_settings; Type: POLICY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7441 (class 3256 OID 1209567)
-- Name: product_images Allow authenticated users to delete product images; Type: POLICY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7442 (class 3256 OID 1209568)
-- Name: product_images Allow authenticated users to insert product images; Type: POLICY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7443 (class 3256 OID 1209569)
-- Name: product_images Allow authenticated users to update product images; Type: POLICY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7444 (class 3256 OID 1209570)
-- Name: product_images Allow authenticated users to view product images; Type: POLICY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7445 (class 3256 OID 1209571)
-- Name: admin_settings Allow read access to all authenticated users; Type: POLICY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7446 (class 3256 OID 1209572)
-- Name: customer_installment_plans Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7447 (class 3256 OID 1209573)
-- Name: customer_special_orders Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7448 (class 3256 OID 1209574)
-- Name: expenses Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7449 (class 3256 OID 1209575)
-- Name: lats_stock_transfers Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7450 (class 3256 OID 1209576)
-- Name: loyalty_points Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7451 (class 3256 OID 1209577)
-- Name: backup_logs Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7452 (class 3256 OID 1209578)
-- Name: customer_installment_plan_payments Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: neondb_owner
--


