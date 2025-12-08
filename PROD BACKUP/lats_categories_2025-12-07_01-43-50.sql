-- Backup of lats_categories table
-- Generated: 2025-12-07T01:43:56.187Z
-- Total records: 2
-- Filter: branch_id IN ('24cd45b8-1ce1-486a-b055-29d169c3a8ea')

INSERT INTO lats_categories (id, name, description, icon, color, is_active, created_at, updated_at, parent_id, sort_order, metadata, branch_id, is_shared) VALUES
('f118d5db-8b33-48fa-a9e7-2458711f0cae', 'Tablets', 'Auto-created during product import', NULL, NULL, true, '2025-12-01T03:06:25.193Z'::timestamptz, '2025-12-01T03:06:25.193Z'::timestamptz, NULL, 0, '{}'::jsonb, '24cd45b8-1ce1-486a-b055-29d169c3a8ea', true),
('ae58cfd5-6d49-4dbf-808c-951d94dffbac', 'Smartphones', 'Auto-created during product import', NULL, NULL, true, '2025-12-01T02:52:04.370Z'::timestamptz, '2025-12-01T02:52:04.370Z'::timestamptz, NULL, 0, '{}'::jsonb, '24cd45b8-1ce1-486a-b055-29d169c3a8ea', true);
