-- =====================================================
-- CONVERTED FROM POSTGRESQL TO MYSQL
-- =====================================================
-- Converted on: 2025-12-06T10:15:27.696Z
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

--
--




--
-- TOC entry 7755 (class 1262 OID 16389)
-- Name: neondb; Type: DATABASE; Schema: -; Owner: neondb_owner
--






--
-- TOC entry 14 (class 2615 OID 1187950)
-- Name: public; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

-- *not* creating schema, since initdb creates it



--
-- TOC entry 7757 (class 0 OID 0)
-- Dependencies: 14
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: neondb_owner
--



--
-- TOC entry 2 (class 3079 OID 1204229)
-- Name: pg_session_jwt; Type: EXTENSION; Schema: -; Owner: -
--



--
-- TOC entry 7759 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pg_session_jwt; Type: COMMENT; Schema: -; Owner: 
--



--
-- TOC entry 17 (class 2615 OID 1204237)
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: neondb_owner
--




--
-- TOC entry 15 (class 2615 OID 24604)
-- Name: pgrst; Type: SCHEMA; Schema: -; Owner: neon_service
--




--
-- TOC entry 3 (class 3079 OID 1204238)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--



--
-- TOC entry 7761 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--



--
-- TOC entry 4 (class 3079 OID 1204275)
-- Name: CHAR(36)-ossp; Type: EXTENSION; Schema: -; Owner: -
--



--
-- TOC entry 7762 (class 0 OID 0)
-- Dependencies: 4
-- Name: EXTENSION "CHAR(36)-ossp"; Type: COMMENT; Schema: -; Owner: 
--



--
-- TOC entry 690 (class 1255 OID 24605)
-- Name: pre_config(); Type: FUNCTION; Schema: pgrst; Owner: neon_service
--




