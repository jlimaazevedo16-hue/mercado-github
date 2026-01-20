-- Step 2: Update user and add permissions (after enum values are committed)

-- Update the user jlimaazevedo16@gmail.com to administrador_master
UPDATE public.user_roles
SET role = 'administrador_master'
WHERE user_id = 'aaaf6f30-57b2-44fd-bc82-34d323f5385b';

-- Add all new permission keys for the complete permission matrix
INSERT INTO role_permissions (role, permission_key, can_view, can_edit) VALUES
-- administrador_master - full access
('administrador_master', 'dashboard', true, true),
('administrador_master', 'boxes', true, true),
('administrador_master', 'responsaveis', true, true),
('administrador_master', 'documentos', true, true),
('administrador_master', 'notificacoes', true, true),
('administrador_master', 'pads', true, true),
('administrador_master', 'pendencias', true, true),
('administrador_master', 'usuarios', true, true),
('administrador_master', 'almoxarifado', true, true),
('administrador_master', 'planta_baixa', true, true),
('administrador_master', 'relatorios', true, true),
('administrador_master', 'frequencia', true, true),
('administrador_master', 'configuracoes', true, true),
('administrador_master', 'observatorio', true, true),
('administrador_master', 'financeiro', true, true),
-- administrador (add missing keys)
('administrador', 'pads', true, true),
('administrador', 'relatorios', true, true),
('administrador', 'financeiro', true, true),
('administrador', 'observatorio', true, true),
-- fiscal permissions
('fiscal', 'pads', true, true),
('fiscal', 'relatorios', true, false),
('fiscal', 'financeiro', true, false),
('fiscal', 'observatorio', true, true),
-- funcionario permissions
('funcionario', 'pads', true, false),
('funcionario', 'relatorios', true, false),
('funcionario', 'financeiro', false, false),
('funcionario', 'observatorio', true, false),
-- lojista (future - view only for specific areas)
('lojista', 'dashboard', true, false),
('lojista', 'boxes', true, false),
('lojista', 'documentos', true, false),
('lojista', 'notificacoes', true, false),
('lojista', 'pads', true, false)
ON CONFLICT DO NOTHING;

-- Create function to check if user is admin master (for full access)
CREATE OR REPLACE FUNCTION public.is_admin_master(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = 'administrador_master'
    )
$function$;

-- Create storage bucket for photos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for photos bucket
CREATE POLICY "Public photos are accessible to everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'photos' AND auth.role() = 'authenticated');