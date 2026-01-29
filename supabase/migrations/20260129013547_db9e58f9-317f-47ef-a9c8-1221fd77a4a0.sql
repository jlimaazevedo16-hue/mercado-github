-- =============================================
-- MÓDULO WHATSAPP - EVOLUTION API
-- =============================================

-- 1. Tabela de Instâncias WhatsApp
CREATE TABLE public.whatsapp_instances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR NOT NULL,
    api_url VARCHAR NOT NULL,
    api_key VARCHAR NOT NULL,
    instance_name VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'disconnected',
    qr_code TEXT,
    phone_number VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Tabela de Templates de Mensagens
CREATE TABLE public.whatsapp_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR NOT NULL,
    tipo VARCHAR NOT NULL,
    conteudo TEXT NOT NULL,
    variaveis TEXT[],
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. Tabela de Configurações Anti-Ban
CREATE TABLE public.whatsapp_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    intervalo_min_segundos INTEGER NOT NULL DEFAULT 5,
    intervalo_max_segundos INTEGER NOT NULL DEFAULT 10,
    max_mensagens_lote INTEGER NOT NULL DEFAULT 30,
    espera_entre_lotes_minutos INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Tabela de Fila de Mensagens
CREATE TABLE public.whatsapp_queue (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
    destinatario_telefone VARCHAR NOT NULL,
    destinatario_nome VARCHAR,
    responsavel_id UUID REFERENCES public.responsaveis(id) ON DELETE SET NULL,
    box_id UUID REFERENCES public.boxes(id) ON DELETE SET NULL,
    conteudo TEXT NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pendente',
    agendado_para TIMESTAMP WITH TIME ZONE,
    tentativas INTEGER NOT NULL DEFAULT 0,
    erro_mensagem TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 5. Tabela de Logs de WhatsApp
CREATE TABLE public.whatsapp_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    queue_id UUID REFERENCES public.whatsapp_queue(id) ON DELETE SET NULL,
    instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
    destinatario_telefone VARCHAR NOT NULL,
    destinatario_nome VARCHAR,
    conteudo TEXT NOT NULL,
    status VARCHAR NOT NULL,
    resposta_api JSONB,
    enviado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_instances
CREATE POLICY "Instances viewable by authenticated with permission" 
ON public.whatsapp_instances FOR SELECT 
USING (has_permission(auth.uid(), 'whatsapp', 'view'));

CREATE POLICY "Instances manageable by admins" 
ON public.whatsapp_instances FOR ALL 
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'administrador_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'administrador_master'::app_role));

-- RLS Policies for whatsapp_templates
CREATE POLICY "Templates viewable by authenticated with permission" 
ON public.whatsapp_templates FOR SELECT 
USING (has_permission(auth.uid(), 'whatsapp', 'view'));

CREATE POLICY "Templates manageable by admins" 
ON public.whatsapp_templates FOR ALL 
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'administrador_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'administrador_master'::app_role));

-- RLS Policies for whatsapp_config
CREATE POLICY "Config viewable by authenticated with permission" 
ON public.whatsapp_config FOR SELECT 
USING (has_permission(auth.uid(), 'whatsapp', 'view'));

CREATE POLICY "Config manageable by admins" 
ON public.whatsapp_config FOR ALL 
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'administrador_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'administrador_master'::app_role));

-- RLS Policies for whatsapp_queue
CREATE POLICY "Queue viewable by authenticated with permission" 
ON public.whatsapp_queue FOR SELECT 
USING (has_permission(auth.uid(), 'whatsapp', 'view'));

CREATE POLICY "Queue insertable by authenticated with edit permission" 
ON public.whatsapp_queue FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'whatsapp', 'edit'));

CREATE POLICY "Queue updatable by authenticated with edit permission" 
ON public.whatsapp_queue FOR UPDATE 
USING (has_permission(auth.uid(), 'whatsapp', 'edit'));

CREATE POLICY "Queue deletable by admins" 
ON public.whatsapp_queue FOR DELETE 
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'administrador_master'::app_role));

-- RLS Policies for whatsapp_logs
CREATE POLICY "Logs viewable by authenticated with permission" 
ON public.whatsapp_logs FOR SELECT 
USING (has_permission(auth.uid(), 'whatsapp', 'view'));

CREATE POLICY "Logs insertable by authenticated with edit permission" 
ON public.whatsapp_logs FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'whatsapp', 'edit'));

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at
BEFORE UPDATE ON public.whatsapp_instances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_config_updated_at
BEFORE UPDATE ON public.whatsapp_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_queue_updated_at
BEFORE UPDATE ON public.whatsapp_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config
INSERT INTO public.whatsapp_config (intervalo_min_segundos, intervalo_max_segundos, max_mensagens_lote, espera_entre_lotes_minutos)
VALUES (5, 10, 30, 5);

-- Add whatsapp permission for administrador_master
INSERT INTO public.role_permissions (role, permission_key, can_view, can_edit)
VALUES 
    ('administrador_master', 'whatsapp', true, true),
    ('administrador', 'whatsapp', true, true),
    ('fiscal', 'whatsapp', true, false),
    ('funcionario', 'whatsapp', false, false),
    ('lojista', 'whatsapp', false, false)
ON CONFLICT DO NOTHING;