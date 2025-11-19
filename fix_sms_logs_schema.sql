-- Add customer_id column to sms_logs table
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS customer_id uuid;

-- Add foreign key constraint to link to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sms_logs_customer_fkey'
  ) THEN
    ALTER TABLE public.sms_logs
      ADD CONSTRAINT sms_logs_customer_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_customer_id ON public.sms_logs(customer_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sms_logs' AND column_name = 'customer_id';
