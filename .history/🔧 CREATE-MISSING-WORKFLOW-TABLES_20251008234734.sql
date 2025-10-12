-- ============================================================================
-- CREATE MISSING TABLES FOR DEVICE STATUS WORKFLOW
-- ============================================================================

-- 1. Create repair_parts table
CREATE TABLE IF NOT EXISTS repair_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  spare_part_id UUID,
  quantity_needed INTEGER DEFAULT 1,
  quantity_received INTEGER DEFAULT 0,
  cost_per_unit NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'needed',
  notes TEXT,
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create diagnostic_problem_templates table
CREATE TABLE IF NOT EXISTS diagnostic_problem_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_name TEXT NOT NULL,
  problem_description TEXT,
  suggested_solutions JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add diagnostic_checklist column to devices
ALTER TABLE devices ADD COLUMN IF NOT EXISTS diagnostic_checklist JSONB;

-- 4. Create or fix diagnostic_checks table
CREATE TABLE IF NOT EXISTS diagnostic_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  check_name TEXT,
  check_result TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Insert sample diagnostic templates
INSERT INTO diagnostic_problem_templates (problem_name, problem_description, is_active, suggested_solutions)
VALUES 
  ('Screen Issue', 'Display problems, cracks, dead pixels, touch not responding', TRUE, '["Replace screen", "Check display connector", "Test digitizer"]'::jsonb),
  ('Battery Issue', 'Battery draining quickly, not charging, swollen battery', TRUE, '["Replace battery", "Check charging port", "Test charging circuit"]'::jsonb),
  ('Software Issue', 'OS problems, crashes, freezing, boot loops', TRUE, '["Factory reset", "Update software", "Restore from backup"]'::jsonb),
  ('Water Damage', 'Liquid exposure, corrosion, moisture detected', TRUE, '["Clean motherboard", "Replace damaged components", "Dry device thoroughly"]'::jsonb),
  ('Camera Issue', 'Camera not working, blurry images, focus problems', TRUE, '["Replace camera module", "Clean camera lens", "Update camera software"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Verify everything was created
SELECT 'repair_parts table' as created, count(*) as row_count FROM repair_parts
UNION ALL
SELECT 'diagnostic_problem_templates table', count(*) FROM diagnostic_problem_templates
UNION ALL
SELECT 'diagnostic_checks table', count(*) FROM diagnostic_checks;

