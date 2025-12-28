-- ============================================
-- MYSQL DATABASE SCHEMA - PROPERLY CONVERTED FROM POSTGRESQL
-- Generated: 2025-12-22T12:46:31.285Z
-- ============================================

-- ============================================
-- MySQL Table: account_transactions
-- ============================================
DROP TABLE IF EXISTS `account_transactions`;

CREATE TABLE `account_transactions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `account_id` CHAR(36) NOT NULL,
  `transaction_type` TEXT NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `balance_before` DECIMAL(15,2) DEFAULT 0.00,
  `balance_after` DECIMAL(15,2) DEFAULT 0.00,
  `reference_number` TEXT,
  `description` TEXT,
  `related_transaction_id` CHAR(36),
  `metadata` JSON,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `related_entity_type` VARCHAR(50),
  `related_entity_id` CHAR(36),
  `branch_id` CHAR(36),
  `status` TEXT DEFAULT 'approved',
  PRIMARY KEY (`id`),
  KEY `idx_account_trans_account` (`account_id`),
  KEY `idx_account_trans_created` (`created_at`),
  KEY `idx_account_trans_reference` (`reference_number`),
  KEY `idx_account_trans_type` (`transaction_type`),
  KEY `idx_account_transactions_account_id` (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: admin_settings
-- ============================================
DROP TABLE IF EXISTS `admin_settings`;

CREATE TABLE `admin_settings` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `key` VARCHAR(255) NOT NULL,
  `value` TEXT,
  `type` VARCHAR(50) DEFAULT 'string',
  `description` TEXT,
  `category` VARCHAR(100),
  `is_system` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_settings_key_unique` (`key`),
  KEY `idx_admin_settings_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: admin_settings_log
-- ============================================
DROP TABLE IF EXISTS `admin_settings_log`;

CREATE TABLE `admin_settings_log` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `setting_id` CHAR(36),
  `user_id` CHAR(36),
  `action` VARCHAR(50) NOT NULL,
  `old_value` TEXT,
  `new_value` TEXT,
  `ip_address` VARCHAR(45),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_settings_log_setting` (`setting_id`),
  KEY `idx_admin_settings_log_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: api_keys
-- ============================================
DROP TABLE IF EXISTS `api_keys`;

CREATE TABLE `api_keys` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `key` VARCHAR(255) NOT NULL,
  `secret` TEXT,
  `permissions` JSON,
  `is_active` BOOLEAN DEFAULT TRUE,
  `expires_at` TIMESTAMP NULL,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_used_at` TIMESTAMP NULL,
  `usage_count` INT DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_keys_key_unique` (`key`),
  KEY `idx_api_keys_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: api_request_logs
-- ============================================
DROP TABLE IF EXISTS `api_request_logs`;

CREATE TABLE `api_request_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `api_key_id` CHAR(36),
  `endpoint` VARCHAR(500) NOT NULL,
  `method` VARCHAR(10) NOT NULL,
  `request_data` JSON,
  `response_data` JSON,
  `status_code` INT,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `duration_ms` INT,
  `error_message` TEXT,
  PRIMARY KEY (`id`),
  KEY `idx_api_request_logs_key` (`api_key_id`),
  KEY `idx_api_request_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: appointments
-- ============================================
DROP TABLE IF EXISTS `appointments`;

CREATE TABLE `appointments` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36),
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `appointment_date` DATETIME NOT NULL,
  `duration_minutes` INT DEFAULT 60,
  `status` VARCHAR(50) DEFAULT 'scheduled',
  `assigned_to` CHAR(36),
  `location` TEXT,
  `reminder_sent` BOOLEAN DEFAULT FALSE,
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `service_type` VARCHAR(100),
  `priority` VARCHAR(20) DEFAULT 'normal',
  PRIMARY KEY (`id`),
  KEY `idx_appointments_customer` (`customer_id`),
  KEY `idx_appointments_date` (`appointment_date`),
  KEY `idx_appointments_assigned` (`assigned_to`),
  KEY `idx_appointments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: attendance_records
-- ============================================
DROP TABLE IF EXISTS `attendance_records`;

CREATE TABLE `attendance_records` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `employee_id` CHAR(36) NOT NULL,
  `check_in_time` TIMESTAMP NOT NULL,
  `check_out_time` TIMESTAMP NULL,
  `date` DATE NOT NULL,
  `hours_worked` DECIMAL(5,2),
  `status` VARCHAR(50) DEFAULT 'present',
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `overtime_hours` DECIMAL(5,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_attendance_employee` (`employee_id`),
  KEY `idx_attendance_date` (`date`),
  KEY `idx_attendance_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: audit_logs
-- ============================================
DROP TABLE IF EXISTS `audit_logs`;

CREATE TABLE `audit_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36),
  `action` VARCHAR(255) NOT NULL,
  `table_name` VARCHAR(100),
  `record_id` CHAR(36),
  `old_data` JSON,
  `new_data` JSON,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `details` TEXT,
  `entity_type` VARCHAR(50),
  `entity_id` CHAR(36),
  `user_role` VARCHAR(50),
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `category` VARCHAR(50),
  `description` TEXT,
  `old_values` JSON,
  `new_values` JSON,
  `user_name` VARCHAR(255),
  `branch_id` CHAR(36),
  `branch_name` VARCHAR(255),
  `metadata` JSON,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user` (`user_id`),
  KEY `idx_audit_logs_action` (`action`),
  KEY `idx_audit_logs_created` (`created_at`),
  KEY `idx_audit_logs_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: auth_users
