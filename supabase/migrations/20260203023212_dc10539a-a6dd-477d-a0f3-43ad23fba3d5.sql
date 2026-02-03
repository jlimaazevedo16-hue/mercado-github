-- Tabela para controlar versões do sistema
CREATE TABLE public.sistema_versoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    versao VARCHAR(20) NOT NULL,
    descricao TEXT,
    changelog TEXT,
    data_lancamento TIMESTAMP WITH TIME ZONE DEFAULT now(),
    aplicado_em TIMESTAMP WITH TIME ZONE,
    aplicado_por UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir versão inicial
INSERT INTO public.sistema_versoes (versao, descricao, status, aplicado_em)
VALUES ('1.0.0', 'Versão inicial do sistema', 'aplicado', now());

-- Atualizar tabela sistema_setup com campo de versão atual
ALTER TABLE public.sistema_setup 
ADD COLUMN IF NOT EXISTS versao_atual VARCHAR(20) DEFAULT '1.0.0';

-- Enable RLS
ALTER TABLE public.sistema_versoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas masters podem gerenciar
CREATE POLICY "Masters podem ver versões"
ON public.sistema_versoes
FOR SELECT
TO authenticated
USING (public.is_admin_master(auth.uid()));

CREATE POLICY "Masters podem inserir versões"
ON public.sistema_versoes
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()));

CREATE POLICY "Masters podem atualizar versões"
ON public.sistema_versoes
FOR UPDATE
TO authenticated
USING (public.is_admin_master(auth.uid()));

-- Função para obter versão atual
CREATE OR REPLACE FUNCTION public.get_current_version()
RETURNS VARCHAR(20)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT versao_atual FROM public.sistema_setup LIMIT 1),
    '1.0.0'
  )
$$;