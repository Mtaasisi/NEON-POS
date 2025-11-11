--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (6bc9ef8)
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

--
-- Data for Name: users_sync; Type: TABLE DATA; Schema: neon_auth; Owner: neondb_owner
--

COPY neon_auth.users_sync (raw_json, updated_at, deleted_at) FROM stdin;
{"id": "3da0df92-6f63-4ee2-b33d-3aa56e90d31d", "display_name": "123456", "has_password": false, "is_anonymous": false, "primary_email": "care@care.com", "selected_team": null, "auth_with_email": false, "client_metadata": null, "oauth_providers": [], "server_metadata": null, "otp_auth_enabled": false, "selected_team_id": null, "profile_image_url": null, "requires_totp_mfa": false, "signed_up_at_millis": 1759814617090, "passkey_auth_enabled": false, "last_active_at_millis": 1759814617090, "primary_email_verified": false, "client_read_only_metadata": null, "primary_email_auth_enabled": true}	2025-10-07 05:23:37+00	\N
\.


--
-- Data for Name: store_locations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.store_locations (id, name, code, address, city, state, zip_code, country, phone, email, manager_name, is_main, is_active, opening_time, closing_time, inventory_sync_enabled, pricing_model, tax_rate_override, created_at, updated_at, data_isolation_mode, share_products, share_customers, share_inventory, share_suppliers, share_categories, share_employees, allow_stock_transfer, auto_sync_products, auto_sync_prices, require_approval_for_transfers, can_view_other_branches, can_transfer_to_branches) FROM stdin;
115e0e51-d0d6-437b-9fda-dfe11241b167	ARUSHA	R-01	Tripple A	Arusha	Arusha	14113	Tanzania	0746605561	inauzwacare@gmail.com	Mtaasisis kaka	f	t	09:00:00	21:00:00	t	centralized	\N	2025-10-12 20:23:51.619+00	2025-10-19 08:43:30.876425+00	isolated	t	t	t	t	t	t	t	t	t	f	t	{}
24cd45b8-1ce1-486a-b055-29d169c3a8ea	DAR	DAR-01	Lufungila	Dar es Salaam	Dar es salaam	14113	Tanzania	0712378850	xamuelhance10@gmail.com	Diana masika	t	t	09:00:00	21:00:00	t	centralized	\N	2025-10-12 19:26:49.704+00	2025-10-19 09:28:21.091025+00	isolated	f	t	f	t	t	t	t	t	t	f	f	{}
\.


--
-- Data for Name: finance_accounts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.finance_accounts (id, account_name, account_type, account_number, bank_name, current_balance, currency, is_active, created_at, updated_at, is_payment_method, name, type, balance, requires_reference, requires_account_number, description, icon, color, branch_id, is_shared) FROM stdin;
71a4d960-0db5-4b9c-a880-5f0cebe9830b	CRDB Bank	bank	\N	CRDB Bank	0	TZS	t	2025-10-08 06:24:27.739231+00	2025-10-18 13:35:24.231796+00	t	CRDB Bank	bank	1509430.00	f	f	\N	Building2	#3B82F6	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t
5e32c912-7ab7-444a-8ffd-02cb99b56a04	Cash	cash	\N	\N	0	TZS	t	2025-10-08 06:24:27.074606+00	2025-10-19 13:06:50.652577+00	t	Cash	cash	315663.86	f	f	\N	Wallet	#10B981	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t
e10a3491-2c7a-4dad-a773-59a3144b776e	M-Pesa	mobile_money	\N	\N	0	TZS	t	2025-10-08 06:24:27.509086+00	2025-10-14 07:49:51.279424+00	t	M-Pesa	mobile_money	5081466.30	f	f	\N	Smartphone	#8B5CF6	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t
\.


--
-- Data for Name: account_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.account_transactions (id, account_id, transaction_type, amount, balance_before, balance_after, reference_number, description, related_transaction_id, metadata, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.admin_settings (id, category, setting_key, setting_value, setting_type, description, is_active, created_at, updated_at) FROM stdin;
f8743441-9fdc-4c26-a820-dc58ab9edda4	inventory	price_change_alerts	false	boolean	Send alerts on price changes	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.305+00
a2da3f05-263f-451c-8466-41b1c5c0674b	inventory	enable_barcode_tracking	true	boolean	Enable barcode scanning and tracking	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.314+00
1b6536b0-7570-4497-86ad-677c6b91f2ff	inventory	critical_stock_threshold	5	number	Critical alert when stock falls below this number	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:39.975+00
fe30a52a-2a22-48d3-aab9-8c007c1fe03c	inventory	low_stock_threshold	10	number	Alert when stock falls below this number	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:39.976+00
9deb5ac3-cdcd-468d-b034-562f2bc169f1	inventory	minimum_order_quantity	1	number	Minimum quantity for orders	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:39.977+00
08dce586-0837-45ea-983b-6306ccd7cd1d	inventory	safety_stock_level	5	number	Safety buffer stock quantity	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:39.978+00
53e1eb93-3808-408d-983e-08433fd66f55	inventory	stock_counting_frequency	weekly	string	How often to count stock (daily/weekly/monthly)	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:39.978+00
152afebc-09a7-4ba9-bc09-cdcbee2bf72b	inventory	reorder_point_percentage	20	number	Percentage of max stock to trigger reorder	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:39.977+00
92da4b75-705e-4135-a62b-43780e367a98	inventory	default_markup_percentage	30	number	Default markup percentage for products	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:39.978+00
9ce1f9c1-951f-4f78-956b-3736db0c4432	inventory	enable_dynamic_pricing	false	boolean	Enable dynamic pricing based on demand/supply	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:39.978+00
fac5f95c-d9b6-4cdd-b534-b3ef18d74e5a	inventory	price_rounding_method	nearest	string	How to round prices (nearest/up/down)	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:39.979+00
2a38ebdd-89c3-4186-a026-ea464eb2cf14	inventory	enable_seasonal_pricing	false	boolean	Enable seasonal pricing	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.3+00
e9ecc7dd-ba8c-4dcd-bdaa-97be5c729ed4	inventory	cost_calculation_method	average	string	Cost calculation method (fifo/lifo/average)	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.266+00
e09236d3-779e-48cc-9068-bd824c419c84	inventory	price_history_days	365	number	Days to keep price history	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.301+00
9fd9e520-f512-46a4-8225-0c285d548001	inventory	auto_price_update	false	boolean	Automatically update prices when cost changes	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.266+00
c4ce37d6-11a6-4398-ae26-315260b803e7	inventory	out_of_stock_alerts	true	boolean	Send alerts when stock is depleted	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.302+00
6dc58c1e-35a9-4e1e-8e8c-e2f74d22e325	inventory	enable_bulk_discount	true	boolean	Enable bulk discount rules	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.292+00
15279030-ff47-4616-8485-b048922afeae	inventory	low_stock_alerts	true	boolean	Send alerts when stock is low	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.301+00
62060ae3-6767-446b-9082-3e16debb7f0e	inventory	whatsapp_notifications	false	boolean	Send WhatsApp notifications	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.306+00
32b5ace5-c15d-4257-aa5e-6c30820bafb5	inventory	maximum_stock_level	1000	number	Maximum stock level allowed per item	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:39.978+00
dd30a24e-4659-4d14-9d5b-c0941e8b7891	inventory	require_approval_stock_adjustment	false	boolean	Require manager approval for stock adjustments	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.355+00
2876b619-266d-4d4b-ad23-06c7c0a8dd60	inventory	backup_frequency	daily	string	Backup frequency (daily/weekly/monthly)	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.37+00
41e9bf44-bd53-42e0-9fb7-0b9567139360	inventory	max_category_depth	3	number	Maximum category nesting level	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.567+00
2878d94b-2c9f-4d29-acbe-926103068c18	inventory	auto_reorder_enabled	true	boolean	Automatically create purchase orders when stock is low	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:39.977+00
3b4a78ad-e445-4f7e-9b50-6671774cb369	inventory	sms_notifications	false	boolean	Send SMS notifications	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.305+00
b14e2347-aaf7-43b9-ab04-94ec31115532	inventory	email_notifications	true	boolean	Send email notifications	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.305+00
4be97f4a-33ee-44da-a1e0-0190cd16f9c6	inventory	overstock_alerts	true	boolean	Alert when stock exceeds maximum level	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.308+00
2fbccbdf-75ef-49c9-8501-7eab085a76ef	inventory	expiry_alert_days	30	number	Alert X days before product expiry	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.309+00
18b0589c-083a-495a-8836-2ac005bd67f5	inventory	slow_moving_alert_days	90	number	Alert if no sales in X days	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.309+00
cd7997f7-1d9c-45e9-9a2d-f94c19cd9e58	inventory	enable_location_tracking	false	boolean	Track items by warehouse location/bin	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.335+00
f6e8aa0f-5bc5-4648-b9ae-3871376c17d4	inventory	enable_sku_auto_generation	true	boolean	Automatically generate SKU codes	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.336+00
c1954ec8-54eb-4ba6-b8ff-aa1f252955e5	inventory	enable_serial_tracking	false	boolean	Track items by serial number	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.312+00
b09a572c-9ad3-43fb-a47b-95dfad828c71	inventory	enable_expiry_tracking	true	boolean	Track product expiry dates	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.336+00
13e7cfa8-3f81-4cc6-91b9-d5ed63628e3f	inventory	barcode_format	EAN-13	string	Default barcode format (EAN-13/UPC-A/Code-128/QR)	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.336+00
cd6fd844-76c8-4d39-92f1-8d73f8e91322	inventory	enable_batch_tracking	false	boolean	Track items by batch/lot number	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.336+00
ff7f8b55-6087-4c0f-9a06-126bba62f089	inventory	enable_branch_isolation	true	boolean	Isolate inventory by branch	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.339+00
e8264d39-724c-433e-9151-ad9cf4cf54ed	inventory	enable_qr_code	true	boolean	Enable QR code support	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.34+00
219a7ea5-025f-4e0a-857e-db18b2c90f3b	inventory	auto_stock_sync	false	boolean	Automatically sync stock between branches	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.34+00
769da7ab-ca0c-4773-bcba-89f7f7666c4a	inventory	allow_inter_branch_transfer	true	boolean	Allow transfers between branches	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.34+00
10fbb285-0a3f-4a0a-9892-9db6d120619f	inventory	stock_visibility_mode	own_branch	string	Stock visibility (own_branch/all_branches)	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.341+00
c660e89a-ad6a-4481-80bc-5e72a87de7ac	inventory	transfer_approval_required	false	boolean	Require approval for transfers	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.341+00
c1b199b8-61d8-4146-8a96-0a629d798b59	inventory	sync_frequency	hourly	string	Sync frequency (realtime/hourly/daily)	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.353+00
32bf0e63-55f1-48a5-ad14-78a8224e7d72	inventory	enable_audit_logging	true	boolean	Log all inventory changes	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.354+00
983417b1-722a-465f-9efb-1dbaf8bf274e	inventory	require_approval_price_change	false	boolean	Require manager approval for price changes	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.355+00
b09012c2-e875-49df-9a1b-684ae5be7ae3	inventory	approval_threshold_amount	10000	number	Amount above which approval is needed	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.356+00
0fe551f2-b9dd-4095-aae9-9b31995de9cb	inventory	require_manager_pin	false	boolean	Require manager PIN for adjustments	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.356+00
4d82babb-50f0-421c-8a05-56599e7eb22e	inventory	lock_historical_inventory	false	boolean	Prevent backdating inventory changes	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.372+00
1fd610f1-357e-49fa-a19d-1c2e545031bb	inventory	max_adjustment_percentage	50	number	Maximum allowed adjustment percentage	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.373+00
1aa37c13-f00a-416f-b1ef-f7081d2978f9	inventory	default_source_branch		string	Default branch ID for new stock	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.341+00
cd8c0b51-3af1-49e8-9e3a-7b14c4e82b15	inventory	auto_backup_enabled	true	boolean	Enable automatic inventory backups	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.374+00
6e4b8f02-298c-4f9d-9ea2-621c715ccda9	inventory	backup_retention_days	90	number	Days to retain backups	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.559+00
02dc28f5-6c40-4b71-9759-36343d3a9cd9	inventory	export_format	excel	string	Default export format (csv/excel/pdf)	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.56+00
3073b3cf-b0a1-4072-bed9-f36579a6bc85	inventory	archive_after_months	12	number	Archive data older than X months	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.561+00
b3472d32-282b-4744-8c8b-e621258347a6	inventory	enable_analytics	true	boolean	Enable inventory analytics	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.563+00
d1219197-7bed-4635-aaa6-026b27d5db79	inventory	cache_inventory_data	true	boolean	Cache inventory data for faster access	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.564+00
1f0171ab-89dd-43ba-904a-7d8ebb8963e2	inventory	auto_refresh_interval	300	number	Auto-refresh interval in seconds	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.561+00
ba655909-0ce5-4b52-b902-0cd81bb011a1	inventory	enable_data_archiving	true	boolean	Archive old inventory data	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.561+00
e96aed01-c1ca-4ced-88de-33c0722176cf	inventory	pagination_size	50	number	Number of items per page	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.564+00
763240bd-7ad7-4c50-9d32-bb9130d141e2	inventory	enable_image_optimization	true	boolean	Compress product images	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.565+00
5610d2ea-5d55-493f-bfc8-4af2f25984f5	inventory	enable_lazy_loading	true	boolean	Use lazy loading for large inventories	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.566+00
f02207d7-43a1-4bd3-b996-2ef04cafc57f	inventory	enable_product_bundles	true	boolean	Enable product bundles/kits	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.567+00
b280a0b9-e597-4f31-bf4c-3f7f1ca10583	inventory	enable_search_indexing	true	boolean	Enable search indexing	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.565+00
0365b04d-2609-4252-8aa5-d91fffd7a694	inventory	auto_assign_categories	false	boolean	Auto-assign categories based on product name	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.566+00
36a064fe-fd3c-4e93-95de-55d8e0505dc2	inventory	enable_tags	true	boolean	Enable product tags/labels	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.567+00
bd96a10e-2a99-4e30-93ce-3849adf8c2ef	inventory	enable_subcategories	true	boolean	Enable product subcategories	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.567+00
269dd2d9-c518-4ae9-96f7-be02ecb516d6	inventory	default_category_id		string	Default category for new products	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.567+00
f6ac8282-1785-44de-b319-14cdc1813f7c	inventory	preferred_supplier_auto_select	false	boolean	Auto-select preferred supplier	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.568+00
6c70159e-41af-40ce-b0e9-fab15a8b8c8f	inventory	default_lead_time_days	7	number	Default supplier lead time in days	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.568+00
2fb1d112-dee6-4c3a-8158-15d7bfc9b3dd	inventory	enable_product_variants	true	boolean	Enable product variants (size/color/etc)	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.568+00
479b5581-dff6-4011-848b-246f7141da4a	inventory	enable_supplier_tracking	true	boolean	Track suppliers for products	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.568+00
045f9a7b-be39-4d9b-9c53-1f99ecf955da	inventory	enable_purchase_orders	true	boolean	Enable purchase order system	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.568+00
24d1cc83-efc8-4090-a769-e3c8f3fd3067	inventory	stock_valuation_report_frequency	weekly	string	Stock valuation report frequency	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.569+00
2210e693-ede6-40ef-9a11-4c329453cb52	inventory	auto_create_po_at_reorder	true	boolean	Auto-create PO at reorder point	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.569+00
a283e7e5-2fee-4b7a-be2a-00bfcc39c8ed	inventory	stock_discrepancy_alerts	true	boolean	Alert on stock count discrepancies	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.31+00
9d47f9f3-5f08-4a87-8bfc-b212b3ebcede	inventory	track_supplier_performance	true	boolean	Track supplier delivery performance	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.569+00
5990dfc5-0c02-4c51-9c44-0757156a0ddf	inventory	enable_abc_analysis	true	boolean	Enable ABC analysis classification	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.606+00
fb5b18ba-b444-4e0c-a7dd-e51fbefe2fb6	inventory	enable_realtime_reporting	true	boolean	Enable real-time reporting	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.609+00
208cb478-ef54-4c4d-bf7c-158375c305d0	inventory	enable_pos_integration	true	boolean	Integrate with POS system	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.609+00
99725452-497e-49c3-a444-7c09a1111f6f	inventory	enable_accounting_integration	false	boolean	Integrate with accounting software	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.608+00
1953c180-0844-4b5e-87a8-415aca110dcf	inventory	dead_stock_threshold_days	180	number	Days without movement to flag as dead stock	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.607+00
0e2c9dfd-6e2c-4f5f-aef2-90da1406fd21	inventory	enable_ecommerce_sync	false	boolean	Sync with e-commerce platforms	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.609+00
55733a90-f910-4c89-9e26-751242220c65	inventory	enable_inventory_turnover	true	boolean	Calculate inventory turnover ratio	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.608+00
2fd5f3ea-db64-4f28-9c2f-136920face0f	inventory	dashboard_refresh_rate	60	number	Dashboard refresh rate in seconds	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.607+00
ea056c22-2f29-47bc-a9f0-60394577f4e1	inventory	adjustment_reason_required	true	boolean	Require reason for adjustments	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.61+00
3190c000-49f1-42ab-b491-a037d799c31e	inventory	allow_returns_to_inventory	true	boolean	Allow returned items back to inventory	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.609+00
10caa522-c78b-420b-95c5-8a727748e4d5	inventory	webhook_stock_changes		string	Webhook URL for stock changes	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.609+00
917d8b23-8b4c-4673-94d6-d296c26d64b2	inventory	enable_api_access	true	boolean	Enable API access for inventory	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.61+00
f9e5bed9-ab5a-4a2b-80e0-cc56662deb7e	inventory	return_inspection_required	true	boolean	Require inspection before restocking returns	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.61+00
76f367a7-32e9-46cd-86b4-6b074701c43a	inventory	damaged_stock_handling	separate_bin	string	How to handle damaged stock (separate_bin/write_off)	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.615+00
9456a665-db24-494f-9ed4-a67fa2ffe931	inventory	enable_uom_conversion	true	boolean	Enable UOM conversion factors	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.615+00
e28e897e-89ce-460a-aadb-f65a624ff55a	inventory	max_return_period_days	30	number	Maximum days to accept returns	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.612+00
ab2fd9f5-4bdc-4fda-9867-0a4aa3af2221	inventory	default_uom	piece	string	Default unit of measure	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.615+00
5dec8bba-b0af-4a63-b64d-ec06b55e694f	inventory	enable_multiple_uom	true	boolean	Enable multiple units of measure	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.614+00
bd33af91-109f-43dd-969c-ac13ae55a825	inventory	quantity_decimal_places	2	number	Decimal places for quantities	t	2025-10-13 12:22:48.026354+00	2025-10-13 12:27:40.615+00
\.


--
-- Data for Name: admin_settings_log; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.admin_settings_log (id, category, setting_key, old_value, new_value, changed_by, change_reason, changed_at) FROM stdin;
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.api_keys (id, user_id, name, key, scopes, is_active, last_used, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: api_request_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.api_request_logs (id, api_key_id, endpoint, method, ip_address, user_agent, response_status, response_time_ms, created_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customers (id, name, email, phone, gender, city, joined_date, loyalty_level, color_tag, total_spent, points, last_visit, is_active, referral_source, birth_month, birth_day, customer_tag, notes, total_returns, initial_notes, location_description, national_id, created_at, updated_at, profile_image, whatsapp, whatsapp_opt_out, created_by, last_purchase_date, total_purchases, birthday, referred_by, total_calls, total_call_duration_minutes, incoming_calls, outgoing_calls, missed_calls, avg_call_duration_minutes, first_call_date, last_call_date, call_loyalty_level, last_activity_date, referrals, branch_id, is_shared, preferred_branch_id, visible_to_branches, sharing_mode, created_by_branch_id, created_by_branch_name, country) FROM stdin;
38047115-adea-4444-91d8-9997af5965da	Leecliffe Mwaikambo		+255788254254	male		2025-10-23	bronze	new	0	0	2025-10-23 16:50:44.041+00	t	Friend	\N	\N	\N	\N	0		\N	\N	2025-10-23 16:50:45.847261+00	2025-10-23 16:50:45.847261+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-23 16:50:45.847261+00	[]	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	\N	isolated	115e0e51-d0d6-437b-9fda-dfe11241b167	ARUSHA	\N
50f1d27a-a2c8-4899-b854-80b875c26782	John Mwamba	john.mwamba@example.com	+255712345678	male	Dar es Salaam	2025-10-11	bronze	new	4343	14	2025-10-11 12:56:43.012+00	t	Walk-in	January	15	\N	\N	0	\N	\N	\N	2025-10-11 10:07:52.395+00	2025-10-13 19:57:33.958669+00	\N	+255712345678	f	\N	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-13 19:57:33.958669+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
aee285a4-12bc-4ec1-b95b-2c2f5505b05a	Samuel masika		+255746605561	male	Dar es Salaam	2025-10-11	bronze	vip	0	0	2025-10-11 14:32:20.783+00	t	Friend	June	3	\N	["Mteja mzuri sana kanunua simu nyingi sana"]	0		\N	\N	2025-10-11 11:12:16.029821+00	2025-10-18 13:18:51.678112+00	\N	+255746605561	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-18 13:18:51.678112+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
5ca5204d-8c3c-4e61-82da-e59b19bc3441	Test Customer	test@example.com	1234567890	\N	\N	\N	bronze	\N	7559.5	115	2025-10-10 19:40:09.898+00	t	\N	\N	\N	\N	\N	0	\N	\N	\N	2025-10-07 06:52:00.320178+00	2025-10-10 19:40:09.898+00	\N	\N	f	\N	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-10 23:31:00.061604+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
618791cf-c230-400c-abd7-d97fcc42a9b1	12345		+255746605561	female	Dar es Salaam	2025-10-11	bronze	new	23	0	2025-10-11 11:49:53.872+00	t	Event	\N	\N	\N	\N	0		\N	\N	2025-10-11 11:12:50.629213+00	2025-10-11 11:49:53.872+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-11 11:12:50.629213+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
49d30400-38e4-47c7-85f2-29b72aaad0c7	Mary Kamwela	mary.kamwela@example.com	+255787654321	female	Arusha	2025-10-11	bronze	new	4942	14	2025-10-11 12:06:23.583+00	t	Friend	March	22	\N	\N	0	\N	\N	\N	2025-10-11 10:07:56.417+00	2025-10-11 12:06:23.583+00	\N	+255787654321	f	\N	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-11 10:07:57.172728+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
0d949b9b-720f-4670-a521-e2bef9eceeed	Samuel masika		+255712378850	male	Arusha	\N	bronze	new	0	0	2025-10-10 06:22:40.426+00	t	Friend	March	3	\N	\N	0		\N	\N	2025-10-08 19:13:08.216+00	2025-10-13 07:21:38.928555+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-13 07:21:38.928555+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
0fe06fb0-33e4-4122-8169-5e2b8cbedc16	2222222		+255746605568	male	Dar es Salaam	2025-10-13	bronze	new	0	0	2025-10-13 06:16:32.579+00	t	Walk-in	February	3	\N	\N	0		\N	\N	2025-10-13 06:16:34.256957+00	2025-10-13 07:27:47.532579+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-13 07:27:47.532579+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
2c510481-26e6-43cb-b9d3-6de116e96889	Arusha		+255746605500	female	Dar es Salaam	2025-10-13	gold	new	6890280.0600000005	7014	2025-10-14 08:33:14.045+00	t	Friend	February	2	\N	\N	0		\N	\N	2025-10-13 08:45:24.068998+00	2025-10-18 08:43:56.317029+00	\N	+255746605500	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-18 08:43:56.317029+00	[]	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	\N	isolated	115e0e51-d0d6-437b-9fda-dfe11241b167	ARUSHA	\N
f16015a0-c224-404d-8f3f-16ab8dfe146d	Tawi Arusha		+255712378890	male	Arusha	2025-10-18	bronze	new	0	0	2025-10-18 11:40:33.370489+00	t	Instagram	March	21	\N	\N	0		\N	\N	2025-10-18 11:39:27.281609+00	2025-10-18 11:40:33.370489+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-18 11:40:33.370489+00	[]	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	\N	isolated	115e0e51-d0d6-437b-9fda-dfe11241b167	ARUSHA	\N
cc18aab6-83cb-43e2-81ee-533fb780d213	Fff		+255746605561	male	Dar es Salaam	2025-10-11	bronze	new	68474	66	2025-10-12 14:00:29.667+00	t	Event	\N	\N	\N	\N	0		\N	\N	2025-10-11 17:07:40.935425+00	2025-10-13 06:59:51.428888+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-13 06:59:51.428888+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
54ebcb36-3c3e-4512-898a-91582c73adf9	Inauzwa Caredsad		+255746605510	male	Dar es Salaam	2025-10-12	bronze	new	1500000	1500	2025-10-12 13:14:53.99+00	t	Newspaper	\N	\N	\N	\N	0		\N	\N	2025-10-12 10:47:02.243193+00	2025-10-13 07:00:54.07146+00	\N	\N	f	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-13 07:00:54.07146+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
0738ae16-faf1-450e-b0f1-1d5346ee2625	Samuel masika		+255746605561	male	Dar es Salaam	2025-10-11	bronze	new	42735293	13	2025-10-18 13:22:53.377+00	t	Newspaper	\N	\N	\N	\N	0		\N	\N	2025-10-11 10:35:52.331335+00	2025-10-18 13:22:53.377+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-12 06:59:24.643873+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
ed2487c0-1a65-4d5d-98e3-78bd13fe8243	Norah		+255699485663	female	Arusha	2025-10-18	bronze	new	1000	1	2025-10-18 13:35:24.119+00	t	Instagram	September	13	\N	\N	0		\N	\N	2025-10-18 13:31:26.937576+00	2025-10-18 13:35:24.119+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-18 13:31:26.937576+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
4e4b2f94-3b07-405c-ad56-744c3926f4c7	Sssssssss		+255746605560	male	Dar es Salaam	2025-10-13	bronze	new	30	0	2025-10-18 17:09:39.942+00	t	Business Card	March	2	\N	\N	0		\N	\N	2025-10-13 06:18:22.522473+00	2025-10-18 17:09:39.942+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-13 07:16:07.448612+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.devices (id, customer_id, device_name, brand, model, serial_number, imei, problem_description, diagnostic_notes, repair_notes, status, estimated_cost, actual_cost, deposit_amount, balance_amount, technician_id, intake_date, estimated_completion_date, actual_completion_date, pickup_date, warranty_expiry_date, created_at, updated_at, priority, password, accessories, issue_description, assigned_to, expected_return_date, estimated_hours, diagnosis_required, device_notes, device_cost, repair_cost, repair_price, unlock_code, device_condition, diagnostic_checklist, branch_id, is_shared) FROM stdin;
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.appointments (id, customer_id, device_id, technician_id, appointment_date, duration_minutes, status, notes, created_at, updated_at, service_type, appointment_time, customer_name, customer_phone, technician_name, priority, created_by) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.employees (id, user_id, first_name, last_name, email, phone, date_of_birth, gender, "position", department, hire_date, termination_date, employment_type, salary, currency, status, performance_rating, skills, manager_id, location, emergency_contact_name, emergency_contact_phone, address_line1, address_line2, city, state, postal_code, country, photo_url, bio, created_at, updated_at, created_by, updated_by, branch_id, can_work_at_all_branches, assigned_branches, is_shared) FROM stdin;
b3be34ed-d55f-48cc-86d4-2065dfe8e4e1	287ec561-d5f2-4113-840e-e9335b9d3f69	Admin	User	care@care.com	\N	\N	\N	Staff	General	2025-10-12	\N	full-time	0.00	TZS	active	3.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Tanzania	\N	\N	2025-10-12 17:44:25.168505+00	2025-10-19 09:22:00.893442+00	\N	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea	f	{}	t
\.


--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.attendance_records (id, employee_id, attendance_date, check_in_time, check_out_time, check_in_location_lat, check_in_location_lng, check_out_location_lat, check_out_location_lng, check_in_network_ssid, check_out_network_ssid, check_in_photo_url, check_out_photo_url, total_hours, break_hours, overtime_hours, status, notes, approved_by, approved_at, created_at, updated_at, branch_id) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_logs (id, user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at, details, entity_type, entity_id, user_role, "timestamp") FROM stdin;
\.


--
-- Data for Name: auth_users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.auth_users (id, email, username, name, role, is_active, created_at, updated_at, permissions, max_devices_allowed, require_approval, failed_login_attempts, two_factor_enabled, two_factor_secret, last_login) FROM stdin;
287ec561-d5f2-4113-840e-e9335b9d3f69	care@care.com	care@care.com	Mtaasisis kaka	admin	t	2025-10-07 18:05:21.723143+00	2025-10-12 18:02:05.539061+00	{all}	1000	f	0	f	\N	\N
a780f924-8343-46ec-a127-d7477165b0a8	manager@pos.com	manager@pos.com	Manager User	manager	t	2025-10-07 18:05:21.723143+00	2025-10-12 18:02:05.539061+00	{all}	1000	f	0	f	\N	\N
762f6db8-e738-480f-a9d3-9699c440e2d9	tech@pos.com	tech@pos.com	Technician User	technician	t	2025-10-07 18:05:21.723143+00	2025-10-12 18:02:05.539061+00	{all}	1000	f	0	f	\N	\N
4813e4c7-771e-43e9-a8fd-e69db13a3322	care@pos.com	care@pos.com	Diana masika	customer-care	t	2025-10-07 18:05:21.723143+00	2025-10-12 18:03:08.76+00	{all}	1000	f	0	f	\N	\N
\.


--
-- Data for Name: lats_categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_categories (id, name, description, icon, color, is_active, created_at, updated_at, parent_id, sort_order, metadata, branch_id, is_shared) FROM stdin;
e9b739ca-edcf-40e1-b51e-1fad37f7c161	Electronics	Electronic devices and accessories	📱	#3B82F6	t	2025-10-07 16:48:53.789805+00	2025-10-07 16:48:53.789805+00	\N	0	{}	\N	f
cac18409-113c-4bd7-bf89-814d2c8e430c	Computer Parts	Computer components and peripherals	💻	#F59E0B	t	2025-10-07 16:48:53.789805+00	2025-10-07 16:48:53.789805+00	\N	0	{}	\N	f
127b83a2-71e7-4f35-84c5-96e608777a2b	Repair Parts	Parts for device repairs	🔧	#EF4444	t	2025-10-07 16:48:53.789805+00	2025-10-07 16:48:53.789805+00	\N	0	{}	\N	f
00000000-0000-0000-0000-000000000001	Uncategorized	Default category for products without a category	\N	\N	t	2025-10-10 07:59:51.786565+00	2025-10-10 07:59:51.786565+00	\N	0	{}	\N	f
44dc9fad-d33b-4730-9b0c-ef2b9b357f62	LCD Screens	LCD display screens for laptops and devices	\N	\N	t	2025-10-12 05:54:16.634989+00	2025-10-12 05:54:16.634989+00	\N	0	{}	\N	f
0f916e3e-1b92-4940-bab2-2f570e660524	MacBook LCD Screens	MacBook LCD Display Screens and Assemblies	\N	\N	t	2025-10-12 06:10:14.440782+00	2025-10-12 06:10:14.440782+00	\N	0	{}	\N	f
8e413d8b-e20c-4529-9b5c-a703e9175a91	Spare Parts	All spare parts for electronic devices including batteries, screens, keyboards, and more	🔧	#FF6B35	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	\N	0	{"type": "spare_parts", "category": "main"}	\N	f
bc06a796-5f0c-46d3-bbb0-0e8f399cc53e	Tablet	Tablet devices and accessories	tablet	#3B82F6	t	2025-09-07 18:09:51.52721+00	2025-09-07 18:09:51.52721+00	\N	1	{"type": "parent", "device_type": "tablet"}	\N	f
4023b884-fc06-44fc-9aa3-cb76e8d84581	Computers	Computer systems and accessories	monitor	#10B981	t	2025-09-07 18:09:51.52721+00	2025-09-07 18:09:51.52721+00	\N	2	{"type": "parent", "device_type": "computer"}	\N	f
c68ff30b-7ae8-4bf9-af55-856954e60329	Gaming Laptops	High-performance laptops for gaming	gamepad	#EF4444	t	2025-08-26 09:25:14.252528+00	2025-09-07 18:11:31.081608+00	\N	1	{}	\N	f
77202609-edef-465a-a5c3-c0cb20e369f8	Mobile Phones	Smartphones and mobile devices	smartphone	#F59E0B	t	2025-08-26 09:25:14.252528+00	2025-08-26 09:25:14.252528+00	\N	2	{}	\N	f
a9c83a7d-c2cc-4978-b953-9ffc4f182cf8	Audio & Sound	Audio equipment and sound systems	speaker	#EC4899	t	2025-08-26 09:25:14.252528+00	2025-08-26 09:25:14.252528+00	\N	3	{}	\N	f
5b7b1641-dc53-4e28-9fe0-06385b540ea2	Accessories	Various accessories for all devices	cable	#6B7280	t	2025-08-26 09:25:14.252528+00	2025-08-26 09:25:14.252528+00	\N	4	{}	\N	f
0dc20c33-06e9-4cf0-abb7-c2eff2d53a8d	Business Laptops	Professional laptops for business use	briefcase	#8B5CF6	t	2025-08-26 09:25:14.252528+00	2025-09-07 18:11:31.081608+00	\N	2	{}	\N	f
82782857-1cdd-4d1f-86f7-4986e99167e9	Student Laptops	Affordable laptops for students	graduation-cap	#06B6D4	t	2025-08-26 09:25:14.252528+00	2025-09-07 18:11:31.081608+00	\N	3	{}	\N	f
f606b7ec-13b9-4b80-a369-68a6c5d9f58a	TVs	\N	\N	#3B82F6	t	2025-09-12 09:54:32.242596+00	2025-09-12 09:54:32.242596+00	\N	0	{}	\N	f
1aec9f0f-a138-4c9b-a963-a568ce179f77	Batteries	Replacement batteries for all devices	🔋	#FF9500	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "mobile", "tablet", "laptop"], "part_type": "battery"}	\N	f
76d5deb4-9cdd-4724-9274-3bee1a94530c	Screens	LCD screens and displays for all devices	🖥️	#5856D6	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "mobile", "tablet", "laptop"], "part_type": "screen"}	\N	f
0c6bd6d7-13e0-43b3-982f-cd2540be9f83	Keyboards	Replacement keyboards for laptops and computers	⌨️	#FF2D92	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "laptop", "desktop"], "part_type": "keyboard"}	\N	f
38ed2e50-c98a-48a4-b164-3382d012b9b6	Chargers	Power adapters and charging cables	🔌	#AF52DE	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "mobile", "tablet", "laptop"], "part_type": "charger"}	\N	f
dc41d356-bac4-43af-9022-4e2aa1488b90	Charging Ports	USB-C, Lightning, and micro-USB ports	🔌	#AF52DE	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["mobile", "tablet", "laptop"], "part_type": "charging_port"}	\N	f
fab47ad8-ddf1-4f93-86fa-03b7b65e7119	Hinges	Hinge assemblies for laptop lids	🔗	#5AC8FA	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "laptop"], "part_type": "hinge"}	\N	f
79cb156a-5e0e-457a-a835-fbcb5287d94b	Speakers	Internal speakers and audio components	🔊	#FF3B30	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "mobile", "tablet", "laptop"], "part_type": "speaker"}	\N	f
5b27e136-8b6b-47d2-8745-3810a41eec8b	Fans	Cooling fans and thermal components	💨	#8E8E93	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "laptop", "desktop"], "part_type": "fan"}	\N	f
a5c774eb-584a-489f-aac1-37020ebc5acd	Logic Boards	Motherboards and main circuit boards	🔌	#007AFF	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "mobile", "tablet", "laptop", "desktop"], "part_type": "logic_board"}	\N	f
9ed438f7-5ef9-400b-a3bf-c173caea009e	Cameras	Front and rear camera modules	📷	#5AC8FA	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["mobile", "tablet", "laptop"], "part_type": "camera"}	\N	f
1765c6cb-3897-4455-90c5-491ce6ab258b	Buttons	Volume, power, and home buttons	🔘	#FF2D92	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["mobile", "tablet", "laptop"], "part_type": "button"}	\N	f
29d9fd56-8687-475e-9ea4-2e9d57a1aa9d	Housings	Device cases and housing components	📱	#8E8E93	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["mobile", "tablet", "laptop"], "part_type": "housing"}	\N	f
a3e6fed8-7fde-4130-9d77-59ff8d1f2249	Touchpads	Laptop touchpad replacements	🖱️	#FF2D92	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "laptop"], "part_type": "touchpad"}	\N	f
27d5da85-0e4c-40e7-904a-bb4c1890b120	Webcams	Built-in camera modules	📹	#5AC8FA	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "laptop", "desktop"], "part_type": "webcam"}	\N	f
278bea61-cafd-42ab-84f1-22779feef662	WiFi Cards	Wireless network adapters	📡	#007AFF	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "laptop", "desktop"], "part_type": "wifi_card"}	\N	f
444fb118-3f79-41ab-aa1b-826682898ef0	RAM Modules	Memory modules for computers	💾	#5856D6	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "laptop", "desktop"], "part_type": "ram"}	\N	f
adabaaa6-cb26-4c75-94e8-b04628057460	SSD/HDD	Storage drives and components	💿	#8E8E93	t	2025-08-26 13:56:57.244631+00	2025-08-26 13:56:57.244631+00	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	{"devices": ["macbook", "laptop", "desktop"], "part_type": "storage"}	\N	f
ebd7314e-8c11-497c-ab20-7ae7b8c9e145	Android Tablets	Android-based tablet devices	smartphone	#34D399	t	2025-09-07 18:09:51.52721+00	2025-09-07 18:09:51.52721+00	bc06a796-5f0c-46d3-bbb0-0e8f399cc53e	1	{"os": "android", "type": "subcategory", "device_type": "tablet"}	\N	f
b3662a6a-60f6-4214-96b1-0c71e3469c29	iPad	Apple iPad devices	tablet	#F59E0B	t	2025-09-07 18:09:51.52721+00	2025-09-07 18:09:51.52721+00	bc06a796-5f0c-46d3-bbb0-0e8f399cc53e	2	{"os": "ios", "type": "subcategory", "brand": "apple", "device_type": "tablet"}	\N	f
83bac965-e058-4896-b252-6eff77d3402e	Desktop	Desktop computer systems	monitor	#6B7280	t	2025-09-07 18:09:51.52721+00	2025-09-07 18:09:51.52721+00	4023b884-fc06-44fc-9aa3-cb76e8d84581	1	{"type": "subcategory", "device_type": "desktop", "form_factor": "tower"}	\N	f
dfc2db7d-53a5-40ea-8624-f7038a472b4f	Android Phones	Android smartphones from various brands	smartphone	#10B981	t	2025-08-26 09:25:14.252528+00	2025-08-26 09:25:14.252528+00	77202609-edef-465a-a5c3-c0cb20e369f8	1	{}	\N	f
c45894c0-5560-47ce-b869-ebb77b9861f4	iPhones	Apple iPhone smartphones	smartphone	#000000	t	2025-08-26 09:25:14.252528+00	2025-08-26 09:25:14.252528+00	77202609-edef-465a-a5c3-c0cb20e369f8	2	{}	\N	f
2a615c1a-50d5-45fd-855b-82e943ca99fd	Soundbars	Home theater soundbars and audio bars	speaker	#F97316	t	2025-08-26 09:25:14.252528+00	2025-08-26 09:25:14.252528+00	a9c83a7d-c2cc-4978-b953-9ffc4f182cf8	1	{}	\N	f
fa675fbd-d6ac-40f0-a496-3003e8846464	Bluetooth Speakers	Portable Bluetooth speakers	speaker	#8B5CF6	t	2025-08-26 09:25:14.252528+00	2025-08-26 09:25:14.252528+00	a9c83a7d-c2cc-4978-b953-9ffc4f182cf8	2	{}	\N	f
5f94d76d-d058-4754-9491-4dd6ddcd396d	Headphones	Wired and wireless headphones	headphones	#EC4899	t	2025-08-26 09:25:14.252528+00	2025-08-26 09:25:14.252528+00	a9c83a7d-c2cc-4978-b953-9ffc4f182cf8	3	{}	\N	f
d7691592-67c3-49cf-a067-7b1af7bc9289	Phone Accessories	Accessories for mobile phones	smartphone	#F59E0B	t	2025-10-07 16:48:53.789805+00	2025-08-26 09:25:14.252528+00	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	{}	\N	f
9fad083d-82cd-4ba5-93c5-15af0ea40f81	Laptop Accessories	Accessories for laptops and computers	laptop	#10B981	t	2025-08-26 09:25:14.252528+00	2025-08-26 09:25:14.252528+00	5b7b1641-dc53-4e28-9fe0-06385b540ea2	2	{}	\N	f
c2d2d1c7-917d-41c3-9683-df369058f815	Audio Accessories	Accessories for audio equipment	speaker	#EC4899	t	2025-08-26 09:25:14.252528+00	2025-08-26 09:25:14.252528+00	5b7b1641-dc53-4e28-9fe0-06385b540ea2	3	{}	\N	f
bcc368cc-fe03-483a-95c5-b8d93d4711f3	Laptop	Laptop computers	laptop	#8B5CF6	t	2025-09-07 18:09:51.52721+00	2025-09-07 18:09:51.52721+00	4023b884-fc06-44fc-9aa3-cb76e8d84581	2	{"type": "subcategory", "device_type": "laptop", "form_factor": "portable"}	\N	f
e48927cd-b8d8-494a-be4f-50f194b27ada	MacBook	Apple MacBook laptops	laptop	#F59E0B	t	2025-09-07 18:09:51.52721+00	2025-09-07 18:09:51.52721+00	4023b884-fc06-44fc-9aa3-cb76e8d84581	3	{"os": "macos", "type": "subcategory", "brand": "apple", "device_type": "laptop"}	\N	f
1b2032d4-078e-4c14-b902-6ee4e8903bac	Monitors	Computer monitors and displays	monitor	#EF4444	t	2025-09-07 18:09:51.52721+00	2025-09-07 18:09:51.52721+00	4023b884-fc06-44fc-9aa3-cb76e8d84581	4	{"type": "subcategory", "category": "display", "device_type": "monitor"}	\N	f
6c52639b-63cf-4f95-a92d-2cf5ddb09ee8	Computer Accessories	Keyboards, mice, webcams, and other computer accessories	keyboard	#06B6D4	t	2025-09-07 18:09:51.52721+00	2025-09-07 18:09:51.52721+00	4023b884-fc06-44fc-9aa3-cb76e8d84581	5	{"type": "subcategory", "category": "peripheral", "device_type": "accessory"}	\N	f
dbfef89c-7483-40c0-a056-1f8d75f73361	Network Equipment	Routers, switches, modems, and networking devices	wifi	#84CC16	t	2025-09-07 18:09:51.52721+00	2025-09-07 18:09:51.52721+00	4023b884-fc06-44fc-9aa3-cb76e8d84581	6	{"type": "subcategory", "category": "infrastructure", "device_type": "network"}	\N	f
6d67bc49-a8ee-4251-8c9c-bbc452a2d01b	CPU	Central Processing Units and processors	cpu	#10B981	t	2025-09-11 20:35:49.639374+00	2025-09-11 20:36:54.700046+00	4023b884-fc06-44fc-9aa3-cb76e8d84581	1	{}	\N	f
\.


--
-- Data for Name: lats_store_locations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_store_locations (id, name, code, description, address, city, region, country, postal_code, phone, email, manager_name, manager_phone, is_active, is_main_branch, has_repair_service, has_sales_service, has_delivery_service, store_size_sqm, current_staff_count, monthly_target, opening_hours, priority_order, latitude, longitude, timezone, notes, metadata, created_at, updated_at) FROM stdin;
c8bc9caf-b3bd-4dd2-9ed7-be659bcc6faa	Main Branch - Dar es Salaam	DSM-MAIN	\N	\N	Dar es Salaam	Dar es Salaam	Tanzania	\N	\N	\N	\N	\N	t	t	f	t	f	\N	0	0	\N	1	\N	\N	Africa/Dar_es_Salaam	\N	{}	2025-10-10 06:38:16.064583+00	2025-10-10 06:38:16.064583+00
77848437-530c-47e8-99f4-efd929478c4d	Kariakoo Branch	DSM-KRK	\N	\N	Dar es Salaam	Dar es Salaam	Tanzania	\N	\N	\N	\N	\N	t	f	f	t	f	\N	0	0	\N	2	\N	\N	Africa/Dar_es_Salaam	\N	{}	2025-10-10 06:38:16.064583+00	2025-10-10 06:38:16.064583+00
8b8d1a3a-4032-4a9d-bd80-d7562b5fe893	Mwanza Branch	MWZ-01	\N	\N	Mwanza	Mwanza	Tanzania	\N	\N	\N	\N	\N	t	f	f	t	f	\N	0	0	\N	3	\N	\N	Africa/Dar_es_Salaam	\N	{}	2025-10-10 06:38:16.064583+00	2025-10-10 06:38:16.064583+00
\.


--
-- Data for Name: lats_store_rooms; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_store_rooms (id, name, description, location, capacity, is_active, created_at, updated_at, store_location_id, code, floor_level, area_sqm, max_capacity, current_capacity, is_secure, requires_access_card, color_code, notes) FROM stdin;
\.


--
-- Data for Name: lats_store_shelves; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_store_shelves (id, room_id, name, "position", capacity, is_active, created_at, updated_at, store_location_id, storage_room_id, code, description, shelf_type, section, aisle, row_number, column_number, max_capacity, current_capacity, floor_level, zone, is_accessible, requires_ladder, is_refrigerated, priority_order, color_code, barcode, notes, images, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: lats_products; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_products (id, name, description, sku, barcode, category_id, unit_price, cost_price, stock_quantity, min_stock_level, max_stock_level, is_active, image_url, supplier_id, brand, model, warranty_period, created_at, updated_at, specification, condition, selling_price, tags, total_quantity, total_value, storage_room_id, store_shelf_id, attributes, metadata, branch_id, is_shared, visible_to_branches, sharing_mode, shelf_id) FROM stdin;
a764e8ec-961b-4fd3-b54b-4033a88d0fa0	JBL SoundBar 2.1Deep Bass MK2	Play Dolby Atmos	SKU-1760970434733-KDB	\N	a9c83a7d-c2cc-4978-b953-9ffc4f182cf8	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 14:44:13.836942+00	2025-10-20 14:44:16.490449+00	\N	new	0.00	[]	4	4000000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T14:44:08.199Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
4a1e2860-b3ae-410a-ab3c-7e47e67dbe2e	JBL Charger 6	Waterproof	SKU-1760967925773-40O	\N	fa675fbd-d6ac-40f0-a496-3003e8846464	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 13:53:08.357739+00	2025-10-20 13:53:08.964348+00	\N	new	0.00	[]	2	1200000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T13:53:02.846Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
ebe107c4-4a9d-4557-8df1-5abce720a21b	JBL Boom Box3	Water Proof	SKU-1760964118966-LUS	\N	fa675fbd-d6ac-40f0-a496-3003e8846464	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 12:47:05.589585+00	2025-10-20 12:47:06.310826+00	\N	new	0.00	[]	5	6750000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T12:46:59.936Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
dbb3061d-b2e0-4d89-8cce-5711e0b6147d	JBL SoundBar 800MK2	Play Dolby Atmos	SKU-1760969386380-CC0	\N	a9c83a7d-c2cc-4978-b953-9ffc4f182cf8	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 14:15:38.390478+00	2025-10-20 14:15:40.902721+00	\N	new	0.00	[]	2	3900000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T14:15:32.347Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
fa92c384-0728-46cc-9fd9-3bd6f03dc20e	JBL Xtreme 4	Waterproof	SKU-1760968411323-QS9	\N	fa675fbd-d6ac-40f0-a496-3003e8846464	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 13:56:36.791981+00	2025-10-20 13:56:37.407834+00	\N	new	0.00	[]	2	1900000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T13:56:31.290Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
2da54078-7343-4b03-b058-232f124084d7	Onyx Studio9	Water Proof	SKU-1760965957835-RMN	\N	fa675fbd-d6ac-40f0-a496-3003e8846464	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 13:37:23.28264+00	2025-10-20 13:37:23.986041+00	\N	new	0.00	[]	5	4500000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T13:37:18.556Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
5afa8dfc-9ee9-4d9d-a262-e571388f443d	Go+play3	\N	SKU-1760967454449-MXS	\N	fa675fbd-d6ac-40f0-a496-3003e8846464	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 13:41:58.118439+00	2025-10-20 13:41:58.737499+00	\N	new	0.00	[]	2	1900000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T13:41:52.461Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
eebbc373-0958-471f-9e36-142f556fd6ae	JBL Partybox Stage 320	\N	SKU-1760968598008-RGC	\N	fa675fbd-d6ac-40f0-a496-3003e8846464	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 14:03:02.490249+00	2025-10-20 14:03:03.182509+00	\N	new	0.00	[]	2	2900000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T14:02:55.368Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
778fa227-985c-4f1f-a5bf-bee3bb6700e2	JBL SoundBar 500MK2	Play Dolby Atmos	SKU-1760969748314-T8O	\N	a9c83a7d-c2cc-4978-b953-9ffc4f182cf8	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 14:25:14.408067+00	2025-10-20 14:25:16.681529+00	\N	new	0.00	[]	2	3300000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T14:25:08.082Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
80a13505-8be6-4de1-a501-67b59242900a	JBL Partybox On The Go Essential	\N	SKU-1760968983353-MBW	\N	fa675fbd-d6ac-40f0-a496-3003e8846464	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 14:09:35.764582+00	2025-10-20 14:09:39.048067+00	\N	new	0.00	[]	1	1100000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T14:09:31.046Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
fb3de0d7-784b-4e56-9dc7-f1823e3c2f58	JBL Partybox Wireless Mic	20H Play<<12h Charge	SKU-1760971908583-C8A	\N	c2d2d1c7-917d-41c3-9683-df369058f815	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 15:07:43.47442+00	2025-10-20 15:07:54.750794+00	\N	new	0.00	[]	4	1600000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T15:07:36.029Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
c0dcaf18-c2f9-4974-9d16-25e9a90f3265	JBL Charger5	\N	SKU-1760971652658-5H3	\N	fa675fbd-d6ac-40f0-a496-3003e8846464	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 14:51:36.056587+00	2025-10-20 14:51:38.248934+00	\N	new	0.00	[]	3	1200000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T14:51:29.865Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
ebd644ae-3ace-4c8d-a307-dd13edd949c5	iPhone 14 Pro Max	Black,128gb	SKU-1760974004350-GXL	\N	c45894c0-5560-47ce-b869-ebb77b9861f4	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 17:01:24.995141+00	2025-10-20 17:01:25.789023+00	\N	new	0.00	[]	2	3400000.00	\N	\N	{"condition": "refurbished"}	{"createdAt": "2025-10-20T17:01:19.599Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
fb454bc0-e59e-42f2-8e6b-0fd30ae6798d	iPhone 15	Blue	SKU-1760973646591-5T8	\N	c45894c0-5560-47ce-b869-ebb77b9861f4	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 15:26:37.044915+00	2025-10-20 15:26:38.373578+00	\N	new	0.00	[]	1	1500000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T15:26:32.228Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
df755c6e-b679-4fd0-85ab-84848eb4e0b7	Marshall Stanmore II	\N	SKU-1760972891234-887	\N	fa675fbd-d6ac-40f0-a496-3003e8846464	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 15:18:01.253833+00	2025-10-20 15:18:06.843029+00	\N	new	0.00	[]	5	3250000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-20T15:17:55.531Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
ba11e31d-0bd5-42c4-87d3-e4de9ed2d87b	iPhone13 Pro max	128 ,Gold	SKU-1760979693709-8XW	\N	c45894c0-5560-47ce-b869-ebb77b9861f4	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 17:04:22.949787+00	2025-10-20 17:04:23.661787+00	\N	new	0.00	[]	1	1500000.00	\N	\N	{"condition": "refurbished"}	{"createdAt": "2025-10-20T17:04:18.216Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
6ebb35db-e383-4187-90bf-a9def3066d8f	iPhone 12 Pro Max	Silver ,256 gb	SKU-1760979867503-LC8	\N	c45894c0-5560-47ce-b869-ebb77b9861f4	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 17:06:31.043922+00	2025-10-20 17:06:31.870642+00	\N	new	0.00	[]	1	1200000.00	\N	\N	{"condition": "refurbished"}	{"createdAt": "2025-10-20T17:06:24.605Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
d41e251f-e369-4a01-a560-47b19c195f18	iPhone 12 Plain	Blue,128 Gb	SKU-1760980009689-NHD	\N	c45894c0-5560-47ce-b869-ebb77b9861f4	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-20 17:13:00.372641+00	2025-10-20 17:13:02.934175+00	\N	new	0.00	[]	1	880000.00	\N	\N	{"condition": "refurbished"}	{"createdAt": "2025-10-20T17:12:53.953Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
9306ea3e-e713-4e94-828a-810c8933039e	Dell C2422HE	\N	SKU-1761044466034-XWR	\N	1b2032d4-078e-4c14-b902-6ee4e8903bac	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 11:03:04.331543+00	2025-10-21 11:03:05.161288+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T11:03:02.433Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
c327d6ff-ca5d-4dfd-8039-9e70b16c2e7f	Dell U2913WMt	\N	SKU-1761038476832-NYN	\N	1b2032d4-078e-4c14-b902-6ee4e8903bac	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 09:24:03.283518+00	2025-10-21 09:38:10.727808+00	\N	new	0.00	[]	8	5600000.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T09:24:01.208Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
5d2db161-01fd-45c5-9cef-4a469136fda6	iMac	i5,16GB,256 GB,21.5''	SKU-1760980591099-R1P	\N	1b2032d4-078e-4c14-b902-6ee4e8903bac	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 09:21:06.554185+00	2025-10-21 09:21:07.306111+00	\N	new	0.00	[]	5	8400000.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T09:21:04.731Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 2}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
073d2ebf-12d1-478c-acb8-8da8a035b09d	Dell Curved	\N	SKU-1761042095003-Y6I	\N	1b2032d4-078e-4c14-b902-6ee4e8903bac	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 10:22:46.660307+00	2025-10-21 10:22:47.481835+00	\N	new	0.00	[]	4	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T10:22:44.726Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
d0ee9987-67f4-4d13-b38a-59339163320e	Dell U2419H	\N	SKU-1761039557020-KEW	\N	1b2032d4-078e-4c14-b902-6ee4e8903bac	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 09:46:08.950011+00	2025-10-21 09:46:09.584041+00	\N	new	0.00	[]	4	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T09:46:07.098Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
aef8f2f8-8f10-4e67-ba3a-b81e4f2eccb8	HP E233	\N	SKU-1761038651938-0IS	\N	1b2032d4-078e-4c14-b902-6ee4e8903bac	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 09:25:28.966577+00	2025-10-21 09:25:29.525875+00	\N	new	0.00	[]	2	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T09:25:27.159Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
cdeef811-78a2-4394-b9f4-99eddf13a0cc	HP P27qG4	\N	SKU-1761038731111-K9Q	\N	1b2032d4-078e-4c14-b902-6ee4e8903bac	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 09:31:37.162278+00	2025-10-21 09:31:37.755093+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T09:31:35.325Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
fd598405-10cb-4394-a64e-a299375bccb2	iPad air A1474	\N	SKU-1761048375929-2EA	\N	b3662a6a-60f6-4214-96b1-0c71e3469c29	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 12:07:29.953864+00	2025-10-21 12:07:30.563127+00	\N	new	0.00	[]	4	800000.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T12:07:28.072Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
718c1bbc-3b47-4181-bd96-791a66d62b1d	HP No Model	\N	SKU-1761041016910-SL9	\N	1b2032d4-078e-4c14-b902-6ee4e8903bac	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 10:05:26.49571+00	2025-10-21 10:05:27.103466+00	\N	new	0.00	[]	2	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T10:05:24.583Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
e5704ea9-d6b2-4f2d-90c4-50dff67f47b9	Hp HSTND-9581-A	\N	SKU-1761044390186-SNI	\N	1b2032d4-078e-4c14-b902-6ee4e8903bac	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 11:00:58.674239+00	2025-10-21 11:00:59.302085+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T11:00:56.824Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
c1a59a65-e9b6-4292-87a9-5d8b45ef2f54	JBL Go4	\N	SKU-1761048641487-F76	\N	fa675fbd-d6ac-40f0-a496-3003e8846464	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 12:16:19.313279+00	2025-10-21 12:16:20.016916+00	\N	new	0.00	[]	4	480000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-21T12:16:16.969Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
3d8bfb0b-f398-4fd8-a816-0a815177abae	iPad 7 A2197	\N	SKU-1761044607984-K2O	\N	b3662a6a-60f6-4214-96b1-0c71e3469c29	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 12:06:12.875032+00	2025-10-21 12:06:13.55592+00	\N	new	0.00	[]	6	2700000.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T12:06:11.015Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
92fa22c0-5883-408e-a980-cb1cb16226bd	iPad 6 A1893	\N	SKU-1761048547681-N4H	\N	b3662a6a-60f6-4214-96b1-0c71e3469c29	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 12:10:18.101308+00	2025-10-21 12:10:19.01224+00	\N	new	0.00	[]	5	1900000.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T12:10:16.036Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
4b019aa3-5f58-415c-bb2f-48308edad19b	iPad 5 A1822	\N	SKU-1761048451776-8O5	\N	b3662a6a-60f6-4214-96b1-0c71e3469c29	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 12:08:49.312232+00	2025-10-21 12:08:49.935085+00	\N	new	0.00	[]	4	1200000.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T12:08:47.431Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
53984442-a8c3-4aa3-aa4a-7cfeaa0b6c0d	Anker s6 Magnetic Battery	\N	SKU-1761049182385-TOU	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 12:30:27.045429+00	2025-10-21 12:30:27.739305+00	\N	new	0.00	[]	50	4250000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-21T12:30:25.131Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
455a0a4a-acc9-40c9-b349-96fcf1071dda	Zinja PowerBank	\N	SKU-1761049858165-WP5	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 12:37:41.374522+00	2025-10-21 12:37:41.977492+00	\N	new	0.00	[]	9	765000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-21T12:37:39.528Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
1e66e05a-9a71-43de-868a-07d79f31175f	SAQIDO Adapter	\N	SKU-1761050291173-JNE	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 12:40:41.269894+00	2025-10-21 12:40:41.890559+00	\N	new	0.00	[]	41	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-21T12:40:39.410Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
501be9a3-1ac6-4482-a885-5e2196a8fbad	Laptop Bags	\N	SKU-1761050449473-90Y	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 15:53:18.873972+00	2025-10-21 15:53:19.854461+00	\N	new	0.00	[]	17	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-21T15:53:17.070Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
4f186b6f-2e42-47db-9560-d232e17be9fa	Samsung HW-K450	\N	SKU-1761062652428-XFO	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:08:12.857005+00	2025-10-21 16:08:13.685372+00	\N	new	0.00	[]	46	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:08:10.487Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
79649c9c-dd7e-4443-ae29-3c47d680b396	Samsung wireless Real Speaker Kit SWA--9000S	\N	SKU-1761062011341-GF6	\N	a9c83a7d-c2cc-4978-b953-9ffc4f182cf8	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 15:55:39.33954+00	2025-10-21 15:55:40.251356+00	\N	new	0.00	[]	18	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-21T15:55:37.510Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
cc16f987-9295-46dd-bca8-dbd0ce165b13	Samsung HW-Q600C	\N	SKU-1761063146833-MAO	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:15:02.362998+00	2025-10-21 16:15:03.265645+00	\N	new	0.00	[]	9	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:14:59.940Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
30b8e870-034c-43a6-800f-8120658bc00a	Anker Work M650 Wireless Microphone	\N	SKU-1761062189214-WB6	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 15:58:50.621869+00	2025-10-21 15:58:51.544658+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-21T15:58:48.743Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
93af2f8d-18b0-4426-898c-f579dd0a4dab	Surface Go 1825	\N	SKU-1761062338458-5CH	\N	bcc368cc-fe03-483a-95c5-b8d93d4711f3	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:01:42.442816+00	2025-10-21 16:01:43.370485+00	\N	new	0.00	[]	5	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:01:40.593Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
839e06d4-1cf0-445a-ba55-36b4f2e1e3f4	Gaming Controller	\N	SKU-1761062514157-H0B	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:03:33.074031+00	2025-10-21 16:03:33.77954+00	\N	new	0.00	[]	14	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:03:31.250Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
dfffcfd6-87ef-42a8-800e-eb2161b0c852	Samsung HW-S800B	\N	SKU-1761063310457-VG9	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:17:39.504083+00	2025-10-21 16:17:40.34741+00	\N	new	0.00	[]	25	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:17:37.068Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
2e4ebd20-3338-4009-9a02-e2490c4892ba	Samsung  HW-KM45C	\N	SKU-1761063080504-D7C	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:12:23.915753+00	2025-10-21 16:12:24.744859+00	\N	new	0.00	[]	3	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:12:22.096Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
fc913594-5a36-448d-a241-a90d9d7bc223	Samsung-KM 45	\N	SKU-1761062898359-OI7	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:09:47.974974+00	2025-10-21 16:31:02.831206+00	\N	new	0.00	[]	0	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:09:46.167Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
d7b065c4-b152-43f1-95f3-9edde986f928	Samsung No Model	\N	SKU-1761063521007-X4Q	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:22:26.403531+00	2025-10-21 16:22:26.955145+00	\N	new	0.00	[]	4	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:22:24.079Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
5243afdc-7147-4b5f-b126-7e00b30ef984	Samsung HW-B450	\N	SKU-1761063462455-THF	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:18:33.425687+00	2025-10-21 16:18:34.745972+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:18:31.614Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
9e83858e-f195-42b5-b894-d0be4001d273	YAMAHA ATS-2090	\N	SKU-1761064566562-0ET	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:37:07.471534+00	2025-10-21 16:37:08.296486+00	\N	new	0.00	[]	2	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:37:05.666Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
f2e7e1a4-0811-4cb6-b828-5d7c1e0a7f5f	Samsung HW-Q600B	\N	SKU-1761063748572-13X	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:28:48.200041+00	2025-10-21 16:28:49.025982+00	\N	new	0.00	[]	2	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:28:46.066Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
c1f71c70-2900-4aa8-9884-94778f3f20f9	YAMAHA BAR ATS-107	\N	SKU-1761064492397-VPJ	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:36:03.002809+00	2025-10-21 16:36:04.322531+00	\N	new	0.00	[]	4	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:36:00.850Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
f6b23397-e74e-4091-bd27-13514df1c09e	YAMAHA Bar YAS-109	\N	SKU-1761064412637-GTP	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:34:49.565252+00	2025-10-21 16:34:50.39255+00	\N	new	0.00	[]	15	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:34:47.397Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
f92fd45c-1a20-4297-bb1a-58f66fbc7d4e	LG SoundBar SP7R	\N	SKU-1761064632902-8TR	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:39:44.560652+00	2025-10-21 16:39:45.402348+00	\N	new	0.00	[]	7	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:39:41.661Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
05092fd8-ec95-4081-82c8-47c9555dc22b	LG Wireless Soundbar S77S	\N	SKU-1761064804217-FW9	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:41:35.867958+00	2025-10-21 16:41:37.251953+00	\N	new	0.00	[]	2	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:41:34.056Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
24f780f8-0442-4da5-9ac4-9d2698ab034a	Sony SoundBar SA-SC40	\N	SKU-1761064934966-B0N	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:44:43.050265+00	2025-10-21 16:44:43.881664+00	\N	new	0.00	[]	5	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:44:41.222Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
93e47911-09b4-417c-accc-99a07561f5c3	Sony Bar No Model	\N	SKU-1761065257005-ZCL	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:48:30.749522+00	2025-10-21 16:48:32.081744+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:48:28.933Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
be117aac-79c7-4e4e-942c-1bed4ecc9c03	Insignia Bar NS-HSB318	\N	SKU-1761065323720-IU2	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:50:35.301055+00	2025-10-21 16:50:36.153655+00	\N	new	0.00	[]	2	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:50:33.500Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
42de33fe-7923-4caf-9a93-db949e21f331	Samsung Base PS-WB55D	\N	SKU-1761065871842-CT8	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:59:02.582523+00	2025-10-21 16:59:03.54209+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:58:59.959Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
3b101819-71de-42c1-ac94-c3c0d56b8df3	Samsung Base PS-WR67B	\N	SKU-1761065483751-DKC	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:53:00.528043+00	2025-10-21 16:53:01.858794+00	\N	new	0.00	[]	5	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:52:58.174Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
75d17169-7a48-4f1e-a53b-fb636b3e1eeb	Samsung Base PS-WR65BB	\N	SKU-1761065582750-ODP	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:54:12.160902+00	2025-10-21 16:54:12.706724+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:54:10.354Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
f17e862f-87e2-4a7a-96fd-a3bbd227744b	LG BASE SPNSB-W	\N	SKU-1761065961976-UTO	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 17:00:41.20594+00	2025-10-21 17:00:42.113145+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T17:00:38.476Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
8b3e56c4-6bef-4798-8546-ee2b96dd1a6b	Samsung Base PS-WK360	\N	SKU-1761065659317-AV5	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:55:30.409706+00	2025-10-21 16:55:32.257362+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:55:27.809Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
7705f2ea-ce6f-43b1-9b20-3ac0ce5e4a6e	Samsung Base PS-WK450	\N	SKU-1761065734884-J1V	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 16:56:47.821538+00	2025-10-21 16:56:49.045953+00	\N	new	0.00	[]	43	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T16:56:45.202Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
58f235fe-e578-4858-852f-62ef6e44fe9c	Vizio Base M51a-H6	\N	SKU-1761066261723-X8G	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 17:13:36.067535+00	2025-10-21 17:13:37.494323+00	\N	new	0.00	[]	3	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T17:13:33.725Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
5766f9be-c053-41c5-8316-0fb33b62d2cb	Polk Base SIGNA  S2	\N	SKU-1761066051803-DSP	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 17:01:59.636162+00	2025-10-21 17:02:00.856744+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T17:01:57.669Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
921ddc37-66b7-460d-8ef1-e7b66d818b92	Vizio Base V51x-j6	\N	SKU-1761066161738-JEJ	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 17:04:18.291661+00	2025-10-22 08:20:32.886843+00	\N	new	0.00	[]	21	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T17:04:15.600Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
59e5109b-40ad-4852-beab-bbb04ef0c7be	Vizio V51-H6	\N	SKU-1761067213001-6FL	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 17:21:14.80672+00	2025-10-21 17:21:15.416593+00	\N	new	0.00	[]	15	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T17:21:14.263Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
88e4200e-c690-4dca-8d9a-a04ee1c93e87	Vizio Bar M512E-K6	\N	SKU-1761066836228-1X4	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-21 17:19:59.964661+00	2025-10-21 17:20:01.103084+00	\N	new	0.00	[]	3	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-21T17:19:59.449Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
f3257f06-30a6-45a0-a479-e15da34ac150	Vizio Base  P514a-H6	\N	SKU-1761121087457-ZK4	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:16:31.802285+00	2025-10-22 10:16:33.642348+00	\N	new	0.00	[]	2	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-22T10:16:30.734Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
c7e2d9d9-cd45-49fc-a725-835e567d14b0	Adapter Tint Series	Zinja	SKU-1761129030076-R6C	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:32:27.615263+00	2025-10-22 10:32:28.424159+00	\N	new	0.00	[]	27	1350000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-22T10:32:26.567Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
d8f84955-59c0-42f0-ac4c-26412b0db5e2	Vizio Bar V51X-J6	\N	SKU-1761067282480-QL9	\N	2a615c1a-50d5-45fd-855b-82e943ca99fd	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 08:17:56.979016+00	2025-10-22 08:21:29.744632+00	\N	new	0.00	[]	7	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-22T08:17:55.687Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
6b2845fd-e51d-4292-924a-fdc6afff85c0	Professional External Hard drive Enclosure	\N	SKU-1761129156964-DHM	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:34:24.754512+00	2025-10-22 10:34:25.563783+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-22T10:34:23.698Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
0ba4c98e-faa5-43cb-a6cd-be2831348838	NET GEAR/STORAGE CENTRAL SC101	\N	SKU-1761129304928-0DD	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:36:35.632656+00	2025-10-22 10:36:37.364322+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-22T10:36:33.613Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
90d6f0d8-66f0-45a2-bf5b-96f91173d028	Magnetic Wireless Keyboard case For iPad10	\N	SKU-1761129401686-FTX	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:38:18.401723+00	2025-10-22 10:38:19.353749+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-22T10:38:16.351Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
dee27fdc-da6c-4735-9e15-ca2d01e321ec	Lenovo Wired Keyboard	\N	SKU-1761130089895-QGX	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:49:15.233413+00	2025-10-22 10:49:18.093503+00	\N	new	0.00	[]	2	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-22T10:49:13.121Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
2b816859-819d-44fb-a235-16705e62b2df	Kanvas pro 12 For Drawing	\N	SKU-1761129502419-UMS	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:39:11.676586+00	2025-10-22 10:39:12.493791+00	\N	new	0.00	[]	5	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-22T10:39:10.571Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
116881c5-31e6-49e9-9325-48240f679c9f	Woofer Remote	\N	SKU-1761130274636-MQN	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:51:59.383494+00	2025-10-22 10:52:01.215228+00	\N	new	0.00	[]	51	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-22T10:51:57.406Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
055b0361-20d7-47da-8ccb-dad453c51d85	V75 Pro Alluminium Mechanical Board	\N	SKU-1761129555449-9ZB	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:40:30.01402+00	2025-10-22 10:40:30.735601+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-22T10:40:28.947Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
899a951c-6bc7-42e1-b6d5-e511bbb000a1	Dell Wired Keyboard	\N	SKU-1761130161254-3OM	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:50:08.799968+00	2025-10-22 10:50:10.633288+00	\N	new	0.00	[]	9	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-22T10:50:06.814Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
dd7321a3-0fc0-44a5-8245-af6a3d032425	WII AMP/STREAM ELLEGANCE/AMPLIFY BRILLIANCE	\N	SKU-1761129653295-H9P	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:46:33.43478+00	2025-10-22 10:46:35.07576+00	\N	new	0.00	[]	2	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-22T10:46:32.406Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
d3c2b4d2-66c3-471b-b50a-ea98cfef367a	MacBook air A1465	\N	SKU-1761145010278-2GL	\N	bcc368cc-fe03-483a-95c5-b8d93d4711f3	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 14:57:45.220064+00	2025-10-22 14:57:45.946054+00	\N	new	0.00	[]	24	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-22T14:57:43.100Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
6d4ac513-638b-4bbe-bc03-8e429b4133e8	Cocopar Portable Monitor	\N	SKU-1761130011933-171	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:47:42.871705+00	2025-10-22 10:47:43.674719+00	\N	new	0.00	[]	1	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-22T10:47:40.889Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
a5ba9058-295c-49eb-86f1-960813ed2f96	Siltron LED Remote control	\N	SKU-1761130330151-E3J	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:53:09.728717+00	2025-10-22 10:53:10.644629+00	\N	new	0.00	[]	10	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-22T10:53:07.799Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
d3e984cf-2550-4a1b-9ede-0da94be59ece	Vizio Remote	\N	SKU-1761130235705-AUW	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:51:05.721397+00	2025-10-22 10:51:06.541254+00	\N	new	0.00	[]	21	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-22T10:51:03.656Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
64ff5d29-3730-4ed5-9ca1-94d993d19387	Sony Adapter Pin Nene	\N	SKU-1761130451068-1G5	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:54:56.935098+00	2025-10-22 10:54:57.753756+00	\N	new	0.00	[]	39	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-22T10:54:54.962Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
c6d4ec6d-5bf2-4336-8575-e071bb2e997c	Macbook Air 1466	\N	SKU-1761130657441-YVY	\N	bcc368cc-fe03-483a-95c5-b8d93d4711f3	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 14:56:27.425702+00	2025-10-22 14:56:29.043818+00	\N	new	0.00	[]	14	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-22T14:56:26.455Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
ed6a082d-e098-4353-ac67-786f5d0cc220	White Unknown Cable	\N	SKU-1761130397470-GC7	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:54:02.457124+00	2025-10-22 10:54:05.015914+00	\N	new	0.00	[]	9	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-22T10:54:00.523Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
e8fbdd20-b7c1-4995-a71c-f51db70078a9	HP Probook 6455b	\N	SKU-1761130547298-17T	\N	bcc368cc-fe03-483a-95c5-b8d93d4711f3	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 10:56:53.273035+00	2025-10-22 10:56:55.113627+00	\N	new	0.00	[]	10	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-22T10:56:51.327Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
296035fa-67f5-4a4c-96b8-fe1138b3f433	DELL Mini CPU	\N	SKU-1761146272603-OCX	\N	4023b884-fc06-44fc-9aa3-cb76e8d84581	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 15:18:39.117434+00	2025-10-22 15:18:41.16647+00	\N	new	0.00	[]	7	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-22T15:18:37.571Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
8cbd01b7-89b4-4324-96df-993776c6b17a	Belkin Dockin Station	\N	SKU-1761146373136-8QB	\N	4023b884-fc06-44fc-9aa3-cb76e8d84581	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-22 15:20:22.644169+00	2025-10-22 15:20:23.474956+00	\N	new	0.00	[]	4	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-22T15:20:20.703Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
6df82d37-46cc-46b5-b16a-9a6be9ecf6ec	T8 Charger	\N	SKU-1761214820556-JDZ	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-23 10:21:19.323081+00	2025-10-23 10:21:20.015641+00	\N	new	0.00	[]	16	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-23T10:21:18.037Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
e1cda843-4c9e-4c21-9ec2-c1c5c134a02b	Vizio Twitters	2 pair	SKU-1761214900907-ECR	\N	a9c83a7d-c2cc-4978-b953-9ffc4f182cf8	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-23 10:22:24.431994+00	2025-10-23 10:22:26.233749+00	\N	new	0.00	[]	2	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-23T10:22:23.267Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
70886397-6400-42c1-9c95-9d246f08f653	T8 Batteries	\N	SKU-1761215026053-IF8	\N	8e413d8b-e20c-4529-9b5c-a703e9175a91	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-23 10:24:47.389626+00	2025-10-23 10:24:49.031725+00	\N	new	0.00	[]	29	0.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-23T10:24:46.278Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
16547aa7-6112-4a18-b5a9-b66743d0f283	Extension Cables	\N	SKU-1761215091262-UOW	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	0	0	1000	t	\N	\N	\N	\N	\N	2025-10-23 10:26:24.66419+00	2025-10-23 10:26:25.499577+00	\N	new	0.00	[]	4	0.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-23T10:26:22.477Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	isolated	\N
\.


--
-- Data for Name: lats_product_variants; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_product_variants (id, product_id, sku, barcode, quantity, min_quantity, unit_price, cost_price, is_active, created_at, updated_at, name, selling_price, attributes, weight, dimensions, variant_name, variant_attributes, branch_id, stock_per_branch, is_shared, visible_to_branches, sharing_mode, reserved_quantity, reorder_point) FROM stdin;
ec186291-2315-4b5f-8479-4e89712f8eba	a764e8ec-961b-4fd3-b54b-4033a88d0fa0	SKU-1760970434733-KDB-V01	\N	4	1	1000000	544600	t	2025-10-20 14:44:16.490449+00	2025-10-20 14:44:16.490449+00	Variant 1	1000000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
5ba15919-df3a-4158-9aaa-f707eefe8a30	c0dcaf18-c2f9-4974-9d16-25e9a90f3265	SKU-1760971652658-5H3-V01	\N	3	1	400000	282800	t	2025-10-20 14:51:38.248934+00	2025-10-20 14:51:38.248934+00	Variant 1	400000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
70d545b0-9652-4f12-afae-d66fa22a05dc	ebe107c4-4a9d-4557-8df1-5abce720a21b	SKU-1760964118966-LUS-V01	\N	5	2	1350000	741800	t	2025-10-20 12:47:06.310826+00	2025-10-20 12:47:06.310826+00	Variant 1	1350000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
7ed2d51a-9b0c-48db-a1bf-5a7493b417c2	2da54078-7343-4b03-b058-232f124084d7	SKU-1760965957835-RMN-V01	\N	5	2	900000	425000	t	2025-10-20 13:37:23.986041+00	2025-10-20 13:37:23.986041+00	Variant 1	900000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
4c64b248-f522-4acc-8497-f89913a44956	5afa8dfc-9ee9-4d9d-a262-e571388f443d	SKU-1760967454449-MXS-V01	\N	2	1	950000	551000	t	2025-10-20 13:41:58.737499+00	2025-10-20 13:41:58.737499+00	Variant 1	950000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
bfa377d4-27d6-41a7-8a3c-094008d47794	4a1e2860-b3ae-410a-ab3c-7e47e67dbe2e	SKU-1760967925773-40O-V01	\N	2	1	600000	320000	t	2025-10-20 13:53:08.964348+00	2025-10-20 13:53:08.964348+00	Variant 1	600000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
a1eab64f-cae0-4a0a-afe7-e0a67952cab8	fa92c384-0728-46cc-9fd9-3bd6f03dc20e	SKU-1760968411323-QS9-V01	\N	2	1	950000	524200	t	2025-10-20 13:56:37.407834+00	2025-10-20 13:56:37.407834+00	Variant 1	950000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
c0a2e6e1-2f79-4bc3-afad-12c4b36b7be2	eebbc373-0958-471f-9e36-142f556fd6ae	SKU-1760968598008-RGC-V01	\N	2	1	1450000	860800	t	2025-10-20 14:03:03.182509+00	2025-10-20 14:03:03.182509+00	Variant 1	1450000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
b93d037b-ae72-40e7-9bdb-63b2bf31f1a1	80a13505-8be6-4de1-a501-67b59242900a	SKU-1760968983353-MBW-V01	\N	1	1	1100000	667000	t	2025-10-20 14:09:39.048067+00	2025-10-20 14:09:39.048067+00	Variant 1	1100000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
220b9764-c056-4d02-bf1b-878a23834d34	dbb3061d-b2e0-4d89-8cce-5711e0b6147d	SKU-1760969386380-CC0-V01	\N	2	1	1950000	1408200	t	2025-10-20 14:15:40.902721+00	2025-10-20 14:15:40.902721+00	Variant 1	1950000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
ffee366c-6e84-452d-bd60-4783ebf21b56	778fa227-985c-4f1f-a5bf-bee3bb6700e2	SKU-1760969748314-T8O-V01	\N	2	1	1650000	1041000	t	2025-10-20 14:25:16.681529+00	2025-10-20 14:25:16.681529+00	Variant 1	1650000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
c6975b23-520f-4a3f-aed2-233aba5e06f2	fb3de0d7-784b-4e56-9dc7-f1823e3c2f58	SKU-1760971908583-C8A-V01	\N	4	2	400000	248800	t	2025-10-20 15:07:54.750794+00	2025-10-20 15:07:54.750794+00	Variant 1	400000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
858daf4b-2a69-499e-942a-23e3bd5e2104	df755c6e-b679-4fd0-85ab-84848eb4e0b7	SKU-1760972891234-887-V01	\N	5	2	650000	0	t	2025-10-20 15:18:06.843029+00	2025-10-20 15:18:06.843029+00	Variant 1	650000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
02ab4c3f-a0d0-49b5-a6b5-805184f11757	fb454bc0-e59e-42f2-8e6b-0fd30ae6798d	SKU-1760973646591-5T8-V01	\N	1	1	1500000	1185000	t	2025-10-20 15:26:38.373578+00	2025-10-20 15:26:38.373578+00	Variant 1	1500000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
80e43825-ea76-49ac-9057-061eb45da179	ebd644ae-3ace-4c8d-a307-dd13edd949c5	SKU-1760974004350-GXL-V01	\N	2	1	1700000	1433700	t	2025-10-20 17:01:25.789023+00	2025-10-20 17:01:25.789023+00	Variant 1	1700000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
6092ed4a-5a5c-4aa2-ba49-585cfab9733d	ba11e31d-0bd5-42c4-87d3-e4de9ed2d87b	SKU-1760979693709-8XW-V01	\N	1	1	1500000	1115100	t	2025-10-20 17:04:23.661787+00	2025-10-20 17:04:23.661787+00	Variant 1	1500000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
de1cc2b1-d74a-44ca-86c2-b2b1c3311b40	6ebb35db-e383-4187-90bf-a9def3066d8f	SKU-1760979867503-LC8-V01	\N	1	1	1200000	920400	t	2025-10-20 17:06:31.870642+00	2025-10-20 17:06:31.870642+00	Variant 1	1200000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
086627bf-f037-48ab-b7e1-e392f4b96293	d41e251f-e369-4a01-a560-47b19c195f18	SKU-1760980009689-NHD-V01	\N	1	1	880000	548700	t	2025-10-20 17:13:02.934175+00	2025-10-20 17:13:02.934175+00	Variant 1	880000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
c91adcba-faac-49cd-bef1-176a0cd34269	5d2db161-01fd-45c5-9cef-4a469136fda6	SKU-1760980591099-R1P-V01	\N	2	1	1500000	350000	t	2025-10-21 09:21:07.306111+00	2025-10-21 09:21:07.306111+00	Variant 1	1500000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
e4794b35-677d-4700-b0ae-afe8bee1f8ab	5d2db161-01fd-45c5-9cef-4a469136fda6	SKU-1760980591099-R1P-V02	\N	3	1	1800000	350000	t	2025-10-21 09:21:07.306111+00	2025-10-21 09:21:07.306111+00	1TB	1800000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
a38a12b3-ec03-4580-bbde-efb814e9aa69	aef8f2f8-8f10-4e67-ba3a-b81e4f2eccb8	SKU-1761038651938-0IS-V01	\N	2	1	0	0	t	2025-10-21 09:25:29.525875+00	2025-10-21 09:25:29.525875+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
9f7340e2-98f9-4b3e-8769-f537f3918547	cdeef811-78a2-4394-b9f4-99eddf13a0cc	SKU-1761038731111-K9Q-V01	\N	1	1	0	0	t	2025-10-21 09:31:37.755093+00	2025-10-21 09:31:37.755093+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
f08b4bb7-ddf5-4cd1-a6bc-3cda5e265d75	c327d6ff-ca5d-4dfd-8039-9e70b16c2e7f	SKU-1761038476832-NYN-V01	\N	8	2	700000.00	0	t	2025-10-21 09:24:03.862848+00	2025-10-21 09:24:03.862848+00	Variant 1	700000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
95633aed-573a-4804-8974-397bfd504720	d0ee9987-67f4-4d13-b38a-59339163320e	SKU-1761039557020-KEW-V01	\N	4	2	0	0	t	2025-10-21 09:46:09.584041+00	2025-10-21 09:46:09.584041+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
c022728f-b21d-4da8-9051-0663a4c47e28	718c1bbc-3b47-4181-bd96-791a66d62b1d	SKU-1761041016910-SL9-V01	\N	2	1	0	0	t	2025-10-21 10:05:27.103466+00	2025-10-21 10:05:27.103466+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
a5bf483e-96a5-4c3b-bb6c-4fd75d82ee1e	073d2ebf-12d1-478c-acb8-8da8a035b09d	SKU-1761042095003-Y6I-V01	\N	4	2	0	0	t	2025-10-21 10:22:47.481835+00	2025-10-21 10:22:47.481835+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
99d21529-940c-4436-9bc9-db26572ed83d	e5704ea9-d6b2-4f2d-90c4-50dff67f47b9	SKU-1761044390186-SNI-V01	\N	1	2	0	0	t	2025-10-21 11:00:59.302085+00	2025-10-21 11:00:59.302085+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
9a83bfeb-23a7-4f00-aa97-e3e41e3ede82	9306ea3e-e713-4e94-828a-810c8933039e	SKU-1761044466034-XWR-V01	\N	1	1	0	0	t	2025-10-21 11:03:05.161288+00	2025-10-21 11:03:05.161288+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
19c86ffb-3ceb-43f3-8b77-6dee0e3aa87c	3d8bfb0b-f398-4fd8-a816-0a815177abae	SKU-1761044607984-K2O-V01	\N	6	2	450000	0	t	2025-10-21 12:06:13.55592+00	2025-10-21 12:06:13.55592+00	Variant 1	450000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
515bc704-85fe-4849-94cb-e98029567df6	fd598405-10cb-4394-a64e-a299375bccb2	SKU-1761048375929-2EA-V01	\N	4	2	200000	0	t	2025-10-21 12:07:30.563127+00	2025-10-21 12:07:30.563127+00	Variant 1	200000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
3bfc2e04-1ee9-4c0b-a3fd-80a257b24b82	4b019aa3-5f58-415c-bb2f-48308edad19b	SKU-1761048451776-8O5-V01	\N	4	2	300000	0	t	2025-10-21 12:08:49.935085+00	2025-10-21 12:08:49.935085+00	Variant 1	300000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
13c314d4-02c5-4642-b6ad-d25641eaeada	92fa22c0-5883-408e-a980-cb1cb16226bd	SKU-1761048547681-N4H-V01	\N	5	2	380000	0	t	2025-10-21 12:10:19.01224+00	2025-10-21 12:10:19.01224+00	Variant 1	380000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
536a28ae-e5e6-4ed1-99e4-09bfc6aac668	c1a59a65-e9b6-4292-87a9-5d8b45ef2f54	SKU-1761048641487-F76-V01	\N	4	2	120000	0	t	2025-10-21 12:16:20.016916+00	2025-10-21 12:16:20.016916+00	Variant 1	120000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
34db6384-3532-461b-a7ec-9896fd4b8d68	53984442-a8c3-4aa3-aa4a-7cfeaa0b6c0d	SKU-1761049182385-TOU-V01	\N	50	10	85000	0	t	2025-10-21 12:30:27.739305+00	2025-10-21 12:30:27.739305+00	Variant 1	85000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
0553e8c7-c9e3-446f-835b-4eff1132eb49	455a0a4a-acc9-40c9-b349-96fcf1071dda	SKU-1761049858165-WP5-V01	\N	9	2	85000	0	t	2025-10-21 12:37:41.977492+00	2025-10-21 12:37:41.977492+00	Variant 1	85000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
2b87ee00-1072-4f85-95a6-96155aa6acb6	1e66e05a-9a71-43de-868a-07d79f31175f	SKU-1761050291173-JNE-V01	\N	41	10	0	0	t	2025-10-21 12:40:41.890559+00	2025-10-21 12:40:41.890559+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
fabcf37c-b8cf-44a4-b2a3-6055f3091601	501be9a3-1ac6-4482-a885-5e2196a8fbad	SKU-1761050449473-90Y-V01	\N	17	5	0	0	t	2025-10-21 15:53:19.854461+00	2025-10-21 15:53:19.854461+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
7a08d5bd-ce49-4fb1-9f72-9e184602d723	79649c9c-dd7e-4443-ae29-3c47d680b396	SKU-1761062011341-GF6-V01	\N	18	5	0	0	t	2025-10-21 15:55:40.251356+00	2025-10-21 15:55:40.251356+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
83e8b88d-4f48-412c-8b13-e1672be41e8c	30b8e870-034c-43a6-800f-8120658bc00a	SKU-1761062189214-WB6-V01	\N	1	1	0	0	t	2025-10-21 15:58:51.544658+00	2025-10-21 15:58:51.544658+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
089ef234-86e3-402c-afb2-f0b58447d9d4	93af2f8d-18b0-4426-898c-f579dd0a4dab	SKU-1761062338458-5CH-V01	\N	5	2	0	0	t	2025-10-21 16:01:43.370485+00	2025-10-21 16:01:43.370485+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
a6ac6dfe-ec7a-4c9e-9b62-196289f9cb42	839e06d4-1cf0-445a-ba55-36b4f2e1e3f4	SKU-1761062514157-H0B-V01	\N	14	5	0	0	t	2025-10-21 16:03:33.77954+00	2025-10-21 16:03:33.77954+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
618ba2a9-36b0-4f4d-9c67-60e28a7b6e36	5243afdc-7147-4b5f-b126-7e00b30ef984	SKU-1761063462455-THF-V01	\N	1	1	0	0	t	2025-10-21 16:18:34.745972+00	2025-10-21 16:18:34.745972+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
fb1f5bbb-c1cf-4a14-b755-6df0f5aa9dd6	f6b23397-e74e-4091-bd27-13514df1c09e	SKU-1761064412637-GTP-V01	\N	15	5	0	0	t	2025-10-21 16:34:50.39255+00	2025-10-21 16:34:50.39255+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
06fe8878-abd9-4bd8-bb31-c5662d13fd7d	c1f71c70-2900-4aa8-9884-94778f3f20f9	SKU-1761064492397-VPJ-V01	\N	4	2	0	0	t	2025-10-21 16:36:04.322531+00	2025-10-21 16:36:04.322531+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
ca0154cd-06e3-45ad-9096-8fbe98e1869d	9e83858e-f195-42b5-b894-d0be4001d273	SKU-1761064566562-0ET-V01	\N	2	1	0	0	t	2025-10-21 16:37:08.296486+00	2025-10-21 16:37:08.296486+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
a6dbfd40-708b-4f56-a9e1-3e24982d9c7a	f92fd45c-1a20-4297-bb1a-58f66fbc7d4e	SKU-1761064632902-8TR-V01	\N	7	2	0	0	t	2025-10-21 16:39:45.402348+00	2025-10-21 16:39:45.402348+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
76fcbbea-3f4e-4132-99cf-a6b2f1c8d337	93e47911-09b4-417c-accc-99a07561f5c3	SKU-1761065257005-ZCL-V01	\N	1	1	0	0	t	2025-10-21 16:48:32.081744+00	2025-10-21 16:48:32.081744+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
b8cb6017-47ce-41b2-b481-8c6633596133	4f186b6f-2e42-47db-9560-d232e17be9fa	SKU-1761062652428-XFO-V01	\N	46	5	0	0	t	2025-10-21 16:08:13.685372+00	2025-10-21 16:08:13.685372+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
f48d1491-5e90-47fb-93d9-377d60207fb8	2e4ebd20-3338-4009-9a02-e2490c4892ba	SKU-1761063080504-D7C-V01	\N	3	1	0	0	t	2025-10-21 16:12:24.744859+00	2025-10-21 16:12:24.744859+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
5d1007a7-3943-4559-b9b8-f5212e3b7440	cc16f987-9295-46dd-bca8-dbd0ce165b13	SKU-1761063146833-MAO-V01	\N	9	2	0	0	t	2025-10-21 16:15:03.265645+00	2025-10-21 16:15:03.265645+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
cd77b7d3-c3cb-4521-9340-20f97babcfd1	dfffcfd6-87ef-42a8-800e-eb2161b0c852	SKU-1761063310457-VG9-V01	\N	25	5	0	0	t	2025-10-21 16:17:40.34741+00	2025-10-21 16:17:40.34741+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
12564443-3f81-4874-913c-76b0f5944390	d7b065c4-b152-43f1-95f3-9edde986f928	SKU-1761063521007-X4Q-V01	\N	4	2	0	0	t	2025-10-21 16:22:26.955145+00	2025-10-21 16:22:26.955145+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
85e2af1e-fb7d-4db9-a4aa-bde3fb0e8322	f2e7e1a4-0811-4cb6-b828-5d7c1e0a7f5f	SKU-1761063748572-13X-V01	\N	2	1	0	0	t	2025-10-21 16:28:49.025982+00	2025-10-21 16:28:49.025982+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
75197be9-20c8-4e6b-9417-16169a9d0aaa	fc913594-5a36-448d-a241-a90d9d7bc223	SKU-1761062898359-OI7-V01	\N	0	0	0	0	t	2025-10-21 16:09:48.5352+00	2025-10-21 16:09:48.5352+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
1e238d8a-3dad-4c1d-b0b9-ee93e4c65942	05092fd8-ec95-4081-82c8-47c9555dc22b	SKU-1761064804217-FW9-V01	\N	2	1	0	0	t	2025-10-21 16:41:37.251953+00	2025-10-21 16:41:37.251953+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
0c734b98-16d7-4955-9dd9-3b06e524bd3c	24f780f8-0442-4da5-9ac4-9d2698ab034a	SKU-1761064934966-B0N-V01	\N	5	2	0	0	t	2025-10-21 16:44:43.881664+00	2025-10-21 16:44:43.881664+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
cca1b4b0-2c47-41b7-85ec-46ff5f9f308c	be117aac-79c7-4e4e-942c-1bed4ecc9c03	SKU-1761065323720-IU2-V01	\N	2	1	0	0	t	2025-10-21 16:50:36.153655+00	2025-10-21 16:50:36.153655+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
21964c5f-7c3b-49c8-b544-9afa6674ada7	3b101819-71de-42c1-ac94-c3c0d56b8df3	SKU-1761065483751-DKC-V01	\N	5	2	0	0	t	2025-10-21 16:53:01.858794+00	2025-10-21 16:53:01.858794+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
71505893-da99-4143-9fde-a67d64b5894c	75d17169-7a48-4f1e-a53b-fb636b3e1eeb	SKU-1761065582750-ODP-V01	\N	1	1	0	0	t	2025-10-21 16:54:12.706724+00	2025-10-21 16:54:12.706724+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
1e0e8777-7ba0-48bf-8155-c336ad4ca937	8b3e56c4-6bef-4798-8546-ee2b96dd1a6b	SKU-1761065659317-AV5-V01	\N	1	1	0	0	t	2025-10-21 16:55:32.257362+00	2025-10-21 16:55:32.257362+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
c4b0c150-a9ed-4333-a273-17fb029a723b	7705f2ea-ce6f-43b1-9b20-3ac0ce5e4a6e	SKU-1761065734884-J1V-V01	\N	43	5	0	0	t	2025-10-21 16:56:49.045953+00	2025-10-21 16:56:49.045953+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
d1214b1a-925b-4b9b-b309-1785924d1df3	42de33fe-7923-4caf-9a93-db949e21f331	SKU-1761065871842-CT8-V01	\N	1	1	0	0	t	2025-10-21 16:59:03.54209+00	2025-10-21 16:59:03.54209+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
8c70d138-a347-4ef4-a404-0ad0b7e3792c	f17e862f-87e2-4a7a-96fd-a3bbd227744b	SKU-1761065961976-UTO-V01	\N	1	1	0	0	t	2025-10-21 17:00:42.113145+00	2025-10-21 17:00:42.113145+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
7105c012-95d6-4e28-ad8e-22c7f4c8939b	5766f9be-c053-41c5-8316-0fb33b62d2cb	SKU-1761066051803-DSP-V01	\N	1	1	0	0	t	2025-10-21 17:02:00.856744+00	2025-10-21 17:02:00.856744+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
72f36a5e-b977-4c97-ad9c-e193433cd546	58f235fe-e578-4858-852f-62ef6e44fe9c	SKU-1761066261723-X8G-V01	\N	3	1	0	0	t	2025-10-21 17:13:37.494323+00	2025-10-21 17:13:37.494323+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
bd895b04-ced7-49f8-a5ee-778c7b1b89a6	88e4200e-c690-4dca-8d9a-a04ee1c93e87	SKU-1761066836228-1X4-V01	\N	3	1	0	0	t	2025-10-21 17:20:01.103084+00	2025-10-21 17:20:01.103084+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
92bcedb7-f091-4a83-a688-a57cb9b91c6b	59e5109b-40ad-4852-beab-bbb04ef0c7be	SKU-1761067213001-6FL-V01	\N	15	5	0	0	t	2025-10-21 17:21:15.416593+00	2025-10-21 17:21:15.416593+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
b4100d14-60d4-4967-a5f7-fa1a0b46a7ef	921ddc37-66b7-460d-8ef1-e7b66d818b92	SKU-1761066161738-JEJ-V01	\N	21	0	0	0	t	2025-10-21 17:04:19.410758+00	2025-10-21 17:04:19.410758+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
0a8ea551-c0bd-4f86-9cce-5cc2a8ca0a43	d8f84955-59c0-42f0-ac4c-26412b0db5e2	SKU-1761067282480-QL9-V01	\N	7	0	0	0	t	2025-10-22 08:17:57.769098+00	2025-10-22 08:17:57.769098+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
03d16cf0-3b8c-4c1a-b830-05f1671b5967	f3257f06-30a6-45a0-a479-e15da34ac150	SKU-1761121087457-ZK4-V01	\N	2	1	0	0	t	2025-10-22 10:16:33.642348+00	2025-10-22 10:16:33.642348+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
4ade7537-e2af-4f49-bdc2-1c6576a99833	c7e2d9d9-cd45-49fc-a725-835e567d14b0	SKU-1761129030076-R6C-V01	\N	27	5	50000	0	t	2025-10-22 10:32:28.424159+00	2025-10-22 10:32:28.424159+00	Variant 1	50000.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
318d5a65-1d16-4207-99eb-45086176bf73	6b2845fd-e51d-4292-924a-fdc6afff85c0	SKU-1761129156964-DHM-V01	\N	1	1	0	0	t	2025-10-22 10:34:25.563783+00	2025-10-22 10:34:25.563783+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
9c110874-6304-4aaf-8162-bafe56b6a72e	0ba4c98e-faa5-43cb-a6cd-be2831348838	SKU-1761129304928-0DD-V01	\N	1	1	0	0	t	2025-10-22 10:36:37.364322+00	2025-10-22 10:36:37.364322+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
0390c45b-0ade-40fa-b037-a122c6f6dc52	90d6f0d8-66f0-45a2-bf5b-96f91173d028	SKU-1761129401686-FTX-V01	\N	1	1	0	0	t	2025-10-22 10:38:19.353749+00	2025-10-22 10:38:19.353749+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
16d96177-fd20-47e8-87da-db743cf61514	2b816859-819d-44fb-a235-16705e62b2df	SKU-1761129502419-UMS-V01	\N	5	2	0	0	t	2025-10-22 10:39:12.493791+00	2025-10-22 10:39:12.493791+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
3ebc0116-c254-4dfc-9c82-864d890bc046	055b0361-20d7-47da-8ccb-dad453c51d85	SKU-1761129555449-9ZB-V01	\N	1	1	0	0	t	2025-10-22 10:40:30.735601+00	2025-10-22 10:40:30.735601+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
78c3a83a-2693-4e3b-aab5-8fc8dcd9aa74	dd7321a3-0fc0-44a5-8245-af6a3d032425	SKU-1761129653295-H9P-V01	\N	2	1	0	0	t	2025-10-22 10:46:35.07576+00	2025-10-22 10:46:35.07576+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
06eb1b18-b358-452f-aef2-e501d535355d	6d4ac513-638b-4bbe-bc03-8e429b4133e8	SKU-1761130011933-171-V01	\N	1	1	0	0	t	2025-10-22 10:47:43.674719+00	2025-10-22 10:47:43.674719+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
f84ee000-beda-4408-8968-f05782fb9ae7	dee27fdc-da6c-4735-9e15-ca2d01e321ec	SKU-1761130089895-QGX-V01	\N	2	1	0	0	t	2025-10-22 10:49:18.093503+00	2025-10-22 10:49:18.093503+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
50bc8d58-0cc6-4ccc-8d79-335d16b56694	899a951c-6bc7-42e1-b6d5-e511bbb000a1	SKU-1761130161254-3OM-V01	\N	9	2	0	0	t	2025-10-22 10:50:10.633288+00	2025-10-22 10:50:10.633288+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
cd5e0d6b-c5b0-49dc-984b-c0f9707a5081	d3e984cf-2550-4a1b-9ede-0da94be59ece	SKU-1761130235705-AUW-V01	\N	21	2	0	0	t	2025-10-22 10:51:06.541254+00	2025-10-22 10:51:06.541254+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
9ebf0445-50a1-4c4f-9d62-bd409001752e	116881c5-31e6-49e9-9325-48240f679c9f	SKU-1761130274636-MQN-V01	\N	51	5	0	0	t	2025-10-22 10:52:01.215228+00	2025-10-22 10:52:01.215228+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
688de819-8745-45dd-b9e0-38e11eae6d1e	a5ba9058-295c-49eb-86f1-960813ed2f96	SKU-1761130330151-E3J-V01	\N	10	2	0	0	t	2025-10-22 10:53:10.644629+00	2025-10-22 10:53:10.644629+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
d0f45098-8553-4b95-b727-14a81f7ec6a7	ed6a082d-e098-4353-ac67-786f5d0cc220	SKU-1761130397470-GC7-V01	\N	9	2	0	0	t	2025-10-22 10:54:05.015914+00	2025-10-22 10:54:05.015914+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
a115ffb9-2710-4409-bbae-a08ab1656da5	64ff5d29-3730-4ed5-9ca1-94d993d19387	SKU-1761130451068-1G5-V01	\N	39	5	0	0	t	2025-10-22 10:54:57.753756+00	2025-10-22 10:54:57.753756+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
3218ca36-de07-4404-b7b8-75ec5b3c78b9	e8fbdd20-b7c1-4995-a71c-f51db70078a9	SKU-1761130547298-17T-V01	\N	10	5	0	0	t	2025-10-22 10:56:55.113627+00	2025-10-22 10:56:55.113627+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
77e19735-c2e1-4060-92bb-c2eedb8b7f44	c6d4ec6d-5bf2-4336-8575-e071bb2e997c	SKU-1761130657441-YVY-V01	\N	14	2	0	0	t	2025-10-22 14:56:29.043818+00	2025-10-22 14:56:29.043818+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
85d88756-c45b-4272-aff7-6c31d12fbf55	d3c2b4d2-66c3-471b-b50a-ea98cfef367a	SKU-1761145010278-2GL-V01	\N	24	5	0	0	t	2025-10-22 14:57:45.946054+00	2025-10-22 14:57:45.946054+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
69283c64-8f7d-488a-82f4-0ba7441470bb	296035fa-67f5-4a4c-96b8-fe1138b3f433	SKU-1761146272603-OCX-V01	\N	7	3	0	0	t	2025-10-22 15:18:41.16647+00	2025-10-22 15:18:41.16647+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
403b3c94-f542-4e85-bacd-600c5031a3f7	8cbd01b7-89b4-4324-96df-993776c6b17a	SKU-1761146373136-8QB-V01	\N	4	2	0	0	t	2025-10-22 15:20:23.474956+00	2025-10-22 15:20:23.474956+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
8365d3e4-ede6-49db-8970-03b9267086af	6df82d37-46cc-46b5-b16a-9a6be9ecf6ec	SKU-1761214820556-JDZ-V01	\N	16	5	0	0	t	2025-10-23 10:21:20.015641+00	2025-10-23 10:21:20.015641+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
3b5ca38c-5e43-49af-96ee-826a1c196c2b	e1cda843-4c9e-4c21-9ec2-c1c5c134a02b	SKU-1761214900907-ECR-V01	\N	2	1	0	0	t	2025-10-23 10:22:26.233749+00	2025-10-23 10:22:26.233749+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
6e56ecf0-fc24-4aed-855f-089c6bf0b9ed	70886397-6400-42c1-9c95-9d246f08f653	SKU-1761215026053-IF8-V01	\N	29	5	0	0	t	2025-10-23 10:24:49.031725+00	2025-10-23 10:24:49.031725+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
a56f38b8-9e4d-48d1-9806-c7e6cc828249	16547aa7-6112-4a18-b5a9-b66743d0f283	SKU-1761215091262-UOW-V01	\N	4	2	0	0	t	2025-10-23 10:26:25.499577+00	2025-10-23 10:26:25.499577+00	Variant 1	0.00	{"specification": null}	\N	\N	\N	{}	\N	{}	t	\N	isolated	0	0
\.


--
-- Data for Name: lats_suppliers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_suppliers (id, name, contact_person, email, phone, address, city, country, is_active, notes, created_at, updated_at, branch_id, is_shared) FROM stdin;
\.


--
-- Data for Name: lats_purchase_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_purchase_orders (id, po_number, supplier_id, status, total_amount, notes, order_date, expected_delivery_date, received_date, created_by, created_at, updated_at, tax_amount, shipping_cost, discount_amount, final_amount, approved_by, order_number, currency, total_paid, payment_status, expected_delivery, branch_id) FROM stdin;
\.


--
-- Data for Name: auto_reorder_log; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.auto_reorder_log (id, product_id, variant_id, supplier_id, triggered_quantity, reorder_point, suggested_quantity, purchase_order_id, po_created, error_message, created_at) FROM stdin;
\.


--
-- Data for Name: branch_activity_log; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.branch_activity_log (id, branch_id, user_id, action_type, entity_type, entity_id, description, metadata, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: branch_transfers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.branch_transfers (id, from_branch_id, to_branch_id, transfer_type, entity_type, entity_id, quantity, status, requested_by, approved_by, notes, metadata, requested_at, approved_at, completed_at, created_at, updated_at, rejection_reason) FROM stdin;
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.chat_messages (id, conversation_id, sender_id, sender_type, recipient_id, recipient_type, message_text, message_type, is_read, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: communication_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.communication_templates (id, template_name, template_type, subject, body, variables, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: contact_history; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contact_history (id, customer_id, contact_type, contact_method, contact_subject, contact_notes, contacted_by, contacted_at, created_at) FROM stdin;
\.


--
-- Data for Name: contact_methods; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contact_methods (id, customer_id, method_type, contact_value, is_primary, is_verified, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: contact_preferences; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contact_preferences (id, customer_id, preference_type, preference_value, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, password, full_name, role, is_active, created_at, updated_at, username, permissions, max_devices_allowed, require_approval, failed_login_attempts, two_factor_enabled, two_factor_secret, last_login, phone, department) FROM stdin;
a780f924-8343-46ec-a127-d7477165b0a8	manager@pos.com	manager123	Manager User	manager	t	2025-10-07 18:09:29.324848+00	2025-10-09 08:12:42.907611+00	manager@pos.com	{all}	1000	f	0	f	\N	\N	\N	\N
762f6db8-e738-480f-a9d3-9699c440e2d9	tech@pos.com	tech123456	Technician User	technician	t	2025-10-07 18:09:29.324848+00	2025-10-09 08:12:42.907611+00	tech@pos.com	{all}	1000	f	0	f	\N	\N	\N	\N
287ec561-d5f2-4113-840e-e9335b9d3f69	care@care.com	123456	Mtaasisis kaka	admin	t	2025-10-07 18:09:29.324848+00	2025-10-12 17:59:06.818+00	care@care.com	{all}	1000	f	0	f	\N	\N		
4813e4c7-771e-43e9-a8fd-e69db13a3322	care@pos.com	care123456	Diana masika	customer-care	t	2025-10-07 18:09:29.324848+00	2025-10-12 18:03:07.491+00	care@pos.com	{all}	1000	f	0	f	\N	\N		
\.


--
-- Data for Name: customer_checkins; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_checkins (id, customer_id, checkin_date, checkout_date, purpose, notes, created_by, created_at, staff_id) FROM stdin;
\.


--
-- Data for Name: customer_communications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_communications (id, customer_id, type, message, status, phone_number, sent_by, sent_at, created_at) FROM stdin;
\.


--
-- Data for Name: customer_fix_backup; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_fix_backup (backup_id, backup_timestamp, customer_id, customer_name, customer_phone, old_total_spent, new_total_spent, old_points, new_points, old_loyalty_level, new_loyalty_level, sale_number, fix_reason) FROM stdin;
\.


--
-- Data for Name: customer_notes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_notes (id, customer_id, note, created_by, created_at, updated_at) FROM stdin;
ffe1877b-84a0-423a-9170-568fd4827ddb	38047115-adea-4444-91d8-9997af5965da	Welcome! 10 points awarded for new customer registration.	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 16:50:45.605+00	2025-10-23 16:50:46.750161+00
\.


--
-- Data for Name: lats_sales; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_sales (id, sale_number, customer_id, user_id, total_amount, discount_amount, tax_amount, final_amount, payment_status, status, notes, created_at, updated_at, subtotal, tax, sold_by, customer_email, customer_name, customer_phone, discount, branch_id, payment_method) FROM stdin;
\.


--
-- Data for Name: customer_payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_payments (id, customer_id, device_id, amount, method, payment_type, status, reference_number, notes, payment_date, created_by, created_at, updated_at, sale_id, branch_id) FROM stdin;
\.


--
-- Data for Name: customer_points_history; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_points_history (id, customer_id, points_change, reason, transaction_type, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: customer_preferences; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_preferences (id, customer_id, preferred_contact_method, communication_frequency, marketing_opt_in, sms_opt_in, email_opt_in, whatsapp_opt_in, preferred_language, notification_preferences, preferred_branch, preferred_payment_method, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customer_revenue; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_revenue (id, customer_id, revenue_date, revenue_amount, revenue_source, created_at) FROM stdin;
\.


--
-- Data for Name: daily_opening_sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.daily_opening_sessions (id, date, opened_at, opened_by, opened_by_user_id, is_active, notes, created_at) FROM stdin;
33bec981-3273-4816-bfef-390e89f25701	2025-10-20	2025-10-20 12:10:47.122+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-20 12:10:51.852586+00
447fef34-2267-48cc-95a2-8ae4b9fcac8a	2025-10-21	2025-10-21 17:27:08.286+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-21 17:27:09.716009+00
55df7549-45ff-4f27-a26d-3a8d6a206e09	2025-10-23	2025-10-23 16:45:12.231+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-23 16:45:13.24735+00
\.


--
-- Data for Name: daily_sales_closures; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.daily_sales_closures (id, date, total_sales, total_transactions, closed_at, closed_by, closed_by_user_id, sales_data, created_at, updated_at, session_id) FROM stdin;
\.


--
-- Data for Name: device_attachments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.device_attachments (id, device_id, file_name, file_url, file_type, file_size, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: device_checklists; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.device_checklists (id, device_id, checklist_item, is_checked, checked_by, checked_at, created_at) FROM stdin;
\.


--
-- Data for Name: device_ratings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.device_ratings (id, device_id, customer_id, rating, review_text, created_at) FROM stdin;
\.


--
-- Data for Name: device_remarks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.device_remarks (id, device_id, remark, remark_type, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: device_transitions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.device_transitions (id, device_id, from_status, to_status, transitioned_by, transition_notes, transitioned_at, performed_by, created_at, signature) FROM stdin;
\.


--
-- Data for Name: diagnostic_problem_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.diagnostic_problem_templates (id, problem_name, problem_description, suggested_solutions, is_active, created_at, updated_at, checklist_items) FROM stdin;
\.


--
-- Data for Name: diagnostic_checklist_results; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.diagnostic_checklist_results (id, device_id, problem_template_id, checklist_items, overall_status, technician_notes, created_at, updated_at, completed_at) FROM stdin;
\.


--
-- Data for Name: diagnostic_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.diagnostic_templates (id, template_name, device_type, checklist_items, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: diagnostic_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.diagnostic_requests (id, device_id, template_id, requested_by, status, requested_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: diagnostic_checks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.diagnostic_checks (id, request_id, check_name, check_result, is_passed, checked_by, checked_at, created_at, diagnostic_device_id) FROM stdin;
\.


--
-- Data for Name: diagnostic_devices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.diagnostic_devices (id, device_id, diagnostic_data, diagnostic_date, created_at) FROM stdin;
\.


--
-- Data for Name: document_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_templates (id, user_id, type, name, content, is_default, variables, paper_size, orientation, header_html, footer_html, css_styles, logo_url, show_logo, show_business_info, show_customer_info, show_payment_info, show_terms, terms_text, show_signature, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_logs (id, recipient_email, subject, body, status, sent_at, error_message, created_at) FROM stdin;
\.


--
-- Data for Name: shift_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.shift_templates (id, name, description, start_time, end_time, break_duration_minutes, monday, tuesday, wednesday, thursday, friday, saturday, sunday, is_active, created_at, updated_at) FROM stdin;
0362125e-d48b-4044-8e25-656ee93fdd98	Morning Shift	Standard morning shift	08:00:00	17:00:00	60	t	t	t	t	t	f	f	t	2025-10-12 17:42:59.718458+00	2025-10-12 17:42:59.718458+00
ce45e6f7-13ef-4592-ac60-830837516285	Evening Shift	Evening shift	14:00:00	22:00:00	30	t	t	t	t	t	f	f	t	2025-10-12 17:42:59.718458+00	2025-10-12 17:42:59.718458+00
4ddbfe81-4180-4e9a-babf-b9b2af7a37f7	Night Shift	Night shift	22:00:00	06:00:00	45	t	t	t	t	t	f	f	t	2025-10-12 17:42:59.718458+00	2025-10-12 17:42:59.718458+00
\.


--
-- Data for Name: employee_shifts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.employee_shifts (id, employee_id, shift_template_id, shift_date, start_time, end_time, break_duration_minutes, status, notes, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: employees_backup_migration; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.employees_backup_migration (id, user_id, first_name, last_name, email, phone, date_of_birth, gender, "position", department, hire_date, termination_date, employment_type, salary, currency, status, performance_rating, skills, manager_id, location, emergency_contact_name, emergency_contact_phone, address_line1, address_line2, city, state, postal_code, country, photo_url, bio, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.expense_categories (id, name, description, icon, color, is_active, created_at) FROM stdin;
97043984-fdb6-4428-9db6-9159c2bcb7da	Rent	Office or shop rent payments	Building	blue	t	2025-10-13 13:23:26.342549+00
3cbaab8d-d78e-4b3b-9d80-f366ec9c32e8	Utilities	Electricity, water, internet	Lightbulb	yellow	t	2025-10-13 13:23:26.342549+00
e24ed8a2-0ecf-4603-8b07-de235864a03c	Salaries	Employee salaries and wages	User	green	t	2025-10-13 13:23:26.342549+00
f19f3dfc-0032-4def-a476-62356d9e0e03	Supplies	Office and shop supplies	Package	purple	t	2025-10-13 13:23:26.342549+00
00db53a0-972c-4ada-871c-23406d48ba75	Maintenance	Repairs and maintenance	Home	orange	t	2025-10-13 13:23:26.342549+00
9c58065f-b452-4b0c-8318-d55350db41e6	Marketing	Advertising and marketing	FileText	pink	t	2025-10-13 13:23:26.342549+00
412ab057-6e27-422a-87ca-ad8632c8ab1b	Transportation	Fuel, transport costs	Truck	red	t	2025-10-13 13:23:26.342549+00
14dba418-64a2-43a7-8a23-bc166187b4a2	Insurance	Business insurance	Shield	indigo	t	2025-10-13 13:23:26.342549+00
25078b34-66df-4d29-94bb-aba4640adf23	Taxes	Business taxes and fees	Receipt	gray	t	2025-10-13 13:23:26.342549+00
4567e244-5ef0-42ae-bc65-a93c4e99413b	Other	Miscellaneous expenses	FileText	slate	t	2025-10-13 13:23:26.342549+00
\.


--
-- Data for Name: finance_expense_categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.finance_expense_categories (id, category_name, description, is_active, created_at, is_shared) FROM stdin;
0c02320d-2cb3-4ef2-8e20-c3e221a5ca44	Rent	Office or shop rent payments	t	2025-10-13 13:36:38.783932+00	t
358fe788-b824-4c62-980f-7489b5a25e74	Utilities	Electricity, water, internet bills	t	2025-10-13 13:36:38.783932+00	t
550d9455-c500-4a5c-bee7-f3140c8f58e7	Salaries	Employee salaries and wages	t	2025-10-13 13:36:38.783932+00	t
0c3f66a8-70ad-4d0e-aee6-ee513712a841	Office Supplies	Stationery, equipment, consumables	t	2025-10-13 13:36:38.783932+00	t
6549aaac-0f56-492b-b560-63203f0faf4f	Marketing	Advertising, promotions, campaigns	t	2025-10-13 13:36:38.783932+00	t
88eaa3da-8c95-4521-9a7d-d8e603382ede	Transportation	Fuel, vehicle maintenance, transport	t	2025-10-13 13:36:38.783932+00	t
b0f57a3e-a9eb-4b5f-b938-b12295f57eb3	Repairs & Maintenance	Equipment repairs, building maintenance	t	2025-10-13 13:36:38.783932+00	t
c7c1c324-9725-41c7-9b78-1c9a324abffd	Insurance	Business insurance premiums	t	2025-10-13 13:36:38.783932+00	t
1af8d9c4-7665-4cba-b874-306258ae9901	Taxes & Fees	Government taxes, licenses, permits	t	2025-10-13 13:36:38.783932+00	t
dd60e3d7-b8ff-4e13-834a-278e187cb1ec	Bank Charges	Bank fees, transaction charges	t	2025-10-13 13:36:38.783932+00	t
7f2987db-d1aa-473f-98c3-e8a05a4518f4	Inventory Purchase	Stock purchases, supplier payments	t	2025-10-13 13:36:38.783932+00	t
8123fc5c-179a-4acf-8db3-cc582887696a	Software & Subscriptions	Software licenses, SaaS subscriptions	t	2025-10-13 13:36:38.783932+00	t
4551209b-d807-4240-9f0b-526db653fc21	Cleaning & Sanitation	Cleaning supplies, sanitation services	t	2025-10-13 13:36:38.783932+00	t
61a1ff0d-e74c-4b46-9557-e756b732fc53	Security	Security services, guards, systems	t	2025-10-13 13:36:38.783932+00	t
e459564b-e051-424d-91d8-425804c44c58	Professional Services	Legal, accounting, consulting fees	t	2025-10-13 13:36:38.783932+00	t
670526b2-364a-4955-bee6-9cb6a16334a2	Training & Development	Employee training, courses	t	2025-10-13 13:36:38.783932+00	t
db22e028-c49d-44c1-83ff-9a7178a6c19d	Food & Beverages	Office refreshments, client entertainment	t	2025-10-13 13:36:38.783932+00	t
18c31c45-5c43-4558-939c-30c5f9602ed7	Telecommunications	Phone bills, mobile airtime	t	2025-10-13 13:36:38.783932+00	t
e970aaa1-ee0b-4246-b63e-13382191e9b4	Miscellaneous	Other business expenses	t	2025-10-13 13:36:38.783932+00	t
f0c2e01f-0292-4b45-bb1f-c6075982cca3	Purchase Orders	Payments made for purchase orders and supplier invoices	t	2025-10-13 16:29:31.461728+00	t
\.


--
-- Data for Name: finance_expenses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.finance_expenses (id, expense_category_id, account_id, expense_date, amount, description, receipt_number, vendor, payment_method, created_by, approved_by, created_at, updated_at, branch_id, title, status, receipt_url) FROM stdin;
d2f1b70c-77d6-4c7c-9457-f461221ef47e	f0c2e01f-0292-4b45-bb1f-c6075982cca3	5e32c912-7ab7-444a-8ffd-02cb99b56a04	2025-10-13	90000.00	\N	PO-PAY-69540f19	fgd	cash	\N	\N	2025-10-13 17:07:13.598314+00	2025-10-13 17:07:13.598314+00	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Purchase Order Payment: PO-1760373302719	approved	\N
ff4f69ed-8abb-41c7-8839-574a4e02cc8f	f0c2e01f-0292-4b45-bb1f-c6075982cca3	5e32c912-7ab7-444a-8ffd-02cb99b56a04	2025-10-14	2500000.00	Payment for PO-1760429589358 - fgd	PO-PAY-d1fc544f	fgd	Cash	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-14 08:15:00.994542+00	2025-10-14 08:15:00.994542+00	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Purchase Order Payment: PO-1760429589358	approved	\N
c0075dca-5a16-4144-9b23-84ee7223275c	f0c2e01f-0292-4b45-bb1f-c6075982cca3	5e32c912-7ab7-444a-8ffd-02cb99b56a04	2025-10-14	450000.00	Payment for PO-1760371458723 - fgd	PO-PAY-8448ddd1	fgd	Cash	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-14 15:18:46.062911+00	2025-10-14 15:18:46.062911+00	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Purchase Order Payment: PO-1760371458723	approved	\N
4a03f033-4fe9-4313-9cb2-e5f6324f03f5	f0c2e01f-0292-4b45-bb1f-c6075982cca3	5e32c912-7ab7-444a-8ffd-02cb99b56a04	2025-10-19	648.00	Payment for PO-1760879082386 - fgd	PO-PAY-484e6392	fgd	Cash	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-19 13:06:50.652577+00	2025-10-19 13:06:50.652577+00	115e0e51-d0d6-437b-9fda-dfe11241b167	Purchase Order Payment: PO-1760879082386	approved	\N
\.


--
-- Data for Name: finance_transfers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.finance_transfers (id, from_account_id, to_account_id, transfer_date, amount, description, reference_number, created_by, created_at, branch_id) FROM stdin;
\.


--
-- Data for Name: gift_cards; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gift_cards (id, card_number, initial_balance, current_balance, customer_id, status, issued_by, issued_date, expiry_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: gift_card_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gift_card_transactions (id, gift_card_id, transaction_type, amount, balance_after, sale_id, notes, created_at) FROM stdin;
\.


--
-- Data for Name: installment_payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.installment_payments (id, device_id, customer_id, total_amount, paid_amount, remaining_amount, installment_count, installment_amount, next_due_date, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: integrations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.integrations (id, integration_name, integration_type, api_key, api_secret, config, is_active, last_sync, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lats_purchase_order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_purchase_order_items (id, purchase_order_id, product_id, variant_id, quantity_ordered, quantity_received, unit_cost, subtotal, created_at, notes, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_items (id, product_id, variant_id, serial_number, imei, mac_address, barcode, status, location, shelf, bin, purchase_date, warranty_start, warranty_end, cost_price, selling_price, metadata, notes, created_at, updated_at, created_by, updated_by, purchase_order_id, purchase_order_item_id, branch_id, is_shared, visible_to_branches, sharing_mode) FROM stdin;
\.


--
-- Data for Name: lats_inventory_adjustments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_inventory_adjustments (id, product_id, variant_id, quantity, type, reason, notes, reference_id, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: lats_inventory_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_inventory_items (id, purchase_order_id, purchase_order_item_id, product_id, variant_id, serial_number, imei, mac_address, barcode, status, location, shelf, bin, purchase_date, warranty_start, warranty_end, cost_price, selling_price, quality_check_status, quality_check_notes, quality_checked_at, quality_checked_by, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: lats_pos_advanced_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_pos_advanced_settings (id, user_id, business_id, enable_performance_mode, enable_caching, cache_size, enable_lazy_loading, max_concurrent_requests, enable_database_optimization, enable_auto_backup, backup_frequency, enable_data_compression, enable_query_optimization, enable_two_factor_auth, enable_session_timeout, session_timeout_minutes, enable_audit_logging, enable_encryption, enable_api_access, enable_webhooks, enable_third_party_integrations, enable_data_sync, sync_interval, enable_debug_mode, enable_error_reporting, enable_performance_monitoring, enable_logging, log_level, enable_experimental_features, enable_beta_features, enable_custom_scripts, enable_plugin_system, enable_auto_updates, created_at, updated_at) FROM stdin;
530aebb7-0a07-49f7-ab22-5b4fb471ade0	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	t	t	100	t	5	t	f	daily	f	t	f	t	60	f	f	f	f	f	t	300000	f	t	f	t	error	f	f	f	f	f	2025-10-11 16:55:43.022893+00	2025-10-11 16:55:43.022893+00
dacf1caa-747a-426a-a8b2-ab33f911c342	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	t	t	100	t	5	t	f	daily	f	t	f	t	60	f	f	f	f	f	t	300000	f	t	f	t	error	f	f	f	f	f	2025-10-11 16:55:43.033585+00	2025-10-11 16:55:43.033585+00
6211f93a-cf92-4792-ae76-9bfaa2ef3f39	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	t	t	100	t	5	t	f	daily	f	t	f	t	60	f	f	f	f	f	t	300000	f	t	f	t	error	f	f	f	f	f	2025-10-12 10:34:52.728356+00	2025-10-12 10:34:52.728356+00
321a3d1d-5ae0-4aab-a8e0-23fc7c81ba03	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	t	t	100	t	5	t	f	daily	f	t	f	t	60	f	f	f	f	f	t	300000	f	t	f	t	error	f	f	f	f	f	2025-10-12 10:34:53.259488+00	2025-10-12 10:34:53.259488+00
\.


--
-- Data for Name: lats_pos_analytics_reporting_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_pos_analytics_reporting_settings (id, user_id, business_id, enable_analytics, enable_real_time_analytics, analytics_refresh_interval, enable_data_export, enable_sales_analytics, enable_sales_trends, enable_product_performance, enable_customer_analytics, enable_revenue_tracking, enable_inventory_analytics, enable_stock_alerts, enable_low_stock_reports, enable_inventory_turnover, enable_supplier_analytics, enable_automated_reports, report_generation_time, enable_email_reports, enable_pdf_reports, enable_excel_reports, enable_custom_dashboard, enable_kpi_widgets, enable_chart_animations, enable_data_drill_down, enable_comparative_analysis, enable_predictive_analytics, enable_data_retention, data_retention_days, enable_data_backup, enable_api_export, created_at, updated_at) FROM stdin;
8344c0df-0297-44df-be6d-9cd6155747a5	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	t	t	30000	t	t	t	t	t	t	t	t	t	t	f	f	08:00	f	t	t	t	t	t	t	t	f	t	365	t	f	2025-10-11 16:55:43.032441+00	2025-10-11 16:55:43.032441+00
d4c49cc2-5466-4aeb-836e-b65055d4850f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	t	t	30000	t	t	t	t	t	t	t	t	t	t	f	f	08:00	f	t	t	t	t	t	t	t	f	t	365	t	f	2025-10-11 16:55:43.043733+00	2025-10-11 16:55:43.043733+00
4f261529-9581-4b42-acb4-cce11e3830e1	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	t	t	30000	t	t	t	t	t	t	t	t	t	t	f	f	08:00	f	t	t	t	t	t	t	t	f	t	365	t	f	2025-10-12 10:34:52.729051+00	2025-10-12 10:34:52.729051+00
bda9cfcd-2cb1-497d-ba4e-ffdbc72c1cfe	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	t	t	30000	t	t	t	t	t	t	t	t	t	t	f	f	08:00	f	t	t	t	t	t	t	t	f	t	365	t	f	2025-10-12 10:34:53.081764+00	2025-10-12 10:34:53.081764+00
\.


--
-- Data for Name: lats_pos_barcode_scanner_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_pos_barcode_scanner_settings (id, user_id, business_id, enable_barcode_scanner, enable_camera_scanner, enable_keyboard_input, enable_manual_entry, auto_add_to_cart, auto_focus_search, play_sound_on_scan, vibrate_on_scan, show_scan_feedback, show_invalid_barcode_alert, allow_unknown_products, prompt_for_unknown_products, retry_on_error, max_retry_attempts, scanner_device_name, scanner_connection_type, scanner_timeout, support_ean13, support_ean8, support_upc_a, support_upc_e, support_code128, support_code39, support_qr_code, support_data_matrix, enable_continuous_scanning, scan_delay, enable_scan_history, max_scan_history, created_at, updated_at) FROM stdin;
887977eb-1c87-4693-94f3-c08813f1d66d	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	t	f	t	t	t	t	t	f	t	t	f	t	t	3	\N	usb	5000	t	t	t	t	t	t	t	f	f	500	t	50	2025-10-11 16:55:43.024114+00	2025-10-11 16:55:43.024114+00
6ba77548-5975-40ca-89bc-01c2f82dd876	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	t	f	t	t	t	t	t	f	t	t	f	t	t	3	\N	usb	5000	t	t	t	t	t	t	t	f	f	500	t	50	2025-10-11 16:55:43.050862+00	2025-10-11 16:55:43.050862+00
f83d948a-131e-4dae-ac2c-3850354a1123	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	t	f	t	t	t	t	t	f	t	t	f	t	t	3	\N	usb	5000	t	t	t	t	t	t	t	f	f	500	t	50	2025-10-12 10:34:52.728835+00	2025-10-12 10:34:52.728835+00
2ebde987-dd3c-4b2a-8653-43c6c34334b3	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	t	f	t	t	t	t	t	f	t	t	f	t	t	3	\N	usb	5000	t	t	t	t	t	t	t	f	f	500	t	50	2025-10-12 10:34:52.99873+00	2025-10-12 10:34:52.99873+00
\.


--
-- Data for Name: lats_pos_delivery_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_pos_delivery_settings (id, user_id, business_id, enable_delivery, default_delivery_fee, free_delivery_threshold, max_delivery_distance, enable_delivery_areas, delivery_areas, area_delivery_fees, area_delivery_times, enable_delivery_hours, delivery_start_time, delivery_end_time, enable_same_day_delivery, enable_next_day_delivery, delivery_time_slots, notify_customer_on_delivery, notify_driver_on_assignment, enable_sms_notifications, enable_email_notifications, enable_driver_assignment, driver_commission, require_signature, enable_driver_tracking, enable_scheduled_delivery, enable_partial_delivery, require_advance_payment, advance_payment_percent, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lats_pos_dynamic_pricing_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_pos_dynamic_pricing_settings (id, user_id, business_id, enable_dynamic_pricing, enable_loyalty_pricing, enable_bulk_pricing, created_at, updated_at, enable_time_based_pricing, enable_customer_pricing, enable_special_events, loyalty_discount_percent, loyalty_points_threshold, loyalty_max_discount, bulk_discount_enabled, bulk_discount_threshold, bulk_discount_percent, time_based_discount_enabled, time_based_start_time, time_based_end_time, time_based_discount_percent, customer_pricing_enabled, vip_customer_discount, regular_customer_discount, special_events_enabled, special_event_discount_percent) FROM stdin;
17cf124f-b9af-42fe-8b46-0dfad18ee382	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	f	f	f	2025-10-10 20:02:29.340264+00	2025-10-10 20:02:29.340264+00	f	f	f	0.00	100	20.00	f	10	0.00	f	00:00	23:59	0.00	f	10.00	5.00	f	15.00
ea594116-f84f-4a3f-8510-78a7f94ddbdf	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	t	t	t	2025-10-12 10:34:52.4669+00	2025-10-12 10:34:52.4669+00	f	f	f	5.00	1000	20.00	t	10	10.00	f	18:00	22:00	15.00	f	10.00	5.00	f	20.00
\.


--
-- Data for Name: lats_pos_general_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_pos_general_settings (id, user_id, business_id, theme, language, currency, timezone, date_format, time_format, show_product_images, show_stock_levels, show_prices, show_barcodes, products_per_page, auto_complete_search, confirm_delete, show_confirmations, enable_sound_effects, sound_volume, enable_click_sounds, enable_cart_sounds, enable_payment_sounds, enable_delete_sounds, enable_animations, enable_caching, cache_duration, enable_lazy_loading, max_search_results, enable_tax, tax_rate, created_at, updated_at, day_closing_passcode, business_name, business_address, business_phone, business_email, business_website, business_logo, app_logo, logo_size, logo_position, company_name, primary_color, secondary_color, accent_color, tagline, tax_id, registration_number, auto_backup_enabled, auto_backup_frequency, auto_backup_time, auto_backup_type, last_auto_backup, font_size) FROM stdin;
f1e78eb5-8cfb-4973-b8e2-3c01b5bef45b	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	light	en	TZS	Africa/Dar_es_Salaam	DD/MM/YYYY	24	t	t	t	t	20	t	t	t	t	0.50	t	t	t	t	t	t	300	t	50	t	16.00	2025-10-12 10:33:17.01346+00	2025-10-12 10:33:17.01346+00	1234	My Store					data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzkwOCIgaGVpZ2h0PSI2NjY2IiB2aWV3Qm94PSIwIDAgNzkwOCA2NjY2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzE4MTFfNCkiPgo8Y2lyY2xlIGN4PSIzOTU0LjUiIGN5PSIzMzMyLjUiIHI9IjMzNDYuNSIgZmlsbD0iYmxhY2siLz4KPGNpcmNsZSBjeD0iMzk1NC41IiBjeT0iMzMzMi41IiByPSIzMjgzLjUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjUiIHN0cm9rZS13aWR0aD0iMTI2Ii8+CjxyZWN0IHg9IjE4MTQiIHk9IjI1OTkiIHdpZHRoPSI0MjgxIiBoZWlnaHQ9IjE0NjciIGZpbGw9InVybCgjcGF0dGVybjBfMTgxMV80KSIvPgo8L2c+CjxkZWZzPgo8cGF0dGVybiBpZD0icGF0dGVybjBfMTgxMV80IiBwYXR0ZXJuQ29udGVudFVuaXRzPSJvYmplY3RCb3VuZGluZ0JveCIgd2lkdGg9IjEiIGhlaWdodD0iMSI+Cjx1c2UgeGxpbms6aHJlZj0iI2ltYWdlMF8xODExXzQiIHRyYW5zZm9ybT0ic2NhbGUoMC4wMDA1Mjg4NjEgMC4wMDE1NDMzMikiLz4KPC9wYXR0ZXJuPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzE4MTFfNCI+CjxyZWN0IHdpZHRoPSI3OTA4IiBoZWlnaHQ9IjY2NjYiIGZpbGw9IndoaXRlIi8+CjwvY2xpcFBhdGg+CjxpbWFnZSBpZD0iaW1hZ2UwXzE4MTFfNCIgd2lkdGg9IjE5MzkiIGhlaWdodD0iNjQ4IiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiB4bGluazpocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQjVNQUFBS0lDQVlBQUFCZFVOM25BQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBQUFYTlNSMElBcnM0YzZRQUFBQVJuUVUxQkFBQ3hqd3Y4WVFVQUFGL3dTVVJCVkhnQjdOM3JsUnpIbFM3c2pSbWQ4M2M0RmlobEFTRUxXTEJBb0FVcVdFREFBallzQUdFQmloWUFzSUJKQ3dSWm9KUUZnL24vcmNNdkF4VkZGSnJkamI3VUpXUEg4NnhWMCtCbGFVQjBkbVprdkh2dmlBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFDQXRCNzlmOFB3V3lUeHAybDZGQUFBQUFBQUFBQTgySjhDYU41dnYvMzJ6ZnpscXM5dFRaZC8vZWpSb3lrQURteStYdzMxbC92M3FTRnViN3IwNjQvei9lcGpBQUFBQU1BZFhMR3ZIbkczdmZXUDlmUDdyKzJyazVFd0dScFF3NWZIc1ExYy9oemJoOW5qK25XSUk1ai9mNVl2NVFFNHhlZUg0ai9yMXcreGZUQitDS0I3ZXd2di9mdlNuL2QrZlo4aWw3djgveTlmcHZoOHJ5cS8vbmZVZTFYNUtuQUdBQUFBNkVQZFQ5Ly8vRmQ4M3FjYTR2ajdWUGJWU2NXWWExaVFHc2c4cnA5djU4OHFqaFFXSDlEdlljMzgrWFgrVEI2R2tOT2x3cFp2NDhoRkxRZTJ1MCtWenk1b0ZqSURBQUFBTkdodkwzMkk3VDdWc1BmWExTaDdVMU5zZytaUHY3YXZ6bElKaytHTWFqQ3ptai9mUlJ2QjhWMk04VGxnL21DOEI3Umx2ajlkVmRoeWxJck5NOXN0M011OWFyUm9Cd0FBQUZpV3ZRYUhzbysrKy9VUStldzNiWTJoRVlLRkVDYkRDZFZxcVZWc0gzcFBJK2NEN3pwVGJCK0U3Mk1iMkV3QkxNS2xlOU11Uk00WUhOL0didEcrdTFjSmx3RUFBQUJPYU42cldzWG44RGhyY0h4YlpXOXFqTzFlbFhDWnN4QW13NUhWa0dZOWYvNFdmUWMwbC8zK0VKd2ZnR01BSjdNM0JxamNsMWIxMTF4dGlzOEw5dEdDSFFBQUFPQ3c2b1M4VmRoRHY0MXgvdndjR3JZNElXRXlITUdsQUhrVmZFMEpaOTdGTmxoK0Y4REIxWEZBWlNLQ1JmbkRqR0hCRGdBQUFIQnZkZis4N0ZQdEpuamFwN3FmWGNQV3o2YnJjVXpDNU03VmNHR0k5bnhjNHMyeGp0OG9RYzA2UEFEdmF4Y3MvNnhqR1I2bTNwUEtvbndkZlk4RE9wWmRFY3dtR3JiWHFkNjZya2M5MVovMzFrMktOTGhLdys4c2w2VzdUeVc1OTVEWFFmWU5FdDJEOW5ubUpyR0ErN0JyS1lIYUVacHRIOU1vNEFYU2dIVjAwL3g1UFgvZXRYNXZUdktlc2NnTTY3NkV5WjJiZnlndjVpOC9SbnRLUjlpVFdBQVB3YU9hWWx0WjlkTExDZHpPWG9EOFBCUzFuTW9VMjN2VjZ4WVhpZk0xczU2L3ZJbjJQZW0xQ0tsdWN2OHIybGVlOXhjQmx6VDh6bkxaWHpLdGFSUGRlOGpySVBzR2RYMzlTK1N5bUQwVjdtKytOa3NuMzlzNHIvSU85RHhvMm53dGxlZjVFTG44dHpCNUdleWRuODBZMjJhdFRUUm92bTR5NUphYitjLy9XU1R4SHdIY1Mza1F6cCt5cVZVV1hLL0N3L0FZaHRndU52NDEvMW4vVWdNUDRKTGQvYWo4bk1SMm8rc2lCTW1uTk1UMlh2V1ArWHZ3RC9jcUFJQThhckhhRkxrOHJwdjd0TzF2Y1g1L0Q1cFdDMmFHeUdValNENnZ1aysxcXZ0VS94UDJ6czloTlgvZWxHS1IrZk9tRm9MQ3ZRbVQ0WTR1aGNnWEliQTVsVlY4ZmdEKzRBRUkyNWUrdllYNVJWaVlMMEVaRDJheERnQ1F5OCtSeTY1TGpMWTlqZlA3eHBFSHpjdFlFSkR0bnQyTXVrOVZndU95YjE3MnExYkJ1UTN4dVZucmpYczI5eVZNaGxzU0lpL0dNSDkraXM4UHdDR2dJM3RkeUNWQXRqQmZyaUcrWEt3UEFRQkFxMzZLZkpiUTFjbzkxVEJnS2Z0U1N3aTF1YjlWNURMMWV2elJPWld4KzN2VDhoeTd0bHpyK2ZPTENhRGNoekFadmtLSXZHanJFTlRRaVZyZFdjN0QyblVodXhlMVl4M3VWUUFBemFyalVzZklaV1hVZGRPVzFFMnFNS0ZSU1VkY2o4RkpYR3AyS1B0VnE2QVZxL2c4Vlc4ZGNBdkNaTGhCcWFxYXYvd2pCRGRMdHc1QkRVbnRqYkl1SHhYZmJWdUhleFVBUUtzeWprMWRCNjFheFhJTXhxWTJLK09JNjVmQlVaWDlqTDFSMWhkaHo3eGxRd2lWdVNWaE1seWhQaFJMY0ZPcXFvYWdGZXZZQmpXdkJEVzA3bEtJdkFveVdZZDdGUUJBYTk3Tm40K1JpNDdTQmkyMG0zUVZ0R2dWdVh4NDlPalJGQnhGM2FkNkU5c1EyU2pyWEliWWhzcS8yS2ZpT3NKa3VLU090QzdkeUt1Z1ZXVkI0K3dIbWxRWDUyVmhMa1RPejcwS0FLQVJkZFIxdHU1a282N2J0TVJ1VW9VSmpWbG9VY0pEdlE0T2JxL3BxbnpXUVdhck1GR1Bhd2lUb2FvUFJpT3Q4eGppODVpT3h3RUxkNmtUZVFoNk1jVG5lOVVRQUFBczJidklaeDIwWmhYTDg5ajdUSE15anJnZWc0T3BlK1c3VHVSVjBKTjFiSnNmbmdkVXdtU0lUdy9ISDJMYmpTeDB6R2VZUC85UVVjVlNHV2ROTllUcVR3Q0FSWHYwNk5FWVJsMXpSclZZZm9obFdnY3RXVVV1NzQyNFBvd3lzV0p2Y3VjNjZOVXdmMTVwZm1CSG1Felg2c094QkRnL2hXN2s3TlpobkN3THNsZmhLVVJtM3pyY3F3QUFsaXpiR0ZXanJ0dXlqdVg2TG1qQy9EUC9OUEpOUk5zRUQxWkQ1TktKZkJIMnl0a2FZdHY4OEdQUU5XRXkzYXJWbk01Rzdzc1EyM0d5T3Y4NEd4V2UzTUlRN2xVQUFFdjFVK1N6RGxxeDVFNXloUW50eURhUllIcjA2RkhHWXdoT3BrN05FeUp6a3d0ZHluMFRKdE9sdmJIV1E5Q2pkZWo4NHd6SzRqeTI5NTZMc0RqbjY5YXh2VmM1Z2dFQVlDSG13S0tNdVI0akY2T3VHMUEzOElkWXRuWFFncWVSeXhqY1M1MmE5emEyVS9PR2dKc05vVXU1VzhKa3VqUGY3RjVGemtwaTdtYUliZWZmcTRBanE5M0lGdWZjeHhEYmM5OHQxQUVBbHVOOTVMTFNhZFNFRmdKQWhRa0xWMGRjWnl0dXozYjh3RW5zTlZ0bEt5N2crRXFYOGkvV0RuMFJKdE9OdmZPUm53ZDg5dHlJRG82cExzN0xxQ0NMY3g3Q1FoMEFZRGsyOCtkajVMSU9sdTd2c1h4R1hTOWZ4aEhYSDRKYnE5M0laWSs4TkZ2NWVlVytWckdkcHJjS3VpQk1wZ3QxODkzNXlGeG5pRzNuM3pyZ1FDek9PWUpWYkJmcVF3QUFjRFoxMVBYUGtjdDN3V0xWZDRCV2pyOVpCMHVXcmREOVpYQnJlOTNJcTRDSEcySzdUMldhWGdlRXlhUlhGOXhHeS9JMUpleDc0K0hISWN6WFVha1l0empuR0liWW5rOWp5Z1lBd0htOWkxeU11bDYyVmJURHFPdUZTanJpZWd5K1NzTURSMWFtNmIweW1TSTNZVEtwQ1pLNWgvTHdlK3ZoeDMzVWNmcHZZanYyempYRU1iMVMvQUlBY0Q2UEhqMGF3NmhyVHFlRkVkYzdqKzJwTEZhMm9IK2M3OFZUY0NQZHlKeElhWG93VFM4eFlUSnBDWko1Z0ZLcCtROFBQKzVpdmw3S3lMR3lPRjhIbk1hbnlzOEFBT0JjWGtjdUxRV1czYWg3RTZ0b1J3bVNzNDFTYmw0TitOZVJTN2JqQmc1cXIrRkJOektuVXZaR0JjcEpDWk5KU1pETUFRemg0Y2N0N1ZWNURnR245WHkrL3Y2aDhoOEE0Q3graWx6S0dOUlZzRFNyYUk4enVKY25XOEQvOGRHalI1dmdTaG9lT0tNaHRudnFqNE5VaE1ta0kwam1nSWJZZGloNytIR2xXdVg1TnZKdEl0RVdsWjhBQUdjd0J4bGx6UFVZdWF5Q3BXbXhZL3lwZ3RmRnlUYmlPdHU1OVFkVEd4N3NqWE5PUTJ6M3FVeXBTRVNZVENxQ1pJNmd2UHg0K1BFSDlYNVRxanhkR3l5QlFCa0E0RHplUnk1R1hTOUlEV1JYMFo3eSsxYVl2eEQxT3NxMmQySEU5U1cxNGFFY2hXV3NOVXRRcnNHMzh6VnBYWkdFTUprMDZzSklrTXd4ZVBqeGhWcGNZS3cxU3pPRVFCa0E0TlEyOCtkajVHSFU5YkswSEFBcXZGNk9iTitMNmRHalIyUHd1NzBHcStjQnk3S3hwNTZETUpsTXlxalpJZUI0UFB3b0MvUWZZM3UvVWVYSkVnMGhVQVlBT0prNjZqcGJkN0lRY0RsYUhrMXMvMlE1c28yNHpuYlBmWkI2UEY4SmtrMERZS25zcVNjZ1RDYUZPc0pqRlhCOEhuNGRxL2VhaTRCbEcySWJLQ3Q0QUFBNGpVM2s0cDEzT1ZiUnJtOTB1WjlmMGhIWFB3V2YxRDFLa3pwcHdjWXpvVzNDWkpwWHV3U044T0NVUFB3NlU4K2RNUzZJbGd3aFVBWUFPSWs2YmpYVHFHc2g0QUxVNDVWYVg4L3JjaisvYk4rRGNiN25Uc0Z1VDN3VEp1ZlJqcmUxazU0R0NaTnBXcjM1WEFTY25vZGZKK3E0NEhJKzhpcWdMZVVlOVNvQUFEaUYxNUdMRVBEOE1vd20xdVYrZnRtK0J6OEh1eUQ1SXFBdHBmRGhyYVBaMmlSTXBsWGYxQ0R2YmNCNWxJZWZjMG1UcTk5ZjQ0Sm8yYnFPWndjQTRMZzJrWXNROFB3eUJQcTYzTStvN21tc0lwY3hPamQvWDkrRUlKbDJEV0ZQdlVuQ1pGcFZndVRTS1RnRW5JOUFPVEZCTW9rOG42OW5JOW9CQUk2b2psMGRJdzhoNEJuVlAvc3NvMnRYd2Jtc0lwZE56eU91NnhGc0pVaGVCN1J0Q0UyQ3pSRW1BenpNRU52eEhNNG5TYVJPUGxDd1FpYXZiQVlDQUJ6ZCs4akZxT3Z6eWRRWnJzdjlmSXk0VHFMdU81YUdoM1ZBRG85TjBtdUxNQm5nNFp4TG1rZ05rc3NDWFlFQTJUaVhCZ0RndURiejUyUGtJUVE4bjFYa01TaHNQYjJFSTY2blI0OGVqZEdodlNENWNVQXVKdWsxUkpnTWNCamxYTklmZzZZSmtrbXVYTmNtS1FBQUhNa2NkSlFnT1ZOM3NsSFhaMUQveklmSVpSV2MyaXB5R2FORGdtUTY4S3J1eDdKd3dtU0F3N253b3QwdVFUS2RLTmU1d2hjQWdPUFpSQzVHWFo5ZXhvN3c3NEpUeTNZZHZZek9DSkxwaU1hSEJnaVRBUTdMR05rRzFlK1pJSmxlbERGQ05nVUJBSTZnam1GTk5lcmFCdS9KclNLZmxiMlMwMGs0NHZyRGZHK2RvaitDWkhveHpKODN3YUlKa3dFT3E3eGtlL2cxUkpCTXA5N1l6QUVBT0pyWGtVZDVUeEptbkVpZG1EVkVUZ3BhVDJjVnVXUzZwOTdLZkM4b2U0dnV2ZlRrcWZPVGwwMllESEI0cGVMMlZiQjRlMEh5RU5BWGhTOEFBTWZ6TG5MSk9IWjVxZGFSMTkrQ1U4bjJNenRHUitxZTRqcWdQejlxZkZndVlUTEFjVHgzZnZLeTdaMDlNd1QwYWFYcUV3RGc4QjQ5ZXZRaGNvVWZUNDI2UHBuTVp3dXZYRWZIbDNERTlmdWVSbHpQMzc4ZjV5L2UwK21WeG9jRisxTUEyVXhYL0wxdndnamZjeWhqWlA4Nkwzb3puWmVWaVNCNW1hWXIvcDU3MlBHWW9nQUFjQnp2STArZ1U5YmlxOGpYY2Iwb05RVE1QdFoyUFg5K0NvNXBGYmwwYzkrcFFmSkZzRFFmNitleUlUaUdVbmowVzdBNHdtUm9RM2xnVGZPblZEZi9iLzI2KzN1ZkhtaTNEU3hyRldqNURQVnZEZlh6NS9yMWNRaHREbVdZUDJVaCtDSllsRG95eU5renAzSDUvalh0L2IxcDkrL2NwZWlpYnJKOHMvY1o0c3Y3Mk82ZkF3REF1V3hpK3o2WVpWMzZRd2lUaisxcDVGZEdYUXVUanl2VGlPdHAzaXZZUkFmbWZZN3k4MzhSbk1vVW4vZlgveDFmN2xYZGFhKzkyQnZOWEw1K3MvZjEyL3JWZmp2TkV5YkQ4cFFIVlhtWS9UTzJZN0UrSEhLY1MzMFE3aDZPVjZxQjgrUDZLU09XaGhDODNWY1pkMTFHOG96QkloZ1pkRlJUYk85Yi82eS8vbkNNY1ZTMytkOTBId01BNEp6S3UvZThKaDBqVDBENHVLeXhUZDQ2cWg3T0ZGNjVqbzRuNFlqck1UcFF2MjlHK3g1SHVkZU1zUTJNUHgxQmNlUjlxdW02ZjJkdm4ybzM3ZVBiRURMVEVHRXlMTU00ZjM2TjdRTnRqRE9yaS9xeGZqNVZqTzZOV3lvdndydGdodHN4N25vaDV1L0RPbFI2SHRJWTIrQzRkQ2g4V05JMWZzMTliTGR3WDhYMlBtYlJEZ0RBTWIyT1BHRnlXVGVYLzVaTmNIQUpROENidUk2T1p4VzUvQnpKMVovOWNneWJ2WW5EbUdKN3pNVFJndVA3MnR1bktuNmY5REZmQTd0R2lML1ZyMFBBQWdtVDRYekcyQzZLM3JVUU10YUhiL2w4ZXRqVkI5MDZ0Zys2SWJqSkVOdE8ySXZnYk9vQzNmbXdEMVB1VlovdVc3R3c4UGcyTGdYTW44elh4U28rRjhub1hBWUE0R0JLc2ZpODNpeHIwQ3doUVJtZnV3bU9ZUlg5Y0IwZHp3K1J4OVRKbEwrM1lWLzFJWFlUUGt1QS9HNUo0ZkZ0emIvbjh2c3ZuMDM1Njcxd3Vkd3JWd0VMSVV5RzB4cGorM0RidE42bFdoOTBKU0I5WHNPWWRXeURaWlYwVi90aC9uUDZTWGZ5ZWFqMGZKQnl6WmFPaWtWTVRqaTArdDlVUHZ2ZEFCYnNBQUFjU2xsTC94ZzVHSFY5UEpuT3VmMGExOUVSN0UwVXpPSjFKRmVQWVZQVWZuZmwzbEdhSEVxelEzT05EbCt6SHk3WENYdXIyRFpCMkhmbnJQNGpnRlBZeko4bjg4T2dmTklGaWlXTW1UL3IrWmQvbVQvUDRvYnpJVHBXSHZhNllzK24vTmtQd1czdEF1Unl6L3J2K1hQUlEwVndxV0NkUDZYWTUwbTRud0VBY0JqdklvL3lYcnNPRHFxekVkZkZMaHpoc0xLTTFOL0pkTy84Zy9ubnZuU1JYd1IzTWM2ZkYvUG5ML08remJPNkg1MjZLS1g4OTgyZjBuRzlMdnR6ODkvNlBwTC9iTEJjd21RNG52SXdlemwvL252M2dJdms2Z091QkRGQ21LdXRheGMzSjFRclBiTzlWQjNMR0o4WDVzODdHU2wxcGIxZ3VkelAvaHJiaWxlVjh3QUEzRW50TUJvamo3OEZoN2FLL3JpT0RpOVRkL3VpenJvOXRGcEFjaEhjeG01Ly9hOVptN1R1b2diTEpWQzI5ODdKQ1pQaDhIWVB1Yi9VYnI0dUgzQkM1V3RsR1cvV2hCcmVYd1JmTTBiaTZRa1BWVFlBNi9TRkVpcTdwd0ZBL0Y1NFJlTml1eGs1QmNmMlB2SlkxYkdiSEU2UHdlcFQxOUhoSkJ4eC9YTWtWYTk3eDdCOTNSU2ZteDNLL3ZxSDRIZVB2bXlBS05QMWRDdHpkRm5DNUkrL2JjTTdPTGR5NC83cm80NUQ1TXYySG14K1JyZFd1cE5Qbzc1TXZRbHVzb250d3Z6Sm80NjdrRy9yMG1LOWhNcGpBQUMwclJTN0RzR3hiU0xYbEp0MWNCQTFXT3B4a2xiNTczWlc3T0ZrdW9aMjUrRm01UmkybTQyeGJYWW9lMVdhSFc3aDBYYmM5NjViT1cwaEJ1ZlhlcGo4S1VUK3ova0g1ZjlNMDBYQStVeXhmZEI5L3lqeEdKYUhLQUY3ZUtqdDZFNCtqUklrRDhGVk52SDVqSmtwdUxOSG44OVdMcDh4QUFBYU00ZFk2eEFLbmtUZERNL1VWV1ZFOGVIMGZDU1Q0NmdPNTRmSTQxM1dBTEdlazd3T3JqTEc1NGw1WTNCbnRRRmlIZmJmT1pKbXcrUTVSSDY5QzVFZlRaTUtGYzdwWmEyV0dvTWI3VDNVeXBpU25uOXVkU2NmV1QwbmVSVmNOc1oyY1M1RVBwQmFBYm9MbGFjQUFHaEFuZUx6S25KYjJrWnFwbWxkUmwwZnpuZlJyMHhuL0o3Ti9MTllPcnlIeUNObENPYWM1R3ROOCtlWkVQbHdoTW9jUzR0aDhxYUd5TStGeUp6WkZIV2tkWEFuWlV4SmJNOGVuYUpmdXBPUHhBTDlTbE9vOER5cUdpbzdKeDRBYU1YYnlIMWVZNWtpczRrRnFldHdvNjY1ck9mdTNHOFUyaC9FT3ZLWUV1OVpPQ2Y1UytWNVdJcXMvcnEwNTNVV1FtVU9yYVV3ZWZ4Lzg4M2xUOVAwYkE2UnA0RHplaDNiaDEybU1WVW5WUjlvNVdIMk92cTBxcUVuaC9kTHNQTnBjVzU2d3VrNEp4NEFXTG82eFNmeldhVlRiS2RoTFZHbTkxK2pyaDlvL2xrc1FYTHY0WkpSMXcrWDZXZnhmU1JVbjd0RHNETkdiZEJ5SnZMeDdZWEs1VnpsS2VDZVdnaVR4OThpbnN3aDhwUC9PMDJDTzg2dFBPQmV6RGZnNXg1MmgxSCtMS1BmME9WNWNGQVc2RjhZdy9TRXMzRk9QQUN3UkoxTThmbCt3ZS9yWStSaDFQWERDZVNOdW42UWhDT3VmNHBrVE0vN1FuazJmMStuNWszQlNjMS81dTgwUC9BUVN3NlRmdytSLzg4MGpRSG5OOFYyVEd5NmhjMjUxZERsV2ZUbjcxNitEOGNDL1hlN29oZUw4elBicS80MCtob0FPTHY2N3BGOWlzL0xKVThRcTlPQ3hzaERnZlREckFLanJoOW1IWG1NU2Zjd1RNL2JlamQveXRTOGQ4Rlo3VFUvakFGM3NNUXdXWWpNRWsyeERaSjF4eDlKUFIram5LUGNVOGQzMmN6eDhuMDRGdWlmdTVFVnZTeEl2Yjg5Q1YzS0FNQjVaWi9pTXpVeWxTZlRHTmZ2Z251cEFlb1FGS3ZndmpKMXQ2ZDdYelk5NzVPeXovdHNmajR2ZVdwSWQycnpROW1uS3NlQytMNXdLNHNKa3gvTmkzNGhNZ3RWQXVTLzZ2QTd2aHJXbHdkWlR3OHhZNjBPd0FMOWs5ZTZrWmZyVXBleWhUb0FjRkx6ZW5rZHVRdFp5L3JxU2JSaEUzbldnNnM2SVlxN005NzVNMzhXOTVCd3hQVVlpWmllOThsdVQzMFRMRkp0UmluTlhWUEFWNXc5VEg2MHZWQ2YvZWMwL1VXSXpBS1YwUnRQVkU2ZFRvZUI4bU1qblI3R0FuMjdjVmJQSDJmaDlxWXdUQUVBY0FKMXZmeGo1UGF5bGFMS3VyK1FhZXJaT3JpUFZiQXpLRXE0bHg4aWowM0N3dmhYMGJmUzhLQTVxd0cxK2NGWnluelZPY1BrajcvTkYrajhHL2pybjZacEU3QTg3NHpnT0k4YUtMK0lmcWpDZlpqc0cyTTMyVlY1amtFekxOUUJnQlBMUHNWbjArQXhMNW5XZ1VaZDM1RVIxMWRhQjNlMWlqd3lqZi9mVFFONUduM2FqYlhXOE5DWWVsVEk5Nkg1Z1d1Y0kweitGQ0wvWjBUcFJMNTRORTJDT3Bhb0JEVFBnck9wM1h1OUJNcFA1NFhtTjhHZDFRWDZPdnBVemhNeTFycGhkYUh1ZkJvQTRHam05WExwWEZ0SFhsTTBHTXpXWXRCTW82NVh3VjMwR2pMZFJGSENIU1FyU0NqRjF1OGlpVTZtZ1Z4bml1MCsxU1pvVXYxWkxCTkRwNEJMVGhrbUM1RnB4UlJHV3k5Q3JTNS9IZm1WSUhrZDNFZXZDL1F5eG0vdFB0VSs1OU1BQU1mU3lYRXd6WXkzdnNMUGtjY3F1SXUvQlpldEZObmZTYVlKZDJQa1VvcTRodWpQcDJNTDY3UkpHbGJYVldXZktrMlJCNGR4aWpCWmlFeExwaEFrTDBvZGk5TERRc1RMNUIzTkw1clp4L1ZkNTBYdGFDV0p1bEJYK1FrQUhOb3ZzUzFjemVwMTQ5MVBtVFpwSGQxMFMvTjc3T013NHZvNjYrQzJWcEZIbWlhU1dzVFY0M2puTVV6T1M2VmtJK1g0ejNBOEczdU9IU1p2NWhENXIwSmtHbEd1VVErK1pTb1ByK3ozRUZXNGQ5QkpsOFZWbmpWNEhoeTNvUElUQURpa0Rnb3ZwMmo4ZmFDT3VoNGpoOEdvNjF0YkJkZFJaSDhMeVVaY2Ywald5ZHJqOUx5ZjUrK2h4cXlrYWpPTFFKbFBqaFVtbHhENUwzK2FwbWR6aUR3RnRPR0ZJSG1aNnZlbGh6T3MxOEZ0OWJaQTN4VzdiSUswOWlvL000MDhCQUJPckhZK1hrUnVXVGF1MzBjZXErQTJkSEZmVDVIOTdXUzZoakoxSlplejBOZlJsMDlIc0FXcDFVQzVoMzE1dnVMUVlmTDQyN3lnRnlMVG9KZENtbVdidnorbFd5OTd4NTRxM0Z1b1hjbnI2TWN1U0I2REx0U1hNWldmQU1DZDFTRG1iZVRXOGpuSmwyMGlqeCtDRzlWMzJjZkJUZGJCMTZ3aWp6SHllQlY5ZWVrSXRuN1UzS1JNMDlPQjNyRkRoY203RVBuSi81bW1NYUF0azRkZk0wb1ZWT2FIbGlyYzIrbXBLM2tYSlBkd2JqaDdqQklDQU82cGJHWVBrVmVxOS9mYVhUMUdEdDhZZGYxVlQ0T3ZVV1IvZzJRanJ0OW5LUXlhdnkvcjZPc3NkRUZ5aCtyZTVKTVFLSGZyb1dHeUVKbldmUXBxZ2liVUYrMFhrWnVYeXh2VUY2ZDE5T09aSUxsZkFtVUE0QzdxWnZZNjhzcjYvcDVwdmVkOTltYUMwcTk3ck1qK1JwbEdYR2VhUHRoVDA4TnJRWEsvQk1wOXUyK1lMRVFtQytja042YU8xUmdqcisrQ20vUzBRSDlXeDd2VHNmcVNsdVljS1FEZ09PcjQzT3hyNVV6anJYOVhqN1BKc2luclBPQnIxSi9SVmZBMUpVaFdsSEM5VmVRd1pUbHVzTE91NUovbjc5dnpvR3Q3Z1RLZHVWT1kvR2krMGM5Zm5nbVJTV0xqbk9SbVplN1U4OUowamRxVnZJbytPTWVkMzlXWHRaOERBT0I2YnlMM1puWjVmLzhwOHNxeTFqUHErbnFyNExZVUpWd2gyWWpyTWZMb3Blbmh3L3djWGdmRTc0SHlzNkFydHcyVFAvNi9pQmYvT1UxL21ZUGtUVUQ3U3RXdjBhR05xcFhiV1lPVjh2TDlPTGhLTHd0MFo4L3dCL1dsYlF3QWdFdm05NGV5VGw1RlhsUGtmMy9QTkpGSWdmVFZCS1MzWjlUMTFUSmRReW4yOURycVNwN216L2NCZTJvVFRQYmpLTm56dFRENTQyL3pndjAvSS83eWY2Y3Bjd1VvL1hsdHZIWHpMaUt2VmZDRmpycVMzd21TdVVGNWVac0NBS0NxbzNNdklyZVU0NjMzMVlMcE1YSVFtbDVpeFBXZGxTQlprZjBmclNLSHFkN3pNdWloNldHYVAwL3NvM09WT2pWR3cxNG5yZ3VUZncrUi84ODBYVHlhSmdkcWs4a2tyR2xmWGNSazdVNWVCWmYxc2tBM0lvWnJ6ZmU5c2g0cjU5Sk1BUUN3OVV2azlycWo0MTkralJ5TXV2NmpWWEJYaWhMMkpCdHgvVG9TNktncitYdEJNamVwT1l1ajJUcHdPVXdXSXRNRDFUSjVYRVJPM3dXLzY2UXJlWXB0cGFmbkxqZXFMM0hHU3dFQXUvSFdRK1ExUmY2dTYzMlpKZ0lhZGYybHZ3VjM1UnI2VXFad1BjdFkveDZhSGw3V3MzSGhhNTdQSDlkS2NyK0h5WE9JL0ZxSVRBZkdqcXFhMDZ1aFNxYXpwWGFjbS95bEhpcVNYNmowNUxicXk1eHphUUNnWTdYZzhpSnk2NnJZc3Y2M2pwR0RydEtxbnYwckdMMDdIZTVmeW5JTmpSbjJQanJwU241dHNpZTNWZGN3cGZGQnJwaFlDWk0zTlVSK0xrU21BN3FTODBreEh1Y0txMkIzdHRRNmNpdVZuaG1MSWppaWVpNU4xdnNmQUhDRHVrWitFN21sUHlmNUdsbjJMQVNCbjYyQyt4TEN4NmQ3ZnZseitDWnl5RElLTjN2QnpCUjlUUWJoQUV6U3krOC8valJOeitZUWVRckk3LzE4VXh1RFZPcjNkSXg4dmcySzdHT0RQcWowNUFFdXd2bkpBTkNqOU9PdE8xNGpsd2swV1JvOWRDZHZHWEY5ZjY2aHJTelhVTG0zTlY5STM4bFJiSTVoNDE3cVByMW12cVQrSTZBZm1jNGY0a3Z2STU5VmRLNkRydVFwVk96eEFQWGw3a2tZSXdRQTNhaWpOZGVSMTI1OTA2VzZ2c3ZTdWZlMGpuanVuZTdhKzlQaHZwWGxHbnFYSktETVh1VGdHRFllcEJZRWprRTZ3bVI2TWVwS1RtMFQrY0tVd1l0MytrQzkxOUY5SEZDOWhsUjlBa0FIYXJIbHE4ak5HamxCNTE1VjNtY2ZSOGRxRUNwUWY1aXV3M2dqcnBlbGc2YUhUVDFTQ3g3cVdXaDhTRWVZVEMreVZQWnloV1RWMi91RzZGdm1FZGRsZ2I0Sk9JRDZzamNHQUpEZDI4Z2RUTm5Fam5SSE9mVStwdGlZNW9mcmZVeDRsdi8rS1VtVHp6cnlta0toT2dlaThTRW5ZVEk5bUlRMlhjaFN2YjF2RloycUZkeEQ1RFNGQlJXSHArb1RBQktiMThlbDBESnpsK2NVMXNqN2ZvMGNlaDkxdlFvZWF1aDExSFg5MmNuU21aM2xlTHJNQlNJbWczQlFHaC95RVNiVEF5K2tIYWdWanVsR1hVZS9MTkRoRGxSOUFrQmVkYXptUmVSbWpmeWxMQjNhbWNLd08wbGVJSDFxcStoVHBoSFh6ZC9UNXAvcGRlVDltVFk5ajJQUitKQ0lNSmtlakVFdnNvMjYvaTQ2bFB3TW1uY1c2QnlMcWs4QXlLZDJwdjBTdWIyMlJ2NVNQY3BwakJ4NkhmVnN4UFhoOURycU9zdC85NWlrV0NqemRhZ3duYVBRK0pDTE1KbnNOcXFidTVKdDFQVVFmVnBGWGk4Q2pzczFCZ0M1bFBIV1ErUTFSZjZ1Ni90NkhUazg3blRVOVNvNGxNZTE2THdieVVaY045LzRVYSsvckZNV1RBYmhxRFErNUNGTUpydHNuYXJjSU9HbzYyODZmZW4rTVhLeVFPZm81bXZzUStUWmVBU0FydFdSbXM4anR5ZTFDNWMvR2lQSCsyMTNvNjdubjkxeXZ2a1FITkk2K3BMcFoyYU05cTBpcDJsK0JsOEVISi91NUFTRXlXUTIxWENSdnJ5UFhJYm9TT0tYN2lueW5Idkc4bDJFTTJrQW9HbTFDeXBya2VXT1lzc2IxSkE5UzRGOGJ5T2YxOEdoOVhZTVdKYVJ5bGttUnFadGVnZzRnWnJSYVBwclhJb3d1WFR1elovc0wxbmMzUmowYUl4Y0hrZGZmb2ljWHVxNDRGVHF0YVk3R1FEYWxuNjh0VzZvVzhseWxOT3FzNmxidlo3eGUwemRYRVBKUmx3MzMvQ1J1T25oM2Z3YzNnU2NUcG0yWTIrMFljMkh5Zk1OZlRWLytVYzRZNGMvVXUzU3B6Rnk2UzFNWGtVK2t3VTZwMVkzWjZjQUFKb3o3M09VQXN0MTVGVTJFcDhFWDFVN2VUNUVEdXZvUUowcU1BVEhzSTQrWkFtU3kxNUlob0tZckUwUEx3Sk9TT05EKzVvTms4dmliUDc4TXYreWZJYUFMeGx4M2FrNlBtZUtQUDRyT2xHTGc0Ykl4OWdnenNXMUJ3Q05xVUhVUmVUMnduanJPOGx5bEZNdjNicGRuUTk5WXIxY1Exbkd3bytSd3lyeXlUSituUGFVSXdCMUp6ZXF1VEM1anJSK05mL3lYNUgzOEhzZWJneDY5bXZrMFZObmNzWnp0RVpkeVp4THZmYkdBQUJhVWdybU00OXkzVmdmMzlsUGtVTXZZNHBiZXEvZHpKL3ZveDNwcjZGYVVMU0tISnJ2UU5UMEFJZWxPN2x0VFlYSmRkUlRDWkdmQjl3c1MrVXU5ek5HSGoyZEs3V0tmQ3pRT1RlTGRBQm94THpua2Y2YzVMQSt2ck82OFRwR0R1dElyQWFCTFJXRXY2NWppRnZxRWx0SGJxdklvVXlNekRDaVAyUFRnNjVremsxM2NxT2FDSk5MRlZBZGFWMHV0SjZDRmU1dkRIbzJSaDVEZENCcHRlZG8zRDduVmplSHBnQUFGbTFlRDVjQTZpSnlNOTc2L3JJVUNHWWZVN3lLZHV5SGZUOUhPN0pmUTFuQ3l5eUZRNnZJUjFFWFo2VTd1VjJMRHBQclNPczNzUjN6dEFxNG5iSGVsT2hVM2FCSWN3M1U2dWJzTWxaN1dxQ3pGQmJwQUxCZ2RXenIyOGh0MXdISi9ZeVI0eDAzKzVqaWx0NXJ4NzFmdC9TeitUanJOWlJzeFBVWWphdEZYa1Brb2l1WnBkQ2QzS0JGaHNrMVJDN2puY3BJNjNYQTNXUTZMNWY3eXpCT1o2ZUhpUXlyeUdYU2xjeUNiTUlpSFFDVzdGVWtIMjg5cjQwZFYvWUF0V0MrcGU3Um02d2pvUWFEd1AzcnFleWZ0UEsrVVBaSG5rWk9xOGhoVEJKWVpyek9ORDJ3Q01uV05kMVlYSmhjUjUzK0k3YmpuWXkwNWo3R2dJaC9SaDR0bmJsMFowbXJQUzNRV1F3amhBQmd1ZWExOERyeUY5RS9DUTRoUzJkMzFqSEZxMmpIRjhYUDlYM2hmYlRqdThncHk4UzJMQUZSdG50VmxwQ2ZQSDRLbXJLWU1MbFU4TlZ6a2N0bkNMZ24zWUJVbVRxVHMxdEZMdVhGZkJPd0xCYnBBTEF3dFpQeHg4anRwYzNydzZoN0hWTzBMK3VvNjFaSFhPOXNvaDFQczExRGlVWmNmOHl3SDFLL0g5a2FPelE5c0NoMWZUZ0d6VGg3bUh4cHBQVXE0R0hHZ0sxTVlmSVF1V1dyOXRRQnl1TFVib014QUlBbGVSTzUxL29mNWpYSVJYQklXVHIrVW8wOXI4SG1LdHB4MVhYVTJxanJiRUhmS25MSU1rRmhGYms0aW8ybFV1VFFrTE9HeWZOaTY0Zlloc2dYQVllUmFiUXhEek5GSG1sSC9qZjQwbjBiV1Y2ZXlNY2lIUUFXb2hiVnJ5S3ZFa3A5SHh4YWxta3oyY1lVdDNTMjZwV2hVaTArYmFrb1A5dDV0a1pjTDB1MnBnZDdBU3hTZlI2MVVzalV2Yk9FeWVWYzVEclN1aXlDbll2TUlZMEI4ZnVMVUphSDBYOUZYdG1xaVRmRytMRlVGdWtBc0F4MWZPWkY1UGJDdXZqd0VrMmJXZFdmZ3l4YUNwN0dHLzVaUzBGZ2x2QTEwNGpyVE4ydjJmYXF4b0RsTXVHeEVTY05rK3RJNnpMR3FRVEpxNEREbXdJK215S0hJZkxLVmsyY3BRcVh2Q3pTQWVEOGZvbmNOaG5PekZ5d0xPOGM2OGhqRmUxNGY4TS9hMm5LVnRsalhrVU9xOGdoeGIxcHZxNUtrRHhFSHBvZVdMcE4wSVNUaE1tWHprVmVCeHpKL0hETWRFNHVEMmZzK2ZKbEdtL21EQnBhc0FrQTRHenEzc2dRZVUxaG5PYXhsY0F2dzdTWkZPK0M4ODkwS1pCdVplcml4L21kOWRyQXVNSE85eXpGNlZtNnJEZVJ3eXB5MGZUQW90VmloekZZdktPSHliVks3Qit4SGVGa3BEWEhKRWptc2lseUdDS2hlbDV5cHRGQlk4RENXYVFEd1BuVS9aR0x5TzJaRHFqanFvRmZobkJnbGFTenRLVVIxN2ZwUEg0ZjdXZytoRTAwNG5wTWRPL1g5QUNuMTlLenAxdEhDNVBMdzdDZWkxdytROER4L1R2Z1MxT3daTm5Pb05HQlFTdCtEUURncEdwZzhDWnllMm5UK21SYUdrZDhrMVcwcjZYdTJOdHMxbStpSFJsR1hhOGloMHpkcjZ2SVl3eG93eVpZdklPSHlaZEdXcThDVGtkbk1wZGxHUDFWWkozcXNJbzhQdWpBb0NHYkFBQk9MZjE0NjNrOWZCR2NSQTN0cDJoZjA1MmxOY2hzNlgxOS9OcS8wT0NvNjFXMDdZZklJVVdCU3owdk9kTWUzT3VBQmpUNDdPblNRY1BrK1lhN2ptMklmQkZ3ZXNKa0xwc2loNnhoY3FiUlFjNmdvUm0xOEdFS0FPQWs2bDdKT25KN0VweGFobmVRb2ZITzBwYkM4UGQxcy81Vy8yNjBvOW1DaERxeElzUEV0czBkcnEybHl6UkJyeFI1MlN1bkphYm9MZHhCd3VTeThLc2pyY3ZJSnVjaWN5NVpGaTRjam10aTJaeVhET2ZqUEJvQU9JRWFGcnlLM0Y2YTBuTVdQMFVPcTJqWEt0cHhsODdSVGJTajVZS0Vsa2FrM3lSVGNYMm1wZ2Z2L0xRbXl4RWVhVDBvVEs0anJVdUFYSUxrVmNCNXFiYmlDNWsyTk1yOU5oSkpOanBJdFNjdHNrZ0hnTk40RzdtTDdrZmpyYzhqMFVqSUpzZjgxZ0J6aUhhTXQvMFhqYm8rbWFiSHZGZFRIYnVmUmFhbUIrLzhOS1h1cldvTVc3QjdoOGw3NXlLdkE4N3ZZNktSS2h5V2M1T1hhWWc4Vkh2U25QckM3N2tKQUVkVTkwMHliVXhmTnMyZlo4RTVaWGdYK2FiUnp0S1dnc0R4SHNYMkxZMGJiYTZiTk5HSTZ6Rnl5ZkxNemhieTB3L0hDQzdZbmNQa090SjZkeTZ5a2RZc3hSUndOV0hKTXEwaUQ5V2V0RXBIUFFBY1NRMEtMaUkzNDYzUGJ4TTUzbmxiSFBlN2luYmNaM04rRSsxWTFYdHVTN0tNdUg0WlNUUitmdnRsWTBDYjdGTXQySzNENVBKUXJ1Y2lsODhRc0N3Q1E2N2oybGltYnlPSGo2bzlhWml1ZWdBNGducEV6UytSMjJaZUIyK0NzNm9UMmpKMDhUUTE3cmNlMnpSRU84YTRvMW9vTWtZN1dndG5NNHk0L3BDc29DalRKQkh2K3JSS3c4NkNmVFZNcnVjaTcwWmFyd0tXYVFxNG1qQjVtYklzMGxYTTBUTFhMd0FjUjlsREdTS3ZLUkoxb3lXUVllTzF0VkhYNjJqSCtJREFyNlZSMTMrTFJpUWFjZjA2Y2hraUQrLzZOS2tXeVUzQkl0MFlKczhQdDNWc1ErU0xnR1g3MzRDci9UdFlsUHJpbE9XWUJOV2VOTXU1eVFCd2VIVWY1WG5rOXN4NDYrVkl0S1pycWJPMHBUTjZIOUs1UGtZN1ZuVXFSQXV5UENQR3lDWExCTDFzSGVQMHA2VkNwcTVjR1NiWGM1SExTS1kzNFZ4azJtQXpITm94UkI2cVBXbWRheGdBRHFRV1RmNFl1YjEwek1zaVplZ1FiR0xzYjROZHBXUGNVLzFabjZJZDYyaERNMTNVTjNpZk1MRE1Na0ZQRUVmcjdGTXQxQmRoY2gxcC9TcTJaL3VzQXRveEJkQ0tMQXQwNXlXVHdUOERBRGlVOU9PdDUvWHZSYkJFUDBYN1dobDEzVklIOVNFNkZGczZrM3Z4SVcyRDUyMWZaeE9KMUs3MkxBMTFZMERieG1DUmZnK1Q5ODVGemo2T0NlaUxydlhsR1NJSGxYSms0RG9HZ0FPWTkxUitpTGJPVWIyUEo4RWkxVE1HeDJoZkMwRnRTMTJsaHdpQ3gyaEhDNk91MTlHK1VsaVU0YXoyZlZtYUhncnYrRFJ0dnIrVWE5aCsvZ0w5UngxcHZUc1gyVWhyV2pVRlhNM0RaM215bkVPam81TU14Z0FBSHFTT3ZiMkkzRjQ2ZzNIeDNrZjcvcjdrTUxEK3JLK2lIUThPL0JvOGszdnBCUWtaUmx5UGtjOFFPVXllMVNReEJZdFRPcFBMU09zaEFPQTBoc2hoREdoY2ZkRlVkQU1BRDFQMlZUSVg1NC9HV3pkaEUrMnY2OHJQMFpJN0JGZlJqZzhIREpWYUduVzkyTE8zRTQyNHpuQkcrMlZENUtEcGdTeGN5d3YwSHdFQXB6VkVEbE5BRGxNQUFQZFNqd3diSXE5cC9qd0xGcStPdWs3Um5Sekx0ZVRmMjJXL3h1RzBOTkw0OFlLNzI5ZlJ2cW1Pb00wbXl3UTlJNjdKd3JXOFFNSmtzcGdDV0x4YWladkJ4NlF2VVBSSnhTY0EzRU5kMjE1RWJzWmJ0MlVUN1h1NnhEQ3d3UkhYbXppUXhrWmRsMnRuRmN1VVljVDF5OGdweTNTUk1TQ0hLVmdjWVRJQXA1UmxnUzVJSnBNcEFJQTdxV0hYMjhodE00ZEltNkFaRFo1dmU1V2xqcnBlUlR1TzBUM2EwcWpyeFlXMjh6TmpGVG1tV0l5UjB4QTVPTUtLTE95N0xwQXdHWUJUR2lJSG5aeGtNZ1VBY0Zldkl2OTQ2NndkYU5sbE9NLzB4MWllbHJwS2p6SHV2S1ZSMTB2c2JtOXBSUHAxeHNTVEtvWm9ud2w2cEdFcXpqSUprd0U0cFNGeW1BTHk4TUlKQUhjd2h4VHJ5SEgyNVUyZTJjaHIxaWJhdDZoemIrdnY1V20wNCtEQmI0T2pycGZXM2I2SzlyWFVuWDVyZFlSOUJsTkFMbE93S01Ka0FFN0ptR3RZSHFPd0FPQ1c2cWJ6RXJzbUQrbGxEWTVvVUMwQ0dLTnRTd3R2V3dxU3B5UCsvQjZqNC9sWUZ2TTlTekxpK21QaVl3K0d5T0hmQWJsTXdhSUlrd0U0cFQ5SERzSTMwdEIxQkFCMzhpYVNqN2VlMXdZWFFldGFDdjJ1czZTeHdOOUZPOFk0bmsyMFkwblhUNFlSMXkyTk9iOHJUUSt3VEFva0ZrYVlETUFwWlZta1R3RzVUQUVBM09pMzMzNHJIY21yeU8xSmtNRW0yaStBWGRLbzY1WTZrNDg1aXJpRVZjMk11cTRkd1V1d2l2YWxISEZkWmRtbjB2UkFOcTdwaFJFbUEzQktHUmJwWmJ5VEJRM1p1S1lCNEFaMXZQVkY1UGJTeEpJYzZ2dEs2OTNKNWQxeEhXYzIvK3cvalhiZVk0ODU0bnAzWGJYVS9YajJJb0FrSTY2bjVFY2ZESkdEem1TeW1ZSkZFU1lEY0VvWnd1UXBJQjloTWdEYzdKZkliVFRlT3AxTnRPOXZjWDVMK0QzYzFoakgxMUtINmhMR1MyY1ljWjI1S3prVDcvUms0NXBlR0dFeUFLYzBSUHNzWnNqSVdUUUFjSTA2M25xSXZLYjU4eXhJcFhZU3R2N3VzbHJBcU90VnRPTVUzZWpsN0Z5anJtOXZGZTNiUkc1RDVHQ3ZpbXhjMHdzalRBYUF1L25mQUFDZ0N6V0l1SWpjakxmTzYzVzBieDFuMHRpSTRuSWMwN3M0c2daSFhhL2lUSktNdUI0OUg5cmcrMFJDd3VTRkVTWURjQklMcUNnL2xQOEp5R2NLQU9BTDlaemtONUhiWnQ2QTNnUlpIVDFjUElGempwbHVhVVR4S2IvWExaM0hmYzd2b1JIWGJmaHp0RS9vUmtaVHNDakNaQUJPSlV1WWJCd3dBRUFmZWhodi9USkk2OUdqUjZXRGRJeTJuWFBVOVNyYWNjcUFkeFB0R0dwaDBEbXNvbjBaQ2xKNklFd0dqazZZREFBQUFMQm5EaC9XY2NieHVpZnl6RmpNTHJUVVJYcWRkWnhZZ3lPS3h6aVJPdXA2akhhczQ4U1NqTGplMU84MUFBaVRBZUNPdkV5UjBSUUF3Q2UxaSsxVjVGYk9TUjZESG15aS9YZVljNHk2ZmhydGVIK0cwSytsSW9YdjR2U011RzVIaGlsNlUwQSs5bDhYUnBnTXdLa01rWVBGREFCQWJtOGp6eEV0VjVubTRPa2k2RUtEWGFSWE9jZW82M09lMVh4WDV4aEZ2SWwybk9QNldVWGJwbzRLampJLzc2RlpKaU1zanpBWkFBQUFJRDUxSlpkemtoOUhiaytDM3J5TzlxM2pST2I3UUxrSEROR09rNGZKUmwxZmI3NStTbGY3RUcwYkF3RDJDSk1CQUFDQTd0WHgxaGVSMnd2bkpQZW5kaGdhZFgxN3EyakhlTWJ1clpaR1haL3krbW1wcS8wNkx3TUE5Z2lUQVFBQWdLN1ZFYWkvUkc3djV0RHBwNkJYclhjbnIyckJ4eW0wZE43dE9jKzFQY2Q0N2ZzNjVhanJsczdidnNvSFJVY0FYQ1pNQmdBQUFIcFh4bHNQa2RjMGYxNEVQV3NwK0x2T09vNnNCdFl0amJvZjQweHE0RGhHTzlaeFpIWEVkZXRuOEdZWWl3L0FnUW1UQVRpVjFzZXE3YlQrWWdoWEdRSUFPalZ2L3Evbkw4OGp0NWM2emZvMmYvOC9SUHZub0g0WHg5ZFNWK200Z0ovclg2TWRweGcvbldIRTlSaTB4ajRWNlp4d0dnbTNKRXdHNEZTRXlRQUFMRXJkcVBveGN0dk1nZE1tb0swemJxOXlpbEhYTFlXQjV4eHh2ZE5TeC92akU0eTZibjNFOWZzT0M0OHk3RlhacHdLT1RwZ01BQUFBOU1wNGEzcXlpZmFEazNVY1NRMnFWOUdPTWM2c2RyeFAwWVlTdUIwdDdLMVRMbG9QOVRLTXc3K3JMSTBQa0kwaWlZVVJKZ1BBM2Z3NUlKOGhBS0F6ODhiL0QzR0NNelRQN1BzNTdMRlJ6aWYxV3ZnUWJmdDdITThxMnJHRUVkYzdTK2lRdnExalhqK3RqN2llVExGbzFoQ1FqekI1WVlUSkFKeUtUU3hZcnY4S0FPaEk3VUM4aU54ZTFxNUIyUGN5MmpiTVA3K3JPSTVqQm8ySHRxU1I1V08wNHlpanJ1di9adXNqcnNmb2s3MHFnRnNRSmdOd0VvazZJb2FBZkZSOEF0Q2JYeUwzODY5MG1GMEVYREpmRjJPMEg1NnM0c0FhSEhHOW1ISEVqVjFUNWI3L09BNnY5U0M1YUtuRC9KRCtOeEk0d1hueWNHcERzQ2pDWkFCT0tVT2dQQVRrSTB3R29CdnpobXYyYzVMTG12dEp3UFZlUjl1TzBVRzhpblo4V05DSTY1M2VSMTFuR0hFOUJpM3pUazgyUTdBb3dtUUFUaWxEbUd5QlRrWkRBRUFINWlDNWRLUmRSRzR2RnhnMHNTeGp0TzBZbzY1YkNnTi9qZVZaVEtmMExSeTBpempKaU92V3g5OC94QlE1SEtQakhzN0ovdXZDQ0pNQk9LVVVZZkl4emxpQ2M2blhzMnNhZ1BUcU0rOXQ1TGFaZytTZkFtNVFPeERIYU52Qndyc0d3OEJOTEV4cm82NFBYSXlRWWNUMUdQM0tjaVNiZDNxeStYT3dLTUprQUU3SnVjbXdQRU1BUUI5ZVJlN24zaFI5ZDVkeE4rK2piWWNjVmJ5S2RwUnh4QjlpbVZvYWRYM0lBTGoxRWRkajU5TXM3RlBCTWczQm9naVRBVGlsZjBjT3hnZVJ5UkFBeXpZRVBOQnZ2LzIybnIrc0l6ZmpyYm1MVGJRZG9oeXl1N1NsTUhESlJRQXRqYm8rU0RIQ2ZBME8wWDVuY2t0RkFNY2dUSVpsR29KRkVTWURjRW9XNmJBOFF3QkFZbld6LzhmSTdmVWNKRzhDYm1tK1hzcTcyVkk3WEcvclVDRmVTMkhnWWdQYlRrZGRyNkp0SHowNzBweVovRzFBRW81ald5WmhNZ0NuTkVVT3p1MGdreUVBSUxjM2tYKzg5VVhBM2JVK0Z2M0IzYVUxVUd4bHczcXFnZTJTdFRRKy9SQkZCSWNjdDM0T0xYV1RIMHVhcG9jYXdFRUdKa0l1a0RBWmdGUEtza2hmQmVTaGdwbWxzUG5CZGY0cjRKN21qZFhTa2J5SzNKN1VMbE80azhZNlNhOXlpTzdTbHNMQU1aWnZFKzE0MEhqek92VmlGVzNyZmNSMUpEc2VZZ2pJUVppOFFNSmtBRTZwOVRGcU95byt5Y1FpdlgxWkFnU0JJZGZ4ek9WZTZrYi9SZVRtbkdRZXF2VXc2YUhkcGF0b1J3dmZxL0xPMzhyYWRIaGdNY0lxMnRaQ3AvdXBUSkdEZDN1eUdJTEZFU1lEY0VxWk9pYUdnTWJObXlmbFpWTkkwempkYUFEWCtpVnlLMEhBUmNERHREN205dDZkeFRWSUhLSU5UUVIvZFYzYTBxanJWZHhmNnlPdVcvbytIZHNVT1FpVHljSUV2UVVTSmdOd01zbTZKbFlCN1JzQ1lQa1V2WEJuZGJ6MUVIbVZ3T1pKd0FQVmdIS01kajFrMUxVUjE4Y3hSanZ1TmVvNnlZanJuNEtkZjBjT0FqaXlXQVdMSTB3RzROU215TUVpblF4V0Fjc3hCRnhObU15ZDFHRHBJbkl6M3BwRGFyMUQ4YjZqcmxmUmpwYkdrWmR1OTFZbTV6eXV3ZkJkcmFKdG8yZklGNmJJUVdjeXphc1Q5RmdnWVRJQXA1YmwzT1JWUVBzVVJlUmgxRFdaRFFHM1ZFT0JONUhiWmc0QmRKUnhTSnRvMjkvbm4vMDdGUjdWemVvaDJ2Q3hwYk50NjZqcmx0NzcxM0YzclkrNGJ2MnM5RU9iSW9lSFRHcUFwVmdGaXlSTUJ1RFVzb3dQR3U2NllRRkxVcS9mVlpCRmhqRFpQUlU0aE96anJhZjU4ekxnZ0dyNE4wYTd5aHJpcnAxTTYyaEhpK2RhdDlUdC90MWQvdVVrSTY3SFlGK1dwb2RDVnlldHU5TTltZE1SSmdOd2Fwa1c2ZmNkcHdaTDRDV1RwUkVtOHdmM0hEMUpwK2JyWlIxdEJVVDNZYncxeDlKNmtjSmRPMFh2ZFZidW1iUTRobndUN1ZqZHNWQjhGVzNiZUk3OHdSUjV0SFJ2ZzZ2WXExb29ZVElBcHpaRkhoWTR0RXd4QkVzalRPWXFROEF0MU1LRFY1SGI2emtBMkFRY1FSMmozUEtrazZlM0RRVHIvV0tJUnN6Zm0rWTZreHZzZGwvZjRkOXRmY1IxNjJla0gxeTlYcWZJd1Q0VnpXcnNDSXJ1Q0pNQk9MVk1uY210djBUU04rY2w1ekpGKzRUSlhNVjF3VzI5amR6WHl6Ui9MZ0tPcStWelZPOHk2cnFsb3NxV2c3K1dmdSszNnVaTU1PSjZhckU0NFVTeTdGVTVONW1XS1laWU1HRXlBQ2VWck9Mem0xbzFCMDFKY3M0WENSbHB6QldHZ0srWTd4M2xuT1RzYTdJbmRSME54OVI2eVBUakxmKzlsb3FDVy82ZWJLSWR0eDExdllxMmpjRjEvaDE1bUVKR3F6VHRMSmd3R1lCemNHNHluTmNxeUNiTDVvY3VWQzRiQW01UWkxQXVJamZuSkhNU2RkVDFHTzE2L0xWQXNONHpXaW8rYVRaTVRqcnF1dldnNDNWd25VejdWTTVOcGpuMStiMEtGa3VZRE1BNVpLcjQvQzZnUFY0dVdhb2g0RXQvRHJoRzNYVDZKWElySTBrdkFrN24xMmhYdVNkOHJkaDNGZTBZRTB3a1NEUHFPc0YwcHcvejlaUXBNRDIwTWZJWVRIeWlRYXRnMFlUSkFKekRHSG5jZGh3V0xNa3F5R2FLSE54UHVXd0l1RjRaYVR0RVhpVkVlaEp3V2o5RjIvNyt3SCsrSkMyZlliM1RVbWYxMXpyYlc1OUtwaXY1Qm5VQ1NLYmpKTllCYmRIMHNIRENaQURPSVZzMTdEcWdFZk1HU2RrRUVkaXhWRVBBbDRhQUs4elBzL1g4NVhua1pydzFKOWZnYU9MTHJnMEVHK3dzSGFOeDlSNDJSaHUrMXRuZStvanJNZmlhVEh0VnB1alJHc2NJTHB3d0dZQ1RxeStVVStTaGVvNld1RjV6bWlJSEk0MzVYUTBERkwvd0J6VVErakZ5Mjh4cjV0WTdSR25YeTJoWGVXNnNyL2xucTJqSG1LaVlwS1hSNlZjR2NBMmV0WDNaZThWSnQvTFB5R05sMURXdDBQVFFCbUV5QU9mUzhsbGNsMW1rMDRSNm5hNERsdXUvQXo1cmVkT1c0OG8rM25xS3RzTTgybGU2ODFvZTkzcGQ4YVFSMStleGlYWTh2YWF6dmZXT3VaYkdqWi9UR0xtc0E5cWc2YUVCd21RQXpzV29hemk5VlpEVkZEbDhHL0NaTUprL21EZjVmNGo4Nnk3anJUbXJPdXE2NVRCemRUa1FySCs5aW5hTWtVUmprOG5LZFhMVitxUGxFZGZUL0QzWUJMY3hSaTQvQkN5Y3BvZDJDSk1CT0pjeGNyRklwd1d0bi9QRjlhYklZUWo0YkFqWVV6ZWJMaUszMXpiOVdZaldPeG5YbC82NnBjN1NUQ091ZDFvcVR2amlXa2t3NG5vTWJxVVcwa3lSeHpmejlic0tXTFpWMEFSaE1nQm5NUy9TV3grZGRwbEZPb3RXTjBGV1FWWnA3cWVPRFdDUFRuVXUreVZ5bjZjMlJmNnduRWJNNzJ0anRCMUMvZTByZjcxazd5T2ZNZHB4dVFDMzlSSFhtVWFtbjBLMm56K05EeXpkajBFVGhNa0FuTk1ZdVZnQXNXU3V6OFJxRlgwV1JodXo0MXJnZDcvOTlsdjJjNUtMSjhudTU3VHYxMmpYNVZIWHEyaEh1dk50YTNIQ0ZHMjRYQ2plY2hnMzFUOTdiaS9ia1d6WG5RTU9aMWZ2dFVQUUJHRXlBT2ZVOHViRVZWWTY2bGlpZWwyMlhsSFAxMDJSd3hCMGI3NXZsU0RaeGhlZjFPdmhJbkp6VGpKTDlGTzBiVjMrejN3UEtldmdWcDRwSHhMZkMxcnErUHowN2xTZlAwTzA2M1Z3VittS09XYlBBNWJKVVd3TkVTWURjRTRaRitucmdPVlpoVkNtQjFtNjJZdzJwdENWekNlMW0rWnQ1Rlk2eHk0Q0ZxWjJ5by9ScnI5ZCt0cUN6Q09KVzNyLzN3VWM2MmhieGoyWG8wcHczN3ZLRDdxVFdacmE5TEFPbWlGTUJ1QnNhc1YxdGxGK0Z1a3NrUkhYZmZobjVDQkVwUGd1WU90VjVKNVlVTmJDVHdLV3ErWE94akk1NmlMYW10QXpSbEoxM0hJcjcvOWwxSFhwekcrcEVPR3kwY1NMZTh2eVhyVlQ5cWhNS21OcDdGTTFScGdNd0xsbHE3d3VpM1FqaEZpTWVSTmtIY1lHOXlKTGNjNFFvS2lBK1AwWnRvN2NqTGRtNmNab2U0MVJOcXRiS2ZZdFV3cXluZGQ2V1V2di8rV3M1Q0hhbGJuTC9kZ3lkblMzZlBZM3lkU3U1RlhRRkdFeUFPZVdjcEd1TzVrRlVlM1pqeWx5K01iNTgzMnJ6MUJoY3VmcWZTRDdNMnd6QjBldG4wbExjblhrcTFEcU5GbzZVL2krakYwK2pmSno2OC82bmhycm9yK3R4L1BhYWhXd0RPVW9nU0ZvaWpBWmdITXJsZGZaRnVtNmsxa0VYY25kbVNLUFZkQ3pWVURFbThqOURKdm16OHVBTmdpbFRtTVR5U1VONlpib1hTMEU0ZjR5Rm5jb05PZnNuSlhjTG1FeUFHZFZYM0F5anZMU25jd1NlRm5zUzZaN3FhN1V2clY4UGlFSE1LK2h5dk5yRmJtOU1ONmFWdFFBTVB2NDVYUHJZY1QxVGc4ZDJPZG1tc0REalpIUFNuY3lDNkFydVZIQ1pBQ1dJT1BMcE81a3prcFhjcGN5ZFI5OEYvUnNGWFNyZGl0Y1JHNnY1OUJJcHlldEVRQWUxeGo5MkFUSE5OVUNFQjZtUEtjemRuZS9DamdUWGNsdEV5WURzQVNieUVsM011ZWtLN2t6ZGRMREZEazhkdi9zVTkxZ0dJS2UvUks1bFUxK0JZZTB5UG5leDlWVEoybkdvNjZXUk9ISEFTU2VvdmU0RnA3RE9md1EzdldhSlV3RzRPenFJbjJNZkVvUUl0RGo1T3A0MENIbzBSUjVHSFhkcDZkQnR6cDVmajBKYUZEaWQ3WWw2S3FUdEY1TEFzL2pVZmh4T0ZtTFBGNHAzT1hVYXRHd2dzcUdDWk1CV0lxc0w1UFA2NElKVHNMWW9PNzlPL0lRS3ZiSmVjbWRxbWY0WFVSdUw1MlRUT05lQjhjd1JuL0c0QmhHejVtRHlqcnEyckZzbklObW04WUprd0ZZaWsza0hYWDFKdUIwZENYM0xkTW90bStEcnRSaW1GWFFuZnE5ejc1ZStqQnY4RjhFdEcwTTQ0bVBvYWNSMXp0WlE3cHo2L0ZhT3ByRW82NkxIelErY0NyenRWWUt4ZGRCMDRUSkFDeEM4a1g2cW5iYndGSHBTaVp5amJsZUdiL1duVlhRcSt5RlVHV2QrMzFBNCtvN203RHFzRDcyTk9KNkovbjcvem1Od2FHOWpKektlNWJHQjA3bFZkQThZVElBUzVKMWtWNjhFWXB3QXI4RXZjdTJLV2ZVZFYvK0huUm5YaCt0STM4aDFBdGpSMG5rWFhCSVBmOTVLa3c0ckkxbnpWR1U5NnVzWGZRYUh6aTYrUm96UFM4SllUSUFpMUVyc3JNdTBvZHdQZ2hIWklGT1VUZVFNdDFIdnd1NllNUjFuK3IzUFh1blF0bmMzd1FrVWQvWnB1QlEza2UvRkNZY1ZzL1gwdEYwTUpGQjR3TkhVOWY2RjBFS3dtUUFsdVoxNVBWYzFTZkhZSUhPSlptNms1L2EzT2lHZ3FzK3ZZM3RtTVdzcHNnOWVZZCs2U2c5akRMaXV0dEF0WVowWTNBSVU4L1gwZ2xrL3JNZHdqcWM0ekU5THhGaE1nQkxrLzBGU05VbngyQ0J6cjUvUmg3bGZ2azQ2TUVxNkVxZHFKSDk1OXQ0YTdMNktUaUVYd1BkdEljeEJrZFRKektNa1pmR0J3N085THg4aE1rQUxNcThTQzhkZFdQa05ZU3FUdzdJQXAwclpEczMyVG02eWRVemM0ZWdHNTFNMUhpcFM0eXNkSlFlakh0RXhDWTRoTXdUM3BZaWUrR0R4Z2NPeHZTOG5JVEpBQ3hSOWhjaFZaOGNSTDJPTGdLK2xDMU1OdW82UHdVREhhay96OWtuYXBSeG94Y0J1UmwxL1hEZGg4a0tFdzdpUXkzSzU3ZzI4K2RqNURXRXhnY09vSk8xZnBlRXlRQXMwUmk1RituRm0xcXBCL2RTcjU4M0FaZlV6YVJNOTlEeU1yb09VcXIzc2xYUWt4NG1handKeUs4RW9kbmYyWTdwZlExU01lcjZvWFFsbjBEOWVlMmg4ZUY1d01PWW5wZVVNQm1BeGVsa2tUNkVJSkNIZVJVVzZGd3ZXM2ZDMzRLc2RFQjBwSTQwejc1SitkSTV5ZlNndnJQcFRyNC9JNjQvMndRUE1RYW5zb244ZnRUNHdIM04xODRQa1grdDN5MWhNZ0JMOVZQa3IzUmYxZk51NFU3cWRmTTA0SHIvakZ4V2pnZklwMjVVcllNdTFPOTM5blhQYUx3MW5SR0kzdDhZZkdMVTlZT01DcGhPcC81Wmo1SGJweEhGamhuaXJweVRuSjh3R1lCRnFpK1VQWXk3dXBnWFhFSkJicTFlTHhjQk54c2pIL2ZLZkJSVTlTWDd5THRwL2p3TDZNajh6amJHOXRybmJnU0FmL1JyY0IrbUE1emV5OGh2aU8wa05MaVZHaVNYYzVJVklTUW1UQVpneVRiUkIrY25jeXZPU2VZT3hzam43eXJrODlDVjNKYzY4bTRkdVJsdlRhK0VXWGZueit5UE5zRmRUZk56WnhPY1ZDMmlHU08vdFVsNjNNSGJjQXhiZXNKa0FCYXJvMFc2TVVKOGxVcFA3cUpPZDhoMmJuSzU5cDIvbElmTnFVNTBNdkp1WTBPZmp2MFUzTlVZZktFVzQwekJYWXpCdWZUUW5WeVlwTWRYemRkSTZXSi9IS1FuVEFaZzZYcFpwQSt4RFFyaEQycWhRYmsraG9EYnl6Z3U4QWVGTisycjUxK3ZnMTVrTDRTYW9wLzFLdnlCODI3dnpJanI2K25Zdmh0L1htZlMyWWovTWtsUFVNaVZhdmU2Z3U5T0NKTUJXTFNPdXBPTHgvTkN6QWhqcmxLdWl5SGdic2JJUjNkeURwNTFuYWdiVEVQazlrd3dCUEUrdUMwQjRQWEc0TGFtdWxmQytmUlNTRmJldjk0Nm1vM0w2akUyRjBFM2hNa0F0S0NuYmcvbjB2Q0ZXbUJndEJUM01VWk91cE1iVmpjZGhpQzkyc1Z5RWJtOXRKa1BuMnptejhmZ05zYmdTcDExZXo3VTYrQ3M2dkVXVS9SaGlPM1JiRU5BZkZybi96MGNjOUVkWVRJQWk5ZFpkM0p4SVZDbXFHZlByQVB1SWZIWVNkM0pqYW9iVUw1M0hhZ0ZIMjhqdDlJVmRoSEFiczJoNC9iclBwaGs4Rlc2M0cvblhiQUVQVFUrRExIdFVGYlUyN2w2anZZbTZJNHdHWUJXOUhZV25VQzVjODZlNFVBeW5wdGMvS0F5dmtrOWpEeG1xeFJERFpIYmt3RDJDYmUrVHVEK2RhNmpyM1B1OWtKMDFwMWNsS2t6dndpVSsxVW5Eem15cUZQQ1pBQ2EwR0YzY2lGUTdsVDl2bDhFUE53WU9aVU5EQyt4RGFuanJkZEJldlAzZWgzNXY5Y3ZiZVREbCtyN21sSFhOeHVERzdtT2JrVlJ3ckk4aTc0SWxEczFmODlYODVkZll2c3VUb2VFeVFDMHBMZEZlaUZRN2t3OUkva2k0QUNTYjhpdDZnc3RDMWU3eUMrQzlPcjNPdnU2WlRUZUdxN2xITmZybGRINEg0TGJFSmJlVFBmMmduVGErQ0JRN2t3OUkxbVEzRGxoTWdETnFCMGdQVzVRQ0pRN1VGN0VhcEM4RGppc3pCdHliMnhpTk1IR1F6L0tjMnlJdktib3M3Z1JidXVuNERyT0FyNDlZZW4xTnZXTWNwYWx0MlBaaWhJby84UFJRL25WQ1ZPYm9IdkNaQUJhY3hGOWpyMFNLQ2RXdzdBU3Rxd0REaS96aHR3UTI3TlpXYWo1L3RiRDJibkU3MGMwckNJMzQ2M2hCalhrR29PcmJJSmJNZXI2UnJxMkY2alQ3dVJpaUcySDhoQ2tWTmYzQ3NYNFJKZ01RRlBxQmtXdjQ5TktvS3dMTDVuNjR2V1AyRmIyd3NGMXNDRzNubitPbmdlTFV6Y2ZmRzg2ME1rbzg5SU50Z25nYTNUZy9wRVIxM2NuTlAyanFhN3JXYVl5dWFUSElvZ2hCTW9wMWFMZ2k0QkttQXhBaTBwVjNCUjlXb2VGZWhyMXZOY1NKQThCeDVWOVErNUg5OFZsbWI4ZlQ4UG1RMDkraWR5bTZIT0VKZHpISm5TVlhqWUdkMlhVOVIrTndXSjFmQ3hiTWNSMjVQWFRvSG4xQ0xheXRsY1V6QmVFeVFBMHAzWW45M3hlWGVsZ0ZTZzNycDQ3NHh4UlRpWDdodHluVWZFbU55eERmVDY5Q2JwUU85Q0h5TzJaOGRad08vVmRUWGZ5bDNUWjNsM3A1RmFVOENWRlRjdlhjK05EZVE5NzYzaTJ0czNmdjA5bllVZitvMnU0QjJFeUFFM3ErRXlhblNHMmxaOHFCUnRUcXp4THlPTGNHVTZtazdQbmh2bnpOamlyR2lRcmxPbEVuYkJ4RWJtOU5GWVU3bXdUN0JoTmZBK0tFdjdnZzZLbTVhdlg3WXZvV3ptZTdaVWkzL2JzTlR3TUFWY1FKZ1BRc2w3UHBOa3BpL05YOVJ3VEdyQjNQdkk2NFBSNkdMdTJjazg4bjcwZ2VRalM2NlFEdllSQUZ3SGNTU2RGYkxjMUJ2ZGwxUFZudlk1UGJzNTgveXZYN1JoOUswMFAvekJOcncyMTRhRzhRNWVHQjBVQVhFdVlERUN6YW1XdVVVL3pRbjFlK1AzTFFuM1phcFduODVFNXAxNjY0WjhicjNaNmd1UXU5VERlK2trQTl5WDgyakxpK3Y3R1VKU3dNd1l0NmIzeG9SaGlHeWl2ZzhYYUcydHQ2aUZmSlV3R29HbHpvRnpDa1RFWXd0anJSU29CeS93cEFZc3FUODZxamwwYm93OFhBdVhUcVpzUWd1U08xSTNCZGVUMjBraFJlSkJOWU1UMUE5UzE2NGZndmVkUld6USsvSzdzZjd3cHgzeHBmbGdlRFEvY2xUQVpnQXg2UDVObVp6ZjIya0o5SWZZVzU2dUFaZWhwVTBPZ2ZBTHpuL0hURUNSM3BhNHhzbytUSDQyM2hvZXBZY29ZZlJ1RGg5TFpyVENqU1JvZnZyQ2VQNy9NYThoVmNIYVhHaDdnMW9USkFEUnZYcVNYYW1WVm41K3RZN3RRWHdkbm9SdVpwZXJ3RE1NTFp5Z2ZUdzNyMzRiN1hHK3lmOCtuMkk2bkJCN3VmZlN0OS8vK1ErajkzT1NwbnNGTG00eTcvbXlJN1Q2VjVvY3pxV2NqbC9lM2Y0V0dCKzVCbUF4QUNyVjd4QWlzejRiWWpoUDZ4VUw5ZFBZVzU3cVJXYkxlempBc1p5aS9kUzg4bkhxdmV6UC84aUxvU24zR1BZN2NqTGVHdzlsRXYwSEtSeUhndzNWMlRNdFZ4cUJaeGwxZmFSMmFIMDZ1ZG9XWGZhcUxnSHNTSmdPUXlmZWg2dk95MWZ6NVY5bjhGYVFjVngzMXVsdWM2OUpqeVVySGZHLzN5aytqbU4wSEg2NmVqMXp1ZGV1Z0svWG41eUp5Mjh3YnY1c0FEcUlHZ2IxMjV3cVNENmZuRHUvZWlrRFRNZTc2U2tOb2ZqaUp2YWw1amlYaXdZVEpBS1NoNnZOR0Y2SDY4eWhLaFdkZG5KZXhuMFBBd3RXTjNSN1BueHRpVzF6elBMaVh2Y2tMUTlDVjBvMGUyMDJvekthd2pvUmoyRVNmZmcwT1pSTjltdXFSWHJUUHVPdXJyV0w3Zm1iMDlZSFZTVkxsdUNjanJUa1lZVElBcWFqNnZORVEyK3JQZndtVkgyNHZSQzZmVlVCYmZvcCt2YkpoY1RmMWZtY3NXdDlLSWNFUXVUMHozaG9PYi82NUdxUFBFRVZuOG9GMFBPcGFnVk1TZFgzeElyak9Pa3pVTzRoTDV5SXJvdWFnaE1rQVpGVEdYVS9CZFlZUUt0K2JFSmtNNm9aR2o5M0pPK3ZZVG12d2duMkR2WXIyY3IvTGZrNHUxNmhyaGV3L0t5OXI0QVVjUjIramV0L1hBSlRENlhIVTlSaWtVWS9STUxiOFpoZXhmVWNUS3QvUnBSRDVJaHk5eGhFSWt3RklwNzY0UHd1K1pnaWg4cTBKa1Vub0l2bzJ4TFpMdWR3RFY4SHZWTFN6VXpmeWZvemN5aGpSaXdDT3FiY3VYVjNKaDdlSnZveW1aYVIwRVJvZnZtYUl6Nkd5YVZKZlVmZXAzb1FRbVJQNFV3QkFRcVc3WkY1UWxURkNyNEt2R1dJYktwZk40ckx4OGRxTDYxWTlJL0tIMklZcEZ1V2tVbjdPNTJ1OGRDZi9QZm8yeEhhellweS92dWo1YkRyM1BLN1F3M2pybnhYVmRXL1NtWDVjNWRsYW43T3I2TU1ZSEZRcEdPL3NHdXA1Z2xCYTlUcCtNdit5SEI5anJYMnpJYmJUcE5iem45bG0vdnF6Wi9WbnRSaTZyTk5YQVNjaVRBWWdyWEorOHJ6QSttNys1ZFBnTm9iWUJnalA2Mks5akdmcnNxcmV3cHlPWElRd2VXYzFmLzVSTnlxN0dua3JST1lxODNWUnJvbDE1SmU5ODVxdkcwUDRkd3BsVFBFcTh0TlJlankvUmgvWDBNYzZFcG1FYWtGdmFYeDRFOXpXT3JhaDhoVGJzOFM3dk0vV2ZhcXl4K21kamJNdzVocUE3TXE0NnltNHEvWDhlVnZIdjc3cFlRUnNIUTlVUnQ3K1R4aGxUU2ZxUzdpenU3NjBpbTJuOHFjakFES1BWdHNiMzEvdWV4ZGhVNEtxWHZjWEFYQTRtL25Ud3puQ09rcVBaeE45TUNZOXVWb3M4REs0cXlHMklYeDVUM3RiMzlWU3Y3K1VOWGs5UTNwMzVOcEZlR2ZqVElUSkFLUld6MDh1WTRSNjJMZzRoaUcyd2ZJdjJZTGxlaWJvMC9yZnRBdVFWWGpTbzR0d2o3ektFQWszS3hUT2NFdmwydkE4QkE2bXZwZU5rZDhZSEVVdGdod2pQd1VKSFppdjU0dHd2M2lJTW9Hd3ZLdjl6OTY3MmhBSjFQZTFYWUM4T3d0NUZYQm14bHdEa0Y0ZEkvUjliRGRHdWI4aFBvOFgybTBHbFhGMUgxbzRZN1NHUUk5ak94Wm9GUmJqOEVrOXU2dDBKeHYxZXIybjlmT21qc0V1OTc2eG9YdmZLcmIzdm5VSUNQbUtzbmtWK2M5SkJzNmpyRGN5SDBGa3hQWHhaUjkxN1F6M3ZwUjlxbkorOGhBOHhPNWRMZXE3V25sSGU5L0t6MUlOd2N2di85djYxZnNhaXlSTUJxQUxaUkZaejZWNUZSeENXZHp1TDloMzRmSS82OWNQdGZ2Z2JPYmZVd21PeTZjc3lGZjExM3pwV2YzcXZLYk9sY3I0K1dlbW5KMDhCRit6cXArbzUzYVZ6WXBmNjljbDNQdUcyUDcrM1B1NHMvcnN2QWlBSTZqdlpPVTVtWFdqWEVmcDhZMlJ1d0RTTmRTUld0UmJKdW1WeG9jaE9JUlYvVHlmLzJ6TFg0L3grWDF0T25jeGNIMVgyKzFUbGErckVCNWZWdDZwLy9wYi9RYXlITUprQUxveEwwWitxaDFhdXU4T2J6OWMvdlRuV3plS1B0VFB2Mk43ZHZXbnYzZUlzS1YrTDNmZHh1WHJ0L1hyS3J5STNVWjVrZHFVY1ZBQlc2VzR3QVNIdXhucTUvY3VxL2xucXR6emR2ZS9mOWV2NWErblF3WE5kUlBpOHYzdmNmMjkySXpnWHVwejlXMEFIRmZtYVNoamNGUzFJR0dLdk85N202QXJseWJwV2NjZjNxcCtucGUvcVBsa2VUK2JZdHNNc2YrdU5zVUJYSHBYSzcvK2MzaFh1NHZ2ZzBVU0pnUFFsZHA5Tjh5Ly9IdHdiTHRnZDNYNUg5UUYvS2NGZTN3K3EvVmpYSDl1NjNETlYrN3ZTY0NldWpsWE5uaC9DQjVpMXdtOHV2d1A5dTU5dS92ZnpuVE4vOWF1YUtZWUxuMkZReXViYkVNQUhOZTd5QmttZnpEaSttVEtjU01aMTZ2R3BIZXFkTXZXU1hvbWhwM0dib3JkMC8yL2VZOTN0YUYrL2ViU2gvdDc2VDY0WE1Ka0FIcFVOa3QzWFZ5Y3o2NVNrOU96UU9jNkY3RXR0dkVTZkR5N1RZWWhBS0F6TlRRWkk5KzV0OFlUbjA0cFNNZ1lKcnVHT2xhbmhnMWhrdDY1ZVZjN245SWRmaEVzMW44RUFIU21qaGt0WFpsVFFIOHMwTGxXdlQ4K0N3Q0E0M2tmK2J3TFRxSk0wNG5ySjFxMXpEWFV1ZnFlL2pLZ1Q2Ym5MWnd3R1lBdUNaVHBtQVU2TjVydmoyVWo2M1VBQUJ6SEpuS0ZnVVpjbjE2Mkx0NU4zYU9nY3dKbE9tVjZYZ09FeVFCMHF5NVVCTXIweEFLZDI3b0k5MFlBNEFocWFQWWg4dmcxT0xWc1hieEdYUE83R2lpN0p1aUY2WG1ORUNZRDBEV0JNaDM1WUlIT2JSbDNEUUFjV2FiT3UwMXdVc2xHWFUvMXZ3ZCtOMThUNnhBbzB3ZlQ4eG9oVEFhZ2V3SmxPakRObis4RDdxQnVhcjBJQUlBRFN4UUdsaUF3VTVkMVM3SUViV1BBRlFUS2RPQ0Y2WG50RUNZRFFBaVVTYzhDblh1WnI1dWZ3Z1lHQUhBY3I2TjlZM0F1V1VaZE94K1hhd21VU2V4MTNXK2dFY0prQUtnRXlpUlZ6a25PZHFZWXAvVTgzQmNCZ01NYm8zMUNudk1wSGVHdGQ3ZC9VUFRMMTlSQU9VUHhEZXhNOCtjaWFJb3dHUUQyQ0pSSjVwMXprbm1vZW41eXVTOW1PWmNPQUZpQU91cDZqSFk1Ni9hTTZocjFmYlJOUU1pdHpOZDdLZkRWeFU0RzAveDVVdS9oTkVTWURBQ1g3QVhLenI2aVpkUDhlUlp3QUh2M1JUaTNNV3k4QW1UU2NoZzRCdWUyaWJhTkFiZFVDOFVGeXJUdW1Za01iUkltQThBVjlvSVQ0NEZwMFJRcVBUbXcrWG9xQlRZS0ZEaTNjZzE2TmdQa3NZbDJwNThZY1gxK0xZKzZmaTlRNGE1cW9Qd2lvRTB2VFBSb2x6QVpBSzVSZ3JqNTgzMm8vS1F0bjBZUzI1amdHT2JyYWhQdWlaelBTL2MyZ0Z4cThXT0xFNkdNdUY2QWhxK2ZZaE53RC9OMS85UDhwZXhWS1I2bkpTL3J0VXVqaE1rQThCVkdDZEVZSTRNNEt2ZEV6bVJ5Qmp4QVdpMnVLOFpnS1Zyc0VDL3JHcE5XdUxkNi9mdzF0bFBKWU9sZWU1ZHJuekFaQUc2aExucFVmckowejJ4S2NBb0NaYzdBbWQwQVNkVU8zOWJlczFvKzZ6bWI4djdUMnZVekJqelEzdkZzVThCeS9UeGZxOCtENWdtVEFlQ1dWSDZ5Y0MvcUNHSTRDWUV5Si9UQ3hBV0E5RnJxTHYyb2dITTVHaDExL1RyZ0FNb2FlZjc4SlZ4VExOTzcrZnBjQnlrSWt3SGdEdllxUDIwZXNDVE9udUVzQk1xY3dHdjNONEF1dFBSKzVWMXdlVnJxRkMvaFg2dm5QTE5RdGZQVGV4bExVdTV6ejRJMGhNa0FjRWUxOHJPTXZMWlFad2xlT0h1R2N4SW9jMFNUa1dnQWZhaWpyc2RvZ3hIWHk3T0pkbGczY3hUMXZjdzBQWmFnVEJ0NVVpZEhrSVF3R1FEdXFTN1VuVS9ET1QzVHNjY1MxUHZoaTRERG1jSTV5UUM5YVNXa0hZTkZxWUhGR0cwWUE0NmtkcjJYTmZRWWNCN2xqT1MxSURrZllUSUFQRUN0b0xkUTU5VEtvdng3WnlTekpMV3dvVXh0OE5MSVEwMnhyV1NmQW9DZWJHTDUzdHNnWDZ3V2loRkc2eHVPclU3VEsvdFV1dUE1dGRmT1NNNUxtQXdBRDJTaHpvbE5zUTFabk5YRzR0VHIwbWcxSG1KWExETUZBRjFwcEx2VUdueTVOckY4UHdlY1NKMGU5WmZ3YnNacHZIUkVVVzdDWkFBNEVBdDFUbUNLYlpEOElXQ2hhZ2hZQ214Y3A5eFZDUkhjNHdENnR2UUNYV0h5UWpWUWpQRFJaQ2xPcmI2YmxXTGYxd0hIODZ6dWlaS1lNQmtBRHFoMktaZEFXWmN5aHpiT243L3ExcU1GOVY1bzA0SzdFQ1FEc0R0R2FLbGpwRWNqcmhkdnlhT3VGU0p3RnVXK1ZUdEduNFhtQnc1cml1MCsxU1pJVDVnTUFFZWdTNWtESytPQ250aThvalYxMCtKRk9FZVptMDJ4M1lRUUpBTlFMSFVVc0JIRnk3Zmt3TmIxdzFuVndLOU1rSEl0Y2dqbDNVMHhjRWVFeVFCd0pMcVVPWURkMmFFWEFZMmFyOStmd2puS1hHK0s3U2JFRkFDd3RkUkFjQXdXcmE0bnhsaWVxWGJkdzFuVmZhcDFiRVBsS2VCK3lnUXk3M0NkRVNZRHdKSHRkU21yL3VRdVNuVm42ZFF6RG8zbU9hdUxhNHhoZkQ4QWw5VFFiWXhsR1Qydm12RnJMTStTeDIvVG9YS2YxZnpBUFpTR2gyZGxBcG5KZWYwUkpnUEFDZXhWZnpxamh0dDRYYzZidFdGRkpzN3E0cExYeHZjRGNJT2xCWUlLZzlzeHh2TDhGTEJBbWgrNGd6R2NqOXcxWVRJQW5GQlpkTzFWZjA0Qlg1cGlPeXJvZVVCU3p1cnEzbTU4di9zY0FEZFpXdmcyQmsyb25lMVRMSWV1ZGhiTjZHdHU0VVV0Qko2Q2JnbVRBZUFNYXZXbk1JVjlaZnp2WDUybFJROU1hK2pXR01iM0EzQUxkWExGR01zZ0RHelBrdDZ6dmZQVGhMM1IxOTdSMk5rZHYyYTZBc0prQURpWHZUREZTS0crVFZHN2tZMTdwVGVYcGpXUVY3bTNxV1lINEs2V3NqNXczbTE3eGxpT01hQWhlKzlvTDBLbzNLdmQrMXNKa2o4RWhEQVpBTTVPcU55dHNqaC9XVjdTZENQVE8yZDFwVGFHYW5ZQTdxZHNZQytoMk5KRWpjYlU5NnNsWERzYmhYUzBxcTdmeTBROXg3VDFaUXp2YjF4Qm1Bd0FDeUZVN3NvbXRvdnppd0ErMmJzSGZoODJLekxRalF6QWc5U3BQZWQrTC9yZ09kYXNKYnhUZTYrbmFmVWQ3U0tFeWowb0JWeFB2TDl4SFdFeUFDeU1VRG0xTWJhTDgyY1c1M0MxY3A2dXM3cWFWODZBLzR0cWRnQU80Tnhkd2I4R3JUcjN0VE9aUUVVV3UxRFplMXBLK3lPdHg0QnJDSk1CWUtFdWhjb3FRTnMyeHVjS3p6R0FyOW83cTh0bVJUdkcySWJJem9BSDRDRHEybm1NODlrRVRWckFxT3N4SUtGTDcybGowS3BQUjYrRkltQnVTWmdNQUF0M1JRWG9HTFJpRENFeVBJaFF1UWxqR0lrR3dQR2NxenU0dklkOUNGcDJ6a2xmcndNU3ErOXBaZnoxWDhOVXZaYnNoOGdYaW9DNUxXRXlBRFRraXNYNkZDelJHRUprT0NnVjhJczBobnNkQU1kM3JvNnA5MEhyempYcStvTkNCSHBScnZXOXFYb0tnSmRMaU15RENKTUJvRUc3eGJwZ1pWSEtRcnhVbnd0VzRJajJpbXFjSzM4ZXUzdmRYOXpyQURpRnV1RTl4dW1kKzh4ZEh1aU1vNjUxSmRPZE9sVnZWd0JjM3RjMFFDekRPSCsrbjc4di95MUU1aUgrRk50TkdBQ2dVV1d4UG4vWi9QYmJiOFA4ZFRWL2ZwZy9qNE5US1JYbnBXdmhKNHR5T0owNlRuazkzL3N1d3IzdkZOenJBRGluRXM2dDRuUW1CVk5wbFBYTDMrTzB4b0NPN1o5M1A3K3ZQWjIvbE0rcGZ3NTdWdDdYU3BqL3pyT01RL21UTTYwQUlJZjZUTi9FNTJDNUxOYi9GcWZkZE9tRmhUa3N4S1Y3WHdtVG44K2Y3K2JQRUR5VWV4MEFTekhHOXJuMFRaekdHR1N4aWRPR1dPL3R0OE5uODg5RG1mTHdibjVYSys5cCsvdFVwN3FmOTJTTWJRSE5SZ0V3aC9Zb0FJRFU5anFXTGRnZnBpekVTMmZlTGxpeE1JY0ZtKzk5cS9uTE9nVExkN1c3MTVVT3NORzlEZ0FBT0RUdmF3Y3p6cDlmd3dRcGpreVlEQUNkcVF2MlVnMzZiZWhhL3BxeUVDOVZ0R1ZoTGtDR1J1M2Q5OHBHaFZIWWYrUmVCd0FBbkVXZE1MV0s3ZnRhK2FvSjRtWmpiRHVRMzVtRXdLa0lrd0dnWS9PQ3ZTelFWL1VqWE40YVl4dW9qTWE2UWo1NzB4cktwK2NxK0RIYzZ3QUFnSVdweGNBbFlCWXViMDN4K2YxTjhTOW5JVXdHQUw1d2FkRStSTzR1dnQwNDEzL0dkbUZ1cEN0MHBsYkI3eXJodjQyYzk3ejllMTNwUVA3Z1hnY0FBTFNndnJNTjhlVTdXK2FBZVlvdmkzK25nRE1USmdNQVgxVUQ1bDBYODdmMTE2MEZMaVU0bVdJdlBKNFg1QjhDWUUrZDJQQjQ3L1BuYUd1ellqODRMbDl0UGdBQUFLbnNCY3psNjdmMTErWFRXc2c4eFRZNC91ZnUxd3AvV1NKaE1nQndiM1h4dmd0ZWh0aUdMdC9FNTBYOHFYMk16MEhLdjJPN0VDK2ZEOElVNENGdXVOK2RJMmllNG8vM3V2THJ5Y1lEQUFEUXE3M2k0Q0UrdjdlVnI5L0UrY0xtYWUvai9ZMG1DWk1CZ0tPcGkvamRnajJ1K0ZyOE9XN3ZmK056WUx6L21jcFhpM0RnWE9wWnpFUDl5OHRmeTMzd3YrSjJkdmU1WXRyNyt1bCtwekFHQUFEZy91cTcyemVYUHNQZXYzS1hmYXJpMy9YcnRQZjEwNis5dndFQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFEL2Z6dHdTQUFBQUFBZzZQOXJOOWdCQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQVlBbEcxelNReU5KTW13QUFBQUJKUlU1RXJrSmdnZz09Ii8+CjwvZGVmcz4KPC9zdmc+Cg==	\N	medium	left	\N	#3B82F6	#1E40AF	#10B981				f	daily	02:00	full	\N	medium
2427825b-fac6-44b4-a1f7-dbf29ef8d038	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	light	en	TZS	Africa/Dar_es_Salaam	DD/MM/YYYY	24	t	t	t	t	50	t	t	t	t	0.50	t	t	t	t	t	t	300	t	50	f	16.00	2025-10-07 18:13:27.27+00	2025-10-17 08:27:14.918+00	1234	inauzwa	Mwenge,Lufungila	0712378850	inauzwacare@gmail.com	inauzwa.shop	data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzkwOCIgaGVpZ2h0PSI2NjY2IiB2aWV3Qm94PSIwIDAgNzkwOCA2NjY2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzE4MTFfNCkiPgo8Y2lyY2xlIGN4PSIzOTU0LjUiIGN5PSIzMzMyLjUiIHI9IjMzNDYuNSIgZmlsbD0iYmxhY2siLz4KPGNpcmNsZSBjeD0iMzk1NC41IiBjeT0iMzMzMi41IiByPSIzMjgzLjUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjUiIHN0cm9rZS13aWR0aD0iMTI2Ii8+CjxyZWN0IHg9IjE4MTQiIHk9IjI1OTkiIHdpZHRoPSI0MjgxIiBoZWlnaHQ9IjE0NjciIGZpbGw9InVybCgjcGF0dGVybjBfMTgxMV80KSIvPgo8L2c+CjxkZWZzPgo8cGF0dGVybiBpZD0icGF0dGVybjBfMTgxMV80IiBwYXR0ZXJuQ29udGVudFVuaXRzPSJvYmplY3RCb3VuZGluZ0JveCIgd2lkdGg9IjEiIGhlaWdodD0iMSI+Cjx1c2UgeGxpbms6aHJlZj0iI2ltYWdlMF8xODExXzQiIHRyYW5zZm9ybT0ic2NhbGUoMC4wMDA1Mjg4NjEgMC4wMDE1NDMzMikiLz4KPC9wYXR0ZXJuPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzE4MTFfNCI+CjxyZWN0IHdpZHRoPSI3OTA4IiBoZWlnaHQ9IjY2NjYiIGZpbGw9IndoaXRlIi8+CjwvY2xpcFBhdGg+CjxpbWFnZSBpZD0iaW1hZ2UwXzE4MTFfNCIgd2lkdGg9IjE5MzkiIGhlaWdodD0iNjQ4IiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiB4bGluazpocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQjVNQUFBS0lDQVlBQUFCZFVOM25BQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBQUFYTlNSMElBcnM0YzZRQUFBQVJuUVUxQkFBQ3hqd3Y4WVFVQUFGL3dTVVJCVkhnQjdOM3JsUnpIbFM3c2pSbWQ4M2M0RmlobEFTRUxXTEJBb0FVcVdFREFBallzQUdFQmloWUFzSUJKQ3dSWm9KUUZnL24vcmNNdkF4VkZGSnJkamI3VUpXUEg4NnhWMCtCbGFVQjBkbVprdkh2dmlBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFDQXRCNzlmOFB3V3lUeHAybDZGQUFBQUFBQUFBQTgySjhDYU41dnYvMzJ6ZnpscXM5dFRaZC8vZWpSb3lrQURteStYdzMxbC92M3FTRnViN3IwNjQvei9lcGpBQUFBQU1BZFhMR3ZIbkczdmZXUDlmUDdyKzJyazVFd0dScFF3NWZIc1ExYy9oemJoOW5qK25XSUk1ai9mNVl2NVFFNHhlZUg0ai9yMXcreGZUQitDS0I3ZXd2di9mdlNuL2QrZlo4aWw3djgveTlmcHZoOHJ5cS8vbmZVZTFYNUtuQUdBQUFBNkVQZFQ5Ly8vRmQ4M3FjYTR2ajdWUGJWU2NXWWExaVFHc2c4cnA5djU4OHFqaFFXSDlEdlljMzgrWFgrVEI2R2tOT2x3cFp2NDhoRkxRZTJ1MCtWenk1b0ZqSURBQUFBTkdodkwzMkk3VDdWc1BmWExTaDdVMU5zZytaUHY3YXZ6bElKaytHTWFqQ3ptai9mUlJ2QjhWMk04VGxnL21DOEI3Umx2ajlkVmRoeWxJck5NOXN0M011OWFyUm9Cd0FBQUZpV3ZRYUhzbysrKy9VUStldzNiWTJoRVlLRkVDYkRDZFZxcVZWc0gzcFBJK2NEN3pwVGJCK0U3Mk1iMkV3QkxNS2xlOU11Uk00WUhOL0didEcrdTFjSmx3RUFBQUJPYU42cldzWG44RGhyY0h4YlpXOXFqTzFlbFhDWnN4QW13NUhWa0dZOWYvNFdmUWMwbC8zK0VKd2ZnR01BSjdNM0JxamNsMWIxMTF4dGlzOEw5dEdDSFFBQUFPQ3c2b1M4VmRoRHY0MXgvdndjR3JZNElXRXlITUdsQUhrVmZFMEpaOTdGTmxoK0Y4REIxWEZBWlNLQ1JmbkRqR0hCRGdBQUFIQnZkZis4N0ZQdEpuamFwN3FmWGNQV3o2YnJjVXpDNU03VmNHR0k5bnhjNHMyeGp0OG9RYzA2UEFEdmF4Y3MvNnhqR1I2bTNwUEtvbndkZlk4RE9wWmRFY3dtR3JiWHFkNjZya2M5MVovMzFrMktOTGhLdys4c2w2VzdUeVc1OTVEWFFmWU5FdDJEOW5ubUpyR0ErN0JyS1lIYUVacHRIOU1vNEFYU2dIVjAwL3g1UFgvZXRYNXZUdktlc2NnTTY3NkV5WjJiZnlndjVpOC9SbnRLUjlpVFdBQVB3YU9hWWx0WjlkTExDZHpPWG9EOFBCUzFuTW9VMjN2VjZ4WVhpZk0xczU2L3ZJbjJQZW0xQ0tsdWN2OHIybGVlOXhjQmx6VDh6bkxaWHpLdGFSUGRlOGpySVBzR2RYMzlTK1N5bUQwVjdtKytOa3NuMzlzNHIvSU85RHhvMm53dGxlZjVFTG44dHpCNUdleWRuODBZMjJhdFRUUm92bTR5NUphYitjLy9XU1R4SHdIY1Mza1F6cCt5cVZVV1hLL0N3L0FZaHRndU52NDEvMW4vVWdNUDRKTGQvYWo4bk1SMm8rc2lCTW1uTk1UMlh2V1ArWHZ3RC9jcUFJQThhckhhRkxrOHJwdjd0TzF2Y1g1L0Q1cFdDMmFHeUdValNENnZ1aysxcXZ0VS94UDJ6czloTlgvZWxHS1IrZk9tRm9MQ3ZRbVQ0WTR1aGNnWEliQTVsVlY4ZmdEKzRBRUkyNWUrdllYNVJWaVlMMEVaRDJheERnQ1F5OCtSeTY1TGpMWTlqZlA3eHBFSHpjdFlFSkR0bnQyTXVrOVZndU95YjE3MnExYkJ1UTN4dVZucmpYczI5eVZNaGxzU0lpL0dNSDkraXM4UHdDR2dJM3RkeUNWQXRqQmZyaUcrWEt3UEFRQkFxMzZLZkpiUTFjbzkxVEJnS2Z0U1N3aTF1YjlWNURMMWV2elJPWld4KzN2VDhoeTd0bHpyK2ZPTENhRGNoekFadmtLSXZHanJFTlRRaVZyZFdjN0QyblVodXhlMVl4M3VWUUFBemFyalVzZklaV1hVZGRPVzFFMnFNS0ZSU1VkY2o4RkpYR3AyS1B0VnE2QVZxL2c4Vlc4ZGNBdkNaTGhCcWFxYXYvd2pCRGRMdHc1QkRVbnRqYkl1SHhYZmJWdUhleFVBUUtzeWprMWRCNjFheFhJTXhxWTJLK09JNjVmQlVaWDlqTDFSMWhkaHo3eGxRd2lWdVNWaE1seWhQaFJMY0ZPcXFvYWdGZXZZQmpXdkJEVzA3bEtJdkFveVdZZDdGUUJBYTk3Tm40K1JpNDdTQmkyMG0zUVZ0R2dWdVh4NDlPalJGQnhGM2FkNkU5c1EyU2pyWEliWWhzcS8yS2ZpT3NKa3VLU090QzdkeUt1Z1ZXVkI0K3dIbWxRWDUyVmhMa1RPejcwS0FLQVJkZFIxdHU1a282N2J0TVJ1VW9VSmpWbG9VY0pEdlE0T2JxL3BxbnpXUVdhck1GR1Bhd2lUb2FvUFJpT3Q4eGppODVpT3h3RUxkNmtUZVFoNk1jVG5lOVVRQUFBczJidklaeDIwWmhYTDg5ajdUSE15anJnZWc0T3BlK1c3VHVSVjBKTjFiSnNmbmdkVXdtU0lUdy9ISDJMYmpTeDB6R2VZUC85UVVjVlNHV2ROTllUcVR3Q0FSWHYwNk5FWVJsMXpSclZZZm9obFdnY3RXVVV1NzQyNFBvd3lzV0p2Y3VjNjZOVXdmMTVwZm1CSG1Felg2c094QkRnL2hXN2s3TlpobkN3THNsZmhLVVJtM3pyY3F3QUFsaXpiR0ZXanJ0dXlqdVg2TG1qQy9EUC9OUEpOUk5zRUQxWkQ1TktKZkJIMnl0a2FZdHY4OEdQUU5XRXkzYXJWbk01Rzdzc1EyM0d5T3Y4NEd4V2UzTUlRN2xVQUFFdjFVK1N6RGxxeDVFNXloUW50eURhUllIcjA2RkhHWXdoT3BrN05FeUp6a3d0ZHluMFRKdE9sdmJIV1E5Q2pkZWo4NHd6SzRqeTI5NTZMc0RqbjY5YXh2VmM1Z2dFQVlDSG13S0tNdVI0akY2T3VHMUEzOElkWXRuWFFncWVSeXhqY1M1MmE5emEyVS9PR2dKc05vVXU1VzhKa3VqUGY3RjVGemtwaTdtYUliZWZmcTRBanE5M0lGdWZjeHhEYmM5OHQxQUVBbHVOOTVMTFNhZFNFRmdKQWhRa0xWMGRjWnl0dXozYjh3RW5zTlZ0bEt5N2crRXFYOGkvV0RuMFJKdE9OdmZPUm53ZDg5dHlJRG82cExzN0xxQ0NMY3g3Q1FoMEFZRGsyOCtkajVMSU9sdTd2c1h4R1hTOWZ4aEhYSDRKYnE5M0laWSs4TkZ2NWVlVytWckdkcHJjS3VpQk1wZ3QxODkzNXlGeG5pRzNuM3pyZ1FDek9PWUpWYkJmcVF3QUFjRFoxMVBYUGtjdDN3V0xWZDRCV2pyOVpCMHVXcmREOVpYQnJlOTNJcTRDSEcySzdUMldhWGdlRXlhUlhGOXhHeS9JMUpleDc0K0hISWN6WFVha1l0empuR0liWW5rOWp5Z1lBd0htOWkxeU11bDYyVmJURHFPdUZTanJpZWd5K1NzTURSMWFtNmIweW1TSTNZVEtwQ1pLNWgvTHdlK3ZoeDMzVWNmcHZZanYyempYRU1iMVMvQUlBY0Q2UEhqMGF3NmhyVHFlRkVkYzdqKzJwTEZhMm9IK2M3OFZUY0NQZHlKeElhWG93VFM4eFlUSnBDWko1Z0ZLcCtROFBQKzVpdmw3S3lMR3lPRjhIbk1hbnlzOEFBT0JjWGtjdUxRV1czYWg3RTZ0b1J3bVNzNDFTYmw0TitOZVJTN2JqQmc1cXIrRkJOektuVXZaR0JjcEpDWk5KU1pETUFRemg0Y2N0N1ZWNURnR245WHkrL3Y2aDhoOEE0Q3graWx6S0dOUlZzRFNyYUk4enVKY25XOEQvOGRHalI1dmdTaG9lT0tNaHRudnFqNE5VaE1ta0kwam1nSWJZZGloNytIR2xXdVg1TnZKdEl0RVdsWjhBQUdjd0J4bGx6UFVZdWF5Q3BXbXhZL3lwZ3RmRnlUYmlPdHU1OVFkVEd4N3NqWE5PUTJ6M3FVeXBTRVNZVENxQ1pJNmd2UHg0K1BFSDlYNVRxanhkR3l5QlFCa0E0RHplUnk1R1hTOUlEV1JYMFo3eSsxYVl2eEQxT3NxMmQySEU5U1cxNGFFY2hXV3NOVXRRcnNHMzh6VnBYWkdFTUprMDZzSklrTXd4ZVBqeGhWcGNZS3cxU3pPRVFCa0E0TlEyOCtkajVHSFU5YkswSEFBcXZGNk9iTitMNmRHalIyUHd1NzBHcStjQnk3S3hwNTZETUpsTXlxalpJZUI0UFB3b0MvUWZZM3UvVWVYSkVnMGhVQVlBT0prNjZqcGJkN0lRY0RsYUhrMXMvMlE1c28yNHpuYlBmWkI2UEY4SmtrMERZS25zcVNjZ1RDYUZPc0pqRlhCOEhuNGRxL2VhaTRCbEcySWJLQ3Q0QUFBNGpVM2s0cDEzT1ZiUnJtOTB1WjlmMGhIWFB3V2YxRDFLa3pwcHdjWXpvVzNDWkpwWHV3U044T0NVUFB3NlU4K2RNUzZJbGd3aFVBWUFPSWs2YmpYVHFHc2g0QUxVNDVWYVg4L3JjaisvYk4rRGNiN25Uc0Z1VDN3VEp1ZlJqcmUxazU0R0NaTnBXcjM1WEFTY25vZGZKK3E0NEhJKzhpcWdMZVVlOVNvQUFEaUYxNUdMRVBEOE1vd20xdVYrZnRtK0J6OEh1eUQ1SXFBdHBmRGhyYVBaMmlSTXBsWGYxQ0R2YmNCNWxJZWZjMG1UcTk5ZjQ0Sm8yYnFPWndjQTRMZzJrWXNROFB3eUJQcTYzTStvN21tc0lwY3hPamQvWDkrRUlKbDJEV0ZQdlVuQ1pGcFZndVRTS1RnRW5JOUFPVEZCTW9rOG42OW5JOW9CQUk2b2psMGRJdzhoNEJuVlAvc3NvMnRYd2Jtc0lwZE56eU91NnhGc0pVaGVCN1J0Q0UyQ3pSRW1BenpNRU52eEhNNG5TYVJPUGxDd1FpYXZiQVlDQUJ6ZCs4akZxT3Z6eWRRWnJzdjlmSXk0VHFMdU81YUdoM1ZBRG85TjBtdUxNQm5nNFp4TG1rZ05rc3NDWFlFQTJUaVhCZ0RndURiejUyUGtJUVE4bjFYa01TaHNQYjJFSTY2blI0OGVqZEdodlNENWNVQXVKdWsxUkpnTWNCamxYTklmZzZZSmtrbXVYTmNtS1FBQUhNa2NkSlFnT1ZOM3NsSFhaMUQveklmSVpSV2MyaXB5R2FORGdtUTY4S3J1eDdKd3dtU0F3N253b3QwdVFUS2RLTmU1d2hjQWdPUFpSQzVHWFo5ZXhvN3c3NEpUeTNZZHZZek9DSkxwaU1hSEJnaVRBUTdMR05rRzFlK1pJSmxlbERGQ05nVUJBSTZnam1GTk5lcmFCdS9KclNLZmxiMlMwMGs0NHZyRGZHK2RvaitDWkhveHpKODN3YUlKa3dFT3E3eGtlL2cxUkpCTXA5N1l6QUVBT0pyWGtVZDVUeEptbkVpZG1EVkVUZ3BhVDJjVnVXUzZwOTdLZkM4b2U0dnV2ZlRrcWZPVGwwMllESEI0cGVMMlZiQjRlMEh5RU5BWGhTOEFBTWZ6TG5MSk9IWjVxZGFSMTkrQ1U4bjJNenRHUitxZTRqcWdQejlxZkZndVlUTEFjVHgzZnZLeTdaMDlNd1QwYWFYcUV3RGc4QjQ5ZXZRaGNvVWZUNDI2UHBuTVp3dXZYRWZIbDNERTlmdWVSbHpQMzc4ZjV5L2UwK21WeG9jRisxTUEyVXhYL0wxdndnamZjeWhqWlA4Nkwzb3puWmVWaVNCNW1hWXIvcDU3MlBHWW9nQUFjQnp2STArZ1U5YmlxOGpYY2Iwb05RVE1QdFoyUFg5K0NvNXBGYmwwYzkrcFFmSkZzRFFmNitleUlUaUdVbmowVzdBNHdtUm9RM2xnVGZPblZEZi9iLzI2KzN1ZkhtaTNEU3hyRldqNURQVnZEZlh6NS9yMWNRaHREbVdZUDJVaCtDSllsRG95eU5renAzSDUvalh0L2IxcDkrL2NwZWlpYnJKOHMvY1o0c3Y3Mk82ZkF3REF1V3hpK3o2WVpWMzZRd2lUaisxcDVGZEdYUXVUanl2VGlPdHAzaXZZUkFmbWZZN3k4MzhSbk1vVW4vZlgveDFmN2xYZGFhKzkyQnZOWEw1K3MvZjEyL3JWZmp2TkV5YkQ4cFFIVlhtWS9UTzJZN0UrSEhLY1MzMFE3aDZPVjZxQjgrUDZLU09XaGhDODNWY1pkMTFHOG96QkloZ1pkRlJUYk85Yi82eS8vbkNNY1ZTMytkOTBId01BNEp6S3UvZThKaDBqVDBENHVLeXhUZDQ2cWg3T0ZGNjVqbzRuNFlqck1UcFF2MjlHK3g1SHVkZU1zUTJNUHgxQmNlUjlxdW02ZjJkdm4ybzM3ZVBiRURMVEVHRXlMTU00ZjM2TjdRTnRqRE9yaS9xeGZqNVZqTzZOV3lvdndydGdodHN4N25vaDV1L0RPbFI2SHRJWTIrQzRkQ2g4V05JMWZzMTliTGR3WDhYMlBtYlJEZ0RBTWIyT1BHRnlXVGVYLzVaTmNIQUpROENidUk2T1p4VzUvQnpKMVovOWNneWJ2WW5EbUdKN3pNVFJndVA3MnR1bktuNmY5REZmQTd0R2lML1ZyMFBBQWdtVDRYekcyQzZLM3JVUU10YUhiL2w4ZXRqVkI5MDZ0Zys2SWJqSkVOdE8ySXZnYk9vQzNmbXdEMVB1VlovdVc3R3c4UGcyTGdYTW44elh4U28rRjhub1hBWUE0R0JLc2ZpODNpeHIwQ3doUVJtZnV3bU9ZUlg5Y0IwZHp3K1J4OVRKbEwrM1lWLzFJWFlUUGt1QS9HNUo0ZkZ0emIvbjh2c3ZuMDM1Njcxd3Vkd3JWd0VMSVV5RzB4cGorM0RidE42bFdoOTBKU0I5WHNPWWRXeURaWlYwVi90aC9uUDZTWGZ5ZWFqMGZKQnl6WmFPaWtWTVRqaTArdDlVUHZ2ZEFCYnNBQUFjU2xsTC94ZzVHSFY5UEpuT3VmMGExOUVSN0UwVXpPSjFKRmVQWVZQVWZuZmwzbEdhSEVxelEzT05EbCt6SHk3WENYdXIyRFpCMkhmbnJQNGpnRlBZeko4bjg4T2dmTklGaWlXTW1UL3IrWmQvbVQvUDRvYnpJVHBXSHZhNllzK24vTmtQd1czdEF1Unl6L3J2K1hQUlEwVndxV0NkUDZYWTUwbTRud0VBY0JqdklvL3lYcnNPRHFxekVkZkZMaHpoc0xLTTFOL0pkTy84Zy9ubnZuU1JYd1IzTWM2ZkYvUG5ML08remJPNkg1MjZLS1g4OTgyZjBuRzlMdnR6ODkvNlBwTC9iTEJjd21RNG52SXdlemwvL252M2dJdms2Z091QkRGQ21LdXRheGMzSjFRclBiTzlWQjNMR0o4WDVzODdHU2wxcGIxZ3VkelAvaHJiaWxlVjh3QUEzRW50TUJvamo3OEZoN2FLL3JpT0RpOVRkL3VpenJvOXRGcEFjaEhjeG01Ly9hOVptN1R1b2diTEpWQzI5ODdKQ1pQaDhIWVB1Yi9VYnI0dUgzQkM1V3RsR1cvV2hCcmVYd1JmTTBiaTZRa1BWVFlBNi9TRkVpcTdwd0ZBL0Y1NFJlTml1eGs1QmNmMlB2SlkxYkdiSEU2UHdlcFQxOUhoSkJ4eC9YTWtWYTk3eDdCOTNSU2ZteDNLL3ZxSDRIZVB2bXlBS05QMWRDdHpkRm5DNUkrL2JjTTdPTGR5NC83cm80NUQ1TXYySG14K1JyZFd1cE5Qbzc1TXZRbHVzb250d3Z6Sm80NjdrRy9yMG1LOWhNcGpBQUMwclJTN0RzR3hiU0xYbEp0MWNCQTFXT3B4a2xiNTczWlc3T0ZrdW9aMjUrRm01UmkybTQyeGJYWW9lMVdhSFc3aDBYYmM5NjViT1cwaEJ1ZlhlcGo4S1VUK3ova0g1ZjlNMDBYQStVeXhmZEI5L3lqeEdKYUhLQUY3ZUtqdDZFNCtqUklrRDhGVk52SDVqSmtwdUxOSG44OVdMcDh4QUFBYU00ZFk2eEFLbmtUZERNL1VWV1ZFOGVIMGZDU1Q0NmdPNTRmSTQxM1dBTEdlazd3T3JqTEc1NGw1WTNCbnRRRmlIZmJmT1pKbXcrUTVSSDY5QzVFZlRaTUtGYzdwWmEyV0dvTWI3VDNVeXBpU25uOXVkU2NmV1QwbmVSVmNOc1oyY1M1RVBwQmFBYm9MbGFjQUFHaEFuZUx6S25KYjJrWnFwbWxkUmwwZnpuZlJyMHhuL0o3Ti9MTllPcnlIeUNObENPYWM1R3ROOCtlWkVQbHdoTW9jUzR0aDhxYUd5TStGeUp6WkZIV2tkWEFuWlV4SmJNOGVuYUpmdXBPUHhBTDlTbE9vOER5cUdpbzdKeDRBYU1YYnlIMWVZNWtpczRrRnFldHdvNjY1ck9mdTNHOFUyaC9FT3ZLWUV1OVpPQ2Y1UytWNVdJcXMvcnEwNTNVV1FtVU9yYVV3ZWZ4Lzg4M2xUOVAwYkE2UnA0RHplaDNiaDEybU1WVW5WUjlvNVdIMk92cTBxcUVuaC9kTHNQTnBjVzU2d3VrNEp4NEFXTG82eFNmeldhVlRiS2RoTFZHbTkxK2pyaDlvL2xrc1FYTHY0WkpSMXcrWDZXZnhmU1JVbjd0RHNETkdiZEJ5SnZMeDdZWEs1VnpsS2VDZVdnaVR4OThpbnN3aDhwUC9PMDJDTzg2dFBPQmV6RGZnNXg1MmgxSCtMS1BmME9WNWNGQVc2RjhZdy9TRXMzRk9QQUN3UkoxTThmbCt3ZS9yWStSaDFQWERDZVNOdW42UWhDT3VmNHBrVE0vN1FuazJmMStuNWszQlNjMS81dTgwUC9BUVN3NlRmdytSLzg4MGpRSG5OOFYyVEd5NmhjMjUxZERsV2ZUbjcxNitEOGNDL1hlN29oZUw4elBicS80MCtob0FPTHY2N3BGOWlzL0xKVThRcTlPQ3hzaERnZlREckFLanJoOW1IWG1NU2Zjd1RNL2JlamQveXRTOGQ4Rlo3VFUvakFGM3NNUXdXWWpNRWsyeERaSjF4eDlKUFIram5LUGNVOGQzMmN6eDhuMDRGdWlmdTVFVnZTeEl2Yjg5Q1YzS0FNQjVaWi9pTXpVeWxTZlRHTmZ2Z251cEFlb1FGS3ZndmpKMXQ2ZDdYelk5NzVPeXovdHNmajR2ZVdwSWQycnpROW1uS3NlQytMNXdLNHNKa3gvTmkzNGhNZ3RWQXVTLzZ2QTd2aHJXbHdkWlR3OHhZNjBPd0FMOWs5ZTZrWmZyVXBleWhUb0FjRkx6ZW5rZHVRdFp5L3JxU2JSaEUzbldnNnM2SVlxN005NzVNMzhXOTVCd3hQVVlpWmllOThsdVQzMFRMRkp0UmluTlhWUEFWNXc5VEg2MHZWQ2YvZWMwL1VXSXpBS1YwUnRQVkU2ZFRvZUI4bU1qblI3R0FuMjdjVmJQSDJmaDlxWXdUQUVBY0FKMXZmeGo1UGF5bGFMS3VyK1FhZXJaT3JpUFZiQXpLRXE0bHg4aWowM0N3dmhYMGJmUzhLQTVxd0cxK2NGWnluelZPY1BrajcvTkYrajhHL2pybjZacEU3QTg3NHpnT0k4YUtMK0lmcWpDZlpqc0cyTTMyVlY1amtFekxOUUJnQlBMUHNWbjArQXhMNW5XZ1VaZDM1RVIxMWRhQjNlMWlqd3lqZi9mVFFONUduM2FqYlhXOE5DWWVsVEk5Nkg1Z1d1Y0kweitGQ0wvWjBUcFJMNTRORTJDT3Bhb0JEVFBnck9wM1h1OUJNcFA1NFhtTjhHZDFRWDZPdnBVemhNeTFycGhkYUh1ZkJvQTRHam05WExwWEZ0SFhsTTBHTXpXWXRCTW82NVh3VjMwR2pMZFJGSENIU1FyU0NqRjF1OGlpVTZtZ1Z4bml1MCsxU1pvVXYxWkxCTkRwNEJMVGhrbUM1RnB4UlJHV3k5Q3JTNS9IZm1WSUhrZDNFZXZDL1F5eG0vdFB0VSs1OU1BQU1mU3lYRXd6WXkzdnNMUGtjY3F1SXUvQlpldEZObmZTYVlKZDJQa1VvcTRodWpQcDJNTDY3UkpHbGJYVldXZktrMlJCNGR4aWpCWmlFeExwaEFrTDBvZGk5TERRc1RMNUIzTkw1clp4L1ZkNTBYdGFDV0p1bEJYK1FrQUhOb3ZzUzFjemVwMTQ5MVBtVFpwSGQxMFMvTjc3T013NHZvNjYrQzJWcEZIbWlhU1dzVFY0M2puTVV6T1M2VmtJK1g0ejNBOEczdU9IU1p2NWhENXIwSmtHbEd1VVErK1pTb1ByK3ozRUZXNGQ5QkpsOFZWbmpWNEhoeTNvUElUQURpa0Rnb3ZwMmo4ZmFDT3VoNGpoOEdvNjF0YkJkZFJaSDhMeVVaY2Ywald5ZHJqOUx5ZjUrK2h4cXlrYWpPTFFKbFBqaFVtbHhENUwzK2FwbWR6aUR3RnRPR0ZJSG1aNnZlbGh6T3MxOEZ0OWJaQTN4VzdiSUswOWlvL000MDhCQUJPckhZK1hrUnVXVGF1MzBjZXErQTJkSEZmVDVIOTdXUzZoakoxSlplejBOZlJsMDlIc0FXcDFVQzVoMzE1dnVMUVlmTDQyN3lnRnlMVG9KZENtbVdidnorbFd5OTd4NTRxM0Z1b1hjbnI2TWN1U0I2REx0U1hNWldmQU1DZDFTRG1iZVRXOGpuSmwyMGlqeCtDRzlWMzJjZkJUZGJCMTZ3aWp6SHllQlY5ZWVrSXRuN1UzS1JNMDlPQjNyRkRoY203RVBuSi81bW1NYUF0azRkZk0wb1ZWT2FIbGlyYzIrbXBLM2tYSlBkd2JqaDdqQklDQU82cGJHWVBrVmVxOS9mYVhUMUdEdDhZZGYxVlQ0T3ZVV1IvZzJRanJ0OW5LUXlhdnkvcjZPc3NkRUZ5aCtyZTVKTVFLSGZyb1dHeUVKbldmUXBxZ2liVUYrMFhrWnVYeXh2VUY2ZDE5T09aSUxsZkFtVUE0QzdxWnZZNjhzcjYvcDVwdmVkOTltYUMwcTk3ck1qK1JwbEdYR2VhUHRoVDA4TnJRWEsvQk1wOXUyK1lMRVFtQytja042YU8xUmdqcisrQ20vUzBRSDlXeDd2VHNmcVNsdVljS1FEZ09PcjQzT3hyNVV6anJYOVhqN1BKc2luclBPQnIxSi9SVmZBMUpVaFdsSEM5VmVRd1pUbHVzTE91NUovbjc5dnpvR3Q3Z1RLZHVWT1kvR2krMGM5Zm5nbVJTV0xqbk9SbVplN1U4OUowamRxVnZJbytPTWVkMzlXWHRaOERBT0I2YnlMM1puWjVmLzhwOHNxeTFqUHErbnFyNExZVUpWd2gyWWpyTWZMb3Blbmh3L3djWGdmRTc0SHlzNkFydHcyVFAvNi9pQmYvT1UxL21ZUGtUVUQ3U3RXdjBhR05xcFhiV1lPVjh2TDlPTGhLTHd0MFo4L3dCL1dsYlF3QWdFdm05NGV5VGw1RlhsUGtmMy9QTkpGSWdmVFZCS1MzWjlUMTFUSmRReW4yOURycVNwN216L2NCZTJvVFRQYmpLTm56dFRENTQyL3pndjAvSS83eWY2Y3Bjd1VvL1hsdHZIWHpMaUt2VmZDRmpycVMzd21TdVVGNWVac0NBS0NxbzNNdklyZVU0NjMzMVlMcE1YSVFtbDVpeFBXZGxTQlprZjBmclNLSHFkN3pNdWloNldHYVAwL3NvM09WT2pWR3cxNG5yZ3VUZncrUi84ODBYVHlhSmdkcWs4a2tyR2xmWGNSazdVNWVCWmYxc2tBM0lvWnJ6ZmU5c2g0cjU5Sk1BUUN3OVV2azlycWo0MTkralJ5TXV2NmpWWEJYaWhMMkpCdHgvVG9TNktncitYdEJNamVwT1l1ajJUcHdPVXdXSXRNRDFUSjVYRVJPM3dXLzY2UXJlWXB0cGFmbkxqZXFMM0hHU3dFQXUvSFdRK1ExUmY2dTYzMlpKZ0lhZGYybHZ3VjM1UnI2VXFad1BjdFkveDZhSGw3V3MzSGhhNTdQSDlkS2NyK0h5WE9JL0ZxSVRBZkdqcXFhMDZ1aFNxYXpwWGFjbS95bEhpcVNYNmowNUxicXk1eHphUUNnWTdYZzhpSnk2NnJZc3Y2M2pwR0RydEtxbnYwckdMMDdIZTVmeW5JTmpSbjJQanJwU241dHNpZTNWZGN3cGZGQnJwaFlDWk0zTlVSK0xrU21BN3FTODBreEh1Y0txMkIzdHRRNmNpdVZuaG1MSWppaWVpNU4xdnNmQUhDRHVrWitFN21sUHlmNUdsbjJMQVNCbjYyQyt4TEN4NmQ3ZnZseitDWnl5RElLTjN2QnpCUjlUUWJoQUV6U3krOC8valJOeitZUWVRckk3LzE4VXh1RFZPcjNkSXg4dmcySzdHT0RQcWowNUFFdXd2bkpBTkNqOU9PdE8xNGpsd2swV1JvOWRDZHZHWEY5ZjY2aHJTelhVTG0zTlY5STM4bFJiSTVoNDE3cVByMW12cVQrSTZBZm1jNGY0a3Z2STU5VmRLNkRydVFwVk96eEFQWGw3a2tZSXdRQTNhaWpOZGVSMTI1OTA2VzZ2c3ZTdWZlMGpuanVuZTdhKzlQaHZwWGxHbnFYSktETVh1VGdHRFllcEJZRWprRTZ3bVI2TWVwS1RtMFQrY0tVd1l0MytrQzkxOUY5SEZDOWhsUjlBa0FIYXJIbHE4ak5HamxCNTE1VjNtY2ZSOGRxRUNwUWY1aXV3M2dqcnBlbGc2YUhUVDFTQ3g3cVdXaDhTRWVZVEMreVZQWnloV1RWMi91RzZGdm1FZGRsZ2I0Sk9JRDZzamNHQUpEZDI4Z2RUTm5Fam5SSE9mVStwdGlZNW9mcmZVeDRsdi8rS1VtVHp6cnlta0toT2dlaThTRW5ZVEk5bUlRMlhjaFN2YjF2RloycUZkeEQ1RFNGQlJXSHArb1RBQktiMThlbDBESnpsK2NVMXNqN2ZvMGNlaDkxdlFvZWF1aDExSFg5MmNuU21aM2xlTHJNQlNJbWczQlFHaC95RVNiVEF5K2tIYWdWanVsR1hVZS9MTkRoRGxSOUFrQmVkYXptUmVSbWpmeWxMQjNhbWNLd08wbGVJSDFxcStoVHBoSFh6ZC9UNXAvcGRlVDltVFk5ajJQUitKQ0lNSmtlakVFdnNvMjYvaTQ2bFB3TW1uY1c2QnlMcWs4QXlLZDJwdjBTdWIyMlJ2NVNQY3BwakJ4NkhmVnN4UFhoOURycU9zdC85NWlrV0NqemRhZ3duYVBRK0pDTE1KbnNOcXFidTVKdDFQVVFmVnBGWGk4Q2pzczFCZ0M1bFBIV1ErUTFSZjZ1Ni90NkhUazg3blRVOVNvNGxNZTE2THdieVVaY045LzRVYSsvckZNV1RBYmhxRFErNUNGTUpydHNuYXJjSU9HbzYyODZmZW4rTVhLeVFPZm81bXZzUStUWmVBU0FydFdSbXM4anR5ZTFDNWMvR2lQSCsyMTNvNjdubjkxeXZ2a1FITkk2K3BMcFoyYU05cTBpcDJsK0JsOEVISi91NUFTRXlXUTIxWENSdnJ5UFhJYm9TT0tYN2lueW5Idkc4bDJFTTJrQW9HbTFDeXBya2VXT1lzc2IxSkE5UzRGOGJ5T2YxOEdoOVhZTVdKYVJ5bGttUnFadGVnZzRnWnJSYVBwclhJb3d1WFR1elovc0wxbmMzUmowYUl4Y0hrZGZmb2ljWHVxNDRGVHF0YVk3R1FEYWxuNjh0VzZvVzhseWxOT3FzNmxidlo3eGUwemRYRVBKUmx3MzMvQ1J1T25oM2Z3YzNnU2NUcG0yWTIrMFljMkh5Zk1OZlRWLytVYzRZNGMvVXUzU3B6Rnk2UzFNWGtVK2t3VTZwMVkzWjZjQUFKb3o3M09VQXN0MTVGVTJFcDhFWDFVN2VUNUVEdXZvUUowcU1BVEhzSTQrWkFtU3kxNUlob0tZckUwUEx3Sk9TT05EKzVvTms4dmliUDc4TXYreWZJYUFMeGx4M2FrNlBtZUtQUDRyT2xHTGc0Ykl4OWdnenNXMUJ3Q05xVUhVUmVUMnduanJPOGx5bEZNdjNicGRuUTk5WXIxY1Exbkd3bytSd3lyeXlUSituUGFVSXdCMUp6ZXF1VEM1anJSK05mL3lYNUgzOEhzZWJneDY5bXZrMFZObmNzWnp0RVpkeVp4THZmYkdBQUJhVWdybU00OXkzVmdmMzlsUGtVTXZZNHBiZXEvZHpKL3ZveDNwcjZGYVVMU0tISnJ2UU5UMEFJZWxPN2x0VFlYSmRkUlRDWkdmQjl3c1MrVXU5ek5HSGoyZEs3V0tmQ3pRT1RlTGRBQm94THpua2Y2YzVMQSt2ck82OFRwR0R1dElyQWFCTFJXRXY2NWppRnZxRWx0SGJxdklvVXlNekRDaVAyUFRnNjVremsxM2NxT2FDSk5MRlZBZGFWMHV0SjZDRmU1dkRIbzJSaDVEZENCcHRlZG8zRDduVmplSHBnQUFGbTFlRDVjQTZpSnlNOTc2L3JJVUNHWWZVN3lLZHV5SGZUOUhPN0pmUTFuQ3l5eUZRNnZJUjFFWFo2VTd1VjJMRHBQclNPczNzUjN6dEFxNG5iSGVsT2hVM2FCSWN3M1U2dWJzTWxaN1dxQ3pGQmJwQUxCZ2RXenIyOGh0MXdISi9ZeVI0eDAzKzVqaWx0NXJ4NzFmdC9TeitUanJOWlJzeFBVWWphdEZYa1Brb2l1WnBkQ2QzS0JGaHNrMVJDN2puY3BJNjNYQTNXUTZMNWY3eXpCT1o2ZUhpUXlyeUdYU2xjeUNiTUlpSFFDVzdGVWtIMjg5cjQwZFYvWUF0V0MrcGU3Um02d2pvUWFEd1AzcnFleWZ0UEsrVVBaSG5rWk9xOGhoVEJKWVpyek9ORDJ3Q01uV05kMVlYSmhjUjUzK0k3YmpuWXkwNWo3R2dJaC9SaDR0bmJsMFowbXJQUzNRV1F3amhBQmd1ZWExOERyeUY5RS9DUTRoUzJkMzFqSEZxMmpIRjhYUDlYM2hmYlRqdThncHk4UzJMQUZSdG50VmxwQ2ZQSDRLbXJLWU1MbFU4TlZ6a2N0bkNMZ24zWUJVbVRxVHMxdEZMdVhGZkJPd0xCYnBBTEF3dFpQeHg4anRwYzNydzZoN0hWTzBMK3VvNjFaSFhPOXNvaDFQczExRGlVWmNmOHl3SDFLL0g5a2FPelE5c0NoMWZUZ0d6VGg3bUh4cHBQVXE0R0hHZ0sxTVlmSVF1V1dyOXRRQnl1TFVib014QUlBbGVSTzUxL29mNWpYSVJYQklXVHIrVW8wOXI4SG1LdHB4MVhYVTJxanJiRUhmS25MSU1rRmhGYms0aW8ybFV1VFFrTE9HeWZOaTY0Zlloc2dYQVllUmFiUXhEek5GSG1sSC9qZjQwbjBiV1Y2ZXlNY2lIUUFXb2hiVnJ5S3ZFa3A5SHh4YWxta3oyY1lVdDNTMjZwV2hVaTArYmFrb1A5dDV0a1pjTDB1MnBnZDdBU3hTZlI2MVVzalV2Yk9FeWVWYzVEclN1aXlDbll2TUlZMEI4ZnVMVUphSDBYOUZYdG1xaVRmRytMRlVGdWtBc0F4MWZPWkY1UGJDdXZqd0VrMmJXZFdmZ3l4YUNwN0dHLzVaUzBGZ2x2QTEwNGpyVE4ydjJmYXF4b0RsTXVHeEVTY05rK3RJNnpMR3FRVEpxNEREbXdJK215S0hJZkxLVmsyY3BRcVh2Q3pTQWVEOGZvbmNOaG5PekZ5d0xPOGM2OGhqRmUxNGY4TS9hMm5LVnRsalhrVU9xOGdoeGIxcHZxNUtrRHhFSHBvZVdMcE4wSVNUaE1tWHprVmVCeHpKL0hETWRFNHVEMmZzK2ZKbEdtL21EQnBhc0FrQTRHenEzc2dRZVUxaG5PYXhsY0F2dzdTWkZPK0M4ODkwS1pCdVplcml4L21kOWRyQXVNSE85eXpGNlZtNnJEZVJ3eXB5MGZUQW90VmloekZZdktPSHliVks3Qit4SGVGa3BEWEhKRWptc2lseUdDS2hlbDV5cHRGQlk4RENXYVFEd1BuVS9aR0x5TzJaRHFqanFvRmZobkJnbGFTenRLVVIxN2ZwUEg0ZjdXZytoRTAwNG5wTWRPL1g5QUNuMTlLenAxdEhDNVBMdzdDZWkxdytROER4L1R2Z1MxT3daTm5Pb05HQlFTdCtEUURncEdwZzhDWnllMm5UK21SYUdrZDhrMVcwcjZYdTJOdHMxbStpSFJsR1hhOGloMHpkcjZ2SVl3eG93eVpZdklPSHlaZEdXcThDVGtkbk1wZGxHUDFWWkozcXNJbzhQdWpBb0NHYkFBQk9MZjE0NjNrOWZCR2NSQTN0cDJoZjA1MmxOY2hzNlgxOS9OcS8wT0NvNjFXMDdZZklJVVdCU3owdk9kTWUzT3VBQmpUNDdPblNRY1BrK1lhN2ptMklmQkZ3ZXNKa0xwc2loNnhoY3FiUlFjNmdvUm0xOEdFS0FPQWs2bDdKT25KN0VweGFobmVRb2ZITzBwYkM4UGQxcy81Vy8yNjBvOW1DaERxeElzUEV0czBkcnEybHl6UkJyeFI1MlN1bkphYm9MZHhCd3VTeThLc2pyY3ZJSnVjaWN5NVpGaTRjam10aTJaeVhET2ZqUEJvQU9JRWFGcnlLM0Y2YTBuTVdQMFVPcTJqWEt0cHhsODdSVGJTajVZS0Vsa2FrM3lSVGNYMm1wZ2Z2L0xRbXl4RWVhVDBvVEs0anJVdUFYSUxrVmNCNXFiYmlDNWsyTk1yOU5oSkpOanBJdFNjdHNrZ0hnTk40RzdtTDdrZmpyYzhqMFVqSUpzZjgxZ0J6aUhhTXQvMFhqYm8rbWFiSHZGZFRIYnVmUmFhbUIrLzhOS1h1cldvTVc3QjdoOGw3NXlLdkE4N3ZZNktSS2h5V2M1T1hhWWc4Vkh2U25QckM3N2tKQUVkVTkwMHliVXhmTnMyZlo4RTVaWGdYK2FiUnp0S1dnc0R4SHNYMkxZMGJiYTZiTk5HSTZ6Rnl5ZkxNemhieTB3L0hDQzdZbmNQa090SjZkeTZ5a2RZc3hSUndOV0hKTXEwaUQ5V2V0RXBIUFFBY1NRMEtMaUkzNDYzUGJ4TTUzbmxiSFBlN2luYmNaM04rRSsxWTFYdHVTN0tNdUg0WlNUUitmdnRsWTBDYjdGTXQySzNENVBKUXJ1Y2lsODhRc0N3Q1E2N2oybGltYnlPSGo2bzlhWml1ZWdBNGducEV6UytSMjJaZUIyK0NzNm9UMmpKMDhUUTE3cmNlMnpSRU84YTRvMW9vTWtZN1dndG5NNHk0L3BDc29DalRKQkh2K3JSS3c4NkNmVFZNcnVjaTcwWmFyd0tXYVFxNG1qQjVtYklzMGxYTTBUTFhMd0FjUjlsREdTS3ZLUkoxb3lXUVllTzF0VkhYNjJqSCtJREFyNlZSMTMrTFJpUWFjZjA2Y2hraUQrLzZOS2tXeVUzQkl0MFlKczhQdDNWc1ErU0xnR1g3MzRDci9UdFlsUHJpbE9XWUJOV2VOTXU1eVFCd2VIVWY1WG5rOXN4NDYrVkl0S1pycWJPMHBUTjZIOUs1UGtZN1ZuVXFSQXV5UENQR3lDWExCTDFzSGVQMHA2VkNwcTVjR1NiWGM1SExTS1kzNFZ4azJtQXpITm94UkI2cVBXbWRheGdBRHFRV1RmNFl1YjEwek1zaVplZ1FiR0xzYjROZHBXUGNVLzFabjZJZDYyaERNMTNVTjNpZk1MRE1Na0ZQRUVmcjdGTXQxQmRoY2gxcC9TcTJaL3VzQXRveEJkQ0tMQXQwNXlXVHdUOERBRGlVOU9PdDUvWHZSYkJFUDBYN1dobDEzVklIOVNFNkZGczZrM3Z4SVcyRDUyMWZaeE9KMUs3MkxBMTFZMERieG1DUmZnK1Q5ODVGemo2T0NlaUxydlhsR1NJSGxYSms0RG9HZ0FPWTkxUitpTGJPVWIyUEo4RWkxVE1HeDJoZkMwRnRTMTJsaHdpQ3gyaEhDNk91MTlHK1VsaVU0YXoyZlZtYUhncnYrRFJ0dnIrVWE5aCsvZ0w5UngxcHZUc1gyVWhyV2pVRlhNM0RaM215bkVPam81TU14Z0FBSHFTT3ZiMkkzRjQ2ZzNIeDNrZjcvcjdrTUxEK3JLK2lIUThPL0JvOGszdnBCUWtaUmx5UGtjOFFPVXllMVNReEJZdFRPcFBMU09zaEFPQTBoc2hoREdoY2ZkRlVkQU1BRDFQMlZUSVg1NC9HV3pkaEUrMnY2OHJQMFpJN0JGZlJqZzhIREpWYUduVzkyTE8zRTQyNHpuQkcrMlZENUtEcGdTeGN5d3YwSHdFQXB6VkVEbE5BRGxNQUFQZFNqd3diSXE5cC9qd0xGcStPdWs3Um5Sekx0ZVRmMjJXL3h1RzBOTkw0OFlLNzI5ZlJ2cW1Pb00wbXl3UTlJNjdKd3JXOFFNSmtzcGdDV0x4YWladkJ4NlF2VVBSSnhTY0EzRU5kMjE1RWJzWmJ0MlVUN1h1NnhEQ3d3UkhYbXppUXhrWmRsMnRuRmN1VVljVDF5OGdweTNTUk1TQ0hLVmdjWVRJQXA1UmxnUzVJSnBNcEFJQTdxV0hYMjhodE00ZEltNkFaRFo1dmU1V2xqcnBlUlR1TzBUM2EwcWpyeFlXMjh6TmpGVG1tV0l5UjB4QTVPTUtLTE95N0xwQXdHWUJUR2lJSG5aeGtNZ1VBY0Zldkl2OTQ2NndkYU5sbE9NLzB4MWllbHJwS2p6SHV2S1ZSMTB2c2JtOXBSUHAxeHNTVEtvWm9ud2w2cEdFcXpqSUprd0U0cFNGeW1BTHk4TUlKQUhjd2h4VHJ5SEgyNVUyZTJjaHIxaWJhdDZoemIrdnY1V20wNCtEQmI0T2pycGZXM2I2SzlyWFVuWDVyZFlSOUJsTkFMbE93S01Ka0FFN0ptR3RZSHFPd0FPQ1c2cWJ6RXJzbUQrbGxEWTVvVUMwQ0dLTnRTd3R2V3dxU3B5UCsvQjZqNC9sWUZ2TTlTekxpK21QaVl3K0d5T0hmQWJsTXdhSUlrd0U0cFQ5SERzSTMwdEIxQkFCMzhpYVNqN2VlMXdZWFFldGFDdjJ1czZTeHdOOUZPOFk0bmsyMFkwblhUNFlSMXkyTk9iOHJUUSt3VEFva0ZrYVlETUFwWlZta1R3RzVUQUVBM09pMzMzNHJIY21yeU8xSmtNRW0yaStBWGRLbzY1WTZrNDg1aXJpRVZjMk11cTRkd1V1d2l2YWxISEZkWmRtbjB2UkFOcTdwaFJFbUEzQktHUmJwWmJ5VEJRM1p1S1lCNEFaMXZQVkY1UGJTeEpJYzZ2dEs2OTNKNWQxeEhXYzIvK3cvalhiZVk0ODU0bnAzWGJYVS9YajJJb0FrSTY2bjVFY2ZESkdEem1TeW1ZSkZFU1lEY0VvWnd1UXBJQjloTWdEYzdKZkliVFRlT3AxTnRPOXZjWDVMK0QzYzFoakgxMUtINmhMR1MyY1ljWjI1S3prVDcvUms0NXBlR0dFeUFLYzBSUHNzWnNqSVdUUUFjSTA2M25xSXZLYjU4eXhJcFhZU3R2N3VzbHJBcU90VnRPTVUzZWpsN0Z5anJtOXZGZTNiUkc1RDVHQ3ZpbXhjMHdzalRBYUF1L25mQUFDZ0N6V0l1SWpjakxmTzYzVzBieDFuMHRpSTRuSWMwN3M0c2daSFhhL2lUSktNdUI0OUg5cmcrMFJDd3VTRkVTWURjQklMcUNnL2xQOEp5R2NLQU9BTDlaemtONUhiWnQ2QTNnUlpIVDFjUElGempwbHVhVVR4S2IvWExaM0hmYzd2b1JIWGJmaHp0RS9vUmtaVHNDakNaQUJPSlV1WWJCd3dBRUFmZWhodi9USkk2OUdqUjZXRGRJeTJuWFBVOVNyYWNjcUFkeFB0R0dwaDBEbXNvbjBaQ2xKNklFd0dqazZZREFBQUFMQm5EaC9XY2NieHVpZnl6RmpNTHJUVVJYcWRkWnhZZ3lPS3h6aVJPdXA2akhhczQ4U1NqTGplMU84MUFBaVRBZUNPdkV5UjBSUUF3Q2UxaSsxVjVGYk9TUjZESG15aS9YZVljNHk2ZmhydGVIK0cwSytsSW9YdjR2U011RzVIaGlsNlUwQSs5bDhYUnBnTXdLa01rWVBGREFCQWJtOGp6eEV0VjVubTRPa2k2RUtEWGFSWE9jZW82M09lMVh4WDV4aEZ2SWwybk9QNldVWGJwbzRLampJLzc2RlpKaU1zanpBWkFBQUFJRDUxSlpkemtoOUhiaytDM3J5TzlxM2pST2I3UUxrSEROR09rNGZKUmwxZmI3NStTbGY3RUcwYkF3RDJDSk1CQUFDQTd0WHgxaGVSMnd2bkpQZW5kaGdhZFgxN3EyakhlTWJ1clpaR1haL3krbW1wcS8wNkx3TUE5Z2lUQVFBQWdLN1ZFYWkvUkc3djV0RHBwNkJYclhjbnIyckJ4eW0wZE43dE9jKzFQY2Q0N2ZzNjVhanJsczdidnNvSFJVY0FYQ1pNQmdBQUFIcFh4bHNQa2RjMGYxNEVQV3NwK0x2T09vNnNCdFl0amJvZjQweHE0RGhHTzlaeFpIWEVkZXRuOEdZWWl3L0FnUW1UQVRpVjFzZXE3YlQrWWdoWEdRSUFPalZ2L3Evbkw4OGp0NWM2emZvMmYvOC9SUHZub0g0WHg5ZFNWK200Z0ovclg2TWRweGcvbldIRTlSaTB4ajRWNlp4d0dnbTNKRXdHNEZTRXlRQUFMRXJkcVBveGN0dk1nZE1tb0swemJxOXlpbEhYTFlXQjV4eHh2ZE5TeC92akU0eTZibjNFOWZzT0M0OHk3RlhacHdLT1RwZ01BQUFBOU1wNGEzcXlpZmFEazNVY1NRMnFWOUdPTWM2c2RyeFAwWVlTdUIwdDdLMVRMbG9QOVRLTXc3K3JMSTBQa0kwaWlZVVJKZ1BBM2Z3NUlKOGhBS0F6ODhiL0QzR0NNelRQN1BzNTdMRlJ6aWYxV3ZnUWJmdDdITThxMnJHRUVkYzdTK2lRdnExalhqK3RqN2llVExGbzFoQ1FqekI1WVlUSkFKeUtUU3hZcnY4S0FPaEk3VUM4aU54ZTFxNUIyUGN5MmpiTVA3K3JPSTVqQm8ySHRxU1I1V08wNHlpanJ1di9adXNqcnNmb2s3MHFnRnNRSmdOd0VvazZJb2FBZkZSOEF0Q2JYeUwzODY5MG1GMEVYREpmRjJPMEg1NnM0c0FhSEhHOW1ISEVqVjFUNWI3L09BNnY5U0M1YUtuRC9KRCtOeEk0d1hueWNHcERzQ2pDWkFCT0tVT2dQQVRrSTB3R29CdnpobXYyYzVMTG12dEp3UFZlUjl1TzBVRzhpblo4V05DSTY1M2VSMTFuR0hFOUJpM3pUazgyUTdBb3dtUUFUaWxEbUd5QlRrWkRBRUFINWlDNWRLUmRSRzR2RnhnMHNTeGp0TzBZbzY1YkNnTi9qZVZaVEtmMExSeTBpempKaU92V3g5OC94QlE1SEtQakhzN0ovdXZDQ0pNQk9LVVVZZkl4emxpQ2M2blhzMnNhZ1BUcU0rOXQ1TGFaZytTZkFtNVFPeERIYU52Qndyc0d3OEJOTEV4cm82NFBYSXlRWWNUMUdQM0tjaVNiZDNxeStYT3dLTUprQUU3SnVjbXdQRU1BUUI5ZVJlN24zaFI5ZDVkeE4rK2piWWNjVmJ5S2RwUnh4QjlpbVZvYWRYM0lBTGoxRWRkajU5TXM3RlBCTWczQm9naVRBVGlsZjBjT3hnZVJ5UkFBeXpZRVBOQnZ2LzIybnIrc0l6ZmpyYm1MVGJRZG9oeXl1N1NsTUhESlJRQXRqYm8rU0RIQ2ZBME8wWDVuY2t0RkFNY2dUSVpsR29KRkVTWURjRW9XNmJBOFF3QkFZbld6LzhmSTdmVWNKRzhDYm1tK1hzcTcyVkk3WEcvclVDRmVTMkhnWWdQYlRrZGRyNkp0SHowNzBweVovRzFBRW81ald5WmhNZ0NuTkVVT3p1MGdreUVBSUxjM2tYKzg5VVhBM2JVK0Z2M0IzYVUxVUd4bHczcXFnZTJTdFRRKy9SQkZCSWNjdDM0T0xYV1RIMHVhcG9jYXdFRUdKa0l1a0RBWmdGUEtza2hmQmVTaGdwbWxzUG5CZGY0cjRKN21qZFhTa2J5SzNKN1VMbE80azhZNlNhOXlpTzdTbHNMQU1aWnZFKzE0MEhqek92VmlGVzNyZmNSMUpEc2VZZ2pJUVppOFFNSmtBRTZwOVRGcU95byt5Y1FpdlgxWkFnU0JJZGZ4ek9WZTZrYi9SZVRtbkdRZXF2VXc2YUhkcGF0b1J3dmZxL0xPMzhyYWRIaGdNY0lxMnRaQ3AvdXBUSkdEZDN1eUdJTEZFU1lEY0VxWk9pYUdnTWJObXlmbFpWTkkwempkYUFEWCtpVnlLMEhBUmNERHREN205dDZkeFRWSUhLSU5UUVIvZFYzYTBxanJWZHhmNnlPdVcvbytIZHNVT1FpVHljSUV2UVVTSmdOd01zbTZKbFlCN1JzQ1lQa1V2WEJuZGJ6MUVIbVZ3T1pKd0FQVmdIS01kajFrMUxVUjE4Y3hSanZ1TmVvNnlZanJuNEtkZjBjT0FqaXlXQVdMSTB3RzROU215TUVpblF4V0Fjc3hCRnhObU15ZDFHRHBJbkl6M3BwRGFyMUQ4YjZqcmxmUmpwYkdrWmR1OTFZbTV6eXV3ZkJkcmFKdG8yZklGNmJJUVdjeXphc1Q5RmdnWVRJQXA1YmwzT1JWUVBzVVJlUmgxRFdaRFFHM1ZFT0JONUhiWmc0QmRKUnhTSnRvMjkvbm4vMDdGUjdWemVvaDJ2Q3hwYk50NjZqcmx0NzcxM0YzclkrNGJ2MnM5RU9iSW9lSFRHcUFwVmdGaXlSTUJ1RFVzb3dQR3U2NllRRkxVcS9mVlpCRmhqRFpQUlU0aE96anJhZjU4ekxnZ0dyNE4wYTd5aHJpcnAxTTYyaEhpK2RhdDlUdC90MWQvdVVrSTY3SFlGK1dwb2RDVnlldHU5TTltZE1SSmdOd2Fwa1c2ZmNkcHdaTDRDV1RwUkVtOHdmM0hEMUpwK2JyWlIxdEJVVDNZYncxeDlKNmtjSmRPMFh2ZFZidW1iUTRobndUN1ZqZHNWQjhGVzNiZUk3OHdSUjV0SFJ2ZzZ2WXExb29ZVElBcHpaRkhoWTR0RXd4QkVzalRPWXFROEF0MU1LRFY1SGI2emtBMkFRY1FSMmozUEtrazZlM0RRVHIvV0tJUnN6Zm0rWTZreHZzZGwvZjRkOXRmY1IxNjJla0gxeTlYcWZJd1Q0VnpXcnNDSXJ1Q0pNQk9MVk1uY210djBUU04rY2w1ekpGKzRUSlhNVjF3VzI5amR6WHl6Ui9MZ0tPcStWelZPOHk2cnFsb3NxV2c3K1dmdSszNnVaTU1PSjZhckU0NFVTeTdGVTVONW1XS1laWU1HRXlBQ2VWck9Mem0xbzFCMDFKY3M0WENSbHB6QldHZ0srWTd4M2xuT1RzYTdJbmRSME54OVI2eVBUakxmKzlsb3FDVy82ZWJLSWR0eDExdllxMmpjRjEvaDE1bUVKR3F6VHRMSmd3R1lCemNHNHluTmNxeUNiTDVvY3VWQzRiQW01UWkxQXVJamZuSkhNU2RkVDFHTzE2L0xWQXNONHpXaW8rYVRaTVRqcnF1dldnNDNWd25VejdWTTVOcGpuMStiMEtGa3VZRE1BNVpLcjQvQzZnUFY0dVdhb2g0RXQvRHJoRzNYVDZKWElySTBrdkFrN24xMmhYdVNkOHJkaDNGZTBZRTB3a1NEUHFPc0YwcHcvejlaUXBNRDIwTWZJWVRIeWlRYXRnMFlUSkFKekRHSG5jZGh3V0xNa3F5R2FLSE54UHVXd0l1RjRaYVR0RVhpVkVlaEp3V2o5RjIvNyt3SCsrSkMyZlliM1RVbWYxMXpyYlc1OUtwaXY1Qm5VQ1NLYmpKTllCYmRIMHNIRENaQURPSVZzMTdEcWdFZk1HU2RrRUVkaXhWRVBBbDRhQUs4elBzL1g4NVhua1pydzFKOWZnYU9MTHJnMEVHK3dzSGFOeDlSNDJSaHUrMXRuZStvanJNZmlhVEh0VnB1alJHc2NJTHB3d0dZQ1RxeStVVStTaGVvNld1RjV6bWlJSEk0MzVYUTBERkwvd0J6VVErakZ5Mjh4cjV0WTdSR25YeTJoWGVXNnNyL2xucTJqSG1LaVlwS1hSNlZjR2NBMmV0WDNaZThWSnQvTFB5R05sMURXdDBQVFFCbUV5QU9mUzhsbGNsMW1rMDRSNm5hNERsdXUvQXo1cmVkT1c0OG8rM25xS3RzTTgybGU2ODFvZTkzcGQ4YVFSMStleGlYWTh2YWF6dmZXT3VaYkdqWi9UR0xtc0E5cWc2YUVCd21RQXpzV29hemk5VlpEVkZEbDhHL0NaTUprL21EZjVmNGo4Nnk3anJUbXJPdXE2NVRCemRUa1FySCs5aW5hTWtVUmprOG5LZFhMVitxUGxFZGZUL0QzWUJMY3hSaTQvQkN5Y3BvZDJDSk1CT0pjeGNyRklwd1d0bi9QRjlhYklZUWo0YkFqWVV6ZWJMaUszMXpiOVdZaldPeG5YbC82NnBjN1NUQ091ZDFvcVR2amlXa2t3NG5vTWJxVVcwa3lSeHpmejlic0tXTFpWMEFSaE1nQm5NUy9TV3grZGRwbEZPb3RXTjBGV1FWWnA3cWVPRFdDUFRuVXUreVZ5bjZjMlJmNnduRWJNNzJ0anRCMUMvZTByZjcxazd5T2ZNZHB4dVFDMzlSSFhtVWFtbjBLMm56K05EeXpkajBFVGhNa0FuTk1ZdVZnQXNXU3V6OFJxRlgwV1JodXo0MXJnZDcvOTlsdjJjNUtMSjhudTU3VHYxMmpYNVZIWHEyaEh1dk50YTNIQ0ZHMjRYQ2plY2hnMzFUOTdiaS9ia1d6WG5RTU9aMWZ2dFVQUUJHRXlBT2ZVOHViRVZWWTY2bGlpZWwyMlhsSFAxMDJSd3hCMGI3NXZsU0RaeGhlZjFPdmhJbkp6VGpKTDlGTzBiVjMrejN3UEtldmdWcDRwSHhMZkMxcnErUHowN2xTZlAwTzA2M1Z3VittS09XYlBBNWJKVVd3TkVTWURjRTRaRitucmdPVlpoVkNtQjFtNjJZdzJwdENWekNlMW0rWnQ1Rlk2eHk0Q0ZxWjJ5by9ScnI5ZCt0cUN6Q09KVzNyLzN3VWM2MmhieGoyWG8wcHczN3ZLRDdxVFdacmE5TEFPbWlGTUJ1QnNhc1YxdGxGK0Z1a3NrUkhYZmZobjVDQkVwUGd1WU90VjVKNVlVTmJDVHdLV3ErWE94akk1NmlMYW10QXpSbEoxM0hJcjcvOWwxSFhwekcrcEVPR3kwY1NMZTh2eVhyVlQ5cWhNS21OcDdGTTFScGdNd0xsbHE3d3VpM1FqaEZpTWVSTmtIY1lHOXlKTGNjNFFvS2lBK1AwWnRvN2NqTGRtNmNab2U0MVJOcXRiS2ZZdFV3cXluZGQ2V1V2di8rV3M1Q0hhbGJuTC9kZ3lkblMzZlBZM3lkU3U1RlhRRkdFeUFPZVdjcEd1TzVrRlVlM1pqeWx5K01iNTgzMnJ6MUJoY3VmcWZTRDdNMnd6QjBldG4wbExjblhrcTFEcU5GbzZVL2krakYwK2pmSno2OC82bmhycm9yK3R4L1BhYWhXd0RPVW9nU0ZvaWpBWmdITXJsZGZaRnVtNmsxa0VYY25kbVNLUFZkQ3pWVURFbThqOURKdm16OHVBTmdpbFRtTVR5U1VONlpib1hTMEU0ZjR5Rm5jb05PZnNuSlhjTG1FeUFHZFZYM0F5anZMU25jd1NlRm5zUzZaN3FhN1V2clY4UGlFSE1LK2h5dk5yRmJtOU1ONmFWdFFBTVB2NDVYUHJZY1QxVGc4ZDJPZG1tc0REalpIUFNuY3lDNkFydVZIQ1pBQ1dJT1BMcE81a3prcFhjcGN5ZFI5OEYvUnNGWFNyZGl0Y1JHNnY1OUJJcHlldEVRQWUxeGo5MkFUSE5OVUNFQjZtUEtjemRuZS9DamdUWGNsdEV5WURzQVNieUVsM011ZWtLN2t6ZGRMREZEazhkdi9zVTkxZ0dJS2UvUks1bFUxK0JZZTB5UG5leDlWVEoybkdvNjZXUk9ISEFTU2VvdmU0RnA3RE9md1EzdldhSlV3RzRPenFJbjJNZkVvUUl0RGo1T3A0MENIbzBSUjVHSFhkcDZkQnR6cDVmajBKYUZEaWQ3WWw2S3FUdEY1TEFzL2pVZmh4T0ZtTFBGNHAzT1hVYXRHd2dzcUdDWk1CV0lxc0w1UFA2NElKVHNMWW9PNzlPL0lRS3ZiSmVjbWRxbWY0WFVSdUw1MlRUT05lQjhjd1JuL0c0QmhHejVtRHlqcnEyckZzbklObW04WUprd0ZZaWsza0hYWDFKdUIwZENYM0xkTW90bStEcnRSaW1GWFFuZnE5ejc1ZStqQnY4RjhFdEcwTTQ0bVBvYWNSMXp0WlE3cHo2L0ZhT3ByRW82NkxIelErY0NyenRWWUt4ZGRCMDRUSkFDeEM4a1g2cW5iYndGSHBTaVp5amJsZUdiL1duVlhRcSt5RlVHV2QrMzFBNCtvN203RHFzRDcyTk9KNkovbjcvem1Od2FHOWpKektlNWJHQjA3bFZkQThZVElBUzVKMWtWNjhFWXB3QXI4RXZjdTJLV2ZVZFYvK0huUm5YaCt0STM4aDFBdGpSMG5rWFhCSVBmOTVLa3c0ckkxbnpWR1U5NnVzWGZRYUh6aTYrUm96UFM4SllUSUFpMUVyc3JNdTBvZHdQZ2hIWklGT1VUZVFNdDFIdnd1NllNUjFuK3IzUFh1blF0bmMzd1FrVWQvWnB1QlEza2UvRkNZY1ZzL1gwdEYwTUpGQjR3TkhVOWY2RjBFS3dtUUFsdVoxNVBWYzFTZkhZSUhPSlptNms1L2EzT2lHZ3FzK3ZZM3RtTVdzcHNnOWVZZCs2U2c5akRMaXV0dEF0WVowWTNBSVU4L1gwZ2xrL3JNZHdqcWM0ekU5THhGaE1nQkxrLzBGU05VbngyQ0J6cjUvUmg3bGZ2azQ2TUVxNkVxZHFKSDk1OXQ0YTdMNktUaUVYd1BkdEljeEJrZFRKektNa1pmR0J3N085THg4aE1rQUxNcThTQzhkZFdQa05ZU3FUdzdJQXAwclpEczMyVG02eWRVemM0ZWdHNTFNMUhpcFM0eXNkSlFlakh0RXhDWTRoTXdUM3BZaWUrR0R4Z2NPeHZTOG5JVEpBQ3hSOWhjaFZaOGNSTDJPTGdLK2xDMU1OdW82UHdVREhhay96OWtuYXBSeG94Y0J1UmwxL1hEZGg4a0tFdzdpUXkzSzU3ZzI4K2RqNURXRXhnY09vSk8xZnBlRXlRQXMwUmk1RituRm0xcXBCL2RTcjU4M0FaZlV6YVJNOTlEeU1yb09VcXIzc2xYUWt4NG1handKeUs4RW9kbmYyWTdwZlExU01lcjZvWFFsbjBEOWVlMmg4ZUY1d01PWW5wZVVNQm1BeGVsa2tUNkVJSkNIZVJVVzZGd3ZXM2ZDMzRLc2RFQjBwSTQwejc1SitkSTV5ZlNndnJQcFRyNC9JNjQvMndRUE1RYW5zb244ZnRUNHdIM04xODRQa1grdDN5MWhNZ0JMOVZQa3IzUmYxZk51NFU3cWRmTTA0SHIvakZ4V2pnZklwMjVVcllNdTFPOTM5blhQYUx3MW5SR0kzdDhZZkdMVTlZT01DcGhPcC81Wmo1SGJweEhGamhuaXJweVRuSjh3R1lCRnFpK1VQWXk3dXBnWFhFSkJicTFlTHhjQk54c2pIL2ZLZkJSVTlTWDd5THRwL2p3TDZNajh6amJHOXRybmJnU0FmL1JyY0IrbUE1emV5OGh2aU8wa05MaVZHaVNYYzVJVklTUW1UQVpneVRiUkIrY25jeXZPU2VZT3hzam43eXJrODlDVjNKYzY4bTRkdVJsdlRhK0VXWGZueit5UE5zRmRUZk56WnhPY1ZDMmlHU08vdFVsNjNNSGJjQXhiZXNKa0FCYXJvMFc2TVVKOGxVcFA3cUpPZDhoMmJuSzU5cDIvbElmTnFVNTBNdkp1WTBPZmp2MFUzTlVZZktFVzQwekJYWXpCdWZUUW5WeVlwTWRYemRkSTZXSi9IS1FuVEFaZzZYcFpwQSt4RFFyaEQycWhRYmsraG9EYnl6Z3U4QWVGTisycjUxK3ZnMTVrTDRTYW9wLzFLdnlCODI3dnpJanI2K25Zdmh0L1htZlMyWWovTWtsUFVNaVZhdmU2Z3U5T0NKTUJXTFNPdXBPTHgvTkN6QWhqcmxLdWl5SGdic2JJUjNkeURwNTFuYWdiVEVQazlrd3dCUEUrdUMwQjRQWEc0TGFtdWxmQytmUlNTRmJldjk0Nm1vM0w2akUyRjBFM2hNa0F0S0NuYmcvbjB2Q0ZXbUJndEJUM01VWk91cE1iVmpjZGhpQzkyc1Z5RWJtOXRKa1BuMnptejhmZ05zYmdTcDExZXo3VTYrQ3M2dkVXVS9SaGlPM1JiRU5BZkZybi96MGNjOUVkWVRJQWk5ZFpkM0p4SVZDbXFHZlByQVB1SWZIWVNkM0pqYW9iVUw1M0hhZ0ZIMjhqdDlJVmRoSEFiczJoNC9iclBwaGs4Rlc2M0cvblhiQUVQVFUrRExIdFVGYlUyN2w2anZZbTZJNHdHWUJXOUhZV25VQzVjODZlNFVBeW5wdGMvS0F5dmtrOWpEeG1xeFJERFpIYmt3RDJDYmUrVHVEK2RhNmpyM1B1OWtKMDFwMWNsS2t6dndpVSsxVW5Eem15cUZQQ1pBQ2EwR0YzY2lGUTdsVDl2bDhFUE53WU9aVU5EQyt4RGFuanJkZEJldlAzZWgzNXY5Y3ZiZVREbCtyN21sSFhOeHVERzdtT2JrVlJ3ckk4aTc0SWxEczFmODlYODVkZll2c3VUb2VFeVFDMHBMZEZlaUZRN2t3OUkva2k0QUNTYjhpdDZnc3RDMWU3eUMrQzlPcjNPdnU2WlRUZUdxN2xITmZybGRINEg0TGJFSmJlVFBmMmduVGErQ0JRN2t3OUkxbVEzRGxoTWdETnFCMGdQVzVRQ0pRN1VGN0VhcEM4RGppc3pCdHliMnhpTk1IR1F6L0tjMnlJdktib3M3Z1JidXVuNERyT0FyNDlZZW4xTnZXTWNwYWx0MlBaaWhJby84UFJRL25WQ1ZPYm9IdkNaQUJhY3hGOWpyMFNLQ2RXdzdBU3Rxd0REaS96aHR3UTI3TlpXYWo1L3RiRDJibkU3MGMwckNJMzQ2M2hCalhrR29PcmJJSmJNZXI2UnJxMkY2alQ3dVJpaUcySDhoQ2tWTmYzQ3NYNFJKZ01RRlBxQmtXdjQ5TktvS3dMTDVuNjR2V1AyRmIyd3NGMXNDRzNubitPbmdlTFV6Y2ZmRzg2ME1rbzg5SU50Z25nYTNUZy9wRVIxM2NuTlAyanFhN3JXYVl5dWFUSElvZ2hCTW9wMWFMZ2k0QkttQXhBaTBwVjNCUjlXb2VGZWhyMXZOY1NKQThCeDVWOVErNUg5OFZsbWI4ZlQ4UG1RMDkraWR5bTZIT0VKZHpISm5TVlhqWUdkMlhVOVIrTndXSjFmQ3hiTWNSMjVQWFRvSG4xQ0xheXRsY1V6QmVFeVFBMHAzWW45M3hlWGVsZ0ZTZzNycDQ3NHh4UlRpWDdodHluVWZFbU55eERmVDY5Q2JwUU85Q0h5TzJaOGRad08vVmRUWGZ5bDNUWjNsM3A1RmFVOENWRlRjdlhjK05EZVE5NzYzaTJ0czNmdjA5bllVZitvMnU0QjJFeUFFM3ErRXlhblNHMmxaOHFCUnRUcXp4THlPTGNHVTZtazdQbmh2bnpOamlyR2lRcmxPbEVuYkJ4RWJtOU5GWVU3bXdUN0JoTmZBK0tFdjdnZzZLbTVhdlg3WXZvV3ptZTdaVWkzL2JzTlR3TUFWY1FKZ1BRc2w3UHBOa3BpL05YOVJ3VEdyQjNQdkk2NFBSNkdMdTJjazg4bjcwZ2VRalM2NlFEdllSQUZ3SGNTU2RGYkxjMUJ2ZGwxUFZudlk1UGJzNTgveXZYN1JoOUswMFAvekJOcncyMTRhRzhRNWVHQjBVQVhFdVlERUN6YW1XdVVVL3pRbjFlK1AzTFFuM1phcFduODVFNXAxNjY0WjhicjNaNmd1UXU5VERlK2trQTl5WDgyakxpK3Y3R1VKU3dNd1l0NmIzeG9SaGlHeWl2ZzhYYUcydHQ2aUZmSlV3R29HbHpvRnpDa1RFWXd0anJSU29CeS93cEFZc3FUODZxamwwYm93OFhBdVhUcVpzUWd1U08xSTNCZGVUMjBraFJlSkJOWU1UMUE5UzE2NGZndmVkUld6USsvSzdzZjd3cHgzeHBmbGdlRFEvY2xUQVpnQXg2UDVObVp6ZjIya0o5SWZZVzU2dUFaZWhwVTBPZ2ZBTHpuL0hURUNSM3BhNHhzbytUSDQyM2hvZXBZY29ZZlJ1RGg5TFpyVENqU1JvZnZyQ2VQNy9NYThoVmNIYVhHaDdnMW9USkFEUnZYcVNYYW1WVm41K3RZN3RRWHdkbm9SdVpwZXJ3RE1NTFp5Z2ZUdzNyMzRiN1hHK3lmOCtuMkk2bkJCN3VmZlN0OS8vK1ErajkzT1NwbnNGTG00eTcvbXlJN1Q2VjVvY3pxV2NqbC9lM2Y0V0dCKzVCbUF4QUNyVjd4QWlzejRiWWpoUDZ4VUw5ZFBZVzU3cVJXYkxlempBc1p5aS9kUzg4bkhxdmV6UC84aUxvU24zR1BZN2NqTGVHdzlsRXYwSEtSeUhndzNWMlRNdFZ4cUJaeGwxZmFSMmFIMDZ1ZG9XWGZhcUxnSHNTSmdPUXlmZWg2dk95MWZ6NVY5bjhGYVFjVngzMXVsdWM2OUpqeVVySGZHLzN5aytqbU4wSEg2NmVqMXp1ZGV1Z0svWG41eUp5Mjh3YnY1c0FEcUlHZ2IxMjV3cVNENmZuRHUvZWlrRFRNZTc2U2tOb2ZqaUp2YWw1amlYaXdZVEpBS1NoNnZOR0Y2SDY4eWhLaFdkZG5KZXhuMFBBd3RXTjNSN1BueHRpVzF6elBMaVh2Y2tMUTlDVjBvMGUyMDJvekthd2pvUmoyRVNmZmcwT1pSTjltdXFSWHJUUHVPdXJyV0w3Zm1iMDlZSFZTVkxsdUNjanJUa1lZVElBcWFqNnZORVEyK3JQZndtVkgyNHZSQzZmVlVCYmZvcCt2YkpoY1RmMWZtY3NXdDlLSWNFUXVUMHozaG9PYi82NUdxUFBFRVZuOG9GMFBPcGFnVk1TZFgzeElyak9Pa3pVTzRoTDV5SXJvdWFnaE1rQVpGVEdYVS9CZFlZUUt0K2JFSmtNNm9aR2o5M0pPK3ZZVG12d2duMkR2WXIyY3IvTGZrNHUxNmhyaGV3L0t5OXI0QVVjUjIramV0L1hBSlRENlhIVTlSaWtVWS9STUxiOFpoZXhmVWNUS3QvUnBSRDVJaHk5eGhFSWt3RklwNzY0UHd1K1pnaWg4cTBKa1Vub0l2bzJ4TFpMdWR3RFY4SHZWTFN6VXpmeWZvemN5aGpSaXdDT3FiY3VYVjNKaDdlSnZveW1aYVIwRVJvZnZtYUl6Nkd5YVZKZlVmZXAzb1FRbVJQNFV3QkFRcVc3WkY1UWxURkNyNEt2R1dJYktwZk40ckx4OGRxTDYxWTlJL0tIMklZcEZ1V2tVbjdPNTJ1OGRDZi9QZm8yeEhhellweS92dWo1YkRyM1BLN1F3M2pybnhYVmRXL1NtWDVjNWRsYW43T3I2TU1ZSEZRcEdPL3NHdXA1Z2xCYTlUcCtNdit5SEI5anJYMnpJYmJUcE5iem45bG0vdnF6Wi9WbnRSaTZyTk5YQVNjaVRBWWdyWEorOHJ6QSttNys1ZFBnTm9iWUJnalA2Mks5akdmcnNxcmV3cHlPWElRd2VXYzFmLzVSTnlxN0dua3JST1lxODNWUnJvbDE1SmU5ODVxdkcwUDRkd3BsVFBFcTh0TlJlankvUmgvWDBNYzZFcG1FYWtGdmFYeDRFOXpXT3JhaDhoVGJzOFM3dk0vV2ZhcXl4K21kamJNdzVocUE3TXE0NnltNHEvWDhlVnZIdjc3cFlRUnNIUTlVUnQ3K1R4aGxUU2ZxUzdpenU3NjBpbTJuOHFjakFES1BWdHNiMzEvdWV4ZGhVNEtxWHZjWEFYQTRtL25Ud3puQ09rcVBaeE45TUNZOXVWb3M4REs0cXlHMklYeDVUM3RiMzlWU3Y3K1VOWGs5UTNwMzVOcEZlR2ZqVElUSkFLUld6MDh1WTRSNjJMZzRoaUcyd2ZJdjJZTGxlaWJvMC9yZnRBdVFWWGpTbzR0d2o3ektFQWszS3hUT2NFdmwydkE4QkE2bXZwZU5rZDhZSEVVdGdod2pQd1VKSFppdjU0dHd2M2lJTW9Hd3ZLdjl6OTY3MmhBSjFQZTFYWUM4T3d0NUZYQm14bHdEa0Y0ZEkvUjliRGRHdWI4aFBvOFgybTBHbFhGMUgxbzRZN1NHUUk5ak94Wm9GUmJqOEVrOXU2dDBKeHYxZXIybjlmT21qc0V1OTc2eG9YdmZLcmIzdm5VSUNQbUtzbmtWK2M5SkJzNmpyRGN5SDBGa3hQWHhaUjkxN1F6M3ZwUjlxbkorOGhBOHhPNWRMZXE3V25sSGU5L0t6MUlOd2N2di85djYxZnNhaXlSTUJxQUxaUkZaejZWNUZSeENXZHp1TDloMzRmSS82OWNQdGZ2Z2JPYmZVd21PeTZjc3lGZjExM3pwV2YzcXZLYk9sY3I0K1dlbW5KMDhCRit6cXArbzUzYVZ6WXBmNjljbDNQdUcyUDcrM1B1NHMvcnN2QWlBSTZqdlpPVTVtWFdqWEVmcDhZMlJ1d0RTTmRTUld0UmJKdW1WeG9jaE9JUlYvVHlmLzJ6TFg0L3grWDF0T25jeGNIMVgyKzFUbGErckVCNWZWdDZwLy9wYi9RYXlITUprQUxveEwwWitxaDFhdXU4T2J6OWMvdlRuV3plS1B0VFB2Mk43ZHZXbnYzZUlzS1YrTDNmZHh1WHJ0L1hyS3J5STNVWjVrZHFVY1ZBQlc2VzR3QVNIdXhucTUvY3VxL2xucXR6emR2ZS9mOWV2NWErblF3WE5kUlBpOHYzdmNmMjkySXpnWHVwejlXMEFIRmZtYVNoamNGUzFJR0dLdk85N202QXJseWJwV2NjZjNxcCtucGUvcVBsa2VUK2JZdHNNc2YrdU5zVUJYSHBYSzcvK2MzaFh1NHZ2ZzBVU0pnUFFsZHA5Tjh5Ly9IdHdiTHRnZDNYNUg5UUYvS2NGZTN3K3EvVmpYSDl1NjNETlYrN3ZTY0NldWpsWE5uaC9DQjVpMXdtOHV2d1A5dTU5dS92ZnpuVE4vOWF1YUtZWUxuMkZReXViYkVNQUhOZTd5QmttZnpEaSttVEtjU01aMTZ2R3BIZXFkTXZXU1hvbWhwM0dib3JkMC8yL2VZOTN0YUYrL2ViU2gvdDc2VDY0WE1Ka0FIcFVOa3QzWFZ5Y3o2NVNrOU96UU9jNkY3RXR0dkVTZkR5N1RZWWhBS0F6TlRRWkk5KzV0OFlUbjA0cFNNZ1lKcnVHT2xhbmhnMWhrdDY1ZVZjN245SWRmaEVzMW44RUFIU21qaGt0WFpsVFFIOHMwTGxXdlQ4K0N3Q0E0M2tmK2J3TFRxSk0wNG5ySjFxMXpEWFV1ZnFlL2pLZ1Q2Ym5MWnd3R1lBdUNaVHBtQVU2TjVydmoyVWo2M1VBQUJ6SEpuS0ZnVVpjbjE2Mkx0NU4zYU9nY3dKbE9tVjZYZ09FeVFCMHF5NVVCTXIweEFLZDI3b0k5MFlBNEFocWFQWWg4dmcxT0xWc1hieEdYUE83R2lpN0p1aUY2WG1ORUNZRDBEV0JNaDM1WUlIT2JSbDNEUUFjV2FiT3UwMXdVc2xHWFUvMXZ3ZCtOMThUNnhBbzB3ZlQ4eG9oVEFhZ2V3SmxPakRObis4RDdxQnVhcjBJQUlBRFN4UUdsaUF3VTVkMVM3SUViV1BBRlFUS2RPQ0Y2WG50RUNZRFFBaVVTYzhDblh1WnI1dWZ3Z1lHQUhBY3I2TjlZM0F1V1VaZE94K1hhd21VU2V4MTNXK2dFY0prQUtnRXlpUlZ6a25PZHFZWXAvVTgzQmNCZ01NYm8zMUNudk1wSGVHdGQ3ZC9VUFRMMTlSQU9VUHhEZXhNOCtjaWFJb3dHUUQyQ0pSSjVwMXprbm1vZW41eXVTOW1PWmNPQUZpQU91cDZqSFk1Ni9hTTZocjFmYlJOUU1pdHpOZDdLZkRWeFU0RzAveDVVdS9oTkVTWURBQ1g3QVhLenI2aVpkUDhlUlp3QUh2M1JUaTNNV3k4QW1UU2NoZzRCdWUyaWJhTkFiZFVDOFVGeXJUdW1Za01iUkltQThBVjlvSVQ0NEZwMFJRcVBUbXcrWG9xQlRZS0ZEaTNjZzE2TmdQa3NZbDJwNThZY1gxK0xZKzZmaTlRNGE1cW9Qd2lvRTB2VFBSb2x6QVpBSzVSZ3JqNTgzMm8vS1F0bjBZUzI1amdHT2JyYWhQdWlaelBTL2MyZ0Z4cThXT0xFNkdNdUY2QWhxK2ZZaE53RC9OMS85UDhwZXhWS1I2bkpTL3J0VXVqaE1rQThCVkdDZEVZSTRNNEt2ZEV6bVJ5Qmp4QVdpMnVLOFpnS1Zyc0VDL3JHcE5XdUxkNi9mdzF0bFBKWU9sZWU1ZHJuekFaQUc2aExucFVmckowejJ4S2NBb0NaYzdBbWQwQVNkVU8zOWJlczFvKzZ6bWI4djdUMnZVekJqelEzdkZzVThCeS9UeGZxOCtENWdtVEFlQ1dWSDZ5Y0MvcUNHSTRDWUV5Si9UQ3hBV0E5RnJxTHYyb2dITTVHaDExL1RyZ0FNb2FlZjc4SlZ4VExOTzcrZnBjQnlrSWt3SGdEdllxUDIwZXNDVE9udUVzQk1xY3dHdjNONEF1dFBSKzVWMXdlVnJxRkMvaFg2dm5QTE5RdGZQVGV4bExVdTV6ejRJMGhNa0FjRWUxOHJPTXZMWlFad2xlT0h1R2N4SW9jMFNUa1dnQWZhaWpyc2RvZ3hIWHk3T0pkbGczY3hUMXZjdzBQWmFnVEJ0NVVpZEhrSVF3R1FEdXFTN1VuVS9ET1QzVHNjY1MxUHZoaTRERG1jSTV5UUM5YVNXa0hZTkZxWUhGR0cwWUE0NmtkcjJYTmZRWWNCN2xqT1MxSURrZllUSUFQRUN0b0xkUTU5VEtvdng3WnlTekpMV3dvVXh0OE5MSVEwMnhyV1NmQW9DZWJHTDUzdHNnWDZ3V2loRkc2eHVPclU3VEsvdFV1dUE1dGRmT1NNNUxtQXdBRDJTaHpvbE5zUTFabk5YRzR0VHIwbWcxSG1KWExETUZBRjFwcEx2VUdueTVOckY4UHdlY1NKMGU5WmZ3YnNacHZIUkVVVzdDWkFBNEVBdDFUbUNLYlpEOElXQ2hhZ2hZQ214Y3A5eFZDUkhjNHdENnR2UUNYV0h5UWpWUWpQRFJaQ2xPcmI2YmxXTGYxd0hIODZ6dWlaS1lNQmtBRHFoMktaZEFXWmN5aHpiT243L3ExcU1GOVY1bzA0SzdFQ1FEc0R0R2FLbGpwRWNqcmhkdnlhT3VGU0p3RnVXK1ZUdEduNFhtQnc1cml1MCsxU1pJVDVnTUFFZWdTNWtESytPQ250aThvalYxMCtKRk9FZVptMDJ4M1lRUUpBTlFMSFVVc0JIRnk3Zmt3TmIxdzFuVndLOU1rSEl0Y2dqbDNVMHhjRWVFeVFCd0pMcVVPWURkMmFFWEFZMmFyOStmd2puS1hHK0s3U2JFRkFDd3RkUkFjQXdXcmE0bnhsaWVxWGJkdzFuVmZhcDFiRVBsS2VCK3lnUXk3M0NkRVNZRHdKSHRkU21yL3VRdVNuVm42ZFF6RG8zbU9hdUxhNHhoZkQ4QWw5VFFiWXhsR1Qydm12RnJMTStTeDIvVG9YS2YxZnpBUFpTR2gyZGxBcG5KZWYwUkpnUEFDZXhWZnpxamh0dDRYYzZidFdGRkpzN3E0cExYeHZjRGNJT2xCWUlLZzlzeHh2TDhGTEJBbWgrNGd6R2NqOXcxWVRJQW5GQlpkTzFWZjA0Qlg1cGlPeXJvZVVCU3p1cnEzbTU4di9zY0FEZFpXdmcyQmsyb25lMVRMSWV1ZGhiTjZHdHU0VVV0Qko2Q2JnbVRBZUFNYXZXbk1JVjlaZnp2WDUybFJROU1hK2pXR01iM0EzQUxkWExGR01zZ0RHelBrdDZ6dmZQVGhMM1IxOTdSMk5rZHYyYTZBc0prQURpWHZUREZTS0crVFZHN2tZMTdwVGVYcGpXUVY3bTNxV1lINEs2V3NqNXczbTE3eGxpT01hQWhlKzlvTDBLbzNLdmQrMXNKa2o4RWhEQVpBTTVPcU55dHNqaC9XVjdTZENQVE8yZDFwVGFHYW5ZQTdxZHNZQytoMk5KRWpjYlU5NnNsWERzYmhYUzBxcTdmeTBROXg3VDFaUXp2YjF4Qm1Bd0FDeUZVN3NvbXRvdnppd0ErMmJzSGZoODJLekxRalF6QWc5U3BQZWQrTC9yZ09kYXNKYnhUZTYrbmFmVWQ3U0tFeWowb0JWeFB2TDl4SFdFeUFDeU1VRG0xTWJhTDgyY1c1M0MxY3A2dXM3cWFWODZBLzR0cWRnQU80Tnhkd2I4R3JUcjN0VE9aUUVVV3UxRFplMXBLK3lPdHg0QnJDSk1CWUtFdWhjb3FRTnMyeHVjS3p6R0FyOW83cTh0bVJUdkcySWJJem9BSDRDRHEybm1NODlrRVRWckFxT3N4SUtGTDcybGowS3BQUjYrRkltQnVTWmdNQUF0M1JRWG9HTFJpRENFeVBJaFF1UWxqR0lrR3dQR2NxenU0dklkOUNGcDJ6a2xmcndNU3ErOXBaZnoxWDhOVXZaYnNoOGdYaW9DNUxXRXlBRFRraXNYNkZDelJHRUprT0NnVjhJczBobnNkQU1kM3JvNnA5MEhyempYcStvTkNCSHBScnZXOXFYb0tnSmRMaU15RENKTUJvRUc3eGJwZ1pWSEtRcnhVbnd0VzRJajJpbXFjSzM4ZXUzdmRYOXpyQURpRnV1RTl4dW1kKzh4ZEh1aU1vNjUxSmRPZE9sVnZWd0JjM3RjMFFDekRPSCsrbjc4di95MUU1aUgrRk50TkdBQ2dVV1d4UG4vWi9QYmJiOFA4ZFRWL2ZwZy9qNE5US1JYbnBXdmhKNHR5T0owNlRuazkzL3N1d3IzdkZOenJBRGluRXM2dDRuUW1CVk5wbFBYTDMrTzB4b0NPN1o5M1A3K3ZQWjIvbE0rcGZ3NTdWdDdYU3BqL3pyT01RL21UTTYwQUlJZjZUTi9FNTJDNUxOYi9GcWZkZE9tRmhUa3N4S1Y3WHdtVG44K2Y3K2JQRUR5VWV4MEFTekhHOXJuMFRaekdHR1N4aWRPR1dPL3R0OE5uODg5RG1mTHdibjVYSys5cCsvdFVwN3FmOTJTTWJRSE5SZ0V3aC9Zb0FJRFU5anFXTGRnZnBpekVTMmZlTGxpeE1JY0ZtKzk5cS9uTE9nVExkN1c3MTVVT3NORzlEZ0FBT0RUdmF3Y3p6cDlmd3dRcGpreVlEQUNkcVF2MlVnMzZiZWhhL3BxeUVDOVZ0R1ZoTGtDR1J1M2Q5OHBHaFZIWWYrUmVCd0FBbkVXZE1MV0s3ZnRhK2FvSjRtWmpiRHVRMzVtRXdLa0lrd0dnWS9PQ3ZTelFWL1VqWE40YVl4dW9qTWE2UWo1NzB4cktwK2NxK0RIYzZ3QUFnSVdweGNBbFlCWXViMDN4K2YxTjhTOW5JVXdHQUw1d2FkRStSTzR1dnQwNDEzL0dkbUZ1cEN0MHBsYkI3eXJodjQyYzk3ejllMTNwUVA3Z1hnY0FBTFNndnJNTjhlVTdXK2FBZVlvdmkzK25nRE1USmdNQVgxVUQ1bDBYODdmMTE2MEZMaVU0bVdJdlBKNFg1QjhDWUUrZDJQQjQ3L1BuYUd1ellqODRMbDl0UGdBQUFLbnNCY3psNjdmMTErWFRXc2c4eFRZNC91ZnUxd3AvV1NKaE1nQndiM1h4dmd0ZWh0aUdMdC9FNTBYOHFYMk16MEhLdjJPN0VDK2ZEOElVNENGdXVOK2RJMmllNG8vM3V2THJ5Y1lEQUFEUXE3M2k0Q0UrdjdlVnI5L0UrY0xtYWUvai9ZMG1DWk1CZ0tPcGkvamRnajJ1K0ZyOE9XN3ZmK056WUx6L21jcFhpM0RnWE9wWnpFUDl5OHRmeTMzd3YrSjJkdmU1WXRyNyt1bCtwekFHQUFEZy91cTcyemVYUHNQZXYzS1hmYXJpMy9YcnRQZjEwNis5dndFQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFEL2Z6dHdTQUFBQUFBZzZQOXJOOWdCQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQVlBbEcxelNReU5KTW13QUFBQUJKUlU1RXJrSmdnZz09Ii8+CjwvZGVmcz4KPC9zdmc+Cg==	\N	medium	left	\N	#3B82F6	#1E40AF	#10B981				f	daily	02:00	full	\N	tiny
\.


--
-- Data for Name: lats_pos_integrations_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_pos_integrations_settings (id, user_id, business_id, integration_name, integration_type, provider_name, is_enabled, is_active, is_test_mode, credentials, config, description, webhook_url, callback_url, environment, last_used_at, total_requests, successful_requests, failed_requests, notes, metadata, created_at, updated_at) FROM stdin;
d90dc74b-1a06-4b50-8c21-421d05e5f0c1	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	SMS_GATEWAY	sms	MShastra	t	t	f	{"api_key": "Inauzwa", "sender_id": "INAUZWA", "api_password": "@Masika10"}	{"api_url": "https://mshastra.com/sendurl.aspx", "timeout": 30000, "priority": "High", "max_retries": 3, "country_code": "ALL"}	MShastra SMS Gateway - Inauzwa	\N	\N	production	2025-10-18 17:09:46.644+00	36	14	22	\N	{}	2025-10-12 07:16:44.55+00	2025-10-18 17:09:46.644+00
8a17e729-2661-4c9f-acd8-e26d95496318	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	GEMINI_AI	ai	Google Gemini	t	t	t	{"api_key": "AIzaSyBRGcampOXapiMREewVIvuksNfhBYkKCXw"}	{"base_url": "AIzaSyBRGcampOXapiMREewVIvuksNfhBYkKCXw"}	AI-powered features, automation, and content generation	\N	\N	test	\N	0	0	0	\N	{}	2025-10-12 15:04:07.702883+00	2025-10-17 09:03:56.308+00
f68d95cf-be05-4535-a865-4835293657b5	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	GOOGLE_MAPS	maps	Google Maps	t	t	t	{"api_key": "AIzaSyBka_sgKe9_75RvzWOfqsuiNSsyZSzV4P8"}	{"enable_geofencing": true}	Location services, maps, and geofencing for attendance tracking	\N	\N	test	\N	0	0	0	\N	{}	2025-10-12 15:06:07.908585+00	2025-10-17 09:03:59.762+00
\.


--
-- Data for Name: lats_pos_loyalty_customer_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_pos_loyalty_customer_settings (id, user_id, business_id, enable_loyalty, points_per_dollar, created_at, updated_at) FROM stdin;
0bf27278-e1a6-428a-b0ec-b262dbc384ec	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	f	1.00	2025-10-08 07:37:35.228412+00	2025-10-08 07:37:35.228412+00
\.


--
-- Data for Name: lats_pos_notification_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_pos_notification_settings (id, user_id, business_id, enable_notifications, enable_sound_notifications, enable_visual_notifications, enable_push_notifications, notification_timeout, enable_sales_notifications, notify_on_sale_completion, notify_on_refund, notify_on_void, notify_on_discount, enable_inventory_notifications, notify_on_low_stock, low_stock_threshold, notify_on_out_of_stock, notify_on_stock_adjustment, enable_customer_notifications, notify_on_customer_registration, notify_on_loyalty_points, notify_on_customer_birthday, notify_on_customer_anniversary, enable_system_notifications, notify_on_system_errors, notify_on_backup_completion, notify_on_sync_completion, notify_on_maintenance, enable_email_notifications, enable_sms_notifications, enable_in_app_notifications, enable_desktop_notifications, created_at, updated_at, whatsapp_closing_message) FROM stdin;
c2f935c1-7ce9-4c70-95df-88b70fa4b605	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	t	t	t	f	5000	t	t	t	t	f	t	t	10	t	f	f	f	f	f	f	t	t	f	f	t	f	f	t	f	2025-10-11 16:55:43.023929+00	2025-10-11 16:55:43.023929+00	
021217ba-934a-44fb-8a45-e8a4fe1ca70c	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	t	t	t	f	5000	t	t	t	t	f	t	t	10	t	f	f	f	f	f	f	t	t	f	f	t	f	f	t	f	2025-10-11 16:55:43.133928+00	2025-10-11 16:55:43.133928+00	
2bf7ccd3-da79-47d2-9e90-ee225116537f	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	t	t	t	f	5000	t	t	t	t	f	t	t	10	t	f	f	f	f	f	f	t	t	f	f	t	f	f	t	f	2025-10-12 10:34:52.997709+00	2025-10-12 10:34:52.997709+00	
2125fd0e-9748-447d-933f-fe97c14b213f	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	t	t	t	f	5000	t	t	t	t	f	t	t	10	t	f	f	f	f	f	f	t	t	f	f	t	f	f	t	f	2025-10-12 10:34:53.259317+00	2025-10-12 10:34:53.259317+00	
\.


--
-- Data for Name: lats_pos_receipt_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_pos_receipt_settings (id, user_id, business_id, receipt_template, receipt_width, receipt_font_size, show_business_logo, show_business_name, show_business_address, show_business_phone, show_business_email, show_business_website, show_transaction_id, show_date_time, show_cashier_name, show_customer_name, show_customer_phone, show_product_names, show_product_skus, show_product_barcodes, show_quantities, show_unit_prices, show_discounts, show_subtotal, show_tax, show_discount_total, show_grand_total, show_payment_method, show_change_amount, auto_print_receipt, print_duplicate_receipt, enable_email_receipt, enable_sms_receipt, enable_receipt_numbering, receipt_number_prefix, receipt_number_start, receipt_number_format, show_footer_message, footer_message, show_return_policy, return_policy_text, created_at, updated_at, enable_whatsapp_pdf, whatsapp_pdf_auto_send, whatsapp_pdf_show_preview, whatsapp_pdf_format, whatsapp_pdf_quality, whatsapp_pdf_include_logo, whatsapp_pdf_include_images, whatsapp_pdf_include_qr, whatsapp_pdf_include_barcode, whatsapp_pdf_message, enable_email_pdf, enable_print_pdf, enable_download_pdf, show_share_button, sms_header_message, sms_footer_message) FROM stdin;
37932fbc-c0fa-44f3-bf9e-f8d37fd14b3b	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	standard	80	12	t	t	t	t	f	f	t	t	t	t	f	t	f	f	t	t	t	t	f	t	t	t	f	f	f	f	t	t	RCP	1	RCP-{YEAR}-{NUMBER}	t	Karibu tena Mtaasisis.	f	Returns accepted within 7 days with receipt	2025-10-08 07:37:35.483+00	2025-10-08 07:37:35.483+00	t	f	t	a4	standard	t	f	t	f	Thank you for your purchase! Please find your receipt attached.	t	t	t	t	Thank you for your purchase!	Thank you for choosing us!
4248ece9-d17f-4c18-972b-3050eae3f748	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	standard	80	12	t	t	t	t	f	f	t	t	t	t	f	t	f	f	t	t	t	t	t	t	t	t	t	f	f	f	f	t	RCP	1	RCP-{YEAR}-{NUMBER}	t	Thank you for your business!	f	Returns accepted within 7 days with receipt	2025-10-12 10:34:53.000242+00	2025-10-12 10:34:53.000242+00	t	f	t	a4	standard	t	f	t	f	Thank you for your purchase! Please find your receipt attached.	t	t	t	t	Thank you for your purchase!	Thank you for choosing us!
\.


--
-- Data for Name: lats_pos_search_filter_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_pos_search_filter_settings (id, user_id, business_id, enable_product_search, enable_customer_search, enable_sales_search, search_by_name, search_by_barcode, search_by_sku, search_by_category, search_by_supplier, search_by_description, search_by_tags, enable_fuzzy_search, enable_autocomplete, min_search_length, max_search_results, search_timeout, search_debounce_time, enable_search_history, max_search_history, enable_recent_searches, enable_popular_searches, enable_search_suggestions, created_at, updated_at) FROM stdin;
bd314c85-8b7d-402e-99b0-567e33d8f594	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	t	t	t	t	t	t	t	t	t	t	t	t	2	50	5000	300	t	50	t	t	t	2025-10-11 16:55:43.023781+00	2025-10-11 16:55:43.023781+00
e87fdc38-4723-43f6-9e54-6c946934f775	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	t	t	t	t	t	t	t	t	t	t	t	t	2	50	5000	300	t	50	t	t	t	2025-10-11 16:55:43.133477+00	2025-10-11 16:55:43.133477+00
479478a4-e8b9-45b0-b3bc-281108574d6d	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	t	t	t	t	t	t	t	t	t	t	t	t	2	50	5000	300	t	50	t	t	t	2025-10-12 10:34:52.727964+00	2025-10-12 10:34:52.727964+00
6cfa7279-6831-482c-8d05-d8fb76ea422f	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	t	t	t	t	t	t	t	t	t	t	t	t	2	50	5000	300	t	50	t	t	t	2025-10-12 10:34:53.000061+00	2025-10-12 10:34:53.000061+00
\.


--
-- Data for Name: lats_pos_user_permissions_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_pos_user_permissions_settings (id, user_id, business_id, permissions, created_at, updated_at) FROM stdin;
656b21b7-d382-4890-9041-852c6fc7b96e	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	[]	2025-10-08 07:37:35.233843+00	2025-10-08 07:37:35.233843+00
\.


--
-- Data for Name: lats_purchase_order_payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_purchase_order_payments (id, purchase_order_id, amount, payment_method, payment_date, reference_number, notes, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: lats_receipts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_receipts (id, sale_id, receipt_number, customer_name, customer_phone, total_amount, payment_method, items_count, generated_by, receipt_content, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lats_sale_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_sale_items (id, sale_id, product_id, product_name, quantity, unit_price, discount, subtotal, created_at, variant_id, variant_name, sku, total_price, cost_price, profit) FROM stdin;
\.


--
-- Data for Name: lats_spare_parts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_spare_parts (id, name, part_number, quantity, selling_price, cost_price, category_id, brand, description, condition, location, min_quantity, compatible_devices, is_active, created_at, updated_at, supplier_id) FROM stdin;
9b430460-7a09-4c9c-abcf-a0ebd4cb93c5	MacBook Pro LCD A1708	A1708-LCD-13	5	250	180	44dc9fad-d33b-4730-9b0c-ef2b9b357f62	Apple	13-inch Retina LCD display for MacBook Pro A1708 (2016-2017). Compatible with MacBook Pro 13-inch models from 2016-2017.	new	Warehouse A	2	MacBook Pro 13-inch (2016-2017)	t	2025-10-12 05:55:11.466082+00	2025-10-12 05:55:11.466082+00	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13
cc15e0cb-45d1-4a72-a8e0-904d38a93b55	MacBook Pro LCD A1989/A2159	A1989-LCD-13	8	280	200	44dc9fad-d33b-4730-9b0c-ef2b9b357f62	Apple	13-inch Retina LCD display shared between MacBook Pro A1989 and A2159 (2018-2019). Compatible with both models.	new	Warehouse A	3	MacBook Pro 13-inch A1989 (2018), MacBook Pro 13-inch A2159 (2019)	t	2025-10-12 05:55:12.017001+00	2025-10-12 05:55:12.017001+00	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13
ccfa2b85-1a6c-4580-a493-a7a0b1b00563	MacBook Pro LCD A2338 M1 13-inch	A2338-LCD-13-M1	6	300	220	44dc9fad-d33b-4730-9b0c-ef2b9b357f62	Apple	13-inch Retina LCD display for MacBook Pro A2338 with M1 chip (2020). Compatible with M1 MacBook Pro 13-inch.	new	Warehouse A	2	MacBook Pro 13-inch A2338 M1 (2020)	t	2025-10-12 05:55:12.836456+00	2025-10-12 05:55:12.836456+00	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13
adad57e0-eadd-4e3c-89aa-ef6a58ec6ec3	MacBook Pro LCD A2442 M1 Pro/Max 14-inch	A2442-LCD-14-M1	4	480	350	44dc9fad-d33b-4730-9b0c-ef2b9b357f62	Apple	14-inch Liquid Retina XDR LCD display for MacBook Pro A2442 with M1 Pro/Max chip (2021). Compatible with M1 Pro/Max MacBook Pro 14-inch.	new	Warehouse A	2	MacBook Pro 14-inch A2442 M1 Pro/Max (2021)	t	2025-10-12 05:55:13.427037+00	2025-10-12 05:55:13.427037+00	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13
e77d2c1c-db00-40d6-8a07-a671b96f5169	MacBook Pro LCD A2141 16-inch	A2141-LCD-16	3	550	400	44dc9fad-d33b-4730-9b0c-ef2b9b357f62	Apple	16-inch Retina LCD display for MacBook Pro A2141 (2019). Compatible with MacBook Pro 16-inch models from 2019.	new	Warehouse A	1	MacBook Pro 16-inch A2141 (2019)	t	2025-10-12 05:55:14.195856+00	2025-10-12 05:55:14.195856+00	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13
c18cd664-7868-45c0-88e5-7107f2482ae4	MacBook Pro LCD A2485 M1 Pro/Max 16-inch	A2485-LCD-16-M1	3	620	450	44dc9fad-d33b-4730-9b0c-ef2b9b357f62	Apple	16-inch Liquid Retina XDR LCD display for MacBook Pro A2485 with M1 Pro/Max chip (2021). Compatible with M1 Pro/Max MacBook Pro 16-inch.	new	Warehouse A	1	MacBook Pro 16-inch A2485 M1 Pro/Max (2021)	t	2025-10-12 05:55:16.815359+00	2025-10-12 05:55:16.815359+00	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13
ea0047f6-df78-47ed-b057-baa209d3a944	MacBook Air LCD A2179	A2179-LCD-13	6	230	160	44dc9fad-d33b-4730-9b0c-ef2b9b357f62	Apple	13-inch Retina LCD display for MacBook Air A2179 (2019). Compatible with MacBook Air 13-inch models from 2019.	new	Warehouse A	3	MacBook Air 13-inch A2179 (2019)	t	2025-10-12 05:55:18.525952+00	2025-10-12 05:55:18.525952+00	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13
e0243f93-43bf-4bec-ac16-300ce9c62f17	MacBook Air LCD A2337 M1 13-inch	A2337-LCD-13-M1	8	250	180	44dc9fad-d33b-4730-9b0c-ef2b9b357f62	Apple	13-inch Retina LCD display for MacBook Air A2337 with M1 chip (2020). Compatible with M1 MacBook Air 13-inch.	new	Warehouse A	4	MacBook Air 13-inch A2337 M1 (2020)	t	2025-10-12 05:55:19.070869+00	2025-10-12 05:55:19.070869+00	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13
463d30d6-4699-4c19-820e-0e8537d3ddd7	MacBook Air LCD A2681 M2 13-inch	A2681-LCD-13-M2	5	280	200	44dc9fad-d33b-4730-9b0c-ef2b9b357f62	Apple	13-inch Liquid Retina LCD display for MacBook Air A2681 with M2 chip (2022). Compatible with M2 MacBook Air 13-inch.	new	Warehouse A	2	MacBook Air 13-inch A2681 M2 (2022)	t	2025-10-12 05:55:19.623506+00	2025-10-12 05:55:19.623506+00	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13
778b96d6-89d0-48b3-8619-5605f6ece885	MacBook Air LCD A2941 M3 13-inch	A2941-LCD-13-M3	4	300	220	44dc9fad-d33b-4730-9b0c-ef2b9b357f62	Apple	13-inch Liquid Retina LCD display for MacBook Air A2941 with M3 chip (2024). Compatible with M3 MacBook Air 13-inch.	new	Warehouse A	2	MacBook Air 13-inch A2941 M3 (2024)	t	2025-10-12 05:55:20.245123+00	2025-10-12 05:55:20.245123+00	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13
132aa888-471a-4cb3-bf62-b5e66ca2b4c8	MacBook Pro 13" LCD A1708	LCD-MBP13-A1708-A1706	0	200.00	150.00	0f916e3e-1b92-4940-bab2-2f570e660524	Apple	13.3" Retina display. Resolution: 2560x1600. Compatible with Function Keys and Touch Bar models	new	Storage Room A	2	\N	t	2025-10-12 06:10:14.720011+00	2025-10-12 06:10:14.720011+00	\N
c9c6995b-435d-4880-9f05-e3224fc6bb61	MacBook Pro 13" LCD A1989	LCD-MBPT13-A1989-A2159-A2251-A2289	0	240.00	180.00	0f916e3e-1b92-4940-bab2-2f570e660524	Apple	13.3" Retina display. Resolution: 2560x1600, True Tone, P3 Wide Color. Touch Bar model, 4x Thunderbolt 3 ports only. Compatible with A1989, A2159, A2251, A2289	new	Storage Room A	3	\N	t	2025-10-12 06:10:15.00062+00	2025-10-12 06:10:15.00062+00	\N
ac335e12-ca52-4f1a-a786-19962b927d7f	MacBook Pro 13" M1/M2 LCD A2338	LCD-MBP13-A2338-A2686	0	280.00	200.00	0f916e3e-1b92-4940-bab2-2f570e660524	Apple	13.3" Retina display. Resolution: 2560x1600, True Tone, P3 Wide Color. Touch Bar model, 4x Thunderbolt 3 ports only. Compatible with A2338, A2686	new	Storage Room A	2	\N	t	2025-10-12 06:10:15.277962+00	2025-10-12 06:10:15.277962+00	\N
6d634894-8cdd-44c3-8436-5e3553817f92	MacBook Pro 14" M1/M2/M3 Pro/Max LCD A2442	LCD-MBP14-A2442-A2779-A2918	0	480.00	350.00	0f916e3e-1b92-4940-bab2-2f570e660524	Apple	14.2" Liquid Retina XDR Mini-LED display. Resolution: 3024x1964, ProMotion 120Hz, 1000 nits sustained, 1600 nits peak, HDR. Compatible with A2442, A2779, A2918	new	Storage Room A	2	\N	t	2025-10-12 06:10:15.560205+00	2025-10-12 06:10:15.560205+00	\N
faba3b3c-5d85-4f72-b9dd-463f05d29c8d	MacBook Pro 16" Intel LCD A2141	LCD-MBP16-A2141	0	380.00	280.00	0f916e3e-1b92-4940-bab2-2f570e660524	Apple	16" Retina display. Resolution: 3072x1920, True Tone, P3 Wide Color, 500 nits	new	Storage Room A	1	\N	t	2025-10-12 06:10:15.837666+00	2025-10-12 06:10:15.837666+00	\N
89a004bc-c180-4002-82b2-7b6236c0582a	MacBook Pro 16" M1/M2/M3 Pro/Max LCD A2485	LCD-MBP16-A2485-A2780	0	620.00	450.00	0f916e3e-1b92-4940-bab2-2f570e660524	Apple	16.2" Liquid Retina XDR Mini-LED display. Resolution: 3456x2234, ProMotion 120Hz, 1000 nits sustained, 1600 nits peak, HDR. Compatible with A2485, A2780	new	Storage Room A	1	\N	t	2025-10-12 06:10:16.115528+00	2025-10-12 06:10:16.115528+00	\N
c2fddda7-558e-4495-a9e2-c08b45f6ebbe	MacBook Air 13" Retina LCD A1932	LCD-MBA13R-A1932	0	180.00	120.00	0f916e3e-1b92-4940-bab2-2f570e660524	Apple	13.3" Retina display. Resolution: 2560x1600, True Tone. USB-C ports only	new	Storage Room A	2	\N	t	2025-10-12 06:10:16.390573+00	2025-10-12 06:10:16.390573+00	\N
0c07eff5-b8d1-4c38-afe8-3ab8a392f3d8	MacBook Air 13" Intel LCD A2179	LCD-MBA13R-A2179	0	190.00	130.00	0f916e3e-1b92-4940-bab2-2f570e660524	Apple	13.3" Retina display. Resolution: 2560x1600, True Tone, P3 Wide Color. USB-C ports only	new	Storage Room A	2	\N	t	2025-10-12 06:10:16.659528+00	2025-10-12 06:10:16.659528+00	\N
c4d5cae6-38af-43c3-8b62-3b4b3335b757	MacBook Air 13" M1 LCD A2337	LCD-MBA13R-A2337	0	200.00	140.00	0f916e3e-1b92-4940-bab2-2f570e660524	Apple	13.3" Retina display. Resolution: 2560x1600, True Tone, P3 Wide Color. USB-C ports only	new	Storage Room A	2	\N	t	2025-10-12 06:10:16.932213+00	2025-10-12 06:10:16.932213+00	\N
85fbff1b-dee2-4ad4-913a-427cbe3e17a6	MacBook Air 13.6" M2 LCD A2681	LCD-MBA13.6-A2681	0	220.00	160.00	0f916e3e-1b92-4940-bab2-2f570e660524	Apple	13.6" Liquid Retina display. Resolution: 2560x1664, True Tone, P3 Wide Color, 500 nits. USB-C ports only	new	Storage Room A	1	\N	t	2025-10-12 06:10:17.204691+00	2025-10-12 06:10:17.204691+00	\N
82dd3322-42b0-4b6f-803b-cf09d73f865d	MacBook Air 15.3" M2 LCD A2941	LCD-MBA15.3-A2941	0	280.00	200.00	0f916e3e-1b92-4940-bab2-2f570e660524	Apple	15.3" Liquid Retina display. Resolution: 2880x1864, True Tone, P3 Wide Color, 500 nits. USB-C ports only	new	Storage Room A	1	\N	t	2025-10-12 06:10:17.477231+00	2025-10-12 06:10:17.477231+00	\N
cd54e4d8-6d50-4d43-8abe-cac5cb3e414f	MacBook Air LCD A1932	A1932-LCD-13	6	220	150	44dc9fad-d33b-4730-9b0c-ef2b9b357f62	Apple	13-inch Retina LCD display for MacBook Air A1932 (2018). Compatible with MacBook Air 13-inch models from 2018.	new	Warehouse A	3	MacBook Air 13-inch A1932 (2018)	t	2025-10-12 05:55:17.975392+00	2025-10-18 08:53:59.32+00	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13
\.


--
-- Data for Name: lats_spare_part_usage; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_spare_part_usage (id, spare_part_id, device_id, quantity, reason, notes, used_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lats_spare_part_variants; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_spare_part_variants (id, spare_part_id, name, sku, cost_price, selling_price, quantity, min_quantity, attributes, image_url, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lats_stock_movements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lats_stock_movements (id, product_id, variant_id, movement_type, quantity, reference_type, reference_id, notes, created_by, created_at, from_branch_id, to_branch_id, branch_id) FROM stdin;
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.leave_requests (id, employee_id, leave_type, start_date, end_date, total_days, reason, status, reviewed_by, reviewed_at, review_notes, attachment_url, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notification_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notification_templates (id, template_name, notification_type, title, message, variables, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notifications (id, user_id, title, message, type, category, priority, status, created_at, read_at, actioned_at, dismissed_at, actioned_by, dismissed_by, device_id, customer_id, appointment_id, diagnostic_id, icon, color, action_url, action_text, metadata, group_id, is_grouped, group_count) FROM stdin;
a442de5d-8fdc-446c-844e-4a786875abc0	a780f924-8343-46ec-a127-d7477165b0a8	Welcome to the System! 👋	Your notification system is now working correctly. You can receive real-time updates here.	system_alert	system	normal	unread	2025-10-17 07:43:42.518302+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	🎉	bg-gradient-to-r from-blue-500 to-indigo-500	\N	\N	\N	\N	f	0
59961bc7-6d27-4d7e-92d6-2797d0c3910d	a780f924-8343-46ec-a127-d7477165b0a8	Backup Complete ✓	Daily backup completed successfully at 3:00 AM.	backup_complete	backup	low	read	2025-10-17 02:43:42.818601+00	2025-10-17 03:43:42.818601+00	\N	\N	\N	\N	\N	\N	\N	\N	💾	bg-gradient-to-r from-gray-500 to-slate-500	\N	\N	\N	\N	f	0
ae34509e-2ba9-4974-be6b-61819672bb18	762f6db8-e738-480f-a9d3-9699c440e2d9	Welcome to the System! 👋	Your notification system is now working correctly. You can receive real-time updates here.	system_alert	system	normal	unread	2025-10-17 07:43:43.168299+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	🎉	bg-gradient-to-r from-blue-500 to-indigo-500	\N	\N	\N	\N	f	0
619823fa-ea8f-41fc-8f21-44fb427bef20	762f6db8-e738-480f-a9d3-9699c440e2d9	Backup Complete ✓	Daily backup completed successfully at 3:00 AM.	backup_complete	backup	low	read	2025-10-17 02:43:43.470525+00	2025-10-17 03:43:43.470525+00	\N	\N	\N	\N	\N	\N	\N	\N	💾	bg-gradient-to-r from-gray-500 to-slate-500	\N	\N	\N	\N	f	0
80bdb4b6-2597-4a71-a71d-60cbc7752a5e	4813e4c7-771e-43e9-a8fd-e69db13a3322	Welcome to the System! 👋	Your notification system is now working correctly. You can receive real-time updates here.	system_alert	system	normal	unread	2025-10-17 07:43:46.261541+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	🎉	bg-gradient-to-r from-blue-500 to-indigo-500	\N	\N	\N	\N	f	0
915ec888-f22c-4046-92ba-2c7cbb34f656	4813e4c7-771e-43e9-a8fd-e69db13a3322	Device Repair Ready 📱	iPhone 13 Pro repair has been completed and is ready for pickup.	repair_complete	device	high	unread	2025-10-17 05:43:46.835773+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	✅	bg-gradient-to-r from-green-500 to-emerald-500	/devices	\N	\N	\N	f	0
9b5ede71-a527-48c3-9710-bf72aba5a74e	4813e4c7-771e-43e9-a8fd-e69db13a3322	New Customer Registered 👥	John Doe has registered as a new customer.	new_customer	customer	normal	unread	2025-10-17 06:43:47.15064+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	👤	bg-gradient-to-r from-purple-500 to-pink-500	/customers	\N	\N	\N	f	0
f62edffa-9205-4a17-92aa-030fc5ca9658	4813e4c7-771e-43e9-a8fd-e69db13a3322	Backup Complete ✓	Daily backup completed successfully at 3:00 AM.	backup_complete	backup	low	read	2025-10-17 02:43:47.432545+00	2025-10-17 03:43:47.432545+00	\N	\N	\N	\N	\N	\N	\N	\N	💾	bg-gradient-to-r from-gray-500 to-slate-500	\N	\N	\N	\N	f	0
35feaebf-d543-45ce-a06d-2a46cd215f23	287ec561-d5f2-4113-840e-e9335b9d3f69	Low Stock Alert ⚠️	Screen Protector stock is running low. Only 5 units remaining.	inventory_low	inventory	urgent	read	2025-10-17 07:13:45.186386+00	2025-10-17 07:49:20.399+00	\N	\N	\N	\N	\N	\N	\N	\N	📦	bg-gradient-to-r from-red-500 to-orange-500	/lats/unified-inventory	\N	\N	\N	f	0
756024fe-af90-4be6-b748-74cfb8db69f3	287ec561-d5f2-4113-840e-e9335b9d3f69	Backup Complete ✓	Daily backup completed successfully at 3:00 AM.	backup_complete	backup	low	dismissed	2025-10-17 02:43:45.948095+00	2025-10-17 03:43:45.948095+00	\N	2025-10-17 07:49:28.569+00	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	\N	\N	\N	💾	bg-gradient-to-r from-gray-500 to-slate-500	\N	\N	\N	\N	f	0
a6af3e4b-8c7b-4edc-a02b-b32dd262a87d	287ec561-d5f2-4113-840e-e9335b9d3f69	Welcome to the System! 👋	Your notification system is now working correctly. You can receive real-time updates here.	system_alert	system	normal	dismissed	2025-10-17 07:43:43.80385+00	2025-10-17 07:49:19.459+00	\N	2025-10-18 09:48:36.844+00	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	\N	\N	\N	🎉	bg-gradient-to-r from-blue-500 to-indigo-500	\N	\N	\N	\N	f	0
f7df4e8e-6c95-4b6e-90bf-4aa89e4b6d43	287ec561-d5f2-4113-840e-e9335b9d3f69	New Customer Registered 👥	John Doe has registered as a new customer.	new_customer	customer	normal	read	2025-10-17 06:43:44.740243+00	2025-10-18 09:48:38.61+00	\N	\N	\N	\N	\N	\N	\N	\N	👤	bg-gradient-to-r from-purple-500 to-pink-500	/customers	\N	\N	\N	f	0
10365e34-4411-45dc-be61-c36c2c1bd70e	287ec561-d5f2-4113-840e-e9335b9d3f69	Payment Received 💰	Payment of $150 received from customer Jane Smith.	payment_received	payment	normal	dismissed	2025-10-17 04:43:45.512497+00	\N	\N	2025-10-18 09:48:47.136+00	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	\N	\N	\N	💵	bg-gradient-to-r from-emerald-500 to-teal-500	/payments	\N	\N	\N	f	0
ef91bd71-750d-455e-a355-2ebf47dabefd	287ec561-d5f2-4113-840e-e9335b9d3f69	Device Repair Ready 📱	iPhone 13 Pro repair has been completed and is ready for pickup.	repair_complete	device	high	read	2025-10-17 05:43:44.12043+00	2025-10-18 09:48:49.486+00	\N	\N	\N	\N	\N	\N	\N	\N	✅	bg-gradient-to-r from-green-500 to-emerald-500	/devices	\N	\N	\N	f	0
\.


--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payment_methods (id, code, name, type, is_active, created_at, updated_at) FROM stdin;
d3818905-4f3e-44dc-a4ec-027178290487	cash	Cash	cash	t	2025-10-08 07:48:44.525592+00	2025-10-08 07:48:44.525592+00
0e1dee23-78fd-4f3e-8816-17b36856fee5	bank_transfer	Bank Transfer	bank	t	2025-10-08 07:48:44.793183+00	2025-10-08 07:48:44.793183+00
cf83fb51-cd4e-4724-9463-19172c39030e	mobile_money	Mobile Money	mobile	t	2025-10-08 07:48:45.055932+00	2025-10-08 07:48:45.055932+00
9098e2a5-4726-4e25-8104-18cb134d628e	credit	Credit/On Account	credit	t	2025-10-08 07:48:45.320808+00	2025-10-08 07:48:45.320808+00
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payment_transactions (id, order_id, provider, amount, currency, status, customer_id, customer_name, customer_email, customer_phone, reference, metadata, sale_id, pos_session_id, created_at, updated_at, completed_at) FROM stdin;
\.


--
-- Data for Name: points_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.points_transactions (id, customer_id, transaction_type, points_change, reason, created_at, created_by, device_id, metadata) FROM stdin;
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.product_images (id, product_id, image_url, alt_text, is_primary, display_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: purchase_order_audit; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_order_audit (id, purchase_order_id, action, user_id, created_by, details, "timestamp", created_at) FROM stdin;
\.


--
-- Data for Name: purchase_order_messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_order_messages (id, purchase_order_id, sender, content, type, "timestamp", created_at) FROM stdin;
\.


--
-- Data for Name: purchase_order_payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_order_payments (id, purchase_order_id, payment_account_id, amount, currency, payment_method, payment_method_id, reference_number, notes, status, payment_date, created_at, updated_at, created_by, updated_by, user_id, method, reference) FROM stdin;
\.


--
-- Data for Name: purchase_order_quality_checks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_order_quality_checks (id, purchase_order_id, item_id, passed, notes, checked_by, "timestamp", created_at) FROM stdin;
\.


--
-- Data for Name: quality_check_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quality_check_templates (id, name, description, category, is_active, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: quality_check_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quality_check_items (id, template_id, check_name, check_description, check_type, is_required, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: quality_checks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quality_checks (id, purchase_order_id, template_id, status, checked_by, started_at, completed_at, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quality_check_results; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quality_check_results (id, quality_check_id, check_item_id, result, numeric_value, text_value, notes, created_at) FROM stdin;
\.


--
-- Data for Name: recurring_expenses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.recurring_expenses (id, name, description, account_id, category, amount, frequency, start_date, end_date, next_due_date, last_processed_date, vendor_name, reference_prefix, auto_process, is_active, notification_days_before, metadata, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: recurring_expense_history; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.recurring_expense_history (id, recurring_expense_id, transaction_id, processed_date, amount, status, failure_reason, created_at) FROM stdin;
\.


--
-- Data for Name: reminders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.reminders (id, title, description, date, "time", priority, category, status, notify_before, related_to, assigned_to, created_by, created_at, updated_at, completed_at, branch_id, recurring) FROM stdin;
\.


--
-- Data for Name: repair_parts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.repair_parts (id, device_id, spare_part_id, quantity_needed, quantity_received, cost_per_unit, total_cost, status, notes, estimated_arrival, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: returns; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.returns (id, device_id, manual_device_brand, manual_device_model, manual_device_serial, customer_id, reason, intake_checklist, status, attachments, resolution, staff_signature, customer_signature, created_at, updated_at, purchase_date, return_type, branch, staff_name, contact_confirmed, accessories, condition_description, customer_reported_issue, staff_observed_issue, customer_satisfaction, preferred_contact, return_auth_number, return_method, return_shipping_fee, expected_pickup_date, geo_location, policy_acknowledged, device_locked, privacy_wiped, internal_notes, escalation_required, additional_docs, refund_amount, exchange_device_id, restocking_fee, refund_method, user_ip, user_location) FROM stdin;
\.


--
-- Data for Name: serial_number_movements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.serial_number_movements (id, inventory_item_id, movement_type, from_status, to_status, reference_id, reference_type, notes, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.settings (id, key, value, created_at, updated_at, description) FROM stdin;
191c6258-c0d4-4ad8-8e96-493733e0eabe	sms_api_url	https://mshastra.com/sendurl.aspx	2025-10-07 18:09:30.350281+00	2025-10-07 18:09:30.350281+00	SMS provider API URL
3c49218d-d0f3-4d80-94d6-634330a7eb5f	sms_provider_api_key	Inauzwa	2025-10-07 18:09:30.350281+00	2025-10-07 18:09:30.350281+00	API key for SMS provider
0477f328-936d-4a2e-a706-21bf4ba35afd	sms_provider_password	@Masika10	2025-10-07 18:09:30.350281+00	2025-10-07 18:09:30.350281+00	SMS provider password
6845b7ad-6ff7-41db-be8f-82c59e0e175f	attendance	{"enabled":true,"allowEmployeeChoice":false,"availableSecurityModes":["auto-location"],"defaultSecurityMode":"location-and-wifi","requireLocation":true,"requireWifi":true,"allowMobileData":true,"gpsAccuracy":30,"checkInRadius":30,"checkInTime":"09:00","checkOutTime":"21:00","gracePeriod":15,"offices":[{"name":"Arusha Main Office","lat":-3.359178,"lng":36.661366,"radius":100,"address":"Main Office, Arusha, Tanzania","networks":[{"ssid":"Office_WiFi","bssid":"00:11:22:33:44:55","description":"Main office WiFi network"},{"ssid":"Office_Guest","description":"Guest WiFi network"},{"ssid":"4G_Mobile","description":"Mobile data connection"}]},{"name":"dar","lat":-6.769023722047521,"lng":39.22466785068481,"radius":100,"address":"mwenge","networks":[{"ssid":"Airtel_X25A_23C3","description":"2.4"},{"ssid":"Airtel_X25A_23C3_5G","description":"5G"}]}]}	2025-10-12 06:50:51.314008+00	2025-10-12 17:18:18.27+00	Attendance security mode configuration with employee choice settings
50474d8f-5463-4eb3-931d-f5447c4eee0f	api_rate_limits	{"requestsPerMinute": 60, "requestsPerHour": 1000, "requestsPerDay": 10000}	2025-10-12 19:34:52.939752+00	2025-10-12 19:34:52.939752+00	API rate limiting configuration
1a9f35c2-1918-45ca-98fa-b84acbb10eed	loyalty_program	{"enabled":true,"points_per_currency":1,"currency_per_point":0.01,"min_purchase_for_points":1,"points_expiry_days":365,"enable_birthday_bonus":true,"birthday_bonus_points":500,"enable_referral_bonus":true,"referral_bonus_points":1000,"enable_tiers":true,"tiers":[{"name":"Bronze","min_points":0,"max_points":999,"discount_percentage":5,"special_benefits":["Early sale access","Birthday bonus"],"color":"#CD7F32","icon":"star"},{"name":"Silver","min_points":1000,"max_points":4999,"discount_percentage":10,"special_benefits":["Early sale access","Birthday bonus","Free shipping"],"color":"#C0C0C0","icon":"award"},{"name":"Gold","min_points":5000,"max_points":9999,"discount_percentage":15,"special_benefits":["Early sale access","Birthday bonus","Free shipping","Priority support"],"color":"#FFD700","icon":"crown"},{"name":"Platinum","min_points":10000,"discount_percentage":20,"special_benefits":["Early sale access","Birthday bonus","Free shipping","Priority support","Exclusive events"],"color":"#E5E4E2","icon":"sparkles"}],"welcome_bonus_points":100,"min_redemption_points":100,"max_redemption_percent":50}	2025-10-12 19:49:42.821105+00	2025-10-12 19:49:42.821105+00	\N
\.


--
-- Data for Name: sms_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sms_logs (id, recipient_phone, message, status, provider, message_id, cost, sent_at, error_message, created_at, phone_number, sent_by, device_id) FROM stdin;
\.


--
-- Data for Name: sms_triggers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sms_triggers (id, trigger_name, trigger_event, template_id, is_active, created_at, updated_at, name, trigger_type, message_template, created_by) FROM stdin;
\.


--
-- Data for Name: sms_trigger_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sms_trigger_logs (id, trigger_id, recipient, result, status, error, created_at) FROM stdin;
\.


--
-- Data for Name: user_branch_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_branch_assignments (id, user_id, branch_id, is_primary, can_manage, can_view_reports, can_manage_inventory, can_manage_staff, assigned_at, assigned_by) FROM stdin;
\.


--
-- Data for Name: user_daily_goals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_daily_goals (id, user_id, date, goal_amount, achieved_amount, is_achieved, created_at, updated_at, goal_type, is_active, goal_value) FROM stdin;
5acdec97-f5da-4ae8-9759-616dd20b4ba4	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20	0	0	f	2025-10-20 08:16:38.611395+00	2025-10-20 08:16:38.611395+00	new_customers	t	3
8e45f5ee-74e9-4e13-89d6-033d7930980b	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20	0	0	f	2025-10-20 08:16:39.827212+00	2025-10-20 08:16:39.827212+00	devices_processed	t	5
4e82c367-4821-4c3b-86df-6927e6aa110e	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21	0	0	f	2025-10-21 09:12:21.524286+00	2025-10-21 09:12:21.524286+00	new_customers	t	3
ef5fca7a-1957-46bb-aefd-d676854d86d2	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21	0	0	f	2025-10-21 09:12:22.64095+00	2025-10-21 09:12:22.64095+00	devices_processed	t	5
2018e35a-51e4-491a-97af-a62151c9436a	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-22	0	0	f	2025-10-22 08:14:16.59697+00	2025-10-22 08:14:16.59697+00	new_customers	t	3
7833f829-01a2-4894-b803-61b5038537ad	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-22	0	0	f	2025-10-22 08:14:20.069559+00	2025-10-22 08:14:20.069559+00	devices_processed	t	5
c8e18c51-0992-477c-87de-6f43164ebfa6	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23	0	0	f	2025-10-23 05:56:11.801766+00	2025-10-23 05:56:11.801766+00	new_customers	t	3
fe5956b6-0f7d-4f65-bcf1-e1f039d67b3c	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23	0	0	f	2025-10-23 05:56:12.349676+00	2025-10-23 05:56:12.349676+00	devices_processed	t	5
cd0c5101-f82b-4a62-a543-89281f4b3896	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26	0	0	f	2025-10-26 17:17:09.785898+00	2025-10-26 17:17:09.785898+00	new_customers	t	3
db889904-9943-4ad6-a235-a57ed24a130f	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26	0	0	f	2025-10-26 17:17:11.068985+00	2025-10-26 17:17:11.068985+00	devices_processed	t	5
\.


--
-- Data for Name: v_has_payment_method_column; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.v_has_payment_method_column ("exists") FROM stdin;
t
\.


--
-- Data for Name: webhook_endpoints; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.webhook_endpoints (id, user_id, name, url, events, is_active, secret, retry_attempts, timeout_seconds, last_triggered, success_count, failure_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: webhook_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.webhook_logs (id, webhook_id, event_type, payload, response_status, response_body, error_message, attempt_number, created_at) FROM stdin;
\.


--
-- Data for Name: whatsapp_instances_comprehensive; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.whatsapp_instances_comprehensive (id, user_id, instance_name, instance_id, phone_number, api_key, api_url, status, qr_code, is_active, last_connected, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: whatsapp_message_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.whatsapp_message_templates (id, template_name, template_content, variables, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: whatsapp_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.whatsapp_templates (id, template_id, template_name, language, category, status, body_text, created_at) FROM stdin;
\.


--
-- Name: customer_fix_backup_backup_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.customer_fix_backup_backup_id_seq', 1, true);


--
-- PostgreSQL database dump complete
--