-- ============================================
DROP TABLE IF EXISTS `auth_users`;

CREATE TABLE `auth_users` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `email` VARCHAR(255) NOT NULL,
  `password_hash` TEXT NOT NULL,
  `role` VARCHAR(50) DEFAULT 'user',
  `is_active` BOOLEAN DEFAULT TRUE,
  `last_login` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `password_reset_token` VARCHAR(255),
  `password_reset_expires` TIMESTAMP NULL,
  `email_verified` BOOLEAN DEFAULT FALSE,
  `email_verification_token` VARCHAR(255),
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_users_email_unique` (`email`),
  KEY `idx_auth_users_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: auto_reorder_log
-- ============================================
DROP TABLE IF EXISTS `auto_reorder_log`;

CREATE TABLE `auto_reorder_log` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `product_id` CHAR(36) NOT NULL,
  `supplier_id` CHAR(36),
  `current_stock` INT NOT NULL,
  `reorder_point` INT NOT NULL,
  `reorder_quantity` INT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `processed_at` TIMESTAMP NULL,
  `notes` TEXT,
  `branch_id` CHAR(36),
  PRIMARY KEY (`id`),
  KEY `idx_auto_reorder_product` (`product_id`),
  KEY `idx_auto_reorder_supplier` (`supplier_id`),
  KEY `idx_auto_reorder_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: backup_logs
-- ============================================
DROP TABLE IF EXISTS `backup_logs`;

CREATE TABLE `backup_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `backup_type` VARCHAR(50) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `file_size` BIGINT,
  `status` VARCHAR(50) DEFAULT 'completed',
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL,
  `error_message` TEXT,
  `metadata` JSON,
  PRIMARY KEY (`id`),
  KEY `idx_backup_logs_type` (`backup_type`),
  KEY `idx_backup_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: branch_activity_log
-- ============================================
DROP TABLE IF EXISTS `branch_activity_log`;

CREATE TABLE `branch_activity_log` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `branch_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36),
  `action_type` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50),
  `entity_id` CHAR(36),
  `description` TEXT,
  `metadata` JSON,
  `ip_address` VARCHAR(45),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_branch_activity_branch` (`branch_id`),
  KEY `idx_branch_activity_user` (`user_id`),
  KEY `idx_branch_activity_action` (`action_type`),
  KEY `idx_branch_activity_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: branch_transfers
-- ============================================
DROP TABLE IF EXISTS `branch_transfers`;

CREATE TABLE `branch_transfers` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `transfer_number` VARCHAR(50) NOT NULL,
  `from_branch_id` CHAR(36) NOT NULL,
  `to_branch_id` CHAR(36) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `transfer_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expected_delivery_date` DATE,
  `actual_delivery_date` DATE,
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approved_by` CHAR(36),
  `approved_at` TIMESTAMP NULL,
  `total_items` INT DEFAULT 0,
  `total_value` DECIMAL(15,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_transfers_transfer_number_unique` (`transfer_number`),
  KEY `idx_branch_transfers_from` (`from_branch_id`),
  KEY `idx_branch_transfers_to` (`to_branch_id`),
  KEY `idx_branch_transfers_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: bulk_message_templates
-- ============================================
DROP TABLE IF EXISTS `bulk_message_templates`;

CREATE TABLE `bulk_message_templates` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `message_type` VARCHAR(50) NOT NULL,
  `subject` VARCHAR(255),
  `content` TEXT NOT NULL,
  `variables` JSON,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `usage_count` INT DEFAULT 0,
  `category` VARCHAR(100),
  PRIMARY KEY (`id`),
  KEY `idx_bulk_message_templates_type` (`message_type`),
  KEY `idx_bulk_message_templates_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: buyer_details
