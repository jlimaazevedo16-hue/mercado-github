-- Create table for email dispatch logs
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  destinatario TEXT NOT NULL,
  destinatario_nome TEXT,
  assunto TEXT NOT NULL,
  template TEXT,
  variaveis JSONB,
  status TEXT NOT NULL DEFAULT 'enviado',
  erro TEXT,
  resposta_api JSONB,
  responsavel_id UUID REFERENCES public.responsaveis(id) ON DELETE SET NULL,
  box_id UUID REFERENCES public.boxes(id) ON DELETE SET NULL,
  referencia_tipo TEXT,
  referencia_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create indexes for performance
CREATE INDEX idx_email_logs_tipo ON public.email_logs(tipo);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_destinatario ON public.email_logs(destinatario);
CREATE INDEX idx_email_logs_created ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_logs_responsavel ON public.email_logs(responsavel_id);
CREATE INDEX idx_email_logs_box ON public.email_logs(box_id);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_logs
CREATE POLICY "Admins can view email logs"
ON public.email_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

CREATE POLICY "Authenticated users can create email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add enum-like constraint for tipo
ALTER TABLE public.email_logs
ADD CONSTRAINT email_logs_tipo_check 
CHECK (tipo IN (
  'pendencia_critica',
  'vencimento_certificado', 
  'geracao_cobranca',
  'atualizacao_cadastro',
  'verificacao_dados',
  'notificacao_pad',
  'boas_vindas',
  'reset_senha',
  'generico'
));