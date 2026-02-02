
-- Enum para status de pendência
CREATE TYPE public.pendencia_status AS ENUM (
    'PENDENTE',
    'EM_REGULARIZACAO',
    'EM_ANALISE',
    'REGULARIZADO',
    'REJEITADO'
);

-- Enum para tipo de pendência
CREATE TYPE public.pendencia_tipo AS ENUM (
    'notificacao',
    'certificado',
    'documento_ausente',
    'reforma',
    'processo',
    'ocorrencia'
);

-- Enum para urgência
CREATE TYPE public.pendencia_urgencia AS ENUM (
    'vencido',
    'urgente',
    'proximo',
    'normal'
);

-- Tabela principal de pendências
CREATE TABLE public.pendencias (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Tipo e identificação
    tipo pendencia_tipo NOT NULL,
    titulo VARCHAR NOT NULL,
    descricao TEXT,
    
    -- Vínculo com entidades
    box_id UUID REFERENCES public.boxes(id) ON DELETE CASCADE,
    responsavel_id UUID REFERENCES public.responsaveis(id) ON DELETE SET NULL,
    entidade_referencia_id UUID, -- ID da entidade original (notificação, documento, etc.)
    entidade_referencia_tipo VARCHAR, -- 'notificacoes', 'box_documents', 'pads', etc.
    
    -- Status e urgência
    status pendencia_status NOT NULL DEFAULT 'PENDENTE',
    urgencia pendencia_urgencia NOT NULL DEFAULT 'normal',
    data_vencimento DATE,
    
    -- Documentos anexados
    documento_url TEXT,
    documento_nome VARCHAR,
    
    -- Campos para rejeição
    motivo_rejeicao TEXT,
    
    -- Observações
    observacoes TEXT
);

-- Tabela de logs para auditoria de transições
CREATE TABLE public.pendencia_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    pendencia_id UUID NOT NULL REFERENCES public.pendencias(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    
    status_anterior pendencia_status,
    status_novo pendencia_status NOT NULL,
    
    acao VARCHAR NOT NULL, -- 'criacao', 'em_regularizacao', 'envio_analise', 'aprovacao', 'rejeicao', 'reabertura'
    observacao TEXT,
    
    -- Metadados
    ip_address VARCHAR,
    user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.pendencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencia_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_pendencias_box ON public.pendencias(box_id);
CREATE INDEX idx_pendencias_responsavel ON public.pendencias(responsavel_id);
CREATE INDEX idx_pendencias_status ON public.pendencias(status);
CREATE INDEX idx_pendencias_tipo ON public.pendencias(tipo);
CREATE INDEX idx_pendencias_urgencia ON public.pendencias(urgencia);
CREATE INDEX idx_pendencia_logs_pendencia ON public.pendencia_logs(pendencia_id);
CREATE INDEX idx_pendencia_logs_user ON public.pendencia_logs(user_id);

-- Trigger para updated_at
CREATE TRIGGER update_pendencias_updated_at
    BEFORE UPDATE ON public.pendencias
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies para pendencias

-- Admins podem ver e gerenciar todas as pendências
CREATE POLICY "Admins podem ver todas pendencias"
ON public.pendencias
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('administrador_master', 'administrador')
    )
);

CREATE POLICY "Admins podem inserir pendencias"
ON public.pendencias
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('administrador_master', 'administrador')
    )
);

CREATE POLICY "Admins podem atualizar pendencias"
ON public.pendencias
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('administrador_master', 'administrador')
    )
);

-- Lojistas podem ver pendências dos seus boxes
CREATE POLICY "Lojistas podem ver suas pendencias"
ON public.pendencias
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM responsaveis r
        JOIN profiles p ON (
            p.email = r.email 
            OR p.telefone = r.telefone
            OR p.cpf = r.cpf
        )
        WHERE p.user_id = auth.uid()
        AND (
            pendencias.responsavel_id = r.id
            OR pendencias.box_id IN (SELECT id FROM boxes WHERE responsavel_id = r.id)
        )
    )
);

-- Lojistas podem atualizar suas pendências (para mudanças de status permitidas)
CREATE POLICY "Lojistas podem atualizar suas pendencias"
ON public.pendencias
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM responsaveis r
        JOIN profiles p ON (
            p.email = r.email 
            OR p.telefone = r.telefone
            OR p.cpf = r.cpf
        )
        WHERE p.user_id = auth.uid()
        AND (
            pendencias.responsavel_id = r.id
            OR pendencias.box_id IN (SELECT id FROM boxes WHERE responsavel_id = r.id)
        )
    )
);

-- RLS Policies para pendencia_logs
CREATE POLICY "Admins podem ver todos logs de pendencias"
ON public.pendencia_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('administrador_master', 'administrador')
    )
);

CREATE POLICY "Lojistas podem ver logs das suas pendencias"
ON public.pendencia_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM pendencias pen
        JOIN responsaveis r ON (
            pen.responsavel_id = r.id
            OR pen.box_id IN (SELECT id FROM boxes WHERE responsavel_id = r.id)
        )
        JOIN profiles p ON (
            p.email = r.email 
            OR p.telefone = r.telefone
            OR p.cpf = r.cpf
        )
        WHERE p.user_id = auth.uid()
        AND pen.id = pendencia_logs.pendencia_id
    )
);

CREATE POLICY "Usuarios autenticados podem inserir logs"
ON public.pendencia_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
