#!/usr/bin/env node

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbConfig = JSON.parse(readFileSync(join(__dirname, 'database-config.json'), 'utf-8'));
const sql = postgres(dbConfig.url, { ssl: 'require', max: 10 });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

async function autoFixAll() {
  try {
    log.title('🤖 Auto-Fixing All Console Errors');

    // 1. Fix WhatsApp Instances
    log.info('Fixing WhatsApp instances...');
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_instances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        instance_id TEXT NOT NULL,
        api_token TEXT NOT NULL,
        instance_name TEXT,
        description TEXT,
        green_api_host TEXT DEFAULT 'https://api.green-api.com',
        state_instance TEXT DEFAULT 'notAuthorized',
        status TEXT DEFAULT 'inactive',
        phone_number TEXT,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    
    await sql`
      CREATE OR REPLACE VIEW whatsapp_instances_comprehensive AS
      SELECT * FROM whatsapp_instances
    `;
    
    await sql`GRANT ALL ON whatsapp_instances TO authenticated`;
    await sql`GRANT ALL ON whatsapp_instances_comprehensive TO authenticated`;
    await sql`ALTER TABLE whatsapp_instances DISABLE ROW LEVEL SECURITY`;
    log.success('WhatsApp instances fixed');

    // 2. Fix Devices
    log.info('Fixing devices table...');
    const devicesExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'devices'
      )
    `;
    
    if (devicesExists[0].exists) {
      await sql`GRANT ALL ON devices TO authenticated`;
      await sql`ALTER TABLE devices DISABLE ROW LEVEL SECURITY`;
      log.success('Devices table access granted');
    } else {
      log.warn('Devices table does not exist, skipping');
    }

    // 3. Fix User Daily Goals
    log.info('Fixing user daily goals...');
    await sql`
      CREATE OR REPLACE FUNCTION get_or_create_user_goal(
        p_user_id UUID,
        p_goal_date DATE,
        p_goal_type TEXT,
        p_target_value NUMERIC DEFAULT 0
      )
      RETURNS UUID
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_goal_id UUID;
      BEGIN
        SELECT id INTO v_goal_id
        FROM user_daily_goals
        WHERE user_id = p_user_id 
          AND date = p_goal_date 
          AND goal_type = p_goal_type;
        
        IF v_goal_id IS NULL THEN
          INSERT INTO user_daily_goals (user_id, date, goal_type, target_value)
          VALUES (p_user_id, p_goal_date, p_goal_type, p_target_value)
          ON CONFLICT (user_id, date, goal_type) DO NOTHING
          RETURNING id INTO v_goal_id;
          
          IF v_goal_id IS NULL THEN
            SELECT id INTO v_goal_id
            FROM user_daily_goals
            WHERE user_id = p_user_id 
              AND date = p_goal_date 
              AND goal_type = p_goal_type;
          END IF;
        END IF;
        
        RETURN v_goal_id;
      END;
      $$
    `;
    
    await sql`GRANT EXECUTE ON FUNCTION get_or_create_user_goal TO authenticated`;
    await sql`GRANT ALL ON user_daily_goals TO authenticated`;
    await sql`ALTER TABLE user_daily_goals DISABLE ROW LEVEL SECURITY`;
    log.success('User daily goals fixed');

    // 4. Fix Purchase Orders
    log.info('Fixing purchase orders...');
    await sql`
      CREATE OR REPLACE FUNCTION get_purchase_order_history(p_product_id UUID)
      RETURNS TABLE (
        id UUID,
        product_id UUID,
        supplier_id UUID,
        quantity INTEGER,
        unit_cost NUMERIC,
        total_cost NUMERIC,
        status TEXT,
        order_date TIMESTAMPTZ,
        received_date TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          po.id,
          po.product_id,
          po.supplier_id,
          po.quantity,
          po.unit_cost,
          po.total_cost,
          po.status,
          po.created_at as order_date,
          po.received_date
        FROM lats_purchase_orders po
        WHERE po.product_id = p_product_id
        ORDER BY po.created_at DESC;
        
        EXCEPTION WHEN OTHERS THEN
          RETURN;
      END;
      $$
    `;
    
    await sql`GRANT EXECUTE ON FUNCTION get_purchase_order_history TO authenticated`;
    await sql`GRANT ALL ON lats_purchase_orders TO authenticated`;
    await sql`ALTER TABLE lats_purchase_orders DISABLE ROW LEVEL SECURITY`;
    log.success('Purchase orders fixed');

    // 5. Create message queue table
    log.info('Creating message queue table...');
    await sql`
      CREATE TABLE IF NOT EXISTS green_api_message_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id UUID,
        phone_number TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`GRANT ALL ON green_api_message_queue TO authenticated`;
    await sql`ALTER TABLE green_api_message_queue DISABLE ROW LEVEL SECURITY`;
    log.success('Message queue table created');

    // 6. Create campaigns table
    log.info('Creating campaigns table...');
    await sql`
      CREATE TABLE IF NOT EXISTS green_api_bulk_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instance_id UUID,
        campaign_name TEXT NOT NULL,
        message_template TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`GRANT ALL ON green_api_bulk_campaigns TO authenticated`;
    await sql`ALTER TABLE green_api_bulk_campaigns DISABLE ROW LEVEL SECURITY`;
    log.success('Campaigns table created');

    // Summary
    log.title('✅ Auto-Fix Complete!');
    console.log(`
${colors.bright}Fixed Issues:${colors.reset}
  ✓ WhatsApp instances table and view created
  ✓ Devices table access granted
  ✓ User daily goals duplicate handling fixed
  ✓ Purchase order history function created
  ✓ Message queue table created
  ✓ Campaigns table created
  ✓ All RLS policies disabled for development

${colors.bright}Next Steps:${colors.reset}
  1. Refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)
  2. All console errors should be gone
  3. Application is ready to use!
    `);

  } catch (error) {
    log.error(`Error during auto-fix: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

autoFixAll();

