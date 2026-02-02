
-- Tabela para logs de importação
CREATE TABLE public.import_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    tipo_importacao VARCHAR NOT NULL, -- 'setores', 'segmentos', 'responsaveis', 'boxes', 'completa'
    nome_arquivo VARCHAR NOT NULL,
    total_linhas INTEGER DEFAULT 0,
    linhas_importadas INTEGER DEFAULT 0,
    linhas_erro INTEGER DEFAULT 0,
    detalhes_erros JSONB,
    status VARCHAR DEFAULT 'concluido', -- 'em_andamento', 'concluido', 'erro'
    duracao_segundos INTEGER
);

-- Enable RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Policies - apenas admin pode ver/criar logs
CREATE POLICY "Admins podem ver logs de importação"
ON public.import_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('administrador_master', 'administrador')
    )
);

CREATE POLICY "Admins podem criar logs de importação"
ON public.import_logs
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('administrador_master', 'administrador')
    )
);
