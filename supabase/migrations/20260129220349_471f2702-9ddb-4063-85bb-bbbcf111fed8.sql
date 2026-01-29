-- Criar tabela de histórico de UFMS com controle de vigência
CREATE TABLE public.ufms_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ufms_valor NUMERIC NOT NULL,
  fator_condominio NUMERIC NOT NULL,
  fator_aluguel NUMERIC NOT NULL,
  data_inicio_vigencia TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_fim_vigencia TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ufms_historico ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Admins can view UFMS history"
ON public.ufms_historico
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador', 'administrador_master')
  )
);

CREATE POLICY "Admins can insert UFMS history"
ON public.ufms_historico
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador', 'administrador_master')
  )
);

CREATE POLICY "Admins can update UFMS history"
ON public.ufms_historico
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador', 'administrador_master')
  )
);

-- Inserir registro inicial com os valores atuais
INSERT INTO public.ufms_historico (ufms_valor, fator_condominio, fator_aluguel, data_inicio_vigencia)
SELECT 
  (SELECT valor FROM configuracoes_administrativas WHERE chave = 'ufms_valor'),
  (SELECT valor FROM configuracoes_administrativas WHERE chave = 'fator_condominio'),
  (SELECT valor FROM configuracoes_administrativas WHERE chave = 'fator_aluguel'),
  now();