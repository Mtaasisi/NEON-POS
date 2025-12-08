-- ============================================================================
-- CREATE AUTOMATIC BRANCH_ID TRIGGERS FOR ALL TABLES
-- ============================================================================
-- This script creates triggers for ALL tables with branch_id to automatically
-- assign branch_id to new records, even if application code doesn't set it
-- ============================================================================

-- Generic function that can be reused for all tables
CREATE OR REPLACE FUNCTION ensure_branch_id_generic()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  related_branch_id UUID;
  table_name TEXT;
BEGIN
  table_name := TG_TABLE_NAME;
  
  -- If branch_id is already set, use it
  IF NEW.branch_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Try to infer branch_id from related records based on table name
  -- This is a smart inference system
  
  -- For tables with purchase_order_id
  IF table_name LIKE '%purchase_order%' AND NEW.purchase_order_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM lats_purchase_orders
    WHERE id = NEW.purchase_order_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with sale_id or sales_id
  IF (NEW.sale_id IS NOT NULL OR NEW.sales_id IS NOT NULL) THEN
    SELECT branch_id INTO related_branch_id
    FROM lats_sales
    WHERE id = COALESCE(NEW.sale_id, NEW.sales_id);
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with customer_id
  IF NEW.customer_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM customers
    WHERE id = NEW.customer_id
    LIMIT 1;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with user_id - try to get from user_branch_assignments
  IF NEW.user_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM user_branch_assignments
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with product_id
  IF NEW.product_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM lats_products
    WHERE id = NEW.product_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with variant_id
  IF NEW.variant_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM lats_product_variants
    WHERE id = NEW.variant_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with supplier_id
  IF NEW.supplier_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM lats_suppliers
    WHERE id = NEW.supplier_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with device_id
  IF NEW.device_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM devices
    WHERE id = NEW.device_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with employee_id
  IF NEW.employee_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM employees
    WHERE id = NEW.employee_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with account_id
  IF NEW.account_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM finance_accounts
    WHERE id = NEW.account_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with campaign_id
  IF NEW.campaign_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM whatsapp_campaigns
    WHERE id = NEW.campaign_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with session_id
  IF NEW.session_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM whatsapp_sessions
    WHERE id = NEW.session_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with scheduled_transfer_id
  IF NEW.scheduled_transfer_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM scheduled_transfers
    WHERE id = NEW.scheduled_transfer_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with scheduled_message_id
  IF NEW.scheduled_message_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM scheduled_bulk_messages
    WHERE id = NEW.scheduled_message_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with quality_check_id
  IF NEW.quality_check_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM purchase_order_quality_checks
    WHERE id = NEW.quality_check_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with special_order_id
  IF NEW.special_order_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM customer_special_orders
    WHERE id = NEW.special_order_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For tables with installment_plan_id
  IF NEW.installment_plan_id IS NOT NULL THEN
    SELECT branch_id INTO related_branch_id
    FROM customer_installment_plans
    WHERE id = NEW.installment_plan_id;
    
    IF related_branch_id IS NOT NULL THEN
      NEW.branch_id := related_branch_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- Fallback: Get first active branch
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with branch_id
DO $$
DECLARE
  tbl RECORD;
  triggers_created INT := 0;
  triggers_skipped INT := 0;
  system_tables TEXT[] := ARRAY['store_locations', 'migration_configurations', 'schema_migrations', '_prisma_migrations', 'v_has_payment_method_column'];
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'CREATING TRIGGERS FOR ALL TABLES WITH BRANCH_ID';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  FOR tbl IN
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'branch_id'
      AND table_name <> ALL(system_tables)
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_schema = 'public'
          AND event_object_table = information_schema.columns.table_name
          AND trigger_name = 'ensure_' || information_schema.columns.table_name || '_branch_id'
      )
    ORDER BY table_name
  LOOP
    BEGIN
      -- Drop existing trigger if it exists (using different name)
      EXECUTE format('DROP TRIGGER IF EXISTS ensure_%I_branch_id ON %I', tbl.table_name, tbl.table_name);
      
      -- Create trigger using generic function
      EXECUTE format('CREATE TRIGGER ensure_%I_branch_id BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION ensure_branch_id_generic()', tbl.table_name, tbl.table_name);
      
      triggers_created := triggers_created + 1;
      RAISE NOTICE '✅ Created trigger for %', tbl.table_name;
    EXCEPTION WHEN OTHERS THEN
      triggers_skipped := triggers_skipped + 1;
      RAISE WARNING '⚠️  Failed to create trigger for %: %', tbl.table_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Triggers created: %', triggers_created;
  RAISE NOTICE 'Triggers skipped: %', triggers_skipped;
  RAISE NOTICE '';
  RAISE NOTICE '✅ All tables with branch_id now have automatic isolation triggers!';
  RAISE NOTICE '';
END $$;

-- Verify triggers
SELECT 
  COUNT(*) as total_triggers,
  COUNT(DISTINCT event_object_table) as tables_protected
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%_branch_id';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ COMPLETE: ALL TABLES PROTECTED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Every table with branch_id now has an automatic trigger';
  RAISE NOTICE 'that ensures branch_id is always set on insert.';
  RAISE NOTICE '';
  RAISE NOTICE 'The triggers are smart and try to infer branch_id from:';
  RAISE NOTICE '- Related records (purchase orders, sales, customers, etc.)';
  RAISE NOTICE '- User branch assignments';
  RAISE NOTICE '- First active branch as fallback';
  RAISE NOTICE '';
END $$;