--
-- TOC entry 488 (class 1255 OID 1204286)
-- Name: add_imei_to_parent_variant(CHAR(36), text, text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Convert INTEGER to NUMERIC and call the internal function
  RETURN QUERY
  SELECT * FROM add_imei_to_parent_variant_internal(
    parent_variant_id_param,
    imei_param,
    serial_number_param,
    NULL::TEXT, -- mac_address
    cost_price_param::NUMERIC,
    selling_price_param::NUMERIC,
    condition_param,
    NULL::TEXT -- notes
  );



--
-- TOC entry 491 (class 1255 OID 1204287)
-- Name: add_imei_to_parent_variant(CHAR(36), text, text, integer, integer, text, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Convert INTEGER to NUMERIC and call the internal function
  RETURN QUERY
  SELECT * FROM add_imei_to_parent_variant_internal(
    parent_variant_id_param,
    imei_param,
    serial_number_param,
    NULL::TEXT, -- mac_address
    cost_price_param::NUMERIC,
    selling_price_param::NUMERIC,
    condition_param,
    notes_param
  );



--
-- TOC entry 663 (class 1255 OID 1204288)
-- Name: add_imei_to_parent_variant(CHAR(36), text, text, text, numeric, numeric, text, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Call the internal implementation
  RETURN QUERY
  SELECT * FROM add_imei_to_parent_variant_internal(
    parent_variant_id_param,
    imei_param,
    serial_number_param,
    mac_address_param,
    cost_price_param,
    selling_price_param,
    condition_param,
    notes_param
  );



--
-- TOC entry 637 (class 1255 OID 1204289)
-- Name: add_imei_to_parent_variant_internal(CHAR(36), text, text, text, numeric, numeric, text, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_child_variant_id CHAR(36);
  v_parent_product_id CHAR(36);
  v_parent_sku TEXT;
  v_parent_name TEXT;
  v_parent_variant_name TEXT;
  v_parent_branch_id CHAR(36);
  v_duplicate_count INT;
  v_cost_price NUMERIC;
  v_selling_price NUMERIC;
  v_serial_number TEXT;
  v_child_name TEXT;
  -- Handle NULL prices
  v_cost_price := COALESCE(cost_price_param, 0);
  v_selling_price := COALESCE(selling_price_param, 0);
  
  -- ✅ UNIFIED: INT AUTO_INCREMENT number and IMEI are the same - use imei_param for both
  v_serial_number := COALESCE(serial_number_param, imei_param)::TEXT;
  v_child_name := imei_param::TEXT;

  -- Validate IMEI format
  IF imei_param IS NULL OR imei_param = '' THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::CHAR(36), 
      'IMEI cannot be empty' AS error_message;
    RETURN;
  END IF;

  -- Check for duplicate IMEI
  SELECT COUNT(*) INTO v_duplicate_count
  FROM lats_product_variants
  WHERE variant_type IN ('imei', 'imei_child')
    AND is_active = TRUE
    AND (
      variant_attributes->>'imei' = imei_param 
      OR attributes->>'imei' = imei_param
      OR name = imei_param
    );

  IF v_duplicate_count > 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::CHAR(36), 
      format('IMEI %s already exists in the system', imei_param) AS error_message;
    RETURN;
  END IF;

  -- Get parent variant details
    product_id, 
    sku, 
    name,
    COALESCE(variant_name, name) as variant_name,
    branch_id
  INTO 
    v_parent_product_id, 
    v_parent_sku, 
    v_parent_name,
    v_parent_variant_name,
    v_parent_branch_id
  FROM lats_product_variants
  WHERE id = parent_variant_id_param;

  IF v_parent_product_id IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::CHAR(36), 
      format('Parent variant %s not found', parent_variant_id_param) AS error_message;
    RETURN;
  END IF;

  -- Mark parent as parent type if not already
  UPDATE lats_product_variants
  SET 
    is_parent = TRUE,
    variant_type = 'parent',
    updated_at = NOW()
  WHERE id = parent_variant_id_param
    AND variant_type NOT IN ('parent');

  -- Generate new CHAR(36) for child variant
  v_child_variant_id := gen_random_uuid();

  -- Create IMEI child variant
  INSERT INTO lats_product_variants (
    id,
    product_id,
    parent_variant_id,
    variant_type,
    name,
    variant_name,
    sku,
    attributes,
    variant_attributes,
    quantity,
    cost_price,
    selling_price,
    is_active,
    branch_id,
    created_at,
    updated_at
  ) VALUES (
    v_child_variant_id,
    v_parent_product_id,
    parent_variant_id_param,
    'imei_child',
    v_child_name,
    format('IMEI: %s', imei_param),
    v_parent_sku || '-IMEI-' || SUBSTRING(imei_param, LEAST(10, LENGTH(imei_param)), 6),
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', v_serial_number,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'imei_status', 'available',
      'parent_variant_name', v_parent_variant_name,
      'added_at', NOW(),
      'notes', notes_param
    ),
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', v_serial_number,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'imei_status', 'available',
      'parent_variant_name', v_parent_variant_name,
      'added_at', NOW(),
      'notes', notes_param
    ),
    1,
    v_cost_price,
    v_selling_price,
    TRUE,
    v_parent_branch_id,
    NOW(),
    NOW()
  );

  -- Recalculate parent variant's quantity from children
  UPDATE lats_product_variants
  SET 
    quantity = COALESCE((
      SELECT SUM(quantity)
      FROM lats_product_variants
      WHERE parent_variant_id = parent_variant_id_param
        AND variant_type = 'imei_child'
        AND is_active = TRUE
    ), 0),
    updated_at = NOW()
  WHERE id = parent_variant_id_param;

  -- Return success
  RETURN QUERY SELECT 
    TRUE, 
    v_child_variant_id, 
    NULL::TEXT AS error_message;

EXCEPTION WHEN OTHERS THEN
  -- Return error
  RETURN QUERY SELECT 
    FALSE, 
    NULL::CHAR(36), 
    format('Error creating IMEI variant: %s', SQLERRM) AS error_message;



--
-- TOC entry 472 (class 1255 OID 1204291)
-- Name: add_inventory_items_without_tracking(CHAR(36), integer, numeric, numeric, text, CHAR(36), CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_product_id CHAR(36);
    v_variant_name TEXT;
    v_sku TEXT;
    v_items_created INTEGER := 0;
    v_i INTEGER;
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_cost NUMERIC;
    v_price NUMERIC;
    -- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than 0';
    END IF;
    
    IF p_variant_id IS NULL THEN
        RAISE EXCEPTION 'Variant ID is required';
    END IF;
    
    -- Get variant and product info
        pv.product_id,
        pv.variant_name,
        pv.sku,
        COALESCE(pv.cost_price, 0),
        COALESCE(pv.selling_price, 0)
    INTO 
        v_product_id,
        v_variant_name,
        v_sku,
        v_cost,
        v_price
    FROM lats_product_variants pv
    WHERE pv.id = p_variant_id;
    
    IF v_product_id IS NULL THEN
        RAISE EXCEPTION 'Variant not found: %', p_variant_id;
    END IF;
    
    -- Use provided prices or variant prices
    v_cost := COALESCE(p_cost_price, v_cost);
    v_price := COALESCE(p_selling_price, v_price);
    
    -- Get current quantity
    SELECT COALESCE(quantity, 0) INTO v_current_quantity
    FROM lats_product_variants
    WHERE id = p_variant_id;
    
    -- Create inventory items (without IMEI/INT AUTO_INCREMENT)
    FOR v_i IN 1..p_quantity LOOP
        INSERT INTO inventory_items (
            product_id,
            variant_id,
            status,
            cost_price,
            selling_price,
            notes,
            branch_id,
            created_by,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            v_product_id,
            p_variant_id,
            'available',
            v_cost,
            v_price,
            COALESCE(
                p_notes,
                format('Added %s units without IMEI/INT AUTO_INCREMENT tracking (Item %s of %s)', 
                    p_quantity, v_i, p_quantity)
            ),
            p_branch_id,
            p_user_id,
            jsonb_build_object(
                'added_without_tracking', true,
                'added_at', NOW(),
                'added_by', p_user_id,
                'batch_number', v_i,
                'total_in_batch', p_quantity
            ),
            NOW(),
            NOW()
        );
        
        v_items_created := v_items_created + 1;
    END LOOP;
    
    -- Get new quantity (trigger will have synced it)
    SELECT COALESCE(quantity, 0) INTO v_new_quantity
    FROM lats_product_variants
    WHERE id = p_variant_id;
    
    -- Return results
    RETURN QUERY SELECT 
        v_items_created::INTEGER,
        p_variant_id,
        v_new_quantity::INTEGER,
        format('Successfully created %s inventory items for variant %s. Stock updated from %s to %s.', 
            v_items_created, v_sku, v_current_quantity, v_new_quantity)::TEXT;
    
    RAISE NOTICE '✅ Created % inventory items for variant % (SKU: %)', 
        v_items_created, v_variant_name, v_sku;
    RAISE NOTICE '   Stock updated: % -> %', v_current_quantity, v_new_quantity;



--
-- TOC entry 7764 (class 0 OID 0)
-- Dependencies: 472
-- Name: FUNCTION add_inventory_items_without_tracking(p_variant_id CHAR(36), p_quantity integer, p_cost_price numeric, p_selling_price numeric, p_notes text, p_branch_id CHAR(36), p_user_id CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--

The variant quantity will automatically sync via the sync_variant_quantity_from_inventory trigger.

Parameters:
- p_variant_id: The variant to add items to (required)
- p_quantity: Number of items to add (required, must be > 0)
- p_cost_price: Cost price per item (optional, uses variant cost_price if not provided)
- p_selling_price: Selling price per item (optional, uses variant selling_price if not provided)
- p_notes: Notes for the items (optional)
- p_branch_id: Branch ID where items are located (optional)
- p_user_id: User ID who is adding the items (optional)

Returns:
- items_created: Number of inventory items created
- variant_id: The variant ID
- new_quantity: New stock quantity after adding items
- message: Success message

Example:
SELECT * FROM add_inventory_items_without_tracking(
    ''b4418cf0-7624-4238-8e98-7d1eb5986b28''::CHAR(36),  -- variant_id
    4,                                                -- quantity
    1000,                                             -- cost_price (optional)
    51000,                                            -- selling_price (optional)
    ''Added manually without IMEI tracking'',         -- notes (optional)
    NULL,                                             -- branch_id (optional)
    NULL                                              -- user_id (optional)
);';


--
-- TOC entry 662 (class 1255 OID 1204292)
-- Name: add_quality_items_to_inventory_v2(CHAR(36), CHAR(36), CHAR(36), numeric, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_item RECORD;
  v_added_count INTEGER := 0;
  v_selling_price DECIMAL;
  -- Process each passed item
  FOR v_item IN 
      qci.purchase_order_item_id,
      qci.quantity_passed,
      poi.product_id,
      poi.variant_id,
      poi.unit_price
    FROM purchase_order_quality_check_items qci
    JOIN lats_purchase_order_items poi ON poi.id = qci.purchase_order_item_id
    WHERE qci.quality_check_id = p_quality_check_id
      AND qci.result = 'pass'
      AND qci.quantity_passed > 0
  LOOP
    -- Calculate selling price
    v_selling_price := v_item.unit_price * (1 + (p_profit_margin_percentage / 100));
    
    -- Update product/variant with new prices
    IF v_item.variant_id IS NOT NULL THEN
      UPDATE lats_product_variants
      SET 
        cost_price = v_item.unit_price,
        selling_price = v_selling_price,
        updated_at = NOW()
      WHERE id = v_item.variant_id;
    ELSE
      UPDATE lats_products
      SET 
        cost_price = v_item.unit_price,
        selling_price = v_selling_price,
        updated_at = NOW()
      WHERE id = v_item.product_id;
    END IF;
    
    -- Update received quantity
    UPDATE lats_purchase_order_items
    SET 
      received_quantity = COALESCE(received_quantity, 0) + v_item.quantity_passed,
      updated_at = NOW()
    WHERE id = v_item.purchase_order_item_id;
    
    v_added_count := v_added_count + 1;
  END LOOP;

  -- Update PO status
  PERFORM 1 FROM lats_purchase_order_items poi
  WHERE poi.purchase_order_id = p_purchase_order_id
    AND COALESCE(poi.received_quantity, 0) < poi.quantity;
  
  IF NOT FOUND THEN
    UPDATE lats_purchase_orders SET status = 'received', updated_at = NOW()
    WHERE id = p_purchase_order_id;
  ELSE
    UPDATE lats_purchase_orders SET status = 'partially_received', updated_at = NOW()
    WHERE id = p_purchase_order_id AND status != 'partially_received';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Successfully added %s items to inventory', v_added_count),
    'items_added', v_added_count
  );



--
-- TOC entry 7765 (class 0 OID 0)
-- Dependencies: 662
-- Name: FUNCTION add_quality_items_to_inventory_v2(p_quality_check_id CHAR(36), p_purchase_order_id CHAR(36), p_user_id CHAR(36), p_profit_margin_percentage numeric, p_default_location text); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 692 (class 1255 OID 1204293)
-- Name: auto_convert_inventory_item_on_update(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_parent_variant RECORD;
    v_identifier TEXT;
    v_is_numeric_imei TINYINT(1);
    v_child_id CHAR(36);
    v_sku TEXT;
    -- Only process if status changed to 'available'
    IF NEW.status != 'available' OR OLD.status = 'available' THEN
        RETURN NEW;
    END IF;
    
    IF NEW.variant_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    IF (NEW.serial_number IS NULL OR NEW.serial_number = '') 
       AND (NEW.imei IS NULL OR NEW.imei = '') THEN
        RETURN NEW;
    END IF;
    
    -- Get the identifier
    v_identifier := COALESCE(NEW.imei, NEW.serial_number);
    v_is_numeric_imei := (v_identifier ~ '^[0-9]{15}$');
    
    -- Get parent variant
    SELECT * INTO v_parent_variant
    FROM lats_product_variants
    WHERE id = NEW.variant_id;
    
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- Check if already exists
    SELECT id INTO v_child_id
    FROM lats_product_variants
    WHERE parent_variant_id = NEW.variant_id
        AND variant_type = 'imei_child'
        AND (
            variant_attributes->>'serial_number' = v_identifier
            OR (variant_attributes->>'imei' IS NOT NULL 
                AND variant_attributes->>'imei' = v_identifier)
        )
    LIMIT 1;
    
    IF v_child_id IS NOT NULL THEN
        UPDATE inventory_items
        SET status = 'sold', updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;
    
    -- Generate SKU and insert
    v_sku := v_parent_variant.sku || '-IMEI-' || SUBSTRING(v_identifier FROM 1 FOR 10);
    
    ALTER TABLE lats_product_variants DISABLE TRIGGER trg_validate_new_imei;
    ALTER TABLE lats_product_variants DISABLE TRIGGER trigger_sync_variant_imei_serial_number;
    
    INSERT INTO lats_product_variants (
        id, product_id, parent_variant_id, variant_name, sku, variant_type,
        is_parent, is_active, quantity, cost_price, selling_price, branch_id,
        variant_attributes, created_at, updated_at
    )
    VALUES (
        gen_random_uuid(), NEW.product_id, NEW.variant_id, 'IMEI: ' || v_identifier, v_sku,
        'imei_child', false, true, 1, COALESCE(NEW.cost_price, 0),
        COALESCE(NEW.selling_price, v_parent_variant.selling_price, 0),
        v_parent_variant.branch_id,
        CASE 
            WHEN v_is_numeric_imei THEN
                jsonb_build_object(
                    'imei', v_identifier, 'serial_number', COALESCE(NEW.serial_number, NEW.imei),
                    'condition', COALESCE((NEW.metadata->>'condition')::text, 'new'),
                    'imei_status', 'available', 'mac_address', COALESCE(NEW.mac_address, ''),
                    'location', COALESCE(NEW.location, ''),
                    'notes', 'Auto-converted from inventory_items',
                    'auto_converted_at', NOW()::text, 'original_inventory_item_id', NEW.id::text
                )
            ELSE
                jsonb_build_object(
                    'serial_number', v_identifier,
                    'condition', COALESCE((NEW.metadata->>'condition')::text, 'new'),
                    'imei_status', 'available', 'mac_address', COALESCE(NEW.mac_address, ''),
                    'location', COALESCE(NEW.location, ''),
                    'notes', 'Auto-converted from inventory_items (non-numeric identifier)',
                    'auto_converted_at', NOW()::text, 'original_inventory_item_id', NEW.id::text
                )
        END,
        COALESCE(NEW.created_at, NOW()), NOW()
    )
    ON CONFLICT DO NOTHING;
    
    ALTER TABLE lats_product_variants ENABLE TRIGGER trg_validate_new_imei;
    ALTER TABLE lats_product_variants ENABLE TRIGGER trigger_sync_variant_imei_serial_number;
    
    UPDATE inventory_items
    SET status = 'sold', updated_at = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        ALTER TABLE lats_product_variants ENABLE TRIGGER trg_validate_new_imei;
        ALTER TABLE lats_product_variants ENABLE TRIGGER trigger_sync_variant_imei_serial_number;
        RAISE WARNING 'Error auto-converting inventory item % to IMEI child: %', NEW.id, SQLERRM;
        RETURN NEW;
$_$;



--
-- TOC entry 652 (class 1255 OID 1204294)
-- Name: auto_convert_inventory_item_to_imei_child(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_parent_variant RECORD;
    v_identifier TEXT;
    v_is_numeric_imei TINYINT(1);
    v_child_id CHAR(36);
    v_sku TEXT;
    -- Only process if this is an available inventory item with a variant_id and serial_number/imei
    IF NEW.variant_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    IF NEW.status != 'available' THEN
        RETURN NEW;
    END IF;
    
    IF (NEW.serial_number IS NULL OR NEW.serial_number = '') 
       AND (NEW.imei IS NULL OR NEW.imei = '') THEN
        RETURN NEW;
    END IF;
    
    -- Get the identifier (IMEI or INT AUTO_INCREMENT number)
    v_identifier := COALESCE(NEW.imei, NEW.serial_number);
    
    -- Check if identifier is a valid 15-digit numeric IMEI
    v_is_numeric_imei := (v_identifier ~ '^[0-9]{15}$');
    
    -- Get parent variant details
    SELECT * INTO v_parent_variant
    FROM lats_product_variants
    WHERE id = NEW.variant_id;
    
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- Check if IMEI child already exists
    SELECT id INTO v_child_id
    FROM lats_product_variants
    WHERE parent_variant_id = NEW.variant_id
        AND variant_type = 'imei_child'
        AND (
            variant_attributes->>'serial_number' = v_identifier
            OR (variant_attributes->>'imei' IS NOT NULL 
                AND variant_attributes->>'imei' = v_identifier)
        )
    LIMIT 1;
    
    -- If child already exists, mark inventory item as sold
    IF v_child_id IS NOT NULL THEN
        UPDATE inventory_items
        SET status = 'sold', updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;
    
    -- Generate SKU
    v_sku := v_parent_variant.sku || '-IMEI-' || SUBSTRING(v_identifier FROM 1 FOR 10);
    
    -- Temporarily disable validation triggers
    ALTER TABLE lats_product_variants DISABLE TRIGGER trg_validate_new_imei;
    ALTER TABLE lats_product_variants DISABLE TRIGGER trigger_sync_variant_imei_serial_number;
    
    -- Insert IMEI child variant
    INSERT INTO lats_product_variants (
        id,
        product_id,
        parent_variant_id,
        variant_name,
        sku,
        variant_type,
        is_parent,
        is_active,
        quantity,
        cost_price,
        selling_price,
        branch_id,
        variant_attributes,
        created_at,
        updated_at
    )
    VALUES (
        gen_random_uuid(),
        NEW.product_id,
        NEW.variant_id,
        'IMEI: ' || v_identifier,
        v_sku,
        'imei_child',
        false,
        true,
        1,
        COALESCE(NEW.cost_price, 0),
        COALESCE(NEW.selling_price, v_parent_variant.selling_price, 0),
        v_parent_variant.branch_id,
        CASE 
            WHEN v_is_numeric_imei THEN
                jsonb_build_object(
                    'imei', v_identifier,
                    'serial_number', COALESCE(NEW.serial_number, NEW.imei),
                    'condition', COALESCE((NEW.metadata->>'condition')::text, 'new'),
                    'imei_status', 'available',
                    'mac_address', COALESCE(NEW.mac_address, ''),
                    'location', COALESCE(NEW.location, ''),
                    'notes', 'Auto-converted from inventory_items',
                    'auto_converted_at', NOW()::text,
                    'original_inventory_item_id', NEW.id::text
                )
            ELSE
                jsonb_build_object(
                    'serial_number', v_identifier,
                    'condition', COALESCE((NEW.metadata->>'condition')::text, 'new'),
                    'imei_status', 'available',
                    'mac_address', COALESCE(NEW.mac_address, ''),
                    'location', COALESCE(NEW.location, ''),
                    'notes', 'Auto-converted from inventory_items (non-numeric identifier)',
                    'auto_converted_at', NOW()::text,
                    'original_inventory_item_id', NEW.id::text
                )
        END,
        COALESCE(NEW.created_at, NOW()),
        NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- Re-enable triggers
    ALTER TABLE lats_product_variants ENABLE TRIGGER trg_validate_new_imei;
    ALTER TABLE lats_product_variants ENABLE TRIGGER trigger_sync_variant_imei_serial_number;
    
    -- Mark the inventory item as sold (since it's now an IMEI child)
    UPDATE inventory_items
    SET status = 'sold', updated_at = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Re-enable triggers in case of error
        ALTER TABLE lats_product_variants ENABLE TRIGGER trg_validate_new_imei;
        ALTER TABLE lats_product_variants ENABLE TRIGGER trigger_sync_variant_imei_serial_number;
        RAISE WARNING 'Error auto-converting inventory item % to IMEI child: %', NEW.id, SQLERRM;
        RETURN NEW;
$_$;



--
-- TOC entry 563 (class 1255 OID 1204295)
-- Name: auto_convert_po_currency(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_po_currency TEXT;
    v_exchange_rate NUMERIC;
    v_converted_cost NUMERIC;
    v_variant_id CHAR(36);
    -- Get the PO currency and exchange rate
    SELECT currency, exchange_rate 
    INTO v_po_currency, v_exchange_rate
    FROM lats_purchase_orders
    WHERE id = NEW.purchase_order_id;
    
    -- Only convert if currency is not TZS and exchange rate exists
    IF v_po_currency IS NOT NULL 
       AND v_po_currency != 'TZS' 
       AND v_exchange_rate IS NOT NULL 
       AND v_exchange_rate > 0 THEN
        
        -- Convert the cost to TZS
        v_converted_cost := NEW.unit_cost * v_exchange_rate;
        
        RAISE NOTICE '💱 Currency Conversion: % % × % = % TZS', 
            NEW.unit_cost, v_po_currency, v_exchange_rate, v_converted_cost;
        
        -- If there's a variant, update its cost price with converted amount
        IF NEW.variant_id IS NOT NULL THEN
            UPDATE lats_product_variants
            SET cost_price = v_converted_cost,
                updated_at = NOW()
            WHERE id = NEW.variant_id;
            
            -- Log the change
            INSERT INTO lats_data_audit_log 
                (table_name, record_id, field_name, old_value, new_value, change_reason, change_source)
            VALUES 
                ('lats_product_variants', NEW.variant_id, 'cost_price', 
                 NULL, v_converted_cost::TEXT, 
                 'Auto-converted from PO: ' || v_po_currency || ' to TZS',
                 'purchase_order');
            
            RAISE NOTICE '✅ Updated variant cost to % TZS', v_converted_cost;
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  No currency conversion needed (Currency: %, Rate: %)', 
            v_po_currency, v_exchange_rate;
    END IF;
    
    RETURN NEW;



--
-- TOC entry 7766 (class 0 OID 0)
-- Dependencies: 563
-- Name: FUNCTION auto_convert_po_currency(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 483 (class 1255 OID 1204296)
-- Name: auto_create_default_variant(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    variant_count INTEGER;
    v_new_variant_id CHAR(36);
    skip_default TINYINT(1);
    -- Check if product has metadata flag to skip default variant creation
    skip_default := COALESCE((NEW.metadata->>'skip_default_variant')::TINYINT(1), false);
    
    IF skip_default THEN
        RAISE NOTICE '⏭️ Skipping default variant creation for product "%" - skip flag set', NEW.name;
        RETURN NEW;
    END IF;
    
    -- Wait 3 seconds to allow batch variant insertions from frontend
    PERFORM pg_sleep(3.0);
    
    -- Check if this product has any variants
    SELECT COUNT(*) INTO variant_count
    FROM lats_product_variants
    WHERE product_id = NEW.id
    AND parent_variant_id IS NULL;
    
    -- If no variants exist, create a default one
    IF variant_count = 0 THEN
        INSERT INTO lats_product_variants (
            product_id,
            name,
            variant_name,
            sku,
            cost_price,
            unit_price,
            selling_price,
            quantity,
            min_quantity,
            variant_attributes,
            attributes,
            branch_id,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            'Default',
            'Default',
            COALESCE(NEW.sku || '-DEFAULT', 'SKU-' || SUBSTRING(NEW.id::text, 1, 8) || '-DEFAULT'),
            COALESCE(NEW.cost_price, 0),
            COALESCE(NEW.unit_price, NEW.selling_price, 0),
            COALESCE(NEW.selling_price, 0),
            COALESCE(NEW.stock_quantity, 0),
            COALESCE(NEW.min_stock_level, 0),
            jsonb_build_object(
                'auto_created', true,
                'created_at', NOW(),
                'created_from', 'product_insert_trigger'
            ),
            COALESCE(NEW.attributes, '{}'::JSON),
            NEW.branch_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_new_variant_id;
        
        RAISE NOTICE '✨ Auto-created default variant (ID: %) for product: "%" (ID: %)', 
            v_new_variant_id, NEW.name, NEW.id;
    ELSE
        RAISE NOTICE '✅ Product "%" already has % variant(s), skipping default variant', 
            NEW.name, variant_count;
    END IF;
    
    RETURN NEW;



--
-- TOC entry 7767 (class 0 OID 0)
-- Dependencies: 483
-- Name: FUNCTION auto_create_default_variant(); Type: COMMENT; Schema: public; Owner: neondb_owner
--

Waits 1 second to allow custom variants to be created first.';


--
-- TOC entry 533 (class 1255 OID 1204297)
-- Name: auto_create_purchase_order_for_low_stock(CHAR(36), CHAR(36), integer, integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_po_id CHAR(36);
  v_po_number TEXT;
  v_supplier_id CHAR(36);
  v_suggested_qty INTEGER;
  v_min_order_qty INTEGER;
  v_unit_cost NUMERIC(10,2);
  v_total_amount NUMERIC(10,2);
  v_product_name TEXT;
  v_safety_stock INTEGER;
  v_max_stock INTEGER;
  -- Check if auto-create PO is enabled
  IF NOT is_auto_create_po_enabled() THEN
    RAISE NOTICE '⚠️  Auto-create PO is disabled in settings';
    RETURN NULL;
  END IF;
  
  -- Get minimum order quantity from settings
  v_min_order_qty := get_minimum_order_quantity();
  
  -- Get product details
  SELECT name INTO v_product_name FROM lats_products WHERE id = p_product_id;
  
  -- Get safety stock and max stock from settings
  SELECT COALESCE(setting_value::INTEGER, 5) INTO v_safety_stock
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'safety_stock_level';
  
  SELECT COALESCE(setting_value::INTEGER, 1000) INTO v_max_stock
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'maximum_stock_level';
  
  -- Calculate suggested order quantity
  v_suggested_qty := calculate_suggested_order_quantity(
    p_current_quantity,
    p_reorder_point,
    v_max_stock,
    v_safety_stock,
    v_min_order_qty
  );
  
  -- Get the first active supplier (simplified - no product-supplier relationship needed)
  SELECT id INTO v_supplier_id
  FROM lats_suppliers
  WHERE is_active = true
  LIMIT 1;
  
  -- If no supplier found, log and exit
  IF v_supplier_id IS NULL THEN
    INSERT INTO auto_reorder_log (
      product_id, variant_id, triggered_quantity, reorder_point,
      suggested_quantity, po_created, error_message
    ) VALUES (
      p_product_id, p_variant_id, p_current_quantity, p_reorder_point,
      v_suggested_qty, false, 'No active supplier found in system'
    );
    
    RAISE NOTICE '❌ No active supplier found';
    RETURN NULL;
  END IF;
  
  -- Get variant cost price
  SELECT cost_price INTO v_unit_cost
  FROM lats_product_variants
  WHERE id = p_variant_id;
  
  -- Default to 1000 if no cost
  v_unit_cost := COALESCE(v_unit_cost, 1000);
  
  -- Calculate total amount
  v_total_amount := v_suggested_qty * v_unit_cost;
  
  -- Generate PO number
  v_po_number := 'PO-AUTO-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || substring(p_variant_id::TEXT, 1, 8);
  
  -- Create purchase order
  INSERT INTO lats_purchase_orders (
    po_number,
    supplier_id,
    status,
    total_amount,
    notes,
    order_date,
    created_at
  ) VALUES (
    v_po_number,
    v_supplier_id,
    'draft', -- Auto-generated POs start as draft for review
    v_total_amount,
    'Auto-generated purchase order for ' || v_product_name || ' - Stock fell below reorder point (' || p_current_quantity || ' ≤ ' || p_reorder_point || ')',
    NOW(),
    NOW()
  ) RETURNING id INTO v_po_id;
  
  -- Create purchase order item
  INSERT INTO lats_purchase_order_items (
    purchase_order_id,
    product_id,
    variant_id,
    quantity_ordered,
    quantity_received,
    unit_cost,
    subtotal
  ) VALUES (
    v_po_id,
    p_product_id,
    p_variant_id,
    v_suggested_qty,
    0,
    v_unit_cost,
    v_total_amount
  );
  
  -- Log the auto-reorder
  INSERT INTO auto_reorder_log (
    product_id,
    variant_id,
    supplier_id,
    triggered_quantity,
    reorder_point,
    suggested_quantity,
    purchase_order_id,
    po_created
  ) VALUES (
    p_product_id,
    p_variant_id,
    v_supplier_id,
    p_current_quantity,
    p_reorder_point,
    v_suggested_qty,
    v_po_id,
    true
  );
  
  RAISE NOTICE '✅ Auto-created PO % for product % (Qty: %)', v_po_number, v_product_name, v_suggested_qty;
  
  RETURN v_po_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  INSERT INTO auto_reorder_log (
    product_id, variant_id, triggered_quantity, reorder_point,
    suggested_quantity, po_created, error_message
  ) VALUES (
    p_product_id, p_variant_id, p_current_quantity, p_reorder_point,
    v_suggested_qty, false, SQLERRM
  );
  
  RAISE NOTICE '❌ Error auto-creating PO: %', SQLERRM;
  RETURN NULL;



--
-- TOC entry 605 (class 1255 OID 1204298)
-- Name: auto_sync_sharing_on_branch_update(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- When a branch's sharing settings change, update all related records
  
  IF NEW.share_products IS DISTINCT FROM OLD.share_products THEN
    UPDATE lats_products 
    SET is_shared = NEW.share_products 
    WHERE branch_id = NEW.id;
    
    -- Also update variants
    UPDATE lats_product_variants v
    SET is_shared = NEW.share_products
    FROM lats_products p
    WHERE v.product_id = p.id AND p.branch_id = NEW.id;
    
    RAISE NOTICE 'Updated product sharing for branch %', NEW.name;
  END IF;

  IF NEW.share_customers IS DISTINCT FROM OLD.share_customers THEN
    UPDATE customers 
    SET is_shared = NEW.share_customers 
    WHERE branch_id = NEW.id;
    
    RAISE NOTICE 'Updated customer sharing for branch %', NEW.name;
  END IF;

  IF NEW.share_categories IS DISTINCT FROM OLD.share_categories THEN
    UPDATE lats_categories 
    SET is_shared = NEW.share_categories 
    WHERE branch_id = NEW.id;
    
    RAISE NOTICE 'Updated category sharing for branch %', NEW.name;
  END IF;

  IF NEW.share_suppliers IS DISTINCT FROM OLD.share_suppliers THEN
    UPDATE lats_suppliers 
    SET is_shared = NEW.share_suppliers 
    WHERE branch_id = NEW.id;
    
    RAISE NOTICE 'Updated supplier sharing for branch %', NEW.name;
  END IF;

  IF NEW.share_employees IS DISTINCT FROM OLD.share_employees THEN
    UPDATE employees 
    SET is_shared = COALESCE(can_work_at_all_branches, false) OR NEW.share_employees
    WHERE branch_id = NEW.id;
    
    RAISE NOTICE 'Updated employee sharing for branch %', NEW.name;
  END IF;

  RETURN NEW;



--
-- TOC entry 700 (class 1255 OID 1204299)
-- Name: begin_transaction_if_not_exists(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY SELECT TRUE, 'No-op begin (handled client-side)';



--
-- TOC entry 532 (class 1255 OID 1204300)
-- Name: calculate_attendance_hours(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600;
        
        IF NEW.total_hours > 8 THEN
            NEW.overtime_hours = NEW.total_hours - 8;
        ELSE
            NEW.overtime_hours = 0;
        END IF;
    END IF;
    
    RETURN NEW;



--
-- TOC entry 479 (class 1255 OID 1204301)
-- Name: calculate_leave_days(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    NEW.total_days = (NEW.end_date - NEW.start_date) + 1;
    RETURN NEW;



--
-- TOC entry 646 (class 1255 OID 1204302)
-- Name: calculate_next_due_date(date, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  CASE frequency_type
    WHEN 'daily' THEN
      RETURN p_current_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      RETURN p_current_date + INTERVAL '1 week';
    WHEN 'monthly' THEN
      RETURN p_current_date + INTERVAL '1 month';
    WHEN 'yearly' THEN
      RETURN p_current_date + INTERVAL '1 year';
    ELSE
      RETURN p_current_date + INTERVAL '1 month'; -- Default to monthly
  END CASE;



--
-- TOC entry 461 (class 1255 OID 1204303)
-- Name: calculate_next_execution_date(character varying, date); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN CASE p_frequency
    WHEN 'daily' THEN p_current_date + INTERVAL '1 day'
    WHEN 'weekly' THEN p_current_date + INTERVAL '1 week'
    WHEN 'biweekly' THEN p_current_date + INTERVAL '2 weeks'
    WHEN 'monthly' THEN p_current_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN p_current_date + INTERVAL '3 months'
    WHEN 'yearly' THEN p_current_date + INTERVAL '1 year'
    ELSE p_current_date + INTERVAL '1 month'
  END::DATE;



--
-- TOC entry 615 (class 1255 OID 1204304)
-- Name: calculate_parent_variant_stock(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  total_stock INTEGER;
  SELECT COALESCE(SUM(quantity), 0)
  INTO total_stock
  FROM lats_product_variants
  WHERE parent_variant_id = parent_variant_id_param
    AND variant_type = 'imei_child'
    AND is_active = TRUE
    AND quantity > 0;
    
  RETURN total_stock;



--
-- TOC entry 7768 (class 0 OID 0)
-- Dependencies: 615
-- Name: FUNCTION calculate_parent_variant_stock(parent_variant_id_param CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 576 (class 1255 OID 1204305)
-- Name: calculate_suggested_order_quantity(integer, integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_suggested_qty INTEGER;
  v_max_stock INTEGER;
  -- Use maximum_stock_level from settings if not provided
  IF p_maximum_stock_level IS NULL OR p_maximum_stock_level = 0 THEN
    SELECT COALESCE(setting_value::INTEGER, 1000) INTO v_max_stock
    FROM admin_settings
    WHERE category = 'inventory' AND setting_key = 'maximum_stock_level';
  ELSE
    v_max_stock := p_maximum_stock_level;
  END IF;
  
  -- Calculate: (Max Stock - Current Stock) + Safety Stock
  v_suggested_qty := (v_max_stock - p_current_quantity) + COALESCE(p_safety_stock_level, 0);
  
  -- Ensure it meets minimum order quantity
  IF v_suggested_qty < p_minimum_order_qty THEN
    v_suggested_qty := p_minimum_order_qty;
  END IF;
  
  -- Ensure it doesn't exceed reasonable limits
  IF v_suggested_qty > v_max_stock * 2 THEN
    v_suggested_qty := v_max_stock;
  END IF;
  
  RETURN v_suggested_qty;



--
-- TOC entry 604 (class 1255 OID 1204306)
-- Name: can_delete_store_location(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_product_count BIGINT;
    v_variant_count BIGINT;
    v_customer_count BIGINT;
    v_employee_count BIGINT;
    -- Count products
    SELECT COUNT(*) INTO v_product_count
    FROM lats_products
    WHERE branch_id = store_id;
    
    -- Count variants
    SELECT COUNT(*) INTO v_variant_count
    FROM lats_product_variants
    WHERE branch_id = store_id;
    
    -- Count customers
    SELECT COUNT(*) INTO v_customer_count
    FROM customers
    WHERE branch_id = store_id;
    
    -- Count employees
    SELECT COUNT(*) INTO v_employee_count
    FROM employees
    WHERE branch_id = store_id;
    
    -- Check if store can be deleted
    IF v_product_count > 0 OR v_variant_count > 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            'Store has ' || v_product_count || ' products and ' || v_variant_count || ' variants. Delete or transfer them first.',
            v_product_count,
            v_variant_count,
            v_customer_count,
            v_employee_count;
    ELSIF v_customer_count > 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            'Store has ' || v_customer_count || ' customers. Transfer them first or they will be unassigned.',
            v_product_count,
            v_variant_count,
            v_customer_count,
            v_employee_count;
    ELSIF v_employee_count > 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            'Store has ' || v_employee_count || ' employees. Transfer them first or they will be unassigned.',
            v_product_count,
            v_variant_count,
            v_customer_count,
            v_employee_count;
    ELSE
        RETURN QUERY SELECT 
            TRUE,
            'Store can be safely deleted.',
            v_product_count,
            v_variant_count,
            v_customer_count,
            v_employee_count;
    END IF;



--
-- TOC entry 7769 (class 0 OID 0)
-- Dependencies: 604
-- Name: FUNCTION can_delete_store_location(store_id CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 680 (class 1255 OID 1204307)
-- Name: can_user_access_branch(CHAR(36), CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Admins can access all branches
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = p_user_id 
    AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is assigned to the branch
  RETURN EXISTS (
    SELECT 1 FROM user_branch_assignments 
    WHERE user_id = p_user_id 
    AND branch_id = p_branch_id
  );



--
-- TOC entry 565 (class 1255 OID 1204308)
-- Name: check_all_products_for_reorder(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_variant RECORD;
  v_po_id CHAR(36);
  v_recent_po CHAR(36);
  -- Only proceed if auto-reorder is enabled
  IF NOT is_auto_reorder_enabled() THEN
    RAISE NOTICE '⚠️  Auto-reorder is disabled in settings';
    RETURN;
  END IF;
  
  RAISE NOTICE '🔍 Checking all products for reorder...';
  
  -- Loop through all variants below reorder point
  FOR v_variant IN 
      p.name as product_name,
      pv.id as variant_id,
      pv.quantity,
      pv.reorder_point,
      p.id as product_id
    FROM lats_product_variants pv
    JOIN lats_products p ON p.id = pv.product_id
    WHERE pv.reorder_point > 0
      AND pv.quantity <= pv.reorder_point
      AND p.is_active = true
  LOOP
    -- Check if we already created a PO recently
    SELECT purchase_order_id INTO v_recent_po
    FROM auto_reorder_log
    WHERE variant_id = v_variant.variant_id
      AND po_created = true
      AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_recent_po IS NOT NULL THEN
      -- Already has recent PO
      product_name := v_variant.product_name;
      variant_id := v_variant.variant_id;
      current_qty := v_variant.quantity;
      reorder_point := v_variant.reorder_point;
      po_created := true;
      po_id := v_recent_po;
      error := 'PO already created recently';
      RETURN NEXT;
    ELSE
      -- Create new PO
        v_po_id := auto_create_purchase_order_for_low_stock(
          v_variant.variant_id,
          v_variant.product_id,
          v_variant.quantity,
          v_variant.reorder_point
        );
        
        product_name := v_variant.product_name;
        variant_id := v_variant.variant_id;
        current_qty := v_variant.quantity;
        reorder_point := v_variant.reorder_point;
        po_created := (v_po_id IS NOT NULL);
        po_id := v_po_id;
        error := CASE WHEN v_po_id IS NULL THEN 'Failed to create PO' ELSE NULL END;
        RETURN NEXT;
      EXCEPTION WHEN OTHERS THEN
        product_name := v_variant.product_name;
        variant_id := v_variant.variant_id;
        current_qty := v_variant.quantity;
        reorder_point := v_variant.reorder_point;
        po_created := false;
        po_id := NULL;
        error := SQLERRM;
        RETURN NEXT;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Reorder check complete';
  RETURN;



--
-- TOC entry 699 (class 1255 OID 1204309)
-- Name: check_duplicate_imei(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Only check if IMEI is provided
  IF NEW.variant_attributes->>'imei' IS NOT NULL AND NEW.variant_attributes->>'imei' != '' THEN
    -- Check if IMEI already exists (excluding current variant)
    IF EXISTS (
      SELECT 1 
      FROM lats_product_variants 
      WHERE variant_attributes->>'imei' = NEW.variant_attributes->>'imei'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::CHAR(36))
        AND is_active = true  -- Only check active variants
    ) THEN
      RAISE EXCEPTION 'Duplicate IMEI Error: Device with IMEI % already exists in inventory. Each IMEI must be unique.', NEW.variant_attributes->>'imei';
    END IF;
  END IF;
  
  RETURN NEW;



--
-- TOC entry 449 (class 1255 OID 1204310)
-- Name: check_duplicate_transfer(CHAR(36), CHAR(36), CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_count INTEGER;
  SELECT COUNT(*) INTO v_count
  FROM branch_transfers
  WHERE from_branch_id = p_from_branch_id
    AND to_branch_id = p_to_branch_id
    AND entity_id = p_entity_id
    AND status IN ('pending', 'approved', 'in_transit');

  RETURN v_count > 0;



--
-- TOC entry 594 (class 1255 OID 1204311)
-- Name: check_imei_has_parent(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- ✅ UPDATED: Check both 'imei' (old) and 'imei_child' (new) variant types
  IF NEW.variant_type IN ('imei', 'imei_child') AND NEW.parent_variant_id IS NULL THEN
    RAISE EXCEPTION 'IMEI variant must have a parent_variant_id';
  END IF;
  RETURN NEW;



--
-- TOC entry 613 (class 1255 OID 1204312)
-- Name: check_products_without_variants(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    RETURN QUERY
        p.id,
        p.name,
        p.sku,
        p.stock_quantity,
        p.created_at
    FROM lats_products p
    LEFT JOIN lats_product_variants v ON p.id = v.product_id
    WHERE v.id IS NULL
      AND p.is_active = true
    ORDER BY p.created_at DESC;



--
-- TOC entry 585 (class 1255 OID 1204313)
-- Name: check_purchase_order_completion_status(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_total_items INTEGER := 0;
  v_completed_items INTEGER := 0;
  v_can_complete TINYINT(1) := false;
  v_completion_percentage NUMERIC := 0;
  v_po_status TEXT;
  v_payment_status TEXT;
  v_total_amount DECIMAL;
  v_paid_amount DECIMAL;
  -- Check if purchase order exists
  SELECT status, payment_status, total_amount 
  INTO v_po_status, v_payment_status, v_total_amount
  FROM lats_purchase_orders 
  WHERE id = purchase_order_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found'
    );
  END IF;
  
  -- Get total items count
  SELECT COUNT(*)::INTEGER INTO v_total_items
  FROM lats_purchase_order_items
  WHERE purchase_order_id = purchase_order_id_param;
  
  -- Count completed items (where quantity_received >= quantity_ordered)
  SELECT COUNT(*)::INTEGER INTO v_completed_items
  FROM lats_purchase_order_items
  WHERE purchase_order_id = purchase_order_id_param
    AND COALESCE(quantity_received, 0) >= quantity_ordered;
  
  -- Calculate completion percentage
  IF v_total_items > 0 THEN
    v_completion_percentage := ROUND((v_completed_items::NUMERIC / v_total_items::NUMERIC) * 100, 2);
  END IF;
  
  -- Get total paid amount
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
  FROM purchase_order_payments
  WHERE purchase_order_id = purchase_order_id_param
    AND status = 'completed';
  
  -- Determine if can complete:
  -- 1. All items must be received (or at least status is 'received')
  -- 2. Payment must be complete OR status is already 'paid'
  v_can_complete := (
    (v_po_status = 'received' OR v_completed_items = v_total_items) 
    AND (v_payment_status = 'paid' OR v_paid_amount >= v_total_amount)
  );
  
  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'total_items', v_total_items,
      'completed_items', v_completed_items,
      'can_complete', v_can_complete,
      'completion_percentage', v_completion_percentage,
      'po_status', v_po_status,
      'payment_status', v_payment_status,
      'total_amount', v_total_amount,
      'paid_amount', v_paid_amount
    ),
    'message', 'Completion status retrieved successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Error checking completion status: ' || SQLERRM
  );



--
-- TOC entry 477 (class 1255 OID 1204318)
-- Name: check_shipment_ready_for_inventory(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_total INTEGER;
    v_validated INTEGER;
    -- Count total cargo items
    SELECT COUNT(*) INTO v_total
    FROM lats_shipping_cargo_items
    WHERE shipping_id = p_shipping_id;
    
    -- Count validated products
    SELECT COUNT(*) INTO v_validated
    FROM lats_product_validation
    WHERE shipping_id = p_shipping_id
    AND is_validated = TRUE;
    
    RETURN QUERY SELECT 
        (v_total > 0 AND v_total = v_validated) as is_ready,
        v_total as total_products,
        v_validated as validated_products,
        (v_total - v_validated) as missing_products;



--
-- TOC entry 459 (class 1255 OID 1204319)
-- Name: check_variant_exists(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    ;



--
-- TOC entry 7770 (class 0 OID 0)
-- Dependencies: 459
-- Name: FUNCTION check_variant_exists(p_variant_id CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 586 (class 1255 OID 1204320)
-- Name: cleanup_duplicate_imeis(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    duplicate_record RECORD;
    variant_to_keep CHAR(36);
    RAISE NOTICE '🔍 Scanning for duplicate IMEIs...';
    
    FOR duplicate_record IN 
            variant_attributes->>'imei' as imei_value,
            array_agg(id ORDER BY created_at) as variant_ids,
            COUNT(*) as dup_count
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
          AND variant_attributes->>'imei' != ''
        GROUP BY variant_attributes->>'imei'
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first one (oldest)
        variant_to_keep := duplicate_record.variant_ids[1];
        
        -- Mark duplicates with 'duplicate' status
        UPDATE lats_product_variants
        SET variant_attributes = jsonb_set(
            COALESCE(variant_attributes, '{}'::JSON),
            '{imei_status}',
            '"duplicate"'::JSON
        )
        WHERE id = ANY(duplicate_record.variant_ids[2:]);
        
        RETURN QUERY SELECT 
            duplicate_record.imei_value::text,
            duplicate_record.dup_count,
            variant_to_keep,
            'Marked duplicates with status=duplicate'::text;
    END LOOP;
    
    RAISE NOTICE '✅ Duplicate cleanup completed';



--
-- TOC entry 651 (class 1255 OID 1204321)
-- Name: cleanup_orphaned_imeis(TINYINT(1)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  IF p_dry_run THEN
    -- Just report what would be deleted
    RETURN QUERY
      v.id as orphan_id,
      COALESCE(v.attributes->>'imei', v.name) as imei,
      v.parent_variant_id,
      'WOULD DELETE'::TEXT as action
    FROM lats_product_variants v
    WHERE v.variant_type = 'imei'
    AND v.parent_variant_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM lats_product_variants p
      WHERE p.id = v.parent_variant_id
    );
  ELSE
    -- Actually delete orphaned IMEIs
    RETURN QUERY
    WITH deleted AS (
      DELETE FROM lats_product_variants
      WHERE variant_type = 'imei'
      AND parent_variant_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM lats_product_variants p
        WHERE p.id = lats_product_variants.parent_variant_id
      )
      RETURNING id, COALESCE(attributes->>'imei', name) as imei_val, parent_variant_id
    )
    SELECT id, imei_val, parent_variant_id, 'DELETED'::TEXT
    FROM deleted;
  END IF;



--
-- TOC entry 480 (class 1255 OID 1204322)
-- Name: close_current_session(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  UPDATE daily_opening_sessions
  SET is_active = false
  WHERE date = NEW.date AND is_active = true;
  
  RETURN NEW;



--
-- TOC entry 657 (class 1255 OID 1204323)
-- Name: commit_transaction_if_exists(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY SELECT TRUE, 'No-op commit (handled client-side)';



--
-- TOC entry 485 (class 1255 OID 1204324)
-- Name: complete_purchase_order(CHAR(36), CHAR(36), text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_po_record RECORD;
  v_total_items INTEGER := 0;
  v_completed_items INTEGER := 0;
  v_can_complete TINYINT(1) := false;
  v_total_amount DECIMAL;
  v_paid_amount DECIMAL;
  v_reason TEXT := '';
  -- Get purchase order details
  SELECT * INTO v_po_record 
  FROM lats_purchase_orders 
  WHERE id = purchase_order_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found',
      'error_code', 'NOT_FOUND'
    );
  END IF;
  
  -- Check if already completed
  IF v_po_record.status = 'completed' THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Purchase order is already completed',
      'data', json_build_object(
        'purchase_order_id', purchase_order_id_param,
        'status', 'completed'
      )
    );
  END IF;
  
  -- Get total items count
  SELECT COUNT(*)::INTEGER INTO v_total_items
  FROM lats_purchase_order_items
  WHERE purchase_order_id = purchase_order_id_param;
  
  -- Count completed items (where quantity_received >= quantity_ordered)
  SELECT COUNT(*)::INTEGER INTO v_completed_items
  FROM lats_purchase_order_items
  WHERE purchase_order_id = purchase_order_id_param
    AND COALESCE(quantity_received, 0) >= quantity_ordered;
  
  -- Get payment amounts
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
  FROM purchase_order_payments
  WHERE purchase_order_id = purchase_order_id_param
    AND status = 'completed';
  
  v_total_amount := COALESCE(v_po_record.total_amount, 0);
  
  -- More flexible completion logic:
  -- Option 1: Payment is marked as paid (most common)
  -- Option 2: All items received AND payment complete
  -- Option 3: Status is already 'received' and payment is done
  
  IF v_po_record.payment_status = 'paid' THEN
    -- If payment status is 'paid', we can complete regardless
    v_can_complete := true;
    v_reason := 'Payment status is paid';
  ELSIF v_paid_amount >= v_total_amount THEN
    -- If paid amount covers total, we can complete
    v_can_complete := true;
    v_reason := 'Full payment received';
  ELSIF v_po_record.status = 'received' AND v_total_amount = 0 THEN
    -- Free items or zero-cost order that's been received
    v_can_complete := true;
    v_reason := 'Received with no payment required';
  ELSIF v_completed_items = v_total_items AND v_completed_items > 0 THEN
    -- All items received - allow completion (payment might be on credit)
    v_can_complete := true;
    v_reason := 'All items received';
  ELSE
    v_can_complete := false;
    v_reason := 'Insufficient completion criteria';
  END IF;
  
  -- If not all conditions met, return detailed error
  IF NOT v_can_complete THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Cannot complete purchase order. ' || v_reason,
      'error_code', 'INCOMPLETE',
      'data', json_build_object(
        'total_items', v_total_items,
        'completed_items', v_completed_items,
        'total_amount', v_total_amount,
        'paid_amount', v_paid_amount,
        'status', v_po_record.status,
        'payment_status', v_po_record.payment_status,
        'reason', v_reason
      )
    );
  END IF;
  
  -- Update purchase order to completed status
  -- Note: Not all PO tables have completed_at column, so we only update status and updated_at
  UPDATE lats_purchase_orders
  SET 
    status = 'completed',
    updated_at = NOW(),
    notes = CASE 
      WHEN completion_notes IS NOT NULL THEN 
        COALESCE(notes || E'\n\n', '') || 'Completed: ' || completion_notes
      ELSE notes
  WHERE id = purchase_order_id_param;
  
  -- Create audit log entry if audit table exists
  -- Note: Audit table may not exist or may have different schema
  -- We catch all exceptions to prevent audit logging from blocking completion
    INSERT INTO purchase_order_audit (
      purchase_order_id,
      action,
      user_id,
      details,
      DATETIME
    ) VALUES (
      purchase_order_id_param,
      'completed',
      user_id_param,
      completion_notes,
      NOW()
    );
  EXCEPTION 
    WHEN undefined_table THEN
      -- Audit table doesn't exist, skip audit logging
      NULL;
    WHEN undefined_column THEN
      -- Audit table has different schema, skip audit logging
      NULL;
    WHEN OTHERS THEN
      -- Any other audit error, skip audit logging
      NULL;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Purchase order completed successfully',
    'data', json_build_object(
      'purchase_order_id', purchase_order_id_param,
      'status', 'completed',
      'updated_at', NOW(),
      'items_completed', v_completed_items,
      'total_items', v_total_items,
      'completion_reason', v_reason
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Error completing purchase order: ' || SQLERRM,
    'error_code', 'DATABASE_ERROR'
  );



--
-- TOC entry 597 (class 1255 OID 1204326)
-- Name: complete_purchase_order_receive(CHAR(36), CHAR(36), text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_order_record RECORD;
  v_item_record RECORD;
  v_items_created INTEGER := 0;
  v_quantity INTEGER;
  v_i INTEGER;
  v_total_items INTEGER := 0;
  v_total_ordered INTEGER := 0;
  v_total_received INTEGER := 0;
  v_all_received TINYINT(1);
  v_new_status VARCHAR;
  v_result JSON;
  v_current_quantity INTEGER;
  -- Check if purchase order exists and is in correct status
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

  -- Check if order is in a receivable status
  IF v_order_record.status NOT IN ('shipped', 'partial_received', 'confirmed', 'sent', 'completed') THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Cannot receive order in status: %s', v_order_record.status),
      'error_code', 'INVALID_STATUS'
    );
  END IF;

  -- Begin transaction
    -- Process each purchase order item
    FOR v_item_record IN
        poi.id as item_id,
        poi.product_id,
        poi.variant_id,
        poi.quantity_ordered,
        COALESCE(poi.quantity_received, 0) as quantity_received,
        poi.unit_cost,
        p.name as product_name,
        pv.name as variant_name,
        p.sku as product_sku,
        pv.sku as variant_sku,
        COALESCE(pv.selling_price, pv.unit_price, 0) as selling_price,
        COALESCE(pv.quantity, 0) as current_variant_quantity
      FROM lats_purchase_order_items poi
      LEFT JOIN lats_products p ON p.id = poi.product_id
      LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
      WHERE poi.purchase_order_id = purchase_order_id_param
    LOOP
      v_total_items := v_total_items + 1;
      v_total_ordered := v_total_ordered + v_item_record.quantity_ordered;

      -- Calculate quantity to receive (total ordered - already received)
      v_quantity := v_item_record.quantity_ordered - v_item_record.quantity_received;

      IF v_quantity > 0 THEN
        -- Update product supplier_id if not already set
        IF v_item_record.product_id IS NOT NULL AND v_order_record.supplier_id IS NOT NULL THEN
          UPDATE lats_products
          SET
            supplier_id = v_order_record.supplier_id,
            updated_at = NOW()
          WHERE id = v_item_record.product_id
            AND supplier_id IS NULL;
        END IF;

        -- ⭐ UPDATE VARIANT STOCK QUANTITY ⭐
        -- This is the critical fix that was missing!
        IF v_item_record.variant_id IS NOT NULL THEN
          -- Get current quantity
          SELECT COALESCE(quantity, 0) INTO v_current_quantity
          FROM lats_product_variants
          WHERE id = v_item_record.variant_id;

          -- Update variant quantity
          UPDATE lats_product_variants
          SET
            quantity = COALESCE(quantity, 0) + v_quantity,
            updated_at = NOW()
          WHERE id = v_item_record.variant_id;

          -- Create stock movement record for tracking
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
            'Purchase Order Receipt',
            format('PO-%s', v_order_record.po_number),
            format('Received %s units from PO %s%s',
              v_quantity,
              v_order_record.po_number,
              CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
            ),
            user_id_param,
            NOW()
          );

          RAISE NOTICE '✅ Updated variant % stock: % -> % (+ %)',
            v_item_record.variant_id,
            v_current_quantity,
            v_current_quantity + v_quantity,
            v_quantity;
        END IF;

        -- Create inventory items for the quantity to receive
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
            branch_id,
            created_at,
            updated_at
          ) VALUES (
            purchase_order_id_param,
            v_item_record.item_id,
            v_item_record.product_id,
            v_item_record.variant_id,
            'available',
            COALESCE(v_item_record.unit_cost, 0),
            COALESCE(v_item_record.selling_price, 0),
            format(
              'Received from PO %s - %s %s (Item %s of %s)%s',
              v_order_record.po_number,
              v_item_record.product_name,
              COALESCE(' - ' || v_item_record.variant_name, ''),
              v_i,
              v_quantity,
              CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
            ),
            jsonb_build_object(
              'purchase_order_id', purchase_order_id_param::text,
              'purchase_order_item_id', v_item_record.item_id::text,
              'order_number', v_order_record.po_number,
              'supplier_id', v_order_record.supplier_id::text,
              'batch_number', v_i,
              'received_by', user_id_param::text,
              'received_at', NOW(),
              'auto_generated', true
            ),
            NOW(),
            v_order_record.branch_id,
            NOW(),
            NOW()
          );

          v_items_created := v_items_created + 1;
        END LOOP;

        -- Update the purchase order item with received quantity (increment, not replace)
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

    -- Calculate total received for summary
    SELECT COALESCE(SUM(quantity_received), 0)
    INTO v_total_received
    FROM lats_purchase_order_items
    WHERE purchase_order_id = purchase_order_id_param;

    -- Calculate total ordered for summary
    SELECT COALESCE(SUM(quantity_ordered), 0)
    INTO v_total_ordered
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

    -- Build success response with complete summary
    v_result := json_build_object(
      'success', true,
      'message', format('Successfully received %s items from purchase order and updated stock', v_items_created),
      'data', json_build_object(
        'purchase_order_id', purchase_order_id_param,
        'order_number', v_order_record.po_number,
        'items_created', v_items_created,
        'total_items', v_total_items,
        'total_ordered', v_total_ordered,
        'total_received', v_total_received,
        'is_complete', v_all_received,
        'new_status', v_new_status,
        'received_date', NOW(),
        'received_by', user_id_param
      ),
      'summary', json_build_object(
        'total_ordered', v_total_ordered,
        'total_received', v_total_received,
        'percent_received', CASE WHEN v_total_ordered > 0 THEN ROUND((v_total_received::NUMERIC / v_total_ordered::NUMERIC) * 100) ELSE 0 END,
        'is_complete', v_all_received,
        'items_this_batch', v_items_created
      )
    );

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Roll back and return error
      RAISE WARNING 'Error in complete_purchase_order_receive: %', SQLERRM;
      RETURN json_build_object(
        'success', false,
        'message', format('Error receiving purchase order: %s', SQLERRM),
        'error_code', 'RECEIVE_ERROR'
      );



--
-- TOC entry 7771 (class 0 OID 0)
-- Dependencies: 597
-- Name: FUNCTION complete_purchase_order_receive(purchase_order_id_param CHAR(36), user_id_param CHAR(36), receive_notes text); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 444 (class 1255 OID 1204328)
-- Name: complete_purchase_order_receive_v2(CHAR(36), CHAR(36), text, TINYINT(1)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_order_record RECORD;
  v_item_record RECORD;
  v_items_created INTEGER := 0;
  v_stock_updated INTEGER := 0;
  v_quantity_to_receive INTEGER;
  v_actual_received INTEGER;
  v_i INTEGER;
  v_total_items INTEGER := 0;
  v_total_ordered INTEGER := 0;
  v_total_received INTEGER := 0;
  v_all_received TINYINT(1);
  v_new_status VARCHAR;
  v_result JSON;
  v_current_quantity INTEGER;
  v_inventory_count INTEGER;
  v_stock_movement_exists TINYINT(1);
  -- Check if purchase order exists and is in correct status
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

  -- Check if order is in a receivable status
  IF v_order_record.status NOT IN ('shipped', 'partial_received', 'confirmed', 'sent', 'completed') AND NOT force_receive THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Cannot receive order in status: %s', v_order_record.status),
      'error_code', 'INVALID_STATUS'
    );
  END IF;

  -- Begin transaction
    -- Process each purchase order item
    FOR v_item_record IN
        poi.id as item_id,
        poi.product_id,
        poi.variant_id,
        poi.quantity_ordered,
        COALESCE(poi.quantity_received, 0) as quantity_received,
        poi.unit_cost,
        p.name as product_name,
        pv.name as variant_name,
        p.sku as product_sku,
        pv.sku as variant_sku,
        COALESCE(pv.selling_price, pv.unit_price, 0) as selling_price,
        COALESCE(pv.quantity, 0) as current_variant_quantity
      FROM lats_purchase_order_items poi
      LEFT JOIN lats_products p ON p.id = poi.product_id
      LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
      WHERE poi.purchase_order_id = purchase_order_id_param
    LOOP
      v_total_items := v_total_items + 1;
      v_total_ordered := v_total_ordered + v_item_record.quantity_ordered;
      
      -- Calculate how many items we still need to receive
      v_quantity_to_receive := v_item_record.quantity_ordered - v_item_record.quantity_received;
      
      -- Check if stock has already been updated for this item
      -- Look for existing stock movements for this PO item
      SELECT COUNT(*) INTO v_inventory_count
      FROM inventory_items
      WHERE purchase_order_item_id = v_item_record.item_id;
      
      SELECT EXISTS(
        SELECT 1 FROM lats_stock_movements 
        WHERE reference_id = v_item_record.item_id::text
          AND reference_type = 'purchase_order_item'
          AND reason = 'Purchase Order Receipt'
      ) INTO v_stock_movement_exists;
      
      -- Determine how many we actually need to receive
      IF v_quantity_to_receive > 0 OR force_receive THEN
        -- If force_receive is true, recalculate based on actual inventory vs expected
        IF force_receive THEN
          -- Count how many inventory items should exist vs actually exist
          v_actual_received := v_inventory_count;
          v_quantity_to_receive := v_item_record.quantity_ordered - v_actual_received;
          
          IF v_quantity_to_receive <= 0 THEN
            v_quantity_to_receive := 0; -- Already fully received
          END IF;
        END IF;
        
        IF v_quantity_to_receive > 0 THEN
          -- Update product supplier_id if not already set
          IF v_item_record.product_id IS NOT NULL AND v_order_record.supplier_id IS NOT NULL THEN
            UPDATE lats_products
            SET
              supplier_id = v_order_record.supplier_id,
              updated_at = NOW()
            WHERE id = v_item_record.product_id
              AND supplier_id IS NULL;
          END IF;

          -- ⭐ SAFE STOCK UPDATE ⭐
          -- Only update stock if variant exists and we haven't already updated it
          IF v_item_record.variant_id IS NOT NULL THEN
            -- Get current quantity
            SELECT COALESCE(quantity, 0) INTO v_current_quantity
            FROM lats_product_variants
            WHERE id = v_item_record.variant_id;

            -- Update variant quantity
            UPDATE lats_product_variants
            SET
              quantity = COALESCE(quantity, 0) + v_quantity_to_receive,
              updated_at = NOW()
            WHERE id = v_item_record.variant_id;

            -- Create stock movement record (avoid duplicates)
            INSERT INTO lats_stock_movements (
              product_id,
              variant_id,
              movement_type,
              quantity,
              previous_quantity,
              new_quantity,
              reference_type,
              reference_id,
              reason,
              reference,
              notes,
              created_by,
              created_at
            ) VALUES (
              v_item_record.product_id,
              v_item_record.variant_id,
              'in',
              v_quantity_to_receive,
              v_current_quantity,
              v_current_quantity + v_quantity_to_receive,
              'purchase_order_item',
              v_item_record.item_id,
              'Purchase Order Receipt',
              format('PO-%s', v_order_record.po_number),
              format('Received %s units from PO %s item %s%s',
                v_quantity_to_receive,
                v_order_record.po_number,
                v_item_record.item_id,
                CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
              ),
              user_id_param,
              NOW()
            )
            ON CONFLICT DO NOTHING; -- Prevent duplicate stock movements

            v_stock_updated := v_stock_updated + v_quantity_to_receive;
            
            RAISE NOTICE '✅ Updated variant % stock: % -> % (+ %)', 
              v_item_record.variant_id, 
              v_current_quantity, 
              v_current_quantity + v_quantity_to_receive, 
              v_quantity_to_receive;
          END IF;

          -- Create inventory items for the quantity to receive
          FOR v_i IN 1..v_quantity_to_receive LOOP
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
              purchase_order_id_param,
              v_item_record.item_id,
              v_item_record.product_id,
              v_item_record.variant_id,
              'available',
              COALESCE(v_item_record.unit_cost, 0),
              COALESCE(v_item_record.selling_price, 0),
              format(
                'Received from PO %s - %s %s (Item %s of %s)%s',
                v_order_record.po_number,
                v_item_record.product_name,
                COALESCE(' - ' || v_item_record.variant_name, ''),
                v_i,
                v_quantity_to_receive,
                CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
              ),
              jsonb_build_object(
                'purchase_order_id', purchase_order_id_param::text,
                'purchase_order_item_id', v_item_record.item_id::text,
                'order_number', v_order_record.po_number,
                'supplier_id', v_order_record.supplier_id::text,
                'batch_number', v_i,
                'received_by', user_id_param::text,
                'received_at', NOW(),
                'auto_generated', true
              ),
              NOW(),
              v_order_record.branch_id,
              NOW(),
              NOW()
            );

            v_items_created := v_items_created + 1;
          END LOOP;

          -- Update the purchase order item with received quantity
          UPDATE lats_purchase_order_items
          SET
            quantity_received = COALESCE(quantity_received, 0) + v_quantity_to_receive,
            updated_at = NOW()
          WHERE id = v_item_record.item_id;
          
          RAISE NOTICE '✅ Processed item %: received % units, total now %/%', 
            v_item_record.item_id, v_quantity_to_receive, 
            v_item_record.quantity_received + v_quantity_to_receive, v_item_record.quantity_ordered;
        END IF;
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
    SELECT COALESCE(SUM(quantity_received), 0), COALESCE(SUM(quantity_ordered), 0)
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
      format('%s: Created %s inventory items, updated %s stock units (%s/%s received)%s',
        CASE WHEN v_all_received THEN 'Complete receive' ELSE 'Partial receive' END,
        v_items_created,
        v_stock_updated,
        v_total_received,
        v_total_ordered,
        CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
      ),
      NOW()
    );

    -- Build success response
    v_result := json_build_object(
      'success', true,
      'message', format('Successfully processed purchase order: %s inventory items created, %s stock units updated', v_items_created, v_stock_updated),
      'data', json_build_object(
        'purchase_order_id', purchase_order_id_param,
        'order_number', v_order_record.po_number,
        'items_created', v_items_created,
        'stock_updated', v_stock_updated,
        'total_items', v_total_items,
        'total_ordered', v_total_ordered,
        'total_received', v_total_received,
        'is_complete', v_all_received,
        'new_status', v_new_status
      ),
      'summary', json_build_object(
        'total_ordered', v_total_ordered,
        'total_received', v_total_received,
        'percent_received', CASE WHEN v_total_ordered > 0 THEN ROUND((v_total_received::NUMERIC / v_total_ordered::NUMERIC) * 100) ELSE 0 END,
        'is_complete', v_all_received,
        'items_this_batch', v_items_created,
        'stock_this_batch', v_stock_updated
      )
    );

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Roll back and return error
      RAISE WARNING 'Error in complete_purchase_order_receive_v2: %', SQLERRM;
      RETURN json_build_object(
        'success', false,
        'message', format('Error receiving purchase order: %s', SQLERRM),
        'error_code', 'RECEIVE_ERROR'
      );



--
-- TOC entry 626 (class 1255 OID 1204330)
-- Name: complete_quality_check(CHAR(36), text, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_total_items INTEGER;
  v_passed_items INTEGER;
  v_failed_items INTEGER;
  v_overall_result TEXT;
  -- Count items by result
    COUNT(*),
    COUNT(*) FILTER (WHERE result = 'pass'),
    COUNT(*) FILTER (WHERE result = 'fail')
  INTO v_total_items, v_passed_items, v_failed_items
  FROM purchase_order_quality_check_items
  WHERE quality_check_id = p_quality_check_id;

  -- Determine overall result
  IF v_failed_items = 0 THEN
    v_overall_result := 'pass';
  ELSIF v_passed_items = 0 THEN
    v_overall_result := 'fail';
  ELSE
    v_overall_result := 'conditional';
  END IF;

  -- Update quality check
  UPDATE purchase_order_quality_checks
  SET 
    status = CASE 
      WHEN v_overall_result = 'fail' THEN 'failed'
      ELSE 'passed'
    END,
    overall_result = v_overall_result,
    checked_at = NOW(),
    notes = COALESCE(p_notes, notes),
    signature = COALESCE(p_signature, signature),
    updated_at = NOW()
  WHERE id = p_quality_check_id;

  RETURN jsonb_build_object(
    'success', true,
    'overall_result', v_overall_result,
    'total_items', v_total_items,
    'passed_items', v_passed_items,
    'failed_items', v_failed_items
  );



--
-- TOC entry 7772 (class 0 OID 0)
-- Dependencies: 626
-- Name: FUNCTION complete_quality_check(p_quality_check_id CHAR(36), p_notes text, p_signature text); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 665 (class 1255 OID 1204331)
-- Name: complete_stock_transfer_transaction(CHAR(36), CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_transfer RECORD;
  v_destination_variant_id CHAR(36);
  v_source_previous_qty INTEGER;
  v_source_previous_reserved INTEGER;
  v_dest_previous_qty INTEGER;
  v_source_new_qty INTEGER;
  v_dest_new_qty INTEGER;
  v_result JSON;
  -- Get and lock transfer
  SELECT * INTO v_transfer
  FROM branch_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found: %', p_transfer_id;
  END IF;

  -- Validate transfer status - MUST be in_transit (shipped) before completion
  IF v_transfer.status != 'in_transit' THEN
    RAISE EXCEPTION 'Transfer must be marked as "in_transit" (shipped) before it can be completed. Current status: %. Please ask the sender to mark it as shipped first.', v_transfer.status;
  END IF;

  -- Get source variant quantities BEFORE transfer
  SELECT quantity, reserved_quantity 
  INTO v_source_previous_qty, v_source_previous_reserved
  FROM lats_product_variants
  WHERE id = v_transfer.entity_id;

  RAISE NOTICE 'Source variant before: qty=%, reserved=%', v_source_previous_qty, v_source_previous_reserved;

  -- Find or create destination variant
  v_destination_variant_id := find_or_create_variant_at_branch(
    v_transfer.entity_id,
    v_transfer.to_branch_id
  );

  -- Get destination variant quantity BEFORE transfer
  SELECT quantity INTO v_dest_previous_qty
  FROM lats_product_variants
  WHERE id = v_destination_variant_id;

  RAISE NOTICE 'Destination variant before: qty=%', v_dest_previous_qty;

  -- Make product shared across branches (so it appears in both branch inventories)
  UPDATE lats_products
  SET is_shared = true
  WHERE id = (SELECT product_id FROM lats_product_variants WHERE id = v_transfer.entity_id);

  RAISE NOTICE 'Product marked as shared for multi-branch visibility';

  -- Reduce stock from source (also releases reservation)
  PERFORM reduce_variant_stock(v_transfer.entity_id, v_transfer.quantity);

  -- Increase stock at destination
  PERFORM increase_variant_stock(v_destination_variant_id, v_transfer.quantity);

  -- Get new quantities AFTER transfer
  SELECT quantity INTO v_source_new_qty
  FROM lats_product_variants
  WHERE id = v_transfer.entity_id;

  SELECT quantity INTO v_dest_new_qty
  FROM lats_product_variants
  WHERE id = v_destination_variant_id;

  RAISE NOTICE 'Source variant after: qty=%', v_source_new_qty;
  RAISE NOTICE 'Destination variant after: qty=%', v_dest_new_qty;

  -- Mark transfer as completed
  UPDATE branch_transfers
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_transfer_id;

  RAISE NOTICE 'Transfer marked as completed';

  -- Build and return result
  v_result := jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'source_variant_id', v_transfer.entity_id,
    'destination_variant_id', v_destination_variant_id,
    'quantity_transferred', v_transfer.quantity,
    'source_before', jsonb_build_object('quantity', v_source_previous_qty, 'reserved', v_source_previous_reserved),
    'source_after', jsonb_build_object('quantity', v_source_new_qty),
    'destination_before', jsonb_build_object('quantity', v_dest_previous_qty),
    'destination_after', jsonb_build_object('quantity', v_dest_new_qty),
    'completed_at', NOW()
  );

  RETURN v_result;



--
-- TOC entry 7773 (class 0 OID 0)
-- Dependencies: 665
-- Name: FUNCTION complete_stock_transfer_transaction(p_transfer_id CHAR(36), p_completed_by CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 543 (class 1255 OID 1204332)
-- Name: create_account_transaction(CHAR(36), text, numeric, text, text, JSON, CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_transaction_id CHAR(36);
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_branch_id CHAR(36);
  -- Get current balance and branch_id from account
  SELECT balance, branch_id INTO v_current_balance, v_branch_id
  FROM finance_accounts
  WHERE id = p_account_id;

  -- Calculate new balance based on transaction type
  IF p_transaction_type IN ('payment_received', 'transfer_in') THEN
    v_new_balance := v_current_balance + p_amount;
  ELSE
    v_new_balance := v_current_balance - p_amount;
  END IF;

  -- Insert transaction with branch_id
  INSERT INTO account_transactions (
    account_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reference_number,
    description,
    metadata,
    created_by,
    branch_id
  ) VALUES (
    p_account_id,
    p_transaction_type,
    p_amount,
    v_current_balance,
    v_new_balance,
    p_reference_number,
    p_description,
    p_metadata,
    p_created_by,
    v_branch_id
  ) RETURNING id INTO v_transaction_id;

  -- Update account balance
  UPDATE finance_accounts
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_account_id;

  RETURN v_transaction_id;



--
-- TOC entry 7774 (class 0 OID 0)
-- Dependencies: 543
-- Name: FUNCTION create_account_transaction(p_account_id CHAR(36), p_transaction_type text, p_amount numeric, p_reference_number text, p_description text, p_metadata JSON, p_created_by CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 446 (class 1255 OID 1204333)
-- Name: create_draft_products_from_po(CHAR(36), CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_products_created INTEGER := 0;
    -- Create cargo items from purchase order items
    INSERT INTO lats_shipping_cargo_items (
        shipping_id,
        product_id,
        purchase_order_item_id,
        quantity,
        cost_price,
        description
    )
        p_shipping_id,
        poi.product_id,
        poi.id,
        poi.quantity,
        poi.unit_price,
        p.name || ' - ' || COALESCE(p.description, '')
    FROM lats_purchase_order_items poi
    INNER JOIN lats_products p ON p.id = poi.product_id
    WHERE poi.purchase_order_id = p_purchase_order_id
    AND poi.product_id IS NOT NULL;
    
    GET DIAGNOSTICS v_products_created = ROW_COUNT;
    
    RETURN QUERY SELECT TRUE, v_products_created, NULL::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 0, SQLERRM;



--
-- TOC entry 572 (class 1255 OID 1204334)
-- Name: create_missing_inventory_items_for_po(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

        DECLARE
          v_items_created INTEGER := 0;
          v_item_record RECORD;
          v_quantity INTEGER;
          v_i INTEGER;
          IF NOT EXISTS (SELECT 1 FROM lats_purchase_orders WHERE id = po_id AND status IN ('received', 'completed')) THEN
            RETURN json_build_object('success', false, 'message', 'PO not found or not in received/completed status', 'items_created', 0);
          END IF;

          FOR v_item_record IN 
            SELECT poi.id as item_id, poi.product_id, poi.variant_id, poi.quantity_received,
                   poi.quantity_ordered, poi.unit_cost as unit_price,
                   p.name as product_name, pv.name as variant_name
            FROM lats_purchase_order_items poi
            LEFT JOIN lats_products p ON p.id = poi.product_id
            LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
            WHERE poi.purchase_order_id = po_id
          LOOP
            v_quantity := COALESCE(v_item_record.quantity_received, v_item_record.quantity_ordered, 0);
            
            IF v_quantity > 0 THEN
              FOR v_i IN 1..v_quantity LOOP
                INSERT INTO inventory_items (
                  purchase_order_id, purchase_order_item_id, product_id, variant_id,
                  status, cost_price, notes, metadata, created_at, updated_at
                ) VALUES (
                  po_id, v_item_record.item_id, v_item_record.product_id, v_item_record.variant_id,
                  'available', COALESCE(v_item_record.unit_price, 0),
                  format('Received from PO - %s %s (Item %s of %s)', v_item_record.product_name,
                    COALESCE(v_item_record.variant_name, ''), v_i, v_quantity),
                  jsonb_build_object('purchase_order_id', po_id::text, 'purchase_order_item_id',
                    v_item_record.item_id::text, 'batch_number', v_i, 'auto_generated', true,
                    'generated_at', NOW()),
                  NOW(), NOW()
                );
                v_items_created := v_items_created + 1;
              END LOOP;
            END IF;
          END LOOP;

          RETURN json_build_object('success', true, 'message', format('Created %s inventory items', v_items_created), 'items_created', v_items_created);



--
-- TOC entry 645 (class 1255 OID 1204335)
-- Name: create_next_recurring_reminder(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  next_date DATE;
  recurring_config JSON;
  IF NEW.status = 'completed' AND OLD.status = 'pending' AND NEW.recurring IS NOT NULL THEN
    recurring_config := NEW.recurring;
    
    IF (recurring_config->>'enabled')::TINYINT(1) = TRUE THEN
      CASE recurring_config->>'type'
        WHEN 'daily' THEN
          next_date := NEW.date + ((recurring_config->>'interval')::INTEGER || ' days')::INTERVAL;
        WHEN 'weekly' THEN
          next_date := NEW.date + ((recurring_config->>'interval')::INTEGER * 7 || ' days')::INTERVAL;
        WHEN 'monthly' THEN
          next_date := NEW.date + ((recurring_config->>'interval')::INTEGER || ' months')::INTERVAL;
      END CASE;
      
      IF recurring_config->>'endDate' IS NULL OR 
         next_date <= (recurring_config->>'endDate')::DATE THEN
        INSERT INTO reminders (
          title, description, date, time, priority, category,
          status, notify_before, related_to, assigned_to, created_by,
          branch_id, recurring
        ) VALUES (
          NEW.title, NEW.description, next_date, NEW.time, NEW.priority, NEW.category,
          'pending', NEW.notify_before, NEW.related_to, NEW.assigned_to, NEW.created_by,
          NEW.branch_id, NEW.recurring
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;



--
-- TOC entry 453 (class 1255 OID 1204336)
-- Name: create_product_variant(CHAR(36), text, text, numeric, numeric, integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_id CHAR(36);
    has_variant_name TINYINT(1);
    has_name TINYINT(1);
    -- Check which columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_name'
    ) INTO has_variant_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'name'
    ) INTO has_name;
    
    -- Insert using appropriate column name
    IF has_variant_name THEN
        INSERT INTO lats_product_variants (
            product_id, variant_name, sku, cost_price, unit_price, 
            selling_price, quantity, variant_attributes, is_active
        )
        VALUES (
            p_product_id, p_variant_name, p_sku, p_cost_price, p_unit_price,
            p_unit_price, p_quantity, '{}'::JSON, true
        )
        RETURNING id INTO v_id;
    ELSIF has_name THEN
        INSERT INTO lats_product_variants (
            product_id, name, sku, cost_price, unit_price, 
            selling_price, quantity, attributes, is_active
        )
        VALUES (
            p_product_id, p_variant_name, p_sku, p_cost_price, p_unit_price,
            p_unit_price, p_quantity, '{}'::JSON, true
        )
        RETURNING id INTO v_id;
    ELSE
        RAISE EXCEPTION 'No valid name column found in lats_product_variants';
    END IF;
    
    RETURN v_id;



--
-- TOC entry 530 (class 1255 OID 1204337)
-- Name: create_product_variant(CHAR(36), text, text, numeric, numeric, integer, CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_id CHAR(36);
    has_variant_name TINYINT(1);
    has_name TINYINT(1);
    v_branch_id CHAR(36);
    -- If branch_id not provided, try to get it from the product
    IF p_branch_id IS NULL THEN
        SELECT branch_id INTO v_branch_id
        FROM lats_products
        WHERE id = p_product_id;
        
        IF v_branch_id IS NULL THEN
            RAISE EXCEPTION 'Cannot create variant: Product has no branch_id and none was provided';
        END IF;
    ELSE
        v_branch_id := p_branch_id;
    END IF;
    
    -- Check which columns exist (for backward compatibility)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_name'
    ) INTO has_variant_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'name'
    ) INTO has_name;
    
    -- Insert using appropriate column name
    IF has_variant_name THEN
        INSERT INTO lats_product_variants (
            product_id, branch_id, variant_name, sku, cost_price, unit_price, 
            selling_price, quantity, variant_attributes, is_active
        )
        VALUES (
            p_product_id, v_branch_id, p_variant_name, p_sku, p_cost_price, p_unit_price,
            p_unit_price, p_quantity, '{}'::JSON, true
        )
        RETURNING id INTO v_id;
    ELSIF has_name THEN
        INSERT INTO lats_product_variants (
            product_id, branch_id, name, sku, cost_price, unit_price, 
            selling_price, quantity, attributes, is_active
        )
        VALUES (
            p_product_id, v_branch_id, p_variant_name, p_sku, p_cost_price, p_unit_price,
            p_unit_price, p_quantity, '{}'::JSON, true
        )
        RETURNING id INTO v_id;
    ELSE
        RAISE EXCEPTION 'No valid name column found in lats_product_variants';
    END IF;
    
    RETURN v_id;



--
-- TOC entry 476 (class 1255 OID 1204338)
-- Name: create_quality_check_from_template(CHAR(36), text, CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_quality_check_id CHAR(36);
  v_criterion RECORD;
  v_po_item RECORD;
  -- Create the main quality check record
  INSERT INTO purchase_order_quality_checks (
    purchase_order_id,
    template_id,
    checked_by,
    status
  ) VALUES (
    p_purchase_order_id,
    p_template_id,
    p_checked_by,
    'in_progress'
  )
  RETURNING id INTO v_quality_check_id;

  -- Create quality check items for each criteria and each PO item
  FOR v_criterion IN 
    SELECT * FROM quality_check_criteria 
    WHERE template_id = p_template_id 
    ORDER BY sort_order
  LOOP
    FOR v_po_item IN 
      SELECT * FROM lats_purchase_order_items 
      WHERE purchase_order_id = p_purchase_order_id
    LOOP
      INSERT INTO purchase_order_quality_check_items (
        quality_check_id,
        purchase_order_item_id,
        criteria_id,
        criteria_name
      ) VALUES (
        v_quality_check_id,
        v_po_item.id,
        v_criterion.id,
        v_criterion.name
      );
    END LOOP;
  END LOOP;

  RETURN v_quality_check_id;



--
-- TOC entry 7775 (class 0 OID 0)
-- Dependencies: 476
-- Name: FUNCTION create_quality_check_from_template(p_purchase_order_id CHAR(36), p_template_id text, p_checked_by CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 622 (class 1255 OID 1204339)
-- Name: customers_delete_trigger(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    DELETE FROM lats_customers WHERE id = OLD.id;
    RETURN OLD;



--
-- TOC entry 601 (class 1255 OID 1204340)
-- Name: customers_insert_trigger(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    INSERT INTO lats_customers (
        id, name, email, phone, address, city, location, branch_id,
        loyalty_points, total_spent, status, is_active, whatsapp,
        gender, country, color_tag, loyalty_level, points, last_visit,
        referral_source, birth_month, birth_day, birthday, initial_notes,
        notes, customer_tag, location_description, national_id, joined_date,
        profile_image, whatsapp_opt_out, referred_by, created_by,
        referrals, is_shared, preferred_branch_id, visible_to_branches,
        sharing_mode, created_by_branch_id, created_by_branch_name
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.name,
        NEW.email,
        NEW.phone,
        NEW.address,
        NEW.city,
        NEW.location,
        COALESCE(NEW.branch_id, '00000000-0000-0000-0000-000000000001'::CHAR(36)),
        COALESCE(NEW.loyalty_points, 0),
        COALESCE(NEW.total_spent, 0),
        COALESCE(NEW.status, 'active'),
        COALESCE(NEW.is_active, true),
        NEW.whatsapp,
        NEW.gender,
        NEW.country,
        COALESCE(NEW.color_tag, 'new'),
        COALESCE(NEW.loyalty_level, 'bronze'),
        COALESCE(NEW.points, 0),
        NEW.last_visit,
        NEW.referral_source,
        NEW.birth_month,
        NEW.birth_day,
        NEW.birthday,
        NEW.initial_notes,
        NEW.notes,
        NEW.customer_tag,
        NEW.location_description,
        NEW.national_id,
        COALESCE(NEW.joined_date, CURRENT_DATE),
        NEW.profile_image,
        COALESCE(NEW.whatsapp_opt_out, false),
        NEW.referred_by,
        NEW.created_by,
        COALESCE(NEW.referrals, '[]'::JSON),
        COALESCE(NEW.is_shared, true),
        NEW.preferred_branch_id,
        NEW.visible_to_branches,
        COALESCE(NEW.sharing_mode, 'isolated'),
        NEW.created_by_branch_id,
        NEW.created_by_branch_name
    )
    RETURNING * INTO NEW;
    RETURN NEW;



--
-- TOC entry 502 (class 1255 OID 1204341)
-- Name: customers_update_trigger(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    UPDATE lats_customers
    SET
        name = NEW.name,
        email = NEW.email,
        phone = NEW.phone,
        address = NEW.address,
        city = NEW.city,
        location = NEW.location,
        branch_id = NEW.branch_id,
        loyalty_points = NEW.loyalty_points,
        total_spent = NEW.total_spent,
        status = NEW.status,
        is_active = NEW.is_active,
        whatsapp = NEW.whatsapp,
        gender = NEW.gender,
        country = NEW.country,
        color_tag = NEW.color_tag,
        loyalty_level = NEW.loyalty_level,
        points = NEW.points,
        last_visit = NEW.last_visit,
        referral_source = NEW.referral_source,
        birth_month = NEW.birth_month,
        birth_day = NEW.birth_day,
        birthday = NEW.birthday,
        initial_notes = NEW.initial_notes,
        notes = NEW.notes,
        customer_tag = NEW.customer_tag,
        location_description = NEW.location_description,
        national_id = NEW.national_id,
        joined_date = NEW.joined_date,
        profile_image = NEW.profile_image,
        whatsapp_opt_out = NEW.whatsapp_opt_out,
        referred_by = NEW.referred_by,
        created_by = NEW.created_by,
        referrals = NEW.referrals,
        is_shared = NEW.is_shared,
        preferred_branch_id = NEW.preferred_branch_id,
        visible_to_branches = NEW.visible_to_branches,
        sharing_mode = NEW.sharing_mode,
        created_by_branch_id = NEW.created_by_branch_id,
        created_by_branch_name = NEW.created_by_branch_name,
        updated_at = now()
    WHERE id = OLD.id
    RETURNING * INTO NEW;
    RETURN NEW;



--
-- TOC entry 654 (class 1255 OID 1204342)
-- Name: deactivate_inactive_customers(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    affected_count INTEGER;
    WITH deactivated AS (
        UPDATE customers
        SET 
            is_active = false,
            updated_at = NOW()
        WHERE 
            is_active = true
            AND (
                last_activity_date IS NULL 
                OR last_activity_date < NOW() - INTERVAL '60 days'
            )
        RETURNING id
    )
    SELECT COUNT(*) INTO affected_count FROM deactivated;
    
    RETURN affected_count;



--
-- TOC entry 644 (class 1255 OID 1204343)
-- Name: debug_prices(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    RETURN QUERY
        p.name,
        p.unit_price,
        p.cost_price,
        p.selling_price,
        COUNT(v.id) as variant_count,
        STRING_AGG(
            v.name || ': ' || COALESCE(v.unit_price::TEXT, 'NULL') || 
            ' (cost: ' || COALESCE(v.cost_price::TEXT, 'NULL') || ')',
            ', '
        ) as variant_prices,
        CASE 
            WHEN p.unit_price > 0 THEN 'Product has price'
            WHEN COUNT(v.id) > 0 AND MAX(v.unit_price) > 0 THEN 'Price from variants'
            ELSE 'No price found'
        END as price_source
    FROM lats_products p
    LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
    WHERE p.is_active = true
    GROUP BY p.id, p.name, p.unit_price, p.cost_price, p.selling_price
    ORDER BY p.name;



--
-- TOC entry 470 (class 1255 OID 1204344)
-- Name: ensure_single_primary_image(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    -- If setting this image as primary, unset all other primary images for this product
    IF NEW.is_primary = true THEN
        UPDATE product_images 
        SET is_primary = false 
        WHERE product_id = NEW.product_id 
        AND id != NEW.id 
        AND is_primary = true;
    END IF;
    RETURN NEW;



--
-- TOC entry 582 (class 1255 OID 1204345)
-- Name: execute_scheduled_transfer(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_schedule RECORD;
  v_source_balance DECIMAL(15, 2);
  v_dest_balance DECIMAL(15, 2);
  v_new_source_balance DECIMAL(15, 2);
  v_new_dest_balance DECIMAL(15, 2);
  v_reference_number TEXT;
  v_source_transaction_id CHAR(36);
  v_dest_transaction_id CHAR(36);
  v_execution_id CHAR(36);
  -- Get scheduled transfer details
  SELECT * INTO v_schedule
  FROM scheduled_transfers
  WHERE id = p_scheduled_transfer_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Scheduled transfer not found or inactive'::TEXT, NULL::CHAR(36);
    RETURN;
  END IF;
  
  -- Check if execution date has arrived
  IF v_schedule.next_execution_date > CURRENT_DATE THEN
    RETURN QUERY SELECT false, 'Execution date not yet reached'::TEXT, NULL::CHAR(36);
    RETURN;
  END IF;
  
  -- Check if end date has passed
  IF v_schedule.end_date IS NOT NULL AND CURRENT_DATE > v_schedule.end_date THEN
    -- Deactivate the schedule
    UPDATE scheduled_transfers SET is_active = false WHERE id = p_scheduled_transfer_id;
    RETURN QUERY SELECT false, 'Schedule has ended'::TEXT, NULL::CHAR(36);
    RETURN;
  END IF;
  
  -- Get account balances
  SELECT balance INTO v_source_balance
  FROM finance_accounts WHERE id = v_schedule.source_account_id;
  
  SELECT balance INTO v_dest_balance
  FROM finance_accounts WHERE id = v_schedule.destination_account_id;
  
  -- Check sufficient balance
  IF v_source_balance < v_schedule.amount THEN
    -- Log failed execution
    INSERT INTO scheduled_transfer_executions (
      scheduled_transfer_id, amount, status, error_message
    ) VALUES (
      p_scheduled_transfer_id, v_schedule.amount, 'failed', 
      'Insufficient balance in source account'
    ) RETURNING id INTO v_execution_id;
    
    RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, v_execution_id;
    RETURN;
  END IF;
  
  -- Calculate new balances
  v_new_source_balance := v_source_balance - v_schedule.amount;
  v_new_dest_balance := v_dest_balance + v_schedule.amount;
  
  -- Generate reference number
  v_reference_number := v_schedule.reference_prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(v_schedule.execution_count::TEXT, 4, '0');
  
  -- Update source account balance
  UPDATE finance_accounts 
  SET balance = v_new_source_balance, updated_at = NOW()
  WHERE id = v_schedule.source_account_id;
  
  -- Update destination account balance
  UPDATE finance_accounts 
  SET balance = v_new_dest_balance, updated_at = NOW()
  WHERE id = v_schedule.destination_account_id;
  
  -- Create source transaction
  INSERT INTO account_transactions (
    account_id, transaction_type, amount, 
    balance_before, balance_after, description, reference_number,
    metadata, created_at
  ) VALUES (
    v_schedule.source_account_id, 'transfer_out', v_schedule.amount,
    v_source_balance, v_new_source_balance,
    'Scheduled Transfer: ' || v_schedule.description,
    v_reference_number,
    jsonb_build_object(
      'scheduled_transfer_id', p_scheduled_transfer_id,
      'transfer_type', 'outgoing',
      'destination_account_id', v_schedule.destination_account_id,
      'auto_executed', true
    ),
    NOW()
  ) RETURNING id INTO v_source_transaction_id;
  
  -- Create destination transaction
  INSERT INTO account_transactions (
    account_id, transaction_type, amount,
    balance_before, balance_after, description, reference_number,
    metadata, created_at
  ) VALUES (
    v_schedule.destination_account_id, 'transfer_in', v_schedule.amount,
    v_dest_balance, v_new_dest_balance,
    'Scheduled Transfer: ' || v_schedule.description,
    v_reference_number,
    jsonb_build_object(
      'scheduled_transfer_id', p_scheduled_transfer_id,
      'transfer_type', 'incoming',
      'source_account_id', v_schedule.source_account_id,
      'auto_executed', true
    ),
    NOW()
  ) RETURNING id INTO v_dest_transaction_id;
  
  -- Log successful execution
  INSERT INTO scheduled_transfer_executions (
    scheduled_transfer_id, amount, status,
    source_transaction_id, destination_transaction_id
  ) VALUES (
    p_scheduled_transfer_id, v_schedule.amount, 'success',
    v_source_transaction_id, v_dest_transaction_id
  ) RETURNING id INTO v_execution_id;
  
  -- Update scheduled transfer
  UPDATE scheduled_transfers
  SET 
    last_executed_date = CURRENT_DATE,
    next_execution_date = calculate_next_execution_date(frequency, next_execution_date),
    execution_count = execution_count + 1,
    updated_at = NOW()
  WHERE id = p_scheduled_transfer_id;
  
  RETURN QUERY SELECT true, 'Transfer executed successfully'::TEXT, v_execution_id;



--
-- TOC entry 7776 (class 0 OID 0)
-- Dependencies: 582
-- Name: FUNCTION execute_scheduled_transfer(p_scheduled_transfer_id CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 469 (class 1255 OID 1204346)
-- Name: find_duplicate_imeis(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    COALESCE(attributes->>'imei', name) as imei,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id) as variant_ids
  FROM lats_product_variants
  WHERE variant_type = 'imei'
  GROUP BY COALESCE(attributes->>'imei', name)
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC;



--
-- TOC entry 443 (class 1255 OID 1204347)
-- Name: find_or_create_variant_at_branch(CHAR(36), CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_source_variant RECORD;
  v_destination_variant_id CHAR(36);
  v_branch_code TEXT;
  v_new_sku TEXT;
  -- Get source variant details
  SELECT * INTO v_source_variant
  FROM lats_product_variants
  WHERE id = p_source_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source variant not found: %', p_source_variant_id;
  END IF;

  -- Check if variant already exists at destination branch
  SELECT id INTO v_destination_variant_id
  FROM lats_product_variants
  WHERE product_id = v_source_variant.product_id
    AND branch_id = p_branch_id
    AND (
      variant_name = v_source_variant.variant_name
      OR (variant_name IS NULL AND v_source_variant.variant_name IS NULL)
    );

  IF FOUND THEN
    RAISE NOTICE 'Found existing variant at branch: %', v_destination_variant_id;
    RETURN v_destination_variant_id;
  END IF;

  -- Get branch code for SKU generation
  SELECT code INTO v_branch_code
  FROM store_locations
  WHERE id = p_branch_id;

  IF v_branch_code IS NULL THEN
    v_branch_code := 'BR';
  END IF;

  -- Generate new SKU with branch code
  v_new_sku := v_source_variant.sku || '-' || v_branch_code;

  -- Create new variant at destination branch
  -- Only using columns that actually exist in the table
  INSERT INTO lats_product_variants (
    product_id,
    branch_id,
    variant_name,
    sku,
    barcode,
    cost_price,
    selling_price,
    quantity,
    reserved_quantity,
    reorder_point,
    is_active,
    variant_attributes,
    created_at,
    updated_at
  ) VALUES (
    v_source_variant.product_id,
    p_branch_id,
    v_source_variant.variant_name,
    v_new_sku,
    v_source_variant.barcode,
    v_source_variant.cost_price,
    v_source_variant.selling_price,
    0, -- Start with 0 quantity
    0, -- No reserved quantity
    COALESCE(v_source_variant.reorder_point, 0), -- Use reorder_point, not reorder_level
    true,
    COALESCE(v_source_variant.variant_attributes, '{}'::JSON), -- Copy variant attributes
    NOW(),
    NOW()
  )
  RETURNING id INTO v_destination_variant_id;

  RAISE NOTICE 'Created new variant at branch: %', v_destination_variant_id;
  RETURN v_destination_variant_id;



--
-- TOC entry 539 (class 1255 OID 1204348)
-- Name: fix_existing_currency_issues(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    RETURN QUERY
    WITH issues AS (
            pv.id as variant_id,
            pv.variant_name,
            pv.cost_price as current_cost,
            po.po_number,
            po.currency,
            po.exchange_rate,
            poi.unit_cost,
            (poi.unit_cost * po.exchange_rate) as correct_cost
        FROM lats_product_variants pv
        JOIN lats_purchase_order_items poi ON poi.variant_id = pv.id
        JOIN lats_purchase_orders po ON poi.purchase_order_id = po.id
        WHERE po.currency IS NOT NULL 
          AND po.currency != 'TZS'
          AND po.exchange_rate IS NOT NULL
          AND po.exchange_rate > 0
          AND pv.cost_price != (poi.unit_cost * po.exchange_rate)
    )
        i.variant_id,
        i.variant_name,
        i.po_number,
        i.current_cost,
        i.correct_cost,
        i.currency,
        i.exchange_rate
    FROM issues i;
    
    -- Update the costs
    UPDATE lats_product_variants pv
    SET cost_price = (poi.unit_cost * po.exchange_rate),
        updated_at = NOW()
    FROM lats_purchase_order_items poi
    JOIN lats_purchase_orders po ON poi.purchase_order_id = po.id
    WHERE poi.variant_id = pv.id
      AND po.currency IS NOT NULL 
      AND po.currency != 'TZS'
      AND po.exchange_rate IS NOT NULL
      AND po.exchange_rate > 0
      AND pv.cost_price != (poi.unit_cost * po.exchange_rate);
    
    RAISE NOTICE '✅ Fixed % variant(s) with currency conversion issues', 
        (SELECT COUNT(*) FROM issues);



--
-- TOC entry 7777 (class 0 OID 0)
-- Dependencies: 539
-- Name: FUNCTION fix_existing_currency_issues(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 560 (class 1255 OID 1204349)
-- Name: fix_missing_inventory_items(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_po_record RECORD;
  v_item_record RECORD;
  v_items_created INTEGER := 0;
  v_total_created INTEGER := 0;
  -- Process each purchase order that has received items but no inventory
  FOR v_po_record IN
    SELECT DISTINCT po.id, po.po_number, po.branch_id
    FROM lats_purchase_orders po
    JOIN lats_purchase_order_items poi ON po.id = poi.purchase_order_id
    LEFT JOIN inventory_items ii ON ii.purchase_order_id = po.id
    WHERE po.status IN ('received', 'completed')
      AND poi.quantity_received > 0
    GROUP BY po.id, po.po_number, po.branch_id
    HAVING COUNT(ii.id) = 0
  LOOP
    RAISE NOTICE 'Processing PO: %', v_po_record.po_number;
    
    -- Process each item in this purchase order
    FOR v_item_record IN
        poi.id as item_id,
        poi.product_id,
        poi.variant_id,
        poi.quantity_ordered,
        COALESCE(poi.quantity_received, 0) as quantity_received,
        poi.unit_cost,
        p.name as product_name,
        pv.name as variant_name,
        p.sku as product_sku,
        pv.sku as variant_sku,
        COALESCE(pv.selling_price, pv.unit_price, 0) as selling_price,
        COALESCE(pv.quantity, 0) as current_variant_quantity
      FROM lats_purchase_order_items poi
      LEFT JOIN lats_products p ON p.id = poi.product_id
      LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
      WHERE poi.purchase_order_id = v_po_record.id
        AND poi.quantity_received > 0
    LOOP
      -- Create inventory items for the received quantity
      FOR i IN 1..v_item_record.quantity_received LOOP
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
          v_po_record.id,
          v_item_record.item_id,
          v_item_record.product_id,
          v_item_record.variant_id,
          'available',
          COALESCE(v_item_record.unit_cost, 0),
          COALESCE(v_item_record.selling_price, 0),
          format(
            'Fixed missing inventory - Received from PO %s - %s %s (Item %s of %s)',
            v_po_record.po_number,
            v_item_record.product_name,
            COALESCE(' - ' || v_item_record.variant_name, ''),
            i,
            v_item_record.quantity_received
          ),
          jsonb_build_object(
            'purchase_order_id', v_po_record.id::text,
            'purchase_order_item_id', v_item_record.item_id::text,
            'order_number', v_po_record.po_number,
            'batch_number', i,
            'received_by', 'system-fix',
            'received_at', NOW(),
            'auto_generated', true,
            'fixed_missing_inventory', true
          ),
          NOW(),
          v_po_record.branch_id,
          NOW(),
          NOW()
        );
        
        v_items_created := v_items_created + 1;
      END LOOP;
      
      -- Update variant quantity if variant exists
      IF v_item_record.variant_id IS NOT NULL THEN
        UPDATE lats_product_variants
        SET
          quantity = COALESCE(quantity, 0) + v_item_record.quantity_received,
          updated_at = NOW()
        WHERE id = v_item_record.variant_id;
        
        RAISE NOTICE 'Updated variant % quantity by +%', v_item_record.variant_id, v_item_record.quantity_received;
      END IF;
    END LOOP;
    
    RETURN QUERY SELECT v_po_record.id, v_items_created, format('Created %s inventory items for PO %s', v_items_created, v_po_record.po_number)::text;
    v_total_created := v_total_created + v_items_created;
    v_items_created := 0;
  END LOOP;
  
  RAISE NOTICE 'Total inventory items created: %', v_total_created;



--
-- TOC entry 683 (class 1255 OID 1204350)
-- Name: generate_trade_in_contract_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    next_num INTEGER;
    new_number TEXT;
    SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM lats_trade_in_contracts
    WHERE contract_number ~ '^TIC-[0-9]+$';
    
    new_number := 'TIC-' || LPAD(next_num::TEXT, 6, '0');
    RETURN new_number;
$_$;



--
-- TOC entry 559 (class 1255 OID 1204351)
-- Name: generate_trade_in_transaction_number(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    next_num INTEGER;
    new_number TEXT;
    SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM lats_trade_in_transactions
    WHERE transaction_number ~ '^TI-[0-9]+$';
    
    new_number := 'TI-' || LPAD(next_num::TEXT, 6, '0');
    RETURN new_number;
$_$;



--
-- TOC entry 675 (class 1255 OID 1204352)
-- Name: get_available_imeis_for_parent(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    RETURN QUERY
        v.id as child_id,
        v.variant_attributes->>'imei' as imei,
        v.variant_attributes->>'serial_number' as serial_number,
        COALESCE(v.variant_attributes->>'condition', 'new') as condition,
        COALESCE(v.variant_attributes->>'imei_status', 'available') as imei_status,
        v.cost_price,
        v.selling_price,
        v.created_at
    FROM lats_product_variants v
    WHERE v.parent_variant_id = parent_variant_id_param
      AND v.variant_type = 'imei_child'
      AND v.is_active = TRUE
      AND v.quantity > 0
    ORDER BY v.created_at ASC;



--
-- TOC entry 7778 (class 0 OID 0)
-- Dependencies: 675
-- Name: FUNCTION get_available_imeis_for_parent(parent_variant_id_param CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 523 (class 1255 OID 1204353)
-- Name: get_available_imeis_for_pos(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    v.id as child_id,
    v.variant_attributes->>'imei' as imei,
    v.variant_attributes->>'serial_number' as serial_number,
    v.variant_attributes->>'mac_address' as mac_address,
    COALESCE(v.variant_attributes->>'condition', 'new') as condition,
    v.cost_price,
    v.selling_price,
    v.created_at
  FROM lats_product_variants v
  WHERE v.parent_variant_id = parent_variant_id_param
    AND v.variant_type = 'imei_child'
    AND COALESCE(v.variant_attributes->>'imei_status', 'available') = 'available'
    AND v.quantity > 0
    AND v.is_active = TRUE
  ORDER BY v.created_at ASC;



--
-- TOC entry 7779 (class 0 OID 0)
-- Dependencies: 523
-- Name: FUNCTION get_available_imeis_for_pos(parent_variant_id_param CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 474 (class 1255 OID 1204354)
-- Name: get_child_imeis(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    v.id as child_id,
    v.variant_attributes->>'imei' as imei,
    v.variant_attributes->>'serial_number' as serial_number,
    v.variant_attributes->>'mac_address' as mac_address,
    COALESCE(v.variant_attributes->>'imei_status', 
      CASE 
        WHEN v.is_active = TRUE AND v.quantity > 0 THEN 'available'
        WHEN v.is_active = FALSE THEN 'sold'
        ELSE 'unavailable'
    ) as status,
    v.quantity,
    v.cost_price,
    v.selling_price,
    v.variant_attributes,
    v.created_at
  FROM lats_product_variants v
  WHERE v.parent_variant_id = parent_variant_id_param
    AND v.variant_type = 'imei_child'
  ORDER BY v.created_at DESC;



--
-- TOC entry 7780 (class 0 OID 0)
-- Dependencies: 474
-- Name: FUNCTION get_child_imeis(parent_variant_id_param CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 580 (class 1255 OID 1204355)
-- Name: get_customer_status(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    RETURN QUERY
        c.id,
        c.name,
        COALESCE(c.is_active, true) as is_active,
        c.created_at as member_since,
        c.last_visit,
        CASE 
            WHEN c.last_activity_date IS NOT NULL THEN 
                EXTRACT(DAY FROM (NOW() - c.last_activity_date))::INTEGER
            ELSE 
                EXTRACT(DAY FROM (NOW() - c.created_at))::INTEGER
        END as days_since_activity,
        CASE 
            WHEN c.is_active = false THEN 'Customer marked as inactive'
            WHEN c.last_activity_date IS NULL THEN 'No activity recorded'
            WHEN EXTRACT(DAY FROM (NOW() - c.last_activity_date)) > 60 THEN 'Inactive for 60+ days'
            WHEN EXTRACT(DAY FROM (NOW() - c.last_activity_date)) > 30 THEN 'Low activity (30+ days)'
            ELSE 'Active customer'
        END as status_reason
    FROM customers c
    WHERE c.id = customer_id;



--
-- TOC entry 569 (class 1255 OID 1204356)
-- Name: get_default_branch_id(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
    v_branch_id CHAR(36);
    -- Try to get the main branch
    SELECT id INTO v_branch_id
    FROM store_locations
    WHERE is_main = true AND is_active = true
    LIMIT 1;
    
    -- If no main branch, get any active branch
    IF v_branch_id IS NULL THEN
        SELECT id INTO v_branch_id
        FROM store_locations
        WHERE is_active = true
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    RETURN v_branch_id;



--
-- TOC entry 7781 (class 0 OID 0)
-- Dependencies: 569
-- Name: FUNCTION get_default_branch_id(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 640 (class 1255 OID 1204357)
-- Name: get_due_scheduled_transfers(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    st.id,
    sa.name as source_account_name,
    da.name as destination_account_name,
    st.amount,
    st.description,
    st.next_execution_date,
    st.frequency
  FROM scheduled_transfers st
  JOIN finance_accounts sa ON st.source_account_id = sa.id
  JOIN finance_accounts da ON st.destination_account_id = da.id
  WHERE st.is_active = true
    AND st.auto_execute = true
    AND st.next_execution_date <= CURRENT_DATE
    AND (st.end_date IS NULL OR st.end_date >= CURRENT_DATE)
  ORDER BY st.next_execution_date ASC;



--
-- TOC entry 7782 (class 0 OID 0)
-- Dependencies: 640
-- Name: FUNCTION get_due_scheduled_transfers(); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 668 (class 1255 OID 1204358)
-- Name: get_inactive_customers(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    RETURN QUERY
        c.id,
        c.name,
        c.phone,
        c.last_activity_date,
        CASE 
            WHEN c.last_activity_date IS NOT NULL THEN 
                EXTRACT(DAY FROM (NOW() - c.last_activity_date))::INTEGER
            ELSE 
                EXTRACT(DAY FROM (NOW() - c.created_at))::INTEGER
        END as days_inactive,
        c.created_at
    FROM customers c
    WHERE 
        c.is_active = false
        OR c.last_activity_date < NOW() - INTERVAL '60 days'
        OR c.last_activity_date IS NULL
    ORDER BY c.last_activity_date ASC NULLS FIRST;



--
-- TOC entry 703 (class 1255 OID 1204359)
-- Name: get_inventory_items(CHAR(36), CHAR(36), text, integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    ii.id,
    ii.product_id,
    ii.variant_id,
    ii.serial_number,
    ii.imei,
    ii.mac_address,
    ii.barcode,
    ii.status,
    ii.location,
    ii.shelf,
    ii.bin,
    ii.purchase_date,
    ii.warranty_start,
    ii.warranty_end,
    ii.cost_price,
    ii.selling_price,
    ii.notes,
    ii.metadata,
    ii.created_at,
    ii.updated_at,
    p.name as product_name,
    p.sku as product_sku,
    pv.name as variant_name,
    pv.sku as variant_sku
  FROM inventory_items ii
  LEFT JOIN lats_products p ON p.id = ii.product_id
  LEFT JOIN lats_product_variants pv ON pv.id = ii.variant_id
  WHERE 
    (filter_po_id IS NULL OR ii.metadata->>'purchase_order_id' = filter_po_id::text)
    AND (filter_product_id IS NULL OR ii.product_id = filter_product_id)
    AND (filter_status IS NULL OR ii.status = filter_status)
  ORDER BY ii.created_at DESC
  LIMIT limit_count;



--
-- TOC entry 457 (class 1255 OID 1204360)
-- Name: get_inventory_json(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    RETURN (
        SELECT json_agg(
            json_build_object(
                'id', id,
                'name', name,
                'description', description,
                'sku', sku,
                'category', category,
                'supplier', supplier,
                'price', unit_price,
                'costPrice', cost_price,
                'sellingPrice', selling_price,
                'stock', stock_quantity,
                'status', status,
                'imageUrl', image_url,
                'brand', brand,
                'model', model,
                'condition', condition,
                'variantCount', variant_count,
                'variants', variants,
                'createdAt', created_at,
                'updatedAt', updated_at
            )
        )
        FROM simple_inventory_view
    );



--
-- TOC entry 634 (class 1255 OID 1204361)
-- Name: get_minimum_order_quantity(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_min_qty TEXT;
  SELECT setting_value INTO v_min_qty
  FROM admin_settings
  WHERE category = 'inventory' 
    AND setting_key = 'minimum_order_quantity'
    AND is_active = true;
  
  RETURN COALESCE(v_min_qty::INTEGER, 1);
EXCEPTION WHEN OTHERS THEN
  RETURN 1;



--
-- TOC entry 641 (class 1255 OID 1204362)
-- Name: get_overdue_reminders(CHAR(36), CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    r.id,
    r.title,
    r.description,
    (r.date + r.time)::DATETIME as reminder_datetime,
    r.priority,
    r.category,
    EXTRACT(EPOCH FROM (NOW() - (r.date + r.time)::DATETIME))/60 as minutes_overdue
  FROM reminders r
  WHERE r.status = 'pending'
    AND (r.assigned_to = p_user_id OR r.created_by = p_user_id)
    AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
    AND (r.date + r.time)::DATETIME < NOW()
  ORDER BY (r.date + r.time)::DATETIME ASC;



--
-- TOC entry 538 (class 1255 OID 1204363)
-- Name: get_parent_variants(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    v.id as variant_id,
    COALESCE(v.variant_name, v.name) as variant_name,
    v.sku,
    v.cost_price,
    v.selling_price,
    v.quantity,
    (
      SELECT COUNT(*)::INTEGER
      FROM lats_product_variants child
      WHERE child.parent_variant_id = v.id
        AND child.variant_type = 'imei_child'
        AND child.is_active = TRUE
        AND child.quantity > 0
    ) as available_imeis,
    v.variant_attributes
  FROM lats_product_variants v
  WHERE v.product_id = product_id_param
    AND v.is_active = TRUE
    AND (v.variant_type = 'parent' OR v.variant_type = 'standard')
  ORDER BY v.created_at ASC;



--
-- TOC entry 7783 (class 0 OID 0)
-- Dependencies: 538
-- Name: FUNCTION get_parent_variants(product_id_param CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 649 (class 1255 OID 1204364)
-- Name: get_payments(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    p.id,
    p.purchase_order_id,
    p.amount,
    p.payment_method,
    p.payment_date,
    p.reference_number,
    p.notes,
    p.created_at,
    p.created_by
  FROM lats_purchase_order_payments p
  WHERE p.purchase_order_id = po_id
  ORDER BY p.payment_date DESC, p.created_at DESC;



--
-- TOC entry 463 (class 1255 OID 1204365)
-- Name: get_product_variants(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    RETURN QUERY
        v.id,
        v.product_id,
        v.variant_name,
        v.sku,
        v.cost_price,
        v.unit_price,
        v.selling_price,
        v.quantity,
        v.attributes
    FROM product_variants_view v
    WHERE v.product_id = p_product_id
      AND v.is_active = true
    ORDER BY v.variant_name;



--
-- TOC entry 547 (class 1255 OID 1204366)
-- Name: get_purchase_order_items_with_products(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    poi.id,
    poi.purchase_order_id,
    poi.product_id,
    poi.variant_id,
    COALESCE(poi.quantity_ordered, 0)::INTEGER,
    COALESCE(poi.quantity_received, 0)::INTEGER,
    COALESCE(poi.unit_cost, 0),
    (COALESCE(poi.quantity_ordered, 0) * COALESCE(poi.unit_cost, 0)),
    COALESCE(poi.notes, '')::TEXT,
    poi.created_at,
    COALESCE(poi.updated_at, poi.created_at),
    COALESCE(p.name, 'Unknown Product'),
    COALESCE(p.sku, ''),
    COALESCE(pv.variant_name, pv.name, 'Default Variant'),
    COALESCE(pv.sku, '')
  FROM lats_purchase_order_items poi
  LEFT JOIN lats_products p ON poi.product_id = p.id
  LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
  WHERE poi.purchase_order_id = purchase_order_id_param
  ORDER BY poi.created_at ASC;



--
-- TOC entry 501 (class 1255 OID 1204367)
-- Name: get_purchase_order_payment_history(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_branch_id CHAR(36);
  -- Get the branch_id from the purchase order for filtering
  SELECT branch_id INTO v_branch_id
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  -- If no branch_id found, return no results (purchase order doesn't exist or has no branch)
  IF v_branch_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    p.id,
    p.purchase_order_id,
    p.payment_account_id,
    p.amount,
    p.currency,
    p.payment_method,
    p.payment_method_id,
    p.reference,
    p.notes,
    p.status,
    p.payment_date,
    p.created_by,
    p.created_at,
    p.updated_at,
    p.branch_id
  FROM purchase_order_payments p
  WHERE p.purchase_order_id = purchase_order_id_param
    AND p.branch_id = v_branch_id
  ORDER BY p.payment_date DESC, p.created_at DESC;



--
-- TOC entry 468 (class 1255 OID 1204368)
-- Name: get_purchase_order_payment_summary(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_result JSON;
  v_total_paid DECIMAL;
  v_payment_count INTEGER;
  v_last_payment_date DATETIME;
  v_total_amount DECIMAL;
  v_remaining DECIMAL;
  v_payment_status VARCHAR;
  -- Get purchase order details
  SELECT total_amount, COALESCE(total_paid, 0), payment_status
  INTO v_total_amount, v_total_paid, v_payment_status
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  -- Check if purchase order exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found'
    );
  END IF;

  -- Get payment count and last payment date
    COUNT(*),
    MAX(payment_date)
  INTO v_payment_count, v_last_payment_date
  FROM purchase_order_payments
  WHERE purchase_order_id = purchase_order_id_param
    AND status = 'completed';

  v_remaining := v_total_amount - v_total_paid;

  -- Build result
  v_result := json_build_object(
    'total_amount', v_total_amount,
    'total_paid', v_total_paid,
    'remaining', v_remaining,
    'payment_count', COALESCE(v_payment_count, 0),
    'last_payment_date', v_last_payment_date,
    'payment_status', v_payment_status
  );

  RETURN v_result;



--
-- TOC entry 7784 (class 0 OID 0)
-- Dependencies: 468
-- Name: FUNCTION get_purchase_order_payment_summary(purchase_order_id_param CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 596 (class 1255 OID 1204369)
-- Name: get_purchase_order_receive_summary(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    COUNT(*)::BIGINT as total_items,
    SUM(quantity_ordered)::BIGINT as total_ordered,
    SUM(quantity_received)::BIGINT as total_received,
    SUM(quantity_ordered - COALESCE(quantity_received, 0))::BIGINT as total_pending,
    CASE 
      WHEN SUM(quantity_ordered) > 0 THEN 
        ROUND((SUM(COALESCE(quantity_received, 0))::NUMERIC / SUM(quantity_ordered)::NUMERIC) * 100, 2)
      ELSE 0
    END as percent_received,
    json_agg(
      json_build_object(
        'item_id', id,
        'product_id', product_id,
        'variant_id', variant_id,
        'ordered', quantity_ordered,
        'received', quantity_received,
        'pending', quantity_ordered - COALESCE(quantity_received, 0)
      )
    ) as items_detail
  FROM lats_purchase_order_items
  WHERE purchase_order_id = purchase_order_id_param
  GROUP BY purchase_order_id;



--
-- TOC entry 500 (class 1255 OID 1204370)
-- Name: get_purchase_order_returns(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    ia.id,
    ia.product_id,
    ia.variant_id,
    ia.quantity,
    ia.reason,
    ia.notes,
    ia.created_at,
    ia.created_by,
    p.name as product_name,
    pv.variant_name as variant_name
  FROM lats_inventory_adjustments ia
  LEFT JOIN lats_products p ON ia.product_id = p.id
  LEFT JOIN lats_product_variants pv ON ia.variant_id = pv.id
  WHERE ia.type = 'return'
    AND ia.reason LIKE '%' || purchase_order_id_param::TEXT || '%'
  ORDER BY ia.created_at DESC;



--
-- TOC entry 624 (class 1255 OID 1204371)
-- Name: get_quality_check_summary(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    qc.id,
    qc.status,
    qc.overall_result,
    qc.checked_by,
    qc.checked_at,
    COUNT(qci.id) as total_items,
    COUNT(qci.id) FILTER (WHERE qci.result = 'pass') as passed_items,
    COUNT(qci.id) FILTER (WHERE qci.result = 'fail') as failed_items,
    COUNT(qci.id) FILTER (WHERE qci.result IS NULL) as pending_items
  FROM purchase_order_quality_checks qc
  LEFT JOIN purchase_order_quality_check_items qci ON qci.quality_check_id = qc.id
  WHERE qc.purchase_order_id = p_purchase_order_id
  GROUP BY qc.id, qc.status, qc.overall_result, qc.checked_by, qc.checked_at
  ORDER BY qc.created_at DESC
  LIMIT 1;



--
-- TOC entry 7785 (class 0 OID 0)
-- Dependencies: 624
-- Name: FUNCTION get_quality_check_summary(p_purchase_order_id CHAR(36)); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 555 (class 1255 OID 1204372)
-- Name: get_quality_check_with_items(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

          RETURN QUERY
            qcr.id,
            qcr.check_item_id,
            qci.check_name,
            qci.check_description,
            qci.check_type,
            qci.is_required,
            qcr.result,
            qcr.numeric_value,
            qcr.text_value,
            qcr.notes
          FROM quality_check_results qcr
          JOIN quality_check_items qci ON qci.id = qcr.check_item_id
          WHERE qcr.quality_check_id = quality_check_id_param
          ORDER BY qci.sort_order;



--
-- TOC entry 496 (class 1255 OID 1204373)
-- Name: get_received_items_for_po(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

          RETURN QUERY
          SELECT ii.id, ii.purchase_order_id, ii.product_id, ii.variant_id,
                 ii.serial_number, ii.imei, ii.mac_address, ii.barcode, ii.status,
                 ii.location, ii.shelf, ii.bin, ii.purchase_date, ii.warranty_start, ii.warranty_end,
                 ii.cost_price, ii.selling_price, ii.notes, ii.metadata, ii.created_at,
                 p.name as product_name, p.sku as product_sku,
                 pv.name as variant_name, pv.sku as variant_sku
          FROM inventory_items ii
          LEFT JOIN lats_products p ON ii.product_id = p.id
          LEFT JOIN lats_product_variants pv ON ii.variant_id = pv.id
          WHERE ii.purchase_order_id = po_id
          ORDER BY ii.created_at DESC;



--
-- TOC entry 614 (class 1255 OID 1204374)
-- Name: get_upcoming_reminders(CHAR(36), CHAR(36), integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN QUERY
    r.id,
    r.title,
    r.description,
    (r.date + r.time)::DATETIME as reminder_datetime,
    r.priority,
    r.category,
    EXTRACT(EPOCH FROM ((r.date + r.time)::DATETIME - NOW()))/60 as minutes_until
  FROM reminders r
  WHERE r.status = 'pending'
    AND (r.assigned_to = p_user_id OR r.created_by = p_user_id)
    AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
    AND (r.date + r.time)::DATETIME <= NOW() + (p_hours_ahead || ' hours')::INTERVAL
    AND (r.date + r.time)::DATETIME >= NOW()
  ORDER BY (r.date + r.time)::DATETIME ASC;



--
-- TOC entry 660 (class 1255 OID 1204375)
-- Name: get_user_current_branch(CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN (
    SELECT branch_id 
    FROM user_branch_assignments 
    WHERE user_id = p_user_id 
    AND is_primary = true 
    LIMIT 1
  );



--
-- TOC entry 546 (class 1255 OID 1204376)
-- Name: get_variant_by_imei(text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    RETURN QUERY
        v.id as variant_id,
        v.product_id,
        v.parent_variant_id,
        p.name as product_name,
        v.variant_name,
        v.variant_attributes->>'imei' as imei,
        v.variant_attributes->>'serial_number' as serial_number,
        COALESCE(v.variant_attributes->>'imei_status', 'unknown') as imei_status,
        v.cost_price,
        v.selling_price,
        v.is_active
    FROM lats_product_variants v
    JOIN lats_products p ON p.id = v.product_id
    WHERE v.variant_attributes->>'imei' = search_imei;



--
-- TOC entry 7786 (class 0 OID 0)
-- Dependencies: 546
-- Name: FUNCTION get_variant_by_imei(search_imei text); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 587 (class 1255 OID 1204377)
-- Name: handle_expense_delete(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Delete related account transaction
  DELETE FROM account_transactions
  WHERE related_entity_type = 'expense' 
  AND related_entity_id = OLD.id;
  
  RAISE NOTICE '🗑️ Account transaction removed for deleted expense: %', 
    COALESCE(OLD.title, OLD.description);
  
  RETURN OLD;



--
-- TOC entry 629 (class 1255 OID 1204378)
-- Name: handle_expense_transaction(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_account_id CHAR(36);
  -- Handle INSERT operations
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    -- Get first available account
    SELECT id INTO v_account_id
    FROM finance_accounts
    ORDER BY created_at
    LIMIT 1;
    
    -- Create transaction if we have an account
    IF v_account_id IS NOT NULL THEN
      INSERT INTO account_transactions (
        account_id,
        transaction_type,
        amount,
        description,
        reference_number,
        related_entity_type,
        related_entity_id,
        metadata,
        created_at,
        created_by
      ) VALUES (
        v_account_id,
        'expense',
        NEW.amount,
        COALESCE(NEW.description, 'Expense'),
        COALESCE(NEW.reference_number, 'EXP-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
        'expense',
        NEW.id,
        jsonb_build_object(
          'expense_id', NEW.id,
          'category', NEW.category,
          'vendor_name', NEW.vendor_name,
          'date', NEW.date
        ),
        NOW(),
        NEW.created_by
      );
    END IF;
  END IF;
  
  -- Handle UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- If expense is being approved and wasn't before
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
      -- Get first available account
      SELECT id INTO v_account_id
      FROM finance_accounts
      ORDER BY created_at
      LIMIT 1;
      
      -- Create transaction if it doesn't exist and we have an account
      IF v_account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM account_transactions 
        WHERE related_entity_type = 'expense' 
        AND related_entity_id = NEW.id
      ) THEN
        INSERT INTO account_transactions (
          account_id,
          transaction_type,
          amount,
          description,
          reference_number,
          related_entity_type,
          related_entity_id,
          metadata,
          created_at,
          created_by
        ) VALUES (
          v_account_id,
          'expense',
          NEW.amount,
          COALESCE(NEW.description, 'Expense'),
          COALESCE(NEW.reference_number, 'EXP-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
          'expense',
          NEW.id,
          jsonb_build_object(
            'expense_id', NEW.id,
            'category', NEW.category,
            'vendor_name', NEW.vendor_name,
            'date', NEW.date
          ),
          NOW(),
          NEW.created_by
        );
      END IF;
    END IF;
    
    -- If expense is being rejected
    IF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
      -- Delete the account transaction
      DELETE FROM account_transactions
      WHERE related_entity_type = 'expense' 
      AND related_entity_id = NEW.id;
    END IF;
    
    -- If amount changed and expense is approved
    IF NEW.amount != OLD.amount AND NEW.status = 'approved' THEN
      UPDATE account_transactions
      SET amount = NEW.amount,
          description = COALESCE(NEW.description, 'Expense')
      WHERE related_entity_type = 'expense' 
      AND related_entity_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;



--
-- TOC entry 520 (class 1255 OID 1204379)
-- Name: handle_expense_update(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_category_name TEXT;
  -- If expense is being approved and wasn't before
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.account_id IS NOT NULL THEN
    -- Create transaction if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM account_transactions 
      WHERE related_entity_type = 'expense' 
      AND related_entity_id = NEW.id
    ) THEN
      -- Get category name
      SELECT category_name INTO v_category_name
      FROM finance_expense_categories
      WHERE id = NEW.expense_category_id;
      
      -- Create the transaction
      INSERT INTO account_transactions (
        account_id,
        transaction_type,
        amount,
        description,
        reference_number,
        related_entity_type,
        related_entity_id,
        metadata,
        created_at,
        created_by
      ) VALUES (
        NEW.account_id,
        'expense',
        NEW.amount,
        COALESCE(NEW.title, COALESCE(NEW.description, 'Expense')) || 
          CASE WHEN v_category_name IS NOT NULL THEN ' - ' || v_category_name ELSE '' END,
        COALESCE(NEW.receipt_number, 'EXP-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
        'expense',
        NEW.id,
        jsonb_build_object(
          'expense_id', NEW.id,
          'category_id', NEW.expense_category_id,
          'category_name', v_category_name,
          'vendor', NEW.vendor,
          'expense_date', NEW.expense_date
        ),
        NOW(),
        NEW.created_by
      );
    END IF;
  END IF;
  
  -- If expense is being rejected
  IF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
    -- Delete the account transaction
    DELETE FROM account_transactions
    WHERE related_entity_type = 'expense' 
    AND related_entity_id = NEW.id;
    
    RAISE NOTICE '⚠️ Account transaction removed for rejected expense: %', 
      COALESCE(NEW.title, NEW.description);
  END IF;
  
  -- If amount changed and expense is approved
  IF NEW.amount != OLD.amount AND NEW.status = 'approved' AND NEW.account_id IS NOT NULL THEN
    -- Get category name
    SELECT category_name INTO v_category_name
    FROM finance_expense_categories
    WHERE id = NEW.expense_category_id;
    
    -- Update the transaction amount and description
    UPDATE account_transactions
    SET amount = NEW.amount,
        description = COALESCE(NEW.title, COALESCE(NEW.description, 'Expense')) || 
          CASE WHEN v_category_name IS NOT NULL THEN ' - ' || v_category_name ELSE '' END
    WHERE related_entity_type = 'expense' 
    AND related_entity_id = NEW.id;
    
    RAISE NOTICE '✏️ Account transaction updated for expense: %', 
      COALESCE(NEW.title, NEW.description);
  END IF;
  
  RETURN NEW;



--
-- TOC entry 621 (class 1255 OID 1204380)
-- Name: imei_exists(text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

    RETURN EXISTS (
        SELECT 1
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' = check_imei
    );



--
-- TOC entry 7787 (class 0 OID 0)
-- Dependencies: 621
-- Name: FUNCTION imei_exists(check_imei text); Type: COMMENT; Schema: public; Owner: neondb_owner
--



--
-- TOC entry 537 (class 1255 OID 1204381)
-- Name: increase_variant_stock(CHAR(36), integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- Add stock to destination variant
  UPDATE lats_product_variants
  SET quantity = quantity + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Increased % units for variant %', p_quantity, p_variant_id;



--
-- TOC entry 697 (class 1255 OID 1204382)
-- Name: inherit_parent_variant_prices(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

      DECLARE
        v_parent_selling_price NUMERIC;
        v_parent_cost_price NUMERIC;
        -- Only apply to imei_child variants with a parent
        IF NEW.variant_type = 'imei_child' AND NEW.parent_variant_id IS NOT NULL THEN
          
          -- Get parent prices
          SELECT selling_price, cost_price
          INTO v_parent_selling_price, v_parent_cost_price
          FROM lats_product_variants
          WHERE id = NEW.parent_variant_id;
          
          -- Inherit selling price if not set or is 0
          IF NEW.selling_price IS NULL OR NEW.selling_price = 0 THEN
            NEW.selling_price := COALESCE(v_parent_selling_price, 0);
          END IF;
          
          -- Inherit cost price if not set or is 0
          IF NEW.cost_price IS NULL OR NEW.cost_price = 0 THEN
            NEW.cost_price := COALESCE(v_parent_cost_price, 0);
          END IF;
          
        END IF;
        
        RETURN NEW;



--
-- TOC entry 493 (class 1255 OID 1204383)
-- Name: is_auto_create_po_enabled(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_enabled TEXT;
  SELECT setting_value INTO v_enabled
  FROM admin_settings
  WHERE category = 'inventory' 
    AND setting_key = 'auto_create_po_at_reorder'
    AND is_active = true;
  
  RETURN (v_enabled = 'true');
EXCEPTION WHEN OTHERS THEN
  RETURN false;



--
-- TOC entry 618 (class 1255 OID 1204384)
-- Name: is_auto_reorder_enabled(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_enabled TEXT;
  SELECT setting_value INTO v_enabled
  FROM admin_settings
  WHERE category = 'inventory' 
    AND setting_key = 'auto_reorder_enabled'
    AND is_active = true;
  
  RETURN (v_enabled = 'true');
EXCEPTION WHEN OTHERS THEN
  RETURN false;



--
-- TOC entry 478 (class 1255 OID 1204385)
-- Name: is_data_shared(text, CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_isolation_mode TEXT;
  v_share_flag TINYINT(1);
  -- Get branch isolation mode
  SELECT data_isolation_mode INTO v_isolation_mode
  FROM store_locations
  WHERE id = p_branch_id;
  
  -- If shared mode, everything is shared
  IF v_isolation_mode = 'shared' THEN
    RETURN true;
  END IF;
  
  -- If isolated mode, nothing is shared
  IF v_isolation_mode = 'isolated' THEN
    RETURN false;
  END IF;
  
  -- Hybrid mode - check specific flags
  CASE p_entity_type
    WHEN 'products' THEN
      SELECT share_products INTO v_share_flag FROM store_locations WHERE id = p_branch_id;
    WHEN 'customers' THEN
      SELECT share_customers INTO v_share_flag FROM store_locations WHERE id = p_branch_id;
    WHEN 'inventory' THEN
      SELECT share_inventory INTO v_share_flag FROM store_locations WHERE id = p_branch_id;
    WHEN 'suppliers' THEN
      SELECT share_suppliers INTO v_share_flag FROM store_locations WHERE id = p_branch_id;
    WHEN 'categories' THEN
      SELECT share_categories INTO v_share_flag FROM store_locations WHERE id = p_branch_id;
    WHEN 'employees' THEN
      SELECT share_employees INTO v_share_flag FROM store_locations WHERE id = p_branch_id;
    ELSE
      v_share_flag := false;
  END CASE;
  
  RETURN COALESCE(v_share_flag, false);



--
-- TOC entry 642 (class 1255 OID 1204386)
-- Name: is_visible_to_branch(CHAR(36), CHAR(36)[], text, CHAR(36)); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  -- If no branch specified, show everything
  IF check_branch_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Shared mode - visible to all
  IF item_sharing_mode = 'shared' THEN
    RETURN TRUE;
  END IF;
  
  -- Isolated mode - only visible to owner branch
  IF item_sharing_mode = 'isolated' THEN
    RETURN item_branch_id = check_branch_id;
  END IF;
  
  -- Custom mode - check array
  IF item_sharing_mode = 'custom' AND item_visible_branches IS NOT NULL THEN
    RETURN check_branch_id = ANY(item_visible_branches);
  END IF;
  
  -- Default: only visible to owner branch
  RETURN item_branch_id = check_branch_id;



--
-- TOC entry 599 (class 1255 OID 1204387)
-- Name: jsonb_object_keys_count(JSON); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

  RETURN (SELECT count(*) FROM jsonb_object_keys(obj));



--
-- TOC entry 666 (class 1255 OID 1204388)
-- Name: log_purchase_order_audit(CHAR(36), text, text, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

DECLARE
  v_audit_id CHAR(36);
  v_user_uuid CHAR(36);
  -- Generate new audit ID
  v_audit_id := gen_random_uuid();
  
  -- Handle 'system' user_id by converting to NULL
  -- Or try to cast to CHAR(36) if it's a valid CHAR(36) string
    IF p_user_id = 'system' OR p_user_id IS NULL OR p_user_id = '' THEN
      v_user_uuid := NULL;
    ELSE
      v_user_uuid := p_user_id::CHAR(36);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_user_uuid := NULL;

  -- Insert into purchase_order_audit table
  -- Note: Different tables have different schemas, we'll try both
    -- Try inserting into purchase_order_audit (if it exists)
    INSERT INTO purchase_order_audit (
      id,
      purchase_order_id,
      action,
      user_id,
      created_by,
      details,
      DATETIME
    ) VALUES (
      v_audit_id,
      p_purchase_order_id,
      p_action,
      v_user_uuid,
      v_user_uuid,
      p_details,
      NOW()
    );
  EXCEPTION WHEN undefined_table THEN
    -- If purchase_order_audit doesn't exist, try lats_purchase_order_audit_log
