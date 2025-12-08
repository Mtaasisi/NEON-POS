-- Backup of users table
-- Generated: 2025-12-07T01:43:59.276Z
-- Total records: 4
-- Filter: branch_id IN ('24cd45b8-1ce1-486a-b055-29d169c3a8ea')

INSERT INTO users (id, email, password, full_name, role, is_active, created_at, updated_at, username, permissions, max_devices_allowed, require_approval, failed_login_attempts, two_factor_enabled, two_factor_secret, last_login, phone, department, branch_id) VALUES
('287ec561-d5f2-4113-840e-e9335b9d3f69', 'care@care.com', '123456', 'Mtaasisis kaka', 'admin', true, '2025-10-07T18:09:29.324Z'::timestamptz, '2025-10-12T17:59:06.818Z'::timestamptz, 'care@care.com', '["all"]'::jsonb, 1000, false, 0, false, NULL, NULL, '', '', '24cd45b8-1ce1-486a-b055-29d169c3a8ea'),
('4813e4c7-771e-43e9-a8fd-e69db13a3322', 'care@pos.com', 'care123456', 'Diana masika', 'customer-care', true, '2025-10-07T18:09:29.324Z'::timestamptz, '2025-10-12T18:03:07.491Z'::timestamptz, 'care@pos.com', '["all"]'::jsonb, 1000, false, 0, false, NULL, NULL, '', '', '24cd45b8-1ce1-486a-b055-29d169c3a8ea'),
('762f6db8-e738-480f-a9d3-9699c440e2d9', 'tech@pos.com', 'tech123456', 'Technician User', 'technician', true, '2025-10-07T18:09:29.324Z'::timestamptz, '2025-10-09T08:12:42.907Z'::timestamptz, 'tech@pos.com', '["all"]'::jsonb, 1000, false, 0, false, NULL, NULL, NULL, NULL, '24cd45b8-1ce1-486a-b055-29d169c3a8ea'),
('a780f924-8343-46ec-a127-d7477165b0a8', 'manager@pos.com', 'manager123', 'Manager User', 'manager', true, '2025-10-07T18:09:29.324Z'::timestamptz, '2025-10-09T08:12:42.907Z'::timestamptz, 'manager@pos.com', '["all"]'::jsonb, 1000, false, 0, false, NULL, NULL, NULL, NULL, '24cd45b8-1ce1-486a-b055-29d169c3a8ea');
