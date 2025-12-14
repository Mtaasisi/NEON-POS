-- Fix installments missing branch_id
-- This script will update existing installment plans to use the default branch

-- First, let's see how many installments are missing branch_id
-- SELECT COUNT(*) FROM customer_installment_plans WHERE branch_id IS NULL;

-- Get the default branch (usually the first branch or main branch)
-- You may need to replace this with your actual default branch ID

-- Option 1: Set all NULL branch_ids to the first available branch
UPDATE customer_installment_plans
SET branch_id = (
  SELECT id FROM branches ORDER BY created_at ASC LIMIT 1
)
WHERE branch_id IS NULL;

-- Option 2: If you know your default branch ID, use it directly
-- UPDATE customer_installment_plans
-- SET branch_id = 'your-branch-id-here'
-- WHERE branch_id IS NULL;

-- Verify the update
SELECT 
  COUNT(*) as total_plans,
  COUNT(branch_id) as plans_with_branch,
  COUNT(*) - COUNT(branch_id) as plans_without_branch
FROM customer_installment_plans;

