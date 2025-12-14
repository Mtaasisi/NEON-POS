-- Auto-generated sync SQL
-- Generated on: 2025-11-25T17:49:54.864Z
-- This file synchronizes production database with development

BEGIN;

-- Missing tables in production
-- CREATE TABLE backup_logs (structure needs to be copied from dev)
-- CREATE TABLE lats_stock_transfers (structure needs to be copied from dev)
-- CREATE TABLE loyalty_points (structure needs to be copied from dev)

-- Missing views in production
-- CREATE VIEW installment_plans (structure needs to be copied from dev)
-- CREATE VIEW lats_storage_rooms (structure needs to be copied from dev)
-- CREATE VIEW special_orders (structure needs to be copied from dev)

-- Table structure differences
-- ALTER TABLE lats_inventory_items (column count differs: dev=29, prod=26)
-- ALTER TABLE lats_spare_parts (column count differs: dev=18, prod=17)

-- Constraint differences
-- ALTER TABLE lats_inventory_items (constraint count differs: dev=9, prod=7)

-- Index differences
-- CREATE INDEX on lats_inventory_items (index count differs: dev=10, prod=8)

COMMIT;
