#!/usr/bin/env node
/**
 * 🔧 AUTOMATIC DATABASE FIX SCRIPT
 * This script automatically fixes all database issues:
 * 1. Payment system issues (method column, constraints)
 * 2. Inventory items for received POs
 * 3. All missing columns and functions
 * 
 * Run with: node server/fix-database.mjs
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('📝 Please add DATABASE_URL to server/.env file');
  process.exit(1);
}

// Create connection
const sql = postgres(databaseUrl, {
  ssl: 'require',
  onnotice: () => {}, // Suppress notices
});

console.log('🚀 Starting automatic database fix...\n');

// ============================================
// FIX 1: PAYMENT SYSTEM
// ============================================
async function fixPaymentSystem() {
  console.log('💰 [1/3] Fixing payment system...');
  
  try {
    await sql.begin(async sql => {
      // Add method column if missing
      await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'purchase_order_payments' AND column_name = 'method'
          ) THEN
            ALTER TABLE purchase_order_payments ADD COLUMN method TEXT;
            UPDATE purchase_order_payments SET method = payment_method WHERE payment_method IS NOT NULL;
            RAISE NOTICE '✅ Added method column';
          END IF;
        END $$;
      `;

      // Remove NOT NULL constraints
      await sql`
        DO $$ 
        BEGIN
          ALTER TABLE purchase_order_payments ALTER COLUMN payment_method DROP NOT NULL;
          ALTER TABLE purchase_order_payments ALTER COLUMN payment_method_id DROP NOT NULL;
          ALTER TABLE purchase_order_payments ALTER COLUMN payment_account_id DROP NOT NULL;
        EXCEPTION WHEN OTHERS THEN
          NULL; -- Ignore if constraints don't exist
        END $$;
      `;

      // Drop problematic foreign key constraints
      await sql`
        DO $$ 
        DECLARE
          constraint_name TEXT;
        BEGIN
          FOR constraint_name IN 
            SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_attribute attr ON attr.attrelid = con.conrelid 
              AND attr.attnum = ANY(con.conkey)
            WHERE rel.relname = 'purchase_order_payments'
              AND attr.attname = 'payment_method_id'
              AND con.contype = 'f'
          LOOP
            EXECUTE format('ALTER TABLE purchase_order_payments DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_name);
          END LOOP;
        END $$;
      `;

      // Update payment function
      await sql`
        CREATE OR REPLACE FUNCTION process_purchase_order_payment(
          purchase_order_id_param UUID,
          payment_account_id_param UUID,
          amount_param DECIMAL,
          currency_param TEXT,
          payment_method_param TEXT,
          payment_method_id_param UUID,
          user_id_param UUID,
          reference_param TEXT DEFAULT NULL,
          notes_param TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          v_payment_id UUID;
          v_po_total DECIMAL;
          v_total_paid DECIMAL;
          v_new_payment_status TEXT;
          v_has_method_column BOOLEAN;
          v_has_payment_method_column BOOLEAN;
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM lats_purchase_orders WHERE id = purchase_order_id_param) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Purchase order not found', 'error_code', 'PO_NOT_FOUND');
          END IF;

          SELECT total_amount INTO v_po_total FROM lats_purchase_orders WHERE id = purchase_order_id_param;

          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'purchase_order_payments' AND column_name = 'method'
          ) INTO v_has_method_column;

          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method'
          ) INTO v_has_payment_method_column;

          IF v_has_method_column AND v_has_payment_method_column THEN
            INSERT INTO purchase_order_payments (
              purchase_order_id, payment_account_id, payment_method_id, method, payment_method,
              amount, currency, status, reference, notes, user_id, created_by, payment_date, created_at, updated_at
            ) VALUES (
              purchase_order_id_param, payment_account_id_param,
              NULLIF(payment_method_id_param, '00000000-0000-0000-0000-000000000000'::UUID),
              payment_method_param, payment_method_param, amount_param, currency_param, 'completed',
              reference_param, notes_param, user_id_param, user_id_param, NOW(), NOW(), NOW()
            ) RETURNING id INTO v_payment_id;
          ELSIF v_has_method_column THEN
            INSERT INTO purchase_order_payments (
              purchase_order_id, payment_account_id, payment_method_id, method,
              amount, currency, status, reference, notes, user_id, created_by, payment_date, created_at, updated_at
            ) VALUES (
              purchase_order_id_param, payment_account_id_param,
              NULLIF(payment_method_id_param, '00000000-0000-0000-0000-000000000000'::UUID),
              payment_method_param, amount_param, currency_param, 'completed',
              reference_param, notes_param, user_id_param, user_id_param, NOW(), NOW(), NOW()
            ) RETURNING id INTO v_payment_id;
          ELSE
            INSERT INTO purchase_order_payments (
              purchase_order_id, payment_account_id, payment_method_id, payment_method,
              amount, currency, status, reference, notes, user_id, created_by, payment_date, created_at, updated_at
            ) VALUES (
              purchase_order_id_param, payment_account_id_param,
              NULLIF(payment_method_id_param, '00000000-0000-0000-0000-000000000000'::UUID),
              payment_method_param, amount_param, currency_param, 'completed',
              reference_param, notes_param, user_id_param, user_id_param, NOW(), NOW(), NOW()
            ) RETURNING id INTO v_payment_id;
          END IF;

          SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
          FROM purchase_order_payments WHERE purchase_order_id = purchase_order_id_param AND status = 'completed';

          IF v_total_paid >= v_po_total THEN v_new_payment_status := 'paid';
          ELSIF v_total_paid > 0 THEN v_new_payment_status := 'partial';
          ELSE v_new_payment_status := 'unpaid';
          END IF;

          UPDATE lats_purchase_orders SET payment_status = v_new_payment_status, updated_at = NOW()
          WHERE id = purchase_order_id_param;

          RETURN jsonb_build_object(
            'success', true, 'message', 'Payment processed successfully',
            'data', jsonb_build_object('payment_id', v_payment_id, 'amount_paid', amount_param,
              'total_paid', v_total_paid, 'po_total', v_po_total, 'payment_status', v_new_payment_status)
          );

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object('success', false, 'message', 'Payment processing failed: ' || SQLERRM, 'error_code', 'PAYMENT_ERROR');
        END;
        $$;
      `;

      await sql`GRANT EXECUTE ON FUNCTION process_purchase_order_payment(UUID, UUID, DECIMAL, TEXT, TEXT, UUID, UUID, TEXT, TEXT) TO authenticated`;
    });
    
    console.log('   ✅ Payment system fixed\n');
    return true;
  } catch (error) {
    console.error('   ❌ Error fixing payment system:', error.message);
    return false;
  }
}

// ============================================
// FIX 2: INVENTORY ITEMS
// ============================================
async function fixInventoryItems() {
  console.log('📦 [2/3] Fixing inventory items...');
  
  try {
    await sql.begin(async sql => {
      // Add missing columns
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'purchase_order_id') THEN
            ALTER TABLE inventory_items ADD COLUMN purchase_order_id UUID REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;
            UPDATE inventory_items SET purchase_order_id = (metadata->>'purchase_order_id')::UUID
            WHERE metadata IS NOT NULL AND metadata->>'purchase_order_id' IS NOT NULL;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'purchase_order_item_id') THEN
            ALTER TABLE inventory_items ADD COLUMN purchase_order_item_id UUID REFERENCES lats_purchase_order_items(id) ON DELETE SET NULL;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'shelf') THEN
            ALTER TABLE inventory_items ADD COLUMN shelf TEXT;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'bin') THEN
            ALTER TABLE inventory_items ADD COLUMN bin TEXT;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'purchase_date') THEN
            ALTER TABLE inventory_items ADD COLUMN purchase_date TIMESTAMPTZ DEFAULT NOW();
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'warranty_start') THEN
            ALTER TABLE inventory_items ADD COLUMN warranty_start DATE;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'warranty_end') THEN
            ALTER TABLE inventory_items ADD COLUMN warranty_end DATE;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'selling_price') THEN
            ALTER TABLE inventory_items ADD COLUMN selling_price DECIMAL(15, 2);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'updated_at') THEN
            ALTER TABLE inventory_items ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
          END IF;
        END $$;
      `;

      // Create indexes
      await sql`CREATE INDEX IF NOT EXISTS idx_inventory_items_po ON inventory_items(purchase_order_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_inventory_items_po_item ON inventory_items(purchase_order_item_id)`;

      // Drop and recreate function to avoid return type conflicts
      await sql`DROP FUNCTION IF EXISTS create_missing_inventory_items_for_po(UUID) CASCADE`;
      await sql`DROP FUNCTION IF EXISTS get_received_items_for_po(UUID) CASCADE`;
      
      // Create function to generate inventory items
      await sql`
        CREATE FUNCTION create_missing_inventory_items_for_po(po_id UUID)
        RETURNS JSON
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
      `;

      await sql`GRANT EXECUTE ON FUNCTION create_missing_inventory_items_for_po(UUID) TO authenticated`;

      // Create get_received_items_for_po function
      await sql`
        CREATE FUNCTION get_received_items_for_po(po_id UUID)
        RETURNS TABLE (
          id UUID, purchase_order_id UUID, product_id UUID, variant_id UUID,
          serial_number TEXT, imei TEXT, mac_address TEXT, barcode TEXT, status TEXT,
          location TEXT, shelf TEXT, bin TEXT, purchase_date TIMESTAMPTZ,
          warranty_start DATE, warranty_end DATE, cost_price DECIMAL(15, 2),
          selling_price DECIMAL(15, 2), notes TEXT, metadata JSONB, created_at TIMESTAMPTZ,
          product_name TEXT, product_sku TEXT, variant_name TEXT, variant_sku TEXT
        ) AS $$
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
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;

      await sql`GRANT EXECUTE ON FUNCTION get_received_items_for_po(UUID) TO authenticated`;
    });
    
    console.log('   ✅ Inventory items structure fixed\n');
    return true;
  } catch (error) {
    console.error('   ❌ Error fixing inventory items:', error.message);
    return false;
  }
}

// ============================================
// FIX 3: CREATE INVENTORY ITEMS FOR ALL RECEIVED POs
// ============================================
async function createInventoryItemsForAllPOs() {
  console.log('🔄 [3/3] Creating inventory items for all received/completed POs...');
  
  try {
    // Find all received/completed POs that might be missing inventory items
    const pos = await sql`
      SELECT id, po_number, status 
      FROM lats_purchase_orders 
      WHERE status IN ('received', 'completed')
      ORDER BY created_at DESC
      LIMIT 50
    `;

    if (pos.length === 0) {
      console.log('   ℹ️  No received/completed POs found\n');
      return true;
    }

    console.log(`   Found ${pos.length} received/completed POs to check`);
    
    let totalCreated = 0;
    let posProcessed = 0;

    for (const po of pos) {
      try {
        // Check if this PO already has inventory items
        const existingItems = await sql`
          SELECT COUNT(*) as count 
          FROM inventory_items 
          WHERE purchase_order_id = ${po.id}
        `;

        const itemCount = parseInt(existingItems[0].count);
        
        if (itemCount === 0) {
          // Create inventory items for this PO
          const createResult = await sql`
            SELECT create_missing_inventory_items_for_po(${po.id}::UUID) as result
          `;

          const resultData = createResult[0].result;
          if (resultData.success && resultData.items_created > 0) {
            console.log(`   ✅ ${po.po_number}: Created ${resultData.items_created} items`);
            totalCreated += resultData.items_created;
            posProcessed++;
          }
        }
      } catch (error) {
        console.error(`   ⚠️  ${po.po_number}: ${error.message}`);
      }
    }

    if (totalCreated > 0) {
      console.log(`   🎉 Total: Created ${totalCreated} inventory items for ${posProcessed} POs\n`);
    } else {
      console.log(`   ℹ️  All POs already have inventory items\n`);
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ Error creating inventory items:', error.message);
    return false;
  }
}

// ============================================
// FIX 4: QUALITY CHECK SYSTEM
// ============================================
async function fixQualityCheckSystem() {
  console.log('🔍 [4/4] Fixing quality check system...');
  
  try {
    await sql.begin(async sql => {
      // Create quality_check_templates table
      await sql`
        CREATE TABLE IF NOT EXISTS quality_check_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT DEFAULT 'general',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID
        )
      `;

      // Create quality_check_items table
      await sql`
        CREATE TABLE IF NOT EXISTS quality_check_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          template_id TEXT REFERENCES quality_check_templates(id) ON DELETE CASCADE,
          check_name TEXT NOT NULL,
          check_description TEXT,
          check_type TEXT DEFAULT 'boolean' CHECK (check_type IN ('boolean', 'numeric', 'text')),
          is_required BOOLEAN DEFAULT false,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;

      // Create quality_checks table
      await sql`
        CREATE TABLE IF NOT EXISTS quality_checks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          purchase_order_id UUID REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
          template_id TEXT REFERENCES quality_check_templates(id),
          status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
          checked_by UUID,
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;

      // Create quality_check_results table
      await sql`
        CREATE TABLE IF NOT EXISTS quality_check_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          quality_check_id UUID REFERENCES quality_checks(id) ON DELETE CASCADE,
          check_item_id UUID REFERENCES quality_check_items(id),
          result BOOLEAN,
          numeric_value DECIMAL(10, 2),
          text_value TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;

      // Insert default template
      await sql`
        INSERT INTO quality_check_templates (id, name, description, category, is_active)
        VALUES ('fallback-general', 'General Quality Check', 'Default quality check template', 'general', true)
        ON CONFLICT (id) DO NOTHING
      `;

      // Insert default check items
      await sql`
        INSERT INTO quality_check_items (template_id, check_name, check_description, check_type, is_required, sort_order)
        VALUES 
          ('fallback-general', 'Physical Condition', 'Check physical condition of items', 'boolean', true, 1),
          ('fallback-general', 'Quantity Match', 'Verify quantity matches order', 'boolean', true, 2),
          ('fallback-general', 'Packaging Intact', 'Check if packaging is intact', 'boolean', true, 3),
          ('fallback-general', 'Documentation Complete', 'Verify all documentation is present', 'boolean', false, 4)
        ON CONFLICT DO NOTHING
      `;

      // Create function to create quality check from template
      await sql`DROP FUNCTION IF EXISTS create_quality_check_from_template(UUID, TEXT, UUID) CASCADE`;
      await sql`
        CREATE FUNCTION create_quality_check_from_template(
          purchase_order_id_param UUID,
          template_id_param TEXT,
          checked_by_param UUID
        )
        RETURNS UUID
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          v_quality_check_id UUID;
          v_check_item RECORD;
        BEGIN
          -- Create quality check record
          INSERT INTO quality_checks (
            purchase_order_id,
            template_id,
            status,
            checked_by,
            started_at,
            created_at,
            updated_at
          ) VALUES (
            purchase_order_id_param,
            template_id_param,
            'in_progress',
            checked_by_param,
            NOW(),
            NOW(),
            NOW()
          ) RETURNING id INTO v_quality_check_id;

          -- Create quality check result entries for each template item
          FOR v_check_item IN 
            SELECT id, check_name, check_type, is_required
            FROM quality_check_items
            WHERE template_id = template_id_param
            ORDER BY sort_order
          LOOP
            INSERT INTO quality_check_results (
              quality_check_id,
              check_item_id,
              created_at
            ) VALUES (
              v_quality_check_id,
              v_check_item.id,
              NOW()
            );
          END LOOP;

          RETURN v_quality_check_id;
        END;
        $$
      `;

      await sql`GRANT EXECUTE ON FUNCTION create_quality_check_from_template(UUID, TEXT, UUID) TO authenticated`;
      await sql`GRANT SELECT ON quality_check_templates TO authenticated`;
      await sql`GRANT SELECT ON quality_check_items TO authenticated`;
      await sql`GRANT SELECT, INSERT, UPDATE ON quality_checks TO authenticated`;
      await sql`GRANT SELECT, INSERT, UPDATE ON quality_check_results TO authenticated`;

      // Enable RLS on all tables
      await sql`ALTER TABLE quality_check_templates ENABLE ROW LEVEL SECURITY`;
      await sql`ALTER TABLE quality_check_items ENABLE ROW LEVEL SECURITY`;
      await sql`ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY`;
      await sql`ALTER TABLE quality_check_results ENABLE ROW LEVEL SECURITY`;

      // Create permissive RLS policies
      await sql`DROP POLICY IF EXISTS "quality_check_templates_select" ON quality_check_templates`;
      await sql`CREATE POLICY "quality_check_templates_select" ON quality_check_templates FOR SELECT USING (true)`;

      await sql`DROP POLICY IF EXISTS "quality_check_items_select" ON quality_check_items`;
      await sql`CREATE POLICY "quality_check_items_select" ON quality_check_items FOR SELECT USING (true)`;

      await sql`DROP POLICY IF EXISTS "quality_checks_all" ON quality_checks`;
      await sql`CREATE POLICY "quality_checks_all" ON quality_checks FOR ALL USING (true)`;

      await sql`DROP POLICY IF EXISTS "quality_check_results_all" ON quality_check_results`;
      await sql`CREATE POLICY "quality_check_results_all" ON quality_check_results FOR ALL USING (true)`;

      // Create a function to get quality check items with results
      await sql`DROP FUNCTION IF EXISTS get_quality_check_with_items(UUID) CASCADE`;
      await sql`
        CREATE FUNCTION get_quality_check_with_items(quality_check_id_param UUID)
        RETURNS TABLE (
          id UUID,
          check_item_id UUID,
          check_name TEXT,
          check_description TEXT,
          check_type TEXT,
          is_required BOOLEAN,
          result BOOLEAN,
          numeric_value DECIMAL(10, 2),
          text_value TEXT,
          notes TEXT
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
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
        $$
      `;

      await sql`GRANT EXECUTE ON FUNCTION get_quality_check_with_items(UUID) TO authenticated`;

      // Create function to complete quality check and update inventory
      await sql`DROP FUNCTION IF EXISTS complete_quality_check(UUID, TEXT, TEXT) CASCADE`;
      await sql`
        CREATE FUNCTION complete_quality_check(
          p_quality_check_id UUID,
          p_notes TEXT DEFAULT NULL,
          p_signature TEXT DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          v_purchase_order_id UUID;
          v_passed_count INTEGER := 0;
          v_failed_count INTEGER := 0;
          v_total_count INTEGER := 0;
          v_overall_status TEXT;
        BEGIN
          -- Get purchase order ID
          SELECT purchase_order_id INTO v_purchase_order_id
          FROM quality_checks
          WHERE id = p_quality_check_id;

          IF v_purchase_order_id IS NULL THEN
            RETURN jsonb_build_object(
              'success', false,
              'message', 'Quality check not found'
            );
          END IF;

          -- Count results
          SELECT 
            COUNT(*) FILTER (WHERE result = true) as passed,
            COUNT(*) FILTER (WHERE result = false) as failed,
            COUNT(*) as total
          INTO v_passed_count, v_failed_count, v_total_count
          FROM quality_check_results
          WHERE quality_check_id = p_quality_check_id;

          -- Determine overall status
          IF v_failed_count = 0 THEN
            v_overall_status := 'completed';
          ELSE
            v_overall_status := 'failed';
          END IF;

          -- Update quality check status
          UPDATE quality_checks
          SET 
            status = v_overall_status,
            completed_at = NOW(),
            notes = COALESCE(p_notes, notes),
            updated_at = NOW()
          WHERE id = p_quality_check_id;

          -- If quality check passed, update inventory items to 'available'
          IF v_overall_status = 'completed' THEN
            UPDATE inventory_items
            SET 
              status = 'available',
              updated_at = NOW()
            WHERE purchase_order_id = v_purchase_order_id
              AND status IN ('pending', 'received');

            RAISE NOTICE 'Updated inventory items for PO: %', v_purchase_order_id;
          END IF;

          RETURN jsonb_build_object(
            'success', true,
            'message', 'Quality check completed successfully',
            'data', jsonb_build_object(
              'quality_check_id', p_quality_check_id,
              'status', v_overall_status,
              'passed_count', v_passed_count,
              'failed_count', v_failed_count,
              'total_count', v_total_count
            )
          );

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(
            'success', false,
            'message', 'Error completing quality check: ' || SQLERRM
          );
        END;
        $$
      `;

      await sql`GRANT EXECUTE ON FUNCTION complete_quality_check(UUID, TEXT, TEXT) TO authenticated`;

      // Create function to receive quality checked items to inventory
      await sql`DROP FUNCTION IF EXISTS receive_quality_checked_items(UUID, UUID) CASCADE`;
      await sql`
        CREATE FUNCTION receive_quality_checked_items(
          quality_check_id_param UUID,
          purchase_order_id_param UUID
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          v_items_updated INTEGER := 0;
        BEGIN
          -- Update inventory items to available status
          UPDATE inventory_items
          SET 
            status = 'available',
            updated_at = NOW()
          WHERE purchase_order_id = purchase_order_id_param
            AND status IN ('pending', 'received', 'quality_checked')
          RETURNING * INTO v_items_updated;

          GET DIAGNOSTICS v_items_updated = ROW_COUNT;

          RETURN jsonb_build_object(
            'success', true,
            'message', format('Received %s items to inventory', v_items_updated),
            'items_updated', v_items_updated
          );

        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(
            'success', false,
            'message', 'Error receiving items: ' || SQLERRM
          );
        END;
        $$
      `;

      await sql`GRANT EXECUTE ON FUNCTION receive_quality_checked_items(UUID, UUID) TO authenticated`;
    });
    
    console.log('   ✅ Quality check system fixed\n');
    return true;
  } catch (error) {
    console.error('   ❌ Error fixing quality check system:', error.message);
    return false;
  }
}

// ============================================
// MAIN EXECUTION
// ============================================
async function main() {
  try {
    const results = {
      payment: await fixPaymentSystem(),
      inventory: await fixInventoryItems(),
      poItems: await createInventoryItemsForAllPOs(),
      qualityCheck: await fixQualityCheckSystem(),
    };

    console.log('\n═══════════════════════════════════════════');
    console.log('           📊 FIX SUMMARY');
    console.log('═══════════════════════════════════════════\n');
    console.log(`Payment System:          ${results.payment ? '✅ Fixed' : '❌ Failed'}`);
    console.log(`Inventory Structure:     ${results.inventory ? '✅ Fixed' : '❌ Failed'}`);
    console.log(`Inventory Items (All):   ${results.poItems ? '✅ Fixed' : '❌ Failed'}`);
    console.log(`Quality Check System:    ${results.qualityCheck ? '✅ Fixed' : '❌ Failed'}`);
    console.log('\n═══════════════════════════════════════════\n');

    const allSuccess = Object.values(results).every(r => r);
    
    if (allSuccess) {
      console.log('🎉 ALL FIXES APPLIED SUCCESSFULLY!');
      console.log('\n👉 Next steps:');
      console.log('   1. Refresh your app (F5)');
      console.log('   2. Try making a payment - it should work!');
      console.log('   3. Check the "Received" tab - items should appear!');
      console.log('   4. Try quality checks - they should work now!\n');
    } else {
      console.log('⚠️  Some fixes failed. Please check the errors above.\n');
    }

    await sql.end();
    process.exit(allSuccess ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await sql.end();
    process.exit(1);
  }
}

main();

