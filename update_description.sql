-- Update the description to use the correct supplier name
UPDATE account_transactions
SET description = 'PO Payment: PO-1763215226245 - CHINA'
WHERE id = '19aa10aa-83c8-4a23-bf2f-a01a5851a833';

-- Verify the update
SELECT id, description FROM account_transactions
WHERE id = '19aa10aa-83c8-4a23-bf2f-a01a5851a833';
