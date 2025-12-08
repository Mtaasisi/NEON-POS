    INSERT INTO lats_purchase_order_audit_log (
      id,
      purchase_order_id,
      action,
      user_id,
      notes,
      created_at
    ) VALUES (
      v_audit_id,
      p_purchase_order_id,
      p_action,
      v_user_uuid,
      p_details,
      NOW()
    );

  RETURN v_audit_id;

EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the operation
  RAISE WARNING 'Error logging audit entry: %', SQLERRM;
  RETURN NULL;



--
-- TOC entry 471 (class 1255 OID 1204389)
-- Name: log_purchase_order_audit(CHAR(36), text, text, CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_audit_id CHAR(36);
  -- Insert the audit entry
  INSERT INTO purchase_order_audit (
    purchase_order_id,
    action,
    user_id,
    created_by,
    details,
    DATETIME,
    created_at
  ) VALUES (
    p_purchase_order_id,
    p_action,
    p_user_id,
    p_user_id,
    p_details,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_audit_id;
  
  -- Return the ID of the created audit entry
  RETURN v_audit_id;



--
-- TOC entry 584 (class 1255 OID 1204390)
-- Name: mark_imei_as_sold(CHAR(36), CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_variant_id CHAR(36);
  v_parent_id CHAR(36);
  -- Find the variant by ID
  SELECT id, parent_variant_id INTO v_variant_id, v_parent_id
  FROM lats_product_variants
  WHERE id = child_variant_id_param
    AND variant_type = 'imei_child'
    AND is_active = TRUE
    AND quantity > 0
  LIMIT 1;

  IF v_variant_id IS NULL THEN
    -- Try to find if it exists but is already sold or inactive
    SELECT id INTO v_variant_id
    FROM lats_product_variants
    WHERE id = child_variant_id_param
      AND variant_type = 'imei_child'
    LIMIT 1;
    
    IF v_variant_id IS NULL THEN
      RAISE EXCEPTION 'IMEI child variant % not found', child_variant_id_param;
    ELSE
      RAISE EXCEPTION 'IMEI child variant % is already sold or inactive', child_variant_id_param;
    END IF;
  END IF;

  -- Mark as sold and set quantity to 0
  UPDATE lats_product_variants
  SET 
    quantity = 0,
    is_active = FALSE,
    variant_attributes = jsonb_set(
      jsonb_set(
        COALESCE(variant_attributes, '{}'::JSON),
        '{sold_at}',
        to_jsonb(NOW())
      ),
      '{sale_id}',
      CASE 
        WHEN sale_id_param IS NOT NULL THEN to_jsonb(sale_id_param::TEXT)
        ELSE 'null'::JSON
    ),
    updated_at = NOW()
  WHERE id = v_variant_id;

  -- Create stock movement
  INSERT INTO lats_stock_movements (
    product_id,
    variant_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    created_at
  )
    product_id,
    v_variant_id,
    'sale',
    -1,
    'pos_sale',
    sale_id_param,
    'IMEI child variant ' || v_variant_id || ' sold' || COALESCE(' - Sale: ' || sale_id_param::TEXT, ''),
    NOW()
  FROM lats_product_variants
  WHERE id = v_variant_id;

  -- Parent stock will be updated automatically by trigger
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error marking IMEI as sold: %', SQLERRM;
    RAISE;



--
-- TOC entry 567 (class 1255 OID 1204391)
-- Name: mark_po_as_received(CHAR(36), CHAR(36), text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Update purchase order status
  UPDATE lats_purchase_orders
  SET 
    status = 'received',
    received_date = NOW(),
    notes = COALESCE(notes || E'\n\n', '') || COALESCE('Received: ' || received_notes, '')
  WHERE id = purchase_order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Purchase order marked as received'
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error marking as received: %', SQLERRM;



--
-- TOC entry 635 (class 1255 OID 1204392)
-- Name: merge_po_items_with_existing_variants(CHAR(36), integer, numeric, numeric); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_existing_variant RECORD;
  v_result JSON;
  -- Check if product has existing quantity-based variants (not IMEI variants)
  SELECT * INTO v_existing_variant
  FROM lats_product_variants
  WHERE product_id = product_id_param
    AND is_active = true
    AND variant_attributes->>'imei' IS NULL  -- Not an IMEI variant
    AND quantity > 0
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_existing_variant IS NOT NULL THEN
    -- Merge with existing variant
    UPDATE lats_product_variants
    SET 
      quantity = quantity + quantity_param,
      cost_price = COALESCE(cost_price_param, cost_price),
      selling_price = COALESCE(selling_price_param, selling_price),
      updated_at = NOW()
    WHERE id = v_existing_variant.id;
    
    -- Update product stock
    UPDATE lats_products
    SET 
      stock_quantity = (
        SELECT SUM(quantity)
        FROM lats_product_variants
        WHERE product_id = product_id_param AND is_active = true
      ),
      updated_at = NOW()
    WHERE id = product_id_param;
    
    v_result := jsonb_build_object(
      'success', true,
      'merged', true,
      'variant_id', v_existing_variant.id,
      'new_quantity', v_existing_variant.quantity + quantity_param
    );
  ELSE
    -- No existing variants to merge with
    v_result := jsonb_build_object(
      'success', true,
      'merged', false,
      'message', 'No existing variants to merge with'
    );
  END IF;
  
  RETURN v_result;



--
-- TOC entry 593 (class 1255 OID 1204393)
-- Name: move_products_to_inventory(CHAR(36), CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_products_moved INTEGER := 0;
    v_cargo_item RECORD;
    -- Check if shipment is ready
    IF NOT EXISTS (
        SELECT 1 FROM check_shipment_ready_for_inventory(p_shipping_id)
        WHERE is_ready = TRUE
    ) THEN
        RETURN QUERY SELECT FALSE, 0, 'Shipment is not ready - not all products are validated'::TEXT;
        RETURN;
    END IF;
    
    -- Move validated products to inventory
    FOR v_cargo_item IN 
            sci.product_id,
            sci.quantity,
            COALESCE(pv.updated_cost_price, sci.cost_price) as cost_price
        FROM lats_shipping_cargo_items sci
        INNER JOIN lats_product_validation pv ON pv.product_id = sci.product_id 
            AND pv.shipping_id = sci.shipping_id
        WHERE sci.shipping_id = p_shipping_id
        AND pv.is_validated = TRUE
    LOOP
        -- Update product stock
        UPDATE lats_products
        SET 
            stock_quantity = COALESCE(stock_quantity, 0) + v_cargo_item.quantity,
            cost_price = v_cargo_item.cost_price,
            updated_at = NOW()
        WHERE id = v_cargo_item.product_id;
        
        v_products_moved := v_products_moved + 1;
    END LOOP;
    
    -- Update shipping status
    UPDATE lats_shipping
    SET 
        status = 'received',
        actual_arrival_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_shipping_id;
    
    RETURN QUERY SELECT TRUE, v_products_moved, NULL::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 0, SQLERRM;



--
-- TOC entry 542 (class 1255 OID 1204394)
-- Name: partial_purchase_order_receive(CHAR(36), JSON, CHAR(36), text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_order_record RECORD;
  v_item_record RECORD;
  v_received_item JSON;
  v_items_created INTEGER := 0;
  v_quantity INTEGER;
  v_i INTEGER;
  v_total_received INTEGER := 0;
  v_total_ordered INTEGER := 0;
  v_all_received TINYINT(1);
  v_new_status VARCHAR;
  v_result JSON;
  v_current_quantity INTEGER;
  -- Check if purchase order exists
  SELECT * INTO v_order_record
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found',
      'error_code', 'PO_NOT_FOUND'
    );
  END IF;

  -- Begin transaction
    -- Process each received item
    FOR v_received_item IN SELECT * FROM jsonb_array_elements(received_items)
    LOOP
      -- Get the PO item details
        poi.id as item_id,
        poi.product_id,
        poi.variant_id,
        poi.quantity_ordered,
        COALESCE(poi.quantity_received, 0) as quantity_received,
        poi.unit_cost,
        p.name as product_name,
        pv.name as variant_name,
        COALESCE(pv.selling_price, pv.unit_price, 0) as selling_price,
        COALESCE(pv.quantity, 0) as current_variant_quantity
      INTO v_item_record
      FROM lats_purchase_order_items poi
      LEFT JOIN lats_products p ON p.id = poi.product_id
      LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
      WHERE poi.id = (v_received_item->>'item_id')::CHAR(36)
        AND poi.purchase_order_id = purchase_order_id_param;

      IF NOT FOUND THEN
        RAISE WARNING 'PO item not found: %', v_received_item->>'item_id';
        CONTINUE;
      END IF;

      -- Get quantity to receive for this item
      v_quantity := (v_received_item->>'quantity')::INTEGER;

      IF v_quantity > 0 THEN
        -- Validate quantity doesn't exceed ordered amount
        IF (v_item_record.quantity_received + v_quantity) > v_item_record.quantity_ordered THEN
          RETURN json_build_object(
            'success', false,
            'message', format('Cannot receive %s units for item %s. Already received: %s, Ordered: %s, Remaining: %s', 
              v_quantity, 
              v_item_record.item_id,
              v_item_record.quantity_received,
              v_item_record.quantity_ordered,
              v_item_record.quantity_ordered - v_item_record.quantity_received
            ),
            'error_code', 'QUANTITY_EXCEEDED',
            'item_id', v_item_record.item_id::text,
            'requested_quantity', v_quantity,
            'already_received', v_item_record.quantity_received,
            'ordered_quantity', v_item_record.quantity_ordered,
            'remaining_quantity', v_item_record.quantity_ordered - v_item_record.quantity_received
          );
        END IF;
        
        -- Validate quantity is positive
        IF v_quantity <= 0 THEN
          RETURN json_build_object(
            'success', false,
            'message', format('Received quantity must be greater than 0 for item %s', v_item_record.item_id),
            'error_code', 'INVALID_QUANTITY',
            'item_id', v_item_record.item_id::text
          );
        END IF;

        -- Get current variant quantity
        IF v_item_record.variant_id IS NOT NULL THEN
          SELECT COALESCE(quantity, 0) INTO v_current_quantity
          FROM lats_product_variants
          WHERE id = v_item_record.variant_id;
        END IF;

        -- Create inventory items with status='available'
        -- The trigger will automatically update variant.quantity
        FOR v_i IN 1..v_quantity LOOP
          INSERT INTO inventory_items (
            purchase_order_id,
            purchase_order_item_id,
            product_id,
            variant_id,
            status,
            cost_price,
            selling_price,
            notes,
            metadata,
            purchase_date,
            created_at,
            updated_at
          ) VALUES (
            purchase_order_id_param,
            v_item_record.item_id,
            v_item_record.product_id,
            v_item_record.variant_id,
            'available',  -- ⭐ KEY: Status must be 'available' for trigger to count it
            COALESCE(v_item_record.unit_cost, 0),
            COALESCE(v_item_record.selling_price, 0),
            format(
              'Partial receive from PO %s - %s %s (Item %s of %s)%s',
              v_order_record.order_number,
              v_item_record.product_name,
              COALESCE(' - ' || v_item_record.variant_name, ''),
              v_i,
              v_quantity,
              CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
            ),
            jsonb_build_object(
              'purchase_order_id', purchase_order_id_param::text,
              'purchase_order_item_id', v_item_record.item_id::text,
              'order_number', v_order_record.order_number,
              'supplier_id', v_order_record.supplier_id::text,
              'batch_number', v_i,
              'received_by', user_id_param::text,
              'received_at', NOW(),
              'partial_receive', true
            ),
            NOW(),
            NOW(),
            NOW()
          );

          v_items_created := v_items_created + 1;
        END LOOP;

        -- Create stock movement record
        IF v_item_record.variant_id IS NOT NULL THEN
          INSERT INTO lats_stock_movements (
            product_id,
            variant_id,
            movement_type,
            quantity,
            previous_quantity,
            new_quantity,
            reason,
            reference,
            notes,
            created_by,
            created_at
          ) VALUES (
            v_item_record.product_id,
            v_item_record.variant_id,
            'in',
            v_quantity,
            v_current_quantity,
            v_current_quantity + v_quantity,
            'Purchase Order Receipt (Partial)',
            format('PO-%s', v_order_record.order_number),
            format('Partial receive: %s units from PO %s%s', 
              v_quantity, 
              v_order_record.order_number,
              CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
            ),
            user_id_param,
            NOW()
          );
        END IF;

        -- Update the purchase order item with received quantity (increment)
        UPDATE lats_purchase_order_items
        SET 
          quantity_received = COALESCE(quantity_received, 0) + v_quantity,
          updated_at = NOW()
        WHERE id = v_item_record.item_id;
      END IF;
    END LOOP;

    -- Check if all items are fully received
    SELECT NOT EXISTS (
      SELECT 1 
      FROM lats_purchase_order_items 
      WHERE purchase_order_id = purchase_order_id_param 
      AND COALESCE(quantity_received, 0) < quantity_ordered
    ) INTO v_all_received;

    -- Calculate totals
      COALESCE(SUM(quantity_received), 0),
      COALESCE(SUM(quantity_ordered), 0)
    INTO v_total_received, v_total_ordered
    FROM lats_purchase_order_items
    WHERE purchase_order_id = purchase_order_id_param;

    -- Set appropriate status
    IF v_all_received THEN
      v_new_status := 'received';
    ELSE
      v_new_status := 'partial_received';
    END IF;

    -- Update purchase order status
    UPDATE lats_purchase_orders
    SET 
      status = v_new_status,
      received_date = CASE WHEN v_all_received THEN NOW() ELSE received_date END,
      updated_at = NOW()
    WHERE id = purchase_order_id_param;

    -- Create audit log entry
    INSERT INTO lats_purchase_order_audit_log (
      purchase_order_id,
      action,
      old_status,
      new_status,
      user_id,
      notes,
      created_at
    ) VALUES (
      purchase_order_id_param,
      CASE WHEN v_all_received THEN 'receive_complete' ELSE 'receive_partial' END,
      v_order_record.status,
      v_new_status,
      user_id_param,
      format('%s: Created %s inventory items (%s/%s received)%s', 
        CASE WHEN v_all_received THEN 'Complete receive' ELSE 'Partial receive' END,
        v_items_created,
        v_total_received,
        v_total_ordered,
        CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
      ),
      NOW()
    );

    -- Build success response
    v_result := json_build_object(
      'success', true,
      'message', format('Successfully received %s items (stock updated by trigger)', v_items_created),
      'data', json_build_object(
        'purchase_order_id', purchase_order_id_param,
        'order_number', v_order_record.order_number,
        'items_created', v_items_created,
        'total_received', v_total_received,
        'total_ordered', v_total_ordered,
        'is_complete', v_all_received,
        'new_status', v_new_status,
        'received_date', NOW(),
        'received_by', user_id_param
      )
    );

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error in partial_purchase_order_receive: %', SQLERRM;
      RETURN json_build_object(
        'success', false,
        'message', format('Error receiving purchase order: %s', SQLERRM),
        'error_code', 'RECEIVE_ERROR'
      );



--
-- TOC entry 7788 (class 0 OID 0)
-- Dependencies: 542
-- Name: FUNCTION partial_purchase_order_receive(purchase_order_id_param CHAR(36), received_items JSON, user_id_param CHAR(36), receive_notes text); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 558 (class 1255 OID 1204396)
-- Name: prevent_manual_balance_updates(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Only allow balance updates if they're coming from the transaction trigger
  -- or if explicitly allowed (for initial setup/migrations)
  IF NOT (TG_OP = 'UPDATE' AND OLD.balance IS NOT DISTINCT FROM NEW.balance) THEN
    -- Check if this is a legitimate update (not bypassing transaction tracking)
    -- For now, just log the update
    RAISE NOTICE 'Manual balance update detected for account %: % -> %', 
      COALESCE(OLD.id, NEW.id), OLD.balance, NEW.balance;
  END IF;
  
  RETURN NEW;



--
-- TOC entry 573 (class 1255 OID 1204397)
-- Name: process_due_recurring_expenses(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  recurring_exp RECORD;
  transaction_id CHAR(36);
  v_processed_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  -- Loop through all active recurring expenses that are due today or overdue
  FOR recurring_exp IN 
    SELECT * FROM recurring_expenses
    WHERE is_active = true
      AND next_due_date <= CURRENT_DATE
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ORDER BY next_due_date
  LOOP
      -- Check if auto_process is enabled
      IF recurring_exp.auto_process THEN
        -- Create the expense transaction
        INSERT INTO account_transactions (
          account_id,
          transaction_type,
          amount,
          description,
          reference_number,
          metadata,
          created_at
        ) VALUES (
          recurring_exp.account_id,
          'expense',
          recurring_exp.amount,
          recurring_exp.name || ': ' || COALESCE(recurring_exp.description, ''),
          COALESCE(recurring_exp.reference_prefix, 'AUTO') || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD'),
          jsonb_build_object(
            'category', recurring_exp.category,
            'vendor_name', recurring_exp.vendor_name,
            'expense_date', CURRENT_DATE,
            'created_via', 'auto_recurring',
            'recurring_expense_id', recurring_exp.id,
            'frequency', recurring_exp.frequency
          ),
          NOW()
        )
        RETURNING id INTO transaction_id;

        -- Record in history
        INSERT INTO recurring_expense_history (
          recurring_expense_id,
          transaction_id,
          processed_date,
          amount,
          status
        ) VALUES (
          recurring_exp.id,
          transaction_id,
          CURRENT_DATE,
          recurring_exp.amount,
          'processed'
        );

        v_processed_count := v_processed_count + 1;
      ELSE
        -- Just record as skipped (manual processing required)
        INSERT INTO recurring_expense_history (
          recurring_expense_id,
          transaction_id,
          processed_date,
          amount,
          status
        ) VALUES (
          recurring_exp.id,
          NULL,
          CURRENT_DATE,
          recurring_exp.amount,
          'skipped'
        );

        v_skipped_count := v_skipped_count + 1;
      END IF;

      -- Update next due date
      UPDATE recurring_expenses
      SET 
        next_due_date = calculate_next_due_date(next_due_date, frequency),
        last_processed_date = CURRENT_DATE,
        updated_at = NOW()
      WHERE id = recurring_exp.id;

    EXCEPTION WHEN OTHERS THEN
      -- Log failure
      INSERT INTO recurring_expense_history (
        recurring_expense_id,
        transaction_id,
        processed_date,
        amount,
        status,
        failure_reason
      ) VALUES (
        recurring_exp.id,
        NULL,
        CURRENT_DATE,
        recurring_exp.amount,
        'failed',
        SQLERRM
      );

      v_failed_count := v_failed_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_processed_count, v_failed_count, v_skipped_count;



--
-- TOC entry 673 (class 1255 OID 1204398)
-- Name: process_purchase_order_payment(CHAR(36), CHAR(36), numeric, character varying, character varying, CHAR(36), CHAR(36), text, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    SET search_path TO 'public'
DECLARE
  v_payment_id CHAR(36);
  v_po_total NUMERIC;
  v_po_paid NUMERIC;
  v_new_paid NUMERIC;
  v_payment_status VARCHAR;
  v_account_balance NUMERIC;
  v_branch_id CHAR(36);
  v_result JSON;
  -- Log incoming parameters for debugging
  RAISE NOTICE '📥 Processing payment with parameters:';
  RAISE NOTICE '   PO ID: %', purchase_order_id_param;
  RAISE NOTICE '   Account ID: %', payment_account_id_param;
  RAISE NOTICE '   Amount: %', amount_param;
  RAISE NOTICE '   Currency: %', currency_param;
  RAISE NOTICE '   Payment Method: %', payment_method_param;
  RAISE NOTICE '   Method ID: %', payment_method_id_param;

  -- Validate that currency is NOT a CHAR(36)
  IF currency_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'PARAMETER ERROR: currency_param "' || currency_param || '" is a CHAR(36) but should be a currency code (TZS, USD, etc.)'
    );
  END IF;

  -- Validate that payment_method is NOT a CHAR(36)
  IF payment_method_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'PARAMETER ERROR: payment_method_param "' || payment_method_param || '" is a CHAR(36) but should be a payment method name (Cash, Bank Transfer, etc.)'
    );
  END IF;

  -- Validate required parameters
  IF purchase_order_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Purchase order ID is required');
  END IF;

  IF payment_account_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Payment account ID is required');
  END IF;

  IF amount_param IS NULL OR amount_param <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Payment amount must be greater than 0');
  END IF;

  -- Get current purchase order details and branch_id
  SELECT total_amount, COALESCE(total_paid, 0), branch_id
  INTO v_po_total, v_po_paid, v_branch_id
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found: ' || purchase_order_id_param
    );
  END IF;

  -- If PO doesn't have branch_id, try to get from payment account
  IF v_branch_id IS NULL THEN
    SELECT branch_id INTO v_branch_id
    FROM finance_accounts
    WHERE id = payment_account_id_param;
  END IF;

  -- If still no branch_id, get first active branch as fallback
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at
    LIMIT 1;
  END IF;

  -- Get account balance
  SELECT balance INTO v_account_balance
  FROM finance_accounts
  WHERE id = payment_account_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Payment account not found: ' || payment_account_id_param
    );
  END IF;

  -- Check sufficient balance
  IF v_account_balance < amount_param THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient balance. Available: ' || v_account_balance || ', Required: ' || amount_param
    );
  END IF;

  -- Generate payment ID
  v_payment_id := gen_random_uuid();

  -- Create payment record FIRST
  INSERT INTO purchase_order_payments (
    id,
    purchase_order_id,
    payment_account_id,
    amount,
    currency,
    payment_method,
    payment_method_id,
    reference,
    notes,
    status,
    payment_date,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_payment_id,
    purchase_order_id_param,
    payment_account_id_param,
    amount_param,
    currency_param,
    payment_method_param,
    payment_method_id_param,
    reference_param,
    notes_param,
    'completed',
    NOW(),
    user_id_param,
    NOW(),
    NOW()
  );

  -- ✅ FIX: Recalculate total_paid from ALL completed payments (including the one just inserted)
  -- This prevents race conditions when multiple payments are processed in parallel
  SELECT COALESCE(SUM(amount), 0) INTO v_new_paid
  FROM purchase_order_payments
  WHERE purchase_order_id = purchase_order_id_param
    AND status = 'completed';

  -- Determine payment status based on recalculated total
  IF v_new_paid >= v_po_total THEN
    v_payment_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  -- Update purchase order with recalculated values
  UPDATE lats_purchase_orders
  SET 
    total_paid = v_new_paid,
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = purchase_order_id_param;

  -- Update account balance
  UPDATE finance_accounts
  SET 
    balance = balance - amount_param,
    updated_at = NOW()
  WHERE id = payment_account_id_param;

  -- Create account transaction record WITH branch_id
  INSERT INTO account_transactions (
    account_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    reference_number,
    related_entity_type,
    related_entity_id,
    branch_id,
    created_by,
    created_at
  ) VALUES (
    payment_account_id_param,
    'expense',
    amount_param,
    v_account_balance,
    v_account_balance - amount_param,
    'PO Payment: ' || COALESCE(reference_param, 'Payment #' || SUBSTRING(v_payment_id::TEXT, 1, 8)),
    COALESCE(reference_param, 'PO-PAY-' || SUBSTRING(v_payment_id::TEXT, 1, 8)),
    'purchase_order_payment',
    v_payment_id,
    v_branch_id,
    user_id_param,
    NOW()
  );

  -- Build success result
  v_result := json_build_object(
    'success', true,
    'message', 'Payment processed successfully',
    'data', json_build_object(
      'payment_id', v_payment_id,
      'amount_paid', amount_param,
      'total_paid', v_new_paid,
      'payment_status', v_payment_status,
      'remaining', v_po_total - v_new_paid,
      'branch_id', v_branch_id
    )
  );

  RAISE NOTICE '✅ Payment % processed successfully. Total paid recalculated: %, Status: %', v_payment_id, v_new_paid, v_payment_status;
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'message', 'Database error: ' || SQLERRM,
      'error_code', SQLSTATE
    );
$_$;



--
-- TOC entry 7789 (class 0 OID 0)
-- Dependencies: 673
-- Name: FUNCTION process_purchase_order_payment(purchase_order_id_param CHAR(36), payment_account_id_param CHAR(36), amount_param numeric, currency_param character varying, payment_method_param character varying, payment_method_id_param CHAR(36), user_id_param CHAR(36), reference_param text, notes_param text); Type: COMMENT; Schema: public; Owner: neondb_owner
--


FIXED: Now recalculates total_paid from all completed payments after inserting the new payment,
preventing race conditions when multiple payments are processed in parallel.

CORRECT Parameter Order:
1. purchase_order_id_param: CHAR(36) (required) - The purchase order ID
2. payment_account_id_param: CHAR(36) (required) - The finance account ID
3. amount_param: NUMERIC (required) - Payment amount
4. currency_param: VARCHAR (default ''TZS'') - Currency code (NOT a CHAR(36)!)
5. payment_method_param: VARCHAR (default ''Cash'') - Payment method name (NOT a CHAR(36)!)
6. payment_method_id_param: CHAR(36) (default NULL) - Reference to payment method table
7. user_id_param: CHAR(36) (default system) - User making the payment
8. reference_param: TEXT (default NULL) - Payment reference
9. notes_param: TEXT (default NULL) - Additional notes

Returns: JSON with success status, message, and payment data including branch_id';


--
-- TOC entry 574 (class 1255 OID 1204400)
-- Name: process_purchase_order_payments_batch(json[]); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  payment_record JSON;
  v_payment_id CHAR(36);
  v_po_id CHAR(36);
  v_account_id CHAR(36);
  v_amount DECIMAL;
  v_currency VARCHAR;
  v_payment_method VARCHAR;
  v_payment_method_id CHAR(36);
  v_user_id CHAR(36);
  v_reference TEXT;
  v_notes TEXT;
  v_po_total DECIMAL;
  v_po_paid DECIMAL;
  v_new_paid DECIMAL;
  v_payment_status VARCHAR;
  v_result JSON[];
  v_single_result JSON;
  v_result := ARRAY[]::JSON[];

  -- Process each payment in the batch
  FOREACH payment_record IN ARRAY payment_data LOOP
    -- Extract payment data from JSON
    v_po_id := (payment_record->>'purchase_order_id')::CHAR(36);
    v_account_id := (payment_record->>'payment_account_id')::CHAR(36);
    v_amount := (payment_record->>'amount')::DECIMAL;
    v_currency := COALESCE(payment_record->>'currency', 'TZS');
    v_payment_method := payment_record->>'payment_method';
    v_payment_method_id := (payment_record->>'payment_method_id')::CHAR(36);
    v_user_id := COALESCE((payment_record->>'user_id')::CHAR(36), '00000000-0000-0000-0000-000000000001'::CHAR(36));
    v_reference := payment_record->>'reference';
    v_notes := payment_record->>'notes';

    -- Validate currency is not a CHAR(36)
    IF v_currency ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_single_result := json_build_object(
        'success', false,
        'message', 'Invalid currency parameter: appears to be a CHAR(36) instead of currency code',
        'payment_data', payment_record
      );
      v_result := array_append(v_result, v_single_result);
      CONTINUE;
    END IF;

    -- Get current purchase order details (use base currency for validation)
    SELECT COALESCE(total_amount_base_currency, total_amount, 0), COALESCE(total_paid, 0)
    INTO v_po_total, v_po_paid
    FROM lats_purchase_orders
    WHERE id = v_po_id;

    -- Check if purchase order exists
    IF NOT FOUND THEN
      v_single_result := json_build_object(
        'success', false,
        'message', 'Purchase order not found',
        'payment_data', payment_record
      );
      v_result := array_append(v_result, v_single_result);
      CONTINUE;
    END IF;

    -- Check if this payment would exceed the total amount
    v_new_paid := v_po_paid + v_amount;

    IF v_new_paid > v_po_total + 1 THEN  -- Allow 1 unit tolerance for rounding
      v_single_result := json_build_object(
        'success', false,
        'message', format('Payment of %s would exceed purchase order total. Current paid: %s, PO total: %s, Remaining: %s',
                         v_amount, v_po_paid, v_po_total, v_po_total - v_po_paid),
        'payment_data', payment_record
      );
      v_result := array_append(v_result, v_single_result);
      CONTINUE;
    END IF;

    -- Determine payment status
    IF v_new_paid >= v_po_total THEN
      v_payment_status := 'paid';
    ELSIF v_new_paid > 0 THEN
      v_payment_status := 'partial';
    ELSE
      v_payment_status := 'unpaid';
    END IF;

    -- Create payment record
    INSERT INTO purchase_order_payments (
      id, purchase_order_id, payment_account_id, amount, currency,
      payment_method, payment_method_id, reference, notes,
      status, payment_date, created_by, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_po_id, v_account_id, v_amount, v_currency::VARCHAR,
      v_payment_method::VARCHAR, v_payment_method_id, v_reference, v_notes,
      'completed', NOW(), v_user_id, NOW(), NOW()
    )
    RETURNING id INTO v_payment_id;

    -- Update purchase order payment status and total paid
    UPDATE lats_purchase_orders
    SET
      total_paid = v_new_paid,
      payment_status = v_payment_status,
      updated_at = NOW()
    WHERE id = v_po_id;

    -- Update finance account balance (deduct payment)
    UPDATE finance_accounts
    SET
      balance = balance - v_amount,
      updated_at = NOW()
    WHERE id = v_account_id;

    -- Add successful result
    v_single_result := json_build_object(
      'success', true,
      'message', 'Payment processed successfully',
      'data', json_build_object(
        'payment_id', v_payment_id,
        'amount_paid', v_amount,
        'total_paid', v_new_paid,
        'payment_status', v_payment_status,
        'remaining', v_po_total - v_new_paid
      ),
      'payment_data', payment_record
    );
    v_result := array_append(v_result, v_single_result);
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'message', 'Batch payment processing completed',
    'results', v_result
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Batch payment processing error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM,
      'error_code', SQLSTATE
    );
$_$;



--
-- TOC entry 7790 (class 0 OID 0)
-- Dependencies: 574
-- Name: FUNCTION process_purchase_order_payments_batch(payment_data json[]); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 549 (class 1255 OID 1204401)
-- Name: process_purchase_order_payments_batch_json(json); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    DECLARE
      payment_record JSON;
      v_payment_id CHAR(36);
      v_po_id CHAR(36);
      v_account_id CHAR(36);
      v_amount DECIMAL;
      v_currency VARCHAR;
      v_payment_method VARCHAR;
      v_payment_method_id CHAR(36);
      v_user_id CHAR(36);
      v_reference TEXT;
      v_notes TEXT;
      v_po_total DECIMAL;
      v_po_paid DECIMAL;
      v_new_paid DECIMAL;
      v_payment_status VARCHAR;
      v_result JSON[];
      v_single_result JSON;
      payment_array JSON[];
      v_result := ARRAY[]::JSON[];
      
      -- Convert JSON to JSON array
      payment_array := ARRAY(SELECT json_array_elements(payment_data_json));
      
      -- Process each payment in the array
      FOREACH payment_record IN ARRAY payment_array LOOP
        -- Extract payment data from JSON
        v_po_id := (payment_record->>'purchase_order_id')::CHAR(36);
        v_account_id := (payment_record->>'payment_account_id')::CHAR(36);
        v_amount := (payment_record->>'amount')::DECIMAL;
        v_currency := COALESCE(payment_record->>'currency', 'TZS');
        v_payment_method := payment_record->>'payment_method';
        v_payment_method_id := (payment_record->>'payment_method_id')::CHAR(36);
        v_user_id := COALESCE((payment_record->>'user_id')::CHAR(36), '00000000-0000-0000-0000-000000000001'::CHAR(36));
        v_reference := payment_record->>'reference';
        v_notes := payment_record->>'notes';
        
        -- Insert payment and get payment ID
        INSERT INTO purchase_order_payments (
          purchase_order_id,
          payment_account_id,
          amount,
          currency,
          payment_method,
          payment_method_id,
          reference,
          notes,
          created_by
        ) VALUES (
          v_po_id,
          v_account_id,
          v_amount,
          v_currency,
          v_payment_method,
          v_payment_method_id,
          v_reference,
          v_notes,
          v_user_id
        ) RETURNING id INTO v_payment_id;
        
        -- Create transaction record
        PERFORM create_account_transaction(
          v_account_id,
          'payment_made',
          v_amount,
          'PO-' || v_po_id::text,
          'Purchase Order Payment - ' || COALESCE(v_reference, ''),
          json_build_object(
            'purchase_order_id', v_po_id,
            'payment_id', v_payment_id,
            'payment_method', v_payment_method
          ),
          v_user_id
        );
        
        -- Update purchase order payment status
        UPDATE purchase_orders 
        SET 
          amount_paid = COALESCE(amount_paid, 0) + v_amount,
          payment_status = CASE 
            WHEN (COALESCE(amount_paid, 0) + v_amount) >= total_amount THEN 'paid'
            WHEN (COALESCE(amount_paid, 0) + v_amount) > 0 THEN 'partial'
            ELSE 'pending'
          END,
          updated_at = NOW()
        WHERE id = v_po_id;
        
        -- Build result
        v_single_result := json_build_object(
          'success', true,
          'payment_id', v_payment_id,
          'purchase_order_id', v_po_id,
          'amount_paid', v_amount
        );
        v_result := array_append(v_result, v_single_result);
      END LOOP;
      
      RETURN json_build_object('results', v_result);



--
-- TOC entry 653 (class 1255 OID 1204402)
-- Name: process_purchase_order_payments_batch_simple(text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    DECLARE
      payment_data JSON;
      payment_record JSON;
      v_payment_id CHAR(36);
      v_po_id CHAR(36);
      v_account_id CHAR(36);
      v_amount DECIMAL;
      v_currency VARCHAR;
      v_payment_method VARCHAR;
      v_payment_method_id CHAR(36);
      v_user_id CHAR(36);
      v_reference TEXT;
      v_notes TEXT;
      v_result JSON[];
      v_single_result JSON;
      v_result := ARRAY[]::JSON[];
      
      -- Parse the JSON text
      payment_data := payment_data_json::JSON;
      
      -- Process each payment in the JSON array
      FOR payment_record IN SELECT * FROM json_array_elements(payment_data) LOOP
        -- Extract payment data from JSON
        v_po_id := (payment_record->>'purchase_order_id')::CHAR(36);
        v_account_id := (payment_record->>'payment_account_id')::CHAR(36);
        v_amount := (payment_record->>'amount')::DECIMAL;
        v_currency := COALESCE(payment_record->>'currency', 'TZS');
        v_payment_method := payment_record->>'payment_method';
        v_payment_method_id := (payment_record->>'payment_method_id')::CHAR(36);
        v_user_id := COALESCE((payment_record->>'user_id')::CHAR(36), '00000000-0000-0000-0000-000000000001'::CHAR(36));
        v_reference := payment_record->>'reference';
        v_notes := payment_record->>'notes';
        
        -- Insert payment and get payment ID
        INSERT INTO purchase_order_payments (
          purchase_order_id,
          payment_account_id,
          amount,
          currency,
          payment_method,
          payment_method_id,
          reference,
          notes,
          created_by
        ) VALUES (
          v_po_id,
          v_account_id,
          v_amount,
          v_currency,
          v_payment_method,
          v_payment_method_id,
          v_reference,
          v_notes,
          v_user_id
        ) RETURNING id INTO v_payment_id;
        
        -- Create transaction record
        PERFORM create_account_transaction(
          v_account_id,
          'payment_made',
          v_amount,
          'PO-' || v_po_id::text,
          'Purchase Order Payment - ' || COALESCE(v_reference, ''),
          json_build_object(
            'purchase_order_id', v_po_id,
            'payment_id', v_payment_id,
            'payment_method', v_payment_method
          ),
          v_user_id
        );
        
        -- Update purchase order payment status
        UPDATE purchase_orders 
        SET 
          amount_paid = COALESCE(amount_paid, 0) + v_amount,
          payment_status = CASE 
            WHEN (COALESCE(amount_paid, 0) + v_amount) >= total_amount THEN 'paid'
            WHEN (COALESCE(amount_paid, 0) + v_amount) > 0 THEN 'partial'
            ELSE 'pending'
          END,
          updated_at = NOW()
        WHERE id = v_po_id;
        
        -- Build result
        v_single_result := json_build_object(
          'success', true,
          'payment_id', v_payment_id,
          'purchase_order_id', v_po_id,
          'amount_paid', v_amount
        );
        v_result := array_append(v_result, v_single_result);
      END LOOP;
      
      RETURN json_build_object('results', v_result);



--
-- TOC entry 708 (class 1255 OID 1204403)
-- Name: process_purchase_order_return(CHAR(36), CHAR(36), text, integer, text, CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_item_record RECORD;
  -- Get the item
  SELECT * INTO v_item_record 
  FROM lats_purchase_order_items 
  WHERE id = item_id_param AND purchase_order_id = purchase_order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order item not found';
  END IF;
  
  -- Validate return quantity
  IF return_quantity_param > v_item_record.quantity_received THEN
    RAISE EXCEPTION 'Cannot return more than received quantity';
  END IF;
  
  -- Update received quantity (subtract return)
  UPDATE lats_purchase_order_items
  SET 
    quantity_received = quantity_received - return_quantity_param
  WHERE id = item_id_param;
  
  -- Update variant stock (subtract return)
  UPDATE lats_product_variants
  SET 
    quantity = quantity - return_quantity_param
  WHERE id = v_item_record.variant_id;
  
  -- Create adjustment record for the return
  INSERT INTO lats_inventory_adjustments (
    product_id,
    variant_id,
    quantity,
    type,
    reason,
    notes,
    created_by,
    created_at
  ) VALUES (
    v_item_record.product_id,
    v_item_record.variant_id,
    -return_quantity_param, -- Negative for return
    'return',
    'Return: ' || return_type_param,
    return_reason_param,
    user_id_param,
    NOW()
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Return processed successfully',
    'returned_quantity', return_quantity_param
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error processing return: %', SQLERRM;



--
-- TOC entry 526 (class 1255 OID 1204404)
-- Name: quick_add_stock(CHAR(36), integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_result RECORD;
    -- Call the main function with minimal parameters
    SELECT * INTO v_result
    FROM add_inventory_items_without_tracking(
        p_variant_id,
        p_quantity,
        NULL, -- cost_price (use variant default)
        NULL, -- selling_price (use variant default)
        format('Quick add: %s units', p_quantity), -- notes
        NULL, -- branch_id
        NULL  -- user_id
    );
    
    RETURN QUERY SELECT 
        TRUE as success,
        v_result.message,
        (v_result.new_quantity - p_quantity)::INTEGER as old_quantity,
        v_result.new_quantity::INTEGER;



--
-- TOC entry 7791 (class 0 OID 0)
-- Dependencies: 526
-- Name: FUNCTION quick_add_stock(p_variant_id CHAR(36), p_quantity integer); Type: COMMENT; Schema: public; Owner: neondb_owner
--

Simplified version that uses variant default prices.

Example:
SELECT * FROM quick_add_stock(
    ''b4418cf0-7624-4238-8e98-7d1eb5986b28''::CHAR(36),  -- variant_id
    4                                                -- quantity
);';


--
-- TOC entry 535 (class 1255 OID 1204405)
-- Name: recalculate_all_parent_quantities(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
  WITH parent_updates AS (
      p.id,
      p.name,
      p.quantity as old_qty,
      COALESCE(SUM(c.quantity), 0)::INT as new_qty
    FROM lats_product_variants p
    LEFT JOIN lats_product_variants c ON c.parent_variant_id = p.id AND c.variant_type = 'imei'
    WHERE p.variant_type = 'parent' OR EXISTS (
      SELECT 1 FROM lats_product_variants child 
      WHERE child.parent_variant_id = p.id
    )
    GROUP BY p.id, p.name, p.quantity
  )
    id,
    name,
    old_qty,
    new_qty,
    (new_qty - old_qty)::INT as diff
  FROM parent_updates
  WHERE old_qty != new_qty;
  
  -- Update all parent quantities
  UPDATE lats_product_variants p
  SET 
    quantity = subq.new_qty,
    stock_quantity = subq.new_qty,
    updated_at = NOW()
  FROM (
      p2.id,
      COALESCE(SUM(c.quantity), 0)::INT as new_qty
    FROM lats_product_variants p2
    LEFT JOIN lats_product_variants c ON c.parent_variant_id = p2.id AND c.variant_type = 'imei'
    WHERE p2.variant_type = 'parent' OR EXISTS (
      SELECT 1 FROM lats_product_variants child 
      WHERE child.parent_variant_id = p2.id
    )
    GROUP BY p2.id
  ) subq
  WHERE p.id = subq.id AND p.quantity != subq.new_qty;



--
-- TOC entry 553 (class 1255 OID 1204406)
-- Name: recalculate_all_parent_stocks(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
  WITH parent_calcs AS (
      p.id,
      COALESCE(p.variant_name, p.name) as name,
      p.quantity as old_qty,
      COALESCE(SUM(c.quantity), 0)::INT as new_qty,
      COUNT(c.id)::INT as child_count
    FROM lats_product_variants p
    LEFT JOIN lats_product_variants c 
      ON c.parent_variant_id = p.id 
      AND c.variant_type = 'imei_child'
      AND c.is_active = TRUE
    WHERE (p.is_parent = TRUE OR p.variant_type = 'parent')
      OR EXISTS (
        SELECT 1 FROM lats_product_variants child 
        WHERE child.parent_variant_id = p.id
      )
    GROUP BY p.id, p.variant_name, p.name, p.quantity
  )
    id,
    name,
    old_qty,
    new_qty,
    child_count
  FROM parent_calcs;
  
  -- Update all parent quantities
  UPDATE lats_product_variants p
  SET 
    quantity = subq.new_qty,
    updated_at = NOW()
  FROM (
      p2.id,
      COALESCE(SUM(c.quantity), 0)::INT as new_qty
    FROM lats_product_variants p2
    LEFT JOIN lats_product_variants c 
      ON c.parent_variant_id = p2.id 
      AND c.variant_type = 'imei_child'
      AND c.is_active = TRUE
    WHERE (p2.is_parent = TRUE OR p2.variant_type = 'parent')
      OR EXISTS (
        SELECT 1 FROM lats_product_variants child 
        WHERE child.parent_variant_id = p2.id
      )
    GROUP BY p2.id
  ) subq
  WHERE p.id = subq.id;
  
  RAISE NOTICE '✅ All parent stocks recalculated';



--
-- TOC entry 7792 (class 0 OID 0)
-- Dependencies: 553
-- Name: FUNCTION recalculate_all_parent_stocks(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 592 (class 1255 OID 1204407)
-- Name: recalculate_sale_total(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_calculated_total NUMERIC(15, 2);
    -- Calculate total from line items
    SELECT COALESCE(SUM(total_price), 0)
    INTO v_calculated_total
    FROM lats_sale_items
    WHERE sale_id = p_sale_id;
    
    -- Update the sale record
    UPDATE lats_sales
    SET total_amount = v_calculated_total
    WHERE id = p_sale_id;
    
    RETURN v_calculated_total;



--
-- TOC entry 706 (class 1255 OID 1204408)
-- Name: receive_quality_checked_items(CHAR(36), CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_item RECORD;
  v_received_count INTEGER := 0;
  -- Update items that passed quality check
  FOR v_item IN 
      qci.purchase_order_item_id,
      qci.quantity_passed
    FROM purchase_order_quality_check_items qci
    WHERE qci.quality_check_id = p_quality_check_id
      AND qci.result = 'pass'
      AND qci.quantity_passed > 0
  LOOP
    -- Update the PO item received quantity
    UPDATE lats_purchase_order_items
    SET 
      received_quantity = COALESCE(received_quantity, 0) + v_item.quantity_passed,
      updated_at = NOW()
    WHERE id = v_item.purchase_order_item_id;
    
    v_received_count := v_received_count + 1;
  END LOOP;

  -- Check if all items are now received and update PO status
  PERFORM 1 FROM lats_purchase_order_items poi
  WHERE poi.purchase_order_id = p_purchase_order_id
    AND COALESCE(poi.received_quantity, 0) < poi.quantity;
  
  IF NOT FOUND THEN
    -- All items received
    UPDATE lats_purchase_orders
    SET 
      status = 'received',
      updated_at = NOW()
    WHERE id = p_purchase_order_id;
  ELSE
    -- Partially received
    UPDATE lats_purchase_orders
    SET 
      status = 'partially_received',
      updated_at = NOW()
    WHERE id = p_purchase_order_id
      AND status != 'partially_received';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Successfully received %s items to inventory', v_received_count),
    'items_received', v_received_count
  );



--
-- TOC entry 7793 (class 0 OID 0)
-- Dependencies: 706
-- Name: FUNCTION receive_quality_checked_items(p_quality_check_id CHAR(36), p_purchase_order_id CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 607 (class 1255 OID 1204409)
-- Name: record_expense_transaction(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Only create transaction for paid expenses
  IF NEW.status = 'paid' THEN
    INSERT INTO account_transactions (
      account_id,
      transaction_type,
      amount,
      description,
      reference_number,
      related_entity_type,
      related_entity_id,
      created_at,
      created_by
    ) VALUES (
      NEW.account_id,
      'expense',
      NEW.amount,
      COALESCE(NEW.description, 'Expense: ' || NEW.category),
      NEW.reference_number,
      'expense',
      NEW.id,
      NEW.created_at,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;



--
-- TOC entry 710 (class 1255 OID 1204410)
-- Name: reduce_variant_stock(CHAR(36), integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Reduce both quantity AND reserved_quantity
  -- This ensures the reservation is released during the transfer
  UPDATE lats_product_variants
  SET quantity = GREATEST(0, quantity - p_quantity),
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_quantity),
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Reduced % units from variant %', p_quantity, p_variant_id;



--
-- TOC entry 475 (class 1255 OID 1204411)
-- Name: release_variant_stock(CHAR(36), integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Release the reserved stock (cannot go below 0)
  UPDATE lats_product_variants
  SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_quantity),
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Released % units for variant %', p_quantity, p_variant_id;



--
-- TOC entry 610 (class 1255 OID 1204412)
-- Name: repair_po_inventory_issues(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  po_record RECORD;
  item_record RECORD;
  inventory_needed INTEGER;
  i INTEGER;
  -- Process each PO with issues
  FOR po_record IN 
    SELECT DISTINCT poi.purchase_order_id, po.po_number, po.supplier_id, po.branch_id
    FROM lats_purchase_order_items poi
    JOIN lats_purchase_orders po ON po.id = poi.purchase_order_id
    WHERE po.status IN ('received', 'partial_received')
  LOOP
    FOR item_record IN
        poi.id,
        poi.purchase_order_id,
        poi.product_id,
        poi.variant_id,
        poi.quantity_ordered,
        poi.quantity_received,
        p.name as product_name,
        pv.name as variant_name,
        COUNT(ii.id) as inventory_count
      FROM lats_purchase_order_items poi
      LEFT JOIN lats_products p ON p.id = poi.product_id
      LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
      LEFT JOIN inventory_items ii ON ii.purchase_order_item_id = poi.id AND ii.status = 'available'
      WHERE poi.purchase_order_id = po_record.purchase_order_id
      GROUP BY poi.id, poi.purchase_order_id, poi.product_id, poi.variant_id, 
               poi.quantity_ordered, poi.quantity_received, p.name, pv.name
      HAVING poi.quantity_received > COUNT(ii.id)  -- More received than inventory items
    LOOP
      -- Calculate how many inventory items we need to create
      inventory_needed := item_record.quantity_received - item_record.inventory_count;
      
      IF inventory_needed > 0 THEN
        -- Create missing inventory items
        FOR i IN 1..inventory_needed LOOP
          INSERT INTO inventory_items (
            purchase_order_id,
            purchase_order_item_id,
            product_id,
            variant_id,
            status,
            cost_price,
            selling_price,
            notes,
            metadata,
            purchase_date,
            branch_id,
            created_at,
            updated_at
          ) VALUES (
            item_record.purchase_order_id,
            item_record.id,
            item_record.product_id,
            item_record.variant_id,
            'available',
            0,  -- We don't have the original cost, so use 0
            0,  -- We don't have the selling price, so use 0
            format(
              'Auto-created inventory item for PO %s - %s %s (Fix for missing inventory)',
              po_record.po_number,
              COALESCE(item_record.product_name, 'Unknown Product'),
              COALESCE(item_record.variant_name, '')
            ),
            jsonb_build_object(
              'purchase_order_id', item_record.purchase_order_id::text,
              'purchase_order_item_id', item_record.id::text,
              'order_number', po_record.po_number,
              'supplier_id', po_record.supplier_id::text,
              'batch_number', i,
              'auto_repaired', true,
              'repair_date', NOW()
            ),
            NOW(),
            po_record.branch_id,
            NOW(),
            NOW()
          );
        END LOOP;
        
        RETURN QUERY SELECT 
          po_record.purchase_order_id,
          item_record.id,
          format('Missing %s inventory items (had %s, needed %s)', 
                 inventory_needed, item_record.inventory_count, item_record.quantity_received),
          format('Created %s missing inventory items', inventory_needed),
          true;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN;



--
-- TOC entry 650 (class 1255 OID 1204413)
-- Name: rereceive_purchase_order(CHAR(36), CHAR(36), text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Use the force_receive option to recalculate based on actual inventory
  RETURN complete_purchase_order_receive_v2(
    purchase_order_id_param, 
    user_id_param, 
    notes, 
    true  -- force_receive = true
  );



--
-- TOC entry 548 (class 1255 OID 1204414)
-- Name: reserve_variant_stock(CHAR(36), integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Validate available stock before reserving
  IF (
    SELECT (quantity - COALESCE(reserved_quantity, 0))
    FROM lats_product_variants
    WHERE id = p_variant_id
  ) < p_quantity THEN
    RAISE EXCEPTION 'Insufficient available stock to reserve % units', p_quantity;
  END IF;

  -- Reserve the stock
  UPDATE lats_product_variants
  SET reserved_quantity = COALESCE(reserved_quantity, 0) + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Reserved % units for variant %', p_quantity, p_variant_id;



--
-- TOC entry 579 (class 1255 OID 1188138)
-- Name: reverse_purchase_order_payment(CHAR(36), CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    SET search_path TO 'public'

      DECLARE
        v_payment               purchase_order_payments%ROWTYPE;
        v_po                    lats_purchase_orders%ROWTYPE;
        v_total_base            NUMERIC := 0;
        v_new_total_paid        NUMERIC := 0;
        v_new_status            TEXT := 'unpaid';
        v_account               finance_accounts%ROWTYPE;
        v_deleted_transactions  INTEGER := 0;
        v_deleted_expenses      INTEGER := 0;
        v_receipt_number        TEXT;
        -- Lock payment row to prevent concurrent reversals
        SELECT *
        INTO v_payment
        FROM purchase_order_payments
        WHERE id = payment_id_param
        FOR UPDATE;

        IF NOT FOUND THEN
          RETURN json_build_object(
            'success', false,
            'message', 'Payment not found'
          );
        END IF;

        -- Lock the related purchase order row
        SELECT *
        INTO v_po
        FROM lats_purchase_orders
        WHERE id = v_payment.purchase_order_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RETURN json_build_object(
            'success', false,
            'message', 'Related purchase order not found'
          );
        END IF;

        -- Calculate new totals and payment status
        v_new_total_paid := GREATEST(COALESCE(v_po.total_paid, 0) - COALESCE(v_payment.amount, 0), 0);
        v_total_base := COALESCE(v_po.total_amount_base_currency, v_po.total_amount, 0);

        IF v_new_total_paid <= 0 THEN
          v_new_status := 'unpaid';
        ELSIF v_total_base > 0 AND v_new_total_paid >= v_total_base THEN
          v_new_status := 'paid';
        ELSE
          v_new_status := 'partial';
        END IF;

        -- Restore finance account balance
        UPDATE finance_accounts
        SET balance = balance + COALESCE(v_payment.amount, 0),
            updated_at = NOW()
        WHERE id = v_payment.payment_account_id
        RETURNING * INTO v_account;

        IF NOT FOUND THEN
          RETURN json_build_object(
            'success', false,
            'message', 'Related finance account not found'
          );
        END IF;

        -- Remove linked account transactions
        DELETE FROM account_transactions
        WHERE related_entity_type = 'purchase_order_payment'
          AND related_entity_id = v_payment.id;
        GET DIAGNOSTICS v_deleted_transactions = ROW_COUNT;

        -- Remove any finance expense created by the payment trigger
        v_receipt_number := COALESCE(v_payment.reference, 'PO-PAY-' || SUBSTRING(v_payment.id::TEXT, 1, 8));

        DELETE FROM finance_expenses
        WHERE receipt_number = v_receipt_number
           OR description ILIKE '%' || v_payment.id::TEXT || '%';
        GET DIAGNOSTICS v_deleted_expenses = ROW_COUNT;

        -- Delete the payment record itself
        DELETE FROM purchase_order_payments
        WHERE id = v_payment.id;

        -- Update purchase order totals and status
        UPDATE lats_purchase_orders
        SET total_paid = v_new_total_paid,
            payment_status = v_new_status,
            updated_at = NOW()
        WHERE id = v_payment.purchase_order_id;

        RETURN json_build_object(
          'success', true,
          'message', 'Payment reversed successfully',
          'data', json_build_object(
            'purchase_order_id', v_payment.purchase_order_id,
            'amount_reversed', v_payment.amount,
            'new_total_paid', v_new_total_paid,
            'payment_status', v_new_status,
            'account_id', v_account.id,
            'account_balance', v_account.balance,
            'transactions_removed', v_deleted_transactions,
            'expenses_removed', v_deleted_expenses,
            'performed_by', user_id_param,
            'performed_at', NOW()
          )
        );



--
-- TOC entry 7794 (class 0 OID 0)
-- Dependencies: 579
-- Name: FUNCTION reverse_purchase_order_payment(payment_id_param CHAR(36), user_id_param CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 571 (class 1255 OID 1204415)
-- Name: rollback_transaction_if_exists(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY SELECT TRUE, 'No-op rollback (handled client-side)';



--
-- TOC entry 671 (class 1255 OID 1204416)
-- Name: search_customers_fn(text, integer, integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

      DECLARE
        offset_val INTEGER;
        total_count_val BIGINT;
        offset_val := (page_number - 1) * page_size;

        SELECT COUNT(*) INTO total_count_val
        FROM customers c
        WHERE
          c.name ILIKE '%' || search_query || '%'
          OR c.phone ILIKE '%' || search_query || '%'
          OR COALESCE(c.email, '') ILIKE '%' || search_query || '%'
          OR COALESCE(c.customer_tag, '') ILIKE '%' || search_query || '%';

        RETURN QUERY
          c.id,
          c.name,
          c.phone,
          c.email,
          COALESCE(c.gender, 'other') as gender,
          COALESCE(c.city, '') as city,
          COALESCE(c.country, '') as country,
          COALESCE(c.color_tag, 'new') as color_tag,
          COALESCE(c.loyalty_level, 'bronze') as loyalty_level,
          COALESCE(c.points, 0) as points,
          COALESCE(c.total_spent, 0) as total_spent,
          COALESCE(c.last_visit, c.created_at) as last_visit,
          COALESCE(c.is_active, true) as is_active,
          c.referral_source,
          c.birth_month,
          c.birth_day,
          c.birthday,
          c.initial_notes,
          c.notes,
          c.customer_tag,
          c.location_description,
          c.national_id,
          c.joined_date,
          c.created_at,
          c.updated_at,
          c.branch_id,
          COALESCE(c.is_shared, false) as is_shared,
          c.created_by_branch_id,
          c.created_by_branch_name,
          c.profile_image,
          COALESCE(c.whatsapp, c.phone) as whatsapp,
          COALESCE(c.whatsapp_opt_out, false) as whatsapp_opt_out,
          c.referred_by,
          c.created_by,
          c.last_purchase_date,
          COALESCE(c.total_purchases, 0) as total_purchases,
          COALESCE(c.total_calls, 0) as total_calls,
          COALESCE(c.total_call_duration_minutes, 0) as total_call_duration_minutes,
          COALESCE(c.incoming_calls, 0) as incoming_calls,
          COALESCE(c.outgoing_calls, 0) as outgoing_calls,
          COALESCE(c.missed_calls, 0) as missed_calls,
          COALESCE(c.avg_call_duration_minutes, 0) as avg_call_duration_minutes,
          c.first_call_date,
          c.last_call_date,
          COALESCE(c.call_loyalty_level, 'Basic') as call_loyalty_level,
          COALESCE(c.total_returns, 0) as total_returns,
          total_count_val as total_count
        FROM customers c
        WHERE
          c.name ILIKE '%' || search_query || '%'
          OR c.phone ILIKE '%' || search_query || '%'
          OR COALESCE(c.email, '') ILIKE '%' || search_query || '%'
          OR COALESCE(c.customer_tag, '') ILIKE '%' || search_query || '%'
        ORDER BY c.created_at DESC
        LIMIT page_size
        OFFSET offset_val;



--
-- TOC entry 625 (class 1255 OID 1204417)
-- Name: set_customer_branch_on_create(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    branch_name TEXT;
    -- If branch_id is set but branch_name is not, fetch the branch name
    IF NEW.created_by_branch_id IS NOT NULL AND NEW.created_by_branch_name IS NULL THEN
        SELECT name INTO branch_name
        FROM store_locations
        WHERE id = NEW.created_by_branch_id;
        
        NEW.created_by_branch_name := branch_name;
    END IF;
    
    RETURN NEW;



--
-- TOC entry 600 (class 1255 OID 1204418)
-- Name: set_default_branch(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- If branch_id is not set, try to get user's current branch from auth
  IF NEW.branch_id IS NULL THEN
    -- Try to get current user's branch (if the function exists)
      NEW.branch_id := get_user_current_branch(auth.uid());
    EXCEPTION
      WHEN OTHERS THEN
        -- If function doesn't exist or fails, just leave branch_id as NULL
        NULL;
  END IF;
  
  RETURN NEW;



--
-- TOC entry 525 (class 1255 OID 1204419)
-- Name: set_imei_status(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  IF NEW.variant_type = 'imei_child' THEN
    NEW.variant_attributes = jsonb_set(NEW.variant_attributes, '{imei_status}', '"valid"');
  END IF;
  RETURN NEW;



--
-- TOC entry 460 (class 1255 OID 1204420)
-- Name: set_is_shared_on_insert(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_branch_settings RECORD;
  -- Only process if branch_id is set
  IF NEW.branch_id IS NOT NULL THEN
    -- Get the branch settings
      share_products,
      share_customers,
      share_categories,
      share_suppliers,
      share_employees
    INTO v_branch_settings
    FROM store_locations
    WHERE id = NEW.branch_id;

    -- Set is_shared based on table and branch settings
    IF TG_TABLE_NAME = 'lats_products' THEN
      NEW.is_shared := COALESCE(v_branch_settings.share_products, false);
    ELSIF TG_TABLE_NAME = 'lats_product_variants' THEN
      -- Variants inherit from their product
      SELECT is_shared INTO NEW.is_shared
      FROM lats_products
      WHERE id = NEW.product_id;
    ELSIF TG_TABLE_NAME = 'customers' THEN
      NEW.is_shared := COALESCE(v_branch_settings.share_customers, false);
    ELSIF TG_TABLE_NAME = 'lats_categories' THEN
      NEW.is_shared := COALESCE(v_branch_settings.share_categories, false);
    ELSIF TG_TABLE_NAME = 'lats_suppliers' THEN
      NEW.is_shared := COALESCE(v_branch_settings.share_suppliers, false);
    ELSIF TG_TABLE_NAME = 'employees' THEN
      NEW.is_shared := COALESCE(NEW.can_work_at_all_branches, false) 
                       OR COALESCE(v_branch_settings.share_employees, false);
    END IF;
  END IF;

  RETURN NEW;



--
-- TOC entry 611 (class 1255 OID 1204421)
-- Name: set_trade_in_contract_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
        NEW.contract_number := generate_trade_in_contract_number();
    END IF;
    RETURN NEW;



--
-- TOC entry 489 (class 1255 OID 1204422)
-- Name: set_trade_in_transaction_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
        NEW.transaction_number := generate_trade_in_transaction_number();
    END IF;
    RETURN NEW;



--
-- TOC entry 566 (class 1255 OID 1204423)
-- Name: sync_category_sharing(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Update categories based on their branch's share_categories setting
  UPDATE lats_categories c
  SET is_shared = s.share_categories
  FROM store_locations s
  WHERE c.branch_id = s.id
    AND c.branch_id IS NOT NULL;

  RAISE NOTICE 'Category sharing synced successfully';



--
-- TOC entry 536 (class 1255 OID 1204424)
-- Name: sync_customer_payment_to_transaction(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_order_id TEXT;
  -- Only process if payment has an amount
  IF NEW.amount > 0 THEN

    -- Get customer details
    IF NEW.customer_id IS NOT NULL THEN
      SELECT name, email, phone
      INTO v_customer_name, v_customer_email, v_customer_phone
      FROM customers
      WHERE id = NEW.customer_id;
    END IF;

    -- Generate order ID
    v_order_id := 'CP-' || NEW.id::text;

    -- Insert payment transaction
    INSERT INTO payment_transactions (
      id,
      order_id,
      provider,
      amount,
      currency,
      status,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      reference,
      metadata,
      created_at,
      updated_at,
      completed_at
    ) VALUES (
      gen_random_uuid(),
      v_order_id,
      COALESCE(NEW.method, 'cash'),  -- FIXED: Changed from payment_method to method
      NEW.amount,
      'TZS',  -- FIXED: Hardcoded currency since column doesn't exist
      COALESCE(NEW.status, 'completed'),
      NEW.customer_id,
      v_customer_name,
      v_customer_email,
      v_customer_phone,
      NEW.reference_number,
      jsonb_build_object(
        'source', 'customer_payments',
        'original_id', NEW.id::text,
        'auto_synced', true,
        'sync_date', NOW()::text
      )::json,
      COALESCE(NEW.created_at, NOW()),
      NEW.created_at,
      NEW.payment_date
    )
    ON CONFLICT (order_id) DO UPDATE SET
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      provider = EXCLUDED.provider,
      customer_name = EXCLUDED.customer_name,
      customer_email = EXCLUDED.customer_email,
      customer_phone = EXCLUDED.customer_phone,
      updated_at = NOW();

    RAISE NOTICE '✅ Auto-synced customer payment % to payment_transactions', NEW.id;
  END IF;

  RETURN NEW;



--
-- TOC entry 561 (class 1255 OID 1204425)
-- Name: sync_customer_sharing(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Update customers based on their branch's share_customers setting
  UPDATE customers c
  SET is_shared = s.share_customers
  FROM store_locations s
  WHERE c.branch_id = s.id
    AND c.branch_id IS NOT NULL;

  RAISE NOTICE 'Customer sharing synced successfully';



--
-- TOC entry 578 (class 1255 OID 1204426)
-- Name: sync_employee_sharing(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Update employees based on their branch's share_employees setting
  -- OR if they have can_work_at_all_branches flag
  UPDATE employees e
  SET is_shared = COALESCE(e.can_work_at_all_branches, false) OR COALESCE(s.share_employees, false)
  FROM store_locations s
  WHERE e.branch_id = s.id
    AND e.branch_id IS NOT NULL;

  RAISE NOTICE 'Employee sharing synced successfully';



--
-- TOC entry 664 (class 1255 OID 1204427)
-- Name: sync_finance_account_columns(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Sync name <-> account_name (prioritize name if both provided)
  IF NEW.name IS NOT NULL THEN
    NEW.account_name := NEW.name;
  ELSIF NEW.account_name IS NOT NULL THEN
    NEW.name := NEW.account_name;
  END IF;
  
  -- Sync type <-> account_type (prioritize type if both provided)
  IF NEW.type IS NOT NULL THEN
    NEW.account_type := NEW.type;
  ELSIF NEW.account_type IS NOT NULL THEN
    NEW.type := NEW.account_type;
  END IF;
  
  -- Sync balance <-> current_balance (prioritize balance if both provided)
  IF NEW.balance IS NOT NULL THEN
    NEW.current_balance := NEW.balance;
  ELSIF NEW.current_balance IS NOT NULL THEN
    NEW.balance := NEW.current_balance;
  END IF;
  
  RETURN NEW;



--
-- TOC entry 518 (class 1255 OID 1204428)
-- Name: sync_imei_serial_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- If serial_number is updated, sync to imei
  IF TG_OP = 'UPDATE' AND NEW.serial_number IS DISTINCT FROM OLD.serial_number THEN
    NEW.imei = COALESCE(NULLIF(NEW.serial_number, ''), NEW.imei);
  END IF;
  
  -- If imei is updated, sync to serial_number
  IF TG_OP = 'UPDATE' AND NEW.imei IS DISTINCT FROM OLD.imei THEN
    NEW.serial_number = COALESCE(NULLIF(NEW.imei, ''), NEW.serial_number);
  END IF;
  
  -- On INSERT, ensure both are set to the same value
  IF TG_OP = 'INSERT' THEN
    IF NEW.serial_number IS NOT NULL AND NEW.serial_number != '' THEN
      NEW.imei = COALESCE(NULLIF(NEW.imei, ''), NEW.serial_number);
    ELSIF NEW.imei IS NOT NULL AND NEW.imei != '' THEN
      NEW.serial_number = COALESCE(NULLIF(NEW.serial_number, ''), NEW.imei);
    END IF;
  END IF;
  
  RETURN NEW;



--
-- TOC entry 568 (class 1255 OID 1204429)
-- Name: sync_parent_variant_quantity_on_imei_change(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_parent_id CHAR(36);
  v_new_total INTEGER;
  v_existing_quantity INTEGER;
  v_imei_children_count INTEGER;
  v_old_imei_count INTEGER;
  v_imei_change INTEGER;
  v_product_id CHAR(36);
  -- Determine the parent ID
  IF TG_OP = 'DELETE' THEN
    v_parent_id := OLD.parent_variant_id;
  ELSE
    v_parent_id := NEW.parent_variant_id;
  END IF;

  -- Only process if this is an IMEI child variant with a parent
  IF v_parent_id IS NOT NULL AND (
    (TG_OP = 'DELETE' AND OLD.variant_type = 'imei_child') OR
    (TG_OP IN ('INSERT', 'UPDATE') AND NEW.variant_type = 'imei_child')
  ) THEN
    -- Get existing parent quantity BEFORE recalculation
    SELECT COALESCE(quantity, 0)
    INTO v_existing_quantity
    FROM lats_product_variants
    WHERE id = v_parent_id;

    -- Calculate total quantity from all active IMEI children
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_imei_children_count
    FROM lats_product_variants
    WHERE parent_variant_id = v_parent_id
      AND variant_type = 'imei_child'
      AND is_active = TRUE;

    -- ✅ FIX: Preserve existing non-IMEI stock by ADDING to it
    -- If parent had quantity before, we need to ADD the new IMEI children to it
    -- Formula: new_total = existing_quantity + (new_imei_count - old_imei_count)
    -- Calculate old IMEI count (before this change)
    IF TG_OP = 'INSERT' THEN
      -- New IMEI child added: old_count = new_count - 1
      v_old_imei_count := v_imei_children_count - 1;
    ELSIF TG_OP = 'DELETE' THEN
      -- IMEI child deleted: old_count = new_count + 1
      v_old_imei_count := v_imei_children_count + 1;
    ELSE
      -- UPDATE: count didn't change, but quantity might have
      v_old_imei_count := v_imei_children_count;
    END IF;
    
    -- Calculate change in IMEI count
    v_imei_change := v_imei_children_count - v_old_imei_count;
    
    -- If parent had existing stock, add the change to it
    -- Otherwise, use the new IMEI count
    IF v_existing_quantity >= v_old_imei_count THEN
      -- Parent has existing stock: add the change
      v_new_total := v_existing_quantity + v_imei_change;
    ELSE
      -- Parent quantity is less than old IMEI count: use new count
      v_new_total := v_imei_children_count;
    END IF;

    -- Get product ID from parent
    SELECT product_id INTO v_product_id
    FROM lats_product_variants
    WHERE id = v_parent_id;

    -- Update parent variant quantity
    UPDATE lats_product_variants
    SET 
      quantity = v_new_total,
      updated_at = NOW()
    WHERE id = v_parent_id;
    
    -- Update product stock_quantity
    IF v_product_id IS NOT NULL THEN
      UPDATE lats_products
      SET 
        stock_quantity = (
          SELECT COALESCE(SUM(quantity), 0)
          FROM lats_product_variants
          WHERE product_id = v_product_id
            AND is_active = TRUE
            AND (variant_type = 'parent' OR variant_type = 'standard' OR parent_variant_id IS NULL)
        ),
        updated_at = NOW()
      WHERE id = v_product_id;
    END IF;
    
    RAISE NOTICE '✅ Parent % stock updated to % (IMEI children: %, Preserved: %)', 
      v_parent_id, 
      v_new_total, 
      v_imei_children_count,
      v_new_total - v_imei_children_count;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;



--
-- TOC entry 609 (class 1255 OID 1204430)
-- Name: sync_product_category(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    IF NEW.category_id IS NOT NULL THEN
        SELECT name INTO NEW.category
        FROM lats_categories
        WHERE id = NEW.category_id;
    ELSE
        NEW.category := 'Uncategorized';
    END IF;
    RETURN NEW;



--
-- TOC entry 630 (class 1255 OID 1204431)
-- Name: sync_product_sharing(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Update products based on their branch's share_products setting
  UPDATE lats_products p
  SET is_shared = s.share_products
  FROM store_locations s
  WHERE p.branch_id = s.id
    AND p.branch_id IS NOT NULL;

  -- Update variants to match their parent product
  UPDATE lats_product_variants v
  SET is_shared = p.is_shared
  FROM lats_products p
  WHERE v.product_id = p.id;

  RAISE NOTICE 'Product sharing synced successfully';



--
-- TOC entry 698 (class 1255 OID 1204432)
-- Name: sync_product_stock(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    UPDATE lats_products
    SET 
        total_quantity = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM lats_product_variants
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);



--
-- TOC entry 628 (class 1255 OID 1204433)
-- Name: sync_product_stock_from_variants(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    -- Update the product's stock_quantity to match sum of all active variant quantities
    UPDATE lats_products
    SET 
        stock_quantity = COALESCE((
            SELECT SUM(COALESCE(quantity, 0))
            FROM lats_product_variants
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
            AND is_active = true
        ), 0),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);



--
-- TOC entry 540 (class 1255 OID 1204434)
-- Name: sync_sale_to_payment_transaction(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_payment_type TEXT;
  -- Only process if sale has an amount
  IF NEW.total_amount > 0 THEN
    
    -- Get customer details if customer_id exists
    IF NEW.customer_id IS NOT NULL THEN
      SELECT name, email, phone 
      INTO v_customer_name, v_customer_email, v_customer_phone
      FROM customers 
      WHERE id = NEW.customer_id;
    END IF;
    
    -- Extract payment type from JSON or use default
    -- payment_method is now JSON like: {"type":"CRDB Bank","amount":100,"details":{...}}
    v_payment_type := COALESCE(NEW.payment_method->>'type', 'cash');
    
    -- Insert or update payment transaction
    INSERT INTO payment_transactions (
      id,
      order_id,
      provider,
      amount,
      currency,
      status,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      reference,
      metadata,
      sale_id,
      pos_session_id,
      created_at,
      updated_at,
      completed_at
    ) VALUES (
      gen_random_uuid(),
      COALESCE(NEW.sale_number, 'SALE-' || NEW.id::text),
      v_payment_type,  -- ✅ Now using extracted type
      NEW.total_amount,
      'TZS',
      COALESCE(NEW.payment_status, 'completed'),  -- ✅ Fixed: Use payment_status directly
      NEW.customer_id,
      COALESCE(v_customer_name, NEW.customer_name),
      COALESCE(v_customer_email, NEW.customer_email),
      COALESCE(v_customer_phone, NEW.customer_phone),
      'SALE-' || COALESCE(NEW.sale_number, NEW.id::text),
      jsonb_build_object(
        'sale_number', COALESCE(NEW.sale_number, 'N/A'),
        'payment_method', v_payment_type,  -- ✅ Now using extracted type
        'payment_details', NEW.payment_method,  -- ✅ Store full JSON details
        'auto_synced', true,
        'sync_date', NOW()::text
      )::json,
      NEW.id,
      'SYSTEM',  -- ✅ Fixed: Don't use session_id column (doesn't exist)
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.created_at, NOW()),
      CASE WHEN COALESCE(NEW.payment_status, 'completed') = 'completed' THEN COALESCE(NEW.created_at, NOW()) ELSE NULL END
    )
    ON CONFLICT (sale_id) 
    WHERE sale_id IS NOT NULL
    DO UPDATE SET
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      provider = EXCLUDED.provider,
      customer_name = EXCLUDED.customer_name,
      customer_email = EXCLUDED.customer_email,
      customer_phone = EXCLUDED.customer_phone,
      updated_at = NOW(),
      completed_at = CASE 
        WHEN EXCLUDED.status = 'completed' THEN NOW() 
        ELSE payment_transactions.completed_at 
  END IF;
  
  RETURN NEW;



--
-- TOC entry 554 (class 1255 OID 1204435)
-- Name: sync_supplier_sharing(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Update suppliers based on their branch's share_suppliers setting
  UPDATE lats_suppliers sp
  SET is_shared = s.share_suppliers
  FROM store_locations s
  WHERE sp.branch_id = s.id
    AND sp.branch_id IS NOT NULL;

  RAISE NOTICE 'Supplier sharing synced successfully';



--
-- TOC entry 709 (class 1255 OID 1204436)
-- Name: sync_user_to_auth_users(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

      -- Update auth_users when users table is updated
      IF TG_OP = 'UPDATE' THEN
        UPDATE auth_users
        SET 
          username = NEW.username,
          email = NEW.email,
          name = NEW.full_name,
          role = NEW.role,
          is_active = NEW.is_active,
          permissions = NEW.permissions,
          max_devices_allowed = NEW.max_devices_allowed,
          updated_at = NEW.updated_at
        WHERE email = OLD.email;
        
        RAISE NOTICE 'Synced user % to auth_users', NEW.email;
      END IF;
      
      RETURN NEW;



--
-- TOC entry 504 (class 1255 OID 1204437)
-- Name: sync_variant_imei_serial_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_identifier TEXT;
  -- Only process IMEI child variants
  IF NEW.variant_type = 'imei_child' AND NEW.variant_attributes IS NOT NULL THEN
    -- Get the identifier from IMEI or serial_number (whichever is available)
    v_identifier := COALESCE(
      NULLIF(NEW.variant_attributes->>'imei', ''),
      NULLIF(NEW.variant_attributes->>'serial_number', ''),
      ''
    );
    
    -- If we have an identifier, set both fields to the same value
    IF v_identifier != '' THEN
      NEW.variant_attributes := jsonb_set(
        jsonb_set(
          COALESCE(NEW.variant_attributes, '{}'::JSON),
          '{imei}',
          to_jsonb(v_identifier)
        ),
        '{serial_number}',
        to_jsonb(v_identifier)
      );
    END IF;
  END IF;
  
  RETURN NEW;



--
-- TOC entry 577 (class 1255 OID 1204438)
-- Name: sync_variant_prices(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    -- If selling_price is null or zero, copy from unit_price
    IF (NEW.selling_price IS NULL OR NEW.selling_price = 0) AND NEW.unit_price > 0 THEN
        NEW.selling_price := NEW.unit_price;
    END IF;
    
    -- If unit_price is null or zero, copy from selling_price
    IF (NEW.unit_price IS NULL OR NEW.unit_price = 0) AND NEW.selling_price > 0 THEN
        NEW.unit_price := NEW.selling_price;
    END IF;
    
    RETURN NEW;



--
-- TOC entry 507 (class 1255 OID 1204439)
-- Name: sync_variant_quantity_from_inventory(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_variant_id CHAR(36);
  v_available_count INTEGER;
  v_imei_children_count INTEGER;
  v_total_count INTEGER;
  v_is_parent TINYINT(1);
  -- Determine which variant to update based on operation
  IF TG_OP = 'DELETE' THEN
    v_variant_id := OLD.variant_id;
  ELSE
    v_variant_id := NEW.variant_id;
  END IF;
  
  -- Only process if variant_id is set
  IF v_variant_id IS NOT NULL THEN
    -- Check if this variant is a parent variant
    SELECT COALESCE(is_parent, false) INTO v_is_parent
    FROM lats_product_variants
    WHERE id = v_variant_id;
    
    -- Count available inventory items for this variant
    SELECT COUNT(*) INTO v_available_count
    FROM inventory_items
    WHERE variant_id = v_variant_id
      AND status = 'available';
    
    -- If this is a parent variant, also count IMEI child variants
    v_imei_children_count := 0;
    IF v_is_parent THEN
      SELECT COALESCE(SUM(quantity), 0) INTO v_imei_children_count
      FROM lats_product_variants
      WHERE parent_variant_id = v_variant_id
        AND variant_type = 'imei_child'
        AND is_active = TRUE;
    END IF;
    
    -- Total count = inventory_items + IMEI children
    v_total_count := v_available_count + v_imei_children_count;
    
    -- Update the variant quantity
    UPDATE lats_product_variants
    SET 
      quantity = v_total_count,
      updated_at = NOW()
    WHERE id = v_variant_id;
    
    -- Log the sync (optional, for debugging)
    RAISE NOTICE 'Synced variant % quantity to % (inventory_items: %, IMEI children: %)', 
      v_variant_id, v_total_count, v_available_count, v_imei_children_count;
  END IF;
  
  -- Return appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;



--
-- TOC entry 7795 (class 0 OID 0)
-- Dependencies: 507
-- Name: FUNCTION sync_variant_quantity_from_inventory(); Type: COMMENT; Schema: public; Owner: neondb_owner
--

For parent variants: quantity = inventory_items count + IMEI children count
For regular variants: quantity = inventory_items count
Triggered when inventory items are inserted, updated (status/variant changes), or deleted.';


--
-- TOC entry 694 (class 1255 OID 1204440)
-- Name: test_add_imei_function(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  func_exists TINYINT(1);
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'add_imei_to_parent_variant'
  ) INTO func_exists;
  
  IF func_exists THEN
    RETURN '✅ Function add_imei_to_parent_variant exists and is ready to use!';
  ELSE
    RETURN '❌ Function does not exist';
  END IF;



--
-- TOC entry 678 (class 1255 OID 1204441)
-- Name: test_payment_mirroring(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    test_customer_id CHAR(36);
    test_sale_id CHAR(36);
    test_account_id CHAR(36);
    test_payment_id CHAR(36);
    account_balance_before NUMERIC;
    account_balance_after NUMERIC;
    -- Test 1: Check if tables exist
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'customer_payments') THEN
        RETURN QUERY SELECT 'Table Existence'::TEXT, '✅ PASS'::TEXT, 'customer_payments table exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Table Existence'::TEXT, '❌ FAIL'::TEXT, 'customer_payments table missing'::TEXT;
        RETURN;
    END IF;

    -- Test 2: Check if required columns exist
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customer_payments' 
        AND column_name = 'sale_id'
    ) THEN
        RETURN QUERY SELECT 'Column: sale_id'::TEXT, '✅ PASS'::TEXT, 'sale_id column exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Column: sale_id'::TEXT, '❌ FAIL'::TEXT, 'sale_id column missing'::TEXT;
    END IF;

    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customer_payments' 
        AND column_name = 'reference_number'
    ) THEN
        RETURN QUERY SELECT 'Column: reference_number'::TEXT, '✅ PASS'::TEXT, 'reference_number column exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Column: reference_number'::TEXT, '❌ FAIL'::TEXT, 'reference_number column missing'::TEXT;
    END IF;

    -- Test 3: Check invalid columns don't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customer_payments' 
        AND column_name = 'payment_account_id'
    ) THEN
        RETURN QUERY SELECT 'Invalid Column Check'::TEXT, '✅ PASS'::TEXT, 'payment_account_id correctly absent'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Invalid Column Check'::TEXT, '⚠️ WARN'::TEXT, 'payment_account_id column should not exist'::TEXT;
    END IF;

    -- Test 4: Check indexes exist
    IF EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'customer_payments' 
        AND indexname = 'idx_customer_payments_sale_id'
    ) THEN
        RETURN QUERY SELECT 'Index: sale_id'::TEXT, '✅ PASS'::TEXT, 'idx_customer_payments_sale_id exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Index: sale_id'::TEXT, '⚠️ WARN'::TEXT, 'idx_customer_payments_sale_id missing'::TEXT;
    END IF;

    -- Test 5: Check finance_accounts table
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'finance_accounts') THEN
        RETURN QUERY SELECT 'Finance Accounts'::TEXT, '✅ PASS'::TEXT, 'finance_accounts table exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Finance Accounts'::TEXT, '⚠️ WARN'::TEXT, 'finance_accounts table missing (optional)'::TEXT;
    END IF;

    -- Test 6: Check account_transactions table
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'account_transactions') THEN
        RETURN QUERY SELECT 'Account Transactions'::TEXT, '✅ PASS'::TEXT, 'account_transactions table exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Account Transactions'::TEXT, '⚠️ WARN'::TEXT, 'account_transactions table missing (optional)'::TEXT;
    END IF;

    RETURN QUERY SELECT 'Overall Status'::TEXT, '✅ SUCCESS'::TEXT, 'Payment mirroring setup is correct'::TEXT;



--
-- TOC entry 681 (class 1255 OID 1204442)
-- Name: track_customer_activity(CHAR(36), character varying); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    UPDATE customers
    SET 
        last_activity_date = NOW(),
        last_visit = CASE 
            WHEN activity_type IN ('visit', 'checkin', 'purchase') THEN NOW()
            ELSE last_visit
        END,
        is_active = true,
        updated_at = NOW()
    WHERE id = customer_id;
    
    -- If customer doesn't exist, raise notice but don't error
    IF NOT FOUND THEN
        RAISE NOTICE 'Customer % not found for activity tracking', customer_id;
    END IF;



--
-- TOC entry 499 (class 1255 OID 1204443)
-- Name: track_po_payment_as_expense(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    DECLARE
      v_po_reference TEXT;
      v_po_supplier TEXT;
      v_user_id CHAR(36);
      v_branch_id CHAR(36);
      v_default_branch_id CHAR(36) := '115e0e51-d0d6-437b-9fda-dfe11241b167'::CHAR(36);
      IF NEW.status = 'completed' THEN
        
        -- Get PO details
          COALESCE(po.po_number, 'PO-' || po.id::TEXT),
          COALESCE(s.name, 'Unknown Supplier'),
          COALESCE(po.branch_id, v_default_branch_id)
        INTO v_po_reference, v_po_supplier, v_branch_id
        FROM lats_purchase_orders po
        LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
        WHERE po.id = NEW.purchase_order_id;
        
        -- Set default branch if still null
        IF v_branch_id IS NULL THEN
          v_branch_id := v_default_branch_id;
        END IF;
        
        v_user_id := NEW.created_by;
        IF v_user_id IS NULL THEN
          SELECT id INTO v_user_id FROM users LIMIT 1;
        END IF;
        
          -- Create expense record in the regular expenses table
          INSERT INTO expenses (
            branch_id,
            category,
            description,
            amount,
            date,
            reference_number,
            vendor_name,
            notes,
            payment_method,
            status,
            purchase_order_id,
            created_by,
            created_at,
            updated_at
          ) VALUES (
            v_branch_id,
            'Purchase Orders',
            'Purchase Order Payment: ' || v_po_reference,
            NEW.amount,
            COALESCE(NEW.payment_date::DATE, CURRENT_DATE),
            COALESCE(NEW.reference, 'PO-PAY-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
            v_po_supplier,
            COALESCE(NEW.notes, 'Payment for ' || v_po_reference || ' - ' || v_po_supplier),
            COALESCE(NEW.payment_method, 'cash'),
            'approved',
            NEW.purchase_order_id,
            v_user_id,
            NOW(),
            NOW()
          )
          ON CONFLICT DO NOTHING;
          
          RAISE NOTICE '✅ Created expense for PO payment %', NEW.id;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to create expense for PO payment %: %', NEW.id, SQLERRM;
        
      END IF;
      
      RETURN NEW;



--
-- TOC entry 583 (class 1255 OID 1204444)
-- Name: track_variant_data_source(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    -- Add metadata about data source if not already present
    IF NEW.variant_attributes IS NULL THEN
        NEW.variant_attributes := '{}'::JSON;
    END IF;
    
    -- Track if this is a new variant without a PO
    IF TG_OP = 'INSERT' THEN
        IF NOT EXISTS(SELECT 1 FROM lats_purchase_order_items WHERE variant_id = NEW.id) THEN
            NEW.variant_attributes := NEW.variant_attributes || 
                jsonb_build_object(
                    'data_source', 'manual',
                    'created_without_po', true,
                    'created_at', NOW()
                );
            
            RAISE NOTICE '⚠️  Variant created without purchase order: %', NEW.variant_name;
        END IF;
    END IF;
    
    RETURN NEW;



--
-- TOC entry 7796 (class 0 OID 0)
-- Dependencies: 583
-- Name: FUNCTION track_variant_data_source(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 464 (class 1255 OID 1204445)
-- Name: trigger_auto_reorder_check(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_po_id CHAR(36);
  v_recent_po CHAR(36);
  v_product_name TEXT;
  -- Only proceed if:
  -- 1. Auto-reorder is enabled
  -- 2. Stock decreased (not increased)
  -- 3. New quantity is at or below reorder point
  -- 4. Reorder point is set (> 0)
  
  IF NOT is_auto_reorder_enabled() THEN
    RETURN NEW;
  END IF;
  
  -- Check if this is a stock decrease below reorder point
  IF NEW.quantity <= NEW.reorder_point 
     AND NEW.reorder_point > 0
     AND (OLD.quantity IS NULL OR OLD.quantity > NEW.reorder_point) THEN
    
    -- Check if we already created a PO recently (within last hour) for this variant
    SELECT purchase_order_id INTO v_recent_po
    FROM auto_reorder_log
    WHERE variant_id = NEW.id
      AND po_created = true
      AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Only create PO if none created recently
    IF v_recent_po IS NULL THEN
      SELECT name INTO v_product_name FROM lats_products WHERE id = NEW.product_id;
      
      RAISE NOTICE '🔔 Stock Alert: % dropped to % (reorder point: %)', 
        v_product_name, NEW.quantity, NEW.reorder_point;
      
      -- Create purchase order
      v_po_id := auto_create_purchase_order_for_low_stock(
        NEW.id,
        NEW.product_id,
        NEW.quantity,
        NEW.reorder_point
      );
      
      IF v_po_id IS NOT NULL THEN
        RAISE NOTICE '✅ Auto-generated purchase order: %', v_po_id;
      END IF;
    ELSE
      RAISE NOTICE 'ℹ️  Skipping auto-reorder - PO already created recently for this variant';
    END IF;
  END IF;
  
  RETURN NEW;



--
-- TOC entry 455 (class 1255 OID 1204446)
-- Name: update_account_balance_secure(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  current_balance DECIMAL(15,2);
  calculated_balance_before DECIMAL(15,2);
  new_balance DECIMAL(15,2);
  last_transaction_balance DECIMAL(15,2) := 0;
  -- Get current account balance
  SELECT balance INTO current_balance
  FROM finance_accounts
  WHERE id = NEW.account_id;
  
  -- If no current balance, assume 0
  IF current_balance IS NULL THEN
    current_balance := 0;
  END IF;
  
  -- For validation: Calculate what balance_before SHOULD be
  -- This is the balance_after of the most recent transaction, or 0 if none
  SELECT balance_after INTO last_transaction_balance
  FROM account_transactions
  WHERE account_id = NEW.account_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no previous transaction, balance_before should be 0
  IF last_transaction_balance IS NULL THEN
    calculated_balance_before := 0;
  ELSE
    calculated_balance_before := last_transaction_balance;
  END IF;
  
  -- VALIDATION: Check if current account balance matches what we expect
  -- If there's a discrepancy, log it but continue (for now)
  IF current_balance != calculated_balance_before THEN
    RAISE WARNING 'Balance discrepancy detected for account %: account_balance=%, expected=%', 
      NEW.account_id, current_balance, calculated_balance_before;
    
    -- Use the calculated balance as the correct baseline
    current_balance := calculated_balance_before;
  END IF;
  
  -- Store the CORRECT balance_before
  NEW.balance_before := current_balance;
  
  -- Calculate new balance based on transaction type
  CASE NEW.transaction_type
    WHEN 'payment_received', 'transfer_in', 'income' THEN
      new_balance := current_balance + NEW.amount;
    WHEN 'payment_made', 'expense', 'transfer_out', 'withdrawal' THEN
      new_balance := current_balance - NEW.amount;
    WHEN 'adjustment' THEN
      -- Adjustments use the amount as-is (can be positive or negative)
      new_balance := current_balance + NEW.amount;
    WHEN 'reversal' THEN
      -- Reversals don't change balance (handled manually)
      new_balance := current_balance;
    ELSE
      -- Unknown transaction type - don't change balance
      new_balance := current_balance;
      RAISE WARNING 'Unknown transaction type: %, balance unchanged', NEW.transaction_type;
  END CASE;
  
  -- Store balance after transaction
  NEW.balance_after := new_balance;
  
  -- Update the account balance
  UPDATE finance_accounts
  SET 
    balance = new_balance,
    updated_at = NOW()
  WHERE id = NEW.account_id;
  
  -- Log successful balance update
  RAISE NOTICE 'Account % balance updated: % -> % (type: %)', 
    NEW.account_id, current_balance, new_balance, NEW.transaction_type;
  
  RETURN NEW;



--
-- TOC entry 541 (class 1255 OID 1204447)
-- Name: update_api_keys_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  NEW.updated_at = NOW();
  RETURN NEW;



--
-- TOC entry 619 (class 1255 OID 1204448)
-- Name: update_branch_transfer_timestamp(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  NEW.updated_at = NOW();
  RETURN NEW;



--
-- TOC entry 602 (class 1255 OID 1204449)
-- Name: update_customer_activity(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    UPDATE customers
    SET 
        last_activity_date = NOW(),
        last_visit = NOW(),
        is_active = true,
        updated_at = NOW()
    WHERE id = customer_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Customer % not found for activity update', customer_id;
    END IF;



--
-- TOC entry 631 (class 1255 OID 1204450)
-- Name: update_customer_installment_plan_balance(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    UPDATE customer_installment_plans
    SET 
        total_paid = (
            SELECT COALESCE(SUM(amount), 0)
            FROM customer_installment_plan_payments
            WHERE installment_plan_id = NEW.installment_plan_id
        ),
        balance_due = amount_financed - (
            SELECT COALESCE(SUM(amount), 0)
            FROM customer_installment_plan_payments
            WHERE installment_plan_id = NEW.installment_plan_id
        ),
        installments_paid = (
            SELECT COUNT(*)
            FROM customer_installment_plan_payments
            WHERE installment_plan_id = NEW.installment_plan_id
            AND status = 'paid'
        ),
        status = CASE
            WHEN amount_financed - (
                SELECT COALESCE(SUM(amount), 0)
                FROM customer_installment_plan_payments
                WHERE installment_plan_id = NEW.installment_plan_id
            ) <= 0 THEN 'completed'
            ELSE status
        END,
        completion_date = CASE
            WHEN amount_financed - (
                SELECT COALESCE(SUM(amount), 0)
                FROM customer_installment_plan_payments
                WHERE installment_plan_id = NEW.installment_plan_id
            ) <= 0 THEN now()
            ELSE completion_date
        END,
        updated_at = now()
    WHERE id = NEW.installment_plan_id;
    
    RETURN NEW;



--
-- TOC entry 494 (class 1255 OID 1204451)
-- Name: update_customer_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = NOW();
    RETURN NEW;



--
-- TOC entry 486 (class 1255 OID 1204452)
-- Name: update_daily_reports_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = now();
    RETURN NEW;



--
-- TOC entry 551 (class 1255 OID 1204453)
-- Name: update_daily_sales_closures_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = NOW();
    RETURN NEW;



--
-- TOC entry 528 (class 1255 OID 1204454)
-- Name: update_document_templates_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  NEW.updated_at = NOW();
  RETURN NEW;



--
-- TOC entry 517 (class 1255 OID 1204455)
-- Name: update_installment_plan_balance(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_total_paid NUMERIC;
    v_balance_due NUMERIC;
    v_installments_paid INTEGER;
    v_total_installments INTEGER;
    v_amount_financed NUMERIC;
    v_all_paid TINYINT(1);
    -- Calculate totals from all payments
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM installment_payments
    WHERE installment_plan_id = NEW.installment_plan_id;
    
    -- Get plan details
    SELECT amount_financed, number_of_installments INTO v_amount_financed, v_total_installments
    FROM customer_installment_plans
    WHERE id = NEW.installment_plan_id;
    
    -- Calculate balance due
    v_balance_due := v_amount_financed - v_total_paid;
    
    -- Count unique paid installments (excluding down payment which is installment_number 0)
    SELECT COUNT(DISTINCT installment_number) INTO v_installments_paid
    FROM installment_payments
    WHERE installment_plan_id = NEW.installment_plan_id
    AND status = 'paid'
    AND installment_number > 0;
    
    -- Check if all installments are paid (must have paid all required installments AND balance is zero/negative)
    -- This ensures completion only happens when ALL installments are received
    v_all_paid := (v_installments_paid >= v_total_installments) AND (v_balance_due <= 0);
    
    -- Update the plan
    UPDATE customer_installment_plans
    SET 
        total_paid = v_total_paid,
        balance_due = v_balance_due,
        installments_paid = v_installments_paid,
        status = CASE
            -- Only mark as completed if ALL installments are paid AND balance is zero
            WHEN v_all_paid THEN 'completed'
            -- Reset to active if status was incorrectly set to completed but not all installments are paid
            WHEN status = 'completed' AND NOT v_all_paid THEN 'active'
            ELSE status
        END,
        completion_date = CASE
            -- Only set completion date when truly completed
            WHEN v_all_paid THEN now()
            -- Clear completion date if not truly completed
            ELSE NULL
        END,
        updated_at = now()
    WHERE id = NEW.installment_plan_id;
    
    RETURN NEW;



--
-- TOC entry 7797 (class 0 OID 0)
-- Dependencies: 517
-- Name: FUNCTION update_installment_plan_balance(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 702 (class 1255 OID 1204456)
-- Name: update_inventory_items_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  NEW.updated_at = NOW();
  RETURN NEW;



--
-- TOC entry 545 (class 1255 OID 1204457)
-- Name: update_inventory_setting(text, text, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  old_val TEXT;
  user_id TEXT;
  -- Get current value
  SELECT setting_value INTO old_val 
  FROM admin_settings 
  WHERE category = 'inventory' AND setting_key = key_name;
  
  -- Update the setting
  UPDATE admin_settings 
  SET setting_value = new_value, updated_at = NOW()
  WHERE category = 'inventory' AND setting_key = key_name;
  
  -- Log the change if admin_settings_log table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_settings_log') THEN
    -- Get current user (if available from context)
    user_id := current_setting('app.current_user_id', true);
    IF user_id IS NULL THEN
      user_id := 'system';
    END IF;
    
    INSERT INTO admin_settings_log (category, setting_key, old_value, new_value, changed_by, change_reason)
    VALUES ('inventory', key_name, old_val, new_value, user_id, reason);
  END IF;
  
  RETURN TRUE;



--
-- TOC entry 704 (class 1255 OID 1204458)
-- Name: update_lats_suppliers_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = now();
    RETURN NEW;



--
-- TOC entry 591 (class 1255 OID 1204459)
-- Name: update_notifications_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = NOW();
    RETURN NEW;



--
-- TOC entry 445 (class 1255 OID 1204460)
-- Name: update_parent_quantity_trigger(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_parent_id CHAR(36);
    v_product_id CHAR(36);
    -- Determine parent_variant_id and product_id based on operation
    IF TG_OP = 'DELETE' THEN
        v_parent_id := OLD.parent_variant_id;
        v_product_id := OLD.product_id;
    ELSE
        v_parent_id := NEW.parent_variant_id;
        v_product_id := NEW.product_id;
    END IF;
    
    -- Update parent quantity if this is a child variant
    IF v_parent_id IS NOT NULL THEN
        UPDATE lats_product_variants
        SET 
            quantity = (
                SELECT COUNT(*)
                FROM lats_product_variants
                WHERE parent_variant_id = v_parent_id
                  AND is_active = true
                  AND quantity > 0
            ),
            updated_at = NOW()
        WHERE id = v_parent_id;
    END IF;
    
    -- Update product stock quantity
    IF v_product_id IS NOT NULL THEN
        UPDATE lats_products
        SET 
            stock_quantity = (
                SELECT COALESCE(SUM(v.quantity), 0)
                FROM lats_product_variants v
                WHERE v.product_id = v_product_id
                  AND v.is_active = TRUE
                  AND (v.variant_type = 'parent' OR v.parent_variant_id IS NULL)
            ),
            updated_at = NOW()
        WHERE id = v_product_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;



--
-- TOC entry 508 (class 1255 OID 1204461)
-- Name: update_parent_stock_from_children(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_parent_id CHAR(36);
  v_new_total INT;
  v_product_id CHAR(36);
  -- Determine the parent ID
  IF TG_OP = 'DELETE' THEN
    v_parent_id := OLD.parent_variant_id;
  ELSE
    v_parent_id := NEW.parent_variant_id;
  END IF;

  -- Only process if this is an IMEI child variant with a parent
  IF v_parent_id IS NOT NULL AND (
    (TG_OP = 'DELETE' AND OLD.variant_type = 'imei_child') OR
    (TG_OP IN ('INSERT', 'UPDATE') AND NEW.variant_type = 'imei_child')
  ) THEN
    -- Calculate total quantity from all active IMEI children
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_new_total
    FROM lats_product_variants
    WHERE parent_variant_id = v_parent_id
      AND variant_type = 'imei_child'
      AND is_active = TRUE;

    -- Get product ID from parent
    SELECT product_id INTO v_product_id
    FROM lats_product_variants
    WHERE id = v_parent_id;

    -- Update parent variant quantity
    UPDATE lats_product_variants
    SET 
      quantity = v_new_total,
      updated_at = NOW()
    WHERE id = v_parent_id;
    
    -- Update product stock_quantity
    IF v_product_id IS NOT NULL THEN
      UPDATE lats_products
      SET 
        stock_quantity = (
          SELECT COALESCE(SUM(quantity), 0)
          FROM lats_product_variants
          WHERE product_id = v_product_id
            AND is_active = TRUE
            AND (variant_type = 'parent' OR variant_type = 'standard')
        ),
        updated_at = NOW()
      WHERE id = v_product_id;
    END IF;
    
    RAISE NOTICE '✅ Parent % stock updated to % (Product: %)', v_parent_id, v_new_total, v_product_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;



--
-- TOC entry 7798 (class 0 OID 0)
-- Dependencies: 508
-- Name: FUNCTION update_parent_stock_from_children(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 514 (class 1255 OID 1204462)
-- Name: update_po_payments_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  NEW.updated_at = NOW();
  RETURN NEW;



--
-- TOC entry 632 (class 1255 OID 1204463)
-- Name: update_po_shipping_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = NOW();
    RETURN NEW;



--
-- TOC entry 529 (class 1255 OID 1204464)
-- Name: update_product_images_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = now();
    RETURN NEW;



--
-- TOC entry 608 (class 1255 OID 1204465)
-- Name: update_product_totals(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

      -- Update the parent product's total_quantity and total_value
      UPDATE lats_products
      SET 
        total_quantity = (
          SELECT COALESCE(SUM(quantity), 0)
          FROM lats_product_variants
          WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        ),
        total_value = (
          SELECT COALESCE(SUM(quantity * selling_price), 0)
          FROM lats_product_variants
          WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        ),
        updated_at = NOW()
      WHERE id = COALESCE(NEW.product_id, OLD.product_id);
      
      RETURN NEW;



--
-- TOC entry 7799 (class 0 OID 0)
-- Dependencies: 608
-- Name: FUNCTION update_product_totals(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 550 (class 1255 OID 1204466)
-- Name: update_product_variant_count(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    UPDATE lats_products
    SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::JSON),
        '{variantCount}',
        to_jsonb((SELECT COUNT(*) FROM lats_product_variants WHERE product_id = COALESCE(NEW.product_id, OLD.product_id))::integer)
    )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);



--
-- TOC entry 707 (class 1255 OID 1204467)
-- Name: update_purchase_order_payment_status(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  order_total DECIMAL(15,2);
  total_payments DECIMAL(15,2);
  new_payment_status TEXT;
  -- Get the total amount for the purchase order
  SELECT total_amount INTO order_total
  FROM lats_purchase_orders
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

  -- Calculate total payments for this purchase order
  SELECT COALESCE(SUM(amount), 0) INTO total_payments
  FROM purchase_order_payments
  WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
    AND status = 'completed';

  -- Determine payment status
  IF total_payments >= order_total THEN
    new_payment_status := 'paid';
  ELSIF total_payments > 0 THEN
    new_payment_status := 'partial';
  ELSE
    new_payment_status := 'unpaid';
  END IF;

  -- Update the purchase order
  UPDATE lats_purchase_orders
  SET 
    total_paid = total_payments,
    payment_status = new_payment_status,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

  RETURN COALESCE(NEW, OLD);



--
-- TOC entry 603 (class 1255 OID 1204468)
-- Name: update_purchase_order_payments_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  NEW.updated_at = NOW();
  RETURN NEW;



--
-- TOC entry 691 (class 1255 OID 1204469)
-- Name: update_reminders_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  NEW.updated_at = NOW();
  RETURN NEW;



--
-- TOC entry 693 (class 1255 OID 1204470)
-- Name: update_reports_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = NOW();
    RETURN NEW;



--
-- TOC entry 701 (class 1255 OID 1204471)
-- Name: update_returns_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = NOW();
    RETURN NEW;



--
-- TOC entry 656 (class 1255 OID 1204472)
-- Name: update_scheduled_transfers_timestamp(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  NEW.updated_at = NOW();
  RETURN NEW;



--
-- TOC entry 473 (class 1255 OID 1204473)
-- Name: update_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  NEW.updated_at = NOW();
  RETURN NEW;



--
-- TOC entry 495 (class 1255 OID 1204474)
-- Name: update_shipping_agents_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = NOW();
    RETURN NEW;



--
-- TOC entry 454 (class 1255 OID 1204475)
-- Name: update_shipping_methods_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = NOW();
    RETURN NEW;



--
-- TOC entry 682 (class 1255 OID 1204476)
-- Name: update_shipping_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = NOW();
    RETURN NEW;



--
-- TOC entry 458 (class 1255 OID 1204477)
-- Name: update_special_order_balance(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    UPDATE customer_special_orders
    SET 
        deposit_paid = (
            SELECT COALESCE(SUM(amount), 0)
            FROM special_order_payments
            WHERE special_order_id = NEW.special_order_id
        ),
        balance_due = total_amount - (
            SELECT COALESCE(SUM(amount), 0)
            FROM special_order_payments
            WHERE special_order_id = NEW.special_order_id
        ),
        updated_at = now()
    WHERE id = NEW.special_order_id;
    
    RETURN NEW;



--
-- TOC entry 617 (class 1255 OID 1204478)
-- Name: update_store_locations_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  NEW.updated_at = NOW();
  RETURN NEW;



--
-- TOC entry 570 (class 1255 OID 1204479)
-- Name: update_supplier_average_rating(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  UPDATE lats_suppliers
  SET average_rating = (
    SELECT AVG(overall_rating)::NUMERIC(3,2)
    FROM lats_supplier_ratings
    WHERE supplier_id = NEW.supplier_id
  )
  WHERE id = NEW.supplier_id;
  RETURN NEW;



--
-- TOC entry 677 (class 1255 OID 1204480)
-- Name: update_supplier_last_contact(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  UPDATE lats_suppliers
  SET last_contact_date = CURRENT_DATE
  WHERE id = NEW.supplier_id;
  RETURN NEW;



--
-- TOC entry 527 (class 1255 OID 1204481)
-- Name: update_supplier_on_time_delivery(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  total_completed INTEGER;
  on_time_completed INTEGER;
  delivery_rate NUMERIC;
  -- Count total completed orders
  SELECT COUNT(*) INTO total_completed
  FROM lats_purchase_orders
  WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
    AND status IN ('received', 'completed');
  
  -- Count on-time deliveries (received before or on expected date)
  SELECT COUNT(*) INTO on_time_completed
  FROM lats_purchase_orders
  WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
    AND status IN ('received', 'completed')
    AND expected_delivery_date IS NOT NULL
    AND updated_at <= expected_delivery_date;
  
  -- Calculate rate
  IF total_completed > 0 THEN
    delivery_rate := (on_time_completed::NUMERIC / total_completed::NUMERIC) * 100;
  ELSE
    delivery_rate := 0;
  END IF;
  
  -- Update supplier
  UPDATE lats_suppliers
  SET on_time_delivery_rate = ROUND(delivery_rate, 2)
  WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  
  RETURN COALESCE(NEW, OLD);



--
-- TOC entry 7800 (class 0 OID 0)
-- Dependencies: 527
-- Name: FUNCTION update_supplier_on_time_delivery(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 519 (class 1255 OID 1204482)
-- Name: update_supplier_order_value(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Update total order value for the supplier
  UPDATE lats_suppliers
  SET total_order_value = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM lats_purchase_orders
    WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
  )
  WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  
  RETURN COALESCE(NEW, OLD);



--
-- TOC entry 7801 (class 0 OID 0)
-- Dependencies: 519
-- Name: FUNCTION update_supplier_order_value(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 595 (class 1255 OID 1204483)
-- Name: update_supplier_response_time(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  avg_response_hours NUMERIC;
  -- Calculate average response time from inbound communications
  -- This is a simplified calculation - you can enhance based on your needs
  SELECT AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) / 3600)
  INTO avg_response_hours
  FROM (
    SELECT created_at
    FROM lats_supplier_communications
    WHERE supplier_id = NEW.supplier_id
      AND direction = 'inbound'
    ORDER BY created_at DESC
    LIMIT 10
  ) recent_comms;
  
  -- Update supplier if we have data
  IF avg_response_hours IS NOT NULL THEN
    UPDATE lats_suppliers
    SET response_time_hours = ROUND(avg_response_hours, 1)
    WHERE id = NEW.supplier_id;
  END IF;
  
  RETURN NEW;



--
-- TOC entry 7802 (class 0 OID 0)
-- Dependencies: 595
-- Name: FUNCTION update_supplier_response_time(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 627 (class 1255 OID 1204484)
-- Name: update_supplier_total_orders(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Update total orders count for the supplier
  UPDATE lats_suppliers
  SET total_orders = (
    SELECT COUNT(*)
    FROM lats_purchase_orders
    WHERE supplier_id = NEW.supplier_id
  )
  WHERE id = NEW.supplier_id;
  
  RETURN NEW;



--
-- TOC entry 7803 (class 0 OID 0)
-- Dependencies: 627
-- Name: FUNCTION update_supplier_total_orders(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 669 (class 1255 OID 1204485)
-- Name: update_trade_in_timestamp(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at := now();
    RETURN NEW;



--
-- TOC entry 512 (class 1255 OID 1204486)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.updated_at = now();
    RETURN NEW;



--
-- TOC entry 636 (class 1255 OID 1204487)
-- Name: update_user_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

          NEW.updated_at = NOW();
          RETURN NEW;



--
-- TOC entry 497 (class 1255 OID 1204488)
-- Name: update_variant_stock_on_movement(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_should_calculate TINYINT(1) := true;
    v_is_reversal TINYINT(1) := false;
    -- Get the current quantity of the variant
    SELECT quantity INTO v_current_quantity
    FROM lats_product_variants
    WHERE id = NEW.variant_id;
    
    -- If variant doesn't exist, skip the update
    IF NOT FOUND THEN
        RAISE NOTICE 'Variant % not found', NEW.variant_id;
        RETURN NEW;
    END IF;
    
    -- Check if this is a sale reversal
    v_is_reversal := (NEW.reason = 'Sale Reversal' OR NEW.reason ILIKE '%reversal%');
    
    -- ✅ CRITICAL FIX: If new_quantity is already set (by application code),
    -- use it directly instead of calculating. This prevents double updates.
    -- Check both NEW.new_quantity and if it's a reversal with new_quantity set
    IF (NEW.new_quantity IS NOT NULL AND NEW.new_quantity >= 0) THEN
        v_new_quantity := NEW.new_quantity;
        v_should_calculate := false;
        RAISE NOTICE 'Using pre-set new_quantity: % (skipping calculation)', v_new_quantity;
    ELSIF v_is_reversal AND NEW.previous_quantity IS NOT NULL THEN
        -- For reversals, if previous_quantity is set, it means we want to restore to that
        -- But we need to check the sale's original previous_quantity, not the reversal's
        -- For now, calculate based on current + quantity (will be fixed by code setting new_quantity)
        v_should_calculate := true;
    END IF;
    
    -- Only calculate if new_quantity wasn't pre-set
    IF v_should_calculate THEN
        -- Calculate the new quantity based on movement type
        CASE NEW.movement_type
            WHEN 'in' THEN
                v_new_quantity := v_current_quantity + NEW.quantity;
            WHEN 'out' THEN
                v_new_quantity := v_current_quantity - NEW.quantity;
            WHEN 'sale' THEN
                -- Sales reduce stock
                v_new_quantity := v_current_quantity - NEW.quantity;
            WHEN 'adjustment' THEN
                -- For adjustments, the quantity can be positive or negative
                v_new_quantity := v_current_quantity + NEW.quantity;
            WHEN 'transfer' THEN
                -- Transfers are handled separately, but just in case
                v_new_quantity := v_current_quantity;
            ELSE
                -- Default: treat as adjustment
                v_new_quantity := v_current_quantity + NEW.quantity;
        END CASE;
        
        -- Ensure quantity doesn't go negative
        IF v_new_quantity < 0 THEN
            v_new_quantity := 0;
            RAISE NOTICE 'Quantity would be negative, setting to 0';
        END IF;
    END IF;
    
    -- Update the variant quantity
    UPDATE lats_product_variants
    SET 
        quantity = v_new_quantity,
        updated_at = NOW()
    WHERE id = NEW.variant_id;
    
    -- Update the stock movement record with before/after quantities
    -- Only set if they weren't already set
    IF NEW.previous_quantity IS NULL THEN
        NEW.previous_quantity := v_current_quantity;
    END IF;
    
    -- ✅ CRITICAL: Only overwrite new_quantity if we calculated it
    -- If it was pre-set, keep the pre-set value
    IF v_should_calculate THEN
        NEW.new_quantity := v_new_quantity;
    END IF;
    -- If new_quantity was pre-set, it's already in NEW.new_quantity, don't overwrite
    
    RAISE NOTICE 'Updated variant % quantity from % to % (calculated: %)', 
        NEW.variant_id, v_current_quantity, v_new_quantity, v_should_calculate;
    
    RETURN NEW;



--
-- TOC entry 705 (class 1255 OID 1204489)
-- Name: update_webhook_endpoints_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  NEW.updated_at = NOW();
  RETURN NEW;



--
-- TOC entry 524 (class 1255 OID 1204490)
-- Name: validate_all_imeis(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    id as variant_id,
    COALESCE(attributes->>'imei', name) as imei,
    validate_imei_format(COALESCE(attributes->>'imei', name)) as is_valid,
    CASE 
      WHEN NOT validate_imei_format(COALESCE(attributes->>'imei', name)) 
      THEN 'Invalid format (not 15 digits)'
      ELSE 'Valid'
    END as issue
  FROM lats_product_variants
  WHERE variant_type = 'imei'
  ORDER BY is_valid ASC, created_at DESC;



--
-- TOC entry 612 (class 1255 OID 1204491)
-- Name: validate_and_repair_account_balances(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  account_record RECORD;
  txn_record RECORD;
  running_balance DECIMAL(15,2) := 0;
  issues_count INTEGER := 0;
  repair_count INTEGER := 0;
  -- Disable trigger temporarily during repair
  ALTER TABLE account_transactions DISABLE TRIGGER trigger_update_account_balance_secure;
  
  -- Process each account
  FOR account_record IN 
    SELECT DISTINCT account_id FROM account_transactions 
    ORDER BY account_id
  LOOP
    -- Reset counters for this account
    running_balance := 0;
    issues_count := 0;
    repair_count := 0;
    
    -- Process transactions for this account in chronological order
    FOR txn_record IN 
      SELECT * FROM account_transactions 
      WHERE account_id = account_record.account_id
      ORDER BY created_at ASC
    LOOP
      -- Check if balance_before is correct
      IF txn_record.balance_before != running_balance THEN
        issues_count := issues_count + 1;
        
        -- Repair the balance_before
        UPDATE account_transactions 
        SET balance_before = running_balance
        WHERE id = txn_record.id;
        
        repair_count := repair_count + 1;
      END IF;
      
      -- Recalculate balance_after
      CASE txn_record.transaction_type
        WHEN 'payment_received', 'transfer_in', 'income' THEN
          running_balance := running_balance + txn_record.amount;
        WHEN 'payment_made', 'expense', 'transfer_out', 'withdrawal' THEN
          running_balance := running_balance - txn_record.amount;
        WHEN 'adjustment' THEN
          running_balance := running_balance + txn_record.amount;
        WHEN 'reversal' THEN
          -- No change for reversals
          NULL;
        ELSE
          -- No change for unknown types
          NULL;
      END CASE;
      
      -- Update balance_after if incorrect
      IF txn_record.balance_after != running_balance THEN
        UPDATE account_transactions 
        SET balance_after = running_balance
        WHERE id = txn_record.id;
        
        IF repair_count = 0 THEN
          repair_count := repair_count + 1; -- Count as repaired if balance_after was wrong
        END IF;
      END IF;
    END LOOP;
    
    -- Update the account balance to match final calculated balance
    UPDATE finance_accounts 
    SET balance = running_balance, updated_at = NOW()
    WHERE id = account_record.account_id;
    
    -- Return results for this account
    RETURN QUERY SELECT 
      account_record.account_id, 
      issues_count, 
      repair_count;
  END LOOP;
  
  -- Re-enable trigger
  ALTER TABLE account_transactions ENABLE TRIGGER trigger_update_account_balance_secure;
  



--
-- TOC entry 676 (class 1255 OID 1204492)
-- Name: validate_and_set_imei_status(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    -- Only for imei_child variants
    IF NEW.variant_type = 'imei_child' THEN
        -- Ensure variant_attributes is initialized
        IF NEW.variant_attributes IS NULL THEN
            NEW.variant_attributes := '{}'::JSON;
        END IF;
        
        -- If IMEI is provided but status is not set, set it to 'valid'
        IF NEW.variant_attributes->>'imei' IS NOT NULL 
           AND NEW.variant_attributes->>'imei' != ''
           AND (NEW.variant_attributes->>'imei_status' IS NULL 
                OR NEW.variant_attributes->>'imei_status' = '') THEN
            NEW.variant_attributes := jsonb_set(
                NEW.variant_attributes,
                '{imei_status}',
                '"valid"'::JSON
            );
        END IF;
    END IF;
    
    RETURN NEW;



--
-- TOC entry 616 (class 1255 OID 1204493)
-- Name: validate_imei_format(text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN imei_value ~ '^\d{15}$';
$_$;



--
-- TOC entry 450 (class 1255 OID 1204494)
-- Name: validate_new_imei(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_imei TEXT;
  v_serial_number TEXT;
  v_identifier TEXT; -- Unified IMEI/INT AUTO_INCREMENT Number
  -- Only for imei_child variants
  IF NEW.variant_type = 'imei_child' THEN
      -- Get IMEI/INT AUTO_INCREMENT Number from variant_attributes (they're the same now)
      v_imei := NEW.variant_attributes->>'imei';
      v_serial_number := NEW.variant_attributes->>'serial_number';
      
      -- Use whichever is provided (they should be the same)
      v_identifier := COALESCE(v_imei, v_serial_number);
      
      -- ✅ REMOVED: No format validation - allow any string value
      -- Only check that we have some identifier (not empty string)
      IF v_identifier IS NOT NULL AND v_identifier != '' THEN
          -- Check for duplicates in active variants (check both imei and serial_number fields)
          IF TG_OP = 'INSERT' THEN
            IF EXISTS (
                SELECT 1 FROM lats_product_variants
                WHERE variant_type = 'imei_child'
                  AND (
                    variant_attributes->>'imei' = v_identifier
                    OR variant_attributes->>'serial_number' = v_identifier
                  )
                  AND is_active = TRUE
            ) THEN
                RAISE EXCEPTION 'Duplicate IMEI/INT AUTO_INCREMENT Number: %', v_identifier;
            END IF;
          ELSIF TG_OP = 'UPDATE' THEN
            IF EXISTS (
                SELECT 1 FROM lats_product_variants
                WHERE variant_type = 'imei_child'
                  AND (
                    variant_attributes->>'imei' = v_identifier
                    OR variant_attributes->>'serial_number' = v_identifier
                  )
                  AND is_active = TRUE
                  AND id != NEW.id
            ) THEN
                RAISE EXCEPTION 'Duplicate IMEI/INT AUTO_INCREMENT Number: %', v_identifier;
            END IF;
          END IF;
      END IF;
      -- ✅ Allow NULL or empty IMEI/INT AUTO_INCREMENT Number (for flexibility)
  END IF;

  RETURN NEW;



--
-- TOC entry 581 (class 1255 OID 1204495)
-- Name: validate_po_inventory_consistency(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  po_record RECORD;
  item_record RECORD;
  -- Check each PO item for consistency
  FOR po_record IN 
    SELECT id, po_number, status FROM lats_purchase_orders 
    WHERE status IN ('received', 'partial_received')
    ORDER BY created_at DESC
  LOOP
    FOR item_record IN
        poi.id,
        poi.purchase_order_id,
        poi.variant_id,
        poi.quantity_ordered,
        poi.quantity_received,
        pv.quantity as variant_stock,
        COUNT(ii.id) as inventory_count
      FROM lats_purchase_order_items poi
      LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
      LEFT JOIN inventory_items ii ON ii.purchase_order_item_id = poi.id AND ii.status = 'available'
      WHERE poi.purchase_order_id = po_record.id
      GROUP BY poi.id, poi.purchase_order_id, poi.variant_id, poi.quantity_ordered, poi.quantity_received, pv.quantity
    LOOP
      -- Check for inconsistencies
      IF item_record.quantity_received != item_record.inventory_count THEN
        RETURN QUERY SELECT 
          po_record.id,
          item_record.id,
          format('PO shows %s received, but %s inventory items exist', item_record.quantity_received, item_record.inventory_count),
          'Inventory count mismatch - may need manual reconciliation';
      END IF;
      
      IF item_record.variant_id IS NOT NULL AND item_record.variant_stock < item_record.quantity_received THEN
        RETURN QUERY SELECT 
          po_record.id,
          item_record.id,
          format('Variant stock (%s) is less than received quantity (%s)', item_record.variant_stock, item_record.quantity_received),
          'Stock quantity too low - may need stock adjustment';
      END IF;
      
      IF item_record.quantity_received > item_record.quantity_ordered THEN
        RETURN QUERY SELECT 
          po_record.id,
          item_record.id,
          format('Received quantity (%s) exceeds ordered quantity (%s)', item_record.quantity_received, item_record.quantity_ordered),
          'Over-receipt detected - may need investigation';
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN;



--
-- TOC entry 462 (class 1255 OID 1204496)
-- Name: validate_sale_amount(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

        IF NEW.total_amount < 0 THEN
          RAISE EXCEPTION 'Sale total cannot be negative: %', NEW.total_amount;
        END IF;
        
        IF NEW.total_amount > 1000000000 THEN
          RAISE EXCEPTION 'Sale total is unreasonably large: %. Max allowed is 1 billion', NEW.total_amount;
        END IF;
        
        RETURN NEW;



--
-- TOC entry 667 (class 1255 OID 1204497)
-- Name: validate_variant_price(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    -- Warn if both prices are zero/null
    IF (NEW.unit_price IS NULL OR NEW.unit_price <= 0) 
       AND (NEW.selling_price IS NULL OR NEW.selling_price <= 0) THEN
        RAISE WARNING 'Variant % for product % has no valid price!', NEW.name, NEW.product_id;
    END IF;
    
    RETURN NEW;



--
-- TOC entry 562 (class 1255 OID 1204498)
-- Name: validate_variant_prices(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_old_cost NUMERIC;
    v_old_price NUMERIC;
    v_has_po TINYINT(1);
    -- Store old values for audit
    IF TG_OP = 'UPDATE' THEN
        v_old_cost := OLD.cost_price;
        v_old_price := OLD.selling_price;
    END IF;
    
    -- Check if this variant has a purchase order source
    SELECT EXISTS(
        SELECT 1 FROM lats_purchase_order_items 
        WHERE variant_id = NEW.id
    ) INTO v_has_po;
    
    -- RULE 1: Prevent suspiciously high markups (> 100,000%)
    IF NEW.cost_price > 0 AND NEW.selling_price > 0 THEN
        IF ((NEW.selling_price - NEW.cost_price) / NEW.cost_price * 100) > 100000 THEN
            RAISE WARNING '⚠️  SUSPICIOUS MARKUP: Variant % has %.0%% markup. Please verify pricing.', 
                NEW.variant_name,
                ((NEW.selling_price - NEW.cost_price) / NEW.cost_price * 100);
        END IF;
    END IF;
    
    -- RULE 2: Warn if cost is changed without a PO
    IF TG_OP = 'UPDATE' AND v_old_cost != NEW.cost_price AND NOT v_has_po THEN
        RAISE WARNING '⚠️  Cost price changed without purchase order for variant %. Consider creating a PO for audit trail.', 
            NEW.variant_name;
    END IF;
    
    -- RULE 3: Prevent negative prices
    IF NEW.cost_price < 0 OR NEW.selling_price < 0 THEN
        RAISE EXCEPTION '❌ Negative prices not allowed. Cost: %, Selling: %', 
            NEW.cost_price, NEW.selling_price;
    END IF;
    
    -- RULE 4: Warn if selling price is less than cost
    IF NEW.cost_price > 0 AND NEW.selling_price > 0 AND NEW.selling_price < NEW.cost_price THEN
        RAISE WARNING '⚠️  LOSS ALERT: Variant % selling price (%) is less than cost (%). This will result in a loss.', 
            NEW.variant_name, NEW.selling_price, NEW.cost_price;
    END IF;
    
    -- Log significant changes
    IF TG_OP = 'UPDATE' THEN
        IF v_old_cost != NEW.cost_price THEN
            INSERT INTO lats_data_audit_log 
                (table_name, record_id, field_name, old_value, new_value, change_source)
            VALUES 
                ('lats_product_variants', NEW.id, 'cost_price', 
                 v_old_cost::TEXT, NEW.cost_price::TEXT, 'manual_edit');
        END IF;
        
        IF v_old_price != NEW.selling_price THEN
            INSERT INTO lats_data_audit_log 
                (table_name, record_id, field_name, old_value, new_value, change_source)
            VALUES 
                ('lats_product_variants', NEW.id, 'selling_price', 
                 v_old_price::TEXT, NEW.selling_price::TEXT, 'manual_edit');
        END IF;
    END IF;
    
    RETURN NEW;



--
-- TOC entry 7804 (class 0 OID 0)
-- Dependencies: 562
-- Name: FUNCTION validate_variant_prices(); Type: COMMENT; Schema: public; Owner: neondb_owner
--





--
-- TOC entry 229 (class 1259 OID 1204499)
-- Name: users_sync; Type: TABLE; Schema: neon_auth; Owner: neondb_owner
--

CREATE TABLE neon_auth.users_sync (
    raw_json JSON NOT NULL,
    id text GENERATED ALWAYS AS ((raw_json ->> 'id'::text)) STORED NOT NULL,
    name text GENERATED ALWAYS AS ((raw_json ->> 'display_name'::text)) STORED,
    email text GENERATED ALWAYS AS ((raw_json ->> 'primary_email'::text)) STORED,
    created_at DATETIME GENERATED ALWAYS AS (to_timestamp((trunc((((raw_json ->> 'signed_up_at_millis'::text))::bigint)::double precision) / (1000)::double precision))) STORED,
    updated_at DATETIME,
    deleted_at DATETIME
);



--
-- TOC entry 230 (class 1259 OID 1204508)
-- Name: account_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE account_transactions (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    account_id CHAR(36) NOT NULL,
    transaction_type text NOT NULL,
    amount numeric NOT NULL,
    balance_before numeric DEFAULT 0,
    balance_after numeric DEFAULT 0,
    reference_number text,
    description text,
    related_transaction_id CHAR(36),
    metadata JSON,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    related_entity_type character varying(50),
    related_entity_id CHAR(36),
    branch_id CHAR(36),
    status text DEFAULT 'approved'::text,
    CONSTRAINT account_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text]))),
    CONSTRAINT balance_after_not_null CHECK ((balance_after IS NOT NULL)),
    CONSTRAINT balance_before_not_null CHECK ((balance_before IS NOT NULL))
);



--
-- TOC entry 7805 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN account_transactions.related_entity_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7806 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN account_transactions.related_entity_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7807 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN account_transactions.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7808 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN account_transactions.status; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 231 (class 1259 OID 1204522)
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE admin_settings (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    category character varying(50) NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    setting_type character varying(20) DEFAULT 'string'::character varying,
    description text,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 232 (class 1259 OID 1204532)
-- Name: admin_settings_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE admin_settings_log (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    category character varying(50) NOT NULL,
    setting_key character varying(100) NOT NULL,
    old_value text,
    new_value text,
    changed_by text,
    change_reason text,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 233 (class 1259 OID 1204539)
-- Name: api_keys; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE api_keys (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    name text NOT NULL,
    key text NOT NULL,
    scopes text[] DEFAULT '{}'::text[],
    is_active TINYINT(1) DEFAULT 1,
    last_used DATETIME,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 234 (class 1259 OID 1204549)
-- Name: api_request_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE api_request_logs (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    api_key_id CHAR(36),
    endpoint text NOT NULL,
    method text NOT NULL,
    ip_address text,
    user_agent text,
    response_status integer,
    response_time_ms integer,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 235 (class 1259 OID 1204556)
-- Name: appointments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE appointments (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    customer_id CHAR(36),
    device_id CHAR(36),
    technician_id CHAR(36),
    appointment_date DATETIME NOT NULL,
    duration_minutes integer DEFAULT 60,
    status text DEFAULT 'scheduled'::text,
    notes text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    service_type text,
    appointment_time text DEFAULT '00:00:00'::text,
    customer_name text,
    customer_phone text,
    technician_name text,
    priority text DEFAULT 'normal'::text,
    created_by CHAR(36),
    branch_id CHAR(36)
);



--
-- TOC entry 236 (class 1259 OID 1204568)
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE attendance_records (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    employee_id CHAR(36) NOT NULL,
    attendance_date date NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    check_in_location_lat numeric(10,8),
    check_in_location_lng numeric(11,8),
    check_out_location_lat numeric(10,8),
    check_out_location_lng numeric(11,8),
    check_in_network_ssid character varying(255),
    check_out_network_ssid character varying(255),
    check_in_photo_url text,
    check_out_photo_url text,
    total_hours numeric(5,2) DEFAULT 0,
    break_hours numeric(5,2) DEFAULT 0,
    overtime_hours numeric(5,2) DEFAULT 0,
    status character varying(50) DEFAULT 'present'::character varying,
    notes text,
    approved_by CHAR(36),
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    branch_id CHAR(36)
);



--
-- TOC entry 237 (class 1259 OID 1204580)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE audit_logs (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id CHAR(36),
    action text NOT NULL,
    table_name text,
    record_id CHAR(36),
    old_data JSON,
    new_data JSON,
    ip_address text,
    user_agent text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    details text,
    entity_type text,
    entity_id CHAR(36),
    user_role text,
    "DATETIME" DATETIME
);



--
-- TOC entry 238 (class 1259 OID 1204587)
-- Name: auth_users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE auth_users (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    username text,
    name text,
    role text DEFAULT 'technician'::text,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    permissions text[],
    max_devices_allowed integer DEFAULT 10,
    require_approval TINYINT(1) DEFAULT 0,
    failed_login_attempts integer DEFAULT 0,
    two_factor_enabled TINYINT(1) DEFAULT 0,
    two_factor_secret text,
    last_login DATETIME,
    branch_id CHAR(36) DEFAULT '00000000-0000-0000-0000-000000000001'::CHAR(36)
);



--
-- TOC entry 7809 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN auth_users.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 239 (class 1259 OID 1204602)
-- Name: auto_reorder_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE auto_reorder_log (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36) NOT NULL,
    supplier_id CHAR(36),
    triggered_quantity integer NOT NULL,
    reorder_point integer NOT NULL,
    suggested_quantity integer NOT NULL,
    purchase_order_id CHAR(36),
    po_created TINYINT(1) DEFAULT 0,
    error_message text,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



--
-- TOC entry 240 (class 1259 OID 1204610)
-- Name: lats_product_variants; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_product_variants (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    product_id CHAR(36),
    sku text,
    barcode text,
    quantity integer DEFAULT 0,
    min_quantity integer DEFAULT 5,
    unit_price numeric DEFAULT 0,
    cost_price numeric DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    name text DEFAULT 'Default Variant'::text NOT NULL,
    selling_price numeric(12,2) DEFAULT 0,
    attributes JSON DEFAULT '{}'::JSON,
    weight numeric(10,2),
    dimensions JSON,
    variant_name text,
    variant_attributes JSON DEFAULT '{}'::JSON,
    branch_id CHAR(36) NOT NULL,
    stock_per_branch JSON DEFAULT '{}'::JSON,
    is_shared TINYINT(1) DEFAULT 1,
    visible_to_branches CHAR(36)[],
    sharing_mode text DEFAULT 'isolated'::text,
    reserved_quantity integer DEFAULT 0,
    reorder_point integer DEFAULT 0,
    parent_variant_id CHAR(36),
    is_parent TINYINT(1) DEFAULT 0,
    variant_type character varying(20) DEFAULT 'standard'::character varying,
    status text DEFAULT 'active'::text,
    CONSTRAINT check_imei_format CHECK ((((variant_type)::text <> 'imei_child'::text) OR ((variant_attributes ->> 'imei'::text) IS NULL) OR ((variant_attributes ->> 'imei'::text) <> ''::text))),
    CONSTRAINT check_non_negative_quantity CHECK ((quantity >= 0)),
    CONSTRAINT lats_product_variants_branch_id_not_null CHECK ((branch_id IS NOT NULL)),
    CONSTRAINT lats_product_variants_sharing_mode_check CHECK ((sharing_mode = ANY (ARRAY['isolated'::text, 'shared'::text, 'custom'::text]))),
    CONSTRAINT lats_product_variants_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'discontinued'::text, 'pending'::text, 'draft'::text])))
);



--
-- TOC entry 7810 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE lats_product_variants; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7811 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN lats_product_variants.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7812 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN lats_product_variants.is_shared; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7813 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN lats_product_variants.visible_to_branches; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7814 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN lats_product_variants.sharing_mode; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7815 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN lats_product_variants.parent_variant_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7816 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN lats_product_variants.is_parent; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7817 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN lats_product_variants.variant_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 241 (class 1259 OID 1204640)
-- Name: lats_products; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_products (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    sku text,
    barcode text,
    category_id CHAR(36),
    unit_price numeric DEFAULT 0,
    cost_price numeric DEFAULT 0,
    stock_quantity integer DEFAULT 0,
    min_stock_level integer DEFAULT 0,
    max_stock_level integer DEFAULT 1000,
    is_active TINYINT(1) DEFAULT 1,
    image_url text,
    supplier_id CHAR(36),
    brand text,
    model text,
    warranty_period integer,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    specification text,
    condition text DEFAULT 'new'::text,
    selling_price numeric(12,2) DEFAULT 0,
    tags JSON DEFAULT '[]'::JSON,
    total_quantity integer DEFAULT 0,
    total_value numeric(12,2) DEFAULT 0,
    storage_room_id CHAR(36),
    store_shelf_id CHAR(36),
    attributes JSON DEFAULT '{}'::JSON,
    metadata JSON DEFAULT '{}'::JSON,
    branch_id CHAR(36),
    is_shared TINYINT(1) DEFAULT 1,
    visible_to_branches CHAR(36)[],
    sharing_mode text DEFAULT 'isolated'::text,
    shelf_id CHAR(36),
    category text,
    CONSTRAINT lats_products_condition_check CHECK ((condition = ANY (ARRAY['new'::text, 'used'::text, 'refurbished'::text]))),
    CONSTRAINT lats_products_sharing_mode_check CHECK ((sharing_mode = ANY (ARRAY['isolated'::text, 'shared'::text, 'custom'::text])))
);



--
-- TOC entry 7818 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN lats_products.storage_room_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7819 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN lats_products.branch_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7820 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN lats_products.is_shared; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7821 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN lats_products.visible_to_branches; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7822 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN lats_products.sharing_mode; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 7823 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN lats_products.shelf_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 242 (class 1259 OID 1204665)
-- Name: lats_purchase_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE lats_purchase_orders (
    id CHAR(36) DEFAULT gen_random_uuid() NOT NULL,
    po_number text NOT NULL,
    supplier_id CHAR(36),
    status text DEFAULT 'pending'::text,
    total_amount numeric DEFAULT 0,
    notes text,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date DATETIME,
    received_date DATETIME,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    tax_amount numeric DEFAULT 0,
    shipping_cost numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    final_amount numeric DEFAULT 0,
    approved_by CHAR(36),
