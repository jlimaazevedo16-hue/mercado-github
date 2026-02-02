
-- Tabela para logs do assistente IA
CREATE TABLE public.assistant_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    tipo_consulta VARCHAR NOT NULL, -- 'chat', 'sugestao_rapida', 'geracao_texto'
    pergunta TEXT NOT NULL,
    resposta TEXT,
    tokens_usados INTEGER,
    duracao_ms INTEGER,
    metadata JSONB
);

-- Enable RLS
ALTER TABLE public.assistant_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver/criar logs
CREATE POLICY "Admins podem ver logs do assistente"
ON public.assistant_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('administrador_master', 'administrador')
    )
);

CREATE POLICY "Admins podem criar logs do assistente"
ON public.assistant_logs
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('administrador_master', 'administrador')
    )
);

-- Index para consultas
CREATE INDEX idx_assistant_logs_user ON public.assistant_logs(user_id);
CREATE INDEX idx_assistant_logs_created ON public.assistant_logs(created_at DESC);
