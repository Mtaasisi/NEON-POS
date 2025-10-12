#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('\n🔧 FIXING DIAGNOSTIC TEMPLATES SCHEMA\n');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // 1. Add checklist_items column
    console.log('→ Adding checklist_items column...');
    await sql`ALTER TABLE diagnostic_problem_templates ADD COLUMN IF NOT EXISTS checklist_items JSONB DEFAULT '[]'::jsonb`;
    console.log('✅ Column added\n');
    
    // 2. Update existing templates with checklist items
    console.log('→ Updating templates with checklist items...');
    
    await sql`
      UPDATE diagnostic_problem_templates 
      SET checklist_items = '[
        {"id": "1", "name": "Visual Inspection", "required": true, "completed": false},
        {"id": "2", "name": "Functional Test", "required": true, "completed": false},
        {"id": "3", "name": "Component Check", "required": false, "completed": false}
      ]'::jsonb
      WHERE problem_name = 'Screen Issue'
    `;
    
    await sql`
      UPDATE diagnostic_problem_templates 
      SET checklist_items = '[
        {"id": "1", "name": "Battery Health Test", "required": true, "completed": false},
        {"id": "2", "name": "Charging Test", "required": true, "completed": false},
        {"id": "3", "name": "Power Consumption Test", "required": false, "completed": false}
      ]'::jsonb
      WHERE problem_name = 'Battery Issue'
    `;
    
    await sql`
      UPDATE diagnostic_problem_templates 
      SET checklist_items = '[
        {"id": "1", "name": "Boot Test", "required": true, "completed": false},
        {"id": "2", "name": "System Stability", "required": true, "completed": false},
        {"id": "3", "name": "App Functionality", "required": false, "completed": false}
      ]'::jsonb
      WHERE problem_name = 'Software Issue'
    `;
    
    await sql`
      UPDATE diagnostic_problem_templates 
      SET checklist_items = '[
        {"id": "1", "name": "Moisture Detection", "required": true, "completed": false},
        {"id": "2", "name": "Corrosion Check", "required": true, "completed": false},
        {"id": "3", "name": "Component Damage Assessment", "required": true, "completed": false}
      ]'::jsonb
      WHERE problem_name = 'Water Damage'
    `;
    
    await sql`
      UPDATE diagnostic_problem_templates 
      SET checklist_items = '[
        {"id": "1", "name": "Camera Functionality", "required": true, "completed": false},
        {"id": "2", "name": "Focus Test", "required": true, "completed": false},
        {"id": "3", "name": "Image Quality Check", "required": false, "completed": false}
      ]'::jsonb
      WHERE problem_name = 'Camera Issue'
    `;
    
    console.log('✅ Templates updated with checklist items\n');
    
    // 3. Verify
    const templates = await sql`
      SELECT problem_name, checklist_items 
      FROM diagnostic_problem_templates 
      WHERE is_active = TRUE
    `;
    
    console.log('📋 Verification:');
    templates.forEach(t => {
      const items = typeof t.checklist_items === 'string' ? JSON.parse(t.checklist_items) : t.checklist_items;
      console.log(`   ✓ ${t.problem_name}: ${items.length} checklist items`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Diagnostic templates are now complete!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🎉 Refresh your browser and try the status workflow!\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();
