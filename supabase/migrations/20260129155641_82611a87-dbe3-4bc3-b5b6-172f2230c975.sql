-- 1. Adicionar colunas de status de entrega na tabela whatsapp_logs
ALTER TABLE public.whatsapp_logs
ADD COLUMN IF NOT EXISTS status_entrega VARCHAR(20) DEFAULT 'enviado',
ADD COLUMN IF NOT EXISTS entregue_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lido_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS falha_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS message_id VARCHAR(255);

-- 2. Criar tabela de mensagens recebidas
CREATE TABLE IF NOT EXISTS public.whatsapp_recebidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES public.whatsapp_instances(id),
  telefone_origem VARCHAR(20) NOT NULL,
  nome_contato VARCHAR(255),
  mensagem TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'texto',
  message_id VARCHAR(255),
  box_id UUID REFERENCES public.boxes(id),
  responsavel_id UUID REFERENCES public.responsaveis(id),
  recebida_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lida BOOLEAN DEFAULT FALSE,
  respondida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela de automações
CREATE TABLE IF NOT EXISTS public.whatsapp_automacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  gatilho_tipo VARCHAR(50) NOT NULL, -- 'palavra_chave', 'tipo_mensagem'
  gatilho_valor VARCHAR(255) NOT NULL, -- palavra ou tipo
  template_id UUID REFERENCES public.whatsapp_templates(id),
  resposta_customizada TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  uma_vez_por_conversa BOOLEAN DEFAULT TRUE,
  respeitar_horario BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar tabela de webhooks (logs de payload bruto)
CREATE TABLE IF NOT EXISTS public.whatsapp_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES public.whatsapp_instances(id),
  evento VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processado BOOLEAN DEFAULT FALSE,
  erro TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Criar tabela de conversas para controle de automação
CREATE TABLE IF NOT EXISTS public.whatsapp_conversas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES public.whatsapp_instances(id),
  telefone VARCHAR(20) NOT NULL,
  ultima_mensagem_recebida TIMESTAMP WITH TIME ZONE,
  ultima_resposta_automatica TIMESTAMP WITH TIME ZONE,
  automacao_id UUID REFERENCES public.whatsapp_automacoes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instance_id, telefone)
);

-- 6. Habilitar RLS em todas as tabelas
ALTER TABLE public.whatsapp_recebidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;

-- 7. Políticas para whatsapp_recebidas
CREATE POLICY "Allow authenticated read whatsapp_recebidas" ON public.whatsapp_recebidas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert whatsapp_recebidas" ON public.whatsapp_recebidas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update whatsapp_recebidas" ON public.whatsapp_recebidas
  FOR UPDATE TO authenticated USING (true);

-- 8. Políticas para whatsapp_automacoes
CREATE POLICY "Allow authenticated read whatsapp_automacoes" ON public.whatsapp_automacoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert whatsapp_automacoes" ON public.whatsapp_automacoes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update whatsapp_automacoes" ON public.whatsapp_automacoes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete whatsapp_automacoes" ON public.whatsapp_automacoes
  FOR DELETE TO authenticated USING (true);

-- 9. Políticas para whatsapp_webhooks (apenas backend via service role)
CREATE POLICY "Allow service role all whatsapp_webhooks" ON public.whatsapp_webhooks
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow authenticated read whatsapp_webhooks" ON public.whatsapp_webhooks
  FOR SELECT TO authenticated USING (true);

-- 10. Políticas para whatsapp_conversas
CREATE POLICY "Allow authenticated all whatsapp_conversas" ON public.whatsapp_conversas
  FOR ALL TO authenticated USING (true);

-- 11. Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_recebidas_telefone ON public.whatsapp_recebidas(telefone_origem);
CREATE INDEX IF NOT EXISTS idx_whatsapp_recebidas_instance ON public.whatsapp_recebidas(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_recebidas_recebida_em ON public.whatsapp_recebidas(recebida_em DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhooks_evento ON public.whatsapp_webhooks(evento);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_message_id ON public.whatsapp_logs(message_id);

-- 12. Adicionar novas permissões RBAC
INSERT INTO public.role_permissions (role, permission_key, can_view, can_edit)
VALUES 
  ('administrador_master', 'whatsapp_webhooks', true, true),
  ('administrador_master', 'whatsapp_recebidas', true, true),
  ('administrador_master', 'whatsapp_automacao', true, true),
  ('administrador_master', 'whatsapp_relatorios', true, true),
  ('administrador', 'whatsapp_webhooks', true, true),
  ('administrador', 'whatsapp_recebidas', true, true),
  ('administrador', 'whatsapp_automacao', true, true),
  ('administrador', 'whatsapp_relatorios', true, true),
  ('funcionario', 'whatsapp_recebidas', true, false),
  ('funcionario', 'whatsapp_relatorios', true, false)
ON CONFLICT DO NOTHING;

-- 13. Trigger para updated_at em automacoes
CREATE TRIGGER update_whatsapp_automacoes_updated_at
  BEFORE UPDATE ON public.whatsapp_automacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();