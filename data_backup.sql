pg_dump: warning: there are circular foreign-key constraints on this table:
pg_dump: detail: lats_categories
pg_dump: hint: You might not be able to restore the dump without using --disable-triggers or temporarily dropping the constraints.
pg_dump: hint: Consider using a full dump instead of a --data-only dump to avoid this problem.
pg_dump: warning: there are circular foreign-key constraints on this table:
pg_dump: detail: lats_product_variants
pg_dump: hint: You might not be able to restore the dump without using --disable-triggers or temporarily dropping the constraints.
pg_dump: hint: Consider using a full dump instead of a --data-only dump to avoid this problem.
pg_dump: warning: there are circular foreign-key constraints on this table:
pg_dump: detail: employees
pg_dump: hint: You might not be able to restore the dump without using --disable-triggers or temporarily dropping the constraints.
pg_dump: hint: Consider using a full dump instead of a --data-only dump to avoid this problem.
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
-- Data for Name: users_sync; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE neon_auth.users_sync DISABLE TRIGGER ALL;

COPY neon_auth.users_sync (raw_json, updated_at, deleted_at) FROM stdin;
{"id": "3da0df92-6f63-4ee2-b33d-3aa56e90d31d", "display_name": "123456", "has_password": false, "is_anonymous": false, "primary_email": "care@care.com", "selected_team": null, "auth_with_email": false, "client_metadata": null, "oauth_providers": [], "server_metadata": null, "otp_auth_enabled": false, "selected_team_id": null, "profile_image_url": null, "requires_totp_mfa": false, "signed_up_at_millis": 1759814617090, "passkey_auth_enabled": false, "last_active_at_millis": 1759814617090, "primary_email_verified": false, "client_read_only_metadata": null, "primary_email_auth_enabled": true}	2025-10-07 05:23:37+00	\N
\.


ALTER TABLE neon_auth.users_sync ENABLE TRIGGER ALL;

--
-- Data for Name: store_locations; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.store_locations DISABLE TRIGGER ALL;

COPY public.store_locations (id, name, code, address, city, state, zip_code, country, phone, email, manager_name, is_main, is_active, opening_time, closing_time, inventory_sync_enabled, pricing_model, tax_rate_override, created_at, updated_at, data_isolation_mode, share_products, share_customers, share_inventory, share_suppliers, share_categories, share_employees, allow_stock_transfer, auto_sync_products, auto_sync_prices, require_approval_for_transfers, can_view_other_branches, can_transfer_to_branches) FROM stdin;
115e0e51-d0d6-437b-9fda-dfe11241b167	ARUSHA	R-01	Tripple A	Arusha	Arusha	14113	Tanzania	0746605561	inauzwacare@gmail.com	Mtaasisis kaka	f	t	09:00:00	21:00:00	t	centralized	\N	2025-10-12 20:23:51.619+00	2025-10-19 16:20:47.174445+00	shared	t	t	t	t	t	t	t	t	t	f	t	{}
24cd45b8-1ce1-486a-b055-29d169c3a8ea	DAR	DAR-01	Lufungila	Dar es Salaam	Dar es salaam	14113	Tanzania	0712378850	xamuelhance10@gmail.com	Diana masika	t	t	09:00:00	21:00:00	t	centralized	\N	2025-10-12 19:26:49.704+00	2025-10-19 16:20:47.174445+00	shared	t	t	f	t	t	t	t	t	t	f	f	{}
\.


ALTER TABLE public.store_locations ENABLE TRIGGER ALL;

--
-- Data for Name: finance_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.finance_accounts DISABLE TRIGGER ALL;

COPY public.finance_accounts (id, account_name, account_type, account_number, bank_name, current_balance, currency, is_active, created_at, updated_at, is_payment_method, name, type, balance, requires_reference, requires_account_number, description, icon, color, branch_id, is_shared, notes) FROM stdin;
145fd59c-0d95-4c16-a4c3-21639df8aac1	test	mobile_money	453647589	Tigo	11454	USD	t	2025-10-25 07:29:18.020578+00	2025-10-25 07:29:18.020578+00	t	test	mobile_money	11454	f	f	\N	\N	\N	\N	f	edrfghj
71a4d960-0db5-4b9c-a880-5f0cebe9830b	CRDB Bank	bank	\N	CRDB Bank	0	TZS	t	2025-10-08 06:24:27.739231+00	2025-10-22 08:26:31.578+00	t	CRDB Bank	bank	1401408.6799999997	f	f	\N	Building2	#3B82F6	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N
9fd16c7a-7edf-4481-9dc1-611e0e5ba66f	Card Payments	credit_card	\N	\N	558963.35	TZS	t	2025-10-08 06:24:28.204342+00	2025-10-26 15:34:51.698+00	t	Card Payments	credit_card	558963.35	f	f	\N	CreditCard	#EC4899	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N
e10a3491-2c7a-4dad-a773-59a3144b776e	M-Pesa	mobile_money	\N	\N	-920109.70	TZS	t	2025-10-08 06:24:27.509086+00	2025-10-25 17:08:30.479338+00	t	M-Pesa	mobile_money	-920109.70	f	f	\N	Smartphone	#8B5CF6	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N
5e32c912-7ab7-444a-8ffd-02cb99b56a04	Cash	cash	\N	\N	657859.92	TZS	t	2025-10-08 06:24:27.074606+00	2025-10-26 15:41:44.110537+00	t	Cash	cash	657859.92	f	f	\N	Wallet	#10B981	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N
be81d1e6-79b7-4987-bf79-75abbbacb469	Tigo Pesa	mobile_money	\N	\N	0	TZS	t	2025-10-08 06:24:28.699742+00	2025-10-21 21:42:37.703979+00	t	Tigo Pesa	mobile_money	44332.00	f	f	\N	Smartphone	#8B5CF6	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N
\.


ALTER TABLE public.finance_accounts ENABLE TRIGGER ALL;

--
-- Data for Name: account_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.account_transactions DISABLE TRIGGER ALL;

