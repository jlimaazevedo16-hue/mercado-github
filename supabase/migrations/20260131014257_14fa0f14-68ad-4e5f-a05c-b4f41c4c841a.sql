-- Add verification fields to responsaveis table
ALTER TABLE public.responsaveis
ADD COLUMN IF NOT EXISTS verificacao_status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS verificacao_data TIMESTAMP WITH TIME ZONE;

-- Create table for verification tokens (temporary secure links)
CREATE TABLE public.verificacao_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  responsavel_id UUID NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('confirmar', 'corrigir')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  usado BOOLEAN DEFAULT false,
  usado_em TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create table for verification history
CREATE TABLE public.verificacao_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  responsavel_id UUID NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
  acao TEXT NOT NULL CHECK (acao IN ('email_enviado', 'confirmado', 'correcao_solicitada', 'dados_atualizados')),
  detalhes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create indexes for performance
CREATE INDEX idx_verificacao_tokens_token ON public.verificacao_tokens(token);
CREATE INDEX idx_verificacao_tokens_responsavel ON public.verificacao_tokens(responsavel_id);
CREATE INDEX idx_verificacao_tokens_expires ON public.verificacao_tokens(expires_at);
CREATE INDEX idx_verificacao_historico_responsavel ON public.verificacao_historico(responsavel_id);
CREATE INDEX idx_verificacao_historico_created ON public.verificacao_historico(created_at DESC);

-- Enable RLS
ALTER TABLE public.verificacao_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verificacao_historico ENABLE ROW LEVEL SECURITY;

-- RLS policies for verificacao_tokens
-- Admins can view and manage tokens
CREATE POLICY "Admins can view verification tokens"
ON public.verificacao_tokens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

CREATE POLICY "Admins can create verification tokens"
ON public.verificacao_tokens
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

CREATE POLICY "Admins can update verification tokens"
ON public.verificacao_tokens
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

-- RLS policies for verificacao_historico
CREATE POLICY "Admins can view verification history"
ON public.verificacao_historico
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

CREATE POLICY "Admins can create verification history"
ON public.verificacao_historico
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

-- Service role can manage tokens (for edge function)
CREATE POLICY "Service role can manage tokens"
ON public.verificacao_tokens
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage history"
ON public.verificacao_historico
FOR ALL
USING (auth.role() = 'service_role');