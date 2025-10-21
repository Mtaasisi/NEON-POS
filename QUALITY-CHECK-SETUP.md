# Quality Check System Setup Guide

## Overview

The Quality Check System has been updated with a comprehensive database schema. This guide will help you set up the system.

## What Was Fixed

The error you encountered:
```
relation "purchase_order_quality_check_items" does not exist
```

This occurred because the database tables for the quality check system were not created yet.

## Database Schema

The quality check system uses 4 main tables:

1. **quality_check_templates** - Reusable quality check templates (e.g., "General Check", "Electronics Check")
2. **quality_check_criteria** - Individual check criteria for each template
3. **purchase_order_quality_checks** - Main quality check records
4. **purchase_order_quality_check_items** - Individual check results for each item

## Setup Instructions

### Step 1: Run the Migration

```bash
node run-quality-check-migration.js
```

This will:
- Create all necessary tables
- Create database functions
- Add 2 default templates (General and Electronics)
- Add criteria for each template
- Set up proper indexes and permissions

### Step 2: Verify Setup

After running the migration, you should see:
- ✓ 4 tables created
- ✓ 2 templates available
- ✓ 10 criteria items
- ✓ 5 database functions

### Step 3: Test the Feature

1. Go to a Purchase Order detail page
2. Click "Quality Check" button
3. Select a template
4. Start the quality check
5. Inspect items and mark as pass/fail
6. Complete the check
7. Add items to inventory

## Default Templates

### 1. General Quality Check
- Physical Condition
- Completeness
- Packaging
- Documentation

### 2. Electronics Quality Check
- Physical Condition
- Power Test
- Functionality Test
- Accessories
- Serial Numbers
- Warranty Documentation

## Database Functions

### create_quality_check_from_template(purchase_order_id, template_id, checked_by)
Creates a new quality check from a template, automatically creating check items for all PO items.

### complete_quality_check(quality_check_id, notes, signature)
Completes a quality check and calculates the overall result (pass/fail/conditional).

### get_quality_check_summary(purchase_order_id)
Gets summary statistics for a quality check.

### receive_quality_checked_items(quality_check_id, purchase_order_id)
Receives quality-checked items to inventory.

### add_quality_items_to_inventory_v2(...)
Adds quality items to inventory with automatic pricing based on profit margin.

## Troubleshooting

### Error: DATABASE_URL not set
Make sure your `.env` file contains the DATABASE_URL variable.

### Error: Permission denied
Ensure your database user has permissions to create tables and functions.

### Error: Template not found
After migration, check that templates were created:
```sql
SELECT * FROM quality_check_templates;
```

### Items not loading
Check that the quality check was created properly:
```sql
SELECT * FROM purchase_order_quality_checks 
WHERE purchase_order_id = 'your-po-id';
```

## Creating Custom Templates

You can create custom quality check templates in the database:

```sql
-- Create template
INSERT INTO quality_check_templates (id, name, description, category, is_active)
VALUES ('my-template', 'My Custom Template', 'Description', 'general', true);

-- Add criteria
INSERT INTO quality_check_criteria (template_id, name, description, is_required, sort_order)
VALUES 
  ('my-template', 'Check 1', 'First check', true, 1),
  ('my-template', 'Check 2', 'Second check', false, 2);
```

## Next Steps

After setup is complete:
1. Test the quality check workflow
2. Customize templates as needed
3. Train users on the new process
4. Monitor quality check data for insights

## Support

If you encounter issues:
1. Check the migration output for errors
2. Verify all tables were created
3. Check database permissions
4. Review application logs for errors

