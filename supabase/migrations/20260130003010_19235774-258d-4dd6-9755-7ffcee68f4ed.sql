-- Add institutional configuration fields
INSERT INTO public.configuracoes_administrativas (chave, valor, descricao, unidade)
VALUES 
  ('instituicao_nome', 0, 'Nome completo da Associação', 'texto'),
  ('instituicao_cnpj', 0, 'CNPJ da Associação', 'texto'),
  ('instituicao_endereco', 0, 'Endereço completo da Associação', 'texto'),
  ('instituicao_cidade', 0, 'Cidade/UF da Associação', 'texto'),
  ('instituicao_telefone', 0, 'Telefone de contato', 'texto'),
  ('sistema_nome', 0, 'Nome do sistema para relatórios', 'texto'),
  ('rodape_texto', 0, 'Texto institucional para rodapé dos relatórios', 'texto')
ON CONFLICT (chave) DO NOTHING;

-- Create export_logs table for audit
CREATE TABLE IF NOT EXISTS public.export_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  modulo VARCHAR(100) NOT NULL,
  tipo_relatorio VARCHAR(50) NOT NULL,
  formato VARCHAR(10) NOT NULL,
  filtros_aplicados JSONB,
  total_registros INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;

-- Policies for export_logs
CREATE POLICY "Users can insert their own export logs"
ON public.export_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all export logs"
ON public.export_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

CREATE POLICY "Users can view their own export logs"
ON public.export_logs
FOR SELECT
USING (auth.uid() = user_id);