COPY public.account_transactions (id, account_id, transaction_type, amount, balance_before, balance_after, reference_number, description, related_transaction_id, metadata, created_by, created_at, updated_at, related_entity_type, related_entity_id) FROM stdin;
b04fbe49-c402-49cc-adf8-45fac686963b	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	3000	307362.86	304362.86	PO-PAY-d7a5c0fe	PO Payment: PO-1760978303920 - Apple	d7a5c0fe-e60d-42cb-9034-123c3b71c1ec	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "d7a5c0fe-e60d-42cb-9034-123c3b71c1ec", "po_reference": "PO-1760978303920", "payment_method": "Cash", "purchase_order_id": "b4901e75-0aaf-4472-8433-547eca4a311e"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 16:40:01.392831+00	2025-10-20 16:40:01.392831+00	\N	\N
ccadbf2c-1a26-472f-b05f-38059853f5e3	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	160	280202.86	280042.86	PO-PAY-01ab8039	PO Payment: PO-1760981980768 - fgd	01ab8039-1c55-46cd-99ff-880df6b6a22a	{"type": "purchase_order_payment", "supplier": "fgd", "payment_id": "01ab8039-1c55-46cd-99ff-880df6b6a22a", "po_reference": "PO-1760981980768", "payment_method": "Cash", "purchase_order_id": "d5dd2c76-baff-4d18-9933-3fc171673b7b"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 17:40:12.968403+00	2025-10-20 17:40:12.968403+00	\N	\N
829daaba-78dd-4a92-8bef-fb03abda950f	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1200	276042.86	274842.86	PO-PAY-a52c4b88	PO Payment: PO-1760982836479 - Apple	a52c4b88-8d8d-4421-8f17-fc2c638db2a4	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "a52c4b88-8d8d-4421-8f17-fc2c638db2a4", "po_reference": "PO-1760982836479", "payment_method": "Cash", "purchase_order_id": "5c73e966-22c7-4415-8d1d-5a6d34b9db32"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 17:54:45.071548+00	2025-10-20 17:54:45.071548+00	\N	\N
93466bec-30d1-44f5-bf78-f70b4d9c9e5f	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	8000	260842.86	252842.86	PO-PAY-f2d29db8	PO Payment: PO-1760983511770 - Apple	f2d29db8-be08-4570-97da-ac914db44e6f	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "f2d29db8-be08-4570-97da-ac914db44e6f", "po_reference": "PO-1760983511770", "payment_method": "Cash", "purchase_order_id": "182df445-63c1-48f2-81cf-ca8261c559c7"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 18:05:52.009239+00	2025-10-20 18:05:52.009239+00	\N	\N
3a950a0d-652c-463b-95eb-42c0627b753f	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	600	252242.86	251642.86	PO-PAY-8cf3ca80	PO Payment: PO-1760984114920 - fgd	8cf3ca80-33bb-419b-a171-3001f6c32ba4	{"type": "purchase_order_payment", "supplier": "fgd", "payment_id": "8cf3ca80-33bb-419b-a171-3001f6c32ba4", "po_reference": "PO-1760984114920", "payment_method": "Cash", "purchase_order_id": "188b88db-a5a2-481b-b780-92caac7d74ac"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 18:15:47.144832+00	2025-10-20 18:15:47.144832+00	\N	\N
09c0fca3-62af-4136-960d-a38db1ce6298	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2800	248842.86	246042.86	PO-PAY-4ec5dc46	PO Payment: PO-1760989332736 - Apple	4ec5dc46-f215-475d-8f51-3dcad8c0801d	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "4ec5dc46-f215-475d-8f51-3dcad8c0801d", "po_reference": "PO-1760989332736", "payment_method": "Cash", "purchase_order_id": "c38eb121-96f4-45fb-9c8a-ec8832a08c90"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 19:45:17.440079+00	2025-10-20 19:45:17.440079+00	\N	\N
2ce2658c-b1c8-4901-a26d-c111d44adf07	71a4d960-0db5-4b9c-a880-5f0cebe9830b	expense	2400	1407030.00	1404630.00	PO-PAY-40831189	PO Payment: PO-1760992876299 - fgd	40831189-bad0-4382-9fd3-a41163bfe917	{"type": "purchase_order_payment", "supplier": "fgd", "payment_id": "40831189-bad0-4382-9fd3-a41163bfe917", "po_reference": "PO-1760992876299", "payment_method": "CRDB Bank", "purchase_order_id": "d1097776-af14-47a3-8a8b-cd01cd003a8d"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 20:41:37.320285+00	2025-10-20 20:41:37.320285+00	\N	\N
5ea5c734-cfe0-41ff-b2b4-47a438d2e144	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	4000	235242.86	231242.86	PO-PAY-4798a842	PO Payment: PO-1761024855792 - fgd	4798a842-ec6b-4193-88ea-e720e3ec8b75	{"type": "purchase_order_payment", "supplier": "fgd", "payment_id": "4798a842-ec6b-4193-88ea-e720e3ec8b75", "po_reference": "PO-1761024855792", "payment_method": "Cash", "purchase_order_id": "163a4f56-8834-4aef-b9be-13a7fdadffa3"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 05:34:30.811505+00	2025-10-21 05:34:30.811505+00	\N	\N
ec1eeb04-4d17-40ba-9024-1dc9b2714800	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	350000	-38757.14	-388757.14	PO-PAY-3a69c5de	PO Payment: PO-1761041081536 - Apple	3a69c5de-45b5-4365-8860-b4c9db4b65e8	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "3a69c5de-45b5-4365-8860-b4c9db4b65e8", "po_reference": "PO-1761041081536", "payment_method": "Cash", "purchase_order_id": "cee7d629-a885-4b74-8e98-6db1ad8e1360"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 10:04:58.963585+00	2025-10-21 10:04:58.963585+00	\N	\N
85be50bc-3c78-4264-b570-31dc5b707b3d	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	21154	-415911.14	-437065.14	PO-PAY-0e01ba1c	PO Payment: PO-1761043441719 - Apple	0e01ba1c-62c3-4fe6-bffa-83523a9c50a7	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "0e01ba1c-62c3-4fe6-bffa-83523a9c50a7", "po_reference": "PO-1761043441719", "payment_method": "Cash", "purchase_order_id": "b509da25-7021-4dc4-ad60-99e1204b2e74"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 10:45:21.628858+00	2025-10-21 10:45:21.628858+00	\N	\N
955d4d06-bfa9-492f-950c-0439c0b37e81	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	3000.00	-503825.14	-506825.14	PO-PAY-acb67fd6	PO Payment: PO-1761061492870 - fgd	acb67fd6-e716-4d87-8ad7-0171588a15de	{"notes": null, "currency": "TZS", "supplier_name": "fgd", "payment_method": "Cash", "purchase_order_id": "38cc0d8b-3043-4b37-a023-2eb6672f5d15", "purchase_order_number": "PO-1761061492870"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 15:45:27.403+00	2025-10-21 15:45:27.403+00	\N	\N
dc641ade-4b88-4f55-9f28-19fe0fa2ba1c	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	788	-523027.14	-523815.14	PO-PAY-961a004a	PO Payment: 9dec1d48 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 17:13:32.572+00	2025-10-21 17:13:32.865721+00	purchase_order_payment	961a004a-435f-4532-84e6-636a90f4899b
166a3bd3-1ad1-49cd-b20a-394c6529e667	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1000	-526391.14	-527391.14	PO-PAY-6d83b953	PO Payment: e18b93c6 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 19:39:40.68+00	2025-10-21 19:39:40.958384+00	purchase_order_payment	6d83b953-3c42-4af7-985f-662e6c20ec4b
89497364-4a4c-4c00-a9be-28bb589a73ad	be81d1e6-79b7-4987-bf79-75abbbacb469	expense	4000	48332.00	44332.00	EXP-1761082956517	Supplies: skjadasda	\N	{"category": "Supplies", "user_role": "admin", "created_via": "quick_expense", "vendor_name": "sadsada", "expense_date": "2025-10-21", "daily_sales_at_time": null}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 21:42:37.703979+00	2025-10-21 21:42:37.703979+00	\N	\N
90981fd5-18cb-42ce-8ee9-d7a5489183d9	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	41024.4	-526230.74	-485206.34	SALE-20484374-DK9W	POS sale payment (Cash)	\N	{"sale_id": "e39198ed-0ac7-462f-a7b3-bfd4fc16683d", "customer_id": "0fe06fb0-33e4-4122-8169-5e2b8cbedc16"}	\N	2025-10-22 08:08:05.318+00	2025-10-22 08:08:05.830477+00	\N	\N
636e55a3-a44d-4fbe-8f7c-e911ed95e5c1	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	1024.4	-483805.81	-482781.41	SALE-52902992-GYPK	POS sale payment (Cash)	\N	{"sale_id": "252871bc-709a-4b1c-9e2d-8c9a0c3b7374", "customer_id": "618791cf-c230-400c-abd7-d97fcc42a9b1"}	\N	2025-10-22 17:08:23.953+00	2025-10-22 17:08:24.324883+00	\N	\N
746326b3-d40f-4069-8d9d-8d325f6724a3	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	1200000	-482781.41	717218.59	SALE-58368105-KTCF	POS sale payment (Cash)	\N	{"sale_id": "6d2e344c-cec8-41f9-a1c9-a19e97aac2b5", "customer_id": "2c510481-26e6-43cb-b9d3-6de116e96889"}	\N	2025-10-22 18:39:29.39+00	2025-10-22 18:39:29.942408+00	\N	\N
26ecb1cc-a833-4627-a022-346c15353523	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	1200000	1917218.59	3117218.59	SALE-64509570-8PTM	POS sale payment (Cash)	\N	{"sale_id": "2d97b7e7-defc-4b5f-8706-c8d738fd2d0e", "customer_id": "aee285a4-12bc-4ec1-b95b-2c2f5505b05a"}	\N	2025-10-22 20:21:53.187+00	2025-10-22 20:21:54.18542+00	\N	\N
fc7c4301-29eb-49b6-8ee5-363d3102a339	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	1200000	5817218.59	7017218.59	SALE-02975703-FO75	POS sale payment (Cash)	\N	{"sale_id": "9d36147d-16f4-4623-821b-f7ddbaf5ae63", "customer_id": "aee285a4-12bc-4ec1-b95b-2c2f5505b05a"}	\N	2025-10-23 07:02:57.795+00	2025-10-23 07:02:58.653336+00	\N	\N
6f9b4ac4-ac5e-4c39-bc5a-a76249091a42	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	4000	7344718.59	7340718.59	PO-PAY-35f12f2f	PO Payment: 10644d77 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 10:32:07.508+00	2025-10-23 10:32:07.975286+00	purchase_order_payment	35f12f2f-a519-4c99-80fa-4da0d15ff9b1
bd70f856-b643-4a28-ab2f-b09a875de993	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	100000	7240718.59	7140718.59	PO-PAY-e2806ce3	PO Payment: 924eb721 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 13:11:49.344+00	2025-10-23 13:11:49.614826+00	purchase_order_payment	e2806ce3-53dd-4f1f-a5c5-24a7fd516703
1f62cea2-21c9-47c8-93d6-f28e5a757844	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	300000	6840718.59	6540718.59	PO-PAY-60a0aa15	PO Payment: 9ec21e1c (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 13:15:40.482+00	2025-10-23 13:15:40.749707+00	purchase_order_payment	60a0aa15-d021-47b0-8346-c385bfa9ea93
dbfdebad-f29a-4dcd-856c-b8e7521961ea	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	300000	6040718.59	5740718.59	PO-PAY-a63a3e27	PO Payment: 6827dc2c (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 14:12:04.361+00	2025-10-23 14:12:04.586493+00	purchase_order_payment	a63a3e27-e131-4103-8fbc-3eec176c8783
ce3a2247-d24b-4221-a83a-f7a253456bb6	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	200000	5540718.59	5340718.59	PO-PAY-8adaa051	PO Payment: f0eb5307 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 14:25:11.998+00	2025-10-23 14:25:12.502109+00	purchase_order_payment	8adaa051-fa73-421c-ae1c-a49c370ae91d
c964a4c4-0f8f-4c37-b106-4df31e0c4a99	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	12000	292362.86	280362.86	PO-PAY-11bc2d82	PO Payment: PO-1760980354578 - Apple	11bc2d82-14f4-47f9-87f1-7de7182c4ab7	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "11bc2d82-14f4-47f9-87f1-7de7182c4ab7", "po_reference": "PO-1760980354578", "payment_method": "Cash", "purchase_order_id": "599c5c6f-aa31-41e3-ade5-376bae7beb12"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 17:13:24.23219+00	2025-10-20 17:13:24.23219+00	\N	\N
aa8a7b23-85bf-4a55-9a0e-b45eead91062	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1400	278642.86	277242.86	PO-PAY-00238b41	PO Payment: PO-1760982204760 - Apple	00238b41-6669-4aaf-b803-6c2ea73a6ad8	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "00238b41-6669-4aaf-b803-6c2ea73a6ad8", "po_reference": "PO-1760982204760", "payment_method": "Cash", "purchase_order_id": "9200d441-9475-4f9d-b072-d5196139827a"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 17:44:06.125828+00	2025-10-20 17:44:06.125828+00	\N	\N
560c0660-3afc-47a6-a7b0-9c341845a3fc	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	3000	271842.86	268842.86	PO-PAY-498362b7	PO Payment: PO-1760983059258 - Apple	498362b7-7ed6-458a-be18-9cd36a0b2f95	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "498362b7-7ed6-458a-be18-9cd36a0b2f95", "po_reference": "PO-1760983059258", "payment_method": "Cash", "purchase_order_id": "6700bd3f-867f-4e9f-89d2-c044869bc4da"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 17:58:45.019131+00	2025-10-20 17:58:45.019131+00	\N	\N
4927840b-6e65-4d67-8100-f19c6fa6b895	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1800	244242.86	242442.86	PO-PAY-84bc183d	PO Payment: PO-1760991113007 - Apple	84bc183d-f352-42aa-adb1-2c6e6bf003b4	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "84bc183d-f352-42aa-adb1-2c6e6bf003b4", "po_reference": "PO-1760991113007", "payment_method": "Cash", "purchase_order_id": "8c6ec6fc-1a67-4702-9eda-f6f53b992770"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 20:12:10.485538+00	2025-10-20 20:12:10.485538+00	\N	\N
ae5048d9-b843-44d4-b3da-82e7306aaa77	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1600	240842.86	239242.86	PO-PAY-13cecfff	PO Payment: PO-1760994275693 - Apple	13cecfff-9388-499c-b2eb-1c4d421ccc48	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "13cecfff-9388-499c-b2eb-1c4d421ccc48", "po_reference": "PO-1760994275693", "payment_method": "Cash", "purchase_order_id": "1d9640a5-9cc5-42ed-8ab1-1d04960e471c"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 21:04:58.847304+00	2025-10-20 21:04:58.847304+00	\N	\N
0aee4ce2-3673-41ec-903d-a8efbbe012a3	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	80000	231242.86	311242.86	SALE-28343541-N4K7	POS sale payment (Cash)	\N	{"sale_id": "6a1e5244-b154-4de6-b535-bb87cc057c66", "customer_id": "f16015a0-c224-404d-8f3f-16ab8dfe146d"}	\N	2025-10-21 06:32:25.29+00	2025-10-21 06:32:26.139926+00	\N	\N
8d7578c0-a4b9-4738-9d23-e7c11a048b14	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	3000	-391757.14	-394757.14	PO-PAY-2a51ff70	PO Payment: PO-1761042313351 - Apple	2a51ff70-10d5-42bf-8468-a1a01de110ae	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "2a51ff70-10d5-42bf-8468-a1a01de110ae", "po_reference": "PO-1761042313351", "payment_method": "Cash", "purchase_order_id": "fa5d3423-694f-4641-aa56-f6af710623ec"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 10:26:07.775659+00	2025-10-21 10:26:07.775659+00	\N	\N
e74f6aff-04ce-478b-b8fc-6900fc395a4e	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	-439065.14	-441065.14	PO-PAY-eaeb7a95	PO Payment: PO-1761043821295 - Apple	eaeb7a95-309c-43b5-a629-b84fca3bfd81	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "eaeb7a95-309c-43b5-a629-b84fca3bfd81", "po_reference": "PO-1761043821295", "payment_method": "Cash", "purchase_order_id": "cb7354af-6b4d-463e-aa34-193e46a7c5a7"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 10:59:36.983473+00	2025-10-21 10:59:36.983473+00	\N	\N
601d6c1a-8181-48af-809a-75d8dcf2e2fd	e10a3491-2c7a-4dad-a773-59a3144b776e	expense	788	5080678.30	5079890.30	PO-PAY-68a64326	PO Payment: d7253f35 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 16:57:03.862+00	2025-10-21 16:57:04.209553+00	purchase_order_payment	68a64326-6dd2-46d7-81cd-7986141d97ff
c46a0d5e-d927-41b1-929d-d413ebddefa6	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	788	-524603.14	-525391.14	PO-PAY-cd8a984e	PO Payment: 387afa51 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 19:15:56.161+00	2025-10-21 19:15:56.427734+00	purchase_order_payment	cd8a984e-cb32-4fcb-b290-989fd38f699c
fe7c1fe7-b0cb-4f4b-8d69-1fc3ea4e7909	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2500000.00	4335583.86	1835583.86	PO-PAY-d1fc544f	PO Payment: PO-1760429589358 - fgd	d1fc544f-f31a-47ee-9c3e-623fcf63a6cb	{"type": "purchase_order_payment", "currency": "TZS", "supplier": "fgd", "backfilled": true, "payment_id": "d1fc544f-f31a-47ee-9c3e-623fcf63a6cb", "po_reference": "PO-1760429589358", "backfill_date": "2025-10-14T08:47:45.265172+00:00", "payment_method": "Cash", "purchase_order_id": "fcc9b441-1ad8-4999-a0d8-283f9696264d"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-14 08:15:00.994542+00	2025-10-14 08:47:45.265172+00	\N	\N
785b41ff-9669-4985-a187-570f3849ba83	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	1024.4	-527391.14	-526366.74	SALE-77268507-HAAA	POS sale payment (Cash)	\N	{"sale_id": "8420dff1-8ff9-49e7-949c-e2c97e7a5b7d", "customer_id": "54ebcb36-3c3e-4512-898a-91582c73adf9"}	\N	2025-10-21 20:07:49.542+00	2025-10-21 20:07:49.91981+00	\N	\N
9a958e84-39a1-4d73-8bf1-433a12b5a36b	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	1024.4	-485206.34	-484181.94	SALE-20680575-2YQB	POS sale payment (Cash)	\N	{"sale_id": "772f49c2-4875-4f56-80b8-172fe0944187", "customer_id": "f16015a0-c224-404d-8f3f-16ab8dfe146d"}	\N	2025-10-22 08:11:21.592+00	2025-10-22 08:11:22.102397+00	\N	\N
b93982b0-f98f-45a0-9ab4-308bd1d37c2a	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	1200000	717218.59	1917218.59	SALE-60444224-RARC	POS sale payment (Cash)	\N	{"sale_id": "cc4215e2-f8ec-4ead-a41c-88b70b04dd98", "customer_id": "2c510481-26e6-43cb-b9d3-6de116e96889"}	\N	2025-10-22 19:14:07.121+00	2025-10-22 19:14:07.954639+00	\N	\N
e8f64cc7-9d51-4de6-a9e4-3a0b57d0fa6c	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	2700000	3117218.59	5817218.59	SALE-65198194-TXJT	POS sale payment (Cash)	\N	{"sale_id": "9e8a097b-f821-47a6-ace0-26b0c8862caf", "customer_id": "54ebcb36-3c3e-4512-898a-91582c73adf9"}	\N	2025-10-22 20:33:21.983+00	2025-10-22 20:33:23.222609+00	\N	\N
030a3433-92d3-4232-97bd-845183c11a55	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	331500	7017218.59	7348718.59	SALE-09139543-R8CV	POS sale payment (Cash)	\N	{"sale_id": "71ca8e45-5070-48c3-8a4f-88ce41b2f594", "customer_id": "49d30400-38e4-47c7-85f2-29b72aaad0c7"}	\N	2025-10-23 08:45:41.152+00	2025-10-23 08:45:41.683897+00	\N	\N
41bfbf17-8ee8-4ba2-bda0-6999d719bb36	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	100000	6440718.59	6340718.59	PO-PAY-43f183aa	PO Payment: 9abe3706 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 13:59:15.063+00	2025-10-23 13:59:15.324047+00	purchase_order_payment	43f183aa-d181-41cc-926f-00cf384a0eef
8eec1ba8-18d6-4279-9c9b-ae68e118dc9b	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	648	316311.86	315663.86	PO-PAY-484e6392	PO Payment: PO-1760879082386 - fgd	484e6392-4c42-4995-9754-95109da8dda6	{"type": "purchase_order_payment", "supplier": "fgd", "payment_id": "484e6392-4c42-4995-9754-95109da8dda6", "po_reference": "PO-1760879082386", "payment_method": "Cash", "purchase_order_id": "24730cce-bfba-4e64-b9af-3643eb7a85c5"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-19 13:06:50.652577+00	2025-10-19 13:06:50.652577+00	\N	\N
8adb81f3-1e91-4ba2-946f-6191570dcddd	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	99	315663.86	315762.86	SALE-99704131-EVOX	POS sale payment (Cash)	\N	{"sale_id": "e65fb9b2-ef49-4d0d-ad4d-748a40b6326a", "customer_id": "ed2487c0-1a65-4d5d-98e3-78bd13fe8243"}	\N	2025-10-19 18:48:25.777+00	2025-10-19 18:48:26.809985+00	\N	\N
eb3647b5-3837-48cf-acab-ccdd18bfbd94	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	900	314862.86	313962.86	PO-PAY-17dd9c52	PO Payment: PO-1760954102459 - Apple	17dd9c52-d7b5-41ae-9b93-106d2e1bfa78	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "17dd9c52-d7b5-41ae-9b93-106d2e1bfa78", "po_reference": "PO-1760954102459", "payment_method": "Cash", "purchase_order_id": "48e6e1ec-9604-44d4-a111-8a83c4bdf5f5"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 09:58:57.024284+00	2025-10-20 09:58:57.024284+00	\N	\N
46090a43-f9ff-44b2-aea3-8dfd10077cdd	71a4d960-0db5-4b9c-a880-5f0cebe9830b	expense	50000	1459430.00	1409430.00	PO-PAY-4ae0b8cb	PO Payment: PO-1760972340720 - Apple	4ae0b8cb-e3dd-4efd-a199-70f8b0f8ea17	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "4ae0b8cb-e3dd-4efd-a199-70f8b0f8ea17", "po_reference": "PO-1760972340720", "payment_method": "CRDB Bank", "purchase_order_id": "a562ab0e-9754-43dd-a140-f62c77e2c095"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 15:01:14.389795+00	2025-10-20 15:01:14.389795+00	\N	\N
187e6937-4fda-4f6b-88c7-22db51003d54	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1800	312162.86	310362.86	PO-PAY-a35a2cdf	PO Payment: PO-1760973289667 - Apple	a35a2cdf-906c-4227-9b31-483bd0c85c0e	{"type": "purchase_order_payment", "supplier": "Apple", "payment_id": "a35a2cdf-906c-4227-9b31-483bd0c85c0e", "po_reference": "PO-1760973289667", "payment_method": "Cash", "purchase_order_id": "fb6a21cf-1a59-4197-9802-5d1106c7d995"}	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-20 15:16:10.849394+00	2025-10-20 15:16:10.849394+00	\N	\N
717530ae-d496-4d35-a055-5e5e6419f4ae	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	1100000	5340718.59	6440718.59	SALE-30656303-J9NI	POS sale payment (Cash)	\N	{"sale_id": "b968d93f-646a-419f-9b49-c2f4c2b5aa9c", "customer_id": "aee285a4-12bc-4ec1-b95b-2c2f5505b05a"}	\N	2025-10-23 14:44:17.945+00	2025-10-23 14:44:18.50893+00	\N	\N
d82b75cb-42e7-47eb-b434-c99cf087e3e6	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	390000	6440718.59	6830718.59	SALE-30926673-2PCB	POS sale payment (Cash)	\N	{"sale_id": "04742104-1dd7-48b6-9a29-803ef9aa051f", "customer_id": "54ebcb36-3c3e-4512-898a-91582c73adf9"}	\N	2025-10-23 14:48:48.245+00	2025-10-23 14:48:48.78947+00	\N	\N
4093cb24-5a35-409e-9d38-9e67ddc062bb	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	6750	6830718.59	6837468.59	SALE-31155743-CMJ5	POS sale payment (Cash)	\N	{"sale_id": "d33eda82-b104-4984-b223-6f2205e07f07", "customer_id": "aee285a4-12bc-4ec1-b95b-2c2f5505b05a"}	\N	2025-10-23 14:52:37.319+00	2025-10-23 14:52:37.870415+00	\N	\N
22285550-f565-40a0-9332-8e99d6275c9a	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	1560	6837468.59	6839028.59	SALE-31244505-GF8M	POS sale payment (Cash)	\N	{"sale_id": "1b32375c-7d3a-4d3a-9c71-bab223d54c93", "customer_id": "54ebcb36-3c3e-4512-898a-91582c73adf9"}	\N	2025-10-23 14:54:06.02+00	2025-10-23 14:54:06.55998+00	\N	\N
33906355-8e84-4d36-bce4-a7a7b91ee753	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	3550	6839028.59	6842578.59	SALE-31734555-I4TL	POS sale payment (Cash)	\N	{"sale_id": "2f82f194-0967-4439-b53c-7dbc39de15c3", "customer_id": "2c510481-26e6-43cb-b9d3-6de116e96889"}	\N	2025-10-23 15:02:16.096+00	2025-10-23 15:02:16.662207+00	\N	\N
7d6864c3-19f9-4aab-b957-ce15760ec6b3	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	600000	6242578.59	5642578.59	PO-PAY-47b36731	PO Payment: f1455488 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 17:37:46.558+00	2025-10-23 17:37:47.161428+00	purchase_order_payment	47b36731-fd30-458f-858d-cd65bb0f61e2
db7d24ae-a980-4e06-9bda-a63eded32b8f	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	600000	5042578.59	4442578.59	PO-PAY-d12e6e3d	PO Payment: 7e2d255f (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 17:54:08.025+00	2025-10-23 17:54:08.54909+00	purchase_order_payment	d12e6e3d-63f9-49c8-b23c-9e0d71c5b9cc
f935e6b7-d4ea-4982-968c-72de7fc2a179	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	600000	3842578.59	3242578.59	PO-PAY-97aeb690	PO Payment: a9df335d (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 18:09:26.689+00	2025-10-23 18:09:27.346488+00	purchase_order_payment	97aeb690-f8e6-447b-b85a-95b14c524026
b46a23c1-bcbd-40e8-bec5-dea019a377ee	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	9000	3233578.59	3224578.59	PO-PAY-3543e970	PO Payment: 44460755 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 18:31:31.737+00	2025-10-23 18:31:32.4392+00	purchase_order_payment	3543e970-1549-4483-b1c6-92bda5bdc494
57fe6386-b6dd-498c-bb2d-a22f03d9e1ab	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	3222578.59	3220578.59	PO-PAY-005fd821	PO Payment: 100507a5 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 20:59:31.513+00	2025-10-23 20:59:33.001033+00	purchase_order_payment	005fd821-9004-440e-b23e-83beff9e2d32
fa74353e-6b91-48c6-af41-4c72a1346160	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	3218578.59	3216578.59	PO-PAY-bd338e54	PO Payment: e27bdd56 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 21:15:10.516+00	2025-10-23 21:15:11.945295+00	purchase_order_payment	bd338e54-c931-4fb3-a45e-391e00c54823
20b6c496-54c8-4235-841e-eab2bb7ae617	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	4000	3212578.59	3208578.59	PO-PAY-d653a3f6	PO Payment: 0c59cdb4 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-23 23:27:56.492+00	2025-10-23 23:27:57.341436+00	purchase_order_payment	d653a3f6-12c3-4feb-ac20-0c4be4645ab2
8f1b13ed-e3bb-4be6-9451-8758136a58fe	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	6000	3202578.59	3196578.59	PO-PAY-2e89e284	PO Payment: 101cb0f2 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-24 00:26:30.02+00	2025-10-24 00:26:30.64178+00	purchase_order_payment	2e89e284-dd89-4966-b40d-e6fc2a0e396b
55cefca5-6069-4078-ab78-25f223ed97eb	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	8000	3188578.59	3180578.59	PO-PAY-35cf435a	PO Payment: 74b40477 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-24 01:01:50.854+00	2025-10-24 01:01:51.632004+00	purchase_order_payment	35cf435a-9ee4-442e-abdd-589ccac048b5
559a2010-690f-4505-b329-082677505a93	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	3000	3177578.59	3174578.59	PO-PAY-9f1ab976	PO Payment: 2a0f5e41 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-24 01:27:58.002+00	2025-10-24 01:27:58.641034+00	purchase_order_payment	9f1ab976-e9b9-4fb9-924d-c0db41cd7521
1fdbd12c-3bd8-4767-b9b3-6c8ab41eea7b	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	2600	3174578.59	3177178.59	SALE-70369017-BXCS	POS sale payment (Cash)	\N	{"sale_id": "eec07f4a-6aa0-421f-9777-b5075101c48a", "customer_id": "2c510481-26e6-43cb-b9d3-6de116e96889"}	\N	2025-10-24 01:46:10.867+00	2025-10-24 01:46:11.552946+00	\N	\N
683601da-4f50-4da1-b9f0-bdedd55d4609	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	2600	3177178.59	3179778.59	SALE-70515182-LQGP	POS sale payment (Cash)	\N	{"sale_id": "77478dae-de16-4e19-a3cb-31e40cebe6fb", "customer_id": "2c510481-26e6-43cb-b9d3-6de116e96889"}	\N	2025-10-24 01:48:37.018+00	2025-10-24 01:48:37.720176+00	\N	\N
bcd3a06d-1963-4607-a4e2-3774880722af	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	200000	3179778.59	3379778.59	SALE-70814649-UCPF	POS sale payment (Cash)	\N	{"sale_id": "d5b7dd38-1ef2-47ee-bb67-e28a0d2fc017", "customer_id": "2c510481-26e6-43cb-b9d3-6de116e96889"}	\N	2025-10-24 01:53:36.475+00	2025-10-24 01:53:37.165831+00	\N	\N
79e68c94-a3bd-4759-bfed-53be98698e6e	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	4000	3375778.59	3371778.59	PO-PAY-37a50426	PO Payment: 24dd7e86 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-24 02:15:07.217+00	2025-10-24 02:15:07.897618+00	purchase_order_payment	37a50426-8518-417f-b8c4-33883294bdc5
a6085609-f961-4cf4-a019-4fc39aae3476	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	6000	3365778.59	3359778.59	PO-PAY-962ae287	PO Payment: 58655b19 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-24 02:29:49.687+00	2025-10-24 02:29:50.349236+00	purchase_order_payment	962ae287-7d1f-44a5-902b-562d0d626374
cf7404ab-838e-439b-ab83-d2984f55517c	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	4000	3355778.59	3351778.59	PO-PAY-aa4a1696	PO Payment: 84133019 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-24 06:16:51.009+00	2025-10-24 06:16:51.61954+00	purchase_order_payment	aa4a1696-3a1e-429f-a79d-a88a440903d9
a30cd613-7767-49ab-884d-bc42929aa85a	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	3349778.59	3347778.59	PO-PAY-7a2e6f7e	PO Payment: b2329b52 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-24 06:33:00.079+00	2025-10-24 06:33:00.687389+00	purchase_order_payment	7a2e6f7e-4017-4b1c-878e-f74840fe746c
d9bf0979-0c9a-4c8d-8739-7dc3ca0054d3	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	3345778.59	3343778.59	PO-PAY-62c92a79	PO Payment: 58e94bb6 (Fallback Method)	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-24 06:46:05.985+00	2025-10-24 06:46:06.682942+00	purchase_order_payment	62c92a79-3287-470d-bc79-4916b534c1ca
833ea287-8f4e-4202-935a-8e1f9f129932	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	3341778.59	3339778.59	PO-PAY-9b3c5cb9	PO Payment: Payment #9b3c5cb9	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-24 07:02:01.001408+00	2025-10-24 07:02:01.001408+00	purchase_order_payment	9b3c5cb9-318a-472d-b9a2-a783b4390beb
31ad84cc-d05a-4018-87a5-032ecec93fc9	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	200000	3139778.59	2939778.59	PO-PAY-367bc881	PO Payment: Payment #367bc881	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-24 07:31:07.131682+00	2025-10-24 07:31:07.131682+00	purchase_order_payment	367bc881-c7fb-45e3-b390-383547f12c84
e4ec43a6-32bd-4c18-9a0c-628d739fe012	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1576	2938202.59	2936626.59	PO-PAY-467dda7b	PO Payment: Payment #467dda7b	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-24 23:05:03.838021+00	2025-10-24 23:05:03.838021+00	purchase_order_payment	467dda7b-9bf5-491f-a8ab-f55120478604
5dfa50f8-5f26-4edc-a315-56ab0d39b4bf	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	2934626.59	2932626.59	PO-PAY-35a0cbc1	PO Payment: Payment #35a0cbc1	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-25 07:53:20.872793+00	2025-10-25 07:53:20.872793+00	purchase_order_payment	35a0cbc1-d02a-417d-b2bf-0f455da25200
6ad6832b-08b2-4a4b-a9ee-1e3f1fe2e4e0	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1000	2931626.59	2930626.59	PO-PAY-6f031c6b	PO Payment: Payment #6f031c6b	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-25 08:36:58.098077+00	2025-10-25 08:36:58.098077+00	purchase_order_payment	6f031c6b-98c4-4620-aafa-4d5cf24d6162
e73f2390-89c4-477c-9b90-16aa08a6f33d	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	2928626.59	2926626.59	PO-PAY-86937811	PO Payment: Payment #86937811	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-25 09:02:04.847324+00	2025-10-25 09:02:04.847324+00	purchase_order_payment	86937811-ced1-4506-ae9e-39e4108cd43a
8df0c2ac-3335-425f-a2a5-8aa5f26ee7e6	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	2924626.59	2922626.59	PO-PAY-caa4198f	PO Payment: Payment #caa4198f	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-25 09:18:42.867172+00	2025-10-25 09:18:42.867172+00	purchase_order_payment	caa4198f-f312-42f2-98d1-bac7d63e2a9f
81e90754-ef88-43ba-959b-ca141fdb3c6f	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	2920626.59	2918626.59	PO-PAY-1da3af9a	PO Payment: Payment #1da3af9a	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-25 09:54:03.058727+00	2025-10-25 09:54:03.058727+00	purchase_order_payment	1da3af9a-e580-409d-9c5a-d7349f8ceece
7fa83d0a-8d26-47ba-9b40-15de5a3f14f1	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	2916626.59	2914626.59	PO-PAY-7f664c01	PO Payment: Payment #7f664c01	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-25 12:44:31.145964+00	2025-10-25 12:44:31.145964+00	purchase_order_payment	7f664c01-e53b-4923-8635-46926cfb2c3b
a90ed6db-8de4-417e-b83a-a1a0585080a6	e10a3491-2c7a-4dad-a773-59a3144b776e	expense	3000000	2079890.30	-920109.70	PO-PAY-349b1415	PO Payment: Payment #349b1415	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-25 17:08:30.479338+00	2025-10-25 17:08:30.479338+00	purchase_order_payment	349b1415-2b95-4274-a395-e84d2ea25de5
f9813e2a-cf8f-46da-871f-b38b5ebd2112	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1200	2913426.59	2912226.59	PO-PAY-72876ade	PO Payment: Payment #72876ade	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-25 17:48:48.296302+00	2025-10-25 17:48:48.296302+00	purchase_order_payment	72876ade-3671-49d0-bc21-15a987201662
084a07d1-e650-4f6d-a03e-02a2f1c84adb	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1200	2911026.59	2909826.59	PO-PAY-70362121	PO Payment: Payment #70362121	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-25 17:53:59.097295+00	2025-10-25 17:53:59.097295+00	purchase_order_payment	70362121-c196-4671-996e-0d10c15bc5ad
5cea74c1-58e4-4546-a609-f741e2638478	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1200	2908626.59	2907426.59	PO-PAY-4cdf4137	PO Payment: Payment #4cdf4137	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-25 20:37:50.484228+00	2025-10-25 20:37:50.484228+00	purchase_order_payment	4cdf4137-264e-403e-ac78-28f04cc7837b
7f64abcb-bad5-4362-ab75-dfb2607c268c	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	600	2906826.59	2906226.59	PO-PAY-8464d344	PO Payment: Payment #8464d344	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-25 21:08:57.350922+00	2025-10-25 21:08:57.350922+00	purchase_order_payment	8464d344-9700-4549-bbee-421492e4ae39
026f65fb-48fd-49c3-a679-4725faa01528	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	2904226.59	2902226.59	PO-PAY-d282c9d4	PO Payment: Payment #d282c9d4	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-25 21:13:22.10379+00	2025-10-25 21:13:22.10379+00	purchase_order_payment	d282c9d4-d278-408a-bd29-3c39dc3fd058
1d028620-8abf-4e23-90aa-380a33529d17	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1000	2901226.59	2900226.59	PO-PAY-c86d91a6	PO Payment: Payment #c86d91a6	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 07:00:30.385264+00	2025-10-26 07:00:30.385264+00	purchase_order_payment	c86d91a6-ce0b-43c7-b1c9-cb94c67b3f5f
df7fc0af-acc9-4099-b368-ef154f7ee8ce	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1000	2899226.59	2898226.59	PO-PAY-d7b6d9c0	PO Payment: Payment #d7b6d9c0	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 08:00:53.481119+00	2025-10-26 08:00:53.481119+00	purchase_order_payment	d7b6d9c0-a4ce-42a4-8750-741f24819e3a
6c311217-c403-4e62-b90b-1b76868c3d92	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1000	2897226.59	2896226.59	PO-PAY-2dc1e20c	PO Payment: Payment #2dc1e20c	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 08:07:05.901064+00	2025-10-26 08:07:05.901064+00	purchase_order_payment	2dc1e20c-ec08-4c05-a8a8-84a3974212e5
0ab26151-8e47-4260-ae06-f25d7cf6b312	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	2000	2894226.59	2892226.59	PO-PAY-af0ecfa0	PO Payment: Payment #af0ecfa0	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 08:42:27.231696+00	2025-10-26 08:42:27.231696+00	purchase_order_payment	af0ecfa0-20ae-4a90-8dfb-14712fb7c85e
1651f364-597f-4c33-b293-0c9321ac81fc	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	502300	2892226.59	3394526.59	SALE-79334018-EVQ7	POS sale payment (Cash)	\N	{"sale_id": "0627a023-e0a9-4a57-bebc-cf340e02e3f8", "customer_id": "f16015a0-c224-404d-8f3f-16ab8dfe146d"}	\N	2025-10-26 11:48:55.002+00	2025-10-26 11:48:55.276977+00	\N	\N
f672231d-0528-448f-a6d8-5a5b991d7aef	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	201000	3394526.59	3595526.59	SALE-81341752-AJBB	POS sale payment (Cash)	\N	{"sale_id": "290814fc-a066-4fc7-8a6e-1fe17fc0c11c", "customer_id": "f16015a0-c224-404d-8f3f-16ab8dfe146d"}	\N	2025-10-26 12:22:23.623+00	2025-10-26 12:22:24.218792+00	\N	\N
db25dbdc-e90e-4a19-993a-56bfa4e4a8ae	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1000	3594526.59	3593526.59	PO-PAY-232a8c86	PO Payment: Payment #232a8c86	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 12:25:58.528457+00	2025-10-26 12:25:58.528457+00	purchase_order_payment	232a8c86-bd41-465b-8f59-5746481165c2
c05b35cc-7721-4f92-ba4a-1a4d37359eb5	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	1000	3592526.59	3591526.59	PO-PAY-87035c0b	PO Payment: Payment #87035c0b	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 12:42:51.792414+00	2025-10-26 12:42:51.792414+00	purchase_order_payment	87035c0b-24fe-4021-8c05-fadb7ae15a6b
d520ffbe-5d45-41d5-b407-1b6f1d100eb7	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	4000	3587526.59	3583526.59	PO-PAY-4550a19d	PO Payment: Payment #4550a19d	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 12:55:14.768744+00	2025-10-26 12:55:14.768744+00	purchase_order_payment	4550a19d-841d-442a-bbd9-fd9bcb50d99f
a0268ebb-2b52-4998-ba24-d614a4f24e07	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	201000	3583526.59	3784526.59	SALE-84571797-MRZQ	POS sale payment (Cash)	\N	{"sale_id": "578346db-93be-46e8-bafc-37f32d96a90d", "customer_id": "0fe06fb0-33e4-4122-8169-5e2b8cbedc16"}	\N	2025-10-26 13:16:12.787+00	2025-10-26 13:16:13.086986+00	\N	\N
aee12f94-c554-4d6f-9c4a-c2ac87e0d848	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	200000	3584526.59	3384526.59	PO-PAY-e14c203e	PO Payment: Payment #e14c203e	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 14:22:32.223503+00	2025-10-26 14:22:32.223503+00	purchase_order_payment	e14c203e-0051-4a03-843d-67069caf95b5
31725f2c-faf1-4837-a25b-cdc3f8ea6142	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	230000	3154526.59	2924526.59	PO-PAY-7ef7b228	PO Payment: Payment #7ef7b228	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 14:36:03.164319+00	2025-10-26 14:36:03.164319+00	purchase_order_payment	7ef7b228-cbbc-45ce-a7d9-74f5c559d39a
9814f018-2cb5-48fd-b52d-dab5c29c040c	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	2000000	4924526.59	6924526.59	rewrwerwer	test	\N	{"entry_type": "deposit", "account_name": "Cash", "manual_entry": true}	\N	2025-10-26 15:12:36.898+00	2025-10-26 15:12:37.762092+00	\N	\N
4f0b2bae-9036-4e39-a0d5-d111ea741650	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	4300000	2624526.59	-1675473.41	PO-PAY-0110e3cf	PO Payment: Payment #0110e3cf	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 15:13:08.985689+00	2025-10-26 15:13:08.985689+00	purchase_order_payment	0110e3cf-fe70-4176-a742-9647e60ee3c8
dc6fe060-aa0b-45e6-8db9-7026ac7e7859	5e32c912-7ab7-444a-8ffd-02cb99b56a04	payment_received	1845000	-1675473.41	169526.59	SALE-92449904-1IJW	POS sale payment (Cash)	\N	{"sale_id": "236422b2-d25a-4a0e-bd81-15db2bdb604e", "customer_id": "32e18fb2-6ea4-4517-a364-7a3c7aa6bdd0"}	\N	2025-10-26 15:27:31.852+00	2025-10-26 15:27:32.761393+00	\N	\N
a271d124-0296-46f0-87f1-b57d5475434e	5e32c912-7ab7-444a-8ffd-02cb99b56a04	expense	30000	687859.92	657859.92	PO-PAY-2e16120b	PO Payment: Payment #2e16120b	\N	\N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 15:41:44.110537+00	2025-10-26 15:41:44.110537+00	purchase_order_payment	2e16120b-f441-40fe-8579-fb00dcd57306
\.


ALTER TABLE public.account_transactions ENABLE TRIGGER ALL;

--
-- Data for Name: admin_settings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings DISABLE TRIGGER ALL;

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


ALTER TABLE public.admin_settings ENABLE TRIGGER ALL;

--
-- Data for Name: admin_settings_log; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings_log DISABLE TRIGGER ALL;

COPY public.admin_settings_log (id, category, setting_key, old_value, new_value, changed_by, change_reason, changed_at) FROM stdin;
\.


ALTER TABLE public.admin_settings_log ENABLE TRIGGER ALL;

--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.api_keys DISABLE TRIGGER ALL;

COPY public.api_keys (id, user_id, name, key, scopes, is_active, last_used, expires_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.api_keys ENABLE TRIGGER ALL;

--
-- Data for Name: api_request_logs; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.api_request_logs DISABLE TRIGGER ALL;

COPY public.api_request_logs (id, api_key_id, endpoint, method, ip_address, user_agent, response_status, response_time_ms, created_at) FROM stdin;
\.


ALTER TABLE public.api_request_logs ENABLE TRIGGER ALL;

--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customers DISABLE TRIGGER ALL;

COPY public.customers (id, name, email, phone, gender, city, joined_date, loyalty_level, color_tag, total_spent, points, last_visit, is_active, referral_source, birth_month, birth_day, customer_tag, notes, total_returns, initial_notes, location_description, national_id, created_at, updated_at, profile_image, whatsapp, whatsapp_opt_out, created_by, last_purchase_date, total_purchases, birthday, referred_by, total_calls, total_call_duration_minutes, incoming_calls, outgoing_calls, missed_calls, avg_call_duration_minutes, first_call_date, last_call_date, call_loyalty_level, last_activity_date, referrals, branch_id, is_shared, preferred_branch_id, visible_to_branches, sharing_mode, created_by_branch_id, created_by_branch_name, country) FROM stdin;
aee285a4-12bc-4ec1-b95b-2c2f5505b05a	Samuel masika		+255746605561	male	Dar es Salaam	2025-10-11	bronze	vip	4108086.4	4313	2025-10-23 14:52:37.831+00	t	Friend	June	3	\N	["Mteja mzuri sana kanunua simu nyingi sana"]	0		\N	\N	2025-10-11 11:12:16.029821+00	2025-10-23 14:52:37.831+00	\N	+255746605561	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-21 05:59:16.586037+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
50f1d27a-a2c8-4899-b854-80b875c26782	John Mwamba	john.mwamba@example.com	+255712345678	male	Dar es Salaam	2025-10-11	bronze	new	4343	14	2025-10-11 12:56:43.012+00	t	Walk-in	January	15	\N	\N	0	\N	\N	\N	2025-10-11 10:07:52.395+00	2025-10-13 19:57:33.958669+00	\N	+255712345678	f	\N	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-13 19:57:33.958669+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
32e18fb2-6ea4-4517-a364-7a3c7aa6bdd0	Vee		+255673219190	female	Arusha	2025-10-26	bronze	new	3490000	3490	2025-10-26 15:33:32.585+00	t	Other	May	7	\N	\N	0		\N	\N	2025-10-26 15:25:48.608637+00	2025-10-26 15:33:32.585+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-26 15:25:48.608637+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	DAR	\N
5ca5204d-8c3c-4e61-82da-e59b19bc3441	Test Customer	test@example.com	1234567890	\N	\N	\N	bronze	\N	7559.5	115	2025-10-10 19:40:09.898+00	t	\N	\N	\N	\N	\N	0	\N	\N	\N	2025-10-07 06:52:00.320178+00	2025-10-10 19:40:09.898+00	\N	\N	f	\N	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-10 23:31:00.061604+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
0d949b9b-720f-4670-a521-e2bef9eceeed	Samuel masika		+255712378850	male	Arusha	\N	bronze	new	0	105	2025-10-10 06:22:40.426+00	t	Friend	March	3	\N	\N	0		\N	\N	2025-10-08 19:13:08.216+00	2025-10-21 06:01:08.913564+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-21 06:01:08.913564+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
618791cf-c230-400c-abd7-d97fcc42a9b1	12345		+255746605561	female	Dar es Salaam	2025-10-11	bronze	new	1047.4	1	2025-10-22 17:08:24.266+00	t	Event	\N	\N	\N	\N	0		\N	\N	2025-10-11 11:12:50.629213+00	2025-10-22 17:08:24.266+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-11 11:12:50.629213+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
49d30400-38e4-47c7-85f2-29b72aaad0c7	Mary Kamwela	mary.kamwela@example.com	+255787654321	female	Arusha	2025-10-11	bronze	new	336442	345	2025-10-23 08:45:41.719+00	t	Friend	March	22	\N	\N	0	\N	\N	\N	2025-10-11 10:07:56.417+00	2025-10-23 08:45:41.719+00	\N	+255787654321	f	\N	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-11 10:07:57.172728+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
0fe06fb0-33e4-4122-8169-5e2b8cbedc16	2222222		+255746605568	male	Dar es Salaam	2025-10-13	bronze	new	582128.4	582	2025-10-26 13:16:13.116+00	t	Walk-in	February	3	\N	\N	0		\N	\N	2025-10-13 06:16:34.256957+00	2025-10-26 13:16:13.116+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-21 07:02:37.774522+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
ed2487c0-1a65-4d5d-98e3-78bd13fe8243	Norah		+255699485663	female	Arusha	2025-10-18	bronze	new	1099	1	2025-10-19 18:48:26.479+00	t	Instagram	September	13	\N	\N	0		\N	\N	2025-10-18 13:31:26.937576+00	2025-10-19 18:48:26.479+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-18 13:31:26.937576+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
2c510481-26e6-43cb-b9d3-6de116e96889	Arusha		+255746605500	female	Dar es Salaam	2025-10-13	gold	new	10099030.06	10221	2025-10-24 01:53:37.077+00	t	Friend	February	2	\N	\N	0		\N	\N	2025-10-13 08:45:24.068998+00	2025-10-24 01:53:37.077+00	\N	+255746605500	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-23 09:36:53.538071+00	[]	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	\N	isolated	115e0e51-d0d6-437b-9fda-dfe11241b167	ARUSHA	\N
4e4b2f94-3b07-405c-ad56-744c3926f4c7	Sssssssss		+255746605560	male	Dar es Salaam	2025-10-13	bronze	new	30	105	2025-10-18 17:09:39.942+00	t	Business Card	March	2	\N	\N	0		\N	\N	2025-10-13 06:18:22.522473+00	2025-10-21 05:57:49.264484+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-21 05:57:49.264484+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
f16015a0-c224-404d-8f3f-16ab8dfe146d	Tawi Arusha		+255712378890	male	Arusha	2025-10-18	bronze	new	1084324.4	1084	2025-10-26 12:22:24.251+00	t	Instagram	March	21	\N	\N	0		\N	\N	2025-10-18 11:39:27.281609+00	2025-10-26 12:22:24.251+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-18 11:40:33.370489+00	[]	115e0e51-d0d6-437b-9fda-dfe11241b167	t	\N	\N	isolated	115e0e51-d0d6-437b-9fda-dfe11241b167	ARUSHA	\N
cc18aab6-83cb-43e2-81ee-533fb780d213	Fff		+255746605561	male	Dar es Salaam	2025-10-11	bronze	new	68474	66	2025-10-12 14:00:29.667+00	t	Event	\N	\N	\N	\N	0		\N	\N	2025-10-11 17:07:40.935425+00	2025-10-13 06:59:51.428888+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-13 06:59:51.428888+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
0738ae16-faf1-450e-b0f1-1d5346ee2625	Samuel masika		+255746605561	male	Dar es Salaam	2025-10-11	bronze	new	42735293	13	2025-10-18 13:22:53.377+00	t	Newspaper	\N	\N	\N	\N	0		\N	\N	2025-10-11 10:35:52.331335+00	2025-10-18 13:22:53.377+00	\N	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-12 06:59:24.643873+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
54ebcb36-3c3e-4512-898a-91582c73adf9	Inauzwa Caredsad		+255746605510	male	Dar es Salaam	2025-10-12	bronze	new	4893712.8	4893	2025-10-23 14:54:06.528+00	t	Newspaper	\N	\N	\N	\N	0		\N	\N	2025-10-12 10:47:02.243193+00	2025-10-23 14:54:06.528+00	\N	\N	f	4813e4c7-771e-43e9-a8fd-e69db13a3322	\N	0	\N	\N	0	0	0	0	0	0	\N	\N	Basic	2025-10-13 07:00:54.07146+00	[]	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	\N	isolated	24cd45b8-1ce1-486a-b055-29d169c3a8ea	Main Store	\N
\.


ALTER TABLE public.customers ENABLE TRIGGER ALL;

--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.devices DISABLE TRIGGER ALL;

COPY public.devices (id, customer_id, device_name, brand, model, serial_number, imei, problem_description, diagnostic_notes, repair_notes, status, estimated_cost, actual_cost, deposit_amount, balance_amount, technician_id, intake_date, estimated_completion_date, actual_completion_date, pickup_date, warranty_expiry_date, created_at, updated_at, priority, password, accessories, issue_description, assigned_to, expected_return_date, estimated_hours, diagnosis_required, device_notes, device_cost, repair_cost, repair_price, unlock_code, device_condition, diagnostic_checklist, branch_id, is_shared) FROM stdin;
751e3477-2c42-428d-a8a9-d716bcc12010	5ca5204d-8c3c-4e61-82da-e59b19bc3441	iPhone 15 Pro	Apple	iPhone 15 Pro	123456789012345	\N	Screen is cracked and not responding to touch properly	\N	\N	done	0	0	\N	0	762f6db8-e738-480f-a9d3-9699c440e2d9	2025-10-08 20:25:10.876761+00	2025-10-08 00:00:00+00	\N	\N	\N	2025-10-08 20:25:10.334+00	2025-10-08 20:56:05.605+00	normal	\N	\N	Screen is cracked and not responding to touch properly	762f6db8-e738-480f-a9d3-9699c440e2d9	2025-10-08 00:00:00+00	\N	f	\N	\N	\N	\N	\N	\N	{"device_id": "751e3477-2c42-428d-a8a9-d716bcc12010", "created_at": "2025-10-08T20:56:05.080Z", "updated_at": "2025-10-08T20:56:05.080Z", "completed_at": "2025-10-08T20:56:05.080Z", "overall_status": "in_progress", "checklist_items": [{"id": "1", "notes": "", "title": "Untitled Item", "result": "passed", "required": true, "completed": true, "description": "No description"}, {"id": "2", "notes": "", "title": "Untitled Item", "result": "passed", "required": true, "completed": true, "description": "No description"}, {"id": "3", "notes": "", "title": "Untitled Item", "result": "passed", "required": false, "completed": true, "description": "No description"}], "technician_notes": "", "problem_template_id": "03e3526f-699c-4a09-a6e4-c52bb48b313e"}	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t
b329fea0-0939-4529-a3a0-2c7b472a4e39	0d949b9b-720f-4670-a521-e2bef9eceeed	iPhone 7 (A1660, A1778)	Apple	iPhone 7 (A1660, A1778)	DASDSADSASADSA	\N	 sadsad asd asdas d asdasd asdasdasdas	\N	\N	failed	0	0	\N	0	762f6db8-e738-480f-a9d3-9699c440e2d9	2025-10-21 06:01:07.232227+00	2025-10-23 00:00:00+00	\N	\N	\N	2025-10-21 06:01:06.471+00	2025-10-21 06:22:58.192173+00	normal	\N	\N	 sadsad asd asdas d asdasd asdasdasdas	762f6db8-e738-480f-a9d3-9699c440e2d9	2025-10-23 00:00:00+00	\N	f	\N	\N	3	\N	32432	\N	{"device_id": "b329fea0-0939-4529-a3a0-2c7b472a4e39", "created_at": "2025-10-21T06:06:32.141Z", "updated_at": "2025-10-21T06:06:32.141Z", "completed_at": "2025-10-21T06:06:32.141Z", "overall_status": "in_progress", "checklist_items": [{"id": "1", "notes": "", "title": "Untitled Item", "result": "passed", "required": true, "completed": true, "description": "No description"}, {"id": "2", "notes": "", "title": "Untitled Item", "result": "passed", "required": true, "completed": true, "description": "No description"}, {"id": "3", "notes": "", "title": "Untitled Item", "result": "failed", "required": false, "completed": true, "description": "No description"}], "technician_notes": "", "problem_template_id": "03e3526f-699c-4a09-a6e4-c52bb48b313e"}	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t
4db113b9-0f1b-4a9d-9fce-2c2b4b7932e0	2c510481-26e6-43cb-b9d3-6de116e96889	iPhone 6s Plus (A1634, A1687)	Apple	iPhone 6s Plus (A1634, A1687)	ERTEWEWRWER	\N	rtete rbtbertretb erterter rt ete terter	\N	\N	done	0	0	\N	0	762f6db8-e738-480f-a9d3-9699c440e2d9	2025-10-18 08:43:54.496282+00	2025-10-18 00:00:00+00	\N	\N	\N	2025-10-18 08:43:53.751+00	2025-10-21 06:22:58.192173+00	normal	\N	\N	rtete rbtbertretb erterter rt ete terter	762f6db8-e738-480f-a9d3-9699c440e2d9	2025-10-18 00:00:00+00	\N	f	\N	\N	43343	\N	fdsfsdfdsf	\N	{"device_id": "4db113b9-0f1b-4a9d-9fce-2c2b4b7932e0", "created_at": "2025-10-18T08:52:00.269Z", "updated_at": "2025-10-18T08:52:00.269Z", "completed_at": "2025-10-18T08:52:00.269Z", "overall_status": "in_progress", "checklist_items": [{"id": "1", "notes": "", "title": "Untitled Item", "result": "passed", "required": true, "completed": true, "description": "No description"}, {"id": "2", "notes": "", "title": "Untitled Item", "result": "passed", "required": true, "completed": true, "description": "No description"}, {"id": "3", "notes": "", "title": "Untitled Item", "result": "passed", "required": false, "completed": true, "description": "No description"}], "technician_notes": "", "problem_template_id": "2a4cc859-874c-424a-9f28-ddaad4ecc308"}	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t
15415a16-1c86-43ae-80a6-0ec64c387f95	4e4b2f94-3b07-405c-ad56-744c3926f4c7	iPhone 6s (A1633, A1688)	Apple	iPhone 6s (A1633, A1688)	ASDASDSADSAD	\N	dsfdsaf dsaf df sd dsf sdf sdfdsff sd	\N	\N	assigned	0	0	\N	0	762f6db8-e738-480f-a9d3-9699c440e2d9	2025-10-21 05:57:47.605456+00	2025-10-21 00:00:00+00	\N	\N	\N	2025-10-21 05:57:46.844+00	2025-10-21 06:22:58.192173+00	normal	\N	\N	dsfdsaf dsaf df sd dsf sdf sdfdsff sd	762f6db8-e738-480f-a9d3-9699c440e2d9	2025-10-21 00:00:00+00	\N	f	\N	\N	434	\N	324324	\N	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t
c1d5c97d-b4c0-481e-9307-a1cb726fc69f	aee285a4-12bc-4ec1-b95b-2c2f5505b05a	Samsung Galaxy S20+	Samsung	Samsung Galaxy S20+	SADSADASDSA	\N	dasdasdasd asdas d sadasdas dasd asd ad as sadas d as	\N	\N	repair-complete	0	0	\N	0	762f6db8-e738-480f-a9d3-9699c440e2d9	2025-10-21 05:59:14.967356+00	2025-10-22 00:00:00+00	\N	\N	\N	2025-10-21 05:59:14.211+00	2025-10-21 06:51:20.01+00	normal	\N	\N	dasdasdasd asdas d sadasdas dasd asd ad as sadas d as	762f6db8-e738-480f-a9d3-9699c440e2d9	2025-10-22 00:00:00+00	\N	f	\N	\N	435	\N	sad	\N	{"device_id": "c1d5c97d-b4c0-481e-9307-a1cb726fc69f", "created_at": "2025-10-21T06:51:19.442Z", "updated_at": "2025-10-21T06:51:19.442Z", "completed_at": "2025-10-21T06:51:19.442Z", "overall_status": "in_progress", "checklist_items": [{"id": "1", "notes": "", "title": "Untitled Item", "result": "passed", "required": true, "completed": true, "description": "No description"}, {"id": "2", "notes": "", "title": "Untitled Item", "result": "passed", "required": true, "completed": true, "description": "No description"}, {"id": "3", "notes": "", "title": "Untitled Item", "required": false, "completed": false, "description": "No description"}], "technician_notes": "", "problem_template_id": "439de40c-01c1-4744-b362-916e80270431"}	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t
65ed51a5-e322-4971-8aab-d4b1e001f846	aee285a4-12bc-4ec1-b95b-2c2f5505b05a	Samsung Galaxy S20+	Samsung	Samsung Galaxy S20+	SADSADASDSA	\N	dasdasdasd asdas d sadasdas dasd asd ad as sadas d as	\N	\N	diagnosis-started	0	0	\N	0	762f6db8-e738-480f-a9d3-9699c440e2d9	2025-10-21 05:58:36.570985+00	2025-10-22 00:00:00+00	\N	\N	\N	2025-10-21 05:58:35.797+00	2025-10-21 06:22:58.192173+00	normal	\N	\N	dasdasdasd asdas d sadasdas dasd asd ad as sadas d as	762f6db8-e738-480f-a9d3-9699c440e2d9	2025-10-22 00:00:00+00	\N	f	\N	\N	435	\N	sad	\N	{"device_id": "65ed51a5-e322-4971-8aab-d4b1e001f846", "created_at": "2025-10-21T06:07:22.496Z", "updated_at": "2025-10-21T06:07:22.496Z", "completed_at": "2025-10-21T06:07:22.496Z", "overall_status": "in_progress", "checklist_items": [{"id": "1", "notes": "", "title": "Untitled Item", "result": "passed", "required": true, "completed": true, "description": "No description"}, {"id": "2", "notes": "", "title": "Untitled Item", "result": "passed", "required": true, "completed": true, "description": "No description"}, {"id": "3", "notes": "", "title": "Untitled Item", "result": "passed", "required": false, "completed": true, "description": "No description"}], "technician_notes": "", "problem_template_id": "b6925fc8-b1f2-440f-8c25-db5935020d23"}	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t
\.


ALTER TABLE public.devices ENABLE TRIGGER ALL;

--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.appointments DISABLE TRIGGER ALL;

COPY public.appointments (id, customer_id, device_id, technician_id, appointment_date, duration_minutes, status, notes, created_at, updated_at, service_type, appointment_time, customer_name, customer_phone, technician_name, priority, created_by, branch_id) FROM stdin;
83a1fd0a-0cc7-4d34-964c-70368dceef25	0738ae16-faf1-450e-b0f1-1d5346ee2625	\N	\N	2025-10-16 00:00:00+00	60	scheduled	kljhg	2025-10-11 10:41:35.563648+00	2025-10-11 10:41:35.563648+00	Device Diagnosis	13:39	Samuel masika	+255746605561	\N	medium	\N	\N
68f9f7a1-d912-410a-b200-7e07e1aca150	0fe06fb0-33e4-4122-8169-5e2b8cbedc16	\N	\N	2025-10-23 00:00:00+00	60	scheduled	sadas	2025-10-21 07:02:37.207935+00	2025-10-21 07:02:37.207935+00	Business Meeting	10:04	2222222	+255746605568	\N	high	\N	\N
\.


ALTER TABLE public.appointments ENABLE TRIGGER ALL;

--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.employees DISABLE TRIGGER ALL;

COPY public.employees (id, user_id, first_name, last_name, email, phone, date_of_birth, gender, "position", department, hire_date, termination_date, employment_type, salary, currency, status, performance_rating, skills, manager_id, location, emergency_contact_name, emergency_contact_phone, address_line1, address_line2, city, state, postal_code, country, photo_url, bio, created_at, updated_at, created_by, updated_by, branch_id, can_work_at_all_branches, assigned_branches, is_shared, full_name, is_active) FROM stdin;
b3be34ed-d55f-48cc-86d4-2065dfe8e4e1	a7c9adb7-f525-4850-bd42-79a769f12953	Admin	User	care@care.com	\N	\N	\N	Staff	General	2025-10-12	\N	full-time	0.00	TZS	active	3.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Tanzania	\N	\N	2025-10-12 17:44:25.168505+00	2025-10-22 12:56:27.80285+00	\N	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea	f	{}	t	\N	t
\.


ALTER TABLE public.employees ENABLE TRIGGER ALL;

--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.attendance_records DISABLE TRIGGER ALL;

COPY public.attendance_records (id, employee_id, attendance_date, check_in_time, check_out_time, check_in_location_lat, check_in_location_lng, check_out_location_lat, check_out_location_lng, check_in_network_ssid, check_out_network_ssid, check_in_photo_url, check_out_photo_url, total_hours, break_hours, overtime_hours, status, notes, approved_by, approved_at, created_at, updated_at, branch_id) FROM stdin;
b0e0e9b3-c5cc-498b-aeab-322ba399961b	b3be34ed-d55f-48cc-86d4-2065dfe8e4e1	2025-10-12	2025-10-12 17:44:35.457+00	2025-10-12 18:14:49.105+00	\N	\N	\N	\N	\N	\N	\N	\N	0.50	0.00	0.00	present	\N	\N	\N	2025-10-12 17:44:36.559787+00	2025-10-18 21:38:44.726317+00	24cd45b8-1ce1-486a-b055-29d169c3a8ea
1d189b16-4f94-4375-8823-a444ac9ac61b	b3be34ed-d55f-48cc-86d4-2065dfe8e4e1	2025-10-16	2025-10-17 13:24:07.394+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	present	\N	\N	\N	2025-10-17 13:24:08.124239+00	2025-10-18 21:38:44.726317+00	24cd45b8-1ce1-486a-b055-29d169c3a8ea
a3257dea-24bf-4294-84a6-bd632d71c788	b3be34ed-d55f-48cc-86d4-2065dfe8e4e1	2025-10-08	2025-10-17 13:24:21.076+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	present	\N	\N	\N	2025-10-17 13:24:21.809077+00	2025-10-18 21:38:44.726317+00	24cd45b8-1ce1-486a-b055-29d169c3a8ea
86269958-8edc-4e81-b0ce-3475e6273c14	b3be34ed-d55f-48cc-86d4-2065dfe8e4e1	2025-10-09	2025-10-17 13:24:26.489+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	present	\N	\N	\N	2025-10-17 13:24:27.196449+00	2025-10-18 21:38:44.726317+00	24cd45b8-1ce1-486a-b055-29d169c3a8ea
319a1d04-c790-4f4b-b63b-bc3e73b3d224	b3be34ed-d55f-48cc-86d4-2065dfe8e4e1	2025-10-01	2025-10-17 13:24:30.02+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	present	\N	\N	\N	2025-10-17 13:24:30.78026+00	2025-10-18 21:38:44.726317+00	24cd45b8-1ce1-486a-b055-29d169c3a8ea
eb42b9e5-0f32-4d17-8f1d-7ea1a0e69bf1	b3be34ed-d55f-48cc-86d4-2065dfe8e4e1	2025-10-31	2025-10-17 13:24:36.285+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	present	\N	\N	\N	2025-10-17 13:24:37.0858+00	2025-10-18 21:38:44.726317+00	24cd45b8-1ce1-486a-b055-29d169c3a8ea
201aa842-7cd8-459c-89e3-25e464f23752	b3be34ed-d55f-48cc-86d4-2065dfe8e4e1	2025-10-13	2025-10-17 13:26:09.898+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	0.00	present	\N	\N	\N	2025-10-17 13:26:10.635011+00	2025-10-18 21:38:44.726317+00	24cd45b8-1ce1-486a-b055-29d169c3a8ea
\.


ALTER TABLE public.attendance_records ENABLE TRIGGER ALL;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs DISABLE TRIGGER ALL;

COPY public.audit_logs (id, user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at, details, entity_type, entity_id, user_role, "timestamp") FROM stdin;
\.


ALTER TABLE public.audit_logs ENABLE TRIGGER ALL;

--
-- Data for Name: lats_branches; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.lats_branches DISABLE TRIGGER ALL;

COPY public.lats_branches (id, name, location, phone, email, is_active, created_at, updated_at) FROM stdin;
00000000-0000-0000-0000-000000000001	Main Branch	Main Location	\N	\N	t	2025-10-20 11:05:18.784415+00	2025-10-20 11:05:18.784415+00
115e0e51-d0d6-437b-9fda-dfe11241b167	ARUSHA	Tripple A, Arusha, Tanzania	0746605561	inauzwacare@gmail.com	t	2025-10-22 06:15:55.15553+00	2025-10-22 06:15:55.15553+00
24cd45b8-1ce1-486a-b055-29d169c3a8ea	DAR	Lufungila, Dar es Salaam, Tanzania	0712378850	xamuelhance10@gmail.com	t	2025-10-22 06:15:55.754912+00	2025-10-22 06:15:55.754912+00
\.


ALTER TABLE public.lats_branches ENABLE TRIGGER ALL;

--
-- Data for Name: auth_users; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.auth_users DISABLE TRIGGER ALL;

COPY public.auth_users (id, email, username, name, role, is_active, created_at, updated_at, permissions, max_devices_allowed, require_approval, failed_login_attempts, two_factor_enabled, two_factor_secret, last_login, branch_id) FROM stdin;
287ec561-d5f2-4113-840e-e9335b9d3f69	care@care.com	care@care.com	Mtaasisis kaka	admin	t	2025-10-07 18:05:21.723143+00	2025-10-12 18:02:05.539061+00	{all}	1000	f	0	f	\N	\N	00000000-0000-0000-0000-000000000001
a780f924-8343-46ec-a127-d7477165b0a8	manager@pos.com	manager@pos.com	Manager User	manager	t	2025-10-07 18:05:21.723143+00	2025-10-12 18:02:05.539061+00	{all}	1000	f	0	f	\N	\N	00000000-0000-0000-0000-000000000001
762f6db8-e738-480f-a9d3-9699c440e2d9	tech@pos.com	tech@pos.com	Technician User	technician	t	2025-10-07 18:05:21.723143+00	2025-10-12 18:02:05.539061+00	{all}	1000	f	0	f	\N	\N	00000000-0000-0000-0000-000000000001
4813e4c7-771e-43e9-a8fd-e69db13a3322	care@pos.com	care@pos.com	Diana masika	customer-care	t	2025-10-07 18:05:21.723143+00	2025-10-23 07:47:44.342+00	{all}	1000	f	0	f	\N	\N	00000000-0000-0000-0000-000000000001
\.


ALTER TABLE public.auth_users ENABLE TRIGGER ALL;

--
-- Data for Name: lats_categories; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.lats_categories DISABLE TRIGGER ALL;

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
e4749f98-b298-4d04-8b02-b1d901df2642	Trade-In Items	Devices acquired through trade-in transactions	\N	\N	t	2025-10-23 07:07:23.299606+00	2025-10-23 07:07:23.299606+00	\N	0	{}	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t
\.


ALTER TABLE public.lats_categories ENABLE TRIGGER ALL;

--
-- Data for Name: lats_store_locations; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.lats_store_locations DISABLE TRIGGER ALL;

COPY public.lats_store_locations (id, name, code, description, address, city, region, country, postal_code, phone, email, manager_name, manager_phone, is_active, is_main_branch, has_repair_service, has_sales_service, has_delivery_service, store_size_sqm, current_staff_count, monthly_target, opening_hours, priority_order, latitude, longitude, timezone, notes, metadata, created_at, updated_at) FROM stdin;
c8bc9caf-b3bd-4dd2-9ed7-be659bcc6faa	Main Branch - Dar es Salaam	DSM-MAIN	\N	\N	Dar es Salaam	Dar es Salaam	Tanzania	\N	\N	\N	\N	\N	t	t	f	t	f	\N	0	0	\N	1	\N	\N	Africa/Dar_es_Salaam	\N	{}	2025-10-10 06:38:16.064583+00	2025-10-10 06:38:16.064583+00
77848437-530c-47e8-99f4-efd929478c4d	Kariakoo Branch	DSM-KRK	\N	\N	Dar es Salaam	Dar es Salaam	Tanzania	\N	\N	\N	\N	\N	t	f	f	t	f	\N	0	0	\N	2	\N	\N	Africa/Dar_es_Salaam	\N	{}	2025-10-10 06:38:16.064583+00	2025-10-10 06:38:16.064583+00
8b8d1a3a-4032-4a9d-bd80-d7562b5fe893	Mwanza Branch	MWZ-01	\N	\N	Mwanza	Mwanza	Tanzania	\N	\N	\N	\N	\N	t	f	f	t	f	\N	0	0	\N	3	\N	\N	Africa/Dar_es_Salaam	\N	{}	2025-10-10 06:38:16.064583+00	2025-10-10 06:38:16.064583+00
\.


ALTER TABLE public.lats_store_locations ENABLE TRIGGER ALL;

--
-- Data for Name: lats_store_rooms; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.lats_store_rooms DISABLE TRIGGER ALL;

COPY public.lats_store_rooms (id, name, description, location, capacity, is_active, created_at, updated_at, store_location_id, code, floor_level, area_sqm, max_capacity, current_capacity, is_secure, requires_access_card, color_code, notes) FROM stdin;
a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	MZIGOO	dsadsad	\N	\N	t	2025-10-19 10:32:21.325824+00	2025-10-19 10:32:21.325824+00	77848437-530c-47e8-99f4-efd929478c4d	01	1	30	\N	0	f	f	\N	\N
\.


ALTER TABLE public.lats_store_rooms ENABLE TRIGGER ALL;

--
-- Data for Name: lats_store_shelves; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.lats_store_shelves DISABLE TRIGGER ALL;

COPY public.lats_store_shelves (id, room_id, name, "position", capacity, is_active, created_at, updated_at, store_location_id, storage_room_id, code, description, shelf_type, section, aisle, row_number, column_number, max_capacity, current_capacity, floor_level, zone, is_accessible, requires_ladder, is_refrigerated, priority_order, color_code, barcode, notes, images, created_by, updated_by) FROM stdin;
8efa2986-debe-4854-9fdc-978296be71b3	\N	B1	\N	\N	t	2025-10-19 10:32:43.520056+00	2025-10-19 10:32:43.520056+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	B1	\N	standard	\N	\N	2	1	\N	0	1	center	t	f	f	4	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
a4bfe0f9-9288-48de-9d16-1b042df7c235	\N	B2	\N	\N	t	2025-10-19 10:32:44.730729+00	2025-10-19 10:32:44.730729+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	B2	\N	standard	\N	\N	2	2	\N	0	1	center	t	f	f	5	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
667be2cf-1a94-4363-b614-06173252d1d4	\N	B3	\N	\N	t	2025-10-19 10:32:45.952143+00	2025-10-19 10:32:45.952143+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	B3	\N	standard	\N	\N	2	3	\N	0	1	center	t	f	f	6	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
7883c424-4eb8-4395-a7f0-c00903ad77e5	\N	D4	\N	\N	t	2025-10-19 10:47:30.77624+00	2025-10-19 10:47:30.77624+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	D4	\N	standard	\N	\N	4	4	\N	0	1	center	t	f	f	0	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
027cb5f4-1cda-485b-b56c-b8d4a142a4e3	\N	D5	\N	\N	t	2025-10-19 10:47:32.118963+00	2025-10-19 10:47:32.118963+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	D5	\N	standard	\N	\N	4	5	\N	0	1	center	t	f	f	1	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
c44132b1-9cce-42a0-80d7-9dc63961e6ad	\N	D6	\N	\N	t	2025-10-19 10:47:33.337484+00	2025-10-19 10:47:33.337484+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	D6	\N	standard	\N	\N	4	6	\N	0	1	center	t	f	f	2	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
35984dd0-539c-4543-afb8-6867d03601ec	\N	D7	\N	\N	t	2025-10-19 10:47:34.661209+00	2025-10-19 10:47:34.661209+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	D7	\N	standard	\N	\N	4	7	\N	0	1	center	t	f	f	3	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
d93878ab-01fd-410e-9bd5-7c07571c3b33	\N	E4	\N	\N	t	2025-10-19 10:47:35.865559+00	2025-10-19 10:47:35.865559+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	E4	\N	standard	\N	\N	5	4	\N	0	1	center	t	f	f	4	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
9e0b443f-0e22-4e84-aa06-cfb5a2fbd7f2	\N	E5	\N	\N	t	2025-10-19 10:47:37.078386+00	2025-10-19 10:47:37.078386+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	E5	\N	standard	\N	\N	5	5	\N	0	1	center	t	f	f	5	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
37c4a2b8-8aeb-45a8-adb9-1c36503760ac	\N	E6	\N	\N	t	2025-10-19 10:47:38.362366+00	2025-10-19 10:47:38.362366+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	E6	\N	standard	\N	\N	5	6	\N	0	1	center	t	f	f	6	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
f0cdfa24-3876-4bbd-815d-259ab79a7518	\N	E7	\N	\N	t	2025-10-19 10:47:39.582245+00	2025-10-19 10:47:39.582245+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	E7	\N	standard	\N	\N	5	7	\N	0	1	center	t	f	f	7	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
781be3a7-6494-4858-bb8a-2a6f37e8c020	\N	F4	\N	\N	t	2025-10-19 10:47:40.989253+00	2025-10-19 10:47:40.989253+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	F4	\N	standard	\N	\N	6	4	\N	0	1	center	t	f	f	8	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
56de4cf5-8d2c-44b2-91a2-a386d5ac09ad	\N	F5	\N	\N	t	2025-10-19 10:47:42.614732+00	2025-10-19 10:47:42.614732+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	F5	\N	standard	\N	\N	6	5	\N	0	1	center	t	f	f	9	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
ce5469e5-500a-40e2-bf3c-784c33f32c07	\N	F6	\N	\N	t	2025-10-19 10:47:44.048411+00	2025-10-19 10:47:44.048411+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	F6	\N	standard	\N	\N	6	6	\N	0	1	center	t	f	f	10	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
76a85a69-eb6c-4722-ae58-27116a517542	\N	F7	\N	\N	t	2025-10-19 10:47:45.481248+00	2025-10-19 10:47:45.481248+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	F7	\N	standard	\N	\N	6	7	\N	0	1	center	t	f	f	11	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
b1e58544-25a3-4d6d-a7c4-c253e45ed0ff	\N	01A4	\N	\N	t	2025-10-19 11:54:26.92004+00	2025-10-19 11:54:26.92004+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	01A4	\N	standard	\N	\N	1	4	\N	0	1	center	t	f	f	0	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
99dd5453-4b26-40b4-bd26-5ca70553e63d	\N	A1	\N	\N	t	2025-10-19 10:32:39.795707+00	2025-10-19 10:32:39.795707+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	A1	\N	standard	\N	\N	1	1	\N	0	1	center	t	f	f	1	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
1cb04814-d52f-4893-8326-5af7ef5b267b	\N	A2	\N	\N	t	2025-10-19 10:32:41.003357+00	2025-10-19 10:32:41.003357+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	A2	\N	standard	\N	\N	1	2	\N	0	1	center	t	f	f	2	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
e7d586be-b079-4b82-8a71-4b668073c1b2	\N	A3	\N	\N	t	2025-10-19 10:32:42.23631+00	2025-10-19 10:32:42.23631+00	77848437-530c-47e8-99f4-efd929478c4d	a7f7b8de-2342-4dc1-8629-cf76b3b1ed34	A3	\N	standard	\N	\N	1	3	\N	0	1	center	t	f	f	3	\N	\N	\N	{}	287ec561-d5f2-4113-840e-e9335b9d3f69	287ec561-d5f2-4113-840e-e9335b9d3f69
\.


ALTER TABLE public.lats_store_shelves ENABLE TRIGGER ALL;

--
-- Data for Name: lats_products; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.lats_products DISABLE TRIGGER ALL;

COPY public.lats_products (id, name, description, sku, barcode, category_id, unit_price, cost_price, stock_quantity, min_stock_level, max_stock_level, is_active, image_url, supplier_id, brand, model, warranty_period, created_at, updated_at, specification, condition, selling_price, tags, total_quantity, total_value, storage_room_id, store_shelf_id, attributes, metadata, branch_id, is_shared, visible_to_branches, sharing_mode, shelf_id, category) FROM stdin;
a7a5a80c-ddd7-4b59-93f5-081963be6842	iPhone X	sad	SKU-1761461887260-H7J	\N	a9c83a7d-c2cc-4978-b953-9ffc4f182cf8	0	0	1	0	1000	t	\N	\N	\N	\N	\N	2025-10-26 06:58:32.913074+00	2025-10-26 10:13:20.004459+00	\N	new	0.00	[]	2	2600.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-26T06:58:32.584Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 3}	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	isolated	\N	Audio & Sound
559d14c4-3b77-454e-ab6c-02da01b7dc84	xxxx	\N	SKU-1761488427336-DJ5	\N	dfc2db7d-53a5-40ea-8624-f7038a472b4f	0	0	2	0	1000	t	\N	\N	\N	\N	\N	2025-10-26 14:20:40.185966+00	2025-10-26 14:30:40.462262+00	\N	new	0.00	[]	4	600000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-26T14:20:39.749Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 3}	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	isolated	\N	Android Phones
9699b278-1358-4d8d-8225-338cb9f56f2d	Mtaasisiii	\N	SKU-1761465747854-0E5	\N	dfc2db7d-53a5-40ea-8624-f7038a472b4f	0	0	5	0	1000	t	\N	\N	\N	\N	\N	2025-10-26 08:03:12.071572+00	2025-10-26 13:16:13.777225+00	\N	new	0.00	[]	10	1810000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-26T08:03:11.776Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 11}	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	isolated	\N	Android Phones
a98e670a-bad6-413f-bc5c-b67375c08638	mmm	\N	SKU-1761493030083-62K	\N	5b7b1641-dc53-4e28-9fe0-06385b540ea2	0	0	3	0	1000	t	\N	\N	\N	\N	\N	2025-10-26 15:37:26.466272+00	2025-10-26 15:42:21.961197+00	\N	new	0.00	[]	3	39000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-26T15:37:25.572Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 1}	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	isolated	\N	Accessories
54a88ccc-7fa7-4ad6-b0f8-c6e89475db88	ggggg	d	SKU-1761489263865-3CL	\N	dfc2db7d-53a5-40ea-8624-f7038a472b4f	0	0	3	0	1000	t	\N	\N	\N	\N	\N	2025-10-26 14:34:53.234277+00	2025-10-26 14:37:40.147047+00	\N	new	0.00	[]	6	700000.00	\N	\N	{"condition": "new"}	{"createdAt": "2025-10-26T14:34:52.774Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 5}	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	isolated	\N	Android Phones
e4b5580e-d4cb-477a-b0c3-962353784b2d	iPhone 15 Pro	Simu kali sana	SKU-1761491064395-6XL	\N	c45894c0-5560-47ce-b869-ebb77b9861f4	0	0	1	0	1000	t	\N	\N	\N	\N	\N	2025-10-26 15:05:43.021284+00	2025-10-26 15:33:34.530352+00	\N	new	0.00	[]	2	3690000.00	\N	\N	{"condition": "used"}	{"createdAt": "2025-10-26T15:05:42.466Z", "createdBy": "287ec561-d5f2-4113-840e-e9335b9d3f69", "useVariants": true, "variantCount": 5}	24cd45b8-1ce1-486a-b055-29d169c3a8ea	t	\N	isolated	\N	iPhones
\.


ALTER TABLE public.lats_products ENABLE TRIGGER ALL;

--
-- Data for Name: lats_product_variants; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.lats_product_variants DISABLE TRIGGER ALL;

COPY public.lats_product_variants (id, product_id, sku, barcode, quantity, min_quantity, unit_price, cost_price, is_active, created_at, updated_at, name, selling_price, attributes, weight, dimensions, variant_name, variant_attributes, branch_id, stock_per_branch, is_shared, visible_to_branches, sharing_mode, reserved_quantity, reorder_point, parent_variant_id, is_parent, variant_type) FROM stdin;
a0060cfd-94fe-4983-bd3d-4f25eac0a11f	a7a5a80c-ddd7-4b59-93f5-081963be6842	SKU-1761461887260-H7J-V02-IMEI-456455	\N	1	5	1300.00	1300.00	t	2025-10-26 08:01:27.770334+00	2025-10-26 08:01:27.770334+00	456465465456455	1300.00	{"imei": "456465465456455", "notes": "Received from PO 5fe5d63e-82d3-4941-9cf3-b6ef121005a4", "added_at": "2025-10-26T08:01:27.770334+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "456465465456455", "parent_variant_name": "256"}	\N	\N	IMEI: 456465465456455	{"imei": "456465465456455", "notes": "Received from PO 5fe5d63e-82d3-4941-9cf3-b6ef121005a4", "added_at": "2025-10-26T08:01:27.770334+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "456465465456455", "parent_variant_name": "256"}	\N	{}	t	\N	isolated	0	0	36db6748-4c02-4081-9d8c-5bddbfd763d6	f	imei_child
599d8225-e926-4f8b-9174-eca9e37f297c	9699b278-1358-4d8d-8225-338cb9f56f2d	SKU-1761465747854-0E5-V02-IMEI-654455	\N	1	5	101000.00	1000	t	2025-10-26 12:56:23.435747+00	2025-10-26 13:06:10.845786+00	654564654654455	101000.00	{"imei": "654564654654455", "notes": "Received from PO 34a91360-0197-445b-960c-e6f1ee0ac127", "added_at": "2025-10-26T12:56:23.435747+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "654564654654455", "parent_variant_name": "256GB"}	\N	\N	IMEI: 654564654654455	{"imei": "654564654654455", "notes": "Received from PO 34a91360-0197-445b-960c-e6f1ee0ac127", "added_at": "2025-10-26T12:56:23.435747+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "654564654654455", "parent_variant_name": "256GB"}	\N	{}	t	\N	isolated	0	0	26a74210-9bc3-407a-a83d-a206b84ff290	f	imei_child
0d001071-a180-4cf3-8a6d-7b469e2ffae4	9699b278-1358-4d8d-8225-338cb9f56f2d	SKU-1761465747854-0E5-V01	\N	1	0	1300.00	1000	t	2025-10-26 08:03:12.389936+00	2025-10-26 13:16:13.777225+00	Default Variant	501000.00	{}	\N	\N	128GB	{"specification": null}	\N	{}	t	\N	isolated	0	0	\N	t	parent
36db6748-4c02-4081-9d8c-5bddbfd763d6	a7a5a80c-ddd7-4b59-93f5-081963be6842	SKU-1761461887260-H7J-V02	\N	1	0	1300.00	1000	t	2025-10-26 06:58:33.400718+00	2025-10-26 08:01:27.770334+00	Default Variant	1300.00	{}	\N	\N	256	{"specification": null}	\N	{}	t	\N	isolated	0	0	\N	t	parent
c8038bac-69d4-48f1-aa64-dcb18a1be04e	9699b278-1358-4d8d-8225-338cb9f56f2d	SKU-1761465747854-0E5-V02-IMEI-461552	\N	0	5	501000.00	501000.00	t	2025-10-26 08:43:20.017632+00	2025-10-26 11:48:55.612+00	456465416461552	501000.00	{"imei": "456465416461552", "notes": "Received from PO cf6e5a4b-deb6-41f8-a6ad-5563723cd9e6", "added_at": "2025-10-26T08:43:20.017632+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "456465416461552", "parent_variant_name": "256GB"}	\N	\N	IMEI: 456465416461552	{"imei": "456465416461552", "notes": "Received from PO cf6e5a4b-deb6-41f8-a6ad-5563723cd9e6", "added_at": "2025-10-26T08:43:20.017632+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "456465416461552", "parent_variant_name": "256GB"}	\N	{}	t	\N	isolated	0	0	26a74210-9bc3-407a-a83d-a206b84ff290	f	imei_child
986bde87-9ed6-47af-a3a2-faadeaaeadc2	a7a5a80c-ddd7-4b59-93f5-081963be6842	SKU-1761461887260-H7J-V01	\N	0	0	1300.00	1000	t	2025-10-26 06:58:33.400718+00	2025-10-26 07:42:56.79+00	Default Variant	1300.00	{}	\N	\N	128	{"specification": null}	\N	{}	t	\N	isolated	0	0	\N	t	parent
254db2cf-1a14-4571-afff-921198b1602a	9699b278-1358-4d8d-8225-338cb9f56f2d	SKU-1761465747854-0E5-V01-IMEI-456412	\N	0	5	1300.00	1300.00	t	2025-10-26 08:10:44.165104+00	2025-10-26 11:48:55.612+00	354657777456412	1300.00	{"imei": "354657777456412", "notes": "Received from PO 92b010af-98fd-4746-a5f0-0065ab6b177c", "added_at": "2025-10-26T08:10:44.165104+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "354657777456412", "parent_variant_name": "128GB"}	\N	\N	IMEI: 354657777456412	{"imei": "354657777456412", "notes": "Received from PO 92b010af-98fd-4746-a5f0-0065ab6b177c", "added_at": "2025-10-26T08:10:44.165104+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "354657777456412", "parent_variant_name": "128GB"}	\N	{}	t	\N	isolated	0	0	0d001071-a180-4cf3-8a6d-7b469e2ffae4	f	imei_child
5be60604-2e71-4ba8-ad92-ad53d0c5a0f4	9699b278-1358-4d8d-8225-338cb9f56f2d	SKU-1761465747854-0E5-V02-IMEI-120012	\N	0	5	501000.00	501000.00	t	2025-10-26 08:43:20.346293+00	2025-10-26 12:22:24.927+00	212540212120012	501000.00	{"imei": "212540212120012", "notes": "Received from PO cf6e5a4b-deb6-41f8-a6ad-5563723cd9e6", "added_at": "2025-10-26T08:43:20.346293+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "212540212120012", "parent_variant_name": "256GB"}	\N	\N	IMEI: 212540212120012	{"imei": "212540212120012", "notes": "Received from PO cf6e5a4b-deb6-41f8-a6ad-5563723cd9e6", "added_at": "2025-10-26T08:43:20.346293+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "212540212120012", "parent_variant_name": "256GB"}	\N	{}	t	\N	isolated	0	0	26a74210-9bc3-407a-a83d-a206b84ff290	f	imei_child
24ca0b25-b123-4913-b39a-13371fa725a6	9699b278-1358-4d8d-8225-338cb9f56f2d	SKU-1761465747854-0E5-V01-IMEI-534543	\N	0	5	501000.00	1000	t	2025-10-26 12:27:23.0972+00	2025-10-26 13:16:13.488+00	543543543534543	501000.00	{"imei": "543543543534543", "notes": "Received from PO 270765be-5196-486a-b4b7-2f1058407d57", "added_at": "2025-10-26T12:27:23.0972+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "543543543534543", "parent_variant_name": "128GB"}	\N	\N	IMEI: 543543543534543	{"imei": "543543543534543", "notes": "Received from PO 270765be-5196-486a-b4b7-2f1058407d57", "added_at": "2025-10-26T12:27:23.0972+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "543543543534543", "parent_variant_name": "128GB"}	\N	{}	t	\N	isolated	0	0	0d001071-a180-4cf3-8a6d-7b469e2ffae4	f	imei_child
5219d234-873d-4548-8aeb-969d8712ac72	54a88ccc-7fa7-4ad6-b0f8-c6e89475db88	SKU-1761489263865-3CL-V02-IMEI-876678	\N	1	5	0	90000	t	2025-10-26 14:37:40.147047+00	2025-10-26 14:37:40.147047+00	768767876876678	100000.00	{"imei": "768767876876678", "notes": "Received from PO 59cc77cd-0b98-4378-ad1d-b50729df3fc9", "added_at": "2025-10-26T14:37:40.147047+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "768767876876678", "parent_variant_name": "02"}	\N	\N	IMEI: 768767876876678	{"imei": "768767876876678", "notes": "Received from PO 59cc77cd-0b98-4378-ad1d-b50729df3fc9", "added_at": "2025-10-26T14:37:40.147047+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "768767876876678", "parent_variant_name": "02"}	\N	{}	t	\N	isolated	0	0	94ce8952-c807-4a01-9a93-9d927267171f	f	imei_child
73fe6845-3cd5-48d1-963b-32d776f0da6b	559d14c4-3b77-454e-ab6c-02da01b7dc84	SKU-1761488427336-DJ5-V01	\N	2	0	150000.00	100000	t	2025-10-26 14:20:40.493501+00	2025-10-26 14:24:14.554198+00	Default Variant	150000.00	{}	\N	\N	dddd	{"specification": null}	\N	{}	t	\N	isolated	0	0	\N	t	parent
26a74210-9bc3-407a-a83d-a206b84ff290	9699b278-1358-4d8d-8225-338cb9f56f2d	SKU-1761465747854-0E5-V02	\N	4	0	501000.00	1000	t	2025-10-26 08:03:12.389936+00	2025-10-26 12:56:23.435747+00	Default Variant	101000.00	{}	\N	\N	256GB	{"specification": null}	\N	{}	t	\N	isolated	0	0	\N	t	parent
70ead719-34de-4015-8143-92290ea6d77c	9699b278-1358-4d8d-8225-338cb9f56f2d	SKU-1761465747854-0E5-V01-IMEI-555555	\N	1	5	501000.00	1000	t	2025-10-26 12:44:25.293043+00	2025-10-26 13:06:10.845786+00	454654566555555	501000.00	{"imei": "454654566555555", "notes": "Received from PO e4508e43-5d79-4b7f-b9f0-761b58a564f3", "added_at": "2025-10-26T12:44:25.293043+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "454654566555555", "parent_variant_name": "128GB"}	\N	\N	IMEI: 454654566555555	{"imei": "454654566555555", "notes": "Received from PO e4508e43-5d79-4b7f-b9f0-761b58a564f3", "added_at": "2025-10-26T12:44:25.293043+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "454654566555555", "parent_variant_name": "128GB"}	\N	{}	t	\N	isolated	0	0	0d001071-a180-4cf3-8a6d-7b469e2ffae4	f	imei_child
961325ef-27bb-4deb-bde6-e79caa184ad4	54a88ccc-7fa7-4ad6-b0f8-c6e89475db88	SKU-1761489263865-3CL-V01-IMEI-876777	\N	1	5	0	50000	t	2025-10-26 14:37:39.235877+00	2025-10-26 14:37:39.235877+00	786787687876777	150000.00	{"imei": "786787687876777", "notes": "Received from PO 59cc77cd-0b98-4378-ad1d-b50729df3fc9", "added_at": "2025-10-26T14:37:39.235877+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "786787687876777", "parent_variant_name": "01"}	\N	\N	IMEI: 786787687876777	{"imei": "786787687876777", "notes": "Received from PO 59cc77cd-0b98-4378-ad1d-b50729df3fc9", "added_at": "2025-10-26T14:37:39.235877+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "786787687876777", "parent_variant_name": "01"}	\N	{}	t	\N	isolated	0	0	2dbca021-b01a-4ea1-85b1-a76df227ce19	f	imei_child
97532548-f268-464e-91ca-598d530801bd	9699b278-1358-4d8d-8225-338cb9f56f2d	SKU-1761465747854-0E5-V02-IMEI-465555	\N	1	5	101000.00	1000	t	2025-10-26 12:56:22.819551+00	2025-10-26 13:06:10.845786+00	456465465465555	101000.00	{"imei": "456465465465555", "notes": "Received from PO 34a91360-0197-445b-960c-e6f1ee0ac127", "added_at": "2025-10-26T12:56:22.819551+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "456465465465555", "parent_variant_name": "256GB"}	\N	\N	IMEI: 456465465465555	{"imei": "456465465465555", "notes": "Received from PO 34a91360-0197-445b-960c-e6f1ee0ac127", "added_at": "2025-10-26T12:56:22.819551+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "456465465465555", "parent_variant_name": "256GB"}	\N	{}	t	\N	isolated	0	0	26a74210-9bc3-407a-a83d-a206b84ff290	f	imei_child
94ce8952-c807-4a01-9a93-9d927267171f	54a88ccc-7fa7-4ad6-b0f8-c6e89475db88	SKU-1761489263865-3CL-V02	\N	2	0	100000.00	90000	t	2025-10-26 14:34:53.543996+00	2025-10-26 14:37:40.147047+00	Default Variant	100000.00	{}	\N	\N	02	{"specification": null}	\N	{}	t	\N	isolated	0	0	\N	t	parent
2dbca021-b01a-4ea1-85b1-a76df227ce19	54a88ccc-7fa7-4ad6-b0f8-c6e89475db88	SKU-1761489263865-3CL-V01	\N	1	0	150000.00	50000	t	2025-10-26 14:34:53.543996+00	2025-10-26 14:37:39.235877+00	Default Variant	150000.00	{}	\N	\N	01	{"specification": null}	\N	{}	t	\N	isolated	0	0	\N	t	parent
a3a435e6-821c-4b0c-9a65-51fd31ab1c10	54a88ccc-7fa7-4ad6-b0f8-c6e89475db88	SKU-1761489263865-3CL-V02-IMEI-768768	\N	1	5	0	90000	t	2025-10-26 14:37:39.838631+00	2025-10-26 14:37:39.838631+00	678768768768768	100000.00	{"imei": "678768768768768", "notes": "Received from PO 59cc77cd-0b98-4378-ad1d-b50729df3fc9", "added_at": "2025-10-26T14:37:39.838631+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "678768768768768", "parent_variant_name": "02"}	\N	\N	IMEI: 678768768768768	{"imei": "678768768768768", "notes": "Received from PO 59cc77cd-0b98-4378-ad1d-b50729df3fc9", "added_at": "2025-10-26T14:37:39.838631+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "678768768768768", "parent_variant_name": "02"}	\N	{}	t	\N	isolated	0	0	94ce8952-c807-4a01-9a93-9d927267171f	f	imei_child
760c475e-31db-4643-adbc-8daacb7a0ab7	a98e670a-bad6-413f-bc5c-b67375c08638	SKU-1761493030083-62K-V01	\N	3	0	13000.00	10000	t	2025-10-26 15:37:27.086055+00	2025-10-26 15:42:21.961197+00	Default Variant	13000.00	{}	\N	\N	Variant 1	{"specification": null}	\N	{}	t	\N	isolated	0	0	\N	f	standard
3208a316-ae60-4f09-8578-ac8baf21c857	e4b5580e-d4cb-477a-b0c3-962353784b2d	SKU-1761491064395-6XL-V01	\N	0	0	1645000.00	1300000	t	2025-10-26 15:05:43.335683+00	2025-10-26 15:33:34.530352+00	Default Variant	1645000.00	{}	\N	\N	128GB	{"specification": null}	\N	{}	t	\N	isolated	0	0	\N	t	parent
4cb3f79d-4ac9-4f75-a014-092aa3603115	e4b5580e-d4cb-477a-b0c3-962353784b2d	SKU-1761491064395-6XL-V02	\N	1	0	1845000.00	1500000	t	2025-10-26 15:05:43.335683+00	2025-10-26 15:27:36.23438+00	Default Variant	1845000.00	{}	\N	\N	256GB	{"specification": null}	\N	{}	t	\N	isolated	0	0	\N	t	parent
f78036c6-2a2d-4785-b85f-1cee7db16442	9699b278-1358-4d8d-8225-338cb9f56f2d	SKU-1761465747854-0E5-V02-IMEI-444445	\N	1	5	101000.00	1000	t	2025-10-26 12:56:22.201914+00	2025-10-26 13:06:10.845786+00	564646545444445	101000.00	{"imei": "564646545444445", "notes": "Received from PO 34a91360-0197-445b-960c-e6f1ee0ac127", "added_at": "2025-10-26T12:56:22.201914+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "564646545444445", "parent_variant_name": "256GB"}	\N	\N	IMEI: 564646545444445	{"imei": "564646545444445", "notes": "Received from PO 34a91360-0197-445b-960c-e6f1ee0ac127", "added_at": "2025-10-26T12:56:22.201914+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "564646545444445", "parent_variant_name": "256GB"}	\N	{}	t	\N	isolated	0	0	26a74210-9bc3-407a-a83d-a206b84ff290	f	imei_child
3a93a02e-09aa-462d-ba45-8abba21745e8	9699b278-1358-4d8d-8225-338cb9f56f2d	SKU-1761465747854-0E5-V02-IMEI-465444	\N	1	5	101000.00	1000	t	2025-10-26 12:56:21.576324+00	2025-10-26 13:06:10.845786+00	454546465465444	101000.00	{"imei": "454546465465444", "notes": "Received from PO 34a91360-0197-445b-960c-e6f1ee0ac127", "added_at": "2025-10-26T12:56:21.576324+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "454546465465444", "parent_variant_name": "256GB"}	\N	\N	IMEI: 454546465465444	{"imei": "454546465465444", "notes": "Received from PO 34a91360-0197-445b-960c-e6f1ee0ac127", "added_at": "2025-10-26T12:56:21.576324+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "454546465465444", "parent_variant_name": "256GB"}	\N	{}	t	\N	isolated	0	0	26a74210-9bc3-407a-a83d-a206b84ff290	f	imei_child
11ea0e48-07ae-4ac5-870b-9c60f6ddafb9	559d14c4-3b77-454e-ab6c-02da01b7dc84	SKU-1761488427336-DJ5-V01-IMEI-645555	\N	1	5	150000.00	100000	t	2025-10-26 14:24:14.20285+00	2025-10-26 14:30:40.462262+00	654654654645555	150000.00	{"imei": "654654654645555", "notes": "Received from PO d9c41833-4795-4bfb-a91f-897a4a3d196c", "added_at": "2025-10-26T14:24:14.20285+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "654654654645555", "parent_variant_name": "dddd"}	\N	\N	IMEI: 654654654645555	{"imei": "654654654645555", "notes": "Received from PO d9c41833-4795-4bfb-a91f-897a4a3d196c", "added_at": "2025-10-26T14:24:14.20285+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "654654654645555", "parent_variant_name": "dddd"}	\N	{}	t	\N	isolated	0	0	73fe6845-3cd5-48d1-963b-32d776f0da6b	f	imei_child
ed086fc2-19e5-4a20-a911-46ac91a257f3	559d14c4-3b77-454e-ab6c-02da01b7dc84	SKU-1761488427336-DJ5-V01-IMEI-651213	\N	1	5	150000.00	100000	t	2025-10-26 14:24:14.554198+00	2025-10-26 14:30:40.462262+00	464654564651213	150000.00	{"imei": "464654564651213", "notes": "Received from PO d9c41833-4795-4bfb-a91f-897a4a3d196c", "added_at": "2025-10-26T14:24:14.554198+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "464654564651213", "parent_variant_name": "dddd"}	\N	\N	IMEI: 464654564651213	{"imei": "464654564651213", "notes": "Received from PO d9c41833-4795-4bfb-a91f-897a4a3d196c", "added_at": "2025-10-26T14:24:14.554198+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "464654564651213", "parent_variant_name": "dddd"}	\N	{}	t	\N	isolated	0	0	73fe6845-3cd5-48d1-963b-32d776f0da6b	f	imei_child
f1353236-bf00-4d09-b58c-5aa096f84e24	e4b5580e-d4cb-477a-b0c3-962353784b2d	SKU-1761491064395-6XL-V02-IMEI-323545	\N	1	5	0	1500000	t	2025-10-26 15:21:33.90049+00	2025-10-26 15:21:33.90049+00	312312312323545	1845000.00	{"imei": "312312312323545", "notes": "Received from PO d90b9eb1-ae40-43f5-b03f-0e7224f5257e", "added_at": "2025-10-26T15:21:33.90049+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "312312312323545", "parent_variant_name": "256GB"}	\N	\N	IMEI: 312312312323545	{"imei": "312312312323545", "notes": "Received from PO d90b9eb1-ae40-43f5-b03f-0e7224f5257e", "added_at": "2025-10-26T15:21:33.90049+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "312312312323545", "parent_variant_name": "256GB"}	\N	{}	t	\N	isolated	0	0	4cb3f79d-4ac9-4f75-a014-092aa3603115	f	imei_child
aa6e36cf-b27f-4374-97c7-4bf15937bc20	e4b5580e-d4cb-477a-b0c3-962353784b2d	SKU-1761491064395-6XL-V02-IMEI-566545	\N	0	5	1845000.00	1500000	t	2025-10-26 15:21:33.289152+00	2025-10-26 15:27:33.063+00	646456546566545	1845000.00	{"imei": "646456546566545", "notes": "Received from PO d90b9eb1-ae40-43f5-b03f-0e7224f5257e", "added_at": "2025-10-26T15:21:33.289152+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "646456546566545", "parent_variant_name": "256GB"}	\N	\N	IMEI: 646456546566545	{"imei": "646456546566545", "notes": "Received from PO d90b9eb1-ae40-43f5-b03f-0e7224f5257e", "added_at": "2025-10-26T15:21:33.289152+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "646456546566545", "parent_variant_name": "256GB"}	\N	{}	t	\N	isolated	0	0	4cb3f79d-4ac9-4f75-a014-092aa3603115	f	imei_child
830ff556-a177-4065-bea3-4b6426b65161	e4b5580e-d4cb-477a-b0c3-962353784b2d	SKU-1761491064395-6XL-V01-IMEI-544545	\N	0	5	1645000.00	1300000	t	2025-10-26 15:21:32.091894+00	2025-10-26 15:33:33.242+00	464565445544545	1645000.00	{"imei": "464565445544545", "notes": "Received from PO d90b9eb1-ae40-43f5-b03f-0e7224f5257e", "added_at": "2025-10-26T15:21:32.091894+00:00", "condition": "new", "imei_status": "available", "mac_address": "", "serial_number": "464565445544545", "parent_variant_name": "128GB"}	\N	\N	IMEI: 464565445544545	{"imei": "464565445544545", "notes": "Received from PO d90b9eb1-ae40-43f5-b03f-0e7224f5257e", "added_at": "2025-10-26T15:21:32.091894+00:00", "condition": "new", "imei_status": "valid", "mac_address": "", "serial_number": "464565445544545", "parent_variant_name": "128GB"}	\N	{}	t	\N	isolated	0	0	3208a316-ae60-4f09-8578-ac8baf21c857	f	imei_child
\.


ALTER TABLE public.lats_product_variants ENABLE TRIGGER ALL;

--
-- Data for Name: lats_suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.lats_suppliers DISABLE TRIGGER ALL;

COPY public.lats_suppliers (id, name, contact_person, email, phone, address, city, country, is_active, notes, created_at, updated_at, branch_id, is_shared, is_trade_in_customer) FROM stdin;
24eac326-7f64-4578-b57d-8ada1c8c76a1	fgd	Samuel Masika	xamuelhance10@gmail.com	0746605561	tegeta	Dar es Salaam	Tanzania	t	\N	2025-10-07 16:11:34.039576+00	2025-10-07 16:11:34.039576+00	\N	f	f
39034e8e-2043-4a49-85cc-fb332d1f5e5b	fgd	Samuel Masika	xamuelhance10@gmail.com	0746605561	tegeta	Dar es Salaam	Tanzania	t	\N	2025-10-07 16:11:43.640352+00	2025-10-07 16:11:43.640352+00	\N	f	f
5e1c4bba-fb62-44e3-a44b-096ee07d92f7	fgd	Samuel Masika	xamuelhance10@gmail.com	0746605561	tegeta	Dar es Salaam	Tanzania	t	\N	2025-10-07 16:11:43.76161+00	2025-10-07 16:11:43.76161+00	\N	f	f
c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13	Apple	Apple Parts Division	parts@apple.com	\N	\N	\N	\N	t	\N	2025-10-12 05:54:17.224649+00	2025-10-12 05:54:17.224649+00	\N	f	f
3c32a23b-595c-432c-b239-245a20223648	Test Supplier Co.	John Doe	test@supplier.com	+255123456789	Dar es Salaam	\N	\N	t	\N	2025-10-21 18:58:47.865376+00	2025-10-21 18:58:47.865376+00	\N	t	f
c610ead6-54f9-49ae-a6d3-48f50b87a806	Trade-In: Mary Kamwela	Mary Kamwela	mary.kamwela@example.com	+255787654321	\N	\N	\N	t	\N	2025-10-23 07:37:05.063798+00	2025-10-23 07:37:05.063798+00	\N	t	t
f960c405-3fe9-492d-9115-01ec49a6d7c8	Trade-In: John Mwamba	John Mwamba	john.mwamba@example.com	+255712345678	\N	\N	\N	t	\N	2025-10-23 07:37:06.213072+00	2025-10-23 07:37:06.213072+00	\N	t	t
dfed52b1-e2e6-4a2b-b09a-d42bbb4e06a4	Trade-In: Inauzwa Caredsad	Inauzwa Caredsad		+255746605510	\N	\N	\N	t	\N	2025-10-23 07:37:07.442382+00	2025-10-23 07:37:07.442382+00	\N	t	t
9e695f4a-ba86-4049-8344-ed5f1a355507	Trade-In: Samuel masika	Samuel masika		+255746605561	\N	\N	\N	t	\N	2025-10-23 07:37:10.148159+00	2025-10-23 07:37:10.148159+00	\N	t	t
f8b660c2-d8f3-4d1d-9b02-2138b0c14e00	Trade-In: Arusha	Arusha		+255746605500	\N	\N	\N	t	\N	2025-10-23 07:37:11.747801+00	2025-10-23 07:37:11.747801+00	\N	t	t
0e299a2d-793b-4766-9fc0-417a792ff952	Trade-In: Tawi Arusha	Tawi Arusha		+255712378890	\N	\N	\N	t	\N	2025-10-23 07:37:16.064258+00	2025-10-23 07:37:16.064258+00	\N	t	t
626c63e7-dc56-4091-b6d2-e12fe9bcca85	Trade-In: 12345	12345		+255746605561	\N	\N	\N	t	\N	2025-10-23 07:37:20.056176+00	2025-10-23 07:37:20.056176+00	\N	t	t
\.


ALTER TABLE public.lats_suppliers ENABLE TRIGGER ALL;

--
-- Data for Name: lats_purchase_orders; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.lats_purchase_orders DISABLE TRIGGER ALL;

COPY public.lats_purchase_orders (id, po_number, supplier_id, status, total_amount, notes, order_date, expected_delivery_date, received_date, created_by, created_at, updated_at, tax_amount, shipping_cost, discount_amount, final_amount, approved_by, order_number, currency, total_paid, payment_status, expected_delivery, branch_id) FROM stdin;
d9c41833-4795-4bfb-a91f-897a4a3d196c	PO-1761488538948	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13	received	200000		2025-10-26 14:22:18.949+00	\N	2025-10-26 14:24:15.669888+00	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 14:22:19.385309+00	2025-10-26 14:24:15.669888+00	0	0	0	0	\N	\N	TZS	200000	paid	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea
956fad52-683d-4a3a-9c63-102a6378647b	PO-1761462013617	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13	completed	1000	\n\nCompleted: Purchase order completed after receiving all items	2025-10-26 07:00:13.617+00	\N	2025-10-26 07:42:58.811776+00	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 07:00:13.982963+00	2025-10-26 07:54:02.611402+00	0	0	0	0	\N	\N	TZS	1000	paid	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea
59cc77cd-0b98-4378-ad1d-b50729df3fc9	PO-1761489352044	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13	received	230000		2025-10-26 14:35:52.044+00	\N	2025-10-26 14:37:41.257327+00	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 14:35:52.502134+00	2025-10-26 14:37:41.257327+00	0	0	0	0	\N	\N	TZS	230000	paid	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea
d90b9eb1-ae40-43f5-b03f-0e7224f5257e	PO-1761491340029	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13	received	4300000		2025-10-26 15:09:00.029+00	\N	2025-10-26 15:21:35.593905+00	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 15:09:00.574296+00	2025-10-26 15:21:35.593905+00	0	0	0	0	\N	\N	TZS	4300000	paid	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea
cf96b0d2-9333-4bcf-973d-b5603fe20468	PO-1761493287190	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13	received	30000		2025-10-26 15:41:27.19+00	\N	2025-10-26 15:42:18.652965+00	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 15:41:28.07872+00	2025-10-26 15:42:18.652965+00	0	0	0	0	\N	\N	TZS	30000	paid	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea
5fe5d63e-82d3-4941-9cf3-b6ef121005a4	PO-1761465643196	24eac326-7f64-4578-b57d-8ada1c8c76a1	received	1000		2025-10-26 08:00:43.196+00	\N	2025-10-26 08:01:28.964935+00	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 08:00:43.545905+00	2025-10-26 08:01:28.964935+00	0	0	0	0	\N	\N	TZS	1000	paid	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea
92b010af-98fd-4746-a5f0-0065ab6b177c	PO-1761466005812	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13	received	1000		2025-10-26 08:06:45.812+00	\N	2025-10-26 08:10:45.300114+00	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 08:06:46.122074+00	2025-10-26 08:10:45.300114+00	0	0	0	0	\N	\N	TZS	1000	paid	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea
cf6e5a4b-deb6-41f8-a6ad-5563723cd9e6	PO-1761467900468	24eac326-7f64-4578-b57d-8ada1c8c76a1	received	2000		2025-10-26 08:38:20.468+00	\N	2025-10-26 08:43:21.475377+00	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 08:38:20.803745+00	2025-10-26 08:43:21.475377+00	0	0	0	0	\N	\N	TZS	2000	paid	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea
270765be-5196-486a-b4b7-2f1058407d57	PO-1761481543456	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13	received	1000		2025-10-26 12:25:43.456+00	\N	2025-10-26 12:27:24.822805+00	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 12:25:44.014877+00	2025-10-26 12:27:24.822805+00	0	0	0	0	\N	\N	TZS	1000	paid	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea
e4508e43-5d79-4b7f-b9f0-761b58a564f3	PO-1761482545687	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13	completed	1000	\n\nCompleted: Purchase order completed after receiving all items	2025-10-26 12:42:25.687+00	\N	2025-10-26 12:44:27.027493+00	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 12:42:26.280273+00	2025-10-26 12:54:11.93544+00	0	0	0	0	\N	\N	TZS	1000	paid	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea
34a91360-0197-445b-960c-e6f1ee0ac127	PO-1761483300057	c79c5e8c-b9ac-4e2a-b45c-8d3ffc0e6f13	completed	4000	\n\nCompleted: Purchase order completed after receiving all items	2025-10-26 12:55:00.057+00	\N	2025-10-26 12:56:25.181482+00	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 12:55:00.647671+00	2025-10-26 12:56:38.411623+00	0	0	0	0	\N	\N	TZS	4000	paid	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea
\.


ALTER TABLE public.lats_purchase_orders ENABLE TRIGGER ALL;

--
-- Data for Name: auto_reorder_log; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.auto_reorder_log DISABLE TRIGGER ALL;

COPY public.auto_reorder_log (id, product_id, variant_id, supplier_id, triggered_quantity, reorder_point, suggested_quantity, purchase_order_id, po_created, error_message, created_at) FROM stdin;
\.


ALTER TABLE public.auto_reorder_log ENABLE TRIGGER ALL;

--
-- Data for Name: branch_activity_log; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.branch_activity_log DISABLE TRIGGER ALL;

COPY public.branch_activity_log (id, branch_id, user_id, action_type, entity_type, entity_id, description, metadata, ip_address, created_at) FROM stdin;
\.


ALTER TABLE public.branch_activity_log ENABLE TRIGGER ALL;

--
-- Data for Name: branch_transfers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.branch_transfers DISABLE TRIGGER ALL;

COPY public.branch_transfers (id, from_branch_id, to_branch_id, transfer_type, entity_type, entity_id, quantity, status, requested_by, approved_by, notes, metadata, requested_at, approved_at, completed_at, created_at, updated_at, rejection_reason) FROM stdin;
\.


ALTER TABLE public.branch_transfers ENABLE TRIGGER ALL;

--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages DISABLE TRIGGER ALL;

COPY public.chat_messages (id, conversation_id, sender_id, sender_type, recipient_id, recipient_type, message_text, message_type, is_read, read_at, created_at) FROM stdin;
\.


ALTER TABLE public.chat_messages ENABLE TRIGGER ALL;

--
-- Data for Name: communication_templates; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.communication_templates DISABLE TRIGGER ALL;

COPY public.communication_templates (id, template_name, template_type, subject, body, variables, is_active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.communication_templates ENABLE TRIGGER ALL;

--
-- Data for Name: contact_history; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.contact_history DISABLE TRIGGER ALL;

COPY public.contact_history (id, customer_id, contact_type, contact_method, contact_subject, contact_notes, contacted_by, contacted_at, created_at) FROM stdin;
\.


ALTER TABLE public.contact_history ENABLE TRIGGER ALL;

--
-- Data for Name: contact_methods; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.contact_methods DISABLE TRIGGER ALL;

COPY public.contact_methods (id, customer_id, method_type, contact_value, is_primary, is_verified, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.contact_methods ENABLE TRIGGER ALL;

--
-- Data for Name: contact_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.contact_preferences DISABLE TRIGGER ALL;

COPY public.contact_preferences (id, customer_id, preference_type, preference_value, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.contact_preferences ENABLE TRIGGER ALL;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.users DISABLE TRIGGER ALL;

COPY public.users (id, email, password, full_name, role, is_active, created_at, updated_at, username, permissions, max_devices_allowed, require_approval, failed_login_attempts, two_factor_enabled, two_factor_secret, last_login, phone, department, branch_id) FROM stdin;
a780f924-8343-46ec-a127-d7477165b0a8	manager@pos.com	manager123	Manager User	manager	t	2025-10-07 18:09:29.324848+00	2025-10-09 08:12:42.907611+00	manager@pos.com	{all}	1000	f	0	f	\N	\N	\N	\N	00000000-0000-0000-0000-000000000001
762f6db8-e738-480f-a9d3-9699c440e2d9	tech@pos.com	tech123456	Technician User	technician	t	2025-10-07 18:09:29.324848+00	2025-10-09 08:12:42.907611+00	tech@pos.com	{all}	1000	f	0	f	\N	\N	\N	\N	00000000-0000-0000-0000-000000000001
287ec561-d5f2-4113-840e-e9335b9d3f69	care@care.com	123456	Mtaasisis kaka	admin	t	2025-10-07 18:09:29.324848+00	2025-10-12 17:59:06.818+00	care@care.com	{all}	1000	f	0	f	\N	\N			00000000-0000-0000-0000-000000000001
4813e4c7-771e-43e9-a8fd-e69db13a3322	care@pos.com	care123456	Diana masika	customer-care	t	2025-10-07 18:09:29.324848+00	2025-10-23 07:47:44.342+00	care@pos.com	{all}	1000	f	0	f	\N	\N			00000000-0000-0000-0000-000000000001
\.


ALTER TABLE public.users ENABLE TRIGGER ALL;

--
-- Data for Name: customer_checkins; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_checkins DISABLE TRIGGER ALL;

COPY public.customer_checkins (id, customer_id, checkin_date, checkout_date, purpose, notes, created_by, created_at, staff_id) FROM stdin;
cd67bbfa-cb67-4d50-bbfd-9aede599470f	f16015a0-c224-404d-8f3f-16ab8dfe146d	2025-10-18 11:40:32.188+00	\N	\N	\N	\N	2025-10-18 11:40:32.857312+00	287ec561-d5f2-4113-840e-e9335b9d3f69
\.


ALTER TABLE public.customer_checkins ENABLE TRIGGER ALL;

--
-- Data for Name: customer_communications; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_communications DISABLE TRIGGER ALL;

COPY public.customer_communications (id, customer_id, type, message, status, phone_number, sent_by, sent_at, created_at) FROM stdin;
\.


ALTER TABLE public.customer_communications ENABLE TRIGGER ALL;

--
-- Data for Name: customer_fix_backup; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_fix_backup DISABLE TRIGGER ALL;

COPY public.customer_fix_backup (backup_id, backup_timestamp, customer_id, customer_name, customer_phone, old_total_spent, new_total_spent, old_points, new_points, old_loyalty_level, new_loyalty_level, sale_number, fix_reason) FROM stdin;
1	2025-10-10 06:37:18.309064+00	0d949b9b-720f-4670-a521-e2bef9eceeed	Samuel masika	+255712378850	3018851250	0	2	0	bronze	bronze	SALE-77358826-03CI	Automatic fix for data corruption - total_spent was 3018851250, should be 0
\.


ALTER TABLE public.customer_fix_backup ENABLE TRIGGER ALL;

--
-- Data for Name: lats_sales; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.lats_sales DISABLE TRIGGER ALL;

COPY public.lats_sales (id, sale_number, customer_id, user_id, total_amount, discount_amount, tax_amount, final_amount, payment_status, status, notes, created_at, updated_at, subtotal, tax, sold_by, customer_email, customer_name, customer_phone, discount, branch_id, payment_method) FROM stdin;
0627a023-e0a9-4a57-bebc-cf340e02e3f8	SALE-79334018-EVQ7	f16015a0-c224-404d-8f3f-16ab8dfe146d	\N	502300.00	0	0	0	completed	completed	\N	2025-10-26 11:48:54.306268+00	2025-10-26 11:48:54.306268+00	502300.00	0.00	care@care.com	\N	Tawi Arusha	+255712378890	0	24cd45b8-1ce1-486a-b055-29d169c3a8ea	{"type": "Cash", "amount": 502300, "details": {"payments": [{"amount": 502300, "method": "Cash", "accountId": "5e32c912-7ab7-444a-8ffd-02cb99b56a04", "timestamp": "2025-10-26T11:48:53.703Z"}], "totalPaid": 502300}}
290814fc-a066-4fc7-8a6e-1fe17fc0c11c	SALE-81341752-AJBB	f16015a0-c224-404d-8f3f-16ab8dfe146d	\N	501000.00	0	0	0	completed	completed	Trade-In: iPhone x A123 (IMEI: 34234234343233) - Trade-In Value: TSh 300,000 - Customer Payment: TSh 201,000 - Transaction ID: 71373d20-8325-4e02-aa70-62235ce7f5ef	2025-10-26 12:22:22.372226+00	2025-10-26 12:22:22.372226+00	501000.00	0.00	care@care.com	\N	Tawi Arusha	+255712378890	0	24cd45b8-1ce1-486a-b055-29d169c3a8ea	{"type": "Cash", "amount": 501000, "details": {"tradeIn": {"deviceImei": "34234234343233", "deviceName": "iPhone x", "deviceModel": "A123", "tradeInValue": 300000, "transactionId": "71373d20-8325-4e02-aa70-62235ce7f5ef"}, "payments": [{"amount": 201000, "method": "Cash", "accountId": "5e32c912-7ab7-444a-8ffd-02cb99b56a04", "timestamp": "2025-10-26T12:22:21.032Z"}], "totalPaid": 201000}}
578346db-93be-46e8-bafc-37f32d96a90d	SALE-84571797-MRZQ	0fe06fb0-33e4-4122-8169-5e2b8cbedc16	\N	501000.00	0	0	0	completed	completed	Trade-In: iPhone x A123 (IMEI: 145222222220220222) - Trade-In Value: TSh 300,000 - Customer Payment: TSh 201,000 - Transaction ID: dd01e139-f8d9-46a3-a0e8-9ed56a6968df	2025-10-26 13:16:12.104588+00	2025-10-26 13:16:12.104588+00	501000.00	0.00	care@care.com	\N	2222222	+255746605568	0	24cd45b8-1ce1-486a-b055-29d169c3a8ea	{"type": "Cash", "amount": 501000, "details": {"tradeIn": {"deviceImei": "145222222220220222", "deviceName": "iPhone x", "deviceModel": "A123", "tradeInValue": 300000, "transactionId": "dd01e139-f8d9-46a3-a0e8-9ed56a6968df"}, "payments": [{"amount": 201000, "method": "Cash", "accountId": "5e32c912-7ab7-444a-8ffd-02cb99b56a04", "timestamp": "2025-10-26T13:16:11.467Z"}], "totalPaid": 201000}}
236422b2-d25a-4a0e-bd81-15db2bdb604e	SALE-92449904-1IJW	32e18fb2-6ea4-4517-a364-7a3c7aa6bdd0	\N	1845000.00	0	0	0	completed	completed	\N	2025-10-26 15:27:30.801668+00	2025-10-26 15:27:30.801668+00	1845000.00	0.00	care@care.com	\N	Vee	+255673219190	0	24cd45b8-1ce1-486a-b055-29d169c3a8ea	{"type": "Cash", "amount": 1845000, "details": {"payments": [{"amount": 1845000, "method": "Cash", "accountId": "5e32c912-7ab7-444a-8ffd-02cb99b56a04", "timestamp": "2025-10-26T15:27:29.305Z"}], "totalPaid": 1845000}}
baa7de47-fb28-4bd1-a19c-e871e28e71f4	SALE-92811274-L2OG	32e18fb2-6ea4-4517-a364-7a3c7aa6bdd0	\N	1645000.00	0	0	0	completed	completed	Installment Plan: 3 payments	2025-10-26 15:33:32.171546+00	2025-10-26 15:33:32.171546+00	1645000.00	0.00	care@care.com	\N	Vee	+255673219190	0	24cd45b8-1ce1-486a-b055-29d169c3a8ea	{"type": "installment", "amount": 1645000, "details": {"notes": "Installment Plan: 3 payments", "accountId": "5e32c912-7ab7-444a-8ffd-02cb99b56a04", "reference": "Installment Plan - Payments tracked via installment_payments table"}}
\.


ALTER TABLE public.lats_sales ENABLE TRIGGER ALL;

--
-- Data for Name: customer_installment_plans; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_installment_plans DISABLE TRIGGER ALL;

COPY public.customer_installment_plans (id, plan_number, customer_id, sale_id, branch_id, total_amount, down_payment, amount_financed, total_paid, balance_due, installment_amount, number_of_installments, installments_paid, payment_frequency, start_date, next_payment_date, end_date, completion_date, status, late_fee_amount, late_fee_applied, days_overdue, last_reminder_sent, reminder_count, terms_accepted, terms_accepted_date, notes, created_by, created_at, updated_at) FROM stdin;
69b7cb30-6fac-41cf-83fb-4458b5693778	INS-001	0fe06fb0-33e4-4122-8169-5e2b8cbedc16	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea	40000	65	39935	0	39935	13311.666666666666	3	0	monthly	2025-10-21	2025-11-20	2026-01-19	\N	active	0	0	0	\N	0	t	2025-10-21 22:42:41.640665+00	Created from POS - Sale: SALE-86557102-NVDZ	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 22:42:41.640665+00	2025-10-21 22:42:41.640665+00
2e3e4485-8e97-4446-9cc3-a17e5ad017ac	INS-002	54ebcb36-3c3e-4512-898a-91582c73adf9	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea	1128.4	800	328.4000000000001	0	328.4000000000001	109.4666666666667	3	0	monthly	2025-10-21	2025-11-20	2026-01-19	\N	active	90	0	0	\N	0	t	2025-10-21 22:43:06.366841+00	Created from POS - Sale: SALE-86580436-RFYN	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 22:43:06.366841+00	2025-10-21 22:43:06.366841+00
c74408e3-2f27-4af9-9211-161847234724	INS-003	0fe06fb0-33e4-4122-8169-5e2b8cbedc16	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea	104	55	49	0	49	16.333333333333332	3	0	monthly	2025-10-21	2025-11-20	2026-01-19	\N	active	0	0	0	\N	0	t	2025-10-21 22:45:25.049252+00	Created from POS - Sale: SALE-86719291-X15N	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 22:45:25.049252+00	2025-10-21 22:45:25.049252+00
e07ff54c-3ba8-45a9-9283-57481af8c0db	INS-004	aee285a4-12bc-4ec1-b95b-2c2f5505b05a	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea	104	76	28	0	28	9.333333333333334	3	0	monthly	2025-10-21	2025-11-20	2026-01-19	\N	active	787	0	0	\N	0	t	2025-10-21 22:47:43.40272+00	Created from POS - Sale: SALE-86858999-D5DV	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 22:47:43.40272+00	2025-10-21 22:47:43.40272+00
48ae5227-c52e-49ec-956b-f121ee4d049b	INS-005	aee285a4-12bc-4ec1-b95b-2c2f5505b05a	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea	1128.4	0	1128.4	376.13	752.27	376.1333333333334	3	1	monthly	2025-10-21	2026-01-17	2026-01-19	\N	active	0	0	0	2025-10-22 06:27:54.047+00	2	t	2025-10-21 22:51:23.301084+00	Created from POS - Sale: SALE-87078108-IOO5	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 22:51:23.301084+00	2025-10-22 10:09:24.906+00
66d92a89-d5f8-4e4a-8eb1-e60cd98ec871	INS-006	aee285a4-12bc-4ec1-b95b-2c2f5505b05a	\N	24cd45b8-1ce1-486a-b055-29d169c3a8ea	104	0	104	34.67	69.33	34.666666666666664	3	1	monthly	2025-10-21	2027-03-28	2026-01-19	\N	active	0	0	0	\N	0	t	2025-10-21 22:52:40.99155+00	Created from POS - Sale: SALE-87156439-S1KP	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 22:52:40.99155+00	2025-10-22 10:09:01.149+00
4b3e15c1-8e8c-41fa-beed-543ab5ed4c30	INS-007	32e18fb2-6ea4-4517-a364-7a3c7aa6bdd0	baa7de47-fb28-4bd1-a19c-e871e28e71f4	24cd45b8-1ce1-486a-b055-29d169c3a8ea	1645000	0	1645000	1096666.66	548333.34	548333.3333333334	3	2	weekly	2025-10-26	2025-11-14	2025-11-16	\N	active	50000	0	0	\N	0	t	2025-10-26 15:33:36.787968+00	Created from POS - Sale: SALE-92811274-L2OG	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 15:33:36.787968+00	2025-10-26 15:34:52.314+00
\.


ALTER TABLE public.customer_installment_plans ENABLE TRIGGER ALL;

--
-- Data for Name: customer_installment_plan_payments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_installment_plan_payments DISABLE TRIGGER ALL;

COPY public.customer_installment_plan_payments (id, installment_plan_id, customer_id, installment_number, amount, payment_method, payment_date, due_date, status, days_late, late_fee, account_id, reference_number, notification_sent, notification_sent_at, notes, created_by, created_at) FROM stdin;
\.


ALTER TABLE public.customer_installment_plan_payments ENABLE TRIGGER ALL;

--
-- Data for Name: customer_messages; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_messages DISABLE TRIGGER ALL;

COPY public.customer_messages (id, customer_id, message, direction, channel, status, sender_id, sender_name, device_id, appointment_id, metadata, created_at, read_at, delivered_at, branch_id) FROM stdin;
732ffe74-da7f-4d83-b579-5b24dcb0db1a	aee285a4-12bc-4ec1-b95b-2c2f5505b05a	Hi, I wanted to check on the status of my device repair.	inbound	chat	read	\N	Samuel masika	\N	\N	\N	2025-10-21 04:16:25.621436+00	\N	\N	\N
47d6c191-bf7d-43a9-92e7-af5f55141eb8	aee285a4-12bc-4ec1-b95b-2c2f5505b05a	Thank you for the quick response!	inbound	chat	delivered	\N	Samuel masika	\N	\N	\N	2025-10-21 05:46:25.621436+00	\N	\N	\N
d4f52c05-f9db-4d8a-a638-fddfd9e74159	aee285a4-12bc-4ec1-b95b-2c2f5505b05a	Your device is currently being repaired. We'll notify you once it's ready!	outbound	chat	read	a780f924-8343-46ec-a127-d7477165b0a8	Support Team	\N	\N	\N	2025-10-21 05:16:25.621436+00	\N	\N	\N
\.


ALTER TABLE public.customer_messages ENABLE TRIGGER ALL;

--
-- Data for Name: customer_notes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_notes DISABLE TRIGGER ALL;

COPY public.customer_notes (id, customer_id, note, created_by, created_at, updated_at) FROM stdin;
0f634f42-a6a6-4a09-bcb0-f1923244167f	4e4b2f94-3b07-405c-ad56-744c3926f4c7	+105 points for new device: Apple iPhone 6s (A1633, A1688)	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 05:57:49.807779+00	2025-10-21 05:57:49.807779+00
9ec3584a-f6c9-4fff-8a8c-b62671b037a4	aee285a4-12bc-4ec1-b95b-2c2f5505b05a	+103 points for new device: Samsung Samsung Galaxy S20+	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 05:58:38.739155+00	2025-10-21 05:58:38.739155+00
e9682581-d331-4e23-bc8e-c413605d44c4	aee285a4-12bc-4ec1-b95b-2c2f5505b05a	+103 points for new device: Samsung Samsung Galaxy S20+	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 05:59:17.12772+00	2025-10-21 05:59:17.12772+00
44ee41a7-8964-48d7-9f07-faf8411ee149	0d949b9b-720f-4670-a521-e2bef9eceeed	+105 points for new device: Apple iPhone 7 (A1660, A1778)	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 06:01:09.468813+00	2025-10-21 06:01:09.468813+00
6da23fa9-3b28-4e81-a577-81c80d25fb5c	32e18fb2-6ea4-4517-a364-7a3c7aa6bdd0	Welcome! 10 points awarded for new customer registration.	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-26 15:25:48.325+00	2025-10-26 15:25:49.221918+00
\.


ALTER TABLE public.customer_notes ENABLE TRIGGER ALL;

--
-- Data for Name: customer_payments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_payments DISABLE TRIGGER ALL;

COPY public.customer_payments (id, customer_id, device_id, amount, method, payment_type, status, reference_number, notes, payment_date, created_by, created_at, updated_at, sale_id, branch_id, currency) FROM stdin;
\.


ALTER TABLE public.customer_payments ENABLE TRIGGER ALL;

--
-- Data for Name: customer_points_history; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_points_history DISABLE TRIGGER ALL;

COPY public.customer_points_history (id, customer_id, points_change, reason, transaction_type, created_by, created_at) FROM stdin;
\.


ALTER TABLE public.customer_points_history ENABLE TRIGGER ALL;

--
-- Data for Name: customer_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_preferences DISABLE TRIGGER ALL;

COPY public.customer_preferences (id, customer_id, preferred_contact_method, communication_frequency, marketing_opt_in, sms_opt_in, email_opt_in, whatsapp_opt_in, preferred_language, notification_preferences, preferred_branch, preferred_payment_method, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.customer_preferences ENABLE TRIGGER ALL;

--
-- Data for Name: customer_revenue; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_revenue DISABLE TRIGGER ALL;

COPY public.customer_revenue (id, customer_id, revenue_date, revenue_amount, revenue_source, created_at) FROM stdin;
\.


ALTER TABLE public.customer_revenue ENABLE TRIGGER ALL;

--
-- Data for Name: customer_special_orders; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.customer_special_orders DISABLE TRIGGER ALL;

COPY public.customer_special_orders (id, order_number, customer_id, branch_id, product_name, product_description, quantity, unit_price, total_amount, deposit_paid, balance_due, status, order_date, expected_arrival_date, actual_arrival_date, delivery_date, supplier_name, supplier_reference, country_of_origin, pg_dump: error: query failed: SSL connection has been closed unexpectedly
pg_dump: detail: Query was: COPY public.device_attachments (id, device_id, file_name, file_url, file_type, file_size, uploaded_by, created_at) TO stdout;
tracking_number, notes, internal_notes, customer_notified_arrival, created_by, created_at, updated_at) FROM stdin;
f3ec3ca1-302c-4b56-8bdc-e49300a76b3e	SPO-001	2c510481-26e6-43cb-b9d3-6de116e96889	00000000-0000-0000-0000-000000000001	sdasadasd	sadasdasd	134	435	58290	4324	53966	deposit_received	2025-10-21 19:55:47.189095+00	2025-10-23	\N	\N	gfdgdfg	\N	dfgfdg	\N	fdgfdgdf	\N	f	287ec561-d5f2-4113-840e-e9335b9d3f69	2025-10-21 19:55:47.189095+00	2025-10-21 19:55:47.590386+00
\.


ALTER TABLE public.customer_special_orders ENABLE TRIGGER ALL;

--
-- Data for Name: daily_opening_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.daily_opening_sessions DISABLE TRIGGER ALL;

COPY public.daily_opening_sessions (id, date, opened_at, opened_by, opened_by_user_id, is_active, notes, created_at) FROM stdin;
bc6a30c7-b820-483a-a88f-63db477186f2	2025-10-11	2025-10-11 13:03:49.264+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	f	\N	2025-10-11 13:03:50.030813+00
85ef5ac0-c9ce-4fab-811e-62bf4f2b41ea	2025-10-11	2025-10-11 13:09:25.999+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-11 13:09:26.783277+00
ef7de604-3f78-4fae-a67a-f41a012b938e	2025-10-12	2025-10-12 03:48:50.508+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-12 03:48:51.277747+00
52c07deb-afed-4cd6-8b4e-0fc60ab3ac58	2025-10-13	2025-10-13 14:15:23.711+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-13 14:15:24.234377+00
d1d342ea-24d4-4812-95bf-ef6481f916b2	2025-10-14	2025-10-14 07:00:07.89+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-14 07:00:08.696491+00
7bcbd581-d60d-4285-b45c-fed7d95fe71b	2025-10-15	2025-10-15 03:52:45.986+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-15 03:52:46.504365+00
a1de09d6-28a5-4ce7-9e55-afb08426e357	2025-10-17	2025-10-17 05:58:40.429+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-17 05:58:42.60821+00
920a2253-c754-4e4c-99d4-4ade23f205ed	2025-10-18	2025-10-18 08:41:22.771+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	f	\N	2025-10-18 08:41:23.526199+00
e9c883a0-8b58-464d-82ac-55adae50ac1a	2025-10-18	2025-10-18 16:52:25.732+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	Day opened after closure	2025-10-18 16:52:27.364888+00
b0ec8b5b-09dc-4e70-8a50-5ca885aad5a4	2025-10-19	2025-10-19 13:11:59.96+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-19 13:12:00.59289+00
2cab803b-9ebf-46f3-8aa4-d0c7e87d6281	2025-10-20	2025-10-20 06:01:30.4+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-20 06:01:31.555629+00
2653e2f1-c811-4685-9c8d-b8e7519de5d2	2025-10-21	2025-10-21 05:52:08.729+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-21 05:52:09.46956+00
36f29857-b4a4-4161-8a94-1593e8d40b72	2025-10-22	2025-10-22 08:07:25.665+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-22 08:07:26.172589+00
c7675193-3065-4393-b2c4-40306ad23ff1	2025-10-23	2025-10-23 06:53:23.754+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-23 06:53:24.477304+00
b1b9d15e-af42-4a6e-96fb-a71673f1c477	2025-10-24	2025-10-24 01:45:36.747+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-24 01:45:37.434932+00
3ac7634b-da62-45fc-9338-ef61d370655d	2025-10-26	2025-10-26 08:29:44.971+00	admin	287ec561-d5f2-4113-840e-e9335b9d3f69	t	\N	2025-10-26 08:29:45.267803+00
\.


ALTER TABLE public.daily_opening_sessions ENABLE TRIGGER ALL;

--
-- Data for Name: daily_sales_closures; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.daily_sales_closures DISABLE TRIGGER ALL;

COPY public.daily_sales_closures (id, date, total_sales, total_transactions, closed_at, closed_by, closed_by_user_id, sales_data, created_at, updated_at, session_id) FROM stdin;
\.


ALTER TABLE public.daily_sales_closures ENABLE TRIGGER ALL;

--
-- Data for Name: device_attachments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.device_attachments DISABLE TRIGGER ALL;

COPY public.device_attachments (id, device_id, file_name, file_url, file_type, file_size, uploaded_by, created_at) FROM stdin;
