-- =============================================
-- MÓDULO DE RECEITAS OPERACIONAIS
-- =============================================

-- Tabela: tipos_receita (cadastro de tipos de receita)
CREATE TABLE public.tipos_receita (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL DEFAULT 'Operacional',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar alguns tipos padrão
INSERT INTO public.tipos_receita (nome, categoria) VALUES
  ('Uso de Banheiro', 'Operacional'),
  ('Multa', 'Administrativa'),
  ('Evento', 'Operacional'),
  ('Taxa Extra', 'Administrativa'),
  ('Outros', 'Operacional');

-- Tabela: receitas_operacionais (registros de receitas)
CREATE TABLE public.receitas_operacionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_referencia DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_receita_id UUID NOT NULL REFERENCES public.tipos_receita(id) ON DELETE RESTRICT,
  descricao TEXT,
  valor_bruto NUMERIC(10,2) NOT NULL,
  forma_pagamento VARCHAR(20) NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'pix', 'transferencia', 'cartao', 'outro')),
  origem_caixa VARCHAR(100),
  responsavel_lancamento UUID REFERENCES auth.users(id),
  observacoes TEXT,
  comprovante_url TEXT,
  data_fechamento DATE,
  bloqueado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: logs_receitas_operacionais (auditoria)
CREATE TABLE public.logs_receitas_operacionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receita_operacional_id UUID NOT NULL REFERENCES public.receitas_operacionais(id) ON DELETE CASCADE,
  acao VARCHAR(20) NOT NULL CHECK (acao IN ('criacao', 'edicao', 'bloqueio', 'ajuste')),
  usuario_id UUID REFERENCES auth.users(id),
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dados_anteriores JSONB,
  dados_novos JSONB
);

-- Índices para performance
CREATE INDEX idx_receitas_operacionais_data ON public.receitas_operacionais(data_referencia DESC);
CREATE INDEX idx_receitas_operacionais_tipo ON public.receitas_operacionais(tipo_receita_id);
CREATE INDEX idx_receitas_operacionais_responsavel ON public.receitas_operacionais(responsavel_lancamento);
CREATE INDEX idx_logs_receitas_receita_id ON public.logs_receitas_operacionais(receita_operacional_id);

-- Trigger para updated_at
CREATE TRIGGER update_receitas_operacionais_updated_at
BEFORE UPDATE ON public.receitas_operacionais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

-- tipos_receita
ALTER TABLE public.tipos_receita ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tipos de receita visíveis para autenticados"
ON public.tipos_receita FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem gerenciar tipos de receita"
ON public.tipos_receita FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrador', 'administrador_master')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrador', 'administrador_master')
  )
);

-- receitas_operacionais
ALTER TABLE public.receitas_operacionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receitas operacionais visíveis para autenticados"
ON public.receitas_operacionais FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar receitas operacionais"
ON public.receitas_operacionais FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem editar receitas não bloqueadas"
ON public.receitas_operacionais FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND (
    bloqueado = false 
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('administrador', 'administrador_master')
    )
  )
);

-- Proibir exclusão de receitas
-- (não criamos policy DELETE - isso impede qualquer deleção)

-- logs_receitas_operacionais
ALTER TABLE public.logs_receitas_operacionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logs visíveis apenas para admins"
ON public.logs_receitas_operacionais FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrador', 'administrador_master')
  )
);

CREATE POLICY "Sistema pode inserir logs"
ON public.logs_receitas_operacionais FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Logs não podem ser editados nem excluídos (sem policies UPDATE/DELETE)