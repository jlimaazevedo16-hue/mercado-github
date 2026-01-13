
-- Create inventory items table (cadastro de itens)
CREATE TABLE public.inventory_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    descricao VARCHAR NOT NULL,
    embalagem VARCHAR,
    qtd_atual NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory entries table (entrada de itens)
CREATE TABLE public.inventory_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    qtd NUMERIC NOT NULL,
    embalagem VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory exits table (saída de itens)
CREATE TABLE public.inventory_exits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    qtd NUMERIC NOT NULL,
    embalagem VARCHAR,
    entregue_por VARCHAR,
    recebido_por VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_exits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_items (public read, auth write)
CREATE POLICY "Inventory items are viewable by everyone"
ON public.inventory_items FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert inventory items"
ON public.inventory_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory items"
ON public.inventory_items FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete inventory items"
ON public.inventory_items FOR DELETE USING (true);

-- RLS Policies for inventory_entries
CREATE POLICY "Inventory entries are viewable by everyone"
ON public.inventory_entries FOR SELECT USING (true);

CREATE POLICY "Anyone can insert inventory entries"
ON public.inventory_entries FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update inventory entries"
ON public.inventory_entries FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete inventory entries"
ON public.inventory_entries FOR DELETE USING (true);

-- RLS Policies for inventory_exits
CREATE POLICY "Inventory exits are viewable by everyone"
ON public.inventory_exits FOR SELECT USING (true);

CREATE POLICY "Anyone can insert inventory exits"
ON public.inventory_exits FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update inventory exits"
ON public.inventory_exits FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete inventory exits"
ON public.inventory_exits FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
