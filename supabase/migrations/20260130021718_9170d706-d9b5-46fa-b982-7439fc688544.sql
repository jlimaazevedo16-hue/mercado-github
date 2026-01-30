-- Create table to track system backups
CREATE TABLE public.system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    arquivo_url TEXT,
    tamanho_bytes BIGINT,
    tabelas_incluidas TEXT[],
    total_registros INTEGER,
    status VARCHAR(50) DEFAULT 'pendente',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

-- Only master admin can view backups
CREATE POLICY "Master admin can view backups"
ON public.system_backups
FOR SELECT
USING (public.is_admin_master(auth.uid()));

-- Only master admin can create backups
CREATE POLICY "Master admin can create backups"
ON public.system_backups
FOR INSERT
WITH CHECK (public.is_admin_master(auth.uid()));

-- Only master admin can update backups
CREATE POLICY "Master admin can update backups"
ON public.system_backups
FOR UPDATE
USING (public.is_admin_master(auth.uid()));

-- Only master admin can delete backups
CREATE POLICY "Master admin can delete backups"
ON public.system_backups
FOR DELETE
USING (public.is_admin_master(auth.uid()));

-- Create storage bucket for backups (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('system-backups', 'system-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for backups bucket
CREATE POLICY "Master admin can upload backups"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'system-backups' 
    AND public.is_admin_master(auth.uid())
);

CREATE POLICY "Master admin can read backups"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'system-backups' 
    AND public.is_admin_master(auth.uid())
);

CREATE POLICY "Master admin can delete backups"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'system-backups' 
    AND public.is_admin_master(auth.uid())
);