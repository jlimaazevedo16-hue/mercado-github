-- Criar enum para status de integração
CREATE TYPE public.integration_status AS ENUM ('not_configured', 'testing', 'configured', 'error');

-- Criar tabela para armazenar configurações de integrações
CREATE TABLE public.configuracoes_integracoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    integracao VARCHAR(50) NOT NULL UNIQUE,
    status integration_status NOT NULL DEFAULT 'not_configured',
    config_encrypted TEXT, -- Armazena JSON criptografado com as chaves
    config_public JSONB DEFAULT '{}'::jsonb, -- Configurações não-sensíveis
    ultima_verificacao TIMESTAMP WITH TIME ZONE,
    mensagem_erro TEXT,
    obrigatoria BOOLEAN NOT NULL DEFAULT false,
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.configuracoes_integracoes ENABLE ROW LEVEL SECURITY;

-- Policy: Somente administradores master podem visualizar
CREATE POLICY "Admins master podem visualizar integrações"
ON public.configuracoes_integracoes
FOR SELECT
USING (public.is_admin_master(auth.uid()));

-- Policy: Somente administradores master podem modificar
CREATE POLICY "Admins master podem modificar integrações"
ON public.configuracoes_integracoes
FOR ALL
USING (public.is_admin_master(auth.uid()))
WITH CHECK (public.is_admin_master(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_configuracoes_integracoes_updated_at
BEFORE UPDATE ON public.configuracoes_integracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir integrações padrão
INSERT INTO public.configuracoes_integracoes (integracao, status, obrigatoria, ordem, config_public) VALUES
('supabase', 'not_configured', true, 1, '{"nome": "Supabase", "descricao": "Banco de dados e autenticação", "icone": "Database"}'::jsonb),
('resend', 'not_configured', false, 2, '{"nome": "Resend", "descricao": "Serviço de e-mail transacional", "icone": "Mail"}'::jsonb),
('evolution', 'not_configured', false, 3, '{"nome": "Evolution API", "descricao": "Integração WhatsApp", "icone": "MessageCircle"}'::jsonb),
('gemini', 'not_configured', false, 4, '{"nome": "Google Gemini", "descricao": "Assistente de IA", "icone": "Bot"}'::jsonb);

-- Criar tabela para controlar estado do setup wizard
CREATE TABLE public.sistema_setup (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setup_concluido BOOLEAN NOT NULL DEFAULT false,
    data_conclusao TIMESTAMP WITH TIME ZONE,
    concluido_por UUID REFERENCES auth.users(id),
    versao_schema VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sistema_setup ENABLE ROW LEVEL SECURITY;

-- Policy: Todos autenticados podem ler o status do setup
CREATE POLICY "Usuarios autenticados podem ver status setup"
ON public.sistema_setup
FOR SELECT
TO authenticated
USING (true);

-- Policy: Somente admin master pode modificar
CREATE POLICY "Admin master pode modificar setup"
ON public.sistema_setup
FOR ALL
USING (public.is_admin_master(auth.uid()))
WITH CHECK (public.is_admin_master(auth.uid()));

-- Inserir registro inicial
INSERT INTO public.sistema_setup (setup_concluido) VALUES (false);

-- Trigger para updated_at
CREATE TRIGGER update_sistema_setup_updated_at
BEFORE UPDATE ON public.sistema_setup
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();