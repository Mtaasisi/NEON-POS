-- ============================================================================
-- FIX: ensure_branch_id_generic() Function
-- ============================================================================
-- This fixes the error: "record 'new' has no field 'purchase_order_id'"
-- The issue occurs when the generic trigger function tries to access columns
-- that don't exist on certain tables (like lats_product_variants).
-- ============================================================================
-- SOLUTION: Use exception handling to gracefully handle missing columns
-- instead of throwing errors. PostgreSQL validates column names at parse time,
-- so we need to wrap each column access in a BEGIN/EXCEPTION block.
-- ============================================================================

-- Drop and recreate the function with safe column access
DROP FUNCTION IF EXISTS ensure_branch_id_generic() CASCADE;

CREATE OR REPLACE FUNCTION ensure_branch_id_generic()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
  related_branch_id UUID;
  table_name TEXT;
  new_json JSONB;
  purchase_order_id_val UUID;
  sale_id_val UUID;
  sales_id_val UUID;
BEGIN
  table_name := TG_TABLE_NAME;
  
  -- If branch_id is already set, use it
  IF NEW.branch_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Convert NEW record to JSONB for safe column access
  -- This allows us to check for columns that may not exist
  new_json := row_to_json(NEW)::jsonb;
  
  -- Try to infer branch_id from related records based on table name
  -- This is a smart inference system
  -- We use JSONB access to safely check columns that may not exist
  
  -- For tables with purchase_order_id
  BEGIN
    IF table_name LIKE '%purchase_order%' AND new_json ? 'purchase_order_id' THEN
      purchase_order_id_val := (new_json->>'purchase_order_id')::UUID;
      IF purchase_order_id_val IS NOT NULL THEN
        SELECT branch_id INTO related_branch_id
        FROM lats_purchase_orders
        WHERE id = purchase_order_id_val;
        
        IF related_branch_id IS NOT NULL THEN
          NEW.branch_id := related_branch_id;
          RETURN NEW;
        END IF;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Skip this check on error
    NULL;
  END;
  
  -- For tables with sale_id or sales_id
  BEGIN
    IF new_json ? 'sale_id' THEN
      sale_id_val := (new_json->>'sale_id')::UUID;
    END IF;
    IF new_json ? 'sales_id' THEN
      sales_id_val := (new_json->>'sales_id')::UUID;
    END IF;
    IF sale_id_val IS NOT NULL OR sales_id_val IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM lats_sales
      WHERE id = COALESCE(sale_id_val, sales_id_val);
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with customer_id
  BEGIN
    IF new_json ? 'customer_id' AND (new_json->>'customer_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM customers
      WHERE id = (new_json->>'customer_id')::UUID
      LIMIT 1;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with user_id - try to get from user_branch_assignments
  BEGIN
    IF new_json ? 'user_id' AND (new_json->>'user_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM user_branch_assignments
      WHERE user_id = (new_json->>'user_id')::UUID
      ORDER BY created_at DESC
      LIMIT 1;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with product_id
  BEGIN
    IF new_json ? 'product_id' AND (new_json->>'product_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM lats_products
      WHERE id = (new_json->>'product_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with variant_id
  BEGIN
    IF new_json ? 'variant_id' AND (new_json->>'variant_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM lats_product_variants
      WHERE id = (new_json->>'variant_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with supplier_id
  BEGIN
    IF new_json ? 'supplier_id' AND (new_json->>'supplier_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM lats_suppliers
      WHERE id = (new_json->>'supplier_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with device_id
  BEGIN
    IF new_json ? 'device_id' AND (new_json->>'device_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM devices
      WHERE id = (new_json->>'device_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with employee_id
  BEGIN
    IF new_json ? 'employee_id' AND (new_json->>'employee_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM employees
      WHERE id = (new_json->>'employee_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with account_id
  BEGIN
    IF new_json ? 'account_id' AND (new_json->>'account_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM finance_accounts
      WHERE id = (new_json->>'account_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with campaign_id
  BEGIN
    IF new_json ? 'campaign_id' AND (new_json->>'campaign_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM whatsapp_campaigns
      WHERE id = (new_json->>'campaign_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with session_id
  BEGIN
    IF new_json ? 'session_id' AND (new_json->>'session_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM whatsapp_sessions
      WHERE id = (new_json->>'session_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with scheduled_transfer_id
  BEGIN
    IF new_json ? 'scheduled_transfer_id' AND (new_json->>'scheduled_transfer_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM scheduled_transfers
      WHERE id = (new_json->>'scheduled_transfer_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with scheduled_message_id
  BEGIN
    IF new_json ? 'scheduled_message_id' AND (new_json->>'scheduled_message_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM scheduled_bulk_messages
      WHERE id = (new_json->>'scheduled_message_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with quality_check_id
  BEGIN
    IF new_json ? 'quality_check_id' AND (new_json->>'quality_check_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM purchase_order_quality_checks
      WHERE id = (new_json->>'quality_check_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with special_order_id
  BEGIN
    IF new_json ? 'special_order_id' AND (new_json->>'special_order_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM customer_special_orders
      WHERE id = (new_json->>'special_order_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- For tables with installment_plan_id
  BEGIN
    IF new_json ? 'installment_plan_id' AND (new_json->>'installment_plan_id')::UUID IS NOT NULL THEN
      SELECT branch_id INTO related_branch_id
      FROM customer_installment_plans
      WHERE id = (new_json->>'installment_plan_id')::UUID;
      
      IF related_branch_id IS NOT NULL THEN
        NEW.branch_id := related_branch_id;
        RETURN NEW;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
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

-- Add comment
COMMENT ON FUNCTION ensure_branch_id_generic() IS 
'Generic trigger function to automatically assign branch_id to new records. 
Safely handles tables that may not have all referenced columns by using 
JSONB conversion and exception handling to gracefully skip missing columns.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ FIXED: ensure_branch_id_generic() Function';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'The function now safely checks for column existence';
  RAISE NOTICE 'before accessing them, preventing errors when columns';
  RAISE NOTICE 'like purchase_order_id don''t exist on certain tables.';
  RAISE NOTICE '';
  RAISE NOTICE 'This fixes the error:';
  RAISE NOTICE '  "record ''new'' has no field ''purchase_order_id''"';
  RAISE NOTICE '';
END $$;
