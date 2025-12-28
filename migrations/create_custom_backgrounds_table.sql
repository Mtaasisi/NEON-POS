-- Create custom_backgrounds table for storing uploaded background images
-- This allows images to be shared across devices and users

CREATE TABLE IF NOT EXISTS public.custom_backgrounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.store_locations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Supabase storage path
    public_url TEXT NOT NULL, -- Public URL for the image
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_backgrounds_branch_id ON public.custom_backgrounds(branch_id);
CREATE INDEX IF NOT EXISTS idx_custom_backgrounds_user_id ON public.custom_backgrounds(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_backgrounds_is_active ON public.custom_backgrounds(is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE public.custom_backgrounds ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can see backgrounds from branches they have access to
CREATE POLICY "Users can view custom backgrounds from accessible branches" ON public.custom_backgrounds
    FOR SELECT USING (
        branch_id IS NULL OR
        branch_id IN (
            SELECT sl.id FROM public.store_locations sl
            WHERE sl.id IN (
                SELECT ba.branch_id FROM public.branch_assignments ba
                WHERE ba.user_id = auth.uid()
            )
        )
    );

-- Users can insert backgrounds for branches they have access to
CREATE POLICY "Users can insert custom backgrounds for accessible branches" ON public.custom_backgrounds
    FOR INSERT WITH CHECK (
        (branch_id IS NULL OR branch_id IN (
            SELECT sl.id FROM public.store_locations sl
            WHERE sl.id IN (
                SELECT ba.branch_id FROM public.branch_assignments ba
                WHERE ba.user_id = auth.uid()
            )
        )) AND
        user_id = auth.uid()
    );

-- Users can update their own backgrounds
CREATE POLICY "Users can update their own custom backgrounds" ON public.custom_backgrounds
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own backgrounds
CREATE POLICY "Users can delete their own custom backgrounds" ON public.custom_backgrounds
    FOR DELETE USING (user_id = auth.uid());

-- Create function to get custom backgrounds for a branch
CREATE OR REPLACE FUNCTION get_custom_backgrounds_for_branch(branch_uuid UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    filename TEXT,
    original_name TEXT,
    public_url TEXT,
    file_size INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cb.id,
        cb.filename,
        cb.original_name,
        cb.public_url,
        cb.file_size,
        cb.created_at
    FROM public.custom_backgrounds cb
    WHERE cb.is_active = true
    AND (
        cb.branch_id = branch_uuid OR
        (branch_uuid IS NULL AND cb.branch_id IS NULL)
    )
    ORDER BY cb.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_custom_backgrounds_for_branch(UUID) TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_backgrounds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_backgrounds_updated_at_trigger
    BEFORE UPDATE ON public.custom_backgrounds
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_backgrounds_updated_at();

