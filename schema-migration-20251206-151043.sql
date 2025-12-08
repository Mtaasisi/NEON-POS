--
-- PostgreSQL database dump
--

-- Dumped from database version 17.7 (178558d)
-- Dumped by pg_dump version 17.5 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'Removed lats_pos_delivery_settings - Now a feature toggle';


--
-- Name: pg_session_jwt; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_session_jwt WITH SCHEMA public;


--
-- Name: EXTENSION pg_session_jwt; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_session_jwt IS 'pg_session_jwt: manage authentication sessions using JWTs';


--
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA neon_auth;


--
-- Name: pgrst; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgrst;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: pre_config(); Type: FUNCTION; Schema: pgrst; Owner: -
--

CREATE OR REPLACE FUNCTION pgrst.pre_config() RETURNS void
    LANGUAGE sql
    AS $$
  SELECT
      set_config('pgrst.db_schemas', 'public', true)
    , set_config('pgrst.db_aggregates_enabled', 'true', true)
    , set_config('pgrst.db_anon_role', 'anonymous', true)
    , set_config('pgrst.jwt_role_claim_key', '."role"', true)
$$;


--
-- Name: add_imei_to_parent_variant(uuid, text, text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.add_imei_to_parent_variant(parent_variant_id_param uuid, imei_param text, serial_number_param text, cost_price_param integer, selling_price_param integer, condition_param text) RETURNS TABLE(success boolean, child_variant_id uuid, error_message text)
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: add_imei_to_parent_variant(uuid, text, text, integer, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.add_imei_to_parent_variant(parent_variant_id_param uuid, imei_param text, serial_number_param text, cost_price_param integer, selling_price_param integer, condition_param text, notes_param text) RETURNS TABLE(success boolean, child_variant_id uuid, error_message text)
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: add_imei_to_parent_variant(uuid, text, text, text, numeric, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.add_imei_to_parent_variant(parent_variant_id_param uuid, imei_param text, serial_number_param text DEFAULT NULL::text, mac_address_param text DEFAULT NULL::text, cost_price_param numeric DEFAULT NULL::numeric, selling_price_param numeric DEFAULT NULL::numeric, condition_param text DEFAULT 'new'::text, notes_param text DEFAULT NULL::text) RETURNS TABLE(success boolean, child_variant_id uuid, error_message text)
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: add_imei_to_parent_variant_internal(uuid, text, text, text, numeric, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.add_imei_to_parent_variant_internal(parent_variant_id_param uuid, imei_param text, serial_number_param text DEFAULT NULL::text, mac_address_param text DEFAULT NULL::text, cost_price_param numeric DEFAULT NULL::numeric, selling_price_param numeric DEFAULT NULL::numeric, condition_param text DEFAULT 'new'::text, notes_param text DEFAULT NULL::text) RETURNS TABLE(success boolean, child_variant_id uuid, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_child_variant_id UUID;
  v_parent_product_id UUID;
  v_parent_sku TEXT;
  v_parent_name TEXT;
  v_parent_variant_name TEXT;
  v_parent_branch_id UUID;
  v_duplicate_count INT;
  v_cost_price NUMERIC;
  v_selling_price NUMERIC;
  v_serial_number TEXT;
  v_child_name TEXT;
BEGIN
  -- Handle NULL prices
  v_cost_price := COALESCE(cost_price_param, 0);
  v_selling_price := COALESCE(selling_price_param, 0);
  
  -- ✅ UNIFIED: Serial number and IMEI are the same - use imei_param for both
  v_serial_number := COALESCE(serial_number_param, imei_param)::TEXT;
  v_child_name := imei_param::TEXT;

  -- Validate IMEI format
  IF imei_param IS NULL OR imei_param = '' THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
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
      NULL::UUID, 
      format('IMEI %s already exists in the system', imei_param) AS error_message;
    RETURN;
  END IF;

  -- Get parent variant details
  SELECT 
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
      NULL::UUID, 
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

  -- Generate new UUID for child variant
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
    NULL::UUID, 
    format('Error creating IMEI variant: %s', SQLERRM) AS error_message;
END;
$$;


--
-- Name: add_inventory_items_without_tracking(uuid, integer, numeric, numeric, text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.add_inventory_items_without_tracking(p_variant_id uuid, p_quantity integer, p_cost_price numeric DEFAULT NULL::numeric, p_selling_price numeric DEFAULT NULL::numeric, p_notes text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(items_created integer, variant_id uuid, new_quantity integer, message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_product_id UUID;
    v_variant_name TEXT;
    v_sku TEXT;
    v_items_created INTEGER := 0;
    v_i INTEGER;
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_cost NUMERIC;
    v_price NUMERIC;
BEGIN
    -- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than 0';
    END IF;
    
    IF p_variant_id IS NULL THEN
        RAISE EXCEPTION 'Variant ID is required';
    END IF;
    
    -- Get variant and product info
    SELECT 
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
    
    -- Create inventory items (without IMEI/serial)
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
                format('Added %s units without IMEI/serial tracking (Item %s of %s)', 
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
END;
$$;


--
-- Name: FUNCTION add_inventory_items_without_tracking(p_variant_id uuid, p_quantity integer, p_cost_price numeric, p_selling_price numeric, p_notes text, p_branch_id uuid, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.add_inventory_items_without_tracking(p_variant_id uuid, p_quantity integer, p_cost_price numeric, p_selling_price numeric, p_notes text, p_branch_id uuid, p_user_id uuid) IS 'Adds inventory items for products without IMEI/serial number tracking.
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
    ''b4418cf0-7624-4238-8e98-7d1eb5986b28''::UUID,  -- variant_id
    4,                                                -- quantity
    1000,                                             -- cost_price (optional)
    51000,                                            -- selling_price (optional)
    ''Added manually without IMEI tracking'',         -- notes (optional)
    NULL,                                             -- branch_id (optional)
    NULL                                              -- user_id (optional)
);';


--
-- Name: add_quality_items_to_inventory_v2(uuid, uuid, uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.add_quality_items_to_inventory_v2(p_quality_check_id uuid, p_purchase_order_id uuid, p_user_id uuid, p_profit_margin_percentage numeric DEFAULT 30, p_default_location text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_item RECORD;
  v_added_count INTEGER := 0;
  v_selling_price DECIMAL;
BEGIN
  -- Process each passed item
  FOR v_item IN 
    SELECT 
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
END;
$$;


--
-- Name: FUNCTION add_quality_items_to_inventory_v2(p_quality_check_id uuid, p_purchase_order_id uuid, p_user_id uuid, p_profit_margin_percentage numeric, p_default_location text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.add_quality_items_to_inventory_v2(p_quality_check_id uuid, p_purchase_order_id uuid, p_user_id uuid, p_profit_margin_percentage numeric, p_default_location text) IS 'Adds quality items to inventory with pricing';


--
-- Name: auto_convert_inventory_item_on_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_convert_inventory_item_on_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    v_parent_variant RECORD;
    v_identifier TEXT;
    v_is_numeric_imei BOOLEAN;
    v_child_id UUID;
    v_sku TEXT;
BEGIN
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
END;
$_$;


--
-- Name: auto_convert_inventory_item_to_imei_child(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_convert_inventory_item_to_imei_child() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    v_parent_variant RECORD;
    v_identifier TEXT;
    v_is_numeric_imei BOOLEAN;
    v_child_id UUID;
    v_sku TEXT;
BEGIN
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
    
    -- Get the identifier (IMEI or serial number)
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
END;
$_$;


--
-- Name: auto_convert_po_currency(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_convert_po_currency() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_po_currency TEXT;
    v_exchange_rate NUMERIC;
    v_converted_cost NUMERIC;
    v_variant_id UUID;
BEGIN
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
END;
$$;


--
-- Name: FUNCTION auto_convert_po_currency(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.auto_convert_po_currency() IS 'Automatically converts foreign currency to TZS when receiving PO items';


--
-- Name: auto_create_default_variant(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_create_default_variant() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    variant_count INTEGER;
    v_new_variant_id UUID;
    skip_default BOOLEAN;
BEGIN
    -- Check if product has metadata flag to skip default variant creation
    skip_default := COALESCE((NEW.metadata->>'skip_default_variant')::boolean, false);
    
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
            COALESCE(NEW.attributes, '{}'::jsonb),
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
END;
$$;


--
-- Name: FUNCTION auto_create_default_variant(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.auto_create_default_variant() IS 'Automatically creates a default variant for products that have no variants. 
Waits 1 second to allow custom variants to be created first.';


--
-- Name: auto_create_purchase_order_for_low_stock(uuid, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_create_purchase_order_for_low_stock(p_variant_id uuid, p_product_id uuid, p_current_quantity integer, p_reorder_point integer) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_po_id UUID;
  v_po_number TEXT;
  v_supplier_id UUID;
  v_suggested_qty INTEGER;
  v_min_order_qty INTEGER;
  v_unit_cost NUMERIC(10,2);
  v_total_amount NUMERIC(10,2);
  v_product_name TEXT;
  v_safety_stock INTEGER;
  v_max_stock INTEGER;
BEGIN
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
END;
$$;


--
-- Name: auto_sync_sharing_on_branch_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_sync_sharing_on_branch_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: begin_transaction_if_not_exists(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.begin_transaction_if_not_exists() RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY SELECT TRUE, 'No-op begin (handled client-side)';
END;
$$;


--
-- Name: calculate_attendance_hours(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.calculate_attendance_hours() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600;
        
        IF NEW.total_hours > 8 THEN
            NEW.overtime_hours = NEW.total_hours - 8;
        ELSE
            NEW.overtime_hours = 0;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: calculate_campaign_metrics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.calculate_campaign_metrics(campaign_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  sent_count INT;
  replied_count INT;
BEGIN
  -- Get counts
  SELECT sent_count, replied_count INTO sent_count, replied_count
  FROM whatsapp_campaigns
  WHERE id = campaign_uuid;
  
  -- Insert or update metrics
  INSERT INTO whatsapp_campaign_metrics (
    campaign_id,
    total_sent,
    total_replied,
    response_rate,
    calculated_at
  ) VALUES (
    campaign_uuid,
    sent_count,
    replied_count,
    CASE WHEN sent_count > 0 THEN (replied_count::DECIMAL / sent_count::DECIMAL * 100) ELSE 0 END,
    NOW()
  )
  ON CONFLICT (campaign_id) DO UPDATE SET
    total_sent = EXCLUDED.total_sent,
    total_replied = EXCLUDED.total_replied,
    response_rate = EXCLUDED.response_rate,
    calculated_at = NOW();
END;
$$;


--
-- Name: calculate_leave_days(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.calculate_leave_days() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.total_days = (NEW.end_date - NEW.start_date) + 1;
    RETURN NEW;
END;
$$;


--
-- Name: calculate_next_due_date(date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.calculate_next_due_date(p_current_date date, frequency_type text) RETURNS date
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: calculate_next_execution(character varying, timestamp with time zone, timestamp with time zone, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.calculate_next_execution(p_schedule_type character varying, p_last_executed_at timestamp with time zone, p_scheduled_for timestamp with time zone, p_recurrence_pattern jsonb) RETURNS timestamp with time zone
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_next_execution TIMESTAMPTZ;
  v_base_time TIMESTAMPTZ;
BEGIN
  -- Use last execution time or scheduled time as base
  v_base_time := COALESCE(p_last_executed_at, p_scheduled_for);
  
  CASE p_schedule_type
    WHEN 'once' THEN
      v_next_execution := NULL; -- No next execution for one-time messages
      
    WHEN 'recurring_daily' THEN
      v_next_execution := v_base_time + INTERVAL '1 day';
      
    WHEN 'recurring_weekly' THEN
      v_next_execution := v_base_time + INTERVAL '1 week';
      
    WHEN 'recurring_monthly' THEN
      v_next_execution := v_base_time + INTERVAL '1 month';
      
    WHEN 'recurring_custom' THEN
      -- Use custom pattern from JSONB
      -- This is a simplified version, you can expand based on your needs
      v_next_execution := v_base_time + (p_recurrence_pattern->>'interval')::INTERVAL;
      
    ELSE
      v_next_execution := NULL;
  END CASE;
  
  RETURN v_next_execution;
END;
$$;


--
-- Name: calculate_next_execution_date(character varying, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.calculate_next_execution_date(p_frequency character varying, p_current_date date) RETURNS date
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  RETURN CASE p_frequency
    WHEN 'daily' THEN p_current_date + INTERVAL '1 day'
    WHEN 'weekly' THEN p_current_date + INTERVAL '1 week'
    WHEN 'biweekly' THEN p_current_date + INTERVAL '2 weeks'
    WHEN 'monthly' THEN p_current_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN p_current_date + INTERVAL '3 months'
    WHEN 'yearly' THEN p_current_date + INTERVAL '1 year'
    ELSE p_current_date + INTERVAL '1 month'
  END::DATE;
END;
$$;


--
-- Name: calculate_parent_variant_stock(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.calculate_parent_variant_stock(parent_variant_id_param uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  total_stock INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0)
  INTO total_stock
  FROM lats_product_variants
  WHERE parent_variant_id = parent_variant_id_param
    AND variant_type = 'imei_child'
    AND is_active = TRUE
    AND quantity > 0;
    
  RETURN total_stock;
END;
$$;


--
-- Name: FUNCTION calculate_parent_variant_stock(parent_variant_id_param uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_parent_variant_stock(parent_variant_id_param uuid) IS 'Calculate total stock from child IMEI variants';


--
-- Name: calculate_suggested_order_quantity(integer, integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.calculate_suggested_order_quantity(p_current_quantity integer, p_reorder_point integer, p_maximum_stock_level integer, p_safety_stock_level integer, p_minimum_order_qty integer) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  v_suggested_qty INTEGER;
  v_max_stock INTEGER;
BEGIN
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
END;
$$;


--
-- Name: can_delete_store_location(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.can_delete_store_location(store_id uuid) RETURNS TABLE(can_delete boolean, reason text, product_count bigint, variant_count bigint, customer_count bigint, employee_count bigint)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_product_count BIGINT;
    v_variant_count BIGINT;
    v_customer_count BIGINT;
    v_employee_count BIGINT;
BEGIN
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
END;
$$;


--
-- Name: FUNCTION can_delete_store_location(store_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.can_delete_store_location(store_id uuid) IS 'Checks if a store location can be safely deleted and returns details about related records';


--
-- Name: can_user_access_branch(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.can_user_access_branch(p_user_id uuid, p_branch_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: check_all_products_for_reorder(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.check_all_products_for_reorder() RETURNS TABLE(product_name text, variant_id uuid, current_qty integer, reorder_point integer, po_created boolean, po_id uuid, error text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_variant RECORD;
  v_po_id UUID;
  v_recent_po UUID;
BEGIN
  -- Only proceed if auto-reorder is enabled
  IF NOT is_auto_reorder_enabled() THEN
    RAISE NOTICE '⚠️  Auto-reorder is disabled in settings';
    RETURN;
  END IF;
  
  RAISE NOTICE '🔍 Checking all products for reorder...';
  
  -- Loop through all variants below reorder point
  FOR v_variant IN 
    SELECT 
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
      BEGIN
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
      END;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Reorder check complete';
  RETURN;
END;
$$;


--
-- Name: check_duplicate_imei(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.check_duplicate_imei() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only check if IMEI is provided
  IF NEW.variant_attributes->>'imei' IS NOT NULL AND NEW.variant_attributes->>'imei' != '' THEN
    -- Check if IMEI already exists (excluding current variant)
    IF EXISTS (
      SELECT 1 
      FROM lats_product_variants 
      WHERE variant_attributes->>'imei' = NEW.variant_attributes->>'imei'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND is_active = true  -- Only check active variants
    ) THEN
      RAISE EXCEPTION 'Duplicate IMEI Error: Device with IMEI % already exists in inventory. Each IMEI must be unique.', NEW.variant_attributes->>'imei';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: check_duplicate_transfer(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.check_duplicate_transfer(p_from_branch_id uuid, p_to_branch_id uuid, p_entity_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM branch_transfers
  WHERE from_branch_id = p_from_branch_id
    AND to_branch_id = p_to_branch_id
    AND entity_id = p_entity_id
    AND status IN ('pending', 'approved', 'in_transit');

  RETURN v_count > 0;
END;
$$;


--
-- Name: check_imei_has_parent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.check_imei_has_parent() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- ✅ UPDATED: Check both 'imei' (old) and 'imei_child' (new) variant types
  IF NEW.variant_type IN ('imei', 'imei_child') AND NEW.parent_variant_id IS NULL THEN
    RAISE EXCEPTION 'IMEI variant must have a parent_variant_id';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: check_products_without_variants(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.check_products_without_variants() RETURNS TABLE(product_id uuid, product_name text, sku text, stock_quantity integer, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
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
END;
$$;


--
-- Name: check_purchase_order_completion_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.check_purchase_order_completion_status(purchase_order_id_param uuid) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_total_items INTEGER := 0;
  v_completed_items INTEGER := 0;
  v_can_complete BOOLEAN := false;
  v_completion_percentage NUMERIC := 0;
  v_po_status TEXT;
  v_payment_status TEXT;
  v_total_amount DECIMAL;
  v_paid_amount DECIMAL;
BEGIN
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
END;
$$;


--
-- Name: check_shipment_ready_for_inventory(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.check_shipment_ready_for_inventory(p_shipping_id uuid) RETURNS TABLE(is_ready boolean, total_products integer, validated_products integer, missing_products integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total INTEGER;
    v_validated INTEGER;
BEGIN
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
END;
$$;


--
-- Name: check_variant_exists(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.check_variant_exists(p_variant_id uuid) RETURNS TABLE(exists_in_variants boolean, exists_in_inventory boolean, variant_type text, inventory_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN RETURN QUERY SELECT EXISTS(SELECT 1 FROM lats_product_variants WHERE id = p_variant_id) as exists_in_variants, EXISTS(SELECT 1 FROM inventory_items WHERE id = p_variant_id) as exists_in_inventory, (SELECT pv.variant_type::text FROM lats_product_variants pv WHERE pv.id = p_variant_id LIMIT 1) as variant_type, (SELECT ii.status::text FROM inventory_items ii WHERE ii.id = p_variant_id LIMIT 1) as inventory_status; END; $$;


--
-- Name: FUNCTION check_variant_exists(p_variant_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_variant_exists(p_variant_id uuid) IS 'Helper function to check if a variant ID exists in either lats_product_variants or inventory_items tables. Used by POS system to validate items before sale processing.';


--
-- Name: cleanup_duplicate_imeis(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.cleanup_duplicate_imeis() RETURNS TABLE(imei text, total_count bigint, kept_variant_id uuid, action_taken text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    duplicate_record RECORD;
    variant_to_keep uuid;
BEGIN
    RAISE NOTICE '🔍 Scanning for duplicate IMEIs...';
    
    FOR duplicate_record IN 
        SELECT 
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
            COALESCE(variant_attributes, '{}'::jsonb),
            '{imei_status}',
            '"duplicate"'::jsonb
        )
        WHERE id = ANY(duplicate_record.variant_ids[2:]);
        
        RETURN QUERY SELECT 
            duplicate_record.imei_value::text,
            duplicate_record.dup_count,
            variant_to_keep,
            'Marked duplicates with status=duplicate'::text;
    END LOOP;
    
    RAISE NOTICE '✅ Duplicate cleanup completed';
END;
$$;


--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE user_sessions
  SET is_active = false
  WHERE expires_at < CURRENT_TIMESTAMP
  AND is_active = true;
  
  DELETE FROM user_sessions
  WHERE is_active = false
  AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$;


--
-- Name: cleanup_old_campaigns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.cleanup_old_campaigns() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM whatsapp_bulk_campaigns
  WHERE status IN ('completed', 'cancelled')
  AND completed_at < NOW() - INTERVAL '30 days';
END;
$$;


--
-- Name: cleanup_orphaned_imeis(boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_imeis(p_dry_run boolean DEFAULT true) RETURNS TABLE(orphan_id uuid, imei text, parent_variant_id uuid, action text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF p_dry_run THEN
    -- Just report what would be deleted
    RETURN QUERY
    SELECT 
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
END;
$$;


--
-- Name: close_current_session(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.close_current_session() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE daily_opening_sessions
  SET is_active = false
  WHERE date = NEW.date AND is_active = true;
  
  RETURN NEW;
END;
$$;


--
-- Name: commit_transaction_if_exists(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.commit_transaction_if_exists() RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY SELECT TRUE, 'No-op commit (handled client-side)';
END;
$$;


--
-- Name: complete_purchase_order(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.complete_purchase_order(purchase_order_id_param uuid, user_id_param uuid, completion_notes text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_po_record RECORD;
  v_total_items INTEGER := 0;
  v_completed_items INTEGER := 0;
  v_can_complete BOOLEAN := false;
  v_total_amount DECIMAL;
  v_paid_amount DECIMAL;
  v_reason TEXT := '';
BEGIN
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
    END
  WHERE id = purchase_order_id_param;
  
  -- Create audit log entry if audit table exists
  -- Note: Audit table may not exist or may have different schema
  -- We catch all exceptions to prevent audit logging from blocking completion
  BEGIN
    INSERT INTO purchase_order_audit (
      purchase_order_id,
      action,
      user_id,
      details,
      timestamp
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
  END;
  
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
END;
$$;


--
-- Name: complete_purchase_order_receive(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.complete_purchase_order_receive(purchase_order_id_param uuid, user_id_param uuid, receive_notes text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_order_record RECORD;
  v_item_record RECORD;
  v_items_created INTEGER := 0;
  v_quantity INTEGER;
  v_i INTEGER;
  v_total_items INTEGER := 0;
  v_total_ordered INTEGER := 0;
  v_total_received INTEGER := 0;
  v_all_received BOOLEAN;
  v_new_status VARCHAR;
  v_result JSON;
  v_current_quantity INTEGER;
BEGIN
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
  BEGIN
    -- Process each purchase order item
    FOR v_item_record IN
      SELECT
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
  END;
END;
$$;


--
-- Name: FUNCTION complete_purchase_order_receive(purchase_order_id_param uuid, user_id_param uuid, receive_notes text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.complete_purchase_order_receive(purchase_order_id_param uuid, user_id_param uuid, receive_notes text) IS 'Completes the receive process for a purchase order by creating inventory items with proper branch_id, updating variant stock quantities, creating stock movement records, updating product supplier_id, and updating the order status to received';


--
-- Name: complete_purchase_order_receive_v2(uuid, uuid, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.complete_purchase_order_receive_v2(purchase_order_id_param uuid, user_id_param uuid, receive_notes text DEFAULT NULL::text, force_receive boolean DEFAULT false) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
  v_all_received BOOLEAN;
  v_new_status VARCHAR;
  v_result JSON;
  v_current_quantity INTEGER;
  v_inventory_count INTEGER;
  v_stock_movement_exists BOOLEAN;
BEGIN
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
  BEGIN
    -- Process each purchase order item
    FOR v_item_record IN
      SELECT
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
  END;
END;
$$;


--
-- Name: complete_quality_check(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.complete_quality_check(p_quality_check_id uuid, p_notes text DEFAULT NULL::text, p_signature text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_total_items INTEGER;
  v_passed_items INTEGER;
  v_failed_items INTEGER;
  v_overall_result TEXT;
BEGIN
  -- Count items by result
  SELECT 
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
END;
$$;


--
-- Name: FUNCTION complete_quality_check(p_quality_check_id uuid, p_notes text, p_signature text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.complete_quality_check(p_quality_check_id uuid, p_notes text, p_signature text) IS 'Completes a quality check and calculates overall result';


--
-- Name: complete_stock_transfer_transaction(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.complete_stock_transfer_transaction(p_transfer_id uuid, p_completed_by uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_transfer RECORD;
  v_destination_variant_id UUID;
  v_source_previous_qty INTEGER;
  v_source_previous_reserved INTEGER;
  v_dest_previous_qty INTEGER;
  v_source_new_qty INTEGER;
  v_dest_new_qty INTEGER;
  v_result JSONB;
BEGIN
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
END;
$$;


--
-- Name: FUNCTION complete_stock_transfer_transaction(p_transfer_id uuid, p_completed_by uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.complete_stock_transfer_transaction(p_transfer_id uuid, p_completed_by uuid) IS 'Completes stock transfer by moving inventory between branches and marking product as shared for multi-branch visibility';


--
-- Name: create_account_transaction(uuid, text, numeric, text, text, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.create_account_transaction(p_account_id uuid, p_transaction_type text, p_amount numeric, p_reference_number text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb, p_created_by uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_transaction_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_branch_id UUID;
BEGIN
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
END;
$$;


--
-- Name: FUNCTION create_account_transaction(p_account_id uuid, p_transaction_type text, p_amount numeric, p_reference_number text, p_description text, p_metadata jsonb, p_created_by uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_account_transaction(p_account_id uuid, p_transaction_type text, p_amount numeric, p_reference_number text, p_description text, p_metadata jsonb, p_created_by uuid) IS 'Creates an account transaction with automatic branch isolation based on the account branch_id';


--
-- Name: create_draft_products_from_po(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.create_draft_products_from_po(p_purchase_order_id uuid, p_shipping_id uuid) RETURNS TABLE(success boolean, products_created integer, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_products_created INTEGER := 0;
BEGIN
    -- Create cargo items from purchase order items
    INSERT INTO lats_shipping_cargo_items (
        shipping_id,
        product_id,
        purchase_order_item_id,
        quantity,
        cost_price,
        description
    )
    SELECT 
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
END;
$$;


--
-- Name: create_missing_inventory_items_for_po(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.create_missing_inventory_items_for_po(po_id uuid) RETURNS json
    LANGUAGE plpgsql
    AS $$
        DECLARE
          v_items_created INTEGER := 0;
          v_item_record RECORD;
          v_quantity INTEGER;
          v_i INTEGER;
        BEGIN
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
        END;
        $$;


--
-- Name: create_next_recurring_reminder(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.create_next_recurring_reminder() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  next_date DATE;
  recurring_config JSONB;
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'pending' AND NEW.recurring IS NOT NULL THEN
    recurring_config := NEW.recurring;
    
    IF (recurring_config->>'enabled')::BOOLEAN = TRUE THEN
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
END;
$$;


--
-- Name: create_product_variant(uuid, text, text, numeric, numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.create_product_variant(p_product_id uuid, p_variant_name text, p_sku text DEFAULT NULL::text, p_cost_price numeric DEFAULT 0, p_unit_price numeric DEFAULT 0, p_quantity integer DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id UUID;
    has_variant_name BOOLEAN;
    has_name BOOLEAN;
BEGIN
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
            p_unit_price, p_quantity, '{}'::jsonb, true
        )
        RETURNING id INTO v_id;
    ELSIF has_name THEN
        INSERT INTO lats_product_variants (
            product_id, name, sku, cost_price, unit_price, 
            selling_price, quantity, attributes, is_active
        )
        VALUES (
            p_product_id, p_variant_name, p_sku, p_cost_price, p_unit_price,
            p_unit_price, p_quantity, '{}'::jsonb, true
        )
        RETURNING id INTO v_id;
    ELSE
        RAISE EXCEPTION 'No valid name column found in lats_product_variants';
    END IF;
    
    RETURN v_id;
END;
$$;


--
-- Name: create_product_variant(uuid, text, text, numeric, numeric, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.create_product_variant(p_product_id uuid, p_variant_name text, p_sku text DEFAULT NULL::text, p_cost_price numeric DEFAULT 0, p_unit_price numeric DEFAULT 0, p_quantity integer DEFAULT 0, p_branch_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id UUID;
    has_variant_name BOOLEAN;
    has_name BOOLEAN;
    v_branch_id UUID;
BEGIN
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
            p_unit_price, p_quantity, '{}'::jsonb, true
        )
        RETURNING id INTO v_id;
    ELSIF has_name THEN
        INSERT INTO lats_product_variants (
            product_id, branch_id, name, sku, cost_price, unit_price, 
            selling_price, quantity, attributes, is_active
        )
        VALUES (
            p_product_id, v_branch_id, p_variant_name, p_sku, p_cost_price, p_unit_price,
            p_unit_price, p_quantity, '{}'::jsonb, true
        )
        RETURNING id INTO v_id;
    ELSE
        RAISE EXCEPTION 'No valid name column found in lats_product_variants';
    END IF;
    
    RETURN v_id;
END;
$$;


--
-- Name: create_quality_check_from_template(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.create_quality_check_from_template(p_purchase_order_id uuid, p_template_id text, p_checked_by uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_quality_check_id UUID;
  v_criterion RECORD;
  v_po_item RECORD;
BEGIN
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
END;
$$;


--
-- Name: FUNCTION create_quality_check_from_template(p_purchase_order_id uuid, p_template_id text, p_checked_by uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_quality_check_from_template(p_purchase_order_id uuid, p_template_id text, p_checked_by uuid) IS 'Creates a new quality check from a template';


--
-- Name: customers_delete_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.customers_delete_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM lats_customers WHERE id = OLD.id;
    RETURN OLD;
END;
$$;


--
-- Name: customers_insert_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.customers_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
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
        COALESCE(NEW.branch_id, '00000000-0000-0000-0000-000000000001'::uuid),
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
        COALESCE(NEW.referrals, '[]'::jsonb),
        COALESCE(NEW.is_shared, true),
        NEW.preferred_branch_id,
        NEW.visible_to_branches,
        COALESCE(NEW.sharing_mode, 'isolated'),
        NEW.created_by_branch_id,
        NEW.created_by_branch_name
    )
    RETURNING * INTO NEW;
    RETURN NEW;
END;
$$;


--
-- Name: customers_update_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.customers_update_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: deactivate_inactive_customers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.deactivate_inactive_customers() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    affected_count INTEGER;
BEGIN
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
END;
$$;


--
-- Name: debug_prices(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.debug_prices() RETURNS TABLE(product_name text, product_unit_price numeric, product_cost_price numeric, product_selling_price numeric, variant_count bigint, variant_prices text, price_source text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
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
END;
$$;


--
-- Name: ensure_single_primary_image(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.ensure_single_primary_image() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- If setting this image as primary, unset all other primary images for this product
    IF NEW.is_primary = true THEN
        UPDATE product_images 
        SET is_primary = false 
        WHERE product_id = NEW.product_id 
        AND id != NEW.id 
        AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: execute_scheduled_transfer(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.execute_scheduled_transfer(p_scheduled_transfer_id uuid) RETURNS TABLE(success boolean, message text, execution_id uuid)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_schedule RECORD;
  v_source_balance DECIMAL(15, 2);
  v_dest_balance DECIMAL(15, 2);
  v_new_source_balance DECIMAL(15, 2);
  v_new_dest_balance DECIMAL(15, 2);
  v_reference_number TEXT;
  v_source_transaction_id UUID;
  v_dest_transaction_id UUID;
  v_execution_id UUID;
BEGIN
  -- Get scheduled transfer details
  SELECT * INTO v_schedule
  FROM scheduled_transfers
  WHERE id = p_scheduled_transfer_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Scheduled transfer not found or inactive'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if execution date has arrived
  IF v_schedule.next_execution_date > CURRENT_DATE THEN
    RETURN QUERY SELECT false, 'Execution date not yet reached'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if end date has passed
  IF v_schedule.end_date IS NOT NULL AND CURRENT_DATE > v_schedule.end_date THEN
    -- Deactivate the schedule
    UPDATE scheduled_transfers SET is_active = false WHERE id = p_scheduled_transfer_id;
    RETURN QUERY SELECT false, 'Schedule has ended'::TEXT, NULL::UUID;
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
END;
$$;


--
-- Name: FUNCTION execute_scheduled_transfer(p_scheduled_transfer_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.execute_scheduled_transfer(p_scheduled_transfer_id uuid) IS 'Executes a scheduled transfer and logs the result';


--
-- Name: find_duplicate_imeis(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.find_duplicate_imeis() RETURNS TABLE(imei text, duplicate_count bigint, variant_ids uuid[])
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(attributes->>'imei', name) as imei,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id) as variant_ids
  FROM lats_product_variants
  WHERE variant_type = 'imei'
  GROUP BY COALESCE(attributes->>'imei', name)
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC;
END;
$$;


--
-- Name: find_or_create_variant_at_branch(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.find_or_create_variant_at_branch(p_source_variant_id uuid, p_branch_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_source_variant RECORD;
  v_destination_variant_id UUID;
  v_branch_code TEXT;
  v_new_sku TEXT;
BEGIN
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
    COALESCE(v_source_variant.variant_attributes, '{}'::jsonb), -- Copy variant attributes
    NOW(),
    NOW()
  )
  RETURNING id INTO v_destination_variant_id;

  RAISE NOTICE 'Created new variant at branch: %', v_destination_variant_id;
  RETURN v_destination_variant_id;
END;
$$;


--
-- Name: fix_existing_currency_issues(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.fix_existing_currency_issues() RETURNS TABLE(variant_id uuid, variant_name text, po_number text, old_cost numeric, new_cost numeric, currency text, exchange_rate numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH issues AS (
        SELECT 
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
    SELECT 
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
END;
$$;


--
-- Name: FUNCTION fix_existing_currency_issues(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fix_existing_currency_issues() IS 'Identifies and fixes existing variants with currency conversion problems';


--
-- Name: fix_missing_inventory_items(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.fix_missing_inventory_items() RETURNS TABLE(purchase_order_id uuid, items_created integer, message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_po_record RECORD;
  v_item_record RECORD;
  v_items_created INTEGER := 0;
  v_total_created INTEGER := 0;
BEGIN
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
      SELECT 
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
END;
$$;


--
-- Name: generate_trade_in_contract_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.generate_trade_in_contract_number() RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    next_num INTEGER;
    new_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM lats_trade_in_contracts
    WHERE contract_number ~ '^TIC-[0-9]+$';
    
    new_number := 'TIC-' || LPAD(next_num::TEXT, 6, '0');
    RETURN new_number;
END;
$_$;


--
-- Name: generate_trade_in_transaction_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.generate_trade_in_transaction_number() RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    next_num INTEGER;
    new_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM lats_trade_in_transactions
    WHERE transaction_number ~ '^TI-[0-9]+$';
    
    new_number := 'TI-' || LPAD(next_num::TEXT, 6, '0');
    RETURN new_number;
END;
$_$;


--
-- Name: get_available_imeis_for_parent(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_available_imeis_for_parent(parent_variant_id_param uuid) RETURNS TABLE(child_id uuid, imei text, serial_number text, condition text, imei_status text, cost_price numeric, selling_price numeric, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
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
END;
$$;


--
-- Name: FUNCTION get_available_imeis_for_parent(parent_variant_id_param uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_available_imeis_for_parent(parent_variant_id_param uuid) IS 'Get all available IMEI child variants for a parent variant';


--
-- Name: get_available_imeis_for_pos(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_available_imeis_for_pos(parent_variant_id_param uuid) RETURNS TABLE(child_id uuid, imei text, serial_number text, mac_address text, condition text, cost_price numeric, selling_price numeric, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
END;
$$;


--
-- Name: FUNCTION get_available_imeis_for_pos(parent_variant_id_param uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_available_imeis_for_pos(parent_variant_id_param uuid) IS 'Get available IMEI variants for POS selection';


--
-- Name: get_child_imeis(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_child_imeis(parent_variant_id_param uuid) RETURNS TABLE(child_id uuid, imei text, serial_number text, mac_address text, status text, quantity integer, cost_price numeric, selling_price numeric, variant_attributes jsonb, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as child_id,
    v.variant_attributes->>'imei' as imei,
    v.variant_attributes->>'serial_number' as serial_number,
    v.variant_attributes->>'mac_address' as mac_address,
    COALESCE(v.variant_attributes->>'imei_status', 
      CASE 
        WHEN v.is_active = TRUE AND v.quantity > 0 THEN 'available'
        WHEN v.is_active = FALSE THEN 'sold'
        ELSE 'unavailable'
      END
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
END;
$$;


--
-- Name: FUNCTION get_child_imeis(parent_variant_id_param uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_child_imeis(parent_variant_id_param uuid) IS 'Get all child IMEI variants for a parent variant';


--
-- Name: get_customer_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_customer_status(customer_id uuid) RETURNS TABLE(id uuid, name text, is_active boolean, member_since timestamp with time zone, last_visit timestamp with time zone, days_since_activity integer, status_reason text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
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
END;
$$;


--
-- Name: get_default_branch_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_default_branch_id() RETURNS uuid
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_branch_id UUID;
BEGIN
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
END;
$$;


--
-- Name: FUNCTION get_default_branch_id(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_default_branch_id() IS 'Returns the default branch_id (main branch or first active branch)';


--
-- Name: get_due_scheduled_transfers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_due_scheduled_transfers() RETURNS TABLE(id uuid, source_account_name text, destination_account_name text, amount numeric, description text, next_execution_date date, frequency character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
END;
$$;


--
-- Name: FUNCTION get_due_scheduled_transfers(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_due_scheduled_transfers() IS 'Returns all scheduled transfers that are due for execution';


--
-- Name: get_inactive_customers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_inactive_customers() RETURNS TABLE(id uuid, name text, phone text, last_activity_date timestamp with time zone, days_inactive integer, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
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
END;
$$;


--
-- Name: get_inventory_items(uuid, uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_inventory_items(filter_po_id uuid DEFAULT NULL::uuid, filter_product_id uuid DEFAULT NULL::uuid, filter_status text DEFAULT NULL::text, limit_count integer DEFAULT 100) RETURNS TABLE(id uuid, product_id uuid, variant_id uuid, serial_number text, imei text, mac_address text, barcode text, status text, location text, shelf text, bin text, purchase_date timestamp with time zone, warranty_start date, warranty_end date, cost_price numeric, selling_price numeric, notes text, metadata jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, product_name text, product_sku text, variant_name text, variant_sku text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
END;
$$;


--
-- Name: get_inventory_json(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_inventory_json() RETURNS json
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: get_messages_ready_for_execution(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_messages_ready_for_execution(p_execution_mode character varying DEFAULT NULL::character varying) RETURNS TABLE(id uuid, name character varying, message_type character varying, scheduled_for timestamp with time zone, execution_mode character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sbm.id,
    sbm.name,
    sbm.message_type,
    sbm.scheduled_for,
    sbm.execution_mode
  FROM scheduled_bulk_messages sbm
  WHERE sbm.status IN ('pending', 'scheduled')
    AND sbm.auto_execute = true
    AND sbm.scheduled_for <= NOW()
    AND (p_execution_mode IS NULL OR sbm.execution_mode = p_execution_mode)
  ORDER BY sbm.scheduled_for ASC;
END;
$$;


--
-- Name: get_minimum_order_quantity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_minimum_order_quantity() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_min_qty TEXT;
BEGIN
  SELECT setting_value INTO v_min_qty
  FROM admin_settings
  WHERE category = 'inventory' 
    AND setting_key = 'minimum_order_quantity'
    AND is_active = true;
  
  RETURN COALESCE(v_min_qty::INTEGER, 1);
EXCEPTION WHEN OTHERS THEN
  RETURN 1;
END;
$$;


--
-- Name: get_overdue_reminders(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_overdue_reminders(p_user_id uuid, p_branch_id uuid) RETURNS TABLE(id uuid, title text, description text, reminder_datetime timestamp without time zone, priority text, category text, minutes_overdue integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    (r.date + r.time)::TIMESTAMP as reminder_datetime,
    r.priority,
    r.category,
    EXTRACT(EPOCH FROM (NOW() - (r.date + r.time)::TIMESTAMP))/60 as minutes_overdue
  FROM reminders r
  WHERE r.status = 'pending'
    AND (r.assigned_to = p_user_id OR r.created_by = p_user_id)
    AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
    AND (r.date + r.time)::TIMESTAMP < NOW()
  ORDER BY (r.date + r.time)::TIMESTAMP ASC;
END;
$$;


--
-- Name: get_parent_variants(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_parent_variants(product_id_param uuid) RETURNS TABLE(variant_id uuid, variant_name text, sku text, cost_price numeric, selling_price numeric, quantity integer, available_imeis integer, variant_attributes jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
END;
$$;


--
-- Name: FUNCTION get_parent_variants(product_id_param uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_parent_variants(product_id_param uuid) IS 'Get parent variants for a product (used in PO creation)';


--
-- Name: get_payments(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_payments(po_id uuid) RETURNS TABLE(id uuid, purchase_order_id uuid, amount numeric, payment_method text, payment_date timestamp with time zone, reference_number text, notes text, created_at timestamp with time zone, created_by uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
END;
$$;


--
-- Name: get_product_variants(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_product_variants(p_product_id uuid) RETURNS TABLE(id uuid, product_id uuid, variant_name text, sku text, cost_price numeric, unit_price numeric, selling_price numeric, quantity integer, attributes jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
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
END;
$$;


--
-- Name: get_purchase_order_items_with_products(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_purchase_order_items_with_products(purchase_order_id_param uuid) RETURNS TABLE(id uuid, purchase_order_id uuid, product_id uuid, variant_id uuid, quantity integer, received_quantity integer, unit_cost numeric, total_cost numeric, notes text, created_at timestamp with time zone, updated_at timestamp with time zone, product_name text, product_sku text, variant_name text, variant_sku text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
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
END;
$$;


--
-- Name: get_purchase_order_payment_history(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_purchase_order_payment_history(purchase_order_id_param uuid) RETURNS TABLE(id uuid, purchase_order_id uuid, payment_account_id uuid, amount numeric, currency character varying, payment_method character varying, payment_method_id uuid, reference text, notes text, status character varying, payment_date timestamp with time zone, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, branch_id uuid)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_branch_id UUID;
BEGIN
  -- Get the branch_id from the purchase order for filtering
  SELECT branch_id INTO v_branch_id
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  -- If no branch_id found, return no results (purchase order doesn't exist or has no branch)
  IF v_branch_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
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
END;
$$;


--
-- Name: get_purchase_order_payment_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_purchase_order_payment_summary(purchase_order_id_param uuid) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_result JSON;
  v_total_paid DECIMAL;
  v_payment_count INTEGER;
  v_last_payment_date TIMESTAMP WITH TIME ZONE;
  v_total_amount DECIMAL;
  v_remaining DECIMAL;
  v_payment_status VARCHAR;
BEGIN
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
  SELECT 
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
END;
$$;


--
-- Name: FUNCTION get_purchase_order_payment_summary(purchase_order_id_param uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_purchase_order_payment_summary(purchase_order_id_param uuid) IS 'Gets payment summary for a purchase order including total paid, remaining, and payment count';


--
-- Name: get_purchase_order_receive_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_purchase_order_receive_summary(purchase_order_id_param uuid) RETURNS TABLE(total_items bigint, total_ordered bigint, total_received bigint, total_pending bigint, percent_received numeric, items_detail json)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
END;
$$;


--
-- Name: get_purchase_order_returns(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_purchase_order_returns(purchase_order_id_param uuid) RETURNS TABLE(id uuid, product_id uuid, variant_id uuid, quantity integer, reason text, notes text, created_at timestamp with time zone, created_by uuid, product_name text, variant_name text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
END;
$$;


--
-- Name: get_quality_check_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_quality_check_summary(p_purchase_order_id uuid) RETURNS TABLE(quality_check_id uuid, status text, overall_result text, checked_by uuid, checked_at timestamp with time zone, total_items bigint, passed_items bigint, failed_items bigint, pending_items bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
END;
$$;


--
-- Name: FUNCTION get_quality_check_summary(p_purchase_order_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_quality_check_summary(p_purchase_order_id uuid) IS 'Gets summary statistics for a quality check';


--
-- Name: get_quality_check_with_items(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_quality_check_with_items(quality_check_id_param uuid) RETURNS TABLE(id uuid, check_item_id uuid, check_name text, check_description text, check_type text, is_required boolean, result boolean, numeric_value numeric, text_value text, notes text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
        BEGIN
          RETURN QUERY
          SELECT 
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
        END;
        $$;


--
-- Name: get_received_items_for_po(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_received_items_for_po(po_id uuid) RETURNS TABLE(id uuid, purchase_order_id uuid, product_id uuid, variant_id uuid, serial_number text, imei text, mac_address text, barcode text, status text, location text, shelf text, bin text, purchase_date timestamp with time zone, warranty_start date, warranty_end date, cost_price numeric, selling_price numeric, notes text, metadata jsonb, created_at timestamp with time zone, product_name text, product_sku text, variant_name text, variant_sku text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
        BEGIN
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
        END;
        $$;


--
-- Name: get_upcoming_reminders(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_upcoming_reminders(p_user_id uuid, p_branch_id uuid, p_hours_ahead integer DEFAULT 24) RETURNS TABLE(id uuid, title text, description text, reminder_datetime timestamp without time zone, priority text, category text, minutes_until integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    (r.date + r.time)::TIMESTAMP as reminder_datetime,
    r.priority,
    r.category,
    EXTRACT(EPOCH FROM ((r.date + r.time)::TIMESTAMP - NOW()))/60 as minutes_until
  FROM reminders r
  WHERE r.status = 'pending'
    AND (r.assigned_to = p_user_id OR r.created_by = p_user_id)
    AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
    AND (r.date + r.time)::TIMESTAMP <= NOW() + (p_hours_ahead || ' hours')::INTERVAL
    AND (r.date + r.time)::TIMESTAMP >= NOW()
  ORDER BY (r.date + r.time)::TIMESTAMP ASC;
END;
$$;


--
-- Name: get_user_current_branch(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_user_current_branch(p_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN (
    SELECT branch_id 
    FROM user_branch_assignments 
    WHERE user_id = p_user_id 
    AND is_primary = true 
    LIMIT 1
  );
END;
$$;


--
-- Name: get_variant_by_imei(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_variant_by_imei(search_imei text) RETURNS TABLE(variant_id uuid, product_id uuid, parent_variant_id uuid, product_name text, variant_name text, imei text, serial_number text, imei_status text, cost_price numeric, selling_price numeric, is_active boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
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
END;
$$;


--
-- Name: FUNCTION get_variant_by_imei(search_imei text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_variant_by_imei(search_imei text) IS 'Look up a variant by its IMEI number';


--
-- Name: handle_expense_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_expense_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Delete related account transaction
  DELETE FROM account_transactions
  WHERE related_entity_type = 'expense' 
  AND related_entity_id = OLD.id;
  
  RAISE NOTICE '🗑️ Account transaction removed for deleted expense: %', 
    COALESCE(OLD.title, OLD.description);
  
  RETURN OLD;
END;
$$;


--
-- Name: handle_expense_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_expense_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_account_id UUID;
BEGIN
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
END;
$$;


--
-- Name: handle_expense_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_expense_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_category_name TEXT;
BEGIN
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
END;
$$;


--
-- Name: imei_exists(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.imei_exists(check_imei text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' = check_imei
    );
END;
$$;


--
-- Name: FUNCTION imei_exists(check_imei text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.imei_exists(check_imei text) IS 'Check if an IMEI already exists in the system';


--
-- Name: increase_variant_stock(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.increase_variant_stock(p_variant_id uuid, p_quantity integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Add stock to destination variant
  UPDATE lats_product_variants
  SET quantity = quantity + p_quantity,
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Increased % units for variant %', p_quantity, p_variant_id;
END;
$$;


--
-- Name: increment_media_usage(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.increment_media_usage(media_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE whatsapp_media_library
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = media_id;
END;
$$;


--
-- Name: inherit_parent_variant_prices(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.inherit_parent_variant_prices() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      DECLARE
        v_parent_selling_price NUMERIC;
        v_parent_cost_price NUMERIC;
      BEGIN
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
      END;
      $$;


--
-- Name: is_auto_create_po_enabled(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_auto_create_po_enabled() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_enabled TEXT;
BEGIN
  SELECT setting_value INTO v_enabled
  FROM admin_settings
  WHERE category = 'inventory' 
    AND setting_key = 'auto_create_po_at_reorder'
    AND is_active = true;
  
  RETURN (v_enabled = 'true');
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;


--
-- Name: is_auto_reorder_enabled(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_auto_reorder_enabled() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_enabled TEXT;
BEGIN
  SELECT setting_value INTO v_enabled
  FROM admin_settings
  WHERE category = 'inventory' 
    AND setting_key = 'auto_reorder_enabled'
    AND is_active = true;
  
  RETURN (v_enabled = 'true');
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;


--
-- Name: is_data_shared(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_data_shared(p_entity_type text, p_branch_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_isolation_mode TEXT;
  v_share_flag BOOLEAN;
BEGIN
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
END;
$$;


--
-- Name: is_phone_blacklisted(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_phone_blacklisted(phone_number character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM whatsapp_blacklist 
    WHERE phone = phone_number
  );
END;
$$;


--
-- Name: is_visible_to_branch(uuid, uuid[], text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_visible_to_branch(item_branch_id uuid, item_visible_branches uuid[], item_sharing_mode text, check_branch_id uuid) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
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
END;
$$;


--
-- Name: jsonb_object_keys_count(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.jsonb_object_keys_count(obj jsonb) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  RETURN (SELECT count(*) FROM jsonb_object_keys(obj));
END;
$$;


--
-- Name: link_whatsapp_customer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.link_whatsapp_customer() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Try to find customer by phone number
    SELECT id INTO NEW.customer_id
    FROM customers
    WHERE phone = NEW.from_phone
       OR phone = '+' || NEW.from_phone
       OR whatsapp = NEW.from_phone
       OR whatsapp = '+' || NEW.from_phone
    LIMIT 1;
    
    RETURN NEW;
END;
$$;


--
-- Name: log_purchase_order_audit(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.log_purchase_order_audit(p_purchase_order_id uuid, p_action text, p_details text, p_user_id text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_audit_id UUID;
  v_user_uuid UUID;
BEGIN
  -- Generate new audit ID
  v_audit_id := gen_random_uuid();
  
  -- Handle 'system' user_id by converting to NULL
  -- Or try to cast to UUID if it's a valid UUID string
  BEGIN
    IF p_user_id = 'system' OR p_user_id IS NULL OR p_user_id = '' THEN
      v_user_uuid := NULL;
    ELSE
      v_user_uuid := p_user_id::UUID;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_user_uuid := NULL;
  END;

  -- Insert into purchase_order_audit table
  -- Note: Different tables have different schemas, we'll try both
  BEGIN
    -- Try inserting into purchase_order_audit (if it exists)
    INSERT INTO purchase_order_audit (
      id,
      purchase_order_id,
      action,
      user_id,
      created_by,
      details,
      timestamp
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
  END;

  RETURN v_audit_id;

EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the operation
  RAISE WARNING 'Error logging audit entry: %', SQLERRM;
  RETURN NULL;
END;
$$;


--
-- Name: log_purchase_order_audit(uuid, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.log_purchase_order_audit(p_purchase_order_id uuid, p_action text, p_details text, p_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  -- Insert the audit entry
  INSERT INTO purchase_order_audit (
    purchase_order_id,
    action,
    user_id,
    created_by,
    details,
    timestamp,
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
END;
$$;


--
-- Name: mark_imei_as_sold(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.mark_imei_as_sold(child_variant_id_param uuid, sale_id_param uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_variant_id UUID;
  v_parent_id UUID;
BEGIN
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
        COALESCE(variant_attributes, '{}'::jsonb),
        '{sold_at}',
        to_jsonb(NOW())
      ),
      '{sale_id}',
      CASE 
        WHEN sale_id_param IS NOT NULL THEN to_jsonb(sale_id_param::TEXT)
        ELSE 'null'::jsonb
      END
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
  SELECT 
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
END;
$$;


--
-- Name: mark_po_as_received(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.mark_po_as_received(purchase_order_id_param uuid, user_id_param uuid, received_notes text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: merge_po_items_with_existing_variants(uuid, integer, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.merge_po_items_with_existing_variants(product_id_param uuid, quantity_param integer, cost_price_param numeric DEFAULT NULL::numeric, selling_price_param numeric DEFAULT NULL::numeric) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_existing_variant RECORD;
  v_result JSONB;
BEGIN
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
END;
$$;


--
-- Name: move_products_to_inventory(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.move_products_to_inventory(p_shipping_id uuid, p_user_id uuid) RETURNS TABLE(success boolean, products_moved integer, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_products_moved INTEGER := 0;
    v_cargo_item RECORD;
BEGIN
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
        SELECT 
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
END;
$$;


--
-- Name: partial_purchase_order_receive(uuid, jsonb, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.partial_purchase_order_receive(purchase_order_id_param uuid, received_items jsonb, user_id_param uuid, receive_notes text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_order_record RECORD;
  v_item_record RECORD;
  v_received_item JSONB;
  v_items_created INTEGER := 0;
  v_quantity INTEGER;
  v_i INTEGER;
  v_total_received INTEGER := 0;
  v_total_ordered INTEGER := 0;
  v_all_received BOOLEAN;
  v_new_status VARCHAR;
  v_result JSON;
  v_current_quantity INTEGER;
BEGIN
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
  BEGIN
    -- Process each received item
    FOR v_received_item IN SELECT * FROM jsonb_array_elements(received_items)
    LOOP
      -- Get the PO item details
      SELECT 
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
      WHERE poi.id = (v_received_item->>'item_id')::UUID
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
    SELECT 
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
  END;
END;
$$;


--
-- Name: FUNCTION partial_purchase_order_receive(purchase_order_id_param uuid, received_items jsonb, user_id_param uuid, receive_notes text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.partial_purchase_order_receive(purchase_order_id_param uuid, received_items jsonb, user_id_param uuid, receive_notes text) IS 'Handles partial receives for purchase orders by creating inventory items with status=available (stock updated by trigger), creating stock movement records, and updating PO status';


--
-- Name: prevent_manual_balance_updates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.prevent_manual_balance_updates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only allow balance updates if they're coming from the transaction trigger
  -- or if explicitly allowed (for initial setup/migrations)
  IF NOT (TG_OP = 'UPDATE' AND OLD.balance IS NOT DISTINCT FROM NEW.balance) THEN
    -- Check if this is a legitimate update (not bypassing transaction tracking)
    -- For now, just log the update
    RAISE NOTICE 'Manual balance update detected for account %: % -> %', 
      COALESCE(OLD.id, NEW.id), OLD.balance, NEW.balance;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: process_due_recurring_expenses(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.process_due_recurring_expenses() RETURNS TABLE(processed_count integer, failed_count integer, skipped_count integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
  recurring_exp RECORD;
  transaction_id UUID;
  v_processed_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  -- Loop through all active recurring expenses that are due today or overdue
  FOR recurring_exp IN 
    SELECT * FROM recurring_expenses
    WHERE is_active = true
      AND next_due_date <= CURRENT_DATE
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ORDER BY next_due_date
  LOOP
    BEGIN
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
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed_count, v_failed_count, v_skipped_count;
END;
$$;


--
-- Name: process_purchase_order_payment(uuid, uuid, numeric, character varying, character varying, uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.process_purchase_order_payment(purchase_order_id_param uuid, payment_account_id_param uuid, amount_param numeric, currency_param character varying DEFAULT 'TZS'::character varying, payment_method_param character varying DEFAULT 'Cash'::character varying, payment_method_id_param uuid DEFAULT NULL::uuid, user_id_param uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid, reference_param text DEFAULT NULL::text, notes_param text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_payment_id UUID;
  v_po_total NUMERIC;
  v_po_paid NUMERIC;
  v_new_paid NUMERIC;
  v_payment_status VARCHAR;
  v_account_balance NUMERIC;
  v_branch_id UUID;
  v_result JSON;
BEGIN
  -- Log incoming parameters for debugging
  RAISE NOTICE '📥 Processing payment with parameters:';
  RAISE NOTICE '   PO ID: %', purchase_order_id_param;
  RAISE NOTICE '   Account ID: %', payment_account_id_param;
  RAISE NOTICE '   Amount: %', amount_param;
  RAISE NOTICE '   Currency: %', currency_param;
  RAISE NOTICE '   Payment Method: %', payment_method_param;
  RAISE NOTICE '   Method ID: %', payment_method_id_param;

  -- Validate that currency is NOT a UUID
  IF currency_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'PARAMETER ERROR: currency_param "' || currency_param || '" is a UUID but should be a currency code (TZS, USD, etc.)'
    );
  END IF;

  -- Validate that payment_method is NOT a UUID
  IF payment_method_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'PARAMETER ERROR: payment_method_param "' || payment_method_param || '" is a UUID but should be a payment method name (Cash, Bank Transfer, etc.)'
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
END;
$_$;


--
-- Name: FUNCTION process_purchase_order_payment(purchase_order_id_param uuid, payment_account_id_param uuid, amount_param numeric, currency_param character varying, payment_method_param character varying, payment_method_id_param uuid, user_id_param uuid, reference_param text, notes_param text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.process_purchase_order_payment(purchase_order_id_param uuid, payment_account_id_param uuid, amount_param numeric, currency_param character varying, payment_method_param character varying, payment_method_id_param uuid, user_id_param uuid, reference_param text, notes_param text) IS 'Processes purchase order payment with atomic transaction handling and branch_id tracking for expenses.

FIXED: Now recalculates total_paid from all completed payments after inserting the new payment,
preventing race conditions when multiple payments are processed in parallel.

CORRECT Parameter Order:
1. purchase_order_id_param: UUID (required) - The purchase order ID
2. payment_account_id_param: UUID (required) - The finance account ID
3. amount_param: NUMERIC (required) - Payment amount
4. currency_param: VARCHAR (default ''TZS'') - Currency code (NOT a UUID!)
5. payment_method_param: VARCHAR (default ''Cash'') - Payment method name (NOT a UUID!)
6. payment_method_id_param: UUID (default NULL) - Reference to payment method table
7. user_id_param: UUID (default system) - User making the payment
8. reference_param: TEXT (default NULL) - Payment reference
9. notes_param: TEXT (default NULL) - Additional notes

Returns: JSON with success status, message, and payment data including branch_id';


--
-- Name: process_purchase_order_payments_batch(json[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.process_purchase_order_payments_batch(payment_data json[]) RETURNS json
    LANGUAGE plpgsql
    AS $_$
DECLARE
  payment_record JSON;
  v_payment_id UUID;
  v_po_id UUID;
  v_account_id UUID;
  v_amount DECIMAL;
  v_currency VARCHAR;
  v_payment_method VARCHAR;
  v_payment_method_id UUID;
  v_user_id UUID;
  v_reference TEXT;
  v_notes TEXT;
  v_po_total DECIMAL;
  v_po_paid DECIMAL;
  v_new_paid DECIMAL;
  v_payment_status VARCHAR;
  v_result JSON[];
  v_single_result JSON;
BEGIN
  v_result := ARRAY[]::JSON[];

  -- Process each payment in the batch
  FOREACH payment_record IN ARRAY payment_data LOOP
    -- Extract payment data from JSON
    v_po_id := (payment_record->>'purchase_order_id')::UUID;
    v_account_id := (payment_record->>'payment_account_id')::UUID;
    v_amount := (payment_record->>'amount')::DECIMAL;
    v_currency := COALESCE(payment_record->>'currency', 'TZS');
    v_payment_method := payment_record->>'payment_method';
    v_payment_method_id := (payment_record->>'payment_method_id')::UUID;
    v_user_id := COALESCE((payment_record->>'user_id')::UUID, '00000000-0000-0000-0000-000000000001'::UUID);
    v_reference := payment_record->>'reference';
    v_notes := payment_record->>'notes';

    -- Validate currency is not a UUID
    IF v_currency ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_single_result := json_build_object(
        'success', false,
        'message', 'Invalid currency parameter: appears to be a UUID instead of currency code',
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
END;
$_$;


--
-- Name: FUNCTION process_purchase_order_payments_batch(payment_data json[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.process_purchase_order_payments_batch(payment_data json[]) IS 'Processes multiple purchase order payments in a single transaction for improved performance';


--
-- Name: process_purchase_order_payments_batch_json(json); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.process_purchase_order_payments_batch_json(payment_data_json json) RETURNS json
    LANGUAGE plpgsql
    AS $$
    DECLARE
      payment_record JSON;
      v_payment_id UUID;
      v_po_id UUID;
      v_account_id UUID;
      v_amount DECIMAL;
      v_currency VARCHAR;
      v_payment_method VARCHAR;
      v_payment_method_id UUID;
      v_user_id UUID;
      v_reference TEXT;
      v_notes TEXT;
      v_po_total DECIMAL;
      v_po_paid DECIMAL;
      v_new_paid DECIMAL;
      v_payment_status VARCHAR;
      v_result JSON[];
      v_single_result JSON;
      payment_array JSON[];
    BEGIN
      v_result := ARRAY[]::JSON[];
      
      -- Convert JSON to JSON array
      payment_array := ARRAY(SELECT json_array_elements(payment_data_json));
      
      -- Process each payment in the array
      FOREACH payment_record IN ARRAY payment_array LOOP
        -- Extract payment data from JSON
        v_po_id := (payment_record->>'purchase_order_id')::UUID;
        v_account_id := (payment_record->>'payment_account_id')::UUID;
        v_amount := (payment_record->>'amount')::DECIMAL;
        v_currency := COALESCE(payment_record->>'currency', 'TZS');
        v_payment_method := payment_record->>'payment_method';
        v_payment_method_id := (payment_record->>'payment_method_id')::UUID;
        v_user_id := COALESCE((payment_record->>'user_id')::UUID, '00000000-0000-0000-0000-000000000001'::UUID);
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
    END;
    $$;


--
-- Name: process_purchase_order_payments_batch_simple(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.process_purchase_order_payments_batch_simple(payment_data_json text) RETURNS json
    LANGUAGE plpgsql
    AS $$
    DECLARE
      payment_data JSON;
      payment_record JSON;
      v_payment_id UUID;
      v_po_id UUID;
      v_account_id UUID;
      v_amount DECIMAL;
      v_currency VARCHAR;
      v_payment_method VARCHAR;
      v_payment_method_id UUID;
      v_user_id UUID;
      v_reference TEXT;
      v_notes TEXT;
      v_result JSON[];
      v_single_result JSON;
    BEGIN
      v_result := ARRAY[]::JSON[];
      
      -- Parse the JSON text
      payment_data := payment_data_json::JSON;
      
      -- Process each payment in the JSON array
      FOR payment_record IN SELECT * FROM json_array_elements(payment_data) LOOP
        -- Extract payment data from JSON
        v_po_id := (payment_record->>'purchase_order_id')::UUID;
        v_account_id := (payment_record->>'payment_account_id')::UUID;
        v_amount := (payment_record->>'amount')::DECIMAL;
        v_currency := COALESCE(payment_record->>'currency', 'TZS');
        v_payment_method := payment_record->>'payment_method';
        v_payment_method_id := (payment_record->>'payment_method_id')::UUID;
        v_user_id := COALESCE((payment_record->>'user_id')::UUID, '00000000-0000-0000-0000-000000000001'::UUID);
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
    END;
    $$;


--
-- Name: process_purchase_order_return(uuid, uuid, text, integer, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.process_purchase_order_return(purchase_order_id_param uuid, item_id_param uuid, return_type_param text, return_quantity_param integer, return_reason_param text, user_id_param uuid) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_item_record RECORD;
BEGIN
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
END;
$$;


--
-- Name: quick_add_stock(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.quick_add_stock(p_variant_id uuid, p_quantity integer) RETURNS TABLE(success boolean, message text, old_quantity integer, new_quantity integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_result RECORD;
BEGIN
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
END;
$$;


--
-- Name: FUNCTION quick_add_stock(p_variant_id uuid, p_quantity integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.quick_add_stock(p_variant_id uuid, p_quantity integer) IS 'Quick function to add stock without IMEI/serial tracking.
Simplified version that uses variant default prices.

Example:
SELECT * FROM quick_add_stock(
    ''b4418cf0-7624-4238-8e98-7d1eb5986b28''::UUID,  -- variant_id
    4                                                -- quantity
);';


--
-- Name: recalculate_all_parent_quantities(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.recalculate_all_parent_quantities() RETURNS TABLE(parent_id uuid, parent_name text, old_quantity integer, new_quantity integer, difference integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH parent_updates AS (
    SELECT 
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
  SELECT 
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
    SELECT 
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
END;
$$;


--
-- Name: recalculate_all_parent_stocks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.recalculate_all_parent_stocks() RETURNS TABLE(parent_id uuid, parent_name text, old_quantity integer, new_quantity integer, children_count integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH parent_calcs AS (
    SELECT 
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
  SELECT 
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
    SELECT 
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
END;
$$;


--
-- Name: FUNCTION recalculate_all_parent_stocks(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.recalculate_all_parent_stocks() IS 'Recalculate all parent variant stocks (for fixing data inconsistencies)';


--
-- Name: recalculate_sale_total(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.recalculate_sale_total(p_sale_id uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_calculated_total NUMERIC(15, 2);
BEGIN
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
END;
$$;


--
-- Name: receive_quality_checked_items(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.receive_quality_checked_items(p_quality_check_id uuid, p_purchase_order_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_item RECORD;
  v_received_count INTEGER := 0;
BEGIN
  -- Update items that passed quality check
  FOR v_item IN 
    SELECT 
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
END;
$$;


--
-- Name: FUNCTION receive_quality_checked_items(p_quality_check_id uuid, p_purchase_order_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.receive_quality_checked_items(p_quality_check_id uuid, p_purchase_order_id uuid) IS 'Receives quality-checked items to inventory';


--
-- Name: record_expense_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.record_expense_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: reduce_variant_stock(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.reduce_variant_stock(p_variant_id uuid, p_quantity integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Reduce both quantity AND reserved_quantity
  -- This ensures the reservation is released during the transfer
  UPDATE lats_product_variants
  SET quantity = GREATEST(0, quantity - p_quantity),
      reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_quantity),
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Reduced % units from variant %', p_quantity, p_variant_id;
END;
$$;


--
-- Name: release_variant_stock(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.release_variant_stock(p_variant_id uuid, p_quantity integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Release the reserved stock (cannot go below 0)
  UPDATE lats_product_variants
  SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - p_quantity),
      updated_at = NOW()
  WHERE id = p_variant_id;

  RAISE NOTICE 'Released % units for variant %', p_quantity, p_variant_id;
END;
$$;


--
-- Name: repair_po_inventory_issues(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.repair_po_inventory_issues() RETURNS TABLE(po_id uuid, item_id uuid, issue text, action_taken text, success boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  po_record RECORD;
  item_record RECORD;
  inventory_needed INTEGER;
  i INTEGER;
BEGIN
  -- Process each PO with issues
  FOR po_record IN 
    SELECT DISTINCT poi.purchase_order_id, po.po_number, po.supplier_id, po.branch_id
    FROM lats_purchase_order_items poi
    JOIN lats_purchase_orders po ON po.id = poi.purchase_order_id
    WHERE po.status IN ('received', 'partial_received')
  LOOP
    FOR item_record IN
      SELECT 
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
END;
$$;


--
-- Name: rereceive_purchase_order(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.rereceive_purchase_order(purchase_order_id_param uuid, user_id_param uuid, notes text DEFAULT 'Re-receive to fix inventory issues'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Use the force_receive option to recalculate based on actual inventory
  RETURN complete_purchase_order_receive_v2(
    purchase_order_id_param, 
    user_id_param, 
    notes, 
    true  -- force_receive = true
  );
END;
$$;


--
-- Name: reserve_variant_stock(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.reserve_variant_stock(p_variant_id uuid, p_quantity integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
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
END;
$$;


--
-- Name: reverse_purchase_order_payment(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.reverse_purchase_order_payment(payment_id_param uuid, user_id_param uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
      BEGIN
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
      END;
      $$;


--
-- Name: FUNCTION reverse_purchase_order_payment(payment_id_param uuid, user_id_param uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.reverse_purchase_order_payment(payment_id_param uuid, user_id_param uuid) IS 'Reverses a purchase order payment, restoring balances, removing related records, and updating the purchase order totals.';


--
-- Name: rollback_transaction_if_exists(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.rollback_transaction_if_exists() RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY SELECT TRUE, 'No-op rollback (handled client-side)';
END;
$$;


--
-- Name: search_customers_fn(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.search_customers_fn(search_query text, page_number integer DEFAULT 1, page_size integer DEFAULT 50) RETURNS TABLE(id uuid, name text, phone text, email text, gender text, city text, country text, color_tag text, loyalty_level text, points integer, total_spent numeric, last_visit timestamp with time zone, is_active boolean, referral_source text, birth_month text, birth_day text, birthday date, initial_notes text, notes text, customer_tag text, location_description text, national_id text, joined_date date, created_at timestamp with time zone, updated_at timestamp with time zone, branch_id uuid, is_shared boolean, created_by_branch_id uuid, created_by_branch_name text, profile_image text, whatsapp text, whatsapp_opt_out boolean, referred_by uuid, created_by uuid, last_purchase_date timestamp with time zone, total_purchases integer, total_calls integer, total_call_duration_minutes numeric, incoming_calls integer, outgoing_calls integer, missed_calls integer, avg_call_duration_minutes numeric, first_call_date timestamp with time zone, last_call_date timestamp with time zone, call_loyalty_level text, total_returns integer, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
      DECLARE
        offset_val INTEGER;
        total_count_val BIGINT;
      BEGIN
        offset_val := (page_number - 1) * page_size;

        SELECT COUNT(*) INTO total_count_val
        FROM customers c
        WHERE
          c.name ILIKE '%' || search_query || '%'
          OR c.phone ILIKE '%' || search_query || '%'
          OR COALESCE(c.email, '') ILIKE '%' || search_query || '%'
          OR COALESCE(c.customer_tag, '') ILIKE '%' || search_query || '%';

        RETURN QUERY
        SELECT
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
      END;
      $$;


--
-- Name: set_customer_branch_on_create(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_customer_branch_on_create() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    branch_name TEXT;
BEGIN
    -- If branch_id is set but branch_name is not, fetch the branch name
    IF NEW.created_by_branch_id IS NOT NULL AND NEW.created_by_branch_name IS NULL THEN
        SELECT name INTO branch_name
        FROM store_locations
        WHERE id = NEW.created_by_branch_id;
        
        NEW.created_by_branch_name := branch_name;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: set_default_branch(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_default_branch() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- If branch_id is not set, try to get user's current branch from auth
  IF NEW.branch_id IS NULL THEN
    -- Try to get current user's branch (if the function exists)
    BEGIN
      NEW.branch_id := get_user_current_branch(auth.uid());
    EXCEPTION
      WHEN OTHERS THEN
        -- If function doesn't exist or fails, just leave branch_id as NULL
        NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: set_imei_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_imei_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.variant_type = 'imei_child' THEN
    NEW.variant_attributes = jsonb_set(NEW.variant_attributes, '{imei_status}', '"valid"');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_is_shared_on_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_is_shared_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_branch_settings RECORD;
BEGIN
  -- Only process if branch_id is set
  IF NEW.branch_id IS NOT NULL THEN
    -- Get the branch settings
    SELECT 
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
END;
$$;


--
-- Name: set_trade_in_contract_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_trade_in_contract_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
        NEW.contract_number := generate_trade_in_contract_number();
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: set_trade_in_transaction_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_trade_in_transaction_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
        NEW.transaction_number := generate_trade_in_transaction_number();
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: sync_category_sharing(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_category_sharing() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update categories based on their branch's share_categories setting
  UPDATE lats_categories c
  SET is_shared = s.share_categories
  FROM store_locations s
  WHERE c.branch_id = s.id
    AND c.branch_id IS NOT NULL;

  RAISE NOTICE 'Category sharing synced successfully';
END;
$$;


--
-- Name: sync_customer_payment_to_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_customer_payment_to_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_order_id TEXT;
BEGIN
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
END;
$$;


--
-- Name: sync_customer_sharing(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_customer_sharing() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update customers based on their branch's share_customers setting
  UPDATE customers c
  SET is_shared = s.share_customers
  FROM store_locations s
  WHERE c.branch_id = s.id
    AND c.branch_id IS NOT NULL;

  RAISE NOTICE 'Customer sharing synced successfully';
END;
$$;


--
-- Name: sync_employee_sharing(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_employee_sharing() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update employees based on their branch's share_employees setting
  -- OR if they have can_work_at_all_branches flag
  UPDATE employees e
  SET is_shared = COALESCE(e.can_work_at_all_branches, false) OR COALESCE(s.share_employees, false)
  FROM store_locations s
  WHERE e.branch_id = s.id
    AND e.branch_id IS NOT NULL;

  RAISE NOTICE 'Employee sharing synced successfully';
END;
$$;


--
-- Name: sync_finance_account_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_finance_account_columns() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: sync_imei_serial_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_imei_serial_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: sync_parent_variant_quantity_on_imei_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_parent_variant_quantity_on_imei_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_parent_id UUID;
  v_new_total INTEGER;
  v_existing_quantity INTEGER;
  v_imei_children_count INTEGER;
  v_old_imei_count INTEGER;
  v_imei_change INTEGER;
  v_product_id UUID;
BEGIN
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
END;
$$;


--
-- Name: sync_product_category(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_product_category() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.category_id IS NOT NULL THEN
        SELECT name INTO NEW.category
        FROM lats_categories
        WHERE id = NEW.category_id;
    ELSE
        NEW.category := 'Uncategorized';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: sync_product_sharing(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_product_sharing() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: sync_product_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_product_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: sync_product_stock_from_variants(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_product_stock_from_variants() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
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
END;
$$;


--
-- Name: sync_sale_to_payment_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_sale_to_payment_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_payment_type TEXT;
BEGIN
  -- Only process if sale has an amount
  IF NEW.total_amount > 0 THEN
    
    -- Get customer details if customer_id exists
    IF NEW.customer_id IS NOT NULL THEN
      SELECT name, email, phone 
      INTO v_customer_name, v_customer_email, v_customer_phone
      FROM customers 
      WHERE id = NEW.customer_id;
    END IF;
    
    -- Extract payment type from JSONB or use default
    -- payment_method is now JSONB like: {"type":"CRDB Bank","amount":100,"details":{...}}
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
        'payment_details', NEW.payment_method,  -- ✅ Store full JSONB details
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
      END;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_supplier_sharing(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_supplier_sharing() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update suppliers based on their branch's share_suppliers setting
  UPDATE lats_suppliers sp
  SET is_shared = s.share_suppliers
  FROM store_locations s
  WHERE sp.branch_id = s.id
    AND sp.branch_id IS NOT NULL;

  RAISE NOTICE 'Supplier sharing synced successfully';
END;
$$;


--
-- Name: sync_user_to_auth_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_user_to_auth_users() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
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
    END;
    $$;


--
-- Name: sync_variant_imei_serial_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_variant_imei_serial_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_identifier TEXT;
BEGIN
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
          COALESCE(NEW.variant_attributes, '{}'::jsonb),
          '{imei}',
          to_jsonb(v_identifier)
        ),
        '{serial_number}',
        to_jsonb(v_identifier)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_variant_prices(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_variant_prices() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- If selling_price is null or zero, copy from unit_price
    IF (NEW.selling_price IS NULL OR NEW.selling_price = 0) AND NEW.unit_price > 0 THEN
        NEW.selling_price := NEW.unit_price;
    END IF;
    
    -- If unit_price is null or zero, copy from selling_price
    IF (NEW.unit_price IS NULL OR NEW.unit_price = 0) AND NEW.selling_price > 0 THEN
        NEW.unit_price := NEW.selling_price;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: sync_variant_quantity_from_inventory(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_variant_quantity_from_inventory() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_variant_id UUID;
  v_available_count INTEGER;
  v_imei_children_count INTEGER;
  v_total_count INTEGER;
  v_is_parent BOOLEAN;
BEGIN
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
END;
$$;


--
-- Name: FUNCTION sync_variant_quantity_from_inventory(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.sync_variant_quantity_from_inventory() IS 'Automatically syncs lats_product_variants.quantity with count of available inventory_items AND IMEI child variants.
For parent variants: quantity = inventory_items count + IMEI children count
For regular variants: quantity = inventory_items count
Triggered when inventory items are inserted, updated (status/variant changes), or deleted.';


--
-- Name: test_add_imei_function(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.test_add_imei_function() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'add_imei_to_parent_variant'
  ) INTO func_exists;
  
  IF func_exists THEN
    RETURN '✅ Function add_imei_to_parent_variant exists and is ready to use!';
  ELSE
    RETURN '❌ Function does not exist';
  END IF;
END;
$$;


--
-- Name: test_payment_mirroring(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.test_payment_mirroring() RETURNS TABLE(test_name text, status text, message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    test_customer_id UUID;
    test_sale_id UUID;
    test_account_id UUID;
    test_payment_id UUID;
    account_balance_before NUMERIC;
    account_balance_after NUMERIC;
BEGIN
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
END;
$$;


--
-- Name: track_customer_activity(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.track_customer_activity(customer_id uuid, activity_type character varying DEFAULT 'general'::character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: track_po_payment_as_expense(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.track_po_payment_as_expense() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_po_reference TEXT;
      v_po_supplier TEXT;
      v_user_id UUID;
      v_branch_id UUID;
      v_default_branch_id UUID := '115e0e51-d0d6-437b-9fda-dfe11241b167'::uuid;
    BEGIN
      IF NEW.status = 'completed' THEN
        
        -- Get PO details
        SELECT 
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
        
        BEGIN
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
        END;
        
      END IF;
      
      RETURN NEW;
    END;
    $$;


--
-- Name: track_variant_data_source(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.track_variant_data_source() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Add metadata about data source if not already present
    IF NEW.variant_attributes IS NULL THEN
        NEW.variant_attributes := '{}'::jsonb;
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
END;
$$;


--
-- Name: FUNCTION track_variant_data_source(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.track_variant_data_source() IS 'Tracks the origin of variant data (PO, manual, import, etc.)';


--
-- Name: trigger_auto_reorder_check(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.trigger_auto_reorder_check() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_po_id UUID;
  v_recent_po UUID;
  v_product_name TEXT;
BEGIN
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
END;
$$;


--
-- Name: update_account_balance_secure(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_account_balance_secure() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  current_balance DECIMAL(15,2);
  calculated_balance_before DECIMAL(15,2);
  new_balance DECIMAL(15,2);
  last_transaction_balance DECIMAL(15,2) := 0;
BEGIN
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
END;
$$;


--
-- Name: update_api_keys_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_api_keys_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_branch_transfer_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_branch_transfer_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_customer_activity(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_customer_activity(customer_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: update_customer_installment_plan_balance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_customer_installment_plan_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: update_customer_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_customer_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_daily_reports_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_daily_reports_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_daily_sales_closures_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_daily_sales_closures_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_document_templates_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_document_templates_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_installment_plan_balance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_installment_plan_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_paid NUMERIC;
    v_balance_due NUMERIC;
    v_installments_paid INTEGER;
    v_total_installments INTEGER;
    v_total_amount NUMERIC;
    v_all_paid BOOLEAN;
BEGIN
    -- Calculate totals from all payments
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM installment_payments
    WHERE installment_plan_id = NEW.installment_plan_id;
    
    -- Get plan details
    SELECT total_amount, number_of_installments INTO v_total_amount, v_total_installments
    FROM customer_installment_plans
    WHERE id = NEW.installment_plan_id;
    
    -- Calculate balance due: total_amount - total_paid (because total_paid includes down payment)
    v_balance_due := v_total_amount - v_total_paid;
    
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
END;
$$;


--
-- Name: FUNCTION update_installment_plan_balance(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_installment_plan_balance() IS 'Updates installment plan balance and status. Balance due is calculated as total_amount - total_paid (not amount_financed - total_paid) because total_paid includes the down payment. Only marks as completed when ALL installments are paid AND balance is zero.';


--
-- Name: update_inventory_items_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_inventory_items_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_inventory_setting(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_inventory_setting(key_name text, new_value text, reason text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  old_val TEXT;
  user_id TEXT;
BEGIN
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
END;
$$;


--
-- Name: update_lats_suppliers_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_lats_suppliers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_notifications_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_notifications_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_parent_quantity_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_parent_quantity_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_parent_id UUID;
    v_product_id UUID;
BEGIN
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
END;
$$;


--
-- Name: update_parent_stock_from_children(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_parent_stock_from_children() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_parent_id UUID;
  v_new_total INT;
  v_product_id UUID;
BEGIN
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
END;
$$;


--
-- Name: FUNCTION update_parent_stock_from_children(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_parent_stock_from_children() IS 'Trigger function to auto-update parent stock when children change';


--
-- Name: update_po_payments_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_po_payments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_po_shipping_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_po_shipping_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_product_images_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_product_images_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_product_totals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_product_totals() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
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
    END;
    $$;


--
-- Name: FUNCTION update_product_totals(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_product_totals() IS 'Automatically updates product total_quantity and total_value when variants change';


--
-- Name: update_product_variant_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_product_variant_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE lats_products
    SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{variantCount}',
        to_jsonb((SELECT COUNT(*) FROM lats_product_variants WHERE product_id = COALESCE(NEW.product_id, OLD.product_id))::integer)
    )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_purchase_order_payment_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_purchase_order_payment_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  order_total DECIMAL(15,2);
  total_payments DECIMAL(15,2);
  new_payment_status TEXT;
BEGIN
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
END;
$$;


--
-- Name: update_purchase_order_payments_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_purchase_order_payments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_reminders_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_reminders_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_reports_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_reports_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_returns_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_returns_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_scheduled_messages_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_scheduled_messages_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_scheduled_transfers_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_scheduled_transfers_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_shipping_agents_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_shipping_agents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_shipping_methods_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_shipping_methods_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_shipping_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_shipping_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_special_order_balance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_special_order_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
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
END;
$$;


--
-- Name: update_store_locations_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_store_locations_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_supplier_average_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_supplier_average_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE lats_suppliers
  SET average_rating = (
    SELECT AVG(overall_rating)::NUMERIC(3,2)
    FROM lats_supplier_ratings
    WHERE supplier_id = NEW.supplier_id
  )
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_supplier_last_contact(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_supplier_last_contact() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE lats_suppliers
  SET last_contact_date = CURRENT_DATE
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_supplier_on_time_delivery(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_supplier_on_time_delivery() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  total_completed INTEGER;
  on_time_completed INTEGER;
  delivery_rate NUMERIC;
BEGIN
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
END;
$$;


--
-- Name: FUNCTION update_supplier_on_time_delivery(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_supplier_on_time_delivery() IS 'Automatically calculates on-time delivery rate when POs are completed';


--
-- Name: update_supplier_order_value(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_supplier_order_value() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update total order value for the supplier
  UPDATE lats_suppliers
  SET total_order_value = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM lats_purchase_orders
    WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
  )
  WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: FUNCTION update_supplier_order_value(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_supplier_order_value() IS 'Automatically updates supplier total_order_value when POs change';


--
-- Name: update_supplier_response_time(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_supplier_response_time() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  avg_response_hours NUMERIC;
BEGIN
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
END;
$$;


--
-- Name: FUNCTION update_supplier_response_time(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_supplier_response_time() IS 'Automatically calculates average response time from communications';


--
-- Name: update_supplier_total_orders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_supplier_total_orders() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update total orders count for the supplier
  UPDATE lats_suppliers
  SET total_orders = (
    SELECT COUNT(*)
    FROM lats_purchase_orders
    WHERE supplier_id = NEW.supplier_id
  )
  WHERE id = NEW.supplier_id;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_supplier_total_orders(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_supplier_total_orders() IS 'Automatically updates supplier total_orders count when POs are created';


--
-- Name: update_trade_in_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_trade_in_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_user_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$;


--
-- Name: update_user_whatsapp_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_user_whatsapp_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_variant_stock_on_movement(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_variant_stock_on_movement() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_should_calculate BOOLEAN := true;
    v_is_reversal BOOLEAN := false;
BEGIN
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
END;
$$;


--
-- Name: update_webhook_endpoints_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_webhook_endpoints_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_whatsapp_sessions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_whatsapp_sessions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: validate_all_imeis(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_all_imeis() RETURNS TABLE(variant_id uuid, imei text, is_valid boolean, issue text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
END;
$$;


--
-- Name: validate_and_repair_account_balances(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_and_repair_account_balances() RETURNS TABLE(acc_id uuid, issues_found integer, transactions_repaired integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  account_record RECORD;
  txn_record RECORD;
  running_balance DECIMAL(15,2) := 0;
  issues_count INTEGER := 0;
  repair_count INTEGER := 0;
BEGIN
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
  
END;
$$;


--
-- Name: validate_and_set_imei_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_and_set_imei_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only for imei_child variants
    IF NEW.variant_type = 'imei_child' THEN
        -- Ensure variant_attributes is initialized
        IF NEW.variant_attributes IS NULL THEN
            NEW.variant_attributes := '{}'::jsonb;
        END IF;
        
        -- If IMEI is provided but status is not set, set it to 'valid'
        IF NEW.variant_attributes->>'imei' IS NOT NULL 
           AND NEW.variant_attributes->>'imei' != ''
           AND (NEW.variant_attributes->>'imei_status' IS NULL 
                OR NEW.variant_attributes->>'imei_status' = '') THEN
            NEW.variant_attributes := jsonb_set(
                NEW.variant_attributes,
                '{imei_status}',
                '"valid"'::jsonb
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: validate_imei_format(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_imei_format(imei_value text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
BEGIN
  RETURN imei_value ~ '^\d{15}$';
END;
$_$;


--
-- Name: validate_new_imei(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_new_imei() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_imei TEXT;
  v_serial_number TEXT;
  v_identifier TEXT; -- Unified IMEI/Serial Number
BEGIN
  -- Only for imei_child variants
  IF NEW.variant_type = 'imei_child' THEN
      -- Get IMEI/Serial Number from variant_attributes (they're the same now)
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
                RAISE EXCEPTION 'Duplicate IMEI/Serial Number: %', v_identifier;
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
                RAISE EXCEPTION 'Duplicate IMEI/Serial Number: %', v_identifier;
            END IF;
          END IF;
      END IF;
      -- ✅ Allow NULL or empty IMEI/Serial Number (for flexibility)
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validate_po_inventory_consistency(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_po_inventory_consistency() RETURNS TABLE(po_id uuid, item_id uuid, issues_found text, repair_action text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  po_record RECORD;
  item_record RECORD;
BEGIN
  -- Check each PO item for consistency
  FOR po_record IN 
    SELECT id, po_number, status FROM lats_purchase_orders 
    WHERE status IN ('received', 'partial_received')
    ORDER BY created_at DESC
  LOOP
    FOR item_record IN
      SELECT 
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
END;
$$;


--
-- Name: validate_sale_amount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_sale_amount() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF NEW.total_amount < 0 THEN
          RAISE EXCEPTION 'Sale total cannot be negative: %', NEW.total_amount;
        END IF;
        
        IF NEW.total_amount > 1000000000 THEN
          RAISE EXCEPTION 'Sale total is unreasonably large: %. Max allowed is 1 billion', NEW.total_amount;
        END IF;
        
        RETURN NEW;
      END;
      $$;


--
-- Name: validate_variant_price(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_variant_price() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Warn if both prices are zero/null
    IF (NEW.unit_price IS NULL OR NEW.unit_price <= 0) 
       AND (NEW.selling_price IS NULL OR NEW.selling_price <= 0) THEN
        RAISE WARNING 'Variant % for product % has no valid price!', NEW.name, NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: validate_variant_prices(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_variant_prices() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_old_cost NUMERIC;
    v_old_price NUMERIC;
    v_has_po BOOLEAN;
BEGIN
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
END;
$$;


--
-- Name: FUNCTION validate_variant_prices(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_variant_prices() IS 'Validates variant prices and prevents suspicious data entries';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users_sync; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE IF NOT EXISTS neon_auth.users_sync (
    raw_json jsonb NOT NULL,
    id text GENERATED ALWAYS AS ((raw_json ->> 'id'::text)) STORED NOT NULL,
    name text GENERATED ALWAYS AS ((raw_json ->> 'display_name'::text)) STORED,
    email text GENERATED ALWAYS AS ((raw_json ->> 'primary_email'::text)) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (to_timestamp((trunc((((raw_json ->> 'signed_up_at_millis'::text))::bigint)::double precision) / (1000)::double precision))) STORED,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: account_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.account_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    transaction_type text NOT NULL,
    amount numeric NOT NULL,
    balance_before numeric DEFAULT 0,
    balance_after numeric DEFAULT 0,
    reference_number text,
    description text,
    related_transaction_id uuid,
    metadata jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    related_entity_type character varying(50),
    related_entity_id uuid,
    branch_id uuid,
    status text DEFAULT 'approved'::text,
    CONSTRAINT account_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text]))),
    CONSTRAINT balance_after_not_null CHECK ((balance_after IS NOT NULL)),
    CONSTRAINT balance_before_not_null CHECK ((balance_before IS NOT NULL))
);


--
-- Name: COLUMN account_transactions.related_entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account_transactions.related_entity_type IS 'Type of entity that created this transaction (e.g., purchase_order_payment, sale, expense, transfer)';


--
-- Name: COLUMN account_transactions.related_entity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account_transactions.related_entity_id IS 'UUID of the specific entity that created this transaction';


--
-- Name: COLUMN account_transactions.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account_transactions.branch_id IS 'Branch ID for data isolation - references store_locations.id';


--
-- Name: COLUMN account_transactions.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account_transactions.status IS 'Approval status for transactions requiring approval (pending, approved, rejected, cancelled)';


--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category character varying(50) NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    setting_type character varying(20) DEFAULT 'string'::character varying,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_settings_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.admin_settings_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category character varying(50) NOT NULL,
    setting_key character varying(100) NOT NULL,
    old_value text,
    new_value text,
    changed_by text,
    change_reason text,
    changed_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    key text NOT NULL,
    scopes text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    last_used timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_request_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.api_request_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    api_key_id uuid,
    endpoint text NOT NULL,
    method text NOT NULL,
    ip_address text,
    user_agent text,
    response_status integer,
    response_time_ms integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    device_id uuid,
    technician_id uuid,
    appointment_date timestamp with time zone NOT NULL,
    duration_minutes integer DEFAULT 60,
    status text DEFAULT 'scheduled'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    service_type text,
    appointment_time text DEFAULT '00:00:00'::text,
    customer_name text,
    customer_phone text,
    technician_name text,
    priority text DEFAULT 'normal'::text,
    created_by uuid,
    branch_id uuid
);


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    attendance_date date NOT NULL,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
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
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    table_name text,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    details text,
    entity_type text,
    entity_id uuid,
    user_role text,
    "timestamp" timestamp with time zone,
    category character varying(50),
    description text,
    old_values jsonb,
    new_values jsonb,
    user_name character varying(255),
    branch_id uuid,
    branch_name character varying(255),
    metadata jsonb
);


--
-- Name: auth_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.auth_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    username text,
    name text,
    role text DEFAULT 'technician'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    permissions text[],
    max_devices_allowed integer DEFAULT 10,
    require_approval boolean DEFAULT false,
    failed_login_attempts integer DEFAULT 0,
    two_factor_enabled boolean DEFAULT false,
    two_factor_secret text,
    last_login timestamp with time zone,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);


--
-- Name: COLUMN auth_users.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auth_users.branch_id IS 'References the branch this auth user belongs to for multi-branch isolation';


--
-- Name: auto_reorder_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.auto_reorder_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    supplier_id uuid,
    triggered_quantity integer NOT NULL,
    reorder_point integer NOT NULL,
    suggested_quantity integer NOT NULL,
    purchase_order_id uuid,
    po_created boolean DEFAULT false,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    sku text,
    barcode text,
    quantity integer DEFAULT 0,
    min_quantity integer DEFAULT 5,
    unit_price numeric DEFAULT 0,
    cost_price numeric DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    name text DEFAULT 'Default Variant'::text NOT NULL,
    selling_price numeric(12,2) DEFAULT 0,
    attributes jsonb DEFAULT '{}'::jsonb,
    weight numeric(10,2),
    dimensions jsonb,
    variant_name text,
    variant_attributes jsonb DEFAULT '{}'::jsonb,
    branch_id uuid NOT NULL,
    stock_per_branch jsonb DEFAULT '{}'::jsonb,
    is_shared boolean DEFAULT true,
    visible_to_branches uuid[],
    sharing_mode text DEFAULT 'isolated'::text,
    reserved_quantity integer DEFAULT 0,
    reorder_point integer DEFAULT 0,
    parent_variant_id uuid,
    is_parent boolean DEFAULT false,
    variant_type character varying(20) DEFAULT 'standard'::character varying,
    status text DEFAULT 'active'::text,
    CONSTRAINT check_imei_format CHECK ((((variant_type)::text <> 'imei_child'::text) OR ((variant_attributes ->> 'imei'::text) IS NULL) OR ((variant_attributes ->> 'imei'::text) <> ''::text))),
    CONSTRAINT check_non_negative_quantity CHECK ((quantity >= 0)),
    CONSTRAINT lats_product_variants_branch_id_not_null CHECK ((branch_id IS NOT NULL)),
    CONSTRAINT lats_product_variants_sharing_mode_check CHECK ((sharing_mode = ANY (ARRAY['isolated'::text, 'shared'::text, 'custom'::text]))),
    CONSTRAINT lats_product_variants_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'discontinued'::text, 'pending'::text, 'draft'::text])))
);


--
-- Name: TABLE lats_product_variants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_product_variants IS 'Product variants with parent-child IMEI tracking';


--
-- Name: COLUMN lats_product_variants.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_product_variants.branch_id IS 'Branch/store where this variant stock is located';


--
-- Name: COLUMN lats_product_variants.is_shared; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_product_variants.is_shared IS 'When true, this variant is visible to all branches regardless of branch_id';


--
-- Name: COLUMN lats_product_variants.visible_to_branches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_product_variants.visible_to_branches IS 'Array of branch IDs that can see this variant (NULL means all)';


--
-- Name: COLUMN lats_product_variants.sharing_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_product_variants.sharing_mode IS 'isolated: only owner branch, shared: all branches, custom: specific branches';


--
-- Name: COLUMN lats_product_variants.parent_variant_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_product_variants.parent_variant_id IS 'Reference to parent variant for IMEI children';


--
-- Name: COLUMN lats_product_variants.is_parent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_product_variants.is_parent IS 'TRUE if this variant has child IMEI variants';


--
-- Name: COLUMN lats_product_variants.variant_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_product_variants.variant_type IS 'Type: standard, parent, or imei_child';


--
-- Name: lats_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    sku text,
    barcode text,
    category_id uuid,
    unit_price numeric DEFAULT 0,
    cost_price numeric DEFAULT 0,
    stock_quantity integer DEFAULT 0,
    min_stock_level integer DEFAULT 0,
    max_stock_level integer DEFAULT 1000,
    is_active boolean DEFAULT true,
    image_url text,
    supplier_id uuid,
    brand text,
    model text,
    warranty_period integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    specification text,
    condition text DEFAULT 'new'::text,
    selling_price numeric(12,2) DEFAULT 0,
    tags jsonb DEFAULT '[]'::jsonb,
    total_quantity integer DEFAULT 0,
    total_value numeric(12,2) DEFAULT 0,
    storage_room_id uuid,
    store_shelf_id uuid,
    attributes jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    branch_id uuid,
    is_shared boolean DEFAULT true,
    visible_to_branches uuid[],
    sharing_mode text DEFAULT 'isolated'::text,
    shelf_id uuid,
    category text,
    CONSTRAINT lats_products_condition_check CHECK ((condition = ANY (ARRAY['new'::text, 'used'::text, 'refurbished'::text]))),
    CONSTRAINT lats_products_sharing_mode_check CHECK ((sharing_mode = ANY (ARRAY['isolated'::text, 'shared'::text, 'custom'::text])))
);


--
-- Name: COLUMN lats_products.storage_room_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_products.storage_room_id IS 'Reference to the storage room where this product is stored';


--
-- Name: COLUMN lats_products.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_products.branch_id IS 'Branch/store where this product is primarily managed';


--
-- Name: COLUMN lats_products.is_shared; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_products.is_shared IS 'When true, this product is visible to all branches regardless of branch_id';


--
-- Name: COLUMN lats_products.visible_to_branches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_products.visible_to_branches IS 'Array of branch IDs that can see this product (NULL means all)';


--
-- Name: COLUMN lats_products.sharing_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_products.sharing_mode IS 'isolated: only owner branch, shared: all branches, custom: specific branches';


--
-- Name: COLUMN lats_products.shelf_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_products.shelf_id IS 'Reference to the specific shelf where this product is stored';


--
-- Name: lats_purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_number text NOT NULL,
    supplier_id uuid,
    status text DEFAULT 'pending'::text,
    total_amount numeric DEFAULT 0,
    notes text,
    order_date timestamp with time zone DEFAULT now(),
    expected_delivery_date timestamp with time zone,
    received_date timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tax_amount numeric DEFAULT 0,
    shipping_cost numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    final_amount numeric DEFAULT 0,
    approved_by uuid,
    currency text DEFAULT 'TZS'::text,
    total_paid numeric DEFAULT 0,
    payment_status text DEFAULT 'unpaid'::text,
    expected_delivery timestamp with time zone,
    branch_id uuid,
    payment_terms text,
    exchange_rate numeric(10,6) DEFAULT 1.0,
    base_currency text DEFAULT 'TZS'::text,
    exchange_rate_source text DEFAULT 'manual'::text,
    exchange_rate_date timestamp with time zone DEFAULT now(),
    total_amount_base_currency numeric,
    CONSTRAINT lats_purchase_orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'partial'::text, 'paid'::text]))),
    CONSTRAINT lats_purchase_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'sent'::text, 'confirmed'::text, 'shipped'::text, 'partial_received'::text, 'received'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN lats_purchase_orders.po_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_orders.po_number IS 'Unique purchase order number (e.g., PO-1762913812737). This is the primary order identifier displayed to users.';


--
-- Name: COLUMN lats_purchase_orders.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_orders.branch_id IS 'Branch receiving this purchase order';


--
-- Name: COLUMN lats_purchase_orders.payment_terms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_orders.payment_terms IS 'Payment terms agreed with the supplier (e.g., Net 30, Net 60, COD)';


--
-- Name: COLUMN lats_purchase_orders.exchange_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_orders.exchange_rate IS 'Exchange rate from purchase currency to base currency at time of PO creation';


--
-- Name: COLUMN lats_purchase_orders.base_currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_orders.base_currency IS 'Base currency for the business (typically TZS)';


--
-- Name: COLUMN lats_purchase_orders.exchange_rate_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_orders.exchange_rate_source IS 'Source of exchange rate (manual, api, bank, etc.)';


--
-- Name: COLUMN lats_purchase_orders.exchange_rate_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_orders.exchange_rate_date IS 'Date when the exchange rate was applied';


--
-- Name: COLUMN lats_purchase_orders.total_amount_base_currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_orders.total_amount_base_currency IS 'Total amount converted to base currency (TZS)';


--
-- Name: lats_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_person text,
    email text,
    phone text,
    address text,
    city text,
    country text,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    is_shared boolean DEFAULT true,
    is_trade_in_customer boolean DEFAULT false,
    company_name text,
    description text,
    whatsapp text,
    tax_id text,
    payment_terms text,
    rating numeric,
    preferred_currency text DEFAULT 'TZS'::text,
    exchange_rate numeric,
    wechat text,
    credit_limit numeric(15,2) DEFAULT 0,
    current_balance numeric(15,2) DEFAULT 0,
    payment_days integer DEFAULT 30,
    discount_percentage numeric(5,2) DEFAULT 0,
    website_url text,
    logo_url text,
    business_registration text,
    business_type text,
    year_established integer,
    employee_count text,
    linkedin_url text,
    facebook_url text,
    instagram_url text,
    minimum_order_quantity integer,
    lead_time_days integer,
    warehouse_location text,
    shipping_methods text[],
    delivery_zones text[],
    certifications text[],
    quality_standards text,
    return_policy text,
    warranty_terms text,
    total_orders integer DEFAULT 0,
    total_order_value numeric(15,2) DEFAULT 0,
    average_rating numeric(3,2) DEFAULT 0,
    on_time_delivery_rate numeric(5,2) DEFAULT 0,
    quality_score numeric(5,2) DEFAULT 0,
    response_time_hours numeric(10,2),
    business_hours text,
    language_preferences text[],
    time_zone text,
    last_contact_date date,
    next_follow_up_date date,
    is_favorite boolean DEFAULT false,
    internal_notes text,
    priority_level text DEFAULT 'standard'::text,
    wechat_qr_code text,
    alipay_qr_code text,
    bank_account_details text,
    CONSTRAINT lats_suppliers_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);


--
-- Name: COLUMN lats_suppliers.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.name IS 'Supplier name (required)';


--
-- Name: COLUMN lats_suppliers.contact_person; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.contact_person IS 'Primary contact person(s) at supplier - stored as text with names and phone numbers';


--
-- Name: COLUMN lats_suppliers.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.email IS 'Primary email address';


--
-- Name: COLUMN lats_suppliers.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.phone IS 'Primary phone number';


--
-- Name: COLUMN lats_suppliers.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.address IS 'Full street address (can include GPS coordinates)';


--
-- Name: COLUMN lats_suppliers.city; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.city IS 'City name with autocomplete suggestions';


--
-- Name: COLUMN lats_suppliers.country; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.country IS 'Country (Tanzania, USA, UAE, China)';


--
-- Name: COLUMN lats_suppliers.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.is_active IS 'Whether supplier is currently active';


--
-- Name: COLUMN lats_suppliers.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.notes IS 'Additional notes including product categories and payment information';


--
-- Name: COLUMN lats_suppliers.is_shared; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.is_shared IS 'When true, this supplier is visible to all branches regardless of branch_id';


--
-- Name: COLUMN lats_suppliers.is_trade_in_customer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.is_trade_in_customer IS 'Flag to distinguish trade-in customers from real suppliers';


--
-- Name: COLUMN lats_suppliers.company_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.company_name IS 'Official registered company name';


--
-- Name: COLUMN lats_suppliers.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.description IS 'Brief description of supplier products/services';


--
-- Name: COLUMN lats_suppliers.whatsapp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.whatsapp IS 'WhatsApp number for direct communication';


--
-- Name: COLUMN lats_suppliers.tax_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.tax_id IS 'Tax identification number';


--
-- Name: COLUMN lats_suppliers.payment_terms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.payment_terms IS 'Payment terms (e.g., Net 30, Cash on Delivery)';


--
-- Name: COLUMN lats_suppliers.preferred_currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.preferred_currency IS 'Preferred currency (TZS, USD, EUR, CNY, AED) - auto-set based on country';


--
-- Name: COLUMN lats_suppliers.exchange_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.exchange_rate IS 'Exchange rate from preferred currency to base currency (TZS)';


--
-- Name: COLUMN lats_suppliers.wechat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.wechat IS 'WeChat ID for Chinese suppliers';


--
-- Name: COLUMN lats_suppliers.credit_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.credit_limit IS 'Maximum credit allowed for this supplier';


--
-- Name: COLUMN lats_suppliers.current_balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.current_balance IS 'Current outstanding balance';


--
-- Name: COLUMN lats_suppliers.is_favorite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.is_favorite IS 'Flag for quick access to frequently used suppliers';


--
-- Name: COLUMN lats_suppliers.priority_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.priority_level IS 'Supplier priority: premium, standard, or budget';


--
-- Name: COLUMN lats_suppliers.wechat_qr_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.wechat_qr_code IS 'WeChat Pay QR code stored as base64 image string for Chinese suppliers';


--
-- Name: COLUMN lats_suppliers.alipay_qr_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.alipay_qr_code IS 'Alipay QR code stored as base64 image string for Chinese suppliers';


--
-- Name: COLUMN lats_suppliers.bank_account_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_suppliers.bank_account_details IS 'Bank account details including account number, SWIFT code, bank name, etc.';


--
-- Name: auto_reorder_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.auto_reorder_status AS
 SELECT p.name AS product_name,
    pv.sku,
    pv.quantity AS current_stock,
    pv.reorder_point,
    (pv.quantity - pv.reorder_point) AS stock_buffer,
        CASE
            WHEN (pv.quantity <= 0) THEN 'OUT_OF_STOCK'::text
            WHEN (pv.quantity <= pv.reorder_point) THEN 'BELOW_REORDER_POINT'::text
            WHEN ((pv.quantity)::numeric <= ((pv.reorder_point)::numeric * 1.5)) THEN 'LOW_STOCK_WARNING'::text
            ELSE 'OK'::text
        END AS stock_status,
    arl.purchase_order_id AS latest_auto_po_id,
    arl.created_at AS latest_auto_po_date,
    po.status AS latest_po_status,
    s.name AS supplier_name
   FROM ((((public.lats_product_variants pv
     JOIN public.lats_products p ON ((p.id = pv.product_id)))
     LEFT JOIN LATERAL ( SELECT auto_reorder_log.id,
            auto_reorder_log.product_id,
            auto_reorder_log.variant_id,
            auto_reorder_log.supplier_id,
            auto_reorder_log.triggered_quantity,
            auto_reorder_log.reorder_point,
            auto_reorder_log.suggested_quantity,
            auto_reorder_log.purchase_order_id,
            auto_reorder_log.po_created,
            auto_reorder_log.error_message,
            auto_reorder_log.created_at
           FROM public.auto_reorder_log
          WHERE (auto_reorder_log.variant_id = pv.id)
          ORDER BY auto_reorder_log.created_at DESC
         LIMIT 1) arl ON (true))
     LEFT JOIN public.lats_purchase_orders po ON ((po.id = arl.purchase_order_id)))
     LEFT JOIN public.lats_suppliers s ON ((s.id = po.supplier_id)))
  WHERE ((pv.reorder_point > 0) AND (p.is_active = true))
  ORDER BY
        CASE
            WHEN (pv.quantity <= 0) THEN 1
            WHEN (pv.quantity <= pv.reorder_point) THEN 2
            WHEN ((pv.quantity)::numeric <= ((pv.reorder_point)::numeric * 1.5)) THEN 3
            ELSE 4
        END, p.name;


--
-- Name: backup_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.backup_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    backup_type text NOT NULL,
    status text DEFAULT 'pending'::text,
    file_path text,
    file_size bigint,
    record_count integer,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    error_message text,
    created_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT backup_logs_backup_type_check CHECK ((backup_type = ANY (ARRAY['full'::text, 'incremental'::text, 'manual'::text, 'scheduled'::text]))),
    CONSTRAINT backup_logs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: TABLE backup_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.backup_logs IS 'Database backup operation logs';


--
-- Name: branch_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.branch_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    user_id uuid,
    action_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: branch_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.branch_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_branch_id uuid NOT NULL,
    to_branch_id uuid NOT NULL,
    transfer_type text DEFAULT 'stock'::text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    quantity integer,
    status text DEFAULT 'pending'::text,
    requested_by uuid,
    approved_by uuid,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    requested_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    rejection_reason text,
    CONSTRAINT branch_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'in_transit'::text, 'completed'::text, 'rejected'::text, 'cancelled'::text]))),
    CONSTRAINT branch_transfers_transfer_type_check CHECK ((transfer_type = ANY (ARRAY['stock'::text, 'customer'::text, 'product'::text])))
);


--
-- Name: TABLE branch_transfers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.branch_transfers IS 'Manages stock transfers between branches';


--
-- Name: COLUMN branch_transfers.from_branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch_transfers.from_branch_id IS 'Source branch for the transfer';


--
-- Name: COLUMN branch_transfers.to_branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch_transfers.to_branch_id IS 'Destination branch for the transfer';


--
-- Name: COLUMN branch_transfers.transfer_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch_transfers.transfer_type IS 'Type of transfer: stock, customer, or product';


--
-- Name: COLUMN branch_transfers.entity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch_transfers.entity_id IS 'ID of the product/variant being transferred';


--
-- Name: COLUMN branch_transfers.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch_transfers.status IS 'Transfer status: pending, approved, in_transit, completed, rejected, cancelled';


--
-- Name: bulk_message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.bulk_message_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    branch_id uuid,
    name character varying(255) NOT NULL,
    description text,
    message_type character varying(20) NOT NULL,
    content text NOT NULL,
    category character varying(50),
    tags text[],
    media_url text,
    media_type character varying(20),
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    is_active boolean DEFAULT true,
    is_favorite boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bulk_message_templates_message_type_check CHECK (((message_type)::text = ANY ((ARRAY['sms'::character varying, 'whatsapp'::character varying, 'both'::character varying])::text[])))
);


--
-- Name: TABLE bulk_message_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bulk_message_templates IS 'Reusable message templates for bulk sending';


--
-- Name: buyer_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.buyer_details (
    buyer_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    buying_messages integer DEFAULT 0,
    unique_keywords integer DEFAULT 0,
    keywords_found text,
    first_inquiry_date timestamp without time zone,
    last_inquiry_date timestamp without time zone,
    buying_score integer DEFAULT 0,
    buyer_tier text,
    sample_message text,
    conversion_status text DEFAULT 'pending'::text,
    last_contacted timestamp without time zone,
    notes text
);


--
-- Name: buyer_details_buyer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.buyer_details_buyer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: buyer_details_buyer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.buyer_details_buyer_id_seq OWNED BY public.buyer_details.buyer_id;


--
-- Name: campaign_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.campaign_notifications (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    campaign_id text,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE campaign_notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.campaign_notifications IS 'In-app notifications for campaign status updates';


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    parent_id uuid,
    branch_id uuid,
    is_shared boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    sender_id uuid,
    sender_type text,
    recipient_id uuid,
    recipient_type text,
    message_text text NOT NULL,
    message_type text DEFAULT 'text'::text,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: communication_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.communication_log (
    log_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    communication_type text,
    direction text,
    subject text,
    notes text,
    contacted_by text,
    contact_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    follow_up_required integer DEFAULT 0,
    follow_up_date timestamp without time zone
);


--
-- Name: communication_log_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.communication_log_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: communication_log_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.communication_log_log_id_seq OWNED BY public.communication_log.log_id;


--
-- Name: communication_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.communication_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name text NOT NULL,
    template_type text NOT NULL,
    subject text,
    body text NOT NULL,
    variables jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: contact_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.contact_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    contact_type text NOT NULL,
    contact_method text,
    contact_subject text,
    contact_notes text,
    contacted_by uuid,
    contacted_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: contact_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.contact_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    method_type text NOT NULL,
    contact_value text NOT NULL,
    is_primary boolean DEFAULT false,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: contact_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.contact_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    preference_type text NOT NULL,
    preference_value jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    checkin_date timestamp with time zone DEFAULT now(),
    checkout_date timestamp with time zone,
    purpose text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    staff_id uuid
);


--
-- Name: customer_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    type text,
    message text,
    status text,
    phone_number text,
    sent_by uuid,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE customer_communications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_communications IS 'Tracks all communications with customers (SMS, WhatsApp, calls, emails)';


--
-- Name: customer_fix_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_fix_backup (
    backup_id integer NOT NULL,
    backup_timestamp timestamp with time zone DEFAULT now(),
    customer_id uuid,
    customer_name text,
    customer_phone text,
    old_total_spent numeric,
    new_total_spent numeric,
    old_points integer,
    new_points integer,
    old_loyalty_level text,
    new_loyalty_level text,
    sale_number text,
    fix_reason text
);


--
-- Name: customer_fix_backup_backup_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_fix_backup_backup_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_fix_backup_backup_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_fix_backup_backup_id_seq OWNED BY public.customer_fix_backup.backup_id;


--
-- Name: customer_installment_plan_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_installment_plan_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    installment_plan_id uuid,
    customer_id uuid,
    installment_number integer NOT NULL,
    amount numeric NOT NULL,
    payment_method text NOT NULL,
    payment_date timestamp with time zone DEFAULT now(),
    due_date date NOT NULL,
    status text DEFAULT 'paid'::text,
    days_late integer DEFAULT 0,
    late_fee numeric DEFAULT 0,
    account_id uuid,
    reference_number text,
    notification_sent boolean DEFAULT false,
    notification_sent_at timestamp with time zone,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_installment_plan_payments_status_check CHECK ((status = ANY (ARRAY['paid'::text, 'pending'::text, 'late'::text, 'waived'::text])))
);


--
-- Name: TABLE customer_installment_plan_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_installment_plan_payments IS 'Individual payments made towards customer installment plans';


--
-- Name: customer_installment_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_installment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_number text NOT NULL,
    customer_id uuid,
    sale_id uuid,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    total_amount numeric NOT NULL,
    down_payment numeric DEFAULT 0,
    amount_financed numeric NOT NULL,
    total_paid numeric DEFAULT 0,
    balance_due numeric NOT NULL,
    installment_amount numeric NOT NULL,
    number_of_installments integer NOT NULL,
    installments_paid integer DEFAULT 0,
    payment_frequency text DEFAULT 'monthly'::text,
    start_date date NOT NULL,
    next_payment_date date NOT NULL,
    end_date date NOT NULL,
    completion_date date,
    status text DEFAULT 'active'::text,
    late_fee_amount numeric DEFAULT 0,
    late_fee_applied numeric DEFAULT 0,
    days_overdue integer DEFAULT 0,
    last_reminder_sent timestamp with time zone,
    reminder_count integer DEFAULT 0,
    terms_accepted boolean DEFAULT true,
    terms_accepted_date timestamp with time zone DEFAULT now(),
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_installment_plans_payment_frequency_check CHECK ((payment_frequency = ANY (ARRAY['weekly'::text, 'bi_weekly'::text, 'monthly'::text, 'custom'::text]))),
    CONSTRAINT customer_installment_plans_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'defaulted'::text, 'cancelled'::text])))
);


--
-- Name: TABLE customer_installment_plans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_installment_plans IS 'Customer installment payment plans for sales';


--
-- Name: customer_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    message text NOT NULL,
    direction text DEFAULT 'inbound'::text NOT NULL,
    channel text DEFAULT 'chat'::text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    sender_id uuid,
    sender_name text,
    device_id uuid,
    appointment_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    delivered_at timestamp with time zone,
    branch_id uuid,
    is_shared boolean DEFAULT false,
    CONSTRAINT customer_messages_channel_check CHECK ((channel = ANY (ARRAY['chat'::text, 'sms'::text, 'whatsapp'::text, 'email'::text]))),
    CONSTRAINT customer_messages_direction_check CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text]))),
    CONSTRAINT customer_messages_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text, 'failed'::text])))
);


--
-- Name: TABLE customer_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_messages IS 'Stores all customer communication messages across different channels';


--
-- Name: customer_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    note text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    device_id uuid,
    amount numeric NOT NULL,
    method text DEFAULT 'cash'::text,
    payment_type text DEFAULT 'payment'::text,
    status text DEFAULT 'completed'::text,
    reference_number text,
    notes text,
    payment_date timestamp with time zone DEFAULT now(),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sale_id uuid,
    branch_id uuid,
    currency character varying(10) DEFAULT 'TZS'::character varying,
    is_shared boolean DEFAULT true
);


--
-- Name: COLUMN customer_payments.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_payments.branch_id IS 'References the branch this payment belongs to for multi-branch isolation';


--
-- Name: COLUMN customer_payments.currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_payments.currency IS 'Currency code for the payment (TZS, USD, EUR, etc.)';


--
-- Name: customer_points_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_points_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    points_change integer NOT NULL,
    reason text,
    transaction_type text DEFAULT 'manual'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    preferred_contact_method character varying(50),
    communication_frequency character varying(50),
    marketing_opt_in boolean DEFAULT true,
    sms_opt_in boolean DEFAULT true,
    email_opt_in boolean DEFAULT true,
    whatsapp_opt_in boolean DEFAULT true,
    preferred_language character varying(10) DEFAULT 'en'::character varying,
    notification_preferences jsonb DEFAULT '{}'::jsonb,
    preferred_branch character varying(255),
    preferred_payment_method character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_revenue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_revenue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    revenue_date date NOT NULL,
    revenue_amount numeric DEFAULT 0,
    revenue_source text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_special_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_special_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    customer_id uuid,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    product_name text NOT NULL,
    product_description text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    deposit_paid numeric DEFAULT 0,
    balance_due numeric DEFAULT 0,
    status text DEFAULT 'deposit_received'::text,
    order_date timestamp with time zone DEFAULT now(),
    expected_arrival_date date,
    actual_arrival_date date,
    delivery_date timestamp with time zone,
    supplier_name text,
    supplier_reference text,
    country_of_origin text,
    tracking_number text,
    notes text,
    internal_notes text,
    customer_notified_arrival boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_special_orders_status_check CHECK ((status = ANY (ARRAY['deposit_received'::text, 'ordered'::text, 'in_transit'::text, 'arrived'::text, 'ready_for_pickup'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: TABLE customer_special_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_special_orders IS 'Customer pre-orders and special import orders';


--
-- Name: lats_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    city text,
    location text,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    loyalty_points integer DEFAULT 0,
    total_spent numeric DEFAULT 0,
    status text DEFAULT 'active'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    whatsapp text,
    gender text,
    country text,
    color_tag text DEFAULT 'new'::text,
    loyalty_level text DEFAULT 'bronze'::text,
    points integer DEFAULT 0,
    last_visit timestamp with time zone,
    referral_source text,
    birth_month text,
    birth_day text,
    birthday date,
    initial_notes text,
    notes text,
    customer_tag text,
    location_description text,
    national_id text,
    joined_date date DEFAULT CURRENT_DATE,
    profile_image text,
    whatsapp_opt_out boolean DEFAULT false,
    referred_by uuid,
    created_by uuid,
    last_purchase_date timestamp with time zone,
    total_purchases integer DEFAULT 0,
    total_returns integer DEFAULT 0,
    total_calls integer DEFAULT 0,
    total_call_duration_minutes numeric DEFAULT 0,
    incoming_calls integer DEFAULT 0,
    outgoing_calls integer DEFAULT 0,
    missed_calls integer DEFAULT 0,
    avg_call_duration_minutes numeric DEFAULT 0,
    first_call_date timestamp with time zone,
    last_call_date timestamp with time zone,
    call_loyalty_level text DEFAULT 'Basic'::text,
    last_activity_date timestamp with time zone DEFAULT now(),
    referrals jsonb DEFAULT '[]'::jsonb,
    is_shared boolean DEFAULT true,
    preferred_branch_id uuid,
    visible_to_branches uuid[],
    sharing_mode text DEFAULT 'isolated'::text,
    created_by_branch_id uuid,
    created_by_branch_name text,
    CONSTRAINT lats_customers_sharing_mode_check CHECK ((sharing_mode = ANY (ARRAY['isolated'::text, 'shared'::text, 'custom'::text])))
);


--
-- Name: customers; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.customers AS
 SELECT id,
    name,
    email,
    phone,
    address,
    city,
    location,
    branch_id,
    loyalty_points,
    total_spent,
    status,
    is_active,
    created_at,
    updated_at,
    whatsapp,
    gender,
    country,
    color_tag,
    loyalty_level,
    points,
    last_visit,
    referral_source,
    birth_month,
    birth_day,
    birthday,
    initial_notes,
    notes,
    customer_tag,
    location_description,
    national_id,
    joined_date,
    profile_image,
    whatsapp_opt_out,
    referred_by,
    created_by,
    last_purchase_date,
    total_purchases,
    total_returns,
    total_calls,
    total_call_duration_minutes,
    incoming_calls,
    outgoing_calls,
    missed_calls,
    avg_call_duration_minutes,
    first_call_date,
    last_call_date,
    call_loyalty_level,
    last_activity_date,
    referrals,
    is_shared,
    preferred_branch_id,
    visible_to_branches,
    sharing_mode,
    created_by_branch_id,
    created_by_branch_name
   FROM public.lats_customers;


--
-- Name: whatsapp_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_customers (
    customer_id bigint NOT NULL,
    chat_session_name text NOT NULL,
    phone_number text,
    contact_name text,
    total_messages integer DEFAULT 0,
    messages_from_customer integer DEFAULT 0,
    messages_to_customer integer DEFAULT 0,
    first_contact_date timestamp without time zone,
    last_contact_date timestamp without time zone,
    status text DEFAULT 'active'::text,
    engagement_level text,
    is_buyer integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customers_customer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_customer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_customer_id_seq OWNED BY public.whatsapp_customers.customer_id;


--
-- Name: customers_duplicates_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customers_duplicates_backup (
    id uuid,
    name text,
    email text,
    phone text,
    address text,
    city text,
    location text,
    branch_id uuid,
    loyalty_points integer,
    total_spent numeric,
    status text,
    is_active boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    whatsapp text,
    gender text,
    country text,
    color_tag text,
    loyalty_level text,
    points integer,
    last_visit timestamp with time zone,
    referral_source text,
    birth_month text,
    birth_day text,
    birthday date,
    initial_notes text,
    notes text,
    customer_tag text,
    location_description text,
    national_id text,
    joined_date date,
    profile_image text,
    whatsapp_opt_out boolean,
    referred_by uuid,
    created_by uuid,
    last_purchase_date timestamp with time zone,
    total_purchases integer,
    total_returns integer,
    total_calls integer,
    total_call_duration_minutes numeric,
    incoming_calls integer,
    outgoing_calls integer,
    missed_calls integer,
    avg_call_duration_minutes numeric,
    first_call_date timestamp with time zone,
    last_call_date timestamp with time zone,
    call_loyalty_level text,
    last_activity_date timestamp with time zone,
    referrals jsonb,
    is_shared boolean,
    preferred_branch_id uuid,
    visible_to_branches uuid[],
    sharing_mode text,
    created_by_branch_id uuid,
    created_by_branch_name text,
    backup_date timestamp with time zone,
    backup_reason text
);


--
-- Name: daily_opening_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.daily_opening_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    opened_by character varying(255),
    opened_by_user_id uuid,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE daily_opening_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.daily_opening_sessions IS 'Tracks daily POS session openings. RLS policies allow all operations since sessions are system-wide. The opened_by_user_id column tracks who opened each session for audit purposes.';


--
-- Name: daily_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.daily_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_date date DEFAULT CURRENT_DATE NOT NULL,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    hours_worked numeric(4,2) DEFAULT 0,
    tasks_completed text[],
    tasks_in_progress text[],
    projects_worked text[],
    sales_achieved numeric(10,2) DEFAULT 0,
    customers_served integer DEFAULT 0,
    issues_resolved integer DEFAULT 0,
    achievements text,
    challenges text,
    learnings text,
    goals_for_tomorrow text,
    feedback text,
    mood_rating integer,
    energy_level integer,
    status text DEFAULT 'draft'::text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    report_type text DEFAULT 'daily'::text NOT NULL,
    report_month date,
    title text DEFAULT ''::text NOT NULL,
    customer_interactions text,
    pending_work text,
    recommendations text,
    additional_notes text,
    sales_made integer DEFAULT 0,
    pending_tasks integer DEFAULT 0,
    submitted_at timestamp with time zone,
    CONSTRAINT daily_reports_energy_level_check CHECK (((energy_level >= 1) AND (energy_level <= 5))),
    CONSTRAINT daily_reports_mood_rating_check CHECK (((mood_rating >= 1) AND (mood_rating <= 5))),
    CONSTRAINT daily_reports_report_type_check CHECK ((report_type = ANY (ARRAY['daily'::text, 'monthly'::text]))),
    CONSTRAINT daily_reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: COLUMN daily_reports.report_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_reports.report_date IS 'Date of the report (for daily reports)';


--
-- Name: COLUMN daily_reports.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_reports.status IS 'Report status: draft, submitted, reviewed, approved';


--
-- Name: daily_sales_closures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.daily_sales_closures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    total_sales numeric(12,2) DEFAULT 0,
    total_transactions integer DEFAULT 0,
    closed_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_by text NOT NULL,
    closed_by_user_id uuid,
    sales_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    session_id uuid
);


--
-- Name: TABLE daily_sales_closures; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.daily_sales_closures IS 'Tracks daily sales closures for the POS system. RLS policies allow all operations since closures are system-wide. The closed_by_user_id column tracks who closed each day for audit purposes.';


--
-- Name: COLUMN daily_sales_closures.date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_sales_closures.date IS 'Unique date for the closure (one closure per day)';


--
-- Name: COLUMN daily_sales_closures.sales_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.daily_sales_closures.sales_data IS 'JSONB field containing payment summaries and other closure details';


--
-- Name: lats_purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid,
    product_id uuid,
    variant_id uuid,
    quantity_ordered integer NOT NULL,
    quantity_received integer DEFAULT 0,
    unit_cost numeric NOT NULL,
    subtotal numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    notes text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: COLUMN lats_purchase_order_items.quantity_ordered; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_items.quantity_ordered IS 'The total quantity ordered for this item in the purchase order';


--
-- Name: COLUMN lats_purchase_order_items.quantity_received; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_items.quantity_received IS 'The quantity received so far for this item';


--
-- Name: data_quality_issues; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.data_quality_issues AS
 SELECT 'Suspicious Markup'::text AS issue_type,
    pv.id AS variant_id,
    p.name AS product_name,
    pv.variant_name,
    pv.sku,
    pv.cost_price,
    pv.selling_price,
        CASE
            WHEN ((pv.cost_price > (0)::numeric) AND (pv.selling_price > (0)::numeric)) THEN (((((pv.selling_price - pv.cost_price) / pv.cost_price) * (100)::numeric))::text || '%'::text)
            ELSE 'N/A'::text
        END AS markup,
    (EXISTS ( SELECT 1
           FROM public.lats_purchase_order_items poi
          WHERE (poi.variant_id = pv.id))) AS has_po,
    pv.created_at
   FROM (public.lats_product_variants pv
     LEFT JOIN public.lats_products p ON ((pv.product_id = p.id)))
  WHERE ((pv.cost_price > (0)::numeric) AND (pv.selling_price > (0)::numeric) AND ((((pv.selling_price - pv.cost_price) / pv.cost_price) * (100)::numeric) > (100000)::numeric))
UNION ALL
 SELECT 'No Purchase Order'::text AS issue_type,
    pv.id AS variant_id,
    p.name AS product_name,
    pv.variant_name,
    pv.sku,
    pv.cost_price,
    pv.selling_price,
    NULL::text AS markup,
    false AS has_po,
    pv.created_at
   FROM (public.lats_product_variants pv
     LEFT JOIN public.lats_products p ON ((pv.product_id = p.id)))
  WHERE ((NOT (EXISTS ( SELECT 1
           FROM public.lats_purchase_order_items poi
          WHERE (poi.variant_id = pv.id)))) AND (pv.cost_price > (0)::numeric) AND (pv.created_at > (now() - '30 days'::interval)))
UNION ALL
 SELECT 'Selling Below Cost'::text AS issue_type,
    pv.id AS variant_id,
    p.name AS product_name,
    pv.variant_name,
    pv.sku,
    pv.cost_price,
    pv.selling_price,
    (((((pv.selling_price - pv.cost_price) / pv.cost_price) * (100)::numeric))::text || '%'::text) AS markup,
    (EXISTS ( SELECT 1
           FROM public.lats_purchase_order_items poi
          WHERE (poi.variant_id = pv.id))) AS has_po,
    pv.created_at
   FROM (public.lats_product_variants pv
     LEFT JOIN public.lats_products p ON ((pv.product_id = p.id)))
  WHERE ((pv.cost_price > (0)::numeric) AND (pv.selling_price > (0)::numeric) AND (pv.selling_price < pv.cost_price))
UNION ALL
 SELECT 'Zero or Missing Price'::text AS issue_type,
    pv.id AS variant_id,
    p.name AS product_name,
    pv.variant_name,
    pv.sku,
    pv.cost_price,
    pv.selling_price,
    NULL::text AS markup,
    (EXISTS ( SELECT 1
           FROM public.lats_purchase_order_items poi
          WHERE (poi.variant_id = pv.id))) AS has_po,
    pv.created_at
   FROM (public.lats_product_variants pv
     LEFT JOIN public.lats_products p ON ((pv.product_id = p.id)))
  WHERE (((pv.cost_price = (0)::numeric) OR (pv.selling_price = (0)::numeric)) AND (pv.is_active = true))
  ORDER BY 10 DESC;


--
-- Name: VIEW data_quality_issues; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.data_quality_issues IS 'Dashboard view showing all data quality issues that need attention';


--
-- Name: device_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.device_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_type text,
    file_size integer,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: device_checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.device_checklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid,
    checklist_item text NOT NULL,
    is_checked boolean DEFAULT false,
    checked_by uuid,
    checked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: device_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.device_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid,
    customer_id uuid,
    rating integer,
    review_text text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT device_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: device_remarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.device_remarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid,
    remark text NOT NULL,
    remark_type text DEFAULT 'general'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: device_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.device_transitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid,
    from_status text,
    to_status text NOT NULL,
    transitioned_by uuid,
    transition_notes text,
    transitioned_at timestamp with time zone DEFAULT now(),
    performed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    signature text
);


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    device_name text NOT NULL,
    brand text,
    model text,
    serial_number text,
    imei text,
    problem_description text,
    diagnostic_notes text,
    repair_notes text,
    status text DEFAULT 'pending'::text,
    estimated_cost numeric DEFAULT 0,
    actual_cost numeric DEFAULT 0,
    deposit_amount numeric DEFAULT 0,
    balance_amount numeric DEFAULT 0,
    technician_id uuid,
    intake_date timestamp with time zone DEFAULT now(),
    estimated_completion_date timestamp with time zone,
    actual_completion_date timestamp with time zone,
    pickup_date timestamp with time zone,
    warranty_expiry_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    priority text DEFAULT 'normal'::text,
    password text,
    accessories text,
    issue_description text,
    assigned_to uuid,
    expected_return_date timestamp with time zone,
    estimated_hours integer,
    diagnosis_required boolean DEFAULT false,
    device_notes text,
    device_cost numeric DEFAULT 0,
    repair_cost numeric DEFAULT 0,
    repair_price numeric DEFAULT 0,
    unlock_code text,
    device_condition text,
    diagnostic_checklist jsonb,
    branch_id uuid,
    is_shared boolean DEFAULT true
);


--
-- Name: COLUMN devices.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devices.branch_id IS 'References the branch this device belongs to for multi-branch isolation';


--
-- Name: diagnostic_checklist_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.diagnostic_checklist_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid,
    problem_template_id uuid,
    checklist_items jsonb,
    overall_status text,
    technician_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);


--
-- Name: diagnostic_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.diagnostic_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid,
    check_name text NOT NULL,
    check_result text,
    is_passed boolean,
    checked_by uuid,
    checked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    diagnostic_device_id uuid
);


--
-- Name: diagnostic_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.diagnostic_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid,
    diagnostic_data jsonb,
    diagnostic_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: diagnostic_problem_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.diagnostic_problem_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    problem_name text NOT NULL,
    problem_description text,
    suggested_solutions jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    checklist_items jsonb DEFAULT '[]'::jsonb
);


--
-- Name: diagnostic_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.diagnostic_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid,
    template_id uuid,
    requested_by uuid,
    status text DEFAULT 'pending'::text,
    requested_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: diagnostic_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.diagnostic_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name text NOT NULL,
    device_type text,
    checklist_items jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: document_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.document_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    name text NOT NULL,
    content text NOT NULL,
    is_default boolean DEFAULT false,
    variables text[] DEFAULT '{}'::text[],
    paper_size text DEFAULT 'A4'::text,
    orientation text DEFAULT 'portrait'::text,
    header_html text,
    footer_html text,
    css_styles text,
    logo_url text,
    show_logo boolean DEFAULT true,
    show_business_info boolean DEFAULT true,
    show_customer_info boolean DEFAULT true,
    show_payment_info boolean DEFAULT true,
    show_terms boolean DEFAULT true,
    terms_text text,
    show_signature boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT document_templates_orientation_check CHECK ((orientation = ANY (ARRAY['portrait'::text, 'landscape'::text]))),
    CONSTRAINT document_templates_paper_size_check CHECK ((paper_size = ANY (ARRAY['A4'::text, 'Letter'::text, 'Thermal-80mm'::text, 'Thermal-58mm'::text]))),
    CONSTRAINT document_templates_type_check CHECK ((type = ANY (ARRAY['invoice'::text, 'quote'::text, 'purchase_order'::text, 'repair_order'::text, 'receipt'::text])))
);


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_email text NOT NULL,
    subject text,
    body text,
    status text DEFAULT 'pending'::text,
    sent_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    to_email character varying(255),
    message_id character varying(255),
    provider_response jsonb,
    branch_id uuid,
    delivered_at timestamp with time zone,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    date_of_birth date,
    gender character varying(20),
    "position" character varying(100) NOT NULL,
    department character varying(100) NOT NULL,
    hire_date date DEFAULT CURRENT_DATE NOT NULL,
    termination_date date,
    employment_type character varying(50) DEFAULT 'full-time'::character varying,
    salary numeric(15,2) DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'TZS'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    performance_rating numeric(3,2) DEFAULT 3.0,
    skills text[],
    manager_id uuid,
    location character varying(255),
    emergency_contact_name character varying(100),
    emergency_contact_phone character varying(50),
    address_line1 character varying(255),
    address_line2 character varying(255),
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country character varying(100) DEFAULT 'Tanzania'::character varying,
    photo_url text,
    bio text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    branch_id uuid,
    can_work_at_all_branches boolean DEFAULT false,
    assigned_branches uuid[] DEFAULT '{}'::uuid[],
    is_shared boolean DEFAULT false,
    full_name text,
    is_active boolean DEFAULT true,
    CONSTRAINT employees_performance_rating_check CHECK (((performance_rating >= (0)::numeric) AND (performance_rating <= (5)::numeric)))
);


--
-- Name: COLUMN employees."position"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees."position" IS 'Employee position/job title';


--
-- Name: COLUMN employees.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.branch_id IS 'The store/branch this employee belongs to. Used for multi-branch data isolation.';


--
-- Name: COLUMN employees.is_shared; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.is_shared IS 'When true, this employee is visible to all branches (can_work_at_all_branches)';


--
-- Name: COLUMN employees.full_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.full_name IS 'Employee full name (renamed from name for consistency with users table)';


--
-- Name: COLUMN employees.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.is_active IS 'Whether the employee is active (true) or inactive (false)';


--
-- Name: employee_attendance_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.employee_attendance_summary AS
 SELECT e.id,
    e.first_name,
    e.last_name,
    e.email,
    e."position",
    e.department,
    e.status,
    count(DISTINCT ar.id) FILTER (WHERE ((ar.status)::text = 'present'::text)) AS present_days,
    count(DISTINCT ar.id) AS total_attendance_records,
    round(
        CASE
            WHEN (count(DISTINCT ar.id) > 0) THEN (((count(DISTINCT ar.id) FILTER (WHERE ((ar.status)::text = 'present'::text)))::numeric / (count(DISTINCT ar.id))::numeric) * (100)::numeric)
            ELSE (100)::numeric
        END, 2) AS attendance_rate,
    avg(ar.total_hours) FILTER (WHERE (ar.total_hours > (0)::numeric)) AS avg_hours_per_day,
    sum(ar.overtime_hours) AS total_overtime_hours
   FROM (public.employees e
     LEFT JOIN public.attendance_records ar ON ((e.id = ar.employee_id)))
  WHERE ((e.status)::text = 'active'::text)
  GROUP BY e.id, e.first_name, e.last_name, e.email, e."position", e.department, e.status;


--
-- Name: employee_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.employee_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    shift_template_id uuid,
    shift_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    break_duration_minutes integer DEFAULT 0,
    status character varying(50) DEFAULT 'scheduled'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: employees_backup_migration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.employees_backup_migration (
    id uuid,
    user_id uuid,
    first_name character varying(100),
    last_name character varying(100),
    email character varying(255),
    phone character varying(50),
    date_of_birth date,
    gender character varying(20),
    "position" character varying(100),
    department character varying(100),
    hire_date date,
    termination_date date,
    employment_type character varying(50),
    salary numeric(15,2),
    currency character varying(10),
    status character varying(50),
    performance_rating numeric(3,2),
    skills text[],
    manager_id uuid,
    location character varying(255),
    emergency_contact_name character varying(100),
    emergency_contact_phone character varying(50),
    address_line1 character varying(255),
    address_line2 character varying(255),
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country character varying(100),
    photo_url text,
    bio text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by uuid,
    updated_by uuid
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    color text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    category text,
    description text,
    amount numeric DEFAULT 0 NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL,
    reference_number text,
    vendor_name text,
    notes text,
    payment_method text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    purchase_order_id uuid,
    product_id uuid,
    created_by uuid
);


--
-- Name: TABLE expenses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.expenses IS 'Table for tracking business expenses and operational costs';


--
-- Name: COLUMN expenses.purchase_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expenses.purchase_order_id IS 'Reference to the purchase order this expense is related to (e.g., shipping, customs)';


--
-- Name: COLUMN expenses.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expenses.product_id IS 'Reference to the specific product this expense is allocated to';


--
-- Name: COLUMN expenses.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expenses.created_by IS 'User who created this expense record';


--
-- Name: finance_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.finance_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_name text NOT NULL,
    account_type text NOT NULL,
    account_number text,
    bank_name text,
    current_balance numeric DEFAULT 0,
    currency text DEFAULT 'USD'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_payment_method boolean DEFAULT false,
    name text,
    type text,
    balance numeric DEFAULT 0,
    requires_reference boolean DEFAULT false,
    requires_account_number boolean DEFAULT false,
    description text,
    icon text,
    color text,
    branch_id uuid,
    is_shared boolean DEFAULT false,
    notes text
);


--
-- Name: store_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.store_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    state text,
    zip_code text,
    country text DEFAULT 'Tanzania'::text NOT NULL,
    phone text,
    email text,
    manager_name text,
    is_main boolean DEFAULT false,
    is_active boolean DEFAULT true,
    opening_time time without time zone DEFAULT '09:00:00'::time without time zone,
    closing_time time without time zone DEFAULT '18:00:00'::time without time zone,
    inventory_sync_enabled boolean DEFAULT true,
    pricing_model text DEFAULT 'centralized'::text,
    tax_rate_override numeric(5,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    data_isolation_mode text DEFAULT 'shared'::text,
    share_products boolean DEFAULT true,
    share_customers boolean DEFAULT true,
    share_inventory boolean DEFAULT false,
    share_suppliers boolean DEFAULT true,
    share_categories boolean DEFAULT true,
    share_employees boolean DEFAULT false,
    allow_stock_transfer boolean DEFAULT true,
    auto_sync_products boolean DEFAULT true,
    auto_sync_prices boolean DEFAULT true,
    require_approval_for_transfers boolean DEFAULT false,
    can_view_other_branches boolean DEFAULT false,
    can_transfer_to_branches text[] DEFAULT '{}'::text[],
    share_sales boolean DEFAULT false,
    share_purchase_orders boolean DEFAULT false,
    share_devices boolean DEFAULT false,
    share_payments boolean DEFAULT false,
    share_appointments boolean DEFAULT false,
    share_reminders boolean DEFAULT false,
    share_expenses boolean DEFAULT false,
    share_trade_ins boolean DEFAULT false,
    share_special_orders boolean DEFAULT false,
    share_attendance boolean DEFAULT false,
    share_loyalty_points boolean DEFAULT false,
    share_accounts boolean DEFAULT true,
    share_gift_cards boolean DEFAULT true,
    share_quality_checks boolean DEFAULT false,
    share_recurring_expenses boolean DEFAULT false,
    share_communications boolean DEFAULT false,
    share_reports boolean DEFAULT false,
    share_finance_transfers boolean DEFAULT false,
    CONSTRAINT store_locations_data_isolation_mode_check CHECK ((data_isolation_mode = ANY (ARRAY['shared'::text, 'isolated'::text, 'hybrid'::text]))),
    CONSTRAINT store_locations_pricing_model_check CHECK ((pricing_model = ANY (ARRAY['centralized'::text, 'location-specific'::text])))
);


--
-- Name: COLUMN store_locations.data_isolation_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_locations.data_isolation_mode IS 'Isolation mode: shared (all data shared), isolated (all data isolated), hybrid (per-entity configuration)';


--
-- Name: COLUMN store_locations.share_products; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_locations.share_products IS 'If true in hybrid mode, products are shared across branches. If false, products are isolated per branch.';


--
-- Name: COLUMN store_locations.share_customers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_locations.share_customers IS 'If true in hybrid mode, customers are shared across branches. If false, customers are isolated per branch.';


--
-- Name: COLUMN store_locations.share_inventory; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_locations.share_inventory IS 'If true in hybrid mode, inventory/variants are shared across branches. If false, inventory is isolated per branch.';


--
-- Name: COLUMN store_locations.share_suppliers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_locations.share_suppliers IS 'If true in hybrid mode, suppliers are shared across branches. If false, suppliers are isolated per branch.';


--
-- Name: COLUMN store_locations.share_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.store_locations.share_accounts IS 'If true in hybrid mode, payment accounts are shared across branches. If false, accounts are isolated per branch.';


--
-- Name: finance_accounts_with_branches; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.finance_accounts_with_branches AS
 SELECT fa.id,
    fa.account_name,
    fa.account_type,
    fa.account_number,
    fa.bank_name,
    fa.current_balance,
    fa.currency,
    fa.is_active,
    fa.created_at,
    fa.updated_at,
    fa.is_payment_method,
    fa.name,
    fa.type,
    fa.balance,
    fa.requires_reference,
    fa.requires_account_number,
    fa.description,
    fa.icon,
    fa.color,
    fa.branch_id,
    fa.is_shared,
    fa.notes,
    sl.name AS branch_name,
    sl.code AS branch_code,
    sl.is_main AS is_main_branch,
    sl.data_isolation_mode,
        CASE
            WHEN fa.is_shared THEN 'Shared'::text
            WHEN (fa.branch_id IS NOT NULL) THEN 'Branch-Specific'::text
            ELSE 'Unassigned'::text
        END AS isolation_status
   FROM (public.finance_accounts fa
     LEFT JOIN public.store_locations sl ON ((fa.branch_id = sl.id)));


--
-- Name: VIEW finance_accounts_with_branches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.finance_accounts_with_branches IS 'Finance accounts with branch information for easier management and reporting';


--
-- Name: finance_expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.finance_expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    is_shared boolean DEFAULT true
);


--
-- Name: finance_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.finance_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_category_id uuid,
    account_id uuid,
    expense_date date NOT NULL,
    amount numeric NOT NULL,
    description text,
    receipt_number text,
    vendor text,
    payment_method text DEFAULT 'cash'::text,
    created_by uuid,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    title text,
    status text DEFAULT 'approved'::text,
    receipt_url text,
    CONSTRAINT finance_expenses_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: finance_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.finance_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_account_id uuid,
    to_account_id uuid,
    transfer_date timestamp with time zone DEFAULT now(),
    amount numeric NOT NULL,
    description text,
    reference_number text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    is_shared boolean DEFAULT false
);


--
-- Name: gift_card_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.gift_card_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gift_card_id uuid,
    transaction_type text NOT NULL,
    amount numeric NOT NULL,
    balance_after numeric NOT NULL,
    sale_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    branch_id uuid
);


--
-- Name: COLUMN gift_card_transactions.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gift_card_transactions.branch_id IS 'Branch ID for data isolation';


--
-- Name: gift_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.gift_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_number text NOT NULL,
    initial_balance numeric NOT NULL,
    current_balance numeric NOT NULL,
    customer_id uuid,
    status text DEFAULT 'active'::text,
    issued_by uuid,
    issued_date timestamp with time zone DEFAULT now(),
    expiry_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    is_shared boolean DEFAULT true
);


--
-- Name: imei_validation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.imei_validation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    imei text NOT NULL,
    imei_status text NOT NULL,
    validation_reason text,
    source_table text,
    source_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT imei_validation_imei_status_check CHECK ((imei_status = ANY (ARRAY['valid'::text, 'invalid'::text, 'duplicate'::text, 'empty'::text])))
);


--
-- Name: installment_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.installment_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid,
    customer_id uuid,
    total_amount numeric DEFAULT 0,
    paid_amount numeric DEFAULT 0,
    remaining_amount numeric DEFAULT 0,
    installment_count integer DEFAULT 1,
    installment_amount numeric DEFAULT 0,
    next_due_date date,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    installment_plan_id uuid,
    installment_number integer DEFAULT 1 NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    payment_method text DEFAULT 'cash'::text NOT NULL,
    due_date date DEFAULT CURRENT_DATE NOT NULL,
    account_id uuid,
    reference_number text,
    payment_date timestamp with time zone DEFAULT now(),
    days_late integer DEFAULT 0,
    late_fee numeric DEFAULT 0,
    notification_sent boolean DEFAULT false,
    notification_sent_at timestamp with time zone,
    notes text,
    created_by uuid,
    branch_id uuid
);


--
-- Name: TABLE installment_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.installment_payments IS 'Individual payments made towards installment plans';


--
-- Name: COLUMN installment_payments.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.installment_payments.branch_id IS 'Branch ID for data isolation';


--
-- Name: installment_plans; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.installment_plans AS
 SELECT id,
    plan_number,
    customer_id,
    sale_id,
    branch_id,
    total_amount,
    down_payment,
    amount_financed,
    total_paid,
    balance_due,
    installment_amount,
    number_of_installments,
    installments_paid,
    payment_frequency,
    start_date,
    next_payment_date,
    end_date,
    completion_date,
    status,
    late_fee_amount,
    late_fee_applied,
    days_overdue,
    last_reminder_sent,
    reminder_count,
    terms_accepted,
    terms_accepted_date,
    notes,
    created_by,
    created_at,
    updated_at
   FROM public.customer_installment_plans;


--
-- Name: integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_name text NOT NULL,
    integration_type text NOT NULL,
    api_key text,
    api_secret text,
    config jsonb,
    is_active boolean DEFAULT true,
    last_sync timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    branch_id uuid,
    quantity integer DEFAULT 0 NOT NULL,
    reserved_quantity integer DEFAULT 0,
    min_stock_level integer DEFAULT 0,
    max_stock_level integer,
    last_updated timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    serial_number text,
    imei text,
    mac_address text,
    barcode text,
    status text DEFAULT 'available'::text,
    location text,
    shelf text,
    bin text,
    purchase_date timestamp with time zone,
    warranty_start date,
    warranty_end date,
    cost_price numeric(10,2) DEFAULT 0 NOT NULL,
    selling_price numeric(10,2),
    metadata jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    purchase_order_id uuid,
    purchase_order_item_id uuid,
    branch_id uuid,
    is_shared boolean DEFAULT false,
    visible_to_branches uuid[],
    sharing_mode text DEFAULT 'isolated'::text,
    CONSTRAINT inventory_items_sharing_mode_check CHECK ((sharing_mode = ANY (ARRAY['isolated'::text, 'shared'::text, 'custom'::text]))),
    CONSTRAINT inventory_items_status_check CHECK ((status = ANY (ARRAY['available'::text, 'sold'::text, 'reserved'::text, 'damaged'::text, 'returned'::text, 'in_transit'::text, 'pending_pricing'::text, 'on_hold'::text, 'pending_quality_check'::text])))
);


--
-- Name: TABLE inventory_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inventory_items IS 'Individual inventory items with serial numbers from purchase orders';


--
-- Name: COLUMN inventory_items.serial_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_items.serial_number IS 'Serial number or IMEI - both fields store the same identifier';


--
-- Name: COLUMN inventory_items.imei; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_items.imei IS 'IMEI or Serial Number - both fields store the same identifier (synced with serial_number)';


--
-- Name: COLUMN inventory_items.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_items.metadata IS 'JSON metadata including purchase_order_id and other tracking info';


--
-- Name: COLUMN inventory_items.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_items.branch_id IS 'Branch/store where this item is physically located';


--
-- Name: COLUMN inventory_items.is_shared; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_items.is_shared IS 'If true, item can be transferred between branches';


--
-- Name: inventory_settings_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.inventory_settings_view AS
 SELECT setting_key,
    setting_value,
    setting_type,
    description,
    is_active,
    updated_at
   FROM public.admin_settings
  WHERE (((category)::text = 'inventory'::text) AND (is_active = true))
  ORDER BY setting_key;


--
-- Name: lats_branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location text,
    phone text,
    email text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    color text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_id uuid,
    sort_order integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    branch_id uuid,
    is_shared boolean DEFAULT true
);


--
-- Name: COLUMN lats_categories.is_shared; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_categories.is_shared IS 'When true, this category is visible to all branches regardless of branch_id';


--
-- Name: lats_data_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_data_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    field_name text NOT NULL,
    old_value text,
    new_value text,
    change_reason text,
    change_source text,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_data_audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_data_audit_log IS 'Tracks all data changes for auditing and preventing fake data';


--
-- Name: lats_employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    "position" text,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    salary numeric DEFAULT 0,
    hire_date date DEFAULT CURRENT_DATE,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_inventory_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_inventory_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    variant_id uuid,
    quantity integer NOT NULL,
    type text NOT NULL,
    reason text,
    notes text,
    reference_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lats_inventory_adjustments_type_check CHECK ((type = ANY (ARRAY['purchase_order'::text, 'sale'::text, 'return'::text, 'adjustment'::text, 'damage'::text, 'transfer'::text])))
);


--
-- Name: lats_inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid,
    purchase_order_item_id uuid,
    product_id uuid,
    variant_id uuid,
    serial_number text,
    imei text,
    mac_address text,
    barcode text,
    status text DEFAULT 'pending'::text,
    location text,
    shelf text,
    bin text,
    purchase_date timestamp with time zone DEFAULT now(),
    warranty_start date,
    warranty_end date,
    cost_price numeric(10,2) DEFAULT 0 NOT NULL,
    selling_price numeric(10,2),
    quality_check_status text DEFAULT 'pending'::text,
    quality_check_notes text,
    quality_checked_at timestamp with time zone,
    quality_checked_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    branch_id uuid,
    quantity integer DEFAULT 1,
    storage_room_id uuid,
    CONSTRAINT lats_inventory_items_quality_check_status_check CHECK ((quality_check_status = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text]))),
    CONSTRAINT lats_inventory_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'received'::text, 'in_stock'::text, 'sold'::text, 'returned'::text, 'damaged'::text, 'quality_checked'::text])))
);


--
-- Name: TABLE lats_inventory_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_inventory_items IS 'Individual inventory items received from purchase orders';


--
-- Name: COLUMN lats_inventory_items.serial_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.serial_number IS 'Serial number for trackable items';


--
-- Name: COLUMN lats_inventory_items.imei; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.imei IS 'IMEI for mobile devices';


--
-- Name: COLUMN lats_inventory_items.mac_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.mac_address IS 'MAC address for network devices';


--
-- Name: COLUMN lats_inventory_items.barcode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.barcode IS 'Barcode for scanning';


--
-- Name: COLUMN lats_inventory_items.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.status IS 'Current status of the inventory item';


--
-- Name: COLUMN lats_inventory_items.quality_check_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.quality_check_status IS 'Quality check result: pending, passed, failed';


--
-- Name: COLUMN lats_inventory_items.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.quantity IS 'Quantity of items (defaults to 1 for individual items)';


--
-- Name: COLUMN lats_inventory_items.storage_room_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_inventory_items.storage_room_id IS 'Storage room where inventory item is located';


--
-- Name: lats_pos_advanced_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_pos_advanced_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_id uuid,
    enable_performance_mode boolean DEFAULT true,
    enable_caching boolean DEFAULT true,
    cache_size integer DEFAULT 100,
    enable_lazy_loading boolean DEFAULT true,
    max_concurrent_requests integer DEFAULT 5,
    enable_database_optimization boolean DEFAULT true,
    enable_auto_backup boolean DEFAULT false,
    backup_frequency text DEFAULT 'daily'::text,
    enable_data_compression boolean DEFAULT false,
    enable_query_optimization boolean DEFAULT true,
    enable_two_factor_auth boolean DEFAULT false,
    enable_session_timeout boolean DEFAULT true,
    session_timeout_minutes integer DEFAULT 60,
    enable_audit_logging boolean DEFAULT false,
    enable_encryption boolean DEFAULT false,
    enable_api_access boolean DEFAULT false,
    enable_webhooks boolean DEFAULT false,
    enable_third_party_integrations boolean DEFAULT false,
    enable_data_sync boolean DEFAULT true,
    sync_interval integer DEFAULT 300000,
    enable_debug_mode boolean DEFAULT false,
    enable_error_reporting boolean DEFAULT true,
    enable_performance_monitoring boolean DEFAULT false,
    enable_logging boolean DEFAULT true,
    log_level text DEFAULT 'error'::text,
    enable_experimental_features boolean DEFAULT false,
    enable_beta_features boolean DEFAULT false,
    enable_custom_scripts boolean DEFAULT false,
    enable_plugin_system boolean DEFAULT false,
    enable_auto_updates boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_pos_advanced_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_pos_advanced_settings IS 'Advanced system settings';


--
-- Name: lats_pos_analytics_reporting_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_pos_analytics_reporting_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_id uuid,
    enable_analytics boolean DEFAULT true,
    enable_real_time_analytics boolean DEFAULT true,
    analytics_refresh_interval integer DEFAULT 30000,
    enable_data_export boolean DEFAULT true,
    enable_sales_analytics boolean DEFAULT true,
    enable_sales_trends boolean DEFAULT true,
    enable_product_performance boolean DEFAULT true,
    enable_customer_analytics boolean DEFAULT true,
    enable_revenue_tracking boolean DEFAULT true,
    enable_inventory_analytics boolean DEFAULT true,
    enable_stock_alerts boolean DEFAULT true,
    enable_low_stock_reports boolean DEFAULT true,
    enable_inventory_turnover boolean DEFAULT true,
    enable_supplier_analytics boolean DEFAULT false,
    enable_automated_reports boolean DEFAULT false,
    report_generation_time text DEFAULT '08:00'::text,
    enable_email_reports boolean DEFAULT false,
    enable_pdf_reports boolean DEFAULT true,
    enable_excel_reports boolean DEFAULT true,
    enable_custom_dashboard boolean DEFAULT true,
    enable_kpi_widgets boolean DEFAULT true,
    enable_chart_animations boolean DEFAULT true,
    enable_data_drill_down boolean DEFAULT true,
    enable_comparative_analysis boolean DEFAULT true,
    enable_predictive_analytics boolean DEFAULT false,
    enable_data_retention boolean DEFAULT true,
    data_retention_days integer DEFAULT 365,
    enable_data_backup boolean DEFAULT true,
    enable_api_export boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_pos_analytics_reporting_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_pos_analytics_reporting_settings IS 'Stores analytics and reporting preferences';


--
-- Name: lats_pos_barcode_scanner_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_pos_barcode_scanner_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_id uuid,
    enable_barcode_scanner boolean DEFAULT true,
    enable_camera_scanner boolean DEFAULT false,
    enable_keyboard_input boolean DEFAULT true,
    enable_manual_entry boolean DEFAULT true,
    auto_add_to_cart boolean DEFAULT true,
    auto_focus_search boolean DEFAULT true,
    play_sound_on_scan boolean DEFAULT true,
    vibrate_on_scan boolean DEFAULT false,
    show_scan_feedback boolean DEFAULT true,
    show_invalid_barcode_alert boolean DEFAULT true,
    allow_unknown_products boolean DEFAULT false,
    prompt_for_unknown_products boolean DEFAULT true,
    retry_on_error boolean DEFAULT true,
    max_retry_attempts integer DEFAULT 3,
    scanner_device_name text,
    scanner_connection_type text DEFAULT 'usb'::text,
    scanner_timeout integer DEFAULT 5000,
    support_ean13 boolean DEFAULT true,
    support_ean8 boolean DEFAULT true,
    support_upc_a boolean DEFAULT true,
    support_upc_e boolean DEFAULT true,
    support_code128 boolean DEFAULT true,
    support_code39 boolean DEFAULT true,
    support_qr_code boolean DEFAULT true,
    support_data_matrix boolean DEFAULT false,
    enable_continuous_scanning boolean DEFAULT false,
    scan_delay integer DEFAULT 500,
    enable_scan_history boolean DEFAULT true,
    max_scan_history integer DEFAULT 50,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_pos_barcode_scanner_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_pos_barcode_scanner_settings IS 'Stores barcode scanner configuration';


--
-- Name: lats_pos_delivery_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_pos_delivery_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_id uuid,
    enable_delivery boolean DEFAULT true,
    default_delivery_fee numeric(10,2) DEFAULT 5000,
    free_delivery_threshold numeric(10,2) DEFAULT 50000,
    max_delivery_distance integer DEFAULT 20,
    enable_delivery_areas boolean DEFAULT false,
    delivery_areas text[] DEFAULT ARRAY[]::text[],
    area_delivery_fees jsonb DEFAULT '{}'::jsonb,
    area_delivery_times jsonb DEFAULT '{}'::jsonb,
    enable_delivery_hours boolean DEFAULT false,
    delivery_start_time text DEFAULT '08:00'::text,
    delivery_end_time text DEFAULT '18:00'::text,
    enable_same_day_delivery boolean DEFAULT true,
    enable_next_day_delivery boolean DEFAULT true,
    delivery_time_slots text[] DEFAULT ARRAY[]::text[],
    notify_customer_on_delivery boolean DEFAULT true,
    notify_driver_on_assignment boolean DEFAULT true,
    enable_sms_notifications boolean DEFAULT false,
    enable_email_notifications boolean DEFAULT false,
    enable_driver_assignment boolean DEFAULT false,
    driver_commission numeric(5,2) DEFAULT 10,
    require_signature boolean DEFAULT false,
    enable_driver_tracking boolean DEFAULT false,
    enable_scheduled_delivery boolean DEFAULT false,
    enable_partial_delivery boolean DEFAULT false,
    require_advance_payment boolean DEFAULT false,
    advance_payment_percent numeric(5,2) DEFAULT 50,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_pos_delivery_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_pos_delivery_settings IS 'Stores delivery configuration for POS system';


--
-- Name: lats_pos_dynamic_pricing_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_pos_dynamic_pricing_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_id text,
    enable_dynamic_pricing boolean DEFAULT false,
    enable_loyalty_pricing boolean DEFAULT false,
    enable_bulk_pricing boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    enable_time_based_pricing boolean DEFAULT false,
    enable_customer_pricing boolean DEFAULT false,
    enable_special_events boolean DEFAULT false,
    loyalty_discount_percent numeric(5,2) DEFAULT 0,
    loyalty_points_threshold integer DEFAULT 100,
    loyalty_max_discount numeric(5,2) DEFAULT 20,
    bulk_discount_enabled boolean DEFAULT false,
    bulk_discount_threshold integer DEFAULT 10,
    bulk_discount_percent numeric(5,2) DEFAULT 5,
    time_based_discount_enabled boolean DEFAULT false,
    time_based_start_time text DEFAULT '00:00'::text,
    time_based_end_time text DEFAULT '23:59'::text,
    time_based_discount_percent numeric(5,2) DEFAULT 0,
    customer_pricing_enabled boolean DEFAULT false,
    vip_customer_discount numeric(5,2) DEFAULT 10,
    regular_customer_discount numeric(5,2) DEFAULT 5,
    special_events_enabled boolean DEFAULT false,
    special_event_discount_percent numeric(5,2) DEFAULT 15,
    CONSTRAINT check_bulk_discount_percent CHECK (((bulk_discount_percent >= (0)::numeric) AND (bulk_discount_percent <= (100)::numeric))),
    CONSTRAINT check_bulk_discount_threshold CHECK ((bulk_discount_threshold >= 1)),
    CONSTRAINT check_loyalty_discount_percent CHECK (((loyalty_discount_percent >= (0)::numeric) AND (loyalty_discount_percent <= (100)::numeric))),
    CONSTRAINT check_time_based_discount_percent CHECK (((time_based_discount_percent >= (0)::numeric) AND (time_based_discount_percent <= (100)::numeric)))
);


--
-- Name: TABLE lats_pos_dynamic_pricing_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_pos_dynamic_pricing_settings IS 'Dynamic pricing settings for POS system - controls automatic discounts and pricing rules';


--
-- Name: COLUMN lats_pos_dynamic_pricing_settings.enable_dynamic_pricing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_dynamic_pricing_settings.enable_dynamic_pricing IS 'Master switch to enable/disable all dynamic pricing features';


--
-- Name: COLUMN lats_pos_dynamic_pricing_settings.enable_loyalty_pricing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_dynamic_pricing_settings.enable_loyalty_pricing IS 'Enable VIP/loyalty customer discounts';


--
-- Name: COLUMN lats_pos_dynamic_pricing_settings.enable_bulk_pricing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_dynamic_pricing_settings.enable_bulk_pricing IS 'Enable bulk purchase discounts for large quantities';


--
-- Name: COLUMN lats_pos_dynamic_pricing_settings.enable_time_based_pricing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_dynamic_pricing_settings.enable_time_based_pricing IS 'Enable Happy Hour discounts during specific time periods';


--
-- Name: COLUMN lats_pos_dynamic_pricing_settings.loyalty_discount_percent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_dynamic_pricing_settings.loyalty_discount_percent IS 'Discount percentage for VIP customers (0-100)';


--
-- Name: COLUMN lats_pos_dynamic_pricing_settings.bulk_discount_threshold; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_dynamic_pricing_settings.bulk_discount_threshold IS 'Minimum quantity required for bulk discount';


--
-- Name: COLUMN lats_pos_dynamic_pricing_settings.bulk_discount_percent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_dynamic_pricing_settings.bulk_discount_percent IS 'Discount percentage for bulk purchases (0-100)';


--
-- Name: COLUMN lats_pos_dynamic_pricing_settings.time_based_start_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_dynamic_pricing_settings.time_based_start_time IS 'Happy Hour start time (HH:MM format)';


--
-- Name: COLUMN lats_pos_dynamic_pricing_settings.time_based_end_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_dynamic_pricing_settings.time_based_end_time IS 'Happy Hour end time (HH:MM format)';


--
-- Name: COLUMN lats_pos_dynamic_pricing_settings.time_based_discount_percent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_dynamic_pricing_settings.time_based_discount_percent IS 'Discount percentage during Happy Hour (0-100)';


--
-- Name: lats_pos_general_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_pos_general_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_id text,
    theme text DEFAULT 'light'::text,
    language text DEFAULT 'en'::text,
    currency text DEFAULT 'USD'::text,
    timezone text DEFAULT 'UTC'::text,
    date_format text DEFAULT 'MM/DD/YYYY'::text,
    time_format text DEFAULT '12'::text,
    show_product_images boolean DEFAULT true,
    show_stock_levels boolean DEFAULT true,
    show_prices boolean DEFAULT true,
    show_barcodes boolean DEFAULT true,
    products_per_page integer DEFAULT 20,
    auto_complete_search boolean DEFAULT true,
    confirm_delete boolean DEFAULT true,
    show_confirmations boolean DEFAULT true,
    enable_sound_effects boolean DEFAULT true,
    sound_volume numeric(3,2) DEFAULT 0.5,
    enable_click_sounds boolean DEFAULT true,
    enable_cart_sounds boolean DEFAULT true,
    enable_payment_sounds boolean DEFAULT true,
    enable_delete_sounds boolean DEFAULT true,
    enable_animations boolean DEFAULT true,
    enable_caching boolean DEFAULT true,
    cache_duration integer DEFAULT 300000,
    enable_lazy_loading boolean DEFAULT true,
    max_search_results integer DEFAULT 50,
    enable_tax boolean DEFAULT false,
    tax_rate numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    day_closing_passcode character varying(255) DEFAULT '1234'::character varying,
    business_name text DEFAULT 'My Store'::text,
    business_address text DEFAULT ''::text,
    business_phone text DEFAULT ''::text,
    business_email text DEFAULT ''::text,
    business_website text DEFAULT ''::text,
    business_logo text,
    app_logo text,
    logo_size text DEFAULT 'medium'::text,
    logo_position text DEFAULT 'left'::text,
    company_name text,
    primary_color text DEFAULT '#3B82F6'::text,
    secondary_color text DEFAULT '#1E40AF'::text,
    accent_color text DEFAULT '#10B981'::text,
    tagline text DEFAULT ''::text,
    tax_id text DEFAULT ''::text,
    registration_number text DEFAULT ''::text,
    auto_backup_enabled boolean DEFAULT false,
    auto_backup_frequency text DEFAULT 'daily'::text,
    auto_backup_time text DEFAULT '02:00'::text,
    auto_backup_type text DEFAULT 'full'::text,
    last_auto_backup timestamp with time zone,
    font_size text DEFAULT 'medium'::text,
    products_per_row integer DEFAULT 4,
    CONSTRAINT lats_pos_general_settings_auto_backup_frequency_check CHECK ((auto_backup_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text]))),
    CONSTRAINT lats_pos_general_settings_auto_backup_type_check CHECK ((auto_backup_type = ANY (ARRAY['full'::text, 'schema-only'::text, 'data-only'::text]))),
    CONSTRAINT lats_pos_general_settings_font_size_check CHECK ((font_size = ANY (ARRAY['tiny'::text, 'extra-small'::text, 'small'::text, 'medium'::text, 'large'::text]))),
    CONSTRAINT lats_pos_general_settings_logo_position_check CHECK ((logo_position = ANY (ARRAY['left'::text, 'center'::text, 'right'::text]))),
    CONSTRAINT lats_pos_general_settings_logo_size_check CHECK ((logo_size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text]))),
    CONSTRAINT lats_pos_general_settings_products_per_row_check CHECK (((products_per_row >= 2) AND (products_per_row <= 12)))
);


--
-- Name: TABLE lats_pos_general_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_pos_general_settings IS 'POS general settings - user_id is nullable for global/default settings';


--
-- Name: COLUMN lats_pos_general_settings.products_per_row; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_general_settings.products_per_row IS 'Number of products to display per row in the POS grid';


--
-- Name: lats_pos_integrations_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_pos_integrations_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid,
    integration_name text NOT NULL,
    integration_type text NOT NULL,
    provider_name text,
    is_enabled boolean DEFAULT false,
    is_active boolean DEFAULT false,
    is_test_mode boolean DEFAULT true,
    credentials jsonb DEFAULT '{}'::jsonb,
    config jsonb DEFAULT '{}'::jsonb,
    description text,
    webhook_url text,
    callback_url text,
    environment text DEFAULT 'test'::text,
    last_used_at timestamp with time zone,
    total_requests integer DEFAULT 0,
    successful_requests integer DEFAULT 0,
    failed_requests integer DEFAULT 0,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lats_pos_integrations_settings_environment_check CHECK ((environment = ANY (ARRAY['test'::text, 'production'::text, 'sandbox'::text])))
);


--
-- Name: lats_pos_loyalty_customer_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_pos_loyalty_customer_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_id text,
    enable_loyalty boolean DEFAULT false,
    points_per_dollar numeric(5,2) DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    enable_loyalty_program boolean DEFAULT true,
    loyalty_program_name text DEFAULT 'Loyalty Rewards'::text,
    points_per_currency numeric DEFAULT 1,
    points_redemption_rate numeric DEFAULT 100,
    minimum_points_redemption integer DEFAULT 500,
    points_expiry_days integer DEFAULT 365,
    enable_customer_registration boolean DEFAULT true,
    require_customer_info boolean DEFAULT false,
    enable_customer_categories boolean DEFAULT true,
    enable_customer_tags boolean DEFAULT true,
    enable_customer_notes boolean DEFAULT true,
    enable_automatic_rewards boolean DEFAULT true,
    enable_manual_rewards boolean DEFAULT true,
    enable_birthday_rewards boolean DEFAULT true,
    enable_anniversary_rewards boolean DEFAULT false,
    enable_referral_rewards boolean DEFAULT false,
    enable_email_communication boolean DEFAULT false,
    enable_sms_communication boolean DEFAULT false,
    enable_push_notifications boolean DEFAULT false,
    enable_marketing_emails boolean DEFAULT false,
    enable_customer_analytics boolean DEFAULT true,
    enable_purchase_history boolean DEFAULT true,
    enable_spending_patterns boolean DEFAULT true,
    enable_customer_segmentation boolean DEFAULT false,
    enable_customer_insights boolean DEFAULT false
);


--
-- Name: TABLE lats_pos_loyalty_customer_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_pos_loyalty_customer_settings IS 'Stores loyalty program configuration';


--
-- Name: lats_pos_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_pos_notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_id uuid,
    enable_notifications boolean DEFAULT true,
    enable_sound_notifications boolean DEFAULT true,
    enable_visual_notifications boolean DEFAULT true,
    enable_push_notifications boolean DEFAULT false,
    notification_timeout integer DEFAULT 5000,
    enable_sales_notifications boolean DEFAULT true,
    notify_on_sale_completion boolean DEFAULT true,
    notify_on_refund boolean DEFAULT true,
    notify_on_void boolean DEFAULT true,
    notify_on_discount boolean DEFAULT false,
    enable_inventory_notifications boolean DEFAULT true,
    notify_on_low_stock boolean DEFAULT true,
    low_stock_threshold integer DEFAULT 10,
    notify_on_out_of_stock boolean DEFAULT true,
    notify_on_stock_adjustment boolean DEFAULT false,
    enable_customer_notifications boolean DEFAULT false,
    notify_on_customer_registration boolean DEFAULT false,
    notify_on_loyalty_points boolean DEFAULT false,
    notify_on_customer_birthday boolean DEFAULT false,
    notify_on_customer_anniversary boolean DEFAULT false,
    enable_system_notifications boolean DEFAULT true,
    notify_on_system_errors boolean DEFAULT true,
    notify_on_backup_completion boolean DEFAULT false,
    notify_on_sync_completion boolean DEFAULT false,
    notify_on_maintenance boolean DEFAULT true,
    enable_email_notifications boolean DEFAULT false,
    enable_sms_notifications boolean DEFAULT false,
    enable_in_app_notifications boolean DEFAULT true,
    enable_desktop_notifications boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    whatsapp_closing_message text DEFAULT ''::text
);


--
-- Name: TABLE lats_pos_notification_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_pos_notification_settings IS 'Stores notification preferences';


--
-- Name: lats_pos_receipt_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_pos_receipt_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_id text,
    receipt_template text DEFAULT 'standard'::text,
    receipt_width integer DEFAULT 80,
    receipt_font_size integer DEFAULT 12,
    show_business_logo boolean DEFAULT true,
    show_business_name boolean DEFAULT true,
    show_business_address boolean DEFAULT true,
    show_business_phone boolean DEFAULT true,
    show_business_email boolean DEFAULT true,
    show_business_website boolean DEFAULT false,
    show_transaction_id boolean DEFAULT true,
    show_date_time boolean DEFAULT true,
    show_cashier_name boolean DEFAULT true,
    show_customer_name boolean DEFAULT true,
    show_customer_phone boolean DEFAULT false,
    show_product_names boolean DEFAULT true,
    show_product_skus boolean DEFAULT false,
    show_product_barcodes boolean DEFAULT false,
    show_quantities boolean DEFAULT true,
    show_unit_prices boolean DEFAULT true,
    show_discounts boolean DEFAULT true,
    show_subtotal boolean DEFAULT true,
    show_tax boolean DEFAULT true,
    show_discount_total boolean DEFAULT true,
    show_grand_total boolean DEFAULT true,
    show_payment_method boolean DEFAULT true,
    show_change_amount boolean DEFAULT true,
    auto_print_receipt boolean DEFAULT false,
    print_duplicate_receipt boolean DEFAULT false,
    enable_email_receipt boolean DEFAULT true,
    enable_sms_receipt boolean DEFAULT false,
    enable_receipt_numbering boolean DEFAULT true,
    receipt_number_prefix text DEFAULT 'RCP'::text,
    receipt_number_start integer DEFAULT 1000,
    receipt_number_format text DEFAULT 'RCP-{number}'::text,
    show_footer_message boolean DEFAULT true,
    footer_message text DEFAULT 'Thank you for your business!'::text,
    show_return_policy boolean DEFAULT false,
    return_policy_text text DEFAULT '30-day return policy'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    enable_whatsapp_pdf boolean DEFAULT true,
    whatsapp_pdf_auto_send boolean DEFAULT false,
    whatsapp_pdf_show_preview boolean DEFAULT true,
    whatsapp_pdf_format text DEFAULT 'a4'::text,
    whatsapp_pdf_quality text DEFAULT 'standard'::text,
    whatsapp_pdf_include_logo boolean DEFAULT true,
    whatsapp_pdf_include_images boolean DEFAULT false,
    whatsapp_pdf_include_qr boolean DEFAULT true,
    whatsapp_pdf_include_barcode boolean DEFAULT false,
    whatsapp_pdf_message text DEFAULT 'Thank you for your purchase! Please find your receipt attached.'::text,
    enable_email_pdf boolean DEFAULT true,
    enable_print_pdf boolean DEFAULT true,
    enable_download_pdf boolean DEFAULT true,
    show_share_button boolean DEFAULT true,
    sms_header_message text DEFAULT 'Thank you for your purchase!'::text,
    sms_footer_message text DEFAULT 'Thank you for choosing us!'::text,
    CONSTRAINT whatsapp_pdf_format_check CHECK ((whatsapp_pdf_format = ANY (ARRAY['a4'::text, 'letter'::text, 'thermal'::text]))),
    CONSTRAINT whatsapp_pdf_quality_check CHECK ((whatsapp_pdf_quality = ANY (ARRAY['high'::text, 'standard'::text, 'compressed'::text])))
);


--
-- Name: TABLE lats_pos_receipt_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_pos_receipt_settings IS 'Receipt template and printing settings';


--
-- Name: COLUMN lats_pos_receipt_settings.sms_header_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_receipt_settings.sms_header_message IS 'Customizable header message for SMS receipts';


--
-- Name: COLUMN lats_pos_receipt_settings.sms_footer_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_pos_receipt_settings.sms_footer_message IS 'Customizable footer message for SMS receipts';


--
-- Name: lats_pos_search_filter_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_pos_search_filter_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_id uuid,
    enable_product_search boolean DEFAULT true,
    enable_customer_search boolean DEFAULT true,
    enable_sales_search boolean DEFAULT true,
    search_by_name boolean DEFAULT true,
    search_by_barcode boolean DEFAULT true,
    search_by_sku boolean DEFAULT true,
    search_by_category boolean DEFAULT true,
    search_by_supplier boolean DEFAULT true,
    search_by_description boolean DEFAULT true,
    search_by_tags boolean DEFAULT true,
    enable_fuzzy_search boolean DEFAULT true,
    enable_autocomplete boolean DEFAULT true,
    min_search_length integer DEFAULT 2,
    max_search_results integer DEFAULT 50,
    search_timeout integer DEFAULT 5000,
    search_debounce_time integer DEFAULT 300,
    enable_search_history boolean DEFAULT true,
    max_search_history integer DEFAULT 50,
    enable_recent_searches boolean DEFAULT true,
    enable_popular_searches boolean DEFAULT true,
    enable_search_suggestions boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_pos_search_filter_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_pos_search_filter_settings IS 'Stores search and filter preferences';


--
-- Name: lats_pos_user_permissions_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_pos_user_permissions_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    business_id text,
    permissions jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    enable_pos_access boolean DEFAULT true,
    enable_sales_access boolean DEFAULT true,
    enable_refunds_access boolean DEFAULT true,
    enable_void_access boolean DEFAULT false,
    enable_discount_access boolean DEFAULT true,
    enable_inventory_view boolean DEFAULT true,
    enable_inventory_edit boolean DEFAULT true,
    enable_stock_adjustments boolean DEFAULT true,
    enable_product_creation boolean DEFAULT true,
    enable_product_deletion boolean DEFAULT false,
    enable_customer_view boolean DEFAULT true,
    enable_customer_creation boolean DEFAULT true,
    enable_customer_edit boolean DEFAULT true,
    enable_customer_deletion boolean DEFAULT false,
    enable_customer_history boolean DEFAULT true,
    enable_payment_processing boolean DEFAULT true,
    enable_cash_management boolean DEFAULT true,
    enable_daily_reports boolean DEFAULT true,
    enable_financial_reports boolean DEFAULT false,
    enable_tax_management boolean DEFAULT false,
    enable_settings_access boolean DEFAULT false,
    enable_user_management boolean DEFAULT false,
    enable_backup_restore boolean DEFAULT false,
    enable_system_maintenance boolean DEFAULT false,
    enable_api_access boolean DEFAULT false,
    enable_audit_logs boolean DEFAULT false,
    enable_security_settings boolean DEFAULT false,
    enable_password_reset boolean DEFAULT false,
    enable_session_management boolean DEFAULT false,
    enable_data_export boolean DEFAULT true
);


--
-- Name: TABLE lats_pos_user_permissions_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_pos_user_permissions_settings IS 'Stores user permission settings';


--
-- Name: lats_product_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_product_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_variant_id uuid NOT NULL,
    imei text NOT NULL,
    status text DEFAULT 'in_stock'::text,
    sale_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    product_id uuid
);


--
-- Name: lats_product_validation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_product_validation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    shipping_id uuid,
    is_validated boolean DEFAULT false,
    validation_errors text[],
    validated_by uuid,
    validated_at timestamp with time zone,
    updated_cost_price numeric(10,2),
    updated_selling_price numeric(10,2),
    updated_supplier_id uuid,
    updated_category_id uuid,
    updated_product_name text,
    updated_product_description text,
    updated_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_purchase_order_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_purchase_order_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    action text NOT NULL,
    old_status text,
    new_status text,
    user_id uuid NOT NULL,
    notes text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_purchase_order_audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_purchase_order_audit_log IS 'Audit log for tracking all changes and actions performed on purchase orders';


--
-- Name: lats_purchase_order_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_purchase_order_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    payment_date timestamp with time zone DEFAULT now(),
    reference_number text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    branch_id uuid
);


--
-- Name: TABLE lats_purchase_order_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_purchase_order_payments IS 'Payment records for purchase orders';


--
-- Name: COLUMN lats_purchase_order_payments.amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_payments.amount IS 'Payment amount';


--
-- Name: COLUMN lats_purchase_order_payments.payment_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_payments.payment_method IS 'Method of payment (cash, bank transfer, credit, etc.)';


--
-- Name: COLUMN lats_purchase_order_payments.reference_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_payments.reference_number IS 'Transaction reference or receipt number';


--
-- Name: COLUMN lats_purchase_order_payments.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_payments.branch_id IS 'Branch ID for data isolation';


--
-- Name: lats_purchase_order_shipping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_purchase_order_shipping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    shipping_method_id uuid,
    shipping_method_code text,
    shipping_agent_id uuid,
    agent_name text,
    agent_contact text,
    agent_phone text,
    shipping_address_street text,
    shipping_address_city text DEFAULT 'Dar es Salaam'::text,
    shipping_address_region text,
    shipping_address_country text DEFAULT 'Tanzania'::text,
    shipping_address_postal_code text,
    billing_address_street text,
    billing_address_city text,
    billing_address_region text,
    billing_address_country text,
    billing_address_postal_code text,
    use_same_address boolean DEFAULT true,
    expected_departure_date date,
    expected_arrival_date date,
    actual_departure_date date,
    actual_arrival_date date,
    tracking_number text,
    container_number text,
    bill_of_lading text,
    airway_bill text,
    shipping_cost numeric DEFAULT 0,
    insurance_cost numeric DEFAULT 0,
    customs_duty numeric DEFAULT 0,
    other_charges numeric DEFAULT 0,
    total_shipping_cost numeric DEFAULT 0,
    currency text DEFAULT 'USD'::text,
    port_of_loading text,
    port_of_discharge text,
    container_type text,
    container_count integer DEFAULT 1,
    shipping_status text DEFAULT 'pending'::text,
    shipping_notes text,
    customs_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_shipping_status CHECK ((shipping_status = ANY (ARRAY['pending'::text, 'preparing'::text, 'in_transit'::text, 'customs'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: TABLE lats_purchase_order_shipping; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_purchase_order_shipping IS 'Detailed shipping information for each purchase order';


--
-- Name: COLUMN lats_purchase_order_shipping.use_same_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_shipping.use_same_address IS 'Whether billing address is same as shipping address';


--
-- Name: COLUMN lats_purchase_order_shipping.shipping_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_purchase_order_shipping.shipping_status IS 'Current status of the shipment';


--
-- Name: lats_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid,
    receipt_number text NOT NULL,
    customer_name text,
    customer_phone text,
    total_amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    items_count integer NOT NULL,
    generated_by text,
    receipt_content jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE lats_receipts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_receipts IS 'Stores all generated receipts for sales transactions';


--
-- Name: lats_sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid,
    product_id uuid,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    discount numeric DEFAULT 0,
    subtotal numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    variant_id uuid,
    variant_name text,
    sku text,
    total_price numeric(15,2) DEFAULT 0,
    cost_price numeric DEFAULT 0,
    profit numeric DEFAULT 0,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT lats_sale_items_total_price_check CHECK (((total_price >= (0)::numeric) AND (total_price <= (100000000)::numeric)))
);


--
-- Name: lats_sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_number text NOT NULL,
    customer_id uuid,
    user_id uuid,
    total_amount numeric(15,2) DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    tax_amount numeric DEFAULT 0,
    final_amount numeric DEFAULT 0,
    payment_status text DEFAULT 'completed'::text,
    status text DEFAULT 'completed'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    subtotal numeric(12,2) DEFAULT 0,
    tax numeric(12,2) DEFAULT 0,
    sold_by text,
    customer_email text,
    customer_name text,
    customer_phone text,
    discount numeric DEFAULT 0,
    branch_id uuid,
    payment_method jsonb,
    CONSTRAINT lats_sales_total_amount_check CHECK (((total_amount >= (0)::numeric) AND (total_amount <= (1000000000)::numeric)))
);


--
-- Name: COLUMN lats_sales.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_sales.user_id IS 'User ID of the cashier who made the sale';


--
-- Name: COLUMN lats_sales.sold_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_sales.sold_by IS 'Email or name of the cashier';


--
-- Name: COLUMN lats_sales.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_sales.branch_id IS 'Branch where the sale was made (for multi-branch support)';


--
-- Name: lats_shipping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_shipping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid,
    shipping_method text,
    tracking_number text,
    carrier text,
    estimated_arrival_date date,
    actual_arrival_date date,
    status text DEFAULT 'pending'::text,
    shipping_cost numeric(10,2),
    shipping_address text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_shipping_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_shipping_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    company_name text,
    contact_person text,
    phone text,
    email text,
    whatsapp text,
    shipping_methods text[] DEFAULT ARRAY['sea'::text, 'air'::text],
    address text,
    city text,
    country text,
    license_number text,
    website text,
    notes text,
    base_rate_sea numeric DEFAULT 0,
    base_rate_air numeric DEFAULT 0,
    currency text DEFAULT 'USD'::text,
    rating numeric DEFAULT 0,
    total_shipments integer DEFAULT 0,
    successful_shipments integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_preferred boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT lats_shipping_agents_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);


--
-- Name: TABLE lats_shipping_agents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_shipping_agents IS 'Stores information about shipping agents and freight forwarders';


--
-- Name: COLUMN lats_shipping_agents.shipping_methods; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_shipping_agents.shipping_methods IS 'Array of shipping methods this agent handles';


--
-- Name: COLUMN lats_shipping_agents.rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_shipping_agents.rating IS 'Agent rating from 0 to 5';


--
-- Name: lats_shipping_cargo_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_shipping_cargo_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shipping_id uuid,
    product_id uuid,
    purchase_order_item_id uuid,
    quantity integer DEFAULT 0 NOT NULL,
    cost_price numeric(10,2),
    description text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_shipping_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_shipping_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    estimated_days_min integer,
    estimated_days_max integer,
    cost_multiplier numeric DEFAULT 1.0,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_shipping_methods; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_shipping_methods IS 'Defines available shipping methods (air, sea, etc.)';


--
-- Name: lats_shipping_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_shipping_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    default_shipping_address_street text,
    default_shipping_address_city text DEFAULT 'Dar es Salaam'::text,
    default_shipping_address_region text DEFAULT 'Dar es Salaam'::text,
    default_shipping_address_country text DEFAULT 'Tanzania'::text,
    default_shipping_address_postal_code text,
    default_billing_address_street text,
    default_billing_address_city text,
    default_billing_address_region text,
    default_billing_address_country text,
    default_billing_address_postal_code text,
    default_shipping_method_id uuid,
    default_agent_id uuid,
    notify_on_shipment boolean DEFAULT true,
    notify_on_arrival boolean DEFAULT true,
    notification_email text,
    notification_phone text,
    auto_calculate_shipping boolean DEFAULT false,
    include_insurance boolean DEFAULT true,
    insurance_percentage numeric DEFAULT 2.0,
    user_id uuid,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_shipping_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_shipping_settings IS 'Default shipping settings and preferences';


--
-- Name: lats_spare_part_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_spare_part_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    spare_part_id uuid,
    device_id uuid,
    quantity integer NOT NULL,
    reason text,
    notes text,
    used_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_spare_part_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_spare_part_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    spare_part_id uuid NOT NULL,
    name text NOT NULL,
    sku text,
    cost_price numeric(12,2) DEFAULT 0,
    selling_price numeric(12,2) DEFAULT 0,
    quantity integer DEFAULT 0,
    min_quantity integer DEFAULT 0,
    attributes jsonb DEFAULT '{}'::jsonb,
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_spare_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_spare_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    part_number text,
    quantity integer DEFAULT 0,
    selling_price numeric DEFAULT 0,
    cost_price numeric DEFAULT 0,
    category_id uuid,
    brand text,
    description text,
    condition text,
    location text,
    min_quantity integer DEFAULT 0,
    compatible_devices text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    supplier_id uuid,
    unit_price numeric DEFAULT 0
);


--
-- Name: COLUMN lats_spare_parts.unit_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_spare_parts.unit_price IS 'Unit price for spare parts (fallback to selling_price or cost_price)';


--
-- Name: lats_stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    variant_id uuid,
    movement_type text NOT NULL,
    quantity integer NOT NULL,
    reference_type text,
    reference_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    from_branch_id uuid,
    to_branch_id uuid,
    branch_id uuid,
    previous_quantity integer,
    new_quantity integer,
    reason text,
    reference text
);


--
-- Name: TABLE lats_stock_movements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_stock_movements IS 'Tracks all stock movements including sales, purchases, adjustments, and transfers';


--
-- Name: COLUMN lats_stock_movements.previous_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_stock_movements.previous_quantity IS 'Stock quantity before the movement';


--
-- Name: COLUMN lats_stock_movements.new_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_stock_movements.new_quantity IS 'Stock quantity after the movement';


--
-- Name: COLUMN lats_stock_movements.reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_stock_movements.reason IS 'Human-readable reason for the movement (e.g., "Sale", "Shipment receipt")';


--
-- Name: COLUMN lats_stock_movements.reference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lats_stock_movements.reference IS 'Text reference for the movement (e.g., "Sale #123")';


--
-- Name: lats_stock_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_stock_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_number text,
    from_branch_id uuid,
    to_branch_id uuid,
    product_id uuid,
    variant_id uuid,
    quantity integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text,
    requested_by uuid,
    approved_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT lats_stock_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'in_transit'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text])))
);


--
-- Name: TABLE lats_stock_transfers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_stock_transfers IS 'Stock transfers between branches';


--
-- Name: lats_store_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_store_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    location text,
    capacity integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    store_location_id uuid,
    code text,
    floor_level integer DEFAULT 0,
    area_sqm numeric,
    max_capacity integer,
    current_capacity integer DEFAULT 0,
    is_secure boolean DEFAULT false,
    requires_access_card boolean DEFAULT false,
    color_code text,
    notes text
);


--
-- Name: TABLE lats_store_rooms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_store_rooms IS 'Storage rooms for inventory organization';


--
-- Name: lats_storage_rooms; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lats_storage_rooms AS
 SELECT id,
    name,
    description,
    location,
    capacity,
    is_active,
    created_at,
    updated_at,
    store_location_id,
    code,
    floor_level,
    area_sqm,
    max_capacity,
    current_capacity,
    is_secure,
    requires_access_card,
    color_code,
    notes
   FROM public.lats_store_rooms;


--
-- Name: lats_store_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_store_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    address text,
    city text,
    region text,
    country text DEFAULT 'Tanzania'::text,
    postal_code text,
    phone text,
    email text,
    manager_name text,
    manager_phone text,
    is_active boolean DEFAULT true,
    is_main_branch boolean DEFAULT false,
    has_repair_service boolean DEFAULT false,
    has_sales_service boolean DEFAULT true,
    has_delivery_service boolean DEFAULT false,
    store_size_sqm numeric,
    current_staff_count integer DEFAULT 0,
    monthly_target numeric DEFAULT 0,
    opening_hours jsonb,
    priority_order integer DEFAULT 0,
    latitude numeric,
    longitude numeric,
    timezone text DEFAULT 'Africa/Dar_es_Salaam'::text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_store_shelves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_store_shelves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid,
    name text NOT NULL,
    "position" text,
    capacity integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    store_location_id uuid,
    storage_room_id uuid,
    code text,
    description text,
    shelf_type text DEFAULT 'standard'::text,
    section text,
    aisle text,
    row_number integer,
    column_number integer,
    max_capacity integer,
    current_capacity integer DEFAULT 0,
    floor_level integer DEFAULT 0,
    zone text,
    is_accessible boolean DEFAULT true,
    requires_ladder boolean DEFAULT false,
    is_refrigerated boolean DEFAULT false,
    priority_order integer DEFAULT 0,
    color_code text,
    barcode text,
    notes text,
    images text[] DEFAULT ARRAY[]::text[],
    created_by uuid,
    updated_by uuid
);


--
-- Name: TABLE lats_store_shelves; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_store_shelves IS 'Storage shelves within rooms';


--
-- Name: lats_supplier_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_supplier_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    color text,
    parent_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_supplier_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_categories IS 'Categories for organizing suppliers (Electronics, Phones, Accessories, etc.)';


--
-- Name: lats_supplier_category_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_supplier_category_mapping (
    supplier_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_supplier_category_mapping; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_category_mapping IS 'Many-to-many relationship between suppliers and categories';


--
-- Name: lats_supplier_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_supplier_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    communication_type text NOT NULL,
    direction text DEFAULT 'outbound'::text,
    subject text,
    message text,
    notes text,
    contact_person text,
    response_time_hours integer,
    follow_up_required boolean DEFAULT false,
    follow_up_date date,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_supplier_communications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_communications IS 'Tracks all communications with suppliers for relationship management';


--
-- Name: lats_supplier_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_supplier_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    contract_number text,
    contract_name text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    contract_value numeric(15,2),
    currency text DEFAULT 'TZS'::text,
    auto_renew boolean DEFAULT false,
    renewal_notice_days integer DEFAULT 30,
    payment_terms text,
    terms_and_conditions text,
    document_url text,
    status text DEFAULT 'active'::text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_supplier_contracts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_contracts IS 'Manages supplier contracts with expiry tracking and renewal reminders';


--
-- Name: lats_supplier_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_supplier_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    document_type text NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    mime_type text,
    expiry_date date,
    notes text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_supplier_documents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_documents IS 'Stores all supplier-related documents (contracts, licenses, certificates, etc.)';


--
-- Name: lats_supplier_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_supplier_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    purchase_order_id uuid,
    overall_rating integer,
    quality_rating integer,
    delivery_rating integer,
    communication_rating integer,
    price_rating integer,
    review_text text,
    pros text,
    cons text,
    would_recommend boolean DEFAULT true,
    rated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lats_supplier_ratings_communication_rating_check CHECK (((communication_rating >= 1) AND (communication_rating <= 5))),
    CONSTRAINT lats_supplier_ratings_delivery_rating_check CHECK (((delivery_rating >= 1) AND (delivery_rating <= 5))),
    CONSTRAINT lats_supplier_ratings_overall_rating_check CHECK (((overall_rating >= 1) AND (overall_rating <= 5))),
    CONSTRAINT lats_supplier_ratings_price_rating_check CHECK (((price_rating >= 1) AND (price_rating <= 5))),
    CONSTRAINT lats_supplier_ratings_quality_rating_check CHECK (((quality_rating >= 1) AND (quality_rating <= 5)))
);


--
-- Name: TABLE lats_supplier_ratings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_ratings IS 'Stores ratings and reviews for supplier performance tracking';


--
-- Name: lats_supplier_tag_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_supplier_tag_mapping (
    supplier_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lats_supplier_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_supplier_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_supplier_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_supplier_tags IS 'Custom tags for flexible supplier organization';


--
-- Name: lats_trade_in_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_trade_in_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_number text NOT NULL,
    transaction_id uuid,
    customer_id uuid NOT NULL,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_email text,
    customer_address text,
    customer_id_number text NOT NULL,
    customer_id_type text NOT NULL,
    customer_id_photo_url text,
    device_name text NOT NULL,
    device_model text NOT NULL,
    device_imei text NOT NULL,
    device_serial_number text,
    device_condition text NOT NULL,
    agreed_value numeric NOT NULL,
    terms_and_conditions text NOT NULL,
    ownership_declaration text NOT NULL,
    customer_agreed_terms boolean DEFAULT false,
    customer_signature_data text,
    staff_signature_data text,
    customer_signed_at timestamp with time zone,
    staff_signed_at timestamp with time zone,
    witness_name text,
    witness_signature_data text,
    witness_signed_at timestamp with time zone,
    status text DEFAULT 'draft'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    voided_at timestamp with time zone,
    voided_by uuid,
    void_reason text
);


--
-- Name: TABLE lats_trade_in_contracts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_trade_in_contracts IS 'Legal contracts for device trade-in purchases';


--
-- Name: lats_trade_in_damage_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_trade_in_damage_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid,
    damage_type text NOT NULL,
    damage_description text,
    spare_part_id uuid,
    spare_part_name text,
    deduction_amount numeric DEFAULT 0 NOT NULL,
    assessed_by uuid,
    assessed_at timestamp with time zone DEFAULT now(),
    damage_photos jsonb
);


--
-- Name: TABLE lats_trade_in_damage_assessments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_trade_in_damage_assessments IS 'Detailed damage assessments with spare part pricing';


--
-- Name: lats_trade_in_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_trade_in_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    variant_id uuid,
    device_name text NOT NULL,
    device_model text NOT NULL,
    base_trade_in_price numeric DEFAULT 0 NOT NULL,
    branch_id uuid,
    excellent_multiplier numeric DEFAULT 1.0,
    good_multiplier numeric DEFAULT 0.85,
    fair_multiplier numeric DEFAULT 0.70,
    poor_multiplier numeric DEFAULT 0.50,
    notes text,
    is_active boolean DEFAULT true,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_trade_in_prices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_trade_in_prices IS 'Base trade-in pricing for device models';


--
-- Name: lats_trade_in_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_trade_in_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lats_trade_in_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_trade_in_settings IS 'Settings and configuration for trade-in system';


--
-- Name: lats_trade_in_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lats_trade_in_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_number text NOT NULL,
    customer_id uuid NOT NULL,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    device_name text NOT NULL,
    device_model text NOT NULL,
    device_imei text,
    device_serial_number text,
    base_trade_in_price numeric DEFAULT 0 NOT NULL,
    condition_rating text NOT NULL,
    condition_multiplier numeric DEFAULT 1.0 NOT NULL,
    condition_description text,
    total_damage_deductions numeric DEFAULT 0,
    damage_items jsonb,
    final_trade_in_value numeric DEFAULT 0 NOT NULL,
    new_product_id uuid,
    new_variant_id uuid,
    new_device_price numeric,
    customer_payment_amount numeric DEFAULT 0,
    contract_id uuid,
    contract_signed boolean DEFAULT false,
    contract_signed_at timestamp with time zone,
    customer_signature_data text,
    staff_signature_data text,
    customer_id_number text,
    customer_id_type text,
    customer_id_photo_url text,
    device_photos jsonb,
    status text DEFAULT 'pending'::text,
    inventory_item_id uuid,
    needs_repair boolean DEFAULT false,
    repair_status text,
    repair_cost numeric DEFAULT 0,
    ready_for_resale boolean DEFAULT false,
    resale_price numeric,
    sale_id uuid,
    created_by uuid,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    staff_notes text,
    internal_notes text
);


--
-- Name: TABLE lats_trade_in_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lats_trade_in_transactions IS 'Records of device trade-in transactions';


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    leave_type character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_days integer NOT NULL,
    reason text NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    attachment_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: loyalty_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    branch_id uuid,
    points numeric DEFAULT 0 NOT NULL,
    points_type text NOT NULL,
    reason text,
    reference_id uuid,
    reference_type text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT loyalty_points_points_type_check CHECK ((points_type = ANY (ARRAY['earned'::text, 'purchased'::text, 'redeemed'::text, 'expired'::text, 'adjusted'::text])))
);


--
-- Name: TABLE loyalty_points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.loyalty_points IS 'Customer loyalty points tracking';


--
-- Name: message_recipient_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.message_recipient_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    branch_id uuid,
    name character varying(255) NOT NULL,
    description text,
    recipients jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_recipients integer DEFAULT 0 NOT NULL,
    category character varying(50),
    tags text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_used_at timestamp with time zone
);


--
-- Name: TABLE message_recipient_lists; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.message_recipient_lists IS 'Saved recipient lists for quick selection';


--
-- Name: mobile_money_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.mobile_money_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    transaction_type text NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency text DEFAULT 'TZS'::text,
    sender_phone text,
    sender_name text,
    receiver_phone text,
    receiver_name text,
    bank_name text,
    bank_account text,
    reference_number text,
    balance_after numeric(15,2),
    fees numeric(15,2) DEFAULT 0,
    tax numeric(15,2) DEFAULT 0,
    message_body text,
    message_date timestamp with time zone,
    customer_id uuid,
    payment_transaction_id uuid,
    is_processed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    branch_id uuid
);


--
-- Name: TABLE mobile_money_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mobile_money_transactions IS 'Stores mobile money transactions from SMS notifications (TigoPesa, M-Pesa, Airtel Money, etc.)';


--
-- Name: COLUMN mobile_money_transactions.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mobile_money_transactions.branch_id IS 'Branch ID for data isolation';


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id text DEFAULT auth.user_id() NOT NULL,
    title text DEFAULT 'untitled note'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    shared boolean DEFAULT false
);


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name text NOT NULL,
    notification_type text NOT NULL,
    title text,
    message text NOT NULL,
    variables jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    priority text DEFAULT 'normal'::text,
    status text DEFAULT 'unread'::text,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    actioned_at timestamp with time zone,
    dismissed_at timestamp with time zone,
    actioned_by uuid,
    dismissed_by uuid,
    device_id uuid,
    customer_id uuid,
    appointment_id uuid,
    diagnostic_id uuid,
    icon text,
    color text,
    action_url text,
    action_text text,
    metadata jsonb,
    group_id uuid,
    is_grouped boolean DEFAULT false,
    group_count integer DEFAULT 0,
    branch_id uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: paragraphs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.paragraphs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    note_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id text,
    provider text NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency text DEFAULT 'TZS'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    customer_id uuid,
    customer_name text,
    customer_email text,
    customer_phone text,
    reference text,
    metadata jsonb,
    sale_id uuid,
    pos_session_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    is_shared boolean DEFAULT true,
    branch_id uuid,
    CONSTRAINT payment_transactions_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT payment_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: TABLE payment_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_transactions IS 'Payment transaction records from various sources';


--
-- Name: points_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.points_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    transaction_type text NOT NULL,
    points_change integer NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    device_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    branch_id uuid,
    CONSTRAINT points_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['earned'::text, 'spent'::text, 'adjusted'::text, 'redeemed'::text, 'expired'::text])))
);


--
-- Name: COLUMN points_transactions.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.points_transactions.branch_id IS 'Branch ID for data isolation';


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    image_url text NOT NULL,
    thumbnail_url text,
    file_name text NOT NULL,
    file_size integer DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    mime_type text
);


--
-- Name: product_interests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.product_interests (
    interest_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    product_category text,
    product_name text,
    interest_level text,
    first_mentioned timestamp without time zone,
    last_mentioned timestamp without time zone,
    mention_count integer DEFAULT 1
);


--
-- Name: product_interests_interest_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_interests_interest_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_interests_interest_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_interests_interest_id_seq OWNED BY public.product_interests.interest_id;


--
-- Name: product_variants_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.product_variants_view AS
 SELECT id,
    product_id,
    COALESCE(
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM information_schema.columns
              WHERE (((columns.table_name)::name = 'lats_product_variants'::name) AND ((columns.column_name)::name = 'variant_name'::name)))) THEN variant_name
            ELSE NULL::text
        END,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM information_schema.columns
              WHERE (((columns.table_name)::name = 'lats_product_variants'::name) AND ((columns.column_name)::name = 'name'::name)))) THEN name
            ELSE NULL::text
        END, 'Default'::text) AS variant_name,
    sku,
    barcode,
    cost_price,
    unit_price,
    COALESCE(selling_price, unit_price, (0)::numeric) AS selling_price,
    quantity,
    min_quantity,
    COALESCE(
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM information_schema.columns
              WHERE (((columns.table_name)::name = 'lats_product_variants'::name) AND ((columns.column_name)::name = 'variant_attributes'::name)))) THEN variant_attributes
            ELSE NULL::jsonb
        END,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM information_schema.columns
              WHERE (((columns.table_name)::name = 'lats_product_variants'::name) AND ((columns.column_name)::name = 'attributes'::name)))) THEN attributes
            ELSE NULL::jsonb
        END, '{}'::jsonb) AS attributes,
    is_active,
    created_at,
    updated_at
   FROM public.lats_product_variants;


--
-- Name: purchase_order_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.purchase_order_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    action text NOT NULL,
    user_id uuid,
    created_by uuid,
    details text,
    "timestamp" timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: purchase_order_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.purchase_order_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    sender text NOT NULL,
    content text NOT NULL,
    type text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT purchase_order_messages_type_check CHECK ((type = ANY (ARRAY['system'::text, 'user'::text, 'supplier'::text])))
);


--
-- Name: purchase_order_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.purchase_order_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    payment_account_id uuid,
    amount numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'TZS'::character varying,
    payment_method character varying(50),
    payment_method_id uuid,
    reference text,
    notes text,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    payment_date timestamp with time zone DEFAULT now(),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    CONSTRAINT purchase_order_payments_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text])))
);


--
-- Name: TABLE purchase_order_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.purchase_order_payments IS 'Stores payment records for purchase orders with full payment method and account tracking';


--
-- Name: COLUMN purchase_order_payments.payment_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_order_payments.payment_account_id IS 'Reference to the finance account used for payment';


--
-- Name: COLUMN purchase_order_payments.currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_order_payments.currency IS 'Currency code for the payment (TZS, USD, EUR, etc.)';


--
-- Name: COLUMN purchase_order_payments.payment_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_order_payments.payment_method IS 'Name of the payment method (Cash, Bank Transfer, etc.)';


--
-- Name: COLUMN purchase_order_payments.payment_method_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_order_payments.payment_method_id IS 'Reference to the payment method configuration';


--
-- Name: COLUMN purchase_order_payments.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_order_payments.branch_id IS 'Branch ID for data isolation';


--
-- Name: purchase_order_quality_check_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.purchase_order_quality_check_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quality_check_id uuid NOT NULL,
    purchase_order_item_id uuid NOT NULL,
    criteria_id uuid,
    criteria_name text NOT NULL,
    result text,
    quantity_checked integer DEFAULT 0,
    quantity_passed integer DEFAULT 0,
    quantity_failed integer DEFAULT 0,
    defect_type text,
    defect_description text,
    action_taken text,
    notes text,
    images jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT purchase_order_quality_check_items_action_taken_check CHECK ((action_taken = ANY (ARRAY['accept'::text, 'reject'::text, 'return'::text, 'replace'::text, 'repair'::text]))),
    CONSTRAINT purchase_order_quality_check_items_defect_type_check CHECK ((defect_type = ANY (ARRAY['physical_damage'::text, 'functional_issue'::text, 'missing_parts'::text, 'cosmetic_defect'::text, 'other'::text]))),
    CONSTRAINT purchase_order_quality_check_items_result_check CHECK ((result = ANY (ARRAY['pass'::text, 'fail'::text, 'na'::text])))
);


--
-- Name: TABLE purchase_order_quality_check_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.purchase_order_quality_check_items IS 'Individual check results for each item and criteria';


--
-- Name: purchase_order_quality_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.purchase_order_quality_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    template_id text,
    status text DEFAULT 'pending'::text,
    overall_result text,
    checked_by uuid,
    checked_at timestamp with time zone,
    notes text,
    signature text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT purchase_order_quality_checks_overall_result_check CHECK ((overall_result = ANY (ARRAY['pass'::text, 'fail'::text, 'conditional'::text]))),
    CONSTRAINT purchase_order_quality_checks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'passed'::text, 'failed'::text, 'partial'::text])))
);


--
-- Name: TABLE purchase_order_quality_checks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.purchase_order_quality_checks IS 'Main quality check records for purchase orders';


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    branch_id uuid,
    order_number text,
    total_amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text,
    expected_delivery_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: quality_check_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.quality_check_criteria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id text NOT NULL,
    name text NOT NULL,
    description text,
    is_required boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE quality_check_criteria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.quality_check_criteria IS 'Individual check criteria for each template';


--
-- Name: quality_check_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.quality_check_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id text,
    check_name text NOT NULL,
    check_description text,
    check_type text DEFAULT 'boolean'::text,
    is_required boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT quality_check_items_check_type_check CHECK ((check_type = ANY (ARRAY['boolean'::text, 'numeric'::text, 'text'::text])))
);


--
-- Name: quality_check_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.quality_check_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quality_check_id uuid,
    check_item_id uuid,
    result boolean,
    numeric_value numeric(10,2),
    text_value text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: quality_check_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.quality_check_templates (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    category text DEFAULT 'general'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: TABLE quality_check_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.quality_check_templates IS 'Stores reusable quality check templates';


--
-- Name: quality_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.quality_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid,
    template_id text,
    status text DEFAULT 'in_progress'::text,
    checked_by uuid,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    is_shared boolean DEFAULT false,
    CONSTRAINT quality_checks_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: recurring_expense_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.recurring_expense_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recurring_expense_id uuid NOT NULL,
    transaction_id uuid,
    processed_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    status text DEFAULT 'processed'::text NOT NULL,
    failure_reason text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT recurring_expense_history_status_check CHECK ((status = ANY (ARRAY['processed'::text, 'failed'::text, 'skipped'::text, 'pending'::text])))
);


--
-- Name: recurring_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.recurring_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    account_id uuid NOT NULL,
    category text NOT NULL,
    amount numeric(15,2) NOT NULL,
    frequency text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    next_due_date date NOT NULL,
    last_processed_date date,
    vendor_name text,
    reference_prefix text,
    auto_process boolean DEFAULT true,
    is_active boolean DEFAULT true,
    notification_days_before integer DEFAULT 3,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    branch_id uuid,
    is_shared boolean DEFAULT false,
    CONSTRAINT recurring_expenses_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT recurring_expenses_frequency_check CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text])))
);


--
-- Name: TABLE recurring_expenses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.recurring_expenses IS 'Recurring/scheduled expense definitions';


--
-- Name: COLUMN recurring_expenses.frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.recurring_expenses.frequency IS 'How often the expense recurs: daily, weekly, monthly, yearly';


--
-- Name: COLUMN recurring_expenses.next_due_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.recurring_expenses.next_due_date IS 'Next date when this expense should be processed';


--
-- Name: COLUMN recurring_expenses.auto_process; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.recurring_expenses.auto_process IS 'If true, expense is automatically created; if false, only notification is sent';


--
-- Name: reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    date date NOT NULL,
    "time" time without time zone NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notify_before integer DEFAULT 30,
    related_to jsonb,
    assigned_to uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    branch_id uuid,
    recurring jsonb,
    CONSTRAINT reminders_category_check CHECK ((category = ANY (ARRAY['general'::text, 'device'::text, 'customer'::text, 'appointment'::text, 'payment'::text, 'other'::text]))),
    CONSTRAINT reminders_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT reminders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: repair_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.repair_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid,
    spare_part_id uuid,
    quantity_needed integer DEFAULT 1,
    quantity_received integer DEFAULT 0,
    cost_per_unit numeric DEFAULT 0,
    total_cost numeric DEFAULT 0,
    status text DEFAULT 'needed'::text,
    notes text,
    estimated_arrival timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    branch_id uuid
);


--
-- Name: report_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.report_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size integer,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE report_attachments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.report_attachments IS 'Table for storing file attachments related to reports';


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    report_type character varying(50) NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying,
    status character varying(20) DEFAULT 'open'::character varying,
    created_by uuid,
    branch_id uuid,
    assigned_to uuid,
    customer_name character varying(255),
    customer_phone character varying(20),
    contact_method character varying(20),
    device_info text,
    issue_category character varying(100),
    resolution_status character varying(20),
    transaction_amount numeric(12,2),
    transaction_type character varying(50),
    payment_method character varying(50),
    product_info text,
    quantity_affected integer,
    stock_level integer,
    location character varying(255),
    occurred_at timestamp with time zone,
    tags text[] DEFAULT '{}'::text[],
    follow_up_required boolean DEFAULT false,
    follow_up_date timestamp with time zone,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reports_contact_method_check CHECK (((contact_method)::text = ANY (ARRAY[('call'::character varying)::text, ('whatsapp'::character varying)::text, ('sms'::character varying)::text, ('in-person'::character varying)::text]))),
    CONSTRAINT reports_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text, ('urgent'::character varying)::text]))),
    CONSTRAINT reports_resolution_status_check CHECK (((resolution_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in-progress'::character varying)::text, ('resolved'::character varying)::text, ('escalated'::character varying)::text]))),
    CONSTRAINT reports_status_check CHECK (((status)::text = ANY (ARRAY[('open'::character varying)::text, ('in-progress'::character varying)::text, ('resolved'::character varying)::text, ('closed'::character varying)::text])))
);


--
-- Name: TABLE reports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reports IS 'Main table for storing all types of reports and incidents';


--
-- Name: COLUMN reports.report_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reports.report_type IS 'Type of report: customer-call, whatsapp-inquiry, device-repair, etc.';


--
-- Name: COLUMN reports.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reports.priority IS 'Priority level: low, medium, high, urgent';


--
-- Name: COLUMN reports.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reports.status IS 'Current status: open, in-progress, resolved, closed';


--
-- Name: COLUMN reports.contact_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reports.contact_method IS 'How the customer contacted: call, whatsapp, sms, in-person';


--
-- Name: returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid,
    manual_device_brand character varying(255),
    manual_device_model character varying(255),
    manual_device_serial character varying(255),
    customer_id uuid NOT NULL,
    reason text NOT NULL,
    intake_checklist jsonb,
    status character varying(50) DEFAULT 'under-return-review'::character varying,
    attachments jsonb,
    resolution text,
    staff_signature text,
    customer_signature text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    purchase_date date,
    return_type character varying(50),
    branch character varying(255),
    staff_name character varying(255),
    contact_confirmed boolean DEFAULT false,
    accessories jsonb,
    condition_description text,
    customer_reported_issue text,
    staff_observed_issue text,
    customer_satisfaction integer,
    preferred_contact character varying(50),
    return_auth_number character varying(100),
    return_method character varying(50),
    return_shipping_fee numeric(10,2),
    expected_pickup_date date,
    geo_location jsonb,
    policy_acknowledged boolean DEFAULT false,
    device_locked character varying(50),
    privacy_wiped boolean DEFAULT false,
    internal_notes text,
    escalation_required boolean DEFAULT false,
    additional_docs jsonb,
    refund_amount numeric(10,2),
    exchange_device_id uuid,
    restocking_fee numeric(10,2),
    refund_method character varying(50),
    user_ip character varying(50),
    user_location character varying(255)
);


--
-- Name: sale_inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sale_inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    inventory_item_id uuid NOT NULL,
    customer_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE sale_inventory_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sale_inventory_items IS 'Links sales to specific inventory items (serial numbers) that were sold';


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    branch_id uuid,
    total_amount numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    payment_method text,
    status text DEFAULT 'completed'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sales_pipeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sales_pipeline (
    sale_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    product text,
    quoted_price numeric(10,2),
    stage text DEFAULT 'inquiry'::text,
    probability integer DEFAULT 0,
    expected_close_date date,
    actual_close_date date,
    sale_amount numeric(10,2),
    status text DEFAULT 'open'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sales_pipeline_sale_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_pipeline_sale_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_pipeline_sale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_pipeline_sale_id_seq OWNED BY public.sales_pipeline.sale_id;


--
-- Name: scheduled_bulk_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.scheduled_bulk_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    created_by uuid,
    branch_id uuid,
    name character varying(255) NOT NULL,
    message_type character varying(20) NOT NULL,
    message_content text NOT NULL,
    media_url text,
    media_type character varying(20),
    view_once boolean DEFAULT false,
    recipients jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_recipients integer DEFAULT 0 NOT NULL,
    schedule_type character varying(30) NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    timezone character varying(100) DEFAULT 'Africa/Dar_es_Salaam'::character varying,
    recurrence_pattern jsonb,
    recurrence_end_date timestamp with time zone,
    execution_mode character varying(20) NOT NULL,
    auto_execute boolean DEFAULT true,
    settings jsonb DEFAULT '{"max_delay": 8000, "min_delay": 3000, "batch_size": 50, "random_delay": true, "use_presence": true, "use_personalization": true}'::jsonb,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    last_executed_at timestamp with time zone,
    next_execution_at timestamp with time zone,
    execution_count integer DEFAULT 0,
    progress jsonb DEFAULT '{"total": 0, "failed": 0, "current": 0, "pending": 0, "success": 0}'::jsonb,
    failed_recipients jsonb DEFAULT '[]'::jsonb,
    error_message text,
    last_error_at timestamp with time zone,
    campaign_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    notes text,
    CONSTRAINT scheduled_bulk_messages_execution_mode_check CHECK (((execution_mode)::text = ANY ((ARRAY['server'::character varying, 'browser'::character varying])::text[]))),
    CONSTRAINT scheduled_bulk_messages_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying, 'document'::character varying, 'audio'::character varying])::text[]))),
    CONSTRAINT scheduled_bulk_messages_message_type_check CHECK (((message_type)::text = ANY ((ARRAY['sms'::character varying, 'whatsapp'::character varying])::text[]))),
    CONSTRAINT scheduled_bulk_messages_schedule_type_check CHECK (((schedule_type)::text = ANY ((ARRAY['once'::character varying, 'recurring_daily'::character varying, 'recurring_weekly'::character varying, 'recurring_monthly'::character varying, 'recurring_custom'::character varying])::text[]))),
    CONSTRAINT scheduled_bulk_messages_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'scheduled'::character varying, 'running'::character varying, 'paused'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE scheduled_bulk_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scheduled_bulk_messages IS 'Main table for scheduled bulk SMS and WhatsApp messages';


--
-- Name: COLUMN scheduled_bulk_messages.schedule_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_bulk_messages.schedule_type IS 'Type of schedule: once, recurring_daily, recurring_weekly, recurring_monthly, recurring_custom';


--
-- Name: COLUMN scheduled_bulk_messages.recurrence_pattern; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_bulk_messages.recurrence_pattern IS 'JSON config for recurring messages: {days: [1,3,5], time: "09:00", end_date: "2025-12-31"}';


--
-- Name: COLUMN scheduled_bulk_messages.execution_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_bulk_messages.execution_mode IS 'server = runs on backend, browser = runs in client browser';


--
-- Name: scheduled_message_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.scheduled_message_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scheduled_message_id uuid,
    executed_at timestamp with time zone DEFAULT now(),
    execution_duration integer,
    total_sent integer DEFAULT 0,
    success_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    status character varying(20),
    failed_recipients jsonb DEFAULT '[]'::jsonb,
    error_message text,
    executed_by character varying(20),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT scheduled_message_executions_executed_by_check CHECK (((executed_by)::text = ANY ((ARRAY['server'::character varying, 'browser'::character varying, 'manual'::character varying])::text[]))),
    CONSTRAINT scheduled_message_executions_status_check CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'partial'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: TABLE scheduled_message_executions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scheduled_message_executions IS 'History of scheduled message executions';


--
-- Name: scheduled_transfer_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.scheduled_transfer_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scheduled_transfer_id uuid NOT NULL,
    execution_date timestamp with time zone DEFAULT now(),
    amount numeric(15,2) NOT NULL,
    status character varying(20) NOT NULL,
    source_transaction_id uuid,
    destination_transaction_id uuid,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT scheduled_transfer_executions_status_check CHECK (((status)::text = ANY (ARRAY[('success'::character varying)::text, ('failed'::character varying)::text, ('pending'::character varying)::text, ('skipped'::character varying)::text])))
);


--
-- Name: TABLE scheduled_transfer_executions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scheduled_transfer_executions IS 'Logs execution history of scheduled transfers';


--
-- Name: scheduled_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.scheduled_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_account_id uuid NOT NULL,
    destination_account_id uuid NOT NULL,
    amount numeric(15,2) NOT NULL,
    description text NOT NULL,
    reference_prefix character varying(50) DEFAULT 'SCHED-TRF'::character varying,
    frequency character varying(20) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    next_execution_date date NOT NULL,
    last_executed_date date,
    auto_execute boolean DEFAULT true,
    notification_enabled boolean DEFAULT true,
    notification_days_before integer DEFAULT 1,
    is_active boolean DEFAULT true,
    execution_count integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT scheduled_transfers_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT scheduled_transfers_frequency_check CHECK (((frequency)::text = ANY (ARRAY[('daily'::character varying)::text, ('weekly'::character varying)::text, ('biweekly'::character varying)::text, ('monthly'::character varying)::text, ('quarterly'::character varying)::text, ('yearly'::character varying)::text])))
);


--
-- Name: TABLE scheduled_transfers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scheduled_transfers IS 'Stores recurring scheduled transfers between accounts';


--
-- Name: serial_number_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.serial_number_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inventory_item_id uuid NOT NULL,
    movement_type text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    reference_id uuid,
    reference_type text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT serial_number_movements_movement_type_check CHECK ((movement_type = ANY (ARRAY['received'::text, 'sold'::text, 'returned'::text, 'transferred'::text, 'adjusted'::text])))
);


--
-- Name: TABLE serial_number_movements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.serial_number_movements IS 'Tracks all movements and status changes of inventory items';


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    description text
);


--
-- Name: shelves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shelves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    storage_room_id uuid,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    row_number integer,
    column_number integer,
    capacity integer,
    is_refrigerated boolean DEFAULT false,
    requires_ladder boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE shelves; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.shelves IS 'Individual shelves within storage rooms';


--
-- Name: shift_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shift_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    break_duration_minutes integer DEFAULT 0,
    monday boolean DEFAULT true,
    tuesday boolean DEFAULT true,
    wednesday boolean DEFAULT true,
    thursday boolean DEFAULT true,
    friday boolean DEFAULT true,
    saturday boolean DEFAULT false,
    sunday boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: simple_inventory_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.simple_inventory_view AS
 SELECT p.id,
    p.name,
    COALESCE(p.description, 'No description available'::text) AS description,
    COALESCE(p.sku, ('SKU-'::text || "substring"((p.id)::text, 1, 8))) AS sku,
    COALESCE(c.name, 'Uncategorized'::text) AS category,
    COALESCE(s.name, 'No Supplier'::text) AS supplier,
        CASE
            WHEN ((p.unit_price IS NULL) OR (p.unit_price = (0)::numeric)) THEN (1)::numeric
            ELSE p.unit_price
        END AS unit_price,
    COALESCE(p.cost_price, (0)::numeric) AS cost_price,
        CASE
            WHEN ((p.selling_price IS NULL) OR (p.selling_price = (0)::numeric)) THEN
            CASE
                WHEN ((p.unit_price IS NULL) OR (p.unit_price = (0)::numeric)) THEN (1)::numeric
                ELSE p.unit_price
            END
            ELSE p.selling_price
        END AS selling_price,
    p.stock_quantity,
        CASE
            WHEN (p.stock_quantity <= 0) THEN 'out-of-stock'::text
            WHEN (p.stock_quantity <= p.min_stock_level) THEN 'low-stock'::text
            ELSE 'in-stock'::text
        END AS status,
    COALESCE(p.image_url, 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='::text) AS image_url,
    p.brand,
    p.model,
    p.condition,
    ( SELECT count(*) AS count
           FROM public.lats_product_variants v
          WHERE ((v.product_id = p.id) AND (v.is_active = true))) AS variant_count,
    ( SELECT json_agg(json_build_object('id', v.id, 'name', v.name, 'sku', v.sku, 'unitPrice', COALESCE(v.unit_price, (0)::numeric), 'costPrice', COALESCE(v.cost_price, (0)::numeric), 'sellingPrice', COALESCE(v.selling_price, v.unit_price, (0)::numeric), 'stock', COALESCE(v.quantity, 0), 'isActive', v.is_active)) AS json_agg
           FROM public.lats_product_variants v
          WHERE ((v.product_id = p.id) AND (v.is_active = true))) AS variants,
    p.created_at,
    p.updated_at
   FROM ((public.lats_products p
     LEFT JOIN public.lats_categories c ON ((p.category_id = c.id)))
     LEFT JOIN public.lats_suppliers s ON ((p.supplier_id = s.id)))
  WHERE (p.is_active = true);


--
-- Name: sms_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sms_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_phone text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'pending'::text,
    provider text,
    message_id text,
    cost numeric,
    sent_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    phone_number text,
    sent_by uuid,
    device_id uuid,
    branch_id uuid,
    is_shared boolean DEFAULT false
);


--
-- Name: TABLE sms_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sms_logs IS 'Logs all SMS messages sent through the system';


--
-- Name: sms_trigger_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sms_trigger_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trigger_id uuid,
    recipient text,
    result text,
    status text,
    error text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sms_triggers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sms_triggers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trigger_name text NOT NULL,
    trigger_event text NOT NULL,
    template_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    name text,
    trigger_type text,
    message_template uuid,
    created_by uuid
);


--
-- Name: special_order_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.special_order_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    special_order_id uuid,
    customer_id uuid,
    amount numeric NOT NULL,
    payment_method text NOT NULL,
    payment_date timestamp with time zone DEFAULT now(),
    reference_number text,
    account_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    branch_id uuid
);


--
-- Name: TABLE special_order_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.special_order_payments IS 'Payments made towards special orders';


--
-- Name: COLUMN special_order_payments.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.special_order_payments.branch_id IS 'Branch ID for data isolation';


--
-- Name: special_orders; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.special_orders AS
 SELECT id,
    order_number,
    customer_id,
    branch_id,
    product_name,
    product_description,
    quantity,
    unit_price,
    total_amount,
    deposit_paid,
    balance_due,
    status,
    order_date,
    expected_arrival_date,
    actual_arrival_date,
    delivery_date,
    supplier_name,
    supplier_reference,
    country_of_origin,
    tracking_number,
    notes,
    internal_notes,
    customer_notified_arrival,
    created_by,
    created_at,
    updated_at
   FROM public.customer_special_orders;


--
-- Name: storage_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.storage_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    store_location_id uuid,
    floor_level integer DEFAULT 1,
    area_sqm numeric(10,2),
    is_secure boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE storage_rooms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.storage_rooms IS 'Physical storage rooms in store locations';


--
-- Name: supplier_contracts_expiring; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supplier_contracts_expiring AS
 SELECT s.id AS supplier_id,
    s.name AS supplier_name,
    c.id AS contract_id,
    c.contract_number,
    c.contract_name,
    c.end_date,
    c.contract_value,
    c.auto_renew,
    (c.end_date - CURRENT_DATE) AS days_until_expiry
   FROM (public.lats_suppliers s
     JOIN public.lats_supplier_contracts c ON ((s.id = c.supplier_id)))
  WHERE ((c.status = 'active'::text) AND (c.end_date >= CURRENT_DATE) AND (c.end_date <= (CURRENT_DATE + '90 days'::interval)))
  ORDER BY c.end_date;


--
-- Name: VIEW supplier_contracts_expiring; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.supplier_contracts_expiring IS 'Shows contracts expiring in the next 90 days';


--
-- Name: supplier_documents_expiring; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supplier_documents_expiring AS
 SELECT s.id AS supplier_id,
    s.name AS supplier_name,
    d.id AS document_id,
    d.document_type,
    d.file_name,
    d.expiry_date,
    (d.expiry_date - CURRENT_DATE) AS days_until_expiry
   FROM (public.lats_suppliers s
     JOIN public.lats_supplier_documents d ON ((s.id = d.supplier_id)))
  WHERE ((d.expiry_date IS NOT NULL) AND (d.expiry_date >= CURRENT_DATE) AND (d.expiry_date <= (CURRENT_DATE + '60 days'::interval)))
  ORDER BY d.expiry_date;


--
-- Name: VIEW supplier_documents_expiring; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.supplier_documents_expiring IS 'Shows supplier documents expiring in the next 60 days';


--
-- Name: supplier_performance_dashboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supplier_performance_dashboard AS
 SELECT id,
    name,
    company_name,
    country,
    total_orders,
    total_order_value,
    average_rating,
    on_time_delivery_rate,
    response_time_hours,
    quality_score,
    last_contact_date,
    priority_level,
    ( SELECT count(*) AS count
           FROM public.lats_supplier_communications
          WHERE ((lats_supplier_communications.supplier_id = s.id) AND (lats_supplier_communications.created_at > (now() - '30 days'::interval)))) AS communications_last_30_days,
    ( SELECT count(*) AS count
           FROM public.lats_purchase_orders
          WHERE ((lats_purchase_orders.supplier_id = s.id) AND (lats_purchase_orders.created_at > (now() - '30 days'::interval)))) AS orders_last_30_days,
    ( SELECT max(lats_purchase_orders.order_date) AS max
           FROM public.lats_purchase_orders
          WHERE (lats_purchase_orders.supplier_id = s.id)) AS last_order_date,
        CASE
            WHEN ((average_rating >= 4.5) AND (on_time_delivery_rate >= (90)::numeric)) THEN 'Excellent'::text
            WHEN ((average_rating >= 4.0) AND (on_time_delivery_rate >= (80)::numeric)) THEN 'Good'::text
            WHEN ((average_rating >= 3.0) AND (on_time_delivery_rate >= (70)::numeric)) THEN 'Fair'::text
            ELSE 'Needs Improvement'::text
        END AS performance_status
   FROM public.lats_suppliers s
  WHERE ((is_active = true) AND (is_trade_in_customer IS NOT TRUE))
  ORDER BY average_rating DESC, on_time_delivery_rate DESC;


--
-- Name: VIEW supplier_performance_dashboard; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.supplier_performance_dashboard IS 'Comprehensive view of supplier performance metrics and recent activity';


--
-- Name: supplier_performance_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supplier_performance_summary AS
 SELECT s.id,
    s.name,
    s.average_rating,
    s.total_orders,
    s.total_order_value,
    s.on_time_delivery_rate,
    s.quality_score,
    count(DISTINCT r.id) AS review_count,
    (avg(r.overall_rating))::numeric(3,2) AS calculated_avg_rating,
    max(c.created_at) AS last_communication_date,
    count(DISTINCT d.id) AS document_count
   FROM (((public.lats_suppliers s
     LEFT JOIN public.lats_supplier_ratings r ON ((s.id = r.supplier_id)))
     LEFT JOIN public.lats_supplier_communications c ON ((s.id = c.supplier_id)))
     LEFT JOIN public.lats_supplier_documents d ON ((s.id = d.supplier_id)))
  WHERE ((s.is_active = true) AND ((s.is_trade_in_customer = false) OR (s.is_trade_in_customer IS NULL)))
  GROUP BY s.id, s.name, s.average_rating, s.total_orders, s.total_order_value, s.on_time_delivery_rate, s.quality_score;


--
-- Name: VIEW supplier_performance_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.supplier_performance_summary IS 'Comprehensive supplier performance metrics';


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    company_name text,
    phone text,
    email text,
    address text,
    city text,
    country text,
    tax_id text,
    payment_terms text,
    credit_limit numeric(15,2) DEFAULT 0,
    current_balance numeric(15,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    rating integer DEFAULT 5,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text,
    setting_type text DEFAULT 'string'::text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: todays_attendance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.todays_attendance AS
 SELECT e.id AS employee_id,
    e.first_name,
    e.last_name,
    e.email,
    e."position",
    e.department,
    e.photo_url,
    ar.check_in_time,
    ar.check_out_time,
    ar.status,
    ar.total_hours,
        CASE
            WHEN (ar.check_in_time IS NULL) THEN 'Not Checked In'::text
            WHEN (ar.check_out_time IS NULL) THEN 'Checked In'::text
            ELSE 'Completed'::text
        END AS attendance_status
   FROM (public.employees e
     LEFT JOIN public.attendance_records ar ON (((e.id = ar.employee_id) AND (ar.attendance_date = CURRENT_DATE))))
  WHERE ((e.status)::text = 'active'::text)
  ORDER BY e.first_name, e.last_name;


--
-- Name: user_branch_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_branch_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    can_manage boolean DEFAULT false,
    can_view_reports boolean DEFAULT false,
    can_manage_inventory boolean DEFAULT false,
    can_manage_staff boolean DEFAULT false,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid
);


--
-- Name: user_daily_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_daily_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    goal_amount numeric DEFAULT 0,
    achieved_amount numeric DEFAULT 0,
    is_achieved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    goal_type text DEFAULT 'general'::text NOT NULL,
    is_active boolean DEFAULT true,
    goal_value integer DEFAULT 5 NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id character varying(255) NOT NULL,
    user_id uuid,
    device_info text,
    ip_address inet,
    user_agent text,
    last_activity timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE user_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_sessions IS 'Tracks active user sessions for security and session management';


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_whatsapp_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_whatsapp_preferences (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    active_session_id integer,
    auto_select_session boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE user_whatsapp_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_whatsapp_preferences IS 'Stores user preferences for WhatsApp session selection';


--
-- Name: user_whatsapp_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_whatsapp_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_whatsapp_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_whatsapp_preferences_id_seq OWNED BY public.user_whatsapp_preferences.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    full_name text,
    role text DEFAULT 'user'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    username text,
    permissions text[] DEFAULT ARRAY['all'::text],
    max_devices_allowed integer DEFAULT 1000,
    require_approval boolean DEFAULT false,
    failed_login_attempts integer DEFAULT 0,
    two_factor_enabled boolean DEFAULT false,
    two_factor_secret text,
    last_login timestamp with time zone,
    phone text,
    department text,
    branch_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);


--
-- Name: COLUMN users.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.branch_id IS 'References the branch this user/technician belongs to for multi-branch isolation';


--
-- Name: v_expense_summary_by_category; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_expense_summary_by_category AS
 SELECT ec.category_name,
    count(e.id) AS expense_count,
    COALESCE(sum(e.amount), (0)::numeric) AS total_amount,
    COALESCE(avg(e.amount), (0)::numeric) AS average_amount,
    min(e.expense_date) AS first_expense,
    max(e.expense_date) AS last_expense
   FROM (public.finance_expense_categories ec
     LEFT JOIN public.finance_expenses e ON (((ec.id = e.expense_category_id) AND (e.status = 'approved'::text))))
  GROUP BY ec.category_name
  ORDER BY COALESCE(sum(e.amount), (0)::numeric) DESC;


--
-- Name: v_expenses_with_accounts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_expenses_with_accounts AS
 SELECT e.id,
    e.title,
    e.description,
    e.amount,
    e.expense_date,
    e.payment_method,
    e.status,
    e.receipt_number,
    e.vendor,
    e.created_at,
    ec.category_name,
    ec.description AS category_description,
    fa.name AS account_name,
    fa.type AS account_type,
    fa.currency
   FROM ((public.finance_expenses e
     LEFT JOIN public.finance_expense_categories ec ON ((e.expense_category_id = ec.id)))
     LEFT JOIN public.finance_accounts fa ON ((e.account_id = fa.id)))
  ORDER BY e.expense_date DESC, e.created_at DESC;


--
-- Name: v_has_payment_method_column; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.v_has_payment_method_column (
    "exists" boolean
);


--
-- Name: v_monthly_expense_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_monthly_expense_summary AS
 SELECT date_trunc('month'::text, (expense_date)::timestamp with time zone) AS month,
    count(*) AS expense_count,
    sum(amount) AS total_amount,
    count(DISTINCT expense_category_id) AS categories_used,
    count(DISTINCT account_id) AS accounts_used
   FROM public.finance_expenses
  WHERE (status = 'approved'::text)
  GROUP BY (date_trunc('month'::text, (expense_date)::timestamp with time zone))
  ORDER BY (date_trunc('month'::text, (expense_date)::timestamp with time zone)) DESC;


--
-- Name: v_parent_child_variants; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_parent_child_variants AS
 SELECT p.id AS parent_id,
    p.product_id,
    COALESCE(p.variant_name, p.name) AS parent_variant_name,
    p.sku AS parent_sku,
    p.quantity AS parent_quantity,
    p.cost_price AS parent_cost_price,
    p.selling_price AS parent_selling_price,
    p.is_active AS parent_is_active,
    c.id AS child_id,
    (c.variant_attributes ->> 'imei'::text) AS child_imei,
    (c.variant_attributes ->> 'serial_number'::text) AS child_serial_number,
    (c.variant_attributes ->> 'imei_status'::text) AS child_imei_status,
    c.quantity AS child_quantity,
    c.is_active AS child_is_active,
    c.cost_price AS child_cost_price,
    c.selling_price AS child_selling_price,
    c.created_at AS child_created_at,
    ( SELECT count(*) AS count
           FROM public.lats_product_variants child
          WHERE ((child.parent_variant_id = p.id) AND ((child.variant_type)::text = 'imei_child'::text) AND (child.is_active = true) AND (child.quantity > 0))) AS available_imei_count
   FROM (public.lats_product_variants p
     LEFT JOIN public.lats_product_variants c ON (((c.parent_variant_id = p.id) AND ((c.variant_type)::text = 'imei_child'::text))))
  WHERE (((p.variant_type)::text = 'parent'::text) OR (p.is_parent = true));


--
-- Name: VIEW v_parent_child_variants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_parent_child_variants IS 'View showing parent variants with their IMEI children for easy querying';


--
-- Name: v_parent_variants_with_imei_count; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_parent_variants_with_imei_count AS
 SELECT id AS parent_id,
    product_id,
    variant_name AS parent_variant_name,
    sku AS parent_sku,
    quantity AS parent_quantity,
    cost_price AS parent_cost_price,
    selling_price AS parent_selling_price,
    is_active AS parent_is_active,
    ( SELECT count(*) AS count
           FROM public.lats_product_variants child
          WHERE ((child.parent_variant_id = p.id) AND ((child.variant_type)::text = 'imei_child'::text) AND (child.is_active = true) AND (child.quantity > 0))) AS available_imei_count,
    ( SELECT count(*) AS count
           FROM public.lats_product_variants child
          WHERE ((child.parent_variant_id = p.id) AND ((child.variant_type)::text = 'imei_child'::text))) AS total_imei_count
   FROM public.lats_product_variants p
  WHERE (((variant_type)::text = 'parent'::text) OR (is_parent = true));


--
-- Name: VIEW v_parent_variants_with_imei_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_parent_variants_with_imei_count IS 'View of parent variants with counts of their IMEI children';


--
-- Name: v_system_health_check; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_system_health_check AS
 SELECT 'Total Products'::text AS metric,
    (count(*))::text AS value,
    'products'::text AS category
   FROM public.lats_products
  WHERE (lats_products.is_active = true)
UNION ALL
 SELECT 'Total Variants'::text AS metric,
    (count(*))::text AS value,
    'variants'::text AS category
   FROM public.lats_product_variants
  WHERE (lats_product_variants.is_active = true)
UNION ALL
 SELECT 'Parent Variants'::text AS metric,
    (count(*))::text AS value,
    'variants'::text AS category
   FROM public.lats_product_variants
  WHERE (((lats_product_variants.is_parent = true) OR ((lats_product_variants.variant_type)::text = 'parent'::text)) AND (lats_product_variants.is_active = true))
UNION ALL
 SELECT 'IMEI Child Variants'::text AS metric,
    (count(*))::text AS value,
    'variants'::text AS category
   FROM public.lats_product_variants
  WHERE (((lats_product_variants.variant_type)::text = 'imei_child'::text) AND (lats_product_variants.is_active = true))
UNION ALL
 SELECT 'Valid IMEIs'::text AS metric,
    (count(*))::text AS value,
    'imei_tracking'::text AS category
   FROM public.lats_product_variants
  WHERE (((lats_product_variants.variant_type)::text = 'imei_child'::text) AND ((lats_product_variants.variant_attributes ->> 'imei_status'::text) = ANY (ARRAY['valid'::text, 'available'::text])) AND (lats_product_variants.quantity > 0))
UNION ALL
 SELECT 'Sold IMEIs'::text AS metric,
    (count(*))::text AS value,
    'imei_tracking'::text AS category
   FROM public.lats_product_variants
  WHERE (((lats_product_variants.variant_type)::text = 'imei_child'::text) AND ((lats_product_variants.variant_attributes ->> 'imei_status'::text) = 'sold'::text))
UNION ALL
 SELECT 'Duplicate IMEIs'::text AS metric,
    (count(*))::text AS value,
    'data_quality'::text AS category
   FROM ( SELECT (lats_product_variants.variant_attributes ->> 'imei'::text) AS "?column?"
           FROM public.lats_product_variants
          WHERE ((lats_product_variants.variant_attributes ->> 'imei'::text) IS NOT NULL)
          GROUP BY (lats_product_variants.variant_attributes ->> 'imei'::text)
         HAVING (count(*) > 1)) duplicates
UNION ALL
 SELECT 'Negative Stock Items'::text AS metric,
    (count(*))::text AS value,
    'data_quality'::text AS category
   FROM public.lats_product_variants
  WHERE (lats_product_variants.quantity < 0)
UNION ALL
 SELECT 'Orphaned IMEI Children'::text AS metric,
    (count(*))::text AS value,
    'data_quality'::text AS category
   FROM public.lats_product_variants
  WHERE (((lats_product_variants.variant_type)::text = 'imei_child'::text) AND (lats_product_variants.parent_variant_id IS NOT NULL) AND (NOT (EXISTS ( SELECT 1
           FROM public.lats_product_variants p
          WHERE (p.id = lats_product_variants.parent_variant_id)))))
  ORDER BY 3, 1;


--
-- Name: view_trade_in_transactions_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.view_trade_in_transactions_full AS
 SELECT t.id,
    t.transaction_number,
    t.customer_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    c.email AS customer_email,
    t.branch_id,
    b.name AS branch_name,
    t.device_name,
    t.device_model,
    t.device_imei,
    t.device_serial_number,
    t.base_trade_in_price,
    t.condition_rating,
    t.condition_multiplier,
    t.total_damage_deductions,
    t.final_trade_in_value,
    t.new_product_id,
    p.name AS new_product_name,
    t.new_device_price,
    t.customer_payment_amount,
    t.status,
    t.contract_signed,
    t.needs_repair,
    t.repair_status,
    t.ready_for_resale,
    t.resale_price,
    t.sale_id,
    t.created_by,
    u.name AS created_by_name,
    t.created_at,
    t.updated_at,
    t.completed_at
   FROM ((((public.lats_trade_in_transactions t
     LEFT JOIN public.lats_customers c ON ((t.customer_id = c.id)))
     LEFT JOIN public.lats_branches b ON ((t.branch_id = b.id)))
     LEFT JOIN public.lats_products p ON ((t.new_product_id = p.id)))
     LEFT JOIN public.auth_users u ON ((t.created_by = u.id)));


--
-- Name: webhook_endpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    url text NOT NULL,
    events text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    secret text NOT NULL,
    retry_attempts integer DEFAULT 3,
    timeout_seconds integer DEFAULT 30,
    last_triggered timestamp with time zone,
    success_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: webhook_failures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.webhook_failures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    payload jsonb,
    error_message text,
    retry_count integer DEFAULT 0,
    last_retry_at timestamp with time zone,
    resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE webhook_failures; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhook_failures IS 'Tracks failed webhook processing attempts for monitoring and retry';


--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_id uuid,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    response_status integer,
    response_body text,
    error_message text,
    attempt_number integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_ab_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_ab_tests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    variants jsonb NOT NULL,
    test_size numeric(3,2) DEFAULT 0.10,
    metric character varying(50) DEFAULT 'response_rate'::character varying,
    winner_variant character varying(10),
    results jsonb,
    status character varying(50) DEFAULT 'draft'::character varying,
    test_started_at timestamp without time zone,
    test_completed_at timestamp without time zone,
    winner_sent_at timestamp without time zone,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: whatsapp_antiban_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_antiban_settings (
    id integer NOT NULL,
    user_id integer,
    use_personalization boolean DEFAULT true,
    random_delay boolean DEFAULT true,
    vary_length boolean DEFAULT true,
    skip_recently_contacted boolean DEFAULT true,
    use_invisible_chars boolean DEFAULT true,
    use_emoji_variation boolean DEFAULT true,
    min_delay integer DEFAULT 3,
    max_delay integer DEFAULT 8,
    batch_delay integer DEFAULT 60,
    batch_size integer DEFAULT 20,
    max_per_hour integer DEFAULT 30,
    daily_limit integer DEFAULT 100,
    respect_quiet_hours boolean DEFAULT true,
    use_presence boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: whatsapp_antiban_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapp_antiban_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapp_antiban_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapp_antiban_settings_id_seq OWNED BY public.whatsapp_antiban_settings.id;


--
-- Name: whatsapp_api_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_api_health (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    status character varying(50),
    response_time_ms integer,
    rate_limit_remaining integer,
    rate_limit_total integer,
    credits_remaining integer,
    warnings jsonb,
    errors jsonb,
    checked_at timestamp without time zone DEFAULT now()
);


--
-- Name: whatsapp_blacklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_blacklist (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    phone character varying(50) NOT NULL,
    reason character varying(100),
    opted_out_at timestamp without time zone DEFAULT now(),
    customer_id uuid,
    notes text,
    added_by uuid,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: whatsapp_bulk_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_bulk_campaigns (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    message text NOT NULL,
    recipients jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    progress jsonb DEFAULT '{"total": 0, "failed": 0, "current": 0, "success": 0}'::jsonb NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    media_url text,
    media_type text,
    failed_recipients jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    last_heartbeat timestamp with time zone,
    error_message text,
    CONSTRAINT whatsapp_bulk_campaigns_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text, 'audio'::text]))),
    CONSTRAINT whatsapp_bulk_campaigns_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'paused'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: TABLE whatsapp_bulk_campaigns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.whatsapp_bulk_campaigns IS 'Stores WhatsApp bulk send campaigns that run server-side in the cloud, independent of client connection';


--
-- Name: whatsapp_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_phone text NOT NULL,
    customer_id uuid,
    call_type text DEFAULT 'voice'::text,
    call_timestamp timestamp with time zone,
    answered boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE whatsapp_calls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.whatsapp_calls IS 'Stores information about incoming WhatsApp voice/video calls';


--
-- Name: whatsapp_campaign_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_campaign_metrics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    campaign_id uuid,
    total_sent integer DEFAULT 0,
    total_delivered integer DEFAULT 0,
    total_read integer DEFAULT 0,
    total_replied integer DEFAULT 0,
    total_failed integer DEFAULT 0,
    avg_response_time_seconds integer,
    first_reply_at timestamp without time zone,
    last_reply_at timestamp without time zone,
    conversions integer DEFAULT 0,
    revenue numeric(10,2) DEFAULT 0,
    total_clicks integer DEFAULT 0,
    unique_clicks integer DEFAULT 0,
    open_rate numeric(5,2),
    response_rate numeric(5,2),
    conversion_rate numeric(5,2),
    calculated_at timestamp without time zone DEFAULT now()
);


--
-- Name: whatsapp_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    message text NOT NULL,
    media_url text,
    media_type character varying(50),
    total_recipients integer NOT NULL,
    recipients_data jsonb,
    sent_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    replied_count integer DEFAULT 0,
    settings jsonb,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    duration_seconds integer,
    status character varying(50) DEFAULT 'draft'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: whatsapp_customer_segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_customer_segments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    filters jsonb NOT NULL,
    customer_count integer DEFAULT 0,
    last_calculated_at timestamp without time zone,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: whatsapp_failed_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_failed_queue (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    campaign_id uuid,
    recipient_phone character varying(50) NOT NULL,
    recipient_name character varying(255),
    message text NOT NULL,
    media_url text,
    error_message text,
    error_code character varying(50),
    failed_at timestamp without time zone DEFAULT now(),
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    next_retry_at timestamp without time zone,
    last_retry_at timestamp without time zone,
    status character varying(50) DEFAULT 'pending'::character varying,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: whatsapp_incoming_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_incoming_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id text NOT NULL,
    from_phone text NOT NULL,
    customer_id uuid,
    message_text text,
    message_type text DEFAULT 'text'::text,
    media_url text,
    raw_data jsonb,
    is_read boolean DEFAULT false,
    replied boolean DEFAULT false,
    replied_at timestamp with time zone,
    replied_by uuid,
    received_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    session_id integer
);


--
-- Name: TABLE whatsapp_incoming_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.whatsapp_incoming_messages IS 'Stores all incoming WhatsApp messages from customers';


--
-- Name: COLUMN whatsapp_incoming_messages.session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_incoming_messages.session_id IS 'WhatsApp session that received this message';


--
-- Name: whatsapp_instances_comprehensive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_instances_comprehensive (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    instance_name text NOT NULL,
    instance_id text,
    phone_number text,
    api_key text,
    api_url text,
    status text DEFAULT 'inactive'::text,
    qr_code text,
    is_active boolean DEFAULT true,
    last_connected timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_phone text NOT NULL,
    message text,
    message_type text DEFAULT 'text'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    sent_at timestamp with time zone,
    sent_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    device_id uuid,
    customer_id uuid,
    message_id text,
    media_url text,
    branch_id uuid,
    is_shared boolean DEFAULT false,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    session_id integer
);


--
-- Name: TABLE whatsapp_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.whatsapp_logs IS 'Stores all WhatsApp messages sent through WasenderAPI';


--
-- Name: COLUMN whatsapp_logs.recipient_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_logs.recipient_phone IS 'Phone number in format: 255XXXXXXXXX (country code + number)';


--
-- Name: COLUMN whatsapp_logs.message_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_logs.message_type IS 'Type of message: text, image, video, document, audio, location, contact';


--
-- Name: COLUMN whatsapp_logs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_logs.status IS 'Message status: pending, sent, delivered, read, failed';


--
-- Name: COLUMN whatsapp_logs.message_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_logs.message_id IS 'WasenderAPI message ID for tracking';


--
-- Name: COLUMN whatsapp_logs.delivered_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_logs.delivered_at IS 'Timestamp when message was delivered to recipient';


--
-- Name: COLUMN whatsapp_logs.read_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_logs.read_at IS 'Timestamp when message was read by recipient';


--
-- Name: COLUMN whatsapp_logs.session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_logs.session_id IS 'WhatsApp session used to send this message';


--
-- Name: whatsapp_media_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_media_library (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url text NOT NULL,
    file_type character varying(50),
    file_size integer,
    mime_type character varying(100),
    folder character varying(255) DEFAULT 'General'::character varying,
    tags text[] DEFAULT '{}'::text[],
    usage_count integer DEFAULT 0,
    last_used_at timestamp without time zone,
    width integer,
    height integer,
    duration integer,
    thumbnail_url text,
    uploaded_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: whatsapp_message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_message_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name text NOT NULL,
    template_content text NOT NULL,
    variables jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_poll_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_poll_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    poll_id text NOT NULL,
    voter_phone text NOT NULL,
    customer_id uuid,
    selected_options text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE whatsapp_poll_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.whatsapp_poll_results IS 'Stores customer responses to WhatsApp polls';


--
-- Name: whatsapp_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id text NOT NULL,
    from_phone text NOT NULL,
    customer_id uuid,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE whatsapp_reactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.whatsapp_reactions IS 'Stores emoji reactions to WhatsApp messages';


--
-- Name: whatsapp_reply_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_reply_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100),
    keywords text[] DEFAULT '{}'::text[],
    message text NOT NULL,
    media_id uuid,
    auto_send boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    last_used_at timestamp without time zone,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: whatsapp_scheduled_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_scheduled_campaigns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    campaign_id uuid,
    schedule_type character varying(50),
    scheduled_for timestamp without time zone NOT NULL,
    timezone character varying(100) DEFAULT 'Africa/Dar_es_Salaam'::character varying,
    recurrence_pattern jsonb,
    drip_sequence jsonb,
    status character varying(50) DEFAULT 'pending'::character varying,
    executed_at timestamp without time zone,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: whatsapp_session_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_session_logs (
    id integer NOT NULL,
    session_id integer,
    event_type character varying(100) NOT NULL,
    message text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE whatsapp_session_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.whatsapp_session_logs IS 'Logs for WhatsApp session connection events and status changes';


--
-- Name: whatsapp_session_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapp_session_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapp_session_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapp_session_logs_id_seq OWNED BY public.whatsapp_session_logs.id;


--
-- Name: whatsapp_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    id integer NOT NULL,
    wasender_session_id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone_number character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'DISCONNECTED'::character varying,
    account_protection boolean DEFAULT true,
    log_messages boolean DEFAULT true,
    webhook_url text,
    webhook_enabled boolean DEFAULT false,
    webhook_events jsonb,
    api_key text,
    webhook_secret text,
    session_data jsonb,
    user_info jsonb,
    last_connected_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE whatsapp_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.whatsapp_sessions IS 'Stores WhatsApp Business session information from WasenderAPI';


--
-- Name: whatsapp_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapp_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapp_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapp_sessions_id_seq OWNED BY public.whatsapp_sessions.id;


--
-- Name: whatsapp_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id text,
    template_name text NOT NULL,
    language text DEFAULT 'en'::text,
    category text,
    status text,
    body_text text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: buyer_details buyer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_details ALTER COLUMN buyer_id SET DEFAULT nextval('public.buyer_details_buyer_id_seq'::regclass);


--
-- Name: communication_log log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_log ALTER COLUMN log_id SET DEFAULT nextval('public.communication_log_log_id_seq'::regclass);


--
-- Name: customer_fix_backup backup_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_fix_backup ALTER COLUMN backup_id SET DEFAULT nextval('public.customer_fix_backup_backup_id_seq'::regclass);


--
-- Name: product_interests interest_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_interests ALTER COLUMN interest_id SET DEFAULT nextval('public.product_interests_interest_id_seq'::regclass);


--
-- Name: sales_pipeline sale_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_pipeline ALTER COLUMN sale_id SET DEFAULT nextval('public.sales_pipeline_sale_id_seq'::regclass);


--
-- Name: user_whatsapp_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_whatsapp_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_whatsapp_preferences_id_seq'::regclass);


--
-- Name: whatsapp_antiban_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_antiban_settings ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_antiban_settings_id_seq'::regclass);


--
-- Name: whatsapp_customers customer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_customers ALTER COLUMN customer_id SET DEFAULT nextval('public.customers_customer_id_seq'::regclass);


--
-- Name: whatsapp_session_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_session_logs ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_session_logs_id_seq'::regclass);


--
-- Name: whatsapp_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_sessions ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_sessions_id_seq'::regclass);


--
-- Name: users_sync users_sync_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.users_sync
    ADD CONSTRAINT users_sync_pkey PRIMARY KEY (id);


--
-- Name: account_transactions account_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_transactions
    ADD CONSTRAINT account_transactions_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_category_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_category_setting_key_key UNIQUE (category, setting_key);


--
-- Name: admin_settings_log admin_settings_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings_log
    ADD CONSTRAINT admin_settings_log_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_key UNIQUE (key);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: api_request_logs api_request_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_request_logs
    ADD CONSTRAINT api_request_logs_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_employee_id_attendance_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_attendance_date_key UNIQUE (employee_id, attendance_date);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_users auth_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_email_key UNIQUE (email);


--
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);


--
-- Name: auto_reorder_log auto_reorder_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_reorder_log
    ADD CONSTRAINT auto_reorder_log_pkey PRIMARY KEY (id);


--
-- Name: backup_logs backup_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_logs
    ADD CONSTRAINT backup_logs_pkey PRIMARY KEY (id);


--
-- Name: branch_activity_log branch_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_activity_log
    ADD CONSTRAINT branch_activity_log_pkey PRIMARY KEY (id);


--
-- Name: branch_transfers branch_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT branch_transfers_pkey PRIMARY KEY (id);


--
-- Name: bulk_message_templates bulk_message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_message_templates
    ADD CONSTRAINT bulk_message_templates_pkey PRIMARY KEY (id);


--
-- Name: buyer_details buyer_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_details
    ADD CONSTRAINT buyer_details_pkey PRIMARY KEY (buyer_id);


--
-- Name: campaign_notifications campaign_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_notifications
    ADD CONSTRAINT campaign_notifications_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: communication_log communication_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_pkey PRIMARY KEY (log_id);


--
-- Name: communication_templates communication_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_templates
    ADD CONSTRAINT communication_templates_pkey PRIMARY KEY (id);


--
-- Name: contact_history contact_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_history
    ADD CONSTRAINT contact_history_pkey PRIMARY KEY (id);


--
-- Name: contact_methods contact_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_methods
    ADD CONSTRAINT contact_methods_pkey PRIMARY KEY (id);


--
-- Name: contact_preferences contact_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_preferences
    ADD CONSTRAINT contact_preferences_pkey PRIMARY KEY (id);


--
-- Name: customer_checkins customer_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_checkins
    ADD CONSTRAINT customer_checkins_pkey PRIMARY KEY (id);


--
-- Name: customer_communications customer_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_communications
    ADD CONSTRAINT customer_communications_pkey PRIMARY KEY (id);


--
-- Name: customer_fix_backup customer_fix_backup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_fix_backup
    ADD CONSTRAINT customer_fix_backup_pkey PRIMARY KEY (backup_id);


--
-- Name: customer_installment_plan_payments customer_installment_plan_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plan_payments
    ADD CONSTRAINT customer_installment_plan_payments_pkey PRIMARY KEY (id);


--
-- Name: customer_installment_plans customer_installment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plans
    ADD CONSTRAINT customer_installment_plans_pkey PRIMARY KEY (id);


--
-- Name: customer_installment_plans customer_installment_plans_plan_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plans
    ADD CONSTRAINT customer_installment_plans_plan_number_key UNIQUE (plan_number);


--
-- Name: customer_messages customer_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_pkey PRIMARY KEY (id);


--
-- Name: customer_notes customer_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_pkey PRIMARY KEY (id);


--
-- Name: customer_payments customer_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_payments
    ADD CONSTRAINT customer_payments_pkey PRIMARY KEY (id);


--
-- Name: customer_points_history customer_points_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_points_history
    ADD CONSTRAINT customer_points_history_pkey PRIMARY KEY (id);


--
-- Name: customer_preferences customer_preferences_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences
    ADD CONSTRAINT customer_preferences_customer_id_key UNIQUE (customer_id);


--
-- Name: customer_preferences customer_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences
    ADD CONSTRAINT customer_preferences_pkey PRIMARY KEY (id);


--
-- Name: customer_revenue customer_revenue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_revenue
    ADD CONSTRAINT customer_revenue_pkey PRIMARY KEY (id);


--
-- Name: customer_special_orders customer_special_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_special_orders
    ADD CONSTRAINT customer_special_orders_order_number_key UNIQUE (order_number);


--
-- Name: customer_special_orders customer_special_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_special_orders
    ADD CONSTRAINT customer_special_orders_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- Name: daily_opening_sessions daily_opening_sessions_date_is_active_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_opening_sessions
    ADD CONSTRAINT daily_opening_sessions_date_is_active_key UNIQUE (date, is_active);


--
-- Name: daily_opening_sessions daily_opening_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_opening_sessions
    ADD CONSTRAINT daily_opening_sessions_pkey PRIMARY KEY (id);


--
-- Name: daily_reports daily_reports_employee_id_report_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_employee_id_report_date_key UNIQUE (user_id, report_date);


--
-- Name: daily_reports daily_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);


--
-- Name: daily_sales_closures daily_sales_closures_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales_closures
    ADD CONSTRAINT daily_sales_closures_date_key UNIQUE (date);


--
-- Name: daily_sales_closures daily_sales_closures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales_closures
    ADD CONSTRAINT daily_sales_closures_pkey PRIMARY KEY (id);


--
-- Name: device_attachments device_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_attachments
    ADD CONSTRAINT device_attachments_pkey PRIMARY KEY (id);


--
-- Name: device_checklists device_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_checklists
    ADD CONSTRAINT device_checklists_pkey PRIMARY KEY (id);


--
-- Name: device_ratings device_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_ratings
    ADD CONSTRAINT device_ratings_pkey PRIMARY KEY (id);


--
-- Name: device_remarks device_remarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_remarks
    ADD CONSTRAINT device_remarks_pkey PRIMARY KEY (id);


--
-- Name: device_transitions device_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_transitions
    ADD CONSTRAINT device_transitions_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_checklist_results diagnostic_checklist_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_checklist_results
    ADD CONSTRAINT diagnostic_checklist_results_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_checks diagnostic_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_checks
    ADD CONSTRAINT diagnostic_checks_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_devices diagnostic_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_devices
    ADD CONSTRAINT diagnostic_devices_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_problem_templates diagnostic_problem_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_problem_templates
    ADD CONSTRAINT diagnostic_problem_templates_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_requests diagnostic_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_requests
    ADD CONSTRAINT diagnostic_requests_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_templates diagnostic_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_templates
    ADD CONSTRAINT diagnostic_templates_pkey PRIMARY KEY (id);


--
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: employee_shifts employee_shifts_employee_id_shift_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shifts
    ADD CONSTRAINT employee_shifts_employee_id_shift_date_key UNIQUE (employee_id, shift_date);


--
-- Name: employee_shifts employee_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shifts
    ADD CONSTRAINT employee_shifts_pkey PRIMARY KEY (id);


--
-- Name: employees employees_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_key UNIQUE (email);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_name_key UNIQUE (name);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: finance_accounts finance_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_accounts
    ADD CONSTRAINT finance_accounts_pkey PRIMARY KEY (id);


--
-- Name: finance_expense_categories finance_expense_categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_expense_categories
    ADD CONSTRAINT finance_expense_categories_category_name_key UNIQUE (category_name);


--
-- Name: finance_expense_categories finance_expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_expense_categories
    ADD CONSTRAINT finance_expense_categories_pkey PRIMARY KEY (id);


--
-- Name: finance_expenses finance_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_expenses
    ADD CONSTRAINT finance_expenses_pkey PRIMARY KEY (id);


--
-- Name: finance_transfers finance_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transfers
    ADD CONSTRAINT finance_transfers_pkey PRIMARY KEY (id);


--
-- Name: gift_card_transactions gift_card_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_transactions
    ADD CONSTRAINT gift_card_transactions_pkey PRIMARY KEY (id);


--
-- Name: gift_cards gift_cards_card_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_card_number_key UNIQUE (card_number);


--
-- Name: gift_cards gift_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_pkey PRIMARY KEY (id);


--
-- Name: imei_validation imei_validation_imei_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imei_validation
    ADD CONSTRAINT imei_validation_imei_key UNIQUE (imei);


--
-- Name: imei_validation imei_validation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imei_validation
    ADD CONSTRAINT imei_validation_pkey PRIMARY KEY (id);


--
-- Name: installment_payments installment_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_payments
    ADD CONSTRAINT installment_payments_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_serial_number_key UNIQUE (serial_number);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: lats_branches lats_branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_branches
    ADD CONSTRAINT lats_branches_pkey PRIMARY KEY (id);


--
-- Name: lats_brands lats_brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_brands
    ADD CONSTRAINT lats_brands_pkey PRIMARY KEY (id);


--
-- Name: lats_categories lats_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_categories
    ADD CONSTRAINT lats_categories_name_key UNIQUE (name);


--
-- Name: lats_categories lats_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_categories
    ADD CONSTRAINT lats_categories_pkey PRIMARY KEY (id);


--
-- Name: lats_customers lats_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_customers
    ADD CONSTRAINT lats_customers_pkey PRIMARY KEY (id);


--
-- Name: lats_data_audit_log lats_data_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_data_audit_log
    ADD CONSTRAINT lats_data_audit_log_pkey PRIMARY KEY (id);


--
-- Name: lats_employees lats_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_employees
    ADD CONSTRAINT lats_employees_pkey PRIMARY KEY (id);


--
-- Name: lats_inventory_adjustments lats_inventory_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_adjustments
    ADD CONSTRAINT lats_inventory_adjustments_pkey PRIMARY KEY (id);


--
-- Name: lats_inventory_items lats_inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_advanced_settings lats_pos_advanced_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_advanced_settings
    ADD CONSTRAINT lats_pos_advanced_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_advanced_settings lats_pos_advanced_settings_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_advanced_settings
    ADD CONSTRAINT lats_pos_advanced_settings_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- Name: lats_pos_analytics_reporting_settings lats_pos_analytics_reporting_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_analytics_reporting_settings
    ADD CONSTRAINT lats_pos_analytics_reporting_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_analytics_reporting_settings lats_pos_analytics_reporting_settings_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_analytics_reporting_settings
    ADD CONSTRAINT lats_pos_analytics_reporting_settings_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- Name: lats_pos_barcode_scanner_settings lats_pos_barcode_scanner_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_barcode_scanner_settings
    ADD CONSTRAINT lats_pos_barcode_scanner_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_barcode_scanner_settings lats_pos_barcode_scanner_settings_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_barcode_scanner_settings
    ADD CONSTRAINT lats_pos_barcode_scanner_settings_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- Name: lats_pos_delivery_settings lats_pos_delivery_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_delivery_settings
    ADD CONSTRAINT lats_pos_delivery_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_delivery_settings lats_pos_delivery_settings_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_delivery_settings
    ADD CONSTRAINT lats_pos_delivery_settings_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- Name: lats_pos_dynamic_pricing_settings lats_pos_dynamic_pricing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_dynamic_pricing_settings
    ADD CONSTRAINT lats_pos_dynamic_pricing_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_dynamic_pricing_settings lats_pos_dynamic_pricing_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_dynamic_pricing_settings
    ADD CONSTRAINT lats_pos_dynamic_pricing_settings_user_id_unique UNIQUE (user_id);


--
-- Name: lats_pos_general_settings lats_pos_general_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_general_settings
    ADD CONSTRAINT lats_pos_general_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_general_settings lats_pos_general_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_general_settings
    ADD CONSTRAINT lats_pos_general_settings_user_id_unique UNIQUE (user_id);


--
-- Name: lats_pos_integrations_settings lats_pos_integrations_setting_user_id_business_id_integrati_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_integrations_settings
    ADD CONSTRAINT lats_pos_integrations_setting_user_id_business_id_integrati_key UNIQUE (user_id, business_id, integration_name);


--
-- Name: lats_pos_integrations_settings lats_pos_integrations_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_integrations_settings
    ADD CONSTRAINT lats_pos_integrations_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_loyalty_customer_settings lats_pos_loyalty_customer_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_loyalty_customer_settings
    ADD CONSTRAINT lats_pos_loyalty_customer_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_loyalty_customer_settings lats_pos_loyalty_customer_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_loyalty_customer_settings
    ADD CONSTRAINT lats_pos_loyalty_customer_settings_user_id_unique UNIQUE (user_id);


--
-- Name: lats_pos_notification_settings lats_pos_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_notification_settings
    ADD CONSTRAINT lats_pos_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_notification_settings lats_pos_notification_settings_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_notification_settings
    ADD CONSTRAINT lats_pos_notification_settings_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- Name: lats_pos_receipt_settings lats_pos_receipt_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_receipt_settings
    ADD CONSTRAINT lats_pos_receipt_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_receipt_settings lats_pos_receipt_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_receipt_settings
    ADD CONSTRAINT lats_pos_receipt_settings_user_id_unique UNIQUE (user_id);


--
-- Name: lats_pos_search_filter_settings lats_pos_search_filter_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_search_filter_settings
    ADD CONSTRAINT lats_pos_search_filter_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_search_filter_settings lats_pos_search_filter_settings_user_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_search_filter_settings
    ADD CONSTRAINT lats_pos_search_filter_settings_user_id_business_id_key UNIQUE (user_id, business_id);


--
-- Name: lats_pos_user_permissions_settings lats_pos_user_permissions_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_user_permissions_settings
    ADD CONSTRAINT lats_pos_user_permissions_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_pos_user_permissions_settings lats_pos_user_permissions_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_user_permissions_settings
    ADD CONSTRAINT lats_pos_user_permissions_settings_user_id_unique UNIQUE (user_id);


--
-- Name: lats_product_units lats_product_units_imei_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_units
    ADD CONSTRAINT lats_product_units_imei_key UNIQUE (imei);


--
-- Name: lats_product_units lats_product_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_units
    ADD CONSTRAINT lats_product_units_pkey PRIMARY KEY (id);


--
-- Name: lats_product_validation lats_product_validation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_validation
    ADD CONSTRAINT lats_product_validation_pkey PRIMARY KEY (id);


--
-- Name: lats_product_validation lats_product_validation_product_id_shipping_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_validation
    ADD CONSTRAINT lats_product_validation_product_id_shipping_id_key UNIQUE (product_id, shipping_id);


--
-- Name: lats_product_variants lats_product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_variants
    ADD CONSTRAINT lats_product_variants_pkey PRIMARY KEY (id);


--
-- Name: lats_product_variants lats_product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_variants
    ADD CONSTRAINT lats_product_variants_sku_key UNIQUE (sku);


--
-- Name: lats_products lats_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_products
    ADD CONSTRAINT lats_products_pkey PRIMARY KEY (id);


--
-- Name: lats_products lats_products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_products
    ADD CONSTRAINT lats_products_sku_key UNIQUE (sku);


--
-- Name: lats_purchase_order_audit_log lats_purchase_order_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_audit_log
    ADD CONSTRAINT lats_purchase_order_audit_log_pkey PRIMARY KEY (id);


--
-- Name: lats_purchase_order_items lats_purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_items
    ADD CONSTRAINT lats_purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: lats_purchase_order_payments lats_purchase_order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_payments
    ADD CONSTRAINT lats_purchase_order_payments_pkey PRIMARY KEY (id);


--
-- Name: lats_purchase_order_shipping lats_purchase_order_shipping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_shipping
    ADD CONSTRAINT lats_purchase_order_shipping_pkey PRIMARY KEY (id);


--
-- Name: lats_purchase_orders lats_purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_orders
    ADD CONSTRAINT lats_purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: lats_purchase_orders lats_purchase_orders_po_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_orders
    ADD CONSTRAINT lats_purchase_orders_po_number_key UNIQUE (po_number);


--
-- Name: lats_receipts lats_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_receipts
    ADD CONSTRAINT lats_receipts_pkey PRIMARY KEY (id);


--
-- Name: lats_sale_items lats_sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_sale_items
    ADD CONSTRAINT lats_sale_items_pkey PRIMARY KEY (id);


--
-- Name: lats_sales lats_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_sales
    ADD CONSTRAINT lats_sales_pkey PRIMARY KEY (id);


--
-- Name: lats_sales lats_sales_sale_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_sales
    ADD CONSTRAINT lats_sales_sale_number_key UNIQUE (sale_number);


--
-- Name: lats_shipping_agents lats_shipping_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_agents
    ADD CONSTRAINT lats_shipping_agents_pkey PRIMARY KEY (id);


--
-- Name: lats_shipping_cargo_items lats_shipping_cargo_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_cargo_items
    ADD CONSTRAINT lats_shipping_cargo_items_pkey PRIMARY KEY (id);


--
-- Name: lats_shipping_methods lats_shipping_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_methods
    ADD CONSTRAINT lats_shipping_methods_code_key UNIQUE (code);


--
-- Name: lats_shipping_methods lats_shipping_methods_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_methods
    ADD CONSTRAINT lats_shipping_methods_name_key UNIQUE (name);


--
-- Name: lats_shipping_methods lats_shipping_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_methods
    ADD CONSTRAINT lats_shipping_methods_pkey PRIMARY KEY (id);


--
-- Name: lats_shipping lats_shipping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping
    ADD CONSTRAINT lats_shipping_pkey PRIMARY KEY (id);


--
-- Name: lats_shipping_settings lats_shipping_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_settings
    ADD CONSTRAINT lats_shipping_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_spare_part_usage lats_spare_part_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_spare_part_usage
    ADD CONSTRAINT lats_spare_part_usage_pkey PRIMARY KEY (id);


--
-- Name: lats_spare_part_variants lats_spare_part_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_spare_part_variants
    ADD CONSTRAINT lats_spare_part_variants_pkey PRIMARY KEY (id);


--
-- Name: lats_spare_part_variants lats_spare_part_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_spare_part_variants
    ADD CONSTRAINT lats_spare_part_variants_sku_key UNIQUE (sku);


--
-- Name: lats_spare_parts lats_spare_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_spare_parts
    ADD CONSTRAINT lats_spare_parts_pkey PRIMARY KEY (id);


--
-- Name: lats_stock_movements lats_stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_movements
    ADD CONSTRAINT lats_stock_movements_pkey PRIMARY KEY (id);


--
-- Name: lats_stock_transfers lats_stock_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_pkey PRIMARY KEY (id);


--
-- Name: lats_stock_transfers lats_stock_transfers_transfer_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_transfer_number_key UNIQUE (transfer_number);


--
-- Name: lats_store_locations lats_store_locations_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_locations
    ADD CONSTRAINT lats_store_locations_code_key UNIQUE (code);


--
-- Name: lats_store_locations lats_store_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_locations
    ADD CONSTRAINT lats_store_locations_pkey PRIMARY KEY (id);


--
-- Name: lats_store_rooms lats_store_rooms_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_rooms
    ADD CONSTRAINT lats_store_rooms_name_key UNIQUE (name);


--
-- Name: lats_store_rooms lats_store_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_rooms
    ADD CONSTRAINT lats_store_rooms_pkey PRIMARY KEY (id);


--
-- Name: lats_store_shelves lats_store_shelves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_shelves
    ADD CONSTRAINT lats_store_shelves_pkey PRIMARY KEY (id);


--
-- Name: lats_store_shelves lats_store_shelves_room_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_shelves
    ADD CONSTRAINT lats_store_shelves_room_id_name_key UNIQUE (room_id, name);


--
-- Name: lats_supplier_categories lats_supplier_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_categories
    ADD CONSTRAINT lats_supplier_categories_name_key UNIQUE (name);


--
-- Name: lats_supplier_categories lats_supplier_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_categories
    ADD CONSTRAINT lats_supplier_categories_pkey PRIMARY KEY (id);


--
-- Name: lats_supplier_category_mapping lats_supplier_category_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_category_mapping
    ADD CONSTRAINT lats_supplier_category_mapping_pkey PRIMARY KEY (supplier_id, category_id);


--
-- Name: lats_supplier_communications lats_supplier_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_communications
    ADD CONSTRAINT lats_supplier_communications_pkey PRIMARY KEY (id);


--
-- Name: lats_supplier_contracts lats_supplier_contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_contracts
    ADD CONSTRAINT lats_supplier_contracts_contract_number_key UNIQUE (contract_number);


--
-- Name: lats_supplier_contracts lats_supplier_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_contracts
    ADD CONSTRAINT lats_supplier_contracts_pkey PRIMARY KEY (id);


--
-- Name: lats_supplier_documents lats_supplier_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_documents
    ADD CONSTRAINT lats_supplier_documents_pkey PRIMARY KEY (id);


--
-- Name: lats_supplier_ratings lats_supplier_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_ratings
    ADD CONSTRAINT lats_supplier_ratings_pkey PRIMARY KEY (id);


--
-- Name: lats_supplier_tag_mapping lats_supplier_tag_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_tag_mapping
    ADD CONSTRAINT lats_supplier_tag_mapping_pkey PRIMARY KEY (supplier_id, tag_id);


--
-- Name: lats_supplier_tags lats_supplier_tags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_tags
    ADD CONSTRAINT lats_supplier_tags_name_key UNIQUE (name);


--
-- Name: lats_supplier_tags lats_supplier_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_tags
    ADD CONSTRAINT lats_supplier_tags_pkey PRIMARY KEY (id);


--
-- Name: lats_suppliers lats_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_suppliers
    ADD CONSTRAINT lats_suppliers_pkey PRIMARY KEY (id);


--
-- Name: lats_trade_in_contracts lats_trade_in_contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_contract_number_key UNIQUE (contract_number);


--
-- Name: lats_trade_in_contracts lats_trade_in_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_pkey PRIMARY KEY (id);


--
-- Name: lats_trade_in_damage_assessments lats_trade_in_damage_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_damage_assessments
    ADD CONSTRAINT lats_trade_in_damage_assessments_pkey PRIMARY KEY (id);


--
-- Name: lats_trade_in_prices lats_trade_in_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_pkey PRIMARY KEY (id);


--
-- Name: lats_trade_in_settings lats_trade_in_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_settings
    ADD CONSTRAINT lats_trade_in_settings_key_key UNIQUE (key);


--
-- Name: lats_trade_in_settings lats_trade_in_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_settings
    ADD CONSTRAINT lats_trade_in_settings_pkey PRIMARY KEY (id);


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_pkey PRIMARY KEY (id);


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_transaction_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_transaction_number_key UNIQUE (transaction_number);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: loyalty_points loyalty_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_pkey PRIMARY KEY (id);


--
-- Name: message_recipient_lists message_recipient_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_recipient_lists
    ADD CONSTRAINT message_recipient_lists_pkey PRIMARY KEY (id);


--
-- Name: mobile_money_transactions mobile_money_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_money_transactions
    ADD CONSTRAINT mobile_money_transactions_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: paragraphs paragraphs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paragraphs
    ADD CONSTRAINT paragraphs_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_code_key UNIQUE (code);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: points_transactions points_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_interests product_interests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_interests
    ADD CONSTRAINT product_interests_pkey PRIMARY KEY (interest_id);


--
-- Name: purchase_order_audit purchase_order_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_audit
    ADD CONSTRAINT purchase_order_audit_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_messages purchase_order_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_messages
    ADD CONSTRAINT purchase_order_messages_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_payments purchase_order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_payments
    ADD CONSTRAINT purchase_order_payments_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_quality_check_items purchase_order_quality_check_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_quality_check_items
    ADD CONSTRAINT purchase_order_quality_check_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_quality_checks purchase_order_quality_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_quality_checks
    ADD CONSTRAINT purchase_order_quality_checks_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_order_number_key UNIQUE (order_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: quality_check_criteria quality_check_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_check_criteria
    ADD CONSTRAINT quality_check_criteria_pkey PRIMARY KEY (id);


--
-- Name: quality_check_items quality_check_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_check_items
    ADD CONSTRAINT quality_check_items_pkey PRIMARY KEY (id);


--
-- Name: quality_check_results quality_check_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_check_results
    ADD CONSTRAINT quality_check_results_pkey PRIMARY KEY (id);


--
-- Name: quality_check_templates quality_check_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_check_templates
    ADD CONSTRAINT quality_check_templates_pkey PRIMARY KEY (id);


--
-- Name: quality_checks quality_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_pkey PRIMARY KEY (id);


--
-- Name: recurring_expense_history recurring_expense_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expense_history
    ADD CONSTRAINT recurring_expense_history_pkey PRIMARY KEY (id);


--
-- Name: recurring_expenses recurring_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_pkey PRIMARY KEY (id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: repair_parts repair_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_parts
    ADD CONSTRAINT repair_parts_pkey PRIMARY KEY (id);


--
-- Name: report_attachments report_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_attachments
    ADD CONSTRAINT report_attachments_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: returns returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (id);


--
-- Name: sale_inventory_items sale_inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_inventory_items
    ADD CONSTRAINT sale_inventory_items_pkey PRIMARY KEY (id);


--
-- Name: sales_pipeline sales_pipeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_pipeline
    ADD CONSTRAINT sales_pipeline_pkey PRIMARY KEY (sale_id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: scheduled_bulk_messages scheduled_bulk_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_bulk_messages
    ADD CONSTRAINT scheduled_bulk_messages_pkey PRIMARY KEY (id);


--
-- Name: scheduled_message_executions scheduled_message_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_executions
    ADD CONSTRAINT scheduled_message_executions_pkey PRIMARY KEY (id);


--
-- Name: scheduled_transfer_executions scheduled_transfer_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfer_executions
    ADD CONSTRAINT scheduled_transfer_executions_pkey PRIMARY KEY (id);


--
-- Name: scheduled_transfers scheduled_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfers
    ADD CONSTRAINT scheduled_transfers_pkey PRIMARY KEY (id);


--
-- Name: serial_number_movements serial_number_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_number_movements
    ADD CONSTRAINT serial_number_movements_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: shelves shelves_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelves
    ADD CONSTRAINT shelves_code_key UNIQUE (code);


--
-- Name: shelves shelves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelves
    ADD CONSTRAINT shelves_pkey PRIMARY KEY (id);


--
-- Name: shift_templates shift_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_templates
    ADD CONSTRAINT shift_templates_pkey PRIMARY KEY (id);


--
-- Name: sms_logs sms_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_logs
    ADD CONSTRAINT sms_logs_pkey PRIMARY KEY (id);


--
-- Name: sms_trigger_logs sms_trigger_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_trigger_logs
    ADD CONSTRAINT sms_trigger_logs_pkey PRIMARY KEY (id);


--
-- Name: sms_triggers sms_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_triggers
    ADD CONSTRAINT sms_triggers_pkey PRIMARY KEY (id);


--
-- Name: special_order_payments special_order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.special_order_payments
    ADD CONSTRAINT special_order_payments_pkey PRIMARY KEY (id);


--
-- Name: storage_rooms storage_rooms_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_rooms
    ADD CONSTRAINT storage_rooms_code_key UNIQUE (code);


--
-- Name: storage_rooms storage_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_rooms
    ADD CONSTRAINT storage_rooms_pkey PRIMARY KEY (id);


--
-- Name: store_locations store_locations_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_locations
    ADD CONSTRAINT store_locations_code_key UNIQUE (code);


--
-- Name: store_locations store_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_locations
    ADD CONSTRAINT store_locations_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: whatsapp_antiban_settings unique_user_settings; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_antiban_settings
    ADD CONSTRAINT unique_user_settings UNIQUE (user_id);


--
-- Name: user_branch_assignments user_branch_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_pkey PRIMARY KEY (id);


--
-- Name: user_branch_assignments user_branch_assignments_user_id_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_user_id_branch_id_key UNIQUE (user_id, branch_id);


--
-- Name: user_daily_goals user_daily_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_goals
    ADD CONSTRAINT user_daily_goals_pkey PRIMARY KEY (id);


--
-- Name: user_daily_goals user_daily_goals_user_id_date_goal_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_goals
    ADD CONSTRAINT user_daily_goals_user_id_date_goal_type_key UNIQUE (user_id, date, goal_type);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_id_key UNIQUE (session_id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);


--
-- Name: user_whatsapp_preferences user_whatsapp_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_whatsapp_preferences
    ADD CONSTRAINT user_whatsapp_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_whatsapp_preferences user_whatsapp_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_whatsapp_preferences
    ADD CONSTRAINT user_whatsapp_preferences_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_endpoints webhook_endpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id);


--
-- Name: webhook_failures webhook_failures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_failures
    ADD CONSTRAINT webhook_failures_pkey PRIMARY KEY (id);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_ab_tests whatsapp_ab_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_ab_tests
    ADD CONSTRAINT whatsapp_ab_tests_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_antiban_settings whatsapp_antiban_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_antiban_settings
    ADD CONSTRAINT whatsapp_antiban_settings_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_api_health whatsapp_api_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_api_health
    ADD CONSTRAINT whatsapp_api_health_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_blacklist whatsapp_blacklist_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_blacklist
    ADD CONSTRAINT whatsapp_blacklist_phone_key UNIQUE (phone);


--
-- Name: whatsapp_blacklist whatsapp_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_blacklist
    ADD CONSTRAINT whatsapp_blacklist_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_bulk_campaigns whatsapp_bulk_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_bulk_campaigns
    ADD CONSTRAINT whatsapp_bulk_campaigns_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_calls whatsapp_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_calls
    ADD CONSTRAINT whatsapp_calls_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_campaign_metrics whatsapp_campaign_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaign_metrics
    ADD CONSTRAINT whatsapp_campaign_metrics_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_campaigns whatsapp_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaigns
    ADD CONSTRAINT whatsapp_campaigns_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_customer_segments whatsapp_customer_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_customer_segments
    ADD CONSTRAINT whatsapp_customer_segments_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_failed_queue whatsapp_failed_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_failed_queue
    ADD CONSTRAINT whatsapp_failed_queue_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_incoming_messages whatsapp_incoming_messages_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_incoming_messages
    ADD CONSTRAINT whatsapp_incoming_messages_message_id_key UNIQUE (message_id);


--
-- Name: whatsapp_incoming_messages whatsapp_incoming_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_incoming_messages
    ADD CONSTRAINT whatsapp_incoming_messages_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_instances_comprehensive whatsapp_instances_comprehensive_instance_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_instances_comprehensive
    ADD CONSTRAINT whatsapp_instances_comprehensive_instance_id_key UNIQUE (instance_id);


--
-- Name: whatsapp_instances_comprehensive whatsapp_instances_comprehensive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_instances_comprehensive
    ADD CONSTRAINT whatsapp_instances_comprehensive_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_logs whatsapp_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_media_library whatsapp_media_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_media_library
    ADD CONSTRAINT whatsapp_media_library_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_message_templates whatsapp_message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_templates
    ADD CONSTRAINT whatsapp_message_templates_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_poll_results whatsapp_poll_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_poll_results
    ADD CONSTRAINT whatsapp_poll_results_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_reactions whatsapp_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_reactions
    ADD CONSTRAINT whatsapp_reactions_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_reply_templates whatsapp_reply_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_reply_templates
    ADD CONSTRAINT whatsapp_reply_templates_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_scheduled_campaigns whatsapp_scheduled_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_scheduled_campaigns
    ADD CONSTRAINT whatsapp_scheduled_campaigns_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_session_logs whatsapp_session_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_session_logs
    ADD CONSTRAINT whatsapp_session_logs_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_sessions whatsapp_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_sessions whatsapp_sessions_wasender_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_wasender_session_id_key UNIQUE (wasender_session_id);


--
-- Name: whatsapp_templates whatsapp_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_templates whatsapp_templates_template_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_template_id_key UNIQUE (template_id);


--
-- Name: users_sync_deleted_at_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX IF NOT EXISTS users_sync_deleted_at_idx ON neon_auth.users_sync USING btree (deleted_at);


--
-- Name: idx_account_trans_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_trans_account ON public.account_transactions USING btree (account_id);


--
-- Name: idx_account_trans_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_trans_created ON public.account_transactions USING btree (created_at);


--
-- Name: idx_account_trans_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_trans_reference ON public.account_transactions USING btree (reference_number);


--
-- Name: idx_account_trans_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_trans_type ON public.account_transactions USING btree (transaction_type);


--
-- Name: idx_account_transactions_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON public.account_transactions USING btree (account_id);


--
-- Name: idx_account_transactions_account_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_transactions_account_type_date ON public.account_transactions USING btree (account_id, transaction_type, created_at DESC);


--
-- Name: idx_account_transactions_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_transactions_branch_id ON public.account_transactions USING btree (branch_id);


--
-- Name: idx_account_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_transactions_created_at ON public.account_transactions USING btree (created_at DESC);


--
-- Name: idx_account_transactions_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_transactions_entity_id ON public.account_transactions USING btree (related_entity_id) WHERE (related_entity_id IS NOT NULL);


--
-- Name: idx_account_transactions_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_transactions_entity_type ON public.account_transactions USING btree (related_entity_type) WHERE (related_entity_type IS NOT NULL);


--
-- Name: idx_account_transactions_entity_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_transactions_entity_type_id ON public.account_transactions USING btree (related_entity_type, related_entity_id) WHERE ((related_entity_type IS NOT NULL) AND (related_entity_id IS NOT NULL));


--
-- Name: idx_account_transactions_reference_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_transactions_reference_number ON public.account_transactions USING btree (reference_number);


--
-- Name: idx_account_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_transactions_status ON public.account_transactions USING btree (status) WHERE (status IS NOT NULL);


--
-- Name: idx_account_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_transactions_type ON public.account_transactions USING btree (transaction_type);


--
-- Name: idx_account_transactions_validation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_account_transactions_validation ON public.account_transactions USING btree (account_id, created_at DESC);


--
-- Name: idx_admin_settings_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_admin_settings_active ON public.admin_settings USING btree (is_active);


--
-- Name: idx_admin_settings_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_admin_settings_category ON public.admin_settings USING btree (category);


--
-- Name: idx_admin_settings_category_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_admin_settings_category_key ON public.admin_settings USING btree (category, setting_key);


--
-- Name: idx_admin_settings_log_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_admin_settings_log_date ON public.admin_settings_log USING btree (changed_at DESC);


--
-- Name: idx_admin_settings_log_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_admin_settings_log_key ON public.admin_settings_log USING btree (category, setting_key);


--
-- Name: idx_advanced_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_advanced_settings_user_id ON public.lats_pos_advanced_settings USING btree (user_id);


--
-- Name: idx_analytics_reporting_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_reporting_settings_user_id ON public.lats_pos_analytics_reporting_settings USING btree (user_id);


--
-- Name: idx_analytics_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_settings_user_id ON public.lats_pos_analytics_reporting_settings USING btree (user_id);


--
-- Name: idx_antiban_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_antiban_updated_at ON public.whatsapp_antiban_settings USING btree (updated_at);


--
-- Name: idx_antiban_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_antiban_user_id ON public.whatsapp_antiban_settings USING btree (user_id);


--
-- Name: idx_api_health_checked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_api_health_checked_at ON public.whatsapp_api_health USING btree (checked_at DESC);


--
-- Name: idx_api_keys_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys USING btree (is_active);


--
-- Name: idx_api_keys_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON public.api_keys USING btree (key);


--
-- Name: idx_api_keys_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys USING btree (user_id);


--
-- Name: idx_api_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_api_logs_created ON public.api_request_logs USING btree (created_at);


--
-- Name: idx_api_logs_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_api_logs_ip ON public.api_request_logs USING btree (ip_address);


--
-- Name: idx_api_logs_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_api_logs_key ON public.api_request_logs USING btree (api_key_id);


--
-- Name: idx_appointments_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_appointments_branch_id ON public.appointments USING btree (branch_id);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records USING btree (attendance_date);


--
-- Name: idx_attendance_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance_records USING btree (employee_id, attendance_date);


--
-- Name: idx_attendance_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance_records USING btree (employee_id);


--
-- Name: idx_attendance_records_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_attendance_records_branch_id ON public.attendance_records USING btree (branch_id);


--
-- Name: idx_attendance_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records USING btree (status);


--
-- Name: idx_audit_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.lats_data_audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.lats_purchase_order_audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_log_po_id ON public.lats_purchase_order_audit_log USING btree (purchase_order_id);


--
-- Name: idx_audit_log_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.lats_data_audit_log USING btree (table_name, record_id);


--
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.lats_purchase_order_audit_log USING btree (user_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_id ON public.audit_logs USING btree (branch_id);


--
-- Name: idx_audit_logs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.audit_logs USING btree (category);


--
-- Name: idx_audit_logs_record_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs USING btree (record_id);


--
-- Name: idx_audit_logs_table_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs USING btree (table_name);


--
-- Name: idx_auth_users_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_auth_users_branch_id ON public.auth_users USING btree (branch_id);


--
-- Name: idx_auto_reorder_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_auto_reorder_log_created ON public.auto_reorder_log USING btree (created_at DESC);


--
-- Name: idx_auto_reorder_log_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_auto_reorder_log_po ON public.auto_reorder_log USING btree (purchase_order_id);


--
-- Name: idx_backup_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at ON public.backup_logs USING btree (created_at);


--
-- Name: idx_backup_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON public.backup_logs USING btree (status);


--
-- Name: idx_backup_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_backup_logs_type ON public.backup_logs USING btree (backup_type);


--
-- Name: idx_barcode_scanner_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_barcode_scanner_settings_user_id ON public.lats_pos_barcode_scanner_settings USING btree (user_id);


--
-- Name: idx_blacklist_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_blacklist_customer_id ON public.whatsapp_blacklist USING btree (customer_id);


--
-- Name: idx_blacklist_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_blacklist_phone ON public.whatsapp_blacklist USING btree (phone);


--
-- Name: idx_branch_activity_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_branch_activity_branch ON public.branch_activity_log USING btree (branch_id);


--
-- Name: idx_branch_activity_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_branch_activity_created ON public.branch_activity_log USING btree (created_at);


--
-- Name: idx_branch_activity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_branch_activity_type ON public.branch_activity_log USING btree (action_type);


--
-- Name: idx_branch_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_branch_activity_user ON public.branch_activity_log USING btree (user_id);


--
-- Name: idx_branch_transfers_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_branch_transfers_created ON public.branch_transfers USING btree (created_at DESC);


--
-- Name: idx_branch_transfers_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_branch_transfers_entity ON public.branch_transfers USING btree (entity_id);


--
-- Name: idx_branch_transfers_from_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_branch_transfers_from_branch ON public.branch_transfers USING btree (from_branch_id);


--
-- Name: idx_branch_transfers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_branch_transfers_status ON public.branch_transfers USING btree (status);


--
-- Name: idx_branch_transfers_to_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_branch_transfers_to_branch ON public.branch_transfers USING btree (to_branch_id);


--
-- Name: idx_branch_transfers_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_branch_transfers_type ON public.branch_transfers USING btree (transfer_type);


--
-- Name: idx_bulk_campaigns_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_created_at ON public.whatsapp_bulk_campaigns USING btree (created_at DESC);


--
-- Name: idx_bulk_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_status ON public.whatsapp_bulk_campaigns USING btree (status);


--
-- Name: idx_bulk_campaigns_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_user_id ON public.whatsapp_bulk_campaigns USING btree (user_id);


--
-- Name: idx_buyer_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_buyer_score ON public.buyer_details USING btree (buying_score DESC);


--
-- Name: idx_buyer_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_buyer_tier ON public.buyer_details USING btree (buyer_tier);


--
-- Name: idx_campaign_metrics_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON public.whatsapp_campaign_metrics USING btree (campaign_id);


--
-- Name: idx_campaigns_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.whatsapp_campaigns USING btree (created_at DESC);


--
-- Name: idx_campaigns_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON public.whatsapp_campaigns USING btree (created_by);


--
-- Name: idx_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.whatsapp_campaigns USING btree (status);


--
-- Name: idx_cargo_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cargo_items_product ON public.lats_shipping_cargo_items USING btree (product_id);


--
-- Name: idx_cargo_items_shipping; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cargo_items_shipping ON public.lats_shipping_cargo_items USING btree (shipping_id);


--
-- Name: idx_categories_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_categories_branch ON public.lats_categories USING btree (branch_id);


--
-- Name: idx_categories_is_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_categories_is_shared ON public.lats_categories USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_categories_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_categories_shared ON public.lats_categories USING btree (is_shared);


--
-- Name: idx_comm_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_comm_date ON public.communication_log USING btree (contact_date);


--
-- Name: idx_cust_inst_payments_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cust_inst_payments_customer ON public.customer_installment_plan_payments USING btree (customer_id);


--
-- Name: idx_cust_inst_payments_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cust_inst_payments_plan ON public.customer_installment_plan_payments USING btree (installment_plan_id);


--
-- Name: idx_customer_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_buyer ON public.whatsapp_customers USING btree (is_buyer);


--
-- Name: idx_customer_checkins_checkin_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_checkins_checkin_date ON public.customer_checkins USING btree (checkin_date DESC);


--
-- Name: idx_customer_checkins_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_checkins_customer_id ON public.customer_checkins USING btree (customer_id);


--
-- Name: idx_customer_communications_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_communications_customer_id ON public.customer_communications USING btree (customer_id);


--
-- Name: idx_customer_communications_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_communications_sent_at ON public.customer_communications USING btree (sent_at DESC);


--
-- Name: idx_customer_communications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_communications_status ON public.customer_communications USING btree (status);


--
-- Name: idx_customer_communications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_communications_type ON public.customer_communications USING btree (type);


--
-- Name: idx_customer_engagement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_engagement ON public.whatsapp_customers USING btree (engagement_level);


--
-- Name: idx_customer_messages_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_messages_branch_id ON public.customer_messages USING btree (branch_id);


--
-- Name: idx_customer_messages_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_messages_channel ON public.customer_messages USING btree (channel);


--
-- Name: idx_customer_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_messages_created_at ON public.customer_messages USING btree (created_at DESC);


--
-- Name: idx_customer_messages_customer_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_messages_customer_created ON public.customer_messages USING btree (customer_id, created_at DESC);


--
-- Name: idx_customer_messages_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_messages_customer_id ON public.customer_messages USING btree (customer_id);


--
-- Name: idx_customer_messages_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_messages_shared ON public.customer_messages USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_customer_messages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_messages_status ON public.customer_messages USING btree (status);


--
-- Name: idx_customer_payments_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_payments_branch_id ON public.customer_payments USING btree (branch_id);


--
-- Name: idx_customer_payments_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_payments_currency ON public.customer_payments USING btree (currency);


--
-- Name: idx_customer_payments_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON public.customer_payments USING btree (customer_id);


--
-- Name: idx_customer_payments_customer_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_date ON public.customer_payments USING btree (customer_id, payment_date DESC);


--
-- Name: idx_customer_payments_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON public.customer_payments USING btree (customer_id);


--
-- Name: idx_customer_payments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_payments_date ON public.customer_payments USING btree (payment_date);


--
-- Name: idx_customer_payments_payment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_payments_payment_date ON public.customer_payments USING btree (payment_date DESC);


--
-- Name: idx_customer_payments_reference_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_payments_reference_number ON public.customer_payments USING btree (reference_number);


--
-- Name: idx_customer_payments_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_payments_sale ON public.customer_payments USING btree (sale_id);


--
-- Name: idx_customer_payments_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_payments_sale_id ON public.customer_payments USING btree (sale_id);


--
-- Name: idx_customer_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_payments_status ON public.customer_payments USING btree (status);


--
-- Name: idx_customer_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_phone ON public.whatsapp_customers USING btree (phone_number);


--
-- Name: idx_customer_preferences_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_preferences_customer_id ON public.customer_preferences USING btree (customer_id);


--
-- Name: idx_customer_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_status ON public.whatsapp_customers USING btree (status);


--
-- Name: idx_customers_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customers_branch ON public.lats_customers USING btree (branch_id);


--
-- Name: idx_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customers_email ON public.lats_customers USING btree (email);


--
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.lats_customers USING btree (phone);


--
-- Name: idx_daily_opening_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_active ON public.daily_opening_sessions USING btree (is_active);


--
-- Name: idx_daily_opening_sessions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_date ON public.daily_opening_sessions USING btree (date);


--
-- Name: idx_daily_opening_sessions_opened_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_opened_at ON public.daily_opening_sessions USING btree (opened_at);


--
-- Name: idx_daily_opening_sessions_opened_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_opening_sessions_opened_by ON public.daily_opening_sessions USING btree (opened_by_user_id);


--
-- Name: idx_daily_reports_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_reports_branch ON public.daily_reports USING btree (branch_id);


--
-- Name: idx_daily_reports_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_reports_branch_id ON public.daily_reports USING btree (branch_id);


--
-- Name: idx_daily_reports_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_reports USING btree (report_date);


--
-- Name: idx_daily_reports_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_reports_employee_date ON public.daily_reports USING btree (user_id, report_date);


--
-- Name: idx_daily_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON public.daily_reports USING btree (status);


--
-- Name: idx_daily_sales_closures_closed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_closed_at ON public.daily_sales_closures USING btree (closed_at DESC);


--
-- Name: idx_daily_sales_closures_closed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_closed_by ON public.daily_sales_closures USING btree (closed_by_user_id);


--
-- Name: idx_daily_sales_closures_closed_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_closed_by_user_id ON public.daily_sales_closures USING btree (closed_by_user_id);


--
-- Name: idx_daily_sales_closures_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_date ON public.daily_sales_closures USING btree (date DESC);


--
-- Name: idx_daily_sales_closures_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_session ON public.daily_sales_closures USING btree (session_id);


--
-- Name: idx_delivery_settings_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_delivery_settings_business_id ON public.lats_pos_delivery_settings USING btree (business_id);


--
-- Name: idx_delivery_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_delivery_settings_user_id ON public.lats_pos_delivery_settings USING btree (user_id);


--
-- Name: idx_devices_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_devices_assigned_to ON public.devices USING btree (assigned_to);


--
-- Name: idx_devices_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_devices_branch_id ON public.devices USING btree (branch_id);


--
-- Name: idx_devices_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_devices_customer ON public.devices USING btree (customer_id);


--
-- Name: idx_devices_is_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_devices_is_shared ON public.devices USING btree (is_shared);


--
-- Name: idx_devices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_devices_status ON public.devices USING btree (status);


--
-- Name: idx_document_templates_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_document_templates_default ON public.document_templates USING btree (is_default);


--
-- Name: idx_document_templates_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_document_templates_type ON public.document_templates USING btree (type);


--
-- Name: idx_document_templates_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_document_templates_user ON public.document_templates USING btree (user_id);


--
-- Name: idx_dynamic_pricing_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_dynamic_pricing_business_id ON public.lats_pos_dynamic_pricing_settings USING btree (business_id);


--
-- Name: idx_dynamic_pricing_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_dynamic_pricing_settings_user_id ON public.lats_pos_dynamic_pricing_settings USING btree (user_id);


--
-- Name: idx_dynamic_pricing_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_dynamic_pricing_user_id ON public.lats_pos_dynamic_pricing_settings USING btree (user_id);


--
-- Name: idx_email_logs_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_email_logs_message_id ON public.email_logs USING btree (message_id);


--
-- Name: idx_email_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs USING btree (status);


--
-- Name: idx_email_logs_to_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON public.email_logs USING btree (to_email);


--
-- Name: idx_employees_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_employees_branch ON public.employees USING btree (branch_id);


--
-- Name: idx_employees_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON public.employees USING btree (branch_id);


--
-- Name: idx_employees_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees USING btree (department);


--
-- Name: idx_employees_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees USING btree (email);


--
-- Name: idx_employees_is_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_employees_is_shared ON public.employees USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_employees_manager_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON public.employees USING btree (manager_id);


--
-- Name: idx_employees_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees USING btree (status);


--
-- Name: idx_employees_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees USING btree (user_id);


--
-- Name: idx_executions_executed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON public.scheduled_message_executions USING btree (executed_at DESC);


--
-- Name: idx_executions_scheduled_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_executions_scheduled_message_id ON public.scheduled_message_executions USING btree (scheduled_message_id);


--
-- Name: idx_expenses_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON public.expenses USING btree (branch_id);


--
-- Name: idx_expenses_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses USING btree (category);


--
-- Name: idx_expenses_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses USING btree (created_by);


--
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses USING btree (date);


--
-- Name: idx_expenses_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_expenses_product_id ON public.expenses USING btree (product_id);


--
-- Name: idx_expenses_purchase_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_expenses_purchase_order_id ON public.expenses USING btree (purchase_order_id);


--
-- Name: idx_expenses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses USING btree (status);


--
-- Name: idx_failed_queue_next_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_failed_queue_next_retry ON public.whatsapp_failed_queue USING btree (next_retry_at);


--
-- Name: idx_failed_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_failed_queue_status ON public.whatsapp_failed_queue USING btree (status);


--
-- Name: idx_finance_accounts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_finance_accounts_active ON public.finance_accounts USING btree (is_active);


--
-- Name: idx_finance_accounts_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_finance_accounts_branch_id ON public.finance_accounts USING btree (branch_id);


--
-- Name: idx_finance_accounts_payment_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_finance_accounts_payment_method ON public.finance_accounts USING btree (is_payment_method);


--
-- Name: idx_finance_accounts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_finance_accounts_type ON public.finance_accounts USING btree (account_type);


--
-- Name: idx_finance_expenses_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_finance_expenses_account ON public.finance_expenses USING btree (account_id);


--
-- Name: idx_finance_expenses_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_finance_expenses_branch ON public.finance_expenses USING btree (branch_id);


--
-- Name: idx_finance_expenses_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_finance_expenses_branch_id ON public.finance_expenses USING btree (branch_id);


--
-- Name: idx_finance_expenses_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_finance_expenses_category_id ON public.finance_expenses USING btree (expense_category_id);


--
-- Name: idx_finance_expenses_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_finance_expenses_date ON public.finance_expenses USING btree (expense_date DESC);


--
-- Name: idx_finance_expenses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_finance_expenses_status ON public.finance_expenses USING btree (status);


--
-- Name: idx_finance_transfers_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_finance_transfers_branch_id ON public.finance_transfers USING btree (branch_id);


--
-- Name: idx_finance_transfers_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_finance_transfers_shared ON public.finance_transfers USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_general_settings_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_general_settings_business_id ON public.lats_pos_general_settings USING btree (business_id);


--
-- Name: idx_general_settings_passcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_general_settings_passcode ON public.lats_pos_general_settings USING btree (day_closing_passcode);


--
-- Name: idx_general_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_general_settings_user_id ON public.lats_pos_general_settings USING btree (user_id);


--
-- Name: idx_gift_card_transactions_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_branch_id ON public.gift_card_transactions USING btree (branch_id);


--
-- Name: idx_gift_cards_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_gift_cards_branch ON public.gift_cards USING btree (branch_id);


--
-- Name: idx_gift_cards_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_gift_cards_shared ON public.gift_cards USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_imei_validation_imei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_imei_validation_imei ON public.imei_validation USING btree (imei);


--
-- Name: idx_imei_validation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_imei_validation_status ON public.imei_validation USING btree (imei_status);


--
-- Name: idx_installment_payments_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_installment_payments_account ON public.installment_payments USING btree (account_id);


--
-- Name: idx_installment_payments_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_installment_payments_branch_id ON public.installment_payments USING btree (branch_id);


--
-- Name: idx_installment_payments_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_installment_payments_customer ON public.installment_payments USING btree (customer_id);


--
-- Name: idx_installment_plans_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_installment_plans_branch ON public.customer_installment_plans USING btree (branch_id);


--
-- Name: idx_installment_plans_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_installment_plans_customer ON public.customer_installment_plans USING btree (customer_id);


--
-- Name: idx_installment_plans_next_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_installment_plans_next_payment ON public.customer_installment_plans USING btree (next_payment_date);


--
-- Name: idx_installment_plans_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_installment_plans_sale ON public.customer_installment_plans USING btree (sale_id);


--
-- Name: idx_installment_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_installment_plans_status ON public.customer_installment_plans USING btree (status);


--
-- Name: idx_integrations_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_integrations_business_id ON public.lats_pos_integrations_settings USING btree (business_id);


--
-- Name: idx_integrations_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON public.lats_pos_integrations_settings USING btree (is_enabled) WHERE (is_enabled = true);


--
-- Name: idx_integrations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_integrations_type ON public.lats_pos_integrations_settings USING btree (integration_type);


--
-- Name: idx_integrations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON public.lats_pos_integrations_settings USING btree (user_id);


--
-- Name: idx_inventory_adjustments_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_created ON public.lats_inventory_adjustments USING btree (created_at);


--
-- Name: idx_inventory_adjustments_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_product ON public.lats_inventory_adjustments USING btree (product_id);


--
-- Name: idx_inventory_adjustments_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_type ON public.lats_inventory_adjustments USING btree (type);


--
-- Name: idx_inventory_adjustments_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_variant ON public.lats_inventory_adjustments USING btree (variant_id);


--
-- Name: idx_inventory_items_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON public.lats_inventory_items USING btree (barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_inventory_items_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_id ON public.inventory_items USING btree (branch_id);


--
-- Name: idx_inventory_items_imei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_items_imei ON public.lats_inventory_items USING btree (imei) WHERE (imei IS NOT NULL);


--
-- Name: idx_inventory_items_is_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_items_is_shared ON public.inventory_items USING btree (is_shared);


--
-- Name: idx_inventory_items_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_items_metadata ON public.inventory_items USING gin (metadata);


--
-- Name: idx_inventory_items_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_items_po ON public.lats_inventory_items USING btree (purchase_order_id);


--
-- Name: idx_inventory_items_po_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_items_po_item ON public.inventory_items USING btree (purchase_order_item_id);


--
-- Name: idx_inventory_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_items_product ON public.lats_inventory_items USING btree (product_id);


--
-- Name: idx_inventory_items_serial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_items_serial ON public.lats_inventory_items USING btree (serial_number) WHERE (serial_number IS NOT NULL);


--
-- Name: idx_inventory_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.lats_inventory_items USING btree (status);


--
-- Name: idx_inventory_items_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_items_variant ON public.lats_inventory_items USING btree (variant_id);


--
-- Name: idx_inventory_items_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_items_variant_id ON public.inventory_items USING btree (variant_id) WHERE (variant_id IS NOT NULL);


--
-- Name: idx_inventory_visible_branches; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_inventory_visible_branches ON public.inventory_items USING gin (visible_to_branches);


--
-- Name: idx_lats_categories_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_categories_active ON public.lats_categories USING btree (is_active);


--
-- Name: idx_lats_customers_birthday; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_customers_birthday ON public.lats_customers USING btree (birthday);


--
-- Name: idx_lats_customers_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_customers_branch ON public.lats_customers USING btree (branch_id);


--
-- Name: idx_lats_customers_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_customers_created_at ON public.lats_customers USING btree (created_at);


--
-- Name: idx_lats_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_customers_email ON public.lats_customers USING btree (email);


--
-- Name: idx_lats_customers_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_customers_is_active ON public.lats_customers USING btree (is_active);


--
-- Name: idx_lats_customers_is_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_customers_is_shared ON public.lats_customers USING btree (is_shared);


--
-- Name: idx_lats_customers_last_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_customers_last_visit ON public.lats_customers USING btree (last_visit);


--
-- Name: idx_lats_customers_loyalty_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_customers_loyalty_level ON public.lats_customers USING btree (loyalty_level);


--
-- Name: idx_lats_customers_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_customers_phone ON public.lats_customers USING btree (phone);


--
-- Name: idx_lats_customers_referred_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_customers_referred_by ON public.lats_customers USING btree (referred_by);


--
-- Name: idx_lats_customers_sharing_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_customers_sharing_mode ON public.lats_customers USING btree (sharing_mode);


--
-- Name: idx_lats_customers_whatsapp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_customers_whatsapp ON public.lats_customers USING btree (whatsapp);


--
-- Name: idx_lats_inventory_items_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_inventory_items_branch ON public.lats_inventory_items USING btree (branch_id);


--
-- Name: idx_lats_inventory_items_storage_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_inventory_items_storage_room ON public.lats_inventory_items USING btree (storage_room_id);


--
-- Name: idx_lats_pos_dynamic_pricing_settings_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_pos_dynamic_pricing_settings_business_id ON public.lats_pos_dynamic_pricing_settings USING btree (business_id);


--
-- Name: idx_lats_pos_dynamic_pricing_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_pos_dynamic_pricing_settings_user_id ON public.lats_pos_dynamic_pricing_settings USING btree (user_id);


--
-- Name: idx_lats_pos_general_settings_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_pos_general_settings_business_id ON public.lats_pos_general_settings USING btree (business_id);


--
-- Name: idx_lats_pos_general_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_pos_general_settings_user_id ON public.lats_pos_general_settings USING btree (user_id);


--
-- Name: idx_lats_pos_loyalty_customer_settings_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_pos_loyalty_customer_settings_business_id ON public.lats_pos_loyalty_customer_settings USING btree (business_id);


--
-- Name: idx_lats_pos_loyalty_customer_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_pos_loyalty_customer_settings_user_id ON public.lats_pos_loyalty_customer_settings USING btree (user_id);


--
-- Name: idx_lats_pos_receipt_settings_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_pos_receipt_settings_business_id ON public.lats_pos_receipt_settings USING btree (business_id);


--
-- Name: idx_lats_pos_receipt_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_pos_receipt_settings_user_id ON public.lats_pos_receipt_settings USING btree (user_id);


--
-- Name: idx_lats_pos_user_permissions_settings_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_pos_user_permissions_settings_business_id ON public.lats_pos_user_permissions_settings USING btree (business_id);


--
-- Name: idx_lats_pos_user_permissions_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_pos_user_permissions_settings_user_id ON public.lats_pos_user_permissions_settings USING btree (user_id);


--
-- Name: idx_lats_product_variants_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_product_variants_branch_id ON public.lats_product_variants USING btree (branch_id);


--
-- Name: idx_lats_product_variants_imei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_product_variants_imei ON public.lats_product_variants USING btree (((variant_attributes ->> 'imei'::text))) WHERE ((variant_attributes ->> 'imei'::text) IS NOT NULL);


--
-- Name: idx_lats_product_variants_imei_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_product_variants_imei_status ON public.lats_product_variants USING btree (((variant_attributes ->> 'imei_status'::text))) WHERE ((variant_type)::text = 'imei_child'::text);


--
-- Name: idx_lats_product_variants_is_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_product_variants_is_shared ON public.lats_product_variants USING btree (is_shared);


--
-- Name: idx_lats_product_variants_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_product_variants_parent_id ON public.lats_product_variants USING btree (parent_variant_id) WHERE (parent_variant_id IS NOT NULL);


--
-- Name: idx_lats_product_variants_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_product_variants_product ON public.lats_product_variants USING btree (product_id);


--
-- Name: idx_lats_product_variants_quantity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_product_variants_quantity ON public.lats_product_variants USING btree (product_id, quantity);


--
-- Name: idx_lats_product_variants_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_product_variants_status ON public.lats_product_variants USING btree (status);


--
-- Name: idx_lats_products_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_active ON public.lats_products USING btree (is_active);


--
-- Name: idx_lats_products_attributes_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_attributes_gin ON public.lats_products USING gin (attributes);


--
-- Name: idx_lats_products_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_barcode ON public.lats_products USING btree (barcode);


--
-- Name: idx_lats_products_branch_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_branch_created ON public.lats_products USING btree (branch_id, created_at DESC);


--
-- Name: idx_lats_products_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_branch_id ON public.lats_products USING btree (branch_id);


--
-- Name: idx_lats_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_category ON public.lats_products USING btree (category_id);


--
-- Name: idx_lats_products_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_category_id ON public.lats_products USING btree (category_id);


--
-- Name: idx_lats_products_condition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_condition ON public.lats_products USING btree (condition);


--
-- Name: idx_lats_products_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_is_active ON public.lats_products USING btree (is_active);


--
-- Name: idx_lats_products_is_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_is_shared ON public.lats_products USING btree (is_shared);


--
-- Name: idx_lats_products_metadata_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_metadata_gin ON public.lats_products USING gin (metadata);


--
-- Name: idx_lats_products_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_name ON public.lats_products USING btree (name);


--
-- Name: idx_lats_products_null_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_null_branch ON public.lats_products USING btree (id, created_at DESC) WHERE (branch_id IS NULL);


--
-- Name: idx_lats_products_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_shared ON public.lats_products USING btree (is_shared, branch_id);


--
-- Name: idx_lats_products_sharing_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_sharing_mode ON public.lats_products USING btree (sharing_mode);


--
-- Name: idx_lats_products_shelf_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_shelf_id ON public.lats_products USING btree (shelf_id);


--
-- Name: idx_lats_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_sku ON public.lats_products USING btree (sku);


--
-- Name: idx_lats_products_storage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_storage ON public.lats_products USING btree (storage_room_id, store_shelf_id);


--
-- Name: idx_lats_products_storage_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_storage_room_id ON public.lats_products USING btree (storage_room_id);


--
-- Name: idx_lats_products_store_shelf_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_store_shelf_id ON public.lats_products USING btree (store_shelf_id);


--
-- Name: idx_lats_products_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_supplier ON public.lats_products USING btree (supplier_id);


--
-- Name: idx_lats_products_tags_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_products_tags_gin ON public.lats_products USING gin (tags);


--
-- Name: idx_lats_purchase_order_payments_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_purchase_order_payments_branch_id ON public.lats_purchase_order_payments USING btree (branch_id);


--
-- Name: idx_lats_purchase_orders_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_purchase_orders_branch_id ON public.lats_purchase_orders USING btree (branch_id);


--
-- Name: idx_lats_purchase_orders_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_purchase_orders_currency ON public.lats_purchase_orders USING btree (currency);


--
-- Name: idx_lats_purchase_orders_exchange_rate_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_purchase_orders_exchange_rate_date ON public.lats_purchase_orders USING btree (exchange_rate_date);


--
-- Name: idx_lats_purchase_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_purchase_orders_status ON public.lats_purchase_orders USING btree (status);


--
-- Name: idx_lats_receipts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_receipts_created_at ON public.lats_receipts USING btree (created_at DESC);


--
-- Name: idx_lats_receipts_customer_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_receipts_customer_phone ON public.lats_receipts USING btree (customer_phone);


--
-- Name: idx_lats_receipts_receipt_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_receipts_receipt_number ON public.lats_receipts USING btree (receipt_number);


--
-- Name: idx_lats_receipts_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_receipts_sale_id ON public.lats_receipts USING btree (sale_id);


--
-- Name: idx_lats_sale_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_sale_items_product_id ON public.lats_sale_items USING btree (product_id);


--
-- Name: idx_lats_sale_items_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_sale_items_sale_id ON public.lats_sale_items USING btree (sale_id);


--
-- Name: idx_lats_sales_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_sales_branch_id ON public.lats_sales USING btree (branch_id);


--
-- Name: idx_lats_sales_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_sales_created_at ON public.lats_sales USING btree (created_at DESC);


--
-- Name: idx_lats_sales_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_sales_customer_id ON public.lats_sales USING btree (customer_id);


--
-- Name: idx_lats_sales_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_sales_status ON public.lats_sales USING btree (status);


--
-- Name: idx_lats_sales_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_sales_user_id ON public.lats_sales USING btree (user_id);


--
-- Name: idx_lats_stock_movements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_created_at ON public.lats_stock_movements USING btree (created_at DESC);


--
-- Name: idx_lats_stock_movements_movement_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_movement_type ON public.lats_stock_movements USING btree (movement_type);


--
-- Name: idx_lats_stock_movements_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_product_id ON public.lats_stock_movements USING btree (product_id);


--
-- Name: idx_lats_stock_movements_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_variant_id ON public.lats_stock_movements USING btree (variant_id);


--
-- Name: idx_lats_stock_transfers_from_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_stock_transfers_from_branch ON public.lats_stock_transfers USING btree (from_branch_id);


--
-- Name: idx_lats_stock_transfers_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_stock_transfers_product ON public.lats_stock_transfers USING btree (product_id);


--
-- Name: idx_lats_stock_transfers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_stock_transfers_status ON public.lats_stock_transfers USING btree (status);


--
-- Name: idx_lats_stock_transfers_to_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_stock_transfers_to_branch ON public.lats_stock_transfers USING btree (to_branch_id);


--
-- Name: idx_lats_stock_transfers_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_stock_transfers_variant ON public.lats_stock_transfers USING btree (variant_id);


--
-- Name: idx_lats_store_locations_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_store_locations_city ON public.lats_store_locations USING btree (city);


--
-- Name: idx_lats_store_locations_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_store_locations_code ON public.lats_store_locations USING btree (code);


--
-- Name: idx_lats_store_locations_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_store_locations_is_active ON public.lats_store_locations USING btree (is_active);


--
-- Name: idx_lats_store_rooms_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_store_rooms_code ON public.lats_store_rooms USING btree (code);


--
-- Name: idx_lats_store_rooms_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_store_rooms_is_active ON public.lats_store_rooms USING btree (is_active);


--
-- Name: idx_lats_store_rooms_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_store_rooms_location_id ON public.lats_store_rooms USING btree (store_location_id);


--
-- Name: idx_lats_store_shelves_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_code ON public.lats_store_shelves USING btree (code);


--
-- Name: idx_lats_store_shelves_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_is_active ON public.lats_store_shelves USING btree (is_active);


--
-- Name: idx_lats_store_shelves_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_location_id ON public.lats_store_shelves USING btree (store_location_id);


--
-- Name: idx_lats_store_shelves_storage_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_storage_room_id ON public.lats_store_shelves USING btree (storage_room_id);


--
-- Name: idx_lats_suppliers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_suppliers_active ON public.lats_suppliers USING btree (is_active);


--
-- Name: idx_lats_suppliers_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_suppliers_city ON public.lats_suppliers USING btree (city);


--
-- Name: idx_lats_suppliers_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_suppliers_country ON public.lats_suppliers USING btree (country);


--
-- Name: idx_lats_suppliers_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_suppliers_created_at ON public.lats_suppliers USING btree (created_at DESC);


--
-- Name: idx_lats_suppliers_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_suppliers_is_active ON public.lats_suppliers USING btree (is_active);


--
-- Name: idx_lats_suppliers_is_trade_in; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_suppliers_is_trade_in ON public.lats_suppliers USING btree (is_trade_in_customer);


--
-- Name: idx_lats_suppliers_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_suppliers_name ON public.lats_suppliers USING btree (name);


--
-- Name: idx_lats_suppliers_preferred_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lats_suppliers_preferred_currency ON public.lats_suppliers USING btree (preferred_currency);


--
-- Name: idx_leave_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leave_dates ON public.leave_requests USING btree (start_date, end_date);


--
-- Name: idx_leave_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leave_employee_id ON public.leave_requests USING btree (employee_id);


--
-- Name: idx_leave_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leave_status ON public.leave_requests USING btree (status);


--
-- Name: idx_loyalty_customer_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_loyalty_customer_settings_user_id ON public.lats_pos_loyalty_customer_settings USING btree (user_id);


--
-- Name: idx_loyalty_points_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_loyalty_points_branch ON public.loyalty_points USING btree (branch_id);


--
-- Name: idx_loyalty_points_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_loyalty_points_created_at ON public.loyalty_points USING btree (created_at);


--
-- Name: idx_loyalty_points_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer ON public.loyalty_points USING btree (customer_id);


--
-- Name: idx_loyalty_points_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_loyalty_points_type ON public.loyalty_points USING btree (points_type);


--
-- Name: idx_loyalty_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_loyalty_settings_user_id ON public.lats_pos_loyalty_customer_settings USING btree (user_id);


--
-- Name: idx_media_library_file_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_media_library_file_type ON public.whatsapp_media_library USING btree (file_type);


--
-- Name: idx_media_library_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_media_library_folder ON public.whatsapp_media_library USING btree (folder);


--
-- Name: idx_media_library_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_media_library_uploaded_by ON public.whatsapp_media_library USING btree (uploaded_by);


--
-- Name: idx_mobile_money_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mobile_money_customer ON public.mobile_money_transactions USING btree (customer_id);


--
-- Name: idx_mobile_money_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mobile_money_date ON public.mobile_money_transactions USING btree (message_date DESC);


--
-- Name: idx_mobile_money_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mobile_money_processed ON public.mobile_money_transactions USING btree (is_processed);


--
-- Name: idx_mobile_money_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mobile_money_provider ON public.mobile_money_transactions USING btree (provider);


--
-- Name: idx_mobile_money_receiver_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mobile_money_receiver_phone ON public.mobile_money_transactions USING btree (receiver_phone);


--
-- Name: idx_mobile_money_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mobile_money_reference ON public.mobile_money_transactions USING btree (reference_number);


--
-- Name: idx_mobile_money_sender_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mobile_money_sender_phone ON public.mobile_money_transactions USING btree (sender_phone);


--
-- Name: idx_mobile_money_transactions_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_branch_id ON public.mobile_money_transactions USING btree (branch_id);


--
-- Name: idx_mobile_money_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mobile_money_type ON public.mobile_money_transactions USING btree (transaction_type);


--
-- Name: idx_notification_settings_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notification_settings_business_id ON public.lats_pos_notification_settings USING btree (business_id);


--
-- Name: idx_notification_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.lats_pos_notification_settings USING btree (user_id);


--
-- Name: idx_notifications_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_branch_id ON public.notifications USING btree (branch_id);


--
-- Name: idx_notifications_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications USING btree (category);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON public.notifications USING btree (customer_id);


--
-- Name: idx_notifications_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_device_id ON public.notifications USING btree (device_id);


--
-- Name: idx_notifications_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_group_id ON public.notifications USING btree (group_id);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.campaign_notifications USING btree (is_read);


--
-- Name: idx_notifications_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications USING btree (priority);


--
-- Name: idx_notifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications USING btree (status);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_user_priority ON public.notifications USING btree (user_id, priority);


--
-- Name: idx_notifications_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON public.notifications USING btree (user_id, status);


--
-- Name: idx_payment_methods_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON public.payment_methods USING btree (is_active);


--
-- Name: idx_payment_trans_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_payment_trans_created ON public.payment_transactions USING btree (created_at);


--
-- Name: idx_payment_trans_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_payment_trans_customer ON public.payment_transactions USING btree (customer_id);


--
-- Name: idx_payment_trans_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_payment_trans_order ON public.payment_transactions USING btree (order_id);


--
-- Name: idx_payment_trans_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_payment_trans_provider ON public.payment_transactions USING btree (provider);


--
-- Name: idx_payment_trans_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_payment_trans_sale ON public.payment_transactions USING btree (sale_id);


--
-- Name: idx_payment_trans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_payment_trans_status ON public.payment_transactions USING btree (status);


--
-- Name: idx_payment_transactions_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_payment_transactions_branch ON public.payment_transactions USING btree (branch_id);


--
-- Name: idx_payment_transactions_sale_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payment_transactions_sale_id_unique ON public.payment_transactions USING btree (sale_id) WHERE (sale_id IS NOT NULL);


--
-- Name: idx_permissions_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_permissions_settings_user_id ON public.lats_pos_user_permissions_settings USING btree (user_id);


--
-- Name: idx_po_items_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_items_variant ON public.lats_purchase_order_items USING btree (variant_id);


--
-- Name: idx_po_payments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_payments_date ON public.lats_purchase_order_payments USING btree (payment_date);


--
-- Name: idx_po_payments_payment_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_payments_payment_account_id ON public.purchase_order_payments USING btree (payment_account_id);


--
-- Name: idx_po_payments_payment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_payments_payment_date ON public.purchase_order_payments USING btree (payment_date);


--
-- Name: idx_po_payments_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_payments_po ON public.lats_purchase_order_payments USING btree (purchase_order_id);


--
-- Name: idx_po_payments_purchase_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_payments_purchase_order_id ON public.purchase_order_payments USING btree (purchase_order_id);


--
-- Name: idx_po_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_payments_status ON public.purchase_order_payments USING btree (status);


--
-- Name: idx_po_quality_check_items_po_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_quality_check_items_po_item ON public.purchase_order_quality_check_items USING btree (purchase_order_item_id);


--
-- Name: idx_po_quality_check_items_qc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_quality_check_items_qc ON public.purchase_order_quality_check_items USING btree (quality_check_id);


--
-- Name: idx_po_quality_checks_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_quality_checks_po ON public.purchase_order_quality_checks USING btree (purchase_order_id);


--
-- Name: idx_po_quality_checks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_quality_checks_status ON public.purchase_order_quality_checks USING btree (status);


--
-- Name: idx_po_shipping_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_shipping_agent ON public.lats_purchase_order_shipping USING btree (shipping_agent_id);


--
-- Name: idx_po_shipping_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_shipping_method ON public.lats_purchase_order_shipping USING btree (shipping_method_id);


--
-- Name: idx_po_shipping_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_shipping_order_id ON public.lats_purchase_order_shipping USING btree (purchase_order_id);


--
-- Name: idx_po_shipping_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_shipping_status ON public.lats_purchase_order_shipping USING btree (shipping_status);


--
-- Name: idx_po_shipping_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_shipping_tracking ON public.lats_purchase_order_shipping USING btree (tracking_number) WHERE (tracking_number IS NOT NULL);


--
-- Name: idx_points_history_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_points_history_customer_id ON public.customer_points_history USING btree (customer_id);


--
-- Name: idx_points_transactions_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_points_transactions_branch_id ON public.points_transactions USING btree (branch_id);


--
-- Name: idx_points_transactions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_points_transactions_created ON public.points_transactions USING btree (created_at DESC);


--
-- Name: idx_points_transactions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_points_transactions_customer ON public.points_transactions USING btree (customer_id);


--
-- Name: idx_points_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_points_transactions_type ON public.points_transactions USING btree (transaction_type);


--
-- Name: idx_pricing_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pricing_settings_user_id ON public.lats_pos_dynamic_pricing_settings USING btree (user_id);


--
-- Name: idx_product_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_category ON public.product_interests USING btree (product_category);


--
-- Name: idx_product_images_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_images_created_at ON public.product_images USING btree (created_at);


--
-- Name: idx_product_images_is_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON public.product_images USING btree (is_primary);


--
-- Name: idx_product_images_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images USING btree (product_id);


--
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_active ON public.lats_products USING btree (is_active);


--
-- Name: idx_products_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.lats_products USING btree (barcode);


--
-- Name: idx_products_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_branch ON public.lats_products USING btree (branch_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_category ON public.lats_products USING btree (category_id);


--
-- Name: idx_products_category_text; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_category_text ON public.lats_products USING btree (category);


--
-- Name: idx_products_is_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_is_shared ON public.lats_products USING btree (is_shared);


--
-- Name: idx_products_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_shared ON public.lats_products USING btree (is_shared);


--
-- Name: idx_products_sharing_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_sharing_mode ON public.lats_products USING btree (sharing_mode);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.lats_products USING btree (sku);


--
-- Name: idx_products_visible_branches; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_products_visible_branches ON public.lats_products USING gin (visible_to_branches);


--
-- Name: idx_purchase_order_audit_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_purchase_order_audit_order_id ON public.purchase_order_audit USING btree (purchase_order_id);


--
-- Name: idx_purchase_order_audit_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_purchase_order_audit_timestamp ON public.purchase_order_audit USING btree ("timestamp" DESC);


--
-- Name: idx_purchase_order_payments_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_purchase_order_payments_branch_id ON public.purchase_order_payments USING btree (branch_id);


--
-- Name: idx_purchase_orders_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch ON public.lats_purchase_orders USING btree (branch_id);


--
-- Name: idx_quality_check_criteria_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_quality_check_criteria_template ON public.quality_check_criteria USING btree (template_id);


--
-- Name: idx_quality_checks_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_quality_checks_branch ON public.quality_checks USING btree (branch_id);


--
-- Name: idx_quality_checks_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_quality_checks_shared ON public.quality_checks USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_rec_exp_history_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rec_exp_history_date ON public.recurring_expense_history USING btree (processed_date);


--
-- Name: idx_rec_exp_history_recurring; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rec_exp_history_recurring ON public.recurring_expense_history USING btree (recurring_expense_id);


--
-- Name: idx_rec_exp_history_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rec_exp_history_status ON public.recurring_expense_history USING btree (status);


--
-- Name: idx_receipt_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_receipt_settings_user_id ON public.lats_pos_receipt_settings USING btree (user_id);


--
-- Name: idx_recipient_lists_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recipient_lists_is_active ON public.message_recipient_lists USING btree (is_active);


--
-- Name: idx_recipient_lists_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recipient_lists_user_id ON public.message_recipient_lists USING btree (user_id);


--
-- Name: idx_recurring_exp_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recurring_exp_account ON public.recurring_expenses USING btree (account_id);


--
-- Name: idx_recurring_exp_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recurring_exp_active ON public.recurring_expenses USING btree (is_active);


--
-- Name: idx_recurring_exp_auto_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recurring_exp_auto_process ON public.recurring_expenses USING btree (auto_process);


--
-- Name: idx_recurring_exp_frequency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recurring_exp_frequency ON public.recurring_expenses USING btree (frequency);


--
-- Name: idx_recurring_exp_next_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recurring_exp_next_due ON public.recurring_expenses USING btree (next_due_date);


--
-- Name: idx_recurring_expenses_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_branch ON public.recurring_expenses USING btree (branch_id);


--
-- Name: idx_recurring_expenses_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_shared ON public.recurring_expenses USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_reminders_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON public.reminders USING btree (assigned_to);


--
-- Name: idx_reminders_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminders_branch_id ON public.reminders USING btree (branch_id);


--
-- Name: idx_reminders_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminders_category ON public.reminders USING btree (category);


--
-- Name: idx_reminders_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON public.reminders USING btree (created_by);


--
-- Name: idx_reminders_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminders_date ON public.reminders USING btree (date);


--
-- Name: idx_reminders_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminders_datetime ON public.reminders USING btree (date, "time");


--
-- Name: idx_reminders_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminders_priority ON public.reminders USING btree (priority);


--
-- Name: idx_reminders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders USING btree (status);


--
-- Name: idx_repair_parts_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_repair_parts_branch_id ON public.repair_parts USING btree (branch_id);


--
-- Name: idx_reply_templates_auto_send; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reply_templates_auto_send ON public.whatsapp_reply_templates USING btree (auto_send);


--
-- Name: idx_reply_templates_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reply_templates_category ON public.whatsapp_reply_templates USING btree (category);


--
-- Name: idx_report_attachments_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_report_attachments_report_id ON public.report_attachments USING btree (report_id);


--
-- Name: idx_reports_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reports_branch_id ON public.reports USING btree (branch_id);


--
-- Name: idx_reports_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports USING btree (created_at DESC);


--
-- Name: idx_reports_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reports_created_by ON public.reports USING btree (created_by);


--
-- Name: idx_reports_customer_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reports_customer_phone ON public.reports USING btree (customer_phone);


--
-- Name: idx_reports_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reports_priority ON public.reports USING btree (priority);


--
-- Name: idx_reports_report_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reports_report_type ON public.reports USING btree (report_type);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports USING btree (status);


--
-- Name: idx_returns_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_returns_created_at ON public.returns USING btree (created_at DESC);


--
-- Name: idx_returns_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON public.returns USING btree (customer_id);


--
-- Name: idx_returns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns USING btree (status);


--
-- Name: idx_sale_inventory_items_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sale_inventory_items_customer_id ON public.sale_inventory_items USING btree (customer_id);


--
-- Name: idx_sale_inventory_items_inventory_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sale_inventory_items_inventory_item_id ON public.sale_inventory_items USING btree (inventory_item_id);


--
-- Name: idx_sale_inventory_items_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sale_inventory_items_sale_id ON public.sale_inventory_items USING btree (sale_id);


--
-- Name: idx_sale_items_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sale_items_branch ON public.lats_sale_items USING btree (branch_id);


--
-- Name: idx_sale_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.lats_sale_items USING btree (product_id);


--
-- Name: idx_sale_items_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.lats_sale_items USING btree (sale_id);


--
-- Name: idx_sales_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_branch ON public.lats_sales USING btree (branch_id);


--
-- Name: idx_sales_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.lats_sales USING btree (created_at);


--
-- Name: idx_sales_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.lats_sales USING btree (customer_id);


--
-- Name: idx_sales_sale_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON public.lats_sales USING btree (sale_number);


--
-- Name: idx_sales_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_stage ON public.sales_pipeline USING btree (stage);


--
-- Name: idx_scanner_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scanner_settings_user_id ON public.lats_pos_barcode_scanner_settings USING btree (user_id);


--
-- Name: idx_scheduled_campaigns_scheduled_for; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_campaigns_scheduled_for ON public.whatsapp_scheduled_campaigns USING btree (scheduled_for);


--
-- Name: idx_scheduled_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_campaigns_status ON public.whatsapp_scheduled_campaigns USING btree (status);


--
-- Name: idx_scheduled_messages_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_branch_id ON public.scheduled_bulk_messages USING btree (branch_id);


--
-- Name: idx_scheduled_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_created_at ON public.scheduled_bulk_messages USING btree (created_at DESC);


--
-- Name: idx_scheduled_messages_execution_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_execution_mode ON public.scheduled_bulk_messages USING btree (execution_mode);


--
-- Name: idx_scheduled_messages_message_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_message_type ON public.scheduled_bulk_messages USING btree (message_type);


--
-- Name: idx_scheduled_messages_next_execution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_next_execution ON public.scheduled_bulk_messages USING btree (next_execution_at) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'scheduled'::character varying])::text[]));


--
-- Name: idx_scheduled_messages_scheduled_for; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_for ON public.scheduled_bulk_messages USING btree (scheduled_for);


--
-- Name: idx_scheduled_messages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON public.scheduled_bulk_messages USING btree (status);


--
-- Name: idx_scheduled_messages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_user_id ON public.scheduled_bulk_messages USING btree (user_id);


--
-- Name: idx_scheduled_transfer_executions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_transfer_executions_date ON public.scheduled_transfer_executions USING btree (execution_date);


--
-- Name: idx_scheduled_transfer_executions_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_transfer_executions_schedule ON public.scheduled_transfer_executions USING btree (scheduled_transfer_id);


--
-- Name: idx_scheduled_transfer_executions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_transfer_executions_status ON public.scheduled_transfer_executions USING btree (status);


--
-- Name: idx_scheduled_transfers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_transfers_active ON public.scheduled_transfers USING btree (is_active);


--
-- Name: idx_scheduled_transfers_destination_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_transfers_destination_account ON public.scheduled_transfers USING btree (destination_account_id);


--
-- Name: idx_scheduled_transfers_frequency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_transfers_frequency ON public.scheduled_transfers USING btree (frequency);


--
-- Name: idx_scheduled_transfers_next_execution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_transfers_next_execution ON public.scheduled_transfers USING btree (next_execution_date) WHERE (is_active = true);


--
-- Name: idx_scheduled_transfers_source_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_transfers_source_account ON public.scheduled_transfers USING btree (source_account_id);


--
-- Name: idx_search_filter_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_search_filter_settings_user_id ON public.lats_pos_search_filter_settings USING btree (user_id);


--
-- Name: idx_search_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_search_settings_user_id ON public.lats_pos_search_filter_settings USING btree (user_id);


--
-- Name: idx_serial_movements_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_serial_movements_date ON public.serial_number_movements USING btree (created_at);


--
-- Name: idx_serial_movements_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_serial_movements_item ON public.serial_number_movements USING btree (inventory_item_id);


--
-- Name: idx_serial_movements_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_serial_movements_type ON public.serial_number_movements USING btree (movement_type);


--
-- Name: idx_settings_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings USING btree (key);


--
-- Name: idx_shelves_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shelves_code ON public.shelves USING btree (code);


--
-- Name: idx_shelves_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shelves_room ON public.shelves USING btree (storage_room_id);


--
-- Name: idx_shifts_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shifts_date ON public.employee_shifts USING btree (shift_date);


--
-- Name: idx_shifts_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shifts_employee_date ON public.employee_shifts USING btree (employee_id, shift_date);


--
-- Name: idx_shifts_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shifts_employee_id ON public.employee_shifts USING btree (employee_id);


--
-- Name: idx_shipping_agents_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shipping_agents_active ON public.lats_shipping_agents USING btree (is_active);


--
-- Name: idx_shipping_agents_methods; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shipping_agents_methods ON public.lats_shipping_agents USING gin (shipping_methods);


--
-- Name: idx_shipping_agents_preferred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shipping_agents_preferred ON public.lats_shipping_agents USING btree (is_preferred) WHERE (is_preferred = true);


--
-- Name: idx_shipping_methods_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shipping_methods_active ON public.lats_shipping_methods USING btree (is_active);


--
-- Name: idx_shipping_methods_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shipping_methods_code ON public.lats_shipping_methods USING btree (code);


--
-- Name: idx_shipping_purchase_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shipping_purchase_order ON public.lats_shipping USING btree (purchase_order_id);


--
-- Name: idx_shipping_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shipping_status ON public.lats_shipping USING btree (status);


--
-- Name: idx_sms_logs_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sms_logs_branch ON public.sms_logs USING btree (branch_id);


--
-- Name: idx_sms_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.sms_logs USING btree (created_at DESC);


--
-- Name: idx_sms_logs_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sms_logs_device_id ON public.sms_logs USING btree (device_id);


--
-- Name: idx_sms_logs_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON public.sms_logs USING btree (phone_number);


--
-- Name: idx_sms_logs_recipient_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient_phone ON public.sms_logs USING btree (recipient_phone);


--
-- Name: idx_sms_logs_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sms_logs_shared ON public.sms_logs USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_sms_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs USING btree (status);


--
-- Name: idx_sms_triggers_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sms_triggers_type ON public.sms_triggers USING btree (trigger_type);


--
-- Name: idx_spare_part_usage_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_spare_part_usage_device_id ON public.lats_spare_part_usage USING btree (device_id);


--
-- Name: idx_spare_part_usage_spare_part_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_spare_part_usage_spare_part_id ON public.lats_spare_part_usage USING btree (spare_part_id);


--
-- Name: idx_spare_part_variants_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_spare_part_variants_sku ON public.lats_spare_part_variants USING btree (sku) WHERE (sku IS NOT NULL);


--
-- Name: idx_spare_part_variants_spare_part_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_spare_part_variants_spare_part_id ON public.lats_spare_part_variants USING btree (spare_part_id);


--
-- Name: idx_special_order_payments_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_special_order_payments_branch_id ON public.special_order_payments USING btree (branch_id);


--
-- Name: idx_special_order_payments_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_special_order_payments_order ON public.special_order_payments USING btree (special_order_id);


--
-- Name: idx_special_orders_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_special_orders_branch ON public.customer_special_orders USING btree (branch_id);


--
-- Name: idx_special_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_special_orders_customer ON public.customer_special_orders USING btree (customer_id);


--
-- Name: idx_special_orders_expected_arrival; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_special_orders_expected_arrival ON public.customer_special_orders USING btree (expected_arrival_date);


--
-- Name: idx_special_orders_order_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_special_orders_order_date ON public.customer_special_orders USING btree (order_date);


--
-- Name: idx_special_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_special_orders_status ON public.customer_special_orders USING btree (status);


--
-- Name: idx_stock_movements_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_movements_branch ON public.lats_stock_movements USING btree (branch_id);


--
-- Name: idx_stock_movements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.lats_stock_movements USING btree (created_at DESC);


--
-- Name: idx_stock_movements_from_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_movements_from_branch ON public.lats_stock_movements USING btree (from_branch_id);


--
-- Name: idx_stock_movements_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.lats_stock_movements USING btree (product_id);


--
-- Name: idx_stock_movements_product_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_variant ON public.lats_stock_movements USING btree (product_id, variant_id);


--
-- Name: idx_stock_movements_to_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_movements_to_branch ON public.lats_stock_movements USING btree (to_branch_id);


--
-- Name: idx_stock_movements_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.lats_stock_movements USING btree (movement_type);


--
-- Name: idx_stock_movements_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON public.lats_stock_movements USING btree (variant_id);


--
-- Name: idx_storage_rooms_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_storage_rooms_location ON public.storage_rooms USING btree (store_location_id);


--
-- Name: idx_store_locations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_store_locations_active ON public.store_locations USING btree (is_active);


--
-- Name: idx_store_locations_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_store_locations_code ON public.store_locations USING btree (code);


--
-- Name: idx_store_locations_is_main; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_store_locations_is_main ON public.store_locations USING btree (is_main);


--
-- Name: idx_store_locations_isolation_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_store_locations_isolation_mode ON public.store_locations USING btree (data_isolation_mode);


--
-- Name: idx_store_locations_share_accounts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_store_locations_share_accounts ON public.store_locations USING btree (share_accounts);


--
-- Name: idx_store_locations_share_inventory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_store_locations_share_inventory ON public.store_locations USING btree (share_inventory);


--
-- Name: idx_store_locations_share_products; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_store_locations_share_products ON public.store_locations USING btree (share_products);


--
-- Name: idx_store_rooms_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_store_rooms_is_active ON public.lats_store_rooms USING btree (is_active);


--
-- Name: idx_store_shelves_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_store_shelves_is_active ON public.lats_store_shelves USING btree (is_active);


--
-- Name: idx_store_shelves_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_store_shelves_room_id ON public.lats_store_shelves USING btree (room_id);


--
-- Name: idx_supplier_categories_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_categories_parent ON public.lats_supplier_categories USING btree (parent_id) WHERE (parent_id IS NOT NULL);


--
-- Name: idx_supplier_category_mapping_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_category_mapping_category ON public.lats_supplier_category_mapping USING btree (category_id);


--
-- Name: idx_supplier_category_mapping_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_category_mapping_supplier ON public.lats_supplier_category_mapping USING btree (supplier_id);


--
-- Name: idx_supplier_comms_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_comms_date ON public.lats_supplier_communications USING btree (created_at DESC);


--
-- Name: idx_supplier_comms_follow_up; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_comms_follow_up ON public.lats_supplier_communications USING btree (follow_up_required, follow_up_date) WHERE (follow_up_required = true);


--
-- Name: idx_supplier_comms_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_comms_supplier_id ON public.lats_supplier_communications USING btree (supplier_id);


--
-- Name: idx_supplier_contracts_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_contracts_end_date ON public.lats_supplier_contracts USING btree (end_date);


--
-- Name: idx_supplier_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_contracts_status ON public.lats_supplier_contracts USING btree (status);


--
-- Name: idx_supplier_contracts_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_contracts_supplier_id ON public.lats_supplier_contracts USING btree (supplier_id);


--
-- Name: idx_supplier_documents_expiry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_documents_expiry_date ON public.lats_supplier_documents USING btree (expiry_date) WHERE (expiry_date IS NOT NULL);


--
-- Name: idx_supplier_documents_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier_id ON public.lats_supplier_documents USING btree (supplier_id);


--
-- Name: idx_supplier_documents_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_documents_type ON public.lats_supplier_documents USING btree (document_type);


--
-- Name: idx_supplier_ratings_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_ratings_date ON public.lats_supplier_ratings USING btree (created_at DESC);


--
-- Name: idx_supplier_ratings_overall; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_ratings_overall ON public.lats_supplier_ratings USING btree (overall_rating);


--
-- Name: idx_supplier_ratings_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier_id ON public.lats_supplier_ratings USING btree (supplier_id);


--
-- Name: idx_supplier_tag_mapping_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_tag_mapping_supplier ON public.lats_supplier_tag_mapping USING btree (supplier_id);


--
-- Name: idx_supplier_tag_mapping_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supplier_tag_mapping_tag ON public.lats_supplier_tag_mapping USING btree (tag_id);


--
-- Name: idx_suppliers_average_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_suppliers_average_rating ON public.lats_suppliers USING btree (average_rating) WHERE (average_rating IS NOT NULL);


--
-- Name: idx_suppliers_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_suppliers_branch ON public.lats_suppliers USING btree (branch_id);


--
-- Name: idx_suppliers_business_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_suppliers_business_type ON public.lats_suppliers USING btree (business_type);


--
-- Name: idx_suppliers_is_favorite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_suppliers_is_favorite ON public.lats_suppliers USING btree (is_favorite) WHERE (is_favorite = true);


--
-- Name: idx_suppliers_is_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_suppliers_is_shared ON public.lats_suppliers USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_suppliers_is_trade_in_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_suppliers_is_trade_in_customer ON public.lats_suppliers USING btree (is_trade_in_customer);


--
-- Name: idx_suppliers_last_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_suppliers_last_contact ON public.lats_suppliers USING btree (last_contact_date) WHERE (last_contact_date IS NOT NULL);


--
-- Name: idx_suppliers_next_follow_up; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_suppliers_next_follow_up ON public.lats_suppliers USING btree (next_follow_up_date) WHERE (next_follow_up_date IS NOT NULL);


--
-- Name: idx_suppliers_priority_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_suppliers_priority_level ON public.lats_suppliers USING btree (priority_level);


--
-- Name: idx_suppliers_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_suppliers_shared ON public.lats_suppliers USING btree (is_shared);


--
-- Name: idx_templates_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_templates_category ON public.bulk_message_templates USING btree (category);


--
-- Name: idx_templates_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_templates_is_active ON public.bulk_message_templates USING btree (is_active);


--
-- Name: idx_templates_message_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_templates_message_type ON public.bulk_message_templates USING btree (message_type);


--
-- Name: idx_templates_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.bulk_message_templates USING btree (user_id);


--
-- Name: idx_trade_in_contracts_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_contracts_customer ON public.lats_trade_in_contracts USING btree (customer_id);


--
-- Name: idx_trade_in_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_contracts_status ON public.lats_trade_in_contracts USING btree (status);


--
-- Name: idx_trade_in_contracts_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_contracts_transaction ON public.lats_trade_in_contracts USING btree (transaction_id);


--
-- Name: idx_trade_in_damage_spare_part; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_damage_spare_part ON public.lats_trade_in_damage_assessments USING btree (spare_part_id);


--
-- Name: idx_trade_in_damage_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_damage_transaction ON public.lats_trade_in_damage_assessments USING btree (transaction_id);


--
-- Name: idx_trade_in_prices_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_prices_active ON public.lats_trade_in_prices USING btree (is_active);


--
-- Name: idx_trade_in_prices_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_prices_branch ON public.lats_trade_in_prices USING btree (branch_id);


--
-- Name: idx_trade_in_prices_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_prices_product ON public.lats_trade_in_prices USING btree (product_id);


--
-- Name: idx_trade_in_prices_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_prices_variant ON public.lats_trade_in_prices USING btree (variant_id);


--
-- Name: idx_trade_in_transactions_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_branch ON public.lats_trade_in_transactions USING btree (branch_id);


--
-- Name: idx_trade_in_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_created_at ON public.lats_trade_in_transactions USING btree (created_at DESC);


--
-- Name: idx_trade_in_transactions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_customer ON public.lats_trade_in_transactions USING btree (customer_id);


--
-- Name: idx_trade_in_transactions_imei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_imei ON public.lats_trade_in_transactions USING btree (device_imei);


--
-- Name: idx_trade_in_transactions_new_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_new_product ON public.lats_trade_in_transactions USING btree (new_product_id);


--
-- Name: idx_trade_in_transactions_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_sale ON public.lats_trade_in_transactions USING btree (sale_id);


--
-- Name: idx_trade_in_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trade_in_transactions_status ON public.lats_trade_in_transactions USING btree (status);


--
-- Name: idx_unique_customer_phone_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_customer_phone_name ON public.lats_customers USING btree (phone, name) WHERE ((phone IS NOT NULL) AND (name IS NOT NULL));


--
-- Name: idx_unique_imei; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_imei ON public.lats_product_variants USING btree (((variant_attributes ->> 'imei'::text))) WHERE (((variant_type)::text = 'imei_child'::text) AND ((variant_attributes ->> 'imei'::text) IS NOT NULL) AND ((variant_attributes ->> 'imei'::text) <> ''::text) AND (((variant_attributes ->> 'imei_status'::text) IS NULL) OR ((variant_attributes ->> 'imei_status'::text) <> 'duplicate'::text)));


--
-- Name: idx_user_branch_assignments_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_branch ON public.user_branch_assignments USING btree (branch_id);


--
-- Name: idx_user_branch_assignments_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_primary ON public.user_branch_assignments USING btree (is_primary);


--
-- Name: idx_user_branch_assignments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_user ON public.user_branch_assignments USING btree (user_id);


--
-- Name: idx_user_daily_goals_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_daily_goals_active ON public.user_daily_goals USING btree (user_id, date, is_active) WHERE (is_active = true);


--
-- Name: idx_user_permissions_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_permissions_settings_user_id ON public.lats_pos_user_permissions_settings USING btree (user_id);


--
-- Name: idx_user_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_user_sessions_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions USING btree (is_active);


--
-- Name: idx_user_sessions_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions USING btree (last_activity DESC);


--
-- Name: idx_user_sessions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions USING btree (session_id);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_user_settings_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON public.user_settings USING btree (updated_at);


--
-- Name: idx_user_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings USING btree (user_id);


--
-- Name: idx_user_whatsapp_prefs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_whatsapp_prefs_user ON public.user_whatsapp_preferences USING btree (user_id);


--
-- Name: idx_users_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_branch_id ON public.users USING btree (branch_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users USING btree (username);


--
-- Name: idx_validation_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_validation_product ON public.lats_product_validation USING btree (product_id);


--
-- Name: idx_validation_shipping; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_validation_shipping ON public.lats_product_validation USING btree (shipping_id);


--
-- Name: idx_validation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_validation_status ON public.lats_product_validation USING btree (is_validated);


--
-- Name: idx_variant_attributes_imei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variant_attributes_imei ON public.lats_product_variants USING gin (variant_attributes);


--
-- Name: idx_variant_imei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variant_imei ON public.lats_product_variants USING btree (((variant_attributes ->> 'imei'::text))) WHERE ((variant_type)::text = 'imei_child'::text);


--
-- Name: idx_variant_is_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variant_is_parent ON public.lats_product_variants USING btree (is_parent) WHERE (is_parent = true);


--
-- Name: idx_variant_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variant_parent_id ON public.lats_product_variants USING btree (parent_variant_id) WHERE (parent_variant_id IS NOT NULL);


--
-- Name: idx_variant_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variant_type ON public.lats_product_variants USING btree (variant_type);


--
-- Name: idx_variants_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variants_active ON public.lats_product_variants USING btree (is_active);


--
-- Name: idx_variants_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variants_branch ON public.lats_product_variants USING btree (branch_id);


--
-- Name: idx_variants_imei_attributes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variants_imei_attributes ON public.lats_product_variants USING gin (variant_attributes) WHERE ((variant_type)::text = ANY (ARRAY[('imei'::character varying)::text, ('imei_child'::character varying)::text]));


--
-- Name: idx_variants_is_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variants_is_shared ON public.lats_product_variants USING btree (is_shared);


--
-- Name: idx_variants_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variants_parent_id ON public.lats_product_variants USING btree (parent_variant_id) WHERE (parent_variant_id IS NOT NULL);


--
-- Name: idx_variants_parent_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variants_parent_type ON public.lats_product_variants USING btree (parent_variant_id, variant_type) WHERE ((variant_type)::text = 'imei'::text);


--
-- Name: idx_variants_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.lats_product_variants USING btree (product_id);


--
-- Name: idx_variants_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON public.lats_product_variants USING btree (product_id);


--
-- Name: idx_variants_sharing_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variants_sharing_mode ON public.lats_product_variants USING btree (sharing_mode);


--
-- Name: idx_variants_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variants_sku ON public.lats_product_variants USING btree (sku);


--
-- Name: idx_variants_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variants_type ON public.lats_product_variants USING btree (variant_type);


--
-- Name: idx_variants_visible_branches; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_variants_visible_branches ON public.lats_product_variants USING gin (visible_to_branches);


--
-- Name: idx_webhook_endpoints_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON public.webhook_endpoints USING btree (is_active);


--
-- Name: idx_webhook_endpoints_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user ON public.webhook_endpoints USING btree (user_id);


--
-- Name: idx_webhook_failures_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_webhook_failures_created ON public.webhook_failures USING btree (created_at DESC);


--
-- Name: idx_webhook_failures_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_webhook_failures_event ON public.webhook_failures USING btree (event_type);


--
-- Name: idx_webhook_failures_unresolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_webhook_failures_unresolved ON public.webhook_failures USING btree (resolved) WHERE (resolved = false);


--
-- Name: idx_webhook_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON public.webhook_logs USING btree (created_at);


--
-- Name: idx_webhook_logs_webhook; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON public.webhook_logs USING btree (webhook_id);


--
-- Name: idx_whatsapp_calls_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_calls_created ON public.whatsapp_calls USING btree (created_at DESC);


--
-- Name: idx_whatsapp_calls_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_calls_customer ON public.whatsapp_calls USING btree (customer_id);


--
-- Name: idx_whatsapp_calls_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_calls_from ON public.whatsapp_calls USING btree (from_phone);


--
-- Name: idx_whatsapp_incoming_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_created ON public.whatsapp_incoming_messages USING btree (created_at DESC);


--
-- Name: idx_whatsapp_incoming_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_customer ON public.whatsapp_incoming_messages USING btree (customer_id);


--
-- Name: idx_whatsapp_incoming_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_from ON public.whatsapp_incoming_messages USING btree (from_phone);


--
-- Name: idx_whatsapp_incoming_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_session ON public.whatsapp_incoming_messages USING btree (session_id);


--
-- Name: idx_whatsapp_incoming_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_unread ON public.whatsapp_incoming_messages USING btree (is_read) WHERE (is_read = false);


--
-- Name: idx_whatsapp_instances_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id ON public.whatsapp_instances_comprehensive USING btree (user_id);


--
-- Name: idx_whatsapp_logs_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_branch ON public.whatsapp_logs USING btree (branch_id);


--
-- Name: idx_whatsapp_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON public.whatsapp_logs USING btree (created_at DESC);


--
-- Name: idx_whatsapp_logs_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_customer ON public.whatsapp_logs USING btree (customer_id);


--
-- Name: idx_whatsapp_logs_device; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_device ON public.whatsapp_logs USING btree (device_id);


--
-- Name: idx_whatsapp_logs_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient ON public.whatsapp_logs USING btree (recipient_phone);


--
-- Name: idx_whatsapp_logs_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_session ON public.whatsapp_logs USING btree (session_id);


--
-- Name: idx_whatsapp_logs_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_shared ON public.whatsapp_logs USING btree (is_shared) WHERE (is_shared = true);


--
-- Name: idx_whatsapp_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON public.whatsapp_logs USING btree (status);


--
-- Name: idx_whatsapp_polls_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_polls_customer ON public.whatsapp_poll_results USING btree (customer_id);


--
-- Name: idx_whatsapp_polls_poll_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_polls_poll_id ON public.whatsapp_poll_results USING btree (poll_id);


--
-- Name: idx_whatsapp_reactions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_reactions_customer ON public.whatsapp_reactions USING btree (customer_id);


--
-- Name: idx_whatsapp_reactions_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_reactions_message ON public.whatsapp_reactions USING btree (message_id);


--
-- Name: idx_whatsapp_session_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_session_logs_created ON public.whatsapp_session_logs USING btree (created_at DESC);


--
-- Name: idx_whatsapp_session_logs_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_session_logs_event ON public.whatsapp_session_logs USING btree (event_type);


--
-- Name: idx_whatsapp_session_logs_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_session_logs_session ON public.whatsapp_session_logs USING btree (session_id);


--
-- Name: idx_whatsapp_sessions_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON public.whatsapp_sessions USING btree (phone_number);


--
-- Name: idx_whatsapp_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON public.whatsapp_sessions USING btree (status);


--
-- Name: idx_whatsapp_sessions_wasender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_wasender_id ON public.whatsapp_sessions USING btree (wasender_session_id);


--
-- Name: owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS owner_idx ON public.notes USING btree (owner_id);


--
-- Name: uniq_imei_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_imei_index ON public.lats_product_variants USING btree (((variant_attributes ->> 'imei'::text))) WHERE ((variant_attributes ->> 'imei'::text) IS NOT NULL);


--
-- Name: attendance_records calculate_hours_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calculate_hours_trigger BEFORE INSERT OR UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.calculate_attendance_hours();


--
-- Name: leave_requests calculate_leave_days_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calculate_leave_days_trigger BEFORE INSERT OR UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.calculate_leave_days();


--
-- Name: customers customers_delete_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customers_delete_trigger INSTEAD OF DELETE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.customers_delete_trigger();


--
-- Name: customers customers_insert_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customers_insert_trigger INSTEAD OF INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.customers_insert_trigger();


--
-- Name: customers customers_update_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customers_update_trigger INSTEAD OF UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.customers_update_trigger();


--
-- Name: lats_product_variants ensure_imei_has_parent; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ensure_imei_has_parent BEFORE INSERT OR UPDATE ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.check_imei_has_parent();


--
-- Name: product_images ensure_single_primary_image_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ensure_single_primary_image_trigger BEFORE INSERT OR UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION public.ensure_single_primary_image();


--
-- Name: expenses handle_expense_transaction_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_expense_transaction_trigger AFTER INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.handle_expense_transaction();


--
-- Name: inventory_items inventory_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_inventory_items_updated_at();


--
-- Name: lats_inventory_items inventory_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inventory_items_updated_at BEFORE UPDATE ON public.lats_inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_inventory_items_updated_at();


--
-- Name: lats_purchase_order_payments po_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER po_payments_updated_at BEFORE UPDATE ON public.lats_purchase_order_payments FOR EACH ROW EXECUTE FUNCTION public.update_po_payments_updated_at();


--
-- Name: lats_product_variants sync_product_stock_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_product_stock_trigger AFTER INSERT OR DELETE OR UPDATE ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock();


--
-- Name: users sync_users_to_auth_users_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_users_to_auth_users_trigger AFTER UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_auth_users();


--
-- Name: lats_product_variants sync_variant_prices_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_variant_prices_trigger BEFORE INSERT OR UPDATE ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.sync_variant_prices();


--
-- Name: purchase_order_payments track_po_payment_expense_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER track_po_payment_expense_trigger AFTER INSERT OR UPDATE ON public.purchase_order_payments FOR EACH ROW EXECUTE FUNCTION public.track_po_payment_as_expense();


--
-- Name: branch_transfers trg_update_branch_transfer_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_branch_transfer_timestamp BEFORE UPDATE ON public.branch_transfers FOR EACH ROW EXECUTE FUNCTION public.update_branch_transfer_timestamp();


--
-- Name: lats_product_variants trg_update_parent_quantity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_parent_quantity AFTER INSERT OR DELETE OR UPDATE OF quantity, is_active ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.update_parent_quantity_trigger();


--
-- Name: lats_product_variants trg_validate_and_set_imei_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_and_set_imei_status BEFORE INSERT OR UPDATE ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.validate_and_set_imei_status();


--
-- Name: lats_product_variants trg_validate_new_imei; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_new_imei BEFORE INSERT OR UPDATE ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.validate_new_imei();


--
-- Name: inventory_items trigger_auto_convert_inventory_on_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_convert_inventory_on_update AFTER UPDATE ON public.inventory_items FOR EACH ROW WHEN (((new.variant_id IS NOT NULL) AND (new.status = 'available'::text) AND ((new.serial_number IS NOT NULL) OR (new.imei IS NOT NULL)) AND ((new.serial_number <> ''::text) OR (new.imei <> ''::text)))) EXECUTE FUNCTION public.auto_convert_inventory_item_on_update();


--
-- Name: inventory_items trigger_auto_convert_inventory_to_imei_child; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_convert_inventory_to_imei_child AFTER INSERT ON public.inventory_items FOR EACH ROW WHEN (((new.variant_id IS NOT NULL) AND (new.status = 'available'::text) AND ((new.serial_number IS NOT NULL) OR (new.imei IS NOT NULL)) AND ((new.serial_number <> ''::text) OR (new.imei <> ''::text)))) EXECUTE FUNCTION public.auto_convert_inventory_item_to_imei_child();


--
-- Name: lats_purchase_order_items trigger_auto_convert_po_currency; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_convert_po_currency AFTER INSERT OR UPDATE OF quantity_received ON public.lats_purchase_order_items FOR EACH ROW WHEN ((new.quantity_received > 0)) EXECUTE FUNCTION public.auto_convert_po_currency();


--
-- Name: TRIGGER trigger_auto_convert_po_currency ON lats_purchase_order_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_auto_convert_po_currency ON public.lats_purchase_order_items IS 'Automatically converts PO item costs from foreign currency to TZS';


--
-- Name: lats_products trigger_auto_create_default_variant; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_create_default_variant AFTER INSERT ON public.lats_products FOR EACH ROW EXECUTE FUNCTION public.auto_create_default_variant();


--
-- Name: lats_product_variants trigger_auto_reorder; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_reorder AFTER UPDATE OF quantity ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_reorder_check();


--
-- Name: store_locations trigger_auto_sync_sharing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_sync_sharing AFTER UPDATE ON public.store_locations FOR EACH ROW EXECUTE FUNCTION public.auto_sync_sharing_on_branch_update();


--
-- Name: daily_sales_closures trigger_close_session_on_day_close; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_close_session_on_day_close AFTER INSERT ON public.daily_sales_closures FOR EACH ROW EXECUTE FUNCTION public.close_current_session();


--
-- Name: reminders trigger_create_recurring_reminder; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_recurring_reminder AFTER UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.create_next_recurring_reminder();


--
-- Name: finance_expenses trigger_expense_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_expense_delete BEFORE DELETE ON public.finance_expenses FOR EACH ROW EXECUTE FUNCTION public.handle_expense_delete();


--
-- Name: finance_expenses trigger_expense_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_expense_update AFTER UPDATE ON public.finance_expenses FOR EACH ROW EXECUTE FUNCTION public.handle_expense_update();


--
-- Name: lats_product_variants trigger_inherit_parent_prices; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_inherit_parent_prices BEFORE INSERT OR UPDATE ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.inherit_parent_variant_prices();


--
-- Name: notifications trigger_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_notifications_updated_at();


--
-- Name: lats_purchase_order_shipping trigger_po_shipping_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_po_shipping_updated_at BEFORE UPDATE ON public.lats_purchase_order_shipping FOR EACH ROW EXECUTE FUNCTION public.update_po_shipping_updated_at();


--
-- Name: reminders trigger_reminders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_reminders_updated_at BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.update_reminders_updated_at();


--
-- Name: lats_product_variants trigger_set_imei_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_imei_status BEFORE INSERT ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.set_imei_status();


--
-- Name: lats_categories trigger_set_is_shared_categories; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_categories BEFORE INSERT ON public.lats_categories FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: customer_messages trigger_set_is_shared_customer_messages; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_customer_messages BEFORE INSERT ON public.customer_messages FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: customer_payments trigger_set_is_shared_customer_payments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_customer_payments BEFORE INSERT ON public.customer_payments FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: employees trigger_set_is_shared_employees; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_employees BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: finance_transfers trigger_set_is_shared_finance_transfers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_finance_transfers BEFORE INSERT ON public.finance_transfers FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: gift_cards trigger_set_is_shared_gift_cards; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_gift_cards BEFORE INSERT ON public.gift_cards FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: payment_transactions trigger_set_is_shared_payment_transactions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_payment_transactions BEFORE INSERT ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: lats_products trigger_set_is_shared_products; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_products BEFORE INSERT ON public.lats_products FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: quality_checks trigger_set_is_shared_quality_checks; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_quality_checks BEFORE INSERT ON public.quality_checks FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: recurring_expenses trigger_set_is_shared_recurring_expenses; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_recurring_expenses BEFORE INSERT ON public.recurring_expenses FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: sms_logs trigger_set_is_shared_sms_logs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_sms_logs BEFORE INSERT ON public.sms_logs FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: lats_suppliers trigger_set_is_shared_suppliers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_suppliers BEFORE INSERT ON public.lats_suppliers FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: lats_product_variants trigger_set_is_shared_variants; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_variants BEFORE INSERT ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: whatsapp_logs trigger_set_is_shared_whatsapp_logs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_is_shared_whatsapp_logs BEFORE INSERT ON public.whatsapp_logs FOR EACH ROW EXECUTE FUNCTION public.set_is_shared_on_insert();


--
-- Name: lats_products trigger_set_product_branch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_product_branch BEFORE INSERT ON public.lats_products FOR EACH ROW EXECUTE FUNCTION public.set_default_branch();


--
-- Name: lats_trade_in_contracts trigger_set_trade_in_contract_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_trade_in_contract_number BEFORE INSERT ON public.lats_trade_in_contracts FOR EACH ROW EXECUTE FUNCTION public.set_trade_in_contract_number();


--
-- Name: lats_trade_in_transactions trigger_set_trade_in_transaction_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_trade_in_transaction_number BEFORE INSERT ON public.lats_trade_in_transactions FOR EACH ROW EXECUTE FUNCTION public.set_trade_in_transaction_number();


--
-- Name: lats_shipping_agents trigger_shipping_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_shipping_agents_updated_at BEFORE UPDATE ON public.lats_shipping_agents FOR EACH ROW EXECUTE FUNCTION public.update_shipping_agents_updated_at();


--
-- Name: lats_shipping_methods trigger_shipping_methods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_shipping_methods_updated_at BEFORE UPDATE ON public.lats_shipping_methods FOR EACH ROW EXECUTE FUNCTION public.update_shipping_methods_updated_at();


--
-- Name: lats_shipping_settings trigger_shipping_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_shipping_settings_updated_at BEFORE UPDATE ON public.lats_shipping_settings FOR EACH ROW EXECUTE FUNCTION public.update_shipping_settings_updated_at();


--
-- Name: customer_payments trigger_sync_customer_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_customer_payment AFTER INSERT OR UPDATE ON public.customer_payments FOR EACH ROW WHEN ((new.amount > (0)::numeric)) EXECUTE FUNCTION public.sync_customer_payment_to_transaction();


--
-- Name: finance_accounts trigger_sync_finance_account_columns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_finance_account_columns BEFORE INSERT OR UPDATE ON public.finance_accounts FOR EACH ROW EXECUTE FUNCTION public.sync_finance_account_columns();


--
-- Name: inventory_items trigger_sync_imei_serial_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_imei_serial_number BEFORE INSERT OR UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.sync_imei_serial_number();


--
-- Name: lats_product_variants trigger_sync_parent_quantity_on_imei_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_parent_quantity_on_imei_change AFTER INSERT OR DELETE OR UPDATE OF quantity, is_active, variant_type ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.sync_parent_variant_quantity_on_imei_change();


--
-- Name: lats_products trigger_sync_product_category; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_product_category BEFORE INSERT OR UPDATE OF category_id ON public.lats_products FOR EACH ROW EXECUTE FUNCTION public.sync_product_category();


--
-- Name: lats_product_variants trigger_sync_product_stock_on_variant_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_product_stock_on_variant_delete AFTER DELETE ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_from_variants();


--
-- Name: lats_product_variants trigger_sync_product_stock_on_variant_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_product_stock_on_variant_insert AFTER INSERT ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_from_variants();


--
-- Name: lats_product_variants trigger_sync_product_stock_on_variant_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_product_stock_on_variant_update AFTER UPDATE OF quantity, is_active ON public.lats_product_variants FOR EACH ROW WHEN (((old.quantity IS DISTINCT FROM new.quantity) OR (old.is_active IS DISTINCT FROM new.is_active))) EXECUTE FUNCTION public.sync_product_stock_from_variants();


--
-- Name: lats_sales trigger_sync_sale_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_sale_payment AFTER INSERT OR UPDATE ON public.lats_sales FOR EACH ROW WHEN ((new.total_amount > (0)::numeric)) EXECUTE FUNCTION public.sync_sale_to_payment_transaction();


--
-- Name: TRIGGER trigger_sync_sale_payment ON lats_sales; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_sync_sale_payment ON public.lats_sales IS 'Automatically syncs sales to payment_transactions table';


--
-- Name: lats_product_variants trigger_sync_variant_imei_serial_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_variant_imei_serial_number BEFORE INSERT OR UPDATE ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.sync_variant_imei_serial_number();


--
-- Name: inventory_items trigger_sync_variant_quantity_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_variant_quantity_delete AFTER DELETE ON public.inventory_items FOR EACH ROW WHEN ((old.variant_id IS NOT NULL)) EXECUTE FUNCTION public.sync_variant_quantity_from_inventory();


--
-- Name: TRIGGER trigger_sync_variant_quantity_delete ON inventory_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_sync_variant_quantity_delete ON public.inventory_items IS 'Syncs variant quantity when inventory items are deleted';


--
-- Name: inventory_items trigger_sync_variant_quantity_insert_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_variant_quantity_insert_update AFTER INSERT OR UPDATE OF status, variant_id ON public.inventory_items FOR EACH ROW WHEN ((new.variant_id IS NOT NULL)) EXECUTE FUNCTION public.sync_variant_quantity_from_inventory();


--
-- Name: TRIGGER trigger_sync_variant_quantity_insert_update ON inventory_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_sync_variant_quantity_insert_update ON public.inventory_items IS 'Syncs variant quantity when inventory items are added or their status/variant changes';


--
-- Name: lats_product_variants trigger_track_variant_source; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_track_variant_source BEFORE INSERT ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.track_variant_data_source();


--
-- Name: account_transactions trigger_update_account_balance_secure; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_account_balance_secure BEFORE INSERT ON public.account_transactions FOR EACH ROW EXECUTE FUNCTION public.update_account_balance_secure();


--
-- Name: api_keys trigger_update_api_keys; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_api_keys BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_api_keys_updated_at();


--
-- Name: customer_installment_plan_payments trigger_update_customer_installment_plan_balance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_customer_installment_plan_balance AFTER INSERT OR DELETE OR UPDATE ON public.customer_installment_plan_payments FOR EACH ROW EXECUTE FUNCTION public.update_customer_installment_plan_balance();


--
-- Name: customer_preferences trigger_update_customer_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_customer_preferences_updated_at BEFORE UPDATE ON public.customer_preferences FOR EACH ROW EXECUTE FUNCTION public.update_customer_preferences_updated_at();


--
-- Name: daily_reports trigger_update_daily_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_daily_reports_updated_at BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION public.update_daily_reports_updated_at();


--
-- Name: document_templates trigger_update_document_templates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_document_templates BEFORE UPDATE ON public.document_templates FOR EACH ROW EXECUTE FUNCTION public.update_document_templates_updated_at();


--
-- Name: installment_payments trigger_update_installment_plan_balance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_installment_plan_balance AFTER INSERT OR DELETE OR UPDATE ON public.installment_payments FOR EACH ROW EXECUTE FUNCTION public.update_installment_plan_balance();


--
-- Name: lats_supplier_communications trigger_update_last_contact; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_last_contact AFTER INSERT ON public.lats_supplier_communications FOR EACH ROW EXECUTE FUNCTION public.update_supplier_last_contact();


--
-- Name: lats_suppliers trigger_update_lats_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_lats_suppliers_updated_at BEFORE UPDATE ON public.lats_suppliers FOR EACH ROW EXECUTE FUNCTION public.update_lats_suppliers_updated_at();


--
-- Name: lats_purchase_orders trigger_update_on_time_delivery; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_on_time_delivery AFTER UPDATE ON public.lats_purchase_orders FOR EACH ROW WHEN (((new.status = ANY (ARRAY['received'::text, 'completed'::text])) AND (old.status IS DISTINCT FROM new.status))) EXECUTE FUNCTION public.update_supplier_on_time_delivery();


--
-- Name: lats_product_variants trigger_update_parent_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_parent_stock AFTER INSERT OR DELETE OR UPDATE ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.update_parent_stock_from_children();


--
-- Name: lats_product_variants trigger_update_product_totals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_product_totals AFTER INSERT OR DELETE OR UPDATE ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.update_product_totals();


--
-- Name: lats_supplier_communications trigger_update_response_time; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_response_time AFTER INSERT ON public.lats_supplier_communications FOR EACH ROW WHEN ((new.direction = 'inbound'::text)) EXECUTE FUNCTION public.update_supplier_response_time();


--
-- Name: returns trigger_update_returns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_returns_updated_at BEFORE UPDATE ON public.returns FOR EACH ROW EXECUTE FUNCTION public.update_returns_updated_at();


--
-- Name: scheduled_transfers trigger_update_scheduled_transfers_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_scheduled_transfers_timestamp BEFORE UPDATE ON public.scheduled_transfers FOR EACH ROW EXECUTE FUNCTION public.update_scheduled_transfers_timestamp();


--
-- Name: settings trigger_update_settings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_settings BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();


--
-- Name: special_order_payments trigger_update_special_order_balance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_special_order_balance AFTER INSERT OR DELETE OR UPDATE ON public.special_order_payments FOR EACH ROW EXECUTE FUNCTION public.update_special_order_balance();


--
-- Name: lats_stock_movements trigger_update_stock_on_movement; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_stock_on_movement BEFORE INSERT ON public.lats_stock_movements FOR EACH ROW EXECUTE FUNCTION public.update_variant_stock_on_movement();


--
-- Name: TRIGGER trigger_update_stock_on_movement ON lats_stock_movements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_update_stock_on_movement ON public.lats_stock_movements IS 'Automatically updates variant quantity when a stock movement is recorded. Respects pre-set new_quantity to prevent double updates.';


--
-- Name: store_locations trigger_update_store_locations; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_store_locations BEFORE UPDATE ON public.store_locations FOR EACH ROW EXECUTE FUNCTION public.update_store_locations_updated_at();


--
-- Name: lats_purchase_orders trigger_update_supplier_order_value; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_supplier_order_value AFTER INSERT OR DELETE OR UPDATE ON public.lats_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_supplier_order_value();


--
-- Name: lats_supplier_ratings trigger_update_supplier_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_supplier_rating AFTER INSERT OR UPDATE ON public.lats_supplier_ratings FOR EACH ROW EXECUTE FUNCTION public.update_supplier_average_rating();


--
-- Name: lats_purchase_orders trigger_update_supplier_total_orders; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_supplier_total_orders AFTER INSERT ON public.lats_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_supplier_total_orders();


--
-- Name: lats_trade_in_contracts trigger_update_trade_in_contracts_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_trade_in_contracts_timestamp BEFORE UPDATE ON public.lats_trade_in_contracts FOR EACH ROW EXECUTE FUNCTION public.update_trade_in_timestamp();


--
-- Name: lats_trade_in_prices trigger_update_trade_in_prices_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_trade_in_prices_timestamp BEFORE UPDATE ON public.lats_trade_in_prices FOR EACH ROW EXECUTE FUNCTION public.update_trade_in_timestamp();


--
-- Name: lats_trade_in_transactions trigger_update_trade_in_transactions_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_trade_in_transactions_timestamp BEFORE UPDATE ON public.lats_trade_in_transactions FOR EACH ROW EXECUTE FUNCTION public.update_trade_in_timestamp();


--
-- Name: user_whatsapp_preferences trigger_update_user_whatsapp_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_user_whatsapp_preferences_updated_at BEFORE UPDATE ON public.user_whatsapp_preferences FOR EACH ROW EXECUTE FUNCTION public.update_user_whatsapp_preferences_updated_at();


--
-- Name: webhook_endpoints trigger_update_webhook_endpoints; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_webhook_endpoints BEFORE UPDATE ON public.webhook_endpoints FOR EACH ROW EXECUTE FUNCTION public.update_webhook_endpoints_updated_at();


--
-- Name: whatsapp_sessions trigger_update_whatsapp_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_whatsapp_sessions_updated_at BEFORE UPDATE ON public.whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_sessions_updated_at();


--
-- Name: user_settings trigger_user_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_user_settings_updated_at();


--
-- Name: lats_product_variants trigger_validate_variant_prices; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_variant_prices BEFORE INSERT OR UPDATE OF cost_price, selling_price ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.validate_variant_prices();


--
-- Name: TRIGGER trigger_validate_variant_prices ON lats_product_variants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_validate_variant_prices ON public.lats_product_variants IS 'Validates variant prices and logs changes for audit';


--
-- Name: attendance_records update_attendance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_sales_closures update_daily_sales_closures_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_daily_sales_closures_updated_at_trigger BEFORE UPDATE ON public.daily_sales_closures FOR EACH ROW EXECUTE FUNCTION public.update_daily_sales_closures_updated_at();


--
-- Name: employees update_employees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_product_validation update_lats_product_validation_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lats_product_validation_updated_at BEFORE UPDATE ON public.lats_product_validation FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_shipping_cargo_items update_lats_shipping_cargo_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lats_shipping_cargo_items_updated_at BEFORE UPDATE ON public.lats_shipping_cargo_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_shipping update_lats_shipping_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lats_shipping_updated_at BEFORE UPDATE ON public.lats_shipping FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leave_requests update_leave_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leave_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_images update_product_images_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_images_updated_at_trigger BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION public.update_product_images_updated_at();


--
-- Name: message_recipient_lists update_recipient_lists_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_recipient_lists_timestamp BEFORE UPDATE ON public.message_recipient_lists FOR EACH ROW EXECUTE FUNCTION public.update_scheduled_messages_updated_at();


--
-- Name: reports update_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_reports_updated_at();


--
-- Name: scheduled_bulk_messages update_scheduled_messages_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scheduled_messages_timestamp BEFORE UPDATE ON public.scheduled_bulk_messages FOR EACH ROW EXECUTE FUNCTION public.update_scheduled_messages_updated_at();


--
-- Name: shift_templates update_shift_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON public.shift_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employee_shifts update_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON public.employee_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_supplier_communications update_supplier_communications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplier_communications_updated_at BEFORE UPDATE ON public.lats_supplier_communications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_supplier_contracts update_supplier_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplier_contracts_updated_at BEFORE UPDATE ON public.lats_supplier_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_supplier_documents update_supplier_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplier_documents_updated_at BEFORE UPDATE ON public.lats_supplier_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_supplier_ratings update_supplier_ratings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplier_ratings_updated_at BEFORE UPDATE ON public.lats_supplier_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bulk_message_templates update_templates_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_templates_timestamp BEFORE UPDATE ON public.bulk_message_templates FOR EACH ROW EXECUTE FUNCTION public.update_scheduled_messages_updated_at();


--
-- Name: lats_product_variants update_variant_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_variant_count_trigger AFTER INSERT OR DELETE OR UPDATE ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.update_product_variant_count();


--
-- Name: whatsapp_antiban_settings update_whatsapp_antiban_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_whatsapp_antiban_settings_updated_at BEFORE UPDATE ON public.whatsapp_antiban_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lats_sales validate_sale_amount_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_sale_amount_trigger BEFORE INSERT OR UPDATE OF total_amount ON public.lats_sales FOR EACH ROW EXECUTE FUNCTION public.validate_sale_amount();


--
-- Name: lats_product_variants validate_variant_price_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_variant_price_trigger BEFORE INSERT OR UPDATE ON public.lats_product_variants FOR EACH ROW EXECUTE FUNCTION public.validate_variant_price();


--
-- Name: account_transactions account_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_transactions
    ADD CONSTRAINT account_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.finance_accounts(id) ON DELETE CASCADE;


--
-- Name: account_transactions account_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_transactions
    ADD CONSTRAINT account_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: api_request_logs api_request_logs_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_request_logs
    ADD CONSTRAINT api_request_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);


--
-- Name: attendance_records attendance_records_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: attendance_records attendance_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: auth_users auth_users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: auto_reorder_log auto_reorder_log_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_reorder_log
    ADD CONSTRAINT auto_reorder_log_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id);


--
-- Name: auto_reorder_log auto_reorder_log_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_reorder_log
    ADD CONSTRAINT auto_reorder_log_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id);


--
-- Name: auto_reorder_log auto_reorder_log_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_reorder_log
    ADD CONSTRAINT auto_reorder_log_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.lats_product_variants(id);


--
-- Name: branch_activity_log branch_activity_log_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_activity_log
    ADD CONSTRAINT branch_activity_log_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE CASCADE;


--
-- Name: branch_transfers branch_transfers_entity_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT branch_transfers_entity_fkey FOREIGN KEY (entity_id) REFERENCES public.lats_product_variants(id);


--
-- Name: branch_transfers branch_transfers_from_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT branch_transfers_from_branch_fkey FOREIGN KEY (from_branch_id) REFERENCES public.store_locations(id);


--
-- Name: branch_transfers branch_transfers_from_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT branch_transfers_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES public.store_locations(id) ON DELETE CASCADE;


--
-- Name: branch_transfers branch_transfers_to_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT branch_transfers_to_branch_fkey FOREIGN KEY (to_branch_id) REFERENCES public.store_locations(id);


--
-- Name: branch_transfers branch_transfers_to_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT branch_transfers_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES public.store_locations(id) ON DELETE CASCADE;


--
-- Name: bulk_message_templates bulk_message_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_message_templates
    ADD CONSTRAINT bulk_message_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: buyer_details buyer_details_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_details
    ADD CONSTRAINT buyer_details_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.whatsapp_customers(customer_id);


--
-- Name: campaign_notifications campaign_notifications_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_notifications
    ADD CONSTRAINT campaign_notifications_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.whatsapp_bulk_campaigns(id) ON DELETE CASCADE;


--
-- Name: categories categories_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: communication_log communication_log_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_log
    ADD CONSTRAINT communication_log_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.whatsapp_customers(customer_id);


--
-- Name: customer_installment_plan_payments customer_installment_plan_payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plan_payments
    ADD CONSTRAINT customer_installment_plan_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.finance_accounts(id);


--
-- Name: customer_installment_plan_payments customer_installment_plan_payments_installment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plan_payments
    ADD CONSTRAINT customer_installment_plan_payments_installment_plan_id_fkey FOREIGN KEY (installment_plan_id) REFERENCES public.customer_installment_plans(id) ON DELETE CASCADE;


--
-- Name: customer_installment_plans customer_installment_plans_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plans
    ADD CONSTRAINT customer_installment_plans_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: customer_installment_plans customer_installment_plans_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_installment_plans
    ADD CONSTRAINT customer_installment_plans_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.lats_sales(id) ON DELETE SET NULL;


--
-- Name: customer_messages customer_messages_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: customer_messages customer_messages_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: customer_messages customer_messages_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL;


--
-- Name: customer_messages customer_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_payments customer_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_payments
    ADD CONSTRAINT customer_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: customer_payments customer_payments_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_payments
    ADD CONSTRAINT customer_payments_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);


--
-- Name: customer_payments customer_payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_payments
    ADD CONSTRAINT customer_payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.lats_sales(id);


--
-- Name: customer_special_orders customer_special_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_special_orders
    ADD CONSTRAINT customer_special_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: daily_reports daily_reports_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: daily_reports daily_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.employees(id);


--
-- Name: daily_sales_closures daily_sales_closures_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sales_closures
    ADD CONSTRAINT daily_sales_closures_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.daily_opening_sessions(id);


--
-- Name: device_attachments device_attachments_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_attachments
    ADD CONSTRAINT device_attachments_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: device_checklists device_checklists_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_checklists
    ADD CONSTRAINT device_checklists_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: device_ratings device_ratings_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_ratings
    ADD CONSTRAINT device_ratings_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: device_remarks device_remarks_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_remarks
    ADD CONSTRAINT device_remarks_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: device_transitions device_transitions_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_transitions
    ADD CONSTRAINT device_transitions_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: devices devices_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: diagnostic_checklist_results diagnostic_checklist_results_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_checklist_results
    ADD CONSTRAINT diagnostic_checklist_results_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: diagnostic_checklist_results diagnostic_checklist_results_problem_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_checklist_results
    ADD CONSTRAINT diagnostic_checklist_results_problem_template_id_fkey FOREIGN KEY (problem_template_id) REFERENCES public.diagnostic_problem_templates(id);


--
-- Name: diagnostic_checks diagnostic_checks_diagnostic_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_checks
    ADD CONSTRAINT diagnostic_checks_diagnostic_device_id_fkey FOREIGN KEY (diagnostic_device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: diagnostic_checks diagnostic_checks_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_checks
    ADD CONSTRAINT diagnostic_checks_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.diagnostic_requests(id) ON DELETE CASCADE;


--
-- Name: diagnostic_devices diagnostic_devices_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_devices
    ADD CONSTRAINT diagnostic_devices_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: diagnostic_requests diagnostic_requests_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_requests
    ADD CONSTRAINT diagnostic_requests_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: diagnostic_requests diagnostic_requests_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_requests
    ADD CONSTRAINT diagnostic_requests_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.diagnostic_templates(id);


--
-- Name: employee_shifts employee_shifts_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shifts
    ADD CONSTRAINT employee_shifts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_shifts employee_shifts_shift_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_shifts
    ADD CONSTRAINT employee_shifts_shift_template_id_fkey FOREIGN KEY (shift_template_id) REFERENCES public.shift_templates(id) ON DELETE SET NULL;


--
-- Name: employees employees_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE SET NULL;


--
-- Name: finance_accounts finance_accounts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_accounts
    ADD CONSTRAINT finance_accounts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: finance_expenses finance_expenses_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_expenses
    ADD CONSTRAINT finance_expenses_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.finance_accounts(id);


--
-- Name: finance_expenses finance_expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_expenses
    ADD CONSTRAINT finance_expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: finance_expenses finance_expenses_expense_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_expenses
    ADD CONSTRAINT finance_expenses_expense_category_id_fkey FOREIGN KEY (expense_category_id) REFERENCES public.finance_expense_categories(id);


--
-- Name: finance_transfers finance_transfers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transfers
    ADD CONSTRAINT finance_transfers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: finance_transfers finance_transfers_from_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transfers
    ADD CONSTRAINT finance_transfers_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES public.finance_accounts(id);


--
-- Name: finance_transfers finance_transfers_to_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transfers
    ADD CONSTRAINT finance_transfers_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.finance_accounts(id);


--
-- Name: customer_checkins fk_customer_checkins_staff_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_checkins
    ADD CONSTRAINT fk_customer_checkins_staff_id FOREIGN KEY (staff_id) REFERENCES public.users(id);


--
-- Name: employees fk_employees_manager; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: lats_inventory_items fk_lats_inventory_items_storage_room; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT fk_lats_inventory_items_storage_room FOREIGN KEY (storage_room_id) REFERENCES public.lats_store_rooms(id) ON DELETE SET NULL;


--
-- Name: lats_purchase_orders fk_purchase_orders_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_orders
    ADD CONSTRAINT fk_purchase_orders_supplier FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE RESTRICT;


--
-- Name: returns fk_returns_device_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT fk_returns_device_id FOREIGN KEY (device_id) REFERENCES public.devices(id);


--
-- Name: gift_card_transactions gift_card_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_transactions
    ADD CONSTRAINT gift_card_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: gift_card_transactions gift_card_transactions_gift_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_transactions
    ADD CONSTRAINT gift_card_transactions_gift_card_id_fkey FOREIGN KEY (gift_card_id) REFERENCES public.gift_cards(id) ON DELETE CASCADE;


--
-- Name: gift_card_transactions gift_card_transactions_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_transactions
    ADD CONSTRAINT gift_card_transactions_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.lats_sales(id);


--
-- Name: gift_cards gift_cards_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: installment_payments installment_payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_payments
    ADD CONSTRAINT installment_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.finance_accounts(id);


--
-- Name: installment_payments installment_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_payments
    ADD CONSTRAINT installment_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: installment_payments installment_payments_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_payments
    ADD CONSTRAINT installment_payments_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);


--
-- Name: installment_payments installment_payments_installment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_payments
    ADD CONSTRAINT installment_payments_installment_plan_id_fkey FOREIGN KEY (installment_plan_id) REFERENCES public.customer_installment_plans(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: inventory_items inventory_items_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: inventory_items inventory_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id) ON DELETE CASCADE;


--
-- Name: inventory_items inventory_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: inventory_items inventory_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.lats_purchase_order_items(id) ON DELETE SET NULL;


--
-- Name: inventory_items inventory_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.lats_product_variants(id) ON DELETE CASCADE;


--
-- Name: lats_categories lats_categories_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_categories
    ADD CONSTRAINT lats_categories_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: lats_categories lats_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_categories
    ADD CONSTRAINT lats_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.lats_categories(id) ON DELETE CASCADE;


--
-- Name: lats_customers lats_customers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_customers
    ADD CONSTRAINT lats_customers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_customers lats_customers_created_by_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_customers
    ADD CONSTRAINT lats_customers_created_by_branch_id_fkey FOREIGN KEY (created_by_branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_customers lats_customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_customers
    ADD CONSTRAINT lats_customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: lats_customers lats_customers_preferred_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_customers
    ADD CONSTRAINT lats_customers_preferred_branch_id_fkey FOREIGN KEY (preferred_branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_customers lats_customers_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_customers
    ADD CONSTRAINT lats_customers_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.lats_customers(id);


--
-- Name: lats_employees lats_employees_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_employees
    ADD CONSTRAINT lats_employees_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_inventory_adjustments lats_inventory_adjustments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_adjustments
    ADD CONSTRAINT lats_inventory_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id) ON DELETE CASCADE;


--
-- Name: lats_inventory_adjustments lats_inventory_adjustments_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_adjustments
    ADD CONSTRAINT lats_inventory_adjustments_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.lats_product_variants(id) ON DELETE CASCADE;


--
-- Name: lats_inventory_items lats_inventory_items_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_inventory_items lats_inventory_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id) ON DELETE CASCADE;


--
-- Name: lats_inventory_items lats_inventory_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: lats_inventory_items lats_inventory_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.lats_purchase_order_items(id) ON DELETE SET NULL;


--
-- Name: lats_inventory_items lats_inventory_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_inventory_items
    ADD CONSTRAINT lats_inventory_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.lats_product_variants(id) ON DELETE CASCADE;


--
-- Name: lats_pos_advanced_settings lats_pos_advanced_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_advanced_settings
    ADD CONSTRAINT lats_pos_advanced_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lats_pos_analytics_reporting_settings lats_pos_analytics_reporting_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_analytics_reporting_settings
    ADD CONSTRAINT lats_pos_analytics_reporting_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lats_pos_barcode_scanner_settings lats_pos_barcode_scanner_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_barcode_scanner_settings
    ADD CONSTRAINT lats_pos_barcode_scanner_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lats_pos_delivery_settings lats_pos_delivery_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_delivery_settings
    ADD CONSTRAINT lats_pos_delivery_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lats_pos_dynamic_pricing_settings lats_pos_dynamic_pricing_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_dynamic_pricing_settings
    ADD CONSTRAINT lats_pos_dynamic_pricing_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lats_pos_general_settings lats_pos_general_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_general_settings
    ADD CONSTRAINT lats_pos_general_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lats_pos_loyalty_customer_settings lats_pos_loyalty_customer_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_loyalty_customer_settings
    ADD CONSTRAINT lats_pos_loyalty_customer_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lats_pos_notification_settings lats_pos_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_notification_settings
    ADD CONSTRAINT lats_pos_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lats_pos_receipt_settings lats_pos_receipt_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_receipt_settings
    ADD CONSTRAINT lats_pos_receipt_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lats_pos_search_filter_settings lats_pos_search_filter_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_search_filter_settings
    ADD CONSTRAINT lats_pos_search_filter_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lats_pos_user_permissions_settings lats_pos_user_permissions_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_pos_user_permissions_settings
    ADD CONSTRAINT lats_pos_user_permissions_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lats_product_units lats_product_units_parent_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_units
    ADD CONSTRAINT lats_product_units_parent_variant_id_fkey FOREIGN KEY (parent_variant_id) REFERENCES public.lats_product_variants(id) ON DELETE CASCADE;


--
-- Name: lats_product_validation lats_product_validation_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_validation
    ADD CONSTRAINT lats_product_validation_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id) ON DELETE CASCADE;


--
-- Name: lats_product_validation lats_product_validation_shipping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_validation
    ADD CONSTRAINT lats_product_validation_shipping_id_fkey FOREIGN KEY (shipping_id) REFERENCES public.lats_shipping(id) ON DELETE CASCADE;


--
-- Name: lats_product_validation lats_product_validation_updated_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_validation
    ADD CONSTRAINT lats_product_validation_updated_category_id_fkey FOREIGN KEY (updated_category_id) REFERENCES public.lats_categories(id);


--
-- Name: lats_product_validation lats_product_validation_updated_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_validation
    ADD CONSTRAINT lats_product_validation_updated_supplier_id_fkey FOREIGN KEY (updated_supplier_id) REFERENCES public.lats_suppliers(id);


--
-- Name: lats_product_validation lats_product_validation_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_validation
    ADD CONSTRAINT lats_product_validation_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id);


--
-- Name: lats_product_variants lats_product_variants_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_variants
    ADD CONSTRAINT lats_product_variants_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE RESTRICT;


--
-- Name: lats_product_variants lats_product_variants_parent_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_variants
    ADD CONSTRAINT lats_product_variants_parent_variant_id_fkey FOREIGN KEY (parent_variant_id) REFERENCES public.lats_product_variants(id) ON DELETE CASCADE;


--
-- Name: lats_product_variants lats_product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_product_variants
    ADD CONSTRAINT lats_product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id) ON DELETE CASCADE;


--
-- Name: lats_products lats_products_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_products
    ADD CONSTRAINT lats_products_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE RESTRICT;


--
-- Name: lats_products lats_products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_products
    ADD CONSTRAINT lats_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.lats_categories(id);


--
-- Name: lats_products lats_products_shelf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_products
    ADD CONSTRAINT lats_products_shelf_id_fkey FOREIGN KEY (shelf_id) REFERENCES public.lats_store_shelves(id) ON DELETE SET NULL;


--
-- Name: lats_products lats_products_storage_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_products
    ADD CONSTRAINT lats_products_storage_room_id_fkey FOREIGN KEY (storage_room_id) REFERENCES public.lats_store_rooms(id) ON DELETE SET NULL;


--
-- Name: lats_products lats_products_store_shelf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_products
    ADD CONSTRAINT lats_products_store_shelf_id_fkey FOREIGN KEY (store_shelf_id) REFERENCES public.lats_store_shelves(id) ON DELETE SET NULL;


--
-- Name: lats_products lats_products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_products
    ADD CONSTRAINT lats_products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE SET NULL;


--
-- Name: lats_purchase_order_audit_log lats_purchase_order_audit_log_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_audit_log
    ADD CONSTRAINT lats_purchase_order_audit_log_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: lats_purchase_order_audit_log lats_purchase_order_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_audit_log
    ADD CONSTRAINT lats_purchase_order_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: lats_purchase_order_items lats_purchase_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_items
    ADD CONSTRAINT lats_purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id);


--
-- Name: lats_purchase_order_items lats_purchase_order_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_items
    ADD CONSTRAINT lats_purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: lats_purchase_order_items lats_purchase_order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_items
    ADD CONSTRAINT lats_purchase_order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.lats_product_variants(id);


--
-- Name: lats_purchase_order_payments lats_purchase_order_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_payments
    ADD CONSTRAINT lats_purchase_order_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: lats_purchase_order_payments lats_purchase_order_payments_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_payments
    ADD CONSTRAINT lats_purchase_order_payments_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: lats_purchase_order_shipping lats_purchase_order_shipping_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_shipping
    ADD CONSTRAINT lats_purchase_order_shipping_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: lats_purchase_order_shipping lats_purchase_order_shipping_shipping_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_shipping
    ADD CONSTRAINT lats_purchase_order_shipping_shipping_agent_id_fkey FOREIGN KEY (shipping_agent_id) REFERENCES public.lats_shipping_agents(id);


--
-- Name: lats_purchase_order_shipping lats_purchase_order_shipping_shipping_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_order_shipping
    ADD CONSTRAINT lats_purchase_order_shipping_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES public.lats_shipping_methods(id);


--
-- Name: lats_purchase_orders lats_purchase_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_orders
    ADD CONSTRAINT lats_purchase_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: lats_purchase_orders lats_purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_purchase_orders
    ADD CONSTRAINT lats_purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id);


--
-- Name: lats_sale_items lats_sale_items_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_sale_items
    ADD CONSTRAINT lats_sale_items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_sale_items lats_sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_sale_items
    ADD CONSTRAINT lats_sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id);


--
-- Name: lats_sale_items lats_sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_sale_items
    ADD CONSTRAINT lats_sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.lats_sales(id) ON DELETE CASCADE;


--
-- Name: lats_sales lats_sales_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_sales
    ADD CONSTRAINT lats_sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: lats_shipping_cargo_items lats_shipping_cargo_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_cargo_items
    ADD CONSTRAINT lats_shipping_cargo_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id) ON DELETE CASCADE;


--
-- Name: lats_shipping_cargo_items lats_shipping_cargo_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_cargo_items
    ADD CONSTRAINT lats_shipping_cargo_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.lats_purchase_order_items(id);


--
-- Name: lats_shipping_cargo_items lats_shipping_cargo_items_shipping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_cargo_items
    ADD CONSTRAINT lats_shipping_cargo_items_shipping_id_fkey FOREIGN KEY (shipping_id) REFERENCES public.lats_shipping(id) ON DELETE CASCADE;


--
-- Name: lats_shipping lats_shipping_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping
    ADD CONSTRAINT lats_shipping_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: lats_shipping lats_shipping_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping
    ADD CONSTRAINT lats_shipping_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: lats_shipping_settings lats_shipping_settings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_settings
    ADD CONSTRAINT lats_shipping_settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_shipping_settings lats_shipping_settings_default_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_settings
    ADD CONSTRAINT lats_shipping_settings_default_agent_id_fkey FOREIGN KEY (default_agent_id) REFERENCES public.lats_shipping_agents(id);


--
-- Name: lats_shipping_settings lats_shipping_settings_default_shipping_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_shipping_settings
    ADD CONSTRAINT lats_shipping_settings_default_shipping_method_id_fkey FOREIGN KEY (default_shipping_method_id) REFERENCES public.lats_shipping_methods(id);


--
-- Name: lats_spare_part_usage lats_spare_part_usage_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_spare_part_usage
    ADD CONSTRAINT lats_spare_part_usage_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL;


--
-- Name: lats_spare_part_usage lats_spare_part_usage_spare_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_spare_part_usage
    ADD CONSTRAINT lats_spare_part_usage_spare_part_id_fkey FOREIGN KEY (spare_part_id) REFERENCES public.lats_spare_parts(id) ON DELETE CASCADE;


--
-- Name: lats_spare_part_usage lats_spare_part_usage_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_spare_part_usage
    ADD CONSTRAINT lats_spare_part_usage_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id);


--
-- Name: lats_spare_part_variants lats_spare_part_variants_spare_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_spare_part_variants
    ADD CONSTRAINT lats_spare_part_variants_spare_part_id_fkey FOREIGN KEY (spare_part_id) REFERENCES public.lats_spare_parts(id) ON DELETE CASCADE;


--
-- Name: lats_stock_movements lats_stock_movements_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_movements
    ADD CONSTRAINT lats_stock_movements_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: lats_stock_movements lats_stock_movements_from_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_movements
    ADD CONSTRAINT lats_stock_movements_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES public.store_locations(id);


--
-- Name: lats_stock_movements lats_stock_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_movements
    ADD CONSTRAINT lats_stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id);


--
-- Name: lats_stock_movements lats_stock_movements_to_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_movements
    ADD CONSTRAINT lats_stock_movements_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES public.store_locations(id);


--
-- Name: lats_stock_movements lats_stock_movements_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_movements
    ADD CONSTRAINT lats_stock_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.lats_product_variants(id);


--
-- Name: lats_stock_transfers lats_stock_transfers_from_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_stock_transfers lats_stock_transfers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id);


--
-- Name: lats_stock_transfers lats_stock_transfers_to_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES public.lats_branches(id);


--
-- Name: lats_stock_transfers lats_stock_transfers_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_stock_transfers
    ADD CONSTRAINT lats_stock_transfers_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.lats_product_variants(id);


--
-- Name: lats_store_rooms lats_store_rooms_store_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_rooms
    ADD CONSTRAINT lats_store_rooms_store_location_id_fkey FOREIGN KEY (store_location_id) REFERENCES public.lats_store_locations(id) ON DELETE CASCADE;


--
-- Name: lats_store_shelves lats_store_shelves_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_shelves
    ADD CONSTRAINT lats_store_shelves_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.lats_store_rooms(id) ON DELETE CASCADE;


--
-- Name: lats_store_shelves lats_store_shelves_storage_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_shelves
    ADD CONSTRAINT lats_store_shelves_storage_room_id_fkey FOREIGN KEY (storage_room_id) REFERENCES public.lats_store_rooms(id) ON DELETE CASCADE;


--
-- Name: lats_store_shelves lats_store_shelves_store_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_store_shelves
    ADD CONSTRAINT lats_store_shelves_store_location_id_fkey FOREIGN KEY (store_location_id) REFERENCES public.lats_store_locations(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_categories lats_supplier_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_categories
    ADD CONSTRAINT lats_supplier_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.lats_supplier_categories(id);


--
-- Name: lats_supplier_category_mapping lats_supplier_category_mapping_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_category_mapping
    ADD CONSTRAINT lats_supplier_category_mapping_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.lats_supplier_categories(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_category_mapping lats_supplier_category_mapping_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_category_mapping
    ADD CONSTRAINT lats_supplier_category_mapping_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_communications lats_supplier_communications_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_communications
    ADD CONSTRAINT lats_supplier_communications_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_contracts lats_supplier_contracts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_contracts
    ADD CONSTRAINT lats_supplier_contracts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_documents lats_supplier_documents_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_documents
    ADD CONSTRAINT lats_supplier_documents_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_ratings lats_supplier_ratings_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_ratings
    ADD CONSTRAINT lats_supplier_ratings_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_tag_mapping lats_supplier_tag_mapping_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_tag_mapping
    ADD CONSTRAINT lats_supplier_tag_mapping_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lats_suppliers(id) ON DELETE CASCADE;


--
-- Name: lats_supplier_tag_mapping lats_supplier_tag_mapping_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_supplier_tag_mapping
    ADD CONSTRAINT lats_supplier_tag_mapping_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.lats_supplier_tags(id) ON DELETE CASCADE;


--
-- Name: lats_suppliers lats_suppliers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_suppliers
    ADD CONSTRAINT lats_suppliers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_contracts lats_trade_in_contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id);


--
-- Name: lats_trade_in_contracts lats_trade_in_contracts_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.lats_trade_in_transactions(id) ON DELETE CASCADE;


--
-- Name: lats_trade_in_contracts lats_trade_in_contracts_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_contracts
    ADD CONSTRAINT lats_trade_in_contracts_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.auth_users(id);


--
-- Name: lats_trade_in_damage_assessments lats_trade_in_damage_assessments_assessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_damage_assessments
    ADD CONSTRAINT lats_trade_in_damage_assessments_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES public.auth_users(id);


--
-- Name: lats_trade_in_damage_assessments lats_trade_in_damage_assessments_spare_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_damage_assessments
    ADD CONSTRAINT lats_trade_in_damage_assessments_spare_part_id_fkey FOREIGN KEY (spare_part_id) REFERENCES public.lats_spare_parts(id);


--
-- Name: lats_trade_in_damage_assessments lats_trade_in_damage_assessments_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_damage_assessments
    ADD CONSTRAINT lats_trade_in_damage_assessments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.lats_trade_in_transactions(id) ON DELETE CASCADE;


--
-- Name: lats_trade_in_prices lats_trade_in_prices_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_prices lats_trade_in_prices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_prices lats_trade_in_prices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id) ON DELETE CASCADE;


--
-- Name: lats_trade_in_prices lats_trade_in_prices_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.auth_users(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_prices lats_trade_in_prices_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_prices
    ADD CONSTRAINT lats_trade_in_prices_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.lats_product_variants(id) ON DELETE CASCADE;


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.auth_users(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_new_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_new_product_id_fkey FOREIGN KEY (new_product_id) REFERENCES public.lats_products(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_new_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_new_variant_id_fkey FOREIGN KEY (new_variant_id) REFERENCES public.lats_product_variants(id) ON DELETE SET NULL;


--
-- Name: lats_trade_in_transactions lats_trade_in_transactions_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lats_trade_in_transactions
    ADD CONSTRAINT lats_trade_in_transactions_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.lats_sales(id) ON DELETE SET NULL;


--
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: loyalty_points loyalty_points_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: message_recipient_lists message_recipient_lists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_recipient_lists
    ADD CONSTRAINT message_recipient_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mobile_money_transactions mobile_money_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_money_transactions
    ADD CONSTRAINT mobile_money_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: mobile_money_transactions mobile_money_transactions_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_money_transactions
    ADD CONSTRAINT mobile_money_transactions_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id);


--
-- Name: notifications notifications_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: paragraphs paragraphs_note_id_notes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paragraphs
    ADD CONSTRAINT paragraphs_note_id_notes_id_fk FOREIGN KEY (note_id) REFERENCES public.notes(id);


--
-- Name: payment_transactions payment_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: payment_transactions payment_transactions_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.lats_sales(id);


--
-- Name: points_transactions points_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lats_products(id) ON DELETE CASCADE;


--
-- Name: product_interests product_interests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_interests
    ADD CONSTRAINT product_interests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.whatsapp_customers(customer_id);


--
-- Name: purchase_order_audit purchase_order_audit_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_audit
    ADD CONSTRAINT purchase_order_audit_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_messages purchase_order_messages_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_messages
    ADD CONSTRAINT purchase_order_messages_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_payments purchase_order_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_payments
    ADD CONSTRAINT purchase_order_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: purchase_order_payments purchase_order_payments_payment_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_payments
    ADD CONSTRAINT purchase_order_payments_payment_account_id_fkey FOREIGN KEY (payment_account_id) REFERENCES public.finance_accounts(id);


--
-- Name: purchase_order_payments purchase_order_payments_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_payments
    ADD CONSTRAINT purchase_order_payments_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_quality_check_items purchase_order_quality_check_items_criteria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_quality_check_items
    ADD CONSTRAINT purchase_order_quality_check_items_criteria_id_fkey FOREIGN KEY (criteria_id) REFERENCES public.quality_check_criteria(id) ON DELETE SET NULL;


--
-- Name: purchase_order_quality_check_items purchase_order_quality_check_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_quality_check_items
    ADD CONSTRAINT purchase_order_quality_check_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.lats_purchase_order_items(id) ON DELETE CASCADE;


--
-- Name: purchase_order_quality_check_items purchase_order_quality_check_items_quality_check_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_quality_check_items
    ADD CONSTRAINT purchase_order_quality_check_items_quality_check_id_fkey FOREIGN KEY (quality_check_id) REFERENCES public.purchase_order_quality_checks(id) ON DELETE CASCADE;


--
-- Name: purchase_order_quality_checks purchase_order_quality_checks_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_quality_checks
    ADD CONSTRAINT purchase_order_quality_checks_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_quality_checks purchase_order_quality_checks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_quality_checks
    ADD CONSTRAINT purchase_order_quality_checks_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.quality_check_templates(id);


--
-- Name: purchase_orders purchase_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: quality_check_criteria quality_check_criteria_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_check_criteria
    ADD CONSTRAINT quality_check_criteria_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.quality_check_templates(id) ON DELETE CASCADE;


--
-- Name: quality_check_items quality_check_items_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_check_items
    ADD CONSTRAINT quality_check_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.quality_check_templates(id) ON DELETE CASCADE;


--
-- Name: quality_check_results quality_check_results_check_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_check_results
    ADD CONSTRAINT quality_check_results_check_item_id_fkey FOREIGN KEY (check_item_id) REFERENCES public.quality_check_items(id);


--
-- Name: quality_check_results quality_check_results_quality_check_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_check_results
    ADD CONSTRAINT quality_check_results_quality_check_id_fkey FOREIGN KEY (quality_check_id) REFERENCES public.quality_checks(id) ON DELETE CASCADE;


--
-- Name: quality_checks quality_checks_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: quality_checks quality_checks_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.lats_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: quality_checks quality_checks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_checks
    ADD CONSTRAINT quality_checks_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.quality_check_templates(id);


--
-- Name: recurring_expense_history recurring_expense_history_recurring_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expense_history
    ADD CONSTRAINT recurring_expense_history_recurring_expense_id_fkey FOREIGN KEY (recurring_expense_id) REFERENCES public.recurring_expenses(id) ON DELETE CASCADE;


--
-- Name: recurring_expense_history recurring_expense_history_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expense_history
    ADD CONSTRAINT recurring_expense_history_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.account_transactions(id) ON DELETE SET NULL;


--
-- Name: recurring_expenses recurring_expenses_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.finance_accounts(id) ON DELETE CASCADE;


--
-- Name: recurring_expenses recurring_expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: reminders reminders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reminders reminders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE CASCADE;


--
-- Name: reminders reminders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: repair_parts repair_parts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_parts
    ADD CONSTRAINT repair_parts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: repair_parts repair_parts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_parts
    ADD CONSTRAINT repair_parts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: repair_parts repair_parts_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_parts
    ADD CONSTRAINT repair_parts_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: repair_parts repair_parts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repair_parts
    ADD CONSTRAINT repair_parts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: report_attachments report_attachments_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_attachments
    ADD CONSTRAINT report_attachments_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: report_attachments report_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_attachments
    ADD CONSTRAINT report_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.auth_users(id);


--
-- Name: reports reports_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.auth_users(id);


--
-- Name: reports reports_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: reports reports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id);


--
-- Name: sale_inventory_items sale_inventory_items_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_inventory_items
    ADD CONSTRAINT sale_inventory_items_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.lats_customers(id) ON DELETE SET NULL;


--
-- Name: sale_inventory_items sale_inventory_items_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_inventory_items
    ADD CONSTRAINT sale_inventory_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: sale_inventory_items sale_inventory_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_inventory_items
    ADD CONSTRAINT sale_inventory_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.lats_sales(id) ON DELETE CASCADE;


--
-- Name: sales sales_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: sales_pipeline sales_pipeline_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_pipeline
    ADD CONSTRAINT sales_pipeline_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.whatsapp_customers(customer_id);


--
-- Name: scheduled_bulk_messages scheduled_bulk_messages_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_bulk_messages
    ADD CONSTRAINT scheduled_bulk_messages_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: scheduled_bulk_messages scheduled_bulk_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_bulk_messages
    ADD CONSTRAINT scheduled_bulk_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scheduled_message_executions scheduled_message_executions_scheduled_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_executions
    ADD CONSTRAINT scheduled_message_executions_scheduled_message_id_fkey FOREIGN KEY (scheduled_message_id) REFERENCES public.scheduled_bulk_messages(id) ON DELETE CASCADE;


--
-- Name: scheduled_transfer_executions scheduled_transfer_executions_destination_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfer_executions
    ADD CONSTRAINT scheduled_transfer_executions_destination_transaction_id_fkey FOREIGN KEY (destination_transaction_id) REFERENCES public.account_transactions(id);


--
-- Name: scheduled_transfer_executions scheduled_transfer_executions_scheduled_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfer_executions
    ADD CONSTRAINT scheduled_transfer_executions_scheduled_transfer_id_fkey FOREIGN KEY (scheduled_transfer_id) REFERENCES public.scheduled_transfers(id) ON DELETE CASCADE;


--
-- Name: scheduled_transfer_executions scheduled_transfer_executions_source_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfer_executions
    ADD CONSTRAINT scheduled_transfer_executions_source_transaction_id_fkey FOREIGN KEY (source_transaction_id) REFERENCES public.account_transactions(id);


--
-- Name: scheduled_transfers scheduled_transfers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfers
    ADD CONSTRAINT scheduled_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: scheduled_transfers scheduled_transfers_destination_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfers
    ADD CONSTRAINT scheduled_transfers_destination_account_id_fkey FOREIGN KEY (destination_account_id) REFERENCES public.finance_accounts(id) ON DELETE CASCADE;


--
-- Name: scheduled_transfers scheduled_transfers_source_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_transfers
    ADD CONSTRAINT scheduled_transfers_source_account_id_fkey FOREIGN KEY (source_account_id) REFERENCES public.finance_accounts(id) ON DELETE CASCADE;


--
-- Name: serial_number_movements serial_number_movements_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_number_movements
    ADD CONSTRAINT serial_number_movements_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: shelves shelves_storage_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelves
    ADD CONSTRAINT shelves_storage_room_id_fkey FOREIGN KEY (storage_room_id) REFERENCES public.storage_rooms(id) ON DELETE CASCADE;


--
-- Name: sms_logs sms_logs_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_logs
    ADD CONSTRAINT sms_logs_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: sms_trigger_logs sms_trigger_logs_trigger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_trigger_logs
    ADD CONSTRAINT sms_trigger_logs_trigger_id_fkey FOREIGN KEY (trigger_id) REFERENCES public.sms_triggers(id) ON DELETE SET NULL;


--
-- Name: sms_triggers sms_triggers_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_triggers
    ADD CONSTRAINT sms_triggers_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.communication_templates(id);


--
-- Name: special_order_payments special_order_payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.special_order_payments
    ADD CONSTRAINT special_order_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.finance_accounts(id);


--
-- Name: special_order_payments special_order_payments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.special_order_payments
    ADD CONSTRAINT special_order_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id);


--
-- Name: special_order_payments special_order_payments_special_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.special_order_payments
    ADD CONSTRAINT special_order_payments_special_order_id_fkey FOREIGN KEY (special_order_id) REFERENCES public.customer_special_orders(id) ON DELETE CASCADE;


--
-- Name: storage_rooms storage_rooms_store_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_rooms
    ADD CONSTRAINT storage_rooms_store_location_id_fkey FOREIGN KEY (store_location_id) REFERENCES public.store_locations(id);


--
-- Name: user_branch_assignments user_branch_assignments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branch_assignments
    ADD CONSTRAINT user_branch_assignments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_whatsapp_preferences user_whatsapp_preferences_active_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_whatsapp_preferences
    ADD CONSTRAINT user_whatsapp_preferences_active_session_id_fkey FOREIGN KEY (active_session_id) REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL;


--
-- Name: users users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.lats_branches(id);


--
-- Name: webhook_logs webhook_logs_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE;


--
-- Name: whatsapp_ab_tests whatsapp_ab_tests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_ab_tests
    ADD CONSTRAINT whatsapp_ab_tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_blacklist whatsapp_blacklist_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_blacklist
    ADD CONSTRAINT whatsapp_blacklist_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id);


--
-- Name: whatsapp_campaign_metrics whatsapp_campaign_metrics_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaign_metrics
    ADD CONSTRAINT whatsapp_campaign_metrics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.whatsapp_campaigns(id);


--
-- Name: whatsapp_campaigns whatsapp_campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaigns
    ADD CONSTRAINT whatsapp_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_customer_segments whatsapp_customer_segments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_customer_segments
    ADD CONSTRAINT whatsapp_customer_segments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_failed_queue whatsapp_failed_queue_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_failed_queue
    ADD CONSTRAINT whatsapp_failed_queue_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.whatsapp_campaigns(id);


--
-- Name: whatsapp_incoming_messages whatsapp_incoming_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_incoming_messages
    ADD CONSTRAINT whatsapp_incoming_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL;


--
-- Name: whatsapp_logs whatsapp_logs_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.store_locations(id) ON DELETE SET NULL;


--
-- Name: whatsapp_logs whatsapp_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL;


--
-- Name: whatsapp_media_library whatsapp_media_library_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_media_library
    ADD CONSTRAINT whatsapp_media_library_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: whatsapp_reply_templates whatsapp_reply_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_reply_templates
    ADD CONSTRAINT whatsapp_reply_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_reply_templates whatsapp_reply_templates_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_reply_templates
    ADD CONSTRAINT whatsapp_reply_templates_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.whatsapp_media_library(id);


--
-- Name: whatsapp_scheduled_campaigns whatsapp_scheduled_campaigns_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_scheduled_campaigns
    ADD CONSTRAINT whatsapp_scheduled_campaigns_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.whatsapp_campaigns(id);


--
-- Name: whatsapp_scheduled_campaigns whatsapp_scheduled_campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_scheduled_campaigns
    ADD CONSTRAINT whatsapp_scheduled_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_session_logs whatsapp_session_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_session_logs
    ADD CONSTRAINT whatsapp_session_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE;


--
-- Name: user_settings Allow all operations on user_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations on user_settings" ON public.user_settings USING (true) WITH CHECK (true);


--
-- Name: product_images Allow authenticated users to delete product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to delete product images" ON public.product_images FOR DELETE TO authenticated USING (true);


--
-- Name: product_images Allow authenticated users to insert product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to insert product images" ON public.product_images FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: product_images Allow authenticated users to update product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to update product images" ON public.product_images FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: product_images Allow authenticated users to view product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view product images" ON public.product_images FOR SELECT TO authenticated USING (true);


--
-- Name: admin_settings Allow read access to all authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access to all authenticated users" ON public.admin_settings FOR SELECT TO authenticated USING (true);


--
-- Name: customer_installment_plans Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users" ON public.customer_installment_plans FOR DELETE USING (true);


--
-- Name: customer_special_orders Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users" ON public.customer_special_orders FOR DELETE USING (true);


--
-- Name: expenses Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users" ON public.expenses FOR DELETE USING (true);


--
-- Name: lats_stock_transfers Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users" ON public.lats_stock_transfers FOR DELETE USING (true);


--
-- Name: loyalty_points Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users" ON public.loyalty_points FOR DELETE USING (true);


--
-- Name: backup_logs Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.backup_logs FOR INSERT WITH CHECK (true);


--
-- Name: customer_installment_plan_payments Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.customer_installment_plan_payments FOR INSERT WITH CHECK (true);


--
-- Name: customer_installment_plans Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.customer_installment_plans FOR INSERT WITH CHECK (true);


--
-- Name: customer_special_orders Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.customer_special_orders FOR INSERT WITH CHECK (true);


--
-- Name: expenses Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.expenses FOR INSERT WITH CHECK (true);


--
-- Name: installment_payments Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.installment_payments FOR INSERT WITH CHECK (true);


--
-- Name: lats_stock_transfers Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.lats_stock_transfers FOR INSERT WITH CHECK (true);


--
-- Name: loyalty_points Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.loyalty_points FOR INSERT WITH CHECK (true);


--
-- Name: special_order_payments Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.special_order_payments FOR INSERT WITH CHECK (true);


--
-- Name: backup_logs Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.backup_logs FOR SELECT USING (true);


--
-- Name: customer_installment_plan_payments Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.customer_installment_plan_payments FOR SELECT USING (true);


--
-- Name: customer_installment_plans Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.customer_installment_plans FOR SELECT USING (true);


--
-- Name: customer_special_orders Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.customer_special_orders FOR SELECT USING (true);


--
-- Name: expenses Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.expenses FOR SELECT USING (true);


--
-- Name: installment_payments Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.installment_payments FOR SELECT USING (true);


--
-- Name: lats_stock_transfers Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.lats_stock_transfers FOR SELECT USING (true);


--
-- Name: loyalty_points Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.loyalty_points FOR SELECT USING (true);


--
-- Name: special_order_payments Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.special_order_payments FOR SELECT USING (true);


--
-- Name: customer_installment_plan_payments Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.customer_installment_plan_payments FOR UPDATE USING (true);


--
-- Name: customer_installment_plans Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.customer_installment_plans FOR UPDATE USING (true);


--
-- Name: customer_special_orders Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.customer_special_orders FOR UPDATE USING (true);


--
-- Name: expenses Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.expenses FOR UPDATE USING (true);


--
-- Name: installment_payments Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.installment_payments FOR UPDATE USING (true);


--
-- Name: lats_stock_transfers Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.lats_stock_transfers FOR UPDATE USING (true);


--
-- Name: loyalty_points Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.loyalty_points FOR UPDATE USING (true);


--
-- Name: special_order_payments Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.special_order_payments FOR UPDATE USING (true);


--
-- Name: account_transactions Users can delete account transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete account transactions" ON public.account_transactions FOR DELETE TO authenticated USING (true);


--
-- Name: customer_payments Users can delete customer payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete customer payments" ON public.customer_payments FOR DELETE TO authenticated USING (true);


--
-- Name: finance_expenses Users can delete expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete expenses" ON public.finance_expenses FOR DELETE TO authenticated USING (true);


--
-- Name: finance_accounts Users can delete finance accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete finance accounts" ON public.finance_accounts FOR DELETE TO authenticated USING (true);


--
-- Name: payment_transactions Users can delete payment transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete payment transactions" ON public.payment_transactions FOR DELETE TO authenticated USING (true);


--
-- Name: recurring_expenses Users can delete recurring expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete recurring expenses" ON public.recurring_expenses FOR DELETE TO authenticated USING (true);


--
-- Name: account_transactions Users can insert account transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert account transactions" ON public.account_transactions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: customer_payments Users can insert customer payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert customer payments" ON public.customer_payments FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: finance_expenses Users can insert expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert expenses" ON public.finance_expenses FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: finance_accounts Users can insert finance accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert finance accounts" ON public.finance_accounts FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: payment_transactions Users can insert payment transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert payment transactions" ON public.payment_transactions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: recurring_expenses Users can insert recurring expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert recurring expenses" ON public.recurring_expenses FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: finance_expense_categories Users can manage expense categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage expense categories" ON public.finance_expense_categories TO authenticated USING (true) WITH CHECK (true);


--
-- Name: account_transactions Users can update account transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update account transactions" ON public.account_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: customer_payments Users can update customer payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update customer payments" ON public.customer_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: finance_expenses Users can update expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update expenses" ON public.finance_expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: finance_accounts Users can update finance accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update finance accounts" ON public.finance_accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: payment_transactions Users can update payment transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update payment transactions" ON public.payment_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: recurring_expenses Users can update recurring expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update recurring expenses" ON public.recurring_expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: account_transactions Users can view account transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view account transactions" ON public.account_transactions FOR SELECT TO authenticated USING (true);


--
-- Name: customer_payments Users can view customer payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view customer payments" ON public.customer_payments FOR SELECT TO authenticated USING (true);


--
-- Name: expense_categories Users can view expense categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view expense categories" ON public.expense_categories FOR SELECT TO authenticated USING (true);


--
-- Name: finance_expense_categories Users can view expense categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view expense categories" ON public.finance_expense_categories FOR SELECT TO authenticated USING (true);


--
-- Name: finance_expenses Users can view expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view expenses" ON public.finance_expenses FOR SELECT TO authenticated USING (true);


--
-- Name: finance_accounts Users can view finance accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view finance accounts" ON public.finance_accounts FOR SELECT TO authenticated USING (true);


--
-- Name: payment_transactions Users can view payment transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view payment transactions" ON public.payment_transactions FOR SELECT TO authenticated USING (true);


--
-- Name: recurring_expense_history Users can view recurring expense history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view recurring expense history" ON public.recurring_expense_history FOR SELECT TO authenticated USING (true);


--
-- Name: recurring_expenses Users can view recurring expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view recurring expenses" ON public.recurring_expenses FOR SELECT TO authenticated USING (true);


--
-- Name: account_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_sales_closures authenticated_delete_closures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_delete_closures ON public.daily_sales_closures FOR DELETE TO authenticated USING (true);


--
-- Name: daily_opening_sessions authenticated_delete_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_delete_sessions ON public.daily_opening_sessions FOR DELETE TO authenticated USING (true);


--
-- Name: daily_sales_closures authenticated_insert_closures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_insert_closures ON public.daily_sales_closures FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: daily_opening_sessions authenticated_insert_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_insert_sessions ON public.daily_opening_sessions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: daily_sales_closures authenticated_select_closures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_select_closures ON public.daily_sales_closures FOR SELECT TO authenticated USING (true);


--
-- Name: daily_opening_sessions authenticated_select_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_select_sessions ON public.daily_opening_sessions FOR SELECT TO authenticated USING (true);


--
-- Name: daily_sales_closures authenticated_update_closures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_update_closures ON public.daily_sales_closures FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: daily_opening_sessions authenticated_update_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_update_sessions ON public.daily_opening_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: backup_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: branch_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branch_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: branch_transfers branch_transfers_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branch_transfers_delete_policy ON public.branch_transfers FOR DELETE USING ((status = ANY (ARRAY['pending'::text, 'rejected'::text, 'cancelled'::text])));


--
-- Name: branch_transfers branch_transfers_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branch_transfers_insert_policy ON public.branch_transfers FOR INSERT WITH CHECK (true);


--
-- Name: branch_transfers branch_transfers_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branch_transfers_select_policy ON public.branch_transfers FOR SELECT USING (true);


--
-- Name: branch_transfers branch_transfers_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branch_transfers_update_policy ON public.branch_transfers FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_delete_policy ON public.categories FOR DELETE USING (true);


--
-- Name: categories categories_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_insert_policy ON public.categories FOR INSERT WITH CHECK (true);


--
-- Name: categories categories_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_select_policy ON public.categories FOR SELECT USING (true);


--
-- Name: categories categories_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_update_policy ON public.categories FOR UPDATE USING (true);


--
-- Name: notes crud-authenticated-policy-delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "crud-authenticated-policy-delete" ON public.notes FOR DELETE TO authenticated USING (( SELECT (auth.user_id() = notes.owner_id)));


--
-- Name: paragraphs crud-authenticated-policy-delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "crud-authenticated-policy-delete" ON public.paragraphs FOR DELETE TO authenticated USING (( SELECT (notes.owner_id = auth.user_id())
   FROM public.notes
  WHERE (notes.id = paragraphs.note_id)));


--
-- Name: notes crud-authenticated-policy-insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "crud-authenticated-policy-insert" ON public.notes FOR INSERT TO authenticated WITH CHECK (( SELECT (auth.user_id() = notes.owner_id)));


--
-- Name: paragraphs crud-authenticated-policy-insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "crud-authenticated-policy-insert" ON public.paragraphs FOR INSERT TO authenticated WITH CHECK (( SELECT (notes.owner_id = auth.user_id())
   FROM public.notes
  WHERE (notes.id = paragraphs.note_id)));


--
-- Name: notes crud-authenticated-policy-select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "crud-authenticated-policy-select" ON public.notes FOR SELECT TO authenticated USING (( SELECT (auth.user_id() = notes.owner_id)));


--
-- Name: paragraphs crud-authenticated-policy-select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "crud-authenticated-policy-select" ON public.paragraphs FOR SELECT TO authenticated USING (( SELECT (notes.owner_id = auth.user_id())
   FROM public.notes
  WHERE (notes.id = paragraphs.note_id)));


--
-- Name: notes crud-authenticated-policy-update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "crud-authenticated-policy-update" ON public.notes FOR UPDATE TO authenticated USING (( SELECT (auth.user_id() = notes.owner_id))) WITH CHECK (( SELECT (auth.user_id() = notes.owner_id)));


--
-- Name: paragraphs crud-authenticated-policy-update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "crud-authenticated-policy-update" ON public.paragraphs FOR UPDATE TO authenticated USING (( SELECT (notes.owner_id = auth.user_id())
   FROM public.notes
  WHERE (notes.id = paragraphs.note_id))) WITH CHECK (( SELECT (notes.owner_id = auth.user_id())
   FROM public.notes
  WHERE (notes.id = paragraphs.note_id)));


--
-- Name: customer_installment_plan_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_installment_plan_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_installment_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_installment_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_special_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_special_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_opening_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_opening_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_sales_closures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_sales_closures ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: finance_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: finance_expense_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.finance_expense_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: finance_expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: installment_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory inventory_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_delete_policy ON public.inventory FOR DELETE USING (true);


--
-- Name: inventory inventory_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_insert_policy ON public.inventory FOR INSERT WITH CHECK (true);


--
-- Name: inventory_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_items inventory_items_delete_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_items_delete_all ON public.inventory_items FOR DELETE USING (true);


--
-- Name: inventory_items inventory_items_insert_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_items_insert_all ON public.inventory_items FOR INSERT WITH CHECK (true);


--
-- Name: inventory_items inventory_items_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_items_select_all ON public.inventory_items FOR SELECT USING (true);


--
-- Name: inventory_items inventory_items_update_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_items_update_all ON public.inventory_items FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: inventory inventory_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_select_policy ON public.inventory FOR SELECT USING (true);


--
-- Name: inventory inventory_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inventory_update_policy ON public.inventory FOR UPDATE USING (true);


--
-- Name: lats_product_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lats_product_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: lats_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lats_products ENABLE ROW LEVEL SECURITY;

--
-- Name: lats_stock_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lats_stock_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

--
-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_delete_policy ON public.notifications FOR DELETE USING (true);


--
-- Name: notifications notifications_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_policy ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: notifications notifications_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select_policy ON public.notifications FOR SELECT USING (true);


--
-- Name: notifications notifications_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update_policy ON public.notifications FOR UPDATE USING (true);


--
-- Name: paragraphs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.paragraphs ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: product_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

--
-- Name: lats_products products_delete_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_delete_all ON public.lats_products FOR DELETE USING (true);


--
-- Name: lats_products products_insert_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_insert_all ON public.lats_products FOR INSERT WITH CHECK (true);


--
-- Name: lats_products products_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_select_all ON public.lats_products FOR SELECT USING (true);


--
-- Name: lats_products products_update_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_update_all ON public.lats_products FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: purchase_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders purchase_orders_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_orders_delete_policy ON public.purchase_orders FOR DELETE USING (true);


--
-- Name: purchase_orders purchase_orders_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_orders_insert_policy ON public.purchase_orders FOR INSERT WITH CHECK (true);


--
-- Name: purchase_orders purchase_orders_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_orders_select_policy ON public.purchase_orders FOR SELECT USING (true);


--
-- Name: purchase_orders purchase_orders_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY purchase_orders_update_policy ON public.purchase_orders FOR UPDATE USING (true);


--
-- Name: recurring_expense_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_expense_history ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

--
-- Name: sales sales_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_delete_policy ON public.sales FOR DELETE USING (true);


--
-- Name: sales sales_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_insert_policy ON public.sales FOR INSERT WITH CHECK (true);


--
-- Name: sales sales_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_select_policy ON public.sales FOR SELECT USING (true);


--
-- Name: sales sales_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_update_policy ON public.sales FOR UPDATE USING (true);


--
-- Name: notes shared_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shared_policy ON public.notes FOR SELECT TO authenticated USING ((shared = true));


--
-- Name: paragraphs shared_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shared_policy ON public.paragraphs FOR SELECT TO authenticated USING (( SELECT notes.shared
   FROM public.notes
  WHERE (notes.id = paragraphs.note_id)));


--
-- Name: special_order_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.special_order_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions user_sessions_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_sessions_admin ON public.user_sessions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.auth_users
  WHERE ((auth_users.id = auth.uid()) AND (auth_users.role = 'admin'::text)))));


--
-- Name: user_sessions user_sessions_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_sessions_own ON public.user_sessions TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: lats_product_variants variants_delete_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_delete_all ON public.lats_product_variants FOR DELETE USING (true);


--
-- Name: lats_product_variants variants_insert_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_insert_all ON public.lats_product_variants FOR INSERT WITH CHECK (true);


--
-- Name: lats_product_variants variants_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_select_all ON public.lats_product_variants FOR SELECT USING (true);


--
-- Name: lats_product_variants variants_update_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_update_all ON public.lats_product_variants FOR UPDATE USING (true) WITH CHECK (true);


--
-- PostgreSQL database dump complete
--