-- ============================================
DROP TABLE IF EXISTS `buyer_details`;

CREATE TABLE `buyer_details` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `sale_id` CHAR(36) NOT NULL,
  `buyer_name` VARCHAR(255),
  `buyer_phone` VARCHAR(20),
  `buyer_email` VARCHAR(255),
  `buyer_address` TEXT,
  `identification_type` VARCHAR(50),
  `identification_number` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `buyer_details_sale_id_unique` (`sale_id`),
  KEY `idx_buyer_details_phone` (`buyer_phone`),
  KEY `idx_buyer_details_email` (`buyer_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: campaign_notifications
-- ============================================
DROP TABLE IF EXISTS `campaign_notifications`;

CREATE TABLE `campaign_notifications` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `campaign_id` CHAR(36) NOT NULL,
  `customer_id` CHAR(36) NOT NULL,
  `notification_type` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `scheduled_at` TIMESTAMP NULL,
  `sent_at` TIMESTAMP NULL,
  `delivered_at` TIMESTAMP NULL,
  `read_at` TIMESTAMP NULL,
  `failed_at` TIMESTAMP NULL,
  `error_message` TEXT,
  `metadata` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_campaign_notifications_campaign` (`campaign_id`),
  KEY `idx_campaign_notifications_customer` (`customer_id`),
  KEY `idx_campaign_notifications_status` (`status`),
  KEY `idx_campaign_notifications_scheduled` (`scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: categories
-- ============================================
DROP TABLE IF EXISTS `categories`;

CREATE TABLE `categories` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `parent_id` CHAR(36),
  `sort_order` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `image_url` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `color` VARCHAR(7),
  `icon` VARCHAR(100),
  PRIMARY KEY (`id`),
  KEY `idx_categories_parent` (`parent_id`),
  KEY `idx_categories_active` (`is_active`),
  KEY `idx_categories_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: chat_messages
-- ============================================
DROP TABLE IF EXISTS `chat_messages`;

CREATE TABLE `chat_messages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `conversation_id` CHAR(36) NOT NULL,
  `sender_id` CHAR(36),
  `sender_type` VARCHAR(50) DEFAULT 'user',
  `message_type` VARCHAR(50) DEFAULT 'text',
  `content` TEXT NOT NULL,
  `metadata` JSON,
  `is_read` BOOLEAN DEFAULT FALSE,
  `read_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_messages_conversation` (`conversation_id`),
  KEY `idx_chat_messages_sender` (`sender_id`),
  KEY `idx_chat_messages_created` (`created_at`),
  KEY `idx_chat_messages_read` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: communication_log
-- ============================================
DROP TABLE IF EXISTS `communication_log`;

CREATE TABLE `communication_log` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36),
  `communication_type` VARCHAR(50) NOT NULL,
  `direction` VARCHAR(20) NOT NULL,
  `subject` VARCHAR(255),
  `content` TEXT,
  `status` VARCHAR(50) DEFAULT 'sent',
  `sent_at` TIMESTAMP NULL,
  `delivered_at` TIMESTAMP NULL,
  `read_at` TIMESTAMP NULL,
  `failed_at` TIMESTAMP NULL,
  `error_message` TEXT,
  `metadata` JSON,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  PRIMARY KEY (`id`),
  KEY `idx_communication_log_customer` (`customer_id`),
  KEY `idx_communication_log_type` (`communication_type`),
  KEY `idx_communication_log_status` (`status`),
  KEY `idx_communication_log_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: communication_templates
-- ============================================
DROP TABLE IF EXISTS `communication_templates`;

CREATE TABLE `communication_templates` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `subject` VARCHAR(255),
  `content` TEXT NOT NULL,
  `variables` JSON,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `usage_count` INT DEFAULT 0,
  `category` VARCHAR(100),
  PRIMARY KEY (`id`),
  KEY `idx_communication_templates_type` (`type`),
  KEY `idx_communication_templates_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: contact_history
-- ============================================
DROP TABLE IF EXISTS `contact_history`;

CREATE TABLE `contact_history` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `contact_type` VARCHAR(50) NOT NULL,
  `contact_value` VARCHAR(255) NOT NULL,
  `is_primary` BOOLEAN DEFAULT FALSE,
  `is_active` BOOLEAN DEFAULT TRUE,
  `verified_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `verification_code` VARCHAR(10),
  `verification_attempts` INT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_contact_history_customer` (`customer_id`),
  KEY `idx_contact_history_type` (`contact_type`),
  KEY `idx_contact_history_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: contact_methods
-- ============================================
DROP TABLE IF EXISTS `contact_methods`;

CREATE TABLE `contact_methods` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `method_type` VARCHAR(50) NOT NULL,
  `value` VARCHAR(255) NOT NULL,
  `is_primary` BOOLEAN DEFAULT FALSE,
  `is_verified` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_used` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_contact_methods_customer` (`customer_id`),
  KEY `idx_contact_methods_type` (`method_type`),
  KEY `idx_contact_methods_primary` (`is_primary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: contact_preferences
-- ============================================
DROP TABLE IF EXISTS `contact_preferences`;

CREATE TABLE `contact_preferences` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `email_marketing` BOOLEAN DEFAULT TRUE,
  `sms_marketing` BOOLEAN DEFAULT TRUE,
  `whatsapp_marketing` BOOLEAN DEFAULT TRUE,
  `birthday_reminders` BOOLEAN DEFAULT TRUE,
  `appointment_reminders` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contact_preferences_customer_unique` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customer_checkins
-- ============================================
DROP TABLE IF EXISTS `customer_checkins`;

CREATE TABLE `customer_checkins` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `checkin_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `checkout_time` TIMESTAMP NULL,
  `location` VARCHAR(255),
  `purpose` VARCHAR(100),
  `notes` TEXT,
  `created_by` CHAR(36),
  `branch_id` CHAR(36),
  `device_info` JSON,
  PRIMARY KEY (`id`),
  KEY `idx_customer_checkins_customer` (`customer_id`),
  KEY `idx_customer_checkins_time` (`checkin_time`),
  KEY `idx_customer_checkins_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customer_communications
-- ============================================
DROP TABLE IF EXISTS `customer_communications`;

CREATE TABLE `customer_communications` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `direction` VARCHAR(20) NOT NULL,
  `subject` VARCHAR(255),
  `content` TEXT,
  `status` VARCHAR(50) DEFAULT 'sent',
  `sent_at` TIMESTAMP NULL,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `metadata` JSON,
  PRIMARY KEY (`id`),
  KEY `idx_customer_communications_customer` (`customer_id`),
  KEY `idx_customer_communications_type` (`type`),
  KEY `idx_customer_communications_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customer_fix_backup
-- ============================================
DROP TABLE IF EXISTS `customer_fix_backup`;

CREATE TABLE `customer_fix_backup` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `original_id` CHAR(36),
  `data` JSON,
  `backup_type` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_fix_backup_original` (`original_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customer_installment_plan_payments
-- ============================================
DROP TABLE IF EXISTS `customer_installment_plan_payments`;

CREATE TABLE `customer_installment_plan_payments` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `installment_plan_id` CHAR(36) NOT NULL,
  `payment_number` INT NOT NULL,
  `amount_due` DECIMAL(15,2) NOT NULL,
  `amount_paid` DECIMAL(15,2) DEFAULT 0.00,
  `due_date` DATE NOT NULL,
  `paid_date` DATE,
  `status` VARCHAR(50) DEFAULT 'pending',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_installment_plan_payments_plan` (`installment_plan_id`),
  KEY `idx_customer_installment_plan_payments_due` (`due_date`),
  KEY `idx_customer_installment_plan_payments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customer_installment_plans
-- ============================================
DROP TABLE IF EXISTS `customer_installment_plans`;

CREATE TABLE `customer_installment_plans` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `sale_id` CHAR(36),
  `total_amount` DECIMAL(15,2) NOT NULL,
  `down_payment` DECIMAL(15,2) DEFAULT 0.00,
  `installment_amount` DECIMAL(15,2) NOT NULL,
  `number_of_installments` INT NOT NULL,
  `interest_rate` DECIMAL(5,2) DEFAULT 0.00,
  `start_date` DATE NOT NULL,
  `status` VARCHAR(50) DEFAULT 'active',
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  PRIMARY KEY (`id`),
  KEY `idx_customer_installment_plans_customer` (`customer_id`),
  KEY `idx_customer_installment_plans_sale` (`sale_id`),
  KEY `idx_customer_installment_plans_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customer_messages
-- ============================================
DROP TABLE IF EXISTS `customer_messages`;

CREATE TABLE `customer_messages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `message_type` VARCHAR(50) NOT NULL,
  `subject` VARCHAR(255),
  `content` TEXT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'sent',
  `sent_at` TIMESTAMP NULL,
  `read_at` TIMESTAMP NULL,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  PRIMARY KEY (`id`),
  KEY `idx_customer_messages_customer` (`customer_id`),
  KEY `idx_customer_messages_type` (`message_type`),
  KEY `idx_customer_messages_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customer_notes
-- ============================================
DROP TABLE IF EXISTS `customer_notes`;

CREATE TABLE `customer_notes` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `note_type` VARCHAR(50) DEFAULT 'general',
  `title` VARCHAR(255),
  `content` TEXT NOT NULL,
  `is_important` BOOLEAN DEFAULT FALSE,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  PRIMARY KEY (`id`),
  KEY `idx_customer_notes_customer` (`customer_id`),
  KEY `idx_customer_notes_type` (`note_type`),
  KEY `idx_customer_notes_important` (`is_important`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customer_payments
-- ============================================
DROP TABLE IF EXISTS `customer_payments`;

CREATE TABLE `customer_payments` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `reference_number` VARCHAR(100),
  `payment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(50) DEFAULT 'completed',
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `transaction_id` VARCHAR(255),
  PRIMARY KEY (`id`),
  KEY `idx_customer_payments_customer` (`customer_id`),
  KEY `idx_customer_payments_date` (`payment_date`),
  KEY `idx_customer_payments_method` (`payment_method`),
  KEY `idx_customer_payments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customer_points_history
-- ============================================
DROP TABLE IF EXISTS `customer_points_history`;

CREATE TABLE `customer_points_history` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `points_change` INT NOT NULL,
  `reason` VARCHAR(100) NOT NULL,
  `reference_id` CHAR(36),
  `reference_type` VARCHAR(50),
  `balance_before` INT NOT NULL,
  `balance_after` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  PRIMARY KEY (`id`),
  KEY `idx_customer_points_history_customer` (`customer_id`),
  KEY `idx_customer_points_history_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customer_preferences
-- ============================================
DROP TABLE IF EXISTS `customer_preferences`;

CREATE TABLE `customer_preferences` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `notification_email` BOOLEAN DEFAULT TRUE,
  `notification_sms` BOOLEAN DEFAULT TRUE,
  `marketing_emails` BOOLEAN DEFAULT TRUE,
  `language` VARCHAR(10) DEFAULT 'en',
  `timezone` VARCHAR(50) DEFAULT 'UTC',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_preferences_customer_unique` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customer_revenue
-- ============================================
DROP TABLE IF EXISTS `customer_revenue`;

CREATE TABLE `customer_revenue` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `total_revenue` DECIMAL(15,2) DEFAULT 0.00,
  `total_orders` INT DEFAULT 0,
  `average_order_value` DECIMAL(15,2) DEFAULT 0.00,
  `last_order_date` DATE,
  `first_order_date` DATE,
  `loyalty_points` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_revenue_customer_unique` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customer_special_orders
-- ============================================
DROP TABLE IF EXISTS `customer_special_orders`;

CREATE TABLE `customer_special_orders` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) NOT NULL,
  `order_details` TEXT NOT NULL,
  `estimated_cost` DECIMAL(15,2),
  `status` VARCHAR(50) DEFAULT 'pending',
  `requested_date` DATE,
  `estimated_completion` DATE,
  `actual_completion` DATE,
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  PRIMARY KEY (`id`),
  KEY `idx_customer_special_orders_customer` (`customer_id`),
  KEY `idx_customer_special_orders_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customers_duplicates_backup
-- ============================================
DROP TABLE IF EXISTS `customers_duplicates_backup`;

CREATE TABLE `customers_duplicates_backup` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `original_data` JSON,
  `duplicate_data` JSON,
  `merge_action` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: daily_opening_sessions
-- ============================================
DROP TABLE IF EXISTS `daily_opening_sessions`;

CREATE TABLE `daily_opening_sessions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `branch_id` CHAR(36) NOT NULL,
  `opening_date` DATE NOT NULL,
  `opened_by` CHAR(36) NOT NULL,
  `opening_time` TIME NOT NULL,
  `opening_cash` DECIMAL(15,2) DEFAULT 0.00,
  `expected_cash` DECIMAL(15,2) DEFAULT 0.00,
  `notes` TEXT,
  `status` VARCHAR(50) DEFAULT 'open',
  `closed_by` CHAR(36),
  `closing_time` TIME,
  `closing_cash` DECIMAL(15,2),
  `cash_difference` DECIMAL(15,2),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `daily_opening_sessions_branch_date_unique` (`branch_id`, `opening_date`),
  KEY `idx_daily_opening_sessions_date` (`opening_date`),
  KEY `idx_daily_opening_sessions_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: daily_reports
-- ============================================
DROP TABLE IF EXISTS `daily_reports`;

CREATE TABLE `daily_reports` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `branch_id` CHAR(36) NOT NULL,
  `report_date` DATE NOT NULL,
  `opening_balance` DECIMAL(15,2) DEFAULT 0.00,
  `closing_balance` DECIMAL(15,2) DEFAULT 0.00,
  `cash_sales` DECIMAL(15,2) DEFAULT 0.00,
  `card_sales` DECIMAL(15,2) DEFAULT 0.00,
  `total_sales` DECIMAL(15,2) DEFAULT 0.00,
  `total_expenses` DECIMAL(15,2) DEFAULT 0.00,
  `net_profit` DECIMAL(15,2) DEFAULT 0.00,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `daily_reports_branch_date_unique` (`branch_id`, `report_date`),
  KEY `idx_daily_reports_date` (`report_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: daily_sales_closures
-- ============================================
DROP TABLE IF EXISTS `daily_sales_closures`;

CREATE TABLE `daily_sales_closures` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `branch_id` CHAR(36) NOT NULL,
  `closure_date` DATE NOT NULL,
  `opened_by` CHAR(36),
  `closed_by` CHAR(36) NOT NULL,
  `opening_time` TIMESTAMP NULL,
  `closing_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `opening_balance` DECIMAL(15,2) DEFAULT 0.00,
  `closing_balance` DECIMAL(15,2) DEFAULT 0.00,
  `cash_sales` DECIMAL(15,2) DEFAULT 0.00,
  `card_sales` DECIMAL(15,2) DEFAULT 0.00,
  `total_sales` DECIMAL(15,2) DEFAULT 0.00,
  `expenses` DECIMAL(15,2) DEFAULT 0.00,
  `notes` TEXT,
  `status` VARCHAR(50) DEFAULT 'closed',
  `variance` DECIMAL(15,2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `daily_sales_closures_branch_date_unique` (`branch_id`, `closure_date`),
  KEY `idx_daily_sales_closures_date` (`closure_date`),
  KEY `idx_daily_sales_closures_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: lats_products
-- ============================================
DROP TABLE IF EXISTS `lats_products`;

CREATE TABLE `lats_products` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `sku` VARCHAR(100),
  `barcode` VARCHAR(100),
  `category_id` CHAR(36),
  `brand_id` CHAR(36),
  `cost_price` DECIMAL(15,2) DEFAULT 0.00,
  `selling_price` DECIMAL(15,2) DEFAULT 0.00,
  `wholesale_price` DECIMAL(15,2) DEFAULT 0.00,
  `min_stock_level` INT DEFAULT 0,
  `max_stock_level` INT,
  `current_stock` INT DEFAULT 0,
  `unit` VARCHAR(50) DEFAULT 'piece',
  `is_active` BOOLEAN DEFAULT TRUE,
  `is_service` BOOLEAN DEFAULT FALSE,
  `weight` DECIMAL(10,3),
  `dimensions` VARCHAR(100),
  `tax_rate` DECIMAL(5,2) DEFAULT 0.00,
  `supplier_id` CHAR(36),
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `images` JSON,
  `attributes` JSON,
  `variants` JSON,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lats_products_sku_unique` (`sku`),
  UNIQUE KEY `lats_products_barcode_unique` (`barcode`),
  KEY `idx_lats_products_category` (`category_id`),
  KEY `idx_lats_products_brand` (`brand_id`),
  KEY `idx_lats_products_active` (`is_active`),
  KEY `idx_lats_products_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: lats_sales
-- ============================================
DROP TABLE IF EXISTS `lats_sales`;

CREATE TABLE `lats_sales` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `sale_number` VARCHAR(50) NOT NULL,
  `customer_id` CHAR(36),
  `customer_name` VARCHAR(255),
  `customer_phone` VARCHAR(20),
  `customer_email` VARCHAR(255),
  `sale_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `total_amount` DECIMAL(15,2) NOT NULL,
  `discount_amount` DECIMAL(15,2) DEFAULT 0.00,
  `tax_amount` DECIMAL(15,2) DEFAULT 0.00,
  `grand_total` DECIMAL(15,2) NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'cash',
  `payment_status` VARCHAR(50) DEFAULT 'paid',
  `status` VARCHAR(50) DEFAULT 'completed',
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `transaction_id` VARCHAR(255),
  `receipt_number` VARCHAR(100),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lats_sales_sale_number_unique` (`sale_number`),
  KEY `idx_lats_sales_customer` (`customer_id`),
  KEY `idx_lats_sales_date` (`sale_date`),
  KEY `idx_lats_sales_status` (`status`),
  KEY `idx_lats_sales_payment_status` (`payment_status`),
  KEY `idx_lats_sales_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: lats_sale_items
-- ============================================
DROP TABLE IF EXISTS `lats_sale_items`;

CREATE TABLE `lats_sale_items` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `sale_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36) NOT NULL,
  `variant_id` CHAR(36),
  `product_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `discount_amount` DECIMAL(15,2) DEFAULT 0.00,
  `tax_amount` DECIMAL(15,2) DEFAULT 0.00,
  `total_amount` DECIMAL(15,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lats_sale_items_sale` (`sale_id`),
  KEY `idx_lats_sale_items_product` (`product_id`),
  KEY `idx_lats_sale_items_variant` (`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: lats_customers
-- ============================================
DROP TABLE IF EXISTS `lats_customers`;

CREATE TABLE `lats_customers` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100),
  `email` VARCHAR(255),
  `phone` VARCHAR(20),
  `phone2` VARCHAR(20),
  `address` TEXT,
  `city` VARCHAR(100),
  `country` VARCHAR(100) DEFAULT 'Tanzania',
  `date_of_birth` DATE,
  `gender` VARCHAR(10),
  `loyalty_points` INT DEFAULT 0,
  `total_purchases` DECIMAL(15,2) DEFAULT 0.00,
  `last_purchase_date` DATE,
  `is_active` BOOLEAN DEFAULT TRUE,
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `customer_type` VARCHAR(50) DEFAULT 'individual',
  `company_name` VARCHAR(255),
  `tax_id` VARCHAR(50),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lats_customers_email_unique` (`email`),
  KEY `idx_lats_customers_phone` (`phone`),
  KEY `idx_lats_customers_active` (`is_active`),
  KEY `idx_lats_customers_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: lats_categories
-- ============================================
DROP TABLE IF EXISTS `lats_categories`;

CREATE TABLE `lats_categories` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `parent_id` CHAR(36),
  `sort_order` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `image_url` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `color` VARCHAR(7),
  `icon` VARCHAR(100),
  PRIMARY KEY (`id`),
  KEY `idx_lats_categories_parent` (`parent_id`),
  KEY `idx_lats_categories_active` (`is_active`),
  KEY `idx_lats_categories_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: lats_brands
-- ============================================
DROP TABLE IF EXISTS `lats_brands`;

CREATE TABLE `lats_brands` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `logo_url` TEXT,
  `website` VARCHAR(255),
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lats_brands_name_unique` (`name`),
  KEY `idx_lats_brands_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: lats_branches
-- ============================================
DROP TABLE IF EXISTS `lats_branches`;

CREATE TABLE `lats_branches` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `address` TEXT,
  `phone` VARCHAR(20),
  `email` VARCHAR(255),
  `manager_id` CHAR(36),
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `location` VARCHAR(255),
  `operating_hours` JSON,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lats_branches_code_unique` (`code`),
  KEY `idx_lats_branches_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: lats_suppliers
-- ============================================
DROP TABLE IF EXISTS `lats_suppliers`;

CREATE TABLE `lats_suppliers` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `contact_person` VARCHAR(255),
  `email` VARCHAR(255),
  `phone` VARCHAR(20),
  `phone2` VARCHAR(20),
  `address` TEXT,
  `city` VARCHAR(100),
  `country` VARCHAR(100) DEFAULT 'Tanzania',
  `payment_terms` VARCHAR(100) DEFAULT 'net_30',
  `credit_limit` DECIMAL(15,2) DEFAULT 0.00,
  `current_balance` DECIMAL(15,2) DEFAULT 0.00,
  `is_active` BOOLEAN DEFAULT TRUE,
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tax_id` VARCHAR(50),
  `website` VARCHAR(255),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lats_suppliers_email_unique` (`email`),
  KEY `idx_lats_suppliers_phone` (`phone`),
  KEY `idx_lats_suppliers_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: products
-- ============================================
DROP TABLE IF EXISTS `products`;

CREATE TABLE `products` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `sku` VARCHAR(100),
  `barcode` VARCHAR(100),
  `category_id` CHAR(36),
  `brand_id` CHAR(36),
  `cost_price` DECIMAL(15,2) DEFAULT 0.00,
  `selling_price` DECIMAL(15,2) DEFAULT 0.00,
  `wholesale_price` DECIMAL(15,2) DEFAULT 0.00,
  `min_stock_level` INT DEFAULT 0,
  `max_stock_level` INT,
  `current_stock` INT DEFAULT 0,
  `unit` VARCHAR(50) DEFAULT 'piece',
  `is_active` BOOLEAN DEFAULT TRUE,
  `is_service` BOOLEAN DEFAULT FALSE,
  `weight` DECIMAL(10,3),
  `dimensions` VARCHAR(100),
  `tax_rate` DECIMAL(5,2) DEFAULT 0.00,
  `supplier_id` CHAR(36),
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `images` JSON,
  `attributes` JSON,
  `variants` JSON,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_sku_unique` (`sku`),
  UNIQUE KEY `products_barcode_unique` (`barcode`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_brand` (`brand_id`),
  KEY `idx_products_active` (`is_active`),
  KEY `idx_products_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: sales
-- ============================================
DROP TABLE IF EXISTS `sales`;

CREATE TABLE `sales` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `sale_number` VARCHAR(50) NOT NULL,
  `customer_id` CHAR(36),
  `customer_name` VARCHAR(255),
  `customer_phone` VARCHAR(20),
  `customer_email` VARCHAR(255),
  `sale_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `total_amount` DECIMAL(15,2) NOT NULL,
  `discount_amount` DECIMAL(15,2) DEFAULT 0.00,
  `tax_amount` DECIMAL(15,2) DEFAULT 0.00,
  `grand_total` DECIMAL(15,2) NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'cash',
  `payment_status` VARCHAR(50) DEFAULT 'paid',
  `status` VARCHAR(50) DEFAULT 'completed',
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `transaction_id` VARCHAR(255),
  `receipt_number` VARCHAR(100),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_sale_number_unique` (`sale_number`),
  KEY `idx_sales_customer` (`customer_id`),
  KEY `idx_sales_date` (`sale_date`),
  KEY `idx_sales_status` (`status`),
  KEY `idx_sales_payment_status` (`payment_status`),
  KEY `idx_sales_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: sale_inventory_items
-- ============================================
DROP TABLE IF EXISTS `sale_inventory_items`;

CREATE TABLE `sale_inventory_items` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `sale_id` CHAR(36) NOT NULL,
  `inventory_item_id` CHAR(36) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `total_amount` DECIMAL(15,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sale_inventory_items_sale` (`sale_id`),
  KEY `idx_sale_inventory_items_inventory` (`inventory_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: customers
-- ============================================
DROP TABLE IF EXISTS `customers`;

CREATE TABLE `customers` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100),
  `email` VARCHAR(255),
  `phone` VARCHAR(20),
  `phone2` VARCHAR(20),
  `address` TEXT,
  `city` VARCHAR(100),
  `country` VARCHAR(100) DEFAULT 'Tanzania',
  `date_of_birth` DATE,
  `gender` VARCHAR(10),
  `loyalty_points` INT DEFAULT 0,
  `total_purchases` DECIMAL(15,2) DEFAULT 0.00,
  `last_purchase_date` DATE,
  `is_active` BOOLEAN DEFAULT TRUE,
  `notes` TEXT,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `customer_type` VARCHAR(50) DEFAULT 'individual',
  `company_name` VARCHAR(255),
  `tax_id` VARCHAR(50),
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_email_unique` (`email`),
  KEY `idx_customers_phone` (`phone`),
  KEY `idx_customers_active` (`is_active`),
  KEY `idx_customers_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: users
-- ============================================
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `username` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` TEXT NOT NULL,
  `first_name` VARCHAR(100),
  `last_name` VARCHAR(100),
  `phone` VARCHAR(20),
  `role` VARCHAR(50) DEFAULT 'user',
  `is_active` BOOLEAN DEFAULT TRUE,
  `last_login` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` CHAR(36),
  `permissions` JSON,
  `settings` JSON,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `idx_users_active` (`is_active`),
  KEY `idx_users_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: settings
-- ============================================
DROP TABLE IF EXISTS `settings`;

CREATE TABLE `settings` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `key` VARCHAR(255) NOT NULL,
  `value` TEXT,
  `type` VARCHAR(50) DEFAULT 'string',
  `description` TEXT,
  `category` VARCHAR(100),
  `is_system` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`),
  KEY `idx_settings_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MySQL Table: store_locations
-- ============================================
DROP TABLE IF EXISTS `store_locations`;

CREATE TABLE `store_locations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `address` TEXT,
  `phone` VARCHAR(20),
  `email` VARCHAR(255),
  `manager_id` CHAR(36),
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_by` CHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `location` VARCHAR(255),
  `operating_hours` JSON,
  PRIMARY KEY (`id`),
  UNIQUE KEY `store_locations_code_unique` (`code`),
  KEY `idx_store_locations_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
