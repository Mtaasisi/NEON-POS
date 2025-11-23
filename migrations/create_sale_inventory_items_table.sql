-- Create sale_inventory_items table to link sales with inventory items (serial numbers)
-- This table tracks which specific inventory items (with serial numbers) were sold in each sale

CREATE TABLE IF NOT EXISTS public.sale_inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    inventory_item_id uuid NOT NULL,
    customer_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sale_inventory_items_pkey PRIMARY KEY (id),
    CONSTRAINT sale_inventory_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.lats_sales(id) ON DELETE CASCADE,
    CONSTRAINT sale_inventory_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    CONSTRAINT sale_inventory_items_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.lats_customers(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sale_inventory_items_sale_id ON public.sale_inventory_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_inventory_items_inventory_item_id ON public.sale_inventory_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_sale_inventory_items_customer_id ON public.sale_inventory_items(customer_id);

-- Add comment
COMMENT ON TABLE public.sale_inventory_items IS 'Links sales to specific inventory items (serial numbers) that were sold';

