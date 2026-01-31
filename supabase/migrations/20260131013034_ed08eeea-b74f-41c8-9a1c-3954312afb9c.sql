-- Create email configuration table
CREATE TABLE public.configuracoes_email (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_remetente VARCHAR(255),
  nome_remetente VARCHAR(255),
  envio_ativo BOOLEAN DEFAULT true,
  template_institucional VARCHAR(50) DEFAULT 'generic',
  template_financeiro VARCHAR(50) DEFAULT 'notification',
  template_alerta VARCHAR(50) DEFAULT 'expiration_alert',
  template_verificacao VARCHAR(50) DEFAULT 'generic',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.configuracoes_email ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Admins can view email config"
ON public.configuracoes_email
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

-- Only admins can update
CREATE POLICY "Admins can update email config"
ON public.configuracoes_email
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

-- Only admins can insert
CREATE POLICY "Admins can insert email config"
ON public.configuracoes_email
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_configuracoes_email_updated_at
BEFORE UPDATE ON public.configuracoes_email
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration
INSERT INTO public.configuracoes_email (
  email_remetente,
  nome_remetente,
  envio_ativo,
  template_institucional,
  template_financeiro,
  template_alerta,
  template_verificacao
) VALUES (
  'noreply@mercadomunicipal.com',
  'Mercado Municipal Digital',
  true,
  'generic',
  'notification',
  'expiration_alert',
  'generic'
);