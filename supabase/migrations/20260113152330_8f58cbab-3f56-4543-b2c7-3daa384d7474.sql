-- Add minimum stock column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN estoque_minimo NUMERIC DEFAULT 0;