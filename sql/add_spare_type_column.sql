-- Add spare_type column to lats_spare_parts table
-- This replaces the category_id dependency with a direct text field

-- Add spare_type column if it doesn't exist
ALTER TABLE public.lats_spare_parts 
ADD COLUMN IF NOT EXISTS spare_type text;

-- Add comment
COMMENT ON COLUMN public.lats_spare_parts.spare_type IS 'Spare part type/category (e.g., Battery, LCD / Screen, Charging Port) - replaces category_id';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_lats_spare_parts_spare_type ON public.lats_spare_parts(spare_type);

-- Ensure branch_id column exists (for branch isolation)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_spare_parts' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE public.lats_spare_parts 
        ADD COLUMN branch_id uuid;
        
        COMMENT ON COLUMN public.lats_spare_parts.branch_id IS 'Branch ID for branch isolation';
        
        CREATE INDEX IF NOT EXISTS idx_lats_spare_parts_branch_id ON public.lats_spare_parts(branch_id);
    END IF;
END $$;
