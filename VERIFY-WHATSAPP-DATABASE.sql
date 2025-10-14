-- ============================================
-- VERIFY WHATSAPP TABLES IN DATABASE
-- ============================================
-- This script checks all WhatsApp-related tables and their structure

-- Check if whatsapp_instances table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'whatsapp_instances'
        ) 
        THEN '✅ whatsapp_instances table EXISTS'
        ELSE '❌ whatsapp_instances table MISSING'
    END as whatsapp_instances_status;

-- Check if settings column exists in whatsapp_instances
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'whatsapp_instances' 
            AND column_name = 'settings'
        ) 
        THEN '✅ settings column EXISTS in whatsapp_instances'
        ELSE '⚠️  settings column MISSING in whatsapp_instances (needs to be added)'
    END as settings_column_status;

-- Check whatsapp_instances table structure
SELECT 
    '📋 whatsapp_instances columns:' as section,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'whatsapp_instances'
ORDER BY ordinal_position;

-- Count existing instances
SELECT 
    '📊 Total WhatsApp instances:' as section,
    COUNT(*) as total_instances,
    COUNT(*) FILTER (WHERE status = 'connected') as connected_instances,
    COUNT(*) FILTER (WHERE status = 'disconnected') as disconnected_instances,
    COUNT(*) FILTER (WHERE state_instance = 'authorized') as authorized_instances
FROM whatsapp_instances;

-- Check for other WhatsApp tables
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'whatsapp_message_templates'
        ) 
        THEN '✅ whatsapp_message_templates table EXISTS'
        ELSE '⚠️  whatsapp_message_templates table MISSING'
    END as message_templates_status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'whatsapp_templates'
        ) 
        THEN '✅ whatsapp_templates table EXISTS'
        ELSE '⚠️  whatsapp_templates table MISSING'
    END as templates_status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'green_api_message_queue'
        ) 
        THEN '✅ green_api_message_queue table EXISTS'
        ELSE '⚠️  green_api_message_queue table MISSING'
    END as message_queue_status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'green_api_bulk_campaigns'
        ) 
        THEN '✅ green_api_bulk_campaigns table EXISTS'
        ELSE '⚠️  green_api_bulk_campaigns table MISSING'
    END as bulk_campaigns_status;

-- Show sample data if any exists
SELECT 
    '📱 Sample WhatsApp Instances:' as section,
    id,
    instance_id,
    instance_name,
    status,
    state_instance,
    phone_number,
    is_active,
    created_at
FROM whatsapp_instances
LIMIT 5;

-- Final Summary
SELECT '
====================================
🎉 WHATSAPP DATABASE STATUS SUMMARY
====================================

To fix any missing components:
1. If whatsapp_instances is missing: Run fix-whatsapp-tables.sql
2. If settings column is missing: Run ADD-WHATSAPP-SETTINGS-COLUMN.sql
3. To add test data: Run import-whatsapp-data.mjs

====================================
' as summary;

